import { NotificationClientService } from './notification-client.service';

/**
 * EFDS-2406: cada campana de Viáticos llega con `modulo: 'viaticos'`, cada
 * correo con evento lleva también el módulo, y el respaldo que inserta directo
 * cuando notifications-service no responde obedece la misma configuración.
 */
describe('NotificationClientService (Viáticos) - configuración de notificaciones', () => {
  const originalFetch = global.fetch;
  const dto = { id_usuario_destinatario: 'u1', tipo_notificacion: 'VIATICOS_RADICADA', titulo: 'Radicada', mensaje: 'M' };

  function armar(opciones: { http?: boolean; configuracion?: any } = {}) {
    const posts: Array<{ url: string; body: any }> = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => {
      posts.push({ url, body: JSON.parse(init.body) });
      return { ok: opciones.http !== false, status: opciones.http === false ? 503 : 201 };
    });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('modulo_notificacion')) return opciones.configuracion ? [opciones.configuracion] : [];
      return [];
    });
    return { service: new NotificationClientService({ query } as any), posts, query };
  }

  afterEach(() => {
    (global as any).fetch = originalFetch;
  });

  it('send, sendMany y los correos con evento llevan el módulo; un correo sin evento no', async () => {
    const { service, posts } = armar();
    await service.send(dto);
    await service.sendMany([dto]);
    await service.sendEmail({ to: 'a@esap.edu.co', subject: 'S', html: '<p>x</p>', evento: 'VIATICOS_RADICADA' });
    await service.sendEmail({ to: 'b@esap.edu.co', subject: 'S', html: '<p>x</p>' });
    expect(posts[0].body).toEqual({ ...dto, modulo: 'viaticos' });
    expect(posts[1].body).toEqual({ notifications: [{ ...dto, modulo: 'viaticos' }] });
    expect(posts[2].body).toEqual({ to: 'a@esap.edu.co', subject: 'S', html: '<p>x</p>', evento: 'VIATICOS_RADICADA', modulo: 'viaticos' });
    expect(posts[3].body).toEqual({ to: 'b@esap.edu.co', subject: 'S', html: '<p>x</p>' });
  });

  it('respaldo directo (send y sendMany): sin configuración inserta; módulo apagado registra la omisión', async () => {
    const libre = armar({ http: false });
    await libre.service.send(dto);
    await libre.service.sendMany([dto]);
    expect(libre.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO notifications.notificacion'))).toHaveLength(2);

    const apagado = armar({ http: false, configuracion: { modulo_activo: false, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null } });
    await apagado.service.send(dto);
    await apagado.service.sendMany([dto]);
    expect(apagado.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(false);
    const omisiones = apagado.query.mock.calls.filter(([sql]) => sql.includes('envio_omitido'));
    expect(omisiones).toHaveLength(2);
    expect(omisiones[0][1]).toEqual(['viaticos', 'VIATICOS_RADICADA', 'u1', 'modulo_inactivo', 'Radicada']);
  });

  it('respaldo directo: obligatorio pasa aunque todo esté apagado, con la prioridad de la consola', async () => {
    const { service, query } = armar({ http: false, configuracion: { modulo_activo: false, evento_activo: false, obligatorio: true, canal: 'ambos', prioridad: 'Alta' } });
    await service.send(dto);
    const insert = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO notifications.notificacion'));
    expect(insert?.[1][7]).toBe('Alta');
  });
});
