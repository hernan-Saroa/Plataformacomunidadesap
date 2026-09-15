import { describe, it, expect, vi, beforeEach } from 'vitest';

// Se mockea el authService real (mismo módulo que importa gestionLegalVistaPermisos.ts)
// para controlar exactamente qué permisos "tiene" el usuario en cada test, sin
// depender de sesión/backend real.
vi.mock('../../services/api/authService', () => ({
  authService: {
    hasAnyPermission: vi.fn(() => false),
  },
}));

import { authService } from '../../services/api/authService';
import {
  VISTAS_VALIDAS,
  VISTA_PERMISOS,
  puedeVerVista,
  getPrimeraVistaPermitida,
  getVistaInicialDesdeQuery,
  type VistaDisponible,
} from './gestionLegalVistaPermisos';

const hasAnyPermissionMock = vi.mocked(authService.hasAnyPermission);

/** Deja al usuario simulado con acceso únicamente a las vistas indicadas. */
function permitirSolo(...vistas: VistaDisponible[]) {
  const permisosPermitidos = new Set(vistas.flatMap((v) => VISTA_PERMISOS[v]));
  hasAnyPermissionMock.mockImplementation((permisos: string[]) =>
    permisos.some((p) => permisosPermitidos.has(p as any)),
  );
}

function navegarA(query: string) {
  window.history.pushState({}, '', query ? `/?${query}` : '/');
}

describe('gestionLegalVistaPermisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasAnyPermissionMock.mockReturnValue(false);
    navegarA('');
  });

  it('define exactamente un permiso "ver" (+ el "manage" histórico) para cada uno de los 12 submódulos del menú', () => {
    expect(VISTAS_VALIDAS).toHaveLength(12);
    for (const vista of VISTAS_VALIDAS) {
      expect(VISTA_PERMISOS[vista]).toHaveLength(2);
      const [manage, ver] = VISTA_PERMISOS[vista];
      expect(manage).toMatch(/\.manage$/);
      expect(ver).toMatch(/\.ver$/);
    }
  });

  describe('puedeVerVista', () => {
    it('retorna true si el usuario tiene el permiso "ver" del submódulo, aunque no tenga el "manage"', () => {
      permitirSolo('terminos');
      expect(puedeVerVista('terminos')).toBe(true);
      expect(puedeVerVista('plan-accion')).toBe(false);
    });

    it('sigue aceptando el permiso "manage" histórico como puerta de acceso (compatibilidad con roles existentes)', () => {
      hasAnyPermissionMock.mockImplementation((permisos: string[]) =>
        permisos.includes('gestion-legal.defensa-judicial.manage'),
      );
      expect(puedeVerVista('defensa-judicial')).toBe(true);
    });

    it('retorna false para todos los submódulos cuando el rol no tiene ningún permiso de gestión legal', () => {
      hasAnyPermissionMock.mockReturnValue(false);
      for (const vista of VISTAS_VALIDAS) {
        expect(puedeVerVista(vista)).toBe(false);
      }
    });
  });

  describe('getPrimeraVistaPermitida', () => {
    it('retorna la primera vista de VISTAS_VALIDAS a la que el usuario tiene acceso', () => {
      // Un rol de "solo consulta" con acceso a los 4 submódulos del bug original,
      // en un orden distinto al de VISTAS_VALIDAS.
      permitirSolo('planes-mejoramiento', 'riesgos', 'plan-accion', 'terminos');
      // 'terminos' aparece antes que 'plan-accion', 'riesgos' y 'planes-mejoramiento' en VISTAS_VALIDAS
      expect(getPrimeraVistaPermitida()).toBe('terminos');
    });

    it('no incluye submódulos sin permiso aunque aparezcan antes en el orden del menú', () => {
      permitirSolo('riesgos');
      expect(getPrimeraVistaPermitida()).toBe('riesgos');
    });
  });

  describe('getVistaInicialDesdeQuery', () => {
    it('usa la vista de "?modulo=" cuando el usuario tiene permiso para ella', () => {
      permitirSolo('riesgos', 'terminos');
      navegarA('modulo=riesgos');
      expect(getVistaInicialDesdeQuery()).toBe('riesgos');
    });

    it('ignora "?modulo=" y cae al primer submódulo permitido cuando el usuario NO tiene permiso para esa vista', () => {
      // Rol de consulta (Términos/Plan de Acción/Riesgos/Planes de Mejoramiento) sin
      // acceso a Defensa Judicial: una notificación vieja con ?modulo=defensa-judicial
      // no debe mostrar contenido no autorizado.
      permitirSolo('terminos', 'plan-accion', 'riesgos', 'planes-mejoramiento');
      navegarA('modulo=defensa-judicial');
      expect(getVistaInicialDesdeQuery()).toBe('terminos');
    });

    it('sin query param, ya NO asume "defensa-judicial" por defecto: cae al primer submódulo permitido', () => {
      permitirSolo('planes-mejoramiento');
      navegarA('');
      expect(getVistaInicialDesdeQuery()).toBe('planes-mejoramiento');
    });

    it('ignora un valor de "?modulo=" que no es un submódulo válido', () => {
      permitirSolo('terminos');
      navegarA('modulo=no-existe');
      expect(getVistaInicialDesdeQuery()).toBe('terminos');
    });
  });
});
