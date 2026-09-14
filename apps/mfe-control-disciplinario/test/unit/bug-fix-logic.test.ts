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

// Helper implementing the new robust isSecretarioRadicadorUser logic
function checkIsSecretarioRadicador(user: any): boolean {
  if (!user) return false;
  const rawRoles = [
    ...(Array.isArray(user?.roles) ? user.roles : user?.roles ? [user.roles] : []),
    ...(Array.isArray(user?.person?.roles) ? user.person.roles : []),
    ...(user?.role ? [user.role] : []),
    ...(user?.rol ? [user.rol] : []),
  ];

  return rawRoles.some((r: any) => {
    const candidates = [
      typeof r === 'string' ? r : '',
      r?.code,
      r?.name,
      r?.nombre,
      r?.slug,
    ].filter(Boolean);

    return candidates.some((cand: string) => {
      const clean = cand
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
      return (
        clean === 'SECRETARIA_RADICADOR' ||
        clean === 'SECRETARIO_RADICADOR' ||
        clean === 'RADICADOR_DISCIPLINARIO' ||
        clean === 'RADICADOR' ||
        clean.includes('SECRETARI') ||
        clean.includes('RADICADOR')
      );
    });
  });
}

function isEtapaCargos(etapaNombre?: string | null): boolean {
  if (!etapaNombre) return false;
  const n = etapaNombre
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  return (
    n === 'CARGOS' ||
    n.includes('CARGO') ||
    n.includes('PLIEGO') ||
    n === 'EVALUACION' ||
    n.includes('EVALUAC')
  );
}

// Helper simulating Kanban canDrop logic
function canDropInKanban(
  isRadicador: boolean,
  item: { tipo?: string; tipoItem?: string; etapaActual?: string },
  targetEtapa: string
): boolean {
  const esProceso = item?.tipoItem === 'proceso' || item?.tipo === 'proceso' || (item?.tipo !== 'noticia' && !!item?.etapaActual);

  if (isRadicador) {
    if (esProceso) {
      return isEtapaCargos(item.etapaActual) && isEtapaJuzgamiento(targetEtapa);
    }
    return false;
  }
  return true;
}

// Helper simulating canDrag logic
function canDragInKanban(
  isRadicador: boolean,
  item: { tipo?: string; tipoItem?: string; etapaActual?: string }
): boolean {
  const esProceso = item?.tipoItem === 'proceso' || item?.tipo === 'proceso' || (item?.tipo !== 'noticia' && !!item?.etapaActual);

  if (isRadicador) {
    if (esProceso) {
      return isEtapaCargos(item.etapaActual);
    }
    return false; // Noticias cannot be dragged by Radicador
  }
  return true;
}

describe('Secretario/Radicador Role Detection - checkIsSecretarioRadicador', () => {
  it('detects string role "SECRETARIA_RADICADOR"', () => {
    expect(checkIsSecretarioRadicador({ roles: ['SECRETARIA_RADICADOR'] })).toBe(true);
  });

  it('detects accented string role "Secretaría / Radicador"', () => {
    expect(checkIsSecretarioRadicador({ roles: ['Secretaría / Radicador'] })).toBe(true);
  });

  it('detects string role "RADICADOR_DISCIPLINARIO"', () => {
    expect(checkIsSecretarioRadicador({ roles: ['RADICADOR_DISCIPLINARIO'] })).toBe(true);
  });

  it('detects generic string role "RADICADOR"', () => {
    expect(checkIsSecretarioRadicador({ roles: ['RADICADOR'] })).toBe(true);
  });

  it('detects role as object with code: "SECRETARIA_RADICADOR"', () => {
    expect(checkIsSecretarioRadicador({ roles: [{ code: 'SECRETARIA_RADICADOR' }] })).toBe(true);
  });

  it('detects role as object with name: "Secretaría / Radicador" (accented, no code)', () => {
    expect(checkIsSecretarioRadicador({ roles: [{ name: 'Secretaría / Radicador' }] })).toBe(true);
  });

  it('detects role inside user.person.roles', () => {
    expect(checkIsSecretarioRadicador({ person: { roles: ['Secretaría / Radicador'] } })).toBe(true);
  });

  it('detects single role in user.role', () => {
    expect(checkIsSecretarioRadicador({ role: 'RADICADOR_DISCIPLINARIO' })).toBe(true);
  });

  it('detects single role in user.rol', () => {
    expect(checkIsSecretarioRadicador({ rol: 'Secretaría / Radicador' })).toBe(true);
  });

  it('returns false for unrelated roles like INVESTIGADOR or ABOGADO', () => {
    expect(checkIsSecretarioRadicador({ roles: ['INVESTIGADOR', 'PROFESIONAL'] })).toBe(false);
    expect(checkIsSecretarioRadicador({ roles: [] })).toBe(false);
    expect(checkIsSecretarioRadicador(null)).toBe(false);
  });
});

describe('Stage Detection - isEtapaCargos', () => {
  it('identifies "Cargos" and "CARGOS"', () => {
    expect(isEtapaCargos('Cargos')).toBe(true);
    expect(isEtapaCargos('CARGOS')).toBe(true);
  });

  it('identifies "Formulación de Cargos"', () => {
    expect(isEtapaCargos('Formulación de Cargos')).toBe(true);
    expect(isEtapaCargos('FORMULACION DE CARGOS')).toBe(true);
  });

  it('identifies "Pliego de Cargos"', () => {
    expect(isEtapaCargos('Pliego de Cargos')).toBe(true);
  });

  it('identifies "Evaluación"', () => {
    expect(isEtapaCargos('Evaluación')).toBe(true);
    expect(isEtapaCargos('EVALUACION')).toBe(true);
  });

  it('returns false for other stages', () => {
    expect(isEtapaCargos('Juzgamiento')).toBe(false);
    expect(isEtapaCargos('Recepción')).toBe(false);
    expect(isEtapaCargos('Indagación Previa')).toBe(false);
    expect(isEtapaCargos('Investigación')).toBe(false);
    expect(isEtapaCargos('Fallo')).toBe(false);
  });
});

describe('Radicador Kanban Drag & Drop Restrictions', () => {
  const isRadicador = true;

  it('ALLOWS dragging process from Cargos to Juzgamiento', () => {
    const procesoCargos = { tipo: 'proceso', etapaActual: 'Cargos' };
    expect(canDragInKanban(isRadicador, procesoCargos)).toBe(true);
    expect(canDropInKanban(isRadicador, procesoCargos, 'Juzgamiento')).toBe(true);
  });

  it('ALLOWS dragging process with Formulación de Cargos to Juzgamiento', () => {
    const procesoCargos = { tipoItem: 'proceso', etapaActual: 'Formulación de Cargos' };
    expect(canDragInKanban(isRadicador, procesoCargos)).toBe(true);
    expect(canDropInKanban(isRadicador, procesoCargos, 'Juzgamiento')).toBe(true);
  });

  it('BLOCKS dropping process from Juzgamiento to Cargos (reverse transition)', () => {
    const procesoJuzgamiento = { tipo: 'proceso', etapaActual: 'Juzgamiento' };
    expect(canDropInKanban(isRadicador, procesoJuzgamiento, 'Cargos')).toBe(false);
  });

  it('BLOCKS dropping process between other stages (e.g. Recepción to Valoración)', () => {
    const procesoRecepcion = { tipo: 'proceso', etapaActual: 'Recepción' };
    expect(canDropInKanban(isRadicador, procesoRecepcion, 'Valoración')).toBe(false);
  });

  it('BLOCKS dropping process from Investigación to Fallo', () => {
    const procesoInvestigacion = { tipo: 'proceso', etapaActual: 'Investigación' };
    expect(canDropInKanban(isRadicador, procesoInvestigacion, 'Fallo')).toBe(false);
  });

  it('BLOCKS dragging processes in other stages for Radicador', () => {
    expect(canDragInKanban(isRadicador, { tipo: 'proceso', etapaActual: 'Recepción' })).toBe(false);
    expect(canDragInKanban(isRadicador, { tipo: 'proceso', etapaActual: 'Investigación' })).toBe(false);
    expect(canDragInKanban(isRadicador, { tipo: 'proceso', etapaActual: 'Juzgamiento' })).toBe(false);
  });

  it('BLOCKS dragging and dropping noticias for Radicador', () => {
    const noticia = { tipo: 'noticia', etapaActual: 'Recepción' };
    expect(canDragInKanban(isRadicador, noticia)).toBe(false);
    expect(canDropInKanban(isRadicador, noticia, 'Valoración')).toBe(false);
  });
});