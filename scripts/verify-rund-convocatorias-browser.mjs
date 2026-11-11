// Real upload/history components; in-memory fixtures, no business writes.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = `
window.convocatoriaCalls=[];
export async function getRundConvocatorias(periodo) {
  window.convocatoriaCalls.push({type:'catalog',periodo});
  return periodo==='2026-2'?[{clave:'convocatoria publica',nombre:'Convocatoria Pública'},{clave:'otra convocatoria',nombre:'Otra convocatoria'}]:[];
}
export async function bulkUploadBancoDocentes(file,dryRun,omitErrors,periodo,convocatoria) {
  window.convocatoriaCalls.push({type:'upload',dryRun,periodo,convocatoria});
  return {success:true,data:{total:1,created:0,updated:0,unchanged:1,errors:0,results:[],errorDetails:[]}};
}
const bulkEvent={id:'batch',tipo:'MASIVO',periodo:'2026-2',titulo:'docentes.xlsx',
  convocatoria:'Convocatoria Pública',responsable:'Operador de prueba',estado:'COMPLETADA',fecha:'2026-11-04T12:00:00Z',
  fechaFin:'2026-11-04T12:00:01Z',resumen:{total:1,sinCambios:1},detalleCompleto:true};
const events=[bulkEvent,{...bulkEvent,id:'other',titulo:'otra-carga.xlsx',convocatoria:'Otra convocatoria'},
  {...bulkEvent,id:'legacy',titulo:'carga-anterior.xlsx',convocatoria:null}];
const normalize=text=>String(text||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/\\s+/g,' ').trim();
export async function getRundRegistrationHistory(query) {
  window.convocatoriaCalls.push({type:'history',...query});
  const data=events.filter(event=>event.periodo===query.periodoCarga
    &&(!query.convocatoria||event.convocatoria===query.convocatoria)
    &&(!query.tipo||event.tipo===query.tipo)
    &&(!query.search||normalize(event.titulo+' '+(event.convocatoria||'')).includes(normalize(query.search))));
  return {data,total:data.length,page:1,limit:20,pages:1,accesoCompleto:true};
}
export async function getRundRegistrationHistoryDetail(tipo,id,query){
  window.convocatoriaCalls.push({type:'detail',id,...query});
  return {event:events.find(event=>event.id===id),registros:[{nombre:'Persona de esta convocatoria',
    documento_identidad:'TEST-1',correo:'docente@example.invalid',periodo:query.periodoCarga,
    resultado:'SIN_CAMBIOS',fila:2}],total:1,page:1,limit:25,pages:1,detalleCompleto:true,accesoCompleto:true};
}
export async function downloadBancoDocentesBulkSupport(){throw Error('Not requested');}
`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';
import{BancoDocentesBulkUpload}from'/apps/mfe-pta/src/components/pta/banco-docentes/BancoDocentesBulkUpload.tsx';
import{RundRegistrationHistory}from'/apps/mfe-pta/src/components/pta/banco-docentes/RundRegistrationHistory.tsx';
import'/apps/mfe-pta/src/index.css';
function App(){const[periodo,setPeriodo]=React.useState('2026-2'),[history,setHistory]=React.useState(false);
return React.createElement('main',{style:{maxWidth:1300,margin:'auto',padding:16}},
React.createElement('nav',{style:{display:'flex',gap:16,marginBottom:20}},
React.createElement('select',{'aria-label':'Período',value:periodo,onChange:e=>setPeriodo(e.target.value)},
...['2026-2','2025-2'].map(p=>React.createElement('option',{key:p,value:p},p))),
React.createElement('button',{onClick:()=>setHistory(false)},'Carga masiva'),
React.createElement('button',{onClick:()=>setHistory(true)},'Trazabilidad')),
history?React.createElement(RundRegistrationHistory,{key:periodo,periodoCarga:periodo}):
React.createElement(BancoDocentesBulkUpload,{periodoSeleccionado:periodo,onBack:()=>{},onSuccess:()=>setHistory(true)}));}
createRoot(document.getElementById('root')).render(React.createElement(App));`;
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'convocatoria-fixture', enforce: 'pre',
  resolveId(source) {
    if (source.endsWith('services/api/ptaApi')) return '\0convocatoria-api';
    if (source === '/convocatoria-entry.js') return '\0convocatoria-entry';
  },
  load(id) { if (id === '\0convocatoria-api') return fixture; if (id === '\0convocatoria-entry') return entry; },
  configureServer(dev) { dev.middlewares.use('/convocatoria-fixture', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.end(await dev.transformIndexHtml('/convocatoria-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f6f8fc;font-family:Arial,sans-serif}button,input,select{font-family:inherit}</style></head><body><div id="root"></div><script type="module" src="/convocatoria-entry.js"></script></body></html>'));
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
  page.setDefaultTimeout(30000); page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()) ? request.continue() : request.abort());
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(origin + '/convocatoria-fixture', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[role="combobox"]');
  const artifacts = path.join(root, '.local/rund-convocatorias'); await fs.mkdir(artifacts, { recursive: true });
  await page.type('input[role="combobox"]', 'publica');
  await page.waitForSelector('button[role="option"]');
  await page.screenshot({ path: path.join(artifacts, 'carga-escritorio.png'), fullPage: true });
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  assert.equal(await page.$eval('input[role="combobox"]', element => element.value), 'Convocatoria Pública');
  // A CSV is enough for the real file-selection/validation UI; the API is mocked.
  const csv = path.join(artifacts, 'docentes.csv'); await fs.writeFile(csv, 'DOCUMENTO_IDENTIDAD,NOMBRE_COMPLETO\nTEST-1,Persona de prueba\n');
  await (await page.$('input[type="file"]')).uploadFile(csv);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.includes('Asociar a convocatoria')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button => button.textContent.includes('Asociar a convocatoria')).click());
  await page.waitForSelector('.rund-trace');
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__card').length === 3);
  assert(await page.$eval('.rund-trace__card', element => element.textContent.includes('Convocatoria Pública')));
  const calls = await page.evaluate(() => window.convocatoriaCalls.filter(call => call.type === 'upload'));
  assert.deepEqual(calls.map(call => [call.dryRun, call.periodo, call.convocatoria]), [[true,'2026-2','Convocatoria Pública'],[false,'2026-2','Convocatoria Pública']]);
  await page.type('input[role="combobox"]', 'publica');
  await page.waitForFunction(() => [...document.querySelectorAll('button[role="option"]')].some(button => button.textContent === 'Convocatoria Pública'));
  await page.evaluate(() => [...document.querySelectorAll('button[role="option"]')].find(button => button.textContent === 'Convocatoria Pública').click());
  await page.waitForFunction(() => window.convocatoriaCalls.some(call => call.type==='history' && call.convocatoria==='Convocatoria Pública'));
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__card').length === 1);
  assert(await page.$eval('.rund-trace__card', element => element.textContent.includes('docentes.xlsx') && !element.textContent.includes('otra-carga.xlsx')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(button=>button.textContent.includes('Ver personas')).click());
  await page.waitForSelector('.rund-trace__detail tbody tr');
  assert(await page.$eval('.rund-trace__detail', element => element.textContent.includes('Persona de esta convocatoria')));
  await page.click('button[aria-label="Limpiar convocatoria"]');
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__card').length === 3);
  await page.type('input[role="combobox"]', 'otra');
  await page.waitForFunction(() => [...document.querySelectorAll('button[role="option"]')].some(button => button.textContent==='Otra convocatoria'));
  await page.evaluate(() => [...document.querySelectorAll('button[role="option"]')].find(button => button.textContent==='Otra convocatoria').click());
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__card').length === 1 && document.querySelector('.rund-trace__card').textContent.includes('otra-carga.xlsx'));
  await page.click('button[aria-label="Limpiar convocatoria"]');
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__card').length === 3);
  await page.type('input[aria-label="Buscar operación"]', 'PUBLICA');
  await page.waitForFunction(() => document.querySelectorAll('.rund-trace__card').length === 1 && document.querySelector('.rund-trace__card').textContent.includes('docentes.xlsx'));
  await page.setViewport({ width: 360, height: 900 });
  await page.click('input[role="combobox"]');
  await new Promise(resolve => setTimeout(resolve, 400));
  await page.screenshot({ path: path.join(artifacts, 'trazabilidad-movil.png'), fullPage: true });
  assert(await page.$eval('.rund-convocatoria', element => element.getBoundingClientRect().right <= window.innerWidth));
  assert(await page.$eval('.rund-trace__header', element => element.getBoundingClientRect().bottom >= element.lastElementChild.getBoundingClientRect().bottom), 'El encabezado debe contener el período en móvil');
  await page.select('select[aria-label="Período"]', '2025-2');
  await page.waitForFunction(() => document.querySelector('.rund-trace__empty'));
  assert.equal(await page.$eval('input[role="combobox"]', element => element.value), '');
  await page.evaluate(() => [...document.querySelectorAll('nav button')].find(button => button.textContent==='Carga masiva').click());
  await page.type('input[role="combobox"]', 'Primera convocatoria del período');
  await new Promise(resolve => setTimeout(resolve, 400));
  await page.screenshot({ path: path.join(artifacts, 'carga-movil.png'), fullPage: true });
  assert(await page.$eval('.rund-convocatoria', element => element.getBoundingClientRect().right <= window.innerWidth));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ success: true, syntheticDataOnly: true, checks: ['Búsqueda con tildes y teclado','Asociación de registros sin cambios','Filtrado real entre dos convocatorias y carga anterior','Detalle de la convocatoria elegida','Limpieza de filtros y búsqueda libre','Períodos aislados','Escritorio y móvil de 360 px'], artifacts }));
} finally { await browser?.close(); await server.close(); }
