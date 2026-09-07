import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

const SUPER_ADMIN_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'ADMINISTRATIVO',
  'Super Administrador',
  'SUPER_ADMINISTRADOR',
  'super_administrador',
];

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    const userRoles = this.extractRoles(user);
    const isSuperAdmin = userRoles.some((role) => {
      if (typeof role !== 'string') return false;
      const normalized = role.toUpperCase().replace(/\s+/g, '_');
      return (
        SUPER_ADMIN_ROLES.includes(normalized) ||
        SUPER_ADMIN_ROLES.includes(role.toUpperCase())
      );
    });

    if (isSuperAdmin) {
      return true;
    }

    if (!user.permissions) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    const userPermissions = new Set(user.permissions);
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso.',
      );
    }

    return true;
  }

  private extractRoles(user: any): string[] {
    const roles: string[] = [];

    if (Array.isArray(user.roles)) {
      user.roles.forEach((role: any) => {
        if (typeof role === 'string') {
          roles.push(role);
        } else if (role?.code) {
          roles.push(role.code);
        } else if (role?.name) {
          roles.push(role.name);
        }
      });
    }

    if (user.role) {
      if (typeof user.role === 'string') {
        roles.push(user.role);
      } else if (user.role?.code) {
        roles.push(user.role.code);
      }
    }

    return roles;
  }
}
