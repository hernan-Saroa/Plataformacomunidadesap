import { BancoDocentesController } from './banco-docentes.controller';
import { RUND_PERMISSIONS } from './rund-permissions';

const profile = {
  docente_id: '11111111-1111-4111-8111-111111111111',
  persona_id: 'persona-1',
  documento_identidad: '1020304050',
  puntaje_salarial: 145.5,
  nombre_completo: 'MARIA LOPEZ',
};

describe('BancoDocentesController - acceso a datos sensibles', () => {
  it('protege y audita los soportes incluidos en bloques y alertas de vencimiento', async () => {
    const support = { docente_id: profile.docente_id, tipo_soporte: 'diploma', nombre_archivo: '1020304050.pdf', documento_carpeta_id: '/uploads/1020304050.pdf' };
    const service = { getBloques: jest.fn().mockResolvedValue([{ docente_id: profile.docente_id, bloque: 'FORMACION', soportes: [support] }]),
      getSoportesProximosVencer: jest.fn().mockResolvedValue([support]), logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined) };
    const controller = new BancoDocentesController(service as any, {} as any);
    const req = { user: { userId: 'admin-1', roles: ['ADMIN'] } };
    const blocks = await controller.getBloques(profile.docente_id, req);
    const upcoming = await controller.soportesProximosVencer('30', req);
    for (const result of [blocks, upcoming]) expect(JSON.stringify(result)).not.toContain('1020304050');
    expect(blocks.data[0].soportes[0].documento_carpeta_id).toBeNull();
    expect(service.logSensitiveDataAccess).toHaveBeenCalledTimes(2);
    expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([expect.objectContaining({
      docenteId: profile.docente_id, fields: ['DOCUMENTO_IDENTIDAD', 'PUNTAJE_SALARIAL'],
    })]);
  });
  it.each(['ADMIN', 'ADMIN_TERRITORIAL', 'DOCENTE', 'CONSULTOR'])(
    'no eleva la visibilidad de %s por permisos generales resueltos por el guard', async (role) => {
      const service = {
        getById: jest.fn().mockResolvedValue(profile),
        logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
      };
      const controller = new BancoDocentesController(service as any, {} as any);
      const response = await controller.getById(profile.docente_id, undefined, {
        user: { userId: 'lector-1', roles: [role] },
        rundPermissions: new Set(Object.values(RUND_PERMISSIONS)),
      });
      expect(response.data.documento_identidad).toBe('******4050');
      expect(response.data.puntaje_salarial).toBeNull();
      expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([
        expect.objectContaining({ actorId: 'lector-1', fullAccess: false }),
      ]);
    },
  );

  it.each(['GESTION_PROFESORAL', 'SUPER_ADMIN'])(
    'mantiene acceso completo para %s aunque tenga también roles restringidos', async (role) => {
      const service = {
        getById: jest.fn().mockResolvedValue(profile),
        logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
      };
      const controller = new BancoDocentesController(service as any, {} as any);
      const response = await controller.getById(profile.docente_id, undefined, {
        user: { userId: 'autorizado-1', roles: ['DOCENTE', role] },
      });
      expect(response.data.documento_identidad).toBe(profile.documento_identidad);
      expect(response.data.puntaje_salarial).toBe(profile.puntaje_salarial);
    },
  );

  it.each(['create', 'update'] as const)('protege y audita la respuesta de %s', async (operation) => {
    const result = { docenteId: profile.docente_id, documentNumber: profile.documento_identidad, action: operation };
    const service = {
      upsertDocente: jest.fn().mockResolvedValue(result),
      updateDocente: jest.fn().mockResolvedValue(result),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);
    const req = { user: { userId: 'admin-1', roles: ['ADMIN'] }, rundPermissions: new Set([RUND_PERMISSIONS.MANAGE]) };
    const response = operation === 'create'
      ? await controller.create({}, req)
      : await controller.update(profile.docente_id, {}, req);
    expect(response.data.documentNumber).toBe('******4050');
    expect(response.data.docenteId).toBe(profile.docente_id);
    if (operation === 'create') {
      expect(service.upsertDocente).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
        audit: expect.objectContaining({ sensitiveAccess: expect.objectContaining({ fullAccess: false, roles: ['ADMIN'] }) }),
      }));
    } else {
      expect(service.updateDocente).toHaveBeenCalledWith(profile.docente_id, expect.objectContaining({
        rundSensitiveAccess: expect.objectContaining({ fullAccess: false, roles: ['ADMIN'] }),
      }));
    }
    expect(service.logSensitiveDataAccess).not.toHaveBeenCalled(); // Se audita dentro de la transacción, no después.
    expect(result.documentNumber).toBe(profile.documento_identidad);
  });

  it('protege valores históricos y audita sobre el docente, no sobre el ID del evento', async () => {
    const service = {
      getAuditoria: jest.fn().mockResolvedValue([{
        id: 'evento-1', docenteId: profile.docente_id,
        campoAfectado: 'PUNTAJE_SALARIAL', datoPrevio: '145.5', datoNuevo: '200',
      }]),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);
    const response = await controller.getAuditoria(profile.docente_id, {
      user: { userId: 'consultor-1', roles: ['CONSULTOR'] },
      rundPermissions: new Set([RUND_PERMISSIONS.VALIDATE]),
    });
    expect(response.data[0]).toMatchObject({ datoPrevio: null, datoNuevo: null });
    expect(service.logSensitiveDataAccess).toHaveBeenCalledWith([
      expect.objectContaining({ docenteId: profile.docente_id, fields: ['PUNTAJE_SALARIAL'], fullAccess: false }),
    ]);
    service.logSensitiveDataAccess.mockRejectedValue(new Error('audit unavailable'));
    await expect(controller.getAuditoria(profile.docente_id, { user: { roles: ['SUPER_ADMIN'] } }))
      .rejects.toThrow('audit unavailable');
  });

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
