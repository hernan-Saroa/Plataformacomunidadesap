// Real components with synthetic API data. No accounts or business writes.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const api=`
const image=color=>{const c=document.createElement('canvas');c.width=c.height=600;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,600,600);return c.toDataURL('image/png')};
const approved=image('#003da5'),candidate=image('#16a34a');
const dates={creado_en:'2026-10-01T12:00:00Z',ancho:600,alto:600};
window.fixture={published:approved,
  current:{...dates,id:'approved',nombre:'foto-validada.png',estado:'APROBADA',origen:'RUND',creadoPorNombre:'Gestora del Grupo',revisadoPorNombre:'Revisora Académica',revisado_por:'reviewer',revisado_en:'2026-10-02T12:00:00Z'},
  candidate:{...dates,id:'pending',estado:'PENDIENTE',nombre:'123456.png',origen:'PTA',creadoPorNombre:'Docente de Prueba'},
  past:[{...dates,id:'old',nombre:'foto-carga-masiva.png',estado:'RECHAZADA',origen:'MASIVA',creadoPorNombre:'Gestora de Carga',revisadoPorNombre:'Revisora Académica',revisado_por:'reviewer',revisado_en:'2026-10-02T12:00:00Z',observacion:'El rostro debe estar centrado.'}],decisions:[],historyLoads:[]};
const status=()=>({personaId:'person',publicada:window.fixture.current,solicitud:window.fixture.candidate,historial:location.search.includes('single')?[window.fixture.current]:[...new Map([window.fixture.candidate,window.fixture.current,...window.fixture.past].map(photo=>[photo.id,photo])).values()]});
export const apiClient={get:async url=>{
  if(url.endsWith('/publicada'))return {id:window.fixture.current.id,url:window.fixture.published};
  if(url.includes('/versiones/')){window.fixture.historyLoads.push(url);return {url:url.endsWith('/approved')?approved:candidate};}
  return status();
},post:async(url,body)=>{
  window.fixture.decisions.push({url,body});window.fixture.candidate={...window.fixture.candidate,estado:body.estado,observacion:body.observacion,revisadoPorNombre:'Revisora Académica',revisado_por:'reviewer',revisado_en:'2026-10-28T12:00:00Z'};
  if(body.estado==='APROBADA'){window.fixture.past.unshift({...window.fixture.current,estado:'ARCHIVADA'});window.fixture.current=window.fixture.candidate;window.fixture.published=candidate;}return status();
},upload:async()=>{window.fixture.candidate={...dates,id:'second',estado:'PENDIENTE',nombre:'foto-nueva.png',origen:'PTA',creadoPorNombre:'Docente de Prueba'};return status();}};
`;
const entry=`
import React from 'react';import {createRoot} from 'react-dom/client';
import {RundPhotoPanel,RundPhotoBulkUpload} from '/apps/mfe-pta/src/components/pta/banco-docentes/RundPhotoPanel.tsx';
import {PublishedAvatar} from '/apps/shared/profile-photos.tsx';
const own=location.search.includes('own');
createRoot(document.getElementById('root')).render(React.createElement('main',null,React.createElement('h2',null,own?'Portal docente':'RUND · Identidad'),React.createElement(PublishedAvatar,{personaId:'person',name:'Docente de prueba',size:56}),React.createElement(RundPhotoPanel,{docenteId:'teacher',own,canUpload:!own,canValidate:!own,name:'Docente de prueba'}),!own&&React.createElement(RundPhotoBulkUpload)));
`;
const server=await createServer({ root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0},plugins:[{
  name:'photo-fixture',enforce:'pre',resolveId(source){if(source.endsWith('/services/api'))return '\0photo-api';if(source==='/photo-entry.js')return '\0photo-entry';},
  load(id){if(id==='\0photo-api')return api;if(id==='\0photo-entry')return entry;},
  configureServer(dev){dev.middlewares.use('/photo-fixture',async(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(await dev.transformIndexHtml('/photo-fixture','<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f1f5f9;font-family:Arial,sans-serif}main{max-width:1100px;margin:auto;padding:16px}</style></head><body><div id="root"></div><script type="module" src="/photo-entry.js"></script></body></html>'));});},
},react()]});
let browser;
try{
  await server.listen();browser=await puppeteer.launch({headless:true});
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.setDefaultTimeout(60000);
  const origin='http://127.0.0.1:'+server.httpServer.address().port;
  await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(origin)||/^(data:|blob:)/.test(request.url())?request.continue():request.abort());
  const dir=path.join(root,'.local/rund-photos-preview');await fs.mkdir(dir,{recursive:true});
  await page.setViewport({width:1440,height:1000});await page.goto(origin+'/photo-fixture');
  await page.waitForSelector('img[alt="Foto propuesta para revisión"]');
  const pickerStyle=await page.$eval('.rund-photo-select-button',button=>({background:getComputedStyle(button).backgroundColor,height:button.getBoundingClientRect().height,text:button.textContent.trim()}));
  assert.equal(pickerStyle.text,'Seleccionar foto');assert.equal(pickerStyle.background,'rgb(0, 61, 165)');assert(pickerStyle.height>=44);
  await page.focus('.rund-photo-select-button');
  const [keyboardChooser]=await Promise.all([page.waitForFileChooser(),page.keyboard.press('Enter')]);
  await keyboardChooser.cancel();
  await page.$eval('.rund-photo-select-button',button=>button.blur());
  const published=await page.$eval('img[alt="Foto de Docente de prueba"]',img=>img.src);
  const proposed=await page.$eval('img[alt="Foto propuesta para revisión"]',img=>img.src);
  assert.notEqual(published,proposed);
  assert(await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Rechazar foto')).disabled));
  assert.equal(await page.evaluate(()=>window.fixture.historyLoads.length),1);
  await page.click('.rund-photo summary');
  await page.waitForFunction(()=>document.querySelectorAll('.rund-photo-history-item').length===3 && [...document.querySelectorAll('.rund-photo-history-thumbnail img')].length===3 && [...document.querySelectorAll('.rund-photo-history-thumbnail img')].every(img=>img.complete && img.naturalWidth>0));
  assert(await page.evaluate(()=>['Portal del docente (PTA)','Módulo RUND','Carga masiva RUND','Gestora del Grupo','Revisora Académica','Aprobada por','Rechazada por'].every(text=>document.querySelector('.rund-photo-history').textContent.includes(text))));
  await page.click('button[aria-label="Ver foto foto-validada.png"]');
  await page.waitForSelector('[role=dialog] img[alt="Foto histórica: foto-validada.png"]');
  assert.equal(await page.$eval('[role=dialog] img',img=>img.src),published);
  await page.keyboard.press('Escape');await page.waitForSelector('[role=dialog]',{hidden:true});
  for(const width of [1440,768,375,320]){
    await page.setViewport({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}`);
    assert(await page.$eval('.rund-photo-history-list',list=>[...list.children].every(item=>Math.abs(item.getBoundingClientRect().width-list.getBoundingClientRect().width)<1)),`History records must use the full width at ${width}`);
    await page.screenshot({path:path.join(dir,'identity-'+width+'.png'),fullPage:true});
  }
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aprobar foto')).click());
  await page.waitForFunction(()=>document.body.textContent.includes('Foto aprobada y publicada'));
  await page.waitForFunction(src=>document.querySelector('img[alt="Foto de Docente de prueba"]').src===src,{},proposed);
  assert.equal(await page.evaluate(()=>window.fixture.decisions[0].body.estado),'APROBADA');
  await page.goto(origin+'/photo-fixture?own');await page.waitForSelector('input[type=file]');
  assert(!(await page.evaluate(()=>document.body.textContent.includes('Aprobar foto'))));
  const before=await page.$eval('img[alt="Foto de Docente de prueba"]',img=>img.src);
  const [photoChooser]=await Promise.all([page.waitForFileChooser(),page.click('.rund-photo-select-button')]);
  await photoChooser.accept([path.join(root,'backend/academic-work-plan-service/src/pta/banco-docentes/__fixtures__/profile-photo.png')]);
  await page.waitForFunction(()=>document.body.textContent.includes('Foto enviada. Queda pendiente'));
  assert.equal(await page.$eval('img[alt="Foto de Docente de prueba"]',img=>img.src),before);
  await page.click('.rund-photo summary');
  await page.waitForSelector('.rund-photo-history-thumbnail img');
  assert(await page.evaluate(()=>window.fixture.historyLoads.every(url=>url.includes('/mia/versiones/'))));
  await page.screenshot({path:path.join(dir,'pta-pending-mobile.png'),fullPage:true});
  await page.goto(origin+'/photo-fixture?single');
  await page.waitForSelector('.rund-photo summary');await page.click('.rund-photo summary');
  await page.waitForSelector('.rund-photo-history-thumbnail img');
  for(const width of [1536,1024,768,600,375,320]){
    await page.setViewport({width,height:1000});
    const layout=await page.$eval('.rund-photo-history-item',item=>{
      const fields=[...item.querySelectorAll('.rund-photo-history-metadata>div')];
      return {height:item.getBoundingClientRect().height,columns:new Set(fields.map(field=>Math.round(field.getBoundingClientRect().left))).size,overflow:document.documentElement.scrollWidth>innerWidth,clipped:fields.some(field=>field.scrollWidth>field.clientWidth+1)};
    });
    assert(!layout.overflow && !layout.clipped,`History text must fit at ${width}: ${JSON.stringify(layout)}`);
    if(width>=768)assert(layout.columns>=3,`History must distribute metadata horizontally at ${width}`);
    if(width===1536){assert.equal(layout.columns,5);assert(layout.height<220,'Desktop history should remain compact');}
    if(width===375)assert.equal(layout.columns,2,'Mobile should use two columns when they fit');
    const history=await page.$('.rund-photo-history');await history.screenshot({path:path.join(dir,'history-single-'+width+'.png')});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: history shows thumbnails, uploader, reviewer, sources, dates and decisions; protected full-size preview opens and closes by keyboard; own history uses owner routes; upload/approval remain intact; full-width compact history distributes fields into responsive columns with no horizontal overflow at 320/375/600/768/1024/1440/1536 px. Screenshots: .local/rund-photos-preview');
}finally{await browser?.close();await server.close();}
