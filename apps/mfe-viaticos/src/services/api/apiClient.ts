import { getApiGatewayBaseUrl } from '../../../config/environment';

export class ApiClient {
  private getBaseURL(): string {
    return getApiGatewayBaseUrl();
  }

  private buildURL(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.getBaseURL()}${cleanEndpoint}`;
  }

  private async parseErrorResponse(response: Response): Promise<never> {
    let parsed: any = {};
    const text = await response.text();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }
    const backendMessage = Array.isArray(parsed?.message)
      ? parsed.message.join(' ')
      : typeof parsed?.message === 'string'
        ? parsed.message
        : null;
    const message =
      backendMessage ||
      `API error ${response.status}: ${response.statusText}`;
    const err: any = new Error(message);
    err.status = response.status;
    err.info = parsed;
    err.response = { status: response.status, data: parsed };
    throw err;
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
        cache: 'no-store',
        ...options,
      });

      if (!response.ok) {
        await this.parseErrorResponse(response);
      }

      const text = await response.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } catch (error: any) {
      if (error && error.response) throw error;
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
      await this.parseErrorResponse(response);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  async upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      await this.parseErrorResponse(response);
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  }

  async put<T = any>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'PUT',
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

  async delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'DELETE',
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
  }

  async getBlob(endpoint: string): Promise<Blob> {
    const url = this.buildURL(endpoint);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
