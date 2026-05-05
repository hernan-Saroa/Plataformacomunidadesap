import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Upload, Download, RefreshCw, ChevronLeft, ChevronRight,
  X, CheckCircle, XCircle, Edit2, ToggleLeft, ToggleRight,
  GraduationCap, Building2, Clock, BarChart2, Eye, FileSpreadsheet,
} from 'lucide-react';
import {
  getBancoDocentes, getBancoDocenteStats, toggleBancoDocenteEstado,
  bulkUploadBancoDocentes, exportBancoDocentes, downloadBancoDocentesTemplate,
} from '../../../services/api/ptaApi';
import { BancoDocenteDetalle } from './BancoDocenteDetalle';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';

const TERRITORIALES_FILTER = [
  'Sede Central', 'Antioquia', 'Atlántico', 'Bogotá D.C.', 'Bolívar-Córdoba-Sucre',
  'Boyacá-Casanare', 'Cauca-Nariño', 'Cesar-La Guajira', 'Chocó',
  'Cundinamarca-Meta', 'Huila-Caquetá', 'Magdalena', 'Norte de Santander',
  'Quindío-Risaralda-Caldas', 'Santander', 'Tolima', 'Valle del Cauca-Cauca',
];

const BADGE_STYLES: Record<string, { background: string; color: string }> = {
  TC:       { background: '#dbeafe', color: '#1d4ed8' },
  MT:       { background: '#fef3c7', color: '#b45309' },
  HC:       { background: '#f3e8ff', color: '#7c3aed' },
  ACTIVO:   { background: '#dcfce7', color: '#15803d' },
  INACTIVO: { background: '#fee2e2', color: '#dc2626' },
};

function Badge({ label, code }: { label: string; code: string }) {
  const { background, color } = BADGE_STYLES[code] || { background: '#f1f5f9', color: '#475569' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background, color }}>
      {label}
    </span>
  );
}

// ── Donut chart SVG simple ────────────────────────────────────────────────────
function DonutChart({ segments, size = 160 }: { segments: { value: number; color: string; label: string }[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#e2e8f0', margin: '0 auto' }} />;

  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;
  const paths: JSX.Element[] = [];

  segments.forEach((seg, i) => {
    if (seg.value === 0) return;
    const sweep = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + sweep);
    const y2 = cy + r * Math.sin(angle + sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    paths.push(<path key={i} d={d} fill={seg.color} stroke="#fff" strokeWidth={2} />);
    angle += sweep;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#fff" />
    </svg>
  );
}

// ── Bar chart SVG simple ──────────────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(24, Math.min(48, Math.floor(560 / data.length) - 6));
  const height = 160;
  const colors = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa'];

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minWidth: data.length * (barW + 6), padding: '0 8px', height: height + 40 }}>
        {data.map((d, i) => {
          const h = Math.round((d.value / max) * height);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1d4ed8' }}>{d.value}</span>
              <div style={{ width: barW, height: h, background: colors[i % colors.length], borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: '0.6rem', color: '#64748b', textAlign: 'center', width: barW + 8, lineHeight: 1.2 }}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'listado' | 'estadisticas' | 'carga-masiva';

export function BancoDocentesPTA() {
  const [tab, setTab] = useState<Tab>('listado');
  const [docentes, setDocentes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTerritorial, setFilterTerritorial] = useState('');
  const [filterDedicacion, setFilterDedicacion] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [editDocente, setEditDocente] = useState<any>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const searchTimeout = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = useCallback(async (p = page) => {
    setLoading(true);
    const [res, statsRes] = await Promise.all([
      getBancoDocentes({ territorial: filterTerritorial || undefined, dedicacion: filterDedicacion || undefined, estado: filterEstado || undefined, search: search || undefined, page: p, limit: 50 }),
      getBancoDocenteStats(),
    ]);
    if (res.success && res.data) {
      setDocentes(res.data.data || []);
      setTotal(res.data.total || 0);
      setPages(res.data.pages || 1);
    }
    if (statsRes.success && statsRes.data) setStats(statsRes.data);
    setLoading(false);
  }, [filterTerritorial, filterDedicacion, filterEstado, search, page]);

  useEffect(() => { loadData(1); setPage(1); }, [filterTerritorial, filterDedicacion, filterEstado]);
  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { loadData(1); setPage(1); }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);
  useEffect(() => { loadData(page); }, [page]);

  const handleToggleEstado = async (id: string) => {
    await toggleBancoDocenteEstado(id);
    loadData();
    showToast('Estado actualizado');
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResult(null);
    const res = await bulkUploadBancoDocentes(bulkFile);
    setBulkLoading(false);
    if (res.success && res.data) {
      setBulkResult(res.data);
      showToast(`Carga completada: ${res.data.created} creados, ${res.data.updated} actualizados`);
      loadData(1);
    } else {
      showToast('Error en la carga masiva');
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const blob = await exportBancoDocentes();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Banco_Docentes_ESAP_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Error al exportar');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadBancoDocentesTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Docentes_ESAP.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Plantilla no disponible — descargando ejemplo');
    }
  };

  // ── Stats derived ──────────────────────────────────────────────────────────
  const dedicacionSegments = stats ? [
    { label: `Tiempo Completo: ${stats.por_dedicacion?.find((d: any) => d.dedicacion === 'TC')?.total ?? 0}`, value: stats.por_dedicacion?.find((d: any) => d.dedicacion === 'TC')?.total ?? 0, color: '#1d4ed8' },
    { label: `Medio Tiempo: ${stats.por_dedicacion?.find((d: any) => d.dedicacion === 'MT')?.total ?? 0}`, value: stats.por_dedicacion?.find((d: any) => d.dedicacion === 'MT')?.total ?? 0, color: '#93c5fd' },
  ] : [];

  const categoriaSegments = stats?.por_categoria ? stats.por_categoria.map((c: any, i: number) => ({
    label: `${c.categoria}: ${c.total}`,
    value: c.total,
    color: ['#1d4ed8', '#2563eb', '#60a5fa', '#bfdbfe', '#93c5fd'][i % 5],
  })) : [];

  const territorialData: { label: string; value: number }[] = stats?.por_territorial
    ? [...stats.por_territorial].sort((a: any, b: any) => b.total - a.total).slice(0, 16).map((t: any) => ({ label: t.territorial, value: t.total }))
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  const TAB_STYLES = (active: boolean) => ({
    display: 'flex' as const, alignItems: 'center' as const, gap: 6,
    padding: '8px 18px', borderRadius: 0, border: 'none', cursor: 'pointer' as const,
    fontSize: '0.82rem', fontWeight: active ? 700 : 500,
    color: active ? '#1d4ed8' : '#475569',
    background: 'transparent',
    borderBottom: active ? '2px solid #1d4ed8' : '2px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: '100vh', background: '#f8fafc' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: '#1d4ed8', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 24px 0', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Banco de Docentes ESAP</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                {total} docentes oficiales sincronizados desde el listado maestro y almacenados en Personas
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleExportExcel} disabled={exportLoading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', cursor: 'pointer', fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
              <FileSpreadsheet size={14} /> {exportLoading ? 'Exportando...' : 'Exportar Excel'}
            </button>
            <button onClick={() => loadData(page)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
              <RefreshCw size={14} color="#475569" />
            </button>
            <button onClick={() => setEditDocente({})} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer' }}>
              <GraduationCap size={14} color="#475569" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: 'none' }}>
          <button style={TAB_STYLES(tab === 'listado')} onClick={() => setTab('listado')}>
            <Users size={14} /> Listado de Docentes
          </button>
          <button style={TAB_STYLES(tab === 'estadisticas')} onClick={() => setTab('estadisticas')}>
            <BarChart2 size={14} /> Estadísticas
          </button>
          <button style={TAB_STYLES(tab === 'carga-masiva')} onClick={() => setTab('carga-masiva')}>
            <Upload size={14} /> Carga Masiva
          </button>
        </div>
      </div>

      {/* ── Tab: Listado ─────────────────────────────────────────────────── */}
      {tab === 'listado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
          {/* Stats cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
              {[
                { label: 'Total Docentes', value: stats.total, icon: Users, color: '#1d4ed8' },
                { label: 'Tiempo Completo', value: stats.por_dedicacion?.find((d: any) => d.dedicacion === 'TC')?.total ?? 0, icon: Clock, color: '#7c3aed' },
                { label: 'Medio Tiempo', value: stats.por_dedicacion?.find((d: any) => d.dedicacion === 'MT')?.total ?? 0, icon: BarChart2, color: '#d97706' },
                { label: 'Territoriales', value: (stats.por_territorial?.length ?? 0), icon: Building2, color: '#0891b2' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', background: '#f8fafc' }}>
              <Search size={14} color="#94a3b8" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, documento o co..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', color: '#0f172a', width: '100%' }} />
              {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}><X size={12} /></button>}
            </div>
            <select value={filterTerritorial} onChange={(e) => setFilterTerritorial(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#0f172a', background: '#f8fafc' }}>
              <option value="">Todas las territoriales</option>
              {TERRITORIALES_FILTER.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterDedicacion} onChange={(e) => setFilterDedicacion(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#0f172a', background: '#f8fafc' }}>
              <option value="">Todas las dedicaciones</option>
              <option value="TC">Tiempo Completo</option>
              <option value="MT">Medio Tiempo</option>
              <option value="HC">Hora Cátedra</option>
            </select>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#0f172a', background: '#f8fafc' }}>
              <option value="">Todas las categorías</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
            {(filterTerritorial || filterDedicacion || filterEstado || search) && (
              <button onClick={() => { setSearch(''); setFilterTerritorial(''); setFilterDedicacion(''); setFilterEstado(''); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff1f2', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626' }}>
                <X size={12} /> Limpiar
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['DOCENTE', 'DOCUMENTO', 'TERRITORIAL', 'DEDICACION', 'CATEGORIA', 'HORAS', 'ACCIONES'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.72rem', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</td></tr>
                  ) : docentes.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                      <Users size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                      <div>No hay docentes registrados</div>
                    </td></tr>
                  ) : docentes.map((d) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      {/* Docente (avatar + nombre + email) */}
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {(d.nombre_completo || '').split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{d.nombre_completo}</div>
                            {d.correo_institucional && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{d.correo_institucional}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem' }}>{d.documento_identidad}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Building2 size={12} color="#64748b" />
                          <span style={{ fontSize: '0.78rem', color: '#0f172a' }}>{d.territorial}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}><Badge label={d.dedicacion_codigo || d.dedicacion || ''} code={d.dedicacion_codigo || ''} /></td>
                      <td style={{ padding: '10px 14px', fontSize: '0.78rem', color: '#0f172a' }}>{d.categoria}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: (d.horas_programables ?? 0) > 0 ? '#1d4ed8' : '#94a3b8', fontSize: '0.82rem' }}>{d.horas_programables ?? 0}h</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => setSelectedDocente(d)} title="Ver detalle" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Eye size={13} color="#475569" />
                          </button>
                          <button onClick={() => setEditDocente(d)} title="Editar" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #dbeafe', background: '#eff6ff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit2 size={13} color="#1d4ed8" />
                          </button>
                          <button onClick={() => handleToggleEstado(d.id)} title={d.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${d.estado === 'ACTIVO' ? '#fca5a5' : '#bbf7d0'}`, background: d.estado === 'ACTIVO' ? '#fff1f2' : '#f0fdf4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {d.estado === 'ACTIVO' ? <ToggleRight size={13} color="#dc2626" /> : <ToggleLeft size={13} color="#059669" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Mostrando {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} de {total}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === 1 ? '#f1f5f9' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>
                    <ChevronLeft size={14} color={page === 1 ? '#94a3b8' : '#475569'} />
                  </button>
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                    return (
                      <button key={p} onClick={() => setPage(p)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: p === page ? '#1d4ed8' : '#fff', color: p === page ? '#fff' : '#475569', fontWeight: p === page ? 700 : 400, cursor: 'pointer', fontSize: '0.78rem' }}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page === pages} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: page === pages ? '#f1f5f9' : '#fff', cursor: page === pages ? 'not-allowed' : 'pointer' }}>
                    <ChevronRight size={14} color={page === pages ? '#94a3b8' : '#475569'} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Estadísticas ──────────────────────────────────────────────── */}
      {tab === 'estadisticas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 24px' }}>
          {!stats ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Cargando estadísticas...</div>
          ) : (
            <>
              {/* Donut charts row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Distribución por Dedicación */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={16} color="#7c3aed" /> Distribución por Dedicación
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <DonutChart segments={dedicacionSegments} size={160} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {dedicacionSegments.map((s) => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#475569' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Distribución por Categoría */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={16} color="#1d4ed8" /> Distribución por Categoría
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <DonutChart segments={categoriaSegments} size={160} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {categoriaSegments.map((s: any) => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#475569' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                          {s.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bar chart: Docentes por Territorial */}
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={16} color="#0891b2" /> Docentes por Territorial
                </h3>
                {territorialData.length > 0 ? (
                  <BarChart data={territorialData} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Sin datos territoriales</div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Carga Masiva ─────────────────────────────────────────────── */}
      {tab === 'carga-masiva' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 24px' }}>
          {/* Info box */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1d4ed8', marginBottom: 6 }}>
              Carga Masiva de Docentes — Especificación PARTE XXVI, Sec. 26.1.1
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.6 }}>
              Carga flexible con las columnas del ListadoDocentes oficial. No todos los 31 campos son obligatorios: se exigen documento, nombre, territorial, vinculación y dedicación; categoría y núcleo temático quedan como recomendados. La plantilla incluye ejemplo, catálogos y el sistema muestra un visor final con filas aplicadas, fallidas y motivo detallado.
            </p>
          </div>

          {/* Upload card */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>SUBIR ARCHIVO DE DOCENTES</h3>
              <button onClick={handleDownloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600 }}>
                <Download size={13} /> Descargar Plantilla
              </button>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed #cbd5e1', borderRadius: 10, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: bulkFile ? '#f0fdf4' : '#f8fafc', transition: 'all 0.15s' }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setBulkFile(f); }}
            >
              <Upload size={32} color={bulkFile ? '#059669' : '#94a3b8'} style={{ marginBottom: 10 }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: bulkFile ? '#059669' : '#475569', marginBottom: 4 }}>
                {bulkFile ? `📄 ${bulkFile.name}` : 'Haga clic para subir o arrastre el archivo aquí'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>XLSX, CSV (Max. 10MB) — Formato DOCENTES_ESAP_[PERIODO]</div>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />

            {bulkFile && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={handleBulkUpload} disabled={bulkLoading} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: bulkLoading ? '#94a3b8' : '#1d4ed8', color: '#fff', cursor: bulkLoading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  {bulkLoading ? 'Procesando...' : 'Subir y Procesar'}
                </button>
                <button onClick={() => { setBulkFile(null); setBulkResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Result */}
          {bulkResult && (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Resultado de la carga</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total procesados', value: bulkResult.total ?? (bulkResult.created + bulkResult.updated + bulkResult.errors), color: '#1d4ed8' },
                  { label: 'Creados', value: bulkResult.created, color: '#059669' },
                  { label: 'Actualizados', value: bulkResult.updated, color: '#d97706' },
                  { label: 'Errores', value: bulkResult.errors, color: '#dc2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
              {bulkResult.errorDetails?.length > 0 && (
                <details>
                  <summary style={{ fontSize: '0.8rem', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Ver errores detallados ({bulkResult.errorDetails.length})</summary>
                  <div style={{ marginTop: 10, maxHeight: 240, overflowY: 'auto', border: '1px solid #fee2e2', borderRadius: 8, padding: 10 }}>
                    {bulkResult.errorDetails.map((e: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.75rem', color: '#7f1d1d', padding: '4px 0', borderBottom: '1px solid #fee2e2' }}>
                        Fila {e.row}: {e.message}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {selectedDocente && (
        <BancoDocenteDetalle
          docente={selectedDocente}
          onClose={() => setSelectedDocente(null)}
          onEdit={(d) => { setSelectedDocente(null); setEditDocente(d); }}
        />
      )}
      {editDocente !== null && (
        <BancoDocenteEditModal
          docente={editDocente?.id ? editDocente : null}
          onClose={() => setEditDocente(null)}
          onSaved={() => { setEditDocente(null); loadData(); showToast('Docente guardado correctamente'); }}
        />
      )}
    </div>
  );
}
