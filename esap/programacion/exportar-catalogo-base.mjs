import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';
import pg from 'pg';

const args = Object.fromEntries(process.argv.slice(2).reduce((r, v, i, a) => i % 2 ? r : [...r, [v.replace(/^--/, ''), a[i + 1]]], []));
for (const k of ['plantilla', 'env', 'salida']) if (!args[k]) throw Error(`Falta --${k}`);
const env = Object.fromEntries(fs.readFileSync(args.env, 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^['"]|['"]$/g, '')]; }));
const c = new pg.Client({ host: '127.0.0.1', port: 55432, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASS || env.DB_PASSWORD, options: '-c default_transaction_read_only=on', connectionTimeoutMillis: 5000 });
let asignaturas, programas, baseDatos, nucleos, areasFormacion;
try {
  await c.connect(); await c.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal((await c.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'on');
  baseDatos = (await c.query('SELECT current_database() AS nombre')).rows[0].nombre;
  asignaturas = (await c.query(`SELECT a.*, p.codigo AS programa_codigo, p.nombre AS programa_nombre,
    nt.nombre AS nucleo_nombre, f.codigo AS facultad_codigo, u.etiqueta AS semestre_etiqueta
    FROM academic_work_plan.asignatura a JOIN academic_work_plan.programa p ON p.id=a.id_programa
    LEFT JOIN academic_work_plan.nucleo_tematico nt ON nt.id=a.id_nucleo_tematico
    LEFT JOIN academic_work_plan.facultad f ON f.id=a.id_facultad
    LEFT JOIN academic_work_plan.ubicacion_semestral u ON u.id=a.id_ubicacion_semestral
    WHERE a.deleted_at IS NULL ORDER BY a.codigo`)).rows;
  programas = (await c.query(`SELECT p.*, f.codigo AS facultad_codigo, f.nombre AS facultad_nombre
    FROM academic_work_plan.programa p LEFT JOIN academic_work_plan.facultad f ON f.id=p.id_facultad ORDER BY p.codigo`)).rows;
  nucleos = (await c.query('SELECT codigo,nombre FROM academic_work_plan.nucleo_tematico WHERE activo AND deleted_at IS NULL ORDER BY codigo')).rows;
  areasFormacion = (await c.query('SELECT id,codigo,nombre,id_programa FROM academic_work_plan.area_formacion WHERE activa ORDER BY codigo')).rows;
  await c.query('ROLLBACK');
} finally { await c.end(); }
const w = XLSX.readFile(args.plantilla);
const filas = hoja => XLSX.utils.sheet_to_json(w.Sheets[hoja], { defval: '', raw: true });
const origenA = filas('ASIGNATURAS'), origenP = filas('PROGRAMAS');
assert.deepEqual(asignaturas.map(a => a.codigo).sort(), origenA.map(a => a.codigo_asignatura).sort(), 'Los códigos de asignatura de la plantilla no coinciden con la base actual; use una exportación completa actualizada.');
assert.deepEqual(programas.map(p => p.codigo).sort(), origenP.map(p => p.codigo_programa).sort(), 'Los programas de la plantilla no coinciden con la base actual.');
const porA = new Map(asignaturas.map(a => [a.codigo, a])), porP = new Map(programas.map(p => [p.codigo, p]));
const bool = v => v ? 'TRUE' : 'FALSE';
const cambios = [];
const convertir = (original, valores, hoja, codigo) => Object.fromEntries(Object.keys(original).map(k => {
  const valor = k in valores ? valores[k] ?? '' : original[k];
  if (valor !== original[k]) cambios.push({ hoja, codigo, campo: k, anterior: original[k], actual: valor });
  return [k, valor];
}));
const a = origenA.map(o => {
  const r = porA.get(o.codigo_asignatura);
  return convertir(o, { codigo_asignatura: r.codigo, pensum: r.pensum, nombre_asignatura: r.nombre, nombre_base: r.nombre_base,
    creditos: r.creditos, horas_clase: r.horas_clase, horas_pta: r.horas_pta, semestre: r.semestre_etiqueta,
    modalidad: r.modalidad, nucleo_tematico: r.nucleo_nombre, codigo_programa: r.programa_codigo, nombre_programa: r.programa_nombre,
    codigo_facultad: r.facultad_codigo, tipo_excepcion: r.tipo_excepcion, requiere_revision_modalidad: bool(r.requiere_revision_modalidad), activa: bool(r.activa) }, 'ASIGNATURAS', r.codigo);
});
const p = origenP.map(o => {
  const r = porP.get(o.codigo_programa);
  return convertir(o, { codigo_programa: r.codigo, nombre_programa: r.nombre, nombre_corto: r.nombre_corto,
    nombre_excel_origen: r.nombre_excel, tipo_programa: r.tipo, codigo_facultad: r.facultad_codigo, nombre_facultad: r.facultad_nombre,
    modalidad_principal: r.modalidad, horas_base_por_credito: r.horas_base_por_credito, horas_pregrado_central: r.horas_pregrado_central,
    activo: bool(r.activo), categoria_horas_circular003: r.categoria_horas_circular003, descripcion_categoria_circular003: r.descripcion_categoria_circular003,
    horas_pta_referencia_circular003: r.horas_pta_referencia_circular003, formula_calculo_horas: r.formula_calculo_horas }, 'PROGRAMAS', r.codigo);
});
const salida = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(salida, XLSX.utils.json_to_sheet(p), 'PROGRAMAS');
XLSX.utils.book_append_sheet(salida, XLSX.utils.json_to_sheet(a), 'ASIGNATURAS');
XLSX.utils.book_append_sheet(salida, structuredClone(w.Sheets.MATRIZ_OFERTA), 'MATRIZ_OFERTA');
fs.mkdirSync(path.dirname(path.resolve(args.salida)), { recursive: true }); XLSX.writeFile(salida, args.salida);
const meta = { exportadoEn: new Date().toISOString(), base: { host: '127.0.0.1', puerto: 55432, nombre: baseDatos, soloLectura: true }, asignaturas: a.length, programas: p.length, plantilla: path.basename(args.plantilla), sha256: createHash('sha256').update(fs.readFileSync(args.salida)).digest('hex'), diferenciasFrentePlantilla: cambios };
fs.writeFileSync(`${args.salida}.json`, JSON.stringify(meta, null, 2) + '\n');
for (const [nombre, datos] of [['areas-base.json', nucleos], ['areas-formacion-base.json', areasFormacion]]) fs.writeFileSync(path.join(path.dirname(args.salida), nombre), JSON.stringify(datos, null, 2) + '\n');
console.log(JSON.stringify({ archivo: args.salida, asignaturas: a.length, programas: p.length, diferenciasFrentePlantilla: cambios.length, soloLectura: true }));
