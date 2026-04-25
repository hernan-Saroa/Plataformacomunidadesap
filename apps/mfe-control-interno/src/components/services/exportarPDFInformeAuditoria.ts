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
  focos?: string[];
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
  marcoNormativo?: string | string[] | { generales: string[]; especificas: string[] };
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
function encabezadoInforme(doc: JsPDFType, tipo?: TipoInforme, proceso?: string): number {
  const configBase = tipo === 'ejecutivo'
    ? DOCUMENTOS_PREDEFINIDOS.INFORME_EJECUTIVO_OCI
    : DOCUMENTOS_PREDEFINIDOS.INFORME_AUDITORIA_OCI;
  
  const config = {
    ...configBase,
    proceso: proceso || configBase.proceso
  };

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
    dibujarPieInstitucional(doc as any, (doc as any).getNumberOfPages(), true);
    doc.setTextColor(0, 0, 0); 
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5); // Restaurar tamaño base del cuerpo
    return 20; 
  }
  return y;
}

/** Imprime un párrafo manejando saltos de página línea a línea */
function imprimirParrafo(
  doc: JsPDFType, 
  texto: string, 
  x: number, 
  y: number, 
  width: number, 
  lh: number, 
  footerMargin: number
): number {
  if (!texto) return y;
  const lineas = doc.splitTextToSize(texto, width);
  lineas.forEach((linea: string) => {
    y = checkPage(doc, y, lh, footerMargin);
    doc.text(linea, x, y);
    y += lh;
  });
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
  const { labelWidth = 70, fontSize = 11, footerMargin = 40 } = opts;
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

  doc.setFontSize(10.5); // Restaurar tamaño estándar tras fila de tabla
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
  doc.setFontSize(11);
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
  doc.setFontSize(11);
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
    doc.setFontSize(11);
    doc.text(String(i + 1), margin + colNum / 2, y + rh / 2 + 1.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(lineas, margin + colNum + 2, y + 4);
    y += rh;
  });

  // Fuente
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(11);
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
  const LH = 4.5;         // interlineado más profesional (4.5mm)
  const SEC = 5.5;        // espacio entre bloques
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

  // Guardar datos en doc para checkPage
  (doc as any)._procesoAuditado = auditoria.proceso || 'EVALUACIÓN CONTROL Y MEJORA';

  // Margen superior inicial para el cuerpo del informe
  let y = 20; 
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10.5);

  // Si es la primera página del cuerpo (Página 2 si hay carta), podríamos poner un título pequeño
  if (doc.getNumberOfPages() > 1) {
    y = 25;
  }

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
  const TABLA_OPTS: FilaTablaOpts = { labelWidth: 65, fontSize: 11, footerMargin: FOOTER_MARGIN };

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

  // Fila: PERIODO
  y = filaTabla(doc, margin, y, tableW,
    'PERIODO DE LA AUDITORIA:',
    auditoria.periodoAuditadoTexto || 'Vigencia correspondiente.', TABLA_OPTS);


  // Fila: OBJETIVO
  const obj = auditoria.objetivo ||
    'Evaluar el cumplimiento de las normas, directrices, procedimientos y regulaciones aplicables, mediante la auditoría interna como actividad independiente y objetiva, identificando riesgos y evaluando controles.';
  y = filaTabla(doc, margin, y, tableW, 'OBJETIVO(S):', obj, TABLA_OPTS);

  // Fila: ALCANCE
  const alc = auditoria.alcance ||
    'La etapa de ejecución de la auditoría se realizará evaluando el desarrollo de las actividades, acciones y controles establecidos para el periodo correspondiente.';
  y = filaTabla(doc, margin, y, tableW, 'ALCANCE:', alc, TABLA_OPTS);

  y += SEC + 4;

  // ── Declaración ──
  y = checkPage(doc, y, 20, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DECLARACIÓN:', margin, y);
  doc.setFont('helvetica', 'normal');
  const declDefault = 'La auditoría se realiza con base en el análisis de diferentes muestras aleatorias seleccionadas por los auditores, y se fundamenta en el siguiente soporte documental: expedientes, procesos y procedimientos del Sistema de Gestión, reportes de los sistemas de información, cruces y validaciones, página web, intranet y normas internas y externas, entre otros.';
  const decl = (auditoria as any).declaracion || declDefault;
  y = imprimirParrafo(doc, decl, margin, y + LH, tableW, LH, FOOTER_MARGIN);
  y += SEC + 4;

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
  y = imprimirParrafo(doc, cartaText, margin, y, tableW, LH, FOOTER_MARGIN);
  y += 6;

  // ── Nota de Seguridad y Confidencialidad ──
  y = checkPage(doc, y, 25, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const nsTitulo = 'NOTA DE SEGURIDAD Y CONFIDENCIALIDAD DE LA INFORMACIÓN:';
  doc.text(nsTitulo, margin, y);
  y += LH;
  doc.setFont('helvetica', 'normal');
  const textoNotaSeguridad = 'Este documento contiene información de interés exclusivo del auditor y el auditado para surtir los trámites establecidos en la Guía de Auditoría. En ese sentido, hasta tanto no se constituya como informe final y sea publicado en la página web de la ESAP, no podrá ser distribuido ni utilizado por terceros, ni se podrá hacer referencia a él en ningún otro asunto, sin el consentimiento previo y por escrito del Jefe de la Oficina de Control Interno.';
  y = imprimirParrafo(doc, textoNotaSeguridad, margin, y, tableW, LH, FOOTER_MARGIN);
  y += SEC + 4;

  // ─── ANTECEDENTES Y CONTEXTO GENERAL ───────────────────────────────────────
  y = checkPage(doc, y, 20, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. ANTECEDENTES Y CONTEXTO GENERAL', margin + (tableW / 2), y, { align: 'center' });
  y += LH + 4;

  // 1. MARCO NORMATIVO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1.1 MARCO NORMATIVO', margin, y);
  y += LH + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  let nGenerales: string[] = [];
  let nEspecificas: string[] = [];
  if (typeof auditoria.marcoNormativo === 'object' && auditoria.marcoNormativo !== null) {
    nGenerales = (auditoria.marcoNormativo as any).generales || [];
    nEspecificas = (auditoria.marcoNormativo as any).especificas || [];
  }

  if (nGenerales.length > 0) {
    y = checkPage(doc, y, 8, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Normas generales:', margin + 2, y);
    y += LH + 1;
    nGenerales.forEach((n) => {
      y = checkPage(doc, y, LH + 1, FOOTER_MARGIN);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const ls = doc.splitTextToSize(`o  ${n}`, tableW - 10);
      doc.text(ls, margin + 6, y);
      y += ls.length * LH + 0.2; 
    });
    y += 2;
  }
  if (nEspecificas.length > 0) {
    y = checkPage(doc, y, 8, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Normas específicas:', margin + 2, y);
    y += LH + 1;
    nEspecificas.forEach((n) => {
      y = checkPage(doc, y, LH + 1, FOOTER_MARGIN);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10.5);
      const ls = doc.splitTextToSize(`o  ${n}`, tableW - 10);
      doc.text(ls, margin + 6, y);
      y += ls.length * LH + 0.2;
    });
    y += 2;
  }
  y += SEC;

  // 2. CONTEXTO / DESCRIPCIÓN
  y = checkPage(doc, y, 15, FOOTER_MARGIN);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1.2 CONTEXTO DE LA AUDITORÍA Y DESCRIPCIÓN DE LA UNIDAD', margin, y);
  y += LH + 3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  y = imprimirParrafo(doc, auditoria.descripcionUnidad || '', margin, y, tableW, LH, FOOTER_MARGIN);
  y += 2;
  doc.setFontSize(10.5);
  y = imprimirParrafo(doc, auditoria.contextoGeneral || '', margin, y, tableW, LH, FOOTER_MARGIN);
  y += SEC;

  y += SEC;

  if (tipo === 'preliminar' || tipo === 'final' || tipo === 'ejecutivo') {
    const isEjecutivo = tipo === 'ejecutivo';
    const isFinal = tipo === 'final';
    const infPrelim = !isFinal && !isEjecutivo ? informe as InformePreliminarPDF : null;
    const infFinal = isFinal ? informe as InformeFinalPDF : null;

    y = checkPage(doc, y, 20, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('2. EJECUCIÓN DE LA AUDITORÍA', margin, y);
    y += LH + 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const intro = 'A continuación, se detalla lo verificado y validado en cada uno de los procesos auditados...';
    const lIntro = doc.splitTextToSize(intro, tableW);
    y = imprimirParrafo(doc, intro, margin, y, tableW, LH, FOOTER_MARGIN);
    y += SEC;

    // Aquí iría el bucle de procesos...
    const procesos = auditoria.procesosAuditados || [];
    procesos.forEach((proc, idx) => {
       y = checkPage(doc, y, 25, FOOTER_MARGIN);
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(11);
       // Numeración como sub-sección de ejecución (2.1, 2.2, etc.)
       const numProc = `2.${idx + 1}`;
       doc.text(`${numProc}. ${proc.nombre.toUpperCase()}`, margin, y);
       y += LH + 1;

       if (proc.objetivo) {
         doc.setFont('helvetica', 'italic');
         doc.setFontSize(10.5);
         const lObj = doc.splitTextToSize(`Objetivo: ${proc.objetivo}`, tableW - 5);
         doc.text(lObj, margin + 2, y);
         y += lObj.length * LH + 2;
       }

       // Tabla de riesgos si existen
       if (proc.riesgos && proc.riesgos.length > 0) {
         y = tablaRiesgos(doc, margin, y, tableW, proc.riesgos, {
           numTabla: idx + 1,
           nombreProceso: proc.nombre,
           footerMargin: FOOTER_MARGIN
         });
       }

       // Texto de ejecución (Pruebas / Resultados)
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(10.5);
       const textoEj = (proc as any).ejecucion || 'Se verificaron los controles y evidencias del proceso conforme al plan de auditoría.';
       y = imprimirParrafo(doc, textoEj, margin, y, tableW, LH, FOOTER_MARGIN);
       y += SEC;
    });

    // Fortalezas, Recomendaciones, Conclusiones (Sin numeración de sección 5, 6, 7)
    if (auditoria.fortalezas && auditoria.fortalezas.length > 0) {
      y = checkPage(doc, y, 20, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.text('FORTALEZAS', margin + tableW / 2, y, { align: 'center' });
      y += 6;
      doc.setFont('helvetica', 'normal');
      auditoria.fortalezas.forEach(f => {
        const lf = doc.splitTextToSize(`• ${f}`, tableW - 5);
        doc.text(lf, margin + 2, y);
        y += lf.length * LH + 1;
        y = checkPage(doc, y, 10, FOOTER_MARGIN);
      });
      y += SEC;
    }

    // ── DETALLE DE HALLAZGOS ──
    const listaH = hallazgosDetalle && hallazgosDetalle.length > 0 ? hallazgosDetalle : [];
    if (listaH.length > 0) {
      y = checkPage(doc, y, 14, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('HALLAZGOS', margin, y);
      y += 7;
      listaH.forEach((h, index) => {
        y = checkPage(doc, y, 20, FOOTER_MARGIN);
        const titH = `HALLAZGO No. ${index + 1}${h.titulo ? ' - ' + h.titulo.toUpperCase() : ''}`;
        doc.setFont('helvetica', 'bolditalic');
        doc.setFontSize(11);
        doc.text(titH, margin, y);
        y += LH + 1;
        if (h.descripcion) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('CONDICIÓN:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          y = imprimirParrafo(doc, h.descripcion, margin + 2, y, tableW - 4, LH, FOOTER_MARGIN);
          y += 2;
        }
        if (h.criterioIncumplido) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('CRITERIO(S):', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          y = imprimirParrafo(doc, h.criterioIncumplido, margin + 2, y, tableW - 4, LH, FOOTER_MARGIN);
          y += 2;
        }
        if (h.causas && h.causas.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('CAUSA:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          y = imprimirParrafo(doc, h.causas.join(' '), margin + 2, y, tableW - 4, LH, FOOTER_MARGIN);
          y += 2;
        }
        if (h.efectos && h.efectos.length > 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('CONSECUENCIA O EFECTOS:', margin, y); y += LH;
          doc.setFont('helvetica', 'normal');
          y = imprimirParrafo(doc, h.efectos.join(' '), margin + 2, y, tableW - 4, LH, FOOTER_MARGIN);
          y += 2;
        }
        y = checkPage(doc, y, 10, FOOTER_MARGIN);
      });
      y += SEC;
    }

    // ── RESUMEN DE HALLAZGOS ──
    if (listaH.length > 0) {
      y = checkPage(doc, y, 30, FOOTER_MARGIN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('RESUMEN DE HALLAZGOS', margin, y);
      y += 6;
      {
        const colsSum = [15, 95, 30, 20];
        const rhSum = 8;
        const headLabels = ['No.', 'HALLAZGO', isFinal ? 'ESTADO' : 'GRAVEDAD', 'REPETITIVO'];
        doc.setFillColor(210, 210, 210);
        doc.rect(margin, y, tableW, rhSum, 'F');
        let cxs = margin;
        headLabels.forEach((lbl, i) => {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
          doc.text(lbl, cxs + 2, y + rhSum - 2);
          if (i < headLabels.length - 1) doc.line(cxs + colsSum[i], y, cxs + colsSum[i], y + rhSum);
          cxs += colsSum[i];
        });
        doc.rect(margin, y, tableW, rhSum);
        y += rhSum;
        listaH.forEach((h, i) => {
          const cellTxt = h.titulo || h.descripcion?.substring(0, 90) || 'Sin título';
          const linesCell = doc.splitTextToSize(cellTxt, colsSum[1] - 3);
          const rh0 = Math.max(8, linesCell.length * 5 + 3);
          y = checkPage(doc, y, rh0 + 2, FOOTER_MARGIN);
          doc.rect(margin, y, tableW, rh0);
          let rx0 = margin;
          doc.setFontSize(11);
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
    }

    // ── Conclusiones
    y = checkPage(doc, y, 20, FOOTER_MARGIN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONCLUSIONES', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const cText = isFinal ? infFinal?.observacionesFinales : infPrelim?.observaciones;
    y = imprimirParrafo(doc, cText || 'Sin conclusiones.', margin, y, tableW, LH, FOOTER_MARGIN);
    y += SEC;

    // Firmas...
    y = checkPage(doc, y, 35, FOOTER_MARGIN);
    doc.text(`Bogotá D.C., ${fechaStr}`, margin, y);
    y += 20;
    if (jefe) { doc.setFont('helvetica', 'bold'); doc.text(jefe, margin, y); y += LH; }
    doc.text('Jefe Oficina de Control Interno', margin, y);
    y += LH + 4;
    doc.setFontSize(10);
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
    if ((tipo === 'preliminar' || tipo === 'final') && i === 1) {
      dibujarPieInstitucional(doc as any, i, false);
    } else {
      dibujarPieInstitucional(doc as any, i, true);
    }
  }

  if (returnBlobUrl) return doc.output('bloburl') as string;
  let filename = '';
  if (tipo === 'preliminar') filename = `Informe_Preliminar_${auditoria.codigo}.pdf`;
  else if (tipo === 'ejecutivo') filename = `Informe_Ejecutivo_${auditoria.codigo}.pdf`;
  else filename = `Informe_Final_${auditoria.codigo}.pdf`;
  doc.save(filename);
}
