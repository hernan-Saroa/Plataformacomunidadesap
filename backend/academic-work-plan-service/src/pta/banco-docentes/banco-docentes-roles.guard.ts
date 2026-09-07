import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RUND_PERMISSIONS_KEY } from './rund-permissions';

/**
 * Autoriza rutas RUND por rol de sistema o por permisos administrables.
 * Los permisos se resuelven desde auth.role_permissions y nunca desde el body.
 */
@Injectable()
export class BancoDocentesRolesGuard implements CanActivate {
  private readonly cache = new Map<string, { at: number; permissions: Set<string> }>();
  private readonly cacheTtlMs = 60_000;

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
      effectivePermissions = await this.resolvePermissions(userRoles);
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

  private async resolvePermissions(roleCodes: string[]): Promise<Set<string>> {
    if (!roleCodes.length) return new Set<string>();
    const cacheKey = roleCodes.slice().sort().join('|');
    const cached = this.cache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.at < this.cacheTtlMs) return cached.permissions;

    try {
      const rows: Array<{ code: string }> = await this.dataSource.query(
        `SELECT DISTINCT p.code
           FROM auth.role_permissions rp
           INNER JOIN auth.role r
             ON r.id = rp.id_rol
            AND COALESCE(r.is_active, TRUE) = TRUE
           INNER JOIN auth.permission p
             ON p.id_permission = rp.id_permission
            AND COALESCE(p.is_active, TRUE) = TRUE
          WHERE COALESCE(rp.is_active, TRUE) = TRUE
            AND UPPER(r.code) = ANY($1::text[])
            AND p.code LIKE 'banco-docentes.rund.%'`,
        [roleCodes],
      );
      const permissions = new Set(rows.map((row) => row.code).filter(Boolean));
      this.cache.set(cacheKey, { at: now, permissions });
      return permissions;
    } catch {
      // Fail-closed para permisos; los roles explícitos conservan compatibilidad.
      return new Set<string>();
    }
  }
}
