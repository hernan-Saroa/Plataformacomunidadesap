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
      page = 1,
      limit = 20,
    } = filtros;

    const where: any = {};

    if (nivelFormacion) {
      const nfMap: Record<string, string> = {
        'pregrado': 'pregrado',
        'especialización': 'especializacion',
        'especializacion': 'especializacion',
        'maestría': 'maestria',
        'maestria': 'maestria',
      };
      const key = nivelFormacion.toLowerCase();
      where.tipo = nfMap[key] || key;
    }

    if (modalidad) {
      const modMap: Record<string, string> = {
        'presencial': 'presencial',
        'distancia': 'distancia',
        'mixto': 'mixto',
      };
      const key = modalidad.toLowerCase();
      where.modalidad = modMap[key] || key;
    }

    if (estado) {
      where.activo = estado === 'ACTIVO';
    }

    if (search) {
      where.nombre = Like(`%${search}%`);
    }

    const [data, total] = await this.programaRepo.findAndCount({
      where,
      order: { nombre: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };

    // Enrich data with calculated plan de estudios stats and compatibility fields
    const enrichedData = await Promise.all(
      data.map(async (programa) => {
        const asignaturasStats = await this.asignaturaRepo
          .createQueryBuilder('asignatura')
          .select([
            'COUNT(asignatura.id) as total_asignaturas',
            'COALESCE(SUM(asignatura.creditos), 0) as creditos_plan'
          ])
          .where('asignatura.id_programa = :programaId', { programaId: programa.id })
          .getRawOne();

        return {
          ...programa,
          estado: programa.activo ? 'ACTIVO' : 'INACTIVO',
          nivelFormacion: nivelFormacionMap[programa.tipo] || programa.tipo || 'Pregrado',
          descripcion: programa.nombreExcel || programa.nombre,
          duracion: 10,
          creditos: parseInt(asignaturasStats?.creditos_plan || '0'),
          sede: 'Sede Central',
          facultad: programa.tipo === 'pregrado' ? 'Pregrado' : 'Postgrados',
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
      .where('asignatura.id_programa = :programaId', { programaId: id })
      .getRawOne();

    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      especializacion: 'Especialización',
      maestria: 'Maestría',
    };

    return {
      ...programa,
      estado: programa.activo ? 'ACTIVO' : 'INACTIVO',
      nivelFormacion: nivelFormacionMap[programa.tipo] || programa.tipo || 'Pregrado',
      descripcion: programa.nombreExcel || programa.nombre,
      duracion: 10,
      creditos: parseInt(asignaturasStats?.creditos_plan || '0'),
      sede: 'Sede Central',
      facultad: programa.tipo === 'pregrado' ? 'Pregrado' : 'Postgrados',
      totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
      creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
    } as any;
  }

  async crearPrograma(dto: CreateProgramaDto): Promise<ProgramaAcademico> {
    // Ensure default faculty exists or use '1'
    let idFacultad = '1';
    try {
      const dbFaculties = await this.programaRepo.query('SELECT id FROM academic_work_plan.facultad LIMIT 1');
      if (dbFaculties && dbFaculties.length > 0) {
        idFacultad = dbFaculties[0].id.toString();
      } else {
        const insertRes = await this.programaRepo.query(
          "INSERT INTO academic_work_plan.facultad (codigo, nombre, activo) VALUES ('DEF', 'Facultad Defecto', true) RETURNING id"
        );
        idFacultad = insertRes[0].id.toString();
      }
    } catch (e) {
      console.warn('Error fetching/creating default facultad, using "1"', e);
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const levelLower = (dto.nivelFormacion || '').toLowerCase();
    const tipo = levelLower.includes('maes') ? 'maestria' : levelLower.includes('esp') ? 'especializacion' : 'pregrado';
    const modLower = (dto.modalidad || '').toLowerCase();
    const modalidad = modLower.includes('dist') ? 'distancia' : modLower.includes('mix') ? 'mixto' : 'presencial';

    const programa = this.programaRepo.create({
      codigo: dto.codigo,
      nombre: dto.nombre,
      nombreExcel: `${dto.nombre.substring(0, 90)}_${randomSuffix}`,
      nombreCorto: `${dto.nombre.substring(0, 24)}_${randomSuffix}`,
      idFacultad,
      tipo,
      modalidad,
      activo: dto.estado !== 'INACTIVO',
    });

    return await this.programaRepo.save(programa);
  }

  async actualizarPrograma(id: string, dto: UpdateProgramaDto): Promise<ProgramaAcademico> {
    const programa = await this.programaRepo.findOne({ where: { id } });
    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    if (dto.codigo) programa.codigo = dto.codigo;
    if (dto.nombre) programa.nombre = dto.nombre;
    if (dto.nivelFormacion) {
      const levelLower = dto.nivelFormacion.toLowerCase();
      programa.tipo = levelLower.includes('maes') ? 'maestria' : levelLower.includes('esp') ? 'especializacion' : 'pregrado';
    }
    if (dto.modalidad) {
      const modLower = dto.modalidad.toLowerCase();
      programa.modalidad = modLower.includes('dist') ? 'distancia' : modLower.includes('mix') ? 'mixto' : 'presencial';
    }
    if (dto.estado) {
      programa.activo = dto.estado !== 'INACTIVO';
    }

    return await this.programaRepo.save(programa);
  }

  async eliminarPrograma(id: string): Promise<void> {
    const programa = await this.programaRepo.findOne({ where: { id } });
    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }
    await this.programaRepo.remove(programa);
  }

  async obtenerAsignaturasPrograma(programaId: string) {
    const asignaturas = await this.asignaturaRepo.find({
      where: { programaId },
      order: { semestreId: 'ASC', nombre: 'ASC' }
    });

    return asignaturas.map(a => ({
      ...a,
      semestre: String(a.semestreId || 1),
      horas: (a.creditos || 3) * 48,
      tipo: a.tipoExcepcion || 'obligatoria',
      nucleoTematico: 'Núcleo Temático',
    }));
  }

  async guardarAsignaturasPrograma(programaId: string, asignaturas: any[]) {
    const programa = await this.programaRepo.findOne({ where: { id: programaId } });
    if (!programa) {
      throw new NotFoundException('Programa académico no encontrado');
    }

    // Ensure default faculty exists or use '1'
    let idFacultad = '1';
    try {
      const dbFaculties = await this.programaRepo.query('SELECT id FROM academic_work_plan.facultad LIMIT 1');
      if (dbFaculties && dbFaculties.length > 0) {
        idFacultad = dbFaculties[0].id.toString();
      }
    } catch (e) {
      console.warn('Error fetching default facultad', e);
    }

    // Ensure default nucleo tematico exists for the program
    let idNucleo = '1';
    try {
      const dbNucleos = await this.programaRepo.query(
        'SELECT id FROM academic_work_plan.nucleo_tematico WHERE id_programa = $1 LIMIT 1',
        [programaId]
      );
      if (dbNucleos && dbNucleos.length > 0) {
        idNucleo = dbNucleos[0].id.toString();
      } else {
        const insertRes = await this.programaRepo.query(
          "INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, id_programa, activo) VALUES ($1, $2, $3, true) RETURNING id",
          [`NUC_${programa.codigo}`, `Núcleo ${programa.nombre}`, programaId]
        );
        idNucleo = insertRes[0].id.toString();
      }
    } catch (e) {
      console.warn('Error fetching/creating default nucleo_tematico', e);
    }

    const existentes = await this.asignaturaRepo.find({ where: { programaId } });
    const existentesIds = new Set(existentes.map(a => a.id));
    const enviadosIds = new Set(asignaturas.map(a => a.id).filter(id => id && !id.startsWith('asig-')));

    for (const existente of existentes) {
      if (!enviadosIds.has(existente.id)) {
        await this.asignaturaRepo.remove(existente);
      }
    }

    for (const asigData of asignaturas) {
      const { id, ...data } = asigData;

      const semNum = data.semestre ? parseInt(data.semestre, 10) : 1;
      // Ensure we have a valid ubicacion_semestral ID
      let semestreId = semNum;
      if (semNum > 0) {
        try {
          const dbSem = await this.programaRepo.query(
            'SELECT id FROM academic_work_plan.ubicacion_semestral WHERE id = $1 LIMIT 1',
            [semNum]
          );
          if (!dbSem || dbSem.length === 0) {
            // Seed a default one if not exists
            await this.programaRepo.query(
              `INSERT INTO academic_work_plan.ubicacion_semestral (id, codigo, etiqueta, tipo_programa, orden)
               VALUES ($1, $2, $3, $4, $1) ON CONFLICT DO NOTHING`,
              [semNum, `SEM_${semNum}`, `Semestre ${semNum}`, programa.tipo === 'pregrado' ? 'pregrado' : 'posgrado']
            );
          }
        } catch (e) {
          console.warn('Error checking/seeding ubicacion_semestral', e);
        }
      }

      const modalMap: Record<string, string> = {
        'presencial': 'presencial',
        'distancia': 'distancia',
        'virtual': 'virtual',
      };
      const modalidad = modalMap[(data.modalidad || '').toLowerCase()] || 'sin_definir';

      const asignaturaData = {
        programaId,
        nombre: data.nombre,
        codigo: data.codigo || `ASIG_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        creditos: data.creditos || 3,
        semestreId,
        nucleoTematicoId: idNucleo,
        facultadId: idFacultad,
        modalidad,
        tipoExcepcion: data.tipo && data.tipo !== 'obligatoria' ? data.tipo : null,
        horasFijasPta: data.horas || null,
        activa: true,
      };

      if (id && !id.startsWith('asig-')) {
        await this.asignaturaRepo.update(id, asignaturaData);
      } else {
        const nuevaAsignatura = this.asignaturaRepo.create(asignaturaData);
        await this.asignaturaRepo.save(nuevaAsignatura);
      }
    }

    return this.obtenerAsignaturasPrograma(programaId);
  }
}

