/**
 * SERVICIOS API - MÓDULO CONTROL INTERNO
 * Capa de abstracción para comunicación con backend
 */

import {
  Auditoria,
  ProcesoAuditable,
  UniversoAuditorias,
  ProgramaAnual,
  AuditoriaProgramada,
  Hallazgo,
  PlanMejoramiento,
  AccionMejoramiento,
  EventoTimeline,
  PlanAnual5Roles,
  Actividad,
  ListaChequeo,
  InformeLey,
  ApiResponse,
  PaginatedResponse,
  AuditoriaFilters,
  HallazgoFilters,
  PlanMejoramientoFilters
} from './types';

// ==================== CONFIGURACIÓN ====================

// Usar import.meta.env para Vite (no process.env que es de Node.js)
// El backend NO tiene prefijo /esap, las rutas son directas: /auditorias, /documentos, etc.
// Ruta del gateway: /control-institucional/api/v1/auditorias
// Ruta directa: http://localhost:3007/auditorias
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const base = import.meta.env.VITE_API_URL;
    // Si ya incluye /auditorias o /esap, usarla tal cual
    if (base.includes('/auditorias') || base.includes('/esap')) {
      return base.replace(/\/esap.*$/, ''); // Remover /esap si existe
    }
    // Si incluye /control-institucional, agregar /api/v1
    if (base.includes('/control-institucional')) {
      return `${base}/api/v1`;
    }
    // Si es solo el gateway base, agregar el prefijo completo
    return `${base}/control-institucional/api/v1`;
  }
  // Fallback: intentar directo al microservicio (sin prefijo)
  return 'http://localhost:3007';
};

const API_BASE_URL = getApiBaseUrl();

// Helper para requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get JWT token from localStorage
  const token = localStorage.getItem('esap_auth_token');
  
  // Build headers with authentication
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };
  
  // Add Authorization header if token exists
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Leer el texto de la respuesta una sola vez
    const responseText = await response.text();
    
    // Verificar si la respuesta tiene contenido JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data: any = null;
    
    if (response.status === 204) {
      // No Content sin body
      data = null;
    } else if (isJson || (response.status === 201 && responseText && responseText.trim())) {
      // Intentar parsear JSON (incluyendo 201 Created que puede tener body)
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          return {
            success: false,
            error: 'Error al parsear respuesta del servidor (la respuesta no es JSON válido)' + parseError,
          };
        }
      } else {
        data = null;
      }
    } else if (responseText) {
      // Respuesta no es JSON (probablemente HTML de error)
      // Si es HTML, probablemente es un error de routing
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        return {
          success: false,
          error: `Error de routing: La URL ${url} no existe o está mal configurada. El servidor devolvió HTML en lugar de JSON.`,
        };
      }
      
      return {
        success: false,
        error: responseText || `Error HTTP ${response.status}`,
      };
    }

    if (!response.ok) {
      // NestJS devuelve errores en formato: { statusCode, message, error }
      // Extraer el mensaje descriptivo si existe
      console.log('❌ Error en respuesta:', { 
        status: response.status, 
        data,
        message: data?.message,
        error: data?.error 
      });
      
      const errorMessage = data?.message || data?.error || `Error HTTP ${response.status}`;
      
      return {
        success: false,
        error: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        statusCode: response.status
      };
    }

    const result = {
      success: true,
      data: data?.data || data,
    };
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido' + error,
    };
  }
}

// ==================== AUDITORÍAS ====================

export const auditoriasApi = {
  /**
   * Obtener todas las auditorías con filtros opcionales
   */
  getAll: async (filters?: AuditoriaFilters): Promise<ApiResponse<Auditoria[]>> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }
    
    const query = queryParams.toString();
    return apiRequest<Auditoria[]>(`/auditorias${query ? `?${query}` : ''}`);
  },

  /**
   * Obtener auditorías paginadas
   */
  getPaginated: async (
    page: number = 1,
    pageSize: number = 10,
    filters?: AuditoriaFilters
  ): Promise<ApiResponse<PaginatedResponse<Auditoria>>> => {
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }
    
    return apiRequest<PaginatedResponse<Auditoria>>(`/auditorias?${queryParams.toString()}`);
  },

  /**
   * Obtener una auditoría por ID
   */
  getById: async (id: string): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}`);
  },

  /**
   * Crear una nueva auditoría
   */
  create: async (data: Partial<Auditoria>): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>('/auditorias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar una auditoría
   */
  update: async (id: string, data: Partial<Auditoria>): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar una auditoría
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/auditorias/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Cambiar el estado de una auditoría
   */
  changeStatus: async (id: string, estado: Auditoria['estado']): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
  },

  /**
   * Actualizar progreso de una auditoría
   */
  updateProgress: async (id: string, progreso: number): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}/progreso`, {
      method: 'PATCH',
      body: JSON.stringify({ progreso }),
    });
  },

  // ============ NOTAS DE AUDITORÍA ============

  /**
   * Obtener todas las notas de una auditoría
   */
  getNotas: async (auditoriaId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/auditorias/${auditoriaId}/notas`);
  },

  /**
   * Crear una nueva nota
   */
  createNota: async (auditoriaId: string, data: {
    contenido: string;
    categoria: string;
    importante?: boolean;
  }): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/notas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar una nota existente
   */
  updateNota: async (auditoriaId: string, notaId: string, data: {
    contenido?: string;
    categoria?: string;
    importante?: boolean;
  }): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/notas/${notaId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar una nota
   */
  deleteNota: async (auditoriaId: string, notaId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/auditorias/${auditoriaId}/notas/${notaId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Marcar o desmarcar una nota como importante
   */
  toggleImportanteNota: async (auditoriaId: string, notaId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/notas/${notaId}/importante`, {
      method: 'PATCH',
    });
  },

  // ============ APROBACIÓN DE AUDITORÍA ============

  /**
   * Aprobar una auditoría
   */
  aprobar: async (auditoriaId: string, comentarios?: string): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${auditoriaId}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ comentarios }),
    });
  },

  /**
   * Rechazar una auditoría
   */
  rechazar: async (auditoriaId: string, justificacion: string): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${auditoriaId}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ justificacion }),
    });
  },

  /**
   * Solicitar modificación de una auditoría
   */
  solicitarModificacion: async (auditoriaId: string, observaciones: string): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${auditoriaId}/modificacion`, {
      method: 'POST',
      body: JSON.stringify({ observaciones }),
    });
  },

  /**
   * Obtener todas las auditorías para el Kanban
   */
  getAllKanban: async (): Promise<ApiResponse<Auditoria[]>> => {
    return apiRequest<Auditoria[]>('/auditorias/kanban/all');
  },

  /**
   * Obtener todas las auditorías archivadas para el Kanban
   */
  getAllKanbanArchivadas: async (): Promise<ApiResponse<Auditoria[]>> => {
    return apiRequest<Auditoria[]>('/auditorias/kanban/archivadas');
  },

  /**
   * Archivar una auditoría
   */
  archivar: async (id: string, comentario?: string): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        archivada: true,
        activa: false,
        observacionesAdicionales: comentario ? `Archivada: ${comentario}` : 'Archivada por el usuario'
      }),
    });
  },

  /**
   * ==================== AMPLIACIÓN DE PLAZO ====================
   */

  /**
   * Solicitar ampliación de plazo de una auditoría en curso
   */
  solicitarAmpliacionPlazo: async (
    id: string,
    data: { nuevaFechaFin: string; justificacion: string }
  ): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}/ampliar-plazo/solicitar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Aprueba una solicitud de ampliación de plazo (solo Jefe OCI)
   */
  aprobarAmpliacionPlazo: async (
    id: string,
    data: { comentarios?: string }
  ): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}/ampliar-plazo/aprobar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Rechaza una solicitud de ampliación de plazo (solo Jefe OCI)
   */
  rechazarAmpliacionPlazo: async (
    id: string,
    data: { justificacion: string }
  ): Promise<ApiResponse<Auditoria>> => {
    return apiRequest<Auditoria>(`/auditorias/${id}/ampliar-plazo/rechazar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtiene todas las solicitudes de ampliación de plazo pendientes
   */
  getSolicitudesAmpliacionPendientes: async (): Promise<ApiResponse<Array<{
    id: string;
    auditoriaId: string;
    auditoriaCodigo: string;
    auditoriaNombre: string;
    fechaSolicitud: string;
    justificacion: string;
    fechaFinAnterior: string;
    fechaFinNueva: string;
    solicitanteId: number;
  }>>> => {
    return apiRequest(`/auditorias/ampliar-plazo/pendientes`);
  },
};

// ==================== UNIVERSO DE AUDITORÍAS ====================

export const universoAuditoriasApi = {
  /**
   * Obtener todos los procesos auditables
   */
  getAllProcesos: async (filters?: {
    tipo?: string;
    macroproceso?: string;
    nivelRiesgo?: string;
    territorial?: string;
    search?: string;
  }): Promise<ApiResponse<any[]>> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }
    const query = queryParams.toString();
    return apiRequest<any[]>(`/universo-auditorias/procesos${query ? `?${query}` : ''}`);
  },

  /**
   * Obtener universo de auditorías del año
   */
  getByYear: async (year: number): Promise<ApiResponse<UniversoAuditorias>> => {
    return apiRequest<UniversoAuditorias>(`/universo-auditorias/${year}`);
  },

  /**
   * Crear universo de auditorías
   */
  create: async (data: Partial<UniversoAuditorias>): Promise<ApiResponse<UniversoAuditorias>> => {
    return apiRequest<UniversoAuditorias>('/universo-auditorias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar universo de auditorías
   */
  update: async (id: string, data: Partial<UniversoAuditorias>): Promise<ApiResponse<UniversoAuditorias>> => {
    return apiRequest<UniversoAuditorias>(`/universo-auditorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Crear proceso auditable (sin necesidad de universoId)
   */
  createProceso: async (proceso: Partial<ProcesoAuditable>): Promise<ApiResponse<ProcesoAuditable>> => {
    return apiRequest<ProcesoAuditable>(`/universo-auditorias/procesos`, {
      method: 'POST',
      body: JSON.stringify(proceso),
    });
  },

  /**
   * Agregar proceso auditable
   */
  addProceso: async (universoId: string, proceso: Partial<ProcesoAuditable>): Promise<ApiResponse<ProcesoAuditable>> => {
    return apiRequest<ProcesoAuditable>(`/universo-auditorias/${universoId}/procesos`, {
      method: 'POST',
      body: JSON.stringify(proceso),
    });
  },

  /**
   * Actualizar proceso auditable
   */
  updateProceso: async (procesoId: string, data: Partial<ProcesoAuditable>): Promise<ApiResponse<ProcesoAuditable>> => {
    return apiRequest<ProcesoAuditable>(`/universo-auditorias/procesos/${procesoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar proceso auditable
   */
  deleteProceso: async (procesoId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/universo-auditorias/procesos/${procesoId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== PROGRAMA ANUAL ====================

export const programaAnualApi = {
  /**
   * Obtener programa anual del año
   */
  getByYear: async (year: number): Promise<ApiResponse<ProgramaAnual>> => {
    return apiRequest<ProgramaAnual>(`/programa-anual/${year}`);
  },

  /**
   * Crear programa anual
   */
  create: async (data: Partial<ProgramaAnual>): Promise<ApiResponse<ProgramaAnual>> => {
    return apiRequest<ProgramaAnual>('/programa-anual', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar programa anual
   */
  update: async (id: string, data: Partial<ProgramaAnual>): Promise<ApiResponse<ProgramaAnual>> => {
    return apiRequest<ProgramaAnual>(`/programa-anual/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Importar procesos desde universo
   */
  importFromUniverso: async (
    programaId: string,
    procesosIds: string[]
  ): Promise<ApiResponse<AuditoriaProgramada[]>> => {
    return apiRequest<AuditoriaProgramada[]>(`/programa-anual/${programaId}/importar`, {
      method: 'POST',
      body: JSON.stringify({ procesosIds }),
    });
  },

  /**
   * Agregar auditoría al programa
   */
  addAuditoria: async (
    programaId: string,
    auditoria: Partial<AuditoriaProgramada>
  ): Promise<ApiResponse<AuditoriaProgramada>> => {
    return apiRequest<AuditoriaProgramada>(`/programa-anual/${programaId}/auditorias`, {
      method: 'POST',
      body: JSON.stringify(auditoria),
    });
  },

  /**
   * Actualizar auditoría programada
   */
  updateAuditoria: async (
    auditoriaId: string,
    data: Partial<AuditoriaProgramada>
  ): Promise<ApiResponse<AuditoriaProgramada>> => {
    return apiRequest<AuditoriaProgramada>(`/auditorias-programadas/${auditoriaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar auditoría del programa
   */
  deleteAuditoria: async (auditoriaId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/auditorias-programadas/${auditoriaId}`, {
      method: 'DELETE',
    });
  },
};

// ==================== HALLAZGOS ====================

export const hallazgosApi = {
  /**
   * Obtener todos los hallazgos con filtros
   */
  getAll: async (filters?: HallazgoFilters): Promise<ApiResponse<Hallazgo[]>> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }
    
    const query = queryParams.toString();
    return apiRequest<Hallazgo[]>(`/hallazgos${query ? `?${query}` : ''}`);
  },

  /**
   * Obtener hallazgos por auditoría
   */
  getByAuditoria: async (auditoriaId: string): Promise<ApiResponse<Hallazgo[]>> => {
    return apiRequest<Hallazgo[]>(`/auditorias/${auditoriaId}/hallazgos`);
  },

  /**
   * Obtener hallazgo por ID
   */
  getById: async (id: string): Promise<ApiResponse<Hallazgo>> => {
    return apiRequest<Hallazgo>(`/hallazgos/${id}`);
  },

  /**
   * Crear hallazgo
   */
  create: async (data: Partial<Hallazgo>): Promise<ApiResponse<Hallazgo>> => {
    return apiRequest<Hallazgo>('/hallazgos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar hallazgo
   */
  update: async (id: string, data: Partial<Hallazgo>): Promise<ApiResponse<Hallazgo>> => {
    return apiRequest<Hallazgo>(`/hallazgos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar hallazgo
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/hallazgos/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Cambiar estado del hallazgo
   */
  changeStatus: async (id: string, estado: Hallazgo['estado']): Promise<ApiResponse<Hallazgo>> => {
    return apiRequest<Hallazgo>(`/hallazgos/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    });
  },
};

// ==================== PLANES DE MEJORAMIENTO ====================

export const planesMejoramientoApi = {
  /**
   * Obtener todos los planes con filtros
   */
  getAll: async (filters?: PlanMejoramientoFilters): Promise<ApiResponse<PlanMejoramiento[]>> => {
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, String(value));
      });
    }
    
    const query = queryParams.toString();
    return apiRequest<PlanMejoramiento[]>(`/planes-mejoramiento${query ? `?${query}` : ''}`);
  },

  /**
   * Obtener plan por ID
   */
  getById: async (id: string): Promise<ApiResponse<PlanMejoramiento>> => {
    return apiRequest<PlanMejoramiento>(`/planes-mejoramiento/${id}`);
  },

  /**
   * Crear plan de mejoramiento
   */
  create: async (data: Partial<PlanMejoramiento>): Promise<ApiResponse<PlanMejoramiento>> => {
    return apiRequest<PlanMejoramiento>('/planes-mejoramiento', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar plan
   */
  update: async (id: string, data: Partial<PlanMejoramiento>): Promise<ApiResponse<PlanMejoramiento>> => {
    return apiRequest<PlanMejoramiento>(`/planes-mejoramiento/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Agregar acción de mejoramiento
   */
  addAccion: async (planId: string, accion: Partial<AccionMejoramiento>): Promise<ApiResponse<AccionMejoramiento>> => {
    return apiRequest<AccionMejoramiento>(`/planes-mejoramiento/${planId}/acciones`, {
      method: 'POST',
      body: JSON.stringify(accion),
    });
  },

  /**
   * Actualizar acción de mejoramiento
   */
  updateAccion: async (planId: string, accionId: string, data: Partial<AccionMejoramiento>): Promise<ApiResponse<AccionMejoramiento>> => {
    return apiRequest<AccionMejoramiento>(`/planes-mejoramiento/${planId}/acciones/${accionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar progreso de acción
   */
  updateAccionProgress: async (accionId: string, porcentaje: number): Promise<ApiResponse<AccionMejoramiento>> => {
    return apiRequest<AccionMejoramiento>(`/acciones-mejoramiento/${accionId}/progreso`, {
      method: 'PATCH',
      body: JSON.stringify({ porcentajeAvance: porcentaje }),
    });
  },

  /**
   * Cargar evidencia en una acción
   */
  addEvidencia: async (planId: string, accionId: string, evidencia: {
    nombre: string;
    tipo: string;
    url: string;
    fecha?: string;
  }): Promise<ApiResponse<AccionMejoramiento>> => {
    return apiRequest<AccionMejoramiento>(`/planes-mejoramiento/${planId}/acciones/${accionId}/evidencias`, {
      method: 'POST',
      body: JSON.stringify(evidencia),
    });
  },

  /**
   * Obtener eventos del timeline de un plan
   */
  getEventosTimeline: async (planId: string): Promise<ApiResponse<EventoTimeline[]>> => {
    return apiRequest<EventoTimeline[]>(`/planes-mejoramiento/${planId}/eventos`);
  },

  /**
   * Crear un evento en el timeline
   */
  createEventoTimeline: async (planId: string, evento: {
    tipo: string;
    descripcion: string;
    usuarioId?: string;
    usuarioNombre?: string;
    metadata?: any;
  }): Promise<ApiResponse<EventoTimeline>> => {
    return apiRequest<EventoTimeline>(`/planes-mejoramiento/${planId}/eventos`, {
      method: 'POST',
      body: JSON.stringify(evento),
    });
  },
};

// ==================== PLAN ANUAL (5 ROLES) ====================

export const planAnual5RolesApi = {
  /**
   * Obtener todos los planes anuales
   */
  findAll: async (year?: number): Promise<ApiResponse<PlanAnual5Roles[]>> => {
    const query = year ? `?year=${year}` : '';
    return apiRequest<PlanAnual5Roles[]>(`/plan-anual-5-roles${query}`);
  },

  /**
   * Obtener plan anual del año
   */
  getByYear: async (year: number): Promise<ApiResponse<PlanAnual5Roles>> => {
    return apiRequest<PlanAnual5Roles>(`/plan-anual-5-roles/year/${year}`);
  },

  /**
   * Crear plan anual
   */
  create: async (data: Partial<PlanAnual5Roles>): Promise<ApiResponse<PlanAnual5Roles>> => {
    return apiRequest<PlanAnual5Roles>('/plan-anual-5-roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar plan anual
   */
  update: async (id: string, data: Partial<PlanAnual5Roles>): Promise<ApiResponse<PlanAnual5Roles>> => {
    return apiRequest<PlanAnual5Roles>(`/plan-anual-5-roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Agregar actividad
   */
  addActividad: async (rolId: string, actividad: Partial<Actividad>): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`/plan-anual-5-roles/${rolId}/actividades`, {
      method: 'POST',
      body: JSON.stringify(actividad),
    });
  },

  /**
   * Actualizar actividad
   */
  updateActividad: async (actividadId: string, data: Partial<Actividad>): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`/plan-anual-5-roles/actividades/${actividadId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar progreso de actividad
   */
  updateActividadProgress: async (actividadId: string, porcentaje: number): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`/actividades/${actividadId}/progreso`, {
      method: 'PATCH',
      body: JSON.stringify({ porcentajeAvance: porcentaje }),
    });
  },
};

// ==================== LISTAS DE CHEQUEO ====================

export const listasChequeoApi = {
  /**
   * Obtener todas las listas
   */
  getAll: async (): Promise<ApiResponse<ListaChequeo[]>> => {
    return apiRequest<ListaChequeo[]>('/listas-chequeo');
  },

  /**
   * Obtener lista por ID
   */
  getById: async (id: string): Promise<ApiResponse<ListaChequeo>> => {
    return apiRequest<ListaChequeo>(`/listas-chequeo/${id}`);
  },

  /**
   * Crear lista de chequeo
   */
  create: async (data: Partial<ListaChequeo>): Promise<ApiResponse<ListaChequeo>> => {
    return apiRequest<ListaChequeo>('/listas-chequeo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar lista
   */
  update: async (id: string, data: Partial<ListaChequeo>): Promise<ApiResponse<ListaChequeo>> => {
    return apiRequest<ListaChequeo>(`/listas-chequeo/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// ==================== INFORMES DE LEY ====================

export const informesLeyApi = {
  /**
   * Obtener todos los informes
   */
  getAll: async (): Promise<ApiResponse<InformeLey[]>> => {
    return apiRequest<InformeLey[]>('/informes-ley');
  },

  /**
   * Obtener informe por ID
   */
  getById: async (id: string): Promise<ApiResponse<InformeLey>> => {
    return apiRequest<InformeLey>(`/informes-ley/${id}`);
  },

  /**
   * Crear informe
   */
  create: async (data: Partial<InformeLey>): Promise<ApiResponse<InformeLey>> => {
    return apiRequest<InformeLey>('/informes-ley', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar informe
   */
  update: async (id: string, data: Partial<InformeLey>): Promise<ApiResponse<InformeLey>> => {
    return apiRequest<InformeLey>(`/informes-ley/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Generar informe automático
   */
  generar: async (
    informeId: string,
    data: {
      periodo: string;
      datosAdicionales?: Record<string, any>;
    }
  ): Promise<ApiResponse<{
    entregaId: string;
    archivoUrl: string;
    fechaGeneracion: string;
    datosAutomaticosPoblados: boolean;
  }>> => {
    return apiRequest(`/informes-ley/${informeId}/generar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener todas las plantillas disponibles
   */
  getPlantillas: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>('/informes-ley/plantillas/all');
  },

  /**
   * Obtener plantilla por código
   */
  getPlantilla: async (codigo: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/informes-ley/plantillas/${codigo}`);
  },

  // ==================== WORKFLOW DE APROBACIÓN (US-033) ====================

  /**
   * Enviar informe a revisión (Auditor → Jefe OCI)
   */
  enviarRevision: async (
    informeId: string,
    entregaId: string,
    data?: { observaciones?: string }
  ): Promise<ApiResponse<any>> => {
    return apiRequest(`/informes-ley/${informeId}/entregas/${entregaId}/enviar`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  /**
   * Aprobar informe (Jefe OCI)
   */
  aprobar: async (
    informeId: string,
    entregaId: string,
    data?: { observaciones?: string }
  ): Promise<ApiResponse<any>> => {
    return apiRequest(`/informes-ley/${informeId}/entregas/${entregaId}/aprobar`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  /**
   * Rechazar informe (Jefe OCI)
   */
  rechazar: async (
    informeId: string,
    entregaId: string,
    data: { motivoRechazo: string; observaciones?: string }
  ): Promise<ApiResponse<any>> => {
    return apiRequest(`/informes-ley/${informeId}/entregas/${entregaId}/rechazar`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener workflow de una entrega
   */
  getWorkflow: async (entregaId: string): Promise<ApiResponse<any>> => {
    return apiRequest(`/informes-ley/entregas/${entregaId}/workflow`);
  },

  /**
   * Obtener historial de una entrega
   */
  getHistorial: async (entregaId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest(`/informes-ley/entregas/${entregaId}/historial`);
  },

  /**
   * Subir archivo para una entrega
   */
  uploadArchivo: async (entregaId: string, file: File): Promise<ApiResponse<EntregaInforme>> => {
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('esap_auth_token');
    // Usar getApiBaseUrl() para construir la URL correctamente
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/informes-ley/entregas/${entregaId}/upload`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // NO establecer Content-Type para FormData, el navegador lo hace automáticamente con boundary
        },
        body: formData,
      });

      const responseText = await response.text();
      let data: any = null;
      
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          return {
            success: false,
            error: 'Error al parsear respuesta del servidor',
          };
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || data?.error || `Error HTTP ${response.status}`,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al subir archivo',
      };
    }
  },
};

// ==================== NOTIFICACIONES ====================

export const notificacionesApi = {
  /**
   * Obtener todas las notificaciones de un usuario
   */
  obtenerPorUsuario: (usuarioId: number | string, filtros?: {
    estado?: string;
    tipo?: string;
    leida?: boolean;
    prioridad?: string;
  }) => {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.leida !== undefined) params.append('leida', String(filtros.leida));
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
    
    const queryString = params.toString();
    const endpoint = `/notificaciones/usuario/${usuarioId}${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<any[]>(endpoint);
  },

  /**
   * Obtener TODAS las notificaciones (solo para super administradores/admins)
   */
  obtenerTodas: (filtros?: {
    estado?: string;
    tipo?: string;
    leida?: boolean;
    prioridad?: string;
  }) => {
    console.log('[notificacionesApi.obtenerTodas] Llamado con filtros:', filtros);
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.tipo) params.append('tipo', filtros.tipo);
    if (filtros?.leida !== undefined) params.append('leida', String(filtros.leida));
    if (filtros?.prioridad) params.append('prioridad', filtros.prioridad);
    
    const queryString = params.toString();
    const endpoint = `/notificaciones/todas${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest<any[]>(endpoint);
  },

  /**
   * Obtener notificaciones no leídas
   */
  obtenerNoLeidas: (usuarioId: number | string) => {
    return apiRequest<any[]>(`/notificaciones/usuario/${usuarioId}/no-leidas`);
  },

  /**
   * Obtener conteo de notificaciones no leídas
   */
  obtenerConteoNoLeidas: (usuarioId: number | string) => {
    return apiRequest<{ count: number }>(`/notificaciones/usuario/${usuarioId}/conteo`);
  },

  /**
   * Marcar notificación como leída
   */
  marcarLeida: (id: string, usuarioId: number | string) => {
    return apiRequest<any>(`/notificaciones/${id}/leida`, {
      method: 'PUT',
      body: JSON.stringify({ usuarioId: String(usuarioId) }),
    });
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasLeidas: (usuarioId: number | string) => {
    return apiRequest<any>(`/notificaciones/usuario/${usuarioId}/todas-leidas`, {
      method: 'PUT',
    });
  },

  /**
   * Archivar notificación
   */
  archivar: (id: string, usuarioId: number | string) => {
    return apiRequest<any>(`/notificaciones/${id}/archivar`, {
      method: 'PUT',
      body: JSON.stringify({ usuarioId: String(usuarioId) }),
    });
  },

  /**
   * Eliminar notificación
   */
  eliminar: (id: string, usuarioId: string) => {
    return apiRequest<void>(`/notificaciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ usuarioId }),
    });
  },

  /**
   * Crear una nueva notificación
   */
  crear: (data: {
    usuarioId: string;
    tipoNotificacion: string;
    titulo: string;
    mensaje: string;
    canal?: 'email' | 'sistema' | 'ambos';
    prioridad?: 'baja' | 'normal' | 'alta' | 'critica';
    metadata?: {
      auditoriaId?: string;
      hallazgoId?: string;
      planMejoramientoId?: string;
      documentoId?: string;
      fechaVencimiento?: string;
      diasAnticipacion?: number;
      [key: string]: any;
    };
    accionUrl?: string;
  }) => {
    return apiRequest<any>('/notificaciones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ==================== EVIDENCIAS/DOCUMENTOS ====================

// Helper para upload de archivos con progreso
async function uploadFile<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('esap_auth_token');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Manejar progreso
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    // Manejar respuesta
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          resolve({
            success: true,
            data: response,
          });
        } catch (error) {
          resolve({
            success: true,
            data: null,
          });
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          resolve({
            success: false,
            error: error.message || `HTTP ${xhr.status}`,
          });
        } catch {
          resolve({
            success: false,
            error: `HTTP ${xhr.status}: ${xhr.statusText}`,
          });
        }
      }
    });

    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'Error de red al subir el archivo',
      });
    });

    xhr.open('POST', url);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.send(formData);
  });
}

export const evidenciasApi = {
  /**
   * Crear una evidencia/documento (sube archivo)
   */
  create: async (
    file: File,
    metadata: {
      nombre: string;
      descripcion?: string;
      tipoDocumento: 'evidencia_hallazgo' | 'evidencia_accion' | 'evidencia_plan' | 'documento_plan' | 'certificado' | 'acta' | 'informe' | 'otro';
      hallazgoId?: string;
      accionCorrectivaId?: string;
      planMejoramientoId?: string;
      auditoriaId?: string;
      subidoPor?: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('nombre', metadata.nombre);
    if (metadata.descripcion) formData.append('descripcion', metadata.descripcion);
    formData.append('tipoDocumento', metadata.tipoDocumento);
    if (metadata.hallazgoId) formData.append('hallazgoId', metadata.hallazgoId);
    if (metadata.accionCorrectivaId) formData.append('accionCorrectivaId', metadata.accionCorrectivaId);
    if (metadata.planMejoramientoId) formData.append('planMejoramientoId', metadata.planMejoramientoId);
    if (metadata.auditoriaId) formData.append('auditoriaId', metadata.auditoriaId);
    if (metadata.subidoPor) formData.append('subidoPor', metadata.subidoPor);

    return uploadFile<any>('/evidencias', formData, onProgress);
  },

  /**
   * Obtener evidencias por acción correctiva
   */
  getByAccion: async (accionId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/evidencias/accion/${accionId}`);
  },

  /**
   * Obtener evidencias por hallazgo
   */
  getByHallazgo: async (hallazgoId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/evidencias/hallazgo/${hallazgoId}`);
  },

  /**
   * Obtener evidencias por plan de mejoramiento
   */
  getByPlan: async (planId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/evidencias/plan/${planId}`);
  },

  /**
   * Obtener evidencias por auditoría
   */
  getByAuditoria: async (auditoriaId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/evidencias/auditoria/${auditoriaId}`);
  },

  /**
   * Obtener una evidencia por ID
   */
  getById: async (id: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/evidencias/${id}`);
  },

  /**
   * Descargar una evidencia
   */
  download: async (id: string): Promise<Blob> => {
    const url = `${API_BASE_URL}/evidencias/${id}/download`;
    const token = localStorage.getItem('esap_auth_token');
    
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Error al descargar: ${response.statusText}`);
    }

    return response.blob();
  },

  /**
   * Validar una evidencia (US-032)
   */
  validar: async (
    id: string,
    estadoValidacion: 'pendiente' | 'aceptado' | 'rechazado' | 'con_observaciones',
    observaciones?: string
  ): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/evidencias/${id}/validar`, {
      method: 'POST',
      body: JSON.stringify({
        estadoValidacion,
        observacionesValidacion: observaciones,
      }),
    });
  },

  /**
   * Eliminar una evidencia
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/evidencias/${id}`, {
      method: 'DELETE',
    });
  },
};

// Exportar todo
export const controlInternoApi = {
  auditorias: auditoriasApi,
  universoAuditorias: universoAuditoriasApi,
  programaAnual: programaAnualApi,
  hallazgos: hallazgosApi,
  planesMejoramiento: planesMejoramientoApi,
  planAnual5Roles: planAnual5RolesApi,
  listasChequeo: listasChequeoApi,
  informesLey: informesLeyApi,
  notificaciones: notificacionesApi,
  evidencias: evidenciasApi,
};
