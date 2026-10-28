import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermisosGuard } from './permisos.guard';

describe('PermisosGuard', () => {
  const contexto = (user: any) =>
    ({
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as any;

  const crear = (filas: any[], requeridos: string[] | undefined = ['centro-ayuda.recursos.crear']) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requeridos) } as unknown as Reflector;
    const dataSource = { query: jest.fn().mockResolvedValue(filas) } as any;
    return { guard: new PermisosGuard(reflector, dataSource), dataSource };
  };

  it('deja pasar si algún rol del usuario tiene el permiso', async () => {
    const { guard, dataSource } = crear([{ code: 'centro-ayuda.recursos.crear' }]);
    await expect(guard.canActivate(contexto({ roles: ['coordinador'] }))).resolves.toBe(true);
    expect(dataSource.query.mock.calls[0][1]).toEqual([
      ['COORDINADOR'],
      ['centro-ayuda.recursos.crear'],
    ]);
  });

  it('rechaza si ningún rol tiene el permiso, aunque se llame SUPER_ADMIN', async () => {
    const { guard } = crear([]);
    await expect(guard.canActivate(contexto({ roles: ['SUPER_ADMIN'] }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rechaza si el usuario no trae roles', async () => {
    const { guard, dataSource } = crear([{ code: 'x' }]);
    await expect(guard.canActivate(contexto({}))).rejects.toBeInstanceOf(ForbiddenException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('no consulta nada si el endpoint no pide permisos', async () => {
    const { guard, dataSource } = crear([], []);
    await expect(guard.canActivate(contexto({ roles: ['X'] }))).resolves.toBe(true);
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
