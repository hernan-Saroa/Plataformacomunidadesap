import { describe, expect, it } from 'vitest';

import {
  actividadesDisponibles,
  estaTerminada,
  motivoDelBloqueo,
  NUNCA_BLOQUEA,
  PasoDelFlujo,
} from './secuenciaActividades';

/** Un paso del flujo con lo que cada caso necesita cambiar. */
const paso = (numeral: string, cambios: Partial<PasoDelFlujo> = {}): PasoDelFlujo => ({
  numeral,
  estado: null,
  aplica: true,
  construida: true,
  ...cambios,
});

describe('secuencia de actividades · el flujo va en orden', () => {
  it('solo ofrece la primera cuando no hay nada hecho', () => {
    const disponibles = actividadesDisponibles([paso('3.1'), paso('3.2'), paso('3.3')]);

    // Diligenciar la 3.2 sin haber hecho la 3.1 dejaba el expediente contando
    // una historia que no ocurrió en ese orden.
    expect([...disponibles]).toEqual(['3.1']);
  });

  it('abre la siguiente cuando la anterior queda aprobada', () => {
    const disponibles = actividadesDisponibles([
      paso('3.1', { estado: 'APROBADO' }),
      paso('3.2'),
      paso('3.3'),
    ]);

    expect([...disponibles]).toEqual(['3.1', '3.2']);
  });

  it('no la abre mientras está esperando aprobación', () => {
    // EN_REVISION puede volver devuelta: dejar arrancar la siguiente sería
    // trabajar sobre algo que quizá se cae.
    const disponibles = actividadesDisponibles([
      paso('3.1', { estado: 'EN_REVISION' }),
      paso('3.2'),
    ]);

    expect(disponibles.has('3.2')).toBe(false);
  });

  it('tampoco con la actividad devuelta ni en borrador', () => {
    for (const estado of ['DEVUELTO', 'BORRADOR']) {
      const disponibles = actividadesDisponibles([paso('3.1', { estado }), paso('3.2')]);
      expect(disponibles.has('3.2')).toBe(false);
    }
  });

  it('se salta las que la modalidad excluye', () => {
    // Una actividad que no va a ocurrir no puede terminarse nunca: si
    // bloqueara, trancaría el proceso entero sin salida.
    const disponibles = actividadesDisponibles([
      paso('3.1', { estado: 'APROBADO' }),
      paso('3.2', { aplica: false }),
      paso('3.3'),
    ]);

    expect(disponibles.has('3.3')).toBe(true);
    expect(disponibles.has('3.2')).toBe(false);
  });

  it('se salta las que aún no tienen panel', () => {
    // Mismo motivo: nadie puede terminarlas todavía.
    const disponibles = actividadesDisponibles([
      paso('3.1', { estado: 'APROBADO' }),
      paso('3.2', { construida: false }),
      paso('3.3'),
    ]);

    expect(disponibles.has('3.3')).toBe(true);
  });

  it('encadena a través de las etapas, no solo dentro de una', () => {
    // La 4.1 continúa lo que la etapa 3 dejó: que empiece una etapa nueva no
    // borra lo que quedó a medias en la anterior.
    const disponibles = actividadesDisponibles([
      paso('3.1', { estado: 'APROBADO' }),
      paso('3.5'),
      paso('4.1'),
    ]);

    expect(disponibles.has('4.1')).toBe(false);
  });

  it('deja pasar toda la cadena cuando todo está aprobado', () => {
    const disponibles = actividadesDisponibles([
      paso('3.1', { estado: 'APROBADO' }),
      paso('3.2', { estado: 'APROBADO' }),
      paso('4.1'),
    ]);

    expect([...disponibles]).toEqual(['3.1', '3.2', '4.1']);
  });
});

/**
 * MiPymes (5.5) y observaciones (5.6) no esperan a lo que la matriz numera
 * antes que ellas (EFDS-2065, reunión de validación del modelo del 17 sep).
 *
 * Ni el límite a MiPyme ni las observaciones se resuelven con la publicación
 * en la web de la ESAP (5.4), ni la una con la otra: solo necesitan que el
 * pliego ya esté publicado en SECOP II (5.3). Numerales de la 112.
 */
describe('actividadesDisponibles · MiPymes y observaciones cuelgan de la publicación', () => {
  const etapa5 = (estadoDeLa54: string | null) => [
    paso('5.1', { estado: 'APROBADO' }),
    paso('5.2', { estado: 'APROBADO' }),
    paso('5.3', { estado: 'APROBADO' }),
    paso('5.4', { estado: estadoDeLa54 }),
    paso('5.5'),
    paso('5.6'),
    paso('5.7'),
  ];

  it('con la web de la ESAP todavía a medias, MiPymes y observaciones ya se pueden trabajar', () => {
    const disponibles = actividadesDisponibles(etapa5('BORRADOR'));

    expect(disponibles.has('5.5')).toBe(true);
    expect(disponibles.has('5.6')).toBe(true);
  });

  it('pero la apertura sigue esperando a que la 5.4 cierre', () => {
    const disponibles = actividadesDisponibles(etapa5('BORRADOR'));

    expect(disponibles.has('5.7')).toBe(false);
  });

  it('sin la publicación (5.3) todavía a medias, tampoco se abren la 5.5 ni la 5.6', () => {
    const flujo = [
      paso('5.1', { estado: 'APROBADO' }),
      paso('5.2', { estado: 'APROBADO' }),
      paso('5.3', { estado: 'BORRADOR' }),
      paso('5.4'),
      paso('5.5'),
      paso('5.6'),
    ];
    const disponibles = actividadesDisponibles(flujo);

    expect(disponibles.has('5.5')).toBe(false);
    expect(disponibles.has('5.6')).toBe(false);
  });

  it('si MiPymes no termina, sigue bloqueando la apertura: no es un pase libre', () => {
    // Que se habilite antes no la exime de completarse: cerrar la 5.4 y la
    // 5.6 no basta si la 5.5 se quedó sin diligenciar.
    const flujo = etapa5('APROBADO').map((p) =>
      p.numeral === '5.6' ? { ...p, estado: 'APROBADO' } : p,
    );
    const disponibles = actividadesDisponibles(flujo);

    expect(disponibles.has('5.5')).toBe(true);
    expect(disponibles.has('5.7')).toBe(false);
  });

  it('con todo aprobado, la cadena sigue hasta la apertura', () => {
    const flujo = etapa5('APROBADO').map((p) =>
      p.numeral === '5.5' || p.numeral === '5.6' ? { ...p, estado: 'APROBADO' } : p,
    );

    expect(actividadesDisponibles(flujo).has('5.7')).toBe(true);
  });
});

/**
 * La audiencia (5.12) y las adendas (5.13) van después de la apertura, como en
 * la matriz (112). Las adendas son opcionales: no detienen la recepción de
 * ofertas. La audiencia, donde aplica, sí.
 */
describe('actividadesDisponibles · lo que viene después de la apertura', () => {
  const tras = (estados: Record<string, string>) =>
    ['5.3', '5.6', '5.7', '5.12', '5.13', '6.1'].map((numeral) =>
      paso(numeral, { estado: estados[numeral] ?? null }),
    );
  const abierto = { '5.3': 'APROBADO', '5.6': 'APROBADO', '5.7': 'APROBADO' };

  it('antes de la apertura no se abren ni la audiencia ni las adendas', () => {
    const disponibles = actividadesDisponibles(tras({ '5.3': 'APROBADO', '5.6': 'APROBADO' }));

    expect(disponibles.has('5.12')).toBe(false);
    expect(disponibles.has('5.13')).toBe(false);
  });

  it('abierto el proceso, se abren las dos a la vez', () => {
    const disponibles = actividadesDisponibles(tras(abierto));

    expect(disponibles.has('5.12')).toBe(true);
    expect(disponibles.has('5.13')).toBe(true);
  });

  it('la audiencia sin celebrar detiene la recepción de ofertas', () => {
    expect(actividadesDisponibles(tras(abierto)).has('6.1')).toBe(false);
  });

  it('las adendas sin cerrar no la detienen', () => {
    const flujo = tras({ ...abierto, '5.12': 'APROBADO', '5.13': 'BORRADOR' });

    expect(actividadesDisponibles(flujo).has('6.1')).toBe(true);
  });

  it('donde no hay apertura, las adendas se abren con la publicación', () => {
    // Mínima cuantía y 092: la matriz no les da apertura y sí adendas.
    const flujo = tras({ '5.3': 'APROBADO', '5.6': 'APROBADO' }).map((p) =>
      p.numeral === '5.7' || p.numeral === '5.12' ? { ...p, aplica: false } : p,
    );

    expect(actividadesDisponibles(flujo).has('5.13')).toBe(true);
  });
});

describe('motivoDelBloqueo · con dependencia declarada', () => {
  it('nombra la 5.3 y no la 5.4, que no le hace falta a la 5.5', () => {
    const flujo = [
      paso('5.1', { estado: 'APROBADO' }),
      paso('5.2', { estado: 'APROBADO' }),
      paso('5.3', { estado: 'BORRADOR' }),
      paso('5.4'),
      paso('5.5'),
    ];

    expect(motivoDelBloqueo('5.5', flujo)).toBe('Antes hay que terminar 5.3');
  });

  it('no da motivo cuando la 5.3 ya está aprobada, aunque la 5.4 siga corriendo', () => {
    const flujo = [
      paso('5.1', { estado: 'APROBADO' }),
      paso('5.2', { estado: 'APROBADO' }),
      paso('5.3', { estado: 'APROBADO' }),
      paso('5.4', { estado: 'BORRADOR' }),
      paso('5.5'),
    ];

    expect(motivoDelBloqueo('5.5', flujo)).toBeNull();
  });

  it('a las adendas les falta la apertura, no la audiencia', () => {
    const flujo = [
      paso('5.3', { estado: 'APROBADO' }),
      paso('5.7', { estado: 'BORRADOR' }),
      paso('5.12'),
      paso('5.13'),
    ];

    expect(motivoDelBloqueo('5.13', flujo)).toBe('Antes hay que terminar 5.7');
  });
});

describe('estaTerminada', () => {
  it('APROBADO y NO_APLICA terminan una actividad', () => {
    expect(estaTerminada(paso('3.1', { estado: 'APROBADO' }))).toBe(true);
    expect(estaTerminada(paso('3.7', { estado: 'NO_APLICA' }))).toBe(true);

    for (const estado of ['BORRADOR', 'EN_REVISION', 'DEVUELTO', null, undefined]) {
      expect(estaTerminada(paso('3.1', { estado }))).toBe(false);
    }
  });

  it('con el contrato firmado se abren a la vez supervisor, RP, garantías y ARL', () => {
    const flujo = [
      paso('8.1', { estado: 'APROBADO' }),
      paso('8.2'),
      paso('8.3'),
      paso('8.4'),
      paso('8.5'),
      paso('8.6'),
    ];

    const disponibles = actividadesDisponibles(flujo);
    expect(['8.2', '8.3', '8.4', '8.5'].every((n) => disponibles.has(n))).toBe(true);
    // La comunicación de inicio dice que están cumplidas: espera a las cuatro.
    expect(disponibles.has('8.6')).toBe(false);
  });

  it('la constancia de que no pasó por comité no deja la 4.2 esperando', () => {
    // La 3.7 sigue aplicando a la modalidad, pero quedó en NO_APLICA porque el
    // valor no supera el umbral. La 4.2 tiene que abrirse.
    const flujo = [
      paso('3.6', { estado: 'APROBADO' }),
      paso('3.7', { estado: 'NO_APLICA' }),
      paso('4.2'),
    ];

    expect(actividadesDisponibles(flujo).has('4.2')).toBe(true);
    expect(motivoDelBloqueo('4.2', flujo)).toBeNull();
  });
});

describe('motivoDelBloqueo', () => {
  it('nombra la actividad que hay que terminar primero', () => {
    const flujo = [paso('3.1', { estado: 'APROBADO' }), paso('3.2'), paso('3.3')];

    // Un candado sin explicación se lee como un fallo del sistema.
    expect(motivoDelBloqueo('3.3', flujo)).toBe('Antes hay que terminar 3.2');
  });

  it('nombra la más cercana, no la primera de todas', () => {
    const flujo = [paso('3.1'), paso('3.2'), paso('3.3')];

    expect(motivoDelBloqueo('3.3', flujo)).toBe('Antes hay que terminar 3.2');
  });

  it('no inventa motivo cuando la actividad sí está disponible', () => {
    const flujo = [paso('3.1', { estado: 'APROBADO' }), paso('3.2')];

    expect(motivoDelBloqueo('3.2', flujo)).toBeNull();
  });

  it('ignora las excluidas al buscar la culpable', () => {
    // Decir «termina la 3.2» cuando la 3.2 no aplica a esta modalidad mandaría
    // al gestor a una actividad que no puede abrir.
    const flujo = [paso('3.1'), paso('3.2', { aplica: false }), paso('3.3')];

    expect(motivoDelBloqueo('3.3', flujo)).toBe('Antes hay que terminar 3.1');
  });
});

/**
 * El bloqueo circular de la etapa 3 (EFDS-1183).
 *
 * La secuencia exige que la anterior esté aprobada, y desde que la 3.4 la
 * resuelve el abogado que se reparte en la 3.3, eso se muerde la cola: nadie
 * puede aprobar porque nadie ha repartido, y nadie puede repartir porque la
 * 3.1 sigue esperando aprobación. El proceso quedaba muerto en la bandeja.
 *
 * El traspaso del área a la Dirección ocurre al enviar, no al aprobar.
 */
describe('actividadesDisponibles · la revisión no bloquea a quien la atiende', () => {
  const paso = (numeral: string, estado: string | null) => ({
    numeral,
    estado,
    aplica: true,
    construida: true,
  });

  const etapa3 = (estadoDeLa31: string | null) => [
    paso('3.1', estadoDeLa31),
    paso('3.2', null),
    paso('3.3', null),
    paso('3.4', null),
    paso('3.5', null),
  ];

  it('con la 3.1 enviada, la Dirección ya puede recibir el proceso', () => {
    const abiertas = actividadesDisponibles(etapa3('EN_REVISION'));

    expect(abiertas.has('3.3')).toBe(true);
  });

  it('y la 3.4 espera a la 3.3, que es donde se reparte el abogado', () => {
    // El orden entre las dos sí se respeta: no se decide sin haber repartido.
    expect(actividadesDisponibles(etapa3('EN_REVISION')).has('3.4')).toBe(false);

    const conLa33Hecha = [
      paso('3.1', 'EN_REVISION'),
      paso('3.2', null),
      paso('3.3', 'APROBADO'),
      paso('3.4', null),
      paso('3.5', null),
    ];
    expect(actividadesDisponibles(conLa33Hecha).has('3.4')).toBe(true);
  });

  it('pero el resto del flujo sigue detenido', () => {
    // Abrir la 3.3 no es abrirlo todo: la 3.2 es del área y la 3.5 viene
    // después de que el estudio previo se apruebe.
    const abiertas = actividadesDisponibles(etapa3('EN_REVISION'));

    expect(abiertas.has('3.2')).toBe(false);
    expect(abiertas.has('3.5')).toBe(false);
  });

  it('con la 3.1 a medias no se abre nada de la Dirección', () => {
    // En borrador el proceso no ha salido del área: no hay nada que recibir.
    const abiertas = actividadesDisponibles(etapa3('BORRADOR'));

    expect(abiertas.has('3.1')).toBe(true);
    expect(abiertas.has('3.3')).toBe(false);
  });

  it('aprobada la 3.1, el flujo sigue como siempre', () => {
    const abiertas = actividadesDisponibles(etapa3('APROBADO'));

    expect(abiertas.has('3.2')).toBe(true);
    // Y se detiene en la primera sin terminar, que ahora es la 3.2.
    expect(abiertas.has('3.3')).toBe(false);
  });
});

/**
 * La 9.2 (seguimiento) y la 9.3 (reasignación) duran toda la ejecución y
 * ningún módulo del backend las marca APROBADO — la matriz las describe como
 * algo que ocurre «en cualquier momento», no como un trámite con un primer
 * envío que lo cierre. Tratarlas como cualquier actividad a medias encerraba
 * la 9.4 y la 9.5 detrás de dos pasos que nunca se cierran: en la base, el
 * cien por ciento de los contratos en ejecución tenían la 9.3 en BORRADOR.
 */
describe('actividadesDisponibles · la 9.2 y la 9.3 nunca bloquean lo que sigue', () => {
  const etapa9 = (estadoDeLa92: string | null, estadoDeLa93: string | null) => [
    paso('9.1', { estado: 'APROBADO' }),
    paso('9.2', { estado: estadoDeLa92 }),
    paso('9.3', { estado: estadoDeLa93 }),
    paso('9.4'),
    paso('9.5'),
  ];

  it('las dos en borrador, como se quedan toda la ejecución, igual se pueden abrir', () => {
    const disponibles = actividadesDisponibles(etapa9('BORRADOR', 'BORRADOR'));

    expect(disponibles.has('9.2')).toBe(true);
    expect(disponibles.has('9.3')).toBe(true);
  });

  it('y no le impiden a la 9.4 abrirse, aunque ninguna de las dos haya cerrado', () => {
    const disponibles = actividadesDisponibles(etapa9('BORRADOR', 'BORRADOR'));

    expect(disponibles.has('9.4')).toBe(true);
  });

  it('motivoDelBloqueo no manda a "terminar la 9.2" ni "la 9.3"', () => {
    const flujo = etapa9('BORRADOR', 'BORRADOR');

    expect(motivoDelBloqueo('9.4', flujo)).toBeNull();
  });

  it('la excepción es la 9.2, la 9.3 y la 9.5, no el resto de la etapa 9', () => {
    expect(NUNCA_BLOQUEA.has('9.2')).toBe(true);
    expect(NUNCA_BLOQUEA.has('9.3')).toBe(true);
    expect(NUNCA_BLOQUEA.has('9.5')).toBe(true);
    expect(NUNCA_BLOQUEA.has('9.1')).toBe(false);
    expect(NUNCA_BLOQUEA.has('9.4')).toBe(false);
  });
});

/**
 * La 9.5 (modificaciones) no es lineal: una modificación cabe en cualquier
 * momento de la ejecución, y la ejecución empieza con el acta de inicio (9.1).
 */
describe('actividadesDisponibles · la 9.5 se abre desde que arranca la ejecución', () => {
  const etapa9 = (estadoDeLa91: string | null, estadoDeLa94: string | null) => [
    paso('9.1', { estado: estadoDeLa91 }),
    paso('9.2', { estado: 'BORRADOR' }),
    paso('9.3', { estado: 'BORRADOR' }),
    paso('9.4', { estado: estadoDeLa94 }),
    paso('9.5'),
    paso('10.1'),
  ];

  it('con el acta de inicio aprobada y los pagos sin empezar, ya se puede modificar', () => {
    const flujo = etapa9('APROBADO', null);

    expect(actividadesDisponibles(flujo).has('9.5')).toBe(true);
    expect(motivoDelBloqueo('9.5', flujo)).toBeNull();
  });

  it('sin acta de inicio no hay ejecución, y por tanto nada que modificar', () => {
    const flujo = etapa9('BORRADOR', null);

    expect(actividadesDisponibles(flujo).has('9.5')).toBe(false);
    expect(motivoDelBloqueo('9.5', flujo)).toBe('Antes hay que terminar 9.1');
  });

  it('un contrato que nunca se modificó no queda trancado antes de la etapa 10', () => {
    const flujo = etapa9('APROBADO', 'APROBADO');

    expect(actividadesDisponibles(flujo).has('10.1')).toBe(true);
    expect(motivoDelBloqueo('10.1', flujo)).toBeNull();
  });

  it('la 10.1 sigue esperando los pagos: la 9.5 no le abre la puerta a nadie', () => {
    const flujo = etapa9('APROBADO', null);

    expect(actividadesDisponibles(flujo).has('10.1')).toBe(false);
    expect(motivoDelBloqueo('10.1', flujo)).toBe('Antes hay que terminar 9.4');
  });
});

/**
 * La secuencia de la versión del flujo (125): de qué depende cada actividad y
 * si detiene a las siguientes, configurado por modalidad en Configuración.
 */
describe('secuencia de actividades · configurada en el flujo', () => {
  const aprobado = { estado: 'APROBADO' } as const;

  it('una que no detiene el flujo deja pasar a la siguiente aunque siga abierta', () => {
    const flujo = [
      paso('8.7', aprobado),
      paso('8.8', { secuencia: { dependeDe: ['8.1'], noBloquea: true } }),
      paso('9.1'),
    ];
    expect(actividadesDisponibles(flujo).has('9.1')).toBe(true);
    expect(motivoDelBloqueo('9.1', flujo)).toBeNull();
  });

  it('sin configuración rige lo de siempre: la 8.8 detiene a la 9.1', () => {
    const flujo = [paso('8.7', aprobado), paso('8.8'), paso('9.1')];
    expect(actividadesDisponibles(flujo).has('9.1')).toBe(false);
    expect(motivoDelBloqueo('9.1', flujo)).toBe('Antes hay que terminar 8.8');
  });

  it('depender de una anterior la abre aunque la de en medio siga abierta', () => {
    const flujo = [
      paso('10.2', aprobado),
      paso('10.3'),
      paso('10.4', { secuencia: { dependeDe: ['10.2'], noBloquea: false } }),
    ];
    expect([...actividadesDisponibles(flujo)]).toEqual(['10.2', '10.3', '10.4']);
  });

  it('una dependencia que no aplica se cumple al llegar a ella, no desde el primer día', () => {
    const cronograma = paso('5.2', { secuencia: { dependeDe: ['4.2'], noBloquea: false } });
    const antes = [paso('3.7'), paso('4.2', { aplica: false }), paso('5.1'), cronograma];
    expect(actividadesDisponibles(antes).has('5.2')).toBe(false);
    // Lo que falta es lo que detiene la cadena antes de la 4.2.
    expect(motivoDelBloqueo('5.2', antes)).toBe('Antes hay que terminar 3.7');

    const despues = [paso('3.7', aprobado), paso('4.2', { aplica: false }), paso('5.1'), cronograma];
    expect(actividadesDisponibles(despues).has('5.2')).toBe(true);
  });
});
