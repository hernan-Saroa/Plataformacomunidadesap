import { describe, it, expect } from 'vitest';

import { estadoDeActividad } from './estadoActividad';

/**
 * El color del punto en el riel es lo único que dice, de un vistazo, por dónde
 * va el proceso. Cuando toda actividad aplicable salía en curso, el azul dejaba
 * de significar nada: nueve actividades de las etapas 4 y 5 se encendían desde
 * el momento de crear el proceso.
 */
describe('estadoDeActividad', () => {
  it('deja pendiente la actividad que nadie ha empezado', () => {
    // Sin fila en proceso_actividades el backend responde null. Es el caso que
    // se estaba pintando en azul.
    expect(estadoDeActividad(true, null)).toBe('pendiente');
    expect(estadoDeActividad(true, undefined)).toBe('pendiente');
  });

  it('marca en curso solo lo que ya se tocó', () => {
    expect(estadoDeActividad(true, 'BORRADOR')).toBe('en_curso');
    expect(estadoDeActividad(true, 'EN_REVISION')).toBe('en_curso');
  });

  it('una actividad devuelta sigue en curso: hay que volver a ella', () => {
    expect(estadoDeActividad(true, 'DEVUELTO')).toBe('en_curso');
  });

  it('marca aprobada la que ya se cumplió', () => {
    expect(estadoDeActividad(true, 'APROBADO')).toBe('aprobada');
  });

  it('lo que la modalidad excluye no aplica, esté como esté', () => {
    // Gana sobre cualquier otro estado: no está pendiente, es que no va a
    // ocurrir. Y así el contador de la etapa no la exige para llegar al 100%.
    for (const estado of [null, 'BORRADOR', 'APROBADO']) {
      expect(estadoDeActividad(false, estado)).toBe('no_aplica');
    }
  });
});
