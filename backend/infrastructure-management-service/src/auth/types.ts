export interface AuthUser {
  userId: string;
  username?: string;
  email?: string;
  name?: string;
  cargo?: string;
  roles: string[];
  permissions?: Set<string> | string[];
  codigoTecnico?: string;
}
