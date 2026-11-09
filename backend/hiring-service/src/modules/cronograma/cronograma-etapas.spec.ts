import { BadRequestException } from '@nestjs/common';

import { estadoDeLaEtapa } from './cronograma-etapas';
import { validarEtapas } from './cronograma.service';

/**
 * Cronograma por etapas macro de la 5.2 (135): opcional y con alertas de
 * vencimiento.
 */
describe('estadoDeLaEtapa', () => {
  const hoy = '2026-10-29';

  it('sin fecha de fin no hay qué vigilar', () => {
    expect(estadoDeLaEtapa(null, false, hoy, 5)).toEqual({ estado: 'SIN_FECHA', diasRestantes: null });
  });

  it('dentro de la anticipación está por vencer', () => {
    expect(estadoDeLaEtapa('2026-11-02', false, hoy, 5)).toEqual({
      estado: 'POR_VENCER',
      diasRestantes: 4,
    });
  });

  it('lejos de su fin está vigente', () => {
    expect(estadoDeLaEtapa('2026-12-15', false, hoy, 5).estado).toBe('VIGENTE');
  });

  it('pasada la fecha sin cumplirse, vencida', () => {
    expect(estadoDeLaEtapa('2026-10-20', false, hoy, 5)).toEqual({
      estado: 'VENCIDO',
      diasRestantes: -9,
    });
  });

  it('cumplida no alerta aunque se haya pasado de la fecha', () => {
    expect(estadoDeLaEtapa('2026-10-20', true, hoy, 5).estado).toBe('CUMPLIDA');
  });
});

describe('validarEtapas', () => {
  it('admite etapas sin fechas: el cronograma no es obligatorio', () => {
    expect(() => validarEtapas([{ etapa: 5 }, { etapa: 6, fechaFin: '2026-11-30' }])).not.toThrow();
  });

  it('un inicio sin fin no se puede vigilar', () => {
    expect(() => validarEtapas([{ etapa: 6, fechaInicio: '2026-11-01' }])).toThrow(
      BadRequestException,
    );
  });

  it('el inicio no puede ir después del fin', () => {
    expect(() =>
      validarEtapas([{ etapa: 7, fechaInicio: '2026-12-10', fechaFin: '2026-12-01' }]),
    ).toThrow(BadRequestException);
  });

  it('una etapa no viene dos veces', () => {
    expect(() =>
      validarEtapas([
        { etapa: 8, fechaFin: '2027-01-10' },
        { etapa: 8, fechaFin: '2027-01-20' },
      ]),
    ).toThrow(BadRequestException);
  });
});
