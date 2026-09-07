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
