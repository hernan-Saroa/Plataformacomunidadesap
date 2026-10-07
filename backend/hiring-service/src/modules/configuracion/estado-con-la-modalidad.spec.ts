import { estadoConLaModalidad } from './configuracion.service';

/**
 * Cambiar la modalidad en la 3.1 vuelve a decidir qué actividades recorre el
 * proceso. Antes se decidía una sola vez, al crearlo, y un proceso que pasaba
 * de mínima cuantía a licitación seguía sin comité ni audiencia de riesgos.
 */
describe('estadoConLaModalidad · qué recorre el proceso tras cambiar la modalidad', () => {
  it('lo que la nueva modalidad excluye y nadie ha tocado deja de aplicar', () => {
    expect(estadoConLaModalidad({ estado: 'BORRADOR', datos: {} }, true)).toBe('NO_APLICA');
  });

  it('lo que la nueva modalidad recorre vuelve a estar por hacer', () => {
    expect(estadoConLaModalidad({ estado: 'NO_APLICA', datos: {} }, false)).toBe('BORRADOR');
  });

  it('lo que ya tiene trabajo no se toca', () => {
    // Borrar en silencio lo que alguien diligenció no es lo que se pidió al
    // cambiar la modalidad.
    expect(estadoConLaModalidad({ estado: 'BORRADOR', datos: { causal: 'X' } }, true)).toBe(
      'BORRADOR',
    );
    expect(estadoConLaModalidad({ estado: 'EN_REVISION', datos: {} }, true)).toBe('EN_REVISION');
    expect(estadoConLaModalidad({ estado: 'APROBADO', datos: {} }, true)).toBe('APROBADO');
  });

  it('lo que no cambia de lado se queda como está', () => {
    expect(estadoConLaModalidad({ estado: 'BORRADOR', datos: {} }, false)).toBe('BORRADOR');
    expect(estadoConLaModalidad({ estado: 'NO_APLICA', datos: {} }, true)).toBe('NO_APLICA');
  });
});
