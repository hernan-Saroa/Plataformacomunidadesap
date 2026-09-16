import {
  avisoQueRige,
  destinatariosFinales,
  eventosDeActividad,
  eventosDeTraza,
  leerAviso,
  mensajeDeAviso,
  TrazaLeida,
} from './eventos';

/**
 * A quién le llega cada aviso (EFDS-1183).
 *
 * Un error aquí no falla ruidosamente: alguien simplemente deja de enterarse.
 */
const traza = (parcial: Partial<TrazaLeida>): TrazaLeida => ({
  procesoId: 'p-1',
  entidad: 'aprobacion_actividad',
  accion: 'DEVOLVER',
  detalle: { numeral: '3.4' },
  usuarioId: 'u-director',
  usuarioNombre: 'director@esap.edu.co',
  ...parcial,
});

describe('eventosDeTraza · qué pasó, dicho en un solo vocabulario', () => {
  it('reconoce la devolución de la aprobación genérica, con su actividad', () => {
    const [ev] = eventosDeTraza(traza({ detalle: { numeral: '3.4', observaciones: ' Falta el CDP ' } }));

    expect(ev).toMatchObject({
      evento: 'DEVUELTA',
      numeral: '3.4',
      procesoId: 'p-1',
      actorId: 'u-director',
      observaciones: 'Falta el CDP',
    });
  });

  it('pone la actividad fija a los eventos del reparto, que no la guardan', () => {
    expect(eventosDeTraza(traza({ entidad: 'participacion_proceso', accion: 'RADICAR', detalle: {} }))[0])
      .toMatchObject({ evento: 'RECIBIDO_EN_CONTRATACION', numeral: '3.3' });
    expect(
      eventosDeTraza(traza({ entidad: 'participacion_proceso', accion: 'DESIGNAR', detalle: { papel: 'ABOGADO' } }))[0],
    ).toMatchObject({ evento: 'HABILITADA', numeral: '3.4' });
  });

  it('radicar el proceso es un evento de la 3.1', () => {
    expect(eventosDeTraza(traza({ entidad: 'proceso', accion: 'CREAR', detalle: {} }))[0]).toMatchObject({
      evento: 'PROCESO_RADICADO',
      numeral: '3.1',
    });
  });

  it('la modalidad, que decide en su propio panel, también avisa', () => {
    // La 3.5 no pasa por la aprobación genérica: escribe su traza aparte, y
    // sin traducirla enviarla y decidirla no avisaban a nadie.
    const de = (accion: string) =>
      eventosDeTraza(traza({ entidad: 'modalidad_proceso', accion: accion as any, detalle: { actividad: '3.5' } }))[0];

    expect(de('ENVIAR')).toMatchObject({ evento: 'ENVIADA_A_APROBACION', numeral: '3.5' });
    expect(de('APROBAR')).toMatchObject({ evento: 'APROBADA', numeral: '3.5' });
    expect(de('DEVOLVER')).toMatchObject({ evento: 'DEVUELTA', numeral: '3.5' });
  });

  it('registrar donde hay aprobadores es enviar a aprobación', () => {
    // El registro no deja un evento de envío aparte: sin esto, «se envía a
    // aprobación» nunca se habría disparado en las actividades de registro.
    const eventos = eventosDeTraza(
      traza({ entidad: 'registros_actividad', accion: 'GUARDAR', detalle: { numeral: '3.2', estado: 'EN_REVISION' } }),
    ).map((e) => e.evento);

    expect(eventos).toEqual(['ENVIADA_A_APROBACION']);
  });

  it('registrar sin aprobadores no avisa aparte: lo cuenta el «le toca» de la siguiente', () => {
    const eventos = eventosDeTraza(
      traza({ entidad: 'registros_actividad', accion: 'GUARDAR', detalle: { numeral: '3.2', estado: 'APROBADO' } }),
    );

    expect(eventos).toEqual([]);
  });

  it('no avisa de consultas ni de lo que no reconoce', () => {
    expect(eventosDeTraza(traza({ entidad: 'expediente', accion: 'CONSULTAR' }))).toEqual([]);
    expect(eventosDeTraza(traza({ entidad: 'cdp', accion: 'EXPEDIR' }))).toEqual([]);
  });

  it('sin proceso o sin actividad no hay aviso posible', () => {
    expect(eventosDeTraza(traza({ procesoId: null }))).toEqual([]);
    expect(eventosDeTraza(traza({ detalle: {} }))).toEqual([]);
  });

  it('designar a alguien que no es abogado no es asignar abogado', () => {
    expect(
      eventosDeTraza(traza({ entidad: 'participacion_proceso', accion: 'DESIGNAR', detalle: { papel: 'SUPERVISOR' } })),
    ).toEqual([]);
  });
});

describe('destinatariosFinales', () => {
  it('quita repetidos y a quien hizo la acción', () => {
    // El abogado que además tiene el rol configurado recibiría dos avisos.
    expect(destinatariosFinales(['a', 'b', 'a', null, 'actor'], 'actor')).toEqual(['a', 'b']);
  });
});

describe('leerAviso', () => {
  it('descarta eventos y papeles que no existen', () => {
    expect(leerAviso({ evento: 'INVENTADO', activo: true, papeles: [], roles: [] })).toBeNull();
    expect(
      leerAviso({ evento: 'APROBADA', activo: true, papeles: ['QUIEN_ENVIO', 'JEFE'], roles: ['X', 3] }),
    ).toEqual({
      evento: 'APROBADA',
      personalizado: true,
      activo: true,
      papeles: ['QUIEN_ENVIO'],
      roles: ['X'],
      personas: [],
      dependencias: [],
    });
  });

  it('lo que no dice activo con todas las letras está apagado', () => {
    expect(leerAviso({ evento: 'APROBADA', activo: 'true' as never, papeles: [], roles: [] })?.activo).toBe(false);
  });
});

describe('eventosDeActividad · «le toca a alguien»', () => {
  it('se ofrece en las actividades que se trabajan en la plataforma', () => {
    expect(eventosDeActividad('4.1').map((e) => e.codigo)).toContain('HABILITADA');
  });

  it('está en todas las actividades, también en las que no tienen pantalla', () => {
    expect(eventosDeActividad('3.4').map((e) => e.codigo)).toContain('HABILITADA');
    expect(eventosDeActividad('1.1').map((e) => e.codigo)).toContain('HABILITADA');
    expect(eventosDeActividad('5.8').map((e) => e.codigo)).toContain('HABILITADA');
  });

  it('en la 3.4 viene encendido para el abogado que asignan', () => {
    expect(avisoQueRige('HABILITADA', undefined, '3.4')).toMatchObject({ activo: true, papeles: ['ABOGADO'] });
  });

  it('donde no hay pantalla viene apagado: lo enciende quien sepa que sirve', () => {
    expect(avisoQueRige('HABILITADA', undefined, '5.8')).toMatchObject({ activo: false });
    expect(avisoQueRige('HABILITADA', undefined, '1.1')).toMatchObject({ activo: false });
  });

  it('en la 3.4 dice que sale al asignar el abogado', () => {
    expect(
      mensajeDeAviso({ evento: 'HABILITADA', numeral: '3.4', actorNombre: 'Patricia', observaciones: null }, null, 'CTO-1'),
    ).toMatchObject({ titulo: 'Te toca revisar un proceso' });
  });

  it('viene encendido y dirigido a quien hace cada actividad, sin configurar nada', () => {
    expect(avisoQueRige('HABILITADA', undefined, '4.1')).toMatchObject({
      activo: true,
      personalizado: false,
      papeles: ['EQUIPO_FINANCIERO'],
      roles: [],
    });
    expect(avisoQueRige('HABILITADA', undefined, '9.4')).toMatchObject({ papeles: ['SUPERVISOR'] });
    expect(avisoQueRige('HABILITADA', undefined, '6.2')).toMatchObject({ papeles: [], roles: ['ORDENADOR_GASTO'] });
  });

  it('lo que la Dirección cambió manda sobre lo sugerido de la actividad', () => {
    const cambiado = leerAviso({ evento: 'HABILITADA', activo: false, papeles: [], roles: [] })!;
    expect(avisoQueRige('HABILITADA', cambiado, '4.1')).toMatchObject({ activo: false, personalizado: true });
  });
});

describe('mensajeDeAviso', () => {
  it('«te toca» dice qué actividad y de qué proceso', () => {
    const m = mensajeDeAviso(
      { evento: 'HABILITADA', numeral: '4.1', actorNombre: 'Ana', observaciones: null },
      'Solicitud de CDP',
      'CTO-2026-0016',
    );
    expect(m.titulo).toBe('Te toca una actividad');
    expect(m.mensaje).toBe('4.1 · Solicitud de CDP del proceso CTO-2026-0016 ya se puede trabajar: se terminó lo que venía antes.');
  });

  it('la devolución cuenta las observaciones y va con prioridad alta', () => {
    const m = mensajeDeAviso(
      { evento: 'DEVUELTA', numeral: '3.4', actorNombre: 'Ana', observaciones: 'Falta el CDP' },
      'Revisión y reparto',
      'CTO-2026-0017',
    );
    expect(m.prioridad).toBe('Alta');
    expect(m.mensaje).toBe('3.4 · Revisión y reparto del proceso CTO-2026-0017 fue devuelta por Ana: «Falta el CDP»');
  });
});
