/**
 * Certificados Service
 * Servicio para gestión de certificados (graduados y laborales)
 *
 * Nota: Todos los endpoints van al servicio 'certificados' del API Gateway
 * URL: /certificados/api/v1/* -> certification-service:3004/*
 */

import { apiClient } from './apiClient';
import type { PaginatedResponse } from './config';
import type {
  CertificadoGraduado,
  CertificadoLaboral,
  ValidarCertificadoRequest,
  ValidarCertificadoResponse,
} from './types';
import { API_MODE, MICROSERVICE_URLS, getServiceUrl } from '../../config/environment';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/certificados/api/v1';

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
      return apiClient.get<PaginatedResponse<CertificadoGraduado>>(`${SERVICE_PREFIX}/backoffice/certificados-graduados`, { params });
    },

    /**
     * Obtener certificado por ID
     */
    async obtenerPorId(id: string): Promise<CertificadoGraduado> {
      return apiClient.get<CertificadoGraduado>(`${SERVICE_PREFIX}/backoffice/certificados-graduados/${id}`);
    },

    /**
     * Crear certificado de graduado.
     */
    async crear(data: Partial<CertificadoGraduado>): Promise<CertificadoGraduado> {
      return apiClient.post<CertificadoGraduado>(`${SERVICE_PREFIX}/backoffice/certificados-graduados`, data);
    },

    /**
     * Actualizar certificado
     */
    async actualizar(id: string, data: Partial<CertificadoGraduado>): Promise<CertificadoGraduado> {
      return apiClient.put<CertificadoGraduado>(`${SERVICE_PREFIX}/backoffice/certificados-graduados/${id}`, data);
    },

    /**
     * Revocar certificado
     */
    async revocar(id: string, motivo: string): Promise<CertificadoGraduado> {
      return apiClient.patch<CertificadoGraduado>(`${SERVICE_PREFIX}/backoffice/certificados-graduados/${id}/revocar`, { motivo });
    },

    /**
     * Obtener validaciones de un certificado
     */
    async obtenerValidaciones(id: string): Promise<any[]> {
      return apiClient.get(`${SERVICE_PREFIX}/backoffice/certificados-graduados/${id}/validaciones`);
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
      estado?: string;
      search?: string;
      cargo?: string;
      tipoVinculacion?: string;
      fechaDesde?: string;
      fechaHasta?: string;
      page?: number;
      limit?: number;
    }): Promise<any> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/certificados`, params);
    },

    /**
     * Obtener certificado laboral por ID
     */
    async obtenerPorId(id: string): Promise<CertificadoLaboral> {
      return apiClient.get<CertificadoLaboral>(`${SERVICE_PREFIX}/certificates/certificados/${id}`);
    },

    /**
     * Aprobar certificado laboral
     */
    async aprobar(id: string): Promise<CertificadoLaboral> {
      return apiClient.patch<CertificadoLaboral>(`${SERVICE_PREFIX}/certificates/solicitudes/${id}`, { estado: 'APROBADO' });
    },

    /**
     * Rechazar certificado laboral
     */
    async rechazar(id: string, motivo: string): Promise<CertificadoLaboral> {
      return apiClient.patch<CertificadoLaboral>(`${SERVICE_PREFIX}/certificates/solicitudes/${id}`, { estado: 'RECHAZADO', observaciones: motivo });
    },

    /**
     * Generar PDF de certificado laboral
     */
    async generarPDF(id: string): Promise<{ pdfUrl: string }> {
      return apiClient.post<{ pdfUrl: string }>(`${SERVICE_PREFIX}/certificates/certificados/generate/${id}`, {});
    },

    /**
     * Reenviar certificado laboral por email
     */
    async reenviar(
      id: string,
      options?: {
        includeSalary?: boolean;
        includeTechnicalBonus?: boolean;
        templateType?: 'docente' | 'administrador';
        publicBaseUrl?: string;
      },
    ): Promise<{ mensaje: string; email: string }> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/certificados/${id}/reenviar`,
        options || {},
      );
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
      return apiClient.post<ValidarCertificadoResponse>(`${SERVICE_PREFIX}/public/certificados/validar-qr`, data, {
        requiresAuth: false,
      });
    },

    /**
     * Validar certificado por código
     */
    async validarCodigo(data: ValidarCertificadoRequest): Promise<ValidarCertificadoResponse> {
      // Ruta pública no disponible en backend actual; reutilizamos verify para evitar 404
      const raw = data.codigo || data.qrCode || data.codigoQR || '';
      const codigo = raw.toUpperCase();
      return apiClient.get<ValidarCertificadoResponse>(`${SERVICE_PREFIX}/certificates/certificados/verify/${codigo}`, {
        requiresAuth: false,
      });
    },

    /**
     * Verificar y validar certificado laboral (registra la verificación)
     */
    async verificarCertificadoLaboral(codigoVerificacion: string): Promise<any> {
      const codigo = (codigoVerificacion || '').toUpperCase();
      return apiClient.get(`${SERVICE_PREFIX}/certificates/certificados/verify/${codigo}`, {
        requiresAuth: false,
      });
    },

    /**
     * Obtener historial de validaciones de un certificado laboral
     */
    async historialValidaciones(codigoVerificacion: string): Promise<any> {
      const codigo = (codigoVerificacion || '').toUpperCase();
      return apiClient.get(`${SERVICE_PREFIX}/certificates/certificados/${codigo}/validations`, {
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
      return apiClient.get(`${SERVICE_PREFIX}/public/certificados/estadisticas`, {
        requiresAuth: false,
      });
    },
  },

  /**
   * AUTOSERVICIO - SOLICITUD DE CERTIFICADOS POR EMPLEADO
   */
  autoservicio: {
    /**
     * Verificar si un documento existe en la base de datos
     */
    async verificarDocumento(documento: string): Promise<{
      existe: boolean;
      tieneCertificado?: boolean;
      mensaje: string;
      solicitud?: any;
      certificado?: any;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/autoservicio/verificar-documento`,
        { documento },
        { requiresAuth: false }
      );
    },

    /**
     * Generar código de validación para el documento
     */
    async generarCodigoValidacion(documento: string): Promise<{
      mensaje: string;
      email: string;
      codigoTest?: string;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/autoservicio/generar-codigo`,
        { documento },
        { requiresAuth: false }
      );
    },

    /**
     * Validar código y generar certificado
     */
    async validarCodigoYGenerarCertificado(documento: string, codigo: string): Promise<{
      mensaje: string;
      certificado: any;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/autoservicio/validar-codigo`,
        { documento, codigo },
        { requiresAuth: false }
      );
    },
  },

  /**
   * CONFIGURACIÓN DE PLANTILLA
   */
  plantilla: {
    /**
     * Obtener configuración activa de la plantilla
     */
    async obtenerConfiguracion(tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/template-config?tipo=${tipo}`);
    },

    /**
     * Actualizar nombre del firmante
     */
    async actualizarNombreFirmante(signerName: string, updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/signer-name?tipo=${tipo}`,
        { signerName, updatedBy },
      );
    },

    /**
     * Subir imagen de firma
     */
    async subirFirma(file: File, updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      const formData = new FormData();
      formData.append('file', file);
      if (updatedBy) {
        formData.append('updatedBy', updatedBy);
      }

      return apiClient.upload(
        `${SERVICE_PREFIX}/certificates/template-config/upload-signature?tipo=${tipo}`,
        formData,
      );
    },

    /**
     * Subir logo de la entidad
     */
    async subirLogo(file: File, updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      const formData = new FormData();
      formData.append('file', file);
      if (updatedBy) {
        formData.append('updatedBy', updatedBy);
      }

      return apiClient.upload(
        `${SERVICE_PREFIX}/certificates/template-config/upload-logo?tipo=${tipo}`,
        formData,
      );
    },

    /**
      * Restablecer logo al predeterminado
      */
    async resetLogo(updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/reset-logo`,
        { updatedBy },
        { params: { tipo } },
      );
    },

    /**
      * Quitar firma (dejar vacía)
      */
    async resetFirma(updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/reset-signature?tipo=${tipo}`,
        { updatedBy },
      );
    },

    /**
      * Restablecer nombre del firmante al predeterminado
      */
    async resetNombreFirmante(updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      try {
        return await apiClient.post(
          `${SERVICE_PREFIX}/certificates/template-config/reset-signer?tipo=${tipo}`,
          { updatedBy },
        );
      } catch (error: any) {
        if (error.status === 404) {
          return await certificadosService.plantilla.actualizarNombreFirmante('', updatedBy, tipo);
        }
        throw error;
      }
    },

    /**
      * Restablecer titulo del cargo al predeterminado
      */
    async resetTituloCargo(updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/reset-cargo-title?tipo=${tipo}`,
        { updatedBy },
      );
    },

    /**
      * Restablecer contenido del certificado al predeterminado
      */
    async resetContenido(updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/reset-content?tipo=${tipo}`,
        { updatedBy },
      );
    },

    /**
     * Revertir un cambio del historial
     */
    async revertirCambio(changeId: number, updatedBy?: string, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/revert-change`,
        { changeId, updatedBy },
        { params: { tipo } },
      );
    },

    /**
     * Obtener historial de cambios
     */
    async obtenerHistorialCambios(
      tipo: 'docente' | 'administrador' = 'docente',
      limit: number = 10,
      offset: number = 0
    ): Promise<{ items: any[]; total: number; limit: number; offset: number }> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/template-config/change-history?tipo=${tipo}&limit=${limit}&offset=${offset}`);
    },

    /**
     * Actualizar contenido de la plantilla (tipografía, título del cargo, contenido HTML)
     */
    async actualizarContenidoPlantilla(data: {
      typographyFont?: string;
      cargoTitle?: string;
      certificateContentHtml?: string;
      updatedBy?: string;
    }, tipo: 'docente' | 'administrador' = 'docente'): Promise<any> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/content?tipo=${tipo}`,
        data,
      );
    },
  },
};

export default certificadosService;
