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
import authServiceImport from './auth.service';
import usuariosServiceImport from './usuarios.service';
import dashboardServiceImport from './dashboard.service';
import estructuraServiceImport from './estructura.service';
import certificadosServiceImport from './certificados.service';
import portalServiceImport from './portal.service';
import publicoServiceImport from './publico.service';

// Re-exportar servicios individuales
export const authService = authServiceImport;
export const usuariosService = usuariosServiceImport;
export const dashboardService = dashboardServiceImport;
export const estructuraService = estructuraServiceImport;
export const certificadosService = certificadosServiceImport;
export const portalService = portalServiceImport;
export const publicoService = publicoServiceImport;

/**
 * Objeto con todos los servicios agrupados
 * Útil para importar todo de una vez
 */
export const api = {
  auth: authServiceImport,
  usuarios: usuariosServiceImport,
  dashboard: dashboardServiceImport,
  estructura: estructuraServiceImport,
  certificados: certificadosServiceImport,
  portal: portalServiceImport,
  publico: publicoServiceImport,
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
