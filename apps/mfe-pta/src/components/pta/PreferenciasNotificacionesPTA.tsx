/**
 * PreferenciasNotificacionesPTA — Sistema de notificaciones push con configuración por rol
 *
 * Funcionalidades REALES conectadas al backend Supabase KV:
 * - Configuración granular de canales (in-app, email, push) — persistida en KV
 * - Perfiles de notificación por rol — cargados/guardados en backend
 * - Historial REAL de notificaciones enviadas (email + bell) — desde endpoint unificado
 * - Reglas de escalamiento automático — persistidas en preferencias
 * - Horarios de no-molestar (quiet hours) — respetados por emitPTAEvent
 * - Resumen diario/semanal configurables
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, BellRing, BellOff, Mail, Smartphone, Globe,
  Clock, CheckCircle, XCircle, AlertTriangle, Eye,
  Settings, ChevronDown, X, Filter, Search,
  Shield, Users, TrendingUp, Timer, Volume2,
  VolumeX, Sun, Moon, Zap, MailCheck,
  Send, ArrowRight, Calendar, RefreshCw, Loader2,
  Database, Wifi, WifiOff, Save,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getPTANotificationPreferences,
  savePTANotificationPreferences,
  getPTAUnifiedNotificationHistory,
} from '../../services/api/ptaApi';

type Canal = 'in_app' | 'email' | 'push';
type RolNotif = 'docente' | 'jefatura' | 'decanatura' | 'gestion_profesoral' | 'sna' | 'admin';

interface CategoriaEvento {
  id: string;
  nombre: string;
  descripcion?: string;
  fase: string;
  canales: Record<Canal, boolean>;
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente';
}

interface NotificacionHistorial {
  id: string;
  evento: string;
  destinatario: string;
  destinatario_id?: string;
  canal: string;
  estado: string;
  prioridad?: string;
  timestamp: string;
  subject?: string;
  contenido: string;
  pta_id?: string;
  intentos?: number;
}

interface ReglaEscalamiento {
  id: string;
  nombre: string;
  descripcion?: string;
  tiempoHoras: number;
  accion?: string;
  activa: boolean;
}

const ROLES_CONFIG: Record<RolNotif, { label: string; color: string; bg: string; icon: any }> = {
  docente: { label: 'Docente', color: '#059669', bg: '#D1FAE5', icon: Users },
  jefatura: { label: 'Jefatura (N1)', color: '#D97706', bg: '#FEF3C7', icon: Shield },
  decanatura: { label: 'Decanatura (N2)', color: '#003DA5', bg: '#EFF6FF', icon: Shield },
  gestion_profesoral: { label: 'Gestión Profesoral (N3)', color: '#7C3AED', bg: '#F3E8FF', icon: Shield },
  sna: { label: 'SNA (Arbitraje)', color: '#991B1B', bg: '#FEF2F2', icon: Shield },
  admin: { label: 'Administrador', color: '#111827', bg: '#F3F4F6', icon: Settings },
};

const CANAL_CONFIG: Record<Canal, { label: string; icon: any; color: string }> = {
  in_app: { label: 'In-App', icon: Bell, color: '#003DA5' },
  email: { label: 'Email', icon: Mail, color: '#D97706' },
  push: { label: 'Push', icon: Smartphone, color: '#059669' },
};

// Default event descriptions (enriched from backend defaults)
const EVENT_DESCRIPTIONS: Record<string, string> = {
  'PTA Propuesto': 'Cuando la dirección propone un PTA al docente',
  'PTA Notificado': 'Cuando el docente es notificado del PTA propuesto',
  'Docente Aceptó': 'Cuando el docente acepta el PTA',
  'Docente Modificó': 'Cuando el docente propone modificaciones',
  'Docente Objetó': 'Cuando el docente objeta el PTA',
  'Mesa de Concertación': 'Invitación a mesa de concertación',
  'PTA Concertado': 'Cuando se llega a acuerdo en concertación',
  'Escalado a SNA': 'Cuando el caso se escala al Sistema Nacional de Arbitraje',
  'Aprobación N1': 'Jefatura aprobó el PTA',
  'Aprobación N2': 'Decanatura aprobó el PTA',
  'Aprobación N3': 'Gestión Profesoral aprobó el PTA (aprobación final)',
  'PTA Devuelto': 'Cuando el PTA es devuelto para correcciones',
  'PTA Rechazado': 'Cuando el PTA es rechazado definitivamente',
  'SLA Próximo a Vencer': 'Alerta cuando un plazo de evaluación está por vencerse',
  'Resumen Diario': 'Resumen de actividad del día',
  'Resumen Semanal': 'Reporte semanal de métricas PTA',
};

// Default escalation descriptions
const ESCALATION_DESCRIPTIONS: Record<string, { desc: string; accion: string }> = {
  'Recordatorio Jefatura': { desc: 'Recordar a Jefatura cuando un PTA lleva >3 días sin revisión', accion: 'Enviar recordatorio por email y push' },
  'Alerta SLA Decanatura': { desc: 'Alertar cuando Decanatura está a 1 día de exceder SLA', accion: 'Notificación urgente + copia a GP' },
  'Escalamiento a Director': { desc: 'Escalar si no hay respuesta en 7 días', accion: 'Notificar al Director Territorial y registrar en auditoría' },
  'Recordatorio Docente': { desc: 'Recordar al docente sobre PTA pendiente de respuesta', accion: 'Push + email con enlace directo al PTA' },
  'Cierre por inactividad': { desc: 'Cerrar concertación si no hay actividad en 15 días', accion: 'Cerrar y escalar automáticamente al SNA' },
};

export function PreferenciasNotificacionesPTA() {
  const [activeTab, setActiveTab] = useState<'config' | 'historial' | 'escalamiento' | 'quiet'>('config');
  const [rolSeleccionado, setRolSeleccionado] = useState<RolNotif>('admin');
  const [eventos, setEventos] = useState<CategoriaEvento[]>([]);
  const [historial, setHistorial] = useState<NotificacionHistorial[]>([]);
  const [histStats, setHistStats] = useState<any>({ total: 0, por_canal: {}, por_estado: {}, por_prioridad: {} });
  const [reglas, setReglas] = useState<ReglaEscalamiento[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Quiet hours
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [quietWeekends, setQuietWeekends] = useState(true);
  const [resumenDiario, setResumenDiario] = useState(true);
  const [resumenSemanal, setResumenSemanal] = useState(true);
  const [resumenHora, setResumenHora] = useState('08:00');

  // Loading/sync states
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState(true);
  const [historialCanalFilter, setHistorialCanalFilter] = useState('');

  // ─── Load preferences from backend ──────────────────────────────
  const loadPreferences = useCallback(async (rol: RolNotif) => {
    setLoadingPrefs(true);
    try {
      const res = await getPTANotificationPreferences(undefined, rol);
      if (res.success && res.data) {
        const d = res.data;
        setEventos(d.eventos || []);
        if (d.quiet_hours) {
          setQuietEnabled(d.quiet_hours.enabled !== false);
          setQuietStart(d.quiet_hours.start || '22:00');
          setQuietEnd(d.quiet_hours.end || '07:00');
          setQuietWeekends(d.quiet_hours.weekends !== false);
        }
        if (d.escalamiento) setReglas(d.escalamiento);
        if (d.resumen) {
          setResumenDiario(d.resumen.diario !== false);
          setResumenSemanal(d.resumen.semanal !== false);
          setResumenHora(d.resumen.hora || '08:00');
        }
        if (d.updated_at) setLastSavedAt(d.updated_at);
        setBackendConnected(true);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('[PrefsNotif] Error loading prefs:', err);
      setBackendConnected(false);
      toast.error('Error cargando preferencias del servidor');
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  // ─── Load real historial from backend ───────────────────────────
  const loadHistorial = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getPTAUnifiedNotificationHistory({ canal: historialCanalFilter, limit: 100 });
      if (res.success && res.data) {
        setHistorial(res.data.notifications || []);
        setHistStats(res.data.stats || {});
        setBackendConnected(true);
      }
    } catch (err) {
      console.error('[PrefsNotif] Error loading historial:', err);
      setBackendConnected(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [historialCanalFilter]);

  // Initial load
  useEffect(() => { loadPreferences(rolSeleccionado); }, [rolSeleccionado]);
  useEffect(() => { if (activeTab === 'historial') loadHistorial(); }, [activeTab, historialCanalFilter]);

  // ─── Save preferences to backend ───────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await savePTANotificationPreferences({
        rol: rolSeleccionado,
        eventos,
        quiet_hours: { enabled: quietEnabled, start: quietStart, end: quietEnd, weekends: quietWeekends },
        escalamiento: reglas,
        resumen: { diario: resumenDiario, semanal: resumenSemanal, hora: resumenHora },
      });
      if (res.success) {
        toast.success('Preferencias guardadas exitosamente en el servidor');
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date().toISOString());
        setBackendConnected(true);
      } else {
        toast.error(`Error guardando: ${res.error || 'Desconocido'}`);
      }
    } catch (err: any) {
      console.error('[PrefsNotif] Error saving:', err);
      toast.error('Error de conexión al guardar preferencias');
      setBackendConnected(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleCanal = (eventoId: string, canal: Canal) => {
    setEventos(prev => prev.map(e => {
      if (e.id !== eventoId) return e;
      return { ...e, canales: { ...e.canales, [canal]: !e.canales[canal] } };
    }));
    setHasUnsavedChanges(true);
  };

  const toggleRegla = (reglaId: string) => {
    setReglas(prev => prev.map(r => r.id === reglaId ? { ...r, activa: !r.activa } : r));
    setHasUnsavedChanges(true);
  };

  const fases = [...new Set(eventos.map(e => e.fase))];

  const historialFiltered = useMemo(() => {
    if (!searchQuery.trim()) return historial;
    const q = searchQuery.toLowerCase();
    return historial.filter(n =>
      (n.evento || '').toLowerCase().includes(q) ||
      (n.destinatario || '').toLowerCase().includes(q) ||
      (n.contenido || '').toLowerCase().includes(q)
    );
  }, [historial, searchQuery]);

  const ESTADO_NOTIF: Record<string, { color: string; bg: string; label: string }> = {
    sent: { color: '#003DA5', bg: '#EFF6FF', label: 'Enviada' },
    entregada: { color: '#003DA5', bg: '#EFF6FF', label: 'Entregada' },
    leida: { color: '#059669', bg: '#D1FAE5', label: 'Leída' },
    read: { color: '#059669', bg: '#D1FAE5', label: 'Leída' },
    failed: { color: '#DC2626', bg: '#FEE2E2', label: 'Fallida' },
    queued: { color: '#D97706', bg: '#FEF3C7', label: 'En cola' },
    pendiente: { color: '#D97706', bg: '#FEF3C7', label: 'Pendiente' },
  };

  const PRIORIDAD_CONFIG: Record<string, { color: string; bg: string }> = {
    baja: { color: '#6B7280', bg: '#F3F4F6' },
    normal: { color: '#003DA5', bg: '#EFF6FF' },
    alta: { color: '#D97706', bg: '#FEF3C7' },
    urgente: { color: '#DC2626', bg: '#FEE2E2' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BellRing style={{ width: 24, height: 24, color: '#003DA5' }} />
            Preferencias de Notificaciones PTA
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            Configuración granular por canal, evento y rol • {eventos.length} eventos configurables
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700,
              background: backendConnected ? '#D1FAE5' : '#FEE2E2',
              color: backendConnected ? '#059669' : '#DC2626',
            }}>
              {backendConnected ? <Wifi style={{ width: 9, height: 9 }} /> : <WifiOff style={{ width: 9, height: 9 }} />}
              {backendConnected ? 'Backend' : 'Offline'}
            </span>
            {lastSavedAt && (
              <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>
                Último guardado: {new Date(lastSavedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {hasUnsavedChanges && (
            <span style={{
              padding: '6px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 600,
              background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', gap: 4,
              border: '1px solid #FDE68A',
            }}>
              <AlertTriangle style={{ width: 11, height: 11 }} /> Sin guardar
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            style={{
              padding: '7px 14px', borderRadius: 8, border: 'none',
              background: saving ? '#6B7280' : hasUnsavedChanges ? '#003DA5' : '#D1D5DB',
              color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: saving || !hasUnsavedChanges ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 4, opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 13, height: 13 }} />}
            {saving ? 'Guardando...' : 'Guardar preferencias'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Role Selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {(Object.entries(ROLES_CONFIG) as [RolNotif, typeof ROLES_CONFIG[RolNotif]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setRolSeleccionado(key)} style={{
              padding: '6px 12px', borderRadius: 8,
              border: rolSeleccionado === key ? `1.5px solid ${cfg.color}` : '1px solid #E5E7EB',
              background: rolSeleccionado === key ? cfg.bg : 'white',
              color: rolSeleccionado === key ? cfg.color : '#6B7280',
              fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Icon style={{ width: 11, height: 11 }} /> {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[
          { key: 'config' as const, label: 'Canales y Eventos', icon: Settings },
          { key: 'historial' as const, label: `Historial (${histStats?.total || 0})`, icon: Clock },
          { key: 'escalamiento' as const, label: 'Escalamiento', icon: Zap },
          { key: 'quiet' as const, label: 'Horarios y Resúmenes', icon: Moon },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '7px 14px', borderRadius: 8,
            border: activeTab === tab.key ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
            background: activeTab === tab.key ? '#EFF6FF' : 'white',
            color: activeTab === tab.key ? '#003DA5' : '#6B7280',
            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <tab.icon style={{ width: 13, height: 13 }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Loading overlay */}
      {loadingPrefs && (
        <div style={{
          padding: '40px 0', textAlign: 'center', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 10, color: '#6B7280',
        }}>
          <Loader2 style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: '#003DA5' }} />
          <span style={{ fontSize: '0.85rem' }}>Cargando preferencias del servidor...</span>
        </div>
      )}

      {/* ═══ CONFIG TAB ═══ */}
      {!loadingPrefs && activeTab === 'config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fases.map(fase => {
            const faseEventos = eventos.filter(e => e.fase === fase);
            return (
              <div key={fase} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                <div style={{ padding: '12px 18px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{fase}</span>
                  <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{faseEventos.length} eventos</span>
                </div>
                <div>
                  {faseEventos.map((evento, i) => {
                    const priCfg = PRIORIDAD_CONFIG[evento.prioridad] || PRIORIDAD_CONFIG.normal;
                    const desc = EVENT_DESCRIPTIONS[evento.nombre] || evento.descripcion || '';
                    return (
                      <div key={evento.id} style={{ padding: '12px 18px', borderBottom: i < faseEventos.length - 1 ? '1px solid #F3F4F6' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 600, color: '#111827', fontSize: '0.82rem' }}>{evento.nombre}</span>
                            <span style={{ padding: '1px 5px', borderRadius: 4, fontSize: '0.52rem', fontWeight: 700, background: priCfg.bg, color: priCfg.color, textTransform: 'uppercase' }}>{evento.prioridad}</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{desc}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          {(Object.entries(CANAL_CONFIG) as [Canal, typeof CANAL_CONFIG[Canal]][]).map(([canal, cfg]) => {
                            const Icon = cfg.icon;
                            const isActive = evento.canales?.[canal] !== false;
                            return (
                              <button key={canal} onClick={() => toggleCanal(evento.id, canal)} style={{
                                width: 36, height: 36, borderRadius: 8,
                                border: isActive ? `1.5px solid ${cfg.color}` : '1px solid #E5E7EB',
                                background: isActive ? `${cfg.color}10` : 'white',
                                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: 1,
                              }}
                                title={`${cfg.label}: ${isActive ? 'Activo' : 'Inactivo'}`}
                              >
                                <Icon style={{ width: 13, height: 13, color: isActive ? cfg.color : '#D1D5DB' }} />
                                <span style={{ fontSize: '0.42rem', fontWeight: 600, color: isActive ? cfg.color : '#D1D5DB' }}>{cfg.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {eventos.length === 0 && !loadingPrefs && (
            <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
              No se encontraron eventos configurables para este rol.
            </div>
          )}
        </div>
      )}

      {/* ═══ HISTORIAL TAB — DATOS REALES DEL BACKEND ═══ */}
      {activeTab === 'historial' && (
        <div>
          {/* Real stats from backend */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', value: histStats?.total || 0, color: '#111827' },
              { label: 'Email', value: histStats?.por_canal?.email || 0, color: '#D97706' },
              { label: 'In-App', value: histStats?.por_canal?.in_app || 0, color: '#003DA5' },
              { label: 'Entregadas', value: histStats?.por_estado?.entregadas || 0, color: '#059669' },
              { label: 'Leídas', value: histStats?.por_estado?.leidas || 0, color: '#059669' },
              { label: 'Fallidas', value: histStats?.por_estado?.fallidas || 0, color: '#DC2626' },
            ].map(s => (
              <div key={s.label} style={{ padding: '6px 12px', borderRadius: 8, background: 'white', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                <span style={{ fontWeight: 800, color: s.color }}>{s.value}</span>
                <span style={{ color: '#6B7280' }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Filters row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
              <Search style={{ width: 12, height: 12, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar en historial..."
                style={{ width: '100%', padding: '6px 8px 6px 26px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.78rem', outline: 'none' }} />
            </div>
            <select
              value={historialCanalFilter}
              onChange={e => setHistorialCanalFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.75rem', color: '#374151', cursor: 'pointer' }}
            >
              <option value="">Todos los canales</option>
              <option value="email">Email</option>
              <option value="in_app">In-App</option>
            </select>
            <button onClick={loadHistorial} disabled={loadingHistory}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB',
                background: 'white', cursor: loadingHistory ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#374151',
              }}>
              <RefreshCw style={{ width: 12, height: 12, animation: loadingHistory ? 'spin 1s linear infinite' : 'none' }} />
              Recargar
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#9CA3AF' }}>
              <Loader2 style={{ width: 20, height: 20, animation: 'spin 1s linear infinite', margin: '0 auto 8px', color: '#003DA5' }} />
              <div style={{ fontSize: '0.82rem' }}>Cargando historial del servidor...</div>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Evento</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Destinatario</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Canal</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Estado</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Fecha</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Contenido</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '30px 12px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.82rem' }}>
                        <Database style={{ width: 20, height: 20, margin: '0 auto 6px', color: '#D1D5DB' }} />
                        <div>No hay notificaciones registradas{historialCanalFilter ? ` para canal "${historialCanalFilter}"` : ''}</div>
                        <div style={{ fontSize: '0.72rem', marginTop: 4 }}>Las notificaciones aparecerán aquí al aprobar, rechazar o devolver PTAs</div>
                      </td>
                    </tr>
                  ) : (
                    historialFiltered.map(n => {
                      const canalKey = n.canal === 'in_app' ? 'in_app' : n.canal === 'email' ? 'email' : 'in_app';
                      const canalCfg = CANAL_CONFIG[canalKey as Canal] || CANAL_CONFIG.in_app;
                      const estadoCfg = ESTADO_NOTIF[n.estado] || { color: '#6B7280', bg: '#F3F4F6', label: n.estado };
                      const CanalIcon = canalCfg.icon;
                      return (
                        <tr key={n.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.evento || n.subject}</td>
                          <td style={{ padding: '8px 12px', color: '#374151' }}>{n.destinatario}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 6px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 600, color: canalCfg.color, background: `${canalCfg.color}10` }}>
                              <CanalIcon style={{ width: 10, height: 10 }} /> {canalCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 6px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color }}>
                              {estadoCfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.72rem', color: '#6B7280' }}>
                            {n.timestamp ? new Date(n.timestamp).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td style={{ padding: '8px 12px', fontSize: '0.72rem', color: '#6B7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.contenido}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              {historialFiltered.length > 0 && (
                <div style={{ padding: '8px 14px', background: '#FAFBFC', borderTop: '1px solid #F3F4F6', fontSize: '0.68rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database style={{ width: 10, height: 10 }} />
                  Mostrando {historialFiltered.length} de {histStats?.total || 0} notificaciones reales del servidor
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ ESCALAMIENTO TAB ═══ */}
      {!loadingPrefs && activeTab === 'escalamiento' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reglas.map(regla => {
            const descInfo = ESCALATION_DESCRIPTIONS[regla.nombre] || {};
            return (
              <div key={regla.id} style={{
                background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px',
                opacity: regla.activa ? 1 : 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Zap style={{ width: 14, height: 14, color: regla.activa ? '#D97706' : '#D1D5DB' }} />
                    <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>{regla.nombre}</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: '#EFF6FF', color: '#003DA5', fontSize: '0.58rem', fontWeight: 700 }}>
                      {regla.tiempoHoras}h
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: 2 }}>{regla.descripcion || descInfo.desc || ''}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowRight style={{ width: 10, height: 10 }} /> {regla.accion || descInfo.accion || ''}
                  </div>
                </div>
                <button onClick={() => { toggleRegla(regla.id); toast.success(`Regla ${regla.activa ? 'desactivada' : 'activada'}`); }}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2, cursor: 'pointer',
                    background: regla.activa ? '#003DA5' : '#D1D5DB', position: 'relative', transition: 'background 0.2s',
                  }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', background: 'white',
                    transform: regla.activa ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
              </div>
            );
          })}
          {reglas.length === 0 && (
            <div style={{ padding: 30, textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
              No hay reglas de escalamiento configuradas.
            </div>
          )}
        </div>
      )}

      {/* ═══ QUIET HOURS TAB ═══ */}
      {!loadingPrefs && activeTab === 'quiet' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Quiet hours */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Moon style={{ width: 16, height: 16, color: '#6B7280' }} /> Horario de no-molestar
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 12px', borderRadius: 8, background: '#F9FAFB' }}>
              <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.82rem' }}>Activar horario silencioso</span>
              <button onClick={() => { setQuietEnabled(!quietEnabled); setHasUnsavedChanges(true); }}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2, cursor: 'pointer', background: quietEnabled ? '#003DA5' : '#D1D5DB', position: 'relative' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: quietEnabled ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            {quietEnabled && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Inicio</label>
                    <input type="time" value={quietStart} onChange={e => { setQuietStart(e.target.value); setHasUnsavedChanges(true); }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Fin</label>
                    <input type="time" value={quietEnd} onChange={e => { setQuietEnd(e.target.value); setHasUnsavedChanges(true); }}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: '#F9FAFB' }}>
                  <span style={{ fontSize: '0.78rem', color: '#374151' }}>Silenciar fines de semana</span>
                  <button onClick={() => { setQuietWeekends(!quietWeekends); setHasUnsavedChanges(true); }}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2, cursor: 'pointer', background: quietWeekends ? '#003DA5' : '#D1D5DB', position: 'relative' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: quietWeekends ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.72rem', color: '#003DA5' }}>
                  <BellOff style={{ width: 12, height: 12, display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                  Silencio de {quietStart} a {quietEnd}{quietWeekends ? ' + fines de semana' : ''}. Las notificaciones urgentes siempre se entregan.
                  <div style={{ marginTop: 4, fontSize: '0.65rem', color: '#6B7280' }}>
                    ⚡ Esta configuración es respetada por el motor de notificaciones del servidor (emitPTAEvent).
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Resúmenes */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MailCheck style={{ width: 16, height: 16, color: '#D97706' }} /> Resúmenes programados
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#F9FAFB' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.82rem' }}>Resumen diario</div>
                  <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Estadísticas del día anterior por email</div>
                </div>
                <button onClick={() => { setResumenDiario(!resumenDiario); setHasUnsavedChanges(true); }}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2, cursor: 'pointer', background: resumenDiario ? '#003DA5' : '#D1D5DB', position: 'relative' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: resumenDiario ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, background: '#F9FAFB' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.82rem' }}>Resumen semanal</div>
                  <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Métricas y tendencias de la semana (lunes)</div>
                </div>
                <button onClick={() => { setResumenSemanal(!resumenSemanal); setHasUnsavedChanges(true); }}
                  style={{ width: 44, height: 24, borderRadius: 12, border: 'none', padding: 2, cursor: 'pointer', background: resumenSemanal ? '#003DA5' : '#D1D5DB', position: 'relative' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', transform: resumenSemanal ? 'translateX(20px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Hora de envío</label>
                <input type="time" value={resumenHora} onChange={e => { setResumenHora(e.target.value); setHasUnsavedChanges(true); }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
