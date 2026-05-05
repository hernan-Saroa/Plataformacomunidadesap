/**
 * PTAMobileBar — Bottom Navigation Bar para el módulo PTA (solo mobile)
 * Se oculta en tablet+ vía CSS (.pta-mobile-bottom-bar media query)
 *
 * v2 — Incluye botón "Más" con bottom sheet integrado para vistas secundarias.
 */

import React, { useState } from 'react';
import {
  FileText, Users, Columns3, BarChart3, Scale,
  CheckCircle, Calendar, Bell, MoreHorizontal,
  BookOpen, AlertTriangle, GitCompare, RefreshCw,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  color?: string;
}

interface MoreItem {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface PTAMobileBarProps {
  moduleView: string;
  onNavigate: (view: string) => void;
  pendingCount?: number;
  concertacionCount?: number;
}

export function PTAMobileBar({
  moduleView,
  onNavigate,
  pendingCount = 0,
  concertacionCount = 0,
}: PTAMobileBarProps) {
  const [showMore, setShowMore] = useState(false);

  const navItems: NavItem[] = [
    {
      key: 'banco_docentes',
      label: 'Docentes',
      icon: Users,
      color: '#059669',
    },
    {
      key: 'gestion',
      label: 'Gestión',
      icon: FileText,
      badge: pendingCount,
      color: '#003DA5',
    },
    {
      key: 'sna',
      label: 'SNA',
      icon: Scale,
      badge: concertacionCount,
      color: '#DC2626',
    },
    {
      key: 'kanban',
      label: 'Kanban',
      icon: Columns3,
      color: '#7C3AED',
    },
  ];

  const moreItems: MoreItem[] = [
    {
      key: 'centro_reportes',
      label: 'Centro de Reportes',
      icon: BarChart3,
      color: '#D97706',
      description: 'Reportes consolidados del sistema',
    },
    {
      key: 'alertas',
      label: 'Alertas Tempranas',
      icon: AlertTriangle,
      color: '#EA580C',
      description: 'PTAs con riesgo o sin avance',
    },
    {
      key: 'calendario_academico',
      label: 'Calendario Académico',
      icon: Calendar,
      color: '#7C3AED',
      description: 'Fechas y plazos del proceso',
    },

    {
      key: 'acta_concertacion',
      label: 'Acta de Concertación',
      icon: CheckCircle,
      color: '#059669',
      description: 'Generar y firmar actas',
    },
    {
      key: 'tablero',
      label: 'Tablero de Control',
      icon: Layers,
      color: '#0891B2',
      description: 'KPIs y métricas ejecutivas',
    },
    {
      key: 'mapeo_sincronizacion',
      label: 'Sincronización',
      icon: RefreshCw,
      color: '#6B7280',
      description: 'Mapeo entre Portal y Backoffice',
    },
    {
      key: 'preferencias_notificaciones',
      label: 'Notificaciones',
      icon: Bell,
      color: '#003DA5',
      description: 'Configurar alertas personales',
    },
    {
      key: 'comparativo',
      label: 'Comparativo Periodos',
      icon: GitCompare,
      color: '#4F46E5',
      description: 'Comparar periodos académicos',
    },
  ];

  const handleNavigate = (key: string) => {
    onNavigate(key);
    setShowMore(false);
  };

  return (
    <>
      {/* ─── Main Bottom Nav Bar ─── */}
      <nav className="pta-mobile-bottom-bar" role="navigation" aria-label="Navegación principal PTA">
        {navItems.map((item) => {
          const isActive = moduleView === item.key;
          const Icon = item.icon;
          const color = isActive ? (item.color || '#003DA5') : '#9CA3AF';

          return (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`pta-bottom-nav-item ${isActive ? 'active' : ''}`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="pta-bottom-nav-icon-wrap">
                <Icon
                  style={{
                    width: 20,
                    height: 20,
                    color,
                    transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
                <AnimatePresence>
                  {item.badge !== undefined && item.badge > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="pta-bottom-nav-badge"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color,
                  transition: 'all 0.18s ease',
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </span>
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="pta-nav-indicator"
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: item.color || '#003DA5',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}

        {/* ─── "Más" button ─── */}
        <button
          className={`pta-bottom-nav-item ${showMore ? 'active' : ''}`}
          onClick={() => setShowMore(true)}
          aria-label="Más vistas"
          aria-expanded={showMore}
        >
          <div
            className="pta-bottom-nav-icon-wrap"
            style={showMore ? { background: '#EFF6FF', borderRadius: 10 } : {}}
          >
            <MoreHorizontal
              style={{
                width: 20,
                height: 20,
                color: showMore ? '#003DA5' : '#9CA3AF',
                transition: 'all 0.18s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: showMore ? 700 : 500,
              color: showMore ? '#003DA5' : '#9CA3AF',
              transition: 'all 0.18s ease',
              lineHeight: 1.2,
            }}
          >
            Más
          </span>
        </button>
      </nav>

      {/* ─── Bottom Sheet for secondary views ─── */}
      <AnimatePresence>
        {showMore && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pta-more-sheet-backdrop"
              onClick={() => setShowMore(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
              className="pta-more-sheet-panel"
              role="dialog"
              aria-label="Más vistas disponibles"
            >
              {/* Handle */}
              <div className="pta-sheet-handle">
                <div className="pta-sheet-handle-bar" />
              </div>

              {/* Header */}
              <div
                style={{
                  padding: '4px 16px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #F3F4F6',
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Más vistas — PTA
                </span>
                <button
                  onClick={() => setShowMore(false)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#6B7280',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>

              {/* Items list */}
              {moreItems.map((item, idx) => {
                const isActive = moduleView === item.key;
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.key}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => handleNavigate(item.key)}
                    className={`pta-sheet-item ${isActive ? 'active' : ''}`}
                  >
                    {/* Icon chip */}
                    <div
                      className="pta-sheet-item-icon"
                      style={{ background: `${item.color}14` }}
                    >
                      <Icon style={{ width: 18, height: 18, color: item.color }} />
                    </div>

                    {/* Labels */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#003DA5' : '#374151',
                          lineHeight: 1.3,
                        }}
                      >
                        {item.label}
                      </div>
                      {item.description && (
                        <div
                          style={{
                            fontSize: '0.68rem',
                            color: '#9CA3AF',
                            marginTop: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.description}
                        </div>
                      )}
                    </div>

                    {/* Active indicator */}
                    {isActive && (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#003DA5',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}

              {/* Bottom padding */}
              <div style={{ height: 16 }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * PTAMobileMoreSheet — standalone sheet (legacy export)
 * Ahora el sheet está integrado en PTAMobileBar.
 * Se mantiene para compatibilidad con posibles imports externos.
 */
interface PTAMoreMenuProps {
  moduleView: string;
  onNavigate: (view: string) => void;
}

export function PTAMobileMoreSheet({ moduleView, onNavigate }: PTAMoreMenuProps) {
  const [open, setOpen] = React.useState(false);

  const moreItems = [
    { key: 'alertas', label: 'Alertas Tempranas', icon: AlertTriangle, color: '#D97706' },
    { key: 'calendario_academico', label: 'Calendario Académico', icon: Calendar, color: '#7C3AED' },

    { key: 'acta_concertacion', label: 'Acta Concertación', icon: CheckCircle, color: '#059669' },
    { key: 'tablero', label: 'Tablero Control', icon: BarChart3, color: '#0891B2' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 70,
              backdropFilter: 'blur(2px)',
            }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 71,
              background: 'white',
              borderRadius: '20px 20px 0 0',
              padding: '8px 0 env(safe-area-inset-bottom, 0px)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
              maxHeight: '60vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E5E7EB' }} />
            </div>
            <div style={{ padding: '4px 16px 8px', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Más vistas
            </div>
            {moreItems.map(item => {
              const isActive = moduleView === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { onNavigate(item.key); setOpen(false); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    border: 'none',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    borderBottom: '1px solid #F9FAFB',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${item.color}12`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon style={{ width: 18, height: 18, color: item.color }} />
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: isActive ? 700 : 500, color: isActive ? '#003DA5' : '#374151' }}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#003DA5' }} />
                  )}
                </button>
              );
            })}
            <div style={{ height: 16 }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
