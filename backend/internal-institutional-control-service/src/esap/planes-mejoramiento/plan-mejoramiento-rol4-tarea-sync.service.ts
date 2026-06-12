/**
 * Sincroniza tareas de seguimiento en Rol 4 (actividad "Seguimiento a planes de mejoramiento…")
 * cuando un plan queda en ejecución o deja de requerir seguimiento OCI.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  PlanMejoramiento,
  PlanMejoramientoEstado,
} from './entities/plan-mejoramiento.entity';
import type { TareaSeguimientoPlan } from '../universo-auditorias/evaluacion-rol4-tarea-sync.service';

export const ORIGEN_TAREA_PLAN_MEJORAMIENTO = 'plan_mejoramiento';

/** Estados en los que Rol 4 debe tener tarea pendiente (desde que se genera el plan). */
const ESTADOS_CON_SEGUIMIENTO: PlanMejoramientoEstado[] = [
  PlanMejoramientoEstado.BORRADOR,
  PlanMejoramientoEstado.REVISION,
  PlanMejoramientoEstado.APROBADO,
  PlanMejoramientoEstado.EN_EJECUCION,
  PlanMejoramientoEstado.VENCIDO,
];

@Injectable()
export class PlanMejoramientoRol4TareaSyncService {
  private readonly logger = new Logger(PlanMejoramientoRol4TareaSyncService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * No lanza excepción: un fallo de sync no debe revertir el guardado del plan.
   */
  async sincronizarDesdePlan(
    plan: PlanMejoramiento,
    estadoEfectivo?: PlanMejoramientoEstado,
  ): Promise<void> {
    try {
      await this.sincronizarDesdePlanInterno(plan, estadoEfectivo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `No se pudo sincronizar tarea Rol 4 para plan ${plan.id}: ${msg}`,
      );
    }
  }

  /**
   * Re-sincroniza todos los planes que requieren seguimiento para una vigencia.
   */
  async sincronizarVigencia(vigencia: number): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT pm.id
       FROM control_interno.plan_mejoramiento pm
       LEFT JOIN control_interno.auditoria aud ON aud.id = pm.auditoria_id
       WHERE pm.estado = ANY($2::varchar[])
         AND (
           aud.plan_anual_vigencia = $1
           OR (aud.plan_anual_vigencia IS NULL AND EXTRACT(YEAR FROM pm.created_at)::int = $1)
           OR (pm.auditoria_id IS NULL AND EXTRACT(YEAR FROM pm.created_at)::int = $1)
         )`,
      [vigencia, ESTADOS_CON_SEGUIMIENTO],
    );

    let count = 0;
    for (const row of rows as { id: string }[]) {
      const plan = await this.cargarPlan(row.id);
      if (plan) {
        await this.sincronizarDesdePlanInterno(plan);
        count += 1;
      }
    }
    return count;
  }

  private async sincronizarDesdePlanInterno(
    plan: PlanMejoramiento,
    estadoEfectivo?: PlanMejoramientoEstado,
  ): Promise<void> {
    const estado = estadoEfectivo ?? plan.estado;

    if (!ESTADOS_CON_SEGUIMIENTO.includes(estado)) {
      await this.quitarTarea(plan);
      return;
    }

    const vigencia = await this.resolverVigencia(plan);
    const actividad = await this.obtenerActividadPlanesMejoramientoRol4(vigencia);
    if (!actividad) {
      this.logger.warn(
        `Sin actividad Rol 4 de planes de mejoramiento para vigencia ${vigencia}; plan ${plan.id}`,
      );
      return;
    }

    const area =
      plan.areaResponsable?.trim() ||
      plan.auditoria?.areaObjetivo?.trim() ||
      plan.auditoria?.procesoAuditado?.trim() ||
      'Área no especificada';
    const resp = this.resolverResponsableSeguimiento(plan);
    const descripcion = `Seguimiento plan de mejoramiento: ${plan.codigo} – ${area} (resp.: ${resp})`;
    const tareaId = `tarea-pm-${plan.id}`;

    const tareasActuales = this.parseTareas(actividad.tareas_seguimiento);

    const previa = tareasActuales.find(
      (t) =>
        t.planMejoramientoId === plan.id ||
        t.id === tareaId ||
        (t.origen === ORIGEN_TAREA_PLAN_MEJORAMIENTO &&
          t.planMejoramientoId === plan.id),
    );

    const sinAuto = tareasActuales.filter(
      (t) =>
        t.planMejoramientoId !== plan.id &&
        t.id !== tareaId &&
        !(
          t.origen === ORIGEN_TAREA_PLAN_MEJORAMIENTO &&
          t.planMejoramientoId === plan.id
        ),
    );

    const fechaLimiteStr = this.formatFecha(plan.fechaLimite);
    const fechaInicioStr =
      this.formatFecha(plan.fechaAprobacion) ?? `${vigencia}-01-01`;

    const responsables =
      previa?.responsables?.length
        ? previa.responsables
        : resp !== 'Sin asignar'
          ? [
              {
                id: `resp-pm-${plan.id}`,
                nombre: resp,
                cargo: 'Responsable implementación',
              },
            ]
          : [];

    const nuevaTarea: TareaSeguimientoPlan = {
      id: tareaId,
      descripcion,
      completada: previa?.completada ?? false,
      responsables,
      fechaInicio: previa?.fechaInicio ?? fechaInicioStr,
      fechaLimite: previa?.fechaLimite ?? fechaLimiteStr ?? `${vigencia}-12-31`,
      fechaCompletada: previa?.fechaCompletada,
      completadaPor: previa?.completadaPor,
      origen: ORIGEN_TAREA_PLAN_MEJORAMIENTO,
      planMejoramientoId: plan.id,
      auditoriaId: plan.auditoriaId ?? undefined,
      areaResponsable: area,
    };

    await this.dataSource.query(
      `UPDATE control_interno.actividad_plan_anual_5
       SET tareas_seguimiento = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify([...sinAuto, nuevaTarea]), actividad.id],
    );

    this.logger.log(
      `Tarea Rol 4 (plan mejoramiento) sincronizada: plan ${plan.id} → actividad ${actividad.id}`,
    );
  }

  private async quitarTarea(plan: PlanMejoramiento): Promise<void> {
    const vigencia = await this.resolverVigencia(plan);
    const actividad = await this.obtenerActividadPlanesMejoramientoRol4(vigencia);
    if (!actividad) return;

    const tareasActuales = this.parseTareas(actividad.tareas_seguimiento);
    const tareaId = `tarea-pm-${plan.id}`;
    const filtradas = tareasActuales.filter(
      (t) =>
        t.planMejoramientoId !== plan.id &&
        t.id !== tareaId &&
        !(
          t.origen === ORIGEN_TAREA_PLAN_MEJORAMIENTO &&
          t.planMejoramientoId === plan.id
        ),
    );

    if (filtradas.length === tareasActuales.length) return;

    await this.dataSource.query(
      `UPDATE control_interno.actividad_plan_anual_5
       SET tareas_seguimiento = $1::jsonb, updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(filtradas), actividad.id],
    );

    this.logger.log(`Tarea Rol 4 eliminada para plan de mejoramiento ${plan.id}`);
  }

  private async resolverVigencia(plan: PlanMejoramiento): Promise<number> {
    if (plan.auditoria?.planAnualVigencia) {
      return plan.auditoria.planAnualVigencia;
    }

    if (plan.auditoriaId) {
      const rows = await this.dataSource.query(
        `SELECT plan_anual_vigencia, fecha_inicio
         FROM control_interno.auditoria
         WHERE id = $1`,
        [plan.auditoriaId],
      );
      const row = rows?.[0];
      if (row?.plan_anual_vigencia) {
        return Number(row.plan_anual_vigencia);
      }
      if (row?.fecha_inicio) {
        return new Date(row.fecha_inicio).getFullYear();
      }
    }

    if (plan.createdAt) {
      return new Date(plan.createdAt).getFullYear();
    }

    return new Date().getFullYear();
  }

  private resolverResponsableSeguimiento(plan: PlanMejoramiento): string {
    const impl = (plan.responsableImplementacion || '').trim();
    const areaNombre = (plan.auditoria?.responsableAreaNombre || '').trim();
    if (impl && !/^sin\s+auditor/i.test(impl)) return impl;
    if (areaNombre) return areaNombre;
    return impl || 'Sin asignar';
  }

  private async obtenerActividadPlanesMejoramientoRol4(
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
           a.tipo_calculo = 'planes_mejoramiento'
           OR (
             LOWER(a.nombre) LIKE '%plan%'
             AND LOWER(a.nombre) LIKE '%mejoramiento%'
           )
           OR LOWER(a.nombre) LIKE '%planes de mejoramiento%'
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

    if (rows?.[0]) return rows[0];

    // Fallback: 2.ª actividad del Rol 4 (plantilla: 1 auditorías, 2 planes de mejoramiento)
    const fallback = await this.dataSource.query(
      `SELECT a.id, a.tareas_seguimiento
       FROM control_interno.actividad_plan_anual_5 a
       INNER JOIN control_interno.rol_plan_anual_5 r ON a.rol_id = r.id
       INNER JOIN control_interno.plan_anual_5_roles p ON r.plan_id = p.id
       WHERE p.ano = $1
         AND r.rol_numero = 4
         AND COALESCE(a.activo, true) = true
         AND a.tipo_calculo IS DISTINCT FROM 'auditorias'
         AND NOT (
           LOWER(a.nombre) LIKE '%auditoría%'
           OR LOWER(a.nombre) LIKE '%auditoria%'
           OR LOWER(a.nombre) LIKE '%programa de auditor%'
         )
       ORDER BY a.created_at ASC
       OFFSET 1
       LIMIT 1`,
      [vigencia],
    );

    return fallback?.[0] ?? null;
  }

  private parseTareas(raw: unknown): TareaSeguimientoPlan[] {
    if (Array.isArray(raw)) return raw as TareaSeguimientoPlan[];
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as TareaSeguimientoPlan[];
      } catch {
        return [];
      }
    }
    return [];
  }

  private formatFecha(fecha?: Date | string | null): string | undefined {
    if (!fecha) return undefined;
    if (typeof fecha === 'string') {
      const solo = fecha.split('T')[0];
      return /^\d{4}-\d{2}-\d{2}$/.test(solo) ? solo : undefined;
    }
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private async cargarPlan(id: string): Promise<PlanMejoramiento | null> {
    const rows = await this.dataSource.query(
      `SELECT pm.*, aud.plan_anual_vigencia, aud.area_objetivo,
              aud.responsable_area_nombre, aud.proceso_auditado
       FROM control_interno.plan_mejoramiento pm
       LEFT JOIN control_interno.auditoria aud ON aud.id = pm.auditoria_id
       WHERE pm.id = $1`,
      [id],
    );
    const row = rows?.[0];
    if (!row) return null;

    return {
      id: row.id,
      codigo: row.codigo,
      titulo: row.titulo,
      areaResponsable: row.area_responsable,
      responsableImplementacion: row.responsable_implementacion,
      fechaLimite: row.fecha_limite,
      fechaAprobacion: row.fecha_aprobacion,
      estado: row.estado as PlanMejoramientoEstado,
      auditoriaId: row.auditoria_id,
      createdAt: row.created_at,
      auditoria: row.plan_anual_vigencia
        ? {
            planAnualVigencia: Number(row.plan_anual_vigencia),
            areaObjetivo: row.area_objetivo,
            responsableAreaNombre: row.responsable_area_nombre,
            procesoAuditado: row.proceso_auditado,
          }
        : row.area_objetivo || row.responsable_area_nombre
          ? {
              areaObjetivo: row.area_objetivo,
              responsableAreaNombre: row.responsable_area_nombre,
              procesoAuditado: row.proceso_auditado,
            }
          : undefined,
    } as PlanMejoramiento;
  }
}
