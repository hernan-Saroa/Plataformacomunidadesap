import type { jsPDF as JsPDFType } from 'jspdf';
import { dibujarEncabezadoInstitucional, dibujarPieInstitucional, DOCUMENTOS_PREDEFINIDOS, type ConfiguracionDocumento, getLogoESAP } from './pdfESAPHeader';

export interface EditorOverridesInforme {
  logoBase64?: string;
  objetivo?: string;
  alcance?: string;
  marcoNormativo?: string;
  contextoGeneral?: string;
  observaciones?: string;
  tablasFilas?: Record<string, string[][]>;
}

export const TABLAS_ESTRUCTURALES_DEF = [
  { key: 'consejo-academico', titulo: 'Miembros del Consejo Académico Territorial', cols: ['#', 'NOMBRE', 'CARGO', 'FECHA DE ELECCION', 'ACTO ADMINISTRATIVO', 'FECHA', 'OBSERVACION'] },
  { key: 'convenios-cetaps', titulo: 'Relación de convenios - CETAPS', cols: ['MUNICIPIO', 'AÑO DE APERTURA', 'PROGRAMAS', 'COHORTES', 'COMODATO', 'NÚMERO N°', 'FECHA CONVENIO', 'PLAZO'] },
  { key: 'asistencias-tecnicas', titulo: 'Asistencias Técnicas', cols: ['Dir. Territorial', 'DPTO', 'Municipio', 'Línea', 'Asistencia Técnica'] },
  { key: 'induccion-alto-gobierno', titulo: 'Inducción Alto Gobierno', cols: ['Municipio', 'Tipo', 'Modalidad', 'Nombre del Evento', 'Fecha', 'Horario', 'N° Participantes'] },
  { key: 'ejecucion-presupuestal', titulo: 'Ejecución Presupuestal', cols: ['PRESUPUESTO', 'Apropiación', 'CDP', 'RP', 'Obligaciones', 'Pagos', 'Saldo', '% EJEC'] },
  { key: 'cuentas-balance', titulo: 'Cuentas de Balance', cols: ['Código', 'Descripción', 'Saldo Inicial', 'Mov. Déb', 'Mov. Cré', 'Saldo Final', 'Variación', '% Vertical'] },
  { key: 'cuentas-resultado', titulo: 'Cuentas de Resultado', cols: ['Código', 'Descripción', 'Mov. Déb', 'Mov. Cré', '% Vertical'] },
];

/**
 * Dibuja el encabezado simplificado para la primera página (solo logo + radicado/fecha)
 */
async function dibujarEncabezadoPrimeraPagina(
  doc: JsPDFType,
  radicado: string,
  fechaOficio: string,
  margin: number
): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 10;
  const logoSize = 20;

  try {
    // Logo ESAP
    const logoBase64 = await getLogoESAP();
    doc.addImage(logoBase64, 'PNG', margin, yPos, logoSize, logoSize);
  } catch (error) {
    console.warn('No se pudo cargar el logo, usando texto fallback');
    doc.setFillColor(0, 61, 165);
    doc.circle(margin + 10, yPos + 10, 10, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('ESAP', margin + 10, yPos + 12, { align: 'center' });
  }

  // Nombre de la institución junto al logo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ESCUELA SUPERIOR DE', margin + logoSize + 3, yPos + 7);
  doc.text('ADMINISTRACIÓN PÚBLICA', margin + logoSize + 3, yPos + 12);

  // Radicado en recuadro (esquina superior derecha)
  const boxW = 58;
  const boxH = 16;
  const boxX = pageWidth - margin - boxW;
  const boxY = yPos + 19;
  const labelCol = boxX + 3;
  const valueCol = boxX + boxW - 3;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2);
  // Fila 1: Radicado
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Radicado:', labelCol, boxY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(radicado, valueCol, boxY + 5, { align: 'right' });
  // Fila 2: Fecha
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', labelCol, boxY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(fechaOficio, valueCol, boxY + 12, { align: 'right' });

  return yPos + logoSize + 5;
}

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
  /** Fecha y hora de la reunión de apertura (ej: 29 de julio de 2025 a las 11:30 am) */
  fechaReunionApertura?: string;
  /** Modalidad de la reunión de apertura: 'presencial' | 'virtual' */
  modalidadReunionApertura?: 'presencial' | 'virtual';
  /** Fecha y hora de la reunión de cierre (ej: 01 de agosto de 2025 a las 11:00 am) */
  fechaReunionCierre?: string;
  /** Modalidad de la reunión de cierre: 'presencial' | 'virtual' */
  modalidadReunionCierre?: 'presencial' | 'virtual';
  // --- Variables para secciones adicionales ---
  /** Fortalezas identificadas */
  fortalezas?: string[];
  /** Recomendaciones por proceso */
  recomendacionesPorProceso?: Array<{ proceso: string; recomendaciones: string[] }>;
  /** Planes de mejoramiento */
  planesMejoramiento?: Array<{ proceso: string; plan: string; plazo: string }>;
  /** Aspectos relevantes */
  aspectosRelevantes?: string[];
  /** Evaluación del control interno */
  evaluacionControlInterno?: string;
  /** Conclusiones */
  conclusiones?: string[];
  /** Anexos */
  anexos?: string[];
  /** Procesos auditados con detalles */
  procesosAuditados?: Array<{
    nombre: string;
    riesgos?: string[];
    componentes?: string[];
    hallazgos?: HallazgoPDF[];
  }>;
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
  hallazgosDetalle?: HallazgoPDF[],
  returnBlobUrl?: boolean,
  overrides?: EditorOverridesInforme
): Promise<string | void> {
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
  // ENCABEZADO PRIMERA PÁGINA (solo logo + radicado/fecha)
  // ============================================
  const radicado = auditoria.radicado || `I-2025-${auditoria.codigo.replace(/\D/g, '').slice(-6) || '000000'}`;
  const fechaOficio = auditoria.fechaOficio || new Date().toLocaleDateString('es-CO');

  let y = await dibujarEncabezadoPrimeraPagina(doc, radicado, fechaOficio, margin);

  // ============================================
  // CONFIGURACIÓN PARA PÁGINAS SIGUIENTES
  // ============================================
  const configDoc: ConfiguracionDocumento = {
    ...DOCUMENTOS_PREDEFINIDOS.INFORME_AUDITORIA_OCI,
    titulo:
      tipo === 'preliminar'
        ? 'INFORME PRELIMINAR DE AUDITORÍA'
        : 'INFORME FINAL DE AUDITORÍA',
    ...(overrides?.logoBase64 ? { logoImg: overrides.logoBase64 } : {}),
  };

  // Aplicar overrides de texto sobre los campos de auditoria
  if (overrides) {
    if (overrides.objetivo) (auditoria as any).objetivo = overrides.objetivo;
    if (overrides.alcance) (auditoria as any).alcance = overrides.alcance;
    if (overrides.marcoNormativo) (auditoria as any).marcoNormativo = overrides.marcoNormativo;
    if (overrides.contextoGeneral) (auditoria as any).contextoGeneral = overrides.contextoGeneral;
    if (overrides.observaciones && 'observaciones' in informe) (informe as any).observaciones = overrides.observaciones;
  }

  // Variable para rastrear si ya se agregó una página

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

    // Código de auditoría encima del destinatario
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(auditoria.codigo, margin, y);
    y += 7;

    // Destinatario
    doc.setFontSize(11);
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

    doc.setFontSize(11);
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

    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }

    // ============================================
    // TABLA DE DATOS GENERALES DEL INFORME (siempre en página 2)
    // ============================================
    doc.addPage();
    y = dibujarEncabezadoInstitucional(doc as any, configDoc);

    const tableData = [
      ['Tipo de Informe', tipo === 'preliminar' ? 'Informe Preliminar de Auditoría' : 'Informe Final de Auditoría'],
      ['Título de la Auditoría', auditoria.tituloAuditoria || `Auditoría interna basada en riesgos a los procesos objeto de auditoría, al interior de la ${auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'unidad auditada'} de la ESAP.`],
      ['Responsable de la Unidad Auditada', auditoria.responsableUnidadAuditada || auditoria.destinatarioNombre || 'Director(a) Territorial'],
      ['Lugar y Fecha de Ejecución', `${auditoria.lugarEjecucion || 'Sede de la unidad'} / ${auditoria.fechaEjecucionInicio || '—'} – ${auditoria.fechaEjecucionFin || '—'}`],
      ['Período de la Auditoría', auditoria.periodoAuditoria || 'Vigencia correspondiente'],
      ['Equipo Auditor', auditoria.equipoAuditor && auditoria.equipoAuditor.length > 0
        ? auditoria.equipoAuditor.map(m => `${m.nombre}${m.rol ? ` – ${m.rol}` : ''}`).join(', ')
        : `${auditoria.auditorLider || 'No asignado'} – Auditor Líder`],
      ['Objetivo(s)', auditoria.objetivo || `Evaluar el cumplimiento de las normas, directrices, procedimientos y regulaciones aplicables a la ${auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'unidad auditada'}, mediante la auditoría interna como actividad independiente y objetiva, con el fin de determinar el grado de eficiencia, eficacia y economía en la utilización de los recursos públicos.`],
      ['Alcance', auditoria.alcance || `La auditoría interna abarca la revisión y evaluación de los procesos, procedimientos y controles internos de la ${auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'unidad auditada'}, correspondiente al periodo ${auditoria.periodoAuditoria || 'auditado'}, con el objetivo de identificar oportunidades de mejora y fortalecimiento de la gestión institucional.`],
    ];

    const col1Width = 72;
    const col2Width = pageWidth - 2 * margin - col1Width;
    const rowHeight = 8;

    // Dibujar filas de datos
    tableData.forEach(([label, value]) => {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }

      // Establecer fuente ANTES de splitTextToSize para medición correcta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const labelLines = doc.splitTextToSize(label, col1Width - 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const valueStr = String(value || '');
      const valueLines = doc.splitTextToSize(valueStr, col2Width - 4);

      const lineH = 5;
      const currentRowHeight = Math.max(rowHeight, Math.max(labelLines.length, valueLines.length) * lineH + 4);

      // Bordes con línea divisoria vertical
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, col1Width + col2Width, currentRowHeight);
      doc.line(margin + col1Width, y, margin + col1Width, y + currentRowHeight);

      // Label (columna izquierda)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(labelLines, margin + 2, y + lineH);

      // Valor (columna derecha)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(valueLines, margin + col1Width + 2, y + lineH);

      y += currentRowHeight;
    });

    y += spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.text('DECLARACIÓN:', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    const declaracion = `La auditoría se realiza con base en el análisis de muestras seleccionadas por los auditores, expedientes, procesos, reportes de sistemas de información y normas aplicables. El trabajo de auditoría se llevó a cabo de acuerdo con las Normas de Auditoría Generalmente Aceptadas del Gobierno Colombiano, las cuales requieren que el auditor planifique y realice la auditoría con el fin de obtener seguridad razonable de que los estados financieros están libres de errores significativos, ya sean causados por errores o fraudes.`;
    const lineasDecl = doc.splitTextToSize(declaracion, maxWidth);
    doc.text(lineasDecl, margin, y);
    y += lineasDecl.length * lineHeight + spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }

    // ========== NOTA DE SEGURIDAD Y CONFIDENCIALIDAD ==========
    const notaBoxHeight = 28;
    if (y + notaBoxHeight > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFillColor(255, 250, 230);
    doc.rect(margin, y, pageWidth - 2 * margin, notaBoxHeight, 'F');
    doc.setDrawColor(220, 200, 100);
    doc.rect(margin, y, pageWidth - 2 * margin, notaBoxHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('NOTA DE SEGURIDAD Y CONFIDENCIALIDAD DE LA INFORMACIÓN:', margin + 3, y + 7);
    doc.setFont('helvetica', 'normal');
    const notaSeg = doc.splitTextToSize(
      'Este documento contiene información de interés exclusivo del auditor y el auditado. Hasta tanto no se constituya como informe final y sea publicado en la página web de la ESAP, no podrá ser distribuido ni utilizado por terceros sin el consentimiento previo y por escrito del Jefe de la Oficina de Control Interno.',
      maxWidth - 6
    );
    doc.text(notaSeg, margin + 3, y + 14);
    y += notaBoxHeight + spaceSection;

    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }

    // ========== ANTECEDENTES ==========
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('ANTECEDENTES', margin, y);
    y += lineHeight + 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('MARCO NORMATIVO', margin, y);
    y += lineHeight + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const normasDefault = [
      'Ley 87 de 1993 - Por la cual se dictan normas sobre Control Interno.',
      'Ley 80 de 1993 - Ley de Contratación Administrativa.',
      'Ley 1150 de 2007 - Por medio de la cual se modifica la Ley 80 de 1993.',
      'Ley 1474 de 2011 - Estatuto Anticorrupción.',
      'Decreto 1082 de 2015 - Decreto Único Reglamentario del Sector Administrativo de Planeación Nacional.',
      'Decreto 648 de 2017 - Por el cual se reglamenta la Ley 87 de 1993.',
      'Constitución Política de Colombia - Artículos relacionados con la función pública.',
      'Manual de Control Interno de la ESAP.'
    ];
    const normas = Array.isArray(auditoria.marcoNormativo)
      ? auditoria.marcoNormativo
      : auditoria.marcoNormativo
        ? auditoria.marcoNormativo.split(',').map((s) => s.trim())
        : normasDefault;
    normas.slice(0, 10).forEach((n) => {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      const lineasN = doc.splitTextToSize(`• ${n}`, maxWidth - 4);
      doc.text(lineasN, margin + 2, y);
      y += lineasN.length * lineHeight + 2;
    });
    y += spaceSection;

    doc.setFont('helvetica', 'bold');
    doc.text('CONTEXTO GENERAL DE LA AUDITORÍA', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    const unidadCtx = auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'unidad auditada';
    const ctx = auditoria.contextoGeneral ||
      `Dentro de las competencias de la Oficina de Control Interno, enmarcadas en la Ley 87 de 1993, esta evaluar la eficiencia, eficacia, y economia de los controles, asesorando a la Direccion General en la continuidad del proceso administrativo, la revaluacion de los planes establecidos y en la introduccion de los correctivos necesarios para el cumplimiento de las metas u objetivos previstos por la entidad.\n\nEs asi, que de acuerdo con el programa de auditoria anual de la vigencia ${new Date().getFullYear()}, que hace parte de un componente del plan de accion de la Oficina de Control Interno, se programo, aprobo y ejecuto Auditoria Interna a los Procesos de estrategicos, misionales y de apoyo al interior de la ${unidadCtx} de la Escuela Superior de Administracion Publica - ESAP.\n\nLa verificacion de los aspectos auditables se desarrollo en las fechas establecidas para la etapa de ejecucion del proceso auditor, donde se realizo la reunion de inicio el dia ${auditoria.fechaReunionApertura || '[fecha reunion de apertura]'} (${auditoria.modalidadReunionApertura || 'presencial'}) y la reunion de cierre el ${auditoria.fechaReunionCierre || '[fecha reunion de cierre]'} (${auditoria.modalidadReunionCierre || 'presencial'}), reunion en la cual el equipo auditor dio a conocer a los responsables de los procesos las fortalezas, recomendaciones y posibles hallazgos evidenciados durante el ejercicio auditor y que se pormenorizan en el presente informe.\n\nNota: La Oficina de Control Interno esta facultada para realizar recomendaciones durante las etapas de los procesos, su funcion es eminentemente preventiva para contrarrestar o advertir las posibles inconsistencias que pueda llegar a incurrir la entidad, sin que esta atribucion implique autorizar o refrendar los procedimientos administrativos de la entidad, so pena de incurrir en coadministracion.`;
    const lineasCtx = doc.splitTextToSize(ctx, maxWidth);
    doc.text(lineasCtx, margin, y);
    y += lineasCtx.length * lineHeight + spaceSection;
    y += spaceSection;
  }



  if (tipo === 'preliminar') {
    const inf = informe as InformePreliminarPDF;

    // ========== EJECUCIÓN DE LA AUDITORÍA ==========
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('EJECUCIÓN DE LA AUDITORÍA', margin, y);
    y += lineHeight + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('A continuación se detalla lo verificado y validado en cada uno de los procesos auditados, a través de evidencias documentales o inspección en sitio:', margin, y);
    y += lineHeight * 2 + spaceSection;

    // ---- Helpers para la estructura fija de procesos ----
    const chkPg = (espacio: number = 15) => {
      if (y > pageHeight - FOOTER_MARGIN - espacio) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        y += 6;
      }
    };

    const renderCategoria = (texto: string) => {
      chkPg(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(texto, margin, y);
      y += lineHeight + 5;
    };

    const renderProceso = (num: number, nombre: string, objetivo?: string) => {
      chkPg(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`${num}. ${nombre}`, margin, y);
      y += lineHeight + 3;
      doc.setFont('helvetica', 'bold');
      doc.text('Objetivo:', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      const objTexto = objetivo || '';
      if (objTexto) {
        const lineasObj = doc.splitTextToSize(objTexto, maxWidth - 20);
        doc.text(lineasObj, margin + 20, y);
        y += lineasObj.length * lineHeight + 2;
      } else {
        y += lineHeight + 2;
      }
    };

    let tablaCount = 1;
    const renderTablaRiesgos = (nombreProceso: string) => {
      chkPg(22);
      const tW = maxWidth;
      const rH = 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Tabla ${tablaCount++} Riesgos Proceso ${nombreProceso}`, margin + 4, y);
      y += lineHeight + 1;
      doc.setFillColor(13, 71, 161);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, tW, rH, 'FD');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Riesgos asociados al proceso', margin + tW / 2, y + 5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += rH;
      doc.rect(margin, y, tW, rH);
      doc.setFont('helvetica', 'normal');
      y += rH + 5;
    };

    const renderComponente = (titulo: string, nivel: number = 0) => {
      chkPg(12);
      const xOff = margin + 4 + nivel * 6;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(titulo, xOff, y);
      y += lineHeight + 2;
      // Espacio para contenido en blanco
      doc.setFont('helvetica', 'normal');
      y += lineHeight;
    };

    // Tabla Plan de Acción Institucional (columnas fijas del formato)
    const renderTablaPlaneAccion = () => {
      chkPg(45);
      const hdrH = 14;   // altura encabezado (texto multilínea)
      const rowH = 8;    // altura fila de datos
      const numFilas = 3;

      // Anchos de columna (total = tW ≈ 180 mm)
      const cols = [
        { label: 'Actividades de seguimiento',        w: 55 },
        { label: 'Proceso ESAP',                      w: 28 },
        { label: 'Indicador Anual',                   w: 30 },
        { label: 'Meta programada PAA vigencia 2024', w: 25 },
        { label: 'Meta ejecutada vigencia 2024',      w: 22 },
        { label: '% Cumplimiento por Meta',           w: 20 },
      ];

      // Título de la tabla
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Tabla ${tablaCount++} Plan de Acción Institucional.`, margin, y);
      y += lineHeight + 1;

      // Encabezado con fondo gris oscuro — dos pasadas para evitar que el fill tape el texto
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      const yHdr = y;
      let xc = margin;
      // Pasada 1: rectángulos rellenos
      cols.forEach(col => {
        doc.setFillColor(100, 100, 100);
        doc.rect(xc, yHdr, col.w, hdrH, 'FD');
        xc += col.w;
      });
      // Pasada 2: texto blanco encima
      xc = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      cols.forEach(col => {
        const lineas = doc.splitTextToSize(col.label, col.w - 2);
        const textY = yHdr + hdrH / 2 - ((lineas.length - 1) * 3.5) / 2 + 2.5;
        doc.text(lineas, xc + col.w / 2, textY, { align: 'center' });
        xc += col.w;
      });
      y += hdrH;

      // Filas de datos vacías
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (let i = 0; i < numFilas; i++) {
        xc = margin;
        cols.forEach(col => {
          doc.rect(xc, y, col.w, rowH);
          xc += col.w;
        });
        // Número de fila en la primera columna
        doc.text(`${i + 1}`, margin + 2, y + rowH - 2);
        y += rowH;
      }
      y += 5;
    };

    // Helper genérico para tablas estructurales (título + encabezado + filas)
    const renderTablaEstructural = (
      titulo: string,
      cols: { label: string; w: number }[],
      numFilas: number = 3,
      tablaKey?: string
    ) => {
      const filasData = tablaKey ? overrides?.tablasFilas?.[tablaKey] : undefined;
      const totalFilas = filasData?.length ?? numFilas;
      const hdrH = 14;
      const rowH = 8;
      chkPg(hdrH + rowH * totalFilas + lineHeight + 20);

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Tabla ${tablaCount++} ${titulo}`, margin, y);
      y += lineHeight + 1;

      // Pasada 1: rectángulos rellenos
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      const yHdrE = y;
      let xcE = margin;
      cols.forEach(col => {
        doc.setFillColor(100, 100, 100);
        doc.rect(xcE, yHdrE, col.w, hdrH, 'FD');
        xcE += col.w;
      });
      // Pasada 2: texto blanco
      xcE = margin;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(255, 255, 255);
      cols.forEach(col => {
        const lineas = doc.splitTextToSize(col.label, col.w - 2);
        const textY = yHdrE + hdrH / 2 - ((lineas.length - 1) * 3.5) / 2 + 2.5;
        doc.text(lineas, xcE + col.w / 2, textY, { align: 'center' });
        xcE += col.w;
      });
      y += hdrH;

      // Filas (con datos o vacías)
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      for (let i = 0; i < totalFilas; i++) {
        const rowData = filasData?.[i];
        xcE = margin;
        cols.forEach((col, j) => {
          doc.rect(xcE, y, col.w, rowH);
          if (rowData?.[j]) {
            const txt = doc.splitTextToSize(rowData[j], col.w - 2);
            doc.text(txt, xcE + 1, y + rowH / 2 + 1);
          }
          xcE += col.w;
        });
        y += rowH;
      }
      y += 5;
    };

    // ==========================================
    // I. ESTRATÉGICOS
    // ==========================================
    renderCategoria('I. ESTRATÉGICOS');

    renderProceso(1, 'DIRECCIÓNAMIENTO ESTRATÉGICO');
    renderTablaRiesgos('Direccionamiento Estratégico');
    // 1.1 Plan de acción
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('1.1 Plan de acción', margin + 4, y);
    y += lineHeight + 2;
    renderTablaPlaneAccion();

    renderProceso(2, 'EFECTIVIDAD INSTITUCIONAL');
    renderTablaRiesgos('Efectividad Institucional');
    renderComponente('2.1 Componente - Gestión documental');

    renderProceso(3, 'RELACIONAMIENTO CON LA CIUDADANÍA');
    renderTablaRiesgos('Relacionamiento con la Ciudadanía');
    renderComponente('3.1 Componente – PQRSDF');

    renderProceso(4, 'TRANSFORMACIÓN DIGITAL');
    renderTablaRiesgos('Transformación Digital');
    renderComponente('4.1 Componente - Servicios tecnológico y mesa de ayuda');

    // ==========================================
    // II. MISIONALES
    // ==========================================
    renderCategoria('II. MISIONALES');

    renderProceso(5, 'FORMACIÓN PARA LA VIDA');
    renderTablaRiesgos('Formación para la Vida');
    renderComponente('5.1 Componente - Registro y control');
    renderComponente('5.2 Componente – Gestión programas académicos');
    renderComponente('5.2.1 Actas del Consejo Académico Territorial', 1);
    renderTablaEstructural('Miembros del Consejo Académico Territorial vigencia.', [
      { label: '#', w: 8 }, { label: 'NOMBRE', w: 45 }, { label: 'CARGO', w: 35 },
      { label: 'FECHA DE ELECCION', w: 22 }, { label: 'ACTO ADMINISTRATIVO', w: 30 },
      { label: 'FECHA', w: 22 }, { label: 'OBSERVACION', w: 18 },
    ], 5, 'consejo-academico');
    renderComponente('5.2.2 Convenios Territorial', 1);
    renderTablaEstructural('Relación de convenios - CETAPS vigencia.', [
      { label: 'MUNICIPIO', w: 22 }, { label: 'AÑO DE APERTURA', w: 15 },
      { label: 'PROGRAMAS DE PREGRADO / POSTGRADO', w: 35 },
      { label: 'NUMERO DE COHORTES', w: 18 }, { label: 'COMODATO / ARRENDAMIENTO', w: 20 },
      { label: 'NÚMERO N°', w: 25 }, { label: 'FECHA CONVENIO', w: 25 }, { label: 'PLAZO', w: 20 },
    ], 4, 'convenios-cetaps');
    renderComponente('5.2.3 Microcurrículos Territorial', 1);
    renderComponente('5.3 Componente – Registro calificado');

    renderProceso(6, 'PROYECCIÓN Y EXTENSIÓN');
    renderTablaRiesgos('Proyección y Extensión');
    renderComponente('6.1 Componente – Asistencia Técnica');
    renderTablaEstructural('Asistencias Técnicas.', [
      { label: 'Dir. Territorial', w: 22 }, { label: 'DPTO', w: 18 },
      { label: 'Municipio', w: 25 }, { label: 'Línea', w: 40 },
      { label: 'Asistencia Técnica', w: 75 },
    ], 4, 'asistencias-tecnicas');
    renderComponente('6.2 Componente - Inducción Alto Gobierno (Capacitación y Asistencia Técnica)');
    renderTablaEstructural('Inducción Alto Gobierno.', [
      { label: 'Municipio', w: 25 }, { label: 'Tipo', w: 18 }, { label: 'Modalidad', w: 18 },
      { label: 'Nombre del Evento', w: 50 }, { label: 'Fecha', w: 22 },
      { label: 'Horario', w: 15 }, { label: 'N° Participantes', w: 32 },
    ], 4, 'induccion-alto-gobierno');
    renderComponente('6.3 Componente – Capacitación');
    renderComponente('6.4 Componente – Programa Graduados');

    // ==========================================
    // III. PROCESOS TRANSVERSALES
    // ==========================================
    renderCategoria('III PROCESOS TRANSVERSALES');

    renderProceso(7, 'GESTIÓN LEGAL');
    renderTablaRiesgos('Gestión Legal');
    renderComponente('7.1 Componente – Procesos judiciales');

    renderProceso(8, 'ADQUISICION DE BIENES Y SERVICIOS');
    renderTablaRiesgos('Adquisición de Bienes y Servicios');
    renderComponente('8.1 Componente – Contratación');

    renderProceso(9, 'PROCESO BIEN – ESTAR');
    renderTablaRiesgos('Bien – Estar');
    renderComponente('9.1 Componente - Programa de Bienestar Universitario');

    renderProceso(10, 'GESTIÓN FINANCIERA');
    renderTablaRiesgos('Gestión Financiera');
    renderComponente('10.1 Componente - Presupuesto');
    renderTablaEstructural('Ejecución Presupuestal.', [
      { label: 'PRESUPUESTO', w: 30 }, { label: 'Apropiación', w: 23 },
      { label: 'CDP', w: 23 }, { label: 'RP', w: 23 },
      { label: 'Obligaciones', w: 22 }, { label: 'Pagos', w: 22 },
      { label: 'Saldo', w: 22 }, { label: '% EJEC', w: 15 },
    ], 3, 'ejecucion-presupuestal');
    renderComponente('10.2 Componente – Contabilidad');
    renderTablaEstructural('Cuentas de Balance.', [
      { label: 'Código', w: 18 }, { label: 'Descripción', w: 42 },
      { label: 'Saldo Inicial', w: 24 }, { label: 'Mov. Déb', w: 24 },
      { label: 'Mov. Cré', w: 24 }, { label: 'Saldo Final', w: 24 },
      { label: 'Variación', w: 14 }, { label: '% Vertical', w: 10 },
    ], 5, 'cuentas-balance');
    renderTablaEstructural('Cuentas de Resultado.', [
      { label: 'Código', w: 20 }, { label: 'Descripción', w: 70 },
      { label: 'Mov. Déb', w: 30 }, { label: 'Mov. Cré', w: 30 },
      { label: '% Vertical', w: 30 },
    ], 5, 'cuentas-resultado');
    renderComponente('10.3 Componente – Recaudo y Cartera');
    renderComponente('10.4 Componente – Tesorería');

    renderProceso(11, 'GESTIÓN ADMINISTRATIVA');
    renderTablaRiesgos('Gestión Administrativa');
    renderComponente('11.1 Componente – Inventario');
    renderComponente('11.2 Componente – Infraestructura');

    renderProceso(12, 'GESTIÓN DEL TALENTO HUMANO');
    renderTablaRiesgos('Talento Humano');
    renderComponente('12.1 Componente Sistema de Gestión de Seguridad y Salud en el Trabajo - SGSST');
    renderComponente('12.2 Componente Gestión Profesoral');

    y += spaceSection;

    // Resumen de hallazgos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN DE HALLAZGOS IDENTIFICADOS', margin, y);
    y += 8;

    // ========== DETALLE DE HALLAZGOS ==========
    const listaHallazgos = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];

    if (listaHallazgos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('DETALLE DE HALLAZGOS IDENTIFICADOS', margin, y);
      y += 8;

      listaHallazgos.forEach((h, index) => {
        // Nueva página si no hay espacio (dejar ~45mm para al menos un bloque)
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }

        const headerHeight = 12;
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const tituloCorto = (h.titulo || h.descripcion?.substring(0, 80) || 'Sin título').trim();
        doc.text(
          `Hallazgo ${index + 1}: ${tituloCorto}${(h.titulo || h.descripcion || '').length > 80 ? '…' : ''}`,
          margin + 3,
          y + 5
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(
          `Gravedad: ${h.gravedad || 'N/A'}${h.codigo ? `  |  Código: ${h.codigo}` : ''}`,
          margin + 3,
          y + 9
        );

        y += headerHeight + 4;

        doc.setFontSize(11);
        doc.setTextColor(40, 40, 40);
        if (h.descripcion) {
          doc.setFont('helvetica', 'bold');
          doc.text('CONDICION:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const lineasDesc = doc.splitTextToSize(h.descripcion, maxWidth - 4);
          doc.text(lineasDesc, margin + 2, y);
          y += lineasDesc.length * 4 + 2;
        }
        if (h.criterioIncumplido) {
          if (y > pageHeight - FOOTER_MARGIN) {
            doc.addPage();
            y = dibujarEncabezadoInstitucional(doc as any, configDoc);
          }
          doc.setFont('helvetica', 'bold');
          doc.text('CRITERIOS:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const lineasCrit = doc.splitTextToSize(h.criterioIncumplido, maxWidth - 4);
          doc.text(lineasCrit, margin + 2, y);
          y += lineasCrit.length * 4 + 2;
        }
        if (h.causas && h.causas.length > 0) {
          if (y > pageHeight - FOOTER_MARGIN) {
            doc.addPage();
            y = dibujarEncabezadoInstitucional(doc as any, configDoc);
          }
          doc.setFont('helvetica', 'bold');
          doc.text('CAUSA:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const textoCausas = h.causas.join('; ');
          const lineasCausas = doc.splitTextToSize(textoCausas, maxWidth - 4);
          doc.text(lineasCausas, margin + 2, y);
          y += lineasCausas.length * 3.5 + 2;
        }
        if (h.efectos && h.efectos.length > 0) {
          if (y > pageHeight - FOOTER_MARGIN) {
            doc.addPage();
            y = dibujarEncabezadoInstitucional(doc as any, configDoc);
          }
          doc.setFont('helvetica', 'bold');
          doc.text('CONSECUENCIA O EFECTOS:', margin + 2, y);
          y += 4;
          doc.setFont('helvetica', 'normal');
          const textoEfectos = h.efectos.join('; ');
          const lineasEfectos = doc.splitTextToSize(textoEfectos, maxWidth - 4);
          doc.text(lineasEfectos, margin + 2, y);
          y += lineasEfectos.length * 3.5 + 2;
        }
        if (h.recomendaciones && h.recomendaciones.length > 0) {
          if (y > pageHeight - FOOTER_MARGIN) {
            doc.addPage();
            y = dibujarEncabezadoInstitucional(doc as any, configDoc);
          }
          doc.setFont('helvetica', 'bold');
          doc.text('RECOMENDACION AL RESPONSABLE:', margin + 2, y);
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

      // ========== RESUMEN FINAL DE HALLAZGOS (TABLA) ==========
      if (listaHallazgos.length > 0) {
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('RESUMEN DE HALLAZGOS', margin, y);
        y += 6;

        // Encabezado de tabla
        const colNo = 12;
        const colHallazgo = pageWidth - 2 * margin - colNo - 28;
        const colRepetitivo = 28;
        const tblRowH = 7;

        // Header row
        doc.setFillColor(220, 230, 242);
        doc.rect(margin, y, colNo + colHallazgo + colRepetitivo, tblRowH, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(margin, y, colNo, tblRowH);
        doc.rect(margin + colNo, y, colHallazgo, tblRowH);
        doc.rect(margin + colNo + colHallazgo, y, colRepetitivo, tblRowH);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('No.', margin + colNo / 2, y + 4.5, { align: 'center' });
        doc.text('Hallazgo', margin + colNo + colHallazgo / 2, y + 4.5, { align: 'center' });
        doc.text('Repetitivo', margin + colNo + colHallazgo + colRepetitivo / 2, y + 4.5, { align: 'center' });
        y += tblRowH;

        listaHallazgos.forEach((h, idx) => {
          const tituloResumen = h.titulo || h.descripcion?.substring(0, 100) || 'Sin titulo';
          const lineasResumen = doc.splitTextToSize(tituloResumen, colHallazgo - 4);
          const rowH = Math.max(tblRowH, lineasResumen.length * 4 + 2);

          if (y + rowH > pageHeight - FOOTER_MARGIN) {
            doc.addPage();
            y = dibujarEncabezadoInstitucional(doc as any, configDoc);
          }

          doc.setDrawColor(0, 0, 0);
          doc.rect(margin, y, colNo, rowH);
          doc.rect(margin + colNo, y, colHallazgo, rowH);
          doc.rect(margin + colNo + colHallazgo, y, colRepetitivo, rowH);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.text(String(idx + 1), margin + colNo / 2, y + rowH / 2 + 1.5, { align: 'center' });
          doc.text(lineasResumen, margin + colNo + 2, y + 4.5);
          doc.text('No', margin + colNo + colHallazgo + colRepetitivo / 2, y + rowH / 2 + 1.5, { align: 'center' });

          y += rowH;
        });
        y += 8;
      }
    }

    // Observaciones generales
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('OBSERVACIONES GENERALES', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const texto = inf.observaciones || `Con base en el trabajo realizado y la evidencia obtenida durante el proceso de auditoría, se presentan las siguientes observaciones sobre la gestión de la ${auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'unidad auditada'}. Se recomienda a la unidad auditada implementar las acciones correctivas necesarias para subsanar las deficiencias identificadas y fortalecer los controles internos.`;
    const lines = doc.splitTextToSize(texto, maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + spaceSection;

    // Fortalezas (siempre visible)
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('FORTALEZAS IDENTIFICADAS', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const listaFortalezas = (auditoria.fortalezas && auditoria.fortalezas.length > 0)
      ? auditoria.fortalezas
      : ['El equipo de trabajo demuestra disposicion y colaboracion durante el proceso de auditoria.'];
    listaFortalezas.forEach((fortaleza) => {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      const lineasF = doc.splitTextToSize(`- ${fortaleza}`, maxWidth - 4);
      doc.text(lineasF, margin + 2, y);
      y += lineasF.length * lineHeight + 2;
    });
    y += spaceSection;

    // Recomendaciones por proceso (siempre visible)
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RECOMENDACIONES', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const listaRecomendaciones = (auditoria.recomendacionesPorProceso && auditoria.recomendacionesPorProceso.length > 0)
      ? auditoria.recomendacionesPorProceso
      : [{ proceso: auditoria.unidadAuditable || auditoria.nombre || 'Unidad Auditada', recomendaciones: ['Implementar las acciones correctivas necesarias para subsanar los hallazgos identificados en el presente informe y fortalecer los controles internos del proceso.'] }];
    listaRecomendaciones.forEach((proc) => {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${proc.proceso}:`, margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      proc.recomendaciones.forEach((rec, recIdx) => {
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }
        const lineasRec = doc.splitTextToSize(`${recIdx + 1}. ${rec}`, maxWidth - 6);
        doc.text(lineasRec, margin + 4, y);
        y += lineasRec.length * lineHeight + 1;
      });
      y += 4;
    });
    y += spaceSection;

    // Planes de mejoramiento
    if (auditoria.planesMejoramiento && auditoria.planesMejoramiento.length > 0) {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PLANES DE MEJORAMIENTO', margin, y);
      y += lineHeight + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      auditoria.planesMejoramiento.forEach((plan) => {
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }
        doc.setFont('helvetica', 'bold');
        doc.text(`Proceso: ${plan.proceso}`, margin + 2, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const lineasPlan = doc.splitTextToSize(`Plan: ${plan.plan}`, maxWidth - 6);
        doc.text(lineasPlan, margin + 4, y);
        y += lineasPlan.length * lineHeight + 1;
        const lineasPlazo = doc.splitTextToSize(`Plazo: ${plan.plazo}`, maxWidth - 6);
        doc.text(lineasPlazo, margin + 4, y);
        y += lineasPlazo.length * lineHeight + 4;
      });
      y += spaceSection;
    }

    // Aspectos relevantes
    if (auditoria.aspectosRelevantes && auditoria.aspectosRelevantes.length > 0) {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ASPECTOS RELEVANTES', margin, y);
      y += lineHeight + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      auditoria.aspectosRelevantes.forEach((aspecto) => {
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }
        const lineasAsp = doc.splitTextToSize(`• ${aspecto}`, maxWidth - 4);
        doc.text(lineasAsp, margin + 2, y);
        y += lineasAsp.length * lineHeight + 2;
      });
      y += spaceSection;
    }

    // Evaluación del control interno (siempre visible)
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EVALUACION DEL CONTROL INTERNO', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const textoEvalCI = auditoria.evaluacionControlInterno ||
      `De acuerdo con los resultados de la auditoria, se evidencia que la unidad auditada mantiene controles basicos en sus procesos, sin embargo, se identificaron oportunidades de mejora en el cumplimiento de los procedimientos establecidos. Se recomienda fortalecer los mecanismos de seguimiento y control para garantizar la eficiencia operativa.`;
    const lineasEval = doc.splitTextToSize(textoEvalCI, maxWidth);
    doc.text(lineasEval, margin, y);
    y += lineasEval.length * lineHeight + spaceSection;

    // Conclusiones (siempre visible)
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONCLUSIONES', margin, y);
    y += lineHeight + 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const listaConclusiones = (auditoria.conclusiones && auditoria.conclusiones.length > 0)
      ? auditoria.conclusiones
      : [
          `La auditoria realizada a la ${auditoria.unidadAuditable || auditoria.nombre || 'unidad auditada'} permitio evaluar el cumplimiento de los procesos y controles establecidos para el periodo ${auditoria.periodoAuditoria || 'auditado'}.`,
          'Se identificaron hallazgos que requieren atencion por parte de la unidad auditada para el fortalecimiento del control interno.',
          'La Oficina de Control Interno realizara seguimiento al cumplimiento de las acciones de mejora propuestas.'
        ];
    listaConclusiones.forEach((conclusion, idx) => {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      const lineasConc = doc.splitTextToSize(`${idx + 1}. ${conclusion}`, maxWidth - 4);
      doc.text(lineasConc, margin + 2, y);
      y += lineasConc.length * lineHeight + 2;
    });
    y += spaceSection;

    // Anexos
    if (auditoria.anexos && auditoria.anexos.length > 0) {
      if (y > pageHeight - FOOTER_MARGIN) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ANEXOS', margin, y);
      y += lineHeight + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      auditoria.anexos.forEach((anexo, idx) => {
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }
        const lineasAnexo = doc.splitTextToSize(`${idx + 1}. ${anexo}`, maxWidth - 4);
        doc.text(lineasAnexo, margin + 2, y);
        y += lineasAnexo.length * lineHeight + 2;
      });
      y += spaceSection;
    }

    // ========== BLOQUE DE FIRMAS ==========
    if (y + 40 > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    y += 4;

    const elaboroFirma = auditoria.elaboro || auditoria.auditorLider || 'Auditor Lider';
    const revisoFirma = auditoria.reviso || auditoria.jefeOCI || 'Jefe Oficina de Control Interno';
    const aproboFirma = auditoria.aprobo || auditoria.jefeOCI || 'Jefe Oficina de Control Interno';

    const firmaColW = (pageWidth - 2 * margin) / 3;
    const firmaY = y;

    // Etiquetas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Elaboro:', margin + firmaColW * 0 + firmaColW / 2, firmaY, { align: 'center' });
    doc.text('Reviso:', margin + firmaColW * 1 + firmaColW / 2, firmaY, { align: 'center' });
    doc.text('Aprobo:', margin + firmaColW * 2 + firmaColW / 2, firmaY, { align: 'center' });
    y += 12;

    // Lineas de firma
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.4);
    const lineMarginInner = 6;
    doc.line(margin + lineMarginInner, y, margin + firmaColW - lineMarginInner, y);
    doc.line(margin + firmaColW + lineMarginInner, y, margin + firmaColW * 2 - lineMarginInner, y);
    doc.line(margin + firmaColW * 2 + lineMarginInner, y, margin + firmaColW * 3 - lineMarginInner, y);
    y += 4;

    // Nombres
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lineasElab = doc.splitTextToSize(elaboroFirma, firmaColW - 8);
    const lineasRev = doc.splitTextToSize(revisoFirma, firmaColW - 8);
    const lineasApr = doc.splitTextToSize(aproboFirma, firmaColW - 8);
    doc.text(lineasElab, margin + firmaColW * 0 + firmaColW / 2, y, { align: 'center' });
    doc.text(lineasRev, margin + firmaColW * 1 + firmaColW / 2, y, { align: 'center' });
    doc.text(lineasApr, margin + firmaColW * 2 + firmaColW / 2, y, { align: 'center' });
    y += Math.max(lineasElab.length, lineasRev.length, lineasApr.length) * 4 + 2;

    // Cargos
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.text('Auditor Lider', margin + firmaColW * 0 + firmaColW / 2, y, { align: 'center' });
    doc.text('Jefe OCI', margin + firmaColW * 1 + firmaColW / 2, y, { align: 'center' });
    doc.text('Jefe OCI', margin + firmaColW * 2 + firmaColW / 2, y, { align: 'center' });
    y += 8;

  } else {
    const inf = informe as InformeFinalPDF;

    const maxWidth = pageWidth - 40;

    // Resultado de controversias
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('RESULTADO DE CONTROVERSIAS', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
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
        y = dibujarEncabezadoInstitucional(doc as any, configDoc);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('DECISIÓN FINAL POR HALLAZGO', margin, y);
      y += 8;

      listaHallazgosFinales.forEach((h, index) => {
        if (y > pageHeight - FOOTER_MARGIN) {
          doc.addPage();
          y = dibujarEncabezadoInstitucional(doc as any, configDoc);
        }

        const headerHeight = 10;
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, y, pageWidth - 2 * margin, headerHeight);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        const tituloCorto = (h.titulo || h.descripcion?.substring(0, 80) || 'Sin título').trim();
        doc.text(
          `Hallazgo ${index + 1}: ${tituloCorto}${(h.titulo || h.descripcion || '').length > 80 ? '…' : ''}`,
          margin + 3,
          y + 4
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
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
            y = dibujarEncabezadoInstitucional(doc as any, configDoc);
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
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
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('PLAZO PARA EL PLAN DE MEJORAMIENTO', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const textoPlazo = `El área auditada cuenta con ${inf.plazosPlanMejora} días calendario para presentar el Plan de Mejoramiento correspondiente.`;
    lines = doc.splitTextToSize(textoPlazo, maxWidth);
    doc.text(lines, margin, y);

    y += lines.length * 5 + 10;

    // Observaciones finales
    if (y > pageHeight - FOOTER_MARGIN) {
      doc.addPage();
      y = dibujarEncabezadoInstitucional(doc as any, configDoc);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('OBSERVACIONES FINALES', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
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
    dibujarPieInstitucional(doc as any, i, true, totalPages);
  }

  if (returnBlobUrl) {
    return doc.output('datauristring');
  }
  // Descargar
  const filename =
    tipo === 'preliminar'
      ? `Informe_Preliminar_${auditoria.codigo}.pdf`
      : `Informe_Final_${auditoria.codigo}.pdf`;
  doc.save(filename);
}

