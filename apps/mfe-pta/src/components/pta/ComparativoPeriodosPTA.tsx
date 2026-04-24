/**
 * V13-V15 — Comparativo Inter-Periodos PTA
 *
 * Análisis lado a lado de dos periodos académicos con:
 * - Scorecards comparativas con deltas
 * - Gráficos de barras agrupadas (aprobados, rechazados, pendientes)
 * - Comparación de distribución de carga por componente
 * - Ranking territorial con variación
 * - Tabla detallada de indicadores con tendencia
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Cell,
} from 'recharts';
import {
  GitCompareArrows, TrendingUp, TrendingDown, Minus, RefreshCw,
  ArrowUpRight, ArrowDownRight, BarChart3, Target, Users,
  Clock, CheckCircle, XCircle, AlertTriangle, Zap,
} from 'lucide-react';
import { getDashboardKPIs } from '../../services/api/ptaApi';

function DeltaIndicator({ current, previous, suffix = '', invert = false }: { current: number; previous: number; suffix?: string; invert?: boolean }) {
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : (current > 0 ? 100 : 0);
  const isPositive = invert ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: 6,
      background: isNeutral ? '#F3F4F6' : isPositive ? '#D1FAE5' : '#FEE2E2',
      color: isNeutral ? '#6B7280' : isPositive ? '#065F46' : '#991B1B',
    }}>
      {isNeutral ? <Minus style={{ width: 10, height: 10 }} /> : isPositive ? <ArrowUpRight style={{ width: 10, height: 10 }} /> : <ArrowDownRight style={{ width: 10, height: 10 }} />}
      {diff > 0 ? '+' : ''}{diff}{suffix} ({pct > 0 ? '+' : ''}{pct}%)
    </span>
  );
}

export function ComparativoPeriodosPTA() {
  const [periodoA, setPeriodoA] = useState('2026-1');
  const [periodoB, setPeriodoB] = useState('2025-2');
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const [resA, resB] = await Promise.all([
      getDashboardKPIs(periodoA),
      getDashboardKPIs(periodoB),
    ]);
    if (resA.success) setDataA(resA.data);
    if (resB.success) setDataB(resB.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [periodoA, periodoB]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando comparativo...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const a = dataA || { total: 0, estadoCounts: {}, dedicacionCounts: {}, horasStats: { totalProgramadas: 0, docenciaHoras: 0, investigacionHoras: 0, extensionHoras: 0, complementariasHoras: 0, promedioUtilizacion: 0 }, pipeline: { aprobados: 0, rechazados: 0, devueltos: 0, borrador: 0, pendienteJefatura: 0, pendienteDecanatura: 0, pendienteGestion: 0 }, territorialCounts: {} };
  const b = dataB || { total: 0, estadoCounts: {}, dedicacionCounts: {}, horasStats: { totalProgramadas: 0, docenciaHoras: 0, investigacionHoras: 0, extensionHoras: 0, complementariasHoras: 0, promedioUtilizacion: 0 }, pipeline: { aprobados: 0, rechazados: 0, devueltos: 0, borrador: 0, pendienteJefatura: 0, pendienteDecanatura: 0, pendienteGestion: 0 }, territorialCounts: {} };

  const pA = a.pipeline || {};
  const pB = b.pipeline || {};
  const hA = a.horasStats || {};
  const hB = b.horasStats || {};

  // Scorecards
  const scorecards = [
    { label: 'Total PTAs', a: a.total, b: b.total, icon: Users, color: '#003DA5', bg: '#EFF6FF' },
    { label: 'Aprobados', a: pA.aprobados || 0, b: pB.aprobados || 0, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
    { label: 'Rechazados', a: pA.rechazados || 0, b: pB.rechazados || 0, icon: XCircle, color: '#DC2626', bg: '#FEE2E2', invert: true },
    { label: 'Horas Totales', a: hA.totalProgramadas || 0, b: hB.totalProgramadas || 0, icon: Clock, color: '#7C3AED', bg: '#F3E8FF' },
    { label: '% Utilización', a: hA.promedioUtilizacion || 0, b: hB.promedioUtilizacion || 0, icon: Target, color: '#0891B2', bg: '#ECFEFF', suffix: '%' },
  ];

  // Grouped bar chart data
  const pipelineComparison = [
    { name: 'Borrador', [periodoA]: pA.borrador || 0, [periodoB]: pB.borrador || 0 },
    { name: 'Propuestos', [periodoA]: pA.propuestos || 0, [periodoB]: pB.propuestos || 0 },
    { name: 'Concertación', [periodoA]: pA.concertacion || 0, [periodoB]: pB.concertacion || 0 },
    { name: 'P. Jefatura', [periodoA]: pA.pendienteJefatura || 0, [periodoB]: pB.pendienteJefatura || 0 },
    { name: 'P. Decanatura', [periodoA]: pA.pendienteDecanatura || 0, [periodoB]: pB.pendienteDecanatura || 0 },
    { name: 'P. Gestión', [periodoA]: pA.pendienteGestion || 0, [periodoB]: pB.pendienteGestion || 0 },
    { name: 'Aprobados', [periodoA]: pA.aprobados || 0, [periodoB]: pB.aprobados || 0 },
    { name: 'Rechazados', [periodoA]: pA.rechazados || 0, [periodoB]: pB.rechazados || 0 },
  ];

  // Radar chart - carga por componente
  const radarData = [
    { subject: 'Docencia', A: hA.docenciaHoras || 0, B: hB.docenciaHoras || 0 },
    { subject: 'Investigación', A: hA.investigacionHoras || 0, B: hB.investigacionHoras || 0 },
    { subject: 'Extensión', A: hA.extensionHoras || 0, B: hB.extensionHoras || 0 },
    { subject: 'Complementarias', A: hA.complementariasHoras || 0, B: hB.complementariasHoras || 0 },
  ];

  // Territorial comparison
  const allTerritoriales = new Set([...Object.keys(a.territorialCounts || {}), ...Object.keys(b.territorialCounts || {})]);
  const territorialComparison = Array.from(allTerritoriales).map(ter => ({
    territorial: ter,
    a: (a.territorialCounts || {})[ter] || 0,
    b: (b.territorialCounts || {})[ter] || 0,
    diff: ((a.territorialCounts || {})[ter] || 0) - ((b.territorialCounts || {})[ter] || 0),
  })).sort((x, y) => y.a - x.a).slice(0, 12);

  // Detailed indicators table
  const indicators = [
    { label: 'Total PTAs registrados', a: a.total, b: b.total },
    { label: 'PTAs aprobados', a: pA.aprobados || 0, b: pB.aprobados || 0 },
    { label: 'Tasa de aprobación', a: a.total > 0 ? Math.round(((pA.aprobados||0)/a.total)*100) : 0, b: b.total > 0 ? Math.round(((pB.aprobados||0)/b.total)*100) : 0, suffix: '%' },
    { label: 'PTAs rechazados', a: pA.rechazados || 0, b: pB.rechazados || 0, invert: true },
    { label: 'PTAs devueltos', a: pA.devueltos || 0, b: pB.devueltos || 0, invert: true },
    { label: 'En concertación', a: pA.concertacion || 0, b: pB.concertacion || 0 },
    { label: 'Horas docencia', a: hA.docenciaHoras || 0, b: hB.docenciaHoras || 0 },
    { label: 'Horas investigación', a: hA.investigacionHoras || 0, b: hB.investigacionHoras || 0 },
    { label: 'Horas extensión', a: hA.extensionHoras || 0, b: hB.extensionHoras || 0 },
    { label: 'Horas complementarias', a: hA.complementariasHoras || 0, b: hB.complementariasHoras || 0 },
    { label: 'Utilización promedio', a: hA.promedioUtilizacion || 0, b: hB.promedioUtilizacion || 0, suffix: '%' },
    { label: 'Tiempo promedio aprobación', a: a.tiempoPromedioAprobacion || 0, b: b.tiempoPromedioAprobacion || 0, suffix: ' días', invert: true },
    { label: 'Territoriales activas', a: Object.keys(a.territorialCounts || {}).length, b: Object.keys(b.territorialCounts || {}).length },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <GitCompareArrows style={{ width: 24, height: 24, color: '#003DA5' }} />
            Comparativo Inter-Periodos
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Análisis comparativo de indicadores PTA entre periodos académicos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodoA} onChange={e => setPeriodoA(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '2px solid #003DA5', fontSize: '0.85rem', background: '#EFF6FF', color: '#003DA5', fontWeight: 700 }}>
            <option value="2026-1">2026-1</option><option value="2026-2">2026-2</option><option value="2025-2">2025-2</option>
          </select>
          <span style={{ fontSize: '0.82rem', color: '#9CA3AF', fontWeight: 600 }}>vs</span>
          <select value={periodoB} onChange={e => setPeriodoB(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '2px solid #7C3AED', fontSize: '0.85rem', background: '#F3E8FF', color: '#7C3AED', fontWeight: 700 }}>
            <option value="2025-2">2025-2</option><option value="2026-1">2026-1</option><option value="2026-2">2026-2</option>
          </select>
          <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Scorecards comparativas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        {scorecards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon style={{ width: 18, height: 18, color: s.color }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280' }}>{s.label}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.62rem', color: '#003DA5', fontWeight: 600, textTransform: 'uppercase' }}>{periodoA}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{s.a.toLocaleString()}{s.suffix || ''}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.62rem', color: '#7C3AED', fontWeight: 600, textTransform: 'uppercase' }}>{periodoB}</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#6B7280' }}>{s.b.toLocaleString()}{s.suffix || ''}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <DeltaIndicator current={s.a} previous={s.b} suffix={s.suffix} invert={s.invert} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Row 2: Pipeline comparison + Radar */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 20 }}>
        {/* Pipeline grouped bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 style={{ width: 18, height: 18, color: '#003DA5' }} />
            Pipeline de Estados — Lado a Lado
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pipelineComparison} margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              <Bar dataKey={periodoA} fill="#003DA5" radius={[4, 4, 0, 0]} name={periodoA} />
              <Bar dataKey={periodoB} fill="#7C3AED" radius={[4, 4, 0, 0]} name={periodoB} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Radar chart - carga por componente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target style={{ width: 18, height: 18, color: '#7C3AED' }} />
            Carga por Componente
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} />
              <Radar name={periodoA} dataKey="A" stroke="#003DA5" fill="#003DA5" fillOpacity={0.25} strokeWidth={2} />
              <Radar name={periodoB} dataKey="B" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.15} strokeWidth={2} strokeDasharray="5 5" />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Row 3: Territorial comparison */}
      {territorialComparison.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap style={{ width: 18, height: 18, color: '#F59E0B' }} />
            Variación por Territorial (Top 12)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={territorialComparison} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis dataKey="territorial" type="category" width={120} tick={{ fontSize: 10, fill: '#6B7280' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              <Bar dataKey="a" fill="#003DA5" radius={[0, 4, 4, 0]} name={periodoA} />
              <Bar dataKey="b" fill="#7C3AED" radius={[0, 4, 4, 0]} name={periodoB} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Row 4: Detailed indicators table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>Tabla de Indicadores Detallados</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>INDICADOR</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#003DA5', fontSize: '0.73rem', background: '#EFF6FF' }}>{periodoA}</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#7C3AED', fontSize: '0.73rem', background: '#F3E8FF' }}>{periodoB}</th>
                <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>VARIACIÓN</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind, i) => (
                <tr key={ind.label} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'transparent' : '#FAFBFC' }}>
                  <td style={{ padding: '10px 20px', fontWeight: 500, color: '#111827' }}>{ind.label}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>{ind.a.toLocaleString()}{ind.suffix || ''}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#7C3AED' }}>{ind.b.toLocaleString()}{ind.suffix || ''}</td>
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <DeltaIndicator current={ind.a} previous={ind.b} suffix={ind.suffix} invert={ind.invert} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}