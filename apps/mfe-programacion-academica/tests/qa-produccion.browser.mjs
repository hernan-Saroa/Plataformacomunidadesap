import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer';

if (!process.env.PA_QA_PREVIEW_URL) throw Error('Falta PA_QA_PREVIEW_URL (preview del arnés construido, no Vite dev).');
const base = process.env.PA_QA_PREVIEW_URL;
const salida = new URL('./evidencia-qa/', import.meta.url); fs.mkdirSync(salida, { recursive: true });
const resultados = [];
import { preparar, franja, click, campo, abrirGrupo } from './qa-fixtures.mjs';
for (const idioma of ['es-CO','en-US']) {
  const browser = await puppeteer.launch({ headless: true, args: [`--lang=${idioma}`] });
  try {
    for (const zona of ['America/Bogota','UTC']) for (const [width,height] of [[1920,1080],[1366,768],[1280,720],[390,844]]) {
      const page = await browser.newPage(), estado = { llamadas: [], sesiones: [franja('f1')], horas: 32, conflicto: false };
      await page.setViewport({width,height}); await page.emulateTimezone(zona);
      await (await page.createCDPSession()).send('Emulation.setLocaleOverride',{locale:idioma});
      await page.setExtraHTTPHeaders({'Accept-Language':idioma});
      const errores = await preparar(page,estado);
      await page.goto(base); await abrirGrupo(page);
      const rect = await page.$eval('[aria-label="Cerrar panel de grupos"]', e => { const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}; });
      assert.ok(rect.x>=0 && rect.y>=0 && rect.right<=width && rect.bottom<=height);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth), 'sin desborde del documento');
      assert.ok((await page.$eval('[role="dialog"]', e=>e.innerText)).includes('solo se dicta en Sede Central'));
      await click(page,'Agregar sesión'); await page.waitForSelector('input[aria-label="Inicio"]');
      assert.equal(await page.$eval('input[aria-label="Inicio"]',e=>e.type),'text'); assert.equal(await page.$('input[type="time"]'),null);
      for (const [nombre,valor] of [['Inicio','18:15'],['Fin','19:15']]) { await page.click(`input[aria-label="${nombre}"]`,{clickCount:3}); await page.keyboard.type(valor); }
      if (idioma==='es-CO' && zona==='America/Bogota' && width===1366) await page.screenshot({path:new URL('sesion-hora24.png',salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
      await page.click('button[aria-label="Miércoles"]'); await click(page,'Validar días');
      await page.waitForFunction(()=>document.body.innerText.includes('Validación por día'));
      await click(page,'Agregar sesiones'); await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
      const carga=estado.llamadas.find(c=>c.ruta==='horarios/lote'&&c.method==='POST').body;
      assert.equal(carga.horaInicio,'18:15');assert.equal(carga.horaFin,'19:15');assert.deepEqual(carga.dias,['LUNES','MIERCOLES']);
      await campo(page,'input[type="date"]','2027-01-05'); await page.click('[aria-label="Cerrar panel de grupos"]');
      await page.waitForSelector('[role="alertdialog"]'); await click(page,'Cancelar'); assert.equal(await page.$eval('input[type="date"]',e=>e.value),'2027-01-05');
      if(idioma==='es-CO'&&zona==='America/Bogota') await page.screenshot({path:new URL(`panel-${width}x${height}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
      await page.keyboard.press('Escape'); await click(page,'Confirmar'); await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'));
      assert.ok(await page.evaluate(()=>document.activeElement.tagName==='BUTTON' && document.activeElement.textContent.includes('Constitución Del Territorio')));
      assert.deepEqual(errores,[]);resultados.push({idioma,zona,width,height,resultado:'PASS'});await page.close();
    }
    const page=await browser.newPage(), estado={llamadas:[],sesiones:[franja('f1')],horas:32,rechazar:true};await preparar(page,estado);
    for(const perfil of ['Docente','Revisor','Aprobador']) {
      await page.goto(`${base}?vista=calendario&perfil=${perfil}`);await page.waitForSelector('button[aria-expanded="true"]');await page.click('button[aria-expanded]');
      assert.ok(await page.$eval('[hidden]',e=>e.hidden));if(idioma==='es-CO') await page.screenshot({path:new URL(`calendario-contraido-${perfil}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});assert.ok((await page.evaluate(()=>document.body.innerText)).includes('Tope: 800'));await page.click('button[aria-expanded]');assert.equal(await page.$('div[hidden]'),null);
    }
    await page.goto(`${base}?vista=asignacion`);await page.waitForFunction(()=>document.body.innerText.includes('Docente Bloqueado'));
    await page.screenshot({path:new URL(`candidatos-bloqueados-${idioma}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
    assert.equal(await page.$$eval('article',es=>es.length),3);assert.ok((await page.evaluate(()=>document.body.innerText)).includes('CRUCE:'));
    await page.evaluate(()=>{const es=[...document.querySelectorAll('input[type=checkbox]')];es[1].click();});
    await page.waitForFunction(()=>[...document.querySelectorAll('input[type=radio]')].some(e=>!e.disabled));await page.click('input[type=radio]');await click(page,'Añadir al reparto y elegir otro docente');
    await page.waitForFunction(()=>[...document.querySelectorAll('input[type=radio]')].some(e=>!e.disabled));await page.$$eval('input[type=radio]',es=>es[1].click());await click(page,'Confirmar');
    await page.waitForFunction(()=>document.body.innerText.includes('El tope cambió'));assert.ok(await page.$('[role=alertdialog]'));estado.rechazar=false;await click(page,'Confirmar');
    await page.waitForFunction(()=>document.body.dataset.cerrado==='si');const a=estado.llamadas.filter(c=>c.ruta==='asignaciones/multiple').at(-1).body;
    assert.deepEqual(a,{idGrupo:'g1',asignaciones:[{documento:'123',franjas:['f1']},{documento:'456',franjas:['f2']}]});
    await page.screenshot({path:new URL(`reparto-${idioma}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
    await page.goto(`${base}?vista=periodos`);await page.waitForFunction(()=>document.body.innerText.includes('2027-1'));
    assert.equal(await page.$('form'),null);assert.equal(await page.$('input'),null);assert.ok(await page.$('a[href*="module=programacion-academica"]'));
    await page.screenshot({path:new URL(`periodos-consulta-${idioma}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
    await page.goto(base); await abrirGrupo(page); estado.bloqueada=true;
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Editar sesión')).click());
    await campo(page,'input[aria-label="Fin"]','20:15'); await click(page,'Guardar cambios');await page.waitForSelector('[role="alertdialog"]');
    assert.equal(estado.llamadas.filter(c=>c.ruta==='horarios/f1'&&c.method==='PATCH').length,1);
    await page.screenshot({path:new URL(`editar-devolucion-${idioma}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
    await click(page,'Confirmar');await page.waitForFunction(()=>document.querySelectorAll('[role="dialog"]').length===1);
    assert.equal(estado.llamadas.filter(c=>c.ruta==='horarios/f1'&&c.method==='PATCH').at(-1).body.confirmarDevolucion,true);
    await page.waitForSelector('button[aria-label^="Eliminar"]');
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Eliminar sesión')).click());await page.waitForSelector('[role="alertdialog"]');
    assert.equal(estado.llamadas.filter(c=>c.method==='DELETE').length,0);await click(page,'Confirmar');await page.waitForFunction(()=>document.body.innerText.includes('0h programadas'));
    estado.conflicto=true;await click(page,'Agregar sesión');await page.click('button[aria-label="Miércoles"]');await click(page,'Validar días');await page.waitForFunction(()=>document.body.innerText.includes('El aula tiene cruce el miércoles'));
    assert.equal(estado.llamadas.filter(c=>c.ruta==='horarios/lote'&&c.method==='POST').length,0);
    await page.screenshot({path:new URL(`conflictos-dias-${idioma}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
    estado.sesiones=[{...franja('f1'),estado:'APROBADA'}];estado.horas=32;await page.goto(base);await abrirGrupo(page);
    await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Editar sesión')).click());
    assert.ok((await page.evaluate(()=>document.body.innerText)).includes('Debe reabrirse antes de modificarla'));
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='Guardar cambios').disabled),true);
    await page.screenshot({path:new URL(`sesion-aprobada-${idioma}.png`,salida).pathname.replace(/^\/(\w:)/,'$1'),fullPage:true});
    for(const [tipo,anio] of [['1',2030],['personalizado',2031]]) {
      await page.goto(`${base}?vista=crearperiodos`);await page.waitForSelector('form select[aria-label="Tipo de periodo"]');
      await campo(page,'form input[type="number"]',String(anio));await page.select('form select[aria-label="Tipo de periodo"]',tipo);
      await campo(page,'form input[type="date"]',`${anio}-01-01`);await page.$$eval('form input[type="date"]',(es,valor)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(es[1],valor);es[1].dispatchEvent(new Event('input',{bubbles:true}));},`${anio}-06-30`);
      if(tipo==='personalizado'){await campo(page,'input[placeholder="INT"]','INT');await campo(page,'input[placeholder*="Interperiodo"]',`Interperiodo ${anio}`);}
      await page.click('form button[type="submit"]');await page.waitForNetworkIdle({idleTime:150});
      await page.waitForFunction(()=>!document.querySelector('form button[type="submit"]').disabled);
      const enviado=estado.llamadas.filter(c=>c.ruta==='periodos-academicos'&&c.method==='POST').at(-1)?.body;
      assert.ok(enviado);assert.equal(enviado.anio,anio);assert.equal(enviado.fechaInicio,`${anio}-01-01`);
      if(tipo==='personalizado'){assert.equal(enviado.tipo,'personalizado');assert.equal(enviado.codigo,'2031-INT');assert.equal(enviado.semestre,undefined);}else assert.equal(enviado.semestre,1);
      await page.waitForFunction(codigo => [...document.querySelectorAll('span')].some(e => e.textContent === codigo), {}, enviado.codigo ?? `${anio}-${enviado.semestre}`);
    }
    estado.horas=32;estado.errorOferta=true;await page.goto(base);await abrirGrupo(page);assert.ok((await page.evaluate(()=>document.body.innerText)).includes('El servicio de ofertas no está disponible'));
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Crear grupos').disabled),false);
    estado.vacio=true;await page.goto(base);await page.waitForFunction(()=>document.body.innerText.includes('periodo')&&!document.body.innerText.includes('Cargando programas'));
    resultados.push({idioma,casos:'calendario de tres perfiles, lista bloqueados, reparto atómico/rechazo, periodos solo consulta',resultado:'PASS'});await page.close();
  } finally {await browser.close();}
}
fs.writeFileSync(new URL('resultado.json',salida),JSON.stringify({modo:'production build + vite preview, APIs interceptadas; no es despliegue remoto de QA',resultados},null,2));
console.log(`PASS: ${resultados.length} escenarios de producción simulada`);
