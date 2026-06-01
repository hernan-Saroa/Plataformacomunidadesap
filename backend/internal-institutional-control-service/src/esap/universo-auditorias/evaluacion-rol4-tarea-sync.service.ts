/**
 * Sincroniza tareas de seguimiento en Rol 4 (actividad "Efectuar auditorías…")
 * cuando una evaluación del universo queda priorizada o deja de estarlo.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EvaluacionProceso } from './entities/evaluacion-proceso.entity';
import {
  calcularAuditableDesdeCiclo,
  resolverAuditableEfectivo,
} from './evaluacion-auditable.util';

export const ORIGEN_TAREA_EVALUACION = 'evaluacion_universo';

export interface TareaSeguimientoPlan {
  id: string;
  descripcion: string;
  completada: boolean;
  responsables?: Array<{ id: string; nombre: string; cargo?: string }>;
  fechaInicio?: string;
  fechaLimite?: string;
  fechaCompletada?: string;
  completadaPor?: string;
  origen?: string;
  evaluacionProcesoId?: string;
  procesoId?: string;
  [key: string]: unknown;
}

@Injectable()
export class EvaluacionRol4TareaSyncService {
  private readonly logger = new Logger(EvaluacionRol4TareaSyncService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * No lanza excepción: un fallo de sync no debe revertir la evaluación guardada.
   */
  async sincronizarDesdeEvaluacion(evaluacion: EvaluacionProceso): Promise<void> {
    try {
      await this.sincronizarDesdeEvaluacionInterno(evaluacion);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `No se pudo sincronizar tarea Rol 4 para evaluación ${evaluacion.id}: ${msg}`,
      );
    }
  }

  private async sincronizarDesdeEvaluacionInterno(
    evaluacion: EvaluacionProceso,
  ): Promise<void> {
    if (!evaluacion.activo) {
      await this.quitarTarea(evaluacion);
      return;
    }

    const tieneDafp =
      evaluacion.ponderacionFinalDafp !== undefined &&
      evaluacion.ponderacionFinalDafp !== null;
    if (!tieneDafp) {
      return;
    }

    const calculado =
      evaluacion.auditableCalculado ??
      calcularAuditableDesdeCiclo(evaluacion.cicloRotacionDafp);
    const priorizado = resolverAuditableEfectivo(
      calculado,
      evaluacion.auditableManual,
    );

    if (!priorizado) {
      await this.quitarTarea(evaluacion);
      return;
    }

    const actividad = await this.obtenerActividadAuditoriasRol4(evaluacion.vigencia);
    if (!actividad) {
      this.logger.warn(
        `Sin actividad Rol 4 de auditorías para vigencia ${evaluacion.vigencia}; evaluación ${evaluacion.id}`,
      );
      return;
    }

    const proceso = evaluacion.proceso;
    const codigo = proceso?.codigo || 'S/C';
    const nombre = proceso?.nombre || 'Proceso sin nombre';
    const descripcion = `Realizar auditoría: ${codigo} – ${nombre} (vigencia ${evaluacion.vigencia})`;
    const tareaId = `tarea-ev-${evaluacion.id}`;

    const tareasActuales: TareaSeguimientoPlan[] = Array.isArray(
      actividad.tareas_seguimiento,
    )
      ? actividad.tareas_seguimiento
      : typeof actividad.tareas_seguimiento === 'string'
        ? JSON.parse(actividad.tareas_seguimiento)
        : [];

    const previa = tareasActuales.find(
      (t) =>
        t.evaluacionProcesoId === evaluacion.id ||
        t.id === tareaId ||
        (t.origen === ORIGEN_TAREA_EVALUACION &&
          t.evaluacionProcesoId === evaluacion.id),
    );

    const sinAuto = tareasActuales.filter(
      (t) =>
        t.evaluacionProcesoId !== evaluacion.id &&
        t.id !== tareaId &&
        !(
          t.origen === ORIGEN_TAREA_EVALUACION &&
          t.evaluacionProcesoId === evaluacion.id
        ),
    );

    const nuevaTarea: TareaSeguimientoPlan = {
      id: tareaId,
      descripcion,
      completada: previa?.completada ?? false,
      responsables: previa?.responsables ?? [],
      fechaInicio: previa?.fechaInicio ?? `${evaluacion.vigencia}-01-01`,
      fechaLimite: previa?.fechaLimite ?? `${evaluacion.vigencia}-12-31`,
      fechaCompletada: previa?.fechaCompletada,
      completadaPor: previa?.completadaPor,
      origen: ORIGEN_TAREA_EVALUACION,
      evaluacionProcesoId: evaluacion.id,
      procesoId: evaluacion.procesoId,
    };

    const tareasNuevas = [...sinAuto, nuevaTarea];

    await this.dataSource.query(
      `UPDATE control_interno.actividad_plan_anual_5
       SET tareas_seguimiento = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(tareasNuevas), actividad.id],
    );

    this.logger.log(
      `Tarea Rol 4 sincronizada: evaluación ${evaluacion.id} → actividad ${actividad.id}`,
    );
  }

  private async quitarTarea(evaluacion: EvaluacionProceso): Promise<void> {
    const actividad = await this.obtenerActividadAuditoriasRol4(evaluacion.vigencia);
    if (!actividad) return;

    const tareasActuales: TareaSeguimientoPlan[] = Array.isArray(
      actividad.tareas_seguimiento,
    )
      ? actividad.tareas_seguimiento
      : typeof actividad.tareas_seguimiento === 'string'
        ? JSON.parse(actividad.tareas_seguimiento)
        : [];

    const tareaId = `tarea-ev-${evaluacion.id}`;
    const filtradas = tareasActuales.filter(
      (t) =>
        t.evaluacionProcesoId !== evaluacion.id &&
        t.id !== tareaId &&
        !(
          t.origen === ORIGEN_TAREA_EVALUACION &&
          t.evaluacionProcesoId === evaluacion.id
        ),
    );

    if (filtradas.length === tareasActuales.length) return;

    await this.dataSource.query(
      `UPDATE control_interno.actividad_plan_anual_5
       SET tareas_seguimiento = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(filtradas), actividad.id],
    );

    this.logger.log(
      `Tarea Rol 4 eliminada para evaluación ${evaluacion.id}`,
    );
  }

  private async obtenerActividadAuditoriasRol4(
    vigencia: number,
  ): Promise<{ id: string; tareas_seguimiento: unknown } | null> {
    const rows = await this.dataSource.query(
      `SELECT a.id, a.tareas_seguimiento
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

    return rows?.[0] ?? null;
  }
}
