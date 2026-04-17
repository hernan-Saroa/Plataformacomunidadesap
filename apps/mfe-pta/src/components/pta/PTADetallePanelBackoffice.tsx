/**
 * PTADetallePanelBackoffice — Panel de detalle completo estilo Notion slide-out
 *
 * Reemplaza el modal básico con un panel rico que muestra:
 * - Header con tracking bar multinivel (18 estados)
 * - Resumen visual de distribución de carga por componente
 * - Desglose de Docencia con fórmulas K15/L15 del Excel GTH-F081
 * - Investigación: proyectos y actividades
 * - Extensión: 4 secciones (Asesoría, Consultoría, Capacitación, Comunidad)
 * - Actividades Complementarias
 * - Timeline interactivo del historial
 * - Mensajes de concertación (si aplica)
 * - Acciones de aprobación inline por nivel
 *
 * @version 1.0.0
 * @date 2026-03-13
 */

import React, { useState, useMemo, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle, XCircle, RotateCcw, Send, Clock, Eye, FileText,
  BookOpen, FlaskConical, Globe, Briefcase, Users, MessageSquare,
  ChevronDown, ChevronRight, ArrowRight, AlertTriangle, Calendar,
  MapPin, Award, Hash, Calculator, TrendingUp, Shield, Printer,
  GraduationCap, Scale, Zap, Target, Building2, Layers, BarChart3, Loader2, Edit2,
  Activity
} from 'lucide-react';
import { usePTARules } from './ConfiguracionReglasPTA';
import { toast } from 'sonner';
import { getPTAById, updatePTAStatus, guardarFirmaDigitalPTA, getAprobacionesJefatura } from '../../services/api/ptaApi';
import { PTAForm } from '../portal/pta/PTAForm';
import { FirmaDigitalPTA } from './FirmaDigitalPTA';
import type { FirmaData } from './FirmaDigitalPTA';
import { ReporteIndividualPTA } from './ReporteIndividualPTA';
import { PTA_COLORS } from './shared/ptaColors';

// ═══ TYPES ════════════════════════════════════════════════════════════

interface PTADetallePanelProps {
  pta: any;
  onClose: () => void;
  onAprobar: () => void;
  onDevolver: () => void;
  onConcertar: () => void;
  onVerReporte: () => void;
  puedeAprobar: boolean;
  nivelAprobacion: number;
  rolLabel: string;
  jefaturaTerritorialId?: string; // Para bloqueo de edición multi-territorial
  isSuperUser?: boolean;
  actorId?: string;
}

// ═══ CONSTANTS ════════════════════════════════════════════════════════

const FLUJO_COMPLETO = [
  { key: 'Borrador', label: 'Borrador', short: 'Borr.', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'PROPUESTO_POR_DIRECCION', label: 'Propuesto', short: 'Prop.', color: '#1E40AF', bg: '#EFF6FF' },
  { key: 'NOTIFICADO_DOCENTE', label: 'Notificado', short: 'Notif.', color: '#92400E', bg: '#FEF3C7' },
  { key: 'ACEPTADO_DOCENTE', label: 'Aceptado', short: 'Acept.', color: '#065F46', bg: '#D1FAE5' },
  { key: 'EN_CONCERTACION', label: 'Concertación', short: 'Conc.', color: '#6B21A8', bg: '#F3E8FF' },
  { key: 'CONCERTADO', label: 'Concertado', short: 'Concrt.', color: '#065F46', bg: '#D1FAE5' },
  { key: 'Pendiente Jefatura', label: 'Jefatura', short: 'Jef.', color: '#92400E', bg: '#FEF3C7' },
  { key: 'Pendiente Decanatura', label: 'Decanatura', short: 'Dec.', color: '#1E40AF', bg: '#DBEAFE' },
  { key: 'Pendiente Gestión Profesoral', label: 'G. Profesoral', short: 'G.P.', color: '#3730A3', bg: '#E0E7FF' },
  { key: 'Aprobado', label: 'Aprobado', short: 'Apro.', color: '#065F46', bg: '#D1FAE5' },
];

const FLUJO_APROBACION_SIMPLE = [
  { key: 'Pendiente Jefatura', label: 'N1: Jefatura', color: '#D97706' },
  { key: 'Pendiente Decanatura', label: 'N2: Decanatura', color: '#1E40AF' },
  { key: 'Pendiente Gestión Profesoral', label: 'N3: G. Profesoral', color: '#3730A3' },
  { key: 'Aprobado', label: 'Aprobado', color: '#059669' },
];

function getStatusConfig(estado: string) {
  const found = FLUJO_COMPLETO.find(f => f.key === estado);
  if (found) return found;
  if (estado === 'Rechazado') return { key: estado, label: 'Rechazado', short: 'Rech.', color: '#991B1B', bg: '#FEE2E2' };
  if (estado === 'Devuelto') return { key: estado, label: 'Devuelto', short: 'Dev.', color: '#9A3412', bg: '#FFF7ED' };
  if (estado === 'ESCALADO_SNA') return { key: estado, label: 'Escalado SNA', short: 'SNA', color: '#991B1B', bg: '#FEE2E2' };
  if (estado === 'OBJETADO_DOCENTE') return { key: estado, label: 'Objetado', short: 'Obj.', color: '#991B1B', bg: '#FEE2E2' };
  if (estado === 'MODIFICADO_DOCENTE') return { key: estado, label: 'Modificado', short: 'Mod.', color: '#1E40AF', bg: '#DBEAFE' };
  return { key: estado, label: estado?.replace(/_/g, ' ') || estado, short: estado?.substring(0, 4) || '', color: '#6B7280', bg: '#F3F4F6' };
}

function getNextStateLabel(current: string, hayModificaciones = false): string {
  if (hayModificaciones) {
    if (current === 'Pendiente Jefatura') return 'Aprobar con cambios → Docente revisa';
    if (current === 'Pendiente Decanatura') return 'Aprobar con cambios → Docente revisa';
    if (current === 'Pendiente Gestión Profesoral') return 'Aprobar con cambios → Docente revisa';
  }
  if (current === 'Pendiente Jefatura') return 'Aprobar → Avanzar a Decanatura';
  if (current === 'Pendiente Decanatura') return 'Aprobar → Avanzar a G. Profesoral';
  if (current === 'Pendiente Gestión Profesoral') return 'Aprobar PTA (Firma Digital)';
  return 'Aprobar';
}

function timeAgo(d: string): string {
  if (!d) return '';
  const now = Date.now();
  const then = new Date(d).getTime();
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return days < 7 ? `hace ${days}d` : new Date(d).toLocaleDateString('es-CO');
}

function fmtFecha(d?: string): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ═══ SUB-COMPONENTS ═══════════════════════════════════════════════════

function ApprovalTracker({ estado, isMobile = false }: { estado: string; isMobile?: boolean }) {
  const isRechazado = estado === 'Rechazado';
  const isDevuelto = estado === 'Devuelto';
  const isEscalado = estado === 'ESCALADO_SNA';

  const getStepStatus = (stepKey: string) => {
    const order = ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'Aprobado'];
    const currentIdx = order.indexOf(estado);
    const stepIdx = order.indexOf(stepKey);
    if (currentIdx < 0) {
      if (estado === 'Aprobado' && stepKey === 'Aprobado') return 'completed';
      return 'pending';
    }
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'pending';
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%' }}>
      {FLUJO_APROBACION_SIMPLE.map((step, i) => {
        const status = getStepStatus(step.key);
        const isLast = i === FLUJO_APROBACION_SIMPLE.length - 1;
        const circleSize = isMobile ? 24 : 28;

        return (
          <div key={step.key} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: circleSize, height: circleSize, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: status === 'completed' ? '#059669'
                  : status === 'current' ? (isRechazado ? '#DC2626' : isDevuelto ? '#D97706' : step.color)
                  : '#E5E7EB',
                color: status !== 'pending' ? 'white' : '#9CA3AF',
                fontSize: '0.6rem', fontWeight: 800,
                border: status === 'current' ? '3px solid' : '2px solid',
                borderColor: status === 'completed' ? '#059669'
                  : status === 'current' ? (isRechazado ? '#DC2626' : isDevuelto ? '#D97706' : step.color)
                  : '#D1D5DB',
                transition: 'all 0.3s', flexShrink: 0,
              }}>
                {status === 'completed' ? <CheckCircle style={{ width: isMobile ? 11 : 14, height: isMobile ? 11 : 14 }} /> : (i + 1)}
              </div>
              {!isMobile && (
                <span style={{
                  fontSize: '0.62rem', fontWeight: status === 'current' ? 700 : 500,
                  color: status === 'current' ? step.color : status === 'completed' ? '#059669' : '#9CA3AF',
                  marginTop: 3, textAlign: 'center', lineHeight: 1.1,
                }}>
                  {step.label}
                </span>
              )}
              {isMobile && (
                <span style={{
                  fontSize: '0.55rem', fontWeight: status === 'current' ? 700 : 500,
                  color: status === 'current' ? step.color : status === 'completed' ? '#059669' : '#9CA3AF',
                  marginTop: 2, textAlign: 'center', lineHeight: 1,
                  maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {step.label.replace('N1: ', '').replace('N2: ', '').replace('N3: ', '')}
                </span>
              )}
            </div>
            {!isLast && (
              <div style={{
                height: 3, flex: '0 0 12px', borderRadius: 2, marginTop: isMobile ? -12 : -14,
                background: status === 'completed' ? '#6EE7B7' : '#E5E7EB',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ComponentBar({ label, hours, total, color, icon: Icon, isEditing, onChange }: {
  label: string; hours: number; total: number; color: string; icon: any;
  isEditing?: boolean; onChange?: (val: number) => void;
}) {
  const pct = total > 0 ? Math.min((hours / total) * 100, 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon style={{ width: 14, height: 14, color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{label}</span>
          {isEditing && onChange ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input 
                type="number" min="0" max={total} value={hours}
                onChange={e => onChange(Number(e.target.value) || 0)}
                style={{
                  width: 50, padding: '2px 4px', fontSize: '0.7rem', fontWeight: 700,
                  color, background: 'white', border: `1px solid ${color}40`,
                  borderRadius: 4, textAlign: 'right', outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>/ {total}h</span>
            </div>
          ) : (
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{hours}h <span style={{ color: '#9CA3AF', fontWeight: 400 }}>/ {total}h</span></span>
          )}
        </div>
        <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%`, background: pct > 100 ? '#DC2626' : color }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ height: '100%', borderRadius: 3 }}
          />
        </div>
      </div>
    </div>
  );
}

function SectionCollapsible({ title, icon: Icon, color, count, children, defaultOpen = false }: {
  title: string; icon: any; color: string; count?: number; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 12, borderRadius: 10, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '10px 14px', border: 'none',
          background: open ? `${color}08` : 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
      >
        <Icon style={{ width: 15, height: 15, color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', flex: 1, textAlign: 'left' }}>
          {title}
        </span>
        {count !== undefined && (
          <span style={{
            padding: '1px 7px', borderRadius: 10, background: `${color}15`,
            color, fontSize: '0.65rem', fontWeight: 700,
          }}>
            {count}
          </span>
        )}
        <ChevronDown style={{
          width: 14, height: 14, color: '#9CA3AF',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.2s',
        }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '10px 14px', borderTop: '1px solid #F3F4F6' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══ MAIN COMPONENT ═══════════════════════════════════════════════════

export const PTADetallePanelBackoffice = React.forwardRef<HTMLDivElement, PTADetallePanelProps>(({
  pta: initialPta, onClose, onAprobar, onDevolver, onConcertar, onVerReporte,
  puedeAprobar, nivelAprobacion, rolLabel, jefaturaTerritorialId, isSuperUser, actorId,
}, ref) => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'componentes' | 'historial' | 'concertacion'>('resumen');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [aprobacionesJefatura, setAprobacionesJefatura] = useState<any[]>([]);
  const [pta, setPta] = useState<any>(initialPta);
  const [loadingExtras, setLoadingExtras] = useState(false);

  // ═══ FEATURE 3: MODO EDICIÓN ═══
  const { rules } = usePTARules();
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Cargar aprobaciones de jefatura si el PTA está en Pendiente Jefatura
  useEffect(() => {
    if (pta?.estado === 'Pendiente Jefatura' && pta?.id) {
      getAprobacionesJefatura(pta.id).then(res => {
        if (res.success) setAprobacionesJefatura(res.data || []);
      });
    }
  }, [pta?.id, pta?.estado]);

  // ¿Ya aprobó este jefe su territorial?
  const yaAproboEstaJefatura = useMemo(() => {
    if (!aprobacionesJefatura.length || nivelAprobacion !== 1) return false;
    return aprobacionesJefatura.some(a =>
      ['aprobado', 'aprobado_con_cambios'].includes(a.decision) &&
      (a.jefaturaUserId === actorId || a.territorialId === jefaturaTerritorialId)
    );
  }, [aprobacionesJefatura, actorId, jefaturaTerritorialId, nivelAprobacion]);

  useEffect(() => {
    if (!initialPta?.id) return;
    setLoadingExtras(true);
    getPTAById(initialPta.id).then(res => {
      if (res.success && res.data) {
        const d = res.data;
        setPta({
          ...initialPta,
          ...d,
          investigacion: {
            proyectos: d.investigacion_proyecto?.nombre ? [d.investigacion_proyecto] : [],
            actividades: d.investigacion_actividades || [],
          },
          extension: {
            asesoria: (d.extension_actividades || []).filter((e: any) => e.seccion === 'asesoria'),
            consultoria: (d.extension_actividades || []).filter((e: any) => e.seccion === 'consultoria'),
            capacitacion: (d.extension_actividades || []).filter((e: any) => e.seccion === 'capacitacion'),
            comunidad: (d.extension_actividades || []).filter((e: any) => e.seccion === 'comunidad'),
          },
          complementarias: { actividades: d.complementarias || [] },
          acad_admin: { actividades: d.academico_admin || [] },
        });
      }
      setLoadingExtras(false);
    });
  }, [initialPta?.id]);

  const sc = getStatusConfig(pta.estado);
  const isPendiente = ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(pta.estado);
  const isConcertacion = pta.estado === 'EN_CONCERTACION';

  const horasDisp = pta.horas_a_programar || 800;
  const asignaturas = pta.asignaturas || [];
  const investigacion = pta.investigacion || {};
  const extension = pta.extension || {};
  const complementarias = pta.complementarias || {};
  const acadAdmin = pta.acad_admin || pta.academico_administrativo || {};
  const historial = pta.historial || [];
  const concertacion = pta.concertacion || {};

  const horasDocencia = useMemo(() => {
    if (pta.horas_docencia !== undefined) return pta.horas_docencia;
    return asignaturas.reduce((sum: number, a: any) => sum + (a.total_horas || a.horas || 0), 0);
  }, [pta, asignaturas]);

  const horasInvestigacion = useMemo(() => {
    if (pta.horas_investigacion !== undefined) return pta.horas_investigacion;
    const proyectos = investigacion.proyectos || [];
    const actividades = investigacion.actividades || [];
    return proyectos.reduce((s: number, p: any) => s + (p.horas_solicitadas || 0), 0)
      + actividades.reduce((s: number, a: any) => s + (a.horas_total || 0), 0);
  }, [pta, investigacion]);

  const horasExtension = useMemo(() => {
    if (pta.horas_extension !== undefined) return pta.horas_extension;
    const sections = ['asesoria', 'consultoria', 'capacitacion', 'comunidad'];
    return sections.reduce((total, sec) => {
      const acts = (extension as any)[sec] || [];
      return total + acts.reduce((s: number, a: any) => s + (a.horas || 0), 0);
    }, 0);
  }, [pta, extension]);

  const horasComplementarias = useMemo(() => {
    if (pta.horas_complementarias !== undefined) return pta.horas_complementarias;
    const acts = (complementarias as any).actividades || [];
    return acts.reduce((s: number, a: any) => s + (a.horas || 0), 0);
  }, [pta, complementarias]);

  const horasAcadAdmin = useMemo(() => {
    if (pta.horas_acad_admin !== undefined) return pta.horas_acad_admin;
    const acts = acadAdmin.actividades || [];
    return acts.reduce((s: number, a: any) => s + (a.horas || 0), 0);
  }, [pta, acadAdmin]);

  const horasProg = pta.total_horas_programadas || 0;
  const pctCarga = horasDisp > 0 ? Math.round((horasProg / horasDisp) * 100) : 0;

  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
  const [showFirmaDigital, setShowFirmaDigital] = useState(false);

  const handleAprobar = async () => {
    // Toda aprobación requiere firma digital antes de avanzar
    if (['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(pta.estado)) {
      setShowFirmaDigital(true);
      return;
    }

    // El backend detecta automáticamente camposModificadosPorRevisor al recibir 'aprobar'
    setProcesandoAprobacion(true);
    const res = await updatePTAStatus(pta.id, { accion: 'aprobar' });
    setProcesandoAprobacion(false);
    if (!res.success) {
      toast.error(res.message || 'Error aprobando PTA');
      return;
    }
    const hayModificaciones = pta.camposModificadosPorRevisor &&
      Object.keys(pta.camposModificadosPorRevisor).length > 0;
    if (hayModificaciones) {
      toast.success('PTA enviado al docente para revisión de modificaciones');
    } else {
      toast.success('PTA avanzado a la siguiente fase');
    }
    setPta((prev: any) => ({ ...prev, estado: res.data?.estado || prev.estado }));
    onAprobar();
  };

  const handleFirmaCompleta = async (firmaData: FirmaData) => {
    setShowFirmaDigital(false);

    setProcesandoAprobacion(true);
    const res = await updatePTAStatus(pta.id, {
      accion: 'aprobar',
      observaciones: `Aprobado con firma digital por ${rolLabel} — Certificado: ${firmaData.certificado_id}`,
      actorRol: rolLabel,
      actorId,
      actorTerritorialId: jefaturaTerritorialId,
      isSuperUser: isSuperUser || false,
    } as any);
    setProcesandoAprobacion(false);
    if (!res.success) {
      toast.error(res.message || 'Error aprobando PTA');
      return;
    }
    guardarFirmaDigitalPTA(pta.id, firmaData).catch(() => {});
    if (res.parcial) {
      toast.success(res.message || 'Tu aprobación fue registrada. Esperando otras jefaturas.');
      // Usar aprobaciones del response (ya tienen nombres del JOIN) o re-fetchear
      if (res.aprobaciones?.length) {
        setAprobacionesJefatura(res.aprobaciones);
      } else {
        getAprobacionesJefatura(pta.id).then(r => { if (r.success) setAprobacionesJefatura(r.data || []); });
      }
    } else {
      toast.success('PTA firmado y enviado a la siguiente fase');
      setPta((prev: any) => ({ ...prev, estado: res.data?.estado || prev.estado }));
      onAprobar();
    }
  };

  const handleDevolver = async () => {
    if (!motivoDevolucion.trim()) {
      toast.error('Debe ingresar un motivo de devolución');
      return;
    }
    setProcesandoDevolucion(true);
    const res = await updatePTAStatus(pta.id, {
      accion: 'devolver', motivo_devolucion: motivoDevolucion,
      actorTerritorialId: jefaturaTerritorialId,
    } as any);
    setProcesandoDevolucion(false);
    if (!res.success) {
      toast.error(res.message || 'Error devolviendo PTA');
      return;
    }
    toast.success('PTA devuelto al docente');
    setShowDevolucionModal(false);
    setMotivoDevolucion('');
    setPta((prev: any) => ({ ...prev, estado: 'Devuelto', motivoDevolucion }));
    onDevolver();
  };

  const historialEstados = pta.historialEstados || [];
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [selectedSnapshotVersion, setSelectedSnapshotVersion] = useState<number>(1);

  // Número de la versión del reporte actual (cuenta snapshots guardados)
  const reporteVersionActual = historialEstados.filter((h: any) => h.snapshotPta && typeof h.snapshotPta === 'object').length || 1;

  const TABS = [
    { key: 'resumen', label: 'Resumen', icon: BarChart3 },
    { key: 'componentes', label: 'Componentes', icon: Layers },
    { key: 'historial', label: 'Traza del Proceso', icon: Activity, badge: historialEstados.length },
    ...(isConcertacion || concertacion.mensajes?.length > 0
      ? [{ key: 'concertacion', label: 'Concertación', icon: MessageSquare, badge: concertacion.mensajes?.length || 0 }]
      : []),
  ];

  return (
    <motion.div
      ref={ref}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 65, display: 'flex',
        justifyContent: isMobile ? 'center' : 'flex-end',
        alignItems: isMobile ? 'flex-end' : 'flex-start',
        pointerEvents: 'none', // Allow clicks to pass through wrapper
      }}
    >
      <div 
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }} 
        onClick={onClose} 
      />
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.4)', backdropFilter: 'blur(3px)' }}
      />

      {/* Panel */}
      <motion.div
        initial={isMobile ? { y: '100%' } : { x: '100%' }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: '100%' } : { x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        onClick={e => e.stopPropagation()}
        drag={isMobile ? 'y' : false}
        dragConstraints={isMobile ? { top: 0, bottom: 0 } : undefined}
        dragElastic={isMobile ? { top: 0, bottom: 0.45 } : undefined}
        dragMomentum={false}
        onDragEnd={isMobile ? (_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 450) {
            onClose();
          }
        } : undefined}
        style={{
          position: 'relative', width: '100%',
          maxWidth: isMobile ? '100%' : 640,
          height: isMobile ? '92dvh' : '100vh',
          background: 'white',
          pointerEvents: 'auto',
          boxShadow: isMobile ? '0 -8px 40px rgba(0,0,0,0.18)' : '-8px 0 40px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: isMobile ? '18px 18px 0 0' : 0,
        }}
      >
        {/* ── Drag Handle (solo mobile — swipe-to-close) ────────── */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 4px', flexShrink: 0, cursor: 'grab', userSelect: 'none' }}>
            <div style={{ width: 44, height: 5, borderRadius: 3, background: '#D1D5DB' }} />
            <span style={{ fontSize: '0.55rem', color: '#C4C9D4', marginTop: 3, fontWeight: 500, letterSpacing: '0.02em' }}>
              deslizar hacia abajo para cerrar
            </span>
          </div>
        )}
        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          padding: isMobile ? '10px 16px 12px' : '16px 20px',
          borderBottom: '1px solid #E5E7EB', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? 8 : 12 }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                  {pta.docente_nombre || 'Docente ESAP'}
                </h3>
                <span style={{
                  padding: '3px 10px', borderRadius: 8,
                  background: sc.bg, color: sc.color,
                  fontSize: '0.68rem', fontWeight: 700,
                  border: `1px solid ${sc.color}25`,
                  whiteSpace: 'nowrap',
                }}>
                  {sc.label}
                </span>
                {pta.version && pta.version > 1 && (
                  <span style={{
                    padding: '3px 8px', borderRadius: 8,
                    background: '#F3E8FF', color: '#6B21A8',
                    fontSize: '0.65rem', fontWeight: 700,
                    border: '1px solid #DDD6FE',
                    whiteSpace: 'nowrap',
                  }}>
                    v1.{pta.version - 1}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.72rem', color: '#6B7280' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Hash style={{ width: 11, height: 11 }} /> {pta.id?.substring(0, isMobile ? 8 : 12) || 'N/A'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Calendar style={{ width: 11, height: 11 }} /> {pta.periodo || '2026-1'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Award style={{ width: 11, height: 11 }} /> {pta.dedicacion || 'TC'}
                </span>
                {pta.territorial && !isMobile && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin style={{ width: 11, height: 11 }} /> {pta.territorial}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: isMobile ? 36 : 32, height: isMobile ? 36 : 32, borderRadius: 8, border: 'none',
                background: '#F3F4F6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X style={{ width: 16, height: 16, color: '#6B7280' }} />
            </button>
          </div>

          {/* Approval Tracker */}
          <div style={{ marginTop: 4 }}>
            <ApprovalTracker estado={pta.estado} isMobile={isMobile} />
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', gap: 2,
          padding: isMobile ? '6px 12px' : '8px 20px',
          borderBottom: '1px solid #F3F4F6',
          flexShrink: 0, overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: isMobile ? '9px 12px' : '6px 12px',
                minHeight: isMobile ? 44 : 'auto',
                borderRadius: 7, border: 'none',
                background: activeTab === tab.key ? '#EFF6FF' : 'transparent',
                color: activeTab === tab.key ? '#003DA5' : '#6B7280',
                fontSize: isMobile ? '0.82rem' : '0.78rem',
                fontWeight: activeTab === tab.key ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap', flexShrink: 0,
                WebkitTapHighlightColor: 'rgba(0,61,165,0.08)',
              }}
            >
              <tab.icon style={{ width: 13, height: 13 }} />
              {tab.label}
              {'badge' in tab && (tab as any).badge > 0 && (
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: activeTab === tab.key ? '#003DA5' : '#D1D5DB',
                  color: 'white', fontSize: '0.58rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {(tab as any).badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────── */}
        {loadingExtras ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
            <Loader2 style={{ width: 32, height: 32 }} className="animate-spin" />
            <div style={{ marginTop: 12, fontSize: '0.85rem', fontWeight: 500 }}>Cargando detalles...</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 14px 60px' : '16px 20px 60px' }}>
            {/* ═══ TAB: Resumen ═══ */}
          {activeTab === 'resumen' && (
            <div>
              {/* KPI Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 6 : 8, marginBottom: pta.semanas_prorrateo && pta.semanas_prorrateo < 16 ? 4 : 16 }}>
                {[
                  { label: isMobile ? 'Prog.' : 'Horas Programadas', value: horasProg, color: '#003DA5', bg: '#EFF6FF' },
                  { label: isMobile ? 'Disp.' : 'Horas Disponibles', value: horasDisp, color: '#059669', bg: '#D1FAE5' },
                  { label: 'Carga', value: `${pctCarga}%`, color: pctCarga > 100 ? '#DC2626' : pctCarga > 90 ? '#D97706' : '#059669', bg: pctCarga > 100 ? '#FEE2E2' : pctCarga > 90 ? '#FEF3C7' : '#D1FAE5' },
                ].map(item => (
                  <div key={item.label} style={{ padding: isMobile ? '8px 8px' : '10px 12px', borderRadius: 10, background: item.bg, border: `1px solid ${item.color}15` }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 600, color: item.color, textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{item.label}</div>
                    <div style={{ fontSize: isMobile ? '1rem' : '1.15rem', fontWeight: 800, color: item.color, marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {pta.semanas_prorrateo && pta.semanas_prorrateo < 16 && (
                <div style={{
                  padding: '6px 12px', borderRadius: 8, marginBottom: 16,
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.72rem', color: '#991B1B', fontWeight: 600
                }}>
                  <Calculator style={{ width: 14, height: 14 }} />
                  Carga Prorrateada ({pta.semanas_prorrateo} semanas)
                </div>
              )}

              {/* Carga Alert */}
              {pctCarga > 100 && (
                <div style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 14,
                  background: '#FEE2E2', border: '1px solid #FCA5A5',
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontSize: '0.76rem', color: '#991B1B',
                }}>
                  <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  <span>
                    <strong>Sobrecarga:</strong>{' '}
                    {isMobile
                      ? `${horasProg}h / ${horasDisp}h (${pctCarga}%)`
                      : `El docente tiene ${horasProg}h programadas sobre un máximo de ${horasDisp}h (${pctCarga}%)`
                    }
                  </span>
                </div>
              )}

              {/* ─── Indicador de Aprobaciones Multi-Jefatura ─── */}
              {aprobacionesJefatura.length >= 1 && pta.estado === 'Pendiente Jefatura' && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: '#EFF6FF', border: '1px solid #BFDBFE',
                  marginBottom: 14,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#003DA5', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Shield style={{ width: 13, height: 13 }} />
                      Aprobaciones de Jefatura
                    </span>
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 800,
                      color: aprobacionesJefatura.filter(a => ['aprobado','aprobado_con_cambios'].includes(a.decision)).length === aprobacionesJefatura.length ? '#059669' : '#D97706',
                    }}>
                      {aprobacionesJefatura.filter(a => ['aprobado','aprobado_con_cambios'].includes(a.decision)).length}
                      {' / '}
                      {aprobacionesJefatura.length}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {aprobacionesJefatura.map((a: any) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem' }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: a.decision === 'aprobado' ? '#059669'
                            : a.decision === 'aprobado_con_cambios' ? '#D97706'
                            : a.decision === 'devuelto' ? '#DC2626'
                            : '#9CA3AF',
                        }} />
                        <span style={{ flex: 1, color: '#374151' }}>
                          {a.territorialNombre || a.territorial_nombre_actual || a.territorialId}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          color: a.decision === 'aprobado' ? '#059669'
                            : a.decision === 'aprobado_con_cambios' ? '#D97706'
                            : a.decision === 'devuelto' ? '#DC2626'
                            : '#9CA3AF',
                        }}>
                          {a.decision === 'aprobado' ? '✓ Aprobado'
                            : a.decision === 'aprobado_con_cambios' ? '~ Con cambios'
                            : a.decision === 'devuelto' ? '✗ Devuelto'
                            : '⏳ Pendiente'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Component Distribution — side-by-side: Donut (left) + Bars (right) */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calculator style={{ width: 14, height: 14, color: '#003DA5' }} />
                    Distribución por Componente
                  </h4>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {/* Donut Chart (left) */}
                  {(() => {
                    const donutComps = [
                      { label: 'Docencia', value: horasDocencia, color: PTA_COLORS.DOCENCIA },
                      { label: 'Investigación', value: horasInvestigacion, color: PTA_COLORS.INVESTIGACION },
                      { label: 'Extensión', value: horasExtension, color: PTA_COLORS.EXTENSION },
                      { label: 'Complementarias', value: horasComplementarias, color: PTA_COLORS.COMPLEMENTARIAS },
                      { label: 'Acad. Admin.', value: horasAcadAdmin, color: PTA_COLORS.ACAD_ADMIN },
                    ];
                    const size = isMobile ? 110 : 130;
                    const sw = isMobile ? 14 : 16;
                    const donutR = (size - sw) / 2;
                    const donutC = 2 * Math.PI * donutR;
                    const donutWithData = donutComps.filter(c => c.value > 0);
                    let cumOff = 0;
                    const segs = donutWithData.map(c => {
                      const pct = horasProg > 0 ? c.value / horasProg : 0;
                      const dl = pct * donutC;
                      const doff = -cumOff;
                      cumOff += dl;
                      return { ...c, dl, doff };
                    });
                    return (
                      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
                        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx={size / 2} cy={size / 2} r={donutR} fill="none" stroke="#F3F4F6" strokeWidth={sw} />
                          {segs.map(seg => (
                            <circle
                              key={seg.label}
                              cx={size / 2} cy={size / 2} r={donutR}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth={sw}
                              strokeDasharray={`${seg.dl} ${donutC - seg.dl}`}
                              strokeDashoffset={seg.doff}
                              strokeLinecap="butt"
                              style={{ transition: 'stroke-dasharray 0.5s ease-out, stroke-dashoffset 0.5s ease-out' }}
                            />
                          ))}
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: isMobile ? '1.1rem' : '1.3rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>{horasProg}</span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>horas</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Component Bars (right) */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ComponentBar label="Docencia" hours={horasDocencia} total={horasDisp} color={PTA_COLORS.DOCENCIA} icon={BookOpen} />
                    <ComponentBar label="Investigación" hours={horasInvestigacion} total={horasDisp} color={PTA_COLORS.INVESTIGACION} icon={FlaskConical} />
                    <ComponentBar label="Extensión" hours={horasExtension} total={horasDisp} color={PTA_COLORS.EXTENSION} icon={Globe} />
                    <ComponentBar label="Complementarias" hours={horasComplementarias} total={horasDisp} color={PTA_COLORS.COMPLEMENTARIAS} icon={Briefcase} />
                    <ComponentBar label="Acad. Admin." hours={horasAcadAdmin} total={horasDisp} color={PTA_COLORS.ACAD_ADMIN} icon={Award} />
                  </div>
                </div>
              </div>

              {/* Pie summary — 3 cols mobile, 5 cols desktop */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
                gap: 6, marginBottom: 16,
              }}>
                {[
                  { label: 'Doc.', value: horasDocencia, pct: horasProg > 0 ? Math.round((horasDocencia / horasProg) * 100) : 0, color: PTA_COLORS.DOCENCIA },
                  { label: 'Inv.', value: horasInvestigacion, pct: horasProg > 0 ? Math.round((horasInvestigacion / horasProg) * 100) : 0, color: PTA_COLORS.INVESTIGACION },
                  { label: 'Ext.', value: horasExtension, pct: horasProg > 0 ? Math.round((horasExtension / horasProg) * 100) : 0, color: PTA_COLORS.EXTENSION },
                  { label: 'Comp.', value: horasComplementarias, pct: horasProg > 0 ? Math.round((horasComplementarias / horasProg) * 100) : 0, color: PTA_COLORS.COMPLEMENTARIAS },
                  { label: 'A.Adm.', value: horasAcadAdmin, pct: horasProg > 0 ? Math.round((horasAcadAdmin / horasProg) * 100) : 0, color: PTA_COLORS.ACAD_ADMIN },
                ].map(item => (
                  <div key={item.label} style={{
                    textAlign: 'center', padding: '8px 4px', borderRadius: 8,
                    background: `${item.color}08`, border: `1px solid ${item.color}15`,
                  }}>
                    <div style={{ fontSize: isMobile ? '0.92rem' : '1rem', fontWeight: 800, color: item.color }}>{item.pct}%</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{item.value}h</div>
                  </div>
                ))}
              </div>

              {/* Info Grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16,
              }}>
                {[
                  { label: 'Programa', value: pta.programa || 'No especificado', icon: GraduationCap },
                  { label: 'Territorial', value: pta.territorial || 'No especificada', icon: MapPin },
                  { label: 'Asignaturas', value: `${pta.num_asignaturas || asignaturas.length || 0}`, icon: BookOpen },
                  { label: 'Dedicación', value: pta.dedicacion || 'TC', icon: Clock },
                  { label: 'Vinculación', value: pta.tipo_vinculacion || 'Carrera Administrativa', icon: Award },
                  { label: 'Escalafón', value: pta.escalafon || 'No registrado', icon: TrendingUp },
                  { label: 'Factor Prorrateo', value: `${pta.semanas_prorrateo || 16} Semanas`, icon: Calculator },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8, background: '#F9FAFB',
                    border: '1px solid #F3F4F6', minWidth: 0,
                  }}>
                    <item.icon style={{ width: 13, height: 13, color: '#9CA3AF', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Observaciones / Motivo devolución */}
              {pta.motivo_devolucion && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                  background: '#FFF7ED', border: '1px solid #FDBA74',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9A3412', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <RotateCcw style={{ width: 12, height: 12 }} /> Motivo de Devolución
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                    {pta.motivo_devolucion}
                  </p>
                </div>
              )}

              {pta.observaciones && !pta.motivo_devolucion && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 12,
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>
                    Observaciones
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                    {pta.observaciones}
                  </p>
                </div>
              )}

            </div>
          )}

          {/* ═══ TAB: Componentes ═══ */}
          {activeTab === 'componentes' && (
            <div>
              {/* Edición completa — solo para revisores */}
              {puedeAprobar && isPendiente && (
                <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 500 }}>
                    Como revisor puede editar el PTA completo antes de aprobar
                  </span>
                  <button
                    onClick={() => setShowEditForm(true)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none',
                      background: '#003DA5', color: 'white',
                      fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                    }}
                  >
                    <Edit2 style={{ width: 12, height: 12 }} /> Editar PTA
                  </button>
                </div>
              )}

              {/* Docencia */}
              <SectionCollapsible
                title="Componente Docencia"
                icon={BookOpen}
                color="#4472C4"
                count={asignaturas.length}
                defaultOpen={true}
              >
                {asignaturas.length > 0 ? (
                  <div>
                    {/* Scroll horizontal en mobile para la tabla de asignaturas */}
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <div style={{ minWidth: 280 }}>
                        <div style={{
                          display: 'grid', gridTemplateColumns: '1fr 56px 46px 58px',
                          gap: 4, padding: '6px 0', borderBottom: '1px solid #E5E7EB',
                          fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
                        }}>
                          <span>Asignatura</span>
                          <span style={{ textAlign: 'center' }}>Créd.</span>
                          <span style={{ textAlign: 'center' }}>Sem.</span>
                          <span style={{ textAlign: 'right' }}>Horas</span>
                        </div>
                        {asignaturas.map((a: any, i: number) => (
                          <div key={i} style={{
                            display: 'grid', gridTemplateColumns: '1fr 56px 46px 58px',
                            gap: 4, padding: '7px 0',
                            borderBottom: i < asignaturas.length - 1 ? '1px solid #F9FAFB' : 'none',
                          }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.76rem', fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.nombre || a.asignatura_nombre}
                              </div>
                              {a.nucleo_tematico && (
                                <div style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>{a.nucleo_tematico}</div>
                              )}
                              {a.observaciones && (
                                <div style={{ fontSize: '0.65rem', color: '#4B5563', fontStyle: 'italic', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{fontWeight: 600}}>Obs:</span> {a.observaciones}
                                </div>
                              )}
                            </div>
                            <span style={{ textAlign: 'center', fontSize: '0.76rem', color: '#6B7280' }}>{a.creditos || 0}</span>
                            <span style={{ textAlign: 'center', fontSize: '0.76rem', color: '#6B7280' }}>{a.semestre || '-'}</span>
                            <span style={{ textAlign: 'right', fontSize: '0.76rem', fontWeight: 700, color: '#003DA5' }}>
                              {a.total_horas || a.horas || 0}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'flex-end', gap: 12,
                      padding: '8px 0 0', borderTop: '1px solid #E5E7EB', marginTop: 4,
                    }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#003DA5' }}>
                        Total Docencia: {horasDocencia}h
                      </span>
                    </div>
                    {/* Formula note */}
                    <div style={{
                      marginTop: 8, padding: '6px 10px', borderRadius: 6,
                      background: '#F0F9FF', border: '1px solid #BAE6FD',
                      fontSize: '0.62rem', color: '#0369A1',
                    }}>
                      <strong>Fórmula GTH-F081:</strong> K15 = Horas base (AP=64, Maestría=créd×12, otros=créd×16) → L15 = K15 × 3
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>
                    Sin asignaturas registradas
                  </p>
                )}
              </SectionCollapsible>

              {/* Investigación */}
              <SectionCollapsible
                title="Componente Investigación"
                icon={FlaskConical}
                color="#ED7D31"
                count={(investigacion.proyectos?.length || 0) + (investigacion.actividades?.length || 0)}
              >
                {investigacion.proyectos?.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7C3AED', marginBottom: 6, textTransform: 'uppercase' }}>
                      Proyectos
                    </div>
                    {investigacion.proyectos.map((p: any, i: number) => (
                      <div key={i} style={{
                        padding: '8px 10px', borderRadius: 8, background: '#FAFAFA',
                        border: '1px solid #F3F4F6', marginBottom: 4,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', flex: 1 }}>{p.nombre}</div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', whiteSpace: 'nowrap' }}>{p.horas_solicitadas}h</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: '0.68rem', color: '#9CA3AF', marginTop: 3, flexWrap: 'wrap' }}>
                          {p.grupo && <span>Grupo: {p.grupo}</span>}
                          {p.rol && <span>Rol: {p.rol}</span>}
                        </div>
                        {(p.fecha_inicio || p.fecha_fin) && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                            {p.fecha_inicio && <span>Inicio: <strong>{fmtFecha(p.fecha_inicio)}</strong></span>}
                            {p.fecha_fin && <span>Fin: <strong>{fmtFecha(p.fecha_fin)}</strong></span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {investigacion.actividades?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7C3AED', marginBottom: 6, textTransform: 'uppercase' }}>
                      Actividades
                    </div>
                    {investigacion.actividades.map((a: any, i: number) => (
                      <div key={i} style={{
                        padding: '7px 10px', borderRadius: 6, background: '#FAFAFA',
                        border: '1px solid #F3F4F6', marginBottom: 4,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, flex: 1 }}>{a.nombre}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', whiteSpace: 'nowrap' }}>{a.horas_total || a.horas}h</span>
                        </div>
                        {a.descripcion && (
                          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>{a.descripcion}</div>
                        )}
                        {(a.fecha_inicio || a.fecha_fin) && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                            {a.fecha_inicio && <span>Inicio: <strong>{fmtFecha(a.fecha_inicio)}</strong></span>}
                            {a.fecha_fin && <span>Fin: <strong>{fmtFecha(a.fecha_fin)}</strong></span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!investigacion.proyectos?.length && !investigacion.actividades?.length && (
                  <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
                    Sin actividades de investigación
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7C3AED' }}>
                    Total Investigación: {horasInvestigacion}h
                  </span>
                </div>
              </SectionCollapsible>

              {/* Extensión */}
              <SectionCollapsible
                title="Componente Extensión (4 secciones)"
                icon={Globe}
                color="#A5A5A5"
              >
                {['asesoria', 'consultoria', 'capacitacion', 'comunidad'].map(sec => {
                  const LABELS: Record<string, string> = {
                    asesoria: 'Asesoría y Acompañamiento',
                    consultoria: 'Consultoría e Interventoría',
                    capacitacion: 'Capacitación y Formación',
                    comunidad: 'Proyección Social y Comunidad',
                  };
                  const acts = extension[sec] || [];
                  if (acts.length === 0) return null;
                  return (
                    <div key={sec} style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', marginBottom: 4, textTransform: 'uppercase' }}>
                        {LABELS[sec]}
                      </div>
                      {acts.map((a: any, i: number) => (
                        <div key={i} style={{
                          padding: '7px 10px', borderRadius: 6, background: '#FAFAFA',
                          border: '1px solid #F3F4F6', marginBottom: 3,
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, flex: 1 }}>{a.nombre}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>{a.horas}h</span>
                          </div>
                          {a.descripcion && (
                            <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>{a.descripcion}</div>
                          )}
                          {(a.fecha_inicio || a.fecha_fin) && (
                            <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                              {a.fecha_inicio && <span>Inicio: <strong>{fmtFecha(a.fecha_inicio)}</strong></span>}
                              {a.fecha_fin && <span>Fin: <strong>{fmtFecha(a.fecha_fin)}</strong></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {!['asesoria', 'consultoria', 'capacitacion', 'comunidad'].some(sec => (extension[sec] || []).length > 0) && (
                  <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
                    Sin actividades de extensión
                  </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                    Total Extensión: {horasExtension}h
                  </span>
                </div>
              </SectionCollapsible>

              {/* Complementarias */}
              <SectionCollapsible
                title="Actividades Complementarias"
                icon={Briefcase}
                color="#FFC000"
                count={complementarias.actividades?.length || 0}
              >
                {complementarias.actividades?.length > 0 ? (
                  <>
                    {complementarias.actividades.map((a: any, i: number) => (
                      <div key={i} style={{
                        padding: '7px 10px', borderRadius: 6, background: '#FAFAFA',
                        border: '1px solid #F3F4F6', marginBottom: 4,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, flex: 1 }}>{a.nombre}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#D97706', whiteSpace: 'nowrap' }}>{a.horas}h</span>
                        </div>
                        {a.descripcion && (
                          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>{a.descripcion}</div>
                        )}
                        {(a.fecha_inicio || a.fecha_fin) && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                            {a.fecha_inicio && <span>Inicio: <strong>{fmtFecha(a.fecha_inicio)}</strong></span>}
                            {a.fecha_fin && <span>Fin: <strong>{fmtFecha(a.fecha_fin)}</strong></span>}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706' }}>
                        Total Complementarias: {horasComplementarias}h
                      </span>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
                    Sin actividades complementarias
                  </p>
                )}
              </SectionCollapsible>

              {/* Académico Administrativo */}
              <SectionCollapsible
                title="Actividades Académico Administrativo"
                icon={Award}
                color="#FFC000"
                count={acadAdmin.actividades?.length || 0}
              >
                {acadAdmin.actividades?.length > 0 ? (
                  <>
                    {acadAdmin.actividades.map((a: any, i: number) => (
                      <div key={i} style={{
                        padding: '7px 10px', borderRadius: 6, background: '#FAFAFA',
                        border: '1px solid #F3F4F6', marginBottom: 4,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500, flex: 1 }}>{a.nombre}</span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B21A8', whiteSpace: 'nowrap' }}>{a.horas}h</span>
                        </div>
                        {a.descripcion && (
                          <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 3, lineHeight: 1.4 }}>{a.descripcion}</div>
                        )}
                        {(a.fecha_inicio || a.fecha_fin) && (
                          <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                            {a.fecha_inicio && <span>Inicio: <strong>{fmtFecha(a.fecha_inicio)}</strong></span>}
                            {a.fecha_fin && <span>Fin: <strong>{fmtFecha(a.fecha_fin)}</strong></span>}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B21A8' }}>
                        Total Acad. Admin.: {horasAcadAdmin}h
                      </span>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>
                    Sin actividades académico administrativas
                  </p>
                )}
              </SectionCollapsible>

              {/* Summary bar */}
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)',
                border: '1px solid #BFDBFE',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: '0.82rem',
              }}>
                <span style={{ fontWeight: 700, color: '#111827' }}>Total PTA</span>
                <span style={{ fontWeight: 800, color: '#003DA5', fontSize: '0.95rem' }}>
                  {horasProg}h / {horasDisp}h ({pctCarga}%)
                </span>
              </div>
            </div>
          )}

          {/* ═══ TAB: Traza del Proceso ═══ */}
          {activeTab === 'historial' && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity style={{ width: 15, height: 15, color: '#4F46E5' }} />
                Traza del Proceso ({historialEstados.length} transiciones)
              </h4>
              {historialEstados.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  {/* Línea vertical */}
                  <div style={{ position: 'absolute', top: 14, bottom: 14, left: 15, width: 2, background: '#E0E7FF', borderRadius: 1 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(() => {
                      // Asignar números de reporte según orden de display (arriba=1, abajo=N)
                      const displayOrder = [...historialEstados].reverse();
                      const snapshotNums = new Map<string, number>();
                      let reporteNum = 1;
                      displayOrder.forEach((s: any, i: number) => {
                        if (s.snapshotPta && typeof s.snapshotPta === 'object') {
                          snapshotNums.set(s.id || String(i), reporteNum++);
                        }
                      });
                      return displayOrder.map((step: any, idx: number, arr: any[]) => {
                      const isLatest = idx === 0;
                      const hsc = getStatusConfig(step.estadoNuevo || '');
                      const date = step.createdAt ? new Date(step.createdAt) : null;
                      const snap = step.snapshotPta;
                      const hasSnapshot = snap && typeof snap === 'object';
                      const reporteNumStep = hasSnapshot ? snapshotNums.get(step.id || String(idx)) : null;
                      return (
                        <motion.div
                          key={step.id || idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          onClick={() => { if (hasSnapshot) { setSelectedSnapshot(step); setSelectedSnapshotVersion(reporteNumStep || 1); } }}
                          style={{
                            display: 'flex', gap: 14, position: 'relative', zIndex: 1,
                            padding: '10px 12px', borderRadius: 10, marginLeft: 0,
                            cursor: hasSnapshot ? 'pointer' : 'default',
                            background: isLatest ? `${hsc.bg || '#F3F4F6'}` : 'transparent',
                            border: isLatest ? `1px solid ${hsc.color}20` : '1px solid transparent',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (hasSnapshot) { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; } }}
                          onMouseLeave={e => { if (!isLatest) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } else { e.currentTarget.style.background = hsc.bg || '#F3F4F6'; e.currentTarget.style.borderColor = `${hsc.color}20`; } }}
                        >
                          {/* Dot */}
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: isLatest ? (hsc.color || '#4F46E5') : 'white',
                            border: `2.5px solid ${isLatest ? (hsc.color || '#4F46E5') : '#CBD5E1'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: isLatest ? `0 0 0 3px ${hsc.color}18` : 'none',
                          }}>
                            <CheckCircle style={{ width: 14, height: 14, color: isLatest ? 'white' : '#94A3B8' }} />
                          </div>
                          {/* Content */}
                          <div style={{ flex: 1, paddingTop: 2, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                              <span style={{
                                padding: '2px 8px', borderRadius: 6,
                                background: hsc.bg || '#F3F4F6', color: hsc.color || '#374151',
                                fontSize: '0.72rem', fontWeight: 700,
                                border: `1px solid ${hsc.color || '#D1D5DB'}20`,
                              }}>
                                {step.estadoNuevo?.replace(/_/g, ' ')}
                              </span>
                              {step.version && step.version > 1 && (
                                <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 6, background: '#F3E8FF', color: '#6B21A8', fontWeight: 700 }}>v{step.version}</span>
                              )}
                            </div>
                            {date && (
                              <div style={{ fontSize: '0.68rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                <Calendar style={{ width: 11, height: 11, color: '#9CA3AF' }} />
                                {date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                <Clock style={{ width: 11, height: 11, color: '#9CA3AF', marginLeft: 4 }} />
                                <span style={{ color: '#374151', fontWeight: 600 }}>
                                  {date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              {step.actorRol && (
                                <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Users style={{ width: 10, height: 10 }} /> {step.actorRol}
                                </span>
                              )}
                              {hasSnapshot && (
                                <span style={{
                                  fontSize: '0.6rem', color: '#4F46E5', fontWeight: 700,
                                  display: 'flex', alignItems: 'center', gap: 3,
                                  padding: '2px 7px', borderRadius: 4, background: '#EEF2FF',
                                  border: '1px solid #C7D2FE',
                                }}>
                                  <Eye style={{ width: 10, height: 10 }} /> R-{String(reporteNumStep).padStart(2, '0')}
                                </span>
                              )}
                            </div>
                            {step.comentarios && (
                              <p style={{
                                fontSize: '0.72rem', color: '#64748B', margin: '5px 0 0',
                                padding: '5px 8px', background: '#F8FAFC', borderRadius: 6,
                                border: '1px solid #E2E8F0', lineHeight: 1.4, fontStyle: 'italic',
                              }}>
                                "{step.comentarios}"
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    });
                    })()}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Activity style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6B7280' }}>Sin transiciones registradas</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>El historial se genera automáticamente con cada cambio de estado.</p>
                </div>
              )}

            </div>
          )}

          {/* ═══ TAB: Concertación ═══ */}
          {activeTab === 'concertacion' && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare style={{ width: 15, height: 15, color: '#7C3AED' }} />
                Mesa de Concertación
              </h4>

              {concertacion.mensajes?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {concertacion.mensajes.map((msg: any, i: number) => {
                    const isDocente = msg.autor_rol === 'docente';
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '10px 14px', borderRadius: 10,
                          background: isDocente ? '#F3E8FF' : '#EFF6FF',
                          border: `1px solid ${isDocente ? '#DDD6FE' : '#BFDBFE'}`,
                          alignSelf: isDocente ? 'flex-start' : 'flex-end',
                          maxWidth: '85%',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isDocente ? '#6B21A8' : '#1E40AF' }}>
                            {msg.autor} ({msg.autor_rol})
                          </span>
                          <span style={{ fontSize: '0.62rem', color: '#9CA3AF', marginLeft: 12 }}>
                            {msg.fecha ? timeAgo(msg.fecha) : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                          {msg.mensaje}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <MessageSquare style={{ width: 32, height: 32, color: '#D1D5DB', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Sin mensajes de concertación</p>
                </div>
              )}

              {isConcertacion && (
                <button
                  onClick={onConcertar}
                  style={{
                    width: '100%', padding: '10px 16px', borderRadius: 10,
                    border: '1px solid #DDD6FE', background: '#F3E8FF',
                    color: '#6B21A8', fontWeight: 700, fontSize: '0.85rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                  }}
                >
                  <MessageSquare style={{ width: 15, height: 15 }} />
                  Abrir Mesa de Concertación Completa
                </button>
              )}
            </div>
          )}
        </div>
        )}

        {/* ── Modal Devolución ───────────────────────────────────── */}
        <AnimatePresence>
          {showDevolucionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0, zIndex: 10,
                background: 'rgba(17,24,39,0.55)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', padding: 20,
              }}
              onClick={() => setShowDevolucionModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                  background: 'white', borderRadius: 14, padding: '20px 22px',
                  width: '100%', maxWidth: 380,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <RotateCcw style={{ width: 18, height: 18, color: '#9A3412' }} />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                    Devolver PTA al Docente
                  </h4>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '0 0 10px' }}>
                  El PTA volverá a <strong>Borrador</strong> con el motivo visible para el docente.
                </p>
                <textarea
                  value={motivoDevolucion}
                  onChange={e => setMotivoDevolucion(e.target.value)}
                  placeholder="Ej. El componente de investigación no está justificado correctamente..."
                  rows={3}
                  autoFocus
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid #D1D5DB', fontSize: '0.82rem',
                    resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowDevolucionModal(false)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDevolver}
                    disabled={!motivoDevolucion.trim() || procesandoDevolucion}
                    style={{
                      padding: '7px 16px', borderRadius: 8, border: 'none',
                      background: motivoDevolucion.trim() && !procesandoDevolucion ? '#9A3412' : '#9CA3AF',
                      color: 'white', fontSize: '0.8rem', fontWeight: 700,
                      cursor: motivoDevolucion.trim() && !procesandoDevolucion ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <RotateCcw style={{ width: 13, height: 13 }} />
                    {procesandoDevolucion ? 'Devolviendo...' : 'Confirmar Devolución'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer Actions ─────────────────────────────────────── */}
        <div style={{
          padding: isMobile ? '10px 14px 14px' : '12px 20px',
          borderTop: '1px solid #E5E7EB',
          flexShrink: 0, background: '#FAFAFA',
        }}>
          {/* Mobile: columna completa. Desktop: fila space-between */}
          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isPendiente && puedeAprobar && (
                <>
                  {yaAproboEstaJefatura ? (
                    <div style={{
                      width: '100%', padding: '12px 18px', borderRadius: 10,
                      background: '#D1FAE5', color: '#065F46',
                      fontWeight: 700, fontSize: '0.88rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                      <CheckCircle style={{ width: 15, height: 15 }} />
                      ✓ Tu firma ya fue registrada — esperando otras jefaturas
                    </div>
                  ) : (
                  <button
                    onClick={pctCarga === 100 ? handleAprobar : () => toast.error(`Circular 003: El PTA debe alcanzar exactamente el 100% de carga para ser aprobado (Actual: ${pctCarga}%). Ajuste los componentes en la pestaña Componentes.`)}
                    disabled={procesandoAprobacion}
                    style={{
                      width: '100%', padding: '12px 18px', borderRadius: 10,
                      border: 'none', background: pctCarga === 100 && !procesandoAprobacion ? '#003DA5' : '#D1D5DB', color: 'white',
                      fontWeight: 700, fontSize: '0.88rem',
                      cursor: pctCarga === 100 && !procesandoAprobacion ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: pctCarga === 100 ? 1 : 0.7,
                    }}
                  >
                    <CheckCircle style={{ width: 15, height: 15 }} />
                    {procesandoAprobacion ? 'Procesando...' : pctCarga === 100 ? getNextStateLabel(pta.estado, !!(pta.camposModificadosPorRevisor && Object.keys(pta.camposModificadosPorRevisor).length > 0)) : 'Aprobación Bloqueada (Circular 003)'}
                  </button>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setShowDevolucionModal(true)}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #FDBA74', background: '#FFF7ED',
                        color: '#9A3412', fontWeight: 600, fontSize: '0.8rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      <RotateCcw style={{ width: 13, height: 13 }} /> Devolver
                    </button>
                    <button
                      onClick={onVerReporte}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 10,
                        border: '1px solid #BFDBFE', background: '#EFF6FF',
                        color: '#1E40AF', fontWeight: 600, fontSize: '0.8rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      <Eye style={{ width: 13, height: 13 }} /> R-01
                    </button>
                  </div>
                </>
              )}
              {isConcertacion && (
                <>
                  <button
                    onClick={onConcertar}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      border: '1px solid #DDD6FE', background: '#F3E8FF',
                      color: '#6B21A8', fontWeight: 700, fontSize: '0.88rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <MessageSquare style={{ width: 15, height: 15 }} /> Abrir Mesa de Concertación
                  </button>
                  <button
                    onClick={onVerReporte}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1px solid #BFDBFE', background: '#EFF6FF',
                      color: '#1E40AF', fontWeight: 600, fontSize: '0.8rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Eye style={{ width: 13, height: 13 }} /> Reporte R-{String(reporteVersionActual).padStart(2, '0')}
                  </button>
                </>
              )}
              {!isPendiente && !isConcertacion && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={onVerReporte}
                    style={{
                      flex: 1, padding: '11px 14px', borderRadius: 10,
                      border: '1px solid #BFDBFE', background: '#EFF6FF',
                      color: '#1E40AF', fontWeight: 600, fontSize: '0.82rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Eye style={{ width: 13, height: 13 }} /> Reporte R-{String(reporteVersionActual).padStart(2, '0')}
                  </button>
                  {pta.estado !== 'Aprobado' && (
                    <button
                      onClick={() => setActiveTab('componentes')}
                      style={{
                        flex: 1, padding: '11px 14px', borderRadius: 10,
                        border: '1px solid #BFDBFE', background: '#EFF6FF',
                        color: '#003DA5', fontWeight: 600, fontSize: '0.82rem',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      }}
                    >
                      <Layers style={{ width: 13, height: 13 }} /> Concertar
                    </button>
                  )}
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center',
                  }}>
                    {pta.estado === 'Aprobado' ? '✓ PTA aprobado' :
                     pta.estado === 'Rechazado' ? '✗ PTA rechazado' :
                     `${sc.label}`}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Desktop: fila space-between */
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={onVerReporte}
                  style={{
                    padding: '7px 14px', borderRadius: 8,
                    border: '1px solid #BFDBFE', background: '#EFF6FF',
                    color: '#1E40AF', fontWeight: 600, fontSize: '0.78rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Eye style={{ width: 13, height: 13 }} /> Reporte R-{String(reporteVersionActual).padStart(2, '0')}
                </button>
                {pta.estado !== 'Aprobado' && (
                  <button
                    onClick={() => setActiveTab('componentes')}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      border: '1px solid #BFDBFE', background: '#EFF6FF',
                      color: '#003DA5', fontWeight: 600, fontSize: '0.78rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <Layers style={{ width: 13, height: 13 }} /> Concertar
                  </button>
                )}
              </div>

              {isPendiente && puedeAprobar && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {!yaAproboEstaJefatura && (
                  <button
                    onClick={() => setShowDevolucionModal(true)}
                    style={{
                      padding: '7px 14px', borderRadius: 8,
                      border: '1px solid #FDBA74', background: '#FFF7ED',
                      color: '#9A3412', fontWeight: 600, fontSize: '0.78rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <RotateCcw style={{ width: 13, height: 13 }} /> Devolver
                  </button>
                  )}
                  {yaAproboEstaJefatura ? (
                    <div style={{
                      padding: '7px 14px', borderRadius: 8,
                      background: '#D1FAE5', color: '#065F46',
                      fontWeight: 700, fontSize: '0.78rem',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <CheckCircle style={{ width: 13, height: 13 }} />
                      Firma registrada — esperando otras jefaturas
                    </div>
                  ) : (
                  <button
                    onClick={pctCarga === 100 ? handleAprobar : () => toast.error(`Circular 003: El PTA debe alcanzar exactamente el 100% de carga para ser aprobado (Actual: ${pctCarga}%). Ajuste los componentes en la pestaña Componentes.`)}
                    disabled={procesandoAprobacion}
                    style={{
                      padding: '7px 18px', borderRadius: 8,
                      border: 'none', background: pctCarga === 100 && !procesandoAprobacion ? '#003DA5' : '#D1D5DB', color: 'white',
                      fontWeight: 700, fontSize: '0.78rem',
                      cursor: pctCarga === 100 && !procesandoAprobacion ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <CheckCircle style={{ width: 13, height: 13 }} />
                    {procesandoAprobacion ? 'Procesando...' : pctCarga === 100 ? getNextStateLabel(pta.estado, !!(pta.camposModificadosPorRevisor && Object.keys(pta.camposModificadosPorRevisor).length > 0)) : 'Progreso Incompleto'}
                  </button>
                  )}
                </div>
              )}

              {isConcertacion && (
                <button
                  onClick={onConcertar}
                  style={{
                    padding: '7px 16px', borderRadius: 8,
                    border: '1px solid #DDD6FE', background: '#F3E8FF',
                    color: '#6B21A8', fontWeight: 700, fontSize: '0.78rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <MessageSquare style={{ width: 13, height: 13 }} /> Concertar
                </button>
              )}

              {!isPendiente && !isConcertacion && (
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                  {pta.estado === 'Aprobado' ? 'PTA aprobado — solo lectura' :
                   pta.estado === 'Rechazado' ? 'PTA rechazado' :
                   `Estado: ${sc.label}`}
                </span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Reporte versionado desde Traza del Proceso ── */}
      {selectedSnapshot && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={() => setSelectedSnapshot(null)}
        >
          <div
            style={{
              background: 'white', borderRadius: 16, width: '100%', maxWidth: 940,
              maxHeight: '94vh', overflow: 'auto',
              boxShadow: '0 25px 80px rgba(0,0,0,0.3)', padding: 20,
            }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const snap = selectedSnapshot.snapshotPta || {};
              const snapDate = selectedSnapshot.createdAt ? new Date(selectedSnapshot.createdAt).getTime() : Infinity;
              // Filter historial to only include entries up to and including the snapshot date
              const filteredHistorial = (pta.historialEstados || []).filter((h: any) => {
                if (!h.createdAt) return true;
                return new Date(h.createdAt).getTime() <= snapDate;
              });
              // Build snapshot PTA: snapshot content first, then identity fields that shouldn't change
              // Enrich snapshot asignaturas with names from current PTA if snapshot only has IDs
              const snapAsignaturas = snap.asignaturas || [];
              const currentAsigMap = new Map<string, any>((pta.asignaturas || []).map((a: any) => [a.id || a.asignatura_id, a]));
              const enrichedAsignaturas = snapAsignaturas.map((sa: any) => {
                const current = currentAsigMap.get(sa.id || sa.asignatura_id);
                return {
                  ...sa,
                  nombre: sa.nombre || sa.asignatura_nombre || current?.nombre || current?.asignatura_nombre || sa.nombre,
                  asignatura_nombre: sa.asignatura_nombre || sa.nombre || current?.asignatura_nombre || current?.nombre || sa.asignatura_nombre,
                  programa_nombre: sa.programa_nombre || sa.programa || current?.programa_nombre || current?.programa || sa.programa_nombre,
                };
              });
              const snapshotPta = {
                // All PTA content fields from snapshot
                ...snap,
                // Enriched asignaturas
                ...(snapAsignaturas.length > 0 ? { asignaturas: enrichedAsignaturas } : {}),
                // Identity fields from current PTA (never overridden — placed AFTER snap)
                id: pta.id,
                docente_id: pta.docente_id,
                docente_nombre: pta.docente_nombre || snap.docente_nombre,
                nombre_docente: pta.nombre_docente || snap.nombre_docente,
                docente_identificacion: pta.docente_identificacion || snap.docente_identificacion,
                cedula: pta.cedula || snap.cedula,
                numero_documento: pta.numero_documento || snap.numero_documento,
                territorial: pta.territorial || snap.territorial,
                sede: pta.sede || snap.sede,
                programa: pta.programa || snap.programa,
                tipo_vinculacion: pta.tipo_vinculacion || snap.tipo_vinculacion,
                dedicacion: pta.dedicacion || snap.dedicacion,
                categoria_escalafon: pta.categoria_escalafon || snap.categoria_escalafon,
                escalafon: pta.escalafon || snap.escalafon,
                nucleo_tematico: pta.nucleo_tematico || snap.nucleo_tematico,
                periodo: pta.periodo || snap.periodo,
                // Filtered historial
                historialEstados: filteredHistorial,
                historial: filteredHistorial,
                historial_aprobaciones: filteredHistorial,
              };
              return (
                <ReporteIndividualPTA
                  pta={snapshotPta}
                  onClose={() => setSelectedSnapshot(null)}
                  reporteVersion={selectedSnapshotVersion}
                />
              );
            })()}
          </div>
        </div>,
        document.body
      )}

      {/* ── Firma Digital PTA — requerida en cada etapa de aprobación ── */}
      {showFirmaDigital && createPortal(
        <FirmaDigitalPTA
          ptaId={pta.id}
          docenteNombre={pta.docente_nombre || pta.nombre_docente || ''}
          periodo={pta.periodo || ''}
          totalHoras={pta.total_horas_programadas || pta.horas_a_programar || 0}
          firmanteNombre={rolLabel}
          firmanteCargo={
            pta.estado === 'Pendiente Jefatura' ? 'Jefatura de Programa' :
            pta.estado === 'Pendiente Decanatura' ? 'Decanatura' :
            'Gestión Profesoral'
          }
          etapaLabel={
            pta.estado === 'Pendiente Jefatura' ? 'Aprobación N1' :
            pta.estado === 'Pendiente Decanatura' ? 'Aprobación N2' :
            'Aprobación final N3'
          }
          onFirmaCompleta={handleFirmaCompleta}
          onCancelar={() => setShowFirmaDigital(false)}
        />,
        document.body
      )}

      {/* Modal de edición completa — overlay con blur, montado en document.body */}
      {showEditForm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditForm(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            position: 'relative',
            width: '100%', maxWidth: 980,
            maxHeight: 'calc(100vh - 40px)',
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Botón cerrar modal */}
            <button
              onClick={() => setShowEditForm(false)}
              style={{
                position: 'sticky', top: 12, left: '100%',
                zIndex: 10001, marginRight: 12, marginLeft: 'auto',
                width: 32, height: 32, borderRadius: '50%',
                border: 'none', background: '#F3F4F6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                flexShrink: 0,
              }}
            >
              <X style={{ width: 16, height: 16, color: '#374151' }} />
            </button>
            <PTAForm
              ptaId={pta.id}
              userPersonId={''}
              isAdminEdit={true}
              jefaturaTerritorialId={jefaturaTerritorialId}
              onBack={async () => {
                setShowEditForm(false);
                const res = await getPTAById(pta.id);
                if (res.success && res.data) {
                  setPta((prev: any) => ({ ...prev, ...res.data }));
                }
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </motion.div>
  );
});
