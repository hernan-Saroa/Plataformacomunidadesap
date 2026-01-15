/**
 * Servicio para Listas de Chequeo
 * Conecta con el backend: /listas-chequeo
 */

import { apiClient } from './apiClient';
import { getServiceUrl, API_MODE } from '../../config/environment';

const CONTROL_INTERNO_BASE_URL = getServiceUrl('control-institucional');
const SERVICE_PREFIX = API_MODE === 'gateway' ? '/control-institucional/api/v1' : '/api/v1';

export interface ItemListaChequeo {
  id: string;
  texto: string;
  categoria?: string;
  obligatorio: boolean;
  orden: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListaChequeo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoAuditoriaId?: string;
  tipoAuditoria?: {
    id: string;
    codigo: string;
    nombre: string;
  };
  items: ItemListaChequeo[];
  activa: boolean;
  usosProgramados: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateItemListaChequeoDto {
  texto: string;
  categoria?: string;
  obligatorio?: boolean;
  orden?: number;
}

export interface CreateListaChequeoDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoAuditoriaId?: string;
  items: CreateItemListaChequeoDto[];
  activa?: boolean;
}

export interface UpdateListaChequeoDto extends Partial<CreateListaChequeoDto> {}

class ListasChequeoAPIClient {
  private baseURL: string;
  private servicePrefix: string;

  constructor() {
    this.baseURL = CONTROL_INTERNO_BASE_URL;
    this.servicePrefix = SERVICE_PREFIX;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${this.servicePrefix}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
    };

    const token = localStorage.getItem('esap_access_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType?.includes('application/json')) {
      return {} as T;
    }

    return response.json();
  }

  /**
   * Obtener todas las listas de chequeo
   */
  async getAll(includeInactive: boolean = false): Promise<ListaChequeo[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.request<ListaChequeo[]>(`/listas-chequeo${params}`);
  }

  /**
   * Obtener una lista de chequeo por ID
   */
  async getById(id: string): Promise<ListaChequeo> {
    return this.request<ListaChequeo>(`/listas-chequeo/${id}`);
  }

  /**
   * Crear una nueva lista de chequeo
   */
  async create(data: CreateListaChequeoDto): Promise<ListaChequeo> {
    return this.request<ListaChequeo>('/listas-chequeo', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Actualizar una lista de chequeo
   */
  async update(id: string, data: UpdateListaChequeoDto): Promise<ListaChequeo> {
    return this.request<ListaChequeo>(`/listas-chequeo/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Eliminar una lista de chequeo (soft delete)
   */
  async delete(id: string): Promise<void> {
    return this.request<void>(`/listas-chequeo/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Restaurar una lista de chequeo eliminada
   */
  async restore(id: string): Promise<ListaChequeo> {
    return this.request<ListaChequeo>(`/listas-chequeo/${id}/restore`, {
      method: 'POST',
    });
  }
}

export const listasChequeoService = new ListasChequeoAPIClient();
