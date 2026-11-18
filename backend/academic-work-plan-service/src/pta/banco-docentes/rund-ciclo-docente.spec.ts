import { BadRequestException } from '@nestjs/common';
import {
  cicloDocenteInfo, decisionIncorporacionPermitida, etapaCicloDocente, recategorizacionPermitida,
  validarDecisionIncorporacion, validarDecisionRecategorizacion, validarRecategorizacion, validarRevisionRecategorizacion,
} from './rund-ciclo-docente';

const HOY = '2026-11-17';
const errorDe = (fn: () => unknown): any => { try { fn(); } catch (e) { return e; } throw new Error('no lanzó'); };
const favorable = { resultado: 'FAVORABLE', fechaComite: '2026-11-10', resultadoEtiqueta: 'x', soporteId: 's' };

describe('HU 2349 · etapaCicloDocente', () => {
  it('recién cargado o con revisión pendiente: Cargado / Elegible', () => {
    expect(etapaCicloDocente({ estado: 'ACTIVO', estadoAprobacion: 'PENDIENTE_APROBACION' })).toBe('CARGADO');
    expect(etapaCicloDocente({ estado: 'ACTIVO' })).toBe('CARGADO');
  });
  it('revisión documental aprobada sin comité: Validado – Cumple', () => {
    expect(etapaCicloDocente({ estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND' })).toBe('VALIDADO_CUMPLE');
  });
  it('revisión devuelta: Validado – No cumple', () => {
    expect(etapaCicloDocente({ estado: 'ACTIVO', estadoAprobacion: 'DEVUELTO' })).toBe('VALIDADO_NO_CUMPLE');
  });
  it('decisión favorable del comité: Apto para incorporación / Activo', () => {
    expect(etapaCicloDocente({ estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND', decision: favorable })).toBe('ACTIVO');
  });
  it('una decisión no favorable no lo activa', () => {
    expect(etapaCicloDocente({ estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND', decision: { ...favorable, resultado: 'NO_FAVORABLE' } })).toBe('VALIDADO_CUMPLE');
  });
  it('un docente inactivo se muestra Inactivo aunque tenga decisión favorable (CA-02)', () => {
    expect(etapaCicloDocente({ estado: 'INACTIVO', estadoAprobacion: 'ACTIVO_RUND', decision: favorable })).toBe('INACTIVO');
    expect(etapaCicloDocente({ estado: 'inactivo' })).toBe('INACTIVO');
  });
  it('solo Validado – Cumple puede pasar al comité', () => {
    expect(cicloDocenteInfo({ estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND' }).puedeRegistrarComite).toBe(true);
    for (const aprobacion of ['PENDIENTE_APROBACION', 'DEVUELTO']) {
      expect(cicloDocenteInfo({ estado: 'ACTIVO', estadoAprobacion: aprobacion }).puedeRegistrarComite).toBe(false);
    }
    expect(cicloDocenteInfo({ estado: 'ACTIVO', estadoAprobacion: 'ACTIVO_RUND', decision: favorable }).puedeRegistrarComite).toBe(false);
    expect(cicloDocenteInfo({ estado: 'INACTIVO', estadoAprobacion: 'ACTIVO_RUND' }).puedeRegistrarComite).toBe(false);
  });
});

describe('HU 2349 · decisionIncorporacionPermitida', () => {
  it('bloquea inactivo y no validado, con el mensaje de qué hacer', () => {
    expect(decisionIncorporacionPermitida({ etapa: 'INACTIVO' })).toContain('reactívelo');
    expect(decisionIncorporacionPermitida({ etapa: 'CARGADO' })).toContain('Validado – Cumple');
    expect(decisionIncorporacionPermitida({ etapa: 'VALIDADO_NO_CUMPLE' })).toContain('Validado – Cumple');
    expect(decisionIncorporacionPermitida({ etapa: 'VALIDADO_CUMPLE' })).toBeNull();
  });
});

describe('HU 2349 · validarDecisionIncorporacion (CA-01: soporte obligatorio)', () => {
  const valida = { resultado: 'FAVORABLE', fechaComite: '2026-11-10', soporteId: 'sop-1' };
  it('acepta la decisión favorable con soporte', () => {
    expect(validarDecisionIncorporacion(valida, HOY)).toEqual({ resultado: 'FAVORABLE', fechaComite: '2026-11-10', motivo: null, observacion: null, soporteId: 'sop-1' });
  });
  it('sin soporte no se guarda y se nombra el campo', () => {
    const e = errorDe(() => validarDecisionIncorporacion({ ...valida, soporteId: '  ' }, HOY));
    expect(e).toBeInstanceOf(BadRequestException);
    expect(e.getResponse().camposFaltantes).toEqual(['soporte de la decisión del comité']);
  });
  it('lista todos los campos faltantes', () => {
    expect(errorDe(() => validarDecisionIncorporacion({}, HOY)).getResponse().camposFaltantes)
      .toEqual(['resultado de la decisión', 'fecha del comité', 'soporte de la decisión del comité']);
  });
  it('la decisión no favorable exige motivo', () => {
    expect(errorDe(() => validarDecisionIncorporacion({ ...valida, resultado: 'no_favorable' }, HOY)).getResponse().camposFaltantes).toEqual(['motivo']);
    expect(validarDecisionIncorporacion({ ...valida, resultado: 'no_favorable', motivo: ' Falta experiencia ' }, HOY).motivo).toBe('Falta experiencia');
  });
  it('valida la fecha: formato, calendario y futuro; hoy es válido', () => {
    expect(errorDe(() => validarDecisionIncorporacion({ ...valida, fechaComite: '10/11/2026' }, HOY)).getResponse().message).toContain('no es válida');
    expect(errorDe(() => validarDecisionIncorporacion({ ...valida, fechaComite: '2026-02-30' }, HOY)).getResponse().message).toContain('no es válida');
    expect(errorDe(() => validarDecisionIncorporacion({ ...valida, fechaComite: '2026-11-18' }, HOY)).getResponse().message).toContain('posterior a hoy');
    expect(validarDecisionIncorporacion({ ...valida, fechaComite: HOY }, HOY).fechaComite).toBe(HOY);
  });
  it('limita motivo y observación a 1000 caracteres', () => {
    expect(() => validarDecisionIncorporacion({ ...valida, observacion: 'x'.repeat(1001) }, HOY)).toThrow(BadRequestException);
    expect(validarDecisionIncorporacion({ ...valida, observacion: 'x'.repeat(1000) }, HOY).observacion).toHaveLength(1000);
  });
});

describe('HU 2349 · recategorización (CA-03)', () => {
  const valida = { justificacion: 'Nuevo título de maestría', propuesta: { escalafon: 'Asociado', puntajeSalarial: '250,5' }, soporteIds: ['a', 'b', 'a'] };
  it('normaliza la solicitud: quita soportes repetidos y lee el puntaje con coma', () => {
    expect(validarRecategorizacion(valida)).toEqual({ justificacion: 'Nuevo título de maestría', propuesta: { escalafon: 'Asociado', puntajeSalarial: 250.5 }, soporteIds: ['a', 'b'] });
  });
  it('el puntaje es opcional', () => {
    expect(validarRecategorizacion({ ...valida, propuesta: { escalafon: 'Titular' } }).propuesta).toEqual({ escalafon: 'Titular', puntajeSalarial: null });
  });
  it('exige justificación, categoría y soportes nuevos', () => {
    expect(errorDe(() => validarRecategorizacion({})).getResponse().camposFaltantes)
      .toEqual(['justificación', 'categoría o escalafón propuesto', 'al menos un soporte nuevo']);
  });
  it('rechaza justificación corta o larga, puntaje inválido y demasiados soportes', () => {
    expect(() => validarRecategorizacion({ ...valida, justificacion: 'corta' })).toThrow('mínimo 10');
    expect(() => validarRecategorizacion({ ...valida, justificacion: 'x'.repeat(1001) })).toThrow('máximo 1000');
    expect(() => validarRecategorizacion({ ...valida, propuesta: { escalafon: 'A', puntajeSalarial: 'abc' } })).toThrow('puntaje');
    expect(() => validarRecategorizacion({ ...valida, propuesta: { escalafon: 'A', puntajeSalarial: -1 } })).toThrow('puntaje');
    expect(() => validarRecategorizacion({ ...valida, soporteIds: Array.from({ length: 11 }, (_, i) => `s${i}`) })).toThrow('máximo 10');
  });
  it('la revisión exige motivo cuando no cumple', () => {
    expect(validarRevisionRecategorizacion({ resultado: 'cumple' })).toEqual({ resultado: 'CUMPLE', observacion: null });
    expect(() => validarRevisionRecategorizacion({ resultado: 'NO_CUMPLE' })).toThrow('motivo');
    expect(() => validarRevisionRecategorizacion({})).toThrow('cumple o no cumple');
  });
  it('la decisión del comité exige fecha, soporte y, si se rechaza, motivo', () => {
    const base = { resultado: 'APROBADA', fechaComite: '2026-11-10', soporteId: 's' };
    expect(validarDecisionRecategorizacion(base, HOY).resultado).toBe('APROBADA');
    expect(errorDe(() => validarDecisionRecategorizacion({ resultado: 'RECHAZADA' }, HOY)).getResponse().camposFaltantes)
      .toEqual(['fecha del comité', 'soporte de la decisión del comité', 'motivo']);
    expect(() => validarDecisionRecategorizacion({ ...base, fechaComite: '2026-12-01' }, HOY)).toThrow('posterior a hoy');
  });
  it('solo un docente activo y sin otra solicitud abierta puede recategorizarse', () => {
    expect(recategorizacionPermitida({ estado: 'ACTIVO', abierta: false })).toBeNull();
    expect(recategorizacionPermitida({ estado: 'INACTIVO', abierta: false })).toContain('activo');
    expect(recategorizacionPermitida({ estado: 'ACTIVO', abierta: true })).toContain('en curso');
  });
});
