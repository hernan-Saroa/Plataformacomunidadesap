/**
 * MetricasSLA_PTA — Panel de métricas de Service Level Agreement (SLA) 
 * para tiempos de respuesta por nivel de aprobación
 *
 * Funcionalidades:
 * - SLA definidos por nivel (N1: 5d, N2: 5d, N3: 3d, Concertación: 10d)
 * - Dashboard con % de cumplimiento SLA por nivel y territorial
 * - Gráficas de distribución de tiempos de evaluación
 * - Heatmap por territorial × nivel con semáforo
 * - Alertas de PTAs próximos a vencer SLA
 * - Historial de tendencia de cumplimiento mensual
 * - Ranking de territoriales por cumplimiento SLA
 * - Detalle de PTAs que excedieron SLA con motivo
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend, Area, AreaChart,
} from 'recharts';
import {
  Timer, AlertTriangle, CheckCircle, Clock, Shield,
  TrendingUp, TrendingDown, Target, Award, Zap,
  Filter, ChevronDown, Eye, X, Users, Globe,
  ArrowUp, ArrowDown,
} from 'lucide-react';

interface SLAConfig {
  nivel: string;
  label: string;
  diasSLA: number;
  color: string;
  bg: string;
}

interface PTAMetricaSLA {
  id: string;
  docenteNombre: string;
  territorial: string;
  programa: string;
  nivel: string;
  diasTranscurridos: number;
  diasSLA: number;
  cumpleSLA: boolean;
  exceso: number;
  estado: 'en_proceso' | 'completado' | 'excedido';
}

const SLA_CONFIGS: SLAConfig[] = [
  { nivel: 'N1', label: 'Jefatura (N1)', diasSLA: 5, color: '#D97706', bg: '#FEF3C7' },
  { nivel: 'N2', label: 'Decanatura (N2)', diasSLA: 5, color: '#003DA5', bg: '#EFF6FF' },
  { nivel: 'N3', label: 'Gestión Profesoral (N3)', diasSLA: 3, color: '#7C3AED', bg: '#F3E8FF' },
  { nivel: 'CONC', label: 'Concertación', diasSLA: 10, color: '#0891B2', bg: '#ECFEFF' },
];

const TERRITORIALES = ['CUNDINAMARCA', 'ANTIOQUIA', 'VALLE', 'ATLÁNTICO', 'SANTANDER', 'BOLÍVAR', 'NARIÑO', 'TOLIMA'];

function generateSLAData(): { metrics: PTAMetricaSLA[]; trends: any[]; heatmap: any[] } {
  const metrics: PTAMetricaSLA[] = [];
  const docentes = [
    'Carlos Martínez', 'María Gómez', 'Juan López', 'Ana Rodríguez',
    'Pedro Hernández', 'Claudia Ruiz', 'Roberto Díaz', 'Luz Castillo',
    'Fernando García', 'Mónica Suárez', 'Andrés Pardo', 'Carolina Mendoza',
    'Diego Moreno', 'Laura Valencia', 'Santiago Ramírez', 'Patricia Gil',
  ];

  SLA_CONFIGS.forEach(sla => {
    TERRITORIALES.forEach((ter, ti) => {
      const count = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const dias = Math.floor(Math.random() * (sla.diasSLA * 2.5)) + 1;
        const cumple = dias <= sla.diasSLA;
        metrics.push({
          id: `sla-${sla.nivel}-${ter}-${i}`,
          docenteNombre: docentes[(ti * 2 + i) % docentes.length],
          territorial: ter,
          programa: ['Adm. Pública', 'C. Políticas', 'Economía', 'Gestión Pública'][i % 4],
          nivel: sla.nivel,
          diasTranscurridos: dias,
          diasSLA: sla.diasSLA,
          cumpleSLA: cumple,
          exceso: cumple ? 0 : dias - sla.diasSLA,
          estado: dias <= sla.diasSLA * 0.6 ? 'completado' : dias <= sla.diasSLA ? 'en_proceso' : 'excedido',
        });
      }
    });
  });

  // Monthly trends (6 months)
  const meses = ['Oct 2025', 'Nov 2025', 'Dic 2025', 'Ene 2026', 'Feb 2026', 'Mar 2026'];
  const trends = meses.map((mes, i) => ({
    mes,
    N1: Math.round(70 + Math.random() * 20 + i * 2),
    N2: Math.round(65 + Math.random() * 20 + i * 1.5),
    N3: Math.round(75 + Math.random() * 15 + i * 2.5),
    CONC: Math.round(60 + Math.random() * 25 + i * 1),
    global: 0,
  }));
  trends.forEach(t => { t.global = Math.round((t.N1 + t.N2 + t.N3 + t.CONC) / 4); });

  // Heatmap: territorial × nivel
  const heatmap = TERRITORIALES.map(ter => {
    const row: any = { territorial: ter };
    SLA_CONFIGS.forEach(sla => {
      const terMetrics = metrics.filter(m => m.territorial === ter && m.nivel === sla.nivel);
      const cumplimiento = terMetrics.length > 0
        ? Math.round((terMetrics.filter(m => m.cumpleSLA).length / terMetrics.length) * 100)
        : 100;
      row[sla.nivel] = cumplimiento;
    });
    row.global = Math.round(
      SLA_CONFIGS.reduce((sum, sla) => sum + (row[sla.nivel] || 0), 0) / SLA_CONFIGS.length
    );
    return row;
  });

  return { metrics, trends, heatmap };
}

function getHeatColor(value: number): { bg: string; color: string } {
  if (value >= 90) return { bg: '#D1FAE5', color: '#065F46' };
  if (value >= 75) return { bg: '#FEF3C7', color: '#92400E' };
  if (value >= 60) return { bg: '#FED7AA', color: '#9A3412' };
  return { bg: '#FEE2E2', color: '#991B1B' };
}

export function MetricasSLA_PTA() {
  const [data] = useState(() => generateSLAData());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'heatmap' | 'alertas' | 'ranking'>('dashboard');
  const [filtroNivel, setFiltroNivel] = useState('');

  // Global stats
  const globalStats = useMemo(() => {
    const all = data.metrics;
    const cumplidos = all.filter(m => m.cumpleSLA).length;
    const total = all.length;
    const pctGlobal = total > 0 ? Math.round((cumplidos / total) * 100) : 100;
    const tiempoPromedio = total > 0 ? (all.reduce((s, m) => s + m.diasTranscurridos, 0) / total).toFixed(1) : '0';
    const excedidos = all.filter(m => !m.cumpleSLA).length;
    const enRiesgo = all.filter(m => m.estado === 'en_proceso' && m.diasTranscurridos >= m.diasSLA * 0.7).length;

    return { pctGlobal, tiempoPromedio, total, cumplidos, excedidos, enRiesgo };
  }, [data.metrics]);

  // Per-level stats
  const levelStats = useMemo(() =>
    SLA_CONFIGS.map(sla => {
      const items = data.metrics.filter(m => m.nivel === sla.nivel);
      const cumplidos = items.filter(m => m.cumpleSLA).length;
      const pct = items.length > 0 ? Math.round((cumplidos / items.length) * 100) : 100;
      const avg = items.length > 0 ? (items.reduce((s, m) => s + m.diasTranscurridos, 0) / items.length).toFixed(1) : '0';
      return { ...sla, pct, avg, total: items.length, cumplidos, excedidos: items.length - cumplidos };
    }),
    [data.metrics]
  );

  // Alertas: PTAs próximos a vencer o excedidos
  const alertas = useMemo(() =>
    data.metrics
      .filter(m => m.estado === 'excedido' || (m.estado === 'en_proceso' && m.diasTranscurridos >= m.diasSLA * 0.7))
      .sort((a, b) => b.exceso - a.exceso || b.diasTranscurridos - a.diasTranscurridos)
      .slice(0, 20),
    [data.metrics]
  );

  // Ranking
  const ranking = useMemo(() =>
    [...data.heatmap].sort((a, b) => b.global - a.global),
    [data.heatmap]
  );

  // Distribution data for chart
  const distributionData = useMemo(() => {
    const filtered = filtroNivel
      ? data.metrics.filter(m => m.nivel === filtroNivel)
      : data.metrics;
    const buckets: Record<string, number> = {};
    filtered.forEach(m => {
      const bucket = m.diasTranscurridos <= 2 ? '0-2d' : m.diasTranscurridos <= 5 ? '3-5d' : m.diasTranscurridos <= 8 ? '6-8d' : m.diasTranscurridos <= 12 ? '9-12d' : '13d+';
      buckets[bucket] = (buckets[bucket] || 0) + 1;
    });
    return ['0-2d', '3-5d', '6-8d', '9-12d', '13d+'].map(rango => ({
      rango,
      cantidad: buckets[rango] || 0,
      color: rango === '0-2d' ? '#059669' : rango === '3-5d' ? '#003DA5' : rango === '6-8d' ? '#D97706' : rango === '9-12d' ? '#DC2626' : '#991B1B',
    }));
  }, [data.metrics, filtroNivel]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Timer style={{ width: 24, height: 24, color: '#003DA5' }} />
            Métricas SLA — Tiempos de Aprobación
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            N1: {SLA_CONFIGS[0].diasSLA}d • N2: {SLA_CONFIGS[1].diasSLA}d • N3: {SLA_CONFIGS[2].diasSLA}d • Concertación: {SLA_CONFIGS[3].diasSLA}d
          </p>
        </div>
        <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white' }}>
          <option value="">Todos los niveles</option>
          {SLA_CONFIGS.map(s => <option key={s.nivel} value={s.nivel}>{s.label}</option>)}
        </select>
      </div>

      {/* Global Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Cumplimiento global', value: `${globalStats.pctGlobal}%`, icon: Target, color: globalStats.pctGlobal >= 80 ? '#059669' : '#DC2626', bg: globalStats.pctGlobal >= 80 ? '#D1FAE5' : '#FEE2E2' },
          { label: 'Tiempo promedio', value: `${globalStats.tiempoPromedio}d`, icon: Clock, color: '#003DA5', bg: '#EFF6FF' },
          { label: 'Total evaluados', value: globalStats.total, icon: Shield, color: '#374151', bg: '#F3F4F6' },
          { label: 'Dentro de SLA', value: globalStats.cumplidos, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
          { label: 'Excedidos', value: globalStats.excedidos, icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2' },
          { label: 'En riesgo', value: globalStats.enRiesgo, icon: Zap, color: '#D97706', bg: '#FEF3C7' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '12px 14px' }}>
            <card.icon style={{ width: 16, height: 16, color: card.color, marginBottom: 4 }} />
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{card.value}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 500, color: '#6B7280' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Level SLA Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
        {levelStats.map(stat => (
          <div key={stat.nivel} style={{ background: 'white', borderRadius: 12, border: `1px solid ${stat.color}30`, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: stat.color, textTransform: 'uppercase' }}>{stat.label}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF' }}>SLA: {stat.diasSLA}d</span>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.pct >= 80 ? '#059669' : stat.pct >= 60 ? '#D97706' : '#DC2626' }}>
              {stat.pct}%
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', margin: '6px 0' }}>
              <div style={{ height: '100%', borderRadius: 3, background: stat.pct >= 80 ? '#059669' : stat.pct >= 60 ? '#D97706' : '#DC2626', width: `${stat.pct}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#6B7280' }}>
              <span>Prom: {stat.avg}d</span>
              <span>{stat.cumplidos}/{stat.total} ok</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[
          { key: 'dashboard' as const, label: 'Tendencia', icon: TrendingUp },
          { key: 'heatmap' as const, label: 'Heatmap', icon: Globe },
          { key: 'alertas' as const, label: `Alertas (${alertas.length})`, icon: AlertTriangle },
          { key: 'ranking' as const, label: 'Ranking', icon: Award },
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

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Trend Chart */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>
              Tendencia de cumplimiento SLA (%)
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="N1" stroke="#D97706" fill="#FEF3C7" fillOpacity={0.3} strokeWidth={2} name="N1" />
                <Area type="monotone" dataKey="N2" stroke="#003DA5" fill="#EFF6FF" fillOpacity={0.3} strokeWidth={2} name="N2" />
                <Area type="monotone" dataKey="N3" stroke="#7C3AED" fill="#F3E8FF" fillOpacity={0.3} strokeWidth={2} name="N3" />
                <Area type="monotone" dataKey="global" stroke="#111827" fill="transparent" strokeWidth={2.5} strokeDasharray="5 5" name="Global" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribution Chart */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>
              Distribución de tiempos de evaluación
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={distributionData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="rango" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} name="PTAs">
                  {distributionData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══ HEATMAP TAB ═══ */}
      {activeTab === 'heatmap' && (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Cumplimiento SLA por Territorial × Nivel de Aprobación
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Territorial</th>
                  {SLA_CONFIGS.map(sla => (
                    <th key={sla.nivel} style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: sla.color, borderBottom: `2px solid ${sla.color}`, minWidth: 90 }}>
                      {sla.label}<br /><span style={{ fontSize: '0.58rem', fontWeight: 500 }}>({sla.diasSLA}d)</span>
                    </th>
                  ))}
                  <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #111827' }}>Global</th>
                </tr>
              </thead>
              <tbody>
                {data.heatmap.map(row => (
                  <tr key={row.territorial} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{row.territorial}</td>
                    {SLA_CONFIGS.map(sla => {
                      const val = row[sla.nivel];
                      const hc = getHeatColor(val);
                      return (
                        <td key={sla.nivel} style={{ padding: '6px 10px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, fontWeight: 800, fontSize: '0.82rem', background: hc.bg, color: hc.color, minWidth: 48 }}>
                            {val}%
                          </span>
                        </td>
                      );
                    })}
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, fontWeight: 800, fontSize: '0.82rem', background: getHeatColor(row.global).bg, color: getHeatColor(row.global).color }}>
                        {row.global}%
                        {row.global >= 80 ? <ArrowUp style={{ width: 11, height: 11 }} /> : <ArrowDown style={{ width: 11, height: 11 }} />}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ ALERTAS TAB ═══ */}
      {activeTab === 'alertas' && (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              PTAs en riesgo o excedidos ({alertas.length})
            </h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB', width: 40 }}>⚠</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Docente</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Nivel</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Territorial</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Días</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>SLA</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Exceso</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {alertas.map(a => {
                  const slaCfg = SLA_CONFIGS.find(s => s.nivel === a.nivel);
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #F3F4F6', background: a.estado === 'excedido' ? '#FEF2F2' : 'transparent' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {a.estado === 'excedido'
                          ? <AlertTriangle style={{ width: 14, height: 14, color: '#DC2626' }} />
                          : <Clock style={{ width: 14, height: 14, color: '#D97706' }} />
                        }
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600, color: '#111827' }}>
                        {a.docenteNombre}
                        <div style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{a.programa}</div>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 6px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700, background: slaCfg?.bg || '#F3F4F6', color: slaCfg?.color || '#6B7280' }}>
                          {a.nivel}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6B7280', fontSize: '0.72rem' }}>{a.territorial}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: a.estado === 'excedido' ? '#DC2626' : '#D97706' }}>{a.diasTranscurridos}d</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: '#6B7280' }}>{a.diasSLA}d</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {a.exceso > 0 ? (
                          <span style={{ fontWeight: 800, color: '#DC2626' }}>+{a.exceso}d</span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 700, background: a.estado === 'excedido' ? '#FEE2E2' : '#FEF3C7', color: a.estado === 'excedido' ? '#991B1B' : '#92400E' }}>
                          {a.estado === 'excedido' ? 'Excedido' : 'En riesgo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ RANKING TAB ═══ */}
      {activeTab === 'ranking' && (
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Ranking de Territoriales por Cumplimiento SLA
            </h3>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ranking.map((row, i) => {
              const hc = getHeatColor(row.global);
              return (
                <div key={row.territorial} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: i < 3 ? '#F9FAFB' : 'transparent', border: '1px solid #F3F4F6' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.72rem', color: 'white', background: i === 0 ? '#D97706' : i === 1 ? '#6B7280' : i === 2 ? '#92400E' : '#D1D5DB', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>{row.territorial}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {SLA_CONFIGS.map(sla => (
                        <span key={sla.nivel} style={{ padding: '1px 5px', borderRadius: 4, fontSize: '0.55rem', fontWeight: 600, background: getHeatColor(row[sla.nivel]).bg, color: getHeatColor(row[sla.nivel]).color }}>
                          {sla.nivel}: {row[sla.nivel]}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ padding: '4px 12px', borderRadius: 8, fontWeight: 800, fontSize: '1rem', background: hc.bg, color: hc.color }}>
                      {row.global}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}