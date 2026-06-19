import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Upload, Download, RefreshCw, ChevronLeft, ChevronRight,
  X, CheckCircle, XCircle, Edit2, ToggleLeft, ToggleRight,
  GraduationCap, Building2, Clock, BarChart2, Eye, FileSpreadsheet, Database, Info, UserPlus, MailPlus,
  Filter, ExternalLink, MapPin, ArrowRight, RotateCcw, ChevronDown
} from 'lucide-react';
import {
  getBancoDocentes, getBancoDocenteStats, toggleBancoDocenteEstado, bulkUploadBancoDocentes
} from '../../../services/api/ptaApi';
import { downloadBancoDocentesTemplate } from '../../../utils/bancoDocentesExcel';
import { BancoDocenteDetalleInline } from './BancoDocenteDetalleInline';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
import { BancoDocentesBulkUpload } from './BancoDocentesBulkUpload';
import { TableroInvitacionesRUND } from './TableroInvitacionesRUND';
import { useAuth } from '../../../contexts/AuthContext';

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

type Tab = 'listado' | 'estadisticas' | 'carga-masiva' | 'invitaciones';

export function BancoDocentesPTA() {
  const auth = useAuth();
  
  // Robust super user detection: check both MFE AuthContext AND shell's stored user
  const isSuperUserFallback = (() => {
    if (auth.isSuperUser) return true;
    // Fallback: check shell's stored user from localStorage/sessionStorage
    try {
      const raw = localStorage.getItem('esap_user') || sessionStorage.getItem('esap_user');
      if (raw) {
        const shellUser = JSON.parse(raw);
        const email = String(shellUser?.email || '').toLowerCase();
        if (email === 'superuser@esap.edu.co') return true;
        const roles = shellUser?.roles || [];
        if (roles.some((r: any) => (typeof r === 'string' ? r : r?.code) === 'SUPER_ADMIN')) return true;
      }
    } catch { /* ignore */ }
    return false;
  })();

  const hasPermission = (perm: string) => isSuperUserFallback || auth.hasPermission(perm);
  
  console.log('[BancoDocentesPTA] AUTH:', { isSuperUser: auth.isSuperUser, isSuperUserFallback, email: auth.userEmail, role: auth.userRole, invite: hasPermission('banco-docentes.rund.invite'), import: hasPermission('banco-docentes.rund.import'), manage: hasPermission('banco-docentes.rund.manage') });
  const [tab, setTab] = useState<Tab>('listado');
  const [docentes, setDocentes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFilterTerritorial, setStatsFilterTerritorial] = useState('');
  const [statsFilterDedicacion, setStatsFilterDedicacion] = useState('');
  const [statsFilterEstado, setStatsFilterEstado] = useState('');
  const [statsFilterPeriodo, setStatsFilterPeriodo] = useState('');

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTerritorial, setFilterTerritorial] = useState('');
  const [filterDedicacion, setFilterDedicacion] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [periodoDropdownOpen, setPeriodoDropdownOpen] = useState(false);
  const [periodoSearch, setPeriodoSearch] = useState('');
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedDocente, setSelectedDocente] = useState<string | null>(null);
  const [editDocente, setEditDocente] = useState<any>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const searchTimeout = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    import('../../../../../shell/src/services/api').then(({ apiClient }) => {
      apiClient.get<any[]>('/pta/api/v1/periodos-academicos')
        .then(res => {
          // Si el API retorna un array directamente o está envuelto en data
          const rawData = (res as any)?.data || (res as any)?.datos || (res as any)?.result || res;
          const data = Array.isArray(rawData) ? rawData : [];
          setPeriodos(data);
          
          // Buscar el periodo activo (estado 'en_curso')
          const activo = data.find((p: any) => p.estado === 'en_curso');
          if (activo) {
            setFilterPeriodo(activo.codigo);
          } else if (data.length > 0) {
            setFilterPeriodo(data[0].codigo);
          } else {
            setFilterPeriodo('');
          }
        })
        .catch((err) => {
          console.error('Error cargando periodos:', err);
          alert('Error cargando periodos: ' + err.message);
          setFilterPeriodo('');
        });
    });
  }, []);

  // ── Carga de stats separada (con filtros propios) ─────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const statsRes = await getBancoDocenteStats({
        territorial: statsFilterTerritorial || undefined,
        dedicacion: statsFilterDedicacion || undefined,
        estado: statsFilterEstado || undefined,
        periodoCarga: filterPeriodo || undefined,
      });
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
    } catch { /* silencioso */ }
    finally { setStatsLoading(false); }
  }, [statsFilterTerritorial, statsFilterDedicacion, statsFilterEstado, filterPeriodo]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Navegar al listado con filtro preseleccionado ─────────────────────────
  const navigateToListado = (filters: { territorial?: string; dedicacion?: string; estado?: string }) => {
    // Limpiar todos los filtros del listado primero
    setFilterTerritorial(filters.territorial || '');
    setFilterDedicacion(filters.dedicacion || '');
    setFilterEstado(filters.estado || '');
    setSearch('');
    setPage(1);
    setTab('listado');
  };

  const loadData = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const res = await getBancoDocentes({ territorial: filterTerritorial || undefined, dedicacion: filterDedicacion || undefined, estado: filterEstado || undefined, search: search || undefined, page: p, limit: 50, periodoCarga: filterPeriodo || undefined });
      if (res.success && res.data) {
        setDocentes(res.data.items || res.data.data || []);
        setTotal(res.data.total || 0);
        setPages(res.data.pages || 1);
      }
    } catch {
      // Fallback silencioso: los servicios ya manejan errores internamente
    } finally {
      setLoading(false);
    }
  }, [filterTerritorial, filterDedicacion, filterEstado, search, page, filterPeriodo]);

  useEffect(() => { loadData(1); setPage(1); }, [filterTerritorial, filterDedicacion, filterEstado, filterPeriodo]);
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
      showToast(res.error || 'Error en la carga masiva');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      downloadBancoDocentesTemplate();
    } catch {
      showToast('Plantilla no disponible — descargando ejemplo');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setBulkFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files?.[0]) setBulkFile(e.dataTransfer.files[0]);
  };

  const processBulkFile = () => handleBulkUpload();

  // ── Stats derived — usa TODOS los valores del API ─────────────────────────
  const DEDICACION_COLORS: Record<string, string> = { TC: '#1E40AF', MT: '#D97706', HC: '#7C3AED', SIN_DEDICACION: '#9CA3AF' };
  const DEDICACION_LABELS: Record<string, string> = { TC: 'Tiempo Completo', MT: 'Medio Tiempo', HC: 'Hora Cátedra', SIN_DEDICACION: 'Sin Dedicación' };
  const dedicacionSegments = stats?.por_dedicacion?.map((d: any) => ({
    label: DEDICACION_LABELS[d.dedicacion] || d.dedicacion,
    value: d.total,
    color: DEDICACION_COLORS[d.dedicacion] || '#94A3B8',
    code: d.dedicacion,
  })) || [];

  // Paleta diversa: azul, naranja, verde, morado, rosa, cyan, ámbar
  const CATEGORIA_COLORS = ['#2563EB', '#EA580C', '#059669', '#7C3AED', '#DB2777', '#0891B2', '#D97706', '#4F46E5', '#16A34A', '#DC2626'];
  const categoriaSegments = stats?.por_categoria ? stats.por_categoria.map((c: any, i: number) => ({
    label: c.categoria,
    value: c.total,
    color: CATEGORIA_COLORS[i % CATEGORIA_COLORS.length],
  })) : [];

  const territorialData: { label: string; value: number; id?: string }[] = stats?.por_territorial
    ? [...stats.por_territorial].sort((a: any, b: any) => b.total - a.total).slice(0, 20).map((t: any) => ({ label: t.territorial, value: t.total, id: t.territorial_id }))
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  const TAB_STYLES = (active: boolean) => ({
    display: 'flex' as const, alignItems: 'center' as const, gap: 6,
    padding: '8px 18px', borderRadius: 0, border: 'none', cursor: 'pointer' as const,
    fontSize: '0.82rem', fontWeight: active ? 700 : 500,
    color: active ? '#1d4ed8' : '#475569',
    background: 'transparent',
    borderBottom: active ? '2px solid #1d4ed8' : '2px solid transparent',
    marginBottom: '-1px',
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

      {/* Header Container */}
      <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Title Box */}
        <div style={{ 
          background: '#fff', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          padding: '20px 24px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '12px', background: '#EBF0FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#003DA5" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>Banco de Docentes ESAP</h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {total} docentes oficiales sincronizados desde el listado maestro y almacenados en Personas
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>PERIODO:</span>
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setPeriodoDropdownOpen(!periodoDropdownOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', background: '#f8fafc', cursor: 'pointer', outline: 'none', minWidth: '150px', justifyContent: 'space-between' }}
                >
                  {filterPeriodo || 'Todos los periodos'}
                  <ChevronDown size={14} color="#64748b" />
                </button>
                
                {periodoDropdownOpen && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 50, minWidth: '200px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '4px' }}>
                      <Search size={12} color="#64748b" />
                      <input 
                        autoFocus
                        value={periodoSearch} 
                        onChange={(e) => setPeriodoSearch(e.target.value)} 
                        placeholder="Buscar periodo..." 
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', width: '100%' }} 
                      />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button 
                        onClick={() => { setFilterPeriodo(''); setPeriodoDropdownOpen(false); setPeriodoSearch(''); }}
                        style={{ padding: '6px 8px', textAlign: 'left', background: filterPeriodo === '' ? '#eff6ff' : 'transparent', color: filterPeriodo === '' ? '#1d4ed8' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Todos los periodos
                      </button>
                      {periodos.filter(p => {
                        const label = p.codigo || `${p.anio}-${p.semestre}`;
                        return label.toLowerCase().includes(periodoSearch.toLowerCase());
                      }).map(p => {
                        const label = p.codigo || `${p.anio}-${p.semestre}`;
                        const isSelected = filterPeriodo === label;
                        return (
                          <button 
                            key={p.id}
                            onClick={() => { setFilterPeriodo(label); setPeriodoDropdownOpen(false); setPeriodoSearch(''); }}
                            style={{ padding: '6px 8px', textAlign: 'left', background: isSelected ? '#eff6ff' : 'transparent', color: isSelected ? '#1d4ed8' : '#334155', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}
                          >
                            <span>{label}</span>
                            {p.estado === 'en_curso' && <span style={{ fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>Actual</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPermission('banco-docentes.rund.manage') && (
                <button 
                  onClick={() => setEditDocente({})}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: '8px', border: '1px solid #10b981', background: '#ecfdf5', color: '#047857', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s' }}>
                  <UserPlus size={16} /> Crear Docente (Canal 2)
                </button>
              )}
              {hasPermission('banco-docentes.rund.invite') && (
                <button 
                  onClick={() => setTab('invitaciones')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: '8px', border: '1px solid #6366f1', background: tab === 'invitaciones' ? '#4338ca' : '#eef2ff', color: tab === 'invitaciones' ? '#fff' : '#4338ca', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s' }}>
                  <MailPlus size={16} /> Invitaciones Autogestión (Canal 3)
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #e2e8f0' }}>
          <button style={TAB_STYLES(tab === 'listado')} onClick={() => setTab('listado')}>
            <Users size={14} /> Listado de Docentes
          </button>
          <button style={TAB_STYLES(tab === 'estadisticas')} onClick={() => setTab('estadisticas')}>
            <BarChart2 size={14} /> Estadísticas
          </button>
          {hasPermission('banco-docentes.rund.import') && (
            <button style={TAB_STYLES(tab === 'carga-masiva')} onClick={() => setTab('carga-masiva')}>
              <Upload size={14} /> Carga Masiva
            </button>
          )}
          {hasPermission('banco-docentes.rund.invite') && (
            <button style={TAB_STYLES(tab === 'invitaciones')} onClick={() => setTab('invitaciones')}>
              <MailPlus size={14} /> Invitaciones
            </button>
          )}
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
            {(filterTerritorial || filterDedicacion || filterEstado || search || filterPeriodo) && (
              <button onClick={() => { setSearch(''); setFilterTerritorial(''); setFilterDedicacion(''); setFilterEstado(''); setFilterPeriodo(''); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff1f2', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626' }}>
                <X size={12} /> Limpiar
              </button>
            )}
          </div>

          {/* Table Card — Estilo unificado con Personas */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
            {/* Table Header Bar */}
            <div style={{ padding: '16px 24px', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', lineHeight: '24px', fontWeight: 700, color: '#1F2937' }}>Lista de Docentes</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', lineHeight: '16px', color: '#6B7280' }}>
                  {loading ? 'Cargando docentes...' : `Mostrando ${docentes.length} de ${total} docentes`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ padding: '4px 10px', borderRadius: 9999, border: '1px solid #E5E7EB', fontSize: '12px', fontWeight: 600, color: '#374151', background: '#fff' }}>
                  Total: {total}
                </span>
              </div>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#6B7280' }}>Cargando docentes...</p>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                <thead style={{ background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    {[
                      { label: 'DOCENTE', align: 'left' },
                      { label: 'DOCUMENTO', align: 'left' },
                      { label: 'DEDICACIÓN', align: 'left' },
                      { label: 'TERRITORIAL', align: 'left' },
                      { label: 'VINCULACIÓN', align: 'left' },
                      { label: 'ESTADO', align: 'left' },
                      { label: 'HORAS', align: 'left' },
                      { label: 'ACCIONES', align: 'right' },
                    ].map(({ label, align }) => (
                      <th key={label} style={{
                        padding: '12px 16px',
                        textAlign: align as any,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        fontSize: '12px',
                        lineHeight: '16px',
                        color: '#6B7280',
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap',
                      }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: '#FFFFFF' }}>
                  {!loading && docentes.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>
                        <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>No hay docentes registrados</div>
                        <div style={{ fontSize: '12px', marginTop: 4 }}>Intenta ajustar los filtros o agregar docentes</div>
                      </td>
                    </tr>
                  ) : docentes.map((d, index) => (
                    <React.Fragment key={d.id}>
                      <tr
                        style={{
                          borderBottom: selectedDocente === d.id ? 'none' : '1px solid #E5E7EB',
                          background: selectedDocente === d.id ? '#EFF6FF' : '#FFFFFF',
                          transition: 'background 150ms ease',
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelectedDocente(selectedDocente === d.id ? null : d.id)}
                        onMouseEnter={(e) => { if (selectedDocente !== d.id) e.currentTarget.style.background = '#F9FAFB'; }}
                        onMouseLeave={(e) => { if (selectedDocente !== d.id) e.currentTarget.style.background = '#FFFFFF'; }}
                      >
                        {/* ── Celda DOCENTE — Avatar + Nombre + Email ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                              background: selectedDocente === d.id ? '#003DA5' : '#E0EDFF',
                              color: selectedDocente === d.id ? '#fff' : '#003DA5',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px', fontWeight: 600,
                              transition: 'all 0.2s',
                            }}>
                              {(d.nombre_completo || '').split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: '14px', lineHeight: '20px', fontWeight: 600, color: '#1F2937' }}>
                                {d.nombre_completo}
                              </p>
                              {d.correo_institucional && (
                                <p style={{ margin: 0, fontSize: '12px', lineHeight: '16px', color: '#6B7280' }}>
                                  {d.correo_institucional}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ── Celda DOCUMENTO ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#374151', fontFamily: 'ui-monospace, monospace' }}>
                            {d.documento_identidad}
                          </p>
                          {d.tipo_documento && (
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#9CA3AF' }}>
                              {d.tipo_documento}
                            </p>
                          )}
                        </td>

                        {/* ── Celda DEDICACIÓN — Badge estilo Personas ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          {(() => {
                            const code = d.dedicacion_codigo || d.dedicacion || '';
                            const badgeConfig: Record<string, { bg: string; color: string; border: string; label: string }> = {
                              TC: { bg: '#EFF6FF', color: '#1E40AF', border: '#3B82F6', label: 'Tiempo Completo' },
                              MT: { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B', label: 'Medio Tiempo' },
                              HC: { bg: '#EDE9FE', color: '#5B21B6', border: '#8B5CF6', label: 'Hora Cátedra' },
                            };
                            const cfg = badgeConfig[code] || { bg: '#F3F4F6', color: '#374151', border: '#D1D5DB', label: code };
                            return (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 10px', borderRadius: 9999,
                                fontSize: '12px', fontWeight: 500,
                                background: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                              }}>
                                {cfg.label}
                              </span>
                            );
                          })()}
                        </td>

                        {/* ── Celda TERRITORIAL — Icono + Nombre + Código ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          {d.territorial ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Building2 size={16} color="#059669" style={{ flexShrink: 0 }} />
                              <div>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#1F2937' }}>
                                  {(d.territorial || '').length > 22 ? `${d.territorial.substring(0, 22)}...` : d.territorial}
                                </p>
                                {d.codigo_territorial && (
                                  <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#9CA3AF' }}>
                                    Cód: {d.codigo_territorial}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>Sin territorial</span>
                          )}
                        </td>

                        {/* ── Celda CATEGORÍA ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px', color: '#374151' }}>
                          {d.categoria || '—'}
                        </td>

                        {/* ── Celda ESTADO — Badge con icono estilo Personas ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          {(() => {
                            const isActive = (d.estado || '').toUpperCase() === 'ACTIVO';
                            return (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '3px 10px', borderRadius: 9999,
                                fontSize: '12px', fontWeight: 600,
                                background: isActive ? '#ECFDF5' : '#F3F4F6',
                                color: isActive ? '#065F46' : '#374151',
                                border: `1px solid ${isActive ? '#10B981' : '#D1D5DB'}`,
                              }}>
                                {isActive
                                  ? <CheckCircle size={14} color="#059669" />
                                  : <XCircle size={14} color="#6B7280" />
                                }
                                {isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            );
                          })()}
                        </td>

                        {/* ── Celda HORAS ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle', fontWeight: 700, fontSize: '14px', color: (d.horas_programables ?? 0) > 0 ? '#1E40AF' : '#9CA3AF' }}>
                          {d.horas_programables ?? 0}h
                        </td>

                        {/* ── Celda ACCIONES — DropdownMenu ⋮ estilo Personas ── */}
                        <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                            {/* Botón Ver/Cerrar Detalle */}
                            <button
                              onClick={() => setSelectedDocente(selectedDocente === d.id ? null : d.id)}
                              title={selectedDocente === d.id ? 'Cerrar detalle' : 'Ver detalle'}
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                border: selectedDocente === d.id ? '1px solid #003DA5' : '1px solid #E5E7EB',
                                background: selectedDocente === d.id ? '#003DA5' : '#FFFFFF',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                              }}
                              onMouseEnter={(e) => { if (selectedDocente !== d.id) e.currentTarget.style.background = '#F9FAFB'; }}
                              onMouseLeave={(e) => { if (selectedDocente !== d.id) e.currentTarget.style.background = '#FFFFFF'; }}
                            >
                              {selectedDocente === d.id ? <X size={14} color="#fff" /> : <Eye size={14} color="#6B7280" />}
                            </button>
                            {/* Botón Editar */}
                            {hasPermission('banco-docentes.rund.manage') && (
                              <button
                                onClick={() => setEditDocente(d)}
                                title="Editar docente"
                                style={{
                                  width: 32, height: 32, borderRadius: 8,
                                  border: '1px solid #E5E7EB', background: '#FFFFFF',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#F9FAFB'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
                              >
                                <Edit2 size={14} color="#6B7280" />
                              </button>
                            )}
                            {/* Botón Toggle Estado */}
                            {hasPermission('banco-docentes.rund.manage') && (
                              <button
                                onClick={() => handleToggleEstado(d.id)}
                                title={d.estado === 'ACTIVO' ? 'Inactivar docente' : 'Activar docente'}
                                style={{
                                  width: 32, height: 32, borderRadius: 8,
                                  border: `1px solid ${d.estado === 'ACTIVO' ? '#FCA5A5' : '#BBF7D0'}`,
                                  background: d.estado === 'ACTIVO' ? '#FEF2F2' : '#F0FDF4',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {d.estado === 'ACTIVO'
                                  ? <ToggleRight size={14} color="#DC2626" />
                                  : <ToggleLeft size={14} color="#059669" />
                                }
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline expandable detail row */}
                      {selectedDocente === d.id && (
                        <BancoDocenteDetalleInline
                          docente={d}
                          onClose={() => setSelectedDocente(null)}
                          onEdit={(doc) => { setSelectedDocente(null); setEditDocente(doc); }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination — Estilo mejorado */}
            {pages > 1 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 24px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB',
              }}>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  Mostrando {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} de {total} docentes
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                      background: page === 1 ? '#F3F4F6' : '#fff',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <ChevronLeft size={14} color={page === 1 ? '#9CA3AF' : '#374151'} />
                  </button>
                  {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                    const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid #E5E7EB',
                          background: p === page ? '#003DA5' : '#fff',
                          color: p === page ? '#fff' : '#374151',
                          fontWeight: p === page ? 700 : 400,
                          cursor: 'pointer', fontSize: '13px',
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB',
                      background: page === pages ? '#F3F4F6' : '#fff',
                      cursor: page === pages ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    <ChevronRight size={14} color={page === pages ? '#9CA3AF' : '#374151'} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Estadísticas — Dashboard World-Class ──────────────────── */}
      {tab === 'estadisticas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 24px' }}>

          {/* ── Filtros del Dashboard ──────────────────────────────────── */}
          <div style={{
            background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#003DA5', fontWeight: 700, fontSize: '14px' }}>
                <Filter size={16} /> Filtrar Estadísticas
              </div>

              {/* Periodo */}
              <select
                value={statsFilterPeriodo}
                onChange={(e) => setStatsFilterPeriodo(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '13px',
                  background: statsFilterPeriodo ? '#EBF0FA' : '#fff', color: '#374151', cursor: 'pointer',
                  fontWeight: statsFilterPeriodo ? 600 : 400, minWidth: 160,
                }}
              >
                <option value="">Todos los periodos</option>
                {periodos.map((p: any) => (
                  <option key={p.codigo} value={p.codigo}>{p.nombre || p.codigo}</option>
                ))}
              </select>

              {/* Territorial */}
              <select
                value={statsFilterTerritorial}
                onChange={(e) => setStatsFilterTerritorial(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '13px',
                  background: statsFilterTerritorial ? '#EBF0FA' : '#fff', color: '#374151', cursor: 'pointer',
                  fontWeight: statsFilterTerritorial ? 600 : 400, minWidth: 180,
                }}
              >
                <option value="">Todas las territoriales</option>
                {(stats?.por_territorial || []).map((t: any) => (
                  <option key={t.territorial} value={t.territorial}>{t.territorial}</option>
                ))}
              </select>

              {/* Dedicación */}
              <select
                value={statsFilterDedicacion}
                onChange={(e) => setStatsFilterDedicacion(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '13px',
                  background: statsFilterDedicacion ? '#EBF0FA' : '#fff', color: '#374151', cursor: 'pointer',
                  fontWeight: statsFilterDedicacion ? 600 : 400, minWidth: 140,
                }}
              >
                <option value="">Todas las dedicaciones</option>
                <option value="TC">Tiempo Completo</option>
                <option value="MT">Medio Tiempo</option>
                <option value="HC">Hora Cátedra</option>
              </select>

              {/* Estado */}
              <select
                value={statsFilterEstado}
                onChange={(e) => setStatsFilterEstado(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: '13px',
                  background: statsFilterEstado ? '#EBF0FA' : '#fff', color: '#374151', cursor: 'pointer',
                  fontWeight: statsFilterEstado ? 600 : 400, minWidth: 120,
                }}
              >
                <option value="">Todos los estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>

              {/* Reset filtros */}
              {(statsFilterTerritorial || statsFilterDedicacion || statsFilterEstado || statsFilterPeriodo) && (
                <button
                  onClick={() => { setStatsFilterTerritorial(''); setStatsFilterDedicacion(''); setStatsFilterEstado(''); setStatsFilterPeriodo(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '7px 14px',
                    borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2',
                    color: '#DC2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={13} /> Limpiar filtros
                </button>
              )}
            </div>

            {/* Active filter badges */}
            {(statsFilterTerritorial || statsFilterDedicacion || statsFilterEstado || statsFilterPeriodo) && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {statsFilterPeriodo && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: '#EBF0FA', color: '#003DA5', fontSize: '11px', fontWeight: 600 }}>
                    Periodo: {periodos.find((p: any) => p.codigo === statsFilterPeriodo)?.nombre || statsFilterPeriodo}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatsFilterPeriodo('')} />
                  </span>
                )}
                {statsFilterTerritorial && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 600 }}>
                    Territorial: {statsFilterTerritorial}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatsFilterTerritorial('')} />
                  </span>
                )}
                {statsFilterDedicacion && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: '#EDE9FE', color: '#5B21B6', fontSize: '11px', fontWeight: 600 }}>
                    Dedicación: {DEDICACION_LABELS[statsFilterDedicacion] || statsFilterDedicacion}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatsFilterDedicacion('')} />
                  </span>
                )}
                {statsFilterEstado && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 12, background: statsFilterEstado === 'ACTIVO' ? '#ECFDF5' : '#FEF2F2', color: statsFilterEstado === 'ACTIVO' ? '#065F46' : '#991B1B', fontSize: '11px', fontWeight: 600 }}>
                    Estado: {statsFilterEstado}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStatsFilterEstado('')} />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Loading overlay */}
          {statsLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
              <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#6B7280' }}>Actualizando estadísticas...</span>
            </div>
          )}

          {!stats && !statsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
              <div style={{ width: 48, height: 48, border: '3px solid #E5E7EB', borderTopColor: '#003DA5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 16, fontSize: '14px', color: '#6B7280' }}>Cargando estadísticas...</p>
            </div>
          ) : stats && (
            <>
              {/* ── KPI Cards — Clickeables ────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Total Docentes', value: stats.total, icon: Users, color: '#003DA5', bg: '#EBF0FA', click: () => navigateToListado({}) },
                  { label: 'Activos', value: stats.activos, icon: CheckCircle, color: '#059669', bg: '#ECFDF5', click: () => navigateToListado({ estado: 'ACTIVO' }) },
                  { label: 'Inactivos', value: stats.inactivos, icon: XCircle, color: '#DC2626', bg: '#FEF2F2', click: () => navigateToListado({ estado: 'INACTIVO' }) },
                  { label: 'Total Horas', value: `${(stats.total_horas ?? 0).toLocaleString()}h`, icon: Clock, color: '#7C3AED', bg: '#EDE9FE' },
                  { label: 'Promedio Horas', value: `${stats.promedio_horas ?? 0}h`, icon: BarChart2, color: '#0891B2', bg: '#ECFEFF' },
                  { label: 'Territoriales', value: stats.por_territorial?.length ?? 0, icon: Building2, color: '#D97706', bg: '#FEF3C7' },
                  { label: 'CETAP/Sedes', value: stats.por_sede?.length ?? 0, icon: MapPin, color: '#EA580C', bg: '#FFF7ED' },
                  { label: 'Categorías', value: stats.por_categoria?.length ?? 0, icon: GraduationCap, color: '#DB2777', bg: '#FDF2F8' },
                ].map(({ label, value, icon: Icon, color, bg, click }) => (
                  <div
                    key={label}
                    onClick={click}
                    style={{
                      background: '#fff', borderRadius: 12, padding: '18px 20px',
                      border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      cursor: click ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (click) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,61,165,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={22} color={color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1F2937', lineHeight: 1.1 }}>{value}</div>
                      <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 500, marginTop: 2 }}>{label}</div>
                    </div>
                    {click && <ArrowRight size={16} color="#9CA3AF" />}
                  </div>
                ))}
              </div>

              {/* ── Row 1: Dedicación + Categoría — CLICKEABLES ───────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Dedicación */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={18} color="#7C3AED" /> Distribución por Dedicación
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <DonutChart segments={dedicacionSegments} size={160} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      {dedicacionSegments.map((s: any) => (
                        <div
                          key={s.label}
                          onClick={() => navigateToListado({ dedicacion: s.code })}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                            fontSize: '13px', color: '#374151', cursor: 'pointer', padding: '6px 8px',
                            borderRadius: 6, transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F4FF'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span>{s.label}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 700, color: '#1F2937' }}>{s.value}</span>
                            <ExternalLink size={12} color="#9CA3AF" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Categoría (Escalafón) */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={18} color="#1E40AF" /> Distribución por Categoría
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <DonutChart segments={categoriaSegments} size={160} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, maxHeight: 240, overflowY: 'auto' }}>
                      {categoriaSegments.map((s: any) => (
                        <div key={s.label} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                          fontSize: '13px', color: '#374151', padding: '5px 8px', borderRadius: 6,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span>{s.label}</span>
                          </div>
                          <span style={{ fontWeight: 700, color: '#1F2937' }}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Row 2: Vinculación + Nivel de Formación ──────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Tipo de Vinculación */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Database size={18} color="#059669" /> Tipo de Vinculación
                  </h3>
                  {(() => {
                    const vinculacionData = (stats.por_vinculacion || []).map((v: any, i: number) => ({
                      label: v.vinculacion, value: v.total, color: ['#059669', '#D97706', '#2563EB', '#DC2626', '#7C3AED', '#DB2777'][i % 6],
                    }));
                    const maxV = Math.max(...vinculacionData.map((v: any) => v.value), 1);
                    return vinculacionData.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {vinculacionData.map((v: any) => (
                          <div key={v.label} style={{ cursor: 'default' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '12px' }}>
                              <span style={{ color: '#374151', fontWeight: 500 }}>{v.label}</span>
                              <span style={{ fontWeight: 700, color: '#1F2937' }}>{v.value}</span>
                            </div>
                            <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(v.value / maxV) * 100}%`, background: v.color, borderRadius: 5, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: '13px' }}>Sin datos de vinculación</div>
                    );
                  })()}
                </div>

                {/* Nivel de Formación */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={18} color="#7C3AED" /> Nivel de Formación
                  </h3>
                  {(() => {
                    const formacionData = (stats.por_nivel_formacion || []).map((f: any, i: number) => ({
                      label: f.nivel_formacion, value: f.total, color: ['#7C3AED', '#2563EB', '#EA580C', '#059669', '#DB2777', '#0891B2'][i % 6],
                    }));
                    const maxF = Math.max(...formacionData.map((f: any) => f.value), 1);
                    return formacionData.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {formacionData.map((f: any) => (
                          <div key={f.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '12px' }}>
                              <span style={{ color: '#374151', fontWeight: 500 }}>{f.label}</span>
                              <span style={{ fontWeight: 700, color: '#1F2937' }}>{f.value}</span>
                            </div>
                            <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(f.value / maxF) * 100}%`, background: f.color, borderRadius: 5, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: '13px' }}>Sin datos de formación</div>
                    );
                  })()}
                </div>
              </div>

              {/* ── Row 3: Género + Rango de Edad ────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Género */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} color="#0891B2" /> Distribución por Género
                  </h3>
                  {(() => {
                    const generoData = (stats.por_genero || []).map((g: any, i: number) => ({
                      label: g.genero === 'M' ? 'Masculino' : g.genero === 'F' ? 'Femenino' : g.genero === 'O' ? 'Otro' : g.genero,
                      value: g.total,
                      color: ['#2563EB', '#DB2777', '#D97706', '#059669', '#7C3AED'][i % 5],
                    }));
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                        <DonutChart segments={generoData} size={150} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                          {generoData.map((g: any) => (
                            <div key={g.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '13px', color: '#374151', padding: '5px 8px', borderRadius: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                                <span>{g.label}</span>
                              </div>
                              <span style={{ fontWeight: 700, color: '#1F2937' }}>{g.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Rango de Edad */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 size={18} color="#D97706" /> Distribución por Rango de Edad
                  </h3>
                  {(() => {
                    const edadData = (stats.por_rango_edad || []).map((e: any, i: number) => ({
                      label: e.rango_edad, value: e.total, color: ['#EA580C', '#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2'][i % 7],
                    }));
                    const maxE = Math.max(...edadData.map((e: any) => e.value), 1);
                    return edadData.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {edadData.map((e: any) => (
                          <div key={e.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '12px' }}>
                              <span style={{ color: '#374151', fontWeight: 500 }}>{e.label}</span>
                              <span style={{ fontWeight: 700, color: '#1F2937' }}>{e.value}</span>
                            </div>
                            <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(e.value / maxE) * 100}%`, background: e.color, borderRadius: 5, transition: 'width 0.6s ease' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: '13px' }}>Sin datos de rango de edad</div>
                    );
                  })()}
                </div>
              </div>

              {/* ── Row 4: Territorial — Clickeable ─────────────────── */}
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Building2 size={18} color="#0891B2" /> Docentes por Territorial
                  <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>
                    {territorialData.length} territoriales — Click para filtrar
                  </span>
                </h3>
                {territorialData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {territorialData.map((t) => {
                      const maxVal = Math.max(...territorialData.map(td => td.value), 1);
                      const pct = (t.value / maxVal) * 100;
                      return (
                        <div
                          key={t.label}
                          onClick={() => navigateToListado({ territorial: t.label })}
                          style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F0F4FF'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '12px' }}>
                            <span style={{ color: '#374151', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Building2 size={12} color="#0891B2" /> {t.label}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, color: '#1F2937' }}>{t.value}</span>
                              <ExternalLink size={11} color="#9CA3AF" />
                            </div>
                          </div>
                          <div style={{ height: 10, background: '#F3F4F6', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #003DA5, #0891B2)', borderRadius: 5, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: '13px' }}>Sin datos territoriales</div>
                )}
              </div>

              {/* ── Row 5: CETAP/Sedes ─────────────────────────────── */}
              {stats.por_sede && stats.por_sede.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24 }}>
                  <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={18} color="#059669" /> Docentes por CETAP / Sede
                    <span style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: 500, color: '#6B7280' }}>
                      {stats.por_sede.length} CETAP
                    </span>
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                    {stats.por_sede.slice(0, 30).map((s: any, i: number) => {
                      const maxS = Math.max(...stats.por_sede.map((ss: any) => ss.total), 1);
                      return (
                        <div key={s.sede + i} style={{ padding: '6px 8px', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: '11px' }}>
                            <span style={{ color: '#374151', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70%' }}>
                              <MapPin size={10} color="#059669" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{s.sede}
                            </span>
                            <span style={{ fontWeight: 700, color: '#1F2937' }}>{s.total}</span>
                          </div>
                          <div style={{ height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(s.total / maxS) * 100}%`, background: '#059669', borderRadius: 3, transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: Carga Masiva ─────────────────────────────────────────────── */}
      {tab === 'carga-masiva' && (
        <div style={{ padding: '20px 24px' }}>
          <BancoDocentesBulkUpload 
            onSuccess={() => {
              loadData(1);
              setTab('listado');
              showToast('Importación completada correctamente');
            }} 
            onCancel={() => setTab('listado')} 
          />
        </div>
      )}

      {/* ── Tab: Invitaciones ─────────────────────────────────────────────── */}
      {tab === 'invitaciones' && (
        <div style={{ padding: '20px 24px' }}>
          <TableroInvitacionesRUND />
        </div>
      )}

      {/* Modals */}
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
