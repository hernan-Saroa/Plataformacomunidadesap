import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
  ) {}

  private safeUsuario(usuario: any) {
    if (!usuario || typeof usuario !== 'object') return null;
    const { password: _pw, ...rest } = usuario as any;
    return rest;
  }

  private async hasColumn(schema: string, table: string, column: string): Promise<boolean> {
    const rows = await this.ptaRepo.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name = $2
         AND column_name = $3
       LIMIT 1`,
      [schema, table, column],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  private async fetchAuthDocenteInfo(docenteKey: string): Promise<{ personId: string, email: string | null, fullName: string }> {
    const key = coalesceString(docenteKey);
    if (!key) throw new BadRequestException('docente_id es requerido');

    const personasHasIdPerson = await this.hasColumn('auth', 'personas', 'id_person');
    const personasHasIdTercero = await this.hasColumn('auth', 'personas', 'id_tercero');
    const userHasIdPerson = await this.hasColumn('auth', 'user', 'id_person');
    const userHasIdTercero = await this.hasColumn('auth', 'user', 'id_tercero');

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

    const sql = `
      SELECT
        ${personasHasIdPerson ? 'p.id_person::text' : 'NULL'} as person_id,
        ${personasHasIdTercero ? 'p.id_tercero::text' : 'NULL'} as tercero_id,
        p.dir_email as email,
        p.nom_tercero as primer_nombre, 
        p.seg_nombre as segundo_nombre, 
        p.pri_apellido as primer_apellido, 
        p.seg_apellido as segundo_apellido
      FROM auth.personas p
      JOIN auth."user" u ON ${joinUserPersonas}
      JOIN auth.user_roles ur ON ur.id_user = u.id_user AND COALESCE(ur.is_active, true) = true
      JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, true) = true
      WHERE r.code = 'DOCENTE'
        AND (${keyPredicates.join(' OR ')})
      LIMIT 1
    `;

    const rows = await this.ptaRepo.query(sql, [key]);
    const authRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!authRow) {
      throw new BadRequestException('La persona no tiene el rol DOCENTE (auth.role.code) o no existe en auth.personas.');
    }

    const personId = coalesceString(authRow.person_id, authRow.tercero_id) || key;
    const email = coalesceString(authRow.email);
    const fullName = [
      authRow.primer_nombre,
      authRow.segundo_nombre,
      authRow.primer_apellido,
      authRow.segundo_apellido,
    ].filter(Boolean).join(' ') || 'Docente ESAP';

    return { personId, email, fullName };
  }

  private async resolveDocenteCompleto(docenteKey: string, options?: { fallbackTerritorial?: string }): Promise<{ personId: string, email: string | null, fullName: string }> {
    const { personId, email, fullName } = await this.fetchAuthDocenteInfo(docenteKey);

    // Mapear a academic_work_plan."Docente" (para mantener compatibilidad con FK de PTA).
    const byId = await this.docenteRepo.findOne({ where: { id: personId } as any });
    if (byId) return { personId: byId.id, email, fullName };

    const byPersonaId = await this.docenteRepo.findOne({ where: { personaId: personId } as any });
    if (byPersonaId) return { personId: byPersonaId.id, email, fullName };

    if (email) {
      const byCorreo = await this.docenteRepo.findOne({ where: { correoInstitucional: email } as any });
      if (byCorreo) return { personId: byCorreo.id, email, fullName };
    }

    // Si no existe, auto-aprovisionamos el docente para no violar la FK al guardar el PTA
    const fallbackTerritorial = options?.fallbackTerritorial || (await this.ptaRepo.manager.query(`SELECT id FROM academic_work_plan."Territorial" LIMIT 1`))?.[0]?.id;

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

  private async resolveDocenteId(docenteKey: string, options?: { fallbackTerritorial?: string }): Promise<string> {
    const res = await this.resolveDocenteCompleto(docenteKey, options);
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
    const { personId: docenteId, fullName: dbName } = await this.resolveDocenteCompleto(docenteKey || '', { fallbackTerritorial });
    
    // Enrich identity if missing
    if (!input.docente_nombre) {
      input.docente_nombre = dbName;
    }

    const periodo = coalesceString(input?.periodo) || '2026-1';
    let estado = coalesceString(input?.estado) || 'BORRADOR';
    
    // Normalize state case
    if (estado.toLowerCase() === 'borrador') estado = 'Borrador';
    const isAdminEdit = Boolean(input?._adminEdit);

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

    // ── Lógica multi-jefatura territorial ──────────────────────────────────────
    const a = accion?.toLowerCase() || '';
    if (existing.estado === 'Pendiente Jefatura' && (a === 'aprobar' || a === 'devolver')) {
      const aprobaciones = await this.aprobacionJefaturaRepo.find({ where: { ptaId } });

      if (aprobaciones.length > 0) {
        const actorId = coalesceString(body?.actorId, body?.actor_id);
        const isSuperUser = !!body?.isSuperUser;
        const observaciones = coalesceString(body?.observaciones, body?.comentarios);
        const hayCambios = body?.camposModificados && Object.keys(body.camposModificados).length > 0;

        // Resolver territorialId del actor (buscar en Docente)
        let actorTerritorialId: string | null = null;
        if (body?.actorTerritorialId && !String(body.actorTerritorialId).startsWith('ter-')) {
          actorTerritorialId = body.actorTerritorialId;
        }
        if (!actorTerritorialId && actorId) {
          const docenteRow = await this.docenteRepo.findOne({ where: { id: actorId } as any });
          if ((docenteRow as any)?.territorialId) actorTerritorialId = (docenteRow as any).territorialId;
        }
        if (!actorTerritorialId && actorId) {
          const prevAprobacion = aprobaciones.find(ap => ap.jefaturaUserId === actorId);
          if (prevAprobacion) actorTerritorialId = prevAprobacion.territorialId;
        }

        if (a === 'devolver') {
          // Una devolución devuelve todas las aprobaciones
          const toUpdate = actorTerritorialId
            ? aprobaciones.filter(ap => ap.territorialId === actorTerritorialId)
            : aprobaciones;
          for (const ap of toUpdate) {
            await this.aprobacionJefaturaRepo.save({ ...ap, decision: 'devuelto', jefaturaUserId: actorId || '', comentarios: observaciones });
          }
          nuevoEstado = 'REVISION_DOCENTE_N1';
        } else {
          // aprobar
          const decision = hayCambios ? 'aprobado_con_cambios' : 'aprobado';
          if (isSuperUser && !actorTerritorialId) {
            // Super admin sin territorial → aprueba todas las pendientes
            for (const ap of aprobaciones.filter(x => x.decision === 'pendiente')) {
              await this.aprobacionJefaturaRepo.save({ ...ap, decision, jefaturaUserId: actorId || '', comentarios: observaciones || 'Aprobado por Super Admin' });
            }
          } else if (actorTerritorialId) {
            const apRow = aprobaciones.find(ap => ap.territorialId === actorTerritorialId && ap.decision === 'pendiente');
            if (apRow) await this.aprobacionJefaturaRepo.save({ ...apRow, decision, jefaturaUserId: actorId || '', comentarios: observaciones });
          } else {
            // Fallback: aprobar el primero pendiente sin jefatura asignada
            const primero = aprobaciones.find(ap => ap.decision === 'pendiente' && !ap.jefaturaUserId);
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
      const territorial = await this.territorialRepo.findOne({ where: { id: tId } as any });
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
    const where = !completo && programaId ? { programaId } : {};
    const rows = await this.asignaturaRepo.find({
      where,
      relations: { programa: true },
      order: { nombre: 'ASC' },
      take: 5000,
    });

    return rows.map((a: any) => ({
      ...a,
      nucleo: a.nucleoTematico || 'General',
      programa_id: a.programaId,
    }));
  }

  async getCatalogoTerritoriales() {
    return await this.territorialRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.sedes', 's')
      .orderBy('t.nombre', 'ASC')
      .addOrderBy('s.nombre', 'ASC')
      .getMany();
  }

  async getCatalogoCetaps(query?: any) {
    const territorialId = coalesceString(query?.territorial_id, query?.territorialId);
    const where = territorialId ? { territorialId } : {};
    return await this.sedeRepo.find({ where, order: { nombre: 'ASC' } });
  }

  async getDocentesDisponibles(query?: any) {
    const periodo = coalesceString(query?.periodo);
    const docentes = await this.docenteRepo.find({
      relations: { persona: { usuario: true }, territorial: true, sede: true },
      order: { ordenListado: 'ASC' as any, createdAt: 'DESC' as any },
      take: 5000,
    });

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
      relations: { programa: true },
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
    if (rules?.ext_actividades && typeof rules.ext_actividades === 'object') return rules.ext_actividades;
    return {};
  }

  async getCatalogoSeccionesExtension() {
    const rules = (await this.getConfiguracionPTAGlobal()) as any;
    if (Array.isArray(rules?.ext_secciones) && rules.ext_secciones.length > 0) return rules.ext_secciones;
    return [];
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
}
