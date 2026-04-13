/**
 * Servicio para exportar PDF de Informe de Cierre e Informe Ejecutivo
 * Formato ESAP institucional (mismo que otros informes de auditoría)
 */

import type { jsPDF as JsPDFType } from 'jspdf';
import { dibujarEncabezadoInstitucional, dibujarPieInstitucional, DOCUMENTOS_PREDEFINIDOS, type ConfiguracionDocumento } from './pdfESAPHeader';

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
      if (h.fechaDeteccion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`Detectado: ${formatearFecha(h.fechaDeteccion)}`, margin + 3, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
      }
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

  // Pie en todas las páginas
  const totalPages = (doc as any).getNumberOfPages?.() || 1;
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);
    dibujarPieInstitucional(doc as any, i, true);
  }

  doc.save(`Informe_Cierre_${datos.auditoria.codigo}.pdf`);
}

/**
 * Genera y descarga el PDF del Informe Ejecutivo (resumen condensado)
 */
export async function exportarPDFInformeEjecutivo(datos: DatosInformeCierre): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc: JsPDFType = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' }) as unknown as JsPDFType;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;

  const baseConfig = DOCUMENTOS_PREDEFINIDOS.PLAN_ANUAL as ConfiguracionDocumento;
  const configDoc: ConfiguracionDocumento = {
    ...baseConfig,
    titulo: 'INFORME EJECUTIVO DE AUDITORÍA',
  };

  let y = dibujarEncabezadoInstitucional(doc as any, configDoc, 28);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

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
  const todasLasAcciones: AccionPlanPDF[] = [];
  for (const plan of datos.planes) {
    for (const accion of plan.acciones || []) {
      todasLasAcciones.push(accion);
    }
  }
  const cumplidas = todasLasAcciones.filter(a => String(a.estadoVerificacionOci || '').toLowerCase() === 'cumplida').length;
  const ratificados = datos.hallazgos.filter(h => /ratificado|modificado/i.test(String(h.decisionAuditor || h.estado || ''))).length;
  const hallazgosCriticos = numeroSeguro(aud.estadisticas?.hallazgosCriticos, audAny.hallazgosCriticos, contarHallazgosPorGravedad(datos.hallazgos, 'CRITICO'));
  const hallazgosMayores = numeroSeguro(aud.estadisticas?.hallazgosMayores, audAny.hallazgosMayores, contarHallazgosPorGravedad(datos.hallazgos, 'GRAVE'));
  const hallazgosMenores = numeroSeguro(aud.estadisticas?.hallazgosMenores, audAny.hallazgosMenores, contarHallazgosPorGravedad(datos.hallazgos, 'MENOR'));
  const tipoAuditoria = primerValor(aud.tipo, audAny.tipoAuditoria, resumen?.tipo);
  const estadoAuditoria = primerValor(aud.estado, audAny.estadoKanban, audAny.fase, resumen?.estado);
  const areaAuditable = primerValor(aud.areaAuditable, audAny.areaResponsable, audAny.areaObjetivo, audAny.areaAuditada);
  const procesoNombre = primerValor(aud.procesoNombre, audAny.proceso, audAny.procesoAuditado);
  const nivelRiesgo = primerValor(aud.nivelRiesgo, audAny.riesgoKanban, audAny.nivelRiesgoKanban, audAny.riesgo, audAny.calificacionRiesgo);
  const territorial = primerValor(aud.territorial, audAny.territorial, audAny.sede, audAny.lugarEjecucion);
  const auditorLiderNombre = primerValor(aud.auditorLider, audAny.auditorLider?.nombre, audAny.auditorLiderNombre, audAny.responsable);
  const responsableAreaNombre = primerValor(aud.responsableArea?.nombre, audAny.responsableAreaNombre, audAny.responsableUnidad, audAny.responsable);
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
    ['Territorial', texto(territorial)],
    ['Auditor Líder', textoHumano(auditorLiderNombre)],
    ['Responsable del área', textoHumano(responsableAreaNombre)],
    ['Período', fechasStr],
    ['Plan vinculado', planCodigo],
    ['Progreso', texto(progresoGeneral)],
  ];
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—').substring(0, 85), margin + 55, y);
    y += 6;
  });

  if (aud.equipoAuditores && aud.equipoAuditores.length > 0) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Equipo:', margin, y);
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
    const lineasAlc = doc.splitTextToSize(aud.alcance.substring(0, 350) + (aud.alcance.length > 350 ? '…' : ''), maxWidth - 4);
    doc.text(lineasAlc, margin + 2, y);
    y += lineasAlc.length * 4 + 4;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. RESULTADOS DE LA AUDITORÍA', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  const rowsRes = [
    ['Hallazgos totales', String(datos.hallazgos.length)],
    ['Hallazgos ratificados', String(ratificados)],
    ['Hallazgos críticos', String(hallazgosCriticos)],
    ['Hallazgos mayores', String(hallazgosMayores)],
    ['Hallazgos menores', String(hallazgosMenores)],
    ['Acciones cumplidas', `${cumplidas} de ${todasLasAcciones.length}`],
  ];
  rowsRes.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—'), margin + 55, y);
    y += 6;
  });
  y += 8;

  // Trazabilidad de hallazgos (resumen)
  if (datos.hallazgos.length > 0) {
    if (y > pageHeight - 60) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. TRAZABILIDAD DE HALLAZGOS', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    datos.hallazgos.forEach((h, idx) => {
      if (y > pageHeight - 25) { doc.addPage(); y = margin; }
      const decision = (h.decisionAuditor || h.estado || 'Sin decisión').toUpperCase();
      const gravedad = h.gravedad ? ` · ${h.gravedad}` : '';
      const titulo = (h.titulo || h.descripcion || '—').substring(0, 70) + ((h.titulo || h.descripcion || '').length > 70 ? '…' : '');
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}. ${h.codigo || h.id} — ${decision}${gravedad}`, margin, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.text(titulo, margin + 3, y);
      y += 6;
    });
    y += 4;
  }

  // Lecciones aprendidas (completo, sin truncar)
  if (resumen?.leccionesAprendidas?.trim()) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('4. LECCIONES APRENDIDAS', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(resumen.leccionesAprendidas, maxWidth);
    doc.text(lineas, margin, y);
    y += lineas.length * 4 + 8;
  }

  // Recomendaciones (completo, sin truncar)
  if (resumen?.recomendacionesFuturasAuditorias?.trim()) {
    if (y > pageHeight - 50) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('5. RECOMENDACIONES PARA FUTURAS AUDITORÍAS', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(resumen.recomendacionesFuturasAuditorias, maxWidth);
    doc.text(lineas, margin, y);
    y += lineas.length * 4 + 4;
  }

  // Pie
  const totalPages = (doc as any).getNumberOfPages?.() || 1;
  for (let i = 1; i <= totalPages; i++) {
    (doc as any).setPage(i);
    dibujarPieInstitucional(doc as any, i, true);
  }

  doc.save(`Informe_Ejecutivo_${datos.auditoria.codigo}.pdf`);
}
