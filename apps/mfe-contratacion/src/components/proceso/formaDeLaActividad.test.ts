import { describe, expect, it } from 'vitest';

import { cuentaEnElAvance, formaDe, tramosDe } from './formaDeLaActividad';

const act = (numeral: string) => ({ numeral });

/**
 * No todas las actividades son un paso de la fila. El riel las pintaba en
 * línea y decía cosas falsas: que la 8.3 esperaba a la 8.2, o que la 9.4 se
 * acababa con la primera cuenta de cobro.
 */
describe('tramosDe', () => {
  it('agrupa las de la etapa 8 que solo piden el contrato firmado', () => {
    const { tramos } = tramosDe(['8.1', '8.2', '8.3', '8.4', '8.5', '8.6'].map(act));

    expect(tramos.map((t) => t.tipo)).toEqual(['paso', 'en_paralelo', 'paso']);
    const grupo = tramos[1];
    expect(grupo.tipo === 'en_paralelo' && grupo.actividades.map((a) => a.numeral)).toEqual([
      '8.2',
      '8.3',
      '8.4',
      '8.5',
    ]);
  });

  it('la publicación (8.8) va en el grupo aunque la matriz la numere al final', () => {
    const { tramos } = tramosDe(['8.1', '8.2', '8.5', '8.6', '8.7', '8.8'].map(act));

    expect(
      tramos.map((t) => (t.tipo === 'paso' ? t.actividad.numeral : t.actividades.map((a) => a.numeral))),
    ).toEqual(['8.1', ['8.2', '8.5', '8.8'], '8.6', '8.7']);
  });

  it('saca de la fila las permanentes y las eventuales', () => {
    const { tramos, permanentes, eventuales } = tramosDe(
      ['9.1', '9.2', '9.3', '9.4', '9.5'].map(act),
    );

    expect(tramos.map((t) => (t.tipo === 'paso' ? t.actividad.numeral : 'grupo'))).toEqual(['9.1']);
    expect(permanentes.map((a) => a.numeral)).toEqual(['9.2', '9.4']);
    expect(eventuales.map((a) => a.numeral)).toEqual(['9.3', '9.5']);
  });

  it('un grupo que la modalidad dejó en una sola actividad es un paso', () => {
    // Sin MiPymes ni observaciones, la web de la ESAP queda sola tras SECOP.
    const { tramos } = tramosDe(['5.3', '5.4', '5.7'].map(act));

    expect(tramos.every((t) => t.tipo === 'paso')).toBe(true);
  });
});

describe('cuentaEnElAvance', () => {
  it('los pasos y los grupos cuentan; las permanentes y eventuales no', () => {
    expect(cuentaEnElAvance('8.1')).toBe(true);
    expect(cuentaEnElAvance('8.3')).toBe(true);
    expect(cuentaEnElAvance('9.4')).toBe(false);
    expect(cuentaEnElAvance('5.13')).toBe(false);
  });

  it('lo que no está declarado es un paso', () => {
    expect(formaDe('3.1')).toEqual({ tipo: 'paso' });
  });
});
