import { NotificadorService } from './notificador.service';
import { EventoOcurrido } from './eventos';

/**
 * El motor de avisos, sin base de datos: cada consulta se responde según lo que
 * pregunta, para poder decir qué pasa con avisos, papeles y fallos (EFDS-1183).
 */
describe('NotificadorService · despachar', () => {
  const devuelta: EventoOcurrido = {
    evento: 'DEVUELTA',
    numeral: '3.4',
    procesoId: 'p-1',
    actorId: 'u-director',
    actorNombre: 'director@esap.edu.co',
    observaciones: 'Falta el CDP',
  };

  /** Responde cada consulta por su contenido. `avisos` es lo configurado. */
  const conBase = (avisos: any[], extra: Record<string, any[]> = {}) => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM hiring.avisos')) return avisos;
      if (sql.includes('FROM hiring.procesos WHERE id')) return [{ modalidad: 'LICITACION', radicado: 'CTO-1' }];
      if (sql.includes('FROM hiring.proceso_actividades')) return extra.envio ?? [];
      if (sql.includes("tipo = 'EXIGE_APROBACION'")) return extra.aprobacion ?? [];
      if (sql.includes('FROM auth.user_roles')) return extra.roles ?? [];
      if (sql.includes('participaciones_proceso')) return extra.abogado ?? [];
      if (sql.includes('FROM hiring.actividades')) return [{ nombre: 'Revisión y reparto' }];
      return [];
    });
    return { srv: new NotificadorService({ query } as never), query };
  };

  const fetchOk = () => {
    const f = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = f as never;
    return f;
  };

  const cuerpo = (f: jest.Mock) => JSON.parse(f.mock.calls[0][1].body).notifications;

  afterEach(() => {
    delete process.env.NOTIFICACIONES_CONFIGURABLES;
  });

  it('un aviso apagado en la actividad no avisa a nadie', async () => {
    const f = fetchOk();
    const { srv } = conBase([{ evento: 'DEVUELTA', activo: false, papeles: ['QUIEN_ENVIO'], roles: [] }], {
      envio: [{ id: 'u-ana' }],
    });

    expect(await srv.despachar([devuelta])).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it('la devolución le llega a quien envió la actividad', async () => {
    const f = fetchOk();
    const { srv } = conBase([{ evento: 'DEVUELTA', activo: true, papeles: ['QUIEN_ENVIO'], roles: [] }], {
      envio: [{ id: 'u-ana' }],
    });

    expect(await srv.despachar([devuelta])).toBe(1);
    const [aviso] = cuerpo(f);
    expect(aviso.id_usuario_destinatario).toBe('u-ana');
    expect(aviso.prioridad).toBe('Alta');
    expect(aviso.mensaje).toContain('«Falta el CDP»');
  });

  it('«quien aprueba» sale de lo configurado en la pestaña de Aprobación', async () => {
    const f = fetchOk();
    const { srv } = conBase(
      [{ evento: 'ENVIADA_A_APROBACION', activo: true, papeles: ['QUIEN_APRUEBA'], roles: [] }],
      {
        aprobacion: [{ modalidad: null, config: { roles: ['DIRECTOR_CONTRATACION'], personas: [] } }],
        roles: [{ id: 'u-director-2' }],
      },
    );

    await srv.despachar([{ ...devuelta, evento: 'ENVIADA_A_APROBACION', actorId: 'u-ana' }]);
    expect(cuerpo(f).map((a: any) => a.id_usuario_destinatario)).toEqual(['u-director-2']);
  });

  it('no le avisa a quien hizo la acción aunque tenga el rol', async () => {
    const f = fetchOk();
    const { srv } = conBase([{ evento: 'DEVUELTA', activo: true, papeles: [], roles: ['DIRECTOR_CONTRATACION'] }], {
      roles: [{ id: 'u-director' }],
    });

    expect(await srv.despachar([devuelta])).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it('a quien envió antes de que se guardara su cuenta también le llega', async () => {
    // Las actividades ya enviadas solo dejaron el nombre de usuario: la consulta
    // lo traduce a cuenta para que la devolución no se quede sin destinatario.
    const f = fetchOk();
    const { srv, query } = conBase([{ evento: 'DEVUELTA', activo: true, papeles: ['QUIEN_ENVIO'], roles: [] }], {
      envio: [{ id: 'u-ana' }],
    });

    await srv.despachar([devuelta]);

    const sql = String(query.mock.calls.find(([s]) => String(s).includes('proceso_actividades'))?.[0]);
    expect(sql).toContain('u.username = pa.enviado_por');
    expect(cuerpo(f)[0].id_usuario_destinatario).toBe('u-ana');
  });

  it('el mismo hecho registrado dos veces avisa una sola', async () => {
    const f = fetchOk();
    const { srv } = conBase([{ evento: 'DEVUELTA', activo: true, papeles: ['QUIEN_ENVIO'], roles: [] }], {
      envio: [{ id: 'u-ana' }],
    });

    await srv.despachar([devuelta, { ...devuelta }]);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('sin nada configurado rige lo sugerido: la devolución avisa a quien envió', async () => {
    const f = fetchOk();
    const { srv } = conBase([], { envio: [{ id: 'u-ana' }] });

    expect(await srv.despachar([devuelta])).toBe(1);
    expect(cuerpo(f)[0].id_usuario_destinatario).toBe('u-ana');
  });

  it('con el interruptor apagado no hace nada', async () => {
    process.env.NOTIFICACIONES_CONFIGURABLES = 'false';
    const f = fetchOk();
    const { srv, query } = conBase([{ evento: 'DEVUELTA', activo: true, papeles: ['QUIEN_ENVIO'], roles: [] }]);

    expect(await srv.despachar([devuelta])).toBe(0);
    expect(query).not.toHaveBeenCalled();
    expect(f).not.toHaveBeenCalled();
  });

  it('si la base falla, no revienta: se pierde el aviso, no el trabajo', async () => {
    fetchOk();
    const srv = new NotificadorService({ query: jest.fn().mockRejectedValue(new Error('caída')) } as never);

    await expect(srv.despachar([devuelta])).resolves.toBe(0);
  });
});
