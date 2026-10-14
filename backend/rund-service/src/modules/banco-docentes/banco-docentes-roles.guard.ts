import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../../auth/roles.decorator';
import { RUND_PERMISSIONS_KEY } from './rund-permissions';
import { resolveRundRequestPermissions } from '../../auth/rund-effective-permissions';

/**
 * Autoriza rutas RUND por rol de sistema o por permisos administrables.
 * Los permisos se resuelven desde auth.role_permissions y nunca desde el body.
 */
@Injectable()
export class BancoDocentesRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(RUND_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length && !requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) throw new ForbiddenException('Usuario no autenticado');

    const normalizeRole = (role: any) => String(
      typeof role === 'string' ? role : role?.code || '',
    ).trim().toUpperCase();
    const required = new Set((requiredRoles || []).map(normalizeRole).filter(Boolean));
    const userRoles = (Array.isArray(user.roles) ? user.roles : [user.role])
      .map(normalizeRole)
      .filter(Boolean);
    const isSuperAdmin = userRoles.some((role: string) => role === 'SUPER_ADMIN');
    const roleAllowed = userRoles.some((role: string) => required.has(role));

    let effectivePermissions = new Set<string>();
    if (requiredPermissions?.length && !isSuperAdmin) {
      effectivePermissions = await resolveRundRequestPermissions(this.dataSource, request);
    }
    request.rundPermissions = effectivePermissions;

    const permissionAllowed = isSuperAdmin || (requiredPermissions || [])
      .some((permission) => effectivePermissions.has(permission));
    if (roleAllowed || permissionAllowed) return true;

    const requirements = [
      requiredRoles?.length ? `roles: ${requiredRoles.join(', ')}` : '',
      requiredPermissions?.length ? `permisos: ${requiredPermissions.join(', ')}` : '',
    ].filter(Boolean).join(' o ');
    throw new ForbiddenException(`No tienes autorización para esta operación RUND (${requirements}).`);
  }

}
