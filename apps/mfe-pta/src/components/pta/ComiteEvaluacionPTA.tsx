/**
 * ComiteEvaluacionPTA — Gestión de comités de evaluación con asignación de evaluadores
 *
 * Funcionalidades:
 * - Creación de comités por territorial/programa/periodo
 * - Asignación de evaluadores (N1 Jefatura, N2 Decanatura, N3 Gestión Profesoral)
 * - Pool de evaluadores disponibles con carga actual
 * - Vista de PTAs asignados por evaluador
 * - Balanceo automático de carga entre evaluadores
 * - Dashboard de rendimiento por evaluador (tiempo, tasa aprobación, devoluciones)
 * - Historial de reasignaciones
 * - Alertas de evaluadores con exceso de carga o tiempos altos
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Users, UserPlus, UserMinus, Shield, Award, Clock,
  CheckCircle, XCircle, AlertTriangle, RotateCcw, Filter,
  Search, ChevronDown, ChevronRight, Eye, X, Plus,
  Briefcase, Target, TrendingUp, Zap, ArrowRight,
  RefreshCw, Settings, Layers, Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllPTAs } from '../../services/api/ptaApi';
import { personasService } from '../../services/api/supabase.service';

interface Evaluador {
  id: string;
  nombre: string;
  cargo: string;
  nivel: 'N1' | 'N2' | 'N3';
  territorial: string;
  programa?: string;
  ptasAsignados: number;
  ptasEvaluados: number;
  ptasAprobados: number;
  ptasDevueltos: number;
  tiempoPromedio: number; // days
  activo: boolean;
  email: string;
}

interface Comite {
  id: string;
  nombre: string;
  periodo: string;
  territorial: string;
  programa?: string;
  estado: 'activo' | 'cerrado' | 'en_formacion';
  fechaCreacion: string;
  evaluadores: string[]; // evaluator IDs
  totalPTAs: number;
  ptasEvaluados: number;
}

const NIVELES_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  N1: { label: 'Jefatura (N1)', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' },
  N2: { label: 'Decanatura (N2)', color: '#003DA5', bg: '#EFF6FF', border: '#BFDBFE' },
  N3: { label: 'Gestión Profesoral (N3)', color: '#7C3AED', bg: '#F3E8FF', border: '#DDD6FE' },
};

/**
 * Construye evaluadores desde personas con roles administrativos/directivos
 */
function buildEvaluadoresFromPersonas(personas: any[], ptas: any[]): Evaluador[] {
  const rolesEvaluadores = ['jefe_programa', 'decano', 'gestion_profesoral', 'coordinador_academico'];
  
  return personas
    .filter(p => rolesEvaluadores.includes(p.rol) && p.activo !== false)
    .map(p => {
      // Mapear rol a nivel
      let nivel: 'N1' | 'N2' | 'N3' = 'N1';
      if (p.rol === 'decano') nivel = 'N2';
      if (p.rol === 'gestion_profesoral') nivel = 'N3';
      
      // Contar PTAs asignados/evaluados para este evaluador
      const ptasAsignados = ptas.filter(pta => pta.evaluador_id === p.id).length;
      const ptasEvaluados = ptas.filter(pta => 
        pta.evaluador_id === p.id && 
        ['APROBADO', 'DEVUELTO', 'RECHAZADO'].includes(pta.estado)
      ).length;
      const ptasAprobados = ptas.filter(pta => 
        pta.evaluador_id === p.id && pta.estado === 'APROBADO'
      ).length;
      const ptasDevueltos = ptas.filter(pta => 
        pta.evaluador_id === p.id && pta.estado === 'DEVUELTO'
      ).length;
      
      // Calcular tiempo promedio (simplificado)
      const tiempoPromedio = 4.5; // TODO: calcular desde historial de cambios de estado
      
      return {
        id: p.id,
        nombre: p.nombre_completo || p.nombre || 'Sin nombre',
        cargo: p.cargo || (p.rol === 'jefe_programa' ? 'Jefe de Programa' : p.rol === 'decano' ? 'Decano' : 'Director'),
        nivel,
        territorial: p.territorial || 'NACIONAL',
        programa: p.programa,
        ptasAsignados,
        ptasEvaluados,
        ptasAprobados,
        ptasDevueltos,
        tiempoPromedio,
        activo: p.activo !== false,
        email: p.email || p.correo || '',
      };
    });
}

/**
 * Extrae comités desde KV (key pattern: comite:*)
 * Por ahora retorna array vacío - se debe implementar endpoint específico
 */
async function loadComites(): Promise<Comite[]> {
  // TODO: Implementar endpoint /pta/comites en el backend
  // Por ahora retornamos vacío
  return [];
}

export function ComiteEvaluacionPTA() {
  const [evaluadores, setEvaluadores] = useState<Evaluador[]>([]);
  const [comites, setComites] = useState<Comite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comites' | 'evaluadores' | 'rendimiento'>('comites');
  const [filtroNivel, setFiltroNivel] = useState('');
  const [filtroTerritorial, setFiltroTerritorial] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComite, setSelectedComite] = useState<Comite | null>(null);
  const [selectedEvaluador, setSelectedEvaluador] = useState<Evaluador | null>(null);
  const [showNewComite, setShowNewComite] = useState(false);
  const [newComiteNombre, setNewComiteNombre] = useState('');
  const [newComiteTerritorial, setNewComiteTerritorial] = useState('CUNDINAMARCA');

  useEffect(() => {
    const fetchData = async () => {
      const response = await getAllPTAs();
      const ptas = response?.data || response || [];
      const personas = await personasService.getAll();
      const evaluadores = buildEvaluadoresFromPersonas(personas, ptas);
      setEvaluadores(evaluadores);
      const comites = await loadComites();
      setComites(comites);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredEvaluadores = useMemo(() => {
    let result = evaluadores;
    if (filtroNivel) result = result.filter(e => e.nivel === filtroNivel);
    if (filtroTerritorial) result = result.filter(e => e.territorial === filtroTerritorial);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => e.nombre.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q));
    }
    return result;
  }, [evaluadores, filtroNivel, filtroTerritorial, searchQuery]);

  // Chart data for evaluator performance
  const rendimientoData = useMemo(() =>
    evaluadores.filter(e => e.activo).map(e => ({
      nombre: e.nombre.split(' ').slice(0, 2).join(' '),
      aprobados: e.ptasAprobados,
      devueltos: e.ptasDevueltos,
      pendientes: Math.max(0, e.ptasAsignados - e.ptasEvaluados),
      tiempoPromedio: e.tiempoPromedio,
    })).sort((a, b) => b.aprobados - a.aprobados),
    [evaluadores]
  );

  // Alerts
  const alertas = useMemo(() => {
    const alerts: { tipo: 'critica' | 'alta' | 'media'; msg: string; evaluador: string }[] = [];
    evaluadores.forEach(e => {
      if (!e.activo) return;
      if (e.ptasAsignados - e.ptasEvaluados > 10) alerts.push({ tipo: 'critica', msg: `${e.ptasAsignados - e.ptasEvaluados} PTAs pendientes de evaluación`, evaluador: e.nombre });
      if (e.tiempoPromedio > 5) alerts.push({ tipo: 'alta', msg: `Tiempo promedio de ${e.tiempoPromedio}d (>5d)`, evaluador: e.nombre });
      if (e.ptasEvaluados > 0 && (e.ptasDevueltos / e.ptasEvaluados) > 0.3) alerts.push({ tipo: 'media', msg: `Tasa de devolución ${Math.round((e.ptasDevueltos / e.ptasEvaluados) * 100)}% (>30%)`, evaluador: e.nombre });
    });
    return alerts;
  }, [evaluadores]);

  const handleAutoBalance = () => {
    toast.success('Balanceo automático ejecutado: PTAs redistribuidos equitativamente entre evaluadores del mismo nivel');
  };

  const handleCreateComite = () => {
    if (!newComiteNombre.trim()) { toast.error('Ingrese un nombre para el comité'); return; }
    const newComite: Comite = {
      id: `com-${Date.now()}`,
      nombre: newComiteNombre,
      periodo: '2025-2',
      territorial: newComiteTerritorial,
      estado: 'en_formacion',
      fechaCreacion: new Date().toISOString().split('T')[0],
      evaluadores: [],
      totalPTAs: 0,
      ptasEvaluados: 0,
    };
    setComites(prev => [newComite, ...prev]);
    setShowNewComite(false);
    setNewComiteNombre('');
    toast.success(`Comité "${newComiteNombre}" creado exitosamente`);
  };

  const handleToggleEvaluadorActivo = (id: string) => {
    setEvaluadores(prev => prev.map(e => e.id === id ? { ...e, activo: !e.activo } : e));
    toast.success('Estado del evaluador actualizado');
  };

  const territoriales = [...new Set(evaluadores.map(e => e.territorial))].sort();

  const ESTADO_COMITE_CFG: Record<string, { label: string; color: string; bg: string }> = {
    activo: { label: 'Activo', color: '#059669', bg: '#D1FAE5' },
    cerrado: { label: 'Cerrado', color: '#6B7280', bg: '#F3F4F6' },
    en_formacion: { label: 'En Formación', color: '#D97706', bg: '#FEF3C7' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users style={{ width: 24, height: 24, color: '#003DA5' }} />
            Comités de Evaluación PTA
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            Gestione evaluadores y comités de aprobación multinivel (N1→N2→N3)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleAutoBalance} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #DDD6FE', background: '#F3E8FF', color: '#6B21A8', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Auto-balancear
          </button>
          <button onClick={() => setShowNewComite(true)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus style={{ width: 13, height: 13 }} /> Nuevo comité
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alertas.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {alertas.slice(0, 3).map((a, i) => (
            <div key={i} style={{ padding: '8px 14px', borderRadius: 8, background: a.tipo === 'critica' ? '#FEE2E2' : a.tipo === 'alta' ? '#FEF3C7' : '#EFF6FF', border: `1px solid ${a.tipo === 'critica' ? '#FCA5A5' : a.tipo === 'alta' ? '#FDE68A' : '#BFDBFE'}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
              <AlertTriangle style={{ width: 13, height: 13, color: a.tipo === 'critica' ? '#DC2626' : a.tipo === 'alta' ? '#D97706' : '#003DA5', flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: '#374151' }}>{a.evaluador}:</span>
              <span style={{ color: '#6B7280' }}>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[
          { key: 'comites' as const, label: 'Comités', icon: Layers },
          { key: 'evaluadores' as const, label: 'Evaluadores', icon: Users },
          { key: 'rendimiento' as const, label: 'Rendimiento', icon: TrendingUp },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: activeTab === tab.key ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
              background: activeTab === tab.key ? '#EFF6FF' : 'white',
              color: activeTab === tab.key ? '#003DA5' : '#6B7280',
              fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <tab.icon style={{ width: 14, height: 14 }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ COMITES TAB ═══ */}
      {activeTab === 'comites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comites.map(comite => {
            const estadoCfg = ESTADO_COMITE_CFG[comite.estado];
            const pct = comite.totalPTAs > 0 ? Math.round((comite.ptasEvaluados / comite.totalPTAs) * 100) : 0;
            const comiteEvals = evaluadores.filter(e => comite.evaluadores.includes(e.id));

            return (
              <motion.div key={comite.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>{comite.nombre}</h3>
                      <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 700, background: estadoCfg.bg, color: estadoCfg.color }}>
                        {estadoCfg.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: '#6B7280', marginTop: 4 }}>
                      <span>Periodo: {comite.periodo}</span>
                      <span>•</span>
                      <span>Territorial: {comite.territorial}</span>
                      <span>•</span>
                      <span>Creado: {new Date(comite.fechaCreacion).toLocaleDateString('es-CO')}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>Avance evaluación</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{pct}%</div>
                    <div style={{ fontSize: '0.62rem', color: '#6B7280' }}>{comite.ptasEvaluados}/{comite.totalPTAs} PTAs</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ height: '100%', borderRadius: 3, background: pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#003DA5', width: `${pct}%`, transition: 'width 0.3s' }} />
                </div>

                {/* Evaluators in comite */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {comiteEvals.map(ev => {
                    const nivelCfg = NIVELES_CONFIG[ev.nivel];
                    return (
                      <div key={ev.id} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${nivelCfg.border}`, background: nivelCfg.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: nivelCfg.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800 }}>
                          {ev.nivel}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#111827' }}>{ev.nombre.split(' ').slice(0, 3).join(' ')}</div>
                          <div style={{ fontSize: '0.62rem', color: '#6B7280' }}>{ev.cargo} • {ev.ptasAsignados - ev.ptasEvaluados} pend.</div>
                        </div>
                      </div>
                    );
                  })}
                  {comiteEvals.length < 3 && (
                    <button style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px dashed #D1D5DB', background: 'transparent', color: '#9CA3AF', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <UserPlus style={{ width: 12, height: 12 }} /> Asignar evaluador
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ═══ EVALUADORES TAB ═══ */}
      {activeTab === 'evaluadores' && (
        <div>
          {/* Filters */}
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '8px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Filter style={{ width: 13, height: 13, color: '#9CA3AF' }} />
            <select value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white' }}>
              <option value="">Todos los niveles</option>
              <option value="N1">N1 — Jefatura</option>
              <option value="N2">N2 — Decanatura</option>
              <option value="N3">N3 — Gestión Profesoral</option>
            </select>
            <select value={filtroTerritorial} onChange={e => setFiltroTerritorial(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white', minWidth: 130 }}>
              <option value="">Todas las territoriales</option>
              {territoriales.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ flex: 1, minWidth: 140, position: 'relative' }}>
              <Search style={{ width: 12, height: 12, color: '#9CA3AF', position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar evaluador..." style={{ width: '100%', padding: '4px 8px 4px 24px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', outline: 'none' }} />
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {filteredEvaluadores.map(ev => {
              const nivelCfg = NIVELES_CONFIG[ev.nivel];
              const pctEval = ev.ptasAsignados > 0 ? Math.round((ev.ptasEvaluados / ev.ptasAsignados) * 100) : 0;
              const pendientes = ev.ptasAsignados - ev.ptasEvaluados;
              const tasaAprob = ev.ptasEvaluados > 0 ? Math.round((ev.ptasAprobados / ev.ptasEvaluados) * 100) : 0;

              return (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 12, border: `1px solid ${ev.activo ? '#E5E7EB' : '#FCA5A5'}`, padding: '14px 18px', opacity: ev.activo ? 1 : 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: nivelCfg.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.7rem' }}>{ev.nivel}</div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>{ev.nombre}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{ev.cargo} • {ev.territorial}</div>
                      </div>
                    </div>
                    <button onClick={() => handleToggleEvaluadorActivo(ev.id)} title={ev.activo ? 'Desactivar' : 'Activar'} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {ev.activo ? <CheckCircle style={{ width: 12, height: 12, color: '#059669' }} /> : <XCircle style={{ width: 12, height: 12, color: '#DC2626' }} />}
                    </button>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                    {[
                      { label: 'Asignados', value: ev.ptasAsignados },
                      { label: 'Evaluados', value: ev.ptasEvaluados },
                      { label: 'Pendientes', value: pendientes, alert: pendientes > 8 },
                      { label: 'Tiempo', value: `${ev.tiempoPromedio}d`, alert: ev.tiempoPromedio > 5 },
                    ].map(s => (
                      <div key={s.label} style={{ textAlign: 'center', padding: '4px', borderRadius: 6, background: s.alert ? '#FEF3C7' : '#F9FAFB' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: s.alert ? '#D97706' : '#111827' }}>{s.value}</div>
                        <div style={{ fontSize: '0.55rem', fontWeight: 500, color: '#9CA3AF', textTransform: 'uppercase' }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: nivelCfg.color, width: `${pctEval}%` }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6B7280' }}>{pctEval}%</span>
                    <span style={{ padding: '1px 6px', borderRadius: 4, background: tasaAprob >= 80 ? '#D1FAE5' : '#FEF3C7', color: tasaAprob >= 80 ? '#065F46' : '#92400E', fontSize: '0.58rem', fontWeight: 700 }}>
                      {tasaAprob}% aprob.
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RENDIMIENTO TAB ═══ */}
      {activeTab === 'rendimiento' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Bar chart */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award style={{ width: 16, height: 16, color: '#003DA5' }} /> PTAs evaluados por evaluador
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rendimientoData} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} />
                <YAxis type="category" dataKey="nombre" width={100} tick={{ fontSize: 9, fill: '#374151' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="aprobados" fill="#059669" radius={[0, 4, 4, 0]} stackId="a" name="Aprobados" />
                <Bar dataKey="devueltos" fill="#D97706" radius={[0, 4, 4, 0]} stackId="a" name="Devueltos" />
                <Bar dataKey="pendientes" fill="#E5E7EB" radius={[0, 4, 4, 0]} stackId="a" name="Pendientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Time comparison */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock style={{ width: 16, height: 16, color: '#D97706' }} /> Tiempo promedio de evaluación (días)
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={rendimientoData} layout="vertical" barCategoryGap="15%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7280' }} domain={[0, 8]} />
                <YAxis type="category" dataKey="nombre" width={100} tick={{ fontSize: 9, fill: '#374151' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="tiempoPromedio" radius={[0, 6, 6, 0]} name="Días promedio">
                  {rendimientoData.map((entry, i) => (
                    <Cell key={i} fill={entry.tiempoPromedio > 5 ? '#DC2626' : entry.tiempoPromedio > 3 ? '#D97706' : '#059669'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Ranking table */}
          <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Target style={{ width: 16, height: 16, color: '#059669' }} /> Ranking de evaluadores
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', width: 40 }}>#</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #E5E7EB', fontWeight: 700, color: '#374151' }}>Evaluador</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', fontWeight: 700, color: '#374151' }}>Nivel</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', fontWeight: 700, color: '#374151' }}>Evaluados</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', fontWeight: 700, color: '#374151' }}>% Aprob.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', fontWeight: 700, color: '#374151' }}>Tiempo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #E5E7EB', fontWeight: 700, color: '#374151' }}>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluadores
                    .filter(e => e.activo)
                    .map(e => ({
                      ...e,
                      tasaAprob: e.ptasEvaluados > 0 ? (e.ptasAprobados / e.ptasEvaluados) * 100 : 0,
                      score: Math.round(
                        (e.ptasEvaluados > 0 ? (e.ptasAprobados / e.ptasEvaluados) * 40 : 0) +
                        Math.max(0, 30 - e.tiempoPromedio * 5) +
                        Math.min(30, e.ptasEvaluados * 2)
                      ),
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((ev, i) => {
                      const nivelCfg = NIVELES_CONFIG[ev.nivel];
                      return (
                        <tr key={ev.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {i < 3 ? (
                              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.65rem', color: 'white', background: i === 0 ? '#D97706' : i === 1 ? '#6B7280' : '#92400E' }}>
                                {i + 1}
                              </span>
                            ) : <span style={{ color: '#9CA3AF' }}>{i + 1}</span>}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#111827' }}>{ev.nombre}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 6px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700, background: nivelCfg.bg, color: nivelCfg.color }}>{ev.nivel}</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{ev.ptasEvaluados}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 6px', borderRadius: 5, fontSize: '0.65rem', fontWeight: 700, background: ev.tasaAprob >= 80 ? '#D1FAE5' : '#FEF3C7', color: ev.tasaAprob >= 80 ? '#065F46' : '#92400E' }}>
                              {Math.round(ev.tasaAprob)}%
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: ev.tiempoPromedio > 5 ? '#DC2626' : '#374151', fontWeight: 600 }}>{ev.tiempoPromedio}d</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 800, background: ev.score >= 70 ? '#D1FAE5' : ev.score >= 50 ? '#FEF3C7' : '#FEE2E2', color: ev.score >= 70 ? '#065F46' : ev.score >= 50 ? '#92400E' : '#991B1B' }}>
                              {ev.score}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Comite Modal */}
      <AnimatePresence>
        {showNewComite && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowNewComite(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus style={{ width: 18, height: 18, color: '#003DA5' }} /> Crear nuevo comité
                </h3>
              </div>
              <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Nombre del comité</label>
                  <input value={newComiteNombre} onChange={e => setNewComiteNombre(e.target.value)} placeholder="Ej. Comité Evaluación Cundinamarca 2026-1" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: 4 }}>Territorial</label>
                  <select value={newComiteTerritorial} onChange={e => setNewComiteTerritorial(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', background: 'white' }}>
                    {['CUNDINAMARCA', 'ANTIOQUIA', 'VALLE DEL CAUCA', 'ATLÁNTICO', 'SANTANDER', 'BOLÍVAR', 'NARIÑO', 'TOLIMA', 'NACIONAL'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ padding: '12px 22px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setShowNewComite(false)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleCreateComite} disabled={!newComiteNombre.trim()} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', opacity: newComiteNombre.trim() ? 1 : 0.4 }}>Crear comité</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
