import ExcelJS from 'exceljs';
import type { Style } from 'exceljs';
import type { GraduateExportProgress, GraduatePreviewRow } from './graduateBulkWorkbook';
import { getGraduateFieldErrors, GRADUATE_TEMPLATE_COLUMNS } from './graduateBulkValidation';
import type { FieldKey } from './graduateBulkValidation';

const DATA_COLUMNS: Record<FieldKey, { title: string; width: number }> = {
  identificacion: { title: 'Identificación', width: 23 },
  estudiante: { title: 'Estudiante', width: 34 },
  titulo: { title: 'Título', width: 44 },
  registro: { title: 'Registro', width: 24 },
  acta: { title: 'Acta / Folio', width: 15 },
  libro: { title: 'Libro', width: 11 },
  fechaRegistro: { title: 'Fecha de registro', width: 21 },
  anioGrado: { title: 'Año de grado', width: 16 },
  correo: { title: 'Correo', width: 32 },
  telefono: { title: 'Teléfono', width: 16 },
  territorial: { title: 'Territorial', width: 28 },
  sede: { title: 'Sede', width: 28 },
};

const REPORT_COLUMNS = [
  { title: 'Fila de Excel', width: 15 },
  { title: 'Estado', width: 17 },
  ...GRADUATE_TEMPLATE_COLUMNS.map(([field]) => DATA_COLUMNS[field]),
  { title: 'Observaciones', width: 76 },
];
const LAST_COLUMN = REPORT_COLUMNS.length;
const EXCEL_MAX_ROWS = 1_048_576;
const PROGRESS_INTERVAL_MS = 250;
const reportNumberFormat = new Intl.NumberFormat('es-CO');

const colorStyle = (background: string, foreground: string, bold = false): Partial<Style> => ({
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: background } },
  font: { color: { argb: foreground }, bold },
  alignment: { vertical: 'middle', wrapText: true },
});

const validStyle = colorStyle('FFDCFCE7', 'FF166534', true);
const errorStatusStyle = colorStyle('FFFEE2E2', 'FF991B1B', true);
const errorCellStyle = colorStyle('FFFFF1F2', 'FF991B1B');
const headerStyle = colorStyle('FF003DA5', 'FFFFFFFF', true);
const wrappedAlignment = { wrapText: true };

export const exportValidationReport = async (
  records: GraduatePreviewRow[],
  validCount: number,
  onProgress: (progress: GraduateExportProgress) => void,
) => {
  const workbook = new ExcelJS.Workbook();
  const headerRowNumber = records.length + 3 <= EXCEL_MAX_ROWS ? 3 : 1;
  const sheet = workbook.addWorksheet('VALIDACION', {
    views: [{ state: 'frozen', ySplit: headerRowNumber }],
    properties: { defaultRowHeight: 20 },
  });
  sheet.columns = REPORT_COLUMNS.map(({ width }) => ({ width }));

  if (headerRowNumber === 3) {
    const title = sheet.getCell('A1');
    title.value = 'Reporte de validación de graduados';
    title.style = {
      ...headerStyle,
      font: { ...headerStyle.font, size: 16 },
    };
    sheet.mergeCells(1, 1, 1, LAST_COLUMN);
    sheet.getRow(1).height = 30;

    sheet.getCell('A2').value = `Registros: ${reportNumberFormat.format(records.length)}`;
    sheet.getCell('A2').style = colorStyle('FFEFF6FF', 'FF1E3A5F', true);
    sheet.getCell('C2').value = `Válidos: ${reportNumberFormat.format(validCount)}`;
    sheet.getCell('C2').style = validStyle;
    sheet.getCell('E2').value = `Con errores: ${reportNumberFormat.format(records.length - validCount)}`;
    sheet.getCell('E2').style = errorStatusStyle;
    sheet.mergeCells('A2:B2');
    sheet.mergeCells('C2:D2');
    sheet.mergeCells(2, 5, 2, LAST_COLUMN);
    sheet.getRow(2).height = 24;
  }

  const header = sheet.addRow(REPORT_COLUMNS.map(({ title }) => title));
  header.height = 24;
  header.eachCell((cell) => { cell.style = headerStyle; });
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber + records.length, column: LAST_COLUMN },
  };

  let nextProgressAt = 0;
  for (const [index, record] of records.entries()) {
    const hasErrors = Boolean(record.fieldErrors);
    const observations = hasErrors
      ? getGraduateFieldErrors(record.fieldErrors).map(({ label, message }) => `${label}: ${message}`)
      : [];
    const row = sheet.addRow([
      record.rowNumber,
      hasErrors ? 'Con errores' : 'Válido',
      ...GRADUATE_TEMPLATE_COLUMNS.map(([field]) => record[field] || undefined),
      observations.join('\n') || undefined,
    ]);
    row.getCell(2).style = hasErrors ? errorStatusStyle : validStyle;
    let maximumLines = 1;
    for (const [columnIndex, [field]] of GRADUATE_TEMPLATE_COLUMNS.entries()) {
      const hasFieldError = Boolean(record.fieldErrors?.[field]?.length);
      const lines = Math.ceil(record[field].length / (DATA_COLUMNS[field].width - 3));
      if (hasFieldError) row.getCell(columnIndex + 3).style = errorCellStyle;
      else if (lines > 1) row.getCell(columnIndex + 3).alignment = wrappedAlignment;
      maximumLines = Math.max(maximumLines, lines);
    }
    if (hasErrors) {
      row.getCell(LAST_COLUMN).style = errorCellStyle;
      maximumLines = Math.max(
        maximumLines,
        observations.reduce((lines, message) => lines + Math.max(1, Math.ceil(message.length / 68)), 0),
      );
    }
    if (maximumLines > 1) row.height = Math.min(390, maximumLines * 15 + 5);

    const preparedRows = index + 1;
    if (preparedRows === records.length || preparedRows % 512 === 0) {
      const now = performance.now();
      if (now >= nextProgressAt || preparedRows === records.length) {
        onProgress({ preparedRows, totalRows: records.length });
        nextProgressAt = now + PROGRESS_INTERVAL_MS;
      }
    }
  }

  const bytes = await workbook.xlsx.writeBuffer({
    useSharedStrings: true,
    useStyles: true,
    zip: { compressionOptions: { level: 3 } },
  });
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};
