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

// ✅ Importar logo ESAP dinámicamente (Vite lo maneja automáticamente)
import logoESAP from '@/assets/cropped-favicon-32x32.png';

// Cache del logo en base64 para reutilización
let _logoCache: string | null = null;

/**
 * Convierte el logo a base64 para uso en PDF
 */
async function getLogoBase64(): Promise<string> {
  if (_logoCache) return _logoCache;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        _logoCache = canvas.toDataURL('image/png');
        resolve(_logoCache);
      } else {
        resolve(logoESAP);
      }
    };
    img.onerror = () => resolve(logoESAP);
    img.src = logoESAP;
  });
}

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
  tiempoUltimaAuditoria?: number;
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
    
    // ✅ Cargar logo ESAP primero
    const logoBase64 = await getLogoBase64();
    
    // Crear documento PDF (A4 horizontal para tablas)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    // Portada
    if (incluirPortada) {
      crearPortada(doc, vigencia, estadisticas, logoBase64);
      doc.addPage();
    }
    
    // Estadísticas
    if (incluirEstadisticas) {
      crearSeccionEstadisticas(doc, estadisticas, vigencia, logoBase64);
      doc.addPage();
    }
    
    // Tabla de Procesos
    crearTablaProcesos(doc, procesos, vigencia, logoBase64);
    
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

function crearEncabezadoFormulario(doc: jsPDF, vigencia: number, logoBase64?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margen = 10;
  const headerHeight = 28;
  const footerBarHeight = 8;
  const totalHeight = headerHeight + footerBarHeight;
  
  // ═══ CUADRO PRINCIPAL DEL ENCABEZADO ═══
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margen, margen, pageWidth - (margen * 2), totalHeight);
  
  // ═══ SECCIÓN IZQUIERDA: LOGO ESAP ═══
  const logoWidth = 50;
  doc.line(margen + logoWidth, margen, margen + logoWidth, margen + headerHeight);
  
  // ✅ DIBUJAR LOGO ESAP
  try {
    if (logoBase64) {
      const logoSize = 18;
      const logoCenterX = margen + (logoWidth / 2) - (logoSize / 2);
      const logoCenterY = margen + (headerHeight / 2) - (logoSize / 2);
      doc.addImage(logoBase64, 'PNG', logoCenterX, logoCenterY, logoSize, logoSize);
    } else {
      // Fallback: texto si no hay logo
      throw new Error('No logo provided');
    }
  } catch {
    // Fallback: Texto institucional ESAP si falla el logo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('ESAP', margen + logoWidth / 2, margen + 12, { align: 'center' });
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Escuela Superior de', margen + logoWidth / 2, margen + 18, { align: 'center' });
    doc.text('Administración Pública', margen + logoWidth / 2, margen + 22, { align: 'center' });
  }
  
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
  doc.text('Oficina de Control Interno', tituloCentro, margen + 19, { align: 'center' });
  
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

function crearPortada(doc: jsPDF, vigencia: number, estadisticas: EstadisticasExport, logoBase64?: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Encabezado tipo formulario con logo
  let yPos = crearEncabezadoFormulario(doc, vigencia, logoBase64);
  
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

function crearSeccionEstadisticas(doc: jsPDF, estadisticas: EstadisticasExport, vigencia: number, logoBase64?: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado tipo formulario con logo
  let y = crearEncabezadoFormulario(doc, vigencia, logoBase64);
  
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

function crearTablaProcesos(doc: jsPDF, procesos: ProcesoAuditableExport[], vigencia: number, logoBase64?: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado tipo formulario con logo
  let y = crearEncabezadoFormulario(doc, vigencia, logoBase64);
  
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
    doc.text('Oficina de Control Interno', 10, pageHeight - 10);
    doc.text(`Página ${i - startPage + 1} de ${pageCount - startPage + 1}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORTACIÓN A EXCEL PROFESIONAL (usando ExcelJS)
// ════════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';

// Colores corporativos para Excel
const EXCEL_COLORS = {
  primaryDark: 'FF1B4F72',    // Azul oscuro ESAP
  primaryLight: 'FF2980B9',   // Azul claro
  success: 'FF27AE60',        // Verde
  warning: 'FFF39C12',        // Amarillo/Naranja
  danger: 'FFE74C3C',         // Rojo
  white: 'FFFFFFFF',
  grayLight: 'FFF5F6FA',
  grayMedium: 'FFBDC3C7',
  textDark: 'FF2C3E50',
};

// Colores para niveles de riesgo
const RISK_COLORS: Record<string, string> = {
  'EXTREMO': EXCEL_COLORS.danger,
  'CRÍTICO': EXCEL_COLORS.danger,
  'ALTO': 'FFFF6B6B',
  'MODERADO': EXCEL_COLORS.warning,
  'MEDIO': EXCEL_COLORS.warning,
  'BAJO': EXCEL_COLORS.success,
  'MUY BAJO': 'FF00D4AA',
};

export async function exportarUniversoAuditableExcel(
  procesos: ProcesoAuditableExport[],
  estadisticas: EstadisticasExport,
  opciones: OpcionesExportacion = {}
): Promise<ResultadoExportacion> {
  const vigencia = opciones.vigencia || new Date().getFullYear();
  const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const fechaCorta = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP - Control Interno';
    workbook.created = new Date();
    
    // ✅ Cargar logo ESAP para Excel
    let logoImageId: number | null = null;
    try {
      const logoBase64 = await getLogoBase64();
      // Extraer solo la parte base64 sin el prefijo data:image/png;base64,
      const base64Data = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64;
      logoImageId = workbook.addImage({
        base64: base64Data,
        extension: 'png',
      });
    } catch (e) {
      console.warn('No se pudo cargar el logo para Excel:', e);
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // HOJA 1: UNIVERSO AUDITABLE
    // ═══════════════════════════════════════════════════════════════════════
    const wsUniverso = workbook.addWorksheet('Universo Auditable', {
      properties: { tabColor: { argb: EXCEL_COLORS.primaryDark } },
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
    });

    // ═══════════════════════════════════════════════════════════════════════
    // ENCABEZADO INSTITUCIONAL TIPO EM-PT-005 CON LOGO
    // Estructura: [LOGO] | [TÍTULO CENTRADO] | [CÓDIGO/VERSIÓN/FECHA]
    // ═══════════════════════════════════════════════════════════════════════
    
    // Configurar altura de filas del encabezado
    wsUniverso.getRow(1).height = 22;
    wsUniverso.getRow(2).height = 22;
    wsUniverso.getRow(3).height = 22;
    wsUniverso.getRow(4).height = 20;
    
    // --- SECCIÓN LOGO (Columnas A-B, Filas 1-3) ---
    wsUniverso.mergeCells('A1:B3');
    const logoCell = wsUniverso.getCell('A1');
    logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    logoCell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };
    
    // Agregar imagen del logo si está disponible
    if (logoImageId !== null) {
      wsUniverso.addImage(logoImageId, {
        tl: { col: 0.3, row: 0.3 },
        ext: { width: 55, height: 55 }
      });
    } else {
      // Fallback: texto ESAP si no hay logo
      logoCell.value = 'ESAP';
      logoCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
      logoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    
    // --- SECCIÓN TÍTULO (Columnas C-H, Filas 1-3) ---
    wsUniverso.mergeCells('C1:H1');
    const titleCell = wsUniverso.getCell('C1');
    titleCell.value = 'UNIVERSO AUDITABLE';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: '000000' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } }
    };
    
    wsUniverso.mergeCells('C2:H2');
    const subtitleCell = wsUniverso.getCell('C2');
    subtitleCell.value = 'Oficina de Control Interno';
    subtitleCell.font = { name: 'Calibri', size: 10, color: { argb: '444444' } };
    subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subtitleCell.border = {
      bottom: { style: 'thin', color: { argb: '000000' } }
    };
    
    wsUniverso.mergeCells('C3:H3');
    const vigenciaCell = wsUniverso.getCell('C3');
    vigenciaCell.value = `Vigencia ${vigencia}`;
    vigenciaCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
    vigenciaCell.alignment = { horizontal: 'center', vertical: 'middle' };
    vigenciaCell.border = {
      bottom: { style: 'thin', color: { argb: '000000' } }
    };
    
    // --- SECCIÓN INFO (Columnas I-K, Filas 1-3) ---
    // Fila 1: CÓDIGO
    wsUniverso.getCell('I1').value = 'CÓDIGO:';
    wsUniverso.getCell('I1').font = { name: 'Calibri', size: 9, bold: true };
    wsUniverso.getCell('I1').alignment = { horizontal: 'right', vertical: 'middle' };
    wsUniverso.getCell('I1').border = { top: { style: 'thin' }, left: { style: 'thin' } };
    
    wsUniverso.mergeCells('J1:K1');
    wsUniverso.getCell('J1').value = 'EM-PT-005';
    wsUniverso.getCell('J1').font = { name: 'Calibri', size: 9, color: { argb: EXCEL_COLORS.primaryDark } };
    wsUniverso.getCell('J1').alignment = { horizontal: 'left', vertical: 'middle' };
    wsUniverso.getCell('J1').border = { top: { style: 'thin' }, right: { style: 'thin' } };
    
    // Fila 2: VERSIÓN
    wsUniverso.getCell('I2').value = 'VERSIÓN:';
    wsUniverso.getCell('I2').font = { name: 'Calibri', size: 9, bold: true };
    wsUniverso.getCell('I2').alignment = { horizontal: 'right', vertical: 'middle' };
    wsUniverso.getCell('I2').border = { left: { style: 'thin' } };
    
    wsUniverso.mergeCells('J2:K2');
    wsUniverso.getCell('J2').value = '1';
    wsUniverso.getCell('J2').font = { name: 'Calibri', size: 9 };
    wsUniverso.getCell('J2').alignment = { horizontal: 'left', vertical: 'middle' };
    wsUniverso.getCell('J2').border = { right: { style: 'thin' } };
    
    // Fila 3: FECHA
    wsUniverso.getCell('I3').value = 'FECHA:';
    wsUniverso.getCell('I3').font = { name: 'Calibri', size: 9, bold: true };
    wsUniverso.getCell('I3').alignment = { horizontal: 'right', vertical: 'middle' };
    wsUniverso.getCell('I3').border = { left: { style: 'thin' }, bottom: { style: 'thin' } };
    
    wsUniverso.mergeCells('J3:K3');
    wsUniverso.getCell('J3').value = fechaCorta;
    wsUniverso.getCell('J3').font = { name: 'Calibri', size: 9 };
    wsUniverso.getCell('J3').alignment = { horizontal: 'left', vertical: 'middle' };
    wsUniverso.getCell('J3').border = { right: { style: 'thin' }, bottom: { style: 'thin' } };
    
    // --- FILA 4: PROCESO ---
    wsUniverso.mergeCells('A4:K4');
    const procesoCell = wsUniverso.getCell('A4');
    procesoCell.value = 'PROCESO: EVALUACIÓN, CONTROL Y MEJORA';
    procesoCell.font = { name: 'Calibri', size: 9, bold: true };
    procesoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
    procesoCell.alignment = { horizontal: 'left', vertical: 'middle' };
    procesoCell.border = {
      top: { style: 'thin', color: { argb: '000000' } },
      left: { style: 'thin', color: { argb: '000000' } },
      bottom: { style: 'thin', color: { argb: '000000' } },
      right: { style: 'thin', color: { argb: '000000' } }
    };

    // --- Fila 5: Espacio + Fecha generación ---
    wsUniverso.mergeCells('A5:K5');
    const dateCell = wsUniverso.getCell('A5');
    dateCell.value = `Fecha de generación: ${fechaGeneracion}`;
    dateCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '666666' } };
    dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
    wsUniverso.getRow(5).height = 18;

    // --- Fila 6: Espacio ---
    wsUniverso.getRow(6).height = 8;

    // --- Encabezados de tabla (Fila 7) ---
    const headers = ['No.', 'Código', 'Proceso / Elemento', 'Tipo', 'Macroproceso', 'Dependencia Responsable', 'Nivel Riesgo', 'Score', 'Frecuencia Sugerida', 'Última Auditoría', 'Auditable'];
    const headerRow = wsUniverso.getRow(7);
    
    headers.forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
        bottom: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
        left: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } },
        right: { style: 'thin', color: { argb: EXCEL_COLORS.primaryDark } }
      };
    });
    headerRow.height = 35;

    // --- Anchos de columna ---
    wsUniverso.columns = [
      { width: 6 },   // No.
      { width: 12 },  // Código
      { width: 45 },  // Proceso
      { width: 15 },  // Tipo
      { width: 25 },  // Macroproceso
      { width: 30 },  // Dependencia
      { width: 14 },  // Nivel Riesgo
      { width: 10 },  // Score
      { width: 16 },  // Frecuencia
      { width: 16 },  // Última Auditoría
      { width: 12 },  // Auditable
    ];

    const getUltimaAuditoria = (option?: number): string => {
      switch (option) {
        case 1:
          return '<= 1 año';
        case 2:
          return '> 1 año y <= 2 años';
        case 3:
          return '> 2 años y <= 3 años';
        case 4:
          return '> 3 años y <= 4 años';
        case 5:
          return '> 4 años';
        default:
          return 'Sin registro';
      }
    };

    // --- Datos de procesos (empiezan en fila 8) ---
    procesos.forEach((proceso, idx) => {
      const rowNum = 8 + idx;
      const dataRow = wsUniverso.getRow(rowNum);
      const isEven = idx % 2 === 0;
      
      const nivelRiesgo = (proceso.nivelRiesgo || 'BAJO').toUpperCase();
      const riskColor = RISK_COLORS[nivelRiesgo] || EXCEL_COLORS.grayMedium;
      
      const rowData = [
        idx + 1,
        proceso.codigo || '-',
        proceso.nombre,
        proceso.tipo || proceso.tipoProceso || '-',
        proceso.macroproceso || '-',
        proceso.dependencia || proceso.dependenciaResponsable || '-',
        proceso.nivelRiesgo || 'BAJO',
        proceso.scoreRiesgo ?? proceso.puntajeRiesgo ?? 0,
        proceso.frecuenciaAuditoria || proceso.frecuenciaSugerida || '-',
        getUltimaAuditoria(proceso.tiempoUltimaAuditoria),
        proceso.auditable !== undefined ? (proceso.auditable ? 'Sí' : 'No') : 'Sí'
      ];

      rowData.forEach((value, colIdx) => {
        const cell = dataRow.getCell(colIdx + 1);
        cell.value = value;
        cell.font = { name: 'Calibri', size: 10, color: { argb: EXCEL_COLORS.textDark } };
        cell.alignment = { 
          horizontal: colIdx === 2 || colIdx === 5 ? 'left' : 'center', 
          vertical: 'middle',
          wrapText: colIdx === 2 || colIdx === 5 || colIdx === 4
        };
        cell.fill = { 
          type: 'pattern', 
          pattern: 'solid', 
          fgColor: { argb: isEven ? EXCEL_COLORS.white : EXCEL_COLORS.grayLight } 
        };
        cell.border = {
          top: { style: 'thin', color: { argb: EXCEL_COLORS.grayMedium } },
          bottom: { style: 'thin', color: { argb: EXCEL_COLORS.grayMedium } },
          left: { style: 'thin', color: { argb: EXCEL_COLORS.grayMedium } },
          right: { style: 'thin', color: { argb: EXCEL_COLORS.grayMedium } }
        };

        // Formato especial para nivel de riesgo
        if (colIdx === 6) {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.white } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColor } };
        }

        // Formato para Score
        if (colIdx === 7 && typeof value === 'number') {
          cell.numFmt = '0.0';
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.textDark } };
        }

        // Formato para Auditable
        if (colIdx === 10) {
          const esAuditable = value === 'Sí';
          cell.font = { 
            name: 'Calibri', 
            size: 10, 
            bold: true, 
            color: { argb: esAuditable ? EXCEL_COLORS.success : EXCEL_COLORS.grayMedium } 
          };
        }
      });
      dataRow.height = 22;
    });

    // --- Totales ---
    const totalRowNum = 7 + procesos.length + 1;
    wsUniverso.mergeCells(`A${totalRowNum}:F${totalRowNum}`);
    const totalLabelCell = wsUniverso.getCell(`A${totalRowNum}`);
    totalLabelCell.value = `TOTAL PROCESOS: ${procesos.length}`;
    totalLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
    totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

    const auditables = procesos.filter(p => p.auditable !== false).length;
    wsUniverso.mergeCells(`G${totalRowNum}:K${totalRowNum}`);
    const totalAuditCell = wsUniverso.getCell(`G${totalRowNum}`);
    totalAuditCell.value = `Auditables: ${auditables} | No Auditables: ${procesos.length - auditables}`;
    totalAuditCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
    totalAuditCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
    totalAuditCell.alignment = { horizontal: 'center', vertical: 'middle' };
    wsUniverso.getRow(totalRowNum).height = 28;

    // ═══════════════════════════════════════════════════════════════════════
    // HOJA 2: RESUMEN ESTADÍSTICO
    // ═══════════════════════════════════════════════════════════════════════
    const wsResumen = workbook.addWorksheet('Resumen Estadístico', {
      properties: { tabColor: { argb: EXCEL_COLORS.success } }
    });

    // Encabezado
    wsResumen.mergeCells('A1:D1');
    const resumenTitle = wsResumen.getCell('A1');
    resumenTitle.value = `RESUMEN ESTADÍSTICO - UNIVERSO AUDITABLE ${vigencia}`;
    resumenTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: EXCEL_COLORS.white } };
    resumenTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryDark } };
    resumenTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    wsResumen.getRow(1).height = 35;

    wsResumen.columns = [
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 15 },
    ];

    // Estadísticas generales
    const totalAuditables = estadisticas.procesosAuditables ?? procesos.filter(p => p.auditable !== false).length;
    const criticos = estadisticas.procesosCriticos ?? procesos.filter(p => (p.nivelRiesgo || '').toUpperCase() === 'CRÍTICO').length;
    const altos = estadisticas.procesosAltos ?? procesos.filter(p => (p.nivelRiesgo || '').toUpperCase() === 'ALTO').length;
    const medios = estadisticas.procesosMedios ?? procesos.filter(p => (p.nivelRiesgo || '').toUpperCase() === 'MEDIO').length;
    const bajos = estadisticas.procesosBajos ?? procesos.filter(p => (p.nivelRiesgo || '').toUpperCase() === 'BAJO').length;
    const muyBajos = procesos.filter(p => (p.nivelRiesgo || '').toUpperCase() === 'MUY BAJO').length;
    const total = estadisticas.totalProcesos || procesos.length;

    const statsData = [
      ['', '', '', ''],
      ['📊 INDICADORES GENERALES', '', '', ''],
      ['Total de Procesos', total, '', ''],
      ['Procesos Auditables', totalAuditables, '', ''],
      ['Cobertura del Universo', `${((totalAuditables / total) * 100).toFixed(1)}%`, '', ''],
      ['', '', '', ''],
      ['🎯 DISTRIBUCIÓN POR NIVEL DE RIESGO', '', '', ''],
      ['Nivel de Riesgo', 'Cantidad', 'Porcentaje', ''],
      ['Crítico', criticos, `${((criticos / total) * 100).toFixed(1)}%`, ''],
      ['Alto', altos, `${((altos / total) * 100).toFixed(1)}%`, ''],
      ['Medio', medios, `${((medios / total) * 100).toFixed(1)}%`, ''],
      ['Bajo', bajos, `${((bajos / total) * 100).toFixed(1)}%`, ''],
      ['Muy Bajo', muyBajos, `${((muyBajos / total) * 100).toFixed(1)}%`, ''],
    ];

    statsData.forEach((rowData, idx) => {
      const row = wsResumen.getRow(idx + 2);
      rowData.forEach((value, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = value;
        cell.font = { name: 'Calibri', size: 11 };
        cell.alignment = { vertical: 'middle' };
        
        // Estilo para títulos de sección
        if (typeof value === 'string' && (value.includes('📊') || value.includes('🎯'))) {
          cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: EXCEL_COLORS.primaryDark } };
        }
        
        // Estilo para encabezados de tabla
        if (value === 'Nivel de Riesgo' || value === 'Cantidad' || value === 'Porcentaje') {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COLORS.primaryLight } };
        }
        
        // Colores para niveles de riesgo
        if (value === 'Crítico') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.danger.replace('FF', '') } };
        if (value === 'Alto') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF6B6B' } };
        if (value === 'Medio') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.warning.replace('FF', '') } };
        if (value === 'Bajo') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.success.replace('FF', '') } };
        if (value === 'Muy Bajo') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '00D4AA' } };
      });
    });

    // --- Pie de página en resumen ---
    const footerRow = wsResumen.getRow(20);
    wsResumen.mergeCells('A20:D20');
    const footerCell = footerRow.getCell(1);
    footerCell.value = `Documento generado automáticamente | ${fechaGeneracion}`;
    footerCell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: '999999' } };
    footerCell.alignment = { horizontal: 'center' };

    // ═══════════════════════════════════════════════════════════════════════
    // GUARDAR Y DESCARGAR
    // ═══════════════════════════════════════════════════════════════════════
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const nombreArchivo = `Universo_Auditable_${vigencia}_ESAP.xlsx`;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      formato: 'Excel',
      nombreArchivo,
      mensaje: 'Archivo Excel exportado correctamente con formato profesional'
    };

  } catch (error) {
    console.error('Error al exportar Excel:', error);
    return {
      exito: false,
      formato: 'Excel',
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al generar Excel'
    };
  }
}

export default exportarUniversoAuditablePDF;
