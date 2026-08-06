/**
 * PTADetallePanelBackoffice — Panel de detalle completo estilo Notion slide-out
 *
 * Reemplaza el modal básico con un panel rico que muestra:
 * - Header con tracking bar multinivel (18 estados)
 * - Resumen visual de distribución de carga por componente
 * - Desglose de Docencia con fórmulas K15/L15 del Excel GTH-F081
 * - Investigación: proyectos y actividades
 * - Extensión: 4 secciones fijas (Capacitación, Selección, Fortalecimiento, Alto Gobierno)
 * - Actividades Complementarias
 * - Timeline interactivo del historial
 * - Mensajes de concertación (si aplica)
 * - Acciones de aprobación inline por nivel
 *
 * @version 1.0.0
 * @date 2026-03-13
 */

import React, { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react';
import { formatPtaPercentage, getPtaCompletionPercentage } from '../../utils/ptaCompletion';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, CheckCircle, XCircle, RotateCcw, Send, Clock, Eye, FileText,
  BookOpen, FlaskConical, Globe, Briefcase, Users, MessageSquare,
  ChevronDown, ChevronRight, ArrowRight, AlertTriangle, Calendar,
  MapPin, Award, Hash, Calculator, TrendingUp, Shield, Printer,
  GraduationCap, Scale, Zap, Target, Building2, Layers, BarChart3, Loader2,
  Activity, Download, ExternalLink, Lock, ShieldCheck
} from 'lucide-react';
import { usePTARules } from './ConfiguracionReglasPTA';
import { usePermisosPTA, usePermisosPTAGranulares } from './PermisosPTAContext';
import { toast } from 'sonner';
import { getPTAById, updatePTAStatus, guardarFirmaDigitalPTA, getAprobacionesJefatura, getEvidenciasPTA, revisarEvidenciaPTA, getComponentesAprobacion, aprobarComponente, getComponentesRevision, revisarComponente, requestPTAFirmaAprobadorCode, verifyPTAFirmaDocenteCode } from '../../services/api/ptaApi';
import { getBaseURL } from '../../../../shell/src/services/api';
import { API_MODE, MICROSERVICE_URLS } from '../../../../shell/src/config/environment';
import { FirmaDigitalPTA } from './FirmaDigitalPTA';
import type { FirmaData } from './FirmaDigitalPTA';
import { ReporteIndividualPTA } from './ReporteIndividualPTA';
import { PTA_COLORS } from './shared/ptaColors';
import { HierarchySelectionSummary } from './shared/HierarchySelectionSummary';
import { getPtaStatusVisual } from './shared/ptaStatusVisuals';
import { resolvePtaFileUrl } from './shared/ptaFiles';
import {
  PTA_COMPONENT_KEYS,
  PTA_COMPONENT_LEVELS,
  PTA_COMPONENT_PERMISSION,
  PTA_APPROVE_ALL_PERMISSION,
  PTA_EXTENSION_COMPONENT_KEYS,
  type PTAComponentKey,
  componentKeysForApprovalLevel,
  splitComplementarias,
  isEvidenciaAuthorized,
  PTA_COMPONENT_REVIEW_PERMISSION,
  PTA_REVIEW_ALL_PERMISSION,
  REVIEW_SUBSECCION_LABEL,
  REVIEW_SUBSECCIONES_BY_COMPONENT,
  type PTAReviewSubseccionKey,
} from './shared/ptaComponentPermissions';
import { getReviewStatusVisual } from './shared/ptaComponentReviewVisuals';

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

const COMPONENT_LEVELS = PTA_COMPONENT_LEVELS as Record<string, number>;

// Permiso granular específico requerido para aprobar cada componente.
// Coincide con auth.permission creados en la migración 327.
const COMPONENT_PERMISSION = PTA_COMPONENT_PERMISSION as Record<string, string>;

function getResponsableRoleLabel(key: string): string {
  const lvl = COMPONENT_LEVELS[key];
  if (lvl === 1) return 'Jefatura de Programa';
  if (lvl === 2) return 'Decanatura';
  if (lvl === 3) return 'Gestión Profesoral';
  return 'Revisor responsable';
}

function getStatusConfig(estado: string) {
  const visual = getPtaStatusVisual(estado);
  const found = FLUJO_COMPLETO.find(f => f.key === estado);
  return {
    key: estado,
    label: found?.label || visual.label,
    short: found?.short || visual.label.substring(0, 5),
    color: visual.color,
    bg: visual.bg,
    border: visual.border,
  };
}

function getNextStateLabel(current: string, hayModificaciones = false): string {
  const currentKey = String(current || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (['PENDIENTE_JEFATURA', 'PENDIENTE_DECANATURA', 'PENDIENTE_GESTION_PROFESORAL', 'PENDIENTE_APROBACION'].includes(currentKey)) {
    return hayModificaciones ? 'Aprobar con cambios' : 'Registrar aprobacion';
  }
  if (hayModificaciones) {
    if (current === 'Pendiente Jefatura') return 'Aprobar con cambios → Docente revisa';
    if (current === 'Pendiente Decanatura') return 'Aprobar con cambios → Docente revisa';
    if (current === 'Pendiente Gestión Profesoral') return 'Aprobar con cambios → Docente revisa';
  }
  if (current === 'Pendiente Jefatura') return 'Aprobar → Avanzar a Decanatura';
  if (current === 'Pendiente Decanatura') return 'Aprobar → Avanzar a G. Profesoral';
  if (current === 'Pendiente Gestión Profesoral') return 'Aprobar PTA (Firma Digital)';
  if (current === 'PENDIENTE_APROBACION') return 'Enviar a Jefatura';
  return 'Aprobar';
}

const ESTADO_NIVEL_APROBACION: Record<string, number> = {
  'PENDIENTE_APROBACION': 1,
  'Pendiente Jefatura': 1,
  'Pendiente Decanatura': 2,
  'Pendiente Gestión Profesoral': 3,
};

function puedeAprobarEstadoActual(estado: string, nivelUsuario: number, isSuperUser = false): boolean {
  if (isSuperUser) return true;
  if (['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'PENDIENTE_APROBACION'].includes(estado)) {
    return nivelUsuario > 0;
  }
  const nivelRequerido = ESTADO_NIVEL_APROBACION[estado];
  if (!nivelRequerido) return false;
  return nivelUsuario === nivelRequerido;
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
  isMobile = false,
  visibleComponentKeys,
}: {
  estado: string;
  componentesAprobacion?: any[];
  isMobile?: boolean;
  visibleComponentKeys?: string[];
}) {
  const visibleSet = visibleComponentKeys?.length ? new Set(visibleComponentKeys) : null;
  const getStatusForComponent = (compKeys: string[]) => {
    const scopedKeys = visibleSet ? compKeys.filter(key => visibleSet.has(key)) : compKeys;
    if (scopedKeys.length === 0) return 'hidden';
    const approvals = componentesAprobacion.filter(c => scopedKeys.includes(c.componente));
    if (approvals.length === 0) return 'pendiente';
    if (approvals.some(a => a.estado === 'devuelto')) return 'devuelto';
    if (approvals.every(a => a.estado === 'aprobado')) {
      // Un componente SIN actividades lo auto-aprueba el backend con
      // aprobadorNombre='Sistema'. Mostrarlo como "Aprobado" en verde da a
      // entender que alguien lo avaló; debe verse en gris como "No aplica".
      const todoAutoAprobado = approvals.every(a => a.aprobadorNombre === 'Sistema');
      return todoAutoAprobado ? 'no_aplica' : 'aprobado';
    }
    return 'pendiente';
  };

  const steps = [
    {
      label: 'Docencia',
      icon: BookOpen,
      status: getStatusForComponent(['academica_pregrado', 'academica_posgrado', 'academica_territorial']),
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
        'ext_gobierno'
      ]),
      baseColor: '#059669'
    },
    {
      // Complementarias incluye la sub-sección Académico-Administrativa (AADM) y se
      // enruta en 3 componentes reales según programa asociado (sin programa /
      // pregrado / posgrado), igual patrón que Docencia arriba.
      label: 'Complementarias',
      icon: Briefcase,
      status: getStatusForComponent(['complementarias', 'complementarias_pregrado', 'complementarias_posgrado']),
      baseColor: '#FFC000'
    }
  ].filter(step => step.status !== 'hidden');

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
        } else if (step.status === 'no_aplica') {
          // Componente sin actividades: el backend lo auto-aprueba para no
          // bloquear el flujo, pero para el usuario NO es un aval — se muestra
          // en gris como "No aplica".
          bg = '#F9FAFB';
          borderColor = '#E5E7EB';
          statusColor = '#9CA3AF';
          statusLabel = 'No aplica';
          iconBg = '#F3F4F6';
          iconColor = '#9CA3AF';
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
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          padding: '3px 9px', borderRadius: 999,
          background: open ? `${color}15` : '#F3F4F6',
          color: open ? color : '#4B5563',
          fontSize: '0.66rem', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          {open ? 'Ocultar' : 'Desplegar'}
          <ChevronDown style={{
            width: 12, height: 12,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s',
          }} />
        </span>
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

function normalizeExtensionSectionForDisplay(section: unknown): string {
  const key = String(section || '');
  if (key === 'laboratorio_innovacion' || key === 'investigacion_aplicada') return 'fortalecimiento';
  if (['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'].includes(key)) return key;
  return 'otras';
}

function normalizePTAData(d: any, fallbackPta: any = {}) {
  if (!d) return d;
  const extensionActs = (d.extension_actividades || []).map((e: any) => ({
    ...e,
    seccion: normalizeExtensionSectionForDisplay(e.seccion),
  }));
  return {
    ...fallbackPta,
    ...d,
    extension_actividades: extensionActs,
    investigacion: {
      proyectos: (d.investigacion_proyecto?.nombre || d.investigacion_proyecto?.rol) ? [d.investigacion_proyecto] : [],
      actividades: d.investigacion_actividades || [],
    },
    extension: {
      capacitacion: extensionActs.filter((e: any) => e.seccion === 'capacitacion'),
      seleccion: extensionActs.filter((e: any) => e.seccion === 'seleccion'),
      fortalecimiento: extensionActs.filter((e: any) => e.seccion === 'fortalecimiento'),
      alto_gobierno: extensionActs.filter((e: any) => e.seccion === 'alto_gobierno'),
      otras: extensionActs.filter((e: any) => e.seccion === 'otras'),
    },
    complementarias: { actividades: d.complementarias || [] },
    acad_admin: { actividades: d.academico_admin || [] },
  };
}

// ═══ MAIN COMPONENT ═══════════════════════════════════════════════════

export const PTADetallePanelBackoffice = React.forwardRef<HTMLDivElement, PTADetallePanelProps>(({
  pta: initialPta, onClose, onAprobar, onDevolver, onConcertar, onVerReporte, onUpdated,
  puedeAprobar, nivelAprobacion, rolLabel, jefaturaTerritorialId, isSuperUser, actorId, actorNombre,
}, ref) => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'componentes' | 'concertacion' | 'evidencias' | 'trazabilidad'>('resumen');
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

  // ── Etapa de Revisión (preaprobación) ─────────────────────────────────────
  const [componentesRevision, setComponentesRevision] = useState<any[]>([]);
  // ¿Se pudo cargar el estado de la etapa de Revisión? Si el GET falla, NO se puede
  // asumir que no hay revisiones pendientes (fail-closed): un array vacío por error
  // es indistinguible de "este componente no requiere revisión", y dar por buena esa
  // ambigüedad habilitaba "Aprobar" saltándose la etapa (el backend igual lo rechaza,
  // dejando la UI inconsistente).
  const [revisionCargada, setRevisionCargada] = useState(false);
  const [comentariosRevision, setComentariosRevision] = useState<Record<string, string>>({});
  const [procesandoRevision, setProcesandoRevision] = useState<Record<string, boolean>>({});

  const { rules } = usePTARules();

  // ── Autorización por COMPONENTE basada en permisos granulares (pta.approve.*) ──
  // Si el usuario tiene algún permiso granular pta.approve.*, la autorización se basa
  // EXCLUSIVAMENTE en esos permisos (cada componente exige el suyo). Si no tiene ninguno,
  // se mantiene la compatibilidad con el sistema legacy de niveles (nivelAprobacion).
  const { permisos: permisosPta } = usePermisosPTA();
  const { puede: puedePerm } = usePermisosPTAGranulares();
  const apruebaTodo = useMemo(() => puedePerm(PTA_APPROVE_ALL_PERMISSION), [puedePerm]);
  const tieneAlgunPermisoComponente = useMemo(
    () => apruebaTodo || Object.values(COMPONENT_PERMISSION).some(p => puedePerm(p)),
    [apruebaTodo, puedePerm],
  );
  const visibleComponentKeys = useMemo<PTAComponentKey[]>(() => {
    if (apruebaTodo) return [...PTA_COMPONENT_KEYS];
    const granularKeys = PTA_COMPONENT_KEYS.filter(key => puedePerm(COMPONENT_PERMISSION[key]));
    if (granularKeys.length > 0) return granularKeys;
    const configuredKeys = (permisosPta.componentesAprobables || [])
      .filter((key): key is PTAComponentKey => PTA_COMPONENT_KEYS.includes(key as PTAComponentKey));
    if (configuredKeys.length > 0) return configuredKeys;
    return componentKeysForApprovalLevel(nivelAprobacion);
  }, [isSuperUser, apruebaTodo, puedePerm, permisosPta.componentesAprobables, nivelAprobacion]);
  const visibleComponentKeySet = useMemo(() => new Set<string>(visibleComponentKeys), [visibleComponentKeys]);
  const isComponentAuthorized = useCallback((key: string): boolean => {
    if (apruebaTodo) return true;
    if (visibleComponentKeySet.size > 0) return visibleComponentKeySet.has(key);
    const perm = COMPONENT_PERMISSION[key];
    if (tieneAlgunPermisoComponente) {
      // El usuario opera bajo el esquema granular: solo aprueba el componente de su permiso.
      return !!perm && puedePerm(perm);
    }
    // Fallback legacy por nivel (compatibilidad con roles sin permisos granulares).
    return nivelAprobacion === COMPONENT_LEVELS[key];
  }, [isSuperUser, apruebaTodo, visibleComponentKeySet, tieneAlgunPermisoComponente, puedePerm, nivelAprobacion]);

  // ── Etapa de Revisión: autorización por subsección (pta.review.*) ─────────
  // Independiente de isComponentAuthorized (aprobación): un usuario puede tener
  // permiso de revisión sin tener el de aprobación, y viceversa.
  const revisaTodo = useMemo(
    () => isSuperUser || puedePerm(PTA_REVIEW_ALL_PERMISSION),
    [isSuperUser, puedePerm],
  );
  // ¿Tiene el usuario algún permiso granular pta.review.*? Se usa solo para decidir
  // la etiqueta de la pestaña "Concertación" (ver TABS más abajo), independiente de
  // isSubseccionAuthorizedToReview que evalúa componente/subsección puntuales.
  const tieneAlgunPermisoRevision = useMemo(
    () => revisaTodo || Object.values(PTA_COMPONENT_REVIEW_PERMISSION).some(p => puedePerm(p)),
    [revisaTodo, puedePerm],
  );
  const isSubseccionAuthorizedToReview = useCallback((key: string, subseccion: string): boolean => {
    if (revisaTodo) return true;
    const perm = PTA_COMPONENT_REVIEW_PERMISSION[`${key}:${subseccion}`];
    return !!perm && puedePerm(perm);
  }, [revisaTodo, puedePerm]);

  /** Filas de revisión requeridas para un componente (ya vienen filtradas por el backend). */
  const subseccionesRevision = useCallback(
    (key: string) => componentesRevision.filter(r => r.componente === key),
    [componentesRevision],
  );
  /** true si no hay revisiones pendientes para el componente (o no requiere ninguna).
   *  Mientras no se haya podido cargar el estado de revisión se responde `false`
   *  (fail-closed), para no habilitar la aprobación por un array vacío accidental. */
  const todasRevisionesCompletas = useCallback(
    (key: string) => revisionCargada
      && subseccionesRevision(key).every(r => (r.estado || 'pendiente') === 'revisado'),
    [subseccionesRevision, revisionCargada],
  );

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

  // Cargar el estado de la etapa de Revisión (preaprobación) por componente/subsección.
  useEffect(() => {
    if (!pta?.id) return;
    setRevisionCargada(false);
    getComponentesRevision(pta.id).then(res => {
      if (res.success) {
        setComponentesRevision(res.data || []);
        setRevisionCargada(true);
      } else {
        // Sin dato fiable: se mantiene revisionCargada=false para bloquear la
        // aprobación en vez de asumir "sin revisiones pendientes".
        setComponentesRevision([]);
        console.warn('[PTA] No se pudo cargar el estado de revisión por componente.');
      }
    }).catch((err) => {
      setComponentesRevision([]);
      console.warn('[PTA] Error cargando el estado de revisión por componente:', err?.message || err);
    });
  }, [pta?.id]);

  // Etiquetas legibles de componente para el correo/modal de firma OTP.
  const COMPONENTE_LABELS_FIRMA: Record<string, string> = {
    academica_pregrado: 'Docencia (Pregrado)', academica_posgrado: 'Docencia (Posgrado)', academica_territorial: 'Docencia (Territorial)',
    investigacion: 'Investigación',
    ext_capacitacion: 'Ext. Capacitación', ext_procesos: 'Ext. Procesos Selección',
    ext_fortalecimiento: 'Ext. Fortalecimiento', ext_gobierno: 'Ext. Alto Gobierno',
    complementarias: 'Complementarias', complementarias_pregrado: 'Complementarias (Pregrado)', complementarias_posgrado: 'Complementarias (Posgrado)',
    academicas_admin: 'Acad. Admin.',
  };

  const handleAprobarComponente = async (componente: string, estado: 'aprobado' | 'devuelto') => {
    const canApprove = puedeAprobar && puedeActuarSobreComponentes && isComponentAuthorized(componente);
    if (!canApprove) {
      toast.error('No tiene permisos para realizar esta acción');
      return;
    }
    const comentarios = comentariosComponente[componente] || '';
    if (estado === 'devuelto' && !comentarios.trim()) {
      toast.error('Debe ingresar un comentario para devolver el componente');
      return;
    }

    // Aprobar un componente exige firma con OTP: se envía el código al correo del
    // aprobador y, al validarlo en el modal, se ejecuta la aprobación real.
    // (La devolución no requiere OTP.)
    if (estado === 'aprobado') {
      const label = COMPONENTE_LABELS_FIRMA[componente] || componente;
      const ok = await solicitarOtpFirmaAprobador(`Aprobación de componente: ${label}`);
      if (!ok) return;
      setFirmaAccion({ tipo: 'componente', componente });
      setShowFirmaDigital(true);
      return;
    }

    await ejecutarAprobacionComponente(componente, estado);
  };

  // Ejecuta la aprobación/devolución real del componente contra el backend.
  const ejecutarAprobacionComponente = async (componente: string, estado: 'aprobado' | 'devuelto') => {
    const comentarios = comentariosComponente[componente] || '';
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

  // Etapa de Revisión: marca una subsección como 'revisado' o 'devuelto'.
  // Marcar como REVISADO exige firma con OTP igual que la aprobación final, para
  // que quede trazabilidad verificada de quién revisó (el revisor queda registrado
  // en PtaComponentReview.revisorId/Nombre/Rol + historial). La DEVOLUCIÓN no pide
  // OTP: la firma respalda el aval, no el rechazo (mismo criterio que aprobar).
  const handleRevisarComponente = async (componente: string, subseccion: string, estado: 'revisado' | 'devuelto') => {
    const canReview = puedeActuarSobreComponentes && isSubseccionAuthorizedToReview(componente, subseccion);
    if (!canReview) {
      toast.error('No tiene permisos para realizar esta acción');
      return;
    }
    const claveComentario = `${componente}:${subseccion}`;
    const comentarios = comentariosRevision[claveComentario] || '';
    if (estado === 'devuelto' && !comentarios.trim()) {
      toast.error('Debe ingresar un comentario para devolver el componente en revisión');
      return;
    }

    if (estado === 'revisado') {
      const label = COMPONENTE_LABELS_FIRMA[componente] || componente;
      const sufijoSub = subseccion && subseccion !== 'general'
        ? ` (${REVIEW_SUBSECCION_LABEL[subseccion as PTAReviewSubseccionKey] || subseccion})`
        : '';
      const ok = await solicitarOtpFirmaAprobador(`Revisión de componente: ${label}${sufijoSub}`);
      if (!ok) return;
      setFirmaAccion({ tipo: 'revision', componente, subseccion });
      setShowFirmaDigital(true);
      return;
    }

    await ejecutarRevisionComponente(componente, subseccion, estado);
  };

  // Ejecuta la revisión/devolución real de la subsección contra el backend.
  const ejecutarRevisionComponente = async (componente: string, subseccion: string, estado: 'revisado' | 'devuelto') => {
    const claveComentario = `${componente}:${subseccion}`;
    const comentarios = comentariosRevision[claveComentario] || '';

    const rowKey = claveComentario;
    setProcesandoRevision(prev => ({ ...prev, [rowKey]: true }));
    try {
      const res = await revisarComponente(pta.id, {
        componente,
        subseccion,
        estado,
        revisorId: actorId || 'revisor',
        revisorNombre: actorNombre || rolLabel || 'Revisor',
        revisorRol: rolLabel || 'Revisor',
        comentarios,
      });

      if (res.success) {
        toast.success(`Revisión ${estado === 'revisado' ? 'registrada' : 'devuelta'} con éxito`);
        setComentariosRevision(prev => ({ ...prev, [claveComentario]: '' }));

        const [resRevision, resAprobacion] = await Promise.all([
          getComponentesRevision(pta.id),
          getComponentesAprobacion(pta.id),
        ]);
        if (resRevision.success) setComponentesRevision(resRevision.data || []);
        if (resAprobacion.success) setComponentesAprobacion(resAprobacion.data || []);

        if (res.data?.estadoGeneral) {
          const nuevoEstado = res.data.estadoGeneral;
          setPta((prev: any) => ({ ...prev, estado: nuevoEstado }));
          onUpdated?.({ ...pta, estado: nuevoEstado });
        }
      } else {
        toast.error(res.message || 'Error al actualizar la revisión del componente');
      }
    } catch (err) {
      console.error('[mfe-pta] Error al revisar componente:', err);
      toast.error('Ocurrió un error inesperado');
    } finally {
      setProcesandoRevision(prev => ({ ...prev, [rowKey]: false }));
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
        setPta(normalizePTAData(res.data, initialPta));
      }
      setLoadingExtras(false);
    });
  }, [initialPta?.id]);

  const sc = getStatusConfig(pta.estado);
  const isPendiente = ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'PENDIENTE_APROBACION'].includes(pta.estado);
  // Estados en los que puede haber componentes individuales aún pendientes de
  // aprobar/concertar aunque el estado AGREGADO del PTA ya no sea "Pendiente X" (p.ej.
  // quedó en REVISION_DOCENTE_N1 porque se devolvió un componente, pero otro sigue
  // pendiente para un revisor distinto). Se usa para las acciones POR COMPONENTE, para
  // que puedan resolverse de forma simultánea e independiente sin esperarse entre sí.
  const ESTADOS_ACCIONABLES_COMPONENTE = ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'PENDIENTE_APROBACION', 'REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3'];
  const puedeActuarSobreComponentes = ESTADOS_ACCIONABLES_COMPONENTE.includes(pta.estado);
  const hayComponentesPendientesParaMi = puedeActuarSobreComponentes &&
    componentesAprobacion.some(c => isComponentAuthorized(c.componente) && (c.estado || 'pendiente') === 'pendiente');
  const esReaprobacionEdicionParcial = componentesAprobacion.some(c =>
    c.scope === 'solicitud_edicion'
    && ['pendiente', 'devuelto'].includes(String(c.estado || '').toLowerCase())
  );
  const puedeAprobarNivelActual = !esReaprobacionEdicionParcial
    && puedeAprobar
    && puedeAprobarEstadoActual(pta.estado, nivelAprobacion, isSuperUser);
  // Revisión de evidencias del tab Seguimiento: modelo POR COMPONENTE. Cada evidencia
  // se puede ver/aprobar/rechazar solo si el usuario está autorizado para el componente
  // (o la sección de extensión) al que pertenece. Superuser y pta.approve.all quedan
  // cubiertos porque isComponentAuthorized retorna true para todos en ese caso.
  // Autorización de evidencias basada EXCLUSIVAMENTE en los 7 permisos granulares
  // pta.approve.<componente> (+ pta.approve.all y superuser). No usa los fallbacks por
  // nivel/rol de isComponentAuthorized, para que el filtrado sea estrictamente por permiso.
  const isEvidenciaComponentAuthorized = useCallback(
    (key: PTAComponentKey) => apruebaTodo || puedePerm(PTA_COMPONENT_PERMISSION[key]),
    [apruebaTodo, puedePerm],
  );
  const puedeRevisarEvidencia = useCallback(
    (ev: any) => isEvidenciaAuthorized(ev, isEvidenciaComponentAuthorized),
    [isEvidenciaComponentAuthorized],
  );
  // Solo se listan las evidencias del/los componente(s) que el usuario está autorizado
  // a revisar. Superuser / pta.approve.all ven todas (isComponentAuthorized retorna true).
  const evidenciasVisibles = useMemo(
    () => evidencias.filter(ev => puedeRevisarEvidencia(ev)),
    [evidencias, puedeRevisarEvidencia],
  );
  const isConcertacion = pta.estado === 'EN_CONCERTACION';

  const horasDisp = pta.horas_asignables ?? pta.horas_a_programar ?? 0;
  const asignaturas = Array.isArray(pta.asignaturas) ? pta.asignaturas : [];
  
  const investigacion = {
    proyectos: pta.investigacion_proyecto ? [pta.investigacion_proyecto] : (pta.investigacion?.proyectos || []),
    actividades: Array.isArray(pta.investigacion_actividades) ? pta.investigacion_actividades : (pta.investigacion?.actividades || [])
  };
  
  const extActsRaw = (Array.isArray(pta.extension_actividades) ? pta.extension_actividades : []).map((a: any) => ({
    ...a,
    seccion: normalizeExtensionSectionForDisplay(a.seccion),
  }));
  const extension = {
    ...(pta.extension || {}),
    capacitacion: extActsRaw.filter((a: any) => a.seccion === 'capacitacion'),
    seleccion: extActsRaw.filter((a: any) => a.seccion === 'seleccion'),
    fortalecimiento: extActsRaw.filter((a: any) => a.seccion === 'fortalecimiento'),
    alto_gobierno: extActsRaw.filter((a: any) => a.seccion === 'alto_gobierno'),
    otras: extActsRaw.filter((a: any) => a.seccion === 'otras'),
  };
  
  // AADM es una sección de Complementarias. `splitComplementarias` separa ambas
  // secciones y fusiona data legacy, evitando doble conteo.
  const _compSplit = splitComplementarias(pta);
  // Todo es "Actividades Complementarias": ambas secciones (a la docencia + académico-
  // administrativas) se muestran juntas como un solo componente.
  const complementarias = { actividades: [..._compSplit.docencia, ..._compSplit.aadm] };
  const acadAdmin = { actividades: _compSplit.aadm };
  const tieneTotalidadAcadAdmin = _compSplit.aadm.some((a: any) => a?.consumeTotalidad === true);
  const programaResumen = pta.programa_academico || pta.programa || pta.programa_nombre || pta.programaAcademico;
  const territorialResumen = pta.territorial || pta.territorial_nombre;
  const historial = pta.historial || [];
  const concertacion = pta.concertacion || {};

  const horasDocencia = useMemo(() => {
    if (pta.horas_docencia !== undefined) return pta.horas_docencia;
    return asignaturas.reduce((sum: number, a: any) => sum + (a.total_horas || a.horas || 0), 0);
  }, [pta, asignaturas]);

  // Docencia se divide en TRES componentes de aprobación (Pregrado / Posgrado /
  // Territorial, igual que Extensión se divide en 4 direcciones).
  // `componente_docencia` viene anotado por el backend (getPTAById), que ya resolvió
  // la territorialidad (auth.seccionales) y el nivel (programa.tipo). La
  // territorialidad manda: una asignatura dictada en una Dirección Territorial va a
  // 'academica_territorial' aunque sea de pregrado o posgrado.
  // Fallback para datos legacy sin anotar: se usa nivel_programa y, si tampoco está,
  // se cuenta como pregrado (mismo criterio que el backend).
  const componenteDeAsignatura = useCallback((a: any): string => {
    if (a?.componente_docencia) return String(a.componente_docencia);
    return a?.nivel_programa === 'posgrado' ? 'academica_posgrado' : 'academica_pregrado';
  }, []);
  const asignaturasPregrado = useMemo(
    () => asignaturas.filter((a: any) => componenteDeAsignatura(a) === 'academica_pregrado'),
    [asignaturas, componenteDeAsignatura],
  );
  const asignaturasPosgrado = useMemo(
    () => asignaturas.filter((a: any) => componenteDeAsignatura(a) === 'academica_posgrado'),
    [asignaturas, componenteDeAsignatura],
  );
  // Docencia territorial: si el usuario actúa SOLO con alcance territorial, únicamente
  // debe ver las asignaturas de su propia seccional (un aprobador de Antioquia no debe
  // ver ni actuar sobre las de Chocó o Huila). El backend lo valida igual al
  // revisar/aprobar; esto alinea lo que se muestra con lo que se puede hacer.
  // `jefaturaTerritorialId` no tiene formato garantizado, así que se compara
  // normalizado contra el id y el nombre de la territorial de la asignatura, y si nada
  // cruza no se filtra (mejor mostrar de más que ocultar trabajo).
  const asignaturasTerritorial = useMemo(() => {
    const todas = asignaturas.filter((a: any) => componenteDeAsignatura(a) === 'academica_territorial');
    const soloTerritorial = visibleComponentKeySet.has('academica_territorial')
      && !visibleComponentKeySet.has('academica_pregrado')
      && !visibleComponentKeySet.has('academica_posgrado');
    if (!soloTerritorial || isSuperUser || apruebaTodo || !jefaturaTerritorialId) return todas;

    const norm = (v: any) => String(v ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const propia = norm(jefaturaTerritorialId);
    if (!propia) return todas;

    const esPropia = (a: any) =>
      norm(a?.territorial_id) === propia || norm(a?.territorial) === propia;
    const propias = todas.filter(esPropia);
    return propias.length > 0 ? propias : todas;
  }, [asignaturas, componenteDeAsignatura, visibleComponentKeySet, isSuperUser, apruebaTodo, jefaturaTerritorialId]);
  const sumarHorasAsignaturas = useCallback(
    (arr: any[]) => arr.reduce((sum: number, a: any) => sum + (a.total_horas || a.horas || 0), 0),
    [],
  );
  const horasDocenciaPregrado = useMemo(
    () => sumarHorasAsignaturas(asignaturasPregrado),
    [asignaturasPregrado, sumarHorasAsignaturas],
  );
  const horasDocenciaPosgrado = useMemo(
    () => sumarHorasAsignaturas(asignaturasPosgrado),
    [asignaturasPosgrado, sumarHorasAsignaturas],
  );
  const horasDocenciaTerritorial = useMemo(
    () => sumarHorasAsignaturas(asignaturasTerritorial),
    [asignaturasTerritorial, sumarHorasAsignaturas],
  );

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

  // Complementarias unificado incluye la sección académico-administrativa.
  const horasComplementarias = useMemo(() => {
    if (pta.horas_complementarias !== undefined) return pta.horas_complementarias;
    return _compSplit.horasDocencia + _compSplit.horasAadm;
  }, [pta, _compSplit.horasDocencia, _compSplit.horasAadm]);

  // Solo para el total del sub-grupo AADM dentro del acordeón de Complementarias.
  const horasAcadAdmin = _compSplit.horasAadm;

  const hProg = Number(pta.total_horas_programadas || 0);
  const horasProg = hProg > 0 ? hProg : (horasDocencia + horasInvestigacion + horasExtension + horasComplementarias);
  const pctCarga = getPtaCompletionPercentage(horasProg, horasDisp);

  const [procesandoAprobacion, setProcesandoAprobacion] = useState(false);
  const [showFirmaDigital, setShowFirmaDigital] = useState(false);
  // OTP de firma del aprobador: verificationId + correo enmascarado donde se envió.
  const [firmaVerificationId, setFirmaVerificationId] = useState('');
  const [firmaCorreoDestino, setFirmaCorreoDestino] = useState('');
  const [solicitandoFirmaCode, setSolicitandoFirmaCode] = useState(false);
  // Qué acción ejecutará el modal de firma al validarse el OTP: aprobar un
  // componente puntual (flujo real de concertación), REVISAR (preaprobar) una
  // subsección, o la aprobación global del PTA.
  const [firmaAccion, setFirmaAccion] = useState<
    | { tipo: 'componente'; componente: string }
    | { tipo: 'revision'; componente: string; subseccion: string }
    | { tipo: 'pta' }
    | null
  >(null);

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

  // Solicita el OTP de firma al correo del aprobador que oprimió el botón y abre
  // el modal de firma. Devuelve true si el código se envió y el modal debe abrirse.
  const solicitarOtpFirmaAprobador = async (etapaLabel: string): Promise<boolean> => {
    if (solicitandoFirmaCode) return false;
    setSolicitandoFirmaCode(true);
    try {
      const res = await requestPTAFirmaAprobadorCode({
        ptaId: pta.id,
        userId: actorId || '',
        periodo: pta.periodo || '',
        etapaLabel,
      });
      if (!res.success || !res.data?.verificationId) {
        throw new Error((res as any).message || 'No se pudo enviar el código de validación.');
      }
      setFirmaVerificationId(res.data.verificationId);
      setFirmaCorreoDestino(res.data.email || 'tu correo institucional');
      if (res.data.devCode) {
        console.log('🔑 [PRUEBAS] Código OTP de firma (aprobador):', res.data.devCode);
        toast.info(`[PRUEBAS] Código de validación: ${res.data.devCode}`, { duration: Infinity });
      }
      toast.success('Código de validación enviado a tu correo registrado.');
      return true;
    } catch (error: any) {
      setFirmaVerificationId('');
      setFirmaCorreoDestino('');
      toast.error(error?.message || 'No se pudo enviar el código de validación.');
      return false;
    } finally {
      setSolicitandoFirmaCode(false);
    }
  };

  const handleAprobar = async () => {
    if (!puedeAprobarNivelActual) {
      toast.error('No tienes permiso para aprobar este nivel del PTA');
      return;
    }

    // Aprobación global del PTA que requiere firma digital: se envía OTP al correo
    // del aprobador antes de abrir el modal de firma.
    if (nivelAprobacion === 3 && !isSuperUser && ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'PENDIENTE_APROBACION'].includes(pta.estado)) {
      const ok = await solicitarOtpFirmaAprobador('Aprobación del PTA');
      if (!ok) return;
      setFirmaAccion({ tipo: 'pta' });
      setShowFirmaDigital(true);
      return;
    }

    // El backend detecta automáticamente camposModificadosPorRevisor al recibir 'aprobar'
    setProcesandoAprobacion(true);
    const res = await updatePTAStatus(pta.id, {
      accion: 'aprobar',
      actorRol: rolLabel,
      actorId,
      nivelAprobacion,
      actorTerritorialId: jefaturaTerritorialId,
      isSuperUser: isSuperUser || false,
      aprobarTodas: isSuperUser || false,
    });
    setProcesandoAprobacion(false);
    if (!res.success) {
      toast.error(res.message || 'Error aprobando PTA');
      return;
    }
    const hayModificaciones = pta.camposModificadosPorRevisor &&
      Object.keys(pta.camposModificadosPorRevisor).length > 0;
    if (res.parcial) {
      toast.success(res.message || 'Aprobación registrada. Faltan otros avales.');
    } else if (hayModificaciones) {
      toast.success('PTA enviado al docente para revisión de modificaciones');
    } else {
      toast.success(res.nuevoEstado === 'Aprobado' ? 'PTA aprobado' : 'Aprobación registrada');
    }
    setPta((prev: any) => ({ ...prev, estado: res.nuevoEstado || res.data?.estado || prev.estado }));
    onAprobar();
  };

  // Valida el OTP ingresado por el aprobador contra el código enviado a su correo.
  const verificarCodigoFirmaAprobador = async (codigo: string) => {
    if (!firmaVerificationId) throw new Error('No hay código activo. Vuelve a intentar la aprobación.');
    const res = await verifyPTAFirmaDocenteCode({ verificationId: firmaVerificationId, code: codigo });
    if (!res.success) {
      throw new Error((res as any).message || 'Código incorrecto. Verifica e intenta nuevamente.');
    }
  };

  const handleFirmaCompleta = async (firmaData: FirmaData) => {
    setShowFirmaDigital(false);
    setFirmaVerificationId('');
    setFirmaCorreoDestino('');
    const accion = firmaAccion;
    setFirmaAccion(null);

    // Flujo real: la firma confirma la aprobación de UN componente concreto.
    if (accion?.tipo === 'componente') {
      await ejecutarAprobacionComponente(accion.componente, 'aprobado');
      return;
    }

    // Etapa de Revisión (preaprobación): la firma respalda quién revisó la subsección.
    if (accion?.tipo === 'revision') {
      await ejecutarRevisionComponente(accion.componente, accion.subseccion, 'revisado');
      return;
    }

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
      nivelAprobacion,
      actorTerritorialId: jefaturaTerritorialId,
      isSuperUser: isSuperUser || false,
      aprobarTodas: isSuperUser || false,
    } as any);
    setProcesandoAprobacion(false);
    if (!res.success) {
      toast.error(res.message || 'Error aprobando PTA');
      return;
    }
    guardarFirmaDigitalPTA(pta.id, firmaData).catch(() => {});
    if (res.parcial) {
      toast.success(res.message || 'Tu aprobación fue registrada. Esperando otros avales.');
      setPta((prev: any) => ({ ...prev, estado: res.nuevoEstado || prev.estado }));
      // Usar aprobaciones del response (ya tienen nombres del JOIN) o re-fetchear
      if (res.aprobaciones?.length) {
        setAprobacionesJefatura(res.aprobaciones);
      } else {
        getAprobacionesJefatura(pta.id).then(r => { if (r.success) setAprobacionesJefatura(r.data || []); });
      }
    } else {
      toast.success('PTA firmado y enviado a la siguiente fase');
      setPta((prev: any) => ({ ...prev, estado: res.nuevoEstado || res.data?.estado || prev.estado }));
      onAprobar();
    }
  };

  const historialEstados = pta.historialEstados || [];
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);
  const [selectedSnapshotVersion, setSelectedSnapshotVersion] = useState<number>(1);

  // Número de la versión del reporte actual (cuenta snapshots guardados)
  const reporteVersionActual = historialEstados.filter((h: any) => h.snapshotPta && typeof h.snapshotPta === 'object').length || 1;

  // Todos los aprobadores visualizan la totalidad de los componentes del PTA para
  // tener contexto completo; la restricción por rol aplica solo a las ACCIONES
  // (aprobar/devolver/concertar), nunca a qué se muestra en esta vista de detalle.
  const componentesAprobacionVisibles = componentesAprobacion;
  const componentesPendientes = componentesAprobacionVisibles.filter(c => c.estado === 'pendiente' || !c.estado).length;
  // Rótulo de la pestaña "Concertación" según lo que el rol puede hacer en ella:
  // solo revisar → "Revisión"; puede aprobar (con o sin permiso de revisión también)
  // → "Aprobación"; ninguno de los dos (p.ej. coordinador en etapa de concertación
  // de elaboración) → se conserva "Concertación".
  const tabComponentesLabel = puedeAprobar ? 'Aprobación' : (tieneAlgunPermisoRevision ? 'Revisión' : 'Concertación');
  const TABS = [
    { key: 'resumen', label: 'Resumen', icon: BarChart3 },
    // "Concertación" fusiona las antiguas pestañas "Componentes" (detalle) y "Aprobación"
    // (aprobar/devolver): en un mismo lugar se ve el detalle de cada componente y se
    // aprueba o devuelve, con comentario del revisor. La etiqueta visible varía según
    // el rol (ver tabComponentesLabel).
    { key: 'componentes', label: tabComponentesLabel, icon: ShieldCheck, badge: componentesPendientes || undefined },
    { key: 'evidencias', label: 'Seguimiento', icon: FileText, badge: evidencias.length || undefined },
    { key: 'trazabilidad', label: 'Trazabilidad', icon: Activity, badge: historialEstados.length || undefined },
    // La etapa de concertación (coordinadores, durante la elaboración del PTA) ya fue
    // ejecutada antes de que el PTA llegue a la bandeja de aprobación: la pestaña solo
    // debe aparecer mientras esa etapa está activa, no de forma permanente por haber
    // quedado mensajes históricos.
    ...(isConcertacion
      ? [{ key: 'concertacion', label: 'Concertación', icon: MessageSquare, badge: concertacion.mensajes?.length || 0 }]
      : []),
  ];

  const getSubcomponentHours = (seccionKey: string) => {
    const acts = pta.extension_actividades || initialPta.extension_actividades || [];
    if (seccionKey === 'otras') {
      return acts
        .filter((e: any) => normalizeExtensionSectionForDisplay(e.seccion) === 'otras')
        .reduce((s: number, e: any) => s + (e.horas || 0), 0);
    }
    return acts
      .filter((e: any) => normalizeExtensionSectionForDisplay(e.seccion) === seccionKey)
      .reduce((s: number, e: any) => s + (e.horas || 0), 0);
  };

  // La vista de detalle conserva siempre el contexto completo del PTA. Los permisos
  // granulares restringen las acciones y el formulario de concertación, no la
  // visibilidad de los demás componentes.
  /**
   * ¿Se le muestra este componente al usuario actual?
   *
   * QA pidió que un revisor/aprobador vea ÚNICAMENTE lo que le corresponde revisar o
   * aprobar (p. ej. el revisor de Docencia-Pregrado no debe ver las asignaturas de
   * Posgrado). Antes esta función devolvía siempre `true` porque se mostraba el PTA
   * completo "para dar contexto".
   *
   * Se muestra todo (sin restringir) a: superusuario, aprobador integral, el propio
   * docente dueño del PTA, y a los roles sin ningún permiso granular (compatibilidad
   * con el esquema legacy por nivel). Para el resto, se ve el componente si puede
   * APROBARLO o REVISARLO — son capas independientes: hay revisores sin permiso de
   * aprobación y viceversa.
   */
  const puedeRevisarAlgunaSubseccion = useCallback((key: string): boolean => {
    const subsecciones = REVIEW_SUBSECCIONES_BY_COMPONENT[key as PTAComponentKey] || [];
    return subsecciones.some(sub => isSubseccionAuthorizedToReview(key, sub));
  }, [isSubseccionAuthorizedToReview]);

  const shouldShowComponentKey = useCallback((key: string): boolean => {
    if (isSuperUser || apruebaTodo || revisaTodo) return true;
    // Nota: NO se usa `rolLabel === 'Docente'` aquí a propósito. Un rol granular sin
    // patrón reconocido por deriveRolPTA (p.ej. "Revisor Docencia Pregrados") cae por
    // defecto en el bucket 'docente' (ver PermisosPTAContext) aunque tenga permisos
    // pta.approve.*/pta.review.* — depender de rolLabel mostraría todos los componentes
    // a ese revisor en vez de solo los suyos. El chequeo de abajo ya cubre al docente
    // real: sin ningún permiso granular pta.approve.*/pta.review.* no hay alcance que
    // restringir (rol legacy por nivel), así que se conserva la vista completa.
    if (!tieneAlgunPermisoComponente && !tieneAlgunPermisoRevision) return true;
    return isComponentAuthorized(key) || puedeRevisarAlgunaSubseccion(key);
  }, [
    isSuperUser, apruebaTodo, revisaTodo,
    tieneAlgunPermisoComponente, tieneAlgunPermisoRevision,
    isComponentAuthorized, puedeRevisarAlgunaSubseccion,
  ]);

  // Docencia se divide en dos tarjetas de aprobación (Pregrado/Posgrado), con el
  // mismo patrón que las 4 tarjetas de Extensión: cada una se muestra si tiene
  // asignaturas de ese nivel, o si quedó en 0 tras una edición parcial que aún
  // exige reaprobación.
  // Posgrado se muestra primero: así el detalle y las acciones de aprobar/revisar
  // quedan agrupados por nivel en el orden pedido (Posgrado, luego Pregrado).
  const docenciaCards = useMemo(() => ([
    { key: 'academica_posgrado' as const, label: 'Docencia - Posgrado', asignaturas: asignaturasPosgrado, horas: horasDocenciaPosgrado },
    { key: 'academica_pregrado' as const, label: 'Docencia - Pregrado', asignaturas: asignaturasPregrado, horas: horasDocenciaPregrado },
    // Asignaturas dictadas en Direcciones Territoriales: las revisa el Coordinador
    // Territorial y las aprueba la Jefatura de la Territorial, sin importar el nivel.
    { key: 'academica_territorial' as const, label: 'Docencia - Territorial', asignaturas: asignaturasTerritorial, horas: horasDocenciaTerritorial },
  ]).filter(item => {
    const approval = componentesAprobacion.find(component => component.componente === item.key);
    const requiereReaprobacionManual =
      approval?.scope === 'solicitud_edicion'
      && ['pendiente', 'devuelto'].includes(String(approval.estado || '').toLowerCase());
    return item.asignaturas.length > 0 || item.horas > 0 || requiereReaprobacionManual;
  }), [
    asignaturasPregrado, asignaturasPosgrado, asignaturasTerritorial,
    horasDocenciaPregrado, horasDocenciaPosgrado, horasDocenciaTerritorial,
    componentesAprobacion,
  ]);

  // Una sección de Extensión también debe poder revisarse cuando quedó en 0 horas
  // después de una edición parcial: eliminar sus actividades sigue siendo un cambio
  // que requiere reaprobación.
  const extensionCards = useMemo(() => ([
    { key: 'ext_capacitacion', section: 'capacitacion', label: 'Dirección de Capacitación', icon: GraduationCap, color: '#059669' },
    { key: 'ext_procesos', section: 'seleccion', label: 'Dirección de Procesos de Selección', icon: Briefcase, color: '#0284C7' },
    { key: 'ext_fortalecimiento', section: 'fortalecimiento', label: 'Dirección de Fortalecimiento y Apoyo a la Gestión Estatal', icon: Building2, color: '#7C3AED' },
    { key: 'ext_gobierno', section: 'alto_gobierno', label: 'Escuela de Alto Gobierno', icon: Shield, color: '#B45309' },
  ] as const).filter(item => {
    const approval = componentesAprobacion.find(component => component.componente === item.key);
    const requiereReaprobacionManual =
      approval?.scope === 'solicitud_edicion'
      && ['pendiente', 'devuelto'].includes(String(approval.estado || '').toLowerCase());
    return getSubcomponentHours(item.section) > 0 || requiereReaprobacionManual;
  }), [
    pta.extension_actividades,
    initialPta.extension_actividades,
    componentesAprobacion,
  ]);

  const renderComponentCard = (key: string, label: string, IconComponent: any, color: string, subtitle: string, isSubComponent = false) => {
    const approval = componentesAprobacion.find(c => c.componente === key) || { estado: 'pendiente' };
    const estado = approval.estado || 'pendiente';
    const isAutoAprobado = estado === 'aprobado' && approval.aprobadorNombre === 'Sistema';
    const isEditing = estado !== 'aprobado' || !!evaluandoComponente[key];
    const isProcessing = !!procesandoAprobacionComponente[key];

    const componentAuthorized = isComponentAuthorized(key);
    // Una vez el componente queda resuelto (aprobado o devuelto), deja de ser una
    // opción editable por defecto, así cada componente se puede resolver de forma
    // independiente sin esperar a los demás. "Volver a evaluar" (evaluandoComponente)
    // es la única forma de reabrir uno ya aprobado.
    const revisionesComponente = subseccionesRevision(key);
    const revisionCompleta = todasRevisionesCompletas(key);
    const canEvaluateComponent = puedeAprobar && puedeActuarSobreComponentes && componentAuthorized && !isAutoAprobado &&
      revisionCompleta &&
      (estado === 'pendiente' || !!evaluandoComponente[key]);

    const getAssignmentDate = () => {
      const transition = (pta.historialEstados || []).find(
        (h: any) => ['Pendiente Jefatura', 'PENDIENTE_APROBACION'].includes(h.estadoNuevo || h.estado_nuevo || '')
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

    if (!componentAuthorized) {
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
        whileHover={componentAuthorized ? { y: -3, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)' } : undefined}
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
          opacity: componentAuthorized ? 1 : 0.82,
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
          background: componentAuthorized
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
              background: componentAuthorized
                ? `linear-gradient(135deg, ${color}1A 0%, ${color}0D 100%)`
                : 'linear-gradient(135deg, rgba(148, 163, 184, 0.15) 0%, rgba(148, 163, 184, 0.08) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: componentAuthorized ? color : '#64748B',
              border: componentAuthorized ? `1px solid ${color}26` : '1px solid rgba(148, 163, 184, 0.25)',
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

        {/* Historial de concertación: el componente volvió a 'pendiente' tras una
            devolución — se muestra el comentario original del revisor y la respuesta
            del docente (por qué reenvía / qué corrigió), para que el revisor tenga
            contexto antes de volver a aprobar o devolver. */}
        {isEditing && estado === 'pendiente' && (approval.comentarios || approval.respuestaDocente) && (
          <div style={{
            background: 'rgba(239, 246, 255, 0.5)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.74rem',
            border: '1px dashed #BFDBFE',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginLeft: 6,
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Historial de concertación — el docente reenvió este componente
            </div>
            {approval.comentarios && (
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                  Comentario del revisor (ciclo anterior)
                </span>
                <div style={{
                  borderLeft: '3px solid #94A3B8', padding: '8px 10px', background: 'white',
                  borderRadius: '0 8px 8px 0', fontStyle: 'italic', color: '#374151', lineHeight: 1.4,
                }}>
                  "{approval.comentarios}"
                </div>
              </div>
            )}
            {approval.respuestaDocente && (
              <div>
                <span style={{ display: 'block', fontSize: '0.62rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>
                  Respuesta del docente
                </span>
                <div style={{
                  borderLeft: '3px solid #3B82F6', padding: '8px 10px', background: 'white',
                  borderRadius: '0 8px 8px 0', fontStyle: 'italic', color: '#1E3A8A', lineHeight: 1.4,
                }}>
                  "{approval.respuestaDocente}"
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detalle de Aprobación Guardada */}
        {!isEditing && (
          <div style={{
            background: isAutoAprobado ? 'rgba(241, 245, 249, 0.6)' : 'rgba(240, 253, 244, 0.4)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: '0.74rem',
            color: isAutoAprobado ? '#475569' : '#15803D',
            border: isAutoAprobado ? '1px dashed #CBD5E1' : '1px dashed #A7F3D0',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginLeft: 6
          }}>
            {isAutoAprobado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748B', fontStyle: 'italic' }}>
                <CheckCircle style={{ width: 13, height: 13, color: '#94A3B8', flexShrink: 0 }} />
                Sin actividades registradas — no requiere aprobación
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Etapa de Revisión (preaprobación): una fila por cada subsección que este
            PTA realmente requiere para este componente. Independiente del panel de
            Aprobación de abajo — un revisor sin permiso de aprobación solo ve esto.
            Se sigue mostrando cuando el componente YA está aprobado: en ese caso
            queda como traza de solo lectura (quién revisó, cuándo y con qué
            observaciones). Antes se ocultaba al aprobar y esa trazabilidad
            desaparecía del tab de Componentes. Las acciones de revisar/devolver no
            reaparecen porque ya están condicionadas a `!estaResuelta`. */}
        {puedeActuarSobreComponentes && revisionesComponente.length > 0 && (
          <div style={{
            marginLeft: 6,
            padding: '12px 14px',
            borderRadius: 12,
            background: revisionCompleta ? 'linear-gradient(180deg, #F0FDFA 0%, #ECFDF5 100%)' : 'linear-gradient(180deg, #FAF5FF 0%, #F5F3FF 100%)',
            border: revisionCompleta ? '1px solid #99F6E4' : '1px solid #D8B4FE',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <Eye style={{ width: 14, height: 14, color: '#7E22CE' }} />
              Revisión previa {revisionCompleta ? '(completa)' : '(pendiente)'}
            </div>
            {revisionesComponente.map(r => {
              const subKey = `${key}:${r.subseccion}`;
              const visual = getReviewStatusVisual(r.estado);
              const subLabel = REVIEW_SUBSECCION_LABEL[r.subseccion as PTAReviewSubseccionKey] || r.subseccion;
              const puedeRevisarEsta = isSubseccionAuthorizedToReview(key, r.subseccion);
              const estaResuelta = r.estado === 'revisado';
              const procesandoEsta = !!procesandoRevision[subKey];
              return (
                <div key={subKey} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155' }}>{subLabel}</span>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 999,
                      color: visual.color, background: visual.bg, border: `1px solid ${visual.border}`,
                    }}>
                      {visual.label}
                    </span>
                  </div>
                  {estaResuelta && r.revisorNombre && (
                    <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                      Revisado por {r.revisorNombre}
                      {r.revisorRol ? ` (${r.revisorRol})` : ''}
                      {r.fechaRevision ? ` · ${new Date(r.fechaRevision).toLocaleString('es-CO')}` : ''}
                    </div>
                  )}
                  {/* Observaciones de la revisión: el ticket exige registrar (y poder
                      consultar) las observaciones de cada etapa, no solo autor y fecha. */}
                  {estaResuelta && r.comentarios && (
                    <div style={{
                      fontSize: '0.68rem', color: '#475569', background: 'white',
                      border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 9px',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      <span style={{ fontWeight: 700, color: '#64748B' }}>Observaciones: </span>
                      {r.comentarios}
                    </div>
                  )}
                  {!estaResuelta && puedeRevisarEsta && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        value={comentariosRevision[subKey] || ''}
                        onChange={e => setComentariosRevision(prev => ({ ...prev, [subKey]: e.target.value }))}
                        placeholder="Comentario opcional al revisar..."
                        disabled={procesandoEsta}
                        rows={2}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          border: '1px solid #CBD5E1', fontSize: '0.74rem', resize: 'none',
                          fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'white',
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <button
                          onClick={() => handleRevisarComponente(key, r.subseccion, 'devuelto')}
                          disabled={procesandoEsta}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: '1px solid #FCA5A5',
                            background: 'white', color: '#B91C1C', fontSize: '0.7rem', fontWeight: 700,
                            cursor: procesandoEsta ? 'default' : 'pointer',
                          }}
                        >
                          Devolver
                        </button>
                        <button
                          onClick={() => handleRevisarComponente(key, r.subseccion, 'revisado')}
                          disabled={procesandoEsta}
                          style={{
                            padding: '5px 12px', borderRadius: 8, border: 'none',
                            background: '#7E22CE', color: 'white', fontSize: '0.7rem', fontWeight: 800,
                            cursor: procesandoEsta ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}
                        >
                          {procesandoEsta ? <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" /> : null}
                          Revisar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
              placeholder="Comentario opcional al aprobar este componente..."
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
              {/* Devolver: retorna este componente al docente para ajustes. Requiere
                  comentario (validado en handleAprobarComponente) y, a diferencia de
                  "Aprobar", no exige firma OTP — misma regla que la etapa de Revisión.
                  Visible bajo la misma condición de permisos que "Aprobar" (canEvaluateComponent).
                  Reemplaza a la devolución vía "Concertar", que ya no se ofrece al
                  revisor/aprobador. */}
              <button
                onClick={() => handleAprobarComponente(key, 'devuelto')}
                disabled={isProcessing}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: '1px solid #FCA5A5',
                  background: 'white',
                  color: '#B91C1C',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: isProcessing ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!isProcessing) e.currentTarget.style.background = '#FEF2F2'; }}
                onMouseLeave={e => { if (!isProcessing) e.currentTarget.style.background = 'white'; }}
                title="Devolver el componente al docente para ajustes (requiere comentario)"
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

        {/* Mensaje Informativo si no tiene permiso (la devolución ya tiene su propio
            banner arriba, así que se excluye aquí para no duplicar el mensaje) */}
        {isEditing && !canEvaluateComponent && puedeActuarSobreComponentes && approval.estado !== 'devuelto' && (
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
            <span>
              {!componentAuthorized
                ? 'No tienes los permisos para aprobar este componente.'
                : !revisionCargada
                ? 'No se pudo cargar el estado de la revisión previa; recarga la página para poder aprobar.'
                : !revisionCompleta
                ? 'Este componente aún tiene revisión(es) pendiente(s) y no puede aprobarse todavía.'
                : `Este componente es gestionado y concertado por ${getResponsableRoleLabel(key)}.`}
            </span>
          </div>
        )}
      </motion.div>
    );
  };

  // ── Timeline de trazabilidad del proceso ──
  // Muestra cambios de estado PTA + aprobaciones individuales de componentes, ordenados por fecha.
  const renderHistorialTimeline = () => {
    const COMP_LABELS: Record<string, string> = {
      docencia: 'Docencia',
      academica: 'Docencia', // legacy (pre-split)
      academica_pregrado: 'Docencia (Pregrado)', academica_posgrado: 'Docencia (Posgrado)', academica_territorial: 'Docencia (Territorial)',
      investigacion: 'Investigación',
      extension: 'Extensión',
      ext_capacitacion: 'Ext. Capacitación', ext_procesos: 'Ext. Procesos Selección',
      ext_fortalecimiento: 'Ext. Fortalecimiento', ext_gobierno: 'Ext. Alto Gobierno',
      complementarias: 'Complementarias',
      academicas_admin: 'Acad. Admin.',
    };
    const ACTION_LABELS: Record<string, string> = {
      SOLICITUD_EDICION_CREADA: 'Solicitud de edición creada',
      SOLICITUD_EDICION_APROBADA: 'Edición parcial habilitada',
      SOLICITUD_EDICION_DENEGADA: 'Solicitud de edición rechazada',
      EDICION_COMPONENTES_ENVIADA: 'Cambios enviados a reaprobación',
      EDICION_COMPONENTES_APROBADA: 'Edición parcial aprobada',
      APROBACION_COMPONENTE: 'Aprobación de componente',
      DEVOLUCION_COMPONENTE: 'Devolución de componente',
      REVISION_COMPONENTE: 'Revisión de componente',
    };
    const parseDetalles = (value: unknown): Record<string, any> => {
      if (value && typeof value === 'object') return value as Record<string, any>;
      if (typeof value !== 'string' || !value.trim()) return {};
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    };

    // Unificar eventos: cambios de estado + aprobaciones de componentes (solo manuales)
    // + revisiones de componentes (etapa previa a la aprobación).
    type TimelineEvent =
      | { kind: 'estado'; date: Date; data: any; idx: number }
      | { kind: 'componente'; date: Date; data: any }
      | { kind: 'revision'; date: Date; data: any };

    const estadoEvents: TimelineEvent[] = historialEstados.map((h: any, i: number) => ({
      kind: 'estado' as const,
      date: h.createdAt ? new Date(h.createdAt) : new Date(0),
      data: h,
      idx: i,
    }));

    const compEvents: TimelineEvent[] = componentesAprobacionVisibles
      .filter(c => c.estado !== 'pendiente' && c.aprobadorNombre !== 'Sistema' && c.fechaAprobacion)
      .map(c => ({
        kind: 'componente' as const,
        date: new Date(c.fechaAprobacion),
        data: c,
      }));

    // Solo 'revisado' se muestra aquí: una devolución en la etapa de Revisión
    // reutiliza el mismo mecanismo de devolución de aprobación (revisarComponente
    // marca también el PtaComponentApproval como 'devuelto'), así que ya queda
    // reflejada por los eventos 'estado'/'componente' de arriba — mostrarla también
    // aquí duplicaría la misma devolución tres veces.
    const revEvents: TimelineEvent[] = componentesRevision
      .filter(r => r.estado === 'revisado' && r.revisorNombre !== 'Sistema' && r.fechaRevision)
      .map(r => ({
        kind: 'revision' as const,
        date: new Date(r.fechaRevision),
        data: r,
      }));

    const allEvents = [...estadoEvents, ...compEvents, ...revEvents].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (allEvents.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: '0.78rem' }}>
          Sin transiciones registradas.
        </div>
      );
    }

    const snapshotNums = new Map<string, number>();
    let reporteNum = 1;
    historialEstados.slice().reverse().forEach((s: any, i: number) => {
      if (s.snapshotPta && typeof s.snapshotPta === 'object') {
        snapshotNums.set(s.id || String(i), reporteNum++);
      }
    });

    return (
      <div style={{ position: 'relative', marginTop: 10 }}>
        <div style={{ position: 'absolute', top: 14, bottom: 14, left: 15, width: 2, background: '#E0E7FF', borderRadius: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {allEvents.map((event, idx) => {
            const isLatest = idx === 0;

            if (event.kind === 'componente') {
              const c = event.data;
              const isAprobado = c.estado === 'aprobado';
              const dotColor = isAprobado ? '#10B981' : '#EF4444';
              const badgeBg = isAprobado ? '#D1FAE5' : '#FEE2E2';
              const badgeColor = isAprobado ? '#065F46' : '#991B1B';
              return (
                <motion.div
                  key={`comp-${c.componente}-${idx}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{
                    display: 'flex', gap: 14, position: 'relative', zIndex: 1,
                    padding: '9px 12px', borderRadius: 10, marginLeft: 0,
                    background: isLatest ? badgeBg : 'transparent',
                    border: isLatest ? `1px solid ${dotColor}30` : '1px solid transparent',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: isLatest ? dotColor : 'white',
                    border: `2.5px solid ${isLatest ? dotColor : '#CBD5E1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isAprobado
                      ? <CheckCircle style={{ width: 14, height: 14, color: isLatest ? 'white' : '#94A3B8' }} />
                      : <RotateCcw style={{ width: 14, height: 14, color: isLatest ? 'white' : '#94A3B8' }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ padding: '1px 6px', borderRadius: 5, background: badgeBg, color: badgeColor, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${dotColor}30` }}>
                        {isAprobado ? '✓ Aprobado' : '↩ Devuelto'}
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151' }}>
                        {COMP_LABELS[c.componente] || c.componente}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar style={{ width: 10, height: 10, color: '#9CA3AF' }} />
                      {event.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <Clock style={{ width: 10, height: 10, color: '#9CA3AF', marginLeft: 3 }} />
                      <span style={{ color: '#374151', fontWeight: 600 }}>
                        {event.date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                    {c.aprobadorNombre && (
                      <span style={{ fontSize: '0.63rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                        <Users style={{ width: 9, height: 9 }} /> {c.aprobadorNombre}{c.aprobadorRol ? ` — ${c.aprobadorRol}` : ''}
                      </span>
                    )}
                    {c.comentarios && (
                      <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '4px 0 0', padding: '4px 7px', background: '#F8FAFC', borderRadius: 5, border: '1px solid #E2E8F0', fontStyle: 'italic' }}>
                        "{c.comentarios}"
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            }

            if (event.kind === 'revision') {
              // Etapa de Revisión (preaprobación): mismo formato rico que el bloque
              // de aprobación de arriba, en morado para distinguirla visualmente.
              // Solo llegan aquí revisiones 'revisado' — las 'devuelto' ya se ven
              // por los eventos 'estado'/'componente' de la devolución de aprobación
              // que revisarComponente() reutiliza.
              const r = event.data;
              const dotColor = '#7E22CE';
              const badgeBg = '#F3E8FF';
              const badgeColor = '#6B21A8';
              const subLabel = r.subseccion && r.subseccion !== 'general'
                ? REVIEW_SUBSECCION_LABEL[r.subseccion as PTAReviewSubseccionKey] || r.subseccion
                : null;
              return (
                <motion.div
                  key={`rev-${r.componente}-${r.subseccion}-${idx}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{
                    display: 'flex', gap: 14, position: 'relative', zIndex: 1,
                    padding: '9px 12px', borderRadius: 10, marginLeft: 0,
                    background: isLatest ? badgeBg : 'transparent',
                    border: isLatest ? `1px solid ${dotColor}30` : '1px solid transparent',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                    background: isLatest ? dotColor : 'white',
                    border: `2.5px solid ${isLatest ? dotColor : '#CBD5E1'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Eye style={{ width: 14, height: 14, color: isLatest ? 'white' : '#94A3B8' }} />
                  </div>
                  <div style={{ flex: 1, paddingTop: 2, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ padding: '1px 6px', borderRadius: 5, background: badgeBg, color: badgeColor, fontSize: '0.65rem', fontWeight: 700, border: `1px solid ${dotColor}30` }}>
                        👁 Revisado
                      </span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151' }}>
                        {COMP_LABELS[r.componente] || r.componente}
                        {subLabel ? ` — ${subLabel}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.67rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar style={{ width: 10, height: 10, color: '#9CA3AF' }} />
                      {event.date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <Clock style={{ width: 10, height: 10, color: '#9CA3AF', marginLeft: 3 }} />
                      <span style={{ color: '#374151', fontWeight: 600 }}>
                        {event.date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    </div>
                    {r.revisorNombre && (
                      <span style={{ fontSize: '0.63rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
                        <Users style={{ width: 9, height: 9 }} /> {r.revisorNombre}{r.revisorRol ? ` — ${r.revisorRol}` : ''}
                      </span>
                    )}
                    {r.comentarios && (
                      <p style={{ fontSize: '0.7rem', color: '#64748B', margin: '4px 0 0', padding: '4px 7px', background: '#F8FAFC', borderRadius: 5, border: '1px solid #E2E8F0', fontStyle: 'italic' }}>
                        "{r.comentarios}"
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            }

            // estado event
            const step = event.data;
            const hsc = getStatusConfig(step.estadoNuevo || '');
            const date = step.createdAt ? new Date(step.createdAt) : null;
            const snap = step.snapshotPta;
            const hasSnapshot = snap && typeof snap === 'object';
            const reporteNumStep = hasSnapshot ? snapshotNums.get(step.id || String(event.idx)) : null;
            const detalles = parseDetalles(step.detallesTransicion);
            const isSolicitudEdicionRechazada = step.tipoAccion === 'SOLICITUD_EDICION_DENEGADA';
            const estadoPtaLabel = step.estadoNuevo?.replace(/_/g, ' ') || 'Sin estado';
            const eventColor = isSolicitudEdicionRechazada ? '#DC2626' : (hsc.color || '#4F46E5');
            const eventBg = isSolicitudEdicionRechazada ? '#FEF2F2' : (hsc.bg || '#F3F4F6');
            const eventBorder = isSolicitudEdicionRechazada ? '#FECACA' : `${eventColor}20`;
            const responsableResolucion = typeof detalles.resueltoPor === 'string'
              ? detalles.resueltoPor.trim()
              : '';
            const rolResolucion = typeof detalles.resueltoPorRol === 'string'
              ? detalles.resueltoPorRol.trim()
              : '';
            const comentarioVisible = step.comentarios || detalles.motivoResolucion;
            const componentesDetalle = Array.from(new Set(
              [
                ...(Array.isArray(detalles.componentes) ? detalles.componentes : []),
                ...(Array.isArray(detalles.componentesSolicitud) ? detalles.componentesSolicitud : []),
                detalles.componente,
              ].filter(Boolean).map(String),
            ));
            const solicitudRef = typeof detalles.solicitudId === 'string' && detalles.solicitudId
              ? detalles.solicitudId
              : null;
            const archivosDetalle = Array.isArray(detalles.archivos)
              ? detalles.archivos.filter((archivo: any) => archivo?.url)
              : [];
            return (
              <motion.div
                key={step.id || idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                style={{
                  display: 'flex', gap: 14, position: 'relative', zIndex: 1,
                  padding: '10px 12px', borderRadius: 10, marginLeft: 0,
                  cursor: 'default',
                  background: isSolicitudEdicionRechazada
                    ? '#FFF7F7'
                    : isLatest ? eventBg : 'transparent',
                  border: isSolicitudEdicionRechazada || isLatest
                    ? `1px solid ${eventBorder}`
                    : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: isLatest || isSolicitudEdicionRechazada ? eventColor : 'white',
                  border: `2.5px solid ${isLatest || isSolicitudEdicionRechazada ? eventColor : '#CBD5E1'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isLatest || isSolicitudEdicionRechazada ? `0 0 0 3px ${eventColor}18` : 'none',
                }}>
                  {isSolicitudEdicionRechazada
                    ? <XCircle style={{ width: 14, height: 14, color: 'white' }} />
                    : <CheckCircle style={{ width: 14, height: 14, color: isLatest ? 'white' : '#94A3B8' }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 2, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6,
                      background: eventBg, color: eventColor,
                      fontSize: '0.72rem', fontWeight: 700,
                      border: `1px solid ${eventBorder}`,
                    }}>
                      {isSolicitudEdicionRechazada
                        ? 'Solicitud de edición rechazada'
                        : estadoPtaLabel}
                    </span>
                    {isSolicitudEdicionRechazada && (
                      <span style={{
                        padding: '2px 7px', borderRadius: 6, background: '#F8FAFC',
                        color: '#475569', border: '1px solid #CBD5E1',
                        fontSize: '0.63rem', fontWeight: 700,
                      }}>
                        PTA conserva: {estadoPtaLabel}
                      </span>
                    )}
                    {!isSolicitudEdicionRechazada && step.tipoAccion && ACTION_LABELS[step.tipoAccion] && (
                      <span style={{
                        padding: '2px 7px', borderRadius: 6, background: '#EEF2FF',
                        color: '#4338CA', border: '1px solid #C7D2FE',
                        fontSize: '0.63rem', fontWeight: 700,
                      }}>
                        {ACTION_LABELS[step.tipoAccion]}
                      </span>
                    )}
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
                    {isSolicitudEdicionRechazada && responsableResolucion ? (
                      <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Users style={{ width: 10, height: 10 }} />
                        Rechazada por {responsableResolucion}
                        {(rolResolucion || step.actorRol) ? ` — ${rolResolucion || step.actorRol}` : ''}
                      </span>
                    ) : step.actorRol && (
                      <span style={{ fontSize: '0.65rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Users style={{ width: 10, height: 10 }} /> {step.actorRol}
                      </span>
                    )}
                    {hasSnapshot && (
                      <button
                        type="button"
                        title={`Ver reporte histórico R-${String(reporteNumStep).padStart(2, '0')}`}
                        aria-label={`Ver reporte histórico R-${String(reporteNumStep).padStart(2, '0')}`}
                        onClick={() => {
                          setSelectedSnapshot(step);
                          setSelectedSnapshotVersion(reporteNumStep || 1);
                        }}
                        style={{
                        fontSize: '0.6rem', color: '#4F46E5', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 3,
                        padding: '2px 7px', borderRadius: 4, background: '#EEF2FF',
                        border: '1px solid #C7D2FE', cursor: 'pointer',
                        fontFamily: 'inherit', lineHeight: 1.35,
                      }}>
                        <Eye style={{ width: 10, height: 10 }} />
                        Ver reporte R-{String(reporteNumStep).padStart(2, '0')}
                      </button>
                    )}
                  </div>
                  {(componentesDetalle.length > 0 || solicitudRef) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                      {solicitudRef && (
                        <span
                          title={solicitudRef}
                          style={{
                            fontSize: '0.6rem', color: '#475569', fontWeight: 700,
                            padding: '2px 6px', borderRadius: 5, background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                          }}
                        >
                          Solicitud #{solicitudRef.slice(0, 8)}
                        </span>
                      )}
                      {componentesDetalle.map(componente => (
                        <span
                          key={componente}
                          style={{
                            fontSize: '0.6rem', color: '#1E40AF', fontWeight: 700,
                            padding: '2px 6px', borderRadius: 5, background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          {COMP_LABELS[componente] || componente.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {archivosDetalle.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                      {archivosDetalle.map((archivo: any, archivoIndex: number) => (
                        <a
                          key={`${archivo.url}-${archivoIndex}`}
                          href={resolvePtaFileUrl(archivo.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={event => event.stopPropagation()}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            maxWidth: '100%', padding: '2px 7px', borderRadius: 5,
                            background: '#FEF2F2', border: '1px solid #FECACA',
                            color: '#B91C1C', fontSize: '0.6rem', fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <FileText style={{ width: 10, height: 10, flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {archivo.nombre || `Soporte ${archivoIndex + 1}`}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                  {comentarioVisible && (
                    <p style={{
                      fontSize: '0.72rem',
                      color: isSolicitudEdicionRechazada ? '#991B1B' : '#64748B',
                      margin: '5px 0 0', padding: '5px 8px',
                      background: isSolicitudEdicionRechazada ? '#FFFFFF' : '#F8FAFC',
                      borderRadius: 6,
                      border: `1px solid ${isSolicitudEdicionRechazada ? '#FECACA' : '#E2E8F0'}`,
                      lineHeight: 1.4, fontStyle: 'italic',
                    }}>
                      {isSolicitudEdicionRechazada ? 'Motivo del rechazo: ' : ''}
                      "{comentarioVisible}"
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
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
            <ApprovalTracker
              estado={pta.estado}
              componentesAprobacion={componentesAprobacion}
              isMobile={isMobile}
            />
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
                  { label: 'Carga', value: `${formatPtaPercentage(pctCarga)}%`, color: pctCarga > 100 ? '#DC2626' : pctCarga > 90 ? '#D97706' : '#059669', bg: pctCarga > 100 ? '#FEE2E2' : pctCarga > 90 ? '#FEF3C7' : '#D1FAE5' },
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
                      ? `${horasProg}h / ${horasDisp}h (${formatPtaPercentage(pctCarga)}%)`
                      : `El docente tiene ${horasProg}h programadas sobre un máximo de ${horasDisp}h (${formatPtaPercentage(pctCarga)}%)`
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
                  </div>
                </div>
              </div>

              {/* Pie summary — 3 cols mobile, 4 cols desktop */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: 6, marginBottom: 16,
              }}>
                {[
                  { label: 'Doc.', value: horasDocencia, pct: horasProg > 0 ? Math.round((horasDocencia / horasProg) * 100) : 0, color: PTA_COLORS.DOCENCIA },
                  { label: 'Inv.', value: horasInvestigacion, pct: horasProg > 0 ? Math.round((horasInvestigacion / horasProg) * 100) : 0, color: PTA_COLORS.INVESTIGACION },
                  { label: 'Ext.', value: horasExtension, pct: horasProg > 0 ? Math.round((horasExtension / horasProg) * 100) : 0, color: PTA_COLORS.EXTENSION },
                  { label: 'Comp.', value: horasComplementarias, pct: horasProg > 0 ? Math.round((horasComplementarias / horasProg) * 100) : 0, color: PTA_COLORS.COMPLEMENTARIAS },
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
                  { label: 'Programa', value: programaResumen || (tieneTotalidadAcadAdmin ? 'No aplica por AADM 100%' : 'No especificado'), icon: GraduationCap },
                  { label: 'Territorial', value: territorialResumen || (tieneTotalidadAcadAdmin ? 'No aplica por AADM 100%' : 'No especificada'), icon: MapPin },
                  { label: 'Asignaturas', value: `${pta.num_asignaturas || asignaturas.length || 0}${tieneTotalidadAcadAdmin && !asignaturas.length ? ' (No aplica)' : ''}`, icon: BookOpen },
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

          {/* ═══ TAB: Concertación (detalle por componente + aprobar/devolver) ═══ */}
          {activeTab === 'componentes' && (
            <div>
              {/* Header + traza de aprobación granular (antes tab "Aprobación") */}
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
                  // Componentes fijos (Docencia, Investigación, Complementarias, AADM) = 4
                  // + sub-componentes de extensión que tengan horas > 0
                  const extSubKeyMap: Record<string, string> = {
                    capacitacion: 'ext_capacitacion',
                    seleccion: 'ext_procesos',
                    fortalecimiento: 'ext_fortalecimiento',
                    alto_gobierno: 'ext_gobierno',
                    otras: 'ext_secciones',
                  };
                  const extSubKeys = Object.keys(extSubKeyMap);
                  const extConHoras = extSubKeys.filter(k => getSubcomponentHours(k) > 0);
                  const visibleComponenteKeys = new Set([
                    ...docenciaCards.map(c => c.key),
                    'investigacion', 'complementarias',
                    ...extConHoras.map(k => extSubKeyMap[k]),
                  ].filter(key => shouldShowComponentKey(key)));
                  const total = visibleComponenteKeys.size;
                  const aprobados = componentesAprobacionVisibles.filter(c => visibleComponenteKeys.has(c.componente) && c.estado === 'aprobado').length;
                  const devueltos = componentesAprobacionVisibles.filter(c => visibleComponenteKeys.has(c.componente) && c.estado === 'devuelto').length;
                  const pendientes = total - aprobados - devueltos;
                  const pct = total > 0 ? Math.round((aprobados / total) * 100) : 0;
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

              {loadingComponentesAprobacion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 16px', color: '#9CA3AF' }}>
                  <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
                  <span style={{ fontSize: '0.72rem' }}>Actualizando estado de aprobación…</span>
                </div>
              )}

              {/* Docencia — detalle y aprobar/devolver agrupados por nivel (Posgrado,
                  luego Pregrado son componentes independientes, igual que las 4
                  direcciones de Extensión) */}
              {docenciaCards.map(item => {
                const nivelLabel = item.label.split(' - ')[1];
                return (
                  <React.Fragment key={item.key}>
                    {shouldShowComponentKey(item.key) && (
                      <SectionCollapsible
                        title={`Detalle Docencia - ${nivelLabel}`}
                        icon={BookOpen}
                        color="#4472C4"
                        count={item.asignaturas.length}
                        defaultOpen={true}
                      >
                        {item.asignaturas.length > 0 ? (
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
                                {item.asignaturas.map((a: any, i: number) => (
                                  <div key={i} style={{
                                    display: 'grid', gridTemplateColumns: '1fr 56px 46px 58px',
                                    gap: 4, padding: '7px 0',
                                    borderBottom: i < item.asignaturas.length - 1 ? '1px solid #F9FAFB' : 'none',
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
                                      <HierarchySelectionSummary activity={a} accent={PTA_COLORS.DOCENCIA} compact className="mt-1.5" />
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
                                Total Docencia {nivelLabel}: {item.horas}h
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
                            Sin asignaturas de {nivelLabel.toLowerCase()} registradas
                          </p>
                        )}
                      </SectionCollapsible>
                    )}

                    {renderComponentCard(
                      item.key,
                      `Componente Docencia (${nivelLabel})`,
                      BookOpen,
                      PTA_COLORS.DOCENCIA,
                      `Contenido: ${item.asignaturas.length} asignatura(s) (${item.horas}h)`,
                    )}
                  </React.Fragment>
                );
              })}

              {/* Investigación */}
              {shouldShowComponentKey('investigacion') && (
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
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', flex: 1 }}>{p.nombre || 'Proyecto de Investigación (Pendiente Registro)'}</div>
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
                        <HierarchySelectionSummary activity={p} accent="#7C3AED" compact className="mt-1.5" />
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
                        <HierarchySelectionSummary activity={a} accent="#7C3AED" compact className="mt-1.5" />
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
              )}

              {/* Investigación — aprobar/devolver */}
              {renderComponentCard(
                'investigacion',
                'Componente Investigación (Proyectos y Actividades)',
                FlaskConical,
                PTA_COLORS.INVESTIGACION,
                `Contenido: ${(investigacion.proyectos?.length || 0)} proyecto(s), ${(investigacion.actividades?.length || 0)} actividad(es) (${horasInvestigacion}h)`
              )}

              {/* Extensión */}
              {PTA_EXTENSION_COMPONENT_KEYS.some(shouldShowComponentKey) && (
              <SectionCollapsible
                title="Componente Extensión (4 secciones)"
                icon={Globe}
                color="#059669"
              >
                {['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno', 'otras'].filter(sec => {
                  const componentBySection: Record<string, string> = {
                    capacitacion: 'ext_capacitacion',
                    seleccion: 'ext_procesos',
                    fortalecimiento: 'ext_fortalecimiento',
                    alto_gobierno: 'ext_gobierno',
                    otras: 'ext_secciones',
                  };
                  return shouldShowComponentKey(componentBySection[sec]);
                }).map(sec => {
                  const LABELS: Record<string, string> = {
                    capacitacion: 'Dirección de Capacitación',
                    seleccion: 'Dirección de Procesos de Selección',
                    fortalecimiento: 'Dirección de Fortalecimiento y Apoyo a la Gestión Estatal',
                    alto_gobierno: 'Escuela de Alto Gobierno',
                    otras: 'Otras actividades registradas',
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
                          <HierarchySelectionSummary activity={a} accent="#059669" compact className="mt-1.5" />
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
              )}

              {/* Extensión — aprobar/devolver (por subcomponente) */}
              {extensionCards.length > 0 && (
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
                  marginBottom: 16,
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
                  {extensionCards.map(item => renderComponentCard(
                    item.key,
                    item.label,
                    item.icon,
                    item.color,
                    `Horas: ${getSubcomponentHours(item.section)}h`,
                    true,
                  ))}
                </div>
              </motion.div>
              )}

              {/* Complementarias */}
              {shouldShowComponentKey('complementarias') && (
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
                        <HierarchySelectionSummary activity={a} accent="#D97706" compact className="mt-1.5" />
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
              )}

              {/* Complementarias — aprobar/devolver (incluye AADM) */}
              {renderComponentCard(
                'complementarias',
                'Actividades Complementarias',
                Briefcase,
                PTA_COLORS.COMPLEMENTARIAS,
                `Contenido: ${(complementarias.actividades?.length || 0)} actividad(es) (${horasComplementarias}h)` +
                  (acadAdmin.actividades?.length ? ` · incl. ${acadAdmin.actividades.length} académico-administrativa(s) (${horasAcadAdmin}h)` : '')
              )}

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
                  {horasProg}h / {horasDisp}h ({formatPtaPercentage(pctCarga)}%)
                </span>
              </div>
            </div>
          )}

          {/* ═══ TAB: Trazabilidad (traza del proceso + versiones de reporte R-XX) ═══ */}
          {activeTab === 'trazabilidad' && (
            <div>
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
                      <Activity style={{ width: 20, height: 20, color: '#6366F1', strokeWidth: 2.5 }} />
                      Trazabilidad del Proceso
                    </h4>
                    <p style={{ fontSize: '0.74rem', color: '#64748B', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                      Cada aprobación o devolución del PTA queda registrada como una transición de estado. Las transiciones marcadas con <strong>R-XX</strong> generan una versión congelada del reporte: haz clic para ver el estado del PTA en ese momento.
                    </p>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                    background: '#EEF2FF', border: '1px solid #C7D2FE', color: '#4338CA', fontSize: '0.78rem', fontWeight: 800,
                    whiteSpace: 'nowrap',
                  }}>
                    <FileText style={{ width: 14, height: 14 }} />
                    Versión actual: R-{String(reporteVersionActual).padStart(2, '0')}
                  </div>
                </div>
              </div>

              {renderHistorialTimeline()}
            </div>
          )}

          {/* ═══ TAB: Seguimiento / Evidencias ═══ */}
          {activeTab === 'evidencias' && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText style={{ width: 15, height: 15, color: '#059669' }} />
                Evidencias de Seguimiento ({evidenciasVisibles.length})
              </h4>
              {loadingEvidencias ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: '0.82rem' }}>Cargando evidencias...</div>
              ) : evidenciasVisibles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <FileText style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6B7280' }}>Sin evidencias registradas</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>Las evidencias son subidas por el docente durante la ejecución del PTA.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {evidenciasVisibles.map((ev: any) => {
                    const estadoColor = ev.estadoRevision === 'aprobado' ? '#059669' : ev.estadoRevision === 'rechazado' ? '#DC2626' : '#D97706';
                    const estadoBg = ev.estadoRevision === 'aprobado' ? '#D1FAE5' : ev.estadoRevision === 'rechazado' ? '#FEE2E2' : '#FEF3C7';
                    return (
                      <div key={ev.id} style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.nombre}</p>
                            <p style={{ fontSize: '0.7rem', color: '#6B7280', margin: '2px 0 0', display: 'flex', gap: 8 }}>
                              {ev.componentePta && <span style={{ fontWeight: 600, color: '#4F46E5' }}>{ev.componentePta}{(ev.seccionExtension ?? ev.seccion_extension) ? ` · ${ev.seccionExtension ?? ev.seccion_extension}` : ''}</span>}
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
                            {ev.estadoRevision === 'pendiente' && puedeRevisarEvidencia(ev) && (
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
              </div>

              {isPendiente && puedeAprobarNivelActual && (
                <div style={{ display: 'flex', gap: 6 }}>
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
          firmanteNombre={actorNombre || rolLabel}
          firmanteCargo={rolLabel}
          etapaLabel={
            firmaAccion?.tipo === 'componente'
              ? `Aprobación de componente: ${COMPONENTE_LABELS_FIRMA[firmaAccion.componente] || firmaAccion.componente}`
              : firmaAccion?.tipo === 'revision'
                ? `Revisión de componente: ${COMPONENTE_LABELS_FIRMA[firmaAccion.componente] || firmaAccion.componente}`
                  + (firmaAccion.subseccion && firmaAccion.subseccion !== 'general'
                    ? ` (${REVIEW_SUBSECCION_LABEL[firmaAccion.subseccion as PTAReviewSubseccionKey] || firmaAccion.subseccion})`
                    : '')
                : 'Aprobación del PTA'
          }
          correoDestino={firmaCorreoDestino}
          onVerifyCodigo={verificarCodigoFirmaAprobador}
          onFirmaCompleta={handleFirmaCompleta}
          onCancelar={() => { setShowFirmaDigital(false); setFirmaVerificationId(''); setFirmaCorreoDestino(''); setFirmaAccion(null); }}
        />,
        document.body
      )}

    </motion.div>
  );
});
