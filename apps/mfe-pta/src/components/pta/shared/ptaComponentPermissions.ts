// Docencia (antes un único 'academica') se dividió en dos componentes reales —
// 'academica_pregrado' y 'academica_posgrado' — con el mismo patrón que ya usa
// Extensión (varios componentes independientes agrupados bajo un solo rótulo
// visible "Docencia"/"Extensión"). Espejo exacto del backend:
// backend/academic-work-plan-service/src/pta/auth/pta-permissions.constants.ts
export type PTAComponentKey =
  | 'academica_pregrado'
  | 'academica_posgrado'
  | 'academica_territorial'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno'
  | 'complementarias'
  | 'complementarias_pregrado'
  | 'complementarias_posgrado'
  | 'complementarias_territorial'
  | 'complementarias_gestion_profesoral';

export const PTA_COMPONENT_PERMISSION: Record<PTAComponentKey, string> = {
  academica_pregrado: 'pta.approve.academica.pregrado',
  academica_posgrado: 'pta.approve.academica.posgrado',
  // Asignaturas dictadas en Direcciones Territoriales: la territorialidad manda
  // sobre el nivel (van aquí aunque sean de pregrado o posgrado).
  academica_territorial: 'pta.approve.academica.territorial',
  investigacion: 'pta.approve.investigacion',
  ext_capacitacion: 'pta.approve.extension.capacitacion',
  ext_procesos: 'pta.approve.extension.procesos_seleccion',
  ext_fortalecimiento: 'pta.approve.extension.fortalecimiento',
  ext_gobierno: 'pta.approve.extension.alto_gobierno',
  // 'complementarias' cubre ambas secciones: complementarias a la docencia y
  // académico-administrativas (AADM se fusionó como sección de complementarias).
  // Es el catch-all "sin programa asociado" (ver COMPLEMENTARIAS_COMPONENT_KEYS).
  complementarias: 'pta.approve.complementarias',
  // EFDS-1353: permiso propio (antes reutilizaban el de Docencia por nivel, lo
  // que hacía imposible separar quién revisa Complementarias de quién revisa
  // Docencia). El ámbito lo define el tipo de actividad en comp_actividades_v2
  // — ver clasificarComplementarias en el backend.
  complementarias_pregrado: 'pta.approve.complementarias.pregrado',
  complementarias_posgrado: 'pta.approve.complementarias.posgrado',
  // Decanatura (Territorial): informativo; la autorización real se resuelve por
  // nivel, igual que academica_territorial.
  complementarias_territorial: 'pta.approve.complementarias.territorial',
  complementarias_gestion_profesoral: 'pta.approve.complementarias.gestion_profesoral',
};

export const PTA_COMPONENT_KEYS = Object.keys(PTA_COMPONENT_PERMISSION) as PTAComponentKey[];

export type PTANivelDocencia = 'pregrado' | 'posgrado';

/**
 * 'academica_territorial' no tiene un único permiso de aprobación/revisión: se
 * divide por nivel (pregrado/posgrado), igual que Sede Central, para que cada
 * combinación (territorial, nivel) sea una unidad de decisión independiente
 * (backend: migración 397, pta-permissions.constants.ts).
 * PTA_COMPONENT_PERMISSION/PTA_COMPONENT_REVIEW_PERMISSION no pueden expresar
 * esto (mapean 1 componente → 1 permiso); por eso viven aparte y
 * 'academica_territorial' se trata como caso especial en
 * hasComponentPermission/hasReviewPermission.
 */
export const PTA_TERRITORIAL_NIVEL_APPROVE_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.approve.academica.territorial.pregrado',
  posgrado: 'pta.approve.academica.territorial.posgrado',
};

export const PTA_TERRITORIAL_NIVEL_REVIEW_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.review.academica.territorial.pregrado',
  posgrado: 'pta.review.academica.territorial.posgrado',
};

/** EFDS-1353: mismo esquema por nivel para Complementarias de tipo Decanatura. */
export const PTA_COMPLEMENTARIAS_TERRITORIAL_NIVEL_APPROVE_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.approve.complementarias.territorial.pregrado',
  posgrado: 'pta.approve.complementarias.territorial.posgrado',
};

export const PTA_COMPLEMENTARIAS_TERRITORIAL_NIVEL_REVIEW_PERMISSION: Record<PTANivelDocencia, string> = {
  pregrado: 'pta.review.complementarias.territorial.pregrado',
  posgrado: 'pta.review.complementarias.territorial.posgrado',
};

/** Componente territorial → permisos por nivel. Espejo del backend. */
export const PTA_TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT: Record<string, {
  approve: Record<PTANivelDocencia, string>;
  review: Record<PTANivelDocencia, string>;
}> = {
  academica_territorial: {
    approve: PTA_TERRITORIAL_NIVEL_APPROVE_PERMISSION,
    review: PTA_TERRITORIAL_NIVEL_REVIEW_PERMISSION,
  },
  complementarias_territorial: {
    approve: PTA_COMPLEMENTARIAS_TERRITORIAL_NIVEL_APPROVE_PERMISSION,
    review: PTA_COMPLEMENTARIAS_TERRITORIAL_NIVEL_REVIEW_PERMISSION,
  },
};

/**
 * ¿El predicado de permisos habilita la aprobación del componente dado? Caso
 * especial: 'academica_territorial' está habilitado si el usuario tiene
 * CUALQUIERA de los dos permisos por nivel — cuál nivel exacto puede tocar se
 * resuelve aparte, por asignatura (ver PTADetallePanelBackoffice). Espejo de
 * hasComponentPermission en el backend.
 */
export function hasComponentPermission(
  can: (permission: string) => boolean,
  key: PTAComponentKey,
): boolean {
  const porNivel = PTA_TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT[key];
  if (porNivel) {
    return can(porNivel.approve.pregrado) || can(porNivel.approve.posgrado);
  }
  return can(PTA_COMPONENT_PERMISSION[key]);
}

/** Componentes que en conjunto forman el rótulo visible "Docencia". */
export const PTA_DOCENCIA_COMPONENT_KEYS: PTAComponentKey[] = [
  'academica_pregrado',
  'academica_posgrado',
  'academica_territorial',
];

/**
 * Componentes que en conjunto forman el rótulo visible "Complementarias".
 * 'complementarias' es el catch-all "sin programa asociado"; los otros dos se
 * enrutan según el `nivel_programa` configurado por TIPO de actividad.
 */
export const PTA_COMPLEMENTARIAS_COMPONENT_KEYS: PTAComponentKey[] = [
  'complementarias',
  'complementarias_pregrado',
  'complementarias_posgrado',
  'complementarias_territorial',
  'complementarias_gestion_profesoral',
];

/**
 * Permiso de aprobador integral ("aprueba todo"): habilita la aprobación de todos
 * los componentes del PTA. Espejo de pta-permissions.constants.ts en el backend.
 */
export const PTA_APPROVE_ALL_PERMISSION = 'pta.approve.all';

export const PTA_EXTENSION_COMPONENT_KEYS: PTAComponentKey[] = [
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
];

export const PTA_COMPONENT_LEVELS: Record<PTAComponentKey, number> = {
  academica_pregrado: 1,
  academica_posgrado: 1,
  academica_territorial: 1,
  complementarias: 1,
  complementarias_pregrado: 1,
  complementarias_posgrado: 1,
  complementarias_territorial: 2,
  complementarias_gestion_profesoral: 3,
  investigacion: 2,
  ext_capacitacion: 2,
  ext_procesos: 2,
  ext_fortalecimiento: 2,
  ext_gobierno: 2,
};

export function componentKeysForApprovalLevel(level: number): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter(key => PTA_COMPONENT_LEVELS[key] === level);
}

// ═══════════════════════════════════════════════════════════════════════════
// Aprobación masiva — un botón por cada permiso granular de aprobación (no un
// botón único "aprobar todo"). La agrupación es puramente de UI: la
// autorización real sigue ocurriendo por componente individual en el backend
// (ver aprobarComponentesLote en pta.service.ts), así que estos grupos no se
// espejan allá — el backend no necesita saber que "Pregrado" existe como
// concepto, solo qué componentes puede aprobar cada permiso.
// ═══════════════════════════════════════════════════════════════════════════

export type PTABulkApprovalGroupKey =
  | 'docencia_pregrado'
  | 'docencia_posgrado'
  | 'docencia_territorial'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno'
  | 'complementarias';

export type PTABulkApprovalGroup = {
  key: PTABulkApprovalGroupKey;
  label: string;
  /** Permiso que habilita el botón (visibilidad). */
  permission: string;
  /** Componentes reales que el botón aprueba en cada PTA seleccionado. */
  componentKeys: PTAComponentKey[];
  /** Color de texto/ícono del botón — el mismo que usa este componente en el
   * resto del módulo (lista colapsada y/o detalle del PTA), para que el botón
   * se identifique de un vistazo con su sección. */
  color: string;
  /** Fondo claro a juego con `color` (mismo patrón de "chip" que ya usan los
   * badges de estado en este módulo: texto en color fuerte, fondo pálido). */
  colorBg: string;
};

export const PTA_BULK_APPROVAL_GROUPS: PTABulkApprovalGroup[] = [
  {
    key: 'docencia_pregrado',
    label: 'Docencia Pregrado',
    permission: PTA_COMPONENT_PERMISSION.academica_pregrado,
    // Mismo permiso habilita Docencia y Complementarias de pregrado (ver
    // COMPONENT_PERMISSION en el backend): el botón aprueba ambos a la vez.
    componentKeys: ['academica_pregrado', 'complementarias_pregrado'],
    // Azul ESAP: mismo tono que usa "academica" colapsado en esta pantalla.
    color: '#003DA5',
    colorBg: '#EFF6FF',
  },
  {
    key: 'docencia_posgrado',
    label: 'Docencia Posgrado',
    permission: PTA_COMPONENT_PERMISSION.academica_posgrado,
    componentKeys: ['academica_posgrado', 'complementarias_posgrado'],
    color: '#003DA5',
    colorBg: '#EFF6FF',
  },
  {
    key: 'docencia_territorial',
    label: 'Docencia Territorial',
    permission: PTA_COMPONENT_PERMISSION.academica_territorial,
    // Sin contraparte en Complementarias: no existe 'complementarias_territorial'.
    // El alcance por seccional del aprobador lo valida el backend por PTA
    // (assertAlcanceTerritorial), no esta pantalla.
    componentKeys: ['academica_territorial'],
    color: '#003DA5',
    colorBg: '#EFF6FF',
  },
  {
    key: 'investigacion',
    label: 'Investigación',
    permission: PTA_COMPONENT_PERMISSION.investigacion,
    componentKeys: ['investigacion'],
    // Morado: mismo tono que usa Investigación en el resto de esta pantalla.
    color: '#7C3AED',
    colorBg: '#F3E8FF',
  },
  {
    key: 'ext_capacitacion',
    label: 'Extensión · Capacitación',
    permission: PTA_COMPONENT_PERMISSION.ext_capacitacion,
    componentKeys: ['ext_capacitacion'],
    // Colores por sección tal cual el detalle del PTA (PTADetallePanelBackoffice).
    color: '#059669',
    colorBg: '#D1FAE5',
  },
  {
    key: 'ext_procesos',
    label: 'Extensión · Procesos de selección',
    permission: PTA_COMPONENT_PERMISSION.ext_procesos,
    componentKeys: ['ext_procesos'],
    color: '#0284C7',
    colorBg: '#E0F2FE',
  },
  {
    key: 'ext_fortalecimiento',
    label: 'Extensión · Fortalecimiento',
    permission: PTA_COMPONENT_PERMISSION.ext_fortalecimiento,
    componentKeys: ['ext_fortalecimiento'],
    // El detalle del PTA usa el mismo morado que Investigación (#7C3AED) para
    // este ítem; aquí se usa un violeta distinguible para no confundir los dos
    // botones entre sí.
    color: '#6D28D9',
    colorBg: '#EDE9FE',
  },
  {
    key: 'ext_gobierno',
    label: 'Extensión · Alto Gobierno',
    permission: PTA_COMPONENT_PERMISSION.ext_gobierno,
    componentKeys: ['ext_gobierno'],
    color: '#B45309',
    colorBg: '#FEF3C7',
  },
  {
    key: 'complementarias',
    label: 'Complementarias',
    permission: PTA_COMPONENT_PERMISSION.complementarias,
    // Catch-all: ni pregrado ni posgrado (ver clasificarComplementarias).
    componentKeys: ['complementarias'],
    // Amarillo — tono oscuro para que el texto sea legible sobre fondo claro.
    color: '#A16207',
    colorBg: '#FEF9C3',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Etapa de Revisión (preaprobación) — espejo EXACTO de
// backend/academic-work-plan-service/src/pta/auth/pta-permissions.constants.ts
// (REVIEW_SUBSECCIONES_BY_COMPONENT / COMPONENT_REVIEW_PERMISSION / PTA_REVIEW_ALL).
// No modifica los permisos/niveles de aprobación de arriba: es una capa paralela.
// ═══════════════════════════════════════════════════════════════════════════

export type PTAReviewSubseccionKey =
  | 'general'
  | 'docencia'
  | 'academico_administrativas';

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

/**
 * Los códigos de permiso pta.review.academica.pregrado/posgrado se conservan
 * igual que antes del split de Docencia — solo cambia la clave de componente
 * ("academica_pregrado:general" en vez de "academica:pregrado").
 */
export const PTA_COMPONENT_REVIEW_PERMISSION: Record<string, string> = {
  'academica_pregrado:general': 'pta.review.academica.pregrado',
  'academica_posgrado:general': 'pta.review.academica.posgrado',
  // Deprecado (migración 397): se conserva solo como referencia informativa. La
  // autorización real de 'academica_territorial:general' usa
  // PTA_TERRITORIAL_NIVEL_REVIEW_PERMISSION vía hasReviewPermission.
  'academica_territorial:general': 'pta.review.academica.territorial',
  'complementarias:docencia': 'pta.review.complementarias.docencia',
  'complementarias:academico_administrativas': 'pta.review.complementarias.academico_administrativas',
  // EFDS-1353: permisos de revisión propios (antes reutilizaban los de Docencia).
  'complementarias_pregrado:docencia': 'pta.review.complementarias.pregrado',
  'complementarias_pregrado:academico_administrativas': 'pta.review.complementarias.pregrado',
  'complementarias_posgrado:docencia': 'pta.review.complementarias.posgrado',
  'complementarias_posgrado:academico_administrativas': 'pta.review.complementarias.posgrado',
  // Territorial: informativo; la autorización real se resuelve por nivel vía
  // PTA_TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT.
  'complementarias_territorial:docencia': 'pta.review.complementarias.territorial',
  'complementarias_territorial:academico_administrativas': 'pta.review.complementarias.territorial',
  'complementarias_gestion_profesoral:docencia': 'pta.review.complementarias.gestion_profesoral',
  'complementarias_gestion_profesoral:academico_administrativas': 'pta.review.complementarias.gestion_profesoral',
  'investigacion:general': 'pta.review.investigacion',
  'ext_capacitacion:general': 'pta.review.extension.capacitacion',
  'ext_procesos:general': 'pta.review.extension.procesos_seleccion',
  'ext_fortalecimiento:general': 'pta.review.extension.fortalecimiento',
  'ext_gobierno:general': 'pta.review.extension.alto_gobierno',
};

/** Permiso de revisor integral ("revisa todo"). Espejo de PTA_REVIEW_ALL (backend). */
export const PTA_REVIEW_ALL_PERMISSION = 'pta.review.all';

/** Permiso granular requerido para revisar una subsección de un componente dado. */
export function reviewPermissionFor(componente: string, subseccion: string): string | undefined {
  return PTA_COMPONENT_REVIEW_PERMISSION[`${componente}:${subseccion}`];
}

/**
 * ¿El predicado de permisos habilita la revisión de esta subsección? Mismo
 * caso especial que hasComponentPermission: en los componentes territoriales
 * (Docencia y, desde EFDS-1353, Complementarias de tipo Decanatura) basta
 * cualquiera de los dos permisos por nivel.
 */
export function hasReviewPermission(
  can: (permission: string) => boolean,
  componente: string,
  subseccion: string,
): boolean {
  const porNivel = PTA_TERRITORIAL_NIVEL_PERMISSION_BY_COMPONENT[componente];
  if (porNivel) {
    return can(porNivel.review.pregrado) || can(porNivel.review.posgrado);
  }
  const permission = PTA_COMPONENT_REVIEW_PERMISSION[`${componente}:${subseccion}`];
  return !!permission && can(permission);
}

/** Etiquetas legibles para las subsecciones de revisión, usadas en la UI. */
export const REVIEW_SUBSECCION_LABEL: Record<PTAReviewSubseccionKey, string> = {
  general: 'General',
  docencia: 'Complementarias a la Docencia',
  academico_administrativas: 'Académico-Administrativas',
};

export function componentKeysFromPermissionChecker(
  can: (permission: string) => boolean,
): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter(key => hasComponentPermission(can, key));
}

export function hasComponentApprovalData(pta: any, key: PTAComponentKey): boolean {
  const asignaturas: any[] = Array.isArray(pta?.asignaturas) ? pta.asignaturas : [];
  // El backend resuelve el enrutamiento de Docencia (territorialidad > nivel) y lo
  // expone agregado en el listado. Es la fuente preferida: no depende de que el DTO
  // traiga el detalle de asignaturas ni de reconstruir los joins en el cliente.
  const porComponente = pta?.docencia_por_componente;
  const docenciaDesdeBackend = (k: PTAComponentKey): boolean | null => {
    if (!porComponente || typeof porComponente !== 'object') return null;
    return Number(porComponente[k] || 0) > 0;
  };

  switch (key) {
    case 'academica_pregrado': {
      const backend = docenciaDesdeBackend('academica_pregrado');
      if (backend !== null) return backend;
      // Respaldo por asignatura: se excluye lo territorial, que es un componente aparte.
      return asignaturas.some((a: any) =>
        a?.componente_docencia
          ? a.componente_docencia === 'academica_pregrado'
          : (a?.nivel_programa || 'pregrado') !== 'posgrado')
        || (asignaturas.length === 0 && Number(pta?.horas_docencia || 0) > 0);
    }
    case 'academica_posgrado': {
      const backend = docenciaDesdeBackend('academica_posgrado');
      if (backend !== null) return backend;
      return asignaturas.some((a: any) =>
        a?.componente_docencia
          ? a.componente_docencia === 'academica_posgrado'
          : a?.nivel_programa === 'posgrado');
    }
    case 'academica_territorial': {
      // Sin este caso el switch caía en `default: false` y a un aprobador/revisor
      // territorial se le filtraban TODOS los PTAs ("No se encontraron PTAs").
      const backend = docenciaDesdeBackend('academica_territorial');
      if (backend !== null) return backend;
      return asignaturas.some((a: any) => a?.componente_docencia === 'academica_territorial');
    }
    case 'investigacion':
      return Number(pta?.horas_investigacion || 0) > 0
        || (Array.isArray(pta?.investigacion_actividades) && pta.investigacion_actividades.length > 0)
        || !!pta?.investigacion_proyecto;
    case 'ext_capacitacion':
      return hasExtensionSectionData(pta, ['capacitacion']);
    case 'ext_procesos':
      return hasExtensionSectionData(pta, ['seleccion']);
    case 'ext_fortalecimiento':
      return hasExtensionSectionData(pta, ['fortalecimiento', 'laboratorio_innovacion', 'investigacion_aplicada']);
    case 'ext_gobierno':
      return hasExtensionSectionData(pta, ['alto_gobierno']);
    case 'complementarias': {
      // Catch-all "sin programa asociado". Preferir el agregado del backend
      // (complementarias_por_componente, ver pta.service.ts) cuando esté disponible;
      // si no, mismo criterio que antes del split (cuenta toda la data, incluida la
      // legacy de AADM para PTAs no migrados).
      const backend = pta?.complementarias_por_componente;
      if (backend && typeof backend === 'object') return Number(backend.complementarias || 0) > 0;
      return Number(pta?.horas_complementarias || 0) > 0
        || Number(pta?.horas_acad_admin || 0) > 0
        || (Array.isArray(pta?.complementarias) && pta.complementarias.length > 0)
        || (Array.isArray(pta?.academico_admin) && pta.academico_admin.length > 0)
        || (Array.isArray(pta?.academicas_admin) && pta.academicas_admin.length > 0);
    }
    case 'complementarias_pregrado': {
      const backend = pta?.complementarias_por_componente;
      if (backend && typeof backend === 'object') return Number(backend.complementarias_pregrado || 0) > 0;
      const items: any[] = Array.isArray(pta?.complementarias) ? pta.complementarias : [];
      return items.some((item: any) => item?.componente_complementaria === 'complementarias_pregrado');
    }
    case 'complementarias_posgrado': {
      const backend = pta?.complementarias_por_componente;
      if (backend && typeof backend === 'object') return Number(backend.complementarias_posgrado || 0) > 0;
      const items: any[] = Array.isArray(pta?.complementarias) ? pta.complementarias : [];
      return items.some((item: any) => item?.componente_complementaria === 'complementarias_posgrado');
    }
    // EFDS-1353 agregó estos dos ámbitos pero no sus casos aquí, así que caían en
    // `default: false`. Como este predicado decide qué PTAs ve cada usuario según
    // sus componentes autorizados, un revisor/aprobador cuyo alcance de
    // Complementarias fuera Territorial o Gestión Profesoral no veía NINGÚN PTA
    // ("Sin resultados"), aunque existieran.
    case 'complementarias_territorial': {
      const backend = pta?.complementarias_por_componente;
      if (backend && typeof backend === 'object') return Number(backend.complementarias_territorial || 0) > 0;
      const items: any[] = Array.isArray(pta?.complementarias) ? pta.complementarias : [];
      return items.some((item: any) => item?.componente_complementaria === 'complementarias_territorial');
    }
    case 'complementarias_gestion_profesoral': {
      const backend = pta?.complementarias_por_componente;
      if (backend && typeof backend === 'object') return Number(backend.complementarias_gestion_profesoral || 0) > 0;
      const items: any[] = Array.isArray(pta?.complementarias) ? pta.complementarias : [];
      return items.some((item: any) => item?.componente_complementaria === 'complementarias_gestion_profesoral');
    }
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper compartido: separa las actividades de Complementarias en sus dos
// secciones (complementarias a la docencia + académico-administrativas),
// normalizando por `seccion` y fusionando la data legacy `academico_admin`.
// Úsalo en todo punto de lectura para no doble-contar ni divergir.
// ═══════════════════════════════════════════════════════════════════════════
export const COMP_SECCION_DOCENCIA = 'complementarias_docencia';
export const COMP_SECCION_AADM = 'academico_administrativas';

function normalizeComplementariaSeccion(item: any): string {
  const s = String(item?.seccion || '');
  if (s === COMP_SECCION_AADM || s === COMP_SECCION_DOCENCIA) return s;
  // Heurística legacy: los ítems de AADM traen consumeTotalidad definido.
  if (item && item.consumeTotalidad !== undefined && s === '') return COMP_SECCION_AADM;
  return COMP_SECCION_DOCENCIA;
}

export function splitComplementarias(pta: any): {
  docencia: any[];
  aadm: any[];
  horasDocencia: number;
  horasAadm: number;
} {
  const rawComp = Array.isArray(pta?.complementarias)
    ? pta.complementarias
    : (Array.isArray(pta?.complementarias?.actividades) ? pta.complementarias.actividades : []);
  const legacyAadm = Array.isArray(pta?.academico_admin)
    ? pta.academico_admin
    : (Array.isArray(pta?.acad_admin?.actividades) ? pta.acad_admin.actividades
      : (Array.isArray(pta?.academico_administrativo?.actividades) ? pta.academico_administrativo.actividades : []));

  const tagged = [
    ...rawComp.map((a: any) => ({ ...a, seccion: normalizeComplementariaSeccion(a) })),
    ...legacyAadm
      .filter((a: any) => !rawComp.some((c: any) =>
        (c?.actividad_id ?? c?.id) === (a?.actividad_id ?? a?.id) &&
        normalizeComplementariaSeccion(c) === COMP_SECCION_AADM))
      .map((a: any) => ({ ...a, seccion: COMP_SECCION_AADM })),
  ];

  const docencia = tagged.filter((a: any) => a.seccion !== COMP_SECCION_AADM);
  const aadm = tagged.filter((a: any) => a.seccion === COMP_SECCION_AADM);
  const sum = (arr: any[]) => arr.reduce((s: number, a: any) => s + (Number(a?.horas) || 0), 0);
  return { docencia, aadm, horasDocencia: sum(docencia), horasAadm: sum(aadm) };
}

export function hasAnyComponentApprovalData(pta: any, keys: PTAComponentKey[]): boolean {
  return keys.some(key => hasComponentApprovalData(pta, key));
}

// ═══════════════════════════════════════════════════════════════════════════
// Mapeo evidencia de seguimiento → llave de componente aprobable.
//
// La evidencia guarda `componentePta` (docencia|investigacion|extension|
// complementarias) y, para extensión, `seccionExtension`. Este helper traduce ese
// par a la PTAComponentKey que autoriza su revisión (ver + aprobar/rechazar), para
// gatear con la misma lógica por componente que el resto del PTA.
// ═══════════════════════════════════════════════════════════════════════════

/** Secciones de extensión a nivel de permiso y su PTAComponentKey. */
const EXTENSION_SECCION_TO_KEY: Record<string, PTAComponentKey> = {
  capacitacion: 'ext_capacitacion',
  seleccion: 'ext_procesos',
  procesos_seleccion: 'ext_procesos',
  fortalecimiento: 'ext_fortalecimiento',
  // Secciones de actividad que se pliegan dentro de "fortalecimiento".
  laboratorio_innovacion: 'ext_fortalecimiento',
  investigacion_aplicada: 'ext_fortalecimiento',
  alto_gobierno: 'ext_gobierno',
};

const COMPONENTE_PTA_TO_KEY: Record<string, PTAComponentKey> = {
  investigacion: 'investigacion',
  complementarias: 'complementarias',
};

/** Valores de componentePta que identifican evidencia de Docencia (sin distinguir
 * nivel: la evidencia no se etiqueta por pregrado/posgrado). */
const DOCENCIA_EVIDENCIA_VALUES = new Set(['docencia', 'academica']);

/**
 * Devuelve la PTAComponentKey que autoriza revisar una evidencia, o null si es de
 * extensión sin sección asignada (legacy) o de Docencia (ambigua entre pregrado/
 * posgrado) — esos casos se resuelven en `isEvidenciaAuthorized`, tratándolos como
 * "cualquier sub-componente" (cualquier sección de extensión / cualquier nivel de
 * Docencia).
 */
export function componentKeyForEvidencia(
  componentePta: string | null | undefined,
  seccionExtension?: string | null,
): PTAComponentKey | null {
  const comp = String(componentePta || '').toLowerCase().trim();
  if (comp === 'extension') {
    const sec = String(seccionExtension || '').toLowerCase().trim();
    return EXTENSION_SECCION_TO_KEY[sec] || null; // null = extensión legacy sin sección
  }
  if (DOCENCIA_EVIDENCIA_VALUES.has(comp)) return null; // null = docencia sin nivel asignado
  return COMPONENTE_PTA_TO_KEY[comp] || null;
}

/**
 * ¿El usuario está autorizado para ver/aprobar/rechazar esta evidencia?
 *
 * @param ev            evidencia (con componentePta/componente_pta y seccionExtension/seccion_extension)
 * @param isAuthorized  predicado por componente (p.ej. isComponentAuthorized del panel)
 */
export function isEvidenciaAuthorized(
  ev: any,
  isAuthorized: (key: PTAComponentKey) => boolean,
): boolean {
  const comp = String(ev?.componentePta ?? ev?.componente_pta ?? '').toLowerCase().trim();
  const sec = ev?.seccionExtension ?? ev?.seccion_extension;
  const key = componentKeyForEvidencia(comp, sec);
  if (key) return isAuthorized(key);
  // Extensión legacy sin sección: autorizada si el usuario aprueba CUALQUIER sección de extensión.
  if (comp === 'extension') return PTA_EXTENSION_COMPONENT_KEYS.some(k => isAuthorized(k));
  // Docencia sin nivel asignado: autorizada si el usuario aprueba pregrado O posgrado.
  if (DOCENCIA_EVIDENCIA_VALUES.has(comp)) return PTA_DOCENCIA_COMPONENT_KEYS.some(k => isAuthorized(k));
  return false;
}

function hasExtensionSectionData(pta: any, sections: string[]): boolean {
  const acts = Array.isArray(pta?.extension_actividades) ? pta.extension_actividades : [];
  const sectionMatches = acts.some((act: any) => {
    const section = String(act?.seccion || '');
    const hours = Number(act?.horas_ejecutadas ?? act?.horas ?? 0);
    return sections.includes(section) && (hours > 0 || act?.actividad_id || act?.actividad_nombre);
  });
  if (sectionMatches) return true;
  return Number(pta?.horas_extension || 0) > 0 && acts.length === 0;
}

/**
 * EFDS-1497 — Etiqueta legible de cada componente GRANULAR de aprobación.
 *
 * El progreso de aprobación se mostraba solo agregado ("3 / 9 componentes"), sin
 * decir cuáles: Docencia no se distinguía por Pregrado / Posgrado / Territorial
 * ni Extensión por tipo. Este mapa es la fuente única de esos rótulos para todas
 * las vistas que discriminan el avance (backoffice y portal del docente), de modo
 * que no vuelvan a divergir como pasó con los mapas locales.
 */
export const PTA_COMPONENT_LABEL: Record<PTAComponentKey, string> = {
  academica_pregrado: 'Docencia — Pregrado',
  academica_posgrado: 'Docencia — Posgrado',
  academica_territorial: 'Docencia — Territorial',
  investigacion: 'Investigación',
  ext_capacitacion: 'Extensión — Capacitación',
  ext_procesos: 'Extensión — Procesos de Selección',
  ext_fortalecimiento: 'Extensión — Fortalecimiento',
  ext_gobierno: 'Extensión — Alto Gobierno',
  complementarias: 'Complementarias',
  complementarias_pregrado: 'Complementarias — Pregrado',
  complementarias_posgrado: 'Complementarias — Posgrado',
  complementarias_territorial: 'Complementarias — Territorial',
  complementarias_gestion_profesoral: 'Complementarias — Gestión Profesoral',
};

/** Orden estable de presentación del avance, agrupado por rótulo visible. */
export const PTA_COMPONENT_PROGRESS_ORDER: PTAComponentKey[] = [
  'academica_pregrado',
  'academica_posgrado',
  'academica_territorial',
  'investigacion',
  'ext_capacitacion',
  'ext_procesos',
  'ext_fortalecimiento',
  'ext_gobierno',
  'complementarias',
  'complementarias_pregrado',
  'complementarias_posgrado',
  'complementarias_territorial',
  'complementarias_gestion_profesoral',
];

export function labelDeComponente(key: string): string {
  return PTA_COMPONENT_LABEL[key as PTAComponentKey] || key;
}
