import { NotificationClientService } from './notification-client.service';

/**
 * EFDS-2406: los avisos de Infraestructura llegan con `modulo` y los correos con
 * `evento`; y cuando notifications-service no responde, el respaldo que inserta
 * directo en la base obedece la misma configuración.
 */
describe('NotificationClientService - configuración de notificaciones', () => {
  const dto = {
    id_usuario_destinatario: 'u1',
    tipo_notificacion: 'SOLICITUD_RADICADA',
    titulo: 'Solicitud radicada',
    mensaje: 'Se radicó la solicitud',
    categoria: 'UMI-MANTENIMIENTO',
    prioridad: 'Media' as const,
  };

  function armar(opciones: { http?: boolean; configuracion?: any; usuarios?: any[]; fallaAdicionales?: boolean } = {}) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('cardinality')) {
        if (opciones.fallaAdicionales) throw new Error('columna inexistente');
        return opciones.usuarios ?? [];
      }
      if (sql.includes('modulo_notificacion')) return opciones.configuracion ? [opciones.configuracion] : [];
      return [];
    });
    const service = new NotificationClientService({ query } as any);
    const posts: Array<{ url: string; body: any }> = [];
    jest.spyOn(service as any, 'httpPostJson').mockImplementation(async (url: string, body: any) => {
      posts.push({ url, body });
      return { ok: opciones.http !== false, status: opciones.http === false ? null : 201 };
    });
    jest.spyOn(service, 'getUserDetailsById').mockResolvedValue({ id_user: 'u1', email: 'u1@esap.edu.co' });
    return { service, query, posts };
  }

  afterEach(() => jest.restoreAllMocks());

  it('cada notificación sale con modulo gestion-infraestructura y el correo con el mismo evento', async () => {
    const { service, posts } = armar();
    await service.notifyUserById('u1', dto, { subject: 'Asunto', html: '<p>Hola</p>' });
    expect(posts[0].url).toContain('/notifications/bulk');
    expect(posts[0].body.notifications[0]).toMatchObject({ tipo_notificacion: 'SOLICITUD_RADICADA', modulo: 'gestion-infraestructura' });
    expect(posts[1].url).toContain('/emails/send');
    expect(posts[1].body).toMatchObject({ to: 'u1@esap.edu.co', modulo: 'gestion-infraestructura', evento: 'SOLICITUD_RADICADA' });
  });

  it('un correo sin evento sale sin identidad, como correo del sistema', async () => {
    const { service, posts } = armar();
    await service.sendEmail('x@esap.edu.co', 'Asunto', '<p>Hola</p>');
    expect(posts[0].body).toEqual({ to: 'x@esap.edu.co', subject: 'Asunto', html: '<p>Hola</p>' });
  });

  it('respaldo directo: sin configuración, inserta como siempre', async () => {
    const { service, query } = armar({ http: false });
    await service.send(dto);
    const inserts = query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO notifications.notificacion'));
    expect(inserts).toHaveLength(1);
    expect(inserts[0][1][7]).toBe('Media');
  });

  it('respaldo directo: con el módulo apagado no inserta y deja la omisión registrada', async () => {
    const { service, query } = armar({ http: false, configuracion: { modulo_activo: false, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null } });
    await service.send(dto);
    const sqls = query.mock.calls.map(([sql]) => sql);
    expect(sqls.some((s) => s.includes('INSERT INTO notifications.notificacion'))).toBe(false);
    const omision = query.mock.calls.find(([sql]) => sql.includes('envio_omitido'));
    expect(omision?.[1]).toEqual(['gestion-infraestructura', 'SOLICITUD_RADICADA', 'u1', 'modulo_inactivo', 'Solicitud radicada']);
  });

  it('respaldo directo: evento apagado o solo de correo se omite; obligatorio pasa con la prioridad de la consola', async () => {
    const apagado = armar({ http: false, configuracion: { modulo_activo: true, evento_activo: false, obligatorio: false, canal: 'ambos', prioridad: null } });
    await apagado.service.send(dto);
    expect(apagado.query.mock.calls.find(([sql]) => sql.includes('envio_omitido'))?.[1][3]).toBe('evento_inactivo');

    const soloCorreo = armar({ http: false, configuracion: { modulo_activo: true, evento_activo: true, obligatorio: false, canal: 'correo', prioridad: null } });
    await soloCorreo.service.send(dto);
    expect(soloCorreo.query.mock.calls.find(([sql]) => sql.includes('envio_omitido'))?.[1][3]).toBe('canal_solo_correo');

    const obligatorio = armar({ http: false, configuracion: { modulo_activo: false, evento_activo: false, obligatorio: true, canal: 'ambos', prioridad: 'Crítica' } });
    await obligatorio.service.send(dto);
    const insert = obligatorio.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO notifications.notificacion'));
    expect(insert?.[1][7]).toBe('Crítica');
  });

  it('respaldo directo: si leer la configuración falla, inserta igual', async () => {
    const { service } = armar({ http: false });
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('modulo_notificacion')) throw new Error('no existe la tabla');
      return [];
    });
    (service as any).dataSource = { query };
    await service.send(dto);
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(true);
  });

  describe('respaldo directo: destinatarios adicionales del aviso (EFDS-2406, función 4)', () => {
    const conAdicionales = { modulo_activo: true, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null, roles_adicionales: ['JEFE'], dependencias_adicionales: [], sedes_adicionales: [] };
    const copias = (query: jest.Mock) =>
      query.mock.calls.filter(([sql]) => sql.includes('ON CONFLICT (id_notificacion)'));

    it('inserta una copia por cada adicional con id determinista, sin repetir al destinatario original', async () => {
      const x = armar({ http: false, configuracion: conAdicionales, usuarios: [{ id_user: 'u1' }, { id_user: 'u2' }, { id_user: 'u3' }] });
      await x.service.send(dto);
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
      await x.service.send(dto);
      expect(x.query.mock.calls.some(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(false);
      expect(x.query.mock.calls.some(([sql]: [string]) => sql.includes('cardinality'))).toBe(false);
    });

    it('si falla la consulta de adicionales, la campana original igual se inserta', async () => {
      const x = armar({ http: false, configuracion: conAdicionales, fallaAdicionales: true });
      await x.service.send(dto);
      const inserts = x.query.mock.calls.filter(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'));
      expect(inserts).toHaveLength(1);
      expect(copias(x.query)).toHaveLength(0);
    });
  });
});
