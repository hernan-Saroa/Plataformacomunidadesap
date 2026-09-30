/**
 * Servicio API - Certificados Laborales
 *
 * Maneja todas las operaciones del módulo de Certificados Laborales:
 * - Solicitudes de certificados
 * - Generación de certificados
 * - Validación de certificados
 * - QR de verificación
 * - Historial y auditoría
 *
 * Nota: Todos los endpoints van al servicio 'certificados' del API Gateway
 * URL: /certificados/api/v1/* -> certification-service:3004/*
 */

import { apiClient } from './apiClient';
import type {
  // Solicitudes
  SolicitudCertificado,
  CreateSolicitudRequest,
  UpdateSolicitudRequest,

  // Certificados
  Certificado,
  CertificadoDetalle,
  GenerarCertificadoRequest,

  // Validación
  ValidacionCertificado,
  ValidacionQRResponse,

  // Plantillas
  PlantillaCertificado,
  CreatePlantillaRequest,

  // Reportes
  HistorialValidaciones,
  EstadisticasCertificados,

  // Filtros
  FiltrosCertificados,
  PaginatedResponse
} from '../../types/certificados';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/certificados/api/v1';

// ============================================================================
// ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  // Solicitudes
  SOLICITUDES: {
    BASE: `${SERVICE_PREFIX}/solicitudes`,
    BY_ID: (id: string) => `${SERVICE_PREFIX}/solicitudes/${id}`,
    BY_EMPLEADO: (empleadoId: string) => `${SERVICE_PREFIX}/solicitudes/empleado/${empleadoId}`,
    APROBAR: (id: string) => `${SERVICE_PREFIX}/solicitudes/${id}/aprobar`,
    RECHAZAR: (id: string) => `${SERVICE_PREFIX}/solicitudes/${id}/rechazar`,
    CANCELAR: (id: string) => `${SERVICE_PREFIX}/solicitudes/${id}/cancelar`,
    ESTADISTICAS: `${SERVICE_PREFIX}/solicitudes/estadisticas`,
  },

  // Certificados
  CERTIFICADOS: {
    BASE: SERVICE_PREFIX,
    BY_ID: (id: string) => `${SERVICE_PREFIX}/${id}`,
    BY_CODIGO: (codigo: string) => `${SERVICE_PREFIX}/codigo/${codigo}`,
    GENERAR: `${SERVICE_PREFIX}/generar`,
    REGENERAR: (id: string) => `${SERVICE_PREFIX}/${id}/regenerar`,
    ANULAR: (id: string) => `${SERVICE_PREFIX}/${id}/anular`,
    DOWNLOAD_PDF: (id: string) => `${SERVICE_PREFIX}/${id}/download`,
    QR_CODE: (id: string) => `${SERVICE_PREFIX}/${id}/qr`,
  },

  // Validación
  VALIDACION: {
    VALIDAR_CODIGO: `${SERVICE_PREFIX}/validar/codigo`,
    VALIDAR_QR: `${SERVICE_PREFIX}/validar/qr`,
    VALIDAR_PUBLICO: `${SERVICE_PREFIX}/validar/publico`,
    HISTORIAL: `${SERVICE_PREFIX}/validacion/historial`,
    DETALLE: (id: string) => `${SERVICE_PREFIX}/validacion/${id}`,
  },

  // Plantillas
  PLANTILLAS: {
    BASE: `${SERVICE_PREFIX}/plantillas`,
    BY_ID: (id: string) => `${SERVICE_PREFIX}/plantillas/${id}`,
    ACTIVAS: `${SERVICE_PREFIX}/plantillas/activas`,
    PREVIEW: (id: string) => `${SERVICE_PREFIX}/plantillas/${id}/preview`,
  },

  // Configuración
  CONFIGURACION: {
    BASE: `${SERVICE_PREFIX}/configuracion`,
    FIRMANTES: `${SERVICE_PREFIX}/configuracion/firmantes`,
    TEXTOS: `${SERVICE_PREFIX}/configuracion/textos`,
    VALIDACIONES: `${SERVICE_PREFIX}/configuracion/validaciones`,
  },

  // Reportes
  REPORTES: {
    GENERADOS: `${SERVICE_PREFIX}/reportes/generados`,
    VALIDACIONES: `${SERVICE_PREFIX}/reportes/validaciones`,
    CONSOLIDADO: `${SERVICE_PREFIX}/reportes/consolidado`,
    EXPORT: `${SERVICE_PREFIX}/reportes/export`,
  },

  // Dashboard
  DASHBOARD: `${SERVICE_PREFIX}/dashboard`,
  ESTADISTICAS: `${SERVICE_PREFIX}/estadisticas`,
};

// ============================================================================
// SERVICIO DE CERTIFICADOS
// ============================================================================

class CertificadosService {
  
  // ==========================================================================
  // SOLICITUDES
  // ==========================================================================
  
  /**
   * Obtiene todas las solicitudes de certificados
   */
  async getSolicitudes(params?: FiltrosCertificados): Promise<PaginatedResponse<SolicitudCertificado>> {
    return apiClient.get<PaginatedResponse<SolicitudCertificado>>(ENDPOINTS.SOLICITUDES.BASE, params);
  }
  
  /**
   * Obtiene una solicitud por ID
   */
  async getSolicitudById(id: string): Promise<SolicitudCertificado> {
    return apiClient.get<SolicitudCertificado>(ENDPOINTS.SOLICITUDES.BY_ID(id));
  }
  
  /**
   * Obtiene solicitudes de un empleado
   */
  async getSolicitudesByEmpleado(empleadoId: string): Promise<SolicitudCertificado[]> {
    return apiClient.get<SolicitudCertificado[]>(ENDPOINTS.SOLICITUDES.BY_EMPLEADO(empleadoId));
  }
  
  /**
   * Crea una nueva solicitud de certificado
   */
  async createSolicitud(data: CreateSolicitudRequest): Promise<SolicitudCertificado> {
    return apiClient.post<SolicitudCertificado>(ENDPOINTS.SOLICITUDES.BASE, data);
  }
  
  /**
   * Actualiza una solicitud
   */
  async updateSolicitud(id: string, data: UpdateSolicitudRequest): Promise<SolicitudCertificado> {
    return apiClient.put<SolicitudCertificado>(ENDPOINTS.SOLICITUDES.BY_ID(id), data);
  }
  
  /**
   * Aprueba una solicitud
   */
  async aprobarSolicitud(id: string, observaciones?: string): Promise<SolicitudCertificado> {
    return apiClient.post<SolicitudCertificado>(ENDPOINTS.SOLICITUDES.APROBAR(id), { observaciones });
  }
  
  /**
   * Rechaza una solicitud
   */
  async rechazarSolicitud(id: string, motivo: string): Promise<SolicitudCertificado> {
    return apiClient.post<SolicitudCertificado>(ENDPOINTS.SOLICITUDES.RECHAZAR(id), { motivo });
  }
  
  /**
   * Cancela una solicitud
   */
  async cancelarSolicitud(id: string, motivo?: string): Promise<SolicitudCertificado> {
    return apiClient.post<SolicitudCertificado>(ENDPOINTS.SOLICITUDES.CANCELAR(id), { motivo });
  }
  
  // ==========================================================================
  // CERTIFICADOS
  // ==========================================================================
  
  /**
   * Obtiene todos los certificados
   */
  async getCertificados(params?: FiltrosCertificados): Promise<PaginatedResponse<Certificado>> {
    return apiClient.get<PaginatedResponse<Certificado>>(ENDPOINTS.CERTIFICADOS.BASE, params);
  }
  
  /**
   * Obtiene un certificado por ID con detalle completo
   */
  async getCertificadoById(id: string): Promise<CertificadoDetalle> {
    return apiClient.get<CertificadoDetalle>(ENDPOINTS.CERTIFICADOS.BY_ID(id));
  }
  
  /**
   * Obtiene un certificado por código
   */
  async getCertificadoByCodigo(codigo: string): Promise<CertificadoDetalle> {
    return apiClient.get<CertificadoDetalle>(ENDPOINTS.CERTIFICADOS.BY_CODIGO(codigo));
  }
  
  /**
   * Genera un nuevo certificado
   */
  async generarCertificado(data: GenerarCertificadoRequest): Promise<Certificado> {
    return apiClient.post<Certificado>(ENDPOINTS.CERTIFICADOS.GENERAR, data);
  }
  
  /**
   * Regenera un certificado existente
   */
  async regenerarCertificado(id: string, motivo: string): Promise<Certificado> {
    return apiClient.post<Certificado>(ENDPOINTS.CERTIFICADOS.REGENERAR(id), { motivo });
  }
  
  /**
   * Anula un certificado
   */
  async anularCertificado(id: string, motivo: string): Promise<Certificado> {
    return apiClient.post<Certificado>(ENDPOINTS.CERTIFICADOS.ANULAR(id), { motivo });
  }
  
  /**
   * Descarga el PDF de un certificado
   */
  async downloadCertificadoPDF(id: string): Promise<Blob> {
    return apiClient.get<Blob>(ENDPOINTS.CERTIFICADOS.DOWNLOAD_PDF(id));
  }
  
  /**
   * Obtiene el código QR de un certificado
   */
  async getCertificadoQR(id: string): Promise<{ qrCode: string; url: string }> {
    return apiClient.get(ENDPOINTS.CERTIFICADOS.QR_CODE(id));
  }
  
  // ==========================================================================
  // VALIDACIÓN
  // ==========================================================================
  
  /**
   * Valida un certificado por código
   */
  async validarPorCodigo(codigo: string): Promise<ValidacionCertificado> {
    return apiClient.post<ValidacionCertificado>(ENDPOINTS.VALIDACION.VALIDAR_CODIGO, { codigo });
  }
  
  /**
   * Valida un certificado escaneando QR
   */
  async validarPorQR(qrData: string): Promise<ValidacionQRResponse> {
    return apiClient.post<ValidacionQRResponse>(ENDPOINTS.VALIDACION.VALIDAR_QR, { qrData });
  }
  
  /**
   * Validación pública de certificado (sin autenticación)
   */
  async validarPublico(codigoOrUrl: string): Promise<ValidacionCertificado> {
    return apiClient.post<ValidacionCertificado>(
      ENDPOINTS.VALIDACION.VALIDAR_PUBLICO,
      { codigo: codigoOrUrl },
      { skipAuth: true }
    );
  }
  
  /**
   * Obtiene historial de validaciones
   */
  async getHistorialValidaciones(params?: FiltrosCertificados): Promise<PaginatedResponse<HistorialValidaciones>> {
    return apiClient.get<PaginatedResponse<HistorialValidaciones>>(ENDPOINTS.VALIDACION.HISTORIAL, params);
  }
  
  /**
   * Obtiene detalle de una validación
   */
  async getValidacionDetalle(id: string): Promise<any> {
    return apiClient.get(ENDPOINTS.VALIDACION.DETALLE(id));
  }
  
  // ==========================================================================
  // PLANTILLAS
  // ==========================================================================
  
  /**
   * Obtiene todas las plantillas
   */
  async getPlantillas(): Promise<PlantillaCertificado[]> {
    return apiClient.get<PlantillaCertificado[]>(ENDPOINTS.PLANTILLAS.BASE);
  }
  
  /**
   * Obtiene plantillas activas
   */
  async getPlantillasActivas(): Promise<PlantillaCertificado[]> {
    return apiClient.get<PlantillaCertificado[]>(ENDPOINTS.PLANTILLAS.ACTIVAS);
  }
  
  /**
   * Obtiene una plantilla por ID
   */
  async getPlantillaById(id: string): Promise<PlantillaCertificado> {
    return apiClient.get<PlantillaCertificado>(ENDPOINTS.PLANTILLAS.BY_ID(id));
  }
  
  /**
   * Crea una nueva plantilla
   */
  async createPlantilla(data: CreatePlantillaRequest): Promise<PlantillaCertificado> {
    return apiClient.post<PlantillaCertificado>(ENDPOINTS.PLANTILLAS.BASE, data);
  }
  
  /**
   * Actualiza una plantilla
   */
  async updatePlantilla(id: string, data: Partial<CreatePlantillaRequest>): Promise<PlantillaCertificado> {
    return apiClient.put<PlantillaCertificado>(ENDPOINTS.PLANTILLAS.BY_ID(id), data);
  }
  
  /**
   * Obtiene preview de una plantilla
   */
  async previewPlantilla(id: string, data?: any): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.PLANTILLAS.PREVIEW(id), data);
  }
  
  // ==========================================================================
  // CONFIGURACIÓN
  // ==========================================================================
  
  /**
   * Obtiene la configuración general
   */
  async getConfiguracion(): Promise<any> {
    return apiClient.get(ENDPOINTS.CONFIGURACION.BASE);
  }
  
  /**
   * Actualiza la configuración general
   */
  async updateConfiguracion(data: any): Promise<any> {
    return apiClient.put(ENDPOINTS.CONFIGURACION.BASE, data);
  }
  
  /**
   * Obtiene firmantes configurados
   */
  async getFirmantes(): Promise<any[]> {
    return apiClient.get(ENDPOINTS.CONFIGURACION.FIRMANTES);
  }
  
  /**
   * Actualiza firmantes
   */
  async updateFirmantes(data: any[]): Promise<any> {
    return apiClient.put(ENDPOINTS.CONFIGURACION.FIRMANTES, { firmantes: data });
  }
  
  // ==========================================================================
  // DASHBOARD Y ESTADÍSTICAS
  // ==========================================================================
  
  /**
   * Obtiene el dashboard de certificados
   */
  async getDashboard(): Promise<any> {
    return apiClient.get(ENDPOINTS.DASHBOARD);
  }
  
  /**
   * Obtiene estadísticas de certificados
   */
  async getEstadisticas(params?: { fechaInicio?: string; fechaFin?: string }): Promise<EstadisticasCertificados> {
    return apiClient.get<EstadisticasCertificados>(ENDPOINTS.ESTADISTICAS, params);
  }
  
  // ==========================================================================
  // REPORTES
  // ==========================================================================
  
  /**
   * Genera reporte de certificados generados
   */
  async generarReporteCertificados(params: any): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.GENERADOS, params);
  }
  
  /**
   * Genera reporte de validaciones
   */
  async generarReporteValidaciones(params: any): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.VALIDACIONES, params);
  }
  
  /**
   * Genera reporte consolidado
   */
  async generarReporteConsolidado(periodo: string): Promise<Blob> {
    return apiClient.post<Blob>(ENDPOINTS.REPORTES.CONSOLIDADO, { periodo });
  }
  
  /**
   * Exporta datos de certificados
   */
  async exportarDatos(params: FiltrosCertificados, formato: 'excel' | 'csv' = 'excel'): Promise<Blob> {
    return apiClient.get<Blob>(ENDPOINTS.REPORTES.EXPORT, { ...params, formato });
  }
}

// Singleton instance
export const certificadosService = new CertificadosService();
export default certificadosService;
