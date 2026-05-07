/**
 * Roles Service
 * Servicio para gestión de roles y permisos
 *
 * Nota: Todos los endpoints de roles van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/roles -> auth-service:3001/roles
 */

import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/auth/api/v1';

export interface SystemRole {
  id: string;
  code?: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  type: 'sistema' | 'personalizado';
  sistema_destino: string;
  is_active: boolean;
  requires_2fa: boolean;
  usuarios_count: number;
  permisos_count: number;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleStats {
  total_roles: number;
  roles_sistema: number;
  usuarios_asignados: number;
  permisos_disponibles: number;
}

export interface CreateRoleRequest {
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  color?: string;
  type?: 'sistema' | 'personalizado';
  requires_2fa?: boolean;
  permissionIds?: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  requires_2fa?: boolean;
  permissionIds?: string[];
}

export interface RoleFilters {
  search?: string;
  type?: 'todos' | 'sistema' | 'personalizado';
  status?: 'todos' | 'activo' | 'inactivo';
  requires_2fa?: 'todos' | 'con2fa' | 'sin2fa';
  page?: number;
  limit?: number;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const rolesService = {
  /**
   * Obtener lista de roles con filtros y paginación
   */
  async getRoles(filters: RoleFilters = {}): Promise<{ roles: SystemRole[], total: number }> {
    // Convertir filtros del frontend a los del backend
    const backendFilters: any = {};

    if (filters.search) backendFilters.search = filters.search;
    if (filters.type && filters.type !== 'todos') backendFilters.type = filters.type;
    if (filters.status && filters.status !== 'todos') {
      backendFilters.is_active = filters.status === 'activo';
    }
    if (filters.requires_2fa && filters.requires_2fa !== 'todos') {
      backendFilters.requires_2fa = filters.requires_2fa === 'con2fa';
    }
    if (filters.page) backendFilters.page = filters.page;
    if (filters.limit) backendFilters.limit = filters.limit;

    const response = await apiClient.get<{ roles: SystemRole[], total: number }>(`${SERVICE_PREFIX}/roles`, backendFilters);
    return response;
  },

  /**
   * Obtener estadísticas de roles
   */
  async getStats(): Promise<RoleStats> {
    return apiClient.get<RoleStats>(`${SERVICE_PREFIX}/roles/stats`);
  },

  /**
   * Obtener un rol específico
   */
  async getRole(id: string): Promise<SystemRole> {
    return apiClient.get<SystemRole>(`${SERVICE_PREFIX}/roles/${id}`);
  },

  /**
   * Crear un nuevo rol
   */
  async createRole(roleData: CreateRoleRequest): Promise<SystemRole> {
    return apiClient.post<SystemRole>(`${SERVICE_PREFIX}/roles`, roleData);
  },

  /**
   * Actualizar un rol
   */
  async updateRole(id: string, roleData: UpdateRoleRequest): Promise<SystemRole> {
    return apiClient.put<SystemRole>(`${SERVICE_PREFIX}/roles/${id}`, roleData);
  },

  /**
   * Eliminar un rol
   */
  async deleteRole(id: string): Promise<void> {
    return apiClient.delete(`${SERVICE_PREFIX}/roles/${id}`);
  },

  /**
   * Duplicar un rol
   */
  async duplicateRole(id: string): Promise<SystemRole> {
    return apiClient.post<SystemRole>(`${SERVICE_PREFIX}/roles/${id}/duplicate`);
  },

  /**
   * Toggle estado activo de un rol
   */
  async toggleActive(id: string): Promise<SystemRole> {
    return apiClient.patch<SystemRole>(`${SERVICE_PREFIX}/roles/${id}/toggle-active`);
  },

  /**
   * Toggle 2FA de un rol
   */
  async toggle2FA(id: string): Promise<SystemRole> {
    return apiClient.patch<SystemRole>(`${SERVICE_PREFIX}/roles/${id}/toggle-2fa`);
  },

  /**
   * Obtener permisos de un rol
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return apiClient.get<Permission[]>(`${SERVICE_PREFIX}/roles/${roleId}/permissions`);
  },

  /**
   * Actualizar permisos de un rol
   */
  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<SystemRole> {
    return apiClient.put<SystemRole>(`${SERVICE_PREFIX}/roles/${roleId}/permissions`, { permissionIds });
  },

  /**
   * Obtener todos los permisos disponibles
   */
  async getAllPermissions(): Promise<Permission[]> {
    return apiClient.get<Permission[]>(`${SERVICE_PREFIX}/roles/permissions/all`);
  },
};

export default rolesService;
