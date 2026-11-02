import axios from 'axios';
import { NotificationClientService } from './notification-client.service';

/**
 * EFDS-2406: cada campana de Gestión Legal llega con `modulo: 'gestion-legal'`,
 * cada correo con `evento`, y el respaldo que inserta directo cuando
 * notifications-service no responde obedece la misma configuración.
 */
describe('NotificationClientService (Legal) - configuración de notificaciones', () => {
  const dto = { id_usuario_destinatario: 'u1', tipo_notificacion: 'PROCESO_ASIGNADO', titulo: 'Proceso', mensaje: 'M' };

  function armar(configuracion?: any) {
    const query = jest.fn(async (sql: string) => {
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
});
