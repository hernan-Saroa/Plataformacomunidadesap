import axios from 'axios';
import { NotificationClientService } from './notification-client.service';

/**
 * EFDS-2406: cada campana de Gestión Legal llega con `modulo: 'gestion-legal'`,
 * cada correo con `evento`, y el respaldo que inserta directo cuando
 * notifications-service no responde obedece la misma configuración.
 */
describe('NotificationClientService (Legal) - configuración de notificaciones', () => {
  const dto = { id_usuario_destinatario: 'u1', tipo_notificacion: 'PROCESO_ASIGNADO', titulo: 'Proceso', mensaje: 'M' };

  function armar(configuracion?: any, extra: { usuarios?: any[]; fallaAdicionales?: boolean } = {}) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('cardinality')) {
        if (extra.fallaAdicionales) throw new Error('columna inexistente');
        return extra.usuarios ?? [];
      }
      if (sql.includes('modulo_notificacion')) return configuracion ? [configuracion] : [];
      if (sql.includes('FROM auth.role')) return [{ id_user: 'u1', email: 'u1@esap.edu.co' }];
      return [];
    });
    return { service: new NotificationClientService({ query } as any), query };
  }

  afterEach(() => jest.restoreAllMocks());

  it('send y sendMany agregan el módulo; el correo lleva el evento solo cuando se le da', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const { service } = armar();
    await service.send(dto);
    await service.sendMany([dto]);
    await service.sendEmail('a@esap.edu.co', 'Asunto', '<p>x</p>', 'PROCESO_ASIGNADO');
    await service.sendEmail('b@esap.edu.co', 'Asunto', '<p>x</p>');
    expect(post.mock.calls[0][1]).toEqual({ ...dto, modulo: 'gestion-legal' });
    expect(post.mock.calls[1][1]).toEqual({ notifications: [{ ...dto, modulo: 'gestion-legal' }] });
    expect(post.mock.calls[2][1]).toEqual({ to: 'a@esap.edu.co', subject: 'Asunto', html: '<p>x</p>', modulo: 'gestion-legal', evento: 'PROCESO_ASIGNADO' });
    expect(post.mock.calls[3][1]).toEqual({ to: 'b@esap.edu.co', subject: 'Asunto', html: '<p>x</p>' });
  });

  it('notifyByRoles con correo usa el evento de la campana para el correo', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const { service } = armar();
    await service.notifyByRoles(['JEFE_GESTION_LEGAL'], { tipo_notificacion: 'PROCESO_CREADO', titulo: 'T', mensaje: 'M' }, { subject: 'S', html: '<p>x</p>' });
    const correo = post.mock.calls.find(([url]) => String(url).includes('/emails/send'));
    expect(correo?.[1]).toMatchObject({ to: 'u1@esap.edu.co', modulo: 'gestion-legal', evento: 'PROCESO_CREADO' });
  });

  it('respaldo directo: sin configuración inserta; con el módulo apagado registra la omisión y no inserta', async () => {
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('ECONNREFUSED'));

    const libre = armar();
    await libre.service.sendMany([dto]);
    expect(libre.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(true);

    const apagado = armar({ modulo_activo: false, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null });
    await apagado.service.sendMany([dto]);
    expect(apagado.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(false);
    expect(apagado.query.mock.calls.find(([sql]) => sql.includes('envio_omitido'))?.[1]).toEqual(['gestion-legal', 'PROCESO_ASIGNADO', 'u1', 'modulo_inactivo', 'Proceso']);

    const obligatorio = armar({ modulo_activo: false, evento_activo: false, obligatorio: true, canal: 'ambos', prioridad: 'Alta' });
    await obligatorio.service.sendMany([dto]);
    const insert = obligatorio.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO notifications.notificacion'));
    expect(insert?.[1][7]).toBe('Alta');
  });

  describe('respaldo directo: destinatarios adicionales del aviso (EFDS-2406, función 4)', () => {
    const conAdicionales = { modulo_activo: true, evento_activo: true, obligatorio: false, canal: 'ambos', prioridad: null, roles_adicionales: ['JEFE'], dependencias_adicionales: [], sedes_adicionales: [] };
    const copias = (query: jest.Mock) =>
      query.mock.calls.filter(([sql]) => sql.includes('ON CONFLICT (id_notificacion)'));

    beforeEach(() => jest.spyOn(axios, 'post').mockRejectedValue(new Error('ECONNREFUSED')));

    it('inserta una copia por cada adicional con id determinista, sin repetir al destinatario original', async () => {
      const x = armar(conAdicionales, { usuarios: [{ id_user: 'u1' }, { id_user: 'u2' }, { id_user: 'u3' }] });
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
      const x = armar({ ...conAdicionales, evento_activo: false }, { usuarios: [{ id_user: 'u2' }] });
      await x.service.sendMany([dto]);
      expect(x.query.mock.calls.some(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'))).toBe(false);
      expect(x.query.mock.calls.some(([sql]: [string]) => sql.includes('cardinality'))).toBe(false);
    });

    it('si falla la consulta de adicionales, la campana original igual se inserta', async () => {
      const x = armar(conAdicionales, { fallaAdicionales: true });
      await x.service.sendMany([dto]);
      const inserts = x.query.mock.calls.filter(([sql]: [string]) => sql.includes('INSERT INTO notifications.notificacion'));
      expect(inserts).toHaveLength(1);
      expect(copias(x.query)).toHaveLength(0);
    });
  });
});
