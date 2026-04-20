import type { jsPDF as JsPDFType } from 'jspdf';
import { dibujarEncabezadoInstitucional, dibujarPieInstitucional, DOCUMENTOS_PREDEFINIDOS, getLogoESAP, type ConfiguracionDocumento } from './pdfESAPHeader';
import { LOGO_INSTITUCIONAL_ESAP_B64 } from './logoInstitucionalESAP';

/** Logo institucional ESAP - cargado desde modulo dedicado (base64 correcto, sin red ni CORS) */
async function getLogoInstitucionalESAP(): Promise<string> {
  return LOGO_INSTITUCIONAL_ESAP_B64;
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
  radicado?: string;
  fechaOficio?: string;
  destinatarioNombre?: string;
  destinatarioCargo?: string;
  unidadAuditable?: string;
  fechaLimitePronunciamiento?: string;
  jefeOCI?: string;
  elaboro?: string;
  reviso?: string;
  aprobo?: string;
  // --- Variables para datos formales ---
  tituloAuditoria?: string;
  responsableUnidadAuditada?: string;
  lugarEjecucion?: string;
  fechaEjecucionInicio?: string;
  fechaEjecucionFin?: string;
  periodoAuditoria?: string;
  equipoAuditor?: Array<{ nombre: string; rol?: string }>;
  objetivo?: string;
  alcance?: string;
  marcoNormativo?: string | string[];
  contextoGeneral?: string;
  descripcionUnidad?: string;
  fechasReuniones?: string;
  /** Reuniones sostenidas durante la auditoría (apertura, cierre, etc.) */
  reuniones?: Array<{
    tipo: string;       // ej: 'Reunión de Apertura', 'Reunión de Cierre'
    fecha: string;      // ej: '15 de enero de 2025'
    lugar: string;      // ej: 'Sala de juntas - Sede Bogotá'
    participantes: string; // ej: 'Jefe OCI, Equipo Auditor, Responsable Proceso'
  }>;
  // --- Variables para secciones extendidas ---
  cartaRepresentacionFecha?: string;
  /** Año del Plan Anual de Auditoría al que pertenece esta auditoría (ej: 2025) */
  planAnualAño?: number;
  /** Período evaluado (ej: '1 de enero al 31 de diciembre de 2024') — distinto a las fechas de ejecución */
  periodoAuditadoTexto?: string;
  procesosAuditados?: Array<{
    categoria: string;
    numero: number;
    nombre: string;
    objetivo?: string;
    riesgos?: string[];
    componentes?: Array<{ titulo: string; contenido: string }>;
    /** Hallazgos encontrados en este proceso (referencia cruzada al detalle) */
    hallazgosIndices?: number[];
  }>;
  planesMejoramiento?: string;
  aspectosRelevantes?: string;
  evaluacionControlInterno?: string;
  fortalezas?: string[];
  recomendacionesPorCategoria?: Array<{ categoria: string; items: string[] }>;
  riesgosIdentificados?: string[];
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
  estadoFinal?: string;
  decisionAuditor?: string;
  fundamentacionTecnica?: string;
}

type TipoInforme = 'preliminar' | 'final';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Dibuja el encabezado EM-FO-003 en la página activa y devuelve la Y donde termina */
function encabezadoInforme(doc: JsPDFType): number {
  const config = DOCUMENTOS_PREDEFINIDOS.INFORME_AUDITORIA_OCI as ConfiguracionDocumento;
  return dibujarEncabezadoInstitucional(doc as any, config, 10);
}

/**
 * Verifica si queda espacio suficiente; si no, agrega página con encabezado.
 * Devuelve la Y actual (actualizada o reseteada).
 */
function checkPage(
  doc: JsPDFType,
  y: number,
  needed: number,
  footerMargin: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - footerMargin) {
    doc.addPage();
    const newY = encabezadoInforme(doc);
    dibujarPieInstitucional(doc as any, (doc as any).getNumberOfPages(), true);
    return newY + 4;
  }
  return y;
}

interface FilaTablaOpts { labelWidth?: number; fontSize?: number; footerMargin?: number }

/** Dibuja una fila de tabla con label en bold y texto envuelto. Devuelve nueva Y. */
function filaTabla(
  doc: JsPDFType,
  x: number,
  y: number,
  totalWidth: number,
  label: string,
  value: string,
  opts: FilaTablaOpts = {}
): number {
  const { labelWidth = 70, fontSize = 9, footerMargin = 40 } = opts;
  const pageHeight = doc.internal.pageSize.getHeight();
  const valueWidth = totalWidth - labelWidth - 4;

  doc.setFontSize(fontSize);
  const lineasLabel = doc.splitTextToSize(label, labelWidth - 4);
  const lineasValue = doc.splitTextToSize(value || '', valueWidth - 2);
  const numLineas = Math.max(lineasLabel.length, lineasValue.length);
  const rowH = numLineas * (fontSize * 0.35 + 1.6) + 4;

  // Nueva página si no cabe
  if (y + rowH > pageHeight - footerMargin) {
    doc.addPage();
    y = encabezadoInforme(doc) + 4;
    dibujarPieInstitucional(doc as any, (doc as any).getNumberOfPages(), true);
  }

  // Bordes
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(x, y, totalWidth, rowH);
  doc.line(x + labelWidth, y, x + labelWidth, y + rowH);

  // Label (bold)
  doc.setFont('helvetica', 'bold');
  doc.text(lineasLabel, x + 2, y + 4);

  // Valor (normal)
  doc.setFont('helvetica', 'normal');
  doc.text(lineasValue, x + labelWidth + 2, y + 4);

  return y + rowH;
}

interface TablaRiesgosOpts { numTabla: number; nombreProceso: string; fuente?: string; footerMargin: number }

/** Dibuja tabla de riesgos de proceso. Devuelve nueva Y. */
function tablaRiesgos(
  doc: JsPDFType,
  margin: number,
  y: number,
  tableW: number,
  riesgos: string[],
  opts: TablaRiesgosOpts
): number {
  const { numTabla, nombreProceso, fuente, footerMargin } = opts;
  // Título tabla
  y = checkPage(doc, y, 10, footerMargin);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(9);
  doc.text(`Tabla ${numTabla} Riesgos ${nombreProceso}.`, margin, y);
  y += 5;

  // Cabecera
  const colNum = 8;
  const colRiesgo = tableW - colNum;
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, tableW, 6, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, tableW, 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Riesgos asociados al proceso', margin + tableW / 2, y + 4, { align: 'center' });
  y += 6;

  // Filas riesgos
  riesgos.forEach((riesgo, i) => {
    const lineas = doc.splitTextToSize(riesgo, colRiesgo - 4);
    const rh = Math.max(7, lineas.length * 4 + 3);
    y = checkPage(doc, y, rh + 2, footerMargin);
    doc.setDrawColor(0, 0, 0);
    doc.rect(margin, y, tableW, rh);
    doc.line(margin + colNum, y, margin + colNum, y + rh);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(i + 1), margin + colNum / 2, y + rh / 2 + 1.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(lineas, margin + colNum + 2, y + 4);
    y += rh;
  });

  // Fuente
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(8);
  doc.text(`Fuente: ${fuente || 'ISOLUCIÓN ' + new Date().getFullYear()}.`, margin, y + 3);
  y += 7;
  return y;
}

// ─── Función principal ─────────────────────────────────────────────────────────

export async function exportarPDFInformeAuditoria(
  tipo: TipoInforme,
  auditoria: AuditoriaBasicaPDF,
  informe: InformePreliminarPDF | InformeFinalPDF,
  hallazgosDetalle?: HallazgoPDF[],
  returnBlobUrl: boolean = false
): Promise<void | string> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPDFType = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as unknown as JsPDFType;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const FOOTER_MARGIN = 40;
  const LH = 5;           // line height base
  const SEC = 6;          // space between sections
  const tableW = pageWidth - 2 * margin;

  const fechaStr =
    'fecha' in informe && informe.fecha
      ? new Date(informe.fecha).toLocaleDateString('es-CO')
      : new Date().toLocaleDateString('es-CO');

  const añoActual = new Date().getFullYear();
  // Año del Plan Anual: prioridad al campo explícito, luego metadata del plan, luego año de la fecha inicio
  const planAnualAño: number =
    auditoria.planAnualAño
    || (auditoria as any).programaAnualMetadata?.año
    || (auditoria.fechaEjecucionInicio ? new Date(auditoria.fechaEjecucionInicio).getFullYear() : añoActual);
  // Período auditado en texto (distinto a las fechas de ejecución de la auditoría)
  const periodoAuditadoTexto: string =
    auditoria.periodoAuditadoTexto
    || (auditoria as any).periodoAuditado
    || (auditoria as any).programaAnualMetadata?.periodoAuditado
    || auditoria.periodoAuditoria
    || 'el periodo correspondiente';

  // ─── Derivar valores ────────────────────────────────────────────────────────
  const radicado = auditoria.radicado || `I-${añoActual}-${auditoria.codigo?.replace(/\D/g, '').slice(-6) || '000000'}`;
  const fechaOficio = auditoria.fechaOficio || fechaStr;
  const cargoDest = auditoria.destinatarioCargo || 'Director(a) Territorial';
  // Si destinatarioNombre parece un ID (sin espacios y corto), usar cargo como nombre de display
  const rawDest = auditoria.destinatarioNombre || '';
  const destinatario = rawDest?.includes(' ') ? rawDest : cargoDest;
  const unidad = auditoria.unidadAuditable || auditoria.nombre || auditoria.proceso || 'Unidad Auditada';
  const plazoPronunc = auditoria.fechaLimitePronunciamiento || 'diez (10) días hábiles';
  // Solo usar jefeOCI si tiene un nombre real (con espacios o más de 5 chars con espacios)
  const jefeRaw = auditoria.jefeOCI || '';
  const jefe = (jefeRaw && jefeRaw.trim().length > 0) ? jefeRaw.trim() : '';
  const elaboro = auditoria.elaboro || auditoria.auditorLider || 'Auditor Líder';
  const reviso = auditoria.reviso || (jefe || 'Jefe Oficina de Control Interno');
  const aprobo = auditoria.aprobo || (jefe || 'Jefe Oficina de Control Interno');
  const folios = (informe as InformePreliminarPDF).foliosAnexos
    ?? (hallazgosDetalle?.length || 0) * 2 + 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // PÁGINA 1 — CARTA DE CUBIERTA (Estilo Oficio)
  // ═══════════════════════════════════════════════════════════════════════════
  if (tipo === 'preliminar') {
    // Logo institucional completo (escudo + texto) únicamente en la página 1
    // Se carga como base64 vía fetch para que jsPDF lo procese correctamente
    const logoInstitucionalBase64 = await getLogoInstitucionalESAP();
    doc.addImage(logoInstitucionalBase64, 'PNG', margin, 13, 65, 22);
    
    // Pie de página (página 1)
    dibujarPieInstitucional(doc as any, 1, true);

    // Bloque radicado / fecha (estilo redondeado y simplificado)
    doc.setFontSize(8);
    const boxW = 55;
    const boxH = 14;
    const boxX = pageWidth - margin - boxW;
    const boxY = 20;
    
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    // Rectángulo redondeado para el radicado
    (doc as any).roundedRect(boxX, boxY, boxW, boxH, 3, 3);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Radicado: ${radicado}`, boxX + 3, boxY + 5);
    doc.text(`Fecha: ${fechaOficio}`, boxX + 3, boxY + 10);
    
    let y = boxY + boxH + 20;

    // Código consecutivo (AUD-...) y Ciudad
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    if (auditoria.codigo) {
      doc.text(auditoria.codigo, margin, y);
      y += 5;
    }
    doc.text(`Bogotá, D.C.`, margin, y);
    y += 12;

    // Destinatario — nombre siempre en MAYÚSCULAS negrita
    const nombreDestDisplay = destinatario === cargoDest ? '' : destinatario.toUpperCase();
    if (nombreDestDisplay) {
      doc.setFont('helvetica', 'bold');
      doc.text(nombreDestDisplay, margin, y);
      y += 5;
    }
    doc.setFont('helvetica', 'normal');
    doc.text(cargoDest, margin, y);
    y += 5;
    doc.text(unidad, margin, y);
    y += 5;
    doc.text('E. S. D.', margin, y);
    y += 10;

    // Asunto — "Asunto:" en negrita, texto en normal, en la misma línea
    const asuntoValor = `Informe preliminar auditoría interna de evaluación y seguimiento ${unidad} – Vigencia correspondiente.`;
    const asuntoValorLineas = doc.splitTextToSize(asuntoValor, pageWidth - 2 * margin - 20);
    doc.setFont('helvetica', 'bold');
    doc.text('Asunto:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(asuntoValorLineas[0] || '', margin + 20, y);
    for (let i = 1; i < asuntoValorLineas.length; i++) {
      y += LH;
      doc.text(asuntoValorLineas[i], margin, y);
    }
    y += LH + SEC;

    // Saludo personalizado
    const nombreSaludo = destinatario === cargoDest ? '' : ` ${destinatario}`;
    const tratamiento = cargoDest.toLowerCase().includes('director')
      ? `Respetado(a) Doctor(a)${nombreSaludo}`
      : `Respetado(a) ${cargoDest}${nombreSaludo}`;

    // Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const parrafos = [
      `${tratamiento} reciba un cordial saludo:`,
      '',
      `La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría del año ${planAnualAño}, remite para su conocimiento y pronunciamiento el Informe Preliminar de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la ${unidad}, para el periodo comprendido entre ${periodoAuditadoTexto}.`,
      '',
      `Así mismo, la ${unidad} tiene plazo hasta el ${plazoPronunc}, para que se pronuncie frente a cada uno de los hallazgos y recomendaciones incluidas en el informe preliminar, allegando los soportes y evidencias respectivos, con el objetivo que los hallazgos sean levantados o en su defecto declarada su firmeza.`,
      '',
      'De antemano, agradecemos su colaboración en el desarrollo de las funciones de esta dependencia.',
      '',
      'Cordialmente,',
      '',
      '',
      ...(jefe ? [jefe] : []),
      'Jefe Oficina de Control Interno',
    ].join('\n');

    const lineasCuerpo = doc.splitTextToSize(parrafos, pageWidth - 2 * margin);
    doc.text(lineasCuerpo, margin, y);
    y += lineasCuerpo.length * LH + SEC;

    // Pie de carta
    doc.setFontSize(9);
    doc.text(`Anexos: Informe Preliminar de Auditoría (${folios}) folios`, margin, y);
    y += LH;
    doc.text('Copia: N/A', margin, y);
    y += LH + 2;
    doc.text(`Elaboró: ${elaboro}`, margin, y);
    y += LH;
    doc.text(`Revisó: ${reviso}`, margin, y);
    y += LH;
    doc.text(`Aprobó: ${aprobo}`, margin, y);

    // ═══════════════════════════════════════════════════════════════════════
    // PÁGINA 2 — CUERPO DEL INFORME
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage();
  }

  // Encabezado institucional EM-FO-003 en la página actual
  let y = encabezadoInforme(doc) + 4;

  // ─── DATOS FORMALES (tabla con bordes) ────────────────────────────────────
  const tituloInforme = tipo === 'preliminar'
    ? 'Informe preliminar de auditoría de evaluación y seguimiento.'
    : 'Informe final de auditoría de evaluación y seguimiento.';

  const tituloAud = auditoria.tituloAuditoria ||
    `Auditoría interna basada en riesgos a los procesos al interior de la ${unidad} de la ESAP.`;

  const lugar = auditoria.lugarEjecucion || 'Sede de la unidad';
  const fechEjIni = auditoria.fechaEjecucionInicio || '—';
  const fechEjFin = auditoria.fechaEjecucionFin || '—';

  // Opciones de tabla uniformes para TODAS las filas (alineación consistente)
  const TABLA_OPTS: FilaTablaOpts = { labelWidth: 65, fontSize: 9, footerMargin: FOOTER_MARGIN };

  // Fila: TIPO DE INFORME
  y = filaTabla(doc, margin, y, tableW, 'TIPO DE INFORME:', tituloInforme, TABLA_OPTS);

  // Fila: TITULO
  y = filaTabla(doc, margin, y, tableW,
    'TITULO DE LA AUDITORIA (unidad auditable):', tituloAud, TABLA_OPTS);

  // Fila: RESPONSABLE
  const rawResp = auditoria.responsableUnidadAuditada || '';
  const respFromDest = destinatario === cargoDest ? '' : destinatario;
  const respNombre = rawResp?.includes(' ') ? rawResp : respFromDest;
  const respUnidad = respNombre ? `${respNombre} – ${cargoDest}.` : cargoDest + '.';
  y = filaTabla(doc, margin, y, tableW, 'RESPONSABLE DE LA UNIDAD AUDITADA:', respUnidad, TABLA_OPTS);

  // Fila: LUGAR Y FECHA
  y = filaTabla(doc, margin, y, tableW,
    'LUGAR Y FECHA DE EJECUCIÓN AUDITORIA:',
    `${lugar} / ${fechEjIni} – ${fechEjFin}`, TABLA_OPTS);

  // Fila: PERIODO — muestra el periodo auditado real (no las fechas de ejecución de la auditoría)
  y = filaTabla(doc, margin, y, tableW,
    'PERIODO DE LA AUDITORIA:',
    auditoria.periodoAuditadoTexto
    || (auditoria as any).periodoAuditado
    || (auditoria as any).programaAnualMetadata?.periodoAuditado
    || auditoria.periodoAuditoria
    || 'Vigencia correspondiente.', TABLA_OPTS);

  // Fila: EQUIPO AUDITOR
  {
    const equipo = auditoria.equipoAuditor?.length
      ? auditoria.equipoAuditor
      : [{ nombre: auditoria.auditorLider || 'No asignado', rol: 'Auditor Líder' }];
    const equipoTexto = equipo.map((m) => m.nombre + (m.rol ? ' – ' + m.rol : '')).join('\n');
    y = filaTabla(doc, margin, y, tableW, 'EQUIPO AUDITOR:', equipoTexto, TABLA_OPTS);
  }

  // Fila: OBJETIVO
  const obj = auditoria.objetivo ||
    'Evaluar el cumplimiento de las normas, directrices, procedimientos y regulaciones aplicables, mediante la auditoría interna como actividad independiente y objetiva, identificando riesgos y evaluando controles.';
  y = filaTabla(doc, margin, y, tableW, 'OBJETIVO(S):', obj, TABLA_OPTS);

  // Fila: ALCANCE
  const alc = auditoria.alcance ||
    'La etapa de ejecución de la auditoría se realizará evaluando el desarrollo de las actividades, acciones y controles establecidos para el periodo correspondiente.';
  y = filaTabla(doc, margin, y, tableW, 'ALCANCE:', alc, TABLA_OPTS);

  // Fila: DECLARACIÓN
  const decl = 'La auditoría se realiza con base en el análisis de diferentes muestras aleatorias seleccionadas por los auditores, y se fundamenta en el siguiente soporte documental: expedientes, procesos y procedimientos del Sistema de Gestión, reportes de los sistemas de información, cruces y validaciones, página web, intranet y normas internas y externas, entre otros.';
  y = filaTabla(doc, margin, y, tableW, 'DECLARACIÓN:', decl, TABLA_OPTS);

  y += SEC;

  // ─── ANTECEDENTES ──────────────────────────────────────────────────────────
  y = checkPage(doc, y, 20, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('ANTECEDENTES', margin, y);
  y += LH + 3;

  // ── Marco Normativo ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MARCO NORMATIVO', margin, y);
  y += LH + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Normas base siempre incluidas
  const normasBase = [
    'Constitución Política de Colombia 1991.',
    'Ley 87 de 1993 – Por la cual se establecen normas para el ejercicio del control interno.',
    'Ley 489 de 1998 – Organización y funcionamiento de las entidades del orden nacional.',
    'Decreto 1083 de 2015 – Decreto Único Reglamentario del Sector de la Función Pública.',
    'Decreto 648 de 2017 – Por el cual se modifica y adiciona el Decreto 1083 de 2015 en relación con las disposiciones sobre el Subsistema de Control Interno.',
    'Ley 80 de 1993 – Estatuto General de Contratación de la Administración Pública.',
    'Ley 1150 de 2007 – Medidas para la eficiencia y la transparencia en la Ley 80 de 1993.',
    'Ley 1474 de 2011 – Estatuto Anticorrupción.',
    'Decreto 1082 de 2015 – Decreto Único Reglamentario del Sector Administrativo de Planeación Nacional.',
  ];

  let normasCustom: string[];
  if (Array.isArray(auditoria.marcoNormativo)) {
    normasCustom = auditoria.marcoNormativo;
  } else if (auditoria.marcoNormativo) {
    normasCustom = auditoria.marcoNormativo.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    normasCustom = [];
  }

  const todasNormas = normasCustom.length > 0 ? normasCustom : normasBase;

  // Agrupar: generales = primeras 5, específicas = resto
  const normasGenerales = todasNormas.slice(0, 5);
  const normasEspecificas = todasNormas.length > 5 ? todasNormas.slice(5) : [];

  if (normasGenerales.length > 0) {
    y = checkPage(doc, y, 8, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Normas generales:', margin + 2, y);
    y += LH + 1;
    doc.setFont('helvetica', 'normal');
    normasGenerales.forEach((n) => {
      y = checkPage(doc, y, 7, FOOTER_MARGIN);
      const ls = doc.splitTextToSize(`o  ${n}`, tableW - 10);
      doc.text(ls, margin + 6, y);
      y += ls.length * LH + 0.5;
    });
    y += 2;
  }
  if (normasEspecificas.length > 0) {
    y = checkPage(doc, y, 8, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Normas específicas:', margin + 2, y);
    y += LH + 1;
    doc.setFont('helvetica', 'normal');
    normasEspecificas.forEach((n) => {
      y = checkPage(doc, y, 7, FOOTER_MARGIN);
      const ls = doc.splitTextToSize(`o  ${n}`, tableW - 10);
      doc.text(ls, margin + 6, y);
      y += ls.length * LH + 0.5;
    });
    y += 2;
  }
  y += SEC;

  // ── Nota instrumentos Decreto 648 ──
  y = checkPage(doc, y, 25, FOOTER_MARGIN);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const notaInstrumentos =
    `En aplicación al Decreto 648 de 2017 Artículo 2.2.21.4.8, la Oficina de Control Interno ` +
    `incorpora los siguientes Instrumentos para la Actividad de la Auditoría Interna:`;
  const lni = doc.splitTextToSize(notaInstrumentos, tableW);
  doc.text(lni, margin, y);
  y += lni.length * LH + 2;
  ['1. Código de Ética del Auditor Interno.', '2. Estatuto de auditoría.'].forEach((item) => {
    const li = doc.splitTextToSize(item, tableW - 8);
    doc.text(li, margin + 6, y);
    y += li.length * LH + 1;
  });
  y += SEC;

  // ── Carta de representación ──
  if (auditoria.cartaRepresentacionFecha) {
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const cartaText =
      `De acuerdo con la Carta de representación formalizada el ${auditoria.cartaRepresentacionFecha}, ` +
      `la ${unidad} se comprometió a presentar a la Oficina de Control Interno información veraz, oportuna y de calidad.`;
    const lcarta = doc.splitTextToSize(cartaText, tableW);
    doc.text(lcarta, margin, y);
    y += lcarta.length * LH + SEC;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONTEXTO GENERAL DE LA AUDITORÍA
  // ═══════════════════════════════════════════════════════════════════════
  y = checkPage(doc, y, 20, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONTEXTO GENERAL DE LA AUDITORÍA', margin, y);
  y += LH + 3;

  // Párrafo descriptivo de la unidad/territorial
  const descUnidad = auditoria.descripcionUnidad ||
    `La ${unidad} hace parte de la estructura organizacional de la Escuela Superior de Administración Pública – ESAP, ` +
    `entidad adscrita al Departamento Administrativo de la Función Pública. Su misión es brindar formación ` +
    `y capacitación en administración pública, contribuyendo al fortalecimiento del Estado colombiano.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lDesc = doc.splitTextToSize(descUnidad, tableW);
  y = checkPage(doc, y, lDesc.length * LH + 4, FOOTER_MARGIN);
  doc.text(lDesc, margin, y);
  y += lDesc.length * LH + SEC;

  // Párrafo de contexto de la auditoría
  const ctxText = auditoria.contextoGeneral ||
    `De acuerdo con el Plan Anual de Auditoría Interna del año ${añoActual}, la Oficina de Control Interno ` +
    `programó y ejecutó la Auditoría Interna basada en riesgos a los procesos al interior de la ${unidad} ` +
    `de la ESAP. La verificación se realizó mediante la revisión de evidencias documentales, sistemas de ` +
    `información, expedientes, reportes e inspección en sitio.`;
  const lCtx = doc.splitTextToSize(ctxText, tableW);
  y = checkPage(doc, y, lCtx.length * LH + 4, FOOTER_MARGIN);
  doc.text(lCtx, margin, y);
  y += lCtx.length * LH + SEC;

  // ── Tabla EQUIPO AUDITOR ──
  y = checkPage(doc, y, 30, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Equipo Auditor:', margin, y);
  y += LH + 2;

  {
    const equipo = auditoria.equipoAuditor && auditoria.equipoAuditor.length > 0
      ? auditoria.equipoAuditor
      : [{ nombre: auditoria.auditorLider || 'No asignado', rol: 'Auditor Líder' }];

    // Cabecera
    const colsEq = [tableW * 0.5, tableW * 0.5];
    const rhEqH = 6;
    doc.setFillColor(210, 210, 210);
    doc.rect(margin, y, tableW, rhEqH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, tableW, rhEqH);
    doc.line(margin + colsEq[0], y, margin + colsEq[0], y + rhEqH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('NOMBRE', margin + 3, y + rhEqH - 1.5);
    doc.text('ROL / CARGO', margin + colsEq[0] + 3, y + rhEqH - 1.5);
    y += rhEqH;

    equipo.forEach((m) => {
      const nombreLines = doc.splitTextToSize(m.nombre || '', colsEq[0] - 5);
      const rolLines = doc.splitTextToSize(m.rol || 'Auditor', colsEq[1] - 5);
      const rhEq = Math.max(6, Math.max(nombreLines.length, rolLines.length) * 4.5 + 2);
      y = checkPage(doc, y, rhEq + 2, FOOTER_MARGIN);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, y, tableW, rhEq);
      doc.line(margin + colsEq[0], y, margin + colsEq[0], y + rhEq);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(nombreLines, margin + 3, y + 4.5);
      doc.text(rolLines, margin + colsEq[0] + 3, y + 4.5);
      y += rhEq;
    });
    y += SEC;
  }

  // ── Tabla REUNIONES SOSTENIDAS ──
  {
    const reuniones = auditoria.reuniones && auditoria.reuniones.length > 0
      ? auditoria.reuniones
      : [
          {
            tipo: 'Reunión de Apertura',
            fecha: auditoria.fechaEjecucionInicio || fechaOficio,
            lugar: auditoria.lugarEjecucion || 'Sede de la unidad auditada',
            participantes: 'Equipo Auditor OCI, Responsable de la Unidad Auditada',
          },
          {
            tipo: 'Reunión de Cierre',
            fecha: auditoria.fechaEjecucionFin || fechaOficio,
            lugar: auditoria.lugarEjecucion || 'Sede de la unidad auditada',
            participantes: 'Equipo Auditor OCI, Responsable de la Unidad Auditada',
          },
        ];

    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Reuniones sostenidas durante la auditoría:', margin, y);
    y += LH + 2;

    // Cabecera
    const cTipo = tableW * 0.22;
    const cFecha = tableW * 0.18;
    const cLugar = tableW * 0.28;
    const cPartic = tableW - cTipo - cFecha - cLugar;
    const colsReu = [cTipo, cFecha, cLugar, cPartic];
    const headReu = ['TIPO', 'FECHA', 'LUGAR', 'PARTICIPANTES'];
    const rhReuH = 6;

    doc.setFillColor(210, 210, 210);
    doc.rect(margin, y, tableW, rhReuH, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, tableW, rhReuH);
    let cx = margin;
    headReu.forEach((lbl, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(lbl, cx + 2, y + rhReuH - 1.5);
      if (i < headReu.length - 1) {
        doc.line(cx + colsReu[i], y, cx + colsReu[i], y + rhReuH);
      }
      cx += colsReu[i];
    });
    y += rhReuH;

    reuniones.forEach((r) => {
      const lTipo = doc.splitTextToSize(r.tipo, cTipo - 3);
      const lFecha = doc.splitTextToSize(r.fecha, cFecha - 3);
      const lLugar = doc.splitTextToSize(r.lugar, cLugar - 3);
      const lPartic = doc.splitTextToSize(r.participantes, cPartic - 3);
      const maxLines = Math.max(lTipo.length, lFecha.length, lLugar.length, lPartic.length);
      const rhReu = Math.max(8, maxLines * 4.5 + 3);
      y = checkPage(doc, y, rhReu + 2, FOOTER_MARGIN);
      doc.setDrawColor(0, 0, 0);
      doc.rect(margin, y, tableW, rhReu);
      let rx = margin;
      const cols4 = [lTipo, lFecha, lLugar, lPartic];
      cols4.forEach((lines, i) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(lines, rx + 2, y + 4);
        if (i < cols4.length - 1) {
          doc.line(rx + colsReu[i], y, rx + colsReu[i], y + rhReu);
        }
        rx += colsReu[i];
      });
      y += rhReu;
    });
    y += SEC;
  }

  // ─── NOTA DE SEGURIDAD (caja amarilla) ─────────────────────────────────────
  const notaH = 24;
  y = checkPage(doc, y, notaH + 4, FOOTER_MARGIN);
  doc.setFillColor(255, 250, 230);
  doc.rect(margin, y, tableW, notaH, 'F');
  doc.setDrawColor(180, 160, 60);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, tableW, notaH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('NOTA DE SEGURIDAD Y CONFIDENCIALIDAD DE LA INFORMACIÓN:', margin + 3, y + 6);
  doc.setFont('helvetica', 'normal');
  const notaSeg = doc.splitTextToSize(
    'Este documento contiene información de interés exclusivo del auditor y el auditado para surtir los trámites establecidos en la Guía de Auditoría. En ese sentido, hasta tanto no se constituya como informe final y sea publicado en la página web de la ESAP, no podrá ser distribuido ni utilizado por terceros, ni se podrá hacer referencia a él en ningún otro asunto, sin el consentimiento previo y por escrito del Jefe de la Oficina de Control Interno.',
    tableW - 6
  );
  doc.text(notaSeg, margin + 3, y + 12);
  y += notaH + SEC;

  // ═══════════════════════════════════════════════════════════════════════════
  // CUERPO SEGÚN TIPO
  // ═══════════════════════════════════════════════════════════════════════════
  if (tipo === 'preliminar') {
    const inf = informe as InformePreliminarPDF;

    // ── EJECUCIÓN DE LA AUDITORÍA ──
    y = checkPage(doc, y, 20, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('EJECUCIÓN DE LA AUDITORÍA', margin, y);
    y += LH + 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const introEjec =
      `A continuación, se detalla lo verificado y validado en cada uno de los procesos auditados, ` +
      `a través de evidencias documentales, sistemas de información institucional, expedientes, ` +
      `reportes de los sistemas de información, validaciones e inspección en sitio:`;
    const lejec = doc.splitTextToSize(introEjec, tableW);
    doc.text(lejec, margin, y);
    y += lejec.length * LH + SEC;

    // ── PROCESOS AUDITADOS (con datos o estructura por defecto) ──
    {
      // Procesos por defecto según estructura ESAP si no hay datos
      const defaultProcesos: typeof auditoria.procesosAuditados = [
        {
          categoria: 'I. PROCESOS ESTRATÉGICOS',
          numero: 1,
          nombre: `PROCESO DE EVALUACIÓN, CONTROL Y MEJORA`,
          objetivo: `Evaluar el estado del sistema de control interno de la entidad, verificar el cumplimiento de normas y procedimientos, identificar riesgos y recomendar acciones de mejora.`,
          riesgos: [
            `Falta de seguimiento oportuno a los planes de mejoramiento suscritos.`,
            `Inadecuado registro y archivo de la información de las auditorías realizadas.`,
            `Ausencia de metodologías actualizadas para la evaluación del riesgo institucional.`,
          ],
          componentes: [
            {
              titulo: 'PLANEACIÓN:',
              contenido: `Se verificó la existencia y aplicación del Plan Anual de Auditoría Interna, encontrando que el proceso cumple con los lineamientos establecidos en la normatividad vigente. Se evidenció la programación de actividades de auditoría acorde con los objetivos institucionales y los riesgos identificados.`,
            },
            {
              titulo: 'EJECUCIÓN:',
              contenido: `Se realizó revisión de los papeles de trabajo, evidencias documentales y seguimiento a las actividades programadas. Se verificó el cumplimiento de los procedimientos internos establecidos para el desarrollo de las auditorías internas.`,
            },
          ],
        },
        {
          categoria: 'II. PROCESOS MISIONALES',
          numero: 2,
          nombre: `PROCESO DE EDUCACIÓN SUPERIOR`,
          objetivo: `Ofertar y gestionar programas académicos de educación superior en administración pública, contribuyendo a la formación de servidores públicos idóneos para el Estado colombiano.`,
          riesgos: [
            `Incumplimiento de los requisitos de habilitación y acreditación de programas académicos.`,
            `Inadecuada gestión de los recursos destinados al funcionamiento de los programas académicos.`,
            `Deficiencias en la atención y seguimiento a la población estudiantil.`,
          ],
          componentes: [
            {
              titulo: 'PLANEACIÓN:',
              contenido: `Se verificaron los planes de estudio, el registro calificado de los programas y los procesos de matrícula. Se evidenció la actualización curricular acorde con los lineamientos del Ministerio de Educación Nacional.`,
            },
            {
              titulo: 'EJECUCIÓN:',
              contenido: `Se revisaron los procesos académicos, la calidad de la prestación del servicio educativo, los mecanismos de comunicación con estudiantes y la gestión de los recursos académicos y de infraestructura.`,
            },
          ],
        },
        {
          categoria: 'III. PROCESOS DE APOYO',
          numero: 3,
          nombre: `PROCESO DE GESTIÓN DE RECURSOS HUMANOS`,
          objetivo: `Gestionar el talento humano de la entidad mediante la planeación, vinculación, desarrollo y bienestar del personal, garantizando la prestación eficiente del servicio público.`,
          riesgos: [
            `Demoras en los procesos de selección y vinculación de personal.`,
            `Inadecuada gestión de las nóminas y liquidación de prestaciones sociales.`,
            `Incumplimiento de los programas de bienestar e incentivos al personal.`,
          ],
          componentes: [
            {
              titulo: 'PLANEACIÓN:',
              contenido: `Se verificó el Plan de Vacantes, la planta de personal autorizada y los procesos de selección meritocrática. Se revisaron los contratos de prestación de servicios y la vinculación de personal de carrera administrativa.`,
            },
            {
              titulo: 'EJECUCIÓN:',
              contenido: `Se revisaron las novedades de nómina, las liquidaciones de prestaciones sociales, los registros de asistencia y los programas de capacitación ejecutados durante el periodo auditado.`,
            },
          ],
        },
      ];

      const procesos = auditoria.procesosAuditados?.length
        ? auditoria.procesosAuditados
        : defaultProcesos ?? [];

      let tablaNum = 1;
      let categoriaActual = '';

      procesos.forEach((proc) => {
        // ── Cabecera de categoría ──
        if (proc.categoria !== categoriaActual) {
          categoriaActual = proc.categoria;
          y = checkPage(doc, y, 14, FOOTER_MARGIN);
          // Fondo gris claro para la categoría
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, y - 1, tableW, 8, 'F');
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(margin, y - 1, tableW, 8);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.text(proc.categoria.toUpperCase(), margin + 3, y + 4);
          y += 12;
        }

        // ── Número y nombre proceso ──
        y = checkPage(doc, y, 14, FOOTER_MARGIN);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const encabProc = `${proc.numero}.   ${proc.nombre.toUpperCase()}`;
        const lEncabProc = doc.splitTextToSize(encabProc, tableW);
        doc.text(lEncabProc, margin, y);
        y += lEncabProc.length * LH + 3;

        // ── Objetivo del proceso ──
        if (proc.objetivo) {
          y = checkPage(doc, y, 12, FOOTER_MARGIN);
          doc.setFontSize(9);
          const objLabel = 'Objetivo: ';
          const objW = doc.getTextWidth(objLabel);
          doc.setFont('helvetica', 'bold');
          doc.text(objLabel, margin, y);
          doc.setFont('helvetica', 'normal');
          const lineasObj = doc.splitTextToSize(proc.objetivo, tableW - objW);
          // Primera línea en la misma línea que el label
          if (lineasObj.length > 0) doc.text(lineasObj[0], margin + objW, y);
          if (lineasObj.length > 1) {
            y += LH;
            doc.text(lineasObj.slice(1), margin, y);
            y += (lineasObj.length - 1) * LH;
          }
          y += 5;
        }

        // ── Tabla de riesgos ──
        if (proc.riesgos && proc.riesgos.length > 0) {
          y = tablaRiesgos(doc, margin, y, tableW, proc.riesgos, { numTabla: tablaNum, nombreProceso: proc.nombre, footerMargin: FOOTER_MARGIN });
          tablaNum++;
        }

        // ── Componentes (PLANEACIÓN, EJECUCIÓN, etc.) ──
        if (proc.componentes && proc.componentes.length > 0) {
          proc.componentes.forEach((comp) => {
            y = checkPage(doc, y, 14, FOOTER_MARGIN);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(comp.titulo, margin, y);
            y += LH + 1;
            doc.setFont('helvetica', 'normal');
            const lc = doc.splitTextToSize(comp.contenido, tableW);
            doc.text(lc, margin, y);
            y += lc.length * LH + SEC;
          });
        }

        // ── Hallazgos dentro del proceso (si tiene índices) ──
        if (proc.hallazgosIndices && proc.hallazgosIndices.length > 0 && hallazgosDetalle && hallazgosDetalle.length > 0) {
          proc.hallazgosIndices.forEach((idx) => {
            const h = hallazgosDetalle[idx];
            if (!h) return;
            y = checkPage(doc, y, 20, FOOTER_MARGIN);
            const sufH = h.titulo ? ` - ${h.titulo.toUpperCase()}` : '';
            const titH = `HALLAZGO No. ${idx + 1}${sufH}`;
            doc.setFont('helvetica', 'bolditalic');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            const ltitH = doc.splitTextToSize(titH, tableW);
            doc.text(ltitH, margin, y);
            y += ltitH.length * LH + 2;
            if (h.descripcion) {
              y = checkPage(doc, y, 8, FOOTER_MARGIN);
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
              doc.text('CONDICIÓN:', margin, y); y += LH;
              doc.setFont('helvetica', 'normal');
              const ld = doc.splitTextToSize(h.descripcion, tableW - 4);
              doc.text(ld, margin + 2, y); y += ld.length * LH + 2;
            }
          });
        }

        y += 4; // Espacio entre procesos
      });
    }

    // ── RESUMEN HALLAZGOS (cajas) ──
    y = checkPage(doc, y, 30, FOOTER_MARGIN);
    // ── RESUMEN DE HALLAZGOS IDENTIFICADOS (tabla formal) ──
    y = checkPage(doc, y, 30, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('RESUMEN DE HALLAZGOS IDENTIFICADOS', margin, y);
    y += 6;

    {
      // Cabecera tabla resumen
      const colsSum = [15, 95, 25, 17];  // No | Hallazgo | Gravedad | Repetitivo
      const rhSum = 7;
      const headLabels = ['No.', 'HALLAZGO', 'GRAVEDAD', 'REPETITIVO'];
      doc.setFillColor(210, 210, 210);
      doc.rect(margin, y, tableW, rhSum, 'F');
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, y, tableW, rhSum);
      let cxs = margin;
      headLabels.forEach((lbl, i) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(lbl, cxs + 2, y + rhSum - 2);
        if (i < headLabels.length - 1) doc.line(cxs + colsSum[i], y, cxs + colsSum[i], y + rhSum);
        cxs += colsSum[i];
      });
      y += rhSum;

      const lista0 = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];
      if (lista0.length === 0) {
        // Fila vacía si no hay hallazgos
        const rh0 = 7;
        doc.rect(margin, y, tableW, rh0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Sin hallazgos identificados.', margin + colsSum[0] + 2, y + rh0 - 2);
        doc.line(margin + colsSum[0], y, margin + colsSum[0], y + rh0);
        doc.line(margin + colsSum[0] + colsSum[1], y, margin + colsSum[0] + colsSum[1], y + rh0);
        doc.line(margin + colsSum[0] + colsSum[1] + colsSum[2], y, margin + colsSum[0] + colsSum[1] + colsSum[2], y + rh0);
        y += rh0;
      } else {
        lista0.forEach((h, i) => {
          const cellTxt = h.titulo || h.descripcion?.substring(0, 90) || 'Sin título';
          const linesCell = doc.splitTextToSize(cellTxt, colsSum[1] - 3);
          const rh0 = Math.max(7, linesCell.length * 4.5 + 3);
          y = checkPage(doc, y, rh0 + 2, FOOTER_MARGIN);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(margin, y, tableW, rh0);
          let rx0 = margin;
          // No.
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
          doc.text(String(i + 1), rx0 + 2, y + 5);
          doc.line(rx0 + colsSum[0], y, rx0 + colsSum[0], y + rh0); rx0 += colsSum[0];
          // Hallazgo
          doc.text(linesCell, rx0 + 2, y + 5);
          doc.line(rx0 + colsSum[1], y, rx0 + colsSum[1], y + rh0); rx0 += colsSum[1];
          // Gravedad
          doc.text(h.gravedad || '—', rx0 + 2, y + 5);
          doc.line(rx0 + colsSum[2], y, rx0 + colsSum[2], y + rh0); rx0 += colsSum[2];
          // Repetitivo
          doc.text('No', rx0 + 2, y + 5);
          y += rh0;
        });
      }
      y += SEC;
    }

    // ── DETALLE DE HALLAZGOS ──
    const lista = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];

    if (lista.length > 0) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('HALLAZGOS', margin, y);
      y += 7;

      lista.forEach((h, index) => {
        y = checkPage(doc, y, 20, FOOTER_MARGIN);

        // Título hallazgo (cursiva bold como en el PDF original)
        const sufTit = h.titulo ? ' - ' + h.titulo.toUpperCase() : '';
        const titulo = `HALLAZGO No. ${index + 1}${sufTit}`;
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        const ltit = doc.splitTextToSize(titulo, tableW);
        doc.text(ltit, margin, y);
        y += ltit.length * LH + 3;

        // CONDICIÓN / Descripción
        if (h.descripcion) {
          y = checkPage(doc, y, 10, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('CONDICIÓN:', margin, y);
          y += LH;
          doc.setFont('helvetica', 'normal');
          const ld = doc.splitTextToSize(h.descripcion, tableW - 4);
          doc.text(ld, margin + 2, y);
          y += ld.length * LH + 2;
        }

        // CRITERIOS
        if (h.criterioIncumplido) {
          y = checkPage(doc, y, 10, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.text('CRITERIOS:', margin, y);
          y += LH;
          doc.setFont('helvetica', 'normal');
          const lc = doc.splitTextToSize(h.criterioIncumplido, tableW - 4);
          doc.text(lc, margin + 2, y);
          y += lc.length * LH + 2;
        }

        // CAUSA
        if (h.causas && h.causas.length > 0) {
          y = checkPage(doc, y, 10, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.text('CAUSA:', margin, y);
          y += LH;
          doc.setFont('helvetica', 'normal');
          const lca = doc.splitTextToSize(h.causas.join(' '), tableW - 4);
          doc.text(lca, margin + 2, y);
          y += lca.length * LH + 2;
        }

        // CONSECUENCIA / EFECTOS
        if (h.efectos && h.efectos.length > 0) {
          y = checkPage(doc, y, 10, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.text('CONSECUENCIA O EFECTOS:', margin, y);
          y += LH;
          doc.setFont('helvetica', 'normal');
          const le = doc.splitTextToSize(h.efectos.join(' '), tableW - 4);
          doc.text(le, margin + 2, y);
          y += le.length * LH + 2;
        }

        // Gravedad
        if (h.gravedad) {
          y = checkPage(doc, y, 8, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.text(`Gravedad: `, margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(h.gravedad + (h.codigo ? `  |  Código: ${h.codigo}` : ''), margin + 22, y);
          y += LH + 2;
        }

        y += 4;
      });
    }


    // ── RECOMENDACIONES ──
    const tieneRecsCategorias = auditoria.recomendacionesPorCategoria && auditoria.recomendacionesPorCategoria.length > 0;
    const tieneRecsHallazgos = lista.some((h) => h.recomendaciones && h.recomendaciones.length > 0);

    if (tieneRecsCategorias || tieneRecsHallazgos) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RECOMENDACIONES', margin + tableW / 2, y, { align: 'center' });
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const introRec = doc.splitTextToSize(
        'A continuación, se relacionan las recomendaciones que surgen del trabajo de auditoría realizado.',
        tableW
      );
      doc.text(introRec, margin, y);
      y += introRec.length * LH + SEC;

      if (tieneRecsCategorias) {
        auditoria.recomendacionesPorCategoria!.forEach((cat) => {
          y = checkPage(doc, y, 12, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          const catLabel = cat.categoria + ':';
          doc.text(catLabel, margin, y);
          const catW = doc.getTextWidth(catLabel);
          doc.line(margin, y + 0.5, margin + catW, y + 0.5);
          y += 5;
          doc.setFont('helvetica', 'normal');
          cat.items.forEach((item) => {
            y = checkPage(doc, y, 6, FOOTER_MARGIN);
            const li = doc.splitTextToSize(item, tableW);
            doc.text(li, margin, y);
            y += li.length * LH + 1;
          });
          y += 3;
        });
      } else {
        let recNum = 1;
        lista.forEach((h) => {
          if (h.recomendaciones && h.recomendaciones.length > 0) {
            h.recomendaciones.forEach((rec) => {
              y = checkPage(doc, y, 8, FOOTER_MARGIN);
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              const lr = doc.splitTextToSize(`${recNum}) ${rec}`, tableW);
              doc.text(lr, margin, y);
              y += lr.length * LH + 2;
              recNum++;
            });
          }
        });
      }
      y += SEC;
    }

    // ── PLANES DE MEJORAMIENTO ──
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PLANES DE MEJORAMIENTO:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const planText = auditoria.planesMejoramiento || 'La unidad auditada no cuenta con planes de mejoramiento vigentes.';
    const lplan = doc.splitTextToSize(planText, tableW);
    doc.text(lplan, margin, y);
    y += lplan.length * LH + SEC;

    // ── ASPECTOS RELEVANTES DE LA INFORMACIÓN ANALIZADA ──
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ASPECTOS RELEVANTES DE LA INFORMACIÓN ANALIZADA:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const aspText = auditoria.aspectosRelevantes || '';
    if (aspText) {
      const lasp = doc.splitTextToSize(aspText, tableW);
      doc.text(lasp, margin, y);
      y += lasp.length * LH + SEC;
    } else {
      y += SEC;
    }

    // ── EVALUACIÓN DEL CONTROL INTERNO DEL PROCESO ──
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    const evalLabel = 'EVALUACIÓN DEL CONTROL INTERNO DEL PROCESO: ';
    doc.text(evalLabel, margin, y);
    doc.setFont('helvetica', 'normal');
    const evalText = auditoria.evaluacionControlInterno ||
      'como resultado del trabajo desarrollado, se identifica que el control interno del proceso se encuentra en proceso de mejora.';
    const evalW = doc.getTextWidth(evalLabel);
    const leval = doc.splitTextToSize(evalText, tableW - evalW);
    if (leval.length === 1 && evalW + doc.getTextWidth(leval[0]) < tableW) {
      doc.text(leval[0], margin + evalW, y);
    } else {
      doc.text(leval, margin + evalW, y);
    }
    y += Math.max(leval.length, 1) * LH + SEC;

    // ── FORTALEZAS ──
    if (auditoria.fortalezas && auditoria.fortalezas.length > 0) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('FORTALEZAS', margin + tableW / 2, y, { align: 'center' });
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      auditoria.fortalezas.forEach((f) => {
        y = checkPage(doc, y, 6, FOOTER_MARGIN);
        const lf = doc.splitTextToSize(`o  ${f}`, tableW - 6);
        doc.text(lf, margin + 4, y);
        y += lf.length * LH + 1;
      });
      y += SEC;
    }

    // ── CONCLUSIONES ──
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONCLUSIONES', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const obsText = inf.observaciones || 'Sin observaciones registradas.';
    const lobs = doc.splitTextToSize(obsText, tableW);
    doc.text(lobs, margin, y);
    y += lobs.length * LH + SEC;

    // Firma final
    y = checkPage(doc, y, 30, FOOTER_MARGIN);
    doc.text(`Bogotá D.C., ${fechaStr}`, margin, y);
    y += 20;
    if (jefe) {
      doc.setFont('helvetica', 'bold');
      doc.text(jefe, margin, y);
      y += LH;
      doc.setFont('helvetica', 'normal');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    doc.text('Jefe Oficina de Control Interno', margin, y);
    y += LH + 4;
    doc.setFontSize(8);
    doc.text(`Elaboró: ${elaboro}`, margin, y);
    y += LH;
    doc.text(`Revisó: ${reviso}`, margin, y);
    y += LH;
    doc.text(`Aprobó: ${aprobo}`, margin, y);

  } else {
    // ── INFORME FINAL ──
    const inf = informe as InformeFinalPDF;

    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('RESULTADO DE CONTROVERSIAS', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const textoContr = `Total controversias resueltas: ${inf.controversiasResueltas}.\nHallazgos ajustados a partir de controversias: ${inf.hallazgosAjustados}.`;
    const lcontr = doc.splitTextToSize(textoContr, tableW);
    doc.text(lcontr, margin, y);
    y += lcontr.length * LH + SEC;

    const listaFinal = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];
    if (listaFinal.length > 0) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('DECISIÓN FINAL POR HALLAZGO', margin, y);
      y += 8;

      listaFinal.forEach((h, index) => {
        y = checkPage(doc, y, 14, FOOTER_MARGIN);
        const headerH = 10;
        doc.setFillColor(243, 244, 246);
        doc.rect(margin, y, tableW, headerH, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, y, tableW, headerH);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const tc = (h.titulo || h.descripcion?.substring(0, 80) || 'Sin título').trim();
        doc.text(`Hallazgo ${index + 1}: ${tc}`, margin + 3, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const est = h.estadoFinal || h.decisionAuditor || 'N/A';
        const codigoSuf = h.codigo ? '  |  Código: ' + h.codigo : '';
        doc.text(`Estado final: ${est}${codigoSuf}`, margin + 3, y + 8.2);
        y += headerH + 4;

        if (h.fundamentacionTecnica?.trim()) {
          y = checkPage(doc, y, 10, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.text('Fundamentación técnica:', margin + 2, y);
          y += LH;
          doc.setFont('helvetica', 'normal');
          const lf = doc.splitTextToSize(h.fundamentacionTecnica, tableW - 4);
          doc.text(lf, margin + 2, y);
          y += lf.length * 3.5 + 4;
        }
        y += 4;
      });
    }

    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PLAZO PARA EL PLAN DE MEJORAMIENTO', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lplazo = doc.splitTextToSize(
      `El área auditada cuenta con ${inf.plazosPlanMejora} días calendario para presentar el Plan de Mejoramiento.`,
      tableW
    );
    doc.text(lplazo, margin, y);
    y += lplazo.length * LH + SEC;

    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('OBSERVACIONES FINALES', margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lof = doc.splitTextToSize(inf.observacionesFinales || 'Sin observaciones finales.', tableW);
    doc.text(lof, margin, y);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIE INSTITUCIONAL EN TODAS LAS PÁGINAS (con numeración correcta)
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = (doc as any).getNumberOfPages?.() || 1;
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);
    // Página 1 es la carta: pie sin info de sede (ya pintado arriba),
    // solo actualizamos número. Páginas 2+ tienen encabezado institucional.
    if (tipo === 'preliminar' && i === 1) {
      // ya tiene el pie, solo asegurar número de página correcto
      dibujarPieInstitucional(doc as any, i, false);
    } else {
      dibujarPieInstitucional(doc as any, i, true);
    }
  }

  if (returnBlobUrl) {
    return doc.output('bloburl') as string;
  }

  // Guardar
  const filename =
    tipo === 'preliminar'
      ? `Informe_Preliminar_${auditoria.codigo}.pdf`
      : `Informe_Final_${auditoria.codigo}.pdf`;
  doc.save(filename);
}
