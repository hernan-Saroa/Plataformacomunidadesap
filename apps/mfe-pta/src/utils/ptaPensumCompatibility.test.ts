import { describe, expect, it } from 'vitest';
import {
  filterAssignmentsByPensum,
  findLegacyCatalogAssignment,
  formatPtaAssignmentName,
  formatPtaPensum,
  inferLegacyPensum,
  listPensumsForProgram,
  mergeAssignmentCatalog,
  reconcileLegacyAssignment,
  replaceProgramAssignmentCatalog,
  SIN_PENSUM_KEY,
} from './ptaPensumCompatibility';

const catalog = [
  { id: '10', programaId: '1', nombre: 'Derecho Público', codigo: 'ASIG-10', pensum: 'AP_35', pensumKey: 'AP_35' },
  { id: '11', programaId: '1', nombre: 'Economía Pública', codigo: 'ASIG-11', pensum: 'AP_36', pensumKey: 'AP_36' },
  { id: '20', programaId: '2', nombre: 'Seminario', codigo: 'ASIG-20', pensum: null, pensumKey: SIN_PENSUM_KEY },
];

describe('compatibilidad Pensum para borradores PTA', () => {
  it('ofrece únicamente los pensums activos del programa seleccionado', () => {
    const rows = [
      { id: '1', programaId: 'diurno', pensum: 'AP_33', activa: true },
      { id: '2', programaId: 'diurno', pensum: 'AP_35', activa: true },
      { id: '3', programaId: 'diurno', pensum: 'AP_34', activa: false },
      { id: '4', programaId: 'diurno', pensum: 'AP_36', deletedAt: '2026-10-01' },
      { id: '5', programaId: 'nocturno', pensum: 'AP_34', activa: true },
      { id: '6', programaId: 'nocturno', pensum: 'AP_36', activa: true },
    ];
    expect(listPensumsForProgram(rows, 'diurno').map(row => row.value)).toEqual(['AP_33', 'AP_35']);
    expect(listPensumsForProgram(rows, 'nocturno').map(row => row.value)).toEqual(['AP_34', 'AP_36']);
    expect(filterAssignmentsByPensum(rows, 'diurno', '').map(row => row.id)).toEqual(['1', '2']);
    expect(filterAssignmentsByPensum(rows, 'diurno', 'AP_34')).toEqual([]);
  });

  it('respeta estados inactivos serializados y conserva referencias históricas para lectura', () => {
    const rows = [false, 0, 'false', '0'].map((activa, index) => ({ id: String(index), programaId: 'diurno', pensum: 'AP_34', activa }));
    expect(listPensumsForProgram(rows, 'diurno')).toEqual([]);
    expect(findLegacyCatalogAssignment({ asignatura_id: '0', programa_id: 'diurno' }, rows)?.id).toBe('0');
  });

  it('reemplaza el catálogo del programa sin conservar pensums de una respuesta anterior', () => {
    const anteriores = [...catalog, { id: '12', programaId: '1', pensum: 'ANTIGUO' }];
    const merged = replaceProgramAssignmentCatalog(anteriores, [catalog[0],
      { id: '21', programaId: '2', pensum: 'AJENO' }], '1');
    expect(listPensumsForProgram(merged, '1').map(row => row.value)).toEqual(['AP_35']);
    expect(merged.find(row => row.id === '20')).toEqual(catalog[2]);
    expect(merged.some(row => row.id === '21')).toBe(false);
  });

  it('recupera Pensum aunque los ids antiguos sean numéricos', () => {
    expect(inferLegacyPensum({ asignatura_id: 10, programa_id: 1 }, catalog)).toBe('AP_35');
  });

  it('actualiza el marcador legacy cuando el catálogo ya tiene Pensum real', () => {
    expect(inferLegacyPensum({ asignatura_id: '11', programa_id: '1', pensum: SIN_PENSUM_KEY }, catalog)).toBe('AP_36');
  });

  it('reemplaza un Pensum desactualizado con el valor vigente del catálogo', () => {
    expect(inferLegacyPensum({
      asignatura_id: 11,
      programa_id: '1',
      pensum: 'PENSUM_ANTIGUO',
    }, catalog)).toBe('AP_36');
  });

  it('recupera la asignatura por identidad estable cuando el id fue reutilizado', () => {
    const legacy = {
      asignatura_id: '10',
      asignatura_codigo: 'ASIG-11',
      asignatura_nombre: 'Economía Pública (AP_día)',
      programa_id: '1',
      pensum: 'AP_36',
    };

    expect(findLegacyCatalogAssignment(legacy, catalog)?.id).toBe('11');
    expect(reconcileLegacyAssignment(legacy, catalog)).toMatchObject({
      asignatura_id: '11',
      asignatura_nombre: 'Economía Pública',
      pensum: 'AP_36',
    });
  });

  it('no revierte una asignatura recién elegida por el docente al corregir una devolución', () => {
    // Reproduce el bug reportado: un PTA devuelto trae `asignatura_codigo` de la
    // asignatura ORIGINAL (id '10'). Si el docente elige otra asignatura del MISMO
    // programa (id '11') y handleAsigChange sincroniza correctamente el nuevo
    // código, la reconciliación no debe "recuperar" la asignatura vieja.
    const original = {
      asignatura_id: '10',
      asignatura_codigo: 'ASIG-10',
      asignatura_nombre: 'Derecho Público',
      programa_id: '1',
      pensum: 'AP_35',
    };

    // Antes del fix: handleAsigChange no actualizaba asignatura_codigo, así que
    // seguía apuntando a la asignatura devuelta y el docente quedaba bloqueado.
    const sinSincronizar = { ...original, asignatura_id: '11', asignatura_nombre: 'Economía Pública', pensum: 'AP_36' };
    expect(reconcileLegacyAssignment(sinSincronizar, catalog)).toMatchObject({
      asignatura_id: '10',
      asignatura_nombre: 'Derecho Público',
    });

    // Con el fix: handleAsigChange también actualiza asignatura_codigo al elegir
    // la nueva asignatura, por lo que la reconciliación conserva la selección.
    const sincronizado = { ...sinSincronizar, asignatura_codigo: 'ASIG-11' };
    expect(reconcileLegacyAssignment(sincronizado, catalog)).toBe(sincronizado);
  });

  it('tampoco se queda pegado si el docente cambia programa, Pensum y asignatura a la vez', () => {
    // Mismo escenario de devolución, pero el docente elige una asignatura de OTRO
    // programa (id '20', programa '2', sin Pensum). El código es único en toda la
    // BD, así que el match por código nunca puede "alcanzar" la asignatura
    // original ('ASIG-10', programa '1') una vez que el Programa filtra el
    // catálogo — se resuelve por nombre y ya coincide con la nueva selección.
    const cambioTotal = {
      asignatura_id: '20',
      asignatura_codigo: 'ASIG-20',
      asignatura_nombre: 'Seminario',
      programa_id: '2',
      pensum: SIN_PENSUM_KEY,
    };
    expect(reconcileLegacyAssignment(cambioTotal, catalog)).toBe(cambioTotal);

    // Incluso si por alguna razón asignatura_codigo quedara desactualizado (el
    // caso que este fix ya no permite, pero se verifica como red de seguridad),
    // un Programa distinto excluye a la asignatura original del catálogo filtrado
    // y la reconciliación cae al nombre correcto en vez de revertir.
    const cambioTotalConCodigoViejo = { ...cambioTotal, asignatura_codigo: 'ASIG-10' };
    expect(reconcileLegacyAssignment(cambioTotalConCodigoViejo, catalog)).toMatchObject({
      asignatura_id: '20',
      asignatura_nombre: 'Seminario',
    });
  });

  it('integra una carga específica de programa sin perder el catálogo global', () => {
    const merged = mergeAssignmentCatalog(
      [catalog[0]],
      [{ id: '11', nombre: 'Economía Pública', pensum: 'AP_36' }],
      '1',
    );

    expect(merged.map(item => item.id)).toEqual(['10', '11']);
    expect(merged[1].programaId).toBe('1');
  });

  it('representa de forma segura una asignatura sin Pensum institucional', () => {
    expect(inferLegacyPensum({ asignatura_id: '20', programa_id: '2' }, catalog)).toBe(SIN_PENSUM_KEY);
  });

  it('habilita las asignaturas legacy mientras recupera Pensum', () => {
    expect(filterAssignmentsByPensum(catalog, '1', '')).toHaveLength(2);
    expect(filterAssignmentsByPensum(catalog, '1', 'AP_35').map(item => item.id)).toEqual(['10']);
  });

  it('lista los Pensum únicos del programa', () => {
    expect(listPensumsForProgram(catalog, '1').map(item => item.value)).toEqual(['AP_35', 'AP_36']);
  });

  it('formatea Pensum para reportes sin exponer marcadores internos', () => {
    expect(formatPtaPensum('APT_52')).toBe('APT_52');
    expect(formatPtaPensum(SIN_PENSUM_KEY)).toBe('Sin pensum registrado');
    expect(formatPtaPensum(null)).toBe('—');
  });

  it.each([
    ['Análisis Financiero Público (AP_día)', 'Análisis Financiero Público'],
    ['Contabilidad Gubernamental (AP_noche)', 'Contabilidad Gubernamental'],
    ['Derecho Administrativo (AP-DIA)', 'Derecho Administrativo'],
  ])('oculta la jornada técnica en el nombre %s', (original, esperado) => {
    expect(formatPtaAssignmentName(original)).toBe(esperado);
  });

  it('usa nombre_base antes del nombre técnico y conserva otros paréntesis', () => {
    expect(formatPtaAssignmentName({
      nombre: 'Matemáticas I (AP_día)',
      nombreBase: 'Matemáticas I',
    })).toBe('Matemáticas I');
    expect(formatPtaAssignmentName({
      nombre: 'Matemáticas I (AP_día)',
      nombreBase: '   ',
    })).toBe('Matemáticas I');
    expect(formatPtaAssignmentName({
      nombreBase: 'Contabilidad\r\nGubernamental',
    })).toBe('Contabilidad Gubernamental');
    expect(formatPtaAssignmentName('Gestión Pública (Electiva)'))
      .toBe('Gestión Pública (Electiva)');
  });
});
