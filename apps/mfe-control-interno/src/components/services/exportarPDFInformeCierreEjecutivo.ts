/**
 * Servicio para exportar PDF de Informe de Cierre e Informe Ejecutivo
 * Formato ESAP institucional (mismo que otros informes de auditoría)
 */

import type { jsPDF as JsPDFType } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  dibujarEncabezadoInstitucional, 
  dibujarPieInstitucional, 
  DOCUMENTOS_PREDEFINIDOS, 
  LOGO_ESAP_URL,
  getLogoESAP,
  type ConfiguracionDocumento 
} from './pdfESAPHeader';

export interface ResumenCierrePDF {
  codigo?: string;
  nombre?: string;
  fechaInicio?: string;
  fechaFin?: string;
  planVinculado?: string;
  planCodigo?: string;
  leccionesAprendidas?: string;
  recomendacionesFuturasAuditorias?: string;
}

export interface AccionPlanPDF {
  id: string;
  descripcion?: string;
  responsable?: string;
  fechaFin?: string;
  estadoVerificacionOci?: string;
  observacionOci?: string;
}

export interface HallazgoPDF {
  id: string;
  codigo?: string;
  titulo?: string;
  descripcion?: string;
  gravedad?: string;
  criterioIncumplido?: string;
  causas?: string[];
  efectos?: string[];
  recomendaciones?: string[];
  decisionAuditor?: string;
  estado?: string;
  fundamentacionTecnica?: string;
  fechaDeteccion?: string;
}

export interface AuditoriaCompletaPDF {
  codigo: string;
  nombre: string;
  tipo?: string;
  estado?: string;
  areaAuditable?: string;
  procesoNombre?: string;
  nivelRiesgo?: string;
  alcance?: string;
  objetivos?: string[];
  auditorLider?: string;
  auditorLiderEmail?: string;
  responsableArea?: { nombre?: string; cargo?: string; email?: string; telefono?: string };
  equipoAuditores?: Array<{ nombre?: string; rol?: string; email?: string }>;
  cronograma?: { fechaInicio?: any; fechaFin?: any; fechaCreacion?: any; fechaFinReal?: any; duracionDias?: number; diasTranscurridos?: number };
  progreso?: { general?: number };
  estadisticas?: { totalHallazgos?: number; hallazgosCriticos?: number; hallazgosMayores?: number; hallazgosMenores?: number; documentosCargados?: number; notificacionesEnviadas?: number };
  fechasClave?: { planeacionInicio?: any; planeacionFin?: any; ejecucionInicio?: any; ejecucionFin?: any; comunicacionInicio?: any; comunicacionFin?: any; informePreliminar?: any; informeFinal?: any };
  metadata?: { creadoPor?: string; fechaCreacion?: any; ultimaModificacion?: any; modificadoPor?: string };
  territorial?: string;
}

export interface DatosInformeCierre {
  auditoria: AuditoriaCompletaPDF;
  resumen: ResumenCierrePDF | null;
  planes: Array<{ codigo?: string; id?: string; nombre?: string; estado?: string; fechaCreacion?: string; acciones?: AccionPlanPDF[] }>;
  hallazgos: HallazgoPDF[];
}

function formatearFecha(d: any): string {
  if (!d) return '—';
  if (d instanceof Date) return d.toLocaleDateString('es-CO');
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
  return s;
}

function primerValor(...values: any[]): any {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function texto(valor: any, fallback = '—'): string {
  const v = primerValor(valor);
  return v === undefined ? fallback : String(v);
}

function numeroSeguro(...values: any[]): number {
  const v = primerValor(...values);
  if (v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function contarHallazgosPorGravedad(hallazgos: HallazgoPDF[], gravedad: 'CRITICO' | 'GRAVE' | 'MENOR'): number {
  return hallazgos.filter((h) => {
    const g = String(h.gravedad || '').toUpperCase();
    if (gravedad === 'CRITICO') return g === 'CRITICO';
    if (gravedad === 'GRAVE') return g === 'GRAVE';
    return g === 'MODERADO' || g === 'LEVE' || g === 'MENOR';
  }).length;
}

function esIdTecnico(valor: any): boolean {
  if (valor === null || valor === undefined) return true;
  const v = String(valor).trim();
  if (!v) return true;
  return (
    /^aud-\d+$/i.test(v) ||
    /^usr-\d+$/i.test(v) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v) ||
    /^\d+$/.test(v) ||
    /^id[-_]?\d+$/i.test(v)
  );
}

function textoHumano(valor: any, fallback = '—'): string {
  const v = primerValor(valor);
  if (v === undefined) return fallback;
  return esIdTecnico(v) ? fallback : String(v);
}

function calcularDuracionDias(fechaInicio: any, fechaFin: any): number | undefined {
  if (!fechaInicio || !fechaFin) return undefined;
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return undefined;
  return Math.max(0, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Genera y descarga el PDF del Informe de Cierre
 */
export async function exportarPDFInformeCierre(datos: DatosInformeCierre): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPDFType = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' }) as unknown as JsPDFType;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  const baseConfig = DOCUMENTOS_PREDEFINIDOS.PLAN_ANUAL as ConfiguracionDocumento;
  const configDoc: ConfiguracionDocumento = {
    ...baseConfig,
    titulo: 'INFORME DE CIERRE DE AUDITORÍA',
    // Override con datos dinámicos (no hardcodeados del template)
    fecha: datos.auditoria.cronograma?.fechaCreacion
      ? new Date(datos.auditoria.cronograma.fechaCreacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }),
  };

  let y = dibujarEncabezadoInstitucional(doc as any, configDoc, 28);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  // Resumen ejecutivo
  const resumen = datos.resumen;
  const planCodigo = resumen?.planVinculado || resumen?.planCodigo || datos.planes[0]?.codigo || datos.planes[0]?.id || '—';
  const aud = datos.auditoria;
  const audAny = aud as any;
  const fechaInicio = primerValor(resumen?.fechaInicio, aud.cronograma?.fechaInicio, audAny.fechaInicio);
  const fechaFin = primerValor(resumen?.fechaFin, aud.cronograma?.fechaFin, audAny.fechaFin);
  const fechasStr = [fechaInicio, fechaFin]
    .map((d) => (d ? formatearFecha(d) : ''))
    .filter(Boolean)
    .join(' – ') || '—';
  const todasLasAcciones: { planCodigo: string; accion: AccionPlanPDF }[] = [];
  for (const plan of datos.planes) {
    for (const accion of plan.acciones || []) {
      todasLasAcciones.push({ planCodigo: plan.codigo || plan.id || '—', accion });
    }
  }
  const cumplidas = todasLasAcciones.filter(({ accion }) => String(accion.estadoVerificacionOci || '').toLowerCase() === 'cumplida').length;
  const hallazgosCriticos = numeroSeguro(aud.estadisticas?.hallazgosCriticos, audAny.hallazgosCriticos, contarHallazgosPorGravedad(datos.hallazgos, 'CRITICO'));
  const hallazgosMayores = numeroSeguro(aud.estadisticas?.hallazgosMayores, audAny.hallazgosMayores, contarHallazgosPorGravedad(datos.hallazgos, 'GRAVE'));
  const hallazgosMenores = numeroSeguro(aud.estadisticas?.hallazgosMenores, audAny.hallazgosMenores, contarHallazgosPorGravedad(datos.hallazgos, 'MENOR'));
  const documentosCargados = numeroSeguro(aud.estadisticas?.documentosCargados, audAny.documentosCargados, audAny.totalDocumentos);
  const notificacionesEnviadas = numeroSeguro(aud.estadisticas?.notificacionesEnviadas, audAny.notificacionesEnviadas);
  const auditorLiderNombre = primerValor(
    aud.auditorLider,
    audAny.auditorLider?.nombre,
    audAny.auditorLiderNombre,
    audAny.responsable,
  );
  const auditorLiderEmail = primerValor(
    aud.auditorLiderEmail,
    audAny.auditorLider?.email,
    audAny.emailAuditorLider,
  );
  const tipoAuditoria = primerValor(aud.tipo, audAny.tipoAuditoria, resumen?.tipo);
  const estadoAuditoria = primerValor(aud.estado, audAny.estadoKanban, audAny.fase, resumen?.estado);
  const areaAuditable = primerValor(aud.areaAuditable, audAny.areaResponsable, audAny.areaObjetivo, audAny.areaAuditada);
  const procesoNombre = primerValor(aud.procesoNombre, audAny.proceso, audAny.procesoAuditado);
  const nivelRiesgo = primerValor(aud.nivelRiesgo, audAny.riesgoKanban, audAny.nivelRiesgoKanban, audAny.riesgo, audAny.calificacionRiesgo);
  const territorial = primerValor(aud.territorial, audAny.territorial, audAny.sede, audAny.lugarEjecucion);
  const duracionDias = primerValor(
    aud.cronograma?.duracionDias,
    audAny.duracionDias,
    audAny.cronogramaDias,
    calcularDuracionDias(fechaInicio, fechaFin),
  );
  const progresoGeneral = primerValor(
    typeof aud.progreso?.general === 'number' ? `${aud.progreso.general}%` : undefined,
    typeof audAny.progresoGeneral === 'number' ? `${audAny.progresoGeneral}%` : undefined,
    typeof audAny.progreso === 'number' ? `${audAny.progreso}%` : undefined,
    '0%',
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. INFORMACIÓN GENERAL DE LA AUDITORÍA', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const rows = [
    ['Código', aud.codigo],
    ['Nombre', aud.nombre],
    ['Tipo', texto(tipoAuditoria)],
    ['Estado', texto(estadoAuditoria)],
    ['Área auditada', texto(areaAuditable)],
    ['Proceso', texto(procesoNombre)],
    ['Nivel de riesgo', texto(nivelRiesgo)],
    ['Territorial / Sede', texto(territorial)],
    ['Auditor Líder', textoHumano(auditorLiderNombre)],
    ['Email Auditor Líder', texto(auditorLiderEmail)],
    ['Responsable del área', textoHumano(primerValor(aud.responsableArea?.nombre, audAny.responsableAreaNombre, audAny.responsableUnidad, audAny.responsable))],
    ['Cargo responsable', texto(primerValor(aud.responsableArea?.cargo, audAny.responsableAreaCargo, audAny.cargo))],
    ['Email responsable', texto(primerValor(aud.responsableArea?.email, audAny.responsableAreaEmail, audAny.responsableEmail))],
    ['Período', fechasStr],
    ['Duración (días)', texto(duracionDias)],
    ['Progreso general', texto(progresoGeneral)],
    ['Documentos cargados', String(documentosCargados)],
    ['Notificaciones enviadas', String(notificacionesEnviadas)],
  ];
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—').substring(0, 90), margin + 50, y);
    y += 6;
  });

  if (aud.equipoAuditores && aud.equipoAuditores.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Equipo de auditoría:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    aud.equipoAuditores.forEach((m: { nombre?: string; rol?: string; email?: string }) => {
      doc.text(`• ${m.nombre || '—'} (${m.rol || '—'})${m.email ? ` - ${m.email}` : ''}`, margin + 2, y);
      y += 5;
    });
  }

  if (aud.alcance?.trim()) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Alcance:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const lineasAlc = doc.splitTextToSize(aud.alcance.substring(0, 400) + (aud.alcance.length > 400 ? '…' : ''), maxWidth - 4);
    doc.text(lineasAlc, margin + 2, y);
    y += lineasAlc.length * 4 + 4;
  }

  if (aud.objetivos && aud.objetivos.length > 0) {
    if (y > pageHeight - 40) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.text('Objetivos:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    aud.objetivos.slice(0, 5).forEach((obj: string) => {
      const lineasO = doc.splitTextToSize(`• ${obj}`.substring(0, 150), maxWidth - 4);
      doc.text(lineasO, margin + 2, y);
      y += lineasO.length * 4 + 2;
    });
    if (aud.objetivos.length > 5) {
      doc.text(`… y ${aud.objetivos.length - 5} objetivos más`, margin + 2, y);
      y += 5;
    }
    y += 2;
  }

  if (aud.fechasClave && (aud.fechasClave.planeacionInicio || aud.fechasClave.ejecucionInicio || aud.fechasClave.comunicacionInicio)) {
    if (y > pageHeight - 35) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.text('Fechas clave:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const fc = aud.fechasClave;
    if (fc.planeacionInicio) doc.text(`Planeación: ${formatearFecha(fc.planeacionInicio)}${fc.planeacionFin ? ` - ${formatearFecha(fc.planeacionFin)}` : ''}`, margin + 2, y), y += 5;
    if (fc.ejecucionInicio) doc.text(`Ejecución: ${formatearFecha(fc.ejecucionInicio)}${fc.ejecucionFin ? ` - ${formatearFecha(fc.ejecucionFin)}` : ''}`, margin + 2, y), y += 5;
    if (fc.comunicacionInicio) doc.text(`Comunicación: ${formatearFecha(fc.comunicacionInicio)}${fc.comunicacionFin ? ` - ${formatearFecha(fc.comunicacionFin)}` : ''}`, margin + 2, y), y += 5;
    y += 2;
  }

  if (aud.metadata?.creadoPor || aud.metadata?.modificadoPor) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Creado por: ${aud.metadata?.creadoPor || '—'} · Modificado: ${aud.metadata?.modificadoPor || '—'}`, margin, y);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 6;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. RESULTADOS Y CIERRE', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const rowsCierre = [
    ['Plan vinculado', planCodigo],
    ['Total acciones del plan', String(todasLasAcciones.length)],
    ['Acciones cumplidas', String(cumplidas)],
    ['Hallazgos totales', String(datos.hallazgos.length)],
    ['Hallazgos críticos', String(hallazgosCriticos)],
    ['Hallazgos mayores', String(hallazgosMayores)],
    ['Hallazgos menores', String(hallazgosMenores)],
  ];
  rowsCierre.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—'), margin + 55, y);
    y += 5;
  });
  y += 6;

  // Lecciones aprendidas
  if (resumen?.leccionesAprendidas?.trim()) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. LECCIONES APRENDIDAS', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(resumen.leccionesAprendidas, maxWidth);
    doc.text(lineas, margin, y);
    y += lineas.length * 4 + 6;
  }

  // Recomendaciones
  if (resumen?.recomendacionesFuturasAuditorias?.trim()) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. RECOMENDACIONES PARA FUTURAS AUDITORÍAS', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(resumen.recomendacionesFuturasAuditorias, maxWidth);
    doc.text(lineas, margin, y);
    y += lineas.length * 4 + 6;
  }

  // Acciones del plan
  if (todasLasAcciones.length > 0) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. ACCIONES DEL PLAN — ESTADO FINAL', margin, y);
    y += 6;

    todasLasAcciones.slice(0, 15).forEach(({ planCodigo: cod, accion }, idx) => {
      if (y > pageHeight - 35) { doc.addPage(); y = margin; }
      const estado = String(accion.estadoVerificacionOci || '').toLowerCase();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${idx + 1}. ${(accion.descripcion || '—').substring(0, 60)}${(accion.descripcion || '').length > 60 ? '…' : ''}`, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(`Plan: ${cod} · Verificación: ${estado === 'cumplida' ? 'Cumplida' : estado === 'parcial' ? 'Parcial' : estado || '—'}`, margin + 2, y);
      y += 5;
    });
    if (todasLasAcciones.length > 15) {
      doc.setFont('helvetica', 'italic');
      doc.text(`… y ${todasLasAcciones.length - 15} acciones más`, margin, y);
      y += 6;
    }
    y += 4;
  }

  // Trazabilidad de hallazgos (detalle)
  if (datos.hallazgos.length > 0) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('6. TRAZABILIDAD DE HALLAZGOS', margin, y);
    y += 6;

    datos.hallazgos.forEach((h, idx) => {
      if (y > pageHeight - 55) { doc.addPage(); y = margin; }
      const decision = (h.decisionAuditor || h.estado || 'Sin decisión').toUpperCase();
      const gravedad = h.gravedad ? ` · Gravedad: ${h.gravedad}` : '';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${idx + 1}. ${h.codigo || h.id} — ${decision}${gravedad}`, margin, y);
      y += 5;

      const innerMargin = margin + 5;
      const innerWidth = pageWidth - (margin * 2) - 5;

      if (h.descripcion) {
        doc.setFont('helvetica', 'bold'); doc.text('CONDICIÓN:', innerMargin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lCond = doc.splitTextToSize(h.descripcion, innerWidth);
        doc.text(lCond, innerMargin, y);
        y += (lCond.length * 4) + 2;
      }

      if (h.criterioIncumplido) {
        y = checkPage(doc, y, 10, pageHeight - 30);
        doc.setFont('helvetica', 'bold'); doc.text('CRITERIO:', innerMargin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lCrit = doc.splitTextToSize(h.criterioIncumplido, innerWidth);
        doc.text(lCrit, innerMargin, y);
        y += (lCrit.length * 4) + 2;
      }

      const causas = (h.causas || []).filter(Boolean).join('; ');
      if (causas) {
        y = checkPage(doc, y, 10, pageHeight - 30);
        doc.setFont('helvetica', 'bold'); doc.text('CAUSA(S):', innerMargin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lCausa = doc.splitTextToSize(causas, innerWidth);
        doc.text(lCausa, innerMargin, y);
        y += (lCausa.length * 4) + 2;
      }

      const efectos = (h.efectos || []).filter(Boolean).join('; ');
      if (efectos) {
        y = checkPage(doc, y, 10, pageHeight - 30);
        doc.setFont('helvetica', 'bold'); doc.text('EFECTO(S):', innerMargin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lEfec = doc.splitTextToSize(efectos, innerWidth);
        doc.text(lEfec, innerMargin, y);
        y += (lEfec.length * 4) + 2;
      }

      const recs = (h.recomendaciones || []).filter(Boolean).join('; ');
      if (recs) {
        y = checkPage(doc, y, 10, pageHeight - 30);
        doc.setFont('helvetica', 'bold'); doc.text('RECOMENDACIÓN(ES):', innerMargin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lRec = doc.splitTextToSize(recs, innerWidth);
        doc.text(lRec, innerMargin, y);
        y += (lRec.length * 4) + 4;
      }

      y += 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      if (h.titulo) {
        const lineasT = doc.splitTextToSize(h.titulo, maxWidth - 4);
        doc.text(lineasT, margin + 3, y);
        y += lineasT.length * 4 + 2;
      }
      if (h.criterioIncumplido?.trim()) {
        doc.setFont('helvetica', 'bold');
        doc.text('Criterio incumplido:', margin + 3, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const lineasC = doc.splitTextToSize(h.criterioIncumplido.substring(0, 200), maxWidth - 6);
        doc.text(lineasC, margin + 5, y);
        y += lineasC.length * 3.5 + 2;
      }
      if (h.descripcion) {
        const lineasD = doc.splitTextToSize(h.descripcion.substring(0, 350) + (h.descripcion.length > 350 ? '…' : ''), maxWidth - 4);
        doc.text(lineasD, margin + 3, y);
        y += lineasD.length * 3.5 + 2;
      }
      if (h.causas && h.causas.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Causas:', margin + 3, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const causasStr = h.causas.join('; ').substring(0, 150);
        doc.text(causasStr + (causasStr.length >= 150 ? '…' : ''), margin + 5, y);
        y += 5;
      }
      if (h.recomendaciones && h.recomendaciones.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Recomendaciones:', margin + 3, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const recStr = h.recomendaciones.join('; ').substring(0, 150);
        doc.text(recStr + (recStr.length >= 150 ? '…' : ''), margin + 5, y);
        y += 5;
      }
      if (h.fundamentacionTecnica?.trim()) {
        doc.setFont('helvetica', 'italic');
        const fundText = `Fundamentación: ${h.fundamentacionTecnica}`;
        const lineasF = doc.splitTextToSize(fundText.length > 250 ? fundText.substring(0, 250) + '…' : fundText, maxWidth - 4);
        doc.text(lineasF, margin + 3, y);
        y += lineasF.length * 3.5 + 2;
        doc.setFont('helvetica', 'normal');
      }
      y += 4;
    });
  }

  try {
    // Pie en todas las páginas
    const totalPages = (doc as any).getNumberOfPages?.() || 1;
    for (let i = 1; i <= totalPages; i++) {
      (doc as any).setPage(i);
      dibujarPieInstitucional(doc as any, i, true);
    }

    const safeCodigo = (datos.auditoria.codigo || 'Reporte').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Informe_Cierre_${safeCodigo}.pdf`;
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    // Intento 1: Descarga forzada
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Intento 2: Abrir en pestaña nueva (como respaldo si la descarga falla)
    window.open(url, '_blank');
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (error) {
    console.error('Error detallado al generar el PDF de cierre:', error);
    throw new Error('Error al procesar el documento. Intente de nuevo.');
  }
}

/**
 * Genera y descarga el PDF del Informe Ejecutivo (resumen completo)
 * Basado fielmente en docs/20250826_I4574_OfInfEjeFinPMDN.pdf
 * Todas las páginas en orientación VERTICAL (Portrait)
 */
export async function exportarPDFInformeEjecutivo(datos: DatosInformeCierre): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPDFType = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' }) as unknown as JsPDFType;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // --- PÁGINA 1: REMISIÓN ---
  // Logo ESAP (Cargar base64 para evitar errores de fetch/CORS)
  try {
    const logoBase64 = await getLogoESAP();
    doc.addImage(logoBase64, 'auto', margin, 12, 45, 13);
  } catch (e) {
    console.error('Error cargando logo en remisión:', e);
  }

  // Recuadro de Radicado y Fecha (Derecha)
  const boxWidth = 60;
  const boxHeight = 18;
  const boxX = pageWidth - margin - boxWidth;
  const boxY = 15;
  doc.setDrawColor(150, 150, 150);
  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'D');
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const fechaActual = new Date();
  doc.text(`Radicado: I-${fechaActual.getFullYear()}-000001`, boxX + 4, boxY + 7);
  doc.text(`Fecha: ${fechaActual.getDate()}/${fechaActual.getMonth() + 1}/${fechaActual.getFullYear()}`, boxX + 4, boxY + 13);
  let y = 45;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(datos.auditoria.codigo || `AUD-${fechaActual.getFullYear()}-001`, margin, y); y += 5;
  doc.text('Bogotá, D.C.', margin, y); y += 15;
  
  const formatearFechaLarga = (fecha: any) => {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '—';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const fInicio = datos.auditoria.cronograma?.inicio || datos.auditoria.cronograma?.fechaInicio || datos.auditoria.fechaInicio;
  const fFin = datos.auditoria.cronograma?.fin || datos.auditoria.cronograma?.fechaFin || datos.auditoria.fechaFin;
  const rangoFechas = datos.auditoria.rangoFechas || ((fInicio && fFin) 
    ? `${formatearFechaLarga(fInicio)} – ${formatearFechaLarga(fFin)}`
    : formatearFechaLarga(fInicio));

  let nombreDisplay = datos.auditoria.responsableArea?.nombre || '';
  
  // Detectar si el nombre es un UUID o un ID técnico (ej: f56f5b05-...)
  const esIdTecnico = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nombreDisplay) || 
                     (nombreDisplay.length > 20 && nombreDisplay.includes('-')) ||
                     nombreDisplay.startsWith('aud-');

  if (!nombreDisplay || nombreDisplay === 'Sin nombre' || esIdTecnico) {
    // Si es ID, intentamos tomar el nombre del Jefe OCI o el primer auditor si existe como respaldo
    const jefeOCI = (datos.auditoria as any).jefeOCI;
    nombreDisplay = jefeOCI || 'RESPONSABLE';
  }
  
  const cargoResp = datos.auditoria.responsableArea?.cargo || 'Director(a) Territorial';
  const territorial = datos.auditoria.territorial || 'Antioquia';
  const rawVigencia = String(datos.auditoria.año || datos.auditoria.vigencia || fechaActual.getFullYear());
  const matchAño = rawVigencia.match(/\d{4}/);
  const vigencia = matchAño ? Number(matchAño[0]) : fechaActual.getFullYear();
  const periodoVigencia = vigencia - 1;

  doc.setFont('helvetica', 'normal');
  doc.text('Doctor', margin, y); y += 5;
  
  doc.setFont('helvetica', 'bold');
  if (nombreDisplay !== 'RESPONSABLE') {
    doc.text(nombreDisplay.toUpperCase(), margin, y); y += 4;
  } else {
    doc.text('DIRECTOR(A) TERRITORIAL', margin, y); y += 4;
  }
  
  doc.setFont('helvetica', 'normal');
  if (cargoResp.toUpperCase() !== nombreDisplay.toUpperCase() && nombreDisplay !== 'RESPONSABLE') {
    doc.text(cargoResp, margin, y); y += 4;
  }
  doc.text('Escuela Superior de Administración Pública', margin, y); y += 4;
  doc.text(territorial === 'Sede Central' ? 'Sede Central' : `Territorial ${territorial}`, margin, y); y += 15;

  doc.setFont('helvetica', 'bold');
  const textoAsunto = `Asunto: Informe Ejecutivo de Auditoría Territorial ${territorial}.`;
  doc.text(textoAsunto, margin, y); y += 15;

  doc.setFont('helvetica', 'normal');
  // Extraer apellido para el saludo si es posible
  const partesNombre = nombreDisplay.split(' ');
  const apellido = partesNombre.length > 1 ? partesNombre[partesNombre.length - 2] : (partesNombre[0] !== 'RESPONSABLE' ? partesNombre[0] : 'Responsable');
  
  doc.text('Respetado Doctor ', margin, y);
  const wDoc = doc.getTextWidth('Respetado Doctor ');
  doc.setFont('helvetica', 'bold');
  doc.text(apellido, margin + wDoc, y);
  const wAp = doc.getTextWidth(apellido);
  doc.setFont('helvetica', 'normal');
  doc.text(' reciba un cordial saludo.', margin + wDoc + wAp, y);
  y += 15;

  const periodoEvaluado = datos.auditoria.periodoEvaluado || `1 de enero al 31 de diciembre de ${periodoVigencia}`;

  const parrafo1 = `La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría del año ${vigencia}, remite para su conocimiento y fines pertinentes el Informe Ejecutivo de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la Territorial ${territorial} del período comprendido entre el ${periodoEvaluado}.`;
  const lineasP1 = doc.splitTextToSize(parrafo1, pageWidth - (margin * 2));
  doc.text(lineasP1, margin, y);
  y += (lineasP1.length * 5) + 8;

  const parrafo2 = `El informe final de la auditoría de evaluación independiente (informe detallado), se encuentra publicado para consulta en la página web de la entidad, en el link: https://www.esap.edu.co/esap/organigrama/direccion-nacional/oficina-control-interno/ (Auditoría Internas de Evaluación).`;
  const lineasP2 = doc.splitTextToSize(parrafo2, pageWidth - (margin * 2));
  doc.text(lineasP2, margin, y);
  y += (lineasP2.length * 5) + 12;

  const jefeOCINombre = (datos.auditoria as any).jefeOCI || 'MARIO OSWALDO BERNAL RODRÍGUEZ';
  
  doc.text('Estamos atentos a inquietudes.', margin, y); y += 10;
  doc.text('Cordialmente,', margin, y); y += 15;

  doc.setFont('helvetica', 'bold');
  doc.text(jefeOCINombre.toUpperCase(), margin, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Jefe Oficina de Control Interno', margin, y); y += 15;

  doc.setFontSize(8);
  doc.text('Anexos: Informe ejecutivo y plan de mejoramiento.', margin, y); y += 5;
  doc.text('Copia: N/A', margin, y); y += 10;

  const auditorLiderRawCarta = datos.auditoria.auditorLider;
  const auditorLiderNombreCarta = (typeof auditorLiderRawCarta === 'object' && auditorLiderRawCarta !== null) 
    ? (auditorLiderRawCarta.nombre || auditorLiderRawCarta.nombreCompleto || 'Auditor Líder') 
    : (auditorLiderRawCarta || 'Auditor Líder');

  doc.text(`Elaboró: ${auditorLiderNombreCarta}`, margin, y); y += 4;
  doc.text(`Revisó: ${jefeOCINombre} – jefe oficina OCI`, margin, y); y += 4;
  doc.text(`Aprobó: ${jefeOCINombre} – jefe oficina OCI`, margin, y);

  // --- CUERPO DEL INFORME (EM-FO-011) ---
  const config011: ConfiguracionDocumento = {
    codigo: 'EM-FO-011',
    version: 2,
    fecha: '24/02/2025',
    titulo: 'FORMATO INFORME EJECUTIVO DE AUDITORÍA INTERNA OCI',
    proceso: 'Evaluación Control y Mejora',
    documentoReferencia: 'Procedimiento Auditorías internas basadas en riesgos EM-PT-004'
  };

  doc.addPage();
  y = dibujarEncabezadoInstitucional(doc as any, config011, 10);
  y += 5;

  const real = (aud: any, cont: any) => {
    let val = aud;
    if (Array.isArray(val)) val = val.join('\n');
    if (val && String(val).length > 5) return val;
    let cVal = cont;
    if (Array.isArray(cVal)) cVal = cVal.join('\n');
    return cVal || '';
  };

  const objetivosText = real(datos.auditoria.objetivo || datos.auditoria.objetivos, datos.resumen?.objetivos || datos.resumen?.objetivo);
  const alcanceText = real(datos.auditoria.alcance, datos.resumen?.alcance);

  // --- TABLA DE INFORMACIÓN GENERAL (Estilo Grilla) ---
  const bodyInfoGral = [
    [{ content: `TITULO DE LA AUDITORIA (unidad auditable): ${datos.auditoria.nombre || ''}`, styles: { fontStyle: 'bold' } }],
    [{ content: `RESPONSABLE DE LA UNIDAD AUDITADA: ${nombreDisplay !== 'RESPONSABLE' ? nombreDisplay : ''} – ${cargoResp}`, styles: { fontStyle: 'bold' } }],
    [{ content: `LUGAR Y FECHA DE EJECUCIÓN AUDITORIA: ${territorial} / ${rangoFechas}`, styles: { fontStyle: 'bold' } }],
    [{ content: `PERIODO DE LA AUDITORIA: ${periodoEvaluado}`, styles: { fontStyle: 'bold' } }],
    [{ content: `EQUIPO AUDITOR:\n${(datos.auditoria.equipoAuditores || []).map((a: any) => `${a.nombre} - ${a.rol}`).join('\n')}`, styles: { fontStyle: 'bold' } }],
    [{ content: `OBJETIVO(S):\n${objetivosText}`, styles: { fontStyle: 'normal' } }],
    [{ content: `ALCANCE:\n${alcanceText}`, styles: { fontStyle: 'normal' } }],
  ];

  autoTable(doc as any, {
    startY: y,
    margin: { left: margin, right: margin },
    body: bodyInfoGral,
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: pageWidth - (margin * 2) } },
    didDrawPage: (data) => {
       y = data.cursor?.y || y;
    }
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  if (y > pageHeight - 60) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; }

  doc.setFont('helvetica', 'bold');
  doc.text('DECLARACIÓN:', margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  
  const txtDec1 = 'La auditoría se realiza con base en el análisis de diferentes muestras aleatorias seleccionadas por los auditores, y se fundamenta en el siguiente soporte documental: expedientes, procesos y procedimientos del Sistema de Gestión, reportes de los sistemas de información, cruces y validaciones, página web, intranet y normas internas y externas, entre otros.';
  const lineasDec1 = doc.splitTextToSize(txtDec1, pageWidth - (margin * 2));
  doc.text(lineasDec1, margin, y); y += (lineasDec1.length * 4) + 4;

  const txtDec2 = 'En aplicación al Decreto 648 de 2017 Artículo 2.2.21.4.8, la Oficina de Control Interno incorpora los siguientes Instrumentos para la Actividad de la Auditoría Interna:';
  const lineasDec2 = doc.splitTextToSize(txtDec2, pageWidth - (margin * 2));
  doc.text(lineasDec2, margin, y); y += (lineasDec2.length * 4) + 4;

  const txtDec3_1 = '1. Código de Ética del Auditor Interno que tiene como bases fundamentales, la integridad, objetividad, confidencialidad, conflictos de interés y competencia de éste.';
  const lineasDec3_1 = doc.splitTextToSize(txtDec3_1, pageWidth - (margin * 2) - 5);
  doc.text(lineasDec3_1, margin + 5, y); y += (lineasDec3_1.length * 4) + 2;

  const txtDec3_2 = '2. Estatuto de auditoría, en el cual se establecen y comunican las directrices fundamentales que definen el marco dentro del cual se desarrollan las actividades de la Oficina de Control Interno, según los lineamientos de las normas internacionales de auditoría.';
  const lineasDec3_2 = doc.splitTextToSize(txtDec3_2, pageWidth - (margin * 2) - 5);
  doc.text(lineasDec3_2, margin + 5, y); y += (lineasDec3_2.length * 4) + 4;

  const fechaCartaObj = datos.auditoria?.cronograma?.fechaCartaRepresentacion || datos.resumen?.fechaCartaRepresentacion;
  const fechaFallbackObj = datos.resumen?.fechaInicio || datos.auditoria?.cronograma?.inicio || datos.auditoria?.fechaInicio;
  const fechaFinalObj = fechaCartaObj || fechaFallbackObj;

  const fechaCartaStr = fechaFinalObj 
    ? new Date(fechaFinalObj).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : '__________';
  const txtDec4 = `De acuerdo con la Carta de representación formalizada el ${fechaCartaStr}, la ${territorial.includes('Territorial') ? territorial : 'Territorial ' + territorial} se comprometió a presentar a la Oficina de Control Interno información veraz, oportuna y de calidad.`;
  const lineasDec4 = doc.splitTextToSize(txtDec4, pageWidth - (margin * 2));
  doc.text(lineasDec4, margin, y); y += (lineasDec4.length * 4) + 4;

  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE SEGURIDAD Y CONFIDENCIALIDAD DE LA INFORMACIÓN:', margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const txtNotaSec = 'Este documento contiene información de interés exclusivo del auditor y el auditado para surtir los trámites establecidos en la Guía de Auditoria. En ese sentido, hasta tanto no se constituya como informe final y sea publicado en la página web de la ESAP, no podrá ser distribuido ni utilizado por terceros, ni se podrá hacer referencia a él en ningún otro asunto, sin el consentimiento previo y por escrito del Jefe de la Oficina de Control Interno.';
  const lineasNota = doc.splitTextToSize(txtNotaSec, pageWidth - (margin * 2));
  doc.text(lineasNota, margin, y); y += (lineasNota.length * 4) + 6;





      




  if (y > pageHeight - 40) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; }
  doc.setFontSize(9);

  const imprimirLineasSeguras = (lineas: string[]) => {
    lineas.forEach((linea: string) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5;
        doc.setFontSize(9);
      }

      // Detectar subtítulos (ej: "GESTION DOCUMENTAL:", "PQR:", etc.)
      // Se asume que son líneas cortas (< 60 caracteres) en mayúsculas que terminan en ":"
      const esSubtitulo = linea.trim().length < 60 && /^[A-ZÁÉÍÓÚÑ0-9,\s/]+:$/.test(linea.trim());

      if (esSubtitulo) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      doc.text(linea, margin, y);
      y += 4;
      
      // Siempre resetear a normal por si acaso la siguiente línea no entra en el loop de inmediato
      doc.setFont('helvetica', 'normal');
    });
  };

  doc.setFont('helvetica', 'bold');
  doc.text('EVALUACIÓN DEL CONTROL INTERNO DEL PROCESO:', margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const evalControl = datos.resumen?.evaluacionControlInterno || 'Como resultado del trabajo desarrollado, se identifica que el control interno del proceso se encuentra en proceso de mejora.';
  const lineasEval = doc.splitTextToSize(evalControl, pageWidth - (margin * 2));
  imprimirLineasSeguras(lineasEval);
  y += 2;

  if (y > pageHeight - 35) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
  doc.setFont('helvetica', 'bold');
  doc.text('FORTALEZAS:', margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const fortalezas = datos.resumen?.leccionesAprendidas || 'o Personal del área con idoneidad técnica.\no Procedimientos documentados.\no Disposición y organización de la información solicitada por la auditoría.\no Adaptación al cambio.\no Posicionamiento.';
  const lineasFort = doc.splitTextToSize(fortalezas, pageWidth - (margin * 2));
  imprimirLineasSeguras(lineasFort);
  y += 2;

  if (y > pageHeight - 35) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
  doc.setFont('helvetica', 'bold');
  doc.text('RECOMENDACIONES:', margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  
  const nombreTerritorial = territorial.includes('Territorial') || territorial.includes('Dirección') 
    ? territorial 
    : 'Dirección Territorial ' + territorial;
    
  const txtRecIntro = `A continuación, se relacionan las recomendaciones que surgen del trabajo de auditoría realizado a la ${nombreTerritorial}.`;
  
  const textoEstructuradoRec = `GESTION DOCUMENTAL:
1) Formalizar actas como evidencia de las actividades del plan de mejoramiento asociadas a la entrega de expedientes y roles.
2) Garantizar que se cuente con las evidencias de cada uno de los puntos del plan de mejoramiento de gestión documental, y cuando se trate de imágenes incluir una descripción detallada.

PQR:
3) Dar respuestas a PQRSDF dentro de los términos de acuerdo con la Ley 1755:2015.
4) Capacitar a los funcionaros en las distintas modalidades de peticiones (Ley 1755:2015).
5) Establecer un mecanismo que permita llevar control para el cierre de las diferentes solicitudes en el aplicativo Active Document.

SERVICIOS TECNOLÓGICOS, MESA DE AYUDA:
6) Continuar con la sensibilización a los docentes para el uso de las seis (6) aulas híbridas.

REGISTRO Y CONTROL:
7) Validar cumplimiento a los requisitos exigidos a los estudiantes para acceder a la gratuidad.

PROGRAMAS ACADEMICOS:
8) Proponer en el Consejo Académico Territorial a la instancia pertinente, la actualización del artículo 20 del Acuerdo 08 de 2021, o formalizar el reglamento para el Consejo Académico Territorial contemplando los siguientes aspectos: Funciones del encargado de presidir el comité, funciones del secretario técnico, funciones de los integrantes, formalización de convocatoria a reuniones ordinarias y extraordinarias, quórum y mayorías (toma de decisiones), frecuencia de reuniones ordinarias y extraordinarias, formalizar la renuncia de un integrante, reelección de integrantes, participación de los invitados, sesiones virtuales o presenciales).
9) En las actas del Consejo Académico Territorial, formalizar explícitamente la votación para la toma de decisiones.
10) El Coordinador Académico de la Territorial, evidenciar su gestión como Secretario Técnico del Comité Operativo de los convenios (ejemplo Samaná). 11) Formalizar la firma de los microcurrículos por parte de los docentes.

ASISTENCIA TÉCNICA:
12) Formalizar las fechas en las encuestas satisfacción.

INDUCCIÓN ALTO GOBIERNO (ASISTENCIA TECNICA Y CAPACITACIÓN):
13) Mantener las buenas prácticas en asistencia técnica y capacitación.

CAPACITACIÓN:
14) Realizar análisis de deserción de Moodle.
15) Realizar análisis de la pertinencia de los programas ofertados.

PROGRAMA GRADUADOS:
16) Fomentar la asistencia al encuentro de egresados.
17) Gestionar el uso de las herramientas entregadas por la Subdirección Nacional Académica (portal web de trabajo).

PROCESOS JUDICIALES:
18) Continuar con el orden y la rigurosidad implementados en el tratamiento de las acciones de tutela y demás requerimientos jurídicos, lo cual ha contribuido a que no se presenten demandas ni denuncias en la sede territorial.

CONTRATACION:
19) El cumplimiento de la Resolución No. SC-049 del 13 de enero de 2023, la cual en su artículo segundo establece que: “Los servidores públicos y colaboradores de la Sede Central y las Direcciones Territoriales de la ESAP tienen la obligación de hacer uso del Sistema de Gestión Documental como único gestor documental adoptado e implementado por la entidad, para la gestión y respuesta de las comunicaciones oficiales, los PQRSD y las comunicaciones recibidas o emitidas por la entidad, así como para la conformación de expedientes electrónicos de archivo en sus diferentes fases de gestión e inactiva.”
20) El uso del Formato BS-FO-051 Acta de Cierre del Expediente Contractual, documento requerido conforme al MANUAL DE CONTRATACIÓN CÓDIGO: BS-MA-001 CAPÍTULO II - GESTIÓN CONTRACTUAL Y COMPETENCIAS EN ESTA ACTIVIDAD numerales “2.1 Proceso de gestión de la actividad contractual y etapas para su desarrollo” y el numeral “5.3. Cierre del expediente contractual”. Este instrumento es esencial para dejar constancia del cumplimiento de las obligaciones contractuales, verificar los soportes exigidos y formalizar el cierre administrativo del expediente.
21) Dejar constancia de la aprobación de las pólizas en la plataforma SECOP II, ya que constituye un requisito indispensable para la ejecución de los contratos.
22) Fortalecer la etapa precontractual, especialmente en lo relacionado con la coherencia del objeto contractual entre los documentos del proceso y la validación rigurosa de los antecedentes.
23) Fortalecer los informes de supervisión de los contratos bienestar universitario, para que contenga todos los documentos que soportan el cumplimiento de las obligaciones del contratista y ejecución del contrato como el número de participantes, valor de cada actividad, lista de asistencia y encuestas de avaluación establecidas en la aceptación de la oferta. Estos elementos son esenciales para garantizar la transparencia y cumplimiento de las obligaciones contractuales

PRESUPUESTO, CONTABILIDAD, CARTERA, TESORERIA y NOMINA:
24) Gestionar la actualización de los inventarios en SEVEN para cada bodega.
25) Fortalecer la gestión para la adquisición de software adecuado para el trámite de la nómina de catedráticos.
26) Con apoyo de personal técnico, mejorar la automatización de los archivos de Excel que se utilizan para generar la nómina de catedráticos.
27) Tener disponibles los desprendibles de pago mensuales para todos los docentes catedráticos.

INVENTARIO:
28) Fortalecer la gestión del proceso de baja de elementos completamente inservibles (monitores, equipos electrónicos).

INFRAESTRUCTURA:
29) Priorizar los mantenimientos a las humedades en fachadas, transformador y plataforma hidráulica
30) Garantizar las condiciones para el adecuado control de plagas.
31) Priorizar la gestión para la puesta en funcionamiento del ascensor de la sede.

SEGURIDAD Y SALUD EN EL TRABAJO:
32) Continuar con la implementación y mejora del Sistema de Gestión de la Seguridad y Salud en el Trabajo (SG-SST) en la sede territorial.

GESTION PROFESORAL:
33) Generar evidencia de la asistencia de los docentes de la sede Manizales a las clases presenciales y virtuales con el fin de contar con trazabilidad a futuro.
34) Fortalecer la gestión para la realización de convocatorias de docentes catedráticos con el fin de minimizar la contratación de personal fuera de la región.`;

  const recomendaciones = datos.resumen?.recomendaciones ? `${txtRecIntro}\n\n${datos.resumen.recomendaciones}` : `${txtRecIntro}\n\n${textoEstructuradoRec}`;
  const lineasRec = doc.splitTextToSize(recomendaciones, pageWidth - (margin * 2));
  imprimirLineasSeguras(lineasRec);
  y += 2;

  // --- SECCIÓN DE HALLAZGOS ---
  if (datos.hallazgos && datos.hallazgos.length > 0) {
    if (y > pageHeight - 30) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('HALLAZGOS IDENTIFICADOS EN EL PROCESO:', margin, y);
    y += 8;
    
    datos.hallazgos.forEach((h: any, index: number) => {
      if (y > pageHeight - 40) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; }
      
      const numIdx = index + 1;
      const titH = `HALLAZGO No. ${numIdx}${h.titulo ? ' - ' + h.titulo.toUpperCase() : ''}`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const lTit = doc.splitTextToSize(titH, pageWidth - (margin * 2));
      doc.text(lTit, margin, y); y += (lTit.length * 4) + 2;
      
      doc.setFontSize(9);
      if (h.descripcion) {
        if (y > pageHeight - 20) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
        doc.setFont('helvetica', 'bold'); doc.text('CONDICIÓN:', margin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lCond = doc.splitTextToSize(h.descripcion, pageWidth - (margin * 2));
        doc.text(lCond, margin, y); y += (lCond.length * 4) + 2;
      }
      if (h.criterioIncumplido) {
        if (y > pageHeight - 20) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
        doc.setFont('helvetica', 'bold'); doc.text('CRITERIOS:', margin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lCrit = doc.splitTextToSize(h.criterioIncumplido, pageWidth - (margin * 2));
        doc.text(lCrit, margin, y); y += (lCrit.length * 4) + 2;
      }
      if (h.causas && h.causas.length > 0) {
        if (y > pageHeight - 20) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
        doc.setFont('helvetica', 'bold'); doc.text('CAUSA:', margin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lCausa = doc.splitTextToSize(h.causas.join(', '), pageWidth - (margin * 2));
        doc.text(lCausa, margin, y); y += (lCausa.length * 4) + 2;
      }
      if (h.efectos && h.efectos.length > 0) {
        if (y > pageHeight - 20) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
        doc.setFont('helvetica', 'bold'); doc.text('CONSECUENCIA O EFECTOS:', margin, y); y += 4;
        doc.setFont('helvetica', 'normal');
        const lEf = doc.splitTextToSize(h.efectos.join(', '), pageWidth - (margin * 2));
        doc.text(lEf, margin, y); y += (lEf.length * 4) + 6;
      }
    });
  }

  if (y > pageHeight - 35) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 5; doc.setFontSize(9); }
  doc.setFont('helvetica', 'bold');
  doc.text('CONCLUSIONES:', margin, y); y += 4;
  doc.setFont('helvetica', 'normal');
  const territorialConc = territorial.includes('Territorial') ? territorial : 'Territorial ' + territorial;
  const textoDefaultConc = `Adelantadas las pruebas de Auditoría Interna basada en riesgos a los Procesos de Efectividad institucional, Relacionamiento con la ciudadanía, Transformación digital, Formación para la vida, Proyección y extensión, Gestión legal, Adquisición de bienes y servicios, Bien - estar, Gestión financiera, Gestión administrativa y Gestión talento humano, al interior de la ${territorialConc} de la Escuela Superior de Administración Pública – ESAP, se tienen las siguientes conclusiones:

o En las sesiones del Consejo Académico, se tomaron decisiones sin la participación del Coordinador Académico, Representante de los Estudiantes y Representante de los Egresados, lo cual podría conllevar a la materialización de riesgos dirigidos a la validez en la toma de decisiones.

o En los contratos auditados, se evidenció deficiencias en la supervisión respecto a la elaboración de los informes de ejecución sin información precisa, completa, verificable y la entrega de los productos pactados.

o En la gestión de almacén e inventarios, se evidenciaron unas diferencias de dos elementos en la bodega de bienes de consumo, lo cual podría conllevar a la materialización de los siguientes riesgos contemplados en el mapa de riesgos institucional: Posibilidad de pérdida económica y reputacional por extravío de bienes o daño de estos debido a falta de custodia de los bienes o inadecuada manipulación de estos.

El informe final de la auditoría de evaluación independiente (informe detallado), se encuentra publicado para consulta en la página web de la entidad, en el link: https://www.esap.edu.co/esap/organigrama/direccion-nacional/oficina-control-interno`;

  const conclusiones = datos.resumen?.conclusiones || textoDefaultConc;
  const lineasConc = doc.splitTextToSize(conclusiones, pageWidth - (margin * 2));
  imprimirLineasSeguras(lineasConc);
  y += 8;


  if (y > pageHeight - 40) { doc.addPage(); y = dibujarEncabezadoInstitucional(doc as any, config011, 10) + 15; }
  doc.line(margin, y, margin + 60, y);
  doc.line(margin + 80, y, margin + 140, y);
  y += 4;
  
  const auditorLiderRaw = datos.auditoria.auditorLider;
  const auditorLiderNombre = (typeof auditorLiderRaw === 'object' && auditorLiderRaw !== null) 
    ? (auditorLiderRaw.nombre || auditorLiderRaw.nombreCompleto || 'AUDITOR LÍDER') 
    : (auditorLiderRaw || 'AUDITOR LÍDER');

  doc.setFont('helvetica', 'bold');
  doc.text((datos.auditoria as any).jefeOCI || 'MARIO OSWALDO BERNAL RODRÍGUEZ', margin, y);
  doc.text(String(auditorLiderNombre).toUpperCase(), margin + 80, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Jefe Oficina de Control Interno', margin, y);
  doc.text('Auditor Líder', margin + 80, y);

  // --- ANEXO: PLAN DE MEJORAMIENTO (EM-FO-002) - TAMBIÉN VERTICAL ---
  const config002: ConfiguracionDocumento = {
    codigo: 'EM-FO-002',
    version: 2,
    fecha: '1/04/2025',
    titulo: 'FORMATO PLAN DE MEJORAMIENTO AUDITORIA INTERNA OCI',
    proceso: 'Evaluación Control y Mejora'
  };

  doc.addPage();
  y = dibujarEncabezadoInstitucional(doc as any, config002, 10);
  y += 5;

  const body: any[] = [];
  (datos.hallazgos || []).forEach((h, idx) => {
    const acciones = (datos.planes || []).flatMap(p => p.acciones || []);
    if (acciones.length === 0) {
      body.push([idx + 1, (h.descripcion || h.titulo || '—').substring(0, 100), '—', '—', '—', '1', '01/09', '31/12', '3', '—', '0.0', '0.2', '0.0', 'NO', 'NO', 'Abierta', 'OCI']);
    } else {
      acciones.forEach((acc, aIdx) => {
        body.push([aIdx === 0 ? idx + 1 : '', aIdx === 0 ? (h.descripcion || h.titulo || '—').substring(0, 100) : '', aIdx === 0 ? ((h.causas || []).join(', ')).substring(0, 50) : '', acc.descripcion || '—', acc.observacionOci || '—', '1', '01/09', acc.fechaFin || '31/12', '3', acc.responsable || '—', '0.0', '0.2', '0.0', 'NO', 'NO', acc.estadoVerificacionOci === 'Cumplida' ? 'Cerrada' : 'Abierta', 'OCI']);
      });
    }
  });

  autoTable(doc as any, {
    startY: y,
    margin: { left: 5, right: 5 },
    head: [
      [{ content: 'N°', rowSpan: 2 }, { content: 'Hallazgo', rowSpan: 2 }, { content: 'Causas', rowSpan: 2 }, { content: 'Acción', rowSpan: 2 }, { content: 'Soporte', rowSpan: 2 }, { content: 'Cant', rowSpan: 2 }, { content: 'Inicio', rowSpan: 2 }, { content: 'Fin', rowSpan: 2 }, { content: 'Mes', rowSpan: 2 }, { content: 'Responsable', rowSpan: 2 }, { content: 'CUMPLI', colSpan: 3 }, { content: 'EFECT', colSpan: 2 }, { content: 'EST', rowSpan: 2 }, { content: 'OCI', rowSpan: 2 }],
      ['Par', 'Pon', 'Pts', 'Ct', 'Vl']
    ],
    body: body,
    theme: 'grid',
    styles: { fontSize: 4.5, cellPadding: 0.5, halign: 'center' },
    headStyles: { fillColor: [0, 61, 165], fontSize: 4.5 },
    columnStyles: { 1: { halign: 'left', cellWidth: 30 }, 2: { halign: 'left', cellWidth: 20 }, 3: { halign: 'left', cellWidth: 30 }, 4: { halign: 'left', cellWidth: 20 }, 9: { cellWidth: 20 } },
    didDrawPage: (data) => {
      // Dibujar pie en cada página que genere la tabla
      dibujarPieInstitucional(doc as any, data.pageNumber, true);
    }
  });

  try {
    // Pie en todas las páginas
    const totalP = (doc as any).getNumberOfPages();
    for (let i = 1; i <= totalP; i++) {
      (doc as any).setPage(i);
      if (i > 1) dibujarPieInstitucional(doc as any, i, true);
    }

    const safeCodigo = (datos.auditoria.codigo || 'Reporte').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Informe_Ejecutivo_${safeCodigo}.pdf`;
    
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    
    // Intento 1: Descarga forzada
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Intento 2: Abrir en pestaña nueva (respaldo)
    window.open(url, '_blank');
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (error) {
    console.error('Error detallado al generar el PDF ejecutivo:', error);
    throw new Error('Error al procesar el resumen ejecutivo.');
  }
}
