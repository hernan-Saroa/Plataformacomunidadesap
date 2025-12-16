/**
 * DASHBOARD EJECUTIVO CONSOLIDADO
 * Vista de alto nivel con todas las métricas críticas del sistema de Control Interno
 * 
 * Incluye:
 * - KPIs principales
 * - Estado de auditorías
 * - Planes de mejoramiento
 * - Hallazgos y evidencias
 * - Alertas y notificaciones
 * - Gráficos de tendencias
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, Target, FileText, Users, Calendar, Activity, Award,
  XCircle, AlertCircle, Shield, Zap, ArrowUpRight, ArrowDownRight,
  Eye, Download, RefreshCw, Filter, Calendar as CalendarIcon
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';

// ============ TIPOS ============

interface KPI {
  id: string;
  titulo: string;
  valor: number;
  unidad: string;
  meta: number;
  variacion: number; // % de cambio vs mes anterior
  tendencia: 'subiendo' | 'bajando' | 'estable';
  estado: 'excelente' | 'bueno' | 'alerta' | 'critico';
  icono: any;
  color: string;
}

interface MetricaAuditoria {
  periodo: string;
  planificadas: number;
  ejecutadas: number;
  finalizadas: number;
  enProceso: number;
}

interface MetricaHallazgos {
  tipo: string;
  cantidad: number;
  cerrados: number;
  pendientes: number;
  vencidos: number;
}

interface MetricaPlanMejoramiento {
  estado: string;
  cantidad: number;
  porcentaje: number;
}

interface AlertaEjecutiva {
  id: string;
  tipo: 'critica' | 'alta' | 'media';
  titulo: string;
  descripcion: string;
  fecha: string;
  area: string;
}

// ============ DATOS DE EJEMPLO ============

const KPIS_PRINCIPALES: KPI[] = [
  {
    id: 'kpi-1',
    titulo: 'Cumplimiento Plan Anual',
    valor: 87,
    unidad: '%',
    meta: 90,
    variacion: 5.2,
    tendencia: 'subiendo',
    estado: 'bueno',
    icono: Target,
    color: '#10B981'
  },
  {
    id: 'kpi-2',
    titulo: 'Planes de Mejoramiento',
    valor: 94,
    unidad: '%',
    meta: 95,
    variacion: 2.1,
    tendencia: 'subiendo',
    estado: 'excelente',
    icono: CheckCircle,
    color: '#059669'
  },
  {
    id: 'kpi-3',
    titulo: 'Hallazgos Vencidos',
    valor: 8,
    unidad: '',
    meta: 5,
    variacion: -15.3,
    tendencia: 'bajando',
    estado: 'alerta',
    icono: AlertTriangle,
    color: '#F59E0B'
  },
  {
    id: 'kpi-4',
    titulo: 'Tiempo Respuesta',
    valor: 12,
    unidad: 'días',
    meta: 15,
    variacion: -8.5,
    tendencia: 'bajando',
    estado: 'excelente',
    icono: Clock,
    color: '#3B82F6'
  },
  {
    id: 'kpi-5',
    titulo: 'Índice de Eficacia',
    valor: 92,
    unidad: '%',
    meta: 90,
    variacion: 3.7,
    tendencia: 'subiendo',
    estado: 'excelente',
    icono: Award,
    color: '#8B5CF6'
  },
  {
    id: 'kpi-6',
    titulo: 'Auditorías Completadas',
    valor: 28,
    unidad: '/32',
    meta: 32,
    variacion: 12.5,
    tendencia: 'subiendo',
    estado: 'bueno',
    icono: FileText,
    color: '#6366F1'
  }
];

const METRICAS_AUDITORIAS: MetricaAuditoria[] = [
  { periodo: 'Ene', planificadas: 5, ejecutadas: 5, finalizadas: 4, enProceso: 1 },
  { periodo: 'Feb', planificadas: 4, ejecutadas: 4, finalizadas: 3, enProceso: 1 },
  { periodo: 'Mar', planificadas: 6, ejecutadas: 5, finalizadas: 4, enProceso: 1 },
  { periodo: 'Abr', planificadas: 5, ejecutadas: 5, finalizadas: 5, enProceso: 0 },
  { periodo: 'May', planificadas: 7, ejecutadas: 6, finalizadas: 5, enProceso: 1 },
  { periodo: 'Jun', planificadas: 5, ejecutadas: 5, finalizadas: 4, enProceso: 1 }
];

const METRICAS_HALLAZGOS: MetricaHallazgos[] = [
  { tipo: 'Críticos', cantidad: 3, cerrados: 2, pendientes: 1, vencidos: 0 },
  { tipo: 'Altos', cantidad: 12, cerrados: 8, pendientes: 3, vencidos: 1 },
  { tipo: 'Medios', cantidad: 28, cerrados: 22, pendientes: 4, vencidos: 2 },
  { tipo: 'Bajos', cantidad: 45, cerrados: 40, pendientes: 0, vencidos: 5 }
];

const METRICAS_PLANES: MetricaPlanMejoramiento[] = [
  { estado: 'Cumplido', cantidad: 45, porcentaje: 68 },
  { estado: 'En Proceso', cantidad: 18, porcentaje: 27 },
  { estado: 'Vencido', cantidad: 3, porcentaje: 5 }
];

const ALERTAS_EJECUTIVAS: AlertaEjecutiva[] = [
  {
    id: 'alert-1',
    tipo: 'critica',
    titulo: '3 Hallazgos Críticos Pendientes',
    descripcion: 'Hallazgos de la auditoría de Contratos requieren acción inmediata',
    fecha: '2025-12-10',
    area: 'Gestión Contractual'
  },
  {
    id: 'alert-2',
    tipo: 'alta',
    titulo: 'Plan de Mejoramiento Próximo a Vencer',
    descripcion: 'Plan PM-2025-008 vence en 5 días',
    fecha: '2025-12-12',
    area: 'Gestión Financiera'
  },
  {
    id: 'alert-3',
    tipo: 'media',
    titulo: 'Informe Pormenorizado Pendiente',
    descripcion: 'Fecha límite: 28 de febrero 2026',
    fecha: '2025-12-14',
    area: 'Oficina Control Interno'
  }
];

// ============ COMPONENTES ============

function CardKPI({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icono;
  
  const getBorderColor = () => {
    switch (kpi.estado) {
      case 'excelente': return '#059669';
      case 'bueno': return '#10B981';
      case 'alerta': return '#F59E0B';
      case 'critico': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getBackgroundColor = () => {
    switch (kpi.estado) {
      case 'excelente': return '#D1FAE5';
      case 'bueno': return '#D1FAE5';
      case 'alerta': return '#FEF3C7';
      case 'critico': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className="p-4 border-2 hover:shadow-lg transition-all"
        style={{ borderColor: getBorderColor(), background: getBackgroundColor() }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 rounded-lg" style={{ background: 'white' }}>
            <Icon className="w-5 h-5" style={{ color: kpi.color }} />
          </div>
          <div className="flex items-center gap-1">
            {kpi.tendencia === 'subiendo' ? (
              <ArrowUpRight className="w-4 h-4 text-green-600" />
            ) : kpi.tendencia === 'bajando' ? (
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            ) : null}
            <span 
              className="text-xs font-black"
              style={{ color: kpi.variacion >= 0 ? '#059669' : '#EF4444' }}
            >
              {kpi.variacion >= 0 ? '+' : ''}{kpi.variacion.toFixed(1)}%
            </span>
          </div>
        </div>

        <p className="text-xs font-bold text-gray-600 mb-1">{kpi.titulo}</p>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-3xl font-black" style={{ color: kpi.color }}>
            {kpi.valor}
          </span>
          <span className="text-sm font-bold text-gray-500">{kpi.unidad}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Meta: {kpi.meta}{kpi.unidad}</span>
          <Badge 
            variant="outline"
            style={{ 
              borderColor: getBorderColor(),
              color: getBorderColor(),
              background: 'white'
            }}
          >
            {kpi.estado.toUpperCase()}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );
}

function GraficoAuditorias() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Ejecución de Auditorías</h3>
          <p className="text-sm text-gray-600">Comparativo planificadas vs ejecutadas</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Exportar
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={METRICAS_AUDITORIAS}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="periodo" stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip 
            contentStyle={{ 
              background: 'white', 
              border: '2px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="planificadas" fill="#6366F1" name="Planificadas" radius={[8, 8, 0, 0]} />
          <Bar dataKey="ejecutadas" fill="#10B981" name="Ejecutadas" radius={[8, 8, 0, 0]} />
          <Bar dataKey="finalizadas" fill="#059669" name="Finalizadas" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function GraficoHallazgos() {
  const dataGrafico = METRICAS_HALLAZGOS.map(h => ({
    name: h.tipo,
    cerrados: h.cerrados,
    pendientes: h.pendientes,
    vencidos: h.vencidos
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Estado de Hallazgos</h3>
          <p className="text-sm text-gray-600">Por criticidad y estado</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dataGrafico} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" stroke="#6B7280" />
          <YAxis dataKey="name" type="category" stroke="#6B7280" />
          <Tooltip 
            contentStyle={{ 
              background: 'white', 
              border: '2px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="cerrados" fill="#10B981" name="Cerrados" stackId="a" />
          <Bar dataKey="pendientes" fill="#F59E0B" name="Pendientes" stackId="a" />
          <Bar dataKey="vencidos" fill="#EF4444" name="Vencidos" stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function GraficoPlanes() {
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  const dataGrafico = METRICAS_PLANES.map((plan, index) => ({
    name: plan.estado,
    value: plan.cantidad,
    porcentaje: plan.porcentaje,
    fill: COLORS[index]
  }));

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Planes de Mejoramiento</h3>
          <p className="text-sm text-gray-600">Distribución por estado</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={dataGrafico}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ porcentaje }) => `${porcentaje}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {dataGrafico.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {METRICAS_PLANES.map((plan, index) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded" 
                style={{ background: COLORS[index] }}
              />
              <div>
                <p className="font-bold text-gray-900">{plan.estado}</p>
                <p className="text-sm text-gray-600">{plan.cantidad} planes</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ListaAlertasEjecutivas() {
  const getAlertaColor = (tipo: AlertaEjecutiva['tipo']) => {
    switch (tipo) {
      case 'critica': return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' };
      case 'alta': return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' };
      case 'media': return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A' };
    }
  };

  const getAlertaIcon = (tipo: AlertaEjecutiva['tipo']) => {
    switch (tipo) {
      case 'critica': return XCircle;
      case 'alta': return AlertTriangle;
      case 'media': return AlertCircle;
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-gray-900 mb-1">Alertas Ejecutivas</h3>
          <p className="text-sm text-gray-600">Requieren atención inmediata</p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          {ALERTAS_EJECUTIVAS.length} activas
        </Badge>
      </div>

      <div className="space-y-3">
        {ALERTAS_EJECUTIVAS.map(alerta => {
          const colors = getAlertaColor(alerta.tipo);
          const Icon = getAlertaIcon(alerta.tipo);

          return (
            <motion.div
              key={alerta.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 rounded-lg border-2 hover:shadow-md transition-all cursor-pointer"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.border }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black" style={{ color: colors.text }}>
                      {alerta.titulo}
                    </p>
                    <Badge 
                      variant="outline"
                      style={{ 
                        background: 'white',
                        color: colors.border,
                        borderColor: colors.border,
                        fontSize: '10px'
                      }}
                    >
                      {alerta.tipo.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{alerta.descripcion}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {alerta.fecha}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {alerta.area}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <Eye className="w-3 h-3 mr-1" />
                  Ver
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function DashboardEjecutivoConsolidado() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025');
  const [actualizando, setActualizando] = useState(false);

  const handleActualizar = () => {
    setActualizando(true);
    setTimeout(() => {
      setActualizando(false);
    }, 1500);
  };

  const estadisticasGenerales = useMemo(() => {
    const totalAuditorias = METRICAS_AUDITORIAS.reduce((acc, m) => acc + m.planificadas, 0);
    const totalEjecutadas = METRICAS_AUDITORIAS.reduce((acc, m) => acc + m.ejecutadas, 0);
    const totalHallazgos = METRICAS_HALLAZGOS.reduce((acc, m) => acc + m.cantidad, 0);
    const totalCerrados = METRICAS_HALLAZGOS.reduce((acc, m) => acc + m.cerrados, 0);
    const totalPlanes = METRICAS_PLANES.reduce((acc, m) => acc + m.cantidad, 0);

    return {
      totalAuditorias,
      totalEjecutadas,
      porcentajeEjecucion: ((totalEjecutadas / totalAuditorias) * 100).toFixed(1),
      totalHallazgos,
      totalCerrados,
      porcentajeCierre: ((totalCerrados / totalHallazgos) * 100).toFixed(1),
      totalPlanes
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Dashboard Ejecutivo Consolidado
          </h2>
          <p className="text-gray-600">
            Vista general del estado del Sistema de Control Interno
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
            style={{ borderColor: '#003DA5' }}
          >
            <option value="2025">Año 2025</option>
            <option value="2024">Año 2024</option>
            <option value="trim-4-2025">Q4 2025</option>
            <option value="trim-3-2025">Q3 2025</option>
          </select>

          <Button
            onClick={handleActualizar}
            disabled={actualizando}
            className="font-bold"
            style={{ background: '#003DA5' }}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${actualizando ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button variant="outline" className="font-bold">
            <Download className="w-4 h-4 mr-1" />
            Exportar
          </Button>
        </div>
      </div>

      {/* RESUMEN EJECUTIVO */}
      <Card className="p-6 border-2" style={{ borderColor: '#003DA5', background: '#F0F9FF' }}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mb-1">Auditorías</p>
            <p className="text-3xl font-black" style={{ color: '#003DA5' }}>
              {estadisticasGenerales.totalEjecutadas}/{estadisticasGenerales.totalAuditorias}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {estadisticasGenerales.porcentajeEjecucion}% ejecutado
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mb-1">Hallazgos</p>
            <p className="text-3xl font-black text-purple-600">
              {estadisticasGenerales.totalHallazgos}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {estadisticasGenerales.porcentajeCierre}% cerrados
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mb-1">Planes Mejora</p>
            <p className="text-3xl font-black text-green-600">
              {estadisticasGenerales.totalPlanes}
            </p>
            <p className="text-xs text-gray-600 mt-1">activos</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mb-1">Alertas</p>
            <p className="text-3xl font-black text-red-600">
              {ALERTAS_EJECUTIVAS.length}
            </p>
            <p className="text-xs text-gray-600 mt-1">requieren atención</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 mb-1">Eficacia General</p>
            <p className="text-3xl font-black text-green-600">92%</p>
            <p className="text-xs text-gray-600 mt-1">+3.2% vs anterior</p>
          </div>
        </div>
      </Card>

      {/* KPIS PRINCIPALES */}
      <div>
        <h3 className="font-black text-gray-900 mb-4">Indicadores Clave de Desempeño (KPIs)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {KPIS_PRINCIPALES.map(kpi => (
            <CardKPI key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoAuditorias />
        <GraficoHallazgos />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoPlanes />
        <ListaAlertasEjecutivas />
      </div>

      {/* FOOTER CON ESTADÍSTICAS ADICIONALES */}
      <Card className="p-6 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">156</p>
            <p className="text-xs text-gray-600">Acciones Correctivas</p>
          </div>
          <div>
            <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">24</p>
            <p className="text-xs text-gray-600">Áreas Auditadas</p>
          </div>
          <div>
            <FileText className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">12</p>
            <p className="text-xs text-gray-600">Informes Generados</p>
          </div>
          <div>
            <Zap className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-2xl font-black text-gray-900">98%</p>
            <p className="text-xs text-gray-600">Satisfacción Áreas</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DashboardEjecutivoConsolidado;
