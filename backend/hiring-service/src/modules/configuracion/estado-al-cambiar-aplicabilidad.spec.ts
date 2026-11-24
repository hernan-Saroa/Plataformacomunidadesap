import { estadoAlCambiarAplicabilidad } from './configuracion.service';

/**
 * Cambiar en Configuración si una actividad aplica a una modalidad llega a los
 * procesos vivos de esa modalidad. Antes solo lo veían los procesos nuevos: el
 * riel de cada proceso se decidía una vez, al crearlo.
 */
describe('estadoAlCambiarAplicabilidad · los procesos vivos ven el cambio de la matriz', () => {
  it('lo que deja de aplicar y nadie ha tocado sale del riel', () => {
    expect(estadoAlCambiarAplicabilidad({ estado: 'BORRADOR', datos: {} }, true, false)).toBe('NO_APLICA');
  });

  it('lo que empieza a aplicar queda por hacer si el proceso todavía no llega ahí', () => {
    expect(estadoAlCambiarAplicabilidad({ estado: 'NO_APLICA', datos: {} }, false, false)).toBe('BORRADOR');
  });

  it('lo que empieza a aplicar pero el proceso ya dejó atrás no se reabre', () => {
    // Pendiente en medio de lo hecho, detendría el riel desde ahí.
    expect(estadoAlCambiarAplicabilidad({ estado: 'NO_APLICA', datos: {} }, false, true)).toBe('NO_APLICA');
  });

  it('lo que ya se trabajó no se toca aunque deje de aplicar', () => {
    expect(estadoAlCambiarAplicabilidad({ estado: 'BORRADOR', datos: { objeto: 'X' } }, true, false)).toBe('BORRADOR');
    expect(estadoAlCambiarAplicabilidad({ estado: 'EN_REVISION', datos: {} }, true, true)).toBe('EN_REVISION');
    expect(estadoAlCambiarAplicabilidad({ estado: 'APROBADO', datos: {} }, true, true)).toBe('APROBADO');
  });
});
