/**
 * Fuente única (backend) del mapeo componente PTA → permiso granular y nivel de
 * aprobación. Debe mantenerse en espejo con:
 *   - Frontend: apps/mfe-pta/src/components/pta/shared/ptaComponentPermissions.ts
 *   - Migraciones: 326 (aprobador_N1/N2/N3), 327 (pta.approve.*), 362 (asignación a roles),
 *     388 (split Docencia en Pregrado/Posgrado)
 *
 * El objetivo es que la autorización de aprobación por componente se resuelva en
 * el servidor a partir de los permisos reales del usuario (auth.role_permissions),
 * y NO a partir de flags que envíe el cliente en el body.
 *
 * Docencia (antes un único componente 'academica') se dividió en dos componentes
 * independientes — 'academica_pregrado' y 'academica_posgrado' — exactamente con
 * el mismo patrón que ya usa Extensión (4 componentes independientes que se
 * agrupan visualmente bajo un solo rótulo "Extensión"). Cada uno exige su propio
 * permiso de aprobación.
 */

export type PTAComponentKey =
  | 'academica_pregrado'
  | 'academica_posgrado'
  | 'complementarias'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno';

/** Todas las claves de componente aprobable, en orden estable. */
export const PTA_COMPONENT_KEYS: PTAComponentKey[] = [
  'academica_pregrado',
  'academica_posgrado',
  'complementarias',
  'investigacion',
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
];

/** Componente → permiso granular que habilita su aprobación. */
export const COMPONENT_PERMISSION: Record<PTAComponentKey, string> = {
  academica_pregrado: 'pta.approve.academica.pregrado',
  academica_posgrado: 'pta.approve.academica.posgrado',
  complementarias: 'pta.approve.complementarias',
  investigacion: 'pta.approve.investigacion',
  ext_capacitacion: 'pta.approve.extension.capacitacion',
  ext_procesos: 'pta.approve.extension.procesos_seleccion',
  ext_fortalecimiento: 'pta.approve.extension.fortalecimiento',
  ext_gobierno: 'pta.approve.extension.alto_gobierno',
};

/** Componente → nivel de aprobación (1 = Jefatura, 2 = Decanatura, 3 = Gestión Profesoral). */
export const COMPONENT_LEVEL: Record<PTAComponentKey, 1 | 2 | 3> = {
  academica_pregrado: 1,
  academica_posgrado: 1,
  complementarias: 1,
  investigacion: 2,
  ext_capacitacion: 2,
  ext_procesos: 2,
  ext_fortalecimiento: 2,
  ext_gobierno: 2,
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

/**
 * ── Etapa de Revisión (preaprobación) ───────────────────────────────────────────
 * Capa de permisos en paralelo a los de aprobación (COMPONENT_PERMISSION), sin
 * modificarlos: cada componente exige una sub-revisión antes de poder aprobarse.
 * Con Docencia ya dividida en dos componentes reales (pregrado/posgrado), TODOS
 * los componentes son de revisión única ('general') salvo Complementarias, que
 * sigue siendo un único componente de aprobación pero con dos subtipos de
 * contenido (Complementarias a la Docencia / Académico-Administrativas) que
 * exigen revisión por separado.
 *
 * IMPORTANTE: esta implementación solo crea PERMISOS y la lógica que los usa.
 * No crea roles nuevos ni asigna estos permisos a ningún rol — eso lo gestiona
 * el equipo de QA con la administración de roles ya existente.
 *
 * Debe mantenerse en espejo con el frontend:
 *   apps/mfe-pta/src/components/pta/shared/ptaComponentPermissions.ts
 */

export type PTAReviewSubseccionKey =
  | 'general'
  | 'docencia'
  | 'academico_administrativas';

/** Componente → subsecciones de revisión que pueden aplicarle. */
export const REVIEW_SUBSECCIONES_BY_COMPONENT: Record<PTAComponentKey, PTAReviewSubseccionKey[]> = {
  academica_pregrado: ['general'],
  academica_posgrado: ['general'],
  complementarias: ['docencia', 'academico_administrativas'],
  investigacion: ['general'],
  ext_capacitacion: ['general'],
  ext_procesos: ['general'],
  ext_fortalecimiento: ['general'],
  ext_gobierno: ['general'],
};

function reviewKey(componente: PTAComponentKey, subseccion: PTAReviewSubseccionKey): string {
  return `${componente}:${subseccion}`;
}

/**
 * "componente:subseccion" → permiso granular que habilita esa sub-revisión.
 * Los códigos de permiso pta.review.academica.pregrado/posgrado se conservan
 * igual que antes del split (ya existían y pueden estar asignados a roles) —
 * solo cambia la clave de componente a la que se asocian internamente.
 */
export const COMPONENT_REVIEW_PERMISSION: Record<string, string> = {
  [reviewKey('academica_pregrado', 'general')]: 'pta.review.academica.pregrado',
  [reviewKey('academica_posgrado', 'general')]: 'pta.review.academica.posgrado',
  [reviewKey('complementarias', 'docencia')]: 'pta.review.complementarias.docencia',
  [reviewKey('complementarias', 'academico_administrativas')]: 'pta.review.complementarias.academico_administrativas',
  [reviewKey('investigacion', 'general')]: 'pta.review.investigacion',
  [reviewKey('ext_capacitacion', 'general')]: 'pta.review.extension.capacitacion',
  [reviewKey('ext_procesos', 'general')]: 'pta.review.extension.procesos_seleccion',
  [reviewKey('ext_fortalecimiento', 'general')]: 'pta.review.extension.fortalecimiento',
  [reviewKey('ext_gobierno', 'general')]: 'pta.review.extension.alto_gobierno',
};

/** Permiso "revisa todo": análogo a PTA_APPROVE_ALL pero para la etapa de revisión. */
export const PTA_REVIEW_ALL = 'pta.review.all';

/** Permiso granular requerido para revisar una subsección de un componente dado. */
export function reviewPermissionFor(componente: string, subseccion: string): string | undefined {
  return COMPONENT_REVIEW_PERMISSION[`${componente}:${subseccion}`];
}
