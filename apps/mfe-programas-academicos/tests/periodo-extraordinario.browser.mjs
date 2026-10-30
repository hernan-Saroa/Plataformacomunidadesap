import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
const origin = 'http://127.0.0.1:3126';
const base = `${origin}/remotes/mfe-programas-academicos/`;
const permiso = 'pta.periodos.activar_extraordinario';
const principal = { id: '12', codigo: '2027-2', tipo: 'semestral', nombre: null, anio: 2027, semestre: 2, fechaInicio: '2027-07-01', fechaFin: '2027-12-15', estado: 'en_curso', extraordinario: false, motivoExtraordinario: null };
const destino = { id: '13', codigo: '2027-INT', tipo: 'personalizado', nombre: 'Interperiodo', anio: 2027, semestre: null, fechaInicio: '2027-06-15', fechaFin: '2027-06-30', estado: 'planeacion', extraordinario: false, motivoExtraordinario: null };
const extra = { ...destino, id: '14', codigo: '2027-ESP', estado: 'en_curso', extraordinario: true, motivoExtraordinario: 'Necesidad académica aprobada' };
let permisos = [permiso], rechazar = true, consultas = 0;
const solicitudes = [], errores = [];
const usuario = () => ({ id: 'qa-ui', email: 'qa.interfaz@example.test', name: 'QA interfaz', roles: [], permissions: permisos });
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 1000 });
  page.on('pageerror', e => errores.push(e.message)); await page.setRequestInterception(true);
  page.on('request', r => {
    const u = new URL(r.url());
    if (u.pathname.endsWith('/src/main.tsx')) return r.respond({ status: 200, contentType: 'application/javascript', body: `
      import * as ReactNS from '${base}node_modules/.vite/deps/react.js';
      import * as DomNS from '${base}node_modules/.vite/deps/react-dom_client.js';
      import { GestionPeriodos } from '${base}src/components/GestionPeriodos.tsx';
      import '${base}src/index.css';
      const React = ReactNS.default ?? ReactNS;
      window.__esap_auth_cache = ${JSON.stringify(usuario())};
      (DomNS.createRoot ?? DomNS.default.createRoot)(document.getElementById('root')).render(React.createElement(GestionPeriodos, { onBack: () => {}, onNavigateToImport: () => {} }));
    ` });
    if (!u.pathname.includes('/api/v1/')) return u.origin === origin || u.protocol === 'data:' ? r.continue() : r.abort();
    let status = 200, data;
    if (r.method() === 'OPTIONS') data = {};
    else if (u.pathname.endsWith('/auth/api/v1/verify')) data = usuario();
    else if (u.pathname.endsWith('/pta/api/v1/periodos-academicos')) { consultas++; data = [principal, destino, extra]; }
    else if (u.pathname.includes('/asignaturas-import/last-import')) data = { success: true, counts: { programas: 0, asignaturas: 0, cetaps: 0 } };
    else if (u.pathname.endsWith('/periodos-academicos/13/activar-extraordinario') && r.method() === 'POST') {
      solicitudes.push({ method: r.method(), path: u.pathname, body: JSON.parse(r.postData()) });
      if (rechazar) { status = 409; data = { message: 'El periodo ya no permite esta activación.', error: 'Conflict', statusCode: 409 }; }
      else { Object.assign(destino, { estado: 'en_curso', extraordinario: true, motivoExtraordinario: JSON.parse(r.postData()).motivo }); data = destino; }
    } else { status = 404; data = { message: 'Ruta inesperada de prueba', statusCode: 404 }; }
    if (!['GET', 'OPTIONS', 'POST'].includes(r.method())) solicitudes.push({ method: r.method(), path: u.pathname });
    r.respond({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': r.headers()['access-control-request-headers'] || 'Content-Type,Authorization,X-Client-Version,X-Client-Platform,X-Frontend-Base-Url', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(data) });
  });
  await page.goto(base);
  try { await page.waitForFunction(() => document.body.innerText.includes('Extraordinario en curso')); }
  catch (e) { console.error(JSON.stringify({ errores, texto: (await page.evaluate(() => document.body.innerText)).slice(0, 600) })); throw e; }
  let texto = await page.evaluate(() => document.body.innerText);
  assert.ok(texto.includes('Principal en curso') && texto.includes('Interperiodo — Año 2027'));
  assert.equal(await page.$$eval('button', bs => bs.filter(b => b.textContent.includes('Activar como extraordinario')).every(b => b.disabled)), true);
  extra.estado = 'cerrado'; await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Activar como extraordinario') && !b.disabled));
  const abrir = () => page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Activar como extraordinario') && b.getBoundingClientRect().width > 0).click());
  await abrir(); await page.waitForSelector('[role=dialog]');
  assert.ok((await page.$eval('[role=dialog]', e => e.textContent)).includes('No cierra el periodo principal 2027-2.'));
  assert.equal(solicitudes.length, 0);
  assert.equal(await page.$eval('[role=dialog] button:last-child', e => e.disabled), true);
  await page.type('textarea', 'Corto');
  assert.equal(await page.$eval('[role=dialog] button:last-child', e => e.disabled), true);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
  assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Activar como extraordinario');
  await abrir(); await page.waitForSelector('textarea'); await page.type('textarea', 'Habilitar el interperiodo aprobado');
  await page.screenshot({ path: fileURLToPath(new URL('./periodo-extraordinario-modal.png', import.meta.url)), fullPage: true });
  const consultasAntes = consultas;
  await page.click('[role=dialog] button:last-child');
  await page.waitForSelector('[role=alert]');
  assert.equal(consultas, consultasAntes);
  assert.equal(await page.$eval('textarea', e => e.value), 'Habilitar el interperiodo aprobado');
  rechazar = false; await page.click('[role=dialog] button:last-child');
  await page.waitForFunction(() => !document.querySelector('[role=dialog]') && document.body.innerText.includes('Extraordinario en curso'));
  assert.ok(consultas > consultasAntes);
  assert.equal(principal.estado, 'en_curso'); assert.equal(principal.extraordinario, false);
  assert.deepEqual(solicitudes.at(-1).body, { motivo: 'Habilitar el interperiodo aprobado' });
  assert.ok(solicitudes.every(s => s.method === 'POST' && s.path.endsWith('/13/activar-extraordinario')));
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL('./periodos-principal-extraordinario-movil.png', import.meta.url)), fullPage: true });
  permisos = []; destino.estado = 'planeacion'; destino.extraordinario = false;
  await page.reload(); await page.waitForFunction(() => document.body.innerText.includes('Periodo 2027-INT'));
  assert.equal(await page.$$eval('button', bs => bs.filter(b => b.textContent.includes('Activar como extraordinario')).length), 0);
  assert.deepEqual(errores, []);
  console.log('PASS: principal/extraordinario, personalizado sin semestre vacío, permiso, un extraordinario a la vez, motivo, Esc/foco, 409 sin perder texto, POST exacto y refresco sin cambiar el principal; escritorio y móvil.');
} finally { await browser.close(); }
