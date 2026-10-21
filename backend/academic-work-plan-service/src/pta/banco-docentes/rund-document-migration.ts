import { createHash, randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { RundDocumentStorageService } from './rund-document-storage.service';

/** Una transacción por versión. Conservar originales permite repetir tras fallos. */
export async function migrateRundDocument(dataSource: DataSource, storage: RundDocumentStorageService,
  id: string, options: { apply: boolean; includeRetired: boolean; actor: string }) {
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  try {
    await runner.startTransaction();
    // Orden de bloqueo igual al CRUD para no competir con reemplazos/retiros.
    const [owner] = await runner.query('SELECT docente_id FROM academic_work_plan."RundDocumentoPerfil" WHERE id = $1', [id]);
    if (!owner) throw new Error('DOCUMENT_NOT_FOUND');
    await runner.query('SELECT id FROM academic_work_plan."Docente" WHERE id = $1 FOR UPDATE', [owner.docente_id]);
    const [document] = await runner.query(`SELECT d.*, COALESCE(p."personaId"::text, p.id::text) AS expediente_id
      FROM academic_work_plan."RundDocumentoPerfil" d JOIN academic_work_plan."Docente" p ON p.id::text = d.docente_id::text
      WHERE d.id = $1 FOR UPDATE OF d`, [id]);
    if (!document) throw new Error('DOCUMENT_NOT_FOUND');
    if (document.proveedor_almacenamiento === 'OPENKM') { await runner.rollbackTransaction(); return { id, estado: 'YA_EN_OPENKM' }; }
    if (!['ACTIVO', 'REEMPLAZADO'].includes(document.estado) && !(options.includeRetired && document.estado === 'ELIMINADO')) {
      await runner.rollbackTransaction(); return { id, estado: 'OMITIDO_POR_ESTADO' };
    }
    const content = await storage.readVerifiedLocal(document.proveedor_almacenamiento, document.almacenamiento_ruta,
      document.checksum_sha256, Number(document.tamano_bytes));
    if (!options.apply) { await runner.rollbackTransaction(); return { id, estado: 'FUENTE_VERIFICADA' }; }
    const target = await storage.copyVerifiedToOpenKm({ content, expedienteId: document.expediente_id,
      category: document.categoria_codigo, supportType: document.tipo_soporte, logicalId: document.documento_logico_id,
      version: Number(document.version), mimeType: document.mime_type });
    await runner.query(`UPDATE academic_work_plan."RundDocumentoPerfil"
      SET proveedor_almacenamiento = 'OPENKM', almacenamiento_id = $2, almacenamiento_ruta = $3 WHERE id = $1`,
    [id, target.storageId, target.storagePath]);
    await runner.query(`INSERT INTO academic_work_plan."RundAprobacionLog"
      (id, docente_id, bloque, accion, actor_id, canal_origen, soporte_id, metadata, "createdAt")
      VALUES ($1,$2,'DOCUMENTAL','MIGRAR_A_OPENKM',$3,'RUND_DOCUMENTAL',$4,$5::jsonb,NOW())`,
    [randomUUID(), document.docente_id, options.actor, id, JSON.stringify({
      proveedorAnterior: document.proveedor_almacenamiento,
      huellaRutaOrigen: createHash('sha256').update(document.almacenamiento_ruta).digest('hex'),
      checksumSha256: document.checksum_sha256, tamanoBytes: Number(document.tamano_bytes), originalConservado: true,
    })]);
    await runner.commitTransaction();
    return { id, estado: 'MIGRADO_VERIFICADO' };
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    // No borrar el remoto: puede estar confirmado pese a pérdida de conexión al COMMIT.
    throw error;
  } finally { await runner.release(); }
}
