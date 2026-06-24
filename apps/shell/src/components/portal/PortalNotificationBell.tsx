/**
 * Campana de notificaciones del Portal Transaccional.
 * Lee desde NotificationsContext → notifications-service (3009) vía GET /users/{id}/notifications.
 * Las alertas de Control Interno se insertan en notifications.notificacion desde el servicio 3007.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, X, Check, Trash2 } from 'lucide-react';
import { useNotifications, type GlobalNotification } from '../esap/NotificationsContext';

function timeAgo(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 5) return 'ahora';
  if (secs < 60) return `hace ${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

const TYPE_CONFIG: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
  error: { icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
  warning: { icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7' },
  info: { icon: Info, color: '#003DA5', bg: '#EFF6FF' },
};

function visualType(n: GlobalNotification): string {
  const p = (n.prioridad || '').toLowerCase();
  if (p === 'crítica' || p === 'critica' || p === 'alta') return 'warning';
  if (n.tipo_notificacion?.includes('rechazo')) return 'error';
  if (n.tipo_notificacion?.includes('aprobacion') || n.tipo_notificacion?.includes('APR-001')) return 'success';
  return 'info';
}

interface PortalNotificationBellProps {
  /** Navegación del portal (ej. control-interno-gestion) */
  onNavigate?: (section: string) => void;
}

export function PortalNotificationBell({ onNavigate }: PortalNotificationBellProps) {
  const { notifications, markAsRead, markAllAsRead, clearNotifications, unreadCount } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visible = notifications.filter((n) => !n.archivada);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [open]);

  const handleOpenNotification = (n: GlobalNotification) => {
    markAsRead(n.id_notificacion);
    const url = (n.url_accion || '').trim();
    if (url && onNavigate) {
      const section = url.includes('::') ? url.split('::')[0] : url.replace(/^\//, '');
      if (section) onNavigate(section);
    }
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: 10,
          border: 'none',
          background: open ? '#EFF6FF' : '#F3F4F6',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        title="Notificaciones"
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
      >
        <Bell style={{ width: 20, height: 20, color: open ? '#003DA5' : '#374151', strokeWidth: 2 }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: '#EF4444',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #FFFFFF',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              width: 380,
              maxHeight: 460,
              background: 'white',
              borderRadius: 14,
              border: '1px solid #E5E7EB',
              boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontWeight: 800, color: '#111827', fontSize: '0.92rem' }}>Notificaciones</span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: '#EFF6FF',
                      color: '#003DA5',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllAsRead()}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: '#003DA5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                    title="Marcar todas como leídas"
                  >
                    <Check style={{ width: 10, height: 10 }} /> Leer todas
                  </button>
                )}
                {visible.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearNotifications();
                      setOpen(false);
                    }}
                    style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      background: 'white',
                      cursor: 'pointer',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                    title="Limpiar vista local"
                  >
                    <Trash2 style={{ width: 10, height: 10 }} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X style={{ width: 14, height: 14, color: '#9CA3AF' }} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
              {visible.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                  <Bell style={{ width: 28, height: 28, margin: '0 auto 8px', color: '#D1D5DB' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sin notificaciones</div>
                  <div style={{ fontSize: '0.72rem', marginTop: 2 }}>
                    Las alertas de Control Interno y otros módulos aparecerán aquí
                  </div>
                </div>
              ) : (
                visible.map((n) => {
                  const cfg = TYPE_CONFIG[visualType(n)] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id_notificacion}
                      onClick={() => handleOpenNotification(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F9FAFB',
                        cursor: 'pointer',
                        background: n.leida ? 'white' : '#F9FAFB',
                        display: 'flex',
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 12,
                          background: cfg.bg,
                          color: cfg.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon style={{ width: 16, height: 16 }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#111827' }}>{n.titulo}</div>
                        <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: 2 }}>{n.mensaje}</div>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 6 }}>
                          {timeAgo(new Date(n.fecha_creacion))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
