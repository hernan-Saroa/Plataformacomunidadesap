/**
 * Hook personalizado para gestión de roles y permisos
 */

import { useState, useEffect, useCallback } from 'react';
// TODO: Implementar rolesService cuando el backend esté listo
// import { rolesService } from '../services/api';
import type { Role, Permission, CreateRoleDTO, UpdateRoleDTO, FilterParams } from '../types';
import { toast } from 'sonner';

// Mock data temporal hasta que el backend esté listo
const mockRolesService = {
  getRoles: async (filters: any) => ({ data: [] }),
  getAllPermissions: async () => [],
  getPermissionsByCategory: async () => ({}),
  createRole: async (data: any) => ({ id: '1', displayName: data.displayName }),
  updateRole: async (id: string, data: any) => ({ id, displayName: data.displayName }),
  deleteRole: async (id: string) => {},
  duplicateRole: async (id: string, name: string) => ({ id: '1', displayName: name }),
  updateRolePermissions: async (id: string, permissionIds: string[]) => ({ id, permissionIds }),
  compareRoles: async (roleIds: string[]) => ({ roles: roleIds }),
};

interface UseRolesOptions {
  autoFetch?: boolean;
  initialFilters?: FilterParams;
}

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
      const response = await mockRolesService.getRoles(filterParams);
      setRoles(response.data);
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
      const allPermissions = await mockRolesService.getAllPermissions();
      setPermissions(allPermissions);

      const byCategory = await mockRolesService.getPermissionsByCategory();
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
      const newRole = await mockRolesService.createRole(roleData);
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
      const updatedRole = await mockRolesService.updateRole(roleId, roleData);
      
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
      await mockRolesService.deleteRole(roleId);
      
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
      const duplicatedRole = await mockRolesService.duplicateRole(roleId, newName);
      
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
      const updatedRole = await mockRolesService.updateRolePermissions(roleId, permissionIds);
      
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
      return await mockRolesService.compareRoles(roleIds);
    } catch (err: any) {
      toast.error('Error al comparar roles', { description: err.message });
      throw err;
    }
  }, []);

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