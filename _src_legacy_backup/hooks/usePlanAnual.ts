/**
 * ============================================
 * HOOK: usePlanAnual
 * ============================================
 * 
 * Custom hook para gestión del Plan Anual de Auditoría con:
 * - Validación automática Decreto 648/2017 (5 roles)
 * - Cálculo de indicadores por rol
 * - Exportación a PDF y Excel
 * - Aprobación con acta CICC
 * 
 * FECHA: 30 Enero 2025
 * VERSIÓN: 2.0 - FASE 2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner@2.0.3';
import type {
  PlanAnual,
  CreatePlanAnualDTO,
  UpdatePlanAnualDTO,
  IndicadorPlanAnual,
  PlanEstado
} from '@/types/ocig.types';
import { ValidadorNormativoOCIG } from '@/utils/validaciones-normativas';
import { useAuditLog } from '@/utils/audit-log-service';
import { DECRETO_648_ROLES } from '@/utils/validaciones-normativas';

// ============================================
// API SIMULADA
// ============================================

const API_BASE = '/api/v1/plan-anual';

async function fetchPlanes(): Promise<PlanAnual[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Error al cargar planes');
  return response.json();
}

async function fetchPlanPorVigencia(vigencia: number): Promise<PlanAnual> {
  const response = await fetch(`${API_BASE}/${vigencia}`);
  if (!response.ok) throw new Error('Plan no encontrado');
  return response.json();
}

async function fetchPlanById(id: string): Promise<PlanAnual> {
  const response = await fetch(`${API_BASE}/id/${id}`);
  if (!response.ok) throw new Error('Plan no encontrado');
  return response.json();
}

async function createPlan(data: CreatePlanAnualDTO): Promise<PlanAnual> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al crear plan');
  return response.json();
}

async function updatePlan(id: string, data: UpdatePlanAnualDTO): Promise<PlanAnual> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Error al actualizar plan');
  return response.json();
}

async function aprobarPlan(id: string, actaCICC: string): Promise<PlanAnual> {
  const response = await fetch(`${API_BASE}/${id}/aprobar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actaCICC })
  });
  if (!response.ok) throw new Error('Error al aprobar plan');
  return response.json();
}

async function fetchIndicadores(id: string): Promise<IndicadorPlanAnual[]> {
  const response = await fetch(`${API_BASE}/${id}/indicadores`);
  if (!response.ok) throw new Error('Error al cargar indicadores');
  return response.json();
}

async function exportarPDF(id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/${id}/exportar-pdf`);
  if (!response.ok) throw new Error('Error al exportar PDF');
  return response.blob();
}

async function exportarExcel(id: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/${id}/exportar-excel`);
  if (!response.ok) throw new Error('Error al exportar Excel');
  return response.blob();
}

// ============================================
// QUERY KEYS
// ============================================

export const planAnualKeys = {
  all: ['plan-anual'] as const,
  lists: () => [...planAnualKeys.all, 'list'] as const,
  list: () => [...planAnualKeys.lists()] as const,
  details: () => [...planAnualKeys.all, 'detail'] as const,
  detail: (id: string) => [...planAnualKeys.details(), id] as const,
  vigencia: (vigencia: number) => [...planAnualKeys.all, 'vigencia', vigencia] as const,
  indicadores: (id: string) => [...planAnualKeys.detail(id), 'indicadores'] as const,
  actual: () => [...planAnualKeys.all, 'actual'] as const
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function usePlanAnual(vigencia?: number) {
  const queryClient = useQueryClient();
  const { registrarCreacion, registrarActualizacion, registrarAprobacion } = useAuditLog();

  const vigenciaActual = vigencia || new Date().getFullYear();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY: Plan por vigencia
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const {
    data: plan,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: planAnualKeys.vigencia(vigenciaActual),
    queryFn: () => fetchPlanPorVigencia(vigenciaActual),
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 60 * 60 * 1000, // 1 hora
    retry: 2
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // QUERY: Indicadores del plan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const {
    data: indicadores,
    isLoading: isLoadingIndicadores
  } = useQuery({
    queryKey: planAnualKeys.indicadores(plan?.id || ''),
    queryFn: () => fetchIndicadores(plan!.id),
    enabled: !!plan?.id,
    staleTime: 5 * 60 * 1000
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Crear plan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const crear = useMutation({
    mutationFn: async (data: CreatePlanAnualDTO) => {
      // ✅ VALIDAR DECRETO 648/2017 ANTES DE CREAR
      ValidadorNormativoOCIG.decreto648.validarPlanAnual(data.roles);

      return createPlan(data);
    },
    onSuccess: async (nuevoPlan) => {
      // Invalidar caché
      queryClient.invalidateQueries({ queryKey: planAnualKeys.lists() });
      queryClient.invalidateQueries({ queryKey: planAnualKeys.vigencia(nuevoPlan.vigencia) });

      // Registrar en audit log
      await registrarCreacion('plan_anual', nuevoPlan.id, nuevoPlan, {
        vigencia: nuevoPlan.vigencia,
        rolesCount: nuevoPlan.roles.length
      });

      toast.success(`Plan Anual ${nuevoPlan.vigencia} creado exitosamente`, {
        description: '5 roles del Decreto 648/2017 validados correctamente'
      });
    },
    onError: (error) => {
      toast.error('Error al crear Plan Anual', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Actualizar plan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const actualizar = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePlanAnualDTO }) => {
      // Si se actualizan roles, validar Decreto 648
      if (data.roles) {
        ValidadorNormativoOCIG.decreto648.validarPlanAnual(data.roles as any);
      }

      return updatePlan(id, data);
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: planAnualKeys.detail(id) });
      
      const previousPlan = queryClient.getQueryData(planAnualKeys.detail(id));

      // Optimistic update
      queryClient.setQueryData(
        planAnualKeys.detail(id),
        (old: PlanAnual | undefined) => (old ? { ...old, ...data } : old)
      );

      return { previousPlan };
    },
    onSuccess: async (planActualizado, { id }) => {
      queryClient.invalidateQueries({ queryKey: planAnualKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planAnualKeys.vigencia(planActualizado.vigencia) });
      queryClient.invalidateQueries({ queryKey: planAnualKeys.indicadores(id) });

      await registrarActualizacion('plan_anual', id, {}, planActualizado);

      toast.success('Plan Anual actualizado');
    },
    onError: (error, { id }, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(planAnualKeys.detail(id), context.previousPlan);
      }
      toast.error('Error al actualizar', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Aprobar plan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const aprobar = useMutation({
    mutationFn: async ({ id, actaCICC }: { id: string; actaCICC: string }) => {
      // Obtener plan actual para validar
      const planActual = queryClient.getQueryData<PlanAnual>(planAnualKeys.detail(id));
      
      if (!planActual) {
        throw new Error('Plan no encontrado en caché');
      }

      // ✅ VALIDAR DECRETO 648 ANTES DE APROBAR
      ValidadorNormativoOCIG.decreto648.validarPlanAnual(planActual.roles);

      return aprobarPlan(id, actaCICC);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: planAnualKeys.detail(id) });
      
      const previousPlan = queryClient.getQueryData(planAnualKeys.detail(id));

      // Optimistic update
      queryClient.setQueryData(
        planAnualKeys.detail(id),
        (old: PlanAnual | undefined) => 
          old ? { ...old, estado: 'APROBADO' as PlanEstado, fechaAprobacion: new Date() } : old
      );

      return { previousPlan };
    },
    onSuccess: async (planAprobado, { id, actaCICC }) => {
      queryClient.invalidateQueries({ queryKey: planAnualKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planAnualKeys.vigencia(planAprobado.vigencia) });

      await registrarAprobacion('plan_anual', id, {
        actaCICC,
        fechaAprobacion: new Date(),
        rolesValidados: 5
      });

      toast.success(`Plan Anual ${planAprobado.vigencia} aprobado`, {
        description: `Acta CICC: ${actaCICC}`,
        duration: 5000
      });
    },
    onError: (error, { id }, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(planAnualKeys.detail(id), context.previousPlan);
      }
      toast.error('Error al aprobar Plan Anual', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Exportar PDF
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const descargarPDF = useMutation({
    mutationFn: async (id: string) => {
      const blob = await exportarPDF(id);
      return blob;
    },
    onSuccess: (blob, id) => {
      // Crear URL temporal y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plan_Anual_${vigenciaActual}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF descargado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al generar PDF', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MUTATION: Exportar Excel
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const descargarExcel = useMutation({
    mutationFn: async (id: string) => {
      const blob = await exportarExcel(id);
      return blob;
    },
    onSuccess: (blob, id) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plan_Anual_${vigenciaActual}_EMFO001.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Excel EMFO001 descargado');
    },
    onError: (error) => {
      toast.error('Error al generar Excel', {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FUNCIONES AUXILIARES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const validarRolesDecreto648 = () => {
    if (!plan) return false;
    
    try {
      ValidadorNormativoOCIG.decreto648.validarPlanAnual(plan.roles);
      return true;
    } catch {
      return false;
    }
  };

  const getRolesPendientes = () => {
    if (!plan) return [];
    
    return plan.roles.filter(rol => {
      const totalActividades = rol.actividades.length;
      const completadas = rol.actividades.filter(a => a.estado === 'COMPLETADA').length;
      return completadas < totalActividades;
    });
  };

  const getPorcentajeAvance = () => {
    if (!indicadores || indicadores.length === 0) return 0;
    
    const promedioRoles = indicadores.reduce(
      (sum, ind) => sum + ind.porcentajeCumplimiento,
      0
    ) / indicadores.length;
    
    return Math.round(promedioRoles);
  };

  const getRolPorNumero = (numero: number) => {
    return plan?.roles.find(r => r.numero === numero);
  };

  const inicializarConRolesDecreto = (): CreatePlanAnualDTO => {
    return {
      vigencia: vigenciaActual,
      roles: DECRETO_648_ROLES.map(rol => ({
        numero: rol.numero,
        nombre: rol.nombre,
        descripcion: rol.descripcion,
        articulo: rol.articulo,
        actividades: []
      }))
    };
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RETURN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return {
    // Data
    plan,
    indicadores,
    isLoading,
    isLoadingIndicadores,
    isError,
    error,

    // Mutations
    crear: crear.mutateAsync,
    actualizar: actualizar.mutateAsync,
    aprobar: aprobar.mutateAsync,
    descargarPDF: descargarPDF.mutateAsync,
    descargarExcel: descargarExcel.mutateAsync,

    // Estados de mutations
    isCreando: crear.isPending,
    isActualizando: actualizar.isPending,
    isAprobando: aprobar.isPending,
    isDescargandoPDF: descargarPDF.isPending,
    isDescargandoExcel: descargarExcel.isPending,

    // Utilidades
    refetch,
    validarRolesDecreto648,
    getRolesPendientes,
    getPorcentajeAvance,
    getRolPorNumero,
    inicializarConRolesDecreto
  };
}

// ============================================
// HOOK: Lista de todos los planes
// ============================================

export function usePlanesAnuales() {
  const queryClient = useQueryClient();

  const {
    data: planes,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: planAnualKeys.list(),
    queryFn: fetchPlanes,
    staleTime: 15 * 60 * 1000, // 15 minutos
    cacheTime: 60 * 60 * 1000 // 1 hora
  });

  const getPlanActual = () => {
    const añoActual = new Date().getFullYear();
    return planes?.find(p => p.vigencia === añoActual);
  };

  const getPlanesAnteriores = () => {
    const añoActual = new Date().getFullYear();
    return planes?.filter(p => p.vigencia < añoActual).sort((a, b) => b.vigencia - a.vigencia);
  };

  return {
    planes: planes || [],
    isLoading,
    isError,
    error,
    getPlanActual,
    getPlanesAnteriores
  };
}

export default usePlanAnual;
