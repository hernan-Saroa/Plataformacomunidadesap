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

export type CorrectionStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export type CorrectionEvidence = {
  index: number;
  originalName: string;
  mimeType: string;
  size: number;
};

export type CorrectionTraceChange = {
  field: string;
  label: string;
  before: string;
  after: string;
};

export type CorrectionTraceEvent = {
  id: string;
  type:
    | 'REQUEST_CREATED'
    | 'REVIEW_STARTED'
    | 'CERTIFICATE_SENT'
    | 'CERTIFICATE_RESENT'
    | 'REQUEST_REJECTED';
  title: string;
  description: string;
  status: CorrectionStatus;
  occurred_at: string;
  actor_name: string;
  actor_email?: string | null;
  actor_role: 'SOLICITANTE' | 'COORDINADOR';
  metadata?: {
    certificate_number?: string;
    due_date?: string;
    evidence_count?: number;
    requested_recipient?: string;
    recipient?: string;
    delivery_status?: 'SENT' | 'FAILED' | 'UNKNOWN';
    changes?: CorrectionTraceChange[];
    [key: string]: unknown;
  };
};

export type CorrectionCertificatePreview = {
  content_html: string;
  body_content_html?: string;
  closing_content_html?: string;
  cargo_title: string;
  typography_font: string;
  signer_name: string;
  signer_position: string;
  template_type: 'docente' | 'administrador';
  template_version: string | null;
  certificate_number: string;
  template_variables: Array<{
    code: string;
    label: string;
    value: string;
    source_fields: string[];
  }>;
};

export type CertificateCorrectionRequest = {
  id: string;
  request_number: string;
  certificate_id: string;
  status: CorrectionStatus;
  description: string;
  requester_name: string;
  requester_email: string;
  submitted_evidence: CorrectionEvidence[];
  certificate_snapshot: Record<string, any>;
  due_date: string;
  reviewed_by_name?: string | null;
  reviewed_by_email?: string | null;
  review_started_at?: string | null;
  resolution_description?: string | null;
  resolution_evidence: CorrectionEvidence[];
  corrected_data?: Record<string, any> | null;
  traceability: CorrectionTraceEvent[];
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  certificate?: Record<string, any>;
};

export type CertificateCorrectionListResponse =
  | CertificateCorrectionRequest[]
  | {
      items?: CertificateCorrectionRequest[];
      data?: CertificateCorrectionRequest[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };

export type PrimaTecnicaCategoria = string;

export type PrimaTecnicaCategoriaConfig = {
  id: string;
  category: PrimaTecnicaCategoria;
  label: string;
  description?: string | null;
  template_text: string;
  default_template_text?: string;
  display_order?: number;
  is_system?: boolean;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
};

export type PrimaTecnicaRegistroApi = {
  id: string;
  category: PrimaTecnicaCategoria;
  request_id: string | null;
  full_name: string;
  id_number: string;
  percentage: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type LaborFunctionItemApi = {
  id?: string;
  ordinal: number;
  description: string;
};

export type LaborFunctionProfileApi = {
  id: string;
  position_code: string;
  grade_code: string | null;
  combined_code: string;
  hierarchical_level: string | null;
  position_name: string;
  department_name: string | null;
  internal_group: string | null;
  cost_center: string | null;
  source_sheet: string | null;
  is_active: boolean;
  functions: LaborFunctionItemApi[];
  function_count: number;
  association_count: number;
  created_at: string;
  updated_at: string;
};

export type LaborFunctionProfilePayloadApi = {
  positionCode?: string;
  gradeCode?: string;
  combinedCode?: string;
  hierarchicalLevel?: string;
  positionName?: string;
  departmentName?: string;
  internalGroup?: string;
  costCenter?: string;
  sourceSheet?: string;
  functions: string[] | string;
  isActive?: boolean;
  rowNumber?: number;
};

export const certificadosService = {
  correcciones: {
    async listar(params?: {
      page?: number;
      limit?: number;
      status?: CorrectionStatus | 'ALL';
      search?: string;
    }): Promise<CertificateCorrectionListResponse> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/correction-requests`, params);
    },

    async estadisticas(): Promise<{
      total: number;
      pending: number;
      in_review: number;
      approved: number;
      rejected: number;
      overdue: number;
    }> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/correction-requests/stats`);
    },

    async obtener(id: string): Promise<CertificateCorrectionRequest> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/correction-requests/${id}`);
    },

    async iniciarRevision(id: string): Promise<CertificateCorrectionRequest> {
      return apiClient.patch(`${SERVICE_PREFIX}/certificates/correction-requests/${id}/start-review`, {});
    },

    async previsualizar(id: string, data: Record<string, any>): Promise<CorrectionCertificatePreview> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/correction-requests/${id}/preview`, data);
    },

    async aprobar(
      id: string,
      data: Record<string, any>,
      files: File[] = [],
      onProgress?: (progress: number) => void,
    ): Promise<CertificateCorrectionRequest & { message: string; email: string; email_sent: boolean }> {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        formData.append(
          key,
          typeof value === 'object' ? JSON.stringify(value) : String(value),
        );
      });
      files.forEach((file) => formData.append('files', file));
      return apiClient.upload(
        `${SERVICE_PREFIX}/certificates/correction-requests/${id}/approve`,
        formData,
        onProgress,
      );
    },

    async rechazar(
      id: string,
      description: string,
      files: File[],
      onProgress?: (progress: number) => void,
    ): Promise<CertificateCorrectionRequest & { message: string; email_sent: boolean }> {
      const formData = new FormData();
      formData.append('description', description);
      files.forEach((file) => formData.append('files', file));
      return apiClient.upload(
        `${SERVICE_PREFIX}/certificates/correction-requests/${id}/reject`,
        formData,
        onProgress,
      );
    },

    async reenviarAprobada(
      id: string,
      options?: { publicBaseUrl?: string },
    ): Promise<CertificateCorrectionRequest & {
      message: string;
      email: string;
      email_sent: boolean;
    }> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/correction-requests/${id}/resend-approved`,
        options || {},
      );
    },

    async evidencia(id: string, kind: 'submitted' | 'resolution', index: number): Promise<Blob> {
      return apiClient.getBlob(
        `${SERVICE_PREFIX}/certificates/correction-requests/${id}/evidence/${kind}/${index}`,
      );
    },
  },

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
    async listarFuncionesLaborales(params?: {
      search?: string;
      page?: number;
      limit?: number;
    }): Promise<{
      items: LaborFunctionProfileApi[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      stats: { profiles: number; functions: number; associatedRequests: number };
    }> {
      return apiClient.get(`${SERVICE_PREFIX}/certificates/labor-functions`, params);
    },

    async crearFuncionesLaborales(
      data: LaborFunctionProfilePayloadApi,
    ): Promise<LaborFunctionProfileApi & { action: 'created' }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/labor-functions`, data);
    },

    async actualizarFuncionesLaborales(
      id: string,
      data: LaborFunctionProfilePayloadApi,
    ): Promise<LaborFunctionProfileApi & { action: 'updated' }> {
      return apiClient.put(`${SERVICE_PREFIX}/certificates/labor-functions/${id}`, data);
    },

    async eliminarFuncionesLaborales(id: string): Promise<{ id: string; deleted: true }> {
      return apiClient.delete(`${SERVICE_PREFIX}/certificates/labor-functions/${id}`);
    },

    async validarFuncionesLaboralesMasivas(data: {
      rows: LaborFunctionProfilePayloadApi[];
      sourceSheet?: string;
      updatedBy?: string;
    }): Promise<{
      summary: { total: number; valid: number; invalid: number; toCreate: number; toUpdate: number };
      results: Array<{
        rowNumber: number;
        status: 'valid' | 'error';
        action?: 'created' | 'updated' | null;
        combined_code?: string;
        function_count?: number;
        message: string;
      }>;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/labor-functions/bulk/validate`, data);
    },

    async cargarFuncionesLaboralesMasivas(data: {
      rows: LaborFunctionProfilePayloadApi[];
      sourceSheet?: string;
      updatedBy?: string;
    }): Promise<{
      summary: { total: number; success: number; failed: number; created: number; updated: number };
      results: Array<{
        rowNumber: number;
        status: 'success' | 'error';
        action?: 'created' | 'updated';
        combined_code?: string;
        function_count?: number;
        message: string;
      }>;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/labor-functions/bulk/import`, data);
    },

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
      forExport?: boolean | string;
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
        includeFunctions?: boolean;
        templateType?: 'docente' | 'administrador';
        publicBaseUrl?: string;
      },
    ): Promise<{ mensaje: string; email: string }> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/certificados/${id}/reenviar`,
        options || {},
      );
    },

    async obtenerPDFBlob(id: string): Promise<Blob> {
      return apiClient.getBlob(
        `${SERVICE_PREFIX}/certificates/certificados/${id}/pdf`,
        undefined,
        { skipErrorToast: true },
      );
    },

    /**
     * Buscar personas en certificate_requests para asignar Prima Tecnica
     */
    async buscarCandidatosPrimaTecnica(
      query: string,
      limit: number = 10,
    ): Promise<Array<{ requestId: string; fullName: string; idNumber: string }>> {
      return apiClient.get(
        `${SERVICE_PREFIX}/certificates/technical-bonus/search`,
        { query, limit },
      );
    },

    /**
     * Listar categorias dinamicas de Prima Tecnica
     */
    async listarCategoriasPrimaTecnica(): Promise<PrimaTecnicaCategoriaConfig[]> {
      return apiClient.get(
        `${SERVICE_PREFIX}/certificates/technical-bonus/categories`,
      );
    },

    /**
     * Crear una categoria dinamica de Prima Tecnica
     */
    async crearCategoriaPrimaTecnica(data: {
      label: string;
      description?: string;
      templateText?: string;
      code?: string;
    }): Promise<PrimaTecnicaCategoriaConfig> {
      return apiClient.post(
        `${SERVICE_PREFIX}/certificates/technical-bonus/categories`,
        data,
      );
    },

    /**
     * Actualizar una categoria dinamica de Prima Tecnica
     */
    async actualizarCategoriaPrimaTecnica(
      category: PrimaTecnicaCategoria,
      data: {
        label?: string;
        description?: string;
        templateText?: string;
        isActive?: boolean;
        displayOrder?: number;
      },
    ): Promise<PrimaTecnicaCategoriaConfig> {
      return apiClient.put(
        `${SERVICE_PREFIX}/certificates/technical-bonus/categories/${encodeURIComponent(category)}`,
        data,
      );
    },

    /**
     * Eliminar una categoria dinamica de Prima Tecnica
     */
    async eliminarCategoriaPrimaTecnica(
      category: PrimaTecnicaCategoria,
    ): Promise<{ category: PrimaTecnicaCategoria; deleted: boolean }> {
      return apiClient.delete(
        `${SERVICE_PREFIX}/certificates/technical-bonus/categories/${encodeURIComponent(category)}`,
      );
    },

    /**
     * Listar registros de Prima Tecnica por categoria
     */
    async listarPrimaTecnica(
      category: PrimaTecnicaCategoria,
    ): Promise<PrimaTecnicaRegistroApi[]> {
      return apiClient.get(
        `${SERVICE_PREFIX}/certificates/technical-bonus`,
        { category },
      );
    },

    /**
     * Crear o actualizar un registro de Prima Tecnica
     */
    async guardarPrimaTecnica(data: {
      category: PrimaTecnicaCategoria;
      idNumber: string;
      fullName?: string;
      requestId?: string;
      percentage: number;
      updatedBy?: string;
    }): Promise<PrimaTecnicaRegistroApi & { action: 'created' | 'updated' }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/technical-bonus`, data);
    },

    /**
     * Editar porcentaje de un registro de Prima Tecnica
     */
    async actualizarPrimaTecnica(
      id: string,
      data: {
        percentage: number;
        updatedBy?: string;
      },
    ): Promise<PrimaTecnicaRegistroApi & { action: 'updated' }> {
      return apiClient.put(`${SERVICE_PREFIX}/certificates/technical-bonus/${id}`, data);
    },

    /**
     * Eliminar un registro de Prima Tecnica
     */
    async eliminarPrimaTecnica(id: string): Promise<{
      id: string;
      category: PrimaTecnicaCategoria;
      full_name: string;
      id_number: string;
      deleted: true;
    }> {
      return apiClient.delete(`${SERVICE_PREFIX}/certificates/technical-bonus/${id}`);
    },

    /**
     * Eliminar todos los registros de Prima Tecnica de una categoria
     */
    async eliminarUsuariosPrimaTecnicaPorCategoria(
      category: PrimaTecnicaCategoria,
    ): Promise<{ category: PrimaTecnicaCategoria; deleted_count: number }> {
      return apiClient.delete(
        `${SERVICE_PREFIX}/certificates/technical-bonus/categories/${encodeURIComponent(category)}/assignments`,
      );
    },

    /**
     * Obtener plantilla de parrafo de Prima Tecnica por categoria
     */
    async obtenerPlantillaPrimaTecnica(
      category: PrimaTecnicaCategoria,
    ): Promise<PrimaTecnicaCategoriaConfig> {
      return apiClient.get(
        `${SERVICE_PREFIX}/certificates/technical-bonus/template/${category}`,
      );
    },

    /**
     * Actualizar plantilla de parrafo de Prima Tecnica por categoria
     */
    async actualizarPlantillaPrimaTecnica(
      category: PrimaTecnicaCategoria,
      templateText: string,
    ): Promise<PrimaTecnicaCategoriaConfig> {
      return apiClient.put(
        `${SERVICE_PREFIX}/certificates/technical-bonus/template/${category}`,
        { template_text: templateText },
      );
    },

    /**
     * Carga masiva de Prima Tecnica con reporte por fila
     */
    async cargarPrimaTecnicaMasiva(data: {
      category: PrimaTecnicaCategoria;
      rows: Array<{
        rowNumber?: number;
        fullName?: string;
        idNumber?: string;
        percentage?: number | string;
      }>;
      updatedBy?: string;
    }): Promise<{
      category: PrimaTecnicaCategoria;
      summary: {
        total: number;
        success: number;
        failed: number;
        created: number;
        updated: number;
      };
      results: Array<{
        rowNumber: number;
        status: 'success' | 'error';
        id_number?: string;
        full_name?: string;
        percentage?: number;
        action?: 'created' | 'updated';
        message: string;
        record?: {
          id: string;
          category: PrimaTecnicaCategoria;
          request_id: string | null;
          full_name: string;
          id_number: string;
          percentage: number;
          created_by?: string | null;
          updated_by?: string | null;
          created_at: string;
          updated_at: string;
          action: 'created' | 'updated';
        };
      }>;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/technical-bonus/bulk`, data);
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
      technical_bonus_available?: boolean;
      technical_bonus_percentage?: number;
      technical_bonus_value?: number;
      technical_bonus_category?: PrimaTecnicaCategoria | null;
      technical_bonuses?: any[];
      solicitud?: {
        full_name?: string;
        id_number?: string;
        email?: string;
        status?: string;
        hiring_date?: string;
        request_date?: string;
        career_category?: string;
        position_category?: string;
        position_location?: string;
        monthly_salary?: number | string;
        salary_text?: string;
        department?: string;
        cod_cargo?: string;
        cod_grade?: string;
        campus?: string;
        observations?: string;
        technical_bonus_available?: boolean;
        technical_bonus_percentage?: number;
        technical_bonus_value?: number;
        technical_bonus_category?: PrimaTecnicaCategoria | null;
        technical_bonuses?: any[];
        [key: string]: any;
      };
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
      solicitud?: {
        full_name?: string;
        id_number?: string;
        email?: string;
        status?: string;
        employment_status?: string;
        career_category?: string;
        hiring_date?: string;
        position_category?: string;
        position_location?: string;
        monthly_salary?: number | string;
        department?: string;
        cod_cargo?: string;
        cod_grade?: string;
        campus?: string;
        observations?: string;
        technical_bonus_available?: boolean;
        technical_bonus_percentage?: number;
        technical_bonus_value?: number;
        technical_bonus_category?: PrimaTecnicaCategoria | null;
        technical_bonuses?: any[];
        [key: string]: any;
      };
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/autoservicio/generar-codigo`,
        { documento },
        { requiresAuth: false }
      );
    },

    /**
     * Validar código y generar certificado
     */
    async validarCodigoYGenerarCertificado(
      documento: string,
      codigo: string,
      options?: {
        includeSalary?: boolean;
        includeTechnicalBonus?: boolean;
        includeFunctions?: boolean;
      },
    ): Promise<{
      mensaje: string;
      certificado: any;
    }> {
      return apiClient.post(`${SERVICE_PREFIX}/certificates/autoservicio/validar-codigo`,
        {
          documento,
          codigo,
          ...(options?.includeSalary !== undefined ? { includeSalary: options.includeSalary } : {}),
          ...(options?.includeTechnicalBonus !== undefined ? { includeTechnicalBonus: options.includeTechnicalBonus } : {}),
          ...(options?.includeFunctions !== undefined ? { includeFunctions: options.includeFunctions } : {}),
        },
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
