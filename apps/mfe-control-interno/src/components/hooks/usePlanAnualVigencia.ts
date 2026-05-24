/**
 * Vigencia activa del Plan Anual — compartida entre módulos de Control Interno.
 * Persiste en localStorage (misma clave que DashboardPlan / PlanAnualAuditoriaDefinitivo).
 */

import { useState, useEffect, useCallback } from 'react';
import { planAnualApi, invalidatePlanAnualListCache } from '../services/plan-anual/api';
import type { PlanAnual } from '../services/plan-anual/types';

export const PLAN_ANUAL_STORAGE_KEY = 'esap:plan_anual_activo';

export interface PlanAnualActivoStorage {
  id: string;
  vigencia: number;
  estado: string;
  version: number;
  jefeOCINombre?: string;
  fechaCorte?: string;
}

export interface PlanVigenciaOpcion {
  id: string;
  vigencia: number;
  estado: string;
  version: number;
}

function normalizarEstado(estado: string | undefined): string {
  return (estado || 'borrador').toUpperCase().replace(/-/g, '_');
}

function mapPlanBackend(p: PlanAnual): PlanVigenciaOpcion {
  const vigencia = p.año ?? (p as any).vigencia ?? new Date().getFullYear();
  return {
    id: p.id,
    vigencia: Number(vigencia),
    estado: normalizarEstado(p.estado),
    version: (p as any).version ?? 1,
  };
}

export function leerPlanAnualActivoStorage(): PlanAnualActivoStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAN_ANUAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const vigencia = Number(parsed?.vigencia);
    if (!parsed?.id || Number.isNaN(vigencia)) return null;
    return {
      id: String(parsed.id),
      vigencia,
      estado: normalizarEstado(parsed.estado),
      version: Number(parsed.version) || 1,
      jefeOCINombre: parsed.jefeOCINombre,
      fechaCorte: parsed.fechaCorte,
    };
  } catch {
    return null;
  }
}

export function guardarPlanAnualActivoStorage(
  plan: PlanVigenciaOpcion,
  extras?: Partial<Pick<PlanAnualActivoStorage, 'jefeOCINombre' | 'fechaCorte'>>,
): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = leerPlanAnualActivoStorage();
    localStorage.setItem(
      PLAN_ANUAL_STORAGE_KEY,
      JSON.stringify({
        id: plan.id,
        vigencia: plan.vigencia,
        estado: plan.estado,
        version: plan.version,
        jefeOCINombre: extras?.jefeOCINombre ?? prev?.jefeOCINombre ?? '',
        fechaCorte: extras?.fechaCorte ?? prev?.fechaCorte ?? `${plan.vigencia}-12-31`,
      }),
    );
  } catch {
    /* ignore */
  }
}

export function usePlanAnualVigencia() {
  const stored = leerPlanAnualActivoStorage();
  const [planes, setPlanes] = useState<PlanVigenciaOpcion[]>([]);
  const [planActivoId, setPlanActivoId] = useState<string | null>(stored?.id ?? null);
  const [vigencia, setVigencia] = useState<number>(
    stored?.vigencia ?? new Date().getFullYear(),
  );
  const [loading, setLoading] = useState(true);

  const cargarPlanes = useCallback(async (forzarRecarga = false) => {
    setLoading(true);
    try {
      if (forzarRecarga) {
        invalidatePlanAnualListCache();
      }
      const resp = await planAnualApi.getAll({ light: true, skipCache: forzarRecarga });
      if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
        const lista = resp.data
          .map(mapPlanBackend)
          .sort((a, b) => b.vigencia - a.vigencia);
        setPlanes(lista);

        const storedNow = leerPlanAnualActivoStorage();
        const activo =
          (storedNow && lista.find((p) => p.id === storedNow.id)) ||
          lista.find((p) => p.vigencia === storedNow?.vigencia) ||
          lista[0];

        if (activo) {
          setPlanActivoId(activo.id);
          setVigencia(activo.vigencia);
          guardarPlanAnualActivoStorage(activo);
        }
      } else {
        setPlanes([]);
      }
    } catch (e) {
      console.error('[usePlanAnualVigencia] Error cargando planes:', e);
      setPlanes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPlanes();
  }, [cargarPlanes]);

  const cambiarPlan = useCallback(
    (planId: string) => {
      const plan = planes.find((p) => p.id === planId);
      if (!plan) return;
      setPlanActivoId(plan.id);
      setVigencia(plan.vigencia);
      guardarPlanAnualActivoStorage(plan);
    },
    [planes],
  );

  const planActivo =
    planes.find((p) => p.id === planActivoId) ??
    planes.find((p) => p.vigencia === vigencia) ??
    null;

  return {
    vigencia,
    planActivoId,
    planActivo,
    planes,
    cambiarPlan,
    loading,
    refetch: () => cargarPlanes(true),
  };
}
