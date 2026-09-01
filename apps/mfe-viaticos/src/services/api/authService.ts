import apiClient from './apiClient';

export interface UsuarioActual {
  userId: string;
  username: string;
  email?: string;
  roles?: string[];
  person?: {
    id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export class AuthService {
  async getCurrentUser(): Promise<UsuarioActual | null> {
    try {
      const data = await apiClient.get<{
        id: string;
        username: string;
        email?: string;
        roles?: string[];
        person?: {
          id?: string;
          full_name?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
        };
      }>('/auth/api/v1/verify');
      if (!data?.id) return null;
      return {
        userId: data.id,
        username: data.username,
        email: data.email,
        roles: data.roles,
        person: data.person,
      };
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
