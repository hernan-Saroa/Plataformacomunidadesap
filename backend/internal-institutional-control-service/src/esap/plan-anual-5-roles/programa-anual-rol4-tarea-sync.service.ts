/**
 * Tareas de seguimiento del Rol 4 (actividad "Efectuar auditorías…") a partir
 * del Programa Anual de Auditoría de la vigencia (EFDS-2133).
 *
 * El Rol 4 hace seguimiento a lo que se programó, no a todo lo que el Universo
 * Auditable deja auditar: por eso la fuente son las auditorías del Programa
 * Anual (las mismas filas que imprime el PAI_<año>_V<n>.xlsx) y no las
 * evaluaciones priorizadas del universo. La sincronización corre cada vez que
 * se consulta el plan, así lo que se programe, modifique, archive o saque del
 * programa se ve en el Rol 4 sin depender de qué pantalla hizo el cambio.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  cortesComoPeriodos,
  cortesPorDefecto,
  frecuenciaDeLaActividad,
  fuenteDeLaTarea,
  tareasDeLaFuentePorCorte,
  tieneSeguimientoRegistrado,
  type FrecuenciaCortes,
} from './rol4-tareas-por-corte';

export { cortesComoPeriodos, corteDeLaAuditoria, type CortePeriodo } from './rol4-tareas-por-corte';

/** Tareas que genera el Programa Anual en la actividad de auditorías del Rol 4. */
export const ORIGEN_TAREA_PROGRAMA_ANUAL = 'programa_anual';

/**
 * Tareas que antes se generaban por cada evaluación priorizada del Universo
 * Auditable. Ya no se crean y se retiran al sincronizar.
 */
const ORIGEN_TAREA_EVALUACION_UNIVERSO = 'evaluacion_universo';

/**
 * Al guardar el plan desde el wizard las tareas pierden el campo `origen`, así que
 * también se reconocen por el prefijo del id con que las crea cada sincronización.
 */
const esTareaDelPrograma = (t: TareaSeguimientoPlan) =>
  t.origen === ORIGEN_TAREA_PROGRAMA_ANUAL || String(t.id ?? '').startsWith('tarea-aud-');
/** Tareas que crea PlanMejoramientoRol4TareaSyncService en la actividad de planes de mejoramiento. */
const ORIGEN_TAREA_PLAN_MEJORAMIENTO = 'plan_mejoramiento';
const esTareaDePlanMejoramiento = (t: TareaSeguimientoPlan) =>
  t.origen === ORIGEN_TAREA_PLAN_MEJORAMIENTO || String(t.id ?? '').startsWith('tarea-pm-');

interface ActividadRol4 {
  id: string;
  tareas_seguimiento: unknown;
  puntos_control: unknown;
  control: string | null;
  frecuencia_puntos_control: string | null;
}

const esTareaDelUniverso = (t: TareaSeguimientoPlan) =>
  t.origen === ORIGEN_TAREA_EVALUACION_UNIVERSO || String(t.id ?? '').startsWith('tarea-ev-');

export interface TareaSeguimientoPlan {
  id: string;
  descripcion: string;
  completada: boolean;
  responsables?: Array<{ id: string; nombre: string; cargo?: string }>;
  /** Responsable que puso la sincronización, tomado de la auditoría */
  responsablesAuditoria?: Array<{ id: string; nombre: string }>;
  fechaInicio?: string;
  fechaLimite?: string;
  fechaCompletada?: string;
  completadaPor?: string;
  origen?: string;
  evaluacionProcesoId?: string;
  procesoId?: string;
  planMejoramientoId?: string;
  auditoriaId?: string;
  areaResponsable?: string;
  [key: string]: unknown;
}

interface AuditoriaProgramada {
  id: string;
  codigo: string | null;
  nombre: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  /** Quien responde por la auditoría: el auditor líder, o el asignado si no hay líder */
  responsable_id: string | null;
  responsable_nombre: string | null;
}

@Injectable()
export class ProgramaAnualRol4TareaSyncService {
  private readonly logger = new Logger(ProgramaAnualRol4TareaSyncService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Sincroniza las vigencias indicadas. No lanza excepción: un fallo aquí no
   * debe impedir que se consulte el plan.
   */
  async sincronizarVigencias(vigencias: number[]): Promise<void> {
    for (const vigencia of new Set(vigencias.filter((v) => Number.isInteger(v) && v > 0))) {
      try {
        await this.sincronizarVigencia(vigencia);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`No se pudieron sincronizar las tareas del Rol 4 de ${vigencia}: ${msg}`);
      }
    }
  }

  /**
   * Deja en el Rol 4 las tareas de cada auditoría del Programa Anual de la vigencia,
   * una por cada corte que cubre la auditoría, y reparte igual las de planes de
   * mejoramiento (EFDS-2237).
   */
  async sincronizarVigencia(vigencia: number): Promise<boolean> {
    const auditorias = await this.dataSource.transaction((manager) => this.sincronizarAuditorias(manager, vigencia));
    const planes = await this.dataSource.transaction((manager) => this.sincronizarPlanesMejoramiento(manager, vigencia));
    return auditorias || planes;
  }

  private async sincronizarAuditorias(manager: EntityManager, vigencia: number): Promise<boolean> {
    const actividad = await this.bloquearActividad(manager, await this.idActividadAuditoriasRol4(manager, vigencia));
    if (!actividad) return false;

    const auditorias: AuditoriaProgramada[] = await manager.query(
      // Mismo criterio de AuditoriasService.findAll({ planAnualVigencia }), que
      // arma las filas del Programa Anual y su Excel.
      `SELECT a.id, a.codigo, a.nombre,
              to_char(a.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
              to_char(a.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
              COALESCE(a.auditor_lider_id, a.auditor_asignado_id)::text AS responsable_id,
              NULLIF(TRIM(COALESCE(
                per.nom_largo,
                CONCAT_WS(' ', per.nom_tercero, per.pri_apellido, per.seg_apellido)
              )), '') AS responsable_nombre
         FROM control_interno.auditoria a
         LEFT JOIN auth.personas per
           ON per.id_person::text = COALESCE(a.auditor_lider_id, a.auditor_asignado_id)::text
        WHERE a.activa = true
          AND a.archivada = false
          AND (a.plan_anual_vigencia = $1
               OR (a.plan_anual_vigencia IS NULL
                   AND a.fecha_inicio IS NOT NULL
                   AND EXTRACT(YEAR FROM a.fecha_inicio) = $1))
        ORDER BY a.fecha_inicio NULLS LAST, a.codigo`,
      [vigencia],
    );

    const actuales = this.parseTareas(actividad.tareas_seguimiento);
    const previas = this.agruparPorFuente(
      actuales.filter(esTareaDelPrograma),
      (t) => String(t.auditoriaId ?? fuenteDeLaTarea(t.id, 'tarea-aud-') ?? ''),
    );

    // Las tareas que el usuario agregó a mano se conservan tal cual. Las del universo
    // se retiran, salvo las que ya tienen evidencias u observaciones.
    const otras = actuales.filter(
      (t) => !esTareaDelPrograma(t) && (!esTareaDelUniverso(t) || tieneSeguimientoRegistrado(t)),
    );

    const { puntos, creados } = this.cortesDeLaActividad(actividad, vigencia);
    const cortes = cortesComoPeriodos(puntos);

    // Lo que registró el seguimiento (completada, responsables, observaciones, adjuntos,
    // fecha de seguimiento cambiada a mano) se conserva; lo que viene de la programación
    // se actualiza. Cada auditoría queda en los cortes que cubre (EFDS-2237) y el fin de
    // la auditoría es su fecha límite.
    const delPrograma = auditorias.flatMap((a) => {
      const codigo = a.codigo?.trim() || 'S/C';
      const nombre = a.nombre?.trim() || 'Auditoría sin nombre';
      const fechaInicio = a.fecha_inicio ?? `${vigencia}-01-01`;
      const fechaFin = a.fecha_fin ?? `${vigencia}-12-31`;
      return tareasDeLaFuentePorCorte({
        prefijo: `tarea-aud-${a.id}`,
        inicio: fechaInicio,
        fin: fechaFin,
        cortes,
        previas: previas.get(String(a.id)) ?? [],
        base: (previa) => ({
          ...this.responsablesDeLaTarea(a, previa as TareaSeguimientoPlan | undefined),
          descripcion: `Realizar auditoría: ${codigo} – ${nombre}`,
          fechaInicio,
          fechaLimite: fechaFin,
          origen: ORIGEN_TAREA_PROGRAMA_ANUAL,
          auditoriaId: String(a.id),
        }),
      });
    });

    const cambio = await this.guardar(manager, actividad.id, [...otras, ...delPrograma], creados ? puntos : null, vigencia);
    if (cambio) {
      this.logger.log(
        `Rol 4 ${vigencia}: ${auditorias.length} auditoría(s) del Programa Anual en ${delPrograma.length} tarea(s) por corte (actividad ${actividad.id})`,
      );
    }
    return cambio;
  }

  /**
   * Las tareas de planes de mejoramiento las crea PlanMejoramientoRol4TareaSyncService
   * cuando cambia el plan; aquí solo se reparten en los cortes de la actividad, con las
   * fechas que ya traen, para que los planes anteriores también queden por corte.
   */
  private async sincronizarPlanesMejoramiento(manager: EntityManager, vigencia: number): Promise<boolean> {
    const actividad = await this.bloquearActividad(manager, await this.idActividadPlanesMejoramientoRol4(manager, vigencia));
    if (!actividad) return false;

    const actuales = this.parseTareas(actividad.tareas_seguimiento);
    const dePlanes = actuales.filter(esTareaDePlanMejoramiento);
    const otras = actuales.filter((t) => !esTareaDePlanMejoramiento(t));
    const { puntos, creados } = this.cortesDeLaActividad(actividad, vigencia);
    if (dePlanes.length === 0 && !creados) return false;
    const cortes = cortesComoPeriodos(puntos);

    const grupos = this.agruparPorFuente(
      dePlanes,
      (t) => String(t.planMejoramientoId ?? fuenteDeLaTarea(t.id, 'tarea-pm-') ?? ''),
    );
    const porCorte = [...grupos.entries()].flatMap(([planId, tareas]) => {
      const ref = tareas[0];
      const inicio = String(ref.fechaInicio || `${vigencia}-01-01`).slice(0, 10);
      const fin = String(ref.fechaLimite || `${vigencia}-12-31`).slice(0, 10);
      return tareasDeLaFuentePorCorte({
        prefijo: `tarea-pm-${planId}`,
        inicio,
        fin,
        cortes,
        previas: tareas,
        base: () => ({
          descripcion: ref.descripcion,
          responsables: ref.responsables,
          fechaInicio: inicio,
          fechaLimite: fin,
          origen: ORIGEN_TAREA_PLAN_MEJORAMIENTO,
          planMejoramientoId: planId,
          auditoriaId: ref.auditoriaId,
          areaResponsable: ref.areaResponsable,
        }),
      });
    });

    return this.guardar(manager, actividad.id, [...otras, ...porCorte], creados ? puntos : null, vigencia);
  }

  /**
   * Cortes de la actividad. Si no tiene ninguno se crean según su "Control" (mensual,
   * trimestral…), como los arma el asistente para las demás actividades (EFDS-2237).
   */
  private cortesDeLaActividad(
    actividad: ActividadRol4,
    vigencia: number,
  ): { puntos: Array<{ id?: unknown; fechaProgramada?: unknown; fechaSeguimiento?: unknown }>; creados: boolean } {
    const guardados = this.parseCortes(actividad.puntos_control);
    if (guardados.length > 0) return { puntos: guardados, creados: false };
    const frecuencia = frecuenciaDeLaActividad(actividad.control, actividad.frecuencia_puntos_control);
    return { puntos: cortesPorDefecto(frecuencia, vigencia, `pc-${actividad.id}`), creados: true };
  }

  /** jsonb compara por contenido: solo se escribe si algo cambió. */
  private async guardar(
    manager: EntityManager,
    actividadId: string,
    tareas: unknown[],
    cortesNuevos: unknown[] | null,
    vigencia: number,
  ): Promise<boolean> {
    if (cortesNuevos) {
      const frecuencia: FrecuenciaCortes = cortesNuevos.length === 12 ? 'mensual'
        : cortesNuevos.length === 4 ? 'trimestral'
          : cortesNuevos.length === 3 ? 'cuatrimestral'
            : cortesNuevos.length === 2 ? 'semestral' : 'anual';
      await manager.query(
        `UPDATE control_interno.actividad_plan_anual_5
            SET puntos_control = $1::jsonb, frecuencia_puntos_control = $2,
                fecha_corte = $3::date, updated_at = NOW()
          WHERE id = $4`,
        [JSON.stringify(cortesNuevos), frecuencia, `${vigencia}-12-31`, actividadId],
      );
      this.logger.log(`Rol 4 ${vigencia}: ${cortesNuevos.length} corte(s) (${frecuencia}) creados en la actividad ${actividadId}`);
    }
    const resultado = await manager.query(
      `UPDATE control_interno.actividad_plan_anual_5
          SET tareas_seguimiento = $1::jsonb, updated_at = NOW()
        WHERE id = $2
          AND tareas_seguimiento IS DISTINCT FROM $1::jsonb`,
      [JSON.stringify(tareas), actividadId],
    );
    return !!cortesNuevos || Number(Array.isArray(resultado) ? resultado[1] : 0) > 0;
  }

  private agruparPorFuente(
    tareas: TareaSeguimientoPlan[],
    fuente: (t: TareaSeguimientoPlan) => string,
  ): Map<string, TareaSeguimientoPlan[]> {
    const grupos = new Map<string, TareaSeguimientoPlan[]>();
    for (const t of tareas) {
      const id = fuente(t);
      if (!id) continue;
      grupos.set(id, [...(grupos.get(id) ?? []), t]);
    }
    return grupos;
  }

  private async idActividadAuditoriasRol4(manager: EntityManager, vigencia: number): Promise<string | null> {
    const rows = await manager.query(
      `SELECT a.id
       FROM control_interno.actividad_plan_anual_5 a
       INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
       INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
       WHERE p.ano = $1
         AND r.rol_numero = 4
         AND COALESCE(a.activo, true) = true
         AND (
           a.tipo_calculo = 'auditorias'
           OR LOWER(a.nombre) LIKE '%auditoría%'
           OR LOWER(a.nombre) LIKE '%auditoria%'
           OR LOWER(a.nombre) LIKE '%programa de auditor%'
         )
       ORDER BY
         CASE WHEN a.tipo_calculo = 'auditorias' THEN 0 ELSE 1 END,
         a.created_at ASC
       LIMIT 1`,
      [vigencia],
    );
    return rows?.[0]?.id ?? null;
  }

  /** Misma actividad que usa PlanMejoramientoRol4TareaSyncService. */
  private async idActividadPlanesMejoramientoRol4(manager: EntityManager, vigencia: number): Promise<string | null> {
    const rows = await manager.query(
      `SELECT a.id
       FROM control_interno.actividad_plan_anual_5 a
       INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
       INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
       WHERE p.ano = $1
         AND r.rol_numero = 4
         AND COALESCE(a.activo, true) = true
         AND (
           a.tipo_calculo = 'planes_mejoramiento'
           OR (LOWER(a.nombre) LIKE '%plan%' AND LOWER(a.nombre) LIKE '%mejoramiento%')
         )
         AND NOT (
           a.tipo_calculo = 'auditorias'
           OR LOWER(a.nombre) LIKE '%auditoría%'
           OR LOWER(a.nombre) LIKE '%auditoria%'
           OR LOWER(a.nombre) LIKE '%programa de auditor%'
         )
       ORDER BY
         CASE WHEN a.tipo_calculo = 'planes_mejoramiento' THEN 0 ELSE 1 END,
         a.created_at ASC
       LIMIT 1`,
      [vigencia],
    );
    return rows?.[0]?.id ?? null;
  }

  /**
   * Si alguien está guardando la actividad en este momento no se espera ni se pisa su
   * cambio: la siguiente consulta del plan termina de sincronizar.
   */
  private async bloquearActividad(manager: EntityManager, id: string | null): Promise<ActividadRol4 | null> {
    if (!id) return null;
    const bloqueada = await manager.query(
      `SELECT id, tareas_seguimiento, puntos_control, control, frecuencia_puntos_control
         FROM control_interno.actividad_plan_anual_5
        WHERE id = $1
        FOR UPDATE SKIP LOCKED`,
      [id],
    );
    return bloqueada?.[0] ?? null;
  }

  private parseCortes(raw: unknown): Array<{ id?: unknown; fechaProgramada?: unknown; fechaSeguimiento?: unknown }> {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private parseTareas(raw: unknown): TareaSeguimientoPlan[] {
    if (Array.isArray(raw)) return raw as TareaSeguimientoPlan[];
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * La tarea queda a cargo de quien responde por la auditoría (el auditor líder,
   * o el asignado si no hay líder). En `responsablesAuditoria` se guarda a quién
   * se puso automáticamente, para distinguirlo de un cambio hecho a mano:
   * mientras nadie lo cambie, la tarea sigue a la auditoría (si cambia el líder,
   * cambia la tarea); si en el seguimiento asignaron a otra persona, se respeta.
   */
  private responsablesDeLaTarea(
    a: AuditoriaProgramada,
    previa?: TareaSeguimientoPlan,
  ): Pick<TareaSeguimientoPlan, 'responsables' | 'responsablesAuditoria'> {
    const desdeAuditoria = a.responsable_id
      ? [{ id: a.responsable_id, nombre: a.responsable_nombre || 'Auditor asignado' }]
      : [];
    const automatico = { responsables: desdeAuditoria, responsablesAuditoria: desdeAuditoria };
    if (!previa) return automatico;

    const actuales = Array.isArray(previa.responsables) ? (previa.responsables as unknown[]) : [];
    if (actuales.length === 0) return automatico;

    // El seguimiento guarda a veces el nombre y a veces el objeto: se compara por ambos
    const clave = (v: string | null | undefined) => String(v ?? '').trim().toLowerCase();
    const puestos = Array.isArray(previa.responsablesAuditoria)
      ? (previa.responsablesAuditoria as Array<{ id?: string; nombre?: string }>)
      : [];
    const clavesPuestas = new Set(puestos.flatMap((r) => [clave(r.id), clave(r.nombre)]).filter(Boolean));
    const sinCambioManual =
      clavesPuestas.size > 0 &&
      actuales.every((r) => {
        const o = (typeof r === 'string' ? { id: r, nombre: r } : r) as { id?: string; nombre?: string };
        return clavesPuestas.has(clave(o.id)) || clavesPuestas.has(clave(o.nombre));
      });

    return sinCambioManual
      ? automatico
      : {
          responsables: actuales as TareaSeguimientoPlan['responsables'],
          responsablesAuditoria: puestos as TareaSeguimientoPlan['responsablesAuditoria'],
        };
  }
}
