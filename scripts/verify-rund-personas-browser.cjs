/* Shell y remote Gestión de Personas compilados. Todas las APIs se interceptan
 * con fixtures; Chrome usa un contexto nuevo y no accede a perfiles existentes.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '..');
const build = path.join(root, 'build');
const executablePath = process.env.RUND_TEST_BROWSER || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(file => fs.existsSync(file));
const checks = [], requests = [], errors = [];
const viewsMode = process.argv.includes('--views');
const inlineMode = process.argv.includes('--inline') || viewsMode;
const countsMode = process.argv.includes('--counts') || inlineMode;
const statesMode = process.argv.includes('--states') || countsMode;
const versionsMode = process.argv.includes('--versions') || statesMode;
const documentsMode = process.argv.includes('--documents') || versionsMode;
const docPersona = '11111111-1111-4111-8111-111111111111';
const persistedDoc = { id: '22222222-2222-4222-8222-222222222222', servicio_propietario: 'auth', persistido: true,
  nombre: 'Archivo servidor.pdf', categoria: 'personal', tipo_archivo: 'pdf', tamano_bytes: 24, estado: 'pendiente',
  fecha_subida: '2026-10-13T12:00:00Z', versionado_disponible: versionsMode,
  ...(statesMode ? { revision_documento: 'a'.repeat(64), requiere_revision_documento: true } : {}),
  url_archivo: `/auth/api/v1/uploads/carpeta-digital/${docPersona}/archivo.pdf` };
const roles = [
  { id: 'rol-admin-ficticio', code: 'ADMIN', name: 'Administrador', type: 'sistema', color: '#003DA5', icon: 'Shield', is_active: true },
  { id: 'rol-docente-ficticio', code: 'DOCENTE', name: 'Docente', type: 'sistema', color: '#003DA5', icon: 'GraduationCap', is_active: true },
];
const operator = {
  id: 'operador-ficticio', fullName: 'OPERADOR FICTICIO', email: 'operador@example.test',
  person: { id: 'persona-operador-ficticia', full_name: 'OPERADOR FICTICIO', email: 'operador@example.test' },
  roles: [{ code: 'SUPER_ADMIN', name: 'SUPER_ADMIN', sistema_destino: 'Backoffice' }],
  modules: ['users-persons'], permissions: ['banco-docentes.rund.manage'],
};
const person = { id: 'persona-ficticia', first_name: 'PERSONA', last_name: 'FICTICIA', email: 'persona@example.test',
  identification_number: '0001', identification_type: 'CC',
  user: { id_user: 'usuario-ficticio', is_active: true, roles: [roles[0]], updated_at: '2026-10-13T12:00:00Z' } };

const server = http.createServer((req, res) => {
  let target;
  try { target = path.resolve(build, '.' + decodeURIComponent(new URL(req.url, 'http://fixture').pathname)); }
  catch { res.writeHead(400); res.end(); return; }
  if (!target.startsWith(build + path.sep) && target !== build) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    if (path.extname(target)) { res.writeHead(404); res.end(); return; }
    target = path.join(build, 'index.html');
  }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
  res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(target).pipe(res);
});
let browser;

async function fixturePage(origin, syncResult, rejectRoles = false, options = {}) {
  const context = await browser.createBrowserContext();
  const tab = await context.newPage();
  await tab.setViewport({ width: 1440, height: 1000 });
  await tab.evaluateOnNewDocument(portal => {
    sessionStorage.setItem('esap-sesion-activa', JSON.stringify({ vista: portal ? 'portal' : 'backoffice', timestamp: Date.now() }));
  }, Boolean(options.portal));
  const records = [];
  let retrySuccessful = false;
  let currentVersion = 2;
  let rejectDecision = false;
  let inlineSaved = Boolean(options.portal);
  let documentUnavailable = Boolean(options.failDocuments);
  tab.on('pageerror', error => errors.push(error.message));
  await tab.setRequestInterception(true);
  tab.on('request', async req => {
    try {
      const url = new URL(req.url());
      const isApi = /\/api\/v\d+\//.test(url.pathname) || ['fetch', 'xhr'].includes(req.resourceType());
      if (!isApi && url.origin === origin) { await req.continue(); return; }
      if (!isApi) { await req.abort(); return; }
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*', 'content-type': 'application/json' };
      if (req.method() === 'OPTIONS') { await req.respond({ status: 204, headers }); return; }
      const record = { path: url.pathname, method: req.method(), body: req.postData() || null };
      records.push(record); requests.push(record);
      let body = { success: true, data: [] }, status = 200;
      if (inlineMode && /\/(rund|pta)\/api\/v1\/pta\/banco-docentes\/INLINE-[A-Z-]+\/documentos$/.test(url.pathname) && req.method()==='POST') {
        const id=url.pathname.split('/').at(-2);
        if(id==='INLINE-RUND-B'){status=503;body={success:false,message:'RUND temporalmente no disponible'};}
        else {inlineSaved=true;body.data={id:'33333333-3333-4333-8333-333333333333',docenteId:id,bloque:'IDENTIDAD',tipoSoporte:'documento_identidad',
          version:1,estado:'ACTIVO',documentoLogicoId:'logical-inline'};}
      } else if (url.pathname.endsWith('/verify')) body.data = options.portal ? { ...operator, id: docPersona,
        person: { ...operator.person, id: docPersona }, roles: [{ code: 'DOCENTE', name: 'DOCENTE', sistema_destino: 'Portal' }],
        modules: ['portal-transaccional'], permissions: ['portal-transaccional.carpeta-digital.view'] } : operator;
      else if (url.pathname.endsWith('/users') && req.method() === 'GET') {
        body.data = { data: [person], meta: { page: 1, limit: 10, totalPages: 1, total: 1, totalActive: 1, totalBlocked: 0 } };
      } else if (url.pathname.endsWith('/roles')) body.data = { roles, total: roles.length };
      else if (url.pathname.endsWith('/users/usuario-ficticio') && req.method() === 'PUT') {
        if (rejectRoles) { status = 403; body = { statusCode: 403, error: 'Forbidden', message: 'Roles rechazados' }; }
        else body.data = person;
      } else if (url.pathname.endsWith('/banco-docentes/sync-from-auth')) {
        assert.equal(req.method(), 'POST');
        assert.equal(url.pathname, '/rund/api/v1/banco-docentes/sync-from-auth');
        assert.deepEqual(JSON.parse(req.postData()), {});
        if (!retrySuccessful && syncResult === 'unavailable') {
          status = 503; body = { statusCode: 503, error: 'Service Unavailable', message: 'Fixture RUND no disponible' };
        } else if (syncResult === 'partial') body.data = { total: 2, created: 1, skipped: 0, failed: 1 };
        else body.data = { total: 2, created: 1, skipped: 1, failed: 0 };
      } else if (viewsMode && /\/portal\/carpeta-digital\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/tipos-documentos')) {
        if (documentUnavailable) { status = 503; body = { success: false, message: 'Propietario temporalmente no disponible' }; }
        else body.data = { persona: { id: docPersona, nombre: 'PERSONA FICTICIA', email: 'persona@example.test' },
          carpeta: { persona_id: docPersona, total_documentos: 2, conteo_completo: true }, documentos: [persistedDoc, {
            id: 'rund-service:documento:33333333-3333-4333-8333-333333333333', nombre: 'Documento del perfil', categoria: 'rund', servicio_propietario: 'rund',
            persistido: true, contenido_restringido: true, url_archivo: null, tipo_archivo: 'pdf', tamano_bytes: 20, estado: 'pendiente',
            rund_perfil_id: 'INLINE-RUND-A', rund_perfil_propietario: 'rund', tipo_soporte_rund: 'documento_identidad', bloque_rund: 'IDENTIDAD',
            tipo_documento_id: 'rund_documento_identidad', version_actual: 4, documento_logico_id: 'logical-inline', fecha_subida: '2026-10-13T12:00:00Z',
          }] };
      } else if (viewsMode && url.pathname.endsWith('/carpeta-digital')) {
        body.data = [{ id: `carpeta:${docPersona}`, persona_id: docPersona, nombre_carpeta: 'CARPETA CONJUNTA FICTICIA',
          email_propietario: 'persona@example.test', total_documentos: 1, documentos_pendientes: 1, conteo_completo: true }];
      } else if (url.pathname.includes('/carpeta-digital/')) {
        if(url.pathname.endsWith('/perfiles-rund')) body.data={persona_id:docPersona,complete:true,propietario_predeterminado:inlineMode?'rund':'pta',
          perfiles:inlineMode?[['INLINE-RUND-A','rund','2026-1'],['INLINE-RUND-B','rund','2026-2'],['INLINE-PTA-A','pta','2024-1']].map(([id,propietario,periodo_carga])=>
            ({id,clave:`${propietario}:${id}`,propietario,periodo_carga,persona_id:docPersona,estado:'ACTIVO'})):[]};
        else if (statesMode && url.pathname.endsWith('/validate')) {
          assert.equal(req.method(), 'PUT'); const decision = JSON.parse(req.postData());
          assert.equal(decision.revision_documento, persistedDoc.revision_documento);
          assert.equal(decision.estado, 'validado'); assert.equal(decision.validadoPor, undefined);
          assert(rejectDecision, 'Una decisión no configurada contactó el fixture');
          status = 409; body = { statusCode: 409, message: 'El documento cambió. Actualice la carpeta y revise el original vigente.', error: 'Conflict' };
        }
        else if (versionsMode && url.pathname.endsWith('/versiones')) body.data = {
          documento_id: persistedDoc.id, version_actual: currentVersion, permite_restaurar: true,
          versiones: Array.from({ length: currentVersion }, (_, index) => ({ id: `auth-version-${index + 1}`,
            documento_id: persistedDoc.id, numero_version: index + 1, nombre_archivo: `Original ${index + 1}.pdf`,
            fecha_creacion: '2026-10-13T12:00:00Z', es_version_actual: index + 1 === currentVersion })),
        };
        else if (versionsMode && url.pathname.endsWith('/auth-version-1/restaurar')) {
          assert.equal(req.method(), 'POST'); assert.equal(JSON.parse(req.postData()).version_actual, currentVersion);
          currentVersion++;
          body.data = { documento_id: persistedDoc.id, persistido: true, estado: 'pendiente', version_actual: currentVersion,
            version: { id: `auth-version-${currentVersion}`, documento_id: persistedDoc.id, numero_version: currentVersion, restaurada_desde_version: 1 } };
        }
        else if (url.pathname.endsWith('/documentos') || url.pathname.endsWith('/upload')) body.data = url.pathname.endsWith('/upload') ? persistedDoc : [persistedDoc,...(inlineSaved?[{
          id:'rund-service:documento:33333333-3333-4333-8333-333333333333',servicio_propietario:'rund',persistido:true,nombre:'Inline nativo.pdf',categoria:'rund',estado:'pendiente',
          tipo_documento_id:'rund_documento_identidad',tipo_soporte_rund:'documento_identidad',bloque_rund:'IDENTIDAD',rund_perfil_id:'INLINE-RUND-A',rund_perfil_propietario:'rund',
          rund_documento_id:'33333333-3333-4333-8333-333333333333',rund_docente_id:'INLINE-RUND-A',documento_logico_id:'logical-inline',version_actual:1,
          fecha_subida:'2026-10-13T12:00:00Z',tipo_archivo:'pdf',tamano_bytes:20}]:[])];
        else if (url.pathname.endsWith('/checklist')) body.data = { tiposDocumentos: [], carpeta: { persona_id: docPersona, carpeta_digital_id: 'carpeta-ficticia' } };
        else if (url.pathname.includes('/documentos/')) body.data = persistedDoc;
        else body.data = { persona_id: docPersona, id: `carpeta:${docPersona}`, carpeta_digital_id: 'carpeta-ficticia', permite_originales_rund: true, total_documentos: 1 };
      }
      await req.respond({ status, headers, body: JSON.stringify(body) });
    } catch (error) { errors.push(error.message); if (!req.isInterceptResolutionHandled()) await req.abort(); }
  });
  return { context, tab, records, allowRetry: () => { retrySuccessful = true; }, rejectDocumentDecision: () => { rejectDecision = true; },
    allowDocumentRetry: () => { documentUnavailable = false; } };
}

async function assignRoles(tab, origin, docente = true) {
  await tab.goto(origin + '/?module=users-persons', { waitUntil: 'domcontentloaded' });
  await tab.waitForFunction(() => document.querySelector('tbody')?.innerText.includes('PERSONA FICTICIA'), { timeout: 30000 });
  await tab.click('tbody button[aria-haspopup="menu"]');
  await tab.waitForFunction(() => [...document.querySelectorAll('[role="menuitem"]')].some(el => el.textContent.includes('Asignar Roles')));
  await tab.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find(el => el.textContent.includes('Asignar Roles')).click());
  await tab.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === 'Guardar Roles' && !el.disabled));
  if (docente) await tab.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(el => el.querySelector('span.font-semibold')?.textContent === 'Docente');
    if (!button) throw new Error('Rol DOCENTE no encontrado'); button.click();
  });
  await tab.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === 'Guardar Roles').click());
}
async function toastText(tab, text) {
  await tab.waitForFunction(value => [...document.querySelectorAll('[data-sonner-toast]')].some(el => el.innerText.includes(value)), { timeout: 15000 }, text);
}
async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name); }

(async () => {
  try {
    assert(executablePath, 'Configurar RUND_TEST_BROWSER o instalar Chrome/Edge.');
    assert(fs.existsSync(path.join(build, 'remotes/mfe-gestion-personas/assets/remoteEntry.js')), 'Compilar Gestión de Personas primero.');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await puppeteer.launch({ executablePath, headless: true,
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    await check('El remote real guarda roles en auth y sincroniza con RUND después', async () => {
      const { context, tab, records } = await fixturePage(origin, 'success');
      await assignRoles(tab, origin);
      await toastText(tab, 'Sincronización con RUND completada');
      const save = records.findIndex(item => item.method === 'PUT' && item.path.endsWith('/users/usuario-ficticio'));
      const sync = records.findIndex(item => item.path.endsWith('/sync-from-auth'));
      assert(save >= 0 && sync > save);
      assert.deepEqual(JSON.parse(records[save].body), { roleIds: ['rol-admin-ficticio', 'rol-docente-ficticio'] });
      assert.equal(records.filter(item => item.path.endsWith('/sync-from-auth')).length, 1);
      await context.close();
    });
    await check('Fallo 503 muestra aviso y reintento sin reasignar roles', async () => {
      const { context, tab, records, allowRetry } = await fixturePage(origin, 'unavailable');
      await assignRoles(tab, origin);
      await toastText(tab, 'Roles guardados; sincronización con RUND pendiente');
      assert.equal(records.filter(item => item.path.endsWith('/sync-from-auth')).length, 1);
      allowRetry();
      await tab.evaluate(() => [...document.querySelectorAll('[data-sonner-toast] button')].find(el => el.textContent.trim() === 'Reintentar').click());
      await toastText(tab, 'Sincronización con RUND completada');
      assert.equal(records.filter(item => item.method === 'PUT').length, 1);
      assert.equal(records.filter(item => item.path.endsWith('/sync-from-auth')).length, 2);
      await context.close();
    });
    await check('Los resultados parciales se muestran como sincronización incompleta', async () => {
      const { context, tab } = await fixturePage(origin, 'partial');
      await assignRoles(tab, origin);
      await toastText(tab, 'Sincronización con RUND incompleta');
      assert(!(await tab.evaluate(() => document.body.innerText)).includes('Sincronización con RUND completada'));
      await context.close();
    });
    await check('Asignar otros roles conserva auth sin llamar a RUND', async () => {
      const { context, tab, records } = await fixturePage(origin, 'success');
      await assignRoles(tab, origin, false);
      await toastText(tab, 'Roles asignados');
      assert.equal(records.filter(item => item.method === 'PUT').length, 1);
      assert.equal(records.filter(item => item.path.endsWith('/sync-from-auth')).length, 0);
      await context.close();
    });
    await check('Rechazo de auth mantiene el modal y no inicia sincronización', async () => {
      const { context, tab, records } = await fixturePage(origin, 'success', true);
      await assignRoles(tab, origin);
      await toastText(tab, 'Error al asignar roles');
      assert(await tab.evaluate(() => [...document.querySelectorAll('button')].some(el => el.textContent.trim() === 'Guardar Roles')));
      assert.equal(records.filter(item => item.path.endsWith('/sync-from-auth')).length, 0);
      await context.close();
    });
    if (documentsMode) await check('Carpeta de Personas usa documentos del servidor y conserva locales pendientes', async () => {
      const { context, tab, records, rejectDocumentDecision } = await fixturePage(origin, 'success');
      await tab.evaluateOnNewDocument(persona => {
        localStorage.setItem('esap-carpeta-digital-docs', JSON.stringify({ [persona]: [{ id: 'local-ficticio', nombre: 'Archivo local.pdf', categoria: 'personal', estado: 'validado', version_actual: 8 }] }));
      }, docPersona);
      await tab.goto(origin + '/?module=users-persons', { waitUntil: 'domcontentloaded' });
      await tab.waitForSelector('tbody button[aria-haspopup="menu"]', { timeout: 30000 });
      await tab.click('tbody button[aria-haspopup="menu"]');
      await tab.waitForFunction(() => [...document.querySelectorAll('[role="menuitem"]')].some(el => el.textContent.includes('Ver Carpeta Digital')));
      await tab.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find(el => el.textContent.includes('Ver Carpeta Digital')).click());
      await tab.waitForFunction(() => document.body.innerText.includes('personales') || document.body.innerText.includes('Personal') || document.body.innerText.includes('Archivo servidor.pdf'), { timeout: 15000 });
      await tab.evaluate(() => {
        const row = [...document.querySelectorAll('tr')].find(el => /\bpersonal\b/i.test(el.innerText));
        if (row) { row.click(); return; }
        const button = [...document.querySelectorAll('button')].find(el => /personal/i.test(el.innerText));
        if (!button) throw new Error('Carpeta Personal no encontrada'); button.click();
      });
      await tab.waitForFunction(() => document.body.innerText.includes('Archivo servidor.pdf') && document.body.innerText.includes('pendiente de guardar'), { timeout: 15000 });
      if (countsMode) await check('Los contadores muestran el archivo guardado y excluyen el borrador local validado', async () => {
        const values = await tab.evaluate(() => Object.fromEntries(['GUARDADOS','VALIDADOS','PENDIENTES','RECHAZADOS','VENCIDOS'].map(label => {
          const button = [...document.querySelectorAll('button')].find(el => el.querySelector('p')?.textContent === label);
          return [label,button?.querySelectorAll('p')[1]?.textContent];
        })));
        assert.deepEqual(values,{GUARDADOS:'1',VALIDADOS:'0',PENDIENTES:'1',RECHAZADOS:'0',VENCIDOS:'0'});
      });
      assert(records.some(item => item.path === `/auth/api/v1/carpeta-digital/persona/${docPersona}/documentos`));
      assert.equal(await tab.evaluate(persona => JSON.parse(localStorage.getItem('esap-carpeta-digital-docs'))[persona][0].version_actual, docPersona), 8);
      assert(!records.some(item => item.path.endsWith('/sync-documents')));
      if (versionsMode) await check('Historial Auth en remote real restaura una versión elegida y recarga el estado confirmado', async () => {
        await tab.evaluate(() => [...document.querySelectorAll('tr')].find(el => el.innerText.includes('Archivo servidor.pdf')).click());
        await tab.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.includes('Historial de versiones')));
        assert.equal(await tab.evaluate(() => document.body.innerText.includes('· v1')), false, 'El detalle no debe inventar v1 sin metadatos del servidor');
        await tab.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.includes('Historial de versiones')).click());
        await tab.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent === 'Restaurar versión 1'));
        await tab.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Restaurar versión 1').click());
        assert.equal(records.filter(item => item.path.endsWith('/restaurar')).length, 0);
        await tab.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Confirmar restauración').click());
        await tab.waitForFunction(() => document.querySelector('[role="dialog"][aria-label="Historial de versiones"]')?.innerText.includes('Versión 3 · vigente'));
        assert.equal(records.filter(item => item.path.endsWith('/auth-version-1/restaurar')).length, 1);
        assert(records.filter(item => item.path.endsWith('/versiones')).length >= 3);
        assert.equal(await tab.evaluate(persona => JSON.parse(localStorage.getItem('esap-carpeta-digital-docs'))[persona][0].version_actual, docPersona), 8);
      });
      if (statesMode) await check('La decisión en Personas conserva la revisión vista; 409 no se repite ni se anuncia como aprobación', async () => {
        await tab.evaluate(() => [...document.querySelectorAll('[role="dialog"][aria-label="Historial de versiones"] button')].find(el => el.textContent === 'Cerrar').click());
        rejectDocumentDecision();
        await tab.waitForFunction(() => [...document.querySelectorAll('tr')].some(el => el.innerText.includes('Archivo servidor.pdf')));
        await tab.evaluate(() => [...document.querySelectorAll('tr')].find(el => el.innerText.includes('Archivo servidor.pdf')).click());
        try {
          await tab.waitForFunction(() => [...document.querySelectorAll('button')].some(el => el.textContent.includes('Aprobar documento')), { timeout: 10000 });
        } catch (error) {
          fs.writeFileSync(path.join(root, 'tmp/rund-state-browser-diagnostic.json'), JSON.stringify(await tab.evaluate(() => ({
            buttons: [...document.querySelectorAll('button')].map(el => el.textContent), text: document.body.innerText,
          })), null, 2));
          throw error;
        }
        await tab.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent.includes('Aprobar documento')).click());
        try {
          await tab.waitForFunction(() => document.body.innerText.includes('El documento cambió'), { timeout: 10000 });
        } catch (error) {
          fs.writeFileSync(path.join(root, 'tmp/rund-state-browser-diagnostic.json'), JSON.stringify({
            requests: records, errors, page: await tab.evaluate(() => ({ buttons: [...document.querySelectorAll('button')].map(el => el.textContent), text: document.body.innerText })),
          }, null, 2));
          throw error;
        }
        const requests = records.filter(item => item.path.endsWith('/validate'));
        assert.equal(requests.length, 1); assert.equal(JSON.parse(requests[0].body).revision_documento, 'a'.repeat(64));
        assert.equal(await tab.evaluate(() => document.body.innerText.includes('Documento validado')), false);
        assert.equal(await tab.evaluate(persona => JSON.parse(localStorage.getItem('esap-carpeta-digital-docs'))[persona][0].version_actual, docPersona), 8);
      });
      await context.close();
    });
    if(inlineMode) await check('Panel real selecciona periodo, carga en RUND y no reenvía un fallo al histórico PTA',async()=>{
      const {context,tab,records}=await fixturePage(origin,'success');
      await tab.goto(origin+'/?module=users-persons',{waitUntil:'domcontentloaded'});
      await tab.waitForSelector('tbody button[aria-haspopup="menu"]',{timeout:30000});await tab.click('tbody button[aria-haspopup="menu"]');
      await tab.waitForFunction(()=>[...document.querySelectorAll('[role="menuitem"]')].some(e=>e.textContent.includes('Ver Carpeta Digital')));
      await tab.evaluate(()=>[...document.querySelectorAll('[role="menuitem"]')].find(e=>e.textContent.includes('Ver Carpeta Digital')).click());
      const selector='select[aria-label="Perfil y periodo RUND"]';await tab.waitForSelector(selector);
      await tab.waitForFunction(s=>document.querySelector(s)?.options.length===4,{},selector);
      assert.equal(await tab.$eval(selector,e=>e.value),'');
      assert(!records.some(r=>r.path.includes('/by-persona/')||r.path.endsWith('/tarjeta-rund')));
      await tab.select(selector,'rund:INLINE-RUND-A');
      await tab.waitForFunction(()=>[...document.querySelectorAll('tr,h4')].some(e=>/^RUND\b/.test(e.textContent.trim())));
      await tab.evaluate(()=>[...document.querySelectorAll('tr,h4')].find(e=>/^RUND\b/.test(e.textContent.trim())).click());
      await tab.waitForFunction(()=>[...document.querySelectorAll('tr,h4')].some(e=>e.textContent.trim().startsWith('Identidad')));
      await tab.evaluate(()=>[...document.querySelectorAll('tr,h4')].find(e=>e.textContent.trim().startsWith('Identidad')).click());
      const file=path.join(root,'tmp/rund-inline-browser-fixture.pdf');fs.writeFileSync(file,'%PDF-1.7 ARCHIVO FICTICIO INLINE');
      async function attach(){
        const pending=tab.waitForFileChooser();
        await tab.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Documento de identidad') && e.textContent.includes('Subir')).click());
        await (await pending).accept([file]);
      }
      await attach();await toastText(tab,'El propietario confirmó el archivo guardado');
      assert.equal(records.filter(r=>r.method==='POST' && r.path.endsWith('/INLINE-RUND-A/documentos')).length,1);
      await tab.waitForSelector(selector);await tab.select(selector,'rund:INLINE-RUND-B');await attach();await toastText(tab,'RUND temporalmente no disponible');
      assert.equal(records.filter(r=>r.method==='POST' && r.path.endsWith('/INLINE-RUND-B/documentos')).length,1);
      assert(!records.some(r=>r.method==='POST' && r.path.includes('/pta/api/v1/pta/banco-docentes/INLINE-PTA-A')));
      assert(!records.some(r=>r.method==='POST' && r.path.includes('/carpeta-digital/') && r.path.endsWith('/upload')));
      await tab.select(selector,'pta:INLINE-PTA-A');assert.equal(await tab.$eval(selector,e=>e.value),'pta:INLINE-PTA-A');
      await context.close();
    });
    async function openPortalFolder(tab, origin) {
      await tab.goto(origin + '/', { waitUntil: 'domcontentloaded' });
      await tab.waitForFunction(() => [...document.querySelectorAll('div')].some(e => e.textContent.trim() === 'Carpeta Digital' && /font-black/.test(e.className)));
      await tab.evaluate(() => [...document.querySelectorAll('div')].find(e => e.textContent.trim() === 'Carpeta Digital' && /font-black/.test(e.className)).click());
    }
    if (viewsMode) await check('Portal real conserva documentos RUND y su versión, perfil y restricciones', async () => {
      const { context, tab, records } = await fixturePage(origin, 'success', false, { portal: true });
      await openPortalFolder(tab, origin);
      const selector = 'select[aria-label="Perfil y periodo RUND"]'; await tab.waitForSelector(selector);
      await tab.select(selector, 'rund:INLINE-RUND-A');
      await tab.waitForFunction(() => [...document.querySelectorAll('tr,h4')].some(e => /^RUND\b/.test(e.textContent.trim())));
      await tab.evaluate(() => [...document.querySelectorAll('tr,h4')].find(e => /^RUND\b/.test(e.textContent.trim())).click());
      await tab.waitForFunction(() => [...document.querySelectorAll('tr,h4')].some(e => e.textContent.trim().startsWith('Identidad')));
      await tab.evaluate(() => [...document.querySelectorAll('tr,h4')].find(e => e.textContent.trim().startsWith('Identidad')).click());
      await tab.waitForFunction(() => [...document.querySelectorAll('p')].some(e => e.textContent.startsWith('Documento de identidad')));
      await tab.evaluate(() => [...document.querySelectorAll('p')].find(e => e.textContent.startsWith('Documento de identidad')).parentElement.parentElement.click());
      await tab.waitForFunction(() => document.body.innerText.includes('Documento del perfil'));
      assert(await tab.evaluate(() => document.body.innerText.includes('v4')));
      await tab.evaluate(() => [...document.querySelectorAll('button')].find(e => e.textContent.trim() === 'Vista previa').click());
      await toastText(tab, 'restringido');
      assert(!records.some(r => r.path.endsWith('/contenido')));
      assert(!records.some(r => r.path.includes('/by-persona/') || r.path.endsWith('/tarjeta-rund')));
      await context.close();
    });
    if (viewsMode) await check('Portal real muestra el fallo documental y reintenta sin anunciar una carpeta vacía', async () => {
      const { context, tab, records, allowDocumentRetry } = await fixturePage(origin, 'success', false, { portal: true, failDocuments: true });
      await openPortalFolder(tab, origin);
      await tab.waitForFunction(() => document.querySelector('[role="alert"]')?.innerText.includes('No se pudieron confirmar'));
      assert(!await tab.evaluate(() => document.body.innerText.includes('GUARDADOS')));
      assert(!records.some(r => r.path.includes('/carpeta-digital/') && r.path.endsWith('/documentos')));
      allowDocumentRetry();
      await tab.evaluate(() => [...document.querySelectorAll('button')].find(e => e.textContent === 'Reintentar documentos').click());
      await tab.waitForSelector('select[aria-label="Perfil y periodo RUND"]');
      assert(await tab.evaluate(() => document.body.innerText.includes('GUARDADOS')));
      await context.close();
    });
    if (viewsMode) await check('Carpeta administrativa del shell conserva el selector y el listado confirmado', async () => {
      const { context, tab, records } = await fixturePage(origin, 'success');
      await tab.goto(origin + '/?module=carpeta-digital', { waitUntil: 'domcontentloaded' });
      await tab.waitForFunction(() => [...document.querySelectorAll('h3,td,span')].some(e => e.textContent.trim() === 'CARPETA CONJUNTA FICTICIA'));
      await tab.evaluate(() => [...document.querySelectorAll('h3,td,span')].find(e => e.textContent.trim() === 'CARPETA CONJUNTA FICTICIA').click());
      await tab.waitForSelector('select[aria-label="Perfil y periodo RUND"]');
      assert(records.some(r => r.path.endsWith('/perfiles-rund')));
      assert(records.some(r => r.path.endsWith('/documentos')));
      await context.close();
    });
    assert(!requests.some(item => item.path.startsWith('/pta/') && item.path.endsWith('/sync-from-auth')));
    assert.deepEqual(errors, [], 'Errores JavaScript en navegador: ' + errors.join('; '));
    fs.writeFileSync(path.join(root, `docs/rund/${viewsMode ? 'validacion-vistas-carpeta-navegador-local' : inlineMode ? 'validacion-panel-rund-navegador-local' : countsMode ? 'validacion-contadores-carpeta-navegador-local' : statesMode ? 'validacion-estados-auth-navegador-local' : versionsMode ? 'validacion-historial-auth-navegador-local' : documentsMode ? 'validacion-carpeta-interfaz-navegador-local' : 'validacion-personas-navegador-local'}.json`), JSON.stringify({
      verifiedAt: new Date().toISOString(), step: viewsMode ? '12.4' : inlineMode ? '12.3b.4' : countsMode ? '12.3b.3' : statesMode ? '12.3b.1' : versionsMode ? '12.3a' : documentsMode ? '12.2' : 11, passed: true, browser: await browser.version(),
      compiledShellAndRemote: true, apiResponses: 'fixtures interceptadas; sin tráfico API real',
      realBrowserProfileUsed: false, checks, apiRequestCount: requests.length, javascriptErrors: errors,
    }, null, 2) + '\n');
    console.log('OK: ' + checks.length + ' comprobaciones de Gestión de Personas/RUND en navegador.');
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
