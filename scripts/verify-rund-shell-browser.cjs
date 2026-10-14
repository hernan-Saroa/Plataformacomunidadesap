/* Shell y remotes compilados reales en navegador headless; APIs ficticias interceptadas.
 * Nunca usa un perfil de navegador existente ni permite solicitudes HTTP externas.
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
const checks = [];
const requests = [];
const errors = [];
const permissions = ['banco-docentes.rund.view', 'banco-docentes.rund.manage', 'banco-docentes.rund.documents.manage'];
const operator = { id: 'operador-ficticio', fullName: 'GGP FICTICIO', full_name: 'GGP FICTICIO', email: 'ggp@example.test',
  person: { id: 'persona-ficticia', full_name: 'GGP FICTICIO', email: 'ggp@example.test' },
  roles: [{ code: 'GESTION_PROFESORAL', name: 'GESTION_PROFESORAL', sistema_destino: 'Backoffice' }],
  modules: ['banco-docentes-pta', 'rund', 'pta'], permissions };
const server = http.createServer((req, res) => {
  let target;
  try { target = path.resolve(build, '.' + decodeURIComponent(new URL(req.url, 'http://prueba').pathname)); }
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

async function page(context, origin, authenticated) {
  const tab = await context.newPage();
  await tab.setViewport({ width: 1440, height: 1000 });
  if (authenticated) await tab.evaluateOnNewDocument(() => {
    sessionStorage.setItem('esap-sesion-activa', JSON.stringify({ vista: 'backoffice', timestamp: Date.now() }));
  });
  tab.on('pageerror', error => errors.push(error.message));
  await tab.setRequestInterception(true);
  tab.on('request', async req => {
    try {
      const url = new URL(req.url());
      const pathname = url.pathname;
      const isApi = /\/api\/v\d+\//.test(pathname) || req.resourceType() === 'fetch' || req.resourceType() === 'xhr';
      if (!isApi && url.origin === origin) { await req.continue(); return; }
      if (!isApi) { await req.abort(); return; }
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': req.headers()['access-control-request-headers'] || '*', 'content-type': 'application/json' };
      if (req.method() === 'OPTIONS') { await req.respond({ status: 204, headers }); return; }
      requests.push({ path: pathname, method: req.method(), body: req.postData() || null });
      let data = [];
      let status = 200;
      if (pathname.endsWith('/verify')) {
        if (!authenticated) { await req.respond({ status: 401, headers, body: JSON.stringify({ message: 'Sin sesión ficticia' }) }); return; }
        data = operator;
      } else if (pathname.endsWith('/periodos-academicos')) data = [{ codigo: '2026-2', estado: 'en_curso' }];
      else if (pathname.endsWith('/banco-docentes/stats')) data = { total: 1, activos: 1, inactivos: 0, por_territorial: [], por_dedicacion: [], por_categoria: [] };
      else if (pathname.endsWith('/banco-docentes')) {
        await req.respond({ status: 200, headers, body: JSON.stringify({ success: true,
          items: [{ id: 'docente-ficticio', nombre_completo: 'DOCENTE RUND FICTICIO', documento_identidad: '******0001', estado: 'ACTIVO' }],
          total: 1, page: 1, pages: 1 }) }); return;
      } else if (pathname.endsWith('/otp/request')) {
        await req.respond({ status: 200, headers, body: JSON.stringify({ success: true, message: 'OTP ficticio enviado' }) }); return;
      }
      await req.respond({ status, headers, body: JSON.stringify({ success: true, data }) });
    } catch (error) { errors.push(error.message); if (!req.isInterceptResolutionHandled()) await req.abort(); }
  });
  return tab;
}

async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name); }
async function publicOtp(tab, url, namespace) {
  await tab.goto(url, { waitUntil: 'domcontentloaded' });
  const selector = 'input[placeholder="ejemplo@esap.edu.co"]';
  try { await tab.waitForSelector(selector, { timeout: 30000 }); }
  catch (error) { throw new Error(`Formulario público no cargado: ${url}; errores=${errors.join('; ')}; texto=${(await tab.evaluate(() => document.body.innerText)).slice(0, 400)}`); }
  await tab.type(selector, 'docente-ficticio@esap.edu.co');
  await tab.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(item => /Enviar Código OTP/.test(item.textContent));
    if (!button) throw new Error('Botón OTP no encontrado'); button.click();
  });
  await tab.waitForFunction(() => document.body.innerText.includes('Confirmación de Identidad'), { timeout: 15000 });
  assert(requests.some(item => item.path.startsWith(namespace) && item.path.endsWith('/otp/request')));
}

(async () => {
  try {
    assert(executablePath, 'No se encontró Chrome/Edge; configurar RUND_TEST_BROWSER.');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await puppeteer.launch({ executablePath, headless: true,
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    const privateContext = await browser.createBrowserContext();
    const bank = await page(privateContext, origin, true);
    await check('Menú histórico carga el remote real RUND y consulta su servicio', async () => {
      await bank.goto(origin + '/?module=banco-docentes-pta', { waitUntil: 'domcontentloaded' });
      await bank.waitForFunction(() => document.body.innerText.includes('DOCENTE RUND FICTICIO'), { timeout: 30000 });
      assert(requests.some(item => item.path.startsWith('/rund/api/v1/') && item.path.endsWith('/banco-docentes')));
      assert(!requests.some(item => /^\/pta\/api\/v1\/(?:pta\/)?banco-docentes/.test(item.path)));
    });
    await check('Entrada module=rund conserva carga y sesión del shell', async () => {
      await bank.goto(origin + '/?module=rund', { waitUntil: 'domcontentloaded' });
      await bank.waitForFunction(() => document.body.innerText.includes('DOCENTE RUND FICTICIO'), { timeout: 30000 });
      assert.equal(await bank.evaluate(() => window.__esap_auth_cache?.email), operator.email);
    });
    await check('El alias module=banco-docentes sigue abriendo el banco RUND', async () => {
      await bank.goto(origin + '/?module=banco-docentes', { waitUntil: 'domcontentloaded' });
      await bank.waitForFunction(() => document.body.innerText.includes('DOCENTE RUND FICTICIO'), { timeout: 30000 });
    });
    await check('Autogestión federada funciona sin login y solicita OTP a RUND', async () => {
      const context = await browser.createBrowserContext();
      const tab = await page(context, origin, false);
      await publicOtp(tab, origin + '/rund/autogestion/docentes?token=invitacion-ficticia', '/rund/api/v1/');
      await context.close();
    });
    await check('La ruta pública anterior conserva el formulario y OTP de PTA', async () => {
      const context = await browser.createBrowserContext();
      const tab = await page(context, origin, false);
      await publicOtp(tab, origin + '/autogestion/docentes?token=invitacion-anterior', '/pta/api/v1/');
      await context.close();
    });
    assert.deepEqual(errors, [], 'Errores JavaScript en navegador: ' + errors.join('; '));
    fs.writeFileSync(path.join(root, 'docs/rund/validacion-shell-navegador-local.json'), JSON.stringify({ verifiedAt: new Date().toISOString(),
      passed: true, browser: await browser.version(), compiledShellAndRemote: true, apiResponses: 'fixtures interceptadas; sin tráfico API real',
      realBrowserProfileUsed: false, checks, apiRequestCount: requests.length, javascriptErrors: errors }, null, 2) + '\n');
    console.log('OK: ' + checks.length + ' comprobaciones de shell/remotes compilados en navegador.');
  } finally {
    if (browser) await browser.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
