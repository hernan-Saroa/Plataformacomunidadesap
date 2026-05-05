import { apiClient } from './apiClient';

// Types
export interface EnrollmentRequest {
  id_solicitud: string;
  tipo_documento: 'CC' | 'TI' | 'CE' | 'PP';
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email_personal: string;
  telefono_movil: string;
  origen_solicitud: string;
  validado_en_bd_esap: boolean;
  tipo_usuario_detectado: string;
  estado_solicitud: 'Pendiente' | 'En_revisión' | 'Aprobada' | 'Rechazada';
  fecha_solicitud: string;
  horas_pendientes: number;
}

export interface CreateEnrollmentData {
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  email_personal: string;
  telefono_movil: string;
  password: string;
  origen_solicitud: string;
  codigo_qr?: string;
}

export interface ApproveEnrollmentData {
  observaciones?: string;
}

export interface RejectEnrollmentData {
  motivo_rechazo: string;
}

export const enrollmentService = {
  /**
   * Obtener todas las solicitudes de enrolamiento
   */
  getAll: async (params?: {
    estado?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: EnrollmentRequest[]; total: number }> => {
    try {
      const response = await apiClient.get('/enrollment/requests', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollment requests:', error);
      throw error;
    }
  },

  /**
   * Obtener solicitudes pendientes
   */
  getPending: async (): Promise<EnrollmentRequest[]> => {
    try {
      const response = await apiClient.get('/enrollment/requests/pending');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      throw error;
    }
  },

  /**
   * Obtener una solicitud por ID
   */
  getById: async (id: string): Promise<EnrollmentRequest> => {
    try {
      const response = await apiClient.get(`/enrollment/requests/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollment request:', error);
      throw error;
    }
  },

  /**
   * Crear una nueva solicitud de enrolamiento (desde QR)
   */
  create: async (data: CreateEnrollmentData): Promise<EnrollmentRequest> => {
    try {
      const response = await apiClient.post('/enrollment/requests', data);
      return response.data;
    } catch (error) {
      console.error('Error creating enrollment request:', error);
      throw error;
    }
  },

  /**
   * Aprobar una solicitud de enrolamiento
   */
  approve: async (
    id: string, 
    data?: ApproveEnrollmentData
  ): Promise<{ success: boolean; usuario_creado: any }> => {
    try {
      const response = await apiClient.post(`/enrollment/requests/${id}/approve`, data);
      return response.data;
    } catch (error) {
      console.error('Error approving enrollment request:', error);
      throw error;
    }
  },

  /**
   * Rechazar una solicitud de enrolamiento
   */
  reject: async (
    id: string, 
    data: RejectEnrollmentData
  ): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post(`/enrollment/requests/${id}/reject`, data);
      return response.data;
    } catch (error) {
      console.error('Error rejecting enrollment request:', error);
      throw error;
    }
  },

  /**
   * Marcar solicitud como en revisión
   */
  markAsReviewing: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.put(`/enrollment/requests/${id}/reviewing`);
      return response.data;
    } catch (error) {
      console.error('Error marking as reviewing:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de enrolamiento
   */
  getStats: async (): Promise<{
    pendientes: number;
    aprobadas_hoy: number;
    tiempo_promedio_horas: number;
    tasa_aprobacion: number;
  }> => {
    try {
      const response = await apiClient.get('/enrollment/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollment stats:', error);
      throw error;
    }
  }
};

export default enrollmentService;
