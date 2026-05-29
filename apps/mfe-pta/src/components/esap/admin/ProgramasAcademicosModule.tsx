/**
 * ProgramasAcademicosModule — PlataformaComunidadESAP
 * Adaptado desde PTA/PlataformaDeGestion-PTA.
 * Datos: GET /pta/api/v1/catalogos/programas + /catalogos/asignaturas
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap, Plus, Search, Filter, Edit, Eye, Clock, Users,
  BookOpen, Award, CheckCircle, AlertCircle, Loader2, Layers,
  BarChart3, X, ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCatalogoProgramas, getCatalogoAsignaturas } from '../../../services/api/ptaApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Asignatura {
  id: string;
  nombre: string;
  codigo?: string;
  creditos?: number;
  horas?: number;
  nucleoTematico?: string;
  semestre?: string;
  modalidad?: string;
}

interface Programa {
  id: string;
  nombre: string;
  codigo?: string;
  nivel?: string;
  modalidad?: string;
  facultad?: string;
  duracion?: number;
  creditos?: number;
  estado?: string;
  descripcion?: string;
  perfilEgresado?: string;
  total_asignaturas?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NIVEL_COLORS: Record<string, string> = {
  PREGRADO: 'bg-blue-100 text-blue-700',
  POSGRADO: 'bg-orange-100 text-orange-700',
  MAESTRIA: 'bg-pink-100 text-pink-700',
  DOCTORADO: 'bg-red-100 text-red-700',
  EXTENSION: 'bg-teal-100 text-teal-700',
};

function NivelBadge({ nivel }: { nivel?: string }) {
  const n = (nivel || '').toUpperCase();
  const cls = Object.entries(NIVEL_COLORS).find(([k]) => n.includes(k))?.[1] || 'bg-gray-100 text-gray-700';
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{nivel || '—'}</span>;
}

function EstadoBadge({ estado }: { estado?: string }) {
  const e = (estado || '').toUpperCase();
  const isActive = e === 'ACTIVO' || e === 'ACTIVO' || estado === 'Activo';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {isActive ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {estado || 'Desconocido'}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProgramasAcademicosModule() {
  const [search, setSearch] = useState('');
  const [nivelFilter, setNivelFilter] = useState('all');
  const [modalidadFilter, setModalidadFilter] = useState('all');
  const [vista, setVista] = useState<'lista' | 'stats'>('lista');
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [asignaturasPorPrograma, setAsignaturasPorPrograma] = useState<Record<string, Asignatura[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingAsignaturas, setLoadingAsignaturas] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCatalogoProgramas();
      if (res.success) setProgramas(res.data || []);
    } catch {
      toast.error('Error al cargar los programas académicos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadAsignaturas = async (programaId: string) => {
    if (asignaturasPorPrograma[programaId]) return;
    setLoadingAsignaturas(programaId);
    try {
      const res = await getCatalogoAsignaturas(programaId);
      if (res.success) {
        setAsignaturasPorPrograma(prev => ({ ...prev, [programaId]: res.data || [] }));
      }
    } catch { /* silent */ }
    finally { setLoadingAsignaturas(null); }
  };

  const handleExpand = (id: string) => {
    if (expandedId !== id) { loadAsignaturas(id); setExpandedId(id); }
    else setExpandedId(null);
  };

  const niveles = [...new Set(programas.map(p => p.nivel).filter(Boolean))] as string[];
  const modalidades = [...new Set(programas.map(p => p.modalidad).filter(Boolean))] as string[];

  const filtered = programas.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.nombre.toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q) || (p.facultad || '').toLowerCase().includes(q);
    const matchN = nivelFilter === 'all' || p.nivel === nivelFilter;
    const matchM = modalidadFilter === 'all' || p.modalidad === modalidadFilter;
    return matchQ && matchN && matchM;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stats = {
    total: programas.length,
    activos: programas.filter(p => (p.estado || '').toUpperCase() === 'ACTIVO').length,
    pregrados: programas.filter(p => (p.nivel || '').toUpperCase().includes('PREGRADO')).length,
    posgrados: programas.filter(p => (p.nivel || '').toUpperCase().includes('POSGRADO') || (p.nivel || '').toUpperCase().includes('MAESTRIA') || (p.nivel || '').toUpperCase().includes('DOCTORADO')).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Cargando programas académicos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003DA5] to-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Programas Académicos</h1>
            <p className="text-xs text-gray-500 mt-0.5">Catálogo oficial ESAP — {programas.length} programas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button onClick={() => toast.info('Crea programas desde el módulo de configuración')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003DA5] text-white text-xs font-medium hover:bg-[#002d7a] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo Programa
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Programas', value: stats.total, icon: GraduationCap, color: '#003DA5' },
          { label: 'Activos', value: stats.activos, icon: CheckCircle, color: '#059669' },
          { label: 'Pregrados', value: stats.pregrados, icon: BookOpen, color: '#2962FF' },
          { label: 'Posgrados', value: stats.posgrados, icon: Award, color: '#7C3AED' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: `linear-gradient(135deg, ${s.color}, transparent)` }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                <s.icon className="w-5 h-5" style={{ color: s.color }} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros + vista */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          <div className="flex-1 max-w-xs relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input placeholder="Buscar programa..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10" />
          </div>
          <select value={nivelFilter} onChange={e => { setNivelFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-white">
            <option value="all">Todos los niveles</option>
            {niveles.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={modalidadFilter} onChange={e => { setModalidadFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-blue-400 bg-white">
            <option value="all">Todas las modalidades</option>
            {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${vista === 'lista' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <Layers className="w-3.5 h-3.5" /> Lista
            </button>
            <button onClick={() => setVista('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${vista === 'stats' ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <BarChart3 className="w-3.5 h-3.5" /> Dashboard
            </button>
          </div>
        </div>
      </div>

      {vista === 'stats' ? (
        <DashboardStats programas={programas} />
      ) : (
        <>
          {/* Lista */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {paginated.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No se encontraron programas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginated.map((p, i) => (
                  <ProgramaRow key={p.id} programa={p} index={i}
                    isExpanded={expandedId === p.id}
                    onToggle={() => handleExpand(p.id)}
                    asignaturas={asignaturasPorPrograma[p.id]}
                    loadingAsignaturas={loadingAsignaturas === p.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">{filtered.length} programas · Página {page} de {totalPages}</p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Anterior
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = page <= 3 ? i + 1 : page + i - 2;
                  if (pg < 1 || pg > totalPages) return null;
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${pg === page ? 'bg-[#003DA5] text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}>
                      {pg}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Fila de Programa ─────────────────────────────────────────────────────────

function ProgramaRow({ programa: p, index, isExpanded, onToggle, asignaturas, loadingAsignaturas }: {
  programa: Programa;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  asignaturas?: Asignatura[];
  loadingAsignaturas?: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03, duration: 0.3 }}>
      <div className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/30' : ''}`}
        onClick={onToggle}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{p.nombre}</span>
            {p.codigo && <span className="text-[10px] text-gray-400 font-mono">({p.codigo})</span>}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <NivelBadge nivel={p.nivel} />
            {p.modalidad && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{p.modalidad}</span>}
            {p.facultad && <span className="text-[10px] text-gray-400">{p.facultad}</span>}
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center hidden md:block">
            <p className="text-sm font-bold text-gray-900">{p.creditos || '—'}</p>
            <p className="text-[10px] text-gray-400">Créditos</p>
          </div>
          <div className="text-center hidden md:block">
            <p className="text-sm font-bold text-gray-900">{p.duracion || '—'}</p>
            <p className="text-[10px] text-gray-400">Semestres</p>
          </div>
          <EstadoBadge estado={p.estado} />
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </div>

      {/* Asignaturas expandidas */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
            <div className="bg-gray-50/50 border-t border-gray-100 px-5 py-4">
              {loadingAsignaturas ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando asignaturas...
                </div>
              ) : asignaturas && asignaturas.length > 0 ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-gray-700">{asignaturas.length} asignaturas — Plan de estudios</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {asignaturas.map(a => (
                      <div key={a.id} className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-900 line-clamp-2">{a.nombre}</p>
                            {a.nucleoTematico && <p className="text-[10px] text-gray-500 mt-0.5">{a.nucleoTematico}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            {a.creditos && <p className="text-xs font-bold text-blue-600">{a.creditos}cr</p>}
                            {a.semestre && <p className="text-[10px] text-gray-400">Sem. {a.semestre}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs font-medium">Sin asignaturas registradas para este programa</p>
                </div>
              )}
              {p.descripcion && (
                <div className="mt-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800"><strong>Descripción:</strong> {p.descripcion}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

function DashboardStats({ programas }: { programas: Programa[] }) {
  const byNivel = programas.reduce((acc, p) => {
    const n = p.nivel || 'Sin nivel';
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byModalidad = programas.reduce((acc, p) => {
    const m = p.modalidad || 'Sin modalidad';
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const colors = ['#003DA5', '#2962FF', '#0EA5E9', '#7C3AED', '#059669', '#EA580C'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" /> Distribución por Nivel
        </h3>
        <div className="space-y-3">
          {Object.entries(byNivel).map(([nivel, count], i) => {
            const pct = Math.round((count / programas.length) * 100);
            return (
              <div key={nivel}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{nivel}</span>
                  <span className="text-xs font-bold text-gray-900">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.05, duration: 0.6 }}
                    className="h-full rounded-full" style={{ background: colors[i % colors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" /> Distribución por Modalidad
        </h3>
        <div className="space-y-3">
          {Object.entries(byModalidad).map(([mod, count], i) => {
            const pct = Math.round((count / programas.length) * 100);
            return (
              <div key={mod}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{mod}</span>
                  <span className="text-xs font-bold text-gray-900">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.05, duration: 0.6 }}
                    className="h-full rounded-full" style={{ background: colors[(i + 2) % colors.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
