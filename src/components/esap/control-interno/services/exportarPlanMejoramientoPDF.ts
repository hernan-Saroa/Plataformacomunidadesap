/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO: EXPORTACIÓN DE PLAN DE MEJORAMIENTO A PDF
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Genera el documento oficial del Plan de Mejoramiento con:
 * - Logo ESAP institucional
 * - Encabezado tipo formulario con CÓDIGO: EMFO002, VERSIÓN, FECHA
 * - Colores corporativos (#003DA5)
 * - Formato oficial ESAP
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Importar logo ESAP
import logoESAP from '@/assets/cropped-favicon-32x32.png';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

export interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  hallazgoTitulo: string;
  descripcionAccion: string;
  causasRaiz: string;
  responsable: string;
  cargo: string;
  cantidadProgramada: number;
  fechaInicio: string;
  fechaFin: string;
  tiempoEjecucionMeses: number;
  evidenciasSoporte: string[];
  estado: 'PENDIENTE' | 'EN_REVISION' | 'APROBADA';
}

export interface PlanMejoramientoPDF {
  id: string;
  auditoriaId: string;
  auditoriaCodigo: string;
  auditoriaNombre: string;
  areaResponsable: string;
  responsableArea: string | { nombre: string };
  fechaCreacion: string;
  fechaLimite: string;
  estado: string;
  acciones: AccionCorrectiva[];
  observacionesJefeOCI?: string;
  fechaAprobacion?: string;
}

export interface ResultadoExportacion {
  exito: boolean;
  nombreArchivo: string;
  mensaje?: string;
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// COLORES CORPORATIVOS ESAP
// ════════════════════════════════════════════════════════════════════════════

const COLORES_ESAP = {
  azulPrincipal: [0, 61, 165] as [number, number, number],
  verde: [16, 185, 129] as [number, number, number],
  gris: [128, 128, 128] as [number, number, number],
  grisClaro: [240, 244, 248] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

// ════════════════════════════════════════════════════════════════════════════
// CACHE DEL LOGO
// ════════════════════════════════════════════════════════════════════════════

let _logoCache: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (_logoCache) return _logoCache;
  
  return new Promise((resolve, reject) => {
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
        reject(new Error('No se pudo obtener el contexto del canvas'));
      }
    };
    img.onerror = reject;
    img.src = logoESAP;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ENCABEZADO INSTITUCIONAL CON LOGO
// ════════════════════════════════════════════════════════════════════════════

function crearEncabezadoFormulario(doc: jsPDF, logoBase64?: string): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margen = 10;
  const headerHeight = 28;
  const footerBarHeight = 8;
  const totalHeight = headerHeight + footerBarHeight;
  
  // Cuadro principal del encabezado
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margen, margen, pageWidth - (margen * 2), totalHeight);
  
  // Sección izquierda: Logo ESAP
  const logoWidth = 50;
  doc.line(margen + logoWidth, margen, margen + logoWidth, margen + headerHeight);
  
  // Agregar logo si está disponible
  if (logoBase64) {
    try {
      const logoSize = 18;
      const logoCenterX = margen + (logoWidth / 2) - (logoSize / 2);
      const logoCenterY = margen + (headerHeight / 2) - (logoSize / 2);
      doc.addImage(logoBase64, 'PNG', logoCenterX, logoCenterY, logoSize, logoSize);
    } catch (error) {
      console.warn('No se pudo agregar logo');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 61, 165);
      doc.text('ESAP', margen + logoWidth / 2, margen + 14, { align: 'center' });
    }
  } else {
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
  
  // Sección central: Título
  const infoBoxWidth = 50;
  const tituloStartX = margen + logoWidth;
  const tituloEndX = pageWidth - margen - infoBoxWidth;
  const tituloWidth = tituloEndX - tituloStartX;
  const tituloCentro = tituloStartX + (tituloWidth / 2);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN DE MEJORAMIENTO', tituloCentro, margen + 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Oficina de Control Interno de Gestión - OCIG', tituloCentro, margen + 19, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(0, 61, 165);
  doc.setFont('helvetica', 'bold');
  doc.text('Formato EMFO002', tituloCentro, margen + 26, { align: 'center' });
  
  // Sección derecha: Código, versión, fecha
  const infoBoxX = pageWidth - margen - infoBoxWidth;
  doc.setLineWidth(0.3);
  doc.line(infoBoxX, margen, infoBoxX, margen + headerHeight);
  
  const rowHeight = headerHeight / 3;
  
  doc.line(infoBoxX, margen + rowHeight, pageWidth - margen, margen + rowHeight);
  doc.line(infoBoxX, margen + (rowHeight * 2), pageWidth - margen, margen + (rowHeight * 2));
  
  const labelWidth = 20;
  doc.line(infoBoxX + labelWidth, margen, infoBoxX + labelWidth, margen + headerHeight);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('CÓDIGO:', infoBoxX + 2, margen + 6);
  doc.text('VERSIÓN:', infoBoxX + 2, margen + rowHeight + 6);
  doc.text('FECHA:', infoBoxX + 2, margen + (rowHeight * 2) + 6);
  
  doc.setTextColor(0, 61, 165);
  doc.setFont('helvetica', 'normal');
  doc.text('EMFO002', infoBoxX + labelWidth + 2, margen + 6);
  doc.text('1', infoBoxX + labelWidth + 2, margen + rowHeight + 6);
  doc.setTextColor(0, 0, 0);
  const fechaActual = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(fechaActual, infoBoxX + labelWidth + 2, margen + (rowHeight * 2) + 6);
  
  // Barra inferior: Proceso
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
  
  return margen + totalHeight + 8;
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN AUXILIAR - FORMATEAR FECHA
// ════════════════════════════════════════════════════════════════════════════

function formatearFecha(fecha: string): string {
  if (!fecha) return 'No definida';
  try {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return fecha;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export async function exportarPlanMejoramientoPDF(
  plan: PlanMejoramientoPDF
): Promise<ResultadoExportacion> {
  
  try {
    console.log('📄 Generando PDF de Plan de Mejoramiento...');
    
    // Cargar logo ESAP
    let logoBase64: string | undefined;
    try {
      logoBase64 = await getLogoBase64();
    } catch (error) {
      console.warn('No se pudo cargar el logo ESAP:', error);
    }
    
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
    // ENCABEZADO CON LOGO
    // ════════════════════════════════════════════════════════════════════════
    
    let yPos = crearEncabezadoFormulario(doc, logoBase64);

    // ════════════════════════════════════════════════════════════════════════
    // INFORMACIÓN DEL PLAN
    // ════════════════════════════════════════════════════════════════════════

    doc.setFillColor(...COLORES_ESAP.azulPrincipal);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL PLAN DE MEJORAMIENTO', pageWidth / 2, yPos + 7, { align: 'center' });
    yPos += 15;

    // Obtener nombre del responsable
    const responsableNombre = typeof plan.responsableArea === 'string' 
      ? plan.responsableArea 
      : plan.responsableArea?.nombre || 'No asignado';

    const infoData = [
      ['CÓDIGO DE AUDITORÍA', plan.auditoriaCodigo || '-'],
      ['NOMBRE DE AUDITORÍA', plan.auditoriaNombre || '-'],
      ['ÁREA RESPONSABLE', plan.areaResponsable || '-'],
      ['RESPONSABLE DEL PLAN', responsableNombre],
      ['FECHA DE CREACIÓN', formatearFecha(plan.fechaCreacion)],
      ['FECHA LÍMITE', formatearFecha(plan.fechaLimite)],
      ['ESTADO', plan.estado || 'FORMULACIÓN'],
      ['TOTAL DE ACCIONES', String(plan.acciones.length)],
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
    // ACCIONES CORRECTIVAS
    // ════════════════════════════════════════════════════════════════════════

    if (plan.acciones.length > 0) {
      // Verificar si necesita nueva página
      if (yPos > 180) {
        doc.addPage();
        yPos = crearEncabezadoFormulario(doc, logoBase64);
      }

      doc.setFillColor(...COLORES_ESAP.verde);
      doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('ACCIONES CORRECTIVAS', pageWidth / 2, yPos + 7, { align: 'center' });
      yPos += 15;

      // Iterar por cada acción
      for (let i = 0; i < plan.acciones.length; i++) {
        const accion = plan.acciones[i];

        // Verificar si necesita nueva página
        if (yPos > 200) {
          doc.addPage();
          yPos = crearEncabezadoFormulario(doc, logoBase64);
        }

        // Título de la acción
        doc.setFillColor(240, 244, 248);
        doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(0, 61, 165);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Acción #${i + 1} - ${accion.hallazgoTitulo}`, margin + 3, yPos + 5.5);
        yPos += 12;

        const accionData = [
          ['DESCRIPCIÓN DE LA ACCIÓN', accion.descripcionAccion || '-'],
          ['CAUSAS RAÍZ', accion.causasRaiz || '-'],
          ['RESPONSABLE', `${accion.responsable || 'No asignado'} - ${accion.cargo || ''}`],
          ['CANTIDAD PROGRAMADA', `${accion.cantidadProgramada || 0} ejecuciones`],
          ['FECHA INICIO', formatearFecha(accion.fechaInicio)],
          ['FECHA FIN', formatearFecha(accion.fechaFin)],
          ['TIEMPO DE EJECUCIÓN', `${accion.tiempoEjecucionMeses || 0} meses`],
          ['ESTADO', accion.estado || 'PENDIENTE'],
        ];

        if (accion.evidenciasSoporte && accion.evidenciasSoporte.length > 0) {
          accionData.push(['EVIDENCIAS SOPORTE', accion.evidenciasSoporte.join(', ')]);
        }

        autoTable(doc, {
          startY: yPos,
          body: accionData,
          theme: 'grid',
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold', fillColor: [240, 244, 248] },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });

        yPos = ((doc as any).lastAutoTable?.finalY ?? yPos) + 8;
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // NOTA DE SEGUIMIENTO
    // ════════════════════════════════════════════════════════════════════════

    if (yPos > 240) {
      doc.addPage();
      yPos = crearEncabezadoFormulario(doc, logoBase64);
    }

    doc.setFillColor(227, 242, 253);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 15, 'F');
    doc.setDrawColor(0, 61, 165);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 15);
    
    doc.setTextColor(0, 61, 165);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA:', margin + 3, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const notaTexto = 'Este plan será sometido a seguimiento trimestral en los meses de Julio, Octubre, Enero y Abril.';
    const notaTexto2 = 'El área responsable deberá cargar evidencias de cumplimiento en cada seguimiento.';
    doc.text(notaTexto, margin + 15, yPos + 5);
    doc.text(notaTexto2, margin + 3, yPos + 11);

    // ════════════════════════════════════════════════════════════════════════
    // PIE DE PÁGINA EN TODAS LAS PÁGINAS
    // ════════════════════════════════════════════════════════════════════════

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(...COLORES_ESAP.azulPrincipal);
      doc.setLineWidth(0.5);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      
      doc.setFontSize(8);
      doc.setTextColor(...COLORES_ESAP.gris);
      doc.setFont('helvetica', 'normal');
      doc.text('Oficina de Control Interno de Gestión - OCIG', margin, pageHeight - 10);
      
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // ════════════════════════════════════════════════════════════════════════
    // GUARDAR Y DESCARGAR
    // ════════════════════════════════════════════════════════════════════════

    const nombreArchivo = `PlanMejoramiento_${plan.auditoriaCodigo}_${Date.now()}.pdf`;
    doc.save(nombreArchivo);

    console.log('✅ PDF de Plan de Mejoramiento generado exitosamente');

    return {
      exito: true,
      nombreArchivo,
      mensaje: 'Plan de Mejoramiento exportado correctamente a PDF'
    };

  } catch (error) {
    console.error('❌ Error al generar PDF de Plan de Mejoramiento:', error);
    return {
      exito: false,
      nombreArchivo: '',
      error: error instanceof Error ? error.message : 'Error desconocido al generar PDF'
    };
  }
}

export default exportarPlanMejoramientoPDF;
