import { describe, it, expect } from 'vitest';

import { actividadEnCurso, actividadReabierta } from './DetalleProceso';

/**
 * Qué actividad abre la pantalla al entrar por «Ver etapa» o «Consultar».
 *
 * Antes recibía al gestor con «Elige una actividad» y le tocaba buscar en el
 * riel el punto al que el proceso ya había llegado.
 */
describe('actividadEnCurso · por dónde va el proceso', () => {
  const act = (numeral: string, estado: string | null, aplica = true) => ({
    numeral,
    estado,
    aplica,
  });

  it('abre la primera sin aprobar cuando las anteriores ya están aprobadas', () => {
    const catalogo = [
      act('3.1', 'APROBADO'),
      act('3.2', 'APROBADO'),
      act('3.3', 'BORRADOR'),
      act('3.4', null),
    ];

    expect(actividadEnCurso(catalogo, 'APROBADO')).toBe('3.3');
  });

  it('se queda en la 3.1 mientras el estudio previo no esté aprobado', () => {
    // La 3.1 no vive en `proceso_actividades`: su estado es el del estudio.
    const catalogo = [act('3.1', null), act('3.2', null)];

    expect(actividadEnCurso(catalogo, 'BORRADOR')).toBe('3.1');
  });

  it('no salta a una que la secuencia todavía tiene bloqueada', () => {
    // La 3.2 quedó a medias, así que la 3.3 no se puede abrir aunque exista.
    const catalogo = [
      act('3.1', 'APROBADO'),
      act('3.2', 'EN_REVISION'),
      act('3.3', 'BORRADOR'),
    ];

    expect(actividadEnCurso(catalogo, 'APROBADO')).toBe('3.2');
  });

  it('salta las que la modalidad excluye', () => {
    const catalogo = [
      act('3.1', 'APROBADO'),
      act('3.2', null, false),
      act('3.3', null),
    ];

    expect(actividadEnCurso(catalogo, 'APROBADO')).toBe('3.3');
  });

  it('no fuerza ninguna cuando está todo aprobado', () => {
    const catalogo = [act('3.1', 'APROBADO'), act('3.2', 'APROBADO')];

    expect(actividadEnCurso(catalogo, 'APROBADO')).toBeNull();
  });

  it('no elige nada mientras el catálogo no ha llegado', () => {
    // Si eligiera con la lista vacía abriría una actividad que el riel aún no
    // pinta, y la pantalla se abriría en un sitio que no existe.
    expect(actividadEnCurso([], 'BORRADOR')).toBeNull();
  });
});

/**
 * Dónde cae cada quien al abrir el proceso (EFDS-1183).
 *
 * Un estudio previo enviado está esperando a que alguien lo revise: para quien
 * lo mandó no hay nada que hacer ahí, y para la Dirección que acaba de
 * recibirlo, tampoco —lo suyo es hacerse cargo—. Abrir la 3.1 le ponía delante
 * un formulario bloqueado en vez de la única acción disponible.
 */
describe('actividadEnCurso · lo que espera decisión no es el punto del proceso', () => {
  const act = (numeral: string, estado: string | null, aplica = true) => ({
    numeral,
    estado,
    aplica,
  });

  it('con el estudio previo enviado, lleva a la radicación', () => {
    const catalogo = [act('3.1', null), act('3.2', null), act('3.3', null)];

    expect(actividadEnCurso(catalogo, 'EN_REVISION')).toBe('3.3');
  });

  it('recibido el proceso, sigue llevando a la radicación hasta repartirlo', () => {
    // La 3.3 no se cumple al tomarlo y ya: falta elegir abogado, y eso también
    // se hace ahí.
    const catalogo = [act('3.1', null), act('3.2', null), act('3.3', 'BORRADOR')];

    expect(actividadEnCurso(catalogo, 'EN_REVISION')).toBe('3.3');
  });

  it('resuelta la radicación, vuelve al estudio previo, que es donde se decide', () => {
    // Es el caso del abogado: no tiene nada que trabajar, pero sí algo que
    // resolver, y es ahí donde se resuelve.
    const catalogo = [act('3.1', null), act('3.2', null), act('3.3', 'APROBADO')];

    expect(actividadEnCurso(catalogo, 'EN_REVISION')).toBe('3.1');
  });

  it('en borrador no se salta nada: el proceso sigue siendo del área', () => {
    const catalogo = [act('3.1', null), act('3.2', null), act('3.3', null)];

    expect(actividadEnCurso(catalogo, 'BORRADOR')).toBe('3.1');
  });
});

/**
 * Lo reabierto manda sobre lo que viene después (EFDS-2068).
 *
 * El comité aprueba la 3.7 y de paso reabre la 3.2 para que se la validen. La
 * guía del paso siguiente solo miraba hacia adelante: saltaba por encima de la
 * 3.2 y mandaba a la etapa 4, o —cuando la 3.2 bloqueaba el resto— decía «debe
 * continuar otra persona». Ninguna de las dos era lo que acababa de pasar.
 */
describe('actividadReabierta · a dónde hay que volver', () => {
  const paso = (
    numeral: string,
    estado: string | null,
    extra: { aplica?: boolean; construida?: boolean } = {},
  ) => ({
    numeral,
    estado,
    aplica: extra.aplica ?? true,
    construida: extra.construida ?? true,
  });

  it('encuentra la que quedó devuelta aunque esté antes en el flujo', () => {
    const flujo = [
      paso('3.1', 'APROBADO'),
      paso('3.2', 'DEVUELTO'),
      paso('3.7', 'APROBADO'),
      paso('4.1', null),
    ];

    expect(actividadReabierta(flujo)?.numeral).toBe('3.2');
  });

  it('sin nada devuelto no desvía a ninguna parte', () => {
    const flujo = [paso('3.1', 'APROBADO'), paso('3.7', 'APROBADO'), paso('4.1', null)];

    expect(actividadReabierta(flujo)).toBeNull();
  });

  it('ignora las que la modalidad excluye o no tienen panel', () => {
    // Mandar a una actividad que no se puede abrir es peor que no mandar a
    // ninguna: el botón lleva a una pantalla que no existe.
    const flujo = [
      paso('3.2', 'DEVUELTO', { aplica: false }),
      paso('3.6', 'DEVUELTO', { construida: false }),
      paso('3.5', 'DEVUELTO'),
    ];

    expect(actividadReabierta(flujo)?.numeral).toBe('3.5');
  });

  it('con varias devueltas manda a la primera: es por donde hay que empezar', () => {
    const flujo = [paso('3.1', 'DEVUELTO'), paso('3.2', 'DEVUELTO'), paso('3.7', 'APROBADO')];

    expect(actividadReabierta(flujo)?.numeral).toBe('3.1');
  });
});
