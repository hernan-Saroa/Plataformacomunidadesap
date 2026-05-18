/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CUSTOM HOOKS - PLAN ANUAL DE AUDITORÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Hooks de React que encapsulan toda la lógica de estado y comunicación.
 * El componente frontend solo necesita importar el hook y usarlo.
 * 
 * Ejemplo de uso:
 * ```typescript
 * const { plan, loading, error, refetch } = usePlanAnualByYear(2026);
 * const { auditores } = useAuditores();
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import {
  PlanAnual,
  Rol,
  Actividad,
  Auditor,
  EstadisticasPlan,
  CreatePlanAnualDto,
  UpdatePlanAnualDto,
  CreateActividadDto,
  UpdateActividadDto,
  EstadoPlan,
  EstadoActividad,
} from './types';
import { planAnualApi, actividadesApi, auditoresApi, estadisticasApi } from './api';
import { configuracionesProfesionalesOCIApi } from '../api';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA HOOKS
// ═══════════════════════════════════════════════════════════════════════════

interface UseQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | null>;
  loading: boolean;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: PLAN ANUAL POR AÑO (Principal)
// ═══════════════════════════════════════════════════════════════════════════

export function usePlanAnualByYear(year: number): UseQueryResult<PlanAnual> & {
  estadisticas: EstadisticasPlan | null;
  updateEstado: (estado: EstadoPlan) => Promise<boolean>;
} {
  const [data, setData] = useState<PlanAnual | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await planAnualApi.getByYear(year);

    if (response.success) {
      setData(response.data || null); // Puede ser null si no existe plan para ese año
    } else {
      setError(response.error || 'Error al cargar el plan anual');
      // No mostrar toast en error 404 (plan no existe aún)
      if (!response.error?.includes('404')) {
        toast.error(response.error || 'Error al cargar el plan anual');
      }
    }

    setLoading(false);
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular estadísticas localmente
  const estadisticas = useMemo(() => {
    if (!data) return null;
    return estadisticasApi.calcularDesdeplan(data);
  }, [data]);

  // Función para actualizar estado del plan
  const updateEstado = async (estado: EstadoPlan): Promise<boolean> => {
    if (!data) return false;
    
    const response = await planAnualApi.update(data.id, { estado });
    
    if (response.success) {
      toast.success(`Plan actualizado a estado: ${estado}`);
      await fetchData(); // Refrescar
      return true;
    } else {
      toast.error(response.error || 'Error al actualizar estado');
      return false;
    }
  };

  return { data, loading, error, refetch: fetchData, estadisticas, updateEstado };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: PLAN ANUAL POR ID
// ═══════════════════════════════════════════════════════════════════════════

export function usePlanAnualById(id: string | null): UseQueryResult<PlanAnual> {
  const [data, setData] = useState<PlanAnual | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await planAnualApi.getById(id);

    if (response.success && response.data) {
      setData(response.data);
    } else {
      setError(response.error || 'Error al cargar el plan');
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: TODOS LOS PLANES ANUALES
// ═══════════════════════════════════════════════════════════════════════════

export function usePlanesAnuales(): UseQueryResult<PlanAnual[]> {
  const [data, setData] = useState<PlanAnual[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await planAnualApi.getAll();

    if (response.success && response.data) {
      setData(response.data);
    } else {
      setError(response.error || 'Error al cargar planes');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: CREAR PLAN ANUAL
// ═══════════════════════════════════════════════════════════════════════════

export function useCreatePlanAnual(): UseMutationResult<PlanAnual, CreatePlanAnualDto> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data: CreatePlanAnualDto): Promise<PlanAnual | null> => {
    setLoading(true);
    setError(null);

    const response = await planAnualApi.create(data);

    setLoading(false);

    if (response.success && response.data) {
      toast.success(`Plan Anual ${data.año} creado exitosamente`);
      return response.data;
    } else {
      const errorMsg = response.error || 'Error al crear el plan';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }
  };

  return { mutate, loading, error };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: AUDITORES (Para asignar responsables)
// ═══════════════════════════════════════════════════════════════════════════

export function useAuditores(): UseQueryResult<Auditor[]> {
  const [data, setData] = useState<Auditor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    // ⚡ NUEVO: Cargar los profesionales explícitamente configurados en el módulo OCI
    const response = await configuracionesProfesionalesOCIApi.getAll();

    if (response.success && response.data) {
      const profesionales = response.data
        .filter((config: any) => config.activo !== false)
        .map((config: any) => {
          const rawRole = String(config.rolOcig || config.rolOCI || config.rol_ocig || config.cargo || 'Auditor');
          return {
            id: String(config.idTercero || config.id), // UUID de la persona
            nombre: config.nombre || `Profesional ${config.idTercero?.substring(0,6) || config.id?.substring(0,6)}`,
            cargo: rawRole,
            email: config.email || ''
          };
        });
      console.log('⚡ [useAuditores] Profesionales mapeados:', profesionales);
      setData(profesionales);
    } else {
      setData([]);
      if (response.error && (String(response.error).includes('403') || String(response.error).includes('No tienes permisos') || String(response.error).includes('Forbidden'))) {
        console.info('[useAuditores] Carga de configuraciones OCI omitida por diseño de permisos del usuario actual.');
      } else {
        console.warn('Endpoint de configuraciones OCI no disponible:', response.error);
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: GESTIÓN DE ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

interface UseActividadesResult {
  createActividad: (rolId: string, data: CreateActividadDto) => Promise<Actividad | null>;
  updateActividad: (actividadId: string, data: UpdateActividadDto) => Promise<Actividad | null>;
  deleteActividad: (actividadId: string) => Promise<boolean>;
  updateProgress: (actividadId: string, porcentaje: number) => Promise<boolean>;
  updateStatus: (actividadId: string, estado: EstadoActividad) => Promise<boolean>;
  loading: boolean;
}

export function useActividadesMutations(onSuccess?: () => void): UseActividadesResult {
  const [loading, setLoading] = useState(false);

  const createActividad = async (rolId: string, data: CreateActividadDto): Promise<Actividad | null> => {
    setLoading(true);
    const response = await actividadesApi.create(rolId, data);
    setLoading(false);

    if (response.success && response.data) {
      toast.success('Actividad creada exitosamente');
      onSuccess?.();
      return response.data;
    } else {
      toast.error(response.error || 'Error al crear actividad');
      return null;
    }
  };

  const updateActividad = async (actividadId: string, data: UpdateActividadDto): Promise<Actividad | null> => {
    setLoading(true);
    const response = await actividadesApi.update(actividadId, data);
    setLoading(false);

    if (response.success && response.data) {
      toast.success('Actividad actualizada');
      onSuccess?.();
      return response.data;
    } else {
      toast.error(response.error || 'Error al actualizar actividad');
      return null;
    }
  };

  const deleteActividad = async (actividadId: string): Promise<boolean> => {
    setLoading(true);
    const response = await actividadesApi.delete(actividadId);
    setLoading(false);

    if (response.success) {
      toast.success('Actividad eliminada');
      onSuccess?.();
      return true;
    } else {
      toast.error(response.error || 'Error al eliminar actividad');
      return false;
    }
  };

  const updateProgress = async (actividadId: string, porcentaje: number): Promise<boolean> => {
    const response = await actividadesApi.updateProgress(actividadId, porcentaje);

    if (response.success) {
      onSuccess?.();
      return true;
    } else {
      toast.error(response.error || 'Error al actualizar progreso');
      return false;
    }
  };

  const updateStatus = async (actividadId: string, estado: EstadoActividad): Promise<boolean> => {
    const response = await actividadesApi.updateStatus(actividadId, estado);

    if (response.success) {
      toast.success(`Estado cambiado a: ${estado}`);
      onSuccess?.();
      return true;
    } else {
      toast.error(response.error || 'Error al cambiar estado');
      return false;
    }
  };

  return {
    createActividad,
    updateActividad,
    deleteActividad,
    updateProgress,
    updateStatus,
    loading,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK COMBINADO: PLAN ANUAL COMPLETO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook que combina todo lo necesario para el componente PlanAnualAuditoriaDefinitivo
 * 
 * Uso:
 * ```typescript
 * const {
 *   plan, auditores, estadisticas,
 *   loading, error,
 *   refetch,
 *   createActividad, updateActividad, deleteActividad
 * } = usePlanAnualCompleto(2026);
 * ```
 */
export function usePlanAnualCompleto(year: number) {
  const planQuery = usePlanAnualByYear(year);
  const auditoresQuery = useAuditores();
  const mutations = useActividadesMutations(planQuery.refetch);

  return {
    // Datos
    plan: planQuery.data,
    auditores: auditoresQuery.data || [],
    estadisticas: planQuery.estadisticas,
    
    // Estados (loadingPlan / loadingAuditores evitan bloquear toda la UI mientras cargan auditores)
    loading: planQuery.loading || auditoresQuery.loading,
    loadingPlan: planQuery.loading,
    loadingAuditores: auditoresQuery.loading,
    error: planQuery.error || auditoresQuery.error,
    
    // Acciones
    refetch: planQuery.refetch,
    updateEstado: planQuery.updateEstado,
    ...mutations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOK: GUARDAR EVIDENCIAS (ADJUNTOS Y OBSERVACIONES)
// ═══════════════════════════════════════════════════════════════════════════

import { adjuntosApi, actividadesExtendidoApi } from './api';
import type { AdjuntoActividad, CreateAdjuntoDto, UpdateActividadExtendidoDto } from './types';

interface ArchivoLocal {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
  esNuevo?: boolean; // true si es archivo nuevo que hay que subir al backend
}

export function useSaveEvidencias() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Guarda evidencias de una actividad en el backend
   * @param actividadId - UUID de la actividad (string)
   * @param adjuntos - Lista de adjuntos actuales
   * @param adjuntosOriginales - Lista de adjuntos antes de editar (para detectar eliminados)
   * @param observaciones - Texto de observaciones
   * @returns Promise con booleano de éxito
   */
  const guardar = useCallback(async (
    actividadId: string,
    adjuntos: ArchivoLocal[],
    adjuntosOriginales: ArchivoLocal[],
    observaciones: string
  ): Promise<boolean> => {
    // Si el ID no es UUID válido (es número local), solo retornar éxito sin llamar backend
    const isUUID = typeof actividadId === 'string' && actividadId.length >= 32;
    if (!isUUID) {
      return true;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Actualizar observaciones de la actividad
      const updateResponse = await actividadesExtendidoApi.updateCompleto(actividadId, {
        observaciones,
      });

      if (!updateResponse.success) {
        throw new Error(updateResponse.error || 'Error actualizando observaciones');
      }

      // 2. Detectar adjuntos eliminados (estaban en originales pero ya no están)
      const idsActuales = new Set(adjuntos.map(a => a.id));
      const adjuntosEliminados = adjuntosOriginales.filter(a => !idsActuales.has(a.id));

      // 3. Eliminar adjuntos del backend
      for (const adj of adjuntosEliminados) {
        // Solo eliminar si tiene ID de backend (UUID)
        if (adj.id.length >= 32) {
          await adjuntosApi.delete(adj.id);
        }
      }

      // 4. Crear adjuntos nuevos en el backend
      const adjuntosNuevos = adjuntos.filter(a => a.esNuevo);
      console.log('[ADJUNTOS] Adjuntos nuevos a crear:', adjuntosNuevos.length);
      for (const adj of adjuntosNuevos) {
        const payload = {
          nombre: adj.nombre,
          tipo: adj.tipo,
          tamanio: adj.tamaño,
          cargadoPor: adj.cargadoPor,
          url: adj.url,
        };
        console.log('[ADJUNTOS] Creando adjunto:', { actividadId, payload });
        const result = await adjuntosApi.create(actividadId, payload);
        console.log('[ADJUNTOS] Resultado:', result);
      }

      toast.success('Evidencias guardadas correctamente');
      setLoading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error guardando evidencias';
      setError(errorMsg);
      toast.error(errorMsg);
      setLoading(false);
      return false;
    }
  }, []);

  return {
    guardar,
    loading,
    error,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  usePlanAnualByYear,
  usePlanAnualById,
  usePlanesAnuales,
  useCreatePlanAnual,
  useAuditores,
  useActividadesMutations,
  usePlanAnualCompleto,
  useSaveEvidencias,
};
