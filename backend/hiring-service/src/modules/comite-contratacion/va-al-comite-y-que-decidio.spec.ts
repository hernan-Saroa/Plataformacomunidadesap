import {
  estadoTrasLaSesion,
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
});
