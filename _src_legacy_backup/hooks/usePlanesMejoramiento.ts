/**
 * ============================================
 * HOOK: usePlanesMejoramiento
 * ============================================
 * 
 * Custom hook para gestión de Planes de Mejoramiento con:
 * - Fórmulas EMFO002 (cumplimiento y efectividad)
 * - Seguimiento trimestral automático
 * - Alertas 7 días antes de cortes
 * - Validación de evidencias
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 2.0 - FASE 2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner@2.0.3';
import type {
  PlanMejoramiento,
  AccionCorrectiva,
  SeguimientoPlanMejora,
  CreatePlanMejoramientoDTO,
  CreateSeguimientoDTO,
  ValidarEvidenciaDTO,
  FiltroPlanMejoramiento,
  EstadoPlanMejora
} from '@/types/ocig.types';
import { ValidadorNormativoOCIG } from '@/utils/validaciones-normativas';
import { useAuditLog } from '@/utils/audit-log-service';

// ============================================
// API SIMULADA
// ============================================

const API_BASE = '/api/v1/planes-mejora';

async function fetchPlanes(filtros?: FiltroPlanMejoramiento): Promise<PlanMejoramiento[]> {
  const params = new URLSearchParams();
  if (filtros?.estado?.length) params.append('estado', filtros.estado.join(','));
  if (filtros?.areaAuditada) params.append('area', filtros.areaAuditada);

  const response = await fetch(`${API_BASE}?${params.toString()}`);
  if (!response.ok) throw new Error('Error al cargar planes');
  return response.json();
}

async function fetchPlanById(id: string): Promise<PlanMejoramiento> {
  const response = await fetch(`${API_BASE}/${id}`);
  if (!response.ok) throw new Error('Plan no encontrado');
  return response.json();
}

async function createPlan(data: CreatePlanMejoramientoDTO): Promise<PlanMejoramiento> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al crear plan');
  return response.json();
}

async function createSeguimiento(data: CreateSeguimientoDTO): Promise<SeguimientoPlanMejora> {
  const response = await fetch(`${API_BASE}/${data.planMejoraId}/seguimiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al crear seguimiento');
  return response.json();
}

async function validarEvidencia(data: ValidarEvidenciaDTO): Promise<void> {
  const response = await fetch(`${API_BASE}/evidencia/${data.evidenciaId}/validar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al validar evidencia');
}

async function actualizarCumplimiento(
  accionId: string,
  cantidadImplementada: number
): Promise<AccionCorrectiva> {
  const response = await fetch(`${API_BASE}/accion/${accionId}/cumplimiento`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cantidadImplementada })
  });
  if (!response.ok) throw new Error('Error al actualizar cumplimiento');
  return response.json();
}

async function fetchSeguimientosPendientes(): Promise<SeguimientoPlanMejora[]> {
  const response = await fetch(`${API_BASE}/seguimientos/pendientes`);
  if (!response.ok) throw new Error('Error al cargar seguimientos');
  return response.json();
}

async function fetchProximosVencimientos(dias: number = 7): Promise<SeguimientoPlanMejora[]> {
  const response = await fetch(`${API_BASE}/seguimientos/proximos/${dias}`);
  if (!response.ok) throw new Error('Error al cargar vencimientos');
  return response.json();
}

// ============================================
// QUERY KEYS
// ============================================

export const planMejoraKeys = {
  all: ['planes-mejora'] as const,
  lists: () => [...planMejoraKeys.all, 'list'] as const,
  list: (filtros?: FiltroPlanMejoramiento) => [...planMejoraKeys.lists(), filtros] as const,
  details: () => [...planMejoraKeys.all, 'detail'] as const,
  detail: (id: string) => [...planMejoraKeys.details(), id] as const,
  seguimientos: () => [...planMejoraKeys.all, 'seguimientos'] as const,
  seguimientosPendientes: () => [...planMejoraKeys.seguimientos(), 'pendientes'] as const,
  proximosVencimientos: (dias: number) => [...planMejoraKeys.seguimientos(), 'proximos', dias] as const
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function usePlanesMejoramiento(filtros?: FiltroPlanMejoramiento) {
  const queryClient = useQueryClient();
  const { registrarCreacion, registrarActualizacion, registrarValidacionEvidencia } = useAuditLog();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY: Listar planes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const {
    data: planes,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: planMejoraKeys.list(filtros),
    queryFn: () => fetchPlanes(filtros),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY: Seguimientos pendientes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const {
    data: seguimientosPendientes,
    isLoading: isLoadingSeguimientos
  } = useQuery({
    queryKey: planMejoraKeys.seguimientosPendientes(),
    queryFn: fetchSeguimientosPendientes,
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000 // Refetch cada 5 minutos
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY: Próximos vencimientos (7 días)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const {
    data: proximosVencimientos,
    isLoading: isLoadingVencimientos
  } = useQuery({
    queryKey: planMejoraKeys.proximosVencimientos(7),
    queryFn: () => fetchProximosVencimientos(7),
    staleTime: 10 * 60 * 1000 // 10 minutos
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Crear plan de mejoramiento
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const crear = useMutation({
    mutationFn: createPlan,
    onSuccess: async (plan) => {
      queryClient.invalidateQueries({ queryKey: planMejoraKeys.lists() });

      await registrarCreacion('plan_mejoramiento', plan.id, plan, {
        auditoriaId: plan.auditoriaId,
        accionesCount: plan.acciones.length
      });

      toast.success('Plan de Mejoramiento creado', {
        description: `${plan.acciones.length} acciones correctivas registradas`
      });
    },
    onError: (error) => {
      toast.error('Error al crear plan', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Crear seguimiento trimestral
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const crearSeguimiento = useMutation({
    mutationFn: createSeguimiento,
    onSuccess: async (seguimiento, variables) => {
      queryClient.invalidateQueries({ queryKey: planMejoraKeys.detail(variables.planMejoraId) });
      queryClient.invalidateQueries({ queryKey: planMejoraKeys.seguimientosPendientes() });

      toast.success(`Seguimiento ${seguimiento.mesSeguimiento} creado`, {
        description: `Corte: ${new Date(seguimiento.fechaCorte).toLocaleDateString()}`
      });
    },
    onError: (error) => {
      toast.error('Error al crear seguimiento', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Actualizar cumplimiento de acción
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const actualizarAccion = useMutation({
    mutationFn: ({ accionId, cantidad }: { accionId: string; cantidad: number }) =>
      actualizarCumplimiento(accionId, cantidad),
    onMutate: async ({ accionId, cantidad }) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: planMejoraKeys.lists() });

      const previousPlanes = queryClient.getQueryData(planMejoraKeys.list(filtros));

      // Optimistic update con cálculo de cumplimiento
      queryClient.setQueryData(
        planMejoraKeys.list(filtros),
        (old: PlanMejoramiento[] = []) =>
          old.map(plan => ({
            ...plan,
            acciones: plan.acciones.map(accion => {
              if (accion.id === accionId) {
                // ✅ APLICAR FÓRMULA EMFO002
                const cumplimiento = ValidadorNormativoOCIG.formulas.calcularCumplimiento(
                  cantidad,
                  accion.cantidadProgramada
                );

                return {
                  ...accion,
                  cantidadImplementada: cantidad,
                  cumplimiento
                };
              }
              return accion;
            })
          }))
      );

      return { previousPlanes };
    },
    onSuccess: async (accionActualizada) => {
      queryClient.invalidateQueries({ queryKey: planMejoraKeys.lists() });

      // Calcular semáforo
      const porcentaje = (accionActualizada.cantidadImplementada / accionActualizada.cantidadProgramada) * 100;
      const semaforo = ValidadorNormativoOCIG.formulas.getSemaforo(porcentaje);

      const mensajes = {
        VERDE: '✅ Cumplimiento satisfactorio',
        AMARILLO: '⚠️ Cumplimiento parcial',
        ROJO: '❌ Requiere atención'
      };

      toast.success('Cumplimiento actualizado', {
        description: mensajes[semaforo]
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlanes) {
        queryClient.setQueryData(planMejoraKeys.list(filtros), context.previousPlanes);
      }
      toast.error('Error al actualizar', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Validar evidencia (OCI)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validarEvidenciaOCI = useMutation({
    mutationFn: validarEvidencia,
    onSuccess: async (_, variables) => {
      await registrarValidacionEvidencia(
        variables.evidenciaId,
        variables.calificacion,
        variables.comentariosAuditor
      );

      queryClient.invalidateQueries({ queryKey: planMejoraKeys.lists() });

      const mensajes = {
        ACEPTADA: 'Evidencia aceptada',
        CON_OBSERVACIONES: 'Evidencia aceptada con observaciones',
        RECHAZADA: 'Evidencia rechazada',
        PENDIENTE: 'Evidencia marcada como pendiente'
      };

      toast.success(mensajes[variables.calificacion] || 'Evidencia validada');
    },
    onError: (error) => {
      toast.error('Error al validar evidencia', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCIONES AUXILIARES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const getPlanesPorEstado = (estado: EstadoPlanMejora) => {
    return planes?.filter(p => p.estado === estado) || [];
  };

  const contarPorCumplimiento = () => {
    const conteo = { completos: 0, parciales: 0, pendientes: 0 };

    planes?.forEach(plan => {
      plan.acciones.forEach(accion => {
        if (accion.cumplimiento === 2) conteo.completos++;
        else if (accion.cumplimiento === 1) conteo.parciales++;
        else conteo.pendientes++;
      });
    });

    return conteo;
  };

  const calcularPorcentajeGeneral = () => {
    if (!planes || planes.length === 0) return 0;

    const totalAcciones = planes.reduce((sum, p) => sum + p.acciones.length, 0);
    if (totalAcciones === 0) return 0;

    const totalImplementadas = planes.reduce(
      (sum, p) =>
        sum +
        p.acciones.reduce((accSum, acc) => accSum + acc.cantidadImplementada, 0),
      0
    );
    const totalProgramadas = planes.reduce(
      (sum, p) =>
        sum +
        p.acciones.reduce((accSum, acc) => accSum + acc.cantidadProgramada, 0),
      0
    );

    return totalProgramadas > 0 ? Math.round((totalImplementadas / totalProgramadas) * 100) : 0;
  };

  const getSemaforoGeneral = () => {
    const porcentaje = calcularPorcentajeGeneral();
    return ValidadorNormativoOCIG.formulas.getSemaforo(porcentaje);
  };

  const getAlertasProximas = () => {
    if (!proximosVencimientos) return [];
    
    return proximosVencimientos.map(seg => {
      const diasRestantes = Math.ceil(
        (new Date(seg.fechaCorte).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      return {
        seguimiento: seg,
        diasRestantes,
        urgencia: diasRestantes <= 3 ? 'ALTA' : diasRestantes <= 5 ? 'MEDIA' : 'BAJA'
      };
    });
  };

  const calcularEfectividad = (controlesAplicados: boolean, situacionNoRepitio: boolean) => {
    return ValidadorNormativoOCIG.formulas.calcularEfectividad(
      controlesAplicados,
      situacionNoRepitio
    );
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RETURN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return {
    // Data
    planes: planes || [],
    seguimientosPendientes: seguimientosPendientes || [],
    proximosVencimientos: proximosVencimientos || [],
    isLoading,
    isLoadingSeguimientos,
    isLoadingVencimientos,
    isError,
    error,

    // Mutations
    crear: crear.mutateAsync,
    crearSeguimiento: crearSeguimiento.mutateAsync,
    actualizarAccion: actualizarAccion.mutateAsync,
    validarEvidencia: validarEvidenciaOCI.mutateAsync,

    // Estados de mutations
    isCreando: crear.isPending,
    isCreandoSeguimiento: crearSeguimiento.isPending,
    isActualizandoAccion: actualizarAccion.isPending,
    isValidandoEvidencia: validarEvidenciaOCI.isPending,

    // Utilidades
    refetch,
    getPlanesPorEstado,
    contarPorCumplimiento,
    calcularPorcentajeGeneral,
    getSemaforoGeneral,
    getAlertasProximas,
    calcularEfectividad
  };
}

// ============================================
// HOOK: Detalle de plan individual
// ============================================

export function usePlanMejoramiento(id: string | null) {
  const {
    data: plan,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: planMejoraKeys.detail(id!),
    queryFn: () => fetchPlanById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000
  });

  const getAccionesPorCumplimiento = (nivel: 0 | 1 | 2) => {
    return plan?.acciones.filter(a => a.cumplimiento === nivel) || [];
  };

  const getPorcentajeAvance = () => {
    if (!plan || plan.acciones.length === 0) return 0;

    const totalProgramadas = plan.acciones.reduce(
      (sum, a) => sum + a.cantidadProgramada,
      0
    );
    const totalImplementadas = plan.acciones.reduce(
      (sum, a) => sum + a.cantidadImplementada,
      0
    );

    return totalProgramadas > 0 ? Math.round((totalImplementadas / totalProgramadas) * 100) : 0;
  };

  return {
    plan,
    isLoading,
    isError,
    error,
    getAccionesPorCumplimiento,
    getPorcentajeAvance
  };
}

export default usePlanesMejoramiento;
