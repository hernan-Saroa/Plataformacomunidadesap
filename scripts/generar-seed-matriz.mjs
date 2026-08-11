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
const DESTINO = 'db/migrations/hiring/013_catalogo_actividades.sql';

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

  const descripcion = celdas[3]?.trim() || null;
  const columnas = celdas.slice(4, 4 + MODALIDADES.length);

  actividades.push({
    numeral,
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

CREATE TABLE IF NOT EXISTS hiring.actividades_catalogo (
  numeral      varchar(10)  PRIMARY KEY,
  etapa        int          NOT NULL,
  nombre       varchar(300) NOT NULL,
  descripcion  text,
  -- Orden dentro de la etapa; conserva la lectura de la matriz.
  orden        int          NOT NULL,
  -- Una actividad derogada deja de instanciarse sin romper los procesos que
  -- ya la recorrieron.
  activa       boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_act_cat_etapa
  ON hiring.actividades_catalogo (etapa, orden) WHERE activa;

CREATE TABLE IF NOT EXISTS hiring.actividad_modalidad (
  numeral    varchar(10) NOT NULL REFERENCES hiring.actividades_catalogo (numeral) ON DELETE CASCADE,
  modalidad  varchar(60) NOT NULL REFERENCES hiring.modalidades (codigo),
  -- NULL cuando la celda venía vacía: no es lo mismo "no aplica" que
  -- "la matriz no lo dice".
  aplica     boolean,
  -- Texto de la celda cuando no era SI/NO, como el "TVEC" del numeral 2.3.
  variante   varchar(120),
  -- Por qué esta celda necesita revisión, si la necesita.
  nota       text,
  PRIMARY KEY (numeral, modalidad)
);

CREATE INDEX IF NOT EXISTS idx_act_mod_aplica
  ON hiring.actividad_modalidad (modalidad) WHERE aplica;

-- ------------------------------------------------------------ actividades --
`);

const porEtapa = new Map();
for (const a of actividades) {
  const orden = (porEtapa.get(a.etapa) ?? 0) + 1;
  porEtapa.set(a.etapa, orden);
  a.orden = orden;
}

partes.push('INSERT INTO hiring.actividades_catalogo (numeral, etapa, nombre, descripcion, orden) VALUES');
partes.push(
  actividades
    .map((a) => `  (${sql(a.numeral)}, ${a.etapa}, ${sql(a.nombre)}, ${sql(a.descripcion)}, ${a.orden})`)
    .join(',\n'),
);
partes.push(`ON CONFLICT (numeral) DO UPDATE
  SET etapa = EXCLUDED.etapa,
      nombre = EXCLUDED.nombre,
      descripcion = EXCLUDED.descripcion,
      orden = EXCLUDED.orden,
      updated_at = now();

-- -------------------------------------------------------- aplicabilidad ---
`);

partes.push('INSERT INTO hiring.actividad_modalidad (numeral, modalidad, aplica, variante, nota) VALUES');
const filas = [];
for (const a of actividades) {
  for (const m of a.aplicabilidad) {
    filas.push(
      `  (${sql(a.numeral)}, ${sql(m.codigo)}, ${m.aplica === null ? 'NULL' : m.aplica}, ${sql(m.variante)}, ${sql(m.nota)})`,
    );
  }
}
partes.push(filas.join(',\n'));
partes.push(`ON CONFLICT (numeral, modalidad) DO UPDATE
  SET aplica = EXCLUDED.aplica,
      variante = EXCLUDED.variante,
      nota = EXCLUDED.nota;
`);

writeFileSync(DESTINO, partes.join('\n'));

const conNota = filas.filter((f) => f.includes('condición no documentada')).length;
const conVariante = filas.filter((f) => !f.endsWith('NULL, NULL)')).length - conNota;
console.log(`${actividades.length} actividades, ${filas.length} filas de aplicabilidad`);
console.log(`${conNota} celdas marcadas para revisar, ${conVariante} con variante`);
console.log(`escrito en ${DESTINO}`);
