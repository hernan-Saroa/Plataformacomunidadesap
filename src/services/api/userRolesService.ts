import { apiClient } from './client';
import type { UserRole, CreateRoleData, DeactivateRoleData } from './types';

export const userRolesService = {
  /**
   * Obtener todos los roles de un usuario (activos + históricos)
   */
  getUserRoles: async (userId: string): Promise<{
    activos: UserRole[];
    historicos: UserRole[];
  }> => {
    try {
      const response = await apiClient.get(`/users/${userId}/roles`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  },

  /**
   * Obtener solo roles activos de un usuario
   */
  getActiveRoles: async (userId: string): Promise<UserRole[]> => {
    try {
      const response = await apiClient.get(`/users/${userId}/roles/active`);
      return response.data;
    } catch (error) {
      console.error('Error fetching active roles:', error);
      throw error;
    }
  },

  /**
   * Obtener rol principal de un usuario
   */
  getPrincipalRole: async (userId: string): Promise<UserRole | null> => {
    try {
      const response = await apiClient.get(`/users/${userId}/roles/principal`);
      return response.data;
    } catch (error) {
      console.error('Error fetching principal role:', error);
      throw error;
    }
  },

  /**
   * Agregar un nuevo rol a un usuario
   */
  addRole: async (userId: string, data: CreateRoleData): Promise<UserRole> => {
    try {
      const response = await apiClient.post(`/users/${userId}/roles`, data);
      return response.data;
    } catch (error) {
      console.error('Error adding role:', error);
      throw error;
    }
  },

  /**
   * Desactivar un rol
   */
  deactivateRole: async (
    userId: string, 
    roleId: string, 
    data: DeactivateRoleData
  ): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.put(
        `/users/${userId}/roles/${roleId}/deactivate`, 
        data
      );
      return response.data;
    } catch (error) {
      console.error('Error deactivating role:', error);
      throw error;
    }
  },

  /**
   * Establecer un rol como principal
   */
  setPrincipalRole: async (userId: string, roleId: string): Promise<{ success: boolean }> => {
    try {
      const response = await apiClient.put(`/users/${userId}/roles/${roleId}/set-principal`);
      return response.data;
    } catch (error) {
      console.error('Error setting principal role:', error);
      throw error;
    }
  },

  /**
   * Actualizar datos de un rol
   */
  updateRoleData: async (
    userId: string, 
    roleId: string, 
    datos_rol: Record<string, any>
  ): Promise<UserRole> => {
    try {
      const response = await apiClient.put(
        `/users/${userId}/roles/${roleId}/data`, 
        { datos_rol }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating role data:', error);
      throw error;
    }
  },

  /**
   * Obtener historial de evolución de roles de un usuario
   */
  getRoleHistory: async (userId: string): Promise<UserRole[]> => {
    try {
      const response = await apiClient.get(`/users/${userId}/roles/history`);
      return response.data;
    } catch (error) {
      console.error('Error fetching role history:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de roles
   */
  getStats: async (): Promise<{
    promedio_roles_por_usuario: number;
    usuarios_con_multiples_roles: number;
    distribucion_por_tipo: Record<string, number>;
    evolucion_mensual: Array<{
      mes: string;
      aspirantes: number;
      estudiantes: number;
      docentes: number;
      administrativos: number;
      graduados: number;
    }>;
  }> => {
    try {
      const response = await apiClient.get('/users/roles/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching role stats:', error);
      throw error;
    }
  },

  /**
   * Validar si un usuario puede tener un rol específico
   */
  validateRole: async (
    userId: string, 
    tipoRol: string
  ): Promise<{ 
    puede_agregar: boolean; 
    motivo?: string; 
    conflictos?: string[] 
  }> => {
    try {
      const response = await apiClient.post(`/users/${userId}/roles/validate`, { 
        tipo_rol: tipoRol 
      });
      return response.data;
    } catch (error) {
      console.error('Error validating role:', error);
      throw error;
    }
  }
};

export default userRolesService;