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
    'Fecha de seguimiento',
    'Eval.'
  ]];

  const tableBody: any[] = [];
  let currentActivityId = 0;

  // Recolectar todas las actividades de todos los roles
  [...plan.roles].sort((a, b) => (a.id || 0) - (b.id || 0)).forEach((rol) => {
    (rol.actividades || []).forEach((act) => {
      currentActivityId++;
      
      // Parseo seguro: extraer YYYY-MM-DD y usar T12:00:00 para evitar desfase timezone
      const safeParseDate = (d: string) => {
        const m = String(d).trim().match(/^(\d{4}-\d{2}-\d{2})/);
        return m ? new Date(`${m[1]}T12:00:00`) : new Date(d);
      };
      const fInicio = act.fechaInicio ? safeParseDate(act.fechaInicio).toLocaleDateString('es-CO') : '';
      const fFin = act.fechaFin ? safeParseDate(act.fechaFin).toLocaleDateString('es-CO') : '';
      
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
          // Extraer fecha de seguimiento real de la tarea (no solo fecha límite)
          let fTarea = '-';
          const rawFecha =
            tarea.fechaSeguimiento
            || tarea.fecha_seguimiento
            || tarea.fechaEvaluacion
            || tarea.fecha_evaluacion
            || tarea.fechaCompletado
            || tarea.fechaCompletada
            || tarea.fecha_completada
            || tarea.fechaEntrega
            || tarea.fecha_entrega
            || tarea.fechaLimite
            || tarea.fecha_limite
            || tarea.fechaFin;
          if (rawFecha && rawFecha !== '-') {
            const raw = String(rawFecha).trim();
            // Siempre extraer la porción YYYY-MM-DD y usar T12:00:00
            // para evitar desfase de timezone (UTC-5 Colombia)
            const matchFecha = raw.match(/^(\d{4}-\d{2}-\d{2})/);
            const fechaBase = matchFecha ? matchFecha[1] : raw;
            fTarea = new Date(`${fechaBase}T12:00:00`).toLocaleDateString('es-CO');
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

        // Obtener nombre del responsable: prioridad responsables[] → responsable → 'No asignado'
        const actAny = act as any;
        let nombreResponsable = '';
        let cargoResponsable = '';
        if (Array.isArray(actAny.responsables) && actAny.responsables.length > 0) {
          nombreResponsable = actAny.responsables.map((r: any) => typeof r === 'string' ? r : r.nombre || '').filter(Boolean).join(', ');
          cargoResponsable = actAny.responsables[0]?.cargo || '';
        } else if (actAny.responsable) {
          if (typeof actAny.responsable === 'string') {
            nombreResponsable = actAny.responsable;
          } else {
            nombreResponsable = actAny.responsable?.nombre || '';
            cargoResponsable = actAny.responsable?.cargo || '';
          }
        }
        if (!nombreResponsable && act.responsableNombre) nombreResponsable = act.responsableNombre;
        if (!nombreResponsable) nombreResponsable = 'No asignado';
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