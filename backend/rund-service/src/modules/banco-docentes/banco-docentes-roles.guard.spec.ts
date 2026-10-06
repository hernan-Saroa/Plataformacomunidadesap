import { ForbiddenException } from '@nestjs/common';
import { BancoDocentesRolesGuard } from './banco-docentes-roles.guard';

function contextFor(user: any): any {
  const request = { user } as any;
  return {
    request,
    context: {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    },
  };
}

describe('BancoDocentesRolesGuard', () => {
  it('normaliza los roles usados por RUND', async () => {
    const reflector = {
      getAllAndOverride: jest.fn()
        .mockReturnValueOnce(['DOCENTE'])
        .mockReturnValueOnce(undefined),
    };
    const guard = new BancoDocentesRolesGuard(reflector as any, { query: jest.fn() } as any);
    const { context } = contextFor({ roles: [{ code: 'docente' }] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('autoriza un rol personalizado mediante auth.role_permissions', async () => {
    const reflector = {
      getAllAndOverride: jest.fn()
        .mockReturnValueOnce(['GESTION_PROFESORAL'])
        .mockReturnValueOnce(['banco-docentes.rund.documents.manage']),
    };
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ code: 'banco-docentes.rund.documents.manage' }]),
    };
    const guard = new BancoDocentesRolesGuard(reflector as any, dataSource as any);
    const { context, request } = contextFor({ roles: ['ADMIN_RUND_PERSONALIZADO'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('auth.role_permissions'), [
      ['ADMIN_RUND_PERSONALIZADO'],
    ]);
    expect(request.rundPermissions).toEqual(new Set(['banco-docentes.rund.documents.manage']));
  });

  it('rechaza un usuario sin rol ni permiso autorizado', async () => {
    const reflector = {
      getAllAndOverride: jest.fn()
        .mockReturnValueOnce(['GESTION_PROFESORAL'])
        .mockReturnValueOnce(['banco-docentes.rund.documents.manage']),
    };
    const guard = new BancoDocentesRolesGuard(
      reflector as any,
      { query: jest.fn().mockResolvedValue([]) } as any,
    );
    const { context } = contextFor({ roles: ['DOCENTE'] });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('conserva el acceso por rol explícito si la consulta de permisos falla', async () => {
    const reflector = {
      getAllAndOverride: jest.fn()
        .mockReturnValueOnce(['GESTION_PROFESORAL'])
        .mockReturnValueOnce(['banco-docentes.rund.manage']),
    };
    const guard = new BancoDocentesRolesGuard(
      reflector as any,
      { query: jest.fn().mockRejectedValue(new Error('DB no disponible')) } as any,
    );
    const { context } = contextFor({ roles: ['GESTION_PROFESORAL'] });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
