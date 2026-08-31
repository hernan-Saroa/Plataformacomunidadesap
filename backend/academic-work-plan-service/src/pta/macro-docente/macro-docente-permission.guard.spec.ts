import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MacroDocentePermissionGuard } from './macro-docente-permission.guard';
import { MACRO_DOCENTE_PERMISOS } from './macro-docente-permission.decorator';

function buildContext(user: any) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('MacroDocentePermissionGuard', () => {
  it('deja pasar rutas sin @RequierePermisoMacroDocente (ej. el acceso externo público)', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const ptaPermissions = { resolveForRoles: jest.fn() };
    const guard = new MacroDocentePermissionGuard(reflector, ptaPermissions as any);
    await expect(guard.canActivate(buildContext(null))).resolves.toBe(true);
    expect(ptaPermissions.resolveForRoles).not.toHaveBeenCalled();
  });

  it('exige usuario autenticado cuando la ruta requiere permiso', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(MACRO_DOCENTE_PERMISOS.CONSULTAR) } as unknown as Reflector;
    const ptaPermissions = { resolveForRoles: jest.fn() };
    const guard = new MacroDocentePermissionGuard(reflector, ptaPermissions as any);
    await expect(guard.canActivate(buildContext(null))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('permite el acceso si el usuario tiene el permiso requerido', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(MACRO_DOCENTE_PERMISOS.CONSULTAR) } as unknown as Reflector;
    const ptaPermissions = {
      resolveForRoles: jest.fn().mockResolvedValue({ isSuperUser: false, permissions: new Set([MACRO_DOCENTE_PERMISOS.CONSULTAR]) }),
    };
    const guard = new MacroDocentePermissionGuard(reflector, ptaPermissions as any);
    await expect(guard.canActivate(buildContext({ roles: ['CONTROL_INTERNO'] }))).resolves.toBe(true);
  });

  it('permite el acceso a SUPER_ADMIN aunque no tenga el permiso asignado explícitamente', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(MACRO_DOCENTE_PERMISOS.GESTIONAR_ACCESOS_EXTERNOS) } as unknown as Reflector;
    const ptaPermissions = {
      resolveForRoles: jest.fn().mockResolvedValue({ isSuperUser: true, permissions: new Set() }),
    };
    const guard = new MacroDocentePermissionGuard(reflector, ptaPermissions as any);
    await expect(guard.canActivate(buildContext({ roles: ['SUPER_ADMIN'] }))).resolves.toBe(true);
  });

  it('rechaza al usuario que no tiene el permiso requerido', async () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(MACRO_DOCENTE_PERMISOS.GESTIONAR_ACCESOS_EXTERNOS) } as unknown as Reflector;
    const ptaPermissions = {
      resolveForRoles: jest.fn().mockResolvedValue({ isSuperUser: false, permissions: new Set([MACRO_DOCENTE_PERMISOS.CONSULTAR]) }),
    };
    const guard = new MacroDocentePermissionGuard(reflector, ptaPermissions as any);
    await expect(guard.canActivate(buildContext({ roles: ['CONTROL_INTERNO'] }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
