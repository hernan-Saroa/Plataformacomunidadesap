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

  describe('docente consulta su propio perfil (la dedicación editada no llegaba al PTA)', () => {
    const ROUTE_ROLES = ['DOCENTE', 'GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin', 'ADMIN'];
    const ROUTE_PERMISSIONS = ['banco-docentes.rund.view', 'banco-docentes.rund.manage'];
    const guardFor = (roles: string[] | undefined, permissions: string[] | undefined, db: any) => new BancoDocentesRolesGuard(
      { getAllAndOverride: jest.fn((key: string) => (key === 'rundPermissions' ? permissions : roles)) } as any, db as any);

    it('autoriza al rol Docente aunque su rol no tenga permisos RUND asignados', async () => {
      const db = { query: jest.fn().mockResolvedValue([]) };
      const { context } = contextFor({ roles: ['DOCENTE'] });
      await expect(guardFor(ROUTE_ROLES, ROUTE_PERMISSIONS, db).canActivate(context)).resolves.toBe(true);
    });

    it('normaliza el código del rol Docente', async () => {
      const db = { query: jest.fn().mockResolvedValue([]) };
      const { context } = contextFor({ roles: [{ code: ' docente ' }] });
      await expect(guardFor(ROUTE_ROLES, ROUTE_PERMISSIONS, db).canActivate(context)).resolves.toBe(true);
    });

    it('sigue autorizando al docente si no se pueden consultar los permisos', async () => {
      const db = { query: jest.fn().mockRejectedValue(new Error('DB no disponible')) };
      const { context } = contextFor({ roles: ['DOCENTE'] });
      await expect(guardFor(ROUTE_ROLES, ROUTE_PERMISSIONS, db).canActivate(context)).resolves.toBe(true);
    });

    it('no abre rutas que no declaran el rol Docente', async () => {
      const db = { query: jest.fn().mockResolvedValue([]) };
      const { context } = contextFor({ roles: ['DOCENTE'] });
      const gestion = ['GESTION_PROFESORAL', 'SUPER_ADMIN', 'super_admin'];
      for (const permissions of [['banco-docentes.rund.validate'], ['banco-docentes.rund.manage'], ['banco-docentes.rund.edit']]) {
        await expect(guardFor(gestion, permissions, db).canActivate(context)).rejects.toThrow(ForbiddenException);
      }
    });

    it('no concede nada a otros roles que no sean Docente en esas rutas', async () => {
      const db = { query: jest.fn().mockResolvedValue([]) };
      for (const role of ['ADMIN', 'GESTION_PROFESORAL', 'ESTUDIANTE', 'RUND_CONSULTA_PERSONALIZADO']) {
        const { context } = contextFor({ roles: [role] });
        await expect(guardFor(ROUTE_ROLES, ROUTE_PERMISSIONS, db).canActivate(context)).rejects.toThrow(ForbiddenException);
      }
    });

    it('un usuario sin roles no entra aunque la ruta declare Docente', async () => {
      const db = { query: jest.fn().mockResolvedValue([]) };
      for (const user of [{ roles: [] }, { roles: undefined }, {}]) {
        await expect(guardFor(ROUTE_ROLES, ROUTE_PERMISSIONS, db).canActivate(contextFor(user).context)).rejects.toThrow(ForbiddenException);
      }
    });

    it('un usuario sin autenticar sigue rechazado', async () => {
      const db = { query: jest.fn() };
      const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({}) }) } as any;
      await expect(guardFor(ROUTE_ROLES, ROUTE_PERMISSIONS, db).canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('conserva la regla granular: retirar el permiso a un administrador con rol funcional lo sigue bloqueando', async () => {
      const db = { query: jest.fn().mockResolvedValue([{ code: 'banco-docentes.rund.documents.manage' }]) };
      const { context } = contextFor({ roles: ['GESTION_PROFESORAL'] });
      await expect(guardFor(['GESTION_PROFESORAL'], ['banco-docentes.rund.validate'], db).canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
