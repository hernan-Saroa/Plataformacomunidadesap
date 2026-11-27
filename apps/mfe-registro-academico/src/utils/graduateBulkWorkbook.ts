import { read, utils } from 'xlsx';
import type { ParsingOptions } from 'xlsx';
import {
  buildCatalogs,
  buildParsedRow,
  getGraduateColumns,
  getTodayIso,
  normalizeKey,
} from './graduateBulkValidation';
import type { ParsedGraduateRow } from './graduateBulkValidation';

const GRADUATE_PREVIEW_PAGE_SIZE = 100;
const WORKSHEET_CHUNK_SIZE = 512;

export type GraduatePreviewRow = Omit<
  ParsedGraduateRow,
  'payload' | 'errors' | 'telefonoNormalizado' | 'fieldErrors'
> & {
  fieldErrors?: ParsedGraduateRow['fieldErrors'];
};
type GraduateImportRow = {
  rowNumber: number;
  payload: NonNullable<ParsedGraduateRow['payload']>;
};

export type GraduatePreviewPage = {
  number: number;
  startIndex: number;
  totalPages: number;
  rows: GraduatePreviewRow[];
};

export type GraduateImportSummary = {
  totalRows: number;
  validCount: number;
  page: GraduatePreviewPage;
};

export type GraduateValidationProgress = {
  reviewedRows: number;
  scannedRows: number;
  totalSheetRows: number;
};

export type GraduateExportProgress = {
  preparedRows: number;
  totalRows: number;
};

export type GraduateImportRequest =
  | { type: 'validate'; file: File; programOptions: string[] }
  | { type: 'preview'; pageNumber: number }
  | { type: 'export' }
  | { type: 'batch'; start: number; size: number };

export type GraduateImportResponse =
  | { type: 'progress'; progress: GraduateValidationProgress }
  | { type: 'exportProgress'; progress: GraduateExportProgress }
  | { type: 'validated'; summary: GraduateImportSummary }
  | { type: 'preview'; page: GraduatePreviewPage }
  | { type: 'export'; file: Blob }
  | { type: 'batch'; rows: GraduateImportRow[] }
  | { type: 'error'; message: string };

const getPreviewPage = (rows: GraduatePreviewRow[], number: number): GraduatePreviewPage => {
  const totalPages = Math.ceil(rows.length / GRADUATE_PREVIEW_PAGE_SIZE);
  if (!Number.isInteger(number) || number < 1 || number > totalPages) {
    throw new Error('La página solicitada está fuera del rango de la vista previa.');
  }
  const startIndex = (number - 1) * GRADUATE_PREVIEW_PAGE_SIZE;
  return {
    number,
    startIndex,
    totalPages,
    rows: rows.slice(startIndex, startIndex + GRADUATE_PREVIEW_PAGE_SIZE),
  };
};

const validateWorkbook = (
  buffer: ArrayBuffer,
  programOptions: string[],
  onProgress: (progress: GraduateValidationProgress) => void,
) => {
  const options: ParsingOptions = {
    type: 'array',
    dense: true,
    cellDates: false,
    cellHTML: false,
    raw: false,
  };
  const workbook = read(buffer, { ...options, sheets: 'GRADUADOS' });
  const sheetName = workbook.SheetNames.find((name) => normalizeKey(name) === 'graduados');
  if (!sheetName) {
    throw new Error('El archivo XLSX debe tener una hoja llamada GRADUADOS.');
  }

  // Conserva los nombres de hoja con variantes que también aceptaba el importador.
  const worksheet =
    workbook.Sheets[sheetName] ?? read(buffer, { ...options, sheets: sheetName }).Sheets[sheetName];
  const sheetRange = worksheet?.['!ref'];
  if (!sheetRange) {
    throw new Error('La hoja GRADUADOS no tiene filas de datos.');
  }

  const { s, e } = utils.decode_range(sheetRange);
  const headers = utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    header: 'A',
    range: { s, e: { r: s.r, c: e.c } },
    raw: false,
  })[0] ?? {};
  const columns = getGraduateColumns(headers);
  const duplicateKeys = new Set<string>();
  const catalogs = buildCatalogs(programOptions);
  const today = getTodayIso();
  const previewRows: GraduatePreviewRow[] = [];
  const validRows: GraduateImportRow[] = [];
  const totalSheetRows = e.r - s.r;
  let totalRows = 0;
  if (totalSheetRows > 0) {
    onProgress({ reviewedRows: 0, scannedRows: 0, totalSheetRows });
  }
  let nextProgressAt = performance.now() + 250;

  for (let start = s.r + 1; start <= e.r; start += WORKSHEET_CHUNK_SIZE) {
    const end = Math.min(start + WORKSHEET_CHUNK_SIZE - 1, e.r);
    const rows = utils.sheet_to_json<Record<string, unknown> & { __rowNum__: number }>(
      worksheet,
      {
        header: 'A',
        range: { s: { r: start, c: s.c }, e: { r: end, c: e.c } },
        raw: false,
      },
    );
    // Libera las celdas ya convertidas antes de acumular los registros válidos.
    if (Array.isArray(worksheet)) worksheet.fill(undefined, start, end + 1);

    for (const row of rows) {
      const rowNumber = row.__rowNum__ + 1;
      const {
        payload, errors, telefonoNormalizado: _telefonoNormalizado, fieldErrors, ...displayRow
      } = buildParsedRow(row, rowNumber, duplicateKeys, catalogs, columns, today);
      if (payload) validRows.push({ rowNumber, payload });
      const previewRow: GraduatePreviewRow = displayRow;
      if (errors.length) previewRow.fieldErrors = fieldErrors;
      previewRows.push(previewRow);
    }
    totalRows += rows.length;
    const now = performance.now();
    if (end === e.r || now >= nextProgressAt) {
      onProgress({ reviewedRows: totalRows, scannedRows: end - s.r, totalSheetRows });
      nextProgressAt = now + 250;
    }
  }

  if (!totalRows) {
    throw new Error('La hoja GRADUADOS no tiene filas de datos.');
  }
  return { previewRows, validRows };
};

export const createGraduateImportHandler = (send: (response: GraduateImportResponse) => void) => {
  let validRows: GraduateImportRow[] = [];
  let previewRows: GraduatePreviewRow[] = [];
  return async (request: GraduateImportRequest) => {
    if (request.type === 'batch') {
      send({ type: 'batch', rows: validRows.slice(request.start, request.start + request.size) });
      return;
    }

    try {
      if (request.type === 'preview') {
        send({ type: 'preview', page: getPreviewPage(previewRows, request.pageNumber) });
        return;
      }
      if (request.type === 'export') {
        if (!previewRows.length) throw new Error('Valide un archivo antes de exportar sus resultados.');
        const { exportValidationReport } = await import('./graduateBulkReport');
        const file = await exportValidationReport(previewRows, validRows.length, (progress) =>
          send({ type: 'exportProgress', progress }),
        );
        send({ type: 'export', file });
        return;
      }
      const buffer = await request.file.arrayBuffer();
      const validated = validateWorkbook(buffer, request.programOptions, (progress) =>
        send({ type: 'progress', progress }),
      );
      validRows = validated.validRows;
      previewRows = validated.previewRows;
      send({
        type: 'validated',
        summary: { totalRows: previewRows.length, validCount: validRows.length, page: getPreviewPage(previewRows, 1) },
      });
    } catch (error) {
      send({
        type: 'error',
        message: error instanceof Error ? error.message : 'Verifique que sea un archivo .xlsx válido.',
      });
    }
  };
};
