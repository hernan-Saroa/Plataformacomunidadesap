import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VIATICOS_PERMISOS_GENERALES,
  VIATICOS_ROLE_PERMISSION_MAP,
  hasViaticosRolePermission,
  isSecretarioViaticos,
  isAnalistaViaticos,
  isControlViaticos,
  isSubdireccionCorporativa,
  isDireccionNacional,
  isPresupuesto,
  isTesoreria,
  isSst,
  isResponsableTiquetes,
  isEnlaceDependencia,
} from './viaticosPermissionsGuard';
import { authService, AuthService, UsuarioActual } from '../services/api/authService';

describe('viaticosPermissionsGuard — Mapeo y Guards por Permisos Inmutables', () => {
  describe('Constantes y Mapeo Canónico', () => {
    it('debe contener los 10 permisos generales inmutables de la migración 441', () => {
      expect(VIATICOS_PERMISOS_GENERALES.ENLACE).toBe('travel_expenses.general.es_enlace_dependencia');
      expect(VIATICOS_PERMISOS_GENERALES.SECRETARIO).toBe('travel_expenses.general.es_secretario_viaticos');
      expect(VIATICOS_PERMISOS_GENERALES.ANALISTA).toBe('travel_expenses.general.es_analista_viaticos');
      expect(VIATICOS_PERMISOS_GENERALES.CONTROL_VIATICOS).toBe('travel_expenses.general.es_control_viaticos');
      expect(VIATICOS_PERMISOS_GENERALES.SUBDIRECCION).toBe('travel_expenses.general.es_subdireccion_corporativa');
      expect(VIATICOS_PERMISOS_GENERALES.DIRECCION_NACIONAL).toBe('travel_expenses.general.es_direccion_nacional');
      expect(VIATICOS_PERMISOS_GENERALES.PRESUPUESTO).toBe('travel_expenses.general.es_presupuesto');
      expect(VIATICOS_PERMISOS_GENERALES.TESORERIA).toBe('travel_expenses.general.es_tesoreria');
      expect(VIATICOS_PERMISOS_GENERALES.SST).toBe('travel_expenses.general.es_sst');
      expect(VIATICOS_PERMISOS_GENERALES.TIQUETES).toBe('travel_expenses.general.es_responsable_tiquetes');
    });

    it('cada rol funcional debe tener configurado su permiso inmutable y su fallback', () => {
      const roles = Object.keys(VIATICOS_PERMISOS_GENERALES) as (keyof typeof VIATICOS_PERMISOS_GENERALES)[];
      roles.forEach((rolKey) => {
        const config = VIATICOS_ROLE_PERMISSION_MAP[rolKey];
        expect(config).toBeDefined();
        expect(config.permission).toBe(VIATICOS_PERMISOS_GENERALES[rolKey]);
        expect(config.legacyRoles.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Evaluación de Permisos: hasViaticosRolePermission', () => {
    const crearMockAuth = (user: Partial<UsuarioActual> | null) => {
      const usuarioCompleto: UsuarioActual | null = user
        ? {
            userId: 'test-user-id',
            username: 'testuser',
            roles: user.roles || [],
            permissions: user.permissions || [],
            esAdmin: user.esAdmin || false,
          }
        : null;

      return {
        getCurrentUserSync: vi.fn(() => usuarioCompleto),
        hasPermission: vi.fn((perm: string) =>
          Boolean(usuarioCompleto?.permissions.includes(perm) || usuarioCompleto?.esAdmin),
        ),
        hasAnyPermission: vi.fn((perms: string[]) =>
          Boolean(
            usuarioCompleto?.esAdmin ||
              perms.some((p) => usuarioCompleto?.permissions.includes(p)),
          ),
        ),
        isSuperAdmin: vi.fn(() => Boolean(usuarioCompleto?.esAdmin)),
      } as unknown as AuthService;
    };

    it('debe otorgar acceso cuando el usuario tiene ÚNICAMENTE el permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: ['OTRO_ROL_CUALQUIERA'], // sin rol quemado
        permissions: ['travel_expenses.general.es_secretario_viaticos'],
      });

      expect(hasViaticosRolePermission(mockAuth, 'SECRETARIO')).toBe(true);
      expect(isSecretarioViaticos(mockAuth)).toBe(true);

      // No debe tener acceso a otros roles
      expect(hasViaticosRolePermission(mockAuth, 'ANALISTA')).toBe(false);
      expect(isAnalistaViaticos(mockAuth)).toBe(false);
    });

    it('debe otorgar acceso por fallback de rol quemado si aún no tiene el permiso (retrocompatibilidad)', () => {
      const mockAuth = crearMockAuth({
        roles: ['SECRETARIO_VIATICOS'],
        permissions: [],
      });

      expect(hasViaticosRolePermission(mockAuth, 'SECRETARIO')).toBe(true);
      expect(isSecretarioViaticos(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso al Analista con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: ['USUARIO_ESTANDAR'],
        permissions: ['travel_expenses.general.es_analista_viaticos'],
      });

      expect(isAnalistaViaticos(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Control Viáticos con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_control_viaticos'],
      });

      expect(isControlViaticos(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Presupuesto con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_presupuesto'],
      });

      expect(isPresupuesto(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Tesorería con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_tesoreria'],
      });

      expect(isTesoreria(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a SST con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_sst'],
      });

      expect(isSst(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Subdirección Corporativa con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_subdireccion_corporativa'],
      });

      expect(isSubdireccionCorporativa(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Dirección Nacional con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_direccion_nacional'],
      });

      expect(isDireccionNacional(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Responsable de Tiquetes con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_responsable_tiquetes'],
      });

      expect(isResponsableTiquetes(mockAuth)).toBe(true);
    });

    it('debe otorgar acceso a Enlace de Dependencia con permiso específico inmutable', () => {
      const mockAuth = crearMockAuth({
        roles: [],
        permissions: ['travel_expenses.general.es_enlace_dependencia'],
      });

      expect(isEnlaceDependencia(mockAuth)).toBe(true);
    });

    it('debe denegar acceso si el usuario no tiene permisos ni roles', () => {
      const mockAuth = crearMockAuth({
        roles: ['INVITADO'],
        permissions: ['portal:read'],
      });

      expect(isSecretarioViaticos(mockAuth)).toBe(false);
      expect(isAnalistaViaticos(mockAuth)).toBe(false);
      expect(isControlViaticos(mockAuth)).toBe(false);
      expect(isPresupuesto(mockAuth)).toBe(false);
      expect(isTesoreria(mockAuth)).toBe(false);
      expect(isSst(mockAuth)).toBe(false);
    });

    it('Super Admin debe tener acceso general (excepto analista por separación funcional)', () => {
      const mockAuth = crearMockAuth({
        roles: ['SUPER_ADMIN'],
        permissions: ['*'],
        esAdmin: true,
      });

      expect(isSecretarioViaticos(mockAuth)).toBe(true);
      expect(isControlViaticos(mockAuth)).toBe(true);
      expect(isPresupuesto(mockAuth)).toBe(true);
      expect(isTesoreria(mockAuth)).toBe(true);
      expect(isSst(mockAuth)).toBe(true);
      // Analista retorna false para admin para evitar que la vista quede fija en bandeja de analista
      expect(isAnalistaViaticos(mockAuth)).toBe(false);
    });
  });

  describe('Integración con AuthService real', () => {
    let originalCache: any;

    beforeEach(() => {
      if (typeof window !== 'undefined') {
        originalCache = (window as any).__esap_auth_cache;
      }
    });

    afterEach(() => {
      if (typeof window !== 'undefined') {
        (window as any).__esap_auth_cache = originalCache;
      }
    });

    it('authService.isSecretario() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-sec-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_secretario_viaticos'],
      };

      expect(authService.isSecretario()).toBe(true);
    });

    it('authService.isAnalista() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-an-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_analista_viaticos'],
      };

      expect(authService.isAnalista()).toBe(true);
    });

    it('authService.isControlViaticos() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-ctrl-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_control_viaticos'],
      };

      expect(authService.isControlViaticos()).toBe(true);
    });

    it('authService.isPresupuesto() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-pre-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_presupuesto'],
      };

      expect(authService.isPresupuesto()).toBe(true);
    });

    it('authService.isTesoreria() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-tes-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_tesoreria'],
      };

      expect(authService.isTesoreria()).toBe(true);
    });

    it('authService.isSst() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-sst-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_sst'],
      };

      expect(authService.isSst()).toBe(true);
    });

    it('authService.isEnlaceDependencia() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-enlace-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_enlace_dependencia'],
      };

      expect(authService.isEnlaceDependencia()).toBe(true);
    });

    it('authService.isResponsableTiquetes() reconoce al usuario con permiso específico inmutable', () => {
      (window as any).__esap_auth_cache = {
        id_user: 'user-tiq-01',
        roles: ['USUARIO_GENERICO'],
        permissions: ['travel_expenses.general.es_responsable_tiquetes'],
      };

      expect(authService.isResponsableTiquetes()).toBe(true);
    });
  });
});
