import assert from 'node:assert/strict';
import XLSX from 'xlsx';

export function comprobarHorasBase(filas) {
  for (const fila of filas) assert.ok(fila.horas_clase !== '' && fila.horas_clase != null && Number.isFinite(Number(fila.horas_clase)),
    `${fila.codigo_asignatura}: horas_clase está vacía o no es numérica en la base. Exporte el catálogo actual; no se convertirá una celda vacía en 0.`);
}

/** Compara valores y tipos de todas las columnas originales, excepto el área de pregrado. */
export function comprobarConservacion(base, salida) {
  const filas = (w, hoja) => XLSX.utils.sheet_to_json(w.Sheets[hoja], { defval: '', raw: true });
  const programas = filas(base, 'PROGRAMAS');
  const pregrado = new Set(programas.filter(p => String(p.tipo_programa).toLowerCase() === 'pregrado').map(p => p.codigo_programa));
  let campos = 0;
  for (const [hoja, clave] of [['PROGRAMAS', 'codigo_programa'], ['ASIGNATURAS', 'codigo_asignatura'], ['MATRIZ_OFERTA', 'codigo_cetap']]) {
    const anteriores = filas(base, hoja), posteriores = filas(salida, hoja);
    assert.equal(posteriores.length, anteriores.length, `${hoja}: cambió el número de filas`);
    const indice = new Map(posteriores.map(f => [f[clave], f]));
    assert.equal(indice.size, posteriores.length, `${hoja}: hay códigos duplicados`);
    for (const anterior of anteriores) {
      const posterior = indice.get(anterior[clave]);
      assert.ok(posterior, `${hoja}: falta ${anterior[clave]}`);
      for (const campo of Object.keys(posterior)) {
        const trazaArea = hoja === 'ASIGNATURAS' && ['codigo_nucleo_tematico', 'codigo_area_formacion'].includes(campo);
        assert.ok(campo in anterior || trazaArea, `${hoja} ${anterior[clave]}: se añadió el campo ajeno al área ${campo}`);
      }
      for (const campo of Object.keys(anterior)) {
        if (hoja === 'ASIGNATURAS' && campo === 'nucleo_tematico' && pregrado.has(anterior.codigo_programa)) continue;
        assert.deepEqual(posterior[campo], anterior[campo], `${hoja} ${anterior[clave]}: se alteró ${campo}`);
        campos++;
      }
    }
  }
  return { camposComparados: campos, resultado: 'Solo puede cambiar nucleo_tematico de pregrado; el resto coincide campo por campo.' };
}

/** Conserva las celdas originales (incluidos tildes, ceros y fórmulas), cambia solo el área. */
export function actualizarCeldasArea(hoja, asignaturas) {
  const copia = structuredClone(hoja);
  const rango = XLSX.utils.decode_range(hoja['!ref']);
  const columnas = new Map();
  for (let col = rango.s.c; col <= rango.e.c; col++) columnas.set(hoja[XLSX.utils.encode_cell({ r: rango.s.r, c: col })]?.v, col);
  const codigo = columnas.get('codigo_asignatura'), area = columnas.get('nucleo_tematico');
  assert.ok(codigo !== undefined && area !== undefined, 'Faltan columnas de código o área');
  const porCodigo = new Map(asignaturas.map(a => [a.codigo_asignatura, a]));
  const extras = ['codigo_nucleo_tematico', 'codigo_area_formacion'];
  for (const campo of extras) {
    if (!columnas.has(campo)) {
      const col = ++rango.e.c;
      columnas.set(campo, col);
      copia[XLSX.utils.encode_cell({ r: rango.s.r, c: col })] = { t: 's', v: campo };
    }
  }
  for (let r = rango.s.r + 1; r <= rango.e.r; r++) {
    const id = hoja[XLSX.utils.encode_cell({ r, c: codigo })]?.v;
    if (id == null || id === '') continue;
    const actualizada = porCodigo.get(id);
    assert.ok(actualizada, `No hay asignatura ${id}`);
    const celdaArea = XLSX.utils.encode_cell({ r, c: area });
    if (hoja[celdaArea]?.v !== actualizada.nucleo_tematico) copia[celdaArea] = { t: 's', v: actualizada.nucleo_tematico };
    for (const campo of extras) copia[XLSX.utils.encode_cell({ r, c: columnas.get(campo) })] = { t: 's', v: actualizada[campo] ?? '' };
  }
  copia['!ref'] = XLSX.utils.encode_range(rango);
  return copia;
}
