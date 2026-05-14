/**
 * Modules Service
 * Servicio para gestión de módulos y permisos agrupados
 *
 * Nota: Todos los endpoints van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/modules -> auth-service:3001/modules
 */

import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
const SERVICE_PREFIX = '/auth/api/v1';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PermissionDto {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active?: boolean;
}

export interface ModuleWithPermissions {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  category: 'backoffice' | 'portal';
  is_active: boolean;
  permissions: PermissionDto[];
}

export interface ModulesFilters {
  category?: 'backoffice' | 'portal';
  is_active?: boolean;
  search?: string;
  include_inactive_permissions?: boolean;
}

export interface ModulesStats {
  total_modules: number;
  total_permissions: number;
  backoffice_modules: number;
  portal_modules: number;
  active_modules: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export const modulesService = {
  /**
   * Obtener todos los módulos con sus permisos
   */
  async getModulesWithPermissions(
    filters: ModulesFilters = {}
  ): Promise<ModuleWithPermissions[]> {
    const params: Record<string, any> = {};

    if (filters.category) params.category = filters.category;
    if (filters.is_active !== undefined) params.is_active = filters.is_active;
    if (filters.search) params.search = filters.search;
    if (filters.include_inactive_permissions !== undefined) {
      params.include_inactive_permissions = filters.include_inactive_permissions;
    }

    const response = await apiClient.get<ModuleWithPermissions[]>(`${SERVICE_PREFIX}/modules`, params);
    return response;
  },

  /**
   * Obtener estadísticas de módulos y permisos
   */
  async getStats(): Promise<ModulesStats> {
    return apiClient.get<ModulesStats>(`${SERVICE_PREFIX}/modules/stats`);
  },

  /**
   * Obtener todos los permisos (flat list)
   */
  async getAllPermissions(): Promise<PermissionDto[]> {
    return apiClient.get<PermissionDto[]>(`${SERVICE_PREFIX}/modules/permissions`);
  },

  /**
   * Obtener un módulo específico con sus permisos
   */
  async getModule(id: string): Promise<ModuleWithPermissions> {
    return apiClient.get<ModuleWithPermissions>(`${SERVICE_PREFIX}/modules/${id}`);
  },

  /**
   * Convertir módulos de la API al formato del componente RolePermissionsEditor
   * Esta función mapea la estructura de la API a la estructura esperada por el componente
   */
  mapToPermissionModules(modules: ModuleWithPermissions[]): any[] {
    return modules.map((module) => {
      const flatPermissions = (module.permissions || []).map((permission) => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        module: module.code,
        code: permission.code,
        is_active: permission.is_active !== false,
      }));

      const permissionsByGroup = flatPermissions.reduce<Record<string, typeof flatPermissions>>((acc, permission) => {
        const [, group] = permission.code.split('.');
        const groupKey = group || 'otros';
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(permission);
        return acc;
      }, {});

      return {
        id: module.code,
        name: module.name,
        icon: module.icon,
        color: getTextColorClass(module.color),
        bgColor: getBgColorClass(module.color),
        permissions: flatPermissions,
        // Solo agrupamos permisos por segundo segmento del code para gestión legal
        permissionGroups:
          module.code === 'gestion-legal' || module.code === 'control-disciplinario' || module.code === 'control-interno'
            ? Object.entries(
                flatPermissions.reduce<Record<string, typeof flatPermissions>>((acc, permission) => {
                  const [, group] = permission.code.split('.');
                  const groupKey = group || 'otros';
                  if (!acc[groupKey]) acc[groupKey] = [];
                  acc[groupKey].push(permission);
                  return acc;
                }, {}),
              ).map(([group, permissions]) => ({
                group,
                permissions,
              }))
            : [],
      };
    });
  },
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convierte un color hex a clase de texto de Tailwind
 */
function getTextColorClass(hexColor: string): string {
  // Mapeo de colores hex a clases de Tailwind
  const colorMap: Record<string, string> = {
    '#003DA5': 'text-blue-600',
    '#3B82F6': 'text-blue-600',
    '#6366F1': 'text-indigo-600',
    '#8B5CF6': 'text-purple-600',
    '#A855F7': 'text-purple-600',
    '#EC4899': 'text-pink-600',
    '#F43F5E': 'text-rose-600',
    '#EF4444': 'text-red-600',
    '#F97316': 'text-orange-600',
    '#F59E0B': 'text-amber-600',
    '#EAB308': 'text-yellow-600',
    '#84CC16': 'text-lime-600',
    '#22C55E': 'text-green-600',
    '#10B981': 'text-emerald-600',
    '#14B8A6': 'text-teal-600',
    '#06B6D4': 'text-cyan-600',
    '#0EA5E9': 'text-sky-600',
    '#6B7280': 'text-gray-600',
    '#64748B': 'text-slate-600',
    '#4F46E5': 'text-indigo-700',
    '#7C3AED': 'text-violet-600',
  };

  return colorMap[hexColor.toUpperCase()] || 'text-blue-600';
}

/**
 * Convierte un color hex a clase de fondo de Tailwind
 */
function getBgColorClass(hexColor: string): string {
  // Mapeo de colores hex a clases de fondo de Tailwind
  const colorMap: Record<string, string> = {
    '#003DA5': 'bg-blue-50',
    '#3B82F6': 'bg-blue-50',
    '#6366F1': 'bg-indigo-50',
    '#8B5CF6': 'bg-purple-50',
    '#A855F7': 'bg-purple-50',
    '#EC4899': 'bg-pink-50',
    '#F43F5E': 'bg-rose-50',
    '#EF4444': 'bg-red-50',
    '#F97316': 'bg-orange-50',
    '#F59E0B': 'bg-amber-50',
    '#EAB308': 'bg-yellow-50',
    '#84CC16': 'bg-lime-50',
    '#22C55E': 'bg-green-50',
    '#10B981': 'bg-emerald-50',
    '#14B8A6': 'bg-teal-50',
    '#06B6D4': 'bg-cyan-50',
    '#0EA5E9': 'bg-sky-50',
    '#6B7280': 'bg-gray-50',
    '#64748B': 'bg-slate-50',
    '#4F46E5': 'bg-indigo-100',
    '#7C3AED': 'bg-violet-50',
  };

  return colorMap[hexColor.toUpperCase()] || 'bg-blue-50';
}

export default modulesService;
