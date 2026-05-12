/**
 * Servicio de Estructura Organizacional
 * Maneja todas las operaciones de consulta de seccionales, sedes y geopolítica
 * Usa las tablas auth.seccionales, auth.sedes y auth.geopolitica
 *
 * Nota: Todos los endpoints van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/estructura-organizacional -> auth-service:3001/estructura-organizacional
 */

import { apiClient } from './api/apiClient';
import type {
  Seccional,
  Sede,
  Geopolitica,
  EstructuraOrganizacionalResponse,
  EstadisticasEstructuraOrganizacional,
  SedesResponse,
  SeccionalesResponse,
} from './api/types';

// Prefijo del servicio en el API Gateway
const SERVICE_PREFIX = '/auth/api/v1';

export interface SedesFilters {
  idSeccional?: number;
  search?: string;
}

// DTOs para crear/actualizar
export interface CreateSeccionalData {
  codSeccional?: string;
  nomSeccional: string;
  idUbiSeccional?: number;
}

export interface UpdateSeccionalData {
  codSeccional?: string;
  nomSeccional?: string;
  idUbiSeccional?: number;
}

export interface CreateSedeData {
  codSede?: string;
  nomSede: string;
  idGeopolitica?: number;
  idSeccional?: number;
  dirSede?: string;
  telSede?: string;
  emailSede?: string;
  capacidadEstudiantes?: number;
  capacidadDocentes?: number;
  sedeAct?: string;
  permiteInscripciones?: boolean;
  permiteMatriculas?: boolean;
  visiblePortal?: boolean;
  observaciones?: string;
}

export interface UpdateSedeData {
  codSede?: string;
  nomSede?: string;
  idGeopolitica?: number;
  idSeccional?: number;
  dirSede?: string;
  telSede?: string;
  emailSede?: string;
  capacidadEstudiantes?: number;
  capacidadDocentes?: number;
  sedeAct?: string;
  permiteInscripciones?: boolean;
  permiteMatriculas?: boolean;
  visiblePortal?: boolean;
  observaciones?: string;
}

/**
 * Servicio de Estructura Organizacional
 */
export const estructuraService = {
  // ============================================
  // ENDPOINT PRINCIPAL
  // ============================================

  /**
   * Obtener toda la estructura organizacional (seccionales y sedes)
   */
  async obtenerEstructura(): Promise<EstructuraOrganizacionalResponse> {
    return apiClient.get<EstructuraOrganizacionalResponse>(`${SERVICE_PREFIX}/estructura-organizacional`);
  },

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtener estadísticas de la estructura organizacional
   */
  async obtenerEstadisticas(): Promise<{ data: EstadisticasEstructuraOrganizacional }> {
    return apiClient.get<{ data: EstadisticasEstructuraOrganizacional }>(`${SERVICE_PREFIX}/estructura-organizacional/estadisticas`);
  },

  // ============================================
  // GEOPOLÍTICA
  // ============================================

  /**
   * Listar todos los departamentos
   */
  async listarDepartamentos(): Promise<{ data: Geopolitica[] }> {
    return apiClient.get<{ data: Geopolitica[] }>(`${SERVICE_PREFIX}/estructura-organizacional/geopolitica/departamentos`);
  },

  /**
   * Listar ciudades de un departamento
   */
  async listarCiudadesPorDepartamento(idDepartamento: number): Promise<{ data: Geopolitica[] }> {
    return apiClient.get<{ data: Geopolitica[] }>(`${SERVICE_PREFIX}/estructura-organizacional/geopolitica/departamentos/${idDepartamento}/ciudades`);
  },

  /**
   * Obtener geopolítica por ID
   */
  async obtenerGeopoliticaPorId(id: number): Promise<{ data: Geopolitica | null }> {
    return apiClient.get<{ data: Geopolitica | null }>(`${SERVICE_PREFIX}/estructura-organizacional/geopolitica/${id}`);
  },

  // ============================================
  // SEDES
  // ============================================

  /**
   * Listar todas las sedes con filtros opcionales
   */
  async listarSedes(filters?: SedesFilters): Promise<SedesResponse> {
    const params = new URLSearchParams();

    if (filters?.idSeccional) params.append('idSeccional', filters.idSeccional.toString());
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const endpoint = queryString
      ? `${SERVICE_PREFIX}/estructura-organizacional/sedes?${queryString}`
      : `${SERVICE_PREFIX}/estructura-organizacional/sedes`;

    return apiClient.get<SedesResponse>(endpoint);
  },

  /**
   * Listar sedes de una seccional específica
   */
  async listarSedesPorSeccional(idSeccional: number): Promise<{ data: Sede[] }> {
    return apiClient.get<{ data: Sede[] }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes/seccional/${idSeccional}`);
  },

  /**
   * Obtener una sede por ID
   */
  async obtenerSedePorId(id: number): Promise<{ data: Sede | null }> {
    return apiClient.get<{ data: Sede | null }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes/${id}`);
  },

  // ============================================
  // SECCIONALES
  // ============================================

  /**
   * Listar todas las seccionales
   */
  async listarSeccionales(): Promise<SeccionalesResponse> {
    return apiClient.get<SeccionalesResponse>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales`);
  },

  /**
   * Obtener una seccional por ID
   */
  async obtenerSeccionalPorId(id: number): Promise<{ data: Seccional | null }> {
    return apiClient.get<{ data: Seccional | null }>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales/${id}`);
  },

  /**
   * Crear una nueva seccional
   */
  async crearSeccional(data: CreateSeccionalData): Promise<{ data: Seccional; message: string }> {
    return apiClient.post<{ data: Seccional; message: string }>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales`, data);
  },

  /**
   * Actualizar una seccional
   */
  async actualizarSeccional(id: number, data: UpdateSeccionalData): Promise<{ data: Seccional; message: string }> {
    return apiClient.put<{ data: Seccional; message: string }>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales/${id}`, data);
  },

  /**
   * Eliminar una seccional
   */
  async eliminarSeccional(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales/${id}`);
  },

  // ============================================
  // SEDES CRUD
  // ============================================

  /**
   * Crear una nueva sede
   */
  async crearSede(data: CreateSedeData): Promise<{ data: Sede; message: string }> {
    return apiClient.post<{ data: Sede; message: string }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes`, data);
  },

  /**
   * Actualizar una sede
   */
  async actualizarSede(id: number, data: UpdateSedeData): Promise<{ data: Sede; message: string }> {
    return apiClient.put<{ data: Sede; message: string }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes/${id}`, data);
  },

  /**
   * Eliminar una sede
   */
  async eliminarSede(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes/${id}`);
  },

  // ============================================
  // HELPERS (Métodos de conveniencia)
  // ============================================

  /**
   * Obtener seccionales como array simple
   */
  async obtenerSeccionalesArray(): Promise<Seccional[]> {
    const response = await this.listarSeccionales();
    return response.data;
  },

  /**
   * Obtener sedes como array simple
   */
  async obtenerSedesArray(filters?: SedesFilters): Promise<Sede[]> {
    const response = await this.listarSedes(filters);
    return response.data;
  },

  /**
   * Obtener departamentos como array simple
   */
  async obtenerDepartamentosArray(): Promise<Geopolitica[]> {
    const response = await this.listarDepartamentos();
    return response.data;
  },

  /**
   * Obtener ciudades como array simple
   */
  async obtenerCiudadesArray(idDepartamento: number): Promise<Geopolitica[]> {
    const response = await this.listarCiudadesPorDepartamento(idDepartamento);
    return response.data;
  },

  /**
   * Obtener seccionales (alias para uso en formularios)
   * Retorna array con { id, nombre, ubicacion }
   */
  async obtenerSeccionales(): Promise<Array<{ id: number; nombre: string; ubicacion?: { id: number; nombre: string } }>> {
    const response = await this.listarSeccionales();
    return response.data.map((seccional: Seccional) => ({
      id: seccional.idSeccional,
      nombre: seccional.nomSeccional,
      ubicacion: seccional.ubicacion ? {
        id: seccional.ubicacion.idGeopolitica,
        nombre: seccional.ubicacion.nomDivGeopolitica
      } : undefined
    }));
  },

  /**
   * Obtener sedes por seccional (alias para uso en formularios)
   * Retorna array con { id, nombre, geopolitica }
   */
  async obtenerSedesBySeccional(idSeccional: number): Promise<Array<{ id: number; nombre: string; geopolitica?: { id: number; nombre: string } }>> {
    const response = await this.listarSedesPorSeccional(idSeccional);
    return response.data.map((sede: Sede) => ({
      id: sede.idSede,
      nombre: sede.nomSede,
      geopolitica: sede.geopolitica ? {
        id: sede.geopolitica.idGeopolitica,
        nombre: sede.geopolitica.nomDivGeopolitica
      } : undefined
    }));
  },

  // ============================================
  // ASIGNACIÓN DE USUARIOS
  // ============================================

  async getUsuariosSinAsignar(): Promise<{ success: boolean; data: any[] }> {
    return apiClient.get<{ success: boolean; data: any[] }>(`${SERVICE_PREFIX}/estructura-organizacional/usuarios/sin-asignar`);
  },

  async asignarSeleccionados(
    ids: string[],
    territorialId: string,
    cetapId: string
  ): Promise<{ success: boolean; actualizados: number }> {
    return apiClient.post<{ success: boolean; actualizados: number }>(
      `${SERVICE_PREFIX}/estructura-organizacional/usuarios/asignar`,
      { ids, territorialId, cetapId }
    );
  },
};

export default estructuraService;
