import { Logger } from '@nestjs/common';
import { Campana } from './campana';

/**
 * EFDS-2406: cada aviso de Contratación llega a notifications-service con
 * `modulo: 'contratacion'` y cada correo con el `evento` de su campana, para
 * que la consola central pueda apagarlos además de la configuración propia de
 * las actividades.
 */
describe('Campana · identidad para la configuración de notificaciones', () => {
  const originalFetch = global.fetch;
  const aviso = { id_usuario_destinatario: 'u1', tipo_notificacion: 'contratacion_devolucion', titulo: 'T', mensaje: 'M' };

  function armar() {
    const posts: Array<{ url: string; body: any }> = [];
    global.fetch = jest.fn(async (url: string, init: any) => {
      posts.push({ url: String(url), body: JSON.parse(init.body) });
      return { ok: true, status: 201 };
    }) as never;
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('dir_email')) return [{ id: 'u1', correo: 'u1@esap.edu.co' }];
      return [];
    });
    return { campana: new Campana({ query } as any, new Logger('prueba')), posts };
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('la campana lleva el módulo y el correo del mismo aviso lleva el evento', async () => {
    const { campana, posts } = armar();
    const r = await campana.enviar([aviso], { porCorreo: true });
    expect(r).toEqual({ enviados: 1, repetidos: 0, correos: 1 });
    expect(posts[0].url).toContain('/notifications/bulk');
    expect(posts[0].body.notifications[0]).toMatchObject({ ...aviso, modulo: 'contratacion' });
    expect(posts[1].url).toContain('/emails/send');
    expect(posts[1].body).toMatchObject({ to: 'u1@esap.edu.co', modulo: 'contratacion', evento: 'contratacion_devolucion' });
  });

  it('los correos externos y los de adjuntos llevan el evento cuando se les da, y nada cuando no', async () => {
    const { campana, posts } = armar();
    await campana.aCorreosExternos(['ext@gob.co'], { titulo: 'T', mensaje: 'M' }, 'contratacion_adjudicacion_al_adjudicatario');
    await campana.aCorreosExternos(['otro@gob.co'], { titulo: 'T', mensaje: 'M' });
    await campana.correoConAdjuntos('s@esap.edu.co', { titulo: 'T', mensaje: 'M' }, [], 'contratacion_designacion_supervisor');
    expect(posts[0].body).toMatchObject({ to: 'ext@gob.co', modulo: 'contratacion', evento: 'contratacion_adjudicacion_al_adjudicatario' });
    expect(posts[1].body).not.toHaveProperty('evento');
    expect(posts[1].body).not.toHaveProperty('modulo');
    expect(posts[2].body).toMatchObject({ to: 's@esap.edu.co', attachments: [], modulo: 'contratacion', evento: 'contratacion_designacion_supervisor' });
  });
});
