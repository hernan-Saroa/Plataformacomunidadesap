import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { evidenceAudit, invalidateEditedEvidence, lockEvidenceProfile } from './rund-evidence-workflow';
import { extractionValueValidationError } from './rund-extraccion-fields';
import { RUND_INCORPORATION_SUPPORTS } from './rund-permission-policy';

export class RundIncorporacion {
  constructor(private readonly db: DataSource) {}

  async save(docenteId: string, data: any, actorId: string, ip?: string) {
    const allowed = new Set(['numeroContrato', 'fechaContratacion', 'fechaFin', 'soporteId', 'documentoVersionId', 'blockVersion', 'justificacion']);
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => !allowed.has(key))) {
      throw new BadRequestException('Esta acción solo permite registrar datos de contratación.');
    }
    const contract = typeof data.numeroContrato === 'string' ? data.numeroContrato.trim() : '';
    const reason = typeof data.justificacion === 'string' ? data.justificacion.trim() : '';
    if (!contract || contract.length > 200 || /[\u0000-\u001f\u007f]/.test(contract)) throw new BadRequestException('Indique el número de contrato o acto de vinculación (máximo 200 caracteres).');
    if (reason.length < 3 || reason.length > 1000) throw new BadRequestException('Indique la justificación del registro (3 a 1000 caracteres).');
    const startError = extractionValueValidationError('fechaInicioVinculacion', data.fechaContratacion);
    if (startError) throw new BadRequestException(startError);
    const end = data.fechaFin || null;
    if (end && (extractionValueValidationError('fechaFinVinculacion', end) || end < data.fechaContratacion)) {
      throw new BadRequestException('La fecha final debe ser válida e igual o posterior al inicio.');
    }
    if (!Number.isInteger(data.blockVersion) || typeof data.soporteId !== 'string' || typeof data.documentoVersionId !== 'string') {
      throw new BadRequestException('Seleccione un soporte vigente y actualice el bloque antes de guardar.');
    }
    const runner = this.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const profile = await lockEvidenceProfile(runner, docenteId);
      const [block] = await runner.query(`SELECT version FROM rund."RundCampoEstado"
        WHERE docente_id::text=$1 AND bloque='VINCULACION'`, [docenteId]);
      if (!block || Number(block.version) !== data.blockVersion) throw new ConflictException('La vinculación cambió. Actualice los datos antes de guardar.');
      const [support] = await runner.query(`SELECT s.id,s.documento_perfil_id FROM rund."RundSoporteCampo" s
        JOIN rund."RundDocumentoPerfil" d ON d.id=s.documento_perfil_id AND d.estado='ACTIVO' AND d.docente_id::text=$1
        WHERE s.docente_id::text=$1 AND s.id::text=$2 AND s.bloque='VINCULACION'
          AND s.tipo_soporte=ANY($3::text[]) AND COALESCE(s.estado,'')<>'Rechazado'
          AND (s.fecha_vencimiento IS NULL OR s.fecha_vencimiento>=NOW()) FOR UPDATE OF s,d`,
      [docenteId, data.soporteId, [...RUND_INCORPORATION_SUPPORTS]]);
      if (!support || support.documento_perfil_id !== data.documentoVersionId) throw new ConflictException('Seleccione la versión vigente de un contrato o acto de vinculación sin devolución pendiente.');
      const changes = {
        actoAdministrativoVinculacion: contract,
        fechaInicioVinculacion: data.fechaContratacion,
        fechaFinVinculacion: end,
      };
      const date = (value: any) => value == null ? null : value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
      const previous = { actoAdministrativoVinculacion: profile.actoAdministrativoVinculacion,
        fechaInicioVinculacion: date(profile.fechaInicioVinculacion), fechaFinVinculacion: date(profile.fechaFinVinculacion) };
      const fields = Object.keys(changes).filter(key => (previous[key] ?? null) !== changes[key]);
      if (fields.length) {
        await runner.query(`UPDATE rund."Docente" SET "actoAdministrativoVinculacion"=$2,
          "fechaInicioVinculacion"=$3::date,"fechaFinVinculacion"=$4::date,"updatedAt"=NOW() WHERE id::text=$1`,
        [docenteId, contract, data.fechaContratacion, end]);
        await invalidateEditedEvidence(runner, docenteId, fields, actorId, ip);
        await evidenceAudit(runner, docenteId, 'VINCULACION', 'REGISTRAR_DATOS_INCORPORACION', actorId,
          { anterior: previous, nuevo: changes, documentoVersionId: data.documentoVersionId }, reason, ip, support.id);
      }
      await runner.commitTransaction();
      return { changed: fields.length > 0, ...changes };
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally { await runner.release(); }
  }
}
