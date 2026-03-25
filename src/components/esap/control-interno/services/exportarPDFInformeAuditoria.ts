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
  /** Folios del anexo (ej: 45) */
  foliosAnexos?: number;
}

export interface InformeFinalPDF {
  fecha: string;
  controversiasResueltas: number;
  hallazgosAjustados: number;
  plazosPlanMejora: string;
  observacionesFinales: string;
}

/** Variables extendidas para carta de cubierta, antecedentes y ejecución por procesos */
export interface AuditoriaBasicaPDF {
  codigo: string;
  nombre: string;
  proceso: string;
  auditorLider: string;
  // --- Variables para carta de cubierta ---
  /** Radicado del oficio (ej: I-2025-12_150_350) */
  radicado?: string;
  /** Fecha del oficio (ej: 2025-08-06) */
  fechaOficio?: string;
  /** Nombre del destinatario (ej: Doctora Cristina Otálvaro Idárraga) */
  destinatarioNombre?: string;
  /** Cargo del destinatario (ej: Directora Territorial) */
  destinatarioCargo?: string;
  /** Unidad auditable (ej: Territorial Caldas) */
  unidadAuditable?: string;
  /** Plazo para pronunciamiento (ej: doce (12) de agosto de 2025) */
  fechaLimitePronunciamiento?: string;
  /** Nombre Jefe OCI (ej: Mario Oswaldo Bernal Rodríguez) */
  jefeOCI?: string;
  /** Elaboró (ej: Fernando Aurelio Avila Castro, Auditor Líder) */
  elaboro?: string;
  /** Revisó (ej: Mario Oswaldo Bernal Rodríguez) */
  reviso?: string;
  /** Aprobó (ej: Mario Oswaldo Bernal Rodríguez) */
  aprobo?: string;
  // --- Variables para datos formales ---
  /** Título completo de la auditoría */
  tituloAuditoria?: string;
  /** Responsable de la unidad auditada */
  responsableUnidadAuditada?: string;
  /** Lugar de ejecución (ej: Manizales – Caldas) */
  lugarEjecucion?: string;
  /** Fecha inicio ejecución (ej: 29 de julio) */
  fechaEjecucionInicio?: string;
  /** Fecha fin ejecución (ej: 01 agosto de 2025) */
  fechaEjecucionFin?: string;
  /** Período auditado (ej: 1 de enero al 31 de diciembre de 2024) */
  periodoAuditoria?: string;
  /** Equipo auditor [{nombre, rol}] */
  equipoAuditor?: Array<{ nombre: string; rol?: string }>;
  /** Objetivo(s) de la auditoría */
  objetivo?: string;
  /** Alcance de la auditoría */
  alcance?: string;
  /** Marco normativo (texto o array de normas) */
  marcoNormativo?: string | string[];
  /** Contexto general de la auditoría */
  contextoGeneral?: string;
  /** Fecha reunión apertura / cierre (ej: reunión de inicio 29 julio, cierre 01 agosto 2025) */
  fechasReuniones?: string;
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
  /** Reserva para pie de página (Sede, PBX, Correo, Página N) - evita solapamiento */
  const FOOTER_MARGIN = 45;
  const lineHeight = 5;
  const spaceSection = 8;

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

  const maxWidth = pageWidth - 40;
  const fechaStr =
    'fecha' in informe && informe.fecha
      ? new Date(informe.fecha).toLocaleDateString('es-CO')
      : new Date().toLocaleDateString('es-CO');

  // ============================================
  // SECCIÓN PRELIMINAR: CARTA DE CUBIERTA (solo preliminar)
  // ============================================
  if (tipo === 'preliminar') {
    const radicado = auditoria.radicado || `I-2025-${auditoria.codigo.replace(/\D/g, '').slice(-6) || '000000'}`;
    const fechaOficio = auditoria.fechaOficio || fechaStr;
    const destinatario = auditoria.destinatarioNombre || 'Director(a) Territorial';
    const cargoDest = auditoria.destinatarioCargo || 'Director Territorial';
    const unidad = auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'Unidad Auditada';
    const plazoPronunc = auditoria.fechaLimitePronunciamiento || 'diez (10) días hábiles';
    const jefe = auditoria.jefeOCI || 'Jefe Oficina de Control Interno';
    const elaboro = auditoria.elaboro || `${auditoria.auditorLider || 'Auditor Líder'}`;
    const reviso = auditoria.reviso || jefe;
    const aprobo = auditoria.aprobo || jefe;
    const folios = (informe as InformePreliminarPDF).foliosAnexos ?? (hallazgosDetalle?.length || 0) * 2 + 10;

    // Sede y contacto
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Sede principal', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text('ventanillaunica@esap.edu.co | Calle 44 # 53 - 37, CAN, Bogotá D.C. | PBX: 018000 423713', margin, y + 5);
    y += 12;

    // Radicado y fecha
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Radicado: ${radicado} | Fecha: ${fechaOficio}`, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 8;

    // Destinatario
    doc.setFontSize(10);
    doc.text('Bogotá, D.C.', margin, y);
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text(destinatario, margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(cargoDest, margin, y);
    y += 5;
    doc.text(unidad, margin, y);
    y += 8;

    // Asunto y cuerpo del oficio
    doc.setFont('helvetica', 'bold');
    doc.text('Asunto: Informe preliminar auditoría interna de evaluación y seguimiento.', margin, y);
    y += 5;
    const lineasAsunto = doc.splitTextToSize(
      `${unidad} – Vigencia correspondiente.`,
      maxWidth
    );
    doc.text(lineasAsunto, margin, y);
    y += lineasAsunto.length * 5 + 6;

    doc.setFont('helvetica', 'normal');
    const partes = destinatario.trim().split(/\s+/);
    const nombreSaludo = partes.length >= 2 ? partes.slice(1).join(' ') : (partes[0] || 'Director(a)');
    const cuerpoOficio = `Respetado(a) ${nombreSaludo}, reciba un cordial saludo:

La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría, remite para su conocimiento y pronunciamiento el informe Preliminar de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la ${unidad}, para el periodo correspondiente.

Así mismo, la unidad auditada tiene plazo hasta el ${plazoPronunc}, para que se pronuncie frente a cada uno de los hallazgos y recomendaciones incluidos en el informe preliminar, allegando los soportes y evidencias respectivos, con el objetivo de que los hallazgos sean levantados o en su defecto declarar su firmeza.

De antemano, agradecemos su colaboración en el desarrollo de las funciones de esta dependencia.

Cordialmente,

${jefe}`;

    const lineasCuerpo = doc.splitTextToSize(cuerpoOficio, maxWidth);
    doc.text(lineasCuerpo, margin, y);
    y += lineasCuerpo.length * lineHeight + spaceSection;

    doc.setFontSize(9);
    doc.text(`Anexos: Informe Preliminar de Auditoría (${folios}) folios.`, margin, y);
    y += lineHeight + 2;
    doc.text('Copia: N/A', margin, y);
    y += lineHeight + 4;
    doc.text(`Elaboró: ${elaboro}`, margin, y);
    y += lineHeight;
    doc.text(`Revisó: ${reviso}`, margin, y);
    y += lineHeight;
    doc.text(`Aprobó: ${aprobo}`, margin, y);
    y += spaceSection + 6;

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }

    // ========== DATOS FORMALES DEL INFORME ==========
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TIPO DE INFORME: Informe preliminar de auditoría de evaluación y seguimiento.', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    const tituloAud = auditoria.tituloAuditoria || `Auditoría interna basada en riesgos a los procesos objeto de auditoría, al interior de la ${unidad} de la ESAP.`;
    const lineasTitulo = doc.splitTextToSize(`TÍTULO DE LA AUDITORÍA (unidad auditable): ${tituloAud}`, maxWidth);
    doc.text(lineasTitulo, margin, y);
    y += lineasTitulo.length * lineHeight + spaceSection;

    doc.text(`RESPONSABLE DE LA UNIDAD AUDITADA: ${auditoria.responsableUnidadAuditada || destinatario} – ${cargoDest}.`, margin, y);
    y += lineHeight + 2;

    const lugar = auditoria.lugarEjecucion || 'Sede de la unidad';
    const fechEjIni = auditoria.fechaEjecucionInicio || '—';
    const fechEjFin = auditoria.fechaEjecucionFin || '—';
    doc.text(`LUGAR Y FECHA DE EJECUCIÓN AUDITORÍA: ${lugar} / ${fechEjIni} – ${fechEjFin}`, margin, y);
    y += lineHeight + 4;

    doc.text(`PERIODO DE LA AUDITORÍA: ${auditoria.periodoAuditoria || 'Vigencia correspondiente'}.`, margin, y);
    y += lineHeight + 4;

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    if (auditoria.equipoAuditor && auditoria.equipoAuditor.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('EQUIPO AUDITOR:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      auditoria.equipoAuditor.forEach((m) => {
        doc.text(`• ${m.nombre}${m.rol ? ` – ${m.rol}` : ''}`, margin + 2, y);
        y += lineHeight;
      });
      y += spaceSection;
    } else {
      doc.text(`EQUIPO AUDITOR: ${auditoria.auditorLider || 'No asignado'} – Auditor Líder.`, margin, y);
      y += lineHeight + 4;
    }

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    const obj = auditoria.objetivo || 'Evaluar el cumplimiento de las normas, directrices, procedimientos y regulaciones aplicables, mediante la auditoría interna como actividad independiente y objetiva.';
    doc.setFont('helvetica', 'bold');
    doc.text('OBJETIVO(S):', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    const lineasObj = doc.splitTextToSize(obj, maxWidth);
    doc.text(lineasObj, margin, y);
    y += lineasObj.length * lineHeight + spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    const alc = auditoria.alcance || `La etapa de ejecución de la auditoría se realizará de manera presencial, evaluando el desarrollo de las actividades, acciones y controles establecidos.`;
    doc.setFont('helvetica', 'bold');
    doc.text('ALCANCE:', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    const lineasAlc = doc.splitTextToSize(alc, maxWidth);
    doc.text(lineasAlc, margin, y);
    y += lineasAlc.length * lineHeight + spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN:', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.text('La auditoría se realiza con base en el análisis de muestras seleccionadas por los auditores, expedientes, procesos, reportes de sistemas de información y normas aplicables.', margin, y);
    y += lineHeight + spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }

    // ========== NOTA DE SEGURIDAD Y CONFIDENCIALIDAD ==========
    const notaBoxHeight = 28;
    if (y + notaBoxHeight > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    doc.setFillColor(255, 250, 230);
    doc.rect(margin, y, pageWidth - 2 * margin, notaBoxHeight, 'F');
    doc.setDrawColor(220, 200, 100);
    doc.rect(margin, y, pageWidth - 2 * margin, notaBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NOTA DE SEGURIDAD Y CONFIDENCIALIDAD DE LA INFORMACIÓN:', margin + 3, y + 7);
    doc.setFont('helvetica', 'normal');
    const notaSeg = doc.splitTextToSize(
      'Este documento contiene información de interés exclusivo del auditor y el auditado. Hasta tanto no se constituya como informe final y sea publicado en la página web de la ESAP, no podrá ser distribuido ni utilizado por terceros sin el consentimiento previo y por escrito del Jefe de la Oficina de Control Interno.',
      maxWidth - 6
    );
    doc.text(notaSeg, margin + 3, y + 14);
    y += notaBoxHeight + spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }

    // ========== ANTECEDENTES ==========
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ANTECEDENTES', margin, y);
    y += lineHeight + 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('MARCO NORMATIVO', margin, y);
    y += lineHeight + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const normas = Array.isArray(auditoria.marcoNormativo)
      ? auditoria.marcoNormativo
      : (auditoria.marcoNormativo || 'Ley 87 de 1993, Ley 80/1993, Ley 1150/2007, Ley 1474/2011, Decreto 1082/2015, Decreto 648/2017.').split(',').map((s) => s.trim());
    normas.slice(0, 8).forEach((n) => {
      if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
      const lineasN = doc.splitTextToSize(`• ${n}`, maxWidth - 4);
      doc.text(lineasN, margin + 2, y);
      y += lineasN.length * lineHeight + 2;
    });
    y += spaceSection;

    doc.setFont('helvetica', 'bold');
    doc.text('CONTEXTO GENERAL DE LA AUDITORÍA', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    const ctx = auditoria.contextoGeneral ||
      `De acuerdo con el programa de auditoría anual, se programó y ejecutó la Auditoría Interna a los procesos al interior de la ${unidad}. La verificación se desarrolló en las fechas establecidas.`;
    const lineasCtx = doc.splitTextToSize(ctx, maxWidth);
    doc.text(lineasCtx, margin, y);
    y += lineasCtx.length * lineHeight + spaceSection;

    if (auditoria.fechasReuniones) {
      const lineasReun = doc.splitTextToSize(auditoria.fechasReuniones, maxWidth);
      doc.text(lineasReun, margin, y);
      y += lineasReun.length * lineHeight + spaceSection;
    }
    y += spaceSection;
  }

  // ============================================
  // CUERPO DEL INFORME (datos generales + hallazgos)
  // ============================================
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const rowsDatos: [string, string][] = [
    ['Código de Auditoría', auditoria.codigo],
    ['Proceso Auditado', auditoria.nombre || auditoria.proceso],
    ['Auditor Líder', auditoria.auditorLider || 'No asignado'],
    ['Fecha de generación', fechaStr],
  ];

  rowsDatos.forEach(([label, value]) => {
    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '').substring(0, 90), 70, y);
    y += lineHeight + 2;
  });

  y += spaceSection;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (tipo === 'preliminar') {
    const inf = informe as InformePreliminarPDF;

    // ========== EJECUCIÓN DE LA AUDITORÍA ==========
    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('EJECUCIÓN DE LA AUDITORÍA', margin, y);
    y += lineHeight + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('A continuación se detalla lo verificado y validado en cada uno de los procesos auditados, a través de evidencias documentales o inspección en sitio:', margin, y);
    y += lineHeight * 2 + spaceSection;

    // Resumen de hallazgos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN DE HALLAZGOS IDENTIFICADOS', margin, y);
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

    if (listaHallazgos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('DETALLE DE HALLAZGOS IDENTIFICADOS', margin, y);
      y += 8;

      listaHallazgos.forEach((h, index) => {
        // Nueva página si no hay espacio (dejar ~45mm para al menos un bloque)
        if (y > pageHeight - FOOTER_MARGIN) {
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
          if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin + 5; }
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
          if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin + 5; }
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
          if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin + 5; }
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
    if (y > pageHeight - FOOTER_MARGIN) { doc.addPage(); y = margin + 5; }
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
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = margin;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('DECISIÓN FINAL POR HALLAZGO', margin, y);
      y += 8;

      listaHallazgosFinales.forEach((h, index) => {
        if (y > pageHeight - FOOTER_MARGIN) {
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
          if (y > pageHeight - FOOTER_MARGIN) {
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
    if (y > pageHeight - FOOTER_MARGIN) {
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
    if (y > pageHeight - FOOTER_MARGIN) {
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

