/**
 * WorkflowVisualizerPTA — Visualizador interactivo del flujo de 18 estados del PTA
 *
 * Features:
 * - Pipeline visual con los 18 estados del documento de requerimientos
 * - Conteo en tiempo real por estado desde Supabase KV
 * - Mapa de transiciones con conteo de flujos
 * - Deteccion de cuellos de botella con severidad
 * - Tiempos promedio por estado con indicadores SLA
 * - Vista dual: Flujo Principal + Flujo Bidireccional
 * - Resumen SLA ejecutivo
 * - Responsivo
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity, AlertTriangle, ArrowRight, ArrowDown, BarChart3,
  CheckCircle, Clock, Eye, Filter, GitBranch, Loader2,
  RefreshCw, TrendingUp, XCircle, Zap, ChevronDown,
  ChevronRight, Target, Shield, Users, Scale, FileText,
  MessageSquare, ArrowLeftRight, Timer, Gauge,
} from 'lucide-react';
import { toast } from 'sonner';
import { getWorkflowAnalytics } from '../../services/api/ptaApi';
import { SankeyTransicionesPTA } from './SankeyTransicionesPTA';

// ═══ TYPES ═══════════════════════════════════════════════════════════

interface WorkflowData {
  periodo: string;
  total_ptas: number;
  conteo_estados: Record<string, number>;
  transiciones: Record<string, number>;
  tiempo_promedio: Record<string, { promedio_horas: number; min_horas: number; max_horas: number; muestras: number }>;
  cuellos_botella: {
    estado: string;
    count: number;
    promedio_horas: number;
    sla_horas: number;
    excede_sla: boolean;
    severidad: string;
  }[];
  flujo_principal: { from: string; to: string; label: string }[];
  flujo_bidireccional: { from: string; to: string; label: string }[];
  flujo_excepcional: { from: string; to: string; label: string }[];
  sla_resumen: { total_ptas: number; en_plazo: number; excedidos: number; criticos: number };
  generated_at: string;
}

// ═══ STATE CONFIG ════════════════════════════════════════════════════

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any; fase: string }> = {
  'Borrador':                    { label: 'Borrador',              color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', icon: FileText,       fase: 'Creacion' },
  'PROPUESTO_POR_DIRECCION':     { label: 'Propuesto Dir.',        color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', icon: Shield,         fase: 'Bidireccional' },
  'NOTIFICADO_DOCENTE':          { label: 'Notificado',            color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', icon: Users,          fase: 'Bidireccional' },
  'ACEPTADO_DOCENTE':            { label: 'Aceptado Doc.',         color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', icon: CheckCircle,    fase: 'Bidireccional' },
  'MODIFICADO_DOCENTE':          { label: 'Modificado Doc.',       color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD', icon: FileText,       fase: 'Bidireccional' },
  'OBJETADO_DOCENTE':            { label: 'Objetado Doc.',         color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5', icon: XCircle,        fase: 'Bidireccional' },
  'EN_CONCERTACION':             { label: 'En Concertacion',       color: '#6B21A8', bg: '#F3E8FF', border: '#DDD6FE', icon: MessageSquare,  fase: 'Concertacion' },
  'CONCERTADO':                  { label: 'Concertado',            color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', icon: CheckCircle,    fase: 'Concertacion' },
  'ESCALADO_SNA':                { label: 'Escalado SNA',          color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5', icon: Scale,          fase: 'Arbitraje' },
  'RESUELTO_SNA':                { label: 'Resuelto SNA',          color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', icon: Scale,          fase: 'Arbitraje' },
  'Pendiente Jefatura':          { label: 'Pend. Jefatura',        color: '#92400E', bg: '#FEF3C7', border: '#FDE68A', icon: Clock,          fase: 'Aprobacion' },
  'Pendiente Decanatura':        { label: 'Pend. Decanatura',      color: '#1E40AF', bg: '#DBEAFE', border: '#93C5FD', icon: Clock,          fase: 'Aprobacion' },
  'Pendiente Gestion Profesoral':{ label: 'Pend. G. Profesoral',   color: '#3730A3', bg: '#E0E7FF', border: '#A5B4FC', icon: Clock,          fase: 'Aprobacion' },
  'Aprobado':                    { label: 'Aprobado',              color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7', icon: CheckCircle,    fase: 'Final' },
  'Rechazado':                   { label: 'Rechazado',             color: '#991B1B', bg: '#FEE2E2', border: '#FCA5A5', icon: XCircle,        fase: 'Final' },
  'Devuelto':                    { label: 'Devuelto',              color: '#9A3412', bg: '#FFF7ED', border: '#FDBA74', icon: AlertTriangle,   fase: 'Excepcional' },
  'CERRADO_INACTIVIDAD':         { label: 'Cerrado Inact.',        color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', icon: XCircle,        fase: 'Final' },
  'ANULADO':                     { label: 'Anulado',               color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', icon: XCircle,        fase: 'Final' },
};

const getEstadoCfg = (estado: string) => ESTADO_CONFIG[estado] || { label: estado.replace(/_/g, ' '), color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', icon: FileText, fase: 'Otro' };

function formatHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h * 10) / 10}h`;
  const dias = Math.floor(h / 24);
  const restH = Math.round(h % 24);
  return restH > 0 ? `${dias}d ${restH}h` : `${dias}d`;
}

type TabView = 'pipeline' | 'transiciones' | 'cuellos' | 'sla' | 'sankey';

// ═══ COMPONENT ═══════════════════════════════════════════════════════

export function WorkflowVisualizerPTA() {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2025-2');
  const [tab, setTab] = useState<TabView>('pipeline');
  const [selectedEstado, setSelectedEstado] = useState<string | null>(null);
  const [flujoView, setFlujoView] = useState<'principal' | 'bidireccional' | 'excepcional'>('principal');

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getWorkflowAnalytics(periodo);
    if (res.success && res.data) {
      setData(res.data);
    } else {
      toast.error('Error al cargar datos de workflow');
    }
    setLoading(false);
  }, [periodo]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeStates = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.conteo_estados)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [data]);

  const totalActive = useMemo(() => activeStates.reduce((s, [_, c]) => s + c, 0), [activeStates]);

  const TABS: { key: TabView; label: string; icon: any }[] = [
    { key: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { key: 'transiciones', label: 'Transiciones', icon: ArrowLeftRight },
    { key: 'cuellos', label: 'Cuellos de Botella', icon: AlertTriangle },
    { key: 'sla', label: 'SLA', icon: Gauge },
    { key: 'sankey', label: 'Sankey', icon: Activity },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
        <Loader2 style={{ width: 28, height: 28, color: '#003DA5', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>Cargando workflow analytics...</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
        <Activity style={{ width: 36, height: 36, margin: '0 auto 12px', color: '#D1D5DB' }} />
        <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Sin datos de workflow</div>
        <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Intente seleccionar otro periodo o cree PTAs primero</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: 12, marginBottom: 20,
      }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch style={{ width: 22, height: 22, color: '#003DA5' }} />
            Visualizador de Flujo de Estados
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            18 estados del PTA con analisis de transiciones, tiempos y cuellos de botella en tiempo real
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', background: 'white' }}
          >
            <option value="2026-1">2026-1</option>
            <option value="2026-2">2026-2</option>
            <option value="2025-2">2025-2</option>
          </select>
          <button
            onClick={loadData}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
              background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.82rem', fontWeight: 600, color: '#374151',
            }}
          >
            <RefreshCw style={{ width: 14, height: 14 }} /> Actualizar
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total PTAs', value: data.total_ptas, icon: FileText, color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Estados Activos', value: activeStates.length, icon: Activity, color: '#7C3AED', bg: '#F3E8FF' },
          { label: 'En Plazo SLA', value: data.sla_resumen.en_plazo, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
          { label: 'Excedidos SLA', value: data.sla_resumen.excedidos, icon: AlertTriangle, color: '#D97706', bg: '#FEF3C7' },
          { label: 'Criticos', value: data.sla_resumen.criticos, icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'Transiciones', value: Object.keys(data.transiciones).length, icon: ArrowLeftRight, color: '#0891B2', bg: '#ECFEFF' },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <kpi.icon style={{ width: 15, height: 15, color: kpi.color }} />
              </div>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.68rem', color: '#6B7280', fontWeight: 500 }}>{kpi.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: tab === t.key ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
              background: tab === t.key ? '#EFF6FF' : 'white',
              color: tab === t.key ? '#003DA5' : '#6B7280',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <t.icon style={{ width: 14, height: 14 }} /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Pipeline */}
      {tab === 'pipeline' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Flow type selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {([
              { key: 'principal', label: 'Flujo Principal', color: '#003DA5' },
              { key: 'bidireccional', label: 'Flujo Bidireccional', color: '#7C3AED' },
              { key: 'excepcional', label: 'Excepcional', color: '#DC2626' },
            ] as const).map(f => (
              <button
                key={f.key}
                onClick={() => setFlujoView(f.key)}
                style={{
                  padding: '5px 12px', borderRadius: 6,
                  border: flujoView === f.key ? `1.5px solid ${f.color}` : '1px solid #E5E7EB',
                  background: flujoView === f.key ? `${f.color}10` : 'white',
                  color: flujoView === f.key ? f.color : '#6B7280',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Flow visualization */}
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
            padding: '20px', overflow: 'auto',
          }}>
            {flujoView === 'principal' && (
              <PipelineFlow
                steps={data.flujo_principal}
                conteo={data.conteo_estados}
                tiempos={data.tiempo_promedio}
                onSelectEstado={setSelectedEstado}
                selectedEstado={selectedEstado}
              />
            )}
            {flujoView === 'bidireccional' && (
              <PipelineFlow
                steps={data.flujo_bidireccional}
                conteo={data.conteo_estados}
                tiempos={data.tiempo_promedio}
                onSelectEstado={setSelectedEstado}
                selectedEstado={selectedEstado}
              />
            )}
            {flujoView === 'excepcional' && (
              <PipelineFlow
                steps={data.flujo_excepcional}
                conteo={data.conteo_estados}
                tiempos={data.tiempo_promedio}
                onSelectEstado={setSelectedEstado}
                selectedEstado={selectedEstado}
              />
            )}
          </div>

          {/* All states grid */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 style={{ width: 16, height: 16, color: '#003DA5' }} />
              Distribucion por Estado ({data.total_ptas} PTAs)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
              {Object.entries(data.conteo_estados).map(([estado, count]) => {
                const cfg = getEstadoCfg(estado);
                const pct = data.total_ptas > 0 ? Math.round((count / data.total_ptas) * 100) : 0;
                const tp = data.tiempo_promedio[estado];
                return (
                  <motion.div
                    key={estado}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedEstado(selectedEstado === estado ? null : estado)}
                    style={{
                      padding: '12px 14px', borderRadius: 10,
                      border: selectedEstado === estado ? `2px solid ${cfg.color}` : `1px solid ${cfg.border}`,
                      background: count > 0 ? cfg.bg : '#FAFAFA',
                      cursor: 'pointer', transition: 'all 0.15s',
                      opacity: count > 0 ? 1 : 0.5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <cfg.icon style={{ width: 14, height: 14, color: cfg.color }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>{count}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{pct}%</span>
                      {tp && (
                        <span style={{ fontSize: '0.62rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Timer style={{ width: 9, height: 9 }} /> {formatHoras(tp.promedio_horas)}
                        </span>
                      )}
                    </div>
                    {count > 0 && (
                      <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: `${cfg.color}20` }}>
                        <div style={{ height: '100%', borderRadius: 2, background: cfg.color, width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s' }} />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Selected state detail */}
          <AnimatePresence>
            {selectedEstado && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 16, overflow: 'hidden' }}
              >
                <EstadoDetailPanel
                  estado={selectedEstado}
                  data={data}
                  onClose={() => setSelectedEstado(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* TAB: Transiciones */}
      {tab === 'transiciones' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px',
          }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeftRight style={{ width: 16, height: 16, color: '#7C3AED' }} />
              Mapa de Transiciones ({Object.keys(data.transiciones).length} tipos)
            </h4>
            {Object.keys(data.transiciones).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <ArrowLeftRight style={{ width: 28, height: 28, margin: '0 auto 8px', color: '#D1D5DB' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sin transiciones registradas</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Las transiciones se registran cuando los PTAs cambian de estado</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {Object.entries(data.transiciones)
                  .sort(([, a], [, b]) => b - a)
                  .map(([key, count]) => {
                    const [from, to] = key.split(' -> ');
                    const fromCfg = getEstadoCfg(from);
                    const toCfg = getEstadoCfg(to);
                    const maxCount = Math.max(...Object.values(data.transiciones));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '10px 14px', borderRadius: 8,
                          background: '#FAFBFF', border: '1px solid #F3F4F6',
                        }}
                      >
                        <span style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: fromCfg.bg, color: fromCfg.color,
                          fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                          border: `1px solid ${fromCfg.border}`,
                        }}>
                          {fromCfg.label}
                        </span>
                        <ArrowRight style={{ width: 14, height: 14, color: '#9CA3AF', flexShrink: 0 }} />
                        <span style={{
                          padding: '3px 8px', borderRadius: 6,
                          background: toCfg.bg, color: toCfg.color,
                          fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                          border: `1px solid ${toCfg.border}`,
                        }}>
                          {toCfg.label}
                        </span>
                        <div style={{ flex: 1, minWidth: 60, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            background: 'linear-gradient(90deg, #003DA5, #7C3AED)',
                            width: `${pct}%`, transition: 'width 0.3s',
                          }} />
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', minWidth: 24, textAlign: 'right' }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB: Cuellos de Botella */}
      {tab === 'cuellos' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{
            background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px',
          }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#D97706' }} />
              Deteccion de Cuellos de Botella
            </h4>
            {data.cuellos_botella.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                <CheckCircle style={{ width: 28, height: 28, margin: '0 auto 8px', color: '#059669' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#059669' }}>Sin cuellos de botella detectados</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Todos los estados tienen un flujo saludable</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.cuellos_botella.map((cb, i) => {
                  const cfg = getEstadoCfg(cb.estado);
                  const sevConfig: Record<string, { color: string; bg: string; label: string }> = {
                    critica: { color: '#DC2626', bg: '#FEE2E2', label: 'CRITICO' },
                    alta: { color: '#D97706', bg: '#FEF3C7', label: 'ALTO' },
                    media: { color: '#0891B2', bg: '#ECFEFF', label: 'MEDIO' },
                    baja: { color: '#059669', bg: '#D1FAE5', label: 'BAJO' },
                  };
                  const sev = sevConfig[cb.severidad] || sevConfig.baja;
                  const slaPct = cb.sla_horas > 0 ? Math.min(Math.round((cb.promedio_horas / cb.sla_horas) * 100), 200) : 0;

                  return (
                    <motion.div
                      key={cb.estado}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{
                        padding: '14px 16px', borderRadius: 10,
                        border: `1px solid ${cb.excede_sla ? sev.color + '40' : '#E5E7EB'}`,
                        background: cb.excede_sla ? sev.bg : 'white',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <cfg.icon style={{ width: 16, height: 16, color: cfg.color }} />
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{cfg.label}</span>
                          <span style={{
                            padding: '1px 8px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 800,
                            color: sev.color, background: `${sev.color}18`, border: `1px solid ${sev.color}30`,
                          }}>
                            {sev.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{cb.count}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.75rem', color: '#6B7280' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Timer style={{ width: 11, height: 11 }} />
                          Promedio: <strong style={{ color: '#111827' }}>{formatHoras(cb.promedio_horas)}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Target style={{ width: 11, height: 11 }} />
                          SLA: <strong style={{ color: cb.excede_sla ? sev.color : '#059669' }}>{formatHoras(cb.sla_horas)}</strong>
                        </span>
                        {cb.excede_sla && (
                          <span style={{ color: sev.color, fontWeight: 700 }}>
                            Excede SLA por {formatHoras(cb.promedio_horas - cb.sla_horas)}
                          </span>
                        )}
                      </div>
                      {/* SLA progress */}
                      <div style={{ marginTop: 8, height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          background: cb.excede_sla
                            ? `linear-gradient(90deg, ${sev.color}, ${sev.color}CC)`
                            : 'linear-gradient(90deg, #059669, #34D399)',
                          width: `${Math.min(slaPct, 100)}%`,
                          transition: 'width 0.5s',
                        }} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB: SLA */}
      {tab === 'sla' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {/* SLA Summary Card */}
            <div style={{
              background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px',
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gauge style={{ width: 16, height: 16, color: '#003DA5' }} />
                Resumen SLA
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Compliance gauge */}
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  {(() => {
                    const pct = data.sla_resumen.total_ptas > 0
                      ? Math.round((data.sla_resumen.en_plazo / data.sla_resumen.total_ptas) * 100)
                      : 100;
                    const gaugeColor = pct >= 80 ? '#059669' : pct >= 60 ? '#D97706' : '#DC2626';
                    return (
                      <>
                        <div style={{ fontSize: '2.4rem', fontWeight: 900, color: gaugeColor }}>{pct}%</div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500 }}>Cumplimiento SLA</div>
                        <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4,
                            background: `linear-gradient(90deg, ${gaugeColor}, ${gaugeColor}BB)`,
                            width: `${pct}%`, transition: 'width 0.5s',
                          }} />
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px', borderRadius: 8, background: '#D1FAE5', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065F46' }}>{data.sla_resumen.en_plazo}</div>
                    <div style={{ fontSize: '0.65rem', color: '#065F46', fontWeight: 500 }}>En plazo</div>
                  </div>
                  <div style={{ padding: '10px', borderRadius: 8, background: '#FEF3C7', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400E' }}>{data.sla_resumen.excedidos}</div>
                    <div style={{ fontSize: '0.65rem', color: '#92400E', fontWeight: 500 }}>Excedidos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time per state */}
            <div style={{
              background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px',
            }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Timer style={{ width: 16, height: 16, color: '#7C3AED' }} />
                Tiempo Promedio por Estado
              </h4>
              {Object.keys(data.tiempo_promedio).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#9CA3AF' }}>
                  <Timer style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#D1D5DB' }} />
                  <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>Sin datos de tiempos aun</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(data.tiempo_promedio)
                    .sort(([, a], [, b]) => b.promedio_horas - a.promedio_horas)
                    .map(([estado, tp]) => {
                      const cfg = getEstadoCfg(estado);
                      const slaHoras = estado.startsWith('Pendiente') ? 72 : estado === 'EN_CONCERTACION' ? 120 : 48;
                      const excede = tp.promedio_horas > slaHoras;
                      return (
                        <div
                          key={estado}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px', borderRadius: 8,
                            background: excede ? '#FEF2F2' : '#FAFBFF',
                            border: `1px solid ${excede ? '#FCA5A5' : '#F3F4F6'}`,
                          }}
                        >
                          <cfg.icon style={{ width: 12, height: 12, color: cfg.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: excede ? '#DC2626' : '#111827', whiteSpace: 'nowrap' }}>
                            {formatHoras(tp.promedio_horas)}
                          </span>
                          <span style={{ fontSize: '0.6rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                            ({tp.muestras})
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* SLA thresholds reference */}
          <div style={{
            marginTop: 14, background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px',
          }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B7280', margin: '0 0 10px' }}>
              Umbrales SLA Configurados
            </h4>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.75rem', color: '#6B7280' }}>
              {[
                { label: 'Aprobacion (Pendiente N1/N2/N3)', value: '72h (3 dias)', color: '#D97706' },
                { label: 'Concertacion', value: '120h (5 dias)', color: '#7C3AED' },
                { label: 'Arbitraje SNA', value: '168h (7 dias)', color: '#DC2626' },
                { label: 'Otros estados', value: '48h (2 dias)', color: '#6B7280' },
              ].map(sla => (
                <div key={sla.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: sla.color }} />
                  <span>{sla.label}: <strong>{sla.value}</strong></span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB: Sankey */}
      {tab === 'sankey' && (
        <SankeyTransicionesPTA
          transiciones={data.transiciones}
          conteoEstados={data.conteo_estados}
          periodo={data.periodo}
          onRefresh={loadData}
          loading={loading}
        />
      )}

      {/* Footer */}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#9CA3AF' }}>
        <span>Periodo: {data.periodo} | Generado: {new Date(data.generated_at).toLocaleString('es-CO')}</span>
        <span>{data.total_ptas} PTAs analizados | {Object.keys(data.transiciones).length} tipos de transicion</span>
      </div>
    </div>
  );
}

// ═══ SUB-COMPONENTS ══════════════════════════════════════════════════

function PipelineFlow({ steps, conteo, tiempos, onSelectEstado, selectedEstado }: {
  steps: { from: string; to: string; label: string }[];
  conteo: Record<string, number>;
  tiempos: Record<string, any>;
  onSelectEstado: (e: string | null) => void;
  selectedEstado: string | null;
}) {
  // Collect unique states in order
  const states = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    steps.forEach(s => {
      if (!seen.has(s.from)) { seen.add(s.from); result.push(s.from); }
      if (!seen.has(s.to)) { seen.add(s.to); result.push(s.to); }
    });
    return result;
  }, [steps]);

  return (
    <div>
      {/* Pipeline nodes */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', justifyContent: 'center' }}>
        {states.map((estado, i) => {
          const cfg = getEstadoCfg(estado);
          const count = conteo[estado] || 0;
          const tp = tiempos[estado];
          const isSelected = selectedEstado === estado;
          return (
            <div key={estado} style={{ display: 'flex', alignItems: 'center' }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectEstado(isSelected ? null : estado)}
                style={{
                  padding: '12px 16px', borderRadius: 10,
                  border: isSelected ? `2px solid ${cfg.color}` : `1.5px solid ${cfg.border}`,
                  background: cfg.bg, cursor: 'pointer', textAlign: 'center',
                  minWidth: 110, position: 'relative',
                  boxShadow: isSelected ? `0 0 0 3px ${cfg.color}20` : 'none',
                }}
              >
                <cfg.icon style={{ width: 18, height: 18, color: cfg.color, margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, marginBottom: 4, lineHeight: 1.2 }}>
                  {cfg.label}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#111827' }}>{count}</div>
                {tp && (
                  <div style={{ fontSize: '0.6rem', color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                    <Timer style={{ width: 8, height: 8 }} /> {formatHoras(tp.promedio_horas)}
                  </div>
                )}
                {count > 0 && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 18, height: 18, borderRadius: 9,
                    background: cfg.color, color: 'white',
                    fontSize: '0.55rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white',
                  }}>
                    {count > 9 ? '9+' : count}
                  </div>
                )}
              </motion.div>
              {i < states.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                  <div style={{ width: 20, height: 2, background: '#D1D5DB' }} />
                  <ChevronRight style={{ width: 14, height: 14, color: '#9CA3AF', margin: '0 -4px' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transition labels */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 4,
            background: '#F9FAFB', fontSize: '0.65rem', color: '#6B7280',
          }}>
            <ArrowRight style={{ width: 10, height: 10 }} />
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function EstadoDetailPanel({ estado, data, onClose }: {
  estado: string;
  data: WorkflowData;
  onClose: () => void;
}) {
  const cfg = getEstadoCfg(estado);
  const count = data.conteo_estados[estado] || 0;
  const tp = data.tiempo_promedio[estado];

  // Transitions from/to this state
  const transFrom = Object.entries(data.transiciones)
    .filter(([k]) => k.startsWith(estado + ' -> '))
    .map(([k, v]) => ({ to: k.split(' -> ')[1], count: v }));
  const transTo = Object.entries(data.transiciones)
    .filter(([k]) => k.endsWith(' -> ' + estado))
    .map(([k, v]) => ({ from: k.split(' -> ')[0], count: v }));

  return (
    <div style={{
      background: 'white', borderRadius: 12, border: `1.5px solid ${cfg.border}`,
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <cfg.icon style={{ width: 16, height: 16, color: cfg.color }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827' }}>{cfg.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Fase: {cfg.fase} | {count} PTA(s)</div>
          </div>
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
          <XCircle style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* Time stats */}
        {tp && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FAFBFF', border: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Timer style={{ width: 12, height: 12 }} /> Tiempos
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: '0.72rem' }}>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '0.6rem' }}>Promedio</div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{formatHoras(tp.promedio_horas)}</div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '0.6rem' }}>Min</div>
                <div style={{ fontWeight: 700, color: '#059669' }}>{formatHoras(tp.min_horas)}</div>
              </div>
              <div>
                <div style={{ color: '#9CA3AF', fontSize: '0.6rem' }}>Max</div>
                <div style={{ fontWeight: 700, color: '#DC2626' }}>{formatHoras(tp.max_horas)}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#9CA3AF', marginTop: 4 }}>Basado en {tp.muestras} muestras</div>
          </div>
        )}

        {/* Transitions from */}
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FAFBFF', border: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowRight style={{ width: 12, height: 12 }} /> Sale hacia
          </div>
          {transFrom.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Sin transiciones salientes</div>
          ) : (
            transFrom.map(t => {
              const toCfg = getEstadoCfg(t.to);
              return (
                <div key={t.to} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: toCfg.color, padding: '1px 6px', borderRadius: 4, background: toCfg.bg }}>
                    {toCfg.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>{t.count}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Transitions to */}
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FAFBFF', border: '1px solid #F3F4F6' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowRight style={{ width: 12, height: 12, transform: 'rotate(180deg)' }} /> Llega desde
          </div>
          {transTo.length === 0 ? (
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Sin transiciones entrantes</div>
          ) : (
            transTo.map(t => {
              const fromCfg = getEstadoCfg(t.from);
              return (
                <div key={t.from} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: fromCfg.color, padding: '1px 6px', borderRadius: 4, background: fromCfg.bg }}>
                    {fromCfg.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>{t.count}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
