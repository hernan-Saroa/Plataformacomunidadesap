import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { BancoDocentesController } from './banco-docentes.controller';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';

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
});
