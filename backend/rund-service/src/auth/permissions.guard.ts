import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthIdentityClient } from '../common/auth-identity.client';
import { PERMISSIONS_KEY, IS_PUBLIC_KEY } from './auth.decorators';
import { getRequestRoleCodes } from '../modules/banco-docentes/banco-docentes-sensitive-data';
import { resolveRundRequestPermissions } from './rund-effective-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private readonly identities: AuthIdentityClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) {
      return false;
    }

    // Superadmins bypass explicit permission checks
    const userRoles = getRequestRoleCodes(user);
    if (userRoles.includes('SUPER_ADMIN') || userRoles.includes('SUPERADMIN') || userRoles.includes('ADMIN_SISTEMA')) {
      return true;
    }

    const permissions = await resolveRundRequestPermissions(this.identities, request);
    return requiredPermissions.some((perm) => permissions.has(perm));
  }
}
