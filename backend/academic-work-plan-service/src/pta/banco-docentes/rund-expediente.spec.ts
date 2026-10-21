import { RundDocumentosService } from './rund-documentos.service';

const originalDocumentalEnabled = process.env.RUND_DOCUMENTAL_ENABLED;
beforeEach(() => { process.env.RUND_DOCUMENTAL_ENABLED = 'true'; });
afterEach(() => {
  if (originalDocumentalEnabled === undefined) delete process.env.RUND_DOCUMENTAL_ENABLED;
  else process.env.RUND_DOCUMENTAL_ENABLED = originalDocumentalEnabled;
});
import { RUND_STANDARD_FOLDERS } from './rund-expediente';

const personaId = '22222222-2222-4222-8222-222222222222';
const docente = { id: '11111111-1111-4111-8111-111111111111', persona_id: personaId };
const pdf = { originalname: 'soporte.pdf', mimetype: 'application/pdf', size: 9, buffer: Buffer.from('%PDF-1.7\n') } as Express.Multer.File;

function setup() {
  const runner = {
    isTransactionActive: true,
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn(),
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('"Docente"') && sql.includes('FOR UPDATE')) return [docente];
      if (sql.startsWith('SELECT id FROM') && sql.includes('"RundSoporteCampo"')) return [{ id: 'soporte-anterior' }];
      if (sql.includes('INSERT INTO academic_work_plan."RundDocumentoPerfil"')) return [{
        id: params[0], docente_id: params[2], categoria_codigo: params[3], tipo_soporte: params[5],
        version: 1, nombre_archivo: params[7], mime_type: params[15], rund_soporte_id: params[13], estado: 'ACTIVO',
      }];
      return [];
    }),
  };
  const db = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM academic_work_plan."Docente"')) return [docente];
      if (sql.includes('FROM academic_work_plan."RundDocumentoCategoria"')) return [{ codigo: 'OTROS', tamano_maximo_bytes: 10485760 }];
      return [];
    }),
    createQueryRunner: jest.fn(() => runner),
  };
  const storage = {
    ensureExpediente: jest.fn(),
    store: jest.fn().mockResolvedValue({ provider: 'OPENKM', storagePath: '/okm:root/RUND/nuevo.pdf', storageId: 'file-1' }),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  return { db, runner, storage, service: new RundDocumentosService(db as any, storage as any) };
}

describe('Expediente estándar y soportes de gestión RUND', () => {
  it('comparte carpeta entre períodos de la misma persona y devuelve solo metadatos públicos', async () => {
    const { service, db, storage } = setup();
    const first = await service.ensureExpediente(docente.id, 'ggp', '127.0.0.1');
    db.query.mockImplementation(async sql => sql.includes('FROM academic_work_plan."Docente"')
      ? [{ ...docente, id: 'otro-periodo' }] : []);
    await service.ensureExpediente('otro-periodo', 'ggp');
    expect(storage.ensureExpediente.mock.calls).toEqual([[personaId], [personaId]]);
    expect(first).toEqual({ docenteId: docente.id, preparado: true, estructuraVersion: 1, carpetas: RUND_STANDARD_FOLDERS });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('"RundAprobacionLog"'), expect.arrayContaining(['PREPARAR_EXPEDIENTE', 'ggp', '127.0.0.1']));
  });

  it('no informa éxito cuando no puede registrar la auditoría del expediente', async () => {
    const { service, db } = setup();
    db.query.mockImplementation(async sql => {
      if (sql.includes('"RundAprobacionLog"')) throw new Error('audit unavailable');
      return [docente];
    });
    await expect(service.ensureExpediente(docente.id, 'ggp')).rejects.toThrow('audit unavailable');
  });

  it('cada edición crea una evidencia nueva sin sobrescribir el soporte anterior ni reabrir bloques', async () => {
    const { service, runner, storage } = setup();
    const input = { categoria: 'OTROS', bloque: 'TRANSVERSAL', tipoSoporte: 'soporte_edicion_perfil' };
    const first = await service.create(docente.id, input, pdf, 'ggp');
    const second = await service.create(docente.id, input, pdf, 'ggp');
    expect(first.rundSoporteId).not.toBe(second.rundSoporteId);
    expect(first.soporteGestion).toBe(true);
    expect(runner.query.mock.calls.filter(([sql]) => sql.includes('UPDATE academic_work_plan."RundSoporteCampo"'))).toHaveLength(0);
    expect(runner.query.mock.calls.some(([sql]) => sql.includes('"RundCampoEstado"'))).toBe(false);
    expect(storage.store).toHaveBeenCalledWith(expect.objectContaining({ expedienteId: personaId, mimeType: 'application/pdf' }));
  });

  it('almacena PNG válido conservando su MIME y rechaza archivos que solo fingen ser una imagen', async () => {
    const { service, storage } = setup();
    const input = { categoria: 'OTROS', bloque: 'TRANSVERSAL', tipoSoporte: 'soporte_cambio_estado_perfil' };
    const png = { ...pdf, originalname: 'soporte.png', mimetype: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) };
    const result = await service.create(docente.id, input, png, 'ggp');
    expect(result.mimeType).toBe('image/png');
    await expect(service.create(docente.id, input, { ...png, buffer: Buffer.from('no-png') }, 'ggp')).rejects.toThrow('válido');
    expect(storage.store).toHaveBeenCalledTimes(1);
  });

  it.each(['replace', 'remove'] as const)('bloquea %s sobre evidencias administrativas ya registradas', async method => {
    const { service, db, storage, runner } = setup();
    db.query.mockImplementation(async sql => sql.includes('"RundDocumentoPerfil"')
      ? [{ tipo_soporte: 'soporte_edicion_perfil', estado: 'ACTIVO' }] : [docente]);
    await expect(method === 'replace'
      ? service.replace(docente.id, 'document-1', pdf, 'ggp')
      : service.remove(docente.id, 'document-1', 'ggp')).rejects.toThrow('se conserva como evidencia');
    expect(storage.store).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
    expect(runner.connect).not.toHaveBeenCalled();
  });

  it('revierte metadatos y compensa únicamente el archivo nuevo si falla la transacción', async () => {
    const { service, runner, storage } = setup();
    const original = runner.query.getMockImplementation()!;
    runner.query.mockImplementation(async (sql, params) => {
      if (sql.includes('INSERT INTO academic_work_plan."RundDocumentoPerfil"')) throw new Error('DB failure');
      return original(sql, params);
    });
    await expect(service.create(docente.id, { categoria: 'OTROS' }, pdf, 'ggp')).rejects.toThrow('DB failure');
    expect(runner.rollbackTransaction).toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledWith('OPENKM', '/okm:root/RUND/nuevo.pdf');
    expect(runner.release).toHaveBeenCalled();
  });

  it('no escribe en OpenKM si falla la conexión a la transacción', async () => {
    const { service, runner, storage } = setup();
    runner.isTransactionActive = false;
    runner.connect.mockRejectedValue(new Error('DB unavailable'));
    await expect(service.create(docente.id, { categoria: 'OTROS' }, pdf, 'ggp')).rejects.toThrow('DB unavailable');
    expect(storage.store).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
