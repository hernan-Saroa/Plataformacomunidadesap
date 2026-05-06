/**
 * Servicio de Autenticación
 * 
 * Maneja login, logout, refresh tokens, y validación de sesiones
 */

import { apiClient } from './apiClient';
import { API_ENDPOINTS, config } from '../../config/environment';
import type { 
  LoginCredentials, 
  LoginResponse, 
  RefreshTokenResponse,
  AuthUser 
} from '../../types';

class AuthService {
  // In-memory user cache — never written to sessionStorage/localStorage (OTIC-002)
  private _cachedUser: AuthUser | null = null;

  /**
   * Login con Microsoft (OAuth)
   */
  async loginWithMicrosoft(payload: { email: string; idToken: string }): Promise<LoginResponse> {
    const response = await apiClient.post<any>(
      API_ENDPOINTS.AUTH.LOGIN_MICROSOFT,
      payload,
      { skipAuth: true },
    );

    const normalizedResponse: LoginResponse = {
      ...response,
      refreshToken: response.refreshToken || response.accessToken,
    };

    this.saveTokens(normalizedResponse.accessToken, normalizedResponse.refreshToken);
    this.saveUserData(normalizedResponse.user);

    return normalizedResponse;
  }

  /**
   * Login de usuario
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Mapear email a username para el backend
    const loginData = {
      username: credentials.email,
      password: credentials.password,
    };

    const response = await apiClient.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      loginData,
      { skipAuth: true }
    );

    // Guardar tokens
    this.saveTokens(response.accessToken, response.refreshToken);
    
    // Guardar datos de usuario
    this.saveUserData(response.user);

    return response;
  }

  /**
   * Logout de usuario
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * Refresh del access token — el token viaja en cookie HttpOnly (OTIC-001),
   * el backend lo lee directamente y emite una nueva cookie.
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    return apiClient.post<RefreshTokenResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      {},
      { skipAuth: true }
    );
  }

  /**
   * Verificar token actual
   */
  async verifyToken(): Promise<AuthUser> {
    return apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.VERIFY);
  }

  /**
   * Solicitar reset de contraseña
   */
  async forgotPassword(email: string): Promise<{
    message?: string;
    expiresInSeconds?: number;
  }> {
    return apiClient.post(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
      { skipAuth: true, retries: 0, skipErrorToast: true }
    );
  }

  /**
   * Verificar código de reset de contraseña
   */
  async verifyResetCode(email: string, code: string): Promise<void> {
    await apiClient.post(
      API_ENDPOINTS.AUTH.VERIFY_RESET_CODE,
      { email, code },
      { skipAuth: true, retries: 0, skipErrorToast: true }
    );
  }

  /**
   * Reset de contraseña con token
   */
  async resetPassword(payload: { email: string; code: string; newPassword: string }): Promise<void> {
    await apiClient.post(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      payload,
      { skipAuth: true, retries: 0, skipErrorToast: true }
    );
  }

  /**
   * Cambiar contraseña (usuario autenticado)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
  }

  // ==========================================================================
  // MÉTODOS DE UTILIDAD
  // ==========================================================================

  /**
   * Permite que App.tsx restaure el caché tras verifyToken() en recarga de página (OTIC-002)
   */
  setCurrentUserCache(user: AuthUser): void {
    this._cachedUser = user;
  }

  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this._cachedUser !== null;
  }

  /**
   * Obtiene el usuario actual de la sesión
   */
  getCurrentUser(): AuthUser | null {
    return this._cachedUser;
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    const roles = user?.roles || [];
    const isSuperAdmin = roles.some((role: any) =>
      typeof role === 'string'
        ? role === 'SUPER_ADMIN'
        : role?.code === 'SUPER_ADMIN' || role?.name === 'SUPER_ADMIN',
    );
    if (isSuperAdmin) return true;

    const directPermissions = Array.isArray(user?.permissions)
      ? user.permissions
      : [];
    const rolePermissions = roles.flatMap((role: any) =>
      Array.isArray(role?.permissions)
        ? role.permissions
            .map((rolePermission: any) =>
              typeof rolePermission === 'string'
                ? rolePermission
                : rolePermission?.code,
            )
            .filter(Boolean)
        : [],
    );

    return [...directPermissions, ...rolePermissions].includes(permission);
  }

  /**
   * Verifica si el usuario es un super admin
   */
  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return (user?.roles || []).some((role: any) =>
      typeof role === 'string'
        ? role === 'SUPER_ADMIN'
        : role?.code === 'SUPER_ADMIN' || role?.name === 'SUPER_ADMIN',
    );
  }

  /**
   * Verifica si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    const roles = user?.roles || [];

    // Manejar tanto arrays de string como objetos { code, name }
    return roles.some((r: any) => {
      if (typeof r === 'string') return r === role;
      return r?.code === role || r?.name === role;
    });
  }

  /**
   * Verifica si el usuario tiene alguno de los permisos
   */
  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  /**
   * Verifica si el usuario tiene todos los permisos
   */
  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  // ==========================================================================
  // MÉTODOS PRIVADOS
  // ==========================================================================

  private saveTokens(_accessToken?: string, _refreshToken?: string): void {
    // Los tokens JWT se gestionan como cookies HttpOnly por el backend (OTIC-001).
    // El frontend nunca los almacena en sessionStorage/localStorage.
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private saveUserData(user: any): void {
    // Datos del usuario en memoria únicamente — nunca en sessionStorage/localStorage (OTIC-002)
    this._cachedUser = user as AuthUser;
  }

  private clearAuthData(): void {
    this._cachedUser = null;
    // Limpiar residuos de versiones anteriores que pudieran quedar en storage
    sessionStorage.removeItem(config.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(config.STORAGE_KEYS.USER_DATA);
    apiClient.clearCache();
  }

  // ==========================================================================
  // MÉTODOS ADICIONALES PARA DISCIPLINARIO
  // ==========================================================================

  /**
   * Obtiene lista de profesionales/usuarios para asignación
   */
  async getProfesionales(): Promise<ProfesionalUser[]> {
    return apiClient.get<ProfesionalUser[]>('/auth/api/v1/users');
  }

  async getAbogadosRolResuelve(): Promise<AbogadoResuelve[]> {
    const response = await apiClient.get<{ data: any[]; meta: any } | any[]>(
      '/auth/api/v1/users',
      { status: 'active', limit: 1000 }
    );
    const users = Array.isArray(response) ? response : (response?.data ?? []);
    console.log('[DEBUG getAbogadosRolResuelve] primer usuario raw:', users[0]);
    const filtered = users.filter((u: any) => {
      const roles: any[] = u.user?.roles ?? u.roles ?? u.person?.roles ?? [];
      const hasResuelve = roles.some((r: any) => {
        const code = (r.code ?? '').toUpperCase();
        const name = (r.name ?? '').toLowerCase();
        return code === 'RESUELVE_GESTION_LEGAL' || name.includes('resuelve');
      });
      const hasExcludedRole = roles.some((r: any) => {
        const code = (r.code ?? '').toUpperCase();
        const name = (r.name ?? '').toLowerCase();
        return code === 'SECRETARIADO_GESTION_LEGAL' || name.includes('secretariado') ||
               code === 'MONITOREO_GESTION_LEGAL' || name.includes('monitoreo');
      });
      return hasResuelve && !hasExcludedRole;
    });
    console.log('[DEBUG getAbogadosRolResuelve] total:', users.length, '→ filtrados:', filtered.length);
    return filtered.map((u: any) => ({
      id: u.user?.id_user ?? u.id_user ?? u.id,
      nombreCompleto: u.full_name ?? u.person?.full_name ?? `${u.first_name ?? u.person?.first_name ?? ''} ${u.last_name ?? u.person?.last_name ?? ''}`.trim(),
      nombre: u.full_name ?? u.person?.full_name ?? `${u.first_name ?? u.person?.first_name ?? ''} ${u.last_name ?? u.person?.last_name ?? ''}`.trim(),
      email: u.email ?? u.person?.email ?? '',
    }));
  }
}

// Tipo para profesionales/usuarios en asignación de procesos disciplinarios
export interface ProfesionalUser {
  id: string;
  username: string;
  person: {
    first_name: string;
    last_name: string;
    email: string;
  };
  roles: {
    name: string;
  }[];
}

// Alias para compatibilidad con código existente
export type User = ProfesionalUser;

export interface AbogadoResuelve {
  id: string;
  nombreCompleto: string;
  nombre: string;
  email: string;
}

export const authService = new AuthService();
export default authService;
