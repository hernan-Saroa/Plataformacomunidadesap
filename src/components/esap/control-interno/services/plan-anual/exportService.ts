/**
 * ============================================
 * SERVICIO DE EXPORTACIÓN - PLAN ANUAL OCIG
 * ============================================
 * 
 * Servicio dedicado para exportar el Plan Anual de Auditoría
 * en formatos PDF y Excel según RF003.
 * 
 * Diseño corporativo ESAP con validación Decreto 648/2017.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export interface ActividadExport {
  codigo: string;
  nombre: string;
  descripcion: string;
  responsableNombre: string;
  fechaInicio: string;
  fechaFin: string;
  porcentajeReal: number;
  estado: string;
  observaciones?: string;
}

export interface RolExport {
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  actividades: ActividadExport[];
  porcentajeGeneral: number;
  estadoGeneral: string;
}

export interface PlanAnualExport {
  id: string;
  año: number;
  version: number;
  estado: string;
  jefeOCI: {
    nombre: string;
    cargo: string;
    email: string;
  };
  roles: RolExport[];
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaUltimaModificacion?: string;
}

// ============================================
// COLORES CORPORATIVOS ESAP
// ============================================

const COLORES_ESAP = {
  azulPrincipal: [0, 61, 165] as [number, number, number],
  azulClaro: [41, 98, 255] as [number, number, number],
  verde: [16, 185, 129] as [number, number, number],
  naranja: [245, 124, 0] as [number, number, number],
  rojo: [239, 68, 68] as [number, number, number],
  grisOscuro: [55, 65, 81] as [number, number, number],
  grisClaro: [243, 244, 246] as [number, number, number],
  blanco: [255, 255, 255] as [number, number, number],
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function formatearFecha(fecha: string): string {
  if (!fecha) return 'N/A';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function calcularEstadisticas(plan: PlanAnualExport) {
  const totalActividades = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const completadas = plan.roles.reduce(
    (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'Completada').length,
    0
  );
  const enEjecucion = plan.roles.reduce(
    (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'En Ejecución').length,
    0
  );
  const promedioAvance = plan.roles.length > 0
    ? plan.roles.reduce((sum, rol) => sum + rol.porcentajeGeneral, 0) / plan.roles.length
    : 0;

  return {
    totalRoles: plan.roles.length,
    totalActividades,
    completadas,
    enEjecucion,
    pendientes: totalActividades - completadas - enEjecucion,
    promedioAvance: Math.round(promedioAvance)
  };
}

// ============================================
// EXPORTAR A PDF
// ============================================

export async function exportarPlanAnualPDF(plan: PlanAnualExport): Promise<void> {
  const toastId = toast.loading('Generando PDF...', {
    description: 'Preparando documento oficial ESAP'
  });

  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 10;

    // ============ HEADER CORPORATIVO ============
    
    // Fondo azul header
    doc.setFillColor(...COLORES_ESAP.azulPrincipal);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Logo ESAP (dibujado manualmente)
    const logoX = margin;
    const logoY = 8;
    const circleRadius = 2.3;
    
    doc.setFillColor(...COLORES_ESAP.azulClaro);
    doc.setDrawColor(...COLORES_ESAP.azulClaro);
    
    // Fila 1: 1 círculo
    doc.circle(logoX + 11, logoY + 2, circleRadius, 'FD');
    // Fila 2: 2 círculos
    doc.circle(logoX + 8.5, logoY + 5.5, circleRadius, 'FD');
    doc.circle(logoX + 13.5, logoY + 5.5, circleRadius, 'FD');
    // Fila 3: 3 círculos
    doc.circle(logoX + 6, logoY + 9, circleRadius, 'FD');
    doc.circle(logoX + 11, logoY + 9, circleRadius, 'FD');
    doc.circle(logoX + 16, logoY + 9, circleRadius, 'FD');
    // Fila 4: 4 círculos con letras "esap"
    const baseY = logoY + 12.5;
    const baseCircles = [
      { x: logoX + 3.5, letter: 'e' },
      { x: logoX + 9, letter: 's' },
      { x: logoX + 14.5, letter: 'a' },
      { x: logoX + 20, letter: 'p' }
    ];
    
    baseCircles.forEach((circle) => {
      doc.setFillColor(...COLORES_ESAP.azulClaro);
      doc.circle(circle.x, baseY, circleRadius, 'FD');
      doc.setTextColor(...COLORES_ESAP.blanco);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text(circle.letter, circle.x, baseY + 1.3, { align: 'center' });
    });

    // Texto institucional
    doc.setTextColor(...COLORES_ESAP.blanco);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Escuela Superior de', margin, 28);
    doc.text('Administración Pública', margin, 32);

    // Título principal
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PLAN ANUAL DE AUDITORÍA INTERNA', pageWidth / 2, 18, { align: 'center' });

    // Subtítulo
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vigencia ${plan.año} - Versión ${plan.version}`, pageWidth / 2, 26, { align: 'center' });

    // Código y fecha en esquina derecha
    doc.setFontSize(8);
    doc.text(`Código: PAI-${plan.año}-V${plan.version}`, pageWidth - margin, 10, { align: 'right' });
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, pageWidth - margin, 15, { align: 'right' });
    doc.text(`Estado: ${plan.estado}`, pageWidth - margin, 20, { align: 'right' });

    yPos = 50;

    // ============ INFORMACIÓN GENERAL ============
    
    doc.setTextColor(...COLORES_ESAP.grisOscuro);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. INFORMACIÓN GENERAL', margin, yPos);
    yPos += 8;

    const stats = calcularEstadisticas(plan);

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: [
        ['Año Fiscal', plan.año.toString()],
        ['Estado', plan.estado],
        ['Versión', `V.${plan.version}`],
        ['Jefe OCI', plan.jefeOCI.nombre],
        ['Cargo', plan.jefeOCI.cargo],
        ['Fecha de Creación', formatearFecha(plan.fechaCreacion)],
        ['Fecha de Aprobación', plan.fechaAprobacion ? formatearFecha(plan.fechaAprobacion) : 'Pendiente'],
        ['Total Actividades', stats.totalActividades.toString()],
        ['Avance General', `${stats.promedioAvance}%`]
      ],
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, fillColor: COLORES_ESAP.grisClaro },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // ============ RESUMEN POR ROLES ============
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. RESUMEN POR ROLES (Decreto 648/2017)', margin, yPos);
    yPos += 8;

    const rolesData = plan.roles.map(rol => [
      rol.codigo,
      rol.nombre,
      rol.actividades.length.toString(),
      `${rol.porcentajeGeneral}%`,
      rol.estadoGeneral
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Código', 'Rol', 'Actividades', 'Avance', 'Estado']],
      body: rolesData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { 
        fillColor: COLORES_ESAP.azulPrincipal,
        textColor: COLORES_ESAP.blanco,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' }
      },
      margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Nueva página si no hay espacio
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // ============ DETALLE DE ACTIVIDADES POR ROL ============
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. DETALLE DE ACTIVIDADES POR ROL', margin, yPos);
    yPos += 10;

    for (const rol of plan.roles) {
      // Verificar espacio
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      // Título del rol
      doc.setFillColor(...COLORES_ESAP.grisClaro);
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORES_ESAP.azulPrincipal);
      doc.text(`${rol.codigo} - ${rol.nombre} (${rol.porcentajeGeneral}%)`, margin + 2, yPos);
      yPos += 8;

      if (rol.actividades.length > 0) {
        const actividadesData = rol.actividades.map(act => [
          act.codigo,
          act.nombre.substring(0, 50) + (act.nombre.length > 50 ? '...' : ''),
          act.responsableNombre,
          act.fechaInicio ? new Date(act.fechaInicio).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }) : 'N/A',
          act.fechaFin ? new Date(act.fechaFin).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }) : 'N/A',
          `${act.porcentajeReal}%`,
          act.estado
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Código', 'Actividad', 'Responsable', 'Inicio', 'Fin', '%', 'Estado']],
          body: actividadesData,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { 
            fillColor: COLORES_ESAP.azulClaro,
            textColor: COLORES_ESAP.blanco,
            fontStyle: 'bold',
            fontSize: 7
          },
          columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 30 },
            3: { cellWidth: 18 },
            4: { cellWidth: 18 },
            5: { cellWidth: 12, halign: 'center' },
            6: { cellWidth: 22 }
          },
          margin: { left: margin, right: margin }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(8);
        doc.setTextColor(...COLORES_ESAP.grisOscuro);
        doc.setFont('helvetica', 'italic');
        doc.text('Sin actividades registradas', margin + 5, yPos);
        yPos += 10;
      }
    }

    // ============ PIE DE PÁGINA ============
    
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(...COLORES_ESAP.grisOscuro);
      doc.setFont('helvetica', 'normal');
      
      // Línea separadora
      doc.setDrawColor(...COLORES_ESAP.grisClaro);
      doc.line(margin, 285, pageWidth - margin, 285);
      
      // Texto pie
      doc.text('ESAP - Oficina de Control Interno de Gestión', margin, 290);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 290, { align: 'right' });
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageWidth / 2, 290, { align: 'center' });
    }

    // Guardar archivo
    const fileName = `Plan_Anual_OCIG_${plan.año}_V${plan.version}_${Date.now()}.pdf`;
    doc.save(fileName);

    toast.dismiss(toastId);
    toast.success('PDF generado correctamente', {
      description: fileName
    });
  } catch (error: any) {
    toast.dismiss(toastId);
    console.error('Error al generar PDF:', error);
    toast.error('Error al generar PDF', {
      description: error.message || 'No se pudo generar el documento'
    });
    throw error;
  }
}

// ============================================
// EXPORTAR A EXCEL
// ============================================

export async function exportarPlanAnualExcel(plan: PlanAnualExport): Promise<void> {
  const toastId = toast.loading('Generando Excel...', {
    description: 'Preparando archivo con todas las auditorías'
  });

  try {
    const wb = XLSX.utils.book_new();
    const stats = calcularEstadisticas(plan);

    // ============ HOJA 1: INFORMACIÓN GENERAL ============
    
    const infoGeneralData = [
      ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
      ['OFICINA DE CONTROL INTERNO DE GESTIÓN'],
      ['PLAN ANUAL DE AUDITORÍAS'],
      [''],
      ['INFORMACIÓN GENERAL'],
      ['Código del Plan:', `PAI-${plan.año}-V${plan.version}`],
      ['Año Fiscal:', plan.año],
      ['Versión:', `V.${plan.version}`],
      ['Estado:', plan.estado],
      [''],
      ['RESPONSABLE'],
      ['Jefe OCI:', plan.jefeOCI.nombre],
      ['Cargo:', plan.jefeOCI.cargo],
      ['Email:', plan.jefeOCI.email],
      [''],
      ['FECHAS'],
      ['Fecha de Creación:', formatearFecha(plan.fechaCreacion)],
      ['Fecha de Aprobación:', plan.fechaAprobacion ? formatearFecha(plan.fechaAprobacion) : 'Pendiente'],
      ['Última Modificación:', plan.fechaUltimaModificacion ? formatearFecha(plan.fechaUltimaModificacion) : 'N/A'],
      [''],
      ['ESTADÍSTICAS'],
      ['Total Roles:', stats.totalRoles],
      ['Total Actividades:', stats.totalActividades],
      ['Actividades Completadas:', stats.completadas],
      ['Actividades en Ejecución:', stats.enEjecucion],
      ['Actividades Pendientes:', stats.pendientes],
      ['Avance General:', `${stats.promedioAvance}%`],
      [''],
      ['NORMATIVA'],
      ['Marco Regulatorio:', 'Decreto 648 de 2017 - Sistema de Control Interno'],
      ['Fecha de Generación:', new Date().toLocaleString('es-CO')]
    ];

    const wsInfo = XLSX.utils.aoa_to_sheet(infoGeneralData);
    wsInfo['!cols'] = [{ wch: 25 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Información General');

    // ============ HOJA 2: RESUMEN POR ROLES ============
    
    const rolesHeaders = ['Código', 'Rol', 'Descripción', 'Actividades', 'Completadas', 'En Ejecución', 'Avance %', 'Estado'];
    const rolesData = plan.roles.map(rol => [
      rol.codigo,
      rol.nombre,
      rol.descripcion,
      rol.actividades.length,
      rol.actividades.filter(a => a.estado === 'Completada').length,
      rol.actividades.filter(a => a.estado === 'En Ejecución').length,
      rol.porcentajeGeneral,
      rol.estadoGeneral
    ]);

    const wsRoles = XLSX.utils.aoa_to_sheet([rolesHeaders, ...rolesData]);
    wsRoles['!cols'] = [
      { wch: 10 }, { wch: 35 }, { wch: 50 }, { wch: 12 }, 
      { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsRoles, 'Resumen Roles');

    // ============ HOJA 3: TODAS LAS ACTIVIDADES ============
    
    const actHeaders = [
      'Rol', 'Código Act.', 'Actividad', 'Descripción', 
      'Responsable', 'Fecha Inicio', 'Fecha Fin', 
      'Avance %', 'Estado', 'Observaciones'
    ];
    
    const actividadesData: any[][] = [];
    plan.roles.forEach(rol => {
      rol.actividades.forEach(act => {
        actividadesData.push([
          rol.nombre,
          act.codigo,
          act.nombre,
          act.descripcion,
          act.responsableNombre,
          act.fechaInicio ? new Date(act.fechaInicio).toLocaleDateString('es-CO') : 'N/A',
          act.fechaFin ? new Date(act.fechaFin).toLocaleDateString('es-CO') : 'N/A',
          act.porcentajeReal,
          act.estado,
          act.observaciones || ''
        ]);
      });
    });

    const wsActividades = XLSX.utils.aoa_to_sheet([actHeaders, ...actividadesData]);
    wsActividades['!cols'] = [
      { wch: 30 }, { wch: 12 }, { wch: 40 }, { wch: 50 },
      { wch: 25 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 15 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsActividades, 'Todas las Actividades');

    // ============ HOJAS INDIVIDUALES POR ROL ============
    
    plan.roles.forEach((rol, index) => {
      const sheetName = `${index + 1}_${rol.codigo}`.substring(0, 31); // Excel limite 31 chars
      
      const rolHeaders = [
        'Código', 'Actividad', 'Descripción', 'Responsable',
        'Inicio', 'Fin', 'Avance %', 'Estado', 'Observaciones'
      ];
      
      const rolData = rol.actividades.map(act => [
        act.codigo,
        act.nombre,
        act.descripcion,
        act.responsableNombre,
        act.fechaInicio ? new Date(act.fechaInicio).toLocaleDateString('es-CO') : 'N/A',
        act.fechaFin ? new Date(act.fechaFin).toLocaleDateString('es-CO') : 'N/A',
        act.porcentajeReal,
        act.estado,
        act.observaciones || ''
      ]);

      // Header con info del rol
      const rolInfo = [
        [`ROL: ${rol.nombre}`],
        [`Código: ${rol.codigo}`],
        [`Avance: ${rol.porcentajeGeneral}%`],
        [`Estado: ${rol.estadoGeneral}`],
        ['']
      ];

      const wsRol = XLSX.utils.aoa_to_sheet([
        ...rolInfo,
        rolHeaders,
        ...rolData
      ]);
      
      wsRol['!cols'] = [
        { wch: 12 }, { wch: 40 }, { wch: 50 }, { wch: 25 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 40 }
      ];
      
      XLSX.utils.book_append_sheet(wb, wsRol, sheetName);
    });

    // Guardar archivo
    const fileName = `Plan_Anual_OCIG_${plan.año}_V${plan.version}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast.dismiss(toastId);
    toast.success('Excel generado correctamente', {
      description: `${fileName} - ${actividadesData.length} actividades exportadas`
    });
  } catch (error: any) {
    toast.dismiss(toastId);
    console.error('Error al generar Excel:', error);
    toast.error('Error al generar Excel', {
      description: error.message || 'No se pudo generar el archivo'
    });
    throw error;
  }
}

// ============================================
// EXPORTAR AMBOS FORMATOS
// ============================================

export async function exportarPlanAnualAmbos(plan: PlanAnualExport): Promise<void> {
  const toastId = toast.loading('Generando archivos...', {
    description: 'Preparando PDF y Excel'
  });

  try {
    await exportarPlanAnualPDF(plan);
    await exportarPlanAnualExcel(plan);
    
    toast.dismiss(toastId);
    toast.success('Exportación completa', {
      description: 'Se generaron ambos archivos PDF y Excel'
    });
  } catch (error) {
    toast.dismiss(toastId);
    throw error;
  }
}

export default {
  exportarPDF: exportarPlanAnualPDF,
  exportarExcel: exportarPlanAnualExcel,
  exportarAmbos: exportarPlanAnualAmbos
};
