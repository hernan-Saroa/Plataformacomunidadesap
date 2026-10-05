import { migrateRundDocument } from './rund-document-migration';

function fixture(failAudit = false) {
  const document = { id: 'doc', docente_id: 'docente', expediente_id: 'persona', proveedor_almacenamiento: 'LOCAL',
    almacenamiento_ruta: 'rund-documentos/original.pdf', checksum_sha256: 'hash', tamano_bytes: 8,
    estado: 'ACTIVO', categoria_codigo: 'TITULOS', documento_logico_id: 'logical', version: 1, mime_type: 'application/pdf' };
  const runner = { isTransactionActive: true, connect: jest.fn(), startTransaction: jest.fn(), release: jest.fn(),
    commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), query: jest.fn(async (sql: string) => {
      if (sql.includes('INSERT') && failAudit) throw new Error('AUDIT_FAILED');
      return sql.includes('SELECT') ? [document] : [];
    }) };
  const db = { createQueryRunner: () => runner } as any;
  const storage = { readVerifiedLocal: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.7')),
    copyVerifiedToOpenKm: jest.fn().mockResolvedValue({ storageId: 'remote', storagePath: 'remote' }), remove: jest.fn() };
  return { db, storage, runner, document };
}

describe('Migración verificada de documentos históricos', () => {
  it('simula verificando la fuente, sin contactar OpenKM ni modificar registros', async () => {
    const { db, storage, runner } = fixture();
    expect(await migrateRundDocument(db, storage as any, 'doc', { apply: false, includeRetired: false, actor: '' })).toMatchObject({ estado: 'FUENTE_VERIFICADA' });
    expect(storage.copyVerifiedToOpenKm).not.toHaveBeenCalled();
    expect(runner.query.mock.calls.some(([sql]) => /UPDATE academic|INSERT/.test(sql))).toBe(false);
  });
  it('actualiza únicamente referencias y auditoría después de verificar la copia', async () => {
    const { db, storage, runner } = fixture();
    await migrateRundDocument(db, storage as any, 'doc', { apply: true, includeRetired: false, actor: 'operador' });
    const update = runner.query.mock.calls.find(([sql]) => sql.startsWith('UPDATE'))![0];
    expect(update).not.toMatch(/estado\s*=|version\s*=|checksum_sha256\s*=/);
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('revierte la referencia si falla la auditoría y conserva ambas copias', async () => {
    const { db, storage, runner } = fixture(true);
    await expect(migrateRundDocument(db, storage as any, 'doc', { apply: true, includeRetired: false, actor: 'operador' })).rejects.toThrow('AUDIT_FAILED');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
  it('no cambia referencias si el checksum de origen falla', async () => {
    const { db, storage, runner } = fixture();
    storage.readVerifiedLocal.mockRejectedValue(new Error('HASH_MISMATCH'));
    await expect(migrateRundDocument(db, storage as any, 'doc', { apply: true, includeRetired: false, actor: 'operador' })).rejects.toThrow();
    expect(storage.copyVerifiedToOpenKm).not.toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
  });
  it('omite retirados salvo selección explícita y reanuda filas ya migradas', async () => {
    const { db, storage, document } = fixture();
    document.estado = 'ELIMINADO';
    expect((await migrateRundDocument(db, storage as any, 'doc', { apply: true, includeRetired: false, actor: 'operador' })).estado).toBe('OMITIDO_POR_ESTADO');
    document.proveedor_almacenamiento = 'OPENKM';
    expect((await migrateRundDocument(db, storage as any, 'doc', { apply: true, includeRetired: true, actor: 'operador' })).estado).toBe('YA_EN_OPENKM');
    expect(storage.readVerifiedLocal).not.toHaveBeenCalled();
  });
});
