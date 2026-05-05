/**
 * ═══════════════════════════════════════════════════════════════
 * TABLERO DE CONTROL UNIFICADO — PTA
 * ═══════════════════════════════════════════════════════════════
 *
 * Componente unificado que consolida todas las vistas de reportes
 * bajo un solo panel con pestañas laterales para navegación rápida.
 */

import { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Globe, TrendingUp, Shield, Map, ArrowRight,
  Calendar, Activity, LineChart, Layers, ChevronLeft, ChevronRight,
} from 'lucide-react';

// Importar componentes de reportes
import { CentroReportesPTA } from './CentroReportesPTA';
import { TableroControlPTA } from './TableroControlPTA';
import { ReporteNacionalPTA } from './ReporteNacionalPTA';
import { ComparativoPeriodosPTA } from './ComparativoPeriodosPTA';
import { IndicadoresRendimientoPTA } from './IndicadoresRendimientoPTA';
import { DashboardDirectivoPTA } from './DashboardDirectivoPTA';
import { GestionTerritorialPTA } from './GestionTerritorialPTA';
import { MapaCoberturaTerritorialPTA } from './MapaCoberturaTerritorialPTA';
import { WorkflowVisualizerPTA } from './WorkflowVisualizerPTA';
import { CronogramaProcesoPTA } from './CronogramaProcesoPTA';
import { MetricasSLA_PTA } from './MetricasSLA_PTA';

type TabKey =
  | 'centro_reportes'
  | 'tablero'
  | 'reporte'
  | 'comparativo'
  | 'indicadores'
  | 'directivo'
  | 'territorial'
  | 'mapa_territorial'
  | 'workflow_visualizer'
  | 'cronograma'
  | 'metricas_sla';

interface TabDef {
  key: TabKey;
  label: string;
  shortLabel: string;
  icon: any;
  color: string;
}

const TABS: TabDef[] = [
  { key: 'centro_reportes', label: 'Centro de Reportes', shortLabel: 'Centro', icon: BarChart3, color: '#003DA5' },
  { key: 'tablero', label: 'Tablero de Control', shortLabel: 'Tablero', icon: Layers, color: '#0891B2' },
  { key: 'reporte', label: 'Reporte Nacional', shortLabel: 'Nacional', icon: Globe, color: '#059669' },
  { key: 'comparativo', label: 'Comparativo Periodos', shortLabel: 'Comparativo', icon: TrendingUp, color: '#7C3AED' },
  { key: 'indicadores', label: 'Indicadores', shortLabel: 'Indicadores', icon: LineChart, color: '#EA580C' },
  { key: 'directivo', label: 'Dashboard Directivo', shortLabel: 'Directivo', icon: Shield, color: '#DC2626' },
  { key: 'territorial', label: 'Gestión Territorial', shortLabel: 'Territorial', icon: Map, color: '#0D9488' },
  { key: 'mapa_territorial', label: 'Mapa de Cobertura', shortLabel: 'Mapa', icon: Globe, color: '#2563EB' },
  { key: 'workflow_visualizer', label: 'Flujo de Estados', shortLabel: 'Flujo', icon: ArrowRight, color: '#9333EA' },
  { key: 'cronograma', label: 'Cronograma del Proceso', shortLabel: 'Cronograma', icon: Calendar, color: '#B45309' },
  { key: 'metricas_sla', label: 'Métricas SLA', shortLabel: 'SLA', icon: Activity, color: '#D97706' },
];

function TabContent({ tabKey }: { tabKey: TabKey }) {
  switch (tabKey) {
    case 'centro_reportes': return <CentroReportesPTA />;
    case 'tablero': return <TableroControlPTA />;
    case 'reporte': return <ReporteNacionalPTA />;
    case 'comparativo': return <ComparativoPeriodosPTA />;
    case 'indicadores': return <IndicadoresRendimientoPTA />;
    case 'directivo': return <DashboardDirectivoPTA />;
    case 'territorial': return <GestionTerritorialPTA />;
    case 'mapa_territorial': return <MapaCoberturaTerritorialPTA />;
    case 'workflow_visualizer': return <WorkflowVisualizerPTA />;
    case 'cronograma': return <CronogramaProcesoPTA />;
    case 'metricas_sla': return <MetricasSLA_PTA />;
    default: return null;
  }
}

export function TableroControlUnificadoPTA() {
  const [activeTab, setActiveTab] = useState<TabKey>('centro_reportes');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeTabDef = TABS.find(t => t.key === activeTab)!;

  return (
    <div style={{
      display: 'flex', gap: 0, minHeight: 'calc(100vh - 220px)',
      background: '#F9FAFB', borderRadius: 16, overflow: 'hidden',
      border: '1px solid #E5E7EB',
    }}>
      {/* ─── Sidebar de Pestañas ─── */}
      <div style={{
        width: sidebarCollapsed ? 56 : 220,
        background: 'white',
        borderRight: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: sidebarCollapsed ? '16px 8px' : '16px 16px',
          borderBottom: '1px solid #F3F4F6',
          display: 'flex', alignItems: 'center', gap: 10,
          justifyContent: sidebarCollapsed ? 'center' : 'space-between',
        }}>
          {!sidebarCollapsed && (
            <div>
              <h3 style={{
                fontSize: '0.88rem', fontWeight: 800, color: '#111827',
                margin: 0, letterSpacing: '-0.01em',
              }}>
                Reportes
              </h3>
              <p style={{ fontSize: '0.68rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                {TABS.length} vistas disponibles
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid #E5E7EB', background: 'white',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
            title={sidebarCollapsed ? 'Expandir panel' : 'Colapsar panel'}
          >
            {sidebarCollapsed
              ? <ChevronRight style={{ width: 14, height: 14 }} />
              : <ChevronLeft style={{ width: 14, height: 14 }} />
            }
          </button>
        </div>

        {/* Tab List */}
        <div style={{
          flex: 1, overflow: 'auto', padding: '8px 6px',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                title={sidebarCollapsed ? tab.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: 10,
                  padding: sidebarCollapsed ? '10px 0' : '9px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive
                    ? `${tab.color}10`
                    : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  position: 'relative',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = '#F3F4F6';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: sidebarCollapsed ? '50%' : 0,
                    top: sidebarCollapsed ? 'auto' : '50%',
                    bottom: sidebarCollapsed ? -2 : 'auto',
                    transform: sidebarCollapsed
                      ? 'translateX(-50%)'
                      : 'translateY(-50%)',
                    width: sidebarCollapsed ? 16 : 3,
                    height: sidebarCollapsed ? 3 : 20,
                    borderRadius: 2,
                    background: tab.color,
                  }} />
                )}
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? `${tab.color}18` : '#F9FAFB',
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}>
                  <Icon style={{
                    width: 16, height: 16,
                    color: isActive ? tab.color : '#9CA3AF',
                    transition: 'color 0.15s',
                  }} />
                </div>
                {!sidebarCollapsed && (
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? tab.color : '#4B5563',
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', textAlign: 'left',
                    transition: 'color 0.15s',
                  }}>
                    {tab.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Contenido Principal ─── */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Tab Header Bar */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #E5E7EB',
          background: 'white',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${activeTabDef.color}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <activeTabDef.icon style={{ width: 18, height: 18, color: activeTabDef.color }} />
          </div>
          <div>
            <h2 style={{
              fontSize: '1.05rem', fontWeight: 800, color: '#111827',
              margin: 0, letterSpacing: '-0.01em',
            }}>
              {activeTabDef.label}
            </h2>
          </div>

          {/* Quick-nav chips (horizontal scrollable) */}
          <div style={{
            marginLeft: 'auto', display: 'flex', gap: 4,
            overflow: 'auto', flexShrink: 0,
          }}>
            {TABS.filter(t => t.key !== activeTab).slice(0, 4).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  padding: '4px 10px', borderRadius: 8,
                  border: '1px solid #E5E7EB', background: 'white',
                  fontSize: '0.7rem', fontWeight: 600, color: '#6B7280',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.borderColor = '#D1D5DB'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              >
                {t.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={{
          flex: 1, overflow: 'auto',
          padding: '20px 24px',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <TabContent tabKey={activeTab} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
