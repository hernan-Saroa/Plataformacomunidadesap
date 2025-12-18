/**
 * API Services Index
 * Exportación centralizada de todos los servicios de API
 */

// Config y cliente
export { apiClient } from './client';
export { API_CONFIG, getBaseURL, STORAGE_KEYS } from './config';
export type { APIResponse, APIError, PaginatedResponse } from './config';
export { APIClientError } from './client';

// Types
export * from './types';

// Services - Importar primero
import authServiceImport from './authService';
import usuariosServiceImport from './usuarios.service';
import rolesServiceImport from './roles.service';
import dashboardServiceImport from './dashboard.service';
import estructuraServiceImport from './estructura.service';
import certificadosServiceImport from './certificados.service';
import portalServiceImport from './portal.service';
import publicoServiceImport from './publico.service';
import * as programasServiceImport from './programas.service';

// Re-exportar servicios individuales
export const authService = authServiceImport;
export const usuariosService = usuariosServiceImport;
export const rolesService = rolesServiceImport;
export const dashboardService = dashboardServiceImport;
export const estructuraService = estructuraServiceImport;
export const certificadosService = certificadosServiceImport;
export const portalService = portalServiceImport;
export const publicoService = publicoServiceImport;
export const programasService = programasServiceImport;

/**
 * Objeto con todos los servicios agrupados
 * Útil para importar todo de una vez
 */
export const api = {
  auth: authServiceImport,
  usuarios: usuariosServiceImport,
  roles: rolesServiceImport,
  dashboard: dashboardServiceImport,
  estructura: estructuraServiceImport,
  certificados: certificadosServiceImport,
  portal: portalServiceImport,
  publico: publicoServiceImport,
  programas: programasServiceImport,
} as const;

/**
 * Helpers de autenticación
 */
export const auth = {
  login: (email: string, password: string) => authServiceImport.login(email, password),
  logout: () => authServiceImport.logout(),
  isAuthenticated: () => authServiceImport.isAuthenticated(),
  getCurrentUser: () => authServiceImport.getCurrentUser(),
} as const;
