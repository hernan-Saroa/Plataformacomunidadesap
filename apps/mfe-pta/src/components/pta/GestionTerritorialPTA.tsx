/**
 * V09-V12 — Gestión Territorial PTA
 *
 * Vista de territoriales con drill-down a CETAP,
 * mapa de calor por avance, tabla de docentes por territorial,
 * comparativo entre territoriales.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Map, ChevronRight, ChevronLeft, Users, CheckCircle, Clock,
  AlertTriangle, RefreshCw, Search, Eye, Building2, ArrowUpDown,
} from 'lucide-react';
import { getReporteNacional, getTerritorialDetalle, getCatalogoTerritoriales } from '../../services/api/ptaApi';

function getAvanceColor(pct: number) {
  if (pct >= 80) return { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
  if (pct >= 50) return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' };
  if (pct >= 20) return { bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' };
  return { bg: '#FEE2E2', color: '#991B1B', border: '#FECACA' };
}

function getStatusBadge(estado: string) {
  const m: Record<string, { bg: string; color: string }> = {
    'Borrador': { bg: '#F3F4F6', color: '#4B5563' }, 'PROPUESTO_POR_DIRECCION': { bg: '#EFF6FF', color: '#1E40AF' },
    'NOTIFICADO_DOCENTE': { bg: '#FEF3C7', color: '#92400E' }, 'EN_CONCERTACION': { bg: '#F3E8FF', color: '#6B21A8' },
    'CONCERTADO': { bg: '#D1FAE5', color: '#065F46' }, 'ESCALADO_SNA': { bg: '#FEE2E2', color: '#991B1B' },
    'Pendiente Jefatura': { bg: '#FEF3C7', color: '#92400E' }, 'Pendiente Decanatura': { bg: '#DBEAFE', color: '#1E40AF' },
    'Pendiente Gestión Profesoral': { bg: '#E0E7FF', color: '#3730A3' }, 'Aprobado': { bg: '#D1FAE5', color: '#065F46' },
    'Rechazado': { bg: '#FEE2E2', color: '#991B1B' }, 'Devuelto': { bg: '#FFF7ED', color: '#9A3412' },
  };
  return m[estado] || { bg: '#F3F4F6', color: '#4B5563' };
}

export function GestionTerritorialPTA() {
  const [reporteData, setReporteData] = useState<any>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [periodo, setPeriodo] = useState('2025-2');
  const [selectedTerritorial, setSelectedTerritorial] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const loadReporte = async () => {
    setLoading(true);
    const res = await getReporteNacional(periodo);
    if (res.success) setReporteData(res.data);
    setLoading(false);
  };

  const loadDetalle = async (nombre: string) => {
    setLoadingDetalle(true);
    setSelectedTerritorial(nombre);
    const res = await getTerritorialDetalle(nombre, periodo);
    if (res.success) setDetalle(res.data);
    setLoadingDetalle(false);
  };

  useEffect(() => { loadReporte(); }, [periodo]);

  const filteredTerritoriales = useMemo(() => {
    if (!reporteData?.reportePorTerritorial) return [];
    const q = busqueda.toLowerCase();
    return reporteData.reportePorTerritorial.filter((t: any) => !q || t.territorial.toLowerCase().includes(q));
  }, [reporteData, busqueda]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando gestión territorial...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── Vista Detalle de una Territorial ─────────────────────────────
  if (selectedTerritorial && detalle) {
    const estadoChartData = Object.entries(detalle.porEstado || {}).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value: value as number }));
    const COLORS = ['#3B82F6','#8B5CF6','#F59E0B','#10B981','#EF4444','#6B7280','#EC4899','#14B8A6'];

    return (
      <div>
        {/* Back + Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => { setSelectedTerritorial(null); setDetalle(null); }} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft style={{ width: 18, height: 18, color: '#6B7280' }} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 style={{ width: 22, height: 22, color: '#003DA5' }} />
              {detalle.territorial}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '2px 0 0' }}>
              Código {detalle.codigo} — Periodo {periodo} — {detalle.total} docentes
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Docentes', value: detalle.total, color: '#003DA5', bg: '#EFF6FF' },
            { label: 'Aprobados', value: detalle.aprobados, color: '#059669', bg: '#D1FAE5' },
            { label: 'Pendientes', value: detalle.pendientes, color: '#D97706', bg: '#FEF3C7' },
            { label: 'Avance', value: `${detalle.pctAvance}%`, color: '#7C3AED', bg: '#F3E8FF' },
            { label: 'Horas', value: detalle.horasTotales?.toLocaleString(), color: '#0891B2', bg: '#ECFEFF' },
          ].map(k => (
            <div key={k.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 16px' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{k.value}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* CETAPs + Estado Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* CETAPs */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>CETAPs ({detalle.cetaps?.length || 0})</h3>
            {detalle.porCetap?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {detalle.porCetap.map((c: any) => (
                  <div key={c.cetap} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <Building2 style={{ width: 14, height: 14, color: '#6B7280', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#111827' }}>{c.cetap}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#003DA5' }}>{c.total}</span>
                    <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>A:{c.aprobados}</span>
                    <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 600 }}>P:{c.pendientes}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Sin datos de CETAPs</p>}
          </div>

          {/* Estado chart */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 20, minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>Distribución por Estado</h3>
            {estadoChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={estadoChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
                  <Bar dataKey="value" name="PTAs" radius={[0, 6, 6, 0]}>
                    {estadoChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Sin datos</div>}
          </div>
        </div>

        {/* Docentes Table */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', fontWeight: 700, fontSize: '0.92rem', color: '#111827' }}>
            Docentes ({detalle.docentes?.length || 0})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>DOCENTE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>DEDIC.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>CETAP</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>ESTADO</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>HORAS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>ASIG.</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.73rem' }}>DÍAS</th>
                </tr>
              </thead>
              <tbody>
                {(detalle.docentes || []).map((d: any) => {
                  const sb = getStatusBadge(d.estado);
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6' }} onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 16px', fontWeight: 600, color: '#111827' }}>{d.docente_nombre}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 6, fontWeight: 600, background: d.dedicacion === 'Tiempo Completo' ? '#EFF6FF' : '#F3E8FF', color: d.dedicacion === 'Tiempo Completo' ? '#1E40AF' : '#6B21A8' }}>
                          {d.dedicacion === 'Tiempo Completo' ? 'TC' : d.dedicacion === 'Medio Tiempo' ? 'MT' : 'Cat'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.78rem', color: '#6B7280' }}>{d.cetap || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: 8, fontWeight: 600, background: sb.bg, color: sb.color, whiteSpace: 'nowrap' }}>{d.estado?.replace(/_/g, ' ')}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#003DA5' }}>{d.horas_programadas}</span><span style={{ color: '#9CA3AF' }}>/{d.horas_disponibles}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>{d.num_asignaturas}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: d.dias_en_proceso > 14 ? '#DC2626' : d.dias_en_proceso > 7 ? '#D97706' : '#374151' }}>{d.dias_en_proceso}d</td>
                    </tr>
                  );
                })}
                {(!detalle.docentes || detalle.docentes.length === 0) && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>Sin docentes asignados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Vista Lista de Territoriales (Mapa de Calor) ─────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Map style={{ width: 24, height: 24, color: '#003DA5' }} />
            Gestión Territorial PTA
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Mapa de avance y gestión por territorial y CETAP — Periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
            <option value="2026-1">2026-1</option><option value="2026-2">2026-2</option><option value="2025-2">2025-2</option>
          </select>
          <button onClick={loadReporte} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search style={{ width: 15, height: 15, color: '#9CA3AF', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input type="text" placeholder="Buscar territorial..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ width: '100%', padding: '9px 14px 9px 34px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', background: 'white' }} />
      </div>

      {/* Heatmap Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {filteredTerritoriales.map((t: any, i: number) => {
          const ac = getAvanceColor(t.porcentajeAvance);
          return (
            <motion.div
              key={t.codigo}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => loadDetalle(t.territorial)}
              style={{
                background: 'white', borderRadius: 14, border: `1px solid ${t.totalDocentes > 0 ? ac.border : '#E5E7EB'}`,
                padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Avance indicator bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#F3F4F6' }}>
                <div style={{ height: '100%', background: t.totalDocentes > 0 ? ac.color : '#E5E7EB', width: `${t.porcentajeAvance}%`, transition: 'width 0.5s' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: '0.65rem', color: '#9CA3AF', fontWeight: 500 }}>{t.codigo}</span>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827', margin: '0' }}>{t.territorial}</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    fontSize: '1rem', fontWeight: 800,
                    color: t.totalDocentes > 0 ? ac.color : '#D1D5DB',
                  }}>
                    {t.porcentajeAvance}%
                  </span>
                  <ChevronRight style={{ width: 16, height: 16, color: '#D1D5DB' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem' }}>
                <div><span style={{ fontWeight: 700, color: '#003DA5' }}>{t.totalDocentes}</span> <span style={{ color: '#9CA3AF' }}>total</span></div>
                <div><span style={{ fontWeight: 700, color: '#059669' }}>{t.aprobados}</span> <span style={{ color: '#9CA3AF' }}>aprob.</span></div>
                <div><span style={{ fontWeight: 700, color: '#D97706' }}>{t.pendientes}</span> <span style={{ color: '#9CA3AF' }}>pend.</span></div>
              </div>

              {t.horasProgramadas > 0 && (
                <div style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 6 }}>
                  {t.horasProgramadas.toLocaleString()} horas programadas
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {loadingDetalle && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(17,24,39,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 16, padding: '32px 48px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#6B7280', fontSize: '0.88rem' }}>Cargando detalle territorial...</p>
          </div>
        </div>
      )}
    </div>
  );
}