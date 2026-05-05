/**
 * Mock básico para flujos de activación de cuenta.
 * Se deriva de MOCK_USERS_WITH_SEDES para evitar duplicar datos.
 */
import { MOCK_USERS_WITH_SEDES, type UserWithSedes } from './mockUsersWithSedes';

export interface MockUser {
  document: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'blocked' | 'pending';
  enrollmentMethod: 'qr' | 'manual' | 'massive';
}

const mapUser = (user: UserWithSedes): MockUser | null => {
  if (!user.documentNumber) return null;

  return {
    document: user.documentNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status,
    enrollmentMethod: user.enrollmentMethod,
  };
};

export const MOCK_USERS: MockUser[] = MOCK_USERS_WITH_SEDES.map(mapUser).filter(
  (u): u is MockUser => Boolean(u)
);
