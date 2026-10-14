import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './auth.decorators';

function ctx(user: any, meta: Record<string, any>, codes: string[] = []) {
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  const request = { user };
  const db = { query: jest.fn().mockResolvedValue(codes.map((code) => ({ code }))) };
  const context: any = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return { guard: new PermissionsGuard(reflector, db as any), context, db };
}

describe('PermissionsGuard', () => {
  it('deja pasar rutas públicas', () => {
    const { guard, context } = ctx(undefined, { [IS_PUBLIC_KEY]: true, [PERMISSIONS_KEY]: ['rund.admin'] });
    return expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('sin permisos requeridos deja pasar', () => {
    const { guard, context } = ctx({ roles: [] }, {});
    return expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('exige usuario autenticado', () => {
    const { guard, context } = ctx(undefined, { [PERMISSIONS_KEY]: ['rund.view'] });
    return expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('acepta si el usuario tiene al menos uno de los permisos', () => {
    const { guard, context } = ctx({ roles: ['X'] }, { [PERMISSIONS_KEY]: ['rund.edit', 'rund.view'] }, ['rund.view']);
    return expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rechaza si no tiene ninguno', () => {
    const { guard, context } = ctx({ roles: ['DOCENTE'], permissions: ['rund.view'] }, { [PERMISSIONS_KEY]: ['rund.admin'] });
    return expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it.each(['SUPER_ADMIN', 'superadmin', 'ADMIN_SISTEMA'])('el rol %s omite la verificación', (role) => {
    const { guard, context } = ctx({ roles: [role], permissions: [] }, { [PERMISSIONS_KEY]: ['rund.admin'] });
    return expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('ignora permisos declarados en el token si no hay asignacion activa', async () => {
    const { guard, context } = ctx({ roles: ['PERSONALIZADO'], permissions: ['rund.admin', '*'] }, { [PERMISSIONS_KEY]: ['rund.admin'] });
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('deniega el acceso por permiso cuando no puede consultar la base', async () => {
    const { guard, context, db } = ctx({ roles: ['PERSONALIZADO'] }, { [PERMISSIONS_KEY]: ['rund.view'] });
    db.query.mockRejectedValue(new Error('base no disponible'));
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });

  it('consulta una vez por peticion y comprueba revocaciones en la siguiente', async () => {
    const user = { roles: ['PERSONALIZADO'] };
    const { guard, context, db } = ctx(user, { [PERMISSIONS_KEY]: ['rund.view'] }, ['rund.view']);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(db.query).toHaveBeenCalledTimes(1);
    db.query.mockResolvedValue([]);
    const next = { ...context, switchToHttp: () => ({ getRequest: () => ({ user }) }) };
    await expect(guard.canActivate(next)).resolves.toBe(false);
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});
