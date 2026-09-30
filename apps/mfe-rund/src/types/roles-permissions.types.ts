/**
 * Tipos TypeScript para Sistema de Roles y Permisos - SUPER APP ESAP
 * 
 * @version 2.0.0
 * @lastUpdated 2025-11-28
 */

/**
 * ============================================================================
 * PERMISOS
 * ============================================================================
 */

export interface RolePermission {
  id: string;
  code: string; // Ej: "users.create", "students.view"
  name: string;
  description: string;
  module: string; // Módulo al que pertenece
  category: PermissionCategory;
  level: PermissionLevel;
  isActive: boolean;
  isCustom: boolean; // true si es creado por admin, false si es del sistema
  requiresTwoFactor?: boolean;
  dependencies?: string[]; // IDs de permisos que deben existir
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: {
    icon?: string;
    color?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    usage?: number;
    lastUsed?: string;
  };
}

export type PermissionCategory = 
  | 'users_management'          // Gestión de Usuarios
  | 'students_management'       // Gestión de Estudiantes
  | 'graduates_management'      // Gestión de Graduados
  | 'teachers_management'       // Gestión de Docentes
  | 'certificates'              // Certificados
  | 'enrollment'                // Matrículas
  | 'community'                 // Comunidad
  | 'job_board'                 // Bolsa de Trabajo
  | 'documents'                 // Carpeta Digital
  | 'reports'                   // Reportes
  | 'audit'                     // Auditoría
  | 'administration'            // Administración General
  | 'control_interno'           // Control Interno
  | 'gestion_profesoral'        // Gestión Profesoral
  | 'certificados_laborales'    // Certificados Laborales
  | 'pta'                       // Plan de Trabajo Académico
  | 'academic'                  // Académico General
  | 'financial'                 // Financiero
  | 'custom';                   // Personalizado

export type PermissionLevel = 
  | 'create'   // Crear
  | 'read'     // Leer/Ver
  | 'update'   // Actualizar
  | 'delete'   // Eliminar
  | 'execute'  // Ejecutar acciones
  | 'approve'  // Aprobar/Autorizar
  | 'export'   // Exportar datos
  | 'import';  // Importar datos

/**
 * ============================================================================
 * ROLES
 * ============================================================================
 */

export interface Role {
  id: string;
  code: string; // Ej: "ROLE_ADMIN", "ROLE_STUDENT"
  name: string;
  description: string;
  type: RoleType;
  category?: string;
  isActive: boolean;
  isSystem: boolean; // true para roles del sistema, false para personalizados
  icon?: string;
  color?: string;
  bgColor?: string;
  requiresTwoFactor?: boolean;
  permissions?: string[]; // IDs de permisos asignados
  permissionCount?: number;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: {
    priority?: number;
    canBeDeleted?: boolean;
    canBeModified?: boolean;
    inheritedFrom?: string; // ID del rol padre si existe herencia
    tags?: string[];
  };
}

export type RoleType = 
  | 'Aspirante'
  | 'Estudiante'
  | 'Docente'
  | 'Administrativo'
  | 'Graduado'
  | 'Super Admin'
  | 'Custom';

/**
 * ============================================================================
 * ASIGNACIONES
 * ============================================================================
 */

export interface RolePermissionAssignment {
  id: string;
  roleId: string;
  permissionId: string;
  assignedAt: string;
  assignedBy: string;
  assignedByName?: string;
  expiresAt?: string;
  isActive: boolean;
  reason?: string;
  metadata?: {
    source?: 'manual' | 'template' | 'import' | 'system';
    canBeRevoked?: boolean;
  };
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName?: string;
  roleType?: RoleType;
  isActive: boolean;
  isPrimary: boolean;
  startDate: string;
  endDate?: string;
  assignedAt: string;
  assignedBy: string;
  assignedByName?: string;
  deactivatedAt?: string;
  deactivatedBy?: string;
  deactivatedByName?: string;
  reason: string;
  deactivationReason?: string;
  requiresTwoFactorActivation?: boolean;
  twoFactorActivatedAt?: string;
  metadata?: {
    source?: 'manual' | 'automatic' | 'import' | 'system';
    externalId?: string;
    context?: Record<string, any>;
  };
}

/**
 * ============================================================================
 * LOGS Y AUDITORÍA
 * ============================================================================
 */

export interface RolePermissionLog {
  id: string;
  logType: 'role' | 'permission' | 'assignment' | 'validation';
  action: LogAction;
  entityType: 'role' | 'permission' | 'user' | 'system';
  entityId: string;
  entityName?: string;
  performedBy: string;
  performedByName?: string;
  performedAt: string;
  details: {
    description: string;
    before?: any;
    after?: any;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    reason?: string;
    metadata?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  tags?: string[];
}

export type LogAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'activate'
  | 'deactivate'
  | 'approve'
  | 'reject'
  | 'export'
  | 'import'
  | 'duplicate'
  | 'validate'
  | 'access'
  | 'error';

/**
 * ============================================================================
 * ESTADÍSTICAS
 * ============================================================================
 */

export interface RolePermissionStatistics {
  overview: {
    totalRoles: number;
    totalActiveRoles: number;
    totalCustomRoles: number;
    totalSystemRoles: number;
    totalPermissions: number;
    totalActivePermissions: number;
    totalCustomPermissions: number;
    totalRoleAssignments: number;
    totalActiveAssignments: number;
    totalUsers: number;
    totalUsersWithMultipleRoles: number;
  };
  
  roleDistribution: Array<{
    roleId: string;
    roleName: string;
    roleType: RoleType;
    userCount: number;
    activeUserCount: number;
    percentage: number;
  }>;
  
  permissionDistribution: Array<{
    category: PermissionCategory;
    totalPermissions: number;
    assignedCount: number;
    usagePercentage: number;
  }>;
  
  moduleUsage: Array<{
    moduleId: string;
    moduleName: string;
    permissionCount: number;
    roleCount: number;
    accessCount: number;
    lastAccessed?: string;
  }>;
  
  trends: {
    roleGrowth: Array<{ date: string; count: number; change: number }>;
    assignmentGrowth: Array<{ date: string; count: number; change: number }>;
    permissionUsage: Array<{ date: string; count: number; change: number }>;
  };
  
  topMetrics: {
    mostUsedRoles: Array<{ roleId: string; roleName: string; userCount: number }>;
    mostUsedPermissions: Array<{ permissionId: string; permissionName: string; usageCount: number }>;
    mostActiveModules: Array<{ moduleId: string; moduleName: string; accessCount: number }>;
  };
  
  userActivity: {
    averageRolesPerUser: number;
    averagePermissionsPerUser: number;
    usersWithoutRoles: number;
    usersWithExpiredRoles: number;
  };
  
  securityMetrics: {
    rolesRequiring2FA: number;
    permissionsRequiring2FA: number;
    usersWithHighRiskPermissions: number;
    potentialConflicts: number;
  };
  
  lastUpdated: string;
}

export interface RolePermissionMatrix {
  roles: Array<{
    id: string;
    name: string;
    type: RoleType;
  }>;
  
  permissions: Array<{
    id: string;
    name: string;
    module: string;
    category: PermissionCategory;
  }>;
  
  matrix: Record<string, Record<string, boolean>>; // roleId -> permissionId -> hasPermission
  
  summary: {
    totalCombinations: number;
    activeAssignments: number;
    coverage: number; // Porcentaje de asignaciones activas
  };
}

export interface PermissionUsageReport {
  reportId: string;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  overallUsage: {
    totalAccesses: number;
    uniqueUsers: number;
    uniquePermissions: number;
    averageAccessesPerDay: number;
  };
  
  permissionUsage: Array<{
    permissionId: string;
    permissionName: string;
    module: string;
    accessCount: number;
    uniqueUsers: number;
    lastAccessed: string;
    trend: 'up' | 'down' | 'stable';
    changePercentage?: number;
  }>;
  
  unusedPermissions: Array<{
    permissionId: string;
    permissionName: string;
    assignedToRoles: number;
    lastUsed?: string;
    daysUnused: number;
  }>;
  
  topUsers: Array<{
    userId: string;
    userName: string;
    accessCount: number;
    permissionsUsed: number;
    mostUsedPermissions: Array<{
      permissionId: string;
      permissionName: string;
      count: number;
    }>;
  }>;
}

export interface RoleAccessAnalytics {
  analyticsId: string;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
    groupBy: 'hour' | 'day' | 'week' | 'month';
  };
  
  accessTimeline: Array<{
    timestamp: string;
    totalAccesses: number;
    uniqueUsers: number;
    breakdown: Record<string, number>; // roleId -> accessCount
  }>;
  
  roleActivity: Array<{
    roleId: string;
    roleName: string;
    totalAccesses: number;
    uniqueUsers: number;
    peakHours: Array<{ hour: number; count: number }>;
    averageDuration?: number; // en segundos
  }>;
  
  moduleActivity: Array<{
    moduleId: string;
    moduleName: string;
    accessCount: number;
    mostUsedByRole: Record<string, number>;
  }>;
  
  geographicDistribution?: Array<{
    region: string;
    city?: string;
    accessCount: number;
    uniqueUsers: number;
  }>;
  
  deviceBreakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
}

/**
 * ============================================================================
 * REPORTES Y ANÁLISIS
 * ============================================================================
 */

export interface RoleConflictReport {
  reportId: string;
  generatedAt: string;
  
  conflicts: Array<{
    conflictId: string;
    type: 'permission_overlap' | 'role_incompatibility' | 'security_risk' | 'sod_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedUsers: Array<{
      userId: string;
      userName: string;
      email: string;
      roles: string[];
    }>;
    affectedRoles: string[];
    affectedPermissions: string[];
    recommendations: string[];
    autoRemediationAvailable: boolean;
  }>;
  
  summary: {
    totalConflicts: number;
    criticalConflicts: number;
    highSeverityConflicts: number;
    affectedUsersCount: number;
  };
}

export interface RoleAuditReport {
  reportId: string;
  generatedAt: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  summary: {
    totalEvents: number;
    roleChanges: number;
    permissionChanges: number;
    assignmentChanges: number;
    uniqueUsers: number;
  };
  
  events: RolePermissionLog[];
  
  changesByType: Record<LogAction, number>;
  
  changesByUser: Array<{
    userId: string;
    userName: string;
    totalChanges: number;
    breakdown: Record<LogAction, number>;
  }>;
  
  changesByRole: Array<{
    roleId: string;
    roleName: string;
    totalChanges: number;
    assignmentsAdded: number;
    assignmentsRemoved: number;
    permissionsModified: number;
  }>;
  
  criticalChanges: RolePermissionLog[];
  
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: string;
    relatedEvents: string[];
  }>;
}

export interface RoleRecommendation {
  recommendationId: string;
  type: 'add_role' | 'remove_role' | 'add_permission' | 'remove_permission' | 'consolidate';
  priority: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  title: string;
  description: string;
  rationale: string;
  
  target: {
    userId?: string;
    roleId?: string;
    permissionId?: string;
  };
  
  suggestedAction: {
    action: string;
    parameters: Record<string, any>;
  };
  
  impact: {
    affectedUsers?: number;
    affectedRoles?: number;
    estimatedBenefit: string;
    potentialRisks: string[];
  };
  
  basedOn: {
    similarUsers?: Array<{ userId: string; similarity: number }>;
    usagePatterns?: any;
    historicalData?: any;
  };
  
  createdAt: string;
  expiresAt?: string;
}

/**
 * ============================================================================
 * PLANTILLAS Y CONFIGURACIÓN
 * ============================================================================
 */

export interface RoleTemplate {
  templateId: string;
  name: string;
  description: string;
  category: string;
  targetRoleType: RoleType;
  icon?: string;
  color?: string;
  
  defaultPermissions: string[];
  
  optionalPermissions?: Array<{
    permissionId: string;
    description: string;
    recommended: boolean;
  }>;
  
  configuration: {
    requiresTwoFactor?: boolean;
    isActive?: boolean;
    metadata?: Record<string, any>;
  };
  
  tags: string[];
  popularity: number; // Número de veces usado
  rating?: number; // 0-5
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface PermissionDependency {
  permissionId: string;
  dependsOn: string[];
  dependencyType: 'required' | 'recommended' | 'conditional';
  description: string;
  condition?: string;
}

/**
 * ============================================================================
 * OPERACIONES MASIVAS
 * ============================================================================
 */

export interface BulkRoleAssignment {
  userIds: string[];
  roleIds: string[];
  startDate?: string;
  endDate?: string;
  reason: string;
  assignedBy: string;
  setPrimaryRole?: boolean;
  primaryRoleId?: string;
  sendNotification?: boolean;
  metadata?: Record<string, any>;
}

export interface BulkPermissionUpdate {
  roleId: string;
  permissionsToAdd: string[];
  permissionsToRemove: string[];
  reason: string;
  updatedBy: string;
}

/**
 * ============================================================================
 * EXPORTACIÓN E IMPORTACIÓN
 * ============================================================================
 */

export interface RolePermissionExport {
  exportId: string;
  exportedAt: string;
  exportedBy: string;
  format: 'json' | 'excel' | 'csv' | 'pdf';
  
  data: {
    roles?: Role[];
    permissions?: RolePermission[];
    assignments?: RolePermissionAssignment[];
    userAssignments?: UserRoleAssignment[];
  };
  
  metadata: {
    version: string;
    sourceSystem: string;
    totalRecords: number;
  };
}

export interface RolePermissionImport {
  importId: string;
  importedAt: string;
  importedBy: string;
  sourceFile: string;
  
  mode: 'merge' | 'replace' | 'append';
  
  results: {
    roles: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    };
    permissions: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    };
    assignments: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
      failed: number;
    };
  };
  
  errors: Array<{
    line: number;
    field: string;
    value: any;
    error: string;
  }>;
  
  warnings: string[];
}

/**
 * ============================================================================
 * VALIDACIÓN Y SEGURIDAD
 * ============================================================================
 */

export interface RolePermissionValidation {
  isValid: boolean;
  
  errors: Array<{
    code: string;
    message: string;
    field?: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  
  warnings: string[];
  
  suggestions: Array<{
    type: string;
    description: string;
    action?: string;
  }>;
}

export interface SecurityPolicy {
  policyId: string;
  name: string;
  description: string;
  isActive: boolean;
  
  rules: Array<{
    ruleId: string;
    type: 'conflict' | 'restriction' | 'requirement' | 'separation_of_duties';
    condition: string;
    action: 'allow' | 'deny' | 'warn' | 'require_approval';
    priority: number;
    metadata?: Record<string, any>;
  }>;
  
  appliesTo: {
    roles?: string[];
    permissions?: string[];
    users?: string[];
    userGroups?: string[];
  };
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * ============================================================================
 * FILTROS Y BÚSQUEDA
 * ============================================================================
 */

export interface RolePermissionFilter {
  roles?: {
    types?: RoleType[];
    isActive?: boolean;
    isSystem?: boolean;
    hasPermissions?: string[];
    userCountMin?: number;
    userCountMax?: number;
    createdAfter?: string;
    createdBefore?: string;
  };
  
  permissions?: {
    categories?: PermissionCategory[];
    levels?: PermissionLevel[];
    modules?: string[];
    isActive?: boolean;
    isCustom?: boolean;
    requiresTwoFactor?: boolean;
  };
  
  users?: {
    hasRoles?: string[];
    hasAllRoles?: string[];
    hasPermissions?: string[];
    hasAllPermissions?: string[];
    roleCountMin?: number;
    roleCountMax?: number;
    isActive?: boolean;
  };
  
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * ============================================================================
 * NOTIFICACIONES Y ALERTAS
 * ============================================================================
 */

export interface RolePermissionAlert {
  alertId: string;
  type: 'role_assignment' | 'permission_change' | 'conflict_detected' | 'expiration_warning' | 'security_issue';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  
  affectedEntities: {
    users?: string[];
    roles?: string[];
    permissions?: string[];
  };
  
  actionRequired: boolean;
  actionUrl?: string;
  actionLabel?: string;
  
  createdAt: string;
  expiresAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  
  metadata?: Record<string, any>;
}

/**
 * ============================================================================
 * RESPUESTAS DE API
 * ============================================================================
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}
