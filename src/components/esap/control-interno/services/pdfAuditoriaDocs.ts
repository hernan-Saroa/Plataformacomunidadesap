/**
 * ============================================
 * SERVICIO: GENERACIÓN DE DOCUMENTOS DE AUDITORÍA
 * ============================================
 * 
 * Genera los 4 documentos oficiales para inicio de auditorías:
 * 1. Oficio de Anuncio
 * 2. Carta de Representación OCI
 * 3. Carta de Compromiso OCI
 * 4. Programa Individual de Auditoría
 * 
 * SEPARACIÓN DE LÓGICA:
 * - Lógica de generación de PDF (este archivo)
 * - Vista previa (componente React)
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  dibujarEncabezadoInstitucional, 
  dibujarPieInstitucional,
  agregarPaginaConEncabezado,
  DOCUMENTOS_PREDEFINIDOS,
  type ConfiguracionDocumento 
} from './pdfESAPHeader';

// ============================================
// TIPOS
// ============================================

export interface DatosAuditoria {
  codigo: string;
  nombre: string;
  tipo: 'Sede' | 'Territorial';
  areaAuditable: string;
  procesoNombre: string;
  responsableArea: {
    nombre: string;
    cargo: string;
    email: string;
  };
  auditorLider: {
    nombre: string;
    email: string;
  };
  equipoAuditores: {
    nombre: string;
    email: string;
  }[];
  fechaInicio: Date;
  duracionDias: {
    planeacion: number;
    ejecucion: number;
    comunicacion: number;
  };
  alcance?: string;
  criteriosAuditoria?: string[];
  logoImg?: string;  // Logo ESAP para incluir en encabezados
}

// ============================================
// FUNCIONES DE GENERACIÓN DE PDF
// ============================================

/**
 * Genera el Oficio de Anuncio
 */
export function generarOficioAnuncio(auditoria: DatosAuditoria): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Dibujar encabezado institucional
  let yPos = dibujarEncabezadoInstitucional(doc, {
    ...DOCUMENTOS_PREDEFINIDOS.OFICIO_ANUNCIO,
    logoImg: auditoria.logoImg
  });
  
  // Dibujar pie de página
  dibujarPieInstitucional(doc, 1);

  // ============================================
  // CONTENIDO DEL OFICIO
  // ============================================
  
  const maxWidth = pageWidth - (margin * 2);
  
  // Fecha y consecutivo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const fechaTexto = `Bogotá D.C., ${formatearFecha(auditoria.fechaInicio)}`;
  doc.text(fechaTexto, pageWidth - margin, yPos, { align: 'right' });
  yPos += 5;
  
  doc.text(`Oficio No. OCI-${auditoria.codigo}-${new Date().getFullYear()}`, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Destinatario
  doc.setFont('helvetica', 'bold');
  doc.text('Señor(a):', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(auditoria.responsableArea.nombre.toUpperCase(), margin, yPos);
  yPos += 5;
  doc.text(auditoria.responsableArea.cargo, margin, yPos);
  yPos += 5;
  doc.text(auditoria.areaAuditable, margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Ciudad', margin, yPos);
  yPos += 10;

  // Asunto
  doc.setFont('helvetica', 'bold');
  doc.text('Asunto:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  const asunto = `Anuncio de Auditoría Interna - ${auditoria.nombre}`;
  const asuntoLineas = doc.splitTextToSize(asunto, maxWidth - 20);
  doc.text(asuntoLineas, margin + 15, yPos);
  yPos += (asuntoLineas.length * 5) + 5;

  // Saludo
  doc.text('Respetado(a) señor(a):', margin, yPos);
  yPos += 8;

  // Cuerpo del oficio
  const parrafos = [
    `En cumplimiento del Plan Anual de Auditoría Interna vigencia ${new Date().getFullYear()}, aprobado por la Dirección Nacional, la Oficina de Control Interno se permite comunicar que se adelantará auditoría interna al proceso "${auditoria.procesoNombre}" - Área: ${auditoria.areaAuditable}.`,
    
    `Esta auditoría tiene como objetivo evaluar la eficacia, eficiencia y economía del proceso, así como verificar el cumplimiento de las políticas, normas y procedimientos establecidos, en el marco del Sistema Integrado de Gestión de la ESAP.`,
    
    `La auditoría se desarrollará en las siguientes fechas:`,
  ];

  doc.setFont('helvetica', 'normal');
  for (const parrafo of parrafos) {
    const lineas = doc.splitTextToSize(parrafo, maxWidth);
    doc.text(lineas, margin, yPos);
    yPos += (lineas.length * 5) + 3;
  }

  // Fechas de la auditoría (tabla simple)
  yPos += 2;
  const fechaFin = new Date(auditoria.fechaInicio);
  fechaFin.setDate(fechaFin.getDate() + auditoria.duracionDias.planeacion + auditoria.duracionDias.ejecucion);

  doc.setFont('helvetica', 'bold');
  doc.text('• Fecha de inicio:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatearFecha(auditoria.fechaInicio), margin + 35, yPos);
  yPos += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('• Fecha estimada de finalización:', margin + 5, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatearFecha(fechaFin), margin + 60, yPos);
  yPos += 8;

  // Equipo auditor
  const equipoParrafo = `El equipo auditor estará conformado por: ${auditoria.auditorLider.nombre} (Auditor Líder)`;
  const equipoLineas = doc.splitTextToSize(equipoParrafo, maxWidth);
  doc.text(equipoLineas, margin, yPos);
  yPos += (equipoLineas.length * 5) + 3;

  if (auditoria.equipoAuditores.length > 0) {
    const auditoresTexto = `y ${auditoria.equipoAuditores.map(a => a.nombre).join(', ')} (Auditores).`;
    const auditoresLineas = doc.splitTextToSize(auditoresTexto, maxWidth);
    doc.text(auditoresLineas, margin, yPos);
    yPos += (auditoresLineas.length * 5) + 5;
  }

  // Párrafo de cierre
  const cierre = [
    `Solicitamos muy comedidamente su colaboración para facilitar el acceso a la información y documentación requerida, así como la disponibilidad del personal necesario para el desarrollo de la auditoría.`,
    
    `Agradecemos de antemano su valiosa colaboración y quedamos atentos a cualquier inquietud al respecto.`
  ];

  for (const parrafo of cierre) {
    const lineas = doc.splitTextToSize(parrafo, maxWidth);
    doc.text(lineas, margin, yPos);
    yPos += (lineas.length * 5) + 3;
  }

  yPos += 5;
  doc.text('Cordialmente,', margin, yPos);
  yPos += 20;

  // Firma
  doc.setFont('helvetica', 'bold');
  doc.text('_________________________________', margin, yPos);
  yPos += 5;
  doc.text('JEFE OFICINA DE CONTROL INTERNO', margin, yPos);

  return doc;
}

/**
 * Genera la Carta de Representación OCI
 */
export function generarCartaRepresentacion(auditoria: DatosAuditoria): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Dibujar encabezado institucional
  let yPos = dibujarEncabezadoInstitucional(doc, {
    ...DOCUMENTOS_PREDEFINIDOS.CARTA_REPRESENTACION,
    logoImg: auditoria.logoImg
  });
  
  // Dibujar pie de página
  dibujarPieInstitucional(doc, 1);

  // ============================================
  // CONTENIDO DE LA CARTA
  // ============================================
  
  const maxWidth = pageWidth - (margin * 2);
  
  // Fecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fechaTexto = `Bogotá D.C., ${formatearFecha(new Date())}`;
  doc.text(fechaTexto, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Destinatario
  doc.setFont('helvetica', 'bold');
  doc.text('Señor(a):', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('JEFE OFICINA DE CONTROL INTERNO', margin, yPos);
  yPos += 5;
  doc.text('ESAP', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Ciudad', margin, yPos);
  yPos += 10;

  // Referencia
  doc.setFont('helvetica', 'bold');
  doc.text('Ref:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  const ref = `Auditoría Interna - ${auditoria.nombre}`;
  doc.text(ref, margin + 10, yPos);
  yPos += 10;

  // Saludo
  doc.text('Respetado(a) señor(a):', margin, yPos);
  yPos += 8;

  // Contenido
  const contenido = [
    `En relación con la auditoría interna que adelantará la Oficina de Control Interno al proceso "${auditoria.procesoNombre}" del área "${auditoria.areaAuditable}", manifiesto lo siguiente:`,
    
    `1. RESPONSABILIDAD: Reconozco que soy responsable del diseño, implementación y mantenimiento del control interno relevante para la preparación y presentación de información financiera, contractual, misional y de gestión que esté libre de errores materiales, ya sea por fraude o error.`,
    
    `2. INFORMACIÓN SUMINISTRADA: Confirmo que toda la información, documentación y registros proporcionados a los auditores son completos, veraces y reflejan de manera exacta las operaciones y transacciones del área.`,
    
    `3. ACCESO A LA INFORMACIÓN: Me comprometo a facilitar el acceso oportuno a toda la información, archivos, sistemas y personal necesario para el desarrollo de la auditoría.`,
    
    `4. COMUNICACIÓN DE IRREGULARIDADES: Me comprometo a comunicar de manera inmediata cualquier fraude, irregularidad o incumplimiento normativo del que tenga conocimiento durante el período auditado.`,
    
    `5. PLAN DE MEJORAMIENTO: Me comprometo a implementar las acciones correctivas y preventivas que resulten del proceso de auditoría, dentro de los plazos acordados.`,
    
    `Sin otro particular, quedo atento(a) a cualquier requerimiento adicional.`
  ];

  doc.setFont('helvetica', 'normal');
  for (const parrafo of contenido) {
    const lineas = doc.splitTextToSize(parrafo, maxWidth);
    doc.text(lineas, margin, yPos);
    yPos += (lineas.length * 5) + 4;
  }

  yPos += 5;
  doc.text('Atentamente,', margin, yPos);
  yPos += 20;

  // Firma
  doc.setFont('helvetica', 'bold');
  doc.text('_________________________________', margin, yPos);
  yPos += 5;
  doc.text(auditoria.responsableArea.nombre.toUpperCase(), margin, yPos);
  yPos += 5;
  doc.text(auditoria.responsableArea.cargo, margin, yPos);
  yPos += 5;
  doc.text(auditoria.areaAuditable, margin, yPos);

  return doc;
}

/**
 * Genera la Carta de Compromiso OCI
 */
export function generarCartaCompromiso(auditoria: DatosAuditoria): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Dibujar encabezado institucional
  let yPos = dibujarEncabezadoInstitucional(doc, {
    ...DOCUMENTOS_PREDEFINIDOS.CARTA_COMPROMISO,
    logoImg: auditoria.logoImg
  });
  
  // Dibujar pie de página
  dibujarPieInstitucional(doc, 1);

  // ============================================
  // CONTENIDO DE LA CARTA
  // ============================================
  
  const maxWidth = pageWidth - (margin * 2);
  
  // Fecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const fechaTexto = `Bogotá D.C., ${formatearFecha(new Date())}`;
  doc.text(fechaTexto, pageWidth - margin, yPos, { align: 'right' });
  yPos += 10;

  // Título
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTA DE COMPROMISO DE CONFIDENCIALIDAD', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Identificación del auditor
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('YO, ', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(auditoria.auditorLider.nombre.toUpperCase(), margin + 8, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICADO CON C.C. ', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text('________________', margin + 45, yPos);
  yPos += 10;

  // Contenido del compromiso
  const contenido = [
    `En mi calidad de Auditor Interno de la ESAP, y en el marco de la auditoría interna que se adelantará al proceso "${auditoria.procesoNombre}" del área "${auditoria.areaAuditable}", realizo las siguientes declaraciones y compromisos:`,
    
    `1. INDEPENDENCIA Y OBJETIVIDAD: Declaro que no tengo ningún conflicto de interés, relación personal, profesional o financiera con el área auditada que pueda afectar mi independencia u objetividad en el ejercicio de mis funciones.`,
    
    `2. CONFIDENCIALIDAD: Me comprometo a mantener la confidencialidad de toda la información a la que tenga acceso durante el desarrollo de la auditoría, utilizándola exclusivamente para los fines propios de la actividad de control.`,
    
    `3. COMPETENCIA PROFESIONAL: Declaro contar con la competencia técnica y profesional necesaria para desarrollar la auditoría asignada, cumpliendo con los estándares de calidad aplicables.`,
    
    `4. DEBIDO CUIDADO PROFESIONAL: Me comprometo a ejercer el debido cuidado profesional en la planeación, ejecución y comunicación de resultados de la auditoría, aplicando criterios de razonabilidad y prudencia.`,
    
    `5. CÓDIGO DE ÉTICA: Me comprometo a observar estrictamente el Código de Ética de la función pública y los principios de integridad, objetividad, confidencialidad y competencia profesional.`,
    
    `6. PROTECCIÓN DE DATOS: Me comprometo a cumplir con la normativa vigente en materia de protección de datos personales (Ley 1581 de 2012) en el tratamiento de información personal a la que tenga acceso.`,
    
    `Esta declaración se realiza de manera libre, consciente y voluntaria, en constancia de lo cual firmo el presente documento.`
  ];

  doc.setFont('helvetica', 'normal');
  for (const parrafo of contenido) {
    const lineas = doc.splitTextToSize(parrafo, maxWidth);
    doc.text(lineas, margin, yPos);
    yPos += (lineas.length * 5) + 4;
  }

  yPos += 10;

  // Firma
  doc.setFont('helvetica', 'bold');
  doc.text('_________________________________', margin, yPos);
  yPos += 5;
  doc.text('FIRMA DEL AUDITOR', margin, yPos);
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${auditoria.auditorLider.nombre}`, margin, yPos);
  yPos += 5;
  doc.text(`Cargo: Auditor Líder`, margin, yPos);
  yPos += 5;
  doc.text(`Fecha: ${formatearFecha(new Date())}`, margin, yPos);

  return doc;
}

/**
 * Genera el Programa Individual de Auditoría
 */
export function generarProgramaIndividual(auditoria: DatosAuditoria): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Dibujar encabezado institucional
  let yPos = dibujarEncabezadoInstitucional(doc, {
    ...DOCUMENTOS_PREDEFINIDOS.PROGRAMA_INDIVIDUAL,
    logoImg: auditoria.logoImg
  });
  
  // Dibujar pie de página
  dibujarPieInstitucional(doc, 1);

  // ============================================
  // CONTENIDO DEL PROGRAMA
  // ============================================
  
  const maxWidth = pageWidth - (margin * 2);

  // Título
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 61, 165);
  doc.text('PROGRAMA INDIVIDUAL DE AUDITORÍA', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Información general en tabla
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const infoGeneral = [
    ['Código Auditoría:', auditoria.codigo],
    ['Nombre:', auditoria.nombre],
    ['Tipo:', auditoria.tipo],
    ['Proceso:', auditoria.procesoNombre],
    ['Área Auditada:', auditoria.areaAuditable],
    ['Auditor Líder:', auditoria.auditorLider.nombre],
    ['Fecha Inicio:', formatearFecha(auditoria.fechaInicio)],
  ];

  for (const [label, valor] of infoGeneral) {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const valorLineas = doc.splitTextToSize(valor, maxWidth - 45);
    doc.text(valorLineas, margin + 45, yPos);
    yPos += Math.max(5, valorLineas.length * 5);
  }

  yPos += 5;

  // Objetivo
  doc.setFont('helvetica', 'bold');
  doc.text('OBJETIVO DE LA AUDITORÍA:', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const objetivo = `Evaluar la eficacia del Sistema Integrado de Gestión en el proceso "${auditoria.procesoNombre}", verificando el cumplimiento de requisitos normativos, contractuales y de gestión de calidad aplicables.`;
  const objetivoLineas = doc.splitTextToSize(objetivo, maxWidth);
  doc.text(objetivoLineas, margin, yPos);
  yPos += objetivoLineas.length * 5 + 8;

  // Alcance
  doc.setFont('helvetica', 'bold');
  doc.text('ALCANCE:', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const alcance = auditoria.alcance || `La auditoría cubrirá las actividades, procesos y controles del área "${auditoria.areaAuditable}" durante el período ${new Date().getFullYear()}.`;
  const alcanceLineas = doc.splitTextToSize(alcance, maxWidth);
  doc.text(alcanceLineas, margin, yPos);
  yPos += alcanceLineas.length * 5 + 8;

  // Criterios de auditoría
  doc.setFont('helvetica', 'bold');
  doc.text('CRITERIOS DE AUDITORÍA:', margin, yPos);
  yPos += 5;
  
  const criterios = auditoria.criteriosAuditoria || [
    'ISO 9001:2015 - Sistema de Gestión de Calidad',
    'Decreto 648 de 2017 - Oficinas de Control Interno',
    'Ley 1474 de 2011 - Estatuto Anticorrupción',
    'Manual de Procesos y Procedimientos ESAP',
    'Políticas y directrices institucionales'
  ];

  doc.setFont('helvetica', 'normal');
  for (const criterio of criterios) {
    doc.text(`• ${criterio}`, margin + 3, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Metodología
  doc.setFont('helvetica', 'bold');
  doc.text('METODOLOGÍA:', margin, yPos);
  yPos += 5;
  doc.setFont('helvetica', 'normal');
  const metodologia = [
    '• Revisión documental de procesos, procedimientos y registros',
    '• Entrevistas con responsables de procesos y personal clave',
    '• Verificación de evidencias físicas y digitales',
    '• Pruebas de cumplimiento de controles establecidos',
    '• Análisis de indicadores de gestión'
  ];

  for (const item of metodologia) {
    doc.text(item, margin + 3, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Cronograma
  doc.setFont('helvetica', 'bold');
  doc.text('CRONOGRAMA:', margin, yPos);
  yPos += 5;

  const fechaFinPlaneacion = new Date(auditoria.fechaInicio);
  fechaFinPlaneacion.setDate(fechaFinPlaneacion.getDate() + auditoria.duracionDias.planeacion);
  
  const fechaFinEjecucion = new Date(fechaFinPlaneacion);
  fechaFinEjecucion.setDate(fechaFinEjecucion.getDate() + auditoria.duracionDias.ejecucion);
  
  const fechaFinComunicacion = new Date(fechaFinEjecucion);
  fechaFinComunicacion.setDate(fechaFinComunicacion.getDate() + auditoria.duracionDias.comunicacion);

  const cronograma = [
    ['Fase de Planeación:', `${formatearFecha(auditoria.fechaInicio)} - ${formatearFecha(fechaFinPlaneacion)}`],
    ['Fase de Ejecución:', `${formatearFecha(fechaFinPlaneacion)} - ${formatearFecha(fechaFinEjecucion)}`],
    ['Fase de Comunicación:', `${formatearFecha(fechaFinEjecucion)} - ${formatearFecha(fechaFinComunicacion)}`],
  ];

  doc.setFont('helvetica', 'normal');
  for (const [fase, fechas] of cronograma) {
    doc.setFont('helvetica', 'bold');
    doc.text(fase, margin + 3, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(fechas, margin + 45, yPos);
    yPos += 5;
  }

  return doc;
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Formatea una fecha
 */
function formatearFecha(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const dia = d.getDate();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[d.getMonth()];
  const año = d.getFullYear();
  return `${dia} de ${mes} de ${año}`;
}

/**
 * Descarga un PDF generado
 */
export function descargarPDF(doc: jsPDF, nombreArchivo: string): void {
  doc.save(nombreArchivo);
}

/**
 * Genera y descarga todos los documentos de una auditoría
 */
export function generarTodosLosDocumentos(auditoria: DatosAuditoria): void {
  // 1. Oficio de Anuncio
  const oficio = generarOficioAnuncio(auditoria);
  descargarPDF(oficio, `Oficio_Anuncio_${auditoria.codigo}.pdf`);

  // 2. Carta de Representación
  setTimeout(() => {
    const cartaRep = generarCartaRepresentacion(auditoria);
    descargarPDF(cartaRep, `Carta_Representacion_${auditoria.codigo}.pdf`);
  }, 500);

  // 3. Carta de Compromiso
  setTimeout(() => {
    const cartaComp = generarCartaCompromiso(auditoria);
    descargarPDF(cartaComp, `Carta_Compromiso_${auditoria.codigo}.pdf`);
  }, 1000);

  // 4. Programa Individual
  setTimeout(() => {
    const programa = generarProgramaIndividual(auditoria);
    descargarPDF(programa, `Programa_Individual_${auditoria.codigo}.pdf`);
  }, 1500);
}
