import { apiClient } from './apiClient';

// Prefijo del servicio en el API Gateway
// Nueva estructura: /{service}/api/v{version}/{path}
const SERVICE_PREFIX = '/auth/api/v1';

export interface User {
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

class AuthService {
  async getProfesionales(): Promise<User[]> {
    // En un escenario real, filtraríamos por rol 'ABOGADO' o similar
    // Por ahora traemos todos los usuarios
    return apiClient.get<User[]>(`${SERVICE_PREFIX}/users`);
  }
}

export const authService = new AuthService();
export default authService;
