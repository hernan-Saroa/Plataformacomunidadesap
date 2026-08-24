import { BancoDocentesController } from './banco-docentes.controller';

const profile = {
  docente_id: '11111111-1111-4111-8111-111111111111',
  persona_id: 'persona-1',
  documento_identidad: '1020304050',
  puntaje_salarial: 145.5,
  nombre_completo: 'MARIA LOPEZ',
};

describe('BancoDocentesController - acceso a datos sensibles', () => {
  it('entrega datos completos a GGP y registra la consulta', async () => {
    const service = {
      getById: jest.fn().mockResolvedValue(profile),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);

    const response = await controller.getById('1020304050', '2026-2', {
      user: { userId: 'ggp-1', roles: ['GESTION_PROFESORAL'] },
      ip: '127.0.0.1',
    });

    expect(response.data.documento_identidad).toBe('1020304050');
    expect(response.data.puntaje_salarial).toBe(145.5);
    expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([expect.objectContaining({
      docenteId: profile.docente_id,
      actorId: 'ggp-1',
      roles: ['GESTION_PROFESORAL'],
      fields: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
      fullAccess: true,
    })]);
  });

  it('enmascara el listado para ADMIN y tambien audita el acceso protegido', async () => {
    const service = {
      list: jest.fn().mockResolvedValue({ data: [profile], total: 1, page: 1, pages: 1, limit: 50 }),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);

    const response = await controller.list(
      undefined, undefined, undefined, undefined, undefined, '2026-2', '1', '50',
      { user: { userId: 'admin-1', roles: ['ADMIN'] } },
    );

    expect(response.items[0].documento_identidad).toBe('******4050');
    expect(response.items[0].puntaje_salarial).toBeNull();
    expect(response.items[0].proteccion_datos.acceso_completo).toBe(false);
    expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([expect.objectContaining({
      actorId: 'admin-1',
      fullAccess: false,
      endpoint: 'BANCO_DOCENTES_LISTADO',
    })]);
  });

  it('falla cerrado si no puede escribir el log antes de revelar el dato', async () => {
    const service = {
      getById: jest.fn().mockResolvedValue(profile),
      logSensitiveDataAccess: jest.fn().mockRejectedValue(new Error('audit unavailable')),
    };
    const controller = new BancoDocentesController(service as any, {} as any);

    await expect(controller.getById('1020304050', '2026-2', {
      user: { userId: 'ggp-1', roles: ['GESTION_PROFESORAL'] },
    })).rejects.toThrow('audit unavailable');
  });

  it('enmascara las cédulas encontradas por las validaciones de duplicados', async () => {
    const duplicate = {
      id: profile.docente_id,
      documento: '1020304050',
      nombre: 'MARIA LOPEZ',
    };
    const service = {
      validarUnicidad: jest.fn().mockResolvedValue({ duplicados: [duplicate] }),
      detectarPosibleDuplicado: jest.fn().mockResolvedValue({ posiblesDuplicados: [duplicate] }),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);
    const req = { user: { userId: 'admin-1', roles: ['ADMIN'] } };

    const uniqueResponse = await controller.validarUnicidad({
      documentNumber: '1020304050',
      correoInstitucional: 'maria@esap.edu.co',
    }, req);
    const duplicateResponse = await controller.detectarDuplicado({
      nombreCompleto: 'MARIA LOPEZ',
      fechaNacimiento: '1980-01-01',
    }, req);

    expect(uniqueResponse.data.duplicados[0].documento).toBe('******4050');
    expect(duplicateResponse.data.posiblesDuplicados[0].documento).toBe('******4050');
    expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([
      expect.objectContaining({
        docenteId: profile.docente_id,
        actorId: 'admin-1',
        fields: ['DOCUMENTO_IDENTIDAD'],
        fullAccess: false,
      }),
    ]);
  });
});
