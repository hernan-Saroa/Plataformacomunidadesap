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

describe('authService.isCoordinadorComisiones & Administrador de Viáticos', () => {
  it.each([
    'COORDINADOR_COMISIONES_VIATICOS',
    'COORDINADOR_GRUPO_COMISIONES',
    'COORDINADOR_COMISIONES',
    'COORDINADORA_GRUPO_COMISIONES',
  ])('%s es Administrador del Módulo de Viáticos', (rol) => {
    conRoles([rol]);
    expect(authService.isCoordinadorComisiones()).toBe(true);
    expect(authService.isAdministradorViaticos()).toBe(true);
    expect(authService.canCancelarComision()).toBe(true);
    expect(authService.canManageConfig()).toBe(true);
    expect(authService.hasPermission('travel_expenses:manage_config')).toBe(true);
    expect(authService.hasPermission('travel_expenses:cancel_request')).toBe(true);
    expect(authService.hasPermission('travel_expenses:read_requests')).toBe(true);
  });

  it('un rol regular no es coordinador ni puede configurar ni cancelar sin permisos', () => {
    conRoles(['COMISIONADO']);
    expect(authService.isCoordinadorComisiones()).toBe(false);
    expect(authService.isAdministradorViaticos()).toBe(false);
    expect(authService.canCancelarComision()).toBe(false);
    expect(authService.canManageConfig()).toBe(false);
  });
});

