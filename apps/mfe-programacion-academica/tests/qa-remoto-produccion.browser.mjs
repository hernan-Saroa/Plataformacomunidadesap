import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';
import { preparar, franja, campo, click, abrirGrupo } from './qa-fixtures.mjs';
if (!process.env.PA_QA_PREVIEW_URL) throw Error('Falta PA_QA_PREVIEW_URL: debe ser la raíz del MFE real servido con preview.');
const browser = await puppeteer.launch({ headless: true, args: ['--lang=en-US'] });
try {
  const page = await browser.newPage(); await page.setViewport({width:1366,height:768}); await page.emulateTimezone('UTC');
  const estado = { llamadas: [], sesiones: [franja('f1')], horas: 32 };
  const errores = await preparar(page, estado), rutas = [];
  page.on('request', r => rutas.push(new URL(r.url()).pathname));
  await page.goto(process.env.PA_QA_PREVIEW_URL);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Catálogo Académico')));
  // El anfitrión shell sirve esta misma hoja; el remoto no la vuelve a empaquetar.
  await page.addStyleTag({content:await readFile(new URL('../../shell/src/index.css',import.meta.url),'utf8')});
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Catálogo Académico')).click());
  await abrirGrupo(page);await click(page,'Agregar sesión');
  await page.waitForSelector('input[aria-label="Inicio"]');
  assert.equal(await page.$eval('input[aria-label="Inicio"]',e=>e.type),'text');
  await campo(page,'input[aria-label="Inicio"]','18:15');await campo(page,'input[aria-label="Fin"]','19:15');
  await click(page,'Validar días');await page.waitForFunction(()=>document.body.innerText.includes('Validación por día'));
  await click(page,'Agregar sesiones');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
  assert.ok(rutas.some(r=>r.includes('/assets/')&&r.endsWith('.js')));
  assert.ok(!rutas.some(r=>r.includes('/src/')||r.includes('/@vite/')),'sin servir TSX de desarrollo');
  assert.ok(!estado.llamadas.some(c=>c.ruta==='jefatura/pendientes'));
  assert.deepEqual(errores,[]);
  await page.screenshot({path:new URL('./evidencia-qa/remoto-produccion.png',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
  await writeFile(new URL('./evidencia-qa/remoto-produccion.json',import.meta.url),JSON.stringify({resultado:'PASS',modo:'MFE real construido con su vite.config.ts y servido con vite preview; API simulada',idioma:'en-US',zona:'UTC',resolucion:'1366x768',rutasDeAssets:rutas.filter(r=>r.includes('/assets/'))},null,2));
  console.log('PASS: remoto real en build/preview, sin TSX ni servidor dev.');
} finally {await browser.close();}
