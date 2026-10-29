import fs from 'node:fs';
import assert from 'node:assert/strict';
import XLSX from 'xlsx';
import { areaCanonica } from './equivalencias.mjs';

export function leerAreasPorAsignatura(archivo, asignaturas, programas) {
  const w = XLSX.read(fs.readFileSync(archivo), { type: 'buffer', raw: true });
  const filas = XLSX.utils.sheet_to_json(w.Sheets[w.SheetNames[0]], { defval: '' });
  const porCodigo = new Map(asignaturas.map(a => [a.codigo_asignatura, a]));
  const tipos = new Map(programas.map(p => [p.codigo_programa, p.tipo_programa]));
  const decisiones = new Map();
  for (const f of filas) {
    const { codigo_asignatura: codigo, area_canonica: area, motivo } = f;
    assert.ok(codigo && area && String(motivo ?? '').trim(), 'Cada decisión exige código, área canónica y motivo');
    assert.ok(porCodigo.has(codigo), `Asignatura desconocida: ${codigo}`);
    assert.ok(!decisiones.has(codigo), `Decisión duplicada: ${codigo}`);
    assert.equal(areaCanonica(area), area, `Área no canónica: ${area}`);
    assert.equal(tipos.get(porCodigo.get(codigo).codigo_programa), 'pregrado', `Decisión fuera de los planes de pregrado: ${codigo}`);
    decisiones.set(codigo, f);
  }
  return decisiones;
}
