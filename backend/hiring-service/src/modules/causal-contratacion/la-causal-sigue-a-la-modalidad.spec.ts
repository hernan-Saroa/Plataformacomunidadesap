import { ETAPA_CAUSAL, motivoParaNoElegir } from './causal-contratacion.service';
import { EstadoActividad } from '../../entities/proceso-actividad.entity';

/**
 * Actividad 3.6 · Causal de contratación (3.5.1 de la matriz, RF-EST-04).
 *
 * De esta regla depende que la causal se elija cuando tiene sentido elegirla:
 * ni en una modalidad que la matriz no marca, ni antes de que la 3.5 ratifique
 * la modalidad de cuya lista sale, ni después de que la etapa 3 cierre y la
 * solicitud de CDP ya se haya radicado con ella detrás.
 *
 * Se prueba sobre la función pura y no contra la base: es una decisión del
 * flujo y tiene que poder fijarse aquí.
 */
describe('motivoParaNoElegir · cuándo está abierta la 3.6', () => {
  const abierta = (
    causal: EstadoActividad,
    modalidad: EstadoActividad = 'APROBADO',
    etapa = ETAPA_CAUSAL,
  ) => motivoParaNoElegir(causal, modalidad, etapa);

  it('está abierta con la modalidad ratificada y el proceso en la etapa 3', () => {
    expect(abierta('BORRADOR')).toBeNull();
  });

  it('la modalidad sin ratificar la cierra', () => {
    // El caso que da sentido a todo: la lista de causales es la de la
    // modalidad, y mientras la 3.5 pueda devolverla y cambiarla, elegir aquí
    // dejaría en el expediente una causal de una modalidad que el proceso ya no
    // tiene.
    expect(abierta('BORRADOR', 'EN_REVISION')).toBe('MODALIDAD_SIN_RATIFICAR');
    expect(abierta('BORRADOR', 'DEVUELTO')).toBe('MODALIDAD_SIN_RATIFICAR');
    expect(abierta('BORRADOR', 'BORRADOR')).toBe('MODALIDAD_SIN_RATIFICAR');
  });

  it('una modalidad que la propia modalidad excluye no bloquea', () => {
    // NO_APLICA no es trabajo pendiente: si la matriz no pide ratificar la
    // modalidad, no hay nada que esperar. Hoy no puede darse —bolsa mercantil
    // excluye las dos actividades— pero la regla no depende de eso.
    expect(abierta('BORRADOR', 'NO_APLICA')).toBeNull();
  });

  it('no se elige donde la matriz no la pide', () => {
    // Nueve de las once modalidades. La actividad se instancia igual, en
    // NO_APLICA, para que el expediente diga por qué el proceso tuvo un paso
    // menos.
    expect(abierta('NO_APLICA')).toBe('NO_APLICA');
  });

  it('que no aplique pesa más que la modalidad sin ratificar', () => {
    // Un proceso de licitación con la 3.5 a medias no tiene «la causal
    // pendiente»: no tiene causal, y el motivo que se le muestra tiene que ser
    // ese y no uno que sugiera que falta un paso previo.
    expect(abierta('NO_APLICA', 'EN_REVISION')).toBe('NO_APLICA');
  });

  it('ya elegida sigue abierta: rectificar es la forma de corregirla', () => {
    // La actividad queda en APROBADO al elegir. Si eso la cerrara, un abogado
    // que se equivoca de literal no tendría ninguna salida.
    expect(abierta('APROBADO')).toBeNull();
  });

  it('pasada la etapa 3 se cierra', () => {
    // Cerrar la etapa es lo que radica la solicitud de CDP. A partir de ahí la
    // causal ya sustentó una actuación del expediente, y cambiarla lo
    // reescribiría hacia atrás.
    expect(abierta('APROBADO', 'APROBADO', 4)).toBe('ETAPA_PASADA');
    expect(abierta('APROBADO', 'APROBADO', 8)).toBe('ETAPA_PASADA');
  });

  it('un proceso que se quedó atrás no se cierra por la etapa', () => {
    // La etapa solo cierra hacia adelante: un proceso todavía en la 2 —o en
    // cualquier etapa anterior, si la entidad reparametriza— no ha pasado por
    // aquí.
    expect(abierta('BORRADOR', 'APROBADO', 2)).toBeNull();
  });
});
