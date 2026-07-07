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

export interface AsignaturaDTO {
  id: string;
  programaId: string;
  nombre: string;
  codigo?: string;
  creditos: number;
  horas: number;
  nucleoTematico?: string;
  semestre?: string;
  createdAt: string;
  updatedAt: string;
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
  totalAsignaturas?: number;
  creditosPlan?: number;
  createdAt: string;
  updatedAt: string;

  // ─── Campos Clave Circular 003/2025 (Catálogo CARGA_2) ───
  nombre_corto?: string;                     // Código operativo (AP_Diurno, APT, etc.)
  tipo_programa?: string;                    // pregrado | especializacion | maestria
  categoria_horas_circular003?: string;       // CLAVE: pregrado_sede_central | pregrado_territorial | especializacion | maestria
  descripcion_categoria_circular003?: string; // Nombre oficial Tabla 1 Circular
  horas_base_por_credito?: number | null;     // 16 (APT/Esp), 12 (Maestría), NULL (Sede Central)
  horas_pregrado_central?: number | null;     // 64 (solo Sede Central, bloque fijo)
  // Campos calculados derivados
  horasBasePorCredito?: number;               // Alias legacy para retrocompatibilidad
  duracionSemestres?: number;                 // Alias legacy
  estudiantesActivos?: number;                // Conteo de estudiantes
  docentesAsignados?: number;                 // Conteo de docentes
  acreditacion?: any;                         // Datos de acreditación
  fechaCreacion?: string;                     // Fecha de creación
  cetapsList?: any[];                         // CETAPs vinculados
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

  async obtenerAsignaturas(programaId: string): Promise<AsignaturaDTO[]> {
    return apiClient.get(`${SERVICE_PREFIX}/programas-academicos/${programaId}/asignaturas`);
  },
};
