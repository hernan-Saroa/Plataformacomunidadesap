/**
 * Certificados Service
 * Servicio para gestión de certificados (graduados y laborales)
 */

import { apiClient } from './client';
import type { PaginatedResponse } from './config';
import type {
  CertificadoGraduado,
  CertificadoLaboral,
  ValidarCertificadoRequest,
  ValidarCertificadoResponse,
} from './types';

export const certificadosService = {
  /**
   * CERTIFICADOS DE GRADUADOS
   */
  graduados: {
    /**
     * Listar certificados de graduados
     */
    async listar(params?: {
      page?: number;
      limit?: number;
      busqueda?: string;
      estado?: string;
      programaId?: string;
      sedeId?: string;
      fechaGradoDesde?: string;
      fechaGradoHasta?: string;
    }): Promise<PaginatedResponse<CertificadoGraduado>> {
      return apiClient.get<PaginatedResponse<CertificadoGraduado>>('/backoffice/certificados-graduados', { params });
    },

    /**
     * Obtener certificado por ID
     */
    async obtenerPorId(id: string): Promise<CertificadoGraduado> {
      return apiClient.get<CertificadoGraduado>(`/backoffice/certificados-graduados/${id}`);
    },

    /**
     * Crear certificado de graduado
     */
    async crear(data: Partial<CertificadoGraduado>): Promise<CertificadoGraduado> {
      return apiClient.post<CertificadoGraduado>('/backoffice/certificados-graduados', data);
    },

    /**
     * Actualizar certificado
     */
    async actualizar(id: string, data: Partial<CertificadoGraduado>): Promise<CertificadoGraduado> {
      return apiClient.put<CertificadoGraduado>(`/backoffice/certificados-graduados/${id}`, data);
    },

    /**
     * Revocar certificado
     */
    async revocar(id: string, motivo: string): Promise<CertificadoGraduado> {
      return apiClient.patch<CertificadoGraduado>(`/backoffice/certificados-graduados/${id}/revocar`, { motivo });
    },

    /**
     * Obtener validaciones de un certificado
     */
    async obtenerValidaciones(id: string): Promise<any[]> {
      return apiClient.get(`/backoffice/certificados-graduados/${id}/validaciones`);
    },
  },

  /**
   * CERTIFICADOS LABORALES
   */
  laborales: {
    /**
     * Listar certificados laborales
     */
    async listar(params?: {
      estado?: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Generado';
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<CertificadoLaboral>> {
      return apiClient.get<PaginatedResponse<CertificadoLaboral>>('/backoffice/certificados-laborales', { params });
    },

    /**
     * Obtener certificado laboral por ID
     */
    async obtenerPorId(id: string): Promise<CertificadoLaboral> {
      return apiClient.get<CertificadoLaboral>(`/backoffice/certificados-laborales/${id}`);
    },

    /**
     * Aprobar certificado laboral
     */
    async aprobar(id: string): Promise<CertificadoLaboral> {
      return apiClient.patch<CertificadoLaboral>(`/backoffice/certificados-laborales/${id}/aprobar`);
    },

    /**
     * Rechazar certificado laboral
     */
    async rechazar(id: string, motivo: string): Promise<CertificadoLaboral> {
      return apiClient.patch<CertificadoLaboral>(`/backoffice/certificados-laborales/${id}/rechazar`, { motivo });
    },

    /**
     * Generar PDF de certificado laboral
     */
    async generarPDF(id: string): Promise<{ pdfUrl: string }> {
      return apiClient.post<{ pdfUrl: string }>(`/backoffice/certificados-laborales/${id}/generar-pdf`);
    },
  },

  /**
   * VALIDACIÓN PÚBLICA (Landing Page)
   */
  validacion: {
    /**
     * Validar certificado por QR
     */
    async validarQR(data: ValidarCertificadoRequest): Promise<ValidarCertificadoResponse> {
      return apiClient.post<ValidarCertificadoResponse>('/public/certificados/validar-qr', data, {
        requiresAuth: false,
      });
    },

    /**
     * Validar certificado por código
     */
    async validarCodigo(data: ValidarCertificadoRequest): Promise<ValidarCertificadoResponse> {
      return apiClient.post<ValidarCertificadoResponse>('/public/certificados/validar-codigo', data, {
        requiresAuth: false,
      });
    },

    /**
     * Obtener estadísticas públicas
     */
    async estadisticas(): Promise<{
      totalEmitidos: number;
      totalValidaciones: number;
      validacionesUltimoMes: number;
    }> {
      return apiClient.get('/public/certificados/estadisticas', {
        requiresAuth: false,
      });
    },
  },
};

export default certificadosService;
