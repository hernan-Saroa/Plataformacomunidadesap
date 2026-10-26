// Artefactos reales de Vite/federación, Chromium y un gateway efímero con datos ficticios.
// No conecta con servicios existentes ni usa cuentas reales.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import { build } from 'vite';
import react from '@vitejs/plugin-react-swc';
import federation from '@originjs/vite-plugin-federation';
import puppeteer from 'puppeteer';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(root, 'apps/mfe-chatbot');
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'esap-chatbot-widget-'));
const configFile = path.join(appRoot, `.chatbot-browser-${randomUUID()}.mjs`);
const entryFile = path.join(appRoot, `.chatbot-browser-${randomUUID()}.tsx`);
const output = path.join(temporary, 'dist');
let browser, server;
const date = '2026-10-22T12:00:00Z';
const rows = new Map();
const requests = [];
let creates = 0;
let failNextSend = false;
function conversation(id, title) {
  return { id, titulo: title, contexto: 'general', puedeEscribir: true, createdAt: date, updatedAt: date,
    mensajes: [{ id: `welcome-${id}`, conversacionId: id, rol: 'assistant', contenido: `Consulta **Viáticos**. ${'texto'.repeat(200)}`, createdAt: date }] };
}
rows.set('first', conversation('first', 'Primera consulta'));
rows.set('second', conversation('second', 'Segunda consulta'));

try {
  const source = await fs.readFile(path.join(appRoot, 'vite.config.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext } }).outputText;
  await fs.writeFile(configFile, `const __dirname=${JSON.stringify(appRoot)};\n${compiled}`);
  const { default: config } = await import(pathToFileURL(configFile).href);
  await build({ ...config, configFile: false, logLevel: 'warn', build: { ...config.build, outDir: path.join(output, 'remotes/mfe-chatbot') } });
  console.log('PASS: build de producción del remoto.');

  await fs.writeFile(entryFile, `import React from 'react'; import {createRoot} from 'react-dom/client';
import {GlobalChatbotProvider,ChatbotFullPageScope} from '../shell/src/components/chatbot/GlobalChatbotProvider';
import '../shell/src/index.css';
const isPublic = new URLSearchParams(location.search).has('public');
const isFull = new URLSearchParams(location.search).has('full');
const FullChat = React.lazy(()=>import('chatbot/Module'));
createRoot(document.getElementById('root')).render(<GlobalChatbotProvider apiBaseUrl="/services" user={isPublic ? undefined : {id:'synthetic',name:'Usuario ficticio',email:'synthetic@example.invalid'}} onLogin={()=>{window.loginRequested=true;}}>
{isFull ? <ChatbotFullPageScope><React.Suspense fallback={<p>Cargando</p>}><FullChat apiBaseUrl="/services" userId="synthetic" /></React.Suspense></ChatbotFullPageScope> :
<main style={{minHeight:2200,padding:24}}><input aria-label="Formulario principal"/><button onClick={()=>{window.otherAction=true;}}>Otra acción</button><p>Vista de prueba</p></main>}</GlobalChatbotProvider>);`);
  await build({ root: appRoot, configFile: false, logLevel: 'warn', plugins: [react(), federation({ name: 'chatbot_widget_verification',
    remotes: { chatbot: '/remotes/mfe-chatbot/assets/remoteEntry.js' }, shared: ['react', 'react-dom', 'react-router-dom'] })],
    build: { target: 'esnext', outDir: output, emptyOutDir: false, rollupOptions: { input: entryFile, output: { entryFileNames: 'host.js' } } } });
  const files = await fs.readdir(path.join(output, 'assets'));
  const styles = files.filter((name) => name.endsWith('.css')).map((name) => `<link rel="stylesheet" href="/assets/${name}">`).join('');
  await fs.writeFile(path.join(output, 'index.html'), `<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body><div id="root"></div><script type="module" src="/host.js"></script></body></html>`);

  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://fixture.invalid');
    if (url.pathname.startsWith('/services/')) {
      requests.push({ url: url.pathname, method: req.method, cookie: req.headers.cookie });
      res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
      const send = (body, status = 200) => { res.statusCode = status; res.end(JSON.stringify(body)); };
      if (url.pathname.endsWith('/public/config')) return send({ activo: true });
      let raw = ''; for await (const part of req) raw += part;
      const body = raw ? JSON.parse(raw) : {};
      if (url.pathname.endsWith('/public/consultas') && req.method === 'POST') return send({ respuesta: `Orientación pública. ${'texto'.repeat(200)}` });
      if (url.pathname.endsWith('/chat/acceso')) return send({ puedeVerTodas: false });
      if (url.pathname.endsWith('/chat/conversaciones')) {
        if (req.method === 'GET') return send([...rows.values()]);
        if (req.method === 'POST') { const created = conversation(`new-${++creates}`, 'Nueva consulta'); rows.set(created.id, created); return send(created, 201); }
      }
      const match = url.pathname.match(/\/chat\/conversaciones\/([^/]+)(\/mensajes)?$/);
      if (match && rows.has(match[1])) {
        const row = rows.get(match[1]);
        if (req.method === 'GET') return send(row);
        if (req.method === 'POST' && match[2]) {
          if (failNextSend) { failNextSend = false; return send({ message: 'Synthetic service failure' }, 503); }
          const userMessage = { id: randomUUID(), conversacionId: row.id, rol: 'user', contenido: body.contenido, createdAt: date };
          const botMessage = { ...userMessage, id: randomUUID(), rol: 'assistant', contenido: 'Respuesta confirmada del gateway ficticio.' };
          row.mensajes.push(userMessage, botMessage);
          return send({ userMessage, botMessage });
        }
      }
      return send({ message: 'Unexpected fixture request' }, 404);
    }
    try {
      const target = path.resolve(output, `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
      if (!target.startsWith(path.resolve(output) + path.sep)) throw new Error('Invalid path');
      const content = await fs.readFile(target);
      res.setHeader('Content-Type', target.endsWith('.js') ? 'application/javascript' : target.endsWith('.css') ? 'text/css' : 'text/html');
      res.end(content);
    } catch { res.statusCode = 404; res.end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', (request) => new URL(request.url()).origin === origin ? request.continue() : request.abort());
  await page.setCookie({ name: 'esap_access_token', value: 'synthetic-cookie', url: origin, httpOnly: true, sameSite: 'Lax' });
  const click = async (label) => {
    await page.waitForFunction((text) => [...document.querySelectorAll('button')].some((button) => (button.getAttribute('aria-label') || button.textContent.trim()) === text && button.getClientRects().length && !button.disabled), {}, label);
    await page.evaluate((text) => [...document.querySelectorAll('button')].find((button) => (button.getAttribute('aria-label') || button.textContent.trim()) === text && button.getClientRects().length && !button.disabled).click(), label);
  };
  const inputSelector = 'input[aria-label="Mensaje para el asistente"]';
  const ready = () => page.waitForFunction((selector) => { const input = document.querySelector(selector); return input && !input.disabled; }, {}, inputSelector);
  const checkBounds = async (selector) => {
    const sizes = await page.evaluate((field) => {
      const rect = (element) => { const r = element.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
      const input = document.querySelector(field), dialog = document.querySelector('[role="dialog"]');
      const messages = document.querySelector('[role="log"]');
      return { panel: rect(dialog), input: rect(input), width: innerWidth, height: innerHeight, overflow: messages.scrollWidth - messages.clientWidth };
    }, selector);
    for (const rect of [sizes.panel, sizes.input]) {
      assert(rect.width > 0 && rect.height > 0, JSON.stringify(sizes));
      assert(rect.left >= -1 && rect.top >= -1 && rect.right <= sizes.width + 1 && rect.bottom <= sizes.height + 1, JSON.stringify(sizes));
    }
    assert(sizes.overflow <= 1, JSON.stringify(sizes));
  };

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 390, height: 300 }]) {
    await page.setViewport(viewport); await page.goto(origin);
    await page.waitForSelector('input[aria-label="Formulario principal"]');
    if (viewport.width === 1440) {
      const initialScroll = await page.evaluate(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        window.scrollTo({ top: 400, behavior: 'instant' });
        return { y: window.scrollY, height: document.documentElement.scrollHeight, body: document.body.scrollHeight };
      });
      assert.equal(initialScroll.y, 400, JSON.stringify(initialScroll));
    }
    await click('Asistente ESAP'); await ready();
    if (viewport.width === 1440) assert.equal(await page.evaluate(() => window.scrollY), 400);
    await checkBounds(inputSelector);
    await page.type(inputSelector, 'Borrador conservado');
    await click('Ampliar chat'); await checkBounds(inputSelector);
    await click('Restaurar tamaño del chat');
    assert.equal(await page.$eval(inputSelector, (input) => input.value), 'Borrador conservado');
    await page.focus(inputSelector); await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Asistente ESAP');
    await click('Asistente ESAP');
    assert.equal(await page.$eval(inputSelector, (input) => input.value), 'Borrador conservado');
  }
  await page.setViewport({ width: 1440, height: 900 });
  await click('Historial');
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Buscar conversaciones');
  await page.evaluate(() => [...document.querySelectorAll('aside button')].find((button) => button.textContent.includes('Segunda consulta')).click());
  await ready(); assert.equal(await page.$eval(inputSelector, (input) => input.value), '');
  await click('Historial');
  await page.evaluate(() => [...document.querySelectorAll('aside button')].find((button) => button.textContent.includes('Primera consulta')).click());
  await ready(); assert.equal(await page.$eval(inputSelector, (input) => input.value), 'Borrador conservado');
  await click('Nueva conversación'); await ready(); assert.equal(creates, 1);
  await page.type(inputSelector, 'Consulta sintética'); await click('Enviar');
  await page.waitForFunction(() => document.querySelector('[role="log"]').textContent.includes('Respuesta confirmada'));
  await ready();
  assert(requests.filter((request) => request.url.endsWith('/mensajes') && request.method === 'POST').length === 1);
  await page.setViewport({ width: 390, height: 300 });
  failNextSend = true;
  await page.type(inputSelector, 'Consulta conservada tras error'); await click('Enviar');
  await page.waitForSelector('[role="alert"]'); await ready();
  await checkBounds(inputSelector);
  assert.equal(await page.$eval(inputSelector, (input) => input.value), 'Consulta conservada tras error');
  await click('Minimizar chat'); await page.click('button:not([class])');
  assert.equal(await page.evaluate(() => window.otherAction), true);
  console.log('PASS: cinco tamaños, ampliación, Escape/foco, borradores, historial, creación y envío.');

  await page.setViewport({ width: 390, height: 300 }); await page.goto(`${origin}/?public`);
  await click('Asistente ESAP');
  const publicSelector = 'input[aria-label="Consulta pública"]';
  await page.waitForSelector(publicSelector); await checkBounds(publicSelector);
  await page.type(publicSelector, 'Certificados'); await click('Enviar');
  await page.waitForFunction(() => document.querySelector('[role="log"]').textContent.includes('Orientación pública'));
  await checkBounds(publicSelector);
  assert(requests.filter((request) => request.url.includes('/public/')).every((request) => !request.cookie));
  assert(requests.filter((request) => request.url.includes('/chat/')).every((request) => request.cookie?.includes('esap_access_token=synthetic-cookie')));
  assert.equal(await page.evaluate(() => document.cookie.includes('esap_access_token')), false);
  await page.setViewport({ width: 390, height: 844 }); await page.goto(`${origin}/?full`);
  await ready();
  assert.equal(await page.$eval(inputSelector, (input) => input.maxLength), 2000);
  await page.type(inputSelector, 'Borrador de la vista completa');
  await click('Historial');
  await page.waitForSelector('input[aria-label="Buscar conversaciones"]', { visible: true });
  assert.equal(await page.$eval(inputSelector, (input) => input.getClientRects().length), 0);
  await click('Volver al chat');
  assert.equal(await page.$eval(inputSelector, (input) => input.value), 'Borrador de la vista completa');
  const mobileInput = await page.$eval(inputSelector, (input) => { const r=input.getBoundingClientRect(); return { left:r.left,right:r.right,width:r.width }; });
  assert(mobileInput.width > 100 && mobileInput.left >= 0 && mobileInput.right <= 390, JSON.stringify(mobileInput));
  assert.equal(await page.$$eval('.esap-chatbot-widget', (widgets) => widgets.filter((widget) => widget.getClientRects().length).length), 0);
  console.log('PASS: vista completa móvil, historial alternable, borrador y ausencia de widgets duplicados.');
  assert.deepEqual(errors, []);
  console.log('PASS: orientación pública en viewport reducido, separación de cookies y cero errores de ejecución.');
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await fs.unlink(configFile).catch(() => {}); await fs.unlink(entryFile).catch(() => {});
  if (!path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe cleanup path');
  await fs.rm(temporary, { recursive: true, force: true });
}
