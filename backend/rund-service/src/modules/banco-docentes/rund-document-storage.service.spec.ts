import { RundDocumentStorageService } from './rund-document-storage.service';

const originalDocumentalEnabled = process.env.RUND_DOCUMENTAL_ENABLED;
beforeEach(() => { process.env.RUND_DOCUMENTAL_ENABLED = 'true'; });
afterEach(() => {
  if (originalDocumentalEnabled === undefined) delete process.env.RUND_DOCUMENTAL_ENABLED;
  else process.env.RUND_DOCUMENTAL_ENABLED = originalDocumentalEnabled;
});
import { promises as fs } from 'fs';
import { RUND_STANDARD_FOLDERS } from './rund-expediente';

describe('RundDocumentStorageService - contrato REST OpenKM', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.OPENKM_BASE_URL = 'http://openkm.test/OpenKM';
    process.env.OPENKM_USERNAME = 'rund';
    process.env.OPENKM_PASSWORD = 'secret';
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (_url, options) => new Response(JSON.stringify({
      path: options?.body instanceof FormData ? options.body.get('docPath') : options?.body,
    })));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENKM_BASE_URL;
    delete process.env.OPENKM_USERNAME;
    delete process.env.OPENKM_PASSWORD;
    delete process.env.RUND_DOCUMENT_ALLOW_LOCAL;
    delete process.env.RUND_DOCUMENT_PROVIDER;
    delete process.env.OPENKM_TIMEOUT_MS;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('prepara las cinco carpetas vacías y puede repetir la operación tras conflictos', async () => {
    const folders = new Set<string>();
    fetchMock.mockImplementation(async (url, options) => {
      if (options?.method === 'GET') return new Response(JSON.stringify({ path: new URL(String(url)).searchParams.get('fldId') }));
      const path = String(options?.body);
      if (folders.has(path)) return new Response('', { status: 409 });
      folders.add(path);
      return new Response(JSON.stringify({ path }));
    });
    const storage = new RundDocumentStorageService();
    await storage.ensureExpediente('persona-1');
    await storage.ensureExpediente('persona-1');
    for (const folder of RUND_STANDARD_FOLDERS) expect(folders.has(`/okm:root/RUND/expedientes/persona-1/${folder}`)).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/document/'))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/folder/getProperties?fldId='))).toBe(true);
  });

  it('no interpreta un error con la palabra exists como una carpeta existente', async () => {
    fetchMock.mockResolvedValue(new Response('Path does not exist: secret', { status: 500 }));
    await expect(new RundDocumentStorageService().ensureExpediente('persona-1')).rejects.toThrow('no pudo crear');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(['<html>Login</html>', '{}', '{"path":"/otra-carpeta"}'])('no confunde una respuesta HTTP 200 inválida con una carpeta creada: %s', async body => {
    fetchMock.mockResolvedValue(new Response(body));
    await expect(new RundDocumentStorageService().ensureExpediente('persona')).rejects.toThrow('no confirmó');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('no confirma una carga si OpenKM devuelve una ubicación distinta a la solicitada', async () => {
    const previous = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (url, options) => String(url).endsWith('/document/createSimple')
      ? new Response('{"path":"/otro-documento"}') : previous(url, options));
    await expect(new RundDocumentStorageService().store({ content: Buffer.from('%PDF-1.7'), expedienteId: 'persona',
      logicalId: 'documento', category: 'TITULOS', version: 1 })).rejects.toThrow('no confirmó');
  });

  it('verifica también ItemExistsException y propaga la denegación de acceso sin detalles internos', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ItemExistsException', { status: 500 }))
      .mockResolvedValueOnce(new Response('password=secret /private/path', { status: 403 }));
    await expect(new RundDocumentStorageService().ensureExpediente('persona-1'))
      .rejects.toThrow('No fue posible completar la operación en OpenKM.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reanuda un expediente parcial sin crear archivos ni retroceder al proveedor local', async () => {
    const mkdir = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    fetchMock.mockResolvedValueOnce(new Response('{"path":"/okm:root/RUND"}'))
      .mockRejectedValueOnce(new Error('timeout'));
    const storage = new RundDocumentStorageService();
    await expect(storage.ensureExpediente('persona-1')).rejects.toThrow();
    await expect(storage.ensureExpediente('persona-1')).resolves.toBeUndefined();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it.each(['../otro', 'a/b', 'a\\b', '', 'a%2Fb'])('rechaza el identificador inseguro %s antes de llamar a OpenKM', async id => {
    await expect(new RundDocumentStorageService().ensureExpediente(id)).rejects.toThrow('Identificador');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mantiene el mismo esquema en desarrollo local y no sobrescribe archivos', async () => {
    delete process.env.OPENKM_BASE_URL;
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'true';
    const mkdir = jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    const write = jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    const storage = new RundDocumentStorageService();
    const result = await storage.store({ expedienteId: 'persona-1', category: 'CERTIFICADOS',
      supportType: 'acta_evaluacion_desempeno', logicalId: 'logical-1', version: 1, content: Buffer.from('%PDF-1.7') });
    expect(mkdir).toHaveBeenCalledTimes(6);
    expect(result.storagePath).toContain('/EVALUACIONES/logical-1/v1.pdf');
    expect(write).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer), { flag: 'wx' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lee el archivo histórico usando exactamente su ruta almacenada', async () => {
    const read = jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('historico'));
    await new RundDocumentStorageService().read('LEGACY_LOCAL', '/pta/api/v1/uploads/carpeta-digital/docente/RUND/antiguo.pdf');
    expect(String(read.mock.calls[0][0]).replace(/\\/g, '/')).toContain('/uploads/carpeta-digital/docente/RUND/antiguo.pdf');
  });

  it('conserva el tipo y extensión del soporte de gestión PNG en OpenKM', async () => {
    const result = await new RundDocumentStorageService().store({ expedienteId: 'persona-1', category: 'OTROS',
      supportType: 'soporte_edicion_perfil', logicalId: 'logical-1', version: 1,
      content: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), mimeType: 'image/png' });
    expect(result.storagePath).toContain('/ACTOS_ADMINISTRATIVOS/logical-1/v1.png');
    const form = fetchMock.mock.calls.at(-1)![1]!.body as FormData;
    expect((form.get('content') as Blob).type).toBe('image/png');
  });

  it('crea carpetas con JSON y el documento con multipart en /okm:root', async () => {
    const storage = new RundDocumentStorageService();
    const result = await storage.store({
      content: Buffer.from('%PDF-1.7'),
      expedienteId: 'persona-1',
      category: 'TITULOS',
      logicalId: 'logical-id',
      version: 1,
    });

    expect(result.provider).toBe('OPENKM');
    expect(result.storagePath).toBe('/okm:root/RUND/expedientes/persona-1/FORMACION/logical-id/v1.pdf');
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
    expect(form.get('docPath')).toBe('/okm:root/RUND/expedientes/persona-1/FORMACION/logical-id/v1.pdf');
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
      expedienteId: 'persona-1',
      category: 'TITULOS',
      logicalId: 'logical-id',
      version: 1,
    })).rejects.toThrow('OpenKM es obligatorio');
  });

  it('OPENKM explícito no usa disco si falta la URL y su estado no expone secretos', async () => {
    delete process.env.OPENKM_BASE_URL;
    process.env.RUND_DOCUMENT_PROVIDER = 'OPENKM';
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'true';
    const mkdir = jest.spyOn(fs, 'mkdir');
    const storage = new RundDocumentStorageService();
    expect(storage.configurationStatus()).toMatchObject({ escrituraConfigurada: false, pendientes: ['OPENKM_BASE_URL'] });
    expect(JSON.stringify(storage.configurationStatus())).not.toContain('secret');
    await expect(storage.ensureExpediente('persona')).rejects.toThrow('no está configurado');
    expect(mkdir).not.toHaveBeenCalled();
  });

  it.each(['ftp://example.test', 'http://user:password@example.test', 'http://example.test?key=secret'])('rechaza URL insegura %s antes de enviar credenciales', async url => {
    process.env.OPENKM_BASE_URL = url;
    await expect(new RundDocumentStorageService().ensureExpediente('persona')).rejects.toThrow('inválidos');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
