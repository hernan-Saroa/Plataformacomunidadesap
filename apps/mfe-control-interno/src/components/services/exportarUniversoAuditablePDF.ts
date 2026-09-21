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
import { LOGO_CERTIFICACIONES_ESAP_B64 as logoESAP } from './logoCertificacionesESAP';

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
  auditableManual?: boolean | null;
  tiempoUltimaAuditoria?: number;
  _evaluacionRiesgo?: {
    riesgosExtremos?: number;
    riesgosAltos?: number;
    riesgosModerados?: number;
    riesgosBajos?: number;
    tiempoUltimaAuditoria?: number;
    temasAltaDireccion?: number;
    objetivosEstrategicos?: number;
    hallazgosAnteriores?: number;
    ponderacionFinalDafp?: number;
    nivelCriticidadDafp?: string;
    cicloRotacionDafp?: string;
  };
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
// EXPORTACIÓN A EXCEL — FORMATO EM-FO-008 V02 (EFDS-1924)
// ════════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import plantillaEmFo008 from '@/assets/EM-FO-008_V02.xlsx?url';

const HOJA_PRIORIZACION = 'Priorización ';
const FILA_INICIAL = 9;
const COLUMNAS = 24; // A..X
// Hojas ocultas de trabajo que trae el archivo y no hacen parte del formato.
const HOJAS_SOBRANTES = ['Procesos A Auditar Vs Recursos', 'Seguimiento Programa Anual', 'Hoja1'];

// Textos de las listas de la hoja Parámetros, en orden de calificación (1 a 5).
const TIEMPO_ULTIMA_AUDITORIA = ['<= 1 año', '> 1 año <= 2 años', '> 2 años <= 3 años', '> 3 años <= 4 años', '> 4 años'];
const TEMAS_ALTA_DIRECCION = ['Interés poco relevante', 'Interés bajo', 'Interés medio', 'Interés alto', 'Interés muy relevante'];
const OBJETIVOS_ESTRATEGICOS = [
  'No tiene objetivo asociado',
  '1 objetivo estratégico asociado',
  '2 objetivos estratégicos asociados',
  '3 objetivos estratégicos asociados',
  '4 o más objetivos estratégicos asociados',
];
const RESULTADOS_AUDITORIAS = ['Sin hallazgos', '1 a 2 hallazgos', '3 a 4 hallazgos', '5 a 6 hallazgos', '7 o más hallazgos'];

const calificacion = (valor?: number) => (valor && valor >= 1 && valor <= 5 ? valor : null);
const opcion = (lista: string[], valor?: number) => (calificacion(valor) ? lista[(valor as number) - 1] : null);

/** Años del ciclo de rotación en que se audita la unidad, igual que las columnas U a X del formato. */
function anosPriorizacion(ciclo: string, auditableManual?: boolean | null): number[] {
  const anos =
    ciclo === 'Cada año' || ciclo === 'Todos los años' ? [1, 2, 3, 4]
      : ciclo === 'Cada 2 años' ? [2, 4]
        : ciclo === 'Cada 3 años' ? [3]
          : ciclo === 'Cada 4 años' ? [4]
            : [];
  // La priorización manual de la columna Aud. decide si entra al plan del año 1.
  if (auditableManual === true && !anos.includes(1)) return [1, ...anos];
  if (auditableManual === false) return anos.filter((a) => a !== 1);
  return anos;
}

export async function exportarUniversoAuditableExcel(
  procesos: ProcesoAuditableExport[],
  estadisticas: EstadisticasExport,
  opciones: OpcionesExportacion = {}
): Promise<ResultadoExportacion> {
  const vigencia = opciones.vigencia || new Date().getFullYear();
  const nombreArchivo = `EM-FO-008_Universo_Auditable_${vigencia}.xlsx`;

  try {
    // Relativa al módulo: el microfrontend puede servirse desde otro origen que el shell.
    const respuesta = await fetch(new URL(plantillaEmFo008, import.meta.url));
    if (!respuesta.ok) throw new Error('No se pudo cargar la plantilla EM-FO-008');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await respuesta.arrayBuffer());

    HOJAS_SOBRANTES.forEach((nombre) => {
      const hoja = workbook.getWorksheet(nombre);
      if (hoja) workbook.removeWorksheet(hoja.id);
    });

    const ws = workbook.getWorksheet(HOJA_PRIORIZACION);
    if (!ws) throw new Error('La plantilla no tiene la hoja Priorización');

    ws.getCell('V6').value = new Date().toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Bogota',
    });

    // La plantilla trae filas de ejemplo con fórmulas: se limpian y cada fila de
    // datos toma el estilo de la primera fila del formato.
    const plantillaFila = ws.getRow(FILA_INICIAL);
    const estilos = Array.from({ length: COLUMNAS }, (_, c) => JSON.stringify(plantillaFila.getCell(c + 1).style));
    const altura = plantillaFila.height;
    const ultimaFila = FILA_INICIAL + procesos.length - 1;

    for (let r = FILA_INICIAL; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      for (let c = 1; c <= COLUMNAS; c++) {
        const cell = row.getCell(c);
        cell.value = null;
        if (r > ultimaFila) cell.style = {};
      }
    }

    procesos.forEach((proceso, idx) => {
      const ev = proceso._evaluacionRiesgo || {};
      const extremos = Number(ev.riesgosExtremos) || 0;
      const altos = Number(ev.riesgosAltos) || 0;
      const moderados = Number(ev.riesgosModerados) || 0;
      const bajos = Number(ev.riesgosBajos) || 0;
      const tiempo = ev.tiempoUltimaAuditoria ?? proceso.tiempoUltimaAuditoria;
      const ciclo = ev.cicloRotacionDafp || '';
      const anos = anosPriorizacion(ciclo, proceso.auditableManual);
      const unidad = proceso.macroproceso ? `${proceso.nombre} - ${proceso.macroproceso}` : proceso.nombre;

      const valores = [
        idx + 1,
        unidad,
        extremos,
        altos,
        moderados,
        bajos,
        extremos + altos + moderados + bajos,
        extremos ? 'Extremo' : altos ? 'Alto' : moderados ? 'Moderado' : 'Bajo',
        extremos ? 5 : altos ? 4 : moderados ? 3 : bajos ? 2 : 1,
        opcion(TIEMPO_ULTIMA_AUDITORIA, tiempo),
        calificacion(tiempo),
        opcion(TEMAS_ALTA_DIRECCION, ev.temasAltaDireccion),
        calificacion(ev.temasAltaDireccion),
        opcion(OBJETIVOS_ESTRATEGICOS, ev.objetivosEstrategicos),
        calificacion(ev.objetivosEstrategicos),
        opcion(RESULTADOS_AUDITORIAS, ev.hallazgosAnteriores),
        calificacion(ev.hallazgosAnteriores),
        Number(ev.ponderacionFinalDafp) || null,
        ev.nivelCriticidadDafp || null,
        ciclo || null,
        anos.includes(1) ? unidad : null,
        anos.includes(2) ? unidad : null,
        anos.includes(3) ? unidad : null,
        anos.includes(4) ? unidad : null,
      ];

      const row = ws.getRow(FILA_INICIAL + idx);
      row.height = altura;
      valores.forEach((valor, c) => {
        const cell = row.getCell(c + 1);
        cell.style = JSON.parse(estilos[c]);
        cell.value = valor;
      });
    });

    // Los semáforos de nivel de riesgo y criticidad cubren solo las filas con datos.
    (ws as unknown as { conditionalFormattings: { ref: string }[] }).conditionalFormattings.forEach((cf) => {
      cf.ref = cf.ref.replace(/\d+$/, String(ultimaFila));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    window.URL.revokeObjectURL(url);

    return {
      exito: true,
      formato: 'Excel',
      nombreArchivo,
      mensaje: 'Universo Auditable exportado en el formato EM-FO-008'
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
