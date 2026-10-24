import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import XLSX from 'xlsx';
import { normalizar, areaCanonica, esGenerico, equivalencias } from './equivalencias.mjs';
const dir = new URL('./resultados/2026-1/datos/nucleos/', import.meta.url);
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
