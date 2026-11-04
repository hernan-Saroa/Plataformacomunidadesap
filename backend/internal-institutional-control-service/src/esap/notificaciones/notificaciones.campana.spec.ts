import { NotificacionesService } from './notificaciones.service';

/**
 * EFDS-2406: la campana global ya no se escribe directo. Pasa por
 * notifications-service con el código EVT real, modulo 'control-interno' y la
 * prioridad real; si el servicio no responde, inserta directo pero obedeciendo
 * la configuración de notificaciones.
 */
describe('NotificacionesService (Control Interno) · campana global', () => {
  const originalFetch = global.fetch;
  const aviso = {
    id_usuario_destinatario: 'u1',
    tipo_notificacion: 'EVT-AUD-001',
    titulo: 'Anuncio',
    mensaje: 'M',
    prioridad: 'Alta',
    tiene_accion: true,
    url_accion: '/control-interno/auditorias/1',
    color: 'blue',
    modulo: 'control-interno',
    datos_adicionales: { eventoCode: 'EVT-AUD-001', tipo: 'anuncio_auditoria' },
  };

  function armar(opciones: { http?: boolean; configuracion?: any } = {}) {
    const posts: any[] = [];
    global.fetch = jest.fn(async (url: string, init: any) => {
      posts.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: opciones.http !== false, status: opciones.http === false ? 503 : 201 };
    }) as never;
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('modulo_notificacion')) return opciones.configuracion ? [opciones.configuracion] : [];
      return [];
    });
    const configService = { get: jest.fn((k: string, d?: string) => (k === 'NOTIFICATIONS_SERVICE_URL' ? 'http://notif:3009' : d)) };
    const service = new NotificacionesService({} as any, {} as any, { query } as any, configService as any);
    return { service: service as any, posts, query };
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('publica en notifications-service con el código EVT, el módulo y la prioridad real; no inserta directo', async () => {
    const { service, posts, query } = armar();
    await service.publicarEnCampana(aviso);
    expect(posts[0].url).toBe('http://notif:3009/notifications');
    expect(posts[0].body).toMatchObject({ tipo_notificacion: 'EVT-AUD-001', modulo: 'control-interno', prioridad: 'Alta' });
    expect(query).not.toHaveBeenCalled();
  });

  it('si el servicio no responde, inserta directo con el código EVT y la prioridad real', async () => {
    const { service, query } = armar({ http: false });
    await service.publicarEnCampana(aviso);
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO notifications.notificacion'));
    expect(insert?.[1].slice(0, 5)).toEqual(['u1', 'EVT-AUD-001', 'Anuncio', 'M', 'Alta']);
  });

  it('el respaldo directo obedece la configuración: módulo apagado registra la omisión y no inserta', async () => {
    const { service, query } = armar({ http: false, configuracion: { modulo_activo: false, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null } });
    await service.publicarEnCampana(aviso);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(false);
    expect(query.mock.calls.find(([sql]) => sql.includes('envio_omitido'))?.[1]).toEqual(['control-interno', 'EVT-AUD-001', 'u1', 'modulo_inactivo', 'Anuncio']);
  });

  it('obligatorio pasa aunque esté apagado, con la prioridad de la consola', async () => {
    const { service, query } = armar({ http: false, configuracion: { modulo_activo: false, evento_activo: false, obligatorio: true, canal: 'ambos', prioridad: 'Crítica' } });
    await service.publicarEnCampana(aviso);
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO notifications.notificacion'));
    expect(insert?.[1][4]).toBe('Crítica');
  });

  describe('campana y correo salen con la misma clave de evento', () => {
    function armarCreate() {
      const posts: any[] = [];
      global.fetch = jest.fn(async (url: string, init: any) => {
        posts.push({ url: String(url), body: JSON.parse(init.body) });
        return { ok: true, status: 201, text: async () => '' };
      }) as never;
      const repo = {
        create: jest.fn((x: any) => x),
        findOne: jest.fn(async () => null),
        save: jest.fn(async (x: any) => ({ id: 'n1', ...x })),
      };
      const configService = { get: jest.fn((k: string, d?: string) => (k === 'NOTIFICATIONS_SERVICE_URL' ? 'http://notif:3009' : d)) };
      const service: any = new NotificacionesService(repo as any, repo as any, { query: jest.fn(async () => []) } as any, configService as any);
      // El envío real elige destinatario por preferencias; aquí solo importa el cuerpo del correo.
      service.enviarNotificacion = (n: any) => service.enviarCorreoReal(n, 'dest@esap.edu.co');
      return { service, posts };
    }

    it.each([
      ['recordatorio_plazo', 'EVT-AUD-003'],
      ['aprobacion_plan', 'EVT-APR-001'],
      ['rechazo_plan', 'EVT-APR-002'],
    ])('%s: campana y correo llevan %s', async (tipo, codigo) => {
      const { service, posts } = armarCreate();
      await service.create({ usuarioId: 'u1', tipoNotificacion: tipo, titulo: 'T', mensaje: 'M' });
      const campana = posts.find((p) => p.url.endsWith('/notifications'));
      const correo = posts.find((p) => p.url.endsWith('/api/v1/emails/send'));
      expect(campana.body.tipo_notificacion).toBe(codigo);
      expect(correo.body.evento).toBe(codigo);
      expect(correo.body.evento).toBe(campana.body.tipo_notificacion);
    });

    it('si el creador pasa metadata.eventoCode, ambos canales lo respetan', async () => {
      const { service, posts } = armarCreate();
      await service.create({ usuarioId: 'u1', tipoNotificacion: 'recordatorio_plazo', titulo: 'T', mensaje: 'M', metadata: { eventoCode: 'EVT-XYZ-009' } });
      expect(posts.find((p) => p.url.endsWith('/notifications')).body.tipo_notificacion).toBe('EVT-XYZ-009');
      expect(posts.find((p) => p.url.endsWith('/api/v1/emails/send')).body.evento).toBe('EVT-XYZ-009');
    });
  });
});
