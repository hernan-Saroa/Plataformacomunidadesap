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

import { config, getDefaultHeaders, getUserContextHeaders, CORS_CONFIG, API_MODE, MICROSERVICE_URLS, API_ENDPOINTS } from '../../config/environment';
import type { ApiResponse, ApiError } from '../../types';
import { toast } from 'sonner';
import { offlineCache } from './offlineCache';
import { syncEngine } from './syncEngine';
import { getAppOnlineStatus } from '../../utils/connectivity';
import { getAccessToken, setAuthTokens } from './authTokenStore';

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
  skipErrorToast?: boolean;
  skipErrorLog?: boolean;
  skipAuthRefresh?: boolean;
  retries?: number;
}

interface RetryConfig {
  attempts: number;
  delay: number;
}

export interface UploadProgressDetail {
  progress: number;
  loaded: number;
  total: number;
}

export interface UploadRequestOptions {
  onProgress?: (progress: number) => void;
  onProgressDetail?: (detail: UploadProgressDetail) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipAuth?: boolean;
  skipAuthRefresh?: boolean;
  _authRetry?: boolean;
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
   * GET request para archivos binarios (Blob)
   */
  async getBlob(
    endpoint: string,
    params?: Record<string, any>,
    customConfig?: RequestConfig
  ): Promise<Blob> {
    const url = this.buildURL(endpoint, params);
    const {
      skipAuth = false,
      skipErrorToast = false,
      skipAuthRefresh = false,
      ...fetchConfig
    } = customConfig || {};

    return this.executeBlobRequest(url, fetchConfig, skipAuth, skipErrorToast, !skipAuthRefresh);
  }

  /**
   * POST request
   */
  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    customConfig?: RequestConfig
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    const isFormData = data instanceof FormData;

    return this.request<T>(url, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
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
    const isFormData = data instanceof FormData;

    return this.request<T>(url, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
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
    const isFormData = data instanceof FormData;

    return this.request<T>(url, {
      method: 'PATCH',
      body: isFormData ? data : JSON.stringify(data),
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
    options?: UploadRequestOptions | ((progress: number) => void)
  ): Promise<T> {
    const url = this.buildURL(endpoint);
    const resolvedOptions: UploadRequestOptions = typeof options === 'function'
      ? { onProgress: options }
      : (options || {});
    const {
      onProgress,
      onProgressDetail,
      signal,
      timeoutMs,
      skipAuth = false,
      skipAuthRefresh = false,
      _authRetry = false,
    } = resolvedOptions;

    // Para upload, no enviamos Content-Type header (el browser lo setea automáticamente con boundary)
    const headers = skipAuth
      ? getDefaultHeaders(false)
      : this.addAuthHeader(getDefaultHeaders(true));
    delete (headers as any)['Content-Type'];

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let abortHandler: (() => void) | null = null;

      if (signal?.aborted) {
        reject(new DOMException('Carga cancelada por el usuario', 'AbortError'));
        return;
      }

      // Progress tracking
      if (onProgress || onProgressDetail) {
        xhr.upload.addEventListener('progress', (e) => {
          const total = e.lengthComputable ? e.total : 0;
          const progress = total > 0 ? Math.round((e.loaded / total) * 100) : 0;
          onProgress?.(progress);
          onProgressDetail?.({
            progress,
            loaded: e.loaded,
            total,
          });
        });
      }

      // Success
      xhr.addEventListener('load', async () => {
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
        } else if (xhr.status === 401 && !skipAuth && !skipAuthRefresh && !_authRetry) {
          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              resolve(this.upload<T>(endpoint, formData, {
                ...resolvedOptions,
                _authRetry: true,
              }));
              return;
            }
            reject(new Error('Sesion expirada. Por favor, inicia sesion nuevamente.'));
          } catch {
            reject(new Error('Sesion expirada. Por favor, inicia sesion nuevamente.'));
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

      xhr.addEventListener('abort', () => {
        reject(new DOMException('Carga cancelada por el usuario', 'AbortError'));
      });

      // Timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Timeout al subir archivo'));
      });

      xhr.open('POST', url);
      xhr.withCredentials = true;

      // Set headers
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });

      if (signal) {
        abortHandler = () => xhr.abort();
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      xhr.timeout = timeoutMs ?? this.timeout;
      xhr.send(formData);

      xhr.addEventListener('loadend', () => {
        if (signal && abortHandler) {
          signal.removeEventListener('abort', abortHandler);
        }
      });
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
      skipErrorLog = false,
      skipAuthRefresh = false,
      retries = this.retryConfig.attempts,
      ...fetchConfig
    } = customConfig;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        return await this.executeRequest<T>(url, fetchConfig, skipAuth, skipErrorToast, !skipAuthRefresh, skipErrorLog);
      } catch (error: any) {
        lastError = error;
        attempt++;

        // No reintentar en estos casos
        if (
          error.status === 401 || // Unauthorized
          error.status === 403 || // Forbidden
          error.status === 404 || // Not found
          error.status === 422 || // Validation error
          !error.status ||        // Error de red: servicio no disponible (ERR_CONNECTION_REFUSED, timeout, etc.)
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
    skipErrorToast: boolean,
    allowRefresh = true,
    skipErrorLog = false,
  ): Promise<T> {
    const isGet = !fetchConfig.method || fetchConfig.method.toUpperCase() === 'GET';
    const isMutation = fetchConfig.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchConfig.method.toUpperCase());

    // 🔴 MODO OFFLINE: Interceptar si no hay conexión
    if (!getAppOnlineStatus()) {
      if (isGet) {
        try {
          const cached = await offlineCache.getCache(url);
          if (cached) {
            console.log('📦 Servido desde caché local (offline):', url);
            return cached;
          }
          throw new Error('No hay conexión a internet y no hay datos en caché para esta consulta');
        } catch (e) {
          if (!skipErrorToast) toast.error('Sin conexión a internet');
          throw e;
        }
      } else if (isMutation) {
        const method = fetchConfig.method || 'POST';
        // Encolar mutación para luego
        await offlineCache.queueMutation(url, method, fetchConfig.body, fetchConfig.headers || {});
        
        console.log('📦 Petición encolada para sincronización:', method, url);
        toast.info('Modo sin conexión', { 
          description: 'Tu cambio fue guardado localmente y se sincronizará automáticamente cuando vuelva el internet.' 
        });
        
        // Retornar éxito optimista (falso) para que la UI no se bloquee
        return { success: true, message: 'Encolado offline', data: null } as any;
      }
    }

    // 🟢 MODO ONLINE
    const headers = skipAuth
      ? { 'Content-Type': 'application/json; charset=utf-8' }
      : this.addAuthHeader(getDefaultHeaders(true));
    this.addLegalContextHeaders(url, headers);

    // Si el body es FormData, quitamos el Content-Type para que el navegador lo ponga con el boundary
    if (fetchConfig.body instanceof FormData) {
      delete (headers as any)['Content-Type'];
    }

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

      // Token expirado: refrescar y reintentar UNA sola vez conservando método y body.
      if (response.status === 401 && !skipAuth && allowRefresh) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          return this.executeRequest<T>(url, fetchConfig, skipAuth, skipErrorToast, false, skipErrorLog);
        }
        const expiredError: any = new Error('Sesion expirada. Por favor, inicia sesion nuevamente.');
        expiredError.status = 401;
        throw expiredError;
      }

      // Manejo de respuesta
      const responseData = await this.handleResponse<T>(response, skipErrorToast, skipAuth);
      
      // 💾 CACHÉ SILENCIOSA: Guardar respuestas GET exitosas
      if (isGet && typeof navigator !== 'undefined') {
        offlineCache.setCache(url, responseData).catch(e => console.error('Error guardando caché:', e));
      }
      
      return responseData;
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Errores de red (servicio no disponible) — solo warn, no spam
      if (!skipErrorLog && !url.includes('/notificaciones/') && !url.includes(':3009/') && !url.includes('/notifications')) {
        if (!error.status && (error.name === 'TypeError' || error.name === 'AbortError')) {
          // console.warn('⚠️ Servicio no disponible:', url);
        } else {
          // console.log('🔴 Error en request:', error);
        }
      }

      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Ejecuta request GET para respuesta binaria (Blob)
   */
  private async executeBlobRequest(
    url: string,
    fetchConfig: RequestInit,
    skipAuth: boolean,
    skipErrorToast: boolean,
    allowRefresh = true,
  ): Promise<Blob> {
    const headers = skipAuth
      ? { Accept: '*/*' }
      : this.addAuthHeader(getDefaultHeaders(true));

    // Para descargas no enviamos Content-Type JSON.
    delete (headers as any)['Content-Type'];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        method: 'GET',
        headers: {
          ...headers,
          ...fetchConfig.headers,
        },
        signal: controller.signal,
        ...CORS_CONFIG,
      });

      clearTimeout(timeoutId);

      // Token expirado: refrescar y reintentar una sola vez.
      if (response.status === 401 && !skipAuth && allowRefresh) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          return this.executeBlobRequest(url, fetchConfig, skipAuth, skipErrorToast, false);
        }
        const expiredError: any = new Error('Sesion expirada. Por favor, inicia sesion nuevamente.');
        expiredError.status = 401;
        throw expiredError;
      }

      if (!response.ok) {
        let errorMessage = 'Error al descargar archivo';

        try {
          const text = await response.text();
          if (text) {
            try {
              const parsed = JSON.parse(text);
              if (typeof parsed?.message === 'string') {
                errorMessage = parsed.message;
              } else if (Array.isArray(parsed?.message)) {
                errorMessage = parsed.message.join(', ');
              } else if (typeof parsed?.error === 'string') {
                errorMessage = parsed.error;
              }
            } catch {
              errorMessage = text;
            }
          }
        } catch {
          // Mantener mensaje por defecto
        }

        if (!skipErrorToast) {
          this.showErrorToast(response.status, errorMessage);
        }

        const error: any = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      return response.blob();
    } catch (error: any) {
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
    // Si es 204 No Content, retornar null
    if (response.status === 204) {
      return null as T;
    }

    // Parse response
    let data: ApiResponse<T> | ApiError;
    let rawText = '';

    try {
      rawText = await response.text();
    } catch (error: any) {
      const readError: any = new Error(
        error?.message || 'Error al leer respuesta del servidor'
      );
      readError.status = response.status;
      readError.response = { status: response.status };
      throw readError;
    }

    if (!rawText) {
      if (response.ok) {
        data = {} as any; // For 200 OK with empty body
      } else {
        const emptyError: any = new Error('Error en la petición (sin detalles)');
        emptyError.status = response.status;
        emptyError.response = { status: response.status, data: null };
        throw emptyError;
      }
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        if (response.ok) {
          data = {} as any;
        } else {
          const plainTextError: any = new Error(rawText);
          plainTextError.status = response.status;
          plainTextError.response = {
            status: response.status,
            data: { message: rawText },
          };
          throw plainTextError;
        }
      }
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
      let details = (data as any).error?.details || null;

      // 1. Preferir siempre `message` si existe en el objeto raíz y es un string o array
      if ('message' in data && data.message) {
        if (typeof data.message === 'string' && data.message.trim() !== '') {
          errorMessage = data.message;
        } else if (Array.isArray(data.message) && data.message.length > 0) {
          errorMessage = data.message.join(', ');
        }
      } else if (typeof data.error === 'string') {
        // 2. Si error es string
        errorMessage = data.error || errorMessage;
      } else if (typeof data.error === 'object' && data.error !== null) {
        // 3. Si error es objeto con message
        const errObj = data.error as any;
        if (typeof errObj.message === 'string') {
          errorMessage = errObj.message || errorMessage;
        } else if (Array.isArray(errObj.message)) {
          errorMessage = errObj.message.join(', ');
        }
      }

      if ((data as any).error === 'Unauthorized' && 'message' in data && typeof (data as any).message === 'string') {
        details = (data as any).message;
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
   * Refresh del access token.
   * El token viaja como cookie HttpOnly: el frontend no lo lee ni lo guarda.
   */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token: string) => resolve(token || null));
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(this.buildURL(API_ENDPOINTS.AUTH.REFRESH), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...CORS_CONFIG,
      });

      if (!response.ok) {
        console.warn('Token refresh failed with status:', response.status);
        this.resolveRefreshSubscribers(null);
        return null;
      }

      const data = await response.json().catch(() => null);
      const accessToken = data?.data?.accessToken || data?.accessToken;
      const refreshToken = data?.data?.refreshToken || data?.refreshToken;
      if (accessToken) {
        setAuthTokens(accessToken, refreshToken || accessToken);
      }

      this.resolveRefreshSubscribers('cookie-refreshed');
      return 'cookie-refreshed';
    } catch (error) {
      console.warn('Token refresh error:', error);
      this.resolveRefreshSubscribers(null);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Resuelve las solicitudes que esperaban el refresh sin exponer tokens al frontend.
   */
  private resolveRefreshSubscribers(token: string | null): void {
    this.refreshSubscribers.forEach((callback) => callback(token || ''));
    this.refreshSubscribers = [];
  }

  public addAuthHeader(headers: HeadersInit = {}): HeadersInit {
    const accessToken = getAccessToken();
    if (!accessToken) return headers;

    return {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    };
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

  private addLegalContextHeaders(url: string, headers: HeadersInit): void {
    if (!this.isLegalManagementUrl(url)) return;
    Object.assign(headers as Record<string, string>, getUserContextHeaders());
  }

  private isLegalManagementUrl(url: string): boolean {
    return url.includes('/legal/api/') || url.includes(':3008/');
  }
}

// Singleton instance
export const apiClient = new ApiClient();
export default apiClient;
