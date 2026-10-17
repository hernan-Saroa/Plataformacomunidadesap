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
    await check('Las API internas de servicio no salen por el gateway ni con JWT y token interno', async () => {
      const before = forwarded.length;
      for (const route of ['/rund/api/v1/internal/rund/v1/docentes/sincronizacion',
        '/rund/api/v1/%69nternal/rund/v1/estadisticas/backoffice',
        '/auth/api/v1/internal/carpeta-digital/estadisticas',
        '/auth/api/v1/internal/rund/v1/personas/por-documento/123',
        '/auth/api/v1/%69nternal/rund/v1/personas/resolver/ficticio',
        '/auth/api/v1/internal/rund/v1/personas/perfil-pta/123',
        '/auth/api/v1/internal/rund/v1/personas/coincidencias',
        '/auth/api/v1/%69nternal/rund/v1/personas/coincidencias',
        '/auth/api/v1/internal/rund/v1/personas/ficha/por-persona/11111111-1111-4111-8111-111111111111',
        '/auth/api/v1/%69nternal/rund/v1/personas/ficha/por-persona/11111111-1111-4111-8111-111111111111',
        '/auth/api/v1/internal/rund/v1/personas/ficha/por-documento/123',
        '/auth/api/v1/%69nternal/rund/v1/personas/ficha/por-documento/123',
        '/auth/api/v1/internal/rund/v1/personas/por-alias/123',
        '/auth/api/v1/%69nternal/rund/v1/personas/por-alias/123',
        '/auth/api/v1/internal/rund/v1/banco/proyeccion',
        '/auth/api/v1/%69nternal/rund/v1/banco/proyeccion',
        '/auth/api/v1/%69nternal/rund/v1/personas/perfil-pta/123',
        '/auth/api/v1/internal/rund/v1/catalogos/seccionales',
        '/auth/api/v1/internal/rund/v1/catalogos/territoriales-banco',
        '/pta/api/v1/internal/rund/v1/catalogos/territoriales',
        '/pta/api/v1/internal/rund/v1/catalogos/periodo-activo',
        '/pta/api/v1/internal/rund/v1/personas/11111111-1111-4111-8111-111111111111/nombre-historico',
        '/pta/api/v1/%69nternal/rund/v1/personas/11111111-1111-4111-8111-111111111111/nombre-historico',
        '/pta/api/v1/%69nternal/rund/v1/catalogos/periodo-activo',
        '/pta/api/v1/%69nternal/rund/v1/catalogos/territoriales']) {
        const res = await send(route, { method: 'GET', body: undefined,
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio' } });
        assert.equal(res.status, 404);
        await res.arrayBuffer();
        assert.equal(forwarded.length, before);
      }
    });
    await check('El nuevo destinatario interno tampoco sale por POST normal o codificado', async () => {
      const before = forwarded.length;
      for (const route of ['/auth/api/v1/internal/rund/v1/personas/destinatario-aviso',
        '/auth/api/v1/%69nternal/rund/v1/personas/destinatario-aviso']) {
        const auditBefore = audits.length;
        const res = await send(route, { method: 'POST', body: JSON.stringify({ clave: 'actor-ficticio' }),
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before);
        await waitForAudit(auditBefore);
      }
    });
    await check('La sincronización interna Auth queda bloqueada por GET y POST, incluso codificada y con credenciales', async () => {
      const before = forwarded.length;
      for (const prefix of ['internal', '%69nternal']) for (const [route, method] of [['rol-docente', 'GET'], ['revalidar', 'POST']]) {
        const auditBefore = audits.length;
        const res = await send(`/auth/api/v1/${prefix}/rund/v1/personas/sincronizacion/${route}`, {
          method, body: method === 'POST' ? JSON.stringify({ personaId: 'ficticio' }) : undefined,
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' },
        });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before);
        if (method === 'POST') await waitForAudit(auditBefore);
      }
    });
    await check('Los permisos internos Auth no salen por POST normal o codificado, incluso con JWT y token', async () => {
      const before = forwarded.length;
      for (const prefix of ['internal', '%69nternal']) {
        const auditBefore = audits.length;
        const res = await send(`/auth/api/v1/${prefix}/rund/v1/personas/permisos-roles`, { method: 'POST',
          body: JSON.stringify({ roles: ['FICTICIO'], codigos: ['rund.view'] }),
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before);
        await waitForAudit(auditBefore);
      }
    });
    await check('La identidad histórica de PTA no sale por POST interno normal o codificado, incluso con JWT y token', async () => {
      const before = forwarded.length;
      for (const prefix of ['internal', '%69nternal']) {
        const auditBefore = audits.length;
        const res = await send(`/pta/api/v1/${prefix}/rund/v1/personas/identidades-historicas`, { method: 'POST',
          body: JSON.stringify({ personaIds: [] }),
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before);
        await waitForAudit(auditBefore);
      }
    });
    await check('El catálogo de programas PTA no sale por POST interno normal o codificado con JWT y token', async () => {
      const before = forwarded.length;
      for (const prefix of ['internal', '%69nternal']) {
        const auditBefore = audits.length;
        const res = await send(`/pta/api/v1/${prefix}/rund/v1/catalogos/programas-historicos`, { method: 'POST',
          body: JSON.stringify({ programaIds: ['1'] }),
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before); await waitForAudit(auditBefore);
      }
    });
    await check('Los planes históricos PTA no salen por POST interno normal o codificado con JWT y token', async () => {
      const before = forwarded.length;
      for (const prefix of ['internal', '%69nternal']) {
        const auditBefore = audits.length;
        const res = await send(`/pta/api/v1/${prefix}/rund/v1/planes/historial-firme`, { method: 'POST',
          body: JSON.stringify({ docenteId: 'FICTICIO', periodo: '2099-1' }),
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before); await waitForAudit(auditBefore);
      }
    });
    await check('La prevalidación de escritura Auth no sale por POST interno normal o codificado con JWT y token', async () => {
      const before = forwarded.length;
      for (const prefix of ['internal', '%69nternal']) {
        const auditBefore = audits.length;
        const res = await send(`/auth/api/v1/${prefix}/rund/v1/personas/escritura/validar`, { method: 'POST',
          body: JSON.stringify({ version: 1, operacionId: '11111111-1111-4111-8111-111111111111', documento: 'FICTICIO', correo: 'prueba@example.test', resolverPorCorreo: false }),
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before); await waitForAudit(auditBefore);
      }
    });
    await check('Registro, consulta y cancelación de operaciones Auth no salen por gateway normal o codificado', async () => {
      const before = forwarded.length, id = '11111111-1111-4111-8111-111111111111';
      for (const prefix of ['internal', '%69nternal']) for (const [suffix, method] of [['', 'POST'], ['/' + id, 'GET'], ['/' + id + '/cancelar', 'POST'], ['/' + id + '/aplicar','POST'], ['/' + id + '/compensar','POST'], ['/' + id + '/compensacion','GET'], ['/' + id + '/correo/validar','POST']]) {
        const auditBefore = audits.length;
        const res = await send(`/auth/api/v1/${prefix}/rund/v1/personas/escritura/operaciones${suffix}`, { method,
          body: method === 'POST' ? JSON.stringify({ version: 1, operacionId: id, huellaComando: 'a'.repeat(64) }) : undefined,
          headers: { authorization: `Bearer ${token}`, 'x-internal-service-token': 'ficticio', 'content-type': 'application/json' } });
        assert.equal(res.status, 404); await res.arrayBuffer(); assert.equal(forwarded.length, before);
        if (method === 'POST') await waitForAudit(auditBefore);
      }
    });
    await check('La prueba de aborto RUND no sale por gateway normal o codificado aunque incluya JWT y token', async () => {
      const before=forwarded.length;
      for(const prefix of ['internal','%69nternal']) {
        const res=await send(`/rund/api/v1/${prefix}/rund/v1/identidad/intenciones/11111111-1111-4111-8111-111111111111/aborto`,
          {method:'GET',body:undefined,headers:{authorization:`Bearer ${token}`,'x-internal-service-token':'ficticio'}});
        assert.equal(res.status,404);await res.arrayBuffer();assert.equal(forwarded.length,before);
      }
    });
    await check('La bandeja de revision RUND exige sesion y conserva transporte sin cuerpos en auditoria', async () => {
      const route='/rund/api/v1/banco-docentes/identidad/revisiones/11111111-1111-4111-8111-111111111111/asumir',before=forwarded.length;
      const denied=await send(route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(privateData)});
      assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{body:JSON.stringify(privateData)});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);protectedLog(await waitForAudit(auditBefore));
      assert.deepEqual(JSON.parse(forwarded[forwarded.length-1].bytes.toString()),privateData);
    });
    await check('La preparacion manual RUND exige JWT y oculta formulario y respuesta en auditoria', async () => {
      const route='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/11111111-1111-4111-8111-111111111111/preparar',before=forwarded.length;
      const denied=await send(route,{headers:{'content-type':'application/json'},body:JSON.stringify({formulario:privateData})});
      assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{body:JSON.stringify({formulario:privateData})});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);protectedLog(await waitForAudit(auditBefore));
      assert.deepEqual(JSON.parse(forwarded[forwarded.length-1].bytes.toString()),{formulario:privateData});
    });
    await check('La ejecucion manual RUND exige JWT y conserva recibos sin cuerpos privados en auditoria', async () => {
      const route='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/11111111-1111-4111-8111-111111111111/ejecutar',before=forwarded.length;
      const denied=await send(route,{headers:{'content-type':'application/json'},body:'{}'});
      assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{body:'{}'});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);protectedLog(await waitForAudit(auditBefore));
      assert.deepEqual(JSON.parse(forwarded[forwarded.length-1].bytes.toString()),{});
    });
    await check('La revision de captura RUND exige JWT y conserva no-store sin registrar el cuerpo privado del GET', async () => {
      const route='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/11111111-1111-4111-8111-111111111111/captura',before=forwarded.length;
      const denied=await send(route,{method:'GET',body:undefined,headers:{}});
      assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{method:'GET',body:undefined});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);
      assert.equal(res.headers.get('cache-control'),'private, no-store');assert.equal(audits.length,auditBefore);
    });
    await check('El abandono manual RUND exige JWT y no registra cuerpos privados en auditoria',async()=>{
      const route='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/11111111-1111-4111-8111-111111111111/abandonar',before=forwarded.length;
      const denied=await send(route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
      assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{method:'POST',body:'{}'});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);protectedLog(await waitForAudit(auditBefore));
    });
    await check('El cierre manual RUND exige JWT y mantiene recibos y cuerpos fuera de auditoria',async()=>{
      const route='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/11111111-1111-4111-8111-111111111111/cerrar',before=forwarded.length;
      const denied=await send(route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{method:'POST',body:'{}'});assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);protectedLog(await waitForAudit(auditBefore));
    });
    await check('La consulta de correo manual RUND exige JWT, conserva no-store y no audita cuerpos de GET', async () => {
      const route='/rund/api/v1/banco-docentes/identidad/solicitudes-manuales/11111111-1111-4111-8111-111111111111/correo',before=forwarded.length;
      const denied=await send(route,{method:'GET',body:undefined,headers:{}});assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{method:'GET',body:undefined});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);assert.equal(res.headers.get('cache-control'),'private, no-store');
      assert.equal(audits.length,auditBefore);
    });
    await check('La revision de correo exige JWT y no copia cuerpos privados al auditar registro o asignacion', async () => {
      const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones',id='11111111-1111-4111-8111-111111111111';
      for(const [suffix,method] of [['','GET'],['/'+id,'GET'],['/por-intencion/'+id,'POST'],['/'+id+'/asumir','POST']]) {
        const before=forwarded.length,body=method==='POST'?JSON.stringify(privateData):undefined;
        const denied=await send(base+suffix,{method,body,headers:{'content-type':'application/json'}});
        assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
        const auditBefore=audits.length,res=await send(base+suffix,{method,body});
        assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);
        assert.equal(res.headers.get('cache-control'),'private, no-store');
        if(method==='POST')protectedLog(await waitForAudit(auditBefore));
      }
    });
    await check('El cierre de revision de correo exige JWT, no-store y auditoria sin cuerpos privados',async()=>{
      const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones/11111111-1111-4111-8111-111111111111';
      for(const [suffix,method] of [['/cierre','GET'],['/cerrar','POST']]){
        const before=forwarded.length,body=method==='POST'?JSON.stringify(privateData):undefined;
        const denied=await send(base+suffix,{method,body,headers:{'content-type':'application/json'}});
        assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
        const auditBefore=audits.length,res=await send(base+suffix,{method,body});
        assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);assert.equal(res.headers.get('cache-control'),'private, no-store');
        if(method==='POST')protectedLog(await waitForAudit(auditBefore));else assert.equal(audits.length,auditBefore);
      }
    });
    await check('El diagnostico de correo exige JWT y conserva no-store y cuerpos privados fuera de auditoria',async()=>{
      const route='/rund/api/v1/banco-docentes/identidad/correos/revisiones/por-intencion/11111111-1111-4111-8111-111111111111/diagnosticar',before=forwarded.length;
      const denied=await send(route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
      assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{method:'POST',body:JSON.stringify(privateData)});
      assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);assert.equal(res.headers.get('cache-control'),'private, no-store');
      protectedLog(await waitForAudit(auditBefore));
    });
    await check('La omision por vigencia de correo exige JWT y conserva no-store y auditoria sin cuerpos privados',async()=>{
      const base='/rund/api/v1/banco-docentes/identidad/correos/revisiones/por-intencion/11111111-1111-4111-8111-111111111111';
      for(const [suffix,method] of [['/omision','GET'],['/omitir-por-vigencia','POST']]){
        const before=forwarded.length,body=method==='POST'?JSON.stringify(privateData):undefined;
        const denied=await send(base+suffix,{method,body,headers:{'content-type':'application/json'}});assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
        const auditBefore=audits.length,res=await send(base+suffix,{method,body});assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);
        assert.equal(res.headers.get('cache-control'),'private, no-store');if(method==='POST')protectedLog(await waitForAudit(auditBefore));else assert.equal(audits.length,auditBefore);
      }
    });
    await check('La revision del resultado incierto exige JWT y preserva transporte no-store y auditoria privada',async()=>{
      const route='/rund/api/v1/banco-docentes/identidad/correos/revisiones/por-intencion/11111111-1111-4111-8111-111111111111/revisar-resultado-incierto',before=forwarded.length;
      const denied=await send(route,{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(denied.status,401);await denied.arrayBuffer();assert.equal(forwarded.length,before);
      const auditBefore=audits.length,res=await send(route,{method:'POST',body:JSON.stringify(privateData)});assert.equal(res.status,200);assert.deepEqual(await res.json(),ownerResponse);
      assert.equal(res.headers.get('cache-control'),'private, no-store');protectedLog(await waitForAudit(auditBefore));
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
