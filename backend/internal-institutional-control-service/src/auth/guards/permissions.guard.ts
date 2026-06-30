import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PermissionsService } from '../services/permissions.service';

// Roles que tienen TODOS los permisos (superusuarios)
const SUPER_ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'ADMINISTRATIVO', 'Super Administrador', 'SUPER_ADMINISTRADOR', 'super_administrador'];

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
    if (isPublic) {
      return true;
    }

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // console.log(
    //   '🔐 [PermissionsGuard] Required permissions:',
    //   requiredPermissions,
    // );

    // Si no hay permisos requeridos, permitir acceso
    if (!requiredPermissions || requiredPermissions.length === 0) {
      console.log(
        '✅ [PermissionsGuard] No permissions required, access granted',
      );
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    console.log('🔐 [PermissionsGuard] User:', user?.username, 'Roles:', user?.roles);

    if (!user) {
      console.log('❌ [PermissionsGuard] No user in request');
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Extraer roles del usuario (pueden venir como strings o como objetos)
    const userRoles = this.extractRoles(user);
    console.log('🔐 [PermissionsGuard] Extracted roles:', userRoles);

    // Verificar si es superusuario (tiene acceso a todo)
    const isSuperAdmin = userRoles.some((role) => {
      if (typeof role !== 'string') return false;
      const normalized = role.toUpperCase().replace(/\s+/g, '_');
      return SUPER_ADMIN_ROLES.includes(normalized) || SUPER_ADMIN_ROLES.includes(role.toUpperCase());
    });

    if (isSuperAdmin) {
      console.log('✅ [PermissionsGuard] Super admin, access granted');
      return true;
    }

    // Consultar permisos desde la base de datos basándose en los roles
    const userPermissions = await this.permissionsService.getPermissionsByRoles(userRoles);
    // console.log('🔐 [PermissionsGuard] User permissions from DB:', userPermissions);

    // Verificar si el usuario tiene AL MENOS UNO de los permisos requeridos
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission.toLowerCase()),
    );

    console.log(
      hasPermission
        ? '✅ [PermissionsGuard] Access GRANTED'
        : '❌ [PermissionsGuard] Access DENIED',
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `No tienes permisos para esta acción. Se requiere: ${requiredPermissions.join(' o ')}`,
      );
    }

    return true;
  }

  /**
   * Extrae los roles del usuario desde diferentes formatos posibles
   */
  private extractRoles(user: any): string[] {
    const roles: string[] = [];

    // Roles como array
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

    // Rol único
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
