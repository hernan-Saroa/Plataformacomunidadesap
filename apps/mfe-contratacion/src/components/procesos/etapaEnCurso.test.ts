import { describe, it, expect } from 'vitest';

import { etapaEnCurso } from './etapaEnCurso';

describe('etapaEnCurso', () => {
  it('pasa de la 5 cuando hay trabajo en etapas posteriores', () => {
    // El caso que se veía mal: abierto (etapa 5) y ya con la 9 aprobada.
    expect(
      etapaEnCurso({
        etapa: 5,
        actividades: [
          { numeral: '5.7', estado: 'APROBADO' },
          { numeral: '8.2', estado: 'APROBADO' },
          { numeral: '9.1', estado: 'EN_REVISION' },
          { numeral: '10.1', estado: 'BORRADOR' },
        ],
      }),
    ).toBe(9);
  });

  it('llega a la 10', () => {
    expect(etapaEnCurso({ etapa: 5, actividades: [{ numeral: '10.1', estado: 'APROBADO' }] })).toBe(10);
  });

  it('no cuenta lo que la modalidad excluye ni lo que no se ha tocado', () => {
    expect(
      etapaEnCurso({
        etapa: 3,
        actividades: [
          { numeral: '6.1', estado: 'NO_APLICA' },
          { numeral: '7.1', estado: 'BORRADOR' },
        ],
      }),
    ).toBe(3);
  });

  it('nunca baja de la etapa registrada', () => {
    expect(etapaEnCurso({ etapa: 4, actividades: [{ numeral: '3.1', estado: 'APROBADO' }] })).toBe(4);
    expect(etapaEnCurso({ etapa: 4 })).toBe(4);
  });
});
