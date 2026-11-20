import * as XLSX from 'xlsx';

/** Fila del reporte de errores de la carga masiva RUND (HU 1355). */
export interface RundBulkErrorReportRow {
  Fila: number | string;
  'Documento de identidad': string;
  Nombre: string;
  Columna: string;
  'Dato errado': string;
  'Valor esperado': string;
  Motivo: string;
}

const text = (value: unknown) => (value == null ? '' : String(value).trim());

/**
 * Normaliza los errores que devuelve la validación (pantalla) o el historial (log guardado)
 * a las columnas del reporte. Acepta también errores en texto plano.
 */
export function buildRundBulkErrorReportRows(errors: unknown[]): RundBulkErrorReportRow[] {
  return (Array.isArray(errors) ? errors : []).map((raw: any) => {
    if (typeof raw === 'string') {
      return { Fila: '', 'Documento de identidad': '', Nombre: '', Columna: '', 'Dato errado': '', 'Valor esperado': '', Motivo: raw };
    }
    const data = raw?.data || {};
    return {
      Fila: raw?.fila ?? raw?.row ?? '',
      'Documento de identidad': text(raw?.documentoIdentidad ?? data.DOCUMENTO_IDENTIDAD ?? data.documentNumber),
      Nombre: text(raw?.nombre ?? data.NOMBRE_COMPLETO ?? data.fullName),
      Columna: text(raw?.columna ?? raw?.field),
      'Dato errado': text(raw?.datoErrado),
      'Valor esperado': text(raw?.valorEsperado),
      Motivo: text(raw?.mensaje ?? raw?.message) || 'El registro no superó la validación de la carga.',
    };
  }).sort((a, b) => (Number(a.Fila) || Infinity) - (Number(b.Fila) || Infinity));
}

/** Nombre del archivo: reporte-errores-<archivo sin extensión>.xlsx, sin caracteres problemáticos. */
export function rundBulkErrorReportFileName(sourceName?: string | null): string {
  const base = text(sourceName).replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 80);
  return `reporte-errores-${base || 'carga-rund'}.xlsx`;
}

/** Genera el xlsx del reporte. Devuelve false si no hay errores que reportar. */
export function downloadRundBulkErrorReport(errors: unknown[], sourceName?: string | null): boolean {
  const rows = buildRundBulkErrorReportRows(errors);
  if (!rows.length) return false;
  const sheet = XLSX.utils.json_to_sheet(rows);
  sheet['!cols'] = [{ wch: 7 }, { wch: 22 }, { wch: 34 }, { wch: 24 }, { wch: 22 }, { wch: 34 }, { wch: 70 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'ERRORES');
  const bytes = XLSX.write(book, { type: 'array', bookType: 'xlsx' });
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = rundBulkErrorReportFileName(sourceName);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
