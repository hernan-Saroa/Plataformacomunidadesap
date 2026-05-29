/**
 * EstructuraOrganizacionalModule — PlataformaComunidadESAP
 * Adaptado desde PTA/PlataformaDeGestion-PTA.
 * Datos: GET /pta/api/v1/catalogos/territoriales + /catalogos/cetaps
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Search, Download, MapPin,
  ChevronRight, GitBranch, Network, Users, Loader2,
  RefreshCw, AlertTriangle, Database, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { getCatalogoTerritoriales, getCatalogoCetaps } from '../../services/api/ptaApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CetapItem {
  id: string;
  nombre: string;
  codigo?: string;
  municipio?: string;
  ciudad?: string;
  territorial_id?: string;
  territorialId?: string;
  totalUsuarios?: number;
}

interface TerritorialItem {
  id: string;
  nombre: string;
  codigo?: string;
  ciudadPrincipal?: string;
  departamentos?: string[];
  totalCetap?: number;
  totalUsuarios?: number;
  cetap?: CetapItem[];
  sedes?: CetapItem[];
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EstructuraOrganizacionalModule() {
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'organigrama' | 'arbol'>('organigrama');
  const [territoriales, setTerritoriales] = useState<TerritorialItem[]>([]);
  const [cetapsMap, setCetapsMap] = useState<Record<string, CetapItem[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCatalogoTerritoriales();
      if (res.success && res.data.length > 0) {
        const items: TerritorialItem[] = res.data.map((t: any) => ({
          id: t.id,
          nombre: t.nombre,
          codigo: t.codigo,
          ciudadPrincipal: t.ciudadPrincipal || t.ciudad_principal || '',
          departamentos: t.departamentos || [],
          totalCetap: (t.sedes || t.cetaps || t.cetap || []).length || t.totalCetap || 0,
          totalUsuarios: t.totalUsuarios || 0,
          cetap: t.sedes || t.cetaps || t.cetap || [],
        }));
        setTerritoriales(items);
        const map: Record<string, CetapItem[]> = {};
        items.forEach(t => { map[t.id] = t.cetap || []; });
        setCetapsMap(map);
      }
    } catch (err) {
      toast.error('Error al cargar la estructura organizacional');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadCetaps = async (territorialId: string) => {
    if (cetapsMap[territorialId]?.length > 0) return;
    try {
      const res = await getCatalogoCetaps(territorialId);
      if (res.success) {
        setCetapsMap(prev => ({ ...prev, [territorialId]: res.data }));
      }
    } catch { /* silent */ }
  };

  const filtradas = territoriales.filter(t => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return t.nombre.toLowerCase().includes(q) ||
      (t.codigo || '').toLowerCase().includes(q) ||
      (t.ciudadPrincipal || '').toLowerCase().includes(q) ||
      (cetapsMap[t.id] || []).some(c => c.nombre.toLowerCase().includes(q));
  });

  const totalCetaps = territoriales.reduce((a, t) => a + (t.totalCetap || 0), 0);
  const totalUsuarios = territoriales.reduce((a, t) => a + (t.totalUsuarios || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Cargando estructura organizacional...</p>
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
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Estructura Organizacional</h1>
            <p className="text-xs text-gray-500 mt-0.5">Sedes y unidades territoriales ESAP</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button onClick={() => toast.info('Exportación no disponible en este entorno')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
          <button onClick={() => toast.info('Crea unidades desde el módulo Gestión de Personas')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#003DA5] text-white text-xs font-medium hover:bg-[#002d7a] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nueva Unidad
          </button>
        </div>
      </div>

      {/* Busqueda + vista toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex-1 max-w-md w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Buscar por nombre, código o ciudad..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setVista('organigrama')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${vista === 'organigrama' ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <Network className="w-3.5 h-3.5" /> Organigrama
            </button>
            <button onClick={() => setVista('arbol')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all text-xs font-medium ${vista === 'arbol' ? 'bg-[#003DA5] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
              <GitBranch className="w-3.5 h-3.5" /> Vista Árbol
            </button>
          </div>
        </div>
      </div>

      {vista === 'arbol' ? (
        <VistaArbol territoriales={filtradas} cetapsMap={cetapsMap} onExpandTerritorial={loadCetaps} totalCetap={totalCetaps} totalUsuarios={totalUsuarios} />
      ) : (
        <VistaOrganigrama territoriales={filtradas} cetapsMap={cetapsMap} onExpandTerritorial={loadCetaps} totalCetap={totalCetaps} totalUsuarios={totalUsuarios} />
      )}
    </div>
  );
}

// ─── Vista Árbol ──────────────────────────────────────────────────────────────

function VistaArbol({ territoriales, cetapsMap, onExpandTerritorial, totalCetap, totalUsuarios }: {
  territoriales: TerritorialItem[];
  cetapsMap: Record<string, CetapItem[]>;
  onExpandTerritorial: (id: string) => void;
  totalCetap: number;
  totalUsuarios: number;
}) {
  const [sedeCentralExpanded, setSedeCentralExpanded] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => {
    if (!expanded[id]) onExpandTerritorial(id);
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="space-y-2">
        {/* Sede Central */}
        <div>
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
            <button onClick={() => setSedeCentralExpanded(!sedeCentralExpanded)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100 transition-colors">
              <ChevronRight className={`w-4 h-4 transition-transform ${sedeCentralExpanded ? 'rotate-90' : ''}`} />
            </button>
            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Sede Central</span>
            <div className="flex-1">
              <span className="font-semibold text-sm text-gray-900">ESAP - Sede Central</span>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Bogotá D.C.</span>
                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {territoriales.length} Territoriales | {totalCetap} CETAP</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {totalUsuarios} usuarios</span>
              </div>
            </div>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">activo</span>
          </div>

          <AnimatePresence>
            {sedeCentralExpanded && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 ml-6 space-y-2">
                {territoriales.map(t => {
                  const isExp = !!expanded[t.id];
                  const cetaps = cetapsMap[t.id] || t.cetap || [];
                  return (
                    <div key={t.id}>
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-[#003DA5] hover:shadow-md transition-all bg-white">
                        <button onClick={() => toggle(t.id)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100">
                          <ChevronRight className={`w-4 h-4 transition-transform ${isExp ? 'rotate-90' : ''}`} />
                        </button>
                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">territorial</span>
                        <div className="flex-1">
                          <span className="font-semibold text-sm text-gray-900">{t.nombre}</span>
                          {t.codigo && <span className="text-xs text-gray-400 ml-2">({t.codigo})</span>}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-0.5">
                            {t.ciudadPrincipal && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {t.ciudadPrincipal}</span>}
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {cetaps.length || t.totalCetap || 0} CETAP</span>
                          </div>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isExp && cetaps.length > 0 && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 ml-6 space-y-1">
                            {cetaps.map(c => (
                              <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50">
                                <div className="w-6" />
                                <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">CETAP</span>
                                <div className="flex-1">
                                  <span className="text-xs font-medium text-gray-900">{c.nombre}</span>
                                  {c.codigo && <span className="text-[10px] text-gray-400 ml-1">({c.codigo})</span>}
                                  {(c.municipio || c.ciudad) && (
                                    <span className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                      <MapPin className="w-2.5 h-2.5" /> {c.municipio || c.ciudad}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Vista Organigrama ────────────────────────────────────────────────────────

function VistaOrganigrama({ territoriales, cetapsMap, onExpandTerritorial, totalCetap, totalUsuarios }: {
  territoriales: TerritorialItem[];
  cetapsMap: Record<string, CetapItem[]>;
  onExpandTerritorial: (id: string) => void;
  totalCetap: number;
  totalUsuarios: number;
}) {
  const [territorialExpandida, setTerritorialExpandida] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handleExpand = (id: string) => {
    if (territorialExpandida !== id) onExpandTerritorial(id);
    setTerritorialExpandida(territorialExpandida === id ? null : id);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Sede Central', value: 1, badge: 'Nacional', color: '#003DA5', icon: Building2 },
          { label: 'Unidades Territoriales', value: territoriales.length, badge: 'Activas', color: '#2962FF', icon: MapPin },
          { label: 'CETAP en Colombia', value: totalCetap, badge: 'Red', color: '#EA580C', icon: Network },
          { label: 'Usuarios en BD', value: totalUsuarios, badge: 'BD', color: '#059669', icon: Users },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br opacity-10" style={{ background: `linear-gradient(135deg, ${stat.color}40, transparent)` }} />
            <div className="relative flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}cc)` }}>
                <stat.icon className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${stat.color}20`, color: stat.color }}>{stat.badge}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Organigrama */}
      <div className="bg-white rounded-xl border border-gray-200 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30" />
        <div className="relative p-6 md:p-10">

          {/* Nivel 1 — Sede Central */}
          <div className="flex flex-col items-center mb-14">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative z-10">
              <div className="relative px-8 py-6 rounded-2xl shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 50%, #2962FF 100%)', border: '3px solid #002D7A', minWidth: 380, maxWidth: 420 }}>
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12" />
                </div>
                <div className="relative">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center shadow-xl border border-white/30">
                      <Building2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold bg-white/30 text-white border border-white/40 px-2 py-0.5 rounded-full backdrop-blur mb-1.5 inline-block">Sede Nacional</span>
                      <h3 className="text-xl font-bold text-white mb-0.5">ESAP Colombia</h3>
                      <div className="flex items-center gap-1.5 text-blue-100">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs">Bogotá D.C.</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5 pt-3 border-t border-white/30">
                    {[
                      { icon: MapPin, label: 'Territoriales', value: territoriales.length },
                      { icon: Network, label: 'CETAP', value: totalCetap },
                      { icon: Users, label: 'Usuarios', value: totalUsuarios },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {i > 0 && <div className="w-px h-8 bg-white/30" />}
                        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                          <stat.icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-100">{stat.label}</p>
                          <p className="text-base font-bold text-white">{stat.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <svg className="absolute left-1/2 -translate-x-1/2" style={{ top: '100%', width: 2, height: 50 }}>
                <line x1="1" y1="0" x2="1" y2="50" stroke="#003DA5" strokeWidth="2" strokeOpacity="0.8" />
                <circle cx="1" cy="50" r="3" fill="#2962FF" />
              </svg>
            </motion.div>
          </div>

          {/* Nivel 2 — Territoriales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {territoriales.map((t, index) => {
              const isExpanded = territorialExpandida === t.id;
              const isHov = hovered === t.id;
              const cetaps = cetapsMap[t.id] || t.cetap || [];

              return (
                <motion.div key={t.id}
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <svg className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '100%', width: 2, height: 20 }}>
                    <line x1="1" y1="0" x2="1" y2="20" stroke={isHov || isExpanded ? '#2962FF' : '#BFDBFE'} strokeWidth="2" className="transition-colors duration-300" />
                  </svg>

                  <div className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-2xl scale-[1.02]' : 'shadow-lg hover:shadow-xl'}`}
                    style={{
                      borderColor: isExpanded ? '#2962FF' : isHov ? '#93C5FD' : '#E5E7EB',
                      background: isExpanded ? 'linear-gradient(135deg, #2962FF 0%, #1E40AF 100%)' : 'white',
                    }}>
                    {!isExpanded && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400" />}

                    <div className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpanded ? 'bg-white/20 border border-white/30' : 'bg-gradient-to-br from-blue-50 to-blue-100'}`}>
                          <MapPin className="w-5 h-5" style={{ color: isExpanded ? 'white' : '#2962FF' }} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-1.5 inline-block"
                            style={{ background: isExpanded ? 'rgba(255,255,255,0.25)' : '#DBEAFE', color: isExpanded ? 'white' : '#1E40AF' }}>
                            Territorial
                          </span>
                          <h4 className="font-bold text-sm line-clamp-2 leading-tight mt-1" style={{ color: isExpanded ? 'white' : '#111827' }}>
                            {t.nombre}
                          </h4>
                          {t.ciudadPrincipal && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }} />
                              <p className="text-xs truncate" style={{ color: isExpanded ? 'rgba(255,255,255,0.9)' : '#6B7280' }}>{t.ciudadPrincipal}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg mb-3"
                        style={{ background: isExpanded ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
                        <div className="flex items-center gap-2 flex-1">
                          <Network className="w-3.5 h-3.5 shrink-0" style={{ color: isExpanded ? 'white' : '#2962FF' }} />
                          <div>
                            <p className="text-[10px]" style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>CETAP</p>
                            <p className="text-base font-bold leading-none" style={{ color: isExpanded ? 'white' : '#111827' }}>
                              {cetaps.length || t.totalCetap || 0}
                            </p>
                          </div>
                        </div>
                        <div className="w-px h-8" style={{ background: isExpanded ? 'rgba(255,255,255,0.3)' : '#BFDBFE' }} />
                        <div className="flex items-center gap-2 flex-1">
                          <Users className="w-3.5 h-3.5 shrink-0" style={{ color: isExpanded ? 'white' : '#2962FF' }} />
                          <div>
                            <p className="text-[10px]" style={{ color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6B7280' }}>Usuarios</p>
                            <p className="text-base font-bold leading-none" style={{ color: isExpanded ? 'white' : '#111827' }}>
                              {t.totalUsuarios || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button onClick={() => handleExpand(t.id)}
                        className="w-full py-2 rounded-lg font-medium text-xs text-white transition-all duration-300 flex items-center justify-center gap-1.5"
                        style={{
                          background: isExpanded ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #2962FF, #1E40AF)',
                          border: isExpanded ? '1px solid rgba(255,255,255,0.3)' : 'none',
                        }}>
                        {isExpanded ? <><ChevronDown className="w-3.5 h-3.5" /> Ocultar CETAP</> : <><ChevronRight className="w-3.5 h-3.5 -rotate-90" /> Ver {cetaps.length || t.totalCetap || 0} CETAP</>}
                      </button>
                    </div>

                    {/* Nivel 3 — CETAPs */}
                    <AnimatePresence>
                      {isExpanded && cetaps.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
                          className="border-t-2 border-white/30 bg-gradient-to-b from-white/15 to-white/5 p-3">
                          <div className="flex items-center gap-2 mb-2.5 pb-2.5 border-b border-white/20">
                            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                              <Network className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-white/80">CETAP Asociados</p>
                              <p className="text-xs font-bold text-white">{cetaps.length} Unidades</p>
                            </div>
                          </div>
                          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                            {cetaps.map((c, ci) => (
                              <motion.div key={c.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: ci * 0.03, duration: 0.3 }}
                                className="bg-white rounded-lg p-2.5 hover:shadow-md transition-all">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-orange-700">{ci + 1}</span>
                                  </div>
                                  <div className="flex-1 min-w-0 pr-2">
                                    <p className="text-xs font-semibold text-gray-900 line-clamp-1 mb-0.5">{c.nombre}</p>
                                    {(c.municipio || c.ciudad) && (
                                      <span className="flex items-center gap-1 text-[10px] text-gray-600">
                                        <MapPin className="w-2.5 h-2.5" /> {c.municipio || c.ciudad}
                                      </span>
                                    )}
                                  </div>
                                  {c.codigo && (
                                    <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium shrink-0">{c.codigo}</span>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
