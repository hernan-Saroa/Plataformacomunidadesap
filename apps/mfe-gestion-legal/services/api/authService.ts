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
  // Cache en memoria: los JWT siguen protegidos como cookies HttpOnly.
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
   * Refresh de sesion con cookie HttpOnly.
   * El frontend no lee ni guarda refresh tokens.
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
    return apiClient.get<AuthUser>(API_ENDPOINTS.AUTH.VERIFY, undefined, {
      retries: 0,
      skipAuthRefresh: true,
      skipErrorToast: true,
    });
  }

  /**
   * Solicitar reset de contraseña
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
      { email },
      { skipAuth: true }
    );
  }

  /**
   * Reset de contraseña con token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post(
      API_ENDPOINTS.AUTH.RESET_PASSWORD,
      { token, newPassword },
      { skipAuth: true }
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
   * Permite restaurar el usuario tras verifyToken sin persistir datos sensibles.
   */
  setCurrentUserCache(user: AuthUser): void {
    this._cachedUser = user;
    if (typeof window !== 'undefined') {
      (window as any).__esap_auth_cache = user;
    }
  }
  /**
   * Verifica si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Obtiene el usuario actual del localStorage
   */
  getCurrentUser(): AuthUser | null {
    if (typeof window !== 'undefined') {
      const sharedUser = (window as any).__esap_auth_cache ?? null;
      if (this._cachedUser !== sharedUser) {
        this._cachedUser = sharedUser;
      }
    }
    return this._cachedUser;
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (this.isSuperAdmin()) return true;

    const roles = Array.isArray(user.roles) ? user.roles : [];
    const directPermissions = Array.isArray(user.permissions)
      ? user.permissions
          .map((permissionItem: any) =>
            typeof permissionItem === 'string'
              ? permissionItem
              : permissionItem?.code,
          )
          .filter(Boolean)
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
    // Los tokens JWT se gestionan como cookies HttpOnly por el backend.
    // El frontend no los almacena en sessionStorage/localStorage.
  }

  private saveUserData(user: AuthUser): void {
    this.setCurrentUserCache(user);
  }

  private clearAuthData(): void {
    this._cachedUser = null;
    if (typeof window !== 'undefined') {
      delete (window as any).__esap_auth_cache;
    }
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
    return apiClient.get<ProfesionalUser[]>(`${API_ENDPOINTS.AUTH.BASE}/users`);
  }

  async getAbogadosRolResuelve(): Promise<AbogadoResuelve[]> {
    // El backend filtra por roles.id (UUID), no por nombre/code, así que
    // traemos todos los usuarios activos y filtramos client-side por rol resuelve
    const response = await apiClient.get<{ data: any[]; meta: any } | any[]>(
      '/auth/api/v1/users',
      { status: 'active', limit: 1000 }
    );
    const users = Array.isArray(response) ? response : (response?.data ?? []);
    return users
      .filter((u: any) => {
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
      })
      .map((u: any) => ({
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
