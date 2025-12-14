/**
 * Público Service
 * Servicios públicos de la Landing Page (sin autenticación)
 */

import { apiClient } from './client';
import type {
  Programa,
  Sede,
  Vinculacion,
  CrearVinculacionRequest,
  ConvocatoriaDocente,
  AplicacionConvocatoria,
} from './types';

export const publicoService = {
  /**
   * PROGRAMAS
   */
  programas: {
    /**
     * Listar programas activos
     */
    async listar(params?: { activo?: boolean }): Promise<Programa[]> {
      return apiClient.get<Programa[]>('/public/programas', {
        params,
        requiresAuth: false,
      });
    },
  },

  /**
   * SEDES
   */
  sedes: {
    /**
     * Listar sedes (opcionalmente filtradas por programa)
     */
    async listar(params?: { programaId?: string }): Promise<Sede[]> {
      return apiClient.get<Sede[]>('/public/sedes', {
        params,
        requiresAuth: false,
      });
    },
  },

  /**
   * VINCULACIONES
   */
  vinculaciones: {
    /**
     * Enviar solicitud de vinculación
     */
    async crear(data: CrearVinculacionRequest): Promise<{
      folio: string;
      fechaSolicitud: string;
      mensaje: string;
    }> {
      return apiClient.post('/public/vinculaciones', data, {
        requiresAuth: false,
      });
    },

    /**
     * Consultar estado de solicitud por folio
     */
    async consultar(folio: string): Promise<Vinculacion> {
      return apiClient.get<Vinculacion>(`/public/vinculaciones/${folio}`, {
        requiresAuth: false,
      });
    },
  },

  /**
   * ENROLAMIENTO QR
   */
  enrolamiento: {
    /**
     * Validar token QR
     */
    async validarQR(qrToken: string): Promise<{
      valido: boolean;
      tipo: 'estudiante' | 'graduado' | 'docente';
      email: string;
      metadata: Record<string, any>;
    }> {
      return apiClient.post('/public/enrolamiento/validar-qr', { qrToken }, {
        requiresAuth: false,
      });
    },

    /**
     * Enviar código de verificación
     */
    async enviarCodigo(qrToken: string, email: string): Promise<{
      codigoEnviado: boolean;
      expiraEn: string;
    }> {
      return apiClient.post('/public/enrolamiento/enviar-codigo', { qrToken, email }, {
        requiresAuth: false,
      });
    },

    /**
     * Verificar código
     */
    async verificarCodigo(qrToken: string, email: string, codigo: string): Promise<{
      verificado: boolean;
    }> {
      return apiClient.post('/public/enrolamiento/verificar-codigo', { qrToken, email, codigo }, {
        requiresAuth: false,
      });
    },

    /**
     * Completar enrolamiento
     */
    async completar(data: {
      qrToken: string;
      email: string;
      codigoVerificacion: string;
      datosPersonales: any;
      password: string;
      terminos: {
        terminosUso: boolean;
        politicaPrivacidad: boolean;
        usoImagen: boolean;
      };
    }): Promise<{
      usuarioId: string;
      token: string;
      mensaje: string;
    }> {
      return apiClient.post('/public/enrolamiento/completar', data, {
        requiresAuth: false,
      });
    },
  },

  /**
   * CERTIFICADOS LABORALES
   */
  certificadosLaborales: {
    /**
     * Validar email institucional y enviar código
     */
    async validarEmail(email: string): Promise<{
      valido: boolean;
      codigoEnviado: boolean;
      mensaje: string;
    }> {
      return apiClient.post('/public/certificados-laborales/validar-email', { email }, {
        requiresAuth: false,
      });
    },

    /**
     * Verificar código
     */
    async verificarCodigo(email: string, codigo: string): Promise<{
      verificado: boolean;
      token: string;
    }> {
      return apiClient.post('/public/certificados-laborales/verificar-codigo', { email, codigo }, {
        requiresAuth: false,
      });
    },

    /**
     * Solicitar certificado laboral
     */
    async solicitar(data: {
      token: string;
      tipoDocumento: string;
      numeroDocumento: string;
      nombres: string;
      apellidos: string;
      cargo: string;
      dependencia: string;
      sedeId: string;
      tipoContrato: string;
      fechaIngreso: string;
      fechaRetiro?: string;
    }): Promise<{
      codigoSolicitud: string;
      estado: string;
      fechaSolicitud: string;
      mensaje: string;
    }> {
      return apiClient.post('/public/certificados-laborales/solicitar', data, {
        requiresAuth: false,
      });
    },

    /**
     * Consultar estado de solicitud
     */
    async consultar(codigo: string): Promise<{
      codigo: string;
      estado: string;
      fechaSolicitud: string;
      fechaActualizacion: string;
      datosBasicos: any;
      certificadoPDF?: string;
      motivoRechazo?: string;
    }> {
      return apiClient.get(`/public/certificados-laborales/${codigo}`, {
        requiresAuth: false,
      });
    },
  },

  /**
   * CONVOCATORIAS DOCENTES
   */
  convocatorias: {
    /**
     * Listar convocatorias
     */
    async listar(params?: {
      estado?: 'abiertas' | 'cerradas' | 'todas';
      ciudad?: string;
      tipoContrato?: string;
    }): Promise<ConvocatoriaDocente[]> {
      return apiClient.get<ConvocatoriaDocente[]>('/public/convocatorias', {
        params,
        requiresAuth: false,
      });
    },

    /**
     * Obtener detalle de convocatoria
     */
    async obtenerPorId(id: string): Promise<ConvocatoriaDocente> {
      return apiClient.get<ConvocatoriaDocente>(`/public/convocatorias/${id}`, {
        requiresAuth: false,
      });
    },

    /**
     * Aplicar a convocatoria
     */
    async aplicar(convocatoriaId: string, data: {
      tipoDocumento: string;
      numeroDocumento: string;
      nombres: string;
      apellidos: string;
      email: string;
      telefono: string;
      ciudad: string;
      nivelEducativo: string;
      tituloProfesional: string;
      universidadGrado: string;
      anosExperiencia: number;
      areasExperiencia: string[];
      hojaVida: File;
      diplomas: File[];
      certificados?: File[];
    }): Promise<{
      folio: string;
      estado: string;
      fechaAplicacion: string;
    }> {
      const formData = new FormData();
      
      // Datos básicos
      formData.append('tipoDocumento', data.tipoDocumento);
      formData.append('numeroDocumento', data.numeroDocumento);
      formData.append('nombres', data.nombres);
      formData.append('apellidos', data.apellidos);
      formData.append('email', data.email);
      formData.append('telefono', data.telefono);
      formData.append('ciudad', data.ciudad);
      formData.append('nivelEducativo', data.nivelEducativo);
      formData.append('tituloProfesional', data.tituloProfesional);
      formData.append('universidadGrado', data.universidadGrado);
      formData.append('anosExperiencia', String(data.anosExperiencia));
      formData.append('areasExperiencia', JSON.stringify(data.areasExperiencia));
      
      // Archivos
      formData.append('hojaVida', data.hojaVida);
      data.diplomas.forEach(diploma => formData.append('diplomas', diploma));
      if (data.certificados) {
        data.certificados.forEach(cert => formData.append('certificados', cert));
      }
      
      return apiClient.upload(`/public/convocatorias/${convocatoriaId}/aplicar`, formData);
    },

    /**
     * Consultar estado de aplicación
     */
    async consultarAplicacion(folio: string): Promise<AplicacionConvocatoria> {
      return apiClient.get<AplicacionConvocatoria>(`/public/convocatorias/aplicacion/${folio}`, {
        requiresAuth: false,
      });
    },
  },

  /**
   * CONTACTO
   */
  contacto: {
    /**
     * Enviar mensaje de contacto
     */
    async enviar(data: {
      nombre: string;
      email: string;
      telefono?: string;
      asunto: string;
      mensaje: string;
      recaptchaToken: string;
    }): Promise<{
      numeroTicket: string;
      fechaEnvio: string;
      mensaje: string;
    }> {
      return apiClient.post('/public/contacto', data, {
        requiresAuth: false,
      });
    },
  },
};

export default publicoService;
