/**
 * Vigencia activa del Plan Anual — compartida entre módulos de Control Interno.
 * Persiste en localStorage (misma clave que DashboardPlan / PlanAnualAuditoriaDefinitivo).
 */

import { useState, useEffect, useCallback } from 'react';
import { planAnualApi, invalidatePlanAnualListCache } from '../services/plan-anual/api';
import type { PlanAnual } from '../services/plan-anual/types';
import { useControlInternoPermissions } from './useControlInternoPermissions';

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

  const { puedeRealizar, esSuperUsuario } = useControlInternoPermissions();
  const puedeAprobar = puedeRealizar('plan-anual', 'approve');
  const puedeEditar = puedeRealizar('plan-anual', 'edit');
  const puedeActivar = puedeRealizar('plan-anual', 'activate');
  const esSoloComite = puedeAprobar && !puedeEditar && !puedeActivar && !esSuperUsuario;

  const cargarPlanes = useCallback(async (forzarRecarga = false) => {
    setLoading(true);
    try {
      if (forzarRecarga) {
        invalidatePlanAnualListCache();
      }
      const resp = await planAnualApi.getAll({ light: true, skipCache: forzarRecarga });
      if (resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
        let datosFiltrados = resp.data;

        // Un usuario comité (Aprobador PAI) solo ve planes donde es miembro
        // del equipo de aprobación (equipo_aprobacion / equipoAprobacion).
        if (esSoloComite) {
          try {
            const authCache = (window as any).__esap_auth_cache;
            const userEmail = (
              authCache?.person?.email ||
              authCache?.email ||
              authCache?.dir_email ||
              authCache?.username ||
              ''
            ).toLowerCase().trim();
            const userId = String(
              authCache?.person?.id ||
              authCache?.person?.idPerson ||
              authCache?.person?.id_person ||
              authCache?.idPerson ||
              authCache?.id_person ||
              authCache?.id ||
              ''
            ).toLowerCase();

            datosFiltrados = resp.data.filter((plan: PlanAnual) => {
              const equipo: any[] = (plan as any).equipoAprobacion
                || (plan as any).equipo_aprobacion
                || [];
              if (!Array.isArray(equipo) || equipo.length === 0) return false;
              return equipo.some((m: any) => {
                const mEmail = (m.email || '').toLowerCase().trim();
                const mId = String(m.id || m.idPerson || m.idTercero || '').toLowerCase();
                const mIdPerson = String(m.idPerson || m.idTercero || m.id || '').toLowerCase();
                return (userEmail && mEmail === userEmail)
                  || (userId && (mId === userId || mIdPerson === userId));
              });
            });
          } catch (filterErr) {
            console.warn('[usePlanAnualVigencia] Error filtrando por equipo_aprobacion:', filterErr);
            // Fallback: mostrar todos los planes en estados razonables
            datosFiltrados = resp.data;
          }
        }

        let lista = datosFiltrados
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
  }, [esSoloComite]);

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
