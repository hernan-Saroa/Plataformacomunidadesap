import { DEDICACION_LABELS, dedicacionCodeOf, resolveDedicacionDisplay } from './rund-dedicacion';

describe('dedicación del perfil RUND (HU 1365: el docente debe ver la dedicación editada)', () => {
  it('usa los textos oficiales con tilde', () => {
    expect(DEDICACION_LABELS).toEqual({ TC: 'Tiempo Completo', MT: 'Medio Tiempo', HC: 'Hora Cátedra' });
  });

  it.each([
    ['TC', 'TC'], ['tc', 'TC'], ['Tiempo Completo', 'TC'], ['tiempo completo', 'TC'],
    ['MT', 'MT'], ['Medio Tiempo', 'MT'],
    ['HC', 'HC'], ['Hora Cátedra', 'HC'], ['hora catedra', 'HC'], ['Cátedra', 'HC'],
  ])('reconoce %p como %p', (value, code) => {
    expect(dedicacionCodeOf(value)).toBe(code);
  });

  it.each([null, undefined, '', '   ', 'Otra', 'XX'])('no reconoce %p', (value) => {
    expect(dedicacionCodeOf(value)).toBeNull();
  });

  it('caso de QA: pasar de Tiempo Completo a HC sin etiqueta no deja el texto anterior', () => {
    expect(resolveDedicacionDisplay('HC', undefined, 'Tiempo Completo')).toBe('Hora Cátedra');
  });

  it('caso de QA: una etiqueta que es solo el código («HC») se reemplaza por el texto oficial', () => {
    expect(resolveDedicacionDisplay('HC', 'HC', 'Tiempo Completo')).toBe('Hora Cátedra');
    expect(resolveDedicacionDisplay('TC', 'TC', null)).toBe('Tiempo Completo');
    expect(resolveDedicacionDisplay('MT', 'mt', null)).toBe('Medio Tiempo');
  });

  it('conserva la etiqueta enviada si corresponde al código', () => {
    expect(resolveDedicacionDisplay('HC', 'Hora Cátedra', 'Tiempo Completo')).toBe('Hora Cátedra');
    expect(resolveDedicacionDisplay('TC', 'Tiempo completo', null)).toBe('Tiempo completo');
  });

  it('descarta una etiqueta enviada que contradice el código', () => {
    expect(resolveDedicacionDisplay('HC', 'Tiempo Completo', 'Tiempo Completo')).toBe('Hora Cátedra');
    expect(resolveDedicacionDisplay('MT', 'Hora Cátedra', null)).toBe('Medio Tiempo');
  });

  it('conserva la etiqueta ya guardada si sigue siendo coherente y no llega otra', () => {
    expect(resolveDedicacionDisplay('TC', undefined, 'Tiempo completo')).toBe('Tiempo completo');
    expect(resolveDedicacionDisplay('MT', null, 'Medio Tiempo')).toBe('Medio Tiempo');
  });

  it('sin etiqueta ni registro previo usa el texto oficial', () => {
    expect(resolveDedicacionDisplay('TC', null, null)).toBe('Tiempo Completo');
    expect(resolveDedicacionDisplay('HC', undefined, undefined)).toBe('Hora Cátedra');
  });

  it('un código desconocido conserva lo que haya sin inventar un texto', () => {
    expect(resolveDedicacionDisplay('XX', 'Especial', null)).toBe('Especial');
    expect(resolveDedicacionDisplay('XX', null, 'Previo')).toBe('Previo');
    expect(resolveDedicacionDisplay(null, null, null)).toBeNull();
  });
});
