import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getRequestRoleCodes } from '../modules/banco-docentes/banco-docentes-sensitive-data';
import { RUND_PERMISSION_CODES } from './rund-permission-catalog';

const logger = new Logger('RundEffectivePermissions');
const catalog = new Set<string>(RUND_PERMISSION_CODES);
const requests = new WeakMap<object, Promise<Set<string>>>();

/** Un snapshot por peticion, sin cache entre peticiones ni permisos tomados del JWT/body. */
export function resolveRundRequestPermissions(db: DataSource, request: any): Promise<Set<string>> {
  const previous = requests.get(request);
  if (previous) return previous;
  const pending = resolve(db, getRequestRoleCodes(request.user));
  requests.set(request, pending);
  return pending;
}

async function resolve(db: DataSource, roles: string[]): Promise<Set<string>> {
  if (!roles.length) return new Set<string>();
  try {
    const rows: Array<{ code: string }> = await db.query(
      `SELECT DISTINCT p.code FROM auth.role_permissions rp
       JOIN auth.role r ON r.id = rp.id_rol AND COALESCE(r.is_active, true) = true
       JOIN auth.permission p ON p.id_permission = rp.id_permission AND COALESCE(p.is_active, true) = true
       WHERE COALESCE(rp.is_active, true) = true
         AND UPPER(r.code) = ANY($1::text[]) AND p.code = ANY($2::text[])`,
      [roles, RUND_PERMISSION_CODES],
    );
    return new Set(rows.map((row) => row.code).filter((code) => catalog.has(code)));
  } catch {
    logger.warn('No se pudieron resolver permisos RUND; se deniega el acceso por permiso.');
    return new Set<string>();
  }
}
