// Real BancoDocentesPTA and API adapter, with synthetic responses and no business writes.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const fixtureApi=`
const missingMode=new URLSearchParams(location.search).has('missing');
const records=Array.from({length:5},(_,i)=>({id:'fixture-'+i,nombre_completo:'Docente ficticio '+i,documento_identidad:'TEST-'+i,
 periodo:i<3?'2026-2':i===3?'2025-2':null,estado:i===1?'INACTIVO':'ACTIVO',dedicacion_codigo:missingMode?'SIN_DEDICACION':'TC',dedicacion:'Tiempo Completo',
 territorial:missingMode?'Sin territorial':i%2?'Antioquia':'Norte De Santander',territorial_id:i%2?'2':'1',horas_programables:800,
 nucleo:missingMode||i===4?'Sin núcleo temático':i===1?'Finanzas públicas':'Administración pública y políticas territoriales'}));
const grouped=(rows,key,label=key)=>Object.entries(rows.reduce((acc,r)=>(acc[r[key]]=(acc[r[key]]||0)+1,acc),{})).map(([value,total])=>({[label]:value,total}));
window.statsFixtureRequests=[];
export const apiClient={get:async(url,params)=>{
 const parsed=new URL(url,'http://fixture.invalid');const q={...Object.fromEntries(parsed.searchParams),...params};
 window.statsFixtureRequests.push({url:parsed.pathname,params:q});
 if(url.includes('periodos-academicos'))return [{codigo:'2026-2',estado:'en_curso'},{codigo:'2025-2',estado:'cerrado'},{codigo:'2030-1',estado:'planeado'}];
 if(url.endsWith('/catalogos/territoriales'))return [{id:'1',nombre:'Norte De Santander'},{id:'2',nombre:'Antioquia'}];
 const rows=records.filter(r=>(!q.periodoCarga||r.periodo===q.periodoCarga)&&(!q.estado||r.estado===q.estado)&&(!q.dedicacion||r.dedicacion_codigo===q.dedicacion)&&(!q.territorial||r.territorial_id===q.territorial||r.territorial===q.territorial));
 if(parsed.pathname.endsWith('/stats'))return {total:rows.length,activos:rows.filter(r=>r.estado==='ACTIVO').length,inactivos:rows.filter(r=>r.estado==='INACTIVO').length,
 total_horas:rows.length*800,promedio_horas:rows.length?800:0,por_dedicacion:grouped(rows,'dedicacion_codigo','dedicacion'),por_territorial:grouped(rows,'territorial'),
 por_categoria:rows.length?[{categoria:missingMode?'Sin categoría':'Titular',total:rows.length}]:[],por_sede:rows.length?[{sede:'Sin CETAP',total:rows.length}]:[],
 por_vinculacion:rows.length?[{vinculacion:missingMode?'Sin vinculación':'Carrera',total:rows.length}]:[],por_nivel_formacion:rows.length?[{nivel_formacion:missingMode?'Sin información':'Maestría',total:rows.length}]:[],
 por_genero:rows.length?[{genero:missingMode?'No especificado':'M',total:rows.length}]:[],por_rango_edad:rows.length?[{rango_edad:missingMode?'Sin dato':'De 36 a 45 años',total:rows.length}]:[],por_nucleo_tematico:grouped(rows,'nucleo','nucleo_tematico')};
 if(parsed.pathname.endsWith('/banco-docentes'))return {items:rows,total:rows.length,page:1,pages:1};
 return [];
},post:async()=>{throw Error('Mutation forbidden in fixture')}};
`;
const entry=`import React from'react';import{createRoot}from'react-dom/client';import{AuthProvider}from'/apps/mfe-pta/src/contexts/AuthContext.tsx';import{BancoDocentesPTA}from'/apps/mfe-pta/src/components/pta/banco-docentes/BancoDocentesPTA.tsx';createRoot(document.getElementById('root')).render(React.createElement(AuthProvider,{isSuperUser:true},React.createElement(BancoDocentesPTA)));`;
const server=await createServer({root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0},plugins:[{
 name:'rund-statistics-fixture',enforce:'pre',resolveId(source){if(source.endsWith('shell/src/services/api'))return '\0stats-api';if(source==='/stats-entry.js')return '\0stats-entry';},
 load(id){if(id==='\0stats-api')return fixtureApi;if(id==='\0stats-entry')return entry;},
 configureServer(dev){dev.middlewares.use('/stats-fixture',async(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await dev.transformIndexHtml('/stats-fixture','<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f8fafc;font-family:Arial,sans-serif}button,input,select{font-family:inherit}</style></head><body><div id="root"></div><script type="module" src="/stats-entry.js"></script></body></html>'));});},
},react()],resolve:{alias:[{find:'@esap-mfe/shared-ui',replacement:path.join(root,'packages/shared-ui/src')},{find:'@esap-mfe/shared-hooks',replacement:path.join(root,'packages/shared-hooks/src')},{find:'@esap-mfe/shared-types',replacement:path.join(root,'packages/shared-types/src')}]}});
let browser;
try {
 await server.listen();browser=await puppeteer.launch({headless:true});const page=await browser.newPage(),errors=[];
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:1440,height:1050});
 const origin='http://127.0.0.1:'+server.httpServer.address().port;
 await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)||/^(data:|blob:)/.test(r.url())?r.continue():r.abort());
 const click=text=>page.evaluate(text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text)?.click(),text);
 const count=number=>page.waitForFunction(n=>document.querySelector('[role="group"][aria-label="Total Docentes"]')?.textContent.trim().startsWith(String(n)),{},number);
 await page.goto(origin+'/stats-fixture',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='2026-2'));
 await click('Estadísticas');await count(3);
 assert(await page.$('svg[role="img"][aria-label="Tiempo Completo: 3"] circle[fill="#1E40AF"]'));
 assert.equal(await page.$('[aria-label="CETAP/Sedes"]'),null);
 assert.equal(await page.$eval('[aria-label="Núcleos temáticos"]',n=>n.textContent.trim()),'2Núcleos temáticos');
 const artifacts=path.join(root,'.local/rund-statistics');await fs.mkdir(artifacts,{recursive:true});
 await page.screenshot({path:path.join(artifacts,'estadisticas-2026-2.png'),fullPage:true});
 for(const width of [360,430,768,1440]) {
   await page.setViewport({width,height:1000});
   const layout=await page.$eval('.rund-statistics',node=>({noOverflow:node.scrollWidth<=node.clientWidth+1,
     panelsFit:[...node.querySelectorAll('.rund-statistics__charts > div,.rund-statistics__nucleos,[role="group"]')].every(panel=>panel.getBoundingClientRect().left>=0&&panel.getBoundingClientRect().right<=innerWidth+1),
     columns:getComputedStyle(node.querySelector('.rund-statistics__charts')).gridTemplateColumns.split(' ').length,
     contentWidth:node.clientWidth-parseFloat(getComputedStyle(node).paddingLeft)-parseFloat(getComputedStyle(node).paddingRight)}));
   assert(layout.noOverflow&&layout.panelsFit,JSON.stringify({width,...layout}));
   assert.equal(layout.columns,layout.contentWidth<=680?1:2);
   if(width===360)await page.screenshot({path:path.join(artifacts,'estadisticas-movil.png'),fullPage:true});
 }
 await page.select('select[aria-label="Estado de estadísticas"]','INACTIVO');await count(1);
 await page.click('[role="group"][aria-label="Total Docentes"]');
 await page.waitForFunction(()=>document.querySelector('select[aria-label="Filtrar docentes por estado"]')?.value==='INACTIVO');
 await page.waitForFunction(()=>document.body.textContent.includes('Docente ficticio 1'));
 assert((await page.evaluate(()=>window.statsFixtureRequests)).some(r=>r.url.endsWith('/banco-docentes')&&r.params.estado==='INACTIVO'&&r.params.periodoCarga==='2026-2'));
 await click('Estadísticas');await count(1);await click('Limpiar filtros');await count(3);
 await page.select('select[aria-label="Territorial de estadísticas"]','2');await count(1);
 assert(await page.$('option[value="1"]'));
 await click('Limpiar filtros');await count(3);
 await page.select('select[aria-label="Periodo de estadísticas"]','2025-2');await count(1);
 await page.select('select[aria-label="Periodo de estadísticas"]','');await count(5);
 await page.select('select[aria-label="Periodo de estadísticas"]','2030-1');await count(0);
 assert.equal(await page.$('[role="alert"]'),null);
 await page.goto(origin+'/stats-fixture?missing=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='2026-2'));
 await click('Estadísticas');await count(3);
 assert.equal(await page.$('.rund-statistics__charts'),null);
 assert.equal(await page.$('.rund-statistics__nucleos'),null);
 assert(await page.$eval('.rund-statistics__empty',node=>node.textContent.includes('aún no tienen información')));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({success:true,noBusinessWrites:true,checks:['8 indicadores con núcleo temático en reemplazo de CETAP','Dona de una sola dedicación visible','Gráficas sin información se ocultan','Responsive a 360, 430, 768 y 1440 px sin desbordamientos','Filtros y detalle conservan periodo y estado','Opciones territoriales estables','Cambios 2026-2, 2025-2, todos y periodo vacío','Sin errores de navegador']},null,2));
} finally {await browser?.close();await server.close();}
