import type { DataValidation, Workbook } from 'exceljs';

/**
 * Formato oficial de la carga masiva RUND (CargaDocentes_RUND_<período>.xlsx):
 * una hoja CARGA_DOCENTES; fila 1 = título con leyenda y período; fila 2 = encabezados
 * coloreados por tipo de campo; datos desde la fila 3, con listas desplegables.
 * El backend toma el período del título (20XX-1/2) y localiza los encabezados por nombre.
 */

export const BANCO_DOCENTES_SHEET_NAME = 'CARGA_DOCENTES';

/** obligatorio = naranja, calculado = amarillo, opcional = azul claro, sistema = gris. */
export type BancoDocentesColumnKind = 'required' | 'calculated' | 'optional' | 'system';

export interface BancoDocentesColumnSpec {
  header: string;
  kind: BancoDocentesColumnKind;
  width: number;
  list?: readonly string[];
}

const NIVELES_FORMACION = ['Pregrado', 'Especialización', 'Maestría', 'Doctorado', 'Doctorado y Posdoctorado', 'Magister cursando Doctorado'];

export const BANCO_DOCENTES_COLUMNS: readonly BancoDocentesColumnSpec[] = [
  { header: 'DOCUMENTO_IDENTIDAD', kind: 'required', width: 22 },
  { header: 'TIPO_DOCUMENTO', kind: 'required', width: 16, list: ['CC', 'CE', 'PA', 'PEP', 'POR VERIFICAR'] },
  { header: 'NOMBRE_COMPLETO', kind: 'required', width: 40 },
  { header: 'GENERO', kind: 'required', width: 14, list: ['Masculino', 'Femenino'] },
  { header: 'SEXO_BIOLOGICO', kind: 'calculated', width: 14, list: ['Hombre', 'Mujer'] },
  { header: 'FECHA_NACIMIENTO', kind: 'required', width: 18 },
  { header: 'EDAD', kind: 'calculated', width: 8 },
  { header: 'RANGO_EDAD', kind: 'calculated', width: 18 },
  { header: 'CORREO_INSTITUCIONAL', kind: 'required', width: 36 },
  { header: 'CORREO_PERSONAL', kind: 'optional', width: 30 },
  { header: 'TELEFONO', kind: 'optional', width: 22 },
  { header: 'VINCULACION', kind: 'required', width: 20, list: ['Carrera1', 'Carrera2', 'Periodo de Prueba', 'Ocasional', 'Especial', 'Visitante'] },
  { header: 'REGIMEN_NORMATIVO', kind: 'calculated', width: 28 },
  { header: 'HORAS_PTA', kind: 'calculated', width: 12 },
  { header: 'TERRITORIAL', kind: 'required', width: 20 },
  { header: 'DEDICACION', kind: 'required', width: 16, list: ['Tiempo Completo', 'Medio Tiempo'] },
  { header: 'DEDICACION_HORAS_SEMANA', kind: 'calculated', width: 14 },
  { header: 'CATEGORIA_ESCALAFON', kind: 'required', width: 20, list: ['Auxiliar', 'Asistente', 'Asociado', 'Titular', 'Visitante'] },
  { header: 'INICIO_VINCULACION', kind: 'required', width: 20 },
  { header: 'FIN_VINCULACION', kind: 'optional', width: 20 },
  { header: 'ESTADO_DOCENTE', kind: 'calculated', width: 16, list: ['Activo', 'Inactivo'] },
  { header: 'ACTO_ADMINISTRATIVO', kind: 'required', width: 44 },
  { header: 'ORIGEN_VINCULACION', kind: 'optional', width: 42 },
  { header: 'PUNTAJE_SALARIAL', kind: 'optional', width: 16 },
  { header: 'SITUACION_ADMINISTRATIVA', kind: 'optional', width: 36 },
  {
    header: 'SITUACION_CATEGORIA',
    kind: 'calculated',
    width: 22,
    list: ['Servicio Activo', 'Año Sabático', 'Dedicación Exclusiva', 'Comisión de Estudios', 'Comisión de Servicios', 'En Periodo de Prueba', 'Cargo Directivo', 'Otra'],
  },
  { header: 'NIVEL_FORMACION', kind: 'required', width: 22, list: NIVELES_FORMACION },
  { header: 'TITULO_PREGRADO', kind: 'required', width: 40 },
  { header: 'TITULO_ESPECIALIZACION', kind: 'optional', width: 40 },
  { header: 'TITULO_MAESTRIA', kind: 'optional', width: 40 },
  { header: 'TITULO_DOCTORADO', kind: 'optional', width: 40 },
  { header: 'TITULO_POSDOCTORADO', kind: 'optional', width: 38 },
  { header: 'NUCLEO_TEMATICO', kind: 'required', width: 50 },
  { header: 'PERFIL_ACADEMICO', kind: 'required', width: 60 },
  { header: 'INVESTIGACION_ACTIVA', kind: 'optional', width: 20 },
  { header: 'ULTIMA_EVALUACION', kind: 'optional', width: 24 },
  { header: 'OBSERVACIONES', kind: 'optional', width: 40 },
  { header: 'ID_RUND', kind: 'system', width: 44 },
];

/** Opciones de la lista desplegable de una columna del formato oficial (vacío si la columna es libre). */
export function bancoDocentesColumnList(header: string): readonly string[] {
  return BANCO_DOCENTES_COLUMNS.find((column) => column.header === header)?.list ?? [];
}

const COLORS: Record<BancoDocentesColumnKind, { headerFill: string; headerFont: string; bodyFill: string | null }> = {
  required: { headerFill: 'FFC55A11', headerFont: 'FFFFFFFF', bodyFill: null },
  calculated: { headerFill: 'FFBF9000', headerFont: 'FFFFFFFF', bodyFill: 'FFFFE699' },
  optional: { headerFill: 'FFD6E4F0', headerFont: 'FF1F3864', bodyFill: null },
  system: { headerFill: 'FF595959', headerFont: 'FFFFFFFF', bodyFill: 'FFD9D9D9' },
};

const TITLE_FILL = 'FF1F3864';
const ZEBRA_FILL = 'FFEBF3FB';
const WHITE_FILL = 'FFFFFFFF';
const BORDER_COLOR = 'FFBFBFBF';

/** Filas con formato y validaciones que trae la plantilla vacía. */
export const BANCO_DOCENTES_TEMPLATE_ROWS = 300;

/** Período académico vigente (año-1 de enero a junio, año-2 de julio a diciembre). */
export function currentBancoDocentesPeriodo(now: Date = new Date()): string {
  return `${now.getFullYear()}-${now.getMonth() < 6 ? 1 : 2}`;
}

export function bancoDocentesTitle(periodo: string, registros: number): string {
  const detalle = registros > 0 ? `${registros} registros × ${BANCO_DOCENTES_COLUMNS.length} campos` : `${BANCO_DOCENTES_COLUMNS.length} campos`;
  return `ESAP – SM-01 RUND  |  CARGA MASIVA BANCO DOCENTES TC/MT  –  Período ${periodo}  |  ${detalle}  |  🟠 Oblig.  🟨 Calculado  ⚫ Sistema  🟡 Corregido  🟧 Revisar`;
}

export type BancoDocentesCellValue = string | number | null | undefined;

export interface BuildBancoDocentesWorkbookOptions {
  periodo?: string;
  /** Filas de datos, indexadas por encabezado. Vacío = plantilla en blanco. */
  rows?: Array<Record<string, BancoDocentesCellValue>>;
  /** Filas formateadas (con listas desplegables) cuando no hay datos. */
  emptyRows?: number;
}

/** Índice de columna base 0 → letra de Excel (0 = A, 26 = AA). */
function colLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export async function buildBancoDocentesWorkbook(options: BuildBancoDocentesWorkbookOptions = {}): Promise<Workbook> {
  const { default: ExcelJS } = await import('exceljs');
  const rows = options.rows ?? [];
  const periodo = options.periodo || currentBancoDocentesPeriodo();
  const totalRows = rows.length > 0 ? rows.length : options.emptyRows ?? BANCO_DOCENTES_TEMPLATE_ROWS;
  const lastColumn = BANCO_DOCENTES_COLUMNS.length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ESAP – RUND';
  const sheet = workbook.addWorksheet(BANCO_DOCENTES_SHEET_NAME, {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 2, showGridLines: false }],
  });

  BANCO_DOCENTES_COLUMNS.forEach((spec, index) => {
    sheet.getColumn(index + 1).width = spec.width;
  });

  sheet.mergeCells(1, 1, 1, lastColumn);
  const title = sheet.getCell(1, 1);
  title.value = bancoDocentesTitle(periodo, rows.length);
  title.font = { name: 'Arial', bold: true, size: 8.5, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 24;

  const thin = { style: 'thin' as const, color: { argb: BORDER_COLOR } };
  const border = { left: thin, right: thin, top: thin, bottom: thin };

  BANCO_DOCENTES_COLUMNS.forEach((spec, index) => {
    const cell = sheet.getCell(2, index + 1);
    const color = COLORS[spec.kind];
    cell.value = spec.header;
    cell.font = { name: 'Arial', bold: true, size: 9, color: { argb: color.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.headerFill } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border;
  });
  sheet.getRow(2).height = 42;

  for (let r = 0; r < totalRows; r += 1) {
    const rowNumber = r + 3;
    const zebra = r % 2 === 0 ? WHITE_FILL : ZEBRA_FILL;
    const source = rows[r];
    BANCO_DOCENTES_COLUMNS.forEach((spec, index) => {
      const cell = sheet.getCell(rowNumber, index + 1);
      const value = source?.[spec.header];
      if (value !== undefined && value !== null && value !== '') cell.value = value;
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS[spec.kind].bodyFill || zebra } };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border = border;
    });
  }

  const firstRow = 3;
  const lastRow = totalRows + 2;
  BANCO_DOCENTES_COLUMNS.forEach((spec, index) => {
    if (!spec.list) return;
    const letter = colLetter(index);
    // `dataValidations` existe en exceljs pero falta en sus tipos; permite validar por rango (A3:A302)
    // en vez de una entrada por celda, como el archivo de referencia.
    (sheet as unknown as { dataValidations: { add: (range: string, rule: DataValidation) => void } }).dataValidations.add(`${letter}${firstRow}:${letter}${lastRow}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${spec.list.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Valor no válido',
      error: 'Seleccione un valor de la lista.',
    });
  });

  return workbook;
}

export async function bancoDocentesWorkbookToBlob(workbook: Workbook): Promise<Blob> {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function saveBlobAs(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
