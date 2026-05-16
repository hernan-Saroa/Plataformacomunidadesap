import { apiClient } from './apiClient';

export interface AsignaturaDTO {
  id: string;
  codigo: string;
  nombre: string;
  programa_id: string;
  programa_nombre?: string;
  programa_codigo?: string;
  nivel?: string;
  nucleo: string;
  creditos: number;
  semestre: number;
  horas?: number;
  modalidad?: string;
  tipo?: string;
  prerequisitos?: string;
  nucleoTematico?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AsignaturasResponse {
  total: number;
  pagina: number;
  porPagina: number;
  data: AsignaturaDTO[];
}

export interface AsignaturasFiltro {
  search?: string;
  programa_id?: string;
  nucleo?: string;
  nivel?: string;
  semestre?: number;
  page?: number;
  limit?: number;
}

const SERVICE_PREFIX = '/auth/api/v1';

export const asignaturasService = {
  async listar(filtros: AsignaturasFiltro = {}): Promise<AsignaturasResponse> {
    return apiClient.get<AsignaturasResponse>(`${SERVICE_PREFIX}/asignaturas`, {
      params: filtros,
      requiresAuth: false,
    });
  },

  async obtener(id: string): Promise<AsignaturaDTO> {
    return apiClient.get<AsignaturaDTO>(`${SERVICE_PREFIX}/asignaturas/${id}`, {
      requiresAuth: false,
    });
  },

  async crear(asignatura: Omit<AsignaturaDTO, 'id' | 'created_at' | 'updated_at'>): Promise<AsignaturaDTO> {
    return apiClient.post<AsignaturaDTO>(`${SERVICE_PREFIX}/asignaturas`, asignatura);
  },

  async actualizar(id: string, asignatura: Partial<AsignaturaDTO>): Promise<AsignaturaDTO> {
    return apiClient.put<AsignaturaDTO>(`${SERVICE_PREFIX}/asignaturas/${id}`, asignatura);
  },

  async eliminar(id: string): Promise<void> {
    return apiClient.delete(`${SERVICE_PREFIX}/asignaturas/${id}`);
  },
};