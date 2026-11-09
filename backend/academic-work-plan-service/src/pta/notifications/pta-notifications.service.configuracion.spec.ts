import { PtaNotificationsService } from './pta-notifications.service';

/**
 * EFDS-2406: cada aviso de PTA llega a notifications-service con `modulo: 'pta'`
 * y cada correo con `evento` igual a la clave de su campana, para que la
 * configuración de notificaciones pueda apagarlos por módulo y por evento.
 */
describe('PtaNotificationsService - identidad para la configuración de notificaciones', () => {
  const originalFetch = global.fetch;
  const usuario = { id_user: 'docente-1', email: 'docente@esap.edu.co', nombre: 'Docente Prueba' };

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function armar() {
    const dataSource = { query: jest.fn().mockResolvedValue([usuario]) };
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    (global as any).fetch = fetchMock;
    const service = new PtaNotificationsService(dataSource as any);
    const llamadas = () => fetchMock.mock.calls.map(([url, req]) => ({ url: String(url), body: JSON.parse(req.body) }));
    return { service, llamadas };
  }

  const esperarCorreos = async () => new Promise((r) => setImmediate(r));

  it('la aprobación de un componente: campana con módulo y correo con el mismo evento', async () => {
    const { service, llamadas } = armar();
    await service.notifyProfesorComponenteAprobado({ ptaId: 'pta-1', docenteId: 'docente-1', componente: 'docencia' });
    await esperarCorreos();
    const [campana, correo] = llamadas();
    expect(campana.url).toContain('/notifications');
    expect(campana.body).toMatchObject({ tipo_notificacion: 'pta_componente_aprobado', categoria: 'PTA', modulo: 'pta' });
    expect(correo.url).toContain('/api/v1/emails/send');
    expect(correo.body).toMatchObject({ to: 'docente@esap.edu.co', modulo: 'pta', evento: 'pta_componente_aprobado' });
  });

  it('la devolución, el envío a aprobación y la decisión de edición llevan su propio evento', async () => {
    const { service, llamadas } = armar();
    await service.notifyProfesorComponenteDevuelto({ ptaId: 'pta-1', docenteId: 'docente-1', componente: 'docencia' } as any);
    await service.notifyProfesorPtaEnviadoAprobacion({ ptaId: 'pta-1', docenteId: 'docente-1' });
    await service.notifyProfesorSolicitudEdicionResuelta({ solicitudId: 's1', ptaId: 'pta-1', docenteId: 'docente-1', decision: 'denegado' });
    await esperarCorreos();
    const correos = llamadas().filter((l) => l.url.includes('/emails/send')).map((l) => l.body.evento);
    expect(correos).toEqual(['pta_componente_devuelto', 'pta_enviado_aprobacion', 'pta_solicitud_edicion_rechazo']);
    const campanas = llamadas().filter((l) => l.url.endsWith('/notifications')).map((l) => l.body.modulo);
    expect(campanas).toEqual(['pta', 'pta', 'pta']);
  });

  it('el aviso masivo a los aprobadores va con módulo en cada notificación', async () => {
    const { service, llamadas } = armar();
    await service.notifyApproversPtaEnRevision({ ptaId: 'pta-1', componentes: ['academica_pregrado'] });
    await esperarCorreos();
    const bulk = llamadas().find((l) => l.url.endsWith('/notifications/bulk'));
    expect(bulk?.body.notifications[0]).toMatchObject({ tipo_notificacion: 'pta_pendiente_aprobacion', modulo: 'pta' });
    expect(llamadas().find((l) => l.url.includes('/emails/send'))?.body.evento).toBe('pta_pendiente_aprobacion');
  });

  it('el acceso externo al Macro Docente es solo correo, con su evento', async () => {
    const { service, llamadas } = armar();
    await service.notifyAccesoExternoOtorgado({ enteNombre: 'Ente', enteContacto: 'ente@gob.co', path: '/x', fechaFin: new Date() });
    expect(llamadas()).toHaveLength(1);
    expect(llamadas()[0].body).toMatchObject({ modulo: 'pta', evento: 'pta_acceso_externo_otorgado' });
  });
});
