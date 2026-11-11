import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { normalizeRoles } from './hiring-access';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Tu sesión no está activa: vuelve a iniciar sesión');

    const userRoles = normalizeRoles(user.roles ?? user.role);
    const required = requiredRoles.map((r) => r.toUpperCase().trim());

    if (!required.some((role) => userRoles.includes(role))) {
      throw new ForbiddenException(
        `No tienes permiso para esta acción: solo la hacen los roles ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
