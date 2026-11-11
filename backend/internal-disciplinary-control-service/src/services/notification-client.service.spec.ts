import axios from 'axios';
import { of } from 'rxjs';
import { DisciplinaryEmailService } from './disciplinary-email.service';
import { NotificationClientService } from './notification-client.service';

/**
 * EFDS-2406: cada campana de Control Disciplinario llega a notifications-service
 * con `modulo: 'control-disciplinario'` y cada correo con el `evento` que la
 * configuración de notificaciones usa para apagarlo.
 */
describe('Control Disciplinario - identidad para la configuración de notificaciones', () => {
  afterEach(() => jest.restoreAllMocks());

  const dto = { id_usuario_destinatario: 'u1', tipo_notificacion: 'PROCESO_ASIGNADO', titulo: 'T', mensaje: 'M' };

  it('send y sendMany agregan el módulo sin tocar lo demás', async () => {
    const post = jest.spyOn(axios, 'post').mockResolvedValue({ data: {} });
    const client = new NotificationClientService();
    await client.send(dto);
    await client.sendMany([dto, { ...dto, modulo: 'otro' }]);
    expect(post.mock.calls[0][1]).toEqual({ ...dto, modulo: 'control-disciplinario' });
    expect(post.mock.calls[1][1]).toEqual({ notifications: [{ ...dto, modulo: 'control-disciplinario' }, { ...dto, modulo: 'otro' }] });
  });

  it('los correos de reasignación y el genérico llevan su evento; sin evento es correo del sistema', async () => {
    const post = jest.fn().mockReturnValue(of({ data: {} }));
    const service = new DisciplinaryEmailService({ post } as any);
    await service.sendReassignmentEmail('a@esap.edu.co', 'Ana', 'RAD-1', 'Jefe', 'Just.');
    await service.sendReassignedFromEmail('b@esap.edu.co', 'Beto', 'RAD-1', 'Jefe', 'Just.');
    await service.sendEmail('c@esap.edu.co', 'Asunto', '<p>x</p>', 'texto', 'REASIGNACION_APROBADA');
    await service.sendEmail('d@esap.edu.co', 'Asunto', '<p>x</p>');
    const cuerpos = post.mock.calls.map((c) => c[1]);
    expect(cuerpos[0]).toMatchObject({ to: 'a@esap.edu.co', modulo: 'control-disciplinario', evento: 'PROCESO_REASIGNADO' });
    expect(cuerpos[1]).toMatchObject({ to: 'b@esap.edu.co', modulo: 'control-disciplinario', evento: 'PROCESO_REASIGNADO_ANTERIOR' });
    expect(cuerpos[2]).toMatchObject({ to: 'c@esap.edu.co', text: 'texto', modulo: 'control-disciplinario', evento: 'REASIGNACION_APROBADA' });
    expect(cuerpos[3]).toEqual({ to: 'd@esap.edu.co', subject: 'Asunto', html: '<p>x</p>' });
  });

  it('el aviso masivo por correo reparte el mismo evento a cada destinatario', async () => {
    const post = jest.fn().mockReturnValue(of({ data: {} }));
    const service = new DisciplinaryEmailService({ post } as any);
    await service.sendBulkNotification(
      [{ email: 'a@esap.edu.co' }, { email: '' }, { email: 'b@esap.edu.co' }],
      'Asunto', 'Título', 'Mensaje', [], 'Aviso', '#003DA5', undefined, 'REASIGNACION_RECHAZADA',
    );
    expect(post.mock.calls.map((c) => [c[1].to, c[1].evento])).toEqual([
      ['a@esap.edu.co', 'REASIGNACION_RECHAZADA'],
      ['b@esap.edu.co', 'REASIGNACION_RECHAZADA'],
    ]);
  });
});
