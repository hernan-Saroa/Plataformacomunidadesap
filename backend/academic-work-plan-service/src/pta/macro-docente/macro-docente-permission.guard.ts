import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PtaPermissionsService } from '../auth/pta-permissions.service';
import { getRequestRoleCodes } from '../banco-docentes/banco-docentes-sensitive-data';
import { MACRO_DOCENTE_PERMISSION_KEY } from './macro-docente-permission.decorator';

/**
 * Reutiliza PtaPermissionsService (auth.role_permissions / auth.permission)
 * para resolver, en el momento de la petición, si los roles del usuario
 * tienen el permiso pta.macro_docente.* requerido. Rutas sin
 * @RequierePermisoMacroDocente (p. ej. el acceso externo público) pasan
 * directo, igual que BancoDocentesRolesGuard con rutas sin @Roles().
 */
@Injectable()
export class MacroDocentePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly ptaPermissions: PtaPermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(MACRO_DOCENTE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const req = context.switchToHttp().getRequest();
    if (!req?.user) throw new UnauthorizedException('Usuario no autenticado.');

    const roles = getRequestRoleCodes(req.user);
    const ctx = await this.ptaPermissions.resolveForRoles(roles);
    if (ctx.isSuperUser || ctx.permissions.has(requiredPermission)) return true;

    throw new ForbiddenException(
      `No tienes el permiso requerido (${requiredPermission}) para esta acción del Macro Docente.`,
    );
  }
}
