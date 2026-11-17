import { describe, expect, it } from 'vitest';
import { diasRestantesTexto, formatFechaPrueba, hoyColombiaISO, validarDecisionComiteForm } from './rundPeriodoPrueba';

const HOY = '2026-11-15';
const valido = { resultado: 'SUPERA', fechaComite: '2026-11-10', motivo: '', tieneSoporte: true };

describe('rundPeriodoPrueba', () => {
  it('formatea fechas sin mover el día', () => {
    expect(formatFechaPrueba('2026-11-15')).toBe('15/11/2026');
    expect(formatFechaPrueba('2026-01-01T00:00:00.000Z')).toBe('01/01/2026');
    expect(formatFechaPrueba(null)).toBe('—');
    expect(formatFechaPrueba('x')).toBe('—');
  });

  it('describe los días restantes', () => {
    expect(diasRestantesTexto(10)).toBe('Faltan 10 días');
    expect(diasRestantesTexto(1)).toBe('Faltan 1 día');
    expect(diasRestantesTexto(0)).toBe('Se cumple hoy');
    expect(diasRestantesTexto(-1)).toBe('Vencido hace 1 día');
    expect(diasRestantesTexto(-30)).toBe('Vencido hace 30 días');
    expect(diasRestantesTexto(null)).toBe('Sin fecha de inicio');
  });

  it('hoy en Colombia no depende de la zona del navegador', () => {
    expect(hoyColombiaISO(new Date('2026-11-16T03:00:00Z'))).toBe('2026-11-15');
  });

  it('acepta «Supera» completo sin motivo', () => {
    expect(validarDecisionComiteForm(valido, HOY)).toEqual({});
  });

  it('CA-06: sin fecha y sin soporte marca ambos campos', () => {
    const e = validarDecisionComiteForm({ ...valido, fechaComite: '', tieneSoporte: false }, HOY);
    expect(Object.keys(e).sort()).toEqual(['fechaComite', 'soporte']);
  });

  it('CA-07: «No supera» sin motivo exige el motivo; con motivo pasa', () => {
    expect(validarDecisionComiteForm({ ...valido, resultado: 'NO_SUPERA' }, HOY).motivo).toContain('motivo es obligatorio');
    expect(validarDecisionComiteForm({ ...valido, resultado: 'NO_SUPERA', motivo: '   ' }, HOY).motivo).toBeDefined();
    expect(validarDecisionComiteForm({ ...valido, resultado: 'NO_SUPERA', motivo: 'Sin segunda lengua' }, HOY)).toEqual({});
  });

  it('exige resultado y rechaza fecha futura; hoy es válido', () => {
    expect(validarDecisionComiteForm({ ...valido, resultado: '' }, HOY).resultado).toBeDefined();
    expect(validarDecisionComiteForm({ ...valido, fechaComite: '2026-11-16' }, HOY).fechaComite).toContain('posterior a hoy');
    expect(validarDecisionComiteForm({ ...valido, fechaComite: HOY }, HOY)).toEqual({});
  });
});
