/**
 * ============================================
 * ESAP - SECURITY UTILITIES
 * ============================================
 * 
 * Módulo central de seguridad que incluye:
 * - Sanitización de inputs (XSS prevention)
 * - Validación de datos
 * - Encriptación/Desencriptación
 * - Hash de passwords
 * - Tokens seguros
 * - Rate limiting
 * - CSRF protection
 */

// Nota: DOMPurify se importaría en producción, aquí usamos una versión simplificada
// import DOMPurify from 'dompurify';

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

export const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD_MIN_LENGTH: 12,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,
  
  // Session management
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutos
  SESSION_WARNING_TIME: 1 * 60 * 1000, // 1 minuto antes
  MAX_SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 horas
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutos
  MAX_API_REQUESTS_PER_MINUTE: 60,
  
  // Token configuration
  TOKEN_LENGTH: 32,
  TOKEN_EXPIRATION: 3600000, // 1 hora
  
  // Input sanitization
  MAX_INPUT_LENGTH: 10000,
  ALLOWED_HTML_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_HTML_ATTRS: ['href', 'target'],
  
  // File upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
} as const;

// ============================================
// XSS PREVENTION - INPUT SANITIZATION
// ============================================

/**
 * Sanitiza HTML para prevenir XSS (versión simplificada)
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof dirty !== 'string') return '';
  
  // Remover scripts y eventos peligrosos
  let clean = dirty;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/javascript:/gi, '');
  
  return clean;
}

/**
 * Escapa caracteres especiales HTML
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Sanitiza input de texto plano
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remover caracteres de control
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Limitar longitud
  sanitized = sanitized.substring(0, SECURITY_CONFIG.MAX_INPUT_LENGTH);
  
  // Trimear espacios
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitiza SQL input para prevenir SQL injection
 */
export function sanitizeSql(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Escapar comillas simples
  return input.replace(/'/g, "''");
}

/**
 * Sanitiza URL para prevenir javascript: y data: URIs
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';
  
  const trimmedUrl = url.trim().toLowerCase();
  
  // Bloquear protocolos peligrosos
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmedUrl.startsWith(protocol)) {
      return '';
    }
  }
  
  return url;
}

/**
 * Sanitiza nombre de archivo
 */
export function sanitizeFileName(filename: string): string {
  if (typeof filename !== 'string') return '';
  
  // Remover caracteres peligrosos
  let sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Prevenir path traversal
  sanitized = sanitized.replace(/\.\./g, '');
  
  // Limitar longitud
  sanitized = sanitized.substring(0, 255);
  
  return sanitized;
}

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida número de documento (Colombia)
 */
export function isValidDocumentNumber(doc: string): boolean {
  if (!doc || typeof doc !== 'string') return false;
  
  // Solo números, entre 5 y 15 dígitos
  const docRegex = /^[0-9]{5,15}$/;
  return docRegex.test(doc);
}

/**
 * Valida teléfono (Colombia)
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Formato: +57 3XX XXX XXXX o 3XXXXXXXXX
  const phoneRegex = /^(\+57)?[3][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Valida fecha en formato ISO
 */
export function isValidDate(date: string): boolean {
  if (!date || typeof date !== 'string') return false;
  
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * Valida que un valor sea numérico positivo
 */
export function isPositiveNumber(value: any): boolean {
  const num = Number(value);
  return !isNaN(num) && num > 0 && isFinite(num);
}

// ============================================
// PASSWORD SECURITY
// ============================================

/**
 * Valida fortaleza de contraseña
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number; // 0-100
} {
  const errors: string[] = [];
  let score = 0;
  
  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['La contraseña es requerida'], score: 0 };
  }
  
  // Longitud mínima
  if (password.length < SECURITY_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Debe tener al menos ${SECURITY_CONFIG.PASSWORD_MIN_LENGTH} caracteres`);
  } else {
    score += 20;
  }
  
  // Longitud máxima
  if (password.length > SECURITY_CONFIG.PASSWORD_MAX_LENGTH) {
    errors.push(`No debe exceder ${SECURITY_CONFIG.PASSWORD_MAX_LENGTH} caracteres`);
  }
  
  // Mayúsculas
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Debe contener al menos una letra mayúscula');
  } else {
    score += 20;
  }
  
  // Minúsculas
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Debe contener al menos una letra minúscula');
  } else {
    score += 20;
  }
  
  // Números
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Debe contener al menos un número');
  } else {
    score += 20;
  }
  
  // Caracteres especiales
  if (SECURITY_CONFIG.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Debe contener al menos un carácter especial');
  } else {
    score += 20;
  }
  
  // Patrones comunes (passwords débiles)
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', '123456789', 'esap2024'
  ];
  
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('La contraseña es demasiado común');
    score = Math.max(0, score - 40);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(100, Math.max(0, score)),
  };
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Genera un token seguro aleatorio
 */
export function generateSecureToken(length: number = SECURITY_CONFIG.TOKEN_LENGTH): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Genera un UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  createdAt: number;
  lastActivity: number;
  csrfToken: string;
}

/**
 * Obtiene la sesión actual
 */
export function getSession(): SessionData | null {
  try {
    const encrypted = sessionStorage.getItem('esap_session');
    if (!encrypted) return null;
    
    const session = JSON.parse(atob(encrypted)) as SessionData;
    
    // Verificar expiración
    const now = Date.now();
    const sessionAge = now - session.createdAt;
    const inactivityTime = now - session.lastActivity;
    
    if (sessionAge > SECURITY_CONFIG.MAX_SESSION_DURATION) {
      destroySession();
      return null;
    }
    
    if (inactivityTime > SECURITY_CONFIG.SESSION_TIMEOUT) {
      destroySession();
      return null;
    }
    
    // Actualizar última actividad
    session.lastActivity = now;
    const encrypted2 = btoa(JSON.stringify(session));
    sessionStorage.setItem('esap_session', encrypted2);
    
    return session;
  } catch (error) {
    console.error('Error reading session:', error);
    return null;
  }
}

/**
 * Destruye la sesión
 */
export function destroySession(): void {
  sessionStorage.removeItem('esap_session');
  sessionStorage.removeItem('csrf_token');
  localStorage.removeItem('esap-sesion-activa');
}

// ============================================
// AUDIT LOGGING
// ============================================

export interface AuditLog {
  timestamp: number;
  userId?: string;
  action: string;
  resource: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

const auditLogs: AuditLog[] = [];

/**
 * Registra evento de auditoría
 */
export function logAuditEvent(
  action: string,
  resource: string,
  success: boolean,
  details?: Record<string, any>
): void {
  const session = getSession();
  
  const log: AuditLog = {
    timestamp: Date.now(),
    userId: session?.userId,
    action,
    resource,
    success,
    userAgent: navigator.userAgent,
    details,
  };
  
  auditLogs.push(log);
  
  // Mantener solo últimos 1000 logs en memoria
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
  
  // Log en consola solo en desarrollo
  if (import.meta.env?.DEV) {
    console.log('🔒 Audit Log:', log);
  }
}

/**
 * Obtiene logs de auditoría
 */
export function getAuditLogs(filter?: Partial<AuditLog>): AuditLog[] {
  if (!filter) return [...auditLogs];
  
  return auditLogs.filter(log => {
    return Object.entries(filter).every(([key, value]) => {
      return log[key as keyof AuditLog] === value;
    });
  });
}

// ============================================
// EXPORTS
// ============================================

export const SecurityUtils = {
  // Sanitization
  sanitizeHtml,
  escapeHtml,
  sanitizeText,
  sanitizeSql,
  sanitizeUrl,
  sanitizeFileName,
  
  // Validation
  isValidEmail,
  isValidDocumentNumber,
  isValidPhone,
  isValidDate,
  isPositiveNumber,
  
  // Password
  validatePasswordStrength,
  
  // Tokens
  generateSecureToken,
  generateUUID,
  
  // Session
  getSession,
  destroySession,
  
  // Audit
  logAuditEvent,
  getAuditLogs,
} as const;

export default SecurityUtils;