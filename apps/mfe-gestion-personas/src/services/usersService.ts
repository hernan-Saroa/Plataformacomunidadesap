/**
 * Servicio de Usuarios
 * Maneja todas las operaciones CRUD de usuarios con el backend
 *
 * Nota: Todos los endpoints de usuarios van al servicio 'auth' del API Gateway
 * URL: /auth/api/v1/users -> auth-service:3001/users
 */

import { apiClient } from './api/apiClient';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/auth/api/v1';

// Tipos para el servicio
export interface UserSeccional {
  idSeccional: number;
  codSeccional: string | null;
  nomSeccional: string;
  ubicacion: string | null;
}

export interface UserSede {
  idSede: number;
  codSede: string | null;
  nomSede: string;
  ubicacion: string | null;
}

export interface User {
  id_user: string;
  username: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  person: {
    id: number;
    identification_number: string;
    identification_type: string;
    full_name: string;
    first_name: string;
    last_name: string;
    gender: string;
    email: string;
    phone: string;
    created_at: string;
    updated_at: string;
  };
  roles: Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    type: string;
    is_active: boolean;
    requires_2fa: boolean;
  }>;
  // Territorial y CETAP
  seccional: UserSeccional | null;
  sede: UserSede | null;
}

export interface CreateUserData {
  first_name: string;
  last_name: string;
  identification_number: string;
  identification_type: string;
  email: string;
  phone?: string;
  gender?: string;
  roleIds?: string[];
  idSeccional?: number;
  idSede?: number;
  [key: string]: any; // Allow advanced fields (birth_date, address, etc.)
}

export interface UpdateUserData extends Partial<CreateUserData> {
  id_user?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  role?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsersResponse {
  data: User[];
  meta: {
    total: number;
    totalActive: number;
    totalBlocked: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Servicio de usuarios
 */
export const usersService = {
  /**
   * Obtener todos los usuarios con paginación
   */
  async getUsers(filters: UserFilters = {}): Promise<PaginatedUsersResponse> {
    const params = new URLSearchParams();

    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.role && filters.role.trim()) params.append('role', filters.role.trim());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const endpoint = queryString ? `${SERVICE_PREFIX}/users?${queryString}` : `${SERVICE_PREFIX}/users`;

    return apiClient.get<PaginatedUsersResponse>(endpoint);
  },

  /**
   * Obtener un usuario específico por ID
   */
  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(`${SERVICE_PREFIX}/users/${id}`);
  },

  /**
   * Crear un nuevo usuario
   */
  async createUser(userData: CreateUserData): Promise<User> {
    return apiClient.post<User>(`${SERVICE_PREFIX}/users`, userData);
  },

  /**
   * Actualizar un usuario existente
   */
  async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    return apiClient.put<User>(`${SERVICE_PREFIX}/users/${id}`, userData);
  },

  /**
   * Eliminar un usuario
   */
  async deleteUser(id: string): Promise<void> {
    return apiClient.delete(`${SERVICE_PREFIX}/users/${id}`);
  },

  /**
   * Cambiar el estado activo/inactivo de un usuario
   */
  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    return apiClient.put<User>(`${SERVICE_PREFIX}/users/${id}/status`, { is_active: isActive });
  },

  async resetUserPassword(id: string, newPassword: string): Promise<void> {
    return apiClient.put(`${SERVICE_PREFIX}/users/${id}/password`, { new_password: newPassword });
  },

  /**
   * Forzar restablecimiento de contraseña por correo OTP
   * Envía el código de recuperación al correo registrado del usuario
   */
  async forcePasswordReset(email: string): Promise<void> {
    return apiClient.post(`${SERVICE_PREFIX}/forgot-password`, { email });
  },

  /**
   * Buscar usuarios por término de búsqueda
   */
  async searchUsers(searchTerm: string, filters: Omit<UserFilters, 'search'> = {}): Promise<PaginatedUsersResponse> {
    const searchFilters: UserFilters = {
      ...filters,
      search: searchTerm,
    };

    return this.getUsers(searchFilters);
  },

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
  }> {
    // Este endpoint podría implementarse en el backend si es necesario
    const users = await this.getUsers({ limit: 1000 });
    const stats = {
      total: users.meta.total,
      active: users.data.filter(u => u.is_active).length,
      inactive: users.data.filter(u => !u.is_active).length,
      byRole: {} as Record<string, number>,
    };

    // Contar por roles
    users.data.forEach(user => {
      user.roles.forEach(role => {
        stats.byRole[role.name] = (stats.byRole[role.name] || 0) + 1;
      });
    });

    return stats;
  },
};

export default usersService;