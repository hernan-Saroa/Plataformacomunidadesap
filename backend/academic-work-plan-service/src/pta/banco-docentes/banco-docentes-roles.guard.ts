import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RUND_PERMISSIONS_KEY, RUND_READ_ONLY_ACCESS_KEY } from './rund-permissions';
import { expandRundPermissions, isRundReadOnly, RUND_PROFILE_PERMISSIONS } from './rund-permission-policy';
import { recordRundAccess } from './rund-access-audit';

/**
 * Autoriza rutas RUND por rol de sistema o por permisos administrables.
 * Los permisos se resuelven desde auth.role_permissions y nunca desde el body.
 */
@Injectable()
export class BancoDocentesRolesGuard implements CanActivate {
  private readonly cache = new Map<string, { at: number; permissions: Set<string> }>();
  private readonly cacheTtlMs = 60_000;
  private readonly logger = new Logger(BancoDocentesRolesGuard.name);

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
    let userRoles = (Array.isArray(user.roles) ? user.roles : [user.role])
      .map(normalizeRole)
      .filter(Boolean);
    const isSuperAdmin = userRoles.some((role: string) => role === 'SUPER_ADMIN');
    const roleAllowed = userRoles.some((role: string) => required.has(role));

    let effectivePermissions = new Set<string>();
    if (requiredPermissions?.length && !isSuperAdmin) {
      effectivePermissions = await this.resolvePermissions(userRoles);
      // RN-07/CA-09: el JWT dura 1 h y lleva los roles incrustados, así que retirar «Consulta RUND» no lo
      // alcanzaría hasta renovar la sesión. Para este perfil se revalidan en cada petición los roles vigentes.
      if (effectivePermissions.has(RUND_PROFILE_PERMISSIONS.CONSULTA)) {
        userRoles = await this.resolveLiveRoleCodes(user);
        effectivePermissions = await this.resolvePermissions(userRoles);
      }
    }
    request.rundPermissions = effectivePermissions;

    // RN-01/RN-04: el perfil de consulta solo entra a handlers de lectura marcados de forma explícita.
    if (!isSuperAdmin && isRundReadOnly(effectivePermissions)) {
      const readOnlyAllowed = this.reflector.getAllAndOverride<boolean>(RUND_READ_ONLY_ACCESS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) === true;
      if (!readOnlyAllowed) {
        await this.auditReadOnlyDenied(request, userRoles);
        throw new ForbiddenException('El perfil Consulta RUND es de solo lectura: la operación no está permitida.');
      }
    }

    const permissionAllowed = isSuperAdmin || (requiredPermissions || [])
      .some((permission) => effectivePermissions.has(permission));
    // A granular permission can be withdrawn even from a functional administrator.
    // Explicit roles are only the fallback for routes without permission metadata.
    if (isSuperAdmin || (requiredPermissions?.length ? permissionAllowed : roleAllowed)) return true;

    const requirements = [
      requiredRoles?.length ? `roles: ${requiredRoles.join(', ')}` : '',
      requiredPermissions?.length ? `permisos: ${requiredPermissions.join(', ')}` : '',
    ].filter(Boolean).join(' o ');
    throw new ForbiddenException(`No tienes autorización para esta operación RUND (${requirements}).`);
  }

  /** CA-07: el intento queda en la bitácora inmutable; si no se puede registrar, igual se rechaza. */
  private async auditReadOnlyDenied(request: any, roles: string[]): Promise<void> {
    const docenteId = typeof request.params?.id === 'string' ? request.params.id : undefined;
    try {
      await recordRundAccess(this.dataSource, {
        actorId: String(request.user?.userId || request.user?.sub || 'NO_AUTENTICADO'),
        roles,
        fullAccess: false,
        ip: request.ip || request.socket?.remoteAddress,
        endpoint: `INTENTO_NO_PERMITIDO_SOLO_LECTURA ${request.method} ${request.route?.path || request.path}`,
        resourceId: docenteId,
        docenteIds: docenteId ? [docenteId] : [],
        fields: ['OPERACION_NO_PERMITIDA'],
        result: 'DENEGADO',
      });
    } catch (error) {
      this.logger.warn(`No se pudo registrar el intento de modificación de un usuario de solo lectura: ${(error as Error).message}`);
    }
  }

  /** Roles activos hoy de un usuario activo; ante cualquier fallo no concede nada (fail-closed). */
  private async resolveLiveRoleCodes(user: any): Promise<string[]> {
    const userId = String(user?.userId || user?.sub || '').trim();
    if (!userId) return [];
    try {
      const rows: Array<{ code: string }> = await this.dataSource.query(
        `SELECT DISTINCT UPPER(r.code) AS code
           FROM auth.user_roles ur
           INNER JOIN auth."user" u ON u.id_user = ur.id_user AND COALESCE(u.is_active, TRUE) = TRUE
           INNER JOIN auth.role r ON r.id = ur.id_rol AND COALESCE(r.is_active, TRUE) = TRUE
          WHERE ur.id_user = $1 AND COALESCE(ur.is_active, TRUE) = TRUE`,
        [userId],
      );
      return rows.map((row) => String(row.code || '').trim().toUpperCase()).filter(Boolean);
    } catch (error) {
      this.logger.warn(`No se pudieron revalidar los roles vigentes del perfil de consulta: ${(error as Error).message}`);
      return [];
    }
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
      const permissions = expandRundPermissions(rows.map((row) => row.code).filter(Boolean));
      this.cache.set(cacheKey, { at: now, permissions });
      return permissions;
    } catch {
      // Fail-closed para permisos; los roles explícitos conservan compatibilidad.
      return new Set<string>();
    }
  }
}
