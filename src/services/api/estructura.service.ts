/**
 * Estructura Organizacional Service
 * Servicio para gestión de seccionales, sedes y geopolítica
 * Usa las tablas auth.seccionales, auth.sedes y auth.geopolitica
 *
 * Nota: Todos los endpoints van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/estructura-organizacional -> auth-service:3001/estructura-organizacional
 */

import { apiClient } from './client';
import type {
  Seccional,
  Sede,
  Geopolitica,
  EstructuraOrganizacionalResponse,
  EstadisticasEstructuraOrganizacional,
  SedesResponse,
  SeccionalesResponse,
} from './types';

// Prefijo del servicio en el API Gateway
const SERVICE_PREFIX = '/auth/api/v1';

export const estructuraService = {
  /**
   * Obtener toda la estructura organizacional
   */
  async obtenerEstructura(): Promise<EstructuraOrganizacionalResponse> {
    return apiClient.get<EstructuraOrganizacionalResponse>(`${SERVICE_PREFIX}/estructura-organizacional`);
  },

  /**
   * Obtener estadísticas
   */
  async obtenerEstadisticas(): Promise<{ data: EstadisticasEstructuraOrganizacional }> {
    return apiClient.get<{ data: EstadisticasEstructuraOrganizacional }>(`${SERVICE_PREFIX}/estructura-organizacional/estadisticas`);
  },

  /**
   * GEOPOLÍTICA
   */
  geopolitica: {
    /**
     * Listar departamentos
     */
    async listarDepartamentos(): Promise<{ data: Geopolitica[] }> {
      return apiClient.get<{ data: Geopolitica[] }>(`${SERVICE_PREFIX}/estructura-organizacional/geopolitica/departamentos`);
    },

    /**
     * Listar ciudades por departamento
     */
    async listarCiudades(idDepartamento: number): Promise<{ data: Geopolitica[] }> {
      return apiClient.get<{ data: Geopolitica[] }>(
        `${SERVICE_PREFIX}/estructura-organizacional/geopolitica/departamentos/${idDepartamento}/ciudades`
      );
    },

    /**
     * Obtener geopolítica por ID
     */
    async obtenerPorId(id: number): Promise<{ data: Geopolitica | null }> {
      return apiClient.get<{ data: Geopolitica | null }>(`${SERVICE_PREFIX}/estructura-organizacional/geopolitica/${id}`);
    },
  },

  /**
   * SECCIONALES
   */
  seccionales: {
    /**
     * Listar seccionales
     */
    async listar(): Promise<SeccionalesResponse> {
      return apiClient.get<SeccionalesResponse>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales`);
    },

    /**
     * Obtener seccional por ID
     */
    async obtenerPorId(id: number): Promise<{ data: Seccional | null }> {
      return apiClient.get<{ data: Seccional | null }>(`${SERVICE_PREFIX}/estructura-organizacional/seccionales/${id}`);
    },
  },

  /**
   * SEDES
   */
  sedes: {
    /**
     * Listar sedes con filtros opcionales
     */
    async listar(params?: {
      idSeccional?: number;
      search?: string;
    }): Promise<SedesResponse> {
      const queryParams = new URLSearchParams();
      if (params?.idSeccional) queryParams.append('idSeccional', params.idSeccional.toString());
      if (params?.search) queryParams.append('search', params.search);

      const queryString = queryParams.toString();
      const endpoint = queryString
        ? `${SERVICE_PREFIX}/estructura-organizacional/sedes?${queryString}`
        : `${SERVICE_PREFIX}/estructura-organizacional/sedes`;

      return apiClient.get<SedesResponse>(endpoint);
    },

    /**
     * Listar sedes por seccional
     */
    async listarPorSeccional(idSeccional: number): Promise<{ data: Sede[] }> {
      return apiClient.get<{ data: Sede[] }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes/seccional/${idSeccional}`);
    },

    /**
     * Obtener sede por ID
     */
    async obtenerPorId(id: number): Promise<{ data: Sede | null }> {
      return apiClient.get<{ data: Sede | null }>(`${SERVICE_PREFIX}/estructura-organizacional/sedes/${id}`);
    },
  },
};

export default estructuraService;
