import { GraduationCertificatesService } from './graduation-certificates.service';

describe('GraduationCertificatesService multi-recipient delivery', () => {
  const createService = () =>
    new GraduationCertificatesService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    ) as any;

  it('envía el certificado al correo solicitado y a todos los correos únicos del documento', async () => {
    const service = createService();
    service.findActiveGraduatesByIdNumber = jest
      .fn()
      .mockResolvedValue([
        { email: 'registro-2@correo.com' },
        { email: 'REGISTRO-2@correo.com' },
        { email: 'correo-invalido' },
        { email: '' },
      ]);
    service.notifyCertificateDelivery = jest.fn().mockResolvedValue(true);

    const delivered = await service.sendCertificateToRequestRecipients(
      {
        requestNumber: 'GC-2026-0001',
        requesterType: 'GRADUATE',
        idNumber: '1234567',
        graduateEmail: 'registro-1@correo.com',
        graduate: { email: 'REGISTRO-1@correo.com' },
      },
      ' solicitante@correo.com ',
      { certificateNumber: 'CERT-001' },
      'https://comunidad.esap.edu.co',
    );

    expect(delivered).toEqual([
      'solicitante@correo.com',
      'registro-1@correo.com',
      'registro-2@correo.com',
    ]);
    expect(service.notifyCertificateDelivery).toHaveBeenCalledTimes(3);
  });

  it('envía para empresa al solicitante y a todos los correos asociados al documento', async () => {
    const service = createService();
    service.findActiveGraduatesByIdNumber = jest
      .fn()
      .mockResolvedValue([
        { email: 'graduado-2@correo.com' },
        { email: 'GRADUADO@correo.com' },
      ]);
    service.notifyCertificateDelivery = jest.fn().mockResolvedValue(true);

    const delivered = await service.sendCertificateToRequestRecipients(
      {
        requestNumber: 'GC-2026-0002',
        requesterType: 'COMPANY',
        idNumber: '1234567',
        graduateEmail: 'graduado@correo.com',
      },
      'empresa@correo.com',
      { certificateNumber: 'CERT-002' },
    );

    expect(delivered).toEqual([
      'empresa@correo.com',
      'graduado@correo.com',
      'graduado-2@correo.com',
    ]);
    expect(service.findActiveGraduatesByIdNumber).toHaveBeenCalledWith(
      '1234567',
    );
    expect(service.notifyCertificateDelivery).toHaveBeenCalledTimes(3);
  });

  it('continúa con los demás destinatarios si un correo falla', async () => {
    const service = createService();
    service.findActiveGraduatesByIdNumber = jest
      .fn()
      .mockResolvedValue([{ email: 'alterno@correo.com' }]);
    service.notifyCertificateDelivery = jest
      .fn()
      .mockRejectedValueOnce(new Error('Fallo temporal'))
      .mockResolvedValueOnce(true);

    const delivered = await service.sendCertificateToRequestRecipients(
      {
        requestNumber: 'GC-2026-0003',
        requesterType: 'GRADUATE',
        idNumber: '1234567',
      },
      'principal@correo.com',
      { certificateNumber: 'CERT-003' },
    );

    expect(delivered).toEqual(['alterno@correo.com']);
    expect(service.notifyCertificateDelivery).toHaveBeenCalledTimes(2);
  });
  it('no cuenta como entregado lo que la configuración de notificaciones omitió (EFDS-2406)', async () => {
    const service = createService();
    service.findActiveGraduatesByIdNumber = jest
      .fn()
      .mockResolvedValue([{ email: 'alterno@correo.com' }]);
    service.notifyCertificateDelivery = jest.fn().mockResolvedValue(false);

    const delivered = await service.sendCertificateToRequestRecipients(
      {
        requestNumber: 'GC-2026-0004',
        requesterType: 'GRADUATE',
        idNumber: '1234567',
      },
      'principal@correo.com',
      { certificateNumber: 'CERT-004' },
    );

    expect(delivered).toEqual([]);
    expect(service.notifyCertificateDelivery).toHaveBeenCalledTimes(2);
  });
  describe('correo del certificado y configuración de notificaciones (EFDS-2406)', () => {
    const originalFetch = global.fetch;
    const montar = (status: number) => {
      const service = createService();
      service.logger = { log: jest.fn(), warn: jest.fn(), debug: jest.fn() };
      service.resolveNotificationsBaseUrl = () => 'http://notificaciones';
      service.resolveCertificateValidationBaseUrl = () => 'http://portal';
      service.resolveCertificatePdf = jest
        .fn()
        .mockResolvedValue({ filename: 'certificado.pdf', content: Buffer.from('pdf') });
      const fetchMock = jest.fn().mockResolvedValue({ ok: true, status });
      global.fetch = fetchMock as any;
      return { service, fetchMock };
    };
    const certificado = { certificateNumber: 'CERT-005', verificationCode: 'ABC123' };

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('sale identificado con su módulo y su aviso', async () => {
      const { service, fetchMock } = montar(201);

      const enviado = await service.sendCertificateEmail('persona@correo.com', certificado);

      const [url, request] = fetchMock.mock.calls[0];
      const payload = JSON.parse(request.body);
      expect(url).toBe('http://notificaciones/api/v1/emails/send-with-attachment');
      expect(payload.modulo).toBe('graduates-certificates');
      expect(payload.evento).toBe('titulos_certificado_emitido');
      expect(payload.attachmentName).toBe('certificado.pdf');
      expect(enviado).toBe(true);
    });

    it('si la configuración lo omite (202) no se reporta como enviado', async () => {
      const { service } = montar(202);

      expect(await service.sendCertificateEmail('persona@correo.com', certificado)).toBe(false);
    });
  });
});
