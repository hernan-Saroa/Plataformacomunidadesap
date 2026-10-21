import { promises as fs } from 'fs';
import { resolve } from 'path';
import { RundDocumentStorageService } from './rund-document-storage.service';
import { RundDocumentosService } from './rund-documentos.service';
import { BancoDocentesController } from './banco-docentes.controller';
import { rundDocumentalEnabled } from './rund-documental-feature';

describe('Despliegue con F011/F012/F013 aplazadas', () => {
  const keys = ['RUND_DOCUMENTAL_ENABLED', 'RUND_DOCUMENT_PROVIDER', 'RUND_DOCUMENT_LOCAL_ROOT',
    'RUND_TRD_POLICY_FILE', 'RUND_PRIVACY_POLICY_FILE', 'OPENKM_BASE_URL', 'RUND_DOCUMENT_ALLOW_LOCAL', 'NODE_ENV'];
  let saved: Record<string, string | undefined>;
  beforeEach(() => {
    saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    delete process.env.RUND_DOCUMENTAL_ENABLED;
    delete process.env.OPENKM_BASE_URL;
    process.env.NODE_ENV = 'production';
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'false';
    process.env.RUND_DOCUMENT_PROVIDER = 'OPENKM';
    process.env.RUND_DOCUMENT_LOCAL_ROOT = '/directorio-nuevo-no-configurado';
    process.env.RUND_TRD_POLICY_FILE = 'no-existe.json';
    process.env.RUND_PRIVACY_POLICY_FILE = 'no-existe.json';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
  });

  it.each([undefined, 'false', '', '1', 'yes', 'TRUE', ' true '])('permanece apagado con %s sin requerir configuración nueva', value => {
    if (value !== undefined) process.env.RUND_DOCUMENTAL_ENABLED = value;
    expect(rundDocumentalEnabled()).toBe(false);
    expect(new RundDocumentosService({} as any, {} as any).configurationStatus())
      .toEqual({ habilitado: false, disposicionAutomatica: false });
  });

  it('bloquea operaciones nuevas antes de consultar base de datos, disco u OpenKM', async () => {
    const db = { query: jest.fn(), createQueryRunner: jest.fn() };
    const service = new RundDocumentosService(db as any, {} as any);
    await expect(service.ensureExpediente('docente', 'actor')).rejects.toThrow('no está habilitada');
    await expect(service.getRetention('docente', 'doc')).rejects.toThrow('no está habilitada');
    await expect(service.manageRetention('docente', 'doc', {}, 'actor')).rejects.toThrow('no está habilitada');
    const storage = new RundDocumentStorageService();
    await expect(storage.ensureExpediente('persona')).rejects.toThrow('no está habilitada');
    await expect(storage.copyVerifiedToOpenKm({} as any)).rejects.toThrow('no está habilitada');
    expect(db.query).not.toHaveBeenCalled();
    expect(db.createQueryRunner).not.toHaveBeenCalled();
  });

  it('el CRUD previo conserva sus rutas, proveedor y permiso local; lee también históricos', async () => {
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'true';
    const mkdir = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    const write = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    const read = jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('%PDF-fixture'));
    const fetch = jest.spyOn(global, 'fetch');
    const storage = new RundDocumentStorageService();
    const doc = await storage.store({ content: Buffer.from('%PDF-fixture'), expedienteId: 'persona',
      documentNumber: '123456', category: 'TITULOS', logicalId: 'logical', version: 1 });
    expect(doc).toEqual({ provider: 'LOCAL', storageId: null, storagePath: 'rund-documentos/123456/TITULOS/logical/v1.pdf' });
    expect(write).toHaveBeenCalledWith(resolve('uploads', doc.storagePath), expect.any(Buffer), { flag: 'wx' });
    expect(mkdir).toHaveBeenCalledTimes(1);
    await storage.read('LOCAL', 'rund-documentos/expedientes/persona/FORMACION/logical/v1.pdf');
    expect(read).toHaveBeenCalledWith(resolve('uploads/rund-documentos/expedientes/persona/FORMACION/logical/v1.pdf'));
    expect(fetch).not.toHaveBeenCalled();
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'false';
    await expect(storage.store({ content: Buffer.from('x'), expedienteId: 'persona', category: 'OTROS', logicalId: 'other', version: 1 }))
      .rejects.toThrow('no está configurado');
    expect(write).toHaveBeenCalledTimes(1);
  });

  it.each(['soporte_edicion_perfil', 'soporte_cambio_estado_perfil'])('conserva %s sin conectar el gestor nuevo', async tipoSoporte => {
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    const write = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    const service = { vincularSoporte: jest.fn().mockResolvedValue({ id: 'soporte-anterior', estado: 'Pendiente' }) };
    const documents = { create: jest.fn(), list: jest.fn() };
    const controller = new BancoDocentesController(service as any,
      { validate: jest.fn().mockResolvedValue({ validated: false }) } as any, documents as any);
    const file = { originalname: 'soporte.pdf', mimetype: 'application/pdf', size: 9, buffer: Buffer.from('%PDF-1.7') } as Express.Multer.File;
    const result = await controller.vincularSoporte('docente-1', 'TRANSVERSAL',
      { tipoSoporte, docenteNombre: 'PRUEBA', cargadoPor: 'falso' },
      { user: { userId: 'actor-real', roles: ['GESTION_PROFESORAL'] } }, file);
    expect(result.data.id).toBe('soporte-anterior');
    expect(service.vincularSoporte).toHaveBeenCalledWith('docente-1', 'TRANSVERSAL', expect.objectContaining({
      cargadoPor: 'actor-real', documentoCarpetaId: expect.stringMatching(/^\/pta\/api\/v1\/uploads\/carpeta-digital\/PRUEBA\/RUND\/.*\.pdf$/),
    }));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('./uploads/carpeta-digital/PRUEBA/RUND/'), file.buffer, { flag: 'wx' });
    expect(documents.create).not.toHaveBeenCalled();
    expect(documents.list).not.toHaveBeenCalled();
  });
});
