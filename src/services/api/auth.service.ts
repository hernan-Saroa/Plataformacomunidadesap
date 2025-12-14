/**
 * Auth Service
 * Servicio para autenticación y gestión de sesiones
 */

import { apiClient } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RecuperarPasswordSolicitud,
  RecuperarPasswordVerificar,
  RecuperarPasswordCambiar,
} from './types';

export const authService = {
  /**
   * Login con discriminación automática por dominio
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', data, {
      requiresAuth: false,
    });
    
    // Guardar tokens y datos de usuario
    if (response.accessToken && response.refreshToken) {
      apiClient.login(response.accessToken, response.refreshToken, response.usuario);
    }
    
    return response;
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      apiClient.logout();
    }
  },

  /**
   * Renovar token
   */
  async refreshToken(): Promise<{ accessToken: string; refreshToken: string }> {
    return apiClient.post('/auth/refresh', undefined, {
      requiresAuth: false,
    });
  },

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  },

  /**
   * Obtener datos del usuario actual
   */
  getCurrentUser(): any | null {
    return apiClient.getUserData();
  },

  /**
   * Recuperar contraseña - Paso 1: Solicitar código
   */
  async recuperarPasswordSolicitar(data: RecuperarPasswordSolicitud): Promise<{ codigoEnviado: boolean; expiraEn: string }> {
    return apiClient.post('/auth/recuperar-password/solicitar', data, {
      requiresAuth: false,
    });
  },

  /**
   * Recuperar contraseña - Paso 2: Verificar código
   */
  async recuperarPasswordVerificar(data: RecuperarPasswordVerificar): Promise<{ verificado: boolean; token: string }> {
    return apiClient.post('/auth/recuperar-password/verificar', data, {
      requiresAuth: false,
    });
  },

  /**
   * Recuperar contraseña - Paso 3: Cambiar password
   */
  async recuperarPasswordCambiar(data: RecuperarPasswordCambiar): Promise<{ mensaje: string }> {
    return apiClient.post('/auth/recuperar-password/cambiar', data, {
      requiresAuth: false,
    });
  },

  /**
   * Verificar email
   */
  async verificarEmail(email: string, codigo: string): Promise<{ verificado: boolean }> {
    return apiClient.post('/auth/verificar-email', { email, codigo }, {
      requiresAuth: false,
    });
  },
};

export default authService;
