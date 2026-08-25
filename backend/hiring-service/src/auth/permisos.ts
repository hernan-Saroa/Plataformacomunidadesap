/**
 * Permisos del módulo de Contratación.
 *
 * Los permisos son del código y los roles son datos: el administrador crea,
 * renombra y combina roles desde la plataforma, y decide cuál de ellos otorga
 * cada permiso. Por eso los endpoints nombran `contratacion.acta_inicio.
 * suscribir` y no `ORDENADOR_GASTO` —ese rol puede llamarse de otra forma
 * mañana, o convivir con otro equivalente, y el endpoint tiene que seguir
 * funcionando—.
 *
 * Los códigos siguen el formato `modulo.recurso.accion` del catálogo de
 * `auth.permission`, donde ya viven los quince primeros de contratación.
 */

import { normalizeRoles } from './hiring-access';

// -------------------------------------------------------------- catálogo --

/** Suscribir el acta de inicio y dar comienzo a la ejecución (EFDS-1167). */
export const PERMISO_ACTA_INICIO_SUSCRIBIR = 'contratacion.acta-inicio.suscribir';

/** Reasignar al supervisor durante la ejecución (EFDS-1169). */
export const PERMISO_SUPERVISION_REASIGNAR = 'contratacion.supervision.reasignar';

/** Cargar informes, actas y soportes del seguimiento (EFDS-1168). */
export const PERMISO_SEGUIMIENTO_CARGAR = 'contratacion.seguimiento.cargar';

/** Consultar el seguimiento de la ejecución (EFDS-1168). */
export const PERMISO_SEGUIMIENTO_VER = 'contratacion.seguimiento.ver';

/** Consultar el expediente del proceso; ya existe en auth.permission. */
export const PERMISO_EXPEDIENTE_VER = 'contratacion.expediente.view';

// ------------------------------------------------- de dónde salen hoy --

/**
 * El respaldo mientras el token no traiga los permisos.
 *
 * auth-service ya los calcula al iniciar sesión, pero arma el JWT solo con
 * `roles` y los descarta: hoy hiring no puede leerlos aunque quiera. Hasta que
 * el payload los incluya, cada permiso declara qué roles lo tenían en el
 * catálogo A4, y este mapa es el único sitio del módulo donde se nombra un rol.
 *
 * Cuando el token traiga `permissions`, `permisosDelUsuario` los usará y este
 * mapa se podrá borrar sin tocar un solo endpoint. Esa es toda la razón de que
 * exista: que el cambio sea de una función y no de noventa y cinco decoradores.
 */
const ROLES_QUE_OTORGAN: Record<string, string[]> = {
  [PERMISO_ACTA_INICIO_SUSCRIBIR]: [
    'SUPERVISOR_CONTRATO',
    'ORDENADOR_GASTO',
    'GESTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  // Más estrecho: reasignar la supervisión es un acto del ordenador, igual que
  // designarla la primera vez.
  [PERMISO_SUPERVISION_REASIGNAR]: ['ORDENADOR_GASTO', 'SUPER_ADMIN'],
  [PERMISO_SEGUIMIENTO_CARGAR]: [
    'SUPERVISOR_CONTRATO',
    'GESTOR_CONTRATACION',
    'SUPER_ADMIN',
  ],
  // La consulta es ancha a propósito: el seguimiento de un contrato lo revisan
  // control interno y la propia Dirección, no solo quien lo carga.
  [PERMISO_SEGUIMIENTO_VER]: [
    'SUPERVISOR_CONTRATO',
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPER_ADMIN',
  ],
  [PERMISO_EXPEDIENTE_VER]: [
    'GESTOR_CONTRATACION',
    'REVISOR_CONTRATACION',
    'DIRECTOR_CONTRATACION',
    'ORDENADOR_GASTO',
    'SUPERVISOR_CONTRATO',
    'SUPER_ADMIN',
  ],
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

/** Si el usuario puede hacer algo, para decidirlo fuera de un guard. */
export function tienePermiso(user: any, permiso: string): boolean {
  return permisosDelUsuario(user).includes(permiso);
}
