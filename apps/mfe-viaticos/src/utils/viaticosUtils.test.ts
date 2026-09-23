import { describe, it, expect } from 'vitest';
import { calcularDiasComision, formatearDiasComision } from './viaticosUtils';

describe('calcularDiasComision', () => {
  it('debe retornar 0.5 si es el mismo día (sin pernocta según formato GF-FO-023)', () => {
    expect(calcularDiasComision('2026-10-01', '2026-10-01')).toBe(0.5);
  });

  it('debe retornar 1.5 si es del 01-10 al 02-10 (1 noche + medio día retorno)', () => {
    expect(calcularDiasComision('2026-10-01', '2026-10-02')).toBe(1.5);
  });

  it('debe retornar 2.5 si es del 01-10 al 03-10 (2 noches + medio día retorno)', () => {
    expect(calcularDiasComision('2026-10-01', '2026-10-03')).toBe(2.5);
  });

  it('debe retornar 0 si faltan fechas o son inválidas', () => {
    expect(calcularDiasComision('', '2026-10-02')).toBe(0);
    expect(calcularDiasComision('invalida', '2026-10-02')).toBe(0);
  });
});

describe('formatearDiasComision', () => {
  it('formatea 1.5 como "1 día y medio"', () => {
    expect(formatearDiasComision(1.5)).toBe('1 día y medio');
  });

  it('formatea 2.5 como "2 días y medio"', () => {
    expect(formatearDiasComision(2.5)).toBe('2 días y medio');
  });

  it('formatea 0.5 como "Medio día"', () => {
    expect(formatearDiasComision(0.5)).toBe('Medio día');
  });

  it('formatea 1 como "1 día"', () => {
    expect(formatearDiasComision(1)).toBe('1 día');
  });

  it('formatea números enteros como "X días"', () => {
    expect(formatearDiasComision(3)).toBe('3 días');
    expect(formatearDiasComision(5)).toBe('5 días');
  });
});
