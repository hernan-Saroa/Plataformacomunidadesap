/**
 * 🔒 MÓDULO DE SEGURIDAD - ESAP Portal Transaccional
 * 
 * Centraliza todas las funcionalidades de seguridad para proteger
 * la aplicación contra vulnerabilidades comunes.
 */

// ========================================
// VALIDACIÓN DE SESIÓN
// ========================================
export {
  validateSession,
  saveSession,
  clearSession,
  isValidRedirectURL,
  safeRedirect,
  secureLog,
  validateJWT,
  rateLimiter
} from './sessionValidator';

// ========================================
// PROTECCIÓN XSS
// ========================================
export {
  sanitizeText,
  sanitizeHTML,
  sanitizeURL,
  sanitizeName,
  sanitizeEmail,
  sanitizeDocumento,
  sanitizeID,
  sanitizePhone,
  sanitizeObject,
  sanitizeUserInput,
  escapeRegExp,
  removeControlCharacters,
  detectXSS,
  sanitizeReactProps,
  createSafeHTML,
  CSP_HEADERS
} from './xssProtection';

// ========================================
// API CLIENT SEGURO
// ========================================
export {
  SecureApiClient,
  apiClient
} from './secureApiClient';

// ========================================
// COMPONENTES SEGUROS
// ========================================
export {
  SecureUserDisplay,
  useSanitizedUser
} from '../components/SecureUserDisplay';

// ========================================
// CONSTANTES DE SEGURIDAD
// ========================================

/**
 * Roles permitidos en el sistema
 */
export const ROLES_PERMITIDOS = [
  'DOCENTE',
  'JEFE_AREA',
  'FIRMANTE',
  'APROBADOR_PTA',
  'COORDINADOR_ACADEMICO',
  'AREA_AUDITADA',
  'ADMIN',
  'SUPER_ADMIN'
] as const;

/**
 * Permisos del sistema
 */
export const PERMISOS = {
  // PTA
  PTA_CREATE: 'pta:create',
  PTA_READ: 'pta:read',
  PTA_UPDATE: 'pta:update',
  PTA_DELETE: 'pta:delete',
  PTA_APPROVE: 'pta:approve',
  
  // Control Interno
  CI_VIEW: 'control-interno:view',
  CI_CREATE: 'control-interno:create',
  CI_UPDATE: 'control-interno:update',
  CI_APPROVE: 'control-interno:approve',
  
  // Firma Electrónica
  FIRMA_SIGN: 'firma:sign',
  FIRMA_VIEW: 'firma:view',
  FIRMA_MANAGE: 'firma:manage',
  
  // Certificados
  CERT_REQUEST: 'certificados:request',
  CERT_VIEW: 'certificados:view',
  CERT_APPROVE: 'certificados:approve',
  
  // Admin
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_CONFIG: 'admin:config'
} as const;

/**
 * Configuración de seguridad
 */
export const SECURITY_CONFIG = {
  SESSION_MAX_AGE: 15 * 60 * 1000, // 15 minutos
  TOKEN_REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutos
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutos
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_REQUIRE_SPECIAL: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  ALLOWED_EMAIL_DOMAIN: '@esap.edu.co',
  MAX_FILE_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
} as const;

/**
 * Headers de seguridad recomendados
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
} as const;

/**
 * Tipo para roles
 */
export type Rol = typeof ROLES_PERMITIDOS[number];

/**
 * Tipo para permisos
 */
export type Permiso = typeof PERMISOS[keyof typeof PERMISOS];
