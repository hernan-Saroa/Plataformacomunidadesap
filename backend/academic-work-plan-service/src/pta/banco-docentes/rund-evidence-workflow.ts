import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';
import { hasRundData } from './rund-evidence-data';
import { dataApprovalProblem, dataReviewContext, loadDataReviewProfile, loadDataReviews, RUND_DATA_FIELDS } from './rund-data-review';

export const EVIDENCE_TYPES: Record<string, string[]> = {
  IDENTIDAD: ['documento_identidad', 'cedula_extranjeria', 'pasaporte'],
  CONTACTO: [],
  FORMACION: ['diploma_pregrado', 'acta_grado_pregrado', 'diploma_especializacion', 'acta_grado_especializacion', 'diploma_maestria', 'acta_grado_maestria', 'diploma_doctorado', 'acta_grado_doctorado', 'certificado_posdoctoral', 'convalidacion_men', 'hoja_vida_pro'],
  VINCULACION: ['acto_administrativo_vinculacion', 'resolucion_convocatoria', 'contrato', 'acto_administrativo_dedicacion', 'acto_administrativo_situacion', 'acto_adscripcion_territorial', 'resolucion_escalafon', 'resolucion_puntaje_salarial'],
  ACADEMICO: ['acto_asignacion_nucleo', 'certificacion_investigacion', 'acta_evaluacion_desempeno'],
  TRANSVERSAL: ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'],
};
export const isReviewableEvidence = (type: string) => !['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type);
// Each checkpoint can keep several current evidences; each one is reviewed on its own.
export const RUND_MAX_EVIDENCES_PER_TYPE = 10;
export const RUND_REVIEW_BLOCKS = Object.keys(EVIDENCE_TYPES);
// Contact data can be reviewed, but never requires documentary evidence.
export const RUND_REQUIRED_BLOCKS = RUND_REVIEW_BLOCKS.filter(block => block !== 'CONTACTO');

export function canReturnEvidenceBlock(block: string, supports: any[]): boolean {
  if (block === 'CONTACTO') return true;
  return (supports || []).some(s => EVIDENCE_TYPES[block]?.includes(s.tipo_soporte) && isReviewableEvidence(s.tipo_soporte)
    && (!s.bloque || s.bloque === block)
    && (s.documento_perfil_id ? s.estado_documento === 'ACTIVO' : Boolean(String(s.documento_carpeta_id || '').trim())));
}

export async function withCurrentEvidenceDocuments(db: { query(sql: string, parameters?: any[]): Promise<any[]> }, docenteId: string, supports: any[]) {
  const ids = [...new Set(supports.map(s => s.documento_perfil_id).filter(Boolean))];
  const documents = ids.length ? await db.query(`SELECT id, estado FROM academic_work_plan."RundDocumentoPerfil"
    WHERE docente_id::text=$1 AND id::text=ANY($2::text[])`, [docenteId, ids]) : [];
  const states = new Map(documents.map((d: any) => [String(d.id), d.estado]));
  return supports.map(s => ({ ...s, estado_documento: s.documento_perfil_id ? states.get(String(s.documento_perfil_id)) || 'NO_DISPONIBLE' : null }));
}

export function evidenceSummary(rows: { bloque: string; estado: string }[]) {
  const completitud = Object.fromEntries(rows.map(row => [row.bloque, row.estado]));
  const activable = RUND_REQUIRED_BLOCKS.every(block => completitud[block] === 'Aprobado');
  const estado = RUND_REVIEW_BLOCKS.some(block => completitud[block] === 'Devuelto')
    ? 'DEVUELTO' : activable ? 'ACTIVO_RUND' : 'PENDIENTE_APROBACION';
  return { activable: estado === 'ACTIVO_RUND', completitud, estado };
}
export function evidenceFields(type: string): string[] {
  if (['documento_identidad', 'cedula_extranjeria', 'pasaporte'].includes(type)) {
    return ['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO', 'FECHA_NACIMIENTO'];
  }
  if (type === 'contrato') return ['ACTO_ADMINISTRATIVO', 'FECHAS_VINCULACION'];
  if (type === 'acto_administrativo_dedicacion') return ['DEDICACION', 'HORAS_PTA'];
  return [type];
}

export function evidenceFieldDecision(support: any, campo: string) {
  const decision = support.revisiones_campos?.[campo];
  if (decision && decision.documentoVersionId === (support.documento_perfil_id || support.documento_carpeta_id)) return decision;
  // Historical decisions are unambiguous only for documents covering one row.
  if (evidenceFields(support.tipo_soporte).length === 1 && !decision) return { estado: support.estado, observacion: support.observacion };
  return { estado: 'Pendiente' };
}
/** CC, CE and passport accredit the same identity rows, so they share one checkpoint. */
export function evidenceGroup(type: string): string[] {
  return EVIDENCE_TYPES.IDENTIDAD.includes(type) ? EVIDENCE_TYPES.IDENTIDAD : [type];
}

/** Row decision of one evidence; older rows may keep a return only at support level. */
export function evidenceFieldState(support: any, campo: string): string {
  const state = evidenceFieldDecision(support, campo).estado;
  if (state === 'Aprobado' || state === 'Rechazado' || support.estado !== 'Rechazado') return state;
  return evidenceFields(support.tipo_soporte).some(field => evidenceFieldDecision(support, field).estado === 'Rechazado') ? state : 'Rechazado';
}

/** A returned row stays open while no other evidence of the same checkpoint is admitted or awaiting review for it. */
export function hasOpenEvidenceReturn(supports: any[]): boolean {
  const reviewable = (supports || []).filter(s => s?.tipo_soporte && isReviewableEvidence(s.tipo_soporte));
  return reviewable.some(support => evidenceFields(support.tipo_soporte).some(field => evidenceFieldState(support, field) === 'Rechazado'
    && !reviewable.some(other => other !== support && evidenceGroup(support.tipo_soporte).includes(other.tipo_soporte)
      && Boolean(String(other.documento_carpeta_id || '').trim()) && evidenceFieldState(other, field) !== 'Rechazado')));
}

/**
 * Every current evidence must be admitted or returned, and every required row needs at least one
 * admitted evidence. Returned evidences remain in the record but do not prevent approval.
 */
/** Document readiness diagnostic; it never overrides the authorized reviewer's data decisions. */
export function evidenceApprovalProblem(block: string, docente: any, supports: any[]): string | null {
  const reviewable = (supports || []).filter(s => isReviewableEvidence(s.tipo_soporte));
  const required = requiredEvidence(block, docente);
  const missing = required.filter(group => !reviewable.some(s => group.includes(s.tipo_soporte) && s.documento_carpeta_id));
  if (missing.length) return `Faltan soportes obligatorios: ${missing.map(g => g[0]).join(', ')}.`;
  if (reviewable.some(s => evidenceFields(s.tipo_soporte).some(field => !['Aprobado', 'Rechazado'].includes(evidenceFieldState(s, field))))) {
    return 'Revise y apruebe o devuelva cada evidencia vigente y cada fila antes de aprobar el bloque. Hay documentos pendientes de decisión.';
  }
  const uncovered = required.filter(group => evidenceFields(group[0]).some(field =>
    !reviewable.some(s => group.includes(s.tipo_soporte) && s.documento_carpeta_id && evidenceFieldState(s, field) === 'Aprobado')));
  if (uncovered.length) return `Revise y apruebe al menos una evidencia válida para: ${uncovered.map(g => g[0]).join(', ')}. Las evidencias devueltas no acreditan el dato.`;
  if (reviewable.some(s => s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date()
    && evidenceFields(s.tipo_soporte).some(field => evidenceFieldState(s, field) === 'Aprobado'))) {
    return 'Revise y apruebe documentos vigentes: hay evidencias admitidas vencidas. Cargue una versión vigente.';
  }
  return null;
}

/** Marks the block returned while a return stays open; only then the reason is shown at block level. */
async function blockStateAfterReturn(runner: Pick<QueryRunner, 'query'>, docenteId: string, block: string, note?: string) {
  const supports = await runner.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2', [docenteId, block]);
  if (hasOpenEvidenceReturn(supports)) {
    await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = 'Devuelto', observacion = COALESCE($3, observacion)
      WHERE docente_id::text = $1 AND bloque = $2`, [docenteId, block, note || null]);
  }
  const reviews = await loadDataReviews(runner, docenteId);
  if (reviews.some((review: any) => review.bloque === block && review.metadata?.estado === 'Rechazado')) {
    const context = dataReviewContext(block, await loadDataReviewProfile(runner, docenteId), await withCurrentEvidenceDocuments(runner, docenteId, supports), reviews);
    const returned = Object.values(context).find(decision => decision.estado === 'Rechazado');
    if (returned) await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado='Devuelto', observacion=$3 WHERE docente_id::text=$1 AND bloque=$2`,[docenteId,block,returned.observacion]);
  }
}

export function validateEvidenceType(block: string, type: string) {
  if (!EVIDENCE_TYPES[block]?.includes(type)) throw new BadRequestException('El tipo de soporte no corresponde al bloque seleccionado.');
}
export function requiredEvidence(block: string, docente: any): string[][] {
  if (block === 'IDENTIDAD') return [EVIDENCE_TYPES.IDENTIDAD];
  if (block === 'VINCULACION') return EVIDENCE_TYPES.VINCULACION.map(type => [type]);
  if (block === 'TRANSVERSAL') return [['autorizacion_habeas_data']];
  if (block === 'ACADEMICO') return [['acto_asignacion_nucleo'], ['acta_evaluacion_desempeno'], ...(hasRundData(docente.investigacion) ? [['certificacion_investigacion']] : [])];
  if (block === 'FORMACION') {
    const required = [['diploma_pregrado'], ['hoja_vida_pro']];
    for (const [field, type] of Object.entries({ especializacion: 'diploma_especializacion', maestria: 'diploma_maestria', doctorado: 'diploma_doctorado', posDoctorado: 'certificado_posdoctoral' })) {
      if (hasRundData(docente[field])) required.push([type]);
    }
    return required;
  }
  return [];
}

export function evidenceBlocksForFields(fields: string[]): string[] {
  const mapping: Record<string, string[]> = {
    IDENTIDAD: ['num_identificacion', 'tip_identificacion', 'nom_largo', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'fec_nacimiento', 'gen_tercero', 'sexoBiologico'],
    CONTACTO: ['correoInstitucional', 'correoAlternativo', 'tel_celular', 'email'],
    FORMACION: ['nivelFormacion', 'perfilAcademicoPro', 'perfilAcademico', 'pregrado', 'especializacion', 'maestria', 'doctorado', 'posDoctorado'],
    VINCULACION: ['tipoVinculacion', 'territorialId', 'territorialReportada', 'sedeId', 'dedicacion', 'escalafon', 'vinculacionDisplay', 'dedicacionDisplay', 'dedicacionHorasSemana', 'horasAsignables', 'origenVinculacion', 'actoAdministrativoVinculacion', 'situacionAdministrativa', 'situacionCategoria', 'fechaInicioVinculacion', 'fechaFinVinculacion', 'puntajeSalarial', 'regimenNormativo', 'estado'],
    ACADEMICO: ['nucleoTematico', 'investigacion', 'ultimaEvaluacion'],
    TRANSVERSAL: ['observaciones'],
  };
  return Object.entries(mapping).filter(([, keys]) => fields.some(f => keys.includes(f))).map(([block]) => block);
}

export async function invalidateEditedEvidence(manager: Pick<QueryRunner, 'query'>, docenteId: string, fields: string[], actorId: string, ip?: string) {
  for (const block of evidenceBlocksForFields(fields)) {
    const rows = await manager.query('SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id = $1 AND bloque = $2', [docenteId, block]);
    if (!rows.length) continue;
    await manager.query('SELECT id FROM academic_work_plan."Docente" WHERE id = $1 FOR UPDATE', [docenteId]);
    await manager.query(`UPDATE academic_work_plan."RundSoporteCampo" SET estado = 'Pendiente', observacion = NULL, revisiones_campos = '{}'::jsonb
      WHERE docente_id = $1 AND bloque = $2`, [docenteId, block]);
    await resetEvidenceBlock(manager, docenteId, block, actorId);
    await evidenceAudit(manager, docenteId, block, 'REABRIR_POR_EDICION', actorId,
      { camposModificados: fields, estadoAnterior: rows[0].estado }, 'La información cambió. Revise de nuevo la correspondencia de sus soportes.', ip);
  }
}

export async function lockEvidenceProfile(runner: Pick<QueryRunner, 'query'>, docenteId: string) {
  const [docente] = await runner.query('SELECT * FROM academic_work_plan."Docente" WHERE id = $1 FOR UPDATE', [docenteId]);
  if (!docente || docente.eliminadoRund) throw new NotFoundException('Perfil docente no encontrado o eliminado de RUND.');
  return docente;
}

export async function syncEvidenceSummary(runner: Pick<QueryRunner, 'query'>, docenteId: string) {
  const rows = await runner.query('SELECT bloque, estado FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $1', [docenteId]);
  const { completitud, estado } = evidenceSummary(rows);
  await runner.query('UPDATE academic_work_plan."Docente" SET "estadoAprobacion" = $1, completitud = $2::jsonb WHERE id = $3', [estado, JSON.stringify(completitud), docenteId]);
  return { activable: estado === 'ACTIVO_RUND', completitud };
}

export async function evidenceAudit(runner: Pick<QueryRunner, 'query'>, docenteId: string, block: string, action: string, actorId: string, metadata: any, observation?: string, ip?: string, supportId?: string) {
  await runner.query(`INSERT INTO academic_work_plan."RundAprobacionLog"
    (id, docente_id, bloque, accion, actor_id, canal_origen, soporte_id, observacion, ip, metadata, "createdAt")
    VALUES ($1,$2,$3,$4,$5,'RUND_DOCUMENTAL',$6,$7,$8,$9::jsonb,NOW())`,
    [randomUUID(), docenteId, block, action, actorId, supportId || null, observation || null, ip || null, JSON.stringify(metadata)]);
}

// Called within the upload/delete transaction. The old decision remains in the audit log.
export async function resetEvidenceBlock(runner: Pick<QueryRunner, 'query'>, docenteId: string, block: string, actorId: string, missing = false) {
  await runner.query(`INSERT INTO academic_work_plan."RundCampoEstado"
    (id, docente_id, bloque, estado, cargado_por, version, soporte_ids, "createdAt", "updatedAt")
    SELECT $1::uuid,$2::text,$3::text,$4::text,$5::text,1,'[]'::jsonb,NOW(),NOW()
    WHERE NOT EXISTS (SELECT 1 FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $2 AND bloque = $3)`,
    [randomUUID(), docenteId, block, missing ? 'Soporte faltante' : 'En revisión', actorId]);
  await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = $1, cargado_por = $2,
    revisado_por = NULL, fecha_revision = NULL, observacion = NULL, version = version + 1, "updatedAt" = NOW()
    WHERE docente_id::text = $3 AND bloque = $4`, [missing ? 'Soporte faltante' : 'En revisión', actorId, docenteId, block]);
  // A different returned support must remain visible until it is corrected or covered by another evidence.
  await blockStateAfterReturn(runner, docenteId, block);
  await syncEvidenceSummary(runner, docenteId);
}

export class RundEvidenceWorkflow {
  constructor(private readonly dataSource: DataSource) {}

  async refreshSummary(docenteId: string) {
    return this.transaction(docenteId, runner => syncEvidenceSummary(runner, docenteId));
  }

  private async transaction<T>(docenteId: string, work: (runner: QueryRunner, docente: any) => Promise<T>): Promise<T> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const result = await work(runner, await lockEvidenceProfile(runner, docenteId));
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally { await runner.release(); }
  }

  async reviewSupport(docenteId: string, block: string, supportId: string, data: { estado: string; campo?: string; alcance?: string; observacion?: string; documentoVersionId: string; blockVersion?: number }, actorId: string, ip?: string) {
    block = block.toUpperCase();
    if (!['Aprobado', 'Rechazado'].includes(data.estado)) throw new BadRequestException('Decisión documental inválida.');
    if (data.alcance && data.alcance !== 'documento') throw new BadRequestException('Alcance de revisión inválido.');
    if (data.estado === 'Rechazado' && (typeof data.observacion !== 'string' || !data.observacion.trim())) throw new BadRequestException('Indique el motivo de devolución y la corrección requerida.');
    return this.transaction(docenteId, async runner => {
      const [support] = await runner.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE id = $1 AND docente_id::text = $2 AND bloque = $3 FOR UPDATE', [supportId, docenteId, block]);
      if (!support) throw new NotFoundException('Soporte no encontrado en este bloque.');
      validateEvidenceType(block, support.tipo_soporte);
      if (!isReviewableEvidence(support.tipo_soporte)) throw new BadRequestException('Este soporte pertenece al trámite de edición del perfil.');
      if (!canReturnEvidenceBlock(block, await withCurrentEvidenceDocuments(runner, docenteId, [support]))) {
        throw new BadRequestException('El soporte no tiene un documento disponible en este bloque. Cargue una versión actual antes de revisarlo.');
      }
      if (!data.documentoVersionId || data.documentoVersionId !== (support.documento_perfil_id || support.documento_carpeta_id)) throw new ConflictException('El documento cambió. Actualice y revise la versión vigente.');
      const [currentBlock] = await runner.query('SELECT version FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $1 AND bloque = $2', [docenteId, block]);
      if (!currentBlock || data.blockVersion !== Number(currentBlock.version)) throw new ConflictException('La información del espacio cambió. Actualice los datos antes de revisar el soporte.');
      if (data.estado === 'Aprobado' && support.fecha_vencimiento && new Date(support.fecha_vencimiento) < new Date()) throw new BadRequestException('El soporte está vencido. Cargue una versión vigente.');
      const fields = evidenceFields(support.tipo_soporte);
      const campo = data.campo || (fields.length === 1 ? fields[0] : '');
      if (data.alcance !== 'documento' && !fields.includes(campo)) throw new BadRequestException('Seleccione una fila válida del soporte para revisarla individualmente.');
      const selectedFields = data.alcance === 'documento' ? fields : [campo];
      const previous = evidenceFieldDecision(support, selectedFields[0]);
      if (selectedFields.every(field => { const decision = evidenceFieldDecision(support, field); return decision.estado === data.estado && (data.estado === 'Aprobado' || decision.observacion === data.observacion!.trim()); })) return { id: supportId, campo, estado: data.estado };
      const decision = {
        estado: data.estado, observacion: data.estado === 'Rechazado' ? data.observacion!.trim() : null,
        documentoVersionId: data.documentoVersionId, revisadoPor: actorId, fechaRevision: new Date().toISOString(),
      };
      const decisions = { ...(support.revisiones_campos || {}), ...Object.fromEntries(selectedFields.map(field => [field, { ...decision }])) };
      const rowDecisions = fields.map(field => evidenceFieldDecision({ ...support, revisiones_campos: decisions }, field));
      const returned = rowDecisions.find(decision => decision.estado === 'Rechazado');
      const supportState = returned ? 'Rechazado' : rowDecisions.every(decision => decision.estado === 'Aprobado') ? 'Aprobado' : 'Pendiente';
      await runner.query('UPDATE academic_work_plan."RundSoporteCampo" SET estado = $1, observacion = $2, revisiones_campos = $4::jsonb WHERE id = $3', [supportState, returned?.observacion || null, supportId, JSON.stringify(decisions)]);
      await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = $1, revisado_por = $2,
        fecha_revision = NOW(), observacion = $3, version = version + 1, "updatedAt" = NOW() WHERE docente_id::text = $4 AND bloque = $5`,
        ['En revisión', actorId, null, docenteId, block]);
      // Returning one of several evidences is final only when no other evidence can accredit the row;
      // otherwise the reason stays on that evidence and the block remains in review.
      await blockStateAfterReturn(runner, docenteId, block, data.estado === 'Rechazado' ? data.observacion!.trim() : undefined);
      const checkpoint = (await runner.query('SELECT id, tipo_soporte, "createdAt" FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2', [docenteId, block]))
        .filter((s: any) => evidenceGroup(support.tipo_soporte).includes(s.tipo_soporte))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || String(a.id).localeCompare(String(b.id)));
      await evidenceAudit(runner, docenteId, block, data.estado === 'Aprobado' ? 'APROBAR_SOPORTE' : 'DEVOLVER_SOPORTE', actorId,
        { campo: data.alcance === 'documento' ? undefined : campo, campos: selectedFields, alcance: data.alcance || 'campo', estadoAnterior: previous.estado, estadoNuevo: data.estado, documentoVersionId: data.documentoVersionId, blockVersion: data.blockVersion, tipoSoporte: support.tipo_soporte, nombreArchivo: support.nombre_archivo,
          evidencia: Math.max(1, checkpoint.findIndex((s: any) => s.id === supportId) + 1), evidenciasVigentes: Math.max(1, checkpoint.length) },
        data.estado === 'Rechazado' ? data.observacion!.trim() : undefined, ip, supportId);
      await syncEvidenceSummary(runner, docenteId);
      return { id: supportId, campo, estado: data.estado };
    });
  }

  async reviewData(docenteId: string, block: string, campo: string, data: {estado:string;huella:string;blockVersion:number;observacion?:string}, actorId: string, ip?: string) {
    block = block.toUpperCase();
    if (!RUND_DATA_FIELDS[block]?.some(field => field.id === campo)) throw new BadRequestException('El dato no corresponde a esta pestaña.');
    if (!['Aprobado','Rechazado'].includes(data.estado)) throw new BadRequestException('Decisión del dato inválida.');
    if (data.estado === 'Rechazado' && (typeof data.observacion !== 'string' || !data.observacion.trim())) throw new BadRequestException('Indique qué dato está incorrecto y la corrección requerida.');
    if (data.observacion && data.observacion.length > 2000) throw new BadRequestException('La observación admite máximo 2000 caracteres.');
    return this.transaction(docenteId, async (runner,docente) => {
      const [current] = await runner.query('SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text=$1 AND bloque=$2 FOR UPDATE',[docenteId,block]);
      if (!current || !Number.isInteger(data.blockVersion) || data.blockVersion !== Number(current.version)) throw new ConflictException('La información cambió. Actualice antes de revisar el dato.');
      await runner.query('SELECT id_person FROM auth.personas WHERE id_person::text=$1 FOR SHARE',[docente.personaId]);
      const supports = await withCurrentEvidenceDocuments(runner,docenteId,await runner.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text=$1 AND bloque=$2',[docenteId,block]));
      const reviews = await loadDataReviews(runner,docenteId);
      const context = dataReviewContext(block,await loadDataReviewProfile(runner,docenteId),supports,reviews,current.estado);
      const decision = context[campo];
      if (!data.huella || data.huella !== decision.huella) throw new ConflictException('El dato o sus soportes cambiaron. Actualice y revise de nuevo.');
      if (data.estado === 'Aprobado' && !decision.puedeValidar) throw new BadRequestException('Registre el dato antes de validarlo. No se requiere adjuntar soportes.');
      const observation = data.estado === 'Rechazado' ? data.observacion!.trim() : undefined;
      await evidenceAudit(runner,docenteId,block,data.estado === 'Aprobado' ? 'APROBAR_DATO' : 'DEVOLVER_DATO',actorId,
        {campo,estado:data.estado,huella:decision.huella,soportes:decision.soportes,sinSoporteAdmitido:decision.soportes.length===0,criterioRevision:'DECISION_REVISOR',blockVersion:data.blockVersion},observation,ip);
      const anyReturned = data.estado === 'Rechazado' || Object.entries(context).some(([id,value]) => id !== campo && value.estado === 'Rechazado');
      const note = observation || Object.entries(context).find(([id,value]) => id !== campo && value.estado === 'Rechazado')?.[1].observacion || null;
      await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado=$1,observacion=$2,revisado_por=$3,fecha_revision=NOW(),version=version+1,"updatedAt"=NOW()
        WHERE docente_id::text=$4 AND bloque=$5`,[anyReturned ? 'Devuelto':'En revisión',note,actorId,docenteId,block]);
      await blockStateAfterReturn(runner,docenteId,block);
      await syncEvidenceSummary(runner,docenteId);
      return {campo,estado:data.estado};
    });
  }

  async reviewBlock(docenteId: string, block: string, actorId: string, observation?: string, ip?: string, blockVersion?: number) {
    block = block.toUpperCase();
    if (!EVIDENCE_TYPES[block]) throw new BadRequestException('Bloque inválido.');
    const returning = observation !== undefined;
    if (returning && (typeof observation !== 'string' || !observation.trim())) throw new BadRequestException('La devolución requiere un motivo y la corrección requerida.');
    return this.transaction(docenteId, async (runner, docente) => {
      const [current] = await runner.query('SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $1 AND bloque = $2 FOR UPDATE', [docenteId, block]);
      if (!current) throw new NotFoundException('Bloque no encontrado.');
      if (!Number.isInteger(blockVersion) || blockVersion !== Number(current.version)) {
        throw new ConflictException('La información del espacio cambió. Actualice los datos antes de aprobar o devolver el bloque.');
      }
      const supports = (await runner.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2', [docenteId, block])).filter((s: any) => isReviewableEvidence(s.tipo_soporte));
      if (returning && !canReturnEvidenceBlock(block, block === 'CONTACTO' ? [] : await withCurrentEvidenceDocuments(runner, docenteId, supports))) {
        throw new BadRequestException('Cargue al menos un soporte de este bloque antes de devolverlo.');
      }
      if (!returning) {
        // Supporting files remain independently reviewable; the final gate is the human data review.
        await runner.query('SELECT id_person FROM auth.personas WHERE id_person::text=$1 FOR SHARE',[docente.personaId]);
        const context = dataReviewContext(block,await loadDataReviewProfile(runner,docenteId),await withCurrentEvidenceDocuments(runner,docenteId,supports),await loadDataReviews(runner,docenteId),current.estado);
        const dataProblem = dataApprovalProblem(context);
        if (dataProblem) throw new BadRequestException(dataProblem);
      }
      const estado = returning ? 'Devuelto' : 'Aprobado';
      await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = $1, revisado_por = $2,
        fecha_revision = NOW(), observacion = $3, version = version + 1, "updatedAt" = NOW() WHERE docente_id::text = $4 AND bloque = $5`, [estado, actorId, observation?.trim() || null, docenteId, block]);
      // Returning a block requests correction of the data; individual decisions are preserved.
      await evidenceAudit(runner, docenteId, block, returning ? 'DEVOLVER' : 'APROBAR', actorId,
        { estadoAnterior: current.estado, estadoNuevo: estado, soportes: supports.map((s: any) => ({ id: s.id, documentoVersionId: s.documento_perfil_id || s.documento_carpeta_id, estado: s.estado })) }, observation?.trim(), ip);
      await syncEvidenceSummary(runner, docenteId);
      return { success: true, bloque: block, estado };
    });
  }
}
