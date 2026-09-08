import { getApiGatewayBaseUrl } from '../../../config/environment';

/**
 * Cliente API Base para mfe-contratacion
 *
 * Utiliza la configuración centralizada de entorno desde la Shell (mfe-contratacion/config/environment.ts)
 */
/**
 * Convierte una respuesta fallida en un mensaje que el usuario pueda accionar.
 *
 * `statusText` viene vacío en HTTP/2, así que solo con él los errores se veían
 * como "API error 500:". Se prefiere el mensaje del backend, que en NestJS
 * llega como { message } o { message: [] } en los errores de validación.
 */
async function mensajeDeError(response: Response): Promise<string> {
  if (response.status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (response.status === 403) {
    return 'No tienes permisos para esta acción.';
  }

  try {
    const cuerpo = await response.json();
    const mensaje = cuerpo?.message ?? cuerpo?.error;
    if (Array.isArray(mensaje) && mensaje.length) return mensaje.join('. ');
    if (typeof mensaje === 'string' && mensaje) return mensaje;
  } catch {
    // Respuesta sin JSON: se cae al mensaje genérico de abajo.
  }

  if (response.status >= 500) {
    return `El servidor respondió con un error (${response.status}). Puede que el servicio de contratación esté caído.`;
  }
  return `La solicitud falló (${response.status}).`;
}

export class ApiClient {
  private getBaseURL(): string {
    return getApiGatewayBaseUrl();
  }

  private buildURL(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.getBaseURL()}${cleanEndpoint}`;
  }

  async get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(await mensajeDeError(response));
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  async post<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
      ...options,
    });

    if (!response.ok) {
      throw new Error(await mensajeDeError(response));
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
