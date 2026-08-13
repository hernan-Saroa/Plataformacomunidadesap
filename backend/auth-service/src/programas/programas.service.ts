import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { EntityManager, QueryFailedError, Repository } from 'typeorm';
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
  private readonly logger = new Logger(ProgramasService.name);

  constructor(
    @InjectRepository(ProgramaAcademico)
    private readonly programaRepo: Repository<ProgramaAcademico>,
    @InjectRepository(Asignatura)
    private readonly asignaturaRepo: Repository<Asignatura>,
  ) {}

  // Cache de existencia de la columna programa.id_periodo_academico (migración 359).
  // Permite que el servicio funcione igual que antes mientras la migración no se ejecute.
  private programaPeriodoColumn: boolean | null = null;

  private async hasProgramaPeriodoColumn(): Promise<boolean> {
    if (this.programaPeriodoColumn !== null) return this.programaPeriodoColumn;
    try {
      const rows = await this.programaRepo.query(
        `SELECT 1
           FROM information_schema.columns
          WHERE table_schema = 'academic_work_plan'
            AND table_name = 'programa'
            AND column_name = 'id_periodo_academico'
          LIMIT 1`,
      );
      this.programaPeriodoColumn = Array.isArray(rows) && rows.length > 0;
    } catch {
      this.programaPeriodoColumn = false;
    }
    return this.programaPeriodoColumn;
  }

  private async applyPeriodoScope(qb: any, periodoAcademico?: string) {
    if (!periodoAcademico) return;
    const tienePeriodoColumna = await this.hasProgramaPeriodoColumn();
    if (tienePeriodoColumna) {
      qb.andWhere(`(
        EXISTS (
          SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp
          JOIN academic_work_plan.periodo_academico pa ON pa.id = ocp.id_periodo_academico
          WHERE ocp.id_programa = p.id
            AND ocp.activa = TRUE
            AND pa.codigo = :periodo
        )
        OR p.id_periodo_academico = (
          SELECT pa2.id FROM academic_work_plan.periodo_academico pa2
          WHERE pa2.codigo = :periodo
          LIMIT 1
        )
        OR (
          p.id_periodo_academico IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp_any
            WHERE ocp_any.id_programa = p.id AND ocp_any.activa = TRUE
          )
          AND EXISTS (
            SELECT 1 FROM academic_work_plan.periodo_academico pa3
            WHERE pa3.codigo = :periodo AND pa3.estado = 'en_curso'
          )
        )
      )`, { periodo: periodoAcademico });
      return;
    }

    qb.andWhere(`(
      EXISTS (
        SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp
        JOIN academic_work_plan.periodo_academico pa ON pa.id = ocp.id_periodo_academico
        WHERE ocp.id_programa = p.id
          AND ocp.activa = TRUE
          AND pa.codigo = :periodo
      )
      OR NOT EXISTS (
        SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp_any
        WHERE ocp_any.id_programa = p.id AND ocp_any.activa = TRUE
      )
    )`, { periodo: periodoAcademico });
  }

  async obtenerOpcionesFiltros(periodoAcademico?: string) {
    const params: any[] = [];
    const periodJoin = periodoAcademico
      ? `JOIN academic_work_plan.periodo_academico pa
           ON pa.id = ocp.id_periodo_academico AND pa.codigo = $1`
      : '';
    if (periodoAcademico) params.push(periodoAcademico);
    const cetaps = await this.programaRepo.query(
      `SELECT DISTINCT c.id::text AS value, c.nombre AS label
       FROM academic_work_plan.oferta_cetap_programa ocp
       ${periodJoin}
       JOIN academic_work_plan.cetap c ON c.id = ocp.id_cetap
       WHERE ocp.activa = TRUE AND c.activo = TRUE
       ORDER BY c.nombre ASC`,
      params,
    );

    return {
      // Catálogos posibles del negocio; no se reducen a los valores de la página
      // o del periodo actual, porque eso produciría selects con una sola opción.
      niveles: [
        'Pregrado', 'Técnico Profesional', 'Tecnológico',
        'Especialización', 'Maestría', 'Doctorado',
      ].map(value => ({ value, label: value })),
      modalidades: ['Presencial', 'Distancia', 'Mixto']
        .map(value => ({ value, label: value })),
      cetaps,
      estados: [
        { value: 'ACTIVO', label: 'Activo' },
        { value: 'INACTIVO', label: 'Inactivo' },
      ],
    };
  }

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
        'profesional universitario': 'pregrado',
        'técnico profesional': 'tecnico_profesional',
        'tecnico profesional': 'tecnico_profesional',
        'tecnológico': 'tecnologico',
        'tecnologico': 'tecnologico',
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
      const estadoNormalizado = String(estado).trim().toUpperCase();
      if (estadoNormalizado === 'ACTIVO') where.activo = true;
      if (estadoNormalizado === 'INACTIVO') where.activo = false;
    }

    const qb = this.programaRepo.createQueryBuilder('p');

    if (where.tipo) qb.andWhere('p.tipo = :tipo', { tipo: where.tipo });
    if (where.modalidad) qb.andWhere('p.modalidad = :modalidad', { modalidad: where.modalidad });
    if (where.activo !== undefined) qb.andWhere('p.activo = :activo', { activo: where.activo });
    if (search?.trim()) {
      qb.andWhere(`(
        p.nombre ILIKE :search
        OR p.codigo ILIKE :search
        OR p.nombre_corto ILIKE :search
        OR p.nombre_excel ILIKE :search
        OR EXISTS (
          SELECT 1 FROM academic_work_plan.facultad f
          WHERE f.id = p.id_facultad AND f.nombre ILIKE :search
        )
      )`, { search: `%${search.trim()}%` });
    }

    if (filtros.sede) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM academic_work_plan.oferta_cetap_programa ocp_sede
        JOIN academic_work_plan.cetap c_sede ON c_sede.id = ocp_sede.id_cetap
        JOIN academic_work_plan.periodo_academico pa_sede ON pa_sede.id = ocp_sede.id_periodo_academico
        WHERE ocp_sede.id_programa = p.id
          AND ocp_sede.activa = TRUE
          AND (c_sede.id::text = :sede OR LOWER(c_sede.nombre) = LOWER(:sede))
          AND (:periodoSede::text IS NULL OR pa_sede.codigo = :periodoSede)
      )`, { sede: String(filtros.sede), periodoSede: filtros.periodoAcademico || null });
    }

    await this.applyPeriodoScope(qb, filtros.periodoAcademico);

    qb.orderBy('p.nombre', 'ASC');
    qb.skip((page - 1) * limit);
    qb.take(limit);

    console.log('[DEBUG SQL]', qb.getSql(), qb.getParameters());

    const [data, total] = await qb.getManyAndCount();

    const nivelFormacionMap: Record<string, string> = {
      pregrado: 'Pregrado',
      tecnico_profesional: 'Técnico Profesional',
      tecnologico: 'Tecnológico',
      especializacion: 'Especialización',
      maestria: 'Maestría',
      doctorado: 'Doctorado',
    };

    const facultadRows = data.length > 0
      ? await this.programaRepo.query(
          `SELECT id, codigo, nombre
           FROM academic_work_plan.facultad
           WHERE id = ANY($1::bigint[])`,
          [data.map((programa) => programa.idFacultad)],
        )
      : [];
    const facultadesPorId = new Map(
      facultadRows.map((facultad: any) => [String(facultad.id), facultad.nombre]),
    );
    const codigosFacultadPorId = new Map(
      facultadRows.map((facultad: any) => [String(facultad.id), facultad.codigo]),
    );

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

        let sedeLabel = 'Sin oferta asignada';
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
          facultad: facultadesPorId.get(String(programa.idFacultad)) || 'Sin facultad',
          codigo_facultad: codigosFacultadPorId.get(String(programa.idFacultad)) || null,
          nombre_facultad: facultadesPorId.get(String(programa.idFacultad)) || 'Sin facultad',
          totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
          creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
          estudiantesActivos: cetapsList.reduce((acc: number, c: any) => acc + (c.estudiantes || 0), 0),
          cetapsList,
          horasBasePorCredito: programa.horasBasePorCredito,
          horasPregradoCentral: programa.horasPregradoCentral,
          // Campos Circular 003/2025 — calculados en runtime
          nombre_corto: programa.nombreCorto,
          tipo_programa: programa.tipo,
          categoria_horas_circular003: programa.categoriaHorasCircular003
            || this.inferCategoriaCircular003(programa.tipo, programa.horasPregradoCentral),
          descripcion_categoria_circular003: programa.descripcionCategoriaCircular003
            || this.inferDescripcionCircular003(programa.tipo, programa.horasPregradoCentral),
          horas_pta_referencia_circular003: programa.horasPtaReferenciaCircular003,
          formula_calculo_horas: programa.formulaCalculoHoras,
          horas_base_por_credito: programa.horasBasePorCredito,
          horas_pregrado_central: programa.horasPregradoCentral,
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
      tecnico_profesional: 'Técnico Profesional',
      tecnologico: 'Tecnológico',
      especializacion: 'Especialización',
      maestria: 'Maestría',
      doctorado: 'Doctorado',
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

    let sedeLabel = 'Sin oferta asignada';
    if (cetapsRes && cetapsRes.length > 0) {
      if (cetapsRes.length === 1) {
        sedeLabel = cetapsRes[0].nombre;
      } else {
        sedeLabel = `${cetapsRes[0].nombre} y ${cetapsRes.length - 1} CETAPs más`;
      }
    }

    const facultadRows = await this.programaRepo.query(
      'SELECT codigo, nombre FROM academic_work_plan.facultad WHERE id = $1 LIMIT 1',
      [programa.idFacultad],
    );

    return {
      ...programa,
      estado: programa.activo ? 'ACTIVO' : 'INACTIVO',
      nivelFormacion: nivelFormacionMap[programa.tipo] || programa.tipo || 'Pregrado',
      descripcion: programa.nombreExcel || programa.nombre,
      duracion: 10,
      creditos: parseInt(asignaturasStats?.creditos_plan || '0'),
      sede: sedeLabel,
      facultad: facultadRows[0]?.nombre || 'Sin facultad',
      codigo_facultad: facultadRows[0]?.codigo || null,
      nombre_facultad: facultadRows[0]?.nombre || 'Sin facultad',
      totalAsignaturas: parseInt(asignaturasStats?.total_asignaturas || '0'),
      creditosPlan: parseInt(asignaturasStats?.creditos_plan || '0'),
      estudiantesActivos: cetapsRes ? cetapsRes.reduce((acc: number, c: any) => acc + (parseInt(c.cupos_estimados) || 0), 0) : 0,
      cetapsList: cetapsRes ? cetapsRes.map((c: any) => ({ ofertaId: c.oferta_id, estudiantes: parseInt(c.cupos_estimados) || 0, cetap: c.nombre, dt: c.dt_nombre || 'Sin Dirección Territorial' })) : [],
      horasBasePorCredito: programa.horasBasePorCredito,
      horasPregradoCentral: programa.horasPregradoCentral,
      // Campos Circular 003/2025 — calculados en runtime
      nombre_corto: programa.nombreCorto,
      tipo_programa: programa.tipo,
      categoria_horas_circular003: programa.categoriaHorasCircular003
        || this.inferCategoriaCircular003(programa.tipo, programa.horasPregradoCentral),
      descripcion_categoria_circular003: programa.descripcionCategoriaCircular003
        || this.inferDescripcionCircular003(programa.tipo, programa.horasPregradoCentral),
      horas_pta_referencia_circular003: programa.horasPtaReferenciaCircular003,
      formula_calculo_horas: programa.formulaCalculoHoras,
      horas_base_por_credito: programa.horasBasePorCredito,
      horas_pregrado_central: programa.horasPregradoCentral,
    } as any;
  }

  async crearPrograma(dto: CreateProgramaDto): Promise<ProgramaAcademico> {
    const codigo = dto.codigo?.trim().toUpperCase();
    const nombre = dto.nombre?.trim();

    if (!codigo || !nombre) {
      throw new BadRequestException('El código y el nombre del programa son obligatorios.');
    }

    const existente = await this.programaRepo.query(
      `SELECT id
       FROM academic_work_plan.programa
       WHERE LOWER(codigo) = LOWER($1)
       LIMIT 1`,
      [codigo],
    );

    if (existente.length > 0) {
      throw new ConflictException(`Ya existe un programa con el código ${codigo}.`);
    }

    try {
      return await this.programaRepo.manager.transaction(async (manager) => {
        const idFacultad = await this.resolverFacultad(manager, dto.facultad);
        const suffix = randomUUID().replace(/-/g, '').slice(0, 8);

        const programa = manager.create(ProgramaAcademico, {
          codigo,
          nombre,
          nombreExcel: `${nombre.substring(0, 91)}_${suffix}`,
          nombreCorto: `${nombre.substring(0, 21)}_${suffix}`,
          idFacultad,
          tipo: this.mapearTipoPrograma(dto.nivelFormacion),
          modalidad: this.mapearModalidad(dto.modalidad),
          horasBasePorCredito: dto.horasBasePorCredito ?? 16,
          horasPregradoCentral: dto.horasPregradoCentral ?? null,
          activo: this.mapearEstadoActivo(dto.estado),
        });

        const guardado = await manager.save(programa);

        // Regla de negocio: un programa SIEMPRE se crea para el período ACTIVO
        // (en_curso), sin importar qué período se esté visualizando en el filtro.
        // Para crear en otro período hay que activarlo primero en Períodos.
        // Se hace por SQL directo para no depender de la columna en la entidad:
        // si la migración aún no se aplicó, simplemente no se asocia y nada se rompe.
        if (await this.hasProgramaPeriodoColumn()) {
          const periodosActivos = await manager.query(
            `SELECT codigo
               FROM academic_work_plan.periodo_academico
              WHERE estado = 'en_curso'
              ORDER BY anio DESC, semestre DESC
              LIMIT 1`,
          );
          // Si no hay período activo, se respeta el código recibido (compatibilidad).
          const codigoPeriodo =
            periodosActivos.length > 0
              ? periodosActivos[0].codigo
              : dto.periodoAcademico?.trim();
          if (codigoPeriodo) {
            await manager.query(
              `UPDATE academic_work_plan.programa
                  SET id_periodo_academico = pa.id
                 FROM academic_work_plan.periodo_academico pa
                WHERE academic_work_plan.programa.id = $1
                  AND pa.codigo = $2`,
              [guardado.id, codigoPeriodo],
            );
          }
        }

        return guardado;
      });
    } catch (error) {
      this.rethrowProgramaError(error, codigo);
    }
  }

  async actualizarPrograma(id: string, dto: UpdateProgramaDto): Promise<ProgramaAcademico> {
    const programa = await this.programaRepo.findOne({ where: { id } });
    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    if (dto.codigo) {
      const codigo = dto.codigo.trim().toUpperCase();
      const duplicado = await this.programaRepo.query(
        `SELECT id
         FROM academic_work_plan.programa
         WHERE LOWER(codigo) = LOWER($1) AND id <> $2
         LIMIT 1`,
        [codigo, id],
      );
      if (duplicado.length > 0) {
        throw new ConflictException(`Ya existe un programa con el código ${codigo}.`);
      }
      programa.codigo = codigo;
    }
    if (dto.nombre) programa.nombre = dto.nombre.trim();
    if (dto.nivelFormacion) {
      programa.tipo = this.mapearTipoPrograma(dto.nivelFormacion);
    }
    if (dto.modalidad) {
      programa.modalidad = this.mapearModalidad(dto.modalidad);
    }
    if (dto.horasBasePorCredito !== undefined) programa.horasBasePorCredito = dto.horasBasePorCredito;
    if (dto.horasPregradoCentral !== undefined) programa.horasPregradoCentral = dto.horasPregradoCentral;
    if (dto.estado) {
      programa.activo = this.mapearEstadoActivo(dto.estado);
    }

    try {
      if (dto.facultad) {
        programa.idFacultad = await this.programaRepo.manager.transaction(
          (manager) => this.resolverFacultad(manager, dto.facultad),
        );
      }
      return await this.programaRepo.save(programa);
    } catch (error) {
      this.rethrowProgramaError(error, programa.codigo);
    }
  }

  private normalizarTexto(value?: string): string {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private mapearTipoPrograma(nivelFormacion?: string): string {
    const nivel = this.normalizarTexto(nivelFormacion);
    if (nivel.includes('doctor')) return 'doctorado';
    if (nivel.includes('maestr')) return 'maestria';
    if (nivel.includes('especial')) return 'especializacion';
    if (nivel.includes('tecnolog')) return 'tecnologico';
    if (nivel.includes('tecnico')) return 'tecnico_profesional';
    return 'pregrado';
  }

  private mapearModalidad(modalidad?: string): string {
    const valor = this.normalizarTexto(modalidad);
    if (valor.includes('dist')) return 'distancia';
    if (valor.includes('mix')) return 'mixto';
    return 'presencial';
  }

  private mapearEstadoActivo(estado?: string): boolean {
    return this.normalizarTexto(estado || 'activo') === 'activo';
  }

  private crearCodigoFacultad(nombre: string, intento = 0): string {
    const base = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 14) || 'GENERAL';
    const suffix = intento > 0 ? `-${intento}` : '';
    return `FAC-${base}`.slice(0, 20 - suffix.length) + suffix;
  }

  private async resolverFacultad(
    manager: EntityManager,
    facultadIngresada?: string,
  ): Promise<string> {
    const nombre = facultadIngresada?.trim();

    if (nombre) {
      const existente = await manager.query(
        `SELECT id
         FROM academic_work_plan.facultad
         WHERE LOWER(nombre) = LOWER($1) OR LOWER(codigo) = LOWER($1)
         LIMIT 1`,
        [nombre],
      );
      if (existente.length > 0) {
        return String(existente[0].id);
      }

      for (let intento = 0; intento < 20; intento += 1) {
        try {
          const creada = await manager.query(
            `INSERT INTO academic_work_plan.facultad (codigo, nombre, activo)
             VALUES ($1, $2, TRUE)
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [this.crearCodigoFacultad(nombre, intento), nombre],
          );
          if (creada.length > 0) {
            return String(creada[0].id);
          }

          const creadaConcurrentemente = await manager.query(
            `SELECT id
             FROM academic_work_plan.facultad
             WHERE LOWER(nombre) = LOWER($1)
             LIMIT 1`,
            [nombre],
          );
          if (creadaConcurrentemente.length > 0) {
            return String(creadaConcurrentemente[0].id);
          }
        } catch (error) {
          throw error;
        }
      }

      throw new ConflictException('No fue posible generar un código único para la facultad.');
    }

    const primeraFacultad = await manager.query(
      `SELECT id
       FROM academic_work_plan.facultad
       WHERE activo = TRUE
       ORDER BY id
       LIMIT 1`,
    );
    if (primeraFacultad.length > 0) {
      return String(primeraFacultad[0].id);
    }

    const facultadDefecto = await manager.query(
      `INSERT INTO academic_work_plan.facultad (codigo, nombre, activo)
       VALUES ('DEF', 'Facultad por definir', TRUE)
       ON CONFLICT (codigo) DO UPDATE SET activo = TRUE
       RETURNING id`,
    );
    return String(facultadDefecto[0].id);
  }

  private rethrowProgramaError(error: unknown, codigo: string): never {
    if (error instanceof BadRequestException || error instanceof ConflictException) {
      throw error;
    }

    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        column?: string;
        constraint?: string;
        detail?: string;
      };
      this.logger.error(
        `Error guardando programa ${codigo}. PostgreSQL code=${driverError.code || 'unknown'} constraint=${driverError.constraint || 'none'} column=${driverError.column || 'none'} detail=${driverError.detail || error.message}`,
      );

      if (driverError.code === '23505') {
        throw new ConflictException(`Ya existe un programa con el código ${codigo}.`);
      }
      if (driverError.code === '23503') {
        throw new BadRequestException('La facultad seleccionada no existe.');
      }
      if (driverError.code === '23502') {
        throw new BadRequestException(
          `Falta un dato obligatorio${driverError.column ? `: ${driverError.column}` : ''}.`,
        );
      }
      if (driverError.code === '22001') {
        throw new BadRequestException(
          `Uno de los datos supera la longitud permitida${driverError.column ? `: ${driverError.column}` : ''}.`,
        );
      }
      if (driverError.code === '23514') {
        throw new BadRequestException('El nivel de formación o la modalidad no son válidos.');
      }
      if (driverError.code === '42P01' || driverError.code === '42703') {
        throw new BadRequestException(
          'La base de datos de programas académicos no está actualizada.',
        );
      }
    }

    throw error;
  }

  async eliminarPrograma(id: string, periodoCodigo?: string): Promise<void> {
    const programa = await this.programaRepo.findOne({ where: { id } });
    if (!programa) {
      throw new NotFoundException(`Programa con ID ${id} no encontrado`);
    }

    try {
      await this.programaRepo.manager.transaction(async (manager) => {
        const codigo = periodoCodigo?.trim();

        // ── BORRADO POR PERÍODO ──
        // Eliminar un programa desde la vista de un período NO debe afectar a los
        // demás períodos. Si el programa sigue presente en otro período, solo se
        // quita de este; si este era su único período, se elimina por completo.
        if (codigo) {
          const per = await manager.query(
            `SELECT id FROM academic_work_plan.periodo_academico WHERE codigo = $1 LIMIT 1`,
            [codigo],
          );
          const periodoId = per[0]?.id;

          if (periodoId) {
            // 1) Quitar las ofertas del programa SOLO en este período.
            await manager.query(
              `DELETE FROM academic_work_plan.oferta_cetap_programa
                WHERE id_programa = $1 AND id_periodo_academico = $2`,
              [id, periodoId],
            );

            // 2) ¿El programa sigue en OTROS períodos? (ofertas activas en otro
            //    período, o pertenece a un período distinto a este).
            const otrasOfertas = await manager.query(
              `SELECT id_periodo_academico
                 FROM academic_work_plan.oferta_cetap_programa
                WHERE id_programa = $1 AND activa = TRUE AND id_periodo_academico <> $2
                LIMIT 1`,
              [id, periodoId],
            );
            // Período "dueño" del programa (columna id_periodo_academico, si existe).
            let idPeriodoActual: any = null;
            const tienePeriodoColumna = await this.hasProgramaPeriodoColumn();
            if (tienePeriodoColumna) {
              const progRow = await manager.query(
                `SELECT id_periodo_academico FROM academic_work_plan.programa WHERE id = $1`,
                [id],
              );
              idPeriodoActual = progRow[0]?.id_periodo_academico ?? null;
            }
            const perteneceAOtroPeriodo =
              idPeriodoActual != null &&
              String(idPeriodoActual) !== String(periodoId);

            if (otrasOfertas.length > 0 || perteneceAOtroPeriodo) {
              // El programa sobrevive en otro período: NO se borra globalmente.
              // Si "pertenecía" a este período, se reasigna a otro donde aparezca.
              if (tienePeriodoColumna && String(idPeriodoActual) === String(periodoId)) {
                const destino = otrasOfertas[0]?.id_periodo_academico ?? null;
                await manager.query(
                  `UPDATE academic_work_plan.programa SET id_periodo_academico = $1 WHERE id = $2`,
                  [destino, id],
                );
              }
              return; // No se hace borrado completo.
            }
            // Si no quedó en ningún otro período, continúa al borrado completo.
          }
        }

        // ── BORRADO COMPLETO ──
        // (sin período indicado, o el programa solo existía en este período).
        // Orden de FK: ofertas -> asignaturas -> núcleos -> programa.
        await manager.query(
          `DELETE FROM academic_work_plan.oferta_cetap_programa WHERE id_programa = $1`,
          [id],
        );
        await manager.query(
          `DELETE FROM academic_work_plan.asignatura WHERE id_programa = $1`,
          [id],
        );
        await manager.query(
          `DELETE FROM academic_work_plan.nucleo_tematico WHERE id_programa = $1`,
          [id],
        );
        await manager.query(
          `DELETE FROM academic_work_plan.programa WHERE id = $1`,
          [id],
        );
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const code = (error.driverError as { code?: string })?.code;
        if (code === '23503') {
          throw new ConflictException(
            'No se puede eliminar el programa porque tiene información académica en uso (planes de trabajo o registros asociados).',
          );
        }
      }
      throw error;
    }
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

    return asignaturas.map(a => ({
      ...a,
      id: a.id,
      nombre: a.nombre,
      codigo: a.codigo,
      pensum: a.pensum,
      nombreBase: a.nombre_base,
      creditos: a.creditos,
      semestreId: a.id_ubicacion_semestral,
      nucleoTematicoId: a.id_nucleo_tematico,
      facultadId: a.id_facultad,
      modalidad: a.modalidad || 'sin_definir',
      modalidadSufijo: a.modalidad_sufijo,
      requiereRevisionModalidad: a.requiere_revision_modalidad,
      horasFijasPta: a.horas_fijas_pta,
      horasClase: a.horas_clase,
      horasPta: a.horas_pta,
      tipoExcepcion: a.tipo_excepcion,
      activa: a.activa,
      programaId: a.id_programa,
      semestre: String(a.id_ubicacion_semestral || 1),
      horas: a.horas_clase ?? (a.creditos || 3) * 48,
      tipo: a.tipo_asignatura || 'teorica',
      nucleoTematico: a.nucleo_nombre || 'Sin definir',
    }));
  }

  async guardarAsignaturasPrograma(programaId: string, asignaturas: any[]) {
    const programa = await this.programaRepo.findOne({ where: { id: programaId } });
    if (!programa) {
      throw new NotFoundException('Programa académico no encontrado');
    }

    if (!Array.isArray(asignaturas)) {
      throw new BadRequestException('La lista de asignaturas es obligatoria.');
    }

    try {
      await this.programaRepo.manager.transaction(async (manager) => {
        const asignaturaRepo = manager.getRepository(Asignatura);
        const existentes = await asignaturaRepo.find({ where: { programaId } });
        const existentesPorId = new Map(
          existentes.map((asignatura) => [String(asignatura.id), asignatura]),
        );
        const enviadosIds = new Set<string>();
        const codigosPayload = new Set<string>();

        for (let index = 0; index < asignaturas.length; index += 1) {
          const data = asignaturas[index] || {};
          const numeroFila = index + 1;
          const id = String(data.id || '');
          const esNueva = !id || id.startsWith('asig-');
          const nombre = String(data.nombre || '').trim();
          const codigo = String(data.codigo || '').trim().toUpperCase()
            || this.crearCodigoAsignatura();
          const creditos = Number(data.creditos);
          const semestre = Number(data.semestre || data.semestreId || 1);
          const pensum = String(data.pensum || '').trim() || null;
          const horasClaseRaw = data.horasClase ?? data.horas_clase ?? data.horas;
          const horasPtaRaw = data.horasPta ?? data.horas_pta ?? data.horasFijasPta;
          const horasClase = horasClaseRaw === null || horasClaseRaw === undefined || horasClaseRaw === ''
            ? null
            : Number(horasClaseRaw);
          const horasPta = horasPtaRaw === null || horasPtaRaw === undefined || horasPtaRaw === ''
            ? null
            : Number(horasPtaRaw);

          if (!nombre) {
            throw new BadRequestException(
              `La asignatura ${numeroFila} no tiene nombre.`,
            );
          }
          if (nombre.length > 200) {
            throw new BadRequestException(
              `El nombre de la asignatura "${nombre}" supera los 200 caracteres.`,
            );
          }
          if (codigo.length > 20) {
            throw new BadRequestException(
              `El código "${codigo}" supera los 20 caracteres permitidos.`,
            );
          }
          if (pensum && pensum.length > 50) {
            throw new BadRequestException(
              `El pensum "${pensum}" supera los 50 caracteres permitidos.`,
            );
          }
          if (horasClase !== null && (!Number.isInteger(horasClase) || horasClase < 0)) {
            throw new BadRequestException(
              `Las horas de clase de "${nombre}" deben ser un entero mayor o igual a cero.`,
            );
          }
          if (horasPta !== null && (!Number.isInteger(horasPta) || horasPta < 0)) {
            throw new BadRequestException(
              `Las horas PTA de "${nombre}" deben ser un entero mayor o igual a cero.`,
            );
          }
          if (!Number.isInteger(creditos) || creditos < 1 || creditos > 20) {
            throw new BadRequestException(
              `Los créditos de "${nombre}" deben ser un número entero entre 1 y 20.`,
            );
          }
          if (!Number.isInteger(semestre) || semestre < 1 || semestre > 16) {
            throw new BadRequestException(
              `El semestre de "${nombre}" debe estar entre 1 y 16.`,
            );
          }

          const codigoNormalizado = codigo.toLowerCase();
          if (codigosPayload.has(codigoNormalizado)) {
            throw new ConflictException(
              `El código de asignatura ${codigo} está repetido en el plan de estudios.`,
            );
          }
          codigosPayload.add(codigoNormalizado);

          if (!esNueva) {
            if (!existentesPorId.has(id)) {
              throw new BadRequestException(
                `La asignatura con ID ${id} no pertenece a este programa.`,
              );
            }
            enviadosIds.add(id);
          }

          await this.asegurarSemestre(
            manager,
            semestre,
            programa.tipo === 'pregrado'
              || programa.tipo === 'tecnico_profesional'
              || programa.tipo === 'tecnologico'
              ? 'pregrado'
              : 'posgrado',
          );

          const nucleoTematicoId = await this.resolverNucleoTematico(
            manager,
            programaId,
            data.nucleoTematicoId,
            data.nucleoTematico,
          );
          const tipoExcepcion = this.mapearTipoExcepcion(
            data.tipoExcepcion ?? data.tipo_excepcion,
          );
          const asignaturaData = {
            programaId,
            nombre,
            nombreBase: String(data.nombreBase || data.nombre_base || nombre).trim(),
            codigo,
            pensum,
            creditos,
            semestreId: semestre,
            nucleoTematicoId,
            facultadId: programa.idFacultad,
            modalidad: this.mapearModalidadAsignatura(data.modalidad),
            modalidadSufijo: String(data.modalidadSufijo || data.modalidad || '').trim() || null,
            requiereRevisionModalidad: Boolean(data.requiereRevisionModalidad ?? data.requiere_revision_modalidad),
            tipoAsignatura: this.mapearTipoAsignatura(data.tipo),
            tipoExcepcion,
            horasFijasPta: this.horasFijasPorExcepcion(tipoExcepcion),
            horasClase,
            horasPta,
            activa: data.activa !== false,
          };

          if (esNueva) {
            await asignaturaRepo.save(asignaturaRepo.create(asignaturaData));
          } else {
            await asignaturaRepo.update(id, asignaturaData);
          }
        }

        const idsAEliminar = existentes
          .filter((asignatura) => !enviadosIds.has(String(asignatura.id)))
          .map((asignatura) => asignatura.id);
        if (idsAEliminar.length > 0) {
          await asignaturaRepo.delete(idsAEliminar);
        }

        // Registrar evento de sincronización en tiempo real para que los MFEs lo detecten
        try {
          await manager.query(
            `INSERT INTO academic_work_plan."PtaEvento"
               (id, "ptaId", tipo, "sistemaOrigen", "leidoBackoffice", "leidoPortal", mensaje, "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              randomUUID(),
              'PLAN_ESTUDIOS', // ptaId
              'PLAN_ESTUDIOS_ACTUALIZADO', // tipo
              'backoffice', // sistemaOrigen
              true, // leidoBackoffice
              false, // leidoPortal
              `Plan de estudios actualizado para el programa ${programa.nombre} (ID: ${programaId})`, // mensaje
            ]
          );
        } catch (eventErr) {
          this.logger.warn(`No se pudo registrar el evento de sync: ${eventErr.message}`);
        }
      });

      return this.obtenerAsignaturasPrograma(programaId);
    } catch (error) {
      this.rethrowAsignaturasError(error);
    }
  }

  private crearCodigoAsignatura(): string {
    return `ASG-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  }

  private async asegurarSemestre(
    manager: EntityManager,
    semestre: number,
    tipoPrograma: 'pregrado' | 'posgrado',
  ): Promise<void> {
    await manager.query(
      `INSERT INTO academic_work_plan.ubicacion_semestral
         (id, codigo, etiqueta, tipo_programa, orden)
       VALUES ($1, $2, $3, $4, $1)
       ON CONFLICT (id) DO NOTHING`,
      [semestre, `SEM_${semestre}`, `Semestre ${semestre}`, tipoPrograma],
    );
  }

  private async resolverNucleoTematico(
    manager: EntityManager,
    programaId: string,
    nucleoId?: string,
    nucleoNombre?: string,
  ): Promise<string> {
    if (nucleoId && /^\d+$/.test(String(nucleoId))) {
      const existentePorId = await manager.query(
        `SELECT id
         FROM academic_work_plan.nucleo_tematico
         WHERE id = $1 AND activo = TRUE
         LIMIT 1`,
        [nucleoId],
      );
      if (existentePorId.length > 0) {
        return String(existentePorId[0].id);
      }
    }

    const nombre = String(nucleoNombre || 'General').trim() || 'General';
    if (nombre.length > 100) {
      throw new BadRequestException(
        `El núcleo temático "${nombre}" supera los 100 caracteres.`,
      );
    }

    const existentePorNombre = await manager.query(
      `SELECT id
       FROM academic_work_plan.nucleo_tematico
       WHERE LOWER(nombre) = LOWER($1)
         AND activo = TRUE
       LIMIT 1`,
      [nombre],
    );
    if (existentePorNombre.length > 0) {
      return String(existentePorNombre[0].id);
    }

    const creado = await manager.query(
      `INSERT INTO academic_work_plan.nucleo_tematico
         (codigo, name_temp, nombre, id_programa, activo)
       VALUES ($1, $2, $2, $3, TRUE)
       RETURNING id`
         .replace('name_temp, ', '')
         .replace(', $2, $2', ', $2'),
      [
        `NUC-${randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`,
        nombre,
        programaId,
      ],
    );
    return String(creado[0].id);
  }

  private mapearModalidadAsignatura(value?: string): string {
    const modalidad = this.normalizarTexto(value);
    if (modalidad.includes('noche') || modalidad.includes('nocturn')) return 'presencial_noche';
    if (modalidad.includes('dia') || modalidad.includes('diurn')) return 'presencial_dia';
    if (modalidad.includes('presencial')) return 'presencial';
    if (modalidad.includes('virtual')) return 'virtual';
    if (modalidad.includes('distancia')) return 'distancia';
    if (modalidad.includes('mixt') || modalidad.includes('hibrid')) return 'mixta';
    return 'sin_definir';
  }

  private mapearTipoAsignatura(value?: string): string {
    const tipo = this.normalizarTexto(value);
    const permitidos = ['teorica', 'practica', 'taller', 'seminario', 'laboratorio'];
    return permitidos.includes(tipo) ? tipo : 'teorica';
  }

  private mapearTipoExcepcion(value?: string): string | null {
    const tipo = this.normalizarTexto(value).replace(/\s+/g, '_');
    const permitidos = [
      'seminario_enfasis',
      'opciones_grado_ap',
      'seminario_opciones_apt',
    ];
    return permitidos.includes(tipo) ? tipo : null;
  }

  private horasFijasPorExcepcion(tipoExcepcion: string | null): number | null {
    if (tipoExcepcion === 'seminario_enfasis') return 384;
    if (tipoExcepcion === 'opciones_grado_ap') return 20;
    if (tipoExcepcion === 'seminario_opciones_apt') return 144;
    return null;
  }

  private rethrowAsignaturasError(error: unknown): never {
    if (
      error instanceof BadRequestException
      || error instanceof ConflictException
      || error instanceof NotFoundException
    ) {
      throw error;
    }

    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as {
        code?: string;
        column?: string;
        constraint?: string;
        detail?: string;
      };
      this.logger.error(
        `Error guardando plan de estudios. PostgreSQL code=${driverError.code || 'unknown'} constraint=${driverError.constraint || 'none'} column=${driverError.column || 'none'} detail=${driverError.detail || error.message}`,
      );

      if (driverError.code === '23505') {
        if (driverError.constraint && driverError.constraint.includes('nucleo_tematico')) {
          throw new ConflictException(
            `El núcleo temático ya existe o tiene un conflicto de nombre: ${driverError.detail || ''}`,
          );
        }
        throw new ConflictException(
          'Ya existe otra asignatura con el mismo código. Cada código debe ser único.',
        );
      }
      if (driverError.code === '23503') {
        throw new BadRequestException(
          'El programa, semestre, núcleo temático o facultad seleccionados no existen.',
        );
      }
      if (driverError.code === '23514') {
        throw new BadRequestException(
          'Una asignatura tiene créditos, modalidad, tipo o configuración PTA no válidos.',
        );
      }
      if (driverError.code === '23502') {
        throw new BadRequestException(
          `Falta un dato obligatorio de la asignatura${driverError.column ? `: ${driverError.column}` : ''}.`,
        );
      }
      if (driverError.code === '22001') {
        throw new BadRequestException(
          `Un dato de la asignatura supera la longitud permitida${driverError.column ? `: ${driverError.column}` : ''}.`,
        );
      }
      if (driverError.code === '42703') {
        throw new BadRequestException(
          'La base de datos requiere la migración de tipos de asignatura.',
        );
      }
    }

    throw error;
  }

  async actualizarCuposCetap(programaId: string, ofertaId: string, cupos: number) {
    // Regla de negocio: los cupos por CETAP deben estar entre 1 y 100.
    // Se valida en el backend para garantizar la integridad aunque el frontend
    // sea manipulado. El valor se persiste en oferta_cetap_programa.cupos_estimados
    // y es la fuente única que luego alimenta (de solo lectura) el PTA del docente.
    const cuposNum = Number(cupos);
    if (!Number.isInteger(cuposNum) || cuposNum < 1 || cuposNum > 100) {
      throw new BadRequestException(
        'La cantidad de estudiantes por CETAP debe ser un número entero entre 1 y 100.',
      );
    }

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
      [cuposNum, ofertaId]
    );

    return { success: true, cupos: cuposNum };
  }

  // ─── Circular 003/2025 — Helpers ─────────────────────────────────
  private inferCategoriaCircular003(tipo: string, horasPregradoCentral: number | null): string | null {
    if (horasPregradoCentral && horasPregradoCentral > 0) return 'pregrado_sede_central';
    const t = (tipo || '').toLowerCase();
    if (t.includes('maestria') || t.includes('maestría')) return 'maestria';
    if (t.includes('especializacion') || t.includes('especialización')) return 'especializacion';
    if (t.includes('pregrado')) return 'pregrado_territorial';
    return null;
  }

  private inferDescripcionCircular003(tipo: string, horasPregradoCentral: number | null): string | null {
    if (horasPregradoCentral && horasPregradoCentral > 0) return 'Pregrado Sede Central (AP/EP) - Bloque Fijo';
    const t = (tipo || '').toLowerCase();
    if (t.includes('maestria') || t.includes('maestría')) return 'Maestria - 12h por credito';
    if (t.includes('especializacion') || t.includes('especialización')) return 'Especializacion - 16h por credito';
    if (t.includes('pregrado')) return 'APT / Territorial - 16h por credito';
    return null;
  }
}

