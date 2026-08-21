import { getApiGatewayBaseUrl } from '../../../config/environment';

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
    try {
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
        throw new Error(`API error ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (error) {
      console.warn(`[ApiClient] GET ${endpoint} falló o dev de respaldo activado:`, error);
      throw error;
    }
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
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
