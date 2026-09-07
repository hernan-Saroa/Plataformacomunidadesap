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

  it('rechaza solicitudes de graduado con un nombre de menos de 5 caracteres', async () => {
    const service = createService();

    await expect(
      service.solicitarCertificadoLanding({
        idNumber: '1234567',
        lastName: 'aa',
        requesterType: 'GRADUATE',
        requesterName: 'aa',
        requesterEmail: 'graduado@correo.com',
      }),
    ).rejects.toThrow(
      'El nombre del graduado debe tener al menos 5 caracteres',
    );
  });

  it('rechaza solicitudes de empresa con nombres de menos de 5 caracteres', async () => {
    const service = createService();

    await expect(
      service.solicitarCertificadoLanding({
        idNumber: '1234567',
        lastName: 'Persona Graduada',
        requesterType: 'COMPANY',
        requesterName: 'aa',
        requesterEmail: 'empresa@correo.com',
        companyName: 'aa',
        contactPerson: 'Persona Contacto',
      }),
    ).rejects.toThrow(
      'El nombre de la empresa debe tener al menos 5 caracteres',
    );
  });

  it('mantiene el NIT de empresa opcional y acepta 9 o 10 dígitos', () => {
    const service = createService() as any;

    expect(() => service.validateOptionalCompanyNit('')).not.toThrow();
    expect(() => service.validateOptionalCompanyNit('900123456')).not.toThrow();
    expect(() =>
      service.validateOptionalCompanyNit('9001234567'),
    ).not.toThrow();
  });

  it('rechaza un NIT diligenciado con menos de 9 dígitos', () => {
    const service = createService() as any;

    expect(() => service.validateOptionalCompanyNit('12345678')).toThrow(
      'El NIT debe tener 9 dígitos sin DV o 10 dígitos si incluye el DV',
    );
  });

  it('procesa cargas de más de 1000 graduados sin un límite fijo de registros', async () => {
    const service = createService() as any;
    service.crearGraduado = jest.fn(async (graduate) => graduate);
    const graduates = Array.from({ length: 1001 }, (_, index) => ({
      idNumber: String(1000000 + index),
      programName: `Programa ${index}`,
    }));

    const result = await service.crearGraduadosMasivamente({ graduates });

    expect(result.total).toBe(1001);
    expect(result.createdCount).toBe(1001);
    expect(result.failedCount).toBe(0);
  });

  it('devuelve todos los títulos encontrados sin limitar las sugerencias a tres', async () => {
    const service = createService() as any;
    service.syncGraduatesFromMysqlByIdNumber = jest.fn().mockResolvedValue({
      found: true,
    });
    service.findActiveGraduatesByIdNumber = jest.fn().mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        id: `graduate-${index}`,
        firstName: 'Persona',
        lastName: 'Graduada',
        fullName: 'Persona Graduada',
        idNumber: '1234567',
        programName: `Programa ${index + 1}`,
        degreeTitle: `Título ${index + 1}`,
        graduationDate: new Date(`202${index}-01-01`),
        campus: 'Sede Principal',
        seccionalName: 'Territorial Central',
      })),
    );
    service.canIssueGraduationCertificate = jest.fn().mockReturnValue(true);

    const result = await service.buscarCoincidenciasGraduado(
      '1234567',
      undefined,
      'Persona Graduada',
    );

    expect(result.totalMatches).toBe(5);
    expect(result.suggestions).toHaveLength(5);
  });

  it('avisa al correo del graduado creado al finalizar el flujo manual de empresa', async () => {
    const service = createService() as any;
    service.findActiveGraduatesByIdNumber = jest.fn().mockResolvedValue([]);
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
        decision: 'APPROVED',
      }),
    );
  });

  it('avisa la aprobación a todos los correos únicos asociados al documento', async () => {
    const service = createService() as any;
    service.findActiveGraduatesByIdNumber = jest.fn().mockResolvedValue([
      { email: 'registro-1@correo.com', fullName: 'Persona Uno' },
      { email: 'registro-2@correo.com', fullName: 'Persona Dos' },
      { email: 'REGISTRO-1@correo.com', fullName: 'Persona Duplicada' },
      { email: 'correo-invalido', fullName: 'Persona Inválida' },
    ]);
    service.sendGraduateCompanyNotificationEmail = jest
      .fn()
      .mockResolvedValue(undefined);

    await service.notifyGraduateAboutCompanyRequest(
      {
        requesterType: 'COMPANY',
        requestNumber: 'SOL-002',
        idNumber: '1234567',
        requesterEmail: 'contacto@empresa.com',
        companyName: 'Empresa solicitante SAS',
        fullName: 'Persona Graduada',
      },
      { certificateNumber: 'CERT-002' },
    );

    expect(service.sendGraduateCompanyNotificationEmail).toHaveBeenCalledTimes(
      2,
    );
    expect(service.sendGraduateCompanyNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        graduateEmail: 'registro-1@correo.com',
        decision: 'APPROVED',
        certificateNumber: 'CERT-002',
      }),
    );
    expect(service.sendGraduateCompanyNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        graduateEmail: 'registro-2@correo.com',
        decision: 'APPROVED',
        certificateNumber: 'CERT-002',
      }),
    );
  });

  it('avisa el rechazo a todos los correos asociados sin indicar certificado', async () => {
    const service = createService() as any;
    service.findActiveGraduatesByIdNumber = jest.fn().mockResolvedValue([
      { email: 'registro-1@correo.com', fullName: 'Persona Uno' },
      { email: 'registro-2@correo.com', fullName: 'Persona Dos' },
    ]);
    service.sendGraduateCompanyNotificationEmail = jest
      .fn()
      .mockResolvedValue(undefined);

    await service.notifyGraduateAboutCompanyRequest(
      {
        requesterType: 'COMPANY',
        requestNumber: 'SOL-003',
        idNumber: '1234567',
        requesterEmail: 'contacto@empresa.com',
        companyName: 'Empresa solicitante SAS',
        fullName: 'Persona Graduada',
      },
      undefined,
      undefined,
      'REJECTED',
    );

    expect(service.sendGraduateCompanyNotificationEmail).toHaveBeenCalledTimes(
      2,
    );
    expect(service.sendGraduateCompanyNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: 'REJECTED',
        certificateNumber: undefined,
      }),
    );
  });
});
