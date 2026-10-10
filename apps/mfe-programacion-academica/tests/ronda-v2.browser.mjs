import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

// Ejecutar con Vite en 3126 y el parche del módulo compartido aplicado.
// Todas las peticiones de negocio se interceptan: ninguna llega al servidor real.
const base = 'http://localhost:3126/remotes/mfe-programacion-academica/';
const browser = await puppeteer.launch({ headless: true });
const resultados = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  let grupo = { idGrupo: 'g1', numeroGrupo: 1, fechaInicio: null, fechaFin: null };
  let rechazar = false;
  let lecturasGrupo = 0;
  let lecturasProgramacion = 0;
  const franjas = ['DIURNA', 'DISTANCIA', 'FIN_DE_SEMANA'].map((jornada, i) => ({
    idFranja: `franja-${i}`, idGrupo: 'g1', numeroGrupo: 1, jornada,
    asignatura: `Materia ${jornada}`, programa: 'Programa de prueba',
    diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00',
    tipoSesion: 'mediada_tecnologia', estado: 'PROGRAMADO',
    periodoCodigo: 'PRUEBA-CODEX-2', fechaInicioGrupo: null, fechaFinGrupo: null,
  }));
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (!url.pathname.includes('/programacion-academica/api/v1/')) {
      if (url.origin === new URL(base).origin || url.protocol === 'data:') return r.continue();
      return r.abort();
    }
    let status = 200;
    let data = [];
    const path = url.pathname.split('/api/v1/')[1];
    if (path === 'ofertas') data = [{ idPeriodo: 'p1', codigo: 'PRUEBA-CODEX-2', nombre: 'PRUEBA-CODEX-2', estado: 'activo' }];
    else if (path === 'grupos/g1') { lecturasGrupo++; data = grupo; }
    else if (path === 'horarios/grupo/g1/periodo' && r.method() === 'PUT') {
      if (rechazar) { status = 409; data = null; }
      else { grupo = { ...grupo, ...JSON.parse(r.postData()) }; data = grupo; }
    } else if (path === 'horarios') {
      if (url.searchParams.has('periodo')) lecturasProgramacion++;
      // Simula padres que siguen devolviendo las fechas antiguas.
      data = url.searchParams.has('grupo') ? [] : franjas;
    } else if (path.endsWith('/horas')) data = { programadas: 0, requeridas: 48, semanas: 4, excede: false };
    else if (path.startsWith('publicaciones/')) data = { total: 3, programado: 3, pendientesCierre: 3 };
    else if (path.startsWith('validacion')) data = {
      periodos: ['2026-1'], resumen: { total: 27, aula: 27, docente: 0 },
      cruces: [{ tipo: 'aula', recurso: 'HISTORICA', periodo: '2026-1', asignaturaA: 'A', asignaturaB: 'B' }],
    };
    return r.respond({ status, contentType: 'application/json', headers: {
      'Access-Control-Allow-Origin': r.headers().origin || new URL(base).origin,
      'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    }, body: JSON.stringify(status === 409 ? { message: 'Escritura rechazada' } : { success: true, data }) });
  });
  const prueba = async (nombre, run) => {
    const inicio = Date.now();
    await run();
    const resultado = { nombre, inicio: new Date(inicio).toISOString(), segundos: (Date.now() - inicio) / 1000 };
    resultados.push(resultado);
    console.log('PASS', JSON.stringify(resultado));
  };
  const nav = async (texto) => page.evaluate((texto) => {
    const e = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent === texto);
    if (!e) throw Error(`No se encuentra ${texto}`);
    e.click();
  }, texto);
  await page.goto(base, { waitUntil: 'networkidle0' });

  await prueba('EFDS-2307 :: panel vivo en cero conserva 27 cruces en Validación', async () => {
    const contar = (etiqueta) => page.evaluate((etiqueta) => {
      const e = [...document.querySelectorAll('p')].find((e) => e.textContent === etiqueta);
      return e?.parentElement.querySelector('h3')?.textContent;
    }, etiqueta);
    assert.equal(await contar('Alertas de Cruce'), '0');
    await nav('Validación de Cruces');
    await page.waitForFunction(() => document.body.textContent.includes('Total detectados'));
    assert.equal(await contar('Total detectados'), '27');
    assert.equal(await contar('Alertas de Cruce'), '0');
    await nav('Programación General');
  });

  await prueba('EFDS-2308 :: Distancia filtra por DISTANCIA y conserva FIN_DE_SEMANA', async () => {
    const select = await page.$('select:has(option[value="DISTANCIA"])');
    assert.ok(select);
    await select.select('DISTANCIA');
    assert.deepEqual(await page.$$eval('tbody tr', (rs) => rs.map((r) => r.textContent.includes('Materia DISTANCIA'))), [true]);
    await select.select('FIN_DE_SEMANA');
    assert.equal(await page.$eval('tbody', (e) => e.textContent.includes('Materia FIN_DE_SEMANA')), true);
    await select.select('TODAS');
    assert.equal((await page.$$('tbody tr')).length, 3);
  });

  await prueba('EFDS-2310 :: guardar y reabrir el mismo grupo sin recargar ignora props obsoletas', async () => {
    await page.click('[aria-label="Ver detalle del grupo"]');
    await page.waitForFunction(() => document.querySelector('input[type="date"]')?.disabled === false);
    const prevGrupo = lecturasGrupo;
    const prevProgramacion = lecturasProgramacion;
    await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('[role="dialog"] input[type="date"]')];
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      ['2026-10-12', '2026-11-12'].forEach((valor, i) => {
        setter.call(inputs[i], valor); inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
    await nav('Guardar periodo');
    await page.waitForFunction(() => document.body.textContent.includes('Periodo guardado.'));
    await page.waitForNetworkIdle();
    assert.ok(lecturasGrupo > prevGrupo, 'La escritura invalida la consulta del grupo');
    assert.ok(lecturasProgramacion > prevProgramacion, 'La otra pantalla consulta de nuevo sin recargar');
    await page.click('[aria-label="Cerrar"]');
    const antesReabrir = lecturasGrupo;
    await page.click('[aria-label="Ver detalle del grupo"]');
    await page.waitForFunction(() => document.querySelector('input[type="date"]')?.value === '2026-10-12');
    assert.ok(lecturasGrupo > antesReabrir);
    assert.deepEqual(await page.$$eval('input[type="date"]', (es) => es.map((e) => e.value)), ['2026-10-12', '2026-11-12']);
    assert.equal(await page.evaluate(() => performance.getEntriesByType('navigation').length), 1);
  });

  await prueba('EFDS-2310 :: una escritura rechazada no invalida ni reemplaza el ciclo persistido', async () => {
    rechazar = true;
    const antes = lecturasGrupo;
    await nav('Guardar periodo');
    await page.waitForFunction(() => document.body.textContent.includes('Escritura rechazada'));
    await page.waitForNetworkIdle();
    assert.equal(lecturasGrupo, antes);
    assert.equal(grupo.fechaInicio, '2026-10-12');
  });
  await prueba('EFDS-2310 :: concertación puede invalidar un recurso sin refrescar recursos ajenos', async () => {
    const antes = lecturasGrupo;
    const invalidar = (recurso) => page.evaluate(async ({ base, recurso }) => {
      const api = await import(`${base}src/services/actualizacionProgramacion.ts`);
      api.invalidarProgramacion(recurso);
    }, { base, recurso });
    await invalidar('jefatura');
    await page.waitForNetworkIdle();
    assert.equal(lecturasGrupo, antes);
    await invalidar('grupo:g1');
    await page.waitForNetworkIdle();
    assert.ok(lecturasGrupo > antes);
  });
  assert.deepEqual(errores, [], 'Sin errores de React en el navegador');
} finally {
  await browser.close();
}
