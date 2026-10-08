import { describe, it, expect, afterEach, vi } from 'vitest';

vi.mock('./apiClient', () => ({ default: {}, apiClient: {} }));

import { authService, ROLES_ADMIN_VIATICOS } from './authService';

const conRoles = (roles: string[]) => {
  (window as any).__esap_auth_cache = { id_user: 'u-1', username: 'prueba', roles, permissions: [] };
};

afterEach(() => {
  delete (window as any).__esap_auth_cache;
});

/**
 * isSuperAdmin compara exacto contra ROLES_ADMIN_VIATICOS. Antes aceptaba
 * cualquier rol que contuviera ADMIN, y el rol emisor de paz y salvo
 * COORDINADOR_ADMINISTRATIVO_FINANCIERO (EFDS-1311) quedaba como superadministrador.
 */
describe('authService.isSuperAdmin', () => {
  it.each(['COORDINADOR_ADMINISTRATIVO_FINANCIERO', 'ADMINISTRADOR_SEDE', 'JEFE_ADMINISTRATIVA', 'COORDINADOR_COMISIONES_VIATICOS'])(
    '%s no es superadministrador',
    (rol) => {
      conRoles([rol]);
      expect(authService.isSuperAdmin()).toBe(false);
    },
  );

  it.each([...ROLES_ADMIN_VIATICOS])('%s sí lo es', (rol) => {
    conRoles([rol]);
    expect(authService.isSuperAdmin()).toBe(true);
  });

  it('normaliza la forma del código antes de comparar (Super-Admin → SUPER_ADMIN)', () => {
    conRoles(['Super-Admin']);
    expect(authService.isSuperAdmin()).toBe(true);
  });

  it('sin sesión no es superadministrador', () => {
    expect(authService.isSuperAdmin()).toBe(false);
  });
});
