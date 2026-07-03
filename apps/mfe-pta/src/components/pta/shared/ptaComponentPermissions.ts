export type PTAComponentKey =
  | 'academica'
  | 'investigacion'
  | 'ext_capacitacion'
  | 'ext_procesos'
  | 'ext_fortalecimiento'
  | 'ext_gobierno'
  | 'ext_secciones'
  | 'complementarias'
  | 'academicas_admin';

export const PTA_COMPONENT_PERMISSION: Record<PTAComponentKey, string> = {
  academica: 'pta.approve.academica',
  investigacion: 'pta.approve.investigacion',
  ext_capacitacion: 'pta.approve.extension.capacitacion',
  ext_procesos: 'pta.approve.extension.procesos_seleccion',
  ext_fortalecimiento: 'pta.approve.extension.fortalecimiento',
  ext_gobierno: 'pta.approve.extension.alto_gobierno',
  ext_secciones: 'pta.approve.extension.secciones_actividades',
  complementarias: 'pta.approve.complementarias',
  academicas_admin: 'pta.approve.academicas_admin',
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
  'ext_secciones',
];

export const PTA_COMPONENT_LEVELS: Record<PTAComponentKey, number> = {
  academica: 1,
  complementarias: 1,
  investigacion: 2,
  ext_capacitacion: 2,
  ext_procesos: 2,
  ext_fortalecimiento: 2,
  ext_gobierno: 2,
  ext_secciones: 2,
  academicas_admin: 3,
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
    case 'ext_secciones':
      return hasExtensionOtherSectionData(pta);
    case 'complementarias':
      return Number(pta?.horas_complementarias || 0) > 0
        || (Array.isArray(pta?.complementarias) && pta.complementarias.length > 0);
    case 'academicas_admin':
      return Number(pta?.horas_acad_admin || 0) > 0
        || (Array.isArray(pta?.academico_admin) && pta.academico_admin.length > 0)
        || (Array.isArray(pta?.academicas_admin) && pta.academicas_admin.length > 0);
    default:
      return false;
  }
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

function hasExtensionOtherSectionData(pta: any): boolean {
  const acts = Array.isArray(pta?.extension_actividades) ? pta.extension_actividades : [];
  const known = new Set(['capacitacion', 'seleccion', 'fortalecimiento', 'laboratorio_innovacion', 'investigacion_aplicada', 'alto_gobierno']);
  return acts.some((act: any) => {
    const section = String(act?.seccion || '');
    const hours = Number(act?.horas_ejecutadas ?? act?.horas ?? 0);
    return !known.has(section) && (hours > 0 || act?.actividad_id || act?.actividad_nombre);
  });
}
