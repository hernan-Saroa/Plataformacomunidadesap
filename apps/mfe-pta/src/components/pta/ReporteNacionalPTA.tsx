/**
 * V08 — Reporte Nacional PTA
 *
 * Vista consolidada nacional con desglose por territorial y programa.
 * Barras de progreso, tabla detallada, resumen ejecutivo.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Map, Globe, BookOpen, CheckCircle, Clock, AlertTriangle,
  TrendingUp, Download, RefreshCw, ArrowUpRight, Search, ChevronDown,
} from 'lucide-react';
import { getReporteNacional } from '../../services/api/ptaApi';
import { ExportadorReportesPTA } from './ExportadorReportesPTA';

export function ReporteNacionalPTA() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2025-2');
  const [vistaActiva, setVistaActiva] = useState<'territorial' | 'programa'>('territorial');
  const [busqueda, setBusqueda] = useState('');

  const loadData = async () => {
    setLoading(true);
    const res = await getReporteNacional(periodo);
    if (res.success) setData(res.data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [periodo]);

  const filteredTerritoriales = useMemo(() => {
    if (!data?.reportePorTerritorial) return [];
    const q = busqueda.toLowerCase();
    return data.reportePorTerritorial.filter((t: any) =>
      !q || t.territorial.toLowerCase().includes(q)
    );
  }, [data, busqueda]);

  const filteredProgramas = useMemo(() => {
    if (!data?.reportePorPrograma) return [];
    const q = busqueda.toLowerCase();
    return data.reportePorPrograma.filter((p: any) =>
      !q || p.programa.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    );
  }, [data, busqueda]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Generando reporte nacional...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <AlertTriangle style={{ width: 40, height: 40, color: '#D97706', margin: '0 auto 12px' }} />
        <p style={{ color: '#6B7280' }}>No se pudo generar el reporte.</p>
        <button onClick={loadData} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Reintentar</button>
      </div>
    );
  }

  const { resumenNacional } = data;

  const territorialChartData = filteredTerritoriales
    .filter((t: any) => t.totalDocentes > 0)
    .sort((a: any, b: any) => b.totalDocentes - a.totalDocentes)
    .slice(0, 12)
    .map((t: any) => ({
      name: t.territorial.length > 12 ? t.territorial.substring(0, 12) + '…' : t.territorial,
      aprobados: t.aprobados,
      pendientes: t.pendientes,
      otros: t.totalDocentes - t.aprobados - t.pendientes,
    }));

  const summaryCards = [
    { label: 'Total Docentes', value: resumenNacional.totalDocentes, icon: Globe, color: '#003DA5', bg: '#EFF6FF' },
    { label: 'Aprobados', value: resumenNacional.totalAprobados, icon: CheckCircle, color: '#059669', bg: '#D1FAE5' },
    { label: 'Pendientes', value: resumenNacional.totalPendientes, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
    { label: 'Avance Global', value: `${resumenNacional.porcentajeAvanceGlobal}%`, icon: TrendingUp, color: '#7C3AED', bg: '#F3E8FF' },
    { label: 'Territoriales Activas', value: `${resumenNacional.territorialesActivas}/${resumenNacional.totalTerritoriales}`, icon: Map, color: '#0891B2', bg: '#ECFEFF' },
    { label: 'Horas Totales', value: resumenNacional.totalHorasProgramadas.toLocaleString(), icon: BookOpen, color: '#EA580C', bg: '#FFF7ED' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Map style={{ width: 24, height: 24, color: '#003DA5' }} />
            Reporte Nacional PTA
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Consolidado por territorial y programa académico — Periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
            <option value="2026-1">2026-1</option>
            <option value="2026-2">2026-2</option>
            <option value="2025-2">2025-2</option>
          </select>
          <ExportadorReportesPTA
            data={vistaActiva === 'territorial' ? filteredTerritoriales : filteredProgramas}
            columns={vistaActiva === 'territorial' ? [
              { key: 'codigo', label: 'Código' },
              { key: 'territorial', label: 'Territorial' },
              { key: 'totalDocentes', label: 'Total Docentes' },
              { key: 'aprobados', label: 'Aprobados' },
              { key: 'pendientes', label: 'Pendientes' },
              { key: 'borradores', label: 'Borradores' },
              { key: 'horasProgramadas', label: 'Horas Programadas' },
              { key: 'porcentajeAvance', label: '% Avance' },
            ] : [
              { key: 'codigo', label: 'Código' },
              { key: 'programa', label: 'Programa' },
              { key: 'nivel', label: 'Nivel' },
              { key: 'totalDocentes', label: 'Docentes' },
              { key: 'aprobados', label: 'Aprobados' },
              { key: 'pendientes', label: 'Pendientes' },
              { key: 'horasProgramadas', label: 'Horas' },
            ]}
            filename={`reporte_nacional_${vistaActiva}`}
            title={`Reporte Nacional PTA — Por ${vistaActiva === 'territorial' ? 'Territorial' : 'Programa'}`}
            subtitle={`Periodo ${periodo}`}
            variant="compact"
          />
          <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 18px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon style={{ width: 18, height: 18, color: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{card.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500, marginTop: 2 }}>{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Chart: Territorial Distribution */}
      {territorialChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: 24, marginBottom: 20, minWidth: 0, overflow: 'hidden' }}
        >
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>
            PTAs por Territorial (Top 12)
          </h3>
          <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={1}>
            <BarChart data={territorialChartData} margin={{ left: 0 }}>
              <CartesianGrid key="grid-terr" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="xaxis-terr" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} angle={-30} textAnchor="end" height={60} />
              <YAxis key="yaxis-terr" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip key="tooltip-terr" contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: '0.82rem' }} />
              <Bar key="bar-aprobados" dataKey="aprobados" name="Aprobados" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
              <Bar key="bar-pendientes" dataKey="pendientes" name="Pendientes" stackId="a" fill="#F59E0B" />
              <Bar key="bar-otros" dataKey="otros" name="Otros" stackId="a" fill="#D1D5DB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Tabs: Territorial / Programa */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F3F4F6', borderRadius: 10, padding: 4 }}>
        {(['territorial', 'programa'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setVistaActiva(tab)}
            style={{
              flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none',
              background: vistaActiva === tab ? 'white' : 'transparent',
              color: vistaActiva === tab ? '#111827' : '#6B7280',
              fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer',
              boxShadow: vistaActiva === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {tab === 'territorial' ? '🗺️ Por Territorial' : '📚 Por Programa'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search style={{ width: 15, height: 15, color: '#9CA3AF', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder={vistaActiva === 'territorial' ? 'Buscar territorial...' : 'Buscar programa...'}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '9px 14px 9px 34px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none', background: 'white' }}
        />
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          {vistaActiva === 'territorial' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>TERRITORIAL</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>TOTAL</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>APROBADOS</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>PENDIENTES</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>BORRADORES</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>HORAS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>AVANCE</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerritoriales.map((t: any) => (
                  <tr key={t.codigo} style={{ borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#111827' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500 }}>{t.codigo}</span>
                        {t.territorial}
                      </div>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>{t.totalDocentes}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem' }}>{t.aprobados}</span>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem' }}>{t.pendientes}</span>
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'center', color: '#6B7280' }}>{t.borradores}</td>
                    <td style={{ padding: '12px 12px', textAlign: 'center', color: '#374151', fontWeight: 500 }}>{t.horasProgramadas.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <div style={{ width: 60, height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 3, background: t.porcentajeAvance >= 80 ? '#10B981' : t.porcentajeAvance >= 40 ? '#F59E0B' : '#EF4444', width: `${t.porcentajeAvance}%` }} />
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: t.porcentajeAvance >= 80 ? '#059669' : t.porcentajeAvance >= 40 ? '#D97706' : '#DC2626' }}>
                          {t.porcentajeAvance}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTerritoriales.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>PROGRAMA</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>NIVEL</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>DOCENTES</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>APROBADOS</th>
                  <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>PENDIENTES</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>HORAS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProgramas.map((p: any) => {
                  const nivelColor = p.nivel === 'Pregrado' ? { bg: '#EFF6FF', color: '#1E40AF' } : p.nivel === 'Maestría' ? { bg: '#F3E8FF', color: '#6B21A8' } : { bg: '#FFF7ED', color: '#9A3412' };
                  return (
                    <tr key={p.codigo} style={{ borderBottom: '1px solid #F3F4F6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.85rem' }}>{p.programa}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{p.codigo}</div>
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{ background: nivelColor.bg, color: nivelColor.color, padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: '0.72rem' }}>{p.nivel}</span>
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>{p.totalDocentes}</td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem' }}>{p.aprobados}</span>
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: '0.78rem' }}>{p.pendientes}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#374151', fontWeight: 500 }}>{p.horasProgramadas.toLocaleString()}</td>
                    </tr>
                  );
                })}
                {filteredProgramas.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF' }}>Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}