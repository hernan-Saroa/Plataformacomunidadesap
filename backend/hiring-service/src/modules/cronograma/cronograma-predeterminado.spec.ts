import { BadRequestException } from '@nestjs/common';

import { fechaDelDia, fechasDelPredeterminado, validarPredeterminado } from './cronograma-predeterminado';

/** Cronograma predeterminado por modalidad (140, EFDS-1152). */
describe('cronograma predeterminado', () => {
  // 2026-12-07 es lunes; el 8 de diciembre es festivo en Colombia.
  const festivos = new Set(['2026-12-08']);

  describe('fecha de cada día desde el día cero', () => {
    it('el día 0 es el propio día cero', () => {
      expect(fechaDelDia('2026-12-07', 0, 'HABILES', festivos)).toBe('2026-12-07');
    });

    it('en hábiles salta el festivo y el fin de semana, sin contar el día cero', () => {
      // 1 → miércoles 9 (el martes 8 es festivo); 4 → lunes 14.
      expect(fechaDelDia('2026-12-07', 1, 'HABILES', festivos)).toBe('2026-12-09');
      expect(fechaDelDia('2026-12-07', 4, 'HABILES', festivos)).toBe('2026-12-14');
    });

    it('en calendario cuenta todos los días', () => {
      expect(fechaDelDia('2026-12-07', 4, 'CALENDARIO', festivos)).toBe('2026-12-11');
      expect(fechaDelDia('2026-12-28', 5, 'CALENDARIO', festivos)).toBe('2027-01-02');
    });

    it('propone inicio y fin de cada fila; sin día de inicio, solo el fin', () => {
      const [con, sin] = fechasDelPredeterminado(
        [
          { numeral: '5.6', diaInicio: 1, diaFin: 4, tipoDias: 'HABILES' },
          { numeral: '6.1', diaFin: 10, tipoDias: 'CALENDARIO' },
        ],
        '2026-12-07',
        festivos,
      );
      expect(con).toMatchObject({ fechaInicio: '2026-12-09', fechaFin: '2026-12-14' });
      expect(sin).toMatchObject({ fechaInicio: null, fechaFin: '2026-12-17' });
    });
  });

  describe('validación', () => {
    const validos = new Set(['5.6', '6.1']);
    const fila = (cambios: Record<string, unknown> = {}) => ({
      numeral: '6.1',
      diaFin: 20,
      avisarA: ['QUIEN_LA_HACE'],
      ...cambios,
    });

    it('acepta actividades del flujo y propias', () => {
      expect(() =>
        validarPredeterminado([fila(), { nombre: 'Visita técnica', etapa: 6, diaFin: 15, avisarA: ['ABOGADO_REVISOR'] }], validos),
      ).not.toThrow();
    });

    it('no deja una actividad que la modalidad no recorre', () => {
      expect(() => validarPredeterminado([fila({ numeral: '7.1.1' })], validos)).toThrow(BadRequestException);
    });

    it('no deja empezar después de terminar', () => {
      expect(() => validarPredeterminado([fila({ diaInicio: 21 })], validos)).toThrow(/no puede ser posterior al de fin/);
    });

    it('no repite una actividad ni una propia con el mismo nombre en la etapa', () => {
      expect(() => validarPredeterminado([fila(), fila()], validos)).toThrow(/dos veces/);
      const propia = { nombre: 'Visita', etapa: 6, diaFin: 3, avisarA: ['QUIEN_LA_HACE'] };
      expect(() => validarPredeterminado([propia, { ...propia, nombre: 'visita' }], validos)).toThrow(/dos veces/);
    });

    it('pide a quién avisar', () => {
      expect(() => validarPredeterminado([fila({ avisarA: [] })], validos)).toThrow(/a quién/);
    });
  });
});
