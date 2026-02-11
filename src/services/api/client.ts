/**
 * API Client
 * Cliente HTTP centralizado con manejo de autenticación, errores y refresh tokens
 */

import { getBaseURL, STORAGE_KEYS, API_CONFIG, APIResponse, APIError } from './config';

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
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }
    
    return url.toString();
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

      const data: APIResponse<{ accessToken: string; refreshToken: string }> = await response.json();
      
      if (data.exito && data.datos) {
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
      const data: APIResponse<T> | APIError = await response.json();

      // Si no es exitoso, lanzar error
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
