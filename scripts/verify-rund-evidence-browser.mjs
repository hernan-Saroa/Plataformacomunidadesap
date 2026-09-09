// Isolated browser fixture: real components, simulated API, no user accounts or business writes.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const panel = '/apps/mfe-pta/src/components/pta/banco-docentes/RundValidationPanel.tsx';
const apiSource = `
const names = ['IDENTIDAD','CONTACTO','FORMACION','VINCULACION','ACADEMICO','TRANSVERSAL'];
const support = {id:'soporte-1',tipo_soporte:'documento_identidad',documento_perfil_id:'version-1',documento_carpeta_id:'/pta/prueba.pdf',nombre_archivo:'identidad-prueba.pdf',estado:'Pendiente'};
Object.assign(support, JSON.parse(sessionStorage.getItem('review-fixture') || '{}'));
const blocks = names.map(bloque=>({bloque,version:1,estado:bloque==='CONTACTO'?'Pendiente':'Soporte faltante',soportes:bloque==='IDENTIDAD'?[support]:[]}));
blocks[0].estado='En revisión';
const logs=[{id:'log-1',accion:'CARGAR_DOCUMENTO',bloque:'IDENTIDAD',actorId:'Gestor de prueba',createdAt:new Date().toISOString(),metadata:{nombreArchivo:'identidad-prueba.pdf',version:1}}];
window.fixtureCalls=[];
export const apiClient={
get:async url=>{
 if(url.includes('/auditoria')) return structuredClone(logs);
 if(url.includes('/documentos/categorias')) return [{codigo:'IDENTIDAD',nombre:'Identidad'}];
 if(url.includes('/documentos')) return [{id:'version-1',categoria:'IDENTIDAD',categoriaNombre:'Identidad',tipoSoporte:'documento_identidad',version:1,totalVersiones:1,nombreArchivo:'identidad-prueba.pdf',tamanoBytes:240000,estado:'ACTIVO',estadoRevision:support.estado,creadoPor:'Gestor de prueba',creadoEn:new Date().toISOString(),contenidoUrl:'/pta/prueba.pdf'}];
 if(url.includes('/bloques')) return structuredClone(blocks);
 return {docenteId:'docente-prueba',idRund:'RUND-PRUEBA',periodoCarga:'2026-2',proteccion_datos:{acceso_completo:true},bloques:{IDENTIDAD:{campos:[{campo:'TIPO_DOCUMENTO',valor:'CC'},{campo:'DOCUMENTO_IDENTIDAD',valor:'Documento de prueba'},{campo:'NOMBRE_COMPLETO',valor:'DOCENTE DE PRUEBA'},{campo:'GENERO',valor:'F'},{campo:'SEXO_BIOLOGICO',valor:'Mujer'},{campo:'FECHA_NACIMIENTO',valor:'1985-05-12'}]}}};
},
post:async(url,body)=>{
 window.fixtureCalls.push({url,body});
 if(url.endsWith('/revision')){support.revisiones_campos={...support.revisiones_campos,[body.campo]:{estado:body.estado,observacion:body.observacion,documentoVersionId:body.documentoVersionId}};const decisions=Object.values(support.revisiones_campos);support.estado=decisions.some(d=>d.estado==='Rechazado')?'Rechazado':decisions.length===5?'Aprobado':'Pendiente';sessionStorage.setItem('review-fixture',JSON.stringify(support));blocks[0].estado=body.estado==='Rechazado'?'Devuelto':'En revisión';logs.unshift({id:String(logs.length+1),accion:body.estado==='Aprobado'?'APROBAR_SOPORTE':'DEVOLVER_SOPORTE',bloque:'IDENTIDAD',actorId:'Revisor de prueba',createdAt:new Date().toISOString(),observacion:body.observacion,metadata:{nombreArchivo:support.nombre_archivo}});}
 if(url.endsWith('/aprobar')){blocks[0].estado='Aprobado';blocks[0].fecha_revision=new Date().toISOString();}
 return {success:true};
},getBlob:async()=>new Blob(['%PDF-1.7\\n%%EOF'],{type:'application/pdf'})};`;
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [
  { name: 'evidence-fixture', enforce: 'pre',
    resolveId(source) {
      if (source.endsWith('/services/api')) return '\0fixture-api';
      if (source.endsWith('/contexts/AuthContext')) return '\0fixture-auth';
      if (source === './BancoDocenteEditModal') return '\0fixture-edit';
      if (source === '/fixture-entry.js') return '\0fixture-entry';
    },
    load(id) {
      if (id === '\0fixture-api') return apiSource;
      if (id === '\0fixture-auth') return `const auth={userRole:'SUPER_ADMIN',isSuperUser:true,hasAnyPermission:()=>true};export const useAuth=()=>auth;`;
      if (id === '\0fixture-edit') return 'export const BancoDocenteEditModal=()=>null;';
      if (id === '\0fixture-entry') return `import React from 'react';import {createRoot} from 'react-dom/client';import {RundValidationPanel} from '${panel}';createRoot(document.getElementById('root')).render(React.createElement(RundValidationPanel,{docenteId:'docente-prueba'}));`;
    },
    configureServer(dev) { dev.middlewares.use('/evidence-fixture', async (_req,res) => {
      const html = await dev.transformIndexHtml('/evidence-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#F1F5F9;margin:24px}button,input,textarea,select{font-family:inherit}button:disabled{opacity:.45;cursor:not-allowed}</style></head><body><div id="root"></div><script type="module" src="/fixture-entry.js"></script></body></html>');
      res.setHeader('Content-Type','text/html');res.end(html);
    }); },
  }, react(),
] });
let browser;
try {
  await server.listen();
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/evidence-fixture`);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Aprobar'));
  const click = text => page.evaluate(label => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === label); if (!button || button.disabled) throw new Error('Button unavailable: '+label); button.click(); }, text);
  await click('Devolver');
  await page.waitForSelector('#support-return-reason');
  assert(await page.$eval('[role="dialog"] button:last-child', b => b.disabled));
  await page.type('#support-return-reason','El archivo no corresponde a la información registrada. Adjunte el soporte correcto.');
  await click('Confirmar devolución');
  await page.waitForFunction(() => document.body.textContent.includes('El archivo no corresponde'));
  const artifactDir = path.join(root, '.local/rund-row-review-preview');
  await fs.mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir,'devuelto.png'), fullPage: true });
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Aprobar').length), 4);
  // Start a fresh approval fixture, then verify persistence across reload.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Aprobar'));
  await click('Aprobar');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Aprobar').length === 4);
  assert(await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Aprobar bloque').disabled));
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Aprobar').length === 4);
  for (let remaining = 4; remaining > 0; remaining--) {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Aprobar' && !b.disabled));
    await click('Aprobar');
    await page.waitForFunction(count => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Aprobar').length === count, {}, remaining - 1);
  }
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Aprobar bloque' && !b.disabled));
  await click('Aprobar bloque');
  await page.waitForFunction(() => document.body.textContent.includes('Espacio aprobado'));
  await page.screenshot({ path: path.join(artifactDir,'aprobado.png'), fullPage: true });
  await click('Ver trazabilidad de revisiones y documentos');
  await page.waitForFunction(() => document.body.textContent.includes('APROBAR SOPORTE'));
  assert.deepEqual(errors, []);
  const calls = await page.evaluate(() => window.fixtureCalls);
  assert(calls.some(c => c.url.endsWith('/revision') && c.body.documentoVersionId === 'version-1' && c.body.blockVersion === 1));
  console.log(JSON.stringify({ success: true, browser: await browser.version(), simulatedAPI: true, businessDataModified: false, checks: ['Una sola fila por clic', 'Persistencia al recargar', 'Bloque pendiente hasta revisar las cinco filas', 'Motivo obligatorio', 'Devolución visible', 'Aprobación documental persistida vía API', 'Espacio aprobado en verde', 'Historial visible'], screenshots: artifactDir }, null, 2));
} finally { if (browser) await browser.close(); await server.close(); }
