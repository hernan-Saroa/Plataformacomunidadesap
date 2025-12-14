/**
 * Dashboard Service
 * Servicio para métricas y datos del dashboard ejecutivo
 */

import { apiClient } from './client';
import type {
  MetricasSuperiores,
  CrecimientoUsuarios,
  DistribucionRol,
  ActividadReciente,
} from './types';

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
    return apiClient.get<MetricasSuperiores>('/backoffice/dashboard/metricas-principales', { params });
  },

  /**
   * Obtener datos de crecimiento de usuarios
   */
  async crecimientoUsuarios(params?: {
    periodo?: 'dia' | 'semana' | 'mes' | 'año';
    territorialId?: string;
  }): Promise<CrecimientoUsuarios> {
    return apiClient.get<CrecimientoUsuarios>('/backoffice/dashboard/crecimiento-usuarios', { params });
  },

  /**
   * Obtener distribución por roles
   */
  async distribucionRoles(params?: {
    territorialId?: string;
  }): Promise<DistribucionRol[]> {
    return apiClient.get<DistribucionRol[]>('/backoffice/dashboard/distribucion-roles', { params });
  },

  /**
   * Obtener usuarios por sede
   */
  async usuariosPorSede(params?: {
    territorialId?: string;
    limit?: number;
  }): Promise<any[]> {
    return apiClient.get('/backoffice/dashboard/usuarios-por-sede', { params });
  },

  /**
   * Obtener actividad reciente
   */
  async actividadReciente(params?: {
    limit?: number;
  }): Promise<ActividadReciente[]> {
    return apiClient.get<ActividadReciente[]>('/backoffice/dashboard/actividad-reciente', { params });
  },

  /**
   * Obtener alertas pendientes
   */
  async alertas(): Promise<any[]> {
    return apiClient.get('/backoffice/dashboard/alertas');
  },

  /**
   * Obtener datos para mapa de cobertura
   */
  async mapaCobertura(): Promise<any> {
    return apiClient.get('/backoffice/dashboard/mapa-cobertura');
  },
};

export default dashboardService;
