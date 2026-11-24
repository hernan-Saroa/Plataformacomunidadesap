import { BadRequestException } from '@nestjs/common';

import { validarPredeterminado } from './cronograma-predeterminado';

/** Cronograma predeterminado por modalidad: qué etapas y actividades salen (140 → 144, EFDS-1152). */
describe('cronograma predeterminado', () => {
  const catalogo = new Map([
    ['5.6', { etapa: 5 }],
    ['6.1', { etapa: 6 }],
  ]);
  const dato = (cambios: Record<string, unknown> = {}) => ({
    etapas: [5, 6],
    numerales: ['5.6', '6.1'],
    propias: [{ nombre: 'Visita técnica', etapa: 6 }],
    ...cambios,
  });

  it('acepta etapas, actividades del flujo y propias', () => {
    expect(() => validarPredeterminado(dato(), catalogo)).not.toThrow();
  });

  it('acepta un predeterminado vacío', () => {
    expect(() => validarPredeterminado({ etapas: [], numerales: [], propias: [] }, catalogo)).not.toThrow();
  });

  it('no deja una actividad que la modalidad no recorre', () => {
    expect(() => validarPredeterminado(dato({ numerales: ['7.1.1'] }), catalogo)).toThrow(BadRequestException);
  });

  it('no deja una actividad de una etapa que no sale', () => {
    expect(() => validarPredeterminado(dato({ etapas: [5], propias: [] }), catalogo)).toThrow(/etapa 6/);
    expect(() => validarPredeterminado(dato({ etapas: [5], numerales: ['5.6'] }), catalogo)).toThrow(/etapa 6/);
  });

  it('no deja etapas fuera de la 5 a la 10', () => {
    expect(() => validarPredeterminado(dato({ etapas: [4, 5, 6] }), catalogo)).toThrow(/de la 5 a la 10/);
  });

  it('no repite una etapa, una actividad ni una propia con el mismo nombre en la etapa', () => {
    expect(() => validarPredeterminado(dato({ etapas: [5, 5, 6] }), catalogo)).toThrow(/dos veces/);
    expect(() => validarPredeterminado(dato({ numerales: ['6.1', '6.1'] }), catalogo)).toThrow(/dos veces/);
    expect(() =>
      validarPredeterminado(
        dato({ propias: [{ nombre: 'Visita', etapa: 6 }, { nombre: 'visita', etapa: 6 }] }),
        catalogo,
      ),
    ).toThrow(/dos veces/);
  });

  it('pide nombre a la propia', () => {
    expect(() => validarPredeterminado(dato({ propias: [{ nombre: '  ', etapa: 6 }] }), catalogo)).toThrow(/nombre/);
  });
});
