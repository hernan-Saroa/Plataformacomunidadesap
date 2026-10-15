import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthIdentityClient } from '../../common/auth-identity.client';
import { resolveRundRequestPermissions } from '../../auth/rund-effective-permissions';
import { getRequestRoleCodes } from '../banco-docentes/banco-docentes-sensitive-data';
import { MACRO_DOCENTE_PERMISSION_KEY } from './macro-docente-permission.decorator';

/**
 * Exige el permiso activo de Macro Docente mediante el resolver compartido de RUND.
 * Se conservan los códigos pta.macro_docente.* y la excepción SUPER_ADMIN. Rutas sin
 * @RequierePermisoMacroDocente (p. ej. el acceso externo público) pasan
 * directo, igual que BancoDocentesRolesGuard con rutas sin @Roles().
 */
@Injectable()
export class MacroDocentePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identities: AuthIdentityClient,
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
    if (roles.includes('SUPER_ADMIN')) return true;
    const permissions = await resolveRundRequestPermissions(this.identities, req);
    if (permissions.has(requiredPermission)) return true;

    throw new ForbiddenException(
      `No tienes el permiso requerido (${requiredPermission}) para esta acción del Macro Docente.`,
    );
  }
}
