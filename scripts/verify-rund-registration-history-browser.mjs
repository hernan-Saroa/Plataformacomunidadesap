// Real RUND tabs and API adapter; synthetic responses only. No business writes.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureApi = `
const recoveryMode=new URLSearchParams(location.search).has('recovery');
const records=Array.from({length:100},(_,i)=>({fila:i+2,nombre:'Docente de prueba '+String(i+1).padStart(3,'0'),documento_identidad:'TEST-'+String(i+1).padStart(4,'0'),correo:'docente'+(i+1)+'@example.invalid',periodo:'2026-2',resultado:i===99?'NO_CARGADO':i===98?'SIN_CAMBIOS':i>95?'ACTUALIZADO':'CREADO',fecha:'2026-10-22T14:00:00Z'}));
const bulk={id:'batch-fixture',tipo:'MASIVO',periodo:'2026-2',titulo:'Elegibles_Docentes_2026-2.xlsx',responsable:'María Gestión Documental',fecha:'2026-10-22T13:00:00Z',fechaFin:'2026-10-22T13:10:00Z',estado:'COMPLETADA_CON_ERRORES',resumen:{total:100,creados:96,actualizados:2,sinCambios:1,errores:1},detalleCompleto:true};
const individual={...bulk,id:'individual-fixture',tipo:'INDIVIDUAL',titulo:'Docente de prueba individual',estado:'COMPLETADA',resumen:{total:1,creados:1},fecha:'2026-10-22T15:30:00Z'};
const old={...bulk,id:'old-fixture',periodo:'2025-2',titulo:'Docentes_periodo_2025-2.xlsx',estado:'COMPLETADA',resumen:{total:12,creados:12,errores:0}};
const recovery={...bulk,id:'recovery-fixture',origen:'RECUPERACION_INFORMATIVA',titulo:'Archivo_historico_recuperado.xlsx',estado:'COMPLETADA',responsable:'No registrado',responsableRecuperacion:'Sistema',resumen:{total:100,recuperados:100}};
window.traceFixtureRequests=[];
export const apiClient={get:async(url,params={})=>{
 window.traceFixtureRequests.push({url,params});
 if(url.includes('/trazabilidad/')){let rows=recoveryMode?records.map(r=>({...r,resultado:'RECUPERADO'})):url.includes('INDIVIDUAL')?[{...records[0],nombre:individual.titulo}]:records;rows=rows.filter(r=>!params.search||[r.nombre,r.documento_identidad,r.correo].some(v=>v.toLowerCase().includes(params.search.toLowerCase())));const page=params.page||1;return {event:recoveryMode?recovery:url.includes('INDIVIDUAL')?individual:bulk,registros:rows.slice((page-1)*25,page*25),total:rows.length,page,limit:25,pages:Math.ceil(rows.length/25),detalleCompleto:true,accesoCompleto:true};}
 if(url.endsWith('/trazabilidad')){let events=(recoveryMode?[recovery]:[individual,bulk,old]).filter(e=>(!params.periodoCarga||e.periodo===params.periodoCarga)&&(!params.tipo||e.tipo===params.tipo)&&(!params.search||e.titulo.toLowerCase().includes(params.search.toLowerCase())));return {data:events,total:events.length,page:1,limit:20,pages:1,accesoCompleto:true};}
 if(url.includes('periodos-academicos'))return [{id:'period-2026',codigo:'2026-2',estado:'en_curso'},{id:'period-2025',codigo:'2025-2',estado:'cerrado'}];
 if(url.endsWith('/stats'))return {total:100,por_dedicacion:[],por_territorial:[]};
 if(url.endsWith('/banco-docentes'))return {items:[],total:0,pages:1,page:1};
 return [];
},post:async()=>{throw Error('Mutation forbidden in fixture')},getBlob:async()=>new Blob(['fixture'],{type:'application/octet-stream'})};
`;
const entry = `import React from 'react';import{createRoot}from'react-dom/client';
import{AuthProvider}from'/apps/mfe-pta/src/contexts/AuthContext.tsx';
import{BancoDocentesPTA}from'/apps/mfe-pta/src/components/pta/banco-docentes/BancoDocentesPTA.tsx';
createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,{isSuperUser:true,userPersonId:'fixture'},React.createElement(BancoDocentesPTA)));`;
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'rund-history-fixture', enforce: 'pre',
  resolveId(source) { if (source.endsWith('shell/src/services/api')) return '\0fixture-api'; if (source === '/trace-entry.js') return '\0fixture-entry'; },
  load(id) { if (id === '\0fixture-api') return fixtureApi; if (id === '\0fixture-entry') return entry; },
  configureServer(dev) { dev.middlewares.use('/trace-fixture', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html'); res.end(await dev.transformIndexHtml('/trace-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f8fc;font-family:Arial,sans-serif}button,input,select{font-family:inherit}</style></head><body><div id="root"></div><script type="module" src="/trace-entry.js"></script></body></html>'));
  }); },
}, react()], resolve: { alias: [
  { find: '@esap-mfe/shared-ui', replacement: path.join(root, 'packages/shared-ui/src') },
  { find: '@esap-mfe/shared-hooks', replacement: path.join(root, 'packages/shared-hooks/src') },
  { find: '@esap-mfe/shared-types', replacement: path.join(root, 'packages/shared-types/src') },
] } });
let browser;
try {
  await server.listen(); browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.setDefaultTimeout(60000); page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()) ? request.continue() : request.abort());
  await page.setViewport({ width: 1440, height: 1050 });
  const click = text => page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text)?.click(), text);
  await page.goto(origin + '/trace-fixture', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === '2026-2'));
  await click('Trazabilidad');
  await page.waitForFunction(() => document.body.textContent.includes('Elegibles_Docentes_2026-2.xlsx'));
  const artifacts = path.join(root, '.local/rund-registration-history'); await fs.mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, 'trazabilidad.png'), fullPage: true });
  await click('Ver personas'); await page.waitForSelector('.rund-trace__detail tbody tr');
  assert.equal(await page.$$eval('.rund-trace__detail tbody tr', rows => rows.length), 25);
  await page.click('.rund-trace__detail button[aria-label="Página siguiente"]');
  await page.waitForFunction(() => document.querySelector('.rund-trace__detail tbody')?.textContent.includes('Docente de prueba 026'));
  const search = await page.$('input[aria-label="Buscar persona en esta carga"]'); await search.type('TEST-0100');
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__detail tbody tr').length === 1 && document.querySelector('.rund-trace__detail tbody')?.textContent.includes('TEST-0100'));
  await page.screenshot({ path: path.join(artifacts, 'detalle-busqueda.png'), fullPage: true });
  await click('2026-2'); await click('2025-2');
  await page.waitForFunction(() => document.body.textContent.includes('Docentes_periodo_2025-2.xlsx'));
  assert.equal(await page.$eval('.rund-trace', node => node.textContent.includes('Elegibles_Docentes_2026-2.xlsx')), false);
  await page.setViewport({ width: 430, height: 932 });
  await page.screenshot({ path: path.join(artifacts, 'movil.png'), fullPage: true });
  await click('Listado de Docentes');
  await page.waitForFunction(() => !document.querySelector('.rund-trace'));
  await page.setViewport({width:1440,height:1050});
  await page.goto(origin+'/trace-fixture?recovery',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='2026-2'));
  await click('Trazabilidad');
  await page.waitForFunction(()=>document.body.textContent.includes('Archivo_historico_recuperado.xlsx'));
  const recoveryText=await page.$eval('.rund-trace',node=>node.textContent);
  assert(recoveryText.includes('No quedó registrado')&&recoveryText.includes('Proceso automático')&&!recoveryText.includes('Sistema'));
  await page.screenshot({path:path.join(artifacts,'recuperacion.png'),fullPage:true});
  await click('Ver personas');
  await page.waitForFunction(()=>document.querySelector('.rund-trace__detail tbody')?.textContent.includes('Información recuperada'));
  assert(await page.$eval('.rund-trace__detail',node=>node.textContent.includes('Fecha de recuperación')&&!node.textContent.includes('Resultado no conservado')));
  await page.screenshot({path:path.join(artifacts,'recuperacion-detalle.png'),fullPage:true});
  assert.deepEqual(errors, []);
  console.log('RUND navegador: nueva pestaña, archivo y responsable, 100 personas paginadas, búsqueda, cambio de periodo y regreso al listado verificados. Datos sintéticos, sin escrituras.');
} finally { await browser?.close(); await server.close(); }
