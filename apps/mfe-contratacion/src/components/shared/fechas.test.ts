import { describe, expect, it } from 'vitest';

import { plazoEnMeses } from './fechas';
import { valorLegible } from '../revision/LecturaEstudioPrevio';
import { CampoFormulario } from '../../types';

/** El plazo en días, también en meses (AJU-002). */
describe('plazoEnMeses', () => {
  it('da los meses redondeados a medio mes', () => {
    expect(plazoEnMeses(90)).toBe('aproximadamente 3 meses');
    expect(plazoEnMeses(120)).toBe('aproximadamente 4 meses');
    expect(plazoEnMeses(45)).toBe('aproximadamente 1,5 meses');
    expect(plazoEnMeses(30)).toBe('aproximadamente 1 mes');
  });

  it('por debajo de un mes, o sin número, no dice nada', () => {
    expect(plazoEnMeses(15)).toBeNull();
    expect(plazoEnMeses('')).toBeNull();
    expect(plazoEnMeses(undefined)).toBeNull();
  });

  it('la lectura del estudio previo pone los meses junto a los días', () => {
    const campo = { codigo: 'plazo_ejecucion_dias', tipo: 'numero' } as CampoFormulario;
    expect(valorLegible(campo, 120)).toBe('120 días (aproximadamente 4 meses)');
    // Otro número no se toca.
    expect(valorLegible({ ...campo, codigo: 'otro' }, 120)).toBe('120');
  });
});
