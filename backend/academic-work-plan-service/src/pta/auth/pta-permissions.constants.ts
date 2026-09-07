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
  | 'academica_territorial'
  | 'complementarias'
  | 'complementarias_pregrado'
  | 'complementarias_posgrado'
  | 'complementarias_territorial'
  | 'complementarias_gestion_profesoral'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno';

/** Todas las claves de componente aprobable, en orden estable. */
export const PTA_COMPONENT_KEYS: PTAComponentKey[] = [
  'academica_pregrado',
  'academica_posgrado',
  'academica_territorial',
  'complementarias',
  'complementarias_pregrado',
  'complementarias_posgrado',
  'complementarias_territorial',
  'complementarias_gestion_profesoral',
  'investigacion',
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
];

/**
 * Los tres componentes en los que se enruta Complementarias, según el `nivel_programa`
 * configurado por TIPO de actividad (no por instancia, ver clasificarComplementarias en
 * pta.service.ts). 'complementarias' es el catch-all "sin programa asociado" — es el
 * mismo componente/permiso que existía antes del split, sin cambios ni deprecación.
 */
export const COMPLEMENTARIAS_COMPONENT_KEYS: PTAComponentKey[] = [
  'complementarias',
  'complementarias_pregrado',
  'complementarias_posgrado',
  'complementarias_territorial',
  'complementarias_gestion_profesoral',
];

/**
 * EFDS-1353 — Tipo de aprobación de una actividad complementaria, configurable
 * por actividad en Configuración PTA (campo `tipo_aprobacion`):
 *
 *   'gestion_profesoral' (default): flujo único, NO se ramifica por territorial.
 *   'decanatura':                   se abre una aprobación por cada territorial
 *                                   presente en la complementaria; el componente
 *                                   consolida solo cuando todas aprueban.
 *
 * Igual que en Docencia, la territorialidad MANDA sobre el nivel: una actividad
 * marcada como Decanatura va a `complementarias_territorial` aunque tenga
 * nivel_programa pregrado/posgrado (el nivel se conserva como dimensión dentro
 * de la aprobación territorial, ver PtaTerritorialApproval).
 */
export type PTATipoAprobacionComplementaria = 'gestion_profesoral' | 'decanatura';

/** Componentes cuya aprobación/revisión se desagrega por territorial. */
export const TERRITORIAL_COMPONENT_KEYS: PTAComponentKey[] = [
  'academica_territorial',
  'complementarias_territorial',
];

export function isTerritorialComponent(key: string): boolean {
  return (TERRITORIAL_COMPONENT_KEYS as string[]).includes(key);
}

/**
 * Los tres componentes en los que se enruta Docencia. La territorialidad MANDA sobre
 * el nivel: una asignatura dictada en una Dirección Territorial va a
 * `academica_territorial` aunque sea de pregrado o de posgrado (así lo define la
 * matriz del negocio: "REVISOR/APROBADOR PROGRAMA TERRITORIAL" para Chocó, Antioquia,
 * etc., frente a "... PREGRADO/POSGRADO SEDE CENTRAL"). Solo lo dictado en Sede
 * Central se separa por nivel.
 */
export const DOCENCIA_COMPONENT_KEYS: PTAComponentKey[] = [
  'academica_pregrado',
  'academica_posgrado',
  'academica_territorial',
];

export type PTANivelDocencia = 'pregrado' | 'posgrado';

/**
 * `academica_territorial` no tiene un único permiso de aprobación/revisión: se
 * divide por nivel (pregrado/posgrado), igual que Sede Central, para que cada
 * combinación (territorial, nivel) sea una unidad independiente (migración 397).
 * `COMPONENT_PERMISSION`/`COMPONENT_REVIEW_PERMISSION` no pueden expresar esto
 * (mapean 1 componente → 1 permiso), por eso viven aparte y `academica_territorial`
 * se trata como caso especial en `hasComponentPermission`/`hasReviewPermission`.
 */
export const TERRITORIAL_NIVEL_APPROVE_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.approve.academica.territorial.pregrado',
  posgrado: 'pta.approve.academica.territorial.posgrado',
};

export const TERRITORIAL_NIVEL_REVIEW_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.review.academica.territorial.pregrado',
  posgrado: 'pta.review.academica.territorial.posgrado',
};

/**
 * EFDS-1353 — mismo esquema por nivel que Docencia territorial, pero para
 * Complementarias de tipo Decanatura (migración 400).
 */
export const COMPLEMENTARIAS_TERRITORIAL_NIVEL_APPROVE_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.approve.complementarias.territorial.pregrado',
  posgrado: 'pta.approve.complementarias.territorial.posgrado',
};

export const COMPLEMENTARIAS_TERRITORIAL_NIVEL_REVIEW_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.review.complementarias.territorial.pregrado',
  posgrado: 'pta.review.complementarias.territorial.posgrado',
};

/** Componente territorial → permisos por nivel que lo habilitan. */
export const TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT: Record<string, {
  approve: Record<PTANivelDocencia, string>;
  review: Record<PTANivelDocencia, string>;
}> = {
  academica_territorial: {
    approve: TERRITORIAL_NIVEL_APPROVE_PERMISSION,
    review: TERRITORIAL_NIVEL_REVIEW_PERMISSION,
  },
  complementarias_territorial: {
    approve: COMPLEMENTARIAS_TERRITORIAL_NIVEL_APPROVE_PERMISSION,
    review: COMPLEMENTARIAS_TERRITORIAL_NIVEL_REVIEW_PERMISSION,
  },
};

/** Componente → permiso granular que habilita su aprobación. */
export const COMPONENT_PERMISSION: Record<PTAComponentKey, string> = {
  academica_pregrado: 'pta.approve.academica.pregrado',
  academica_posgrado: 'pta.approve.academica.posgrado',
  // Deprecado (migración 397): se conserva solo como referencia informativa en
  // mensajes de error. La autorización real usa TERRITORIAL_NIVEL_APPROVE_PERMISSION
  // vía hasComponentPermission.
  academica_territorial: 'pta.approve.academica.territorial',
  complementarias: 'pta.approve.complementarias',
  // EFDS-1353: permiso propio. Antes reutilizaban el de Docencia
  // (pta.approve.academica.*), por lo que era imposible separar quién revisa
  // Complementarias de quién revisa Docencia. La migración 400 concede el
  // permiso nuevo a quien ya tenía el de Docencia, así nadie pierde acceso.
  complementarias_pregrado: 'pta.approve.complementarias.pregrado',
  complementarias_posgrado: 'pta.approve.complementarias.posgrado',
  // Igual que academica_territorial, la autorización real se resuelve por nivel
  // vía TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT; este código es informativo.
  complementarias_territorial: 'pta.approve.complementarias.territorial',
  complementarias_gestion_profesoral: 'pta.approve.complementarias.gestion_profesoral',
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
  // Territorial la aprueba la Jefatura de la Territorial → mismo nivel 1 que el resto
  // de Docencia.
  academica_territorial: 1,
  complementarias: 1,
  complementarias_pregrado: 1,
  complementarias_posgrado: 1,
  // Decanatura territorial: la resuelve la Decanatura de la territorial → nivel 2.
  complementarias_territorial: 2,
  // Gestión Profesoral es el nivel 3 del organigrama de aprobación.
  complementarias_gestion_profesoral: 3,
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

/**
 * ¿El conjunto de permisos habilita la aprobación del componente dado? Caso
 * especial: `academica_territorial` está habilitado si el usuario tiene
 * CUALQUIERA de los dos permisos por nivel (pregrado/posgrado) — cuál nivel
 * exacto puede aprobar se resuelve aparte, fila por fila (ver
 * assertAlcanceTerritorial en pta.service.ts).
 */
export function hasComponentPermission(permissions: Set<string>, key: PTAComponentKey): boolean {
  const porNivel = TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT[key];
  if (porNivel) {
    return permissions.has(porNivel.approve.pregrado)
      || permissions.has(porNivel.approve.posgrado);
  }
  return permissions.has(COMPONENT_PERMISSION[key]);
}

/** Devuelve las claves de componente cuyo permiso está presente en el set dado. */
export function componentsFromPermissions(permissions: Set<string>): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter((key) => hasComponentPermission(permissions, key));
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
  academica_territorial: ['general'],
  complementarias: ['docencia', 'academico_administrativas'],
  complementarias_pregrado: ['docencia', 'academico_administrativas'],
  complementarias_posgrado: ['docencia', 'academico_administrativas'],
  complementarias_territorial: ['docencia', 'academico_administrativas'],
  complementarias_gestion_profesoral: ['docencia', 'academico_administrativas'],
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
  // Deprecado (migración 397): se conserva solo como referencia informativa. La
  // autorización real de 'academica_territorial:general' usa
  // TERRITORIAL_NIVEL_REVIEW_PERMISSION vía hasReviewPermission.
  [reviewKey('academica_territorial', 'general')]: 'pta.review.academica.territorial',
  [reviewKey('complementarias', 'docencia')]: 'pta.review.complementarias.docencia',
  [reviewKey('complementarias', 'academico_administrativas')]: 'pta.review.complementarias.academico_administrativas',
  // EFDS-1353: permisos de revisión propios (antes reutilizaban los de Docencia,
  // ver COMPONENT_PERMISSION). Migración 400 los concede a quien ya revisaba
  // Docencia del mismo nivel.
  [reviewKey('complementarias_pregrado', 'docencia')]: 'pta.review.complementarias.pregrado',
  [reviewKey('complementarias_pregrado', 'academico_administrativas')]: 'pta.review.complementarias.pregrado',
  [reviewKey('complementarias_posgrado', 'docencia')]: 'pta.review.complementarias.posgrado',
  [reviewKey('complementarias_posgrado', 'academico_administrativas')]: 'pta.review.complementarias.posgrado',
  // Territorial: informativo; la autorización real se resuelve por nivel vía
  // TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT (igual que academica_territorial).
  [reviewKey('complementarias_territorial', 'docencia')]: 'pta.review.complementarias.territorial',
  [reviewKey('complementarias_territorial', 'academico_administrativas')]: 'pta.review.complementarias.territorial',
  [reviewKey('complementarias_gestion_profesoral', 'docencia')]: 'pta.review.complementarias.gestion_profesoral',
  [reviewKey('complementarias_gestion_profesoral', 'academico_administrativas')]: 'pta.review.complementarias.gestion_profesoral',
  [reviewKey('investigacion', 'general')]: 'pta.review.investigacion',
  [reviewKey('ext_capacitacion', 'general')]: 'pta.review.extension.capacitacion',
  [reviewKey('ext_procesos', 'general')]: 'pta.review.extension.procesos_seleccion',
  [reviewKey('ext_fortalecimiento', 'general')]: 'pta.review.extension.fortalecimiento',
  [reviewKey('ext_gobierno', 'general')]: 'pta.review.extension.alto_gobierno',
};

/** Permiso "revisa todo": análogo a PTA_APPROVE_ALL pero para la etapa de revisión. */
export const PTA_REVIEW_ALL = 'pta.review.all';

/**
 * ¿El conjunto de permisos habilita la revisión de esta subsección? Mismo caso
 * especial que hasComponentPermission: en los componentes territoriales
 * (Docencia y, desde EFDS-1353, Complementarias de tipo Decanatura) basta
 * cualquiera de los dos permisos por nivel; cuál nivel concreto puede revisar
 * se resuelve fila por fila en pta.service.ts.
 */
export function hasReviewPermission(permissions: Set<string>, componente: string, subseccion: string): boolean {
  const porNivel = TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT[componente];
  if (porNivel) {
    return permissions.has(porNivel.review.pregrado)
      || permissions.has(porNivel.review.posgrado);
  }
  const permission = COMPONENT_REVIEW_PERMISSION[`${componente}:${subseccion}`];
  return !!permission && permissions.has(permission);
}

/** Permiso granular requerido para revisar una subsección de un componente dado. */
export function reviewPermissionFor(componente: string, subseccion: string): string | undefined {
  const porNivel = TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT[componente];
  if (porNivel) {
    return `${porNivel.review.pregrado} o ${porNivel.review.posgrado}`;
  }
  return COMPONENT_REVIEW_PERMISSION[`${componente}:${subseccion}`];
}
