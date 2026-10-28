import { Logger } from '@nestjs/common';
import { AuthIdentityClient } from '../common/auth-identity.client';
import { getRequestRoleCodes } from '../modules/banco-docentes/banco-docentes-sensitive-data';
import { RUND_PERMISSION_CODES } from './rund-permission-catalog';
import { expandRundPermissions } from '../modules/banco-docentes/rund-permission-policy';

const logger = new Logger('RundEffectivePermissions');
const catalog = new Set<string>(RUND_PERMISSION_CODES);
const requests = new WeakMap<object, Promise<Set<string>>>();

/** Un snapshot por peticion, sin cache entre peticiones ni permisos tomados del JWT/body. */
export function resolveRundRequestPermissions(identities: AuthIdentityClient, request: any): Promise<Set<string>> {
  const previous = requests.get(request);
  if (previous) return previous;
  const pending = resolve(identities, getRequestRoleCodes(request.user));
  requests.set(request, pending);
  return pending;
}

async function resolve(identities: AuthIdentityClient, roles: string[]): Promise<Set<string>> {
  if (!roles.length) return new Set<string>();
  try {
    const codes = await identities.permisosRoles(roles);
    return new Set([...expandRundPermissions(codes)].filter((code) => catalog.has(code)));
  } catch {
    logger.warn('No se pudieron resolver permisos RUND; se deniega el acceso por permiso.');
    return new Set<string>();
  }
}
