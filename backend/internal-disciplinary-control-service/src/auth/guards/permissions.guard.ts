import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { PermissionsService } from '../services/permissions.service';

const SUPER_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVO', 'SUPER_ADMINISTRADOR'];

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

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
      throw new ForbiddenException('Usuario no autenticado');
    }

    const userRoles = this.extractRoles(user);

    const isSuperAdmin = userRoles.some((role) => {
      if (typeof role !== 'string') return false;
      const normalized = role.toUpperCase().replace(/\s+/g, '_');
      return SUPER_ADMIN_ROLES.includes(normalized);
    });

    if (isSuperAdmin) return true;

    const userPermissions = await this.permissionsService.getPermissionsByRoles(userRoles);

    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission.toLowerCase()),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes permisos para esta acción. Se requiere: ${requiredPermissions.join(' o ')}`,
      );
    }

    return true;
  }

  private extractRoles(user: any): string[] {
    const roles = user?.roles ?? [];
    return roles.map((r: any) =>
      typeof r === 'string' ? r : r?.code || r?.name || '',
    ).filter(Boolean);
  }
}
