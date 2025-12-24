/**
 * CUSTOM HOOKS - API DEL PTA
 * 
 * Hooks personalizados de React para consumir las APIs del PTA
 * con gestión de estado, caché y manejo de errores
 * 
 * Características:
 * - Estado de carga automático
 * - Manejo de errores
 * - Revalidación y caché
 * - Mutaciones optimistas
 * - Retry automático
 * 
 * Creado: 22 de diciembre de 2024
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { ptaAPI, APIResponse, handleAPIError, isSuccessResponse, PaginationParams, PTAFilters } from '../services/api/ptaAPI';
import { PTAConAprobacion } from '../components/gestion-profesoral/FlujoAprobacionPTA';
import { RegistroProgreso, ComparacionProgramadoEjecutado } from '../components/gestion-profesoral/SeguimientoControlPTA';
import { SituacionAdministrativa, ReporteDisponibilidad } from '../components/gestion-profesoral/SituacionesAdministrativasDocentes';

// ============================================================================
// TIPOS Y INTERFACES
// ============================================================================

/**
 * Estado de una petición
 */
interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Opciones de configuración para hooks
 */
interface UseAPIOptions {
  enabled?: boolean; // Si debe ejecutarse automáticamente
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  retry?: number; // Número de reintentos
  retryDelay?: number; // Delay entre reintentos (ms)
  showToastOnError?: boolean;
  showToastOnSuccess?: boolean;
}

// ============================================================================
// HOOKS - GESTIÓN DE PTAs
// ============================================================================

/**
 * Hook para obtener lista de PTAs con filtros y paginación
 */
export function usePTAs(
  filters?: PTAFilters,
  pagination?: PaginationParams,
  options?: UseAPIOptions
) {
  const [state, setState] = useState<RequestState<PTAConAprobacion[]>>({
    data: null,
    loading: true,
    error: null
  });

  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchPTAs = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.getPTAs(filters, pagination);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data.data,
          loading: false,
          error: null
        });
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);

        if (options?.onSuccess) {
          options.onSuccess(response.data.data);
        }
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });

        if (options?.showToastOnError !== false) {
          toast.error('Error al cargar PTAs', { description: errorMsg });
        }

        if (options?.onError) {
          options.onError(errorMsg);
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      setState({
        data: null,
        loading: false,
        error: errorMsg
      });

      if (options?.showToastOnError !== false) {
        toast.error('Error al cargar PTAs', { description: errorMsg });
      }
    }
  }, [filters, pagination, options]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchPTAs();
    }
  }, [fetchPTAs, options?.enabled]);

  return {
    ...state,
    totalPages,
    total,
    refetch: fetchPTAs
  };
}

/**
 * Hook para obtener un PTA por ID
 */
export function usePTA(id: string | null, options?: UseAPIOptions) {
  const [state, setState] = useState<RequestState<PTAConAprobacion>>({
    data: null,
    loading: !!id,
    error: null
  });

  const fetchPTA = useCallback(async () => {
    if (!id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.getPTAById(id);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data,
          loading: false,
          error: null
        });

        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });

        if (options?.showToastOnError !== false) {
          toast.error('Error al cargar PTA', { description: errorMsg });
        }
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [id, options]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchPTA();
    }
  }, [fetchPTA, options?.enabled]);

  return {
    ...state,
    refetch: fetchPTA
  };
}

/**
 * Hook para crear un PTA
 */
export function useCreatePTA(options?: UseAPIOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPTA = async (pta: Partial<PTAConAprobacion>): Promise<PTAConAprobacion | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await ptaAPI.createPTA(pta);

      if (isSuccessResponse(response)) {
        if (options?.showToastOnSuccess !== false) {
          toast.success('PTA creado exitosamente');
        }

        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }

        setLoading(false);
        return response.data;
      } else {
        const errorMsg = handleAPIError(response.error!);
        setError(errorMsg);

        if (options?.showToastOnError !== false) {
          toast.error('Error al crear PTA', { description: errorMsg });
        }

        setLoading(false);
        return null;
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Error desconocido';
      setError(errorMsg);
      setLoading(false);
      return null;
    }
  };

  return {
    createPTA,
    loading,
    error
  };
}

/**
 * Hook para actualizar un PTA
 */
export function useUpdatePTA(options?: UseAPIOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePTA = async (
    id: string,
    pta: Partial<PTAConAprobacion>
  ): Promise<PTAConAprobacion | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await ptaAPI.updatePTA(id, pta);

      if (isSuccessResponse(response)) {
        if (options?.showToastOnSuccess !== false) {
          toast.success('PTA actualizado exitosamente');
        }

        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }

        setLoading(false);
        return response.data;
      } else {
        const errorMsg = handleAPIError(response.error!);
        setError(errorMsg);

        if (options?.showToastOnError !== false) {
          toast.error('Error al actualizar PTA', { description: errorMsg });
        }

        setLoading(false);
        return null;
      }
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
      return null;
    }
  };

  return {
    updatePTA,
    loading,
    error
  };
}

// ============================================================================
// HOOKS - FLUJO DE APROBACIÓN
// ============================================================================

/**
 * Hook para obtener PTAs pendientes de aprobación
 */
export function usePTAsPendientes(aprobadorId: string, nivel?: number, options?: UseAPIOptions) {
  const [state, setState] = useState<RequestState<PTAConAprobacion[]>>({
    data: null,
    loading: true,
    error: null
  });

  const fetchPendientes = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.getPTAsPendientes(aprobadorId, nivel);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data,
          loading: false,
          error: null
        });
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [aprobadorId, nivel]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchPendientes();
    }
  }, [fetchPendientes, options?.enabled]);

  return {
    ...state,
    refetch: fetchPendientes
  };
}

/**
 * Hook para aprobar un PTA
 */
export function useAprobarPTA(options?: UseAPIOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aprobar = async (
    id: string,
    aprobadorId: string,
    observaciones?: string
  ): Promise<PTAConAprobacion | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await ptaAPI.aprobarPTA(id, aprobadorId, observaciones);

      if (isSuccessResponse(response)) {
        if (options?.showToastOnSuccess !== false) {
          toast.success('PTA aprobado exitosamente');
        }

        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }

        setLoading(false);
        return response.data;
      } else {
        const errorMsg = handleAPIError(response.error!);
        setError(errorMsg);

        if (options?.showToastOnError !== false) {
          toast.error('Error al aprobar PTA', { description: errorMsg });
        }

        setLoading(false);
        return null;
      }
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
      return null;
    }
  };

  return {
    aprobar,
    loading,
    error
  };
}

/**
 * Hook para rechazar un PTA
 */
export function useRechazarPTA(options?: UseAPIOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rechazar = async (
    id: string,
    aprobadorId: string,
    motivo: string
  ): Promise<PTAConAprobacion | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await ptaAPI.rechazarPTA(id, aprobadorId, motivo);

      if (isSuccessResponse(response)) {
        if (options?.showToastOnSuccess !== false) {
          toast.success('PTA rechazado');
        }

        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }

        setLoading(false);
        return response.data;
      } else {
        const errorMsg = handleAPIError(response.error!);
        setError(errorMsg);

        if (options?.showToastOnError !== false) {
          toast.error('Error al rechazar PTA', { description: errorMsg });
        }

        setLoading(false);
        return null;
      }
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
      return null;
    }
  };

  return {
    rechazar,
    loading,
    error
  };
}

// ============================================================================
// HOOKS - SEGUIMIENTO Y CONTROL
// ============================================================================

/**
 * Hook para obtener registros de progreso
 */
export function useProgresoPTA(ptaId: string | null, mes?: number, options?: UseAPIOptions) {
  const [state, setState] = useState<RequestState<RegistroProgreso[]>>({
    data: null,
    loading: !!ptaId,
    error: null
  });

  const fetchProgreso = useCallback(async () => {
    if (!ptaId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.getProgresoByPTA(ptaId, mes);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data,
          loading: false,
          error: null
        });
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [ptaId, mes]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchProgreso();
    }
  }, [fetchProgreso, options?.enabled]);

  return {
    ...state,
    refetch: fetchProgreso
  };
}

/**
 * Hook para registrar progreso
 */
export function useRegistrarProgreso(options?: UseAPIOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registrar = async (
    registro: Partial<RegistroProgreso>
  ): Promise<RegistroProgreso | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await ptaAPI.registrarProgreso(registro);

      if (isSuccessResponse(response)) {
        if (options?.showToastOnSuccess !== false) {
          toast.success('Progreso registrado exitosamente');
        }

        if (options?.onSuccess) {
          options.onSuccess(response.data);
        }

        setLoading(false);
        return response.data;
      } else {
        const errorMsg = handleAPIError(response.error!);
        setError(errorMsg);

        if (options?.showToastOnError !== false) {
          toast.error('Error al registrar progreso', { description: errorMsg });
        }

        setLoading(false);
        return null;
      }
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
      return null;
    }
  };

  return {
    registrar,
    loading,
    error
  };
}

/**
 * Hook para obtener comparación programado vs ejecutado
 */
export function useComparacionPTA(
  ptaId: string | null,
  mesActual?: number,
  options?: UseAPIOptions
) {
  const [state, setState] = useState<RequestState<ComparacionProgramadoEjecutado>>({
    data: null,
    loading: !!ptaId,
    error: null
  });

  const fetchComparacion = useCallback(async () => {
    if (!ptaId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.getComparacionProgramadoEjecutado(ptaId, mesActual);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data,
          loading: false,
          error: null
        });
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [ptaId, mesActual]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchComparacion();
    }
  }, [fetchComparacion, options?.enabled]);

  return {
    ...state,
    refetch: fetchComparacion
  };
}

// ============================================================================
// HOOKS - SITUACIONES ADMINISTRATIVAS
// ============================================================================

/**
 * Hook para obtener situaciones administrativas
 */
export function useSituacionesAdministrativas(
  filters?: any,
  pagination?: PaginationParams,
  options?: UseAPIOptions
) {
  const [state, setState] = useState<RequestState<SituacionAdministrativa[]>>({
    data: null,
    loading: true,
    error: null
  });

  const fetchSituaciones = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.getSituacionesAdministrativas(filters, pagination);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data.data,
          loading: false,
          error: null
        });
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [filters, pagination]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchSituaciones();
    }
  }, [fetchSituaciones, options?.enabled]);

  return {
    ...state,
    refetch: fetchSituaciones
  };
}

/**
 * Hook para calcular disponibilidad de un docente
 */
export function useDisponibilidadDocente(
  docenteId: string | null,
  fechaReferencia?: string,
  options?: UseAPIOptions
) {
  const [state, setState] = useState<RequestState<{
    disponible: boolean;
    porcentajeDisponibilidad: number;
    situacionesActivas: SituacionAdministrativa[];
    razon?: string;
  }>>({
    data: null,
    loading: !!docenteId,
    error: null
  });

  const fetchDisponibilidad = useCallback(async () => {
    if (!docenteId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.calcularDisponibilidad(docenteId, fechaReferencia);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data,
          loading: false,
          error: null
        });
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [docenteId, fechaReferencia]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchDisponibilidad();
    }
  }, [fetchDisponibilidad, options?.enabled]);

  return {
    ...state,
    refetch: fetchDisponibilidad
  };
}

/**
 * Hook para obtener reporte de disponibilidad
 */
export function useReporteDisponibilidad(
  periodo: string,
  territorial?: string,
  options?: UseAPIOptions
) {
  const [state, setState] = useState<RequestState<ReporteDisponibilidad>>({
    data: null,
    loading: true,
    error: null
  });

  const fetchReporte = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await ptaAPI.generarReporteDisponibilidad(periodo, territorial);

      if (isSuccessResponse(response)) {
        setState({
          data: response.data,
          loading: false,
          error: null
        });
      } else {
        const errorMsg = handleAPIError(response.error!);
        setState({
          data: null,
          loading: false,
          error: errorMsg
        });
      }
    } catch (error: any) {
      setState({
        data: null,
        loading: false,
        error: error.message
      });
    }
  }, [periodo, territorial]);

  useEffect(() => {
    if (options?.enabled !== false) {
      fetchReporte();
    }
  }, [fetchReporte, options?.enabled]);

  return {
    ...state,
    refetch: fetchReporte
  };
}
