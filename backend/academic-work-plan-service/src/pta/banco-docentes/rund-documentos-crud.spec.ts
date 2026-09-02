import { RundDocumentosService } from './rund-documentos.service';

const pdfFile = {
  fieldname: 'file',
  originalname: 'diploma.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 12,
  destination: '',
  filename: '',
  path: '',
  buffer: Buffer.from('%PDF-1.7\n'),
} as Express.Multer.File;

const docente = { id: '11111111-1111-1111-1111-111111111111', document_number: '123456' };
const category = {
  codigo: 'TITULOS',
  nombre: 'Títulos',
  mime_permitidos: ['application/pdf'],
  tamano_maximo_bytes: 10 * 1024 * 1024,
};

function transaction(queryImplementation: (sql: string, params?: any[]) => any) {
  const runner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    query: jest.fn(queryImplementation),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };
  return runner;
}

describe('RundDocumentosService - ciclo CRUD documental', () => {
  afterEach(() => delete process.env.RUND_DOCUMENT_MAX_SIZE_BYTES);

  it('carga el PDF, crea la versión 1 y registra actor e IP', async () => {
    const runner = transaction((sql) => {
      if (sql.includes('INSERT INTO academic_work_plan."RundDocumentoPerfil"')) {
        return [{
          id: 'doc-v1',
          documento_logico_id: 'logical-1',
          docente_id: docente.id,
          categoria_codigo: 'TITULOS',
          version: 1,
          nombre_archivo: pdfFile.originalname,
          mime_type: pdfFile.mimetype,
          tamano_bytes: pdfFile.size,
          estado: 'ACTIVO',
          creado_por: 'admin-1',
          createdAt: new Date(),
        }];
      }
      return [];
    });
    const dataSource = {
      query: jest.fn()
        .mockResolvedValueOnce([docente])
        .mockResolvedValueOnce([category]),
      createQueryRunner: jest.fn(() => runner),
    };
    const storage = {
      store: jest.fn().mockResolvedValue({
        provider: 'OPENKM',
        storageId: '/okm:root/RUND/123456/TITULOS/logical-1/v1.pdf',
        storagePath: '/okm:root/RUND/123456/TITULOS/logical-1/v1.pdf',
      }),
      remove: jest.fn(),
    };
    const service = new RundDocumentosService(dataSource as any, storage as any);

    const result = await service.create(
      docente.id,
      { categoria: 'titulos', descripcion: 'Diploma de pregrado' },
      pdfFile,
      'admin-1',
      '10.0.0.1',
    );

    expect(result).toEqual(expect.objectContaining({ id: 'doc-v1', version: 1, estado: 'ACTIVO' }));
    expect(storage.store).toHaveBeenCalledWith(expect.objectContaining({
      documentNumber: '123456',
      category: 'TITULOS',
      version: 1,
    }));
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringContaining("'RUND_DOCUMENTAL'"),
      expect.arrayContaining(['CARGAR_DOCUMENTO', 'admin-1', '10.0.0.1']),
    );
    expect(runner.commitTransaction).toHaveBeenCalled();
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('reemplaza sin sobrescribir: conserva la fila anterior y crea la versión siguiente', async () => {
    const current = {
      id: 'doc-v1',
      documento_logico_id: 'logical-1',
      docente_id: docente.id,
      categoria_codigo: 'TITULOS',
      bloque: 'FORMACION',
      tipo_soporte: null,
      descripcion: 'Diploma',
      version: 1,
      nombre_archivo: 'diploma-anterior.pdf',
      estado: 'ACTIVO',
      rund_soporte_id: null,
    };
    const runner = transaction((sql) => {
      if (sql.includes('INSERT INTO academic_work_plan."RundDocumentoPerfil"')) {
        return [{
          ...current,
          id: 'doc-v2',
          version: 2,
          nombre_archivo: pdfFile.originalname,
          mime_type: pdfFile.mimetype,
          tamano_bytes: pdfFile.size,
          creado_por: 'admin-2',
          createdAt: new Date(),
        }];
      }
      return [];
    });
    const dataSource = {
      query: jest.fn()
        .mockResolvedValueOnce([docente])
        .mockResolvedValueOnce([current])
        .mockResolvedValueOnce([category]),
      createQueryRunner: jest.fn(() => runner),
    };
    const storage = {
      store: jest.fn().mockResolvedValue({
        provider: 'OPENKM',
        storageId: '/okm:root/RUND/123456/TITULOS/logical-1/v2.pdf',
        storagePath: '/okm:root/RUND/123456/TITULOS/logical-1/v2.pdf',
      }),
      remove: jest.fn(),
    };
    const service = new RundDocumentosService(dataSource as any, storage as any);

    const result = await service.replace(docente.id, current.id, pdfFile, 'admin-2');

    expect(result).toEqual(expect.objectContaining({ id: 'doc-v2', version: 2 }));
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringContaining("SET estado = 'REEMPLAZADO'"),
      [current.id],
    );
    expect(storage.store).toHaveBeenCalledWith(expect.objectContaining({
      logicalId: 'logical-1',
      version: 2,
    }));
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringContaining("'RUND_DOCUMENTAL'"),
      expect.arrayContaining(['REEMPLAZAR_DOCUMENTO', 'admin-2']),
    );
  });

  it('descarga el contenido únicamente desde el documento asociado al perfil', async () => {
    const current = {
      id: 'doc-v1',
      docente_id: docente.id,
      estado: 'ACTIVO',
      proveedor_almacenamiento: 'OPENKM',
      almacenamiento_ruta: '/okm:root/RUND/123456/TITULOS/logical-1/v1.pdf',
      nombre_archivo: 'diploma.pdf',
      mime_type: 'application/pdf',
    };
    const dataSource = {
      query: jest.fn()
        .mockResolvedValueOnce([docente])
        .mockResolvedValueOnce([current]),
    };
    const storage = { read: jest.fn().mockResolvedValue(pdfFile.buffer) };
    const service = new RundDocumentosService(dataSource as any, storage as any);

    const result = await service.content(docente.id, current.id);

    expect(result).toEqual({
      buffer: pdfFile.buffer,
      fileName: 'diploma.pdf',
      mimeType: 'application/pdf',
    });
    expect(storage.read).toHaveBeenCalledWith('OPENKM', current.almacenamiento_ruta);
  });

  it('elimina el documento vigente y registra la acción en la misma transacción', async () => {
    const current = {
      id: 'doc-v1',
      docente_id: docente.id,
      documento_logico_id: 'logical-1',
      categoria_codigo: 'TITULOS',
      bloque: 'FORMACION',
      version: 1,
      nombre_archivo: 'diploma.pdf',
      estado: 'ACTIVO',
      proveedor_almacenamiento: 'OPENKM',
      almacenamiento_ruta: '/okm:root/RUND/123456/TITULOS/logical-1/v1.pdf',
      rund_soporte_id: null,
    };
    const runner = transaction(() => []);
    const dataSource = {
      query: jest.fn()
        .mockResolvedValueOnce([docente])
        .mockResolvedValueOnce([current]),
      createQueryRunner: jest.fn(() => runner),
    };
    const storage = { remove: jest.fn().mockResolvedValue(undefined) };
    const service = new RundDocumentosService(dataSource as any, storage as any);

    await expect(service.remove(docente.id, current.id, 'admin-3', '10.0.0.3'))
      .resolves.toEqual({ id: current.id, eliminado: true });
    expect(storage.remove).toHaveBeenCalledWith('OPENKM', current.almacenamiento_ruta);
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringContaining("SET estado = 'ELIMINADO'"),
      ['admin-3', current.id],
    );
    expect(runner.query).toHaveBeenCalledWith(
      expect.stringContaining("'RUND_DOCUMENTAL'"),
      expect.arrayContaining(['ELIMINAR_DOCUMENTO', 'admin-3', '10.0.0.3']),
    );
    expect(runner.commitTransaction).toHaveBeenCalled();
  });
});
