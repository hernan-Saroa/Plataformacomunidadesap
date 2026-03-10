/**
 * Servicio de API para Certificados de Graduados
 * Maneja todas las peticiones HTTP al microservicio academic-registration-service
 */

import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway (rutea al servicio registro-academico)
const SERVICE_PREFIX = '/registro-academico/api/v1';

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
  status: 'ACTIVE' | 'REVOKED' | 'SUSPENDED';
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
  requesterType: 'GRADUATE' | 'COMPANY';
  graduateId?: string;
  idNumber: string;
  idIssueDate?: string;
  fullName: string;
  graduateLastName?: string;
  graduateEmail?: string;
  graduatePhone?: string;
  programName: string;
  graduationDate: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  companyName?: string;
  companyNit?: string;
  contactPerson?: string;
  certificateType: 'STANDARD' | 'OFFICIAL' | 'INTERNATIONAL';
  validationCode?: string;
  validationExpiresAt?: string;
  isValidated: boolean;
  status: 'PENDING' | 'VALIDATED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  observations?: string;
  rejectionReason?: string;
  manualReview?: boolean;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNotes?: string;
  reviewResolution?: string;
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
  status: 'VALID' | 'REVOKED' | 'EXPIRED';
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
  resultado: 'VALID' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND';
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

type ApiRequestOptions = {
  skipAuth?: boolean;
  skipErrorToast?: boolean;
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
      lastName?: string
    ): Promise<VerificacionDocumentoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/verificar-graduado`,
        {
          idNumber,
          ...(idIssueDate ? { idIssueDate } : {}),
          ...(graduationDate ? { graduationDate } : {}),
          ...(lastName ? { lastName } : {}),
        }
      );
      return response;
    },

    /**
     * Generar código de validación y enviar por email
     * @param idNumber - Número de cédula
     * @param idIssueDate - Fecha de expedición de la cédula
     */
    generarCodigoValidacion: async (
      idNumber: string,
      idIssueDate?: string,
      graduationDate?: string,
      lastName?: string
    ): Promise<GenerarCodigoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/generar-codigo`,
        {
          idNumber,
          ...(idIssueDate ? { idIssueDate } : {}),
          ...(graduationDate ? { graduationDate } : {}),
          ...(lastName ? { lastName } : {}),
        }
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
      codigo: string
    ): Promise<ValidarCodigoResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/validar-codigo`,
        {
          idNumber,
          ...(idIssueDate ? { idIssueDate } : {}),
          codigo,
        }
      );
      return response;
    },

    /**
     * Solicitar certificado desde landing (valida si existe y genera el certificado)
     */
    solicitarCertificado: async (payload: {
      idNumber: string;
      idIssueDate?: string;
      requesterType: 'GRADUATE' | 'COMPANY';
      requesterName: string;
      requesterEmail: string;
      graduateEmail?: string;
      requesterPhone?: string;
      companyName?: string;
      programName?: string;
      graduationDate?: string;
      lastName?: string;
    }): Promise<SolicitarCertificadoLandingResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/autoservicio/solicitar-certificado`,
        payload
      );
      return response;
    },

    /**
     * Consultar empresa por NIT (datos.gov.co)
     */
    buscarEmpresaPorNit: async (nit: string): Promise<EmpresaNitResponse> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/autoservicio/empresa`,
        { nit }
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
      verificationCode: string
    ): Promise<ValidacionPublicaResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/validacion/qr`,
        {
          verificationCode,
        }
      );
      return response;
    },

    /**
     * Validar un certificado por número de certificado
     * @param certificateNumber - Número de certificado
     */
    validarPorNumero: async (
      certificateNumber: string
    ): Promise<ValidacionPublicaResponse> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/validacion/numero`,
        {
          certificateNumber,
        }
      );
      return response;
    },

    /**
     * Obtener estadísticas públicas de certificados
     */
    estadisticas: async (): Promise<any> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/validacion/estadisticas`
      );
      return response;
    },
  },

  /**
   * Historial de validaciones (QR)
   */
  validaciones: {
    listar: async (certificateId?: string): Promise<ValidacionCertificado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/validaciones`,
        certificateId ? { certificateId } : undefined
      );
      return response;
    },
  },

  descargas: {
    listar: async (certificateId?: string): Promise<DescargaCertificado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/descargas`,
        certificateId ? { certificateId } : undefined
      );
      return response;
    },
    registrar: async (
      certificateId: string,
      options?: ApiRequestOptions
    ): Promise<{ mensaje: string }> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/descargas`,
        { certificateId },
        options
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
        `${SERVICE_PREFIX}/certificates/solicitudes`
      );
      return response;
    },
    /**
     * Listar solicitudes de revisión manual
     */
    listarRevision: async (): Promise<SolicitudCertificadoGraduado[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/revision`
      );
      return response;
    },

    /**
     * Obtener una solicitud por ID
     */
    obtenerPorId: async (id: string): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}`
      );
      return response;
    },

    /**
     * Marcar solicitud como en revisión
     */
    marcarEnRevision: async (
      id: string,
      reviewerName?: string,
      reviewerId?: string
    ): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/en-revision`,
        { reviewerName, reviewerId }
      );
      return response;
    },

    /**
     * Aprobar solicitud y generar certificado
     */
    aprobar: async (
      id: string,
      payload: AprobarSolicitudPayload
    ): Promise<{ request: SolicitudCertificadoGraduado; certificate: CertificadoGraduado }> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/aprobar`,
        payload
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
      reviewerId?: string
    ): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/solicitudes/${id}/rechazar`,
        { reason: razon, reviewerName, reviewerId }
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
      const response = await apiClient.get(`${SERVICE_PREFIX}/certificates/${id}`);
      return response;
    },

    /**
     * Actualizar certificado
     */
    actualizar: async (
      id: string,
      payload: UpdateCertificadoPayload
    ): Promise<CertificadoGraduado> => {
      const response = await apiClient.put(
        `${SERVICE_PREFIX}/certificates/${id}`,
        payload
      );
      return response;
    },

    /**
     * Revocar un certificado
     */
    revocar: async (
      id: string,
      razon: string
    ): Promise<CertificadoGraduado> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/${id}/revocar`,
        { razon }
      );
      return response;
    },

    /**
     * Obtener PDF de certificado
     */
    descargarPDF: async (
      id: string,
      options?: ApiRequestOptions
    ): Promise<Blob> => {
      return apiClient.getBlob(
        `${SERVICE_PREFIX}/certificates/${id}/pdf`,
        undefined,
        options
      );
    },

    /**
     * Reenviar certificado por email al solicitante
     */
    reenviar: async (id: string): Promise<{ mensaje: string; email: string }> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/certificates/${id}/reenviar`,
      );
      return response;
    },
  },

  /**
   * Administración de graduados (requiere autenticación)
   */
  graduados: {
    /**
     * Listar todos los graduados desde academic-registration-service
     */
    listarRegistroAcademico: async (): Promise<GraduadoData[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/certificates/graduados`
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
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/graduates/${id}`
      );
      return response;
    },

    /**
     * Crear un nuevo graduado
     */
    crear: async (graduado: Partial<GraduadoData>): Promise<GraduadoData> => {
      const response = await apiClient.post(
        `${SERVICE_PREFIX}/graduates`,
        graduado
      );
      return response;
    },

    /**
     * Actualizar un graduado
     */
    actualizar: async (
      id: string,
      graduado: Partial<GraduadoData>
    ): Promise<GraduadoData> => {
      const response = await apiClient.put(
        `${SERVICE_PREFIX}/graduates/${id}`,
        graduado
      );
      return response;
    },

    /**
     * Buscar graduado por cédula
     */
    buscarPorCedula: async (idNumber: string): Promise<GraduadoData> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/graduates/cedula/${idNumber}`
      );
      return response;
    },

    /**
     * Listar archivos del graduado
     */
    listarArchivos: async (id: string): Promise<GraduadoArchivo[]> => {
      const response = await apiClient.get(
        `${SERVICE_PREFIX}/graduates/${id}/files`
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
      files.forEach((file) => formData.append('files', file));
      if (uploadedBy) {
        formData.append('uploadedBy', uploadedBy);
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
    eliminarArchivo: async (graduateId: string, fileId: string): Promise<{ mensaje: string }> => {
      const response = await apiClient.delete(
        `${SERVICE_PREFIX}/graduates/${graduateId}/files/${fileId}`
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
