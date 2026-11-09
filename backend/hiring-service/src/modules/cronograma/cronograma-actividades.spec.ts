import { BadRequestException } from '@nestjs/common';

import { cambiosDeFechas, validarActividades, validarCambiosDeAdenda } from './cronograma-actividades';

/** El cronograma por actividad (sesión de QA del 04/11, EFDS-1152). */
describe('cronograma por actividad', () => {
  const validos = new Set(['5.6', '6.1', '6.5']);

  it('acepta una actividad con fechas, anticipación, destinatario y canal', () => {
    expect(() =>
      validarActividades(
        [{ numeral: '6.1', fechaFin: '2026-12-01', diasAntes: 3, avisarA: ['ABOGADO_ESTRUCTURADOR'], canal: 'AMBOS' }],
        validos,
      ),
    ).not.toThrow();
  });

  it('no deja programar una actividad que no es del proceso', () => {
    expect(() => validarActividades([{ numeral: '9.9', fechaFin: '2026-12-01', avisarA: ['QUIEN_LA_HACE'] }], validos)).toThrow(
      BadRequestException,
    );
  });

  it('pide a quién avisar cuando hay fecha de fin', () => {
    expect(() => validarActividades([{ numeral: '6.1', fechaFin: '2026-12-01' }], validos)).toThrow(/a quién/);
  });

  it('admite avisar solo a correos escritos a mano', () => {
    expect(() =>
      validarActividades([{ numeral: '6.1', fechaFin: '2026-12-01', correos: ['contratacion@esap.edu.co'] }], validos),
    ).not.toThrow();
  });

  it('no deja una fecha de inicio posterior a la de fin', () => {
    expect(() =>
      validarActividades(
        [{ numeral: '6.1', fechaInicio: '2026-12-02', fechaFin: '2026-12-01', avisarA: ['QUIEN_LA_HACE'] }],
        validos,
      ),
    ).toThrow(/posterior/);
  });

  it('el historial solo recoge las fechas que cambiaron', () => {
    const antes = new Map([
      ['6.1', { fechaInicio: null, fechaFin: '2026-12-01' }],
      ['6.5', { fechaInicio: null, fechaFin: '2026-12-10' }],
    ]);
    const despues = new Map([
      ['6.1', { fechaInicio: null, fechaFin: '2026-12-05' }],
      ['6.5', { fechaInicio: null, fechaFin: '2026-12-10' }],
      ['5.6', { fechaInicio: '2026-11-10', fechaFin: '2026-11-20' }],
    ]);
    expect(cambiosDeFechas(antes, despues).map((c) => c.clave)).toEqual(['5.6', '6.1']);
  });
  describe('actividades propias (139)', () => {
    const propia = (cambios: Record<string, unknown> = {}) => ({
      nombre: 'Visita técnica al sitio de la obra',
      etapa: 6,
      fechaFin: '2026-12-03',
      avisarA: ['QUIEN_LA_HACE'],
      ...cambios,
    });

    it('acepta una propia nueva con nombre, etapa y fecha de fin', () => {
      expect(() => validarActividades([propia()], validos)).not.toThrow();
    });

    it('pide el nombre, la etapa y la fecha de fin', () => {
      expect(() => validarActividades([propia({ nombre: '  ' })], validos)).toThrow(/nombre/);
      expect(() => validarActividades([propia({ etapa: 4 })], validos)).toThrow(/etapa/);
      expect(() => validarActividades([propia({ fechaFin: null })], validos)).toThrow(/fecha de fin/);
    });

    it('no deja editar una propia de otro proceso', () => {
      const id = '0b6f4c1e-8a52-4f0e-9d7b-3c1a2e5f6a70';
      expect(() => validarActividades([propia({ id })], validos, new Set())).toThrow(/no es una actividad de este proceso/);
      expect(() => validarActividades([propia({ id })], validos, new Set([id]))).not.toThrow();
    });

    it('una del flujo no lleva nombre propio', () => {
      expect(() =>
        validarActividades([{ numeral: '6.1', nombre: 'Otro nombre', fechaFin: '2026-12-01', avisarA: ['QUIEN_LA_HACE'] }], validos),
      ).toThrow(/del flujo/);
    });
  });

  describe('fechas que mueve una adenda (139)', () => {
    it('acepta etapas y actividades con su nueva fecha de fin', () => {
      expect(() =>
        validarCambiosDeAdenda(
          [
            { ambito: 'ACTIVIDAD', clave: '6.6', fechaFin: '2026-12-15' },
            { ambito: 'ETAPA', clave: '7', fechaInicio: '2026-12-16', fechaFin: '2026-12-30' },
          ],
          false,
        ),
      ).not.toThrow();
    });

    it('no repite la 6.1 cuando la adenda ya mueve el cierre', () => {
      expect(() => validarCambiosDeAdenda([{ ambito: 'ACTIVIDAD', clave: '6.1', fechaFin: '2026-12-15' }], true)).toThrow(
        /6.1/,
      );
      expect(() =>
        validarCambiosDeAdenda([{ ambito: 'ACTIVIDAD', clave: '6.1', fechaFin: '2026-12-15' }], false),
      ).not.toThrow();
    });

    it('no deja la misma actividad dos veces ni el inicio después del fin', () => {
      expect(() =>
        validarCambiosDeAdenda(
          [
            { ambito: 'ACTIVIDAD', clave: '6.6', fechaFin: '2026-12-15' },
            { ambito: 'ACTIVIDAD', clave: '6.6', fechaFin: '2026-12-16' },
          ],
          false,
        ),
      ).toThrow(/dos veces/);
      expect(() =>
        validarCambiosDeAdenda([{ ambito: 'ETAPA', clave: '7', fechaInicio: '2026-12-31', fechaFin: '2026-12-30' }], false),
      ).toThrow(/posterior/);
    });
  });
});
