import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { PlanTrabajoAcademicoEntity } from '../entities/plan-trabajo-academico.entity';
import { DocenteEntity } from '../entities/docente.entity';
import { PersonaEntity } from '../entities/persona.entity';
import { ProgramaEntity } from '../entities/programa.entity';
import { RundAccesoExternoEntity } from '../entities/rund-acceso-externo.entity';
import { RundMacroDocenteConsultaLogEntity } from '../entities/rund-macro-docente-consulta-log.entity';
import { PtaNotificationsService } from '../notifications/pta-notifications.service';

/** Ruta pública (a través del API Gateway) del endpoint de consulta externa. */
const RUTA_PUBLICA_MACRO_DOCENTE = '/pta/api/v1/pta/macro-docente';

/**
 * REQ-RUND-F020 — Estados de PTA que se consideran "escritura firme": un
 * borrador aún puede cambiar, así que el Macro Docente (historial oficial)
 * solo debe reflejar asignaturas de PTAs que ya pasaron el flujo de
 * aprobación. Misma lista que ESTADOS_PTA_RESTAURABLES_EDICION en
 * pta.service.ts (no se reexporta desde ahí para no acoplar los módulos).
 */
const ESTADOS_PTA_FIRMES = [
  'APROBADO',
  'APROBADO_DEF',
  'EN_FIRME',
  'RADICADO',
  'EN_EJECUCION',
  'FINALIZADO',
  'TERMINADO',
];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface MacroDocenteFilters {
  docenteId?: string;
  periodo?: string;
  territorial?: string;
  cetap?: string;
  programa?: string;
  nucleoTematico?: string;
  page?: number;
  limit?: number;
}

export interface HistorialAsignaturaRow {
  docente_id: string;
  docente_nombre: string | null;
  documento_identidad: string | null;
  periodo: string;
  territorial: string | null;
  cetap: string | null;
  programa: string | null;
  nucleo_tematico: string | null;
  asignatura_codigo: string | null;
  asignatura_nombre: string | null;
  horas: number | null;
}

function coalesceString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

const DIACRITICS_REGEX = new RegExp(String.fromCharCode(0x5b, 0x300, 0x2d, 0x36f, 0x5d), 'g');

function normalizeForCompare(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .trim()
    .toUpperCase();
}

@Injectable()
export class MacroDocenteService {
  private readonly logger = new Logger(MacroDocenteService.name);

  constructor(
    @InjectRepository(PlanTrabajoAcademicoEntity)
    private readonly ptaRepo: Repository<PlanTrabajoAcademicoEntity>,
    @InjectRepository(DocenteEntity)
    private readonly docenteRepo: Repository<DocenteEntity>,
    @InjectRepository(PersonaEntity)
    private readonly personaRepo: Repository<PersonaEntity>,
    @InjectRepository(ProgramaEntity)
    private readonly programaRepo: Repository<ProgramaEntity>,
    @InjectRepository(RundAccesoExternoEntity)
    private readonly accesoExternoRepo: Repository<RundAccesoExternoEntity>,
    @InjectRepository(RundMacroDocenteConsultaLogEntity)
    private readonly consultaLogRepo: Repository<RundMacroDocenteConsultaLogEntity>,
    private readonly notifications: PtaNotificationsService,
  ) {}

  /**
   * REQ-RUND-F020 — Historial nacional de asignaturas dictadas por docente,
   * filtrable por período/territorial/CETAP/programa/núcleo temático.
   *
   * Requiere docenteId y/o periodo: son los únicos filtros que aprovechan
   * los índices existentes de PlanTrabajoAcademico (idx_pta_docente_periodo,
   * idx_pta_estado_periodo). Sin ninguno de los dos habría que recorrer el
   * histórico completo (>72.990 registros) en cada consulta.
   */
  async getHistorial(filters: MacroDocenteFilters): Promise<{
    items: HistorialAsignaturaRow[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    if (!filters.docenteId && !filters.periodo) {
      throw new BadRequestException(
        'Para consultar el Macro Docente indique al menos un docente o un período académico.',
      );
    }

    const rows = await this.buildHistorialRows(filters);

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit || DEFAULT_LIMIT));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit);

    return { items, total, page, limit, pages };
  }

  /**
   * REQ-RUND-F022 — Consulta puntual: "¿qué dictó el docente X en el
   * período Y?". Sin paginar: el universo (un docente, un período) es
   * naturalmente pequeño.
   */
  async getConsultaPuntual(docenteId: string, periodo: string): Promise<HistorialAsignaturaRow[]> {
    if (!docenteId || !periodo) {
      throw new BadRequestException('La consulta puntual requiere docenteId y período.');
    }
    return this.buildHistorialRows({ docenteId, periodo });
  }

  private async buildHistorialRows(filters: MacroDocenteFilters): Promise<HistorialAsignaturaRow[]> {
    const qb = this.ptaRepo
      .createQueryBuilder('pta')
      .where('pta.estado IN (:...estados)', { estados: ESTADOS_PTA_FIRMES });
    if (filters.periodo) qb.andWhere('pta.periodo = :periodo', { periodo: filters.periodo });
    if (filters.docenteId) qb.andWhere('pta.docenteId = :docenteId', { docenteId: filters.docenteId });
    qb.orderBy('pta.periodo', 'DESC');

    const ptas = await qb.getMany();
    if (ptas.length === 0) return [];

    const docenteIds = [...new Set(ptas.map((p) => p.docenteId).filter(Boolean))];
    const docentes = docenteIds.length
      ? await this.docenteRepo.find({ where: { id: In(docenteIds) } })
      : [];
    const personaIds = [...new Set(docentes.map((d) => d.personaId).filter(Boolean))];
    const personas = personaIds.length
      ? await this.personaRepo.find({ where: { id: In(personaIds) } })
      : [];
    const personaMap = new Map(personas.map((p) => [p.id, p]));

    const docenteMap = new Map<
      string,
      { nombreCompleto: string | null; documento: string | null; nucleoTematico: string | null }
    >();
    for (const docente of docentes) {
      const persona = personaMap.get(docente.personaId);
      const nombreCompleto = coalesceString(
        [persona?.primer_nombre, persona?.segundo_nombre, persona?.primer_apellido, persona?.segundo_apellido]
          .filter(Boolean)
          .join(' '),
      );
      docenteMap.set(docente.id, {
        nombreCompleto,
        documento: coalesceString(persona?.identificacion),
        nucleoTematico: coalesceString(docente.nucleoTematico),
      });
    }

    // Resolución de programa por id solo quedan como respaldo cuando el PTA
    // no trae el nombre embebido (PTAs legacy). Territorial/CETAP se toman
    // tal cual vienen en el JSON: sus catálogos de id no son unívocos entre
    // el módulo PTA y auth (ver auth.sedes vs academic_work_plan.cetap), así
    // que resolverlos aquí arriesgaría mostrar un nombre equivocado.
    const programaIdsPendientes = new Set<string>();
    for (const pta of ptas) {
      const asignaturas = Array.isArray(pta.datosEstructurados?.asignaturas)
        ? pta.datosEstructurados.asignaturas
        : [];
      for (const asig of asignaturas) {
        const tieneNombre = coalesceString(asig?.programa_nombre_completo, asig?.programa_nombre, asig?.programa?.nombre);
        const programaId = coalesceString(asig?.programa_id, asig?.programaId, asig?.programa?.id);
        if (!tieneNombre && programaId) programaIdsPendientes.add(programaId);
      }
    }
    const programaMap = new Map<string, string>();
    if (programaIdsPendientes.size > 0) {
      const programas = await this.programaRepo.find({ where: { id: In([...programaIdsPendientes]) } });
      for (const programa of programas) programaMap.set(String(programa.id), programa.nombre);
    }

    const rows: HistorialAsignaturaRow[] = [];
    for (const pta of ptas) {
      const docenteInfo = docenteMap.get(pta.docenteId);
      const asignaturas = Array.isArray(pta.datosEstructurados?.asignaturas)
        ? pta.datosEstructurados.asignaturas
        : [];
      for (const asig of asignaturas) {
        const programaId = coalesceString(asig?.programa_id, asig?.programaId, asig?.programa?.id);
        rows.push({
          docente_id: pta.docenteId,
          docente_nombre: docenteInfo?.nombreCompleto || null,
          documento_identidad: docenteInfo?.documento || null,
          periodo: pta.periodo,
          territorial: coalesceString(asig?.territorial_nombre, asig?.territorial?.nombre),
          cetap: coalesceString(asig?.cetap_nombre, asig?.sede_nombre, asig?.cetap?.nombre, asig?.sede?.nombre),
          programa: coalesceString(asig?.programa_nombre_completo, asig?.programa_nombre, asig?.programa?.nombre)
            || (programaId ? programaMap.get(programaId) || null : null),
          nucleo_tematico: docenteInfo?.nucleoTematico || null,
          asignatura_codigo: coalesceString(asig?.codigo, asig?.asignatura_codigo, asig?.codigoAsignatura),
          asignatura_nombre: coalesceString(asig?.nombre, asig?.asignatura_nombre, asig?.nombreAsignatura),
          horas: Number.isFinite(Number(asig?.horas ?? asig?.horasClase ?? asig?.horas_clase))
            ? Number(asig?.horas ?? asig?.horasClase ?? asig?.horas_clase)
            : null,
        });
      }
    }

    return this.applyPostFilters(rows, filters);
  }

  private applyPostFilters(rows: HistorialAsignaturaRow[], filters: MacroDocenteFilters): HistorialAsignaturaRow[] {
    const territorial = normalizeForCompare(filters.territorial);
    const cetap = normalizeForCompare(filters.cetap);
    const programa = normalizeForCompare(filters.programa);
    const nucleoTematico = normalizeForCompare(filters.nucleoTematico);

    return rows.filter((row) => {
      if (territorial && normalizeForCompare(row.territorial) !== territorial) return false;
      if (cetap && normalizeForCompare(row.cetap) !== cetap) return false;
      if (programa && normalizeForCompare(row.programa) !== programa) return false;
      if (nucleoTematico && normalizeForCompare(row.nucleo_tematico) !== nucleoTematico) return false;
      return true;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // REQ-RUND-F022 — Acceso externo temporal y controlado
  // ═══════════════════════════════════════════════════════════════

  async crearAccesoExterno(dto: {
    enteNombre: string;
    enteContacto?: string;
    docenteId: string;
    motivo?: string;
    fechaInicio: string;
    fechaFin: string;
  }, otorgadoPor: string): Promise<RundAccesoExternoEntity> {
    if (!dto.enteNombre?.trim()) throw new BadRequestException('El nombre del ente externo es obligatorio.');
    // Cada acceso se limita siempre a un docente puntual (F022): si un ente
    // necesita consultar varios docentes, se le otorgan varios accesos. Evita
    // dejar abierto por accidente todo el histórico nacional a un tercero.
    if (!dto.docenteId?.trim()) {
      throw new BadRequestException('Debe seleccionar el docente al que aplica este acceso externo.');
    }
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);
    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      throw new BadRequestException('Fecha de inicio/fin inválida.');
    }
    if (fechaFin <= fechaInicio) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio.');
    }

    const acceso = this.accesoExternoRepo.create({
      enteNombre: dto.enteNombre.trim(),
      enteContacto: dto.enteContacto?.trim() || null,
      docenteId: dto.docenteId.trim(),
      motivo: dto.motivo?.trim() || null,
      fechaInicio,
      fechaFin,
      activo: true,
      otorgadoPor,
      token: randomUUID(),
    });
    const saved = await this.accesoExternoRepo.save(acceso);
    await this.logConsulta({
      tipoConsulta: 'OTORGAR_ACCESO_EXTERNO',
      actorId: otorgadoPor,
      accesoExternoId: saved.id,
      docenteId: saved.docenteId,
      filtros: { enteNombre: saved.enteNombre, fechaInicio: saved.fechaInicio, fechaFin: saved.fechaFin },
      failClosed: false,
    });

    // Best-effort: si no hay contacto con forma de correo, o notifications-service
    // no responde, esto nunca lanza — el enlace queda disponible para copiar
    // manualmente desde la UI de todos modos.
    this.notifications
      .notifyAccesoExternoOtorgado({
        enteNombre: saved.enteNombre,
        enteContacto: saved.enteContacto,
        path: `${RUTA_PUBLICA_MACRO_DOCENTE}/externo/${saved.token}`,
        fechaFin: saved.fechaFin,
      })
      .catch((error: any) => this.logger.warn(`No se pudo notificar el acceso externo por correo: ${error?.message}`));

    return saved;
  }

  async revocarAccesoExterno(id: string, actorId: string): Promise<RundAccesoExternoEntity> {
    const acceso = await this.accesoExternoRepo.findOne({ where: { id } });
    if (!acceso) throw new BadRequestException('El acceso externo indicado no existe.');
    acceso.activo = false;
    acceso.revokedAt = new Date();
    acceso.revokedBy = actorId;
    const saved = await this.accesoExternoRepo.save(acceso);
    await this.logConsulta({
      tipoConsulta: 'REVOCAR_ACCESO_EXTERNO',
      actorId,
      accesoExternoId: saved.id,
      docenteId: saved.docenteId,
      failClosed: false,
    });
    return saved;
  }

  async listarAccesosExternos(): Promise<RundAccesoExternoEntity[]> {
    return this.accesoExternoRepo.find({ order: { createdAt: 'DESC' } });
  }

  async listarBitacora(limit = 100): Promise<RundMacroDocenteConsultaLogEntity[]> {
    return this.consultaLogRepo.find({ order: { createdAt: 'DESC' }, take: Math.min(500, Math.max(1, limit)) });
  }

  /** Valida vigencia (activo + dentro de fecha_inicio/fecha_fin). Lanza si no es válido. */
  async validarAccesoExterno(token: string): Promise<RundAccesoExternoEntity> {
    const acceso = await this.accesoExternoRepo.findOne({ where: { token } });
    if (!acceso) throw new ForbiddenException('Enlace de acceso externo inválido.');
    if (!acceso.activo) throw new ForbiddenException('Este acceso externo fue revocado.');
    const now = new Date();
    if (now < acceso.fechaInicio || now > acceso.fechaFin) {
      throw new ForbiddenException('Este acceso externo está fuera de su período de vigencia.');
    }
    return acceso;
  }

  /** El acceso externo siempre está acotado a un único docente (ver crearAccesoExterno). */
  async getHistorialParaAccesoExterno(
    acceso: RundAccesoExternoEntity,
    filters: MacroDocenteFilters,
  ) {
    return this.getHistorial({ ...filters, docenteId: acceso.docenteId });
  }

  /**
   * Registra en RundMacroDocenteConsultaLog quién consultó el Macro Docente,
   * con qué filtros y cuántos resultados obtuvo (BR análoga a BR-056, pero
   * a nivel de reporte en lugar de a nivel de un solo docente).
   *
   * Las consultas de entes externos fallan cerrado: si no se puede dejar
   * registro de auditoría, no se entregan datos. Las consultas internas
   * (ya autenticadas y validadas por rol) son tolerantes a fallos del log,
   * igual que el resto de logAudit operativo del RUND.
   */
  async logConsulta(entry: {
    tipoConsulta: string;
    actorId: string;
    roles?: string[];
    accesoExternoId?: string | null;
    docenteId?: string | null;
    periodo?: string | null;
    filtros?: Record<string, any> | null;
    totalResultados?: number | null;
    ip?: string;
    failClosed: boolean;
  }): Promise<void> {
    try {
      const log = this.consultaLogRepo.create({
        tipoConsulta: entry.tipoConsulta,
        actorId: entry.actorId,
        roles: entry.roles || null,
        accesoExternoId: entry.accesoExternoId || null,
        docenteId: entry.docenteId || null,
        periodo: entry.periodo || null,
        filtros: entry.filtros || null,
        totalResultados: entry.totalResultados ?? null,
        ip: entry.ip || null,
      });
      await this.consultaLogRepo.save(log);
    } catch (e: any) {
      this.logger.warn(`[MACRO_DOCENTE_AUDIT] Failed to write log: ${e.message}`);
      if (entry.failClosed) {
        throw new ForbiddenException('No fue posible registrar la auditoría de esta consulta; inténtelo de nuevo.');
      }
    }
  }
}
