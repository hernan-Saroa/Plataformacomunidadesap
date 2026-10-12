import assert from 'node:assert/strict';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer';

const urlMfe = 'http://localhost:3126/remotes/mfe-programacion-academica/';
const archivo = join(tmpdir(), `pa-codex-${process.pid}.xlsx`);
await writeFile(archivo, 'Excel simulado; el backend está interceptado.');
const browser = await puppeteer.launch({ headless: true });

const p12 = {
  idPeriodo: '12', modelo: 'plataforma', codigo: '2026-1', anio: 2026, semestre: 1,
  fechaInicio: '2026-01-01', fechaFin: '2026-06-30', estadoPlataforma: 'en_curso',
  programacion: { estado: 'abierta', cerradaEn: null }, programable: true, esActivo: true,
};
const p13 = {
  idPeriodo: '13', modelo: 'plataforma', codigo: '2026-2', anio: 2026, semestre: 2,
  fechaInicio: '2026-07-01', fechaFin: '2026-12-31', estadoPlataforma: 'planeacion',
  programacion: { estado: 'abierta', cerradaEn: null }, programable: true, esActivo: false,
};
const legado = {
  idPeriodo: 'legado-uuid', modelo: 'legado', codigo: '2026-INT', nombre: 'Interperiodo',
  tipo: 'interperiodo', estado: 'planeacion', motivo: 'Pendiente de decisión del negocio',
};
const periodos = [p13, p12];
const permisos = { crear: true, activar: true, cerrarProgramacion: true, importar: true };
const llamadas = [];
const mensajes = [];
let aceptarDialogo = true;
let consultaPeriodos = 0;
let impactoLeido = false;
let crearId = 14;
let validarConErrores = false;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('dialog', async (dialog) => {
    mensajes.push(dialog.message());
    if (aceptarDialogo) await dialog.accept();
    else await dialog.dismiss();
  });
  await page.setRequestInterception(true);
  page.on('request', async (r) => {
    const url = new URL(r.url());
    const ruta = url.pathname;
    if (!ruta.includes('/programacion-academica/api/v1/') && !ruta.includes('/pta/api/v1/')) {
      return url.origin === new URL(urlMfe).origin || url.protocol === 'data:' ? r.continue() : r.abort();
    }
    const tipo = `${r.method()} ${ruta}`;
    llamadas.push({ tipo, query: url.search, body: r.postData() });
    let data = [];
    let status = 200;
    if (ruta.endsWith('/programacion-academica/api/v1/periodos')) {
      consultaPeriodos++;
      data = { periodos, legado: [legado], permisos };
    } else if (/\/publicaciones\/(12|13|14)$/.test(ruta)) {
      const id = ruta.split('/').at(-1);
      data = { idPeriodo: id, total: id === '12' ? 2 : 0, programado: 0,
        publicada: id === '12' ? 2 : 0, tomada: 0, aprobada: 0,
        pendientesCierre: id === '12' ? 2 : 0 };
    } else if (ruta.endsWith('/publicaciones/13/cerrar')) {
      p13.programacion.estado = 'cerrada'; p13.programable = false;
      data = { idPeriodo: '13', total: 0, pendientesCierre: 0 };
    } else if (ruta.endsWith('/publicaciones/12/pendientes-cierre')) {
      data = [{ idFranja: 'f1', diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00',
        estado: 'PUBLICADA', asignatura: 'Pendiente de prueba' }];
    } else if (ruta.endsWith('/periodos-academicos/13/impacto-activacion')) {
      impactoLeido = true;
      data = { codigo: '2026-2', yaActivo: '2026-1', ptasATerminar: 37,
        porPeriodo: [{ codigo: '2026-1', ptas: 35 }, { codigo: '2025-2', ptas: 2 }],
        periodosACerrar: ['2026-1'], periodosAPlaneacion: [], advertencia: null };
    } else if (ruta.endsWith('/periodos-academicos/12/impacto-activacion')) {
      data = { codigo: '2026-1', yaActivo: '2026-2', ptasATerminar: 0,
        porPeriodo: [], periodosACerrar: [], periodosAPlaneacion: ['2026-2'], advertencia: null };
    } else if (ruta.endsWith('/periodos-academicos/13') && r.method() === 'PATCH') {
      if (!impactoLeido || !mensajes.at(-1)?.includes('37 PTA')) status = 409;
      else { p13.estadoPlataforma = 'en_curso'; p13.esActivo = true; p12.esActivo = false; p12.estadoPlataforma = 'cerrado'; }
    } else if (ruta.endsWith('/periodos-academicos') && r.method() === 'POST') {
      const nuevo = JSON.parse(r.postData());
      data = { id: crearId };
      periodos.unshift({ ...p13, idPeriodo: String(crearId++), codigo: `${nuevo.anio}-${nuevo.semestre}`,
        anio: nuevo.anio, semestre: nuevo.semestre, fechaInicio: nuevo.fechaInicio,
        fechaFin: nuevo.fechaFin, estadoPlataforma: 'planeacion', esActivo: false,
        programacion: { estado: 'abierta', cerradaEn: null }, programable: true });
    } else if (ruta.endsWith('/asignaturas-import/upload')) {
      const seco = url.searchParams.get('dry_run') === 'true';
      data = { success: !(seco && validarConErrores), dry_run: seco,
        periodo: url.searchParams.get('periodo_codigo'),
        carga: { asignaturas: { creados: 3, actualizados: 1, omitidos: 2 },
          programas: { creados: 0, actualizados: 1, omitidos: 0 } },
        errores: seco && validarConErrores ? ['Fila 7: código de programa inexistente'] : [],
        advertencias: ['2 filas omitidas por duplicado'], relaciones_cruzadas: [] };
    } else if (ruta.includes('/validacion/')) data = { resumen: { total: 0 }, cruces: [], periodos: [] };
    const body = JSON.stringify(status === 409 ? { message: 'Impacto no confirmado' } : { success: true, data });
    return r.respond({ status, body, contentType: 'application/json', headers: {
      'Access-Control-Allow-Origin': r.headers().origin || new URL(urlMfe).origin,
      'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    } });
  });

  await page.goto(urlMfe, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('select', (el) => el.value), '12');
  const grupos = await page.$$eval('select optgroup', (es) => es.map((e) => e.label));
  assert.deepEqual(grupos, ['Periodos de la plataforma', 'Periodos anteriores al modelo único']);
  await page.evaluate(() => [...document.querySelectorAll('*')]
    .find((e) => !e.children.length && e.textContent === 'Periodos')?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Cargar asignaturas desde Excel'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')]
    .some((button) => button.textContent.includes('Agregar asignatura manualmente en Programas Académicos'))), false);
  assert.equal(await page.$eval('button[title*="pendientes"]', (el) => el.disabled), true);
  assert.equal(await page.$eval('button[title*="pendientes"]', (el) => el.textContent), 'Cerrar programación');
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((e) => e.textContent.includes('Ver pendientes'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Pendiente de prueba'));
  console.log('PASS EFDS-2309 :: cierre visible, deshabilitado con pendientes y acceso a la lista');

  // El permiso de activar viene del servidor; el impacto se lee antes del PATCH.
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((e) => e.textContent.trim() === 'Activar')?.click());
  await page.waitForNetworkIdle();
  assert.ok(mensajes.some((m) => m.includes('37 PTA') && m.includes('2026-1: 35')));
  const impactoIndex = llamadas.findIndex((x) => x.tipo.includes('impacto-activacion'));
  const activarIndex = llamadas.findIndex((x) => x.tipo.includes('PATCH') && x.tipo.includes('periodos-academicos/13'));
  assert.ok(impactoIndex >= 0 && activarIndex > impactoIndex, JSON.stringify(llamadas.map((x) => x.tipo)));
  console.log('PASS EFDS-2312 :: selector y confirmación de activar usan contrato y permiso');

  // Un periodo cerrado también puede reactivarse. Cancelar no debe llamar al PATCH.
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((button) => button.textContent.trim() === 'Activar').length), 1);
  aceptarDialogo = false;
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((button) => button.textContent.trim() === 'Activar')?.click());
  await page.waitForNetworkIdle();
  assert.ok(mensajes.at(-1)?.includes('Activar 2026-1'), mensajes.at(-1));
  assert.ok(mensajes.at(-1)?.includes('actualmente activo 2026-2'));
  assert.ok(mensajes.at(-1)?.includes('pasará a planeación'));
  assert.equal(llamadas.some((x) => x.tipo === 'PATCH /pta/api/v1/periodos-academicos/12'), false);
  aceptarDialogo = true;
  console.log('PASS EFDS-2312 :: periodo cerrado ofrece activar y confirma el impacto sobre el activo actual');

  const consultasAntesDeCerrar = consultaPeriodos;
  aceptarDialogo = false;
  await page.click('button[title="Cerrar solo la programación"]');
  assert.ok(mensajes.at(-1)?.includes('2026-2') && mensajes.at(-1)?.includes('no se puede deshacer'));
  assert.equal(llamadas.some((x) => x.tipo.endsWith('/publicaciones/13/cerrar')), false);
  aceptarDialogo = true;
  await page.click('button[title="Cerrar solo la programación"]');
  await page.waitForFunction(() => document.body.textContent.includes('Programación cerrada'));
  assert.equal(p13.estadoPlataforma, 'en_curso');
  assert.equal(p13.programacion.estado, 'cerrada');
  assert.ok(consultaPeriodos > consultasAntesDeCerrar);
  console.log('PASS EFDS-2309 :: cerrar actualiza solo programación y refresca GET /periodos');

  // Crear debe usar el PTA y hacer que el periodo aparezca en el selector sin recargar.
  await page.evaluate(() => {
    const form = [...document.querySelectorAll('form')].find((x) => x.textContent.includes('Crear periodo'));
    const number = form.querySelector('input[type="number"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(number, '2031'); number.dispatchEvent(new Event('input', { bubbles: true }));
    form.querySelectorAll('input[type="date"]').forEach((e, i) => {
      setter.call(e, i ? '2031-06-30' : '2031-01-01'); e.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  await page.evaluate(() => [...document.querySelectorAll('form button')]
    .find((e) => e.textContent.trim() === 'Crear periodo')?.click());
  await page.waitForFunction(() => [...document.querySelectorAll('select option')].some((e) => e.textContent.includes('2031-1')));
  assert.ok(consultaPeriodos >= 2);
  const creacion = llamadas.find((x) => x.tipo === 'POST /pta/api/v1/periodos-academicos');
  assert.deepEqual(JSON.parse(creacion.body), { anio: 2031, semestre: 1, fechaInicio: '2031-01-01', fechaFin: '2031-06-30' });
  console.log('PASS EFDS-2312 :: el periodo creado aparece sin recargar');

  await page.waitForFunction(() => document.body.textContent.includes('Cargar asignaturas para 2031-1'));
  const picker = await page.$('section[aria-label="Carga masiva 2031-1"] input[type="file"]');
  await picker.uploadFile(archivo);
  validarConErrores = true;
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')]
    .find((e) => e.textContent.includes('Validar archivo'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Fila 7: código de programa inexistente'));
  assert.equal(await page.$eval('section[aria-label="Carga masiva 2031-1"] button:last-of-type', (e) => e.disabled), true);
  console.log('PASS EFDS-2314 :: muestra el motivo de rechazo y bloquea la confirmación');
  validarConErrores = false;
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')]
    .find((e) => e.textContent.includes('Validar archivo'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Confirmar importación'));
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('2 no ingresadas'));
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')]
    .find((e) => e.textContent.includes('Confirmar importación'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Importación terminada'));
  const importaciones = llamadas.filter((x) => x.tipo.includes('/asignaturas-import/upload'));
  assert.deepEqual(importaciones.map((x) => new URLSearchParams(x.query).get('dry_run')), ['true', 'true', 'false']);
  assert.ok(importaciones.every((x) => new URLSearchParams(x.query).get('periodo_codigo') === '2031-1'));
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('agregarla manualmente'));
  console.log('PASS EFDS-2314 :: valida y confirma por el importador existente, con código recibido de GET /periodos');

  permisos.activar = false;
  await page.evaluate(async (base) => {
    const api = await import(`${base}src/services/actualizacionProgramacion.ts`);
    api.invalidarProgramacion('periodos');
  }, urlMfe);
  await page.waitForFunction(() => ![...document.querySelectorAll('button')]
    .some((button) => button.textContent.trim() === 'Activar'));
  console.log('PASS EFDS-2312 :: permiso activar=false oculta también la reactivación');
} finally {
  await browser.close();
  await unlink(archivo);
}
