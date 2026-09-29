import { NotificadorService } from './notificador.service';

/**
 * «Te toca»: el aviso de que una actividad se habilitó (EFDS-1183).
 *
 * No lo dispara un evento sino el resultado: tras cada cambio de un proceso se
 * mira qué se puede empezar y se avisa lo que no se había avisado.
 */
describe('NotificadorService · revisarHabilitadas', () => {
  const PROCESO = 'p-1';

  /** Un proceso con la 4.1 aprobada y la 4.2 por empezar. */
  const conBase = (opciones: { yaAvisada?: boolean; aviso?: any } = {}) => {
    const query = jest.fn(async (sql: string, params?: any[]) => {
      if (sql.includes('FROM hiring.procesos p') && sql.includes('JOIN hiring.actividades a')) {
        return [
          { numeral: '4.1', estado: 'APROBADO', aplica: true },
          { numeral: '4.2', estado: null, aplica: true },
          { numeral: '4.3', estado: null, aplica: true },
        ];
      }
      if (sql.includes('INSERT INTO hiring.avisos_habilitacion')) {
        return opciones.yaAvisada ? [] : (params?.[1] as string[]).map((numeral) => ({ numeral }));
      }
      if (sql.includes('FROM hiring.avisos')) return opciones.aviso ? [opciones.aviso] : [];
      if (sql.includes('FROM hiring.procesos WHERE id')) return [{ modalidad: 'LICITACION', radicado: 'CTO-1' }];
      if (sql.includes('FROM hiring.actividades')) return [{ nombre: 'Verificar disponibilidad' }];
      return [];
    });
    return { srv: new NotificadorService({ query } as never), query };
  };

  const fetchOk = () => {
    const f = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = f as never;
    return f;
  };

  it('avisa de la siguiente actividad a quien se configuró', async () => {
    const f = fetchOk();
    const { srv } = conBase({
      aviso: { evento: 'HABILITADA', activo: true, papeles: [], roles: [], personas: ['u-financiera'] },
    });

    expect(await srv.revisarHabilitadas(PROCESO, 'u-director', 'Director')).toBe(1);
    const [aviso] = JSON.parse(f.mock.calls[0][1].body).notifications;
    expect(aviso.id_usuario_destinatario).toBe('u-financiera');
    expect(aviso.titulo).toBe('Te toca una actividad');
    expect(aviso.mensaje).toContain('4.2');
  });

  it('sin configurar nada, avisa al equipo financiero de la 4.2: lo sugerido', async () => {
    const f = fetchOk();
    const { srv, query } = conBase();
    query.mockImplementationOnce(query.getMockImplementation() as never);
    const original = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string, params?: any[]) =>
      sql.includes('hiring.alcances_permiso') ? [{ id: 'u-financiera' }] : original(sql, params),
    );

    expect(await srv.revisarHabilitadas(PROCESO, 'u-director', 'Director')).toBe(1);
    expect(JSON.parse(f.mock.calls[0][1].body).notifications[0].id_usuario_destinatario).toBe('u-financiera');
  });

  it('solo anota la que se acaba de habilitar, no las que siguen bloqueadas', async () => {
    fetchOk();
    const { srv, query } = conBase();

    await srv.revisarHabilitadas(PROCESO, 'u-director', 'Director');

    const anotadas = query.mock.calls.find(([sql]) => String(sql).includes('avisos_habilitacion'))?.[1];
    expect(anotadas).toEqual([PROCESO, ['4.2']]);
  });

  it('al arrancar con la tabla vacía, lo ya habilitado se da por avisado sin avisar', async () => {
    const f = fetchOk();
    const { srv, query } = conBase();
    const original = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string, params?: any[]) => {
      if (sql.includes('SELECT EXISTS')) return [{ hay: false }];
      if (sql.includes('SELECT id FROM hiring.procesos')) return [{ id: PROCESO }];
      return original(sql, params);
    });

    expect(await srv.lineaBase()).toBe(1);
    expect(f).not.toHaveBeenCalled();
  });

  it('con algo ya anotado, la línea base no vuelve a correr', async () => {
    const { srv, query } = conBase();
    const original = query.getMockImplementation()!;
    query.mockImplementation(async (sql: string, params?: any[]) =>
      sql.includes('SELECT EXISTS') ? [{ hay: true }] : original(sql, params),
    );

    expect(await srv.lineaBase()).toBe(0);
    expect(query.mock.calls.some(([sql]) => String(sql).includes('SELECT id FROM hiring.procesos'))).toBe(false);
  });

  it('lo ya avisado no se repite cada vez que alguien toca el proceso', async () => {
    const f = fetchOk();
    const { srv } = conBase({
      yaAvisada: true,
      aviso: { evento: 'HABILITADA', activo: true, papeles: [], roles: [], personas: ['u-financiera'] },
    });

    expect(await srv.revisarHabilitadas(PROCESO, 'u-director', 'Director')).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });

  it('apagado no avisa, pero la anota: encenderlo después no suelta lo viejo de golpe', async () => {
    const f = fetchOk();
    const { srv, query } = conBase({
      aviso: { evento: 'HABILITADA', activo: false, papeles: ['EQUIPO_FINANCIERO'], roles: [], personas: [] },
    });

    expect(await srv.revisarHabilitadas(PROCESO, 'u-director', 'Director')).toBe(0);
    expect(f).not.toHaveBeenCalled();
    expect(query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO hiring.avisos_habilitacion'))).toBe(true);
  });
});
