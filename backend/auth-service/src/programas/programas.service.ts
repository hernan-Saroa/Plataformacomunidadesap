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
  periodoAcademico?: string;
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

    const qb = this.programaRepo.createQueryBuilder('p');

    if (where.tipo) qb.andWhere('p.tipo = :tipo', { tipo: where.tipo });
    if (where.modalidad) qb.andWhere('p.modalidad = :modalidad', { modalidad: where.modalidad });
    if (where.activo !== undefined) qb.andWhere('p.activo = :activo', { activo: where.activo });
    if (search) qb.andWhere('p.nombre ILIKE :search', { search: `%${search}%` });

    if (filtros.periodoAcademico) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp
        JOIN academic_work_plan.periodo_academico pa ON pa.id = ocp.id_periodo_academico
        WHERE ocp.id_programa = p.id
          AND ocp.activa = TRUE
          AND pa.codigo = :periodo
      )`, { periodo: filtros.periodoAcademico });
    }

    qb.orderBy('p.nombre', 'ASC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    console.log('[DEBUG SQL]', qb.getSql(), qb.getParameters());

    const [data, total] = await qb.getManyAndCount();

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

        let cetapParams: any[] = [programa.id];
        let periodFilter = '';
        if (filtros.periodoAcademico) {
          periodFilter = `JOIN academic_work_plan.periodo_academico pa ON pa.id = ocp.id_periodo_academico AND pa.codigo = $2`;
          cetapParams.push(filtros.periodoAcademico);
        }

        const cetapsRes = await this.programaRepo.query(
          `SELECT ocp.id as oferta_id, ocp.cupos_estimados, c.nombre, dt.nombre as dt_nombre 
           FROM academic_work_plan.oferta_cetap_programa ocp
           ${periodFilter}
           JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
           LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
           WHERE ocp.id_programa = $1 AND ocp.activa = TRUE
           ORDER BY dt.nombre ASC, c.nombre ASC`,
          cetapParams
        );

        let sedeLabel = 'Sede Central';
        if (cetapsRes && cetapsRes.length > 0) {
          if (cetapsRes.length === 1) {
            sedeLabel = cetapsRes[0].nombre;
          } else if (cetapsRes.length <= 3) {
            sedeLabel = cetapsRes.map((c: any) => c.nombre.substring(0, 15)).join(', ');
          } else {
            sedeLabel = `${cetapsRes[0].nombre} y ${cetapsRes.length - 1} CETAPs más`;
          }
        }

        // Build cetapsList FIRST as a standalone variable
        const cetapsList = (cetapsRes || []).map((c: any) => ({
          ofertaId: c.oferta_id,
          estudiantes: parseInt(c.cupos_estimados) || 0,
          cetap: c.nombre,
          dt: c.dt_nombre || 'Sin Dirección Territorial',
        }));

        // Construct plain object (NOT spreading the TypeORM entity) to ensure all fields are serialized
        return {
          id: programa.id,
          codigo: programa.codigo,
          nombre: programa.nombre,
          nombreExcel: programa.nombreExcel,
          nombreCorto: programa.nombreCorto,
          idFacultad: programa.idFacultad,
          tipo: programa.tipo,
          modalidad: programa.modalidad,
          activo: programa.activo,
          createdAt: programa.createdAt,
          updatedAt: programa.updatedAt,
          estado: programa.activo ? 'ACTIVO' : 'INACTIVO',
          nivelFormacion: nivelFormacionMap[programa.tipo] || programa.tipo || 'Pregrado',
          descripcion: programa.nombreExcel || programa.nombre,
          duracion: 10,
          creditos: parseInt(asignaturasStats?.creditos_plan || '0'),
          sede: sedeLabel,
          facultad: programa.tipo === 'pregrado' ? 'Pregrado' : 'Postgrados',
          totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
          creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
          estudiantesActivos: cetapsList.reduce((acc: number, c: any) => acc + (c.estudiantes || 0), 0),
          cetapsList,
          horasBasePorCredito: programa.horasBasePorCredito,
          horasPregradoCentral: programa.horasPregradoCentral,
        };
      })
    );
    // DEBUG: Log cetapsList to verify it's populated
    if (enrichedData.length > 0) {
      const sample = enrichedData[0] as any;
      console.log('[DEBUG-BACKEND] First program:', sample.nombre, '| cetapsList:', Array.isArray(sample.cetapsList) ? sample.cetapsList.length : typeof sample.cetapsList, '| sede:', sample.sede);
      console.log('[DEBUG-BACKEND] Keys:', Object.keys(sample).sort().join(', '));
    }

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

    const cetapsRes = await this.programaRepo.query(
      `SELECT c.nombre, dt.nombre as dt_nombre 
       FROM academic_work_plan.oferta_cetap_programa ocp
       JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
       LEFT JOIN academic_work_plan.direccion_territorial dt ON dt.id = c.id_direccion_territorial
       WHERE ocp.id_programa = $1
       ORDER BY dt.nombre ASC, c.nombre ASC`,
      [programa.id]
    );

    let sedeLabel = 'Sede Central';
    if (cetapsRes && cetapsRes.length > 0) {
      if (cetapsRes.length === 1) {
        sedeLabel = cetapsRes[0].nombre;
      } else {
        sedeLabel = `${cetapsRes[0].nombre} y ${cetapsRes.length - 1} CETAPs más`;
      }
    }

    return {
      ...programa,
      estado: programa.activo ? 'ACTIVO' : 'INACTIVO',
      nivelFormacion: nivelFormacionMap[programa.tipo] || programa.tipo || 'Pregrado',
      descripcion: programa.nombreExcel || programa.nombre,
      duracion: 10,
      creditos: parseInt(asignaturasStats?.creditos_plan || '0'),
      sede: sedeLabel,
      facultad: programa.tipo === 'pregrado' ? 'Pregrado' : 'Postgrados',
      totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
      creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
      estudiantesActivos: cetapsRes ? cetapsRes.reduce((acc: number, c: any) => acc + (parseInt(c.cupos_estimados) || 0), 0) : 0,
      cetapsList: cetapsRes ? cetapsRes.map((c: any) => ({ ofertaId: c.oferta_id, estudiantes: parseInt(c.cupos_estimados) || 0, cetap: c.nombre, dt: c.dt_nombre || 'Sin Dirección Territorial' })) : [],
      horasBasePorCredito: programa.horasBasePorCredito,
      horasPregradoCentral: programa.horasPregradoCentral,
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
      horasBasePorCredito: dto.horasBasePorCredito ?? 16,
      horasPregradoCentral: dto.horasPregradoCentral ?? null,
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
    if (dto.horasBasePorCredito !== undefined) programa.horasBasePorCredito = dto.horasBasePorCredito;
    if (dto.horasPregradoCentral !== undefined) programa.horasPregradoCentral = dto.horasPregradoCentral;
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
      const asignaturas = await this.asignaturaRepo
      .createQueryBuilder('a')
      .leftJoin(qb => qb.select('*').from('academic_work_plan.nucleo_tematico', 'nt_inner'), 'nt', 'nt.id = a.id_nucleo_tematico')
      .where('a.id_programa = :programaId', { programaId })
      .orderBy('a.id_ubicacion_semestral', 'ASC')
      .addOrderBy('a.nombre', 'ASC')
      .select([
        'a.*',
        'nt.nombre as nucleo_nombre'
      ])
      .getRawMany();

    console.log('RAW ASIGNATURA 0:', asignaturas[0]);

    return asignaturas.map(a => ({
      ...a,
      id: a.id,
      nombre: a.nombre,
      codigo: a.codigo,
      creditos: a.creditos,
      semestreId: a.id_ubicacion_semestral,
      nucleoTematicoId: a.id_nucleo_tematico,
      facultadId: a.id_facultad,
      modalidad: a.modalidad || 'sin_definir',
      horasFijasPta: a.horas_fijas_pta,
      tipoExcepcion: a.tipo_excepcion,
      activa: a.activa,
      programaId: a.id_programa,
      semestre: String(a.id_ubicacion_semestral || 1),
      horas: (a.creditos || 3) * 48,
      tipo: a.tipo_excepcion || 'obligatoria',
      nucleoTematico: a.nucleo_nombre || 'Sin definir',
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

      // Resolve or create nucleo tematico dynamically by name or ID
      let nucleoTematicoId = idNucleo;
      if (data.nucleoTematico && data.nucleoTematico !== 'Sin definir') {
        try {
          const dbNucleos = await this.programaRepo.query(
            'SELECT id FROM academic_work_plan.nucleo_tematico WHERE LOWER(nombre) = LOWER($1) AND id_programa = $2 LIMIT 1',
            [data.nucleoTematico.trim(), programaId]
          );
          if (dbNucleos && dbNucleos.length > 0) {
            nucleoTematicoId = dbNucleos[0].id.toString();
          } else {
            const code = `NUC_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const insertRes = await this.programaRepo.query(
              "INSERT INTO academic_work_plan.nucleo_tematico (codigo, nombre, id_programa, activo) VALUES ($1, $2, $3, true) RETURNING id",
              [code, data.nucleoTematico.trim(), programaId]
            );
            nucleoTematicoId = insertRes[0].id.toString();
          }
        } catch (e) {
          console.warn('Error resolving/creating nucleo_tematico by name', e);
        }
      } else if (data.nucleoTematicoId && data.nucleoTematicoId !== '1') {
        try {
          const dbNucleos = await this.programaRepo.query(
            'SELECT id FROM academic_work_plan.nucleo_tematico WHERE id = $1 LIMIT 1',
            [data.nucleoTematicoId]
          );
          if (dbNucleos && dbNucleos.length > 0) {
            nucleoTematicoId = data.nucleoTematicoId;
          }
        } catch (e) {
          console.warn('Error verifying nucleoTematicoId', e);
        }
      }

      // Map modality with suffixes properly
      const modStr = (data.modalidad || '').toLowerCase();
      let modalidad = 'sin_definir';
      const validModalidades = ['presencial', 'presencial_dia', 'presencial_noche', 'virtual', 'distancia', 'mixto'];
      if (validModalidades.includes(modStr)) {
        modalidad = modStr;
      } else if (modStr.includes('presencial')) {
        if (modStr.includes('noche')) {
          modalidad = 'presencial_noche';
        } else if (modStr.includes('dia') || modStr.includes('días') || modStr.includes('diurna')) {
          modalidad = 'presencial_dia';
        } else {
          modalidad = 'presencial';
        }
      } else if (modStr.includes('virtual')) {
        modalidad = 'virtual';
      } else if (modStr.includes('distancia')) {
        modalidad = 'distancia';
      } else if (modStr.includes('mixto') || modStr.includes('hibrid')) {
        modalidad = 'mixto';
      }

      // Resolve horasFijasPta from user input (horasFijasPta or horas_fijas_pta)
      let horasFijasPta: any = null;
      if (data.horasFijasPta !== undefined && data.horasFijasPta !== null) {
        horasFijasPta = parseInt(data.horasFijasPta, 10);
      } else if (data.horas_fijas_pta !== undefined && data.horas_fijas_pta !== null) {
        horasFijasPta = parseInt(data.horas_fijas_pta, 10);
      }
      if (isNaN(horasFijasPta as any) || horasFijasPta === null) {
        horasFijasPta = null;
      }

      const asignaturaData = {
        programaId,
        nombre: data.nombre,
        codigo: data.codigo || `ASIG_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        creditos: data.creditos || 3,
        semestreId,
        nucleoTematicoId,
        facultadId: idFacultad,
        modalidad,
        tipoExcepcion: data.tipo && data.tipo !== 'obligatoria' ? data.tipo : null,
        horasFijasPta,
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

  async actualizarCuposCetap(programaId: string, ofertaId: string, cupos: number) {
    // Validate that the oferta belongs to the given program to prevent tampering
    const oferta = await this.programaRepo.query(
      `SELECT id FROM academic_work_plan.oferta_cetap_programa WHERE id = $1 AND id_programa = $2 LIMIT 1`,
      [ofertaId, programaId]
    );

    if (!oferta || oferta.length === 0) {
      throw new NotFoundException(`Oferta de CETAP con ID ${ofertaId} no encontrada para este programa.`);
    }

    await this.programaRepo.query(
      `UPDATE academic_work_plan.oferta_cetap_programa SET cupos_estimados = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [cupos, ofertaId]
    );

    return { success: true };
  }
}

