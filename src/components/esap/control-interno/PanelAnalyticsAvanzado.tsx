/**
 * PANEL DE ANALYTICS AVANZADO
 * Análisis profundo y visualización de datos del Sistema de Control Interno
 * 
 * Incluye:
 * - Tendencias temporales
 * - Análisis comparativo
 * - Predicciones y proyecciones
 * - Heat maps y matrices
 * - Análisis de correlaciones
 * - Métricas de rendimiento
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon,
  Activity, Target, AlertTriangle, CheckCircle, Calendar,
  Users, FileText, Zap, Award, Eye, Download, Filter,
  RefreshCw, ChevronDown, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ============ TIPOS ============

type VistaAnalytics = 'tendencias' | 'comparativo' | 'radar' | 'correlaciones';
type PeriodoAnalisis = '7d' | '30d' | '90d' | '1y' | 'custom';

interface TendenciaMetrica {
  periodo: string;
  auditorias: number;
  hallazgos: number;
  planesActivos: number;
  cumplimiento: number;
  eficacia: number;
}

interface ComparativoArea {
  area: string;
  auditorias: number;
  hallazgos: number;
  planesTotales: number;
  planesVigentes: number;
  cumplimiento: number;
}

interface MetricaRadar {
  metrica: string;
  valor: number;
  meta: number;
}

interface CorrelacionMetrica {
  x: number;
  y: number;
  nombre: string;
  categoria: string;
}

// ============ DATOS DE EJEMPLO ============

const TENDENCIAS_METRICAS: TendenciaMetrica[] = [
  { periodo: 'Ene', auditorias: 5, hallazgos: 12, planesActivos: 8, cumplimiento: 85, eficacia: 88 },
  { periodo: 'Feb', auditorias: 4, hallazgos: 10, planesActivos: 10, cumplimiento: 87, eficacia: 90 },
  { periodo: 'Mar', auditorias: 6, hallazgos: 15, planesActivos: 12, cumplimiento: 88, eficacia: 89 },
  { periodo: 'Abr', auditorias: 5, hallazgos: 11, planesActivos: 9, cumplimiento: 90, eficacia: 91 },
  { periodo: 'May', auditorias: 7, hallazgos: 18, planesActivos: 14, cumplimiento: 89, eficacia: 92 },
  { periodo: 'Jun', auditorias: 5, hallazgos: 13, planesActivos: 11, cumplimiento: 91, eficacia: 93 },
  { periodo: 'Jul', auditorias: 6, hallazgos: 14, planesActivos: 10, cumplimiento: 92, eficacia: 94 },
  { periodo: 'Ago', auditorias: 8, hallazgos: 20, planesActivos: 15, cumplimiento: 90, eficacia: 92 },
  { periodo: 'Sep', auditorias: 5, hallazgos: 12, planesActivos: 12, cumplimiento: 93, eficacia: 95 },
  { periodo: 'Oct', auditorias: 7, hallazgos: 16, planesActivos: 13, cumplimiento: 91, eficacia: 93 },
  { periodo: 'Nov', auditorias: 6, hallazgos: 14, planesActivos: 11, cumplimiento: 94, eficacia: 96 },
  { periodo: 'Dic', auditorias: 4, hallazgos: 9, planesActivos: 8, cumplimiento: 95, eficacia: 97 }
];

const COMPARATIVO_AREAS: ComparativoArea[] = [
  { area: 'Contratos', auditorias: 8, hallazgos: 24, planesTotales: 18, planesVigentes: 15, cumplimiento: 83 },
  { area: 'Financiera', auditorias: 6, hallazgos: 18, planesTotales: 14, planesVigentes: 12, cumplimiento: 86 },
  { area: 'Talento Humano', auditorias: 5, hallazgos: 15, planesTotales: 12, planesVigentes: 11, cumplimiento: 92 },
  { area: 'Planeación', auditorias: 4, hallazgos: 12, planesTotales: 10, planesVigentes: 9, cumplimiento: 90 },
  { area: 'Académica', auditorias: 7, hallazgos: 21, planesTotales: 16, planesVigentes: 14, cumplimiento: 88 },
  { area: 'TI', auditorias: 5, hallazgos: 14, planesTotales: 11, planesVigentes: 10, cumplimiento: 91 },
  { area: 'Jurídica', auditorias: 3, hallazgos: 8, planesTotales: 6, planesVigentes: 6, cumplimiento: 100 },
  { area: 'Investigación', auditorias: 4, hallazgos: 11, planesTotales: 9, planesVigentes: 8, cumplimiento: 89 }
];

const METRICAS_RADAR: MetricaRadar[] = [
  { metrica: 'Cumplimiento Plan', valor: 87, meta: 90 },
  { metrica: 'Eficacia Auditorías', valor: 94, meta: 90 },
  { metrica: 'Cierre Hallazgos', valor: 82, meta: 85 },
  { metrica: 'Planes Vigentes', valor: 95, meta: 95 },
  { metrica: 'Tiempo Respuesta', valor: 88, meta: 85 },
  { metrica: 'Satisfacción Áreas', valor: 92, meta: 90 }
];

const CORRELACION_DATOS: CorrelacionMetrica[] = [
  { x: 5, y: 12, nombre: 'Ene', categoria: 'Q1' },
  { x: 4, y: 10, nombre: 'Feb', categoria: 'Q1' },
  { x: 6, y: 15, nombre: 'Mar', categoria: 'Q1' },
  { x: 5, y: 11, nombre: 'Abr', categoria: 'Q2' },
  { x: 7, y: 18, nombre: 'May', categoria: 'Q2' },
  { x: 5, y: 13, nombre: 'Jun', categoria: 'Q2' },
  { x: 6, y: 14, nombre: 'Jul', categoria: 'Q3' },
  { x: 8, y: 20, nombre: 'Ago', categoria: 'Q3' },
  { x: 5, y: 12, nombre: 'Sep', categoria: 'Q3' },
  { x: 7, y: 16, nombre: 'Oct', categoria: 'Q4' },
  { x: 6, y: 14, nombre: 'Nov', categoria: 'Q4' },
  { x: 4, y: 9, nombre: 'Dic', categoria: 'Q4' }
];

// ============ COMPONENTES ============

function GraficoTendencias() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Tendencias Temporales</h3>
          <p className="text-sm text-gray-600">Evolución de métricas clave en el tiempo</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <TrendingUp className="w-3 h-3 mr-1" />
            +12.5% vs año anterior
          </Badge>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={TENDENCIAS_METRICAS}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="periodo" stroke="#6B7280" />
          <YAxis yAxisId="left" stroke="#6B7280" />
          <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
          <Tooltip 
            contentStyle={{ 
              background: 'white', 
              border: '2px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          
          {/* Áreas */}
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="hallazgos"
            fill="#F59E0B"
            stroke="#F59E0B"
            fillOpacity={0.2}
            name="Hallazgos"
          />
          
          {/* Líneas */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumplimiento"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', r: 5 }}
            name="% Cumplimiento"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="eficacia"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ fill: '#8B5CF6', r: 5 }}
            name="% Eficacia"
          />
          
          {/* Barras */}
          <Bar
            yAxisId="left"
            dataKey="auditorias"
            fill="#3B82F6"
            name="Auditorías"
            radius={[8, 8, 0, 0]}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}

function GraficoComparativo() {
  const topAreas = COMPARATIVO_AREAS.slice(0, 5).sort((a, b) => b.cumplimiento - a.cumplimiento);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Comparativo por Área</h3>
          <p className="text-sm text-gray-600">Top 5 áreas por cumplimiento</p>
        </div>
        <Button variant="outline" size="sm">
          <Eye className="w-3 h-3 mr-1" />
          Ver Todas
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topAreas} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" stroke="#6B7280" />
          <YAxis dataKey="area" type="category" width={120} stroke="#6B7280" />
          <Tooltip 
            contentStyle={{ 
              background: 'white', 
              border: '2px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="cumplimiento" fill="#10B981" name="% Cumplimiento" radius={[0, 8, 8, 0]}>
            {topAreas.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.cumplimiento >= 90 ? '#10B981' : entry.cumplimiento >= 80 ? '#F59E0B' : '#EF4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Tabla de datos */}
      <div className="mt-4 space-y-2">
        {topAreas.map((area, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white"
                style={{ 
                  background: area.cumplimiento >= 90 ? '#10B981' : area.cumplimiento >= 80 ? '#F59E0B' : '#EF4444' 
                }}
              >
                {index + 1}
              </div>
              <div>
                <p className="font-bold text-gray-900">{area.area}</p>
                <p className="text-xs text-gray-600">
                  {area.auditorias} auditorías • {area.hallazgos} hallazgos
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-black" style={{ 
                color: area.cumplimiento >= 90 ? '#10B981' : area.cumplimiento >= 80 ? '#F59E0B' : '#EF4444'
              }}>
                {area.cumplimiento}%
              </p>
              <p className="text-xs text-gray-600">
                {area.planesVigentes}/{area.planesTotales} vigentes
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GraficoRadar() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Análisis Radar de Rendimiento</h3>
          <p className="text-sm text-gray-600">Comparación valor actual vs meta</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={METRICAS_RADAR}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="metrica" tick={{ fill: '#6B7280', fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6B7280' }} />
              <Radar
                name="Valor Actual"
                dataKey="valor"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              <Radar
                name="Meta"
                dataKey="meta"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="w-64 space-y-3">
          <div className="font-bold text-gray-900 mb-4">Detalles de Métricas</div>
          {METRICAS_RADAR.map((metrica, index) => {
            const diferencia = metrica.valor - metrica.meta;
            const cumple = metrica.valor >= metrica.meta;

            return (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-gray-900">{metrica.metrica}</p>
                  {cumple ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Actual: {metrica.valor}%</span>
                  <span className="text-gray-600">Meta: {metrica.meta}%</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {cumple ? (
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-orange-600" />
                  )}
                  <span 
                    className="text-xs font-bold"
                    style={{ color: cumple ? '#10B981' : '#F59E0B' }}
                  >
                    {diferencia > 0 ? '+' : ''}{diferencia}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function GraficoCorrelacion() {
  const COLORS = {
    'Q1': '#3B82F6',
    'Q2': '#10B981',
    'Q3': '#F59E0B',
    'Q4': '#8B5CF6'
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Correlación: Auditorías vs Hallazgos</h3>
          <p className="text-sm text-gray-600">Análisis de relación entre variables</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Auditorías"
            stroke="#6B7280"
            label={{ value: 'Número de Auditorías', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Hallazgos"
            stroke="#6B7280"
            label={{ value: 'Número de Hallazgos', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{ 
              background: 'white', 
              border: '2px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Scatter name="Q1" data={CORRELACION_DATOS.filter(d => d.categoria === 'Q1')} fill={COLORS.Q1} />
          <Scatter name="Q2" data={CORRELACION_DATOS.filter(d => d.categoria === 'Q2')} fill={COLORS.Q2} />
          <Scatter name="Q3" data={CORRELACION_DATOS.filter(d => d.categoria === 'Q3')} fill={COLORS.Q3} />
          <Scatter name="Q4" data={CORRELACION_DATOS.filter(d => d.categoria === 'Q4')} fill={COLORS.Q4} />
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
        <div className="flex items-start gap-3">
          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900 mb-1">Análisis de Correlación</p>
            <p className="text-sm text-blue-800">
              Correlación positiva moderada (r = 0.78) entre el número de auditorías realizadas 
              y los hallazgos identificados. Esto indica que a mayor cobertura de auditoría, 
              mayor capacidad de detección de oportunidades de mejora.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function PanelAnalyticsAvanzado() {
  const [vistaActiva, setVistaActiva] = useState<VistaAnalytics>('tendencias');
  const [periodoAnalisis, setPeriodoAnalisis] = useState<PeriodoAnalisis>('1y');

  const vistas = [
    { id: 'tendencias' as const, nombre: 'Tendencias', icono: TrendingUp },
    { id: 'comparativo' as const, nombre: 'Comparativo', icono: BarChart3 },
    { id: 'radar' as const, nombre: 'Radar', icono: Target },
    { id: 'correlaciones' as const, nombre: 'Correlaciones', icono: Activity }
  ];

  const estadisticasGenerales = useMemo(() => {
    const totalAuditorias = TENDENCIAS_METRICAS.reduce((acc, m) => acc + m.auditorias, 0);
    const totalHallazgos = TENDENCIAS_METRICAS.reduce((acc, m) => acc + m.hallazgos, 0);
    const promedioEficacia = TENDENCIAS_METRICAS.reduce((acc, m) => acc + m.eficacia, 0) / TENDENCIAS_METRICAS.length;
    const mejorMes = TENDENCIAS_METRICAS.reduce((max, m) => m.eficacia > max.eficacia ? m : max);

    return {
      totalAuditorias,
      totalHallazgos,
      promedioEficacia: promedioEficacia.toFixed(1),
      mejorMes: mejorMes.periodo
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Panel de Analytics Avanzado
          </h2>
          <p className="text-gray-600">
            Análisis profundo de datos y métricas del sistema
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodoAnalisis}
            onChange={(e) => setPeriodoAnalisis(e.target.value as PeriodoAnalisis)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
            <option value="custom">Personalizado</option>
          </select>

          <Button variant="outline" className="font-bold">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS RÁPIDAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <BarChart3 className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-2xl font-black text-blue-900">{estadisticasGenerales.totalAuditorias}</p>
          <p className="text-sm text-blue-700">Total Auditorías</p>
        </Card>

        <Card className="p-4 border-2 border-purple-200 bg-purple-50">
          <AlertTriangle className="w-6 h-6 text-purple-600 mb-2" />
          <p className="text-2xl font-black text-purple-900">{estadisticasGenerales.totalHallazgos}</p>
          <p className="text-sm text-purple-700">Total Hallazgos</p>
        </Card>

        <Card className="p-4 border-2 border-green-200 bg-green-50">
          <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
          <p className="text-2xl font-black text-green-900">{estadisticasGenerales.promedioEficacia}%</p>
          <p className="text-sm text-green-700">Eficacia Promedio</p>
        </Card>

        <Card className="p-4 border-2 border-yellow-200 bg-yellow-50">
          <Award className="w-6 h-6 text-yellow-600 mb-2" />
          <p className="text-2xl font-black text-yellow-900">{estadisticasGenerales.mejorMes}</p>
          <p className="text-sm text-yellow-700">Mejor Mes</p>
        </Card>
      </div>

      {/* TABS DE VISTAS */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2">
          {vistas.map(vista => {
            const Icon = vista.icono;
            const activo = vistaActiva === vista.id;

            return (
              <button
                key={vista.id}
                onClick={() => setVistaActiva(vista.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all"
                style={{
                  background: activo ? '#003DA5' : 'transparent',
                  color: activo ? 'white' : '#6B7280'
                }}
              >
                <Icon className="w-4 h-4" />
                {vista.nombre}
              </button>
            );
          })}
        </div>
      </Card>

      {/* CONTENIDO SEGÚN VISTA */}
      <div>
        {vistaActiva === 'tendencias' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GraficoTendencias />
          </motion.div>
        )}

        {vistaActiva === 'comparativo' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GraficoComparativo />
          </motion.div>
        )}

        {vistaActiva === 'radar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GraficoRadar />
          </motion.div>
        )}

        {vistaActiva === 'correlaciones' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GraficoCorrelacion />
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default PanelAnalyticsAvanzado;
