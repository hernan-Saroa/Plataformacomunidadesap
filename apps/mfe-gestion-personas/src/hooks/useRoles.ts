/**
 * Hook personalizado para gestión de roles y permisos
 */

import { useState, useEffect, useCallback } from 'react';
import { rolesService } from '../services/api/roles.service';
import type {
  CreateRoleRequest,
  Permission as BackendPermission,
  RoleFilters,
  SystemRole,
  UpdateRoleRequest,
} from '../services/api/roles.service';
import { toast } from 'sonner';

type PermissionCategory =
  | 'users'
  | 'roles'
  | 'permissions'
  | 'audit'
  | 'reports'
  | 'settings'
  | 'dashboard'
  | 'persons'
  | 'documents'
  | 'aspirants'
  | 'verification'
  | 'academics';

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  isSystem: boolean;
  isCritical: boolean;
  createdAt: string;
}

interface Role {
  id: string;
  code?: string;
  name: string;
  nombre: string;
  displayName: string;
  description?: string;
  type: 'system' | 'custom';
  color?: string;
  icon?: string;
  permissions: Permission[];
  userCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

interface CreateRoleDTO {
  name: string;
  displayName: string;
  description?: string;
  type: 'custom';
  permissionIds: string[];
}

interface UpdateRoleDTO {
  displayName?: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

interface FilterParams {
  search?: string;
  status?: string[];
  role?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

interface UseRolesOptions {
  autoFetch?: boolean;
  initialFilters?: FilterParams;
}

const mapFiltersToRoleFilters = (filters: FilterParams = {}): RoleFilters => {
  const status = Array.isArray(filters.status) ? filters.status[0] : undefined;

  return {
    search: filters.search,
    status:
      status === 'active' || status === 'activo'
        ? 'activo'
        : status === 'inactive' || status === 'inactivo'
          ? 'inactivo'
          : undefined,
    page: filters.page,
    limit: filters.pageSize,
  };
};

const mapBackendPermissionToPermission = (permission: BackendPermission): Permission => ({
  id: permission.id || (permission as any).id_permission,
  code: (permission as any).code || permission.name,
  name: permission.name,
  description: permission.description,
  category: ((permission as any).category || 'permissions') as PermissionCategory,
  isSystem: (permission as any).is_system ?? true,
  isCritical: (permission as any).is_critical ?? false,
  createdAt: permission.created_at,
});

const mapBackendRoleToRole = (role: SystemRole): Role => ({
  id: role.id,
  code: role.code,
  name: role.name,
  nombre: role.name,
  displayName: role.name,
  description: role.description,
  type: role.type === 'sistema' ? 'system' : 'custom',
  color: role.color,
  icon: role.icon,
  permissions: [],
  userCount: role.usuarios_count,
  isActive: role.is_active,
  createdAt: role.created_at,
  updatedAt: role.updated_at,
  createdBy: role.created_by,
  updatedBy: role.updated_by,
});

const mapCreateRoleToRequest = (roleData: CreateRoleDTO): CreateRoleRequest => ({
  name: roleData.displayName || roleData.name,
  code: roleData.name,
  description: roleData.description,
  type: 'personalizado',
  permissionIds: roleData.permissionIds,
});

const mapUpdateRoleToRequest = (roleData: UpdateRoleDTO): UpdateRoleRequest => ({
  name: roleData.displayName,
  description: roleData.description,
  permissionIds: roleData.permissionIds,
});

export function useRoles(options: UseRolesOptions = {}) {
  const { autoFetch = true, initialFilters = {} } = options;

  // Estado
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterParams>(initialFilters);

  /**
   * Fetch roles
   */
  const fetchRoles = useCallback(async (customFilters?: FilterParams) => {
    setLoading(true);
    setError(null);

    try {
      const filterParams = customFilters || filters;
      const response = await rolesService.getRoles(mapFiltersToRoleFilters(filterParams));
      setRoles(response.roles.map(mapBackendRoleToRole));
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar roles';
      setError(errorMessage);
      toast.error('Error', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Fetch permisos
   */
  const fetchPermissions = useCallback(async () => {
    try {
      const allPermissions = (await rolesService.getAllPermissions()).map(mapBackendPermissionToPermission);
      setPermissions(allPermissions);

      const byCategory = allPermissions.reduce<Record<string, Permission[]>>((acc, permission) => {
        const category = permission.category || 'permissions';
        acc[category] = [...(acc[category] || []), permission];
        return acc;
      }, {});
      setPermissionsByCategory(byCategory);
    } catch (err: any) {
      console.error('Error al cargar permisos:', err);
    }
  }, []);

  /**
   * Crear rol
   */
  const createRole = useCallback(async (roleData: CreateRoleDTO) => {
    setLoading(true);
    setError(null);

    try {
      const newRole = mapBackendRoleToRole(await rolesService.createRole(mapCreateRoleToRequest(roleData)));
      setRoles((prev) => [newRole, ...prev]);

      toast.success('Rol creado', {
        description: `${newRole.displayName} ha sido creado exitosamente`,
      });

      return newRole;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al crear rol';
      setError(errorMessage);
      toast.error('Error al crear rol', { description: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar rol
   */
  const updateRole = useCallback(async (roleId: string, roleData: UpdateRoleDTO) => {
    setLoading(true);
    setError(null);

    try {
      const updatedRole = mapBackendRoleToRole(await rolesService.updateRole(roleId, mapUpdateRoleToRequest(roleData)));
      
      setRoles((prev) =>
        prev.map((role) => (role.id === roleId ? updatedRole : role))
      );

      toast.success('Rol actualizado', {
        description: 'Los cambios se han guardado correctamente',
      });

      return updatedRole;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar rol';
      setError(errorMessage);
      toast.error('Error al actualizar rol', { description: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Eliminar rol
   */
  const deleteRole = useCallback(async (roleId: string) => {
    setLoading(true);
    setError(null);

    try {
      await rolesService.deleteRole(roleId);
      
      setRoles((prev) => prev.filter((role) => role.id !== roleId));

      toast.success('Rol eliminado', {
        description: 'El rol ha sido eliminado correctamente',
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Error al eliminar rol';
      setError(errorMessage);
      toast.error('Error al eliminar rol', { description: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Duplicar rol
   */
  const duplicateRole = useCallback(async (roleId: string, newName: string) => {
    setLoading(true);
    setError(null);

    try {
      const duplicatedRoleResponse = await rolesService.duplicateRole(roleId);
      const duplicatedRole = mapBackendRoleToRole(
        newName
          ? await rolesService.updateRole(duplicatedRoleResponse.id, { name: newName })
          : duplicatedRoleResponse
      );
      
      setRoles((prev) => [duplicatedRole, ...prev]);

      toast.success('Rol duplicado', {
        description: `Se ha creado una copia: ${duplicatedRole.displayName}`,
      });

      return duplicatedRole;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al duplicar rol';
      setError(errorMessage);
      toast.error('Error al duplicar rol', { description: errorMessage });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Actualizar permisos de un rol
   */
  const updateRolePermissions = useCallback(async (roleId: string, permissionIds: string[]) => {
    try {
      const updatedRole = mapBackendRoleToRole(await rolesService.updateRolePermissions(roleId, permissionIds));
      
      setRoles((prev) =>
        prev.map((role) => (role.id === roleId ? updatedRole : role))
      );

      toast.success('Permisos actualizados', {
        description: 'Los permisos del rol se han actualizado',
      });

      return updatedRole;
    } catch (err: any) {
      toast.error('Error al actualizar permisos', { description: err.message });
      throw err;
    }
  }, []);

  /**
   * Comparar roles
   */
  const compareRoles = useCallback(async (roleIds: string[]) => {
    try {
      return { roles: roles.filter((role) => roleIds.includes(role.id)) };
    } catch (err: any) {
      toast.error('Error al comparar roles', { description: err.message });
      throw err;
    }
  }, [roles]);

  /**
   * Refrescar datos
   */
  const refresh = useCallback(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchRoles();
      fetchPermissions();
    }
  }, [autoFetch]); // Solo en mount

  return {
    // Estado
    roles,
    permissions,
    permissionsByCategory,
    loading,
    error,
    filters,

    // Funciones
    fetchRoles,
    fetchPermissions,
    createRole,
    updateRole,
    deleteRole,
    duplicateRole,
    updateRolePermissions,
    compareRoles,
    refresh,
  };
}

export default useRoles;
