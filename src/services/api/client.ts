/**
 * API Client
 * Cliente HTTP centralizado con manejo de autenticación, errores y refresh tokens
 *
 * MODOS DE CONEXIÓN:
 * - Gateway Mode: Todas las requests van a http://localhost:3000/{service}/api/v1/{path}
 * - Direct Mode: Cada servicio en su puerto http://localhost:300X/{path}
 */

import { getBaseURL, STORAGE_KEYS, API_CONFIG, APIResponse, APIError } from './config';
import { API_MODE, MICROSERVICE_URLS } from '../../config/environment';

/**
 * Custom error para errores de API
 */
export class APIClientError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'APIClientError';
  }
}

/**
 * Opciones para requests
 */
interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
  requiresAuth?: boolean;
  skipErrorHandling?: boolean;
}

/**
 * API Client Class
 */
class APIClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.baseURL = getBaseURL();
  }

  /**
   * Obtener token de acceso del localStorage
   */
  private getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  /**
   * Obtener refresh token del localStorage
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Guardar tokens en localStorage
   */
  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }

  /**
   * Limpiar tokens del localStorage
   */
  private clearTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(STORAGE_KEYS.SISTEMA_ACTUAL);
  }

  /**
   * Construir URL con query parameters
   *
   * En modo 'gateway': /auth/api/v1/roles -> http://localhost:3000/auth/api/v1/roles
   * En modo 'direct':  /auth/api/v1/roles -> http://localhost:3001/roles
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    let fullUrl: string;

    // En modo directo, extraer el servicio del endpoint y redirigir al puerto correcto
    if (API_MODE === 'direct' && endpoint.startsWith('/')) {
      const serviceUrlMap = MICROSERVICE_URLS as Record<string, string>;

      // Extraer el nombre del servicio del endpoint
      // Ejemplo: /auth/api/v1/roles -> auth
      const match = endpoint.match(/^\/([^/]+)\/api\/v\d+(.*)$/);

      if (match) {
        const [, serviceName, restPath] = match;
        const serviceUrl = serviceUrlMap[serviceName];

        if (serviceUrl) {
          // Eliminar el prefijo /api/v1 si existe, ya que los microservicios en modo directo
          // pueden no esperarlo si sus controladores no lo definen (como en legal-management ahora)
          const cleanPath = (restPath || '/').replace(/^\/api\/v\d+/, '');

          // Construir URL directa al microservicio (sin el prefijo del servicio ni versión)
          fullUrl = `${serviceUrl}${cleanPath}`;

          console.log('🔗 API Client [DIRECT MODE]:', {
            endpoint,
            serviceName,
            serviceUrl,
            originalPath: restPath,
            cleanPath,
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
      fullUrl = `${this.baseURL}${endpoint}`;
      console.log('🔗 API Client [GATEWAY MODE]:', {
        endpoint,
        baseURL: this.baseURL,
        finalURL: fullUrl,
      });
    }

    // Agregar parámetros de query
    if (params) {
      const url = new URL(fullUrl);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
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
   * Agregar token de autorización al header
   */
  private addAuthHeader(headers: HeadersInit = {}): HeadersInit {
    const token = this.getAccessToken();
    if (token) {
      return {
        ...headers,
        'Authorization': `Bearer ${token}`,
      };
    }
    return headers;
  }

  /**
   * Manejar refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.headers,
          'X-Refresh-Token': refreshToken,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data: any = await response.json();

      // Verificar formato del backend
      if (data.success && data.data) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return data.data.accessToken;
      } else if (data.exito && data.datos) {
        // Formato alternativo
        this.setTokens(data.datos.accessToken, data.datos.refreshToken);
        return data.datos.accessToken;
      }

      throw new Error('Invalid refresh response');
    } catch (error) {
      this.clearTokens();
      // Redirigir al login
      window.location.href = '/login';
      throw error;
    }
  }

  /**
   * Agregar suscriptor para esperar refresh token
   */
  private subscribeTokenRefresh(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }

  /**
   * Notificar a todos los suscriptores cuando el token se refresque
   */
  private onTokenRefreshed(token: string): void {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  /**
   * Realizar request HTTP
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      params,
      requiresAuth = true,
      skipErrorHandling = false,
      headers = {},
      ...fetchOptions
    } = options;

    const url = this.buildURL(endpoint, params);

    const requestHeaders = {
      ...API_CONFIG.headers,
      ...headers,
      ...(requiresAuth ? this.addAuthHeader() : {}),
    };

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
      });

      // Si es 401 y requiere auth, intentar refresh token
      if (response.status === 401 && requiresAuth) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshAccessToken();
            this.isRefreshing = false;
            this.onTokenRefreshed(newToken);

            // Reintentar request original con nuevo token
            return this.request<T>(endpoint, options);
          } catch (error) {
            this.isRefreshing = false;
            throw error;
          }
        } else {
          // Esperar a que el refresh termine
          return new Promise<T>((resolve, reject) => {
            this.subscribeTokenRefresh((token) => {
              this.request<T>(endpoint, options)
                .then(resolve)
                .catch(reject);
            });
          });
        }
      }

      // Parsear respuesta
      const data: any = await response.json();

      // Verificar si es el formato del backend (success/data) o el formato esperado (exito/datos)
      if (data.success !== undefined) {
        // Formato del backend: { success: true, data: {...}, timestamp: ... }
        if (!data.success) {
          throw new APIClientError(
            response.status,
            'BACKEND_ERROR',
            data.message || 'Error del servidor',
            data.details
          );
        }
        return data.data as T;
      } else if (data.exito !== undefined) {
        // Formato esperado: { exito: true, datos: {...} }
        if (!data.exito) {
          const errorData = data as APIError;
          throw new APIClientError(
            response.status,
            errorData.error.codigo,
            errorData.error.mensaje,
            errorData.error.detalles
          );
        }

        // Retornar datos
        const successData = data as APIResponse<T>;
        return successData.datos as T;
      } else {
        // Formato desconocido, asumir que los datos están directamente en la respuesta
        return data as T;
      }

    } catch (error) {
      if (skipErrorHandling) {
        throw error;
      }

      // Manejar errores de red
      if (error instanceof TypeError) {
        throw new APIClientError(
          0,
          'NETWORK_ERROR',
          'Error de conexión. Por favor verifica tu conexión a internet.'
        );
      }

      // Re-lanzar errores de API
      if (error instanceof APIClientError) {
        throw error;
      }

      // Otros errores
      throw new APIClientError(
        500,
        'UNKNOWN_ERROR',
        'Ocurrió un error inesperado. Por favor intenta nuevamente.'
      );
    }
  }

  /**
   * Métodos HTTP
   */

  async get<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, body?: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Obtener archivo binario (Blob)
   */
  async getBlob(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<Blob> {
    const { params, requiresAuth = true, headers = {}, ...fetchOptions } = options;
    const url = this.buildURL(endpoint, params);
    const requestHeaders = {
      ...API_CONFIG.headers,
      ...headers,
      ...(requiresAuth ? this.addAuthHeader() : {}),
    };

    // Remove Content-Type (unnecessary for GET, may conflict)
    delete (requestHeaders as any)['Content-Type'];

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'GET',
      headers: requestHeaders,
    });

    if (!response.ok) {
      throw new APIClientError(response.status, 'DOWNLOAD_ERROR', 'Error descargando archivo');
    }

    return response.blob();
  }

  /**
   * Upload de archivos (FormData)
   */
  async upload<T = any>(endpoint: string, formData: FormData, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    const { headers = {}, ...restOptions } = options;

    // No incluir Content-Type para FormData (el browser lo setea automáticamente)
    const uploadHeaders = { ...headers };
    delete (uploadHeaders as any)['Content-Type'];

    return this.request<T>(endpoint, {
      ...restOptions,
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    });
  }

  /**
   * Métodos de autenticación
   */

  login(accessToken: string, refreshToken: string, userData: any): void {
    this.setTokens(accessToken, refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  }

  logout(): void {
    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getUserData(): any | null {
    const data = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return data ? JSON.parse(data) : null;
  }
}

// Exportar instancia singleton
export const apiClient = new APIClient();

// Exportar también la clase por si se necesita crear instancias adicionales
export default apiClient;
