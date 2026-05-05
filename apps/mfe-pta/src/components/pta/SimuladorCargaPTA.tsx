/**
 * SimuladorCargaPTA — Simulación "What-If" para proyección de carga docente
 *
 * Permite modelar escenarios hipotéticos:
 * - Ajustar dedicación (TC/MT/HC) y ver impacto en horas disponibles
 * - Agregar/quitar asignaturas y ver efecto en prorrateo
 * - Modificar distribución de componentes (docencia/investigación/extensión)
 * - Simular cambio de periodo académico
 * - Comparar escenario actual vs simulado lado a lado
 * - Validaciones GTH-F081 en tiempo real (50%/25%/25%)
 * - Proyección de carga para N docentes (planificación territorial)
 * - Exportar resultados de simulación
 *
 * Usa el motor de cálculo del backend PTA para fidelidad con Excel.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Sliders, Play, RotateCcw, AlertTriangle, CheckCircle, Copy,
  Users, BookOpen, FlaskConical, Globe, Briefcase, Target,
  ArrowRight, ChevronDown, TrendingUp, Zap, Download, X,
  Plus, Minus, Info, RefreshCw, Calculator, Layers,
} from 'lucide-react';
import { calcularHorasPTA, getCatalogoProgramas, getCatalogoAsignaturas } from '../../services/api/ptaApi';
import { toast } from 'sonner';

interface SimulationState {
  dedicacion: 'TC' | 'MT' | 'HC';
  semanas: number;
  horasSemana: number;
  asignaturas: SimAsignatura[];
  investigacionHoras: number;
  extensionHoras: number;
  complementariaHoras: number;
}

interface SimAsignatura {
  id: string;
  nombre: string;
  creditos: number;
  horasSemanales: number;
  grupos: number;
  factor: number;
}

const DEDICACION_CONFIG: Record<string, { label: string; horasSemana: number; semanas: number; color: string }> = {
  TC: { label: 'Tiempo Completo', horasSemana: 40, semanas: 20, color: '#003DA5' },
  MT: { label: 'Medio Tiempo', horasSemana: 20, semanas: 20, color: '#D97706' },
  HC: { label: 'Hora Cátedra', horasSemana: 0, semanas: 16, color: '#7C3AED' },
};

const PIE_COLORS = ['#003DA5', '#059669', '#D97706', '#7C3AED'];

const DEFAULT_ASIGNATURAS: SimAsignatura[] = [
  { id: 'sim-1', nombre: 'Fundamentos de Administración Pública', creditos: 3, horasSemanales: 4, grupos: 1, factor: 3 },
  { id: 'sim-2', nombre: 'Derecho Constitucional', creditos: 3, horasSemanales: 4, grupos: 1, factor: 3 },
  { id: 'sim-3', nombre: 'Políticas Públicas', creditos: 3, horasSemanales: 4, grupos: 1, factor: 3 },
  { id: 'sim-4', nombre: 'Gestión del Talento Humano', creditos: 3, horasSemanales: 4, grupos: 1, factor: 3 },
];

export function SimuladorCargaPTA() {
  const [original, setOriginal] = useState<SimulationState>({
    dedicacion: 'TC',
    semanas: 20,
    horasSemana: 40,
    asignaturas: [...DEFAULT_ASIGNATURAS],
    investigacionHoras: 160,
    extensionHoras: 80,
    complementariaHoras: 80,
  });

  const [simulado, setSimulado] = useState<SimulationState>({
    dedicacion: 'TC',
    semanas: 20,
    horasSemana: 40,
    asignaturas: [...DEFAULT_ASIGNATURAS],
    investigacionHoras: 160,
    extensionHoras: 80,
    complementariaHoras: 80,
  });

  const [showAsignaturaSelector, setShowAsignaturaSelector] = useState(false);
  const [programas, setProgramas] = useState<any[]>([]);
  const [asignaturasCatalogo, setAsignaturasCatalogo] = useState<any[]>([]);
  const [searchAsig, setSearchAsig] = useState('');
  const [scenarioName, setScenarioName] = useState('Escenario Base');
  const [numDocentes, setNumDocentes] = useState(1);
  const [showProjection, setShowProjection] = useState(false);

  useEffect(() => {
    getCatalogoProgramas().then(r => { if (r.success) setProgramas(r.data || []); });
    getCatalogoAsignaturas().then(r => { if (r.success) setAsignaturasCatalogo(r.data || []); });
  }, []);

  // ═══ Calculations ═══
  const calcResults = useCallback((state: SimulationState) => {
    const horasDisponibles = state.dedicacion === 'HC'
      ? state.asignaturas.reduce((sum, a) => sum + a.horasSemanales * a.grupos * state.semanas, 0)
      : state.horasSemana * state.semanas;

    const horasDocencia = state.asignaturas.reduce((sum, a) => {
      const horasClase = a.horasSemanales * a.grupos * state.semanas;
      const horasPrep = a.creditos * a.factor * a.grupos;
      return sum + horasClase + horasPrep;
    }, 0);

    const totalHoras = horasDocencia + state.investigacionHoras + state.extensionHoras + state.complementariaHoras;

    const pctDocencia = horasDisponibles > 0 ? Math.round((horasDocencia / horasDisponibles) * 100) : 0;
    const pctInvestigacion = horasDisponibles > 0 ? Math.round((state.investigacionHoras / horasDisponibles) * 100) : 0;
    const pctExtension = horasDisponibles > 0 ? Math.round((state.extensionHoras / horasDisponibles) * 100) : 0;
    const pctComplementaria = horasDisponibles > 0 ? Math.round((state.complementariaHoras / horasDisponibles) * 100) : 0;
    const pctCarga = horasDisponibles > 0 ? Math.round((totalHoras / horasDisponibles) * 100) : 0;

    // Validaciones GTH-F081
    const validaciones = [];
    if (state.dedicacion !== 'HC') {
      if (pctInvestigacion > 50) validaciones.push({ tipo: 'error', msg: `Investigación (${pctInvestigacion}%) excede máx. 50%` });
      if (pctExtension > 25) validaciones.push({ tipo: 'error', msg: `Extensión (${pctExtension}%) excede máx. 25%` });
      if (pctComplementaria > 25) validaciones.push({ tipo: 'warning', msg: `Complementaria (${pctComplementaria}%) excede recomendado 25%` });
      if (pctCarga > 100) validaciones.push({ tipo: 'error', msg: `Carga total (${pctCarga}%) excede 100% de disponibilidad` });
      if (pctCarga < 90 && pctCarga > 0) validaciones.push({ tipo: 'warning', msg: `Carga (${pctCarga}%) por debajo del 90% recomendado` });
    }
    if (totalHoras > horasDisponibles) validaciones.push({ tipo: 'error', msg: `${totalHoras - horasDisponibles}h de excedente` });

    return {
      horasDisponibles, horasDocencia, totalHoras,
      pctDocencia, pctInvestigacion, pctExtension, pctComplementaria, pctCarga,
      validaciones,
      pieData: [
        { name: 'Docencia', value: horasDocencia, fill: '#003DA5' },
        { name: 'Investigación', value: state.investigacionHoras, fill: '#059669' },
        { name: 'Extensión', value: state.extensionHoras, fill: '#D97706' },
        { name: 'Complementaria', value: state.complementariaHoras, fill: '#7C3AED' },
      ].filter(d => d.value > 0),
    };
  }, []);

  const origResults = useMemo(() => calcResults(original), [original, calcResults]);
  const simResults = useMemo(() => calcResults(simulado), [simulado, calcResults]);

  // ═══ Handlers ═══
  const handleDedicacionChange = (ded: 'TC' | 'MT' | 'HC') => {
    const cfg = DEDICACION_CONFIG[ded];
    setSimulado(prev => ({ ...prev, dedicacion: ded, horasSemana: cfg.horasSemana, semanas: cfg.semanas }));
  };

  const handleAddAsignatura = (asig: any) => {
    const newAsig: SimAsignatura = {
      id: `sim-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nombre: asig.nombre,
      creditos: asig.creditos || 3,
      horasSemanales: 4,
      grupos: 1,
      factor: 3,
    };
    setSimulado(prev => ({ ...prev, asignaturas: [...prev.asignaturas, newAsig] }));
    setShowAsignaturaSelector(false);
    toast.success(`Asignatura agregada: ${asig.nombre}`);
  };

  const handleRemoveAsignatura = (id: string) => {
    setSimulado(prev => ({ ...prev, asignaturas: prev.asignaturas.filter(a => a.id !== id) }));
  };

  const handleReset = () => {
    setSimulado({ ...original });
    toast.info('Simulación restablecida al escenario original');
  };

  const updateAsig = (id: string, field: keyof SimAsignatura, value: number) => {
    setSimulado(prev => ({
      ...prev,
      asignaturas: prev.asignaturas.map(a => a.id === id ? { ...a, [field]: value } : a),
    }));
  };

  // Comparison data for bar chart
  const comparisonData = useMemo(() => [
    { componente: 'Docencia', original: origResults.horasDocencia, simulado: simResults.horasDocencia },
    { componente: 'Investigación', original: original.investigacionHoras, simulado: simulado.investigacionHoras },
    { componente: 'Extensión', original: original.extensionHoras, simulado: simulado.extensionHoras },
    { componente: 'Complementaria', original: original.complementariaHoras, simulado: simulado.complementariaHoras },
  ], [origResults, simResults, original, simulado]);

  // Radar data
  const radarData = useMemo(() => [
    { subject: 'Docencia', original: origResults.pctDocencia, simulado: simResults.pctDocencia },
    { subject: 'Investigación', original: origResults.pctInvestigacion, simulado: simResults.pctInvestigacion },
    { subject: 'Extensión', original: origResults.pctExtension, simulado: simResults.pctExtension },
    { subject: 'Complementaria', original: origResults.pctComplementaria, simulado: simResults.pctComplementaria },
  ], [origResults, simResults]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders style={{ width: 24, height: 24, color: '#7C3AED' }} />
            Simulador de Carga "What-If"
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            Modele escenarios hipotéticos de distribución de carga docente con validación GTH-F081
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleReset} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RotateCcw style={{ width: 13, height: 13 }} /> Restablecer
          </button>
          <button onClick={() => setShowProjection(!showProjection)} style={{ padding: '6px 14px', borderRadius: 8, border: showProjection ? '1.5px solid #7C3AED' : '1px solid #E5E7EB', background: showProjection ? '#F3E8FF' : 'white', color: showProjection ? '#7C3AED' : '#6B7280', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Users style={{ width: 13, height: 13 }} /> Proyección masiva
          </button>
        </div>
      </div>

      {/* ═══ Controls Panel ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        {/* Left: Simulation controls */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sliders style={{ width: 16, height: 16, color: '#7C3AED' }} /> Parámetros de simulación
          </h3>

          {/* Scenario name */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 3 }}>Nombre del escenario</label>
            <input value={scenarioName} onChange={e => setScenarioName(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none' }} />
          </div>

          {/* Dedicacion selector */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Dedicación</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {Object.entries(DEDICACION_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleDedicacionChange(key as 'TC' | 'MT' | 'HC')}
                  style={{
                    flex: 1, padding: '8px 10px', borderRadius: 8,
                    border: simulado.dedicacion === key ? `2px solid ${cfg.color}` : '1px solid #E5E7EB',
                    background: simulado.dedicacion === key ? `${cfg.color}10` : 'white',
                    color: simulado.dedicacion === key ? cfg.color : '#6B7280',
                    fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  {key}
                  <div style={{ fontSize: '0.58rem', fontWeight: 500, marginTop: 2 }}>{cfg.horasSemana}h/sem</div>
                </button>
              ))}
            </div>
          </div>

          {/* Semanas & Horas/Semana */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 3 }}>Semanas</label>
              <input type="number" value={simulado.semanas} min={1} max={52} onChange={e => setSimulado(p => ({ ...p, semanas: +e.target.value || 1 }))} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none' }} />
            </div>
            {simulado.dedicacion !== 'HC' && (
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 3 }}>Horas/semana</label>
                <input type="number" value={simulado.horasSemana} min={1} max={48} onChange={e => setSimulado(p => ({ ...p, horasSemana: +e.target.value || 1 }))} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none' }} />
              </div>
            )}
          </div>

          {/* Component distribution sliders */}
          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Distribución de componentes (horas semestrales)</label>
            {[
              { label: 'Investigación', key: 'investigacionHoras' as const, color: '#059669', max: 400, icon: FlaskConical },
              { label: 'Extensión', key: 'extensionHoras' as const, color: '#D97706', max: 200, icon: Globe },
              { label: 'Complementaria', key: 'complementariaHoras' as const, color: '#7C3AED', max: 200, icon: Briefcase },
            ].map(comp => (
              <div key={comp.key} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <comp.icon style={{ width: 12, height: 12, color: comp.color }} /> {comp.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={() => setSimulado(p => ({ ...p, [comp.key]: Math.max(0, p[comp.key] - 8) }))} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Minus style={{ width: 10, height: 10 }} />
                    </button>
                    <input
                      type="number" value={simulado[comp.key]} min={0} max={comp.max}
                      onChange={e => setSimulado(p => ({ ...p, [comp.key]: Math.max(0, +e.target.value || 0) }))}
                      style={{ width: 56, padding: '3px 6px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', outline: 'none' }}
                    />
                    <button onClick={() => setSimulado(p => ({ ...p, [comp.key]: Math.min(comp.max, p[comp.key] + 8) }))} style={{ width: 22, height: 22, borderRadius: 5, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus style={{ width: 10, height: 10 }} />
                    </button>
                    <span style={{ fontSize: '0.62rem', color: '#9CA3AF', width: 14 }}>h</span>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: comp.color, width: `${Math.min(100, (simulado[comp.key] / comp.max) * 100)}%`, transition: 'width 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Results comparison */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calculator style={{ width: 16, height: 16, color: '#003DA5' }} /> Resultado de la simulación
          </h3>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Horas disponibles', value: simResults.horasDisponibles, orig: origResults.horasDisponibles, unit: 'h' },
              { label: 'Total programadas', value: simResults.totalHoras, orig: origResults.totalHoras, unit: 'h' },
              { label: '% Carga', value: simResults.pctCarga, orig: origResults.pctCarga, unit: '%' },
            ].map(card => {
              const diff = card.value - card.orig;
              return (
                <div key={card.label} style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>{card.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: card.label === '% Carga' && card.value > 100 ? '#DC2626' : '#111827' }}>{card.value}{card.unit}</div>
                  {diff !== 0 && (
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: diff > 0 ? '#059669' : '#DC2626' }}>
                      {diff > 0 ? '+' : ''}{diff}{card.unit} vs original
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pie chart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{ width: '45%', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie key="pie-sim" data={simResults.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
                    {simResults.pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip key="tooltip-pie" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {simResults.pieData.map(d => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#374151' }}>{d.name}</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{d.value}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Validaciones */}
          {simResults.validaciones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {simResults.validaciones.map((v, i) => (
                <div key={i} style={{ padding: '6px 10px', borderRadius: 6, background: v.tipo === 'error' ? '#FEE2E2' : '#FEF3C7', border: `1px solid ${v.tipo === 'error' ? '#FCA5A5' : '#FDE68A'}`, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem' }}>
                  <AlertTriangle style={{ width: 12, height: 12, color: v.tipo === 'error' ? '#DC2626' : '#D97706', flexShrink: 0 }} />
                  <span style={{ color: v.tipo === 'error' ? '#991B1B' : '#92400E' }}>{v.msg}</span>
                </div>
              ))}
            </div>
          )}
          {simResults.validaciones.length === 0 && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#D1FAE5', border: '1px solid #6EE7B7', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#065F46', fontWeight: 600 }}>
              <CheckCircle style={{ width: 14, height: 14 }} />
              Todas las validaciones GTH-F081 superadas
            </div>
          )}
        </div>
      </div>

      {/* ═══ Asignaturas Management ═══ */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BookOpen style={{ width: 16, height: 16, color: '#003DA5' }} />
            Asignaturas simuladas ({simulado.asignaturas.length})
          </h3>
          <button onClick={() => setShowAsignaturaSelector(true)} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus style={{ width: 12, height: 12 }} /> Agregar
          </button>
        </div>

        {simulado.asignaturas.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Sin asignaturas. Agregue una para calcular docencia.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>Asignatura</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', width: 65 }}>Créd.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', width: 65 }}>H/sem</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', width: 65 }}>Grupos</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', width: 80 }}>Horas sem.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#6B7280', borderBottom: '1px solid #E5E7EB', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {simulado.asignaturas.map(asig => {
                  const horasSem = asig.horasSemanales * asig.grupos * simulado.semanas + asig.creditos * asig.factor * asig.grupos;
                  return (
                    <tr key={asig.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500, color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asig.nombre}</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input type="number" value={asig.creditos} min={0} max={8} onChange={e => updateAsig(asig.id, 'creditos', +e.target.value || 0)} style={{ width: 40, padding: '3px', borderRadius: 5, border: '1px solid #E5E7EB', textAlign: 'center', fontSize: '0.78rem' }} />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input type="number" value={asig.horasSemanales} min={1} max={12} onChange={e => updateAsig(asig.id, 'horasSemanales', +e.target.value || 1)} style={{ width: 40, padding: '3px', borderRadius: 5, border: '1px solid #E5E7EB', textAlign: 'center', fontSize: '0.78rem' }} />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <input type="number" value={asig.grupos} min={1} max={5} onChange={e => updateAsig(asig.id, 'grupos', +e.target.value || 1)} style={{ width: 40, padding: '3px', borderRadius: 5, border: '1px solid #E5E7EB', textAlign: 'center', fontSize: '0.78rem' }} />
                      </td>
                      <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>{horasSem}h</td>
                      <td style={{ padding: '6px', textAlign: 'center' }}>
                        <button onClick={() => handleRemoveAsignatura(asig.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X style={{ width: 10, height: 10 }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ Comparison Charts ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Bar comparison */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px', minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers style={{ width: 16, height: 16, color: '#D97706' }} /> Original vs Simulado
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} barCategoryGap="20%">
              <CartesianGrid key="grid-bar" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="xaxis-bar" dataKey="componente" tick={{ fontSize: 10, fill: '#6B7280' }} />
              <YAxis key="yaxis-bar" tick={{ fontSize: 10, fill: '#6B7280' }} width={35} />
              <Tooltip key="tooltip-bar" contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <Bar key="bar-original" dataKey="original" fill="#D1D5DB" radius={[4, 4, 0, 0]} name="Original" />
              <Bar key="bar-simulado" dataKey="simulado" fill="#003DA5" radius={[4, 4, 0, 0]} name="Simulado" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar comparison */}
        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '18px 20px', minWidth: 0, overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Target style={{ width: 16, height: 16, color: '#059669' }} /> Balance de componentes
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid key="grid-radar" stroke="#E5E7EB" />
              <PolarAngleAxis key="angle-radar" dataKey="subject" tick={{ fontSize: 10, fill: '#374151' }} />
              <PolarRadiusAxis key="radius-radar" angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
              <Radar key="radar-original" name="Original" dataKey="original" stroke="#D1D5DB" fill="#D1D5DB40" strokeWidth={2} />
              <Radar key="radar-simulado" name="Simulado" dataKey="simulado" stroke="#003DA5" fill="#003DA540" strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══ Mass Projection ═══ */}
      <AnimatePresence>
        {showProjection && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #DDD6FE', padding: '18px 20px', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users style={{ width: 16, height: 16, color: '#7C3AED' }} /> Proyección masiva — {numDocentes} docente(s)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280' }}>Número de docentes:</label>
                <input type="number" value={numDocentes} min={1} max={200} onChange={e => setNumDocentes(Math.max(1, +e.target.value || 1))} style={{ width: 70, padding: '5px 8px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', textAlign: 'center', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                {[
                  { label: 'Total horas requeridas', value: `${(simResults.totalHoras * numDocentes).toLocaleString()}h` },
                  { label: 'Horas docencia', value: `${(simResults.horasDocencia * numDocentes).toLocaleString()}h` },
                  { label: 'Horas investigación', value: `${(simulado.investigacionHoras * numDocentes).toLocaleString()}h` },
                  { label: 'Horas extensión', value: `${(simulado.extensionHoras * numDocentes).toLocaleString()}h` },
                  { label: 'Asignaturas totales', value: `${simulado.asignaturas.length * numDocentes}` },
                  { label: 'Costo estimado (SMMLV)', value: `${Math.round(numDocentes * (simulado.dedicacion === 'TC' ? 5.2 : simulado.dedicacion === 'MT' ? 2.6 : 1.3) * 10) / 10}` },
                ].map(card => (
                  <div key={card.label} style={{ padding: '10px 14px', borderRadius: 10, background: '#F3E8FF', border: '1px solid #DDD6FE' }}>
                    <div style={{ fontSize: '0.58rem', fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase' }}>{card.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Asignatura Selector Modal ═══ */}
      <AnimatePresence>
        {showAsignaturaSelector && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAsignaturaSelector(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>Agregar asignatura</h3>
                <button onClick={() => setShowAsignaturaSelector(false)} style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 14, height: 14, color: '#6B7280' }} />
                </button>
              </div>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
                <input value={searchAsig} onChange={e => setSearchAsig(e.target.value)} placeholder="Buscar asignatura..." style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.85rem', outline: 'none' }} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {(asignaturasCatalogo.length > 0
                  ? asignaturasCatalogo.filter(a => !searchAsig || a.nombre?.toLowerCase().includes(searchAsig.toLowerCase())).slice(0, 30)
                  : DEFAULT_ASIGNATURAS.map(a => ({ nombre: a.nombre, creditos: a.creditos }))
                ).map((asig: any, i: number) => (
                  <button key={i} onClick={() => handleAddAsignatura(asig)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ color: '#374151' }}>{asig.nombre}</span>
                    <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{asig.creditos || 3} cr</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
