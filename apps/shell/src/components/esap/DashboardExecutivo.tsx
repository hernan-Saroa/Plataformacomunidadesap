import React, { useEffect, useState, useCallback } from 'react';
import {
  Users, Building2, GraduationCap, FolderOpen, Shield, Activity,
  AlertCircle, Loader2, RefreshCw, TrendingUp, TrendingDown,
  Globe, BarChart3, ArrowUpRight, ArrowDownRight,
  FileText, Target, Eye, Gauge, ExternalLink, BookOpen,
  Zap, ArrowRight, FileCheck, ClipboardList, Award,
  AlertOctagon, Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from 'recharts';
import dashboardService from '../../services/api/dashboard.service';
import { motion } from 'motion/react';

// ═══════ TYPES ═══════
interface DashboardExecutivoProps { onNavigateToModule?: (moduleId: string) => void; }
type ViewTab = 'estrategico' | 'operacional';

// ═══════ CONSTANTS ═══════
const C = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#EC4899','#14B8A6','#F97316','#6366F1','#84CC16','#D946EF'];
const CARD_STYLES = [
  { bg: 'linear-gradient(135deg, #1e40af, #2563eb)', shadow: 'rgba(37,99,235,0.25)' },
  { bg: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', shadow: 'rgba(59,130,246,0.25)' },
  { bg: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', shadow: 'rgba(139,92,246,0.25)' },
  { bg: 'linear-gradient(135deg, #059669, #10b981)', shadow: 'rgba(16,185,129,0.25)' },
  { bg: 'linear-gradient(135deg, #d97706, #f59e0b)', shadow: 'rgba(245,158,11,0.25)' },
  { bg: 'linear-gradient(135deg, #0891b2, #06b6d4)', shadow: 'rgba(6,182,212,0.25)' },
  { bg: 'linear-gradient(135deg, #db2777, #ec4899)', shadow: 'rgba(236,72,153,0.25)' },
  { bg: 'linear-gradient(135deg, #4f46e5, #6366f1)', shadow: 'rgba(99,102,241,0.25)' },
];

// ═══════ HELPERS ═══════
const sc = (s: number) => s >= 80 ? '#10B981' : s >= 60 ? '#3B82F6' : s >= 40 ? '#F59E0B' : '#EF4444';
const sl = (e: string) => ({ optimo: { l: 'Óptimo', b: 'bg-emerald-500/10', t: 'text-emerald-500' }, bueno: { l: 'Bueno', b: 'bg-blue-500/10', t: 'text-blue-500' }, alerta: { l: 'Alerta', b: 'bg-amber-500/10', t: 'text-amber-500' }, critico: { l: 'Crítico', b: 'bg-red-500/10', t: 'text-red-500' } }[e] || { l: e, b: 'bg-gray-100', t: 'text-gray-500' });
const sv = (s: string) => ({ critico: { bg: 'bg-red-50', t: 'text-red-600', d: 'bg-red-500', bd: 'border-red-200' }, alto: { bg: 'bg-orange-50', t: 'text-orange-600', d: 'bg-orange-500', bd: 'border-orange-200' }, medio: { bg: 'bg-amber-50', t: 'text-amber-600', d: 'bg-amber-500', bd: 'border-amber-200' } }[s] || { bg: 'bg-blue-50', t: 'text-blue-600', d: 'bg-blue-500', bd: 'border-blue-200' });
const toObj = (data: Record<string, number>) => Object.entries(data || {}).filter(([,v]) => v > 0).map(([k,v], i) => ({ name: k.length > 20 ? k.slice(0,20)+'…' : k, value: v, fill: C[i % C.length] }));

function AN({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [d, setD] = useState(0);
  useEffect(() => { if (!value) { setD(0); return; } const t0 = Date.now(); const id = setInterval(() => { const p = Math.min((Date.now()-t0)/800,1); setD((1-Math.pow(1-p,3))*value); if (p>=1) clearInterval(id); }, 16); return () => clearInterval(id); }, [value]);
  return <>{Math.round(d).toLocaleString('es-CO')}{suffix}</>;
}

function CTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (<div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl px-3.5 py-2.5 shadow-2xl">
    <p className="font-bold text-white/80 mb-1 text-[10px]">{label}</p>
    {payload.map((e: any, i: number) => (<div key={i} className="flex items-center gap-2 py-0.5"><div className="w-2 h-2 rounded-full" style={{ background: e.color || e.fill }} /><span className="text-white/50 text-[10px]">{e.name}:</span><span className="font-bold text-white text-[10px]">{typeof e.value === 'number' ? e.value.toLocaleString('es-CO') : e.value}</span></div>))}
  </div>);
}

function MiniDonut({ data, size = 120, inner = 35 }: { data: any[]; size?: number; inner?: number }) {
  if (!data.length) return <div className="flex items-center justify-center h-20 text-gray-300 text-xs">Sin datos</div>;
  return (
    <div className="flex items-center gap-3">
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer><PieChart><Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={inner} outerRadius={size/2-5} paddingAngle={2} strokeWidth={0}>
          {data.map((e,i) => <Cell key={i} fill={e.fill} />)}
        </Pie><Tooltip content={<CTip />} /></PieChart></ResponsiveContainer>
      </div>
      <div className="space-y-1 flex-1 min-w-0">
        {data.slice(0,5).map((item,i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.fill }} />
            <span className="text-[10px] text-gray-600 truncate flex-1">{item.name}</span>
            <span className="text-[10px] font-bold text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pipeline({ stages, total }: { stages: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="space-y-2">
      {stages.map((s,i) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 w-20 truncate">{s.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i*0.1 }} className="h-full rounded-full" style={{ background: s.color }} />
            </div>
            <span className="text-[10px] font-bold w-8 text-right" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[9px] text-gray-400 w-10 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, icon: Icon, color, children, action, onAction }: { title: string; icon: any; color: string; children: React.ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />{title}
        </h3>
        {action && <button onClick={onAction} className="text-[10px] font-bold text-[#003DA5] hover:underline flex items-center gap-1">{action} <ExternalLink className="w-3 h-3" /></button>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ModuleCard({ mod, onClick }: { mod: any; onClick: () => void }) {
  const h = mod.health || { score: 0, estado: 'critico', factores: [] };
  const st = sl(h.estado);
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mod.idx * 0.04 }}
      onClick={onClick} className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 cursor-pointer group hover:shadow-lg transition-all relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: mod.color }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: `${mod.color}15` }}><mod.icon className="w-5 h-5" style={{ color: mod.color }} /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{mod.label}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${st.b} ${st.t}`}><div className="w-1.5 h-1.5 rounded-full" style={{ background: sc(h.score) }} />{st.l}</span>
            </div>
          </div>
          <div className="text-right"><p className="text-2xl font-black" style={{ color: sc(h.score) }}>{h.score}</p><p className="text-[8px] text-gray-400 uppercase">salud</p></div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-4"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(h.score,100)}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: mod.color }} /></div>
        <div className={`grid gap-2 mb-3 ${mod.kpis.length > 3 ? 'grid-cols-2' : `grid-cols-${mod.kpis.length}`}`}>
          {mod.kpis.map((k: any, ki: number) => (
            <div key={ki} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className={`text-base font-black ${k.warn ? 'text-red-500' : 'text-gray-900'}`}>{typeof k.value === 'number' ? k.value.toLocaleString('es-CO') : k.value}</p>
              <p className="text-[8px] text-gray-500 font-medium leading-tight mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
        {mod.chart && <div className="mt-3">{mod.chart}</div>}
        {h.factores?.length > 0 && <div className="space-y-1 mt-2">{h.factores.map((f: string, fi: number) => (
          <div key={fi} className="flex items-center gap-1.5 text-[9px] text-amber-600 bg-amber-50 px-2 py-1 rounded-lg"><AlertCircle className="w-3 h-3 flex-shrink-0" />{f}</div>
        ))}</div>}
        <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-[#003DA5] text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" /> Abrir</div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function DashboardExecutivo({ onNavigateToModule }: DashboardExecutivoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [stats, setStats] = useState<any>(null);
  const [viewTab, setViewTab] = useState<ViewTab>('estrategico');

  const nav = useCallback((sid: string) => { onNavigateToModule?.(sid); }, [onNavigateToModule]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const j = await dashboardService.getExecutiveStats();
      if (j?.success && j?.data) setStats(j.data);
      else setError(j?.error || 'Sin datos disponibles');
    } catch (e: any) {
      setError(e.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center py-32"><div className="text-center">
      <div className="relative"><div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-[#003DA5] animate-spin mx-auto" /><Gauge className="w-6 h-6 text-[#003DA5] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
      <p className="text-sm font-bold text-gray-800 mt-4">Procesando analítica institucional...</p>
    </div></div>
  );

  if (error || !stats) return (
    <div className="flex items-center justify-center py-32"><div className="text-center bg-white rounded-2xl border border-red-100 p-8 max-w-md shadow-xl">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-black text-gray-900 mb-2">Error de conexión</h2>
      <p className="text-sm text-gray-600 mb-6">{error}</p>
      <button onClick={load} className="px-6 py-3 bg-[#003DA5] text-white rounded-xl font-bold text-sm inline-flex items-center gap-2 hover:bg-[#002D7A] transition-colors"><RefreshCw className="w-4 h-4" /> Reintentar</button>
    </div></div>
  );

  const r = stats.resumen;
  const ef = stats.eficiencia;
  const comp = stats.comparativa30d;
  const hs = stats.saludGlobal;
  const alertas = stats.alertas || [];
  const timeline = stats.timelineData || [];
  const topTerr = (stats.distribucionTerritorial || []).slice(0,10);

  const vinData = toObj(stats.vinculacion || {});
  const dedData = toObj(stats.dedicacion || {});
  const formData = (stats.formacionAvanzada || []).map((f: any, i: number) => ({ name: f.nivel, value: f.total, fill: C[i%C.length] })).filter((f: any) => f.value > 0);
  const generoData = toObj(stats.personasGenero || {});
  const escalafonData = toObj(stats.escalafon || {});
  const ptasEstadoData = toObj(stats.ptasEstado || {});
  const certEstadoData = toObj(stats.certificadosEstado || {});
  const auditModuloData = toObj(stats.auditModulo || {});

  const terrChartData = topTerr.map((t: any) => ({
    name: t.nombre?.length > 14 ? t.nombre.slice(0,14)+'…' : t.nombre,
    'Con CETAP': t.conCetap || 0,
    'Sin CETAP': t.sinCetap || 0,
  }));

  const modules = [
    { key: 'personas', label: 'Personas', icon: Users, color: '#3B82F6', sid: 'users-persons', health: stats.saludModulos?.personas, idx: 0,
      kpis: [{ label:'Total', value: r.totalPersonas }, { label:'Usuarios Activos', value: r.totalUsuarios }, { label:'Tasa Actividad', value:`${(ef.tasaPersonasActivas||0).toFixed(0)}%` }],
      chart: generoData.length > 0 ? (<div><p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Género</p><MiniDonut data={generoData} size={80} inner={25} /></div>) : null,
    },
    { key: 'docentes', label: 'Banco de Docentes', icon: BookOpen, color: '#0EA5E9', sid: 'banco-docentes-pta', health: stats.saludModulos?.docentes, idx: 1,
      kpis: [{ label:'Docentes', value: r.totalDocentes }, { label:'Sin CETAP', value: r.docentesSinCetap, warn: true }, { label:'Cobertura', value:`${(ef.tasaCetapCobertura||0).toFixed(0)}%` }],
      chart: vinData.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <div><p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Vinculación</p><MiniDonut data={vinData} size={80} inner={25} /></div>
          {formData.length > 0 && <div><p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Formación</p><MiniDonut data={formData} size={80} inner={25} /></div>}
        </div>
      ) : null,
    },
    { key: 'estructura', label: 'Estructura Organizacional', icon: Building2, color: '#8B5CF6', sid: 'estructura-organizacional', health: stats.saludModulos?.estructura, idx: 2,
      kpis: [{ label:'Territoriales', value: r.totalTerritoriales }, { label:'CETAPs', value: r.totalCetaps }, { label:'Prom CETAPs/Terr.', value: (ef.promedioCetapsPorTerritorial||0).toFixed(1) }],
    },
    { key: 'carpeta', label: 'Carpeta Digital', icon: FolderOpen, color: '#F59E0B', sid: 'carpeta-digital', health: stats.saludModulos?.carpetaDigital, idx: 3,
      kpis: [{ label:'Carpetas', value: r.totalCarpetas }, { label:'Cobertura', value:`${(ef.tasaCarpetaCobertura||0).toFixed(0)}%` }],
    },
    { key: 'programas', label: 'Programas Académicos', icon: GraduationCap, color: '#10B981', sid: 'programas-academicos', health: stats.saludModulos?.programas, idx: 4,
      kpis: [{ label:'Programas', value: r.totalProgramas }, { label:'Asignaturas', value: r.totalAsignaturas }, { label:'Prom Asig/Prog', value: (ef.promedioAsignaturasPorPrograma||0).toFixed(1) }],
      chart: stats.programasDetalle?.length > 0 ? (
        <div className="space-y-1.5">{stats.programasDetalle.slice(0,3).map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
            <span className="text-[10px] font-medium text-gray-700 truncate flex-1">{p.nombre}</span>
            <div className="flex items-center gap-3 text-[9px]">
              <span className="text-gray-400">{p.nivel}</span>
              <span className="font-bold text-emerald-600">{p.asignaturas} asig.</span>
            </div>
          </div>
        ))}</div>
      ) : null,
    },
    { key: 'pta', label: 'Plan Trabajo Académico', icon: ClipboardList, color: '#F97316', sid: 'pta', health: { score: stats.ptaPipeline?.total > 0 ? 70 : 50, estado: stats.ptaPipeline?.total > 0 ? 'bueno' : 'alerta', factores: stats.ptaPipeline?.total === 0 ? ['Sin PTAs creados'] : [] }, idx: 5,
      kpis: [{ label:'PTAs', value: r.totalPTAs }, { label:'Aprobación', value:`${(ef.tasaPtaAprobacion||0).toFixed(0)}%` }],
      chart: stats.ptaPipeline?.total > 0 ? (
        <div><p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Pipeline PTA</p>
          <Pipeline total={stats.ptaPipeline.total} stages={[
            { label:'Borrador', value: stats.ptaPipeline.borrador, color:'#94A3B8' },
            { label:'En Revisión', value: stats.ptaPipeline.enRevision, color:'#F59E0B' },
            { label:'Aprobado', value: stats.ptaPipeline.aprobado, color:'#10B981' },
          ]} />
        </div>
      ) : null,
    },
    { key: 'roles', label: 'Roles y Permisos', icon: Shield, color: '#6366F1', sid: 'roles-permissions', health: stats.saludModulos?.roles, idx: 6,
      kpis: [{ label:'Roles', value: r.totalRoles }, { label:'Sistema', value: stats.saludModulos?.roles?.sistema||0 }, { label:'Custom', value: stats.saludModulos?.roles?.personalizados||0 }],
      chart: stats.rolesDetalle?.length > 0 ? (
        <div className="space-y-1">{stats.rolesDetalle.slice(0,4).map((rol: any, i: number) => (
          <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
            <span className="text-[9px] text-gray-700 truncate">{rol.nombre}</span>
            <div className="flex items-center gap-2">
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${rol.isSystem ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>{rol.isSystem ? 'Sys' : 'Cust'}</span>
              <span className="text-[9px] font-bold text-gray-800">{rol.usuarios}u</span>
            </div>
          </div>
        ))}</div>
      ) : null,
    },
    { key: 'cert', label: 'Certificados', icon: Award, color: '#EC4899', sid: 'certificate-requests', health: stats.saludModulos?.certificados || { score: r.totalCertificados > 0 ? 80 : 0, estado: r.totalCertificados > 0 ? 'bueno' : 'critico', factores: [] }, idx: 7,
      kpis: [{ label:'Total', value: r.totalCertificados }, { label:'Emisión', value:`${(ef.tasaCertEmision||0).toFixed(0)}%` }],
      chart: stats.certPipeline?.total > 0 ? (
        <Pipeline total={stats.certPipeline.total} stages={[
          { label:'Pendientes', value: stats.certPipeline.pendientes, color:'#F59E0B' },
          { label:'Emitidos', value: stats.certPipeline.emitidos, color:'#10B981' },
        ]} />
      ) : null,
    },
    { key: 'audit', label: 'Auditoría y Control', icon: Activity, color: '#14B8A6', sid: 'audit', health: { score: 100, estado: 'optimo', factores: [] }, idx: 8,
      kpis: [{ label:'Logs', value: r.totalAuditLogs }, { label:'Alertas', value: r.totalAlertas }],
      chart: auditModuloData.length > 0 ? (
        <div><p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Actividad por Módulo</p><MiniDonut data={auditModuloData.slice(0,6)} size={80} inner={25} /></div>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4 pb-8 px-4 sm:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#003DA5] to-[#2962FF] shadow-lg shadow-blue-500/30"><Gauge className="w-5 h-5 text-white" /></div>
              Centro de Comando
            </h1>
            <p className="text-[10px] text-gray-400 mt-0.5 ml-14">Analítica institucional en tiempo real • {new Date(stats.timestamp).toLocaleString('es-CO')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
              <Globe className="w-3.5 h-3.5" />Acceso Global
            </div>
            <button onClick={load} className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400 hover:text-[#003DA5] transition-colors" title="Actualizar"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100/80 rounded-xl w-fit">
          {([{ v: 'estrategico' as ViewTab, l: '📊 Estratégico', d: 'KPIs, tendencias, predicciones' }, { v: 'operacional' as ViewTab, l: '⚙️ Operacional', d: 'Detalle por módulo' }]).map(t => (
            <button key={t.v} onClick={() => setViewTab(t.v)} className={`flex flex-col items-start px-4 py-2 rounded-lg text-left transition-all ${viewTab === t.v ? 'bg-white text-[#003DA5] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
              <span className="text-sm font-bold">{t.l}</span>
              <span className="text-[9px] text-gray-400">{t.d}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ ESTRATÉGICO ═══════ */}
      {viewTab === 'estrategico' && (
        <div className="space-y-4">
          {/* Hero KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { l:'Personas', v: r.totalPersonas, i: Users, cs: CARD_STYLES[0], s:'users-persons' },
              { l:'Docentes', v: r.totalDocentes, i: BookOpen, cs: CARD_STYLES[1], s:'banco-docentes-pta' },
              { l:'Territoriales', v: r.totalTerritoriales, i: Building2, cs: CARD_STYLES[2], s:'estructura-organizacional' },
              { l:'CETAPs', v: r.totalCetaps, i: Target, cs: CARD_STYLES[3], s:'estructura-organizacional' },
              { l:'Programas', v: r.totalProgramas, i: GraduationCap, cs: CARD_STYLES[4], s:'programas-academicos' },
              { l:'Carpetas', v: r.totalCarpetas, i: FolderOpen, cs: CARD_STYLES[5], s:'carpeta-digital' },
              { l:'PTAs', v: r.totalPTAs, i: ClipboardList, cs: CARD_STYLES[6], s:'pta' },
              { l:'Audit Logs', v: r.totalAuditLogs, i: Activity, cs: CARD_STYLES[7], s:'audit' },
            ].map((k,idx) => (
              <motion.div key={k.l} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay: idx*0.04 }}
                onClick={() => nav(k.s)}
                className="rounded-xl p-3 cursor-pointer group hover:scale-[1.03] transition-all relative overflow-hidden"
                style={{ background: k.cs.bg, boxShadow: `0 4px 14px ${k.cs.shadow}` }}>
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-10 h-10 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <k.i className="w-4 h-4 text-white/50 mb-1.5" strokeWidth={1.5} />
                <p className="text-2xl font-black text-white leading-none tracking-tight"><AN value={k.v} /></p>
                <p className="text-[9px] text-white/50 font-medium mt-1">{k.l}</p>
              </motion.div>
            ))}
          </div>

          {/* Salud + Alertas + Tendencia */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3">
              <Section title="Salud Institucional" icon={Activity} color="#003DA5">
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28">
                    <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
                      <circle cx="56" cy="56" r="48" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                      <motion.circle cx="56" cy="56" r="48" fill="none" stroke={sc(hs.score)} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*48}`} initial={{ strokeDashoffset: 2*Math.PI*48 }}
                        animate={{ strokeDashoffset: 2*Math.PI*48*(1-hs.score/100) }} transition={{ duration: 1.2 }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black" style={{ color: sc(hs.score) }}><AN value={hs.score} /></span>
                      <span className="text-[9px] text-gray-400">de 100</span>
                    </div>
                  </div>
                  <span className={`mt-2 px-3 py-1 rounded-full text-[10px] font-bold ${sl(hs.estado).b} ${sl(hs.estado).t}`}>{sl(hs.estado).l}</span>
                  <div className="mt-4 w-full grid grid-cols-2 gap-2">
                    {Object.entries(stats.saludModulos || {}).map(([k, m]: [string, any]) => {
                      const nameMap: Record<string,string> = { personas:'Personas', docentes:'Docentes', estructura:'Estructura', carpetaDigital:'Carpeta Dig.', programas:'Programas', roles:'Roles', certificados:'Certificados' };
                      const score = m.score || 0;
                      return (
                        <div key={k} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sc(score) }} />
                          <span className="text-[10px] text-gray-600 flex-1 truncate">{nameMap[k] || k}</span>
                          <span className="text-[10px] font-bold" style={{ color: sc(score) }}>{score}</span>
                        </div>
                      );
                    })}
                  </div>
                  {hs.factores?.length > 0 && (
                    <div className="mt-3 w-full space-y-1">
                      {hs.factores.map((f: string, i: number) => (
                        <div key={i} className="text-[9px] text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" />{f}</div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </div>

            <div className="lg:col-span-5">
              <Section title={`Centro de Alertas (${alertas.length})`} icon={Zap} color="#F59E0B">
                {alertas.length === 0 ? (
                  <div className="flex flex-col items-center py-6"><Target className="w-10 h-10 text-emerald-400 mb-2" /><p className="text-sm font-bold text-gray-700">Todo en orden</p></div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {alertas.map((a: any, i: number) => { const s = sv(a.severidad); const isCrit = a.severidad === 'critico'; return (
                      <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.08 }}
                        className={`${s.bg} rounded-xl p-3 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden`}
                        style={{ borderLeft: `3px solid ${isCrit ? '#EF4444' : a.severidad === 'medio' ? '#F59E0B' : '#3B82F6'}` }}
                        onClick={() => a.accion && nav(a.accion)}>
                        <div className="flex items-start gap-2.5">
                          {isCrit ? <AlertOctagon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[11px] font-bold ${s.t}`}>{a.modulo}</span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${isCrit ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{a.severidad}</span>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{a.descripcion}</p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[9px] text-gray-400 font-medium">Afectados: {a.cantidad.toLocaleString('es-CO')}</span>
                              <span className="text-[9px] font-bold text-[#003DA5] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">Ir <ArrowRight className="w-2.5 h-2.5" /></span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ); })}
                  </div>
                )}
              </Section>
            </div>

            <div className="lg:col-span-4">
              <Section title="Tendencia 30 Días" icon={TrendingUp} color="#10B981">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-3xl font-black text-gray-900"><AN value={comp.personasNuevas.actual} /></p>
                    <p className="text-[10px] text-gray-400">Nuevos registros</p>
                  </div>
                  <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${comp.personasNuevas.delta > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {comp.personasNuevas.delta > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {comp.personasNuevas.delta > 0 ? '+':''}{comp.personasNuevas.delta.toFixed(1)}%
                  </div>
                </div>
                <p className="text-[9px] text-gray-400 mb-2">vs {comp.personasNuevas.anterior} período anterior</p>
                {timeline.length > 0 && (
                  <div className="h-[120px]">
                    <ResponsiveContainer><AreaChart data={timeline}>
                      <defs>
                        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25}/>
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" tick={{ fontSize:8, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CTip />} />
                      <Area type="monotone" dataKey="Personas" stroke="#3B82F6" strokeWidth={2.5} fill="url(#sg)" dot={false} activeDot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} />
                    </AreaChart></ResponsiveContainer>
                  </div>
                )}
                <div className="mt-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2.5 border border-blue-100">
                  <div className="flex items-center gap-1.5 mb-0.5"><Eye className="w-3 h-3 text-[#003DA5]" /><span className="text-[9px] font-bold text-[#003DA5] uppercase">Proyección</span></div>
                  <p className="text-[10px] text-gray-600">{comp.personasNuevas.delta > 0 ? `Crecimiento proyectado: ~${Math.round(r.totalPersonas*1.1)} personas en 30d.` : 'Crecimiento estable. Base: '+r.totalPersonas+' personas.'}</p>
                </div>
              </Section>
            </div>
          </div>

          {/* Territorial */}
          {terrChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7">
                <Section title="Cobertura por Territorial (Docentes vs CETAPs)" icon={BarChart3} color="#8B5CF6" action="Ver todo" onAction={() => nav('estructura-organizacional')}>
                  <div className="h-[260px]">
                    <ResponsiveContainer><BarChart data={terrChartData} layout="vertical" margin={{ left:5, right:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={95} tick={{ fontSize:9, fill:'#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CTip />} /><Legend wrapperStyle={{ fontSize:10 }} />
                      <Bar dataKey="Con CETAP" stackId="a" fill="#10B981" radius={[0,0,0,0]} barSize={12} />
                      <Bar dataKey="Sin CETAP" stackId="a" fill="#EF4444" radius={[0,4,4,0]} barSize={12} />
                    </BarChart></ResponsiveContainer>
                  </div>
                </Section>
              </div>
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <Section title="Vinculación" icon={Users} color="#3B82F6">
                  <MiniDonut data={vinData} size={100} inner={30} />
                </Section>
                <Section title="Dedicación" icon={Target} color="#10B981">
                  {dedData.length > 0 ? <MiniDonut data={dedData} size={100} inner={30} /> : <div className="text-center text-gray-400 text-xs py-8">Sin datos</div>}
                </Section>
              </div>
            </div>
          )}

          {/* Timeline multi-entidad */}
          {timeline.length > 0 && (
            <Section title="Evolución Histórica Multi-Entidad" icon={Activity} color="#6366F1">
              <div className="h-[200px]">
                <ResponsiveContainer><ComposedChart data={timeline}>
                  <defs>
                    <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:9, fill:'#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<CTip />} /><Legend wrapperStyle={{ fontSize:10 }} />
                  <Area type="monotone" dataKey="Personas" stroke="#3B82F6" fill="url(#ag1)" strokeWidth={2} dot={{ r:3, fill:'#3B82F6' }} />
                  <Line type="monotone" dataKey="PTAs" stroke="#F97316" strokeWidth={2} dot={{ r:2 }} />
                </ComposedChart></ResponsiveContainer>
              </div>
            </Section>
          )}

          {/* Formación + Escalafón */}
          {(formData.length > 0 || escalafonData.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.length > 0 && <Section title="Formación Máxima" icon={GraduationCap} color="#8B5CF6"><MiniDonut data={formData} size={100} inner={30} /></Section>}
              {escalafonData.length > 0 && <Section title="Escalafón" icon={Award} color="#EC4899"><MiniDonut data={escalafonData} size={100} inner={30} /></Section>}
            </div>
          )}
        </div>
      )}

      {/* ═══════ OPERACIONAL ═══════ */}
      {viewTab === 'operacional' && (
        <div className="space-y-4">
          <p className="text-[10px] text-gray-500">Vista detallada por módulo con analítica profunda. Click en cualquier tarjeta para navegar.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {modules.map(mod => <ModuleCard key={mod.key} mod={mod} onClick={() => nav(mod.sid)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
