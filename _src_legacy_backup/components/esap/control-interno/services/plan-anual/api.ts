/**
 * ═══════════════════════════════════════════════════════════════════════════
 * API SERVICE - PLAN ANUAL DE AUDITORÍA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Capa de abstracción para comunicación con el backend.
 * Todos los endpoints del módulo plan-anual-5-roles.
 * 
 * Endpoints Backend:
 * - GET    /plan-anual-5-roles
 * - GET    /plan-anual-5-roles/:id
 * - GET    /plan-anual-5-roles/year/:year
 * - POST   /plan-anual-5-roles
 * - PUT    /plan-anual-5-roles/:id
 * - GET    /plan-anual-5-roles/:planId/roles
 * - POST   /plan-anual-5-roles/:rolId/actividades
 * - PUT    /plan-anual-5-roles/actividades/:actividadId
 * - DELETE /plan-anual-5-roles/actividades/:actividadId
 */

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
  ApiResponse,
  FiltrosPlanAnual,
} from './types';
import { getServiceUrl, API_MODE } from '../../../../../config/environment';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// URL base del servicio de Control Interno (puerto 3007)
const BASE_URL = getServiceUrl('control-institucional');
// En modo gateway necesita el prefijo del servicio
const API_BASE_URL = API_MODE === 'gateway' 
  ? `${BASE_URL}/control-institucional/api/v1` 
  : BASE_URL;
const PLAN_ANUAL_ENDPOINT = '/plan-anual-5-roles';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER PARA REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('esap_auth_token');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    });

    // Manejar respuestas sin contenido
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `Error ${response.status}`,
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    console.error('API Request Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión con el servidor',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API: PLAN ANUAL
// ═══════════════════════════════════════════════════════════════════════════

export const planAnualApi = {
  /**
   * Obtener todos los planes anuales
   */
  getAll: async (filtros?: FiltrosPlanAnual): Promise<ApiResponse<PlanAnual[]>> => {
    const params = new URLSearchParams();
    if (filtros?.año) params.append('year', String(filtros.año));
    if (filtros?.estado) params.append('estado', filtros.estado);
    
    const query = params.toString();
    return apiRequest<PlanAnual[]>(`${PLAN_ANUAL_ENDPOINT}${query ? `?${query}` : ''}`);
  },

  /**
   * Obtener plan anual por ID
   */
  getById: async (id: string): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/${id}`);
  },

  /**
   * Obtener plan anual por año (el más usado)
   */
  getByYear: async (year: number): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/year/${year}`);
  },

  /**
   * Crear nuevo plan anual
   */
  create: async (data: CreatePlanAnualDto): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(PLAN_ANUAL_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar plan anual (estado, responsable)
   */
  update: async (id: string, data: UpdatePlanAnualDto): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener roles de un plan
   */
  getRoles: async (planId: string): Promise<ApiResponse<Rol[]>> => {
    return apiRequest<Rol[]>(`${PLAN_ANUAL_ENDPOINT}/${planId}/roles`);
  },

  /**
   * Exportar plan a Excel (descarga archivo .xlsx)
   */
  exportExcel: async (planId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem('esap_auth_token');
      const response = await fetch(`${API_BASE_URL}${PLAN_ANUAL_ENDPOINT}/${planId}/export/excel`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return { success: false, error: data?.message || `Error ${response.status}` };
      }
      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^";]+)"?/);
      const nombre = match ? match[1] : `plan-anual-${planId}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      window.URL.revokeObjectURL(url);
      return { success: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Error al exportar' };
    }
  },

  /**
   * Obtener datos del plan para exportar a PDF (el front puede abrir vista de impresión)
   */
  exportPdfData: async (planId: string): Promise<ApiResponse<PlanAnual>> => {
    return apiRequest<PlanAnual>(`${PLAN_ANUAL_ENDPOINT}/${planId}/export/pdf`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// API: ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

export const actividadesApi = {
  /**
   * Crear nueva actividad en un rol
   */
  create: async (rolId: string, data: CreateActividadDto): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/${rolId}/actividades`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar actividad
   */
  update: async (actividadId: string, data: UpdateActividadDto): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar actividad
   */
  delete: async (actividadId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Actualizar progreso de actividad (shortcut)
   */
  updateProgress: async (actividadId: string, porcentaje: number): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify({ porcentaje_avance: porcentaje }),
    });
  },

  /**
   * Cambiar estado de actividad (shortcut)
   */
  updateStatus: async (actividadId: string, estado: string): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify({ estado }),
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// API: AUDITORES (Para asignar responsables)
// ═══════════════════════════════════════════════════════════════════════════

export const auditoresApi = {
  /**
   * Obtener lista de auditores/personas disponibles
   * Endpoint correcto: /auditorias/personas/disponibles
   */
  getAll: async (): Promise<ApiResponse<Auditor[]>> => {
    // Usar el endpoint correcto del backend de control interno
    const response = await apiRequest<any[]>('/auditorias/personas/disponibles');
    
    if (response.success && response.data) {
      // Transformar al formato Auditor del frontend
      // El backend devuelve: { id, nombre, cargo, email, ... }
      const auditores: Auditor[] = response.data.map(persona => ({
        id: String(persona.id || persona.idPersona || persona.documento),
        nombre: persona.nombre || persona.nombre_completo || `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Sin nombre',
        cargo: persona.cargo || 'Auditor',
        email: persona.email || '',
      }));
      return { success: true, data: auditores };
    }
    
    return response as ApiResponse<Auditor[]>;
  },

  /**
   * Buscar personas por término
   */
  buscar: async (termino: string): Promise<ApiResponse<Auditor[]>> => {
    const response = await apiRequest<any[]>(`/auditorias/personas/buscar?q=${encodeURIComponent(termino)}`);
    
    if (response.success && response.data) {
      const auditores: Auditor[] = response.data.map(persona => ({
        id: String(persona.id || persona.idPersona || persona.documento),
        nombre: persona.nombre || persona.nombre_completo || `${persona.nombres || ''} ${persona.apellidos || ''}`.trim() || 'Sin nombre',
        cargo: persona.cargo || 'Auditor',
        email: persona.email || '',
      }));
      return { success: true, data: auditores };
    }
    
    return response as ApiResponse<Auditor[]>;
  },

  /**
   * Obtener auditor por ID
   */
  getById: async (id: string): Promise<ApiResponse<Auditor>> => {
    return apiRequest<Auditor>(`/auditorias/personas/buscar?id=${id}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// API: ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════

export const estadisticasApi = {
  /**
   * Obtener estadísticas del plan anual
   * Nota: Si el endpoint no existe, se calculan desde el plan
   */
  getByPlanId: async (planId: string): Promise<ApiResponse<EstadisticasPlan>> => {
    return apiRequest<EstadisticasPlan>(`${PLAN_ANUAL_ENDPOINT}/${planId}/estadisticas`);
  },

  /**
   * Calcular estadísticas localmente desde un plan
   */
  calcularDesdeplan: (plan: PlanAnual): EstadisticasPlan => {
    const actividades = plan.roles.flatMap(r => r.actividades);
    
    const actividadesCompletadas = actividades.filter(a => a.estado === 'completada').length;
    const actividadesEnProgreso = actividades.filter(a => a.estado === 'en-progreso').length;
    const actividadesPendientes = actividades.filter(a => a.estado === 'pendiente').length;
    const actividadesRetrasadas = actividades.filter(a => a.estado === 'retrasada').length;
    
    const porcentajeCumplimiento = actividades.length > 0
      ? Math.round((actividadesCompletadas / actividades.length) * 100)
      : 0;

    const porcentajesPorRol = plan.roles.map(rol => ({
      rol: rol.rol_numero,
      nombre: rol.nombre,
      porcentaje: rol.porcentaje_cumplimiento,
    }));

    return {
      totalActividades: actividades.length,
      actividadesCompletadas,
      actividadesEnProgreso,
      actividadesPendientes,
      actividadesRetrasadas,
      porcentajeCumplimiento,
      porcentajesPorRol,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT UNIFICADO
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// API: ADJUNTOS DE ACTIVIDADES
// ═══════════════════════════════════════════════════════════════════════════

import type { AdjuntoActividad, CreateAdjuntoDto, UpdateActividadExtendidoDto } from './types';

export const adjuntosApi = {
  /**
   * Obtener adjuntos de una actividad
   */
  getByActividad: async (actividadId: string): Promise<ApiResponse<AdjuntoActividad[]>> => {
    return apiRequest<AdjuntoActividad[]>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}/adjuntos`);
  },

  /**
   * Agregar adjunto a una actividad
   */
  create: async (actividadId: string, data: CreateAdjuntoDto): Promise<ApiResponse<AdjuntoActividad>> => {
    return apiRequest<AdjuntoActividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}/adjuntos`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar adjunto
   */
  delete: async (adjuntoId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`${PLAN_ANUAL_ENDPOINT}/adjuntos/${adjuntoId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Guardar adjuntos y observaciones de una actividad
   * Método helper que actualiza la actividad y maneja los adjuntos
   */
  guardarEvidencias: async (
    actividadId: string,
    adjuntosNuevos: CreateAdjuntoDto[],
    adjuntosAEliminar: string[],
    observaciones: string
  ): Promise<ApiResponse<{ actividad: Actividad; adjuntos: AdjuntoActividad[] }>> => {
    try {
      // 1. Actualizar observaciones en la actividad
      const updateResponse = await actividadesApi.update(actividadId, {
        observaciones,
      });

      if (!updateResponse.success) {
        return { success: false, error: updateResponse.error };
      }

      // 2. Eliminar adjuntos marcados
      for (const adjuntoId of adjuntosAEliminar) {
        await adjuntosApi.delete(adjuntoId);
      }

      // 3. Crear nuevos adjuntos
      const adjuntosCreados: AdjuntoActividad[] = [];
      for (const adjunto of adjuntosNuevos) {
        const result = await adjuntosApi.create(actividadId, adjunto);
        if (result.success && result.data) {
          adjuntosCreados.push(result.data);
        }
      }

      // 4. Obtener lista actualizada de adjuntos
      const adjuntosResponse = await adjuntosApi.getByActividad(actividadId);

      return {
        success: true,
        data: {
          actividad: updateResponse.data!,
          adjuntos: adjuntosResponse.data || adjuntosCreados,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error guardando evidencias',
      };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVIDADES EXTENDIDO (con campos nuevos)
// ═══════════════════════════════════════════════════════════════════════════

export const actividadesExtendidoApi = {
  /**
   * Actualizar actividad con todos los campos (incluye nuevos: control, evaluacion, etc)
   */
  updateCompleto: async (actividadId: string, data: UpdateActividadExtendidoDto): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Verificar actividad por el Director OCIG
   */
  verificarPorDirector: async (
    actividadId: string,
    observaciones?: string
  ): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`${PLAN_ANUAL_ENDPOINT}/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify({
        verificadaPorDirector: true,
        fechaVerificacion: new Date().toISOString(),
        observacionesDirector: observaciones,
      }),
    });
  },
};

export const planAnualService = {
  plan: planAnualApi,
  actividades: actividadesApi,
  actividadesExtendido: actividadesExtendidoApi,
  adjuntos: adjuntosApi,
  auditores: auditoresApi,
  estadisticas: estadisticasApi,
};

export default planAnualService;
