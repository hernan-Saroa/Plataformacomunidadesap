import type { FilaCarga, ReferenciaPlantilla } from './api/cargaProgramacionApi';

/**
 * Plantilla de Excel de la programación (grupos, horarios y docentes).
 *
 * Sigue la hoja «PROGRAMACIÓN» del Excel con que la ESAP arma hoy su programación: UNA FILA
 * POR SESIÓN; las filas con la misma asignatura, oferta y número de grupo son el mismo grupo.
 * Las columnas usan los códigos del sistema (código de asignatura, código CETAP, documento
 * del docente) en lugar de nombres, que no son únicos. Esta capa solo genera y lee el
 * archivo: TODA la validación la hace el servidor.
 */
export const HOJA = 'PROGRAMACION';

export const COLUMNAS: Array<{ clave: keyof FilaCarga; titulo: string; obligatoria: boolean; ancho: number; ayuda: string }> = [
  { clave: 'codigoAsignatura', titulo: 'CODIGO_ASIGNATURA', obligatoria: true, ancho: 18, ayuda: 'Código del catálogo (hoja ASIGNATURAS), p. ej. ASIG-00003.' },
  { clave: 'grupo', titulo: 'GRUPO', obligatoria: true, ancho: 8, ayuda: 'Número del grupo (1, 2, 3…). Las filas con la misma asignatura, oferta y grupo son el mismo grupo.' },
  { clave: 'tipoOferta', titulo: 'TIPO_OFERTA', obligatoria: false, ancho: 16, ayuda: 'regular (vacío), interperiodo o creditos_virtual.' },
  { clave: 'modalidad', titulo: 'MODALIDAD', obligatoria: false, ancho: 13, ayuda: 'presencial (vacío), virtual o distancia. Virtual y distancia: sin aula.' },
  { clave: 'cupo', titulo: 'CUPO', obligatoria: false, ancho: 8, ayuda: 'Cupo máximo del grupo (por defecto 30).' },
  { clave: 'cetap', titulo: 'CETAP', obligatoria: false, ancho: 12, ayuda: 'Código del CETAP donde se dicta (hoja CETAP). Necesario para concertar.' },
  { clave: 'fechaInicio', titulo: 'FECHA_INICIO', obligatoria: false, ancho: 14, ayuda: 'Inicio del ciclo del grupo (AAAA-MM-DD). Vacío: las fechas del periodo.' },
  { clave: 'fechaFin', titulo: 'FECHA_FIN', obligatoria: false, ancho: 14, ayuda: 'Fin del ciclo del grupo (AAAA-MM-DD). Vacío: las fechas del periodo.' },
  { clave: 'dia', titulo: 'DIA', obligatoria: true, ancho: 12, ayuda: 'LUNES a DOMINGO. Vacío solo en grupos virtuales o a distancia sin horario.' },
  { clave: 'horaInicio', titulo: 'HORA_INICIO', obligatoria: true, ancho: 12, ayuda: 'HH:MM en 24 horas (08:00, 18:30). Múltiplos de 5 minutos.' },
  { clave: 'horaFin', titulo: 'HORA_FIN', obligatoria: true, ancho: 12, ayuda: 'HH:MM en 24 horas, posterior a la de inicio.' },
  { clave: 'tipoSesion', titulo: 'TIPO_SESION', obligatoria: false, ancho: 20, ayuda: 'presencial (vacío) o mediada_tecnologia.' },
  { clave: 'aula', titulo: 'AULA', obligatoria: false, ancho: 10, ayuda: 'Código del aula (solo sesiones presenciales; del CETAP del grupo).' },
  { clave: 'documentoDocente', titulo: 'DOCUMENTO_DOCENTE', obligatoria: false, ancho: 18, ayuda: 'Cédula del docente. Vacío: el grupo queda sin docente.' },
];

const listas: Partial<Record<keyof FilaCarga, string[]>> = {
  tipoOferta: ['regular', 'interperiodo', 'creditos_virtual'],
  modalidad: ['presencial', 'virtual', 'distancia'],
  dia: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'],
  tipoSesion: ['presencial', 'mediada_tecnologia'],
};

const AZUL = 'FF003DA5';
const FILA_ENCABEZADO = 3;

/** Genera la plantilla del periodo con sus hojas de referencia. Devuelve el archivo listo para descargar. */
export async function generarPlantilla(ref: ReferenciaPlantilla): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESAP · Programación Académica';

  const ws = wb.addWorksheet(HOJA, { views: [{ state: 'frozen', ySplit: FILA_ENCABEZADO }] });
  ws.getCell('A1').value = `PROGRAMACIÓN ACADÉMICA ${ref.periodo.codigo}`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: AZUL } };
  ws.getCell('A2').value = 'Una fila por sesión. Columnas en azul: obligatorias. Vea la hoja LEEME. No cambie los títulos de la fila 3.';
  ws.getCell('A2').font = { italic: true, size: 10 };
  COLUMNAS.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.ancho;
    // Texto: Excel no convierte «08:00» en hora ni «ASIG-00003» en otra cosa.
    col.numFmt = '@';
    const celda = ws.getCell(FILA_ENCABEZADO, i + 1);
    celda.value = c.titulo;
    celda.font = { bold: true, color: { argb: c.obligatoria ? 'FFFFFFFF' : 'FF1E293B' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.obligatoria ? AZUL : 'FFE2E8F0' } };
    celda.note = c.ayuda;
    const lista = listas[c.clave];
    if (lista) {
      // Una validación por RANGO (no por celda): el archivo queda liviano.
      const letra = ws.getColumn(i + 1).letter;
      (ws as any).dataValidations.add(`${letra}${FILA_ENCABEZADO + 1}:${letra}${FILA_ENCABEZADO + ref.maxFilas}`, {
        type: 'list', allowBlank: true, formulae: [`"${lista.join(',')}"`], showErrorMessage: true,
        errorTitle: c.titulo, error: `Use uno de: ${lista.join(', ')}.`,
      });
    }
  });

  const asig = wb.addWorksheet('ASIGNATURAS');
  asig.columns = [
    { header: 'CODIGO_ASIGNATURA', key: 'codigo', width: 18 }, { header: 'ASIGNATURA', key: 'nombre', width: 50 },
    { header: 'CODIGO_PROGRAMA', key: 'codigoPrograma', width: 16 }, { header: 'PROGRAMA', key: 'programa', width: 40 },
    { header: 'CREDITOS', key: 'creditos', width: 10 }, { header: 'HORAS_CLASE', key: 'horasClase', width: 12 },
    { header: `OFERTADA_EN_${ref.periodo.codigo}`, key: 'ofertada', width: 18 },
  ];
  ref.asignaturas.forEach((a) => asig.addRow({ ...a, ofertada: a.ofertada ? 'SI' : 'NO' }));
  asig.getRow(1).font = { bold: true };

  const cetap = wb.addWorksheet('CETAP');
  cetap.columns = [
    { header: 'CETAP', key: 'codigoCetap', width: 12 }, { header: 'NOMBRE_CETAP', key: 'cetap', width: 40 },
    { header: 'CODIGO_PROGRAMA', key: 'codigoPrograma', width: 16 }, { header: 'PROGRAMA', key: 'programa', width: 40 },
  ];
  ref.ofertas.forEach((o) => cetap.addRow(o));
  cetap.getRow(1).font = { bold: true };

  const leeme = wb.addWorksheet('LEEME');
  leeme.getColumn(1).width = 22;
  leeme.getColumn(2).width = 100;
  [
    ['Periodo', `${ref.periodo.codigo} (${ref.periodo.fechaInicio ?? '—'} a ${ref.periodo.fechaFin ?? '—'})`],
    ['Cómo se llena', 'Una fila por SESIÓN en la hoja PROGRAMACION. Un grupo con clase lunes y miércoles son dos filas con el mismo código y grupo.'],
    ['Docentes', 'Un docente por sesión. Si dos docentes se reparten un grupo, cada fila lleva el suyo. Se aplican las mismas reglas que en pantalla (área, vinculación, situación, tope, cruces).'],
    ['Todo o nada', `Al cargar, primero se valida TODO el archivo. Si una sola fila tiene un error, no se escribe nada y se muestra la lista de errores con su fila. Máximo ${ref.maxFilas} filas.`],
    ['Grupos existentes', 'Si el grupo ya existe en el periodo, se le agregan las sesiones y los docentes; sus datos (modalidad, cupo, CETAP, fechas) no se cambian.'],
    ['Ejemplo', 'ASIG-00003 | 1 | | presencial | 35 | CET-0288 | 2027-02-01 | 2027-05-29 | LUNES | 08:00 | 10:00 | presencial | 204 | 52336004'],
    ['', ''],
    ...COLUMNAS.map((c) => [c.titulo + (c.obligatoria ? ' *' : ''), c.ayuda]),
  ].forEach((r) => leeme.addRow(r));
  leeme.getColumn(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const normalizarTitulo = (v: unknown) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * Valor de una celda como texto. Excel guarda horas como fracción de día y fechas como
 * fechas: se convierten a «HH:MM» y «AAAA-MM-DD» (en UTC, que es como ExcelJS las entrega).
 */
export function valorCelda(v: any, tipo: 'hora' | 'fecha' | 'texto'): string {
  if (v == null) return '';
  if (typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) return valorCelda(v.result, tipo);
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('').trim();
    if ('text' in v) return String(v.text).trim();
  }
  if (v instanceof Date) {
    if (tipo === 'hora') return `${dosDigitos(v.getUTCHours())}:${dosDigitos(v.getUTCMinutes())}`;
    return `${v.getUTCFullYear()}-${dosDigitos(v.getUTCMonth() + 1)}-${dosDigitos(v.getUTCDate())}`;
  }
  if (typeof v === 'number' && tipo === 'hora' && v >= 0 && v < 1) {
    const min = Math.round(v * 24 * 60);
    return `${dosDigitos(Math.floor(min / 60))}:${dosDigitos(min % 60)}`;
  }
  // Fecha como número de serie de Excel (días desde 1899-12-30).
  if (typeof v === 'number' && tipo === 'fecha' && v > 20000 && v < 80000) {
    return valorCelda(new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86_400_000), 'fecha');
  }
  if (typeof v === 'number' && Number.isInteger(v)) return String(v);
  return String(v).trim();
}

const TIPO_COLUMNA: Partial<Record<keyof FilaCarga, 'hora' | 'fecha'>> = {
  horaInicio: 'hora', horaFin: 'hora', fechaInicio: 'fecha', fechaFin: 'fecha',
};

export class ErrorArchivo extends Error {}

/** Lee el archivo: busca la hoja y la fila de títulos, y devuelve una fila por renglón con datos. */
export async function leerPlantilla(archivo: ArrayBuffer): Promise<FilaCarga[]> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  try { await wb.xlsx.load(archivo); } catch { throw new ErrorArchivo('El archivo no es un Excel válido (.xlsx).'); }
  const ws = wb.getWorksheet(HOJA) ?? wb.worksheets[0];
  if (!ws) throw new ErrorArchivo('El archivo no tiene hojas.');

  const porTitulo = new Map(COLUMNAS.map((c) => [normalizarTitulo(c.titulo), c.clave]));
  let filaTitulos = 0;
  const columna = new Map<number, keyof FilaCarga>();
  for (let r = 1; r <= Math.min(10, ws.rowCount) && !filaTitulos; r += 1) {
    const fila = ws.getRow(r);
    const encontradas = new Map<number, keyof FilaCarga>();
    fila.eachCell((celda, c) => { const k = porTitulo.get(normalizarTitulo(celda.value)); if (k) encontradas.set(c, k); });
    if ([...encontradas.values()].includes('codigoAsignatura')) { filaTitulos = r; encontradas.forEach((k, c) => columna.set(c, k)); }
  }
  if (!filaTitulos) throw new ErrorArchivo(`No se encontró la fila de títulos (CODIGO_ASIGNATURA, GRUPO, DIA…) en la hoja «${ws.name}». Descargue la plantilla y no cambie los títulos.`);
  const faltan = COLUMNAS.filter((c) => c.obligatoria && ![...columna.values()].includes(c.clave)).map((c) => c.titulo);
  if (faltan.length) throw new ErrorArchivo(`Faltan columnas obligatorias: ${faltan.join(', ')}.`);

  const filas: FilaCarga[] = [];
  for (let r = filaTitulos + 1; r <= ws.rowCount; r += 1) {
    const fila = ws.getRow(r);
    const datos: FilaCarga = { fila: r };
    let alguno = false;
    columna.forEach((clave, c) => {
      const v = valorCelda(fila.getCell(c).value, TIPO_COLUMNA[clave] ?? 'texto');
      if (v) { (datos as any)[clave] = v; alguno = true; }
    });
    if (alguno) filas.push(datos);
  }
  if (!filas.length) throw new ErrorArchivo('La hoja de programación no tiene filas con datos.');
  return filas;
}
