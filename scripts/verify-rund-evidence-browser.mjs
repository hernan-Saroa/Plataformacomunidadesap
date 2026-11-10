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
const designMode=new URLSearchParams(location.search).has('design');
const multipleMode=new URLSearchParams(location.search).has('multiple');
const mixedMode=new URLSearchParams(location.search).has('mixed');
const support = {id:'soporte-1',tipo_soporte:'documento_identidad',documento_perfil_id:'version-1',documento_carpeta_id:'/pta/prueba.pdf',nombre_archivo:'identidad-prueba.pdf',estado:'Pendiente'};
Object.assign(support, JSON.parse(sessionStorage.getItem('review-fixture') || '{}'));
const blocks = names.map(bloque=>({bloque,version:1,estado:bloque==='CONTACTO'?'Pendiente':emptyMode?'Soporte faltante':'Aprobado',soportes:bloque==='IDENTIDAD'&&!emptyMode?[support]:[]}));
if(multipleMode)for(const block of blocks){
 const type={IDENTIDAD:'documento_identidad',FORMACION:'diploma_pregrado',VINCULACION:'contrato',ACADEMICO:'acto_asignacion_nucleo',TRANSVERSAL:'autorizacion_habeas_data'}[block.bloque];
 block.estado='En revisión';block.soportes=type?[1,2].map(n=>({...support,id:block.bloque+n,tipo_soporte:type,documento_perfil_id:block.bloque+n,documento_carpeta_id:'/pta/'+block.bloque+n+'.pdf',nombre_archivo:'soporte-de-prueba-con-un-nombre-muy-largo-'+block.bloque+'-'+n+'.pdf',estado:'Pendiente',revisiones_campos:{}})):[];
}
if(mixedMode){
 const formation=blocks.find(block=>block.bloque==='FORMACION');
 formation.estado='En revisión';
 formation.soportes=['diploma_pregrado','diploma_doctorado'].map((type,index)=>({...support,id:'formacion-mixta-'+index,tipo_soporte:type,
   documento_perfil_id:'formacion-version-'+index,documento_carpeta_id:'/pta/formacion-'+index+'.pdf',
   nombre_archivo:'soporte-de-formacion-'+index+'.pdf',estado:'Pendiente',revisiones_campos:{}}));
}
blocks[0].estado=emptyMode?'Soporte faltante':'En revisión';
const logs=JSON.parse(sessionStorage.getItem('review-logs')||'null')||[{id:'log-1',accion:'CARGAR_DOCUMENTO',bloque:'IDENTIDAD',actorId:'Gestor de prueba',createdAt:new Date().toISOString(),metadata:{nombreArchivo:'identidad-prueba.pdf',version:1}}];
window.fixtureCalls=[];
export const apiClient={
get:async url=>{
 if(url.includes('/fotos-perfil'))return {personaId:'persona-ficticia',publicada:null,solicitud:null,historial:[]};
 if(url.includes('/extracciones'))return {enabled:!emptyMode,documents:[],jobs:emptyMode?[]:[{id:'ocr-opcional',bloque:'IDENTIDAD',documento_id:'version-1',documento_estado:'ACTIVO',nombre_archivo:'identidad-prueba.pdf',version:1,estado:'COMPLETADO',sugerencias:[{id:'propuesta-opcional',campo:'nombreCompleto',label:'Nombre completo',valor:'OTRO NOMBRE DE PRUEBA',valor_previo:'DOCENTE DE PRUEBA',pagina:1,evidencia:'NOMBRES OTRO NOMBRE DE PRUEBA',estado:'PENDIENTE',baja_confianza:true}]}]};
 if(url.includes('/auditoria')) return structuredClone(logs);
 if(url.includes('/documentos/categorias')) return [{codigo:'IDENTIDAD',nombre:'Identidad'},{codigo:'TITULOS',nombre:'Títulos'},{codigo:'CONTRATOS',nombre:'Contratos'},{codigo:'CERTIFICADOS',nombre:'Certificados'},{codigo:'AUTORIZACIONES',nombre:'Autorizaciones'},{codigo:'OTROS',nombre:'Otros'}];
 if(url.includes('/documentos/configuracion')) return {habilitado:false};
 if(url.includes('/documentos')&&mixedMode)return blocks.flatMap(block=>block.soportes.map(s=>({id:s.documento_perfil_id,rundSoporteId:s.id,bloque:block.bloque,categoria:'TITULOS',categoriaNombre:'Títulos',tipoSoporte:s.tipo_soporte,version:1,totalVersiones:1,nombreArchivo:s.nombre_archivo,tamanoBytes:240000,estado:'ACTIVO',estadoRevision:s.estado,contenidoUrl:s.documento_carpeta_id})));
 if(url.includes('/documentos')) return emptyMode?[]:multipleMode?blocks.flatMap(block=>block.soportes.map(s=>({id:s.documento_perfil_id,rundSoporteId:s.id,bloque:block.bloque,categoria:'IDENTIDAD',categoriaNombre:block.bloque,tipoSoporte:s.tipo_soporte,version:1,totalVersiones:1,nombreArchivo:s.nombre_archivo,tamanoBytes:240000,estado:'ACTIVO',estadoRevision:s.estado,contenidoUrl:s.documento_carpeta_id}))):[{id:'version-1',rundSoporteId:'soporte-1',bloque:'IDENTIDAD',categoria:'IDENTIDAD',categoriaNombre:'Identidad',tipoSoporte:'documento_identidad',version:1,totalVersiones:1,nombreArchivo:'identidad-prueba.pdf',tamanoBytes:240000,estado:'ACTIVO',estadoRevision:support.estado,creadoPor:'Gestor de prueba',creadoEn:new Date().toISOString(),contenidoUrl:'/pta/prueba.pdf'}];
 if(url.includes('/bloques')) return structuredClone(blocks.map(block=>({...block,revisionDatos:Object.fromEntries(dataFields[block.bloque].map(campo=>[campo,{campo,huella:block.bloque+':'+campo,requiereRevision:block.bloque!=='CONTACTO'&&campo!=='OBSERVACIONES',puedeValidar:true,estado:savedData[block.bloque+':'+campo]?.estado||(block.estado==='Aprobado'?'Aprobado':'Pendiente'),observacion:savedData[block.bloque+':'+campo]?.observacion}]))})));
 return {docenteId:'docente-prueba',idRund:'RUND-PRUEBA',periodoCarga:'2026-2',proteccion_datos:{acceso_completo:true},bloques:{IDENTIDAD:{campos:[{campo:'TIPO_DOCUMENTO',valor:'CC'},{campo:'DOCUMENTO_IDENTIDAD',valor:'Documento de prueba'},{campo:'NOMBRE_COMPLETO',valor:'DOCENTE DE PRUEBA'},{campo:'GENERO',valor:'F'},{campo:'SEXO_BIOLOGICO',valor:'Mujer'},{campo:'FECHA_NACIMIENTO',valor:'1985-05-12'}]},...(designMode?{FORMACION:{campos:[{campo:'TITULO_PREGRADO',valor:'Economista'},{campo:'TITULO_MAESTRIA',valor:'Magíster en Ciencias Económicas'},{campo:'TITULO_DOCTORADO',valor:'Doctorado en Ciencias Económicas'},{campo:'NIVEL_FORMACION',valor:'Doctorado'},{campo:'PERFIL_ACADEMICO',valor:'Economista con maestría y doctorado en Ciencias Económicas.'}]}}:{})}};
},
post:async(url,body)=>{
 window.fixtureCalls.push({url,body});
 if(url.includes('/datos/')){const parts=url.split('/');const campo=parts.at(-2),bloque=parts.at(-4);savedData[bloque+':'+campo]=body;sessionStorage.setItem('data-review-fixture',JSON.stringify(savedData));blocks.find(b=>b.bloque===bloque).estado=body.estado==='Rechazado'?'Devuelto':'En revisión';return {success:true};}
 if(url.endsWith('/revision')){const fields=body.alcance==='documento'?['DOCUMENTO_IDENTIDAD','NOMBRE_COMPLETO','GENERO','SEXO_BIOLOGICO','FECHA_NACIMIENTO']:[body.campo];support.revisiones_campos={...support.revisiones_campos,...Object.fromEntries(fields.map(field=>[field,{estado:body.estado,observacion:body.observacion,documentoVersionId:body.documentoVersionId}]))};const decisions=Object.values(support.revisiones_campos);support.estado=decisions.some(d=>d.estado==='Rechazado')?'Rechazado':decisions.length===5?'Aprobado':'Pendiente';sessionStorage.setItem('review-fixture',JSON.stringify(support));blocks[0].estado=Object.entries(savedData).some(([key,decision])=>key.startsWith('IDENTIDAD:')&&decision.estado==='Rechazado')?'Devuelto':'En revisión';logs.unshift({id:String(logs.length+1),accion:body.estado==='Aprobado'?'APROBAR_SOPORTE':'DEVOLVER_SOPORTE',bloque:'IDENTIDAD',actorId:'Revisor de prueba',createdAt:new Date().toISOString(),observacion:body.observacion,metadata:{nombreArchivo:support.nombre_archivo}});}
 if(url.endsWith('/aprobar')){blocks[0].estado='Aprobado';blocks[0].fecha_revision=new Date().toISOString();}
 sessionStorage.setItem('review-logs',JSON.stringify(logs));return {success:true};
},getBlob:async()=>new Blob(['%PDF-1.7\\n%%EOF'],{type:'application/pdf'})};`;
const server = await createServer({ root, configFile: false, logLevel: 'error',
  cacheDir:path.join(root,'.local/rund-review/vite-evidence'),
  optimizeDeps:{force:process.argv.includes('--fresh-cache'),noDiscovery:true,include:['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime','lucide-react','sonner','framer-motion','@radix-ui/react-alert-dialog']},
  server: { host: '127.0.0.1', port: 0 }, plugins: [
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
    configureServer(dev) { dev.middlewares.use('/evidence-fixture', async (_req,res,next) => {
      try{
        const html = await dev.transformIndexHtml('/evidence-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#F1F5F9;margin:24px}button,input,textarea,select{font-family:inherit}button:disabled{opacity:.45;cursor:not-allowed}</style></head><body><div id="root"></div><script type="module" src="/fixture-entry.js"></script></body></html>');
        res.setHeader('Content-Type','text/html');res.end(html);
      }catch(error){next(error);}
    }); },
  }, react(),
] });
let browser;
try {
  await server.listen();
  console.log('RUND browser: servidor de prueba preparado.');
  browser = await puppeteer.launch({ headless: true,
    ...(process.env.RUND_BROWSER_EXECUTABLE ? { executablePath: process.env.RUND_BROWSER_EXECUTABLE } : {}),
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push(e.message); console.error('Fixture page error:', e.message); });
  page.on('console', message => { if(message.type()==='error')console.error('Fixture console:',message.text()); });
  page.setDefaultTimeout(60000);
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  const fixtureResponse=await fetch(`${origin}/evidence-fixture`,{signal:AbortSignal.timeout(30000)});
  assert(fixtureResponse.ok&&(await fixtureResponse.text()).includes('id="root"'),'La página de prueba debe estar disponible antes de abrir Chrome');
  console.log('RUND browser: página de prueba disponible.');
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()) ? request.continue() : request.abort());
  const click = text => page.evaluate(label => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === label); if (!button || button.disabled) throw new Error('Button unavailable: '+label); button.click(); }, text);
  const artifactDir = path.join(root, '.local/rund-row-review-preview');
  await fs.mkdir(artifactDir, { recursive: true });
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 });
  if(!process.argv.includes('--upload-only')){
  await page.goto(`${origin}/evidence-fixture`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Validar soporte'));
  assert.equal((await page.$$('.rund-data-sources')).length,0,'Los soportes pendientes no deben contarse como respaldo del dato');
  await click('Devolver soporte');
  await page.waitForSelector('#support-return-reason');
  assert(await page.$eval('[role="dialog"] button:last-child', b => b.disabled));
  await page.type('#support-return-reason','El archivo no corresponde a la información registrada. Adjunte el soporte correcto.');
  await click('Confirmar devolución');
  await page.waitForFunction(() => document.body.textContent.includes('El archivo no corresponde'));
  assert.equal((await page.$$('.rund-data-sources')).length,0,'Los soportes devueltos no deben aparecer en el contador de respaldos');
  assert(await page.evaluate(()=>[...document.querySelectorAll('[role=status]')].some(el=>el.textContent==='Pendiente de revisión')));
  assert.equal(await page.evaluate(()=>document.body.textContent.includes('Pendiente de corrección')),false);
  await page.screenshot({ path: path.join(artifactDir,'devuelto.png'), fullPage: true });
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Validar soporte').length), 0);
  // Start a fresh approval fixture, then verify persistence across reload.
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Validar soporte'));
  await click('Validar soporte');
  await page.waitForFunction(() => [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Validar soporte').length === 0);
  assert.equal((await page.$$('.rund-data-sources')).length,5,'El soporte aceptado respalda los cinco datos de identidad');
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
  await page.waitForSelector('.rund-support-list');
  for(const width of [320,390,768,1024,1500]){
    await page.setViewport({width,height:900});
    for(const label of ['Identidad','Contacto','Formación Académica','Vinculación','Académico','Transversal']){
      await page.evaluate(label=>[...document.querySelectorAll('[role=tab]')].find(tab=>tab.textContent.includes(label)).click(),label);
      await page.waitForFunction(label=>document.querySelector('[role=tab][aria-selected=true]').textContent.includes(label),{},label);
      assert(await page.evaluate(label=>{
        const panel=document.querySelector('[role=tabpanel]');
        const intro=panel.querySelector('.rund-review-section-intro');
        const guide=panel.querySelector('.rund-review-guide');
        const data=panel.querySelector('.rund-data-section');
        const confirmation=panel.querySelector('.rund-review-confirmation');
        const contact=label==='Contacto';
        const after=(first,last)=>!!(first.compareDocumentPosition(last)&Node.DOCUMENT_POSITION_FOLLOWING);
        const steps=[...guide.querySelectorAll('button>span')].map(step=>step.textContent);
        const contract=panel.querySelector('form[aria-label="Datos de contratación"]');
        return intro.querySelector('h4').textContent===label && after(intro,guide) && after(guide,data) && after(data,confirmation) &&
          steps.join(',')===(contact?'1,2':'1,2,3') &&
          data.querySelector('.rund-section-step').textContent===(contact?'1':'2') &&
          confirmation.querySelector('.rund-section-step').textContent===(contact?'2':'3') &&
          (label!=='Vinculación'||!!contract&&data.contains(contract));
      },label),`La estructura y los pasos deben coincidir con el contenido: ${label}, ${width}px`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Desbordamiento: ${label} a ${width}px`);
      assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.rund-checkpoint-grid button')].filter(b=>/^(Validar soporte|Devolver soporte)$/.test(b.textContent.trim())).length),0);
      assert(await page.evaluate(()=>{
        const grid=document.querySelector('.rund-checkpoint-grid'),bounds=grid.getBoundingClientRect();
        const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
        const gap=parseFloat(getComputedStyle(grid).columnGap)||0;
        const rows=[...document.querySelectorAll('.rund-checkpoint-row')].map(row=>row.getBoundingClientRect());
        return [1,2].includes(columns)&&rows.every((row,index)=>Math.abs(row.width-(bounds.width-gap*(columns-1))/columns)<2&&
          rows.slice(0,index).every(other=>row.top>=other.bottom-1||row.left>=other.right-1||other.left>=row.right-1));
      }),`Las tarjetas de datos deben adaptarse sin solaparse: ${label}, ${width}px`);
      assert.equal(await page.evaluate(()=>document.querySelectorAll('.rund-checkpoint-evidence__item').length),label==='Contacto'?0:2);
      assert.equal(await page.evaluate(()=>document.querySelectorAll('.rund-documents').length),label==='Contacto'?0:1);
      assert(await page.evaluate(label=>{
        const tools=document.querySelector('.rund-review-tools');
        if(label==='Contacto')return !tools;
        const documents=document.querySelector('.rund-documents');
        const data=document.querySelector('.rund-checkpoint-grid');
        return !!tools && documents.nextElementSibling===tools &&
          !!(tools.compareDocumentPosition(data)&Node.DOCUMENT_POSITION_FOLLOWING);
      },label),`Las herramientas deben quedar después de los archivos y antes de los datos: ${label}, ${width}px`);
      assert.equal(await page.evaluate(()=>document.querySelectorAll('.rund-support-review').length),0);
      if(label==='Identidad'){
        await page.screenshot({path:path.join(artifactDir,`soportes-${width}.png`),fullPage:true});
        const tools=await page.$('.rund-review-tools');
        await tools.screenshot({path:path.join(artifactDir,`herramientas-cerradas-${width}.png`)});
        const writesBefore=await page.evaluate(()=>window.fixtureCalls.length);
        await page.focus('.rund-review-tools>summary');
        await page.keyboard.press('Enter');
        await page.waitForFunction(()=>document.querySelector('.rund-review-tools').open);
        assert(await page.$eval('.rund-review-tools__when-open',label=>label.getBoundingClientRect().width>0));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        if(width===390||width===1500)await tools.screenshot({path:path.join(artifactDir,`herramientas-abiertas-${width}.png`)});
        await page.keyboard.press('Space');
        await page.waitForFunction(()=>!document.querySelector('.rund-review-tools').open);
        assert(await page.$eval('.rund-review-tools__when-closed',label=>label.getBoundingClientRect().width>0));
        assert.equal(await page.evaluate(()=>window.fixtureCalls.length),writesBefore,'Abrir herramientas no debe iniciar análisis ni aprobar datos');
      }
    }
  }
  }
  if(process.argv.includes('--upload-only')){
    await page.goto(`${origin}/evidence-fixture`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[role="tab"]');
  }
  const supportTitles=()=>page.$$eval('.rund-support-group-heading h4',headings=>headings.map(heading=>heading.textContent));
  let formationOrder;
  for(const state of ['empty=1&design=1','empty=1&design=1&mixed=1']){
    await page.goto(`${origin}/evidence-fixture?${state}`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[role="tab"]');
    await page.evaluate(()=>[...document.querySelectorAll('[role=tab]')].find(tab=>tab.textContent.includes('Formación Académica')).click());
    await page.waitForSelector('.rund-support-review__group');
    const mixed=state.includes('mixed');
    if(mixed)assert.deepEqual((await supportTitles()).sort(),[...formationOrder].sort(),'Los documentos y las opciones de carga conservan todos los datos');
    else formationOrder=await supportTitles();
    assert.equal(await page.$$eval('.rund-support-group-files',items=>items.length),mixed?2:0);
    for(const width of [1500,768,390,320]){
      await page.setViewport({width,height:1000});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert(await page.evaluate(()=>[...document.querySelectorAll('.rund-support-review__group')].every(group=>{
        const box=group.getBoundingClientRect(),zone=group.closest('section').getBoundingClientRect();
        return box.width>0&&box.left>=zone.left&&box.right<=zone.right+1;
      })),'Cada soporte permanece dentro de su sección, también en móvil');
      if(mixed){
        assert(await page.evaluate(()=>{
          const attached=document.querySelector('.rund-support-attached'),empty=document.querySelector('.rund-support-upload-zone');
          const a=attached.getBoundingClientRect(),b=empty.getBoundingClientRect();
          const columns=getComputedStyle(attached.parentElement).gridTemplateColumns.split(' ').length;
          return columns===2?b.left>=a.right:b.top>=a.bottom;
        }),'Documentos y carga opcional forman dos zonas diferenciadas');
      }
      await page.screenshot({path:path.join(artifactDir,`formacion-${mixed?'mixta':'vacia'}-${width}.png`),fullPage:true});
    }
  }
  await page.goto(`${origin}/evidence-fixture?empty=1&design=1`,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[role="tab"]');
  await page.evaluate(()=>[...document.querySelectorAll('[role=tab]')].find(tab=>tab.textContent.includes('Formación Académica')).click());
  for(const width of [1500,390]){
    await page.setViewport({width,height:1000});
    await page.waitForSelector('.rund-support-review__group--empty');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.equal(await page.evaluate(()=>document.querySelector('.rund-review-tools').open),false);
    assert.equal(await page.evaluate(()=>document.querySelector('.rund-support-unavailable').open),false);
    assert.equal(await page.evaluate(()=>document.body.textContent.includes('0 de 0 documentos')),false);
    assert(await page.evaluate(()=>{const list=document.querySelector('.rund-documents__list');return list.scrollHeight<=list.clientHeight+2;}));
    await page.screenshot({path:path.join(artifactDir,`formacion-sin-archivos-${width}.png`),fullPage:true});
  }
  await click('Agregar documento');
  await page.select('#evidence-purpose-docente-prueba','diploma_pregrado');
  await page.waitForFunction(()=>{const button=document.querySelector('button.rund-documents__file-action');return button&&!button.disabled;});
  await page.focus('button.rund-documents__file-action');
  assert(await page.$eval('button.rund-documents__file-action',button=>document.activeElement===button),'El botón de carga debe recibir el foco del teclado');
  await page.evaluate(()=>{
    window.fixturePickerEvents=[];
    for(const kind of ['keydown','click'])document.addEventListener(kind,event=>{
      if(event.target.matches?.('button.rund-documents__file-action,input[type=file]'))window.fixturePickerEvents.push({kind,target:event.target.tagName,trusted:event.isTrusted,active:navigator.userActivation.isActive});
    },true);
  });
  try{
    const [fileChooser]=await Promise.all([page.waitForFileChooser({timeout:10000}),page.keyboard.press('Enter')]);
    await fileChooser.cancel();
  }catch(error){
    console.error('Picker events:',JSON.stringify(await page.evaluate(()=>window.fixturePickerEvents)));
    await page.screenshot({path:path.join(artifactDir,'selector-teclado-error.png'),fullPage:true});
    throw error;
  }
  await click('Cerrar carga');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ success: true, browser: await browser.version(), simulatedAPI: true, businessDataModified: false, checks: process.argv.includes('--upload-only')?['Carga PDF con teclado','Formación sin archivos en escritorio/móvil']:['Una revisión por documento compartido', 'Persistencia al recargar', 'Aprobación de bloque independiente del OCR', 'Motivo obligatorio', 'Devolución visible', 'Contacto sin soporte', 'Historial visible','Seis pestañas con varios soportes a 320, 390, 768, 1024 y 1500px','Carga PDF con teclado'], screenshots: artifactDir }, null, 2));
} finally { if (browser) await browser.close(); await server.close(); }
