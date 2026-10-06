import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './auth.decorators';

function ctx(user: any, meta: Record<string, any>) {
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  const context: any = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
  return { guard: new PermissionsGuard(reflector), context };
}

describe('PermissionsGuard', () => {
  it('deja pasar rutas públicas', () => {
    const { guard, context } = ctx(undefined, { [IS_PUBLIC_KEY]: true, [PERMISSIONS_KEY]: ['rund.admin'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('sin permisos requeridos deja pasar', () => {
    const { guard, context } = ctx({ roles: [] }, {});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('exige usuario autenticado', () => {
    const { guard, context } = ctx(undefined, { [PERMISSIONS_KEY]: ['rund.view'] });
    expect(guard.canActivate(context)).toBe(false);
  });

  it('acepta si el usuario tiene al menos uno de los permisos', () => {
    const { guard, context } = ctx({ roles: ['X'], permissions: ['rund.view'] }, { [PERMISSIONS_KEY]: ['rund.edit', 'rund.view'] });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza si no tiene ninguno', () => {
    const { guard, context } = ctx({ roles: ['DOCENTE'], permissions: ['rund.view'] }, { [PERMISSIONS_KEY]: ['rund.admin'] });
    expect(guard.canActivate(context)).toBe(false);
  });

  it.each(['SUPER_ADMIN', 'superadmin', 'ADMIN_SISTEMA'])('el rol %s omite la verificación', (role) => {
    const { guard, context } = ctx({ roles: [role], permissions: [] }, { [PERMISSIONS_KEY]: ['rund.admin'] });
    expect(guard.canActivate(context)).toBe(true);
  });
});
