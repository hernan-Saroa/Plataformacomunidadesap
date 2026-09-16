/**
 * Genera el seed de actividades y su aplicabilidad por modalidad a partir de
 * A2_MATRIZ_FLUJO.md.
 *
 * La matriz se escribió en Excel y eso se nota: la etapa solo aparece en la
 * primera fila de cada grupo, el numeral se corre de columna cuando la etapa
 * está presente, y los decimales llegan como 1.1000000000000001. Parsearla a
 * mano una vez y regenerar el seed cuando Contratación la corrija sale más
 * barato que mantener 693 INSERT escritos a mano.
 *
 *   node scripts/generar-seed-matriz.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ORIGEN = 'docs/contratacion/A2_MATRIZ_FLUJO.md';
const DESTINO = 'db/migrations/hiring/024_matriz_completa.sql';

/** Códigos del catálogo, en el orden de las columnas de la matriz. */
const MODALIDADES = [
  'LICITACION_PUBLICA',
  'ABREVIADA_MENOR_CUANTIA',
  'ABREVIADA_SUBASTA_INVERSA',
  'ENAJENACION_SUBASTA',
  'ABREVIADA_TVEC',
  'ABREVIADA_BOLSA_MERCANTIL',
  'CONCURSO_MERITOS_ABIERTO',
  'CONCURSO_MERITOS_PRECAL',
  'MINIMA_CUANTIA',
  'REGIMEN_ESPECIAL_092',
  'CONTRATACION_DIRECTA',
];

/** Excel guardó 1.1000000000000001 donde el documento dice 1.1. */
function normalizarNumeral(bruto) {
  const limpio = bruto.trim();
  if (!limpio) return null;
  const n = Number(limpio);
  if (Number.isNaN(n)) return null;
  // Dos decimales bastan para 10.12; el redondeo elimina el ruido binario.
  return String(Math.round(n * 100) / 100);
}

/**
 * "1.Identificación y Planeación" -> 1
 *
 * La primera celda de una fila trae la etapa cuando el grupo empieza, y el
 * numeral cuando continúa. Ambos casos abren con dígito y punto, así que lo
 * que los separa es lo que sigue: la etapa lleva letras, el numeral dígitos.
 * Sin esa distinción "1.2" se leería como la etapa 1 y el numeral se buscaría
 * en la columna equivocada, perdiendo cuatro de cada cinco actividades.
 */
function numeroDeEtapa(texto) {
  const m = texto?.match(/^(\d+)\s*\.\s*[^\d\s]/);
  return m ? Number(m[1]) : null;
}

/**
 * Cada celda dice si la actividad aplica a esa modalidad. Además de SI y NO
 * aparecen dos casos que no son booleanos:
 *   - "si*"  : aplica, pero la matriz marca una condición que no está
 *              documentada en ninguna leyenda.
 *   - "TVEC" : aplica con una variante propia de esa modalidad.
 */
function interpretarCelda(bruto) {
  const v = (bruto ?? '').trim();
  if (!v) return { aplica: null, variante: null, nota: null };

  const bajo = v.toLowerCase();
  if (bajo === 'no') return { aplica: false, variante: null, nota: null };
  if (bajo === 'si' || bajo === 'sí') return { aplica: true, variante: null, nota: null };
  if (bajo === 'si*' || bajo === 'sí*') {
    return {
      aplica: true,
      variante: null,
      // Se conserva la marca en vez de descartarla: es una señal de que ahí
      // hay una condición sin definir, y ocultarla la haría desaparecer.
      nota: 'La matriz marca una condición no documentada; verificar con la Dirección de Contratación',
    };
  }
  // Cualquier otro texto es una variante: "TVEC" en la fila 2.3, por ejemplo.
  return { aplica: true, variante: v, nota: null };
}

// El markdown salió de una conversión hecha en Windows: sin quitar el \r cada
// línea termina en un carácter invisible, y las expresiones ancladas al final
// dejan de engancharla.
const lineas = readFileSync(ORIGEN, 'utf8').split(/\r?\n/);
const actividades = [];
/** Numerales ya usados en cada etapa, para no repetirlos. */
const porEtapaVistas = new Map();
let etapaActual = null;

for (const linea of lineas) {
  const m = linea.match(/^R(\d+):\s*(.*)$/);
  if (!m) continue;
  const fila = Number(m[1]);
  if (fila < 4) continue; // R1..R3 son metadatos y la cabecera

  const celdas = m[2].split('|').map((c) => c.trim());

  // Cuando la fila abre una etapa, el numeral se corre una columna a la
  // derecha; si no, la primera celda ya es el numeral.
  const abreEtapa = numeroDeEtapa(celdas[0]);
  if (abreEtapa !== null) etapaActual = abreEtapa;

  const numeral = normalizarNumeral(abreEtapa !== null ? celdas[1] : celdas[0]);
  if (!numeral || etapaActual === null) continue;

  const nombre = celdas[2]?.trim();
  if (!nombre) continue;

  // Ocho filas del Excel traen ahí el número de fila de la hoja en vez del
  // numeral —"153" donde debería decir "5.10"—, y eso deja actividades con un
  // identificador que no corresponde a su etapa. Se reconstruye a partir de la
  // etapa y de cuántas van, que es lo que el documento numera.
  // El numeral es único: dos actividades distintas no pueden compartirlo. Se
  // toma el del Excel cuando corresponde a la etapa y no está tomado; si no
  // —ocho filas traen el número de fila de la hoja, y algunas repiten uno ya
  // usado— se continúa la numeración de la etapa.
  const tomados = porEtapaVistas.get(etapaActual) ?? new Set();
  porEtapaVistas.set(etapaActual, tomados);

  let suyo = numeral;
  if (!numeral.startsWith(`${etapaActual}.`) || tomados.has(numeral)) {
    let n = tomados.size + 1;
    while (tomados.has(`${etapaActual}.${n}`)) n++;
    suyo = `${etapaActual}.${n}`;
  }
  tomados.add(suyo);

  const descripcion = celdas[3]?.trim() || null;
  const columnas = celdas.slice(4, 4 + MODALIDADES.length);

  actividades.push({
    numeral: suyo,
    etapa: etapaActual,
    nombre,
    descripcion,
    aplicabilidad: MODALIDADES.map((codigo, i) => ({
      codigo,
      ...interpretarCelda(columnas[i]),
    })),
  });
}

const sql = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const partes = [];
partes.push(`-- ============================================================================
-- 013 · Catálogo de actividades y su aplicabilidad por modalidad
--
-- Generado por scripts/generar-seed-matriz.mjs desde A2_MATRIZ_FLUJO.md.
-- NO EDITAR A MANO: corregir la matriz y volver a ejecutar el script.
--
-- La matriz es la fuente única de verdad funcional, y aún no está validada
-- por la Dirección de Contratación. Por eso el seed es idempotente: cuando
-- corrijan una celda basta regenerar y volver a aplicar, sin migración nueva.
--
-- Actividades: ${actividades.length}
-- Aplicabilidad: ${actividades.length * MODALIDADES.length} filas
-- ============================================================================

-- Las tablas ya existen desde 010_cdp.sql: aqui solo se siembran los datos.
-- ------------------------------------------------------------ actividades --
`);

const porEtapa = new Map();
for (const a of actividades) {
  const orden = (porEtapa.get(a.etapa) ?? 0) + 1;
  porEtapa.set(a.etapa, orden);
  a.orden = orden;
}

partes.push('INSERT INTO hiring.actividades (numeral, etapa, nombre, descripcion, orden) VALUES');
partes.push(
  actividades
    .map((a) => `  (${sql(a.numeral)}, ${a.etapa}, ${sql(a.nombre)}, ${sql(a.descripcion)}, ${a.orden})`)
    .join(',\n'),
);
partes.push(`ON CONFLICT (numeral) DO UPDATE
  SET etapa = EXCLUDED.etapa,
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      orden = EXCLUDED.orden;

-- -------------------------------------------------------- aplicabilidad ---
-- Solo se registran los NO: la ausencia de fila significa que la actividad
-- aplica, que es el caso mayoritario. De 693 celdas, la inmensa mayoria son SI.
`);

// Se limpian primero las exclusiones de las actividades que se van a sembrar:
// si una celda paso de NO a SI, la fila vieja tiene que desaparecer.
partes.push('DELETE FROM hiring.actividades_excluidas WHERE numeral IN (');
partes.push('  ' + actividades.map((a) => sql(a.numeral)).join(', '));
partes.push(');');
partes.push('');

const exclusiones = [];
// Celdas que aplican pero no dicen SI a secas: "si*" y las variantes de texto.
// Se sembraban solo cuando la celda estaba en NO —donde nunca hay ninguna—, asi
// que las veinte que traen matiz llegaban a la base como un SI cualquiera.
const salvedades = [];
for (const a of actividades) {
  for (const m of a.aplicabilidad) {
    // NULL es "la matriz no lo dice": ante la duda la actividad aplica, que es
    // lo seguro —omitirla dejaria el proceso incompleto sin avisar a nadie.
    if (m.aplica === false) {
      const motivo = m.nota ?? (m.variante ? `La matriz dice "${m.variante}"` : null);
      exclusiones.push(`  (${sql(a.numeral)}, ${sql(m.codigo)}, ${sql(motivo)})`);
    } else if (m.nota || m.variante) {
      const nota = m.nota ?? `En esta modalidad la matriz dice "${m.variante}"`;
      salvedades.push(`  (${sql(a.numeral)}, ${sql(m.codigo)}, ${sql(m.variante)}, ${sql(nota)})`);
    }
  }
}

if (exclusiones.length > 0) {
  partes.push('INSERT INTO hiring.actividades_excluidas (numeral, modalidad, motivo) VALUES');
  partes.push(exclusiones.join(',\n'));
  partes.push('ON CONFLICT (numeral, modalidad) DO UPDATE SET motivo = EXCLUDED.motivo;');
}

partes.push(`
-- ------------------------------------------------------------ salvedades --
-- Las celdas que aplican con una condicion ("si*") o con una variante propia
-- de la modalidad ("TVEC", "Comunicacion de aceptacion"). La tabla la crea
-- 025_salvedades_matriz.sql.
`);
partes.push('DELETE FROM hiring.actividades_salvedad WHERE numeral IN (');
partes.push('  ' + actividades.map((a) => sql(a.numeral)).join(', '));
partes.push(');');

if (salvedades.length > 0) {
  partes.push('');
  partes.push('INSERT INTO hiring.actividades_salvedad (numeral, modalidad, variante, nota) VALUES');
  partes.push(salvedades.join(',\n'));
  partes.push(`ON CONFLICT (numeral, modalidad) DO UPDATE
  SET variante = EXCLUDED.variante,
      nota = EXCLUDED.nota;`);
}

writeFileSync(DESTINO, partes.join('\n'));

console.log(`${actividades.length} actividades, ${exclusiones.length} exclusiones, ${salvedades.length} salvedades`);
console.log(`escrito en ${DESTINO}`);
