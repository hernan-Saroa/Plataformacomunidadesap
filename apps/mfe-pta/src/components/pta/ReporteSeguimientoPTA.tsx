/**
 * V19/V20 — Reporte de Seguimiento PTA
 *
 * Tabla detallada de seguimiento con filtros avanzados,
 * alertas de gestión, indicadores de riesgo, exportación.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle, Clock, Search, Filter, RefreshCw, Download,
  AlertCircle, Zap, Eye, TrendingDown, Users, ChevronDown,
  ArrowUpDown, Calendar, BarChart3, XCircle, CheckCircle,
} from 'lucide-react';
import { getReporteSeguimiento, getCatalogoTerritoriales } from '../../services/api/ptaApi';
import { ExportadorReportesPTA } from './ExportadorReportesPTA';

const ESTADOS_ALL = [
  '', 'Borrador', 'PROPUESTO_POR_DIRECCION', 'NOTIFICADO_DOCENTE', 'EN_CONCERTACION',
  'CONCERTADO', 'ESCALADO_SNA', 'Pendiente Jefatura', 'Pendiente Decanatura',
  'Pendiente Gestión Profesoral', 'Aprobado', 'Rechazado', 'Devuelto'
];

const DEDICACIONES = ['', 'Tiempo Completo', 'Medio Tiempo', 'Catedrático'];

function getStatusBadge(estado: string) {
  const configs: Record<string, { bg: string; color: string }> = {
    'Borrador': { bg: '#F3F4F6', color: '#4B5563' },
    'PROPUESTO_POR_DIRECCION': { bg: '#EFF6FF', color: '#1E40AF' },
    'NOTIFICADO_DOCENTE': { bg: '#FEF3C7', color: '#92400E' },
    'EN_CONCERTACION': { bg: '#F3E8FF', color: '#6B21A8' },
    'CONCERTADO': { bg: '#D1FAE5', color: '#065F46' },
    'ESCALADO_SNA': { bg: '#FEE2E2', color: '#991B1B' },
    'Pendiente Jefatura': { bg: '#FEF3C7', color: '#92400E' },
    'Pendiente Decanatura': { bg: '#DBEAFE', color: '#1E40AF' },
    'Pendiente Gestión Profesoral': { bg: '#E0E7FF', color: '#3730A3' },
    'Aprobado': { bg: '#D1FAE5', color: '#065F46' },
    'Rechazado': { bg: '#FEE2E2', color: '#991B1B' },
    'Devuelto': { bg: '#FFF7ED', color: '#9A3412' },
  };
  const c = configs[estado] || { bg: '#F3F4F6', color: '#4B5563' };
  return c;
}

export function ReporteSeguimientoPTA() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('2026-1');
  const [territorial, setTerritorial] = useState('');
  const [estado, setEstado] = useState('');
  const [dedicacion, setDedicacion] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [sortField, setSortField] = useState<string>('dias_en_proceso');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [territoriales, setTerritoriales] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [res, terRes] = await Promise.all([
      getReporteSeguimiento({ periodo, territorial, estado, dedicacion }),
      getCatalogoTerritoriales(),
    ]);
    if (res.success) setData(res.data);
    if (terRes.success) setTerritoriales(terRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [periodo, territorial, estado, dedicacion]);

  const sortedData = useMemo(() => {
    if (!data?.detalle) return [];
    let items = [...data.detalle];
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      items = items.filter((d: any) =>
        d.docente_nombre?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q) ||
        d.territorial?.toLowerCase().includes(q)
      );
    }
    items.sort((a: any, b: any) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return items;
  }, [data, busqueda, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{ padding: '12px 12px', textAlign: 'left', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {children}
        <ArrowUpDown style={{ width: 12, height: 12, opacity: sortField === field ? 1 : 0.3 }} />
      </span>
    </th>
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Cargando reporte de seguimiento...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const alertas = data?.alertas || { sinMovimiento7Dias: 0, sobrecarga: 0, sinAsignar: 0, escalados: 0 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye style={{ width: 24, height: 24, color: '#003DA5' }} />
            Seguimiento Detallado PTA
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0' }}>
            Monitoreo individual con alertas de gestión — Periodo {periodo}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
            <option value="2026-1">2026-1</option>
            <option value="2026-2">2026-2</option>
            <option value="2025-2">2025-2</option>
          </select>
          <ExportadorReportesPTA
            data={sortedData}
            columns={[
              { key: 'docente_nombre', label: 'Docente' },
              { key: 'dedicacion', label: 'Dedicación' },
              { key: 'territorial', label: 'Territorial' },
              { key: 'estado', label: 'Estado' },
              { key: 'horas_programadas', label: 'Horas Prog.' },
              { key: 'horas_disponibles', label: 'Horas Disp.' },
              { key: 'porcentaje_carga', label: '% Carga' },
              { key: 'num_asignaturas', label: 'Asignaturas' },
              { key: 'dias_en_proceso', label: 'Días' },
            ]}
            filename="seguimiento_ptas"
            title="Seguimiento Detallado PTA"
            subtitle={`Periodo ${periodo}`}
            variant="compact"
          />
          <button onClick={loadData} style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>
      </div>

      {/* Alertas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Sin movimiento (+7d)', value: alertas.sinMovimiento7Dias, icon: Clock, color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
          { label: 'Sobrecarga horaria', value: alertas.sobrecarga, icon: AlertTriangle, color: '#DC2626', bg: '#FEE2E2', border: '#FECACA' },
          { label: 'Sin horas asignadas', value: alertas.sinAsignar, icon: AlertCircle, color: '#9333EA', bg: '#F3E8FF', border: '#DDD6FE' },
          { label: 'Escalados a SNA', value: alertas.escalados, icon: Zap, color: '#EA580C', bg: '#FFF7ED', border: '#FED7AA' },
        ].map(a => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '14px 16px', borderRadius: 12,
              background: a.value > 0 ? a.bg : 'white',
              border: `1px solid ${a.value > 0 ? a.border : '#E5E7EB'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <a.icon style={{ width: 20, height: 20, color: a.value > 0 ? a.color : '#D1D5DB', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: a.value > 0 ? a.color : '#D1D5DB' }}>{a.value}</div>
              <div style={{ fontSize: '0.72rem', color: a.value > 0 ? a.color : '#9CA3AF', fontWeight: 500 }}>{a.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: 'white', borderRadius: 12, border: '1px solid #E5E7EB',
        padding: '12px 16px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <Filter style={{ width: 16, height: 16, color: '#9CA3AF', flexShrink: 0 }} />
        <select value={territorial} onChange={e => setTerritorial(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', background: 'white', minWidth: 160 }}>
          <option value="">Todas las territoriales</option>
          {territoriales.map((t: any) => (
            <option key={t.id} value={t.nombre}>{t.nombre}</option>
          ))}
        </select>
        <select value={estado} onChange={e => setEstado(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', background: 'white', minWidth: 160 }}>
          <option value="">Todos los estados</option>
          {ESTADOS_ALL.filter(Boolean).map(e => (
            <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select value={dedicacion} onChange={e => setDedicacion(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', background: 'white' }}>
          <option value="">Todas las dedicaciones</option>
          {DEDICACIONES.filter(Boolean).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search style={{ width: 14, height: 14, color: '#9CA3AF', position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar docente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none' }}
          />
        </div>
        <span style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500, marginLeft: 'auto', flexShrink: 0 }}>
          {sortedData.length} registro{sortedData.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <SortHeader field="docente_nombre">DOCENTE</SortHeader>
                <SortHeader field="dedicacion">DEDIC.</SortHeader>
                <SortHeader field="territorial">TERRITORIAL</SortHeader>
                <SortHeader field="estado">ESTADO</SortHeader>
                <SortHeader field="horas_programadas">HORAS</SortHeader>
                <SortHeader field="porcentaje_carga">% CARGA</SortHeader>
                <SortHeader field="num_asignaturas">ASIG.</SortHeader>
                <SortHeader field="dias_en_proceso">DÍAS</SortHeader>
                <SortHeader field="num_cambios_estado">CAMBIOS</SortHeader>
                <th style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600, color: '#6B7280', fontSize: '0.75rem' }}>ÚLTIMO CAMBIO</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((d: any) => {
                const statusConfig = getStatusBadge(d.estado);
                const isRisk = d.dias_en_proceso > 7 && !['Aprobado', 'Rechazado'].includes(d.estado);
                const isOverload = d.porcentaje_carga > 100;
                return (
                  <tr
                    key={d.id}
                    style={{ borderBottom: '1px solid #F3F4F6', background: isRisk || isOverload ? '#FFFBEB' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = isRisk || isOverload ? '#FEF3C7' : '#FAFBFC'}
                    onMouseLeave={e => e.currentTarget.style.background = isRisk || isOverload ? '#FFFBEB' : 'transparent'}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isRisk && <AlertTriangle style={{ width: 12, height: 12, color: '#D97706', flexShrink: 0 }} />}
                        {d.docente_nombre}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{d.id?.substring(0, 10)}</div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '2px 6px', borderRadius: 6,
                        background: d.dedicacion === 'Tiempo Completo' ? '#EFF6FF' : d.dedicacion === 'Medio Tiempo' ? '#F3E8FF' : '#FFF7ED',
                        color: d.dedicacion === 'Tiempo Completo' ? '#1E40AF' : d.dedicacion === 'Medio Tiempo' ? '#6B21A8' : '#9A3412',
                      }}>
                        {d.dedicacion === 'Tiempo Completo' ? 'TC' : d.dedicacion === 'Medio Tiempo' ? 'MT' : 'Cat'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#374151', fontSize: '0.78rem' }}>{d.territorial}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-flex', padding: '2px 8px', borderRadius: 10,
                        background: statusConfig.bg, color: statusConfig.color,
                        fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {d.estado?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#003DA5' }}>{d.horas_programadas}</span>
                      <span style={{ color: '#9CA3AF' }}>/{d.horas_disponibles}</span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 2, background: isOverload ? '#EF4444' : d.porcentaje_carga >= 80 ? '#10B981' : '#3B82F6', width: `${Math.min(100, d.porcentaje_carga)}%` }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isOverload ? '#DC2626' : '#374151' }}>
                          {d.porcentaje_carga}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#374151' }}>{d.num_asignaturas}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 600,
                        color: d.dias_en_proceso > 14 ? '#DC2626' : d.dias_en_proceso > 7 ? '#D97706' : '#374151',
                      }}>
                        {d.dias_en_proceso}d
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#6B7280' }}>{d.num_cambios_estado}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.72rem', color: '#6B7280' }}>
                      {d.ultimo_cambio ? (
                        <div>
                          <div>{new Date(d.ultimo_cambio.fecha).toLocaleDateString('es-CO')}</div>
                          <div style={{ color: '#9CA3AF' }}>{d.ultimo_cambio.actor || ''}</div>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF' }}>
                    <Users style={{ width: 32, height: 32, color: '#D1D5DB', margin: '0 auto 12px' }} />
                    <p style={{ fontWeight: 600 }}>No se encontraron registros</p>
                    <p style={{ fontSize: '0.82rem' }}>Ajusta los filtros o cambia el periodo.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}