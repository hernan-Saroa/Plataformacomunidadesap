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
const esTareaDelUniverso = (t: TareaSeguimientoPlan) =>
  t.origen === ORIGEN_TAREA_EVALUACION_UNIVERSO || String(t.id ?? '').startsWith('tarea-ev-');

/** Evidencias u observaciones que alguien registró: esas tareas no se borran. */
const tieneSeguimientoRegistrado = (t: TareaSeguimientoPlan) => {
  const extra = t as TareaSeguimientoPlan & { adjuntosTarea?: unknown[]; observaciones?: unknown };
  const obs = extra.observaciones;
  return (
    (Array.isArray(extra.adjuntosTarea) && extra.adjuntosTarea.length > 0) ||
    (Array.isArray(obs) ? obs.length > 0 : typeof obs === 'string' && obs.trim() !== '')
  );
};

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

  /** Deja en el Rol 4 una tarea por cada auditoría del Programa Anual de la vigencia. */
  async sincronizarVigencia(vigencia: number): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const actividad = await this.obtenerActividadAuditoriasRol4(manager, vigencia);
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
      const previas = new Map(
        actuales
          .filter(esTareaDelPrograma)
          .map((t): [string, TareaSeguimientoPlan] => [
            String(t.auditoriaId ?? String(t.id).replace(/^tarea-aud-/, '')),
            t,
          ]),
      );

      // Las tareas que el usuario agregó a mano se conservan tal cual. Las del universo
      // se retiran, salvo las que ya tienen evidencias u observaciones.
      const otras = actuales.filter(
        (t) => !esTareaDelPrograma(t) && (!esTareaDelUniverso(t) || tieneSeguimientoRegistrado(t)),
      );

      const delPrograma = auditorias.map((a): TareaSeguimientoPlan => {
        const previa = previas.get(String(a.id));
        const codigo = a.codigo?.trim() || 'S/C';
        const nombre = a.nombre?.trim() || 'Auditoría sin nombre';
        // Lo que registró el seguimiento (completada, responsables, observaciones,
        // adjuntos…) se conserva; lo que viene de la programación se actualiza.
        return {
          completada: false,
          ...previa,
          ...this.responsablesDeLaTarea(a, previa),
          id: `tarea-aud-${a.id}`,
          descripcion: `Realizar auditoría: ${codigo} – ${nombre}`,
          fechaInicio: a.fecha_inicio ?? `${vigencia}-01-01`,
          fechaLimite: a.fecha_fin ?? `${vigencia}-12-31`,
          origen: ORIGEN_TAREA_PROGRAMA_ANUAL,
          auditoriaId: String(a.id),
        };
      });

      // jsonb compara por contenido: solo se escribe si algo cambió.
      const resultado = await manager.query(
        `UPDATE control_interno.actividad_plan_anual_5
            SET tareas_seguimiento = $1::jsonb, updated_at = NOW()
          WHERE id = $2
            AND tareas_seguimiento IS DISTINCT FROM $1::jsonb`,
        [JSON.stringify([...otras, ...delPrograma]), actividad.id],
      );
      const cambio = Number(Array.isArray(resultado) ? resultado[1] : 0) > 0;
      if (cambio) {
        this.logger.log(
          `Rol 4 ${vigencia}: ${delPrograma.length} auditoría(s) del Programa Anual en la actividad ${actividad.id}`,
        );
      }
      return cambio;
    });
  }

  private async obtenerActividadAuditoriasRol4(
    manager: EntityManager,
    vigencia: number,
  ): Promise<{ id: string; tareas_seguimiento: unknown } | null> {
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
    if (!rows?.[0]) return null;

    // Si alguien está guardando la actividad en este momento no se espera ni se
    // pisa su cambio: la siguiente consulta del plan termina de sincronizar.
    const bloqueada = await manager.query(
      `SELECT id, tareas_seguimiento
         FROM control_interno.actividad_plan_anual_5
        WHERE id = $1
        FOR UPDATE SKIP LOCKED`,
      [rows[0].id],
    );
    return bloqueada?.[0] ?? null;
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
