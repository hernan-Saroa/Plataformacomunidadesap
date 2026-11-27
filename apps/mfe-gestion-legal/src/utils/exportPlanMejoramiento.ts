import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  AccionPlanMejoramiento,
  FASES_PHVA,
  PHVA_CONFIG,
  calcularAvancePorFasePhvaUI,
  construirNombreArchivoPlan,
  formatearPorcentaje,
} from './planesMejoramientoPhva';

export interface DatosExportacionPlan {
  codigo: string;
  titulo: string;
  enteControlNombre: string;
  hallazgo?: string | null;
  documentoOrigen?: string | null;
  severidad: string;
  responsable: string;
  areaResponsable?: string | null;
  estadoNombre: string;
  avancePorcentaje: number;
  fechaRecepcion?: string | Date | null;
  fechaRespuesta?: string | Date | null;
  fechaInicio?: string | Date | null;
  fechaFinEstimada?: string | Date | null;
  fechaCierreReal?: string | Date | null;
  acciones: AccionPlanMejoramiento[];
}

export interface FilaExportacionAccion {
  indice: number;
  descripcion: string;
  fasePhva: string;
  peso: string;
  responsable: string;
  fechaLimite: string;
  estado: string;
  fechaEjecucion: string;
}

function formatearFechaCorta(valor?: string | Date | null): string {
  if (!valor) return 'N/A';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'N/A';
  return fecha.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function etiquetaSeveridad(sev?: string | null): string {
  const limpio = (sev || '').trim().toUpperCase();
  if (limpio === 'CRITICO' || limpio === 'CRITICA') return 'Crítica';
  if (limpio === 'ALTO' || limpio === 'ALTA') return 'Alta';
  if (limpio === 'BAJO' || limpio === 'BAJA') return 'Baja';
  return 'Media';
}

export function construirFilasExportacionAcciones(
  acciones: AccionPlanMejoramiento[],
): FilaExportacionAccion[] {
  return acciones.map((accion, idx) => {
    const descCompleta = accion.descripcion
      ? `${accion.nombre} — ${accion.descripcion}`
      : accion.nombre;
    return {
      indice: idx + 1,
      descripcion: descCompleta,
      fasePhva: PHVA_CONFIG[accion.fasePhva]?.etiqueta ?? 'Planear',
      peso: formatearPorcentaje(accion.pesoPorcentual),
      responsable: accion.responsable?.trim() || 'Sin asignar',
      fechaLimite: formatearFechaCorta(accion.fechaLimite),
      estado: accion.estado === 'EJECUTADA' ? 'Ejecutada' : 'Pendiente',
      fechaEjecucion: accion.estado === 'EJECUTADA' ? formatearFechaCorta(accion.fechaEjecucion) : '—',
    };
  });
}

export function generarDocumentoPdfPlan(
  datos: DatosExportacionPlan,
  fechaGeneracion: Date = new Date(),
): { doc: jsPDF; filename: string } {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const filename = construirNombreArchivoPlan(datos.codigo, 'pdf', fechaGeneracion);
  const filas = construirFilasExportacionAcciones(datos.acciones);
  const resumenPhva = calcularAvancePorFasePhvaUI(datos.acciones);

  // Encabezado institucional ESAP
  doc.setFillColor(0, 61, 165);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PLAN DE MEJORAMIENTO INDIVIDUAL', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('ESAP — Sistema Integrado de Gestión Legal (SIGL)', 14, 20);
  doc.text(`Generado: ${formatearFechaCorta(fechaGeneracion)}`, 196, 20, { align: 'right' });

  // Información general del plan
  const hallazgoTexto = [datos.titulo, datos.hallazgo, datos.documentoOrigen]
    .filter((v) => v && String(v).trim() && String(v).trim() !== 'N/A')
    .join(' · ') || 'N/A';

  autoTable(doc, {
    startY: 34,
    theme: 'grid',
    head: [['Campo', 'Información del Plan', 'Campo', 'Información del Plan']],
    body: [
      ['Código del Plan', datos.codigo || 'N/A', 'Ente de Control', datos.enteControlNombre || 'N/A'],
      ['Severidad', etiquetaSeveridad(datos.severidad), 'Estado', datos.estadoNombre || 'N/A'],
      ['Responsable', datos.responsable || 'Sin asignar', 'Área Responsable', datos.areaResponsable || 'N/A'],
      ['Fecha Recepción', formatearFechaCorta(datos.fechaRecepcion), 'Fecha Respuesta', formatearFechaCorta(datos.fechaRespuesta)],
      ['Fecha Inicio', formatearFechaCorta(datos.fechaInicio), 'Fecha Fin Estimada', formatearFechaCorta(datos.fechaFinEstimada)],
      [
        'Cumplimiento Total',
        formatearPorcentaje(datos.avancePorcentaje),
        'Fecha Cierre Real',
        formatearFechaCorta(datos.fechaCierreReal),
      ],
    ],
    headStyles: { fillColor: [0, 61, 165], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34, fillColor: [243, 246, 252] },
      1: { cellWidth: 57 },
      2: { fontStyle: 'bold', cellWidth: 34, fillColor: [243, 246, 252] },
      3: { cellWidth: 57 },
    },
  });

  const yDespuesInfo = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 95;

  // Hallazgo / Descripción
  autoTable(doc, {
    startY: yDespuesInfo + 4,
    theme: 'grid',
    head: [['Hallazgo / Descripción del Plan']],
    body: [[hallazgoTexto]],
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const yDespuesHallazgo = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 115;

  // Resumen por fase PHVA
  autoTable(doc, {
    startY: yDespuesHallazgo + 4,
    theme: 'grid',
    head: [['Fase PHVA', 'Acciones', 'Ejecutadas', 'Peso Total', 'Avance de Fase']],
    body: FASES_PHVA.map((fase) => {
      const r = resumenPhva[fase];
      return [
        r.etiqueta,
        String(r.total),
        String(r.ejecutadas),
        formatearPorcentaje(r.pesoTotal),
        formatearPorcentaje(r.porcentajeAvance),
      ];
    }),
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5 },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  const yDespuesPhva = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 150;

  // Tabla de acciones
  autoTable(doc, {
    startY: yDespuesPhva + 5,
    theme: 'striped',
    head: [['#', 'Descripción de la Acción', 'Fase PHVA', 'Peso', 'Responsable', 'Fecha Límite', 'Estado', 'Fecha Ejecución']],
    body:
      filas.length > 0
        ? filas.map((f) => [
            String(f.indice),
            f.descripcion,
            f.fasePhva,
            f.peso,
            f.responsable,
            f.fechaLimite,
            f.estado,
            f.fechaEjecucion,
          ])
        : [['—', 'No hay acciones registradas en este plan', '—', '0%', '—', '—', '—', '—']],
    headStyles: { fillColor: [0, 61, 165], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 54 },
      2: { cellWidth: 20 },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 27 },
      5: { cellWidth: 20 },
      6: { cellWidth: 18 },
      7: { cellWidth: 20 },
    },
    foot: [[
      '',
      'CUMPLIMIENTO TOTAL DEL PLAN',
      '',
      '100%',
      '',
      '',
      datos.estadoNombre,
      formatearPorcentaje(datos.avancePorcentaje),
    ]],
    footStyles: { fillColor: [239, 246, 255], textColor: [0, 61, 165], fontStyle: 'bold', fontSize: 8 },
  });

  return { doc, filename };
}

export async function generarWorkbookExcelPlan(
  datos: DatosExportacionPlan,
  fechaGeneracion: Date = new Date(),
): Promise<{ workbook: ExcelJS.Workbook; filename: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ESAP - SIGL';
  workbook.created = fechaGeneracion;

  const filename = construirNombreArchivoPlan(datos.codigo, 'xlsx', fechaGeneracion);
  const sheet = workbook.addWorksheet('Plan de Mejoramiento');
  const filas = construirFilasExportacionAcciones(datos.acciones);
  const resumenPhva = calcularAvancePorFasePhvaUI(datos.acciones);

  sheet.columns = [
    { width: 8 },
    { width: 42 },
    { width: 16 },
    { width: 14 },
    { width: 24 },
    { width: 16 },
    { width: 15 },
    { width: 18 },
  ];

  // Título
  sheet.mergeCells('A1:H1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `PLAN DE MEJORAMIENTO — ${datos.codigo}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  const hallazgoTexto = [datos.titulo, datos.hallazgo, datos.documentoOrigen]
    .filter((v) => v && String(v).trim() && String(v).trim() !== 'N/A')
    .join(' · ') || 'N/A';

  const infoRows: Array<[string, string, string, string]> = [
    ['Código del Plan', datos.codigo || 'N/A', 'Ente de Control', datos.enteControlNombre || 'N/A'],
    ['Hallazgo / Plan', hallazgoTexto, 'Severidad', etiquetaSeveridad(datos.severidad)],
    ['Responsable', datos.responsable || 'Sin asignar', 'Área Responsable', datos.areaResponsable || 'N/A'],
    ['Fecha Recepción', formatearFechaCorta(datos.fechaRecepcion), 'Fecha Respuesta', formatearFechaCorta(datos.fechaRespuesta)],
    ['Fecha Inicio', formatearFechaCorta(datos.fechaInicio), 'Fecha Fin Estimada', formatearFechaCorta(datos.fechaFinEstimada)],
    ['Estado', datos.estadoNombre || 'N/A', 'Cumplimiento Total', formatearPorcentaje(datos.avancePorcentaje)],
  ];

  let rowIdx = 3;
  for (const [k1, v1, k2, v2] of infoRows) {
    sheet.getCell(`A${rowIdx}`).value = k1;
    sheet.getCell(`A${rowIdx}`).font = { bold: true };
    sheet.mergeCells(`B${rowIdx}:D${rowIdx}`);
    sheet.getCell(`B${rowIdx}`).value = v1;

    sheet.getCell(`E${rowIdx}`).value = k2;
    sheet.getCell(`E${rowIdx}`).font = { bold: true };
    sheet.mergeCells(`F${rowIdx}:H${rowIdx}`);
    sheet.getCell(`F${rowIdx}`).value = v2;
    rowIdx++;
  }

  // Resumen PHVA
  rowIdx += 1;
  sheet.mergeCells(`A${rowIdx}:E${rowIdx}`);
  sheet.getCell(`A${rowIdx}`).value = 'RESUMEN POR FASE PHVA';
  sheet.getCell(`A${rowIdx}`).font = { bold: true, color: { argb: 'FF003DA5' } };
  rowIdx++;

  const phvaHeader = sheet.getRow(rowIdx);
  phvaHeader.values = ['Fase PHVA', 'Total Acciones', 'Ejecutadas', 'Peso Total', 'Avance Fase'];
  phvaHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 5; c++) {
    phvaHeader.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  }
  rowIdx++;

  for (const fase of FASES_PHVA) {
    const r = resumenPhva[fase];
    sheet.getRow(rowIdx).values = [
      r.etiqueta,
      r.total,
      r.ejecutadas,
      formatearPorcentaje(r.pesoTotal),
      formatearPorcentaje(r.porcentajeAvance),
    ];
    rowIdx++;
  }

  // Tabla de acciones
  rowIdx += 1;
  sheet.mergeCells(`A${rowIdx}:H${rowIdx}`);
  sheet.getCell(`A${rowIdx}`).value = 'DETALLE DE ACCIONES DEL PLAN';
  sheet.getCell(`A${rowIdx}`).font = { bold: true, color: { argb: 'FF003DA5' } };
  rowIdx++;

  const accionesHeader = sheet.getRow(rowIdx);
  accionesHeader.values = [
    '#',
    'Descripción',
    'Fase PHVA',
    'Peso (%)',
    'Responsable',
    'Fecha Límite',
    'Estado',
    'Fecha Ejecución',
  ];
  accionesHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  for (let c = 1; c <= 8; c++) {
    accionesHeader.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003DA5' } };
  }
  rowIdx++;

  for (const f of filas) {
    sheet.getRow(rowIdx).values = [
      f.indice,
      f.descripcion,
      f.fasePhva,
      f.peso,
      f.responsable,
      f.fechaLimite,
      f.estado,
      f.fechaEjecucion,
    ];
    rowIdx++;
  }

  // Fila total
  const totalRow = sheet.getRow(rowIdx);
  totalRow.values = [
    '',
    'CUMPLIMIENTO TOTAL DEL PLAN',
    '',
    datos.acciones.length > 0 ? '100%' : '0%',
    '',
    '',
    datos.estadoNombre,
    formatearPorcentaje(datos.avancePorcentaje),
  ];
  totalRow.font = { bold: true };

  return { workbook, filename };
}

export function exportarPlanIndividualPDF(datos: DatosExportacionPlan): string {
  const { doc, filename } = generarDocumentoPdfPlan(datos);
  doc.save(filename);
  return filename;
}

export async function exportarPlanIndividualExcel(datos: DatosExportacionPlan): Promise<string> {
  const { workbook, filename } = await generarWorkbookExcelPlan(datos);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return filename;
}
