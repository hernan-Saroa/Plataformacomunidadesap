/**
 * Cliente API Base
 *
 * Maneja todas las requests HTTP al backend con:
 * - Autenticación automática
 * - Refresh de tokens
 * - Manejo de errores
 * - Retry logic
 * - Request/Response interceptors
 *
 * MODOS DE CONEXIÓN:
 * - Gateway Mode: Todas las requests van a http://localhost:3000/{service}/api/v1/{path}
 * - Direct Mode: Cada servicio en su puerto http://localhost:300X/{path}
 */

import { config, getDefaultHeaders, CORS_CONFIG, API_MODE, MICROSERVICE_URLS } from '../../config/environment';
import type { ApiResponse, ApiError } from '../../types';
import { toast } from 'sonner';

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  skipErrorToast?: boolean;
  retries?: number;
}

interface RetryConfig {
  attempts: number;
  delay: number;
}

// ============================================================================
// CLASE API CLIENT
// ============================================================================

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private retryConfig: RetryConfig;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL?: string) {
    // Usar la URL base del API Gateway desde la configuración de entorno
    this.baseURL = baseURL || config.API_BASE_URL;
    this.timeout = config.API_TIMEOUT;
    this.retryConfig = {
      attempts: config.API_RETRY_ATTEMPTS,
      delay: config.API_RETRY_DELAY,
    };

    console.log('🔧 API Client initialized with baseURL:', this.baseURL);
    console.log('🔧 API Mode:', API_MODE);
  }

  // ==========================================================================
  // MÉTODOS PÚBLICOS
  // ==========================================================================

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    customConfig?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(endpoint, params);
    return this.request<T>(url, { method: 'GET', ...customConfig });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    customConfig?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    return this.request<T>(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...customConfig,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    customConfig?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    return this.request<T>(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...customConfig,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    customConfig?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    return this.request<T>(url, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...customConfig,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    customConfig?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    return this.request<T>(url, { method: 'DELETE', ...customConfig });
  }

  /**
   * Upload de archivos (multipart/form-data)
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const url = this.buildURL(endpoint);

    // Para upload, no enviamos Content-Type header (el browser lo setea automáticamente con boundary)
    const headers = getDefaultHeaders(true);
    delete (headers as any)['Content-Type'];

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      // Success
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const responseText = xhr.responseText;
            if (!responseText) {
              resolve({} as T);
              return;
            }
            const response = JSON.parse(responseText);
            // Algunos backends devuelven { data: {...} }, otros devuelven directamente el objeto
            resolve((response.data !== undefined ? response.data : response) as T);
          } catch (error) {
            reject(new Error('Error al parsear respuesta del servidor'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.message || `Error ${xhr.status}: ${xhr.statusText}`));
          } catch {
            reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
          }
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red al subir archivo'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Timeout al subir archivo'));
      });

      xhr.open('POST', url);

      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });

      xhr.timeout = this.timeout;
      xhr.send(formData);
    });
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  /**
   * Request principal con retry logic
   */
  private async request<T>(
    url: string,
    customConfig: RequestConfig = {}
  ): Promise<T> {
    const {
      skipAuth = false,
      skipErrorToast = false,
      retries = this.retryConfig.attempts,
      ...fetchConfig
    } = customConfig;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        return await this.executeRequest<T>(url, fetchConfig, skipAuth, skipErrorToast);
      } catch (error: any) {
        lastError = error;
        attempt++;

        // No reintentar en estos casos
        if (
          error.status === 401 || // Unauthorized
          error.status === 403 || // Forbidden
          error.status === 404 || // Not found
          error.status === 422 || // Validation error
          attempt > retries
        ) {
          throw error;
        }

        // Esperar antes de reintentar
        await this.delay(this.retryConfig.delay * attempt);
      }
    }

    throw lastError;
  }

  /**
   * Ejecuta el request HTTP
   */
  private async executeRequest<T>(
    url: string,
    fetchConfig: RequestInit,
    skipAuth: boolean,
    skipErrorToast: boolean
  ): Promise<T> {
    const headers = skipAuth
      ? { 'Content-Type': 'application/json; charset=utf-8' }
      : getDefaultHeaders(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers: {
          ...headers,
          ...fetchConfig.headers,
        },
        signal: controller.signal,
        ...CORS_CONFIG,
      });

      clearTimeout(timeoutId);

      // Manejo de respuesta
      return await this.handleResponse<T>(response, skipErrorToast, skipAuth);
    } catch (error: any) {
      console.log('🔴 Error en request:', error);
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Maneja la respuesta del servidor
   */
  private async handleResponse<T>(
    response: Response,
    skipErrorToast: boolean,
    skipAuth: boolean
  ): Promise<T> {
    // Token expirado - intentar refresh solo si la petición requiere auth
    if (response.status === 401 && !skipAuth) {
      const originalRequest = response.url;
      const newToken = await this.refreshAccessToken();

      if (newToken) {
        // Reintentar request con nuevo token
        return this.get<T>(originalRequest);
      }
    }

    // Si es 204 No Content, retornar null
    if (response.status === 204) {
      return null as T;
    }

    // Parse response
    let data: ApiResponse<T> | ApiError;

    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        // If parsing fails, use text as error message or empty object
        if (!response.ok) {
          throw new Error(text || 'Error en la petición (sin detalles)');
        }
        data = {} as any; // For 200 OK with empty body
      }
    } catch (error: any) {
      throw new Error(error.message || 'Error al leer respuesta del servidor');
    }

    // Success
    if (response.ok) {
      if ('data' in data) {
        return data.data;
      }
      // Si es un array o un objeto sin propiedad 'error'/'status', asumimos que es la respuesta directa
      if (Array.isArray(data) || !('error' in data)) {
        return data as T;
      }
    }

    // Error
    if ('error' in data) {
      let errorMessage = 'Error desconocido';
      let details = data.error.details;
      if (typeof data.error === 'string') { // 1. Si error es string
        errorMessage = data.error || errorMessage;
      }
      if (typeof data.error === 'object' && data.error !== null) { // 2. Si error es objeto con message
        const errObj = data.error as any;
        if (typeof errObj.message === 'string') {
          errorMessage = errObj.message || errorMessage;
        } else if (Array.isArray(errObj.message)) {
          errorMessage = errObj.message.join(', ');
        }
      }
      if ((data as any).error === 'Unauthorized' && 'message' in data && typeof (data as any).message === 'string') { // 3. Caso especial Unauthorized con message en la raíz
        errorMessage = (data as any).message;
        details = (data as any).message;
      }
      // 4. Caso NestJS standard exception filter (statusCode, message, error)
      if ('message' in data && 'statusCode' in data) {
        const msg = (data as any).message;
        if (typeof msg === 'string') {
          errorMessage = msg;
        } else if (Array.isArray(msg)) {
          errorMessage = msg.join(', ');
        }
      }

      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.code = data.error.code;
      error.details = details;
      error.response = { data }; // Attach full data for upstream handling
      throw error;
    }

    // Fallback for when response is not OK but data structure is unexpected
    if (!response.ok) {
      let errorMessage = 'Error en la petición';
      if ('message' in data) {
        if (typeof (data as any).message === 'string') {
          errorMessage = (data as any).message;
        } else if (Array.isArray((data as any).message)) {
          errorMessage = (data as any).message.join(', ');
        }
      }
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.response = { data };
      throw error;
    }

    throw new Error('Respuesta inválida del servidor');
  }

  /**
   * Refresh del access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    // Si ya está refrescando, esperar
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => {
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(config.STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        this.handleLogout();
        return null;
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        ...CORS_CONFIG,
      });

      if (!response.ok) {
        this.handleLogout();
        return null;
      }

      const data = await response.json();
      const newToken = data.data.accessToken;

      // Guardar nuevo token
      localStorage.setItem(config.STORAGE_KEYS.AUTH_TOKEN, newToken);

      // Notificar a todos los subscribers
      this.refreshSubscribers.forEach((callback) => callback(newToken));
      this.refreshSubscribers = [];

      return newToken;
    } catch (error) {
      this.handleLogout();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Logout y limpiar datos
   */
  private handleLogout(): void {
    localStorage.removeItem(config.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(config.STORAGE_KEYS.USER_DATA);

    toast.error('Sesión expirada', {
      description: 'Por favor, inicia sesión nuevamente',
    });

    // Redirigir a login
    window.location.href = '/login';
  }

  /**
   * Muestra toast de error según el código HTTP
   */
  private showErrorToast(status: number, message: string): void {
    const errorMessages: Record<number, string> = {
      400: 'Solicitud inválida',
      401: 'No autorizado',
      403: 'Acceso denegado',
      404: 'Recurso no encontrado',
      422: 'Error de validación',
      429: 'Demasiadas solicitudes',
      500: 'Error interno del servidor',
      502: 'Gateway no disponible',
      503: 'Servicio no disponible',
    };

    const title = errorMessages[status] || 'Error';

    toast.error(title, {
      description: message,
      duration: 5000,
    });
  }

  /**
   * Construye URL completa con parámetros
   *
   * En modo 'gateway': /auth/api/v1/login -> http://localhost:3000/auth/api/v1/login
   * En modo 'direct':  /auth/api/v1/login -> http://localhost:3002/login
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    let fullUrl: string;

    // En modo directo, extraer el servicio del endpoint y redirigir al puerto correcto
    if (API_MODE === 'direct' && endpoint.startsWith('/')) {
      const serviceUrlMap = MICROSERVICE_URLS as Record<string, string>;

      // Extraer el nombre del servicio del endpoint
      // Ejemplo: /auth/api/v1/login -> auth
      const match = endpoint.match(/^\/([^/]+)\/api\/v\d+(.*)$/);

      if (match) {
        const [, serviceName, restPath] = match;
        const serviceUrl = serviceUrlMap[serviceName];

        if (serviceUrl) {
          // Construir URL directa al microservicio
          // En modo directo, algunos servicios mantienen /api/v1, otros no
          // Por ahora, mantenemos el path completo incluyendo /api/v1 si existe
          const path = restPath || '/';
          fullUrl = `${serviceUrl}${path}`;
          console.log('🔗 API Client [DIRECT MODE]:', {
            endpoint,
            serviceName,
            serviceUrl,
            restPath: path,
            finalURL: fullUrl,
          });
        } else {
          // Servicio no encontrado, usar baseURL normal
          console.warn(`⚠️ Servicio '${serviceName}' no encontrado en MICROSERVICE_URLS, usando baseURL`);
          fullUrl = `${this.baseURL}${endpoint}`;
        }
      } else {
        // No es un endpoint con formato de servicio, usar baseURL
        fullUrl = `${this.baseURL}${endpoint}`;
      }
    } else {
      // Modo gateway: comportamiento normal
      if (endpoint.startsWith('/')) {
        const base = this.baseURL.replace(/\/$/, '');
        const path = endpoint.replace(/^\//, '');
        fullUrl = `${base}/${path}`;
      } else {
        fullUrl = new URL(endpoint, this.baseURL).toString();
      }

      console.log('🔗 API Client [GATEWAY MODE]:', {
        endpoint,
        baseURL: this.baseURL,
        finalURL: fullUrl,
      });
    }

    // Agregar parámetros de query
    if (params && Object.keys(params).length > 0) {
      const url = new URL(fullUrl);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
      fullUrl = url.toString();
    }

    return fullUrl;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Limpia cache (si está habilitado)
   */
  public clearCache(): void {
    if (config.FEATURES.enableCache) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(config.STORAGE_KEYS.CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    }
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
