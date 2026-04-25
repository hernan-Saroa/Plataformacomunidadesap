/**
 * Servicio de API para Certificados de Graduados
 * Maneja todas las peticiones HTTP al microservicio academic-registration-service
 */

import { apiClient } from "./apiClient";

// Prefijo del servicio en el API Gateway (rutea al servicio registro-academico)
const SERVICE_PREFIX = "/registro-academico/api/v1";

/**
 * Interface: Datos de un graduado
 */
export interface GraduadoData {
  id: string;
  personId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  idNumber: string;
  email: string;
  phone: string;
  programId: string;
  programName: string;
  programType: string; // 'Pregrado', 'Especialización', 'Maestría'
  enrollmentDate: string;
  graduationDate: string;
  ceremonyDate: string;
  degreeTitle: string;
  diplomaNumber: string;
  actaNumber: string;
  resolutionNumber: string;
  status: "ACTIVE" | "REVOKED" | "SUSPENDED";
  isVerified: boolean;
  campus: string;
  seccionalName?: string;
  createdBy?: string;
  numRegistro?: string;
  numFolio?: string;
  numLibro?: string;
  numActa?: string;
  filesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface: Solicitud de certificado de graduado
 */
export interface SolicitudCertificadoGraduado {
  id: string;
  requestNumber: string;
  requesterType: "GRADUATE" | "COMPANY";
  graduateId?: string;
  idNumber: string;
  idIssueDate?: string;
  fullName: string;
  graduateLastName?: string;
  graduateEmail?: string;
  graduatePhone?: string;
  programName: string;
  graduationDate?: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  companyName?: string;
  companyNit?: string;
  contactPerson?: string;
  certificateType: "STANDARD" | "OFFICIAL" | "INTERNATIONAL";
  validationCode?: string;
  validationExpiresAt?: string;
  isValidated: boolean;
  status:
    | "PENDING"
    | "VALIDATED"
    | "PROCESSING"
    | "COMPLETED"
    | "REJECTED"
    | "EXPIRED";
  observations?: string;
  rejectionReason?: string;
  manualReview?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNotes?: string;
  reviewResolution?: string;
  approvalStatus?: "PENDING_APPROVAL" | "APPROVED_FINAL" | "REJECTED_FINAL" | "OBSERVATION" | string | null;
  reviewRecommendation?: "APPROVED" | "REJECTED" | "OBSERVATION" | string | null;
  reviewRecommendationReason?: string | null;
  reviewPayload?: Record<string, unknown> | null;
  reviewSubmittedAt?: string | null;
  reviewSubmittedBy?: string | null;
  reviewSubmittedByName?: string | null;
  approverDecision?: "APPROVED" | "REJECTED" | "OBSERVATION" | string | null;
  approverNotes?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approverName?: string | null;
  reviewTimeline?: Array<{
    type: string;
    label: string;
    notes?: string;
    actorId?: string;
    actorName?: string;
    actorEmail?: string;
    createdAt: string;
  }>;
  reviewFiles?: GraduationReviewFile[];
  requestDate: string;
  validationDate?: string;
  completionDate?: string;
}

/**
 * Interface: Certificado de graduado generado
 */
export interface CertificadoGraduado {
  id: string;
  requestId: string;
  graduateId?: string;
  certificateNumber: string;
  verificationCode: string;
  fullName: string;
  idNumber: string;
  programName: string;
  programType: string;
  degreeTitle: string;
  graduationDate: string;
  diplomaNumber?: string;
  actaNumber?: string;
  campus?: string;
  seccionalName?: string;
  signerName: string;
  signerPosition: string;
  signatureUrl?: string;
  pdfUrl?: string;
  pdfFilename?: string;
  status: "VALID" | "REVOKED" | "EXPIRED";
  issueDate: string;
  expiryDate?: string;
  revocationDate?: string;
  revocationReason?: string;
}

export interface UpdateCertificadoPayload extends Partial<CertificadoGraduado> {
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  graduateEmail?: string;
  graduatePhone?: string;
}

export interface AprobarSolicitudPayload {
  reviewNotes: string;
  reviewerName?: string;
  reviewerId?: string;
  fullName?: string;
  idNumber?: string;
  email?: string;
  programName?: string;
  programType?: string;
  degreeTitle?: string;
  graduationDate?: string;
  campus?: string;
  seccionalName?: string;
  numRegistro?: string;
  numFolio?: string;
  numLibro?: string;
}

export type RevisionDecision = "APPROVED" | "REJECTED" | "OBSERVATION";
export type ReviewerRevisionDecision = Exclude<RevisionDecision, "OBSERVATION">;

export interface EnviarDecisionRevisionPayload extends AprobarSolicitudPayload {
  decision: ReviewerRevisionDecision;
  reason?: string;
  reviewerEmail?: string;
}

export interface ResolverAprobacionRevisionPayload {
  decision: RevisionDecision;
  reason?: string;
  approverName?: string;
  approverId?: string;
  approverEmail?: string;
}

export interface GraduationReviewFile {
  id: string;
  requestId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy?: string;
  uploadedAt: string;
  url?: string;
}

/**
 * Interface: Respuesta de verificación de documento
 */
export interface VerificacionDocumentoResponse {
  existe: boolean;
  graduado?: GraduadoData;
  mensaje: string;
}

export interface EmpresaNitResponse {
  found: boolean;
  razonSocial?: string;
  nit?: string;
  digitoVerificacion?: string;
}

/**
 * Interface: Respuesta de generación de código
 */
export interface GenerarCodigoResponse {
  mensaje: string;
  email: string;
  codigoTest?: string; // Solo en desarrollo
}

/**
 * Interface: Respuesta de validación de código
 */
export interface ValidarCodigoResponse {
  mensaje: string;
  certificado: CertificadoGraduado;
}

export interface GraduateMatchSuggestion {
  graduateId: string;
  fullName: string;
  idNumber: string;
  programName: string;
  degreeTitle: string;
  graduationDate?: string | null;
  campus?: string;
  seccionalName?: string;
  score: number;
  matchedTokens: number;
  exactTokenMatches: number;
  fuzzyTokenMatches: number;
  totalGraduateTokens: number;
  totalProvidedTokens: number;
  exactGraduationDateMatch: boolean;
}

export interface BuscarCoincidenciasGraduadoResponse {
  hasMatches: boolean;
  totalMatches: number;
  suggestions: GraduateMatchSuggestion[];
  message: string;
}

/**
 * Interface: Respuesta de solicitud desde landing
 */
export interface SolicitarCertificadoLandingResponse {
  existe: boolean;
  mensaje: string;
  certificado?: CertificadoGraduado;
}

/**
 * Interface: Resultado de validación pública
 */
export interface ValidacionPublicaResponse {
  valido: boolean;
  certificado?: CertificadoGraduado;
  mensaje: string;
  resultado: "VALID" | "REVOKED" | "EXPIRED" | "NOT_FOUND";
}

/**
 * Interface: Registro de validacion de certificado
 */
export interface ValidacionCertificado {
  id: string;
  certificateId: string;
  validationDate: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  result: string;
}

export interface DescargaCertificado {
  id: string;
  certificateId: string;
  downloadDate: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GraduationCertificateTemplateTexts {
  cityDatePrefix: string;
  institutionTitle: string;
  certificateTitle: string;
  addressee: string;
  introParagraph: string;
  degreeLabel: string;
  graduateNameLabel: string;
  documentLabel: string;
  issuePlaceDateLabel: string;
  registryLabel: string;
  closingText: string;
  signerTitle: string;
  validationMessage: string;
}

export interface GraduationCertificateTemplateConfig {
  id: number;
  version: string;
  status: string;
  updatedAt?: string;
  updatedBy?: string;
  electronicSignature?: {
    enabled: boolean;
    signerName: string;
    signatureUrl: string;
    signatureFilename: string;
  };
  texts: GraduationCertificateTemplateTexts;
}

type ApiRequestOptions = {
  skipAuth?: boolean;
  skipErrorToast?: boolean;
  retries?: number;
};

export interface GraduadoArchivo {
  id: string;
  graduateId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy?: string;
  url: string;
}

/**
 * Servicio de Certificados de Graduados
 */
const graduadosService = {
  /**
   * Autoservicio - Endpoints públicos para graduados
   */
  autoservicio: {
    /**
     * Verificar si un graduado existe en la base de datos
     * @param idNumber - Número de cédula
     * @param idIssueDate - Fecha de expedición de la cédula (YYYY-MM-DD)
     */
    verificarGraduado: async (
      idNumber: string,
      idIssueDate?: string,
      graduationDate?: string,
      lastName?: string,
    ): Promise<VerificacionDocumentoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/verificar-graduado`,
        {
          idNumber,
          ...(idIssueDate ? { idIssueDate } : {}),
          ...(graduationDate ? { graduationDate } : {}),
          ...(lastName ? { lastName } : {}),
        },
        { skipAuth: true },
      );
      return response;
    },

    /**
     * Generar código de validación y enviar por email
     * @param idNumber - Número de cédula
     * @param idIssueDate - Fecha de expedición de la cédula
     */
    buscarCoincidencias: async (
      idNumber: string,
      graduationDate?: string,
      lastName?: string,
    ): Promise<BuscarCoincidenciasGraduadoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/buscar-coincidencias`,
        {
          idNumber,
          ...(graduationDate ? { graduationDate } : {}),
          ...(lastName ? { lastName } : {}),
        },
        { skipAuth: true },
      );
      return response;
    },

    generarCodigoValidacion: async (
      idNumber: string,
      idIssueDate?: string,
      graduationDate?: string,
      lastName?: string,
    ): Promise<GenerarCodigoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/generar-codigo`,
        {
          idNumber,
          ...(idIssueDate ? { idIssueDate } : {}),
          ...(graduationDate ? { graduationDate } : {}),
          ...(lastName ? { lastName } : {}),
        },
        { skipAuth: true },
      );
      return response;
    },

    /**
     * Validar código y generar certificado de graduado
     * @param idNumber - Número de cédula
     * @param idIssueDate - Fecha de expedición de la cédula
     * @param codigo - Código de 6 dígitos
     */
    validarCodigoYGenerarCertificado: async (
      idNumber: string,
      idIssueDate: string | undefined,
      codigo: string,
    ): Promise<ValidarCodigoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/validar-codigo`,
        {
          idNumber,
          ...(idIssueDate ? { idIssueDate } : {}),
          codigo,
        },
        { skipAuth: true },
      );
      return response;
    },

    /**
     * Solicitar certificado desde landing (valida si existe y genera el certificado)
     */
    solicitarCertificado: async (payload: {
      idNumber: string;
      idIssueDate?: string;
      requesterType: "GRADUATE" | "COMPANY";
      requesterName: string;
      requesterEmail: string;
      graduateEmail?: string;
      requesterPhone?: string;
      companyName?: string;
      programName?: string;
      graduationDate?: string;
      lastName?: string;
      selectedGraduateId?: string;
    }): Promise<SolicitarCertificadoLandingResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/solicitar-certificado`,
        payload,
        { skipAuth: true },
      );
      return response;
    },

    /**
     * Consultar empresa por NIT (datos.gov.co)
     */
    buscarEmpresaPorNit: async (nit: string): Promise<EmpresaNitResponse> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/autoservicio/empresa`,
        { nit },
        { skipAuth: true },
      );
      return response;
    },
  },

  /**
   * Validación pública de certificados
   */
  validacion: {
    /**
     * Validar un certificado por su código QR
     * @param verificationCode - Código de verificación del QR
     */
    validarQR: async (
      verificationCode: string,
    ): Promise<ValidacionPublicaResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/validacion/qr`,
        {
          verificationCode,
        },
        { skipAuth: true },
      );
      return response;
    },

    /**
     * Validar un certificado por número de certificado
     * @param certificateNumber - Número de certificado
     */
    validarPorNumero: async (
      certificateNumber: string,
    ): Promise<ValidacionPublicaResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/validacion/numero`,
        {
          certificateNumber,
        },
        { skipAuth: true },
      );
      return response;
    },

    /**
     * Obtener estadísticas públicas de certificados
     */
    estadisticas: async (): Promise<any> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/validacion/estadisticas`,
        undefined,
        { skipAuth: true },
      );
      return response;
    },
  },

  /**
   * Historial de validaciones (QR)
   */
  validaciones: {
    listar: async (
      certificateId?: string,
    ): Promise<ValidacionCertificado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/validaciones`,
        certificateId ? { certificateId } : undefined,
      );
      return response;
    },
  },

  descargas: {
    listar: async (certificateId?: string): Promise<DescargaCertificado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/descargas`,
        certificateId ? { certificateId } : undefined,
      );
      return response;
    },
    registrar: async (
      certificateId: string,
      options?: ApiRequestOptions,
    ): Promise<{ mensaje: string }> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/descargas`,
        { certificateId },
        { ...options, skipAuth: options?.skipAuth ?? true },
      );
      return response;
    },
  },

  /**
   * Administración de solicitudes (requiere autenticación)
   */
  solicitudes: {
    /**
     * Listar todas las solicitudes
     */
    listar: async (): Promise<SolicitudCertificadoGraduado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes`,
      );
      return response;
    },
    /**
     * Listar solicitudes de revisión manual
     */
    listarRevision: async (): Promise<SolicitudCertificadoGraduado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/revision`,
      );
      return response;
    },

    /**
     * Listar solicitudes con concepto de revisor pendientes de aprobacion final
     */
    listarAprobacion: async (): Promise<SolicitudCertificadoGraduado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/aprobacion`,
      );
      return response;
    },

    contarAprobacionPendiente: async (): Promise<{ count: number }> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/aprobacion/pendientes-count`,
      );
      return response;
    },

    /**
     * Obtener una solicitud por ID
     */
    obtenerPorId: async (id: string): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}`,
      );
      return response;
    },

    /**
     * Marcar solicitud como en revisión
     */
    marcarEnRevision: async (
      id: string,
      reviewerName?: string,
      reviewerId?: string,
      reviewerEmail?: string,
    ): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/en-revision`,
        { reviewerName, reviewerId, reviewerEmail },
      );
      return response;
    },

    listarArchivosRevision: async (
      id: string,
    ): Promise<GraduationReviewFile[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/revision-files`,
      );
      return response;
    },

    subirArchivosRevision: async (
      id: string,
      files: File[],
      uploadedBy?: string,
      uploadedByEmailOrProgress?: string | ((progress: number) => void),
      onProgress?: (progress: number) => void,
    ): Promise<GraduationReviewFile[]> => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (uploadedBy) {
        formData.append("uploadedBy", uploadedBy);
      }
      const uploadedByEmail =
        typeof uploadedByEmailOrProgress === "string"
          ? uploadedByEmailOrProgress
          : undefined;
      const progressHandler =
        typeof uploadedByEmailOrProgress === "function"
          ? uploadedByEmailOrProgress
          : onProgress;
      if (uploadedByEmail) {
        formData.append("uploadedByEmail", uploadedByEmail);
      }

      const response = await apiClient.upload(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/revision-files`,
        formData,
        progressHandler,
      );
      return response;
    },

    descargarArchivoRevision: async (
      requestId: string,
      fileId: string,
    ): Promise<Blob> => {
      return apiClient.getBlob(
        `${SERVICE_PREFIX}/certificates/solicitudes/${requestId}/revision-files/${fileId}/download`,
      );
    },

    enviarDecisionRevision: async (
      id: string,
      payload: EnviarDecisionRevisionPayload,
    ): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/decision-revision`,
        payload,
      );
      return response;
    },

    resolverAprobacion: async (
      id: string,
      payload: ResolverAprobacionRevisionPayload,
    ): Promise<
      | SolicitudCertificadoGraduado
      | {
          request: SolicitudCertificadoGraduado;
          certificate: CertificadoGraduado;
        }
    > => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/resolver-aprobacion`,
        payload,
      );
      return response;
    },

    /**
     * Aprobar solicitud y generar certificado
     */
    aprobar: async (
      id: string,
      payload: AprobarSolicitudPayload,
    ): Promise<{
      request: SolicitudCertificadoGraduado;
      certificate: CertificadoGraduado;
    }> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/aprobar`,
        payload,
      );
      return response;
    },

    /**
     * Rechazar solicitud
     */
    rechazar: async (
      id: string,
      razon: string,
      reviewerName?: string,
      reviewerId?: string,
    ): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/rechazar`,
        { reason: razon, reviewerName, reviewerId },
      );
      return response;
    },
  },

  /**
   * Administración de certificados (requiere autenticación)
   */
  certificados: {
    /**
     * Listar todos los certificados
     */
    listar: async (): Promise<CertificadoGraduado[]> => {
      const response = await apiClient.get(`${SERVICE_PREFIX}/certificates`);
      return response;
    },

    /**
     * Obtener certificado por ID
     */
    obtenerPorId: async (id: string): Promise<CertificadoGraduado> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/${id}`,
      );
      return response;
    },

    /**
     * Actualizar certificado
     */
    actualizar: async (
      id: string,
      payload: UpdateCertificadoPayload,
    ): Promise<CertificadoGraduado> => {
      const response = await apiClient.put(
        `${SERVICE_PREFIX}/certificates/${id}`,
        payload,
      );
      return response;
    },

    /**
     * Revocar un certificado
     */
    revocar: async (
      id: string,
      razon: string,
    ): Promise<CertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/${id}/revocar`,
        { razon },
      );
      return response;
    },

    /**
     * Obtener PDF de certificado
     */
    descargarPDF: async (
      id: string,
      options?: ApiRequestOptions,
    ): Promise<Blob> => {
      return apiClient.getBlob(
        `${SERVICE_PREFIX}/certificates/${id}/pdf`,
        undefined,
        { ...options, skipAuth: options?.skipAuth ?? true },
      );
    },

    /**
     * Reenviar certificado por email al solicitante
     */
    reenviar: async (
      id: string,
    ): Promise<{ mensaje: string; email: string }> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/${id}/reenviar`,
        {},
        {
          // Evita reintentos automáticos para no disparar múltiples correos
          // cuando el gateway responde 4xx sin detalle en algunos entornos.
          retries: 0,
          skipErrorToast: true,
        },
      );
      return response;
    },
  },

  /**
   * Administración de graduados (requiere autenticación)
   */
  plantilla: {
    obtenerConfiguracion: async (): Promise<GraduationCertificateTemplateConfig> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/template-config`,
      );
      return response;
    },

    actualizarTextos: async (
      payload: Partial<GraduationCertificateTemplateTexts> & {
        updatedBy?: string;
        electronicSignatureEnabled?: boolean;
        signerName?: string;
        signatureImageDataUrl?: string;
        signatureFilename?: string;
      },
    ): Promise<GraduationCertificateTemplateConfig> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/texts`,
        payload,
      );
      return response;
    },

    restablecerTextos: async (
      updatedBy?: string,
    ): Promise<GraduationCertificateTemplateConfig> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/template-config/reset`,
        { updatedBy },
      );
      return response;
    },
  },

  graduados: {
    /**
     * Listar todos los graduados desde academic-registration-service
     */
    listarRegistroAcademico: async (): Promise<GraduadoData[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/graduados`,
      );
      return response;
    },

    /**
     * Listar todos los graduados
     */
    listar: async (): Promise<GraduadoData[]> => {
      const response = await apiClient.get(`${SERVICE_PREFIX}/graduates`);
      return response;
    },

    /**
     * Obtener graduado por ID
     */
    obtenerPorId: async (id: string): Promise<GraduadoData> => {
      const response = await apiClient.get(`${SERVICE_PREFIX}/graduates/${id}`);
      return response;
    },

    /**
     * Crear un nuevo graduado
     */
    crear: async (graduado: Partial<GraduadoData>): Promise<GraduadoData> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/graduates`,
        graduado,
      );
      return response;
    },

    /**
     * Actualizar un graduado
     */
    actualizar: async (
      id: string,
      graduado: Partial<GraduadoData>,
    ): Promise<GraduadoData> => {
      const response = await apiClient.put(
        `${SERVICE_PREFIX}/graduates/${id}`,
        graduado,
      );
      return response;
    },

    /**
     * Buscar graduado por cédula
     */
    buscarPorCedula: async (idNumber: string): Promise<GraduadoData> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/graduates/cedula/${idNumber}`,
      );
      return response;
    },

    /**
     * Listar archivos del graduado
     */
    listarArchivos: async (id: string): Promise<GraduadoArchivo[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/graduates/${id}/files`,
      );
      return response;
    },

    /**
     * Subir archivos del graduado
     */
    subirArchivos: async (
      id: string,
      files: File[],
      uploadedBy?: string,
      onProgress?: (progress: number) => void,
    ): Promise<GraduadoArchivo[]> => {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      if (uploadedBy) {
        formData.append("uploadedBy", uploadedBy);
      }
      const response = await apiClient.upload(
        `${SERVICE_PREFIX}/graduates/${id}/upload-file`,
        formData,
        onProgress,
      );
      return response;
    },

    /**
     * Eliminar archivo del graduado
     */
    eliminarArchivo: async (
      graduateId: string,
      fileId: string,
    ): Promise<{ mensaje: string }> => {
      const response = await apiClient.delete(
        `${SERVICE_PREFIX}/graduates/${graduateId}/files/${fileId}`,
      );
      return response;
    },

    /**
     * Descargar archivo del graduado
     */
    descargarArchivo: async (
      graduateId: string,
      fileId: string,
      options?: ApiRequestOptions,
    ): Promise<Blob> => {
      return apiClient.getBlob(
        `${SERVICE_PREFIX}/graduates/${graduateId}/files/${fileId}/download`,
        undefined,
        options,
      );
    },
  },
};

export default graduadosService;
