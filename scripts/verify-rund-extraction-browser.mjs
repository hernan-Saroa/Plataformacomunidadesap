// Componentes reales, respuestas simuladas y datos ficticios. No contacta APIs de negocio.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = `
const suggestion={id:'11111111-1111-4111-8111-111111111111',campo:'pregrado',label:'Pregrado',valor:'Administración Pública',valor_previo:'Título anterior',pagina:1,evidencia:'Título: Administración Pública',estado:'PENDIENTE',baja_confianza:true};
const job={id:'job',documento_id:'documento',nombre_archivo:'diploma-ficticio.pdf',version:1,estado:'COMPLETADO',documento_estado:'ACTIVO',sugerencias:[suggestion]};
const progressJob={id:'job-progress',documento_id:'documento-progress',nombre_archivo:'documento-en-analisis.pdf',version:1,estado:'PROCESANDO',etapa:'MODELO',iniciado_en:new Date(Date.now()-65000).toISOString(),documento_estado:'ACTIVO',sugerencias:[]};
const secondJob={...job,id:'job-second',documento_id:'documento-second',nombre_archivo:'otro-diploma-con-nombre-muy-largo-para-verificar-el-selector.pdf',sugerencias:[{...suggestion,id:'second-suggestion'}]};
let jobs=[progressJob,job,secondJob],documents=[job,secondJob].map(item=>({id:item.documento_id,nombre_archivo:item.nombre_archivo,analizado_previamente:true,bloque:'FORMACION',tipo_soporte:'diploma_pregrado'}));
window.fixtureCalls=[];
export const apiClient={get:async()=>({enabled:true,documents:structuredClone(documents),jobs:structuredClone(jobs)}),post:async(url,body)=>{
 window.fixtureCalls.push({url,body});
 if(url.endsWith('/reprocesar')){for(const [index,id] of body.documentos.entries()){
  const document=documents.find(item=>item.id===id);jobs.filter(item=>item.documento_id===id).forEach(item=>item.sugerencias.forEach(proposal=>{if(proposal.estado==='PENDIENTE')proposal.estado='DESCARTADA';}));
  jobs.unshift({id:'queued-'+id,documento_id:id,nombre_archivo:document.nombre_archivo,version:1,estado:'PENDIENTE',documento_estado:'ACTIVO',posicion_cola:index+1,sugerencias:[]});
 }documents=documents.filter(item=>!body.documentos.includes(item.id));return {queued:body.documentos.length,reprocessed:true};}
 if(url.endsWith('/orden')){body.trabajos.forEach((id,index)=>{jobs.find(item=>item.id===id).posicion_cola=index+1;});return {reordered:body.trabajos.length};}
 suggestion.estado='CORREGIDA';suggestion.valor_confirmado=body.valorCorregido;return {confirmed:true,changed:true};}};
export const createBancoDocente=async()=>{throw new Error('No se permite crear docentes en esta prueba');};
export const updateBancoDocente=async(id,body)=>{window.fixtureCalls.push({url:'update',body});suggestion.estado='CORREGIDA';suggestion.valor_confirmado=body.pregrado;return {success:true};};
export const vincularRundSoporte=async()=>({success:true,data:{id:'soporte-ficticio'}});
`;
const entry = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {RundExtractionPanel} from '/apps/mfe-pta/src/components/pta/banco-docentes/RundExtractionPanel.tsx';
function Fixture(){const [canEdit,setCanEdit]=useState(true),[revision,setRevision]=useState(0);window.setFixtureRole=setCanEdit;return React.createElement(RundExtractionPanel,{docenteId:'docente-ficticio',canEdit,revision,onConfirmed:()=>setRevision(n=>n+1),onView:()=>{window.sourceOpened=true;}});}
createRoot(document.getElementById('root')).render(React.createElement(Fixture));`;

const server = await createServer({root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0},plugins:[{
  name:'rund-extraction-fixture',enforce:'pre',
  resolveId(source){
    if(source.endsWith('/services/api')||source.endsWith('/services/api/ptaApi'))return '\0fixture-api';
    if(source.endsWith('/contexts/AuthContext'))return '\0fixture-auth';
    if(source.endsWith('/utils/connectivity'))return '\0fixture-online';
    if(source==='/fixture-entry.js')return '\0fixture-entry';
  },
  load(id){
    if(id==='\0fixture-api')return fixture;
    if(id==='\0fixture-auth')return "export const useAuth=()=>({isSuperUser:true,userPersonId:'OPERADOR_FICTICIO',hasAnyPermission:()=>true});";
    if(id==='\0fixture-online')return 'export const getAppOnlineStatus=()=>true;';
    if(id==='\0fixture-entry')return entry;
  },
  configureServer(dev){dev.middlewares.use('/extraction-fixture',async(_req,res)=>{
    const html=await dev.transformIndexHtml('/extraction-fixture','<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0}button,input,textarea,select{font-family:inherit}</style></head><body><div id="root"></div><script type="module" src="/fixture-entry.js"></script></body></html>');
    res.setHeader('Content-Type','text/html');res.end(html);
  });},
},react()]});
let browser;
try{
  await server.listen();browser=await puppeteer.launch({headless:true});
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
  await page.setRequestInterception(true);
  page.on('request',request=>request.url().startsWith(origin)||request.url().startsWith('data:')?request.continue():request.abort());
  await page.setViewport({width:1400,height:950});await page.goto(origin+'/extraction-fixture',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Organizar análisis'));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Organizar análisis').click());
  await page.waitForSelector('[role=progressbar]');
  assert.equal(await page.$eval('[role=progressbar]',el=>el.getAttribute('aria-valuetext')),'Extraer datos');
  const artifacts=path.join(root,'.local/rund-extraction-preview');await fs.mkdir(artifacts,{recursive:true});
  await page.screenshot({path:path.join(artifacts,'desktop.png'),fullPage:true});
  await page.setViewport({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'El panel no debe desbordar en móvil');
  await page.screenshot({path:path.join(artifacts,'mobile.png'),fullPage:true});
  await page.select('[aria-label="Archivo para revisar"]','job');
  await page.waitForSelector('.rund-extraction-suggestion');
  assert.equal(await page.$('.rund-extraction-progress'),null,'Solo debe mostrarse el resultado del archivo seleccionado');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'El selector y los resultados no deben desbordar en móvil');
  await page.screenshot({path:path.join(artifacts,'mobile-results.png'),fullPage:true});
  await page.setViewport({width:1400,height:950});
  const click=label=>page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);if(!b||b.disabled)throw new Error('Botón no disponible: '+text);b.click();},label);
  await page.evaluate(()=>window.setFixtureRole(false));
  await page.waitForFunction(()=>![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Corregir dato'));
  assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].some(b=>['Aplicar al perfil','Rechazar sugerencia','Reintentar'].includes(b.textContent.trim()))),false);
  await page.evaluate(()=>window.setFixtureRole(true));
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Corregir dato'));
  await click('Corregir dato');
  const value='#correct-11111111-1111-4111-8111-111111111111';
  const reason='#correct-reason-11111111-1111-4111-8111-111111111111';
  await page.waitForSelector(value);
  assert(await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Guardar correcci\u00f3n').disabled));
  await page.click(value);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');
  await page.type(value,'Administracion Publica corregida');
  await page.type(reason,'El PDF contiene una palabra que el OCR omitio.');
  assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0);
  await click('Guardar correcci\u00f3n');
  await page.waitForFunction(()=>window.fixtureCalls.length===1);
  const saved=await page.evaluate(()=>window.fixtureCalls[0]);
  assert(saved.url.endsWith('/sugerencias/11111111-1111-4111-8111-111111111111/confirmar'));
  assert.equal(saved.body.valorCorregido,'Administracion Publica corregida');
  assert.equal(saved.body.motivo,'El PDF contiene una palabra que el OCR omitio.');
  assert(!saved.url.includes('/aprobar')&&!saved.url.includes('/revision'));
  await page.waitForFunction(()=>document.body.textContent.includes('Corregido y confirmado'));
  await page.screenshot({path:path.join(artifacts,'correccion-registrada.png'),fullPage:true});
  await page.select('[aria-label="Archivo para revisar"]','job-second');
  await click('Volver a procesar este PDF');
  await page.waitForSelector('[aria-label="Confirmar nuevo análisis OCR"]');
  assert.equal(await page.evaluate(()=>window.fixtureCalls.length),1);
  await click('Cancelar nuevo análisis');
  await page.click('[aria-label="Incluir diploma-ficticio.pdf en el análisis"]');
  await page.click('[aria-label="Incluir otro-diploma-con-nombre-muy-largo-para-verificar-el-selector.pdf en el análisis"]');
  await page.click('[aria-label="Analizar antes otro-diploma-con-nombre-muy-largo-para-verificar-el-selector.pdf"]');
  await click('Analizar seleccionadas (2)');
  for(const width of [320,390,768,1400]){
    await page.setViewport({width,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'El reprocesado no debe desbordar a '+width+'px');
    await page.screenshot({path:path.join(artifacts,'reprocesar-'+width+'.png'),fullPage:true});
  }
  await click('Confirmar nuevo análisis');
  await page.waitForFunction(()=>window.fixtureCalls.length===2);
  const reprocess=await page.evaluate(()=>window.fixtureCalls[1]);
  assert(reprocess.url.endsWith('/reprocesar'));
  assert.deepEqual(reprocess.body.documentos,['documento-second','documento']);
  await page.waitForSelector('[aria-label="Orden de análisis en espera"]');
  await page.click('[aria-label="Orden de análisis en espera"] [aria-label="Analizar antes diploma-ficticio.pdf"]');
  await click('Guardar orden');
  await page.waitForFunction(()=>window.fixtureCalls.length===3);
  assert.deepEqual((await page.evaluate(()=>window.fixtureCalls[2])).body.trabajos,['queued-documento','queued-documento-second']);
  assert.deepEqual(errors,[]);
  console.log('F014 navegador: selector visible, reprocesado individual y por lote ordenado, confirmación/cancelación, cola, escritorio/móvil y permisos separados verificados (API simulada).');
}finally{if(browser)await browser.close();await server.close();}
