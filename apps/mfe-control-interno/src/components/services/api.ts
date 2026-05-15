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
import { getServiceUrl, API_MODE } from '../../../../config/environment';

// ==================== CONFIGURACIÓN ====================

// URL base del servicio de Control Interno
const BASE_URL = getServiceUrl('control-institucional');
// Prefijo completo dependiendo del modo
// En gateway: http://localhost:3000/control-institucional/api/v1
// En direct: http://localhost:3007 (sin prefijo porque el microservicio no tiene prefijo global)
const API_BASE_URL = API_MODE === 'gateway' 
  ? `${BASE_URL}/control-institucional/api/v1` 
  : BASE_URL;

// Helper para requests
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || 'Error en la petición',
      };
    }

    return {
      success: true,
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
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
      method: 'PUT',
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

  /**
   * Obtener personas disponibles para asignar como auditores
   */
  getPersonasDisponibles: async (): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>('/auditorias/personas/disponibles');
  },

  /**
   * Búsqueda libre de personas (auth.personas) por nombre, email o identificación.
   * Devuelve { idPersona, id, nombre, email, numeroIdentificacion, ... }.
   * Pensado para autocompletar selectores del formulario.
   */
  searchPersonas: async (q: string): Promise<ApiResponse<any[]>> => {
    if (!q || q.trim().length < 2) {
      return { success: true, data: [] } as ApiResponse<any[]>;
    }
    return apiRequest<any[]>(`/auditorias/personas/search?q=${encodeURIComponent(q.trim())}`);
  },

  /**
   * Obtiene todas las personas de auth.personas (máx N, por defecto 50).
   * Usada para precargar el selector de responsable del área auditada sin escribir.
   */
  getAllPersonas: async (limit = 50): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/auditorias/personas/all?limit=${limit}`);
  },

  /**
   * Obtener notas de una auditoría
   */
  getNotas: async (auditoriaId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/auditorias/${auditoriaId}/notas`);
  },

  /**
   * Crear nota en una auditoría
   */
  createNota: async (auditoriaId: string, data: { contenido: string; tipo: string }): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/notas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar una nota
   */
  updateNota: async (auditoriaId: string, notaId: string, data: { contenido: string }): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/notas/${notaId}`, {
      method: 'PUT',
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
   * Marcar nota como importante
   */
  toggleImportanteNota: async (auditoriaId: string, notaId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/notas/${notaId}/importante`, {
      method: 'PATCH',
    });
  },

  /**
   * Obtener todas las auditorías para vista Kanban
   */
  getAllKanban: async (): Promise<ApiResponse<Auditoria[]>> => {
    return apiRequest<Auditoria[]>('/auditorias/kanban');
  },

  /**
   * Solicitar ampliación de plazo
   */
  solicitarAmpliacionPlazo: async (auditoriaId: string, data: { nuevaFechaFin: string; justificacion: string }): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/auditorias/${auditoriaId}/ampliar-plazo`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Obtener tipos de auditoría configurados
   */
  getTiposAuditoria: async (includeInactive = false): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/tipos-auditoria${includeInactive ? '?includeInactive=true' : ''}`);
  },
};

// ==================== UNIVERSO DE AUDITORÍAS ====================

export const universoAuditoriasApi = {
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
    return apiRequest<ProcesoAuditable>(`/procesos-auditables/${procesoId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar proceso auditable
   */
  deleteProceso: async (procesoId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/procesos-auditables/${procesoId}`, {
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
  updateAccion: async (accionId: string, data: Partial<AccionMejoramiento>): Promise<ApiResponse<AccionMejoramiento>> => {
    return apiRequest<AccionMejoramiento>(`/acciones-mejoramiento/${accionId}`, {
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
};

// ==================== PLAN ANUAL (5 ROLES) ====================

export const planAnual5RolesApi = {
  /**
   * Obtener plan anual del año
   */
  getByYear: async (year: number): Promise<ApiResponse<PlanAnual5Roles>> => {
    return apiRequest<PlanAnual5Roles>(`/plan-anual-5roles/${year}`);
  },

  /**
   * Crear plan anual
   */
  create: async (data: Partial<PlanAnual5Roles>): Promise<ApiResponse<PlanAnual5Roles>> => {
    return apiRequest<PlanAnual5Roles>('/plan-anual-5roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar plan anual
   */
  update: async (id: string, data: Partial<PlanAnual5Roles>): Promise<ApiResponse<PlanAnual5Roles>> => {
    return apiRequest<PlanAnual5Roles>(`/plan-anual-5roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Agregar actividad
   */
  addActividad: async (planId: string, actividad: Partial<Actividad>): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`/plan-anual-5roles/${planId}/actividades`, {
      method: 'POST',
      body: JSON.stringify(actividad),
    });
  },

  /**
   * Actualizar actividad
   */
  updateActividad: async (actividadId: string, data: Partial<Actividad>): Promise<ApiResponse<Actividad>> => {
    return apiRequest<Actividad>(`/actividades/${actividadId}`, {
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
};

// ==================== CONFIGURACIONES PROFESIONALES OCI ====================

export interface ConfiguracionProfesionalOCI {
  id: string;
  idTercero: string;
  rolOcig: 'Jefe OCIG' | 'Auditor Sénior' | 'Auditor' | 'Auditor Júnior' | 'Apoyo Técnico';
  /** @deprecated use rolOcig */ rolOCI?: string;
  especialidades: string[];
  capacidadMaximaAuditorias: number;
  horasMensualesDisponibles: number;
  puedeSerLider: boolean;
  activo: boolean;
  fechaAsignacion: string;
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched data
  nombre?: string;
  email?: string;
  identificacion?: string;
  roles?: string[];
}

export interface CreateConfiguracionProfesionalOCIDto {
  idTercero: string;
  rolOcig: string;
  especialidades: string[];
  capacidadMaximaAuditorias?: number;
  horasMensualesDisponibles?: number;
  puedeSerLider?: boolean;
  observaciones?: string;
}

export interface UpdateConfiguracionProfesionalOCIDto {
  rolOcig?: string;
  especialidades?: string[];
  capacidadMaximaAuditorias?: number;
  horasMensualesDisponibles?: number;
  puedeSerLider?: boolean;
  activo?: boolean;
  observaciones?: string;
}

export const configuracionesProfesionalesOCIApi = {
  /**
   * Obtener todas las configuraciones de profesionales OCI
   */
  getAll: async (includeInactive: boolean = false): Promise<ApiResponse<ConfiguracionProfesionalOCI[]>> => {
    const params = includeInactive ? '?includeInactive=true' : '';
    return apiRequest<ConfiguracionProfesionalOCI[]>(`/configuraciones/profesionales-ocig${params}`);
  },

  /**
   * Buscar personas candidatas de auth.personas que pueden ser profesionales OCI
   * (personas que AÚN NO están configuradas)
   */
  buscarCandidatos: async (busqueda?: string): Promise<ApiResponse<any[]>> => {
    const params = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    return apiRequest<any[]>(`/configuraciones/profesionales-ocig/candidatos${params}`);
  },

  /**
   * Obtener roles OCIG disponibles desde la BD (no hardcodeados)
   */
  getRolesOCIG: async (): Promise<ApiResponse<Array<{ name: string; description: string }>>> => {
    return apiRequest<Array<{ name: string; description: string }>>('/configuraciones/profesionales-ocig/roles-ocig');
  },

  /**
   * Obtener especialidades OCIG desde la BD (no hardcodeadas)
   */
  getEspecialidades: async (): Promise<ApiResponse<Array<{ id: number; nombre: string; descripcion: string }>>> => {
    return apiRequest<Array<{ id: number; nombre: string; descripcion: string }>>('/configuraciones/profesionales-ocig/especialidades');
  },

  /**
   * Obtener configuración por ID
   */
  getById: async (id: string): Promise<ApiResponse<ConfiguracionProfesionalOCI>> => {
    return apiRequest<ConfiguracionProfesionalOCI>(`/configuraciones/profesionales-ocig/${id}`);
  },

  /**
   * Obtener configuración por ID de tercero
   */
  getByIdTercero: async (idTercero: number): Promise<ApiResponse<ConfiguracionProfesionalOCI | null>> => {
    return apiRequest<ConfiguracionProfesionalOCI | null>(`/configuraciones/profesionales-ocig/tercero/${idTercero}`);
  },

  /**
   * Obtener profesionales que pueden ser líderes
   */
  getLideresPotenciales: async (): Promise<ApiResponse<ConfiguracionProfesionalOCI[]>> => {
    return apiRequest<ConfiguracionProfesionalOCI[]>('/configuraciones/profesionales-ocig/lideres');
  },

  /**
   * Crear configuración de profesional OCI
   */
  create: async (data: CreateConfiguracionProfesionalOCIDto): Promise<ApiResponse<ConfiguracionProfesionalOCI>> => {
    return apiRequest<ConfiguracionProfesionalOCI>('/configuraciones/profesionales-ocig', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar configuración por ID
   */
  update: async (id: string, data: UpdateConfiguracionProfesionalOCIDto): Promise<ApiResponse<ConfiguracionProfesionalOCI>> => {
    return apiRequest<ConfiguracionProfesionalOCI>(`/configuraciones/profesionales-ocig/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Actualizar configuración por ID de tercero
   */
  updateByIdTercero: async (idTercero: number, data: UpdateConfiguracionProfesionalOCIDto): Promise<ApiResponse<ConfiguracionProfesionalOCI>> => {
    return apiRequest<ConfiguracionProfesionalOCI>(`/configuraciones/profesionales-ocig/tercero/${idTercero}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Eliminar configuración (desactivar)
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/configuraciones/profesionales-ocig/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Eliminar configuración por ID de tercero
   */
  deleteByIdTercero: async (idTercero: number): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/configuraciones/profesionales-ocig/tercero/${idTercero}`, {
      method: 'DELETE',
    });
  },
};

// ==================== NOTIFICACIONES ====================

export const notificacionesApi = {
  /**
   * Obtener notificaciones por usuario
   */
  obtenerPorUsuario: async (usuarioId: string): Promise<ApiResponse<any[]>> => {
    return apiRequest<any[]>(`/notificaciones/usuario/${usuarioId}`);
  },

  /**
   * Marcar notificación como leída
   */
  marcarLeida: async (id: string, usuarioId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/notificaciones/${id}/leida`, {
      method: 'PUT',
      body: JSON.stringify({ usuarioId }),
    });
  },

  /**
   * Marcar todas las notificaciones como leídas
   */
  marcarTodasLeidas: async (usuarioId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/notificaciones/usuario/${usuarioId}/todas-leidas`, {
      method: 'PUT',
    });
  },

  /**
   * Eliminar notificación
   */
  eliminar: async (id: string, usuarioId: string): Promise<ApiResponse<void>> => {
    return apiRequest<void>(`/notificaciones/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ usuarioId }),
    });
  },

  /**
   * Obtener preferencias de notificación
   */
  getPreferencias: async (usuarioId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/notificaciones/preferencias/${usuarioId}`);
  },

  /**
   * Guardar preferencias de notificación
   */
  updatePreferencias: async (usuarioId: string, preferencias: any): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/notificaciones/preferencias/${usuarioId}`, {
      method: 'PUT',
      body: JSON.stringify(preferencias),
    });
  },
};

// Compatibilidad con imports previos que usan la sigla OCIG.
export const configuracionesProfesionalesOCIGApi = configuracionesProfesionalesOCIApi;

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
  configuracionesProfesionalesOCI: configuracionesProfesionalesOCIApi,
  notificaciones: notificacionesApi,
};
