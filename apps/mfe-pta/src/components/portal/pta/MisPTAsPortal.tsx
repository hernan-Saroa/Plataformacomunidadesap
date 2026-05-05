/**
 * MisPTAsPortal — Vista del docente para gestionar sus PTAs
 * 
 * Features:
 * - Timeline visual de aprobación multinivel
 * - Estadísticas rápidas del periodo
 * - Re-envío de PTAs devueltos con observaciones visibles
 * - Estado visual claro con iconografía
 * - Responsivo mobile-first
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, ChevronLeft, Calendar, Clock, CheckCircle2,
  AlertTriangle, FileSignature, Download, Eye, ArrowRight,
  RotateCcw, XCircle, Send, ChevronRight, MessageSquare,
  BarChart3, Zap, Info, X,
} from 'lucide-react';
import { getPTAsByDocente, seedPTAs, getMisSolicitudesPTA, marcarSolicitudLeida } from '../../../services/api/ptaApi';
import { SolicitudPTAModal } from './SolicitudPTAModal';
import { usePTARealtimeSync } from '../../../hooks/usePTARealtimeSync';
import { PTASyncIndicator } from '../../pta/PTASyncIndicator';
import { PTAForm } from './PTAForm';
import { PTAResumenPrint } from './PTAResumenPrint';
import { RevisionPropuesta } from './RevisionPropuesta';
import { toast } from 'sonner';

interface MisPTAsPortalProps {
  onBack: () => void;
  userPersonId: string;
}

const FLUJO_ESTADOS = [
  { key: 'Borrador', label: 'Borrador', short: 'Borrador' },
  { key: 'Pendiente Jefatura', label: 'Jefatura', short: 'Jefatura' },
  { key: 'Pendiente Decanatura', label: 'Decanatura', short: 'Decanatura' },
  { key: 'Pendiente Gestión Profesoral', label: 'Gestión Profesoral', short: 'G. Profesoral' },
  { key: 'Aprobado', label: 'Aprobado', short: 'Aprobado' },
];

function getEstadoIndex(estado: string): number {
  if (estado === 'Rechazado' || estado === 'Devuelto') return -1;
  const idx = FLUJO_ESTADOS.findIndex(f => f.key === estado);
  return idx >= 0 ? idx : 0;
}

function getStatusConfig(estado: string) {
  switch (estado) {
    case 'Borrador':
      return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', icon: FileText, label: 'Borrador' };
    case 'PROPUESTO_POR_DIRECCION':
      return { bg: '#EFF6FF', color: '#1E40AF', border: '#BFDBFE', icon: FileText, label: 'Propuesta Institucional' };
    case 'NOTIFICADO_DOCENTE':
      return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', icon: AlertTriangle, label: 'Requiere tu revisión' };
    case 'EN_CONCERTACION':
      return { bg: '#F3E8FF', color: '#6B21A8', border: '#DDD6FE', icon: MessageSquare, label: 'En Concertación' };
    case 'CONCERTADO':
      return { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', icon: CheckCircle2, label: 'Concertado' };
    case 'ESCALADO_SNA':
      return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', icon: AlertTriangle, label: 'Escalado a SNA' };
    case 'Pendiente Jefatura':
      return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', icon: Clock, label: 'Pendiente Jefatura' };
    case 'Pendiente Decanatura':
      return { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', icon: Clock, label: 'Pendiente Decanatura' };
    case 'Pendiente Gestión Profesoral':
      return { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC', icon: Clock, label: 'Pendiente G. Profesoral' };
    case 'Aprobado':
      return { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', icon: CheckCircle2, label: 'Aprobado' };
    case 'En Firme':
      return { bg: '#047857', color: '#FFFFFF', border: '#059669', icon: CheckCircle2, label: 'En Firme — Firmado y Radicado' };
    case 'Rechazado':
      return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', icon: XCircle, label: 'Rechazado' };
    case 'Devuelto':
      return { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74', icon: RotateCcw, label: 'Devuelto para corrección' };
    default:
      return { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', icon: FileText, label: estado?.replace(/_/g, ' ') || estado };
  }
}

// ─── Timeline de Aprobación Inline ─────────────────────────────────

function ApprovalTimeline({ estado }: { estado: string }) {
  const currentIdx = getEstadoIndex(estado);
  const isRejected = estado === 'Rechazado';
  const isDevuelto = estado === 'Devuelto';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: '100%', marginTop: 8 }}>
      {FLUJO_ESTADOS.map((step, i) => {
        const isPast = currentIdx > i;
        const isCurrent = currentIdx === i;
        const isFuture = currentIdx < i;
        const isTerminal = isRejected || isDevuelto;

        let dotBg = '#E5E7EB';
        let dotBorder = '#D1D5DB';
        let lineColor = '#E5E7EB';

        if (isPast && !isTerminal) {
          dotBg = '#10B981';
          dotBorder = '#059669';
          lineColor = '#10B981';
        } else if (isCurrent && !isTerminal) {
          dotBg = '#003DA5';
          dotBorder = '#002D7A';
        } else if (isTerminal && i === 0) {
          dotBg = isRejected ? '#EF4444' : '#F59E0B';
          dotBorder = isRejected ? '#DC2626' : '#D97706';
        }

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < FLUJO_ESTADOS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 14 }}>
              <div style={{
                width: isCurrent ? 12 : 8,
                height: isCurrent ? 12 : 8,
                borderRadius: '50%',
                background: dotBg,
                border: `2px solid ${dotBorder}`,
                flexShrink: 0,
                transition: 'all 0.3s',
              }} />
            </div>
            {i < FLUJO_ESTADOS.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: isPast && !isTerminal ? lineColor : '#E5E7EB',
                transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Card de PTA ───────────────────────────────────────────────────

function PTACard({ pta, onEdit, onPrint }: { pta: any; onEdit: (id: string) => void; onPrint: (pta: any) => void }) {
  const config = getStatusConfig(pta.estado);
  const StatusIcon = config.icon;
  const ESTADOS_REVISION_DOCENTE = ['REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3'];
  const isEnRevision = ESTADOS_REVISION_DOCENTE.includes(pta.estado);
  const isActionable = pta.estado === 'Borrador' || pta.estado === 'Devuelto' || isEnRevision;
  const hasObservaciones = pta.estado === 'Devuelto' || pta.estado === 'Rechazado';
  const totalHoras = pta.total_horas_programadas || 0;
  const maxHoras = pta.horas_a_programar || 800;
  const porcentaje = maxHoras > 0 ? Math.min(100, Math.round((totalHoras / maxHoras) * 100)) : 0;

  const lastHistorial = pta.historial?.length > 0 ? pta.historial[pta.historial.length - 1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'white',
        borderRadius: 14,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = '#D1D5DB';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#E5E7EB';
      }}
    >
      <div style={{ padding: '20px 24px' }}>
        {/* Header row */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div style={{
              width: 42, height: 42, borderRadius: 10,
              background: '#EFF6FF', border: '1px solid #DBEAFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <FileSignature style={{ width: 20, height: 20, color: '#003DA5' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>
                PTA Periodo {pta.periodo || '2026-1'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: 1 }}>
                {pta.dedicacion || 'Tiempo Completo'} • Actualizado {new Date(pta.updated_at).toLocaleDateString('es-CO')}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[0.78rem] font-semibold flex-shrink-0 self-start sm:self-auto"
               style={{ background: config.bg, borderColor: config.border, color: config.color }}>
            <StatusIcon className="w-[13px] h-[13px]" />
            {config.label}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>Carga horaria</span>
            <span style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 600 }}>{totalHoras} / {maxHoras} hrs ({porcentaje}%)</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: porcentaje > 100 ? '#EF4444' : porcentaje >= 80 ? '#10B981' : '#003DA5',
              width: `${Math.min(100, porcentaje)}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Componentes summary */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
            📚 {pta.asignaturas?.length || 0} asignatura{(pta.asignaturas?.length || 0) !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
            🔬 {pta.investigacion?.length || 0} investigación
          </span>
          <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
            🌐 {pta.extension?.length || 0} extensión
          </span>
        </div>

        {/* Timeline */}
        <div style={{ marginBottom: hasObservaciones ? 12 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            {FLUJO_ESTADOS.map(s => (
              <span key={s.key} style={{
                fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 500,
                textAlign: 'center', flex: 1,
              }}>
                {s.short}
              </span>
            ))}
          </div>
          <ApprovalTimeline estado={pta.estado} />
        </div>

        {/* Observaciones de rechazo/devolución */}
        {hasObservaciones && (pta.observaciones_rechazo || pta.motivo_devolucion) && (
          <div style={{
            marginTop: 8, padding: '10px 14px', borderRadius: 10,
            background: pta.estado === 'Rechazado' ? '#FEF2F2' : '#FFFBEB',
            border: `1px solid ${pta.estado === 'Rechazado' ? '#FECACA' : '#FDE68A'}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              fontSize: '0.78rem', fontWeight: 600,
              color: pta.estado === 'Rechazado' ? '#991B1B' : '#92400E',
            }}>
              <MessageSquare style={{ width: 13, height: 13 }} />
              {pta.estado === 'Rechazado' ? 'Motivo del rechazo' : 'Observaciones para corrección'}
            </div>
            <p style={{ fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.5, margin: 0 }}>
              {pta.observaciones_rechazo || pta.motivo_devolucion}
            </p>
            {lastHistorial?.actor && (
              <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>
                — {lastHistorial.actor} • {new Date(lastHistorial.fecha).toLocaleDateString('es-CO')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', borderTop: '1px solid #F3F4F6', background: '#FAFBFC',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => onEdit(pta.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              border: 'none', background: 'transparent',
              color: '#003DA5', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#EFF6FF'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Eye style={{ width: 15, height: 15 }} />
            {isActionable ? 'Editar' : 'Ver detalle'}
          </button>
          <button
            onClick={() => onPrint(pta)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 8,
              border: 'none', background: 'transparent',
              color: '#6B7280', fontSize: '0.85rem', fontWeight: 500,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Download style={{ width: 15, height: 15 }} />
            PDF
          </button>
        </div>

        {isEnRevision && (
          <button
            onClick={() => onEdit(pta.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 16px', borderRadius: 8,
              border: 'none', background: '#7C3AED',
              color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <CheckCircle2 style={{ width: 15, height: 15 }} />
            {pta.estado === 'REVISION_DOCENTE_N1' ? 'Revisar aprobación Jefatura'
              : pta.estado === 'REVISION_DOCENTE_N2' ? 'Revisar aprobación Decanatura'
              : 'Revisar aprobación G. Profesoral'}
          </button>
        )}
        {pta.estado === 'Devuelto' && (
          <button
            onClick={() => onEdit(pta.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 16px', borderRadius: 8,
              border: 'none', background: '#003DA5',
              color: 'white', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#002D7A'}
            onMouseLeave={e => e.currentTarget.style.background = '#003DA5'}
          >
            <Send style={{ width: 14, height: 14 }} />
            Corregir y re-enviar
          </button>
        )}
        {(pta.estado === 'NOTIFICADO_DOCENTE' || pta.estado === 'PROPUESTO_POR_DIRECCION') && (
          <button
            onClick={() => onEdit(pta.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 16px', borderRadius: 8,
              border: 'none', background: '#D97706',
              color: 'white', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <Eye style={{ width: 14, height: 14 }} />
            Revisar Propuesta
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────

export function MisPTAsPortal({ onBack, userPersonId }: MisPTAsPortalProps) {
  const [ptas, setPtas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form' | 'revision'>('list');
  const [selectedPtaId, setSelectedPtaId] = useState<string | null>(null);
  const [printPta, setPrintPta] = useState<any | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [solicitudesResueltas, setSolicitudesResueltas] = useState<any[]>([]);

  // ═══ Real-time sync with Backoffice ═══
  const syncState = usePTARealtimeSync({
    sistema: 'portal',
    interval: 10000,
    docenteId: userPersonId,
    enabled: view === 'list',
    onDataChanged: (events) => {
      console.log(`[Portal Sync] ${events.length} nuevos eventos del Backoffice`);
      loadPTAs();
    },
  });

  const loadPTAs = async () => {
    setLoading(true);
    try {
      // Auto-seed desactivado: solo se muestran PTAs reales del docente
      const res = await getPTAsByDocente(userPersonId);
      if (res.success && Array.isArray(res.data)) {
        setPtas(res.data);
      } else {
        console.warn('[Portal MisPTAs] Response data is not an array:', res);
        setPtas([]);
      }
    } catch (error) {
      console.error('[Portal MisPTAs] Error loading PTAs:', error);
      setPtas([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadPTAs(); loadSolicitudes(); }, [userPersonId]);

  const loadSolicitudes = async () => {
    const res = await getMisSolicitudesPTA(userPersonId);
    if (res.success && Array.isArray(res.data)) {
      setSolicitudesResueltas(res.data.filter((s: any) => s.estado !== 'pendiente' && !s.notificacionLeida));
    }
  };

  const handleDismissSolicitud = async (id: string) => {
    await marcarSolicitudLeida(id);
    setSolicitudesResueltas(prev => prev.filter(s => s.id !== id));
  };

  const handleCreate = () => { setSelectedPtaId(null); setView('form'); };
  const handleEdit = (id: string) => {
    const pta = ptas.find(p => p.id === id);
    // Route bidirectional PTAs to VA02 RevisionPropuesta
    if (pta && ['PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE'].includes(pta.estado)) {
      setSelectedPtaId(id);
      setView('revision');
    } else {
      setSelectedPtaId(id);
      setView('form');
    }
  };
  const handleBackFromForm = () => { setView('list'); loadPTAs(); };

  if (view === 'revision' && selectedPtaId) {
    return <RevisionPropuesta ptaId={selectedPtaId} onBack={handleBackFromForm} userPersonId={userPersonId} />;
  }

  if (view === 'form') {
    return <PTAForm onBack={handleBackFromForm} userPersonId={userPersonId} ptaId={selectedPtaId} />;
  }

  // Stats
  const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
  const enRevision = ptas.filter(p => p.estado?.includes('Pendiente')).length;
  const devueltos = ptas.filter(p => p.estado === 'Devuelto').length;
  const borradores = ptas.filter(p => p.estado === 'Borrador').length;

  // Filtrar
  const ptasFiltrados = filtroEstado === 'todos' ? ptas
    : filtroEstado === 'pendientes' ? ptas.filter(p => p.estado?.includes('Pendiente'))
    : filtroEstado === 'devueltos' ? ptas.filter(p => p.estado === 'Devuelto')
    : ptas.filter(p => p.estado === filtroEstado);

  const filtros = [
    { key: 'todos', label: 'Todos', count: ptas.length },
    { key: 'Borrador', label: 'Borradores', count: borradores },
    { key: 'pendientes', label: 'En revisión', count: enRevision },
    { key: 'devueltos', label: 'Devueltos', count: devueltos },
    { key: 'Aprobado', label: 'Aprobados', count: aprobados },
  ];

  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-7">
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.88rem', color: '#6B7280', fontWeight: 500,
            padding: 0, marginBottom: 4, transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#111827'}
          onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
        >
          <ChevronLeft style={{ width: 16, height: 16 }} />
          Volver al portal
        </button>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mt-1">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 m-0 flex items-center gap-2.5">
              <FileSignature className="w-[26px] h-[26px] text-brand-blue" style={{ color: '#003DA5' }} />
              Mis Planes de Trabajo Académico
            </h1>
            <p className="text-[0.92rem] text-slate-500 mt-1">
              Gestiona tu programación docente y realiza seguimiento al flujo de aprobación
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <PTASyncIndicator
              syncState={syncState}
              sistema="portal"
              compact
            />
            <button
              onClick={handleCreate}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border-none bg-brand-blue text-white text-sm font-semibold cursor-pointer transition-all shadow-md hover:bg-brand-blue-dark w-full sm:w-auto"
              style={{ background: '#003DA5', boxShadow: '0 2px 6px rgba(0,61,165,0.2)' }}
              onMouseEnter={e => e.currentTarget.style.background = '#002D7A'}
              onMouseLeave={e => e.currentTarget.style.background = '#003DA5'}
            >
              <Plus className="w-[18px] h-[18px]" />
              Crear Nuevo PTA
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Periodo Actual', value: '2026-1', icon: Calendar, iconBg: '#EFF6FF', iconColor: '#003DA5' },
          { label: 'Aprobados', value: String(aprobados), icon: CheckCircle2, iconBg: '#D1FAE5', iconColor: '#059669' },
          { label: 'En Revisión', value: String(enRevision), icon: Clock, iconBg: '#FEF3C7', iconColor: '#D97706' },
          { label: 'Requieren Acción', value: String(devueltos + borradores), icon: AlertTriangle, iconBg: '#FEE2E2', iconColor: '#DC2626' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
            padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <stat.icon style={{ width: 20, height: 20, color: stat.iconColor }} />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>{stat.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-1.5 mb-6 bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
        {filtros.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-none text-sm transition-all flex-1 min-w-[120px] ${filtroEstado === f.key ? 'bg-brand-blue text-white font-semibold' : 'bg-transparent text-slate-500 font-medium hover:bg-slate-50'}`}
            style={{
              background: filtroEstado === f.key ? '#003DA5' : undefined,
            }}
          >
            <span className="whitespace-nowrap">{f.label}</span>
            <span className={`text-[0.72rem] font-bold px-1.5 py-[1px] rounded-lg ${filtroEstado === f.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Info del flujo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 10,
        background: '#F0F9FF', border: '1px solid #BAE6FD',
        marginBottom: 12, fontSize: '0.82rem', color: '#0369A1',
      }}>
        <Info style={{ width: 15, height: 15, flexShrink: 0 }} />
        <span>
          <strong>Flujo de aprobación:</strong> Borrador → Jefatura de Programa → Decanatura → Gestión Profesoral → Aprobado
        </span>
      </div>

      {/* Banner: Ya tiene PTA activo — ofrecer solicitud */}
      {ptas.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '10px 16px', borderRadius: 10,
          background: '#FEF3C7', border: '1px solid #FDE68A',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#92400E' }}>
            <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
            <span>Solo se permite un PTA activo a la vez.</span>
          </div>
          <button
            onClick={() => setShowSolicitudModal(true)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid #D97706', background: 'white',
              color: '#92400E', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Plus style={{ width: 13, height: 13 }} />
            Necesita crear otro PTA?
          </button>
        </div>
      )}

      {/* Lista de PTAs */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#003DA5',
            borderRadius: '50%', animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: '0.9rem', color: '#6B7280' }}>Cargando tus planes de trabajo...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : ptasFiltrados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 24px',
          background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#F3F4F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <FileText style={{ width: 28, height: 28, color: '#9CA3AF' }} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: '0 0 6px' }}>
            {ptas.length === 0 ? 'No tienes PTAs registrados' : 'No hay PTAs con este filtro'}
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6B7280', maxWidth: 400, margin: '0 auto 20px' }}>
            {ptas.length === 0
              ? 'Crea tu primer Plan de Trabajo Académico para el periodo vigente.'
              : 'Intenta con un filtro diferente para ver más resultados.'
            }
          </p>
          {ptas.length === 0 && (
            <button
              onClick={handleCreate}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#003DA5', fontWeight: 600, fontSize: '0.9rem',
                background: 'none', border: 'none', cursor: 'pointer',
              }}
            >
              Crear mi primer PTA <ArrowRight style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ptasFiltrados.map(pta => (
            <PTACard key={pta.id} pta={pta} onEdit={handleEdit} onPrint={setPrintPta} />
          ))}
        </div>
      )}

      {/* Notificaciones de solicitudes resueltas */}
      {solicitudesResueltas.map(sol => (
        <div key={sol.id} style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
          maxWidth: 400, padding: '16px 20px', borderRadius: 14,
          background: sol.estado === 'aprobado' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${sol.estado === 'aprobado' ? '#6EE7B7' : '#FECACA'}`,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {sol.estado === 'aprobado'
                ? <CheckCircle2 style={{ width: 18, height: 18, color: '#059669' }} />
                : <XCircle style={{ width: 18, height: 18, color: '#DC2626' }} />}
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: sol.estado === 'aprobado' ? '#065F46' : '#991B1B' }}>
                Solicitud {sol.estado === 'aprobado' ? 'aprobada' : 'denegada'}
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
          {sol.estado === 'aprobado' && (
            <p style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, margin: 0 }}>
              {sol.resolucionAccion === 'caso_1' ? 'Puede crear un PTA en la nueva territorial' : 'Su PTA anterior fue eliminado — puede crear uno nuevo'}
            </p>
          )}
          <button
            onClick={() => handleDismissSolicitud(sol.id)}
            style={{ marginTop: 10, width: '100%', padding: '7px 14px', borderRadius: 8, border: 'none', background: sol.estado === 'aprobado' ? '#059669' : '#6B7280', color: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Entendido
          </button>
        </div>
      ))}

      {/* Print modal */}
      {printPta && (
        <PTAResumenPrint
          pta={printPta}
          userPersonId={userPersonId}
          onClose={() => setPrintPta(null)}
        />
      )}

      {/* Modal de solicitud de nuevo PTA */}
      {showSolicitudModal && (
        <SolicitudPTAModal
          docenteId={userPersonId}
          docenteNombre=""
          onClose={() => setShowSolicitudModal(false)}
          onSuccess={() => { loadPTAs(); loadSolicitudes(); }}
        />
      )}
    </div>
  );
}
