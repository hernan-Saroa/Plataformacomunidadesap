import { getDedicacionLabel } from './banco-docentes.service';

describe('getDedicacionLabel: texto de dedicación que ve el docente (HU 1365)', () => {
  it.each([
    ['HC', 'HC', 'Hora Cátedra'], // fila editada en QA: guardó el código crudo como etiqueta
    ['HC', 'Tiempo Completo', 'Hora Cátedra'], // etiqueta anterior que ya no corresponde al código
    ['TC', 'TC', 'Tiempo Completo'],
    ['MT', 'mt', 'Medio Tiempo'],
    ['HC', 'Hora Cátedra', 'Hora Cátedra'],
    ['MT', 'Medio Tiempo', 'Medio Tiempo'],
  ])('código %p con etiqueta %p devuelve %p', (code, label, expected) => {
    expect(getDedicacionLabel(code, label)).toBe(expected);
  });

  it('conserva una etiqueta coherente enviada por la carga masiva', () => {
    expect(getDedicacionLabel('TC', 'Tiempo completo')).toBe('Tiempo completo');
  });

  it.each([
    ['TC', null, 'Tiempo Completo'],
    ['MT', undefined, 'Medio Tiempo'],
    ['HC', '', 'Hora Cátedra'],
    ['HC', '   ', 'Hora Cátedra'],
  ])('sin etiqueta, código %p devuelve el texto oficial %p', (code, label, expected) => {
    expect(getDedicacionLabel(code, label as any)).toBe(expected);
  });

  it('sin código ni etiqueta mantiene el comportamiento previo (Tiempo Completo)', () => {
    expect(getDedicacionLabel(null, null)).toBe('Tiempo Completo');
    expect(getDedicacionLabel(undefined, undefined)).toBe('Tiempo Completo');
  });

  it('un código desconocido conserva la etiqueta o el propio código', () => {
    expect(getDedicacionLabel('XX', 'Especial')).toBe('Especial');
    expect(getDedicacionLabel('XX', null)).toBe('XX');
  });

  it('nunca devuelve texto con caracteres dañados', () => {
    for (const code of ['TC', 'MT', 'HC']) {
      const label = String(getDedicacionLabel(code, null));
      expect(label).not.toMatch(/[ÃÂ]/);
    }
    expect(getDedicacionLabel('HC', null)).toBe('Hora Cátedra');
  });
});
