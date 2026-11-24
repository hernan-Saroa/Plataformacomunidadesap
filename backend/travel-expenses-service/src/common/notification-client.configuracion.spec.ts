import { NotificationClientService } from './notification-client.service';

/**
 * EFDS-2406: cada campana de Viáticos llega con `modulo: 'viaticos'`, cada
 * correo con evento lleva también el módulo, y el respaldo que inserta directo
 * cuando notifications-service no responde obedece la misma configuración.
 */
describe('NotificationClientService (Viáticos) - configuración de notificaciones', () => {
  const originalFetch = global.fetch;
  const dto = { id_usuario_destinatario: 'u1', tipo_notificacion: 'VIATICOS_RADICADA', titulo: 'Radicada', mensaje: 'M' };

  function armar(opciones: { http?: boolean; configuracion?: any; usuarios?: any[]; fallaAdicionales?: boolean } = {}) {
    const posts: Array<{ url: string; body: any }> = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => {
      posts.push({ url, body: JSON.parse(init.body) });
      return { ok: opciones.http !== false, status: opciones.http === false ? 503 : 201 };
    });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('cardinality')) {
        if (opciones.fallaAdicionales) throw new Error('columna inexistente');
        return opciones.usuarios ?? [];
      }
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

  describe('respaldo directo: destinatarios adicionales del aviso (EFDS-2406, función 4)', () => {
    const conAdicionales = { modulo_activo: true, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null, roles_adicionales: ['JEFE'], dependencias_adicionales: [], sedes_adicionales: [] };
    const copias = (query: jest.Mock) =>
      query.mock.calls.filter(([sql]) => sql.includes('ON CONFLICT (id_notificacion)'));

    it('inserta una copia por cada adicional con id determinista, sin repetir al destinatario original', async () => {
      const x = armar({ http: false, configuracion: conAdicionales, usuarios: [{ id_user: 'u1' }, { id_user: 'u2' }, { id_user: 'u3' }] });
      await x.service.sendMany([dto]);
      const inserts = x.query.mock.calls.filter(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'));
      // La campana original + una copia por u2 y u3; u1 ya la recibió.
      expect(inserts).toHaveLength(3);
      const sinCopia = inserts.filter(([sql]: [string]) => !sql.includes('ON CONFLICT'));
      expect(sinCopia).toHaveLength(1);
      const destinos = copias(x.query).map(([, p]: any) => p[1]);
      expect(destinos).toEqual(['u2', 'u3']);
      const ids = copias(x.query).map(([, p]: any) => p[0]);
      expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('con el aviso apagado no inserta nada, ni copias', async () => {
      const x = armar({ http: false, configuracion: { ...conAdicionales, evento_activo: false }, usuarios: [{ id_user: 'u2' }] });
      await x.service.sendMany([dto]);
      expect(x.query.mock.calls.some(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(false);
      expect(x.query.mock.calls.some(([sql]: [string]) => sql.includes('cardinality'))).toBe(false);
    });

    it('si falla la consulta de adicionales, la campana original igual se inserta', async () => {
      const x = armar({ http: false, configuracion: conAdicionales, fallaAdicionales: true });
      await x.service.sendMany([dto]);
      const inserts = x.query.mock.calls.filter(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'));
      expect(inserts).toHaveLength(1);
      expect(copias(x.query)).toHaveLength(0);
    });
  });
});
