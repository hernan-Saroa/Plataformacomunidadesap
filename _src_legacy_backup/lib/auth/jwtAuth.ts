/**
 * Sistema de Autenticación JWT para API Pública
 * Maneja generación, validación y renovación de tokens
 */

// Tipos
export interface APIKey {
  id: string;
  key: string;
  nombre: string;
  tipo: 'SANDBOX' | 'PRODUCTION';
  permisos: string[];
  activa: boolean;
  fechaCreacion: string;
  fechaExpiracion?: string;
  ultimoUso?: string;
  usos: number;
  limiteRatePorMinuto: number;
}

export interface JWTPayload {
  sub: string; // Subject (API Key ID)
  iss: string; // Issuer (ESAP)
  aud: string; // Audience
  exp: number; // Expiration time
  iat: number; // Issued at
  jti: string; // JWT ID
  scope: string[]; // Permisos
  type: 'access' | 'refresh';
  metadata?: {
    clientName: string;
    environment: 'sandbox' | 'production';
  };
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ValidacionToken {
  valido: boolean;
  payload?: JWTPayload;
  error?: string;
}

// Configuración
const JWT_SECRET = process.env.JWT_SECRET || 'esap-secret-key-2025-production';
const JWT_ISSUER = 'ESAP-API-v1';
const JWT_AUDIENCE = 'esap-api-clients';
const ACCESS_TOKEN_EXPIRY = 3600; // 1 hora en segundos
const REFRESH_TOKEN_EXPIRY = 604800; // 7 días en segundos

/**
 * Genera un par de tokens (access + refresh)
 */
export function generarTokens(apiKey: APIKey): TokenPair {
  const now = Math.floor(Date.now() / 1000);
  
  const accessPayload: JWTPayload = {
    sub: apiKey.id,
    iss: JWT_ISSUER,
    aud: JWT_AUDIENCE,
    exp: now + ACCESS_TOKEN_EXPIRY,
    iat: now,
    jti: generarJTI(),
    scope: apiKey.permisos,
    type: 'access',
    metadata: {
      clientName: apiKey.nombre,
      environment: apiKey.tipo.toLowerCase() as 'sandbox' | 'production'
    }
  };

  const refreshPayload: JWTPayload = {
    ...accessPayload,
    exp: now + REFRESH_TOKEN_EXPIRY,
    jti: generarJTI(),
    type: 'refresh'
  };

  return {
    accessToken: encodeJWT(accessPayload),
    refreshToken: encodeJWT(refreshPayload),
    expiresIn: ACCESS_TOKEN_EXPIRY,
    tokenType: 'Bearer'
  };
}

/**
 * Valida un token JWT
 */
export function validarToken(token: string): ValidacionToken {
  try {
    const payload = decodeJWT(token);

    // Validar expiración
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return {
        valido: false,
        error: 'TOKEN_EXPIRED'
      };
    }

    // Validar issuer
    if (payload.iss !== JWT_ISSUER) {
      return {
        valido: false,
        error: 'INVALID_ISSUER'
      };
    }

    // Validar audience
    if (payload.aud !== JWT_AUDIENCE) {
      return {
        valido: false,
        error: 'INVALID_AUDIENCE'
      };
    }

    return {
      valido: true,
      payload
    };
  } catch (error) {
    return {
      valido: false,
      error: 'INVALID_TOKEN'
    };
  }
}

/**
 * Renueva un access token usando un refresh token
 */
export function renovarToken(refreshToken: string, apiKey: APIKey): TokenPair | null {
  const validacion = validarToken(refreshToken);

  if (!validacion.valido || !validacion.payload) {
    return null;
  }

  // Verificar que es un refresh token
  if (validacion.payload.type !== 'refresh') {
    return null;
  }

  // Generar nuevo par de tokens
  return generarTokens(apiKey);
}

/**
 * Extrae el token del header Authorization
 */
export function extraerTokenDeHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Verifica permisos de un token
 */
export function verificarPermiso(payload: JWTPayload, permisoRequerido: string): boolean {
  return payload.scope.includes(permisoRequerido) || payload.scope.includes('*');
}

/**
 * Genera una API Key
 */
export function generarAPIKey(tipo: 'SANDBOX' | 'PRODUCTION'): string {
  const prefix = tipo === 'SANDBOX' ? 'esap_test' : 'esap_live';
  const random = generarStringAleatorio(32);
  return `${prefix}_sk_${random}`;
}

/**
 * Crea una nueva API Key
 */
export function crearAPIKey(data: {
  nombre: string;
  tipo: 'SANDBOX' | 'PRODUCTION';
  permisos: string[];
  limiteRatePorMinuto?: number;
}): APIKey {
  const now = new Date().toISOString();
  
  return {
    id: generarUUID(),
    key: generarAPIKey(data.tipo),
    nombre: data.nombre,
    tipo: data.tipo,
    permisos: data.permisos,
    activa: true,
    fechaCreacion: now,
    usos: 0,
    limiteRatePorMinuto: data.limiteRatePorMinuto || (data.tipo === 'SANDBOX' ? 10 : 100)
  };
}

/**
 * Valida una API Key
 */
export async function validarAPIKey(apiKey: string): Promise<{
  valida: boolean;
  key?: APIKey;
  error?: string;
}> {
  try {
    // En producción, esto consultaría la base de datos
    // Por ahora, mock de validación
    
    if (!apiKey.startsWith('esap_')) {
      return {
        valida: false,
        error: 'INVALID_API_KEY_FORMAT'
      };
    }

    // Mock de API Key válida
    const mockKey: APIKey = {
      id: 'key-001',
      key: apiKey,
      nombre: 'Aplicación de Prueba',
      tipo: apiKey.includes('test') ? 'SANDBOX' : 'PRODUCTION',
      permisos: ['certificados:validar', 'certificados:consultar'],
      activa: true,
      fechaCreacion: new Date().toISOString(),
      usos: 0,
      limiteRatePorMinuto: 100
    };

    return {
      valida: true,
      key: mockKey
    };
  } catch (error) {
    return {
      valida: false,
      error: 'VALIDATION_ERROR'
    };
  }
}

/**
 * Rate Limiting Check
 */
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

export function verificarRateLimit(apiKeyId: string, limite: number): {
  permitido: boolean;
  restantes: number;
  resetEn: number;
} {
  const now = Date.now();
  const ventana = 60000; // 1 minuto en ms

  const registro = rateLimitStore.get(apiKeyId);

  if (!registro || now > registro.resetAt) {
    // Nueva ventana
    rateLimitStore.set(apiKeyId, {
      count: 1,
      resetAt: now + ventana
    });

    return {
      permitido: true,
      restantes: limite - 1,
      resetEn: ventana
    };
  }

  if (registro.count >= limite) {
    return {
      permitido: false,
      restantes: 0,
      resetEn: registro.resetAt - now
    };
  }

  registro.count++;

  return {
    permitido: true,
    restantes: limite - registro.count,
    resetEn: registro.resetAt - now
  };
}

// ============================================================================
// FUNCIONES HELPER (Simplificadas para el ejemplo)
// En producción se usaría una librería como 'jsonwebtoken'
// ============================================================================

/**
 * Codifica un JWT (versión simplificada)
 * En producción usar: jsonwebtoken.sign()
 */
function encodeJWT(payload: JWTPayload): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crearSignature(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Decodifica un JWT (versión simplificada)
 * En producción usar: jsonwebtoken.verify()
 */
function decodeJWT(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const payload = JSON.parse(base64UrlDecode(parts[1]));
  
  // Verificar signature
  const expectedSignature = crearSignature(`${parts[0]}.${parts[1]}`);
  if (parts[2] !== expectedSignature) {
    throw new Error('Invalid signature');
  }

  return payload;
}

function crearSignature(data: string): string {
  // Versión simplificada - en producción usar HMAC SHA256
  const hash = simpleHash(data + JWT_SECRET);
  return base64UrlEncode(hash);
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function base64UrlEncode(str: string): string {
  if (typeof window !== 'undefined') {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } else {
    return Buffer.from(str).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  
  if (typeof window !== 'undefined') {
    return atob(str);
  } else {
    return Buffer.from(str, 'base64').toString();
  }
}

function generarJTI(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

function generarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generarStringAleatorio(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Middleware para proteger rutas API
 */
export async function protegerRuta(
  authHeader: string | null,
  permisoRequerido?: string
): Promise<{
  autorizado: boolean;
  payload?: JWTPayload;
  error?: {
    codigo: string;
    mensaje: string;
    statusCode: number;
  };
}> {
  // Extraer token
  const token = extraerTokenDeHeader(authHeader);
  
  if (!token) {
    return {
      autorizado: false,
      error: {
        codigo: 'NO_TOKEN',
        mensaje: 'No se proporcionó un token de autenticación',
        statusCode: 401
      }
    };
  }

  // Validar token
  const validacion = validarToken(token);
  
  if (!validacion.valido) {
    return {
      autorizado: false,
      error: {
        codigo: validacion.error || 'INVALID_TOKEN',
        mensaje: 'Token inválido o expirado',
        statusCode: 401
      }
    };
  }

  // Verificar permisos si se requiere
  if (permisoRequerido && validacion.payload) {
    if (!verificarPermiso(validacion.payload, permisoRequerido)) {
      return {
        autorizado: false,
        error: {
          codigo: 'INSUFFICIENT_PERMISSIONS',
          mensaje: 'No tienes permisos suficientes para esta operación',
          statusCode: 403
        }
      };
    }
  }

  return {
    autorizado: true,
    payload: validacion.payload
  };
}
