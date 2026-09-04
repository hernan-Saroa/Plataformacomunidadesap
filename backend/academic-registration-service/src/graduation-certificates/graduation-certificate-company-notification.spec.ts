import { GraduationCertificatesService } from './graduation-certificates.service';

describe('GraduationCertificatesService company notifications', () => {
  const createService = (programOptions = ['PROGRAMA DISPONIBLE']) =>
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
      {
        listOptions: jest.fn().mockResolvedValue(programOptions),
      } as never,
    );

  it('precarga el correo registrado en una revision por titulo faltante solicitada por empresa', () => {
    const service = createService() as any;

    const email = service.resolveGraduateEmailForRequest(
      { email: ' graduado@correo.com ' },
      'COMPANY',
      'empresa@correo.com',
    );

    expect(email).toBe('graduado@correo.com');
  });

  it('no usa el correo de la empresa como correo del graduado nuevo', () => {
    const service = createService() as any;

    const email = service.resolveGraduateEmailForRequest(
      null,
      'COMPANY',
      'empresa@correo.com',
    );

    expect(email).toBeUndefined();
  });

  it('rechaza una revisión manual si el programa ya no existe en el catálogo', async () => {
    const service = createService();

    await expect(
      service.solicitarCertificadoLanding({
        idNumber: '1234567',
        lastName: 'Persona Graduada',
        requesterType: 'GRADUATE',
        requesterName: 'Persona Graduada',
        requesterEmail: 'graduado@correo.com',
        programName: 'PROGRAMA ELIMINADO',
        forceManualReview: true,
      }),
    ).rejects.toThrow('ya no está disponible en el catálogo de programas');
  });

  it('avisa al correo del graduado creado al finalizar el flujo manual de empresa', async () => {
    const service = createService() as any;
    service.sendGraduateCompanyNotificationEmail = jest
      .fn()
      .mockResolvedValue(undefined);

    await service.notifyGraduateAboutCompanyRequest(
      {
        requesterType: 'COMPANY',
        requestNumber: 'SOL-001',
        requesterName: 'Empresa solicitante',
        requesterEmail: 'contacto@empresa.com',
        companyName: 'Empresa solicitante SAS',
        companyNit: '900123456',
        contactPerson: 'Persona contacto',
        fullName: 'Graduado Nuevo',
        requestDate: new Date('2026-08-27T12:00:00.000Z'),
      },
      { certificateNumber: 'CERT-001' },
      {
        email: 'nuevo.graduado@correo.com',
        fullName: 'Graduado Nuevo',
      },
    );

    expect(service.sendGraduateCompanyNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        graduateEmail: 'nuevo.graduado@correo.com',
        graduateName: 'Graduado Nuevo',
        companyName: 'Empresa solicitante SAS',
        contactEmail: 'contacto@empresa.com',
        certificateNumber: 'CERT-001',
      }),
    );
  });
});
