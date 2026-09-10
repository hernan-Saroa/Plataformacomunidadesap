import { NivelAcademico } from '../catalogo/nivel-academico.js';

/**
 * Permisos de Programación Académica (sembrados en la migración 004, renombrados
 * en la 017).
 *
 * ⚠️ EL PREFIJO ES `programacion-academica`, NO `programacion`. El backoffice
 * deriva el módulo visible del prefijo del permiso (antes del primer punto); con
 * `programacion` no coincidía con el código del módulo `programacion-academica` y
 * el módulo quedaba huérfano en el sidebar. Estos códigos deben coincidir
 * carácter por carácter con los de la migración 017: si cambian aquí, cambian
 * allá, o el RBAC deja de encontrar los permisos.
 *
 * ⚠️ RN-08 segrega el CATÁLOGO por nivel, pero NO la disponibilidad de docentes:
 * ambos perfiles deben verla, porque es lo que hace posible el bloqueo
 * transversal de franjas (RN-07) en la fase 3.
 */
export const PERMISO_CATALOGO_POR_NIVEL: Record<NivelAcademico, string> = {
  pregrado: 'programacion-academica.catalogo.pregrado',
  posgrado: 'programacion-academica.catalogo.posgrado',
};

/** Transversal a los dos niveles: nunca se divide (ver nota de arriba). */
export const PERMISO_DISPONIBILIDAD_DOCENTE = 'programacion-academica.docentes.disponibilidad';

/** Acceso integral al catálogo, análogo a `pta.approve.all`. */
export const PERMISO_PROGRAMACION_ALL = 'programacion-academica.all';

/**
 * Permisos del PORTAL del docente (EFDS-1938). Viven bajo el prefijo
 * `portal-transaccional`, no bajo el del backoffice: DOCENTE se sacó del
 * backoffice en la migración 028 y solo entra por el portal.
 */
export const PERMISO_PORTAL_VER = 'portal-transaccional.programacion-academica.view';
export const PERMISO_PORTAL_TOMAR = 'portal-transaccional.programacion-academica.tomar';

/** Niveles cuyo catálogo puede ver este conjunto de permisos. */
export function nivelesVisibles(permisos: ReadonlySet<string>): NivelAcademico[] {
  if (permisos.has(PERMISO_PROGRAMACION_ALL)) return ['pregrado', 'posgrado'];
  return (Object.keys(PERMISO_CATALOGO_POR_NIVEL) as NivelAcademico[])
    .filter((nivel) => permisos.has(PERMISO_CATALOGO_POR_NIVEL[nivel]));
}

/** ¿Puede ver el catálogo de este nivel? Fail-closed: sin permiso, no. */
export function puedeVerNivel(permisos: ReadonlySet<string>, nivel: NivelAcademico): boolean {
  return nivelesVisibles(permisos).includes(nivel);
}

/**
 * ¿Puede consultar la disponibilidad de docentes? Basta con poder programar
 * CUALQUIER nivel: la ocupación del docente es compartida y no revela qué
 * asignatura la causó (RN-07).
 */
export function puedeVerDisponibilidadDocente(permisos: ReadonlySet<string>): boolean {
  return permisos.has(PERMISO_DISPONIBILIDAD_DOCENTE)
    || permisos.has(PERMISO_PROGRAMACION_ALL)
    || nivelesVisibles(permisos).length > 0;
}
