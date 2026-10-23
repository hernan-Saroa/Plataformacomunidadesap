import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

const MAX_SELECTION = 10000;
// Docente stores UUID identifiers in a TEXT column; the audit uses UUID.
const RECORD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function deletionIds(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > MAX_SELECTION || value.some(id => typeof id !== 'string' || !RECORD_ID.test(id))) {
    throw new BadRequestException('Seleccione entre 1 y 10.000 registros RUND válidos.');
  }
  return [...new Set(value)].sort();
}
export function deletionFingerprint(rows: any[]) {
  return createHash('sha256').update(JSON.stringify(rows.map(row => [String(row.id),
    row.updatedAt ? new Date(row.updatedAt).toISOString() : null]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))).digest('hex');
}

export async function confirmRundDeletion(db: DataSource, body: any, actorId: string, ip?: string) {
  const ids = deletionIds(body?.ids);
  const reason = typeof body?.motivo === 'string' ? body.motivo.trim() : '';
  if (reason.length < 10 || reason.length > 1000) throw new BadRequestException('Indique un motivo de eliminación entre 10 y 1.000 caracteres.');
  if (body?.confirmado !== true || !/^[a-f0-9]{64}$/.test(body?.fingerprint || '')) throw new BadRequestException('Revise y confirme la selección antes de eliminar.');
  if (!actorId || actorId === 'SISTEMA') throw new BadRequestException('No se pudo identificar al responsable de la eliminación.');
  return db.transaction(async manager => {
    const rows = await manager.query(`SELECT id, "personaId", "periodoCarga", "updatedAt", "eliminadoRund"
      FROM academic_work_plan."Docente" WHERE id::text = ANY($1::text[]) ORDER BY id FOR UPDATE`, [ids]);
    if (rows.length !== ids.length || rows.some(row => row.eliminadoRund) || deletionFingerprint(rows) !== body.fingerprint) {
      throw new ConflictException('La selección cambió desde la confirmación. Actualice el listado y vuelva a seleccionarla.');
    }
    const operationId = randomUUID();
    await manager.query(`UPDATE academic_work_plan."Docente" SET "eliminadoRund"=true, "updatedAt"=NOW()
      WHERE id::text=ANY($1::text[])`, [ids]);
    // The audit is part of the same transaction: either every row is removed and logged, or none is.
    await manager.query(`INSERT INTO academic_work_plan."RundAprobacionLog"
      (id, docente_id, bloque, accion, actor_id, canal_origen, campo_afectado,
       dato_previo, dato_nuevo, observacion, ip, metadata, "createdAt")
      SELECT gen_random_uuid(), d.id::uuid, 'GENERAL', 'ELIMINAR_REGISTRO', $2, 'MODAL', 'REGISTRO_RUND',
        'VISIBLE', 'ELIMINADO', $3, $4,
        jsonb_build_object('operacionId', $5::text, 'periodoCarga', d."periodoCarga",
          'cantidad', $6::int, 'tipoEliminacion', 'LOGICA'), NOW()
      FROM academic_work_plan."Docente" d WHERE d.id::text=ANY($1::text[])`,
      [ids, actorId, reason, ip || null, operationId, ids.length]);
    return { eliminados: ids.length, operacionId: operationId };
  });
}
