import { createHash } from 'crypto';
import { Workbook, type Worksheet, type CellValue } from 'exceljs';
import type { HallazgoPaa, ValoresLineaPaa } from '../../entities/paa.entity';
import {
  COLUMNAS_PAA,
  MESES,
  DIAS_POR_INTERVALO,
  NOMBRE_HOJA,
  PREFIJO_EXTRA,
  normalizar,
  type ColumnaPaa,
} from './estructura-paa';

export interface LineaLeida {
  codigo: string;
  /** El prefijo de su código, en mayúsculas y sin tildes: «LINEA», «CHOCO». */
  prefijo: string;
  fila: number;
  valores: ValoresLineaPaa;
  huella: string;
}

/**
 * Una región tal como aparece en el archivo: un prefijo y la unidad de
 * contratación que escriben sus líneas. De aquí salen las regiones; nadie las
 * crea a mano.
 */
export interface RegionLeida {
  prefijo: string;
  unidadContratacion: string;
  /** La primera fila con ese prefijo, para señalarla en los mensajes. */
  fila: number;
  lineas: number;
}

export interface ResultadoLectura {
  encabezados: string[];
  lineas: LineaLeida[];
  regiones: RegionLeida[];
  errores: HallazgoPaa[];
  advertencias: HallazgoPaa[];
}

export interface ContextoLectura {
  /** Texto normalizado de la modalidad → código de `hiring.modalidades`. */
  equivalencias: Map<string, string>;
}

/** «LINEA 12 - 0060OT12-7068 - Prestar…» o «CHOCO 3 - Prestar…». */
const PATRON_DESCRIPCION = /^\s*([A-Za-zÁÉÍÓÚÑáéíóúñ]+)\s*(\d+)\s*-\s*([\s\S]*)$/;
/** El código de la dependencia y el rubro, cuando lo trae: «0060OT12-7068», «0201FA806-3543E». */
const PATRON_CODIGO_INTERNO = /^(\d{4}[A-Z]{2}\d+-\d+[A-Z]?)\s*-\s*([\s\S]*)$/;

/** Cuántas filas se buscan los encabezados antes de rendirse. */
const FILAS_PARA_ENCABEZADOS = 10;

/**
 * Lee un PAA y dice qué tiene y qué le falta.
 *
 * No escribe nada: devuelve las líneas con su prefijo, las regiones que
 * aparecen en el archivo y la lista de errores y advertencias. Con un solo error el archivo no se puede activar,
 * pero se sigue leyendo para que quien lo corrige vea todo de una vez y no
 * suba el archivo diez veces para descubrir diez errores.
 */
export async function leerPaa(contenido: Buffer, contexto: ContextoLectura): Promise<ResultadoLectura> {
  const errores: HallazgoPaa[] = [];
  const advertencias: HallazgoPaa[] = [];
  const vacio = (): ResultadoLectura => ({ encabezados: [], lineas: [], regiones: [], errores, advertencias });

  const libro = new Workbook();
  try {
    await libro.xlsx.load(contenido as unknown as ArrayBuffer);
  } catch {
    errores.push(hallazgo(null, null, null, 'El archivo no es un Excel (.xlsx) que se pueda abrir.'));
    return vacio();
  }

  const hoja = elegirHoja(libro.worksheets, errores, advertencias);
  if (!hoja) return vacio();

  const filaEncabezados = buscarFilaDeEncabezados(hoja);
  if (filaEncabezados === null) {
    errores.push(
      hallazgo(null, null, null, `No se encontró la fila de encabezados: se buscó «Descripción» en las primeras ${FILAS_PARA_ENCABEZADOS} filas.`),
    );
    return vacio();
  }

  const encabezados = leerFila(hoja, filaEncabezados).map((v) => texto(v) ?? '');
  const columnas = ubicarColumnas(encabezados, filaEncabezados, errores, advertencias);
  if (!columnas) return { ...vacio(), encabezados };

  const lineas: LineaLeida[] = [];
  const regiones = new Map<string, RegionLeida>();
  const vistos = new Map<string, number>();

  for (let fila = filaEncabezados + 1; fila <= hoja.rowCount; fila++) {
    const celdas = leerFila(hoja, fila);
    if (celdas.every((c) => texto(c) === null)) continue;

    const valores: ValoresLineaPaa = {};
    let filaValida = true;

    for (const [indice, columna] of columnas.conocidas) {
      const r = convertir(columna, celdas[indice], fila, errores);
      if (!r.ok) filaValida = false;
      valores[columna.clave] = r.valor;
    }
    for (const [indice, encabezado] of columnas.extra) {
      valores[PREFIJO_EXTRA + encabezado] = texto(celdas[indice]);
    }

    const descripcion = valores.descripcion as string | null;
    if (!descripcion) {
      errores.push(hallazgo(fila, 'Descripción', null, 'La fila tiene datos pero no tiene descripción, y de la descripción sale el código de la línea.'));
      continue;
    }

    const m = PATRON_DESCRIPCION.exec(descripcion);
    if (!m) {
      errores.push(
        hallazgo(fila, 'Descripción', recortar(descripcion), 'La descripción no empieza por el código de la línea. Se espera «LINEA 12 - …» o el prefijo de la región, como «CHOCO 3 - …».'),
      );
      continue;
    }

    const prefijo = normalizar(m[1]).toUpperCase();
    const codigo = `${prefijo} ${Number(m[2])}`;
    const resto = m[3].trim();
    const interno = PATRON_CODIGO_INTERNO.exec(resto);
    valores.codigo_interno = interno ? interno[1] : null;
    valores.objeto = (interno ? interno[2] : resto).trim() || null;
    if (!valores.objeto) {
      errores.push(hallazgo(fila, 'Descripción', recortar(descripcion), `La línea ${codigo} no tiene objeto después del código.`));
      filaValida = false;
    }

    // La región es el prefijo, y la unidad la comprueba: todas las líneas de un
    // prefijo dicen la misma. Una que dice otra está mal escrita en el prefijo
    // o en la unidad, y repartirla sería adivinar.
    const unidad = valores.unidad_contratacion as string | null;
    const region = regiones.get(prefijo);
    if (!region) {
      if (unidad) regiones.set(prefijo, { prefijo, unidadContratacion: unidad, fila, lineas: 0 });
    } else if (unidad && normalizar(unidad) !== normalizar(region.unidadContratacion)) {
      errores.push(
        hallazgo(fila, 'Unidad de contratación (referencia)', unidad, `Las líneas ${prefijo} son de «${region.unidadContratacion}» (fila ${region.fila}) y la ${codigo} dice otra unidad. O el prefijo o la unidad están mal escritos.`),
      );
      filaValida = false;
    }

    const modalidad = valores.modalidad as string | null;
    const codigoModalidad = contexto.equivalencias.get(normalizar(modalidad));
    valores.modalidad_codigo = codigoModalidad ?? null;
    if (modalidad && !codigoModalidad) {
      errores.push(
        hallazgo(fila, 'Modalidad de selección', modalidad, 'La modalidad no corresponde a ninguna del catálogo. Si es un nombre nuevo, hay que registrar su equivalencia.'),
      );
      filaValida = false;
    }

    const total = valores.valor_total as number | null;
    const enVigencia = valores.valor_vigencia as number | null;
    if (total !== null && enVigencia !== null && enVigencia > total) {
      advertencias.push(
        hallazgo(fila, 'Valor estimado en la vigencia actual', String(enVigencia), `En ${codigo} lo de la vigencia supera el valor total (${total}).`),
      );
    }

    const anterior = vistos.get(codigo);
    if (anterior !== undefined) {
      errores.push(
        hallazgo(fila, 'Descripción', codigo, `El código ${codigo} ya está en la fila ${anterior}. Con dos líneas con el mismo código no se sabe cuál corresponde a cada proceso.`),
      );
      continue;
    }
    vistos.set(codigo, fila);

    if (filaValida) {
      lineas.push({ codigo, prefijo, fila, valores, huella: huellaDe(valores) });
      const suya = regiones.get(prefijo);
      if (suya) suya.lineas++;
    }
  }

  if (!lineas.length && !errores.length) {
    errores.push(hallazgo(null, null, null, 'El archivo no tiene ninguna línea debajo de los encabezados.'));
  }

  return { encabezados, lineas, regiones: [...regiones.values()], errores, advertencias };
}

/** sha256 de los valores con las claves ordenadas: igual contenido, igual huella. */
export function huellaDe(valores: ValoresLineaPaa): string {
  const ordenado = Object.keys(valores)
    .sort()
    .map((k) => [k, valores[k] ?? null]);
  return createHash('sha256').update(JSON.stringify(ordenado)).digest('hex');
}

// ------------------------------------------------------------------ hoja --

function elegirHoja(hojas: Worksheet[], errores: HallazgoPaa[], advertencias: HallazgoPaa[]): Worksheet | null {
  const porNombre = hojas.find((h) => normalizar(h.name) === normalizar(NOMBRE_HOJA));
  if (porNombre) return porNombre;

  if (hojas.length === 1) {
    advertencias.push(hallazgo(null, null, hojas[0].name, `La hoja no se llama «${NOMBRE_HOJA}»; se leyó la única que tiene el archivo.`));
    return hojas[0];
  }
  errores.push(
    hallazgo(null, null, hojas.map((h) => h.name).join(', '), `No hay una hoja «${NOMBRE_HOJA}» y el archivo tiene varias: no se puede saber cuál es el plan.`),
  );
  return null;
}

function buscarFilaDeEncabezados(hoja: Worksheet): number | null {
  const tope = Math.min(hoja.rowCount, FILAS_PARA_ENCABEZADOS);
  for (let fila = 1; fila <= tope; fila++) {
    if (leerFila(hoja, fila).some((v) => normalizar(texto(v)) === 'descripcion')) return fila;
  }
  return null;
}

interface Ubicacion {
  conocidas: [number, ColumnaPaa][];
  extra: [number, string][];
}

/**
 * Cada columna del formato tiene que estar, y en su sitio.
 *
 * El orden se exige porque el formato es el de SECOP y no cambia: una columna
 * corrida suele ser una columna insertada a mano, y cruzar por nombre la
 * dejaría pasar sin que nadie lo notara.
 */
function ubicarColumnas(
  encabezados: string[],
  filaEncabezados: number,
  errores: HallazgoPaa[],
  advertencias: HallazgoPaa[],
): Ubicacion | null {
  const conocidas: [number, ColumnaPaa][] = [];
  const usados = new Set<number>();
  let completas = true;

  COLUMNAS_PAA.forEach((columna, esperado) => {
    const buscado = normalizar(columna.encabezado);
    const encontrado = encabezados.findIndex((e) => normalizar(e) === buscado);
    if (encontrado === -1) {
      errores.push(hallazgo(filaEncabezados, columna.encabezado, null, `Falta la columna «${columna.encabezado}» (se espera en la ${letra(esperado)}).`));
      completas = false;
      return;
    }
    if (encontrado !== esperado) {
      errores.push(
        hallazgo(filaEncabezados, columna.encabezado, letra(encontrado), `La columna «${columna.encabezado}» está en la ${letra(encontrado)} y se espera en la ${letra(esperado)}. El formato no admite columnas movidas.`),
      );
      completas = false;
    }
    usados.add(encontrado);
    conocidas.push([encontrado, columna]);
  });

  const extra: [number, string][] = [];
  encabezados.forEach((e, i) => {
    if (usados.has(i) || !e.trim()) return;
    extra.push([i, e.trim()]);
    advertencias.push(
      hallazgo(filaEncabezados, e.trim(), letra(i), 'Columna que no es del formato: se guarda tal cual y se puede mostrar en el formulario, pero no se valida.'),
    );
  });

  return completas ? { conocidas, extra } : null;
}

// --------------------------------------------------------------- valores --

type Conversion = { ok: true; valor: string | number | null } | { ok: false; valor: string | null };

function convertir(columna: ColumnaPaa, celda: CellValue, fila: number, errores: HallazgoPaa[]): Conversion {
  const crudo = texto(celda);
  if (crudo === null) {
    if (columna.tipo === 'moneda' || columna.uso !== 'informativo') {
      errores.push(hallazgo(fila, columna.encabezado, null, 'La celda está vacía y el dato es obligatorio.'));
      return { ok: false, valor: null };
    }
    return { ok: true, valor: null };
  }

  const falla = (esperado: string): Conversion => {
    errores.push(hallazgo(fila, columna.encabezado, recortar(crudo), `Se espera ${esperado}.`));
    return { ok: false, valor: crudo };
  };

  switch (columna.tipo) {
    case 'moneda': {
      const n = typeof celda === 'number' ? celda : numeroDeTexto(crudo);
      return n === null || n < 0 ? falla('un valor en pesos, sin texto') : { ok: true, valor: n };
    }
    case 'entero': {
      const n = Number(crudo);
      return Number.isInteger(n) && n > 0 ? { ok: true, valor: n } : falla('un número entero mayor que cero');
    }
    case 'mes':
      return MESES.includes(normalizar(crudo)) ? { ok: true, valor: crudo } : falla('el nombre de un mes');
    case 'si_no':
      return ['si', 'no'].includes(normalizar(crudo)) ? { ok: true, valor: crudo } : falla('«Sí» o «No»');
    case 'intervalo':
      return normalizar(crudo) in DIAS_POR_INTERVALO ? { ok: true, valor: crudo } : falla('«Días», «Meses» o «Años»');
    default:
      return { ok: true, valor: crudo };
  }
}

/** «$ 78.852.000» o «78852000,50» a número; null si no es un número. */
function numeroDeTexto(valor: string): number | null {
  const limpio = valor.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
}

/** El valor visible de una celda, sin importar si es texto enriquecido o fórmula. */
function texto(celda: CellValue | undefined): string | null {
  if (celda === null || celda === undefined) return null;
  if (typeof celda === 'number') return String(celda);
  if (typeof celda === 'string') return celda.trim() || null;
  if (celda instanceof Date) return celda.toISOString().slice(0, 10);
  if (typeof celda === 'object') {
    if ('richText' in celda) return celda.richText.map((t) => t.text).join('').trim() || null;
    if ('result' in celda) return texto(celda.result as CellValue);
    if ('text' in celda) return String(celda.text).trim() || null;
  }
  return String(celda).trim() || null;
}

function leerFila(hoja: Worksheet, numero: number): CellValue[] {
  const fila = hoja.getRow(numero);
  const celdas: CellValue[] = [];
  for (let c = 1; c <= Math.max(hoja.columnCount, COLUMNAS_PAA.length); c++) {
    celdas.push(fila.getCell(c).value);
  }
  return celdas;
}

function letra(indice: number): string {
  let n = indice + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return `columna ${s}`;
}

function recortar(valor: string): string {
  return valor.length > 120 ? `${valor.slice(0, 117)}…` : valor;
}

function hallazgo(fila: number | null, columna: string | null, valor: string | null, mensaje: string): HallazgoPaa {
  return { fila, columna, valor, mensaje };
}
