import { describe, expect, it } from 'vitest';

// Resilient stage normalization logic used in ModalDetallesProceso & DashboardKanbanOperativo
function isEtapaJuzgamiento(etapaNombre?: string | null): boolean {
  if (!etapaNombre) return false;
  const n = etapaNombre
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  return n === 'JUZGAMIENTO' || n.includes('JUZG');
}

// Role and permission evaluation logic for sending to Jurídica
function canUserSendJuridica(
  roles: (string | { code: string })[],
  permissions: string[]
): boolean {
  const roleCodes = roles.map(r => (typeof r === 'string' ? r : r?.code));
  const isSuperAdmin = roleCodes.includes('SUPER_ADMIN');
  const isAdmin = roleCodes.includes('ADMIN');
  const isRadicador = roleCodes.some(
    r => r === 'SECRETARIA_RADICADOR' || r === 'RADICADOR_DISCIPLINARIO' || r === 'RADICADOR'
  );
  const hasPermission = permissions.includes('control-disciplinario.procesos.send_to_juridica');

  return hasPermission || isSuperAdmin || isAdmin || isRadicador;
}

// Detection of Pliego de Cargos autos
function esPliegoAuto(auto: { tipo?: string; titulo?: string; plantilla?: string }): boolean {
  const tipo = (auto.tipo || '').toUpperCase();
  const titulo = (auto.titulo || '').toLowerCase();
  const plantilla = (auto.plantilla || '').toLowerCase();

  return (
    tipo === 'AUTO_FORMULACION_PLIEGO' ||
    tipo === 'PLIEGO_CARGOS' ||
    titulo.includes('pliego') ||
    titulo.includes('cargo') ||
    plantilla.includes('pliego') ||
    plantilla.includes('cargo')
  );
}

describe('Stage normalization logic - isEtapaJuzgamiento', () => {
  it('returns true for exact match "Juzgamiento"', () => {
    expect(isEtapaJuzgamiento('Juzgamiento')).toBe(true);
  });

  it('returns true for lowercase "juzgamiento"', () => {
    expect(isEtapaJuzgamiento('juzgamiento')).toBe(true);
  });

  it('returns true for uppercase "JUZGAMIENTO"', () => {
    expect(isEtapaJuzgamiento('JUZGAMIENTO')).toBe(true);
  });

  it('returns true for mixed case "JuzGaMiEnTo"', () => {
    expect(isEtapaJuzgamiento('JuzGaMiEnTo')).toBe(true);
  });

  it('returns true for padded spaces "  Juzgamiento  "', () => {
    expect(isEtapaJuzgamiento('  Juzgamiento  ')).toBe(true);
  });

  it('returns true for multi-word variants containing "Juzgamiento"', () => {
    expect(isEtapaJuzgamiento('Etapa de Juzgamiento')).toBe(true);
    expect(isEtapaJuzgamiento('Juzgamiento Disciplinario')).toBe(true);
  });

  it('returns false for other stages', () => {
    expect(isEtapaJuzgamiento('Formulación de Cargos')).toBe(false);
    expect(isEtapaJuzgamiento('Investigación')).toBe(false);
    expect(isEtapaJuzgamiento('Valoración')).toBe(false);
    expect(isEtapaJuzgamiento('Indagación')).toBe(false);
    expect(isEtapaJuzgamiento('Fallo')).toBe(false);
    expect(isEtapaJuzgamiento('Recepción')).toBe(false);
    expect(isEtapaJuzgamiento('ARCHIVO')).toBe(false);
    expect(isEtapaJuzgamiento('INHIBITORIO')).toBe(false);
  });

  it('returns false for falsy values', () => {
    expect(isEtapaJuzgamiento(undefined)).toBe(false);
    expect(isEtapaJuzgamiento(null)).toBe(false);
    expect(isEtapaJuzgamiento('')).toBe(false);
  });
});

describe('Role and permission check - canUserSendJuridica', () => {
  it('allows user with SECRETARIA_RADICADOR role', () => {
    expect(canUserSendJuridica(['SECRETARIA_RADICADOR'], [])).toBe(true);
    expect(canUserSendJuridica([{ code: 'SECRETARIA_RADICADOR' }], [])).toBe(true);
  });

  it('allows user with RADICADOR_DISCIPLINARIO role', () => {
    expect(canUserSendJuridica(['RADICADOR_DISCIPLINARIO'], [])).toBe(true);
    expect(canUserSendJuridica([{ code: 'RADICADOR_DISCIPLINARIO' }], [])).toBe(true);
  });

  it('allows user with generic RADICADOR role', () => {
    expect(canUserSendJuridica(['RADICADOR'], [])).toBe(true);
  });

  it('allows ADMIN and SUPER_ADMIN roles', () => {
    expect(canUserSendJuridica(['ADMIN'], [])).toBe(true);
    expect(canUserSendJuridica(['SUPER_ADMIN'], [])).toBe(true);
  });

  it('allows user with explicit send_to_juridica permission regardless of role', () => {
    expect(
      canUserSendJuridica(['OTRO_ROL'], ['control-disciplinario.procesos.send_to_juridica'])
    ).toBe(true);
  });

  it('denies user without permission or radicador/admin role', () => {
    expect(canUserSendJuridica(['PROFESIONAL_DISCIPLINARIO'], [])).toBe(false);
    expect(canUserSendJuridica(['INVESTIGADOR'], ['control-disciplinario.procesos.view'])).toBe(false);
    expect(canUserSendJuridica([], [])).toBe(false);
  });
});

describe('Pliego auto detection - esPliegoAuto', () => {
  it('identifies AUTO_FORMULACION_PLIEGO', () => {
    expect(esPliegoAuto({ tipo: 'AUTO_FORMULACION_PLIEGO' })).toBe(true);
  });

  it('identifies PLIEGO_CARGOS', () => {
    expect(esPliegoAuto({ tipo: 'PLIEGO_CARGOS' })).toBe(true);
  });

  it('identifies by title containing "pliego"', () => {
    expect(esPliegoAuto({ titulo: 'Auto de Pliego de Cargos' })).toBe(true);
  });

  it('identifies by title containing "cargos"', () => {
    expect(esPliegoAuto({ titulo: 'Auto Formulación de Cargos No. 045' })).toBe(true);
  });

  it('identifies by plantilla containing "pliego"', () => {
    expect(esPliegoAuto({ plantilla: 'plantilla_pliego_definitivo' })).toBe(true);
  });

  it('returns false for unrelated autos', () => {
    expect(esPliegoAuto({ tipo: 'AUTO_INDAGACION', titulo: 'Auto de Indagación Previa' })).toBe(false);
    expect(esPliegoAuto({ tipo: 'AUTO_ARCHIVO', titulo: 'Auto de Archivo Definitivo' })).toBe(false);
  });
});