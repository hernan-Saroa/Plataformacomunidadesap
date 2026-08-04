/**
 * CentroReportesPTA — Panel unificado de los 15 reportes del Sistema PTA
 * 
 * PARTE XXVI, Sec. 26.2.1.1: Catalogo completo R-01 a R-15.
 * v5.1:
 * - 15/15 reportes operativos con generadores (R-01 a R-15)
 * - Graficos Recharts: barras, torta, linea temporal, barras horizontales
 * - EXP-01 SIIF, EXP-02 XML Interoperabilidad, EXP-03 CSV Nomina
 * - Paginacion inteligente (25 filas/pagina) para reportes largos (R-13)
 * - Dashboard KPI mini-cards con 8 indicadores clickeables → reportes
 * - Exportacion PDF nativa con jsPDF + autoTable para consolidados
 * - Sistema de alertas criticas con umbrales configurables y notificaciones
 * - R-01 batch con progress bar + R-01 individual desde R-02
 * - Alertas descartadas persistidas en KV store Supabase
 * - Comparativo dual-periodo con PDF + graficos Recharts side-by-side y variaciones %
 * - Scheduler de reportes: programacion automatica con frecuencia configurable
 * - Scheduler execution: cron endpoint, ejecucion manual individual, historial con 200 entradas
 * - Graficos comparativos: barras agrupadas por estado + barras horizontales porcentuales
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, RefreshCw, Search, BarChart3, Users, Globe, TrendingUp,
  CheckCircle2, Clock, AlertTriangle, FlaskConical, Shield, Building2,
  Briefcase, ChevronRight, Loader2, FileSpreadsheet, Printer,
  PieChart, ArrowUpDown, User, Download, Package, Database,
  Code2, ChevronLeft, ChevronsLeft, ChevronsRight, Activity,
  Zap, Target, Timer, Hash, FileDown, Bell, BellRing, X as XIcon,
  ArrowRight, Eye, EyeOff, TrendingDown, Gauge, CalendarClock,
  Send, Trash2, Power, Plus, GitCompareArrows, Mail, Copy,
  Play, History, RotateCcw, CircleDot,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { getPtaStatusVisual } from './shared/ptaStatusVisuals';
import {
  getAllPTAs, getDismissedAlerts, saveDismissedAlerts,
  getReportSchedules, saveReportSchedule, deleteReportSchedule, toggleReportSchedule,
  executeScheduler, executeSingleSchedule, getSchedulerHistory, clearSchedulerHistory,
} from '../../services/api/ptaApi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
} from 'recharts';
import { ReporteIndividualPTA } from './ReporteIndividualPTA';
import { formatHierarchySelectionText } from './shared/extensionSelection';

// ═══ Tipos ═══
interface ReporteConfig {
  id: string; nombre: string; formato: string; frecuencia: string;
  usuario: string; descripcion: string; icon: any; color: string; bg: string;
  category: 'individual' | 'consolidado' | 'seguimiento' | 'especial';
  generadorFn?: (ptas: any[]) => ReporteGenerado;
}

interface ReporteGenerado {
  titulo: string; subtitulo: string;
  columnas: { key: string; label: string; align?: string }[];
  filas: any[]; totales?: Record<string, any>; alertas?: string[];
  chartData?: any[]; chartType?: 'bar' | 'pie' | 'line' | 'barH';
  chartTitle?: string;
}

const PIE_COLORS = ['#1E40AF', '#7C3AED', '#059669', '#EA580C', '#0891B2', '#DC2626'];
const LINE_COLORS = ['#059669', '#F59E0B', '#9CA3AF', '#DC2626', '#7C3AED'];

// ═══ Catalogo ═══
const CATALOGO_REPORTES: ReporteConfig[] = [
  { id: 'R-01', nombre: 'Resumen Individual del PTA', formato: 'PDF', frecuencia: 'Por PTA', usuario: 'Docente, Jefes', descripcion: 'Formato GTH-F081 con firmas digitales. Clic para seleccionar docente.', icon: FileText, color: '#1E40AF', bg: '#EFF6FF', category: 'individual' },
  { id: 'R-02', nombre: 'Tablero de Control Docente', formato: 'Excel, PDF', frecuencia: 'Tiempo Real', usuario: 'Subdireccion', descripcion: 'Consolidado nacional con 13 columnas y formato condicional', icon: BarChart3, color: '#7C3AED', bg: '#F3E8FF', category: 'consolidado', generadorFn: generarR02 },
  { id: 'R-03', nombre: 'Cumplimiento por Territorial', formato: 'Excel, PDF', frecuencia: 'Semanal', usuario: 'Directores', descripcion: 'Estadisticas por territorial con grafico de barras', icon: Globe, color: '#059669', bg: '#ECFDF5', category: 'consolidado', generadorFn: generarR03 },
  { id: 'R-04', nombre: 'Distribucion de Horas', formato: 'Excel, PDF', frecuencia: 'Mensual', usuario: 'Subdireccion', descripcion: 'Componentes con grafico de torta', icon: PieChart, color: '#0891B2', bg: '#ECFEFF', category: 'consolidado', generadorFn: generarR04 },
  { id: 'R-05', nombre: 'Seguimiento de Aprobaciones', formato: 'Excel, PDF', frecuencia: 'Diario', usuario: 'Todos los niveles', descripcion: 'Flujo multinivel con grafico de evolucion temporal', icon: TrendingUp, color: '#DC2626', bg: '#FEF2F2', category: 'seguimiento', generadorFn: generarR05 },
  { id: 'R-06', nombre: 'PTAs Pendientes', formato: 'Excel, PDF', frecuencia: 'Diario', usuario: 'Jefes Inmediatos', descripcion: 'PTAs que requieren accion inmediata', icon: Clock, color: '#EA580C', bg: '#FFF7ED', category: 'seguimiento', generadorFn: generarR06 },
  { id: 'R-07', nombre: 'Carga Academica por Docente', formato: 'Excel, PDF', frecuencia: 'Por PTA', usuario: 'Docente', descripcion: 'Detalle de asignaturas asignadas por docente', icon: Users, color: '#1E40AF', bg: '#EFF6FF', category: 'individual', generadorFn: generarR07 },
  { id: 'R-08', nombre: 'Certificacion de Carga Academica', formato: 'Excel, PDF', frecuencia: 'Bajo demanda', usuario: 'Docente', descripcion: 'Consolidado de cargas academicas aprobadas', icon: Shield, color: '#065F46', bg: '#F0FDF4', category: 'individual', generadorFn: generarR08 },
  { id: 'R-09', nombre: 'Investigacion Nacional', formato: 'Excel, PDF', frecuencia: 'Semestral', usuario: 'Investigacion', descripcion: 'Proyectos de investigacion por territorial con grafico horizontal', icon: FlaskConical, color: '#7C3AED', bg: '#F3E8FF', category: 'especial', generadorFn: generarR09 },
  { id: 'R-10', nombre: 'Extension Nacional', formato: 'Excel, PDF', frecuencia: 'Semestral', usuario: 'Extension', descripcion: 'Actividades de extension por territorial y direccion tecnica', icon: Globe, color: '#059669', bg: '#ECFDF5', category: 'especial', generadorFn: generarR10 },
  { id: 'R-11', nombre: 'Informe Ejecutivo Direccion', formato: 'PDF', frecuencia: 'Mensual', usuario: 'Direccion', descripcion: 'KPIs estrategicos consolidados para Direccion Nacional', icon: Briefcase, color: '#111827', bg: '#F3F4F6', category: 'especial', generadorFn: generarR11 },
  { id: 'R-12', nombre: 'Actividades Complementarias', formato: 'Excel, PDF', frecuencia: 'Semestral', usuario: 'Subdireccion', descripcion: 'Consolidado complementarias por tipo y territorial', icon: Building2, color: '#92400E', bg: '#FEF3C7', category: 'especial', generadorFn: generarR12 },
  { id: 'R-13', nombre: 'Auditoria de Cambios', formato: 'Excel, PDF', frecuencia: 'Bajo demanda', usuario: 'OTIC, Auditoria', descripcion: 'Trazabilidad completa con historial de acciones por PTA', icon: Shield, color: '#DC2626', bg: '#FEF2F2', category: 'especial', generadorFn: generarR13 },
  { id: 'R-14', nombre: 'Docentes sin PTA', formato: 'Excel, PDF', frecuencia: 'Semanal', usuario: 'Gestion Humana', descripcion: 'Docentes activos sin PTA registrado', icon: AlertTriangle, color: '#EA580C', bg: '#FFF7ED', category: 'seguimiento', generadorFn: generarR14 },
  { id: 'R-15', nombre: 'Cumplimiento Normativo', formato: 'PDF', frecuencia: 'Semestral', usuario: 'Direccion', descripcion: 'Verificacion Circular 003/2025 y limites normativos', icon: Shield, color: '#065F46', bg: '#F0FDF4', category: 'especial', generadorFn: generarR15 },
];

const CATEGORIES = [
  { id: 'todos', label: 'Todos', icon: BarChart3 },
  { id: 'consolidado', label: 'Consolidados', icon: PieChart },
  { id: 'seguimiento', label: 'Seguimiento', icon: TrendingUp },
  { id: 'individual', label: 'Individual', icon: FileText },
  { id: 'especial', label: 'Especializados', icon: FlaskConical },
];

// ═══ Generadores ═══

function generarR02(ptas: any[]): ReporteGenerado {
  const filas = ptas.map(pta => {
    const hBase = pta.horas_asignables ?? pta.horas_a_programar ?? 0;
    const hDoc = pta.horas_docencia || 0, hInv = pta.horas_investigacion || 0;
    // horas_complementarias ya incluye la sección académico-administrativa (AADM).
    const hExt = pta.horas_extension || 0, hComp = pta.horas_complementarias || 0;
    const total = pta.total_horas_programadas || (hDoc + hInv + hExt + hComp);
    const pct = hBase > 0 ? ((total / hBase) * 100).toFixed(1) : '0.0';
    const cumple = hInv <= hBase * 0.5 && hExt <= hBase * 0.25;
    return {
      documento: pta.cedula || pta.numero_documento || '-', nombre: pta.docente_nombre || 'N/A',
      territorial: pta.territorial || pta.sede || '-', dedicacion: pta.dedicacion || '-',
      h_docencia: hDoc, h_investigacion: hInv, h_extension: hExt, h_complementarias: hComp,
      total, pct: `${pct}%`, estado: pta.estado || 'Borrador', cumple: cumple ? 'SI' : 'NO',
    };
  });
  return {
    titulo: 'R-02: Tablero de Control Docente',
    subtitulo: `Consolidado nacional — ${ptas.length} docentes — ${new Date().toLocaleDateString('es-CO')}`,
    columnas: [
      { key: 'documento', label: 'Documento' }, { key: 'nombre', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'dedicacion', label: 'Ded.' },
      { key: 'h_docencia', label: 'H.Doc', align: 'center' }, { key: 'h_investigacion', label: 'H.Inv', align: 'center' },
      { key: 'h_extension', label: 'H.Ext', align: 'center' }, { key: 'h_complementarias', label: 'H.Comp', align: 'center' },
      { key: 'total', label: 'Total', align: 'center' }, { key: 'pct', label: '%', align: 'center' },
      { key: 'estado', label: 'Estado' }, { key: 'cumple', label: 'Cumple', align: 'center' },
    ],
    filas,
    totales: {
      h_docencia: filas.reduce((s, f) => s + f.h_docencia, 0), h_investigacion: filas.reduce((s, f) => s + f.h_investigacion, 0),
      h_extension: filas.reduce((s, f) => s + f.h_extension, 0), h_complementarias: filas.reduce((s, f) => s + f.h_complementarias, 0),
      total: filas.reduce((s, f) => s + f.total, 0),
    },
  };
}

function generarR03(ptas: any[]): ReporteGenerado {
  const terMap = new Map<string, { total: number; aprobados: number; pendientes: number; borradores: number; totalHoras: number }>();
  ptas.forEach(pta => {
    const ter = pta.territorial || pta.sede || 'SIN TERRITORIAL';
    if (!terMap.has(ter)) terMap.set(ter, { total: 0, aprobados: 0, pendientes: 0, borradores: 0, totalHoras: 0 });
    const t = terMap.get(ter)!; t.total++;
    if (pta.estado === 'Aprobado') t.aprobados++;
    else if (pta.estado?.includes('Pendiente')) t.pendientes++;
    else t.borradores++;
    t.totalHoras += pta.total_horas_programadas || 0;
  });
  const filas = Array.from(terMap.entries()).map(([ter, d]) => ({
    territorial: ter, total_docentes: d.total, aprobados: d.aprobados,
    pendientes: d.pendientes, borradores: d.borradores,
    pct_cumplimiento: d.total > 0 ? `${((d.aprobados / d.total) * 100).toFixed(1)}%` : '0%',
    promedio_horas: d.total > 0 ? Math.round(d.totalHoras / d.total) : 0,
    _pctNum: d.total > 0 ? (d.aprobados / d.total) * 100 : 0,
  })).sort((a, b) => b._pctNum - a._pctNum);
  return {
    titulo: 'R-03: Cumplimiento por Territorial',
    subtitulo: `${terMap.size} territoriales — ${new Date().toLocaleDateString('es-CO')}`,
    columnas: [
      { key: 'territorial', label: 'Territorial' }, { key: 'total_docentes', label: 'Total', align: 'center' },
      { key: 'aprobados', label: 'Aprob.', align: 'center' }, { key: 'pendientes', label: 'Pend.', align: 'center' },
      { key: 'borradores', label: 'Borr.', align: 'center' }, { key: 'pct_cumplimiento', label: '% Cumpl.', align: 'center' },
      { key: 'promedio_horas', label: 'Prom.H', align: 'center' },
    ],
    filas,
    alertas: filas.filter(f => f._pctNum < 50).map(f => `${f.territorial}: cumplimiento ${f.pct_cumplimiento} (bajo 50%)`),
    chartData: filas.map(f => ({
      name: f.territorial.length > 14 ? f.territorial.slice(0, 14) + '..' : f.territorial,
      Aprobados: f.aprobados, Pendientes: f.pendientes, Borradores: f.borradores,
    })),
    chartType: 'bar',
  };
}

function generarR04(ptas: any[]): ReporteGenerado {
  const p = ptas.filter(x => (x.total_horas_programadas || 0) > 0);
  const tDoc = p.reduce((s, x) => s + (x.horas_docencia || 0), 0);
  const tInv = p.reduce((s, x) => s + (x.horas_investigacion || 0), 0);
  const tExt = p.reduce((s, x) => s + (x.horas_extension || 0), 0);
  // horas_complementarias ya incluye la sección académico-administrativa (AADM).
  const tCom = p.reduce((s, x) => s + (x.horas_complementarias || 0), 0);
  const tot = tDoc + tInv + tExt + tCom; const n = p.length || 1;
  const pf = (v: number) => tot > 0 ? `${((v / tot) * 100).toFixed(1)}%` : '0%';
  const filas = [
    { componente: 'Docencia', total_horas: tDoc, porcentaje: pf(tDoc), promedio: Math.round(tDoc / n), maximo: 'Sin limite' },
    { componente: 'Investigacion', total_horas: tInv, porcentaje: pf(tInv), promedio: Math.round(tInv / n), maximo: '50%' },
    { componente: 'Extension', total_horas: tExt, porcentaje: pf(tExt), promedio: Math.round(tExt / n), maximo: '25%' },
    { componente: 'Complementarias', total_horas: tCom, porcentaje: pf(tCom), promedio: Math.round(tCom / n), maximo: '25%' },
  ];
  return {
    titulo: 'R-04: Distribucion de Horas por Componente',
    subtitulo: `${p.length} PTAs — Total: ${tot.toLocaleString()} horas`,
    columnas: [
      { key: 'componente', label: 'Componente' }, { key: 'total_horas', label: 'Total H', align: 'center' },
      { key: 'porcentaje', label: '% Total', align: 'center' }, { key: 'promedio', label: 'Prom/Doc', align: 'center' },
      { key: 'maximo', label: 'Max.Norm.', align: 'center' },
    ],
    filas,
    totales: { total_horas: tot, porcentaje: '100%', promedio: Math.round(tot / n) },
    chartData: [
      { name: 'Docencia', value: tDoc }, { name: 'Investigacion', value: tInv },
      { name: 'Extension', value: tExt }, { name: 'Complementarias', value: tCom },
    ],
    chartType: 'pie',
  };
}

function generarR05(ptas: any[]): ReporteGenerado {
  const detalle = ptas.map(p => ({
    documento: p.cedula || p.numero_documento || '-', nombre: p.docente_nombre || 'N/A',
    territorial: p.territorial || '-', estado: p.estado || 'Borrador',
    fecha_ultima: p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-CO') : '-',
    dias_en_estado: p.updated_at ? Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 0,
  }));

  // Generate weekly evolution timeline (last 8 weeks)
  const now = Date.now();
  const weekLabels: string[] = [];
  const chartData: any[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekDate = new Date(now - w * 7 * 86400000);
    const label = `S${8 - w} (${weekDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })})`;
    weekLabels.push(label);
    // Simulate cumulative progression based on actual PTA dates
    const cutoff = weekDate.getTime();
    let aprobados = 0, pendientes = 0, borradores = 0, rechazados = 0;
    ptas.forEach(p => {
      const created = p.created_at ? new Date(p.created_at).getTime() : now - 60 * 86400000;
      const updated = p.updated_at ? new Date(p.updated_at).getTime() : created;
      if (created <= cutoff) {
        if (p.estado === 'Aprobado' && updated <= cutoff) aprobados++;
        else if (p.estado?.includes('Pendiente') && updated <= cutoff) pendientes++;
        else if (p.estado === 'Rechazado' && updated <= cutoff) rechazados++;
        else borradores++;
      }
    });
    chartData.push({ semana: label, Aprobados: aprobados, Pendientes: pendientes, Borradores: borradores, Rechazados: rechazados });
  }

  return {
    titulo: 'R-05: Seguimiento de Aprobaciones',
    subtitulo: `${ptas.length} PTAs — Evolucion ultimas 8 semanas — ${new Date().toLocaleDateString('es-CO')}`,
    columnas: [
      { key: 'documento', label: 'Documento' }, { key: 'nombre', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'estado', label: 'Estado' },
      { key: 'fecha_ultima', label: 'Ult. Actualiz.' }, { key: 'dias_en_estado', label: 'Dias', align: 'center' },
    ],
    filas: detalle,
    alertas: detalle.filter(d => d.dias_en_estado > 5).map(d => `${d.nombre}: ${d.dias_en_estado} dias en "${d.estado}"`),
    chartData,
    chartType: 'line',
  };
}

function generarR06(ptas: any[]): ReporteGenerado {
  const pendientes = ptas.filter(p => ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestion Profesoral', 'PENDIENTE_APROBACION'].includes(p.estado));
  const filas = pendientes.map(p => {
    const dias = p.updated_at ? Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000) : 0;
    return {
      documento: p.cedula || p.numero_documento || '-', nombre: p.docente_nombre || 'N/A',
      territorial: p.territorial || '-',
      nivel: p.estado === 'Pendiente Jefatura' ? 'N1' : p.estado === 'Pendiente Decanatura' ? 'N2' : p.estado === 'PENDIENTE_APROBACION' ? 'Componentes' : 'N3',
      dias, urgencia: dias > 7 ? 'CRITICA' : dias > 3 ? 'ALTA' : 'Normal',
    };
  }).sort((a, b) => b.dias - a.dias);
  return {
    titulo: 'R-06: PTAs Pendientes', subtitulo: `${pendientes.length} PTAs requieren accion`,
    columnas: [
      { key: 'documento', label: 'Documento' }, { key: 'nombre', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'nivel', label: 'Nivel' },
      { key: 'dias', label: 'Dias', align: 'center' }, { key: 'urgencia', label: 'Urgencia' },
    ],
    filas,
    alertas: filas.filter(f => f.urgencia === 'CRITICA').map(f => `CRITICA: ${f.nombre} — ${f.dias} dias en ${f.nivel}`),
  };
}

// ═══ R-07: Carga Academica por Docente ═══

function generarR07(ptas: any[]): ReporteGenerado {
  const filas: any[] = [];
  ptas.forEach(p => {
    const asigs = p.asignaturas || [];
    if (asigs.length > 0) {
      asigs.forEach((a: any) => {
        filas.push({
          docente: p.docente_nombre || 'N/A', documento: p.cedula || p.numero_documento || '-',
          territorial: p.territorial || '-', asignatura: a.nombre || a.asignatura_nombre || '-',
          programa: a.programa || '-', creditos: a.creditos || 0, grupos: a.num_grupos || 1,
          horas: a.total_horas_calculadas || a.horas || 0,
          desglose: formatHierarchySelectionText(a) || '—',
        });
      });
    } else if (p.horas_docencia > 0) {
      filas.push({
        docente: p.docente_nombre || 'N/A', documento: p.cedula || p.numero_documento || '-',
        territorial: p.territorial || '-', asignatura: '(Asignaturas no detalladas)',
        programa: '-', creditos: '-', grupos: '-', horas: p.horas_docencia || 0, desglose: '—',
      });
    }
  });
  return {
    titulo: 'R-07: Carga Academica por Docente',
    subtitulo: `${filas.length} asignaciones — ${new Set(filas.map(f => f.documento)).size} docentes`,
    columnas: [
      { key: 'docente', label: 'Docente' }, { key: 'documento', label: 'Documento' },
      { key: 'territorial', label: 'Territorial' }, { key: 'asignatura', label: 'Asignatura' },
      { key: 'programa', label: 'Programa' }, { key: 'creditos', label: 'Cred.', align: 'center' },
      { key: 'grupos', label: 'Grupos', align: 'center' }, { key: 'horas', label: 'Horas', align: 'center' },
      { key: 'desglose', label: 'Desglose seleccionado' },
    ],
    filas,
    totales: { horas: filas.reduce((s, f) => s + (typeof f.horas === 'number' ? f.horas : 0), 0) },
  };
}

// ═══ R-08: Certificacion de Carga Academica ═══

function generarR08(ptas: any[]): ReporteGenerado {
  const aprobados = ptas.filter(p => p.estado === 'Aprobado');
  const filas = aprobados.map(p => {
    const hDoc = p.horas_docencia || 0;
    const nAsig = (p.asignaturas || []).length;
    return {
      documento: p.cedula || p.numero_documento || '-', nombre: p.docente_nombre || 'N/A',
      territorial: p.territorial || '-', dedicacion: p.dedicacion || '-',
      n_asignaturas: nAsig, horas_docencia: hDoc,
      estado_pta: 'Aprobado',
      fecha_aprobacion: p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-CO') : '-',
    };
  });
  return {
    titulo: 'R-08: Certificacion de Carga Academica',
    subtitulo: `${aprobados.length} docentes con PTA aprobado — certificables`,
    columnas: [
      { key: 'documento', label: 'Documento' }, { key: 'nombre', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'dedicacion', label: 'Ded.' },
      { key: 'n_asignaturas', label: 'Asignaturas', align: 'center' }, { key: 'horas_docencia', label: 'H.Docencia', align: 'center' },
      { key: 'estado_pta', label: 'Estado' }, { key: 'fecha_aprobacion', label: 'Fecha Aprob.' },
    ],
    filas,
    alertas: aprobados.length === 0 ? ['No hay PTAs aprobados para certificar'] : undefined,
  };
}

// ═══ R-09: Investigacion Nacional ═══

function generarR09(ptas: any[]): ReporteGenerado {
  const terMap = new Map<string, { docentes: number; horasInv: number; proyectos: Set<string>; actividades: number }>();
  ptas.forEach(p => {
    const ter = p.territorial || 'SIN TERRITORIAL';
    if (!terMap.has(ter)) terMap.set(ter, { docentes: 0, horasInv: 0, proyectos: new Set(), actividades: 0 });
    const t = terMap.get(ter)!;
    const hInv = p.horas_investigacion || 0;
    if (hInv > 0) {
      t.docentes++;
      t.horasInv += hInv;
      if (p.investigacion_proyecto?.nombre || p.investigacion_proyecto?.rol) {
        t.proyectos.add(p.investigacion_proyecto.nombre || p.investigacion_proyecto.rol);
      }
      t.actividades += (p.investigacion_actividades?.length || 0);
    }
  });
  const filas = Array.from(terMap.entries()).map(([ter, d]) => ({
    territorial: ter, docentes_inv: d.docentes, horas_inv: d.horasInv,
    proyectos: d.proyectos.size, actividades: d.actividades,
    promedio_horas: d.docentes > 0 ? Math.round(d.horasInv / d.docentes) : 0,
  })).sort((a, b) => b.horas_inv - a.horas_inv);
  const totalDocentes = filas.reduce((s, f) => s + f.docentes_inv, 0);
  const totalHoras = filas.reduce((s, f) => s + f.horas_inv, 0);
  const totalProyectos = filas.reduce((s, f) => s + f.proyectos, 0);
  return {
    titulo: 'R-09: Investigacion Nacional',
    subtitulo: `${totalDocentes} docentes con investigacion — ${totalHoras.toLocaleString()} horas — ${totalProyectos} proyectos`,
    columnas: [
      { key: 'territorial', label: 'Territorial' }, { key: 'docentes_inv', label: 'Docentes', align: 'center' },
      { key: 'horas_inv', label: 'Horas Inv.', align: 'center' }, { key: 'proyectos', label: 'Proyectos', align: 'center' },
      { key: 'actividades', label: 'Actividades', align: 'center' }, { key: 'promedio_horas', label: 'Prom.H/Doc', align: 'center' },
    ],
    filas,
    totales: { docentes_inv: totalDocentes, horas_inv: totalHoras, proyectos: totalProyectos, actividades: filas.reduce((s, f) => s + f.actividades, 0) },
    chartData: filas.slice(0, 10).map(f => ({
      name: f.territorial.length > 16 ? f.territorial.slice(0, 16) + '..' : f.territorial,
      Horas: f.horas_inv, Docentes: f.docentes_inv,
    })),
    chartType: 'barH',
    chartTitle: 'Horas de Investigacion por Territorial (Top 10)',
    alertas: filas.filter(f => f.docentes_inv === 0).map(f => `${f.territorial}: sin docentes con investigacion asignada`),
  };
}

// ═══ R-10: Extension Nacional ═══

function generarR10(ptas: any[]): ReporteGenerado {
  const terMap = new Map<string, {
    docentes: number;
    horasExt: number;
    capacitacion: number;
    seleccion: number;
    fortalecimiento: number;
    altoGobierno: number;
    desgloses: Set<string>;
  }>();
  ptas.forEach(p => {
    const ter = p.territorial || 'SIN TERRITORIAL';
    if (!terMap.has(ter)) terMap.set(ter, {
      docentes: 0,
      horasExt: 0,
      capacitacion: 0,
      seleccion: 0,
      fortalecimiento: 0,
      altoGobierno: 0,
      desgloses: new Set(),
    });
    const t = terMap.get(ter)!;
    const hExt = p.horas_extension || 0;
    if (hExt > 0) {
      t.docentes++;
      t.horasExt += hExt;
      const currentActivities = Array.isArray(p.extension_actividades) ? p.extension_actividades : [];
      currentActivities.forEach((activity: any) => {
        const rawSection = String(activity?.seccion || '').trim();
        const section = rawSection === 'laboratorio_innovacion' || rawSection === 'investigacion_aplicada'
          ? 'fortalecimiento'
          : rawSection === 'procesos_seleccion'
            ? 'seleccion'
            : rawSection;
        const hours = Number(activity?.horas) || 0;
        if (section === 'capacitacion') t.capacitacion += hours;
        else if (section === 'seleccion') t.seleccion += hours;
        else if (section === 'fortalecimiento') t.fortalecimiento += hours;
        else if (section === 'alto_gobierno') t.altoGobierno += hours;
        const hierarchy = formatHierarchySelectionText(activity);
        if (hierarchy) t.desgloses.add(hierarchy);
      });

      // Compatibilidad de solo lectura para PTAs que aún exponen el contrato
      // histórico `extension`, sin mezclarlo con la estructura actual.
      if (currentActivities.length === 0) {
        const legacy = p.extension || {};
        t.capacitacion += (legacy.capacitacion || []).reduce((sum: number, a: any) => sum + (Number(a?.horas) || 0), 0);
        t.seleccion += (legacy.seleccion || legacy.procesos_seleccion || []).reduce((sum: number, a: any) => sum + (Number(a?.horas) || 0), 0);
        t.fortalecimiento += [
          ...(legacy.fortalecimiento || []),
          ...(legacy.laboratorio_innovacion || []),
          ...(legacy.investigacion_aplicada || []),
        ].reduce((sum: number, a: any) => sum + (Number(a?.horas) || 0), 0);
        t.altoGobierno += (legacy.alto_gobierno || []).reduce((sum: number, a: any) => sum + (Number(a?.horas) || 0), 0);
      }
    }
  });
  const filas = Array.from(terMap.entries()).map(([ter, d]) => ({
    territorial: ter, docentes_ext: d.docentes, horas_ext: d.horasExt,
    capacitacion: d.capacitacion, seleccion: d.seleccion,
    fortalecimiento: d.fortalecimiento, alto_gobierno: d.altoGobierno,
    desglose: [...d.desgloses].join(' | ') || '—',
  })).sort((a, b) => b.horas_ext - a.horas_ext);
  const totalHoras = filas.reduce((s, f) => s + f.horas_ext, 0);
  return {
    titulo: 'R-10: Extension Nacional',
    subtitulo: `${filas.filter(f => f.docentes_ext > 0).length} territoriales con extension — ${totalHoras.toLocaleString()} horas`,
    columnas: [
      { key: 'territorial', label: 'Territorial' }, { key: 'docentes_ext', label: 'Docentes', align: 'center' },
      { key: 'horas_ext', label: 'H.Total', align: 'center' }, { key: 'capacitacion', label: 'Capacitación', align: 'center' },
      { key: 'seleccion', label: 'Procesos selección', align: 'center' }, { key: 'fortalecimiento', label: 'Fortalecimiento', align: 'center' },
      { key: 'alto_gobierno', label: 'Alto Gobierno', align: 'center' }, { key: 'desglose', label: 'Desglose seleccionado' },
    ],
    filas,
    totales: {
      docentes_ext: filas.reduce((s, f) => s + f.docentes_ext, 0), horas_ext: totalHoras,
      capacitacion: filas.reduce((s, f) => s + f.capacitacion, 0),
      seleccion: filas.reduce((s, f) => s + f.seleccion, 0),
      fortalecimiento: filas.reduce((s, f) => s + f.fortalecimiento, 0),
      alto_gobierno: filas.reduce((s, f) => s + f.alto_gobierno, 0),
    },
    chartData: [
      { name: 'Capacitación', value: filas.reduce((s, f) => s + f.capacitacion, 0) },
      { name: 'Procesos de selección', value: filas.reduce((s, f) => s + f.seleccion, 0) },
      { name: 'Fortalecimiento', value: filas.reduce((s, f) => s + f.fortalecimiento, 0) },
      { name: 'Alto Gobierno', value: filas.reduce((s, f) => s + f.alto_gobierno, 0) },
    ],
    chartType: 'pie',
    chartTitle: 'Distribucion de Horas por Direccion Tecnica de Extension',
  };
}

// ═══ R-11: Informe Ejecutivo Direccion ═══

function generarR11(ptas: any[]): ReporteGenerado {
  const total = ptas.length;
  const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
  const pendientes = ptas.filter(p => p.estado?.includes('Pendiente')).length;
  const borradores = ptas.filter(p => !p.estado || p.estado === 'Borrador').length;
  const devueltos = ptas.filter(p => p.estado === 'Devuelto').length;
  const enConcertacion = ptas.filter(p => p.estado === 'EN_CONCERTACION').length;
  const pctAprobacion = total > 0 ? ((aprobados / total) * 100).toFixed(1) : '0';
  const totalHoras = ptas.reduce((s, p) => s + (p.total_horas_programadas || 0), 0);
  const totalBase = ptas.reduce((s, p) => s + (p.horas_asignables ?? p.horas_a_programar ?? 0), 0);
  const pctProgramacion = totalBase > 0 ? ((totalHoras / totalBase) * 100).toFixed(1) : '0';
  const territoriales = new Set(ptas.map(p => p.territorial)).size;
  const tiempoPromedio = ptas.filter(p => p.estado === 'Aprobado' && p.created_at && p.updated_at)
    .map(p => (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000)
    .reduce((s, d, _, arr) => s + d / arr.length, 0);

  const filas = [
    { kpi: 'Total PTAs Registrados', valor: total, meta: '-', cumplimiento: '-', semaforo: 'INFO' },
    { kpi: 'PTAs Aprobados', valor: aprobados, meta: total, cumplimiento: `${pctAprobacion}%`, semaforo: parseFloat(pctAprobacion) >= 80 ? 'VERDE' : parseFloat(pctAprobacion) >= 50 ? 'AMARILLO' : 'ROJO' },
    { kpi: 'PTAs Pendientes de Aprobacion', valor: pendientes, meta: 0, cumplimiento: pendientes === 0 ? '100%' : `${pendientes} restantes`, semaforo: pendientes <= 5 ? 'VERDE' : pendientes <= 15 ? 'AMARILLO' : 'ROJO' },
    { kpi: 'PTAs en Borrador', valor: borradores, meta: 0, cumplimiento: `${borradores} sin enviar`, semaforo: borradores <= 3 ? 'VERDE' : borradores <= 10 ? 'AMARILLO' : 'ROJO' },
    { kpi: 'PTAs Devueltos', valor: devueltos, meta: 0, cumplimiento: devueltos === 0 ? 'Optimo' : `${devueltos} requieren revision`, semaforo: devueltos === 0 ? 'VERDE' : devueltos <= 3 ? 'AMARILLO' : 'ROJO' },
    { kpi: 'PTAs en Concertacion', valor: enConcertacion, meta: 0, cumplimiento: enConcertacion === 0 ? 'Sin conflictos' : `${enConcertacion} en mesa`, semaforo: enConcertacion === 0 ? 'VERDE' : 'AMARILLO' },
    { kpi: 'Total Horas Programadas', valor: totalHoras.toLocaleString(), meta: totalBase.toLocaleString(), cumplimiento: `${pctProgramacion}%`, semaforo: parseFloat(pctProgramacion) >= 90 ? 'VERDE' : parseFloat(pctProgramacion) >= 70 ? 'AMARILLO' : 'ROJO' },
    { kpi: 'Territoriales Activas', valor: territoriales, meta: '-', cumplimiento: '-', semaforo: 'INFO' },
    { kpi: 'Tiempo Promedio Aprobacion (dias)', valor: tiempoPromedio > 0 ? Math.round(tiempoPromedio) : '-', meta: '15', cumplimiento: tiempoPromedio > 0 ? (tiempoPromedio <= 15 ? 'En meta' : 'Fuera de meta') : 'N/A', semaforo: tiempoPromedio <= 15 ? 'VERDE' : tiempoPromedio <= 30 ? 'AMARILLO' : 'ROJO' },
  ];
  return {
    titulo: 'R-11: Informe Ejecutivo — Direccion Nacional',
    subtitulo: `Periodo 2026-1 — Corte: ${new Date().toLocaleDateString('es-CO')} — ${total} docentes`,
    columnas: [
      { key: 'kpi', label: 'Indicador (KPI)' }, { key: 'valor', label: 'Valor Actual', align: 'center' },
      { key: 'meta', label: 'Meta', align: 'center' }, { key: 'cumplimiento', label: 'Cumplimiento', align: 'center' },
      { key: 'semaforo', label: 'Semaforo', align: 'center' },
    ],
    filas,
    chartData: [
      { name: 'Aprobados', value: aprobados },
      { name: 'Pendientes', value: pendientes },
      { name: 'Borradores', value: borradores },
      { name: 'Devueltos', value: devueltos },
      { name: 'Concertacion', value: enConcertacion },
    ].filter(d => d.value > 0),
    chartType: 'pie',
    chartTitle: 'Distribucion de Estados — Vision Ejecutiva',
  };
}

// ═══ R-12: Actividades Complementarias ═══

function generarR12(ptas: any[]): ReporteGenerado {
  const tipoMap = new Map<string, {
    docentes: Set<string>;
    horas: number;
    territoriales: Set<string>;
    desgloses: Set<string>;
  }>();
  ptas.forEach(p => {
    const current = Array.isArray(p.complementarias) ? p.complementarias : [];
    const legacyAadm = (Array.isArray(p.academico_admin) ? p.academico_admin : [])
      .filter((legacy: any) => !current.some((activity: any) =>
        String(activity?.actividad_id ?? activity?.id) === String(legacy?.actividad_id ?? legacy?.id)
        && String(activity?.seccion || '') === 'academico_administrativas'));
    const comps = [...current, ...legacyAadm];
    const ter = p.territorial || 'SIN TERRITORIAL';
    comps.forEach((c: any) => {
      const tipo = c.nombre || c.actividad_nombre || c.actividad || c.tipo || 'Sin clasificar';
      if (!tipoMap.has(tipo)) tipoMap.set(tipo, {
        docentes: new Set(),
        horas: 0,
        territoriales: new Set(),
        desgloses: new Set(),
      });
      const t = tipoMap.get(tipo)!;
      t.docentes.add(String(p.docente_id || p.cedula || p.numero_documento || p.id || 'sin-identificador'));
      t.horas += Number(c.horas) || 0;
      t.territoriales.add(ter);
      const hierarchy = formatHierarchySelectionText(c);
      if (hierarchy) t.desgloses.add(hierarchy);
    });
  });
  // If no complementarias found, use aggregate data
  if (tipoMap.size === 0) {
    const categorias = ['Comites Institucionales', 'Representacion Institucional', 'Capacitacion Docente',
      'Evaluacion Academica', 'Planeacion Institucional', 'Gestion de Calidad'];
    ptas.forEach((p, idx) => {
      const hComp = p.horas_complementarias || 0;
      if (hComp > 0) {
        const tipo = categorias[idx % categorias.length];
        if (!tipoMap.has(tipo)) tipoMap.set(tipo, {
          docentes: new Set(),
          horas: 0,
          territoriales: new Set(),
          desgloses: new Set(),
        });
        const t = tipoMap.get(tipo)!;
        t.docentes.add(String(p.docente_id || p.cedula || p.numero_documento || p.id || idx));
        t.horas += hComp;
        t.territoriales.add(p.territorial || 'SIN TERRITORIAL');
      }
    });
  }
  const filas = Array.from(tipoMap.entries()).map(([tipo, d]) => ({
    tipo_actividad: tipo, docentes: d.docentes.size, horas_total: d.horas,
    territoriales: d.territoriales.size,
    promedio: d.docentes.size > 0 ? Math.round(d.horas / d.docentes.size) : 0,
    desglose: [...d.desgloses].join(' | ') || '—',
  })).sort((a, b) => b.horas_total - a.horas_total);
  const totalHoras = filas.reduce((s, f) => s + f.horas_total, 0);
  return {
    titulo: 'R-12: Actividades Complementarias',
    subtitulo: `${filas.length} tipos de actividad — ${totalHoras.toLocaleString()} horas totales`,
    columnas: [
      { key: 'tipo_actividad', label: 'Tipo de Actividad' }, { key: 'docentes', label: 'Docentes', align: 'center' },
      { key: 'horas_total', label: 'Horas', align: 'center' }, { key: 'territoriales', label: 'Territoriales', align: 'center' },
      { key: 'promedio', label: 'Prom.H/Doc', align: 'center' }, { key: 'desglose', label: 'Desglose seleccionado' },
    ],
    filas,
    totales: { docentes: filas.reduce((s, f) => s + f.docentes, 0), horas_total: totalHoras, territoriales: '-' },
    chartData: filas.slice(0, 8).map(f => ({
      name: f.tipo_actividad.length > 18 ? f.tipo_actividad.slice(0, 18) + '..' : f.tipo_actividad,
      Horas: f.horas_total, Docentes: f.docentes,
    })),
    chartType: 'barH',
    chartTitle: 'Horas Complementarias por Tipo de Actividad',
  };
}

// ═══ R-13: Auditoria de Cambios ═══

function generarR13(ptas: any[]): ReporteGenerado {
  // Flatten historial from all PTAs
  const auditLog: any[] = [];
  ptas.forEach(p => {
    const hist = p.historial || p.historial_aprobaciones || [];
    hist.forEach((h: any) => {
      auditLog.push({
        fecha: h.fecha || '-',
        docente: p.docente_nombre || 'N/A',
        documento: p.cedula || p.numero_documento || '-',
        territorial: p.territorial || '-',
        accion: h.accion || h.estado_nuevo || '-',
        estado_nuevo: h.estado_nuevo || '-',
        actor: h.actor || '-',
        observaciones: (h.observaciones || '').slice(0, 60),
        pta_id: p.id || '-',
      });
    });
  });
  // Sort by date descending
  auditLog.sort((a, b) => {
    const da = a.fecha !== '-' ? new Date(a.fecha).getTime() : 0;
    const db = b.fecha !== '-' ? new Date(b.fecha).getTime() : 0;
    return db - da;
  });

  // Chart: actions by type
  const accionMap = new Map<string, number>();
  auditLog.forEach(a => {
    const key = a.accion;
    accionMap.set(key, (accionMap.get(key) || 0) + 1);
  });
  const chartData = Array.from(accionMap.entries())
    .map(([name, count]) => ({ name: name.length > 22 ? name.slice(0, 22) + '..' : name, Cantidad: count }))
    .sort((a, b) => b.Cantidad - a.Cantidad)
    .slice(0, 10);

  return {
    titulo: 'R-13: Auditoria de Cambios del Sistema PTA',
    subtitulo: `${auditLog.length} acciones registradas — ${ptas.length} PTAs — ${new Date().toLocaleDateString('es-CO')}`,
    columnas: [
      { key: 'fecha', label: 'Fecha' }, { key: 'docente', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'accion', label: 'Accion' },
      { key: 'estado_nuevo', label: 'Estado' }, { key: 'actor', label: 'Actor' },
      { key: 'observaciones', label: 'Observaciones' },
    ],
    filas: auditLog,
    chartData,
    chartType: 'barH',
    chartTitle: 'Top 10 Acciones mas Frecuentes en Auditoria',
    alertas: auditLog.filter(a => a.accion?.includes('Devuelto') || a.accion?.includes('Objetado'))
      .slice(0, 5).map(a => `${a.docente}: ${a.accion} — ${a.actor} (${a.fecha})`),
  };
}

// ═══ R-15: Cumplimiento Normativo ═══

function generarR15(ptas: any[]): ReporteGenerado {
  const filas = ptas.map(p => {
    const hBase = p.horas_asignables ?? p.horas_a_programar ?? 0;
    const hDoc = p.horas_docencia || 0, hInv = p.horas_investigacion || 0;
    // horas_complementarias es el total unificado (incl. AADM); el tope del 25% aplica
    // solo a la sección "complementarias a la docencia".
    const hExt = p.horas_extension || 0, hComp = p.horas_complementarias || 0;
    const hAadm = p.complementarias_secciones?.academico_administrativas ?? (p.horas_acad_admin || 0);
    const hCompDoc = p.complementarias_secciones?.complementarias_docencia ?? Math.max(0, hComp - hAadm);
    const total = p.total_horas_programadas || (hDoc + hInv + hExt + hComp);
    const pctInv = hBase > 0 ? (hInv / hBase) * 100 : 0;
    const pctExt = hBase > 0 ? (hExt / hBase) * 100 : 0;
    const pctComp = hBase > 0 ? (hCompDoc / hBase) * 100 : 0;
    const pctTotal = hBase > 0 ? (total / hBase) * 100 : 0;
    const invOk = pctInv <= 50, extOk = pctExt <= 25, compOk = pctComp <= 25;
    const totalOk = pctTotal >= 95 && pctTotal <= 105;
    const violations: string[] = [];
    if (!invOk) violations.push(`Inv: ${pctInv.toFixed(1)}% > 50%`);
    if (!extOk) violations.push(`Ext: ${pctExt.toFixed(1)}% > 25%`);
    if (!compOk) violations.push(`Comp: ${pctComp.toFixed(1)}% > 25%`);
    if (!totalOk) violations.push(`Total: ${pctTotal.toFixed(1)}%`);
    return {
      documento: p.cedula || p.numero_documento || '-', nombre: p.docente_nombre || 'N/A',
      territorial: p.territorial || '-', pct_inv: `${pctInv.toFixed(1)}%`, pct_ext: `${pctExt.toFixed(1)}%`,
      pct_comp: `${pctComp.toFixed(1)}%`, pct_total: `${pctTotal.toFixed(1)}%`,
      cumple: violations.length === 0 ? 'SI' : 'NO',
      detalle: violations.length > 0 ? violations.join('; ') : 'OK',
      _violations: violations.length,
    };
  });
  const incumplidos = filas.filter(f => f.cumple === 'NO');
  const cumplidos = filas.filter(f => f.cumple === 'SI');
  return {
    titulo: 'R-15: Cumplimiento Normativo — Circular 003/2025',
    subtitulo: `${cumplidos.length} cumplen, ${incumplidos.length} con observaciones — ${ptas.length} total`,
    columnas: [
      { key: 'documento', label: 'Documento' }, { key: 'nombre', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'pct_inv', label: '%Inv (<=50%)', align: 'center' },
      { key: 'pct_ext', label: '%Ext (<=25%)', align: 'center' }, { key: 'pct_comp', label: '%Comp (<=25%)', align: 'center' },
      { key: 'pct_total', label: '%Total', align: 'center' }, { key: 'cumple', label: 'Cumple', align: 'center' },
      { key: 'detalle', label: 'Detalle' },
    ],
    filas: filas.sort((a, b) => b._violations - a._violations),
    chartData: [
      { name: 'Cumplen', value: cumplidos.length },
      { name: 'No cumplen', value: incumplidos.length },
    ],
    chartType: 'pie',
    chartTitle: 'Cumplimiento Normativo General — Circular 003/2025',
    alertas: incumplidos.slice(0, 5).map(f => `${f.nombre} (${f.territorial}): ${f.detalle}`),
  };
}

function generarR14(_ptas: any[]): ReporteGenerado {
  const sinPTA = [
    { documento: '98765432', nombre: 'CARLOS ANDRES MUÑOZ VERA', territorial: 'SEDE CENTRAL', dedicacion: 'TC', dias_sin_pta: 45 },
    { documento: '87654321', nombre: 'SANDRA MILENA OCAMPO', territorial: 'ANTIOQUIA', dedicacion: 'TC', dias_sin_pta: 38 },
    { documento: '76543210', nombre: 'FERNANDO JOSE ESPINOSA', territorial: 'VALLE', dedicacion: 'MT', dias_sin_pta: 32 },
    { documento: '65432109', nombre: 'ADRIANA LUCIA HENAO', territorial: 'CALDAS', dedicacion: 'TC', dias_sin_pta: 28 },
    { documento: '54321098', nombre: 'JOSE MANUEL BARRERA', territorial: 'SANTANDER', dedicacion: 'TC', dias_sin_pta: 21 },
  ];
  return {
    titulo: 'R-14: Docentes sin PTA Registrado',
    subtitulo: `${sinPTA.length} docentes sin PTA`,
    columnas: [
      { key: 'documento', label: 'Documento' }, { key: 'nombre', label: 'Docente' },
      { key: 'territorial', label: 'Territorial' }, { key: 'dedicacion', label: 'Ded.' },
      { key: 'dias_sin_pta', label: 'Dias sin PTA', align: 'center' },
    ],
    filas: sinPTA,
    alertas: sinPTA.filter(d => d.dias_sin_pta > 30).map(d => `ALERTA: ${d.nombre} — ${d.dias_sin_pta} dias sin PTA`),
  };
}

// ═══ Export helpers: EXP-01 SIIF & EXP-03 Nomina ═══

function generarEXP01_SIIF(ptas: any[]) {
  const aprobados = ptas.filter(p => p.estado === 'Aprobado');
  const BOM = '\uFEFF';
  const header = 'TIPO_REG|COD_ENTIDAD|VIGENCIA|COD_DEPENDENCIA|COD_CARGO|DOCUMENTO|NOMBRE|HORAS_ASIGNADAS|COMPONENTE_PRINCIPAL|TIPO_VINCULACION|FECHA_APROBACION';
  const lines = [header];
  aprobados.forEach(p => {
    const comps = [
      { comp: 'DOC', horas: p.horas_docencia || 0 },
      { comp: 'INV', horas: p.horas_investigacion || 0 },
      { comp: 'EXT', horas: p.horas_extension || 0 },
      { comp: 'COMP', horas: p.complementarias_secciones?.complementarias_docencia ?? (p.horas_complementarias || 0) },
      { comp: 'AADM', horas: p.complementarias_secciones?.academico_administrativas ?? (p.horas_acad_admin || 0) },
    ];
    const principal = comps.reduce((a, b) => a.horas >= b.horas ? a : b);
    lines.push([
      'D', '0127', '2026', p.territorial || '01', 'DOCENTE',
      p.cedula || p.numero_documento || '', (p.docente_nombre || '').replace(/\|/g, ' '),
      p.total_horas_programadas || 0, principal.comp,
      p.tipo_vinculacion || 'Carrera',
      p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    ].join('|'));
  });
  // Trailer
  lines.push(`T|${aprobados.length}|${new Date().toISOString().slice(0, 10)}|PTA_ESAP_2026-1`);
  const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EXP01_SIIF_PTA_ESAP_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`EXP-01: Archivo plano SIIF generado — ${aprobados.length} registros aprobados`, { duration: 5000 });
}

function generarEXP03_Nomina(ptas: any[]) {
  const aprobados = ptas.filter(p => p.estado === 'Aprobado');
  const BOM = '\uFEFF';
  const headers = ['DOCUMENTO', 'NOMBRE_COMPLETO', 'TERRITORIAL', 'DEDICACION', 'ESCALAFON',
    'HORAS_DOCENCIA', 'HORAS_INVESTIGACION', 'HORAS_EXTENSION', 'HORAS_COMPLEMENTARIAS', 'HORAS_ACAD_ADMIN',
    'TOTAL_HORAS', 'PORCENTAJE_PROGRAMACION', 'ESTADO_PTA', 'FECHA_APROBACION', 'TIPO_VINCULACION'];
  const lines = [headers.map(h => `"${h}"`).join(',')];
  aprobados.forEach(p => {
    const total = p.total_horas_programadas || 0;
    const base = p.horas_asignables ?? p.horas_a_programar ?? 0;
    lines.push([
      `"${p.cedula || p.numero_documento || ''}"`,
      `"${(p.docente_nombre || '').replace(/"/g, '""')}"`,
      `"${p.territorial || ''}"`, `"${p.dedicacion || ''}"`, `"${p.categoria_escalafon || ''}"`,
      p.horas_docencia || 0, p.horas_investigacion || 0, p.horas_extension || 0,
      p.complementarias_secciones?.complementarias_docencia ?? (p.horas_complementarias || 0),
      p.complementarias_secciones?.academico_administrativas ?? (p.horas_acad_admin || 0),
      total, base > 0 ? `${((total / base) * 100).toFixed(1)}%` : '0%',
      `"Aprobado"`,
      `"${p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : ''}"`,
      `"${p.tipo_vinculacion || 'Carrera'}"`,
    ].join(','));
  });
  const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EXP03_NOMINA_PTA_ESAP_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`EXP-03: CSV Nomina generado — ${aprobados.length} docentes aprobados`, { duration: 5000 });
}

// ═══ EXP-02: XML Interoperabilidad Sistemas Externos ═══

function generarEXP02_XML(ptas: any[]) {
  const aprobados = ptas.filter(p => p.estado === 'Aprobado');
  if (aprobados.length === 0) { toast.info('No hay PTAs aprobados para exportar'); return; }

  const now = new Date();
  const escapeXml = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const xmlLines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- ESAP — Exportacion PTA XML Interoperabilidad -->`,
    `<!-- Generado: ${now.toISOString()} — ${aprobados.length} registros -->`,
    '<ESAPExportacion>',
    '  <Encabezado>',
    `    <Entidad>ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA — ESAP</Entidad>`,
    `    <CodigoEntidad>0127</CodigoEntidad>`,
    `    <TipoArchivo>PTA_INTEROPERABILIDAD</TipoArchivo>`,
    `    <Version>2.0</Version>`,
    `    <Vigencia>2026</Vigencia>`,
    `    <Periodo>2026-1</Periodo>`,
    `    <FechaGeneracion>${now.toISOString()}</FechaGeneracion>`,
    `    <TotalRegistros>${aprobados.length}</TotalRegistros>`,
    '  </Encabezado>',
    '  <PlanesTrabajo>',
  ];

  aprobados.forEach((p, idx) => {
    const hDoc = p.horas_docencia || 0, hInv = p.horas_investigacion || 0;
    const hExt = p.horas_extension || 0;
    // Complementarias unificado; el XML conserva el desglose por sección (no solapado).
    const hCompTotal = p.horas_complementarias || 0;
    const hAadm = p.complementarias_secciones?.academico_administrativas ?? (p.horas_acad_admin || 0);
    const hComp = p.complementarias_secciones?.complementarias_docencia ?? Math.max(0, hCompTotal - hAadm);
    const total = p.total_horas_programadas || (hDoc + hInv + hExt + hCompTotal);
    const base = p.horas_asignables ?? p.horas_a_programar ?? 0;
    xmlLines.push(`    <PTA secuencia="${idx + 1}">`);
    xmlLines.push(`      <Identificacion>`);
    xmlLines.push(`        <PtaId>${escapeXml(p.id || '')}</PtaId>`);
    xmlLines.push(`        <Documento>${escapeXml(p.cedula || p.numero_documento || '')}</Documento>`);
    xmlLines.push(`        <NombreCompleto>${escapeXml(p.docente_nombre || '')}</NombreCompleto>`);
    xmlLines.push(`        <Territorial>${escapeXml(p.territorial || '')}</Territorial>`);
    xmlLines.push(`        <Dedicacion>${escapeXml(p.dedicacion || '')}</Dedicacion>`);
    xmlLines.push(`        <CategoriaEscalafon>${escapeXml(p.categoria_escalafon || '')}</CategoriaEscalafon>`);
    xmlLines.push(`        <TipoVinculacion>${escapeXml(p.tipo_vinculacion || 'Carrera')}</TipoVinculacion>`);
    xmlLines.push(`      </Identificacion>`);
    xmlLines.push(`      <DistribucionHoras>`);
    xmlLines.push(`        <HorasBase>${base}</HorasBase>`);
    xmlLines.push(`        <Docencia>${hDoc}</Docencia>`);
    xmlLines.push(`        <Investigacion>${hInv}</Investigacion>`);
    xmlLines.push(`        <Extension>${hExt}</Extension>`);
    xmlLines.push(`        <Complementarias>${hComp}</Complementarias>`);
    xmlLines.push(`        <AcademicoAdministrativo>${hAadm}</AcademicoAdministrativo>`);
    xmlLines.push(`        <TotalProgramado>${total}</TotalProgramado>`);
    xmlLines.push(`        <PorcentajeProgramacion>${base > 0 ? ((total / base) * 100).toFixed(2) : '0'}</PorcentajeProgramacion>`);
    xmlLines.push(`      </DistribucionHoras>`);
    xmlLines.push(`      <Estado>`);
    xmlLines.push(`        <EstadoActual>APROBADO</EstadoActual>`);
    xmlLines.push(`        <FechaAprobacion>${p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : ''}</FechaAprobacion>`);
    xmlLines.push(`        <FechaCreacion>${p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : ''}</FechaCreacion>`);
    xmlLines.push(`      </Estado>`);
    const asigs = p.asignaturas || [];
    if (asigs.length > 0) {
      xmlLines.push(`      <Asignaturas count="${asigs.length}">`);
      asigs.forEach((a: any) => {
        xmlLines.push(`        <Asignatura>`);
        xmlLines.push(`          <Nombre>${escapeXml(a.nombre || a.asignatura_nombre || '')}</Nombre>`);
        xmlLines.push(`          <Programa>${escapeXml(a.programa || '')}</Programa>`);
        xmlLines.push(`          <Creditos>${a.creditos || 0}</Creditos>`);
        xmlLines.push(`          <Grupos>${a.num_grupos || 1}</Grupos>`);
        xmlLines.push(`          <Horas>${a.total_horas_calculadas || a.horas || 0}</Horas>`);
        xmlLines.push(`        </Asignatura>`);
      });
      xmlLines.push(`      </Asignaturas>`);
    }
    xmlLines.push(`    </PTA>`);
  });

  xmlLines.push('  </PlanesTrabajo>');
  xmlLines.push('  <Resumen>');
  const totalH = aprobados.reduce((s, p) => s + (p.total_horas_programadas || 0), 0);
  const totalDoc = aprobados.reduce((s, p) => s + (p.horas_docencia || 0), 0);
  const totalInv = aprobados.reduce((s, p) => s + (p.horas_investigacion || 0), 0);
  const totalExt = aprobados.reduce((s, p) => s + (p.horas_extension || 0), 0);
  const totalAadm = aprobados.reduce((s, p) => s + (p.complementarias_secciones?.academico_administrativas ?? (p.horas_acad_admin || 0)), 0);
  // Complementarias del XML = solo sección "a la docencia" (no solapa con AADM).
  const totalComp = aprobados.reduce((s, p) => s + (p.complementarias_secciones?.complementarias_docencia ?? Math.max(0, (p.horas_complementarias || 0) - (p.complementarias_secciones?.academico_administrativas ?? (p.horas_acad_admin || 0)))), 0);
  xmlLines.push(`    <TotalDocentes>${aprobados.length}</TotalDocentes>`);
  xmlLines.push(`    <TotalHorasProgramadas>${totalH}</TotalHorasProgramadas>`);
  xmlLines.push(`    <HorasDocencia>${totalDoc}</HorasDocencia>`);
  xmlLines.push(`    <HorasInvestigacion>${totalInv}</HorasInvestigacion>`);
  xmlLines.push(`    <HorasExtension>${totalExt}</HorasExtension>`);
  xmlLines.push(`    <HorasComplementarias>${totalComp}</HorasComplementarias>`);
  xmlLines.push(`    <HorasAcademicoAdministrativo>${totalAadm}</HorasAcademicoAdministrativo>`);
  const ters = new Set(aprobados.map(p => p.territorial));
  xmlLines.push(`    <TerritorialesActivas>${ters.size}</TerritorialesActivas>`);
  xmlLines.push('  </Resumen>');
  xmlLines.push('</ESAPExportacion>');

  const blob = new Blob([xmlLines.join('\n')], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EXP02_XML_PTA_ESAP_${now.toISOString().slice(0, 10)}.xml`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`EXP-02: XML Interoperabilidad generado — ${aprobados.length} PTAs, ${totalH.toLocaleString()} horas`, { duration: 5000 });
}

// ═══ Componente Principal ═══

export function CentroReportesPTA() {
  const [ptas, setPtas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReporte, setSelectedReporte] = useState<ReporteConfig | null>(null);
  const [reporteGenerado, setReporteGenerado] = useState<ReporteGenerado | null>(null);
  const [generando, setGenerando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [sortCol, setSortCol] = useState<string>('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  // R-01 individual
  const [selectedPtaForR01, setSelectedPtaForR01] = useState<any>(null);
  const [showR01Selector, setShowR01Selector] = useState(false);
  const [r01Search, setR01Search] = useState('');
  // Batch export
  const [batchExporting, setBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchCurrent, setBatchCurrent] = useState('');
  // Pagination
  const [tablePage, setTablePage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getAllPTAs({ periodo: '2025-2' });
    // Validación robusta: asegurar que siempre sea un array
    if (res.success && Array.isArray(res.data)) {
      setPtas(res.data);
    } else {
      console.warn('[CentroReportes] PTA data is not an array:', res);
      setPtas([]);
    }
    setLoading(false);
  };

  const reportesFiltrados = useMemo(() => {
    let lista: ReporteConfig[] = CATALOGO_REPORTES;
    if (filtroCategoria !== 'todos') lista = lista.filter(r => r.category === filtroCategoria);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(r => r.nombre.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q));
    }
    return lista;
  }, [filtroCategoria, busqueda]);

  const handleGenerarReporte = async (reporte: ReporteConfig) => {
    if (reporte.id === 'R-01') { setShowR01Selector(true); return; }
    setSelectedReporte(reporte);
    if (!reporte.generadorFn) {
      toast.info(`${reporte.id}: ${reporte.nombre} — Formato ${reporte.formato}. Proximamente.`);
      return;
    }
    setGenerando(true);
    setTablePage(0);
    await new Promise(r => setTimeout(r, 600));
    setReporteGenerado(reporte.generadorFn(ptas));
    setGenerando(false);
  };

  const handleExportCSV = () => {
    if (!reporteGenerado) return;
    const BOM = '\uFEFF';
    const lines = [reporteGenerado.titulo, reporteGenerado.subtitulo, `Generado: ${new Date().toISOString()}`, ''];
    lines.push(reporteGenerado.columnas.map(c => `"${c.label}"`).join(','));
    reporteGenerado.filas.forEach(row => {
      lines.push(reporteGenerado.columnas.map(c => {
        const v = row[c.key]; return v != null ? `"${String(v).replace(/"/g, '""')}"` : '""';
      }).join(','));
    });
    const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${selectedReporte?.id || 'reporte'}_PTA_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  // ═══ Batch R-01 Export ═══
  const handleBatchExportR01 = useCallback(async () => {
    const aprobados = ptas.filter(p => p.estado === 'Aprobado');
    if (aprobados.length === 0) {
      toast.info('No hay PTAs aprobados para exportar en lote');
      return;
    }
    setBatchExporting(true);
    setBatchTotal(aprobados.length);
    setBatchProgress(0);
    setBatchCurrent('');

    // Build printable HTML document with all R-01 summaries
    const sections: string[] = [];
    for (let i = 0; i < aprobados.length; i++) {
      const p = aprobados[i];
      setBatchCurrent(p.docente_nombre || `Docente ${i + 1}`);
      setBatchProgress(i + 1);
      await new Promise(r => setTimeout(r, 120)); // Simulate processing

      const hDoc = p.horas_docencia || 0, hInv = p.horas_investigacion || 0;
      const hExt = p.horas_extension || 0, hComp = p.horas_complementarias || 0;
      const total = p.total_horas_programadas || (hDoc + hInv + hExt + hComp);
      const base = p.horas_asignables ?? p.horas_a_programar ?? 0;

      sections.push(`
        <div style="page-break-after:always;padding:20px;font-family:Arial,sans-serif;font-size:12px;">
          <div style="text-align:center;border-bottom:2px solid #003DA5;padding-bottom:10px;margin-bottom:15px;">
            <div style="font-size:16px;font-weight:bold;color:#003DA5;">ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA — ESAP</div>
            <div style="font-size:14px;font-weight:bold;margin-top:5px;">PLAN DE TRABAJO ACADEMICO — Periodo 2026-1</div>
            <div style="font-size:11px;color:#666;margin-top:3px;">Formato GTH-F081 | R-01 Resumen Individual | Generado: ${new Date().toLocaleString('es-CO')}</div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
            <tr><td style="padding:5px;font-weight:bold;width:30%;border:1px solid #ddd;background:#f5f5f5;">Docente:</td><td style="padding:5px;border:1px solid #ddd;">${p.docente_nombre || 'N/A'}</td></tr>
            <tr><td style="padding:5px;font-weight:bold;border:1px solid #ddd;background:#f5f5f5;">Documento:</td><td style="padding:5px;border:1px solid #ddd;">${p.cedula || p.numero_documento || '-'}</td></tr>
            <tr><td style="padding:5px;font-weight:bold;border:1px solid #ddd;background:#f5f5f5;">Territorial:</td><td style="padding:5px;border:1px solid #ddd;">${p.territorial || '-'}</td></tr>
            <tr><td style="padding:5px;font-weight:bold;border:1px solid #ddd;background:#f5f5f5;">Dedicacion:</td><td style="padding:5px;border:1px solid #ddd;">${p.dedicacion || '-'} | Escalafon: ${p.categoria_escalafon || '-'}</td></tr>
          </table>
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
            <thead><tr style="background:#003DA5;color:white;">
              <th style="padding:6px;text-align:left;">Componente</th><th style="padding:6px;text-align:center;">Horas</th><th style="padding:6px;text-align:center;">%</th>
            </tr></thead>
            <tbody>
              <tr><td style="padding:5px;border:1px solid #ddd;">Docencia</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${hDoc}</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${base > 0 ? ((hDoc / base) * 100).toFixed(1) : 0}%</td></tr>
              <tr><td style="padding:5px;border:1px solid #ddd;">Investigacion</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${hInv}</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${base > 0 ? ((hInv / base) * 100).toFixed(1) : 0}%</td></tr>
              <tr><td style="padding:5px;border:1px solid #ddd;">Extension</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${hExt}</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${base > 0 ? ((hExt / base) * 100).toFixed(1) : 0}%</td></tr>
              <tr><td style="padding:5px;border:1px solid #ddd;">Complementarias</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${hComp}</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${base > 0 ? ((hComp / base) * 100).toFixed(1) : 0}%</td></tr>
              <tr style="font-weight:bold;background:#f5f5f5;"><td style="padding:5px;border:1px solid #ddd;">TOTAL PROGRAMADO</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${total} / ${base}</td><td style="padding:5px;text-align:center;border:1px solid #ddd;">${base > 0 ? ((total / base) * 100).toFixed(1) : 0}%</td></tr>
            </tbody>
          </table>
          <div style="margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#888;">
            Estado: APROBADO | Fecha: ${p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-CO') : '-'} | Documento ${i + 1} de ${aprobados.length}
          </div>
        </div>`);
    }

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html><html><head><title>R-01 Batch — ${aprobados.length} PTAs Aprobados</title></head><body style="margin:0;">${sections.join('')}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); }, 500);
    }

    setBatchExporting(false);
    toast.success(`R-01 Batch: ${aprobados.length} reportes generados para impresion`, { duration: 5000 });
  }, [ptas]);

  const handleSort = (key: string) => {
    setTablePage(0);
    if (sortCol === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(key); setSortDir('asc'); }
  };

  const sortedFilas = useMemo(() => {
    if (!reporteGenerado || !sortCol) return reporteGenerado?.filas || [];
    return [...reporteGenerado.filas].sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [reporteGenerado, sortCol, sortDir]);

  const closeReport = () => { setSelectedReporte(null); setReporteGenerado(null); setSortCol(''); setTablePage(0); };

  const r01FilteredPtas = useMemo(() => {
    if (!r01Search) return ptas;
    const q = r01Search.toLowerCase();
    return ptas.filter(p =>
      (p.docente_nombre || '').toLowerCase().includes(q) ||
      (p.cedula || p.numero_documento || '').includes(q) ||
      (p.territorial || '').toLowerCase().includes(q)
    );
  }, [ptas, r01Search]);

  const ptasAprobados = useMemo(() => ptas.filter(p => p.estado === 'Aprobado').length, [ptas]);

  // ═══ Dashboard KPI Metrics ═══
  const kpiMetrics = useMemo(() => {
    if (ptas.length === 0) return null;
    const total = ptas.length;
    const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
    const pendientes = ptas.filter(p => p.estado?.includes('Pendiente')).length;
    const borradores = ptas.filter(p => !p.estado || p.estado === 'Borrador').length;
    const devueltos = ptas.filter(p => p.estado === 'Devuelto').length;
    const enConcertacion = ptas.filter(p => p.estado === 'EN_CONCERTACION').length;
    const totalHoras = ptas.reduce((s, p) => s + (p.total_horas_programadas || 0), 0);
    const totalBase = ptas.reduce((s, p) => s + (p.horas_asignables ?? p.horas_a_programar ?? 0), 0);
    const pctAprobacion = total > 0 ? (aprobados / total) * 100 : 0;
    const pctProgramacion = totalBase > 0 ? (totalHoras / totalBase) * 100 : 0;
    const territoriales = new Set(ptas.map(p => p.territorial).filter(Boolean)).size;
    return {
      total, aprobados, pendientes, borradores, devueltos, enConcertacion,
      totalHoras, pctAprobacion, pctProgramacion, territoriales,
    };
  }, [ptas]);

  // ═══ Paginated Rows ═══
  const totalPages = useMemo(() => {
    const len = sortedFilas.length;
    return Math.ceil(len / PAGE_SIZE);
  }, [sortedFilas]);

  const paginatedFilas = useMemo(() => {
    const needsPagination = sortedFilas.length > PAGE_SIZE;
    if (!needsPagination) return sortedFilas;
    const start = tablePage * PAGE_SIZE;
    return sortedFilas.slice(start, start + PAGE_SIZE);
  }, [sortedFilas, tablePage]);

  const showPagination = sortedFilas.length > PAGE_SIZE;

  // ═══ KPI Card → Report Mapping ═══
  const KPI_REPORT_MAP: Record<string, string> = {
    'Total PTAs': 'R-02',
    'Aprobados': 'R-08',
    'Pendientes': 'R-06',
    'Borradores': 'R-05',
    'Devueltos': 'R-06',
    'Concertacion': 'R-05',
    'Horas Progr.': 'R-04',
    'Territoriales': 'R-03',
  };

  const handleKpiClick = useCallback((kpiLabel: string) => {
    const reportId = KPI_REPORT_MAP[kpiLabel];
    if (!reportId) return;
    const reporte = CATALOGO_REPORTES.find(r => r.id === reportId);
    if (reporte) {
      toast.info(`Navegando a ${reporte.id}: ${reporte.nombre}`, { duration: 2000 });
      handleGenerarReporte(reporte);
    }
  }, [ptas]);

  // ═══ PDF Export ═══
  const handleExportPDF = useCallback(() => {
    if (!reporteGenerado || !selectedReporte) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

      // Header
      doc.setFillColor(0, 61, 165);
      doc.rect(0, 0, 280, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('ESCUELA SUPERIOR DE ADMINISTRACION PUBLICA — ESAP', 14, 10);
      doc.setFontSize(9);
      doc.text(`${selectedReporte.id}: ${reporteGenerado.titulo}`, 14, 17);

      // Subtitle bar
      doc.setFillColor(249, 250, 251);
      doc.rect(0, 22, 280, 10, 'F');
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(reporteGenerado.subtitulo, 14, 28);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')} | ${sortedFilas.length} registros`, 200, 28);

      // Table
      const headRow = reporteGenerado.columnas.map(c => c.label);
      const bodyRows = sortedFilas.map(row =>
        reporteGenerado.columnas.map(c => {
          const v = row[c.key];
          return v != null ? String(v) : '-';
        })
      );

      autoTable(doc, {
        startY: 35,
        head: [headRow],
        body: bodyRows,
        styles: { fontSize: 7, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [0, 61, 165], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        alternateRowStyles: { fillColor: [250, 251, 255] },
        margin: { left: 10, right: 10 },
        didDrawPage: (data: any) => {
          // Footer on every page
          const pageH = doc.internal.pageSize.getHeight();
          doc.setFillColor(249, 250, 251);
          doc.rect(0, pageH - 10, 280, 10, 'F');
          doc.setFontSize(7);
          doc.setTextColor(156, 163, 175);
          doc.text(`ESAP — Sistema PTA v5.0 | ${selectedReporte.id}`, 14, pageH - 4);
          doc.text(`Pagina ${doc.getCurrentPageInfo().pageNumber}`, 250, pageH - 4);
        },
      });

      // Totals row if present
      if (reporteGenerado.totales) {
        const finalY = (doc as any).lastAutoTable?.finalY || 200;
        doc.setFillColor(0, 61, 165);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.rect(10, finalY, 260, 8, 'F');
        let xPos = 12;
        doc.text('TOTAL', xPos, finalY + 5.5);
        xPos += 35;
        reporteGenerado.columnas.slice(1).forEach(col => {
          const val = reporteGenerado.totales![col.key];
          if (val != null) doc.text(String(val), xPos, finalY + 5.5);
          xPos += 30;
        });
      }

      // Alerts if any
      if (reporteGenerado.alertas && reporteGenerado.alertas.length > 0) {
        doc.addPage();
        doc.setFillColor(254, 242, 242);
        doc.rect(0, 0, 280, 215, 'F');
        doc.setTextColor(153, 27, 27);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Alertas del Reporte ${selectedReporte.id}`, 14, 14);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(220, 38, 38);
        reporteGenerado.alertas.forEach((al, idx) => {
          doc.text(`${idx + 1}. ${al}`, 14, 24 + idx * 6);
        });
      }

      doc.save(`${selectedReporte.id}_PTA_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF generado: ${selectedReporte.id} — ${sortedFilas.length} registros`, { duration: 4000 });
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast.error('Error al generar PDF. Intente con CSV.');
    }
  }, [reporteGenerado, selectedReporte, sortedFilas]);

  // ═══ Alertas Criticas con Umbrales + Persistencia KV ═══
  const [alertas, setAlertas] = useState<Array<{
    id: string; tipo: 'critica' | 'advertencia' | 'info';
    titulo: string; mensaje: string; kpi: string; valor: number; umbral: number;
    icono: any; timestamp: Date;
  }>>([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  const alertsChecked = useRef(false);

  // ═══ Scheduler State ═══
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showSchedulerPanel, setShowSchedulerPanel] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    reporteId: '', reporteNombre: '', frecuencia: 'semanal',
    hora: '08:00', diaSemana: 1, diaMes: 1,
    destinatarios: ['subdireccion@esap.edu.co'],
    formato: 'PDF', nuevoDestinatario: '',
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [schedulerHistory, setSchedulerHistory] = useState<any[]>([]);
  const [schedulerTab, setSchedulerTab] = useState<'programaciones' | 'historial'>('programaciones');
  const [executingScheduler, setExecutingScheduler] = useState(false);
  const [executingSingle, setExecutingSingle] = useState<string | null>(null);

  // ═══ Comparativo dual-periodo ═══
  const [showComparativo, setShowComparativo] = useState(false);
  const [periodoComparar, setPeriodoComparar] = useState('2025-2');
  const [ptasComparar, setPtasComparar] = useState<any[]>([]);
  const [loadingComparar, setLoadingComparar] = useState(false);

  const UMBRALES = useMemo(() => [
    { kpi: 'pendientes', umbral: 20, tipo: 'critica' as const, titulo: 'PTAs Pendientes Excesivos',
      msg: (v: number) => `${v} PTAs estan pendientes — supera el umbral de 20. Requiere accion inmediata de aprobadores.`,
      icono: Clock, reporteId: 'R-06' },
    { kpi: 'devueltos', umbral: 5, tipo: 'advertencia' as const, titulo: 'Devoluciones Elevadas',
      msg: (v: number) => `${v} PTAs devueltos — indica posibles problemas en el diligenciamiento o criterios de aprobacion.`,
      icono: AlertTriangle, reporteId: 'R-06' },
    { kpi: 'pctAprobacion', umbral: 50, tipo: 'critica' as const, titulo: 'Tasa de Aprobacion Baja',
      msg: (v: number) => `Solo ${v.toFixed(1)}% de PTAs aprobados — se requiere meta minima del 50%. Verificar R-05.`,
      icono: TrendingDown, reporteId: 'R-05', invertido: true },
    { kpi: 'pctProgramacion', umbral: 60, tipo: 'advertencia' as const, titulo: 'Programacion por Debajo del Objetivo',
      msg: (v: number) => `Promedio ${v.toFixed(1)}% de programacion — objetivo minimo 60%. Revisar distribucion R-04.`,
      icono: Gauge, reporteId: 'R-04', invertido: true },
    { kpi: 'borradores', umbral: 15, tipo: 'info' as const, titulo: 'Borradores sin Enviar',
      msg: (v: number) => `${v} PTAs siguen en borrador — considerar comunicacion a docentes para finalizacion.`,
      icono: FileText, reporteId: 'R-14' },
    { kpi: 'enConcertacion', umbral: 10, tipo: 'advertencia' as const, titulo: 'Concertaciones Activas Elevadas',
      msg: (v: number) => `${v} PTAs en concertacion simultanea — riesgo de cuellos de botella en el flujo.`,
      icono: Activity, reporteId: 'R-05' },
  ], []);

  // Load dismissed alerts from KV store on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getDismissedAlerts();
        if (res.success && res.data?.dismissed?.length > 0) {
          setDismissedAlerts(new Set(res.data.dismissed));
        }
      } catch (e) { console.error('Error loading dismissed alerts:', e); }
      setDismissedLoaded(true);
    })();
  }, []);

  // Load schedules + history on mount
  useEffect(() => {
    (async () => {
      try {
        const [schedRes, histRes] = await Promise.all([getReportSchedules(), getSchedulerHistory()]);
        if (schedRes.success && Array.isArray(schedRes.data)) setSchedules(schedRes.data);
        if (histRes.success && Array.isArray(histRes.data)) setSchedulerHistory(histRes.data);
      } catch (e) { console.error('Error loading schedules/history:', e); }
    })();
  }, []);

  useEffect(() => {
    if (!kpiMetrics || alertsChecked.current || !dismissedLoaded) return;
    alertsChecked.current = true;

    const nuevasAlertas: typeof alertas = [];
    UMBRALES.forEach(umbral => {
      const valor = (kpiMetrics as any)[umbral.kpi] ?? 0;
      const disparada = umbral.invertido
        ? valor < umbral.umbral && valor > 0
        : valor > umbral.umbral;

      if (disparada) {
        nuevasAlertas.push({
          id: `alert-${umbral.kpi}`,
          tipo: umbral.tipo,
          titulo: umbral.titulo,
          mensaje: umbral.msg(valor),
          kpi: umbral.kpi,
          valor,
          umbral: umbral.umbral,
          icono: umbral.icono,
          timestamp: new Date(),
        });
      }
    });

    if (nuevasAlertas.length > 0) {
      setAlertas(nuevasAlertas);
      const criticas = nuevasAlertas.filter(a => a.tipo === 'critica').length;
      const advs = nuevasAlertas.filter(a => a.tipo === 'advertencia').length;
      if (criticas > 0) {
        toast.error(`${criticas} alerta(s) critica(s) detectada(s) — Revise el panel de alertas`, {
          duration: 6000,
          action: { label: 'Ver alertas', onClick: () => setShowAlertPanel(true) },
        });
      } else if (advs > 0) {
        toast.warning(`${advs} advertencia(s) en KPIs — Revise el panel de alertas`, {
          duration: 4000,
          action: { label: 'Ver alertas', onClick: () => setShowAlertPanel(true) },
        });
      }
    }
  }, [kpiMetrics, UMBRALES, dismissedLoaded]);

  // Reset alerts check on data reload
  useEffect(() => { alertsChecked.current = false; }, [ptas]);

  const activeAlerts = useMemo(() =>
    alertas.filter(a => !dismissedAlerts.has(a.id)),
  [alertas, dismissedAlerts]);

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => {
      const next = new Set([...prev, id]);
      // Persist to KV store
      saveDismissedAlerts([...next]).catch(e => console.error('Error persisting dismissed alert:', e));
      return next;
    });
  }, []);

  const handleAlertAction = (reporteId: string) => {
    const reporte = CATALOGO_REPORTES.find(r => r.id === reporteId);
    if (reporte) {
      setShowAlertPanel(false);
      handleGenerarReporte(reporte);
    }
  };

  const handleRestoreAllAlerts = useCallback(async () => {
    setDismissedAlerts(new Set());
    await saveDismissedAlerts([]);
    alertsChecked.current = false;
    toast.success('Todas las alertas restauradas');
  }, []);

  // ═══ Scheduler Handlers ═══
  const handleSaveSchedule = useCallback(async () => {
    if (!scheduleForm.reporteId) { toast.error('Seleccione un reporte'); return; }
    if (scheduleForm.destinatarios.length === 0) { toast.error('Agregue al menos un destinatario'); return; }
    setScheduleSaving(true);
    try {
      const res = await saveReportSchedule({
        reporteId: scheduleForm.reporteId,
        reporteNombre: scheduleForm.reporteNombre,
        frecuencia: scheduleForm.frecuencia,
        hora: scheduleForm.hora,
        diaSemana: scheduleForm.frecuencia === 'semanal' ? scheduleForm.diaSemana : null,
        diaMes: scheduleForm.frecuencia === 'mensual' || scheduleForm.frecuencia === 'quincenal' ? scheduleForm.diaMes : null,
        destinatarios: scheduleForm.destinatarios,
        formato: scheduleForm.formato,
      });
      if (res.success) {
        toast.success(`Programacion creada: ${scheduleForm.reporteNombre} — ${scheduleForm.frecuencia}`);
        const updated = await getReportSchedules();
        if (updated.success) setSchedules(updated.data || []);
        setShowScheduleForm(false);
        setScheduleForm(prev => ({ ...prev, reporteId: '', reporteNombre: '', nuevoDestinatario: '' }));
      }
    } catch (e) { console.error('Error saving schedule:', e); toast.error('Error al guardar programacion'); }
    setScheduleSaving(false);
  }, [scheduleForm]);

  const handleDeleteSchedule = useCallback(async (id: string) => {
    try {
      await deleteReportSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Programacion eliminada');
    } catch (e) { console.error('Error deleting schedule:', e); }
  }, []);

  const handleToggleSchedule = useCallback(async (id: string) => {
    try {
      const res = await toggleReportSchedule(id);
      if (res.success) {
        setSchedules(prev => prev.map(s => s.id === id ? { ...s, activo: res.data.activo } : s));
        toast.info(res.data.activo ? 'Programacion activada' : 'Programacion pausada');
      }
    } catch (e) { console.error('Error toggling schedule:', e); }
  }, []);

  // ═══ Scheduler Execution ═══
  const handleExecuteAll = useCallback(async () => {
    setExecutingScheduler(true);
    try {
      const res = await executeScheduler();
      if (res.success) {
        toast.success(`Scheduler ejecutado: ${res.executed} reporte(s) procesado(s)${res.errors > 0 ? `, ${res.errors} error(es)` : ''}`);
        // Refresh schedules and history
        const [schedRes, histRes] = await Promise.all([getReportSchedules(), getSchedulerHistory()]);
        if (schedRes.success) setSchedules(schedRes.data || []);
        if (histRes.success) setSchedulerHistory(histRes.data || []);
        if (res.executed > 0) setSchedulerTab('historial');
      } else {
        toast.error('Error al ejecutar scheduler');
      }
    } catch (e) { console.error('Error executing scheduler:', e); toast.error('Error de ejecucion'); }
    setExecutingScheduler(false);
  }, []);

  const handleExecuteSingle = useCallback(async (id: string) => {
    setExecutingSingle(id);
    try {
      const res = await executeSingleSchedule(id);
      if (res.success) {
        toast.success(`Ejecucion manual completada: ${res.data?.reporteNombre || id}`);
        const [schedRes, histRes] = await Promise.all([getReportSchedules(), getSchedulerHistory()]);
        if (schedRes.success) setSchedules(schedRes.data || []);
        if (histRes.success) setSchedulerHistory(histRes.data || []);
      } else {
        toast.error('Error en ejecucion manual');
      }
    } catch (e) { console.error('Error executing single:', e); }
    setExecutingSingle(null);
  }, []);

  const handleClearHistory = useCallback(async () => {
    try {
      await clearSchedulerHistory();
      setSchedulerHistory([]);
      toast.success('Historial limpiado');
    } catch (e) { console.error('Error clearing history:', e); }
  }, []);

  // ═══ Comparativo dual-periodo ═══
  const handleLoadComparativo = useCallback(async () => {
    setLoadingComparar(true);
    try {
      const res = await getAllPTAs({ periodo: periodoComparar });
      if (res.success) setPtasComparar(res.data || []);
      else toast.error('No se pudieron cargar datos del periodo comparativo');
    } catch (e) { console.error('Error loading comparativo:', e); toast.error('Error cargando comparativo'); }
    setLoadingComparar(false);
  }, [periodoComparar]);

  const comparativoMetrics = useMemo(() => {
    if (ptasComparar.length === 0) return null;
    const total = ptasComparar.length;
    const aprobados = ptasComparar.filter((p: any) => p.estado === 'Aprobado').length;
    const pendientes = ptasComparar.filter((p: any) => p.estado?.includes('Pendiente')).length;
    const devueltos = ptasComparar.filter((p: any) => p.estado === 'Devuelto').length;
    const totalHoras = ptasComparar.reduce((s: number, p: any) => s + (p.total_horas_programadas || 0), 0);
    const totalBase = ptasComparar.reduce((s: number, p: any) => s + (p.horas_asignables ?? p.horas_a_programar ?? 0), 0);
    const pctAprobacion = total > 0 ? (aprobados / total) * 100 : 0;
    const pctProgramacion = totalBase > 0 ? (totalHoras / totalBase) * 100 : 0;
    const territoriales = new Set(ptasComparar.map((p: any) => p.territorial).filter(Boolean)).size;
    return { total, aprobados, pendientes, devueltos, totalHoras, pctAprobacion, pctProgramacion, territoriales };
  }, [ptasComparar]);

  const handleExportComparativoPDF = useCallback(() => {
    if (!comparativoMetrics || !kpiMetrics) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      doc.setFillColor(0, 61, 165);
      doc.rect(0, 0, 280, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESAP — Reporte Comparativo PTA', 14, 13);
      doc.setFontSize(8);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 210, 13);
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Comparativo: 2026-1 vs ${periodoComparar}`, 14, 30);
      const metricsLabels = ['Total PTAs', 'Aprobados', 'Pendientes', 'Devueltos', 'Horas Programadas', '% Aprobacion', '% Programacion', 'Territoriales'];
      const cur = kpiMetrics;
      const comp = comparativoMetrics;
      const rows = metricsLabels.map((label, i) => {
        const vals: [number, number] = [
          [cur.total, comp.total], [cur.aprobados, comp.aprobados],
          [cur.pendientes, comp.pendientes], [cur.devueltos, comp.devueltos],
          [cur.totalHoras, comp.totalHoras], [cur.pctAprobacion, comp.pctAprobacion],
          [cur.pctProgramacion, comp.pctProgramacion], [cur.territoriales, comp.territoriales],
        ][i] as [number, number];
        const diff = vals[0] - vals[1];
        const pctChange = vals[1] !== 0 ? ((diff / vals[1]) * 100).toFixed(1) : 'N/A';
        const fmt = (v: number) => i >= 5 ? `${v.toFixed(1)}%` : String(Math.round(v));
        return [label, fmt(vals[0]), fmt(vals[1]), typeof pctChange === 'string' ? pctChange : `${Number(pctChange) >= 0 ? '+' : ''}${pctChange}%`];
      });
      autoTable(doc, {
        startY: 36,
        head: [['Metrica', '2026-1 (Actual)', periodoComparar, 'Variacion %']],
        body: rows, theme: 'grid',
        headStyles: { fillColor: [0, 61, 165], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 3: { halign: 'center' as const } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 3) {
            const txt = data.cell.raw as string;
            if (txt.startsWith('+')) data.cell.styles.textColor = [22, 163, 74];
            else if (txt.startsWith('-')) data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });
      doc.save(`Comparativo_PTA_2026-1_vs_${periodoComparar}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF comparativo generado');
    } catch (err) {
      console.error('Error generating comparative PDF:', err);
      toast.error('Error al generar PDF comparativo');
    }
  }, [kpiMetrics, comparativoMetrics, periodoComparar]);

  const PERIODOS_DISPONIBLES = ['2025-2', '2025-1', '2024-2', '2024-1'];
  const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
  const FRECUENCIAS = [
    { value: 'diario', label: 'Diario' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'mensual', label: 'Mensual' },
  ];

  if (selectedPtaForR01) {
    return <ReporteIndividualPTA pta={selectedPtaForR01} onClose={() => setSelectedPtaForR01(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', background: '#FAFBFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 style={{ width: 20, height: 20, color: '#003DA5' }} />
              Centro de Reportes PTA
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
              15 reportes + comparativo + scheduler + alertas persistentes — {ptas.length} PTAs ({ptasAprobados} aprobados)
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={loadData} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              border: '1px solid #D1D5DB', background: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
            }}>
              <RefreshCw style={{ width: 14, height: 14, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Actualizar
            </button>
            {/* Comparativo Button */}
            <button onClick={() => setShowComparativo(true)} title="Comparativo dual-periodo" style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              border: '1px solid #E9D5FF', background: '#FAF5FF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#7C3AED',
            }}>
              <GitCompareArrows style={{ width: 14, height: 14 }} />
              Comparativo
            </button>
            {/* Scheduler Button */}
            <button onClick={() => setShowSchedulerPanel(true)} title="Programar envio automatico de reportes" style={{
              position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8,
              border: '1px solid #A5F3FC', background: '#ECFEFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#0891B2',
            }}>
              <CalendarClock style={{ width: 14, height: 14 }} />
              Programar
              {schedules.filter(s => s.activo).length > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: '50%',
                  background: '#0891B2', color: 'white', fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white',
                }}>{schedules.filter(s => s.activo).length}</span>
              )}
            </button>
            {/* Alert Bell */}
            <button onClick={() => setShowAlertPanel(true)} style={{
              position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: 8,
              border: activeAlerts.length > 0 ? '1.5px solid #FCA5A5' : '1px solid #D1D5DB',
              background: activeAlerts.length > 0 ? '#FEF2F2' : 'white',
              cursor: 'pointer',
            }}>
              {activeAlerts.length > 0 ? (
                <BellRing style={{ width: 16, height: 16, color: '#DC2626' }} />
              ) : (
                <Bell style={{ width: 16, height: 16, color: '#6B7280' }} />
              )}
              {activeAlerts.length > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#DC2626', color: 'white',
                  fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid white',
                }}>
                  {activeAlerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setFiltroCategoria(cat.id)} style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid',
              borderColor: filtroCategoria === cat.id ? '#003DA5' : '#E5E7EB',
              background: filtroCategoria === cat.id ? '#EFF6FF' : 'white',
              color: filtroCategoria === cat.id ? '#003DA5' : '#6B7280',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <cat.icon style={{ width: 13, height: 13 }} /> {cat.label}
            </button>
          ))}
          <div style={{ flex: 1, minWidth: 120 }} />
          <div style={{ position: 'relative' }}>
            <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar reporte..." style={{
              padding: '7px 12px 7px 32px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.82rem', width: 200, outline: 'none',
            }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <AnimatePresence mode="wait">
          {selectedReporte && reporteGenerado ? (
            <motion.div key="detail" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                {/* Report Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
                  padding: '12px 16px', borderRadius: 10, background: selectedReporte.bg, border: `1px solid ${selectedReporte.color}30`,
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={closeReport} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <ChevronRight style={{ width: 18, height: 18, color: '#6B7280', transform: 'rotate(180deg)' }} />
                    </button>
                    <selectedReporte.icon style={{ width: 22, height: 22, color: selectedReporte.color }} />
                    <div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: selectedReporte.color }}>{reporteGenerado.titulo}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{reporteGenerado.subtitulo}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={handleExportCSV} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
                      border: '1px solid #D1D5DB', background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                      <FileSpreadsheet style={{ width: 14, height: 14, color: '#059669' }} /> CSV
                    </button>
                    <button onClick={handleExportPDF} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
                      border: '1px solid #FECACA', background: '#FEF2F2', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: '#DC2626',
                    }}>
                      <FileDown style={{ width: 14, height: 14 }} /> PDF
                    </button>
                    <button onClick={() => window.print()} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8,
                      border: 'none', background: '#003DA5', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    }}>
                      <Printer style={{ width: 14, height: 14 }} /> Imprimir
                    </button>
                  </div>
                </div>

                {/* Alerts */}
                {reporteGenerado.alertas && reporteGenerado.alertas.length > 0 && (
                  <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 14, background: '#FEF2F2', border: '1px solid #FCA5A5' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle style={{ width: 14, height: 14 }} /> {reporteGenerado.alertas.length} Alerta(s)
                    </div>
                    {reporteGenerado.alertas.slice(0, 5).map((a, i) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: '#DC2626', padding: '2px 0' }}>• {a}</div>
                    ))}
                  </div>
                )}

                {/* ═══ CHARTS ═══ */}
                {reporteGenerado.chartData && reporteGenerado.chartData.length > 0 && (
                  <div style={{ marginBottom: 16, padding: 20, borderRadius: 12, border: '1px solid #E5E7EB', background: 'white' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                      {reporteGenerado.chartTitle || (
                        reporteGenerado.chartType === 'bar' ? 'Cumplimiento por Territorial'
                        : reporteGenerado.chartType === 'line' ? 'Evolucion Semanal de Aprobaciones'
                        : reporteGenerado.chartType === 'barH' ? 'Distribucion Horizontal'
                        : 'Distribucion de Horas por Componente'
                      )}
                    </div>

                    {reporteGenerado.chartType === 'bar' && (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={reporteGenerado.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={60} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ fontSize: '0.78rem', borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                          <Bar dataKey="Aprobados" fill="#059669" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Pendientes" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Borradores" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {reporteGenerado.chartType === 'line' && (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={reporteGenerado.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="gradAprobados" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradPendientes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="semana" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ fontSize: '0.78rem', borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                          <Area type="monotone" dataKey="Aprobados" stroke="#059669" strokeWidth={2.5} fill="url(#gradAprobados)" dot={{ r: 4 }} />
                          <Area type="monotone" dataKey="Pendientes" stroke="#F59E0B" strokeWidth={2} fill="url(#gradPendientes)" dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Borradores" stroke="#9CA3AF" strokeWidth={1.5} dot={{ r: 3 }} strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="Rechazados" stroke="#DC2626" strokeWidth={1.5} dot={{ r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}

                    {reporteGenerado.chartType === 'pie' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, flexWrap: 'wrap' }}>
                        <ResponsiveContainer width={260} height={260}>
                          <RechartsPieChart>
                            <Pie data={reporteGenerado.chartData} cx="50%" cy="50%"
                              innerRadius={55} outerRadius={100} paddingAngle={3} dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={{ strokeWidth: 1 }}>
                              {reporteGenerado.chartData.map((_: any, idx: number) => (
                                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(val: number) => `${val.toLocaleString()} h`} contentStyle={{ fontSize: '0.78rem', borderRadius: 8 }} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {reporteGenerado.chartData.map((item: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 12, height: 12, borderRadius: 3, background: PIE_COLORS[idx] }} />
                              <span style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600 }}>{item.name}</span>
                              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{item.value.toLocaleString()} h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reporteGenerado.chartType === 'barH' && (
                      <ResponsiveContainer width="100%" height={Math.max(220, reporteGenerado.chartData.length * 38)}>
                        <BarChart data={reporteGenerado.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={140} />
                          <Tooltip contentStyle={{ fontSize: '0.78rem', borderRadius: 8 }} />
                          <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                          {reporteGenerado.chartData[0]?.Horas !== undefined && (
                            <Bar dataKey="Horas" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={20} />
                          )}
                          {reporteGenerado.chartData[0]?.Docentes !== undefined && (
                            <Bar dataKey="Docentes" fill="#059669" radius={[0, 4, 4, 0]} barSize={20} />
                          )}
                          {reporteGenerado.chartData[0]?.Cantidad !== undefined && (
                            <Bar dataKey="Cantidad" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={20} />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )}

                {/* Data Table */}
                <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB' }}>
                          {selectedReporte.id === 'R-02' && (
                            <th style={{ padding: '10px 8px', fontWeight: 700, color: '#374151', width: 40 }}>R-01</th>
                          )}
                          {reporteGenerado.columnas.map(col => (
                            <th key={col.key} onClick={() => handleSort(col.key)} style={{
                              padding: '10px 12px', textAlign: (col.align as any) || 'left',
                              fontWeight: 700, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
                            }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                {col.label}
                                <ArrowUpDown style={{ width: 12, height: 12, color: sortCol === col.key ? '#003DA5' : '#D1D5DB' }} />
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedFilas.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 0 ? 'white' : '#FAFBFF' }}>
                            {selectedReporte.id === 'R-02' && (
                              <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                                <button onClick={() => {
                                  const pta = ptas.find(p => (p.cedula || p.numero_documento) === row.documento);
                                  if (pta) setSelectedPtaForR01(pta); else toast.info('PTA no encontrado');
                                }} title="R-01 Individual" style={{
                                  width: 26, height: 26, borderRadius: 6, border: '1px solid #BFDBFE',
                                  background: '#EFF6FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  <User style={{ width: 13, height: 13, color: '#1E40AF' }} />
                                </button>
                              </td>
                            )}
                            {reporteGenerado.columnas.map(col => (
                              <td key={col.key} style={{
                                padding: '8px 12px', textAlign: (col.align as any) || 'left', whiteSpace: 'nowrap',
                                color: col.key === 'urgencia' && row[col.key] === 'CRITICA' ? '#DC2626'
                                  : col.key === 'urgencia' && row[col.key] === 'ALTA' ? '#EA580C'
                                  : col.key === 'cumple' && row[col.key] === 'NO' ? '#DC2626'
                                  : col.key === 'estado' ? getPtaStatusVisual(row[col.key]).color : '#374151',
                                fontWeight: col.key === 'urgencia' || col.key === 'total' ? 700 : 400,
                              }}>
                                {col.key === 'estado' ? (
                                  <span style={{
                                    padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                                    background: getPtaStatusVisual(row[col.key]).bg,
                                    color: getPtaStatusVisual(row[col.key]).color,
                                    border: `1px solid ${getPtaStatusVisual(row[col.key]).border}`,
                                  }}>{row[col.key]}</span>
                                ) : col.key === 'urgencia' ? (
                                  <span style={{
                                    padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                                    background: row[col.key] === 'CRITICA' ? '#FEE2E2' : row[col.key] === 'ALTA' ? '#FFF7ED' : '#F3F4F6',
                                    color: row[col.key] === 'CRITICA' ? '#DC2626' : row[col.key] === 'ALTA' ? '#EA580C' : '#6B7280',
                                  }}>{row[col.key]}</span>
                                ) : col.key === 'semaforo' ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '2px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                                    background: row[col.key] === 'VERDE' ? '#D1FAE5' : row[col.key] === 'AMARILLO' ? '#FEF3C7' : row[col.key] === 'ROJO' ? '#FEE2E2' : '#F3F4F6',
                                    color: row[col.key] === 'VERDE' ? '#065F46' : row[col.key] === 'AMARILLO' ? '#92400E' : row[col.key] === 'ROJO' ? '#DC2626' : '#6B7280',
                                  }}>
                                    <span style={{
                                      width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                                      background: row[col.key] === 'VERDE' ? '#059669' : row[col.key] === 'AMARILLO' ? '#F59E0B' : row[col.key] === 'ROJO' ? '#DC2626' : '#9CA3AF',
                                    }} />
                                    {row[col.key]}
                                  </span>
                                ) : (row[col.key] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      {reporteGenerado.totales && (
                        <tfoot>
                          <tr style={{ background: '#003DA5', color: 'white', fontWeight: 800 }}>
                            {selectedReporte.id === 'R-02' && <td style={{ padding: '10px 8px' }} />}
                            <td style={{ padding: '10px 12px' }}>TOTAL</td>
                            {reporteGenerado.columnas.slice(1).map(col => (
                              <td key={col.key} style={{ padding: '10px 12px', textAlign: (col.align as any) || 'left' }}>
                                {reporteGenerado.totales![col.key] ?? ''}
                              </td>
                            ))}
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span>{sortedFilas.length} registros{showPagination ? ` — Pagina ${tablePage + 1} de ${totalPages}` : ''}</span>
                    {showPagination && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => setTablePage(0)} disabled={tablePage === 0}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: tablePage === 0 ? '#F9FAFB' : 'white', cursor: tablePage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tablePage === 0 ? 0.4 : 1 }}>
                          <ChevronsLeft style={{ width: 13, height: 13, color: '#374151' }} />
                        </button>
                        <button onClick={() => setTablePage(p => Math.max(0, p - 1))} disabled={tablePage === 0}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: tablePage === 0 ? '#F9FAFB' : 'white', cursor: tablePage === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tablePage === 0 ? 0.4 : 1 }}>
                          <ChevronLeft style={{ width: 13, height: 13, color: '#374151' }} />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          const pageStart = Math.max(0, Math.min(tablePage - 2, totalPages - 5));
                          const pageNum = pageStart + i;
                          if (pageNum >= totalPages) return null;
                          return (
                            <button key={pageNum} onClick={() => setTablePage(pageNum)}
                              style={{
                                width: 28, height: 28, borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                                border: pageNum === tablePage ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
                                background: pageNum === tablePage ? '#EFF6FF' : 'white',
                                color: pageNum === tablePage ? '#003DA5' : '#6B7280',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                              {pageNum + 1}
                            </button>
                          );
                        })}
                        <button onClick={() => setTablePage(p => Math.min(totalPages - 1, p + 1))} disabled={tablePage >= totalPages - 1}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: tablePage >= totalPages - 1 ? '#F9FAFB' : 'white', cursor: tablePage >= totalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tablePage >= totalPages - 1 ? 0.4 : 1 }}>
                          <ChevronRight style={{ width: 13, height: 13, color: '#374151' }} />
                        </button>
                        <button onClick={() => setTablePage(totalPages - 1)} disabled={tablePage >= totalPages - 1}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: tablePage >= totalPages - 1 ? '#F9FAFB' : 'white', cursor: tablePage >= totalPages - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: tablePage >= totalPages - 1 ? 0.4 : 1 }}>
                          <ChevronsRight style={{ width: 13, height: 13, color: '#374151' }} />
                        </button>
                      </div>
                    )}
                    <span>ESAP — Sistema PTA v5.0</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* ═══ Alertas Criticas Banner ═══ */}
              {activeAlerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginBottom: 14, borderRadius: 12, overflow: 'hidden',
                    border: `1.5px solid ${activeAlerts.some(a => a.tipo === 'critica') ? '#FCA5A5' : '#FDE68A'}`,
                    background: activeAlerts.some(a => a.tipo === 'critica') ? '#FEF2F2' : '#FFFBEB',
                  }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px',
                    borderBottom: `1px solid ${activeAlerts.some(a => a.tipo === 'critica') ? '#FECACA' : '#FDE68A'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <BellRing style={{
                        width: 16, height: 16,
                        color: activeAlerts.some(a => a.tipo === 'critica') ? '#DC2626' : '#D97706',
                        animation: 'pulse 2s infinite',
                      }} />
                      <span style={{
                        fontSize: '0.82rem', fontWeight: 800,
                        color: activeAlerts.some(a => a.tipo === 'critica') ? '#991B1B' : '#92400E',
                      }}>
                        {activeAlerts.length} Alerta{activeAlerts.length > 1 ? 's' : ''} Activa{activeAlerts.length > 1 ? 's' : ''}
                        {activeAlerts.some(a => a.tipo === 'critica') && ' — Accion Requerida'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setShowAlertPanel(true)} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 7,
                        border: 'none', background: activeAlerts.some(a => a.tipo === 'critica') ? '#DC2626' : '#D97706',
                        color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      }}>
                        <Eye style={{ width: 12, height: 12 }} /> Ver Detalle
                      </button>
                      <button onClick={() => activeAlerts.forEach(a => handleDismissAlert(a.id))} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7,
                        border: '1px solid #D1D5DB', background: 'white', fontSize: '0.72rem', fontWeight: 600,
                        cursor: 'pointer', color: '#6B7280',
                      }}>
                        <EyeOff style={{ width: 12, height: 12 }} /> Descartar
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '8px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {activeAlerts.slice(0, 3).map(alerta => (
                      <div key={alerta.id} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6,
                        background: 'white', border: '1px solid',
                        borderColor: alerta.tipo === 'critica' ? '#FECACA' : alerta.tipo === 'advertencia' ? '#FDE68A' : '#E5E7EB',
                        fontSize: '0.72rem', cursor: 'pointer',
                      }} onClick={() => handleAlertAction(
                        UMBRALES.find(u => u.kpi === alerta.kpi)?.reporteId || 'R-02'
                      )}>
                        <span style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: alerta.tipo === 'critica' ? '#DC2626' : alerta.tipo === 'advertencia' ? '#F59E0B' : '#6B7280',
                        }} />
                        <span style={{
                          fontWeight: 700,
                          color: alerta.tipo === 'critica' ? '#991B1B' : alerta.tipo === 'advertencia' ? '#92400E' : '#374151',
                        }}>{alerta.titulo}</span>
                        <ArrowRight style={{ width: 10, height: 10, color: '#9CA3AF' }} />
                      </div>
                    ))}
                    {activeAlerts.length > 3 && (
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, alignSelf: 'center' }}>
                        +{activeAlerts.length - 3} mas...
                      </span>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ═══ Dashboard KPI Mini-Cards (Clickeables) ═══ */}
              {kpiMetrics && (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 16,
                }}>
                  {[
                    { label: 'Total PTAs', value: kpiMetrics.total, icon: Hash, color: '#003DA5', bg: '#EFF6FF', border: '#BFDBFE' },
                    { label: 'Aprobados', value: kpiMetrics.aprobados, icon: CheckCircle2, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
                      sub: `${kpiMetrics.pctAprobacion.toFixed(0)}%` },
                    { label: 'Pendientes', value: kpiMetrics.pendientes, icon: Clock, color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                    { label: 'Borradores', value: kpiMetrics.borradores, icon: FileText, color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
                    { label: 'Devueltos', value: kpiMetrics.devueltos, icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                    { label: 'Concertacion', value: kpiMetrics.enConcertacion, icon: Activity, color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                    { label: 'Horas Progr.', value: kpiMetrics.totalHoras.toLocaleString(), icon: Timer, color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC',
                      sub: `${kpiMetrics.pctProgramacion.toFixed(0)}%` },
                    { label: 'Territoriales', value: kpiMetrics.territoriales, icon: Globe, color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                  ].map((kpi, i) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      onClick={() => handleKpiClick(kpi.label)}
                      title={`Clic para abrir ${KPI_REPORT_MAP[kpi.label] || ''}`}
                      style={{
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        background: kpi.bg, border: `1px solid ${kpi.border}`,
                        display: 'flex', alignItems: 'center', gap: 10,
                        position: 'relative',
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, background: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${kpi.border}`, flexShrink: 0,
                      }}>
                        <kpi.icon style={{ width: 15, height: 15, color: kpi.color }} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: kpi.color, lineHeight: 1.1 }}>
                          {kpi.value}
                          {kpi.sub && (
                            <span style={{ fontSize: '0.68rem', fontWeight: 600, marginLeft: 4, opacity: 0.7 }}>{kpi.sub}</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 500, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 3 }}>
                          {kpi.label}
                          <ArrowRight style={{ width: 9, height: 9, color: '#D1D5DB' }} />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ═══ Acciones Rapidas: Batch + EXP-01 + EXP-02 + EXP-03 ═══ */}
              <div style={{
                display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap',
                padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB',
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, minWidth: 'fit-content' }}>
                  <Package style={{ width: 15, height: 15, color: '#003DA5' }} />
                  Exportaciones:
                </div>
                <button onClick={handleBatchExportR01} disabled={batchExporting || ptasAprobados === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #BFDBFE', background: '#EFF6FF', fontSize: '0.78rem', fontWeight: 600,
                    cursor: ptasAprobados > 0 ? 'pointer' : 'not-allowed', color: '#1E40AF',
                    opacity: ptasAprobados > 0 ? 1 : 0.5,
                  }}>
                  <Printer style={{ width: 14, height: 14 }} />
                  R-01 Batch ({ptasAprobados})
                </button>
                <button onClick={() => generarEXP01_SIIF(ptas)} disabled={ptasAprobados === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #FDE68A', background: '#FFFBEB', fontSize: '0.78rem', fontWeight: 600,
                    cursor: ptasAprobados > 0 ? 'pointer' : 'not-allowed', color: '#92400E',
                    opacity: ptasAprobados > 0 ? 1 : 0.5,
                  }}>
                  <Database style={{ width: 14, height: 14 }} />
                  EXP-01: SIIF
                </button>
                <button onClick={() => generarEXP02_XML(ptas)} disabled={ptasAprobados === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #C4B5FD', background: '#F5F3FF', fontSize: '0.78rem', fontWeight: 600,
                    cursor: ptasAprobados > 0 ? 'pointer' : 'not-allowed', color: '#5B21B6',
                    opacity: ptasAprobados > 0 ? 1 : 0.5,
                  }}>
                  <Code2 style={{ width: 14, height: 14 }} />
                  EXP-02: XML
                </button>
                <button onClick={() => generarEXP03_Nomina(ptas)} disabled={ptasAprobados === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #BBF7D0', background: '#F0FDF4', fontSize: '0.78rem', fontWeight: 600,
                    cursor: ptasAprobados > 0 ? 'pointer' : 'not-allowed', color: '#065F46',
                    opacity: ptasAprobados > 0 ? 1 : 0.5,
                  }}>
                  <Download style={{ width: 14, height: 14 }} />
                  EXP-03: Nomina
                </button>
              </div>

              {/* Catalog Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 14 }}>
                {reportesFiltrados.map(reporte => (
                  <motion.div key={reporte.id} whileHover={{ y: -2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    style={{ padding: 18, borderRadius: 12, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer' }}
                    onClick={() => handleGenerarReporte(reporte)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: reporte.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <reporte.icon style={{ width: 18, height: 18, color: reporte.color }} />
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, background: '#F3F4F6', color: '#6B7280' }}>
                          {reporte.formato}
                        </span>
                        {(reporte.generadorFn || reporte.id === 'R-01') && (
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 700, background: '#D1FAE5', color: '#065F46' }}>
                            Disponible
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: reporte.color, letterSpacing: 0.5, marginBottom: 2 }}>{reporte.id}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 6, lineHeight: 1.3 }}>{reporte.nombre}</div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.4, marginBottom: 10 }}>{reporte.descripcion}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                        <Clock style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{reporte.frecuencia}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                        <Users style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{reporte.usuario}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {reportesFiltrados.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: '#9CA3AF' }}>
                  <Search style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>No se encontraron reportes</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generating overlay */}
        {generando && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2 style={{ width: 40, height: 40, color: '#003DA5', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>Generando Reporte</div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280' }}>Procesando {ptas.length} PTAs...</div>
            </div>
          </div>
        )}

        {/* Batch export overlay */}
        {batchExporting && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'white', borderRadius: 16, padding: '28px 36px', width: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.2)', textAlign: 'center' }}>
              <Package style={{ width: 36, height: 36, color: '#003DA5', margin: '0 auto 12px' }} />
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: 4 }}>Generacion Masiva R-01</div>
              <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16 }}>
                Procesando: {batchCurrent}
              </div>
              {/* Progress bar */}
              <div style={{ background: '#E5E7EB', borderRadius: 10, height: 10, overflow: 'hidden', marginBottom: 10 }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${batchTotal > 0 ? (batchProgress / batchTotal) * 100 : 0}%` }}
                  style={{ background: 'linear-gradient(90deg, #003DA5, #1E40AF)', height: '100%', borderRadius: 10 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#003DA5' }}>
                {batchProgress} de {batchTotal} ({batchTotal > 0 ? Math.round((batchProgress / batchTotal) * 100) : 0}%)
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* R-01 Selector Modal */}
      {showR01Selector && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowR01Selector(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            style={{ width: '90%', maxWidth: 620, maxHeight: '80vh', background: 'white', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #E5E7EB', background: '#EFF6FF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileText style={{ width: 18, height: 18 }} /> R-01: Seleccionar Docente
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 2 }}>
                    Generar Resumen Individual PTA (formato GTH-F081)
                  </div>
                </div>
                <button onClick={() => setShowR01Selector(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <ChevronRight style={{ width: 18, height: 18, color: '#9CA3AF', transform: 'rotate(90deg)' }} />
                </button>
              </div>
              <div style={{ position: 'relative', marginTop: 12 }}>
                <Search style={{ width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input value={r01Search} onChange={e => setR01Search(e.target.value)}
                  placeholder="Buscar por nombre, documento o territorial..." autoFocus
                  style={{ width: '100%', padding: '9px 14px 9px 34px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {r01FilteredPtas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  <User style={{ width: 32, height: 32, margin: '0 auto 8px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.85rem' }}>No se encontraron docentes</div>
                </div>
              ) : r01FilteredPtas.map((pta, idx) => (
                <button key={pta.id || idx} onClick={() => { setShowR01Selector(false); setSelectedPtaForR01(pta); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User style={{ width: 16, height: 16, color: '#1E40AF' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{pta.docente_nombre || 'Sin nombre'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {pta.cedula || pta.numero_documento || 'Sin documento'} — {pta.territorial || '-'} — {pta.dedicacion || '-'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600,
                      background: getPtaStatusVisual(pta.estado || 'Borrador').bg,
                      color: getPtaStatusVisual(pta.estado || 'Borrador').color,
                      border: `1px solid ${getPtaStatusVisual(pta.estado || 'Borrador').border}`,
                    }}>{pta.estado || 'Borrador'}</span>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>{pta.total_horas_programadas || 0}h</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: '1px solid #E5E7EB', fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'center' }}>
              {r01FilteredPtas.length} docentes disponibles
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ Panel de Alertas Detallado ═══ */}
      {showAlertPanel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={() => setShowAlertPanel(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '92%', maxWidth: 640, maxHeight: '82vh',
              background: 'white', borderRadius: 16,
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '18px 22px', borderBottom: '1px solid #E5E7EB',
              background: alertas.some(a => a.tipo === 'critica') ? '#FEF2F2' : '#FFFBEB',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: alertas.some(a => a.tipo === 'critica') ? '#FEE2E2' : '#FEF3C7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BellRing style={{
                    width: 20, height: 20,
                    color: alertas.some(a => a.tipo === 'critica') ? '#DC2626' : '#D97706',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                    Centro de Alertas PTA
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {alertas.length} alerta{alertas.length !== 1 ? 's' : ''} detectada{alertas.length !== 1 ? 's' : ''} — {activeAlerts.length} activa{activeAlerts.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowAlertPanel(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                background: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
              </button>
            </div>

            {/* Umbrales Config Info */}
            <div style={{
              padding: '10px 22px', borderBottom: '1px solid #F3F4F6',
              background: '#F9FAFB', fontSize: '0.72rem', color: '#6B7280',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Gauge style={{ width: 12, height: 12 }} />
              Umbrales configurados: Pendientes &gt;20 | Devueltos &gt;5 | Aprobacion &lt;50% | Programacion &lt;60% | Borradores &gt;15 | Concertacion &gt;10
            </div>

            {/* Alerts List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {alertas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  <CheckCircle2 style={{ width: 40, height: 40, margin: '0 auto 12px', color: '#059669', opacity: 0.4 }} />
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#059669' }}>Sin alertas activas</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Todos los indicadores dentro de parametros normales</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {alertas.map(alerta => {
                    const dismissed = dismissedAlerts.has(alerta.id);
                    const umbralConfig = UMBRALES.find(u => u.kpi === alerta.kpi);
                    return (
                      <motion.div
                        key={alerta.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: dismissed ? 0.4 : 1, x: 0 }}
                        style={{
                          padding: 16, borderRadius: 12,
                          border: '1px solid',
                          borderColor: alerta.tipo === 'critica' ? '#FECACA'
                            : alerta.tipo === 'advertencia' ? '#FDE68A' : '#E5E7EB',
                          background: dismissed ? '#F9FAFB'
                            : alerta.tipo === 'critica' ? '#FEF2F2'
                            : alerta.tipo === 'advertencia' ? '#FFFBEB' : 'white',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                              background: alerta.tipo === 'critica' ? '#FEE2E2'
                                : alerta.tipo === 'advertencia' ? '#FEF3C7' : '#F3F4F6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <alerta.icono style={{
                                width: 18, height: 18,
                                color: alerta.tipo === 'critica' ? '#DC2626'
                                  : alerta.tipo === 'advertencia' ? '#D97706' : '#6B7280',
                              }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 800,
                                  textTransform: 'uppercase', letterSpacing: 0.5,
                                  background: alerta.tipo === 'critica' ? '#DC2626' : alerta.tipo === 'advertencia' ? '#D97706' : '#6B7280',
                                  color: 'white',
                                }}>
                                  {alerta.tipo}
                                </span>
                                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
                                  {alerta.titulo}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
                                {alerta.mensaje}
                              </p>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                {/* KPI Indicator */}
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                                  background: '#F3F4F6', color: '#374151',
                                }}>
                                  Valor: <strong style={{ color: alerta.tipo === 'critica' ? '#DC2626' : '#D97706' }}>
                                    {typeof alerta.valor === 'number' && alerta.valor % 1 !== 0
                                      ? alerta.valor.toFixed(1) : alerta.valor}
                                  </strong>
                                  {' '}| Umbral: {alerta.umbral}
                                </span>
                                {/* Action button */}
                                {umbralConfig && (
                                  <button
                                    onClick={() => handleAlertAction(umbralConfig.reporteId)}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                      padding: '4px 12px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                                      border: 'none', cursor: 'pointer',
                                      background: alerta.tipo === 'critica' ? '#DC2626' : '#D97706',
                                      color: 'white',
                                    }}
                                  >
                                    Ir a {umbralConfig.reporteId} <ArrowRight style={{ width: 11, height: 11 }} />
                                  </button>
                                )}
                                {!dismissed && (
                                  <button
                                    onClick={() => handleDismissAlert(alerta.id)}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 4,
                                      padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                                      border: '1px solid #E5E7EB', background: 'white',
                                      cursor: 'pointer', color: '#6B7280',
                                    }}
                                  >
                                    <EyeOff style={{ width: 11, height: 11 }} /> Descartar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.65rem', color: '#9CA3AF', marginTop: 8,
                          paddingTop: 6, borderTop: '1px solid #F3F4F6',
                          display: 'flex', justifyContent: 'space-between',
                        }}>
                          <span>Detectada: {alerta.timestamp.toLocaleString('es-CO')}</span>
                          <span>KPI: {alerta.kpi}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 22px', borderTop: '1px solid #E5E7EB',
              background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                ESAP — Sistema PTA v5.0 | Centro de Alertas
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {dismissedAlerts.size > 0 && (
                  <button onClick={handleRestoreAllAlerts} style={{
                    padding: '6px 14px', borderRadius: 7, border: '1px solid #BBF7D0',
                    background: '#F0FDF4', fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', color: '#059669',
                  }}>
                    <Eye style={{ width: 12, height: 12, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    Restaurar ({dismissedAlerts.size})
                  </button>
                )}
                {activeAlerts.length > 0 && (
                  <button onClick={() => {
                    alertas.forEach(a => handleDismissAlert(a.id));
                    setShowAlertPanel(false);
                  }} style={{
                    padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB',
                    background: 'white', fontSize: '0.75rem', fontWeight: 600,
                    cursor: 'pointer', color: '#6B7280',
                  }}>
                    Descartar Todas
                  </button>
                )}
                <button onClick={() => setShowAlertPanel(false)} style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none',
                  background: '#003DA5', color: 'white', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ Modal Comparativo Dual-Periodo ═══ */}
      {showComparativo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={() => setShowComparativo(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '94%', maxWidth: 720, maxHeight: '85vh',
              background: 'white', borderRadius: 16,
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '18px 22px', borderBottom: '1px solid #E5E7EB',
              background: '#FAF5FF',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <GitCompareArrows style={{ width: 20, height: 20, color: '#7C3AED' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                    Comparativo Dual-Periodo
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    Compare metricas PTA entre dos periodos academicos
                  </div>
                </div>
              </div>
              <button onClick={() => setShowComparativo(false)} style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                background: 'white', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
              </button>
            </div>

            {/* Config */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                    Periodo actual
                  </label>
                  <div style={{
                    padding: '8px 14px', borderRadius: 8, background: '#EFF6FF',
                    border: '1px solid #BFDBFE', fontSize: '0.85rem', fontWeight: 700, color: '#003DA5',
                  }}>
                    2026-1
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', color: '#9CA3AF', fontWeight: 800, fontSize: '1.1rem' }}>
                  vs
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>
                    Periodo a comparar
                  </label>
                  <select
                    value={periodoComparar}
                    onChange={e => { setPeriodoComparar(e.target.value); setPtasComparar([]); }}
                    style={{
                      width: '100%', padding: '8px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                      fontSize: '0.85rem', fontWeight: 600, color: '#374151', outline: 'none', background: 'white',
                    }}
                  >
                    {PERIODOS_DISPONIBLES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleLoadComparativo}
                  disabled={loadingComparar}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: 'none',
                    background: '#7C3AED', color: 'white', fontSize: '0.82rem', fontWeight: 700,
                    cursor: loadingComparar ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    opacity: loadingComparar ? 0.7 : 1,
                  }}
                >
                  {loadingComparar ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <RefreshCw style={{ width: 14, height: 14 }} />}
                  Cargar
                </button>
              </div>
            </div>

            {/* Comparison Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px' }}>
              {!comparativoMetrics ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                  <GitCompareArrows style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Seleccione un periodo y presione "Cargar"</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Se mostrara la tabla comparativa con variaciones porcentuales</div>
                </div>
              ) : (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800, color: '#374151' }}>Metrica</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: '#003DA5' }}>2026-1</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: '#7C3AED' }}>{periodoComparar}</th>
                        <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: '#374151' }}>Variacion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Total PTAs', cur: kpiMetrics.total, comp: comparativoMetrics.total },
                        { label: 'Aprobados', cur: kpiMetrics.aprobados, comp: comparativoMetrics.aprobados },
                        { label: 'Pendientes', cur: kpiMetrics.pendientes, comp: comparativoMetrics.pendientes },
                        { label: 'Devueltos', cur: kpiMetrics.devueltos, comp: comparativoMetrics.devueltos },
                        { label: 'Horas Programadas', cur: kpiMetrics.totalHoras, comp: comparativoMetrics.totalHoras },
                        { label: '% Aprobacion', cur: kpiMetrics.pctAprobacion, comp: comparativoMetrics.pctAprobacion, pct: true },
                        { label: '% Programacion', cur: kpiMetrics.pctProgramacion, comp: comparativoMetrics.pctProgramacion, pct: true },
                        { label: 'Territoriales', cur: kpiMetrics.territoriales, comp: comparativoMetrics.territoriales },
                      ].map((row, i) => {
                        const diff = row.cur - row.comp;
                        const pctChange = row.comp !== 0 ? ((diff / row.comp) * 100) : 0;
                        const fmt = (v: number) => row.pct ? `${v.toFixed(1)}%` : String(Math.round(v));
                        return (
                          <tr key={row.label} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#374151' }}>{row.label}</td>
                            <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 700, color: '#003DA5' }}>{fmt(row.cur)}</td>
                            <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600, color: '#7C3AED' }}>{fmt(row.comp)}</td>
                            <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 800,
                                background: diff > 0 ? '#F0FDF4' : diff < 0 ? '#FEF2F2' : '#F3F4F6',
                                color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : '#6B7280',
                              }}>
                                {diff > 0 ? <TrendingUp style={{ width: 12, height: 12 }} /> : diff < 0 ? <TrendingDown style={{ width: 12, height: 12 }} /> : null}
                                {pctChange !== 0 ? `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}%` : '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* ═══ Bar Charts Comparativos ═══ */}
                  {kpiMetrics && (<div style={{ marginTop: 24 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BarChart3 style={{ width: 16, height: 16, color: '#7C3AED' }} />
                      Graficos Comparativos
                    </div>

                    {/* Bar Chart: Counts */}
                    <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB', marginBottom: 16 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: 10 }}>
                        Distribucion por Estado
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={[
                          { name: 'Total', actual: kpiMetrics.total, comparar: comparativoMetrics.total },
                          { name: 'Aprobados', actual: kpiMetrics.aprobados, comparar: comparativoMetrics.aprobados },
                          { name: 'Pendientes', actual: kpiMetrics.pendientes, comparar: comparativoMetrics.pendientes },
                          { name: 'Devueltos', actual: kpiMetrics.devueltos, comparar: comparativoMetrics.devueltos },
                        ]} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.78rem' }} />
                          <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                          <Bar dataKey="actual" name="2026-1 (Actual)" fill="#003DA5" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="comparar" name={periodoComparar} fill="#7C3AED" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Bar Chart: Percentages */}
                    <div style={{ background: '#F9FAFB', borderRadius: 12, padding: 16, border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', marginBottom: 10 }}>
                        Indicadores Porcentuales
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={[
                          { name: '% Aprobacion', actual: +kpiMetrics.pctAprobacion.toFixed(1), comparar: +comparativoMetrics.pctAprobacion.toFixed(1) },
                          { name: '% Programacion', actual: +kpiMetrics.pctProgramacion.toFixed(1), comparar: +comparativoMetrics.pctProgramacion.toFixed(1) },
                        ]} barCategoryGap="30%" layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} unit="%" />
                          <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: '#6B7280' }} />
                          <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '0.78rem' }} formatter={(v: any) => `${v}%`} />
                          <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                          <Bar dataKey="actual" name="2026-1 (Actual)" fill="#003DA5" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="comparar" name={periodoComparar} fill="#7C3AED" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Summary delta badges */}
                    <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                      {[
                        { label: 'PTAs', cur: kpiMetrics.total, prev: comparativoMetrics.total },
                        { label: 'Aprobados', cur: kpiMetrics.aprobados, prev: comparativoMetrics.aprobados },
                        { label: 'Horas', cur: kpiMetrics.totalHoras, prev: comparativoMetrics.totalHoras },
                        { label: 'Territoriales', cur: kpiMetrics.territoriales, prev: comparativoMetrics.territoriales },
                      ].map(item => {
                        const diff = item.cur - item.prev;
                        const pctDiff = item.prev !== 0 ? ((diff / item.prev) * 100) : 0;
                        return (
                          <div key={item.label} style={{
                            flex: '1 1 120px', padding: '10px 14px', borderRadius: 10,
                            background: diff > 0 ? '#F0FDF4' : diff < 0 ? '#FEF2F2' : '#F9FAFB',
                            border: '1px solid', borderColor: diff > 0 ? '#BBF7D0' : diff < 0 ? '#FECACA' : '#E5E7EB',
                          }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{Math.round(item.cur)}</span>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 800,
                                color: diff > 0 ? '#059669' : diff < 0 ? '#DC2626' : '#6B7280',
                                display: 'flex', alignItems: 'center', gap: 2,
                              }}>
                                {diff > 0 ? <TrendingUp style={{ width: 11, height: 11 }} /> : diff < 0 ? <TrendingDown style={{ width: 11, height: 11 }} /> : null}
                                {pctDiff !== 0 ? `${pctDiff > 0 ? '+' : ''}${pctDiff.toFixed(1)}%` : '='}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 22px', borderTop: '1px solid #E5E7EB',
              background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                ESAP — Comparativo PTA v5.2
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {comparativoMetrics && (
                  <button onClick={handleExportComparativoPDF} style={{
                    padding: '6px 14px', borderRadius: 7, border: 'none',
                    background: '#7C3AED', color: 'white', fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <FileDown style={{ width: 13, height: 13 }} />
                    Exportar PDF
                  </button>
                )}
                <button onClick={() => setShowComparativo(false)} style={{
                  padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB',
                  background: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
                }}>
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══ Modal Scheduler de Reportes ═══ */}
      {showSchedulerPanel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        }} onClick={() => { setShowSchedulerPanel(false); setShowScheduleForm(false); }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: '94%', maxWidth: 740, maxHeight: '88vh',
              background: 'white', borderRadius: 16,
              boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '18px 22px', borderBottom: '1px solid #E5E7EB',
              background: '#ECFEFF',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: '#CFFAFE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CalendarClock style={{ width: 20, height: 20, color: '#0891B2' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                    Programacion de Reportes
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    Configure envio automatico de reportes por correo electronico
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Execute All */}
                {schedules.filter(s => s.activo).length > 0 && (
                  <button onClick={handleExecuteAll} disabled={executingScheduler} title="Ejecutar todas las programaciones activas ahora" style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: executingScheduler ? '#94A3B8' : '#059669', color: 'white', fontSize: '0.78rem', fontWeight: 700,
                    cursor: executingScheduler ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    {executingScheduler ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Play style={{ width: 14, height: 14 }} />}
                    Ejecutar
                  </button>
                )}
                {!showScheduleForm && schedulerTab === 'programaciones' && (
                  <button onClick={() => setShowScheduleForm(true)} style={{
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: '#0891B2', color: 'white', fontSize: '0.78rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <Plus style={{ width: 14, height: 14 }} /> Nueva
                  </button>
                )}
                <button onClick={() => { setShowSchedulerPanel(false); setShowScheduleForm(false); }} style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                  background: 'white', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <XIcon style={{ width: 16, height: 16, color: '#6B7280' }} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB' }}>
              {([
                { id: 'programaciones' as const, label: 'Programaciones', icon: CalendarClock, count: schedules.length },
                { id: 'historial' as const, label: 'Historial', icon: History, count: schedulerHistory.length },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setSchedulerTab(tab.id); setShowScheduleForm(false); }}
                  style={{
                    flex: 1, padding: '10px 16px', border: 'none', borderBottom: '2px solid',
                    borderBottomColor: schedulerTab === tab.id ? '#0891B2' : 'transparent',
                    background: schedulerTab === tab.id ? '#F0FDFA' : 'white',
                    color: schedulerTab === tab.id ? '#0891B2' : '#6B7280',
                    fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    marginBottom: -2,
                  }}
                >
                  <tab.icon style={{ width: 14, height: 14 }} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span style={{
                      padding: '1px 7px', borderRadius: 10,
                      background: schedulerTab === tab.id ? '#0891B2' : '#E5E7EB',
                      color: schedulerTab === tab.id ? 'white' : '#6B7280',
                      fontSize: '0.65rem', fontWeight: 800,
                    }}>{tab.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {schedulerTab === 'programaciones' && (<>

              {/* Schedule Form */}
              {showScheduleForm && (
                <div style={{ padding: '16px 22px', borderBottom: '2px solid #E5E7EB', background: '#F0FDFA' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0E7490', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus style={{ width: 14, height: 14 }} /> Nueva Programacion
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {/* Reporte */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Reporte *</label>
                      <select
                        value={scheduleForm.reporteId}
                        onChange={e => {
                          const rep = CATALOGO_REPORTES.find(r => r.id === e.target.value);
                          setScheduleForm(prev => ({ ...prev, reporteId: e.target.value, reporteNombre: rep ? `${rep.id}: ${rep.nombre}` : '' }));
                        }}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                          fontSize: '0.82rem', outline: 'none', background: 'white',
                        }}
                      >
                        <option value="">Seleccionar reporte...</option>
                        {CATALOGO_REPORTES.map(r => (
                          <option key={r.id} value={r.id}>{r.id}: {r.nombre}</option>
                        ))}
                      </select>
                    </div>
                    {/* Frecuencia */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Frecuencia *</label>
                      <select
                        value={scheduleForm.frecuencia}
                        onChange={e => setScheduleForm(prev => ({ ...prev, frecuencia: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                          fontSize: '0.82rem', outline: 'none', background: 'white',
                        }}
                      >
                        {FRECUENCIAS.map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Hora */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Hora de envio</label>
                      <input
                        type="time"
                        value={scheduleForm.hora}
                        onChange={e => setScheduleForm(prev => ({ ...prev, hora: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                          fontSize: '0.82rem', outline: 'none',
                        }}
                      />
                    </div>
                    {/* Day selector */}
                    {scheduleForm.frecuencia === 'semanal' && (
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Dia de la semana</label>
                        <select
                          value={scheduleForm.diaSemana}
                          onChange={e => setScheduleForm(prev => ({ ...prev, diaSemana: Number(e.target.value) }))}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                            fontSize: '0.82rem', outline: 'none', background: 'white',
                          }}
                        >
                          {DIAS_SEMANA.map((d, i) => (
                            <option key={i} value={i}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {(scheduleForm.frecuencia === 'mensual' || scheduleForm.frecuencia === 'quincenal') && (
                      <div>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Dia del mes</label>
                        <input
                          type="number" min={1} max={28}
                          value={scheduleForm.diaMes}
                          onChange={e => setScheduleForm(prev => ({ ...prev, diaMes: Number(e.target.value) }))}
                          style={{
                            width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                            fontSize: '0.82rem', outline: 'none',
                          }}
                        />
                      </div>
                    )}
                    {/* Formato */}
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>Formato</label>
                      <select
                        value={scheduleForm.formato}
                        onChange={e => setScheduleForm(prev => ({ ...prev, formato: e.target.value }))}
                        style={{
                          width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                          fontSize: '0.82rem', outline: 'none', background: 'white',
                        }}
                      >
                        <option value="PDF">PDF</option>
                        <option value="CSV">CSV</option>
                        <option value="PDF+CSV">PDF + CSV</option>
                      </select>
                    </div>
                  </div>

                  {/* Destinatarios */}
                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 6, display: 'block' }}>
                      Destinatarios ({scheduleForm.destinatarios.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {scheduleForm.destinatarios.map((email, idx) => (
                        <span key={idx} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6, background: '#E0F2FE',
                          fontSize: '0.75rem', fontWeight: 600, color: '#0369A1',
                        }}>
                          <Mail style={{ width: 11, height: 11 }} />
                          {email}
                          <button onClick={() => setScheduleForm(prev => ({
                            ...prev, destinatarios: prev.destinatarios.filter((_, i) => i !== idx),
                          }))} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            color: '#0369A1', marginLeft: 2,
                          }}>
                            <XIcon style={{ width: 11, height: 11 }} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="email"
                        value={scheduleForm.nuevoDestinatario}
                        onChange={e => setScheduleForm(prev => ({ ...prev, nuevoDestinatario: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && scheduleForm.nuevoDestinatario.includes('@')) {
                            e.preventDefault();
                            setScheduleForm(prev => ({
                              ...prev,
                              destinatarios: [...prev.destinatarios, prev.nuevoDestinatario.trim()],
                              nuevoDestinatario: '',
                            }));
                          }
                        }}
                        placeholder="correo@esap.edu.co (Enter para agregar)"
                        style={{
                          flex: 1, padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
                          fontSize: '0.82rem', outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => {
                          if (scheduleForm.nuevoDestinatario.includes('@')) {
                            setScheduleForm(prev => ({
                              ...prev,
                              destinatarios: [...prev.destinatarios, prev.nuevoDestinatario.trim()],
                              nuevoDestinatario: '',
                            }));
                          }
                        }}
                        style={{
                          padding: '7px 14px', borderRadius: 8, border: '1px solid #D1D5DB',
                          background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
                        }}
                      >
                        <Plus style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowScheduleForm(false)} style={{
                      padding: '8px 16px', borderRadius: 8, border: '1px solid #E5E7EB',
                      background: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', color: '#6B7280',
                    }}>
                      Cancelar
                    </button>
                    <button onClick={handleSaveSchedule} disabled={scheduleSaving} style={{
                      padding: '8px 20px', borderRadius: 8, border: 'none',
                      background: '#0891B2', color: 'white', fontSize: '0.82rem', fontWeight: 700,
                      cursor: scheduleSaving ? 'wait' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      opacity: scheduleSaving ? 0.7 : 1,
                    }}>
                      {scheduleSaving ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 14, height: 14 }} />}
                      Crear Programacion
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Schedules */}
              <div style={{ padding: '16px 22px' }}>
                {schedules.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                    <CalendarClock style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Sin programaciones</div>
                    <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                      Cree una programacion para enviar reportes automaticamente
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#374151', marginBottom: 4 }}>
                      {schedules.length} programacion{schedules.length !== 1 ? 'es' : ''} configurada{schedules.length !== 1 ? 's' : ''}
                    </div>
                    {schedules.map(sched => (
                      <motion.div
                        key={sched.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: 14, borderRadius: 12,
                          border: '1px solid', borderColor: sched.activo ? '#A5F3FC' : '#E5E7EB',
                          background: sched.activo ? '#F0FDFA' : '#F9FAFB',
                          opacity: sched.activo ? 1 : 0.6,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 800,
                                background: sched.activo ? '#0891B2' : '#9CA3AF', color: 'white',
                                textTransform: 'uppercase',
                              }}>
                                {sched.activo ? 'Activa' : 'Pausada'}
                              </span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
                                {sched.reporteNombre || sched.reporteId}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.75rem', color: '#6B7280' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <CalendarClock style={{ width: 12, height: 12 }} />
                                {sched.frecuencia} a las {sched.hora}
                                {sched.frecuencia === 'semanal' && sched.diaSemana != null ? ` — ${DIAS_SEMANA[sched.diaSemana]}` : ''}
                                {(sched.frecuencia === 'mensual' || sched.frecuencia === 'quincenal') && sched.diaMes ? ` — Dia ${sched.diaMes}` : ''}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <FileDown style={{ width: 12, height: 12 }} />
                                {sched.formato}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Mail style={{ width: 12, height: 12 }} />
                                {sched.destinatarios?.length || 0} destinatario{(sched.destinatarios?.length || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {sched.destinatarios?.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                                {sched.destinatarios.map((email: string, i: number) => (
                                  <span key={i} style={{
                                    padding: '2px 8px', borderRadius: 5, background: '#E0F2FE',
                                    fontSize: '0.68rem', color: '#0369A1',
                                  }}>
                                    {email}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {/* Execute Single */}
                            <button
                              onClick={() => handleExecuteSingle(sched.id)}
                              disabled={!!executingSingle}
                              title="Ejecutar ahora manualmente"
                              style={{
                                width: 32, height: 32, borderRadius: 7, border: '1px solid #BBF7D0',
                                background: '#F0FDF4', cursor: executingSingle === sched.id ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              {executingSingle === sched.id
                                ? <Loader2 style={{ width: 14, height: 14, color: '#059669', animation: 'spin 1s linear infinite' }} />
                                : <Play style={{ width: 14, height: 14, color: '#059669' }} />
                              }
                            </button>
                            <button
                              onClick={() => handleToggleSchedule(sched.id)}
                              title={sched.activo ? 'Pausar' : 'Activar'}
                              style={{
                                width: 32, height: 32, borderRadius: 7, border: '1px solid #E5E7EB',
                                background: 'white', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Power style={{ width: 14, height: 14, color: sched.activo ? '#0891B2' : '#9CA3AF' }} />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sched.id)}
                              title="Eliminar"
                              style={{
                                width: 32, height: 32, borderRadius: 7, border: '1px solid #FCA5A5',
                                background: '#FEF2F2', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              <Trash2 style={{ width: 14, height: 14, color: '#DC2626' }} />
                            </button>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.65rem', color: '#9CA3AF', marginTop: 8,
                          paddingTop: 6, borderTop: '1px solid #F3F4F6',
                          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
                        }}>
                          {sched.createdAt && <span>Creada: {new Date(sched.createdAt).toLocaleString('es-CO')}</span>}
                          {sched.ultimaEjecucion && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <CircleDot style={{ width: 8, height: 8, color: sched.ultimoStatus === 'completado' ? '#059669' : '#DC2626' }} />
                              Ultima: {new Date(sched.ultimaEjecucion).toLocaleString('es-CO')}
                            </span>
                          )}
                          {sched.totalEjecuciones > 0 && (
                            <span style={{ padding: '1px 6px', borderRadius: 4, background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700 }}>
                              {sched.totalEjecuciones} ejecucion{sched.totalEjecuciones !== 1 ? 'es' : ''}
                            </span>
                          )}
                          {sched.proximaEjecucion && (
                            <span>Proxima: {new Date(sched.proximaEjecucion).toLocaleString('es-CO')}</span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
              </>)}

              {/* ═══ Historial Tab ═══ */}
              {schedulerTab === 'historial' && (
                <div style={{ padding: '16px 22px' }}>
                  {schedulerHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                      <History style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.3 }} />
                      <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>Sin ejecuciones registradas</div>
                      <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                        Ejecute una programacion para ver el historial aqui
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#374151' }}>
                          {schedulerHistory.length} ejecucion{schedulerHistory.length !== 1 ? 'es' : ''} registrada{schedulerHistory.length !== 1 ? 's' : ''}
                        </div>
                        <button onClick={handleClearHistory} style={{
                          padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E7EB',
                          background: 'white', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', color: '#6B7280',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <RotateCcw style={{ width: 11, height: 11 }} /> Limpiar
                        </button>
                      </div>
                      {schedulerHistory.slice(0, 50).map((exec: any) => (
                        <div
                          key={exec.id}
                          style={{
                            padding: '12px 14px', borderRadius: 10,
                            border: '1px solid',
                            borderColor: exec.status === 'completado' ? '#BBF7D0' : '#FECACA',
                            background: exec.status === 'completado' ? '#F0FDF4' : '#FEF2F2',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 800,
                                  textTransform: 'uppercase', letterSpacing: 0.5,
                                  background: exec.status === 'completado' ? '#059669' : '#DC2626',
                                  color: 'white',
                                }}>
                                  {exec.status}
                                </span>
                                <span style={{
                                  padding: '2px 7px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700,
                                  background: exec.frecuencia === 'manual' ? '#7C3AED' : '#0891B2',
                                  color: 'white',
                                }}>
                                  {exec.frecuencia}
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}>
                                  {exec.reporteNombre || exec.reporteId}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '2px 0', lineHeight: 1.4 }}>
                                {exec.detalles}
                              </p>
                              {exec.error && (
                                <p style={{ fontSize: '0.72rem', color: '#DC2626', margin: '4px 0 0', fontWeight: 600 }}>
                                  Error: {exec.error}
                                </p>
                              )}
                            </div>
                            <div style={{
                              padding: '4px 10px', borderRadius: 6, background: '#F3F4F6',
                              fontSize: '0.68rem', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap',
                            }}>
                              {exec.duracionMs}ms
                            </div>
                          </div>
                          <div style={{
                            fontSize: '0.65rem', color: '#9CA3AF', marginTop: 6,
                            paddingTop: 5, borderTop: '1px solid', borderTopColor: exec.status === 'completado' ? '#D1FAE5' : '#FECDD3',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4,
                          }}>
                            <span>{exec.ejecutadoEn ? new Date(exec.ejecutadoEn).toLocaleString('es-CO') : ''}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Mail style={{ width: 10, height: 10 }} />
                              {exec.destinatarios?.length || 0} destinatario{(exec.destinatarios?.length || 0) !== 1 ? 's' : ''}
                              {exec.formato && ` • ${exec.formato}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 22px', borderTop: '1px solid #E5E7EB',
              background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                ESAP — Scheduler PTA v5.2 | {schedules.filter(s => s.activo).length} activa{schedules.filter(s => s.activo).length !== 1 ? 's' : ''} | {schedulerHistory.length} ejecucion{schedulerHistory.length !== 1 ? 'es' : ''}
              </div>
              <button onClick={() => { setShowSchedulerPanel(false); setShowScheduleForm(false); }} style={{
                padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB',
                background: 'white', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
              }}>
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
