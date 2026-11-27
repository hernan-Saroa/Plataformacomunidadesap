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

const GRADUATE_PREVIEW_LIMIT = 100;
const WORKSHEET_CHUNK_SIZE = 512;

type GraduatePreviewRow = Omit<ParsedGraduateRow, 'payload'>;
type GraduateImportRow = {
  rowNumber: number;
  payload: NonNullable<ParsedGraduateRow['payload']>;
};

export type GraduateImportSummary = {
  totalRows: number;
  validCount: number;
  preview: GraduatePreviewRow[];
};

export type GraduateValidationProgress = {
  reviewedRows: number;
  scannedRows: number;
  totalSheetRows: number;
};

export type GraduateImportRequest =
  | { type: 'validate'; file: File; programOptions: string[] }
  | { type: 'batch'; start: number; size: number };

export type GraduateImportResponse =
  | { type: 'progress'; progress: GraduateValidationProgress }
  | { type: 'validated'; summary: GraduateImportSummary }
  | { type: 'batch'; rows: GraduateImportRow[] }
  | { type: 'error'; message: string };

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
  const preview: GraduatePreviewRow[] = [];
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
      const parsed = buildParsedRow(row, rowNumber, duplicateKeys, catalogs, columns, today);
      if (parsed.payload) validRows.push({ rowNumber, payload: parsed.payload });
      if (preview.length < GRADUATE_PREVIEW_LIMIT) {
        const { payload, ...displayRow } = parsed;
        preview.push(displayRow);
      }
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
  return { summary: { totalRows, validCount: validRows.length, preview }, validRows };
};

export const createGraduateImportHandler = (send: (response: GraduateImportResponse) => void) => {
  let validRows: GraduateImportRow[] = [];
  return async (request: GraduateImportRequest) => {
    if (request.type === 'batch') {
      send({ type: 'batch', rows: validRows.slice(request.start, request.start + request.size) });
      return;
    }

    try {
      const buffer = await request.file.arrayBuffer();
      const validated = validateWorkbook(buffer, request.programOptions, (progress) =>
        send({ type: 'progress', progress }),
      );
      validRows = validated.validRows;
      send({ type: 'validated', summary: validated.summary });
    } catch (error) {
      send({
        type: 'error',
        message: error instanceof Error ? error.message : 'Verifique que sea un archivo .xlsx válido.',
      });
    }
  };
};
