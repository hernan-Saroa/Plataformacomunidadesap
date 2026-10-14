import { createHash } from 'crypto';
import { RundAuthStateSyncService, validateAuthState } from './rund-auth-state-sync.service';
import { RundAuthStateSyncWorker } from './rund-auth-state-sync.worker';

describe('Estados cuyo propietario es Auth', () => {
  const persona = '11111111-1111-4111-8111-111111111111';
  const doc = { id: '22222222-2222-4222-8222-222222222222', revision_documento: 'a'.repeat(64), categoria: 'personal',
    tipo_documento_id: null, estado: 'validado', fecha_subida: '2026-10-13T00:00:00.000Z', fecha_validacion: null, fecha_vencimiento: null };
  const envelope = (documentos: any[] = [doc], deleted = false) => ({ schema: 1, propietario: 'auth', scope: 'documentos-generales',
    persona_id: persona, revision: '9007199254740993', complete: true, deleted, total: documentos.length, documentos,
    fingerprint: createHash('sha256').update(JSON.stringify({ deleted, documentos })).digest('hex') });
  it('acepta estado completo y revisiones mayores que Number.MAX_SAFE_INTEGER sin redondear', () => {
    expect(validateAuthState({ success: true, data: envelope() }, persona).revision).toBe('9007199254740993');
    expect(validateAuthState(envelope([], true), persona).documentos).toEqual([]);
  });
  it.each([
    { complete: false }, { propietario: 'pta' }, { scope: 'rund' }, { persona_id: doc.id }, { total: 0 },
    { deleted: true }, { revision: 1 }, { revision: '-1' }, { revision: '01' }, { revision: '9223372036854775808' },
    { fingerprint: 'b'.repeat(64) }, { documentos: [] },
  ])('rechaza estados parciales, ajenos, desordenados o inconsistentes: %j', changes => {
    expect(() => validateAuthState({ ...envelope(), ...changes }, persona)).toThrow();
  });
  it.each([
    { estado: 'Aceptado' }, { categoria: ' RUND ' }, { fecha_subida: null }, { fecha_validacion: 'ayer' },
    { nombre: 'privado.pdf' }, { revision_documento: null }, { id: 'identidad-inválida' },
  ])('rechaza metadatos privados o fuera del contrato: %j', changes => {
    expect(() => validateAuthState(envelope([{ ...doc, ...changes }]), persona)).toThrow();
  });
  it('rechaza IDs repetidos y orden inverso aunque el fingerprint corresponda', () => {
    expect(() => validateAuthState(envelope([doc, doc]), persona)).toThrow();
    expect(() => validateAuthState(envelope([{ ...doc, id: '33333333-3333-4333-8333-333333333333' }, doc]), persona)).toThrow();
  });
  it('apagado no inicia consultas, HTTP ni temporizadores del worker', async () => {
    const previous = process.env.RUND_CARPETA_SYNC_ENABLED; process.env.RUND_CARPETA_SYNC_ENABLED = 'false';
    try {
      const db = { query: jest.fn(), transaction: jest.fn() }, service = new RundAuthStateSyncService(db as any);
      const worker = new RundAuthStateSyncWorker(db as any, service);
      worker.onApplicationBootstrap(); await worker.tick(); worker.onModuleDestroy();
      await expect(service.syncPersona(persona)).rejects.toMatchObject({ status: 409 });
      expect(db.query).not.toHaveBeenCalled(); expect(db.transaction).not.toHaveBeenCalled();
    } finally { if (previous === undefined) delete process.env.RUND_CARPETA_SYNC_ENABLED; else process.env.RUND_CARPETA_SYNC_ENABLED = previous; }
  });
});
