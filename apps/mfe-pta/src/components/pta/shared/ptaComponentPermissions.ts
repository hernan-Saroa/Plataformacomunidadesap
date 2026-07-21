export type PTAComponentKey =
  | 'academica'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno'
  | 'complementarias';

export const PTA_COMPONENT_PERMISSION: Record<PTAComponentKey, string> = {
  academica: 'pta.approve.academica',
  investigacion: 'pta.approve.investigacion',
  ext_capacitacion: 'pta.approve.extension.capacitacion',
  ext_procesos: 'pta.approve.extension.procesos_seleccion',
  ext_fortalecimiento: 'pta.approve.extension.fortalecimiento',
  ext_gobierno: 'pta.approve.extension.alto_gobierno',
  // 'complementarias' cubre ambas secciones: complementarias a la docencia y
  // académico-administrativas (AADM se fusionó como sección de complementarias).
  complementarias: 'pta.approve.complementarias',
};

export const PTA_COMPONENT_KEYS = Object.keys(PTA_COMPONENT_PERMISSION) as PTAComponentKey[];

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
  academica: 1,
  complementarias: 1,
  investigacion: 2,
  ext_capacitacion: 2,
  ext_procesos: 2,
  ext_fortalecimiento: 2,
  ext_gobierno: 2,
};

export function componentKeysForApprovalLevel(level: number): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter(key => PTA_COMPONENT_LEVELS[key] === level);
}

export function componentKeysFromPermissionChecker(
  can: (permission: string) => boolean,
): PTAComponentKey[] {
  return PTA_COMPONENT_KEYS.filter(key => can(PTA_COMPONENT_PERMISSION[key]));
}

export function hasComponentApprovalData(pta: any, key: PTAComponentKey): boolean {
  switch (key) {
    case 'academica':
      return Number(pta?.horas_docencia || 0) > 0
        || Number(pta?.num_asignaturas || 0) > 0
        || (Array.isArray(pta?.asignaturas) && pta.asignaturas.length > 0);
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
    case 'complementarias':
      // Complementarias ahora incluye la sección académico-administrativa; se cuenta
      // también la data legacy de AADM para PTAs no migrados.
      return Number(pta?.horas_complementarias || 0) > 0
        || Number(pta?.horas_acad_admin || 0) > 0
        || (Array.isArray(pta?.complementarias) && pta.complementarias.length > 0)
        || (Array.isArray(pta?.academico_admin) && pta.academico_admin.length > 0)
        || (Array.isArray(pta?.academicas_admin) && pta.academicas_admin.length > 0);
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
