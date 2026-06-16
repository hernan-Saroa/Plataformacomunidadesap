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
  Activity, Download, ExternalLink, Lock
} from 'lucide-react';
import { usePTARules } from './ConfiguracionReglasPTA';
import { toast } from 'sonner';
import { getPTAById, updatePTAStatus, guardarFirmaDigitalPTA, getAprobacionesJefatura, getEvidenciasPTA, revisarEvidenciaPTA, getComponentesAprobacion, aprobarComponente } from '../../services/api/ptaApi';
import { getBaseURL } from '../../../../shell/src/services/api';
import { API_MODE, MICROSERVICE_URLS } from '../../../../shell/src/config/environment';
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
  onUpdated?: (updatedPta: any) => void; // Notifica al padre cuando el PTA cambia
  puedeAprobar: boolean;
  nivelAprobacion: number;
  rolLabel: string;
  jefaturaTerritorialId?: string;
  isSuperUser?: boolean;
  actorId?: string;
  actorNombre?: string;
}

type EvidencePreviewFile = {
  sourceUrl: string;
  displayUrl?: string;
  objectUrl?: string;
  nombre: string;
  tipo: string;
  loading?: boolean;
  error?: string;
};

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

const COMPONENT_LEVELS: Record<string, number> = {
  academica: 1,
  complementarias: 1,
  investigacion: 2,
  ext_capacitacion: 2,
  ext_procesos: 2,
  ext_fortalecimiento: 2,
  ext_gobierno: 2,
  ext_secciones: 2,
  academicas_admin: 3,
};

function getResponsableRoleLabel(key: string): string {
  const lvl = COMPONENT_LEVELS[key];
  if (lvl === 1) return 'Jefatura de Programa';
  if (lvl === 2) return 'Decanatura';
  if (lvl === 3) return 'Gestión Profesoral';
  return 'Revisor responsable';
}

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

const ESTADO_NIVEL_APROBACION: Record<string, number> = {
  'Pendiente Jefatura': 1,
  'Pendiente Decanatura': 2,
  'Pendiente Gestión Profesoral': 3,
};

function puedeAprobarEstadoActual(estado: string, nivelUsuario: number): boolean {
  const nivelRequerido = ESTADO_NIVEL_APROBACION[estado];
  if (!nivelRequerido) return false;
  return nivelUsuario >= nivelRequerido;
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

function fmtFechaHora(d?: string | Date): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const dateStr = date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${dateStr} ${timeStr}`;
}

function getApprovalDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function CountdownTimer({ assignmentDate, isApproved }: { assignmentDate: Date; isApproved: boolean }) {
  const [timeLeft, setTimeLeft] = useState(() => calcRemaining(assignmentDate));

  useEffect(() => {
    if (isApproved) return;
    const interval = setInterval(() => {
      setTimeLeft(calcRemaining(assignmentDate));
    }, 60000);
    return () => clearInterval(interval);
  }, [assignmentDate, isApproved]);

  function calcRemaining(start: Date) {
    const deadline = new Date(start.getTime() + 4 * 7 * 24 * 60 * 60 * 1000); // 4 weeks
    const diff = deadline.getTime() - Date.now();
    return {
      deadline,
      diff,
      isExpired: diff < 0,
    };
  }

  if (isApproved) return null;

  const absDiff = Math.abs(timeLeft.diff);
  const days = Math.floor(absDiff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((absDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((absDiff % (60 * 60 * 1000)) / (60 * 1000));

  const text = timeLeft.isExpired
    ? `Plazo vencido hace ${days}d ${hours}h`
    : `Plazo: 4 semanas (quedan ${days}d ${hours}h ${minutes}m)`;

  const color = timeLeft.isExpired ? '#EF4444' : timeLeft.diff < 7 * 24 * 60 * 60 * 1000 ? '#F59E0B' : '#3B82F6';
  const bg = timeLeft.isExpired ? '#FEF2F2' : timeLeft.diff < 7 * 24 * 60 * 60 * 1000 ? '#FFFBEB' : '#EFF6FF';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '0.66rem',
      fontWeight: 700,
      color,
      background: bg,
      border: `1px solid ${color}20`,
      marginTop: '4px',
      width: 'fit-content'
    }}>
      <Clock style={{ width: 11, height: 11, color }} />
      <span>{text}</span>
    </div>
  );
}

const IMAGE_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const OFFICE_FILE_EXTENSIONS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const EMBED_FILE_EXTENSIONS = ['txt', 'csv', 'json', 'xml', 'html', 'htm'];
const BLOB_PREVIEW_EXTENSIONS = ['pdf', ...IMAGE_FILE_EXTENSIONS, ...EMBED_FILE_EXTENSIONS];
const MIME_EXTENSION_MAP: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

function getEvidenceFileExtension(evidencia: any): string {
  const declaredType = evidencia?.tipoArchivo || evidencia?.tipo_archivo || evidencia?.tipo || '';
  const name = evidencia?.nombre || evidencia?.filename || '';
  const fromName = name.includes('.') ? name.split('.').pop() : '';
  const normalizedType = String(declaredType || '').replace(/;.*/, '').trim().toLowerCase();
  if (MIME_EXTENSION_MAP[normalizedType]) return MIME_EXTENSION_MAP[normalizedType];
  if (normalizedType.includes('/')) return MIME_EXTENSION_MAP[normalizedType] || String(fromName || '').toLowerCase();
  return String(declaredType || fromName || '').replace(/^\./, '').toLowerCase();
}

function getEvidenceFileUrl(evidencia: any): string {
  const rawValue = evidencia?.storageUrl || evidencia?.storage_url || evidencia?.storagePath || evidencia?.storage_path || evidencia?.url || '';
  const rawUrl = String(rawValue || '').trim();
  if (!rawUrl) return '';
  if (/^(https?:|blob:|data:)/i.test(rawUrl)) return rawUrl;

  const normalizedPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  const ptaServiceUrl = (MICROSERVICE_URLS as Record<string, string>).pta || '';

  if (API_MODE === 'direct' && ptaServiceUrl) {
    return `${ptaServiceUrl.replace(/\/$/, '')}${normalizedPath.replace(/^\/pta(?=\/uploads\/)/, '')}`;
  }

  const gatewayBaseUrl = getBaseURL().replace(/\/$/, '');
  if (normalizedPath.startsWith('/pta/uploads/')) return `${gatewayBaseUrl}${normalizedPath}`;
  if (normalizedPath.startsWith('/uploads/')) return `${gatewayBaseUrl}/pta${normalizedPath}`;
  return `${gatewayBaseUrl}${normalizedPath}`;
}

function canUseOfficeViewer(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  try {
    const { hostname } = new URL(url);
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return false;
  }
}

function getMimeTypeForExtension(extension: string): string {
  const mime = Object.entries(MIME_EXTENSION_MAP).find(([, ext]) => ext === extension)?.[0];
  return mime || 'application/octet-stream';
}

// ═══ SUB-COMPONENTS ═══════════════════════════════════════════════════

function ApprovalTracker({
  estado,
  componentesAprobacion = [],
  isMobile = false
}: {
  estado: string;
  componentesAprobacion?: any[];
  isMobile?: boolean;
}) {
  const getStatusForComponent = (compKeys: string[]) => {
    const approvals = componentesAprobacion.filter(c => compKeys.includes(c.componente));
    if (approvals.length === 0) return 'pendiente';
    if (approvals.some(a => a.estado === 'devuelto')) return 'devuelto';
    if (approvals.every(a => a.estado === 'aprobado')) return 'aprobado';
    return 'pendiente';
  };

  const steps = [
    {
      label: 'Docencia',
      icon: BookOpen,
      status: getStatusForComponent(['academica']),
      baseColor: '#4472C4'
    },
    {
      label: 'Investigación',
      icon: FlaskConical,
      status: getStatusForComponent(['investigacion']),
      baseColor: '#ED7D31'
    },
    {
      label: 'Extensión',
      icon: Globe,
      status: getStatusForComponent([
        'ext_capacitacion',
        'ext_procesos',
        'ext_fortalecimiento',
        'ext_gobierno',
        'ext_secciones'
      ]),
      baseColor: '#059669'
    },
    {
      label: 'Complementarias',
      icon: Briefcase,
      status: getStatusForComponent(['complementarias']),
      baseColor: '#FFC000'
    },
    {
      label: 'AADM',
      icon: Award,
      status: getStatusForComponent(['academicas_admin']),
      baseColor: '#6B21A8'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)',
      gap: isMobile ? '6px' : '10px',
      width: '100%',
      marginTop: '8px'
    }}>
      {steps.map(step => {
        const Icon = step.icon;
        let bg = '#F9FAFB';
        let borderColor = '#E5E7EB';
        let statusColor = '#9CA3AF';
        let statusLabel = 'Pendiente';
        let iconBg = '#F3F4F6';
        let iconColor = '#6B7280';

        if (step.status === 'aprobado') {
          bg = '#F0FDF4';
          borderColor = '#BBF7D0';
          statusColor = '#15803D';
          statusLabel = 'Aprobado';
          iconBg = '#DCFCE7';
          iconColor = '#16A34A';
        } else if (step.status === 'devuelto') {
          bg = '#FEF2F2';
          borderColor = '#FECACA';
          statusColor = '#B91C1C';
          statusLabel = 'Devuelto';
          iconBg = '#FEE2E2';
          iconColor = '#DC2626';
        } else {
          bg = '#FFFBEB';
          borderColor = '#FEF3C7';
          statusColor = '#B45309';
          statusLabel = 'Pendiente';
          iconBg = '#FEF3C7';
          iconColor = '#D97706';
        }

        return (
          <div
            key={step.label}
            style={{
              background: bg,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '6px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: iconColor,
              flexShrink: 0
            }}>
              <Icon style={{ width: '13px', height: '13px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#374151',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {step.label}
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 600,
                color: statusColor
              }}>
                {statusLabel}
              </span>
            </div>
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
  pta: initialPta, onClose, onAprobar, onDevolver, onConcertar, onVerReporte, onUpdated,
  puedeAprobar, nivelAprobacion, rolLabel, jefaturaTerritorialId, isSuperUser, actorId, actorNombre,
}, ref) => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'componentes' | 'historial' | 'concertacion' | 'evidencias'>('resumen');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  const [aprobacionesJefatura, setAprobacionesJefatura] = useState<any[]>([]);
  const [pta, setPta] = useState<any>(initialPta);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loadingEvidencias, setLoadingEvidencias] = useState(false);
  const [previewFile, setPreviewFile] = useState<EvidencePreviewFile | null>(null);

  const [componentesAprobacion, setComponentesAprobacion] = useState<any[]>([]);
  const [loadingComponentesAprobacion, setLoadingComponentesAprobacion] = useState(false);
  const [comentariosComponente, setComentariosComponente] = useState<Record<string, string>>({});
  const [procesandoAprobacionComponente, setProcesandoAprobacionComponente] = useState<Record<string, boolean>>({});
  const [evaluandoComponente, setEvaluandoComponente] = useState<Record<string, boolean>>({});

  // ═══ FEATURE 3: MODO EDICIÓN ═══
  const { rules } = usePTARules();
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Cargar evidencias al activar el tab
  useEffect(() => {
    if (activeTab === 'evidencias' && pta?.id) {
      setLoadingEvidencias(true);
      getEvidenciasPTA(pta.id).then(res => {
        if (res.success) setEvidencias(res.data || []);
        setLoadingEvidencias(false);
      }).catch(() => setLoadingEvidencias(false));
    }
  }, [activeTab, pta?.id]);

  // Cargar aprobaciones de componentes al inicializar/cambiar de PTA (eager loading para que sea instantáneo)
  useEffect(() => {
    if (pta?.id) {
      setLoadingComponentesAprobacion(true);
      getComponentesAprobacion(pta.id).then(res => {
        if (res.success) setComponentesAprobacion(res.data || []);
        setLoadingComponentesAprobacion(false);
      }).catch(() => setLoadingComponentesAprobacion(false));
    }
  }, [pta?.id]);

  const handleAprobarComponente = async (componente: string, estado: 'aprobado' | 'devuelto') => {
    const isComponentAuthorized = isSuperUser || (nivelAprobacion === COMPONENT_LEVELS[componente]);
    const canApprove = puedeAprobar && isPendiente && isComponentAuthorized;
    if (!canApprove) {
      toast.error('No tiene permisos para realizar esta acción');
      return;
    }
    const comentarios = comentariosComponente[componente] || '';
    if (estado === 'devuelto' && !comentarios.trim()) {
      toast.error('Debe ingresar un comentario para devolver el componente');
      return;
    }

    setProcesandoAprobacionComponente(prev => ({ ...prev, [componente]: true }));
    try {
      const res = await aprobarComponente(pta.id, {
        componente,
        estado,
        aprobadorId: actorId || 'revisor',
        aprobadorNombre: actorNombre || rolLabel || 'Revisor',
        aprobadorRol: rolLabel || 'Revisor',
        comentarios,
        scope: 'territorial',
        scopeId: rolLabel === 'Gestión Profesoral' ? 'Sede Nacional' : (pta.territorial || 'Sede Nacional'),
      });

      if (res.success) {
        toast.success(`Componente ${estado === 'aprobado' ? 'aprobado' : 'devuelto'} con éxito`);
        setComentariosComponente(prev => ({ ...prev, [componente]: '' }));
        setEvaluandoComponente(prev => ({ ...prev, [componente]: false }));
        
        const resList = await getComponentesAprobacion(pta.id);
        if (resList.success) {
          setComponentesAprobacion(resList.data || []);
        }

        if (res.data?.estadoGeneral) {
          const nuevoEstado = res.data.estadoGeneral;
          setPta((prev: any) => ({ ...prev, estado: nuevoEstado }));
          onUpdated?.({ ...pta, estado: nuevoEstado });
        }
      } else {
        toast.error(res.message || 'Error al actualizar el estado del componente');
      }
    } catch (err) {
      console.error('[mfe-pta] Error al aprobar componente:', err);
      toast.error('Ocurrió un error inesperado');
    } finally {
      setProcesandoAprobacionComponente(prev => ({ ...prev, [componente]: false }));
    }
  };

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
            capacitacion: (d.extension_actividades || []).filter((e: any) => e.seccion === 'capacitacion'),
            seleccion: (d.extension_actividades || []).filter((e: any) => e.seccion === 'seleccion'),
            fortalecimiento: (d.extension_actividades || []).filter((e: any) => e.seccion === 'fortalecimiento'),
            alto_gobierno: (d.extension_actividades || []).filter((e: any) => e.seccion === 'alto_gobierno'),
            otras: (d.extension_actividades || []).filter((e: any) => !['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'].includes(e.seccion)),
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
  const puedeAprobarNivelActual = puedeAprobar && puedeAprobarEstadoActual(pta.estado, nivelAprobacion);
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
    const sections = ['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno', 'otras'];
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

  const hProg = Number(pta.total_horas_programadas || 0);
  const horasProg = hProg > 0 ? hProg : (horasDocencia + horasInvestigacion + horasExtension + horasComplementarias + horasAcadAdmin);
  const pctCarga = horasDisp > 0 ? Math.round((horasProg / horasDisp) * 100) : 0;

  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [showDevolucionModal, setShowDevolucionModal] = useState(false);
  const [procesandoDevolucion, setProcesandoDevolucion] = useState(false);
  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
  const [showFirmaDigital, setShowFirmaDigital] = useState(false);

  useEffect(() => {
    return () => {
      if (previewFile?.objectUrl) URL.revokeObjectURL(previewFile.objectUrl);
    };
  }, [previewFile?.objectUrl]);

  const openEvidencePreview = async (evidencia: any) => {
    const sourceUrl = getEvidenceFileUrl(evidencia);
    if (!sourceUrl) return;
    const tipo = getEvidenceFileExtension(evidencia);
    const nombre = evidencia?.nombre || evidencia?.filename || 'Evidencia';

    if (!BLOB_PREVIEW_EXTENSIONS.includes(tipo)) {
      setPreviewFile({ sourceUrl, displayUrl: sourceUrl, nombre, tipo });
      return;
    }

    setPreviewFile({ sourceUrl, nombre, tipo, loading: true });

    try {
      const response = await fetch(sourceUrl, {
        credentials: 'include',
        headers: { Accept: getMimeTypeForExtension(tipo) },
      });

      if (!response.ok) {
        throw new Error(`No se pudo cargar el archivo (${response.status})`);
      }

      const blob = await response.blob();
      const typedBlob = blob.type ? blob : blob.slice(0, blob.size, getMimeTypeForExtension(tipo));
      const objectUrl = URL.createObjectURL(typedBlob);

      setPreviewFile(prev => {
        if (prev?.objectUrl) URL.revokeObjectURL(prev.objectUrl);
        return { sourceUrl, displayUrl: objectUrl, objectUrl, nombre, tipo, loading: false };
      });
    } catch (error) {
      console.error('[mfe-pta][preview evidencia] Error:', error);
      setPreviewFile({
        sourceUrl,
        displayUrl: sourceUrl,
        nombre,
        tipo,
        loading: false,
        error: 'No fue posible cargar la previsualización. Puedes abrir o descargar el archivo.',
      });
    }
  };

  const handleAprobar = async () => {
    if (!puedeAprobarNivelActual) {
      toast.error('No tienes permiso para aprobar este nivel del PTA');
      return;
    }

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

    if (!puedeAprobarNivelActual) {
      toast.error('No tienes permiso para aprobar este nivel del PTA');
      return;
    }

    const hayCambios = pta.camposModificadosPorRevisor &&
      Object.keys(pta.camposModificadosPorRevisor).length > 0;

    setProcesandoAprobacion(true);
    const res = await updatePTAStatus(pta.id, {
      accion: 'aprobar',
      camposModificados: hayCambios ? pta.camposModificadosPorRevisor : undefined,
      observaciones: `Aprobado con firma digital por ${rolLabel} — Certificado: ${firmaData.certificado_id}`,
      actorRol: rolLabel,
      actorId,
      actorTerritorialId: jefaturaTerritorialId,
      isSuperUser: isSuperUser || false,
      // Si el aprobador no tiene territorial asignada, aprobar todas las pendientes
      aprobarTodas: !jefaturaTerritorialId || isSuperUser || false,
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
    setPta((prev: any) => ({ ...prev, estado: res.nuevoEstado || res.data?.estado || prev.estado, motivoDevolucion }));
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
    { key: 'historial', label: 'Traza Componentes', icon: Activity, badge: historialEstados.length },
    { key: 'evidencias', label: 'Seguimiento', icon: FileText, badge: evidencias.length || undefined },
    ...(isConcertacion || concertacion.mensajes?.length > 0
      ? [{ key: 'concertacion', label: 'Concertación', icon: MessageSquare, badge: concertacion.mensajes?.length || 0 }]
      : []),
  ];

  const getSubcomponentHours = (seccionKey: string) => {
    const acts = pta.extension_actividades || initialPta.extension_actividades || [];
    if (seccionKey === 'otras') {
      return acts
        .filter((e: any) => !['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'].includes(e.seccion))
        .reduce((s: number, e: any) => s + (e.horas || 0), 0);
    }
    return acts
      .filter((e: any) => e.seccion === seccionKey)
      .reduce((s: number, e: any) => s + (e.horas || 0), 0);
  };

  const renderComponentCard = (key: string, label: string, IconComponent: any, color: string, subtitle: string, isSubComponent = false) => {
    const approval = componentesAprobacion.find(c => c.componente === key) || { estado: 'pendiente' };
    const estado = approval.estado || 'pendiente';
    const isEditing = estado !== 'aprobado' || !!evaluandoComponente[key];
    const isProcessing = !!procesandoAprobacionComponente[key];

    const isComponentAuthorized = isSuperUser || (nivelAprobacion === COMPONENT_LEVELS[key]);
    const canEvaluateComponent = puedeAprobar && isPendiente && isComponentAuthorized;

    const getAssignmentDate = () => {
      const transition = (pta.historialEstados || []).find(
        (h: any) => h.estadoNuevo === 'Pendiente Jefatura' || h.estado_nuevo === 'Pendiente Jefatura'
      );
      if (transition && transition.createdAt) {
        return new Date(transition.createdAt);
      }
      const dateStr = pta.updatedAt || pta.updated_at || pta.createdAt || pta.created_at;
      return dateStr ? new Date(dateStr) : new Date();
    };
    const assignmentDate = getAssignmentDate();

    // Curated gradients and borders for a premium dashboard aesthetic
    let cardBg = 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)';
    let cardBorder = '1px solid #E2E8F0';
    let badgeBg = 'rgba(245, 158, 11, 0.08)';
    let badgeColor = '#B45309';
    let badgeBorder = '1px solid rgba(245, 158, 11, 0.15)';
    let badgeText = 'Pendiente';
    let badgeIcon = Clock;
    let dotColor = '#F59E0B';
    let dotPulse = true;

    if (estado === 'aprobado') {
      cardBg = 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)';
      cardBorder = '1px solid #A7F3D0';
      badgeBg = 'rgba(16, 185, 129, 0.08)';
      badgeColor = '#065F46';
      badgeBorder = '1px solid rgba(16, 185, 129, 0.15)';
      badgeText = 'Aprobado';
      badgeIcon = CheckCircle;
      dotColor = '#10B981';
      dotPulse = false;
    } else if (estado === 'devuelto') {
      cardBg = 'linear-gradient(135deg, #FFFFFF 0%, #FEF2F2 100%)';
      cardBorder = '1px solid #FCA5A5';
      badgeBg = 'rgba(239, 68, 68, 0.08)';
      badgeColor = '#991B1B';
      badgeBorder = '1px solid rgba(239, 68, 68, 0.15)';
      badgeText = 'Devuelto';
      badgeIcon = RotateCcw;
      dotColor = '#EF4444';
      dotPulse = false;
    }

    if (!isComponentAuthorized) {
      cardBg = 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)';
      cardBorder = '1px solid #E2E8F0';
      badgeBg = 'rgba(148, 163, 184, 0.08)';
      badgeColor = '#64748B';
      badgeBorder = '1px solid rgba(148, 163, 184, 0.15)';
      dotColor = '#94A3B8';
      dotPulse = false;
      if (estado === 'aprobado') {
        badgeText = 'Aprobado (Lectura)';
        badgeIcon = CheckCircle;
      } else if (estado === 'devuelto') {
        badgeText = 'Devuelto (Lectura)';
        badgeIcon = RotateCcw;
      } else {
        badgeText = 'Pendiente (Lectura)';
        badgeIcon = Clock;
      }
    }

    const BadgeIcon = badgeIcon;

    return (
      <motion.div
        whileHover={isComponentAuthorized ? { y: -3, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)' } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          background: cardBg,
          borderRadius: 16,
          border: cardBorder,
          padding: isSubComponent ? '14px 16px' : '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
          marginBottom: isSubComponent ? 0 : 16,
          opacity: isComponentAuthorized ? 1 : 0.82,
          transition: 'border-color 0.25s ease, background 0.25s ease, opacity 0.25s ease',
        }}
      >
        {/* Left rounded color indicator bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 5,
          background: isComponentAuthorized
            ? `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)`
            : 'linear-gradient(180deg, #94A3B8 0%, #94A3B8CC 100%)',
          borderRadius: '4px 0 0 4px'
        }} />

        {/* Encabezado de la Tarjeta */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
          paddingLeft: 6,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 200, flex: 1 }}>
            <div style={{
              width: isSubComponent ? 34 : 42,
              height: isSubComponent ? 34 : 42,
              borderRadius: 10,
              background: isComponentAuthorized
                ? `linear-gradient(135deg, ${color}1A 0%, ${color}0D 100%)`
                : 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(148, 163, 184, 0.08) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isComponentAuthorized ? color : '#64748B',
              border: isComponentAuthorized ? `1px solid ${color}26` : '1px solid rgba(148, 163, 184, 0.25)',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}>
              <IconComponent style={{ width: isSubComponent ? 16 : 22, height: isSubComponent ? 16 : 22 }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h5 style={{
                margin: '0 0 3px 0',
                fontSize: isSubComponent ? '0.8rem' : '0.9rem',
                fontWeight: 800,
                color: '#1E293B',
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                {label}
              </h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>
                  {subtitle}
                </span>
                {estado !== 'aprobado' && (
                  <CountdownTimer assignmentDate={assignmentDate} isApproved={false} />
                )}
              </div>
            </div>
          </div>

          {/* Badge de Estado Premium */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: '99px',
            background: badgeBg,
            color: badgeColor,
            border: badgeBorder,
            fontSize: '0.68rem',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            height: 'fit-content',
            marginTop: 2
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block'
            }} className={dotPulse ? 'animate-pulse' : ''} />
            <BadgeIcon style={{ width: 12, height: 12, strokeWidth: 2.5 }} />
            {badgeText}
          </div>
        </div>

        {/* Detalle de Devolución Guardada */}
        {isEditing && approval.estado === 'devuelto' && (
          <div style={{
            background: 'rgba(254, 242, 242, 0.4)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.74rem',
            color: '#991B1B',
            border: '1px dashed #FCA5A5',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginLeft: 6
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.7rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#B91C1C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Devuelto Por</span>
                <strong style={{ color: '#7F1D1D' }}>{approval.aprobadorNombre || 'Revisor Autorizado'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#B91C1C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Rol</span>
                <strong style={{ color: '#7F1D1D' }}>{approval.aprobadorRol || 'Aprobador'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#B91C1C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Territorial</span>
                <strong style={{ color: '#7F1D1D' }}>{approval.scopeId || (approval.aprobadorRol === 'Gestión Profesoral' ? 'Sede Nacional' : (pta.territorial || 'Sede Nacional'))}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#B91C1C', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Fecha / Hora</span>
                <strong style={{ color: '#7F1D1D' }}>{approval.fechaAprobacion ? fmtFechaHora(approval.fechaAprobacion) : ''}</strong>
              </div>
            </div>
            {approval.comentarios && (
              <div style={{
                borderLeft: '3px solid #EF4444',
                padding: '10px 12px',
                background: 'white',
                borderRadius: '0 8px 8px 0',
                fontStyle: 'italic',
                color: '#374151',
                lineHeight: 1.4,
                border: '1px solid #FEE2E2',
                borderLeftWidth: 3,
                boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
              }}>
                "{approval.comentarios}"
              </div>
            )}
          </div>
        )}

        {/* Detalle de Aprobación Guardada */}
        {!isEditing && (
          <div style={{
            background: 'rgba(240, 253, 244, 0.4)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.74rem',
            color: '#15803D',
            border: '1px dashed #A7F3D0',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginLeft: 6
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.7rem' }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Aprobado Por</span>
                <strong style={{ color: '#14532D' }}>{approval.aprobadorNombre || 'Revisor Autorizado'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Rol</span>
                <strong style={{ color: '#14532D' }}>{approval.aprobadorRol || 'Aprobador'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Territorial</span>
                <strong style={{ color: '#14532D' }}>{approval.scopeId || (approval.aprobadorRol === 'Gestión Profesoral' ? 'Sede Nacional' : (pta.territorial || 'Sede Nacional'))}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 2 }}>Fecha / Hora</span>
                <strong style={{ color: '#14532D' }}>{approval.fechaAprobacion ? fmtFechaHora(approval.fechaAprobacion) : ''}</strong>
              </div>
            </div>
            {approval.fechaAprobacion && (
              <div style={{
                fontSize: '0.68rem',
                color: '#15803D',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 2,
                background: '#DCFCE7',
                padding: '4px 8px',
                borderRadius: 6,
                width: 'fit-content'
              }}>
                <CheckCircle style={{ width: 12, height: 12, color: '#16A34A' }} />
                Avalado a tiempo (duración de revisión: {getApprovalDuration(assignmentDate, new Date(approval.fechaAprobacion))})
              </div>
            )}
            {approval.comentarios && (
              <div style={{
                borderLeft: '3px solid #10B981',
                padding: '10px 12px',
                background: 'white',
                borderRadius: '0 8px 8px 0',
                fontStyle: 'italic',
                color: '#374151',
                lineHeight: 1.4,
                border: '1px solid #DCFCE7',
                borderLeftWidth: 3,
                boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
              }}>
                "{approval.comentarios}"
              </div>
            )}
            
            {canEvaluateComponent && (
              <button
                onClick={() => setEvaluandoComponente(prev => ({ ...prev, [key]: true }))}
                style={{
                  alignSelf: 'flex-end',
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '2px 0',
                  marginTop: 4,
                  textDecoration: 'underline',
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#1D4ED8'}
                onMouseLeave={e => e.currentTarget.style.color = '#2563EB'}
              >
                Volver a evaluar
              </button>
            )}
          </div>
        )}

        {/* Panel Interactivo de Aprobación */}
        {isEditing && canEvaluateComponent && (
          <div style={{
            marginLeft: 6,
            padding: '16px',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Shield style={{ width: 14, height: 14, color: '#003DA5' }} />
              Formulario de Revisión del Componente
            </div>
            <textarea
              value={comentariosComponente[key] || ''}
              onChange={e => setComentariosComponente(prev => ({ ...prev, [key]: e.target.value }))}
              placeholder="Escribe aquí observaciones sobre este componente (obligatorio si devuelves)..."
              disabled={isProcessing}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #CBD5E1',
                fontSize: '0.76rem',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                background: 'white',
                transition: 'all 0.2s ease',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#3B82F6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#CBD5E1';
                e.target.style.boxShadow = 'none';
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {estado === 'aprobado' && (
                <button
                  onClick={() => setEvaluandoComponente(prev => ({ ...prev, [key]: false }))}
                  disabled={isProcessing}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid #D1D5DB',
                    background: 'white',
                    color: '#4B5563',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => handleAprobarComponente(key, 'devuelto')}
                disabled={isProcessing}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid #FCA5A5',
                  background: '#FEF2F2',
                  color: '#B91C1C',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: isProcessing ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.05)'
                }}
                onMouseEnter={e => { if (!isProcessing) e.currentTarget.style.background = '#FEE2E2'; }}
                onMouseLeave={e => { if (!isProcessing) e.currentTarget.style.background = '#FEF2F2'; }}
              >
                {isProcessing ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <RotateCcw style={{ width: 13, height: 13 }} />}
                Devolver
              </button>
              <button
                onClick={() => handleAprobarComponente(key, 'aprobado')}
                disabled={isProcessing}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#059669',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: isProcessing ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(5, 150, 105, 0.1)'
                }}
                onMouseEnter={e => { if (!isProcessing) e.currentTarget.style.background = '#047857'; }}
                onMouseLeave={e => { if (!isProcessing) e.currentTarget.style.background = '#059669'; }}
              >
                {isProcessing ? <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> : <CheckCircle style={{ width: 13, height: 13 }} />}
                Aprobar
              </button>
            </div>
          </div>
        )}

        {/* Mensaje Informativo si no tiene permiso */}
        {isEditing && !canEvaluateComponent && isPendiente && (
          <div style={{
            marginLeft: 6,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
            color: '#64748B',
            fontSize: '0.72rem',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
            boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
          }}>
            <Lock style={{ width: 13, height: 13, color: '#94A3B8' }} />
            <span>Este componente es gestionado y concertado por {getResponsableRoleLabel(key)}.</span>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      ref={ref}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      style={{
        position: 'fixed', inset: 0, zIndex: 999, display: 'flex',
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
                  <Calendar style={{ width: 11, height: 11 }} /> {pta.periodo || '2025-2'}
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
            <ApprovalTracker estado={pta.estado} componentesAprobacion={componentesAprobacion} isMobile={isMobile} />
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
                  { label: 'Programa', value: pta.programa_academico || pta.programa || pta.programa_nombre || pta.programaAcademico || 'No especificado', icon: GraduationCap },
                  { label: 'Territorial', value: pta.territorial || pta.territorial_nombre || 'No especificada', icon: MapPin },
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
              {/* Edición completa */}
              {((puedeAprobarNivelActual && isPendiente) || (rolLabel === 'Docente' && ['Borrador', 'Devuelto', 'REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3'].includes(pta.estado))) && (
                <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 500 }}>
                    {rolLabel === 'Docente' ? 'Puede editar su PTA' : 'Como revisor puede editar el PTA completo antes de aprobar'}
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
                title="Componente Extensión (5 secciones)"
                icon={Globe}
                color="#059669"
              >
                {['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno', 'otras'].map(sec => {
                  const LABELS: Record<string, string> = {
                    capacitacion: 'Capacitación y Formación',
                    seleccion: 'Procesos de Selección',
                    fortalecimiento: 'Fortalecimiento Institucional',
                    alto_gobierno: 'Escuela de Alto Gobierno',
                    otras: 'Secciones y Actividades (Asesoría, Consultoría, etc.)',
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
                {!['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno', 'otras'].some(sec => (extension[sec] || []).length > 0) && (
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

          {/* ═══ TAB: Traza Componentes ═══ */}
          {activeTab === 'historial' && (
            <div>
              {/* Header de la pestaña */}
              <div style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                borderRadius: 16,
                padding: '18px 22px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.01)',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <h4 style={{ fontSize: '0.94rem', fontWeight: 900, color: '#0F172A', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.015em' }}>
                      <Shield style={{ width: 20, height: 20, color: '#003DA5', strokeWidth: 2.5 }} />
                      Control de Traza e Historial de Aprobaciones
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: '#64748B', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                      A continuación se muestra el estado de validación granular del Plan de Trabajo Académico. Cada componente y subcomponente de extensión debe ser revisado y aprobado individualmente por las áreas y revisores competentes.
                    </p>
                  </div>
                </div>

                {/* Progress Stats & Count Badges */}
                {(() => {
                  const total = 9;
                  const aprobados = componentesAprobacion.filter(c => c.estado === 'aprobado').length;
                  const devueltos = componentesAprobacion.filter(c => c.estado === 'devuelto').length;
                  const pendientes = total - aprobados - devueltos;
                  const pct = Math.round((aprobados / total) * 100);
                  return (
                    <div style={{ marginTop: 16 }}>
                      {/* Stats Badges Grid */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        <div style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: '#166534' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                          Aprobados: {aprobados}
                        </div>
                        {devueltos > 0 && (
                          <div style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: '#991B1B' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                            Devueltos: {devueltos}
                          </div>
                        )}
                        <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.68rem', fontWeight: 700, color: '#92400E' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} className="animate-pulse" />
                          Pendientes: {pendientes}
                        </div>
                      </div>

                      {/* Bar progress */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '0.72rem', fontWeight: 800 }}>
                        <span style={{ color: '#475569' }}>Progreso de Aprobación Granular</span>
                        <span style={{ color: aprobados === total ? '#059669' : '#003DA5' }}>
                          {aprobados} / {total} componentes ({pct}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E2E8F0', overflow: 'hidden', display: 'flex', gap: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: aprobados === total ? '#10B981' : 'linear-gradient(90deg, #003DA5, #2563EB)', borderRadius: 4, transition: 'width 0.4s ease-out' }} />
                        {devueltos > 0 && (
                          <div style={{ height: '100%', width: `${Math.round((devueltos / total) * 100)}%`, background: '#EF4444', borderRadius: 4 }} />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {loadingComponentesAprobacion ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                  <Loader2 style={{ width: 28, height: 28 }} className="animate-spin" />
                  <span style={{ marginTop: 8, fontSize: '0.78rem' }}>Cargando traza de componentes...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* 1. Docencia */}
                  {renderComponentCard(
                    'academica',
                    'Componente Docencia (Asignaturas)',
                    BookOpen,
                    PTA_COLORS.DOCENCIA,
                    `Contenido: ${asignaturas.length} asignatura(s) (${horasDocencia}h)`
                  )}

                  {/* 2. Investigación */}
                  {renderComponentCard(
                    'investigacion',
                    'Componente Investigación (Proyectos y Actividades)',
                    FlaskConical,
                    PTA_COLORS.INVESTIGACION,
                    `Contenido: ${(investigacion.proyectos?.length || 0)} proyecto(s), ${(investigacion.actividades?.length || 0)} actividad(es) (${horasInvestigacion}h)`
                  )}

                  {/* 3. Extensión Universitaria (Agrupada) */}
                  <motion.div
                    whileHover={{ y: -3, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    style={{
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
                      borderRadius: 16,
                      border: '1px solid #A7F3D0',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01)',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'border-color 0.25s ease, background 0.25s ease',
                    }}
                  >
                    {/* Indicador lateral de color */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: 0,
                      width: 5,
                      background: 'linear-gradient(180deg, #059669 0%, #059669CC 100%)',
                      borderRadius: '4px 0 0 4px'
                    }} />

                    {/* Encabezado del contenedor de Extensión */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingLeft: 6 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                        border: '1px solid rgba(5, 150, 105, 0.25)',
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      }}>
                        <Globe style={{ width: 22, height: 22 }} />
                      </div>
                      <div>
                        <h5 style={{ margin: '0 0 3px 0', fontSize: '0.9rem', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.01em' }}>
                          Componente Extensión Universitaria
                        </h5>
                        <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 700, background: 'rgba(5, 150, 105, 0.08)', padding: '2px 8px', borderRadius: 6 }}>
                          Total de Actividades de Extensión: {horasExtension}h
                        </span>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(5, 150, 105, 0.15)', margin: '6px 0' }} />

                    {/* Lista vertical responsiva de subcomponentes */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      paddingLeft: 6,
                    }}>
                      {/* Sub 1: Capacitación */}
                      {renderComponentCard(
                        'ext_capacitacion',
                        'Capacitación y Formación',
                        GraduationCap,
                        '#059669',
                        `Horas: ${getSubcomponentHours('capacitacion')}h`,
                        true
                      )}

                      {/* Sub 2: Procesos de Selección */}
                      {renderComponentCard(
                        'ext_procesos',
                        'Procesos de Selección',
                        Briefcase,
                        '#0284C7',
                        `Horas: ${getSubcomponentHours('seleccion')}h`,
                        true
                      )}

                      {/* Sub 3: Fortalecimiento Institucional */}
                      {renderComponentCard(
                        'ext_fortalecimiento',
                        'Fortalecimiento Institucional',
                        Building2,
                        '#7C3AED',
                        `Horas: ${getSubcomponentHours('fortalecimiento')}h`,
                        true
                      )}

                      {/* Sub 4: Escuela de Alto Gobierno */}
                      {renderComponentCard(
                        'ext_gobierno',
                        'Escuela de Alto Gobierno',
                        Shield,
                        '#B45309',
                        `Horas: ${getSubcomponentHours('alto_gobierno')}h`,
                        true
                      )}

                      {/* Sub 5: Secciones y Actividades */}
                      {renderComponentCard(
                        'ext_secciones',
                        'Secciones y Actividades',
                        Layers,
                        '#0E7490',
                        `Horas: ${getSubcomponentHours('otras')}h`,
                        true
                      )}
                    </div>
                  </motion.div>

                  {/* 4. Actividades Complementarias */}
                  {renderComponentCard(
                    'complementarias',
                    'Actividades Complementarias',
                    Briefcase,
                    PTA_COLORS.COMPLEMENTARIAS,
                    `Contenido: ${(complementarias.actividades?.length || 0)} actividad(es) (${horasComplementarias}h)`
                  )}

                  {/* 5. AADM */}
                  {renderComponentCard(
                    'academicas_admin',
                    'Actividades Académico-Administrativas (AADM)',
                    Award,
                    PTA_COLORS.ACAD_ADMIN,
                    `Contenido: ${(acadAdmin.actividades?.length || 0)} actividad(es) (${horasAcadAdmin}h)`
                  )}
                </div>
              )}

              {/* Historial de transiciones de estado completo al final (collapsible) */}
              <div style={{ marginTop: 24 }}>
                <SectionCollapsible
                  title={`Historial de Cambios de Estado del PTA`}
                  icon={Activity}
                  color="#6366F1"
                  count={historialEstados.length}
                  defaultOpen={false}
                >
                  {historialEstados.length > 0 ? (
                    <div style={{ position: 'relative', marginTop: 10 }}>
                      <div style={{ position: 'absolute', top: 14, bottom: 14, left: 15, width: 2, background: '#E0E7FF', borderRadius: 1 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(() => {
                          const displayOrder = [...historialEstados].reverse();
                          const snapshotNums = new Map<string, number>();
                          let reporteNum = 1;
                          displayOrder.forEach((s: any, i: number) => {
                            if (s.snapshotPta && typeof s.snapshotPta === 'object') {
                              snapshotNums.set(s.id || String(i), reporteNum++);
                            }
                          });
                          return displayOrder.map((step: any, idx: number) => {
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
                                <div style={{
                                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                  background: isLatest ? (hsc.color || '#4F46E5') : 'white',
                                  border: `2.5px solid ${isLatest ? (hsc.color || '#4F46E5') : '#CBD5E1'}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: isLatest ? `0 0 0 3px ${hsc.color}18` : 'none',
                                }}>
                                  <CheckCircle style={{ width: 14, height: 14, color: isLatest ? 'white' : '#94A3B8' }} />
                                </div>
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
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: '0.78rem' }}>
                      Sin transiciones registradas.
                    </div>
                  )}
                </SectionCollapsible>
              </div>
            </div>
          )}

          {/* ═══ TAB: Seguimiento / Evidencias ═══ */}
          {activeTab === 'evidencias' && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText style={{ width: 15, height: 15, color: '#059669' }} />
                Evidencias de Seguimiento ({evidencias.length})
              </h4>
              {loadingEvidencias ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: '0.82rem' }}>Cargando evidencias...</div>
              ) : evidencias.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <FileText style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6B7280' }}>Sin evidencias registradas</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>Las evidencias son subidas por el docente durante la ejecución del PTA.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {evidencias.map((ev: any) => {
                    const estadoColor = ev.estadoRevision === 'aprobado' ? '#059669' : ev.estadoRevision === 'rechazado' ? '#DC2626' : '#D97706';
                    const estadoBg = ev.estadoRevision === 'aprobado' ? '#D1FAE5' : ev.estadoRevision === 'rechazado' ? '#FEE2E2' : '#FEF3C7';
                    return (
                      <div key={ev.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.nombre}</p>
                            <p style={{ fontSize: '0.7rem', color: '#6B7280', margin: '2px 0 0', display: 'flex', gap: 8 }}>
                              {ev.componentePta && <span style={{ fontWeight: 600, color: '#4F46E5' }}>{ev.componentePta}</span>}
                              {ev.horasAvance > 0 && <span>{ev.horasAvance}h avance</span>}
                              {ev.subidoPor && <span>Por: {ev.subidoPor}</span>}
                            </p>
                            {ev.descripcion && <p style={{ fontSize: '0.7rem', color: '#6B7280', margin: '4px 0 0' }}>{ev.descripcion}</p>}
                            {ev.comentarioRevision && <p style={{ fontSize: '0.7rem', color: '#374151', margin: '4px 0 0', fontStyle: 'italic' }}>Obs: {ev.comentarioRevision}</p>}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: estadoBg, color: estadoColor }}>
                              {ev.estadoRevision || 'pendiente'}
                            </span>
                            {ev.estadoRevision === 'pendiente' && puedeAprobarNivelActual && (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  onClick={async () => {
                                    await revisarEvidenciaPTA(pta.id, ev.id, { decision: 'aprobado', revisado_por: actorId });
                                    setEvidencias(prev => prev.map(e => e.id === ev.id ? { ...e, estadoRevision: 'aprobado' } : e));
                                  }}
                                  style={{ padding: '2px 8px', borderRadius: 6, border: 'none', background: '#D1FAE5', color: '#059669', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                                >✓ Aprobar</button>
                                <button
                                  onClick={async () => {
                                    const obs = prompt('Motivo de rechazo:');
                                    if (obs === null) return;
                                    await revisarEvidenciaPTA(pta.id, ev.id, { decision: 'rechazado', revisado_por: actorId, observaciones: obs });
                                    setEvidencias(prev => prev.map(e => e.id === ev.id ? { ...e, estadoRevision: 'rechazado', comentarioRevision: obs } : e));
                                  }}
                                  style={{ padding: '2px 8px', borderRadius: 6, border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                                >✗ Rechazar</button>
                              </div>
                            )}
                          </div>
                        </div>
                        {(() => {
                          const fileUrl = getEvidenceFileUrl(ev);
                          if (!fileUrl) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => openEvidencePreview(ev)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                marginTop: 6, padding: 0, border: 'none', background: 'transparent',
                                fontSize: '0.68rem', color: '#2563EB', textDecoration: 'underline',
                                cursor: 'pointer', fontWeight: 600,
                              }}
                            >
                              <Eye style={{ width: 12, height: 12 }} />
                              Ver archivo
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })}
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
              {isPendiente && puedeAprobarNivelActual && (
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
                    onClick={handleAprobar}
                    disabled={procesandoAprobacion}
                    style={{
                      width: '100%', padding: '12px 18px', borderRadius: 10,
                      border: 'none', background: !procesandoAprobacion ? '#003DA5' : '#D1D5DB', color: 'white',
                      fontWeight: 700, fontSize: '0.88rem',
                      cursor: !procesandoAprobacion ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      opacity: 1,
                    }}
                  >
                    <CheckCircle style={{ width: 15, height: 15 }} />
                    {procesandoAprobacion ? 'Procesando...' : getNextStateLabel(pta.estado, !!(pta.camposModificadosPorRevisor && Object.keys(pta.camposModificadosPorRevisor).length > 0))}
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

              {isPendiente && puedeAprobarNivelActual && (
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
                    onClick={handleAprobar}
                    disabled={procesandoAprobacion}
                    style={{
                      padding: '7px 18px', borderRadius: 8,
                      border: 'none', background: !procesandoAprobacion ? '#003DA5' : '#D1D5DB', color: 'white',
                      fontWeight: 700, fontSize: '0.78rem',
                      cursor: !procesandoAprobacion ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <CheckCircle style={{ width: 13, height: 13 }} />
                    {procesandoAprobacion ? 'Procesando...' : getNextStateLabel(pta.estado, !!(pta.camposModificadosPorRevisor && Object.keys(pta.camposModificadosPorRevisor).length > 0))}
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

      {/* Modal de previsualización de evidencias */}
      {previewFile && createPortal(
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10002,
            background: 'rgba(17,24,39,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: isMobile ? 10 : 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16,
              width: '100%', maxWidth: 980, height: isMobile ? '92vh' : '88vh',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FileText style={{ width: 18, height: 18, color: '#003DA5', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {previewFile.nombre}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#6B7280' }}>
                    {previewFile.tipo ? previewFile.tipo.toUpperCase() : 'Archivo'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => window.open(previewFile.sourceUrl, '_blank', 'noopener,noreferrer')}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <ExternalLink style={{ width: 14, height: 14 }} />
                  Abrir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = previewFile.sourceUrl;
                    link.download = previewFile.nombre;
                    link.rel = 'noopener noreferrer';
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Download style={{ width: 14, height: 14 }} />
                  Descargar
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  aria-label="Cerrar previsualización"
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X style={{ width: 16, height: 16, color: '#6B7280' }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#F9FAFB', padding: isMobile ? 10 : 16 }}>
              {previewFile.loading ? (
                <div style={{ height: '100%', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6B7280', padding: 24 }}>
                  <div>
                    <Loader2 style={{ width: 34, height: 34, margin: '0 auto 12px', color: '#2563EB', animation: 'spin 1s linear infinite' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>Cargando archivo...</p>
                  </div>
                </div>
              ) : previewFile.error ? (
                <div style={{ height: '100%', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6B7280', padding: 24 }}>
                  <div>
                    <AlertTriangle style={{ width: 44, height: 44, margin: '0 auto 12px', color: '#D97706' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>{previewFile.error}</p>
                  </div>
                </div>
              ) : IMAGE_FILE_EXTENSIONS.includes(previewFile.tipo) && previewFile.displayUrl ? (
                <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={previewFile.displayUrl} alt={previewFile.nombre} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, objectFit: 'contain', background: 'white' }} />
                </div>
              ) : previewFile.tipo === 'pdf' && previewFile.displayUrl ? (
                <object data={previewFile.displayUrl} type="application/pdf" style={{ width: '100%', height: '100%', minHeight: 520, border: 'none', borderRadius: 8, background: 'white' }}>
                  <iframe src={previewFile.displayUrl} title={previewFile.nombre} style={{ width: '100%', height: '100%', minHeight: 520, border: 'none', borderRadius: 8, background: 'white' }} />
                </object>
              ) : OFFICE_FILE_EXTENSIONS.includes(previewFile.tipo) && canUseOfficeViewer(previewFile.sourceUrl) ? (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.sourceUrl)}`}
                  title={previewFile.nombre}
                  style={{ width: '100%', height: '100%', minHeight: 520, border: 'none', borderRadius: 8, background: 'white' }}
                />
              ) : EMBED_FILE_EXTENSIONS.includes(previewFile.tipo) && previewFile.displayUrl ? (
                <iframe src={previewFile.displayUrl} title={previewFile.nombre} style={{ width: '100%', height: '100%', minHeight: 520, border: 'none', borderRadius: 8, background: 'white' }} />
              ) : (
                <div style={{ height: '100%', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#6B7280', padding: 24 }}>
                  <div>
                    <FileText style={{ width: 54, height: 54, margin: '0 auto 12px', color: '#D1D5DB' }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>No se puede previsualizar este archivo en el navegador</p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: '#6B7280', maxWidth: 420 }}>
                      Puedes abrirlo o descargarlo desde las acciones del encabezado.
                    </p>
                  </div>
                </div>
              )}
            </div>
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
            border: '1.5px solid rgba(0,61,165,0.15)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,61,165,0.08)',
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column',
            padding: '0 0 24px 0',
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
                  // Notificar al módulo padre para que actualice la fila en la lista
                  onUpdated?.(res.data);
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
