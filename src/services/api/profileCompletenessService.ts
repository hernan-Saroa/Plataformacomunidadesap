import { apiClient } from './client';
import type { ProfileCompleteness, UpdateProfileData } from './types';

export const profileCompletenessService = {
  /**
   * Obtener completitud de perfil de un usuario
   */
  getByUserId: async (userId: string): Promise<ProfileCompleteness> => {
    try {
      const response = await apiClient.get(`/users/${userId}/profile-completeness`);
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
      const response = await apiClient.post(`/users/${userId}/profile-completeness/recalculate`);
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
      const response = await apiClient.put(`/users/${userId}/profile`, data);
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
      const response = await apiClient.post(`/users/${userId}/profile-completeness/reminder`);
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
      const response = await apiClient.get('/users/incomplete-profiles', { params });
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
      const response = await apiClient.get('/users/profile-completeness/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching completeness stats:', error);
      throw error;
    }
  }
};

export default profileCompletenessService;