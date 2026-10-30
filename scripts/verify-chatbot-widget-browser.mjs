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
let browser, server, crossGateway;
const date = '2026-10-22T12:00:00Z';
const rows = new Map();
const requests = [];
let creates = 0;
let failNextSend = false;
let rejectSession = false;
let refreshes = 0;
let firstTimeAccount = false;
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
const gateway = new URLSearchParams(location.search).get('gateway') || '/services';
const FullChat = React.lazy(()=>import('chatbot/Module'));
function Fixture(){
  const [logged,setLogged]=React.useState(!isPublic),[full,setFull]=React.useState(isFull),[module,setModule]=React.useState('Portal');
  window.fixtureActions={login:()=>setLogged(value=>!value),navigate:()=>setModule(value=>value==='Portal'?'RUND':'Portal'),full:setFull};
  return <GlobalChatbotProvider apiBaseUrl={gateway} user={logged?{id:'synthetic',name:'Usuario ficticio',email:'synthetic@example.invalid'}:undefined}>
    {full ? <ChatbotFullPageScope><React.Suspense fallback={<p>Cargando</p>}><FullChat apiBaseUrl={gateway}/></React.Suspense></ChatbotFullPageScope> :
    <><header style={{position:'fixed',inset:'0 0 auto',height:64,zIndex:101,background:'white'}}>Barra superior de la aplicación · {module} · {logged?'Cuenta activa':'Visitante'}</header><main style={{minHeight:2200,padding:80}}><input aria-label="Formulario principal"/><button onClick={()=>{window.otherAction=true;}}>Otra acción</button><p>Vista de prueba</p></main></>}
  </GlobalChatbotProvider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);`);
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
      if (url.pathname === '/services/auth/api/v1/refresh') {
        refreshes++;
        if (rejectSession) return send({ message: 'Synthetic rejected session' }, 401);
        res.setHeader('Set-Cookie', 'esap_access_token=synthetic-renewed; HttpOnly; SameSite=Lax; Path=/');
        return send({});
      }
      if (url.pathname.includes('/chat/') && (rejectSession || req.headers.cookie?.includes('synthetic-expired'))) return send({ message: 'Synthetic rejected session' }, 401);
      if (url.pathname.endsWith('/public/consultas') && req.method === 'POST') {
        if(failNextSend){failNextSend=false;return send({message:'Synthetic unavailable service'},503);}
        return send({ respuesta: `Orientación pública. ${'texto'.repeat(200)}` });
      }
      if (url.pathname.endsWith('/chat/acceso')) return send({ puedeVerTodas: false });
      if (url.pathname.endsWith('/chat/conversaciones')) {
        if (req.method === 'GET') return send([...rows.values()]);
        if (req.method === 'POST') { const created = conversation(`new-${++creates}`, 'Nueva consulta'); if(firstTimeAccount)created.mensajes=[]; rows.set(created.id, created); return send(created, 201); }
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
  // Gateway ficticio en otro puerto: CORS y cookie reales, con prefijo propio.
  crossGateway = http.createServer((req, res) => {
    if (!req.url.startsWith('/custom-prefix/')) { res.statusCode=404;res.end();return; }
    res.setHeader('Access-Control-Allow-Origin', origin);res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if(req.method==='OPTIONS'){res.statusCode=204;res.end();return;}
    const upstream=http.request(origin+req.url.replace(/^\/custom-prefix\//,'/services/'),{method:req.method,headers:req.headers}, response=>{
      res.writeHead(response.statusCode,response.headers);response.pipe(res);
    });
    upstream.on('error',()=>{res.statusCode=502;res.end();});req.pipe(upstream);
  });
  await new Promise(resolve=>crossGateway.listen(0,'127.0.0.1',resolve));
  const crossOrigin=`http://127.0.0.1:${crossGateway.address().port}`;
  const screenshots = path.join(root, '.local/chatbot-responsive-preview');
  await fs.mkdir(screenshots, { recursive: true });
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setRequestInterception(true);
  page.on('request', (request) => [origin,crossOrigin].includes(new URL(request.url()).origin) ? request.continue() : request.abort());
  await page.setCookie({ name: 'esap_access_token', value: 'synthetic-cookie', url: origin, httpOnly: true, sameSite: 'Lax' });
  const click = async (label) => {
    await page.waitForFunction((text) => [...document.querySelectorAll('button')].some((button) => (button.getAttribute('aria-label') || button.textContent.trim()) === text && button.getClientRects().length && !button.disabled), {}, label);
    await page.evaluate((text) => [...document.querySelectorAll('button')].find((button) => (button.getAttribute('aria-label') || button.textContent.trim()) === text && button.getClientRects().length && !button.disabled).click(), label);
  };
  const inputSelector = 'input[aria-label="Mensaje para el asistente"]';
  const ready = (selector=inputSelector) => page.waitForFunction(selector=>{const input=document.querySelector(selector);return input&&!input.disabled;},{},selector);
  const fill = async(text,selector=inputSelector)=>{await page.focus(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type(selector,text);};
  const checkBounds = async (selector=inputSelector) => {
    const sizes=await page.evaluate(field=>{
      const rect=element=>{const r=element.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      const dialog=document.querySelector('[role=dialog]'),input=document.querySelector(field),messages=document.querySelector('[role=log]');
      const controls=[...dialog.querySelectorAll('.esap-chatbot-widget__actions button'),input,dialog.querySelector('button[type=submit]')];
      return{panel:rect(dialog),controls:controls.map(rect),width:innerWidth,height:innerHeight,overflow:messages.scrollWidth-messages.clientWidth,messagesHeight:messages.clientHeight,
        reachable:controls.every(control=>{const r=control.getBoundingClientRect();return control.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2));})};
    },selector);
    for(const rect of [sizes.panel,...sizes.controls])assert(rect.width>0&&rect.height>0&&rect.left>=-1&&rect.top>=-1&&rect.right<=sizes.width+1&&rect.bottom<=sizes.height+1,JSON.stringify(sizes));
    assert(sizes.overflow<=1&&sizes.messagesHeight>0&&sizes.reachable,JSON.stringify(sizes));
    assert.equal(await page.$eval('.esap-chatbot-widget__header h2',title=>getComputedStyle(title).fontSize),'13px');
    assert.equal(await page.$('button[aria-label="Historial"]'),null);
    assert(!(await page.evaluate(()=>[...document.querySelectorAll('button')].some(button=>/Iniciar sesión|Reconectar asistente|Historial/.test(button.textContent)))));
  };
  for(const viewport of [{width:1440,height:900},{width:1333,height:600},{width:1366,height:570},{width:1024,height:500},{width:800,height:450},{width:390,height:844},{width:320,height:568},{width:280,height:500},{width:844,height:390},{width:390,height:300}]){
    await page.setViewport(viewport);await page.goto(origin);await click('Asistente ESAP');await ready();await checkBounds();
    await page.screenshot({path:path.join(screenshots,'transient-'+viewport.width+'x'+viewport.height+'.png')});
    await fill('Borrador conservado');await click('Ampliar chat');await checkBounds();await click('Restaurar tamaño del chat');
    assert.equal(await page.$eval(inputSelector,input=>input.value),'Borrador conservado');
    await page.focus(inputSelector);await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement?.textContent.trim()),'Asistente ESAP');
    await click('Asistente ESAP');assert.equal(await page.$eval(inputSelector,input=>input.value),'Borrador conservado');
  }
  console.log('PASS: diez tamaños, controles accesibles, ampliar/restaurar y minimizar sin perder el borrador.');
  await page.setViewport({width:390,height:600});
  rejectSession=true; // Las rutas privadas rechazan la sesión; la consulta general sigue funcionando.
  await fill('Pregunta sin inicio de sesión');await click('Enviar');await ready();
  assert(await page.$eval('[role=log]',log=>log.textContent.includes('Orientación pública.')));
  await fill('Mantener al navegar');
  for(const action of ['login','navigate','login']){
    await page.evaluate(action=>window.fixtureActions[action](),action);
    assert.equal(await page.$eval(inputSelector,input=>input.value),'Mantener al navegar');
    assert(await page.$eval('[role=log]',log=>log.textContent.includes('Pregunta sin inicio de sesión')));
  }
  await page.evaluate(()=>window.fixtureActions.full(true));
  const fullInput='.esap-chatbot-temporary--page input';
  await ready(fullInput);
  assert.equal(await page.$eval(fullInput,input=>input.value),'Mantener al navegar');
  assert(await page.$eval('.esap-chatbot-temporary--page [role=log]',log=>log.textContent.includes('Pregunta sin inicio de sesión')));
  assert.equal(await page.$$eval('.esap-chatbot-widget',widgets=>widgets.filter(widget=>widget.getClientRects().length).length),0);
  await fill('Borrador de vista completa',fullInput);
  await page.evaluate(()=>window.fixtureActions.full(false));await page.waitForSelector('[role=dialog]',{visible:true});
  assert.equal(await page.$eval(inputSelector,input=>input.value),'Borrador de vista completa');
  console.log('PASS: conversación y borrador sobreviven a inicio/cierre de sesión, navegación y vista completa compartida.');
  await page.reload();await click('Asistente ESAP');await ready();
  assert.equal(await page.$eval(inputSelector,input=>input.value),'');
  assert(!(await page.$eval('[role=log]',log=>log.textContent.includes('Pregunta sin inicio de sesión'))));
  assert(await page.$eval('[role=log]',log=>log.textContent.includes('¿En qué puedo orientarte hoy?')));
  await page.evaluate(()=>{window.sessionStorage.setItem('fixture','test');window.sessionStorage.removeItem('fixture');});
  failNextSend=true;
  await fill('Consulta conservada tras error');await click('Enviar');await page.waitForSelector('[role=alert]');await ready();
  assert.equal(await page.$eval(inputSelector,input=>input.value),'Consulta conservada tras error');
  await click('Enviar');await ready();await page.waitForSelector('.esap-chatbot-temporary__answer');
  await click('Nueva conversación');
  assert.equal(await page.$('.esap-chatbot-temporary__answer'),null);
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Mensaje para el asistente');
  await fill('Dato temporal para recarga');await click('Enviar');await ready();
  assert(await page.evaluate(()=>![localStorage,sessionStorage].some(storage=>Object.values(storage).some(value=>String(value).includes('Dato temporal para recarga')))));
  console.log('PASS: recarga completa reinicia el chat, no usa Storage, recupera fallos sin respuesta falsa y permite nueva conversación.');

  await page.goto(origin+'/?gateway='+encodeURIComponent(crossOrigin+'/custom-prefix/'));await click('Asistente ESAP');await ready();
  await fill('Consulta mediante gateway separado');await click('Enviar');await ready();
  assert(await page.$eval('[role=log]',log=>log.textContent.includes('Orientación pública.')));
  const consultations=requests.filter(request=>request.url.endsWith('/public/consultas'));
  assert(consultations.length>=4);assert(consultations.every(request=>!request.cookie));
  assert.equal(requests.filter(request=>request.url.includes('/chat/')||request.url.endsWith('/refresh')).length,0);
  assert.equal(creates,0);assert.equal(refreshes,0);
  assert.deepEqual(errors,[]);
  console.log('PASS: gateway separado y prefijo propio, consultas sin cookies, cero llamadas a historial/permisos/refresh y cero conversaciones persistidas.');
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (crossGateway) await new Promise((resolve) => crossGateway.close(resolve));
  await fs.unlink(configFile).catch(() => {}); await fs.unlink(entryFile).catch(() => {});
  if (!path.resolve(temporary).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Unsafe cleanup path');
  await fs.rm(temporary, { recursive: true, force: true });
}
