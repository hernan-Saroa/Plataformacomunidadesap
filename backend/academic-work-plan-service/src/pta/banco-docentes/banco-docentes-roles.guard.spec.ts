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
  it('acumula permisos de varios roles y normaliza códigos antes de consultar', async () => {
    const reflector = { getAllAndOverride: jest.fn()
      .mockReturnValueOnce(['GESTION_PROFESORAL']).mockReturnValueOnce(['banco-docentes.rund.validate']) };
    const db = { query: jest.fn().mockResolvedValue([
      { code: 'banco-docentes.rund.carga' }, { code: 'banco-docentes.rund.revision' },
    ]) };
    const guard = new BancoDocentesRolesGuard(reflector as any, db as any);
    const { context, request } = contextFor({ roles: [{ code: ' rund_cargador ' }, 'rund_aprobador'] });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(db.query).toHaveBeenCalledWith(expect.any(String), [['RUND_CARGADOR', 'RUND_APROBADOR']]);
    for (const capability of ['edit', 'documents.manage', 'validate']) {
      expect(request.rundPermissions.has(`banco-docentes.rund.${capability}`)).toBe(true);
    }
  });

  it('ignora permisos declarados en el JWT sin una asignación resuelta en el servidor', async () => {
    const reflector = { getAllAndOverride: jest.fn()
      .mockReturnValueOnce(['SUPER_ADMIN']).mockReturnValueOnce(['banco-docentes.rund.validate']) };
    const db = { query: jest.fn().mockResolvedValue([]) };
    const guard = new BancoDocentesRolesGuard(reflector as any, db as any);
    const { context } = contextFor({ roles: ['ROL_SIN_PERMISOS'], permissions: ['banco-docentes.rund.manage'], permisos: ['banco-docentes.rund.revision'] });
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('retira un permiso revocado al vencer la caché y no usa permisos antiguos si falla la consulta', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(1000);
    try {
      const reflector = { getAllAndOverride: jest.fn((key: string) =>
        key === 'rundPermissions' ? ['banco-docentes.rund.validate'] : ['GESTION_PROFESORAL']) };
      const db = { query: jest.fn().mockResolvedValue([{ code: 'banco-docentes.rund.revision' }]) };
      const guard = new BancoDocentesRolesGuard(reflector as any, db as any);
      const context = () => contextFor({ roles: ['REVISOR_PERSONALIZADO'] }).context;
      await expect(guard.canActivate(context())).resolves.toBe(true);
      db.query.mockResolvedValue([]);
      clock.mockReturnValue(61_000);
      await expect(guard.canActivate(context())).rejects.toThrow(ForbiddenException);
      db.query.mockRejectedValue(new Error('No disponible'));
      clock.mockReturnValue(121_000);
      await expect(guard.canActivate(context())).rejects.toThrow(ForbiddenException);
    } finally { clock.mockRestore(); }
  });

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

  it('deniega una operación granular si falla la consulta de permisos, incluso a GGP', async () => {
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

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('retirar validate de GGP impide aprobar aunque el nombre del rol siga permitido', async () => {
    const reflector = { getAllAndOverride: jest.fn()
      .mockReturnValueOnce(['GESTION_PROFESORAL']).mockReturnValueOnce(['banco-docentes.rund.validate']) };
    const db = { query: jest.fn().mockResolvedValue([{ code: 'banco-docentes.rund.documents.manage' }]) };
    const guard = new BancoDocentesRolesGuard(reflector as any, db as any);
    await expect(guard.canActivate(contextFor({ roles: ['GESTION_PROFESORAL'] }).context)).rejects.toThrow(ForbiddenException);
  });
});
