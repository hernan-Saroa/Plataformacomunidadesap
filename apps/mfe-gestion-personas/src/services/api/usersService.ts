/**
 * Servicio de Usuarios
 * 
 * Maneja todas las operaciones CRUD de usuarios
 */

import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../../../config/environment';
import type { 
  User, 
  CreateUserDTO, 
  UpdateUserDTO, 
  UsersStats,
  PaginatedResponse,
  FilterParams 
} from '../../types';

class UsersService {
  /**
   * Obtener lista de usuarios con paginación y filtros
   */
  async getUsers(filters?: FilterParams): Promise<PaginatedResponse<User>> {
    return apiClient.get<PaginatedResponse<User>>(
      API_ENDPOINTS.USERS.BASE,
      filters
    );
  }

  /**
   * Obtener un usuario por ID
   */
  async getUserById(userId: string): Promise<User> {
    return apiClient.get<User>(API_ENDPOINTS.USERS.BY_ID(userId));
  }

  /**
   * Crear nuevo usuario
   */
  async createUser(userData: CreateUserDTO): Promise<User> {
    return apiClient.post<User>(API_ENDPOINTS.USERS.BASE, userData);
  }

  /**
   * Actualizar usuario
   */
  async updateUser(userId: string, userData: UpdateUserDTO): Promise<User> {
    return apiClient.put<User>(
      API_ENDPOINTS.USERS.BY_ID(userId),
      userData
    );
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.USERS.BY_ID(userId));
  }

  /**
   * Crear múltiples usuarios (bulk)
   */
  async bulkCreateUsers(users: CreateUserDTO[]): Promise<User[]> {
    return apiClient.post<User[]>(API_ENDPOINTS.USERS.BULK_CREATE, {
      users,
    });
  }

  /**
   * Actualizar múltiples usuarios (bulk)
   */
  async bulkUpdateUsers(updates: Array<{ id: string; data: UpdateUserDTO }>): Promise<User[]> {
    return apiClient.put<User[]>(API_ENDPOINTS.USERS.BULK_UPDATE, {
      updates,
    });
  }

  /**
   * Eliminar múltiples usuarios (bulk)
   */
  async bulkDeleteUsers(userIds: string[]): Promise<void> {
    return apiClient.delete(API_ENDPOINTS.USERS.BULK_DELETE, {
      body: JSON.stringify({ userIds }),
    });
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUsersStats(): Promise<UsersStats> {
    return apiClient.get<UsersStats>(API_ENDPOINTS.USERS.STATS);
  }

  /**
   * Obtener actividad de un usuario
   */
  async getUserActivity(userId: string, dateRange?: { from: string; to: string }): Promise<any> {
    return apiClient.get(API_ENDPOINTS.USERS.ACTIVITY(userId), dateRange);
  }

  /**
   * Obtener roles asignados a un usuario
   */
  async getUserRoles(userId: string): Promise<any> {
    return apiClient.get(API_ENDPOINTS.USERS.ROLES(userId));
  }

  /**
   * Exportar usuarios
   */
  async exportUsers(
    format: 'pdf' | 'excel' | 'csv' | 'json',
    filters?: FilterParams
  ): Promise<Blob> {
    const params = { ...filters, format };
    
    const response = await fetch(
      `${apiClient['baseURL']}${API_ENDPOINTS.USERS.EXPORT}?${new URLSearchParams(params as any)}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Error al exportar usuarios');
    }

    return response.blob();
  }

  /**
   * Importar usuarios desde archivo
   */
  async importUsers(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.upload(API_ENDPOINTS.USERS.IMPORT, formData, onProgress);
  }
}

export const usersService = new UsersService();
export default usersService;
