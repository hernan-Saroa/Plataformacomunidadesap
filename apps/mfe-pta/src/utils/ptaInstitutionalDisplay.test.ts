import { describe, expect, it } from 'vitest';
import {
  formatPtaDedicacion,
  formatPtaVinculacion,
  ptaDato,
  ptaNumero,
  ptaPorcentaje,
} from './ptaInstitutionalDisplay';

describe('presentación de datos institucionales PTA', () => {
  it.each([
    ['PERIODO_DE_PRUEBA', 'Período de prueba'],
    ['PERIODO_PRUEBA', 'Período de prueba'],
    ['CARRERA_003', 'Carrera profesoral (Acuerdo 003 de 2018)'],
    ['CARRERA2', 'Carrera profesoral (Acuerdo 003 de 2018)'],
    ['CARRERA_009', 'Carrera profesoral (Acuerdo 009 de 2004)'],
    ['CARRERA1', 'Carrera profesoral (Acuerdo 009 de 2004)'],
    ['OCASIONAL', 'Ocasional'],
  ])('traduce el código de vinculación %s', (input, expected) => {
    expect(formatPtaVinculacion(input)).toBe(expected);
  });

  it('conserva una descripción ya legible y no inventa valores ausentes', () => {
    expect(formatPtaVinculacion('Nombramiento provisional')).toBe('Nombramiento provisional');
    expect(formatPtaVinculacion(null)).toBeNull();
    expect(ptaDato(undefined)).toBe('No registrado');
  });

  it.each([
    ['TC', 'Tiempo completo'],
    ['TIEMPO_COMPLETO', 'Tiempo completo'],
    ['MT', 'Medio tiempo'],
    ['HC', 'Hora cátedra'],
  ])('traduce la dedicación %s', (input, expected) => {
    expect(formatPtaDedicacion(input)).toBe(expected);
  });

  it('distingue el cero de un dato numérico ausente y evita NaN en porcentajes', () => {
    expect(ptaNumero(0)).toBe(0);
    expect(ptaNumero(undefined)).toBeNull();
    expect(ptaPorcentaje(10, 0)).toBe('—');
    expect(ptaPorcentaje(undefined, 100)).toBe('—');
  });
});
