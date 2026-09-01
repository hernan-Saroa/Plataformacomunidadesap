/**
 * Exportación real (Excel/PDF) para los reportes RUND — REQ-RUND-F021.
 *
 * Reemplaza el export "Excel" que en realidad generaba CSV (ver reportExport.ts
 * del shell) por libros XLSX reales, y agrega PDF con formato institucional
 * ESAP (mismo patrón que apps/mfe-control-interno/.../utils/exportadores.ts).
 *
 * Ambos formatos incluyen metadata de fecha de generación y filtros aplicados
 * (nombre de archivo + contenido), tal como pide la HU. El enmascarado de
 * datos sensibles (documento de identidad, puntaje salarial) ya lo resuelve
 * el backend antes de que estos datos lleguen aquí — este módulo solo exporta
 * lo que el backend entregó.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
// jspdf-autotable v5 ya no parchea jsPDF.prototype por efecto secundario (eso era v3/v4):
// hay que llamar a la función exportada, no a doc.autoTable(...).
import autoTable from 'jspdf-autotable';

export interface RundColumn {
  header: string;
  key: string;
}

export interface RundExportMeta {
  titulo: string;
  subtitulo?: string;
  filtros: Record<string, string | undefined | null>;
  totalRegistros: number;
}

const AZUL_ESAP: [number, number, number] = [0, 61, 165];
const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

function sanitizeFilename(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 60);
}

function timestampFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function fechaGeneracionLegible(): string {
  return new Date().toLocaleString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function filtrosAplicados(filtros: Record<string, string | undefined | null>): string[] {
  return Object.entries(filtros)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${v}`);
}

/** Exporta a un libro XLSX real: hoja de metadatos (fecha + filtros) + hoja de datos con autofiltro. */
export function exportRundReportToExcel(
  rows: Record<string, any>[],
  columnas: RundColumn[],
  meta: RundExportMeta,
  filenamePrefix: string,
): void {
  const wb = XLSX.utils.book_new();
  const filtrosTexto = filtrosAplicados(meta.filtros);

  const metaData: (string | number)[][] = [
    ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
    [meta.titulo],
    ...(meta.subtitulo ? [[meta.subtitulo]] : []),
    [''],
    ['Fecha de generación:', fechaGeneracionLegible()],
    ['Total de registros:', meta.totalRegistros],
    ['Filtros aplicados:', filtrosTexto.length ? filtrosTexto.join(' | ') : 'Ninguno'],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
  wsMeta['!cols'] = [{ wch: 22 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadatos');

  const headers = columnas.map((c) => c.header);
  const dataRows = rows.map((row) => columnas.map((c) => row[c.key] ?? ''));
  const wsData = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  wsData['!cols'] = columnas.map((c) => ({ wch: Math.min(Math.max(c.header.length + 2, 12), 40) }));
  if (dataRows.length > 0) {
    wsData['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(columnas.length - 1)}${dataRows.length + 1}` };
  }
  XLSX.utils.book_append_sheet(wb, wsData, 'Datos');

  XLSX.writeFile(wb, `${sanitizeFilename(filenamePrefix)}_${timestampFilename()}.xlsx`);
}

/** Exporta a PDF con encabezado y pie institucional ESAP, tabla vía jspdf-autotable. */
export function exportRundReportToPDF(
  rows: Record<string, any>[],
  columnas: RundColumn[],
  meta: RundExportMeta,
  filenamePrefix: string,
): void {
  const orientation = columnas.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF(orientation, 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  let y = agregarEncabezadoInstitucional(doc, meta, pageWidth);

  const filtrosTexto = filtrosAplicados(meta.filtros);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Fecha de generación: ${fechaGeneracionLegible()}`, 14, y);
  y += 5;
  doc.text(`Total de registros: ${meta.totalRegistros}`, 14, y);
  y += 5;
  const filtrosLinea = `Filtros aplicados: ${filtrosTexto.length ? filtrosTexto.join(' | ') : 'Ninguno'}`;
  const filtrosWrapped = doc.splitTextToSize(filtrosLinea, pageWidth - 28);
  doc.text(filtrosWrapped, 14, y);
  y += filtrosWrapped.length * 4 + 4;

  autoTable(doc, {
    startY: y,
    head: [columnas.map((c) => c.header)],
    body: rows.map((row) => columnas.map((c) => String(row[c.key] ?? ''))),
    styles: { fontSize: 7.5, cellPadding: 1.5 },
    headStyles: { fillColor: AZUL_ESAP, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    // Evita que una fila con celdas de varias líneas (nombres largos, núcleos temáticos largos)
    // quede cortada entre dos páginas dejando texto huérfano al inicio de la siguiente.
    rowPageBreak: 'avoid',
    didDrawPage: () => agregarPiePaginaInstitucional(doc, pageWidth),
  });

  doc.save(`${sanitizeFilename(filenamePrefix)}_${timestampFilename()}.pdf`);
}

/** Dibuja el encabezado institucional y devuelve el Y a partir del cual es seguro seguir escribiendo (deja espacio para el subtítulo si lo hay). */
function agregarEncabezadoInstitucional(doc: jsPDF, meta: RundExportMeta, pageWidth: number): number {
  doc.setFillColor(...AZUL_ESAP);
  doc.rect(14, 10, 22, 12, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ESAP', 25, 17, { align: 'center' });

  doc.setFontSize(11);
  doc.setTextColor(...AZUL_ESAP);
  doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 40, 15);
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Registro Único de Docentes (RUND) — Reportes y Estadísticas', 40, 20);

  doc.setDrawColor(...AZUL_ESAP);
  doc.setLineWidth(0.5);
  doc.line(14, 24, pageWidth - 14, 24);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...AZUL_ESAP);
  doc.text(meta.titulo, 14, 31);
  if (!meta.subtitulo) {
    return 38;
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(meta.subtitulo, 14, 36);
  return 43;
}

function agregarPiePaginaInstitucional(doc: jsPDF, pageWidth: number): void {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
  doc.text('ESAP - Sistema de Gestión RUND', 14, pageHeight - 9);
  doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 9, { align: 'right' });
}
