import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, IS_PUBLIC_KEY } from './auth.decorators';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }

    // Superadmins bypass explicit permission checks
    const userRoles: string[] = (user.roles || []).map((r: string) => r.toUpperCase());
    if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN_SISTEMA')) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    return requiredPermissions.some((perm) => userPermissions.includes(perm));
  }
}
