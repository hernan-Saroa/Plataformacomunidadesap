/**
 * Fuente única (backend) del mapeo componente PTA → permiso granular y nivel de
 * aprobación. Debe mantenerse en espejo con:
 *   - Frontend: apps/mfe-pta/src/components/pta/shared/ptaComponentPermissions.ts
 *   - Migraciones: 326 (aprobador_N1/N2/N3), 327 (pta.approve.*), 362 (asignación a roles)
 *
 * El objetivo es que la autorización de aprobación por componente se resuelva en
 * el servidor a partir de los permisos reales del usuario (auth.role_permissions),
 * y NO a partir de flags que envíe el cliente en el body.
 */

export type PTAComponentKey =
  | 'academica'
  | 'complementarias'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno'
  | 'academicas_admin';

/** Todas las claves de componente aprobable, en orden estable. */
export const PTA_COMPONENT_KEYS: PTAComponentKey[] = [
  'academica',
  'complementarias',
  'investigacion',
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
  'academicas_admin',
];

/** Componente → permiso granular que habilita su aprobación. */
export const COMPONENT_PERMISSION: Record<PTAComponentKey, string> = {
  academica: 'pta.approve.academica',
  complementarias: 'pta.approve.complementarias',
  investigacion: 'pta.approve.investigacion',
  ext_capacitacion: 'pta.approve.extension.capacitacion',
  ext_procesos: 'pta.approve.extension.procesos_seleccion',
  ext_fortalecimiento: 'pta.approve.extension.fortalecimiento',
  ext_gobierno: 'pta.approve.extension.alto_gobierno',
  academicas_admin: 'pta.approve.academicas_admin',
};

/** Componente → nivel de aprobación (1 = Jefatura, 2 = Decanatura, 3 = Gestión Profesoral). */
export const COMPONENT_LEVEL: Record<PTAComponentKey, 1 | 2 | 3> = {
  academica: 1,
  complementarias: 1,
  investigacion: 2,
  ext_capacitacion: 2,
  ext_procesos: 2,
  ext_fortalecimiento: 2,
  ext_gobierno: 2,
  academicas_admin: 3,
};

/**
 * Permiso "aprueba todo": un rol con este permiso puede aprobar cualquier componente
 * del PTA (rol aprobador integral). Es el equivalente a nivel de permiso de un
 * superusuario PTA, sin ser SUPER_ADMIN del sistema.
 */
export const PTA_APPROVE_ALL = 'pta.approve.all';

/** Códigos de rol que otorgan acceso total (superusuario) al flujo PTA. */
export const SUPER_ADMIN_ROLE_CODES = ['SUPER_ADMIN', 'super_admin'];

/** Devuelve las claves de componente cuyo permiso está presente en el set dado. */
export function componentsFromPermissions(permissions: Set<string>): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter((key) => permissions.has(COMPONENT_PERMISSION[key]));
}
