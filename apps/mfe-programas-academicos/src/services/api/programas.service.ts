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
  id: number;
  codigo: string;
  nombre: string;
  nivelFormacion: string;
  modalidad: string;
  jornada: string;
  duracionSemestres: number;
  creditos: number;
  facultad?: string;
  cetapsList?: { ofertaId: string; estudiantes: number; cetap: string; dt: string }[];
  estado: string;
  descripcion?: string;
  perfilEgresado?: string;
  requisitosIngreso?: string[];
  costoMatricula?: number;
  horasBasePorCredito?: number;
  horasPregradoCentral?: number;
  estudiantesActivos?: number;
  graduados?: number;
  docentesAsignados?: number;
  fechaCreacion?: string;
  ultimaActualizacion?: string;
  sede?: {
    idSede: number;
    nomSede: string;
    codSede?: string;
  };
  registroCalificado?: RegistroCalificado;
  acreditaciones?: AcreditacionPrograma[];
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
  sedeId?: number;
  periodoAcademico?: string;
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
  async updateCetapEstudiantes(programaId: string | number, ofertaId: string, estudiantes: number): Promise<void> {
    return apiClient.patch(`${SERVICE_PREFIX}/programas-academicos/${programaId}/cetaps/${ofertaId}`, { cupos: estudiantes }, { requiresAuth: true });
  }
};
