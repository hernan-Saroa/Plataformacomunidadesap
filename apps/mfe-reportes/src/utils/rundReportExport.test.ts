// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sheets: Record<string, any> = {};
const xlsxMocks = {
  book_new: vi.fn(() => ({ SheetNames: [] as string[], Sheets: {} as Record<string, any> })),
  aoa_to_sheet: vi.fn((data: any[][]) => ({ __rows: data })),
  book_append_sheet: vi.fn((wb: any, ws: any, name: string) => {
    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
  }),
  encode_col: vi.fn((n: number) => String.fromCharCode(65 + n)),
};
const writeFileMock = vi.fn();

vi.mock('xlsx', () => ({
  utils: xlsxMocks,
  writeFile: (...args: any[]) => writeFileMock(...args),
}));

const pdfInstance = {
  internal: { pageSize: { width: 210, height: 297 } },
  setFillColor: vi.fn(),
  rect: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFont: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  line: vi.fn(),
  text: vi.fn(),
  splitTextToSize: vi.fn((value: string) => [value]),
  autoTable: vi.fn(),
  save: vi.fn(),
  getCurrentPageInfo: vi.fn(() => ({ pageNumber: 1 })),
};
const jsPDFConstructorMock = vi.fn(function jsPDF() {
  return pdfInstance;
});

vi.mock('jspdf', () => ({
  default: jsPDFConstructorMock,
}));
vi.mock('jspdf-autotable', () => ({}));

const { exportRundReportToExcel, exportRundReportToPDF } = await import('./rundReportExport');
const COLUMNAS = [
  { header: 'Nombre completo', key: 'nombre_completo' },
  { header: 'Territorial', key: 'territorial' },
];
const ROWS = [
  { nombre_completo: 'Ana Pérez', territorial: 'Bogotá' },
  { nombre_completo: 'Luis Gómez', territorial: 'Antioquia' },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('exportRundReportToExcel — REQ-RUND-F021', () => {
  it('arma una hoja de Metadatos (fecha + filtros + total) y una hoja de Datos, y descarga un .xlsx con fecha en el nombre', () => {
    exportRundReportToExcel(
      ROWS,
      COLUMNAS,
      { titulo: 'Reporte de planta docente', filtros: { Territorial: 'Bogotá', Categoría: undefined }, totalRegistros: 2 },
      'RUND_Planta_Docente_Detalle',
    );

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    const [workbook, filename] = writeFileMock.mock.calls[0];
    expect(filename).toMatch(/^rund_planta_docente_detalle_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
    expect(workbook.SheetNames).toEqual(['Metadatos', 'Datos']);

    const metaRows: any[][] = workbook.Sheets['Metadatos'].__rows;
    expect(metaRows).toContainEqual(['Total de registros:', 2]);
    expect(metaRows).toContainEqual(['Filtros aplicados:', 'Territorial: Bogotá']);

    const dataRows: any[][] = workbook.Sheets['Datos'].__rows;
    expect(dataRows[0]).toEqual(['Nombre completo', 'Territorial']);
    expect(dataRows[1]).toEqual(['Ana Pérez', 'Bogotá']);
    expect(dataRows[2]).toEqual(['Luis Gómez', 'Antioquia']);
  });

  it('reporta "Ninguno" cuando no hay filtros aplicados', () => {
    exportRundReportToExcel(ROWS, COLUMNAS, { titulo: 'Reporte', filtros: {}, totalRegistros: 2 }, 'reporte');

    const [workbook] = writeFileMock.mock.calls[0];
    const metaRows: any[][] = workbook.Sheets['Metadatos'].__rows;
    expect(metaRows).toContainEqual(['Filtros aplicados:', 'Ninguno']);
  });

  it('no revienta con 0 filas (sin resultados para el filtro aplicado) y no agrega autofiltro vacío', () => {
    exportRundReportToExcel([], COLUMNAS, { titulo: 'Reporte', filtros: {}, totalRegistros: 0 }, 'reporte-vacio');

    const [workbook] = writeFileMock.mock.calls[0];
    const wsDatos = workbook.Sheets['Datos'];
    expect(wsDatos.__rows).toEqual([['Nombre completo', 'Territorial']]);
    expect(wsDatos['!autofilter']).toBeUndefined();
  });

  it('deja celdas vacías cuando el valor del campo es null/undefined en vez de imprimir "null"', () => {
    exportRundReportToExcel(
      [{ nombre_completo: 'Ana Pérez', territorial: null }],
      COLUMNAS,
      { titulo: 'Reporte', filtros: {}, totalRegistros: 1 },
      'reporte',
    );

    const [workbook] = writeFileMock.mock.calls[0];
    const dataRows: any[][] = workbook.Sheets['Datos'].__rows;
    expect(dataRows[1]).toEqual(['Ana Pérez', '']);
  });
});

describe('exportRundReportToPDF — REQ-RUND-F021', () => {
  it('dibuja la tabla vía autoTable con las columnas dadas y guarda el PDF con fecha en el nombre', () => {
    exportRundReportToPDF(
      ROWS,
      COLUMNAS,
      { titulo: 'Reporte de planta docente', filtros: { Territorial: 'Bogotá' }, totalRegistros: 2 },
      'RUND_Planta_Docente_Detalle',
    );

    expect(pdfInstance.autoTable).toHaveBeenCalledTimes(1);
    const autoTableArgs = pdfInstance.autoTable.mock.calls[0][0];
    expect(autoTableArgs.head).toEqual([['Nombre completo', 'Territorial']]);
    expect(autoTableArgs.body).toEqual([['Ana Pérez', 'Bogotá'], ['Luis Gómez', 'Antioquia']]);

    expect(pdfInstance.save).toHaveBeenCalledTimes(1);
    expect(pdfInstance.save.mock.calls[0][0]).toMatch(/^rund_planta_docente_detalle_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);
  });

  it('usa orientación portrait con pocas columnas y landscape cuando hay más de 6 (tablas anchas, ej. Macro Docente)', () => {
    exportRundReportToPDF([], COLUMNAS, { titulo: 'Reporte', filtros: {}, totalRegistros: 0 }, 'reporte-portrait');
    expect(jsPDFConstructorMock).toHaveBeenLastCalledWith('portrait', 'mm', 'a4');

    const columnasAnchas = Array.from({ length: 9 }, (_, i) => ({ header: `Col ${i}`, key: `col${i}` }));
    exportRundReportToPDF([], columnasAnchas, { titulo: 'Reporte', filtros: {}, totalRegistros: 0 }, 'reporte-landscape');
    expect(jsPDFConstructorMock).toHaveBeenLastCalledWith('landscape', 'mm', 'a4');
  });

  it('no revienta con 0 filas y aun así arma la tabla solo con encabezados', () => {
    exportRundReportToPDF([], COLUMNAS, { titulo: 'Reporte', filtros: {}, totalRegistros: 0 }, 'reporte-vacio');

    const autoTableArgs = pdfInstance.autoTable.mock.calls[0][0];
    expect(autoTableArgs.head).toEqual([['Nombre completo', 'Territorial']]);
    expect(autoTableArgs.body).toEqual([]);
  });
});
