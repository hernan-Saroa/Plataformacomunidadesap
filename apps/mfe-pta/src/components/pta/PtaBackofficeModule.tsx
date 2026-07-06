/**
 * PtaBackofficeModule — Módulo de aprobación y gestión de PTAs (Backoffice)
 * 
 * Features:
 * - Dashboard de estadísticas por periodo
 * - Filtros avanzados (estado, periodo, programa)
 * - Panel de aprobación multinivel con observaciones
 * - Devolución con motivo detallado
 * - Vista de detalle completa (todos los componentes del PTA)
 * - Historial de aprobaciones con timeline
 * - Integración bidireccional con Portal docente
 * - Sistema de permisos por rol (Fase 6)
 * - Panel SNA de arbitraje (Fase 6)
 * - Notificaciones en tiempo real (Fase 6)
 * - Persistencia de tags/notas/pins en KV Store (Feature 32)
 * - Filtro por tags en barra de filtros (Feature 32)
 * - Drag & drop para reordenar prioridades (Feature 33)
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  getAllPTAs, getPTAEstadisticas, updatePTAStatus, getCatalogoProgramas, seedPTAs,
  guardarFirmaDigitalPTA, getPTAUserData, savePTAUserData, deletePTA,
  getAllPtasConEvidencias, revisarEvidenciaPTA,
  getSolicitudesPTA, resolverSolicitudPTA, getCatalogoTerritoriales,
  getPTAById,
} from '../../services/api/ptaApi';
import { apiClient } from '../../../../shell/src/services/api';
import { usePTARealtimeSync } from '../../hooks/usePTARealtimeSync';
import { PTASyncIndicator } from './PTASyncIndicator';
import {
  FileText, CheckCircle, XCircle, Clock, Eye, X, Database,
  Filter, BarChart3, ChevronRight, Send, RotateCcw, AlertTriangle,
  TrendingUp, Users, BookOpen, FlaskConical, Globe, Briefcase,
  MessageSquare, ChevronDown, Search, Calendar, ArrowRight, Scale,
  Bookmark, Keyboard, Sigma, Columns3, Activity, Zap,
  Sliders, Star, StickyNote, GitCompare, RefreshCw, Layers,
  Command, ChevronUp, Tag, Bell, GripVertical, Shield, FolderOpen, MoreHorizontal, Trash2, Download,
  GraduationCap, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNotifications } from '../esap/NotificationsContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
// ✅ ELIMINADO - DashboardCargaMasivaPTA (la carga masiva se hace desde Gestión Personas - fuente única de verdad)
import { ProgramacionAcademica } from './ProgramacionAcademica';
import { MesaConcertacion } from './MesaConcertacion';
import { PermisosPTAProvider, SelectorRolPTA, usePermisosPTA } from './PermisosPTAContext';
import { useAuth } from '../../contexts/AuthContext';
import { FirmaDigitalPTA } from './FirmaDigitalPTA';
import type { FirmaData } from './FirmaDigitalPTA';
import { PTADetallePanelBackoffice } from './PTADetallePanelBackoffice';
import { supabaseService } from '../../services/api/supabase.service';
import { PTAWorkflowPipeline } from './PTAWorkflowPipeline';
import { PTAMobileBar } from './PTAMobileBar';
import { PTAWorldClassToolbar } from './PTAWorldClassToolbar';
import { ESAPLogoLoader } from '../common/ESAPLogoLoader';
import {
  PTA_COMPONENT_KEYS,
  PTA_EXTENSION_COMPONENT_KEYS,
  type PTAComponentKey,
  hasAnyComponentApprovalData,
} from './shared/ptaComponentPermissions';
import '../../styles/pta-world-class.css';

// ══ Lazy-loaded components (code splitting — loaded only when their tab/view is active) ══
const TableroControlPTA = React.lazy(() => import('./TableroControlPTA').then(m => ({ default: m.TableroControlPTA })));
const ReporteNacionalPTA = React.lazy(() => import('./ReporteNacionalPTA').then(m => ({ default: m.ReporteNacionalPTA })));
const ReporteSeguimientoPTA = React.lazy(() => import('./ReporteSeguimientoPTA').then(m => ({ default: m.ReporteSeguimientoPTA })));
const DashboardDirectivoPTA = React.lazy(() => import('./DashboardDirectivoPTA').then(m => ({ default: m.DashboardDirectivoPTA })));
const GestionTerritorialPTA = React.lazy(() => import('./GestionTerritorialPTA').then(m => ({ default: m.GestionTerritorialPTA })));
const ComparativoPeriodosPTA = React.lazy(() => import('./ComparativoPeriodosPTA').then(m => ({ default: m.ComparativoPeriodosPTA })));
const ExportadorReportesPTA = React.lazy(() => import('./ExportadorReportesPTA').then(m => ({ default: m.ExportadorReportesPTA })));
const PanelSNA_PTA = React.lazy(() => import('./PanelSNA_PTA').then(m => ({ default: m.PanelSNA_PTA })));
const NotificacionesPTA = React.lazy(() => import('./NotificacionesPTA').then(m => ({ default: m.NotificacionesPTA })));
const ValidadorCatalogoGTH = React.lazy(() => import('./ValidadorCatalogoGTH').then(m => ({ default: m.ValidadorCatalogoGTH })));
const TestE2E_FlujoPTA = React.lazy(() => import('./TestE2E_FlujoPTA').then(m => ({ default: m.TestE2E_FlujoPTA })));
const MapaCoberturaTerritorialPTA = React.lazy(() => import('./MapaCoberturaTerritorialPTA').then(m => ({ default: m.MapaCoberturaTerritorialPTA })));
const AlertasTempranasPTA = React.lazy(() => import('./AlertasTempranasPTA').then(m => ({ default: m.AlertasTempranasPTA })));
const PreAprobacionSNI_SNPI_PTA = React.lazy(() => import('./PreAprobacionSNI_SNPI_PTA'));
const CertificadoFirmaPTA = React.lazy(() => import('./CertificadoFirmaPTA').then(m => ({ default: m.CertificadoFirmaPTA })));
const IndicadoresRendimientoPTA = React.lazy(() => import('./IndicadoresRendimientoPTA').then(m => ({ default: m.IndicadoresRendimientoPTA })));
const ActaConcertacionPTA = React.lazy(() => import('./ActaConcertacionPTA').then(m => ({ default: m.ActaConcertacionPTA })));
const SimuladorCargaPTA = React.lazy(() => import('./SimuladorCargaPTA').then(m => ({ default: m.SimuladorCargaPTA })));
const BenchmarkingPTA = React.lazy(() => import('./BenchmarkingPTA').then(m => ({ default: m.BenchmarkingPTA })));
const ExportadorActasMasivoPTA = React.lazy(() => import('./ExportadorActasMasivoPTA').then(m => ({ default: m.ExportadorActasMasivoPTA })));
const ComiteEvaluacionPTA = React.lazy(() => import('./ComiteEvaluacionPTA').then(m => ({ default: m.ComiteEvaluacionPTA })));
const CalendarioAcademicoPTA = React.lazy(() => import('./CalendarioAcademicoPTA').then(m => ({ default: m.CalendarioAcademicoPTA })));
const AsignadorAutomaticoPTA = React.lazy(() => import('./AsignadorAutomaticoPTA').then(m => ({ default: m.AsignadorAutomaticoPTA })));
const KanbanPTA = React.lazy(() => import('./KanbanPTA').then(m => ({ default: m.KanbanPTA })));
const MetricasSLA_PTA = React.lazy(() => import('./MetricasSLA_PTA').then(m => ({ default: m.MetricasSLA_PTA })));
const GeneradorResolucionesPTA = React.lazy(() => import('./GeneradorResolucionesPTA').then(m => ({ default: m.GeneradorResolucionesPTA })));
const GestionConflictosPTA = React.lazy(() => import('./GestionConflictosPTA').then(m => ({ default: m.GestionConflictosPTA })));
const PreferenciasNotificacionesPTA = React.lazy(() => import('./PreferenciasNotificacionesPTA').then(m => ({ default: m.PreferenciasNotificacionesPTA })));
const WorkflowVisualizerPTA = React.lazy(() => import('./WorkflowVisualizerPTA').then(m => ({ default: m.WorkflowVisualizerPTA })));
const VerificacionQRPublicaPTA = React.lazy(() => import('./VerificacionQRPublicaPTA').then(m => ({ default: m.VerificacionQRPublicaPTA })));
const ProgramacionAcademicaInstitucionalPTA = React.lazy(() => import('./ProgramacionAcademicaInstitucionalPTA').then(m => ({ default: m.ProgramacionAcademicaInstitucionalPTA })));
const ReporteIndividualPTA = React.lazy(() => import('./ReporteIndividualPTA').then(m => ({ default: m.ReporteIndividualPTA })));
const CentroReportesPTA = React.lazy(() => import('./CentroReportesPTA').then(m => ({ default: m.CentroReportesPTA })));
const CronogramaProcesoPTA = React.lazy(() => import('./CronogramaProcesoPTA').then(m => ({ default: m.CronogramaProcesoPTA })));
const TableroControlUnificadoPTA = React.lazy(() => import('./TableroControlUnificadoPTA').then(m => ({ default: m.TableroControlUnificadoPTA })));
const ConfiguracionReglasPTA = React.lazy(() => import('./ConfiguracionReglasPTA'));
const MapeoSincronizacionPTA = React.lazy(() => import('./MapeoSincronizacionPTA').then(m => ({ default: m.MapeoSincronizacionPTA })));
const SaludSistemaPTA = React.lazy(() => import('./SaludSistemaPTA').then(m => ({ default: m.SaludSistemaPTA })));
const ReconciliacionMasivaPTA = React.lazy(() => import('./ReconciliacionMasivaPTA').then(m => ({ default: m.ReconciliacionMasivaPTA })));
const BancoDocentesPTA = React.lazy(() => import('./banco-docentes/BancoDocentesPTA').then(m => ({ default: m.BancoDocentesPTA })));

const ESTADOS_FILTRO = [
  { key: '', label: 'Todos los estados' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'PROPUESTO_POR_DIRECCION', label: 'Propuesto por Dir.' },
  { key: 'NOTIFICADO_DOCENTE', label: 'Notificado' },
  { key: 'EN_CONCERTACION', label: 'En Concertación' },
  { key: 'CONCERTADO', label: 'Concertado' },
  { key: 'ESCALADO_SNA', label: 'Escalado SNA' },
  { key: 'Pendiente Jefatura', label: 'Pendiente Jefatura' },
  { key: 'Pendiente Decanatura', label: 'Pendiente Decanatura' },
  { key: 'Pendiente Gestión Profesoral', label: 'Pendiente G. Profesoral' },
  { key: 'Aprobado', label: 'Aprobados' },
  { key: 'En Firme', label: 'En Firme' },
  { key: 'Rechazado', label: 'Rechazados' },
  { key: 'Devuelto', label: 'Devueltos' },
];

function getStatusConfig(estado: string) {
  switch (estado) {
    case 'BORRADOR': 
    case 'Borrador': return { bg: '#F3F4F6', color: '#4B5563', border: '#D1D5DB' };
    case 'PROPUESTO_POR_DIRECCION': return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE' };
    case 'NOTIFICADO_DOCENTE': return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
    case 'EN_CONCERTACION': 
    case 'OBJETADO_DOCENTE': 
    case 'MODIFICADO_DOCENTE': return { bg: '#F3E8FF', color: '#6B21A8', border: '#DDD6FE' };
    case 'CONCERTADO': return { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
    case 'ESCALADO_SNA': return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
    case 'PENDIENTE_APROBACION':
    case 'Pendiente Jefatura': return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
    case 'Pendiente Decanatura': return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' };
    case 'Pendiente Gestión Profesoral': return { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC' };
    case 'Aprobado':
    case 'APROBADO': return { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
    case 'En Firme':
    case 'EN_FIRME':
    case 'RADICADO': return { bg: '#047857', color: '#FFFFFF', border: '#059669' };
    case 'Rechazado': return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
    case 'Devuelto': return { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' };
    case 'Terminado':
    case 'TERMINADO': return { bg: '#E5E7EB', color: '#374151', border: '#D1D5DB' };
    default: return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB' };
  }
}

function getNextState(current: string): string {
  if (isEstadoPendienteAprobacion(current)) return 'Aprobado al completar avales';
  if (current === 'PENDIENTE_APROBACION') return 'Pendiente Jefatura';
  if (current === 'Pendiente Jefatura') return 'Pendiente Decanatura';
  if (current === 'Pendiente Decanatura') return 'Pendiente Gestión Profesoral';
  if (current === 'Pendiente Gestión Profesoral') return 'Aprobado';
  if (current === 'Aprobado') return 'En Firme';
  return 'Aprobado';
}

function formatDedicacion(d: string): string {
  if (!d) return 'TC';
  const v = d.toLowerCase();
  if (v.includes('completo') || v === 'tc') return 'TC';
  if (v.includes('medio') || v === 'mt') return 'MT';
  if (v.includes('hora') || v.includes('cated') || v.includes('cáted') || v === 'hc') return 'HC';
  return d;
}

function getDedicacionTooltip(sigla: string): string {
  switch(sigla) {
    case 'TC': return 'Tiempo Completo';
    case 'MT': return 'Medio Tiempo';
    case 'HC': return 'Hora Cátedra';
    default: return sigla;
  }
}

function getNextStateLabel(current: string): string {
  if (isEstadoPendienteAprobacion(current)) return 'Registrar aprobacion';
  if (current === 'PENDIENTE_APROBACION') return 'Enviar a Jefatura';
  if (current === 'Pendiente Jefatura') return 'Avanzar a Decanatura';
  if (current === 'Pendiente Decanatura') return 'Avanzar a Gestión Profesoral';
  if (current === 'Pendiente Gestión Profesoral') return 'Aprobar PTA';
  if (current === 'Aprobado') return 'Firmar y Radicar (En Firme)';
  return 'Aprobar';
}

// ═══ Sortable Header Helper ═══
function SortableHeader({ label, field, sortBy, sortDir, onSort }: {
  label: string; field: string; sortBy: string; sortDir: 'asc' | 'desc'; onSort: (field: string) => void;
}) {
  const isActive = sortBy === field;
  return (
    <button
      onClick={() => onSort(field)}
      style={{
        border: 'none', background: 'transparent', padding: 0,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
        fontSize: '0.68rem', fontWeight: 700, color: isActive ? '#003DA5' : '#6B7280',
        textTransform: 'uppercase', letterSpacing: '0.04em',
      }}
    >
      {label}
      {isActive && (
        <span style={{ fontSize: '0.6rem' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

// ═══ Solicitudes PTA — Vista Admin ═══════════════════════════════════

function SolicitudesPTAAdmin({ aprobadorNombre }: { aprobadorNombre: string }) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Formulario de resolución
  const [resForm, setResForm] = useState<Record<string, { accion?: string; motivo?: string; territorial?: string; horasOrig?: number; horasNuevo?: number }>>({});
  const [territoriales, setTerritoriales] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const res = await getSolicitudesPTA(filtro || undefined);
    if (res.success) setSolicitudes(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filtro]);

  // Cargar territoriales para caso 1 (vía apiClient/gateway, no fetch a localhost:5000
  // que rompía por CSP en QA/prod).
  useEffect(() => {
    getCatalogoTerritoriales()
      .then(r => { if (r.success) setTerritoriales(r.data || []); })
      .catch(() => {});
  }, []);

  const handleResolver = async (id: string, decision: 'aprobado' | 'denegado') => {
    const form = resForm[id] || {};
    setProcesando(id);
    const res = await resolverSolicitudPTA(id, {
      decision,
      motivo: form.motivo,
      accion: form.accion,
      territorialNueva: form.territorial,
      horasPtaOriginal: form.horasOrig,
      horasPtaNuevo: form.horasNuevo,
      resueltoPor: aprobadorNombre,
    });
    setProcesando(null);
    if (res.success) { toast.success(decision === 'aprobado' ? 'Solicitud aprobada' : 'Solicitud denegada'); load(); }
    else toast.error(res.message || 'Error');
  };

  const updateForm = (id: string, field: string, value: any) => {
    setResForm(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;

  const CASO_LABELS: Record<string, { label: string; color: string }> = {
    caso_1: { label: 'Otra territorial', color: '#003DA5' },
    caso_2: { label: 'Rehacer PTA', color: '#D97706' },
    caso_3: { label: 'Otro caso', color: '#6B21A8' },
  };

  return (
    <div style={{ padding: '0 0 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>Solicitudes de creacion de PTA</h2>
          <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '2px 0 0' }}>Docentes que solicitan crear un segundo PTA</p>
        </div>
        {pendientes > 0 && (
          <span style={{ padding: '4px 10px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: '0.72rem', fontWeight: 700 }}>
            {pendientes} pendiente{pendientes > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ k: '', l: 'Todas' }, { k: 'pendiente', l: 'Pendientes' }, { k: 'aprobado', l: 'Aprobadas' }, { k: 'denegado', l: 'Denegadas' }].map(f => (
          <button key={f.k} onClick={() => setFiltro(f.k)}
            style={{ padding: '5px 12px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: filtro === f.k ? '1.5px solid #003DA5' : '1px solid #E5E7EB', background: filtro === f.k ? '#EFF6FF' : 'white', color: filtro === f.k ? '#003DA5' : '#6B7280' }}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Cargando...</div>
      ) : solicitudes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#F9FAFB', borderRadius: 14 }}>
          <Send style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem', color: '#9CA3AF', margin: 0 }}>Sin solicitudes</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {solicitudes.map((sol: any) => {
            const isOpen = expandedId === sol.id;
            const casoLabel = CASO_LABELS[sol.caso] || { label: sol.caso, color: '#6B7280' };
            const isPendiente = sol.estado === 'pendiente';
            const form = resForm[sol.id] || {};
            const archivos = Array.isArray(sol.archivos) ? sol.archivos : [];

            return (
              <div key={sol.id} style={{ background: 'white', borderRadius: 12, border: `1px solid ${isPendiente ? '#FDE68A' : sol.estado === 'aprobado' ? '#6EE7B7' : '#FCA5A5'}`, overflow: 'hidden' }}>
                {/* Header */}
                <div onClick={() => setExpandedId(isOpen ? null : sol.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', background: isOpen ? '#FAFAFA' : 'white' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{sol.docenteNombre || sol.docente?.persona?.nombreCompleto || 'Docente'}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700, background: `${casoLabel.color}15`, color: casoLabel.color }}>{casoLabel.label}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700, background: isPendiente ? '#FEF3C7' : sol.estado === 'aprobado' ? '#D1FAE5' : '#FEE2E2', color: isPendiente ? '#92400E' : sol.estado === 'aprobado' ? '#065F46' : '#991B1B' }}>
                        {isPendiente ? 'Pendiente' : sol.estado === 'aprobado' ? 'Aprobada' : 'Denegada'}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{new Date(sol.createdAt).toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>
                  <ChevronDown style={{ width: 16, height: 16, color: '#9CA3AF', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>

                {/* Detalle expandido */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderTop: '1px solid #E5E7EB' }}>
                        {/* Info docente */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                          <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                            <strong>Territorial:</strong> {sol.docente?.territorial?.nombre || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                            <strong>Email:</strong> {sol.docenteEmail || sol.docente?.correoInstitucional || 'N/A'}
                          </div>
                        </div>

                        {/* Razon */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', marginBottom: 3 }}>Razon:</div>
                          <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: 0 }}>{sol.razon}</p>
                          {sol.casoLibre && <p style={{ fontSize: '0.78rem', color: '#6B21A8', margin: '4px 0 0', fontStyle: 'italic' }}>{sol.casoLibre}</p>}
                        </div>

                        {/* Justificacion */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', marginBottom: 3 }}>Justificacion:</div>
                          <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: 0, lineHeight: 1.5, background: '#F9FAFB', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB' }}>{sol.justificacion}</p>
                        </div>

                        {/* Archivos */}
                        {archivos.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>Archivos adjuntos ({archivos.length}):</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {archivos.map((a: any, i: number) => (
                                <a key={i} href={a.url?.startsWith('/uploads') ? `http://localhost:5000${a.url}` : a.url} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.68rem', fontWeight: 600, color: '#DC2626', textDecoration: 'none' }}>
                                  <FileText style={{ width: 12, height: 12 }} /> {a.nombre || `Archivo ${i + 1}`}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Resolución anterior */}
                        {sol.estado !== 'pendiente' && sol.resolucionMotivo && (
                          <div style={{ padding: '8px 12px', borderRadius: 8, background: sol.estado === 'aprobado' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${sol.estado === 'aprobado' ? '#BBF7D0' : '#FECACA'}`, marginBottom: 10 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: sol.estado === 'aprobado' ? '#065F46' : '#991B1B' }}>
                              {sol.estado === 'aprobado' ? 'Aprobada' : 'Denegada'} por {sol.resueltoPor} — {sol.resolucionFecha ? new Date(sol.resolucionFecha).toLocaleDateString('es-CO') : ''}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#4B5563', margin: '4px 0 0' }}>{sol.resolucionMotivo}</p>
                          </div>
                        )}

                        {/* Formulario de resolución (solo pendientes) */}
                        {isPendiente && (
                          <div style={{ padding: '14px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', marginTop: 10 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', marginBottom: 10 }}>Resolver solicitud</div>

                            {/* Si es caso 3, elegir acción */}
                            {sol.caso === 'caso_3' && (
                              <div style={{ marginBottom: 10 }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Accion a aplicar *</label>
                                <select value={form.accion || ''} onChange={e => updateForm(sol.id, 'accion', e.target.value)}
                                  style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.78rem', outline: 'none' }}>
                                  <option value="">Seleccionar...</option>
                                  <option value="caso_1">Permitir PTA en otra territorial</option>
                                  <option value="caso_2">Eliminar PTA actual y crear nuevo</option>
                                </select>
                              </div>
                            )}

                            {/* Caso 1: territorial + horas */}
                            {(sol.caso === 'caso_1' || form.accion === 'caso_1') && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Territorial nueva *</label>
                                  <select value={form.territorial || ''} onChange={e => updateForm(sol.id, 'territorial', e.target.value)}
                                    style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.72rem', outline: 'none' }}>
                                    <option value="">Seleccionar...</option>
                                    {territoriales.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Horas PTA original</label>
                                  <input type="number" value={form.horasOrig || ''} onChange={e => updateForm(sol.id, 'horasOrig', Number(e.target.value))}
                                    placeholder="ej. 400" style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 3 }}>Horas PTA nuevo</label>
                                  <input type="number" value={form.horasNuevo || ''} onChange={e => updateForm(sol.id, 'horasNuevo', Number(e.target.value))}
                                    placeholder="ej. 400" style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.72rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                              </div>
                            )}

                            {/* Motivo (requerido para denegación, opcional para aprobación) */}
                            <div style={{ marginBottom: 10 }}>
                              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Motivo / Comentario</label>
                              <textarea value={form.motivo || ''} onChange={e => updateForm(sol.id, 'motivo', e.target.value)}
                                rows={2} placeholder="Justificacion de la resolucion..."
                                style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.75rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                            </div>

                            {/* Botones */}
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => handleResolver(sol.id, 'aprobado')} disabled={procesando === sol.id}
                                style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: procesando === sol.id ? 0.6 : 1 }}>
                                <CheckCircle style={{ width: 14, height: 14 }} /> Aprobar
                              </button>
                              <button onClick={() => handleResolver(sol.id, 'denegado')} disabled={procesando === sol.id || !(form.motivo?.trim())}
                                style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', background: !(form.motivo?.trim()) ? '#D1D5DB' : '#DC2626', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: !(form.motivo?.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: procesando === sol.id ? 0.6 : 1 }}>
                                <XCircle style={{ width: 14, height: 14 }} /> Denegar
                              </button>
                            </div>
                            {!(form.motivo?.trim()) && (
                              <p style={{ fontSize: '0.62rem', color: '#9CA3AF', margin: '6px 0 0', textAlign: 'center' }}>Para denegar es obligatorio escribir un motivo</p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ Seguimiento de Documentos — Vista Admin ═════════════════════════

const COMPONENTES_SEG = [
  { key: 'docencia', label: 'Docencia', color: '#003DA5' },
  { key: 'investigacion', label: 'Investigación', color: '#7C3AED' },
  { key: 'extension', label: 'Extensión', color: '#059669' },
  { key: 'complementarias', label: 'Complementarias', color: '#D97706' },
  { key: 'acad_admin', label: 'Acad. Admin.', color: '#DC2626' },
] as const;

// Estados en los que un docente puede subir documentos de soporte (ver PortalDocentePTA:
// la sección "Documentos y Soportes" solo aparece en PTAs aprobados / en firme / en ejecución).
// Cualquier otro estado (Borrador, Pendiente_*, En_Concertación, etc.) nunca tendrá evidencias,
// por lo que no debe listarse en el Seguimiento de Documentos.
const ESTADOS_CON_DOCUMENTOS_KEYS = new Set([
  'APROBADO',
  'APROBADO_DEF',
  'EN_FIRME',
  'RADICADO',
  'EN_EJECUCION',
]);

function SeguimientoDocumentosAdmin({ aprobadorNombre, rolLabel }: { aprobadorNombre: string; rolLabel: string }) {
  const [ptasData, setPtasData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroEstadoRev, setFiltroEstadoRev] = useState('');
  const [selectedPtaId, setSelectedPtaId] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [comentario, setComentario] = useState<Record<string, string>>({});
  const [previewFile, setPreviewFile] = useState<{ url: string; nombre: string; tipo: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await getAllPtasConEvidencias(filtroPeriodo || undefined);
    if (res.success) setPtasData(res.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filtroPeriodo]);

  const periodos = useMemo(() => [...new Set(ptasData.map((p: any) => p.periodo))].sort().reverse(), [ptasData]);

  const revisar = async (ptaId: string, evidenciaId: string, decision: 'aprobado' | 'rechazado') => {
    setProcesando(evidenciaId);
    const res = await revisarEvidenciaPTA(ptaId, evidenciaId, { decision, revisado_por: aprobadorNombre, comentario: comentario[evidenciaId] || '' });
    if (res.success) {
      toast.success(decision === 'aprobado' ? 'Documento aprobado' : 'Documento rechazado');
      load();
    } else { toast.error('Error al procesar'); }
    setProcesando(null);
  };

  // Solo aplican al Seguimiento las PTAs que pueden tener documentos: aprobadas / en firme /
  // en ejecución, o las que ya tengan al menos una evidencia cargada (defensivo ante estados
  // con etiquetas inconsistentes). Así evitamos filas de Borrador/Pendiente que se despliegan vacías.
  const aplicaSeguimiento = (p: any) =>
    (p.evidencias || []).length > 0 || ESTADOS_CON_DOCUMENTOS_KEYS.has(normalizeEstadoKey(p.estado));

  const filteredPtas = ptasData.filter((p: any) => {
    if (!aplicaSeguimiento(p)) return false;
    if (!filtroEstadoRev) return true;
    return (p.evidencias || []).some((e: any) => (e.estado_revision || 'pendiente') === filtroEstadoRev);
  });

  const totalPendientes = ptasData.reduce((acc: number, p: any) => acc + (p.evidencias || []).filter((e: any) => !e.estado_revision || e.estado_revision === 'pendiente').length, 0);

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>Seguimiento de Documentos</h2>
          <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '2px 0 0' }}>Documentos de soporte subidos por docentes en PTAs aprobados</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {totalPendientes > 0 && (
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#FEF3C7', color: '#92400E', fontSize: '0.72rem', fontWeight: 700 }}>
              {totalPendientes} pendientes
            </span>
          )}
          <button onClick={load} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Recargar">
            <RefreshCw style={{ width: 13, height: 13, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filtroPeriodo} onChange={e => setFiltroPeriodo(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: '0.78rem', background: 'white', outline: 'none', color: '#374151' }}>
          <option value="">Todos los periodos</option>
          {periodos.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(['', 'pendiente', 'aprobado', 'rechazado'] as const).map(est => (
          <button key={est} onClick={() => setFiltroEstadoRev(est)}
            style={{ padding: '5px 12px', borderRadius: 7, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: filtroEstadoRev === est ? '1.5px solid #003DA5' : '1px solid #E5E7EB', background: filtroEstadoRev === est ? '#EFF6FF' : 'white', color: filtroEstadoRev === est ? '#003DA5' : '#6B7280' }}>
            {est === '' ? 'Todos' : est === 'pendiente' ? 'Pendientes' : est === 'aprobado' ? 'Aprobados' : 'Rechazados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#9CA3AF' }}>Cargando...</div>
      ) : filteredPtas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#F9FAFB', borderRadius: 14 }}>
          <FolderOpen style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem', color: '#9CA3AF', margin: 0 }}>Sin documentos para revisar</p>
          <p style={{ fontSize: '0.75rem', color: '#D1D5DB', margin: '4px 0 0' }}>Los docentes aún no han subido soportes a sus PTAs aprobados</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredPtas.map((pta: any) => {
            const evsPendientes = (pta.evidencias || []).filter((e: any) => !e.estado_revision || e.estado_revision === 'pendiente');
            const isOpen = selectedPtaId === pta.pta_id;
            return (
              <div key={pta.pta_id} style={{ background: 'white', borderRadius: 12, border: `1px solid ${evsPendientes.length > 0 ? '#FDE68A' : '#E5E7EB'}`, overflow: 'hidden' }}>
                {/* PTA header */}
                <div
                  onClick={() => setSelectedPtaId(isOpen ? null : pta.pta_id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', background: isOpen ? '#FAFAFA' : 'white', borderBottom: isOpen ? '1px solid #E5E7EB' : 'none' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{pta.docente_nombre}</div>
                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF', display: 'flex', gap: 8, marginTop: 2 }}>
                      <span>{pta.periodo}</span>
                      <span>·</span>
                      <span>{pta.dedicacion}</span>
                      <span>·</span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>{pta.estado}</span>
                    </div>
                  </div>
                  {/* Progress pills per component */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {COMPONENTES_SEG.map(comp => {
                      const horasTotal: number = (pta as any)[`horas_${comp.key}`] || 0;
                      if (horasTotal === 0) return null;
                      const aprobadas = (pta.evidencias || [])
                        .filter((e: any) => e.componente_pta === comp.key && e.estado_revision === 'aprobado')
                        .reduce((s: number, e: any) => s + (Number(e.horas_avance) || 0), 0);
                      const pct = Math.min(Math.round((aprobadas / horasTotal) * 100), 100);
                      return (
                        <div key={comp.key} title={`${comp.label}: ${aprobadas}h / ${horasTotal}h`}
                          style={{ padding: '2px 8px', borderRadius: 5, fontSize: '0.6rem', fontWeight: 700, background: `${comp.color}15`, color: comp.color }}>
                          {comp.label.substring(0, 3)}. {pct}%
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {evsPendientes.length > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#FEF3C7', color: '#92400E', fontSize: '0.62rem', fontWeight: 700 }}>
                        {evsPendientes.length} pendiente{evsPendientes.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown style={{ width: 16, height: 16, color: '#9CA3AF', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>

                {/* Evidencias expandidas */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(pta.evidencias || []).length === 0 && (
                          <div style={{ textAlign: 'center', padding: '18px 12px', background: '#F9FAFB', borderRadius: 10, border: '1px dashed #E5E7EB' }}>
                            <FolderOpen style={{ width: 26, height: 26, color: '#D1D5DB', margin: '0 auto 6px' }} />
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0, fontWeight: 600 }}>Sin documentos de soporte</p>
                            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '2px 0 0' }}>El docente aún no ha subido evidencias para esta PTA</p>
                          </div>
                        )}
                        {(pta.evidencias || []).map((ev: any) => {
                          const comp = COMPONENTES_SEG.find(c => c.key === ev.componente_pta);
                          const estadoRev = ev.estado_revision || 'pendiente';
                          const isPendiente = estadoRev === 'pendiente';
                          return (
                            <div key={ev.id} style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px', border: `1px solid ${estadoRev === 'aprobado' ? '#6EE7B7' : estadoRev === 'rechazado' ? '#FCA5A5' : '#E5E7EB'}` }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <FileText style={{ width: 16, height: 16, color: '#6B7280', flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.nombre}</div>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                    {comp && <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: `${comp.color}15`, color: comp.color }}>{comp.label}</span>}
                                    {ev.horas_avance > 0 && <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: '#EFF6FF', color: '#1E40AF' }}>{ev.horas_avance}h</span>}
                                    <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: estadoRev === 'aprobado' ? '#D1FAE5' : estadoRev === 'rechazado' ? '#FEE2E2' : '#FEF3C7', color: estadoRev === 'aprobado' ? '#065F46' : estadoRev === 'rechazado' ? '#991B1B' : '#92400E' }}>
                                      {estadoRev === 'aprobado' ? '✓ Aprobado' : estadoRev === 'rechazado' ? '✗ Rechazado' : '⏳ Pendiente'}
                                    </span>
                                    <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>{new Date(ev.fecha_subida).toLocaleDateString('es-CO')}</span>
                                  </div>
                                  {ev.descripcion && (
                                    <div style={{ marginTop: 4, fontSize: '0.65rem', color: '#64748B', fontStyle: 'italic' }}>
                                      <strong>Docente:</strong> {ev.descripcion}
                                    </div>
                                  )}
                                  {ev.comentario_revision && (
                                    <div style={{ marginTop: 4, fontSize: '0.65rem', color: '#6B7280', fontStyle: 'italic' }}>
                                      <strong>Revisión</strong> ({ev.revisado_por}): {ev.comentario_revision}
                                    </div>
                                  )}
                                  {/* Botones Ver / Descargar */}
                                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                    {(() => {
                                      const ext = (ev.tipo_archivo || ev.nombre?.split('.').pop() || '').toLowerCase();
                                      const hasRealFile = !!(ev.storage_url && ev.storage_url.startsWith('/uploads'));
                                      const canPreview = hasRealFile && ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                      const rawUrl = ev.storage_url || ev.storage_path || '';
                                      // Resolver URL: /uploads/xxx → backend absoluto
                                      const backendOrigin = (window as any).__API_ORIGIN__ || 'http://localhost:5000';
                                      const fileUrl = rawUrl.startsWith('/uploads') ? `${backendOrigin}${rawUrl}` : rawUrl.startsWith('http') ? rawUrl : rawUrl ? `${backendOrigin}/${rawUrl}` : '#';
                                      return (
                                        <>
                                          {canPreview && (
                                            <button
                                              onClick={(e2) => { e2.stopPropagation(); setPreviewFile({ url: fileUrl, nombre: ev.nombre, tipo: ext }); }}
                                              style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1E40AF', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                              <Eye style={{ width: 11, height: 11 }} /> Ver
                                            </button>
                                          )}
                                          <a
                                            href={fileUrl}
                                            download={ev.nombre}
                                            onClick={e2 => e2.stopPropagation()}
                                            style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                                          >
                                            <Download style={{ width: 11, height: 11 }} /> Descargar
                                          </a>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                              {/* Acciones de revisión */}
                              {isPendiente && (
                                <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                                  <input
                                    value={comentario[ev.id] || ''}
                                    onChange={e2 => setComentario(prev => ({ ...prev, [ev.id]: e2.target.value }))}
                                    placeholder="Comentario (opcional)..."
                                    style={{ flex: 1, padding: '5px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.72rem', outline: 'none' }}
                                  />
                                  <button
                                    onClick={() => revisar(pta.pta_id, ev.id, 'aprobado')}
                                    disabled={procesando === ev.id}
                                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#059669', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: procesando === ev.id ? 0.6 : 1 }}
                                  >
                                    <CheckCircle style={{ width: 12, height: 12 }} /> Aprobar
                                  </button>
                                  <button
                                    onClick={() => revisar(pta.pta_id, ev.id, 'rechazado')}
                                    disabled={procesando === ev.id}
                                    style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#DC2626', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: procesando === ev.id ? 0.6 : 1 }}
                                  >
                                    <XCircle style={{ width: 12, height: 12 }} /> Rechazar
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de previsualización de archivo */}
      {previewFile && createPortal(
        <div
          onClick={() => setPreviewFile(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText style={{ width: 18, height: 18, color: '#003DA5' }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{previewFile.nombre}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewFile.url} download={previewFile.nombre} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                  <Download style={{ width: 14, height: 14 }} /> Descargar
                </a>
                <button onClick={() => setPreviewFile(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 16, height: 16, color: '#6B7280' }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.tipo) ? (
                <img src={previewFile.url} alt={previewFile.nombre} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} />
              ) : previewFile.tipo === 'pdf' ? (
                <iframe src={previewFile.url} title={previewFile.nombre} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                  <FileText style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#D1D5DB' }} />
                  <p style={{ fontSize: '0.85rem' }}>Este tipo de archivo no se puede previsualizar</p>
                  <a href={previewFile.url} download={previewFile.nombre} style={{ color: '#003DA5', fontWeight: 600, fontSize: '0.85rem' }}>Descargar archivo</a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function PtaBackofficeModule({ initialView }: { initialView?: string } = {}) {
  return (
    <PermisosPTAProvider>
      <PtaBackofficeModuleInner initialView={initialView} />
    </PermisosPTAProvider>
  );
}

type ModuleView = 'gestion' | 'seguimiento_docs' | 'configuracion' | 'banco_docentes' | 'programacion' | 'concertacion' | 'tablero' | 'reporte' | 'seguimiento' | 'directivo' | 'territorial' | 'comparativo' | 'sna' | 'validador' | 'test_e2e' | 'mapa_territorial' | 'alertas' | 'indicadores' | 'acta_concertacion' | 'simulador_carga' | 'benchmarking' | 'exportador_actas' | 'comite_evaluacion' | 'calendario_academico' | 'asignador_automatico' | 'kanban' | 'metricas_sla' | 'generador_resoluciones' | 'gestion_conflictos' | 'preferencias_notificaciones' | 'workflow_visualizer' | 'verificacion_qr' | 'programacion_institucional' | 'centro_reportes' | 'cronograma' | 'mapeo_sincronizacion' | 'salud_sistema' | 'reconciliacion_masiva' | 'tablero_unificado' | 'solicitudes_pta';

function normalizeEstadoKey(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

const ESTADOS_PENDIENTES_APROBACION_KEYS = new Set([
  'PENDIENTE_JEFATURA',
  'PENDIENTE_DECANATURA',
  'PENDIENTE_GESTION_PROFESORAL',
  'PENDIENTE_APROBACION',
]);

const ESTADOS_BORRADOR_KEYS = new Set(['BORRADOR']);
const ESTADOS_APROBACION_KEYS = new Set([
  ...ESTADOS_PENDIENTES_APROBACION_KEYS,
  'CONCERTADO',
]);
const ESTADOS_CONCERTACION_KEYS = new Set([
  'EN_CONCERTACION',
  'OBJETADO_DOCENTE',
  'MODIFICADO_DOCENTE',
  'DEVUELTO',
  'PROPUESTO_POR_DIRECCION',
  'NOTIFICADO_DOCENTE',
]);
const ESTADOS_SNA_KEYS = new Set(['ESCALADO_SNA']);
const ESTADOS_SEGUIMIENTO_KEYS = new Set(['EN_FIRME', 'RADICADO', 'EN_EJECUCION']);
const FRONTEND_GROUPED_ESTADO_FILTERS = new Set([
  'BORRADOR',
  'BORRADORES',
  'PENDIENTES',
  'APROBACION',
  'CONCERTACION',
  'SNA',
  'APROBADO',
  'APROBADOS',
  'SEGUIMIENTO',
]);

function getBackendEstadoFilter(filtroEstado?: string) {
  if (!filtroEstado) return undefined;
  return FRONTEND_GROUPED_ESTADO_FILTERS.has(normalizeEstadoKey(filtroEstado))
    ? undefined
    : filtroEstado;
}

function matchesEstadoWorkflowFilter(pta: any, filtroEstado?: string) {
  const filterKey = normalizeEstadoKey(filtroEstado);
  if (!filterKey) return true;

  const estadoKey = normalizeEstadoKey(pta?.estado);
  if (filterKey === 'BORRADOR' || filterKey === 'BORRADORES') return ESTADOS_BORRADOR_KEYS.has(estadoKey);
  if (filterKey === 'PENDIENTES' || filterKey === 'APROBACION') return ESTADOS_APROBACION_KEYS.has(estadoKey);
  if (filterKey === 'CONCERTACION') return ESTADOS_CONCERTACION_KEYS.has(estadoKey);
  if (filterKey === 'SNA') return ESTADOS_SNA_KEYS.has(estadoKey);
  if (filterKey === 'APROBADO' || filterKey === 'APROBADOS') return estadoKey === 'APROBADO';
  if (filterKey === 'SEGUIMIENTO') {
    return ESTADOS_SEGUIMIENTO_KEYS.has(estadoKey) || (pta?.dias_en_proceso > 7 && estadoKey === 'APROBADO');
  }

  return estadoKey === filterKey;
}

function isEstadoPendienteAprobacion(estado?: string) {
  return ESTADOS_PENDIENTES_APROBACION_KEYS.has(normalizeEstadoKey(estado));
}

// ═══ Level Validation: Mapea estado PTA → nivel requerido para aprobar ═══
const ESTADO_NIVEL_MAP: Record<string, number> = {
  'PENDIENTE_APROBACION': 1,
  'Pendiente Jefatura': 1,
  'Pendiente Decanatura': 2,
  'Pendiente Gestión Profesoral': 3,
};

const ESTADO_NIVEL_KEY_MAP: Record<string, number> = {
  PENDIENTE_APROBACION: 1,
  PENDIENTE_JEFATURA: 1,
  PENDIENTE_DECANATURA: 2,
  PENDIENTE_GESTION_PROFESORAL: 3,
};

function getNivelRequeridoAprobacion(estadoPTA?: string) {
  return ESTADO_NIVEL_KEY_MAP[normalizeEstadoKey(estadoPTA)] || ESTADO_NIVEL_MAP[estadoPTA || ''] || 0;
}

function puedeAprobarPorNivel(estadoPTA: string, nivelUsuario: number, isSuperUser = false): boolean {
  if (isSuperUser) return true;
  if (isEstadoPendienteAprobacion(estadoPTA)) return nivelUsuario > 0;
  const nivelRequerido = getNivelRequeridoAprobacion(estadoPTA);
  if (!nivelRequerido) return false;
  return nivelUsuario === nivelRequerido;
}

// ═══ Aging Helper: days since last update ═══
function calcAging(historialEstados?: any[], updatedAt?: string, createdAt?: string): { days: number; label: string; color: string; bg: string } {
  let refStr = updatedAt || createdAt;
  if (historialEstados && historialEstados.length > 0) {
    refStr = historialEstados[0].createdAt;
  }
  const ref = refStr;
  if (!ref) return { days: 0, label: 'Hoy', color: '#059669', bg: '#D1FAE5' };
  const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
  if (days <= 2) return { days, label: days === 0 ? 'Hoy' : `${days}d`, color: '#059669', bg: '#D1FAE5' };
  if (days <= 5) return { days, label: `${days}d`, color: '#D97706', bg: '#FEF3C7' };
  if (days <= 10) return { days, label: `${days}d`, color: '#EA580C', bg: '#FFF7ED' };
  return { days, label: `${days}d`, color: '#DC2626', bg: '#FEE2E2' };
}

// ═══ Stat card → estado filter map ═══
const STAT_CARD_FILTER_MAP: Record<string, string> = {
  'Total PTAs': '',
  'Pendientes': 'pendientes',
  'Aprobados': 'Aprobado',
  'En Concertación': 'EN_CONCERTACION',
  'Rechazados': 'Rechazado',
  'Avance': '',
};

/** NavDropdownPortal — renders nav dropdown via portal to escape overflow clipping */
function NavDropdownPortal({ id, label, icon: Icon, isActive, isOpen, onToggle, onClose, items, moduleView, onSelect }: {
  id: string; label: string; icon: any; isActive: boolean; isOpen: boolean;
  onToggle: () => void; onClose: () => void; items: any[]; moduleView: string;
  onSelect: (key: string) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [isOpen]);

  return (
    <div>
      <button
        ref={btnRef}
        onClick={onToggle}
        className={`pta-nav-tab ${isActive ? 'active' : ''}`}
      >
        <Icon style={{ width: 16, height: 16 }} />
        {label}
        <ChevronDown style={{ width: 14, height: 14, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {isOpen && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={onClose} />
          <div style={{
            position: 'fixed', top: pos.top, left: pos.left,
            background: 'var(--pta-surface)', borderRadius: 12, border: '1px solid var(--pta-border)',
            boxShadow: 'var(--shadow-lg)', zIndex: 9999,
            minWidth: 220, overflow: 'hidden',
          }}>
            {items.map((item: any) => (
              <button
                key={item.key}
                onClick={() => onSelect(item.key)}
                style={{
                  width: '100%', padding: '10px 14px', border: 'none',
                  background: moduleView === item.key ? 'var(--pta-primary-ultra)' : 'transparent',
                  color: moduleView === item.key ? 'var(--pta-primary)' : 'var(--pta-text-primary)',
                  fontSize: '0.875rem', fontWeight: moduleView === item.key ? 600 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (moduleView !== item.key) e.currentTarget.style.background = 'var(--pta-surface-hover)'; }}
                onMouseLeave={e => { if (moduleView !== item.key) e.currentTarget.style.background = 'transparent'; }}
              >
                <item.icon style={{ width: 16, height: 16 }} />
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function PtaBackofficeModuleInner({ initialView }: { initialView?: string } = {}) {
  const { permisos, tieneVista, rolLabel, isSimulando, perfil, rolColor, rolBg } = usePermisosPTA();
  const auth = useAuth();
  const isSuperUserEffective = auth.isSuperUser || perfil.rol === 'admin';
  const visibleComponentKeys = useMemo<PTAComponentKey[]>(() => {
    if (isSuperUserEffective) return [...PTA_COMPONENT_KEYS];
    return (permisos.componentesAprobables || [])
      .filter((key): key is PTAComponentKey => PTA_COMPONENT_KEYS.includes(key as PTAComponentKey));
  }, [isSuperUserEffective, permisos.componentesAprobables]);
  const shouldRestrictByComponentPermission = !isSuperUserEffective && visibleComponentKeys.length > 0;
  const visibleComponentKeySet = useMemo(() => new Set<string>(visibleComponentKeys), [visibleComponentKeys]);
  const { addNotification } = useNotifications();
  const [ptas, setPtas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ═══ Banco de Docentes: personas desde módulo Personas (fuente única de verdad) ═══
  const [allPersonas, setAllPersonas] = useState<any[]>([]);
  const loadPersonas = useCallback(async () => {
    try {
      const result = await supabaseService.personas.getAll();
      if (result.success) setAllPersonas(result.data || []);
    } catch (err) {
      console.warn('[PTA] Error cargando personas para Banco Docentes:', err);
    }
  }, []);

  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroPrograma, setFiltroPrograma] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Periodo Académico (Selector Global) ───
  const [periodosPTA, setPeriodosPTA] = useState<any[]>([]);
  const [periodoSeleccionadoPTA, setPeriodoSeleccionadoPTA] = useState<string>('');
  const [showPeriodoDropdownPTA, setShowPeriodoDropdownPTA] = useState(false);

  useEffect(() => {
    const cargarPeriodos = async () => {
      try {
        const res = await apiClient.get<any[]>('/pta/api/v1/periodos-academicos');
        const data = Array.isArray(res) ? res : [];
        setPeriodosPTA(data);
        const activo = data.find((p: any) => p.estado === 'en_curso');
        if (activo) {
          const codigo = activo.codigo || `${activo.anio}-${activo.semestre}`;
          setPeriodoSeleccionadoPTA(codigo);
          setFiltroPeriodo(codigo);
        }
      } catch { setPeriodoSeleccionadoPTA('2025-2'); }
    };
    cargarPeriodos();
  }, []);

  const periodoActivoPTA = periodosPTA.find((p: any) => p.estado === 'en_curso');
  const periodoActivoCodigoPTA = periodoActivoPTA?.codigo || periodoActivoPTA?.periodo || '2025-2';
  const esPeriodoActivoPTA = !periodoSeleccionadoPTA || periodoSeleccionadoPTA === periodoActivoCodigoPTA;
  const [programas, setProgramas] = useState<any[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [selectedPTA, setSelectedPTA] = useState<any>(null);
  const [showApproval, setShowApproval] = useState(false);
  const [showDevolucion, setShowDevolucion] = useState(false);
  const [approvalObs, setApprovalObs] = useState('');
  const [devolucionMotivo, setDevolucionMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const initialModuleView = useMemo<ModuleView>(() => (initialView as ModuleView) || 'gestion', [initialView]);
  const [moduleView, setModuleView] = useState<ModuleView>(initialModuleView);
  const [concertacionPtaId, setConcertacionPtaId] = useState<string | null>(null);
  const [showFirmaDigital, setShowFirmaDigital] = useState(false);
  const [showReporteR01, setShowReporteR01] = useState(false);

  // ── Listener: abrir detalle de PTA desde una notificación (bandeja/correo) ──
  // El backend (`pta-notifications.service.ts`) emite notificaciones con
  // url_accion='/pta?ptaId=<id>'. NotificationsPanelV2 despacha el evento
  // 'pta:open-detalle' con {ptaId, componente} en vez de recargar la página.
  // Si el módulo aún no estaba montado, se guarda en sessionStorage como respaldo
  // (mismo patrón que Gestión Legal / Control Interno).
  useEffect(() => {
    const abrirDetallePorId = async (ptaId: string) => {
      if (!ptaId) return;
      setModuleView('gestion');
      const res = await getPTAById(ptaId);
      if (res.success && res.data) setSelectedPTA(res.data);
    };

    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.ptaId) abrirDetallePorId(detail.ptaId);
    };

    window.addEventListener('pta:open-detalle', handleOpen);

    const pending = sessionStorage.getItem('pta:pendingOpenDetalle');
    if (pending) {
      sessionStorage.removeItem('pta:pendingOpenDetalle');
      try {
        const detail = JSON.parse(pending);
        if (detail?.ptaId) abrirDetallePorId(detail.ptaId);
      } catch {
        /* ignore */
      }
    }

    return () => window.removeEventListener('pta:open-detalle', handleOpen);
  }, []);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('docente_nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>(() => {
    // Default to kanban on mobile for better UX
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'kanban';
    return 'table';
  });
  const [showBatchApproval, setShowBatchApproval] = useState(false);
  const [batchObs, setBatchObs] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const PAGE_SIZE = pageSize;

  // ═══ Feature 12: Saved Filter Presets ═══
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<Array<{ name: string; estado: string; periodo: string; programa: string; search: string }>>([
    { name: 'Pendientes TC 2026-1', estado: 'pendientes', periodo: '2025-2', programa: '', search: 'TC' },
    { name: 'Aprobados este periodo', estado: 'Aprobado', periodo: '2025-2', programa: '', search: '' },
    { name: 'En concertación', estado: 'EN_CONCERTACION', periodo: '2025-2', programa: '', search: '' },
  ]);


  // ═══ Feature 14: Keyboard Navigation ═══
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // ═══ Feature 16: Batch Devolucion ═══
  const [showBatchDevolucion, setShowBatchDevolucion] = useState(false);
  const [batchDevMotivo, setBatchDevMotivo] = useState('');

  // ═══ Feature 17: Shift+Click Range Selection ═══
  const lastClickedIdx = useRef<number>(-1);

  // ═══ Feature 18: Sticky Header ref ═══
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // ═══ Feature 19: Column Visibility Toggle ═══
  const ALL_COLUMNS = [
    { key: 'docente', label: 'Docente', default: true },
    { key: 'estado', label: 'Estado', default: true },
    { key: 'aging', label: 'Días', default: true },
    { key: 'fecha', label: 'Fecha', default: true },
    { key: 'hora', label: 'Hora', default: true },
    { key: 'dedicacion', label: 'Dedicación', default: true },
    { key: 'carga', label: 'Carga', default: true },
    { key: 'componentes', label: 'Componentes', default: true },
    { key: 'territorial', label: 'Territorial', default: false },
    { key: 'periodo', label: 'Periodo', default: false },
  ] as const;
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const [showColConfig, setShowColConfig] = useState(false);

  // ═══ World Class Responsive Window State ═══
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const effectiveCols = useMemo(() => {
    let result = new Set(visibleCols);
    if (windowWidth < 768) { // Mobile
      result = new Set(['docente', 'estado']); // 'acciones' will be added automatically later
    } else if (windowWidth < 1024) { // Tablet Portait
      result.delete('componentes');
      result.delete('carga');
      result.delete('periodo');
      result.delete('territorial');
    } else if (windowWidth < 1280) { // Small Laptop / Tablet Landscape
      result.delete('componentes');
      result.delete('fecha');
      result.delete('hora');
      result.delete('periodo');
    }
    return result;
  }, [visibleCols, windowWidth]);

  // ═══ Feature 20: Activity Timeline Feed ═══
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [activityLog, setActivityLog] = useState<Array<{
    id: string; type: 'aprobacion' | 'devolucion' | 'rechazo' | 'portal' | 'sistema';
    docente: string; estado: string; by: string; at: string; message: string;
  }>>([]);

  // ═══ Feature 21: Inline Status Quick-Change ═══
  const [inlineStatusPtaId, setInlineStatusPtaId] = useState<string | null>(null);
  const [showMoreMenuPtaId, setShowMoreMenuPtaId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number, right: number }>({ top: 0, right: 0 });

  // ═══ Feature 22: Row Grouping ═══
  const [groupBy, setGroupBy] = useState<'' | 'estado' | 'territorial' | 'dedicacion'>('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ═══ Feature 23: Pinned/Starred PTAs ═══
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  // ═══ Feature 24: Quick Inline Notes ═══
  const [inlineNotePtaId, setInlineNotePtaId] = useState<string | null>(null);
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({});
  const [inlineNoteText, setInlineNoteText] = useState('');

  // ═══ Feature 25: Comparison Mode ═══
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // ═══ Feature 26: Data Freshness Indicator ═══
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshCountdown, setRefreshCountdown] = useState(120); // seconds

  // ═══ Feature 27: Command Palette (Cmd+K) ═══
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const commandInputRef = useRef<HTMLInputElement>(null);

  // ═══ Feature 28: Row Inline Expand (Accordion) ═══
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // ═══ Feature 29: Custom Tags/Labels ═══
  const [ptaTags, setPtaTags] = useState<Record<string, Array<{ label: string; color: string }>>>({});
  const [showTagPicker, setShowTagPicker] = useState<string | null>(null);
  const [newTagLabel, setNewTagLabel] = useState('');
  const TAG_COLORS = ['#003DA5', '#059669', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#DB2777', '#4F46E5'];

  // ═══ Feature 30: Bulk Notification Sender ═══
  const [showBulkNotify, setShowBulkNotify] = useState(false);
  const [bulkNotifyMsg, setBulkNotifyMsg] = useState('');
  const [bulkNotifyType, setBulkNotifyType] = useState<'info' | 'warning' | 'urgent'>('info');

  // ═══ Feature 31: Dashboard Mini Sparklines ═══
  const [sparklineData] = useState<Record<string, number[]>>({
    'Total PTAs': [12, 15, 18, 22, 20, 25, 28],
    'Pendientes': [8, 10, 7, 9, 6, 5, 4],
    'Aprobados': [3, 5, 8, 10, 12, 16, 20],
    'En Concertación': [1, 2, 3, 2, 4, 3, 2],
    'Rechazados': [0, 1, 0, 1, 2, 1, 1],
    'Avance': [20, 30, 40, 50, 55, 65, 72],
  });

  // ═══ Feature 32: Tag Filter ═══
  const [filtroTags, setFiltroTags] = useState<string[]>([]);
  const [showTagFilter, setShowTagFilter] = useState(false);

  // ═══ Feature 33: Drag & Drop Priority Reorder ═══
  const [priorityOrder, setPriorityOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // ═══ Mobile: Filter bar collapse ═══
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // ═══ Feature 32: Persistence loading flag ═══
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const persistDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ═══ Feature 34: Traza del Proceso (Historial) ═══
  const [trazaPta, setTrazaPta] = useState<any | null>(null);

  // ═══ Datos del usuario autenticado para acciones ═══
  const aprobadorId = auth.userPersonId || auth.userEmail || 'backoffice-user';
  const aprobadorNombre = auth.userName || 'Usuario Backoffice';

  // ═══ Feature 20: Push to activity log helper ═══
  const pushActivity = useCallback((type: 'aprobacion' | 'devolucion' | 'rechazo' | 'portal' | 'sistema', docente: string, estado: string, message: string) => {
    setActivityLog(prev => [{
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type, docente, estado, by: aprobadorNombre, at: new Date().toISOString(), message,
    }, ...prev].slice(0, 50));
  }, [aprobadorNombre]);

  // ═══ Feature 26: Auto-refresh countdown ═══
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          loadData();
          setLastRefreshed(new Date());
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [filtroEstado, filtroPeriodo, filtroPrograma]);

  // ═══ Feature 23: Pin/unpin handler ═══
  const togglePin = useCallback((ptaId: string) => {
    setPinnedIds(prev => {
      const next = new Set(prev);
      if (next.has(ptaId)) { next.delete(ptaId); toast('PTA desanclado'); }
      else { next.add(ptaId); toast.success('PTA anclado al inicio'); }
      return next;
    });
  }, []);

  // ═══ Feature 24: Save inline note ═══
  const saveInlineNote = useCallback((ptaId: string, note: string) => {
    setInlineNotes(prev => ({ ...prev, [ptaId]: note }));
    setInlineNotePtaId(null);
    setInlineNoteText('');
    if (note.trim()) toast.success('Nota guardada');
    else toast('Nota eliminada');
  }, []);

  // ═══ Feature 29: Tag management ═══
  const addTag = useCallback((ptaId: string, label: string, color: string) => {
    setPtaTags(prev => {
      const existing = prev[ptaId] || [];
      if (existing.some(t => t.label === label)) return prev;
      return { ...prev, [ptaId]: [...existing, { label, color }] };
    });
    setShowTagPicker(null);
    setNewTagLabel('');
    toast.success(`Etiqueta "${label}" agregada`);
  }, []);

  const removeTag = useCallback((ptaId: string, label: string) => {
    setPtaTags(prev => ({
      ...prev,
      [ptaId]: (prev[ptaId] || []).filter(t => t.label !== label),
    }));
    toast('Etiqueta eliminada');
  }, []);

  // ═══ Feature 25: Toggle compare ═══
  const toggleCompare = useCallback((ptaId: string) => {
    setCompareIds(prev => {
      if (prev.includes(ptaId)) return prev.filter(id => id !== ptaId);
      if (prev.length >= 2) { toast.error('Máximo 2 PTAs para comparar'); return prev; }
      return [...prev, ptaId];
    });
  }, []);

  // ═══ Feature 17: Shift+Click range handler ═══
  const handleRowSelect = useCallback((ptaId: string, idx: number, shiftKey: boolean, paginated: any[]) => {
    if (shiftKey && lastClickedIdx.current >= 0) {
      const start = Math.min(lastClickedIdx.current, idx);
      const end = Math.max(lastClickedIdx.current, idx);
      const next = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        const p = paginated[i];
        if (p && isEstadoPendienteAprobacion(p.estado)
            && puedeAprobarPorNivel(p.estado, permisos.nivelAprobacion, isSuperUserEffective)) {
          next.add(p.id);
        }
      }
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      if (next.has(ptaId)) next.delete(ptaId); else next.add(ptaId);
      setSelectedIds(next);
    }
    lastClickedIdx.current = idx;
  }, [selectedIds, permisos.nivelAprobacion, isSuperUserEffective]);

  // ═══ Feature 21: Inline status quick change handler ═══
  const handleInlineStatusChange = useCallback(async (ptaId: string, nuevoEstado: string) => {
    setInlineStatusPtaId(null);
    const pta = ptas.find((p: any) => p.id === ptaId);
    const esAprobacion = isEstadoPendienteAprobacion(pta?.estado);

    // Aprobación de G.Profesoral → mostrar firma digital primero
    if (esAprobacion && nuevoEstado !== 'Devuelto' && permisos.nivelAprobacion === 3 && !isSuperUserEffective) {
      setSelectedPTA(pta);
      setShowFirmaDigital(true);
      return;
    }

    setProcesando(true);
    const payload = esAprobacion && nuevoEstado !== 'Devuelto'
      ? {
          accion: 'aprobar' as const,
          observaciones: `Aprobación rápida por ${aprobadorNombre} (${rolLabel})`,
          actorId: aprobadorId,
          actorRol: rolLabel,
          nivelAprobacion: permisos.nivelAprobacion,
          actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
          isSuperUser: isSuperUserEffective,
          aprobarTodas: isSuperUserEffective,
        }
      : nuevoEstado === 'Devuelto'
        ? {
            accion: 'devolver' as const,
            observaciones: `Devolución rápida por ${aprobadorNombre} (${rolLabel})`,
            actorId: aprobadorId,
            actorRol: rolLabel,
            nivelAprobacion: permisos.nivelAprobacion,
            actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
            isSuperUser: isSuperUserEffective,
          }
        : { estado: nuevoEstado, observaciones: `Cambio rápido a ${nuevoEstado} por ${aprobadorNombre} (${rolLabel})`, actorId: aprobadorId, actorRol: rolLabel };
    const res = await updatePTAStatus(ptaId, payload);
    setProcesando(false);
    if (res.success) {
      const estadoFinal = res.nuevoEstado || nuevoEstado;
      toast.success(`Estado actualizado a: ${estadoFinal}`);
      pushActivity('aprobacion', pta?.docente_nombre || 'Docente', estadoFinal, `Cambio rápido → ${estadoFinal}`);
      loadData();
    } else {
      toast.error('Error al actualizar estado');
    }
  }, [ptas, aprobadorId, aprobadorNombre, rolLabel, pushActivity]);

  // Dropdown states for navigation groups
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    setModuleView(initialModuleView);
    setOpenDropdown(null);
    setCurrentPage(1);
  }, [initialModuleView]);

  // ═══ Real-time sync with Portal ═══
  const syncState = usePTARealtimeSync({
    sistema: 'backoffice',
    interval: 10000,
    enabled: true,
    onDataChanged: (events) => {
      // Auto-refresh data when portal makes changes
      console.log(`[Backoffice Sync] ${events.length} nuevos eventos del Portal`);
      loadData();
      events.forEach(evt => {
        const docName = evt.docente_nombre || 'Docente';
        const estadoLabel = evt.estado_nuevo?.replace(/_/g, ' ') || evt.tipo;

        // Differentiated toast by event type
        const isEnvio = ['Pendiente Jefatura', 'ACEPTADO_DOCENTE'].includes(evt.estado_nuevo);
        const isObjecion = ['OBJETADO_DOCENTE', 'MODIFICADO_DOCENTE'].includes(evt.estado_nuevo);
        const isConcertacion = evt.estado_nuevo === 'EN_CONCERTACION' || evt.tipo === 'respuesta_docente';

        if (isEnvio) {
          toast.success(`${docName} envió su PTA`, {
            description: evt.mensaje || `Estado: ${estadoLabel}`,
            duration: 6000,
          });
        } else if (isObjecion) {
          toast.warning(`${docName} — ${estadoLabel}`, {
            description: evt.mensaje || 'El docente ha respondido a la propuesta',
            duration: 6000,
          });
        } else if (isConcertacion) {
          toast(`${docName} — Concertación`, {
            description: evt.mensaje || 'Actividad en mesa de concertación',
            duration: 5000,
          });
        } else {
          toast.info(`Portal: ${docName}`, {
            description: `${evt.mensaje || evt.tipo} → ${estadoLabel}`,
            duration: 5000,
          });
        }

        // Push to activity feed (Feature 20)
        pushActivity('portal', docName, estadoLabel, evt.mensaje || evt.tipo);

        // Push to platform bell
        addNotification({
          title: `PTA ${docName}: ${estadoLabel}`,
          message: evt.mensaje || `Acción desde Portal Docente — ${estadoLabel}`,
          type: isObjecion ? 'warning' : isEnvio ? 'success' : 'info',
        });
      });
    },
  });

  const loadData = async () => {
    setLoading(true);
    const estadoBackend = getBackendEstadoFilter(filtroEstado);
    const ptaFilters: any = {
      periodo: filtroPeriodo,
      programa: filtroPrograma,
      nivelAprobacion: permisos.nivelAprobacion,
      isSuperUser: auth.isSuperUser,
    };
    if (estadoBackend) ptaFilters.estado = estadoBackend;

    const [ptaRes, statsRes, progsRes] = await Promise.all([
      getAllPTAs(ptaFilters),
      getPTAEstadisticas(filtroPeriodo),
      getCatalogoProgramas(),
    ]);
    
    // Auto-seed desactivado: la tabla solo muestra PTAs reales enviados por docentes
    
    // Validación robusta: asegurar que siempre sean arrays
    if (ptaRes.success && Array.isArray(ptaRes.data)) {
      setPtas(ptaRes.data);
    } else {
      console.warn('[PtaBackoffice] PTA data is not an array:', ptaRes);
      setPtas([]);
    }
    if (statsRes.success) setEstadisticas(statsRes.data);
    if (progsRes.success && Array.isArray(progsRes.data)) {
      setProgramas(progsRes.data);
    } else {
      setProgramas([]);
    }
    setLoading(false);
    setLastRefreshed(new Date());
    setRefreshCountdown(120);
  };

  useEffect(() => { loadData(); setCurrentPage(1); }, [filtroEstado, filtroPeriodo, filtroPrograma]);
  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  // ═══ Cargar personas cuando se navega al Banco de Docentes ═══
  useEffect(() => {
    if (moduleView === 'banco_docentes' && allPersonas.length === 0) {
      loadPersonas();
    }
  }, [moduleView, allPersonas.length, loadPersonas]);

  // ═══ Feature 32: Load persisted user data from KV on mount ═══
  useEffect(() => {
    if (!aprobadorId || aprobadorId === 'backoffice-user') { setUserDataLoaded(true); return; }
    (async () => {
      try {
        const res = await getPTAUserData(aprobadorId);
        if (res.success && res.data) {
          if (res.data.tags && Object.keys(res.data.tags).length > 0) setPtaTags(res.data.tags);
          if (res.data.notes && Object.keys(res.data.notes).length > 0) setInlineNotes(res.data.notes);
          if (res.data.pinned && res.data.pinned.length > 0) setPinnedIds(new Set(res.data.pinned));
          if (res.data.priorityOrder && res.data.priorityOrder.length > 0) setPriorityOrder(res.data.priorityOrder);

        }
      } catch (err) {
        console.error('[PTA-Persist] Error loading user data:', err);
      } finally {
        setUserDataLoaded(true);
      }
    })();
  }, [aprobadorId]);

  // ═══ Feature 32: Debounced auto-save to KV when tags/notes/pins/priority change ═══
  useEffect(() => {
    if (!userDataLoaded || !aprobadorId || aprobadorId === 'backoffice-user') return;
    if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current);
    persistDebounceRef.current = setTimeout(async () => {
      try {
        await savePTAUserData(aprobadorId, {
          tags: ptaTags,
          notes: inlineNotes,
          pinned: Array.from(pinnedIds),
          priorityOrder,
        });

      } catch (err) {
        console.error('[PTA-Persist] Error saving user data:', err);
      }
    }, 1500);
    return () => { if (persistDebounceRef.current) clearTimeout(persistDebounceRef.current); };
  }, [ptaTags, inlineNotes, pinnedIds, priorityOrder, userDataLoaded, aprobadorId]);

  // ═══ Feature 32: Collect all unique tags across PTAs (for tag filter) ═══
  const allUniqueTags = useMemo(() => {
    const tagSet = new Map<string, string>();
    Object.values(ptaTags).forEach(tags => {
      tags.forEach(t => { if (!tagSet.has(t.label)) tagSet.set(t.label, t.color); });
    });
    return Array.from(tagSet.entries()).map(([label, color]) => ({ label, color }));
  }, [ptaTags]);

  // ═══ Feature 33: Drag & Drop handlers ═══
  const handleDragStart = useCallback((e: React.DragEvent, ptaId: string) => {
    setDraggedId(ptaId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ptaId);
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedId(null);
    setDragOverId(null);
    const el = e.currentTarget as HTMLElement;
    el.style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, ptaId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (ptaId !== draggedId) setDragOverId(ptaId);
  }, [draggedId]);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string, paginatedList: any[]) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) { setDraggedId(null); setDragOverId(null); return; }

    const ids = paginatedList.map((p: any) => p.id);
    const sourceIdx = ids.indexOf(sourceId);
    const targetIdx = ids.indexOf(targetId);
    if (sourceIdx < 0 || targetIdx < 0) { setDraggedId(null); setDragOverId(null); return; }

    const newOrder = [...ids];
    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);

    setPriorityOrder(prev => {
      // Merge: keep existing priority entries for items not on this page, overlay the new page order
      const existing = prev.filter(id => !ids.includes(id));
      return [...newOrder, ...existing];
    });

    setDraggedId(null);
    setDragOverId(null);
    toast.success('Prioridad actualizada', { description: 'El orden se guardará automáticamente' });
  }, []);

  const filteredPtas = useMemo(() => {
    let result = ptas;
    // Apply territorial filter for Jefatura role — filtra por territoriales de las ASIGNATURAS del PTA
    if (permisos.filtroTerritorial && permisos.filtroTerritorial.length > 0) {
      result = result.filter((p: any) => {
        // Primero: territoriales de las asignaturas del componente Docencia
        const terAsigs: string[] = Array.isArray(p.territorialesAsignaturas) ? p.territorialesAsignaturas : [];
        if (terAsigs.length > 0) {
          return terAsigs.some(tid => permisos.filtroTerritorial!.includes(tid));
        }
        // Fallback: territorial del docente si el PTA no tiene asignaturas con territorial asignada
        return permisos.filtroTerritorial!.includes(p.territorial_id) ||
          permisos.filtroTerritorial!.some(tid =>
            p.territorial?.toLowerCase().includes(tid.replace('ter-', '').toLowerCase())
          );
      });
    }
    // Apply program filter for Decanatura role
    if (permisos.filtroPrograma && permisos.filtroPrograma.length > 0) {
      result = result.filter((p: any) =>
        permisos.filtroPrograma!.includes(p.programa_id) ||
        permisos.filtroPrograma!.some(pid =>
          p.programa?.toLowerCase().includes(pid.toLowerCase())
        )
      );
    }
    if (shouldRestrictByComponentPermission) {
      result = result.filter((p: any) => hasAnyComponentApprovalData(p, visibleComponentKeys));
    }
    // Apply search query (expanded multi-field)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p: any) =>
        p.docente_nombre?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.estado?.toLowerCase().includes(q) ||
        p.territorial?.toLowerCase().includes(q) ||
        p.programa?.toLowerCase().includes(q) ||
        p.dedicacion?.toLowerCase().includes(q) ||
        p.periodo?.toLowerCase().includes(q) ||
        p.docente_identificacion?.toLowerCase().includes(q)
      );
    }
    // ═══ Feature 32: Apply tag filter ═══
    if (filtroTags.length > 0) {
      result = result.filter((p: any) => {
        const tags = ptaTags[p.id] || [];
        return filtroTags.every(ft => tags.some(t => t.label === ft));
      });
    }

    // ═══ Workflow Tab Filters (Estado) ═══
    if (filtroEstado) {
      result = result.filter((p: any) => matchesEstadoWorkflowFilter(p, filtroEstado));
    }
    
    return result;
  }, [ptas, searchQuery, permisos.filtroTerritorial, permisos.filtroPrograma, shouldRestrictByComponentPermission, visibleComponentKeys, filtroTags, ptaTags, filtroEstado]);


  // ═══ Feature 14: Keyboard Navigation ═══
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Feature 27: Cmd+K / Ctrl+K command palette (works everywhere)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(p => !p);
        setCommandQuery('');
        return;
      }

      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

      if (e.key === '?' && e.shiftKey) { e.preventDefault(); setShowKeyboardHelp(k => !k); return; }
      if (e.key === 'Escape') {
        if (showCommandPalette) { setShowCommandPalette(false); return; }
        if (showKeyboardHelp) { setShowKeyboardHelp(false); return; }
        if (expandedRowId) { setExpandedRowId(null); return; }
        if (selectedPTA) { setSelectedPTA(null); return; }
        if (showApproval) { setShowApproval(false); return; }
        if (showDevolucion) { setShowDevolucion(false); return; }
        setFocusedIdx(-1);
        return;
      }
      if (moduleView !== 'gestion') return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setFocusedIdx(f => Math.min(f + 1, filteredPtas.length - 1)); }
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setFocusedIdx(f => Math.max(f - 1, 0)); }
      if (e.key === 'Enter' && focusedIdx >= 0) {
        const sorted = [...filteredPtas].sort((a: any, b: any) => {
          const aVal = a[sortBy] || ''; const bVal = b[sortBy] || '';
          return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });
        const pageStart = (currentPage - 1) * PAGE_SIZE;
        const pta = sorted[pageStart + focusedIdx];
        if (pta) setSelectedPTA(pta);
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-pta-search]')?.focus();
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) { loadData(); }
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey) { setShowActivityFeed(f => !f); }
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) { setGroupBy(g => g ? '' : 'estado'); }
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && focusedIdx >= 0) {
        const sorted3 = [...filteredPtas].sort((a: any, b: any) => {
          const aPin = pinnedIds.has(a.id) ? 0 : 1; const bPin = pinnedIds.has(b.id) ? 0 : 1;
          if (aPin !== bPin) return aPin - bPin;
          const aVal = a[sortBy] || ''; const bVal = b[sortBy] || '';
          return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });
        const ps3 = (currentPage - 1) * PAGE_SIZE;
        const ptaE = sorted3[ps3 + focusedIdx];
        if (ptaE) setExpandedRowId(prev => prev === ptaE.id ? null : ptaE.id);
      }
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey && focusedIdx >= 0) {
        const sorted2 = [...filteredPtas].sort((a: any, b: any) => {
          const aPin = pinnedIds.has(a.id) ? 0 : 1;
          const bPin = pinnedIds.has(b.id) ? 0 : 1;
          if (aPin !== bPin) return aPin - bPin;
          const aVal = a[sortBy] || ''; const bVal = b[sortBy] || '';
          return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
        });
        const pageStart2 = (currentPage - 1) * PAGE_SIZE;
        const ptaF = sorted2[pageStart2 + focusedIdx];
        if (ptaF) togglePin(ptaF.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedIdx, filteredPtas.length, moduleView, selectedPTA, showApproval, showDevolucion, showKeyboardHelp, showActivityFeed, showCommandPalette, expandedRowId, sortBy, sortDir, currentPage]);

  const handleAprobar = async () => {
    if (!selectedPTA) return;

    // ── Validación de nivel de aprobación ──
    if (!puedeAprobarPorNivel(selectedPTA.estado, permisos.nivelAprobacion, isSuperUserEffective)) {
      const nivelReq = getNivelRequeridoAprobacion(selectedPTA.estado);
      toast.error(`No tiene nivel suficiente para aprobar`, {
        description: `Este PTA requiere nivel ${nivelReq} (${selectedPTA.estado}). Su nivel: ${permisos.nivelAprobacion} (${rolLabel}).`,
        duration: 6000,
      });
      return;
    }

    // La aprobación de Gestión Profesoral requiere firma digital, aunque el flujo sea paralelo.
    if (permisos.nivelAprobacion === 3 && !showFirmaDigital && !isSuperUserEffective) {
      setShowApproval(false);
      setShowFirmaDigital(true);
      return;
    }
    setProcesando(true);
    const res = await updatePTAStatus(selectedPTA.id, {
      accion: 'aprobar',
      observaciones: approvalObs || `Aprobado por ${aprobadorNombre} (${rolLabel})`,
      actorId: aprobadorId,
      actorRol: rolLabel,
      nivelAprobacion: permisos.nivelAprobacion,
      actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
      isSuperUser: isSuperUserEffective,
      aprobarTodas: isSuperUserEffective,
    });
    setProcesando(false);
    if (res.success) {
      const nuevoEstado = res.nuevoEstado || getNextState(selectedPTA.estado);
      if (res.parcial) {
        toast.success(res.message || 'Aprobación registrada. Faltan otros avales.');
        pushActivity('aprobacion', selectedPTA.docente_nombre, nuevoEstado, 'Aprobación parcial registrada');
        addNotification({
          title: 'Aprobación PTA registrada',
          message: `Aprobación de ${rolLabel} registrada para ${selectedPTA.docente_nombre}`,
          type: 'success',
        });
        setShowApproval(false);
        setApprovalObs('');
        setSelectedPTA(null);
        loadData();
        return;
      }
      toast.success(`PTA avanzado a: ${nuevoEstado}`);
      pushActivity('aprobacion', selectedPTA.docente_nombre, nuevoEstado, `Aprobado → ${nuevoEstado}`);
      addNotification({
        title: 'PTA Aprobado',
        message: `PTA de ${selectedPTA.docente_nombre} → ${nuevoEstado} (por ${aprobadorNombre})`,
        type: 'success',
      });
      setShowApproval(false);
      setApprovalObs('');
      setSelectedPTA(null);
      loadData();
    } else {
      toast.error('Error al actualizar el estado del PTA');
    }
  };

  const handleDevolver = async () => {
    if (!selectedPTA || !devolucionMotivo.trim()) return;
    setProcesando(true);
    const res = await updatePTAStatus(selectedPTA.id, {
      accion: 'devolver',
      motivo_devolucion: devolucionMotivo,
      observaciones: devolucionMotivo,
      actorId: aprobadorId,
      actorRol: rolLabel,
      nivelAprobacion: permisos.nivelAprobacion,
      actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
      isSuperUser: isSuperUserEffective,
    });
    setProcesando(false);
    if (res.success) {
      toast.success('PTA devuelto con observaciones');
      pushActivity('devolucion', selectedPTA.docente_nombre, 'Devuelto', devolucionMotivo.substring(0, 80));
      setShowDevolucion(false);
      setDevolucionMotivo('');
      setSelectedPTA(null);
      loadData();
    } else {
      toast.error('Error al devolver el PTA');
    }
  };

  const handleRechazar = async () => {
    if (!selectedPTA) return;
    setProcesando(true);
    const res = await updatePTAStatus(selectedPTA.id, {
      estado: 'Rechazado',
      observaciones: approvalObs || `Rechazado por ${aprobadorNombre} (${rolLabel})`,
      aprobador_id: aprobadorId,
      aprobador_nombre: `${aprobadorNombre} (${rolLabel})`,
    });
    setProcesando(false);
    if (res.success) {
      toast.success('PTA rechazado');
      pushActivity('rechazo', selectedPTA.docente_nombre, 'Rechazado', 'PTA rechazado');
      setShowApproval(false);
      setApprovalObs('');
      setSelectedPTA(null);
      loadData();
    } else {
      toast.error('Error al rechazar el PTA');
    }
  };

  const statCards = estadisticas ? [
    { label: 'Total PTAs', value: ptas.length, icon: FileText, color: '#003DA5', bg: '#EFF6FF' },
    { label: 'Pendientes', value: ptas.filter((p: any) => isEstadoPendienteAprobacion(p.estado)).length, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
    { label: 'Aprobados', value: ptas.filter((p: any) => p.estado === 'Aprobado').length, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
    { label: 'En Concertación', value: estadisticas.enConcertacion || 0, icon: MessageSquare, color: '#7C3AED', bg: '#F3E8FF' },
    { label: 'Rechazados', value: estadisticas.rechazados || 0, icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'Avance', value: `${estadisticas.porcentajeAvance || 0}%`, icon: TrendingUp, color: '#0891B2', bg: '#ECFEFF' },
  ] : [];

  // ═══ Navigation structure — Simplified World-Class ═══
  const NAV_GROUPS = [
    {
      type: 'direct' as const,
      items: [
        { key: 'gestion', label: 'Gestión', icon: FileText },
        { key: 'solicitudes_pta', label: 'Solicitudes PTA', icon: Send },
        { key: 'seguimiento_docs', label: 'Seguimiento', icon: FolderOpen },
      ],
    },
    { type: 'button' as const, key: 'tablero_unificado' as ModuleView, label: 'Reportes', icon: BarChart3 },
    {
      type: 'direct' as const,
      items: [
        { key: 'configuracion', label: 'Configuración', icon: Sliders },
      ],
    },
  ];

  if (concertacionPtaId) {
    return (
      <MesaConcertacion
        ptaId={concertacionPtaId}
        onBack={() => { setConcertacionPtaId(null); loadData(); }}
        userRole="direccion"
        userName={aprobadorNombre}
      />
    );
  }

  // Pending PTAs count for mobile badge
  const listaPendientesAprobar = filteredPtas.filter((p: any) =>
    isEstadoPendienteAprobacion(p.estado) &&
    puedeAprobarPorNivel(p.estado, permisos.nivelAprobacion, isSuperUserEffective)
  );
  const pendingForApprovalCount = listaPendientesAprobar.length;

  const sortedPtas = [...filteredPtas].sort((a: any, b: any) => {
    // Pinned items always come first
    const aPin = pinnedIds.has(a.id) ? 0 : 1;
    const bPin = pinnedIds.has(b.id) ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    // Feature 33: Priority order (drag & drop) — items in priorityOrder come before others, in that order
    if (priorityOrder.length > 0) {
      const aPri = priorityOrder.indexOf(a.id);
      const bPri = priorityOrder.indexOf(b.id);
      if (aPri >= 0 && bPri >= 0) return aPri - bPri;
      if (aPri >= 0) return -1;
      if (bPri >= 0) return 1;
    }
    const aVal = a[sortBy] || '';
    const bVal = b[sortBy] || '';
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });
  const totalPages = Math.ceil(sortedPtas.length / PAGE_SIZE);
  const paginatedPtas = sortedPtas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const onSort = (f: string) => {
    if (sortBy === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(f); setSortDir('asc'); }
  };

  const renderRowActions = (pta: any) => {
    const isPendiente = isEstadoPendienteAprobacion(pta.estado);
    const canApproveThisLevel = isPendiente && permisos.puedeAprobar && puedeAprobarPorNivel(pta.estado, permisos.nivelAprobacion, isSuperUserEffective);
    const isPinned = pinnedIds.has(pta.id);
    const hasNote = !!inlineNotes[pta.id];
    const isComparing = compareIds.includes(pta.id);
    const hasTags = (ptaTags[pta.id] || []).length > 0;
    const isExpanded = expandedRowId === pta.id;

    // ── World-class contextual primary action ──
    const getPrimaryAction = () => {
      if (pta.estado === 'EN_CONCERTACION') {
        return {
          label: 'Concertar',
          icon: MessageSquare,
          bg: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE',
          action: () => setConcertacionPtaId(pta.id),
          title: 'Ir a mesa de concertación',
        };
      }
      if (pta.estado === 'NOTIFICADO_DOCENTE') {
        return {
          label: 'Esperando',
          icon: Clock,
          bg: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A',
          action: () => setSelectedPTA(pta),
          title: 'Esperando respuesta del docente',
        };
      }
      if (pta.estado === 'Aprobado') {
        return {
          label: 'Imprimir',
          icon: FileText,
          bg: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0',
          action: () => { setSelectedPTA(pta); setShowReporteR01(true); },
          title: 'Ver e imprimir R01',
        };
      }
      if (pta.estado === 'Devuelto') {
        return {
          label: 'Ver motivo',
          icon: RotateCcw,
          bg: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A',
          action: () => setSelectedPTA(pta),
          title: 'Ver historial de devolución',
        };
      }
      if (pta.estado === 'Borrador') {
        return {
          label: 'Recordar',
          icon: Bell,
          bg: '#F3F4F6', color: '#4B5563', border: '1px solid #D1D5DB',
          action: () => {
            setSelectedIds(new Set([pta.id]));
            setShowBulkNotify(true);
          },
          title: 'Enviar recordatorio para que radique el PTA',
        };
      }
      return null;
    };
    const primaryAction = getPrimaryAction();
    return (
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        {/* Feature 28: Inline Expand */}
        <button
          onClick={() => setExpandedRowId(isExpanded ? null : pta.id)}
          style={{
            width: 22, height: 22, borderRadius: 4, border: 'none',
            background: isExpanded ? '#F3F4F6' : 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isExpanded ? 1 : 0.4, transition: 'all 0.15s',
          }}
          title={isExpanded ? 'Colapsar detalle' : 'Expandir detalle in-line (E)'}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.opacity = '0.4'; }}
        >
          {isExpanded
            ? <ChevronDown style={{ width: 10, height: 10, color: '#374151', transform: 'rotate(180deg)' }} />
            : <ChevronDown style={{ width: 10, height: 10, color: '#9CA3AF' }} />}
        </button>

        {/* Feature 29: Tags */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowTagPicker(showTagPicker === pta.id ? null : pta.id)}
            style={{
              width: 22, height: 22, borderRadius: 4, border: 'none',
              background: hasTags ? '#EFF6FF' : 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hasTags ? 1 : 0.4, transition: 'all 0.15s',
            }}
            title={hasTags ? `Tags: ${(ptaTags[pta.id] || []).map(t => t.label).join(', ')}` : 'Agregar etiqueta'}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => { if (!hasTags) e.currentTarget.style.opacity = '0.4'; }}
          >
            <Tag style={{ width: 10, height: 10, color: hasTags ? '#003DA5' : '#9CA3AF' }} />
          </button>
          {showTagPicker === pta.id && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowTagPicker(null)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 9999,
                background: 'white', borderRadius: 10, border: '1px solid #E5E7EB',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', fontSize: '0.65rem', fontWeight: 700, color: '#003DA5', textTransform: 'uppercase' }}>
                  Etiquetas
                </div>
                {(ptaTags[pta.id] || []).length > 0 && (
                  <div style={{ padding: '6px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #F3F4F6' }}>
                    {(ptaTags[pta.id] || []).map(tag => (
                      <span key={tag.label} style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
                        background: `${tag.color}15`, color: tag.color, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                      }} onClick={() => removeTag(pta.id, tag.label)} title="Clic para eliminar">
                        {tag.label} <X style={{ width: 7, height: 7 }} />
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ padding: '6px 10px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                    {['Urgente', 'Revisado', 'Incompleto', 'Destacado', 'Seguimiento'].map((preset, pi) => (
                      <button key={preset} onClick={() => addTag(pta.id, preset, TAG_COLORS[pi % TAG_COLORS.length])} style={{
                        padding: '2px 6px', borderRadius: 4, border: '1px solid #E5E7EB', background: 'white',
                        fontSize: '0.6rem', fontWeight: 600, color: TAG_COLORS[pi % TAG_COLORS.length], cursor: 'pointer',
                      }}>{preset}</button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="text" value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)}
                      placeholder="Nueva etiqueta..."
                      style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: '0.68rem', outline: 'none' }}
                      onKeyDown={e => { if (e.key === 'Enter' && newTagLabel.trim()) { addTag(pta.id, newTagLabel.trim(), TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]); } }}
                    />
                    <button
                      onClick={() => { if (newTagLabel.trim()) addTag(pta.id, newTagLabel.trim(), TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]); }}
                      style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                    >+</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Feature 23: Pin */}
        <button
          onClick={() => togglePin(pta.id)}
          style={{
            width: 22, height: 22, borderRadius: 4, border: 'none',
            background: isPinned ? '#FEF3C7' : 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isPinned ? 1 : 0.4, transition: 'opacity 0.15s',
          }}
          title={isPinned ? 'Desanclar' : 'Anclar al inicio'}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => { if (!isPinned) e.currentTarget.style.opacity = '0.4'; }}
        >
          <Star style={{ width: 10, height: 10, color: isPinned ? '#D97706' : '#9CA3AF', fill: isPinned ? '#D97706' : 'none' }} />
        </button>
        {/* Feature 24: Quick Note */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              setInlineNotePtaId(inlineNotePtaId === pta.id ? null : pta.id);
              setInlineNoteText(inlineNotes[pta.id] || '');
            }}
            style={{
              width: 22, height: 22, borderRadius: 4, border: 'none',
              background: hasNote ? '#EDE9FE' : 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: hasNote ? 1 : 0.4, transition: 'opacity 0.15s',
            }}
            title={hasNote ? `Nota: ${inlineNotes[pta.id]}` : 'Agregar nota rápida'}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => { if (!hasNote) e.currentTarget.style.opacity = '0.4'; }}
          >
            <StickyNote style={{ width: 10, height: 10, color: hasNote ? '#7C3AED' : '#9CA3AF' }} />
          </button>
          {inlineNotePtaId === pta.id && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setInlineNotePtaId(null)} />
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 9999,
                background: 'white', borderRadius: 10, border: '1px solid #E5E7EB',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220, overflow: 'hidden',
              }}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', fontSize: '0.65rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>
                  Nota rápida
                </div>
                <div style={{ padding: 8 }}>
                  <textarea
                    autoFocus
                    value={inlineNoteText}
                    onChange={e => setInlineNoteText(e.target.value)}
                    placeholder="Escribir nota..."
                    rows={3}
                    style={{
                      width: '100%', padding: 8, borderRadius: 6, border: '1px solid #D1D5DB',
                      fontSize: '0.78rem', resize: 'none', outline: 'none', fontFamily: 'inherit',
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveInlineNote(pta.id, inlineNoteText); }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    {hasNote && (
                      <button
                        onClick={() => saveInlineNote(pta.id, '')}
                        style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Eliminar
                      </button>
                    )}
                    <button
                      onClick={() => saveInlineNote(pta.id, inlineNoteText)}
                      style={{ padding: '3px 10px', borderRadius: 5, border: 'none', background: '#7C3AED', color: 'white', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* ── World-class Primary Action ── */}
        {primaryAction ? (
          <button
            onClick={primaryAction.action}
            title={primaryAction.title}
            style={{
              padding: '5px 10px', borderRadius: 6,
              background: primaryAction.bg, color: primaryAction.color,
              border: primaryAction.border,
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              whiteSpace: 'nowrap', transition: 'all 0.15s',
              boxShadow: primaryAction.bg === '#003DA5' ? '0 2px 6px rgba(0,61,165,0.3)' : 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            <primaryAction.icon style={{ width: 11, height: 11 }} />
            {primaryAction.label}
          </button>
        ) : (
          isPendiente && permisos.puedeAprobar && !canApproveThisLevel && (
            <span style={{
              fontSize: '0.65rem', color: '#D97706', padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: 3,
              background: '#FEF3C7', borderRadius: 5, border: '1px solid #FDE68A',
            }} title={`Requiere nivel ${getNivelRequeridoAprobacion(pta.estado) || '?'}`}>
              <AlertTriangle style={{ width: 9, height: 9 }} /> Nivel insuf.
            </span>
          )
        )}

        {/* Secondary: View detail */}
        <button
          onClick={() => setSelectedPTA(pta)}
          title="Ver detalle completo del PTA"
          style={{
            width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB',
            background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
        >
          <Eye style={{ width: 12, height: 12, color: '#6B7280' }} />
        </button>

        {/* Overflow: pin, note, compare, tag */}
        <button
          onClick={() => toggleCompare(pta.id)}
          style={{
            width: 22, height: 22, borderRadius: 4, border: 'none',
            background: isComparing ? '#ECFEFF' : 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isComparing ? 1 : 0.3, transition: 'opacity 0.15s',
          }}
          title={isComparing ? 'Quitar de comparación' : 'Comparar con otro PTA'}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => { if (!isComparing) e.currentTarget.style.opacity = '0.3'; }}
        >
          <GitCompare style={{ width: 10, height: 10, color: isComparing ? '#0891B2' : '#9CA3AF' }} />
        </button>

        {/* Eliminar PTA — solo super admin */}
        {perfil?.rol === 'admin' && (
          <button
            onClick={async () => {
              if (!window.confirm(`¿Eliminar definitivamente el PTA de ${pta.docente_nombre} (${pta.periodo})?\n\nEsta acción no se puede deshacer.`)) return;
              const res = await deletePTA(pta.id);
              if (res.success) {
                toast.success('PTA eliminado');
                loadData();
              } else {
                toast.error(res.message || 'Error al eliminar el PTA');
              }
            }}
            style={{
              width: 26, height: 26, borderRadius: 6, border: '1px solid #FECACA',
              background: '#FEF2F2', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Eliminar PTA definitivamente (solo admin)"
            onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; (e.currentTarget.querySelector('svg') as any)?.style && ((e.currentTarget.querySelector('svg') as any).style.color = 'white'); }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; (e.currentTarget.querySelector('svg') as any)?.style && ((e.currentTarget.querySelector('svg') as any).style.color = '#DC2626'); }}
          >
            <Trash2 style={{ width: 12, height: 12, color: '#DC2626' }} />
          </button>
        )}
      </div>
    );
  };

  const concertacionCount = filteredPtas.filter((p: any) => p.estado === 'EN_CONCERTACION').length;

  // Active filter count for mobile badge
  const activeFilterCount = [searchQuery, filtroEstado, filtroPrograma !== ''].filter(Boolean).length;

  // ── Atención requerida ──
  return (
    <div style={{ minHeight: '100%' }}>
    <React.Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}><ESAPLogoLoader size={48} text="Cargando módulo..." /></div>}>


      {/* Simulation Mode Banner */}
      {isSimulando && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: 12, marginBottom: 24,
            background: 'var(--pta-warning-soft)',
            border: '1px solid var(--pta-warning)', flexWrap: 'wrap', gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Eye style={{ width: 18, height: 18, color: 'var(--pta-warning)' }} />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--pta-text-primary)' }}>
                Modo Simulación
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--pta-text-secondary)', marginLeft: 10 }}>
                Viendo como: <strong>{perfil.nombre}</strong> ({rolLabel})
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {perfil.territorial_ids.length > 0 && (
              <span style={{
                padding: '5px 12px', borderRadius: 8,
                background: 'white', color: 'var(--pta-text-secondary)',
                fontSize: '0.75rem', fontWeight: 500,
              }}>
                Territorial: {perfil.territorial_ids.join(', ')}
              </span>
            )}
            <span style={{
              padding: '5px 12px', borderRadius: 8,
              background: 'white', color: 'var(--pta-primary)',
              fontSize: '0.75rem', fontWeight: 600,
            }}>
              Nivel {permisos.nivelAprobacion}
            </span>
          </div>
        </motion.div>
      )}

      {moduleView !== 'banco_docentes' && (
        <>
          {/* ─── WORLD-CLASS HEADER ─── */}
          <div>
            {/* Top Bar */}
            <div className="rounded-2xl bg-white border border-gray-200 shadow-sm px-6 md:px-8 py-4 md:py-5 mb-0">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <div 
                    className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#EBF0FA' }}
                  >
                    <FileText className="w-5 h-5 md:w-6 md:h-6 text-[#003DA5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight">
                        Plan de Trabajo Académico
                      </h1>
                      {estadisticas && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                          {ptas.length} PTAs
                        </span>
                      )}
                      {pendingForApprovalCount > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-amber-100 text-amber-700 border border-amber-300">
                          {pendingForApprovalCount} pendiente{pendingForApprovalCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] md:text-xs text-gray-400 mt-0.5">
                      Gestión y aprobación de PTAs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Selector de Periodo Académico — derecha */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider hidden sm:inline">PERÍODO:</span>
                    <div className="relative">
                      <button
                        onClick={() => setShowPeriodoDropdownPTA(!showPeriodoDropdownPTA)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#003DA5]/20 bg-[#EBF0FA] text-[#003DA5] text-sm font-bold hover:border-[#003DA5]/40 hover:bg-[#dce7f9] transition-all shadow-sm"
                      >
                        {periodoSeleccionadoPTA || '2025-2'}
                        {esPeriodoActivoPTA && (
                          <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Actual</span>
                        )}
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {showPeriodoDropdownPTA && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowPeriodoDropdownPTA(false)} />
                          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-1 z-20">
                            <div className="px-3 py-2 border-b border-gray-100">
                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Periodos Académicos</p>
                            </div>
                            {periodosPTA.length > 0 ? periodosPTA.map((p: any, idx: number) => {
                              const codigo = p.codigo || `${p.anio}-${p.semestre}`;
                              const esActivo = p.estado === 'en_curso';
                              return (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setPeriodoSeleccionadoPTA(codigo);
                                    setFiltroPeriodo(codigo);
                                    setShowPeriodoDropdownPTA(false);
                                  }}
                                  className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${
                                    codigo === periodoSeleccionadoPTA ? 'bg-[#EBF0FA] text-[#003DA5] font-bold' : 'hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  <span>{codigo}{esActivo ? ' (Actual)' : ''}</span>
                                  {esActivo ? <span className="w-2 h-2 rounded-full bg-green-500" /> : <span className="text-[10px] text-gray-400">Historial</span>}
                                </button>
                              );
                            }) : (
                              <div className="px-3 py-3 text-sm text-gray-500">2025-2 (Actual)</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    {!esPeriodoActivoPTA && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Solo lectura
                      </span>
                    )}
                  </div>
                  <PTASyncIndicator
                    syncState={syncState}
                    sistema="backoffice"
                    onEventClick={(evt) => {
                      const ptaMatch = ptas.find(p => p.id === evt.pta_id);
                      if (ptaMatch) setSelectedPTA(ptaMatch);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-6 flex overflow-x-auto hide-scrollbar gap-1 bg-slate-50/50 pt-2 border-t border-slate-100">
              {NAV_GROUPS.map((group, gi) => {
                if (group.type === 'direct') {
                  return <React.Fragment key={`nav-group-${gi}`}>{group.items.filter((item: any) => tieneVista(item.key)).map((tab: any) => (
                    <button
                      key={tab.key}
                      onClick={() => { setModuleView(tab.key as ModuleView); setOpenDropdown(null); }}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                        moduleView === tab.key 
                          ? 'border-blue-600 text-blue-600 bg-white' 
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                      }`}
                    >
                      <tab.icon style={{ width: 16, height: 16 }} />
                      {tab.label}
                    </button>
                  ))}</React.Fragment>;
                }

                if (group.type === 'button') {
                  const btn = group as any;
                  const reportViews = ['tablero_unificado', 'centro_reportes', 'tablero', 'reporte', 'comparativo', 'indicadores', 'directivo', 'territorial', 'mapa_territorial', 'workflow_visualizer', 'cronograma'];
                  const isActive = reportViews.includes(moduleView);
                  return (
                    <button
                      key={btn.key}
                      onClick={() => { setModuleView(btn.key as ModuleView); setOpenDropdown(null); }}
                      className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                        isActive
                          ? 'border-blue-600 text-blue-600 bg-white' 
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                      }`}
                    >
                      <btn.icon style={{ width: 16, height: 16 }} />
                      {btn.label}
                    </button>
                  );
                }

                // Dropdown group
                const dropGroup = group as any;
                const visibleItems = dropGroup.items.filter((item: any) => tieneVista(item.key));
                if (visibleItems.length === 0) return null;
                const isActive = visibleItems.some((item: any) => item.key === moduleView);

                return (
                  <NavDropdownPortal
                    key={dropGroup.id}
                    id={dropGroup.id}
                    label={dropGroup.label}
                    icon={dropGroup.icon}
                    isActive={isActive}
                    isOpen={openDropdown === dropGroup.id}
                    onToggle={() => setOpenDropdown(openDropdown === dropGroup.id ? null : dropGroup.id)}
                    onClose={() => setOpenDropdown(null)}
                    items={visibleItems}
                    moduleView={moduleView}
                    onSelect={(key: string) => { setModuleView(key as any); setOpenDropdown(null); }}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}


      {/* ═══ Module Views ═══ */}
      {moduleView === 'tablero_unificado' ? (
        <TableroControlUnificadoPTA />
      ) : moduleView === 'centro_reportes' ? (
        <CentroReportesPTA />
      ) : moduleView === 'cronograma' ? (
        <CronogramaProcesoPTA />
      ) : moduleView === 'programacion_institucional' ? (
        <ProgramacionAcademicaInstitucionalPTA
          onBack={() => setModuleView('gestion')}
          periodo={filtroPeriodo}
        />
      ) : moduleView === 'mapeo_sincronizacion' ? (
        <MapeoSincronizacionPTA
          onBack={() => setModuleView('gestion')}
        />
      ) : moduleView === 'salud_sistema' ? (
        <SaludSistemaPTA
          onBack={() => setModuleView('gestion')}
          onNavigate={(view: string) => setModuleView(view as ModuleView)}
        />
      ) : moduleView === 'reconciliacion_masiva' ? (
        <ReconciliacionMasivaPTA
          onBack={() => setModuleView('gestion')}
          onNavigate={(view: string) => setModuleView(view as ModuleView)}
        />
      ) : moduleView === 'solicitudes_pta' ? (
        <SolicitudesPTAAdmin aprobadorNombre={aprobadorNombre} />
      ) : moduleView === 'seguimiento_docs' ? (
        <SeguimientoDocumentosAdmin aprobadorNombre={aprobadorNombre} rolLabel={rolLabel} />
      ) : moduleView === 'programacion' ? (
        <ProgramacionAcademica />
      ) : moduleView === 'tablero' ? (
        <TableroControlPTA />
      ) : moduleView === 'reporte' ? (
        <ReporteNacionalPTA />
      ) : moduleView === 'seguimiento' ? (
        <ReporteSeguimientoPTA />
      ) : moduleView === 'directivo' ? (
        <DashboardDirectivoPTA />
      ) : moduleView === 'territorial' ? (
        <GestionTerritorialPTA />
      ) : moduleView === 'comparativo' ? (
        <ComparativoPeriodosPTA />
      ) : moduleView === 'validador' ? (
        <ValidadorCatalogoGTH />
      ) : moduleView === 'configuracion' ? (
          <ConfiguracionReglasPTA />
      ) : moduleView === 'test_e2e' ? (
        <TestE2E_FlujoPTA />
      ) : moduleView === 'mapa_territorial' ? (
        <MapaCoberturaTerritorialPTA />
      ) : moduleView === 'alertas' ? (
        <AlertasTempranasPTA />
      ) : moduleView === 'pre_aprobacion_sni_snpi' ? (
        <PreAprobacionSNI_SNPI_PTA />
      ) : moduleView === 'indicadores' ? (
        <IndicadoresRendimientoPTA />
      ) : moduleView === 'acta_concertacion' ? (
        <ActaConcertacionPTA
          ptaId="demo-acta-001"
          docenteNombre="Carlos Alberto Martínez Rojas"
          docenteIdentificacion="79.456.123"
          docenteDedicacion="TC"
          docentePrograma="Administración Pública (Diurno)"
          territorial="CUNDINAMARCA"
          periodo="2026-1"
          resultado="CONCERTADO"
          directorNombre="Dra. María Elena Gómez"
          directorCargo="Jefe de Programa — ESAP Territorial Cundinamarca"
          onClose={() => setModuleView('gestion')}
        />
      ) : moduleView === 'simulador_carga' ? (
        <SimuladorCargaPTA />
      ) : moduleView === 'benchmarking' ? (
        <BenchmarkingPTA />
      ) : moduleView === 'exportador_actas' ? (
        <ExportadorActasMasivoPTA />
      ) : moduleView === 'comite_evaluacion' ? (
        <ComiteEvaluacionPTA />
      ) : moduleView === 'calendario_academico' ? (
        <CalendarioAcademicoPTA />
      ) : moduleView === 'asignador_automatico' ? (
        <AsignadorAutomaticoPTA />
      ) : moduleView === 'kanban' ? (
        <KanbanPTA />
      ) : moduleView === 'metricas_sla' ? (
        <MetricasSLA_PTA />
      ) : moduleView === 'generador_resoluciones' ? (
        <GeneradorResolucionesPTA />
      ) : moduleView === 'gestion_conflictos' ? (
        <GestionConflictosPTA />
      ) : moduleView === 'workflow_visualizer' ? (
        <WorkflowVisualizerPTA />
      ) : moduleView === 'preferencias_notificaciones' ? (
        <PreferenciasNotificacionesPTA />
      ) : moduleView === 'verificacion_qr' ? (
        <VerificacionQRPublicaPTA embedded />
      ) : moduleView === 'banco_docentes' ? (
        <BancoDocentesPTA />
      ) : (
        /* ═══ GESTIÓN — Vista principal ═══ */
        <div className="py-6 px-2 max-w-none mx-auto flex flex-col gap-6 w-full">
          {/* Territorial/Program Filter Banner */}
          {(permisos.filtroTerritorial || permisos.filtroPrograma) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '10px 16px', borderRadius: 10, marginBottom: 14,
                background: '#FFFBEB', border: '1px solid #FDE68A',
                display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#92400E',
                flexWrap: 'wrap', boxShadow: '0 1px 4px rgba(217,119,6,0.1)',
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Filter style={{ width: 13, height: 13, color: '#92400E' }} />
              </div>
              <div>
                <span style={{ fontWeight: 700 }}>Vista filtrada por su rol</span>
                <div style={{ fontSize: '0.72rem', color: '#B45309', marginTop: 2 }}>
                  {permisos.filtroTerritorial && <span>Territoriales: <strong>{permisos.filtroTerritorial.join(', ')}</strong> · </span>}
                  {permisos.filtroPrograma && <span>Programas: <strong>{permisos.filtroPrograma.join(', ')}</strong> · </span>}
                  Mostrando {filteredPtas.length} de {ptas.length} PTAs
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── WORLD-CLASS TOOLBAR ─── */}
          <PTAWorldClassToolbar
            estadisticas={estadisticas}
            filtroEstado={filtroEstado}
            setFiltroEstado={setFiltroEstado}
            ptas={ptas}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={(v) => {
              setFiltroPeriodo(v);
              setPeriodoSeleccionadoPTA(v);
            }}
            filtroPrograma={filtroPrograma}
            setFiltroPrograma={setFiltroPrograma}
            programas={programas}
            vistaActual={viewMode}
            setVistaActual={setViewMode}
            additionalTools={
              <>
                {/* Columns config */}
                <div style={{ position: 'relative' }}>
                  <button
                    data-colconfig-btn
                    onClick={() => setShowColConfig(!showColConfig)}
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: '1px solid #E5E7EB',
                      background: showColConfig ? '#EFF6FF' : 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: showColConfig ? '#1E3A8A' : '#6B7280', transition: 'all 0.15s'
                    }}
                    title="Configurar columnas"
                  >
                    <Columns3 style={{ width: 15, height: 15 }} />
                  </button>
                  {showColConfig && createPortal(
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowColConfig(false)} />
                      <div style={{
                        position: 'fixed', top: (() => { const el = document.querySelector('[data-colconfig-btn]'); return el ? el.getBoundingClientRect().bottom + 4 : 100; })(), right: 16,
                        background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.12)', width: 220, overflow: 'hidden', zIndex: 9999,
                      }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid #F3F4F6', fontSize: '0.75rem', fontWeight: 700, color: '#111827' }}>
                          Columnas Visibles
                        </div>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                          {ALL_COLUMNS.map(col => (
                            <label
                              key={col.key}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                                fontSize: '0.78rem', color: '#4B5563', cursor: 'pointer',
                                borderBottom: '1px solid #F9FAFB', transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <input
                                type="checkbox"
                                checked={visibleCols.has(col.key)}
                                onChange={() => {
                                  const next = new Set(visibleCols);
                                  if (next.has(col.key)) {
                                    if (next.size > 2) next.delete(col.key);
                                    else toast.error('Mínimo 2 columnas visibles');
                                  } else {
                                    next.add(col.key);
                                  }
                                  setVisibleCols(next);
                                }}
                                style={{ width: 14, height: 14, accentColor: '#003DA5', cursor: 'pointer' }}
                              />
                              {col.label}
                            </label>
                          ))}
                        </div>
                        <div style={{ padding: '8px 14px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                          <button
                            onClick={() => setVisibleCols(new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key)))}
                            style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px solid #D1D5DB', background: 'white', color: '#6B7280', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                            onMouseLeave={e => e.currentTarget.style.background = 'white'}
                          >
                            Restaurar predeterminadas
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
                {/* Category Grouping */}
                <div style={{ position: 'relative' }}>
                  <button
                    data-groupby-btn
                    onClick={() => setGroupBy(g => g ? '' : 'estado')}
                    style={{
                      width: 32, height: 32, borderRadius: 6, border: '1px solid #E5E7EB',
                      background: groupBy ? '#EDE9FE' : 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: groupBy ? '#6D28D9' : '#6B7280', transition: 'all 0.15s'
                    }}
                    title={groupBy ? `Agrupado por ${groupBy}` : 'Agrupar registros'}
                  >
                    <Layers style={{ width: 15, height: 15 }} />
                  </button>
                  {groupBy && createPortal(
                    <div style={{
                      position: 'fixed', top: (() => { const el = document.querySelector('[data-groupby-btn]'); return el ? el.getBoundingClientRect().bottom + 4 : 100; })(), right: 16,
                      background: 'white', borderRadius: 10, border: '1px solid #E5E7EB',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.12)', width: 180, overflow: 'hidden', zIndex: 9999,
                    }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>
                        Agrupar tabla por:
                      </div>
                      {(['estado', 'territorial', 'dedicacion'] as const).map(g => (
                        <button
                          key={g}
                          onClick={() => { setGroupBy(g); setCollapsedGroups(new Set()); }}
                          style={{
                            width: '100%', padding: '8px 14px', border: 'none',
                            background: groupBy === g ? '#F5F3FF' : 'white',
                            color: groupBy === g ? '#6D28D9' : '#4B5563',
                            fontSize: '0.78rem', fontWeight: groupBy === g ? 600 : 500,
                            cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                          }}
                          onMouseEnter={e => { if (groupBy !== g) e.currentTarget.style.background = '#F9FAFB'; }}
                          onMouseLeave={e => { if (groupBy !== g) e.currentTarget.style.background = 'white'; }}
                        >
                          {g === 'estado' ? '📋 Estado' : g === 'territorial' ? '📍 Territorial' : '👤 Dedicación'}
                        </button>
                      ))}
                      <button
                        onClick={() => setGroupBy('')}
                        style={{
                          width: '100%', padding: '8px 14px', border: 'none', borderTop: '1px solid #E5E7EB',
                          background: '#F9FAFB', color: '#DC2626', fontSize: '0.72rem', fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                        onMouseLeave={e => e.currentTarget.style.background = '#F9FAFB'}
                      >
                        ✕ Quitar agrupación
                      </button>
                    </div>,
                    document.body
                  )}
                </div>
                {/* Activity Feed */}
                <button
                  onClick={() => setShowActivityFeed(!showActivityFeed)}
                  style={{
                    width: 32, height: 32, borderRadius: 6, border: '1px solid #E5E7EB',
                    background: showActivityFeed ? '#ECFDF5' : 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: showActivityFeed ? '#059669' : '#6B7280', transition: 'all 0.15s',
                    position: 'relative',
                  }}
                  title="Feed de actividad"
                >
                  <Activity style={{ width: 15, height: 15 }} />
                  {activityLog.length > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      padding: '1px 4px', borderRadius: 10, background: '#10B981', color: 'white',
                      fontSize: '0.55rem', fontWeight: 800, lineHeight: 1.3,
                    }}>
                      {activityLog.length > 9 ? '9+' : activityLog.length}
                    </span>
                  )}
                </button>
                {/* Refresh */}
                <button
                  onClick={() => { loadData(); toast.success('Datos actualizados'); }}
                  style={{
                    width: 32, height: 32, borderRadius: 6, border: '1px solid #E5E7EB',
                    background: refreshCountdown < 15 ? '#FFFBEB' : 'white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: refreshCountdown < 15 ? '#D97706' : '#6B7280', transition: 'all 0.15s',
                  }}
                  title={`Sincronizar (Última: ${lastRefreshed.toLocaleTimeString()})`}
                >
                  <RefreshCw style={{ width: 15, height: 15, transform: refreshCountdown < 15 ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s ease-in-out' }} />
                </button>
              </>
            }
            exportAction={
              <ExportadorReportesPTA
                data={filteredPtas}
                columns={[
                  { key: 'id', label: 'ID' },
                  { key: 'docente_nombre', label: 'Docente' },
                  { key: 'dedicacion', label: 'Dedicación' },
                  { key: 'estado', label: 'Estado' },
                  { key: 'periodo', label: 'Periodo' },
                  { key: 'total_horas_programadas', label: 'Horas Prog.' },
                  { key: 'horas_a_programar', label: 'Horas Disp.' },
                ]}
                filename="ptas_gestion"
                title="Exportar Reporte"
                variant="compact"
              />
            }
          />

          {filtroEstado === 'sna' ? (
            <div className="mt-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              <PanelSNA_PTA onVerDetalle={(pta) => setSelectedPTA(pta)} />
            </div>
          ) : (
            <>
              {/* Tag filter active indicators (inline, no wrapper card needed) */}
              {filtroTags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                  {filtroTags.map(tag => {
                    const tagObj = allUniqueTags.find(t => t.label === tag);
                    return (
                      <span
                        key={tag}
                        onClick={() => setFiltroTags(prev => prev.filter(t => t !== tag))}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3,
                          padding: '2px 8px', borderRadius: 10,
                          background: tagObj?.color || '#003DA5',
                          color: 'white', fontSize: '0.68rem', fontWeight: 600,
                          cursor: 'pointer', transition: 'opacity 0.15s',
                        }}
                        title={`Clic para quitar filtro "${tag}"`}
                      >
                        {tag} <X style={{ width: 9, height: 9 }} />
                      </span>
                    );
                  })}
                  <button
                    onClick={() => setFiltroTags([])}
                    style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: '0.68rem', color: '#DC2626', fontWeight: 600, padding: '2px 4px',
                    }}
                  >
                    Limpiar
                  </button>
                </div>
              )}

          {/* Feature 22: Grouping active indicator */}
          {groupBy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                borderRadius: 8, marginBottom: 12, fontSize: '0.78rem',
                background: '#EDE9FE', border: '1px solid #DDD6FE', color: '#5B21B6',
              }}
            >
              <Layers style={{ width: 12, height: 12 }} />
              <span>Agrupado por: <strong>{groupBy === 'estado' ? 'Estado' : groupBy === 'territorial' ? 'Territorial' : 'Dedicación'}</strong></span>
              <button
                onClick={() => { setGroupBy(''); setCollapsedGroups(new Set()); }}
                style={{
                  marginLeft: 'auto', padding: '2px 8px', borderRadius: 5,
                  border: '1px solid #C4B5FD', background: 'white', color: '#5B21B6',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <X style={{ width: 10, height: 10 }} /> Quitar agrupación
              </button>
            </motion.div>
          )}

          {/* Feature 25: Compare ready indicator */}
          {compareIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                borderRadius: 8, marginBottom: 12, fontSize: '0.78rem',
                background: '#ECFEFF', border: '1px solid #A5F3FC', color: '#0E7490',
              }}
            >
              <GitCompare style={{ width: 12, height: 12 }} />
              <span>{compareIds.length}/2 PTAs seleccionados para comparar</span>
              {compareIds.length === 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  style={{
                    padding: '3px 10px', borderRadius: 5, border: 'none',
                    background: '#0891B2', color: 'white', fontSize: '0.72rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <Eye style={{ width: 10, height: 10 }} /> Ver comparación
                </button>
              )}
              <button
                onClick={() => setCompareIds([])}
                style={{
                  marginLeft: 'auto', padding: '2px 8px', borderRadius: 5,
                  border: '1px solid #A5F3FC', background: 'white', color: '#0E7490',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <X style={{ width: 10, height: 10 }} /> Limpiar
              </button>
            </motion.div>
          )}

          {/* ═══ Feature 20: Activity Timeline Feed ═══ */}
          <AnimatePresence>
            {showActivityFeed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
                  marginBottom: 14, overflow: 'hidden',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px', borderBottom: '1px solid #F3F4F6',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity style={{ width: 14, height: 14, color: '#059669' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                      Actividad Reciente
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                      ({activityLog.length} evento{activityLog.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {activityLog.length > 0 && (
                      <button
                        onClick={() => setActivityLog([])}
                        style={{
                          padding: '3px 8px', borderRadius: 5, border: '1px solid #E5E7EB',
                          background: 'white', color: '#9CA3AF', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        Limpiar
                      </button>
                    )}
                    <button
                      onClick={() => setShowActivityFeed(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <X style={{ width: 14, height: 14, color: '#9CA3AF' }} />
                    </button>
                  </div>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {activityLog.length === 0 ? (
                    <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: '0.78rem', color: '#9CA3AF' }}>
                      No hay actividad registrada en esta sesión. Las acciones de aprobación, devolución y rechazo aparecerán aquí.
                    </div>
                  ) : (
                    activityLog.map((act, ai) => {
                      const typeConfig = {
                        aprobacion: { icon: CheckCircle, color: '#059669', bg: '#D1FAE5', label: 'Aprobación' },
                        devolucion: { icon: RotateCcw, color: '#D97706', bg: '#FEF3C7', label: 'Devolución' },
                        rechazo: { icon: XCircle, color: '#DC2626', bg: '#FEE2E2', label: 'Rechazo' },
                        portal: { icon: Globe, color: '#7C3AED', bg: '#F3E8FF', label: 'Portal' },
                        sistema: { icon: Database, color: '#6B7280', bg: '#F3F4F6', label: 'Sistema' },
                      }[act.type];
                      const Icon = typeConfig.icon;
                      const timeAgo = (() => {
                        const ms = Date.now() - new Date(act.at).getTime();
                        if (ms < 60000) return 'ahora';
                        if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
                        return `${Math.floor(ms / 3600000)}h`;
                      })();
                      return (
                        <div key={act.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 16px',
                          borderBottom: ai < activityLog.length - 1 ? '1px solid #F9FAFB' : 'none',
                          fontSize: '0.78rem',
                        }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                            background: typeConfig.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginTop: 1,
                          }}>
                            <Icon style={{ width: 12, height: 12, color: typeConfig.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, color: '#111827' }}>{act.docente}</span>
                              <span style={{
                                padding: '1px 5px', borderRadius: 4,
                                background: typeConfig.bg, color: typeConfig.color,
                                fontSize: '0.58rem', fontWeight: 700,
                              }}>
                                {typeConfig.label}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 1 }}>
                              {act.message} — <span style={{ fontWeight: 600 }}>{act.estado}</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.62rem', color: '#9CA3AF', flexShrink: 0, marginTop: 2 }}>
                            {timeAgo}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Atención requerida: Banner cuando hay PTAs pendientes de aprobación ── */}
          {!filtroEstado && !loading && permisos.puedeAprobar && listaPendientesAprobar.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', borderRadius: 12, marginBottom: 12,
                  background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
                  border: '1.5px solid #FDBA74',
                  boxShadow: '0 2px 8px rgba(234,88,12,0.1)',
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: '#EA580C', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap style={{ width: 16, height: 16, color: 'white' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7C2D12' }}>
                    {listaPendientesAprobar.length} PTA{listaPendientesAprobar.length > 1 ? 's' : ''} requiere{listaPendientesAprobar.length === 1 ? '' : 'n'} tu aprobación
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#C2410C', marginTop: 1 }}>
                    Abre el detalle del PTA para revisar, aprobar o devolver segun el nivel actual del flujo.
                  </div>
                </div>
                <button
                  onClick={() => setFiltroEstado('pendientes')}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none',
                    background: '#EA580C', color: 'white', fontSize: '0.75rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    flexShrink: 0, transition: 'all 0.15s',
                    boxShadow: '0 2px 6px rgba(234,88,12,0.35)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'none'}
                >
                  <CheckCircle style={{ width: 13, height: 13 }} />
                  Ver pendientes
                </button>
              </motion.div>
          )}

          {/* ═══ Feature 17: Shift+Click hint ═══ */}
          {selectedIds.size > 0 && selectedIds.size < 3 && (
            <div style={{
              fontSize: '0.65rem', color: '#9CA3AF', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px',
            }}>
              <Zap style={{ width: 10, height: 10 }} />
              <span>Mantén <kbd style={{ padding: '0 3px', borderRadius: 3, background: '#F3F4F6', border: '1px solid #E5E7EB', fontSize: '0.6rem', fontWeight: 700 }}>Shift</kbd> y haz clic para seleccionar un rango</span>
            </div>
          )}

          {/* Batch Actions Bar */}
          {selectedIds.size > 0 && permisos.puedeAprobar && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 12,
                background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)',
                color: 'white', boxShadow: '0 4px 16px rgba(0,61,165,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle style={{ width: 16, height: 16 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                      {selectedIds.size} PTA{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>Acciones de lote disponibles</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowBatchApproval(true)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      backdropFilter: 'blur(4px)', transition: 'all 0.15s',
                    }}
                  >
                    <Send style={{ width: 12, height: 12 }} /> Aprobar Lote
                  </button>
                  <button
                    onClick={() => setShowBatchDevolucion(true)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      backdropFilter: 'blur(4px)', transition: 'all 0.15s',
                    }}
                  >
                    <RotateCcw style={{ width: 12, height: 12 }} /> Devolver Lote
                  </button>
                  {/* Feature 30: Bulk Notification */}
                  <button
                    onClick={() => setShowBulkNotify(true)}
                    style={{
                      padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.4)',
                      background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '0.78rem', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <Bell style={{ width: 12, height: 12 }} /> Notificar
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    style={{
                      padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
                      background: 'transparent', color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: 500,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <X style={{ width: 12, height: 12 }} /> Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* PTA List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 14, border: '1px solid #E5E7EB' }}>
              <ESAPLogoLoader size={64} text="" />
              <p style={{ color: '#374151', fontSize: '0.9rem', fontWeight: 600, margin: '4px 0 6px' }}>Cargando PTAs...</p>
              <p style={{ color: '#9CA3AF', fontSize: '0.82rem', margin: 0 }}>Obteniendo datos del periodo {filtroPeriodo}</p>
            </div>
          ) : filteredPtas.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              {/* Empty illustration */}
              <div style={{ padding: '48px 24px 24px', textAlign: 'center', background: 'linear-gradient(135deg, #F8FAFF 0%, #EFF6FF 100%)', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, margin: '0 auto 16px', background: 'white', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,61,165,0.08)' }}>
                  <FileText style={{ width: 32, height: 32, color: '#003DA5' }} />
                </div>
                <p style={{ fontWeight: 800, color: '#111827', fontSize: '1.05rem', margin: '0 0 8px' }}>
                  {searchQuery ? `Sin resultados para "${searchQuery}"` : 'No se encontraron PTAs'}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '0 auto', maxWidth: 400, lineHeight: 1.6 }}>
                  {searchQuery
                    ? 'Intenta con otros términos de búsqueda o amplía los filtros.'
                    : 'Ajusta los filtros de estado o periodo, o verifica que existan PTAs registrados para este periodo.'}
                </p>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <X style={{ width: 13, height: 13 }} /> Limpiar búsqueda
                  </button>
                )}
                {filtroEstado && (
                  <button
                    onClick={() => setFiltroEstado('')}
                    style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <RotateCcw style={{ width: 13, height: 13 }} /> Ver todos los estados
                  </button>
                )}
                <button
                  onClick={() => loadData()}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <RefreshCw style={{ width: 13, height: 13 }} /> Recargar datos
                </button>
              </div>
            </div>
          ) : filtroEstado === 'SEGUIMIENTO' ? (
            <div style={{ marginTop: 16 }}>
              <ReporteSeguimientoPTA />
            </div>
          ) : (() => {
            // ── Sort + Paginate (Feature 23: pinned first, Feature 33: priority order) ──
            const sorted = [...filteredPtas].sort((a: any, b: any) => {
              // Pinned items always come first
              const aPin = pinnedIds.has(a.id) ? 0 : 1;
              const bPin = pinnedIds.has(b.id) ? 0 : 1;
              if (aPin !== bPin) return aPin - bPin;
              // Feature 33: Priority order (drag & drop) — items in priorityOrder come before others, in that order
              if (priorityOrder.length > 0) {
                const aPri = priorityOrder.indexOf(a.id);
                const bPri = priorityOrder.indexOf(b.id);
                if (aPri >= 0 && bPri >= 0) return aPri - bPri;
                if (aPri >= 0) return -1;
                if (bPri >= 0) return 1;
              }
              const aVal = a[sortBy] || '';
              const bVal = b[sortBy] || '';
              if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
              }
              return sortDir === 'asc'
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
            });
            const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
            const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

            const onSort = (f: string) => {
              if (sortBy === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
              else { setSortBy(f); setSortDir('asc'); }
            };

            const renderRowActions = (pta: any) => {
              const isPendiente = isEstadoPendienteAprobacion(pta.estado);
              const canApproveThisLevel = isPendiente && permisos.puedeAprobar && puedeAprobarPorNivel(pta.estado, permisos.nivelAprobacion, isSuperUserEffective);
              const isPinned = pinnedIds.has(pta.id);
              const hasNote = !!inlineNotes[pta.id];
              const isComparing = compareIds.includes(pta.id);
              const hasTags = (ptaTags[pta.id] || []).length > 0;
              const isExpanded = expandedRowId === pta.id;

              // ── World-class contextual primary action ──
              const getPrimaryAction = () => {
                if (pta.estado === 'EN_CONCERTACION') {
                  return {
                    label: 'Concertar',
                    icon: MessageSquare,
                    bg: '#F3E8FF', color: '#6B21A8', border: '1px solid #DDD6FE',
                    action: () => setConcertacionPtaId(pta.id),
                    title: 'Ir a mesa de concertación',
                  };
                }
                if (pta.estado === 'NOTIFICADO_DOCENTE') {
                  return {
                    label: 'Esperando',
                    icon: Clock,
                    bg: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A',
                    action: () => setSelectedPTA(pta),
                    title: 'Esperando respuesta del docente',
                  };
                }
                if (pta.estado === 'OBJETADO_DOCENTE' || pta.estado === 'MODIFICADO_DOCENTE') {
                  return {
                    label: 'Revisar',
                    icon: Eye,
                    bg: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE',
                    action: () => setSelectedPTA(pta),
                    title: 'Revisar objeción/modificación del docente',
                  };
                }
                if (pta.estado === 'Devuelto') {
                  return {
                    label: 'Devuelto',
                    icon: RotateCcw,
                    bg: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA',
                    action: () => setSelectedPTA(pta),
                    title: 'PTA devuelto con observaciones',
                  };
                }
                return null;
              };

              const primaryAction = getPrimaryAction();

              return (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                  {/* ── World-class Primary Action ── */}
                  {primaryAction ? (
                    <button
                      onClick={primaryAction.action}
                      title={`${primaryAction.label}: ${primaryAction.title}`}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: primaryAction.bg, color: primaryAction.color,
                        border: primaryAction.border,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                        boxShadow: primaryAction.bg === '#003DA5' ? '0 2px 8px rgba(0,61,165,0.3)' : 'none',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <primaryAction.icon style={{ width: 16, height: 16 }} />
                    </button>
                  ) : (
                    isPendiente && permisos.puedeAprobar && !canApproveThisLevel && (
                      <span style={{
                        width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A',
                        color: '#D97706', cursor: 'help',
                      }} title={`Nivel insuficiente. Requiere nivel ${getNivelRequeridoAprobacion(pta.estado) || '?'}`}>
                        <AlertTriangle style={{ width: 16, height: 16 }} />
                      </span>
                    )
                  )}

                  {/* ── Dropdown: Acciones Secundarias ── */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        if (showMoreMenuPtaId === pta.id) {
                          setShowMoreMenuPtaId(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setPopoverPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setShowMoreMenuPtaId(pta.id);
                          setShowTagPicker(null);
                          setInlineNotePtaId(null);
                        }
                      }}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                        background: showMoreMenuPtaId === pta.id ? '#F3F4F6' : 'white',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      title="Más acciones"
                      onMouseEnter={e => { if (showMoreMenuPtaId !== pta.id) e.currentTarget.style.background = '#F9FAFB'; }}
                      onMouseLeave={e => { if (showMoreMenuPtaId !== pta.id) e.currentTarget.style.background = 'white'; }}
                    >
                      <MoreHorizontal style={{ width: 16, height: 16, color: '#4B5563' }} />
                    </button>
                    
                    {showMoreMenuPtaId === pta.id && createPortal(
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowMoreMenuPtaId(null)} />
                        <div style={{
                          position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999,
                          background: 'white', borderRadius: 8, border: '1px solid #E5E7EB',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: 190, overflow: 'hidden',
                          display: 'flex', flexDirection: 'column', padding: '4px 0'
                        }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setSelectedPTA(pta); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Eye style={{ width: 14, height: 14 }} /> Ver detalle completo</button>
                          <button onClick={() => { setExpandedRowId(isExpanded ? null : pta.id); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{isExpanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />} {isExpanded ? 'Contraer in-line' : 'Expandir in-line'}</button>
                          {/* Traza del proceso — movido al tab "Historial" en detalle completo */}
                          {/* <button onClick={() => { setTrazaPta(pta); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Clock style={{ width: 14, height: 14 }} /> Traza del proceso</button> */}
                          <div style={{ height: 1, background: '#E5E7EB', margin: '4px 0' }} />
                          <button onClick={() => { setShowTagPicker(showTagPicker === pta.id ? null : pta.id); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Tag style={{ width: 14, height: 14 }} /> Etiquetas {hasTags && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#003DA5', marginLeft: 'auto' }} />}</button>
                          <button onClick={() => { setInlineNotePtaId(inlineNotePtaId === pta.id ? null : pta.id); setInlineNoteText(inlineNotes[pta.id] || ''); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><StickyNote style={{ width: 14, height: 14 }} /> Nota rápida {hasNote && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', marginLeft: 'auto' }} />}</button>
                          <button onClick={() => { togglePin(pta.id); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Star style={{ width: 14, height: 14, color: isPinned ? '#D97706' : 'currentColor', fill: isPinned ? '#D97706' : 'none' }} /> {isPinned ? 'Desanclar' : 'Anclar al inicio'}</button>
                          <button onClick={() => { toggleCompare(pta.id); setShowMoreMenuPtaId(null); }} style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#374151', width: '100%' }} onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><GitCompare style={{ width: 14, height: 14 }} /> {isComparing ? 'Quit. comparación' : 'Comparar'}</button>
                          {perfil?.rol === 'admin' && (
                            <>
                              <div style={{ height: 1, background: '#E5E7EB', margin: '4px 0' }} />
                              <button
                                onClick={async () => {
                                  setShowMoreMenuPtaId(null);
                                  if (!window.confirm(`¿Eliminar definitivamente el PTA de ${pta.docente_nombre} (${pta.periodo})?\n\nEsta acción no se puede deshacer.`)) return;
                                  const result = await deletePTA(pta.id);
                                  if (result.success) { toast.success('PTA eliminado'); loadData(); }
                                  else toast.error(result.message || 'Error al eliminar el PTA');
                                }}
                                style={{ padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#DC2626', width: '100%', fontWeight: 600 }}
                                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                <Trash2 style={{ width: 14, height: 14 }} /> Eliminar PTA
                              </button>
                            </>
                          )}
                        </div>
                      </>,
                      document.body
                    )}

                    {/* Tag Picker (absolute attached to the action row) */}
                    {showTagPicker === pta.id && createPortal(
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowTagPicker(null)} />
                        <div style={{
                          position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999,
                          background: 'white', borderRadius: 10, border: '1px solid #E5E7EB',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220, overflow: 'hidden',
                        }} onClick={e => e.stopPropagation()}>
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', fontSize: '0.65rem', fontWeight: 700, color: '#003DA5', textTransform: 'uppercase' }}>
                            Etiquetas
                          </div>
                          {(ptaTags[pta.id] || []).length > 0 && (
                            <div style={{ padding: '6px 10px', display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #F3F4F6' }}>
                              {(ptaTags[pta.id] || []).map(tag => (
                                <span key={tag.label} style={{
                                  padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
                                  background: `${tag.color}15`, color: tag.color, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                                }} onClick={() => removeTag(pta.id, tag.label)} title="Clic para eliminar">
                                  {tag.label} <X style={{ width: 7, height: 7 }} />
                                </span>
                              ))}
                            </div>
                          )}
                          <div style={{ padding: '6px 10px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                              {['Urgente', 'Revisado', 'Incompleto', 'Destacado', 'Seguimiento'].map((preset, pi) => (
                                <button key={preset} onClick={() => addTag(pta.id, preset, TAG_COLORS[pi % TAG_COLORS.length])} style={{
                                  padding: '2px 6px', borderRadius: 4, border: '1px solid #E5E7EB', background: 'white',
                                  fontSize: '0.6rem', fontWeight: 600, color: TAG_COLORS[pi % TAG_COLORS.length], cursor: 'pointer',
                                }}>{preset}</button>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <input
                                autoFocus
                                type="text" value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)}
                                placeholder="Nueva etiqueta..."
                                style={{ flex: 1, padding: '3px 6px', borderRadius: 4, border: '1px solid #D1D5DB', fontSize: '0.68rem', outline: 'none' }}
                                onKeyDown={e => { if (e.key === 'Enter' && newTagLabel.trim()) { addTag(pta.id, newTagLabel.trim(), TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]); } }}
                              />
                              <button
                                onClick={() => { if (newTagLabel.trim()) addTag(pta.id, newTagLabel.trim(), TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]); }}
                                style={{ padding: '3px 8px', borderRadius: 4, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer' }}
                              >+</button>
                            </div>
                          </div>
                        </div>
                      </>,
                      document.body
                    )}

                    {/* Quick Note Editor */}
                    {inlineNotePtaId === pta.id && createPortal(
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setInlineNotePtaId(null)} />
                        <div style={{
                          position: 'fixed', top: popoverPos.top, right: popoverPos.right, zIndex: 9999,
                          background: 'white', borderRadius: 10, border: '1px solid #E5E7EB',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 220, overflow: 'hidden',
                        }} onClick={e => e.stopPropagation()}>
                          <div style={{ padding: '8px 10px', borderBottom: '1px solid #F3F4F6', fontSize: '0.65rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase' }}>
                            Nota rápida
                          </div>
                          <div style={{ padding: '8px 10px' }}>
                            <textarea
                              autoFocus
                              value={inlineNoteText}
                              onChange={e => setInlineNoteText(e.target.value)}
                              placeholder="Escribir nota..."
                              rows={3}
                              style={{
                                width: '100%', padding: 8, borderRadius: 6, border: '1px solid #D1D5DB',
                                fontSize: '0.78rem', resize: 'none', outline: 'none', fontFamily: 'inherit',
                              }}
                              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) saveInlineNote(pta.id, inlineNoteText); }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                              {hasNote && (
                                <button
                                  onClick={() => saveInlineNote(pta.id, '')}
                                  style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: '0.62rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Eliminar
                                </button>
                              )}
                              <button
                                onClick={() => saveInlineNote(pta.id, inlineNoteText)}
                                style={{ padding: '3px 10px', borderRadius: 5, border: 'none', background: '#7C3AED', color: 'white', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
                              >
                                Guardar
                              </button>
                            </div>
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                  </div>
                </div>
              );
            };

            return (
              <>
                {/* Feature 33: Priority Order indicator */}
                {priorityOrder.length > 0 && viewMode === 'table' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 12px', marginBottom: 8, borderRadius: 8,
                    background: '#F0FDF4', border: '1px solid #BBF7D0',
                    fontSize: '0.72rem', color: '#15803D',
                  }}>
                    <GripVertical style={{ width: 13, height: 13 }} />
                    <span style={{ fontWeight: 600 }}>Orden personalizado activo</span>
                    <span style={{ color: '#16A34A' }}>({priorityOrder.length} PTAs priorizados)</span>
                    <button
                      onClick={() => { setPriorityOrder([]); toast('Orden de prioridad restablecido'); }}
                      style={{
                        marginLeft: 'auto', border: 'none', background: 'transparent',
                        cursor: 'pointer', fontSize: '0.68rem', color: '#DC2626', fontWeight: 600,
                        padding: '2px 6px', borderRadius: 4,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      Restablecer orden
                    </button>
                  </div>
                )}
                {/* Feature 32: Persistence indicator */}
                {userDataLoaded && (Object.keys(ptaTags).length > 0 || Object.keys(inlineNotes).length > 0) && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', marginBottom: 6, borderRadius: 6,
                    background: '#FAFAFA', fontSize: '0.65rem', color: '#9CA3AF',
                  }}>
                    <Database style={{ width: 10, height: 10 }} />
                    <span>Tags y notas sincronizados con Supabase</span>
                    {Object.keys(ptaTags).length > 0 && <span>· {Object.keys(ptaTags).length} PTAs con tags</span>}
                    {Object.keys(inlineNotes).length > 0 && <span>· {Object.keys(inlineNotes).length} notas</span>}
                  </div>
                )}
                {viewMode === 'table' ? (() => {
                  // ═══ Feature 19: Dynamic grid based on visible columns ═══
                  const colSizes: Record<string, string> = {
                    docente: 'minmax(260px, 4fr)',
                    estado: 'minmax(210px, 1.15fr)',
                    aging: 'minmax(55px, 0.4fr)', 
                    fecha: 'minmax(78px, 0.5fr)',
                    hora: 'minmax(76px, 0.5fr)',
                    dedicacion: 'minmax(58px, 0.4fr)',
                    carga: 'minmax(96px, 0.7fr)',
                    componentes: 'minmax(132px, 1.2fr)',
                    territorial: 'minmax(120px, 1fr)',
                    periodo: 'minmax(78px, 0.6fr)',
                  };
                  const colMinWidths: Record<string, number> = {
                    docente: 260,
                    estado: 210,
                    aging: 55,
                    fecha: 78,
                    hora: 76,
                    dedicacion: 58,
                    carga: 96,
                    componentes: 132,
                    territorial: 120,
                    periodo: 78,
                  };
                  const activeCols = ALL_COLUMNS.filter(c => effectiveCols.has(c.key));
                  const gridCols = [
                    ...activeCols.map(c => colSizes[c.key] || '100px'),
                    'minmax(60px, 0.5fr)', // acciones
                  ].join(' ');
                  const minW = activeCols.reduce((sum, col) => sum + (colMinWidths[col.key] || 100), 72) + (activeCols.length * 16);
                  const tableMinWidth = `max(${minW}px, 100%)`;

                  return (
                  <div ref={tableContainerRef} style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                    {/* Responsive scroll wrapper — Feature 18: sticky header via overflow */}
                    <div className="pta-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 0 }}>
                    {/* Table Header — Feature 18: Sticky */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: gridCols,
                      columnGap: 16, rowGap: 0, padding: '12px 16px',
                      borderBottom: '2px solid #E5E7EB', background: '#F9FAFB',
                      fontSize: '0.8rem', fontWeight: 800, color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.04em',
                      minWidth: tableMinWidth,
                      position: 'sticky', top: 0, zIndex: 5,
                    }}>

                      {effectiveCols.has('docente') && <SortableHeader label="Docente" field="docente_nombre" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />}
                      {effectiveCols.has('estado') && <SortableHeader label="Estado" field="estado" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />}
                      {effectiveCols.has('aging') && <span title="Días en estado actual">Días</span>}
                      {effectiveCols.has('fecha') && <span>Fecha</span>}
                      {effectiveCols.has('hora') && <span>Hora</span>}
                      {effectiveCols.has('dedicacion') && <span>Dedic.</span>}
                      {effectiveCols.has('carga') && <SortableHeader label="Carga" field="total_horas_programadas" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />}
                      {effectiveCols.has('componentes') && <span>Componentes</span>}
                      {effectiveCols.has('territorial') && <SortableHeader label="Territorial" field="territorial" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />}
                      {effectiveCols.has('periodo') && <span>Periodo</span>}
                      <span style={{ textAlign: 'right' }}>Acciones</span>
                    </div>

                    {/* Feature 22: Group headers + Table Rows */}
                    {(() => {
                      // Build group structure if groupBy is active
                      const groups: { key: string; label: string; items: any[]; startIdx: number }[] = [];
                      if (groupBy) {
                        const groupMap = new Map<string, any[]>();
                        paginated.forEach((pta: any) => {
                          const gKey = pta[groupBy] || 'Sin asignar';
                          if (!groupMap.has(gKey)) groupMap.set(gKey, []);
                          groupMap.get(gKey)!.push(pta);
                        });
                        let runIdx = 0;
                        groupMap.forEach((items, key) => {
                          groups.push({ key, label: key, items, startIdx: runIdx });
                          runIdx += items.length;
                        });
                      } else {
                        groups.push({ key: '__all', label: '', items: paginated, startIdx: 0 });
                      }
                      return groups.map(group => {
                        const isCollapsed = collapsedGroups.has(group.key);
                        return (
                          <div key={group.key}>
                            {groupBy && (
                              <div
                                onClick={() => setCollapsedGroups(prev => {
                                  const next = new Set(prev);
                                  if (next.has(group.key)) next.delete(group.key); else next.add(group.key);
                                  return next;
                                })}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 8,
                                  padding: '8px 16px', minWidth: tableMinWidth,
                                  background: '#F3F0FF', borderBottom: '1px solid #DDD6FE',
                                  cursor: 'pointer', position: 'sticky', top: 38, zIndex: 4,
                                }}
                              >
                                <ChevronRight style={{
                                  width: 12, height: 12, color: '#7C3AED',
                                  transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                                  transition: 'transform 0.15s',
                                }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5B21B6' }}>
                                  {group.label}
                                </span>
                                <span style={{
                                  padding: '1px 7px', borderRadius: 10,
                                  background: '#7C3AED', color: 'white',
                                  fontSize: '0.6rem', fontWeight: 700,
                                }}>
                                  {group.items.length}
                                </span>
                                <span style={{ fontSize: '0.62rem', color: '#7C3AED', marginLeft: 'auto' }}>
                                  {group.items.reduce((s: number, p: any) => s + (p.total_horas_programadas || 0), 0).toLocaleString()}h total
                                </span>
                              </div>
                            )}
                            {!isCollapsed && group.items.map((pta: any, localIdx: number) => {
                              const idx = group.startIdx + localIdx;
                      const sc = getStatusConfig(pta.estado);
                      const horasProg = pta.total_horas_programadas || 0;
                      const horasDisp = pta.horas_a_programar || 800;
                      const pctCarga = horasDisp > 0 ? Math.round((horasProg / horasDisp) * 100) : 0;
                      const isPendiente = isEstadoPendienteAprobacion(pta.estado);
                      const isSelected = selectedIds.has(pta.id);
                      const estadoLabel = pta.estado?.replace(/_/g, ' ') || 'Sin estado';
                      // El flujo ahora es granular por componente: en los estados "pendientes" mostramos
                      // el avance de aprobación (X/N componentes) en vez del rótulo de nivel (ej. "Pendiente Jefatura").
                      // Si el backend no envía los conteos, caemos al rótulo de estado.
                      const compAprobados = Number(pta.componentes_aprobados);
                      const compTotal = Number(pta.componentes_total);
                      const tieneAvanceComponentes = Number.isFinite(compAprobados) && Number.isFinite(compTotal) && compTotal > 0;
                      const badgeText = (isPendiente && tieneAvanceComponentes)
                        ? `${compAprobados}/${compTotal} componentes`
                        : estadoLabel;
                      const badgeTitle = (isPendiente && tieneAvanceComponentes)
                        ? `${compAprobados} de ${compTotal} componentes aprobados — ${estadoLabel}`
                        : estadoLabel;
                      const tieneTotalidadAcadAdmin = Array.isArray(pta.academico_admin) &&
                        pta.academico_admin.some((a: any) => a?.consumeTotalidad === true);

                      const aging = calcAging(pta.historialEstados, pta.updatedAt, pta.createdAt);

                      const isFocused = focusedIdx === idx;

                      return (
                        <div key={pta.id}>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.015 }}
                          onClick={() => setSelectedPTA(pta)}
                          draggable={isPendiente}
                          onDragStart={isPendiente ? (e: any) => handleDragStart(e, pta.id) : undefined}
                          onDragEnd={isPendiente ? handleDragEnd : undefined}
                          onDragOver={isPendiente ? (e: any) => handleDragOver(e, pta.id) : undefined}
                          onDrop={isPendiente ? (e: any) => handleDrop(e, pta.id, paginated) : undefined}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: gridCols,
                            columnGap: 16, rowGap: 0, padding: '16px 16px',
                            borderBottom: '1px solid #F3F4F6',
                            cursor: isPendiente ? 'grab' : 'pointer',
                            transition: 'all 0.1s',
                            background: dragOverId === pta.id ? '#DBEAFE' : isFocused ? '#F0F4FF' : isSelected ? '#EFF6FF' : 'white',
                            borderLeft: isPendiente ? `3px solid ${sc.color}` : '3px solid transparent',
                            alignItems: 'center',
                            minWidth: tableMinWidth,
                            outline: isFocused ? '2px solid #003DA5' : dragOverId === pta.id ? '2px dashed #003DA5' : 'none',
                            outlineOffset: -2,
                          }}
                          onMouseEnter={e => {
                            if (!isSelected && !isFocused) e.currentTarget.style.background = '#FAFAFA';
                          }}
                          onMouseLeave={e => {
                            if (!isSelected && !isFocused) e.currentTarget.style.background = 'white';
                          }}
                        >


                          {/* Docente */}
                          {effectiveCols.has('docente') && (
                          <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {/* Feature 33: Drag handle for pending PTAs */}
                            {isPendiente && (
                              <div
                                style={{
                                  cursor: 'grab', opacity: 0.3, transition: 'opacity 0.15s',
                                  flexShrink: 0, display: 'flex', alignItems: 'center',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '0.3'; }}
                                title="Arrastrar para reordenar prioridad"
                              >
                                <GripVertical style={{ width: 12, height: 12, color: '#9CA3AF' }} />
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {pinnedIds.has(pta.id) && <Star style={{ width: 12, height: 12, color: '#D97706', fill: '#D97706', flexShrink: 0 }} />}
                              {inlineNotes[pta.id] && (
                                <StickyNote
                                  style={{ width: 11, height: 11, color: '#7C3AED', flexShrink: 0, cursor: 'pointer' }}
                                  title={`Nota: ${inlineNotes[pta.id]}\n\nClic para editar`}
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setInlineNotePtaId(inlineNotePtaId === pta.id ? null : pta.id);
                                    setInlineNoteText(inlineNotes[pta.id] || '');
                                  }}
                                />
                              )}
                              {pta.docente_nombre || 'Docente ESAP'}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span>{pta.territorial || ''}</span>
                              {pta.programa && <span>· {pta.programa}</span>}
                              {/* Feature 29: Inline tags */}
                              {(ptaTags[pta.id] || []).map(tag => (
                                <span key={tag.label} style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 800, background: `${tag.color}12`, color: tag.color }}>{tag.label}</span>
                              ))}
                            </div>
                            </div>{/* close inner wrapper for drag handle layout */}
                          </div>
                          )}

                          {/* Estado — Feature 21: Inline Quick-Change */}
                          {effectiveCols.has('estado') && (
                          <div style={{ position: 'relative', minWidth: 0, display: 'flex', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                            <span
                              style={{
                                padding: '4px 10px', borderRadius: 6,
                                background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
                                fontSize: '0.82rem', fontWeight: 800,
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                maxWidth: '100%', minWidth: 0,
                                whiteSpace: 'normal', overflowWrap: 'break-word',
                                lineHeight: 1.15, textAlign: 'center',
                                cursor: permisos.puedeAprobar && isPendiente ? 'pointer' : 'default',
                              }}
                              onClick={() => {
                                if (permisos.puedeAprobar && isPendiente && puedeAprobarPorNivel(pta.estado, permisos.nivelAprobacion, isSuperUserEffective)) {
                                  setInlineStatusPtaId(inlineStatusPtaId === pta.id ? null : pta.id);
                                }
                              }}
                              title={permisos.puedeAprobar && isPendiente ? `Clic para cambio rápido de estado: ${badgeTitle}` : badgeTitle}
                            >
                              <span style={{ minWidth: 0 }}>{badgeText}</span>
                              {permisos.puedeAprobar && isPendiente && puedeAprobarPorNivel(pta.estado, permisos.nivelAprobacion, isSuperUserEffective) && (
                                <Zap style={{ width: 7, height: 7, flexShrink: 0 }} />
                              )}
                            </span>
                            {inlineStatusPtaId === pta.id && (
                              <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setInlineStatusPtaId(null)} />
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 9999,
                                  background: 'white', borderRadius: 8, border: '1px solid #E5E7EB',
                                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)', width: 230, overflow: 'hidden',
                                }}>
                                  <div style={{ padding: '6px 10px', borderBottom: '1px solid #F3F4F6', fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>
                                    Cambio rápido
                                  </div>
                                  {[
                                    { estado: getNextState(pta.estado), label: getNextStateLabel(pta.estado), icon: ChevronRight, color: '#059669' },
                                    { estado: 'Devuelto', label: 'Devolver', icon: RotateCcw, color: '#D97706' },
                                  ].map(opt => {
                                    const optSc = getStatusConfig(opt.estado);
                                    return (
                                      <button
                                        key={opt.estado}
                                        onClick={() => handleInlineStatusChange(pta.id, opt.estado)}
                                        disabled={procesando}
                                        style={{
                                          width: '100%', padding: '7px 10px', border: 'none',
                                          background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                          display: 'flex', alignItems: 'center', gap: 6,
                                          fontSize: '0.75rem', fontWeight: 600, color: opt.color,
                                          borderBottom: '1px solid #F9FAFB',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                      >
                                        <opt.icon style={{ width: 11, height: 11 }} />
                                        <span>{opt.label}</span>
                                        <span style={{
                                          marginLeft: 'auto', padding: '1px 5px', borderRadius: 4,
                                          background: optSc.bg, color: optSc.color, fontSize: '0.55rem', fontWeight: 700,
                                          maxWidth: 115, whiteSpace: 'normal', textAlign: 'right', lineHeight: 1.15,
                                        }}>
                                          {opt.estado.replace(/_/g, ' ')}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                          )}

                          {/* Aging */}
                          {effectiveCols.has('aging') && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <span
                              style={{
                                padding: '3px 6px', borderRadius: 5,
                                background: aging.bg, color: aging.color,
                                fontSize: '0.8rem', fontWeight: 800,
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                              }}
                              title={`${aging.days} día(s) en estado actual`}
                            >
                               <Clock style={{ width: 10, height: 10 }} />
                              {aging.label}
                            </span>
                          </div>
                          )}

                          {/* Fecha */}
                          {effectiveCols.has('fecha') && (
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                              {(pta.updatedAt || pta.updated_at || pta.createdAt) ? (
                                <><Calendar style={{ width: 11, height: 11, marginRight: 6, color: '#9CA3AF' }} /> {new Date(pta.updatedAt || pta.updated_at || pta.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '')}</>
                              ) : '—'}
                            </div>
                          )}

                          {/* Hora */}
                          {effectiveCols.has('hora') && (
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>
                              {(pta.updatedAt || pta.updated_at || pta.createdAt) ? (
                                <><Clock style={{ width: 11, height: 11, marginRight: 6 }} /> {new Date(pta.updatedAt || pta.updated_at || pta.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}</>
                              ) : '—'}
                            </div>
                          )}

                          {/* Dedicación */}
                          {effectiveCols.has('dedicacion') && (
                          <div 
                            style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 600, cursor: 'help' }}
                            title={getDedicacionTooltip(formatDedicacion(pta.dedicacion))}
                          >
                            {formatDedicacion(pta.dedicacion)}
                          </div>
                          )}

                          {/* Carga */}
                          {effectiveCols.has('carga') && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 600 }}>
                              {horasProg}/{horasDisp}h
                            </div>
                          </div>
                          )}

                          {/* Mini Component Indicators */}
                          {effectiveCols.has('componentes') && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              fontSize: '0.82rem', fontWeight: 800, minWidth: 28,
                              color: pctCarga > 100 ? '#DC2626' : pctCarga > 90 ? '#D97706' : '#374151',
                            }}>
                              {pctCarga}%
                            </span>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {[
                                { key: 'doc', keys: ['academica'], color: '#003DA5', has: pta.horas_docencia > 0 || pta.num_asignaturas > 0 || (pta.asignaturas && pta.asignaturas.length > 0) },
                                { key: 'inv', keys: ['investigacion'], color: '#7C3AED', has: pta.horas_investigacion > 0 || (pta.investigacion_actividades && pta.investigacion_actividades.length > 0) || pta.investigacion_proyecto != null },
                                { key: 'ext', keys: PTA_EXTENSION_COMPONENT_KEYS, color: '#059669', has: pta.horas_extension > 0 || (pta.extension_actividades && pta.extension_actividades.length > 0) },
                                { key: 'comp', keys: ['complementarias'], color: '#D97706', has: pta.horas_complementarias > 0 || (pta.complementarias && pta.complementarias.length > 0) },
                                { key: 'aa', keys: ['academicas_admin'], color: '#6B21A8', has: pta.horas_acad_admin > 0 || (pta.academico_admin && pta.academico_admin.length > 0) },
                              ].filter(c => !shouldRestrictByComponentPermission || c.keys.some(key => visibleComponentKeySet.has(key))).map(c => (
                                <div key={c.key} style={{
                                  width: 10, height: 10, borderRadius: 2,
                                  background: c.has ? c.color : '#E5E7EB',
                                  opacity: c.has ? 1 : 0.4,
                                }} title={`${c.key.toUpperCase()}: ${c.has ? 'Diligenciado' : 'Sin datos'}`} />
                              ))}
                            </div>
                          </div>
                          )}

                          {/* Feature 19: Optional Territorial column */}
                          {effectiveCols.has('territorial') && (
                          <div style={{ fontSize: '0.78rem', color: '#4B5563', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {pta.territorial || '—'}
                          </div>
                          )}

                          {/* Feature 19: Optional Periodo column */}
                          {effectiveCols.has('periodo') && (
                          <div style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 700 }}>
                            {pta.periodo || filtroPeriodo}
                          </div>
                          )}

                          {/* Actions */}
                          {renderRowActions(pta)}
                        </motion.div>
                        {/* Feature 28: Inline Expand Accordion */}
                        <AnimatePresence>
                          {expandedRowId === pta.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{
                                borderBottom: '2px solid #DBEAFE', background: '#F8FAFF',
                                overflow: 'hidden', minWidth: tableMinWidth,
                              }}
                            >
                              <div style={{ padding: '14px 16px 14px 52px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                                {[
                                  { label: 'Programa', value: pta.programa || (tieneTotalidadAcadAdmin ? 'No aplica' : '—'), color: '#003DA5', icon: GraduationCap },
                                  { label: 'Territorial', value: pta.territorial || (tieneTotalidadAcadAdmin ? 'No aplica' : '—'), color: '#059669', icon: MapPin },
                                  { label: 'Horas Docencia', value: pta.horas_docencia || 0, color: '#003DA5', icon: BookOpen, keys: ['academica'] },
                                  { label: 'Horas Investigación', value: pta.horas_investigacion || 0, color: '#7C3AED', icon: FlaskConical, keys: ['investigacion'] },
                                  { label: 'Horas Extensión', value: pta.horas_extension || 0, color: '#059669', icon: Globe, keys: PTA_EXTENSION_COMPONENT_KEYS },
                                  { label: 'Horas Complementarias', value: pta.horas_complementarias || 0, color: '#D97706', icon: Briefcase, keys: ['complementarias'] },
                                  { label: 'Horas Acad. Admin.', value: pta.horas_acad_admin || 0, color: '#6B21A8', icon: Users, keys: ['academicas_admin'] },
                                  { label: 'Num. Asignaturas', value: pta.num_asignaturas || 0, color: '#0891B2', icon: BookOpen, keys: ['academica'] },
                                ].filter(item => !item.keys || !shouldRestrictByComponentPermission || item.keys.some(key => visibleComponentKeySet.has(key))).map(item => {
                                  const ItemIcon = item.icon;
                                  return (
                                    <div key={item.label} style={{
                                      padding: '8px 12px', borderRadius: 8, background: 'white',
                                      border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 8,
                                    }}>
                                      <div style={{
                                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                                        background: `${item.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      }}>
                                        <ItemIcon style={{ width: 12, height: 12, color: item.color }} />
                                      </div>
                                      <div>
                                        <div style={{ fontSize: '0.6rem', color: '#9CA3AF', fontWeight: 500, textTransform: 'uppercase' }}>{item.label}</div>
                                        <div style={{
                                          fontSize: '0.92rem', fontWeight: 800,
                                          color: typeof item.value === 'number' ? (item.value > 0 ? '#111827' : '#D1D5DB') : '#111827',
                                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>{item.value}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              {/* Tags inline display */}
                              {(ptaTags[pta.id] || []).length > 0 && (
                                <div style={{ padding: '0 16px 10px 52px', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <Tag style={{ width: 10, height: 10, color: '#9CA3AF' }} />
                                  {(ptaTags[pta.id] || []).map(tag => (
                                    <span key={tag.label} style={{
                                      padding: '1px 7px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
                                      background: `${tag.color}15`, color: tag.color,
                                    }}>{tag.label}</span>
                                  ))}
                                </div>
                              )}
                              {/* Quick actions */}
                              <div style={{ padding: '0 16px 12px 52px', display: 'flex', gap: 6 }}>
                                <button onClick={() => { setExpandedRowId(null); setSelectedPTA(pta); }} style={{
                                  padding: '5px 12px', borderRadius: 6, border: '1px solid #E5E7EB', background: 'white',
                                  color: '#374151', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                  <Eye style={{ width: 10, height: 10 }} /> Ver detalle completo
                                </button>
                                {pta.historial_aprobaciones?.length > 0 && (
                                  <span style={{ fontSize: '0.65rem', color: '#9CA3AF', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Activity style={{ width: 9, height: 9 }} />
                                    {pta.historial_aprobaciones.length} paso(s) en historial
                                  </span>
                                )}
                                {inlineNotes[pta.id] && (
                                  <span style={{ fontSize: '0.65rem', color: '#7C3AED', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <StickyNote style={{ width: 9, height: 9 }} /> {inlineNotes[pta.id]}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        </div>
                      );
                    })}
                          </div>
                        );
                      });
                    })()}
                  </div>{/* close responsive scroll wrapper */}
                  </div>
                  );
                })() : (
                  /* ═══ KANBAN VIEW ═══ */
                  <KanbanPTA />
                )}

                {/* ═══ World-Class Unified Footer (Feature 15 & Pagination) ═══ */}
                {viewMode === 'table' && paginated.length > 0 && (() => {
                  const totalHorasProg = paginated.reduce((sum: number, p: any) => sum + (p.total_horas_programadas || 0), 0);
                  const totalHorasDisp = paginated.reduce((sum: number, p: any) => sum + (p.horas_a_programar || 800), 0);
                  const avgCarga = totalHorasDisp > 0 ? Math.round((totalHorasProg / totalHorasDisp) * 100) : 0;
                  const pendCount = paginated.filter((p: any) => isEstadoPendienteAprobacion(p.estado)).length;
                  const aprobCount = paginated.filter((p: any) => p.estado === 'Aprobado').length;
                  
                  return (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', background: 'white', borderTop: '1px solid #E5E7EB',
                      borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
                      boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.5)',
                      flexWrap: 'wrap', gap: 16
                    }}>
                      {/* Left: Premium Summary Data */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#6B7280' }}>
                          <Sigma style={{ width: 14, height: 14, color: '#9CA3AF' }} />
                          <span style={{ fontWeight: 600 }}>Carga Académica Total:</span>
                          <span style={{ fontWeight: 800, color: '#111827' }}>{totalHorasProg.toLocaleString()}h</span>
                          <span>/ {totalHorasDisp.toLocaleString()}h</span>
                          <span style={{
                            marginLeft: 4, padding: '2px 8px', borderRadius: 20,
                            fontSize: '0.68rem', fontWeight: 800,
                            background: avgCarga > 100 ? '#FEE2E2' : avgCarga > 90 ? '#FEF3C7' : '#DCFCE7',
                            color: avgCarga > 100 ? '#DC2626' : avgCarga > 90 ? '#D97706' : '#166534',
                            border: `1px solid ${avgCarga > 100 ? '#FCA5A5' : avgCarga > 90 ? '#FDE68A' : '#BBF7D0'}`
                          }}>
                            {avgCarga}% Promedio
                          </span>
                        </div>
                        <div style={{ width: 1, height: 24, background: '#E5E7EB' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#4B5563' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} />
                            {pendCount} Pendientes
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#4B5563' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
                            {aprobCount} Aprobados
                          </div>
                        </div>
                      </div>

                      {/* Right: Modern Pagination Inside Same Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                            Mostrar:
                          </span>
                          <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                            style={{
                              padding: '2px 6px',
                              borderRadius: 6,
                              border: '1px solid #D1D5DB',
                              fontSize: '0.75rem',
                              color: '#374151',
                              outline: 'none',
                              background: 'white',
                            }}
                          >
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500 }}>
                          Mostrando <strong style={{color: '#111827'}}>{paginated.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> - <strong style={{color: '#111827'}}>{(currentPage - 1) * pageSize + paginated.length}</strong> de <strong style={{color: '#111827'}}>{filteredPtas.length}</strong> registros
                        </span>
                        
                        {totalPages > 1 && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              style={{
                                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: 8, border: '1px solid #E5E7EB', background: currentPage === 1 ? '#F9FAFB' : 'white',
                                color: currentPage === 1 ? '#D1D5DB' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <ChevronDown style={{ width: 16, height: 16, transform: 'rotate(90deg)' }} />
                            </button>
                            
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', padding: '0 4px' }}>
                              Pág {currentPage} / {totalPages}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              style={{
                                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: 8, border: '1px solid #E5E7EB', background: currentPage === totalPages ? '#F9FAFB' : 'white',
                                color: currentPage === totalPages ? '#D1D5DB' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <ChevronDown style={{ width: 16, height: 16, transform: 'rotate(-90deg)' }} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}



                {/* Modern Pagination moved inside the Unified Footer above */}
              </>
            );
          })()}
          </>
          )}
        </div>
      )}

      {/* ═══ PANEL: Detalle PTA (Slide-out Notion-style) ═══ */}
      {createPortal(
        <AnimatePresence>
          {selectedPTA && showReporteR01 && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 920, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: 20 }}
              >
                <ReporteIndividualPTA pta={selectedPTA} onClose={() => setShowReporteR01(false)} reporteVersion={(selectedPTA?.historialEstados || []).filter((h: any) => h.snapshotPta && typeof h.snapshotPta === 'object').length || 1} />
              </motion.div>
            </div>
          )}
          {selectedPTA && !showReporteR01 && (
            <PTADetallePanelBackoffice
              pta={selectedPTA}
              onClose={() => { setSelectedPTA(null); setShowReporteR01(false); setShowApproval(false); setShowDevolucion(false); }}
              onAprobar={() => { setSelectedPTA(null); loadData(); }}
              onDevolver={() => { setSelectedPTA(null); loadData(); }}
              onUpdated={(updatedPta) => {
                setPtas(prev => prev.map(p => (p.id === updatedPta.id ? { ...p, ...updatedPta } : p)));
                setSelectedPTA((prev: any) => prev ? { ...prev, ...updatedPta } : prev);
              }}
              onConcertar={() => { setConcertacionPtaId(selectedPTA.id); setSelectedPTA(null); }}
              onVerReporte={() => setShowReporteR01(true)}
              puedeAprobar={permisos.puedeAprobar}
              nivelAprobacion={permisos.nivelAprobacion}
              rolLabel={rolLabel}
              isSuperUser={isSuperUserEffective}
              actorId={aprobadorId}
              actorNombre={aprobadorNombre}
              jefaturaTerritorialId={
                permisos.nivelAprobacion === 1 && permisos.filtroTerritorial?.[0]
                  ? permisos.filtroTerritorial[0]
                  : undefined
              }
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ═══ MODAL: Aprobación ═══ */}
      <AnimatePresence>
        {showApproval && selectedPTA && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle style={{ width: 20, height: 20, color: '#059669' }} />
                  {getNextStateLabel(selectedPTA.estado)}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                  PTA de {selectedPTA.docente_nombre} — Estado actual: {selectedPTA.estado?.replace(/_/g, ' ')}
                </p>
                {/* Aprobador info */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
                  padding: '6px 10px', borderRadius: 7, background: '#F0FDF4',
                  border: '1px solid #BBF7D0', fontSize: '0.72rem', color: '#166534',
                }}>
                  <Users style={{ width: 12, height: 12 }} />
                  <span>Aprobador: <strong>{aprobadorNombre}</strong> — {rolLabel} (Nivel {permisos.nivelAprobacion})</span>
                </div>
              </div>
              <div style={{ padding: 24 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Observaciones (opcional)
                </label>
                <textarea
                  value={approvalObs}
                  onChange={e => setApprovalObs(e.target.value)}
                  placeholder="Agregue observaciones sobre la aprobación..."
                  rows={4}
                  style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={handleRechazar}
                  disabled={procesando}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <XCircle style={{ width: 13, height: 13 }} /> Rechazar
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowApproval(false); setApprovalObs(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleAprobar}
                    disabled={procesando}
                    style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: procesando ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <Send style={{ width: 13, height: 13 }} />
                    {procesando ? 'Procesando...' : getNextStateLabel(selectedPTA.estado)}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Devolución ═══ */}
      <AnimatePresence>
        {showDevolucion && selectedPTA && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw style={{ width: 20, height: 20, color: '#D97706' }} />
                  Devolver PTA
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                  PTA de {selectedPTA.docente_nombre}
                </p>
              </div>
              <div style={{ padding: 24 }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Motivo de devolución *
                </label>
                <textarea
                  value={devolucionMotivo}
                  onChange={e => setDevolucionMotivo(e.target.value)}
                  placeholder="Describa el motivo de la devolución y las correcciones requeridas..."
                  rows={5}
                  style={{ width: '100%', padding: 12, borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => { setShowDevolucion(false); setDevolucionMotivo(''); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={handleDevolver}
                  disabled={procesando || !devolucionMotivo.trim()}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#D97706', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: procesando || !devolucionMotivo.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                  {procesando ? 'Procesando...' : 'Confirmar Devolución'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Batch Approval ═══ */}
      <AnimatePresence>
        {showBatchApproval && selectedIds.size > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle style={{ width: 20, height: 20, color: '#059669' }} />
                  Aprobación en Lote
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                  {selectedIds.size} PTA{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''} para aprobación
                </p>
              </div>
              <div style={{ padding: '16px 24px' }}>
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 14, borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  {filteredPtas.filter((p: any) => selectedIds.has(p.id)).map((p: any) => {
                    const pSc = getStatusConfig(p.estado);
                    return (
                      <div key={p.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '8px 12px', borderBottom: '1px solid #F9FAFB', fontSize: '0.82rem',
                      }}>
                        <span style={{ fontWeight: 600, color: '#111827' }}>{p.docente_nombre || 'Docente'}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: pSc.bg, color: pSc.color, fontSize: '0.62rem', fontWeight: 700 }}>
                            {p.estado?.replace(/_/g, ' ')}
                          </span>
                          <ArrowRight style={{ width: 10, height: 10, color: '#9CA3AF' }} />
                          <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#059669' }}>{getNextState(p.estado)?.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Observaciones para todos (opcional)
                </label>
                <textarea
                  value={batchObs}
                  onChange={e => setBatchObs(e.target.value)}
                  placeholder="Observaciones aplicables a todos los PTAs seleccionados..."
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => { setShowBatchApproval(false); setBatchObs(''); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setProcesando(true);
                    const ids = Array.from(selectedIds);
                    let successCount = 0;
                    for (const id of ids) {
                      const pta = ptas.find((p: any) => p.id === id);
                      if (!pta) continue;
                      // Validar nivel antes de aprobar cada PTA en lote
                      if (!puedeAprobarPorNivel(pta.estado, permisos.nivelAprobacion, isSuperUserEffective)) {
                        console.warn(`[Batch] Nivel insuficiente para PTA ${id} en estado ${pta.estado}`);
                        continue;
                      }
                      const res = await updatePTAStatus(id, {
                        accion: 'aprobar',
                        observaciones: batchObs || `Aprobado en lote por ${aprobadorNombre} (${rolLabel})`,
                        actorId: aprobadorId,
                        actorRol: rolLabel,
                        nivelAprobacion: permisos.nivelAprobacion,
                        actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
                        isSuperUser: isSuperUserEffective,
                        aprobarTodas: isSuperUserEffective,
                      });
                      if (res.success) successCount++;
                    }
                    setProcesando(false);
                    setShowBatchApproval(false);
                    setSelectedIds(new Set());
                    setBatchObs('');
                    if (successCount > 0) {
                      toast.success(`${successCount} de ${ids.length} PTAs aprobados en lote`);
                      addNotification({
                        title: 'Aprobación en Lote',
                        message: `${successCount} PTAs aprobados exitosamente`,
                        type: 'success',
                      });
                      loadData();
                    } else {
                      toast.error('Error al procesar la aprobación en lote');
                    }
                  }}
                  disabled={procesando}
                  style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: procesando ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Send style={{ width: 13, height: 13 }} />
                  {procesando ? 'Procesando...' : `Aprobar ${selectedIds.size} PTAs`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Firma Digital N3 ═══ */}
      <AnimatePresence>
        {showFirmaDigital && selectedPTA && (
          <FirmaDigitalPTA
            ptaId={selectedPTA.id}
            docenteNombre={selectedPTA.docente_nombre || 'Docente ESAP'}
            periodo={selectedPTA.periodo || filtroPeriodo}
            totalHoras={selectedPTA.total_horas_programadas || 0}
            firmanteNombre={aprobadorNombre || 'Director(a) Gestión Profesoral'}
            firmanteCargo={`${rolLabel} — ESAP`}
            onFirmaCompleta={async (firmaData: FirmaData) => {
              setShowFirmaDigital(false);
              setProcesando(true);

              // Aprobar el PTA (cambiar estado a Aprobado)
              const res = await updatePTAStatus(selectedPTA.id, {
                accion: 'aprobar',
                observaciones: `Aprobado con firma digital por ${aprobadorNombre} (${rolLabel}) — Certificado: ${firmaData.certificado_id}`,
                actorId: aprobadorId,
                actorRol: rolLabel,
                nivelAprobacion: permisos.nivelAprobacion,
                actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
                isSuperUser: isSuperUserEffective,
                aprobarTodas: isSuperUserEffective,
              });

              // Guardar datos de firma digital si el endpoint existe (no bloquea el flujo)
              guardarFirmaDigitalPTA(selectedPTA.id, {
                hash: firmaData.hash,
                timestamp: firmaData.timestamp,
                firmante: firmaData.firmante,
                cargo: firmaData.cargo,
                pin_verificado: firmaData.pin_verificado,
                certificado_id: firmaData.certificado_id,
              } as any).catch(() => {/* silencioso si endpoint no existe */});

              setProcesando(false);
              if (res.success) {
                toast.success(`PTA aprobado con firma digital — Certificado: ${firmaData.certificado_id}`);
                addNotification({ title: 'PTA Aprobado (Firma Digital)', message: `PTA de ${selectedPTA.docente_nombre} — Certificado: ${firmaData.certificado_id}`, type: 'success' });
                setSelectedPTA(null);
                setApprovalObs('');
                loadData();
              } else {
                toast.error(res.message || 'Error al aprobar el PTA');
              }
            }}
            onCancelar={() => { setShowFirmaDigital(false); setShowApproval(true); }}
          />
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Batch Devolución (Feature 16) ═══ */}
      <AnimatePresence>
        {showBatchDevolucion && selectedIds.size > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RotateCcw style={{ width: 20, height: 20, color: '#D97706' }} />
                  Devolución en Lote
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                  {selectedIds.size} PTA{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''} para devolución
                </p>
              </div>
              <div style={{ padding: '16px 24px' }}>
                <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 14, borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  {filteredPtas.filter((p: any) => selectedIds.has(p.id)).map((p: any) => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 12px', borderBottom: '1px solid #F9FAFB', fontSize: '0.82rem',
                    }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{p.docente_nombre || 'Docente'}</span>
                      <span style={{ padding: '1px 6px', borderRadius: 4, background: '#FEF3C7', color: '#92400E', fontSize: '0.62rem', fontWeight: 700 }}>
                        {p.estado?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Motivo de devolución (aplicado a todos) *
                </label>
                <textarea
                  value={batchDevMotivo}
                  onChange={e => setBatchDevMotivo(e.target.value)}
                  placeholder="Describa el motivo de devolución aplicable a todos los PTAs seleccionados..."
                  rows={4}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => { setShowBatchDevolucion(false); setBatchDevMotivo(''); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!batchDevMotivo.trim()) { toast.error('Debe ingresar un motivo de devolución'); return; }
                    setProcesando(true);
                    const ids = Array.from(selectedIds);
                    let successCount = 0;
                    for (const id of ids) {
                      const pta = ptas.find((p: any) => p.id === id);
                      if (!pta) continue;
                      const res = await updatePTAStatus(id, {
                        accion: 'devolver',
                        observaciones: batchDevMotivo,
                        motivo_devolucion: batchDevMotivo,
                        actorId: aprobadorId,
                        actorRol: rolLabel,
                        nivelAprobacion: permisos.nivelAprobacion,
                        actorTerritorialId: permisos.nivelAprobacion === 1 ? permisos.filtroTerritorial?.[0] : undefined,
                        isSuperUser: isSuperUserEffective,
                      });
                      if (res.success) successCount++;
                    }
                    setProcesando(false);
                    setShowBatchDevolucion(false);
                    setSelectedIds(new Set());
                    setBatchDevMotivo('');
                    if (successCount > 0) {
                      toast.success(`${successCount} de ${ids.length} PTAs devueltos`);
                      addNotification({
                        title: 'Devolución en Lote',
                        message: `${successCount} PTAs devueltos: ${batchDevMotivo.substring(0, 60)}...`,
                        type: 'warning',
                      });
                      loadData();
                    } else {
                      toast.error('Error al procesar la devolución en lote');
                    }
                  }}
                  disabled={procesando || !batchDevMotivo.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: '#D97706', color: 'white', fontSize: '0.82rem', fontWeight: 700,
                    cursor: 'pointer', opacity: procesando || !batchDevMotivo.trim() ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <RotateCcw style={{ width: 13, height: 13 }} />
                  {procesando ? 'Procesando...' : `Devolver ${selectedIds.size} PTAs`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Keyboard Shortcuts (Feature 14) ═══ */}
      <AnimatePresence>
        {showKeyboardHelp && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Keyboard style={{ width: 20, height: 20, color: '#003DA5' }} />
                  Atajos de Teclado
                </h3>
                <button onClick={() => setShowKeyboardHelp(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                  <X style={{ width: 18, height: 18, color: '#9CA3AF' }} />
                </button>
              </div>
              <div style={{ padding: '16px 24px' }}>
                {[
                  { keys: ['↓', 'j'], desc: 'Siguiente fila' },
                  { keys: ['↑', 'k'], desc: 'Fila anterior' },
                  { keys: ['Enter'], desc: 'Abrir detalle del PTA seleccionado' },
                  { keys: ['Esc'], desc: 'Cerrar panel / modal activo' },
                  { keys: ['/'], desc: 'Enfocar campo de búsqueda' },
                  { keys: ['r'], desc: 'Recargar datos' },
                  { keys: ['a'], desc: 'Mostrar/ocultar feed de actividad' },
                  { keys: ['g'], desc: 'Agrupar / desagrupar filas' },
                  { keys: ['p'], desc: 'Anclar/desanclar PTA enfocado' },
                  { keys: ['e'], desc: 'Expandir/colapsar detalle in-line' },
                  { keys: ['⌘', 'K'], desc: 'Abrir paleta de comandos' },
                  { keys: ['Shift', 'Click'], desc: 'Seleccionar rango de filas' },
                  { keys: ['Shift', '?'], desc: 'Mostrar/ocultar esta ayuda' },
                ].map((shortcut, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0', borderBottom: i < 12 ? '1px solid #F3F4F6' : 'none',
                  }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {shortcut.keys.map((k, ki) => (
                        <span key={ki}>
                          <kbd style={{
                            padding: '2px 7px', borderRadius: 5,
                            background: '#F3F4F6', border: '1px solid #D1D5DB',
                            fontSize: '0.72rem', fontWeight: 700, color: '#374151',
                            fontFamily: 'inherit', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          }}>
                            {k}
                          </kbd>
                          {ki < shortcut.keys.length - 1 && <span style={{ margin: '0 2px', fontSize: '0.65rem', color: '#9CA3AF' }}> / </span>}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>{shortcut.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 24px', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                  Los atajos se desactivan cuando un campo de texto tiene foco
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Command Palette (Feature 27) ═══ */}
      <AnimatePresence>
        {showCommandPalette && (() => {
          const q = commandQuery.toLowerCase();
          const commands = [
            // Navigation commands
            { id: 'nav-gestion', label: 'Ir a Gestión de PTAs', category: 'Navegación', icon: FileText, action: () => { setModuleView('gestion'); setShowCommandPalette(false); } },
            // ✅ ELIMINADO - { id: 'nav-cargas', ... } - La carga masiva se hace desde Gestión Personas
            { id: 'nav-tablero', label: 'Ir a Tablero de Control', category: 'Navegación', icon: BarChart3, action: () => { setModuleView('tablero'); setShowCommandPalette(false); } },
            { id: 'nav-directivo', label: 'Ir a Dashboard Directivo', category: 'Navegación', icon: Briefcase, action: () => { setModuleView('directivo'); setShowCommandPalette(false); } },
            { id: 'nav-kanban', label: 'Ir a Vista Kanban', category: 'Navegación', icon: Layers, action: () => { setModuleView('kanban'); setShowCommandPalette(false); } },
            { id: 'nav-reportes', label: 'Ir a Centro de Reportes', category: 'Navegación', icon: BarChart3, action: () => { setModuleView('centro_reportes'); setShowCommandPalette(false); } },
            { id: 'nav-sna', label: 'Ir a Panel SNA', category: 'Navegación', icon: Scale, action: () => { setModuleView('sna'); setShowCommandPalette(false); } },
            { id: 'nav-workflow', label: 'Ir a Flujo de Estados', category: 'Navegación', icon: ArrowRight, action: () => { setModuleView('workflow_visualizer'); setShowCommandPalette(false); } },
            { id: 'nav-mapeo', label: 'Ir a Mapeo & Sincronización', category: 'Navegación', icon: RefreshCw, action: () => { setModuleView('mapeo_sincronizacion'); setShowCommandPalette(false); } },
            { id: 'nav-salud', label: 'Ir a Salud del Sistema', category: 'Navegación', icon: Shield, action: () => { setModuleView('salud_sistema'); setShowCommandPalette(false); } },
            { id: 'nav-reconciliacion', label: 'Ir a Reconciliación Masiva', category: 'Navegación', icon: GitCompare, action: () => { setModuleView('reconciliacion_masiva'); setShowCommandPalette(false); } },
            // Actions
            { id: 'act-reload', label: 'Recargar datos', category: 'Acción', icon: RefreshCw, action: () => { loadData(); setShowCommandPalette(false); toast.success('Datos recargados'); } },
            { id: 'act-search', label: 'Enfocar búsqueda', category: 'Acción', icon: Search, action: () => { setShowCommandPalette(false); setTimeout(() => document.querySelector<HTMLInputElement>('[data-pta-search]')?.focus(), 100); } },
            { id: 'act-activity', label: 'Mostrar/ocultar actividad', category: 'Acción', icon: Activity, action: () => { setShowActivityFeed(f => !f); setShowCommandPalette(false); } },
            { id: 'act-group', label: 'Agrupar por estado', category: 'Acción', icon: Layers, action: () => { setGroupBy(g => g ? '' : 'estado'); setShowCommandPalette(false); } },
            { id: 'act-kanban', label: 'Cambiar a vista kanban', category: 'Acción', icon: Columns3, action: () => { setViewMode('kanban'); setShowCommandPalette(false); } },
            { id: 'act-table', label: 'Cambiar a vista tabla', category: 'Acción', icon: Columns3, action: () => { setViewMode('table'); setShowCommandPalette(false); } },
            { id: 'act-keyboard', label: 'Mostrar atajos de teclado', category: 'Acción', icon: Keyboard, action: () => { setShowCommandPalette(false); setShowKeyboardHelp(true); } },
            // Filters
            { id: 'flt-pendientes', label: 'Filtrar: Solo pendientes', category: 'Filtro', icon: Clock, action: () => { setFiltroEstado('pendientes'); setShowCommandPalette(false); } },
            { id: 'flt-aprobados', label: 'Filtrar: Solo aprobados', category: 'Filtro', icon: CheckCircle, action: () => { setFiltroEstado('Aprobado'); setShowCommandPalette(false); } },
            { id: 'flt-rechazados', label: 'Filtrar: Solo rechazados', category: 'Filtro', icon: XCircle, action: () => { setFiltroEstado('Rechazado'); setShowCommandPalette(false); } },
            { id: 'flt-clear', label: 'Limpiar todos los filtros', category: 'Filtro', icon: X, action: () => { setFiltroEstado(''); setSearchQuery(''); setFiltroTags([]); setShowCommandPalette(false); } },
            { id: 'flt-tags', label: 'Filtrar por etiquetas', category: 'Filtro', icon: Tag, action: () => { setShowTagFilter(true); setShowCommandPalette(false); } },
            { id: 'act-reset-priority', label: 'Restablecer orden de prioridad', category: 'Acción', icon: GripVertical, action: () => { setPriorityOrder([]); setShowCommandPalette(false); toast('Orden restablecido'); } },
            // Tag filters in command palette
            ...allUniqueTags.map(tag => ({
              id: `tag-${tag.label}`,
              label: `Tag: ${tag.label}`,
              category: 'Etiqueta',
              icon: Tag,
              action: () => { setFiltroTags(prev => prev.includes(tag.label) ? prev : [...prev, tag.label]); setShowCommandPalette(false); },
            })),
            // PTA quick search
            ...filteredPtas.slice(0, 15).map((pta: any) => ({
              id: `pta-${pta.id}`,
              label: `${pta.docente_nombre || 'Docente'} — ${pta.estado?.replace(/_/g, ' ')}`,
              category: 'PTA',
              icon: FileText,
              action: () => { setSelectedPTA(pta); setShowCommandPalette(false); },
            })),
          ];
          const filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)) : commands.slice(0, 20);
          const grouped = filtered.reduce<Record<string, any[]>>((acc, c) => {
            if (!acc[c.category]) acc[c.category] = [];
            acc[c.category].push(c);
            return acc;
          }, {});

          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCommandPalette(false)}>
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid #E5E7EB' }}>
                  <Search style={{ width: 18, height: 18, color: '#9CA3AF', flexShrink: 0 }} />
                  <input
                    ref={commandInputRef}
                    autoFocus
                    type="text"
                    value={commandQuery}
                    onChange={e => setCommandQuery(e.target.value)}
                    placeholder="Buscar comandos, vistas, PTAs..."
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.95rem', color: '#111827', fontFamily: 'inherit' }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setShowCommandPalette(false);
                      if (e.key === 'Enter' && filtered.length > 0) filtered[0].action();
                    }}
                  />
                  <kbd style={{ padding: '2px 6px', borderRadius: 4, background: '#F3F4F6', border: '1px solid #D1D5DB', fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF' }}>Esc</kbd>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '24px 18px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                      No se encontraron comandos para "{commandQuery}"
                    </div>
                  ) : (
                    Object.entries(grouped).map(([category, items]) => (
                      <div key={category}>
                        <div style={{ padding: '8px 18px 4px', fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {category}
                        </div>
                        {items.map(cmd => {
                          const CmdIcon = cmd.icon;
                          return (
                            <button
                              key={cmd.id}
                              onClick={cmd.action}
                              style={{
                                width: '100%', padding: '10px 18px', border: 'none', background: 'transparent',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                                fontSize: '0.85rem', color: '#374151', fontWeight: 500, transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <CmdIcon style={{ width: 13, height: 13, color: '#6B7280' }} />
                              </div>
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.label}</span>
                              {cmd.category === 'PTA' && (
                                <span style={{ fontSize: '0.58rem', color: '#9CA3AF', fontWeight: 600, flexShrink: 0 }}>Ver</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
                <div style={{ padding: '8px 18px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 12, justifyContent: 'center' }}>
                  {[
                    { keys: ['↑', '↓'], label: 'navegar' },
                    { keys: ['Enter'], label: 'seleccionar' },
                    { keys: ['Esc'], label: 'cerrar' },
                  ].map(hint => (
                    <span key={hint.label} style={{ fontSize: '0.6rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {hint.keys.map(k => (
                        <kbd key={k} style={{ padding: '1px 4px', borderRadius: 3, background: '#F3F4F6', border: '1px solid #E5E7EB', fontSize: '0.55rem', fontWeight: 700 }}>{k}</kbd>
                      ))}
                      <span>{hint.label}</span>
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ MODAL: Bulk Notification (Feature 30) ═══ */}
      <AnimatePresence>
        {showBulkNotify && selectedIds.size > 0 && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Bell style={{ width: 20, height: 20, color: '#003DA5' }} />
                  Notificar Docentes
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
                  Enviar notificación a {selectedIds.size} docente{selectedIds.size > 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ padding: '16px 24px' }}>
                {/* Recipients preview */}
                <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 14, borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  {filteredPtas.filter((p: any) => selectedIds.has(p.id)).map((p: any) => (
                    <div key={p.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 12px', borderBottom: '1px solid #F9FAFB', fontSize: '0.78rem',
                    }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{p.docente_nombre || 'Docente'}</span>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{p.territorial || ''}</span>
                    </div>
                  ))}
                </div>
                {/* Notification type */}
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Tipo de notificación
                </label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  {([
                    { key: 'info', label: 'Informativa', color: '#003DA5', bg: '#EFF6FF' },
                    { key: 'warning', label: 'Advertencia', color: '#D97706', bg: '#FEF3C7' },
                    { key: 'urgent', label: 'Urgente', color: '#DC2626', bg: '#FEE2E2' },
                  ] as const).map(t => (
                    <button key={t.key} onClick={() => setBulkNotifyType(t.key)}
                      style={{
                        flex: 1, padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                        border: bulkNotifyType === t.key ? `1.5px solid ${t.color}` : '1px solid #E5E7EB',
                        background: bulkNotifyType === t.key ? t.bg : 'white',
                        color: bulkNotifyType === t.key ? t.color : '#6B7280',
                        fontSize: '0.75rem', fontWeight: 600, textAlign: 'center',
                      }}
                    >{t.label}</button>
                  ))}
                </div>
                {/* Message */}
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Mensaje *
                </label>
                <textarea
                  value={bulkNotifyMsg}
                  onChange={e => setBulkNotifyMsg(e.target.value)}
                  placeholder="Escriba el mensaje que recibirán los docentes seleccionados..."
                  rows={4}
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ padding: '14px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => { setShowBulkNotify(false); setBulkNotifyMsg(''); }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!bulkNotifyMsg.trim()) { toast.error('Debe ingresar un mensaje'); return; }
                    const count = selectedIds.size;
                    // Push to activity feed & platform notifications
                    filteredPtas.filter((p: any) => selectedIds.has(p.id)).forEach((p: any) => {
                      pushActivity('sistema', p.docente_nombre || 'Docente', bulkNotifyType, `Notificación enviada: ${bulkNotifyMsg.substring(0, 60)}`);
                    });
                    addNotification({
                      title: 'Notificación Masiva Enviada',
                      message: `${count} docente(s) notificados: ${bulkNotifyMsg.substring(0, 80)}`,
                      type: bulkNotifyType === 'urgent' ? 'warning' : 'info',
                    });
                    toast.success(`Notificación enviada a ${count} docente(s)`, {
                      description: `Tipo: ${bulkNotifyType}`,
                    });
                    setShowBulkNotify(false);
                    setBulkNotifyMsg('');
                    setSelectedIds(new Set());
                  }}
                  disabled={!bulkNotifyMsg.trim()}
                  style={{
                    padding: '8px 20px', borderRadius: 8, border: 'none',
                    background: bulkNotifyType === 'urgent' ? '#DC2626' : bulkNotifyType === 'warning' ? '#D97706' : '#003DA5',
                    color: 'white', fontSize: '0.82rem', fontWeight: 700,
                    cursor: bulkNotifyMsg.trim() ? 'pointer' : 'default',
                    opacity: bulkNotifyMsg.trim() ? 1 : 0.5,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Bell style={{ width: 13, height: 13 }} />
                  Enviar Notificación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ MODAL: Comparison Mode (Feature 25) ═══ */}
      <AnimatePresence>
        {showCompare && compareIds.length === 2 && (() => {
          const ptaA = ptas.find((p: any) => p.id === compareIds[0]);
          const ptaB = ptas.find((p: any) => p.id === compareIds[1]);
          if (!ptaA || !ptaB) return null;

          const compareFields = [
            { label: 'Docente', key: 'docente_nombre' },
            { label: 'Estado', key: 'estado' },
            { label: 'Dedicación', key: 'dedicacion' },
            { label: 'Territorial', key: 'territorial' },
            { label: 'Programa', key: 'programa' },
            { label: 'Periodo', key: 'periodo' },
            { label: 'Horas Programadas', key: 'total_horas_programadas', isNumber: true },
            { label: 'Horas Disponibles', key: 'horas_a_programar', isNumber: true },
            { label: 'Horas Docencia', key: 'horas_docencia', isNumber: true },
            { label: 'Horas Investigación', key: 'horas_investigacion', isNumber: true },
            { label: 'Horas Extensión', key: 'horas_extension', isNumber: true },
            { label: 'Horas Complementarias', key: 'horas_complementarias', isNumber: true },
            { label: 'Horas Acad. Admin.', key: 'horas_acad_admin', isNumber: true },
            { label: 'Num. Asignaturas', key: 'num_asignaturas', isNumber: true },
          ];

          return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(4px)' }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
              >
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GitCompare style={{ width: 20, height: 20, color: '#0891B2' }} />
                    Comparar PTAs
                  </h3>
                  <button onClick={() => { setShowCompare(false); setCompareIds([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <X style={{ width: 18, height: 18, color: '#9CA3AF' }} />
                  </button>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  {/* Headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 0, borderBottom: '2px solid #E5E7EB' }}>
                    <div style={{ padding: '12px 0', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Campo</div>
                    <div style={{ padding: '12px 8px', fontSize: '0.82rem', fontWeight: 700, color: '#111827', background: '#EFF6FF', borderRadius: '8px 0 0 0' }}>
                      {ptaA.docente_nombre || 'PTA A'}
                    </div>
                    <div style={{ padding: '12px 8px', fontSize: '0.82rem', fontWeight: 700, color: '#111827', background: '#ECFEFF', borderRadius: '0 8px 0 0' }}>
                      {ptaB.docente_nombre || 'PTA B'}
                    </div>
                  </div>
                  {/* Rows */}
                  {compareFields.map((field, fi) => {
                    const valA = ptaA[field.key];
                    const valB = ptaB[field.key];
                    const isDiff = String(valA || '') !== String(valB || '');
                    const displayA = field.isNumber ? (valA || 0) : (valA || '—');
                    const displayB = field.isNumber ? (valB || 0) : (valB || '—');
                    // For numeric fields, highlight higher
                    const aHigher = field.isNumber && Number(valA || 0) > Number(valB || 0);
                    const bHigher = field.isNumber && Number(valB || 0) > Number(valA || 0);

                    const scA = getStatusConfig(String(valA || ''));
                    const scB = getStatusConfig(String(valB || ''));

                    return (
                      <div key={field.key} style={{
                        display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 0,
                        borderBottom: fi < compareFields.length - 1 ? '1px solid #F3F4F6' : 'none',
                        background: isDiff ? '#FFFBEB' : 'transparent',
                      }}>
                        <div style={{ padding: '10px 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {field.label}
                          {isDiff && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', flexShrink: 0 }} title="Diferente" />}
                        </div>
                        <div style={{
                          padding: '10px 8px', fontSize: '0.82rem', color: '#374151',
                          fontWeight: aHigher ? 700 : 500,
                          background: aHigher ? '#D1FAE510' : 'transparent',
                        }}>
                          {field.key === 'estado' ? (
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: scA.bg, color: scA.color, border: `1px solid ${scA.border}`, fontSize: '0.68rem', fontWeight: 700 }}>
                              {String(valA || '').replace(/_/g, ' ')}
                            </span>
                          ) : String(displayA)}
                        </div>
                        <div style={{
                          padding: '10px 8px', fontSize: '0.82rem', color: '#374151',
                          fontWeight: bHigher ? 700 : 500,
                          background: bHigher ? '#D1FAE510' : 'transparent',
                        }}>
                          {field.key === 'estado' ? (
                            <span style={{ padding: '2px 8px', borderRadius: 6, background: scB.bg, color: scB.color, border: `1px solid ${scB.border}`, fontSize: '0.68rem', fontWeight: 700 }}>
                              {String(valB || '').replace(/_/g, ' ')}
                            </span>
                          ) : String(displayB)}
                        </div>
                      </div>
                    );
                  })}
                  {/* Summary */}
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                      {compareFields.filter(f => String(ptaA[f.key] || '') !== String(ptaB[f.key] || '')).length} diferencia(s) encontrada(s)
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ═══ FAB — Mobile Quick Refresh (only on gestión view) ═══ */}
      {moduleView === 'gestion' && (
        <button
          className="pta-fab"
          onClick={() => { loadData(); }}
          aria-label="Recargar datos"
          title="Actualizar lista de PTAs"
        >
          <RefreshCw style={{ width: 22, height: 22 }} />
          <span className="pta-fab-label">Recargar</span>
        </button>
      )}

      {/* ═══ Modal: Traza del Proceso ═══ */}
      <AnimatePresence>
        {trazaPta && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center',
            background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(3px)', padding: 20
          }}>
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.98 }}
              style={{
                background: 'white', borderRadius: 16, width: '100%', maxWidth: 540,
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                maxHeight: '85vh',
              }}
            >
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#111827', fontWeight: 800 }}>Traza del Proceso PTA</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#6B7280' }}>Docente: {trazaPta.docente_nombre}</p>
                </div>
                <button onClick={() => setTrazaPta(null)} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>

              <div style={{ padding: 24, overflowY: 'auto' }}>
                {(!trazaPta.historialEstados || trazaPta.historialEstados.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: '0.82rem' }}>
                    <Clock style={{ width: 32, height: 32, margin: '0 auto 12px auto', opacity: 0.5 }} />
                    <p>No hay registro de actualizaciones para este PTA.</p>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, bottom: 10, left: 15, width: 2, background: '#E0E7FF' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {[...trazaPta.historialEstados].reverse().map((step: any, idx: number, arr: any[]) => {
                        const date = new Date(step.createdAt);
                        const isLast = idx === arr.length - 1;
                        return (
                          <div key={step.id} style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1, opacity: isLast ? 1 : 0.6 }}>
                            <div style={{ 
                              width: 32, height: 32, borderRadius: '50%', background: isLast ? '#4F46E5' : 'white', 
                              border: `2px solid ${isLast ? '#4F46E5' : '#CBD5E1'}`, flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <CheckCircle style={{ width: 14, height: 14, color: isLast ? 'white' : '#94A3B8' }} />
                            </div>
                            <div style={{ flex: 1, paddingTop: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isLast ? '#111827' : '#475569' }}>{step.estadoNuevo.replace(/_/g, ' ')}</span>
                                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4 }}>
                                Actor: <span style={{ fontWeight: 600 }}>{step.actorRol || 'Sistema'}</span>
                              </div>
                              {step.comentarios && (
                                <div style={{ 
                                  marginTop: 8, padding: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', 
                                  borderRadius: 8, fontSize: '0.75rem', color: '#334155' 
                                }}>
                                  "{step.comentarios}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ Mobile Bottom Navigation Bar ═══ */}
      <PTAMobileBar
        moduleView={moduleView}
        onNavigate={(view) => {
          setModuleView(view as ModuleView);
          setOpenDropdown(null);
          setMobileFilterOpen(false);
        }}
        pendingCount={pendingForApprovalCount}
        concertacionCount={concertacionCount}
      />
    </React.Suspense>
    </div>
  );
}
