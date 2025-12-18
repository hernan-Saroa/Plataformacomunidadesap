/**
 * Dashboard Service
 * Servicio para métricas y datos del dashboard ejecutivo
 *
 * Nota: Todos los endpoints van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/backoffice/dashboard -> auth-service:3001/backoffice/dashboard
 */

import { apiClient } from './client';
import type {
  MetricasSuperiores,
  CrecimientoUsuarios,
  DistribucionRol,
  ActividadReciente,
} from './types';

// Prefijo del servicio en el API Gateway
const SERVICE_PREFIX = '/auth/api/v1';

export const dashboardService = {
  /**
   * Obtener métricas principales
   */
  async metricasPrincipales(params?: {
    fechaInicio?: string;
    fechaFin?: string;
    territorialId?: string;
    sedeId?: string;
  }): Promise<MetricasSuperiores> {
    return apiClient.get<MetricasSuperiores>(`${SERVICE_PREFIX}/backoffice/dashboard/metricas-principales`, { params });
  },

  /**
   * Obtener datos de crecimiento de usuarios
   */
  async crecimientoUsuarios(params?: {
    periodo?: 'dia' | 'semana' | 'mes' | 'año';
    territorialId?: string;
  }): Promise<CrecimientoUsuarios> {
    return apiClient.get<CrecimientoUsuarios>(`${SERVICE_PREFIX}/backoffice/dashboard/crecimiento-usuarios`, { params });
  },

  /**
   * Obtener distribución por roles
   */
  async distribucionRoles(params?: {
    territorialId?: string;
  }): Promise<DistribucionRol[]> {
    return apiClient.get<DistribucionRol[]>(`${SERVICE_PREFIX}/backoffice/dashboard/distribucion-roles`, { params });
  },

  /**
   * Obtener usuarios por sede
   */
  async usuariosPorSede(params?: {
    territorialId?: string;
    limit?: number;
  }): Promise<any[]> {
    return apiClient.get(`${SERVICE_PREFIX}/backoffice/dashboard/usuarios-por-sede`, { params });
  },

  /**
   * Obtener actividad reciente
   */
  async actividadReciente(params?: {
    limit?: number;
  }): Promise<ActividadReciente[]> {
    return apiClient.get<ActividadReciente[]>(`${SERVICE_PREFIX}/backoffice/dashboard/actividad-reciente`, { params });
  },

  /**
   * Obtener alertas pendientes
   */
  async alertas(): Promise<any[]> {
    return apiClient.get(`${SERVICE_PREFIX}/backoffice/dashboard/alertas`);
  },

  /**
   * Obtener datos para mapa de cobertura
   */
  async mapaCobertura(): Promise<any> {
    return apiClient.get(`${SERVICE_PREFIX}/backoffice/dashboard/mapa-cobertura`);
  },
};

export default dashboardService;
