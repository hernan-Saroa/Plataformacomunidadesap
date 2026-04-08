import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/auth/api/v1';

// Types
export interface ProfileCompleteness {
  id_completitud: string;
  id_usuario: string;
  porcentaje_total: number;
  porcentaje_datos_basicos: number;
  porcentaje_datos_personales: number;
  porcentaje_datos_contacto: number;
  porcentaje_datos_rol: number;
  porcentaje_documentos: number;
  campos_obligatorios_totales: number;
  campos_obligatorios_completados: number;
  campos_importantes_totales: number;
  campos_importantes_completados: number;
  campos_opcionales_totales: number;
  campos_opcionales_completados: number;
  documentos_requeridos_totales: number;
  documentos_subidos: number;
  documentos_aprobados: number;
  documentos_rechazados: number;
  documentos_pendientes: number;
  fecha_ultimo_cambio: string;
  fecha_primera_completitud_100: string | null;
  numero_recordatorios_enviados: number;
  fecha_ultimo_recordatorio: string | null;
  campos_faltantes: {
    obligatorios: string[];
    importantes: string[];
    documentos: string[];
  };
  historial_cambios: Array<{
    fecha: string;
    porcentaje: number;
    campos_completados: string[];
  }>;
}

export interface UpdateProfileData {
  seccion: 'datos_basicos' | 'datos_personales' | 'datos_contacto' | 'datos_rol';
  datos: Record<string, any>;
}

export const profileCompletenessService = {
  /**
   * Obtener completitud de perfil de un usuario
   */
  getByUserId: async (userId: string): Promise<ProfileCompleteness> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/${userId}/profile-completeness`);
      return response.data;
    } catch (error) {
      console.error('Error fetching profile completeness:', error);
      throw error;
    }
  },

  /**
   * Recalcular completitud de perfil
   */
  recalculate: async (userId: string): Promise<ProfileCompleteness> => {
    try {
      const response = await apiClient.post(`${SERVICE_PREFIX}/users/${userId}/profile-completeness/recalculate`);
      return response.data;
    } catch (error) {
      console.error('Error recalculating profile completeness:', error);
      throw error;
    }
  },

  /**
   * Actualizar datos de perfil
   */
  updateProfile: async (
    userId: string,
    data: UpdateProfileData
  ): Promise<{ success: boolean; completeness: ProfileCompleteness }> => {
    try {
      const response = await apiClient.put(`${SERVICE_PREFIX}/users/${userId}/profile`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  /**
   * Enviar recordatorio de completitud
   */
  sendReminder: async (userId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.post(`${SERVICE_PREFIX}/users/${userId}/profile-completeness/reminder`);
      return response.data;
    } catch (error) {
      console.error('Error sending reminder:', error);
      throw error;
    }
  },

  /**
   * Obtener usuarios con perfil incompleto
   */
  getIncompleteProfiles: async (params?: {
    porcentaje_max?: number;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/incomplete-profiles`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching incomplete profiles:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de completitud
   */
  getStats: async (): Promise<{
    promedio_completitud: number;
    usuarios_100_porciento: number;
    usuarios_menos_50_porciento: number;
    campos_mas_faltantes: Array<{ campo: string; cantidad: number }>;
  }> => {
    try {
      const response = await apiClient.get(`${SERVICE_PREFIX}/users/profile-completeness/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching completeness stats:', error);
      throw error;
    }
  }
};

export default profileCompletenessService;
