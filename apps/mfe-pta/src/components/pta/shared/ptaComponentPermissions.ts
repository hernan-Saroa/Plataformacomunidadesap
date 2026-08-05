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
  | 'complementarias_posgrado';

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
  // Sin permiso propio: reutilizan el permiso de aprobación de Docencia por nivel
  // (mismo aprobador Pregrado/Posgrado ya existente, según el tipo de actividad
  // configurado en comp_actividades_v2 — ver clasificarComplementarias en el backend).
  complementarias_pregrado: 'pta.approve.academica.pregrado',
  complementarias_posgrado: 'pta.approve.academica.posgrado',
};

export const PTA_COMPONENT_KEYS = Object.keys(PTA_COMPONENT_PERMISSION) as PTAComponentKey[];

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
  'academica_territorial:general': 'pta.review.academica.territorial',
  'complementarias:docencia': 'pta.review.complementarias.docencia',
  'complementarias:academico_administrativas': 'pta.review.complementarias.academico_administrativas',
  // Sin permisos propios: mismo revisor de Docencia por nivel (ya existente) revisa
  // también las dos subsecciones de Complementarias de su nivel.
  'complementarias_pregrado:docencia': 'pta.review.academica.pregrado',
  'complementarias_pregrado:academico_administrativas': 'pta.review.academica.pregrado',
  'complementarias_posgrado:docencia': 'pta.review.academica.posgrado',
  'complementarias_posgrado:academico_administrativas': 'pta.review.academica.posgrado',
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

/** Etiquetas legibles para las subsecciones de revisión, usadas en la UI. */
export const REVIEW_SUBSECCION_LABEL: Record<PTAReviewSubseccionKey, string> = {
  general: 'General',
  docencia: 'Complementarias a la Docencia',
  academico_administrativas: 'Académico-Administrativas',
};

export function componentKeysFromPermissionChecker(
  can: (permission: string) => boolean,
): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter(key => can(PTA_COMPONENT_PERMISSION[key]));
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
