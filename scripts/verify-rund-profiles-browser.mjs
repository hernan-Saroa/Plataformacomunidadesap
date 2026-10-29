// Real UI components, fixture APIs only. No accounts, role assignments or business writes.
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react-swc';
import puppeteer from 'puppeteer';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const api = `
const profiles=['carga','revision','incorporacion'].map((suffix,index)=>({id:suffix,code:'banco-docentes.rund.'+suffix,name:['RUND · Cargador GGP','RUND · Revisor GGP','RUND · Responsable de incorporación'][index],description:'Facultades del perfil de prueba',is_active:true}));
const legacy={id:'legacy',code:'banco-docentes.rund.documents.manage',name:'Permiso granular anterior',is_active:true};
const other={id:'other',code:'personas.view',name:'Consultar personas',is_active:true};
window.fixtureSaves=[];
export const modulesService={getModulesWithPermissions:async()=>[{id:'gestion-profesoral',name:'RUND',icon:'GraduationCap',permissions:[...profiles,legacy]},{id:'personas',name:'Personas',icon:'Users',permissions:[other]}],mapToPermissionModules:modules=>modules};
export const rolesService={getRolePermissions:async()=>[legacy,other],updateRolePermissions:async(id,permissions)=>{window.fixtureSaves.push({id,permissions});return {};}};
export const apiClient={post:async(url,body)=>{window.fixtureSaves.push({url,body});return {success:true,data:{changed:true}};}};
`;
const entry = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {RolePermissionsEditor} from '/apps/mfe-gestion-personas/src/components/admin/RolePermissionsEditor.tsx';
import {RundIncorporationPanel} from '/apps/mfe-pta/src/components/pta/banco-docentes/RundIncorporationPanel.tsx';
function Fixture(){const [open,setOpen]=useState(true);return new URLSearchParams(location.search).has('incorporacion')
? React.createElement(RundIncorporationPanel,{docenteId:'docente-ficticio',block:{version:2,soportes:[{id:'support',tipo_soporte:'contrato',documento_perfil_id:'version',nombre_archivo:'contrato-ficticio.pdf',estado:'Pendiente'}]},fields:[],onSaved:()=>{window.fixtureRefreshed=true;}})
:React.createElement(RolePermissionsEditor,{open,onOpenChange:setOpen,role:{id:'rol-ficticio',name:'Rol de prueba',code:'CUSTOM',icon:'Shield',color:'#003DA5'}});}
createRoot(document.getElementById('root')).render(React.createElement(Fixture));
`;
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { host: '127.0.0.1', port: 0 }, plugins: [{
  name: 'rund-profiles-fixture', enforce: 'pre',
  resolveId(source) {
    if (source.endsWith('/services/api') || source.endsWith('/services/api/modules.service')) return '\0fixture-api';
    if (source === '/fixture-entry.js') return '\0fixture-entry';
  },
  load(id) { if (id === '\0fixture-api') return api; if (id === '\0fixture-entry') return entry; },
  configureServer(dev) { dev.middlewares.use('/profiles-fixture', async (_req, res) => {
    const html = await dev.transformIndexHtml('/profiles-fixture', '<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/build/remotes/mfe-gestion-personas/assets/style-wYk69dUR.css"><style>body{font-family:Arial,sans-serif;background:#f1f5f9;margin:24px}button,input,textarea,select{font-family:inherit}</style></head><body><div id="root"></div><script type="module" src="/fixture-entry.js"></script></body></html>');
    res.setHeader('Content-Type', 'text/html'); res.end(html);
  }); },
}, react()] });
let browser;
try {
  await server.listen(); browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.setDefaultTimeout(60000); page.on('pageerror', error => errors.push(error.message));
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  await page.setRequestInterception(true);
  page.on('request', request => request.url().startsWith(origin) || /^(data:|blob:)/.test(request.url()) ? request.continue() : request.abort());
  await page.setViewport({ width: 1440, height: 1000 });
  const click = text => page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.includes(text))?.click(), text);
  await page.goto(origin + '/profiles-fixture', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.textContent.includes('RUND · Responsable de incorporación'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')].filter(button => /RUND · (Cargador GGP|Revisor GGP|Responsable de incorporación)/.test(button.textContent)).length), 3);
  assert.equal(await page.evaluate(() => document.body.textContent.includes('Permiso granular anterior')), false);
  await click('Consultar personas'); await click('Guardar Permisos');
  await page.waitForFunction(() => window.fixtureSaves.length === 1);
  assert.deepEqual((await page.evaluate(() => window.fixtureSaves[0].permissions)).sort(), ['legacy']);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.textContent.includes('RUND · Revisor GGP'));
  await click('RUND · Revisor GGP'); await click('Guardar Permisos');
  await page.waitForFunction(() => window.fixtureSaves.length === 1);
  assert.deepEqual((await page.evaluate(() => window.fixtureSaves[0].permissions)).sort(), ['other', 'revision']);
  await page.goto(origin + '/profiles-fixture?incorporacion', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=date]');
  await page.evaluate(() => {
    const set = (element, value) => { Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(element, value); element.dispatchEvent(new Event('input', { bubbles: true })); };
    set(document.querySelector('input:not([type=date])'), 'CONTRATO FICTICIO 2026');
    set(document.querySelector('input[type=date]'), '2026-01-01');
    set(document.querySelector('textarea'), 'Registro de prueba con soporte.');
  });
  await page.waitForFunction(() => !document.querySelector('button[type=submit]').disabled);
  await click('Guardar datos de contratación');
  await page.waitForFunction(() => window.fixtureRefreshed === true);
  const saved = await page.evaluate(() => window.fixtureSaves[0]);
  assert(saved.url.endsWith('/incorporacion')); assert.equal(saved.body.numeroContrato, 'CONTRATO FICTICIO 2026');
  assert.equal(saved.body.blockVersion, 2); assert(!('estado' in saved.body)); assert(!('escalafon' in saved.body));
  const artifacts = path.join(root, '.local/rund-profiles-preview'); await fs.mkdir(artifacts, { recursive: true });
  await page.screenshot({ path: path.join(artifacts, 'contratacion.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log('RUND navegador: tres permisos visibles; conserva accesos anteriores al editar otro módulo; sustituye al elegir perfil; contratación acotada y refresco verificados. API ficticia, sin escrituras de negocio.');
} finally { await browser?.close(); await server.close(); }
