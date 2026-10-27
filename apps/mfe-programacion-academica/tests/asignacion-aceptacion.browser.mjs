import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
const origin = 'http://127.0.0.1:3126', base = `${origin}/remotes/mfe-programacion-academica/`;
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
const grupo = { idGrupo: '33333333-3333-4333-8333-333333333333', numeroGrupo: 1, estado: 'PROGRAMADO', tipoOferta: 'periodo_regular', cicloInicio: '2050-07-01', cicloFin: '2050-12-01', cupoMaximo: 30, oferta: null, horas: { programadas: 64, requeridas: 64, semanas: 16, excede: false }, estadoFranjas: { PROGRAMADO: 2, PUBLICADA: 0, TOMADA: 0, APROBADA: 0, DEVUELTA: 0 }, docentes: [], franjas: ids.map((idFranja, i) => ({ idFranja, diaSemana: i ? 'MARTES' : 'LUNES', horaInicio: '08:00', horaFin: '10:00', tipoSesion: 'presencial', jornada: 'DIURNA', aulaCodigo: '101', estado: 'PROGRAMADO', idDocente: null })) };
const candidato = { documento: '123', nombre: 'Docente del área', vinculacion: 'Ocasional', perfil: 'Administración pública', titulos: { pregrado: 'Administrador público', especializacion: null, maestria: 'Gestión pública', doctorado: null, posdoctorado: null }, nucleos: [{ area: 'Estado y Poder', origen: 'rund', texto: 'Problemática del Estado y del Poder' }], origenArea: 'rund', horasProgramadas: 96, horasImpacto: 64, tope: 304, cruce: false, motivos: [], avisos: ['Sin situación administrativa registrada en el RUND'], asignable: true };
let item = { idConcertacion: '44444444-4444-4444-8444-444444444444', nivel: 'pregrado', estado: 'POR_ACEPTAR', horas: 64, franjas: [{ idFranja: ids[0], idGrupo: grupo.idGrupo, codigoAsignatura: 'ASIG-0001', asignatura: 'Estado y Poder', horas: 64 }], comentario: null, novedad: null, firmas: [{ rol: 'aprobador', firmadoEn: '2050-07-01T12:00:00Z', modoOtp: 'simulado' }], actualizadaEn: '2050-07-01T12:00:00Z' };
let asignarOk = false, vacio = false, errorNovedad = true, habilitada = true;
const requests = [], errors = [];
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage(); await page.setViewport({ width: 1440, height: 1000 });
  page.on('pageerror', e => errors.push(e.message)); await page.setRequestInterception(true);
  page.on('request', r => {
    const u = new URL(r.url());
    if (!u.pathname.includes('/api/v1/')) return u.origin === origin || u.protocol === 'data:' ? r.continue() : r.abort();
    const route = u.pathname.split('/api/v1/')[1]; let status = 200, data = null;
    if (r.method() !== 'OPTIONS') requests.push({ route, method: r.method(), query: u.search, body: r.postData() ? JSON.parse(r.postData()) : null });
    if (r.method() === 'OPTIONS') data = {};
    else if (route === 'periodos') data = { periodos: [], legado: [], permisos: { crear: false, activar: false, cerrarProgramacion: false, importar: false } };
    else if (route === 'programacion/mis-permisos') data = { ver: [], programar: [], asignar: [], disponibilidad: false };
    else if (route === 'concertacion/configuracion') data = { habilitada, firmaSimulada: true, desdePeriodo: '2026-1', revisionesRequeridas: ['academica'] };
    else if (route === 'concertacion/mia') data = [item];
    else if (route === 'portal-docente/mi-calendario') data = { docente: { idDocente: 'd1', documento: '123', nombre: 'Docente QA', vinculacion: { tipo: 'ocasional', texto: 'Ocasional' } }, periodo: { id: '12', codigo: '2050-2', estado: 'planeacion', fechaInicio: '2050-07-01', fechaFin: '2050-12-01' }, horas: { total: 64, tope: 304 }, horasPorGrupo: { [grupo.idGrupo]: 64 }, franjas: [{ idFranja: ids[0], diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', reservada: false, idGrupo: grupo.idGrupo, numeroGrupo: 1, tipoOferta: 'periodo_regular', cicloInicio: grupo.cicloInicio, cicloFin: grupo.cicloFin, idAsignatura: '1', codigoAsignatura: 'ASIG-0001', asignatura: 'Estado y Poder', programa: 'AP', nivel: 'pregrado', aulaCodigo: '101', tipoSesion: 'presencial', jornada: 'DIURNA', estado: item.estado === 'ACEPTADA' ? 'APROBADA' : 'TOMADA' }] };
    else if (route === `concertacion/${item.idConcertacion}/novedad`) {
      if (errorNovedad) { status = 503; data = { message: 'Servicio temporalmente no disponible' }; }
      else { item = { ...item, estado: 'NOVEDAD', novedad: { ...JSON.parse(r.postData()), creadaEn: '2050-07-02T12:00:00Z' } }; data = item; }
    } else if (route === `concertacion/${item.idConcertacion}/aceptar`) { item = { ...item, estado: 'ACEPTADA' }; data = item; }
    else if (route === 'asignaciones/candidatos') {
      const seleccionadas = u.searchParams.get('franjas').split(',');
      data = { grupo: grupo.idGrupo, franjas: grupo.franjas.filter(f => seleccionadas.includes(f.idFranja)).map(({ idFranja, diaSemana, horaInicio, horaFin }) => ({ idFranja, diaSemana, horaInicio, horaFin, docenteActual: null })), area: { codigo: 'AF-01', nombre: 'Estado y Poder', nucleoAsignatura: 'Estado y poder' }, candidatos: vacio ? [] : [{ ...candidato, horasImpacto: seleccionadas.length * 32 }, { ...candidato, documento: '456', nombre: 'Docente con cruce', vinculacion: 'Cátedra', origenArea: 'puente', nucleos: [{ area: 'Estado y Poder', origen: 'puente', texto: 'Estado y Poder' }], cruce: true, asignable: false, motivos: [{ regla: 'RN-07', mensaje: 'Tiene cruce en la franja seleccionada.' }] }], sugerido: vacio ? null : { documento: '123', nombre: candidato.nombre, razones: ['Es del área Estado y Poder.', 'Tiene la menor carga entre los aptos.'] }, mensaje: vacio ? 'Ningún docente tiene núcleo temático en el área «Estado y Poder».' : null };
    } else if (route === 'asignaciones' && r.method() === 'POST') data = asignarOk ? { asignado: true, avisos: candidato.avisos } : { asignado: false, motivos: [{ regla: 'AREA', mensaje: 'El docente ya no pertenece al área.' }] };
    else { status = 403; data = { message: 'Sin permiso' }; }
    r.respond({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }, body: JSON.stringify(status >= 400 ? data : { success: true, data }) });
  });
  await page.goto(base);
  await page.addStyleTag({ content: await readFile(new URL('../../shell/src/index.css', import.meta.url), 'utf8') });
  await page.evaluate(async ({ base, grupo }) => {
    const ReactModule = await import(`${base}node_modules/.vite/deps/react.js`), React = ReactModule.default;
    const dom = await import(`${base}node_modules/.vite/deps/react-dom_client.js`);
    const { AsignacionAreaModal } = await import(`${base}src/components/AsignacionAreaModal.tsx`);
    const { GruposAsignados } = await import(`${base}src/components/GruposAsignados.tsx`);
    const { ConcertacionDocente } = await import(`${base}src/components/ConcertacionDocente.tsx`);
    const trigger = document.createElement('button'); trigger.textContent = 'Abrir asignación QA'; document.body.append(trigger);
    const host = document.createElement('div'); host.id = 'qa-harness'; document.body.append(host);
    const root = (dom.createRoot ?? dom.default.createRoot)(host);
    window.qaMontar = (tipo, key, concertacionHabilitada = true) => {
      trigger.focus();
      root.render(tipo === 'asignacion' ? React.createElement(AsignacionAreaModal, { key, grupo, asignatura: 'Estado y Poder', retornarFoco: trigger, cerrar: () => root.render(React.createElement('p', null, 'Asignación cerrada')) }) : React.createElement(React.Fragment, { key }, React.createElement(ConcertacionDocente, { idPeriodo: '12', codigoPeriodo: '2050-2', docenteNombre: 'Docente QA' }), React.createElement(GruposAsignados, { idPeriodo: '12', codigoPeriodo: '2050-2', concertacionHabilitada })));
    };
    window.qaMontar('asignacion', 1);
  }, { base, grupo });
  await page.waitForSelector('input[type=radio]');
  assert.equal(await page.$$eval('input[type=checkbox]:checked', e => e.length), 2);
  assert.equal(await page.$$eval('input[type=radio]:disabled', e => e.length), 1);
  assert.ok(await page.$eval('[role=alertdialog] button:last-child', e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), 'Confirmar debe permanecer visible sin recorrer todos los candidatos');
  const texto = await page.$eval('[role=alertdialog]', e => e.textContent);
  for (const t of ['Sugerido', 'menor carga', 'Administrador público', 'Gestión pública', 'RUND', 'Puente', '304', 'cruce']) assert.ok(texto.includes(t), t);
  await page.screenshot({ path: fileURLToPath(new URL('./asignacion-area-ronda3.png', import.meta.url)), fullPage: true });
  await page.click('input[type=checkbox]');
  await page.waitForFunction(() => document.querySelector('[role=alertdialog]').textContent.includes('Impacto: 32'));
  assert.equal(await page.$$eval('article [role=note]', es => es.length), 2);
  await page.click('input[type=radio]:not(:disabled)');
  await page.waitForFunction(() => document.querySelector('[role=alertdialog]').textContent.includes('Al confirmar con Docente del área: Sin situación administrativa registrada en el RUND'));
  assert.equal(await page.$eval('[role=alertdialog] button:last-child', e => e.disabled), false);
  await page.evaluate(() => [...document.querySelectorAll('[role=alertdialog] button')].find(b => b.textContent === 'Confirmar').click());
  await page.waitForFunction(() => document.body.textContent.includes('El docente ya no pertenece al área.'));
  assert.ok(await page.$('[role=alertdialog]'));
  const llamadasAntes = requests.filter(r => r.route === 'asignaciones/candidatos').length;
  assert.equal(llamadasAntes, 2); // el rechazo no invalida la consulta
  asignarOk = true;
  await page.evaluate(() => [...document.querySelectorAll('[role=alertdialog] button')].find(b => b.textContent === 'Confirmar').click());
  await page.waitForFunction(() => document.body.textContent.includes('Asignación cerrada'));
  assert.deepEqual(requests.filter(r => r.route === 'asignaciones').at(-1).body, { idGrupo: grupo.idGrupo, documento: '123', franjas: [ids[1]] });
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Abrir asignación QA');
  vacio = true; await page.evaluate(() => window.qaMontar('asignacion', 2));
  await page.waitForFunction(() => document.body.textContent.includes('Ningún docente tiene núcleo'));
  assert.equal(await page.$('input[type=radio]'), null);
  assert.equal(await page.$eval('[role=alertdialog] button:last-child', e => e.disabled), true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role=alertdialog]'));
  await page.evaluate(() => window.qaMontar('portal', 3));
  await page.waitForFunction(() => document.body.textContent.includes('Aceptar y firmar'));
  await page.waitForFunction(() => [...document.querySelectorAll('#qa-harness span')].some(e => e.textContent.trim() === 'Por aceptar'));
  assert.ok(!(await page.$eval('#qa-harness', e => e.textContent)).includes('Pendiente de concertación'));
  await (await page.$('#qa-harness')).screenshot({ path: fileURLToPath(new URL('./aceptacion-ronda3.png', import.meta.url)) });
  await page.evaluate(() => [...document.querySelectorAll('#qa-harness button')].find(b => b.textContent === 'Reportar novedad').click());
  assert.equal(await page.$eval('[role=alertdialog] button:last-child', e => e.disabled), true);
  await page.select('[role=alertdialog] select', 'movilidad'); await page.type('textarea', 'Viaje académico programado.');
  await page.evaluate(() => [...document.querySelectorAll('[role=alertdialog] button')].find(b => b.textContent === 'Confirmar').click());
  await page.waitForFunction(() => document.body.textContent.includes('Servicio temporalmente no disponible'));
  assert.equal(await page.$eval('textarea', e => e.value), 'Viaje académico programado.');
  errorNovedad = false;
  await page.evaluate(() => [...document.querySelectorAll('[role=alertdialog] button')].find(b => b.textContent === 'Confirmar').click());
  await page.waitForFunction(() => document.body.textContent.includes('Novedad reportada'));
  assert.equal(await page.$$eval('#qa-harness button', e => e.length), 0);
  item = { ...item, estado: 'POR_ACEPTAR', novedad: null };
  await page.evaluate(() => window.qaMontar('portal', 4));
  await page.waitForFunction(() => document.body.textContent.includes('Aceptar y firmar'));
  await page.evaluate(() => [...document.querySelectorAll('#qa-harness button')].find(b => b.textContent === 'Aceptar y firmar').click());
  for (let i = 0; i < 6; i++) await page.type(`[aria-label="Dígito ${i + 1} del código"]`, `${i + 1}`);
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Firmar y aceptar')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Firmar y aceptar')).click());
  await page.waitForFunction(() => document.body.textContent.includes('Aceptada · docencia enviada al PTA'));
  assert.deepEqual(requests.find(r => r.route.endsWith('/aceptar')).body, { codigo: '123456' });
  assert.ok(!requests.some(r => r.route.endsWith('/enviar')));
  habilitada = false; await page.evaluate(() => window.qaMontar('portal', 5, false));
  await page.waitForFunction(() => !document.querySelector('[aria-label="Aceptación de mi programación"]'));
  assert.deepEqual(errors, []);
  console.log('PASS: candidatos reales del contrato, todas/subconjunto, sugerencia, bloqueo, rechazo sin invalidación, vacío, foco/Esc; novedad validada/error preservado, firma/aceptación y apagado.');
} finally { await browser.close(); }
