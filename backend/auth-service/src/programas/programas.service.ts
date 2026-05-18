import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { ProgramaAcademico } from './programa.entity';
import { Asignatura } from './asignatura.entity';
import { CreateProgramaDto, UpdateProgramaDto } from './programa.dto';

export interface ProgramasFiltroDto {
  search?: string;
  nivelFormacion?: string;
  modalidad?: string;
  estado?: string;
  sede?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ProgramasService {
  constructor(
    @InjectRepository(ProgramaAcademico)
    private readonly programaRepo: Repository<ProgramaAcademico>,
    @InjectRepository(Asignatura)
    private readonly asignaturaRepo: Repository<Asignatura>,
  ) {}

  async listarProgramas(filtros: ProgramasFiltroDto) {
    const {
      search,
      nivelFormacion,
      modalidad,
      estado,
      sede,
      page = 1,
      limit = 20,
    } = filtros;

    const where: any = {};

    if (nivelFormacion) where.nivelFormacion = nivelFormacion;
    if (modalidad) where.modalidad = modalidad;
    if (estado) where.estado = estado;
    if (sede) where.sede = sede;

    if (search) {
      where.nombre = Like(`%${search}%`);
    }

    const [data, total] = await this.programaRepo.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Enrich data with calculated plan de estudios stats
    const enrichedData = await Promise.all(
      data.map(async (programa) => {
        const asignaturasStats = await this.asignaturaRepo
          .createQueryBuilder('asignatura')
          .select([
            'COUNT(asignatura.id) as total_asignaturas',
            'COALESCE(SUM(asignatura.creditos), 0) as creditos_plan'
          ])
          .where('asignatura.programaId = :programaId', { programaId: programa.id })
          .getRawOne();

        return {
          ...programa,
          totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
          creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
        };
      })
    );

    return {
      total,
      pagina: page,
      porPagina: limit,
      data: enrichedData,
    };
  }

  async obtenerPrograma(id: string): Promise<ProgramaAcademico> {
    const programa = await this.programaRepo.findOne({ where: { id } });
    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    // Add calculated plan de estudios stats
    const asignaturasStats = await this.asignaturaRepo
      .createQueryBuilder('asignatura')
      .select([
        'COUNT(asignatura.id) as total_asignaturas',
        'COALESCE(SUM(asignatura.creditos), 0) as creditos_plan'
      ])
      .where('asignatura.programaId = :programaId', { programaId: id })
      .getRawOne();

    return {
      ...programa,
      totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
      creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
    };
  }

  async crearPrograma(dto: CreateProgramaDto): Promise<ProgramaAcademico> {
    const programa = this.programaRepo.create(dto);
    return await this.programaRepo.save(programa);
  }

  async actualizarPrograma(id: string, dto: UpdateProgramaDto): Promise<ProgramaAcademico> {
    const programa = await this.obtenerPrograma(id);
    Object.assign(programa, dto);
    return await this.programaRepo.save(programa);
  }

  async eliminarPrograma(id: string): Promise<void> {
    const programa = await this.obtenerPrograma(id);
    await this.programaRepo.remove(programa);
  }

  async obtenerAsignaturasPrograma(programaId: string) {
    return await this.asignaturaRepo.find({
      where: { programaId },
      order: { semestre: 'ASC', nombre: 'ASC' }
    });
  }

  async guardarAsignaturasPrograma(programaId: string, asignaturas: any[]) {
    // Verificar que el programa existe
    const programa = await this.programaRepo.findOne({ where: { id: programaId } });
    if (!programa) {
      throw new NotFoundException('Programa académico no encontrado');
    }

    // Obtener asignaturas existentes
    const existentes = await this.asignaturaRepo.find({ where: { programaId } });
    const existentesIds = new Set(existentes.map(a => a.id));

    // IDs enviados
    const enviadosIds = new Set(asignaturas.map(a => a.id).filter(id => id && !id.startsWith('asig-')));

    // Eliminar asignaturas que no están en la lista enviada
    for (const existente of existentes) {
      if (!enviadosIds.has(existente.id)) {
        await this.asignaturaRepo.remove(existente);
      }
    }

    // Crear o actualizar asignaturas
    for (const asigData of asignaturas) {
      const { id, programa_id, ...data } = asigData; // Extraer programa_id para evitar conflictos

      const asignaturaData = {
        programaId: programaId, // Usar el programaId del parámetro
        nombre: data.nombre,
        codigo: data.codigo || undefined,
        creditos: data.creditos || 3,
        horas: data.horas || 144,
        nucleoTematico: data.nucleoTematico || data.nucleo || undefined,
        semestre: data.semestre ? String(data.semestre) : undefined,
        modalidad: data.modalidad || undefined,
        tipo: data.tipo || undefined,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (id && !id.startsWith('asig-')) {
        // Actualizar existente
        await this.asignaturaRepo.update(id, asignaturaData);
      } else {
        // Crear nueva - usar create() para aplicar decoradores de fecha
        const nuevaAsignatura = this.asignaturaRepo.create({
          programaId: programaId,
          nombre: data.nombre,
          codigo: data.codigo || undefined,
          creditos: data.creditos || 3,
          horas: data.horas || 144,
          nucleoTematico: data.nucleoTematico || data.nucleo || undefined,
          semestre: data.semestre ? String(data.semestre) : undefined,
          modalidad: data.modalidad || undefined,
          tipo: data.tipo || undefined,
          createdAt: data.createdAt || new Date(),
          updatedAt: new Date(),
        });
        await this.asignaturaRepo.save(nuevaAsignatura);
      }
    }

    // Devolver las asignaturas actualizadas
    const asignaturasActualizadas = await this.asignaturaRepo.find({
      where: { programaId },
      order: { semestre: 'ASC', nombre: 'ASC' }
    });

    return asignaturasActualizadas;
  }
}
