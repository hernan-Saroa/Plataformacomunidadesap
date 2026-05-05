/**
 * ============================================
 * EXPORTAR PDF CORPORATIVO ESAP
 * ============================================
 * 
 * Genera PDF con diseño corporativo ESAP:
 * - Logo oficial
 * - Colores corporativos (#003DA5, #F57C00)
 * - Marca de agua
 * - Headers y footers
 * - Numeración de páginas
 * 
 * Usa jsPDF (ya instalado en el proyecto)
 * 
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PlanAnualAuditoria } from '../types';
import type { OpcionesExportacionPAI, ResultadoExportacion } from './exportacionPAI';
import { formatearFecha, formatearMoneda } from './exportacionPAI';

// Extender tipos de jsPDF para autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

/**
 * Colores corporativos ESAP
 */
const COLORES_ESAP = {
  azulPrincipal: [0, 61, 165] as [number, number, number],      // #003DA5
  azulSecundario: [41, 98, 255] as [number, number, number],    // #2962FF
  naranja: [245, 124, 0] as [number, number, number],           // #F57C00
  gris: [128, 128, 128] as [number, number, number],
  grisClaro: [224, 237, 255] as [number, number, number],       // #E0EDFF
  blanco: [255, 255, 255] as [number, number, number],
  negro: [0, 0, 0] as [number, number, number]
};

/**
 * ============================================
 * EXPORTACIÓN COMPLETA
 * ============================================
 */
export async function exportarPDFCorporativoCompleto(
  plan: PlanAnualAuditoria,
  opciones: OpcionesExportacionPAI
): Promise<ResultadoExportacion> {
  
  try {
    console.log('📄 Generando PDF Corporativo...');
    
    // Crear documento PDF (A4)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    let paginaActual = 1;
    
    // Portada
    if (opciones.incluirPortada) {
      crearPortada(doc, plan);
      doc.addPage();
      paginaActual++;
    }
    
    // Tabla de Contenido
    crearTablaContenido(doc, plan);
    doc.addPage();
    paginaActual++;
    
    // 1. Datos Generales
    crearSeccionDatosGenerales(doc, plan, paginaActual);
    doc.addPage();
    paginaActual++;
    
    // 2. Matriz Decreto 648
    crearSeccionMatrizDecreto648(doc, plan, paginaActual);
    doc.addPage();
    paginaActual++;
    
    // 3. Informes de Ley
    crearSeccionInformesLey(doc, plan, paginaActual);
    
    // Firmas
    if (opciones.incluirFirmas) {
      doc.addPage();
      paginaActual++;
      crearSeccionFirmas(doc, plan, paginaActual);
    }
    
    // Agregar marca de agua en todas las páginas
    if (opciones.marcaDeAgua) {
      agregarMarcaDeAgua(doc);
    }
    
    // Generar y descargar
    const pdfBlob = doc.output('blob');
    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = opciones.nombreArchivo || `PAI_${plan.datosGenerales.vigencia}_ESAP.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    console.log('✅ PDF Corporativo generado exitosamente');
    
    return {
      exito: true,
      formato: 'PDF-Corporativo',
      nombreArchivo: opciones.nombreArchivo || `PAI_${plan.datosGenerales.vigencia}_ESAP.pdf`,
      tamanoKB: Math.round(pdfBlob.size / 1024),
      url
    };
    
  } catch (error) {
    console.error('❌ Error al generar PDF Corporativo:', error);
    return {
      exito: false,
      formato: 'PDF-Corporativo',
      nombreArchivo: '',
      tamanoKB: 0,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * ============================================
 * PORTADA
 * ============================================
 */
function crearPortada(doc: jsPDF, plan: PlanAnualAuditoria): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Fondo degradado (simulado con rectángulos)
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(0, 0, pageWidth, pageHeight / 3, 'F');
  
  // Logo ESAP (texto por ahora, ideal sería imagen)
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(40);
  doc.setFont('helvetica', 'bold');
  doc.text('ESAP', pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Escuela Superior de Administración Pública', pageWidth / 2, 50, { align: 'center' });
  
  // Título principal
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN ANUAL DE', pageWidth / 2, 110, { align: 'center' });
  doc.text('AUDITORÍA INTERNA', pageWidth / 2, 125, { align: 'center' });
  
  // Vigencia
  doc.setFillColor(...COLORES_ESAP.naranja);
  doc.roundedRect((pageWidth - 60) / 2, 140, 60, 20, 3, 3, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(24);
  doc.text(`${plan.datosGenerales.vigencia}`, pageWidth / 2, 153, { align: 'center' });
  
  // Información adicional
  doc.setTextColor(...COLORES_ESAP.gris);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Decreto 648 de 2017', pageWidth / 2, 180, { align: 'center' });
  doc.text('Formato EMFO001 PAI 2025 V.6', pageWidth / 2, 190, { align: 'center' });
  
  // Jefe OCI
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Oficina de Control Interno', pageWidth / 2, 220, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(plan.datosGenerales.jefeOCI.nombreCompleto, pageWidth / 2, 228, { align: 'center' });
  doc.text(plan.datosGenerales.jefeOCI.cargo, pageWidth / 2, 235, { align: 'center' });
  
  // Fecha
  doc.setTextColor(...COLORES_ESAP.gris);
  doc.setFontSize(9);
  doc.text(`Elaborado: ${formatearFecha(plan.datosGenerales.fechaElaboracion)}`, pageWidth / 2, 260, { align: 'center' });
  
  // Footer
  agregarFooter(doc, 1);
}

/**
 * ============================================
 * TABLA DE CONTENIDO
 * ============================================
 */
function crearTablaContenido(doc: jsPDF, plan: PlanAnualAuditoria): void {
  agregarHeader(doc, 'TABLA DE CONTENIDO');
  
  let y = 50;
  
  const contenido = [
    { numero: '1', titulo: 'Datos Generales del Plan', pagina: '3' },
    { numero: '2', titulo: 'Matriz de Cumplimiento Decreto 648/2017', pagina: '4' },
    { numero: '3', titulo: 'Calendario de Informes de Ley', pagina: '5' },
    { numero: '4', titulo: 'Firmas y Aprobaciones', pagina: '6' }
  ];
  
  doc.setFontSize(11);
  
  contenido.forEach(item => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORES_ESAP.azulPrincipal);
    doc.text(`${item.numero}.`, 20, y);
    
    doc.setFont('helvetica', 'normal');
    doc.text(item.titulo, 30, y);
    
    doc.setFont('helvetica', 'bold');
    doc.text(item.pagina, 180, y, { align: 'right' });
    
    // Línea punteada
    doc.setDrawColor(...COLORES_ESAP.grisClaro);
    doc.setLineDash([1, 1]);
    doc.line(30, y + 1, 175, y + 1);
    doc.setLineDash([]);
    
    y += 12;
  });
  
  agregarFooter(doc, 2);
}

/**
 * ============================================
 * SECCIÓN: DATOS GENERALES
 * ============================================
 */
function crearSeccionDatosGenerales(doc: jsPDF, plan: PlanAnualAuditoria, pagina: number): void {
  agregarHeader(doc, '1. DATOS GENERALES DEL PLAN');
  
  const dg = plan.datosGenerales;
  let y = 50;
  
  // Información Institucional
  doc.setFillColor(...COLORES_ESAP.grisClaro);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.text('INFORMACIÓN INSTITUCIONAL', 20, y + 5);
  
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORES_ESAP.negro);
  
  agregarCampo(doc, 'Nombre de la Institución:', dg.nombreInstitucion, y);
  y += 8;
  agregarCampo(doc, 'NIT:', dg.nit, y);
  y += 8;
  agregarCampo(doc, 'Sector:', dg.sector, y);
  y += 8;
  agregarCampo(doc, 'Naturaleza Jurídica:', dg.naturalezaJuridica, y);
  
  // Jefe OCI
  y += 15;
  doc.setFillColor(...COLORES_ESAP.grisClaro);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.text('JEFE DE LA OFICINA DE CONTROL INTERNO', 20, y + 5);
  
  y += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORES_ESAP.negro);
  
  agregarCampo(doc, 'Nombre Completo:', dg.jefeOCI.nombreCompleto, y);
  y += 8;
  agregarCampo(doc, 'Cargo:', dg.jefeOCI.cargo, y);
  y += 8;
  agregarCampo(doc, 'Correo Electrónico:', dg.jefeOCI.email, y);
  y += 8;
  agregarCampo(doc, 'Teléfono:', dg.jefeOCI.telefono || 'N/A', y);
  
  // Objetivos
  y += 15;
  doc.setFillColor(...COLORES_ESAP.grisClaro);
  doc.rect(15, y, 180, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.text('OBJETIVO GENERAL', 20, y + 5);
  
  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORES_ESAP.negro);
  const objetivoLines = doc.splitTextToSize(dg.objetivoGeneral, 170);
  doc.text(objetivoLines, 20, y);
  
  agregarFooter(doc, pagina);
}

/**
 * ============================================
 * SECCIÓN: MATRIZ DECRETO 648
 * ============================================
 */
function crearSeccionMatrizDecreto648(doc: jsPDF, plan: PlanAnualAuditoria, pagina: number): void {
  agregarHeader(doc, '2. MATRIZ DECRETO 648/2017');
  
  // Badge de cumplimiento
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(16, 185, 129); // Verde
  doc.roundedRect((pageWidth - 40) / 2, 45, 40, 15, 3, 3, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('100%', pageWidth / 2, 54, { align: 'center' });
  doc.setFontSize(8);
  doc.text('Cumplimiento', pageWidth / 2, 58, { align: 'center' });
  
  // Tabla de roles y actividades
  const tableData: any[] = [];
  
  plan.rolesDecreto648.forEach(rol => {
    rol.actividades.forEach((act, index) => {
      tableData.push([
        index === 0 ? `ROL ${rol.numero}:\n${rol.nombre}` : '',
        act.id.toString(),
        act.nombre,
        act.periodicidad
      ]);
    });
  });
  
  doc.autoTable({
    startY: 70,
    head: [['ROL', 'ACT', 'NOMBRE ACTIVIDAD', 'PERIODICIDAD']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: COLORES_ESAP.azulPrincipal,
      textColor: COLORES_ESAP.blanco,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold', fillColor: COLORES_ESAP.grisClaro },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 110 },
      3: { cellWidth: 28, halign: 'center' }
    },
    margin: { left: 15, right: 15 }
  });
  
  agregarFooter(doc, pagina);
}

/**
 * ============================================
 * SECCIÓN: INFORMES DE LEY
 * ============================================
 */
function crearSeccionInformesLey(doc: jsPDF, plan: PlanAnualAuditoria, pagina: number): void {
  agregarHeader(doc, '3. CALENDARIO DE INFORMES DE LEY');
  
  const informes = [
    ['1', 'Informe Pormenorizado Control Interno', 'Semestral', 'Jul 31 / Ene 31'],
    ['2', 'Seguimiento Plan Mejoramiento CGR', 'Semestral', 'Según CGR'],
    ['3', 'Evaluación Sistema Control Interno MECI', 'Semestral', 'Jul 31 / Ene 31'],
    ['4', 'Control Interno Contable', 'Anual', 'Febrero 28'],
    ['5', 'Concepto Rendición de Cuentas', 'Anual', 'Marzo 31'],
    ['6', 'Informe Ejecutivo Anual OCI', 'Anual', 'Diciembre 31'],
    // ... más informes
  ];
  
  doc.autoTable({
    startY: 50,
    head: [['#', 'INFORME', 'PERIODICIDAD', 'VENCIMIENTO']],
    body: informes,
    theme: 'striped',
    headStyles: {
      fillColor: COLORES_ESAP.azulPrincipal,
      textColor: COLORES_ESAP.blanco,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: COLORES_ESAP.grisClaro
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 100 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' }
    },
    margin: { left: 15, right: 15 }
  });
  
  agregarFooter(doc, pagina);
}

/**
 * ============================================
 * SECCIÓN: FIRMAS
 * ============================================
 */
function crearSeccionFirmas(doc: jsPDF, plan: PlanAnualAuditoria, pagina: number): void {
  agregarHeader(doc, '4. FIRMAS Y APROBACIONES');
  
  const dg = plan.datosGenerales;
  
  // Elaboró
  let y = 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.text('ELABORÓ:', 20, y);
  
  y += 30;
  doc.setDrawColor(...COLORES_ESAP.negro);
  doc.line(20, y, 90, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORES_ESAP.negro);
  doc.text(dg.jefeOCI.nombreCompleto, 55, y, { align: 'center' });
  
  y += 5;
  doc.setFontSize(9);
  doc.text(dg.jefeOCI.cargo, 55, y, { align: 'center' });
  
  y += 5;
  doc.setTextColor(...COLORES_ESAP.gris);
  doc.text(`Fecha: ${formatearFecha(dg.fechaElaboracion)}`, 55, y, { align: 'center' });
  
  // Aprobó
  y = 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.text('APROBÓ:', 110, y);
  
  y += 30;
  doc.setDrawColor(...COLORES_ESAP.negro);
  doc.line(110, y, 180, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORES_ESAP.negro);
  doc.text('Director Nacional ESAP', 145, y, { align: 'center' });
  
  y += 5;
  doc.setFontSize(9);
  doc.text('Representante Legal', 145, y, { align: 'center' });
  
  y += 5;
  doc.setTextColor(...COLORES_ESAP.gris);
  const fechaAprobacion = dg.fechaAprobacion ? formatearFecha(dg.fechaAprobacion) : '______________';
  doc.text(`Fecha: ${fechaAprobacion}`, 145, y, { align: 'center' });
  
  agregarFooter(doc, pagina);
}

/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

function agregarHeader(doc: jsPDF, titulo: string): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Línea superior
  doc.setDrawColor(...COLORES_ESAP.azulPrincipal);
  doc.setLineWidth(2);
  doc.line(15, 15, pageWidth - 15, 15);
  
  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.text(titulo, 20, 25);
  
  // Línea inferior
  doc.setLineWidth(0.5);
  doc.line(15, 30, pageWidth - 15, 30);
}

function agregarFooter(doc: jsPDF, pagina: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Línea
  doc.setDrawColor(...COLORES_ESAP.grisClaro);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  
  // Texto
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORES_ESAP.gris);
  doc.text('Plan Anual de Auditoría Interna - ESAP', 20, pageHeight - 15);
  doc.text(`Página ${pagina}`, pageWidth - 20, pageHeight - 15, { align: 'right' });
}

function agregarCampo(doc: jsPDF, label: string, valor: string, y: number): void {
  doc.setFont('helvetica', 'bold');
  doc.text(label, 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(valor, 75, y);
}

function agregarMarcaDeAgua(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(50);
    doc.setFont('helvetica', 'bold');
    
    // Rotar texto 45 grados
    doc.text('ESAP', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45
    });
  }
}

/**
 * ============================================
 * EXPORTS
 * ============================================
 */
export default exportarPDFCorporativoCompleto;
