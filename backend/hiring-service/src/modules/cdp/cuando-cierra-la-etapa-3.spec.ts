import { laEtapaCerro } from './cdp.service';
import { EstadoActividad } from '../../entities/proceso-actividad.entity';

/**
 * Cuándo se da por cerrada la etapa 3, que es lo que radica el CDP.
 *
 * El estudio previo aprobado es la solicitud formal, así que la 4.1 nace sola
 * al terminar la etapa anterior. De esta regla depende que el CDP se pida ni
 * antes —sobre una modalidad que aún puede cambiar en la 3.5, o un proceso que
 * el comité todavía no ha aprobado— ni después, que es lo que obligaba a que
 * alguien lo radicara a mano.
 *
 * Se prueba sobre la función pura y no contra la base: qué cuenta como
 * «cerrada» es una decisión del flujo, y tiene que poder fijarse aquí.
 */
describe('laEtapaCerro', () => {
  const estados = (...e: (EstadoActividad | undefined)[]) => e;

  it('cierra cuando todo lo que aplica está aprobado', () => {
    expect(laEtapaCerro(estados('APROBADO', 'APROBADO', 'APROBADO'))).toBe(true);
  });

  it('lo que la modalidad excluye cuenta como cerrado', () => {
    // NO_APLICA no es trabajo pendiente: es trabajo que nunca hubo. Una mínima
    // cuantía sin comité no puede quedarse esperando al comité.
    expect(laEtapaCerro(estados('APROBADO', 'NO_APLICA', 'APROBADO'))).toBe(true);
  });

  it('no cierra con algo todavía en borrador', () => {
    expect(laEtapaCerro(estados('APROBADO', 'BORRADOR'))).toBe(false);
  });

  it('no cierra con algo esperando aprobación', () => {
    // El caso que más tienta: la 3.7 está en revisión del comité y todo lo
    // demás aprobado. Pedir el CDP aquí sería adelantarse a la decisión.
    expect(laEtapaCerro(estados('APROBADO', 'EN_REVISION'))).toBe(false);
  });

  it('no cierra con algo devuelto para corregir', () => {
    expect(laEtapaCerro(estados('APROBADO', 'DEVUELTO'))).toBe(false);
  });

  it('no cierra con algo negado', () => {
    // Una actividad negada no es una etapa terminada: es un proceso que murió.
    // El servicio ni siquiera llega a preguntar, porque el proceso deja de
    // estar EN_CURSO, pero la regla tiene que decirlo por su cuenta.
    expect(laEtapaCerro(estados('APROBADO', 'NEGADO'))).toBe(false);
  });

  it('no cierra si una actividad de la matriz aún no está instanciada', () => {
    // Sin fila propia es que falta por hacerse. Tratar el hueco como cerrado
    // radicaría el CDP de un proceso a medio recorrer.
    expect(laEtapaCerro(estados('APROBADO', undefined))).toBe(false);
  });

  it('una etapa sin actividades aplicables no está cerrada, está sin parametrizar', () => {
    // Si la matriz no declara nada para esta modalidad, el proceso no ha
    // recorrido nada, y darlo por terminado pediría un CDP sin estudio previo.
    expect(laEtapaCerro([])).toBe(false);
  });
});
