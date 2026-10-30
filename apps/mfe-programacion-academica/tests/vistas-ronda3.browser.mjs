import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';

const origin = 'http://127.0.0.1:3126';
const base = `${origin}/remotes/mfe-programacion-academica/`;
const periodo = { id: '12', codigo: '2050-2', estado: 'planeacion', fechaInicio: '2050-07-01', fechaFin: '2050-12-15' };
const docente = { idDocente: 'd1', documento: '123', nombre: 'Docente Simulado', vinculacion: { tipo: 'catedra', texto: 'Cátedra' } };
const franja = { idFranja: 'f1', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', tipoSesion: 'presencial', jornada: 'DIURNA', aulaCodigo: '101', estado: 'APROBADA', idDocente: 'd1' };
const grupo = { idGrupo: 'g1', numeroGrupo: 1, estado: 'PROGRAMADO', tipoOferta: 'periodo_regular', cicloInicio: '2050-07-01', cicloFin: '2050-12-01', cupoMaximo: 30, oferta: null, horas: { programadas: null, requeridas: 64, semanas: 16, excede: true }, estadoFranjas: { PROGRAMADO: 1, PUBLICADA: 0, TOMADA: 0, APROBADA: 1, DEVUELTA: 0 }, docentes: [{ ...docente, fraccion: 0.5, horas: null }, { ...docente, idDocente: 'd2', nombre: 'Segunda Docente', vinculacion: { tipo: 'ocasional', texto: 'Ocasional' }, fraccion: 0.5, horas: 32 }], franjas: [franja, { ...franja, idFranja: 'f2', diaSemana: 'DOMINGO', idDocente: null, estado: 'PROGRAMADO' }] };
const arbol = { periodo, resumen: { programas: 1, asignaturas: 1, grupos: 1, franjas: 2, franjasSinDocente: 1 }, programas: [{ idPrograma: '4', codigo: 'AP', nombre: 'Administración Pública', nivel: 'pregrado', tipo: 'profesional', asignaturas: [{ idAsignatura: '1001', codigo: 'ASIG-01001', nombre: 'Historia Política', semestre: 1, creditos: 3, horasClase: 64, area: { id: '2', codigo: 'NT-002', nombre: 'Estado y Poder' }, grupos: [grupo] }] }] };
const visible = { idFranja: 'f1', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00', reservada: false, idGrupo: 'g1', numeroGrupo: 1, tipoOferta: 'periodo_regular', cicloInicio: '2050-07-01', cicloFin: '2050-12-01', idAsignatura: '1001', codigoAsignatura: 'ASIG-01001', asignatura: 'Historia Política', programa: 'Administración Pública', nivel: 'pregrado', aulaCodigo: '101', tipoSesion: 'presencial', jornada: 'DIURNA', estado: 'APROBADA' };
const reservada = Object.fromEntries(Object.keys(visible).map(k => [k, null]));
Object.assign(reservada, { idFranja: 'reservada', diaSemana: 'DOMINGO', horaInicio: '05:00', horaFin: '06:00', reservada: true });
const calendario = { docente, periodo, horas: { total: null, tope: 304 }, horasPorGrupo: { g1: null }, franjas: [visible, reservada] };
const browser = await puppeteer.launch({ headless: true });
const llamadas = [];
let permisos = { ver: ['pregrado'], programar: [], asignar: ['pregrado'], disponibilidad: true };
let errorCalendario = false;
let concertacionEncendida = false, rechazarEnvio = true;
let revisiones = [];
try {
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.setRequestInterception(true);
  page.on('request', r => {
    const u = new URL(r.url());
    if (!u.pathname.includes('/api/v1/')) return u.origin === origin || u.protocol === 'data:' ? r.continue() : r.abort();
    llamadas.push({ path: u.pathname, query: u.search, method: r.method(), body: r.postData() ? JSON.parse(r.postData()) : null });
    let data; let status = 200;
    const path = u.pathname.split('/api/v1/')[1];
    if (path === 'periodos') data = { periodos: [{ idPeriodo: '12', modelo: 'plataforma', codigo: '2050-2', anio: 2050, semestre: 2, fechaInicio: periodo.fechaInicio, fechaFin: periodo.fechaFin, estadoPlataforma: 'planeacion', programacion: { estado: 'abierta', cerradaEn: null }, programable: true, esActivo: false }], legado: [], permisos: { crear: false, activar: false, cerrarProgramacion: false, importar: false } };
    else if (path === 'programacion/mis-permisos') data = permisos;
    else if (path === 'programacion/arbol') data = arbol;
    else if (path === 'programacion/docentes') data = [{ ...docente, horas: null, franjas: 2 }];
    else if (path === 'programacion/docentes/calendario') { data = calendario; if (errorCalendario) status = 503; }
    else if (path === 'portal-docente/mi-calendario') data = { ...calendario, franjas: [visible] };
    else if (path === 'concertacion/configuracion') data = { habilitada: concertacionEncendida, desdePeriodo: concertacionEncendida ? '2026-1' : null, firmaSimulada: true, revisionesRequeridas: [] };
    else if (path === 'concertacion/programador') data = revisiones;
    else if (path === 'concertacion/enviar' && r.method() === 'POST') {
      if (rechazarEnvio) { status = 409; data = null; }
      else { revisiones = [{ idConcertacion: 'c1', documento: '123', docente: 'Docente Simulado', nivel: 'pregrado', estado: 'ENVIADA', horas: 64, numFranjas: 1, comentario: null, novedad: null, actualizadaEn: '2050-07-01T12:00:00Z' }]; data = revisiones; }
    }
    else if (path === 'validacion/vivos') data = { total: 0, grupo: 0, aula: 0, docente: 0, cruces: [] };
    else if (path.startsWith('validacion')) data = { resumen: { total: 0, aula: 0, docente: 0 }, cruces: [], periodos: [] };
    else if (path.startsWith('publicaciones/')) data = { idPeriodo: '12', total: 0, programado: 0, publicada: 0, tomada: 0, aprobada: 0, pendientesCierre: 0 };
    else if (path.includes('jefatura')) { status = 403; data = null; }
    else if (path === 'horarios' || path === 'aulas') data = [];
    else { status = 404; data = null; }
    if (r.method() === 'OPTIONS') { status = 200; data = null; }
    r.respond({ status, headers: { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, contentType: 'application/json', body: JSON.stringify(status >= 400 ? { success: false, message: status === 409 ? 'Defina el ciclo del grupo antes de enviar.' : 'Consulta no disponible' } : { success: true, data }) });
  });
  await page.goto(base);
  await page.waitForFunction(() => document.body.innerText.includes('Programación por programa'));
  await page.waitForSelector('details details details');
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  let texto = await page.evaluate(() => document.body.innerText);
  for (const label of ['Segunda Docente', 'Cátedra', 'Ocasional', 'Sin oferta CETAP', 'Sin docente', 'No disponibles', 'Excede las horas']) assert.ok(texto.includes(label), label);
  assert.ok(!texto.includes('Catálogo Académico'));
  await page.select('[aria-label="Filtrar jornada"]', 'NOCTURNA');
  await page.waitForFunction(() => document.body.innerText.includes('No hay grupos para los filtros'));
  await page.select('[aria-label="Filtrar jornada"]', 'DIURNA');
  await page.waitForSelector('details details details');
  await page.select('[aria-label="Filtrar jornada"]', 'TODAS');
  await page.click('input[type=checkbox]');
  await page.waitForFunction(() => document.body.innerText.includes('Administración Pública'));
  assert.ok(llamadas.some(c => c.query.includes('soloSinDocente=true')));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Disponibilidad Docente')).click());
  await page.waitForFunction(() => document.body.innerText.includes('Docente Simulado'));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Docente Simulado')).click());
  await page.waitForFunction(() => document.body.innerText.includes('Calendario semanal'));
  texto = await page.evaluate(() => document.body.innerText);
  for (const label of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Ocupado', '05:00', 'No disponibles']) assert.ok(texto.includes(label), label);
  assert.equal(await page.$('[title="Eliminar sesión"]'), null);
  assert.ok(llamadas.every(c => ['GET', 'OPTIONS'].includes(c.method)));
  assert.ok(llamadas.some(c => c.path.endsWith('/jefatura/pendientes')), 'apagada conserva la consulta de jefatura');
  await page.addStyleTag({ content: await readFile(new URL('../../shell/src/index.css', import.meta.url), 'utf8') });
  await page.screenshot({ path: new URL('./calendario-ronda3.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  // Monta el mismo componente usado por el portal para verificar la ruta de identidad propia.
  await page.evaluate(async base => {
    const React = await import(`${base}node_modules/.vite/deps/react.js`);
    const ReactDOM = await import(`${base}node_modules/.vite/deps/react-dom_client.js`);
    const { CalendarioDelDocente } = await import(`${base}src/components/DisponibilidadDocente.tsx`);
    const host = document.createElement('div'); document.body.append(host);
    (ReactDOM.createRoot ?? ReactDOM.default.createRoot)(host).render((React.createElement ?? React.default.createElement)(CalendarioDelDocente));
  }, base);
  await page.waitForFunction(() => document.querySelectorAll('[aria-label="Calendario semanal docente"]').length === 2);
  assert.ok(llamadas.some(c => c.path.endsWith('/portal-docente/mi-calendario')));
  errorCalendario = true;
  await page.reload();
  await page.waitForSelector('details');
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Disponibilidad Docente')).click());
  await page.waitForFunction(() => document.body.innerText.includes('Docente Simulado'));
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Docente Simulado')).click());
  await page.waitForSelector('[role=alert]');
  assert.equal(await page.$('[aria-label="Calendario semanal docente"]'), null);
  grupo.oferta = { idOfertaCetap: '77', cetap: { id: '10', codigo: 'CET-01', nombre: 'CETAP Simulado' }, territorial: { codigo: 'DT01', nombre: 'Territorial Simulada' } };
  await page.reload();
  await page.waitForSelector('details details details');
  await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  texto = await page.evaluate(() => document.body.innerText);
  assert.ok(texto.includes('CETAP Simulado') && texto.includes('Territorial Simulada'));
  arbol.programas = []; arbol.resumen = { programas: 0, asignaturas: 0, grupos: 0, franjas: 0, franjasSinDocente: 0 };
  await page.reload();
  await page.waitForFunction(() => document.body.innerText.includes('No hay grupos para los filtros'));
  permisos = { ver: [], programar: [], asignar: [], disponibilidad: false };
  await page.reload();
  await page.waitForFunction(() => document.body.innerText.includes('No tienes permiso para consultar'));
  texto = await page.evaluate(() => document.body.innerText);
  assert.ok(!texto.includes('Disponibilidad Docente'));
  // §23.3: acceso del asignador desde el buscador/calendario existente, con datos §19.
  permisos = { ver: ['pregrado'], programar: [], asignar: ['pregrado'], disponibilidad: true };
  concertacionEncendida = true; errorCalendario = false;
  visible.estado = 'TOMADA'; calendario.horasPorGrupo.g1 = 64;
  const abrirDocente = async () => {
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Disponibilidad Docente')));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Disponibilidad Docente')).click());
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Docente Simulado')));
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('Docente Simulado')).click());
    await page.waitForFunction(() => document.body.innerText.includes('Calendario semanal'));
  };
  const inicioEncendido = llamadas.length;
  await page.reload(); await abrirDocente();
  await page.waitForSelector('[aria-label="Envío a revisión por docente"]');
  assert.ok((await page.$eval('[aria-label="Envío a revisión por docente"]', e => e.textContent)).includes('Historia Política'));
  assert.ok((await page.$eval('[aria-label="Envío a revisión por docente"]', e => e.textContent)).includes('64 h'));
  const enviar = () => page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Enviar a revisión').click());
  const antesRechazo = llamadas.filter(c => c.path.endsWith('/concertacion/programador')).length;
  await enviar();
  await page.waitForFunction(() => document.body.innerText.includes('Defina el ciclo del grupo'));
  assert.equal(llamadas.filter(c => c.path.endsWith('/concertacion/programador')).length, antesRechazo);
  rechazarEnvio = false; await enviar();
  await page.waitForFunction(() => document.body.innerText.includes('Docencia de Docente Simulado enviada a revisión.'));
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Enviar a revisión' && b.disabled));
  assert.deepEqual(llamadas.filter(c => c.path.endsWith('/concertacion/enviar')).at(-1).body, { idPeriodo: '12', documento: '123' });
  assert.ok((await page.$eval('[aria-label="Envío a revisión por docente"]', e => e.textContent)).includes('En revisión'));
  assert.ok(!llamadas.slice(inicioEncendido).some(c => c.path.endsWith('/jefatura/pendientes')), 'encendida no consulta la aprobación heredada');
  await page.addStyleTag({ content: await readFile(new URL('../../shell/src/index.css', import.meta.url), 'utf8') });
  await page.screenshot({ path: new URL('./envio-revision-docente.png', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true });
  concertacionEncendida = false;
  await page.reload(); await abrirDocente();
  assert.equal(await page.$('[aria-label="Envío a revisión por docente"]'), null);
  concertacionEncendida = true; permisos.asignar = [];
  await page.reload(); await abrirDocente();
  assert.equal(await page.$('[aria-label="Envío a revisión por docente"]'), null);
  assert.deepEqual(errores, []);
  console.log('PASS: árbol, múltiples docentes, pendientes, permisos, horas null, calendario lunes-domingo, reserva privada, modo lectura, calendario propio, error 503, CETAP/territorial y vacío.');
} finally { await browser.close(); }
