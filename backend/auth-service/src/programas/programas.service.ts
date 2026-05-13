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

    const result = { created: 0, updated: 0, deleted: 0 };

    // Obtener asignaturas existentes
    const existentes = await this.asignaturaRepo.find({ where: { programaId } });
    const existentesIds = new Set(existentes.map(a => a.id));

    // IDs enviados
    const enviadosIds = new Set(asignaturas.map(a => a.id).filter(id => id && !id.startsWith('asig-')));

    // Eliminar asignaturas que no están en la lista enviada
    for (const existente of existentes) {
      if (!enviadosIds.has(existente.id)) {
        await this.asignaturaRepo.remove(existente);
        result.deleted++;
      }
    }

    // Crear o actualizar asignaturas
    for (const asigData of asignaturas) {
      const { id, ...data } = asigData;
      const asignaturaData = {
        ...data,
        programaId,
        nucleoTematico: data.nucleoTematico || data.nucleo || null,
        modalidad: data.modalidad || null,
        tipo: data.tipo || null,
      };

      if (id && !id.startsWith('asig-')) {
        // Actualizar existente
        await this.asignaturaRepo.update(id, asignaturaData);
        result.updated++;
      } else {
        // Crear nueva
        await this.asignaturaRepo.save(asignaturaData);
        result.created++;
      }
    }

    return result;
  }
}
