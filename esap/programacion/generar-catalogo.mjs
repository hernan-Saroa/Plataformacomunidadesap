import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { areaCanonica, normalizar } from './equivalencias.mjs';
import { validarCatalogo } from './validar-catalogo.mjs';

// No abre conexiones ni llama al importador: prepara un archivo a partir de una exportación existente.
const args = Object.fromEntries(process.argv.slice(2).reduce((r, v, i, a) => i % 2 ? r : [...r, [v.replace(/^--/, ''), a[i + 1]]], []));
for (const k of ['catalogo-base', 'programacion', 'periodo']) if (!args[k]) throw Error(`Falta --${k}`);
const out = path.resolve(args.salida ?? `esap/programacion/resultados/${args.periodo}`);
fs.mkdirSync(out, { recursive: true });
const base = XLSX.readFile(args['catalogo-base']);
for (const hoja of ['PROGRAMAS', 'ASIGNATURAS', 'MATRIZ_OFERTA']) if (!base.Sheets[hoja]) throw Error(`La exportación no tiene ${hoja}`);
const programas = XLSX.utils.sheet_to_json(base.Sheets.PROGRAMAS, { defval: '' });
const originales = XLSX.utils.sheet_to_json(base.Sheets.ASIGNATURAS, { defval: '' });
const fuente = XLSX.readFile(args.programacion);
const planes = XLSX.utils.sheet_to_json(fuente.Sheets.PLAN_ESTUDIOS, { defval: '' });
const areas = JSON.parse(fs.readFileSync(path.join(out, 'areas-base.json'), 'utf8'));
const areasFormacion = JSON.parse(fs.readFileSync(path.join(out, 'areas-formacion-base.json'), 'utf8'));
const porPrograma = new Map(programas.map(p => [p.codigo_programa, p]));
const ordinales = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'septimo', 'octavo', 'noveno', 'decimo', 'onceavo', 'doceavo'];
const semestre = valor => /^\d+$/.test(String(valor)) ? Number(valor) : ordinales.findIndex(o => normalizar(valor).startsWith(`${o} `)) + 1;
const programaFuente = (programa, fila) => {
  const nombre = normalizar(programa.nombre_programa);
  const origen = normalizar(fila.PROGRAMA);
  if (nombre === origen) return true;
  if (origen !== 'administracion publica') return false;
  return nombre === `${origen} - ${normalizar(fila.JORNADA) === 'diurna' ? 'diurno' : 'nocturno'}`;
};
const revision = [], cambios = [], nuevasAreas = new Set();
let posgrado = 0;
const asignaturas = originales.map(a => {
  const p = porPrograma.get(a.codigo_programa);
  if (!p) throw Error(`Programa inexistente en la exportación: ${a.codigo_programa}`);
  const salida = { ...a };
  const ntActual = areas.find(n => normalizar(n.nombre) === normalizar(a.nucleo_tematico));
  salida.codigo_nucleo_tematico = ntActual?.codigo ?? '';
  if (normalizar(p.tipo_programa) !== 'pregrado') {
    posgrado++;
    // El programa es el área de posgrado (§22.1); no hay planes de posgrado en la fuente.
    salida.codigo_area_formacion = areasFormacion.find(n => normalizar(n.nombre) === `programa: ${normalizar(p.nombre_programa)}` || normalizar(n.nombre) === normalizar(`Programa: ${p.nombre_programa}`))?.codigo ?? '';
    return salida;
  }
  let candidatas = planes.filter(f => programaFuente(p, f) && normalizar(f.ASIGNATURA) === normalizar(a.nombre_base || a.nombre_asignatura));
  // EP diurno y nocturno comparten programa: la modalidad conserva la jornada.
  if (normalizar(p.nombre_programa) === 'economia publica') {
    if (String(a.modalidad).includes('noche')) candidatas = candidatas.filter(f => normalizar(f.JORNADA) === 'nocturna');
    else if (String(a.modalidad).includes('dia') || String(a.modalidad).includes('diurno')) candidatas = candidatas.filter(f => normalizar(f.JORNADA) === 'diurna');
  }
  if (a.pensum) candidatas = candidatas.filter(f => normalizar(f.PENSUM) === normalizar(a.pensum));
  const mismoSemestre = candidatas.filter(f => Number(f.SEMESTRE) === semestre(a.semestre));
  if (mismoSemestre.length) candidatas = mismoSemestre;
  const mismosCreditos = candidatas.filter(f => Number(f.CREDITOS) === Number(a.creditos));
  if (mismosCreditos.length) candidatas = mismosCreditos;
  const canonicas = [...new Set(candidatas.map(f => areaCanonica(f['ÁREA DE FORMACIÓN'])).filter(Boolean))];
  if (canonicas.length !== 1 || candidatas.some(f => !areaCanonica(f['ÁREA DE FORMACIÓN']))) {
    revision.push({ codigo_actual: a.codigo_asignatura, programa: a.codigo_programa, asignatura: a.nombre_base || a.nombre_asignatura, area_actual: a.nucleo_tematico, planes_candidatos: candidatas.map(f => f.PROG_PENSUM).join(' | '), areas_fuente: [...new Set(candidatas.map(f => f['ÁREA DE FORMACIÓN']))].join(' | '), decision: 'CONSERVAR Y REVISAR A MANO', motivo: !candidatas.length ? 'No hay coincidencia por nombre y programa; no se crea otra asignatura.' : 'Las áreas del plan no se resuelven a una sola área canónica aprobada.' });
    return salida;
  }
  const canonica = canonicas[0];
  const posiblesNt = areas.filter(n => areaCanonica(n.nombre) === canonica);
  let nt = posiblesNt.find(n => n.codigo === ntActual?.codigo)
    ?? posiblesNt.find(n => normalizar(n.nombre) === normalizar(canonica));
  if (!nt && posiblesNt.length === 1) nt = posiblesNt[0];
  if (!nt && posiblesNt.length > 1) {
    revision.push({ codigo_actual: a.codigo_asignatura, programa: a.codigo_programa, asignatura: a.nombre_base || a.nombre_asignatura, decision: 'CONSERVAR Y REVISAR A MANO', motivo: 'Hay varios NT equivalentes sin una identidad inequívoca.', areas_fuente: posiblesNt.map(n => `${n.codigo}: ${n.nombre}`).join(' | ') });
    return salida;
  }
  salida.nucleo_tematico = nt?.nombre ?? canonica;
  salida.codigo_nucleo_tematico = nt?.codigo ?? '';
  salida.codigo_area_formacion = areasFormacion.find(n => normalizar(n.nombre) === normalizar(canonica))?.codigo ?? '';
  if (!nt) nuevasAreas.add(canonica);
  if (salida.nucleo_tematico !== a.nucleo_tematico) cambios.push({ codigo_actual: a.codigo_asignatura, asignatura: a.nombre_base || a.nombre_asignatura, area_anterior: a.nucleo_tematico, area_importar: salida.nucleo_tematico, codigo_nt: salida.codigo_nucleo_tematico, codigo_af: salida.codigo_area_formacion, planes_fuente: [...new Set(candidatas.map(f => f.PROG_PENSUM))].join(' | ') });
  return salida;
});
assert.equal(asignaturas.length, originales.length);
assert.equal(new Set(asignaturas.map(a => a.codigo_asignatura)).size, originales.length);
assert.deepEqual(asignaturas.map(a => a.codigo_asignatura).sort(), originales.map(a => a.codigo_asignatura).sort());
for (let i = 0; i < originales.length; i++) {
  const p = porPrograma.get(originales[i].codigo_programa);
  for (const key of Object.keys(originales[i])) {
    if (key === 'nucleo_tematico' && normalizar(p.tipo_programa) === 'pregrado') continue;
    assert.equal(asignaturas[i][key], originales[i][key], `${originales[i].codigo_asignatura}: se alteró ${key}`);
  }
}
const manualProgramacion = XLSX.utils.sheet_to_json(fuente.Sheets['PROGRAMACIÓN'], { range: 3, defval: '' }).map((f, i) => ({ ...f, filaExcel: i + 5 })).filter(f => f.COD_ASIGNA === 'APT_52' && normalizar(f.ASIGNATURA) === 'opcion de grado' && f.DIA).map(f => ({ fila_programacion: f.filaExcel, plan: f.COD_ASIGNA, asignatura: f.ASIGNATURA, candidatos_plan: 'Opción de grado (Curso Profundización temática 1) | Opción de grado (Curso Profundización temática 2)', decision: 'REVISAR A MANO: no se eligió un curso ni se inventó una equivalencia.' }));
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(programas), 'PROGRAMAS');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(asignaturas), 'ASIGNATURAS');
XLSX.utils.book_append_sheet(libro, base.Sheets.MATRIZ_OFERTA, 'MATRIZ_OFERTA');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(revision), 'REVISION_CATALOGO');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(manualProgramacion), 'REVISION_OPCION_GRADO');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(cambios), 'CAMBIOS_AREAS');
XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet([{ periodo: args.periodo, instrucciones: 'Validar y confirmar con el importador existente. Se conservan los códigos de la exportación base; revisar las hojas REVISION antes de confirmar. nucleo_tematico contiene el nombre que consume el importador; codigo_nucleo_tematico es su NT de trazabilidad. Un AF nunca sustituye a un NT.', limitacion: 'Se usan la exportación base y los snapshots de áreas suministrados. Este generador no consulta la base ni valida persistencia; ejecutar la validación del importador sobre la base actual antes de confirmar.', posgrado: 'El Excel fuente contiene planes de pregrado. Se conservan todos los campos de las asignaturas y programas de posgrado de la exportación; su área efectiva sigue siendo el programa (§22.1).' }]), 'LEEME');
const archivo = path.join(out, `catalogo-importable-${args.periodo}.xlsx`);
XLSX.writeFile(libro, archivo);
const validacion = await validarCatalogo(archivo);
if (!validacion.isValid) throw Error(`El parser/validador real rechaza el archivo: ${validacion.errors.join('; ')}`);
const huella = valor => createHash('sha256').update(JSON.stringify(valor)).digest('hex');
const codigos = filas => filas.map(a => a.codigo_asignatura).sort();
const datosPosgrado = filas => filas.filter(a => normalizar(porPrograma.get(a.codigo_programa).tipo_programa) !== 'pregrado').map(a => Object.fromEntries(Object.keys(originales.find(o => o.codigo_asignatura === a.codigo_asignatura)).sort().map(k => [k, a[k]])));
const reporte = { periodo: args.periodo, generadoEn: new Date().toISOString(), fuente: [args['catalogo-base'], args.programacion].map(f => ({ archivo: path.basename(f), sha256: createHash('sha256').update(fs.readFileSync(f)).digest('hex') })), validacion, asignaturas: asignaturas.length, programas: programas.length, codigosNuevos: 0, codigosRetirados: 0, identidades: { codigosAntes: huella(codigos(originales)), codigosDespues: huella(codigos(asignaturas)), posgradoAntes: huella(datosPosgrado(originales)), posgradoDespues: huella(datosPosgrado(asignaturas)) }, areasActualizadas: cambios.length, posgradoConservadas: posgrado, revisionManual: revision.length, franjasOpcionGradoParaRevision: manualProgramacion.length, nucleosSinCodigoNtEnSnapshot: [...nuevasAreas], estadoBase: 'Este generador usa snapshots y no consulta la base. Validación de persistencia pendiente con el importador en la base actual.', cambios, revision };
fs.writeFileSync(path.join(out, 'catalogo-importable-reporte.json'), JSON.stringify(reporte, null, 2) + '\n');
console.log(JSON.stringify({ archivo, ...reporte, fuente: undefined, cambios: undefined, revision: undefined }, null, 2));
