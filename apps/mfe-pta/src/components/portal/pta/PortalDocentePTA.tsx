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

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, ChevronLeft, Calendar, Clock, CheckCircle2,
  AlertTriangle, Download, Eye, ArrowRight, RotateCcw, XCircle,
  Send, MessageSquare, BarChart3, Zap, Info, Bell, History,
  MapPin, BookOpen, Printer, Edit3, RefreshCw, Target,
  Shield, ChevronRight, ExternalLink, ListChecks,
  FlaskConical, Globe, Briefcase, X,
} from 'lucide-react';
import {
  getPTAsByDocente, getPTAById, enviarAprobacionPTA,
  agregarComentarioConcertacion, updatePTAStatus,
  getMisSolicitudesPTA, marcarSolicitudLeida,
} from '../../../services/api/ptaApi';
import { PTAForm } from './PTAForm';
import { PTAResumenPrint } from './PTAResumenPrint';
import { RevisionPropuesta } from './RevisionPropuesta';
import { SolicitudPTAModal } from './SolicitudPTAModal';
import { toast } from 'sonner';
import { usePTARealtimeSync } from '../../../hooks/usePTARealtimeSync';
import { PTASyncIndicator } from '../../pta/PTASyncIndicator';
import { useNotifications } from '../../esap/NotificationsContext';
import { V11CalendarioAcademico, V12AdjuntosDocumentos, V13IndicadoresPersonales, V14CertificadoDigitalPortal } from './VistasV11V15PTA';
import { VerificacionQRPublicaPTA } from '../../pta/VerificacionQRPublicaPTA';
import { CardSkeleton, EmptyStateIllustration } from '../../ui/CardSkeleton';
import { ReportePTAInstitucional } from './ReportePTAInstitucional';
import { PTA_COLORS } from '../../pta/shared/ptaColors';

interface PortalDocentePTAProps {
  onBack: () => void;
  userPersonId: string;
  userName?: string;
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
  'Pendiente Jefatura': { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: 'Pendiente Jefatura' },
  'Pendiente Decanatura': { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD', label: 'Pendiente Decanatura' },
  'Pendiente Gestión Profesoral': { bg: '#E0E7FF', color: '#3730A3', border: '#A5B4FC', label: 'Pendiente G. Profesoral' },
  'Aprobado': { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7', label: 'Aprobado' },
  'En Firme': { bg: '#047857', color: '#FFFFFF', border: '#059669', label: 'En Firme — Firmado y Radicado' },
  'Rechazado': { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5', label: 'Rechazado' },
  'Devuelto': { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74', label: 'Devuelto — Corrección requerida' },
  'REVISION_DOCENTE_N1': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Revisión Docente — Jefatura aprobó' },
  'REVISION_DOCENTE_N2': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Revisión Docente — Decanatura aprobó' },
  'REVISION_DOCENTE_N3': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', label: 'Revisión Docente — G. Profesoral aprobó' },
};

const getEstadoCfg = (estado: string) => ESTADO_CONFIG[estado] || { bg: '#F3F4F6', color: '#4B5563', border: '#E5E7EB', label: estado?.replace(/_/g, ' ') || estado };

const FLUJO_APROBACION = [
  { key: 'Borrador', label: 'Borrador', short: 'Borr.' },
  { key: 'Pendiente Jefatura', label: 'Jefatura', short: 'Jef.' },
  { key: 'Pendiente Decanatura', label: 'Decanatura', short: 'Dec.' },
  { key: 'Pendiente Gestión Profesoral', label: 'G. Profesoral', short: 'G.P.' },
  { key: 'Aprobado', label: 'Aprobado', short: 'Apro.' },
];

function getEstadoIndex(estado: string): number {
  if (estado === 'Rechazado' || estado === 'Devuelto') return -1;
  const idx = FLUJO_APROBACION.findIndex(f => f.key === estado);
  return idx >= 0 ? idx : 0;
}

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
// V08: Tracking inline mini-component
// ═══════════════════════════════════════════════════════════════════════
function TrackingBar({ estado }: { estado: string }) {
  const isDevuelto = estado === 'Devuelto';
  const isRechazado = estado === 'Rechazado';
  let internalEstado = estado;
  
  // Normalizar los estados de concertacion y correciones visualmente para que caigan bajo "Jefatura"
  if (['EN_CONCERTACION', 'OBJETADO_DOCENTE', 'MODIFICADO_DOCENTE', 'ESCALADO_SNA'].includes(estado)) {
     internalEstado = 'Pendiente Jefatura';
  }
  
  const idx = getEstadoIndex(internalEstado);

  return (
    <div className="relative w-full pt-2 pb-5 mt-2 overflow-visible">
      <div className="flex items-center w-full px-2">
        {FLUJO_APROBACION.map((step, i) => {
          const isCompleted = idx > i;
          const isCurrent = idx === i;
          const isError = isCurrent && (isDevuelto || isRechazado);
          const hasNext = i < FLUJO_APROBACION.length - 1;

          // Set adaptive styles
          let circleBg = 'bg-white';
          let circleBorder = 'border-gray-200';
          let textColor = 'text-gray-400';
          let fontWeight = 'font-medium';
          let lineColor = 'bg-gray-100';

          if (isCompleted) {
             circleBg = 'bg-[#003DA5]';
             circleBorder = 'border-[#003DA5]';
             textColor = 'text-[#003DA5]';
             fontWeight = 'font-bold';
             lineColor = 'bg-[#003DA5]';
          } else if (isCurrent) {
             if (isError) {
                circleBg = 'bg-red-50';
                circleBorder = 'border-red-500 border-2 ring-4 ring-red-50';
                textColor = 'text-red-700';
                fontWeight = 'font-bold';
             } else {
                circleBg = 'bg-white';
                circleBorder = 'border-[#003DA5] border-[2px] ring-4 ring-blue-50';
                textColor = 'text-[#003DA5]';
                fontWeight = 'font-bold';
             }
          }

          return (
            <div key={step.key} className={`flex items-center relative ${hasNext ? 'flex-1' : ''}`}>
              
              <div className="flex flex-col items-center relative z-10">
                {/* Main Stepper Dot/Icon */}
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex justify-center items-center border transition-all duration-300 shadow-sm ${circleBg} ${circleBorder}`}>
                   {isCompleted ? (
                     <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-white" />
                   ) : isError ? (
                     <XCircle className="w-3 h-3 md:w-3.5 md:h-3.5 text-red-500" />
                   ) : (
                     <div className={`rounded-full transition-all duration-300 ${isCurrent ? 'bg-[#003DA5] w-2 h-2' : 'bg-transparent w-0 h-0'}`} />
                   )}
                </div>
                
                {/* Floating Centered Label */}
                <div className="absolute top-7 md:top-8 left-1/2 -translate-x-1/2 w-max text-center">
                  <span className={`text-[0.6rem] md:text-[0.65rem] uppercase tracking-wide transition-colors ${textColor} ${fontWeight}`}>
                    {step.short}
                  </span>
                </div>
              </div>

              {/* Connecting Line */}
              {hasNext && (
                 <div className={`flex-1 h-1 mx-1 md:mx-2 rounded-full transition-all duration-500 ${lineColor}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PortalDocentePTA({ onBack, userPersonId, userName }: PortalDocentePTAProps) {
  const [vista, setVista] = useState<VistaPortal>('v01_dashboard');
  const [ptas, setPtas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPtaId, setSelectedPtaId] = useState<string | null>(null);
  const [selectedPta, setSelectedPta] = useState<any>(null);
  const [editPtaId, setEditPtaId] = useState<string | null>(null);
  const [concertMsg, setConcertMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isReporteOpen, setIsReporteOpen] = useState(false);
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);
  const [todasLasSolicitudes, setTodasLasSolicitudes] = useState<any[]>([]);

  // Platform bell notifications
  const { addNotification } = useNotifications();

  // ═══ Data loaders (defined before sync hook) ═══
  const loadPtas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPTAsByDocente(userPersonId);
      if (res.success && Array.isArray(res.data)) {
        setPtas(res.data);
      } else {
        console.warn('[Portal PTA] Response data is not an array:', res);
        setPtas([]);
      }
    } catch (error) {
      console.error('[Portal PTA] Error loading PTAs:', error);
      setPtas([]);
    }
    setLoading(false);
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
    todasLasSolicitudes.filter(s => s.estado !== 'pendiente' && !s.notificacionLeida),
  [todasLasSolicitudes]);

  const handleDismissSolicitud = async (id: string) => {
    await marcarSolicitudLeida(id);
    // Reload locally to remove from resueltas list while keeping the approval in state for unblocking PTA creation
    setTodasLasSolicitudes(prev => prev.map(s => s.id === id ? { ...s, notificacionLeida: true } : s));
  };

  useEffect(() => { loadPtas(); loadSolicitudes(); }, [loadPtas, loadSolicitudes]);

  useEffect(() => {
    if (selectedPtaId) loadPtaDetalle(selectedPtaId);
  }, [selectedPtaId, loadPtaDetalle]);

  // ═══ Email notification (fire-and-forget) ═══
  const sendEmailNotification = useCallback(async (evt: any) => {
    try {
      const { projectId, publicAnonKey } = await import('../../../utils/supabase/info');
      await fetch(`http://localhost:5000/api/pta/notifications/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          docente_id: userPersonId,
          docente_nombre: userName || 'Docente',
          evento: evt.tipo,
          estado_nuevo: evt.estado_nuevo,
          pta_id: evt.pta_id,
          actor: evt.actor,
          mensaje: evt.mensaje,
        }),
      });
    } catch (err) {
      console.log('[Portal] Email notification failed (non-blocking):', err);
    }
  }, [userPersonId, userName]);

  // ═══ Real-time sync with Backoffice ═══
  const syncState = usePTARealtimeSync({
    sistema: 'portal',
    interval: 10000,
    docenteId: userPersonId,
    enabled: true,
    onDataChanged: (events) => {
      console.log(`[Portal Sync] ${events.length} nuevos eventos del Backoffice`);
      loadPtas();
      // Also reload selected PTA detail if viewing one
      if (selectedPtaId) {
        loadPtaDetalle(selectedPtaId);
      }
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
    const pendientes = ptas.filter(p => ['Pendiente Jefatura', 'Pendiente Decanatura', 'Pendiente Gestión Profesoral'].includes(p.estado)).length;
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
    'REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3',
    'Devuelto', 'Aprobado',
  ];
  const ptaActivo = useMemo(
    () => ptas.find(p => ESTADOS_ACTIVOS_PTA.includes(p.estado)) ?? null,
    [ptas]
  );
  const anioActual = new Date().getFullYear();
  const limiteAnualAlcanzado = useMemo(
    () => ptas.filter(p => {
      const created = p.createdAt || p.created_at;
      return created && new Date(created).getFullYear() === anioActual;
    }).length >= 2,
    [ptas]
  );

  const tienePermisoEspecial = useMemo(() => 
    todasLasSolicitudes.some(s => s.estado === 'aprobado'), 
  [todasLasSolicitudes]);

  const tieneSolicitudPendiente = useMemo(() => 
    todasLasSolicitudes.some(s => s.estado === 'pendiente'), 
  [todasLasSolicitudes]);

  const puedeCrearPTA = (!loading && !ptaActivo && !limiteAnualAlcanzado) || tienePermisoEspecial;

  const mensajeBloqueo = !tienePermisoEspecial && ptaActivo
    ? 'Ya tienes un Plan de Trabajo en ejecución. Finalizá o esperá su aprobación antes de crear uno nuevo.'
    : !tienePermisoEspecial && limiteAnualAlcanzado
    ? `Límite anual alcanzado: ya registraste 2 planes de trabajo en ${anioActual}.`
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
    const res = await enviarAprobacionPTA(ptaId, { enviado_por: userPersonId });
    if (res.success) {
      toast.success('PTA re-enviado a aprobación');
      loadPtas();
    } else {
      const res2 = await updatePTAStatus(ptaId, { estado: 'Pendiente Jefatura', observaciones: 'Re-envío tras corrección' });
      if (res2.success) { toast.success('PTA re-enviado'); loadPtas(); }
      else toast.error('Error al re-enviar');
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
    return <PTAResumenPrint pta={selectedPta} onClose={() => setVista('v01_dashboard')} userPersonId={userPersonId} />;
  }

  const VISTAS_NAV = [
    { key: 'v01_dashboard', label: 'PTAs', icon: BarChart3 },
    { key: 'v12_adjuntos', label: 'Documentos y Soportes', icon: FileText },
    { key: 'v14_certificado', label: 'Firmados', icon: Shield },
  ];

  return (
    <div>
      {/* Environment Banner — Portal Docente */}
      <div className="flex items-center justify-between px-5 py-3 rounded-2xl mb-5 bg-gradient-to-r from-purple-100/60 to-indigo-50/60 backdrop-blur-md border border-purple-200/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-purple-200/60 rounded-lg">
            <Shield className="w-4 h-4 text-purple-700" />
          </div>
          <span className="text-[0.7rem] font-black tracking-widest uppercase text-purple-900">
            Portal Docente
          </span>
          <span className="hidden sm:inline text-xs font-semibold text-purple-700/80">
            — Tablero de Gestión de Plan de Trabajo Académico (prueba)
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <button onClick={onBack} className="w-10 h-10 shrink-0 mt-1 sm:mt-0 rounded-xl sm:rounded-2xl border border-gray-200/50 bg-white/80 backdrop-blur shadow-sm text-gray-500 hover:text-gray-900 active:scale-95 transition-all flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[18px] sm:text-2xl font-black text-gray-900 m-0 flex flex-col sm:flex-row sm:items-center items-start gap-2 sm:gap-3 tracking-tight leading-tight">
              <div className="hidden sm:flex p-2 bg-blue-50/80 rounded-xl shadow-inner shrink-0">
                <FileText className="w-6 h-6 text-[#003DA5]" />
              </div>
              <span className="break-words">Mi Plan de Trabajo Académico</span>
            </h2>
            <p className="text-[12px] sm:text-sm font-bold text-gray-500 mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="truncate max-w-[150px] sm:max-w-none">{userName || 'Docente'}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
              <span>Periodo 2026-1</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PTASyncIndicator syncState={syncState} sistema="portal" compact />
          {puedeCrearPTA ? (
            <button
              onClick={() => { setVista('v03_formulario'); setEditPtaId(null); }}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border-none text-white text-[13px] font-extrabold shadow-[0_4px_14px_0_rgba(0,61,165,0.39)] hover:shadow-[0_6px_20px_rgba(0,61,165,0.23)] hover:bg-[#003185] active:scale-95 transition-all duration-300 cursor-pointer"
              style={{ background: '#003DA5' }}
            >
              <Plus className="w-4 h-4" /> Nuevo PTA
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border text-[12px] font-bold"
                style={{
                  background: ptaActivo ? '#FEF3C7' : '#FEE2E2',
                  borderColor: ptaActivo ? '#FDE68A' : '#FCA5A5',
                  color: ptaActivo ? '#92400E' : '#991B1B',
                  maxWidth: 340,
                }}
                title={mensajeBloqueo ?? undefined}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{mensajeBloqueo}</span>
              </div>
              {ptaActivo && !tieneSolicitudPendiente && !tienePermisoEspecial && (
                <button
                  onClick={() => setShowSolicitudModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border text-[12px] font-bold cursor-pointer transition-all hover:shadow-md active:scale-95 whitespace-nowrap"
                  style={{ borderColor: '#D97706', background: 'white', color: '#92400E' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  ¿Necesita crear otro PTA?
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vista Nav */}
      <div className="flex overflow-x-auto hide-scrollbar gap-1.5 sm:gap-2 bg-gray-50/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.25rem] p-1.5 border border-gray-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] mb-6 sm:mb-8 w-full max-w-full">
        {VISTAS_NAV.map(v => (
          <button
            key={v.key}
            onClick={() => setVista(v.key as VistaPortal)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl border-none text-[12px] sm:text-[13px] transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              vista === v.key 
                ? 'text-gray-900 font-black bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]' 
                : 'text-gray-500 font-bold hover:bg-white/60 hover:text-gray-800 bg-transparent'
            }`}
          >
            <v.icon className={`w-4 h-4 ${vista === v.key ? 'text-[#003DA5]' : 'opacity-70'}`} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#003DA5', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6B7280', fontSize: '0.85rem' }}>Cargando tus PTAs...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                <div className="flex flex-col gap-5">
                  {ptas.map((pta, i) => {
                    const cfg = getEstadoCfg(pta.estado);
                    const isEnRevisionDocente = ['REVISION_DOCENTE_N1', 'REVISION_DOCENTE_N2', 'REVISION_DOCENTE_N3'].includes(pta.estado);
                    const needsAction = ['NOTIFICADO_DOCENTE', 'Devuelto', 'EN_CONCERTACION'].includes(pta.estado) || isEnRevisionDocente;

                    return (
                      <motion.div
                        key={pta.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={() => navigateToVista('v06_detalle', pta.id)}
                        className={`group bg-white rounded-3xl border border-gray-200/60 p-5 sm:p-7 cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_45px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-[#003DA5]/30 transition-all duration-300 transform relative overflow-hidden flex flex-col gap-5 sm:gap-7`}
                      >
                        {/* Indicador Izquierdo de Acción */}
                        {needsAction && <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ background: cfg.color }} />}
                        
                        {/* 1. Cabecera Abierta: Titulo, Info Básica y Badges a la derecha */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full relative z-10 pl-2">
                           {/* Bloque Izquierdo */}
                           <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <h4 className="text-[1.25rem] sm:text-[1.4rem] font-black tracking-tight text-gray-900 leading-none">
                                  Plan de Trabajo Académico
                                </h4>
                                <span className="text-gray-400 font-bold text-[0.85rem] tracking-widest uppercase mt-0.5">
                                  {pta.periodo || '2026-1'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs sm:text-[13px] font-semibold text-gray-500 flex-wrap">
                                 <span className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200/50">
                                    <Clock className="w-3.5 h-3.5" /> {pta.dedicacion || 'Tiempo Completo'}
                                 </span>
                                 <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                 <span className="flex items-center gap-1.5 text-gray-600">
                                   <Target className="w-3.5 h-3.5 text-indigo-500" /> <strong className="text-gray-900">{pta.total_horas_programadas || 0}</strong> de {pta.horas_a_programar || 800}h asignadas
                                 </span>
                              </div>
                           </div>

                           {/* Bloque Derecho (Badges) */}
                           <div className="flex flex-col sm:items-end gap-2 shrink-0">
                               <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-[0.68rem] font-bold uppercase tracking-widest shadow-sm" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                                 {cfg.label}
                               </span>
                               {needsAction && (
                                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[0.65rem] font-black uppercase tracking-widest animate-[pulse_2s_ease-in-out_infinite] border border-red-200 shadow-sm">
                                   <AlertTriangle className="w-3.5 h-3.5" /> Acción Requerida
                                 </span>
                               )}
                           </div>
                        </div>

                        {/* 2. Stepper de Rastreo y Controles Inferiores */}
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 pl-2 relative z-10 w-full">
                           {/* Stepper tracking container */}
                           <div className="flex-1 w-full xl:max-w-2xl bg-gray-50/50 rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                              <div className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <History className="w-3 h-3" /> Progreso de aprobación
                              </div>
                              <TrackingBar estado={pta.estado} />
                           </div>

                           {/* Botones de Acción Orientados a Conversión */}
                           <div className="flex flex-wrap items-center justify-start xl:justify-end gap-3 shrink-0 pt-2 xl:pt-0">
                             {pta.estado === 'NOTIFICADO_DOCENTE' && (
                               <button onClick={(e) => { e.stopPropagation(); navigateToVista('v02_revision', pta.id); }} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 text-white text-[13px] font-bold shadow-[0_4px_12px_rgba(245,158,11,0.25)] hover:bg-amber-600 active:scale-95 transition-all">
                                 <MessageSquare className="w-4 h-4" /> Revisar propuesta
                               </button>
                             )}
                             {pta.estado === 'Borrador' && (
                               <button onClick={(e) => { e.stopPropagation(); setEditPtaId(pta.id); setVista('v03_formulario'); }} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#003DA5] text-white text-[13px] font-bold shadow-[0_4px_12px_rgba(0,61,165,0.3)] hover:bg-[#002B75] active:scale-95 transition-all">
                                 <Edit3 className="w-4 h-4" /> Continuar edición
                               </button>
                             )}
                             {pta.estado === 'Devuelto' && (
                               <button onClick={(e) => { e.stopPropagation(); navigateToVista('v10_devoluciones'); }} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-orange-600 text-white text-[13px] font-bold shadow-[0_4px_12px_rgba(234,88,12,0.25)] hover:bg-orange-700 active:scale-95 transition-all">
                                 <RotateCcw className="w-4 h-4" /> Subsanar correcciones
                               </button>
                             )}
                             {isEnRevisionDocente && (
                               <button onClick={(e) => { e.stopPropagation(); setEditPtaId(pta.id); setVista('v03_formulario'); }} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-white text-[13px] font-bold active:scale-95 transition-all" style={{ background: '#7C3AED', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                                 <CheckCircle2 className="w-4 h-4" /> Revisar aprobación
                               </button>
                             )}
                             <button className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-bold shadow-sm hover:shadow-md hover:bg-white active:scale-95 transition-all ml-1 group-hover:border-[#003DA5]/30 group-hover:text-[#003DA5]">
                               Ver detalle <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
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
            <div>
              <button onClick={() => { setVista('v01_dashboard'); setSelectedPtaId(null); setSelectedPta(null); }} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: '0.82rem', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', marginBottom: 14 }}>
                <ChevronLeft style={{ width: 16, height: 16 }} /> Volver al dashboard
              </button>

              {/* Estado y Tracking */}
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>PTA — {selectedPta.periodo || '2026-1'}</h3>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '2px 0 0' }}>{selectedPta.dedicacion} • ID: {selectedPta.id?.substring(0, 14)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selectedPta.estado === 'NOTIFICADO_DOCENTE' && (
                      <button onClick={() => navigateToVista('v02_revision', selectedPta.id)} style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: '#D97706', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Eye style={{ width: 13, height: 13 }} /> Revisar propuesta
                      </button>
                    )}
                    <button onClick={() => navigateToVista('v09_imprimir', selectedPta.id)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Printer style={{ width: 13, height: 13 }} /> Imprimir
                    </button>
                    <button onClick={() => setIsReporteOpen(true)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid transparent', background: '#EFF6FF', color: '#1E3A8A', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileText style={{ width: 13, height: 13 }} /> Reporte Institucional
                    </button>
                  </div>
                </div>

                {/* V08: Tracking bar */}
                <div style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', marginBottom: 8 }}>Estado de aprobación</div>
                  <TrackingBar estado={selectedPta.estado} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 8, background: getEstadoCfg(selectedPta.estado).bg, color: getEstadoCfg(selectedPta.estado).color, fontSize: '0.72rem', fontWeight: 700 }}>
                      {getEstadoCfg(selectedPta.estado).label}
                    </span>
                  </div>
                </div>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                  {[
                    { label: 'Horas programadas', value: selectedPta.total_horas_programadas || 0 },
                    { label: 'Horas disponibles', value: selectedPta.horas_a_programar || 800 },
                    { label: '% Carga', value: `${selectedPta.horas_a_programar ? Math.round(((selectedPta.total_horas_programadas || 0) / selectedPta.horas_a_programar) * 100) : 0}%` },
                    { label: 'Asignaturas', value: selectedPta.asignaturas?.length || selectedPta.num_asignaturas || 0 },
                  ].map(m => (
                    <div key={m.label} style={{ padding: '10px 14px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>{m.label}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginTop: 2 }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Distribución por Componente */}
              {(() => {
                const asigs = selectedPta.asignaturas || [];
                const horasDoc = selectedPta.horas_docencia ?? asigs.reduce((s: number, a: any) => s + (a.total_horas || a.horas || 0), 0);
                const horasInv = selectedPta.horas_investigacion ?? 0;
                const horasExt = selectedPta.horas_extension ?? 0;
                const horasComp = selectedPta.horas_complementarias ?? 0;
                const horasAA = selectedPta.horas_acad_admin ?? 0;
                const horasTotal = selectedPta.total_horas_programadas || (horasDoc + horasInv + horasExt + horasComp + horasAA);
                const horasMax = selectedPta.horas_a_programar || 800;
                const comps = [
                  { label: 'Docencia', value: horasDoc, color: PTA_COLORS.DOCENCIA, icon: BookOpen },
                  { label: 'Investigación', value: horasInv, color: PTA_COLORS.INVESTIGACION, icon: FlaskConical },
                  { label: 'Extensión', value: horasExt, color: PTA_COLORS.EXTENSION, icon: Globe },
                  { label: 'Complementarias', value: horasComp, color: PTA_COLORS.COMPLEMENTARIAS, icon: Briefcase },
                  { label: 'Acad. Admin.', value: horasAA, color: PTA_COLORS.ACAD_ADMIN, icon: Shield },
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
                // Unused portion
                const usedPct = horasMax > 0 ? Math.min(horasTotal / horasMax, 1) : 0;

                return (
                  <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px', marginBottom: 14 }}>
                    <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Target style={{ width: 15, height: 15, color: '#003DA5' }} /> Distribución por Componente
                    </h4>

                    {/* Side-by-side: Donut (left) + Bars (right) */}
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                      {/* Donut Chart — left */}
                      <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                        <svg width="150" height="150" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="80" cy="80" r={radius} fill="none" stroke="#F3F4F6" strokeWidth="18" />
                          {donutSegments.map((seg, i) => (
                            <circle
                              key={seg.label}
                              cx="80" cy="80" r={radius}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth="18"
                              strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                              strokeDashoffset={seg.dashOffset}
                              strokeLinecap="butt"
                              style={{
                                transition: 'stroke-dasharray 0.6s ease-out, stroke-dashoffset 0.6s ease-out',
                                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))',
                              }}
                            />
                          ))}
                        </svg>
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#111827', lineHeight: 1 }}>
                            {horasTotal}
                          </span>
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            horas
                          </span>
                          <span style={{ fontSize: '0.55rem', color: '#D1D5DB', marginTop: 2 }}>
                            de {horasMax}h
                          </span>
                        </div>
                      </div>

                      {/* Bar chart — right */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {comps.map(c => {
                          const maxH = Math.round(horasMax * 0.5);
                          const pct = maxH > 0 ? Math.min((c.value / maxH) * 100, 100) : 0;
                          const compPct = horasTotal > 0 ? Math.round((c.value / horasTotal) * 100) : 0;
                          return (
                            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <c.icon style={{ width: 14, height: 14, color: c.color, flexShrink: 0 }} />
                              <span style={{ width: 95, fontSize: '0.7rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>{c.label}</span>
                              <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: c.color, transition: 'width 0.4s ease-out' }} />
                              </div>
                              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: c.color, width: 55, textAlign: 'right', flexShrink: 0 }}>{c.value}h <span style={{ fontWeight: 500, color: '#9CA3AF' }}>({compPct}%)</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: '#F0F9FF', border: '1px solid #BAE6FD', fontSize: '0.62rem', color: '#0369A1' }}>
                      <strong>Fórmula GTH-F081:</strong> K15 = Horas base (AP=64, Maestría=créd×12, otros=créd×16) → L15 = K15 × 3
                    </div>
                  </div>
                );
              })()}

              {/* Asignaturas */}
              {selectedPta.asignaturas?.length > 0 && (
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 22px', marginBottom: 14 }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen style={{ width: 15, height: 15, color: '#003DA5' }} /> Componente Docencia — Asignaturas ({selectedPta.asignaturas.length})
                  </h4>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 55px 45px 55px',
                    gap: 4, padding: '6px 0', borderBottom: '1px solid #E5E7EB',
                    fontSize: '0.6rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase',
                  }}>
                    <span>Asignatura</span>
                    <span style={{ textAlign: 'center' }}>Créd.</span>
                    <span style={{ textAlign: 'center' }}>Sem.</span>
                    <span style={{ textAlign: 'right' }}>Horas</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {selectedPta.asignaturas.map((a: any, i: number) => (
                      <div key={i} style={{
                        display: 'grid', gridTemplateColumns: '1fr 55px 45px 55px',
                        gap: 4, padding: '7px 0',
                        borderBottom: i < selectedPta.asignaturas.length - 1 ? '1px solid #F9FAFB' : 'none',
                      }}>
                        <div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#374151' }}>{a.nombre || a.asignatura_nombre}</span>
                          {a.nucleo_tematico && <div style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>{a.nucleo_tematico}</div>}
                        </div>
                        <span style={{ textAlign: 'center', fontSize: '0.78rem', color: '#6B7280' }}>{a.creditos || 0}</span>
                        <span style={{ textAlign: 'center', fontSize: '0.78rem', color: '#6B7280' }}>{a.semestre || '-'}</span>
                        <span style={{ textAlign: 'right', fontSize: '0.78rem', fontWeight: 700, color: '#003DA5' }}>{a.total_horas || a.horas || 0}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={concertMsg}
                      onChange={e => setConcertMsg(e.target.value)}
                      placeholder="Escribe tu mensaje..."
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensajeConcertacion()}
                      style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid #DDD6FE', fontSize: '0.85rem', outline: 'none' }}
                    />
                    <button
                      onClick={enviarMensajeConcertacion}
                      disabled={sendingMsg || !concertMsg.trim()}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#7C3AED', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: sendingMsg || !concertMsg.trim() ? 0.5 : 1 }}
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
              {['Aprobado', 'En Firme', 'Aprobado DEF'].includes(selectedPta.estado) && (
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #BBF7D0', padding: '18px 22px', marginBottom: 14 }}>
                  <V12AdjuntosDocumentos
                    ptas={ptas}
                    userName={userName || 'Docente'}
                    ptaId={selectedPta.id}
                    ptaData={selectedPta}
                  />
                </div>
              )}

              {isReporteOpen && selectedPta && (
                <ReportePTAInstitucional
                  pta={selectedPta}
                  userPerfil={{ nombre: userName, identificacion: userPersonId }}
                  onClose={() => setIsReporteOpen(false)}
                  isParcial={!['Aprobado', 'En Firme'].includes(selectedPta.estado)}
                  certificadoId={selectedPta.certificado_qr}
                  signedAt={selectedPta.signed_at || selectedPta.updated_at}
                />
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
                  {notificaciones.map(notif => {
                    const colors = notif.tipo === 'revision' ? { bg: '#FEF3C7', color: '#92400E', icon: Eye }
                      : notif.tipo === 'devolucion' ? { bg: '#FEE2E2', color: '#991B1B', icon: RotateCcw }
                      : notif.tipo === 'concertacion' ? { bg: '#F3E8FF', color: '#6B21A8', icon: MessageSquare }
                      : { bg: '#D1FAE5', color: '#059669', icon: CheckCircle2 };
                    const NotifIcon = colors.icon;
                    return (
                      <motion.div
                        key={notif.id}
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
            <V11CalendarioAcademico ptas={ptas} periodo="2026-1" />
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
                  {devoluciones.map(pta => (
                    <div key={pta.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #FDBA74', padding: '18px 22px' }}>
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
            key={sol.id}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            style={{
              position: 'fixed', bottom: 20 + idx * 160, right: 20, zIndex: 9999,
              maxWidth: 400, padding: '16px 20px', borderRadius: 14,
              background: sol.estado === 'aprobado' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${sol.estado === 'aprobado' ? '#6EE7B7' : '#FECACA'}`,
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            }}
          >
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
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Modal de solicitud de nuevo PTA */}
      {showSolicitudModal && (
        <SolicitudPTAModal
          docenteId={userPersonId}
          docenteNombre={userName || ''}
          onClose={() => setShowSolicitudModal(false)}
          onSuccess={() => { loadPtas(); loadSolicitudes(); }}
        />
      )}
    </div>
  );
}
