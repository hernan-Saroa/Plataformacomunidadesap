/**
 * API SERVICE - PLAN DE TRABAJO ACADÉMICO (PTA)
 * 
 * Servicio completo de integración con backend para:
 * - CRUD de PTAs
 * - Flujo de aprobación
 * - Seguimiento y control
 * - Situaciones administrativas
 * - Reportes y exportación
 * 
 * REQ-MOD-PTA-006: Interfaces API del Backend
 * 
 * Creado: 22 de diciembre de 2024
 */

import { PTAConAprobacion, EstadoPTA } from '../../components/gestion-profesoral/FlujoAprobacionPTA';
import { RegistroProgreso, ComparacionProgramadoEjecutado } from '../../components/gestion-profesoral/SeguimientoControlPTA';
import { SituacionAdministrativa, ReporteDisponibilidad } from '../../components/gestion-profesoral/SituacionesAdministrativasDocentes';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

/**
 * Configuración de la API
 * En producción, estos valores vendrán de variables de entorno
 */
const API_CONFIG = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.esap.edu.co/v1',
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0'
  }
};

// ============================================================================
// TIPOS DE RESPUESTA
// ============================================================================

/**
 * Respuesta estándar de la API
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: APIMetadata;
}

/**
 * Error de la API
 */
export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Metadata de la respuesta
 */
export interface APIMetadata {
  timestamp: string;
  requestId: string;
  version: string;
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Filtros para PTAs
 */
export interface PTAFilters {
  docenteId?: string;
  periodo?: string;
  estado?: EstadoPTA;
  territorial?: string;
  facultad?: string;
  programa?: string;
  tipoVinculacion?: string;
  fechaCreacionDesde?: string;
  fechaCreacionHasta?: string;
}

// ============================================================================
// CLASE PRINCIPAL DEL SERVICIO
// ============================================================================

/**
 * Servicio de API para PTAs
 */
class PTAAPIService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }

  /**
   * Configurar token de autenticación
   */
  public setAuthToken(token: string): void {
    this.token = token;
  }

  /**
   * Obtener headers con autenticación
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      ...API_CONFIG.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  /**
   * Realizar petición HTTP
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(API_CONFIG.timeout)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.code || 'UNKNOWN_ERROR',
            message: data.message || 'Error desconocido',
            details: data.details,
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        success: true,
        data: data.data || data,
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: data.requestId || '',
          version: data.version || '1.0'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Error de conexión',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // ==========================================================================
  // ENDPOINTS - GESTIÓN DE PTAs
  // ==========================================================================

  /**
   * Obtener PTAs con filtros y paginación
   */
  public async getPTAs(
    filters?: PTAFilters,
    pagination?: PaginationParams
  ): Promise<APIResponse<PaginatedResponse<PTAConAprobacion>>> {
    const params = new URLSearchParams();

    // Filtros
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    // Paginación
    if (pagination) {
      if (pagination.page) params.append('page', String(pagination.page));
      if (pagination.pageSize) params.append('pageSize', String(pagination.pageSize));
      if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
      if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
    }

    const queryString = params.toString();
    const endpoint = `/pta${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<PTAConAprobacion>>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * Obtener PTA por ID
   */
  public async getPTAById(id: string): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}`, {
      method: 'GET'
    });
  }

  /**
   * Crear nuevo PTA
   */
  public async createPTA(pta: Partial<PTAConAprobacion>): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>('/pta', {
      method: 'POST',
      body: JSON.stringify(pta)
    });
  }

  /**
   * Actualizar PTA existente
   */
  public async updatePTA(
    id: string,
    pta: Partial<PTAConAprobacion>
  ): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}`, {
      method: 'PUT',
      body: JSON.stringify(pta)
    });
  }

  /**
   * Eliminar PTA (solo en estado borrador)
   */
  public async deletePTA(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/pta/${id}`, {
      method: 'DELETE'
    });
  }

  /**
   * Duplicar PTA para nuevo periodo
   */
  public async duplicatePTA(
    id: string,
    nuevoPeriodo: string
  ): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ nuevoPeriodo })
    });
  }

  /**
   * Obtener PTAs de un docente
   */
  public async getPTAsByDocente(
    docenteId: string,
    periodo?: string
  ): Promise<APIResponse<PTAConAprobacion[]>> {
    const endpoint = periodo
      ? `/pta/docente/${docenteId}?periodo=${periodo}`
      : `/pta/docente/${docenteId}`;

    return this.request<PTAConAprobacion[]>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * Obtener PTAs pendientes de aprobación para un aprobador
   */
  public async getPTAsPendientes(
    aprobadorId: string,
    nivel?: number
  ): Promise<APIResponse<PTAConAprobacion[]>> {
    const params = new URLSearchParams();
    params.append('aprobadorId', aprobadorId);
    if (nivel) params.append('nivel', String(nivel));

    return this.request<PTAConAprobacion[]>(`/pta/pendientes?${params.toString()}`, {
      method: 'GET'
    });
  }

  // ==========================================================================
  // ENDPOINTS - FLUJO DE APROBACIÓN
  // ==========================================================================

  /**
   * Enviar PTA a aprobación
   */
  public async enviarAAprobacion(id: string): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}/enviar-aprobacion`, {
      method: 'POST'
    });
  }

  /**
   * Aprobar PTA
   */
  public async aprobarPTA(
    id: string,
    aprobadorId: string,
    observaciones?: string
  ): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, observaciones })
    });
  }

  /**
   * Rechazar PTA
   */
  public async rechazarPTA(
    id: string,
    aprobadorId: string,
    motivo: string
  ): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, motivo })
    });
  }

  /**
   * Solicitar ajustes en PTA
   */
  public async solicitarAjustes(
    id: string,
    aprobadorId: string,
    ajustesSolicitados: string
  ): Promise<APIResponse<PTAConAprobacion>> {
    return this.request<PTAConAprobacion>(`/pta/${id}/solicitar-ajustes`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, ajustesSolicitados })
    });
  }

  /**
   * Obtener historial de aprobaciones
   */
  public async getHistorialAprobaciones(
    id: string
  ): Promise<APIResponse<any[]>> {
    return this.request<any[]>(`/pta/${id}/historial-aprobaciones`, {
      method: 'GET'
    });
  }

  // ==========================================================================
  // ENDPOINTS - SEGUIMIENTO Y CONTROL
  // ==========================================================================

  /**
   * Registrar progreso de actividad
   */
  public async registrarProgreso(
    registro: Partial<RegistroProgreso>
  ): Promise<APIResponse<RegistroProgreso>> {
    return this.request<RegistroProgreso>('/pta/progreso', {
      method: 'POST',
      body: JSON.stringify(registro)
    });
  }

  /**
   * Obtener registros de progreso por PTA
   */
  public async getProgresoByPTA(
    ptaId: string,
    mes?: number
  ): Promise<APIResponse<RegistroProgreso[]>> {
    const endpoint = mes
      ? `/pta/${ptaId}/progreso?mes=${mes}`
      : `/pta/${ptaId}/progreso`;

    return this.request<RegistroProgreso[]>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * Aprobar registro de progreso
   */
  public async aprobarProgreso(
    registroId: string,
    aprobadorId: string,
    observaciones?: string
  ): Promise<APIResponse<RegistroProgreso>> {
    return this.request<RegistroProgreso>(`/pta/progreso/${registroId}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, observaciones })
    });
  }

  /**
   * Rechazar registro de progreso
   */
  public async rechazarProgreso(
    registroId: string,
    aprobadorId: string,
    motivo: string
  ): Promise<APIResponse<RegistroProgreso>> {
    return this.request<RegistroProgreso>(`/pta/progreso/${registroId}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, motivo })
    });
  }

  /**
   * Obtener comparación programado vs ejecutado
   */
  public async getComparacionProgramadoEjecutado(
    ptaId: string,
    mesActual?: number
  ): Promise<APIResponse<ComparacionProgramadoEjecutado>> {
    const endpoint = mesActual
      ? `/pta/${ptaId}/comparacion?mes=${mesActual}`
      : `/pta/${ptaId}/comparacion`;

    return this.request<ComparacionProgramadoEjecutado>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * Cargar evidencia de progreso
   */
  public async cargarEvidencia(
    registroId: string,
    file: File,
    descripcion: string
  ): Promise<APIResponse<{ url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('descripcion', descripcion);

    const response = await fetch(
      `${this.baseURL}/pta/progreso/${registroId}/evidencia`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: data.code || 'UPLOAD_ERROR',
          message: data.message || 'Error al cargar evidencia',
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      data: data.data
    };
  }

  // ==========================================================================
  // ENDPOINTS - SITUACIONES ADMINISTRATIVAS
  // ==========================================================================

  /**
   * Obtener situaciones administrativas con filtros
   */
  public async getSituacionesAdministrativas(
    filters?: {
      docenteId?: string;
      estado?: string;
      tipo?: string;
      fechaDesde?: string;
      fechaHasta?: string;
    },
    pagination?: PaginationParams
  ): Promise<APIResponse<PaginatedResponse<SituacionAdministrativa>>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, String(value));
      });
    }

    if (pagination) {
      if (pagination.page) params.append('page', String(pagination.page));
      if (pagination.pageSize) params.append('pageSize', String(pagination.pageSize));
    }

    const queryString = params.toString();
    const endpoint = `/situaciones-administrativas${queryString ? `?${queryString}` : ''}`;

    return this.request<PaginatedResponse<SituacionAdministrativa>>(endpoint, {
      method: 'GET'
    });
  }

  /**
   * Crear nueva situación administrativa
   */
  public async createSituacionAdministrativa(
    situacion: Partial<SituacionAdministrativa>
  ): Promise<APIResponse<SituacionAdministrativa>> {
    return this.request<SituacionAdministrativa>('/situaciones-administrativas', {
      method: 'POST',
      body: JSON.stringify(situacion)
    });
  }

  /**
   * Aprobar situación administrativa
   */
  public async aprobarSituacion(
    id: string,
    aprobadorId: string,
    numeroActo: string,
    observaciones?: string
  ): Promise<APIResponse<SituacionAdministrativa>> {
    return this.request<SituacionAdministrativa>(`/situaciones-administrativas/${id}/aprobar`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, numeroActo, observaciones })
    });
  }

  /**
   * Rechazar situación administrativa
   */
  public async rechazarSituacion(
    id: string,
    aprobadorId: string,
    motivo: string
  ): Promise<APIResponse<SituacionAdministrativa>> {
    return this.request<SituacionAdministrativa>(`/situaciones-administrativas/${id}/rechazar`, {
      method: 'POST',
      body: JSON.stringify({ aprobadorId, motivo })
    });
  }

  /**
   * Calcular disponibilidad de un docente
   */
  public async calcularDisponibilidad(
    docenteId: string,
    fechaReferencia?: string
  ): Promise<APIResponse<{
    disponible: boolean;
    porcentajeDisponibilidad: number;
    situacionesActivas: SituacionAdministrativa[];
    razon?: string;
  }>> {
    const params = fechaReferencia ? `?fecha=${fechaReferencia}` : '';
    return this.request(`/situaciones-administrativas/disponibilidad/${docenteId}${params}`, {
      method: 'GET'
    });
  }

  /**
   * Generar reporte de disponibilidad
   */
  public async generarReporteDisponibilidad(
    periodo: string,
    territorial?: string
  ): Promise<APIResponse<ReporteDisponibilidad>> {
    const params = territorial ? `?territorial=${territorial}` : '';
    return this.request<ReporteDisponibilidad>(
      `/situaciones-administrativas/reporte/${periodo}${params}`,
      { method: 'GET' }
    );
  }

  /**
   * Solicitar reporte a Talento Humano
   */
  public async solicitarReporteTH(
    periodo: string,
    solicitadoPor: string
  ): Promise<APIResponse<{ solicitudId: string }>> {
    return this.request<{ solicitudId: string }>('/situaciones-administrativas/solicitar-reporte-th', {
      method: 'POST',
      body: JSON.stringify({ periodo, solicitadoPor })
    });
  }

  // ==========================================================================
  // ENDPOINTS - REPORTES Y EXPORTACIÓN
  // ==========================================================================

  /**
   * Exportar PTA a PDF
   */
  public async exportarPTAPDF(id: string): Promise<APIResponse<{ url: string }>> {
    return this.request<{ url: string }>(`/pta/${id}/export/pdf`, {
      method: 'GET'
    });
  }

  /**
   * Exportar PTA a Excel
   */
  public async exportarPTAExcel(id: string): Promise<APIResponse<{ url: string }>> {
    return this.request<{ url: string }>(`/pta/${id}/export/excel`, {
      method: 'GET'
    });
  }

  /**
   * Exportar reporte de seguimiento
   */
  public async exportarReporteSeguimiento(
    ptaId: string,
    formato: 'pdf' | 'excel'
  ): Promise<APIResponse<{ url: string }>> {
    return this.request<{ url: string }>(`/pta/${ptaId}/seguimiento/export/${formato}`, {
      method: 'GET'
    });
  }

  /**
   * Exportar reporte consolidado de territorial
   */
  public async exportarReporteTerritorial(
    territorial: string,
    periodo: string,
    formato: 'pdf' | 'excel'
  ): Promise<APIResponse<{ url: string }>> {
    return this.request<{ url: string }>(
      `/reportes/territorial/${territorial}/${periodo}/${formato}`,
      { method: 'GET' }
    );
  }

  // ==========================================================================
  // ENDPOINTS - ESTADÍSTICAS Y DASHBOARDS
  // ==========================================================================

  /**
   * Obtener estadísticas generales del PTA
   */
  public async getEstadisticasPTA(
    periodo: string,
    territorial?: string
  ): Promise<APIResponse<{
    totalPTAs: number;
    porEstado: Record<EstadoPTA, number>;
    porTipoVinculacion: Record<string, number>;
    cumplimientoPromedio: number;
    alertasActivas: number;
  }>> {
    const params = territorial ? `?territorial=${territorial}` : '';
    return this.request(`/pta/estadisticas/${periodo}${params}`, {
      method: 'GET'
    });
  }

  /**
   * Obtener dashboard de gestión profesoral
   */
  public async getDashboardGestionProfesoral(
    periodo: string,
    territorial?: string
  ): Promise<APIResponse<any>> {
    const params = territorial ? `?territorial=${territorial}` : '';
    return this.request(`/dashboard/gestion-profesoral/${periodo}${params}`, {
      method: 'GET'
    });
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

/**
 * Instancia única del servicio de API
 */
export const ptaAPI = new PTAAPIService();

// ============================================================================
// FUNCIONES HELPER
// ============================================================================

/**
 * Manejar errores de API
 */
export function handleAPIError(error: APIError): string {
  const errorMessages: Record<string, string> = {
    'NETWORK_ERROR': 'Error de conexión. Por favor verifica tu conexión a internet.',
    'UNAUTHORIZED': 'No tienes autorización para realizar esta acción.',
    'FORBIDDEN': 'No tienes permisos suficientes.',
    'NOT_FOUND': 'El recurso solicitado no existe.',
    'VALIDATION_ERROR': 'Los datos enviados no son válidos.',
    'CONFLICT': 'Ya existe un registro con estos datos.',
    'SERVER_ERROR': 'Error en el servidor. Por favor intenta más tarde.',
    'TIMEOUT': 'La operación tardó demasiado tiempo.',
    'UNKNOWN_ERROR': 'Ha ocurrido un error desconocido.'
  };

  return errorMessages[error.code] || error.message || errorMessages['UNKNOWN_ERROR'];
}

/**
 * Verificar si la respuesta es exitosa
 */
export function isSuccessResponse<T>(response: APIResponse<T>): response is APIResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}
