/**
 * PortalDocentePTA — Hub completo del docente para el módulo PTA
 *
 * Integra las vistas V01-V10 del documento de requerimientos:
 * V01: Dashboard resumen (KPIs, PTAs activos, alertas)
 * V02: Revisión de propuesta (RevisionPropuesta.tsx)
 * V03: Formulario PTA (PTAForm.tsx)
 * V04: Historial completo de estados y transiciones
 * V05: Mesa de concertación (lado docente)
 * V06: Vista de detalle (lectura, impresión)
 * V07: Notificaciones y tareas pendientes
 * V08: Tracking de aprobación en tiempo real
 * V09: Resumen imprimible (PTAResumenPrint.tsx)
 * V10: Panel de devoluciones y correcciones
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, ChevronLeft, Calendar, Clock, CheckCircle2,
  AlertTriangle, Download, Eye, ArrowRight, RotateCcw, XCircle,
  Send, MessageSquare, BarChart3, Zap, Info, Bell,
  MapPin, BookOpen, Printer, Edit3, RefreshCw, Target,
  Shield, ChevronRight, ExternalLink, ListChecks,
  FlaskConical, Globe, Briefcase, X, Award, Users, Paperclip, Lock,
} from 'lucide-react';
import {
  getPTAsByDocente, getPTAById, enviarAprobacionPTA,
  agregarComentarioConcertacion, updatePTAStatus,
  getMisSolicitudesPTA, marcarSolicitudLeida,
  getComponentesAprobacion,
  getActivePeriodoAcademico,
  getBancoDocenteById,
} from '../../../services/api/ptaApi';
import { PTAForm } from './PTAForm';
import { PTAResumenPrint } from './PTAResumenPrint';
import { RevisionPropuesta } from './RevisionPropuesta';
import { SolicitudPTAModal } from './SolicitudPTAModal';
import { docentePtaAlert as toast } from './DocentePtaAlert';
import { usePTARealtimeSync } from '../../../hooks/usePTARealtimeSync';
import { PTASyncIndicator } from '../../pta/PTASyncIndicator';
import { useNotifications } from '../../esap/NotificationsContext';
import { V11CalendarioAcademico, V12AdjuntosDocumentos, V13IndicadoresPersonales, V14CertificadoDigitalPortal } from './VistasV11V15PTA';
import { VerificacionQRPublicaPTA } from '../../pta/VerificacionQRPublicaPTA';
import { CardSkeleton, EmptyStateIllustration } from '../../ui/CardSkeleton';
import { ReportePTAInstitucional } from './ReportePTAInstitucional';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import { ptaHabilitadoParaSeguimiento } from '../../pta/shared/evidenciasJustificacion';
import { HierarchySelectionSummary } from '../../pta/shared/HierarchySelectionSummary';
import { getPtaStatusVisual } from '../../pta/shared/ptaStatusVisuals';
import { formatPtaCompletionPercentage, formatPtaPercentage, getPtaCompletionPercentage } from '../../../utils/ptaCompletion';

interface PortalDocentePTAProps {
  onBack: () => void;
  userPersonId: string;
  userName?: string;
  userEmail?: string;
}

function getPeriodoCode(periodo: any): string {
  if (typeof periodo === 'string') return periodo.trim();
  return String(
    periodo?.codigo
      || periodo?.periodo
      || (periodo?.anio && periodo?.semestre
        ? `${periodo.anio}-${periodo.semestre}`
        : ''),
  ).trim();
}

type VistaPortal = 'v01_dashboard' | 'v02_revision' | 'v03_formulario' | 'v04_historial' | 'v05_concertacion' | 'v06_detalle' | 'v07_notificaciones' | 'v08_tracking' | 'v09_imprimir' | 'v10_devoluciones' | 'v11_calendario' | 'v12_adjuntos' | 'v13_indicadores' | 'v14_certificado' | 'verificar_qr';

const ESTADO_CONFIG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  'Borrador': { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', label: 'Borrador' },
  'PROPUESTO_POR_DIRECCION': { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', label: 'Propuesta Institucional' },
  'NOTIFICADO_DOCENTE': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Requiere tu revisión' },
  'ACEPTADO_DOCENTE': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Aceptado por ti' },
  'MODIFICADO_DOCENTE': { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'Modificaciones enviadas' },
  'OBJETADO_DOCENTE': { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Objeción enviada' },
  'EN_CONCERTACION': { bg: '#F3E8FF', color: '#6B21A8', border: '#DDD6FE', label: 'En Concertación' },
  'CONCERTADO': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Concertado' },
  'ESCALADO_SNA': { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'En Arbitraje SNA' },
  // Estados de aprobación por nivel (flujo anterior). En la vista del docente se
  // muestran todos como "Pendiente de Aprobación": el docente no ve la jerarquía
  // interna (Jefatura/Decanatura/Gestión Profesoral). Alineado con el modelo de
  // aprobación por componente.
  'Pendiente Jefatura': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Pendiente de Aprobación' },
  'Pendiente Decanatura': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Pendiente de Aprobación' },
  'Pendiente Gestión Profesoral': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Pendiente de Aprobación' },
  'Aprobado': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Aprobado' },
  'En Firme': { bg: '#047857', color: '#FFFFFF', border: '#059669', label: 'En Firme — Firmado y Radicado' },
  'Finalizado': { bg: '#EDE9FE', color: '#5B21B6', border: '#A78BFA', label: 'Finalizado' },
  // Cerrado por apertura de un nuevo período académico: solo lectura / observación.
  'Terminado': { bg: '#E5E7EB', color: '#374151', border: '#D1D5DB', label: 'Terminado (solo lectura)' },
  'Rechazado': { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Rechazado' },
  'PENDIENTE_APROBACION': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Pendiente de Aprobación' },
  'Devuelto': { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74', label: 'Devuelto — Corrección requerida' },
  'REVISION_DOCENTE_N1': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Revisión — Corrección solicitada' },
  'REVISION_DOCENTE_N2': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Revisión — Corrección solicitada' },
  'REVISION_DOCENTE_N3': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Revisión — Corrección solicitada' },
};

const getEstadoCfg = (estado: string) => {
  const visual = getPtaStatusVisual(estado);
  const configured = ESTADO_CONFIG[estado];
  return { ...visual, label: configured?.label || visual.label };
};

function timeAgo(d: string): string {
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

// ═══════════════════════════════════════════════════════════════════════
// V06 (detalle): helpers visuales de las secciones por componente.
// Estilos inline: el index.css es un snapshot precompilado de Tailwind y
// no genera clases nuevas (arbitrarias como grid-cols-[...] no existen).
// ═══════════════════════════════════════════════════════════════════════

/** 'YYYY-MM-DD' → 'DD/MM/YYYY' sin desfase de zona horaria. */
function fmtFechaCorta(iso?: string): string | null {
  if (!iso || typeof iso !== 'string') return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function rangoFechas(inicio?: string, fin?: string): string | null {
  const i = fmtFechaCorta(inicio);
  const f = fmtFechaCorta(fin);
  if (i && f) return `${i} — ${f}`;
  return i || f;
}

const MODALIDAD_LABELS: Record<string, string> = { PRESENCIAL: 'Presencial', VIRTUAL: 'Virtual', MIXTA: 'Mixta', DISTANCIA: 'Distancia' };

// Alineado con DEFAULT_EXT_SECCIONES (PTAForm) y las secciones de Complementarias.
const SECCION_LABELS: Record<string, string> = {
  capacitacion: 'Dirección de Capacitación',
  seleccion: 'Dirección de Procesos de Selección',
  fortalecimiento: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  alto_gobierno: 'Escuela de Alto Gobierno',
  laboratorio_innovacion: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  investigacion_aplicada: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  complementarias_docencia: 'Complementarias de docencia',
  academico_administrativas: 'Académico-administrativas',
};

const prettySeccion = (s?: string) =>
  s ? (SECCION_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')) : '';

/** Chip informativo (dato puntual del ítem). No renderiza valores vacíos. */
function DetalleChip({ icon: Icon, label, value, color }: { icon?: any; label?: string; value: any; color?: string }) {
  if (value === null || value === undefined || value === '' || value === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.66rem', color: '#475569', fontWeight: 600, maxWidth: '100%' }}>
      {Icon && <Icon size={11} color={color || '#94A3B8'} style={{ flexShrink: 0 }} />}
      {label && <span style={{ color: '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>}
      <span style={{ overflowWrap: 'anywhere' }}>{value}</span>
    </span>
  );
}

/** Pill de horas con el color del componente. */
function HorasBadge({ horas, color }: { horas: number; color: string }) {
  return (
    <span style={{ padding: '4px 12px', borderRadius: 999, background: `${color}14`, color, border: `1px solid ${color}33`, fontSize: '0.74rem', fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {horas}h
    </span>
  );
}

/** Estado real de aprobación de un componente, desde el DTO enriquecido del backend
 *  (componentes_estado). Devuelve null si no aplica (Borrador o sin datos). */
function getEstadoComponente(pta: any, key: string): string | null {
  if (!pta) return null;
  if (['Aprobado', 'En Firme', 'Finalizado'].includes(pta.estado)) return 'aprobado';
  if (pta.estado === 'Borrador') return null;
  const arr = Array.isArray(pta.componentes_estado) ? pta.componentes_estado : [];
  return arr.find((c: any) => c?.key === key)?.estado || null;
}

const ESTADO_COMPONENTE_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  aprobado: { label: 'Aprobado', color: '#047857', bg: '#D1FAE5', icon: CheckCircle2 },
  devuelto: { label: 'Devuelto', color: '#B91C1C', bg: '#FEE2E2', icon: RotateCcw },
  pendiente: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7', icon: Clock },
};

/** Chip de estado de aprobación del componente (header de sección). */
function EstadoComponenteChip({ estado }: { estado?: string | null }) {
  if (!estado) return null;
  const cfg = ESTADO_COMPONENTE_CFG[estado] || ESTADO_COMPONENTE_CFG.pendiente;
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
      <Icon size={11} /> {cfg.label}
    </span>
  );
}

/** Tarjeta de sección con header tintado por el color del componente.
 *  textColor: tono para textos/badges cuando el color base es muy claro (ej. amarillo). */
function DetalleSeccion({ icon: Icon, color, textColor, titulo, subtitulo, count, countLabel, totalHoras, estadoComponente, children }: { icon: any; color: string; textColor?: string; titulo: string; subtitulo?: string; count?: number; countLabel?: string; totalHoras?: number; estadoComponente?: string | null; children: any }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,0.04)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '12px 16px', background: `${color}0A`, borderBottom: `1px solid ${color}22`, borderLeft: `4px solid ${color}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={16} color={color} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{titulo}</div>
            {subtitulo && <div style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: 600, marginTop: 1 }}>{subtitulo}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <EstadoComponenteChip estado={estadoComponente} />
          {count != null && (
            <span style={{ padding: '3px 10px', borderRadius: 999, background: '#fff', border: '1px solid #E5E7EB', fontSize: '0.64rem', fontWeight: 700, color: '#6B7280', whiteSpace: 'nowrap' }}>
              {count} {countLabel}
            </span>
          )}
          {Number(totalHoras) > 0 && <HorasBadge horas={Number(totalHoras)} color={textColor || color} />}
        </div>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

/** Tarjeta de ítem dentro de una sección (borde izquierdo con el color del componente). */
function ItemDetalle({ color, children }: { color: string; children: any }) {
  return <div style={{ border: '1px solid #E8EAED', borderLeft: `3px solid ${color}`, borderRadius: 12, padding: '12px 14px', background: '#FDFDFD', minWidth: 0 }}>{children}</div>;
}

/** Sub-encabezado para agrupar ítems por sección dentro de un componente. */
function SubSeccionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
      <span style={{ fontSize: '0.6rem', fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF' }}>({count})</span>
      <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
    </div>
  );
}

/** Nota de observaciones dentro de un ítem. */
function ObservacionesNota({ texto }: { texto?: string }) {
  if (!texto) return null;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 8, padding: '7px 10px', borderRadius: 8, background: '#F9FAFB', border: '1px dashed #E5E7EB' }}>
      <Info size={11} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: '0.66rem', color: '#6B7280', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{texto}</span>
    </div>
  );
}

/** Chip de resolución/soporte: enlaza al archivo si hay URL. */
function ResolucionChip({ nombre, url }: { nombre?: string; url?: string }) {
  if (!nombre && !url) return null;
  const contenido = (
    <>
      <Paperclip size={11} color="#64748B" style={{ flexShrink: 0 }} />
      <span style={{ color: '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>Resolución</span>
      <span style={{ overflowWrap: 'anywhere' }}>{nombre || 'Ver archivo'}</span>
    </>
  );
  const estilo: any = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '0.66rem', color: '#475569', fontWeight: 600, maxWidth: '100%' };
  if (url) {
    return <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...estilo, textDecoration: 'none', cursor: 'pointer' }}>{contenido}</a>;
  }
  return <span style={estilo}>{contenido}</span>;
}

// ═══════════════════════════════════════════════════════════════════════
// V08: Component-based approval tracker (Docencia, Inv, Ext, Comp, AADM)
// ═══════════════════════════════════════════════════════════════════════
const COMPONENT_STEPS = [
  { key: 'academica', label: 'Docencia', icon: BookOpen, color: '#4472C4' },
  { key: 'investigacion', label: 'Investiga...', icon: FlaskConical, color: '#ED7D31' },
  { key: 'extension', label: 'Extensión', icon: Globe, color: '#059669', compKeys: ['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'] },
  // Complementarias incluye la sub-sección Académico-Administrativa (AADM fusionado).
  { key: 'complementarias', label: 'Complem...', icon: Briefcase, color: '#FFC000' },
];

function ComponentApprovalBar({ estado, componentesAprobacion = [] }: { estado: string; componentesAprobacion?: any[] }) {
  const isAprobado = estado === 'Aprobado' || estado === 'En Firme' || estado === 'Finalizado';
  const isBorrador = estado === 'Borrador';

  const getStatusForComponent = (compKeys: string[]) => {
    if (isAprobado) return 'aprobado';
    if (isBorrador) return 'pendiente';
    const approvals = componentesAprobacion.filter(c => compKeys.includes(c.componente));
    if (approvals.length === 0) return 'pendiente';
    if (approvals.some(a => a.estado === 'devuelto')) return 'devuelto';
    if (approvals.every(a => a.estado === 'aprobado')) return 'aprobado';
    return 'pendiente';
  };

  return (
    <div className="w-full py-2">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '6px',
        width: '100%',
      }}>
        {COMPONENT_STEPS.map(step => {
          const Icon = step.icon;
          const keys = (step as any).compKeys || [step.key];
          const status = getStatusForComponent(keys);

          let bg = '#FFFBEB';
          let borderColor = '#FEF3C7';
          let statusColor = '#B45309';
          let statusLabel = 'Pendiente';
          let iconBg = '#FEF3C7';
          let iconColor = '#D97706';

          if (status === 'aprobado') {
            bg = '#F0FDF4';
            borderColor = '#BBF7D0';
            statusColor = '#15803D';
            statusLabel = 'Aprobado';
            iconBg = '#DCFCE7';
            iconColor = '#16A34A';
          } else if (status === 'devuelto') {
            bg = '#FEF2F2';
            borderColor = '#FECACA';
            statusColor = '#B91C1C';
            statusLabel = 'Devuelto';
            iconBg = '#FEE2E2';
            iconColor = '#DC2626';
          }

          return (
            <div
              key={step.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 4px 6px',
                borderRadius: '10px',
                border: `1.5px solid ${borderColor}`,
                background: bg,
                gap: '3px',
                minWidth: 0,
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon style={{ width: 12, height: 12, color: iconColor }} />
              </div>
              <span style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                color: '#374151',
                textAlign: 'center',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {step.label}
              </span>
              <span style={{
                fontSize: '0.5rem',
                fontWeight: 700,
                color: statusColor,
                textAlign: 'center',
                lineHeight: 1,
              }}>
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PortalDocentePTA({ onBack, userPersonId, userName, userEmail }: PortalDocentePTAProps) {
  const [vista, setVista] = useState<VistaPortal>('v01_dashboard');

  const [slotNode, setSlotNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.getElementById('portal-left-sidebar-slot');
    if (el) setSlotNode(el);
  }, [vista]);

  // Dispatch global custom event for the shell container to adjust layout
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pta-view-change', { detail: { vista } }));
  }, [vista]);

  const [allPtas, setAllPtas] = useState<any[]>([]);
  const [activePeriodo, setActivePeriodo] = useState('');
  const [activePeriodoData, setActivePeriodoData] = useState<any>(null);
  const [docentePerfil, setDocentePerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPtaId, setSelectedPtaId] = useState<string | null>(null);
  const [selectedPta, setSelectedPta] = useState<any>(null);
  const [editPtaId, setEditPtaId] = useState<string | null>(null);
  const [concertMsg, setConcertMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isReporteOpen, setIsReporteOpen] = useState(false);
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [todasLasSolicitudes, setTodasLasSolicitudes] = useState<any[]>([]);
  const [componentApprovalsByPta, setComponentApprovalsByPta] = useState<Record<string, any[]>>({});
  const loadPtasRequestRef = useRef(0);

  // El portal docente siempre trabaja en el periodo marcado como vigente. Los
  // registros históricos se conservan en memoria para no modificar reglas
  // preexistentes, pero nunca se mezclan con las vistas del periodo actual.
  const ptas = useMemo(
    () => activePeriodo
      ? allPtas.filter(pta => getPeriodoCode(pta?.periodo) === activePeriodo)
      : [],
    [allPtas, activePeriodo],
  );

  // Platform bell notifications
  const { addNotification } = useNotifications();

  // ═══ Data loaders (defined before sync hook) ═══
  const loadPtas = useCallback(async () => {
    const requestId = ++loadPtasRequestRef.current;
    setLoading(true);
    try {
      const [periodoActivo, res] = await Promise.all([
        getActivePeriodoAcademico(),
        getPTAsByDocente(userPersonId),
      ]);
      if (requestId !== loadPtasRequestRef.current) return;

      const periodoCodigo = getPeriodoCode(periodoActivo);
      setActivePeriodo(periodoCodigo);
      setActivePeriodoData(periodoActivo || null);

      // El encabezado oficial del reporte usa la ficha RUND/Banco de Docentes.
      // Este lookup acepta persona_id, usuario_id o docente_id y devuelve la
      // cédula y los demás datos institucionales sin confundirlos con UUIDs.
      const perfilRes = await getBancoDocenteById(userPersonId, periodoCodigo || undefined);
      if (requestId !== loadPtasRequestRef.current) return;
      setDocentePerfil(perfilRes.success ? perfilRes.data : null);

      if (res.success && Array.isArray(res.data)) {
        const loadedPtas = res.data;
        const loadedPtasPeriodo = periodoCodigo
          ? loadedPtas.filter((pta: any) => getPeriodoCode(pta?.periodo) === periodoCodigo)
          : [];
        setAllPtas(loadedPtas);

        const approvalEntries = await Promise.all(
          loadedPtasPeriodo
            .filter((pta: any) => pta?.id && pta.estado !== 'Borrador')
            .map(async (pta: any) => {
              try {
                const compRes = await getComponentesAprobacion(pta.id);
                return [pta.id, compRes.success && Array.isArray(compRes.data) ? compRes.data : []] as const;
              } catch {
                return [pta.id, []] as const;
              }
            })
        );
        if (requestId !== loadPtasRequestRef.current) return;
        setComponentApprovalsByPta(Object.fromEntries(approvalEntries));
      } else {
        console.warn('[Portal PTA] Response data is not an array:', res);
        setAllPtas([]);
        setComponentApprovalsByPta({});
      }
    } catch (error) {
      if (requestId !== loadPtasRequestRef.current) return;
      console.error('[Portal PTA] Error loading PTAs:', error);
      setAllPtas([]);
      setActivePeriodoData(null);
      setDocentePerfil(null);
      setComponentApprovalsByPta({});
    } finally {
      if (requestId === loadPtasRequestRef.current) setLoading(false);
    }
  }, [userPersonId]);

  const loadPtaDetalle = useCallback(async (id: string) => {
    const res = await getPTAById(id);
    if (res.success) setSelectedPta(res.data);
  }, []);

  // ═══ Solicitudes PTA — cargar notificaciones resueltas ═══
  const loadSolicitudes = useCallback(async () => {
    try {
      const res = await getMisSolicitudesPTA(userPersonId);
      if (res.success && Array.isArray(res.data)) {
        setTodasLasSolicitudes(res.data);
      }
    } catch (err) {
      console.log('[Portal] Error loading solicitudes:', err);
    }
  }, [userPersonId]);

  const solicitudesResueltas = useMemo(() =>
    todasLasSolicitudes.filter(s =>
      ['aprobado', 'denegado', 'gestionada'].includes(s.estado)
      && !s.notificacionLeida
    ),
  [todasLasSolicitudes]);

  // HU-12 — Versiones del PTA del mismo periodo (R01, R02, …). El docente puede tener
  // hasta 2 PTAs por periodo (el original R01 + el segundo R02 tras solicitud aprobada).
  // En el detalle se muestran como sub-tabs para alternar conservando ambos visibles.
  const versionesPeriodo = useMemo(() => {
    if (!selectedPta) return [];
    const periodo = String(selectedPta.periodo || '');
    return ptas
      .filter(p => String(p.periodo || '') === periodo)
      .sort((a, b) =>
        new Date(a.created_at || a.createdAt || 0).getTime() -
        new Date(b.created_at || b.createdAt || 0).getTime());
  }, [ptas, selectedPta]);

  const handleDismissSolicitud = async (id: string) => {
    await marcarSolicitudLeida(id);
    // Reload locally to remove from resueltas list while keeping the approval in state for unblocking PTA creation
    setTodasLasSolicitudes(prev => prev.map(s => s.id === id ? { ...s, notificacionLeida: true } : s));
  };

  useEffect(() => { loadPtas(); loadSolicitudes(); }, [loadPtas, loadSolicitudes]);

  useEffect(() => {
    if (selectedPtaId) loadPtaDetalle(selectedPtaId);
  }, [selectedPtaId, loadPtaDetalle]);

  useEffect(() => {
    if (
      !loading
      && selectedPtaId
      && !ptas.some(pta => String(pta?.id || '') === selectedPtaId)
    ) {
      setSelectedPtaId(null);
      setSelectedPta(null);
      setEditPtaId(null);
      setVista('v01_dashboard');
    }
  }, [loading, ptas, selectedPtaId]);

  // ═══ Email notification ═══
  // El endpoint legacy `http://localhost:5000/api/pta/notifications/email` (era Supabase)
  // ya no existe en la arquitectura de microservicios y rompía en QA/prod por el host
  // quemado. Los correos de cambio de estado del PTA se disparan desde el backend en la
  // transición de estado (no desde el front). Se deja como no-op para no perder los
  // call-sites; si se requiere correo desde el portal, debe ir vía gateway/notifications.
  const sendEmailNotification = useCallback(async (_evt: any) => {
    /* no-op: las notificaciones por correo las emite el backend */
  }, []);

  // ═══ Real-time sync with Backoffice ═══
  const syncState = usePTARealtimeSync({
    sistema: 'portal',
    interval: 10000,
    docenteId: userPersonId,
    enabled: true,
    onDataChanged: (events) => {
      console.log(`[Portal Sync] ${events.length} nuevos eventos del Backoffice`);
      loadPtas();
      loadSolicitudes();
      // Also reload selected PTA detail if viewing one
      if (selectedPtaId) {
        loadPtaDetalle(selectedPtaId);
      }
      // Dispatch custom event for child components (like PTAForm) to reload catalogs
      window.dispatchEvent(new CustomEvent('pta-realtime-sync', { detail: events }));
      // Show toast + push to platform bell for each event
      events.forEach(evt => {
        const label = evt.estado_nuevo?.replace(/_/g, ' ') || evt.tipo;
        const isAprobado = evt.estado_nuevo === 'Aprobado';
        const isRechazado = evt.estado_nuevo === 'Rechazado';
        const isDevuelto = evt.estado_nuevo === 'Devuelto';

        // Toast notification
        if (isAprobado) {
          toast.success('PTA Aprobado', { description: evt.mensaje || 'Tu Plan de Trabajo Académico ha sido aprobado', duration: 8000 });
        } else if (isRechazado) {
          toast.error('PTA Rechazado', { description: evt.mensaje || 'Tu PTA ha sido rechazado', duration: 8000 });
        } else if (isDevuelto) {
          toast.warning('PTA Devuelto', { description: evt.mensaje || 'Tu PTA requiere correcciones', duration: 8000 });
        } else {
          toast.info(`Actualización: ${label}`, { description: evt.mensaje || '', duration: 5000 });
        }

        // Push to platform bell (NotificationsContext)
        addNotification({
          title: isAprobado ? 'PTA Aprobado' : isRechazado ? 'PTA Rechazado' : isDevuelto ? 'PTA Devuelto — corrección requerida' : `PTA: ${label}`,
          message: `${evt.actor || 'Backoffice'}: ${evt.mensaje || `Estado cambiado a ${label}`}`,
          type: isAprobado ? 'success' : isRechazado ? 'error' : isDevuelto ? 'warning' : 'info',
        });

        // Trigger email notification via server (fire-and-forget)
        sendEmailNotification(evt).catch(() => {});
      });
    },
  });

  // ═══ Stats ═══
  const stats = useMemo(() => {
    const total = ptas.length;
    const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
    const pendientes = ptas.filter(p => ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'PENDIENTE_APROBACION'].includes(p.estado)).length;
    const requiereAccion = ptas.filter(p => ['NOTIFICADO_DOCENTE', 'Devuelto', 'EN_CONCERTACION'].includes(p.estado)).length;
    const devueltos = ptas.filter(p => p.estado === 'Devuelto').length;
    return { total, aprobados, pendientes, requiereAccion, devueltos };
  }, [ptas]);

  // ═══ Pending notifications ═══
  const notificaciones = useMemo(() => {
    const items: { id: string; tipo: string; titulo: string; descripcion: string; fecha: string; ptaId: string }[] = [];
    ptas.forEach(p => {
      if (p.estado === 'NOTIFICADO_DOCENTE') items.push({ id: `notif-${p.id}`, tipo: 'revision', titulo: 'Propuesta pendiente de revisión', descripcion: `PTA periodo ${p.periodo} requiere tu decisión`, fecha: p.updated_at || p.created_at || new Date().toISOString(), ptaId: p.id });
      if (p.estado === 'Devuelto') items.push({ id: `dev-${p.id}`, tipo: 'devolucion', titulo: 'PTA devuelto — corrección requerida', descripcion: p.motivo_devolucion || 'Revisar observaciones', fecha: p.updated_at || new Date().toISOString(), ptaId: p.id });
      if (p.estado === 'EN_CONCERTACION') items.push({ id: `conc-${p.id}`, tipo: 'concertacion', titulo: 'Mesa de concertación activa', descripcion: 'Revisar mensajes de concertación', fecha: p.updated_at || new Date().toISOString(), ptaId: p.id });
      if (p.estado === 'Aprobado') items.push({ id: `apr-${p.id}`, tipo: 'aprobacion', titulo: 'PTA Aprobado', descripcion: 'Tu Plan de Trabajo ha sido aprobado', fecha: p.updated_at || new Date().toISOString(), ptaId: p.id });
    });
    return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [ptas]);

  // ═══ Devoluciones ═══
  const devoluciones = useMemo(() => ptas.filter(p => p.estado === 'Devuelto'), [ptas]);

  // ═══ Guardianes de creación de PTA ═══
  const ESTADOS_ACTIVOS_PTA = [
    'BORRADOR', 'Borrador', 'PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE',
    'ACEPTADO_DOCENTE', 'MODIFICADO_DOCENTE', 'OBJETADO_DOCENTE',
    'EN_CONCERTACION', 'CONCERTADO', 'ESCALADO_SNA',
    'Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral',
    'PENDIENTE_APROBACION',
    'REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3',
    'Devuelto', 'Aprobado',
  ];
  const ptaActivo = useMemo(
    () => ptas.find(p => ESTADOS_ACTIVOS_PTA.includes(p.estado)) ?? null,
    [ptas]
  );
  const anioActual = new Date().getFullYear();
  const limiteAnualAlcanzado = useMemo(
    () => allPtas.filter(p => {
      const created = p.createdAt || p.created_at;
      return created && new Date(created).getFullYear() === anioActual;
    }).length >= 2,
    [allPtas]
  );

  const tienePermisoEspecial = useMemo(() =>
    todasLasSolicitudes.some(s =>
      s.estado === 'aprobado'
      && (s.tipoSolicitud || 'creacion') === 'creacion'
    ),
  [todasLasSolicitudes]);

  const tieneSolicitudPendiente = useMemo(() => 
    todasLasSolicitudes.some(s => s.estado === 'pendiente'), 
  [todasLasSolicitudes]);

  const puedeCrearPTA = (!loading && !ptaActivo && !limiteAnualAlcanzado) || tienePermisoEspecial;

    const mensajeBloqueo = !tienePermisoEspecial && limiteAnualAlcanzado
    ? `Límite anual alcanzado: ya registraste 2 planes de trabajo en ${anioActual}.`
    : !tienePermisoEspecial && ptaActivo?.estado === 'Aprobado'
    ? 'Ya tienes un Plan de Trabajo aprobado para este periodo.'
    : !tienePermisoEspecial && ptaActivo
    ? 'Ya tienes un Plan de Trabajo en ejecución. Finalízalo o espera su aprobación antes de crear uno nuevo.'
    : null;

  // ═══ Send concertation message ═══
  const enviarMensajeConcertacion = async () => {
    if (!selectedPtaId || !concertMsg.trim()) return;
    setSendingMsg(true);
    try {
      await agregarComentarioConcertacion(selectedPtaId, {
        autor: userName || 'Docente',
        autor_rol: 'docente',
        mensaje: concertMsg,
      });
      setConcertMsg('');
      toast.success('Mensaje enviado a la mesa de concertación');
      loadPtaDetalle(selectedPtaId);
    } catch { toast.error('Error al enviar mensaje'); }
    setSendingMsg(false);
  };

  // ═══ Re-enviar devuelto ═══
  const reenviarPTA = async (ptaId: string) => {
    const res = await updatePTAStatus(ptaId, { accion: 'reenviar_corregido', observaciones: 'Re-envío tras corrección' });
    if (res.success) {
      toast.success('PTA re-enviado a aprobación');
      loadPtas();
    } else {
      toast.error(res.message || 'Error al re-enviar');
    }
  };

  // ═══ Navigation handler ═══
  const navigateToVista = (v: VistaPortal, ptaId?: string) => {
    setVista(v);
    if (ptaId) { setSelectedPtaId(ptaId); }
  };

  // ═══ Subviews ═══
  if (vista === 'v02_revision' && selectedPtaId) {
    return <RevisionPropuesta ptaId={selectedPtaId} onBack={() => { setVista('v01_dashboard'); setSelectedPtaId(null); loadPtas(); }} userPersonId={userPersonId} />;
  }
  if (vista === 'v03_formulario') {
    return <PTAForm onBack={() => { setVista('v01_dashboard'); setEditPtaId(null); loadPtas(); }} userPersonId={userPersonId} ptaId={editPtaId} />;
  }
  if (vista === 'v09_imprimir' && selectedPtaId) {
    return <PTAResumenPrint pta={selectedPta} onClose={() => setVista('v01_dashboard')} userPersonId={userPersonId} userName={userName} />;
  }

  const VISTAS_NAV = [
    { key: 'v01_dashboard', label: 'PTAs', icon: BarChart3 },
    { key: 'v12_adjuntos', label: 'Documentos y Soportes', icon: FileText },
    { key: 'v14_certificado', label: 'Firmados', icon: Shield },
  ];

  // El seguimiento (Documentos y Soportes) se habilita cuando el PTA vigente
  // tiene la totalidad de sus componentes aprobados. La pestaña sigue siendo
  // navegable: dentro se muestra el aviso con el estado de cada componente.
  const seguimientoBloqueado = ptas.length === 0 || !ptaHabilitadoParaSeguimiento(ptas[0]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} 
          className="w-9 h-9 rounded-xl border border-gray-200/80 bg-white/80 backdrop-blur-sm flex items-center justify-center cursor-pointer transition-all duration-200 hover:border-[#003DA5]/40 hover:bg-blue-50/60 hover:shadow-sm active:scale-95 shrink-0"
        >
          <ChevronLeft className="w-4.5 h-4.5 text-gray-600" />
        </button>
        {/* Environment Banner — Portal Docente */}
        <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#003DA5]/[0.06] via-purple-50/40 to-indigo-50/30 backdrop-blur-xl border border-[#003DA5]/10 shadow-[0_1px_3px_rgba(0,61,165,0.06)]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#003DA5]/15 to-purple-200/40 flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-[#003DA5]" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[0.68rem] font-black tracking-[0.14em] uppercase text-[#003DA5]">
              Portal Docente
            </span>
            <span className="hidden md:inline text-[0.72rem] font-semibold text-gray-500">
              — Plan de Trabajo Académico
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 sm:mb-7">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="hidden sm:flex w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/60 items-center justify-center shadow-sm shrink-0">
            <FileText className="w-5 h-5 text-[#003DA5]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[17px] sm:text-xl lg:text-[22px] font-black text-gray-900 m-0 tracking-tight leading-tight">
              Mi Plan de Trabajo Académico
            </h2>
            <p className="text-[11px] sm:text-[12px] font-bold text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[140px] sm:max-w-none">{userName || 'Docente'}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50/80 text-[#003DA5] text-[10px] font-extrabold tracking-wide border border-blue-100/50">
                <Calendar className="w-3 h-3" />
                {activePeriodo || (loading ? 'Cargando...' : 'Sin periodo activo')}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <PTASyncIndicator syncState={syncState} sistema="portal" compact />
          {puedeCrearPTA && (
            <button
              onClick={() => { setVista('v03_formulario'); setEditPtaId(null); }}
              className="flex items-center justify-center gap-2 h-10 px-5 sm:px-6 rounded-xl border-none text-white text-[12px] sm:text-[13px] font-extrabold shadow-[0_4px_14px_0_rgba(0,61,165,0.3)] hover:shadow-[0_6px_20px_rgba(0,61,165,0.2)] active:scale-[0.97] transition-all duration-300 cursor-pointer bg-[#003DA5] hover:bg-[#002B75]"
            >
              <Plus className="w-4 h-4" /> <span className="hidden xs:inline">Nuevo</span> PTA
            </button>
          )}
          {tieneSolicitudPendiente && (
            <span
              className="hidden md:flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-amber-200 text-amber-700 text-[11px] font-bold bg-amber-50"
              title="Tienes una solicitud PTA en revisión."
            >
              <Clock className="w-3.5 h-3.5" /> En revisión
            </span>
          )}
          <button
            onClick={() => setShowSolicitudModal(true)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 h-9 px-4 sm:px-5 rounded-xl border border-blue-200 bg-white text-[#003DA5] whitespace-nowrap text-[12px] sm:text-[13px] font-bold shadow-sm hover:bg-blue-50 hover:border-blue-300 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003DA5] focus:ring-offset-2"
            title={mensajeBloqueo ? `${mensajeBloqueo} Puedes gestionar una solicitud PTA.` : 'Crear una solicitud PTA'}
            aria-label="Abrir solicitudes de Plan de Trabajo Académico"
          >
            <Send className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Solicitudes PTA</span>
          </button>
        </div>
      </div>

      {/* Vista Nav */}
      <div className="flex overflow-x-auto hide-scrollbar gap-1 sm:gap-1.5 bg-gray-50/60 backdrop-blur-2xl rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-gray-200/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)] mb-5 sm:mb-7 w-full max-w-full">
        {VISTAS_NAV.map(v => {
          const isActive = vista === v.key;
          return (
            <button
              key={v.key}
              onClick={() => setVista(v.key as VistaPortal)}
              className={`relative flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border-none text-[11px] sm:text-[12.5px] transition-all duration-200 whitespace-nowrap cursor-pointer shrink-0 ${
                isActive
                  ? 'text-[#003DA5] font-black bg-white shadow-[0_2px_8px_rgba(0,61,165,0.08)]' 
                  : 'text-gray-500 font-bold hover:bg-white/60 hover:text-gray-700 bg-transparent'
              }`}
            >
              <v.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                isActive ? 'text-[#003DA5]' : 'text-gray-400'
              }`} />
              <span>{v.label}</span>
              {v.key === 'v12_adjuntos' && seguimientoBloqueado && (
                <Lock style={{ width: 11, height: 11, color: '#D97706', flexShrink: 0 }} aria-label="Disponible tras la aprobación del PTA" />
              )}
              {isActive && <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#003DA5]" />}
            </button>
          );
        })}
      </div>

      {loading ? (
        /* Premium skeleton loading */
        <div className="space-y-5">
          {[1, 2].map(k => (
            <div key={k} className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 animate-pulse">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-2.5">
                  <div className="h-5 bg-gray-200/80 rounded-lg w-52" />
                  <div className="flex gap-3">
                    <div className="h-4 bg-gray-100 rounded-md w-28" />
                    <div className="h-4 bg-gray-100 rounded-md w-36" />
                  </div>
                </div>
                <div className="h-7 bg-gray-200/60 rounded-xl w-24" />
              </div>
              <div className="bg-gray-50/80 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  {[1,2,3,4,5].map(d => (
                    <div key={d} className="flex items-center flex-1">
                      <div className="w-6 h-6 rounded-full bg-gray-200/80" />
                      {d < 5 && <div className="flex-1 h-1 bg-gray-100 mx-2 rounded-full" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ═══════ V01: Dashboard ═══════ */}
          {vista === 'v01_dashboard' && (
            <div>
              {/* KPI Cards Eliminados a petición del usuario para maximizar el área de trabajo */}

              {/* Alertas requiere acción */}
              {stats.requiereAccion > 0 && (
                <div className="p-4 mb-8 rounded-2xl bg-amber-50/80 backdrop-blur-md border border-amber-200 shadow-sm flex items-center flex-wrap gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-bold text-amber-900 flex-1 tracking-tight">
                    Tienes {stats.requiereAccion} PTA(s) que requieren tu acción inmediata
                  </span>
                  <button onClick={() => setVista('v07_notificaciones')} className="px-5 py-2.5 rounded-xl border border-amber-300 bg-white text-amber-800 text-[13px] font-extrabold shadow-sm hover:bg-amber-100 hover:shadow hover:-translate-y-0.5 transition-all cursor-pointer">
                    Ver tareas
                  </button>
                </div>
              )}

              {/* PTAs List */}
              {loading ? (
                <div className="flex flex-col gap-5">
                  <div className="h-[160px]"><CardSkeleton /></div>
                  <div className="h-[160px]"><CardSkeleton /></div>
                </div>
              ) : ptas.length === 0 ? (
                <EmptyStateIllustration 
                  title="Aún no tienes PTAs registrados"
                  description="No tienes planes de trabajo en tu base de datos para este periodo."
                  actionText={puedeCrearPTA ? "Crear mi primer PTA" : undefined}
                  onAction={puedeCrearPTA ? () => { setVista('v03_formulario'); setEditPtaId(null); } : undefined}
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {ptas.map((pta, i) => {
                    const cfg = getEstadoCfg(pta.estado);
                    const isEnRevisionDocente = ['REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3'].includes(pta.estado);
                    const needsAction = ['NOTIFICADO_DOCENTE', 'Devuelto', 'EN_CONCERTACION'].includes(pta.estado) || isEnRevisionDocente;
                    const horasTotal = pta.horas_totales ?? pta.total_horas_programadas ?? 0;
                    const horasMax = pta.horas_asignables ?? pta.horas_a_programar ?? 0;
                    const horasPct = Math.min(getPtaCompletionPercentage(horasTotal, horasMax), 100);

                    return (
                      <motion.div
                        key={pta.id || `pta-${i}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 26 }}
                        onClick={() => navigateToVista('v06_detalle', pta.id)}
                        className="group relative bg-white rounded-2xl border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:-translate-y-0.5 overflow-hidden"
                      >
                        {/* Top accent gradient — subtle brand touch */}
                        <div className="h-[3px] w-full" style={{
                          background: needsAction
                            ? 'linear-gradient(90deg, #EF4444, #F97316)'
                            : pta.estado === 'Aprobado' || pta.estado === 'En Firme' || pta.estado === 'Finalizado'
                              ? 'linear-gradient(90deg, #059669, #10B981)'
                              : 'linear-gradient(90deg, #003DA5, #0066E6, #3B82F6)',
                        }} />

                        <div className="p-5 sm:p-6 lg:p-7">
                          {/* Header: Title + Badge */}
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-[#003DA5]/5 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4 text-[#003DA5]" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-[0.95rem] sm:text-[1.05rem] font-bold text-gray-900 leading-tight m-0 tracking-tight">
                                    Plan de Trabajo Académico
                                  </h4>
                                  <span className="text-[0.72rem] text-gray-400 font-medium">
                                    Periodo {pta.periodo || '2025-2'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <span
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-[0.65rem] sm:text-[0.7rem] font-bold uppercase tracking-wider shrink-0"
                              style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                            >
                              {cfg.label}
                            </span>
                          </div>

                          {/* Metadata pills */}
                          <div className="flex items-center gap-2 sm:gap-3 mb-5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-[0.72rem] font-medium">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {pta.dedicacion || 'Tiempo Completo'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 text-[0.72rem] font-medium">
                              <Target className="w-3 h-3 text-gray-400" />
                              <strong className="text-gray-900">{horasTotal}</strong>
                              <span className="text-gray-400">/ {horasMax}h</span>
                            </span>
                            {/* Badge "Requiere acción" retirado: era puramente informativo
                                (sin acción propia) y duplicaba lo que ya comunican el estado
                                del PTA y el botón de acción de la tarjeta, así que confundía.
                                `needsAction` se sigue usando para la barra de acento superior. */}
                          </div>

                          {/* Hours progress bar — slim and elegant */}
                          <div className="mb-5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[0.62rem] font-semibold text-gray-400 uppercase tracking-wider">Progreso de horas</span>
                              <span className="text-[0.65rem] font-bold text-gray-500">{formatPtaPercentage(horasPct)}%</span>
                            </div>
                            <div className="w-full h-[5px] rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${horasPct}%`,
                                  background: horasPct >= 100
                                    ? 'linear-gradient(90deg, #059669, #10B981)'
                                    : horasPct >= 70
                                      ? 'linear-gradient(90deg, #003DA5, #0066E6)'
                                      : 'linear-gradient(90deg, #94A3B8, #CBD5E1)',
                                }}
                              />
                            </div>
                          </div>

                          {/* Component Approval Tracker — per-component status */}
                          <div className="mb-5">
                            <ComponentApprovalBar
                              estado={pta.estado}
                              componentesAprobacion={componentApprovalsByPta[pta.id] || []}
                            />
                          </div>

                          {/* Actions row */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2 flex-wrap">
                              {pta.estado === 'NOTIFICADO_DOCENTE' && (
                                <button onClick={(e) => { e.stopPropagation(); navigateToVista('v02_revision', pta.id); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 text-white text-[0.75rem] font-bold hover:bg-amber-600 active:scale-[0.97] transition-all border-none cursor-pointer shadow-sm">
                                  <MessageSquare className="w-3.5 h-3.5" /> Revisar propuesta
                                </button>
                              )}
                              {pta.estado === 'Borrador' && (
                                <button onClick={(e) => { e.stopPropagation(); setEditPtaId(pta.id); setVista('v03_formulario'); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#003DA5] text-white text-[0.75rem] font-bold hover:bg-[#002B75] active:scale-[0.97] transition-all border-none cursor-pointer shadow-sm">
                                  <Edit3 className="w-3.5 h-3.5" /> Continuar edición
                                </button>
                              )}
                              {pta.estado === 'Devuelto' && (
                                <button onClick={(e) => { e.stopPropagation(); navigateToVista('v10_devoluciones'); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-[0.75rem] font-bold hover:bg-orange-700 active:scale-[0.97] transition-all border-none cursor-pointer shadow-sm">
                                  <RotateCcw className="w-3.5 h-3.5" /> Subsanar
                                </button>
                              )}
                              {isEnRevisionDocente && (
                                <button onClick={(e) => { e.stopPropagation(); setEditPtaId(pta.id); setVista('v03_formulario'); }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-[0.75rem] font-bold active:scale-[0.97] transition-all border-none cursor-pointer" style={{ background: '#7C3AED', boxShadow: '0 2px 8px rgba(124,58,237,0.18)' }}>
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Revisar
                                </button>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigateToVista('v06_detalle', pta.id); }}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-500 text-[0.75rem] font-semibold hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer border-none bg-transparent group"
                            >
                              Ver detalle <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}



          {/* ═══════ V06: Detalle + V05: Concertación + V08: Tracking ═══════ */}
          {vista === 'v06_detalle' && selectedPta && (
            <div className="space-y-4">
              <button onClick={() => { setVista('v01_dashboard'); setSelectedPtaId(null); setSelectedPta(null); }} className="flex items-center gap-1.5 text-gray-500 text-[0.78rem] sm:text-[0.82rem] font-semibold border-none bg-transparent cursor-pointer hover:text-[#003DA5] transition-colors mb-1">
                <ChevronLeft className="w-4 h-4" /> Volver al dashboard
              </button>

              {/* HU-12 — Sub-tabs de versión (R01 / R02 …) del mismo periodo.
                  Solo se muestran si el docente tiene más de un PTA en el periodo. */}
              {versionesPeriodo.length > 1 && (
                <div className="flex items-center gap-1.5 bg-gray-50/60 backdrop-blur-2xl rounded-xl p-1 sm:p-1.5 border border-gray-200/50 w-fit">
                  {versionesPeriodo.map((v, idx) => {
                    const activa = v.id === selectedPta.id;
                    const label = `R${String(idx + 1).padStart(2, '0')}`;
                    const cfg = getEstadoCfg(v.estado);
                    return (
                      <button
                        key={v.id}
                        onClick={() => { if (!activa) setSelectedPtaId(v.id); }}
                        title={`${label} — ${cfg.label}`}
                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[0.72rem] sm:text-[0.78rem] font-bold cursor-pointer transition-all ${activa ? 'text-[#003DA5] bg-white shadow-[0_2px_8px_rgba(0,61,165,0.08)]' : 'text-gray-500 bg-transparent hover:text-gray-700'}`}
                      >
                        {label}
                        {idx === 0 && <span className="text-[0.6rem] font-semibold text-gray-400">(original)</span>}
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Estado y Tracking */}
              <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5 lg:p-6 shadow-sm">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <h3 className="text-[0.95rem] sm:text-[1.05rem] font-black text-gray-900 m-0 tracking-tight">PTA — {selectedPta.periodo || '2025-2'}</h3>
                    <p className="text-[0.7rem] sm:text-[0.75rem] text-gray-500 mt-0.5 font-medium">{selectedPta.dedicacion} • <span className="text-gray-400">ID: {selectedPta.id?.substring(0, 14)}</span></p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPta.estado === 'NOTIFICADO_DOCENTE' && (
                      <button onClick={() => navigateToVista('v02_revision', selectedPta.id)} className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg border-none bg-amber-500 text-white text-[0.72rem] font-bold cursor-pointer hover:bg-amber-600 active:scale-[0.97] transition-all shadow-sm">
                        <Eye className="w-3 h-3" /> <span className="hidden sm:inline">Revisar</span> propuesta
                      </button>
                    )}
                    <button onClick={() => navigateToVista('v09_imprimir', selectedPta.id)} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-200 bg-white text-gray-600 text-[0.72rem] font-semibold cursor-pointer hover:bg-gray-50 hover:shadow-sm active:scale-[0.97] transition-all">
                      <Printer className="w-3 h-3" /> <span className="hidden xs:inline">Imprimir</span>
                    </button>
                    <button onClick={() => setIsReporteOpen(true)} className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-blue-100 bg-blue-50/80 text-[#1E3A8A] text-[0.72rem] font-bold cursor-pointer hover:bg-blue-100 active:scale-[0.97] transition-all">
                      <FileText className="w-3 h-3" /> <span className="hidden sm:inline">Reporte</span>
                    </button>
                  </div>
                </div>

                {/* Estado de aprobación */}
                <div className="p-3 sm:p-4 bg-gray-50/70 rounded-xl border border-gray-100/60 mb-4">
                  <div className="text-[0.62rem] sm:text-[0.68rem] font-bold text-gray-400 uppercase tracking-wider mb-2">Estado de aprobación</div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[0.65rem] sm:text-[0.7rem] font-bold" style={{ background: getEstadoCfg(selectedPta.estado).bg, color: getEstadoCfg(selectedPta.estado).color }}>
                      {getEstadoCfg(selectedPta.estado).label}
                    </span>
                  </div>
                </div>

                {/* Métricas — responsive grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    { label: 'Horas programadas', value: selectedPta.horas_totales ?? selectedPta.total_horas_programadas ?? 0 },
                    { label: 'Horas disponibles', value: selectedPta.horas_asignables ?? selectedPta.horas_a_programar ?? 0 },
                    { label: '% Carga', value: `${formatPtaCompletionPercentage(
                      selectedPta.horas_totales ?? selectedPta.total_horas_programadas ?? 0,
                      selectedPta.horas_asignables ?? selectedPta.horas_a_programar ?? 0,
                    )}%` },
                    { label: 'Asignaturas', value: selectedPta.asignaturas?.length || selectedPta.num_asignaturas || 0 },
                  ].map(m => (
                    <div key={m.label} className="p-2.5 sm:p-3 rounded-xl bg-gray-50/80 border border-gray-100/60">
                      <div className="text-[0.55rem] sm:text-[0.6rem] font-bold text-gray-400 uppercase tracking-wide">{m.label}</div>
                      <div className="text-[1rem] sm:text-[1.1rem] font-extrabold text-gray-900 mt-0.5">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribución por Componente */}
              {selectedPta && (() => {
                const asigs = selectedPta.asignaturas || [];
                const horasDoc = selectedPta.horas_docencia ?? asigs.reduce((s: number, a: any) => s + (a.total_horas || a.horas || 0), 0);
                const horasInv = selectedPta.horas_investigacion ?? 0;
                const horasExt = selectedPta.horas_extension ?? 0;
                // horas_complementarias ya incluye la sección académico-administrativa.
                const horasComp = selectedPta.horas_complementarias ?? 0;
                const horasTotal = selectedPta.horas_totales ?? selectedPta.total_horas_programadas ?? (horasDoc + horasInv + horasExt + horasComp);
                const horasMax = selectedPta.horas_asignables ?? selectedPta.horas_a_programar ?? 0;
                const comps = [
                  { label: 'Docencia', value: horasDoc, color: PTA_COLORS.DOCENCIA, icon: BookOpen },
                  { label: 'Investigación', value: horasInv, color: PTA_COLORS.INVESTIGACION, icon: FlaskConical },
                  { label: 'Extensión', value: horasExt, color: PTA_COLORS.EXTENSION, icon: Globe },
                  { label: 'Complementarias', value: horasComp, color: PTA_COLORS.COMPLEMENTARIAS, icon: Briefcase },
                ];

                // Donut chart calculations
                const radius = 70;
                const circumference = 2 * Math.PI * radius;
                const compsWithData = comps.filter(c => c.value > 0);
                let cumulativeOffset = 0;
                const donutSegments = compsWithData.map(c => {
                  const pct = horasTotal > 0 ? c.value / horasTotal : 0;
                  const dashLength = pct * circumference;
                  const dashOffset = -cumulativeOffset;
                  cumulativeOffset += dashLength;
                  return { ...c, pct, dashLength, dashOffset };
                });

                const chartContent = (
                  <div className="bg-white rounded-3xl border border-gray-200/80 p-4 shadow-sm mb-4">
                    <h4 className="text-[11px] font-black tracking-widest text-gray-400 mb-3 flex items-center gap-1.5 uppercase">
                      <Target className="w-3.5 h-3.5 text-[#003DA5]" /> Distribución por Componente
                    </h4>

                    <div className="flex flex-col items-center gap-4">
                      {/* Donut Chart */}
                      <div className="relative w-[78px] h-[78px] shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="80" cy="80" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="16" />
                          {donutSegments.map((seg, i) => (
                            <circle
                              key={seg.label}
                              cx="80" cy="80" r={radius}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="16"
                              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                              strokeDashoffset={seg.dashOffset}
                              strokeLinecap="butt"
                              className="transition-all duration-600 ease-out"
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.04))' }}
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[0.8rem] font-black text-gray-900 leading-none">{horasTotal}</span>
                          <span className="text-[0.38rem] font-bold text-gray-400 uppercase tracking-wider mt-0.5">horas</span>
                          <span className="text-[0.35rem] text-gray-400 mt-0.5">de {horasMax}h</span>
                        </div>
                      </div>

                      {/* Stacked legend */}
                      <div className="w-full space-y-2">
                        {comps.map(c => {
                          const pct = horasTotal > 0 ? Math.round((c.value / horasTotal) * 100) : 0;
                          return (
                            <div key={c.label} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                <span className="text-gray-600 font-semibold truncate text-[11px]">{c.label}</span>
                              </div>
                              <span className="text-gray-900 font-bold shrink-0 text-[11px]">
                                {c.value}h <span className="text-gray-400 font-normal">({pct}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 text-[9.5px] text-gray-400 leading-normal">
                      <strong>Fórmula GTH-F081:</strong> K15 = Horas base (AP=64, Maestría=créd×12, otros=créd×16) → L15 = K15 × 3
                    </div>
                  </div>
                );

                if (slotNode) {
                  return createPortal(chartContent, slotNode);
                }

                // Fallback inline for mobile or if slot is not found
                return (
                  <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5 lg:p-6 mb-4 shadow-sm animate-in fade-in duration-300">
                    <h4 className="text-[0.82rem] sm:text-[0.88rem] font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#003DA5]" /> Distribución por Componente
                    </h4>

                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
                      <div className="relative w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="80" cy="80" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="16" />
                          {donutSegments.map((seg, i) => (
                            <circle
                              key={seg.label}
                              cx="80" cy="80" r={radius}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="16"
                              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                              strokeDashoffset={seg.dashOffset}
                              strokeLinecap="butt"
                              className="transition-all duration-600 ease-out"
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))' }}
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-[1.15rem] sm:text-[1.3rem] font-black text-gray-900 leading-none">{horasTotal}</span>
                          <span className="text-[0.52rem] sm:text-[0.58rem] font-bold text-gray-400 uppercase tracking-wider">horas</span>
                          <span className="text-[0.48rem] sm:text-[0.52rem] text-gray-300 mt-0.5">de {horasMax}h</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 w-full">
                        {comps.map(c => {
                          const maxH = Math.round(horasMax * 0.5);
                          const pct = maxH > 0 ? Math.min((c.value / maxH) * 100, 100) : 0;
                          const compPct = horasTotal > 0 ? Math.round((c.value / horasTotal) * 100) : 0;
                          return (
                            <div key={c.label} className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-2.5">
                              <c.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" style={{ color: c.color }} />
                              <span className="w-[70px] sm:w-[90px] text-[0.62rem] sm:text-[0.68rem] font-semibold text-gray-600 shrink-0 truncate">{c.label}</span>
                              <div className="flex-1 h-[5px] sm:h-[6px] rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, background: c.color }} />
                              </div>
                              <span className="text-[0.6rem] sm:text-[0.65rem] font-bold shrink-0 text-right w-[50px] sm:w-[55px]" style={{ color: c.color }}>
                                {c.value}h <span className="font-medium text-gray-400">({compPct}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-blue-50/60 border border-blue-100/60 text-[0.55rem] sm:text-[0.6rem] text-blue-700">
                      <strong>Fórmula GTH-F081:</strong> K15 = Horas base (AP=64, Maestría=créd×12, otros=créd×16) → L15 = K15 × 3
                    </div>
                  </div>
                );
              })()}

              {/* Las actividades académico-administrativas se muestran dentro de
                  "Complementarias" (son una sección de Complementarias). */}

              {/* Docencia — Asignaturas (detalle completo por asignatura) */}
              {selectedPta.asignaturas?.length > 0 && (() => {
                const asigs = selectedPta.asignaturas;
                const totalDoc = Number(selectedPta.horas_docencia ?? 0)
                  || asigs.reduce((s: number, a: any) => s + Number(a.total_horas || a.horas || 0), 0);
                return (
                  <DetalleSeccion
                    icon={BookOpen}
                    color={PTA_COLORS.DOCENCIA}
                    titulo="Docencia"
                    subtitulo="Asignaturas del plan de trabajo"
                    count={asigs.length}
                    countLabel={asigs.length === 1 ? 'asignatura' : 'asignaturas'}
                    totalHoras={totalDoc}
                    estadoComponente={getEstadoComponente(selectedPta, 'academica')}
                  >
                    {asigs.map((a: any, i: number) => (
                      <ItemDetalle key={i} color={PTA_COLORS.DOCENCIA}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#111827', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{a.nombre || a.asignatura_nombre || 'Asignatura'}</div>
                            {a.nucleo_tematico && <div style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: 600, marginTop: 2 }}>{a.nucleo_tematico}</div>}
                          </div>
                          <HorasBadge horas={Number(a.total_horas || a.horas || 0)} color={PTA_COLORS.DOCENCIA} />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          <DetalleChip label="Programa" value={a.programa_nombre} />
                          <DetalleChip icon={MapPin} label="CETAP" value={a.cetap_nombre} color={PTA_COLORS.DOCENCIA} />
                          <DetalleChip label="Territorial" value={a.territorial_nombre} />
                          <DetalleChip label="Modalidad" value={MODALIDAD_LABELS[a.modalidad] || a.modalidad} />
                          <DetalleChip label="Créditos" value={a.creditos} />
                          <DetalleChip label="Semestre" value={a.semestre} />
                          <DetalleChip icon={Users} label="Estudiantes" value={a.total_estudiantes} color={PTA_COLORS.DOCENCIA} />
                          <DetalleChip icon={Clock} label="Horas base" value={a.horas_base ? `${a.horas_base}h` : null} color={PTA_COLORS.DOCENCIA} />
                          <DetalleChip label="% del PTA" value={Number(a.porcentaje_pta) > 0 ? `${a.porcentaje_pta}%` : null} />
                          <DetalleChip icon={Calendar} label="Periodo" value={rangoFechas(a.fecha_inicio, a.fecha_fin)} color={PTA_COLORS.DOCENCIA} />
                        </div>
                        <HierarchySelectionSummary activity={a} accent={PTA_COLORS.DOCENCIA} compact className="mt-2" />
                        <ObservacionesNota texto={a.observaciones} />
                      </ItemDetalle>
                    ))}
                  </DetalleSeccion>
                );
              })()}

              {/* Investigación — Proyecto y Actividades (detalle completo) */}
              {(() => {
                const proy = selectedPta.investigacion_proyecto;
                const invActs = Array.isArray(selectedPta.investigacion_actividades) ? selectedPta.investigacion_actividades : [];
                const tieneProy = proy && (proy.nombre || proy.rol || proy.codigo || Number(proy.horas_solicitadas) > 0);
                if (!tieneProy && invActs.length === 0) return null;
                const colorInv = PTA_COLORS.INVESTIGACION;
                // Igual que el backend (toPtaDto): horas del proyecto o, en su defecto, suma de actividades.
                const totalInv = Number(selectedPta.horas_investigacion ?? 0)
                  || Number(proy?.horas_solicitadas || 0)
                  || invActs.reduce((s: number, a: any) => s + Number(a.horas_total ?? a.horas ?? 0), 0);
                const partes = [tieneProy ? 'Proyecto' : null, invActs.length > 0 ? `${invActs.length} ${invActs.length === 1 ? 'actividad' : 'actividades'}` : null].filter(Boolean);
                return (
                  <DetalleSeccion
                    icon={FlaskConical}
                    color={colorInv}
                    titulo="Investigación"
                    subtitulo={partes.join(' · ')}
                    totalHoras={totalInv}
                    estadoComponente={getEstadoComponente(selectedPta, 'investigacion')}
                  >
                    {tieneProy && (
                      <ItemDetalle color={colorInv}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#111827', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{proy.nombre || 'Proyecto de investigación'}</div>
                            {proy.rol && (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Award size={11} color={colorInv} />
                                <span style={{ fontSize: '0.64rem', fontWeight: 800, color: colorInv, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{proy.rol}</span>
                              </div>
                            )}
                          </div>
                          <HorasBadge horas={Number(proy.horas_solicitadas || 0)} color={colorInv} />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          <DetalleChip label="Código" value={proy.codigo} />
                          <DetalleChip label="Grupo" value={proy.grupo} />
                          <DetalleChip label="Línea" value={proy.linea} />
                          <DetalleChip icon={Calendar} label="Periodo" value={rangoFechas(proy.fecha_inicio, proy.fecha_fin)} color={colorInv} />
                          <ResolucionChip nombre={proy.resolucion_nombre} url={proy.resolucion_archivo_url} />
                        </div>
                        <HierarchySelectionSummary activity={proy} accent={colorInv} compact className="mt-2" />
                      </ItemDetalle>
                    )}
                    {invActs.length > 0 && tieneProy && (
                      <SubSeccionHeader label="Actividades de investigación" count={invActs.length} color={colorInv} />
                    )}
                    {invActs.map((a: any, idx: number) => (
                      <ItemDetalle key={a.id || a.actividad_id || idx} color={colorInv}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1F2937', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{a.nombre || a.actividad_nombre || a.actividad_id || 'Actividad'}</div>
                            {a.descripcion && <div style={{ fontSize: '0.66rem', color: '#6B7280', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{a.descripcion}</div>}
                          </div>
                          <HorasBadge horas={Number(a.horas_total ?? a.horas ?? 0)} color={colorInv} />
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                          <DetalleChip label="Cantidad" value={Number(a.cantidad) > 0 ? a.cantidad : null} />
                          <DetalleChip label="Horas unitarias" value={Number(a.horas_unitarias) > 0 ? `${a.horas_unitarias}h` : null} />
                          <DetalleChip icon={Calendar} label="Periodo" value={rangoFechas(a.fecha_inicio, a.fecha_fin)} color={colorInv} />
                          <ResolucionChip nombre={a.resolucion_nombre} url={a.resolucion_archivo_url} />
                        </div>
                        <HierarchySelectionSummary activity={a} accent={colorInv} compact className="mt-2" />
                      </ItemDetalle>
                    ))}
                  </DetalleSeccion>
                );
              })()}

              {/* Extensión — Actividades agrupadas por dirección/sección */}
              {(() => {
                const extActs = Array.isArray(selectedPta.extension_actividades) ? selectedPta.extension_actividades : [];
                if (extActs.length === 0) return null;
                const colorExt = PTA_COLORS.EXTENSION;
                const totalExt = Number(selectedPta.horas_extension ?? 0)
                  || extActs.reduce((s: number, e: any) => s + Number(e.horas ?? e.horas_ejecutadas ?? 0), 0);
                // Agrupa por sección preservando el orden de aparición.
                const grupos: Array<{ seccion: string; items: any[] }> = [];
                for (const e of extActs) {
                  const sec = String(e.seccion || '');
                  const g = grupos.find(x => x.seccion === sec);
                  if (g) g.items.push(e); else grupos.push({ seccion: sec, items: [e] });
                }
                const renderAct = (e: any, idx: number) => (
                  <ItemDetalle key={e.id || e.actividad_id || idx} color={colorExt}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1F2937', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{e.nombre || e.actividad_nombre || e.actividad_id || 'Actividad de extensión'}</div>
                        {e.descripcion && <div style={{ fontSize: '0.66rem', color: '#6B7280', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{e.descripcion}</div>}
                      </div>
                      <HorasBadge horas={Number(e.horas ?? e.horas_ejecutadas ?? 0)} color={colorExt} />
                    </div>
                    <HierarchySelectionSummary activity={e} accent={colorExt} compact className="mt-2" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <DetalleChip icon={Calendar} label="Periodo" value={rangoFechas(e.fecha_inicio, e.fecha_fin)} color={colorExt} />
                    </div>
                  </ItemDetalle>
                );
                return (
                  <DetalleSeccion
                    icon={Globe}
                    color={colorExt}
                    titulo="Extensión"
                    subtitulo="Actividades de extensión universitaria"
                    count={extActs.length}
                    countLabel={extActs.length === 1 ? 'actividad' : 'actividades'}
                    totalHoras={totalExt}
                    estadoComponente={getEstadoComponente(selectedPta, 'extension')}
                  >
                    {grupos.length > 1 || (grupos.length === 1 && grupos[0].seccion)
                      ? grupos.map(g => (
                          <div key={g.seccion || 'sin_seccion'} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <SubSeccionHeader label={prettySeccion(g.seccion) || 'Otras actividades'} count={g.items.length} color={colorExt} />
                            {g.items.map(renderAct)}
                          </div>
                        ))
                      : extActs.map(renderAct)}
                  </DetalleSeccion>
                );
              })()}

              {/* Complementarias — agrupadas por sub-sección (docencia / académico-administrativas) */}
              {(() => {
                const compsPrimary = Array.isArray(selectedPta.complementarias) ? selectedPta.complementarias : [];
                const compsLegacyAadm = Array.isArray(selectedPta.academico_admin) ? selectedPta.academico_admin : [];
                const comps = [
                  ...compsPrimary.map((activity: any) =>
                    activity?.seccion == null && activity?.consumeTotalidad !== undefined
                      ? { ...activity, seccion: 'academico_administrativas' }
                      : activity),
                  ...compsLegacyAadm
                    .filter((legacy: any) => !compsPrimary.some((current: any) =>
                      String(current?.actividad_id ?? current?.id) === String(legacy?.actividad_id ?? legacy?.id)
                      && (
                        current?.seccion === 'academico_administrativas'
                        || (current?.seccion == null && current?.consumeTotalidad !== undefined)
                      )))
                    .map((activity: any) => ({ ...activity, seccion: 'academico_administrativas' })),
                ];
                if (comps.length === 0) return null;
                const colorComp = PTA_COLORS.COMPLEMENTARIAS;
                // El amarillo puro es ilegible sobre fondo claro: texto en tono ámbar oscuro.
                const textComp = '#A16207';
                const totalComp = Number(selectedPta.horas_complementarias ?? 0)
                  || comps.reduce((s: number, c: any) => s + Number(c.horas ?? 0), 0);
                const grupos: Array<{ seccion: string; items: any[] }> = [];
                for (const c of comps) {
                  const sec = String(c.seccion || 'complementarias_docencia');
                  const g = grupos.find(x => x.seccion === sec);
                  if (g) g.items.push(c); else grupos.push({ seccion: sec, items: [c] });
                }
                const renderComp = (c: any, idx: number) => (
                  <ItemDetalle key={c.id || c.actividad_id || idx} color={colorComp}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1F2937', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{c.nombre || c.actividad_nombre || c.actividad_id || 'Actividad complementaria'}</div>
                        {c.descripcion && <div style={{ fontSize: '0.66rem', color: '#6B7280', marginTop: 3, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{c.descripcion}</div>}
                      </div>
                      <HorasBadge horas={Number(c.horas ?? 0)} color={textComp} />
                    </div>
                    <HierarchySelectionSummary activity={c} accent={textComp} compact className="mt-2" />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      <DetalleChip icon={Calendar} label="Periodo" value={rangoFechas(c.fecha_inicio, c.fecha_fin)} color={textComp} />
                    </div>
                  </ItemDetalle>
                );
                return (
                  <DetalleSeccion
                    icon={Briefcase}
                    color={colorComp}
                    textColor={textComp}
                    titulo="Complementarias"
                    subtitulo="Incluye actividades académico-administrativas"
                    count={comps.length}
                    countLabel={comps.length === 1 ? 'actividad' : 'actividades'}
                    totalHoras={totalComp}
                    estadoComponente={getEstadoComponente(selectedPta, 'complementarias')}
                  >
                    {grupos.length > 1 || comps.some((c: any) => c.seccion)
                      ? grupos.map(g => (
                          <div key={g.seccion} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <SubSeccionHeader label={prettySeccion(g.seccion)} count={g.items.length} color={textComp} />
                            {g.items.map(renderComp)}
                          </div>
                        ))
                      : comps.map(renderComp)}
                  </DetalleSeccion>
                );
              })()}

              {/* V05: Concertación (if applicable) */}
              {selectedPta.estado === 'EN_CONCERTACION' && (
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #DDD6FE', padding: '18px 22px', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#6B21A8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare style={{ width: 15, height: 15, color: '#7C3AED' }} /> Mesa de Concertación
                  </h4>
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(selectedPta.concertacion?.mensajes || []).map((msg: any, i: number) => (
                      <div key={i} style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: msg.autor_rol === 'docente' ? '#EFF6FF' : '#F3E8FF',
                        border: `1px solid ${msg.autor_rol === 'docente' ? '#BFDBFE' : '#DDD6FE'}`,
                        alignSelf: msg.autor_rol === 'docente' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                      }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280' }}>{msg.autor}</div>
                        <div style={{ fontSize: '0.82rem', color: '#374151' }}>{msg.mensaje}</div>
                        {msg.fecha && <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>{timeAgo(msg.fecha)}</div>}
                      </div>
                    ))}
                    {(!selectedPta.concertacion?.mensajes || selectedPta.concertacion.mensajes.length === 0) && (
                      <p style={{ fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Sin mensajes. Inicia la conversación.</p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={concertMsg}
                      onChange={e => setConcertMsg(e.target.value)}
                      placeholder="Escribe tu mensaje..."
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensajeConcertacion()}
                      className="flex-1 min-w-0 rounded-xl border border-violet-300 bg-white px-3.5 py-2.5 text-[0.85rem] font-medium text-slate-800 shadow-sm placeholder:text-slate-400 hover:border-violet-400 hover:shadow-md focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={enviarMensajeConcertacion}
                      disabled={sendingMsg || !concertMsg.trim()}
                      aria-label="Enviar mensaje de concertación"
                      className="flex items-center justify-center rounded-xl border-none bg-violet-600 px-4 py-2.5 text-white shadow-sm hover:bg-violet-700 hover:shadow-md active:scale-95 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-1 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-200"
                    >
                      <Send style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Historial */}
              {selectedPta.historial?.length > 0 && (
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px' }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock style={{ width: 15, height: 15, color: '#D97706' }} /> Historial ({selectedPta.historial.length})
                  </h4>
                  <div style={{ paddingLeft: 8 }}>
                    {selectedPta.historial.slice().reverse().map((h: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, position: 'relative' }}>
                        {i < selectedPta.historial.length - 1 && (
                          <div style={{ position: 'absolute', left: 5, top: 14, bottom: -6, width: 2, background: '#E5E7EB' }} />
                        )}
                        <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 3, background: i === 0 ? '#003DA5' : '#E5E7EB' }} />
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>
                            {h.estado_nuevo || h.accion}
                            <span style={{ fontWeight: 400, color: '#9CA3AF', marginLeft: 6, fontSize: '0.68rem' }}>
                              {h.fecha ? new Date(h.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          {h.observaciones && <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 1 }}>{h.observaciones}</div>}
                          {h.actor && <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>por {h.actor}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ Seguimiento: documentos de soporte (solo cuando Aprobado) ═══ */}
              {['Aprobado', 'En Firme', 'Finalizado', 'Aprobado DEF'].includes(selectedPta.estado) && (
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #BBF7D0', padding: '18px 22px', marginBottom: 14 }}>
                  <V12AdjuntosDocumentos
                    ptas={ptas}
                    userName={userName || 'Docente'}
                    ptaId={selectedPta.id}
                    ptaData={selectedPta}
                  />
                </div>
              )}

              {isReporteOpen && selectedPta && createPortal(
                <ReportePTAInstitucional
                  pta={selectedPta}
                  userPerfil={{
                    ...docentePerfil,
                    nombre: docentePerfil?.nombre_completo || userName,
                    identificacion: docentePerfil?.documento_identidad || userPersonId,
                    email: docentePerfil?.correo_institucional || docentePerfil?.email || userEmail,
                  }}
                  onClose={() => setIsReporteOpen(false)}
                  isParcial={!['Aprobado', 'En Firme', 'Finalizado'].includes(selectedPta.estado)}
                  certificadoId={selectedPta.certificado_qr}
                  signedAt={selectedPta.signed_at || selectedPta.updated_at}
                  periodoAcademico={activePeriodoData}
                  componentesAprobacion={componentApprovalsByPta[selectedPta.id] || []}
                />,
                document.body,
              )}
            </div>
          )}

          {/* ═══════ V07: Tareas pendientes ═══════ */}
          {vista === 'v07_notificaciones' && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListChecks style={{ width: 18, height: 18, color: '#D97706' }} />
                Tareas pendientes ({notificaciones.length})
              </h3>
              {notificaciones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: '#F9FAFB', borderRadius: 14 }}>
                  <CheckCircle2 style={{ width: 36, height: 36, color: '#6EE7B7', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>Sin tareas pendientes</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notificaciones.map((notif, idx) => {
                    const colors = notif.tipo === 'revision' ? { bg: '#FEF3C7', color: '#92400E', icon: Eye }
                      : notif.tipo === 'devolucion' ? { bg: '#FEE2E2', color: '#991B1B', icon: RotateCcw }
                      : notif.tipo === 'concertacion' ? { bg: '#F3E8FF', color: '#6B21A8', icon: MessageSquare }
                      : { bg: '#D1FAE5', color: '#059669', icon: CheckCircle2 };
                    const NotifIcon = colors.icon;
                    return (
                      <motion.div
                        key={notif.id || `notif-${idx}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                        onClick={() => {
                          if (notif.tipo === 'revision') navigateToVista('v02_revision', notif.ptaId);
                          else navigateToVista('v06_detalle', notif.ptaId);
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <NotifIcon style={{ width: 18, height: 18, color: colors.color }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{notif.titulo}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{notif.descripcion}</div>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{timeAgo(notif.fecha)}</span>
                        <ChevronRight style={{ width: 16, height: 16, color: '#D1D5DB' }} />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════ V11: Calendario ═══════ */}
          {vista === 'v11_calendario' && (
            <V11CalendarioAcademico ptas={ptas} periodo={activePeriodo} />
          )}

          {/* ═══════ V12: Adjuntos ═══════ */}
          {vista === 'v12_adjuntos' && (
            <V12AdjuntosDocumentos ptas={ptas} userName={userName || 'Docente'} />
          )}

          {/* ═══════ V13: Indicadores ═══════ */}
          {vista === 'v13_indicadores' && (
            <V13IndicadoresPersonales ptas={ptas} userName={userName || 'Docente'} />
          )}

          {/* ═══════ V14: Certificado ═══════ */}
          {vista === 'v14_certificado' && (
            <V14CertificadoDigitalPortal
              ptas={ptas}
              userName={userName || 'Docente'}
              onVerificar={(certId) => { setSelectedPtaId(certId); setVista('verificar_qr' as VistaPortal); }}
            />
          )}



          {/* ═══════ Verificar QR ═══════ */}
          {vista === ('verificar_qr' as VistaPortal) && (
            <div>
              <button onClick={() => setVista('v14_certificado')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: '0.82rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 14 }}>
                <ChevronLeft style={{ width: 16, height: 16 }} /> Volver a certificados
              </button>
              <VerificacionQRPublicaPTA certificadoIdInicial={selectedPtaId || ''} embedded />
            </div>
          )}

          {/* ═══════ V10: Devoluciones ═══════ */}
          {vista === 'v10_devoluciones' && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw style={{ width: 18, height: 18, color: '#D97706' }} />
                PTAs devueltos ({devoluciones.length})
              </h3>
              {devoluciones.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', background: '#F9FAFB', borderRadius: 14 }}>
                  <CheckCircle2 style={{ width: 36, height: 36, color: '#6EE7B7', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>Sin PTAs devueltos</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {devoluciones.map((pta, idx) => (
                    <div key={pta.id || `dev-${idx}`} style={{ background: 'white', borderRadius: 14, border: '1px solid #FDBA74', padding: '18px 22px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>Periodo {pta.periodo}</span>
                          <span style={{ padding: '2px 8px', borderRadius: 8, background: '#FFF7ED', color: '#9A3412', fontSize: '0.68rem', fontWeight: 700, marginLeft: 8, border: '1px solid #FDBA74' }}>Devuelto</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditPtaId(pta.id); setVista('v03_formulario'); }} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1E40AF', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Edit3 style={{ width: 12, height: 12 }} /> Corregir
                          </button>
                          <button onClick={() => reenviarPTA(pta.id)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Send style={{ width: 12, height: 12 }} /> Re-enviar
                          </button>
                        </div>
                      </div>
                      {/* Motivo de devolución */}
                      <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9A3412', marginBottom: 4 }}>Motivo de devolución:</div>
                        <div style={{ fontSize: '0.82rem', color: '#374151' }}>{pta.motivo_devolucion || pta.observaciones || 'Sin motivo especificado'}</div>
                      </div>
                      {/* Last historial entry showing who returned it */}
                      {pta.historial?.length > 0 && (() => {
                        const devEntry = [...pta.historial].reverse().find((h: any) => h.estado_nuevo === 'Devuelto');
                        return devEntry ? (
                          <div style={{ marginTop: 8, fontSize: '0.72rem', color: '#6B7280' }}>
                            Devuelto por: {devEntry.actor || devEntry.aprobador_nombre || 'N/A'} •{' '}
                            {devEntry.fecha ? new Date(devEntry.fecha).toLocaleDateString('es-CO') : ''}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Notificaciones flotantes de solicitudes resueltas */}
      <AnimatePresence>
        {solicitudesResueltas.map((sol, idx) => (
          <motion.div
            key={sol.id || `sol-${idx}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed', bottom: 20 + idx * 160, right: 20, zIndex: 9999,
              maxWidth: 400, padding: '16px 20px', borderRadius: 14,
              background: ['aprobado', 'gestionada'].includes(sol.estado) ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${['aprobado', 'gestionada'].includes(sol.estado) ? '#6EE7B7' : '#FECACA'}`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {['aprobado', 'gestionada'].includes(sol.estado)
                  ? <CheckCircle2 style={{ width: 18, height: 18, color: '#059669' }} />
                  : <XCircle style={{ width: 18, height: 18, color: '#DC2626' }} />}
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: ['aprobado', 'gestionada'].includes(sol.estado) ? '#065F46' : '#991B1B' }}>
                  Solicitud {sol.estado === 'gestionada' ? 'completada' : sol.estado === 'aprobado' ? 'aprobada' : 'denegada'}
                </span>
              </div>
              <button onClick={() => handleDismissSolicitud(sol.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                <X style={{ width: 14, height: 14, color: '#9CA3AF' }} />
              </button>
            </div>
            {sol.resolucionMotivo && (
              <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: '0 0 8px', lineHeight: 1.4 }}>
                {sol.resolucionMotivo}
              </p>
            )}
            {sol.resueltoPor && (
              <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '0 0 8px', fontWeight: 600 }}>
                Resuelta por: {sol.resueltoPor}
              </p>
            )}
            {['aprobado', 'gestionada'].includes(sol.estado) && (
              <p style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, margin: 0 }}>
                {(sol.tipoSolicitud || 'creacion') === 'edicion_componentes'
                  ? sol.estado === 'gestionada'
                    ? 'Los componentes modificados fueron aprobados y el PTA conservó su estado correspondiente.'
                    : 'Los componentes seleccionados ya están habilitados para edición en el mismo PTA.'
                  : sol.resolucionAccion === 'caso_1'
                    ? 'Puede crear un PTA en la nueva territorial'
                    : 'Puede crear el PTA autorizado'}
              </p>
            )}
            <button
              onClick={() => handleDismissSolicitud(sol.id)}
              style={{ marginTop: 10, width: '100%', padding: '7px 14px', borderRadius: 8, border: 'none', background: ['aprobado', 'gestionada'].includes(sol.estado) ? '#059669' : '#6B7280', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Entendido
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Modal general de solicitudes PTA */}
      {showSolicitudModal && (
        <SolicitudPTAModal
          docenteId={userPersonId}
          docenteNombre={userName || ''}
          docenteEmail={userEmail}
          ptas={ptas}
          onClose={() => setShowSolicitudModal(false)}
          onSuccess={() => { loadPtas(); loadSolicitudes(); }}
        />
      )}
    </div>
  );
}
