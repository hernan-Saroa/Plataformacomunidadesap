import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { RundDocumentStorageService } from './rund-document-storage.service';

const originalDocumentalEnabled = process.env.RUND_DOCUMENTAL_ENABLED;
beforeEach(() => { process.env.RUND_DOCUMENTAL_ENABLED = 'true'; });
afterEach(() => {
  if (originalDocumentalEnabled === undefined) delete process.env.RUND_DOCUMENTAL_ENABLED;
  else process.env.RUND_DOCUMENTAL_ENABLED = originalDocumentalEnabled;
});
import { RUND_STANDARD_FOLDERS } from './rund-expediente';

/** Transporte HTTP real contra un simulador local; no certifica una instalación OpenKM. */
describe('Almacenamiento documental a través de HTTP y multipart reales', () => {
  let server: Server;
  let baseUrl: string;
  let mode: 'normal' | 'unavailable' | 'redirect' | 'lost-create-response' = 'normal';
  const folders = new Set<string>();
  const documents = new Map<string, { content: Buffer; mime: string; fileName: string }>();
  const requests: Array<{ method: string; path: string }> = [];
  const errors: Error[] = [];
  let missingStatus = 500;
  const keys = ['OPENKM_BASE_URL', 'OPENKM_USERNAME', 'OPENKM_PASSWORD', 'OPENKM_TIMEOUT_MS', 'RUND_DOCUMENT_ALLOW_LOCAL'];
  let saved: Record<string, string | undefined>;

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, 'http://127.0.0.1');
        requests.push({ method: req.method!, path: url.pathname });
        if (mode === 'unavailable') { res.writeHead(503); res.end('private-internal-detail'); return; }
        if (mode === 'redirect') { res.writeHead(302, { Location: '/login' }); res.end(); return; }
        if (req.headers.authorization !== `Basic ${Buffer.from('test-user:test-password').toString('base64')}`) {
          res.writeHead(401); res.end(); return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const body = Buffer.concat(chunks);
        if (url.pathname.endsWith('/folder/createSimple')) {
          expect(req.method).toBe('POST');
          expect(req.headers['content-type']).toBe('application/json');
          const folder = body.toString('utf8');
          if (folders.has(folder)) { res.writeHead(409); res.end('ItemExistsException'); return; }
          const parent = folder.slice(0, folder.lastIndexOf('/'));
          if (!folders.has(parent)) { res.writeHead(500); res.end('PathNotFoundException: does not exist'); return; }
          folders.add(folder);
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ path: folder })); return;
        }
        if (url.pathname.endsWith('/folder/getProperties')) {
          const folder = url.searchParams.get('fldId')!;
          res.writeHead(folders.has(folder) ? 200 : 404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ path: folder })); return;
        }
        if (url.pathname.endsWith('/document/createSimple')) {
          expect(req.method).toBe('POST');
          const multipart = new Request('http://127.0.0.1/upload', { method: 'POST',
            headers: { 'Content-Type': req.headers['content-type']! }, body: new Uint8Array(body) });
          const form = await multipart.formData();
          const docPath = String(form.get('docPath'));
          const content = form.get('content') as File;
          if (documents.has(docPath)) { res.writeHead(409); res.end('ItemExistsException'); return; }
          expect(folders.has(docPath.slice(0, docPath.lastIndexOf('/')))).toBe(true);
          documents.set(docPath, { content: Buffer.from(await content.arrayBuffer()), mime: content.type, fileName: content.name });
          if (mode === 'lost-create-response') { mode = 'normal'; req.socket.destroy(); return; }
          res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ path: docPath, uuid: 'test-document' })); return;
        }
        if (url.pathname.endsWith('/document/getContent')) {
          const doc = documents.get(url.searchParams.get('docId')!);
          if (!doc) { res.writeHead(missingStatus); res.end(missingStatus === 500 ? 'PathNotFoundException: fixture' : ''); return; }
          res.writeHead(200, { 'Content-Type': doc.mime }); res.end(doc.content); return;
        }
        res.writeHead(404); res.end();
      } catch (error) { errors.push(error as Error); res.writeHead(500); res.end(); }
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/OpenKM`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });
  beforeEach(() => {
    saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    process.env.OPENKM_BASE_URL = baseUrl;
    process.env.OPENKM_USERNAME = 'test-user';
    process.env.OPENKM_PASSWORD = 'test-password';
    process.env.OPENKM_TIMEOUT_MS = '2000';
    process.env.RUND_DOCUMENT_ALLOW_LOCAL = 'false';
    folders.clear(); folders.add('/okm:root'); documents.clear(); requests.length = 0; errors.length = 0; mode = 'normal'; missingStatus = 500;
  });
  afterEach(() => {
    for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
    expect(errors).toEqual([]);
  });

  it('crea estructura vacía, repite y carga/lee dos versiones conservando exactamente los bytes', async () => {
    const storage = new RundDocumentStorageService();
    await storage.ensureExpediente('synthetic-person');
    for (const folder of RUND_STANDARD_FOLDERS) expect(folders.has(`/okm:root/RUND/expedientes/synthetic-person/${folder}`)).toBe(true);
    expect(documents.size).toBe(0);
    await storage.ensureExpediente('synthetic-person');
    const first = Buffer.from('%PDF-1.7\nprimera versión\n%%EOF', 'utf8');
    const second = Buffer.from('%PDF-1.7\nsegunda versión\n%%EOF', 'utf8');
    const input = { expedienteId: 'synthetic-person', logicalId: 'synthetic-document', category: 'TITULOS' };
    const v1 = await storage.store({ ...input, content: first, version: 1 });
    const v2 = await storage.store({ ...input, content: second, version: 2 });
    expect(await storage.read(v1.provider, v1.storagePath)).toEqual(first);
    expect(await storage.read(v2.provider, v2.storagePath)).toEqual(second);
    await expect(storage.store({ ...input, content: second, version: 1 })).rejects.toThrow();
    expect(await storage.read(v1.provider, v1.storagePath)).toEqual(first);
    expect(documents.size).toBe(2);
    expect(requests.some(request => request.method === 'DELETE')).toBe(false);
  });

  it('preserva los bytes, MIME y nombre de la imagen administrativa', async () => {
    const storage = new RundDocumentStorageService();
    const content = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 23]);
    const file = await storage.store({ expedienteId: 'synthetic-person', logicalId: 'image-document', category: 'OTROS',
      supportType: 'soporte_edicion_perfil', version: 1, mimeType: 'image/png', content });
    expect(documents.get(file.storagePath)).toEqual({ content, mime: 'image/png', fileName: 'v1.png' });
    expect(await storage.read(file.provider, file.storagePath)).toEqual(content);
  });

  it.each([404, 500])('migra y reanuda un destino idéntico sin volver a escribirlo (ausencia HTTP %s)', async status => {
    missingStatus = status;
    const storage = new RundDocumentStorageService();
    const input = { expedienteId: 'persona', logicalId: 'historico', category: 'TITULOS', version: 1, content: Buffer.from('%PDF-historico') };
    const first = await storage.copyVerifiedToOpenKm(input);
    const writes = requests.filter(r => r.path.endsWith('/document/createSimple')).length;
    expect(await storage.copyVerifiedToOpenKm(input)).toEqual(first);
    expect(requests.filter(r => r.path.endsWith('/document/createSimple'))).toHaveLength(writes);
    await expect(storage.copyVerifiedToOpenKm({ ...input, content: Buffer.from('%PDF-distinto') })).rejects.toThrow('contenido diferente');
    expect(await storage.read('OPENKM', first.storagePath)).toEqual(input.content);
    expect(requests.some(r => r.method === 'DELETE')).toBe(false);
  });

  it('recupera una respuesta perdida tras persistir el archivo comprobando sus bytes', async () => {
    mode = 'lost-create-response';
    const storage = new RundDocumentStorageService();
    const input = { expedienteId: 'persona', logicalId: 'historico', category: 'TITULOS', version: 1, content: Buffer.from('%PDF-historico') };
    const result = await storage.copyVerifiedToOpenKm(input);
    expect(documents.get(result.storagePath)?.content).toEqual(input.content);
    expect(requests.filter(r => r.path.endsWith('/document/createSimple'))).toHaveLength(1);
    expect(requests.some(r => r.method === 'DELETE')).toBe(false);
  });

  it('rechaza credenciales incorrectas sin crear archivos', async () => {
    process.env.OPENKM_PASSWORD = 'incorrect';
    await expect(new RundDocumentStorageService().ensureExpediente('synthetic-person')).rejects.toThrow();
    expect(documents.size).toBe(0);
    expect(folders.size).toBe(1);
  });

  it('permite reintentar tras indisponibilidad sin exponer el detalle del servidor', async () => {
    mode = 'unavailable';
    const storage = new RundDocumentStorageService();
    await expect(storage.ensureExpediente('synthetic-person')).rejects.toThrow('OpenKM no pudo crear la carpeta documental.');
    mode = 'normal';
    await expect(storage.ensureExpediente('synthetic-person')).resolves.toBeUndefined();
    expect(documents.size).toBe(0);
  });

  it('no sigue redirecciones hacia formularios de login ni envía allí credenciales', async () => {
    mode = 'redirect';
    await expect(new RundDocumentStorageService().ensureExpediente('synthetic-person')).rejects.toThrow();
    expect(requests).toHaveLength(1);
    expect(requests[0].path).not.toBe('/login');
  });
});
