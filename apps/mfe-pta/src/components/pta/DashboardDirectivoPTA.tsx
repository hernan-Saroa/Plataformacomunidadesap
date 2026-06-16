/**
 * V16/V17 — Dashboard Directivo PTA
 *
 * Vista ejecutiva para directivos: scorecards con gauge,
 * alertas de decisión, ranking territorial, atención inmediata,
 * historial reciente y distribución por dedicación.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Shield, TrendingUp, AlertTriangle, Clock, Users, Zap,
  CheckCircle, XCircle, RotateCcw, Map, RefreshCw, ArrowUpRight,
  AlertCircle, Target, Activity, ChevronRight, Award, AlertOctagon
} from 'lucide-react';
import { getDashboardDirectivo, getConfiguracionPTAGlobal } from '../../services/api/ptaApi';
import { PTA_COLORS } from './shared/ptaColors';

const GAUGE_COLORS = ['#EF4444', '#F59E0B', '#10B981'];

function GaugeChart({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const r = (size - 20) / 2;
  const circumference = Math.PI * r;
  const offset = circumference - (Math.min(100, value) / 100) * circumference;
  const color = value >= 70 ? '#10B981' : value >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path
          d={`M 10,${size / 2} A ${r},${r} 0 0 1 ${size - 10},${size / 2}`}
          fill="none" stroke="#F3F4F6" strokeWidth={8} strokeLinecap="round"
        />
        <path
          d={`M 10,${size / 2} A ${r},${r} 0 0 1 ${size - 10},${size / 2}`}
          fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x={size / 2} y={size / 2 - 5} textAnchor="middle" fontSize="1.4rem" fontWeight="800" fill="#111827">
          {value}%
        </text>
      </svg>
      <span style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500, marginTop: -2 }}>{label}</span>
    </div>
  );
}

export function DashboardDirectivoPTA() {
  const [data, setData] = useState<any>(null);
  const [ptaRules, setPtaRules] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2025-2');

  const loadData = async () => {
    setLoading(true);
    const [dashRes, rulesRes] = await Promise.all([
      getDashboardDirectivo(periodo),
      getConfiguracionPTAGlobal()
    ]);
    if (dashRes.success) setData(dashRes.data);
    if (rulesRes.success) setPtaRules(rulesRes.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [periodo]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando dashboard directivo...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) return (
    <div style={{ textAlign: 'center', padding: '80px 0' }}>
      <AlertTriangle style={{ width: 40, height: 40, color: '#D97706', margin: '0 auto 12px' }} />
      <p style={{ color: '#6B7280' }}>No se pudieron cargar los datos.</p>
      <button onClick={loadData} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Reintentar</button>
    </div>
  );

  const { scorecards, alertas, dedicacion, horas, terRanking, atencionInmediata, historialReciente } = data;

  const dedicacionData = [
    { name: 'Tiempo Completo', value: dedicacion?.tc ?? 0, color: '#003DA5' },
    { name: 'Medio Tiempo', value: dedicacion?.mt ?? 0, color: '#7C3AED' },
    { name: 'Catedrático', value: dedicacion?.cat ?? 0, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const horasData = [
    { componente: 'Docencia', horas: horas?.docencia ?? 0, color: PTA_COLORS.DOCENCIA },
    { componente: 'Investigación', horas: horas?.investigacion ?? 0, color: PTA_COLORS.INVESTIGACION },
    { componente: 'Extensión', horas: horas?.extension ?? 0, color: PTA_COLORS.EXTENSION },
    { componente: 'Complementarias', horas: horas?.complementarias ?? 0, color: PTA_COLORS.COMPLEMENTARIAS },
    { componente: 'Acad. Admin.', horas: horas?.academico_admin ?? 0, color: PTA_COLORS.ACAD_ADMIN },
  ].filter(d => d.horas > 0);

  function getStatusBadge(estado: string) {
    const map: Record<string, { bg: string; color: string }> = {
      'Aprobado': { bg: '#D1FAE5', color: '#065F46' },
      'Rechazado': { bg: '#FEE2E2', color: '#991B1B' },
      'Devuelto': { bg: '#FFF7ED', color: '#9A3412' },
      'ESCALADO_SNA': { bg: '#FEE2E2', color: '#991B1B' },
      'EN_CONCERTACION': { bg: '#F3E8FF', color: '#6B21A8' },
    };
    return map[estado] || { bg: '#F3F4F6', color: '#4B5563' };
  }

  // --- ANÁLISIS DE FUGA ACADÉMICA (Circular 003) ---
  const horasTotales = horas?.total || 1; 
  const pInv = ((horas?.investigacion || 0) / horasTotales) * 100;
  const pExt = ((horas?.extension || 0) / horasTotales) * 100;
  const pComp = ((horas?.complementarias || 0) / horasTotales) * 100;

  const limInv = ptaRules?.max_pct_investigacion || 50;
  const limExt = ptaRules?.max_pct_extension || 25;
  const limComp = ptaRules?.max_pct_complementarias || 25;

  const fugaInv = pInv > limInv;
  const fugaExt = pExt > limExt;
  const fugaComp = pComp > limComp;
  const hayFuga = fugaInv || fugaExt || fugaComp;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield style={{ width: 24, height: 24, color: '#003DA5' }} />
            Dashboard Directivo
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Visión ejecutiva para toma de decisiones — Periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
            <option value="2026-1">2026-1</option><option value="2026-2">2026-2</option><option value="2025-2">2025-2</option>
          </select>
          <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Row 1: Gauges + Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Gauge: Aprobación */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px', textAlign: 'center' }}>
          <GaugeChart value={scorecards.pctAprobacion} label="Tasa de Aprobación" />
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>{scorecards.aprobados}</div><div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Aprobados</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#D97706' }}>{scorecards.enProceso}</div><div style={{ fontSize: '0.68rem', color: '#6B7280' }}>En proceso</div></div>
            <div><div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#DC2626' }}>{scorecards.rechazados}</div><div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Rechazados</div></div>
          </div>
        </motion.div>

        {/* Alertas de Decisión */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 18, height: 18, color: '#DC2626' }} />
            Alertas de Decisión
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Bloqueados +7 días', value: alertas.bloqueados7d, icon: Clock, color: '#DC2626', bg: '#FEE2E2' },
              { label: 'Escalados a SNA', value: alertas.escalados, icon: Zap, color: '#EA580C', bg: '#FFF7ED' },
              { label: 'Concertación activa', value: alertas.concertacionActiva, icon: Activity, color: '#7C3AED', bg: '#F3E8FF' },
            ].map(a => (
              <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: a.value > 0 ? a.bg : '#F9FAFB' }}>
                <a.icon style={{ width: 18, height: 18, color: a.value > 0 ? a.color : '#D1D5DB', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: a.value > 0 ? '#111827' : '#9CA3AF', fontWeight: 500 }}>{a.label}</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: a.value > 0 ? a.color : '#D1D5DB' }}>{a.value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E40AF' }}>Total PTAs: {data.total}</div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Borradores: {scorecards.borradores} | Devueltos: {scorecards.devueltos}</div>
          </div>
        </motion.div>

        {/* Auditoría Circular 003 (Riesgo Fuga Académica) */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ background: 'white', borderRadius: 14, border: hayFuga ? '1px solid #FECACA' : '1px solid #E5E7EB', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: hayFuga ? '#DC2626' : '#111827', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertOctagon style={{ width: 18, height: 18, color: hayFuga ? '#DC2626' : '#059669' }} />
            Auditoría Ley Circular 003
          </h3>
          <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '0 0 12px 0', lineHeight: 1.3 }}>
            Vigilancia institucional de fugas de dedicación horaria (Topes nacionales).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: fugaInv ? '#DC2626' : '#4B5563'}}>Investigación ({pInv.toFixed(1)}%)</span>
              <span style={{ color: fugaInv ? '#DC2626' : '#9CA3AF' }}>Max {limInv}% {fugaInv && '¡Excedido!'}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', marginTop: -6 }}>
              <div style={{ height: '100%', width: `${Math.min(pInv, 100)}%`, background: fugaInv ? '#DC2626' : PTA_COLORS.INVESTIGACION }} />
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: fugaExt ? '#DC2626' : '#4B5563'}}>Extensión ({pExt.toFixed(1)}%)</span>
              <span style={{ color: fugaExt ? '#DC2626' : '#9CA3AF' }}>Max {limExt}% {fugaExt && '¡Excedido!'}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', marginTop: -6 }}>
              <div style={{ height: '100%', width: `${Math.min(pExt, 100)}%`, background: fugaExt ? '#DC2626' : PTA_COLORS.EXTENSION }} />
            </div>

            <div style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ color: fugaComp ? '#DC2626' : '#4B5563'}}>Complementarias ({pComp.toFixed(1)}%)</span>
              <span style={{ color: fugaComp ? '#DC2626' : '#9CA3AF' }}>Max {limComp}% {fugaComp && '¡Excedido!'}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', marginTop: -6 }}>
              <div style={{ height: '100%', width: `${Math.min(pComp, 100)}%`, background: fugaComp ? '#DC2626' : PTA_COLORS.COMPLEMENTARIAS }} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Row 2: Horas por componente + Planta Docente (Reorganizado) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 1fr)', gap: 16, marginBottom: 20 }}>
        {/* Horas por componente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 18, height: 18, color: '#003DA5' }} />
            Planta Docente
          </h3>
          {dedicacionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={130} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie key="pie-dedicacion" data={dedicacionData} cx="50%" cy="50%" outerRadius={50} dataKey="value" nameKey="name" label={({ name, value }) => `${name.split(' ')[0]}: ${value}`} labelLine={false} style={{ fontSize: '0.62rem' }}>
                  {dedicacionData.map((d, i) => <Cell key={`cell-ded-${i}`} fill={d.color} />)}
                </Pie>
                <Tooltip key="tooltip-dedicacion" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>Sin datos</div>
          )}
          <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
            {(horas?.total ?? 0).toLocaleString()} horas totales programadas
          </div>
        </motion.div>
      </div>

      {/* Row 2: Horas por componente + Territorial ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Horas por componente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target style={{ width: 18, height: 18, color: PTA_COLORS.ACAD_ADMIN }} />
            Distribución de Carga Académica
          </h3>
          <ResponsiveContainer width="100%" height={200} minWidth={1} minHeight={1}>
            <BarChart data={horasData} margin={{ left: 0 }}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="xaxis" dataKey="componente" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis key="yaxis" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip key="tooltip-horas" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              <Bar key="bar-horas" dataKey="horas" name="Horas" radius={[6, 6, 0, 0]}>
                {horasData.map((d, i) => <Cell key={`cell-hr-${i}`} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Dedicación + Horas */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users style={{ width: 18, height: 18, color: '#003DA5' }} />
            Planta Docente
          </h3>
          {dedicacionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={150} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie key="pie-dedicacion" data={dedicacionData} cx="50%" cy="50%" outerRadius={60} dataKey="value" nameKey="name" label={({ name, value }) => `${name.split(' ')[0]}: ${value}`} labelLine={false} style={{ fontSize: '0.62rem' }}>
                  {dedicacionData.map((d, i) => <Cell key={`cell-ded-${i}`} fill={d.color} />)}
                </Pie>
                <Tooltip key="tooltip-dedicacion" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>Sin datos</div>
          )}
          <div style={{ fontSize: '0.78rem', color: '#374151', fontWeight: 600, textAlign: 'center', marginTop: 4 }}>
            {(horas?.total ?? 0).toLocaleString()} horas totales
          </div>
        </motion.div>

        {/* Ranking Territorial */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award style={{ width: 18, height: 18, color: '#F59E0B' }} />
            Ranking Territorial (Avance)
          </h3>
          {terRanking.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {terRanking.map((t: any, i: number) => (
                <div key={t.nombre} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: i < terRanking.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ width: 22, fontSize: '0.78rem', fontWeight: 700, color: i < 3 ? '#003DA5' : '#9CA3AF', textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.nombre}</span>
                  <div style={{ width: 50, height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: t.pctAvance >= 70 ? '#10B981' : t.pctAvance >= 40 ? '#F59E0B' : '#EF4444', width: `${t.pctAvance}%` }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: t.pctAvance >= 70 ? '#059669' : t.pctAvance >= 40 ? '#D97706' : '#DC2626', width: 36, textAlign: 'right' }}>{t.pctAvance}%</span>
                  <span style={{ fontSize: '0.68rem', color: '#9CA3AF', width: 20 }}>{t.total}</span>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#9CA3AF', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>Sin datos territoriales</p>}
        </motion.div>
      </div>

      {/* Row 3: Atención Inmediata + Historial Reciente */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Atención Inmediata */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ background: 'white', borderRadius: 14, border: alertas.bloqueados7d > 0 ? '1px solid #FECACA' : '1px solid #E5E7EB', padding: 24 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#DC2626' }} />
            Requiere Atención Inmediata ({atencionInmediata.length})
          </h3>
          {atencionInmediata.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {atencionInmediata.map((item: any) => {
                const sb = getStatusBadge(item.estado);
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: item.dias > 14 ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${item.dias > 14 ? '#FECACA' : '#FDE68A'}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.docente}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>{item.territorial}</div>
                    </div>
                    <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 8, background: sb.bg, color: sb.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{item.estado?.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: item.dias > 14 ? '#DC2626' : '#D97706', whiteSpace: 'nowrap' }}>{item.dias}d</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: '#10B981', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>Sin PTAs que requieran atención inmediata</p>}
        </motion.div>

        {/* Historial Reciente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}>
          <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity style={{ width: 18, height: 18, color: '#059669' }} />
            Actividad Reciente
          </h3>
          {historialReciente.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 240, overflowY: 'auto', paddingLeft: 8 }}>
              {historialReciente.map((h: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 12, position: 'relative', paddingBottom: 12 }}>
                  {i < historialReciente.length - 1 && <div style={{ position: 'absolute', left: 4, top: 16, bottom: 0, width: 1.5, background: '#E5E7EB' }} />}
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: i === 0 ? '#003DA5' : '#D1D5DB' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{h.docente}</span>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{new Date(h.fecha).toLocaleDateString('es-CO')}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 1 }}>
                      {h.estado_anterior && <><span style={{ textDecoration: 'line-through' }}>{h.estado_anterior?.replace(/_/g, ' ')}</span> → </>}
                      <span style={{ fontWeight: 600, color: '#003DA5' }}>{h.estado_nuevo?.replace(/_/g, ' ')}</span>
                    </div>
                    {h.observaciones && h.observaciones !== 'PTA creado' && (
                      <div style={{ fontSize: '0.68rem', color: '#4B5563', marginTop: 2, padding: '3px 6px', background: '#F3F4F6', borderRadius: 4, borderLeft: '2px solid #D1D5DB' }}>{h.observaciones}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#9CA3AF', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>Sin actividad reciente</p>}
        </motion.div>
      </div>
    </div>
  );
}