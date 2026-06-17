/**
 * NotificacionesPTA — Indicador de notificaciones en tiempo real
 *
 * Estrategia híbrida:
 * 1. Supabase Realtime: suscripción a cambios en kv_store con prefijo "pta:"
 * 2. Polling fallback: cada 30s si Realtime no está disponible
 *
 * Muestra un badge con conteo de cambios de estado recientes,
 * un dropdown con los últimos 20 eventos, y botón de actualización.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, CheckCircle, XCircle, Clock, ArrowRight,
  AlertTriangle, MessageSquare, Scale, Eye, X, RefreshCw,
  Wifi, WifiOff, Zap,
} from 'lucide-react';
import { getAuditoriaPTA } from '../../services/api/ptaApi';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface NotifEvent {
  id: string;
  tipo: 'aprobacion' | 'rechazo' | 'devolucion' | 'escalamiento' | 'concertacion' | 'envio' | 'otro';
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
  ptaId?: string;
}

function getNotifIcon(tipo: string) {
  switch (tipo) {
    case 'aprobacion': return { Icon: CheckCircle, color: '#059669', bg: '#D1FAE5' };
    case 'rechazo': return { Icon: XCircle, color: '#DC2626', bg: '#FEE2E2' };
    case 'devolucion': return { Icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7' };
    case 'escalamiento': return { Icon: Scale, color: '#991B1B', bg: '#FEF2F2' };
    case 'concertacion': return { Icon: MessageSquare, color: '#7C3AED', bg: '#F3E8FF' };
    case 'envio': return { Icon: ArrowRight, color: '#003DA5', bg: '#EFF6FF' };
    default: return { Icon: Clock, color: '#6B7280', bg: '#F3F4F6' };
  }
}

function mapAccionToTipo(accion: string): NotifEvent['tipo'] {
  if (accion?.includes('Aprobado') || accion?.includes('APROBADO')) return 'aprobacion';
  if (accion?.includes('Rechazado') || accion?.includes('RECHAZADO')) return 'rechazo';
  if (accion?.includes('Devuelto') || accion?.includes('DEVUELTO')) return 'devolucion';
  if (accion?.includes('ESCALADO') || accion?.includes('SNA')) return 'escalamiento';
  if (accion?.includes('CONCERTACION') || accion?.includes('Concertado')) return 'concertacion';
  if (accion?.includes('Enviado') || accion?.includes('Pendiente')) return 'envio';
  return 'otro';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString('es-CO');
}

// Singleton Supabase client for realtime
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );
    } catch (err) {
      console.log('Supabase client creation failed:', err);
    }
  }
  return supabaseClient;
}

export function NotificacionesPTA() {
  const [events, setEvents] = useState<NotifEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [leidas, setLeidas] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('pta_notifs_leidas');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const pollRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const notifContainerRef = useRef<any>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await getAuditoriaPTA({ periodo: '2025-2' });
      if (res.success && res.data) {
        const notifs: NotifEvent[] = (res.data as any[]).slice(0, 20).map((ev: any) => ({
          id: ev.id || `ev-${ev.fecha}-${ev.pta_id}`,
          tipo: mapAccionToTipo(ev.accion || ev.estado_nuevo),
          titulo: ev.accion || ev.estado_nuevo || 'Cambio de estado',
          descripcion: ev.docente_nombre
            ? `${ev.docente_nombre} — ${ev.observaciones || ev.accion || ''}`
            : ev.observaciones || 'Actualización PTA',
          fecha: ev.fecha || ev.created_at || new Date().toISOString(),
          leida: leidas.has(ev.id || `ev-${ev.fecha}-${ev.pta_id}`),
          ptaId: ev.pta_id,
        }));
        setEvents(notifs);
        setLastUpdate(new Date().toLocaleTimeString('es-CO'));
      }
    } catch (err) {
      console.log('Error polling PTA notifications:', err);
    }
  }, [leidas]);

  // Setup Supabase Realtime channel
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setRealtimeStatus('disconnected');
      return;
    }

    try {
      const channel = client
        .channel('pta-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'kv_store_e03c1c02',
          filter: 'key=like.pta:%',
        }, (payload: any) => {
          console.log('Realtime PTA change:', payload);
          // On any change, refresh notifications
          fetchEvents();
        })
        .subscribe((status: string) => {
          console.log('Realtime subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeStatus('disconnected');
          }
        });

      channelRef.current = channel;
    } catch (err) {
      console.log('Realtime setup failed, using polling fallback:', err);
      setRealtimeStatus('disconnected');
    }

    return () => {
      if (channelRef.current) {
        try {
          const client = getSupabaseClient();
          client?.removeChannel(channelRef.current);
        } catch {}
      }
    };
  }, []);

  // Polling fallback (always active but less frequent if realtime is connected)
  useEffect(() => {
    fetchEvents();
    const interval = realtimeStatus === 'connected' ? 60000 : 30000;
    pollRef.current = setInterval(fetchEvents, interval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchEvents, realtimeStatus]);

  const noLeidas = events.filter(e => !leidas.has(e.id)).length;

  const marcarTodasLeidas = () => {
    const allIds = new Set(events.map(e => e.id));
    setLeidas(allIds);
    localStorage.setItem('pta_notifs_leidas', JSON.stringify(Array.from(allIds)));
  };

  const marcarLeida = (id: string) => {
    setLeidas(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('pta_notifs_leidas', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const StatusIcon = realtimeStatus === 'connected' ? Wifi : realtimeStatus === 'connecting' ? Zap : WifiOff;
  const statusLabel = realtimeStatus === 'connected' ? 'Realtime activo' : realtimeStatus === 'connecting' ? 'Conectando...' : 'Polling (30s)';
  const statusColor = realtimeStatus === 'connected' ? '#059669' : realtimeStatus === 'connecting' ? '#D97706' : '#6B7280';

  return (
    <div style={{ position: 'relative' }} ref={notifContainerRef}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 38, height: 38, borderRadius: 10,
          border: '1px solid #E5E7EB', background: 'white',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', position: 'relative',
        }}
      >
        <Bell style={{ width: 18, height: 18, color: noLeidas > 0 ? '#003DA5' : '#9CA3AF' }} />
        {noLeidas > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: -4, right: -4,
              width: noLeidas > 9 ? 22 : 18, height: 18,
              borderRadius: 10, background: '#DC2626',
              color: 'white', fontSize: '0.62rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white',
            }}
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </motion.div>
        )}
        {/* Realtime indicator dot */}
        <div style={{
          position: 'absolute', bottom: -2, right: -2,
          width: 8, height: 8, borderRadius: '50%',
          background: statusColor, border: '1.5px solid white',
        }} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
              <motion.div
                key="notif-dropdown"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'fixed',
                  top: notifContainerRef.current ? notifContainerRef.current.getBoundingClientRect().bottom + 8 : 60,
                  right: 16,
                  background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.15)', zIndex: 9999,
                  width: 360, maxWidth: 'calc(100vw - 32px)', maxHeight: 520, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '14px 18px', borderBottom: '1px solid #E5E7EB',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>Notificaciones</span>
                    {noLeidas > 0 && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 10,
                        background: '#DC2626', color: 'white',
                        fontSize: '0.65rem', fontWeight: 700,
                      }}>
                        {noLeidas} nueva{noLeidas !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {noLeidas > 0 && (
                      <button
                        onClick={marcarTodasLeidas}
                        title="Marcar todas como leídas"
                        style={{
                          padding: '4px 8px', borderRadius: 6, border: 'none',
                          background: '#EFF6FF', color: '#003DA5', cursor: 'pointer',
                          fontSize: '0.68rem', fontWeight: 600,
                        }}
                      >
                        Marcar leídas
                      </button>
                    )}
                    <button
                      onClick={fetchEvents}
                      title="Actualizar"
                      style={{
                        width: 28, height: 28, borderRadius: 6, border: 'none',
                        background: '#F3F4F6', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <RefreshCw style={{ width: 12, height: 12, color: '#6B7280' }} />
                    </button>
                  </div>
                </div>

                {/* Realtime status bar */}
                <div style={{
                  padding: '6px 18px', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontSize: '0.65rem', color: '#6B7280',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <StatusIcon style={{ width: 11, height: 11, color: statusColor }} />
                    <span style={{ color: statusColor, fontWeight: 600 }}>{statusLabel}</span>
                  </div>
                  {lastUpdate && (
                    <span>Última act.: {lastUpdate}</span>
                  )}
                </div>

                {/* Events list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {events.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                      <Bell style={{ width: 28, height: 28, color: '#D1D5DB', margin: '0 auto 10px' }} />
                      <p style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>Sin notificaciones recientes</p>
                    </div>
                  ) : (
                    events.map((ev) => {
                      const { Icon, color, bg } = getNotifIcon(ev.tipo);
                      const isUnread = !leidas.has(ev.id);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => marcarLeida(ev.id)}
                          style={{
                            padding: '12px 18px', borderBottom: '1px solid #F9FAFB',
                            cursor: 'pointer', display: 'flex', gap: 10,
                            background: isUnread ? '#FAFBFF' : 'transparent',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                          onMouseLeave={e => e.currentTarget.style.background = isUnread ? '#FAFBFF' : 'transparent'}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, background: bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <Icon style={{ width: 15, height: 15, color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '0.78rem', fontWeight: isUnread ? 700 : 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ev.titulo}
                              </span>
                              <span style={{ fontSize: '0.62rem', color: '#9CA3AF', flexShrink: 0 }}>
                                {timeAgo(ev.fecha)}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.descripcion}
                            </p>
                          </div>
                          {isUnread && (
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#003DA5', flexShrink: 0, marginTop: 8 }} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  padding: '8px 18px', background: '#F9FAFB', borderTop: '1px solid #F3F4F6',
                  fontSize: '0.65rem', color: '#9CA3AF', textAlign: 'center',
                }}>
                  {realtimeStatus === 'connected'
                    ? 'Las actualizaciones se reciben automáticamente vía Supabase Realtime'
                    : 'Actualizaciones cada 30 segundos vía polling HTTP'
                  }
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}