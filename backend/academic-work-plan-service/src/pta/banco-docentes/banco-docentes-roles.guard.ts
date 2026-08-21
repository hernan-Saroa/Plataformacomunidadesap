import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';

/** Guard exclusivo de RUND; acepta códigos de rol sin depender del casing del token. */
@Injectable()
export class BancoDocentesRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Usuario no autenticado');

    const normalizeRole = (role: any) => String(
      typeof role === 'string' ? role : role?.code || '',
    ).trim().toUpperCase();
    const required = new Set(requiredRoles.map(normalizeRole).filter(Boolean));
    const userRoles = (Array.isArray(user.roles) ? user.roles : [user.role])
      .map(normalizeRole)
      .filter(Boolean);

    if (!userRoles.some((role: string) => required.has(role))) {
      throw new ForbiddenException(
        `No tienes permisos. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
