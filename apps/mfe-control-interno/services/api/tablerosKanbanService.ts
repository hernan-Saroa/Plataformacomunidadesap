/**
 * Servicio para Tableros Kanban
 * Conecta con el backend: /tableros-kanban
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

export enum TipoTablero {
  AUDITORIAS = 'auditorias',
  PLANES_MEJORAMIENTO = 'planes_mejoramiento',
}

export enum EstadoEtapa {
  INICIAL = 'inicial',
  INTERMEDIA = 'intermedia',
  FINAL = 'final',
}

export interface EtapaKanban {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  color: string;
  tiempoSLA: number;
  limiteWIP: number | null;
  visible: boolean;
  notificarVencimiento: boolean;
  diasAnticipacionAlerta: number;
  estado: EstadoEtapa;
  permitirRetroceso: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TableroKanban {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoTablero;
  activo: boolean;
  etapas: EtapaKanban[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEtapaKanbanDto {
  nombre: string;
  descripcion?: string;
  orden: number;
  color: string;
  tiempoSLA: number;
  limiteWIP?: number | null;
  visible?: boolean;
  notificarVencimiento?: boolean;
  diasAnticipacionAlerta?: number;
  estado: EstadoEtapa;
  permitirRetroceso?: boolean;
}

export interface UpdateEtapaKanbanDto extends Partial<CreateEtapaKanbanDto> {}

export interface CreateTableroKanbanDto {
  nombre: string;
  descripcion?: string;
  tipo: TipoTablero;
  activo?: boolean;
  etapas?: CreateEtapaKanbanDto[];
}

export interface UpdateTableroKanbanDto extends Partial<CreateTableroKanbanDto> {}

class TablerosKanbanAPIClient {
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
    // En localhost, ir directo al microservicio sin prefijo /api/v1
    // En otros entornos, usar el gateway con el prefijo
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

    const token = localStorage.getItem('esap_auth_token');
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
      // Si es 404, devolver un error con información específica
      if (response.status === 404) {
        const error = await response.json().catch(() => ({ message: 'Not Found' }));
        const err = new Error(error.message || 'Not Found');
        (err as any).status = 404;
        throw err;
      }
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
   * Obtener todos los tableros
   */
  async getAll(includeInactive: boolean = false): Promise<TableroKanban[]> {
    const params = includeInactive ? '?includeInactive=true' : '';
    return this.request<TableroKanban[]>(`/tableros-kanban${params}`);
  }

  /**
   * Obtener un tablero por ID
   */
  async getById(id: string): Promise<TableroKanban> {
    return this.request<TableroKanban>(`/tableros-kanban/${id}`);
  }

  /**
   * Obtener tablero por tipo
   */
  async getByTipo(tipo: TipoTablero): Promise<TableroKanban | null> {
    try {
      const result = await this.request<TableroKanban>(`/tableros-kanban/tipo/${tipo}`);
      return result;
    } catch (error: any) {
      // Si es un 404 o Not Found, devolver null (no hay tablero de ese tipo)
      if (error?.message?.includes('404') || error?.message?.includes('Not Found')) {
        return null;
      }
      // Para otros errores, relanzar
      throw error;
    }
  }

  /**
   * Crear un nuevo tablero
   */
  async create(data: CreateTableroKanbanDto): Promise<TableroKanban> {
    return this.request<TableroKanban>('/tableros-kanban', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Actualizar un tablero
   */
  async update(id: string, data: UpdateTableroKanbanDto): Promise<TableroKanban> {
    return this.request<TableroKanban>(`/tableros-kanban/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Eliminar un tablero (soft delete)
   */
  async delete(id: string): Promise<void> {
    return this.request<void>(`/tableros-kanban/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Restaurar un tablero eliminado
   */
  async restore(id: string): Promise<TableroKanban> {
    return this.request<TableroKanban>(`/tableros-kanban/${id}/restore`, {
      method: 'POST',
    });
  }

  // ============================================
  // MÉTODOS PARA ETAPAS
  // ============================================

  /**
   * Crear una nueva etapa
   */
  async createEtapa(tableroId: string, data: CreateEtapaKanbanDto): Promise<EtapaKanban> {
    return this.request<EtapaKanban>(`/tableros-kanban/${tableroId}/etapas`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Actualizar una etapa
   */
  async updateEtapa(
    tableroId: string,
    etapaId: string,
    data: UpdateEtapaKanbanDto
  ): Promise<EtapaKanban> {
    return this.request<EtapaKanban>(`/tableros-kanban/${tableroId}/etapas/${etapaId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Eliminar una etapa
   */
  async deleteEtapa(tableroId: string, etapaId: string): Promise<void> {
    return this.request<void>(`/tableros-kanban/${tableroId}/etapas/${etapaId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Reordenar etapas
   */
  async reordenarEtapas(tableroId: string, etapasIds: string[]): Promise<EtapaKanban[]> {
    return this.request<EtapaKanban[]>(`/tableros-kanban/${tableroId}/etapas/reordenar`, {
      method: 'POST',
      body: JSON.stringify({ etapasIds }),
    });
  }
}

export const tablerosKanbanService = new TablerosKanbanAPIClient();

