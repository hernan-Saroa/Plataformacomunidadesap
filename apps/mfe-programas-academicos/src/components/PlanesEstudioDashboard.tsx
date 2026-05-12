/**
 * PlanesEstudioDashboard — Dashboard comparativo de planes de estudio
 * Muestra analítica visual de cobertura de créditos, distribución por núcleo,
 * y comparación entre todos los programas académicos.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend, Treemap,
} from 'recharts';
import {
  BookOpen, GraduationCap, Layers, TrendingUp, Award,
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle2,
  BarChart3, PieChart as PieChartIcon, Loader2, X, Target,
  ArrowUpRight, ArrowDownRight, Minus, Hash, Grid3X3,
} from 'lucide-react';
import { apiClient } from '../../services/api';
import { Card } from '@esap-mfe/shared-ui';

interface ProgramData {
  id: string;
  nombre: string;
  codigo: string;
  nivelFormacion: string;
  creditos: number;
  duracionSemestres: number;
  totalAsignaturas: number;
  creditosPlan: number;
  ptaCatalogId?: string;
  asignaturas?: any[];
}

const NIVEL_COLORS: Record<string, string> = {
  'Pregrado': '#003DA5',
  'Especialización': '#F97316',
  'Maestría': '#EC4899',
  'Doctorado': '#DC2626',
  'Extensión': '#14B8A6',
};

const NUCLEO_CHART_COLORS = [
  '#003DA5', '#DC2626', '#059669', '#D97706', '#7C3AED',
  '#EC4899', '#0891B2', '#EA580C', '#0D9488', '#6366F1',
  '#8B5CF6', '#0284C7', '#E11D48', '#64748B',
];

export function PlanesEstudioDashboard() {
  const [programas, setProgramas] = useState<ProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrograma, setSelectedPrograma] = useState<string | null>(null);
  const [detailAsignaturas, setDetailAsignaturas] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewTab, setViewTab] = useState<'cobertura' | 'nucleos' | 'comparativo'>('cobertura');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/auth/api/v1/programas-academicos');
      setProgramas((response.data || []).filter((p: any) => (p.totalAsignaturas || 0) > 0));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
    setLoading(false);
  };

  const loadProgramaDetail = async (progId: string) => {
    if (selectedPrograma === progId) {
      setSelectedPrograma(null);
      setDetailAsignaturas([]);
      return;
    }
    setSelectedPrograma(progId);
    setLoadingDetail(true);
    try {
      const response = await apiClient.get(`/auth/api/v1/programas-academicos/${progId}/asignaturas`);
      setDetailAsignaturas(response.data || []);
    } catch (_e) { /* silent */ }
    setLoadingDetail(false);
  };

  // Aggregated stats
  const globalStats = useMemo(() => {
    const totalProgs = programas.length;
    const totalAsigs = programas.reduce((s, p) => s + (p.totalAsignaturas || 0), 0);
    const totalCreditsPlan = programas.reduce((s, p) => s + (p.creditosPlan || 0), 0);
    const totalCreditsTarget = programas.reduce((s, p) => s + (p.creditos || 0), 0);
    const avgCoverage = totalProgs > 0
      ? programas.reduce((s, p) => s + (p.creditos > 0 ? ((p.creditosPlan || 0) / p.creditos) * 100 : 0), 0) / totalProgs
      : 0;
    const complete = programas.filter(p => p.creditos > 0 && (p.creditosPlan || 0) >= p.creditos).length;
    return { totalProgs, totalAsigs, totalCreditsPlan, totalCreditsTarget, avgCoverage, complete };
  }, [programas]);

  // Coverage chart data
  const coverageData = useMemo(() => {
    return programas
      .map(p => ({
        name: p.nombre.length > 25 ? p.nombre.slice(0, 25) + '...' : p.nombre,
        fullName: p.nombre,
        asignaturas: p.totalAsignaturas || 0,
        creditos_plan: p.creditosPlan || 0,
        creditos_target: p.creditos || 0,
        cobertura: p.creditos > 0 ? Math.round(((p.creditosPlan || 0) / p.creditos) * 100) : 0,
        nivel: p.nivelFormacion,
        id: p.id,
      }))
      .sort((a, b) => b.cobertura - a.cobertura);
  }, [programas]);

  // Per-nivel aggregation
  const nivelData = useMemo(() => {
    const map = new Map<string, { count: number; asigs: number; credits: number }>();
    programas.forEach(p => {
      const n = p.nivelFormacion || 'Otro';
      const ex = map.get(n) || { count: 0, asigs: 0, credits: 0 };
      map.set(n, {
        count: ex.count + 1,
        asigs: ex.asigs + (p.totalAsignaturas || 0),
        credits: ex.credits + (p.creditosPlan || 0),
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
      color: NIVEL_COLORS[name] || '#64748B',
    }));
  }, [programas]);

  // Detail nucleo data for selected programa
  const detailNucleoData = useMemo(() => {
    if (!detailAsignaturas.length) return [];
    const map = new Map<string, { count: number; creditos: number }>();
    detailAsignaturas.forEach(a => {
      const n = a.nucleo || 'Sin nucleo';
      const ex = map.get(n) || { count: 0, creditos: 0 };
      map.set(n, { count: ex.count + 1, creditos: ex.creditos + (a.creditos || 0) });
    });
    return Array.from(map.entries())
      .map(([name, data], i) => ({ name, ...data, color: NUCLEO_CHART_COLORS[i % NUCLEO_CHART_COLORS.length] }))
      .sort((a, b) => b.creditos - a.creditos);
  }, [detailAsignaturas]);

  // Detail semestre data
  const detailSemestreData = useMemo(() => {
    if (!detailAsignaturas.length) return [];
    const map = new Map<number, { count: number; creditos: number }>();
    detailAsignaturas.forEach(a => {
      const sem = a.semestre || 1;
      const ex = map.get(sem) || { count: 0, creditos: 0 };
      map.set(sem, { count: ex.count + 1, creditos: ex.creditos + (a.creditos || 0) });
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sem, data]) => ({ semestre: `Sem ${sem}`, ...data }));
  }, [detailAsignaturas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#003DA5]" />
        <span className="ml-3 text-gray-500">Cargando dashboard...</span>
      </div>
    );
  }

  if (programas.length === 0) {
    return (
      <div className="py-16 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-bold text-gray-500">No hay programas con plan de estudios</p>
        <p className="text-xs text-gray-400 mt-1">Expanda un programa y agregue asignaturas para ver el dashboard.</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-xs max-w-[250px]">
        <p className="font-bold text-gray-900 mb-1">{d.fullName || d.name}</p>
        {d.cobertura !== undefined && <p className="text-gray-600">Cobertura: <span className="font-bold">{d.cobertura}%</span></p>}
        {d.creditos_plan !== undefined && <p className="text-gray-600">Creditos: <span className="font-bold">{d.creditos_plan}/{d.creditos_target}</span></p>}
        {d.asignaturas !== undefined && <p className="text-gray-600">Asignaturas: <span className="font-bold">{d.asignaturas}</span></p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Global KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Programas', value: globalStats.totalProgs, icon: GraduationCap, color: 'text-[#003DA5]', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Asignaturas', value: globalStats.totalAsigs, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Creditos Plan', value: globalStats.totalCreditsPlan, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Creditos Obj.', value: globalStats.totalCreditsTarget, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Cobertura Prom.', value: `${globalStats.avgCoverage.toFixed(0)}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-sky-50 border-sky-200' },
          { label: 'Completos', value: `${globalStats.complete}/${globalStats.totalProgs}`, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
        ].map(kpi => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${kpi.bg} border rounded-xl p-3`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <kpi.icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500">{kpi.label}</span>
            </div>
            <p className={`text-xl font-black ${kpi.color}`}>{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'cobertura', label: 'Cobertura de Creditos', icon: BarChart3 },
          { key: 'nucleos', label: 'Distribucion por Nivel', icon: PieChartIcon },
          { key: 'comparativo', label: 'Detalle por Programa', icon: Grid3X3 },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              viewTab === tab.key ? 'bg-white text-[#003DA5] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Cobertura de Créditos */}
      {viewTab === 'cobertura' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#003DA5]" />
              Cobertura de Creditos por Programa
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Porcentaje de creditos cubiertos en el plan de estudios vs creditos requeridos</p>
          </div>
          <div className="p-4" style={{ height: Math.max(400, coverageData.length * 35 + 80) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coverageData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cobertura" radius={[0, 4, 4, 0]} maxBarSize={20}>
                  {coverageData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.cobertura >= 100 ? '#059669' : entry.cobertura >= 75 ? '#003DA5' : entry.cobertura >= 50 ? '#D97706' : '#DC2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pb-4 text-[10px]">
            {[
              { color: '#059669', label: '≥100% Completo' },
              { color: '#003DA5', label: '≥75% Avanzado' },
              { color: '#D97706', label: '≥50% En progreso' },
              { color: '#DC2626', label: '<50% Incompleto' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
                <span className="text-gray-600">{l.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB: Distribución por Nivel */}
      {viewTab === 'nucleos' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-sm">Programas por Nivel</h3>
            </div>
            <div className="p-4" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nivelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="count"
                    label={({ name, count }) => `${name} (${count})`}
                  >
                    {nivelData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any) => [value, name === 'count' ? 'Programas' : name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-black text-gray-900 text-sm">Asignaturas y Creditos por Nivel</h3>
            </div>
            <div className="p-4" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nivelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="asigs" name="Asignaturas" fill="#003DA5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="credits" name="Creditos" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB: Detalle por Programa */}
      {viewTab === 'comparativo' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {coverageData.map((prog) => {
            const isSelected = selectedPrograma === prog.id;
            const pct = prog.cobertura;
            const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';
            const statusIcon = pct >= 100 ? CheckCircle2 : pct >= 50 ? TrendingUp : AlertTriangle;
            const StatusIcon = statusIcon;

            return (
              <div key={prog.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => loadProgramaDetail(prog.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${
                    pct >= 100 ? 'text-emerald-500' : pct >= 75 ? 'text-blue-500' : pct >= 50 ? 'text-amber-500' : 'text-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{prog.fullName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-[200px]">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                        {prog.creditos_plan}/{prog.creditos_target} cr. ({pct}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs font-bold text-gray-700">{prog.asignaturas}</p>
                      <p className="text-[9px] text-gray-400">asig.</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      NIVEL_COLORS[prog.nivel] ? 'text-white' : 'text-gray-600 bg-gray-100'
                    }`} style={{ backgroundColor: NIVEL_COLORS[prog.nivel] || '#E5E7EB' }}>
                      {prog.nivel}
                    </span>
                    {isSelected ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        {loadingDetail ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="w-5 h-5 animate-spin text-[#003DA5]" />
                          </div>
                        ) : (
                          <div className="grid md:grid-cols-2 gap-4">
                            {/* Nucleo Pie */}
                            {detailNucleoData.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Distribucion por Nucleo</h4>
                                <div style={{ height: 220 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={detailNucleoData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        dataKey="creditos"
                                        label={({ name, creditos }) => `${name.slice(0, 12)}${name.length > 12 ? '..' : ''} (${creditos})`}
                                      >
                                        {detailNucleoData.map((entry, i) => (
                                          <Cell key={i} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(v: any) => [`${v} cr.`, 'Creditos']} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Semestre Bar */}
                            {detailSemestreData.length > 0 && (
                              <div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Carga por Semestre</h4>
                                <div style={{ height: 220 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={detailSemestreData}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                      <XAxis dataKey="semestre" tick={{ fontSize: 9 }} />
                                      <YAxis tick={{ fontSize: 9 }} />
                                      <Tooltip />
                                      <Bar dataKey="creditos" name="Creditos" fill="#003DA5" radius={[4, 4, 0, 0]} />
                                      <Bar dataKey="count" name="Asignaturas" fill="#059669" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Nucleo table */}
                            {detailNucleoData.length > 0 && (
                              <div className="md:col-span-2">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-2">Detalle Nucleos Tematicos</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  {detailNucleoData.map(nd => (
                                    <div key={nd.name} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: nd.color }} />
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-semibold text-gray-700 truncate">{nd.name}</p>
                                        <p className="text-[9px] text-gray-400">{nd.count} asig. · {nd.creditos} cr.</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
