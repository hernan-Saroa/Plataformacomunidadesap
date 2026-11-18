import { describe, expect, it } from 'vitest';
import {
  cicloDeDocente, parsePuntaje, recategorizacionAbierta, validarDecisionIncorporacionForm,
  validarDecisionRecategorizacionForm, validarRecategorizacionForm, type Recategorizacion,
} from './rundCicloDocente';

const HOY = '2026-11-17';

describe('cicloDeDocente (HU 2349)', () => {
  it('usa la etapa que calcula el servidor', () => {
    const ciclo = cicloDeDocente({ ciclo: { etapa: 'ACTIVO', etapaEtiqueta: 'Apto para incorporación / Activo', puedeRegistrarComite: false, decision: { resultado: 'FAVORABLE' } } });
    expect(ciclo).toMatchObject({ etapa: 'ACTIVO', etapaEtiqueta: 'Apto para incorporación / Activo', puedeRegistrarComite: false });
  });
  it('sin `ciclo` (respuesta antigua) la deduce del estado y de la aprobación', () => {
    expect(cicloDeDocente({ estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND' })).toMatchObject({ etapa: 'VALIDADO_CUMPLE', puedeRegistrarComite: true });
    expect(cicloDeDocente({ estado: 'ACTIVO', estadoAprobacion: 'DEVUELTO' })).toMatchObject({ etapa: 'VALIDADO_NO_CUMPLE', puedeRegistrarComite: false });
    expect(cicloDeDocente({ estado: 'ACTIVO', estadoAprobacion: 'PENDIENTE_APROBACION' })).toMatchObject({ etapa: 'CARGADO', etapaEtiqueta: 'Cargado / Elegible' });
    expect(cicloDeDocente({ estado: 'INACTIVO', estadoAprobacion: 'ACTIVO_RUND' })).toMatchObject({ etapa: 'INACTIVO', puedeRegistrarComite: false });
    expect(cicloDeDocente({ activo: false })).toMatchObject({ etapa: 'INACTIVO' });
    expect(cicloDeDocente(null)).toMatchObject({ etapa: 'CARGADO' });
  });
  it('ignora una etapa desconocida del servidor y no se rompe', () => {
    expect(cicloDeDocente({ ciclo: { etapa: 'RARA' }, estado: 'ACTIVO' })).toMatchObject({ etapa: 'CARGADO' });
  });
});

describe('validarDecisionIncorporacionForm (CA-01: soporte obligatorio)', () => {
  const ok = { resultado: 'FAVORABLE', fechaComite: '2026-11-10', motivo: '', tieneSoporte: true };
  it('formulario completo: sin errores', () => { expect(validarDecisionIncorporacionForm(ok, HOY)).toEqual({}); });
  it('sin soporte: error de soporte', () => {
    expect(validarDecisionIncorporacionForm({ ...ok, tieneSoporte: false }, HOY)).toEqual({ soporte: 'Adjunte el soporte de la decisión del comité.' });
  });
  it('vacío: nombra resultado, fecha y soporte', () => {
    expect(Object.keys(validarDecisionIncorporacionForm({ resultado: '', fechaComite: '', motivo: '', tieneSoporte: false }, HOY))).toEqual(['resultado', 'fechaComite', 'soporte']);
  });
  it('no favorable exige motivo (espacios no cuentan)', () => {
    expect(validarDecisionIncorporacionForm({ ...ok, resultado: 'NO_FAVORABLE', motivo: '   ' }, HOY).motivo).toContain('obligatorio');
    expect(validarDecisionIncorporacionForm({ ...ok, resultado: 'NO_FAVORABLE', motivo: 'x' }, HOY)).toEqual({});
  });
  it('la fecha de hoy vale; mañana no', () => {
    expect(validarDecisionIncorporacionForm({ ...ok, fechaComite: HOY }, HOY)).toEqual({});
    expect(validarDecisionIncorporacionForm({ ...ok, fechaComite: '2026-11-18' }, HOY).fechaComite).toContain('posterior a hoy');
  });
});

describe('validarRecategorizacionForm (CA-03)', () => {
  const ok = { justificacion: 'Nuevo título de maestría', escalafon: 'Asociado', puntajeSalarial: '', cantidadSoportes: 1 };
  it('completo: sin errores', () => { expect(validarRecategorizacionForm(ok)).toEqual({}); });
  it('exige justificación (mín. 10), categoría y soportes', () => {
    expect(Object.keys(validarRecategorizacionForm({ justificacion: 'corta', escalafon: ' ', puntajeSalarial: '', cantidadSoportes: 0 }))).toEqual(['justificacion', 'escalafon', 'soportes']);
  });
  it('límite de soportes: 10 vale, 11 no', () => {
    expect(validarRecategorizacionForm({ ...ok, cantidadSoportes: 10 })).toEqual({});
    expect(validarRecategorizacionForm({ ...ok, cantidadSoportes: 11 }).soportes).toContain('Máximo 10');
  });
  it('puntaje opcional: acepta coma y rechaza texto o negativos', () => {
    expect(validarRecategorizacionForm({ ...ok, puntajeSalarial: '250,5' })).toEqual({});
    expect(validarRecategorizacionForm({ ...ok, puntajeSalarial: 'abc' }).puntajeSalarial).toBeTruthy();
    expect(validarRecategorizacionForm({ ...ok, puntajeSalarial: '-1' }).puntajeSalarial).toBeTruthy();
    expect(validarRecategorizacionForm({ ...ok, puntajeSalarial: '100001' }).puntajeSalarial).toBeTruthy();
  });
  it('parsePuntaje', () => {
    expect(parsePuntaje('')).toBeNull();
    expect(parsePuntaje(' 250,5 ')).toBe(250.5);
    expect(parsePuntaje('abc')).toBeNull();
  });
});

describe('recategorizacionAbierta y decisión del comité', () => {
  const item = (estado: Recategorizacion['estado'], id = estado) => ({ id, estado } as Recategorizacion);
  it('detecta la solicitud en revisión o en comité', () => {
    expect(recategorizacionAbierta([item('APROBADA'), item('EN_COMITE')])?.estado).toBe('EN_COMITE');
    expect(recategorizacionAbierta([item('APROBADA'), item('RECHAZADA')])).toBeNull();
    expect(recategorizacionAbierta(null)).toBeNull();
    expect(recategorizacionAbierta([])).toBeNull();
  });
  it('rechazar exige motivo; aprobar no', () => {
    const base = { resultado: 'APROBADA', fechaComite: '2026-11-10', motivo: '', tieneSoporte: true };
    expect(validarDecisionRecategorizacionForm(base, HOY)).toEqual({});
    expect(validarDecisionRecategorizacionForm({ ...base, resultado: 'RECHAZADA' }, HOY).motivo).toContain('obligatorio');
    expect(Object.keys(validarDecisionRecategorizacionForm({ resultado: '', fechaComite: '', motivo: '', tieneSoporte: false }, HOY))).toEqual(['resultado', 'fechaComite', 'soporte']);
  });
});
