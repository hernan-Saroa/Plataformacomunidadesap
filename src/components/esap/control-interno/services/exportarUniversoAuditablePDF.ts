/**
 * ============================================
 * EXPORTAR UNIVERSO AUDITABLE PDF CORPORATIVO
 * ============================================
 * 
 * Genera PDF del Universo Auditable con diseño profesional:
 * - Encabezado institucional
 * - Colores corporativos (#003DA5)
 * - Marca de agua
 * - Headers y footers
 * - Tabla de procesos con nivel de riesgo
 * - Estadísticas y resumen ejecutivo
 * 
 * Usa jsPDF + jspdf-autotable
 * 
 * ÚLTIMA ACTUALIZACIÓN: 17 Febrero 2026
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface ProcesoAuditableExport {
  id: string;
  codigo?: string;
  nombre: string;
  tipo?: string;
  tipoProceso?: string;
  macroproceso?: string;
  dependencia?: string;
  dependenciaResponsable?: string;
  nivelRiesgo: string;
  scoreRiesgo?: number;
  puntajeRiesgo?: number;
  frecuenciaAuditoria?: string;
  frecuenciaSugerida?: string;
  ultimaAuditoria?: string;
  auditable?: boolean;
}

export interface EstadisticasExport {
  totalProcesos: number;
  procesosAuditables?: number;
  procesosCriticos?: number;
  procesosAltos?: number;
  procesosMedios?: number;
  procesosBajos?: number;
}

export interface OpcionesExportacion {
  nombreArchivo?: string;
  incluirPortada?: boolean;
  incluirEstadisticas?: boolean;
  incluirMarcaDeAgua?: boolean;
  vigencia?: number;
}

export interface ResultadoExportacion {
  exito: boolean;
  formato: string;
  nombreArchivo: string;
  mensaje?: string;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COLORES CORPORATIVOS ESAP
// ════════════════════════════════════════════════════════════════════════════

const COLORES_ESAP = {
  azulPrincipal: [0, 61, 165] as [number, number, number],      // #003DA5
  azulSecundario: [41, 98, 255] as [number, number, number],    // #2962FF
  naranja: [245, 124, 0] as [number, number, number],           // #F57C00
  gris: [128, 128, 128] as [number, number, number],
  grisClaro: [224, 237, 255] as [number, number, number],       // #E0EDFF
  blanco: [255, 255, 255] as [number, number, number],
  negro: [0, 0, 0] as [number, number, number],
  rojo: [220, 38, 38] as [number, number, number],              // Crítico
  naranjaRiesgo: [234, 88, 12] as [number, number, number],     // Alto
  amarillo: [202, 138, 4] as [number, number, number],          // Medio
  verde: [22, 163, 74] as [number, number, number],             // Bajo
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN
// ════════════════════════════════════════════════════════════════════════════

export async function exportarUniversoAuditablePDF(
  procesos: ProcesoAuditableExport[],
  estadisticas: EstadisticasExport,
  opciones: OpcionesExportacion = {}
): Promise<ResultadoExportacion> {
  
  const {
    nombreArchivo = `Universo_Auditable_${opciones.vigencia || new Date().getFullYear()}_ESAP.pdf`,
    incluirPortada = true,
    incluirEstadisticas = true,
    incluirMarcaDeAgua = true,
    vigencia = new Date().getFullYear()
  } = opciones;
  
  try {
    console.log('📄 Generando PDF del Universo Auditable...');
    
    // Crear documento PDF (A4 horizontal para tablas)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Portada
    if (incluirPortada) {
      crearPortada(doc, vigencia, estadisticas);
      doc.addPage();
    }
    
    // Estadísticas
    if (incluirEstadisticas) {
      crearSeccionEstadisticas(doc, estadisticas, vigencia);
      doc.addPage();
    }
    
    // Tabla de Procesos
    crearTablaProcesos(doc, procesos, vigencia);
    
    // Marca de agua en todas las páginas
    if (incluirMarcaDeAgua) {
      agregarMarcaDeAgua(doc);
    }
    
    // Agregar encabezado y pie a todas las páginas (excepto portada)
    agregarHeaderFooterTodasPaginas(doc, vigencia, incluirPortada ? 2 : 1);
    
    // Generar y descargar
    const pdfBlob = doc.output('blob');
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ PDF generado exitosamente');
    
    return {
      exito: true,
      formato: 'PDF',
      nombreArchivo,
      mensaje: 'Universo Auditable exportado correctamente'
    };
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    return {
      exito: false,
      formato: 'PDF',
      nombreArchivo,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}



// ════════════════════════════════════════════════════════════════════════════
// ENCABEZADO CORPORATIVO TIPO FORMULARIO (Profesional)
// ════════════════════════════════════════════════════════════════════════════

function crearEncabezadoFormulario(doc: jsPDF, vigencia: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margen = 10;
  const headerHeight = 28;
  const footerBarHeight = 8;
  const totalHeight = headerHeight + footerBarHeight;
  
  // ═══ CUADRO PRINCIPAL DEL ENCABEZADO ═══
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margen, margen, pageWidth - (margen * 2), totalHeight);
  
  // ═══ SECCIÓN IZQUIERDA: ESAP ═══
  const logoWidth = 50;
  doc.line(margen + logoWidth, margen, margen + logoWidth, margen + headerHeight);
  
  // Texto institucional ESAP
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 61, 165);
  doc.text('ESAP', margen + logoWidth / 2, margen + 12, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Escuela Superior de', margen + logoWidth / 2, margen + 18, { align: 'center' });
  doc.text('Administración Pública', margen + logoWidth / 2, margen + 22, { align: 'center' });
  
  // ═══ SECCIÓN CENTRAL: TÍTULO ═══
  const infoBoxWidth = 50;
  const tituloStartX = margen + logoWidth;
  const tituloEndX = pageWidth - margen - infoBoxWidth;
  const tituloWidth = tituloEndX - tituloStartX;
  const tituloCentro = tituloStartX + (tituloWidth / 2);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSO AUDITABLE', tituloCentro, margen + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Oficina de Control Interno de Gestión - OCIG', tituloCentro, margen + 19, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(0, 61, 165);
  doc.setFont('helvetica', 'bold');
  doc.text(`Vigencia ${vigencia}`, tituloCentro, margen + 26, { align: 'center' });
  
  // ═══ SECCIÓN DERECHA: CÓDIGO, VERSIÓN, FECHA ═══
  const infoBoxX = pageWidth - margen - infoBoxWidth;
  doc.setLineWidth(0.3);
  doc.line(infoBoxX, margen, infoBoxX, margen + headerHeight);
  
  const rowHeight = headerHeight / 3;
  
  // Líneas horizontales dentro del cuadro de info
  doc.line(infoBoxX, margen + rowHeight, pageWidth - margen, margen + rowHeight);
  doc.line(infoBoxX, margen + (rowHeight * 2), pageWidth - margen, margen + (rowHeight * 2));
  
  // Línea vertical para separar label de valor
  const labelWidth = 20;
  doc.line(infoBoxX + labelWidth, margen, infoBoxX + labelWidth, margen + headerHeight);
  
  // Textos de labels
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CÓDIGO:', infoBoxX + 2, margen + 6);
  doc.text('VERSIÓN:', infoBoxX + 2, margen + rowHeight + 6);
  doc.text('FECHA:', infoBoxX + 2, margen + (rowHeight * 2) + 6);
  
  // Textos de valores
  doc.setTextColor(0, 61, 165);
  doc.setFont('helvetica', 'normal');
  doc.text('EM-PT-005', infoBoxX + labelWidth + 2, margen + 6);
  doc.text('1', infoBoxX + labelWidth + 2, margen + rowHeight + 6);
  doc.setTextColor(0, 0, 0);
  const fechaActual = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(fechaActual, infoBoxX + labelWidth + 2, margen + (rowHeight * 2) + 6);
  
  // ═══ BARRA INFERIOR: PROCESO ═══
  doc.setFillColor(240, 244, 248);
  doc.rect(margen, margen + headerHeight, pageWidth - (margen * 2), footerBarHeight, 'F');
  doc.setLineWidth(0.3);
  doc.line(margen, margen + headerHeight, pageWidth - margen, margen + headerHeight);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('PROCESO:', margen + 5, margen + headerHeight + 5.5);
  doc.setTextColor(0, 61, 165);
  doc.setFont('helvetica', 'normal');
  doc.text('Evaluación, Control y Mejora', margen + 28, margen + headerHeight + 5.5);
  
  // Retornar posición Y después del encabezado
  return margen + totalHeight + 8;
}

// ════════════════════════════════════════════════════════════════════════════
// PORTADA
// ════════════════════════════════════════════════════════════════════════════

function crearPortada(doc: jsPDF, vigencia: number, estadisticas: EstadisticasExport): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Encabezado tipo formulario
  let yPos = crearEncabezadoFormulario(doc, vigencia);
  
  yPos += 20;
  
  // Título principal
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSO AUDITABLE', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(14);
  doc.setTextColor(60, 60, 60);
  doc.text(`Vigencia ${vigencia}`, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 18;
  
  // Línea separadora
  doc.setDrawColor(0, 61, 165);
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 60, yPos, pageWidth / 2 + 60, yPos);
  
  yPos += 15;
  
  // Resumen ejecutivo
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN EJECUTIVO', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 12;
  
  // Estadísticas en cuadros
  const boxWidth = 55;
  const boxHeight = 32;
  const startX = (pageWidth - (boxWidth * 4 + 15)) / 2;
  
  const boxes = [
    { label: 'Total Procesos', value: estadisticas.totalProcesos, color: COLORES_ESAP.azulPrincipal },
    { label: 'Nivel Crítico', value: estadisticas.procesosCriticos ?? 0, color: COLORES_ESAP.rojo },
    { label: 'Nivel Alto', value: estadisticas.procesosAltos ?? 0, color: COLORES_ESAP.naranjaRiesgo },
    { label: 'Medio + Bajo', value: (estadisticas.procesosMedios ?? 0) + (estadisticas.procesosBajos ?? 0), color: COLORES_ESAP.verde }
  ];
  
  boxes.forEach((box, index) => {
    const x = startX + index * (boxWidth + 5);
    
    // Borde del cuadro
    doc.setDrawColor(...box.color);
    doc.setLineWidth(1.5);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'S');
    
    // Valor
    doc.setTextColor(...box.color);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(String(box.value), x + boxWidth / 2, yPos + 16, { align: 'center' });
    
    // Etiqueta
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(box.label, x + boxWidth / 2, yPos + 26, { align: 'center' });
  });
  
  // Pie de página
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Escuela Superior de Administración Pública - ESAP', pageWidth / 2, pageHeight - 25, { align: 'center' });
  
  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFontSize(8);
  doc.text(`Generado el ${fechaGeneracion}`, pageWidth / 2, pageHeight - 18, { align: 'center' });
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN ESTADÍSTICAS
// ════════════════════════════════════════════════════════════════════════════

function crearSeccionEstadisticas(doc: jsPDF, estadisticas: EstadisticasExport, vigencia: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado tipo formulario
  let y = crearEncabezadoFormulario(doc, vigencia);
  
  y += 5;
  
  // Título de sección
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(10, y - 5, pageWidth - 20, 12, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADÍSTICAS DEL UNIVERSO AUDITABLE', 15, y + 3);
  
  y += 20;
  
  // Tabla de estadísticas
  const auditables = estadisticas.procesosAuditables ?? estadisticas.totalProcesos;
  const criticos = estadisticas.procesosCriticos ?? 0;
  const altos = estadisticas.procesosAltos ?? 0;
  const medios = estadisticas.procesosMedios ?? 0;
  const bajos = estadisticas.procesosBajos ?? 0;
  const total = estadisticas.totalProcesos || 1; // Evitar división por cero
  
  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Cantidad', 'Porcentaje', 'Descripción']],
    body: [
      ['Total Procesos', estadisticas.totalProcesos, '100%', 'Procesos identificados en el mapa de procesos institucional'],
      ['Procesos Auditables', auditables, `${Math.round(auditables / total * 100)}%`, 'Procesos que cumplen criterios de auditabilidad'],
      ['Nivel Crítico', criticos, `${Math.round(criticos / total * 100)}%`, 'Requieren auditoría anual obligatoria'],
      ['Nivel Alto', altos, `${Math.round(altos / total * 100)}%`, 'Auditoría recomendada cada 1-2 años'],
      ['Nivel Medio', medios, `${Math.round(medios / total * 100)}%`, 'Auditoría cada 2-3 años según capacidad'],
      ['Nivel Bajo', bajos, `${Math.round(bajos / total * 100)}%`, 'Auditoría cada 3-4 años o por solicitud']
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORES_ESAP.azulPrincipal,
      textColor: COLORES_ESAP.blanco,
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 'auto' }
    },
    margin: { left: 10, right: 10 }
  });
  
  // Nota al pie
  const finalY = ((doc as any).lastAutoTable?.finalY ?? 200) + 15;
  doc.setTextColor(...COLORES_ESAP.gris);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Nota: La clasificación de riesgos se realiza según la metodología DAFP y los lineamientos del MECI.',
    10,
    finalY
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TABLA DE PROCESOS
// ════════════════════════════════════════════════════════════════════════════

function crearTablaProcesos(doc: jsPDF, procesos: ProcesoAuditableExport[], vigencia: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado tipo formulario
  let y = crearEncabezadoFormulario(doc, vigencia);
  
  y += 5;
  
  // Título de sección
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(10, y - 5, pageWidth - 20, 12, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`LISTADO DE PROCESOS AUDITABLES - VIGENCIA ${vigencia}`, 15, y + 3);
  
  y += 20;
  
  // Preparar datos para la tabla (usando campos opcionales con fallbacks)
  const tableData = procesos.map(proceso => [
    proceso.codigo || '-',
    proceso.nombre,
    proceso.tipo || proceso.tipoProceso || '-',
    proceso.dependencia || proceso.dependenciaResponsable || '-',
    proceso.nivelRiesgo,
    `${proceso.scoreRiesgo ?? proceso.puntajeRiesgo ?? 0}/100`,
    proceso.frecuenciaAuditoria || proceso.frecuenciaSugerida || '-',
    proceso.ultimaAuditoria ? new Date(proceso.ultimaAuditoria).toLocaleDateString('es-CO') : 'N/A',
    proceso.auditable !== undefined ? (proceso.auditable ? 'Sí' : 'No') : 'Sí'
  ]);
  
  // Generar tabla
  autoTable(doc, {
    startY: y,
    head: [['Código', 'Proceso', 'Tipo', 'Dependencia', 'Riesgo', 'Score', 'Frecuencia', 'Última Aud.', 'Auditable']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORES_ESAP.azulPrincipal,
      textColor: COLORES_ESAP.blanco,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 25 },      // Código
      1: { cellWidth: 55 },      // Proceso
      2: { cellWidth: 25 },      // Tipo
      3: { cellWidth: 40 },      // Dependencia
      4: { cellWidth: 20, halign: 'center' },  // Riesgo
      5: { cellWidth: 18, halign: 'center' },  // Score
      6: { cellWidth: 25, halign: 'center' },  // Frecuencia
      7: { cellWidth: 25, halign: 'center' },  // Última Aud.
      8: { cellWidth: 18, halign: 'center' }   // Auditable
    },
    margin: { left: 10, right: 10 },
    didParseCell: function(data: any) {
      // Colorear celda de riesgo según nivel
      if (data.column.index === 4 && data.section === 'body') {
        const riesgo = data.cell.raw;
        if (riesgo === 'Crítico') {
          data.cell.styles.textColor = COLORES_ESAP.rojo;
          data.cell.styles.fontStyle = 'bold';
        } else if (riesgo === 'Alto') {
          data.cell.styles.textColor = COLORES_ESAP.naranjaRiesgo;
          data.cell.styles.fontStyle = 'bold';
        } else if (riesgo === 'Medio') {
          data.cell.styles.textColor = COLORES_ESAP.amarillo;
        } else if (riesgo === 'Bajo') {
          data.cell.styles.textColor = COLORES_ESAP.verde;
        }
      }
    }
  });
  
  // Total de registros
  const finalY = ((doc as any).lastAutoTable?.finalY ?? 200) + 10;
  doc.setTextColor(...COLORES_ESAP.negro);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de procesos: ${procesos.length}`, 10, finalY);
}

// ════════════════════════════════════════════════════════════════════════════
// MARCA DE AGUA
// ════════════════════════════════════════════════════════════════════════════

function agregarMarcaDeAgua(doc: jsPDF): void {
  const pageCount = doc.internal.pages.length - 1;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(50);
    doc.setFont('helvetica', 'bold');
    
   
  }
}

// ════════════════════════════════════════════════════════════════════════════
// HEADER Y FOOTER
// ════════════════════════════════════════════════════════════════════════════

function agregarHeaderFooterTodasPaginas(doc: jsPDF, vigencia: number, startPage: number): void {
  const pageCount = doc.internal.pages.length - 1;
  
  for (let i = startPage; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setDrawColor(...COLORES_ESAP.azulPrincipal);
    doc.setLineWidth(0.5);
    doc.line(10, 15, pageWidth - 10, 15);
    
    doc.setTextColor(...COLORES_ESAP.azulPrincipal);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('ESAP - Universo Auditable', 10, 12);
    doc.text(`Vigencia ${vigencia}`, pageWidth - 10, 12, { align: 'right' });
    
    // Footer
    doc.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
    doc.setTextColor(...COLORES_ESAP.gris);
    doc.text('Oficina de Control Interno de Gestión - OCIG', 10, pageHeight - 10);
    doc.text(`Página ${i - startPage + 1} de ${pageCount - startPage + 1}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN A EXCEL (usando datos CSV como alternativa simple)
// ════════════════════════════════════════════════════════════════════════════

export function exportarUniversoAuditableExcel(
  procesos: ProcesoAuditableExport[],
  estadisticas: EstadisticasExport,
  opciones: OpcionesExportacion = {}
): ResultadoExportacion {
  const vigencia = opciones.vigencia || new Date().getFullYear();
  
  try {
    // Crear contenido CSV
    const headers = ['Código', 'Proceso', 'Tipo', 'Macroproceso', 'Dependencia', 'Nivel Riesgo', 'Score', 'Frecuencia', 'Última Auditoría', 'Auditable'];
    
    const rows = procesos.map(p => [
      p.codigo || '-',
      `"${p.nombre}"`, // Comillas para manejar comas en el nombre
      p.tipo || p.tipoProceso || '-',
      p.macroproceso || '-',
      `"${p.dependencia || p.dependenciaResponsable || '-'}"`,
      p.nivelRiesgo,
      p.scoreRiesgo ?? p.puntajeRiesgo ?? 0,
      p.frecuenciaAuditoria || p.frecuenciaSugerida || '-',
      p.ultimaAuditoria || 'N/A',
      p.auditable !== undefined ? (p.auditable ? 'Sí' : 'No') : 'Sí'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Crear Blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Universo_Auditable_${vigencia}_ESAP.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    return {
      exito: true,
      formato: 'CSV/Excel',
      nombreArchivo: `Universo_Auditable_${vigencia}_ESAP.csv`,
      mensaje: 'Archivo exportado correctamente'
    };
    
  } catch (error) {
    return {
      exito: false,
      formato: 'CSV/Excel',
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export default exportarUniversoAuditablePDF;
