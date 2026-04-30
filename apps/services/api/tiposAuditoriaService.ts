/**
 * Servicio para Tipos de Auditoría
 * Conecta con el backend: /tipos-auditoria
 */

import { apiClient } from './apiClient';
import { getServiceUrl, API_MODE } from '../../config/environment';

const CONTROL_INTERNO_BASE_URL = getServiceUrl('control-institucional');
const SERVICE_PREFIX = API_MODE === 'gateway' ? '/control-institucional/api/v1' : '/api/v1';
const MICROSERVICIO_PORT = 3007; // Puerto del internal-institutional-control-service

/**
 * Detecta si estamos en localhost para hacer peticiones directas al microservicio
 */
function esLocalhost(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
}

export interface TipoAuditoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  alcance?: string;
  duracionPromedio: number;
  equipoPromedio: number;
  color: string;
  activa: boolean;
  auditoriasProgramadas: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateTipoAuditoriaDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  alcance?: string;
  duracionPromedio?: number;
  equipoPromedio?: number;
  color?: string;
  activa?: boolean;
}

export interface UpdateTipoAuditoriaDto extends Partial<CreateTipoAuditoriaDto> {}

class TiposAuditoriaAPIClient {
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
    // Si estamos en localhost, ir directo al microservicio (sin prefijos /api/v1)
    let url: string;
    if (esLocalhost()) {
      url = `http://localhost:${MICROSERVICIO_PORT}${endpoint}`;
    } else {
      url = `${this.baseURL}${this.servicePrefix}${endpoint}`;
    }
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json; charset=utf-8',
    };

    const token = sessionStorage.getItem('esap_auth_token');
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
   * Obtener todos los tipos de auditoría
   */
  async getAll(includeInactive: boolean = false): Promise<TipoAuditoria[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.request<TipoAuditoria[]>(`/tipos-auditoria${params}`);
  }

  /**
   * Obtener un tipo de auditoría por ID
   */
  async getById(id: string): Promise<TipoAuditoria> {
    return this.request<TipoAuditoria>(`/tipos-auditoria/${id}`);
  }

  /**
   * Crear un nuevo tipo de auditoría
   */
  async create(data: CreateTipoAuditoriaDto): Promise<TipoAuditoria> {
    return this.request<TipoAuditoria>('/tipos-auditoria', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Actualizar un tipo de auditoría
   */
  async update(id: string, data: UpdateTipoAuditoriaDto): Promise<TipoAuditoria> {
    return this.request<TipoAuditoria>(`/tipos-auditoria/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Eliminar un tipo de auditoría (soft delete)
   */
  async delete(id: string): Promise<void> {
    return this.request<void>(`/tipos-auditoria/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Restaurar un tipo de auditoría eliminado
   */
  async restore(id: string): Promise<TipoAuditoria> {
    return this.request<TipoAuditoria>(`/tipos-auditoria/${id}/restore`, {
      method: 'POST',
    });
  }
}

export const tiposAuditoriaService = new TiposAuditoriaAPIClient();
