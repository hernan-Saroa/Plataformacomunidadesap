/**
 * VA03 — Mesa de Concertación (World-Class Redesign)
 *
 * Vista compartida entre Docente y Dirección para:
 * - Comparar propuesta institucional vs contrapropuesta docente (barras visuales)
 * - Chat de negociación en tiempo real estilo Slack/Teams
 * - Documentar acuerdos y compromisos con firma
 * - Cerrar con acuerdo o escalar a SNA
 * - Timeline de estados del proceso
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, MessageSquare, CheckCircle2, AlertTriangle, Send,
  ArrowUpRight, FileText, Clock, Users, BookOpen, FlaskConical,
  Globe, Briefcase, Scale, X, TrendingUp, Award, Check, Info,
  Hash, Loader2, BarChart3, Sparkles,
} from 'lucide-react';
import {
  getPTAById, agregarComentarioConcertacion, cerrarConcertacion,
  escalarConcertacion, enviarAprobacionPTA,
} from '../../services/api/ptaApi';
import { toast } from 'sonner';

interface MesaConcertacionProps {
  ptaId: string;
  onBack: () => void;
  userRole?: 'docente' | 'direccion';
  userName?: string;
}

const ESTADO_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'EN_CONCERTACION': { label: 'En Concertación', color: '#6B21A8', bg: '#F3E8FF', border: '#DDD6FE' },
  'ESCALADO_SNA':    { label: 'Escalado a SNA',  color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5' },
  'CONCERTADO':      { label: 'Concertado',       color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' },
  'AJUSTE_REQUERIDO':{ label: 'Ajuste Requerido', color: '#92400E', bg: '#FEF3C7', border: '#FDE68A' },
};

const COMPONENTE_META = [
  { key: 'investigacion', label: 'Investigación', icon: FlaskConical, color: '#7C3AED', maxPct: 0.25 },
  { key: 'extension',     label: 'Extensión',     icon: Globe,       color: '#059669', maxPct: 0.25 },
  { key: 'complementarias', label: 'Complementarias', icon: Briefcase, color: '#D97706', maxPct: 0.20 },
];

// ── Barra comparativa visual ────────────────────────────────────────────
function ComparativaBar({
  label, icon: Icon, color, horasDir, horasDoc, maxHoras,
}: {
  label: string; icon: any; color: string;
  horasDir: number; horasDoc: number; maxHoras: number;
}) {
  const pctDir = maxHoras > 0 ? Math.min((horasDir / maxHoras) * 100, 100) : 0;
  const pctDoc = maxHoras > 0 ? Math.min((horasDoc / maxHoras) * 100, 100) : 0;
  const diff = horasDoc - horasDir;
  const hasDiff = diff !== 0;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon style={{ width: 12, height: 12, color }} />
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 700 }}>{horasDir}h</span>
          <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>→</span>
          <span style={{ fontSize: '0.72rem', color: '#6B21A8', fontWeight: 700 }}>{horasDoc}h</span>
          {hasDiff && (
            <span style={{
              padding: '1px 6px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 800,
              background: diff > 0 ? '#D1FAE5' : '#FEE2E2',
              color: diff > 0 ? '#065F46' : '#991B1B',
            }}>
              {diff > 0 ? '+' : ''}{diff}h
            </span>
          )}
        </div>
      </div>
      {/* Dual bar */}
      <div style={{ position: 'relative', height: 22 }}>
        {/* Background track */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 4, background: '#F3F4F6' }} />
        {/* Dir bar (blue) */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctDir}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            borderRadius: 4, background: '#BFDBFE', opacity: 0.9,
          }}
        />
        {/* Doc bar (purple, slightly taller) */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pctDoc}%` }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
          style={{
            position: 'absolute', top: 4, left: 0, bottom: 4,
            borderRadius: 3, background: color,
          }}
        />
        {/* Labels */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', paddingLeft: 8, gap: 4,
        }}>
          <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)', zIndex: 1 }}>
            {pctDoc.toFixed(0)}% del disponible
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Mensaje de chat ─────────────────────────────────────────────────────
function ChatBubble({ msg, isOwn }: { msg: any; isOwn: boolean }) {
  const fecha = msg.fecha ? new Date(msg.fecha) : new Date();
  const timeStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const dateStr = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  const isToday = new Date().toDateString() === fecha.toDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 10 }}
    >
      {!isOwn && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 800, color: 'white',
          marginRight: 6, marginTop: 2,
        }}>
          {(msg.autor || 'D').charAt(0).toUpperCase()}
        </div>
      )}
      <div style={{ maxWidth: '75%' }}>
        <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5, justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: isOwn ? '#1E40AF' : '#7C3AED' }}>
            {msg.autor || 'Usuario'}
          </span>
          <span style={{ fontSize: '0.55rem', color: '#9CA3AF' }}>
            {isToday ? timeStr : `${dateStr} ${timeStr}`}
          </span>
        </div>
        <div style={{
          padding: '10px 13px',
          borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isOwn
            ? 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)'
            : '#F3F4F6',
          color: isOwn ? 'white' : '#374151',
          fontSize: '0.8rem',
          boxShadow: isOwn ? '0 2px 8px rgba(0,61,165,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
          lineHeight: 1.5,
        }}>
          {msg.mensaje}
        </div>
        {/* Read status for own messages */}
        {isOwn && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
            <Check style={{ width: 11, height: 11, color: '#6EE7B7' }} />
          </div>
        )}
      </div>
      {isOwn && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #003DA5, #1E40AF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 800, color: 'white',
          marginLeft: 6, marginTop: 2,
        }}>
          {(msg.autor || 'D').charAt(0).toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}

// ── Timeline de proceso ─────────────────────────────────────────────────
function ProcesoPipeline({ estado }: { estado: string }) {
  const steps = [
    { key: 'PROPUESTO_POR_DIRECCION', label: 'Propuesto' },
    { key: 'NOTIFICADO_DOCENTE', label: 'Notificado' },
    { key: 'EN_CONCERTACION', label: 'Concertación' },
    { key: 'CONCERTADO', label: 'Concertado' },
    { key: 'APROBADO', label: 'Aprobado' },
  ];
  const ORDER = steps.map(s => s.key);
  const currentIdx = ORDER.indexOf(estado);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '8px 0' }}>
      {steps.map((step, i) => {
        const done = i < currentIdx || (i === currentIdx && estado === 'CONCERTADO');
        const current = i === currentIdx && estado !== 'CONCERTADO';
        return (
          <div key={step.key} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: done ? '#059669' : current ? '#6B21A8' : '#E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: current ? '2.5px solid #7C3AED' : done ? '2px solid #059669' : '1.5px solid #D1D5DB',
                transition: 'all 0.3s',
              }}>
                {done
                  ? <Check style={{ width: 11, height: 11, color: 'white' }} />
                  : <span style={{ fontSize: '0.55rem', fontWeight: 800, color: current ? 'white' : '#9CA3AF' }}>{i + 1}</span>
                }
              </div>
              <span style={{ fontSize: '0.5rem', color: done ? '#059669' : current ? '#6B21A8' : '#9CA3AF', fontWeight: done || current ? 700 : 400, marginTop: 2, textAlign: 'center' }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: '0 0 8px', height: 2, background: done ? '#6EE7B7' : '#E5E7EB', marginBottom: 12 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sugerencias rápidas ─────────────────────────────────────────────────
const QUICK_REPLIES = [
  '¿Podría explicar la distribución de horas de investigación?',
  'Propongo ajustar las horas de extensión a 80h.',
  'Acepto la propuesta con la modificación indicada.',
  'Requiero más información antes de decidir.',
];

export function MesaConcertacion({ ptaId, onBack, userRole = 'direccion', userName = 'Director' }: MesaConcertacionProps) {
  const [pta, setPta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState('');
  const [sending, setSending] = useState(false);
  const [showActa, setShowActa] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [activePanel, setActivePanel] = useState<'comparativo' | 'chat' | 'acta'>('chat');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Acta state
  const [acuerdos, setAcuerdos] = useState('');
  const [compDocente, setCompDocente] = useState('');
  const [compDireccion, setCompDireccion] = useState('');
  const [firmaDocente, setFirmaDocente] = useState(false);
  const [firmaDireccion, setFirmaDireccion] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const loadPta = async () => {
    const res = await getPTAById(ptaId);
    if (res.success) setPta(res.data);
    setLoading(false);
  };

  useEffect(() => { loadPta(); }, [ptaId]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [pta?.concertacion?.comentarios]);

  const handleSendComment = async (texto?: string) => {
    const msgText = texto || mensaje.trim();
    if (!msgText) return;
    setSending(true);
    setShowQuickReplies(false);
    const res = await agregarComentarioConcertacion(ptaId, {
      autor: userName,
      autor_rol: userRole === 'docente' ? 'Docente' : 'Dirección',
      mensaje: msgText,
    });
    if (res.success) {
      setPta(res.data);
      setMensaje('');
    } else {
      toast.error('Error al enviar comentario');
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleCerrar = async () => {
    if (!acuerdos.trim()) { toast.error('Debe documentar los acuerdos'); return; }
    setSending(true);
    const res = await cerrarConcertacion(ptaId, {
      acuerdos,
      compromisos_docente: compDocente,
      compromisos_direccion: compDireccion,
      firma_docente: firmaDocente,
      firma_direccion: firmaDireccion,
      cerrado_por: userName,
      cerrado_por_rol: userRole === 'docente' ? 'Docente' : 'Dirección',
    });
    if (res.success) {
      toast.success('Concertación cerrada con acuerdo ✓');
      setPta(res.data);
      setShowActa(false);
    }
    setSending(false);
  };

  const handleEscalar = async () => {
    if (!window.confirm('¿Confirma que desea escalar a la SNA? Esta acción iniciará mediación formal.')) return;
    setSending(true);
    const res = await escalarConcertacion(ptaId, {
      motivo: 'Sin acuerdo en concertación. Se requiere mediación de la SNA.',
      escalado_por: userName,
    });
    if (res.success) {
      toast.success('Escalado a SNA para mediación');
      setPta(res.data);
    }
    setSending(false);
  };

  const handleEnviarAprobacion = async () => {
    setSending(true);
    const res = await enviarAprobacionPTA(ptaId, { enviado_por: userName });
    if (res.success) {
      toast.success('PTA enviado al flujo de aprobación 🎉');
      onBack();
    }
    setSending(false);
  };

  // ── Datos computados ──────────────────────────────────────────────────
  const propuesta = pta?.propuesta_direccion || {};
  const respuesta = pta?.respuesta_docente || {};
  const comentarios = pta?.concertacion?.comentarios || [];
  const horasBase = pta?.horas_a_programar || 800;
  const isConcertado = pta?.estado === 'CONCERTADO';
  const isEscalado = pta?.estado === 'ESCALADO_SNA';
  const estadoInfo = pta ? (ESTADO_LABELS[pta.estado] || { label: pta.estado, color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' }) : { label: '', color: '#4B5563', bg: '#F3F4F6', border: '#E5E7EB' };

  const comparativo = useMemo(() => [
    {
      key: 'investigacion', label: 'Investigación', icon: FlaskConical, color: '#7C3AED',
      horasDir: propuesta.horas_investigacion || 0,
      horasDoc: respuesta.contrapropuesta?.investigacion ?? (propuesta.horas_investigacion || 0),
    },
    {
      key: 'extension', label: 'Extensión', icon: Globe, color: '#059669',
      horasDir: propuesta.horas_extension || 0,
      horasDoc: respuesta.contrapropuesta?.extension ?? (propuesta.horas_extension || 0),
    },
    {
      key: 'complementarias', label: 'Complementarias', icon: Briefcase, color: '#D97706',
      horasDir: propuesta.horas_complementarias || 0,
      horasDoc: pta?.horas_complementarias ?? (propuesta.horas_complementarias || 0),
    },
    {
      key: 'academicas_admin', label: 'Acad. Admin.', icon: Award, color: '#6B21A8',
      horasDir: propuesta.horas_acad_admin || 0,
      horasDoc: pta?.horas_acad_admin ?? (propuesta.horas_acad_admin || 0),
    },
  ], [pta, propuesta, respuesta]);

  const totalDir = (propuesta.horas_docencia || 0) + comparativo.reduce((t, c) => t + c.horasDir, 0);
  const totalDoc = (propuesta.horas_docencia || 0) + comparativo.reduce((t, c) => t + c.horasDoc, 0);
  const diffTotal = totalDoc - totalDir;

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <Loader2 style={{ width: 32, height: 32, color: '#003DA5', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>Cargando mesa de concertación...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  if (!pta) return <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>PTA no encontrado</p>;

  // ── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* ── Back + Header ──────────────────────────────────────────────── */}
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: '0.78rem', fontWeight: 600, color: '#6B7280',
        background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px',
        marginBottom: 4,
      }}>
        <ChevronLeft style={{ width: 14, height: 14 }} /> Volver a Gestión
      </button>

      {/* Page header */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', marginBottom: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: 'linear-gradient(135deg, #6B21A8, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Scale style={{ width: 20, height: 20, color: 'white' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                Mesa de Concertación
                <span style={{ padding: '2px 8px', borderRadius: 6, background: estadoInfo.bg, color: estadoInfo.color, border: `1px solid ${estadoInfo.border}`, fontSize: '0.65rem', fontWeight: 700 }}>
                  {estadoInfo.label}
                </span>
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>
                Docente: <strong style={{ color: '#374151' }}>{pta.docente_nombre}</strong>
                <span style={{ color: '#D1D5DB', margin: '0 6px' }}>·</span>
                Periodo {pta.periodo}
                <span style={{ color: '#D1D5DB', margin: '0 6px' }}>·</span>
                {comentarios.length} mensaje{comentarios.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isConcertado && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleEnviarAprobacion} disabled={sending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                  borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #003DA5, #1E40AF)',
                  color: 'white', fontSize: '0.82rem', fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,61,165,0.3)', cursor: 'pointer',
                  opacity: sending ? 0.7 : 1,
                }}
              >
                <Send style={{ width: 14, height: 14 }} /> Enviar a Aprobación
              </motion.button>
            )}
            {!isConcertado && !isEscalado && (
              <>
                {!pta.concertacion?.acta && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowActa(true); setActivePanel('acta'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                      borderRadius: 9, border: '1.5px solid #6EE7B7', background: '#D1FAE5',
                      color: '#065F46', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 style={{ width: 13, height: 13 }} /> Cerrar Acuerdo
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleEscalar} disabled={sending}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px',
                    borderRadius: 9, border: '1px solid #FCA5A5', background: '#FEF2F2',
                    color: '#991B1B', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    opacity: sending ? 0.7 : 1,
                  }}
                >
                  <ArrowUpRight style={{ width: 13, height: 13 }} /> Escalar a SNA
                </motion.button>
              </>
            )}
          </div>
        </div>
        {/* Process pipeline */}
        <ProcesoPipeline estado={pta.estado} />
      </div>

      {/* ── Mobile tab nav ─────────────────────────────────────────────── */}
      {isMobile && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { key: 'comparativo', label: 'Comparativo', icon: BarChart3 },
            { key: 'chat', label: `Chat (${comentarios.length})`, icon: MessageSquare },
            { key: 'acta', label: 'Acta', icon: FileText },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActivePanel(tab.key as any)}
              style={{
                padding: '7px 14px', borderRadius: 8, border: activePanel === tab.key ? '1.5px solid #6B21A8' : '1px solid #E5E7EB',
                background: activePanel === tab.key ? '#F3E8FF' : 'white',
                color: activePanel === tab.key ? '#6B21A8' : '#6B7280',
                fontSize: '0.78rem', fontWeight: activePanel === tab.key ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              <tab.icon style={{ width: 12, height: 12 }} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 360px',
        gap: 14,
        alignItems: 'start',
      }}>

        {/* ── LEFT: Comparativo + Acta ───────────────────────────────── */}
        {(!isMobile || activePanel === 'comparativo' || activePanel === 'acta') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Comparativo */}
            {(!isMobile || activePanel === 'comparativo') && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp style={{ width: 14, height: 14, color: '#003DA5' }} />
                    Comparativo de Propuestas
                  </h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: '#BFDBFE' }} />
                      <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600 }}>Dirección</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: '#7C3AED' }} />
                      <span style={{ fontSize: '0.62rem', color: '#6B7280', fontWeight: 600 }}>Docente</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px 16px' }}>
                  {/* Docencia (no cambia) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <BookOpen style={{ width: 14, height: 14, color: '#003DA5' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E40AF' }}>Docencia</span>
                    <span style={{ fontSize: '0.72rem', color: '#1E40AF', fontWeight: 800, marginLeft: 'auto' }}>{propuesta.horas_docencia || 0}h</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: '#DBEAFE', color: '#1E40AF', fontSize: '0.6rem', fontWeight: 700 }}>Sin cambio</span>
                  </div>

                  {/* Componentes con barra dual */}
                  {comparativo.map(c => (
                    <ComparativaBar
                      key={c.key}
                      label={c.label}
                      icon={c.icon}
                      color={c.color}
                      horasDir={c.horasDir}
                      horasDoc={c.horasDoc}
                      maxHoras={horasBase}
                    />
                  ))}

                  {/* Total */}
                  <div style={{ borderTop: '2px solid #E5E7EB', paddingTop: 12, marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>Total Programado</span>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF' }}>{totalDir}h</span>
                      <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>→</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6B21A8' }}>{totalDoc}h</span>
                      {diffTotal !== 0 && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 800,
                          background: diffTotal > 0 ? '#D1FAE5' : '#FEE2E2',
                          color: diffTotal > 0 ? '#065F46' : '#991B1B',
                        }}>
                          {diffTotal > 0 ? '+' : ''}{diffTotal}h
                        </span>
                      )}
                    </div>
                  </div>
                  {Math.abs(totalDoc - horasBase) > 5 && (
                    <div style={{ marginTop: 8, padding: '6px 10px', borderRadius: 7, background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle style={{ width: 12, height: 12, color: '#D97706', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', color: '#92400E' }}>
                        {totalDoc > horasBase
                          ? `Propuesta docente excede el disponible en ${totalDoc - horasBase}h`
                          : `Propuesta docente es ${horasBase - totalDoc}h menor al disponible`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Decisión del Docente */}
                {respuesta.decision && (
                  <div style={{ margin: '0 16px 14px', padding: '10px 14px', borderRadius: 9, border: `1px solid ${respuesta.decision === 'ACEPTAR' ? '#6EE7B7' : respuesta.decision === 'OBJETAR' ? '#FCA5A5' : '#FDE68A'}`, background: respuesta.decision === 'ACEPTAR' ? '#F0FDF4' : respuesta.decision === 'OBJETAR' ? '#FEF2F2' : '#FFFBEB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      {respuesta.decision === 'ACEPTAR' ? <CheckCircle2 style={{ width: 13, height: 13, color: '#059669' }} /> : respuesta.decision === 'OBJETAR' ? <X style={{ width: 13, height: 13, color: '#DC2626' }} /> : <AlertTriangle style={{ width: 13, height: 13, color: '#D97706' }} />}
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: respuesta.decision === 'ACEPTAR' ? '#065F46' : respuesta.decision === 'OBJETAR' ? '#991B1B' : '#92400E' }}>
                        Decisión del Docente: {respuesta.decision}
                      </span>
                    </div>
                    {respuesta.justificacion && <p style={{ fontSize: '0.72rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>{respuesta.justificacion}</p>}
                  </div>
                )}
              </motion.div>
            )}

            {/* Acta de Concertación */}
            {(!isMobile || activePanel === 'acta') && (showActa || pta.concertacion?.acta) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'white', borderRadius: 14, border: '1px solid #6EE7B7', overflow: 'hidden', boxShadow: '0 1px 8px rgba(5,150,105,0.08)' }}
              >
                <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #D1FAE5 0%, #ECFDF5 100%)', borderBottom: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#065F46', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award style={{ width: 14, height: 14, color: '#059669' }} />
                    Acta de Concertación
                  </h3>
                  {!pta.concertacion?.acta && (
                    <button onClick={() => setShowActa(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>

                {pta.concertacion?.acta ? (
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Acuerdos alcanzados</div>
                      <p style={{ fontSize: '0.78rem', color: '#4B5563', margin: 0, lineHeight: 1.6, background: '#F9FAFB', padding: '8px 10px', borderRadius: 7 }}>{pta.concertacion.acta.acuerdos}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 3 }}>Compromisos Docente</div>
                        <p style={{ fontSize: '0.75rem', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>{pta.concertacion.acta.compromisos_docente || '—'}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 3 }}>Compromisos Dirección</div>
                        <p style={{ fontSize: '0.75rem', color: '#4B5563', margin: 0, lineHeight: 1.5 }}>{pta.concertacion.acta.compromisos_direccion || '—'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      {[
                        { label: 'Firma Docente', firmado: pta.concertacion.acta.firma_docente },
                        { label: 'Firma Director', firmado: pta.concertacion.acta.firma_direccion },
                      ].map(f => (
                        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: f.firmado ? '#D1FAE5' : '#F3F4F6' }}>
                          {f.firmado ? <CheckCircle2 style={{ width: 13, height: 13, color: '#059669' }} /> : <Clock style={{ width: 13, height: 13, color: '#9CA3AF' }} />}
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: f.firmado ? '#065F46' : '#9CA3AF' }}>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                        Acuerdos alcanzados <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <textarea
                        value={acuerdos} onChange={e => setAcuerdos(e.target.value)}
                        rows={3} placeholder="Descripción de los acuerdos alcanzados en la negociación..."
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: '0.78rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>Compromisos Docente</label>
                        <textarea value={compDocente} onChange={e => setCompDocente(e.target.value)} rows={2} placeholder="Opcional..."
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.75rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#374151', marginBottom: 4 }}>Compromisos Dirección</label>
                        <textarea value={compDireccion} onChange={e => setCompDireccion(e.target.value)} rows={2} placeholder="Opcional..."
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.75rem', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
                      {[
                        { key: 'docente', label: 'Firma Docente', value: firmaDocente, onChange: setFirmaDocente },
                        { key: 'dir', label: 'Firma Director', value: firmaDireccion, onChange: setFirmaDireccion },
                      ].map(f => (
                        <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <div
                            onClick={() => f.onChange(!f.value)}
                            style={{
                              width: 18, height: 18, borderRadius: 4, border: f.value ? 'none' : '1.5px solid #D1D5DB',
                              background: f.value ? '#059669' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                            }}
                          >
                            {f.value && <Check style={{ width: 11, height: 11, color: 'white' }} />}
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}>{f.label}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleCerrar} disabled={sending || !acuerdos.trim()}
                      style={{
                        width: '100%', padding: '10px 16px', borderRadius: 9, border: 'none',
                        background: acuerdos.trim() ? 'linear-gradient(135deg, #059669, #047857)' : '#E5E7EB',
                        color: acuerdos.trim() ? 'white' : '#9CA3AF',
                        fontSize: '0.82rem', fontWeight: 700, cursor: acuerdos.trim() ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        boxShadow: acuerdos.trim() ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
                        transition: 'all 0.15s',
                      }}
                    >
                      {sending ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 style={{ width: 14, height: 14 }} />}
                      Firmar y Cerrar Concertación
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Escalado SNA notice */}
            {isEscalado && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ padding: '14px 16px', borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', display: 'flex', alignItems: 'flex-start', gap: 10 }}
              >
                <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#991B1B', marginBottom: 3 }}>Caso Escalado a SNA</div>
                  <p style={{ fontSize: '0.75rem', color: '#9A3412', margin: 0, lineHeight: 1.5 }}>
                    Este caso fue escalado al Sistema Nacional de Acreditación para mediación. Espere las instrucciones del coordinador SNA asignado.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ── RIGHT: Chat de negociación ─────────────────────────────── */}
        {(!isMobile || activePanel === 'chat') && (
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            {/* Chat header */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', background: 'linear-gradient(135deg, #F9FAFB 0%, white 100%)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #003DA5, #1E40AF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare style={{ width: 15, height: 15, color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}>Chat de Negociación</div>
                <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{comentarios.length} mensajes · Sesión activa</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 2px rgba(16,185,129,0.2)' }} />
            </div>

            {/* Messages */}
            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', minHeight: 220, maxHeight: isMobile ? 320 : 400 }}>
              {comentarios.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 16px', textAlign: 'center' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <Sparkles style={{ width: 22, height: 22, color: '#003DA5' }} />
                  </div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Inicie la negociación</p>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>Envíe el primer mensaje para comenzar el proceso de concertación.</p>
                </div>
              ) : (
                comentarios.map((c: any) => (
                  <ChatBubble
                    key={c.id || c.fecha}
                    msg={c}
                    isOwn={c.autor_rol !== 'Docente'}
                  />
                ))
              )}
            </div>

            {/* Quick replies */}
            <AnimatePresence>
              {showQuickReplies && !isConcertado && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ borderTop: '1px solid #F3F4F6', padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}
                >
                  {QUICK_REPLIES.map((qr, i) => (
                    <button
                      key={i}
                      onClick={() => { handleSendComment(qr); setShowQuickReplies(false); }}
                      style={{
                        padding: '5px 10px', borderRadius: 20, border: '1px solid #E5E7EB',
                        background: '#F9FAFB', color: '#374151', fontSize: '0.68rem', fontWeight: 500,
                        cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
                    >
                      {qr.length > 40 ? qr.substring(0, 40) + '...' : qr}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input area */}
            {!isConcertado && !isEscalado && (
              <div style={{ padding: '10px 12px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setShowQuickReplies(p => !p)}
                    title="Respuestas rápidas"
                    style={{
                      width: 34, height: 34, borderRadius: 9, border: '1px solid #E5E7EB',
                      background: showQuickReplies ? '#EFF6FF' : 'white', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      color: showQuickReplies ? '#003DA5' : '#9CA3AF', transition: 'all 0.15s',
                    }}
                  >
                    <Sparkles style={{ width: 14, height: 14 }} />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={mensaje}
                    onChange={e => setMensaje(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendComment()}
                    placeholder="Escribir mensaje de negociación... (Enter para enviar)"
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 9,
                      border: '1.5px solid #E5E7EB', fontSize: '0.8rem',
                      outline: 'none', fontFamily: 'inherit',
                      background: 'white', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#003DA5'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                  <button
                    onClick={() => handleSendComment()}
                    disabled={sending || !mensaje.trim()}
                    style={{
                      width: 34, height: 34, borderRadius: 9, border: 'none',
                      background: mensaje.trim() ? '#003DA5' : '#E5E7EB',
                      color: 'white', cursor: mensaje.trim() ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'all 0.15s',
                      boxShadow: mensaje.trim() ? '0 2px 6px rgba(0,61,165,0.3)' : 'none',
                    }}
                  >
                    {sending
                      ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                      : <Send style={{ width: 14, height: 14 }} />
                    }
                  </button>
                </div>
                <p style={{ fontSize: '0.6rem', color: '#9CA3AF', margin: '5px 0 0', textAlign: 'center' }}>
                  Sesión de concertación activa · Todos los mensajes quedan registrados
                </p>
              </div>
            )}

            {(isConcertado || isEscalado) && (
              <div style={{ padding: '10px 14px', background: isConcertado ? '#D1FAE5' : '#FEF2F2', borderTop: '1px solid #E5E7EB', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: isConcertado ? '#065F46' : '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                {isConcertado ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : <AlertTriangle style={{ width: 13, height: 13 }} />}
                {isConcertado ? 'Concertación cerrada con acuerdo' : 'Caso escalado a mediación SNA'}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
