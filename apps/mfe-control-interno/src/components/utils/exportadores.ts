/**
 * SISTEMA DE EXPORTACIÓN DE DOCUMENTOS OFICIALES
 * Generación de Excel y PDF con formato institucional ESAP
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { COLORES_ESAP } from './constantes';

// ============ TIPOS ============

interface AuditoriaProgramada {
  id: string;
  codigo: string;
  procesoAuditable: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  auditorLider?: string;
  equipoAuditor?: string[];
  fechas: {
    planeacion: { inicio: string; fin: string; duracionDias: number };
    ejecucion: { inicio: string; fin: string; duracionDias: number };
    comunicacion: { inicio: string; fin: string; duracionDias: number };
  };
  estado: string;
  observaciones: string;
}

interface ProgramaAnual {
  añoFiscal: number;
  version: string;
  fechaCreacion: string;
  responsable: string;
  estado: string;
  auditorias: AuditoriaProgramada[];
}

interface InformeAuditoria {
  codigo: string;
  proceso: string;
  fechaInicio: string;
  fechaFin: string;
  auditor: string;
  hallazgos: number;
  observaciones: number;
  calificacion: string;
  conclusiones: string;
  recomendaciones: string[];
}

// Extender jsPDF para AutoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

// ============ UTILIDADES ============

function formatearFecha(fecha: string): string {
  const [año, mes, dia] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${dia}/${meses[parseInt(mes) - 1]}/${año}`;
}

function formatearFechaLarga(fecha: string): string {
  const [año, mes, dia] = fecha.split('-');
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${parseInt(dia)} de ${meses[parseInt(mes) - 1]} de ${año}`;
}

function obtenerMesActual(): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const hoy = new Date();
  return `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
}

// ============ LOGO ESAP BASE64 ============
// Logo simplificado de ESAP en base64 (versión compacta)
const LOGO_ESAP_BASE64 = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABGCAYAAAA3W5EfAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAhNJREFUeJzt3LFKw0AYB/D/XRJwcHFw6OYg+ABuPoBDN8EnEHwABx/AxcVBcBAHBwcHX0DwAYRODg4ODg4ODtKlJZe0Te7uS+7+P0ihQ4f0R0pyfS0AIiIiIiIiIiIiIiIiIiKiRtLSJ0jTNAXgA8B79OsIQABgBOAMwAmAIwBHURv5sCzbVFGapolSSksp9wDsAdiNft0F0AWwHbUdAGMAXvR7OPouACDlPWdK2wcwAPAS/T1834ve89vy+1K070HU5wBAx4aNDIJ4uxRCnAO4BnAF4BLARfRnAGBY8xjdaDs5eM/r6L0r0XsXAC6itz9LPr+IPr+O3rsSvX8ZfT4obZ/Rz38O4EwIsaugY9xGhtdLAB8A3gC8AniJ/nwF8Azg6RefW7bvKWon/3ke7XtYsU3+8xOA+2jfE4D76OeG0b5BdMxemc0M73fL63MA7wDeATxFr58APu9x9P6H6JgPpe9O0T6Z13cAHgE8RO95iI75cM++p6V9d9HxelU2Mwh6sFJKpZTySin1SKnGqZTSSinlUio1Uan0vZRKP5RK6amU+q1Sqe+llPoqZdUvKeVFqda1lEpNpdT/l+HyJ3qfRtl7f8cYLZ7rz0aG17xelZzXQ8V5PWvL+T5G75f3yqJzfoxer9rI8P2p5LweVpzXs3lf9gW0UT+iLbOV4e/oW+Y8ZH5+VivD6915NrI3o5/RTgDcp1TqR0r1LaVU4+h5zL+Uqp9SqutSKj2Nsue+t9E23hMRERERERERERERERERbYYfHllRW7U3ptEAAAAASUVORK5CYII=';

// ============ EXPORTACIÓN A EXCEL ============

export function exportarProgramaAnualExcel(programa: ProgramaAnual): void {
  try {
    // Crear workbook
    const wb = XLSX.utils.book_new();

    // ===== HOJA 1: PORTADA =====
    const portadaData = [
      ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
      [''],
      ['OFICINA DE CONTROL INTERNO DE GESTIÓN'],
      [''],
      ['PROGRAMA ANUAL DE AUDITORÍAS'],
      [`AÑO FISCAL ${programa.añoFiscal}`],
      [''],
      [''],
      ['Información del Documento:'],
      ['Versión:', programa.version],
      ['Fecha de Creación:', formatearFechaLarga(programa.fechaCreacion)],
      ['Responsable:', programa.responsable],
      ['Estado:', programa.estado.toUpperCase()],
      ['Total Auditorías:', programa.auditorias.length.toString()],
      [''],
      [''],
      [`Generado el: ${obtenerMesActual()}`],
    ];
    const wsPortada = XLSX.utils.aoa_to_sheet(portadaData);
    XLSX.utils.book_append_sheet(wb, wsPortada, 'Portada');

    // ===== HOJA 2: PROGRAMA COMPLETO =====
    const programaHeaders = [
      'Código',
      'Proceso Auditable',
      'Tipo Proceso',
      'Sede/Territorial',
      'Nivel Riesgo',
      'Año Priorización',
      'Auditor Líder',
      'Equipo (Cantidad)',
      'Planeación Inicio',
      'Planeación Fin',
      'Días Planeación',
      'Ejecución Inicio',
      'Ejecución Fin',
      'Días Ejecución',
      'Comunicación Inicio',
      'Comunicación Fin',
      'Días Comunicación',
      'Días Totales',
      'Estado',
      'Observaciones',
    ];

    const programaRows = programa.auditorias.map((aud) => {
      const diasTotales =
        aud.fechas.planeacion.duracionDias +
        aud.fechas.ejecucion.duracionDias +
        aud.fechas.comunicacion.duracionDias;

      return [
        aud.codigo,
        aud.procesoAuditable,
        aud.tipoProceso,
        aud.tipoSede === 'Territorial' ? aud.territorial || 'Territorial' : 'Sede Principal',
        aud.nivelRiesgo,
        aud.añoPriorizacion,
        aud.auditorLider || 'Sin asignar',
        (aud.equipoAuditor?.length || 0).toString(),
        aud.fechas.planeacion.inicio,
        aud.fechas.planeacion.fin,
        aud.fechas.planeacion.duracionDias.toString(),
        aud.fechas.ejecucion.inicio,
        aud.fechas.ejecucion.fin,
        aud.fechas.ejecucion.duracionDias.toString(),
        aud.fechas.comunicacion.inicio,
        aud.fechas.comunicacion.fin,
        aud.fechas.comunicacion.duracionDias.toString(),
        diasTotales.toString(),
        aud.estado,
        aud.observaciones,
      ];
    });

    const wsPrograma = XLSX.utils.aoa_to_sheet([programaHeaders, ...programaRows]);
    
    // Ajustar anchos de columna
    wsPrograma['!cols'] = [
      { wch: 15 }, // Código
      { wch: 40 }, // Proceso
      { wch: 12 }, // Tipo
      { wch: 18 }, // Sede
      { wch: 12 }, // Riesgo
      { wch: 10 }, // Año
      { wch: 30 }, // Auditor
      { wch: 10 }, // Equipo
      { wch: 12 }, // Planeación Inicio
      { wch: 12 }, // Planeación Fin
      { wch: 10 }, // Días P
      { wch: 12 }, // Ejecución Inicio
      { wch: 12 }, // Ejecución Fin
      { wch: 10 }, // Días E
      { wch: 14 }, // Comunicación Inicio
      { wch: 14 }, // Comunicación Fin
      { wch: 10 }, // Días C
      { wch: 10 }, // Total
      { wch: 12 }, // Estado
      { wch: 40 }, // Observaciones
    ];

    XLSX.utils.book_append_sheet(wb, wsPrograma, 'Programa Anual');

    // ===== HOJA 3: ESTADÍSTICAS =====
    const stats = calcularEstadisticas(programa);
    const statsData = [
      ['ESTADÍSTICAS DEL PROGRAMA ANUAL'],
      [''],
      ['Totales por Estado:'],
      ['Programadas:', stats.porEstado.programadas],
      ['En Ejecución:', stats.porEstado.enEjecucion],
      ['Completadas:', stats.porEstado.completadas],
      ['Canceladas:', stats.porEstado.canceladas],
      [''],
      ['Totales por Nivel de Riesgo:'],
      ['Crítico:', stats.porRiesgo.CRITICO],
      ['Alto:', stats.porRiesgo.ALTO],
      ['Medio:', stats.porRiesgo.MEDIO],
      ['Bajo:', stats.porRiesgo.BAJO],
      [''],
      ['Totales por Tipo de Proceso:'],
      ['Misional:', stats.porTipo.Misional],
      ['Apoyo:', stats.porTipo.Apoyo],
      ['Estratégico:', stats.porTipo.Estrategico],
      ['Evaluación:', stats.porTipo.Evaluacion],
      [''],
      ['Totales por Sede:'],
      ['Sede Principal:', stats.porSede.principal],
      ['Territoriales:', stats.porSede.territorial],
      [''],
      ['Duración Total del Programa:'],
      ['Días de Planeación:', stats.diasTotales.planeacion],
      ['Días de Ejecución:', stats.diasTotales.ejecucion],
      ['Días de Comunicación:', stats.diasTotales.comunicacion],
      ['Total:', stats.diasTotales.total],
    ];

    const wsStats = XLSX.utils.aoa_to_sheet(statsData);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estadísticas');

    // ===== HOJA 4: CRONOGRAMA MENSUAL =====
    const cronogramaData = generarCronogramaMensual(programa);
    const wsCronograma = XLSX.utils.aoa_to_sheet(cronogramaData);
    XLSX.utils.book_append_sheet(wb, wsCronograma, 'Cronograma Mensual');

    // Generar archivo
    const nombreArchivo = `Programa_Anual_Auditorias_${programa.añoFiscal}_v${programa.version}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  } catch (error) {
    console.error('Error al exportar a Excel:', error);
    throw new Error('No se pudo generar el archivo Excel');
  }
}

// ============ EXPORTACIÓN A PDF ============

export function exportarProgramaAnualPDF(programa: ProgramaAnual): void {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    let yPos = 20;

    // ===== PORTADA =====
    agregarEncabezadoOficial(doc, yPos);
    yPos += 40;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165); // Azul ESAP
    doc.text('PROGRAMA ANUAL DE AUDITORÍAS', 148, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(16);
    doc.text(`AÑO FISCAL ${programa.añoFiscal}`, 148, yPos, { align: 'center' });
    yPos += 25;

    // Información del documento
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Versión:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(programa.version, 70, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de Creación:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatearFechaLarga(programa.fechaCreacion), 70, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Responsable:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(programa.responsable, 70, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Estado:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(programa.estado.toUpperCase(), 70, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'bold');
    doc.text('Total Auditorías:', 40, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(programa.auditorias.length.toString(), 70, yPos);
    yPos += 20;

    // Estadísticas resumidas
    const stats = calcularEstadisticas(programa);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('RESUMEN EJECUTIVO', 148, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const resumenTexto = [
      `• Auditorías de Riesgo Crítico: ${stats.porRiesgo.CRITICO} (${((stats.porRiesgo.CRITICO / programa.auditorias.length) * 100).toFixed(1)}%)`,
      `• Auditorías de Alto Riesgo: ${stats.porRiesgo.ALTO} (${((stats.porRiesgo.ALTO / programa.auditorias.length) * 100).toFixed(1)}%)`,
      `• Sede Principal: ${stats.porSede.principal} auditorías`,
      `• Territoriales: ${stats.porSede.territorial} auditorías`,
      `• Duración estimada total: ${stats.diasTotales.total} días`,
    ];

    resumenTexto.forEach((texto) => {
      doc.text(texto, 40, yPos);
      yPos += 6;
    });

    // Pie de página
    agregarPiePagina(doc, 1, 'Programa Anual');

    // ===== PÁGINA 2: TABLA DE AUDITORÍAS =====
    doc.addPage();
    yPos = 20;
    agregarEncabezadoOficial(doc, yPos);
    yPos += 25;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('AUDITORÍAS PROGRAMADAS', 148, yPos, { align: 'center' });
    yPos += 10;

    // Tabla principal
    const tableData = programa.auditorias.map((aud, index) => [
      (index + 1).toString(),
      aud.codigo,
      aud.procesoAuditable,
      aud.tipoProceso,
      aud.nivelRiesgo,
      formatearFecha(aud.fechas.planeacion.inicio),
      formatearFecha(aud.fechas.comunicacion.fin),
      aud.auditorLider || 'Sin asignar',
      aud.estado,
    ]);

    doc.autoTable({
      startY: yPos,
      head: [['#', 'Código', 'Proceso', 'Tipo', 'Riesgo', 'Inicio', 'Fin', 'Auditor', 'Estado']],
      body: tableData,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [0, 61, 165],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 60 },
        3: { cellWidth: 20 },
        4: { cellWidth: 18 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 45 },
        8: { cellWidth: 22 },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: (data) => {
        agregarPiePagina(doc, doc.getCurrentPageInfo().pageNumber, 'Programa Anual');
      },
    });

    // ===== PÁGINA 3: CRONOGRAMA =====
    doc.addPage();
    yPos = 20;
    agregarEncabezadoOficial(doc, yPos);
    yPos += 25;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('CRONOGRAMA DE AUDITORÍAS POR ETAPA', 148, yPos, { align: 'center' });
    yPos += 10;

    const cronogramaData = programa.auditorias.map((aud, index) => [
      (index + 1).toString(),
      aud.codigo,
      aud.procesoAuditable.substring(0, 35) + (aud.procesoAuditable.length > 35 ? '...' : ''),
      `${formatearFecha(aud.fechas.planeacion.inicio)} - ${formatearFecha(aud.fechas.planeacion.fin)}`,
      aud.fechas.planeacion.duracionDias + 'd',
      `${formatearFecha(aud.fechas.ejecucion.inicio)} - ${formatearFecha(aud.fechas.ejecucion.fin)}`,
      aud.fechas.ejecucion.duracionDias + 'd',
      `${formatearFecha(aud.fechas.comunicacion.inicio)} - ${formatearFecha(aud.fechas.comunicacion.fin)}`,
      aud.fechas.comunicacion.duracionDias + 'd',
    ]);

    doc.autoTable({
      startY: yPos,
      head: [
        [
          '#',
          'Código',
          'Proceso',
          'Planeación',
          'Días',
          'Ejecución',
          'Días',
          'Comunicación',
          'Días',
        ],
      ],
      body: cronogramaData,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [0, 61, 165],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 22 },
        2: { cellWidth: 50 },
        3: { cellWidth: 35 },
        4: { cellWidth: 12 },
        5: { cellWidth: 35 },
        6: { cellWidth: 12 },
        7: { cellWidth: 35 },
        8: { cellWidth: 12 },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didDrawPage: (data) => {
        agregarPiePagina(doc, doc.getCurrentPageInfo().pageNumber, 'Cronograma');
      },
    });

    // Guardar PDF
    const nombreArchivo = `Programa_Anual_Auditorias_${programa.añoFiscal}_v${programa.version}.pdf`;
    doc.save(nombreArchivo);
  } catch (error) {
    console.error('Error al exportar a PDF:', error);
    throw new Error('No se pudo generar el archivo PDF');
  }
}

// ============ EXPORTACIÓN DE INFORME DE AUDITORÍA ============

export function exportarInformeAuditoriaPDF(informe: InformeAuditoria): void {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    let yPos = 20;

    // Portada
    agregarEncabezadoOficial(doc, yPos);
    yPos += 40;

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('INFORME DE AUDITORÍA', 105, yPos, { align: 'center' });
    yPos += 15;

    doc.setFontSize(14);
    doc.text(informe.codigo, 105, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(informe.proceso, 105, yPos, { align: 'center' });
    yPos += 25;

    // Información general
    const infoGeneral = [
      ['Fecha de Inicio:', formatearFechaLarga(informe.fechaInicio)],
      ['Fecha de Finalización:', formatearFechaLarga(informe.fechaFin)],
      ['Auditor Responsable:', informe.auditor],
      ['Hallazgos Identificados:', informe.hallazgos.toString()],
      ['Observaciones:', informe.observaciones.toString()],
      ['Calificación General:', informe.calificacion],
    ];

    doc.autoTable({
      startY: yPos,
      body: infoGeneral,
      theme: 'plain',
      styles: {
        fontSize: 11,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: 'bold' },
        1: { cellWidth: 120 },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Conclusiones
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('1. CONCLUSIONES', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const conclusionesLines = doc.splitTextToSize(informe.conclusiones, 170);
    doc.text(conclusionesLines, 20, yPos);
    yPos += conclusionesLines.length * 5 + 10;

    // Recomendaciones
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 61, 165);
    doc.text('2. RECOMENDACIONES', 20, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    informe.recomendaciones.forEach((rec, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
        agregarEncabezadoOficial(doc, yPos);
        yPos += 30;
      }

      const recLines = doc.splitTextToSize(`${index + 1}. ${rec}`, 165);
      doc.text(recLines, 25, yPos);
      yPos += recLines.length * 5 + 5;
    });

    // Firmas
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 20;
    }

    agregarSeccionFirmas(doc, yPos, informe.auditor);

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      agregarPiePagina(doc, i, 'Informe de Auditoría');
    }

    // Guardar
    const nombreArchivo = `Informe_Auditoria_${informe.codigo.replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
  } catch (error) {
    console.error('Error al exportar informe:', error);
    throw new Error('No se pudo generar el informe PDF');
  }
}

// ============ FUNCIONES AUXILIARES ============

function agregarEncabezadoOficial(doc: jsPDF, yPos: number): void {
  // Logo (placeholder - en producción se usaría el logo real)
  doc.setFillColor(0, 61, 165);
  doc.rect(20, yPos, 30, 15, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ESAP', 35, yPos + 9, { align: 'center' });

  // Título institucional
  doc.setFontSize(11);
  doc.setTextColor(0, 61, 165);
  doc.text('ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA', 55, yPos + 5);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Oficina de Control Interno de Gestión', 55, yPos + 11);

  // Línea separadora
  doc.setDrawColor(0, 61, 165);
  doc.setLineWidth(0.5);
  doc.line(20, yPos + 18, 277, yPos + 18);
}

function agregarPiePagina(doc: jsPDF, numeroPagina: number, seccion: string): void {
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  
  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(20, pageHeight - 15, doc.internal.pageSize.width - 20, pageHeight - 15);
  
  // Información
  doc.text(`Documento: ${seccion}`, 20, pageHeight - 10);
  doc.text(
    `Generado: ${obtenerMesActual()}`,
    doc.internal.pageSize.width / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  doc.text(
    `Página ${numeroPagina}`,
    doc.internal.pageSize.width - 20,
    pageHeight - 10,
    { align: 'right' }
  );
}

function agregarSeccionFirmas(doc: jsPDF, yPos: number, auditor: string): void {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  // Línea de firma Auditor
  doc.line(30, yPos + 20, 90, yPos + 20);
  doc.text('Firma del Auditor', 60, yPos + 25, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(auditor, 60, yPos + 30, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Auditor Responsable', 60, yPos + 35, { align: 'center' });

  // Línea de firma Jefe
  doc.line(120, yPos + 20, 180, yPos + 20);
  doc.text('Firma del Jefe de Control Interno', 150, yPos + 25, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Mario Oswaldo Bernal Rodriguez', 150, yPos + 30, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text('Jefe Oficina Control Interno', 150, yPos + 35, { align: 'center' });
}

function calcularEstadisticas(programa: ProgramaAnual) {
  return {
    porEstado: {
      programadas: programa.auditorias.filter((a) => a.estado === 'Programada').length,
      enEjecucion: programa.auditorias.filter((a) => a.estado === 'En Ejecución').length,
      completadas: programa.auditorias.filter((a) => a.estado === 'Completada').length,
      canceladas: programa.auditorias.filter((a) => a.estado === 'Cancelada').length,
    },
    porRiesgo: {
      CRITICO: programa.auditorias.filter((a) => a.nivelRiesgo === 'CRÍTICO').length,
      ALTO: programa.auditorias.filter((a) => a.nivelRiesgo === 'ALTO').length,
      MEDIO: programa.auditorias.filter((a) => a.nivelRiesgo === 'MEDIO').length,
      BAJO: programa.auditorias.filter((a) => a.nivelRiesgo === 'BAJO').length,
    },
    porTipo: {
      Misional: programa.auditorias.filter((a) => a.tipoProceso === 'Misional').length,
      Apoyo: programa.auditorias.filter((a) => a.tipoProceso === 'Apoyo').length,
      Estrategico: programa.auditorias.filter((a) => a.tipoProceso === 'Estratégico').length,
      Evaluacion: programa.auditorias.filter((a) => a.tipoProceso === 'Evaluación').length,
    },
    porSede: {
      principal: programa.auditorias.filter((a) => a.tipoSede === 'Sede Principal').length,
      territorial: programa.auditorias.filter((a) => a.tipoSede === 'Territorial').length,
    },
    diasTotales: {
      planeacion: programa.auditorias.reduce(
        (sum, a) => sum + a.fechas.planeacion.duracionDias,
        0
      ),
      ejecucion: programa.auditorias.reduce((sum, a) => sum + a.fechas.ejecucion.duracionDias, 0),
      comunicacion: programa.auditorias.reduce(
        (sum, a) => sum + a.fechas.comunicacion.duracionDias,
        0
      ),
      total: programa.auditorias.reduce(
        (sum, a) =>
          sum +
          a.fechas.planeacion.duracionDias +
          a.fechas.ejecucion.duracionDias +
          a.fechas.comunicacion.duracionDias,
        0
      ),
    },
  };
}

function generarCronogramaMensual(programa: ProgramaAnual): any[][] {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const header = ['Código', 'Proceso', ...meses];
  
  const rows = programa.auditorias.map((aud) => {
    const row = [aud.codigo, aud.procesoAuditable];
    
    // Determinar en qué meses está activa la auditoría
    const mesesActivos = new Array(12).fill('');
    
    const inicio = new Date(aud.fechas.planeacion.inicio);
    const fin = new Date(aud.fechas.comunicacion.fin);
    
    for (let mes = 0; mes < 12; mes++) {
      const primerDiaMes = new Date(programa.añoFiscal, mes, 1);
      const ultimoDiaMes = new Date(programa.añoFiscal, mes + 1, 0);
      
      if (inicio <= ultimoDiaMes && fin >= primerDiaMes) {
        // Determinar qué etapa está activa
        const medioMes = new Date(programa.añoFiscal, mes, 15);
        
        if (new Date(aud.fechas.planeacion.inicio) <= medioMes && 
            new Date(aud.fechas.planeacion.fin) >= medioMes) {
          mesesActivos[mes] = 'P';
        } else if (new Date(aud.fechas.ejecucion.inicio) <= medioMes && 
                   new Date(aud.fechas.ejecucion.fin) >= medioMes) {
          mesesActivos[mes] = 'E';
        } else if (new Date(aud.fechas.comunicacion.inicio) <= medioMes && 
                   new Date(aud.fechas.comunicacion.fin) >= medioMes) {
          mesesActivos[mes] = 'C';
        } else {
          mesesActivos[mes] = '▬';
        }
      }
    }
    
    return [...row, ...mesesActivos];
  });
  
  return [header, ...rows];
}

// ============ EXPORTAR TODAS LAS FUNCIONES ============

export default {
  exportarProgramaAnualExcel,
  exportarProgramaAnualPDF,
  exportarInformeAuditoriaPDF,
};
