import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { PERMISOS_KEY } from '../decorators/permisos.decorator';

/**
 * Autoriza por permisos asignados al rol en Roles y Permisos, no por códigos de
 * rol. El JWT solo trae los códigos de rol, así que los permisos se leen de
 * auth.role_permissions en cada petición.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requeridos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    if (request.user?.internalService) return true;

    const roles = codigosDeRol(request.user?.roles);
    if (roles.length === 0) {
      throw new ForbiddenException('No tiene permisos para esta acción.');
    }

    const filas: { code: string }[] = await this.dataSource.query(
      `SELECT DISTINCT LOWER(p.code) AS code
         FROM auth.permission p
         JOIN auth.role_permissions rp ON rp.id_permission = p.id_permission
         JOIN auth.role r ON r.id = rp.id_rol
        WHERE UPPER(r.code) = ANY($1::text[])
          AND COALESCE(rp.is_active, true) = true
          AND p.is_active = true
          AND LOWER(p.code) = ANY($2::text[])`,
      [roles, requeridos.map((p) => p.toLowerCase())],
    );

    if (filas.length === 0) {
      throw new ForbiddenException('No tiene permisos para esta acción.');
    }
    return true;
  }
}

function codigosDeRol(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((rol: any) => (typeof rol === 'string' ? rol : rol?.code))
    .filter((codigo): codigo is string => typeof codigo === 'string' && codigo.length > 0)
    .map((codigo) => codigo.toUpperCase());
}
