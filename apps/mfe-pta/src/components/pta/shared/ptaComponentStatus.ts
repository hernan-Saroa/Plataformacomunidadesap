export type PtaCollapsedComponentKey = 'academica' | 'investigacion' | 'extension' | 'complementarias';

export type PtaComponentDisplayStatus =
  | 'no_aplica'
  | 'no_iniciado'
  | 'en_revision'
  | 'pendiente'
  | 'aprobado'
  | 'devuelto';

const FINAL_PTA_STATES = new Set(['APROBADO', 'EN FIRME', 'FINALIZADO']);

const HOURS_FIELD: Record<PtaCollapsedComponentKey, string> = {
  academica: 'horas_docencia',
  investigacion: 'horas_investigacion',
  extension: 'horas_extension',
  complementarias: 'horas_complementarias',
};

function normalizeStatus(value: unknown): PtaComponentDisplayStatus | null {
  const status = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (status === 'no_aplica' || status === 'no_aplicable') return 'no_aplica';
  if (status === 'no_iniciado') return 'no_iniciado';
  if (status === 'en_revision') return 'en_revision';
  if (status === 'aprobado') return 'aprobado';
  if (status === 'devuelto') return 'devuelto';
  if (status === 'pendiente') return 'pendiente';
  return null;
}

export function getPtaComponentInfo(pta: any, key: string): any | null {
  const items = Array.isArray(pta?.componentes_estado) ? pta.componentes_estado : [];
  return items.find((item: any) => String(item?.key || item?.componente || '') === key) || null;
}

/**
 * Estado único para tarjetas, detalle e impresiones.
 * La aplicabilidad (horas > 0) se evalúa antes que el estado global del PTA:
 * un PTA aprobado nunca convierte un componente vacío en "Aprobado".
 */
export function getPtaComponentDisplayStatus(
  pta: any,
  key: string,
  approvals: any[] = [],
): PtaComponentDisplayStatus {
  const info = getPtaComponentInfo(pta, key);
  const backendStatus = normalizeStatus(info?.estado_visual ?? info?.estado);
  if (info?.requiere_reaprobacion && (backendStatus === 'pendiente' || backendStatus === 'devuelto')) return backendStatus;
  if (backendStatus === 'no_aplica') return 'no_aplica';

  if (info?.horas != null) {
    const hours = Number(info.horas);
    if (Number.isFinite(hours) && hours <= 0) return 'no_aplica';
  }

  const hoursField = HOURS_FIELD[key as PtaCollapsedComponentKey];
  if (pta?.[hoursField] != null) {
    const hours = Number(pta[hoursField]);
    if (Number.isFinite(hours) && hours <= 0) return 'no_aplica';
  }

  if (backendStatus) return backendStatus;

  // Legacy/detail payloads may include activities without aggregate hours.
  const empty = (value: any) => Array.isArray(value) && value.length === 0;
  const legacyItems = (value: any): boolean => value != null && (
    Array.isArray(value) ? value.length > 0 : typeof value === 'object' ? Object.values(value).some(Boolean) : true
  );
  if (pta?.[hoursField] == null && info?.horas == null) {
    if (key === 'academica' && empty(pta?.asignaturas) && !Number(pta?.num_asignaturas)) return 'no_aplica';
    if (key === 'investigacion' && empty(pta?.investigacion_actividades) && !legacyItems(pta?.investigacion_proyecto) && !legacyItems(pta?.investigacion)) return 'no_aplica';
    if (key === 'extension' && empty(pta?.extension_actividades) && !legacyItems(pta?.extension)) return 'no_aplica';
    if (key === 'complementarias' && empty(pta?.complementarias) && !legacyItems(pta?.academico_admin) && !legacyItems(pta?.acad_admin) && !legacyItems(pta?.academico_administrativo) && !Number(pta?.horas_acad_admin)) return 'no_aplica';
  }
  const scopedApprovals = approvals.filter(a => getPtaCollapsedKey(String(a?.componente || '')) === key);
  if (scopedApprovals.length > 0) return getPtaApprovalGroupStatus(pta, scopedApprovals);

  const globalState = String(pta?.estado || '').trim().toUpperCase();
  if (globalState === 'BORRADOR') return 'no_iniciado';
  if (FINAL_PTA_STATES.has(globalState)) return 'aprobado';
  return 'pendiente';
}

export function getPtaCollapsedKey(key: string): PtaCollapsedComponentKey {
  if (key.startsWith('academica')) return 'academica';
  if (key.startsWith('ext_') || key === 'extension') return 'extension';
  if (key.startsWith('complementarias')) return 'complementarias';
  return 'investigacion';
}

/** Read-only projection: technical auto-approvals remain untouched in the workflow. */
export function getPtaApprovalDisplayStatus(pta: any, approval: any): PtaComponentDisplayStatus {
  const status = normalizeStatus(approval?.estado_visual ?? approval?.estado);
  // A requested edit can require a human decision even after removing its last activity.
  if (approval?.scope === 'solicitud_edicion' && ['pendiente', 'devuelto'].includes(approval?.estado)) {
    return approval.estado;
  }
  if (approval?.aplica === false || status === 'no_aplica') return 'no_aplica';
  if (approval?.horas != null && Number.isFinite(Number(approval.horas)) && Number(approval.horas) <= 0) return 'no_aplica';
  const collapsed = getPtaComponentDisplayStatus(pta, getPtaCollapsedKey(String(approval?.componente || '')));
  if (collapsed === 'no_aplica') return 'no_aplica';
  // Compatibility with historical responses, never infer emptiness from the actor alone.
  if (approval?.horas == null && approval?.aplica == null &&
      /sin actividades/i.test(String(approval?.comentarios || approval?.comentario || approval?.observaciones || ''))) return 'no_aplica';
  if (String(pta?.estado || '').toUpperCase() === 'BORRADOR') return 'no_iniciado';
  if (FINAL_PTA_STATES.has(String(pta?.estado || '').trim().toUpperCase())) return 'aprobado';
  return status || 'pendiente';
}

export function getPtaApprovalGroupStatus(pta: any, approvals: any[]): PtaComponentDisplayStatus {
  const statuses = approvals.map(a => getPtaApprovalDisplayStatus(pta, a));
  const applicable = statuses.filter(s => s !== 'no_aplica');
  if (statuses.length > 0 && applicable.length === 0) return 'no_aplica';
  if (applicable.includes('devuelto')) return 'devuelto';
  if (applicable.length > 0 && applicable.every(s => s === 'aprobado')) return 'aprobado';
  if (applicable.includes('en_revision')) return 'en_revision';
  if (applicable.length > 0 && applicable.every(s => s === 'no_iniciado')) return 'no_iniciado';
  return 'pendiente';
}
