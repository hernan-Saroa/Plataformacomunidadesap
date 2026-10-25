import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import { validarCatalogo } from './validar-catalogo.mjs';
import { comprobarConservacion, comprobarHorasBase } from './comparar-catalogos.mjs';
const archivo = new URL('./resultados/2026-1/catalogo-importable-2026-1.xlsx', import.meta.url);
const reporte = JSON.parse(fs.readFileSync(new URL('./resultados/2026-1/catalogo-importable-reporte.json', import.meta.url)));
const base = new URL('./resultados/2026-1/catalogo-base-comparacion.xlsx', import.meta.url);
test('compara cada fila y cada campo ajeno al área contra la base después de escribir el Excel', () => {
  const resultado = comprobarConservacion(XLSX.readFile(base), XLSX.readFile(archivo));
  assert.ok(resultado.camposComparados > 11000);
});
test('la comparación falla si se cambia cualquiera de las columnas originales ajenas al área', () => {
  const original = XLSX.readFile(base);
  for (const [hoja, clave] of [['PROGRAMAS','codigo_programa'], ['ASIGNATURAS','codigo_asignatura'], ['MATRIZ_OFERTA','codigo_cetap']]) {
    const rango = XLSX.utils.decode_range(original.Sheets[hoja]['!ref']);
    for (let c = rango.s.c; c <= rango.e.c; c++) {
      const campo = original.Sheets[hoja][XLSX.utils.encode_cell({ r: rango.s.r, c })]?.v;
      if (!campo || campo === 'nucleo_tematico') continue;
      const alterado = structuredClone(original), posicion = XLSX.utils.encode_cell({ r: rango.s.r + 1, c });
      alterado.Sheets[hoja][posicion] = { t: 's', v: 'DATO ALTERADO PARA REGRESIÓN' };
      assert.throws(() => comprobarConservacion(original, alterado), undefined, `${hoja}.${campo} debe estar protegido (${clave})`);
    }
  }
});
test('conserva Público con tilde y las tres horas_clase iguales a cero', () => {
  const filas = XLSX.utils.sheet_to_json(XLSX.readFile(archivo).Sheets.ASIGNATURAS, { defval: '' });
  assert.ok(filas.find(f => f.codigo_asignatura === 'ASIG-00170').nombre_asignatura.includes('Público'));
  for (const codigo of ['ASIG-00139', 'ASIG-00218', 'ASIG-00427']) assert.equal(filas.find(f => f.codigo_asignatura === codigo).horas_clase, 0, codigo);
});
test('rechaza horas vacías en una base defectuosa y admite el cero explícito', () => {
  assert.doesNotThrow(() => comprobarHorasBase([{ codigo_asignatura: 'ASIG-00139', horas_clase: 0 }]));
  assert.throws(() => comprobarHorasBase([{ codigo_asignatura: 'ASIG-00139', horas_clase: '' }]), /ASIG-00139.*horas_clase está vacía/);
});
test('el archivo pasa el parser y validador publicado del importador', async () => {
  const r = await validarCatalogo(archivo);
  assert.equal(r.isValid, true); assert.deepEqual(r.errors, []);
  assert.equal(r.asignaturas, 427); assert.equal(r.programas, 14); assert.equal(r.ofertas, 325);
});
test('conserva códigos y datos de posgrado, con las revisiones manuales dentro del libro', () => {
  const w = XLSX.readFile(archivo), a = XLSX.utils.sheet_to_json(w.Sheets.ASIGNATURAS);
  assert.equal(new Set(a.map(f => f.codigo_asignatura)).size, a.length);
  const huella = createHash('sha256').update(JSON.stringify(a.map(f => f.codigo_asignatura).sort())).digest('hex');
  assert.equal(huella, reporte.identidades.codigosAntes);
  assert.equal(reporte.identidades.codigosAntes, reporte.identidades.codigosDespues);
  assert.equal(reporte.identidades.posgradoAntes, reporte.identidades.posgradoDespues);
  assert.equal(reporte.posgradoConservadas, 160);
  const manual = XLSX.utils.sheet_to_json(w.Sheets.REVISION_OPCION_GRADO);
  assert.equal(manual.length, 4);
  assert.ok(manual.every(f => f.decision.includes('REVISAR A MANO')));
  assert.ok(XLSX.utils.sheet_to_json(w.Sheets.REVISION_CATALOGO).length > 0);
});
test('la validación real rechaza créditos no numéricos en una copia del libro', async () => {
  const w = XLSX.readFile(archivo), filas = XLSX.utils.sheet_to_json(w.Sheets.ASIGNATURAS, { defval: '' });
  filas[0].creditos = 'no-numérico';
  w.Sheets.ASIGNATURAS = XLSX.utils.json_to_sheet(filas);
  const temporal = path.join(tmpdir(), `pa-catalogo-invalido-${process.pid}.xlsx`);
  try {
    XLSX.writeFile(w, temporal);
    const r = await validarCatalogo(temporal);
    assert.equal(r.isValid, false);
    assert.ok(r.errors.some(e => /creditos|créditos/i.test(e)));
  } finally { if (fs.existsSync(temporal)) fs.unlinkSync(temporal); }
});
