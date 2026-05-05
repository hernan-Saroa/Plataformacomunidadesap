/**
 * ============================================
 * HOOK: useAuditorias
 * ============================================
 * 
 * Custom hook para gestión de auditorías con:
 * - React Query para cacheo inteligente
 * - Optimistic UI en operaciones
 * - Invalidación automática de caché
 * - Manejo de errores centralizado
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 2.0 - FASE 2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner@2.0.3';
import type {
  Auditoria,
  EstadoAuditoria,
  CreateAuditoriaDTO,
  UpdateAuditoriaDTO,
  FiltrosAuditoria
} from '@/types/ocig.types';
import { ValidadorNormativoOCIG } from '@/utils/validaciones-normativas';
import { useAuditLog } from '@/utils/audit-log-service';

// ============================================
// TIPOS LOCALES
// ============================================

interface MoverAuditoriaParams {
  auditoriaId: string;
  estadoNuevo: EstadoAuditoria;
}

interface AsignarEquipoParams {
  auditoriaId: string;
  usuarioId: string;
  rol: 'LIDER' | 'AUDITOR' | 'OBSERVADOR';
}

// ============================================
// API SIMULADA (Reemplazar con fetch real)
// ============================================

const API_BASE = '/api/v1/auditorias';

async function fetchAuditorias(filtros?: FiltrosAuditoria): Promise<Auditoria[]> {
  // TODO: Reemplazar con fetch real
  const params = new URLSearchParams();
  if (filtros?.estado?.length) params.append('estado', filtros.estado.join(','));
  if (filtros?.tipo?.length) params.append('tipo', filtros.tipo.join(','));
  if (filtros?.territorial) params.append('territorial', filtros.territorial);
  if (filtros?.busqueda) params.append('q', filtros.busqueda);

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) throw new Error('Error al cargar auditorías');
  return response.json();
}

async function fetchAuditoriaById(id: string): Promise<Auditoria> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('Auditoría no encontrada');
  return response.json();
}

async function createAuditoria(data: CreateAuditoriaDTO): Promise<Auditoria> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al crear auditoría');
  return response.json();
}

async function updateAuditoria(id: string, data: UpdateAuditoriaDTO): Promise<Auditoria> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al actualizar auditoría');
  return response.json();
}

async function cambiarEstadoAuditoria(id: string, estado: EstadoAuditoria): Promise<Auditoria> {
  const response = await fetch(`${API_BASE}/${id}/estado`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
  });
  if (!response.ok) throw new Error('Error al cambiar estado');
  return response.json();
}

async function asignarMiembroEquipo(params: AsignarEquipoParams): Promise<void> {
  const response = await fetch(`${API_BASE}/${params.auditoriaId}/equipo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usuarioId: params.usuarioId,
      rol: params.rol
    })
  });
  if (!response.ok) throw new Error('Error al asignar miembro');
}

async function eliminarAuditoria(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Error al eliminar auditoría');
}

// ============================================
// QUERY KEYS
// ============================================

export const auditoriaKeys = {
  all: ['auditorias'] as const,
  lists: () => [...auditoriaKeys.all, 'list'] as const,
  list: (filtros?: FiltrosAuditoria) => [...auditoriaKeys.lists(), filtros] as const,
  details: () => [...auditoriaKeys.all, 'detail'] as const,
  detail: (id: string) => [...auditoriaKeys.details(), id] as const,
  estados: () => [...auditoriaKeys.all, 'estados'] as const,
  estadisticas: () => [...auditoriaKeys.all, 'estadisticas'] as const
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useAuditorias(filtros?: FiltrosAuditoria) {
  const queryClient = useQueryClient();
  const { registrarCambioEstado, registrarCreacion, registrarActualizacion } = useAuditLog();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY: Listar auditorías
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const {
    data: auditorias,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: auditoriaKeys.list(filtros),
    queryFn: () => fetchAuditorias(filtros),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Crear auditoría
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const crearAuditoria = useMutation({
    mutationFn: createAuditoria,
    onMutate: async (nuevaAuditoria) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: auditoriaKeys.lists() });

      // Snapshot del estado anterior
      const previousAuditorias = queryClient.getQueryData(auditoriaKeys.list(filtros));

      // Optimistic update
      queryClient.setQueryData(
        auditoriaKeys.list(filtros),
        (old: Auditoria[] = []) => [
          ...old,
          {
            ...nuevaAuditoria,
            id: `temp-${Date.now()}`,
            createdAt: new Date(),
            updatedAt: new Date()
          } as Auditoria
        ]
      );

      return { previousAuditorias };
    },
    onSuccess: async (auditoria) => {
      // Invalidar caché
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.lists() });
      
      // Registrar en audit log
      await registrarCreacion('auditoria', auditoria.id, auditoria, {
        tipo: auditoria.tipo,
        codigo: auditoria.codigo
      });

      toast.success(`Auditoría ${auditoria.codigo} creada exitosamente`, {
        description: auditoria.nombre
      });
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousAuditorias) {
        queryClient.setQueryData(auditoriaKeys.list(filtros), context.previousAuditorias);
      }

      toast.error('Error al crear auditoría', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.lists() });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Actualizar auditoría
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const actualizarAuditoria = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAuditoriaDTO }) =>
      updateAuditoria(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: auditoriaKeys.detail(id) });
      
      const previousAuditoria = queryClient.getQueryData(auditoriaKeys.detail(id));

      // Optimistic update
      queryClient.setQueryData(
        auditoriaKeys.detail(id),
        (old: Auditoria | undefined) => (old ? { ...old, ...data } : old)
      );

      return { previousAuditoria };
    },
    onSuccess: async (auditoria, { id }) => {
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.lists() });

      await registrarActualizacion('auditoria', id, {}, auditoria);

      toast.success('Auditoría actualizada');
    },
    onError: (error, { id }, context) => {
      if (context?.previousAuditoria) {
        queryClient.setQueryData(auditoriaKeys.detail(id), context.previousAuditoria);
      }
      toast.error('Error al actualizar', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Mover auditoría (Kanban)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const moverAuditoria = useMutation({
    mutationFn: async ({ auditoriaId, estadoNuevo }: MoverAuditoriaParams) => {
      // Obtener auditoría actual
      const auditoria = auditorias?.find(a => a.id === auditoriaId);
      if (!auditoria) throw new Error('Auditoría no encontrada');

      // ✅ VALIDAR TRANSICIÓN
      ValidadorNormativoOCIG.kanban.validarTransicionEstado(
        auditoria.estado,
        estadoNuevo,
        auditoria
      );

      // ✅ VALIDAR TERRITORIAL SI APLICA
      if (auditoria.esTerritorial && estadoNuevo === 'EJECUCION') {
        // Aquí validarías la duración de 4 días si es necesario
      }

      return cambiarEstadoAuditoria(auditoriaId, estadoNuevo);
    },
    onMutate: async ({ auditoriaId, estadoNuevo }) => {
      await queryClient.cancelQueries({ queryKey: auditoriaKeys.lists() });

      const previousAuditorias = queryClient.getQueryData(auditoriaKeys.list(filtros));
      const previousDetail = queryClient.getQueryData(auditoriaKeys.detail(auditoriaId));

      // Optimistic update en lista
      queryClient.setQueryData(
        auditoriaKeys.list(filtros),
        (old: Auditoria[] = []) =>
          old.map(a => (a.id === auditoriaId ? { ...a, estado: estadoNuevo } : a))
      );

      // Optimistic update en detalle
      queryClient.setQueryData(
        auditoriaKeys.detail(auditoriaId),
        (old: Auditoria | undefined) => (old ? { ...old, estado: estadoNuevo } : old)
      );

      return { previousAuditorias, previousDetail };
    },
    onSuccess: async (auditoria, { auditoriaId, estadoNuevo }) => {
      // Encontrar estado anterior
      const auditoriaAnterior = auditorias?.find(a => a.id === auditoriaId);
      const estadoAnterior = auditoriaAnterior?.estado;

      if (estadoAnterior) {
        await registrarCambioEstado(
          auditoriaId,
          estadoAnterior,
          estadoNuevo,
          auditoria.planAnualId
        );
      }

      toast.success(`Auditoría movida a ${estadoNuevo}`, {
        description: auditoria.codigo
      });

      queryClient.invalidateQueries({ queryKey: auditoriaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.detail(auditoriaId) });
    },
    onError: (error, { auditoriaId }, context) => {
      // Rollback
      if (context?.previousAuditorias) {
        queryClient.setQueryData(auditoriaKeys.list(filtros), context.previousAuditorias);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(auditoriaKeys.detail(auditoriaId), context.previousDetail);
      }

      toast.error('No se pudo mover la auditoría', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Asignar miembro al equipo
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const asignarEquipo = useMutation({
    mutationFn: asignarMiembroEquipo,
    onSuccess: (_, { auditoriaId }) => {
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.detail(auditoriaId) });
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.lists() });
      toast.success('Miembro asignado al equipo');
    },
    onError: (error) => {
      toast.error('Error al asignar miembro', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Eliminar auditoría
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const eliminar = useMutation({
    mutationFn: eliminarAuditoria,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: auditoriaKeys.lists() });
      
      const previousAuditorias = queryClient.getQueryData(auditoriaKeys.list(filtros));

      // Optimistic update - eliminar de lista
      queryClient.setQueryData(
        auditoriaKeys.list(filtros),
        (old: Auditoria[] = []) => old.filter(a => a.id !== id)
      );

      return { previousAuditorias };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: auditoriaKeys.lists() });
      queryClient.removeQueries({ queryKey: auditoriaKeys.detail(id) });
      toast.success('Auditoría eliminada');
    },
    onError: (error, _id, context) => {
      if (context?.previousAuditorias) {
        queryClient.setQueryData(auditoriaKeys.list(filtros), context.previousAuditorias);
      }
      toast.error('Error al eliminar', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCIONES AUXILIARES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const getAuditoriaPorEstado = (estado: EstadoAuditoria) => {
    return auditorias?.filter(a => a.estado === estado) || [];
  };

  const contarPorEstado = () => {
    const conteo: Record<EstadoAuditoria, number> = {
      BACKLOG: 0,
      PLANEACION: 0,
      EJECUCION: 0,
      COMUNICACION: 0,
      CERRADO: 0
    };

    auditorias?.forEach(a => {
      conteo[a.estado] = (conteo[a.estado] || 0) + 1;
    });

    return conteo;
  };

  const getTotalHallazgos = () => {
    return auditorias?.reduce((total, a) => total + (a.hallazgos?.length || 0), 0) || 0;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RETURN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return {
    // Data
    auditorias: auditorias || [],
    isLoading,
    isError,
    error,

    // Mutations
    crear: crearAuditoria.mutateAsync,
    actualizar: actualizarAuditoria.mutateAsync,
    mover: moverAuditoria.mutateAsync,
    asignarMiembro: asignarEquipo.mutateAsync,
    eliminar: eliminar.mutateAsync,

    // Estados de mutations
    isCreando: crearAuditoria.isPending,
    isActualizando: actualizarAuditoria.isPending,
    isMoviendo: moverAuditoria.isPending,
    isAsignando: asignarEquipo.isPending,
    isEliminando: eliminar.isPending,

    // Utilidades
    refetch,
    getAuditoriaPorEstado,
    contarPorEstado,
    getTotalHallazgos
  };
}

// ============================================
// HOOK: Detalle de auditoría individual
// ============================================

export function useAuditoria(id: string | null) {
  const queryClient = useQueryClient();

  const {
    data: auditoria,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: auditoriaKeys.detail(id!),
    queryFn: () => fetchAuditoriaById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  const prefetchRelacionadas = (planAnualId: string) => {
    queryClient.prefetchQuery({
      queryKey: auditoriaKeys.list({ añoVigencia: new Date().getFullYear() }),
      queryFn: () => fetchAuditorias()
    });
  };

  return {
    auditoria,
    isLoading,
    isError,
    error,
    prefetchRelacionadas
  };
}

export default useAuditorias;
