/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICIO: EXPORTACIÓN DEL PLAN ANUAL A PDF
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Genera el documento oficial del Plan Anual de Auditoría con:
 * - Diseño corporativo ESAP
 * - Formato EM-FO-001
 * - Decreto 648/2017
 * - Firmas y aprobaciones
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface PlanAnualPDFData {
  id: string;
  vigencia: number;
  version: number;
  estado: string;
  jefeOCI: {
    nombre: string;
    cargo: string;
    email: string;
  };
  fechaCreacion: string;
  fechaAprobacion: string | null;
  actaCICC: string | null;
  roles: Array<{
    numero: number;
    nombre: string;
    articulo: string;
    actividadesPlan: Array<{
      nombre: string;
      descripcion: string;
      fechaInicio: string;
      fechaFin: string;
      responsableAsignado: {
        nombre: string;
        cargo: string;
      } | null;
      porcentajeAvance: number;
      estadoActividad: string;
    }>;
  }>;
}

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES - Colores Corporativos ESAP
// ════════════════════════════════════════════════════════════════════════════

const COLORES_ESAP = {
  azulPrincipal: [0, 61, 165] as [number, number, number],     // #003DA5
  azulSecundario: [41, 98, 255] as [number, number, number],   // #2962FF
  naranja: [245, 124, 0] as [number, number, number],          // #F57C00
  grisOscuro: [51, 51, 51] as [number, number, number],        // #333333
  grisClaro: [128, 128, 128] as [number, number, number],      // #808080
  blanco: [255, 255, 255] as [number, number, number]
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export async function exportarPlanAnualAPDF(data: PlanAnualPDFData): Promise<void> {
  // Crear documento PDF tamaño carta
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margen = 20;
  let yPos = margen;

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 1: PORTADA
  // ══════════════════════════════════════════════════════════════════════════

  // Header azul superior
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo ESAP (simulado con texto)
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ESAP', pageWidth / 2, 20, { align: 'center' });
  doc.setFontSize(10);
  doc.text('Escuela Superior de Administración Pública', pageWidth / 2, 28, { align: 'center' });

  // Título principal
  yPos = 70;
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN ANUAL DE AUDITORÍA', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(18);
  doc.text(`OFICINA DE CONTROL INTERNO`, pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;
  doc.setFontSize(28);
  doc.setTextColor(...COLORES_ESAP.naranja);
  doc.text(`VIGENCIA ${data.vigencia}`, pageWidth / 2, yPos, { align: 'center' });

  // Información del plan
  yPos += 30;
  doc.setFontSize(11);
  doc.setTextColor(...COLORES_ESAP.grisOscuro);
  doc.setFont('helvetica', 'normal');

  const infoLines = [
    `Código: ${data.id}`,
    `Versión: ${data.version}`,
    `Estado: ${data.estado}`,
    `Formato: EM-FO-001`,
    `Base Legal: Decreto 648 de 2017`
  ];

  infoLines.forEach((line, idx) => {
    doc.text(line, pageWidth / 2, yPos + (idx * 8), { align: 'center' });
  });

  // Footer con fecha
  yPos = pageHeight - 40;
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(margen, yPos, pageWidth - (margen * 2), 25, 'F');
  
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Jefe de OCI', pageWidth / 2, yPos + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(data.jefeOCI.nombre, pageWidth / 2, yPos + 14, { align: 'center' });
  doc.text(data.jefeOCI.cargo, pageWidth / 2, yPos + 20, { align: 'center' });

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 2: INTRODUCCIÓN Y MARCO NORMATIVO
  // ══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  yPos = margen;

  // Header de página
  agregarHeaderPagina(doc, `Plan Anual de Auditoría ${data.vigencia}`, pageWidth, margen);
  yPos += 20;

  // Sección: Marco Normativo
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(margen, yPos, pageWidth - (margen * 2), 8, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. MARCO NORMATIVO', margen + 3, yPos + 6);

  yPos += 15;
  doc.setTextColor(...COLORES_ESAP.grisOscuro);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const textoMarcoNormativo = `El presente Plan Anual de Auditoría se elabora en cumplimiento del Decreto 648 de 2017, por el cual se modifica el Modelo Estándar de Control Interno - MECI. El artículo 2 de dicho decreto establece cinco (5) roles obligatorios que deben desarrollar las Oficinas de Control Interno:

1. Liderazgo Estratégico
2. Enfoque hacia la Prevención
3. Evaluación de la Gestión del Riesgo
4. Evaluación del Sistema de Control Interno
5. Relación con Organismos de Control Externo

Este plan estructura las actividades de auditoría interna para la vigencia ${data.vigencia}, garantizando la cobertura integral de estos roles y el fortalecimiento del control institucional.`;

  const lineasTexto = doc.splitTextToSize(textoMarcoNormativo, pageWidth - (margen * 2) - 6);
  doc.text(lineasTexto, margen + 3, yPos);
  yPos += lineasTexto.length * 5 + 10;

  // Sección: Información General
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(margen, yPos, pageWidth - (margen * 2), 8, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. INFORMACIÓN GENERAL', margen + 3, yPos + 6);

  yPos += 15;

  // Tabla de información general
  (doc as any).autoTable({
    startY: yPos,
    head: [['Campo', 'Información']],
    body: [
      ['Vigencia', data.vigencia.toString()],
      ['Código del Plan', data.id],
      ['Versión', data.version.toString()],
      ['Estado Actual', data.estado],
      ['Fecha de Creación', new Date(data.fechaCreacion).toLocaleDateString('es-CO')],
      ['Fecha de Aprobación', data.fechaAprobacion ? new Date(data.fechaAprobacion).toLocaleDateString('es-CO') : 'Pendiente'],
      ['Acta CICC', data.actaCICC || 'Pendiente'],
      ['Jefe de OCI', data.jefeOCI.nombre],
      ['Cargo', data.jefeOCI.cargo],
      ['Email', data.jefeOCI.email]
    ],
    headStyles: {
      fillColor: COLORES_ESAP.azulPrincipal,
      textColor: COLORES_ESAP.blanco,
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORES_ESAP.grisOscuro
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { left: margen, right: margen }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINAS SIGUIENTES: DETALLE POR ROL
  // ══════════════════════════════════════════════════════════════════════════

  data.roles.forEach((rol, idxRol) => {
    doc.addPage();
    yPos = margen;

    // Header de página
    agregarHeaderPagina(doc, `ROL ${rol.numero}: ${rol.nombre}`, pageWidth, margen);
    yPos += 20;

    // Título del rol
    doc.setFillColor(...COLORES_ESAP.naranja);
    doc.rect(margen, yPos, pageWidth - (margen * 2), 10, 'F');
    doc.setTextColor(...COLORES_ESAP.blanco);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`ROL ${rol.numero}: ${rol.nombre.toUpperCase()}`, margen + 3, yPos + 7);

    yPos += 12;
    doc.setTextColor(...COLORES_ESAP.grisOscuro);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Base Legal: ${rol.articulo}`, margen + 3, yPos);

    yPos += 10;

    // Tabla de actividades del rol
    const actividadesData = rol.actividadesPlan.map((act, idx) => [
      (idx + 1).toString(),
      act.nombre,
      act.responsableAsignado?.nombre || 'Sin asignar',
      `${act.fechaInicio} - ${act.fechaFin}`,
      `${act.porcentajeAvance}%`,
      act.estadoActividad
    ]);

    (doc as any).autoTable({
      startY: yPos,
      head: [['#', 'Actividad', 'Responsable', 'Período', 'Avance', 'Estado']],
      body: actividadesData,
      headStyles: {
        fillColor: COLORES_ESAP.azulSecundario,
        textColor: COLORES_ESAP.blanco,
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: COLORES_ESAP.grisOscuro
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: margen, right: margen }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ÚLTIMA PÁGINA: FIRMAS Y APROBACIONES
  // ══════════════════════════════════════════════════════════════════════════

  doc.addPage();
  yPos = margen;

  agregarHeaderPagina(doc, `Firmas y Aprobaciones`, pageWidth, margen);
  yPos += 30;

  // Sección de firmas
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(margen, yPos, pageWidth - (margen * 2), 8, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMAS Y APROBACIONES', margen + 3, yPos + 6);

  yPos += 30;

  // Firma del Jefe de OCI
  doc.setDrawColor(...COLORES_ESAP.grisOscuro);
  doc.line(margen + 20, yPos, pageWidth - margen - 20, yPos);
  yPos += 5;
  doc.setTextColor(...COLORES_ESAP.grisOscuro);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.jefeOCI.nombre, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.jefeOCI.cargo, pageWidth / 2, yPos, { align: 'center' });
  yPos += 4;
  doc.text('Jefe de la Oficina de Control Interno', pageWidth / 2, yPos, { align: 'center' });

  yPos += 20;

  // Información de aprobación
  if (data.actaCICC) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Aprobado mediante Acta CICC: ${data.actaCICC}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`Fecha de Aprobación: ${new Date(data.fechaAprobacion!).toLocaleDateString('es-CO')}`, pageWidth / 2, yPos, { align: 'center' });
  }

  // Footer final
  yPos = pageHeight - 30;
  doc.setFillColor(...COLORES_ESAP.azulPrincipal);
  doc.rect(0, yPos, pageWidth, 30, 'F');
  doc.setTextColor(...COLORES_ESAP.blanco);
  doc.setFontSize(9);
  doc.text('Escuela Superior de Administración Pública - ESAP', pageWidth / 2, yPos + 10, { align: 'center' });
  doc.text('Oficina de Control Interno - OCI', pageWidth / 2, yPos + 15, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`, pageWidth / 2, yPos + 22, { align: 'center' });

  // Agregar números de página
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORES_ESAP.grisClaro);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margen, pageHeight - 10, { align: 'right' });
  }

  // Guardar el PDF
  doc.save(`Plan_Anual_Auditoria_ESAP_${data.vigencia}.pdf`);
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN HELPER: Agregar Header de Página
// ════════════════════════════════════════════════════════════════════════════

function agregarHeaderPagina(doc: jsPDF, titulo: string, pageWidth: number, margen: number) {
  // Línea superior
  doc.setDrawColor(...COLORES_ESAP.azulPrincipal);
  doc.setLineWidth(0.5);
  doc.line(margen, margen, pageWidth - margen, margen);

  // Título
  doc.setTextColor(...COLORES_ESAP.azulPrincipal);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, margen, margen - 3);

  // Logo pequeño
  doc.setFontSize(8);
  doc.text('ESAP - OCI', pageWidth - margen, margen - 3, { align: 'right' });
}
