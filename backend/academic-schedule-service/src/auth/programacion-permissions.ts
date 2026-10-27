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
 * Publicar y retirar la publicación de los niveles que se programan
 * (EFDS-2303, migración 034). Lo tienen los programadores y el administrador.
 */
export const PERMISO_PUBLICAR = 'programacion-academica.publicar';

/**
 * Permisos del PORTAL del docente (EFDS-1938). Viven bajo el prefijo
 * `portal-transaccional`, no bajo el del backoffice: DOCENTE se sacó del
 * backoffice en la migración 028 y solo entra por el portal.
 */
export const PERMISO_PORTAL_VER = 'portal-transaccional.programacion-academica.view';
export const PERMISO_PORTAL_TOMAR = 'portal-transaccional.programacion-academica.tomar';

/**
 * Asignar el docente de los grupos ya programados — EFDS-2342 (migración 060).
 * Es del rol PROGRAMADOR_DOCENTE_<NIVEL>, con la misma segregación por nivel que
 * los programadores (RN-08). ⚠️ NO da derecho a programar: quien asigna ve la
 * programación de su nivel pero no crea ni cambia grupos, franjas ni ciclos.
 */
export const PERMISO_ASIGNACION_POR_NIVEL: Record<NivelAcademico, string> = {
  pregrado: 'programacion-academica.asignacion-docente.pregrado',
  posgrado: 'programacion-academica.asignacion-docente.posgrado',
};

const NIVELES: NivelAcademico[] = ['pregrado', 'posgrado'];

function nivelesCon(permisos: ReadonlySet<string>, porNivel: Record<NivelAcademico, string>): NivelAcademico[] {
  if (permisos.has(PERMISO_PROGRAMACION_ALL)) return [...NIVELES];
  return NIVELES.filter((nivel) => permisos.has(porNivel[nivel]));
}

/** Niveles que puede PROGRAMAR (crear y cambiar grupos, franjas, ciclos). */
export function nivelesProgramables(permisos: ReadonlySet<string>): NivelAcademico[] {
  return nivelesCon(permisos, PERMISO_CATALOGO_POR_NIVEL);
}

/** Niveles en los que puede ASIGNAR docentes a los grupos (EFDS-2342). */
export function nivelesAsignables(permisos: ReadonlySet<string>): NivelAcademico[] {
  return nivelesCon(permisos, PERMISO_ASIGNACION_POR_NIVEL);
}

/**
 * Niveles cuya programación puede VER: los que programa más los que asigna. Es
 * la segregación de las lecturas; las escrituras usan `nivelesProgramables` o
 * `nivelesAsignables`, según lo que hagan.
 */
export function nivelesVisibles(permisos: ReadonlySet<string>): NivelAcademico[] {
  const ver = new Set([...nivelesProgramables(permisos), ...nivelesAsignables(permisos)]);
  return NIVELES.filter((n) => ver.has(n));
}

/** ¿Puede ver la programación de este nivel? Fail-closed: sin permiso, no. */
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

/** ¿Puede asignar docentes en algún nivel? */
export function puedeAsignarDocentes(permisos: ReadonlySet<string>): boolean {
  return nivelesAsignables(permisos).length > 0;
}
