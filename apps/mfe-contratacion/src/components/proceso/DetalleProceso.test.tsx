import { describe, it, expect } from 'vitest';

import { actividadEnCurso } from './DetalleProceso';

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
