import { NivelAcademico } from '../catalogo/nivel-academico.js';

/**
 * Permisos de Programación Académica (sembrados en la migración 004).
 *
 * ⚠️ RN-08 segrega el CATÁLOGO por nivel, pero NO la disponibilidad de docentes:
 * ambos perfiles deben verla, porque es lo que hace posible el bloqueo
 * transversal de franjas (RN-07) en la fase 3.
 */
export const PERMISO_CATALOGO_POR_NIVEL: Record<NivelAcademico, string> = {
  pregrado: 'programacion.catalogo.pregrado',
  posgrado: 'programacion.catalogo.posgrado',
};

/** Transversal a los dos niveles: nunca se divide (ver nota de arriba). */
export const PERMISO_DISPONIBILIDAD_DOCENTE = 'programacion.docentes.disponibilidad';

/** Acceso integral al catálogo, análogo a `pta.approve.all`. */
export const PERMISO_PROGRAMACION_ALL = 'programacion.all';

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
