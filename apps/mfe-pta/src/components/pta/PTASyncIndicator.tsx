/**
 * PTASyncIndicator — Indicador visual de sincronización en tiempo real
 * 
 * Muestra:
 * - Estado de conexión (verde pulsante = conectado, gris = desconectado)
 * - Segundos desde último sync
 * - Badge con eventos no leídos
 * - Dropdown con eventos recientes del otro sistema
 * - Botón de refresh manual
 * 
 * Integrado en Backoffice y Portal PTA para coordinación bidireccional.
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, RefreshCw, X, ChevronRight, CheckCircle,
  XCircle, AlertTriangle, Scale, MessageSquare, ArrowRight,
  Clock, Eye, Wifi, WifiOff, Bell, ExternalLink,
} from 'lucide-react';
import type { PTASyncEvent, PTASyncState } from '../../hooks/usePTARealtimeSync';
import { getPtaStatusVisual } from './shared/ptaStatusVisuals';

interface PTASyncIndicatorProps {
  syncState: PTASyncState;
  /** 'backoffice' | 'portal' */
  sistema: 'backoffice' | 'portal';
  /** Callback when user clicks an event to navigate */
  onEventClick?: (event: PTASyncEvent) => void;
  /** Compact mode for toolbar */
  compact?: boolean;
}

function getEventIcon(tipo: string) {
  switch (tipo) {
    case 'cambio_estado': return { Icon: ArrowRight, color: '#003DA5', bg: '#EFF6FF' };
    case 'notificacion': return { Icon: Bell, color: '#D97706', bg: '#FEF3C7' };
    case 'respuesta_docente': return { Icon: MessageSquare, color: '#7C3AED', bg: '#F3E8FF' };
    case 'concertacion_cerrada': return { Icon: CheckCircle, color: '#059669', bg: '#D1FAE5' };
    case 'escalamiento': return { Icon: Scale, color: '#991B1B', bg: '#FEF2F2' };
    case 'envio_aprobacion': return { Icon: ArrowRight, color: '#003DA5', bg: '#EFF6FF' };
    case 'revision_componente': return { Icon: Eye, color: '#7E22CE', bg: '#F3E8FF' };
    default: return { Icon: Activity, color: '#6B7280', bg: '#F3F4F6' };
  }
}

function getEstadoLabel(estado: string): string {
  const map: Record<string, string> = {
    'PROPUESTO_POR_DIRECCION': 'Propuesto por Dir.',
    'NOTIFICADO_DOCENTE': 'Notificado',
    'ACEPTADO_DOCENTE': 'Aceptado',
    'MODIFICADO_DOCENTE': 'Modificado',
    'OBJETADO_DOCENTE': 'Objetado',
    'EN_CONCERTACION': 'En Concertación',
    'CONCERTADO': 'Concertado',
    'ESCALADO_SNA': 'Escalado SNA',
    'Pendiente Jefatura': 'Pend. Jefatura',
    'Pendiente Decanatura': 'Pend. Decanatura',
    'Pendiente Gestión Profesoral': 'Pend. G. Profesoral',
    'Aprobado': 'Aprobado',
    'Rechazado': 'Rechazado',
    'Devuelto': 'Devuelto',
  };
  return map[estado] || estado;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const secs = Math.floor(diffMs / 1000);
  if (secs < 5) return 'ahora';
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return new Date(dateStr).toLocaleDateString('es-CO');
}

export function PTASyncIndicator({
  syncState,
  sistema,
  onEventClick,
  compact = false,
}: PTASyncIndicatorProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const {
    isConnected,
    unreadEvents,
    unreadCount,
    secondsSinceLastSync,
    isPolling,
    forceRefresh,
    markAllRead,
  } = syncState;

  const otroSistema = sistema === 'backoffice' ? 'Portal Docente' : 'Backoffice';

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: compact ? 4 : 6,
          padding: compact ? '5px 8px' : '6px 12px',
          borderRadius: 9,
          border: isConnected ? '1px solid #D1FAE5' : '1px solid #E5E7EB',
          background: isConnected ? '#F0FDF4' : '#F9FAFB',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
        }}
        title={`Sincronización ${isConnected ? 'activa' : 'inactiva'} con ${otroSistema}`}
      >
        {/* Pulse dot */}
        <div style={{ position: 'relative', width: 10, height: 10, flexShrink: 0 }}>
          {isConnected && (
            <div style={{
              position: 'absolute', inset: -2,
              borderRadius: '50%',
              background: '#10B981',
              opacity: 0.3,
              animation: 'ptaSyncPulse 2s ease-in-out infinite',
            }} />
          )}
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isConnected ? '#10B981' : '#9CA3AF',
            position: 'relative',
          }} />
        </div>

        {!compact && (
          <span style={{
            fontSize: '0.72rem', fontWeight: 600,
            color: isConnected ? '#065F46' : '#6B7280',
          }}>
            Sync
          </span>
        )}

        {/* Spinning icon during poll */}
        {isPolling && (
          <RefreshCw style={{
            width: 10, height: 10,
            color: '#10B981',
            animation: 'ptaSyncSpin 1s linear infinite',
          }} />
        )}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              position: 'absolute', top: -5, right: -5,
              width: unreadCount > 9 ? 20 : 16, height: 16,
              borderRadius: 8,
              background: '#DC2626',
              color: 'white',
              fontSize: '0.58rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid white',
              boxShadow: '0 2px 6px rgba(220,38,38,0.3)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </button>

      {/* CSS Animations */}
      <style>{`
        @keyframes ptaSyncPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes ptaSyncSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Dropdown Panel — portal with AnimatePresence inside */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="sync-dropdown"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + 6 : 60,
                right: 16,
                width: 360,
                maxWidth: 'calc(100vw - 32px)',
                maxHeight: 480,
                background: 'white',
                borderRadius: 14,
                border: '1px solid #E5E7EB',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                zIndex: 9999,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity style={{ width: 15, height: 15, color: '#003DA5' }} />
                    Sincronización PTA
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 2 }}>
                    {isConnected ? (
                      <span style={{ color: '#059669' }}>
                        <Wifi style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        Conectado — polling cada 10s
                        {secondsSinceLastSync > 0 && ` (hace ${secondsSinceLastSync}s)`}
                      </span>
                    ) : (
                      <span style={{ color: '#6B7280' }}>
                        <WifiOff style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        Desconectado
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => forceRefresh()}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      border: '1px solid #E5E7EB', background: '#F9FAFB',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Actualizar ahora"
                  >
                    <RefreshCw style={{ width: 13, height: 13, color: '#6B7280', ...(isPolling ? { animation: 'ptaSyncSpin 1s linear infinite' } : {}) }} />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      width: 30, height: 30, borderRadius: 7,
                      border: '1px solid #E5E7EB', background: '#F9FAFB',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X style={{ width: 13, height: 13, color: '#6B7280' }} />
                  </button>
                </div>
              </div>

              {/* Info banner */}
              <div style={{
                padding: '8px 16px',
                background: '#F0FDF4',
                borderBottom: '1px solid #D1FAE5',
                fontSize: '0.7rem', color: '#065F46',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
                Cambios realizados en <strong style={{ marginLeft: 2 }}>{otroSistema}</strong> aparecerán aquí automáticamente
              </div>

              {/* Events list */}
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
                {unreadEvents.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                    <CheckCircle style={{ width: 28, height: 28, color: '#D1D5DB', margin: '0 auto 8px' }} />
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6B7280' }}>
                      Todo sincronizado
                    </p>
                    <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>
                      No hay cambios pendientes desde {otroSistema}
                    </p>
                  </div>
                ) : (
                  unreadEvents.map((event) => {
                    const { Icon, color, bg } = getEventIcon(event.tipo);
                    const stateVisual = getPtaStatusVisual(event.estado_nuevo);
                    return (
                      <button
                        key={event.id}
                        onClick={() => {
                          onEventClick?.(event);
                          setOpen(false);
                        }}
                        style={{
                          width: '100%', padding: '10px 16px',
                          border: 'none', borderBottom: '1px solid #F9FAFB',
                          background: 'white', cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex', gap: 10, alignItems: 'flex-start',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 1,
                        }}>
                          <Icon style={{ width: 14, height: 14, color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {event.docente_nombre || 'PTA'}
                            </span>
                            <span style={{
                              padding: '1px 6px', borderRadius: 5,
                              background: stateVisual.bg,
                              color: stateVisual.color,
                              border: `1px solid ${stateVisual.border}`,
                              fontSize: '0.62rem', fontWeight: 700, flexShrink: 0,
                            }}>
                              {getEstadoLabel(event.estado_nuevo)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 2 }}>
                            {event.mensaje || event.tipo}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{event.actor}</span>
                            <span>•</span>
                            <span>{timeAgo(event.timestamp)}</span>
                            <span>•</span>
                            <span style={{
                              padding: '0 4px', borderRadius: 3,
                              background: event.sistema_origen === 'backoffice' ? '#EFF6FF' : '#F3E8FF',
                              color: event.sistema_origen === 'backoffice' ? '#1E40AF' : '#6B21A8',
                              fontSize: '0.58rem', fontWeight: 600,
                            }}>
                              {event.sistema_origen === 'backoffice' ? 'Backoffice' : 'Portal'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight style={{ width: 12, height: 12, color: '#D1D5DB', flexShrink: 0, marginTop: 6 }} />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {unreadEvents.length > 0 && (
                <div style={{
                  padding: '10px 16px',
                  borderTop: '1px solid #F3F4F6',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                    {unreadCount} evento{unreadCount !== 1 ? 's' : ''} sin leer
                  </span>
                  <button
                    onClick={() => markAllRead()}
                    style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid #E5E7EB', background: 'white',
                      fontSize: '0.7rem', fontWeight: 600, color: '#003DA5',
                      cursor: 'pointer',
                    }}
                  >
                    Marcar todo como leído
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
