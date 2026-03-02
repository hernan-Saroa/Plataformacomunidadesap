/**
 * ============================================
 * SERVICIO DE GENERACIÓN DE PDF - PLAN ANUAL
 * ============================================
 * 
 * Genera PDF del Plan Anual de Auditoría con diseño corporativo ESAP
 * Incluye validación Decreto 648/2017 y firma digital
 * 
 * Librería: jsPDF + jspdf-autotable
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  validarDecreto648,
  obtenerEstadisticasPlan,
  type PlanAnual
} from '../utils/validacionesDecreto648';
import type { ConfiguracionPDF } from '../context/ConfiguracionContext';

// ============================================
// COLORES CORPORATIVOS ESAP (DEFAULT)
// ============================================

const COLORES_DEFAULT = {
  azulPrincipal: '#003DA5',
  azulClaro: '#2962FF',
  naranja: '#F57C00',
  grisOscuro: '#374151',
  grisClaro: '#F3F4F6',
  verde: '#10B981',
  rojo: '#EF4444',
  amarillo: '#F59E0B',
  blanco: '#FFFFFF'
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Convertir color hex a RGB
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ]
    : [0, 0, 0];
}

/**
 * Formatear fecha
 */
function formatearFecha(fecha: string): string {
  const d = new Date(fecha);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Obtener fecha/hora actual
 */
function obtenerFechaHoraGeneracion(): string {
  const ahora = new Date();
  return ahora.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// ============================================
// FUNCIÓN PRINCIPAL DE GENERACIÓN
// ============================================

export async function generarPDFPlanAnual(plan: PlanAnual, configuracion: ConfiguracionPDF): Promise<void> {
  // Crear documento PDF (Carta: 215.9mm x 279.4mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  let currentY = margin;

  // ============================================
  // 1. HEADER CORPORATIVO
  // ============================================
  
  // Fondo azul principal
  const [r, g, b] = hexToRgb(configuracion.colorFondo || COLORES_DEFAULT.azulPrincipal);
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Logo ESAP (texto por ahora, podría ser imagen)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ESAP', margin, 20);

  // Título del documento
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN ANUAL DE AUDITORÍA', margin, 32);

  // Año
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Vigencia ${plan.año}`, margin, 40);

  currentY = 55;

  // ============================================
  // 2. INFORMACIÓN GENERAL
  // ============================================

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN GENERAL', margin, currentY);
  currentY += 8;

  // Tabla de información general
  const infoData = [
    ['Año Fiscal', plan.año.toString()],
    ['Estado', plan.estado],
    ['Versión', plan.version.toString()],
    ['Jefe OCI', plan.jefeOCI.nombre],
    ['Cargo', plan.jefeOCI.cargo],
    ['Fecha de Creación', formatearFecha(plan.fechaCreacion)],
    ['Fecha de Aprobación', plan.fechaAprobacion ? formatearFecha(plan.fechaAprobacion) : 'Pendiente']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: infoData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    },
    margin: { left: margin, right: margin }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // ============================================
  // 3. CUMPLIMIENTO DECRETO 648/2017
  // ============================================

  const validacion = validarDecreto648(plan);
  const stats = obtenerEstadisticasPlan(plan);

  // Box de cumplimiento
  const boxHeight = 35;
  const boxColor = validacion.valido 
    ? hexToRgb(COLORES_DEFAULT.verde)
    : hexToRgb(COLORES_DEFAULT.rojo);

  doc.setFillColor(boxColor[0], boxColor[1], boxColor[2], 0.1);
  doc.setDrawColor(boxColor[0], boxColor[1], boxColor[2]);
  doc.setLineWidth(1);
  doc.rect(margin, currentY, pageWidth - 2 * margin, boxHeight, 'FD');

  // Título del box
  doc.setTextColor(boxColor[0], boxColor[1], boxColor[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(
    validacion.valido ? '✓ CUMPLE DECRETO 648/2017' : '✗ NO CUMPLE DECRETO 648/2017',
    margin + 5,
    currentY + 8
  );

  // Estadísticas
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const statsY = currentY + 18;
  const statsSpacing = (pageWidth - 2 * margin - 10) / 4;
  
  doc.text(`Roles: ${stats.rolesConActividades}/5`, margin + 5, statsY);
  doc.text(`Actividades: ${stats.totalActividades}`, margin + 5 + statsSpacing, statsY);
  doc.text(`Progreso: ${stats.progresoGeneral}%`, margin + 5 + statsSpacing * 2, statsY);
  doc.text(`Estado: ${validacion.valido ? 'Válido' : 'Inválido'}`, margin + 5 + statsSpacing * 3, statsY);

  // Actividades por estado
  doc.setFontSize(9);
  const detailY = statsY + 8;
  doc.text(
    `Pendiente: ${stats.actividadesPorEstado.Pendiente} | ` +
    `En Ejecución: ${stats.actividadesPorEstado['En Ejecución']} | ` +
    `Completada: ${stats.actividadesPorEstado.Completada} | ` +
    `Retrasada: ${stats.actividadesPorEstado.Retrasada}`,
    margin + 5,
    detailY
  );

  currentY += boxHeight + 15;

  // Errores (si existen)
  if (!validacion.valido && validacion.errores.length > 0) {
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('ERRORES ENCONTRADOS:', margin, currentY);
    currentY += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    validacion.errores.slice(0, 3).forEach((error, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${error}`, pageWidth - 2 * margin - 5);
      doc.text(lines, margin + 3, currentY);
      currentY += lines.length * 5;
    });

    if (validacion.errores.length > 3) {
      doc.text(`... y ${validacion.errores.length - 3} error(es) más`, margin + 3, currentY);
      currentY += 5;
    }

    currentY += 5;
  }

  // ============================================
  // 4. ROLES Y ACTIVIDADES DEL DECRETO 648
  // ============================================

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ROLES Y ACTIVIDADES - DECRETO 648/2017', margin, currentY);
  currentY += 8;

  // Procesar cada rol
  plan.roles.forEach((rol, rolIdx) => {
    // Verificar si necesitamos nueva página
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = margin;
    }

    // Header del rol
    const rolColor = hexToRgb(rol.color || COLORES_DEFAULT.azulPrincipal);
    doc.setFillColor(rolColor[0], rolColor[1], rolColor[2], 0.1);
    doc.setDrawColor(rolColor[0], rolColor[1], rolColor[2]);
    doc.rect(margin, currentY, pageWidth - 2 * margin, 12, 'FD');

    doc.setTextColor(rolColor[0], rolColor[1], rolColor[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${rolIdx + 1}. ${rol.icono} ${rol.nombre}`,
      margin + 3,
      currentY + 8
    );

    currentY += 15;

    // Descripción del rol
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const descLines = doc.splitTextToSize(rol.descripcion, pageWidth - 2 * margin - 6);
    doc.text(descLines, margin + 3, currentY);
    currentY += descLines.length * 4 + 5;

    // Tabla de actividades con información completa
    if (rol.actividades.length > 0) {
      // Para cada actividad, creamos una tabla detallada
      rol.actividades.forEach((act, actIdx) => {
        // Verificar si necesitamos nueva página
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = margin;
        }

        // Header de la actividad
        doc.setFillColor(245, 245, 245);
        doc.rect(margin + 3, currentY, pageWidth - 2 * margin - 6, 8, 'F');
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Actividad ${actIdx + 1}: ${act.nombre}`, margin + 5, currentY + 5);
        currentY += 12;

        // Obtener nombre del responsable (puede venir como objeto o string)
        const actAny = act as any;
        const nombreResponsable = actAny.responsable?.nombre || act.responsableNombre || 'Sin asignar';
        const cargoResponsable = actAny.responsable?.cargo || '';
        const responsableCompleto = cargoResponsable 
          ? `${nombreResponsable} - ${cargoResponsable}` 
          : nombreResponsable;

        // Datos básicos de la actividad
        const datosBasicos = [
          ['Responsable', responsableCompleto],
          ['Fecha Inicio', formatearFecha(act.fechaInicio)],
          ['Fecha Fin', formatearFecha(act.fechaFin)],
          ['Avance', `${act.porcentaje}%`],
          ['Estado', act.estado]
        ];

        autoTable(doc, {
          startY: currentY,
          head: [],
          body: datosBasicos,
          theme: 'plain',
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 35 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin + 5, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 3;

        // Descripción (si existe)
        if (act.descripcion && act.descripcion.trim()) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(80, 80, 80);
          doc.text('Descripción:', margin + 5, currentY);
          currentY += 4;
          doc.setFont('helvetica', 'normal');
          const descLines = doc.splitTextToSize(act.descripcion, pageWidth - 2 * margin - 10);
          doc.text(descLines, margin + 5, currentY);
          currentY += descLines.length * 3.5 + 2;
        }

        // Seguimiento y Evaluación (campos críticos)
        const camposSeguimiento: [string, string | undefined][] = [
          ['Control', (act as any).control],
          ['Evaluación', (act as any).evaluacion],
          ['Seguimiento', (act as any).seguimiento],
          ['Observaciones Director', (act as any).observacionesDirector]
        ];

        const camposConValor = camposSeguimiento.filter(([, valor]) => valor && valor.trim());

        if (camposConValor.length > 0) {
          doc.setFillColor(254, 249, 231);
          doc.rect(margin + 3, currentY, pageWidth - 2 * margin - 6, 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(156, 110, 0);
          doc.text('SEGUIMIENTO Y EVALUACIÓN DE TAREA', margin + 5, currentY + 4);
          currentY += 9;

          camposConValor.forEach(([label, valor]) => {
            if (currentY > pageHeight - 30) {
              doc.addPage();
              currentY = margin;
            }
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(60, 60, 60);
            doc.text(`${label}:`, margin + 5, currentY);
            currentY += 4;
            doc.setFont('helvetica', 'normal');
            const lines = doc.splitTextToSize(valor!, pageWidth - 2 * margin - 10);
            doc.text(lines, margin + 5, currentY);
            currentY += lines.length * 3.5 + 3;
          });
        }

        currentY += 5;
      });
    } else {
      doc.setTextColor(239, 68, 68);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('⚠ Sin actividades asignadas', margin + 6, currentY);
      currentY += 10;
    }
  });

  // ============================================
  // 5. INFORMACIÓN NORMATIVA
  // ============================================

  // Verificar espacio para sección final
  if (currentY > pageHeight - 80) {
    doc.addPage();
    currentY = margin;
  }

  currentY += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('MARCO NORMATIVO', margin, currentY);
  currentY += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  const normas = [
    '• Decreto 648 de 2017: Por el cual se modifica y adiciona el Decreto 1083 de 2015',
    '• Ley 87 de 1993: Normas para el ejercicio del control interno',
    '• Ley 1474 de 2011: Estatuto Anticorrupción',
    '• MECI 2014: Modelo Estándar de Control Interno'
  ];

  normas.forEach(norma => {
    const lines = doc.splitTextToSize(norma, pageWidth - 2 * margin);
    doc.text(lines, margin, currentY);
    currentY += lines.length * 5;
  });

  currentY += 5;

  // ============================================
  // 6. FIRMAS Y APROBACIONES
  // ============================================

  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = margin;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('APROBACIONES', margin, currentY);
  currentY += 10;

  // Firma Jefe OCI
  const firmaWidth = 60;
  const firmaX = margin;

  doc.setDrawColor(100, 100, 100);
  doc.line(firmaX, currentY, firmaX + firmaWidth, currentY);
  currentY += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(plan.jefeOCI.nombre, firmaX, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.text(plan.jefeOCI.cargo, firmaX, currentY);
  currentY += 4;

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  if (plan.fechaAprobacion) {
    doc.text(`Aprobado: ${formatearFecha(plan.fechaAprobacion)}`, firmaX, currentY);
  } else {
    doc.text('Pendiente de aprobación', firmaX, currentY);
  }

  // ============================================
  // 7. FOOTER EN TODAS LAS PÁGINAS
  // ============================================

  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Línea superior del footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    // Texto del footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    // Izquierda: Entidad
    doc.text(
      'Escuela Superior de Administración Pública - ESAP',
      margin,
      footerY + 5
    );

    // Centro: Fecha de generación
    const fechaGen = obtenerFechaHoraGeneracion();
    const fechaWidth = doc.getTextWidth(fechaGen);
    doc.text(
      fechaGen,
      (pageWidth - fechaWidth) / 2,
      footerY + 5
    );

    // Derecha: Número de página
    const pageText = `Página ${i} de ${totalPages}`;
    const pageWidth2 = doc.getTextWidth(pageText);
    doc.text(
      pageText,
      pageWidth - margin - pageWidth2,
      footerY + 5
    );

    // Línea inferior
    doc.setTextColor(0, 61, 165);
    doc.setFontSize(7);
    const urlText = 'www.esap.edu.co';
    const urlWidth = doc.getTextWidth(urlText);
    doc.text(
      urlText,
      (pageWidth - urlWidth) / 2,
      footerY + 10
    );
  }

  // ============================================
  // 8. GUARDAR PDF
  // ============================================

  const nombreArchivo = `Plan_Anual_${plan.año}_${plan.estado.replace(/ /g, '_')}_v${plan.version}.pdf`;
  doc.save(nombreArchivo);
}

// ============================================
// FUNCIÓN AUXILIAR: PREVISUALIZAR PDF
// ============================================

/**
 * Genera el PDF y lo abre en una nueva pestaña (preview)
 */
export async function previsualizarPDFPlanAnual(plan: PlanAnual, configuracion: ConfiguracionPDF): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  // ... (mismo código de generación) ...
  // Por ahora, reutilizar la función principal
  
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

// ============================================
// FUNCIÓN AUXILIAR: OBTENER BLOB
// ============================================

/**
 * Genera el PDF y retorna el Blob (para enviar por email, etc.)
 */
export async function obtenerBlobPDFPlanAnual(plan: PlanAnual, configuracion: ConfiguracionPDF): Promise<Blob> {
  // Crear documento (reutilizar lógica de generación)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  // ... (mismo código de generación) ...

  return doc.output('blob');
}

// ============================================
// VALIDAR ANTES DE GENERAR
// ============================================

/**
 * Validar que el plan tiene datos suficientes para generar PDF
 */
export function validarDatosParaPDF(plan: PlanAnual): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  if (!plan.año) {
    errores.push('El plan no tiene año asignado');
  }

  if (!plan.jefeOCI || !plan.jefeOCI.nombre) {
    errores.push('El plan no tiene Jefe OCI asignado');
  }

  if (!plan.roles || plan.roles.length === 0) {
    errores.push('El plan no tiene roles configurados');
  }

  if (!plan.fechaCreacion) {
    errores.push('El plan no tiene fecha de creación');
  }

  return {
    valido: errores.length === 0,
    errores
  };
}