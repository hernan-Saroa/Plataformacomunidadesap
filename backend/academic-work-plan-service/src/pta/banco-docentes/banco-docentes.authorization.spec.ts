import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';
import { RUND_PERMISSIONS, RUND_PERMISSIONS_KEY } from './rund-permissions';

describe('BancoDocentesController - autorizacion del perfil RUND', () => {
  it('usa un guard de roles exclusivo del modulo RUND', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, BancoDocentesController);
    expect(guards).toContain(BancoDocentesRolesGuard);
  });

  it('permite al docente consultar su propio perfil del periodo', async () => {
    const profile = { persona_id: 'persona-1', docente_id: 'docente-2026-2' };
    const service = {
      getById: jest.fn().mockResolvedValue(profile),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);

    await expect(controller.getById('1020304050', '2026-2', {
      user: { userId: 'usuario-1', roles: ['DOCENTE'] },
    })).resolves.toEqual({
      success: true,
      data: {
        ...profile,
        proteccion_datos: {
          acceso_completo: false,
          campos_sensibles: [],
          campos_enmascarados: [],
        },
      },
    });
    expect(service.getById).toHaveBeenNthCalledWith(1, '1020304050', '2026-2');
    expect(service.getById).toHaveBeenNthCalledWith(2, 'usuario-1', '2026-2');
  });

  it('impide al docente consultar el perfil de otra persona', async () => {
    const service = {
      getById: jest.fn()
        .mockResolvedValueOnce({ persona_id: 'persona-ajena', docente_id: 'docente-ajeno' })
        .mockResolvedValueOnce({ persona_id: 'persona-propia', docente_id: 'docente-propio' }),
      logSensitiveDataAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new BancoDocentesController(service as any, {} as any);

    await expect(controller.getById('documento-ajeno', '2026-2', {
      user: { userId: 'usuario-1', roles: ['DOCENTE'] },
    })).rejects.toThrow(ForbiddenException);
  });

  it('reserva el listado y las mutaciones para GGP o administradores', () => {
    const allowed = expect.arrayContaining(['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']);
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.list)).toEqual(allowed);
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.create)).toEqual(allowed);
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.update)).toEqual(allowed);
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.cambiarEstado)).toEqual(allowed);
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.getTarjetaRUND)).toEqual(expect.arrayContaining(['DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']));
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.getTarjetaRUNDByPersona)).toEqual(expect.arrayContaining(['DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']));
    expect(Reflect.getMetadata('isPublic', BancoDocentesController.prototype.getTarjetaRUND)).not.toBe(true);
    expect(Reflect.getMetadata('isPublic', BancoDocentesController.prototype.getTarjetaRUNDByPersona)).not.toBe(true);
  });

  it('reserva el CRUD documental del perfil para GGP y administradores', () => {
    const readOperations = [
      'getDocumentCategories', 'getProfileDocuments', 'getProfileDocumentContent',
    ] as const;
    for (const operation of readOperations) {
      const handler = BancoDocentesController.prototype[operation];
      expect(Reflect.getMetadata('roles', handler)).toEqual(
        expect.arrayContaining(['DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']),
      );
      expect(Reflect.getMetadata('isPublic', handler)).not.toBe(true);
    }

    const writeOperations = [
      'uploadProfileDocument',
      'replaceProfileDocument',
      'deleteProfileDocument',
    ] as const;
    for (const operation of writeOperations) {
      const handler = BancoDocentesController.prototype[operation];
      expect(Reflect.getMetadata('roles', handler)).toEqual(
        expect.arrayContaining(['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']),
      );
      expect(Reflect.getMetadata('roles', handler)).not.toContain('DOCENTE');
      expect(Reflect.getMetadata(RUND_PERMISSIONS_KEY, handler)).toEqual(
        expect.arrayContaining([RUND_PERMISSIONS.DOCUMENTS_MANAGE]),
      );
      expect(Reflect.getMetadata('isPublic', handler)).not.toBe(true);
    }
    expect(Reflect.getMetadata('roles', BancoDocentesController.prototype.vincularSoporte)).toEqual(
      expect.arrayContaining(['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']),
    );
    expect(Reflect.getMetadata('isPublic', BancoDocentesController.prototype.vincularSoporte)).not.toBe(true);
    expect(Reflect.getMetadata('isPublic', BancoDocentesController.prototype.vincularSoporteAutogestion)).toBe(true);
  });

  it('protege las operaciones administrativas históricas del módulo', () => {
    for (const operation of ['syncAllSoportes', 'repararSoportes'] as const) {
      const handler = BancoDocentesController.prototype[operation];
      expect(Reflect.getMetadata('roles', handler)).toEqual(
        expect.arrayContaining(['SUPER_ADMIN']),
      );
      expect(Reflect.getMetadata('isPublic', handler)).not.toBe(true);
    }

    expect(Reflect.getMetadata('isPublic', BancoDocentesController.prototype.getBloques)).not.toBe(true);
    expect(Reflect.getMetadata(RUND_PERMISSIONS_KEY, BancoDocentesController.prototype.getBloques))
      .toEqual(expect.arrayContaining([RUND_PERMISSIONS.VIEW, RUND_PERMISSIONS.VALIDATE]));
  });

  it('protege la importacion, su historial y la descarga del soporte', () => {
    for (const operation of ['bulkUpload', 'bulkHistory', 'bulkSupport'] as const) {
      const handler = BancoDocentesController.prototype[operation];
      expect(Reflect.getMetadata('roles', handler)).toEqual(
        expect.arrayContaining(['GESTION_PROFESORAL', 'SUPER_ADMIN', 'ADMIN']),
      );
      expect(Reflect.getMetadata('roles', handler)).not.toContain('DOCENTE');
      expect(Reflect.getMetadata(RUND_PERMISSIONS_KEY, handler)).toEqual(
        expect.arrayContaining([RUND_PERMISSIONS.IMPORT, RUND_PERMISSIONS.MANAGE]),
      );
    }
  });
});
