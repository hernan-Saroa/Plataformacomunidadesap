/**
 * V07 — Tablero de Control PTA (Dashboard Ejecutivo)
 *
 * KPIs principales, pipeline de aprobación, distribución por estado,
 * tendencia semanal, utilización de horas, top docentes.
 * Diseño world-class inspirado en Notion + Material Design.
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';
import {
  FileText, Users, Clock, CheckCircle, TrendingUp, AlertTriangle,
  BarChart3, Timer, BookOpen, FlaskConical, Globe, Briefcase,
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar, Zap,
} from 'lucide-react';
import { getDashboardKPIs } from '../../services/api/ptaApi';

const COLORS_ESTADO = ['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EF4444','#6B7280','#EC4899','#14B8A6','#F97316'];
const COLORS_COMP = ['#003DA5','#7C3AED','#059669','#D97706'];

export function TableroControlPTA() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2025-2');

  const loadData = async () => {
    setLoading(true);
    const res = await getDashboardKPIs(periodo);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [periodo]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando tablero de control...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <AlertTriangle style={{ width: 40, height: 40, color: '#D97706', margin: '0 auto 12px' }} />
        <p style={{ color: '#6B7280' }}>No se pudieron cargar los datos del tablero.</p>
        <button onClick={loadData} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}>
          Reintentar
        </button>
      </div>
    );
  }

  const { pipeline, horasStats, estadoCounts, weeklyTrend, topDocentes, tiempoPromedioAprobacion, catalogoInfo } = data;

  // Prepare chart data
  const estadoChartData = Object.entries(estadoCounts).map(([name, value]) => ({ name: name.replace(/_/g, ' ').replace('Pendiente ', 'P. '), value }));
  const pipelineData = [
    { etapa: 'Borrador', count: pipeline.borrador, color: '#6B7280' },
    { etapa: 'Propuestos', count: pipeline.propuestos, color: '#3B82F6' },
    { etapa: 'Concertación', count: pipeline.concertacion, color: '#8B5CF6' },
    { etapa: 'P. Jefatura', count: pipeline.pendienteJefatura, color: '#F59E0B' },
    { etapa: 'P. Decanatura', count: pipeline.pendienteDecanatura, color: '#2563EB' },
    { etapa: 'P. Gestión', count: pipeline.pendienteGestion, color: '#7C3AED' },
    { etapa: 'Aprobados', count: pipeline.aprobados, color: '#10B981' },
    { etapa: 'Rechazados', count: pipeline.rechazados, color: '#EF4444' },
  ];

  const componenteHorasData = [
    { name: 'Docencia', value: horasStats.docenciaHoras || 0, color: COLORS_COMP[0] },
    { name: 'Investigación', value: horasStats.investigacionHoras || 0, color: COLORS_COMP[1] },
    { name: 'Extensión', value: horasStats.extensionHoras || 0, color: COLORS_COMP[2] },
    { name: 'Complementarias', value: horasStats.complementariasHoras || 0, color: COLORS_COMP[3] },
  ].filter(d => d.value > 0);

  const kpiCards = [
    { label: 'Total PTAs', value: data.total, icon: FileText, color: '#003DA5', bg: '#EFF6FF', delta: null },
    { label: 'Aprobados', value: pipeline.aprobados, icon: CheckCircle, color: '#059669', bg: '#D1FAE5', delta: data.total > 0 ? `${Math.round((pipeline.aprobados / data.total) * 100)}%` : '0%' },
    { label: 'En Proceso', value: pipeline.pendienteJefatura + pipeline.pendienteDecanatura + pipeline.pendienteGestion + pipeline.concertacion + pipeline.propuestos, icon: Clock, color: '#D97706', bg: '#FEF3C7', delta: null },
    { label: 'Utilización Horas', value: `${horasStats.promedioUtilizacion}%`, icon: TrendingUp, color: '#7C3AED', bg: '#F3E8FF', delta: null },
    { label: 'Tiempo Aprobación', value: `${tiempoPromedioAprobacion}d`, icon: Timer, color: '#0891B2', bg: '#ECFEFF', delta: null },
    { label: 'Asignaturas Catálogo', value: catalogoInfo.totalAsignaturas, icon: BookOpen, color: '#EA580C', bg: '#FFF7ED', delta: `${catalogoInfo.totalProgramas} prog.` },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 style={{ width: 24, height: 24, color: '#003DA5' }} />
            Tablero de Control PTA
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Vista ejecutiva del proceso de Planes de Trabajo Académico — Periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
            <option value="2026-1">2026-1</option>
            <option value="2026-2">2026-2</option>
            <option value="2025-2">2025-2</option>
          </select>
          <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpiCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: -8, right: -8, width: 56, height: 56, borderRadius: '50%', background: card.bg, opacity: 0.5 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <card.icon style={{ width: 20, height: 20, color: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: 500, marginTop: 4 }}>
              {card.label}
            </div>
            {card.delta && (
              <span style={{ fontSize: '0.7rem', color: card.color, fontWeight: 600, marginTop: 2, display: 'inline-block' }}>
                {card.delta}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Row 1: Pipeline + Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Pipeline de Aprobación */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-2 lg:col-span-1"
          style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, gridColumn: 'span 1', minWidth: 0, overflow: 'hidden' }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap style={{ width: 18, height: 18, color: '#F59E0B' }} />
            Pipeline de Aprobación
          </h3>
          <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
            <BarChart data={pipelineData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid key="grid-pipe" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="xaxis-pipe" type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis key="yaxis-pipe" dataKey="etapa" type="category" width={90} tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip key="tooltip-pipe" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              <Bar key="bar-pipe" dataKey="count" name="PTAs" radius={[0, 6, 6, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={`pipe-cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribución por Estado (Pie) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, gridColumn: 'span 1', minWidth: 0, overflow: 'hidden' }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 style={{ width: 18, height: 18, color: '#003DA5' }} />
            Distribución por Estado
          </h3>
          {estadoChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie key="pie-estado" data={estadoChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '0.7rem' }}>
                  {estadoChartData.map((_, index) => (
                    <Cell key={`estado-cell-${index}`} fill={COLORS_ESTADO[index % COLORS_ESTADO.length]} />
                  ))}
                </Pie>
                <Tooltip key="tooltip-estado" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.9rem' }}>
              Sin datos para mostrar
            </div>
          )}
        </motion.div>
      </div>

      {/* Row 2: Tendencia Semanal + Componentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Tendencia Semanal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, minWidth: 0, overflow: 'hidden' }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp style={{ width: 18, height: 18, color: '#059669' }} />
            Tendencia Semanal (Creados vs Aprobados)
          </h3>
          <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
            <AreaChart data={weeklyTrend}>
              <CartesianGrid key="grid-trend" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="xaxis-trend" dataKey="semana" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis key="yaxis-trend" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip key="tooltip-trend" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              <Legend key="legend-trend" wrapperStyle={{ fontSize: '0.78rem' }} />
              <Area key="area-creados" type="monotone" dataKey="creados" name="Creados" stroke="#3B82F6" fill="#DBEAFE" strokeWidth={2} />
              <Area key="area-aprobados" type="monotone" dataKey="aprobados" name="Aprobados" stroke="#10B981" fill="#D1FAE5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Distribución por Componente */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, minWidth: 0, overflow: 'hidden' }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
            Horas por Componente
          </h3>
          {componenteHorasData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
              <PieChart>
                <Pie key="pie-comp" data={componenteHorasData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name}: ${value}h`} labelLine={false} style={{ fontSize: '0.68rem' }}>
                  {componenteHorasData.map((entry, index) => (
                    <Cell key={`comp-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip key="tooltip-comp" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {[
                { icon: BookOpen, label: 'Docencia', color: COLORS_COMP[0] },
                { icon: FlaskConical, label: 'Investigación', color: COLORS_COMP[1] },
                { icon: Globe, label: 'Extensión', color: COLORS_COMP[2] },
                { icon: Briefcase, label: 'Complementarias', color: COLORS_COMP[3] },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#6B7280' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} />
                  {c.label}: 0h
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Row 3: Top Docentes */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24 }}
      >
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users style={{ width: 18, height: 18, color: '#7C3AED' }} />
          Top 10 Docentes por Carga Horaria
        </h3>
        {topDocentes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topDocentes.map((doc: any, i: number) => {
              const pct = doc.maxHoras > 0 ? Math.min(100, Math.round((doc.horas / doc.maxHoras) * 100)) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 0', borderBottom: i < topDocentes.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ width: 24, textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: i < 3 ? '#003DA5' : '#9CA3AF' }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.nombre}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#6B7280', flexShrink: 0, marginLeft: 8 }}>
                        {doc.horas}/{doc.maxHoras}h ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: pct > 100 ? '#EF4444' : pct >= 80 ? '#10B981' : '#003DA5', width: `${Math.min(100, pct)}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600, flexShrink: 0, background: doc.dedicacion === 'Tiempo Completo' ? '#EFF6FF' : '#F3E8FF', color: doc.dedicacion === 'Tiempo Completo' ? '#1E40AF' : '#6B21A8' }}>
                    {doc.dedicacion === 'Tiempo Completo' ? 'TC' : doc.dedicacion === 'Medio Tiempo' ? 'MT' : 'Cat'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#9CA3AF', fontSize: '0.88rem', textAlign: 'center', padding: '20px 0' }}>
            No hay datos de docentes para mostrar.
          </p>
        )}
      </motion.div>
    </div>
  );
}