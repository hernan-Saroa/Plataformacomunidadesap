import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesController } from './banco-docentes.controller';

describe('BancoDocentesController - autorizacion del perfil RUND', () => {
  it('permite al docente consultar su propio perfil del periodo', async () => {
    const profile = { persona_id: 'persona-1', docente_id: 'docente-2026-2' };
    const service = {
      getById: jest.fn().mockResolvedValue(profile),
    };
    const controller = new BancoDocentesController(service as any, {} as any);

    await expect(controller.getById('1020304050', '2026-2', {
      user: { userId: 'usuario-1', roles: ['DOCENTE'] },
    })).resolves.toEqual({ success: true, data: profile });
    expect(service.getById).toHaveBeenNthCalledWith(1, '1020304050', '2026-2');
    expect(service.getById).toHaveBeenNthCalledWith(2, 'usuario-1', '2026-2');
  });

  it('impide al docente consultar el perfil de otra persona', async () => {
    const service = {
      getById: jest.fn()
        .mockResolvedValueOnce({ persona_id: 'persona-ajena', docente_id: 'docente-ajeno' })
        .mockResolvedValueOnce({ persona_id: 'persona-propia', docente_id: 'docente-propio' }),
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
  });
});
