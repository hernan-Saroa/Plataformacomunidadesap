import { NotificadorService } from './notificador.service';
import { EventoOcurrido } from './eventos';

/**
 * El motor de avisos, sin base de datos: cada consulta se responde según lo que
 * pregunta, para poder decir qué pasa con avisos, destinatarios y fallos
 * (EFDS-1183).
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

  /** Un aviso que se configura: adjuntar un documento. */
  const adjunto: EventoOcurrido = { ...devuelta, evento: 'DOCUMENTO_ADJUNTO', numeral: '3.2', observaciones: null };

  /** Responde cada consulta por su contenido. `avisos` es lo configurado. */
  const conBase = (avisos: any[], extra: Record<string, any[]> = {}) => {
    const query = jest.fn(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('avisos_por_correo')) return extra.porCorreo ?? [];
      if (sql.includes('correo_contratista')) return extra.contratista ?? [];
      if (sql.includes('dir_email')) return extra.correos ?? [];
      if (sql.includes('FROM hiring.avisos')) return avisos;
      if (sql.includes('FROM hiring.procesos WHERE id')) return [{ modalidad: 'LICITACION', radicado: 'CTO-1' }];
      if (sql.includes('FROM hiring.proceso_actividades')) return extra.envio ?? [];
      if (sql.includes("tipo = 'EXIGE_APROBACION'")) return extra.aprobacion ?? [];
      if (sql.includes('perm.code = $1')) return extra.permiso ?? [];
      if (sql.includes('FROM auth.user_roles')) return extra.roles ?? [];
      if (sql.includes('participaciones_proceso')) return extra.abogado ?? [];
      if (sql.includes('supervisiones_contrato')) return extra.supervisor ?? [];
      if (sql.includes('WHERE id_dependencia::text')) return extra.dependencia ?? [];
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
  const destinatarios = (f: jest.Mock) => cuerpo(f).map((a: any) => a.id_usuario_destinatario).sort();

  afterEach(() => {
    delete process.env.NOTIFICACIONES_CONFIGURABLES;
  });

  describe('los que salen siempre', () => {
    it('la devolución le llega a quien envió la actividad', async () => {
      const f = fetchOk();
      const { srv } = conBase([], { envio: [{ id: 'u-ana' }] });

      expect(await srv.despachar([devuelta])).toBe(1);
      const [aviso] = cuerpo(f);
      expect(aviso.id_usuario_destinatario).toBe('u-ana');
      expect(aviso.prioridad).toBe('Alta');
      expect(aviso.mensaje).toContain('«Falta el CDP»');
    });

    it('apagarla en la base no la apaga: la aprobación no se queda muda', async () => {
      const f = fetchOk();
      const { srv } = conBase([{ evento: 'DEVUELTA', activo: false, papeles: [], roles: [] }], {
        envio: [{ id: 'u-ana' }],
      });

      expect(await srv.despachar([devuelta])).toBe(1);
      expect(cuerpo(f)[0].id_usuario_destinatario).toBe('u-ana');
    });

    it('«quien aprueba» sale de lo configurado en la pestaña de Aprobación', async () => {
      const f = fetchOk();
      const { srv } = conBase([], {
        aprobacion: [{ modalidad: null, config: { roles: ['DIRECTOR_CONTRATACION'], personas: [] } }],
        roles: [{ id: 'u-director-2' }],
      });

      await srv.despachar([{ ...devuelta, evento: 'ENVIADA_A_APROBACION', actorId: 'u-ana' }]);
      expect(destinatarios(f)).toEqual(['u-director-2']);
    });

    it('a quien envió antes de que se guardara su cuenta también le llega', async () => {
      // Las actividades ya enviadas solo dejaron el nombre de usuario: la consulta
      // lo traduce a cuenta para que la devolución no se quede sin destinatario.
      const f = fetchOk();
      const { srv, query } = conBase([], { envio: [{ id: 'u-ana' }] });

      await srv.despachar([devuelta]);

      const sql = String(query.mock.calls.find(([s]) => String(s).includes('proceso_actividades'))?.[0]);
      expect(sql).toContain('u.username = pa.enviado_por');
      expect(cuerpo(f)[0].id_usuario_destinatario).toBe('u-ana');
    });

    it('el mismo hecho registrado dos veces avisa una sola', async () => {
      const f = fetchOk();
      const { srv } = conBase([], { envio: [{ id: 'u-ana' }] });

      await srv.despachar([devuelta, { ...devuelta }]);
      expect(f).toHaveBeenCalledTimes(1);
    });
  });

  describe('los que se configuran', () => {
    it('apagado no avisa a nadie', async () => {
      const f = fetchOk();
      const { srv } = conBase([{ evento: 'DOCUMENTO_ADJUNTO', activo: false, roles: ['DIRECTOR_CONTRATACION'] }], {
        roles: [{ id: 'u-otro' }],
      });

      expect(await srv.despachar([adjunto])).toBe(0);
      expect(f).not.toHaveBeenCalled();
    });

    it('llega a todas las personas de la dependencia elegida', async () => {
      const f = fetchOk();
      const { srv, query } = conBase([{ evento: 'DOCUMENTO_ADJUNTO', activo: true, dependencias: ['7'] }], {
        dependencia: [{ id: 'u-financiera-1' }, { id: 'u-financiera-2' }],
      });

      expect(await srv.despachar([adjunto])).toBe(2);
      expect(destinatarios(f)).toEqual(['u-financiera-1', 'u-financiera-2']);
      const llamada = query.mock.calls.find(([s]) => String(s).includes('WHERE id_dependencia::text'));
      expect(llamada?.[1]).toEqual([['7']]);
    });

    it('llega a los roles y a las personas nombradas, además de a quien corresponde', async () => {
      const f = fetchOk();
      const { srv } = conBase(
        [{ evento: 'DOCUMENTO_ADJUNTO', activo: true, roles: ['DIRECTOR_CONTRATACION'], personas: ['u-ana'] }],
        { roles: [{ id: 'u-directora' }], abogado: [{ id: 'u-abogado' }] },
      );

      await srv.despachar([adjunto]);
      expect(destinatarios(f)).toEqual(['u-abogado', 'u-ana', 'u-directora']);
    });

    it('no le avisa a quien hizo la acción aunque tenga el rol', async () => {
      const f = fetchOk();
      const { srv } = conBase([{ evento: 'DOCUMENTO_ADJUNTO', activo: true, roles: ['DIRECTOR_CONTRATACION'] }], {
        roles: [{ id: 'u-director' }],
      });

      expect(await srv.despachar([adjunto])).toBe(0);
      expect(f).not.toHaveBeenCalled();
    });
  });

  describe('a quien le toca', () => {
    it('«el supervisor del contrato» es el de la supervisión vigente de ese proceso', async () => {
      const f = fetchOk();
      const { srv, query } = conBase([], { supervisor: [{ id: 'u-supervisora' }] });

      expect(await srv.despachar([{ ...adjunto, evento: 'HABILITADA', numeral: '9.2' }])).toBe(1);
      expect(cuerpo(f)[0].id_usuario_destinatario).toBe('u-supervisora');
      const sql = String(query.mock.calls.find(([s]) => String(s).includes('supervisiones_contrato'))?.[0]);
      expect(sql).toContain("s.estado = 'VIGENTE'");
    });

    it('«el equipo financiero» son las cuentas que pueden editar la 4.2', async () => {
      // Por alcance (083) y no por `presupuesto.gestionar`: un rol creado
      // desde el backoffice con editar en la 4.2 también recibe el aviso.
      fetchOk();
      const { srv, query } = conBase([]);

      await srv.despachar([{ ...adjunto, evento: 'HABILITADA', numeral: '4.1' }]);

      const llamada = query.mock.calls.find(([s]) => String(s).includes('hiring.alcances_permiso'));
      expect(llamada?.[1]).toEqual(['editar', '4.2', 4]);
    });

    it.each([
      ['6.2', '6.2'],
      ['8.2', '8.2'],
      ['9.3', '9.3'],
      ['10.4', '10.4'],
    ])('HABILITADA en la %s llega a quien puede decidir la %s, por alcance', async (numeral, decide) => {
      fetchOk();
      const { srv, query } = conBase([]);

      await srv.despachar([{ ...adjunto, evento: 'HABILITADA', numeral }]);

      const llamada = query.mock.calls.find(([s]) => String(s).includes('hiring.alcances_permiso'));
      expect(llamada?.[1]).toEqual(['decidir', decide, Number(decide.split('.')[0])]);
    });

    // El reparto no es de ninguna etapa: sigue por el permiso transversal.
    it.each([
      ['PROCESO_RADICADO', '3.1', 'contratacion.proceso.assign'],
    ])('%s en la %s llega a las cuentas con el permiso %s, no a un rol', async (evento, numeral, permiso) => {
      fetchOk();
      const { srv, query } = conBase([], { permiso: [{ id: 'u-con-permiso' }] });

      await srv.despachar([{ ...adjunto, evento: evento as never, numeral }]);

      const llamada = query.mock.calls.find(([s]) => String(s).includes('perm.code = $1'));
      expect(llamada?.[1]).toEqual([permiso]);
      expect(query.mock.calls.some(([s]) => String(s).includes('FROM auth.user_roles') && !String(s).includes('perm.code'))).toBe(false);
    });
  });

  describe('a quien no tiene cuenta (088)', () => {
    const correosEnviados = (f: jest.Mock) =>
      f.mock.calls
        .filter(([url]) => String(url).endsWith('/api/v1/emails/send'))
        .map(([, init]) => JSON.parse(init.body));

    /** Adjuntar un documento, configurado solo para el contratista y un correo a mano. */
    const soloDeFuera = (extra: Partial<Record<string, unknown>> = {}) => ({
      evento: 'DOCUMENTO_ADJUNTO',
      activo: true,
      papeles: [],
      roles: [],
      correos_externos: ['interventoria@empresa.co'],
      al_contratista: true,
      ...extra,
    });

    it('le llega por correo al contratista del acto vigente y a los correos escritos', async () => {
      const f = fetchOk();
      const { srv } = conBase([soloDeFuera()], {
        contratista: [{ correo: 'gerencia@contratista.co' }],
      });

      expect(await srv.despachar([adjunto])).toBe(2);
      expect(correosEnviados(f).map((c) => c.to).sort()).toEqual([
        'gerencia@contratista.co',
        'interventoria@empresa.co',
      ]);
      // Sin cuenta no hay campana, y el correo no los manda a la plataforma.
      expect(f.mock.calls.some(([url]) => String(url).endsWith('/notifications/bulk'))).toBe(false);
      expect(correosEnviados(f)[0].html).not.toContain('Abrir la plataforma');
    });

    it('sin acto vigente o sin correo en él, al contratista no le llega nada', async () => {
      const f = fetchOk();
      const { srv } = conBase([soloDeFuera({ correos_externos: [] })], { contratista: [] });

      expect(await srv.despachar([adjunto])).toBe(0);
      expect(f).not.toHaveBeenCalled();
    });

    it('sale con el texto que escribió la Dirección', async () => {
      const f = fetchOk();
      const { srv } = conBase(
        [soloDeFuera({ titulo: 'Nuevo soporte en {proceso}', mensaje: '{quien} adjuntó un documento en {actividad}.' })],
        { contratista: [] },
      );

      await srv.despachar([adjunto]);

      const [correo] = correosEnviados(f);
      expect(correo.subject).toBe('ESAP · Nuevo soporte en CTO-1');
      expect(correo.text).toBe('director@esap.edu.co adjuntó un documento en 3.2 · Revisión y reparto.');
    });
  });

  describe('por correo', () => {
    const llamadasA = (f: jest.Mock, ruta: string) => f.mock.calls.filter(([url]) => String(url).endsWith(ruta));

    it('con el correo de la actividad encendido, el aviso llega también al correo', async () => {
      const f = fetchOk();
      const { srv } = conBase([], {
        envio: [{ id: 'u-ana' }],
        correos: [{ id: 'u-ana', correo: 'ana@esap.edu.co' }],
      });

      await srv.despachar([devuelta]);

      const [correo] = llamadasA(f, '/api/v1/emails/send');
      const cuerpoCorreo = JSON.parse(correo[1].body);
      expect(cuerpoCorreo.to).toBe('ana@esap.edu.co');
      expect(cuerpoCorreo.subject).toBe('Contratación · Te devolvieron una actividad');
      expect(cuerpoCorreo.text).toContain('«Falta el CDP»');
    });

    it('con el correo apagado, solo la campana', async () => {
      const f = fetchOk();
      const { srv } = conBase([], {
        envio: [{ id: 'u-ana' }],
        porCorreo: [{ avisos_por_correo: false }],
        correos: [{ id: 'u-ana', correo: 'ana@esap.edu.co' }],
      });

      await srv.despachar([devuelta]);

      expect(llamadasA(f, '/notifications/bulk')).toHaveLength(1);
      expect(llamadasA(f, '/api/v1/emails/send')).toHaveLength(0);
    });

    it('quien no tiene correo recibe la campana igual', async () => {
      const f = fetchOk();
      const { srv } = conBase([], { envio: [{ id: 'u-ana' }], correos: [] });

      expect(await srv.despachar([devuelta])).toBe(1);
      expect(llamadasA(f, '/api/v1/emails/send')).toHaveLength(0);
    });
  });

  it('con el interruptor general apagado no hace nada', async () => {
    process.env.NOTIFICACIONES_CONFIGURABLES = 'false';
    const f = fetchOk();
    const { srv, query } = conBase([]);

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
