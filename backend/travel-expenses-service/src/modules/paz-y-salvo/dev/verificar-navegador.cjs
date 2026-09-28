// Requiere servidores aislados 3111, 3112 y 3117. No envía correos reales.
const path = require('path');
const fs = require('fs');
const assert = require('assert/strict');
const repo = path.resolve(__dirname, '../../../../../..');
const travel = path.join(repo, 'backend/travel-expenses-service');
const artifacts = path.join(travel, '.cache/efds1311');
fs.mkdirSync(artifacts, { recursive: true });
require(path.join(travel, 'node_modules/dotenv')).config({ path: path.join(travel, '.env') });
const puppeteer = require(path.join(repo, 'node_modules/puppeteer'));
const jwt = require(path.join(travel, 'node_modules/jsonwebtoken'));
const usuarioId = '13110000-0002-4000-8000-000000009001';
const token = jwt.sign({ sub: usuarioId, username: 'Coordinadora prueba', email: 'efds1311-coordinadora@example.invalid',
  permissions: ['travel_expenses:paz_y_salvo.manage'], roles: [] }, process.env.JWT_SECRET || 'esap-super-secret-jwt-key-2024', { expiresIn: '15m' });
(async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await browser.setCookie({ name: 'esap_access_token', value: token, domain: 'localhost', path: '/', httpOnly: true });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:3117/src/components/paz-y-salvo/dev.html', { waitUntil: 'networkidle0' });
    async function click(text) {
      console.log('Botón:', text);
      await page.waitForFunction(t => [...document.querySelectorAll('button')].some(b => b.textContent === t && !b.disabled), {}, text);
      await page.evaluate(t => [...document.querySelectorAll('button')].find(b => b.textContent === t).click(), text);
    }
    async function esperar(text) {
      console.log('Verificar:', text);
      try { await page.waitForFunction(t => document.body.innerText.includes(t), {}, text); }
      catch (error) { console.error(await page.evaluate(() => document.body.innerText)); throw error; }
    }
    async function buscar(n) {
      await page.$eval('input', (input, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }, `TEST1311900${n}`);
      await click('Buscar');
      await click(`Prueba1311 Caso900${n} · TEST1311900${n}`);
      await esperar('Documentos registrados');
    }
    await buscar(1); await esperar('Sin legalizaciones pendientes.'); await click('Preparar paz y salvo');
    await esperar('Documento preparado.'); await click('Solicitar código'); await esperar('Código enviado a');
    const code = fs.readFileSync(path.join(travel, 'otp-browser-1311.log'), 'utf8').trim();
    await page.type('input[autocomplete="one-time-code"]', code);
    await click('Verificar y firmar'); await esperar('Paz y salvo firmado y disponible para descarga.');
    await page.screenshot({ path: path.join(artifacts, 'browser-1311-firmado.png'), fullPage: true });
    // Recarga: prueba que el resultado viene del servidor.
    await page.reload({ waitUntil: 'networkidle0' }); await buscar(1);
    await click('Consultar'); await esperar('Trazabilidad'); await esperar('FIRMA_VERIFICADA');
    const download = page.waitForResponse(r => r.url().endsWith('/archivo'));
    await click('Descargar PDF'); const response = await download;
    assert.equal(response.status(), 200);
    assert.ok(response.headers()['content-type'].includes('application/pdf'));
    await esperar('Descarga registrada.');
    for (const n of [2, 3]) {
      await buscar(n); await esperar(`COM-2026-900${n}`);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Preparar paz y salvo').disabled), true);
      await page.screenshot({ path: path.join(artifacts, `browser-1311-bloqueado-900${n}.png`), fullPage: true });
    }
    assert.deepEqual(errors, []);
    console.log('AC-01, AC-02 (9002 y 9003), AC-03: PASS en Chromium, PostgreSQL y auth reales; correo interceptado.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exit(1); });
