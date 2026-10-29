/** Mirrors rund-evidence-workflow.ts: a checkpoint keeps several evidences, each reviewed on its own. */
export const RUND_MAX_EVIDENCES_PER_TYPE = 10;
export const RUND_TECHNICAL_SUPPORTS = ['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'];
const IDENTITY_TYPES = ['documento_identidad', 'cedula_extranjeria', 'pasaporte'];

export type RundEvidenceField = { tipoSoporte: string; revisionId?: string };
export type RundEvidenceState = 'Aprobado' | 'Rechazado' | 'Pendiente';

/** CC, CE and passport accredit the same rows, so they share one checkpoint. */
export const rundEvidenceGroup = (type?: string | null): string[] =>
  !type ? [] : IDENTITY_TYPES.includes(type) ? IDENTITY_TYPES : [type];

const evidenceType = (support: any) => support?.tipo_soporte || support?.tipo || '';
const evidenceTime = (support: any) => {
  const time = new Date(support?.createdAt || support?.soporteCreadoEn || support?.creadoEn || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

/** Current evidences of a checkpoint, oldest first, so their numbering stays stable after replacements. */
export function rundCheckpointEvidences(supports: any[] = [], type?: string | null): any[] {
  const group = rundEvidenceGroup(type);
  return supports.filter(support => group.includes(evidenceType(support)))
    .sort((a, b) => evidenceTime(a) - evidenceTime(b) || String(a.id).localeCompare(String(b.id)));
}

/** Decision of one evidence for one row; a decision of a previous file version does not carry over. */
export function rundEvidenceDecision(support: any, field: RundEvidenceField): { estado: RundEvidenceState; observacion?: string | null; revisadoPorNombre?: string | null; fechaRevision?: string | null } {
  const decision = support?.revisiones_campos?.[field.revisionId || field.tipoSoporte];
  if (decision && decision.documentoVersionId === (support?.documento_perfil_id || support?.documento_carpeta_id)) return decision;
  const anyRowReturned = Object.values(support?.revisiones_campos || {}).some((item: any) => item?.estado === 'Rechazado'
    && item.documentoVersionId === (support?.documento_perfil_id || support?.documento_carpeta_id));
  // Historical decisions without rows are unambiguous only for single-row documents or support-level returns.
  if (!field.revisionId && !decision) return { estado: ['Aprobado', 'Rechazado'].includes(support?.estado) ? support.estado : 'Pendiente', observacion: support?.observacion };
  if (support?.estado === 'Rechazado' && !anyRowReturned) return { estado: 'Rechazado', observacion: support?.observacion };
  return { estado: 'Pendiente' };
}

/** Aggregated row state: pending while any evidence awaits a decision, then admitted if one was approved. */
export function rundRowStatus(evidences: any[], field: RundEvidenceField): RundEvidenceState | null {
  if (!evidences.length) return null;
  const states = evidences.map(evidence => rundEvidenceDecision(evidence, field).estado);
  if (states.includes('Pendiente')) return 'Pendiente';
  return states.includes('Aprobado') ? 'Aprobado' : 'Rechazado';
}

/** One decision per document, covering only the catalog rows it accredits. */
export function rundDocumentDecision(support: any, fields: RundEvidenceField[]) {
  const decisions = fields.map(field => rundEvidenceDecision(support, field));
  const states = new Set(decisions.map(decision => decision.estado));
  const estado: RundEvidenceState = !decisions.length || states.size !== 1 || states.has('Pendiente') ? 'Pendiente' : decisions[0].estado;
  return { ...decisions[0], estado };
}

export type RundCheckpointRow = RundEvidenceField & { required: boolean };

/** Same conditions the server applies before approving a block. */
export function rundBlockReadiness(supports: any[] = [], rows: RundCheckpointRow[]) {
  const reviewable = supports.filter(support => !RUND_TECHNICAL_SUPPORTS.includes(evidenceType(support)));
  const documentRows = rows.filter(row => row.tipoSoporte);
  const withFile = (support: any) => Boolean(String(support?.documento_carpeta_id || support?.documento_perfil_id || '').trim());
  const hasAllRequired = documentRows.filter(row => row.required)
    .every(row => rundCheckpointEvidences(reviewable, row.tipoSoporte).some(withFile));
  const catalogTypes = new Set(documentRows.flatMap(row => rundEvidenceGroup(row.tipoSoporte)));
  const allDecided = documentRows.every(row => rundCheckpointEvidences(reviewable, row.tipoSoporte)
    .every(evidence => rundEvidenceDecision(evidence, row).estado !== 'Pendiente'))
    // Evidences outside the checkpoint catalog keep their support-level state.
    && reviewable.filter(support => !catalogTypes.has(evidenceType(support))).every(support => ['Aprobado', 'Rechazado'].includes(support.estado));
  const requiredAdmitted = documentRows.filter(row => row.required)
    .every(row => rundCheckpointEvidences(reviewable, row.tipoSoporte).some(evidence => withFile(evidence) && rundEvidenceDecision(evidence, row).estado === 'Aprobado'));
  const hasExpired = reviewable.some(support => support.fecha_vencimiento && new Date(support.fecha_vencimiento).getTime() < Date.now()
    && (support.estado === 'Aprobado' || Object.values(support.revisiones_campos || {}).some((decision: any) => decision?.estado === 'Aprobado')));
  return { hasAllRequired, allDecided, requiredAdmitted, hasExpired, ready: hasAllRequired && allDecided && requiredAdmitted && !hasExpired };
}
