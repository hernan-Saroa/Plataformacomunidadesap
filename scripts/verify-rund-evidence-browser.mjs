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
const dataFields={IDENTIDAD:['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO'],CONTACTO:['CORREO_INSTITUCIONAL','CORREO_ALTERNATIVO','TELEFONO'],FORMACION:['diploma_pregrado','diploma_especializacion','diploma_maestria','diploma_doctorado','certificado_posdoctoral','convalidacion_men','hoja_vida_pro'],VINCULACION:['acto_administrativo_vinculacion','resolucion_convocatoria','ACTO_ADMINISTRATIVO','FECHAS_VINCULACION','DEDICACION','HORAS_PTA','acto_administrativo_situacion','acto_adscripcion_territorial','resolucion_escalafon','resolucion_puntaje_salarial'],ACADEMICO:['acto_asignacion_nucleo','certificacion_investigacion','acta_evaluacion_desempeno'],TRANSVERSAL:['OBSERVACIONES','autorizacion_habeas_data']};
const savedData=JSON.parse(sessionStorage.getItem('data-review-fixture')||'{}');
const emptyMode=new URLSearchParams(location.search).has('empty');
const multipleMode=new URLSearchParams(location.search).has('multiple');
const support = {id:'soporte-1',tipo_soporte:'documento_identidad',documento_perfil_id:'version-1',documento_carpeta_id:'/pta/prueba.pdf',nombre_archivo:'identidad-prueba.pdf',estado:'Pendiente'};
Object.assign(support, JSON.parse(sessionStorage.getItem('review-fixture') || '{}'));
const blocks = names.map(bloque=>({bloque,version:1,estado:bloque==='CONTACTO'?'Pendiente':emptyMode?'Soporte faltante':'Aprobado',soportes:bloque==='IDENTIDAD'&&!emptyMode?[support]:[]}));
if(multipleMode)for(const block of blocks){
 const type={IDENTIDAD:'documento_identidad',FORMACION:'diploma_pregrado',VINCULACION:'contrato',ACADEMICO:'acto_asignacion_nucleo',TRANSVERSAL:'autorizacion_habeas_data'}[block.bloque];
 block.estado='En revisión';block.soportes=type?[1,2].map(n=>({...support,id:block.bloque+n,tipo_soporte:type,documento_perfil_id:block.bloque+n,nombre_archivo:'soporte-de-prueba-con-un-nombre-muy-largo-'+block.bloque+'-'+n+'.pdf',estado:'Pendiente',revisiones_campos:{}})):[];
}
blocks[0].estado=emptyMode?'Soporte faltante':'En revisión';
const logs=JSON.parse(sessionStorage.getItem('review-logs')||'null')||[{id:'log-1',accion:'CARGAR_DOCUMENTO',bloque:'IDENTIDAD',actorId:'Gestor de prueba',createdAt:new Date().toISOString(),metadata:{nombreArchivo:'identidad-prueba.pdf',version:1}}];
window.fixtureCalls=[];
export const apiClient={
get:async url=>{
 if(url.includes('/fotos-perfil'))return {personaId:'persona-ficticia',publicada:null,solicitud:null,historial:[]};
 if(url.includes('/extracciones'))return {enabled:!emptyMode,documents:[],jobs:emptyMode?[]:[{id:'ocr-opcional',bloque:'IDENTIDAD',documento_id:'version-1',documento_estado:'ACTIVO',nombre_archivo:'identidad-prueba.pdf',version:1,estado:'COMPLETADO',sugerencias:[{id:'propuesta-opcional',campo:'nombreCompleto',label:'Nombre completo',valor:'OTRO NOMBRE DE PRUEBA',valor_previo:'DOCENTE DE PRUEBA',pagina:1,evidencia:'NOMBRES OTRO NOMBRE DE PRUEBA',estado:'PENDIENTE',baja_confianza:true}]}]};
 if(url.includes('/auditoria')) return structuredClone(logs);
 if(url.includes('/documentos/categorias')) return [{codigo:'IDENTIDAD',nombre:'Identidad'}];
 if(url.includes('/documentos')) return emptyMode?[]:[{id:'version-1',categoria:'IDENTIDAD',categoriaNombre:'Identidad',tipoSoporte:'documento_identidad',version:1,totalVersiones:1,nombreArchivo:'identidad-prueba.pdf',tamanoBytes:240000,estado:'ACTIVO',estadoRevision:support.estado,creadoPor:'Gestor de prueba',creadoEn:new Date().toISOString(),contenidoUrl:'/pta/prueba.pdf'}];
 if(url.includes('/bloques')) return structuredClone(blocks.map(block=>({...block,revisionDatos:Object.fromEntries(dataFields[block.bloque].map(campo=>[campo,{campo,huella:block.bloque+':'+campo,requiereRevision:block.bloque!=='CONTACTO'&&campo!=='OBSERVACIONES',puedeValidar:true,estado:savedData[block.bloque+':'+campo]?.estado||(block.estado==='Aprobado'?'Aprobado':'Pendiente'),observacion:savedData[block.bloque+':'+campo]?.observacion}]))})));
 return {docenteId:'docente-prueba',idRund:'RUND-PRUEBA',periodoCarga:'2026-2',proteccion_datos:{acceso_completo:true},bloques:{IDENTIDAD:{campos:[{campo:'TIPO_DOCUMENTO',valor:'CC'},{campo:'DOCUMENTO_IDENTIDAD',valor:'Documento de prueba'},{campo:'NOMBRE_COMPLETO',valor:'DOCENTE DE PRUEBA'},{campo:'GENERO',valor:'F'},{campo:'SEXO_BIOLOGICO',valor:'Mujer'},{campo:'FECHA_NACIMIENTO',valor:'1985-05-12'}]}}};
},
post:async(url,body)=>{
 window.fixtureCalls.push({url,body});
 if(url.includes('/datos/')){const parts=url.split('/');const campo=parts.at(-2),bloque=parts.at(-4);savedData[bloque+':'+campo]=body;sessionStorage.setItem('data-review-fixture',JSON.stringify(savedData));blocks.find(b=>b.bloque===bloque).estado=body.estado==='Rechazado'?'Devuelto':'En revisión';return {success:true};}
 if(url.endsWith('/revision')){const fields=body.alcance==='documento'?['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO']:[body.campo];support.revisiones_campos={...support.revisiones_campos,...Object.fromEntries(fields.map(field=>[field,{estado:body.estado,observacion:body.observacion,documentoVersionId:body.documentoVersionId}]))};const decisions=Object.values(support.revisiones_campos);support.estado=decisions.some(d=>d.estado==='Rechazado')?'Rechazado':decisions.length===5?'Aprobado':'Pendiente';sessionStorage.setItem('review-fixture',JSON.stringify(support));blocks[0].estado=body.estado==='Rechazado'?'Devuelto':'En revisión';logs.unshift({id:String(logs.length+1),accion:body.estado==='Aprobado'?'APROBAR_SOPORTE':'DEVOLVER_SOPORTE',bloque:'IDENTIDAD',actorId:'Revisor de prueba',createdAt:new Date().toISOString(),observacion:body.observacion,metadata:{nombreArchivo:support.nombre_archivo}});}
 if(url.endsWith('/aprobar')){blocks[0].estado='Aprobado';blocks[0].fecha_revision=new Date().toISOString();}
 sessionStorage.setItem('review-logs',JSON.stringify(logs));return {success:true};
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
      const html = await dev.transformIndexHtml('/evidence-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#F1F5F9;margin:24px}button,input,textarea,select{font-family:inherit}button:disabled{opacity:.45;cursor:not-allowed}</style></head><body><div id="root"></div><script type="module" src="/fixture-entry.js"></script></body></html>');
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
  page.on('pageerror', e => { errors.push(e.message); console.error('Fixture page error:', e.message); });
  page.on('console', message => { if(message.type()==='error')console.error('Fixture console:',message.text()); });
  page.setDefaultTimeout(60000);
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()) ? request.continue() : request.abort());
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 });
  await page.goto(`${origin}/evidence-fixture`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Validar soporte'));
  const click = text => page.evaluate(label => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === label); if (!button || button.disabled) throw new Error('Button unavailable: '+label); button.click(); }, text);
  await click('Devolver soporte');
  await page.waitForSelector('#support-return-reason');
  assert(await page.$eval('[role="dialog"] button:last-child', b => b.disabled));
  await page.type('#support-return-reason','El archivo no corresponde a la información registrada. Adjunte el soporte correcto.');
  await click('Confirmar devolución');
  await page.waitForFunction(() => document.body.textContent.includes('El archivo no corresponde'));
  const artifactDir = path.join(root, '.local/rund-row-review-preview');
  await fs.mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir,'devuelto.png'), fullPage: true });
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Validar soporte').length), 0);
  // Start a fresh approval fixture, then verify persistence across reload.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Validar soporte'));
  await click('Validar soporte');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Validar soporte').length === 0);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Aprobar bloque').disabled),true);
  // Admitting one identity document never approves its five independent data checks.
  for(let remaining=5;remaining>0;remaining--){
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Validar dato'&&!b.disabled).length),remaining);
    await click('Validar dato');
    await page.waitForFunction(count=>[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Validar dato'&&!b.disabled).length===count,{},remaining-1);
  }
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Aprobar bloque'&&!b.disabled));
  const reviewCall=await page.evaluate(()=>window.fixtureCalls.find(call=>call.url.endsWith('/revision')));
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Validar soporte').length === 0);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Aprobar bloque' && !b.disabled));
  await click('Aprobar bloque');
  await page.waitForFunction(() => document.body.textContent.includes('Espacio aprobado'));
  assert(await page.evaluate(()=>document.body.textContent.includes('Opcional')));
  assert.equal(await page.evaluate(()=>document.body.textContent.includes('antes de aprobar el bloque.')),false);
  await page.screenshot({ path: path.join(artifactDir,'aprobado.png'), fullPage: true });
  await page.waitForFunction(() => [...document.querySelectorAll('[role=status]')].some(el => el.textContent === 'Perfil RUND aprobado'));
  assert(await page.evaluate(() => document.body.textContent.includes('5 / 5')));
  assert(await page.evaluate(() => document.body.textContent.includes('Contacto no requiere soporte documental.')));
  await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].find(tab => tab.textContent.includes('Contacto')).click());
  await page.waitForFunction(() => document.querySelector('[role=tab][aria-selected=true]').textContent.includes('Contacto'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Validar soporte').length), 0);
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Aprobar bloque').disabled), false);
  await page.screenshot({ path: path.join(artifactDir,'contacto-sin-soporte.png'), fullPage: true });
  await page.evaluate(() => [...document.querySelectorAll('[role=tab]')].find(tab => tab.textContent.includes('Identidad')).click());

  await click('Ver trazabilidad de revisiones y documentos');
  await page.waitForFunction(() => document.body.textContent.includes('APROBAR SOPORTE'));
  assert.deepEqual(errors, []);
  const calls = await page.evaluate(() => window.fixtureCalls);
  assert(reviewCall.body.documentoVersionId==='version-1'&&reviewCall.body.blockVersion===1&&reviewCall.body.alcance==='documento');
  assert.equal(calls.some(c=>/sugerencias.*(confirmar|descartar)/.test(c.url)),false);
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(`${origin}/evidence-fixture?empty=1`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[role="tab"]');
  for(const label of ['Identidad','Contacto','Formación Académica','Vinculación','Académico','Transversal']) {
    await page.evaluate(label=>[...document.querySelectorAll('[role="tab"]')].find(tab=>tab.textContent.includes(label)).click(),label);
    await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Devolver bloque'));
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Devolver bloque').disabled),label!=='Contacto',label);
  }
  assert.equal((await page.evaluate(()=>window.fixtureCalls)).length,0);
  await page.evaluate(()=>[...document.querySelectorAll('[role="tab"]')].find(tab=>tab.textContent.includes('Identidad')).click());
  await page.waitForFunction(()=>document.querySelector('[role="tab"][aria-selected=true]').textContent.includes('Identidad'));
  for(let remaining=5;remaining>0;remaining--){
    await click('Validar dato');
    await page.waitForFunction(count=>[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='Validar dato'&&!b.disabled).length===count,{},remaining-1);
  }
  await click('Aprobar bloque');
  await page.waitForFunction(()=>document.body.textContent.includes('Espacio aprobado'));
  const withoutFiles=await page.evaluate(()=>window.fixtureCalls);
  assert.equal(withoutFiles.filter(call=>call.url.includes('/datos/')).length,5);
  assert.equal(withoutFiles.some(call=>call.url.includes('/soportes/')),false);
  await page.screenshot({path:path.join(artifactDir,'aprobado-sin-soportes.png'),fullPage:true});
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto(`${origin}/evidence-fixture?multiple=1`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.rund-support-review');
  for(const width of [320,390,768,1024,1500]){
    await page.setViewport({width,height:900});
    for(const label of ['Identidad','Contacto','Formación Académica','Vinculación','Académico','Transversal']){
      await page.evaluate(label=>[...document.querySelectorAll('[role=tab]')].find(tab=>tab.textContent.includes(label)).click(),label);
      await page.waitForFunction(label=>document.querySelector('[role=tab][aria-selected=true]').textContent.includes(label),{},label);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Desbordamiento: ${label} a ${width}px`);
      assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.rund-checkpoint-grid button')].filter(b=>/^(Validar soporte|Devolver soporte)$/.test(b.textContent.trim())).length),0);
      assert(await page.evaluate(()=>{
        const grid=document.querySelector('.rund-checkpoint-grid').getBoundingClientRect();
        const rows=[...document.querySelectorAll('.rund-checkpoint-row')].map(row=>row.getBoundingClientRect());
        return rows.every((row,index)=>Math.abs(row.width-grid.width)<2&&(!index||row.top>=rows[index-1].bottom));
      }),`Las filas deben ocupar el ancho y quedar una debajo de otra: ${label}, ${width}px`);
      assert.equal(await page.evaluate(()=>document.querySelectorAll('.rund-checkpoint-evidence__item').length),label==='Contacto'?0:2);
      if(label==='Identidad')await page.screenshot({path:path.join(artifactDir,`soportes-${width}.png`),fullPage:true});
    }
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ success: true, browser: await browser.version(), simulatedAPI: true, businessDataModified: false, checks: ['Una revisión por documento compartido', 'Persistencia al recargar', 'Aprobación de bloque independiente del OCR', 'Motivo obligatorio', 'Devolución visible', 'Contacto sin soporte', 'Historial visible','Seis pestañas con varios soportes a 320, 390, 768, 1024 y 1500px'], screenshots: artifactDir }, null, 2));
} finally { if (browser) await browser.close(); await server.close(); }
