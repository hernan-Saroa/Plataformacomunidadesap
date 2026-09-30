/**
 * API Service para Roles y Permisos - SUPER APP ESAP
 * Servicio completo y discriminado con estadísticas y análisis
 * 
 * @version 2.0.0
 * @lastUpdated 2025-11-28
 */

import { 
  RolePermission, 
  RolePermissionAssignment, 
  RolePermissionLog,
  RolePermissionStatistics,
  RolePermissionMatrix,
  PermissionUsageReport,
  RoleConflictReport,
  RoleAuditReport,
  RoleRecommendation,
  PermissionDependency,
  RoleTemplate,
  BulkRoleAssignment,
  RolePermissionExport,
  RoleAccessAnalytics
} from '../../types/roles-permissions.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.esap.edu.co/v1';

/**
 * ============================================================================
 * GESTIÓN DE PERMISOS INDIVIDUALES
 * ============================================================================
 */

export class PermissionsService {
  /**
   * Obtener lista completa de permisos disponibles
   */
  static async getAllPermissions(params?: {
    moduleId?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    permissions: RolePermission[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.moduleId) queryParams.append('moduleId', params.moduleId);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/permissions?${queryParams}`);
    return response.json();
  }

  /**
   * Obtener permisos por módulo específico
   */
  static async getPermissionsByModule(moduleId: string): Promise<RolePermission[]> {
    const response = await fetch(`${API_BASE_URL}/permissions/module/${moduleId}`);
    return response.json();
  }

  /**
   * Obtener permisos por categoría
   */
  static async getPermissionsByCategory(category: string): Promise<RolePermission[]> {
    const response = await fetch(`${API_BASE_URL}/permissions/category/${category}`);
    return response.json();
  }

  /**
   * Obtener detalle de un permiso específico
   */
  static async getPermissionById(permissionId: string): Promise<RolePermission> {
    const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}`);
    return response.json();
  }

  /**
   * Crear nuevo permiso personalizado
   */
  static async createPermission(data: {
    name: string;
    code: string;
    description: string;
    module: string;
    category: string;
    level: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'approve';
    requiresTwoFactor?: boolean;
    dependencies?: string[];
  }): Promise<RolePermission> {
    const response = await fetch(`${API_BASE_URL}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * Actualizar permiso existente
   */
  static async updatePermission(
    permissionId: string, 
    data: Partial<RolePermission>
  ): Promise<RolePermission> {
    const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * Eliminar permiso (soft delete)
   */
  static async deletePermission(permissionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}`, {
      method: 'DELETE'
    });
    return response.json();
  }

  /**
   * Obtener dependencias de un permiso
   */
  static async getPermissionDependencies(permissionId: string): Promise<PermissionDependency[]> {
    const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}/dependencies`);
    return response.json();
  }

  /**
   * Validar si un permiso puede ser eliminado
   */
  static async validatePermissionDeletion(permissionId: string): Promise<{
    canDelete: boolean;
    reason?: string;
    affectedRoles?: string[];
    affectedUsers?: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/permissions/${permissionId}/validate-deletion`);
    return response.json();
  }
}

/**
 * ============================================================================
 * GESTIÓN DE ROLES
 * ============================================================================
 */

export class RolesService {
  /**
   * Obtener todos los roles del sistema
   */
  static async getAllRoles(params?: {
    type?: 'system' | 'custom';
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    roles: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/roles?${queryParams}`);
    return response.json();
  }

  /**
   * Obtener detalle de un rol
   */
  static async getRoleById(roleId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`);
    return response.json();
  }

  /**
   * Crear nuevo rol
   */
  static async createRole(data: {
    name: string;
    code: string;
    description: string;
    type: 'system' | 'custom';
    icon?: string;
    color?: string;
    isActive?: boolean;
    requiresTwoFactor?: boolean;
    permissions?: string[];
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * Actualizar rol existente
   */
  static async updateRole(roleId: string, data: Partial<any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * Eliminar rol (con validaciones)
   */
  static async deleteRole(roleId: string, options?: {
    force?: boolean;
    reassignUsersToRole?: string;
  }): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    return response.json();
  }

  /**
   * Duplicar rol existente
   */
  static async duplicateRole(roleId: string, newRoleName: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: newRoleName })
    });
    return response.json();
  }

  /**
   * Activar/desactivar rol
   */
  static async toggleRoleStatus(roleId: string, isActive: boolean): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/toggle-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    });
    return response.json();
  }

  /**
   * Obtener plantillas de roles predefinidas
   */
  static async getRoleTemplates(): Promise<RoleTemplate[]> {
    const response = await fetch(`${API_BASE_URL}/roles/templates`);
    return response.json();
  }

  /**
   * Crear rol desde plantilla
   */
  static async createRoleFromTemplate(templateId: string, customizations?: {
    name?: string;
    description?: string;
    additionalPermissions?: string[];
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/roles/from-template/${templateId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customizations)
    });
    return response.json();
  }
}

/**
 * ============================================================================
 * ASIGNACIÓN DE PERMISOS A ROLES
 * ============================================================================
 */

export class RolePermissionAssignmentService {
  /**
   * Obtener todos los permisos de un rol
   */
  static async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`);
    return response.json();
  }

  /**
   * Asignar permiso único a un rol
   */
  static async assignPermissionToRole(
    roleId: string, 
    permissionId: string,
    metadata?: {
      assignedBy: string;
      reason?: string;
      expiresAt?: string;
    }
  ): Promise<RolePermissionAssignment> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/${permissionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });
    return response.json();
  }

  /**
   * Remover permiso de un rol
   */
  static async removePermissionFromRole(
    roleId: string, 
    permissionId: string,
    reason?: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/${permissionId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return response.json();
  }

  /**
   * Asignación masiva de permisos a un rol
   */
  static async bulkAssignPermissions(
    roleId: string, 
    permissionIds: string[],
    metadata?: {
      assignedBy: string;
      reason?: string;
    }
  ): Promise<{
    success: boolean;
    assigned: number;
    failed: number;
    details: Array<{ permissionId: string; success: boolean; error?: string }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/bulk-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds, metadata })
    });
    return response.json();
  }

  /**
   * Remoción masiva de permisos de un rol
   */
  static async bulkRemovePermissions(
    roleId: string, 
    permissionIds: string[],
    reason?: string
  ): Promise<{
    success: boolean;
    removed: number;
    failed: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/bulk-remove`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds, reason })
    });
    return response.json();
  }

  /**
   * Reemplazar todos los permisos de un rol
   */
  static async replaceRolePermissions(
    roleId: string, 
    newPermissionIds: string[],
    metadata?: {
      replacedBy: string;
      reason?: string;
    }
  ): Promise<{ success: boolean; previousCount: number; newCount: number }> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions/replace`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionIds: newPermissionIds, metadata })
    });
    return response.json();
  }

  /**
   * Copiar permisos de un rol a otro
   */
  static async copyRolePermissions(
    sourceRoleId: string, 
    targetRoleId: string,
    mode: 'merge' | 'replace' = 'merge'
  ): Promise<{
    success: boolean;
    copiedCount: number;
    skippedCount: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles/${sourceRoleId}/permissions/copy-to/${targetRoleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    return response.json();
  }

  /**
   * Comparar permisos entre dos roles
   */
  static async compareRolePermissions(
    roleId1: string, 
    roleId2: string
  ): Promise<{
    commonPermissions: RolePermission[];
    onlyInRole1: RolePermission[];
    onlyInRole2: RolePermission[];
    role1Total: number;
    role2Total: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles/compare/${roleId1}/${roleId2}`);
    return response.json();
  }
}

/**
 * ============================================================================
 * ASIGNACIÓN DE ROLES A USUARIOS
 * ============================================================================
 */

export class UserRoleAssignmentService {
  /**
   * Obtener todos los roles de un usuario
   */
  static async getUserRoles(userId: string, params?: {
    activeOnly?: boolean;
    includeExpired?: boolean;
  }): Promise<any[]> {
    const queryParams = new URLSearchParams();
    if (params?.activeOnly) queryParams.append('activeOnly', 'true');
    if (params?.includeExpired) queryParams.append('includeExpired', 'true');

    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles?${queryParams}`);
    return response.json();
  }

  /**
   * Asignar rol a un usuario
   */
  static async assignRoleToUser(
    userId: string, 
    roleId: string,
    metadata?: {
      assignedBy: string;
      reason: string;
      startDate?: string;
      endDate?: string;
      isPrimary?: boolean;
      requiresTwoFactorActivation?: boolean;
    }
  ): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/${roleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });
    return response.json();
  }

  /**
   * Remover rol de un usuario
   */
  static async removeRoleFromUser(
    userId: string, 
    roleId: string,
    reason: string
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return response.json();
  }

  /**
   * Activar/desactivar rol de usuario
   */
  static async toggleUserRoleStatus(
    userId: string, 
    roleId: string,
    isActive: boolean,
    reason: string
  ): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/${roleId}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive, reason })
    });
    return response.json();
  }

  /**
   * Establecer rol principal de usuario
   */
  static async setPrimaryRole(userId: string, roleId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/${roleId}/set-primary`, {
      method: 'PATCH'
    });
    return response.json();
  }

  /**
   * Asignación masiva de roles a múltiples usuarios
   */
  static async bulkAssignRolesToUsers(data: BulkRoleAssignment): Promise<{
    success: boolean;
    assignmentsCreated: number;
    failed: number;
    details: Array<{ userId: string; success: boolean; error?: string }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/users/roles/bulk-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }

  /**
   * Obtener usuarios con un rol específico
   */
  static async getUsersByRole(roleId: string, params?: {
    activeOnly?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.activeOnly) queryParams.append('activeOnly', 'true');
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/users?${queryParams}`);
    return response.json();
  }

  /**
   * Reasignar usuarios de un rol a otro
   */
  static async reassignUsersFromRoleToRole(
    fromRoleId: string, 
    toRoleId: string,
    userIds?: string[], // Si no se especifica, aplica a todos los usuarios del rol
    metadata?: {
      reassignedBy: string;
      reason: string;
    }
  ): Promise<{
    success: boolean;
    reassignedCount: number;
    failedCount: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles/${fromRoleId}/reassign-to/${toRoleId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds, metadata })
    });
    return response.json();
  }
}

/**
 * ============================================================================
 * ESTADÍSTICAS Y ANÁLISIS
 * ============================================================================
 */

export class RolePermissionStatisticsService {
  /**
   * Obtener estadísticas generales del sistema de roles y permisos
   */
  static async getGlobalStatistics(): Promise<RolePermissionStatistics> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/statistics/global`);
    return response.json();
  }

  /**
   * Estadísticas por módulo
   */
  static async getModuleStatistics(moduleId: string): Promise<{
    moduleId: string;
    moduleName: string;
    totalPermissions: number;
    totalRolesWithAccess: number;
    totalUsersWithAccess: number;
    mostUsedPermissions: Array<{ permission: string; usageCount: number }>;
    leastUsedPermissions: Array<{ permission: string; usageCount: number }>;
    accessTrend: Array<{ date: string; accessCount: number }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/statistics/module/${moduleId}`);
    return response.json();
  }

  /**
   * Estadísticas por rol
   */
  static async getRoleStatistics(roleId: string): Promise<{
    roleId: string;
    roleName: string;
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalPermissions: number;
    permissionsByCategory: Record<string, number>;
    userGrowthTrend: Array<{ date: string; count: number }>;
    topPermissionsUsed: Array<{ permission: string; usageCount: number }>;
    averageSessionDuration?: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/statistics/role/${roleId}`);
    return response.json();
  }

  /**
   * Estadísticas de un usuario específico
   */
  static async getUserRoleStatistics(userId: string): Promise<{
    userId: string;
    totalRoles: number;
    activeRoles: number;
    totalPermissions: number;
    permissionsByModule: Record<string, number>;
    roleHistory: Array<{
      roleId: string;
      roleName: string;
      assignedAt: string;
      deactivatedAt?: string;
      durationDays?: number;
    }>;
    mostUsedModules: Array<{ module: string; accessCount: number }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/statistics/user/${userId}`);
    return response.json();
  }

  /**
   * Análisis de uso de permisos
   */
  static async getPermissionUsageReport(params?: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<PermissionUsageReport> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.groupBy) queryParams.append('groupBy', params.groupBy);

    const response = await fetch(`${API_BASE_URL}/roles-permissions/reports/permission-usage?${queryParams}`);
    return response.json();
  }

  /**
   * Análisis de accesos por período
   */
  static async getAccessAnalytics(params: {
    startDate: string;
    endDate: string;
    roleId?: string;
    moduleId?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<RoleAccessAnalytics> {
    const queryParams = new URLSearchParams(params as any);
    const response = await fetch(`${API_BASE_URL}/roles-permissions/analytics/access?${queryParams}`);
    return response.json();
  }

  /**
   * Matriz de roles y permisos
   */
  static async getRolePermissionMatrix(): Promise<RolePermissionMatrix> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/matrix`);
    return response.json();
  }

  /**
   * Dashboard completo de métricas
   */
  static async getDashboardMetrics(period?: 'today' | 'week' | 'month' | 'year'): Promise<{
    overview: {
      totalRoles: number;
      totalPermissions: number;
      totalActiveUsers: number;
      totalRoleAssignments: number;
    };
    trends: {
      roleGrowth: Array<{ date: string; count: number }>;
      permissionUsage: Array<{ date: string; count: number }>;
      userActivations: Array<{ date: string; count: number }>;
    };
    topRoles: Array<{ roleId: string; roleName: string; userCount: number }>;
    topPermissions: Array<{ permissionId: string; permissionName: string; usageCount: number }>;
    recentActivity: Array<{
      id: string;
      type: 'assignment' | 'removal' | 'modification';
      description: string;
      timestamp: string;
      userId?: string;
      roleId?: string;
    }>;
    alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info';
      message: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/dashboard/metrics?period=${period || 'week'}`);
    return response.json();
  }
}

/**
 * ============================================================================
 * AUDITORÍA Y LOGS
 * ============================================================================
 */

export class RolePermissionAuditService {
  /**
   * Obtener logs de auditoría
   */
  static async getAuditLogs(params?: {
    userId?: string;
    roleId?: string;
    permissionId?: string;
    action?: 'assign' | 'remove' | 'modify' | 'activate' | 'deactivate';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: RolePermissionLog[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.roleId) queryParams.append('roleId', params.roleId);
    if (params?.permissionId) queryParams.append('permissionId', params.permissionId);
    if (params?.action) queryParams.append('action', params.action);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/roles-permissions/audit/logs?${queryParams}`);
    return response.json();
  }

  /**
   * Reporte de auditoría completo
   */
  static async getAuditReport(params: {
    startDate: string;
    endDate: string;
    includeDetails?: boolean;
  }): Promise<RoleAuditReport> {
    const queryParams = new URLSearchParams(params as any);
    const response = await fetch(`${API_BASE_URL}/roles-permissions/audit/report?${queryParams}`);
    return response.json();
  }

  /**
   * Historial de cambios de un rol
   */
  static async getRoleChangeHistory(roleId: string, params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<RolePermissionLog[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/roles/${roleId}/audit/history?${queryParams}`);
    return response.json();
  }

  /**
   * Historial de cambios de un usuario
   */
  static async getUserRoleChangeHistory(userId: string, params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<RolePermissionLog[]> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/audit/history?${queryParams}`);
    return response.json();
  }

  /**
   * Exportar logs de auditoría
   */
  static async exportAuditLogs(params: {
    startDate: string;
    endDate: string;
    format: 'csv' | 'excel' | 'pdf' | 'json';
    filters?: Record<string, any>;
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/audit/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.blob();
  }
}

/**
 * ============================================================================
 * VALIDACIONES Y CONFLICTOS
 * ============================================================================
 */

export class RolePermissionValidationService {
  /**
   * Detectar conflictos de roles
   */
  static async detectRoleConflicts(userId?: string): Promise<RoleConflictReport> {
    const url = userId 
      ? `${API_BASE_URL}/roles-permissions/validation/conflicts/user/${userId}`
      : `${API_BASE_URL}/roles-permissions/validation/conflicts/global`;
    
    const response = await fetch(url);
    return response.json();
  }

  /**
   * Validar asignación de rol a usuario
   */
  static async validateRoleAssignment(userId: string, roleId: string): Promise<{
    isValid: boolean;
    conflicts: Array<{
      type: 'permission_overlap' | 'role_incompatibility' | 'security_risk';
      severity: 'low' | 'medium' | 'high';
      description: string;
      affectedRoles?: string[];
      recommendations?: string[];
    }>;
    warnings: string[];
    recommendations: string[];
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/validation/assign/${userId}/${roleId}`);
    return response.json();
  }

  /**
   * Validar permisos de un rol
   */
  static async validateRolePermissions(roleId: string): Promise<{
    isValid: boolean;
    issues: Array<{
      type: 'missing_dependency' | 'excessive_permission' | 'deprecated_permission';
      severity: 'low' | 'medium' | 'high';
      description: string;
      affectedPermissions: string[];
      suggestions: string[];
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/validation/role/${roleId}/permissions`);
    return response.json();
  }

  /**
   * Analizar segregación de funciones (SoD - Separation of Duties)
   */
  static async analyzeSeparationOfDuties(userId?: string): Promise<{
    hasViolations: boolean;
    violations: Array<{
      userId: string;
      userName: string;
      conflictingRoles: string[];
      description: string;
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      remediation: string;
    }>;
    recommendations: string[];
  }> {
    const url = userId 
      ? `${API_BASE_URL}/roles-permissions/validation/sod/user/${userId}`
      : `${API_BASE_URL}/roles-permissions/validation/sod/global`;
    
    const response = await fetch(url);
    return response.json();
  }
}

/**
 * ============================================================================
 * RECOMENDACIONES Y OPTIMIZACIÓN
 * ============================================================================
 */

export class RolePermissionRecommendationService {
  /**
   * Obtener recomendaciones para un usuario
   */
  static async getUserRecommendations(userId: string): Promise<RoleRecommendation[]> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/recommendations/user/${userId}`);
    return response.json();
  }

  /**
   * Obtener recomendaciones para un rol
   */
  static async getRoleRecommendations(roleId: string): Promise<{
    recommendedPermissions: Array<{
      permissionId: string;
      permissionName: string;
      reason: string;
      confidence: number;
    }>;
    obsoletePermissions: Array<{
      permissionId: string;
      permissionName: string;
      reason: string;
      lastUsed?: string;
    }>;
    similarRoles: Array<{
      roleId: string;
      roleName: string;
      similarity: number;
      commonPermissions: number;
      uniquePermissions: number;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/recommendations/role/${roleId}`);
    return response.json();
  }

  /**
   * Sugerencias de optimización global
   */
  static async getSystemOptimizationSuggestions(): Promise<{
    duplicateRoles: Array<{ roles: string[]; similarity: number }>;
    underutilizedRoles: Array<{ roleId: string; userCount: number; suggestions: string[] }>;
    overPrivilegedUsers: Array<{ userId: string; excessivePermissions: number; recommendations: string[] }>;
    orphanedPermissions: Array<{ permissionId: string; description: string }>;
    consolidationOpportunities: Array<{
      description: string;
      involvedRoles: string[];
      potentialSavings: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/recommendations/system/optimize`);
    return response.json();
  }
}

/**
 * ============================================================================
 * EXPORTACIÓN E IMPORTACIÓN
 * ============================================================================
 */

export class RolePermissionExportService {
  /**
   * Exportar configuración de roles y permisos
   */
  static async exportConfiguration(params: {
    includeRoles?: boolean;
    includePermissions?: boolean;
    includeAssignments?: boolean;
    format: 'json' | 'excel' | 'csv';
    roleIds?: string[];
  }): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/export/configuration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.blob();
  }

  /**
   * Importar configuración de roles y permisos
   */
  static async importConfiguration(file: File, options?: {
    mode: 'merge' | 'replace' | 'append';
    validateOnly?: boolean;
  }): Promise<{
    success: boolean;
    imported: {
      roles: number;
      permissions: number;
      assignments: number;
    };
    errors: Array<{ line: number; error: string }>;
    warnings: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const response = await fetch(`${API_BASE_URL}/roles-permissions/import/configuration`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  /**
   * Exportar reporte de roles de un usuario
   */
  static async exportUserRoles(userId: string, format: 'pdf' | 'excel'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/export?format=${format}`);
    return response.blob();
  }

  /**
   * Exportar matriz de roles y permisos
   */
  static async exportRolePermissionMatrix(format: 'excel' | 'csv' | 'pdf'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/roles-permissions/matrix/export?format=${format}`);
    return response.blob();
  }
}

/**
 * ============================================================================
 * BÚSQUEDA Y FILTRADO AVANZADO
 * ============================================================================
 */

export class RolePermissionSearchService {
  /**
   * Búsqueda global en roles y permisos
   */
  static async globalSearch(query: string, params?: {
    searchIn?: ('roles' | 'permissions' | 'users')[];
    limit?: number;
  }): Promise<{
    roles: Array<{ id: string; name: string; description: string; score: number }>;
    permissions: Array<{ id: string; name: string; module: string; score: number }>;
    users: Array<{ id: string; name: string; email: string; roles: string[]; score: number }>;
  }> {
    const queryParams = new URLSearchParams({ query });
    if (params?.searchIn) {
      params.searchIn.forEach(type => queryParams.append('searchIn', type));
    }
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await fetch(`${API_BASE_URL}/roles-permissions/search?${queryParams}`);
    return response.json();
  }

  /**
   * Filtrado avanzado de usuarios por criterios de rol
   */
  static async advancedUserFilter(criteria: {
    hasRoles?: string[];
    hasAllRoles?: string[];
    hasPermissions?: string[];
    hasAllPermissions?: string[];
    excludeRoles?: string[];
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/users/filter/advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(criteria)
    });
    return response.json();
  }
}

/**
 * ============================================================================
 * EXPORT CONSOLIDADO
 * ============================================================================
 */

export const RolePermissionAPI = {
  permissions: PermissionsService,
  roles: RolesService,
  rolePermissionAssignment: RolePermissionAssignmentService,
  userRoleAssignment: UserRoleAssignmentService,
  statistics: RolePermissionStatisticsService,
  audit: RolePermissionAuditService,
  validation: RolePermissionValidationService,
  recommendations: RolePermissionRecommendationService,
  export: RolePermissionExportService,
  search: RolePermissionSearchService,
};

export default RolePermissionAPI;
