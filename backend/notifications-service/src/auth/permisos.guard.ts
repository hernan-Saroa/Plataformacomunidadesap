import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export const PERMISOS_KEY = 'permisos';

/** Permisos (auth.permission.code) que habilitan el endpoint; basta con tener uno. */
export const RequierePermisos = (...permisos: string[]) => SetMetadata(PERMISOS_KEY, permisos);

export function codigosDeRol(roles: unknown): string[] {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((rol: any) => (typeof rol === 'string' ? rol : rol?.code))
    .filter((codigo): codigo is string => typeof codigo === 'string' && codigo.length > 0)
    .map((codigo) => codigo.toUpperCase());
}

/** Códigos de permiso, de los pedidos, que tiene alguno de esos roles. */
export async function permisosDeRoles(dataSource: DataSource, roles: string[], pedidos: string[]): Promise<string[]> {
  if (!roles.length || !pedidos.length) return [];
  const filas: { code: string }[] = await dataSource.query(
    `SELECT DISTINCT LOWER(p.code) AS code
       FROM auth.permission p
       JOIN auth.role_permissions rp ON rp.id_permission = p.id_permission
       JOIN auth.role r ON r.id = rp.id_rol
      WHERE UPPER(r.code) = ANY($1::text[])
        AND COALESCE(rp.is_active, true) = true
        AND p.is_active = true
        AND LOWER(p.code) = ANY($2::text[])`,
    [roles, pedidos.map((p) => p.toLowerCase())],
  );
  return filas.map((f) => f.code);
}

/**
 * Autoriza por permisos asignados al rol en Roles y Permisos, igual que el
 * guard de auth-service: el JWT solo trae los códigos de rol y los permisos se
 * leen de auth.role_permissions (misma base de datos) en cada petición.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requeridos = this.reflector.getAllAndOverride<string[]>(PERMISOS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) return true;

    const roles = codigosDeRol(context.switchToHttp().getRequest().user?.roles);
    const tiene = await permisosDeRoles(this.dataSource, roles, requeridos);
    if (tiene.length === 0) {
      throw new ForbiddenException('No tiene permisos para esta acción.');
    }
    return true;
  }
}
