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
    service.notifyCertificateDelivery = jest.fn().mockResolvedValue(undefined);

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
    service.notifyCertificateDelivery = jest.fn().mockResolvedValue(undefined);

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
      .mockResolvedValueOnce(undefined);

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
});
