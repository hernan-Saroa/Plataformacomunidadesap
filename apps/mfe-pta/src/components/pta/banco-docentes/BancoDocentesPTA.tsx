import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Search, Upload, Download, RefreshCw, ChevronLeft, ChevronRight,
  Filter, X, CheckCircle, XCircle, Edit2, ToggleLeft, ToggleRight,
  GraduationCap, Building2, Clock, BarChart2, Eye,
} from 'lucide-react';
import {
  getBancoDocentes, getBancoDocenteStats, toggleBancoDocenteEstado,
  bulkUploadBancoDocentes,
} from '../../../services/api/ptaApi';
import { BancoDocenteDetalle } from './BancoDocenteDetalle';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';

const TERRITORIALES_FILTER = [
  'Sede Central', 'Antioquia', 'Atlántico', 'Bogotá D.C.', 'Bolívar-Córdoba-Sucre',
  'Boyacá-Casanare', 'Cauca-Nariño', 'Cesar-La Guajira', 'Chocó',
  'Cundinamarca-Meta', 'Huila-Caquetá', 'Magdalena', 'Norte de Santander',
  'Quindío-Risaralda-Caldas', 'Santander', 'Tolima', 'Valle del Cauca-Cauca',
];

const BADGE_COLORS: Record<string, string> = {
  TC: 'background:#dbeafe;color:#1d4ed8',
  MT: 'background:#fef3c7;color:#b45309',
  HC: 'background:#f3e8ff;color:#7c3aed',
  ACTIVO: 'background:#dcfce7;color:#15803d',
  INACTIVO: 'background:#fee2e2;color:#dc2626',
};

function Badge({ label, code }: { label: string; code: string }) {
  const style = BADGE_COLORS[code] || 'background:#f1f5f9;color:#475569';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      fontSize: '0.7rem',
      fontWeight: 600,
      ...Object.fromEntries(style.split(';').map(s => s.split(':') as [string, string])),
    }}>
      {label}
    </span>
  );
}

export function BancoDocentesPTA() {
  const [docentes, setDocentes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterTerritorial, setFilterTerritorial] = useState('');
  const [filterDedicacion, setFilterDedicacion] = useState('');
  const [filterEstado, setFilterEstado] = useState('ACTIVO');
  const [selectedDocente, setSelectedDocente] = useState<any>(null);
  const [editDocente, setEditDocente] = useState<any>(null);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 24px', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', top: 20, right: 24, zIndex: 9999, background: '#1d4ed8', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Banco de Docentes</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>{total} docentes registrados</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => loadData(page)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => setShowBulkPanel(!showBulkPanel)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
            <Upload size={14} /> Carga Masiva
          </button>
          <button onClick={() => setEditDocente({})} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#059669', cursor: 'pointer', fontSize: '0.8rem', color: '#fff', fontWeight: 600 }}>
            + Nuevo Docente
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[
            { label: 'Total', value: stats.total, icon: Users, color: '#1d4ed8' },
            { label: 'Activos', value: stats.activos, icon: CheckCircle, color: '#059669' },
            { label: 'Inactivos', value: stats.inactivos, icon: XCircle, color: '#dc2626' },
            { label: 'Tiempo Completo', value: stats.por_dedicacion?.find((d: any) => d.dedicacion === 'TC')?.total || 0, icon: Clock, color: '#7c3aed' },
            { label: 'Medio Tiempo', value: stats.por_dedicacion?.find((d: any) => d.dedicacion === 'MT')?.total || 0, icon: BarChart2, color: '#d97706' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk upload panel */}
      {showBulkPanel && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Carga Masiva desde Excel</h3>
            <button onClick={() => { setShowBulkPanel(false); setBulkFile(null); setBulkResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={18} />
            </button>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
            El archivo debe incluir columnas: <strong>Documento de identidad, Nombre completo, Territorial, Vinculación, Dedicación</strong>. Columnas opcionales: Correo Institucional, Categoría, Núcleo Temático, etc.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, border: '1.5px dashed #94a3b8', background: '#f8fafc', cursor: 'pointer', fontSize: '0.8rem', color: '#475569' }}>
              {bulkFile ? `📄 ${bulkFile.name}` : 'Seleccionar archivo .xlsx'}
            </button>
            <button onClick={handleBulkUpload} disabled={!bulkFile || bulkLoading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: bulkFile && !bulkLoading ? '#1d4ed8' : '#94a3b8', color: '#fff', cursor: bulkFile && !bulkLoading ? 'pointer' : 'not-allowed', fontSize: '0.8rem', fontWeight: 600 }}>
              {bulkLoading ? 'Procesando...' : 'Subir y Procesar'}
            </button>
          </div>
          {bulkResult && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: bulkResult.errors > 0 ? '#fff7ed' : '#f0fdf4', border: `1px solid ${bulkResult.errors > 0 ? '#fed7aa' : '#bbf7d0'}` }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Resultado de la carga</div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#059669' }}>✓ {bulkResult.created} creados</span>
                <span style={{ color: '#1d4ed8' }}>↻ {bulkResult.updated} actualizados</span>
                {bulkResult.errors > 0 && <span style={{ color: '#dc2626' }}>✗ {bulkResult.errors} errores</span>}
              </div>
              {bulkResult.errorDetails?.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: '0.75rem', color: '#dc2626', cursor: 'pointer' }}>Ver errores ({bulkResult.errorDetails.length})</summary>
                  <div style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {bulkResult.errorDetails.map((e: any, i: number) => (
                      <div key={i} style={{ fontSize: '0.72rem', color: '#7f1d1d', padding: '4px 0', borderBottom: '1px solid #fee2e2' }}>
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

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 12px', background: '#f8fafc' }}>
          <Search size={14} color="#94a3b8" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o documento..." style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem', color: '#0f172a', width: '100%' }} />
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
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
        {(filterTerritorial || filterDedicacion || filterEstado !== 'ACTIVO' || search) && (
          <button onClick={() => { setSearch(''); setFilterTerritorial(''); setFilterDedicacion(''); setFilterEstado('ACTIVO'); }} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff1f2', cursor: 'pointer', fontSize: '0.78rem', color: '#dc2626' }}>
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['#', 'Documento', 'Nombre', 'Territorial', 'Vinculación', 'Dedicación', 'H. Asignables', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando...</td></tr>
              ) : docentes.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                  <Users size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                  <div>No hay docentes registrados</div>
                </td></tr>
              ) : docentes.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: '0.72rem' }}>{d.orden_listado ?? ((page - 1) * 50 + i + 1)}</td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontFamily: 'monospace', fontSize: '0.78rem' }}>{d.documento_identidad}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{d.nombre_completo}</div>
                    {d.correo_institucional && <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>{d.correo_institucional}</div>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#0f172a' }}>
                      <Building2 size={12} color="#64748b" />
                      <span style={{ fontSize: '0.78rem' }}>{d.territorial}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: '0.78rem' }}>{d.vinculacion}</td>
                  <td style={{ padding: '10px 12px' }}><Badge label={d.dedicacion || d.dedicacion_codigo || ''} code={d.dedicacion_codigo} /></td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: d.horas_programables > 0 ? '#1d4ed8' : '#94a3b8' }}>{d.horas_programables}h</td>
                  <td style={{ padding: '10px 12px' }}><Badge label={d.estado} code={d.estado} /></td>
                  <td style={{ padding: '10px 12px' }}>
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
