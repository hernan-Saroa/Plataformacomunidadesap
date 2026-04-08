import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
// El apiClient ya usa buildApiUrl que maneja el modo gateway/direct
const SERVICE_PREFIX = '/control-disciplinario/api/v1';

export interface EntidadRemision {
  id: string;
  nombre: string;
  correo: string;
  activo: boolean;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export const entidadesRemisionService = {
  async getAll(): Promise<EntidadRemision[]> {
    return apiClient.get<EntidadRemision[]>(`${SERVICE_PREFIX}/entidades-remision`);
  },

  async getActivas(): Promise<EntidadRemision[]> {
    return apiClient.get<EntidadRemision[]>(`${SERVICE_PREFIX}/entidades-remision/activas`);
  },

  async getById(id: string): Promise<EntidadRemision> {
    return apiClient.get<EntidadRemision>(`${SERVICE_PREFIX}/entidades-remision/${id}`);
  },

  async create(data: { nombre: string; correo: string }): Promise<EntidadRemision> {
    return apiClient.post<EntidadRemision>(`${SERVICE_PREFIX}/entidades-remision`, data);
  },

  async update(id: string, data: Partial<EntidadRemision>): Promise<EntidadRemision> {
    return apiClient.put<EntidadRemision>(`${SERVICE_PREFIX}/entidades-remision/${id}`, data);
  },

  async toggleActivo(id: string, activo: boolean): Promise<EntidadRemision> {
    return apiClient.put<EntidadRemision>(`${SERVICE_PREFIX}/entidades-remision/${id}/toggle-activo`, { activo });
  },

  async delete(id: string): Promise<void> {
    return apiClient.delete(`${SERVICE_PREFIX}/entidades-remision/${id}`);
  },

  async seed(): Promise<void> {
    return apiClient.post(`${SERVICE_PREFIX}/entidades-remision/seed`);
  },
};
