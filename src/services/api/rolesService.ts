/**
 * Servicio de Roles
 * Gestiona roles del sistema (no roles de persona)
 */

import { apiClient } from './client';
import type { 
  Role, 
  Permission,
  CreateRoleDTO, 
  UpdateRoleDTO,
  RoleComparison,
  PaginatedResponse,
  FilterParams 
} from '../../types';

class RolesService {
  // ==========================================================================
  // ROLES
  // ==========================================================================

  async getRoles(filters?: FilterParams): Promise<PaginatedResponse<Role>> {
    return apiClient.get<PaginatedResponse<Role>>(
      API_ENDPOINTS.ROLES.BASE,
      filters
    );
  }

  async getRoleById(roleId: string): Promise<Role> {
    return apiClient.get<Role>(API_ENDPOINTS.ROLES.BY_ID(roleId));
  }

  async createRole(roleData: CreateRoleDTO): Promise<Role> {
    return apiClient.post<Role>(API_ENDPOINTS.ROLES.BASE, roleData);
  }

  async updateRole(roleId: string, roleData: UpdateRoleDTO): Promise<Role> {
    return apiClient.put<Role>(
      API_ENDPOINTS.ROLES.BY_ID(roleId),
      roleData
    );
  }

  async deleteRole(roleId: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.ROLES.BY_ID(roleId));
  }

  async duplicateRole(roleId: string, newName: string): Promise<Role> {
    return apiClient.post<Role>(API_ENDPOINTS.ROLES.DUPLICATE(roleId), {
      newName,
    });
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return apiClient.get<Permission[]>(API_ENDPOINTS.ROLES.PERMISSIONS(roleId));
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    return apiClient.put<Role>(API_ENDPOINTS.ROLES.PERMISSIONS(roleId), {
      permissionIds,
    });
  }

  async getRoleUsers(roleId: string): Promise<any> {
    return apiClient.get(API_ENDPOINTS.ROLES.USERS(roleId));
  }

  async compareRoles(roleIds: string[]): Promise<RoleComparison> {
    return apiClient.post<RoleComparison>(API_ENDPOINTS.ROLES.COMPARE, {
      roleIds,
    });
  }

  async getRolePresets(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.ROLES.PRESETS);
  }

  async getRolesStats(): Promise<any> {
    return apiClient.get(API_ENDPOINTS.ROLES.STATS);
  }

  // ==========================================================================
  // PERMISSIONS
  // ==========================================================================

  async getAllPermissions(): Promise<Permission[]> {
    return apiClient.get<Permission[]>(API_ENDPOINTS.PERMISSIONS.BASE);
  }

  async getPermissionById(permissionId: string): Promise<Permission> {
    return apiClient.get<Permission>(
      API_ENDPOINTS.PERMISSIONS.BY_ID(permissionId)
    );
  }

  async getPermissionsByCategory(): Promise<Record<string, Permission[]>> {
    return apiClient.get<Record<string, Permission[]>>(
      API_ENDPOINTS.PERMISSIONS.BY_CATEGORY
    );
  }

  async bulkAssignPermissions(
    roleId: string,
    permissionIds: string[]
  ): Promise<void> {
    return apiClient.post(API_ENDPOINTS.PERMISSIONS.BULK_ASSIGN, {
      roleId,
      permissionIds,
    });
  }

  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const response = await apiClient.post<{ hasPermission: boolean }>(
      API_ENDPOINTS.PERMISSIONS.CHECK,
      { userId, permission }
    );
    return response.hasPermission;
  }
}

export const rolesService = new RolesService();
export default rolesService;