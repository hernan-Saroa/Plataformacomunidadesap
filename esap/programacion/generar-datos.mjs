import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';
import pg from 'pg';
import ts from 'typescript';
import { equivalencias, normalizar, areaCanonica, esGenerico } from './equivalencias.mjs';

// node esap/programacion/generar-datos.mjs --programacion <xlsx> --rund <xlsx> --env <env> --periodo 2026-1
const args = Object.fromEntries(process.argv.slice(2).reduce((pares, v, i, todos) => i % 2 ? pares : [...pares, [v.replace(/^--/, ''), todos[i + 1]]], []));
for (const clave of ['programacion', 'rund', 'env', 'periodo']) if (!args[clave]) throw Error(`Falta --${clave}`);
const modoPuente = args.puente ?? 'solo_sin_rund';
if (!['suma', 'solo_sin_rund', 'apagado'].includes(modoPuente)) throw Error('Puente inválido: suma, solo_sin_rund o apagado');
const out = path.resolve(args.salida ?? `esap/programacion/resultados/${args.periodo}`);
fs.mkdirSync(out, { recursive: true });
const escribir = (nombre, datos) => fs.writeFileSync(path.join(out, nombre), JSON.stringify(datos, null, 2) + '\n');
const env = Object.fromEntries(fs.readFileSync(args.env, 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const c = new pg.Client({ host: '127.0.0.1', port: 55432, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASS || env.DB_PASSWORD, options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 5000 });
let areas, historico, vivos, personas, catalogo, equivalenciasBase, areasFormacion;
try {
  await c.connect();
  await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  if ((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') throw Error('La conexión debe ser de solo lectura');
  areas = (await c.query('SELECT codigo, nombre FROM academic_work_plan.nucleo_tematico WHERE activo AND deleted_at IS NULL ORDER BY codigo')).rows;
  areasFormacion = (await c.query('SELECT id, codigo, nombre, id_programa FROM academic_work_plan.area_formacion WHERE activa ORDER BY codigo')).rows;
  equivalenciasBase = (await c.query('SELECT variante_normalizada AS "varianteNormalizada", coincidencia, tipo, id_area::integer AS "idArea" FROM academic_work_plan.nucleo_equivalencia WHERE activa')).rows;
  personas = new Set((await c.query('SELECT num_identificacion::text AS documento FROM auth.personas')).rows.map(r => r.documento));
  catalogo = (await c.query(`SELECT a.codigo, a.nombre, a.pensum, a.creditos, pr.codigo AS programa_codigo, nt.codigo AS area_codigo
    FROM academic_work_plan.asignatura a JOIN academic_work_plan.programa pr ON pr.id=a.id_programa
    LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id=a.id_nucleo_tematico
    WHERE a.deleted_at IS NULL`)).rows;
  historico = (await c.query('SELECT id, pensum, programa, asignatura, cedula_docente::text AS documento FROM "academic-schedule".programacion_historica WHERE periodo=$1 ORDER BY id', [args.periodo])).rows;
  vivos = (await c.query(`SELECT f.id_franja AS id, a.pensum, a.nombre AS asignatura, p.num_identificacion::text AS documento, nt.nombre AS area
    FROM "academic-schedule".franja_horaria f
    JOIN "academic-schedule".grupo g ON g.id_grupo=f.id_grupo
    JOIN academic_work_plan.periodo_academico pe ON pe.id=g.id_periodo_academico
    JOIN academic_work_plan.asignatura a ON a.id=g.id_asignatura
    LEFT JOIN auth.personas p ON p.id_person=f.id_docente
    LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id=a.id_nucleo_tematico
    WHERE pe.codigo=$1 ORDER BY f.id_franja`, [args.periodo])).rows;
  await c.query('ROLLBACK');
} finally { await c.end(); }
const wb = XLSX.readFile(args.programacion);
const hoja = (w, nombre, range) => {
  if (!w.Sheets[nombre]) throw Error(`No existe la hoja ${nombre}`);
  const inicio = range ?? XLSX.utils.decode_range(w.Sheets[nombre]['!ref']).s.r;
  return XLSX.utils.sheet_to_json(w.Sheets[nombre], { range: inicio, defval: '', raw: true }).map((r, i) => ({ ...r, filaExcel: i + inicio + 2 }));
};
const planes = hoja(wb, 'PLAN_ESTUDIOS');
const docentes = hoja(wb, 'DOCENTE_ASIGNATURA_');
const rund = hoja(XLSX.readFile(args.rund), 'CARGA_DOCENTES', 1);
const programacionExcel = hoja(wb, 'PROGRAMACIÓN', 3).filter(r => r.ASIGNATURA && r.DIA).map(r => ({ id: `fila-${r.filaExcel}`, pensum: r.COD_ASIGNA, asignatura: r.ASIGNATURA, documento: String(r['# CEDULA\r\n DOCENTE']).trim() }));
const planIndex = new Map();
const clave = (plan, nombre) => `${normalizar(plan)}|${normalizar(nombre)}`;
for (const p of planes) {
  for (const plan of [p.PROG_PENSUM, p.PENSUM]) {
    const k = clave(plan, p.ASIGNATURA);
    const lista = planIndex.get(k) ?? [];
    lista.push(p); planIndex.set(k, lista);
  }
}
const resolver = (plan, asignatura) => [...new Set((planIndex.get(clave(plan, asignatura)) ?? []).map(p => areaCanonica(p['ÁREA DE FORMACIÓN'])).filter(Boolean))];
const incidencias = [];
const puente = new Map();
const filasPuente = [], excluidas = [];
for (const d of docentes) {
  const doc = String(d.CC).trim();
  const fila = { documento: doc, nombre: d.PROFESOR, plan: d.COD_ASIGNA, asignatura: d.ASIGNATURA, area_formacion: '' };
  if (!/^\d+$/.test(doc) || doc === '0') { incidencias.push({ hoja: 'DOCENTE_ASIGNATURA_', fila: d.filaExcel, motivo: 'Cédula inválida: 0, vacía o no numérica' }); excluidas.push({ ...fila, motivo: `Fila ${d.filaExcel}: cédula inválida` }); continue; }
  if (String(d.PROGRAMA) !== String(d.PROGRAMA).toUpperCase()) incidencias.push({ hoja: 'DOCENTE_ASIGNATURA_', fila: d.filaExcel, motivo: 'Programa en minúsculas', valor: d.PROGRAMA });
  const candidatas = resolver(d.COD_ASIGNA, d.ASIGNATURA);
  if (candidatas.length !== 1) { incidencias.push({ hoja: 'DOCENTE_ASIGNATURA_', fila: d.filaExcel, motivo: candidatas.length ? 'Área ambigua' : 'Sin cruce de área', plan: d.COD_ASIGNA, asignatura: d.ASIGNATURA }); excluidas.push({ ...fila, motivo: `Fila ${d.filaExcel}: sin cruce único de área por plan y nombre` }); continue; }
  const plan = planIndex.get(clave(d.COD_ASIGNA, d.ASIGNATURA))[0];
  filasPuente.push({ ...fila, plan: plan.PROG_PENSUM, asignatura: plan.ASIGNATURA, area_formacion: plan['ÁREA DE FORMACIÓN'] });
  const set = puente.get(doc) ?? new Set(); set.add(candidatas[0]); puente.set(doc, set);
}
const porRund = new Map(), sinCruce = new Map();
const variantes = [];
const registrar = (variante, origen) => { const area = areaCanonica(variante); if (area) variantes.push({ variante: String(variante).trim(), area_canonica: area, origen }); };
for (const p of planes) registrar(p['ÁREA DE FORMACIÓN'], 'plan');
for (const a of areas) registrar(a.nombre, 'base');
for (const r of rund) {
  const set = porRund.get(String(r.DOCUMENTO_IDENTIDAD).trim()) ?? new Set();
  for (const parte of String(r.NUCLEO_TEMATICO).split('/').map(s => s.trim()).filter(Boolean)) {
    if (esGenerico(parte)) continue;
    const area = areaCanonica(parte);
    if (area) { set.add(area); registrar(parte, 'RUND'); }
    else sinCruce.set(parte, (sinCruce.get(parte) ?? 0) + 1);
  }
  porRund.set(String(r.DOCUMENTO_IDENTIDAD).trim(), set);
}
// La tabla conserva procedencia observada: no inventa el origen de una variante ausente de las fuentes.
const unicas = [...new Map(variantes.map(v => [`${normalizar(v.variante)}|${v.origen}`, v])).values()].sort((a,b) => a.area_canonica.localeCompare(b.area_canonica) || a.variante.localeCompare(b.variante));
const nucleos = path.join(out, 'datos/nucleos'); fs.mkdirSync(nucleos, { recursive: true });
const csv = (nombre, columnas, filas) => fs.writeFileSync(path.join(nucleos, nombre), '\uFEFF'+[columnas.join(';'), ...filas.map(f => columnas.map(k => `"${String(f[k] ?? '').replace(/"/g,'""')}"`).join(';'))].join('\r\n')+'\r\n');
const tabla = new Map();
const agregar = fila => {
  const key = normalizar(fila.variante), anterior = tabla.get(key);
  if (anterior && (anterior.area_canonica !== fila.area_canonica || anterior.tipo !== fila.tipo)) throw Error(`Equivalencia ambigua: ${fila.variante}`);
  if (!anterior) tabla.set(key, fila);
};
for (const v of unicas) agregar({ area_canonica: v.area_canonica, variante: v.variante, coincidencia: 'exacta', tipo: 'area', fuente: v.origen.toLowerCase() });
for (const area of Object.keys(equivalencias)) agregar({ area_canonica: area, variante: area, coincidencia: 'exacta', tipo: 'area', fuente: unicas.find(v => v.area_canonica === area)?.origen.toLowerCase() ?? 'plan' });
for (const variante of ['Teorías y Enfoques del Desarrollo', 'Proyectos de Desarrollo', 'Planeación del Desarrollo']) {
  tabla.set(normalizar(variante), { area_canonica: 'Gestión del Desarrollo', variante, coincidencia: 'prefijo', tipo: 'area', fuente: 'rund' });
}
for (const variante of ['Labores de docencia', 'Impartir asignaturas', 'Desarrollo de los diferentes programas misionales', 'Programas curriculares']) agregar({ area_canonica: '', variante, coincidencia: 'prefijo', tipo: 'generica', fuente: 'rund' });
for (const variante of ['Procesos Étnicos e Interculturales', 'Gerencia Social']) agregar({ area_canonica: '', variante, coincidencia: 'exacta', tipo: 'sin_area', fuente: 'rund' });
tabla.set(normalizar('Estado, Gobierno y Sociedad'), { area_canonica: 'Estado y Poder', variante: 'Estado, Gobierno y Sociedad', coincidencia: 'exacta', tipo: 'area', fuente: 'base' });
csv('nucleo_equivalencia.csv', ['area_canonica','variante','coincidencia','tipo','fuente'], [...tabla.values()]);
csv('puente_docente_area.csv', ['documento','nombre','plan','asignatura','area_formacion'], [...new Map(filasPuente.map(f => [`${f.documento}|${clave(f.plan,f.asignatura)}`, f])).values()]);
csv('puente_excluidas.csv', ['documento','nombre','plan','asignatura','area_formacion','motivo'], excluidas);
escribir('docentes-no-encontrados-base.json', [...puente.keys()].filter(d => !personas.has(d)));
escribir('equivalencias-pendientes.json', Object.entries(equivalencias).flatMap(([area, variantes]) => variantes.filter(v => !unicas.some(u => normalizar(u.variante) === normalizar(v))).map(variante => ({ variante, area_canonica: area, motivo: 'Variante aprobada sin origen observado en estas fuentes' }))));
const medir = filas => {
  const documentos = [...new Set(filas.map(f => String(f.documento ?? '').trim()).filter(d => d && d !== '0'))];
  let soloRund = 0, combinado = 0;
  const noCubiertas = [];
  for (const f of filas) {
    const candidatas = f.area ? [areaCanonica(f.area)].filter(Boolean) : resolver(f.pensum, f.asignatura);
    const area = candidatas.length === 1 ? candidatas[0] : null;
    const doc = String(f.documento ?? '').trim();
    const r = !!area && !!porRund.get(doc)?.has(area), p = !!area && !!puente.get(doc)?.has(area);
    if (r) soloRund++; if (r || p) combinado++;
    else noCubiertas.push({ id: f.id, asignatura: f.asignatura, plan: f.pensum, motivo: !area ? 'Área no resuelta o ambigua' : 'Docente sin área compatible en RUND ni puente' });
  }
  return { franjas: filas.length, docentes: documentos.length, docentesConRund: documentos.filter(d => porRund.get(d)?.size).length, docentesConPuente: documentos.filter(d => puente.get(d)?.size).length, docentesSinNinguno: documentos.filter(d => !porRund.get(d)?.size && !puente.get(d)?.size).length, franjasSoloRund: soloRund, porcentajeSoloRund: filas.length ? +(100*soloRund/filas.length).toFixed(2) : null, franjasRundOPuente: combinado, porcentajeRundOPuente: filas.length ? +(100*combinado/filas.length).toFixed(2) : null, noCubiertas };
};
const reporte = { periodo: args.periodo, generadoEn: new Date().toISOString(), base: { host: '127.0.0.1', puerto: 55432, soloLectura: true }, fuentes: [args.programacion, args.rund].map(f => ({ archivo: path.basename(f), sha256: createHash('sha256').update(fs.readFileSync(f)).digest('hex') })), metodologia: 'Cobertura de compatibilidad de área para el docente que figura en cada franja; no comprueba cruces, vinculación vigente ni tope. Histórico y programación viva se miden por separado. Horas no se recalculan.', historico: medir(historico), programacionViva: medir(vivos), nucleosSinCruce: [...sinCruce].map(([nucleo, filas]) => ({ nucleo, filas })), incidenciasPuente: incidencias, areasSinCodigo: [...new Set(planes.map(p => areaCanonica(p['ÁREA DE FORMACIÓN'])).filter(Boolean))].filter(a => !areas.some(db => areaCanonica(db.nombre) === a)) };
reporte.programacionExcel = medir(programacionExcel);
reporte.programacionExcel.filasSinDia = hoja(wb, 'PROGRAMACIÓN', 3).filter(r => r.ASIGNATURA && !r.DIA).length;
reporte.limitacion = !historico.length && !vivos.length ? 'La base local no contiene franjas del periodo: la cobertura del Excel es una medición separada, no valida el estado integrado del sistema.' : null;
escribir('cobertura.json', reporte);
escribir('areas-base.json', areas);
// Libro de conciliación: no es una plantilla de importación. No inventa códigos nuevos.
const revisionCatalogo = planes.map(p => {
  const porNombre = catalogo.filter(a => normalizar(a.nombre) === normalizar(p.ASIGNATURA));
  const candidatos = catalogo.filter(a => normalizar(a.nombre) === normalizar(p.ASIGNATURA) && normalizar(a.pensum) === normalizar(p.PENSUM) && normalizar(a.programa_codigo) === normalizar(p.COD_PROG));
  const area = areaCanonica(p['ÁREA DE FORMACIÓN']);
  const areasDb = areas.filter(a => area && areaCanonica(a.nombre) === area);
  const exacta = areasDb.find(a => normalizar(a.nombre) === normalizar(p['ÁREA DE FORMACIÓN']));
  const codigoArea = exacta?.codigo ?? (areasDb.length === 1 ? areasDb[0].codigo : '');
  return { fila_fuente: p.filaExcel, programa: p.COD_PROG, plan: p.PROG_PENSUM, asignatura: p.ASIGNATURA, codigo_fuente: p['CODIGO ASIGNATURA'], codigo_existente: candidatos.length === 1 ? candidatos[0].codigo : '', coincidencias_catalogo: candidatos.length, posibles_duplicados_por_nombre: porNombre.map(a => `${a.codigo} (${a.programa_codigo}, pensum ${a.pensum ?? 'sin definir'})`).join(' | '), area_fuente: p['ÁREA DE FORMACIÓN'], area_canonica: area ?? '', codigo_area: codigoArea, estado: candidatos.length > 1 ? 'Catálogo ambiguo: no duplicar' : !codigoArea ? 'Área sin código único: revisar' : candidatos.length ? 'Reutilizar código existente' : 'Sin coincidencia exacta: revisar antes de crear', creditos: p.CREDITOS, semestre: p.SEMESTRE };
});
const revision = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(revision, XLSX.utils.json_to_sheet(revisionCatalogo), 'CONCILIACION_NO_IMPORTAR');
const manual = reporte.programacionExcel.noCubiertas.filter(f => normalizar(f.plan) === 'apt_52' && normalizar(f.asignatura) === 'opcion de grado').map(f => ({ fila_programacion: f.id, plan: f.plan, asignatura_programada: f.asignatura, candidatos_plan: 'Opción de grado (Curso Profundización temática 1) | Opción de grado (Curso Profundización temática 2)', decision: 'REVISAR A MANO: no hay coincidencia exacta; no se asigna código ni se fusionan asignaturas' }));
XLSX.utils.book_append_sheet(revision, XLSX.utils.json_to_sheet(manual), 'REVISION_MANUAL');
XLSX.utils.book_append_sheet(revision, XLSX.utils.json_to_sheet([{ estado: 'Pendiente de la instrucción anterior y plantilla definitiva del catálogo. No importar este libro.', periodo: args.periodo }]), 'LEEME');
XLSX.writeFile(revision, path.join(out, 'catalogo-conciliacion.xlsx'));
// Reutiliza el intérprete puro publicado por Claude, sin iniciar el servicio ni importar su contenedor.
const fuenteInterprete = fs.readFileSync(new URL('../../backend/academic-work-plan-service/src/pta/banco-docentes/rund-nucleos.ts', import.meta.url), 'utf8');
const compilado = ts.transpileModule(fuenteInterprete, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const { interpretarNucleo, buscarEquivalencia, normalizarNucleo } = await import(`data:text/javascript;base64,${Buffer.from(compilado).toString('base64')}`);
// Proyección de la decisión editable sobre el snapshot, sin escribir equivalencias en la base.
const estadoYPoder = areasFormacion.find(a => normalizar(a.nombre) === normalizar('Estado y Poder'));
if (!estadoYPoder) throw Error('Falta el área canónica Estado y Poder');
const variantesEstado = ['Estado, Gobierno y Sociedad', 'Estado Gobierno y Sociedad', 'Gobierno y Políticas Públicas'].map(normalizarNucleo);
equivalenciasBase = [...equivalenciasBase.filter(e => !variantesEstado.includes(e.varianteNormalizada)), ...variantesEstado.map(varianteNormalizada => ({ varianteNormalizada, coincidencia: 'exacta', tipo: 'area', idArea: Number(estadoYPoder.id) }))];
const rundActual = new Map(rund.map(r => [String(r.DOCUMENTO_IDENTIDAD).trim(), new Set(interpretarNucleo(r.NUCLEO_TEMATICO, equivalenciasBase).areas.map(a => a.idArea))]));
const coberturaActual = programacionExcel.map(f => {
  const planesCoincidentes = planIndex.get(clave(f.pensum, f.asignatura)) ?? [];
  const areas = [...new Set(planesCoincidentes.map(p => buscarEquivalencia(p['ÁREA DE FORMACIÓN'], equivalenciasBase)?.idArea).filter(a => a != null))];
  const idArea = areas.length === 1 ? areas[0] : null;
  const nucleosRund = rundActual.get(f.documento);
  const tieneRund = !!nucleosRund?.size;
  const compatibleRund = idArea != null && !!nucleosRund?.has(idArea);
  const compatiblePuente = modoPuente !== 'apagado' && (modoPuente === 'suma' || !tieneRund) && idArea != null && [...(puente.get(f.documento) ?? [])].some(a => buscarEquivalencia(a, equivalenciasBase)?.idArea === idArea);
  return { fila: f.id, cubierta: compatibleRund || compatiblePuente, origen: compatibleRund ? 'rund' : compatiblePuente ? 'puente' : null, motivo: compatibleRund || compatiblePuente ? null : idArea == null ? 'Área sin cruce exacto con el plan' : tieneRund && modoPuente === 'solo_sin_rund' ? 'Tiene núcleo RUND de otra área: el puente no lo amplía' : 'Sin núcleo compatible' };
});
escribir('cobertura-regla-vigente.json', { periodo: args.periodo, generadoEn: new Date().toISOString(), fuente: 'PROGRAMACIÓN del Excel; no es programación viva', modoPuente, regla: 'Intérprete de Claude, snapshot de equivalencias con Estado, Gobierno y Sociedad proyectado a Estado y Poder; puente según modoPuente. No modifica el servidor.', equivalenciaAplicada: { variante: 'Estado, Gobierno y Sociedad', areaCanonica: 'Estado y Poder' }, interpreteSha256: createHash('sha256').update(fuenteInterprete).digest('hex'), franjas: coberturaActual.length, cubiertas: coberturaActual.filter(f => f.cubierta).length, porcentaje: coberturaActual.length ? +(100*coberturaActual.filter(f => f.cubierta).length/coberturaActual.length).toFixed(2) : null, porRund: coberturaActual.filter(f => f.origen === 'rund').length, porPuente: coberturaActual.filter(f => f.origen === 'puente').length, noCubiertas: coberturaActual.filter(f => !f.cubierta) });
escribir('areas-formacion-base.json', areasFormacion);
console.log(JSON.stringify({ historico: { ...reporte.historico, noCubiertas: reporte.historico.noCubiertas.length }, programacionViva: { ...reporte.programacionViva, noCubiertas: reporte.programacionViva.noCubiertas.length }, incidencias: incidencias.length, salida: out }, null, 2));
