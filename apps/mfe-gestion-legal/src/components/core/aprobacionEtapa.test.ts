import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reporte de QA: el rol "Resuelve" veía habilitada la opción de firmar en etapas cuyo
// aprobador configurado era el Jefe. La regla no puede depender de roles quemados en cada
// pantalla: sale de la configuración de la etapa (Configuraciones SIGL → Estados → Aprobación).

vi.mock('../../../../services/api/authService', () => ({
  authService: {
    hasRole: vi.fn(),
    isSuperAdmin: vi.fn(() => false),
    getCurrentUser: vi.fn(() => null),
  },
}));

import { authService } from '../../../../services/api/authService';
import {
  buscarEtapaConfigurada,
  etapaRequiereAprobacion,
  usuarioPuedeAprobarEtapa,
  usuarioPuedeFirmarEnEtapa,
} from './aprobacionEtapa';

const comoRol = (rol: string) => {
  (authService.hasRole as any).mockImplementation((code: string) => code === rol);
};

const etapaFalloJefe = {
  id: 'fallo-primera-instancia',
  nombre: 'Fallo de Primera Instancia',
  aprobacionTipo: 'rol' as const,
  aprobacionRol: 'JEFE_GESTION_LEGAL',
};

beforeEach(() => {
  vi.clearAllMocks();
  (authService.isSuperAdmin as any).mockReturnValue(false);
  (authService.getCurrentUser as any).mockReturnValue(null);
});

describe('buscarEtapaConfigurada', () => {
  it('ubica la etapa tanto por id como por nombre legible, sin importar tildes ni mayúsculas', () => {
    const etapas = [etapaFalloJefe];
    expect(buscarEtapaConfigurada(etapas, 'fallo-primera-instancia')).toBe(etapaFalloJefe);
    expect(buscarEtapaConfigurada(etapas, 'FALLO DE PRIMERA INSTANCIA')).toBe(etapaFalloJefe);
    expect(buscarEtapaConfigurada(etapas, 'Otra etapa')).toBeUndefined();
    expect(buscarEtapaConfigurada(etapas, undefined)).toBeUndefined();
  });
});

describe('etapaRequiereAprobacion', () => {
  it('sólo exige aprobación cuando el administrador configuró un aprobador', () => {
    expect(etapaRequiereAprobacion(etapaFalloJefe)).toBe(true);
    expect(etapaRequiereAprobacion({ aprobacionTipo: 'ninguno' })).toBe(false);
    expect(etapaRequiereAprobacion(undefined)).toBe(false);
  });
});

describe('usuarioPuedeAprobarEtapa', () => {
  it('el rol Resuelve NO aprueba una etapa cuyo aprobador configurado es el Jefe', () => {
    comoRol('RESUELVE_GESTION_LEGAL');
    expect(usuarioPuedeAprobarEtapa(etapaFalloJefe)).toBe(false);
  });

  it('el rol configurado en la etapa sí aprueba', () => {
    comoRol('JEFE_GESTION_LEGAL');
    expect(usuarioPuedeAprobarEtapa(etapaFalloJefe)).toBe(true);
  });

  it('si la etapa se parametriza con otro rol, ese rol aprueba y el Jefe no', () => {
    const etapaSecretariado = { ...etapaFalloJefe, aprobacionRol: 'SECRETARIADO_GESTION_LEGAL' };
    comoRol('SECRETARIADO_GESTION_LEGAL');
    expect(usuarioPuedeAprobarEtapa(etapaSecretariado)).toBe(true);
    comoRol('JEFE_GESTION_LEGAL');
    expect(usuarioPuedeAprobarEtapa(etapaSecretariado)).toBe(false);
  });

  it('con aprobación por usuario, sólo el usuario asignado aprueba', () => {
    const etapaUsuario = {
      id: 'auto-de-apertura',
      aprobacionTipo: 'usuario' as const,
      aprobacionUsuario: 'user-77',
    };
    (authService.getCurrentUser as any).mockReturnValue({ id: 'user-77' });
    expect(usuarioPuedeAprobarEtapa(etapaUsuario)).toBe(true);

    (authService.getCurrentUser as any).mockReturnValue({ id: 'user-12' });
    expect(usuarioPuedeAprobarEtapa(etapaUsuario)).toBe(false);
  });

  it('el super administrador siempre puede aprobar', () => {
    comoRol('RESUELVE_GESTION_LEGAL');
    (authService.isSuperAdmin as any).mockReturnValue(true);
    expect(usuarioPuedeAprobarEtapa(etapaFalloJefe)).toBe(true);
  });
});

describe('usuarioPuedeFirmarEnEtapa', () => {
  it('sólo firma el aprobador parametrizado en la etapa', () => {
    comoRol('JEFE_GESTION_LEGAL');
    expect(usuarioPuedeFirmarEnEtapa(etapaFalloJefe)).toBe(true);

    comoRol('RESUELVE_GESTION_LEGAL');
    expect(usuarioPuedeFirmarEnEtapa(etapaFalloJefe)).toBe(false);
  });

  it('una etapa sin aprobador parametrizado no exige firma: nadie ve el botón, ni el Jefe', () => {
    comoRol('JEFE_GESTION_LEGAL');
    expect(usuarioPuedeFirmarEnEtapa({ id: 'indagacion-previa', aprobacionTipo: 'ninguno' })).toBe(false);
    expect(usuarioPuedeFirmarEnEtapa(undefined)).toBe(false);
  });
});
