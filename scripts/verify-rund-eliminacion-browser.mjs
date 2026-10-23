// Real list, modal, auth and API adapter. Only synthetic in-memory mutations.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureApi = `
const records=Array.from({length:54},(_,i)=>({id:'11111111-1111-4111-8111-'+String(i+1).padStart(12,'0'),
 nombre_completo:'Docente ficticio '+String(i+1).padStart(3,'0'),documento_identidad:'TEST-'+i,
 periodo_carga:i<53?'2026-2':'2025-2',estado:'ACTIVO',dedicacion_codigo:'TC',horas_programables:800}));
window.deletionRequests=[];window.previewRequests=[];
const filtered=q=>records.filter(r=>!r.removed&&(!q.periodoCarga||r.periodo_carga===q.periodoCarga)&&(!q.search||r.nombre_completo.includes(q.search)));
export const apiClient={get:async(url,params)=>{
 const parsed=new URL(url,'http://fixture.invalid');const q={...Object.fromEntries(parsed.searchParams),...params};
 if(url.includes('periodos-academicos'))return [{codigo:'2026-2',estado:'en_curso'},{codigo:'2025-2',estado:'cerrado'}];
 if(url.includes('/catalogos/territoriales'))return [];const rows=filtered(q);
 if(parsed.pathname.endsWith('/stats'))return {total:rows.length,tiempo_completo:rows.length,medio_tiempo:0,total_territoriales:0};
 if(parsed.pathname.endsWith('/banco-docentes'))return {items:rows.slice(((q.page||1)-1)*50,(q.page||1)*50),total:rows.length,page:q.page||1,pages:Math.ceil(rows.length/50)};
 return [];
},post:async(url,body)=>{
 if(url.endsWith('/eliminacion/previsualizar')){window.previewRequests.push(body);const rows=body.ids?records.filter(r=>!r.removed&&body.ids.includes(r.id)):filtered(body.filters).filter(r=>!(body.excluirIds||[]).includes(r.id));
 return {success:true,data:{ids:rows.map(r=>r.id),fingerprint:'a'.repeat(64),total:rows.length,registros:rows}};}
 if(url.endsWith('/eliminacion/confirmar')){window.deletionRequests.push(body);if(!body.confirmado)throw Error('Missing confirmation');
 records.forEach(r=>{if(body.ids.includes(r.id))r.removed=true});return {success:true,data:{eliminados:body.ids.length}};}
 throw Error('Unexpected mutation');
}};`;
const entry = `import React from'react';import{createRoot}from'react-dom/client';import{AuthProvider}from'/apps/mfe-pta/src/contexts/AuthContext.tsx';import{BancoDocentesPTA}from'/apps/mfe-pta/src/components/pta/banco-docentes/BancoDocentesPTA.tsx';const profile=new URLSearchParams(location.search).get('profile')||'carga';createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,{permisos:['banco-docentes.rund.'+profile]},React.createElement(BancoDocentesPTA)));`;
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'rund-delete-fixture', enforce: 'pre', resolveId(source) { if (source.endsWith('shell/src/services/api')) return '\0delete-api'; if (source === '/delete-entry.js') return '\0delete-entry'; },
  load(id) { if (id === '\0delete-api') return fixtureApi; if (id === '\0delete-entry') return entry; },
  configureServer(dev) { dev.middlewares.use('/delete-fixture', async (_req, res) => {
    res.setHeader('Content-Type', 'text/html'); res.end(await dev.transformIndexHtml('/delete-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f8fafc;font-family:Arial,sans-serif}button,input,select{font-family:inherit}</style></head><body><div id="root"></div><script type="module" src="/delete-entry.js"></script></body></html>'));
  }); },
}, react()], resolve: { alias: [
  { find: '@esap-mfe/shared-ui', replacement: path.join(root, 'packages/shared-ui/src') },
  { find: '@esap-mfe/shared-hooks', replacement: path.join(root, 'packages/shared-hooks/src') },
  { find: '@esap-mfe/shared-types', replacement: path.join(root, 'packages/shared-types/src') },
] } });
let browser;
try {
  await server.listen(); browser = await puppeteer.launch({ headless: true }); const page = await browser.newPage(), errors = [], nativeDialogs = [];
  page.setDefaultTimeout(40000); page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', async dialog => { nativeDialogs.push(dialog.type()); await dialog.dismiss(); });
  const origin = 'http://127.0.0.1:' + server.httpServer.address().port;
  await page.setRequestInterception(true); page.on('request', request => request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()) ? request.continue() : request.abort());
  const click = text => page.evaluate(text => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text); if (button && !button.disabled) button.click(); }, text);
  const loaded = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === '2026-2') && document.querySelector('input[aria-label="Seleccionar docentes de esta página"]:not(:disabled)'));
  await page.setViewport({ width: 1440, height: 1050 }); await page.goto(origin + '/delete-fixture', { waitUntil: 'domcontentloaded' }); await loaded();
  await page.click('[title="Eliminar de RUND"]'); await page.waitForSelector('[role="dialog"] .rund-delete-records li');
  assert.equal(await page.$$eval('.rund-delete-records li', rows => rows.length), 1);
  await click('Cancelar'); assert.equal(await page.evaluate(() => window.deletionRequests.length), 0);
  await page.click('[aria-label="Seleccionar docentes de esta página"]'); await click('Seleccionar todos los resultados (53)');
  await page.click('[aria-label="Seleccionar a Docente ficticio 001"]');
  await click('Eliminar seleccionados (52)'); await page.waitForSelector('[role="dialog"] .rund-delete-records li');
  assert.equal(await page.$$eval('.rund-delete-records li', rows => rows.length), 52);
  assert.equal(await page.$eval('.rund-delete-confirm', node => node.disabled), true);
  const artifacts = path.join(root, '.local/rund-eliminacion'); await fs.mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, 'confirmacion-escritorio.png'), fullPage: true });
  for (const width of [360, 430, 768, 1440]) {
    await page.setViewport({ width, height: 900 });
    const fit = await page.$eval('.rund-delete-modal', node => { const box = node.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight && node.scrollWidth <= node.clientWidth + 1; });
    assert(fit, 'Confirmation must fit viewport at ' + width);
  }
  await page.setViewport({ width: 430, height: 900 }); await page.screenshot({ path: path.join(artifacts, 'confirmacion-movil.png'), fullPage: true });
  await page.type('#rund-delete-reason', 'Registros ficticios para probar la eliminación'); await page.click('.rund-delete-accept input');
  await click('Eliminar 52 registros'); await page.waitForFunction(() => !document.querySelector('[role="dialog"]') && document.querySelectorAll('[title="Eliminar de RUND"]').length === 1);
  assert.equal(await page.evaluate(() => window.deletionRequests[0].ids.length), 52);
  await page.setViewport({ width: 1440, height: 1000 }); await page.click('[title="Eliminar de RUND"]'); await page.waitForSelector('.rund-delete-records li');
  await page.type('#rund-delete-reason', 'Último registro ficticio de prueba'); await page.click('.rund-delete-accept input'); await click('Eliminar 1 registro');
  await page.waitForFunction(() => document.body.textContent.includes('No hay docentes registrados') && !document.querySelector('[role="dialog"]'));
  await click('2026-2'); await click('2025-2'); await page.waitForFunction(() => document.body.textContent.includes('Docente ficticio 054'));
  for (const profile of ['revision', 'incorporacion']) {
    await page.goto(origin + '/delete-fixture?profile=' + profile, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.textContent.includes('Docente ficticio 001'));
    assert.equal(await page.$('[title="Eliminar de RUND"]'), null); assert.equal(await page.$('[aria-label="Seleccionar docentes de esta página"]'), null);
  }
  assert.deepEqual(errors, []); assert.deepEqual(nativeDialogs, []);
  console.log('RUND navegador: eliminación individual y de 52 registros entre páginas, exclusión de una fila, cancelación, confirmación y motivo obligatorios, actualización, aislamiento por periodo, perfiles y modal responsive 360–1440px. Sin datos reales.');
} finally { await browser?.close(); await server.close(); }
