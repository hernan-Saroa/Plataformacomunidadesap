/**
 * Servicio de API para Certificados de Graduados
 * Maneja todas las peticiones HTTP al microservicio academic-registration-service
 */

import apiClient from './apiClient';
import { MICROSERVICE_URLS } from '../../config/environment';

// URL directa al microservicio de registro académico
const BASE_URL = MICROSERVICE_URLS['registro-academico']; // http://localhost:3002
const SERVICE_PREFIX = '/academic-registration/api/v1';

/**
 * Interface: Datos de un graduado
 */
export interface GraduadoData {
  id: string;
  personId: string;
  fullName: string;
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
  fullName: string;
  programName: string;
  graduationDate: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  companyName?: string;
  certificateType: 'STANDARD' | 'OFFICIAL' | 'INTERNATIONAL';
  validationCode?: string;
  validationExpiresAt?: string;
  isValidated: boolean;
  status: 'PENDING' | 'VALIDATED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  observations?: string;
  rejectionReason?: string;
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

/**
 * Interface: Respuesta de verificación de documento
 */
export interface VerificacionDocumentoResponse {
  existe: boolean;
  graduado?: GraduadoData;
  mensaje: string;
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
      idIssueDate: string
    ): Promise<VerificacionDocumentoResponse> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/autoservicio/verificar-graduado`,
        {
          idNumber,
          idIssueDate,
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
      idIssueDate: string
    ): Promise<GenerarCodigoResponse> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/autoservicio/generar-codigo`,
        {
          idNumber,
          idIssueDate,
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
      idIssueDate: string,
      codigo: string
    ): Promise<ValidarCodigoResponse> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/autoservicio/validar-codigo`,
        {
          idNumber,
          idIssueDate,
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
      idIssueDate: string;
      requesterType: 'GRADUATE' | 'COMPANY';
      requesterName: string;
      requesterEmail: string;
      requesterPhone?: string;
      companyName?: string;
      programName?: string;
      graduationDate?: string;
    }): Promise<SolicitarCertificadoLandingResponse> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/autoservicio/solicitar-certificado`,
        payload
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/validacion/qr`,
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/validacion/numero`,
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/validacion/estadisticas`
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/validaciones`,
        certificateId ? { certificateId } : undefined
      );
      return response;
    },
  },

  descargas: {
    listar: async (certificateId?: string): Promise<DescargaCertificado[]> => {
      const response = await apiClient.get(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/descargas`,
        certificateId ? { certificateId } : undefined
      );
      return response;
    },
    registrar: async (certificateId: string): Promise<{ mensaje: string }> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/descargas`,
        { certificateId }
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/solicitudes`
      );
      return response;
    },

    /**
     * Obtener una solicitud por ID
     */
    obtenerPorId: async (id: string): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.get(
        `${BASE_URL}${SERVICE_PREFIX}/certificate-requests/${id}`
      );
      return response;
    },

    /**
     * Aprobar solicitud de empresa
     */
    aprobar: async (id: string): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificate-requests/${id}/aprobar`
      );
      return response;
    },

    /**
     * Rechazar solicitud
     */
    rechazar: async (
      id: string,
      razon: string
    ): Promise<SolicitudCertificadoGraduado> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/certificate-requests/${id}/rechazar`,
        { razon }
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
      const response = await apiClient.get(
        `${BASE_URL}${SERVICE_PREFIX}/certificates`
      );
      return response;
    },

    /**
     * Obtener certificado por ID
     */
    obtenerPorId: async (id: string): Promise<CertificadoGraduado> => {
      const response = await apiClient.get(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/${id}`
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/${id}/revocar`,
        { razon }
      );
      return response;
    },

    /**
     * Obtener PDF de certificado
     */
    descargarPDF: async (id: string): Promise<Blob> => {
      const response = await apiClient.get(
        `${BASE_URL}${SERVICE_PREFIX}/certificates/${id}/pdf`,
        {
          responseType: 'blob',
        }
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
        `${BASE_URL}${SERVICE_PREFIX}/certificates/graduados`
      );
      return response;
    },

    /**
     * Listar todos los graduados
     */
    listar: async (): Promise<GraduadoData[]> => {
      const response = await apiClient.get(`${BASE_URL}${SERVICE_PREFIX}/graduates`);
      return response;
    },

    /**
     * Crear un nuevo graduado
     */
    crear: async (graduado: Partial<GraduadoData>): Promise<GraduadoData> => {
      const response = await apiClient.post(
        `${BASE_URL}${SERVICE_PREFIX}/graduates`,
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
        `${BASE_URL}${SERVICE_PREFIX}/graduates/${id}`,
        graduado
      );
      return response;
    },

    /**
     * Buscar graduado por cédula
     */
    buscarPorCedula: async (idNumber: string): Promise<GraduadoData> => {
      const response = await apiClient.get(
        `${BASE_URL}${SERVICE_PREFIX}/graduates/cedula/${idNumber}`
      );
      return response;
    },
  },
};

export default graduadosService;

