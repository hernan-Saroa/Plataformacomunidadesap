import { apiClient } from './apiClient';

export interface RegistroCalificado {
  id: number;
  numero: string;
  fechaEmision: string;
  vigencia: string;
}

export interface AcreditacionPrograma {
  id: number;
  tipo: string;
  vigencia: string;
}

export interface ProgramaAcademicoDTO {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  nivelFormacion?: string;
  facultad?: string;
  modalidad?: string;
  duracion?: number;
  creditos?: number;
  costoMatricula?: number;
  requisitosDeIngreso?: string;
  jornada?: string;
  sede?: string;
  registroCalificado?: any;
  perfilEgresado?: string;
  estado: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramasResponse {
  total: number;
  pagina: number;
  porPagina: number;
  data: ProgramaAcademicoDTO[];
}

export interface ProgramasFiltro {
  search?: string;
  nivelFormacion?: string;
  modalidad?: string;
  estado?: string;
  sede?: string;
  page?: number;
  limit?: number;
}

const SERVICE_PREFIX = '/auth/api/v1';

export const programasService = {
  async listar(filtros: ProgramasFiltro = {}): Promise<ProgramasResponse> {
    return apiClient.get<ProgramasResponse>(`${SERVICE_PREFIX}/programas-academicos`, {
      params: filtros,
      requiresAuth: false,
    });
  },

  async obtener(id: string): Promise<ProgramaAcademicoDTO> {
    return apiClient.get<ProgramaAcademicoDTO>(`${SERVICE_PREFIX}/programas-academicos/${id}`, {
      requiresAuth: false,
    });
  },

  async crear(programa: Omit<ProgramaAcademicoDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProgramaAcademicoDTO> {
    return apiClient.post<ProgramaAcademicoDTO>(`${SERVICE_PREFIX}/programas-academicos`, programa);
  },

  async actualizar(id: string, programa: Partial<ProgramaAcademicoDTO>): Promise<ProgramaAcademicoDTO> {
    return apiClient.put<ProgramaAcademicoDTO>(`${SERVICE_PREFIX}/programas-academicos/${id}`, programa);
  },

  async eliminar(id: string): Promise<void> {
    return apiClient.delete(`${SERVICE_PREFIX}/programas-academicos/${id}`);
  },
};
