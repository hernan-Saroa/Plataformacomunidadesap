import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource, QueryRunner } from 'typeorm';

export const EVIDENCE_TYPES: Record<string, string[]> = {
  IDENTIDAD: ['documento_identidad', 'cedula_extranjeria', 'pasaporte'],
  CONTACTO: [],
  FORMACION: ['diploma_pregrado', 'acta_grado_pregrado', 'diploma_especializacion', 'acta_grado_especializacion', 'diploma_maestria', 'acta_grado_maestria', 'diploma_doctorado', 'acta_grado_doctorado', 'certificado_posdoctoral', 'convalidacion_men', 'hoja_vida_pro'],
  VINCULACION: ['acto_administrativo_vinculacion', 'resolucion_convocatoria', 'contrato', 'acto_administrativo_dedicacion', 'acto_administrativo_situacion', 'acto_adscripcion_territorial', 'resolucion_escalafon', 'resolucion_puntaje_salarial'],
  ACADEMICO: ['acto_asignacion_nucleo', 'certificacion_investigacion', 'acta_evaluacion_desempeno'],
  TRANSVERSAL: ['autorizacion_habeas_data', 'soporte_edicion_perfil', 'soporte_cambio_estado_perfil'],
};
export const isReviewableEvidence = (type: string) => !['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'].includes(type);
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
export function validateEvidenceType(block: string, type: string) {
  if (!EVIDENCE_TYPES[block]?.includes(type)) throw new BadRequestException('El tipo de soporte no corresponde al bloque seleccionado.');
}
const hasValue = (value: unknown) => !['', 'no', 'no aplica', 'n/a', 'na', 'ninguno', 'ninguna', 'sin información', 'no registrado'].includes(String(value ?? '').trim().toLowerCase());
export function requiredEvidence(block: string, docente: any): string[][] {
  if (block === 'IDENTIDAD') return [EVIDENCE_TYPES.IDENTIDAD];
  if (block === 'VINCULACION') return EVIDENCE_TYPES.VINCULACION.map(type => [type]);
  if (block === 'TRANSVERSAL') return [['autorizacion_habeas_data']];
  if (block === 'ACADEMICO') return [['acto_asignacion_nucleo'], ['acta_evaluacion_desempeno'], ...(hasValue(docente.investigacion) ? [['certificacion_investigacion']] : [])];
  if (block === 'FORMACION') {
    const required = [['diploma_pregrado'], ['hoja_vida_pro']];
    for (const [field, type] of Object.entries({ especializacion: 'diploma_especializacion', maestria: 'diploma_maestria', doctorado: 'diploma_doctorado', posDoctorado: 'certificado_posdoctoral' })) {
      if (hasValue(docente[field])) required.push([type]);
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

export async function lockEvidenceProfile(runner: QueryRunner, docenteId: string) {
  const [docente] = await runner.query('SELECT * FROM academic_work_plan."Docente" WHERE id = $1 FOR UPDATE', [docenteId]);
  if (!docente) throw new NotFoundException('Perfil docente no encontrado.');
  return docente;
}

export async function syncEvidenceSummary(runner: Pick<QueryRunner, 'query'>, docenteId: string) {
  const rows = await runner.query('SELECT bloque, estado FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $1', [docenteId]);
  const completitud = Object.fromEntries(rows.map((row: any) => [row.bloque, row.estado]));
  const activable = Object.keys(EVIDENCE_TYPES).filter(b => b !== 'CONTACTO').every(b => completitud[b] === 'Aprobado');
  const estado = rows.some((row: any) => row.estado === 'Devuelto') ? 'DEVUELTO' : activable ? 'ACTIVO_RUND' : 'PENDIENTE_APROBACION';
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
  // A different returned support must remain visible until it is corrected.
  await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = 'Devuelto'
    WHERE docente_id::text = $1 AND bloque = $2 AND EXISTS
    (SELECT 1 FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2 AND estado = 'Rechazado')`, [docenteId, block]);
  await syncEvidenceSummary(runner, docenteId);
}

export class RundEvidenceWorkflow {
  constructor(private readonly dataSource: DataSource) {}

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

  async reviewSupport(docenteId: string, block: string, supportId: string, data: { estado: string; campo?: string; observacion?: string; documentoVersionId: string; blockVersion?: number }, actorId: string, ip?: string) {
    block = block.toUpperCase();
    if (!['Aprobado', 'Rechazado'].includes(data.estado)) throw new BadRequestException('Decisión documental inválida.');
    if (data.estado === 'Rechazado' && (typeof data.observacion !== 'string' || !data.observacion.trim())) throw new BadRequestException('Indique el motivo de devolución y la corrección requerida.');
    return this.transaction(docenteId, async runner => {
      const [support] = await runner.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE id = $1 AND docente_id::text = $2 AND bloque = $3 FOR UPDATE', [supportId, docenteId, block]);
      if (!support) throw new NotFoundException('Soporte no encontrado en este bloque.');
      validateEvidenceType(block, support.tipo_soporte);
      if (!isReviewableEvidence(support.tipo_soporte)) throw new BadRequestException('Este soporte pertenece al trámite de edición del perfil.');
      if (!data.documentoVersionId || data.documentoVersionId !== (support.documento_perfil_id || support.documento_carpeta_id)) throw new ConflictException('El documento cambió. Actualice y revise la versión vigente.');
      if (support.cargado_por === actorId) throw new BadRequestException('La revisión requiere una persona distinta de quien cargó el soporte.');
      const [currentBlock] = await runner.query('SELECT version FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $1 AND bloque = $2', [docenteId, block]);
      if (!currentBlock || data.blockVersion !== Number(currentBlock.version)) throw new ConflictException('La información del espacio cambió. Actualice los datos antes de revisar el soporte.');
      if (data.estado === 'Aprobado' && support.fecha_vencimiento && new Date(support.fecha_vencimiento) < new Date()) throw new BadRequestException('El soporte está vencido. Cargue una versión vigente.');
      const fields = evidenceFields(support.tipo_soporte);
      const campo = data.campo || (fields.length === 1 ? fields[0] : '');
      if (!fields.includes(campo)) throw new BadRequestException('Seleccione una fila válida del soporte para revisarla individualmente.');
      const previous = evidenceFieldDecision(support, campo);
      if (previous.estado === data.estado && (data.estado === 'Aprobado' || previous.observacion === data.observacion!.trim())) return { id: supportId, campo, estado: data.estado };
      const decisions = { ...(support.revisiones_campos || {}), [campo]: {
        estado: data.estado, observacion: data.estado === 'Rechazado' ? data.observacion!.trim() : null,
        documentoVersionId: data.documentoVersionId, revisadoPor: actorId, fechaRevision: new Date().toISOString(),
      } };
      const rowDecisions = fields.map(field => evidenceFieldDecision({ ...support, revisiones_campos: decisions }, field));
      const returned = rowDecisions.find(decision => decision.estado === 'Rechazado');
      const supportState = returned ? 'Rechazado' : rowDecisions.every(decision => decision.estado === 'Aprobado') ? 'Aprobado' : 'Pendiente';
      await runner.query('UPDATE academic_work_plan."RundSoporteCampo" SET estado = $1, observacion = $2, revisiones_campos = $4::jsonb WHERE id = $3', [supportState, returned?.observacion || null, supportId, JSON.stringify(decisions)]);
      await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = $1, revisado_por = $2,
        fecha_revision = NOW(), observacion = $3, version = version + 1, "updatedAt" = NOW() WHERE docente_id::text = $4 AND bloque = $5`,
        [data.estado === 'Rechazado' ? 'Devuelto' : 'En revisión', actorId, data.estado === 'Rechazado' ? data.observacion!.trim() : null, docenteId, block]);
      await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = 'Devuelto' WHERE docente_id::text = $1 AND bloque = $2
        AND EXISTS (SELECT 1 FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2 AND estado = 'Rechazado')`, [docenteId, block]);
      await evidenceAudit(runner, docenteId, block, data.estado === 'Aprobado' ? 'APROBAR_SOPORTE' : 'DEVOLVER_SOPORTE', actorId,
        { campo, estadoAnterior: previous.estado, estadoNuevo: data.estado, documentoVersionId: data.documentoVersionId, blockVersion: data.blockVersion, tipoSoporte: support.tipo_soporte, nombreArchivo: support.nombre_archivo }, data.estado === 'Rechazado' ? data.observacion!.trim() : undefined, ip, supportId);
      await syncEvidenceSummary(runner, docenteId);
      return { id: supportId, campo, estado: data.estado };
    });
  }

  async reviewBlock(docenteId: string, block: string, actorId: string, observation?: string, ip?: string) {
    block = block.toUpperCase();
    if (!EVIDENCE_TYPES[block]) throw new BadRequestException('Bloque inválido.');
    const returning = observation !== undefined;
    if (returning && (typeof observation !== 'string' || !observation.trim())) throw new BadRequestException('La devolución requiere un motivo y la corrección requerida.');
    return this.transaction(docenteId, async (runner, docente) => {
      const [current] = await runner.query('SELECT * FROM academic_work_plan."RundCampoEstado" WHERE docente_id::text = $1 AND bloque = $2 FOR UPDATE', [docenteId, block]);
      if (!current) throw new NotFoundException('Bloque no encontrado.');
      if (current.cargado_por === actorId) throw new BadRequestException('La revisión requiere una persona distinta de quien cargó los datos.');
      const supports = (await runner.query('SELECT * FROM academic_work_plan."RundSoporteCampo" WHERE docente_id::text = $1 AND bloque = $2', [docenteId, block])).filter((s: any) => isReviewableEvidence(s.tipo_soporte));
      if (!returning) {
        const missing = requiredEvidence(block, docente).filter(group => !supports.some((s: any) => group.includes(s.tipo_soporte) && s.documento_carpeta_id));
        if (missing.length) throw new BadRequestException(`Faltan soportes obligatorios: ${missing.map(g => g[0]).join(', ')}.`);
        if (supports.some((s: any) => s.estado !== 'Aprobado' || evidenceFields(s.tipo_soporte).some(field => evidenceFieldDecision(s, field).estado !== 'Aprobado') || (s.fecha_vencimiento && new Date(s.fecha_vencimiento) < new Date()))) throw new BadRequestException('Revise y apruebe cada soporte vigente y cada fila antes de aprobar el bloque. Hay documentos pendientes, devueltos o vencidos.');
      }
      const estado = returning ? 'Devuelto' : 'Aprobado';
      await runner.query(`UPDATE academic_work_plan."RundCampoEstado" SET estado = $1, revisado_por = $2,
        fecha_revision = NOW(), observacion = $3, "updatedAt" = NOW() WHERE docente_id::text = $4 AND bloque = $5`, [estado, actorId, observation?.trim() || null, docenteId, block]);
      // Returning a block requests correction of the data; individual decisions are preserved.
      await evidenceAudit(runner, docenteId, block, returning ? 'DEVOLVER' : 'APROBAR', actorId,
        { estadoAnterior: current.estado, estadoNuevo: estado, soportes: supports.map((s: any) => ({ id: s.id, documentoVersionId: s.documento_perfil_id || s.documento_carpeta_id, estado: s.estado })) }, observation?.trim(), ip);
      await syncEvidenceSummary(runner, docenteId);
      return { success: true, bloque: block, estado };
    });
  }
}
