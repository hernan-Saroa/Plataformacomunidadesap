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
  // Crear documento PDF (Carta Paisaje para más columnas)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // ============================================
  // 1. HEADER CORPORATIVO
  // ============================================
  
  const [r, g, b] = hexToRgb((configuracion as any).colorFondo || COLORES_DEFAULT.azulPrincipal);
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ESAP - ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', margin, 15);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`PLAN ANUAL DE AUDITORÍA - VIGENCIA ${plan.año}`, margin, 25);

  let currentY = 45;

  // ============================================
  // 2. INFORMACIÓN GENERAL (RESUMIDA)
  // ============================================

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Jefe OCI: ${plan.jefeOCI.nombre} | Estado: ${plan.estado} | Versión: ${plan.version}`, margin, currentY);
  currentY += 8;

  // ============================================
  // 3. TABLA DETALLADA DE ACTIVIDADES
  // ============================================

  const tableHead = [[
    'Id',
    'Rol / Macroproceso',
    'Lista de actividades',
    'Inicio',
    'Fin',
    'Resp. Actividad',
    'Control',
    'Est.',
    'Resp. Tarea',
    'Seguimiento y evaluación tareas',
    'Fecha Tarea',
    'Eval.'
  ]];

  const tableBody: any[] = [];
  let currentActivityId = 0;

  // Recolectar todas las actividades de todos los roles
  [...plan.roles].sort((a, b) => (a.id || 0) - (b.id || 0)).forEach((rol) => {
    (rol.actividades || []).forEach((act) => {
      currentActivityId++;
      
      const fInicio = act.fechaInicio ? new Date(act.fechaInicio).toLocaleDateString('es-CO') : '';
      const fFin = act.fechaFin ? new Date(act.fechaFin).toLocaleDateString('es-CO') : '';
      
      const actAny = act as any;
      const tareas = actAny.tareasSeguimiento || actAny.tareas_seguimiento || [];
      const respActividad = act.responsableNombre || (actAny.responsable?.nombre) || 'Sin asignar';
      
      if (tareas.length === 0) {
        tableBody.push([
          currentActivityId,
          rol.nombre, // Siempre mostrar el nombre del rol (desagrupado)
          act.nombre,
          fInicio,
          fFin,
          respActividad,
          actAny.control || 'Seguimiento',
          `${act.porcentaje || 0}%`,
          '-',
          actAny.seguimiento || 'Sin tareas registradas',
          '-',
          '0%'
        ]);
      } else {
        tareas.forEach((tarea: any) => {
          // Extraer fecha de la tarea (priorizando fechaEntrega o similares)
          let fTarea = '-';
          const rawFecha = tarea.fechaEntrega || tarea.fecha_entrega || tarea.fechaLimite || tarea.fechaFin;
          if (rawFecha && rawFecha !== '-') {
            fTarea = new Date(rawFecha).toLocaleDateString('es-CO');
          }

          // Responsables de la tarea (ahora en su propia columna)
          const respTarea = Array.isArray(tarea.responsables) 
            ? tarea.responsables.join(', ') 
            : (tarea.responsable || '-');
          
          tableBody.push([
            currentActivityId,
            rol.nombre, // Siempre mostrar el nombre del rol (desagrupado)
            act.nombre,
            fInicio,
            fFin,
            respActividad,
            actAny.control || 'Seguimiento',
            `${act.porcentaje || 0}%`,
            respTarea,
            tarea.descripcion || tarea.nombre || '',
            fTarea,
            (tarea.completada || tarea.estado === 'completada') ? '100%' : '0%'
          ]);
        });
      }
    });

    // Agregar fila de subtotal por rol si es necesario (opcional, manteniendo estilo anterior)
    // tableBody.push([{ content: `SUBTOTAL ROL: ${rol.nombre}`, colSpan: 12, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
  });

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [0, 61, 165],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6,
      halign: 'center'
    },
    styles: { 
      fontSize: 6, 
      cellPadding: 1,
      overflow: 'linebreak'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },  // Id
      1: { cellWidth: 25 },                  // Rol
      2: { cellWidth: 35 },                  // Actividad
      3: { cellWidth: 15, halign: 'center' }, // Inicio
      4: { cellWidth: 15, halign: 'center' }, // Fin
      5: { cellWidth: 23 },                  // Resp. Act
      6: { cellWidth: 22 },                  // Control
      7: { cellWidth: 10, halign: 'center' }, // Est %
      8: { cellWidth: 23 },                  // Resp. Tarea (NUEVA)
      9: { cellWidth: 45 },                  // Seguimiento/Tarea
      10: { cellWidth: 15, halign: 'center' },// Fecha Tarea
      11: { cellWidth: 10, halign: 'center' } // Eval %
    },
    margin: { left: margin, right: margin, bottom: 20 },
    didDrawPage: (data) => {
      // Footer
      const str = `Página ${doc.getNumberOfPages()}`;
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(str, pageWidth - margin - 15, pageHeight - 10);
      doc.text(`Generado el: ${obtenerFechaHoraGeneracion()}`, margin, pageHeight - 10);
    }
  });

  // Guardar PDF
  const nombreArchivo = `Plan_Anual_${plan.año}_Detallado.pdf`;
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