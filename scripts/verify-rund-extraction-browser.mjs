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
window.fixtureCalls=[];
export const apiClient={get:async()=>({enabled:true,documents:[],jobs:[structuredClone(progressJob),structuredClone(job)]}),post:async(url,body)=>{window.fixtureCalls.push({url,body});suggestion.estado='DESCARTADA';return {discarded:true};}};
export const createBancoDocente=async()=>{throw new Error('No se permite crear docentes en esta prueba');};
export const updateBancoDocente=async(id,body)=>{window.fixtureCalls.push({url:'update',body});suggestion.estado='CORREGIDA';suggestion.valor_confirmado=body.pregrado;return {success:true};};
export const vincularRundSoporte=async()=>({success:true,data:{id:'soporte-ficticio'}});
`;
const entry = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {RundExtractionPanel} from '/apps/mfe-pta/src/components/pta/banco-docentes/RundExtractionPanel.tsx';
import {BancoDocenteEditModal} from '/apps/mfe-pta/src/components/pta/banco-docentes/BancoDocenteEditModal.tsx';
const docente={id:'docente-ficticio',nombre_completo:'DOCENTE DE PRUEBA',documento_identidad:'1020304050',tipo_documento:'CC',periodoCarga:'2026-2',territorial:'Sede Central',vinculacion_codigo:'OCASIONAL',dedicacion_codigo:'TC',horas_programables:800,categoria:'Asistente',origen_vinculacion:'Convocatoria docente',acto_administrativo_vinculacion:'Resolución de prueba',puntaje_salarial:145.5,situacion_administrativa:'Servicio activo',situacion_categoria:'Servicio Activo',estado:'ACTIVO',inicio_vinculacion:'2026-01-15',fin_vinculacion:'2026-12-15',nivel_formacion:'Pregrado',perfil_academico:'Perfil de prueba',nucleo_tematico:'Administración Pública',pregrado:'Título anterior',correo_institucional:'prueba@esap.edu.co',correo_personal:'prueba@example.com',telefono:'3001234567',genero:'Femenino',sexo_biologico:'Mujer',nacimiento:'1985-06-15'};
function Fixture(){const [suggestion,setSuggestion]=useState(null),[revision,setRevision]=useState(0);return React.createElement(React.Fragment,null,React.createElement(RundExtractionPanel,{docenteId:docente.id,revision,onUse:setSuggestion,onView:()=>{window.sourceOpened=true;}}),suggestion&&React.createElement(BancoDocenteEditModal,{docente,suggestion,onClose:()=>setSuggestion(null),onSaved:()=>{setSuggestion(null);setRevision(n=>n+1);}}));}
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
  await page.setViewport({width:1400,height:950});await page.goto(origin+'/extraction-fixture');
  await page.waitForSelector('.rund-extraction-suggestion');
  assert.equal(await page.$eval('[role=progressbar]',el=>el.getAttribute('aria-valuetext')),'Extraer datos');
  const artifacts=path.join(root,'.local/rund-extraction-preview');await fs.mkdir(artifacts,{recursive:true});
  await page.screenshot({path:path.join(artifacts,'desktop.png'),fullPage:true});
  await page.setViewport({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'El panel no debe desbordar en móvil');
  await page.screenshot({path:path.join(artifacts,'mobile.png'),fullPage:true});
  await page.setViewport({width:1400,height:950});
  const click=label=>page.evaluate(text=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);if(!b||b.disabled)throw new Error('Botón no disponible: '+text);b.click();},label);
  await click('Revisar y aplicar');await page.waitForSelector('input[placeholder="Título de pregrado"]');
  assert.equal(await page.$eval('input[placeholder="Título de pregrado"]',el=>el.value),'Administración Pública');
  assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0,'Abrir la revisión no debe guardar');
  await page.$eval('input[placeholder="Título de pregrado"]',el=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(el,'Administración Pública corregida');el.dispatchEvent(new Event('input',{bubbles:true}));});
  await click('Siguiente');await page.waitForSelector('input[placeholder="nombre@esap.edu.co"]');
  await click('Siguiente');await page.waitForSelector('input[type=file]');
  await click('Guardar Docente');
  await page.waitForFunction(()=>document.body.textContent.includes('No se puede guardar'));
  assert.equal(await page.evaluate(()=>window.fixtureCalls.length),0,'El soporte de edición sigue siendo obligatorio');
  const pdf=path.join(artifacts,'soporte-ficticio.pdf');await fs.writeFile(pdf,'%PDF-1.7\nDocumento ficticio\n%%EOF');
  await (await page.$('input[type=file]')).uploadFile(pdf);
  await click('Guardar Docente');
  await page.waitForFunction(()=>window.fixtureCalls.some(c=>c.url==='update'));
  const saved=await page.evaluate(()=>window.fixtureCalls.find(c=>c.url==='update').body);
  assert.deepEqual(saved.rundSuggestionIds,['11111111-1111-4111-8111-111111111111']);
  assert.equal(saved.pregrado,'Administración Pública corregida');assert.equal(saved.soporteEdicionId,'soporte-ficticio');
  await page.waitForFunction(()=>document.body.textContent.includes('Corregido y confirmado por una persona'));
  assert.deepEqual(errors,[]);
  console.log('F014 navegador: escritorio/móvil, prellenado, corrección humana, soporte obligatorio y actualización de estado verificados (API simulada).');
}finally{if(browser)await browser.close();await server.close();}
