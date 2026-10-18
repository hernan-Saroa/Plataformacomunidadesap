import assert from 'node:assert/strict';
import { writeFile, unlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import puppeteer from 'puppeteer';

const urlMfe = 'http://127.0.0.1:3126/remotes/mfe-programacion-academica/';
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
let consultaPeriodos = 0;
let impactoLeido = false;
let crearId = 14;
let validarConErrores = false;

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  page.on('dialog', async (dialog) => { mensajes.push(dialog.message()); await dialog.dismiss(); });
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
    } else if (ruta.endsWith('/programacion-academica/api/v1/aulas')) {
      data = [
        { codigo: 'A-101', nombre: 'Aula 101', sedeCodigo: 'SC', capacidad: 40, provisional: false, tipo: 'aula', piso: 1, territorial: { codigo: 'SC', nombre: 'Sede Central' }, cetap: { codigo: 'CET-0288', nombre: 'Sede Central' }, idOfertaCetap: null },
        { codigo: 'A-202', nombre: 'Aula 202', sedeCodigo: 'HUI', capacidad: 30, provisional: false, tipo: 'aula', piso: 2, territorial: { codigo: 'HUI', nombre: 'Huila' }, cetap: { codigo: 'CET-0135', nombre: 'Neiva' }, idOfertaCetap: null },
      ];
    } else if (ruta.includes('/aulas/') && ruta.endsWith('/disponibilidad')) {
      data = { aula: ruta.split('/').at(-2), ocupada: [] };
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
        periodosACerrar: ['2026-1'], periodosAPlaneacion: [], advertencia: 'Advertencia del servidor: los PTA de 2025-2 también quedarán terminados; revisa su impacto antes de confirmar.' };
    } else if (ruta.endsWith('/periodos-academicos/12/impacto-activacion')) {
      data = { codigo: '2026-1', yaActivo: '2026-2', ptasATerminar: 0,
        porPeriodo: [], periodosACerrar: [], periodosAPlaneacion: ['2026-2'], advertencia: null };
    } else if (ruta.endsWith('/periodos-academicos/13') && r.method() === 'PATCH') {
      if (!impactoLeido) status = 409;
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
      data = { success: true, dry_run: seco,
        periodo: url.searchParams.get('periodo_codigo'),
        carga: { asignaturas: { creados: 3, actualizados: 1, omitidos: 2, sin_cambios: 2, rechazadas: 0 },
          programas: { creados: 0, actualizados: 1, omitidos: 0 },
          ofertas_cetap_programa: { creados: 325, actualizados: 0, omitidos: 0 } },
        ofertas: { por_crear: 325, ya_existentes: 0, rechazadas: 0, detalle: Array.from({ length: 325 }, (_, i) => ({
          codigo_cetap: i === 0 ? 'CET-0288' : i === 1 ? 'CET-0135' : `CET-${String(i + 1).padStart(4, '0')}`,
          nombre_cetap: i === 0 ? 'Sede Central' : i === 1 ? 'Neiva' : `CETAP ${i + 1}`,
          codigo_programa: i < 160 ? 'PRO-001' : 'PRO-002',
          nombre_programa: i < 160 ? 'Administración Pública' : 'Administración Pública - Nocturno',
          estado: 'por_crear',
        })) },
        ...(seco ? {} : { resumen_periodo: { programas: 14, asignaturas: 427, cetaps: 271, ofertas: 325 } }),
        errores: [], advertencias: [], relaciones_cruzadas: [] };
      if (seco && validarConErrores) { status = 400; data = { success: false, message: 'Validación del Excel fallida (Reglas bloqueantes R1-R6).', errors: ['ASIGNATURAS fila 7: código de programa inexistente.'] }; }
    } else if (ruta.includes('/validacion/')) data = { resumen: { total: 0 }, cruces: [], periodos: [] };
    const body = JSON.stringify(status === 409 ? { message: 'Impacto no confirmado' } : ruta.endsWith('/asignaturas-import/upload') ? data : { success: true, data });
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
  await page.waitForSelector('[role="alertdialog"]');
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('37 PTA'));
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('2026-1: 35 PTA'));
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('los PTA de 2025-2 también quedarán terminados; revisa su impacto antes de confirmar.'));
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Cancelar');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Tab');
  await page.keyboard.up('Shift');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Confirmar');
  assert.equal(mensajes.length, 0);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'));
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), 'Activar');
  assert.equal(llamadas.some((x) => x.tipo === 'PATCH /pta/api/v1/periodos-academicos/13'), false);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((e) => e.textContent.trim() === 'Activar')?.click());
  await page.waitForSelector('[role="alertdialog"]');
  await page.evaluate(() => [...document.querySelectorAll('[role="alertdialog"] button')].find((e) => e.textContent === 'Confirmar')?.click());
  await page.waitForFunction(() => !document.querySelector('[role="alertdialog"]'));
  const impactoIndex = llamadas.findIndex((x) => x.tipo.includes('impacto-activacion'));
  const activarIndex = llamadas.findIndex((x) => x.tipo.includes('PATCH') && x.tipo.includes('periodos-academicos/13'));
  assert.ok(impactoIndex >= 0 && activarIndex > impactoIndex, JSON.stringify(llamadas.map((x) => x.tipo)));
  console.log('PASS EFDS-2312 :: selector y confirmación de activar usan contrato y permiso');

  // Un periodo cerrado también puede reactivarse. Cancelar no debe llamar al PATCH.
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('button')]
    .filter((button) => button.textContent.trim() === 'Activar').length), 1);
  await page.evaluate(() => [...document.querySelectorAll('button')]
    .find((button) => button.textContent.trim() === 'Activar')?.click());
  await page.waitForSelector('[role="alertdialog"]');
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('periodo activo actual 2026-2'));
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('pasará a planeación'));
  await page.evaluate(() => [...document.querySelectorAll('[role="alertdialog"] button')].find((e) => e.textContent === 'Cancelar')?.click());
  assert.equal(llamadas.some((x) => x.tipo === 'PATCH /pta/api/v1/periodos-academicos/12'), false);
  console.log('PASS EFDS-2312 :: periodo cerrado ofrece activar y confirma el impacto sobre el activo actual');

  const consultasAntesDeCerrar = consultaPeriodos;
  await page.click('button[title="Cerrar solo la programación"]');
  await page.waitForSelector('[role="alertdialog"]');
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('2026-2'));
  assert.ok((await page.$eval('[role="alertdialog"]', (e) => e.textContent)).includes('no se puede deshacer'));
  assert.equal(llamadas.some((x) => x.tipo.endsWith('/publicaciones/13/cerrar')), false);
  await page.evaluate(() => [...document.querySelectorAll('[role="alertdialog"] button')].find((e) => e.textContent === 'Cancelar')?.click());
  await page.click('button[title="Cerrar solo la programación"]');
  await page.evaluate(() => [...document.querySelectorAll('[role="alertdialog"] button')].find((e) => e.textContent === 'Confirmar')?.click());
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

  await page.waitForFunction(() => document.body.textContent.includes('Cargar asignaturas y oferta para 2031-1'));
  const picker = await page.$('section[aria-label="Carga masiva 2031-1"] input[type="file"]');
  await picker.uploadFile(archivo);
  validarConErrores = true;
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')]
    .find((e) => e.textContent.includes('Validar archivo'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('ASIGNATURAS fila 7: código de programa inexistente'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')].some((e) => e.textContent.includes('Importar ahora'))), false);
  console.log('PASS EFDS-2314 :: muestra el motivo de rechazo y bloquea la confirmación');
  validarConErrores = false;
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')]
    .find((e) => e.textContent.includes('Validar archivo'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Importar ahora'));
  await page.waitForFunction(() => document.activeElement?.textContent === 'Importar ahora');
  if (process.env.PA_SCREENSHOT) {
    await page.addStyleTag({ content: await readFile(join(process.cwd(), '../shell/src/index.css'), 'utf8') });
    await page.screenshot({ path: process.env.PA_SCREENSHOT, fullPage: true });
  }
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('el Excel todavía no se ha importado'));
  assert.equal(llamadas.filter((x) => x.tipo.includes('/asignaturas-import/upload') && new URLSearchParams(x.query).get('dry_run') === 'false').length, 0);
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('Sin cambios2'));
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('Ofertas por crear325'));
  await page.evaluate(() => document.querySelector('section[aria-label="Carga masiva 2031-1"] details summary')?.click());
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"] details', (e) => e.textContent)).includes('Neiva'));
  await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')]
    .find((e) => e.textContent.includes('Importar ahora'))?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Importación terminada: los datos ya se guardaron para 2031-1'));
  await page.waitForFunction(() => document.activeElement?.textContent?.includes('Importación terminada: los datos ya se guardaron para 2031-1'));
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('Quedaron en el periodo: 14 programas, 427 asignaturas, 271 CETAP y 325 ofertas'));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Carga masiva 2031-1"] button')].some((e) => e.textContent.includes('Importar ahora'))), false);
  const importaciones = llamadas.filter((x) => x.tipo.includes('/asignaturas-import/upload'));
  assert.deepEqual(importaciones.map((x) => new URLSearchParams(x.query).get('dry_run')), ['true', 'true', 'false']);
  assert.ok(importaciones.every((x) => new URLSearchParams(x.query).get('periodo_codigo') === '2031-1'));
  assert.ok((await page.$eval('section[aria-label="Carga masiva 2031-1"]', (e) => e.textContent)).includes('agregar una asignatura manualmente'));
  console.log('PASS EFDS-2314 :: valida y confirma por el importador existente, con código recibido de GET /periodos');

  await page.evaluate(() => [...document.querySelectorAll('*')]
    .find((e) => !e.children.length && e.textContent === 'Disponibilidad de Aulas')?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Filtrar por territorial'));
  assert.ok((await page.$eval('table', (el) => el.textContent)).includes('Territorial'));
  assert.ok((await page.$eval('table', (el) => el.textContent)).includes('CETAP'));
  await page.evaluate(() => {
    const combo = [...document.querySelectorAll('select')].find((el) => el.parentElement?.textContent.includes('Filtrar por territorial'));
    combo.value = 'HUI'; combo.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForFunction(() => [...document.querySelectorAll('table tbody tr')].some((row) => row.textContent.includes('Neiva')));
  assert.equal(await page.evaluate(() => [...document.querySelectorAll('table tbody tr')].some((row) => row.textContent.includes('Sede Central'))), false);
  console.log('PASS EFDS-1374 :: aulas muestran territorial/CETAP y aplican filtro combinado');

  await page.evaluate(() => [...document.querySelectorAll('*')]
    .find((e) => !e.children.length && e.textContent === 'Periodos')?.click());
  await page.waitForFunction(() => document.body.textContent.includes('Cargar asignaturas desde Excel'));

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
