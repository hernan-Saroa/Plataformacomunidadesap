/**
 * Tipos TypeScript Compartidos
 * 
 * Estos tipos deben coincidir con los modelos del backend
 * y sirven como contrato entre frontend y backend
 */

// ============================================================================
// RE-EXPORTS DE MÓDULOS ESPECÍFICOS
// ============================================================================

// Control Interno
export * from './control-interno';

// Gestión Profesoral
export * from './gestion-profesoral';

// Certificados Laborales
export * from './certificados';

// Estructura Organizacional
export * from './estructura-organizacional.types';

// ============================================================================
// TIPOS DE RESPUESTA API
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  timestamp: string;
}

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface RefreshTokenResponse {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  roles: Role[];
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
}

export interface Role {
  category: string;
  code: string;
  color: string;
  created_at: string;
  created_by: string;
  description: string;
  icon: string;
  id: string;
  is_active: boolean;
  name: string;
  permissions: string[];
  requires_2fa: boolean;
  type: string;
  updated_at: string;
  updated_by: string;
}

// ============================================================================
// USUARIOS
// ============================================================================

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PP' | 'NIT';
  documentNumber: string;
  phone?: string;
  avatar?: string;
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  roles: Role[];
  permissions: string[];
  lastLogin?: string;
  loginCount: number;
  
  // ESTRUCTURA ORGANIZACIONAL - Sistema de asignaciones múltiples
  asignacionesSedes: AsignacionSede[];         // Array de asignaciones a diferentes sedes
  
  // SEDE PRINCIPAL - Sede específica asignada
  sedePrincipalId?: string;                    // ID de la sede principal del usuario
  sedePrincipal?: {                            // Información de la sede principal (populate)
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'nacional' | 'territorial' | 'regional' | 'sede';
    ciudad?: string;
    departamento?: string;
  };
  
  // TERRITORIAL - Dirección territorial asignada
  territorialId?: string;                      // ID de la dirección territorial
  territorial?: {                              // Información de la dirección territorial (populate)
    id: string;
    codigo: string;
    nombre: string;
    departamento?: string;
  };
  
  ambitoAccesoMaximo?: 'nacional' | 'territorial' | 'regional' | 'local';  // Ámbito más amplio que tiene
  
  // PROGRAMAS ACADÉMICOS - Vinculación académica del usuario
  asignacionesProgramas?: AsignacionPrograma[];  // Array de programas académicos vinculados
  programaPrincipalId?: string;                  // ID del programa principal (si aplica)
  programaPrincipal?: {                          // Información del programa principal (populate)
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'Pregrado' | 'Especialización' | 'Maestría';
    modalidad: 'Presencial' | 'Virtual' | 'Distancia';
  };
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

/**
 * Asignación de un usuario a una sede específica
 */
export interface AsignacionSede {
  id: string;
  usuarioId: string;
  unidadId: string;                            // ID de la sede
  unidad?: {                                   // Info de la unidad (populate)
    id: string;
    codigo: string;
    nombre: string;
    nombreCorto?: string;
    nivel: 'nacional' | 'territorial' | 'regional' | 'sede';
    ciudad?: string;
    departamento?: string;
  };
  
  // Rol específico en esta sede (puede ser diferente en cada sede)
  rolId?: string;
  rolNombre?: string;
  
  // Ámbito de acceso en esta sede
  ambitoAcceso: 'nacional' | 'territorial' | 'regional' | 'local';
  
  // Configuración
  esPrincipal: boolean;                        // Si esta es la sede principal del usuario
  estado: 'activa' | 'inactiva';
  
  // Fechas de vigencia
  fechaInicio: string;
  fechaFin?: string;
  
  // Metadata
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Asignación de un usuario a un programa académico específico
 */
export interface AsignacionPrograma {
  id: string;
  usuarioId: string;
  programaId: string;                          // ID del programa académico
  programa?: {                                 // Info del programa (populate)
    id: string;
    codigo: string;
    nombre: string;
    nivel: 'Pregrado' | 'Especialización' | 'Maestría';
    modalidad: 'Presencial' | 'Virtual' | 'Distancia';
  };
  
  // Rol específico en este programa (puede ser diferente en cada programa)
  rolId?: string;
  rolNombre?: string;
  
  // Ámbito de acceso en este programa
  ambitoAcceso: 'nacional' | 'territorial' | 'regional' | 'local';
  
  // Configuración
  esPrincipal: boolean;                        // Si este es el programa principal del usuario
  estado: 'activa' | 'inactiva';
  
  // Fechas de vigencia
  fechaInicio: string;
  fechaFin?: string;
  
  // Metadata
  observaciones?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PP' | 'NIT';
  documentNumber: string;
  phone?: string;
  roleIds: string[];
  status?: 'active' | 'inactive' | 'pending';
  
  // ESTRUCTURA ORGANIZACIONAL - Asignaciones múltiples
  asignacionesSedes: CreateAsignacionSedeDTO[];  // Array de sedes a las que pertenece
  sedePrincipalId?: string;                      // ID de la sede principal (debe estar en asignacionesSedes)
  
  // PROGRAMAS ACADÉMICOS - Vinculación académica del usuario
  asignacionesProgramas?: CreateAsignacionProgramaDTO[];  // Array de programas académicos vinculados
  programaPrincipalId?: string;                  // ID del programa principal (si aplica)
}

/**
 * DTO para crear asignación de sede
 */
export interface CreateAsignacionSedeDTO {
  unidadId: string;
  rolId?: string;
  ambitoAcceso: 'nacional' | 'territorial' | 'regional' | 'local';
  esPrincipal?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  observaciones?: string;
}

/**
 * DTO para crear asignación de programa académico
 */
export interface CreateAsignacionProgramaDTO {
  programaId: string;
  rolId?: string;
  ambitoAcceso: 'nacional' | 'territorial' | 'regional' | 'local';
  esPrincipal?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  observaciones?: string;
}

export interface UpdateUserDTO {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleIds?: string[];
  status?: 'active' | 'inactive' | 'pending' | 'blocked';
  
  // ESTRUCTURA ORGANIZACIONAL - Actualizar asignaciones
  asignacionesSedes?: CreateAsignacionSedeDTO[];
  sedePrincipalId?: string;
  
  // PROGRAMAS ACADÉMICOS - Vinculación académica del usuario
  asignacionesProgramas?: CreateAsignacionProgramaDTO[];
  programaPrincipalId?: string;
}

export interface UsersStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  blocked: number;
  newThisMonth: number;
  newThisWeek: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  avgLoginCount: number;
  topActiveUsers: User[];
}

// ============================================================================
// PERSONAS (Usuario Persona)
// ============================================================================

export interface Person {
  id: string;
  userId?: string; // Relación opcional con User
  username: string;
  email: string;
  fullName: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PP';
  documentNumber: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decir';
  nationality?: string;
  
  // Info académica (estudiantes)
  program?: string;
  faculty?: string;
  studentCode?: string;
  semester?: string;
  enrollmentDate?: string;
  
  // Info laboral (docentes/administrativos)
  department?: string;
  position?: string;
  
  // Métricas
  status: 'active' | 'inactive' | 'pending' | 'blocked';
  role: string;
  lastLogin: string;
  loginCount: number;
  activityScore: number;
  
  // Documentos
  documentsUploaded: number;
  documentsVerified: number;
  documentsPending: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface PersonDocument {
  id: string;
  personId: string;
  type: 'cedula' | 'diploma' | 'certificado' | 'otro';
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: 'pending' | 'verified' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  expiresAt?: string;
}

export interface PersonTimeline {
  id: string;
  personId: string;
  eventType: 'created' | 'updated' | 'login' | 'document_uploaded' | 'document_verified' | 'role_changed' | 'status_changed';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  performedBy?: string;
  performedByName?: string;
  timestamp: string;
}

export interface CreatePersonDTO {
  username: string;
  email: string;
  fullName: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PP';
  documentNumber: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  gender?: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decir';
  nationality?: string;
  role: string;
  program?: string;
  faculty?: string;
  department?: string;
  position?: string;
}

// ============================================================================
// ROLES Y PERMISOS
// ============================================================================

export interface Role {
  id: string;
  name: string;
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

export interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: PermissionCategory;
  isSystem: boolean;
  isCritical: boolean;
  createdAt: string;
}

export type PermissionCategory = 
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

export interface CreateRoleDTO {
  name: string;
  displayName: string;
  description?: string;
  type: 'custom';
  permissionIds: string[];
}

export interface UpdateRoleDTO {
  displayName?: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

export interface RoleComparison {
  roles: Role[];
  allPermissions: Permission[];
  matrix: Record<string, Record<string, boolean>>; // roleId -> permissionId -> hasPermission
}

// ============================================================================
// AUDITORÍA
// ============================================================================

export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  action: AuditAction;
  performedBy: string;
  performedByName: string;
  performedByRole?: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: AuditChange[];
  metadata?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export type AuditEventType = 
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'permission_granted'
  | 'permission_revoked'
  | 'document_uploaded'
  | 'document_verified'
  | 'document_rejected'
  | 'settings_changed'
  | 'export_data'
  | 'import_data'
  | 'aspirant_created'
  | 'aspirant_updated'
  | 'aspirant_approved'
  | 'aspirant_rejected'
  | 'application_submitted'
  | 'application_reviewed'
  | 'title_verified'
  | 'title_rejected'
  | 'certificate_generated';

export type AuditEntityType = 'user' | 'role' | 'permission' | 'person' | 'document' | 'setting' | 'report' | 'aspirant' | 'application' | 'title' | 'certificate';

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'verify' | 'approve' | 'reject';

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface AuditStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByAction: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topUsers: Array<{ userId: string; userName: string; count: number }>;
  recentActivity: AuditLog[];
  timelineData: Array<{ date: string; count: number }>;
}

// ============================================================================
// DASHBOARD Y REPORTES
// ============================================================================

export interface DashboardStats {
  users: UsersStats;
  roles: {
    total: number;
    system: number;
    custom: number;
    mostUsed: Array<{ role: string; count: number }>;
  };
  permissions: {
    total: number;
    byCategory: Record<string, number>;
  };
  audit: {
    totalEvents: number;
    criticalEvents: number;
    recentActivity: AuditLog[];
  };
  persons: {
    total: number;
    active: number;
    pendingDocuments: number;
  };
}

export interface KPIData {
  id: string;
  name: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
  format: 'number' | 'percentage' | 'currency' | 'text';
}

export interface ChartData {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  title: string;
  data: any[];
  xKey?: string;
  yKeys?: string[];
  config?: Record<string, any>;
}

export interface Report {
  id: string;
  name: string;
  type: 'users' | 'roles' | 'audit' | 'activity' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  fileSize?: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface GenerateReportDTO {
  name: string;
  type: 'users' | 'roles' | 'audit' | 'activity' | 'custom';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// NOTIFICACIONES
// ============================================================================

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

// ============================================================================
// FILTROS Y BÚSQUEDA
// ============================================================================

export interface FilterParams {
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

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

// ============================================================================
// SOLICITUDES DE REVISIÓN (Graduados no encontrados)
// ============================================================================

export interface ReviewRequest {
  id: string;
  requestNumber: string; // Ej: REV-2024-001
  
  // Datos del graduado buscado
  graduateDocumentNumber: string;
  graduateDocumentIssueDate: string;
  graduationDate?: string;
  graduateLastName?: string;
  graduateEmail?: string;
  graduatePhone?: string;
  
  // Datos del solicitante
  requester: {
    name: string;
    email: string;
    type: 'empresa' | 'graduado';
    companyName?: string;
    contactPerson?: string;
    companyNit?: string;
  };
  
  // Estado de la solicitud
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired' | 'duplicate';
  approvalStatus?: 'PENDING_APPROVAL' | 'PENDING_HEAD_APPROVAL' | 'APPROVED_FINAL' | 'REJECTED_FINAL' | 'OBSERVATION' | 'HEAD_OBSERVATION' | string | null;
  reviewRecommendation?: 'APPROVED' | 'REJECTED' | 'OBSERVATION' | string | null;
  reviewRecommendationReason?: string | null;
  reviewPayload?: Record<string, unknown> | null;
  reviewSubmittedAt?: string | null;
  reviewSubmittedBy?: string | null;
  reviewSubmittedByName?: string | null;
  approverDecision?: 'APPROVED' | 'REJECTED' | 'OBSERVATION' | string | null;
  approverNotes?: string | null;
  approvedAt?: string | null;
  approverName?: string | null;
  headDecision?: 'APPROVED' | 'REJECTED' | 'OBSERVATION' | string | null;
  headNotes?: string | null;
  headReviewedAt?: string | null;
  headReviewerName?: string | null;
  reviewTimeline?: Array<{
    type: string;
    label: string;
    notes?: string;
    actorId?: string;
    actorName?: string;
    actorEmail?: string;
    createdAt: string;
  }>;
  reviewFiles?: Array<{
    id: string;
    requestId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy?: string;
    uploadedAt: string;
    url?: string;
  }>;
  requesterSupportFile?: {
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedAt: string;
    url?: string;
  } | null;
  
  // Fechas
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  
  // Revisión por el backoffice
  reviewedBy?: string; // ID del usuario que revisó
  reviewerName?: string;
  reviewNotes?: string;
  adminNotes?: string;
  
  // Resolución
  resolution?: 'graduate_found' | 'graduate_not_found' | 'invalid_data' | 'duplicate_request' | 'expired' | 'pending_approval';
  resolutionDetails?: string;
  
  // Si se encuentra el graduado, se puede generar el certificado
  certificateGenerated?: boolean;
  certificateId?: string;
}

export interface CreateReviewRequestDTO {
  graduateDocumentNumber: string;
  graduateDocumentIssueDate: string;
  requesterName: string;
  requesterEmail: string;
  requesterType: 'empresa' | 'graduado';
}

export interface ReviewRequestStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  expired?: number;
  avgResolutionTime: number; // en horas
}

// ============================================================================
// UTILIDADES
// ============================================================================

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: any;
}

export interface ActionMenuItem {
  id: string;
  label: string;
  icon: any;
  action: () => void;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
  shortcut?: string;
}

// ============================================================================
// ASPIRANTES
// ============================================================================

export interface Aspirant {
  id: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PP';
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: 'Masculino' | 'Femenino' | 'Otro';
  address: string;
  city: string;
  country: string;
  
  // Programa al que aplica
  programId: string;
  programName: string;
  academicPeriod: string;
  applicationType: 'Pregrado' | 'Posgrado' | 'Especialización' | 'Maestría' | 'Doctorado';
  
  // Estado de la aplicación
  applicationStatus: 'pending' | 'under_review' | 'approved' | 'rejected' | 'enrolled';
  applicationDate: string;
  reviewDate?: string;
  reviewedBy?: string;
  reviewerName?: string;
  reviewNotes?: string;
  
  // Información académica previa
  previousEducation: {
    level: 'Bachillerato' | 'Técnico' | 'Tecnólogo' | 'Pregrado' | 'Posgrado';
    institution: string;
    graduationYear: number;
    diploma?: string; // URL del documento
  };
  
  // Documentos requeridos
  documents: {
    cedula: { uploaded: boolean; url?: string; verified: boolean };
    diploma: { uploaded: boolean; url?: string; verified: boolean };
    notas: { uploaded: boolean; url?: string; verified: boolean };
    foto: { uploaded: boolean; url?: string; verified: boolean };
  };
  
  // Resultados de exámenes
  examResults?: {
    saber11?: number;
    saberPro?: number;
    icfes?: number;
    entrevista?: number;
  };
  
  // Puntaje final
  finalScore?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface AspirantStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  enrolled: number;
  byProgram: Record<string, number>;
  byApplicationType: Record<string, number>;
  byStatus: Record<string, number>;
  averageScore: number;
  documentCompletionRate: number;
  recentApplications: Aspirant[];
}

export interface CreateAspirantDTO {
  documentType: 'CC' | 'TI' | 'CE' | 'PP';
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: 'Masculino' | 'Femenino' | 'Otro';
  address: string;
  city: string;
  country: string;
  programId: string;
  academicPeriod: string;
  applicationType: 'Pregrado' | 'Posgrado' | 'Especialización' | 'Maestría' | 'Doctorado';
  previousEducation: {
    level: string;
    institution: string;
    graduationYear: number;
  };
}

export interface UpdateAspirantDTO {
  applicationStatus?: 'pending' | 'under_review' | 'approved' | 'rejected' | 'enrolled';
  reviewNotes?: string;
  examResults?: {
    saber11?: number;
    saberPro?: number;
    icfes?: number;
    entrevista?: number;
  };
  finalScore?: number;
}

// ============================================================================
// VERIFICACIÓN DE TÍTULOS
// ============================================================================

export interface GraduateTitle {
  id: string;
  documentType: 'CC' | 'TI' | 'CE' | 'PP';
  documentNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  
  // Información del título
  titleType: 'Técnico' | 'Tecnólogo' | 'Pregrado' | 'Especialización' | 'Maestría' | 'Doctorado';
  programName: string;
  faculty: string;
  diplomaNumber: string;
  actaNumber: string;
  graduationDate: string;
  
  // Estado de verificación
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verificationDate?: string;
  verifiedBy?: string;
  verifierName?: string;
  verificationNotes?: string;
  
  // Documentos
  diplomaUrl?: string;
  actaUrl?: string;
  certificateUrl?: string;
  
  // Datos adicionales
  honors?: 'Cum Laude' | 'Magna Cum Laude' | 'Summa Cum Laude';
  gpa?: number;
  isPublic: boolean; // Si la verificación es pública
  verificationCode: string; // Código único para verificación externa
  
  createdAt: string;
  updatedAt: string;
}

export interface TitleVerificationStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
  expired: number;
  byTitleType: Record<string, number>;
  byFaculty: Record<string, number>;
  byStatus: Record<string, number>;
  verificationRate: number;
  averageVerificationTime: number; // en horas
  recentVerifications: GraduateTitle[];
}

export interface CreateTitleDTO {
  documentType: 'CC' | 'TI' | 'CE' | 'PP';
  documentNumber: string;
  fullName: string;
  email?: string;
  phone?: string;
  titleType: string;
  programName: string;
  faculty: string;
  diplomaNumber: string;
  actaNumber: string;
  graduationDate: string;
  gpa?: number;
  honors?: string;
}

export interface UpdateTitleDTO {
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'expired';
  verificationNotes?: string;
  diplomaUrl?: string;
  actaUrl?: string;
  isPublic?: boolean;
}

export interface PublicTitleVerificationQuery {
  documentNumber: string;
  verificationCode?: string;
  diplomaNumber?: string;
}

export interface PublicTitleVerificationResult {
  found: boolean;
  title?: {
    fullName: string;
    titleType: string;
    programName: string;
    faculty: string;
    graduationDate: string;
    diplomaNumber: string;
    verificationStatus: string;
    verificationDate?: string;
    honors?: string;
  };
  verificationCode: string;
  timestamp: string;
}

// ============================================================================
// CERTIFICADOS DE VERIFICACIÓN (Sistema de Trazabilidad con QR)
// ============================================================================

export interface VerificationCertificateRequest {
  graduateDocumentNumber: string; // Cédula del graduado
  graduateDocumentIssueDate: string; // Fecha de expedición de la cédula
  requesterName: string; // Nombre de la empresa (si es empresa) o del graduado (si es graduado)
  requesterEmail: string; // Email donde se enviará el certificado
  requesterType: 'empresa' | 'graduado';
  notes?: string;
}

export interface VerificationCertificate {
  id: string;
  certificateNumber: string; // Número único del certificado
  qrCode: string; // Código QR único para validación
  qrUrl: string; // URL del QR que valida el certificado
  
  // Información del graduado verificado
  graduate: {
    documentNumber: string;
    documentIssueDate: string;
    fullName: string;
    titleType: string;
    programName: string;
    diplomaNumber: string;
    graduationDate: string;
    honors?: string;
    gpa?: number;
  };
  
  // Información del solicitante
  requester: {
    name: string;
    email: string;
    type: 'empresa' | 'graduado';
    notes?: string;
  };
  
  // Metadata del certificado
  status: 'active' | 'revoked' | 'expired';
  generatedAt: string;
  generatedBy?: string; // ID del usuario del backoffice que aprobó
  generatorName?: string; // Nombre del usuario del backoffice
  expiresAt?: string; // Fecha de expiración opcional
  
  // Trazabilidad
  viewCount: number; // Veces que se ha visualizado el certificado
  qrScanCount: number; // Veces que se ha escaneado el QR
  lastScannedAt?: string;
  scanHistory: QRScanRecord[];
  
  // URLs
  certificatePdfUrl?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface QRScanRecord {
  id: string;
  scannedAt: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country?: string;
    city?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  verified: boolean; // Si la verificación fue exitosa
}

export interface VerificationCertificateStats {
  totalCertificates: number;
  activeCertificates: number;
  revokedCertificates: number;
  expiredCertificates: number;
  totalScans: number;
  totalViews: number;
  certificatesToday: number;
  scansToday: number;
  topRequesters: Array<{
    name: string;
    count: number;
  }>;
  topGraduates: Array<{
    name: string;
    documentNumber: string;
    certificateCount: number;
  }>;
  recentCertificates: VerificationCertificate[];
  scansByHour: Record<string, number>;
  scansByDay: Record<string, number>;
}

export interface CreateVerificationCertificateDTO {
  graduateDocumentNumber: string;
  graduateDocumentIssueDate: string;
  requesterName: string;
  requesterEmail: string;
  requesterType: 'empresa' | 'graduado';
  notes?: string;
}

export interface ValidateQRCodeQuery {
  qrCode: string;
}

export interface ValidateQRCodeResult {
  valid: boolean;
  certificate?: VerificationCertificate;
  message: string;
  timestamp: string;
}
