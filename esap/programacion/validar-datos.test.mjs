import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from 'xlsx';
import { normalizar, areaCanonica, esGenerico, equivalencias } from './equivalencias.mjs';
const dir = new URL('./resultados/2026-1/datos/nucleos/', import.meta.url);
test('las cuatro franjas de Opción de grado quedan explícitamente para revisión manual', () => {
  const w = XLSX.readFile(new URL('./resultados/2026-1/catalogo-conciliacion.xlsx', import.meta.url));
  const filas = XLSX.utils.sheet_to_json(w.Sheets.REVISION_MANUAL);
  assert.deepEqual(filas.map(f => f.fila_programacion).sort(), ['fila-35', 'fila-36', 'fila-440', 'fila-441']);
  assert.ok(filas.every(f => f.plan === 'APT_52' && f.decision.includes('REVISAR A MANO')));
});
const leer = nombre => {
  const buffer = fs.readFileSync(new URL(nombre, dir));
  assert.equal(buffer.subarray(0, 3).toString('hex'), 'efbbbf');
  assert.ok(buffer.toString('utf8').split('\n')[0].includes(';'));
  const w = XLSX.read(buffer, { type: 'buffer', raw: true });
  return XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], { defval: '' });
};
test('normalización y reglas aprobadas, sin ampliar áreas por semejanza', () => {
  assert.equal(normalizar('  Espacio, TIEMPO y Território. '), 'espacio tiempo y territorio');
  assert.equal(areaCanonica('Problremática Pública'), 'Problemática Pública');
  assert.equal(areaCanonica('Proyectos de Desarrollo territorial'), 'Gestión del Desarrollo');
  assert.equal(areaCanonica('Gerencia Social'), null);
  assert.equal(areaCanonica('Estado, Gobierno y Sociedad'), 'Estado y Poder');
  assert.ok(esGenerico('Labores de docencia y otras actividades'));
});
test('equivalencias: esquema 21.1, sin variantes normalizadas duplicadas', () => {
  const filas = leer('nucleo_equivalencia.csv');
  assert.equal(new Set(filas.map(f => normalizar(f.variante))).size, filas.length);
  for (const area of Object.keys(equivalencias)) assert.ok(filas.some(f => f.area_canonica === area && normalizar(f.variante) === normalizar(area)), area);
  for (const f of filas) {
    assert.ok(['exacta', 'prefijo'].includes(f.coincidencia));
    assert.ok(['plan', 'rund', 'base'].includes(f.fuente));
    assert.ok(['area', 'generica', 'sin_area'].includes(f.tipo));
    if (f.tipo === 'area') assert.ok(f.area_canonica);
  }
  assert.equal(filas.filter(f => f.tipo === 'generica').length, 4);
  assert.equal(filas.find(f => normalizar(f.variante) === normalizar('Estado, Gobierno y Sociedad'))?.area_canonica, 'Estado y Poder');
});

test('cobertura suma: conserva el denominador y deja sin forzar las cuatro franjas de Opción de grado', () => {
  const r = JSON.parse(fs.readFileSync(new URL('./resultados/2026-1/cobertura-regla-vigente.json', import.meta.url)));
  assert.equal(r.modoPuente, 'suma');
  assert.equal(r.equivalenciaAplicada.areaCanonica, 'Estado y Poder');
  assert.equal(r.franjas, 535);
  assert.equal(r.cubiertas, r.porRund + r.porPuente);
  assert.equal(r.cubiertas + r.noCubiertas.length, r.franjas);
  assert.deepEqual(r.noCubiertas.map(f => f.fila).sort(), ['fila-35', 'fila-36', 'fila-440', 'fila-441']);
});
test('puente: documento válido, una fila por docente/plan/asignatura, exclusiones explícitas', () => {
  const filas = leer('puente_docente_area.csv');
  assert.ok(filas.length > 0);
  const claves = new Set();
  for (const f of filas) {
    assert.match(String(f.documento), /^\d+$/); assert.notEqual(String(f.documento), '0');
    for (const k of ['nombre','plan','asignatura','area_formacion']) assert.ok(f[k]);
    claves.add(`${f.documento}|${normalizar(f.plan)}|${normalizar(f.asignatura)}`);
  }
  assert.equal(claves.size, filas.length);
  const excluidas = leer('puente_excluidas.csv');
  assert.ok(excluidas.some(f => String(f.documento) === '0'));
  assert.ok(excluidas.every(f => f.motivo));
});
