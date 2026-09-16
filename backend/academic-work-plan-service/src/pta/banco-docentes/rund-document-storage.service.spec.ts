import { RundDocumentStorageService } from './rund-document-storage.service';

describe('RundDocumentStorageService - contrato REST OpenKM', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.OPENKM_BASE_URL = 'http://openkm.test/OpenKM';
    process.env.OPENKM_USERNAME = 'rund';
    process.env.OPENKM_PASSWORD = 'secret';
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 200 }));
  });

  afterEach(() => {
    fetchMock.mockRestore();
    delete process.env.OPENKM_BASE_URL;
    delete process.env.OPENKM_USERNAME;
    delete process.env.OPENKM_PASSWORD;
    delete process.env.RUND_DOCUMENT_ALLOW_LOCAL;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('crea carpetas con JSON y el documento con multipart en /okm:root', async () => {
    const storage = new RundDocumentStorageService();
    const result = await storage.store({
      content: Buffer.from('%PDF-1.7'),
      documentNumber: '123456',
      category: 'TITULOS',
      logicalId: 'logical-id',
      version: 1,
    });

    expect(result.provider).toBe('OPENKM');
    expect(result.storagePath).toBe('/okm:root/RUND/123456/TITULOS/logical-id/v1.pdf');
    const folderCall = fetchMock.mock.calls[0];
    expect(folderCall[0]).toBe('http://openkm.test/OpenKM/services/rest/folder/createSimple');
    expect(folderCall[1]).toEqual(expect.objectContaining({
      method: 'POST',
      body: '/okm:root/RUND',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    const createCall = fetchMock.mock.calls.at(-1)!;
    expect(createCall[0]).toBe('http://openkm.test/OpenKM/services/rest/document/createSimple');
    expect(createCall[1]?.body).toBeInstanceOf(FormData);
    const form = createCall[1]?.body as FormData;
    expect(form.get('docPath')).toBe('/okm:root/RUND/123456/TITULOS/logical-id/v1.pdf');
    expect(form.get('content')).toBeInstanceOf(Blob);
  });

  it('consulta y elimina usando el parámetro docId aceptado por OpenKM', async () => {
    const storage = new RundDocumentStorageService();
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    await storage.read('OPENKM', '/okm:root/RUND/doc.pdf');
    await storage.remove('OPENKM', '/okm:root/RUND/doc.pdf');

    expect(String(fetchMock.mock.calls[0][0])).toContain('/document/getContent?docId=%2Fokm%3Aroot%2FRUND%2Fdoc.pdf');
    expect(String(fetchMock.mock.calls[1][0])).toContain('/document/delete?docId=%2Fokm%3Aroot%2FRUND%2Fdoc.pdf');
  });

  it('impide almacenamiento local silencioso en producción', async () => {
    delete process.env.OPENKM_BASE_URL;
    process.env.NODE_ENV = 'production';
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'false';
    const storage = new RundDocumentStorageService();

    await expect(storage.store({
      content: Buffer.from('%PDF-1.7'),
      documentNumber: '123456',
      category: 'TITULOS',
      logicalId: 'logical-id',
      version: 1,
    })).rejects.toThrow('OpenKM es obligatorio');
  });
});
