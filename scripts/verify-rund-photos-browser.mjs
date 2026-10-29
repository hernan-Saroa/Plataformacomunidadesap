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
window.fixture={published:approved,current: {id:'approved',estado:'APROBADA'},candidate:{id:'pending',estado:'PENDIENTE',nombre:'123456.png',origen:'PTA',creado_en:'2026-10-01T12:00:00Z',ancho:600,alto:600},decisions:[]};
const status=()=>({personaId:'person',publicada:window.fixture.current,solicitud:window.fixture.candidate,historial:[window.fixture.candidate]});
export const apiClient={get:async url=>url.endsWith('/publicada')?{id:window.fixture.current.id,url:window.fixture.published}:url.includes('/versiones/')?{url:candidate}:status(),post:async(url,body)=>{window.fixture.decisions.push({url,body});window.fixture.candidate={...window.fixture.candidate,estado:body.estado,observacion:body.observacion};if(body.estado==='APROBADA'){window.fixture.current=window.fixture.candidate;window.fixture.published=candidate;}return status();},upload:async()=>{window.fixture.candidate={...window.fixture.candidate,id:'second',estado:'PENDIENTE'};return status();}};
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
  const published=await page.$eval('img[alt="Foto de Docente de prueba"]',img=>img.src);
  const proposed=await page.$eval('img[alt="Foto propuesta para revisión"]',img=>img.src);
  assert.notEqual(published,proposed);
  assert(await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Rechazar foto')).disabled));
  for(const width of [1440,768,375,320]){
    await page.setViewport({width,height:1000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow at ${width}`);
    await page.screenshot({path:path.join(dir,'identity-'+width+'.png'),fullPage:true});
  }
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Aprobar foto')).click());
  await page.waitForFunction(()=>document.body.textContent.includes('Foto aprobada y publicada'));
  await page.waitForFunction(src=>document.querySelector('img[alt="Foto de Docente de prueba"]').src===src,{},proposed);
  assert.equal(await page.evaluate(()=>window.fixture.decisions[0].body.estado),'APROBADA');
  await page.goto(origin+'/photo-fixture?own');await page.waitForSelector('input[type=file]');
  assert(!(await page.evaluate(()=>document.body.textContent.includes('Aprobar foto'))));
  const before=await page.$eval('img[alt="Foto de Docente de prueba"]',img=>img.src);
  await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=600;c.toBlob(blob=>{const dt=new DataTransfer();dt.items.add(new File([blob],'new.png',{type:'image/png'}));const input=document.querySelector('input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});});
  await page.waitForFunction(()=>document.body.textContent.includes('Foto enviada. Queda pendiente'));
  assert.equal(await page.$eval('img[alt="Foto de Docente de prueba"]',img=>img.src),before);
  await page.screenshot({path:path.join(dir,'pta-pending-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: approval updates published avatars; PTA upload preserves approved image; rejection requires reason; reviewer actions absent in PTA; no horizontal overflow at 320/375/768/1440 px. Screenshots: .local/rund-photos-preview');
}finally{await browser?.close();await server.close();}
