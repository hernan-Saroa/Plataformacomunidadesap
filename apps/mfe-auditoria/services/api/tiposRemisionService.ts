import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
// El apiClient ya usa buildApiUrl que maneja el modo gateway/direct
const SERVICE_PREFIX = '/control-disciplinario/api/v1';

export interface TipoRemision {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  orden?: number;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export const tiposRemisionService = {
  async getAll(): Promise<TipoRemision[]> {
    return apiClient.get<TipoRemision[]>(
      `${SERVICE_PREFIX}/tipos-remision`,
    );
  },

  async getActivas(): Promise<TipoRemision[]> {
    return apiClient.get<TipoRemision[]>(
      `${SERVICE_PREFIX}/tipos-remision/activas`,
    );
  },

  async getById(id: string): Promise<TipoRemision> {
    return apiClient.get<TipoRemision>(
      `${SERVICE_PREFIX}/tipos-remision/${id}`,
    );
  },

  async create(data: {
    codigo: string;
    nombre: string;
    descripcion?: string;
  }): Promise<TipoRemision> {
    return apiClient.post<TipoRemision>(
      `${SERVICE_PREFIX}/tipos-remision`,
      data,
    );
  },

  async update(
    id: string,
    data: Partial<TipoRemision>,
  ): Promise<TipoRemision> {
    return apiClient.put<TipoRemision>(
      `${SERVICE_PREFIX}/tipos-remision/${id}`,
      data,
    );
  },

  async toggleActivo(id: string, activo: boolean): Promise<TipoRemision> {
    return apiClient.put<TipoRemision>(
      `${SERVICE_PREFIX}/tipos-remision/${id}/toggle-activo`,
      { activo },
    );
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`${SERVICE_PREFIX}/tipos-remision/${id}`);
  },

  async seed(): Promise<void> {
    return apiClient.post(`${SERVICE_PREFIX}/tipos-remision/seed`);
  },
};
