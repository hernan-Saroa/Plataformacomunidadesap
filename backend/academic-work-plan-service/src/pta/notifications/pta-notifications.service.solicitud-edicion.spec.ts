import { PtaNotificationsService } from './pta-notifications.service';

describe('PtaNotificationsService - resolución de edición PTA', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it.each([
    {
      decision: 'aprobado' as const,
      tipo: 'pta_solicitud_edicion_aprobacion',
      titulo: 'Solicitud de edición del PTA aprobada',
    },
    {
      decision: 'denegado' as const,
      tipo: 'pta_solicitud_edicion_rechazo',
      titulo: 'Solicitud de edición del PTA rechazada',
    },
  ])('persiste en la campana la decisión $decision con responsable y motivo', async ({
    decision,
    tipo,
    titulo,
  }) => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{
        id_user: 'usuario-docente-1',
        email: null,
        nombre: 'Docente Prueba',
      }]),
    };
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 201 });
    (global as any).fetch = fetchMock;
    const service = new PtaNotificationsService(dataSource as any);

    await expect(service.notifyProfesorSolicitudEdicionResuelta({
      solicitudId: 'solicitud-1',
      ptaId: 'pta-1',
      docenteId: 'docente-1',
      decision,
      componentes: ['docencia', 'extension'],
      resueltoPor: 'Ana Administradora',
      resueltoPorRol: 'SUPER_ADMIN',
      motivo: 'Se revisaron los soportes y se tomó la decisión.',
      periodo: '2026-2',
    })).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toContain('/notifications');
    const payload = JSON.parse(request.body);
    expect(payload).toMatchObject({
      id_usuario_destinatario: 'usuario-docente-1',
      tipo_notificacion: tipo,
      titulo,
      url_accion: 'pta',
      datos_adicionales: {
        solicitudId: 'solicitud-1',
        ptaId: 'pta-1',
        decision,
        componentes: ['docencia', 'extension'],
        resueltoPor: 'Ana Administradora',
        resueltoPorRol: 'SUPER_ADMIN',
        motivo: 'Se revisaron los soportes y se tomó la decisión.',
        periodo: '2026-2',
      },
    });
    expect(payload.mensaje).toContain('Ana Administradora (SUPER_ADMIN)');
    expect(payload.mensaje).toContain('Se revisaron los soportes');
  });
});
