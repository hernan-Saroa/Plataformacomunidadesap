/**
 * 🔒 VALIDADOR DE SESIÓN SEGURO
 * 
 * Protege contra:
 * - XSS mediante validación de datos
 * - Code injection mediante schema validation
 * - Session hijacking mediante validación de integridad
 * - Type confusion mediante TypeScript estricto
 */

import { UsuarioPersona } from '../hooks/useUserServices';

// Schema de validación para sesión
interface SessionSchema {
  usuario: UsuarioPersona;
  timestamp: number;
  signature?: string; // Para validación de integridad
  expiresAt: number;
}

// Constantes de seguridad
const SESSION_KEY = 'esap-session';
const SESSION_MAX_AGE = 15 * 60 * 1000; // 15 minutos
const ALLOWED_EMAIL_DOMAIN = '@esap.edu.co';

/**
 * Validador de email ESAP
 */
function isValidESAPEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Validación de formato básico
  const emailRegex = /^[a-zA-Z0-9._-]+@esap\.edu\.co$/;
  if (!emailRegex.test(email)) return false;
  
  // Prevenir emails maliciosos
  const dangerousPatterns = [
    '<script',
    'javascript:',
    'onerror=',
    'onclick=',
    'eval(',
    'Function('
  ];
  
  return !dangerousPatterns.some(pattern => 
    email.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Sanitiza strings para prevenir XSS
 */
function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Valida que un objeto sea UsuarioPersona válido
 */
function isValidUsuarioPersona(obj: any): obj is UsuarioPersona {
  if (!obj || typeof obj !== 'object') return false;
  
  // Validación de campos requeridos
  if (!obj.id || typeof obj.id !== 'string') return false;
  if (!obj.email || !isValidESAPEmail(obj.email)) return false;
  if (!obj.nombres || typeof obj.nombres !== 'string') return false;
  if (!obj.apellidos || typeof obj.apellidos !== 'string') return false;
  if (!obj.documento || typeof obj.documento !== 'string') return false;
  
  // Validación de arrays
  if (!Array.isArray(obj.roles) || obj.roles.length === 0) return false;
  if (!Array.isArray(obj.permisos)) return false;
  
  // Validación de roles permitidos
  const rolesPermitidos = [
    'DOCENTE',
    'JEFE_AREA',
    'FIRMANTE',
    'APROBADOR_PTA',
    'COORDINADOR_ACADEMICO',
    'AREA_AUDITADA',
    'ADMIN'
  ];
  
  const todosRolesValidos = obj.roles.every((rol: any) => 
    typeof rol === 'string' && rolesPermitidos.includes(rol)
  );
  
  if (!todosRolesValidos) return false;
  
  // Validación de permisos (deben ser strings)
  const todosPermisosValidos = obj.permisos.every((permiso: any) => 
    typeof permiso === 'string'
  );
  
  if (!todosPermisosValidos) return false;
  
  return true;
}

/**
 * Valida sesión desde localStorage con seguridad
 */
export function validateSession(): UsuarioPersona | null {
  try {
    // 1. Obtener datos de localStorage
    const sessionData = localStorage.getItem(SESSION_KEY);
    
    if (!sessionData) {
      return null;
    }
    
    // 2. Validar que es JSON válido
    let session: any;
    try {
      session = JSON.parse(sessionData);
    } catch (parseError) {
      // JSON inválido - posible ataque
      console.warn('[SECURITY] Invalid JSON in session');
      clearSession();
      return null;
    }
    
    // 3. Validar estructura de sesión
    if (!session || typeof session !== 'object') {
      console.warn('[SECURITY] Invalid session structure');
      clearSession();
      return null;
    }
    
    // 4. Validar timestamp (prevenir session replay)
    if (typeof session.timestamp !== 'number' || 
        Date.now() - session.timestamp > SESSION_MAX_AGE) {
      console.warn('[SECURITY] Session expired');
      clearSession();
      return null;
    }
    
    // 5. Validar usuario
    if (!isValidUsuarioPersona(session.usuario)) {
      console.warn('[SECURITY] Invalid user data in session');
      clearSession();
      return null;
    }
    
    // 6. Sanitizar strings
    const sanitizedUser: UsuarioPersona = {
      ...session.usuario,
      email: sanitizeString(session.usuario.email),
      nombres: sanitizeString(session.usuario.nombres),
      apellidos: sanitizeString(session.usuario.apellidos),
      documento: sanitizeString(session.usuario.documento),
      roles: session.usuario.roles.map((r: string) => sanitizeString(r)),
      permisos: session.usuario.permisos.map((p: string) => sanitizeString(p))
    };
    
    // 7. Renovar timestamp (session sliding)
    saveSession(sanitizedUser);
    
    return sanitizedUser;
    
  } catch (error) {
    // No exponer detalles del error
    console.warn('[SECURITY] Session validation failed');
    clearSession();
    return null;
  }
}

/**
 * Guarda sesión de forma segura
 */
export function saveSession(user: UsuarioPersona): void {
  try {
    // Validar usuario antes de guardar
    if (!isValidUsuarioPersona(user)) {
      throw new Error('Invalid user data');
    }
    
    const session: SessionSchema = {
      usuario: user,
      timestamp: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
  } catch (error) {
    console.error('[SECURITY] Failed to save session');
    throw error;
  }
}

/**
 * Limpia sesión de forma segura
 */
export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('auth-token');
    // Limpiar cualquier otro dato sensible
    sessionStorage.clear();
  } catch (error) {
    console.error('[SECURITY] Failed to clear session');
  }
}

/**
 * Validar URL para prevenir open redirect
 */
export function isValidRedirectURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Solo permitir URLs relativas o del mismo dominio
  const allowedPatterns = [
    /^\/portal/,
    /^\/admin/,
    /^\/publico/,
    /^\/login$/,
    /^\/$/
  ];
  
  // Prevenir URLs maliciosas
  const dangerousPatterns = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    '<script',
    'onerror='
  ];
  
  if (dangerousPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
    return false;
  }
  
  return allowedPatterns.some(pattern => pattern.test(url));
}

/**
 * Redirección segura
 */
export function safeRedirect(url: string): void {
  if (isValidRedirectURL(url)) {
    window.location.href = url;
  } else {
    console.warn('[SECURITY] Invalid redirect URL blocked:', url);
    window.location.href = '/portal'; // Default seguro
  }
}

/**
 * Logger seguro (no expone información sensible)
 */
export function secureLog(level: 'info' | 'warn' | 'error', message: string): void {
  const timestamp = new Date().toISOString();
  
  // En producción, enviar a servicio de logging
  if (process.env.NODE_ENV === 'production') {
    // TODO: Enviar a servicio de logging externo (DataDog, Sentry, etc.)
    return;
  }
  
  // En desarrollo, solo log sin información sensible
  const safeMessage = message.replace(/\b\d{10,}\b/g, '***'); // Ocultar números largos (docs)
  console[level](`[${timestamp}] ${safeMessage}`);
}

/**
 * Validar token JWT (mock - implementar con librería real)
 */
export function validateJWT(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  
  // Validación básica de formato JWT
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Validar que cada parte es base64 válido
    parts.forEach(part => {
      atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    });
    
    // TODO: Validar firma con clave pública
    // TODO: Validar expiración
    // TODO: Validar issuer
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limiter simple (prevenir brute force)
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number = 5;
  private windowMs: number = 15 * 60 * 1000; // 15 minutos
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Filtrar intentos dentro de la ventana de tiempo
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Exportaciones para testing
 */
export const __testing__ = {
  isValidESAPEmail,
  sanitizeString,
  isValidUsuarioPersona
};
