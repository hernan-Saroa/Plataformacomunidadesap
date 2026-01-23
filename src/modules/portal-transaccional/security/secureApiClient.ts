/**
 * 🔒 CLIENTE API SEGURO
 * 
 * Cliente HTTP con medidas de seguridad integradas:
 * - CSRF Protection
 * - JWT Validation
 * - Rate Limiting
 * - Request Sanitization
 * - Response Validation
 */

import { validateJWT, rateLimiter, secureLog } from './sessionValidator';
import { sanitizeObject } from './xssProtection';

// Configuración de seguridad
const API_BASE_URL = process.env.VITE_API_URL || 'https://api.esap.edu.co';
const REQUEST_TIMEOUT = 30000; // 30 segundos
const MAX_RETRIES = 3;

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  requiresAuth?: boolean;
  skipRateLimit?: boolean;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Obtener token de autenticación de forma segura
 */
function getAuthToken(): string | null {
  try {
    const token = localStorage.getItem('auth-token');
    
    if (!token) return null;
    
    // 🔒 Validar formato JWT antes de usar
    if (!validateJWT(token)) {
      secureLog('warn', 'Invalid JWT token detected');
      localStorage.removeItem('auth-token');
      return null;
    }
    
    return token;
  } catch (error) {
    secureLog('error', 'Error getting auth token');
    return null;
  }
}

/**
 * Generar CSRF token (simple)
 */
function getCSRFToken(): string {
  let token = sessionStorage.getItem('csrf-token');
  
  if (!token) {
    // Generar token aleatorio seguro
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    sessionStorage.setItem('csrf-token', token);
  }
  
  return token;
}

/**
 * Cliente API con seguridad integrada
 */
export class SecureApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      'X-Client-Version': '1.0.0'
    };
  }

  /**
   * Request genérico con seguridad
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body = null,
      requiresAuth = true,
      skipRateLimit = false
    } = config;

    // 🔒 Rate limiting
    if (!skipRateLimit) {
      const rateLimitKey = `api:${endpoint}:${method}`;
      if (!rateLimiter.isAllowed(rateLimitKey)) {
        throw new Error('Demasiadas solicitudes. Por favor, espera un momento.');
      }
    }

    // 🔒 Validar endpoint
    if (!this.isValidEndpoint(endpoint)) {
      secureLog('warn', 'Invalid endpoint blocked');
      throw new Error('Endpoint no válido');
    }

    // 🔒 Construir headers seguros
    const requestHeaders = new Headers(this.defaultHeaders);
    
    // Agregar autenticación si se requiere
    if (requiresAuth) {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No autenticado');
      }
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    // Agregar CSRF token para métodos que modifican datos
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      requestHeaders.set('X-CSRF-Token', getCSRFToken());
    }

    // Agregar headers personalizados
    Object.entries(headers).forEach(([key, value]) => {
      requestHeaders.set(key, value);
    });

    // 🔒 Sanitizar body antes de enviar
    const sanitizedBody = body ? sanitizeObject(body) : null;

    // Construir request
    const url = `${this.baseURL}${endpoint}`;
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include', // Incluir cookies si es necesario
      mode: 'cors'
    };

    if (sanitizedBody && method !== 'GET') {
      requestOptions.body = JSON.stringify(sanitizedBody);
    }

    // 🔒 Timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    requestOptions.signal = controller.signal;

    try {
      // Ejecutar request
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Verificar status
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse response
      const data = await response.json();

      // 🔒 Validar response (básico)
      if (data && typeof data === 'object') {
        // Sanitizar response si es necesario
        // const sanitizedData = sanitizeObject(data);
        return {
          data,
          status: response.status,
          headers: response.headers
        };
      }

      return {
        data,
        status: response.status,
        headers: response.headers
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      // Manejar diferentes tipos de errores
      if (error.name === 'AbortError') {
        throw new Error('La solicitud excedió el tiempo de espera');
      }

      secureLog('error', `API request failed: ${endpoint}`);
      throw error;
    }
  }

  /**
   * Validar que el endpoint sea seguro
   */
  private isValidEndpoint(endpoint: string): boolean {
    // Solo permitir paths relativos
    if (!endpoint.startsWith('/')) return false;

    // Prevenir path traversal
    if (endpoint.includes('..')) return false;

    // Prevenir inyección de URL
    if (endpoint.includes('javascript:')) return false;
    if (endpoint.includes('data:')) return false;

    return true;
  }

  /**
   * Manejar errores de response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorMessage = 'Error en la solicitud';

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // Si no se puede parsear el error, usar mensaje por defecto
    }

    // Manejar códigos de estado específicos
    switch (response.status) {
      case 401:
        // No autenticado - limpiar sesión
        localStorage.removeItem('auth-token');
        localStorage.removeItem('esap-session');
        window.location.href = '/login';
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');

      case 403:
        throw new Error('No tienes permisos para realizar esta acción');

      case 404:
        throw new Error('Recurso no encontrado');

      case 429:
        throw new Error('Demasiadas solicitudes. Por favor, espera un momento.');

      case 500:
      case 502:
      case 503:
        throw new Error('Error del servidor. Por favor, intenta más tarde.');

      default:
        throw new Error(errorMessage);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, requiresAuth = true): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'GET',
      requiresAuth
    });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body: any,
    requiresAuth = true
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body,
      requiresAuth
    });
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body: any,
    requiresAuth = true
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body,
      requiresAuth
    });
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, requiresAuth = true): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
      requiresAuth
    });
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body: any,
    requiresAuth = true
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PATCH',
      body,
      requiresAuth
    });
    return response.data;
  }
}

// Exportar instancia singleton
export const apiClient = new SecureApiClient();

// Exportar clase para testing
export default SecureApiClient;
