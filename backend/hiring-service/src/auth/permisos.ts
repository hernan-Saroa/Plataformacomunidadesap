/**
 * Los permisos transversales del módulo de Contratación.
 *
 * Desde la migración 083 casi todo se autoriza por acción y lugar: cuatro
 * permisos de acción —`contratacion.ver`, `.editar`, `.aprobar`, `.decidir`—
 * y el alcance de cada rol en `hiring.alcances_permiso`, que evalúa
 * `@Puede(acción, lugar)` (ver `alcance.ts` y `puede.guard.ts`).
 *
 * Quedan aquí los cinco que no son de ninguna etapa y conservan su código.
 * Siguen evaluándose con `@Permisos` y `PermisosGuard`. Los treinta y un
 * códigos que la 083 reemplazó los desactivó la 084.
 *
 * Los permisos son del código y los roles son datos: el administrador crea,
 * renombra y combina roles desde la plataforma y decide cuál de ellos otorga
 * cada permiso. Por eso los endpoints nombran permisos y no roles.
 */

import { normalizeRoles } from './hiring-access';

// -------------------------------------------------------------- catálogo --

/**
 * Consultar cualquier proceso de la entidad, no solo los propios.
 *
 * No es de ninguna etapa: dice sobre qué procesos se trabaja, no qué se puede
 * hacer en ellos. Qué etapas de esos procesos ve cada quien lo sigue diciendo
 * su alcance.
 */
export const PERMISO_PROCESO_VER_TODOS = 'contratacion.proceso.view-all';

/** Repartir los procesos entre los abogados de la Dirección. */
export const PERMISO_PROCESO_ASIGNAR = 'contratacion.proceso.assign';

/** Administrar la matriz de actividades, las tipologías, los umbrales y los alcances. */
export const PERMISO_CONFIG_ADMINISTRAR = 'contratacion.config.manage';

/** Consultar los informes y las estadísticas del módulo (EFDS-1189). */
export const PERMISO_REPORTE_VER = 'contratacion.reporte.view';

/**
 * Dar por terminado un plazo que sigue corriendo, para poder probar el flujo.
 *
 * Los dos términos que bloquean —el de publicidad del pliego (5.6) y el de
 * subsanaciones (6.5)— duran días hábiles reales. No finge que el plazo
 * venció: mueve la fecha de vencimiento a ayer y deja traza de quién lo hizo.
 *
 * Solo el superadministrador. No es una competencia del negocio —ningún rol de
 * la matriz acorta un término legal— sino una llave de pruebas.
 */
export const PERMISO_PLAZO_TERMINAR = 'contratacion.plazo.terminar';

/**
 * Borrar un proceso con todo lo suyo: actividades, documentos, trazabilidad.
 *
 * Solo el superadministrador (108). No deja nada en la base —la trazabilidad
 * se va con el proceso—, así que es para limpiar lo que nunca debió existir,
 * no para terminar uno: para eso están cancelar, negar y declarar desierto.
 */
export const PERMISO_PROCESO_BORRAR = 'contratacion.proceso.delete';

/**
 * Los permisos que no dependen de ninguna etapa y la 083 conserva con su
 * código. Todo lo demás se autoriza por acción y alcance (`@Puede`).
 */
export const PERMISOS_TRANSVERSALES = [
  PERMISO_PROCESO_VER_TODOS,
  PERMISO_PROCESO_ASIGNAR,
  PERMISO_CONFIG_ADMINISTRAR,
  PERMISO_REPORTE_VER,
  PERMISO_PLAZO_TERMINAR,
  PERMISO_PROCESO_BORRAR,
] as const;

// ------------------------------------------------- de dónde salen hoy --

/**
 * El respaldo mientras el token no traiga los permisos.
 *
 * auth-service ya los calcula al iniciar sesión, pero arma el JWT solo con
 * `roles`: hasta que el payload los incluya, cada permiso declara qué roles lo
 * tenían en el catálogo, y `PermisosGuard` consulta además
 * `auth.role_permissions`, que es la fuente que manda.
 *
 * Solo los transversales: los permisos de acción no tienen respaldo en código a
 * propósito. Su alcance vive en la base, y un rol creado desde el backoffice
 * tiene que funcionar sin que el código lo nombre.
 */
// Los roles por defecto de la 137: la Directora lo tiene todo y el Secretario
// recibe y reparte, así que ve toda la entidad y sus informes.
export const ROLES_QUE_OTORGAN: Record<string, string[]> = {
  [PERMISO_PROCESO_VER_TODOS]: ['DIRECTORA_DE_CONTRATACION', 'SECRETARIO_DE_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_ASIGNAR]: ['DIRECTORA_DE_CONTRATACION', 'SECRETARIO_DE_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_CONFIG_ADMINISTRAR]: ['DIRECTORA_DE_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_REPORTE_VER]: ['DIRECTORA_DE_CONTRATACION', 'SECRETARIO_DE_CONTRATACION', 'SUPER_ADMIN'],
  // Las llaves de pruebas: la Directora también las tiene desde la 137.
  [PERMISO_PLAZO_TERMINAR]: ['DIRECTORA_DE_CONTRATACION', 'SUPER_ADMIN'],
  [PERMISO_PROCESO_BORRAR]: ['DIRECTORA_DE_CONTRATACION', 'SUPER_ADMIN'],
};

/**
 * Los permisos que tiene el usuario del token.
 *
 * Prefiere los que venga declarando el propio token y solo cae al mapa de roles
 * cuando no los trae. Así el día que auth-service los incluya, el módulo pasa a
 * usarlos sin cambiar nada más.
 */
export function permisosDelUsuario(user: any): string[] {
  const delToken: unknown = user?.permissions ?? user?.permisos;
  if (Array.isArray(delToken) && delToken.length) {
    return delToken.filter((p): p is string => typeof p === 'string');
  }

  const roles = normalizeRoles(user?.roles ?? user?.role);

  return Object.entries(ROLES_QUE_OTORGAN)
    .filter(([, otorgan]) => otorgan.some((rol) => roles.includes(rol)))
    .map(([permiso]) => permiso);
}

/** Si el usuario tiene un permiso transversal, para decidirlo fuera de un guard. */
export function tienePermiso(user: any, permiso: string): boolean {
  return permisosDelUsuario(user).includes(permiso);
}
