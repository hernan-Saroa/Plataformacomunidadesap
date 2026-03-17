import type { jsPDF as JsPDFType } from 'jspdf';
import { dibujarEncabezadoInstitucional, dibujarPieInstitucional, DOCUMENTOS_PREDEFINIDOS, type ConfiguracionDocumento } from './pdfESAPHeader';

// Tipos mínimos necesarios (coinciden con los de ComunicacionAuditoriaModule)
export interface InformePreliminarPDF {
  fecha: string;
  hallazgos: number;
  graves: number;
  moderados: number;
  leves: number;
  observaciones: string;
}

export interface InformeFinalPDF {
  fecha: string;
  controversiasResueltas: number;
  hallazgosAjustados: number;
  plazosPlanMejora: string;
  observacionesFinales: string;
}

export interface AuditoriaBasicaPDF {
  codigo: string;
  nombre: string;
  proceso: string;
  auditorLider: string;
}

/** Hallazgo para incluir en el detalle del informe preliminar */
export interface HallazgoPDF {
  codigo?: string;
  titulo?: string;
  gravedad?: string;
  descripcion: string;
  criterioIncumplido?: string;
  causas?: string[];
  efectos?: string[];
  recomendaciones?: string[];
  /** Estado / decisión final del auditor (para informe final) */
  estadoFinal?: string;
  decisionAuditor?: string;
  fundamentacionTecnica?: string;
}

type TipoInforme = 'preliminar' | 'final';

export async function exportarPDFInformeAuditoria(
  tipo: TipoInforme,
  auditoria: AuditoriaBasicaPDF,
  informe: InformePreliminarPDF | InformeFinalPDF,
  hallazgosDetalle?: HallazgoPDF[]
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPDFType = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  }) as unknown as JsPDFType;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ============================================
  // ENCABEZADO INSTITUCIONAL (MISMO QUE PLAN ANUAL)
  // ============================================
  const baseConfig =
    DOCUMENTOS_PREDEFINIDOS.PLAN_ANUAL as ConfiguracionDocumento;

  const configDoc: ConfiguracionDocumento = {
    codigo: baseConfig.codigo,
    version: baseConfig.version,
    fecha: baseConfig.fecha,
    proceso: baseConfig.proceso,
    titulo:
      tipo === 'preliminar'
        ? 'INFORME PRELIMINAR DE AUDITORÍA'
        : 'INFORME FINAL DE AUDITORÍA',
  };

  let y = dibujarEncabezadoInstitucional(doc as any, configDoc, 28);

  // Espacio extra entre encabezado y cuerpo del informe
  y += 10;

  // ============================================
  // CUERPO DEL INFORME
  // ============================================

  // Datos generales de la auditoría
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const fechaStr =
    'fecha' in informe && informe.fecha
      ? new Date(informe.fecha).toLocaleDateString('es-CO')
      : new Date().toLocaleDateString('es-CO');

  const rowsDatos: [string, string][] = [
    ['Código de Auditoría', auditoria.codigo],
    ['Proceso Auditado', auditoria.nombre || auditoria.proceso],
    ['Auditor Líder', auditoria.auditorLider || 'No asignado'],
    ['Fecha de generación', fechaStr],
  ];

  rowsDatos.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || ''), 70, y);
    y += 6;
  });

  // Línea separadora
  y += 2;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  if (tipo === 'preliminar') {
    const inf = informe as InformePreliminarPDF;

    // Resumen de hallazgos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN DE HALLAZGOS IDENTIFICADOS', 20, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const cajas = [
      { label: 'Total Hallazgos', value: inf.hallazgos.toString() },
      { label: 'Graves', value: inf.graves.toString() },
      { label: 'Moderados', value: inf.moderados.toString() },
      { label: 'Leves', value: inf.leves.toString() },
    ];

    const boxWidth = (pageWidth - 40) / 4;
    const boxHeight = 18;

    cajas.forEach((caja, index) => {
      const x = margin + index * boxWidth;
      doc.setFillColor(243, 244, 246);
      doc.rect(x, y, boxWidth - 2, boxHeight, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, y, boxWidth - 2, boxHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(caja.value, x + (boxWidth - 2) / 2, y + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(caja.label, x + (boxWidth - 2) / 2, y + 14, { align: 'center' });
    });

    y += boxHeight + 12;

    // ========== DETALLE DE HALLAZGOS ==========
    const listaHallazgos = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];
    const maxWidth = pageWidth - 40;

    if (listaHallazgos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('DETALLE DE HALLAZGOS IDENTIFICADOS', margin, y);
      y += 8;

      listaHallazgos.forEach((h, index) => {
        // Nueva página si no hay espacio (dejar ~45mm para al menos un bloque)
        if (y > pageHeight - 55) {
          doc.addPage();
          y = margin;
        }

        const headerHeight = 12;
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const tituloCorto = (h.titulo || h.descripcion?.substring(0, 80) || 'Sin título').trim();
        doc.text(
          `Hallazgo ${index + 1}: ${tituloCorto}${(h.titulo || h.descripcion || '').length > 80 ? '…' : ''}`,
          margin + 3,
          y + 5
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(
          `Gravedad: ${h.gravedad || 'N/A'}${h.codigo ? `  |  Código: ${h.codigo}` : ''}`,
          margin + 3,
          y + 9
        );

        y += headerHeight + 4;

        doc.setFontSize(9);
        doc.setTextColor(40, 40, 40);
        if (h.descripcion) {
          doc.setFont('helvetica', 'bold');
          doc.text('Descripción:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const lineasDesc = doc.splitTextToSize(h.descripcion, maxWidth - 4);
          doc.text(lineasDesc, margin + 2, y);
          y += lineasDesc.length * 4 + 2;
        }
        if (h.causas && h.causas.length > 0) {
          if (y > pageHeight - 30) { doc.addPage(); y = margin + 5; }
          doc.setFont('helvetica', 'bold');
          doc.text('Causas:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const textoCausas = h.causas.join('; ');
          const lineasCausas = doc.splitTextToSize(textoCausas, maxWidth - 4);
          doc.text(lineasCausas, margin + 2, y);
          y += lineasCausas.length * 3.5 + 2;
        }
        if (h.efectos && h.efectos.length > 0) {
          if (y > pageHeight - 30) { doc.addPage(); y = margin + 5; }
          doc.setFont('helvetica', 'bold');
          doc.text('Efectos:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const textoEfectos = h.efectos.join('; ');
          const lineasEfectos = doc.splitTextToSize(textoEfectos, maxWidth - 4);
          doc.text(lineasEfectos, margin + 2, y);
          y += lineasEfectos.length * 3.5 + 2;
        }
        if (h.recomendaciones && h.recomendaciones.length > 0) {
          if (y > pageHeight - 30) { doc.addPage(); y = margin + 5; }
          doc.setFont('helvetica', 'bold');
          doc.text('Recomendaciones:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const textoRec = h.recomendaciones.join('; ');
          const lineasRec = doc.splitTextToSize(textoRec, maxWidth - 4);
          doc.text(lineasRec, margin + 2, y);
          y += lineasRec.length * 3.5 + 2;
        }
        y += 6;
      });

      y += 4;
    }

    // Observaciones generales
    if (y > pageHeight - 35) { doc.addPage(); y = margin + 5; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('OBSERVACIONES GENERALES', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const texto = inf.observaciones || 'Sin observaciones registradas.';
    const lines = doc.splitTextToSize(texto, maxWidth);
    doc.text(lines, margin, y);
  } else {
    const inf = informe as InformeFinalPDF;

    const maxWidth = pageWidth - 40;

    // Resultado de controversias
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('RESULTADO DE CONTROVERSIAS', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const textoControversias = `Total controversias resueltas: ${inf.controversiasResueltas}.
Hallazgos ajustados a partir de controversias: ${inf.hallazgosAjustados}.`;
    let lines = doc.splitTextToSize(textoControversias, maxWidth);
    doc.text(lines, margin, y);

    y += lines.length * 5 + 10;

    // ========== DETALLE DE HALLAZGOS FINALES ==========
    const listaHallazgosFinales = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];
    if (listaHallazgosFinales.length > 0) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('DECISIÓN FINAL POR HALLAZGO', margin, y);
      y += 8;

      listaHallazgosFinales.forEach((h, index) => {
        if (y > pageHeight - 55) {
          doc.addPage();
          y = margin;
        }

        const headerHeight = 10;
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const tituloCorto = (h.titulo || h.descripcion?.substring(0, 80) || 'Sin título').trim();
        doc.text(
          `Hallazgo ${index + 1}: ${tituloCorto}${(h.titulo || h.descripcion || '').length > 80 ? '…' : ''}`,
          margin + 3,
          y + 4
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const estado = h.estadoFinal || h.decisionAuditor || 'N/A';
        doc.text(
          `Estado final: ${estado}${h.codigo ? `  |  Código: ${h.codigo}` : ''}`,
          margin + 3,
          y + 8.2
        );

        y += headerHeight + 4;

        // Fundamentación técnica (si existe)
        if (h.fundamentacionTecnica && h.fundamentacionTecnica.trim()) {
          if (y > pageHeight - 40) {
            doc.addPage();
            y = margin;
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('Fundamentación técnica:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const lineasFund = doc.splitTextToSize(h.fundamentacionTecnica, maxWidth - 4);
          doc.text(lineasFund, margin + 2, y);
          y += lineasFund.length * 3.5 + 4;
        }

        y += 4;
      });

      y += 6;
    }

    // Plazo plan de mejoramiento
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('PLAZO PARA EL PLAN DE MEJORAMIENTO', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const textoPlazo = `El área auditada cuenta con ${inf.plazosPlanMejora} días calendario para presentar el Plan de Mejoramiento correspondiente.`;
    lines = doc.splitTextToSize(textoPlazo, maxWidth);
    doc.text(lines, margin, y);

    y += lines.length * 5 + 10;

    // Observaciones finales
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('OBSERVACIONES FINALES', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const textoObs = inf.observacionesFinales || 'Sin observaciones finales registradas.';
    lines = doc.splitTextToSize(textoObs, maxWidth);
    doc.text(lines, margin, y);
  }

  // ============================================
  // PIE INSTITUCIONAL IGUAL A OTROS DOCS
  // ============================================
  const totalPages = (doc as any).getNumberOfPages?.() || 1;
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);
    dibujarPieInstitucional(doc as any, i, true);
  }

  // Descargar
  const filename =
    tipo === 'preliminar'
      ? `Informe_Preliminar_${auditoria.codigo}.pdf`
      : `Informe_Final_${auditoria.codigo}.pdf`;
  doc.save(filename);
}

