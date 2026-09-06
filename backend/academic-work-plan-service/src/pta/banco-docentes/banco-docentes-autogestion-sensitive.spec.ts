import { BancoDocentesService } from './banco-docentes.service';

function createService(overrides: {
  docenteRepo?: Record<string, jest.Mock>;
  invitacionRepo?: Record<string, jest.Mock>;
  dataSource?: Record<string, jest.Mock>;
} = {}) {
  const docenteRepo = overrides.docenteRepo || { findOne: jest.fn() };
  const invitacionRepo = overrides.invitacionRepo || {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const dataSource = overrides.dataSource || { query: jest.fn() };
  const auditLogRepo = { create: jest.fn((value) => value), save: jest.fn() };

  const service = new BancoDocentesService(
    docenteRepo as any,
    {} as any,
    {} as any,
    invitacionRepo as any,
    auditLogRepo as any,
    dataSource as any,
  );

  return { service, docenteRepo, invitacionRepo, dataSource, auditLogRepo };
}

describe('BancoDocentesService - datos sensibles en autogestión', () => {
  it('enmascara el perfil consultado con token y registra el acceso', async () => {
    const invitacionRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'invitacion-1',
        tokenAcceso: 'token-seguro',
        correoInstitucional: 'maria@esap.edu.co',
      }),
      save: jest.fn(),
    };
    const { service } = createService({ invitacionRepo });
    jest.spyOn(service, 'list').mockResolvedValue({
      data: [{
        docente_id: '11111111-1111-4111-8111-111111111111',
        correo_institucional: 'maria@esap.edu.co',
        documento_identidad: '1020304050',
        puntaje_salarial: 145.5,
      }],
      total: 1,
      page: 1,
      pages: 1,
      limit: 5,
    } as any);
    const auditSpy = jest.spyOn(service, 'logSensitiveDataAccess').mockResolvedValue(undefined);

    const result = await service.getAutogestionInfo('token-seguro');

    expect(result.documento_identidad).toBe('******4050');
    expect(result.puntaje_salarial).toBeNull();
    expect(result.proteccion_datos.acceso_completo).toBe(false);
    expect(auditSpy).toHaveBeenCalledWith([expect.objectContaining({
      actorId: 'AUTOGESTION:invitacion-1',
      roles: ['DOCENTE_AUTOGESTION'],
      fields: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
      endpoint: 'AUTOGESTION_MI_PERFIL',
      fullAccess: false,
    })]);
  });

  it('conserva la cédula confiable y descarta el puntaje recibido al guardar', async () => {
    const invitacion = {
      id: 'invitacion-1',
      tokenAcceso: 'token-seguro',
      correoInstitucional: 'maria@esap.edu.co',
      estado: 'OTP validado',
    };
    const invitacionRepo = {
      findOne: jest.fn().mockResolvedValue(invitacion),
      save: jest.fn().mockResolvedValue(invitacion),
    };
    const docenteRepo = {
      findOne: jest.fn().mockResolvedValue({ personaId: 'persona-1' }),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ document_number: '1020304050' }]),
    };
    const { service } = createService({ docenteRepo, invitacionRepo, dataSource });
    const upsertSpy = jest.spyOn(service, 'upsertDocente').mockResolvedValue({ id: 'docente-1' } as any);

    await service.submitFromToken('token-seguro', {
      documentNumber: '******4050',
      documento_identidad: '******4050',
      puntajeSalarial: 999999,
      PUNTAJE_SALARIAL: 999999,
      telefono: '3001234567',
    });

    expect(upsertSpy).toHaveBeenCalledWith(expect.objectContaining({
      documentNumber: '1020304050',
      documento_identidad: '1020304050',
      telefono: '3001234567',
      canal_origen: 'AUTOGESTION',
    }), expect.objectContaining({
      rejectExisting: false,
      relaxValidation: true,
      audit: expect.objectContaining({
        canalOrigen: 'AUTOGESTION',
        soporteId: 'invitacion-1',
      }),
    }));
    const submittedPayload = upsertSpy.mock.calls[0][0];
    expect(submittedPayload).not.toHaveProperty('puntajeSalarial');
    expect(submittedPayload).not.toHaveProperty('PUNTAJE_SALARIAL');
    expect(invitacionRepo.save).toHaveBeenCalledWith(expect.objectContaining({ estado: 'Gestionada' }));
  });
});
