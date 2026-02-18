/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO: EXPORTACIÓN DE AUDITORÍA A PDF
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Genera el documento oficial de la Auditoría con:
 * - Diseño corporativo ESAP (igual que Universo Auditable)
 * - Encabezado tipo formulario con CÓDIGO, VERSIÓN, FECHA
 * - Colores corporativos (#003DA5)
 * - Footer con numeración de páginas
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface AuditoriaPDFData {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
  fase?: string;
  areaObjetivo?: string;
  territorial?: string;
  procesoAuditado?: string;
  auditorLider: {
    nombre: string;
    cargo?: string;
    email?: string;
  };
  equipoAuditores?: Array<{
    nombre: string;
    rol?: string;
  }>;
  fechaInicio: string;
  fechaFin: string;
  progreso?: number;
  hallazgos?: number;
  objetivo?: string;
  alcance?: string;
  criterios?: string;
  metodologia?: string;
}

export interface ResultadoExportacionAuditoria {
  exito: boolean;
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
  grisClaro: [240, 240, 240] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
  negro: [0, 0, 0] as [number, number, number],
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN AUXILIAR - FORMATEAR FECHA
// ════════════════════════════════════════════════════════════════════════════

const MESES_ES: { [key: string]: number } = {
  'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
  'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11,
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

function parsearFechaEspanol(fecha: string): Date | null {
  // Formato: "30 ene 2026" o "30 de enero de 2026"
  const partes = fecha.toLowerCase().replace(/de /g, '').split(/\s+/);
  if (partes.length >= 3) {
    const dia = parseInt(partes[0]);
    const mes = MESES_ES[partes[1]];
    const anio = parseInt(partes[2]);
    if (!isNaN(dia) && mes !== undefined && !isNaN(anio)) {
      return new Date(anio, mes, dia);
    }
  }
  return null;
}

function parsearFechaDDMMYYYY(fecha: string): Date | null {
  // Formato: "01/02/2025" (DD/MM/YYYY)
  const partes = fecha.split('/');
  if (partes.length === 3) {
    const dia = parseInt(partes[0]);
    const mes = parseInt(partes[1]) - 1;
    const anio = parseInt(partes[2]);
    if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio)) {
      return new Date(anio, mes, dia);
    }
  }
  return null;
}

function formatearFecha(fecha: string): string {
  if (!fecha || fecha === '') return 'No definida';
  
  try {
    let d: Date | null = null;
    
    // Intentar formato español: "30 ene 2026"
    d = parsearFechaEspanol(fecha);
    
    // Intentar formato DD/MM/YYYY: "01/02/2025"
    if (!d || isNaN(d.getTime())) {
      d = parsearFechaDDMMYYYY(fecha);
    }
    
    // Intentar formato ISO o estándar
    if (!d || isNaN(d.getTime())) {
      d = new Date(fecha);
    }
    
    // Verificar si la fecha es válida
    if (!d || isNaN(d.getTime())) {
      return fecha; // Devolver la fecha original si no se puede parsear
    }
    
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return fecha; // Devolver original en caso de error
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ENCABEZADO CORPORATIVO TIPO FORMULARIO (igual que Universo Auditable)
// ════════════════════════════════════════════════════════════════════════════

function crearEncabezadoFormulario(doc: jsPDF, auditoria: AuditoriaPDFData): number {
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
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME DE AUDITORÍA INTERNA', tituloCentro, margen + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Oficina de Control Interno de Gestión - OCIG', tituloCentro, margen + 19, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(0, 61, 165);
  doc.setFont('helvetica', 'bold');
  doc.text(auditoria.codigo, tituloCentro, margen + 26, { align: 'center' });
  
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
  doc.text('EM-FO-014', infoBoxX + labelWidth + 2, margen + 6);
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
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export async function exportarAuditoriaPDF(
  auditoria: AuditoriaPDFData
): Promise<ResultadoExportacionAuditoria> {
  
  try {
    console.log('📄 Generando PDF de Auditoría...');
    
    // Crear documento PDF (A4 portrait)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // ════════════════════════════════════════════════════════════════════════
    // ENCABEZADO TIPO FORMULARIO
    // ════════════════════════════════════════════════════════════════════════
    
    let yPos = crearEncabezadoFormulario(doc, auditoria);

    // ════════════════════════════════════════════════════════════════════════
    // INFORMACIÓN DE LA AUDITORÍA
    // ════════════════════════════════════════════════════════════════════════

    // Título de sección
    doc.setFillColor(...COLORES_ESAP.azulPrincipal);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE LA AUDITORÍA', pageWidth / 2, yPos + 7, { align: 'center' });
    yPos += 15;

    // Extraer nombres del equipo auditor
    const equipoNombres = auditoria.equipoAuditores && auditoria.equipoAuditores.length > 0
      ? auditoria.equipoAuditores.map(a => a.nombre).join(', ')
      : 'No asignado';

    // Tabla de información
    const infoData = [
      ['CÓDIGO', auditoria.codigo || '-'],
      ['NOMBRE', auditoria.nombre || '-'],
      ['TIPO', auditoria.tipo || '-'],
      ['ESTADO', auditoria.estado || '-'],
      ['ÁREA/PROCESO A AUDITAR', auditoria.areaObjetivo || auditoria.procesoAuditado || 'No definido'],
      ['FECHA INICIO', formatearFecha(auditoria.fechaInicio)],
      ['FECHA FIN', formatearFecha(auditoria.fechaFin)],
      ['AUDITOR LÍDER', auditoria.auditorLider?.nombre || 'No asignado'],
      ['EQUIPO AUDITOR', equipoNombres],
    ];

    autoTable(doc, {
      startY: yPos,
      body: infoData,
      theme: 'grid',
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [240, 244, 248] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = ((doc as any).lastAutoTable?.finalY ?? yPos) + 10;

    // ════════════════════════════════════════════════════════════════════════
    // ASPECTOS A TENER EN CUENTA
    // ════════════════════════════════════════════════════════════════════════

    doc.setFillColor(...COLORES_ESAP.azulPrincipal);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ASPECTOS A TENER EN CUENTA', pageWidth / 2, yPos + 7, { align: 'center' });
    yPos += 15;

    const objetivoTexto = auditoria.objetivo || 
      `Verificar el cumplimiento de los procesos y procedimientos del área ${auditoria.areaObjetivo || 'auditada'}, identificando oportunidades de mejora.`;
    
    const alcanceTexto = auditoria.alcance || 
      `La auditoría comprende la revisión de los procesos y documentación del área ${auditoria.areaObjetivo || 'objetivo'} durante el período ${formatearFecha(auditoria.fechaInicio)} al ${formatearFecha(auditoria.fechaFin)}.`;
    
    const criteriosTexto = auditoria.criterios || 
      'Normatividad interna, procedimientos del Sistema de Gestión de Calidad, Decreto 648 de 2017.';
    
    const metodologiaTexto = auditoria.metodologia || 
      'Revisión documental, entrevistas, verificación de registros y observación directa.';

    const aspectosData = [
      ['OBJETIVO DE LA AUDITORÍA', objetivoTexto],
      ['ALCANCE DE LA AUDITORÍA', alcanceTexto],
      ['CRITERIOS DE AUDITORÍA', criteriosTexto],
      ['METODOLOGÍA DE AUDITORÍA', metodologiaTexto],
    ];

    autoTable(doc, {
      startY: yPos,
      body: aspectosData,
      theme: 'grid',
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold', fillColor: [240, 244, 248] },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = ((doc as any).lastAutoTable?.finalY ?? yPos) + 10;

    // ════════════════════════════════════════════════════════════════════════
    // CRONOGRAMA (Tabla)
    // ════════════════════════════════════════════════════════════════════════

    // Verificar si necesita nueva página
    if (yPos > 200) {
      doc.addPage();
      yPos = crearEncabezadoFormulario(doc, auditoria);
    }

    doc.setFillColor(...COLORES_ESAP.azulPrincipal);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CRONOGRAMA DE ACTIVIDADES', pageWidth / 2, yPos + 7, { align: 'center' });
    yPos += 12;

    const auditorLiderNombre = auditoria.auditorLider?.nombre || 'No asignado';

    // Tabla de cronograma
    const actividadesCronograma = [
      ['Planificación de la auditoría', auditorLiderNombre, formatearFecha(auditoria.fechaInicio), 'Sede ESAP'],
      ['Reunión de apertura', auditorLiderNombre, formatearFecha(auditoria.fechaInicio), 'Área auditada'],
      ['Ejecución de la auditoría', 'Equipo auditor', 'Durante el período', 'Área auditada'],
      ['Elaboración del informe', auditorLiderNombre, formatearFecha(auditoria.fechaFin), 'OCIG'],
      ['Reunión de cierre', auditorLiderNombre, formatearFecha(auditoria.fechaFin), 'Área auditada'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['ACTIVIDAD', 'RESPONSABLE', 'FECHA', 'LUGAR']],
      body: actividadesCronograma,
      theme: 'grid',
      headStyles: {
        fillColor: COLORES_ESAP.azulPrincipal,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 45 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });

    // ════════════════════════════════════════════════════════════════════════
    // PIE DE PÁGINA EN TODAS LAS PÁGINAS
    // ════════════════════════════════════════════════════════════════════════

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Línea inferior
      doc.setDrawColor(...COLORES_ESAP.azulPrincipal);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      // Texto del pie
      doc.setFontSize(8);
      doc.setTextColor(...COLORES_ESAP.gris);
      doc.setFont('helvetica', 'normal');
      doc.text('Oficina de Control Interno de Gestión - OCIG', margin, pageHeight - 10);
      
      // Número de página
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // ════════════════════════════════════════════════════════════════════════
    // GUARDAR Y DESCARGAR
    // ════════════════════════════════════════════════════════════════════════

    const nombreArchivo = `Auditoria_${auditoria.codigo}_${new Date().getTime()}.pdf`;
    doc.save(nombreArchivo);

    console.log('✅ PDF de auditoría generado exitosamente');

    return {
      exito: true,
      nombreArchivo,
      mensaje: 'Auditoría exportada correctamente a PDF'
    };

  } catch (error) {
    console.error('❌ Error al generar PDF de auditoría:', error);
    return {
      exito: false,
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al generar PDF'
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// EXPORT POR DEFECTO
// ════════════════════════════════════════════════════════════════════════════

export default exportarAuditoriaPDF;
