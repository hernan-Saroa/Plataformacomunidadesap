/* AppModule real del gateway compilado, con upstream/auditoría ficticios en loopback.
 * No importa main (dotenv), lee .env, consulta bases ni permite destinos de servicios reales.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const gatewayRoot = path.join(root, 'backend/api-gateway');
const dependency = name => require(path.join(gatewayRoot, 'node_modules', name));
const audits = [], forwarded = [], diagnostics = [], checks = [];
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = server => new Promise((resolve, reject) => server.listening ? server.close(err => err ? reject(err) : resolve()) : resolve());
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'private, no-store' }); res.end(JSON.stringify(body)); };
const privateData = { documento: 'CEDULA_PRIVADA', nested: { token: 'TOKEN_PRIVADO' } };
const ownerResponse = { success: true, data: { nombre: 'ARCHIVO_PRIVADO.pdf', estado: 'pendiente', version: 4 } };
const upstream = http.createServer(async (req, res) => {
  try {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    forwarded.push({ url: req.url, method: req.method, headers: req.headers, bytes: Buffer.concat(chunks) });
    if (req.url.includes('/forzar-error')) { req.socket.destroy(); return; }
    if (req.url.includes('/contenido')) {
      res.writeHead(200, { 'content-type': 'application/pdf', 'cache-control': 'private, no-store', 'content-disposition': 'attachment; filename=ARCHIVO_PRIVADO.pdf' });
      res.end('%PDF-1.4 ARCHIVO FICTICIO'); return;
    }
    json(res, req.url.includes('/conflicto') ? 409 : 200, ownerResponse);
  } catch { json(res, 500, { message: 'Fallo del fixture' }); }
});
const sink = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  audits.push(JSON.parse(Buffer.concat(chunks).toString('utf8'))); json(res, 201, { ok: true });
});
const originalLog = console.log, originalError = console.error;
let app;
async function check(name, run) { await run(); checks.push(name); originalLog('PASS ' + name); }
async function waitForAudit(before) {
  const deadline = Date.now() + 3000;
  while (audits.length <= before && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(audits.length, before + 1, 'Debe registrarse exactamente una operación.');
  return audits[before];
}
function protectedLog(log) {
  assert.equal(log.requestBody, null); assert.equal(log.responseBody ?? null, null);
  assert.deepEqual(log.queryParams, {}); assert.equal(log.referer, undefined);
  assert(!/PRIVAD[OA]/.test(JSON.stringify(log)), 'La auditoría contiene datos ficticios que debían redactarse.');
}

(async () => {
  try {
    const upstreamUrl = await listen(upstream), auditUrl = await listen(sink);
    process.env.NODE_ENV = 'test'; process.env.JWT_SECRET = randomBytes(32).toString('hex');
    process.env.JWT_PUBLIC_PATHS = ''; process.env.AUDIT_SERVICE_URL = auditUrl;
    process.env.NO_PROXY = '127.0.0.1,localhost'; process.env.no_proxy = process.env.NO_PROXY;
    // Sustituir todos los destinos en el módulo cargado antes de instanciar AppModule.
    const { serviceMap } = require(path.join(gatewayRoot, 'dist/gateway/proxy.config'));
    for (const key of Object.keys(serviceMap)) serviceMap[key] = upstreamUrl;
    assert(Object.values(serviceMap).every(url => url === upstreamUrl));
    const { NestFactory } = dependency('@nestjs/core');
    const { JwtService } = dependency('@nestjs/jwt');
    const { AppModule } = require(path.join(gatewayRoot, 'dist/app.module'));
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    const token = jwt.sign({ sub: '42', username: 'operador-ficticio', roles: ['GESTION_PROFESORAL'] });
    console.log = (...args) => diagnostics.push(args);
    console.error = (...args) => diagnostics.push(args);
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1'); const base = await app.getUrl();
    const send = (route, options = {}) => fetch(base + route, { method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', referer: 'http://fixture.example.test/?token=REFERER_PRIVADO' },
      body: JSON.stringify(privateData), signal: AbortSignal.timeout(5000), ...options });

    await check('JSON RUND y alias v2 conservan petición/respuesta y omiten sus datos en auditoría', async () => {
      for (const route of ['/rund/api/v1/docentes/PERFIL_PRIVADO?token=TOKEN_PRIVADO', '/rund-service/api/v2/soportes/SOPORTE_PRIVADO/validar']) {
        const before = audits.length, res = await send(route);
        assert.equal(res.status, 200); assert.deepEqual(await res.json(), ownerResponse);
        assert.equal(res.headers.get('cache-control'), 'private, no-store');
        assert.deepEqual(JSON.parse(forwarded.at(-1).bytes), privateData);
        assert.equal(forwarded.at(-1).headers.authorization, `Bearer ${token}`);
        if (route.includes('/v2/')) assert(forwarded.at(-1).url.startsWith('/v2/'));
        const log = await waitForAudit(before); protectedLog(log); assert.equal(log.statusCode, 200);
      }
    });
    await check('Carpeta Auth y portal conservan cookie y revisión documental sin duplicarlas en logs', async () => {
      for (const route of ['/auth/api/v1/carpeta-digital/documentos/ARCHIVO_PRIVADO/reclassify', '/auth/api/v1/portal/carpeta-digital/documentos/ARCHIVO_PRIVADO/validate']) {
        const before = audits.length;
        const body = { ...privateData, revision_documento: 'a'.repeat(64) };
        const res = await send(route, { headers: { cookie: `esap_access_token=${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
        assert.equal(res.status, 200); assert.deepEqual(await res.json(), ownerResponse);
        assert.equal(forwarded.at(-1).headers.cookie, `esap_access_token=${token}`);
        assert.equal(JSON.parse(forwarded.at(-1).bytes).revision_documento, body.revision_documento);
        protectedLog(await waitForAudit(before));
      }
    });
    await check('Un 409 conserva estado/respuesta del propietario sin copiar su cuerpo a auditoría', async () => {
      const before = audits.length, res = await send('/rund/api/v1/docentes/PERFIL_PRIVADO/conflicto');
      assert.equal(res.status, 409); assert.deepEqual(await res.json(), ownerResponse);
      const log = await waitForAudit(before); protectedLog(log); assert.equal(log.errorMessage, 'Error HTTP 409');
    });
    await check('Una caída del upstream conserva el error HTTP sin registrar su URL privada', async () => {
      const before = audits.length, res = await send('/rund/api/v1/docentes/PERFIL_PRIVADO/forzar-error?token=TOKEN_PRIVADO');
      assert.equal(res.status, 500); await res.arrayBuffer();
      const log = await waitForAudit(before); protectedLog(log); assert.equal(log.errorMessage, 'Error HTTP 500');
    });
    await check('El archivo PDF conserva bytes y cabeceras; GET mantiene la política previa sin auditoría de escritura', async () => {
      const before = audits.length;
      const res = await send('/rund/api/v1/pta/banco-docentes/PERFIL_PRIVADO/documentos/FILE/contenido', {
        method: 'GET', body: undefined, headers: { authorization: `Bearer ${token}`, accept: 'application/pdf' },
      });
      assert.equal(res.status, 200); assert.equal(await res.text(), '%PDF-1.4 ARCHIVO FICTICIO');
      assert.equal(res.headers.get('content-disposition'), 'attachment; filename=ARCHIVO_PRIVADO.pdf');
      assert.equal(audits.length, before);
    });
    await check('Multipart conserva archivo y boundary; el cuerpo no pasa a auditoría', async () => {
      const before = audits.length, form = new FormData();
      form.append('file', new Blob(['PDF FICTICIO PRIVADO'], { type: 'application/pdf' }), 'ARCHIVO_PRIVADO.pdf');
      form.append('tipoSoporte', 'documento_identidad');
      const res = await send('/rund/api/v1/pta/banco-docentes/PERFIL_PRIVADO/documentos', {
        method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form,
      });
      assert.equal(res.status, 200); await res.arrayBuffer();
      assert(forwarded.at(-1).headers['content-type'].includes('boundary='));
      assert(forwarded.at(-1).bytes.includes(Buffer.from('PDF FICTICIO PRIVADO')));
      protectedLog(await waitForAudit(before));
    });
    await check('Sin sesión el guard impide CRUD RUND antes de llegar al propietario', async () => {
      const before = forwarded.length;
      const res = await send('/rund/api/v1/docentes', { method: 'POST', headers: { 'content-type': 'application/json' } });
      assert.equal(res.status, 401); await res.arrayBuffer(); assert.equal(forwarded.length, before);
    });
    await check('La ruta pública OTP sigue llegando a RUND sin JWT y no registra su cuerpo', async () => {
      const before = audits.length;
      const res = await send('/rund/api/v1/pta/banco-docentes/otp/request', { method: 'POST', headers: { 'content-type': 'application/json' } });
      assert.equal(res.status, 200); await res.arrayBuffer(); protectedLog(await waitForAudit(before));
    });
    await check('Un módulo ajeno conserva transporte, consultas y cuerpos de auditoría', async () => {
      const before = audits.length, body = { titulo: 'Expediente ficticio' };
      const res = await send('/legal/api/v1/expedientes/123?estado=abierto', { body: JSON.stringify(body) });
      assert.equal(res.status, 200); assert.deepEqual(await res.json(), ownerResponse);
      const log = await waitForAudit(before); assert.deepEqual(log.requestBody, body);
      assert.deepEqual(log.responseBody, ownerResponse); assert.deepEqual(log.queryParams, { estado: 'abierto' });
      assert.equal(log.url, '/legal/api/v1/expedientes/123?estado=abierto');
    });
    assert(!/PRIVAD[OA]/.test(JSON.stringify(diagnostics)), 'Los diagnósticos contienen datos ficticios privados.');
    assert(!JSON.stringify(diagnostics).includes(token));
    fs.writeFileSync(path.join(root, 'docs/rund/validacion-auditoria-gateway-http-local.json'), JSON.stringify({
      verifiedAt: new Date().toISOString(), step: '12.5b', passed: true, checks,
      gatewayAppModuleReal: true, mainImported: false, fictitiousUpstreamOnly: true,
      realEnvironmentFilesRead: false, existingDatabaseUsed: false, runtimeEnvironmentCertified: false,
    }, null, 2) + '\n');
    originalLog(`OK: ${checks.length} comprobaciones HTTP del gateway con servicios ficticios.`);
  } finally {
    try { if (app) await app.close(); } finally {
      await Promise.all([close(upstream), close(sink)]);
      console.log = originalLog; console.error = originalError;
    }
  }
})().catch(error => { originalError(error.stack || error.message); process.exitCode = 1; });
