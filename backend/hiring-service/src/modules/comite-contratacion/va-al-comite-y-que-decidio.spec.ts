import {
  desenlaceTrasLaSesion,
  estadoTrasLaSesion,
  exigeObservaciones,
  laSesionAdmiteReabrir,
  laSesionCierra,
  motivoParaNoIrAlComite,
} from './comite-contratacion.service';
import { EstadoActividad } from '../../entities/proceso-actividad.entity';

/** 1.000 SMMLV con un salario de 1.300.000: el umbral de la directa. */
const UMBRAL = 1_300_000_000;

/**
 * Actividad 3.7 · Comité de contratación (la 3.6 de la matriz, RF-DOC-05).
 *
 * La matriz la describe como tres decisiones —«Va o No / observa o no / aprueba
 * o no»— y el registro de constancia no sabía representar ninguna: cerraba en
 * APROBADO pasara lo que pasara, así que un proceso observado por el comité
 * seguía su camino como si lo hubieran avalado.
 */
describe('motivoParaNoIrAlComite · el «Va o No» de la matriz', () => {
  const noVa = (
    estado: EstadoActividad,
    valor: number | null,
    umbral: number | null = UMBRAL,
  ) => motivoParaNoIrAlComite(estado, valor, umbral);

  it('va cuando la cuantía supera el umbral', () => {
    expect(noVa('BORRADOR', UMBRAL + 1)).toBeNull();
  });

  it('no va por debajo del umbral', () => {
    expect(noVa('BORRADOR', UMBRAL - 1)).toBe('NO_SUPERA_EL_UMBRAL');
  });

  it('el umbral exacto no lo supera: la regla dice «solo si supera»', () => {
    // El borde donde se juega la mitad de los errores de este tipo de reglas.
    // RF-DOC-05 dice «solo si supera 1.000 SMMLV», así que 1.000 exactos no
    // van, y el proceso que vale un peso más sí.
    expect(noVa('BORRADOR', UMBRAL)).toBe('NO_SUPERA_EL_UMBRAL');
  });

  it('sin umbral configurado va siempre', () => {
    // Las otras siete modalidades que la matriz lleva al comité: no tienen
    // condición de cuantía, así que el comité las ve todas.
    expect(noVa('BORRADOR', 1_000, null)).toBeNull();
  });

  it('la modalidad que la matriz excluye no llega ni a preguntarse por la cuantía', () => {
    // Menor cuantía, mínima cuantía y enajenación por subasta: la actividad
    // nace en NO_APLICA y el umbral no pinta nada.
    expect(noVa('NO_APLICA', UMBRAL + 1)).toBe('MODALIDAD');
  });

  it('sin valor estimado, va', () => {
    // No se puede comparar, y ante la duda se lleva al comité: revisar de más
    // cuesta una sesión; revisar de menos se salta un control.
    expect(noVa('BORRADOR', null)).toBeNull();
  });

  it('sin SMMLV cargado para el año, también va', () => {
    // El umbral en SMMLV no se pudo llevar a pesos. Un umbral que no se puede
    // comparar no puede excluir a nadie.
    expect(noVa('BORRADOR', 5_000_000, null)).toBeNull();
  });
});

describe('estadoTrasLaSesion · en qué queda la actividad', () => {
  it('aprobar la cierra', () => {
    expect(estadoTrasLaSesion('APROBADO')).toBe('APROBADO');
  });

  it('aprobar con condiciones también: sigue siendo una aprobación', () => {
    // El proceso sigue; lo que queda es una carga anotada en el expediente.
    // Tratarla como un no lo detendría sin que el comité lo hubiera detenido.
    expect(estadoTrasLaSesion('APROBADO_CON_CONDICIONES')).toBe('APROBADO');
  });

  it('observar la devuelve, que es lo que el registro no sabía hacer', () => {
    // Y DEVUELTO y no BORRADOR: es lo que le dice al proceso que hay algo que
    // corregir y lo que hace que las observaciones se muestren en vez de
    // quedar enterradas en el historial de sesiones.
    expect(estadoTrasLaSesion('OBSERVADO')).toBe('DEVUELTO');
  });

  it('observar no cierra nada: la etapa sigue abierta', () => {
    // De esto depende que no se radique el CDP de un proceso que el comité
    // devolvió.
    expect(estadoTrasLaSesion('OBSERVADO')).not.toBe('APROBADO');
  });

  it('rechazar la niega, y NEGADO no es DEVUELTO', () => {
    // El mismo criterio que negar el estudio previo en la 3.4: devuelta, la
    // actividad se corrige y se reenvía; negada, no se toca más. Con un solo
    // estado el riel le ofrecería al abogado volver a llevar a comité un
    // proceso que el comité ya decidió que no sale al mercado.
    expect(estadoTrasLaSesion('RECHAZADO')).toBe('NEGADO');
    expect(estadoTrasLaSesion('RECHAZADO')).not.toBe('DEVUELTO');
  });
});

/**
 * Los dos «no» del comité, que no son el mismo (EFDS-2068).
 *
 * Observar devuelve para corregir y el proceso vuelve a comité; rechazar dice
 * que el proceso no sale al mercado. Mientras solo existió el primero, un
 * comité que concluía que no había que contratar tenía que mandar la decisión
 * de vuelta a la 3.4 para que otro la firmara.
 */
describe('desenlaceTrasLaSesion · cuándo termina el proceso', () => {
  it('rechazar lo niega', () => {
    // Dejarlo EN_CURSO con su comité rechazado haría que el listado y las
    // estadísticas contaran como vivo un expediente que nadie va a tocar.
    expect(desenlaceTrasLaSesion('RECHAZADO')).toBe('NEGADO');
  });

  it('observar no: ahí el proceso corrige y vuelve', () => {
    expect(desenlaceTrasLaSesion('OBSERVADO')).toBeNull();
  });

  it('aprobar, con o sin condiciones, tampoco', () => {
    expect(desenlaceTrasLaSesion('APROBADO')).toBeNull();
    expect(desenlaceTrasLaSesion('APROBADO_CON_CONDICIONES')).toBeNull();
  });
});

describe('laSesionCierra · de qué depende la firma', () => {
  it('aprobar y rechazar cierran la actividad: las dos se firman', () => {
    // Rechazar niega el proceso entero, así que es de lo último que se firma
    // en un expediente: menos motivo todavía para saltárselo.
    expect(laSesionCierra('APROBADO')).toBe(true);
    expect(laSesionCierra('APROBADO_CON_CONDICIONES')).toBe(true);
    expect(laSesionCierra('RECHAZADO')).toBe(true);
  });

  it('observar no la cierra', () => {
    expect(laSesionCierra('OBSERVADO')).toBe(false);
  });
});

describe('exigeObservaciones · cuándo hay que decir qué objetó el comité', () => {
  it('observar y rechazar siempre', () => {
    expect(exigeObservaciones('OBSERVADO', false)).toBe(true);
    expect(exigeObservaciones('RECHAZADO', false)).toBe(true);
  });

  it('aprobar solo si además reabre algo', () => {
    // La actividad reabierta le llega a su responsable devuelta: sin texto no
    // sabría qué tiene que validar.
    expect(exigeObservaciones('APROBADO', false)).toBe(false);
    expect(exigeObservaciones('APROBADO', true)).toBe(true);
    expect(exigeObservaciones('APROBADO_CON_CONDICIONES', true)).toBe(true);
  });

  it('las condiciones no sirven de texto: dicen a qué queda sujeto, no qué validar', () => {
    // Una aprobación condicionada sin reabrir nada solo pide condiciones.
    expect(exigeObservaciones('APROBADO_CON_CONDICIONES', false)).toBe(false);
  });
});

describe('laSesionAdmiteReabrir · qué desenlaces dejan algo abierto', () => {
  it('rechazar no reabre nada: el expediente queda negado', () => {
    // Una actividad devuelta dentro de un proceso muerto es trabajo que se le
    // pide a alguien para nada.
    expect(laSesionAdmiteReabrir('RECHAZADO')).toBe(false);
  });

  it('los demás sí, para corregir o para validar', () => {
    expect(laSesionAdmiteReabrir('OBSERVADO')).toBe(true);
    expect(laSesionAdmiteReabrir('APROBADO')).toBe(true);
    expect(laSesionAdmiteReabrir('APROBADO_CON_CONDICIONES')).toBe(true);
  });
});
