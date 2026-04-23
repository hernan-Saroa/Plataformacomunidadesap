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
  fechaReunionApertura?: string;
  fechaReunionCierre?: string;
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
  procesoAuditado?: string;
  declaracion?: string;
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

type TipoInforme = 'preliminar' | 'final' | 'ejecutivo';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Dibuja el encabezado institucional en la página activa y devuelve la Y donde termina */
function encabezadoInforme(doc: JsPDFType, tipo?: TipoInforme): number {
  const config = tipo === 'ejecutivo'
    ? DOCUMENTOS_PREDEFINIDOS.INFORME_EJECUTIVO_OCI
    : DOCUMENTOS_PREDEFINIDOS.INFORME_AUDITORIA_OCI;
  return dibujarEncabezadoInstitucional(doc as any, config as ConfiguracionDocumento, 10);
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
    const newY = encabezadoInforme(doc, (doc as any)._tipoInforme);
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
    y = encabezadoInforme(doc, (doc as any)._tipoInforme) + 4;
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

  // Guardar el tipo en el objeto doc para que checkPage lo use
  (doc as any)._tipoInforme = tipo;

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
  // El "consecutivo" es el radicado o el código técnico formateado como I-YYYY-XXXXXX
  let radicado = auditoria.radicado;
  if (!radicado && auditoria.codigo) {
    const parts = auditoria.codigo.split('-');
    if (parts.length >= 3) {
      const year = parts[1];
      const num = parts[2];
      radicado = `I-${year}-${num.padStart(6, '0')}`;
    } else {
      radicado = auditoria.codigo;
    }
  }
  if (!radicado) radicado = `I-${añoActual}-000001`;

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
  if (tipo === 'preliminar' || tipo === 'final' || tipo === 'ejecutivo') {
    const isFinal = tipo === 'final';
    // Logo institucional completo (escudo + texto) únicamente en la página 1
    const logoInstitucionalBase64 = await getLogoInstitucionalESAP();
    doc.addImage(logoInstitucionalBase64, 'PNG', margin, 13, 65, 22);
    
    // Bloque radicado / fecha (Estilo original solicitado)
    doc.setFontSize(8);
    const boxW = 55;
    const boxH = 14;
    const boxX = pageWidth - margin - boxW;
    const boxY = 20;
    
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.2);
    if ((doc as any).roundedRect) {
      (doc as any).roundedRect(boxX, boxY, boxW, boxH, 3, 3);
    } else {
      doc.rect(boxX, boxY, boxW, boxH);
    }
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Radicado: ${radicado}`, boxX + 3, boxY + 5);
    doc.text(`Fecha: ${fechaOficio}`, boxX + 3, boxY + 10);
    
    let y = boxY + boxH + 20;

    // Consecutivo y Ciudad
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (auditoria.codigo) {
      doc.text(auditoria.codigo, margin, y - 4);
    }
    doc.text('Bogotá, D.C.', margin, y);
    y += LH * 3;

    // Destinatario
    doc.setFont('helvetica', 'bold');
    doc.text('Doctora', margin, y);
    y += LH;
    doc.text(destinatario.toUpperCase(), margin, y);
    y += LH;
    doc.setFont('helvetica', 'normal');
    doc.text(cargoDest, margin, y);
    y += LH;
    doc.text(`Dirección Territorial ${unidad.replace('Dirección Territorial ', '')}`, margin, y);
    y += LH * 2;

    // Asunto
    doc.setFont('helvetica', 'bold');
    doc.text('Asunto:', margin, y);
    doc.setFont('helvetica', 'normal');
    const asuntoTxt = tipo === 'final'
      ? `Informe final auditoría interna de evaluación y seguimiento ${unidad} – Vigencia ${planAnualAño}.`
      : tipo === 'ejecutivo'
      ? `Informe ejecutivo auditoría interna de evaluación y seguimiento ${unidad} – Vigencia ${planAnualAño}.`
      : `Informe preliminar auditoría interna de evaluación y seguimiento ${unidad} – Vigencia ${planAnualAño}.`;
    const lAsunto = doc.splitTextToSize(asuntoTxt, tableW - 20);
    doc.text(lAsunto, margin + 20, y);
    y += (lAsunto.length * LH) + (LH * 2);

    // Saludo
    const primerNombre = (destinatario.includes(' ') ? destinatario.split(' ')[0] : destinatario);
    const saludo = `Respetada Doctora ${primerNombre}, reciba un cordial saludo:`;
    doc.text(saludo, margin, y);
    y += LH * 2;

    // Cuerpo
    const parrafosCuerpo = tipo === 'final'
      ? [
          `La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría del año ${añoActual}, remite para su conocimiento el Informe Final de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la ${unidad}, para el periodo comprendido entre el 1 de enero y el 31 de diciembre de ${planAnualAño - 1}.`,
          '',
          `La ${unidad} tiene plazo hasta el ${plazoPronunc}, para formular un plan de mejora el cual debe contener acciones con el objetivo de subsanar la(s) causa(s) raíz de los hallazgos formalizados.`,
          '',
          'De antemano, agradecemos su colaboración en el desarrollo de las funciones de esta dependencia.',
          '',
          'Cordialmente,',
        ].join('\n')
      : tipo === 'ejecutivo'
      ? [
          `La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría del año ${añoActual}, remite para su conocimiento el Informe Ejecutivo de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la ${unidad}, para el periodo comprendido entre el 1 de enero y el 31 de diciembre de ${planAnualAño - 1}.`,
          '',
          'Este documento resume los resultados definitivos y la evaluación del sistema de control interno del proceso auditado.',
          '',
          'De antemano, agradecemos su colaboración en el desarrollo de las funciones de esta dependencia.',
          '',
          'Cordialmente,',
        ].join('\n')
      : [
          `La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría del año ${añoActual}, remite para su conocimiento y pronunciamiento el Informe Preliminar de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la ${unidad}, para el periodo comprendido entre el 1 de enero y el 31 de diciembre de ${planAnualAño - 1}.`,
          '',
          `Así mismo, la ${unidad} tiene plazo hasta el ${plazoPronunc}, para que se pronuncie frente a cada uno de los hallazgos y recomendaciones incluidas en el informe preliminar, allegando los soportes y evidencias respectivos, con el objetivo que los hallazgos sean levantados o en su defecto declarada su firmeza.`,
          '',
          'De antemano, agradecemos su colaboración en el desarrollo de las funciones de esta dependencia.',
          '',
          'Cordialmente,',
        ].join('\n');

    const lineasCuerpo = doc.splitTextToSize(parrafosCuerpo, pageWidth - 2 * margin);
    doc.text(lineasCuerpo, margin, y);
    y += lineasCuerpo.length * LH + 15;

    // Firma
    doc.setFont('helvetica', 'bold');
    doc.text(jefe.toUpperCase(), margin, y);
    y += LH;
    doc.setFont('helvetica', 'normal');
    doc.text('Jefe Oficina de Control Interno', margin, y);
    y += SEC + 10;

    // Pie de carta
    doc.setFontSize(8);
    y = checkPage(doc, y, 25, FOOTER_MARGIN);
    doc.text(`Anexos: Informe ${isFinal ? 'Final' : 'Preliminar'} de Auditoría (${folios}) folios`, margin, y);
    y += LH;
    doc.text('Copia: N/A', margin, y);
    y += LH + 2;
    doc.text(`Elaboró: ${elaboro}`, margin, y);
    y += LH;
    doc.text(`Revisó: ${reviso}`, margin, y);
    y += LH;
    doc.text(`Aprobó: ${aprobo}`, margin, y);

    doc.addPage();
  }

  // Encabezado institucional en la página actual
  let y = encabezadoInforme(doc, tipo) + 4;

  // ─── DATOS FORMALES (tabla con bordes) ────────────────────────────────────
  let tituloInforme = '';
  if (tipo === 'preliminar') tituloInforme = 'Informe preliminar de auditoría de evaluación y seguimiento.';
  else if (tipo === 'ejecutivo') tituloInforme = 'Informe ejecutivo de auditoría de evaluación y seguimiento.';
  else tituloInforme = 'Informe final de auditoría de evaluación y seguimiento.';

  const tituloAud = (auditoria.tituloAuditoria ||
    `Auditoría interna basada en riesgos a los procesos al interior de la ${unidad} de la ESAP.`).toUpperCase();

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

  y += SEC + 4;

  // ── Declaración (Fuera de la tabla) ──
  y = checkPage(doc, y, 20, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.text('DECLARACIÓN:', margin, y);
  doc.setFont('helvetica', 'normal');
  const declDefault = 'La auditoría se realiza con base en el análisis de diferentes muestras aleatorias seleccionadas por los auditores, y se fundamenta en el siguiente soporte documental: expedientes, procesos y procedimientos del Sistema de Gestión, reportes de los sistemas de información, cruces y validaciones, página web, intranet y normas internas y externas, entre otros.';
  const decl = (auditoria as any).declaracion || declDefault;
  const lDecl = doc.splitTextToSize(decl, tableW);
  doc.text(lDecl, margin, y + LH);
  y += (lDecl.length * LH) + SEC + 4;

  // ── Instrumentos Decreto 648 ──
  y = checkPage(doc, y, 30, FOOTER_MARGIN);
  doc.setFont('helvetica', 'normal');
  const instrumentoIntro = 'En aplicación al Decreto 648 de 2017 Artículo 2.2.21.4.8, la Oficina de Control Interno incorpora los siguientes Instrumentos para la Actividad de la Auditoría Interna:';
  const lII = doc.splitTextToSize(instrumentoIntro, tableW);
  doc.text(lII, margin, y);
  y += (lII.length * LH) + 2;
  const instrumentos = [
    'Código de Ética del Auditor Interno que tiene como bases fundamentales, la integridad, objetividad, confidencialidad, conflictos de interés y competencia de éste.',
    'Estatuto de auditoría, en el cual se establecen y comunican las directrices fundamentales que definen el marco dentro del cual se desarrollan las actividades de la Oficina de Control Interno, según los lineamientos de las normas internacionales de auditoría.'
  ];
  instrumentos.forEach(ins => {
    const li = doc.splitTextToSize(`- ${ins}`, tableW - 8);
    doc.text(li, margin + 4, y);
    y += (li.length * LH) + 1;
    y = checkPage(doc, y, 10, FOOTER_MARGIN);
  });
  y += 4;

  // ── Carta de representación ──
  const fechaCarta = (auditoria as any).cartaRepresentacionFecha || '8 de julio 2025';
  y = checkPage(doc, y, 15, FOOTER_MARGIN);
  doc.setFont('helvetica', 'normal');
  const cartaText = `De acuerdo con la Carta de representación formalizada el ${fechaCarta}, la ${unidad} se comprometió a presentar a la Oficina de Control Interno información veraz, oportuna y de calidad.`;
  const lcarta = doc.splitTextToSize(cartaText, tableW);
  doc.text(lcarta, margin, y);
  y += (lcarta.length * LH) + 6;

  // ── Nota de Seguridad y Confidencialidad ──
  y = checkPage(doc, y, 25, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  const nsTitulo = 'NOTA DE SEGURIDAD Y CONFIDENCIALIDAD DE LA INFORMACIÓN:';
  doc.text(nsTitulo, margin, y);
  y += LH;
  doc.setFont('helvetica', 'normal');
  const textoNotaSeguridad = 'Este documento contiene información de interés exclusivo del auditor y el auditado para surtir los trámites establecidos en la Guía de Auditoría. En ese sentido, hasta tanto no se constituya como informe final y sea publicado en la página web de la ESAP, no podrá ser distribuido ni utilizado por terceros, ni se podrá hacer referencia a él en ningún otro asunto, sin el consentimiento previo y por escrito del Jefe de la Oficina de Control Interno.';
  const lNS = doc.splitTextToSize(textoNotaSeguridad, tableW);
  doc.text(lNS, margin, y);
  y += (lNS.length * LH) + SEC + 4;

  // ─── ANTECEDENTES Y CONTEXTO GENERAL ───────────────────────────────────────
  y = checkPage(doc, y, 20, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ANTECEDENTES Y CONTEXTO GENERAL', margin + (tableW / 2), y, { align: 'center' });
  y += LH + 4;

  // 1. MARCO NORMATIVO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1.1 MARCO NORMATIVO', margin, y);
  y += LH + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Extracción de normas (se mantiene igual)
  let nGenerales: string[] = [];
  let nEspecificas: string[] = [];
  
  if (typeof auditoria.marcoNormativo === 'object' && auditoria.marcoNormativo !== null) {
    nGenerales = (auditoria.marcoNormativo as any).generales || [];
    nEspecificas = (auditoria.marcoNormativo as any).especificas || [];
  } else {
    nGenerales = [
      'Constitución Política de Colombia 1991.',
      'Ley 87 de 1993 – Por la cual se establecen normas para el ejercicio del control interno.',
      'Ley 1474 de 2011 – Estatuto Anticorrupción.',
      'Decreto 1083 de 2015 – Único Reglamentario del Sector de Función Pública.',
      'MIPG – Modelo Integrado de Planeación y Gestión.'
    ];
    nEspecificas = [
      'Decreto 164 de 2021 – Estructura de la ESAP.',
      'Plan Institucional de Desarrollo de la ESAP.'
    ];
  }

  if (nGenerales.length > 0) {
    y = checkPage(doc, y, 8, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.text('Normas generales:', margin + 2, y);
    y += LH + 1;
    doc.setFont('helvetica', 'normal');
    nGenerales.forEach((n) => {
      y = checkPage(doc, y, 7, FOOTER_MARGIN);
      const ls = doc.splitTextToSize(`o  ${n}`, tableW - 10);
      doc.text(ls, margin + 6, y);
      y += ls.length * LH + 0.5;
    });
    y += 2;
  }
  if (nEspecificas.length > 0) {
    y = checkPage(doc, y, 8, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.text('Normas específicas:', margin + 2, y);
    y += LH + 1;
    doc.setFont('helvetica', 'normal');
    nEspecificas.forEach((n) => {
      y = checkPage(doc, y, 7, FOOTER_MARGIN);
      const ls = doc.splitTextToSize(`o  ${n}`, tableW - 10);
      doc.text(ls, margin + 6, y);
      y += ls.length * LH + 0.5;
    });
    y += 2;
  }
  y += SEC;

  // 2. DESCRIPCIÓN DE LA UNIDAD / CONTEXTO
  y = checkPage(doc, y, 15, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1.2 CONTEXTO DE LA AUDITORÍA Y DESCRIPCIÓN DE LA UNIDAD', margin, y);
  y += LH + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const descUnidad = auditoria.descripcionUnidad ||
    `La ${unidad} hace parte de la estructura organizacional de la Escuela Superior de Administración Pública – ESAP, ` +
    `entidad adscrita al Departamento Administrativo de la Función Pública.`;
  const lDesc = doc.splitTextToSize(descUnidad, tableW);
  y = checkPage(doc, y, lDesc.length * LH + 4, FOOTER_MARGIN);
  doc.text(lDesc, margin, y);
  y += lDesc.length * LH + 2;

  const ctxText = auditoria.contextoGeneral ||
    `En cumplimiento al Plan Anual de Auditoría Interna del año ${añoActual}, la Oficina de Control Interno ` +
    `ejecutó la Auditoría Interna a los procesos de la ${unidad}.`;
  const lCtx = doc.splitTextToSize(ctxText, tableW);
  y = checkPage(doc, y, lCtx.length * LH + 4, FOOTER_MARGIN);
  doc.text(lCtx, margin, y);
  y += lCtx.length * LH + SEC;

  // 3. EQUIPO Y REUNIONES
  y = checkPage(doc, y, 30, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1.3 EQUIPO AUDITOR Y REUNIONES SOSTENIDAS', margin, y);
  y += LH + 3;

  // Párrafo descriptivo de la unidad/territorial y Contexto ya se movieron arriba a ANTECEDENTES Y CONTEXTO GENERAL

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
            fecha: auditoria.fechaReunionApertura || auditoria.fechaEjecucionInicio || fechaOficio,
            lugar: auditoria.lugarEjecucion || 'Sede de la unidad auditada',
            participantes: auditoria.responsableUnidadAuditada 
              ? `Equipo Auditor OCI, ${auditoria.responsableUnidadAuditada}` 
              : 'Equipo Auditor OCI, Responsable de la Unidad Auditada',
          },
          {
            tipo: 'Reunión de Cierre',
            fecha: auditoria.fechaReunionCierre || auditoria.fechaEjecucionFin || fechaOficio,
            lugar: auditoria.lugarEjecucion || 'Sede de la unidad auditada',
            participantes: auditoria.responsableUnidadAuditada 
              ? `Equipo Auditor OCI, ${auditoria.responsableUnidadAuditada}` 
              : 'Equipo Auditor OCI, Responsable de la Unidad Auditada',
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

  // El resto del flujo de ejecución y hallazgos continúa según el tipo de informe.

  // ═══════════════════════════════════════════════════════════════════════════
  // CUERPO DEL REPORTE
  // ═══════════════════════════════════════════════════════════════════════════
  if (tipo === 'preliminar' || tipo === 'final' || tipo === 'ejecutivo') {
    const isEjecutivo = tipo === 'ejecutivo';
    const isFinal = tipo === 'final';
    const infPrelim = !isFinal && !isEjecutivo ? informe as InformePreliminarPDF : null;
    const infFinal = isFinal ? informe as InformeFinalPDF : null;

    // ── 1. EJECUCIÓN DE LA AUDITORÍA ──
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

    {
      const defaultProcesos: Array<{
        categoria: string;
        numero: number;
        nombre: string;
        objetivo?: string;
        riesgos?: string[];
        componentes?: Array<{ titulo: string; contenido: string }>;
      }> = [
        {
          categoria: 'PROCESO EVALUADO',
          numero: 1,
          nombre: `GESTIÓN INSTITUCIONAL`,
          objetivo: `Evaluar el cumplimiento de los procesos y controles vigentes.`,
          riesgos: [`Falla en el seguimiento a los planes de mejoramiento.`],
          componentes: [{ titulo: 'EVALUACIÓN:', contenido: `Se realizó revisión de evidencias y seguimiento a los procesos auditados.` }],
        }
      ];

      // 1.1 Si no hay procesos pero hay riesgos, crear proceso por defecto o agrupar
      let procesos = auditoria.procesosAuditados || [];
      
      if (!procesos.length) {
        const nombreBase = auditoria.procesoAuditado || auditoria.proceso || 'GESTIÓN INSTITUCIONAL';
        const riesgosBase = auditoria.riesgosIdentificados || [];

        // Si hay riesgos que mencionan un proceso específico (Proceso: Riesgo), podríamos agruparlos.
        // Pero para simplificar y "arreglarlo" rápido para el usuario:
        procesos = [{
          categoria: 'PROCESO EVALUADO',
          numero: 1,
          nombre: nombreBase.toUpperCase(),
          objetivo: auditoria.objetivo || `Evaluación de cumplimiento para ${nombreBase}.`,
          riesgos: riesgosBase,
          componentes: [{ 
            titulo: 'EVALUACIÓN:', 
            contenido: `Se realizó la revisión detallada de los procesos y controles asociados a la gestión de ${nombreBase}, considerando los riesgos identificados en la planeación.` 
          }]
        }];
      }

      if (!procesos.length) {
        procesos = defaultProcesos;
      }

      let tablaNum = 1;
      let categoriaActual = '';

      procesos.forEach((proc) => {
        // Categoría
        if (proc.categoria !== categoriaActual) {
          categoriaActual = proc.categoria;
          y = checkPage(doc, y, 14, FOOTER_MARGIN);
          doc.setFillColor(230, 230, 230);
          doc.rect(margin, y - 1, tableW, 8, 'F');
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(margin, y - 1, tableW, 8);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(proc.categoria.toUpperCase(), margin + 3, y + 4);
          y += 12;
        }

        // Nombre Proceso
        y = checkPage(doc, y, 14, FOOTER_MARGIN);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        const encabProc = `${proc.numero}.   ${proc.nombre.toUpperCase()}`;
        const lEncabProc = doc.splitTextToSize(encabProc, tableW);
        doc.text(lEncabProc, margin, y);
        y += lEncabProc.length * LH + 3;

        // Objetivo
        if (proc.objetivo) {
          y = checkPage(doc, y, 12, FOOTER_MARGIN);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Objetivo del proceso: ', margin, y);
          const objW = doc.getTextWidth('Objetivo del proceso: ');
          doc.setFont('helvetica', 'normal');
          const lineasObj = doc.splitTextToSize(proc.objetivo, tableW - objW);
          if (lineasObj.length > 0) doc.text(lineasObj[0], margin + objW, y);
          if (lineasObj.length > 1) {
            y += LH;
            doc.text(lineasObj.slice(1), margin, y);
            y += (lineasObj.length - 1) * LH;
          }
          y += 5;
        }

        // Los riesgos ya están en proc.riesgos desde la lógica de inicialización arriba.
        let riesgosAMostrar = proc.riesgos && proc.riesgos.length > 0 ? [...proc.riesgos] : [];


        if (riesgosAMostrar.length > 0) {
          y = tablaRiesgos(doc, margin, y, tableW, riesgosAMostrar, { numTabla: tablaNum, nombreProceso: proc.nombre, footerMargin: FOOTER_MARGIN });
          tablaNum++;
        }

        // Ejecución / Componentes (Sin repetir títulos de fase como Planeación/Ejecución)
        if (proc.componentes && proc.componentes.length > 0) {
          proc.componentes.forEach((comp) => {
            const tituloLimpio = comp.titulo.replace(':', '').toUpperCase().trim();
            const esTituloFase = ['PLANEACIÓN', 'EJECUCIÓN', 'PLANEACION', 'EJECUCION'].includes(tituloLimpio);
            
            if (!esTituloFase && comp.titulo.trim()) {
              y = checkPage(doc, y, 14, FOOTER_MARGIN);
              doc.setFont('helvetica', 'bold');
              doc.text(comp.titulo, margin, y);
              y += LH + 1;
            } else {
              y = checkPage(doc, y, 8, FOOTER_MARGIN);
            }
            
            doc.setFont('helvetica', 'normal');
            const lc = doc.splitTextToSize(comp.contenido, tableW);
            doc.text(lc, margin, y);
            y += lc.length * LH + 2;
          });
        }
        y += 4;
      });
    }

    // ── 2. PLANES DE MEJORAMIENTO (Solo para informes que NO sean preliminares) ──
    if (tipo !== 'preliminar') {
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
    }

    // ── 3. ASPECTOS RELEVANTES DE LA INFORMACIÓN ANALIZADA ──
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.text('ASPECTOS RELEVANTES DE LA INFORMACIÓN ANALIZADA:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const aspText = auditoria.aspectosRelevantes || 'No se registraron aspectos relevantes adicionales.';
    const lasp = doc.splitTextToSize(aspText, tableW);
    doc.text(lasp, margin, y);
    y += lasp.length * LH + SEC;

    // ── 4. EVALUACIÓN DEL CONTROL INTERNO DEL PROCESO ──
    y = checkPage(doc, y, 14, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.text('EVALUACIÓN DEL CONTROL INTERNO DEL PROCESO:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const evalText = auditoria.evaluacionControlInterno || 
      'Como resultado del trabajo desarrollado, se identifica que el control interno del proceso se encuentra en proceso de mejora.';
    const leval = doc.splitTextToSize(evalText, tableW);
    doc.text(leval, margin, y);
    y += leval.length * LH + SEC;

    // ── 5. FORTALEZAS ──
    if (auditoria.fortalezas && auditoria.fortalezas.length > 0) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.text('FORTALEZAS', margin + tableW / 2, y, { align: 'center' });
      y += 6;
      doc.setFont('helvetica', 'normal');
      auditoria.fortalezas.forEach((f, idx) => {
        const lineas = doc.splitTextToSize(f, tableW - 12);
        const hItem = Math.max(6, lineas.length * 4.5 + 2);
        y = checkPage(doc, y, hItem + 2, FOOTER_MARGIN);

        // Número con énfasis
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}.`, margin + 3, y + 4);
        
        doc.setFont('helvetica', 'normal');
        doc.text(lineas, margin + 9, y + 4);
        y += hItem + 1;
      });
      y += SEC;
    }

    // ── 6. RECOMENDACIONES ──
    const tieneRecsCategorias = auditoria.recomendacionesPorCategoria && auditoria.recomendacionesPorCategoria.length > 0;
    const listaH = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];
    const tieneRecsHallazgos = listaH.some((h) => h.recomendaciones && h.recomendaciones.length > 0);

    if (tieneRecsCategorias || tieneRecsHallazgos) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.text('RECOMENDACIONES', margin + tableW / 2, y, { align: 'center' });
      y += 6;
      doc.setFont('helvetica', 'normal');
      if (tieneRecsCategorias) {
        auditoria.recomendacionesPorCategoria!.forEach((cat) => {
          // Título de la Categoría
          const lCat = doc.splitTextToSize(cat.categoria.toUpperCase() + ':', tableW);
          y = checkPage(doc, y, lCat.length * LH + 4, FOOTER_MARGIN);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(lCat, margin, y);
          y += lCat.length * LH + 2;

          // Items de la Categoría
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          cat.items.forEach((item, idx) => {
            const lineasItem = doc.splitTextToSize(item, tableW - 12);
            const hItem = Math.max(6, lineasItem.length * 4.5 + 2);
            y = checkPage(doc, y, hItem + 2, FOOTER_MARGIN);
            
            // Bala/Número
            doc.setFont('helvetica', 'bold');
            doc.text(`${idx + 1}.`, margin + 3, y + 4);
            doc.setFont('helvetica', 'normal');
            doc.text(lineasItem, margin + 9, y + 4);
            y += hItem + 1;
          });
          y += 2; // Espacio entre categorías
        });
      }
      y += SEC;
    }

    // ── 7. RESULTADO DE CONTROVERSIAS (Solo Informe Final) ──
    if (isFinal && infFinal) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('RESULTADO DE CONTROVERSIAS', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const textoContr = `Total controversias resueltas: ${infFinal.controversiasResueltas}.\nHallazgos ajustados a partir de controversias: ${infFinal.hallazgosAjustados}.`;
      const lcontr = doc.splitTextToSize(textoContr, tableW);
      doc.text(lcontr, margin, y);
      y += lcontr.length * LH + SEC;
    }

    // ── 8. DETALLE DE HALLAZGOS (con Causa y Efecto) ──
    if (listaH.length > 0) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('HALLAZGOS', margin, y);
      y += 7;
      listaH.forEach((h, index) => {
        y = checkPage(doc, y, 20, FOOTER_MARGIN);
        const titH = `HALLAZGO No. ${index + 1}${h.titulo ? ' - ' + h.titulo.toUpperCase() : ''}`;
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(9);
        doc.text(titH, margin, y);
        y += LH + 2;
        if (h.descripcion) {
          doc.setFont('helvetica', 'bold'); doc.text('CONDICIÓN:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          const ld = doc.splitTextToSize(h.descripcion, tableW - 4);
          doc.text(ld, margin + 2, y); y += ld.length * LH + 2;
        }
        if (h.criterioIncumplido) {
          doc.setFont('helvetica', 'bold'); doc.text('CRITERIO(S):', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          const lcr = doc.splitTextToSize(h.criterioIncumplido, tableW - 4);
          doc.text(lcr, margin + 2, y); y += lcr.length * LH + 2;
        }
        if (h.causas && h.causas.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.text('CAUSA:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          const lca = doc.splitTextToSize(h.causas.join(' '), tableW - 4);
          doc.text(lca, margin + 2, y); y += lca.length * LH + 2;
        }
        if (h.efectos && h.efectos.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.text('CONSECUENCIA O EFECTOS:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          const le = doc.splitTextToSize(h.efectos.join(' '), tableW - 4);
          doc.text(le, margin + 2, y); y += le.length * LH + 2;
        }
        if (isFinal && h.decisionAuditor) {
          doc.setFont('helvetica', 'bold'); doc.text('DECISIÓN FINAL:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          doc.text(`${h.decisionAuditor.toUpperCase()}${h.codigo ? ' - ' + h.codigo : ''}`, margin + 2, y);
          y += LH + 2;
        }
        if (isFinal && h.fundamentacionTecnica) {
          doc.setFont('helvetica', 'bold'); doc.text('FUNDAMENTACIÓN TÉCNICA:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          const lft = doc.splitTextToSize(h.fundamentacionTecnica, tableW - 4);
          doc.text(lft, margin + 2, y); y += lft.length * LH + 2;
        }
        
        y = checkPage(doc, y, 10, FOOTER_MARGIN);
      });
      y += SEC;
    }

    // ── 9. RESUMEN DE HALLAZGOS IDENTIFICADOS ──
    y = checkPage(doc, y, 30, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMEN DE HALLAZGOS', margin, y);
    y += 6;
    {
      const colsSum = [15, 95, 30, 20];
      const rhSum = 7;
      const headLabels = ['No.', 'HALLAZGO', isFinal ? 'ESTADO' : 'GRAVEDAD', 'REPETITIVO'];
      doc.setFillColor(210, 210, 210);
      doc.rect(margin, y, tableW, rhSum, 'F');
      let cxs = margin;
      headLabels.forEach((lbl, i) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
        doc.text(lbl, cxs + 2, y + rhSum - 2);
        if (i < headLabels.length - 1) doc.line(cxs + colsSum[i], y, cxs + colsSum[i], y + rhSum);
        cxs += colsSum[i];
      });
      doc.rect(margin, y, tableW, rhSum);
      y += rhSum;
      listaH.forEach((h, i) => {
        const cellTxt = h.titulo || h.descripcion?.substring(0, 90) || 'Sin título';
        const linesCell = doc.splitTextToSize(cellTxt, colsSum[1] - 3);
        const rh0 = Math.max(7, linesCell.length * 4.5 + 3);
        y = checkPage(doc, y, rh0 + 2, FOOTER_MARGIN);
        doc.rect(margin, y, tableW, rh0);
        let rx0 = margin;
        doc.setFont('helvetica', 'normal'); doc.text(String(i + 1), rx0 + 2, y + 5);
        doc.line(rx0 + colsSum[0], y, rx0 + colsSum[0], y + rh0); rx0 += colsSum[0];
        doc.text(linesCell, rx0 + 2, y + 5);
        doc.line(rx0 + colsSum[1], y, rx0 + colsSum[1], y + rh0); rx0 += colsSum[1];
        doc.text(isFinal ? (h.estadoFinal || '—') : (h.gravedad || '—'), rx0 + 2, y + 5);
        doc.line(rx0 + colsSum[2], y, rx0 + colsSum[2], y + rh0);
        y += rh0;
      });
      y += SEC;
    }

    // ── 10. PLAZO PARA PLAN DE MEJORAMIENTO (Solo Informe Final) ──
    if (isFinal && infFinal) {
      y = checkPage(doc, y, 20, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PLAZO PARA EL PLAN DE MEJORAMIENTO', margin, y);
      y += LH + 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`El área auditada cuenta con ${infFinal.plazosPlanMejora || '15'} días calendario para la formulación del plan de mejora respectivo.`, margin, y);
      y += LH + SEC;
    }

    // ── 11. CONCLUSIONES ──
    y = checkPage(doc, y, 20, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONCLUSIONES', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const obsText = isFinal ? infFinal?.observacionesFinales : infPrelim?.observaciones;
    const lobs = doc.splitTextToSize(obsText || 'Sin conclusiones registradas.', tableW);
    doc.text(lobs, margin, y);
    y += lobs.length * LH + SEC;

    // Firma final
    y = checkPage(doc, y, 35, FOOTER_MARGIN);
    doc.text(`Bogotá D.C., ${fechaStr}`, margin, y);
    y += 20;
    if (jefe) {
      doc.setFont('helvetica', 'bold');
      doc.text(jefe, margin, y);
      y += LH;
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

  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIE INSTITUCIONAL EN TODAS LAS PÁGINAS (con numeración correcta)
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = (doc as any).getNumberOfPages?.() || 1;
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);
    // Página 1 es la carta: pie sin info de sede (ya pintado arriba),
    // solo actualizamos número. Páginas 2+ tienen encabezado institucional.
    if ((tipo === 'preliminar' || tipo === 'final') && i === 1) {
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
  let filename = '';
  if (tipo === 'preliminar') filename = `Informe_Preliminar_${auditoria.codigo}.pdf`;
  else if (tipo === 'ejecutivo') filename = `Informe_Ejecutivo_${auditoria.codigo}.pdf`;
  else filename = `Informe_Final_${auditoria.codigo}.pdf`;
  doc.save(filename);
}
