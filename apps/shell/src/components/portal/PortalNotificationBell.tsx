/**
 * PortalNotificationBell — Campana de notificaciones para el Portal Transaccional
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle, XCircle, AlertTriangle, Info, X, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '../esap/NotificationsContext';

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

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  success: { icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
  error: { icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
  warning: { icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7' },
  info: { icon: Info, color: '#003DA5', bg: '#EFF6FF' },
};

export function PortalNotificationBell() {
  const { notifications, markAsRead, clearAll, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleMarkAllRead = () => {
    notifications.forEach((n) => {
      if (!n.read) markAsRead(n.id);
    });
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: open ? '#EFF6FF' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
        }}
        title="Notificaciones"
      >
        <Bell style={{ width: 18, height: 18, color: open ? '#003DA5' : '#6B7280' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#DC2626',
              color: 'white',
              fontSize: '0.58rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              border: '2px solid white',
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
              width: 360,
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
                    onClick={handleMarkAllRead}
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
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearAll();
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
                    title="Limpiar todas"
                  >
                    <Trash2 style={{ width: 10, height: 10 }} />
                  </button>
                )}
                <button
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
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                  <Bell style={{ width: 28, height: 28, margin: '0 auto 8px', color: '#D1D5DB' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sin notificaciones</div>
                  <div style={{ fontSize: '0.72rem', marginTop: 2 }}>Las notificaciones aparecerán aquí</div>
                </div>
              ) : (
                notifications.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F9FAFB',
                        cursor: 'pointer',
                        background: n.read ? 'white' : '#F9FAFB',
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
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#111827' }}>{n.title}</div>
                        <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: 2 }}>{n.message}</div>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 6 }}>{timeAgo(new Date(n.timestamp))}</div>
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

