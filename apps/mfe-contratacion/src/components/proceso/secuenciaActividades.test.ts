import { describe, expect, it } from 'vitest';

import {
  actividadesDisponibles,
  estaTerminada,
  motivoDelBloqueo,
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

describe('estaTerminada', () => {
  it('solo APROBADO termina una actividad', () => {
    expect(estaTerminada(paso('3.1', { estado: 'APROBADO' }))).toBe(true);

    for (const estado of ['BORRADOR', 'EN_REVISION', 'DEVUELTO', null, undefined]) {
      expect(estaTerminada(paso('3.1', { estado }))).toBe(false);
    }
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
