import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PlanTrabajoAcademicoEntity } from './entities/plan-trabajo-academico.entity';
import { HistorialEstadoPtaEntity } from './entities/historial-estado-pta.entity';
import { PtaEvidenciaEntity } from './entities/pta-evidencia.entity';
import { SolicitudPtaEntity } from './entities/solicitud-pta.entity';
import { PtaConfiguracionEntity } from './entities/pta-configuracion.entity';
import { PtaUserDataEntity } from './entities/pta-user-data.entity';
import { ProgramaEntity } from './entities/programa.entity';
import { AsignaturaEntity } from './entities/asignatura.entity';
import { TerritorialEntity } from './entities/territorial.entity';
import { SedeEntity } from './entities/sede.entity';
import { DocenteEntity } from './entities/docente.entity';
import { PersonaEntity } from './entities/persona.entity';
import { UsuarioEntity } from './entities/usuario.entity';
import { AprobacionJefaturaEntity } from './entities/aprobacion-jefatura.entity';
import { PtaEventoEntity } from './entities/pta-evento.entity';
import { PtaComponentApprovalEntity } from './entities/pta-component-approval.entity';

type SavePtaInput = Record<string, any>;

function coalesceString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

@Injectable()
export class PtaService {
  private readonly otpStore = new Map<string, { code: string; expiresAt: Date }>();
  private readonly logger = new Logger(PtaService.name);

  constructor(
    @InjectRepository(PlanTrabajoAcademicoEntity)
    private readonly ptaRepo: Repository<PlanTrabajoAcademicoEntity>,
    @InjectRepository(HistorialEstadoPtaEntity)
    private readonly historialRepo: Repository<HistorialEstadoPtaEntity>,
    @InjectRepository(PtaEvidenciaEntity)
    private readonly evidenciaRepo: Repository<PtaEvidenciaEntity>,
    @InjectRepository(SolicitudPtaEntity)
    private readonly solicitudRepo: Repository<SolicitudPtaEntity>,
    @InjectRepository(PtaConfiguracionEntity)
    private readonly configuracionRepo: Repository<PtaConfiguracionEntity>,
    @InjectRepository(PtaUserDataEntity)
    private readonly userDataRepo: Repository<PtaUserDataEntity>,
    @InjectRepository(ProgramaEntity)
    private readonly programaRepo: Repository<ProgramaEntity>,
    @InjectRepository(AsignaturaEntity)
    private readonly asignaturaRepo: Repository<AsignaturaEntity>,
    @InjectRepository(TerritorialEntity)
    private readonly territorialRepo: Repository<TerritorialEntity>,
    @InjectRepository(SedeEntity)
    private readonly sedeRepo: Repository<SedeEntity>,
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(AprobacionJefaturaEntity)
    private readonly aprobacionJefaturaRepo: Repository<AprobacionJefaturaEntity>,
    @InjectRepository(PtaEventoEntity)
    private readonly eventoRepo: Repository<PtaEventoEntity>,
    @InjectRepository(PtaComponentApprovalEntity)
    private readonly ptaComponentApprovalRepo: Repository<PtaComponentApprovalEntity>,
  ) {}

  private safeUsuario(usuario: any) {
    if (!usuario || typeof usuario !== 'object') return null;
    const { password: _pw, ...rest } = usuario as any;
    return rest;
  }

  private readonly columnCache = new Map<string, boolean>();

  private async hasColumn(schema: string, table: string, column: string): Promise<boolean> {
    const cacheKey = `${schema}.${table}.${column}`;
    const cached = this.columnCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const rows = await this.ptaRepo.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
         AND column_name = $3
       LIMIT 1`,
      [schema, table, column],
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  private async fetchAuthDocenteInfo(docenteKey: string, options?: { adminEdit?: boolean }): Promise<{ personId: string, email: string | null, fullName: string }> {
    const key = coalesceString(docenteKey);
    if (!key) throw new BadRequestException('docente_id es requerido');

    const [personasHasIdPerson, personasHasIdTercero, userHasIdPerson, userHasIdTercero] = await Promise.all([
      this.hasColumn('auth', 'personas', 'id_person'),
      this.hasColumn('auth', 'personas', 'id_tercero'),
      this.hasColumn('auth', 'user', 'id_person'),
      this.hasColumn('auth', 'user', 'id_tercero'),
    ]);

    let joinUserPersonas: string;
    if (personasHasIdPerson && userHasIdPerson) {
      joinUserPersonas = `u.id_person = p.id_person`;
    } else if (personasHasIdTercero && userHasIdTercero) {
      joinUserPersonas = `u.id_tercero = p.id_tercero`;
    } else {
      throw new BadRequestException(
        'No se pudo resolver el esquema auth: faltan columnas para relacionar auth."user" con auth.personas.',
      );
    }

    const keyPredicates = [
      personasHasIdPerson ? `p.id_person::text = $1` : null,
      personasHasIdTercero ? `p.id_tercero::text = $1` : null,
      `u.id_user::text = $1`,
    ].filter(Boolean);

    const roleFilter = options?.adminEdit
      ? ''
      : `JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
      JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
        AND (UPPER(COALESCE(r.code, '')) = 'DOCENTE' OR UPPER(COALESCE(r.name, '')) = 'DOCENTE')`;

    const sql = `
      SELECT
        ${personasHasIdPerson ? 'p.id_person::text' : 'NULL'} as person_id,
        ${personasHasIdTercero ? 'p.id_tercero::text' : 'NULL'} as tercero_id,
        p.dir_email as email,
        p.nom_largo as nom_largo,
        p.nom_tercero as primer_nombre,
        NULL as segundo_nombre,
        p.pri_apellido as primer_apellido,
        p.seg_apellido as segundo_apellido
      FROM auth.personas p
      JOIN auth."user" u ON ${joinUserPersonas}
      ${roleFilter}
      WHERE (${keyPredicates.join(' OR ')})
      LIMIT 1
    `;

    const rows = await this.ptaRepo.query(sql, [key]);
    const authRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!authRow) {
      if (options?.adminEdit) {
        // No está en auth.personas pero es una edición admin: usar el key directamente
        // para que resolveDocenteCompleto lo busque en academic_work_plan."Docente"
        return { personId: key, email: null, fullName: 'Docente ESAP' };
      }
      throw new BadRequestException('La persona no tiene el rol DOCENTE (auth.role.code) o no existe en auth.personas.');
    }

    const personId = coalesceString(authRow.person_id, authRow.tercero_id) || key;
    const email = coalesceString(authRow.email);
    // Preferir nom_largo (nombre completo) sobre la concatenación de campos parciales
    const fullNameFromParts = [
      authRow.primer_nombre,
      authRow.segundo_nombre,
      authRow.primer_apellido,
      authRow.segundo_apellido,
    ].filter(Boolean).join(' ');
    const fullName = coalesceString(authRow.nom_largo, fullNameFromParts) || 'Docente ESAP';

    return { personId, email, fullName };
  }

  private async resolveDocenteCompleto(docenteKey: string, options?: { fallbackTerritorial?: string; adminEdit?: boolean }): Promise<{ personId: string, email: string | null, fullName: string }> {
    const { personId, email, fullName } = await this.fetchAuthDocenteInfo(docenteKey, { adminEdit: options?.adminEdit });

    // Mapear a academic_work_plan."Docente" (para mantener compatibilidad con FK de PTA).
    const byId = await this.docenteRepo.findOne({ where: { id: personId } as any });
    if (byId) return { personId: byId.id, email, fullName };

    const byPersonaId = await this.docenteRepo.findOne({ where: { personaId: personId } as any });
    if (byPersonaId) return { personId: byPersonaId.id, email, fullName };

    if (email) {
      const byCorreo = await this.docenteRepo.findOne({ where: { correoInstitucional: email } as any });
      if (byCorreo) return { personId: byCorreo.id, email, fullName };

      // Buscar por email en auth.personas → academic_work_plan."Docente"
      const byUsuarioEmail = await this.docenteRepo
        .createQueryBuilder('d')
        .where(
          `EXISTS (
            SELECT 1
            FROM auth.personas p
            WHERE p.id_person = d."personaId"
              AND LOWER(p.dir_email) = LOWER(:email)
          )`,
          { email },
        )
        .getOne();
      if (byUsuarioEmail) return { personId: byUsuarioEmail.id, email, fullName };
    }

    // Buscar por num_identificacion en auth.personas vs identificacion en academic_work_plan."Persona"
    const authPersonaRows = await this.ptaRepo.manager.query(
      `SELECT p.num_identificacion FROM auth.personas p WHERE p.id_person = $1 LIMIT 1`,
      [personId],
    );
    if (authPersonaRows?.length > 0) {
      const numId = authPersonaRows[0]?.num_identificacion;
      if (numId) {
        const byDoc = await this.docenteRepo
          .createQueryBuilder('d')
          .where(
            `EXISTS (
              SELECT 1
              FROM academic_work_plan."Persona" p
              WHERE p.id = d."personaId"::text
                AND p.identificacion = :numId
            )`,
            { numId },
          )
          .getOne();
        if (byDoc) return { personId: byDoc.id, email, fullName };
      }
    }

    // Si no existe, auto-aprovisionamos el docente para no violar la FK al guardar el PTA
    const fallbackTerritorial = options?.fallbackTerritorial || (await this.ptaRepo.manager.query(`SELECT id_seccional::text AS id FROM auth.seccionales LIMIT 1`))?.[0]?.id;

    if (fallbackTerritorial) {
      console.warn(`[PTA] Auto-aprovisionando Docente ${personId} en academic_work_plan."Docente" para evitar error de FK.`);
      try {
        const usuarioRepo = this.ptaRepo.manager.getRepository(UsuarioEntity);
        // Usar upsert para evitar QueryFailedError por duplicidad de llaves en condiciones de carrera
        const now = new Date();
        await usuarioRepo.upsert({ id: personId, email: email || 'docente@esap.edu.co', password: 'N/A', updatedAt: now, createdAt: now }, ['id']);

        const personaRepoLocal = this.ptaRepo.manager.getRepository(PersonaEntity);
        // Buscar primero por usuarioId para evitar violación del constraint UNIQUE(usuarioId)
        const personaExistente = await personaRepoLocal.findOne({ where: { usuarioId: personId } as any });
        if (!personaExistente) {
          await personaRepoLocal.upsert({ id: personId, usuarioId: personId, updatedAt: now, createdAt: now }, ['id']);
        }

        const nuevoDocente = this.docenteRepo.create({
          id: personId,
          personaId: personId,
          territorialId: fallbackTerritorial,
          tipoVinculacion: 'CARRERA_003',
          dedicacion: 'Tiempo Completo',
          estado: 'ACTIVO',
          horasAsignables: 800,
          correoInstitucional: email,
          updatedAt: now,
          createdAt: now,
        });
        await this.docenteRepo.upsert(nuevoDocente, ['id']);
        return { personId, email, fullName };
      } catch (err) {
        console.error('[PTA] Error aprovisionando docente dummy:', err);
      }
    }

    console.warn(
      `[PTA] Persona ${personId} tiene rol DOCENTE en auth, pero no se encontró mapeo en academic_work_plan."Docente". Usando personId como docenteId.`,
    );
    return { personId, email, fullName };
  }

  // Cache de resolución de docente (TTL 30s) para evitar queries repetidas en la misma sesión
  private readonly docenteCache = new Map<string, { result: { personId: string; email: string | null; fullName: string }; expiresAt: number }>();

  private async resolveDocenteIdCached(docenteKey: string, options?: { fallbackTerritorial?: string; adminEdit?: boolean }): Promise<{ personId: string; email: string | null; fullName: string }> {
    const cacheKey = `${docenteKey}:${options?.adminEdit ? 'admin' : 'normal'}`;
    const cached = this.docenteCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const result = await this.resolveDocenteCompleto(docenteKey, options);
    this.docenteCache.set(cacheKey, { result, expiresAt: Date.now() + 30_000 });
    return result;
  }

  private async resolveDocenteId(docenteKey: string, options?: { fallbackTerritorial?: string }): Promise<string> {
    const res = await this.resolveDocenteIdCached(docenteKey, options);
    return res.personId;
  }

  private isMedioTiempo(dedicacionRaw: any): boolean {
    const d = String(dedicacionRaw || '').toLowerCase();
    return d.includes('medio') || d === 'mt' || d === 'medio_tiempo' || d === 'medio tiempo';
  }

  calcHorasProgramables(input: { tipo_vinculacion?: any; dedicacion?: any; semanas_vinculacion?: any }) {
    const tipo = coalesceString(input?.tipo_vinculacion) || 'CARRERA_003';
    const esMT = this.isMedioTiempo(input?.dedicacion);
    const semanas = Number(input?.semanas_vinculacion) || 16;

    if (tipo === 'CARRERA_009') {
      return esMT ? 360 : 720;
    }
    if (tipo === 'CARRERA_003' || tipo === 'PERIODO_PRUEBA') {
      return esMT ? 400 : 800;
    }

    const hSem = esMT ? 20 : 40;
    return hSem * semanas;
  }

  private computeHorasTotales(body: any) {
    const asignaturas = Array.isArray(body?.asignaturas) ? body.asignaturas : [];
    const sumDocencia = asignaturas.reduce((sum: number, a: any) => sum + Number(a?.total_horas ?? a?.horas ?? 0), 0);

    const invActs = Array.isArray(body?.investigacion_actividades) ? body.investigacion_actividades : [];
    const invProyectoHoras = Number(body?.investigacion_proyecto?.horas_solicitadas || 0);
    const horasActividadesInv = invActs.reduce(
      (sum: number, a: any) => sum + (Number(a?.horas) || Number(a?.horas_total) || 0),
      0,
    );
    const sumInv = invProyectoHoras > 0 ? invProyectoHoras : horasActividadesInv;

    const extActsRaw = Array.isArray(body?.extension_actividades) ? body.extension_actividades : [];
    const extActs = extActsRaw.map((a: any) => {
      const actId = String(a?.actividad_id || a?.id || '');
      const seccion = String(a?.seccion || '');
      const esCapacitacion = actId.startsWith('CAP_') || seccion === 'capacitacion';
      if (!esCapacitacion) return a;
      const horasEjec = Number(a?.horas_ejecutadas ?? a?.horas ?? 0);
      return { ...a, horas: horasEjec * 2 };
    });
    const sumExt = extActs.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    const comp = Array.isArray(body?.complementarias) ? body.complementarias : [];
    const sumComp = comp.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    const acad = Array.isArray(body?.academico_admin) ? body.academico_admin : [];
    const sumAcad = acad.reduce((sum: number, a: any) => sum + Number(a?.horas || 0), 0);

    const total = sumDocencia + sumInv + sumExt + sumComp + sumAcad;
    return { sumDocencia, sumInv, sumExt, sumComp, sumAcad, total };
  }

  private toPtaDto(entity: PlanTrabajoAcademicoEntity) {
    const {
      id: _id, pta_id: _ptaId, ptaId: _ptaId2,
      estado: _estado, periodo: _periodo, version: _version,
      docente_id: _docId,
      ...extra
    } = (entity.datosEstructurados && typeof entity.datosEstructurados === 'object'
      ? entity.datosEstructurados
      : {}) as Record<string, any>;

    // Calcular horas por componente desde datosEstructurados para la tabla del backoffice
    const ds = entity.datosEstructurados as any || {};
    const asignaturas: any[] = Array.isArray(ds.asignaturas) ? ds.asignaturas : [];
    const invActs: any[] = Array.isArray(ds.investigacion_actividades) ? ds.investigacion_actividades : [];
    const extActs: any[] = Array.isArray(ds.extension_actividades) ? ds.extension_actividades : [];
    const comp: any[] = Array.isArray(ds.complementarias) ? ds.complementarias : [];
    const acadAdmin: any[] = Array.isArray(ds.academico_admin) ? ds.academico_admin : [];

    const hDocencia = asignaturas.reduce((s: number, a: any) => s + (Number(a?.total_horas ?? a?.horas) || 0), 0);
    const hInv = Number(ds.investigacion_proyecto?.horas_solicitadas || 0) ||
      invActs.reduce((s: number, a: any) => s + (Number(a?.horas_total ?? a?.horas) || 0), 0);
    const hExt = extActs.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hComp = comp.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const hAcad = acadAdmin.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
    const horasTotal = entity.horasTotales || (hDocencia + hInv + hExt + hComp + hAcad);
    const horasAsignables = (entity as any).horasAsignables || Number(ds.horas_a_programar) || 800;

    return {
      id: entity.id,
      docente_id: entity.docenteId,
      periodo: entity.periodo,
      estado: entity.estado,
      version: entity.version,
      horas_totales: horasTotal,
      // Aliases usados por la tabla del backoffice
      total_horas_programadas: horasTotal,
      horas_a_programar: horasAsignables,
      horas_asignables: horasAsignables,
      // Horas por componente para barras de color
      horas_docencia: hDocencia,
      horas_investigacion: hInv,
      horas_extension: hExt,
      horas_complementarias: hComp,
      horas_acad_admin: hAcad,
      num_asignaturas: asignaturas.length,
      motivo_devolucion: entity.motivoDevolucion,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      dedicacion: (entity as any).dedicacion,
      tipo_vinculacion: (entity as any).tipoVinculacion,
      semanas_vinculacion: (entity as any).semanasVinculacion,
      ...extra,
      pta_id: entity.id,
      ptaId: entity.id,
    };
  }

  private toEvidenciaDto(entity: PtaEvidenciaEntity) {
    return {
      id: entity.id,
      ptaId: entity.ptaId,
      pta_id: entity.ptaId,
      nombre: entity.nombre,
      tipoArchivo: entity.tipoArchivo,
      tipo_archivo: entity.tipoArchivo,
      tamanioBytes: entity.tamanioBytes,
      tamanio_bytes: entity.tamanioBytes,
      tamanio: entity.tamanioBytes,
      categoria: entity.categoria,
      componentePta: entity.componentePta,
      componente_pta: entity.componentePta,
      horasAvance: entity.horasAvance,
      horas_avance: entity.horasAvance,
      storageUrl: entity.storageUrl,
      storage_url: entity.storageUrl,
      subidoPor: entity.subidoPor,
      subido_por: entity.subidoPor,
      descripcion: entity.descripcion,
      estado: entity.estado,
      estadoRevision: entity.estadoRevision,
      estado_revision: entity.estadoRevision,
      revisadoPor: entity.revisadoPor,
      revisado_por: entity.revisadoPor,
      comentarioRevision: entity.comentarioRevision,
      comentario_revision: entity.comentarioRevision,
      createdAt: entity.createdAt,
      created_at: entity.createdAt,
      updatedAt: entity.updatedAt,
      updated_at: entity.updatedAt,
      fecha_subida: entity.createdAt,
    };
  }

  async getAllPTAs(filters: any) {
    const qb = this.ptaRepo.createQueryBuilder('pta');

    if (filters?.estado) {
      qb.andWhere('pta.estado = :estado', { estado: String(filters.estado) });
    }
    if (filters?.periodo) {
      qb.andWhere('pta.periodo = :periodo', { periodo: String(filters.periodo) });
    }

    qb.orderBy('pta.updatedAt', 'DESC');
    qb.take(Math.min(Number(filters?.limit || 200), 500));

    const rows = await qb.getMany();
    return rows.map((row) => this.toPtaDto(row));
  }

  async getPTAsByDocente(docenteId: string, periodo?: string | undefined) {
    const resolved = await this.resolveDocenteId(docenteId);
    const qb = this.ptaRepo.createQueryBuilder('pta');
    qb.andWhere('pta.docenteId = :docenteId', { docenteId: resolved });
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    qb.orderBy('pta.updatedAt', 'DESC');
    const rows = await qb.getMany();
    return rows.map((row) => this.toPtaDto(row));
  }

  async getPTAById(id: string) {
    const pta = await this.ptaRepo.findOne({ where: { id } });
    if (!pta) throw new NotFoundException('PTA no encontrado');

    const [evidencias, historial] = await Promise.all([
      this.evidenciaRepo.find({ where: { ptaId: id }, order: { createdAt: 'DESC' } }),
      this.historialRepo.find({ where: { ptaId: id }, order: { createdAt: 'DESC' } }),
    ]);

    return {
      ...this.toPtaDto(pta),
      evidencias: evidencias.map((e) => this.toEvidenciaDto(e)),
      historialEstados: historial,
    };
  }

  async savePTA(input: SavePtaInput) {
    const id = coalesceString(input?.id);
    const docenteKey = coalesceString(
      input?.docente_id,
      input?.docenteId,
      input?.docente?.id,
      input?.docente?.personaId,
    );
    const fallbackTerritorial = Array.isArray(input?.asignaturas) && input.asignaturas.length > 0 ? input.asignaturas[0].territorial_id : undefined;
    const isAdminEdit = Boolean(input?._adminEdit);
    const { personId: docenteId, fullName: dbName } = await this.resolveDocenteIdCached(docenteKey || '', { fallbackTerritorial, adminEdit: isAdminEdit });

    // Enrich identity if missing
    if (!input.docente_nombre) {
      input.docente_nombre = dbName;
    }

    const periodo = coalesceString(input?.periodo) || '2026-1';
    let estado = coalesceString(input?.estado) || 'BORRADOR';

    // Normalize state case
    if (estado.toLowerCase() === 'borrador') estado = 'Borrador';

    // Regla legacy: máximo 1 PTA activo salvo solicitud aprobada.
    if (!id && !isAdminEdit) {
      const ESTADOS_ACTIVOS = [
        'BORRADOR',
        'Borrador',
        'PROPUESTO_POR_DIRECCION',
        'NOTIFICADO_DOCENTE',
        'ACEPTADO_DOCENTE',
        'MODIFICADO_DOCENTE',
        'OBJETADO_DOCENTE',
        'EN_CONCERTACION',
        'CONCERTADO',
        'ESCALADO_SNA',
        'Pendiente Jefatura',
        'Pendiente Decanatura',
        'Pendiente Gestión Profesoral',
        'REVISION_DOCENTE_N1',
        'REVISION_DOCENTE_N2',
        'REVISION_DOCENTE_N3',
        'Devuelto',
        'Aprobado',
      ];

      const ptaActivo = await this.ptaRepo.findOne({
        where: { docenteId, estado: In(ESTADOS_ACTIVOS as any) } as any,
        select: { id: true, estado: true } as any,
      });

      if (ptaActivo) {
        const solicitud = await this.solicitudRepo.findOne({
          where: { docenteId, estado: 'aprobado' } as any,
          order: { resolucionFecha: 'DESC' as any, updatedAt: 'DESC' as any } as any,
        });
        if (!solicitud) {
          throw new BadRequestException(
            'Ya tienes un Plan de Trabajo en ejecución. Finalizá o esperá su aprobación antes de crear uno nuevo.',
          );
        }
      }
    }

    // [BR-010] Bloqueo por Modalidad "Por Definir": no se puede concertar asignaturas
    // que tengan requiere_revision_modalidad = TRUE en la base de datos.
    const asignaturasInput: any[] = Array.isArray(input?.asignaturas) ? input.asignaturas : [];
    if (asignaturasInput.length > 0) {
      const codigosAsignaturas = asignaturasInput
        .map((a: any) => coalesceString(a?.codigo, a?.codigo_asignatura, a?.asignatura_codigo))
        .filter(Boolean);

      if (codigosAsignaturas.length > 0) {
        const placeholders = codigosAsignaturas.map((_: any, i: number) => `$${i + 1}`).join(', ');
        const bloqueadas = await this.ptaRepo.manager.query(
          `SELECT codigo, nombre FROM academic_work_plan.asignatura 
           WHERE codigo IN (${placeholders}) AND requiere_revision_modalidad = TRUE`,
          codigosAsignaturas,
        );

        if (bloqueadas.length > 0) {
          const nombresBloqueadas = bloqueadas.map((b: any) => `${b.codigo} (${b.nombre})`).join(', ');
          throw new BadRequestException(
            `[BR-010] No se puede concertar el PTA: ${bloqueadas.length} asignatura(s) tienen modalidad "Por Definir" pendiente de revisión directiva: ${nombresBloqueadas}. ` +
            `Contacte al nivel directivo para que defina la modalidad exacta (Presencial, Virtual, etc.) antes de incluirlas en el PTA.`
          );
        }
      }
    }

    const horas = this.computeHorasTotales(input);
    const horasAProgramar =
      Number(input?.horas_a_programar ?? input?.horasAsignables ?? input?.horas_asignables) ||
      this.calcHorasProgramables({
        tipo_vinculacion: input?.tipo_vinculacion,
        dedicacion: input?.dedicacion,
        semanas_vinculacion: input?.semanas_vinculacion,
      });

    const patch: Partial<PlanTrabajoAcademicoEntity> = {
      docenteId,
      periodo,
      estado,
      motivoDevolucion: input?.motivo_devolucion ?? input?.motivoDevolucion ?? null,
      observaciones: input?.observaciones_docente ?? input?.observaciones ?? null,
      datosEstructurados: input,
      horasTotales: horas.total,
      dedicacion: coalesceString(input?.dedicacion) as any,
      horasAsignables: Number.isFinite(horasAProgramar) ? Number(horasAProgramar) : null,
      semanasVinculacion: input?.semanas_vinculacion != null ? Number(input?.semanas_vinculacion) : null,
      tipoVinculacion: coalesceString(input?.tipo_vinculacion) as any,
    };

    let saved: PlanTrabajoAcademicoEntity;
    let estadoAnteriorSave: string | null = null;

    if (id) {
      const existing = await this.ptaRepo.findOne({ where: { id } });
      if (!existing) {
        saved = await this.ptaRepo.save(this.ptaRepo.create({ ...patch, id, version: 1 }));
      } else {
        estadoAnteriorSave = existing.estado;
        saved = await this.ptaRepo.save({ ...existing, ...patch });
      }
    } else {
      saved = await this.ptaRepo.save(this.ptaRepo.create({ ...patch, version: 1 }));
    }

    // Registrar en historial cuando hay cambio de estado o creación inicial
    const tipoAccionSave = !estadoAnteriorSave ? 'CREACION'
      : estado !== estadoAnteriorSave ? 'CAMBIO_ESTADO'
      : isAdminEdit ? 'EDICION_ADMIN'
      : 'GUARDADO';
    if (!estadoAnteriorSave || estado !== estadoAnteriorSave || !id) {
      await this.historialRepo.save(this.historialRepo.create({
        ptaId: saved.id,
        estadoAnterior: estadoAnteriorSave,
        estadoNuevo: saved.estado,
        actorId: coalesceString(input?.docente_id, input?.docenteId),
        actorRol: isAdminEdit ? 'Administrador' : 'Docente',
        tipoAccion: tipoAccionSave,
        comentarios: input?.observaciones_docente || null,
        snapshotPta: input,
        version: saved.version,
      }));
    }

    // Evento para realtime sync
    await this.logEvento({
      ptaId: saved.id,
      tipo: tipoAccionSave === 'CREACION' ? 'notificacion' : tipoAccionSave === 'CAMBIO_ESTADO' ? 'cambio_estado' : 'guardado',
      docenteId: coalesceString(input?.docente_id, input?.docenteId),
      docenteNombre: coalesceString(input?.docente_nombre),
      estadoAnterior: estadoAnteriorSave,
      estadoNuevo: saved.estado,
      actor: coalesceString(input?.docente_id, input?.docenteId),
      actorRol: isAdminEdit ? 'Administrador' : 'Docente',
      sistemaOrigen: isAdminEdit ? 'backoffice' : 'portal',
      mensaje: tipoAccionSave === 'CREACION' ? 'PTA creado' : tipoAccionSave === 'CAMBIO_ESTADO' ? `Estado: ${estadoAnteriorSave} → ${saved.estado}` : 'PTA guardado',
    });

    return this.toPtaDto(saved);
  }

  async updatePTAStatus(
    ptaId: string,
    body: any,
  ) {
    const existing = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existing) throw new NotFoundException('PTA no encontrado');

    const accion = coalesceString(body?.accion, body?.tipoAccion);
    let nuevoEstado = coalesceString(body?.estado);

    // Máquina de estados: calcula el siguiente estado según el actual y la acción.
    if (!nuevoEstado && accion) {
      const a = accion.toLowerCase();
      const estadoActual = existing.estado;

      if (a === 'aprobar') {
        // Cada aprobador avanza al siguiente nivel. Si hay cambios que el docente
        // debe revisar, pone REVISION_DOCENTE_Nx en vez de avanzar directo.
        const hayCambios = body?.camposModificados &&
          typeof body.camposModificados === 'object' &&
          Object.keys(body.camposModificados).length > 0;

        if (estadoActual === 'Pendiente Jefatura') {
          nuevoEstado = hayCambios ? 'REVISION_DOCENTE_N1' : 'Pendiente Decanatura';
        } else if (estadoActual === 'Pendiente Decanatura') {
          nuevoEstado = hayCambios ? 'REVISION_DOCENTE_N2' : 'Pendiente Gestión Profesoral';
        } else if (estadoActual === 'Pendiente Gestión Profesoral') {
          nuevoEstado = 'Aprobado';
        } else {
          // fallback para estados legacy
          nuevoEstado = 'Aprobado';
        }
      } else if (a === 'devolver') {
        // Devolver desde cada nivel pone al docente en el nivel de revisión correspondiente
        if (estadoActual === 'Pendiente Jefatura') {
          nuevoEstado = 'REVISION_DOCENTE_N1';
        } else if (estadoActual === 'Pendiente Decanatura') {
          nuevoEstado = 'REVISION_DOCENTE_N2';
        } else if (estadoActual === 'Pendiente Gestión Profesoral') {
          // G.Profesoral devuelve al N2 (Decanatura fue quien aprobó antes)
          nuevoEstado = 'REVISION_DOCENTE_N2';
        } else {
          nuevoEstado = 'Devuelto';
        }
      } else if (a.includes('rechaz')) {
        nuevoEstado = 'Rechazado';
      } else if (a === 'reenviar_corregido') {
        // Docente reenvía tras revisión: vuelve al nivel que lo devolvió
        if (estadoActual === 'REVISION_DOCENTE_N1') nuevoEstado = 'Pendiente Jefatura';
        else if (estadoActual === 'REVISION_DOCENTE_N2') nuevoEstado = 'Pendiente Decanatura';
        else if (estadoActual === 'REVISION_DOCENTE_N3') nuevoEstado = 'Pendiente Gestión Profesoral';
        else nuevoEstado = 'Pendiente Jefatura';
      } else if (a.includes('reenviar')) {
        nuevoEstado = 'Pendiente Jefatura';
      } else if (a === 'avanzar_sin_cambios') {
        // Docente acepta los cambios del revisor sin modificar nada
        if (estadoActual === 'REVISION_DOCENTE_N1') nuevoEstado = 'Pendiente Decanatura';
        else if (estadoActual === 'REVISION_DOCENTE_N2') nuevoEstado = 'Pendiente Gestión Profesoral';
        else if (estadoActual === 'REVISION_DOCENTE_N3') nuevoEstado = 'Aprobado';
      }
    }

    if (!nuevoEstado) {
      nuevoEstado = existing.estado;
    }

    if (nuevoEstado === 'Aprobado' && existing.estado !== 'Aprobado') {
      const validation = await this.getRUNDDocente(existing.docenteId);
      const criticos = ['DOCUMENTO_IDENTIDAD', 'VINCULACION', 'DEDICACION', 'ACTO_ADMINISTRATIVO'];
      const noValidados = validation.validaciones.filter(v =>
        criticos.includes(v.campo_rund) && v.estado_documento !== 'Aceptado'
      );

      if (noValidados.length > 0) {
        const nombresFaltantes = noValidados.map(v => v.campo_rund).join(', ');
        throw new BadRequestException(
          `No se puede aprobar el PTA. Los siguientes soportes documentales críticos del docente no están validados: ${nombresFaltantes}`
        );
      }
    }

    // ── Lógica multi-jefatura territorial ──────────────────────────────────────
    const a = accion?.toLowerCase() || '';
    if (existing.estado === 'Pendiente Jefatura' && (a === 'aprobar' || a === 'devolver')) {
      const aprobaciones = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });

      // Limpiar filas huérfanas: si hay >1 fila para la misma territorial, borrar duplicadas
      const byTerritorial = new Map<string, typeof aprobaciones>();
      for (const ap of aprobaciones) {
        const key = ap.territorialId || '__sin_territorial__';
        if (!byTerritorial.has(key)) byTerritorial.set(key, []);
        byTerritorial.get(key)!.push(ap);
      }
      for (const [, filas] of byTerritorial.entries()) {
        if (filas.length <= 1) continue;
        // Conservar la aprobada si existe, si no la última; borrar el resto
        const keeper = filas.find(f => f.decision !== 'pendiente') || filas[filas.length - 1];
        const toDelete = filas.filter(f => f.id !== keeper.id);
        if (toDelete.length > 0) {
          await this.aprobacionJefaturaRepo.delete(toDelete.map(f => f.id));
        }
      }

      // Releer post-limpieza
      const aprobacionesLimpias = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
      const territoriales = [...new Set(aprobacionesLimpias.map(ap => ap.territorialId).filter(Boolean))];
      const aprobacionesPendientes = aprobacionesLimpias.filter(ap => ap.decision === 'pendiente');

      // Solo aplica flujo multi-jefatura si hay 2+ territoriales DISTINTAS pendientes
      if (territoriales.length >= 2 && aprobacionesPendientes.length >= 2) {
        const actorId = coalesceString(body?.actorId, body?.actor_id);
        const isSuperUser = !!body?.isSuperUser;
        const aprobarTodas = !!body?.aprobarTodas;
        const observaciones = coalesceString(body?.observaciones, body?.comentarios);
        const hayCambios = body?.camposModificados && Object.keys(body.camposModificados).length > 0;

        // Resolver territorialId del actor
        let actorTerritorialId: string | null = coalesceString(body?.actorTerritorialId);
        if (!actorTerritorialId && actorId) {
          const docenteRow = await this.docenteRepo.findOne({ where: { id: actorId } as any });
          if ((docenteRow as any)?.territorialId) actorTerritorialId = (docenteRow as any).territorialId;
        }
        if (!actorTerritorialId && actorId) {
          const prevAprobacion = aprobacionesLimpias.find(ap => ap.jefaturaUserId === actorId);
          if (prevAprobacion) actorTerritorialId = prevAprobacion.territorialId;
        }

        if (a === 'devolver') {
          // Una devolución devuelve todas las aprobaciones
          const toUpdate = actorTerritorialId
            ? aprobacionesLimpias.filter(ap => ap.territorialId === actorTerritorialId)
            : aprobacionesLimpias;
          for (const ap of toUpdate) {
            await this.aprobacionJefaturaRepo.save({ ...ap, decision: 'devuelto', jefaturaUserId: actorId || '', comentarios: observaciones });
          }
          nuevoEstado = 'REVISION_DOCENTE_N1';
        } else {
          // aprobar
          const decision = hayCambios ? 'aprobado_con_cambios' : 'aprobado';
          if (isSuperUser || aprobarTodas || !actorTerritorialId) {
            // Sin territorial asignada o superuser → aprueba todas las pendientes
            for (const ap of aprobacionesLimpias.filter(x => x.decision === 'pendiente')) {
              await this.aprobacionJefaturaRepo.save({ ...ap, decision, jefaturaUserId: actorId || '', comentarios: observaciones || `Aprobado por ${actorId}` });
            }
          } else if (actorTerritorialId) {
            // Buscar por territorial exacta, o por usuario si ya registró antes
            const apRow = aprobacionesLimpias.find(ap => ap.decision === 'pendiente' && (ap.territorialId === actorTerritorialId || ap.jefaturaUserId === actorId));
            if (apRow) await this.aprobacionJefaturaRepo.save({ ...apRow, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          } else {
            // Fallback: aprobar la primera pendiente (con o sin jefatura asignada)
            const primero = aprobacionesLimpias.find(ap => ap.decision === 'pendiente');
            if (primero) await this.aprobacionJefaturaRepo.save({ ...primero, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          }

          // Verificar si quedan pendientes
          const pendientes = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });
          const aunPendientes = pendientes.filter(ap => ap.decision !== 'aprobado' && ap.decision !== 'aprobado_con_cambios');

          if (aunPendientes.length > 0) {
            // Aprobación parcial — registrar historial y retornar sin cambiar estado
            await this.historialRepo.save(this.historialRepo.create({
              ptaId, estadoAnterior: existing.estado, estadoNuevo: existing.estado,
              actorId, actorRol: coalesceString(body?.actorRol) || 'Jefatura de Zona',
              tipoAccion: 'APROBACION_PARCIAL_JEFATURA',
              comentarios: observaciones,
              snapshotPta: existing.datosEstructurados ?? null,
              version: existing.version,
            }));
            return {
              parcial: true,
              message: 'Tu aprobación fue registrada. Esperando aprobación de otras jefaturas.',
              nuevoEstado: existing.estado,
              aprobaciones: pendientes,
              pta: this.toPtaDto(existing),
            };
          }

          // Todas aprobaron → determinar siguiente estado
          const algunaConCambios = pendientes.some(ap => ap.decision === 'aprobado_con_cambios');
          nuevoEstado = algunaConCambios ? 'REVISION_DOCENTE_N1' : 'Pendiente Decanatura';
        }
      }
    }

    // ── Cuando el PTA llega a Pendiente Jefatura, inicializar aprobaciones ──────
    if (nuevoEstado === 'Pendiente Jefatura' && existing.estado !== 'Pendiente Jefatura') {
      await this.initAprobacionesJefatura(ptaId, existing.datosEstructurados);
    }

    const estadoAnterior = existing.estado;
    const nextVersion = (existing.version || 1) + 1;

    const updated = await this.ptaRepo.save({
      ...existing,
      estado: nuevoEstado,
      version: nextVersion,
      motivoDevolucion: body?.motivo_devolucion ?? body?.motivoDevolucion ?? existing.motivoDevolucion,
      datosEstructurados: existing.datosEstructurados,
    });

    await this.historialRepo.save(
      this.historialRepo.create({
        ptaId,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        actorId: coalesceString(body?.actorId, body?.aprobador_id, body?.resueltoPor, body?.actor_id),
        actorRol: coalesceString(body?.actorRol, body?.aprobador_rol, body?.actor_rol),
        tipoAccion: accion,
        comentarios: coalesceString(body?.observaciones, body?.comentarios),
        detallesTransicion: coalesceString(body?.detallesTransicion, body?.detalles_transicion),
        snapshotPta: updated.datosEstructurados ?? null,
        version: updated.version,
      }),
    );

    const ds = existing.datosEstructurados as any;
    await this.logEvento({
      ptaId,
      tipo: 'cambio_estado',
      docenteId: existing.docenteId,
      docenteNombre: coalesceString(ds?.docente_nombre),
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      actor: coalesceString(body?.actorId, body?.actor_id),
      actorRol: coalesceString(body?.actorRol, body?.actor_rol),
      sistemaOrigen: body?.sistemaOrigen ?? 'backoffice',
      mensaje: `${estadoAnterior} → ${nuevoEstado}`,
      metadata: { accion, observaciones: coalesceString(body?.observaciones, body?.comentarios) },
    });

    return {
      version: updated.version,
      nuevoEstado,
      pta: this.toPtaDto(updated),
    };
  }

  async getAprobacionesJefatura(ptaId: string) {
    return this.aprobacionJefaturaRepo.find({ where: { ptaId }, order: { createdAt: 'ASC' } });
  }

  private async initAprobacionesJefatura(ptaId: string, datosEstructurados: any) {
    // Extraer territoriales únicas de las asignaturas del PTA
    const asignaturas: any[] = datosEstructurados?.asignaturas || [];
    const territorialesIds = [...new Set(
      asignaturas.map((a: any) => a.territorial_id).filter(Boolean) as string[]
    )];

    if (territorialesIds.length <= 1) return; // Solo multi-territorial requiere registros

    for (const tId of territorialesIds) {
      const [territorial] = await this.ptaRepo.manager.query(
        `SELECT nom_seccional AS nombre FROM auth.seccionales WHERE id_seccional::text = $1 LIMIT 1`,
        [tId],
      );
      await this.aprobacionJefaturaRepo
        .createQueryBuilder()
        .insert()
        .values({
          ptaId,
          territorialId: tId,
          territorialNombre: (territorial as any)?.nombre || null,
          decision: 'pendiente',
          jefaturaUserId: '',
        })
        .orIgnore() // ON CONFLICT DO NOTHING (unique ptaId+territorialId)
        .execute()
        .catch(() => {});
    }
  }

  // ── Eventos / Realtime sync ────────────────────────────────────────────────

  private async logEvento(opts: {
    ptaId: string; tipo: string; docenteId?: string | null; docenteNombre?: string | null;
    estadoAnterior?: string | null; estadoNuevo?: string | null;
    actor?: string | null; actorRol?: string | null;
    sistemaOrigen?: string; mensaje?: string | null; metadata?: any;
  }) {
    try {
      await this.eventoRepo.save(this.eventoRepo.create({
        ptaId: opts.ptaId,
        tipo: opts.tipo,
        docenteId: opts.docenteId ?? null,
        docenteNombre: opts.docenteNombre ?? null,
        estadoAnterior: opts.estadoAnterior ?? null,
        estadoNuevo: opts.estadoNuevo ?? null,
        actor: opts.actor ?? null,
        actorRol: opts.actorRol ?? null,
        sistemaOrigen: opts.sistemaOrigen ?? 'sistema',
        mensaje: opts.mensaje ?? null,
        leidoBackoffice: false,
        leidoPortal: false,
        metadata: opts.metadata ?? null,
      }));
    } catch { /* non-critical */ }
  }

  async getSyncStatus() {
    const total = await this.eventoRepo.count();
    const unread = await this.eventoRepo.count({ where: { leidoBackoffice: false } as any });
    return { connected: true, counter: total, pending: unread, last_sync: new Date().toISOString() };
  }

  async getRecentEvents(query: any) {
    const qb = this.eventoRepo.createQueryBuilder('ev')
      .orderBy('ev.createdAt', 'DESC')
      .take(50);

    if (query?.docente_id) qb.andWhere('ev.docenteId = :did', { did: query.docente_id });
    if (query?.sistema_origen) qb.andWhere('ev.sistemaOrigen = :so', { so: query.sistema_origen });
    if (query?.since) qb.andWhere('ev.createdAt > :since', { since: new Date(query.since) });

    const rows = await qb.getMany();
    return rows.map(e => ({
      id: e.id,
      tipo: e.tipo,
      pta_id: e.ptaId,
      docente_id: e.docenteId,
      docente_nombre: e.docenteNombre,
      estado_anterior: e.estadoAnterior,
      estado_nuevo: e.estadoNuevo,
      actor: e.actor,
      actor_rol: e.actorRol,
      sistema_origen: e.sistemaOrigen,
      mensaje: e.mensaje,
      leido_backoffice: e.leidoBackoffice,
      leido_portal: e.leidoPortal,
      timestamp: e.createdAt,
      metadata: e.metadata,
    }));
  }

  async markEventsRead(eventIds: string[], sistema: string) {
    if (!eventIds?.length) return;
    const field = sistema === 'portal' ? 'leidoPortal' : 'leidoBackoffice';
    await this.eventoRepo
      .createQueryBuilder()
      .update()
      .set({ [field]: true } as any)
      .where('id IN (:...ids)', { ids: eventIds })
      .execute();
  }

  async getReporteSeguimiento(filters: any) {
    const qb = this.ptaRepo.createQueryBuilder('pta').orderBy('pta.updatedAt', 'DESC').take(500);
    if (filters?.periodo) qb.andWhere('pta.periodo = :periodo', { periodo: String(filters.periodo) });
    if (filters?.estado) qb.andWhere('pta.estado = :estado', { estado: String(filters.estado) });

    const ptas = await qb.getMany();
    const now = Date.now();

    const detalle = ptas.map(p => {
      const dto = this.toPtaDto(p);
      const diasSinMovimiento = p.updatedAt ? Math.floor((now - new Date(p.updatedAt).getTime()) / 86400000) : 0;
      return { ...dto, diasSinMovimiento };
    });

    const alertas = {
      sinMovimiento7d: detalle.filter(p => p.diasSinMovimiento >= 7 && !['Aprobado','Rechazado','Borrador'].includes(p.estado)).length,
      sobrecarga: detalle.filter(p => (p.total_horas_programadas || 0) > (p.horas_a_programar || 800)).length,
      sinHoras: detalle.filter(p => (p.total_horas_programadas || 0) === 0 && p.estado !== 'Borrador').length,
      escaladosSNA: detalle.filter(p => p.estado === 'ESCALADO_SNA').length,
    };

    return { alertas, detalle, total: detalle.length, generadoEn: new Date().toISOString() };
  }

  async getEvidenciasPTA(ptaId: string) {
    const rows = await this.evidenciaRepo.find({ where: { ptaId }, order: { createdAt: 'DESC' } });
    return rows.map((row) => this.toEvidenciaDto(row));
  }

  async registrarEvidenciaPTA(ptaId: string, body: any) {
    const nombre = coalesceString(body?.nombre, body?.originalName, body?.filename) || 'evidencia';
    const tipoArchivo = coalesceString(body?.tipoArchivo, body?.tipo_archivo, body?.tipo) || 'pdf';
    const tamanioBytes = Number(body?.tamanioBytes ?? body?.tamanio_bytes ?? body?.size ?? 0) || 0;
    const storageUrl = coalesceString(body?.storageUrl, body?.storage_url, body?.url);

    const entity = this.evidenciaRepo.create({
      ptaId,
      nombre,
      tipoArchivo,
      tamanioBytes,
      categoria: coalesceString(body?.categoria) as any,
      componentePta: coalesceString(body?.componentePta, body?.componente_pta) as any,
      horasAvance: Number(body?.horasAvance ?? body?.horas_avance ?? 0) || 0,
      storageUrl: storageUrl,
      subidoPor: coalesceString(body?.subidoPor, body?.subido_por) as any,
      descripcion: coalesceString(body?.descripcion) as any,
      estado: coalesceString(body?.estado) || 'activo',
      estadoRevision: coalesceString(body?.estadoRevision, body?.estado_revision) || 'pendiente',
    });

    const saved = await this.evidenciaRepo.save(entity);
    return this.toEvidenciaDto(saved);
  }

  async eliminarEvidenciaPTA(ptaId: string, evidenciaId: string) {
    await this.evidenciaRepo.delete({ id: evidenciaId, ptaId });
    return { deleted: true };
  }

  async revisarEvidenciaPTA(ptaId: string, evidenciaId: string, body: any) {
    const existing = await this.evidenciaRepo.findOne({ where: { id: evidenciaId, ptaId } });
    if (!existing) throw new NotFoundException('Evidencia no encontrada');

    const decision = coalesceString(body?.decision, body?.estado_revision, body?.estadoRevision);
    const estadoRevision =
      decision === 'aprobado' || decision === 'aprobada'
        ? 'aprobado'
        : decision === 'rechazado' || decision === 'rechazada'
          ? 'rechazado'
          : existing.estadoRevision;

    const updated = await this.evidenciaRepo.save({
      ...existing,
      estadoRevision,
      revisadoPor: coalesceString(body?.revisado_por, body?.revisadoPor) ?? existing.revisadoPor,
      comentarioRevision: coalesceString(body?.observaciones, body?.comentario, body?.comentarioRevision) ?? existing.comentarioRevision,
    });

    return this.toEvidenciaDto(updated);
  }

  async crearSolicitudPTA(body: any) {
    const resolvedDocenteId = await this.resolveDocenteId(coalesceString(body?.docenteId, body?.docente_id) || '');
    const entity = this.solicitudRepo.create({
      docenteId: resolvedDocenteId,
      docenteNombre: coalesceString(body?.docenteNombre, body?.docente_nombre) || '',
      docenteEmail: coalesceString(body?.docenteEmail, body?.docente_email) as any,
      caso: coalesceString(body?.caso) || '',
      razon: coalesceString(body?.razon) || '',
      justificacion: coalesceString(body?.justificacion) || '',
      casoLibre: coalesceString(body?.casoLibre, body?.caso_libre) as any,
      archivos: body?.archivos ?? null,
      estado: 'pendiente',
    });

    return await this.solicitudRepo.save(entity);
  }

  async getMisSolicitudesPTA(docenteId: string) {
    const resolved = await this.resolveDocenteId(docenteId);
    return await this.solicitudRepo.find({ where: { docenteId: resolved }, order: { createdAt: 'DESC' } });
  }

  async marcarSolicitudLeida(solicitudId: string) {
    const existing = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!existing) throw new NotFoundException('Solicitud no encontrada');
    existing.notificacionLeida = true;
    await this.solicitudRepo.save(existing);
    return { ok: true };
  }

  async resolverSolicitudPTA(solicitudId: string, body: any) {
    const existing = await this.solicitudRepo.findOne({ where: { id: solicitudId } });
    if (!existing) throw new NotFoundException('Solicitud no encontrada');

    existing.estado = coalesceString(body?.decision) === 'aprobado' ? 'aprobado' : coalesceString(body?.decision) === 'denegado' ? 'denegado' : existing.estado;
    existing.resolucionMotivo = coalesceString(body?.motivo) as any;
    existing.resolucionAccion = coalesceString(body?.accion) as any;
    existing.territorialNueva = coalesceString(body?.territorialNueva) as any;
    existing.horasPtaOriginal = body?.horasPtaOriginal ?? existing.horasPtaOriginal;
    existing.horasPtaNuevo = body?.horasPtaNuevo ?? existing.horasPtaNuevo;
    existing.resueltoPor = coalesceString(body?.resueltoPor) as any;
    await this.solicitudRepo.save(existing);
    return existing;
  }

  async getSolicitudesPTA(filters?: { estado?: string }) {
    const qb = this.solicitudRepo.createQueryBuilder('s');
    if (filters?.estado) {
      qb.andWhere('s.estado = :estado', { estado: String(filters.estado) });
    }
    qb.orderBy('s.createdAt', 'DESC');
    qb.take(500);
    return qb.getMany();
  }

  async deletePTA(ptaId: string) {
    await Promise.all([
      this.evidenciaRepo.delete({ ptaId }),
      this.historialRepo.delete({ ptaId }),
    ]);
    await this.ptaRepo.delete({ id: ptaId });
    return { deleted: true };
  }

  async getAllPtasConEvidencias(periodo?: string) {
    const qb = this.ptaRepo.createQueryBuilder('pta');
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    qb.orderBy('pta.updatedAt', 'DESC');
    qb.take(500);
    const ptas = await qb.getMany();
    if (ptas.length === 0) return [];

    const ids = ptas.map((p) => p.id);
    const evidencias = await this.evidenciaRepo
      .createQueryBuilder('ev')
      .where('ev.ptaId IN (:...ids)', { ids })
      .orderBy('ev.createdAt', 'DESC')
      .getMany();

    const evidenciasByPta: Record<string, any[]> = {};
    for (const ev of evidencias) {
      evidenciasByPta[ev.ptaId] ||= [];
      evidenciasByPta[ev.ptaId].push(this.toEvidenciaDto(ev));
    }

    return ptas.map((pta) => ({
      ...this.toPtaDto(pta),
      evidencias: evidenciasByPta[pta.id] || [],
    }));
  }

  async getConfiguracionPTAGlobal() {
    const keys = ['pta_rules_v2', 'global'];
    for (const key of keys) {
      const row = await this.configuracionRepo.findOne({ where: { id: key } });
      if (row?.rules != null) return row.rules;
    }
    return null;
  }

  async saveConfiguracionPTAGlobal(rules: any) {
    const key = 'pta_rules_v2';
    const existing = await this.configuracionRepo.findOne({ where: { id: key } });
    const saved = await this.configuracionRepo.save(
      existing
        ? { ...existing, rules: rules ?? null }
        : this.configuracionRepo.create({ id: key, rules: rules ?? null }),
    );
    return saved.rules ?? null;
  }

  async getPTAUserData(userId: string) {
    const row = await this.userDataRepo.findOne({ where: { userId } });
    if (!row) return null;
    return {
      pinned_pta_ids: Array.isArray(row.pinned) ? row.pinned : [],
      saved_tags: Array.isArray(row.tags) ? row.tags : [],
      notes: row.notes && typeof row.notes === 'object' ? row.notes : {},
      favorite_views: Array.isArray(row.priority) ? row.priority : [],
    };
  }

  async savePTAUserData(userId: string, data: any) {
    const existing = await this.userDataRepo.findOne({ where: { userId } });
    const next = {
      pinned: data?.pinned_pta_ids ?? existing?.pinned ?? [],
      tags: data?.saved_tags ?? existing?.tags ?? [],
      notes: data?.notes ?? existing?.notes ?? {},
      priority: data?.favorite_views ?? existing?.priority ?? [],
    };

    const saved = await this.userDataRepo.save(
      existing
        ? { ...existing, ...next }
        : this.userDataRepo.create({ userId, ...next }),
    );

    return {
      pinned_pta_ids: Array.isArray(saved.pinned) ? saved.pinned : [],
      saved_tags: Array.isArray(saved.tags) ? saved.tags : [],
      notes: saved.notes && typeof saved.notes === 'object' ? saved.notes : {},
      favorite_views: Array.isArray(saved.priority) ? saved.priority : [],
    };
  }

  async seedPTAs() {
    const docentes = await this.docenteRepo.find({ take: 3, order: { createdAt: 'DESC' } });
    const periodo = '2026-1';
    const estados = ['BORRADOR', 'Pendiente Jefatura', 'Aprobado'];
    let created = 0;

    for (let i = 0; i < docentes.length; i++) {
      const docenteId = docentes[i]?.id;
      if (!docenteId) continue;
      const estado = estados[i % estados.length];
      await this.savePTA({
        docente_id: docenteId,
        periodo,
        estado,
        _adminEdit: true,
        docente_nombre: `Docente ${i + 1}`,
        programa: 'Programa Demo',
        territorial: 'Territorial Demo',
        horas_totales: 40,
      });
      created += 1;
    }

    return { created };
  }

  // ─────────────────────────────
  // Catálogos (migración legacy)
  // ─────────────────────────────
  async getCatalogoProgramas() {
    return await this.programaRepo.find({ order: { nombre: 'ASC' } });
  }

  async getCatalogoAsignaturas(query?: any) {
    const q = query || {};
    const programaId = coalesceString(q.programaId, q.programa_id);
    const completo = String(q.completo || '').toLowerCase() === 'true';

    const params: any[] = [];
    const where = !completo && programaId
      ? (() => {
          params.push(programaId);
          return `WHERE a.id_programa::text = $1 OR p.id::text = $1 OR p.codigo = $1`;
        })()
      : '';

    const rows = await this.asignaturaRepo.query(
      `
      SELECT
        a.id,
        a.id_programa AS "programaId",
        a.nombre,
        a.codigo,
        a.creditos,
        a.horas_fijas_pta AS horas,
        a.id_nucleo_tematico AS "nucleoTematico",
        a.id_ubicacion_semestral AS semestre_id,
        us.etiqueta AS semestre_etiqueta,
        a.modalidad,
        a.tipo_excepcion AS tipo,
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt",
        p.id AS programa_real_id,
        p.codigo AS programa_codigo,
        p.nombre AS programa_nombre,
        p.tipo AS programa_nivel,
        p.activo AS programa_estado,
        p.id_facultad AS programa_facultad,
        p.modalidad AS programa_modalidad
      FROM academic_work_plan.asignatura a
      LEFT JOIN academic_work_plan.programa p
        ON p.id = a.id_programa
      LEFT JOIN academic_work_plan.ubicacion_semestral us
        ON us.id = a.id_ubicacion_semestral
      ${where}
      ORDER BY a.nombre ASC
      LIMIT 5000
      `,
      params,
    );

    return rows.map((a: any) => ({
      id: a.id,
      programaId: a.programaId,
      programa_id: a.programa_real_id || a.programaId,
      nombre: a.nombre,
      codigo: a.codigo,
      creditos: a.creditos,
      horas: a.horas,
      nucleoTematico: a.nucleoTematico,
      nucleo: a.nucleoTematico || 'General',
      semestre: a.semestre_etiqueta || a.semestre_id,
      modalidad: a.modalidad,
      tipo: a.tipo,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      programa: a.programa_real_id ? {
        id: a.programa_real_id,
        codigo: a.programa_codigo,
        nombre: a.programa_nombre,
        descripcion: a.programa_descripcion,
        estado: a.programa_estado,
        nivel: a.programa_nivel,
        facultad: a.programa_facultad,
        modalidad: a.programa_modalidad,
      } : null,
    }));
  }

  async getCatalogoTerritoriales() {
    const rows = await this.ptaRepo.manager.query(`
      SELECT
        sec.id_seccional::text AS id,
        sec.nom_seccional AS nombre,
        sec.cod_seccional AS codigo,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sede.id_sede::text,
              'territorialId', sec.id_seccional::text,
              'nombre', sede.nom_sede,
              'municipio', NULL,
              'codigo', sede.cod_sede
            )
            ORDER BY sede.nom_sede
          ) FILTER (WHERE sede.id_sede IS NOT NULL),
          '[]'::json
        ) AS sedes
      FROM auth.seccionales sec
      LEFT JOIN auth.sedes sede ON sede.id_seccional = sec.id_seccional
      GROUP BY sec.id_seccional, sec.nom_seccional, sec.cod_seccional
      ORDER BY sec.nom_seccional ASC
    `);
    return rows;
  }

  async getCatalogoCetaps(query?: any) {
    const territorialId = coalesceString(query?.territorial_id, query?.territorialId);
    const params: any[] = [];
    const where = territorialId ? 'WHERE sede.id_seccional::text = $1' : '';
    if (territorialId) params.push(territorialId);
    return await this.ptaRepo.manager.query(
      `
      SELECT
        sede.id_sede::text AS id,
        sede.id_seccional::text AS "territorialId",
        sede.nom_sede AS nombre,
        NULL AS municipio,
        sede.cod_sede AS codigo
      FROM auth.sedes sede
      ${where}
      ORDER BY sede.nom_sede ASC
      `,
      params,
    );
  }

  async getDocentesDisponibles(query?: any) {
    const periodo = coalesceString(query?.periodo);
    const docentes = await this.ptaRepo.manager.query(`
      SELECT
        d.*,
        json_build_object(
          'id', p.id_person,
          'identificacion', p.num_identificacion,
          'tipo_identificacion', p.tip_identificacion,
          'primer_nombre', p.nom_tercero,
          'primer_apellido', p.pri_apellido,
          'segundo_apellido', p.seg_apellido,
          'telefono', p.tel_celular,
          'genero', p.gen_tercero,
          'fecha_nacimiento', p.fec_nacimiento,
          'correo_alternativo', NULL,
          'usuario', json_build_object(
            'id', u.id_user,
            'email', u.username,
            'nombre', p.nom_largo,
            'activo', u.is_active
          )
        ) AS persona,
        json_build_object(
          'id', sec.id_seccional::text,
          'nombre', sec.nom_seccional,
          'codigo', sec.cod_seccional
        ) AS territorial,
        CASE
          WHEN sede.id_sede IS NULL THEN NULL
          ELSE json_build_object(
            'id', sede.id_sede::text,
            'territorialId', sede.id_seccional::text,
            'nombre', sede.nom_sede,
            'codigo', sede.cod_sede
          )
        END AS sede
      FROM academic_work_plan."Docente" d
      LEFT JOIN auth.personas p ON p.id_person = d."personaId"
      LEFT JOIN auth."user" u ON u.id_person = p.id_person
      LEFT JOIN auth.seccionales sec ON sec.id_seccional::text = COALESCE(d."territorialId", p.id_seccional::text)
      LEFT JOIN auth.sedes sede ON sede.id_sede::text = COALESCE(d."sedeId", p.id_sede::text)
      ORDER BY d."ordenListado" ASC NULLS LAST, d."createdAt" DESC
      LIMIT 5000
    `);

    const docenteIds = docentes.map((d) => d.id);
    const ptas = docenteIds.length
      ? await this.ptaRepo.find({
          where: {
            docenteId: In(docenteIds),
            ...(periodo ? { periodo } : {}),
          } as any,
          order: { updatedAt: 'DESC' },
          take: 5000,
        })
      : [];

    const ptasByDocente: Record<string, any[]> = {};
    for (const pta of ptas) {
      ptasByDocente[pta.docenteId] ||= [];
      ptasByDocente[pta.docenteId].push(this.toPtaDto(pta));
    }

    return docentes.map((d: any) => ({
      ...d,
      persona: d.persona
        ? {
            ...d.persona,
            usuario: this.safeUsuario(d.persona.usuario),
          }
        : null,
      territorial: d.territorial ?? null,
      sede: d.sede ?? null,
      ptas: ptasByDocente[d.id] || [],
    }));
  }

  async getOfertaAcademica(_query?: any) {
    return await this.asignaturaRepo.find({
      relations: { programaRel: true },
      order: { nombre: 'ASC' },
      take: 5000,
    });
  }

  async getCatalogoRolesInvestigacion() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.inv_roles) && rules.inv_roles.length > 0) return rules.inv_roles;
    return [
      { id: 'ROL_001', nombre: 'INVESTIGADOR LÍDER DE PROYECTO', horas_max: 400, pct_max: 50 },
      { id: 'ROL_002', nombre: 'COINVESTIGADOR', horas_max: 300, pct_max: 37.5 },
      { id: 'ROL_003', nombre: 'ASISTENTE DE INVESTIGACIÓN NIVEL II', horas_max: 200, pct_max: 25 },
    ];
  }

  async getCatalogoActividadesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (rules?.ext_actividades && typeof rules.ext_actividades === 'object' && Object.keys(rules.ext_actividades).length > 0) {
      return rules.ext_actividades;
    }
    // Fallback: actividades por defecto idénticas a defaultPTARules
    return {
      capacitacion: [
        { id: 'CAP_01', nombre: 'Orientación de Talleres', max_horas: 16 },
        { id: 'CAP_02', nombre: 'Orientación de Seminarios', max_horas: 32 },
        { id: 'CAP_03', nombre: 'Orientación de Cursos', max_horas: 64 },
        { id: 'CAP_04', nombre: 'Orientación de Diplomados', max_horas: 160 },
      ],
      seleccion: [
        { id: 'SEL_01', nombre: 'Revisión de estructuras de prueba — Capacitación', max_horas: 1 },
        { id: 'SEL_02', nombre: 'Revisión de estructuras de prueba — Sesión de validación', max_horas: 2 },
        { id: 'SEL_03', nombre: 'Definición de constructos — Capacitación', max_horas: 1 },
        { id: 'SEL_04', nombre: 'Definición de constructos — Sesión de validación', max_horas: 2 },
        { id: 'SEL_05', nombre: 'Construcción de casos — por caso', max_horas: 4 },
        { id: 'SEL_06', nombre: 'Revisión de casos — por caso', max_horas: 3 },
        { id: 'SEL_07', nombre: 'Validación de casos — por caso', max_horas: 3 },
        { id: 'SEL_08', nombre: 'Construcción/Validación de casos — Capacitación', max_horas: 2 },
        { id: 'SEL_09', nombre: 'Validación de ítems — por ítem', max_horas: 1 },
        { id: 'SEL_10', nombre: 'Análisis validez / Grupos de discusión — Capacitación', max_horas: 1 },
        { id: 'SEL_11', nombre: 'Análisis validez / Grupos de discusión — por semana', max_horas: 2 },
        { id: 'SEL_12', nombre: 'Jurados Tribunales — Capacitación', max_horas: 2 },
        { id: 'SEL_13', nombre: 'Jurados Tribunales — Prueba escrita', max_horas: 3 },
        { id: 'SEL_14', nombre: 'Jurados Tribunales — Prueba oral', max_horas: 4 },
      ],
      fortalecimiento: [
        { id: 'FOR_01', nombre: 'Línea temática con municipios', max_horas: 80 },
        { id: 'FOR_02', nombre: 'Batería de indicadores', max_horas: 80 },
        { id: 'FOR_03', nombre: 'Planeación y desarrollo', max_horas: 40 },
        { id: 'FOR_04', nombre: 'Elaboración de instrumentos', max_horas: 40 },
        { id: 'FOR_05', nombre: 'Análisis y diagnóstico institucional — trabajo de campo', max_horas: 80 },
        { id: 'FOR_06', nombre: 'Análisis y diagnóstico institucional — externo/interno', max_horas: 80 },
        { id: 'FOR_07', nombre: 'Análisis y diagnóstico institucional — producción documento', max_horas: 100 },
        { id: 'FOR_08', nombre: 'Arquitectura institucional', max_horas: 100 },
        { id: 'FOR_09', nombre: 'Elaboración de actos administrativos', max_horas: 40 },
      ],
      laboratorio_innovacion: [
        { id: 'LAB_01', nombre: 'Componente Fijo — Participación en Laboratorio', max_horas: 120 },
        { id: 'LAB_02', nombre: 'Componente Fijo — Gestión administrativa del Laboratorio', max_horas: 100 },
        { id: 'LAB_03', nombre: 'Componente Variable — Diseño e implementación (por actividad)', max_horas: 120 },
      ],
      investigacion_aplicada: [
        { id: 'INV_AP_01', nombre: 'Elaboración de documentos técnicos', max_horas: 60 },
        { id: 'INV_AP_02', nombre: 'Elaboración de Plan de Trabajo', max_horas: 6 },
        { id: 'INV_AP_03', nombre: 'Generación de Nuevo Conocimiento / Desarrollo Tecnológico', max_horas: 60 },
        { id: 'INV_AP_04', nombre: 'Asistencia a eventos de extensión', max_horas: 8 },
        { id: 'INV_AP_05', nombre: 'Procesos de evaluación de desempeño', max_horas: 4 },
      ],
      alto_gobierno: [
        { id: 'EAG_01', nombre: 'Coaching directivo', max_horas: 200 },
        { id: 'EAG_02', nombre: 'Formación estratégica', max_horas: 200 },
        { id: 'EAG_03', nombre: 'Gestión del conocimiento', max_horas: 200 },
        { id: 'EAG_04', nombre: 'Desarrollo de contenidos', max_horas: 120 },
      ],
    };
  }

  async getCatalogoSeccionesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.ext_secciones) && rules.ext_secciones.length > 0) return rules.ext_secciones;
    // Fallback: secciones por defecto idénticas a defaultPTARules
    return [
      { key: 'capacitacion', label: 'Capacitación (SNPI)', color: '#059669', orden: 1, multiplicador: 2 },
      { key: 'seleccion', label: 'Selección (SNPI)', color: '#0284C7', orden: 2, multiplicador: 1 },
      { key: 'fortalecimiento', label: 'Fortalecimiento (SNPI)', color: '#7C3AED', orden: 3, multiplicador: 1 },
      { key: 'laboratorio_innovacion', label: 'Laboratorio de Innovación', color: '#0E7490', orden: 4, multiplicador: 1 },
      { key: 'investigacion_aplicada', label: 'Investigación Aplicada', color: '#15803D', orden: 5, multiplicador: 1 },
      { key: 'alto_gobierno', label: 'Alto Gobierno (EAG)', color: '#B45309', orden: 6, multiplicador: 1 },
    ];
  }

  async getCatalogoActividadesInvestigacion() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.inv_actividades) && rules.inv_actividades.length > 0) {
      return rules.inv_actividades.map((a: any) => ({ ...a, max_horas: a.horas_max }));
    }
    return [];
  }

  async getCatalogoActividadesComplementarias() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.comp_actividades) && rules.comp_actividades.length > 0) return rules.comp_actividades;
    return [];
  }

  async getCatalogoActividadesAcademicoAdmin() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.aadm_actividades) && rules.aadm_actividades.length > 0) return rules.aadm_actividades;
    return [];
  }

  async getEstadisticas(periodo?: string | null) {
    const qb = this.ptaRepo.createQueryBuilder('pta').select(['pta.estado']);
    if (periodo) qb.andWhere('pta.periodo = :periodo', { periodo });
    const ptas = await qb.getMany();

    const total = ptas.length;
    const estadoCounts: Record<string, number> = {};
    for (const p of ptas) {
      const e = (p as any).estado || 'SIN_ESTADO';
      estadoCounts[e] = (estadoCounts[e] || 0) + 1;
    }

    const totalAprobados = (estadoCounts['Aprobado'] || 0) + (estadoCounts['APROBADO'] || 0);
    const totalRechazados = (estadoCounts['Rechazado'] || 0) + (estadoCounts['RECHAZADO'] || 0) + (estadoCounts['Devuelto'] || 0);
    const totalPendientes = total - totalAprobados - totalRechazados;

    const totalDocentes = await this.docenteRepo.count();

    return {
      totalDocentes,
      totalAprobados,
      totalPendientes,
      totalRechazados,
      porPrograma: [],
      porSede: [],
      total,
      estadoCounts,
      periodo: periodo || null,
    };
  }

  // ─────────────────────────────
  // OTP (firma electrónica) — migración legacy
  // ─────────────────────────────
  private resolveNotificationsBaseUrl(): string {
    const direct = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL;
    if (direct) return direct.replace(/\/$/, '');
    if ((process.env.NODE_ENV || 'development') !== 'production') return 'http://localhost:3009';
    return 'http://notifications-service:3009';
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async sendFirmaOtpEmail(input: {
    to: string;
    code: string;
    fullName: string;
    periodo?: string | null;
    etapaLabel?: string | null;
    expiresAt: Date;
  }): Promise<void> {
    const baseUrl = this.resolveNotificationsBaseUrl();
    const subject = 'Código de validación - Plan de Trabajo Académico ESAP';
    const minutes = Math.max(1, Math.round((input.expiresAt.getTime() - Date.now()) / 60000));
    const fullName = this.escapeHtml(input.fullName || 'docente');
    const periodo = input.periodo ? this.escapeHtml(input.periodo) : null;
    const etapaLabel = input.etapaLabel ? this.escapeHtml(input.etapaLabel) : null;
    const code = this.escapeHtml(input.code);
    const text = [
      `Hola ${input.fullName || 'docente'},`,
      '',
      `Tu código de validación para firmar el PTA es: ${input.code}`,
      input.periodo ? `Periodo: ${input.periodo}` : null,
      input.etapaLabel ? `Proceso: ${input.etapaLabel}` : null,
      `Este código vence en ${minutes} minutos.`,
      '',
      'Si no solicitaste este código, ignora este mensaje.',
    ].filter(Boolean).join('\n');
    const html = `
      <div style="margin:0;padding:32px 16px;background-color:#eef2f7;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#111827;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
          <tr>
            <td align="center">
              <table width="560" cellspacing="0" cellpadding="0" border="0" role="presentation" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #dbe3ef;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="height:6px;background-color:#3b82f6;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td style="background-color:#0f49b5;padding:26px 28px 22px 28px;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td>
                          <div style="font-size:21px;font-weight:800;line-height:1;color:#ffffff;letter-spacing:0.2px;">ESAP</div>
                          <div style="margin-top:6px;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#bfdbfe;">Plan de Trabajo Académico</div>
                        </td>
                        <td align="right" style="vertical-align:middle;">
                          <span style="display:inline-block;padding:5px 14px;border-radius:999px;background-color:rgba(255,255,255,0.18);color:#ffffff;font-size:11px;font-weight:700;">Firma PTA</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 28px 10px 28px;">
                    <h1 style="margin:0 0 10px 0;font-size:22px;line-height:1.25;font-weight:800;color:#111827;">Código de validación</h1>
                    <p style="margin:0 0 26px 0;font-size:14px;line-height:1.65;color:#667085;">
                      Hola ${fullName}. Ingresa este código para continuar con la firma de tu Plan de Trabajo Académico. Es de un solo uso y tiene vigencia limitada.
                    </p>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation">
                      <tr>
                        <td align="center">
                          <div style="display:inline-block;min-width:210px;padding:18px 16px;border-radius:9px;border:2px solid #bfdbfe;background-color:#eff6ff;text-align:center;">
                            <span style="font-size:30px;line-height:1;font-weight:800;letter-spacing:10px;color:#1d4ed8;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">${code}</span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="margin-top:24px;margin-bottom:20px;">
                      ${periodo ? `
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Periodo:</strong> ${periodo}
                        </td>
                      </tr>` : ''}
                      ${etapaLabel ? `
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Proceso:</strong> ${etapaLabel}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding:4px 0;font-size:14px;line-height:1.5;color:#374151;">
                          <strong style="color:#111827;">Vigencia:</strong> ${minutes} minutos
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellspacing="0" cellpadding="0" border="0" role="presentation" style="margin:0 0 24px 0;background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;line-height:1.5;color:#92400e;">
                          <strong>Importante:</strong> Si no solicitaste este código, puedes ignorar este mensaje con seguridad.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 18px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                    <p style="margin:0;font-size:12px;line-height:1.5;color:#98a2b3;">ESAP — Escuela Superior de Administración Pública</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;

    try {
      const response = await fetch(`${baseUrl}/api/v1/emails/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: input.to, subject, text, html }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`notifications-service ${response.status}: ${body}`);
      }
    } catch (error: any) {
      const message = error?.message || String(error);
      this.logger.warn(`No se pudo enviar OTP de firma PTA a ${input.to}: ${message}`);
      throw new InternalServerErrorException('No se pudo enviar el código de validación al correo registrado.');
    }
  }

  private buildFirmaOtpKey(input: { verificationId?: string | null; ptaId?: string | null; docenteId?: string | null }): string {
    const verificationId = coalesceString(input.verificationId);
    if (verificationId) return verificationId;

    const ptaId = coalesceString(input.ptaId);
    if (ptaId) return `pta:${ptaId}`;

    const docenteId = coalesceString(input.docenteId);
    if (docenteId) return `docente:${docenteId}`;

    throw new BadRequestException('Se requiere ptaId o docenteId para generar el código de firma.');
  }

  async requestFirmaDocenteOtp(payload: {
    ptaId?: string | null;
    docenteId?: string | null;
    periodo?: string | null;
    etapaLabel?: string | null;
  }) {
    const docenteId = coalesceString(payload?.docenteId);
    if (!docenteId) throw new BadRequestException('docenteId es requerido para enviar el código de firma.');

    const docente = await this.fetchAuthDocenteInfo(docenteId);
    if (!docente.email) {
      throw new BadRequestException('El docente no tiene correo registrado para enviar el código de validación.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const verificationId = this.buildFirmaOtpKey({ ptaId: payload?.ptaId, docenteId });

    this.logger.log(`🔑 [PRUEBAS] Código de firma generado para ${docente.email}: ${code}`);

    try {
      await this.sendFirmaOtpEmail({
        to: docente.email,
        code,
        fullName: docente.fullName,
        periodo: payload?.periodo,
        etapaLabel: payload?.etapaLabel,
        expiresAt,
      });
    } catch (emailError) {
      const isDev = (process.env.NODE_ENV || 'development') !== 'production';
      if (isDev) {
        this.logger.warn(`⚠️  [DEV] Email de firma OTP falló — código OTP para ${docente.email}: ${code}`);
        this.logger.warn(`⚠️  [DEV] Usa este código para firmar en desarrollo local.`);
      } else {
        throw emailError;
      }
    }

    this.otpStore.set(verificationId, { code, expiresAt });

    return {
      verificationId,
      expiresAt: expiresAt.toISOString(),
      email: this.maskEmail(docente.email),
      devCode: code,
    };
  }

  verifyFirmaDocenteOtp(payload: { verificationId?: string | null; code?: string | null }) {
    const verificationId = coalesceString(payload?.verificationId);
    if (!verificationId) throw new BadRequestException('verificationId es requerido.');
    this.verifyOtp(verificationId, String(payload?.code || ''), { consume: true });
    return { verified: true };
  }

  generateOtp(ptaId: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    this.otpStore.set(ptaId, { code, expiresAt });
    // En producción esto debería enviarse por correo/SMS. Por ahora se loguea para dev.
    // eslint-disable-next-line no-console
    console.log(`[OTP][PTA] ${ptaId} → código: ${code} | expira: ${expiresAt.toISOString()}`);
    return { expiresAt: expiresAt.toISOString() };
  }

  verifyOtp(ptaId: string, otp: string, { consume }: { consume: boolean }) {
    if (!otp || String(otp).length !== 6) {
      throw new Error('OTP inválido. Debe tener 6 dígitos.');
    }

    const stored = this.otpStore.get(ptaId);
    if (!stored) {
      throw new Error('No hay código activo para este PTA. Genera uno nuevo.');
    }
    if (new Date() > stored.expiresAt) {
      this.otpStore.delete(ptaId);
      throw new Error('El código expiró (5 min). Genera uno nuevo.');
    }
    if (stored.code !== String(otp)) {
      throw new Error('Código incorrecto. Verifica e intenta de nuevo.');
    }

    if (consume) this.otpStore.delete(ptaId);
    return true;
  }

  async signWithOtp(ptaId: string, payload: { otp: string; nuevoEstado?: string }) {
    this.verifyOtp(ptaId, payload?.otp, { consume: true });

    const existing = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existing) throw new NotFoundException('PTA no encontrado');

    const estadoDestino = coalesceString(payload?.nuevoEstado) || 'Pendiente Jefatura';
    const updated = await this.updatePTAStatus(ptaId, { estado: estadoDestino, actorId: existing.docenteId, actorRol: 'Docente' });

    const certNumber =
      'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString().slice(-4);

    return {
      pta: updated.pta,
      certificado: certNumber,
      signedAt: new Date().toISOString(),
    };
  }

  async getComponentesAprobacion(ptaId: string) {
    const list = await this.ptaComponentApprovalRepo.find({ where: { ptaId } });
    if (list.length === 0) {
      const componentes = [
        'academica',
        'investigacion',
        'ext_capacitacion',
        'ext_procesos',
        'ext_fortalecimiento',
        'ext_gobierno',
        'ext_secciones',
        'complementarias',
        'academicas_admin',
      ];
      const items = componentes.map(comp =>
        this.ptaComponentApprovalRepo.create({
          ptaId,
          componente: comp,
          estado: 'pendiente',
        }),
      );
      await this.ptaComponentApprovalRepo.save(items);
      return items;
    }
    return list;
  }

  async aprobarComponente(ptaId: string, body: any) {
    const componente = coalesceString(body?.componente);
    const estado = coalesceString(body?.estado); // 'aprobado' o 'devuelto'
    if (!componente || !estado) {
      throw new BadRequestException('Componente y estado son requeridos');
    }

    const existingPta = await this.ptaRepo.findOne({ where: { id: ptaId } });
    if (!existingPta) {
      throw new NotFoundException('PTA no encontrado');
    }

    let approval = await this.ptaComponentApprovalRepo.findOne({ where: { ptaId, componente } });
    if (!approval) {
      approval = this.ptaComponentApprovalRepo.create({
        ptaId,
        componente,
        estado: 'pendiente',
      });
    }

    approval.estado = estado;
    approval.aprobadorId = coalesceString(body?.aprobadorId, body?.aprobador_id);
    approval.aprobadorNombre = coalesceString(body?.aprobadorNombre, body?.aprobador_nombre);
    approval.aprobadorRol = coalesceString(body?.aprobadorRol, body?.aprobador_rol);
    approval.comentarios = coalesceString(body?.comentarios, body?.observaciones);
    approval.scope = coalesceString(body?.scope);
    approval.scopeId = coalesceString(body?.scopeId, body?.scope_id);
    approval.fechaAprobacion = new Date();

    await this.ptaComponentApprovalRepo.save(approval);

    // Recalcular estado consolidado del PTA
    const todosComponentes = await this.getComponentesAprobacion(ptaId);
    
    let nuevoEstadoPta = 'PENDIENTE_APROBACION';
    const hayDevueltos = todosComponentes.some(c => c.estado === 'devuelto');
    const todosAprobados = todosComponentes.every(c => c.estado === 'aprobado');

    if (hayDevueltos) {
      nuevoEstadoPta = 'Devuelto'; // que agrupa a revisión docente en Kanban
    } else if (todosAprobados) {
      nuevoEstadoPta = 'Aprobado';
    }

    if (existingPta.estado !== nuevoEstadoPta) {
      const estadoAnterior = existingPta.estado;
      existingPta.estado = nuevoEstadoPta;
      existingPta.version = (existingPta.version || 1) + 1;
      
      if (nuevoEstadoPta === 'Devuelto') {
        existingPta.motivoDevolucion = `Componente ${componente} devuelto: ${approval.comentarios || 'Sin comentarios'}`;
      }

      await this.ptaRepo.save(existingPta);

      // Registrar historial de estados
      await this.historialRepo.save(
        this.historialRepo.create({
          ptaId,
          estadoAnterior,
          estadoNuevo: nuevoEstadoPta,
          actorId: approval.aprobadorId || 'sistema',
          actorRol: approval.aprobadorRol || 'Aprobador',
          tipoAccion: estado === 'aprobado' ? 'APROBACION_COMPONENTE' : 'DEVOLUCION_COMPONENTE',
          comentarios: approval.comentarios,
          snapshotPta: existingPta.datosEstructurados ?? null,
          version: existingPta.version,
        }),
      );

      // Registrar evento realtime
      const ds = existingPta.datosEstructurados as any;
      await this.logEvento({
        ptaId,
        tipo: 'cambio_estado',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior,
        estadoNuevo: nuevoEstadoPta,
        actor: approval.aprobadorId,
        actorRol: approval.aprobadorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Componente ${componente} ${estado}. Estado general: ${nuevoEstadoPta}`,
        metadata: { componente, estado, comentarios: approval.comentarios },
      });
    } else {
      // Registrar evento de actualización de componente sin cambiar estado global
      const ds = existingPta.datosEstructurados as any;
      await this.logEvento({
        ptaId,
        tipo: 'actualizacion_componente',
        docenteId: existingPta.docenteId,
        docenteNombre: coalesceString(ds?.docente_nombre),
        estadoAnterior: existingPta.estado,
        estadoNuevo: existingPta.estado,
        actor: approval.aprobadorId,
        actorRol: approval.aprobadorRol,
        sistemaOrigen: 'backoffice',
        mensaje: `Componente ${componente} actualizado a ${estado}`,
        metadata: { componente, estado, comentarios: approval.comentarios },
      });
    }

    return {
      approval,
      estadoGeneral: nuevoEstadoPta,
    };
  }

  async getRUNDDocente(docenteId: string) {
    let docente = await this.docenteRepo.findOne({
      where: [{ id: docenteId }, { personaId: docenteId }]
    });

    if (!docente) {
      try {
        const info = await this.fetchAuthDocenteInfo(docenteId, { adminEdit: true });
        if (info && info.personId) {
          docente = await this.docenteRepo.findOne({
            where: [{ id: info.personId }, { personaId: info.personId }]
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    const valRows = await this.ptaRepo.manager.query(
      `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
      [docente.id]
    );

    if (valRows.length === 0) {
      const camposSoporte = [
        { campo: 'DOCUMENTO_IDENTIDAD', tipo: 'IDENTIDAD' },
        { campo: 'TIPO_DOCUMENTO', tipo: 'IDENTIDAD' },
        { campo: 'NOMBRE_COMPLETO', tipo: 'IDENTIDAD' },
        { campo: 'FECHA_NACIMIENTO', tipo: 'IDENTIDAD' },
        { campo: 'GENERO', tipo: 'IDENTIDAD' },
        { campo: 'CORREO_INSTITUCIONAL', tipo: 'CONTACTO' },
        { campo: 'VINCULACION', tipo: 'VINCULACION' },
        { campo: 'TERRITORIAL', tipo: 'VINCULACION' },
        { campo: 'DEDICACION', tipo: 'VINCULACION' },
        { campo: 'CATEGORIA_ESCALAFON', tipo: 'ESCALAFON' },
        { campo: 'INICIO_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'FIN_VINCULACION', tipo: 'VINCULACION' },
        { campo: 'ACTO_ADMINISTRATIVO', tipo: 'VINCULACION' },
        { campo: 'PUNTAJE_SALARIAL', tipo: 'ESCALAFON' },
        { campo: 'SITUACION_ADMINISTRATIVA', tipo: 'SITUACION' },
        { campo: 'NIVEL_FORMACION', tipo: 'FORMACION' },
        { campo: 'TITULO_PREGRADO', tipo: 'FORMACION' },
        { campo: 'TITULO_ESPECIALIZACION', tipo: 'FORMACION' },
        { campo: 'TITULO_MAESTRIA', tipo: 'FORMACION' },
        { campo: 'TITULO_DOCTORADO', tipo: 'FORMACION' },
        { campo: 'TITULO_POSDOCTORADO', tipo: 'FORMACION' },
        { campo: 'NUCLEO_TEMATICO', tipo: 'VINCULACION' },
        { campo: 'PERFIL_ACADEMICO', tipo: 'FORMACION' },
        { campo: 'ULTIMA_EVALUACION', tipo: 'EVALUACION' }
      ];

      for (const item of camposSoporte) {
        await this.ptaRepo.manager.query(
          `INSERT INTO academic_work_plan.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo]
        );
      }

      const reQuery = await this.ptaRepo.manager.query(
        `SELECT * FROM academic_work_plan.validacion_documental WHERE docente_id = $1`,
        [docente.id]
      );
      valRows.push(...reQuery);
    }

    const total = valRows.length;
    const aceptados = valRows.filter((r: any) => r.estado_documento === 'Aceptado').length;
    const completitud = total > 0 ? Math.round((aceptados / total) * 100) : 0;

    return {
      docenteId: docente.id,
      personaId: docente.personaId,
      completitud,
      validaciones: valRows.map((r: any) => ({
        id: r.id,
        campo_rund: r.campo_rund,
        tipo_documento_soporte: r.tipo_documento_soporte,
        estado_documento: r.estado_documento,
        fecha_carga: r.fecha_carga,
        fecha_validacion: r.fecha_validacion,
        validado_por: r.validado_por,
        observacion: r.observacion
      }))
    };
  }

  async syncRUNDDocuments(docenteId: string, documentos: any[]) {
    let docente = await this.docenteRepo.findOne({
      where: [{ id: docenteId }, { personaId: docenteId }]
    });

    if (!docente) {
      try {
        const info = await this.fetchAuthDocenteInfo(docenteId, { adminEdit: true });
        if (info && info.personId) {
          docente = await this.docenteRepo.findOne({
            where: [{ id: info.personId }, { personaId: info.personId }]
          });
        }
      } catch (err) {
        // ignore
      }
    }

    if (!docente) {
      throw new NotFoundException(`Docente ${docenteId} no encontrado`);
    }

    await this.getRUNDDocente(docente.id);

    const catMap: Record<string, string> = {
      personal: 'IDENTIDAD',
      contacto: 'CONTACTO',
      academico: 'FORMACION',
      formacion: 'FORMACION',
      laboral: 'VINCULACION',
      vinculacion: 'VINCULACION',
      certificados: 'ESCALAFON',
      escalafon: 'ESCALAFON',
      administrativo: 'SITUACION',
      situacion: 'SITUACION',
      otros: 'EVALUACION',
      evaluacion: 'EVALUACION'
    };

    const stateMap: Record<string, string> = {
      validado: 'Aceptado',
      aprobado: 'Aceptado',
      aceptado: 'Aceptado',
      pendiente: 'Pendiente',
      rechazado: 'Rechazado',
      vencido: 'Rechazado',
      'sin cargar': 'Sin cargar',
      'no aplica': 'No aplica'
    };

    for (const doc of documentos) {
      const cat = String(doc.categoria || '').toLowerCase().trim();
      const rawState = String(doc.estado || '').toLowerCase().trim();
      const targetSupportType = catMap[cat];
      const targetState = stateMap[rawState] || 'Sin cargar';

      if (targetSupportType) {
        await this.ptaRepo.manager.query(
          `UPDATE academic_work_plan.validacion_documental
           SET estado_documento = $1,
               id_documento_carpeta = $2,
               fecha_carga = COALESCE($3, fecha_carga),
               fecha_validacion = COALESCE($4, fecha_validacion),
               validado_por = COALESCE($5, validado_por),
               observacion = COALESCE($6, observacion),
               updated_at = now()
           WHERE docente_id = $7 AND tipo_documento_soporte = $8`,
          [
            targetState,
            doc.id || null,
            doc.fecha_subida || new Date().toISOString(),
            doc.fecha_validacion || (targetState === 'Aceptado' ? new Date().toISOString() : null),
            doc.validado_por || null,
            doc.comentarios || null,
            docente.id,
            targetSupportType
          ]
        );
      }
    }

    return this.getRUNDDocente(docente.id);
  }
}
