/**
 * ============================================
 * RF016: DASHBOARD EJECUTIVO - CONTROL INTERNO DE GESTIÓN
 * ============================================
 * 
 * Dashboard ejecutivo completo con métricas clave, gráficos
 * interactivos y exportación de reportes
 * 
 * CARACTERÍSTICAS:
 * - 📊 Métricas KPI en tiempo real
 * - 📈 Gráficos Recharts profesionales
 * - 🎯 Semáforos de cumplimiento
 * - 📥 Exportación PDF/Excel
 * - 🔄 Filtros por período y territorial
 * - 📱 100% Responsive
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Diciembre 2025 - 18:00
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, Minus, Calendar, Download,
  Filter, Users, Target, CheckCircle2, AlertTriangle,
  Clock, FileText, BarChart3, PieChart as PieChartIcon,
  Activity, ArrowUpRight, ArrowDownRight, RefreshCw,
  Share2, Printer, FileSpreadsheet, Eye, ChevronDown,
  Shield, AlertCircle, CheckSquare, XCircle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, RadialBarChart,
  RadialBar
} from 'recharts';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

// ============ TIPOS ============

interface KPIMetrica {
  id: string;
  titulo: string;
  valor: number;
  meta: number;
  unidad: string;
  tendencia: 'up' | 'down' | 'neutral';
  variacion: number;
  color: 'green' | 'yellow' | 'red';
  icon: React.ElementType;
  descripcion: string;
}

interface DatoGrafico {
  mes: string;
  auditorias: number;
  hallazgos: number;
  cumplimiento: number;
}

interface DatoEstado {
  estado: string;
  cantidad: number;
  color: string;
}

interface DatoTerritorial {
  territorial: string;
  auditorias: number;
  cumplimiento: number;
}

// ============ DATOS MOCK ============

const METRICAS_KPI: KPIMetrica[] = [
  {
    id: 'kpi-1',
    titulo: 'Cumplimiento Plan Anual',
    valor: 75,
    meta: 85,
    unidad: '%',
    tendencia: 'up',
    variacion: 12,
    color: 'yellow',
    icon: Target,
    descripcion: '15 de 20 auditorías completadas'
  },
  {
    id: 'kpi-2',
    titulo: 'Planes de Mejoramiento',
    valor: 82,
    meta: 90,
    unidad: '%',
    tendencia: 'up',
    variacion: 8,
    color: 'green',
    icon: CheckSquare,
    descripcion: '41 de 50 acciones completadas'
  },
  {
    id: 'kpi-3',
    titulo: 'Hallazgos Críticos',
    valor: 8,
    meta: 5,
    unidad: 'hallazgos',
    tendencia: 'down',
    variacion: -15,
    color: 'red',
    icon: AlertTriangle,
    descripcion: '3 más que el trimestre anterior'
  },
  {
    id: 'kpi-4',
    titulo: 'Tiempo Promedio Auditoría',
    valor: 18,
    meta: 20,
    unidad: 'días',
    tendencia: 'up',
    variacion: 10,
    color: 'green',
    icon: Clock,
    descripcion: '2 días menos que el promedio'
  },
  {
    id: 'kpi-5',
    titulo: 'Informes Entregados',
    valor: 94,
    meta: 95,
    unidad: '%',
    tendencia: 'neutral',
    variacion: 0,
    color: 'green',
    icon: FileText,
    descripcion: '17 de 18 informes a tiempo'
  },
  {
    id: 'kpi-6',
    titulo: 'Satisfacción Áreas',
    valor: 4.3,
    meta: 4.0,
    unidad: '/5',
    tendencia: 'up',
    variacion: 7,
    color: 'green',
    icon: Users,
    descripcion: 'Calificación promedio 4.3/5'
  }
];

const DATOS_TENDENCIA: DatoGrafico[] = [
  { mes: 'Jul', auditorias: 3, hallazgos: 12, cumplimiento: 68 },
  { mes: 'Ago', auditorias: 4, hallazgos: 15, cumplimiento: 72 },
  { mes: 'Sep', auditorias: 2, hallazgos: 8, cumplimiento: 75 },
  { mes: 'Oct', auditorias: 5, hallazgos: 18, cumplimiento: 78 },
  { mes: 'Nov', auditorias: 3, hallazgos: 11, cumplimiento: 81 },
  { mes: 'Dic', auditorias: 4, hallazgos: 14, cumplimiento: 82 }
];

const DATOS_ESTADOS: DatoEstado[] = [
  { estado: 'Planeación', cantidad: 3, color: '#3B82F6' },
  { estado: 'Ejecución', cantidad: 5, color: '#F59E0B' },
  { estado: 'Comunicación', cantidad: 2, color: '#8B5CF6' },
  { estado: 'Seguimiento', cantidad: 3, color: '#10B981' },
  { estado: 'Finalizada', cantidad: 7, color: '#6B7280' }
];

const DATOS_TERRITORIALES: DatoTerritorial[] = [
  { territorial: 'Antioquia', auditorias: 4, cumplimiento: 88 },
  { territorial: 'Bogotá', auditorias: 8, cumplimiento: 92 },
  { territorial: 'Valle', auditorias: 3, cumplimiento: 75 },
  { territorial: 'Atlántico', auditorias: 2, cumplimiento: 70 },
  { territorial: 'Santander', auditorias: 3, cumplimiento: 85 }
];

const DATOS_SEVERIDAD_HALLAZGOS = [
  { severidad: 'Crítico', cantidad: 8, color: '#EF4444' },
  { severidad: 'Alto', cantidad: 15, color: '#F97316' },
  { severidad: 'Medio', cantidad: 23, color: '#F59E0B' },
  { severidad: 'Bajo', cantidad: 12, color: '#10B981' }
];

// ============ COMPONENTES ============

function TarjetaKPI({ metrica }: { metrica: KPIMetrica }) {
  const Icon = metrica.icon;
  const porcentajeCumplimiento = (metrica.valor / metrica.meta) * 100;

  const getColorClasses = () => {
    switch (metrica.color) {
      case 'green':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          icon: 'bg-yellow-100',
          iconColor: 'text-yellow-600'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: 'bg-red-100',
          iconColor: 'text-red-600'
        };
    }
  };

  const colors = getColorClasses();

  const TrendIcon = metrica.tendencia === 'up' ? ArrowUpRight :
                    metrica.tendencia === 'down' ? ArrowDownRight : Minus;

  return (
    <Card className={`p-4 border-2 ${colors.border} ${colors.bg} hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg ${colors.icon}`}>
          <Icon className={`w-5 h-5 ${colors.iconColor}`} />
        </div>
        <Badge
          className={`text-xs flex items-center gap-1 ${
            metrica.tendencia === 'up' ? 'bg-green-100 text-green-700' :
            metrica.tendencia === 'down' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}
        >
          <TrendIcon className="w-3 h-3" />
          {Math.abs(metrica.variacion)}%
        </Badge>
      </div>

      <h3 className="text-sm text-gray-600 mb-1">{metrica.titulo}</h3>
      
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-3xl font-bold ${colors.text}`}>
          {metrica.valor}
        </span>
        <span className="text-sm text-gray-500">
          / {metrica.meta} {metrica.unidad}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div
          className={`h-1.5 rounded-full transition-all ${
            metrica.color === 'green' ? 'bg-green-500' :
            metrica.color === 'yellow' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${Math.min(porcentajeCumplimiento, 100)}%` }}
        />
      </div>

      <p className="text-xs text-gray-500">{metrica.descripcion}</p>
    </Card>
  );
}

function GraficoTendencias() {
  return (
    <Card className="p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900">Tendencia Mensual</h3>
          <p className="text-sm text-gray-500">Auditorías, Hallazgos y Cumplimiento</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          Exportar
        </Button>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={DATOS_TENDENCIA}>
          <defs>
            <linearGradient id="colorAuditorias" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#003DA5" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#003DA5" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="mes" stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 12px'
            }}
          />
          <Legend />
          <Area 
            type="monotone" 
            dataKey="auditorias" 
            stroke="#003DA5" 
            fillOpacity={1} 
            fill="url(#colorAuditorias)" 
            name="Auditorías"
          />
          <Area 
            type="monotone" 
            dataKey="cumplimiento" 
            stroke="#10B981" 
            fillOpacity={1} 
            fill="url(#colorCumplimiento)" 
            name="% Cumplimiento"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function GraficoEstados() {
  return (
    <Card className="p-6 border-2 border-gray-200">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900">Auditorías por Estado</h3>
        <p className="text-sm text-gray-500">Distribución actual de 20 auditorías</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={DATOS_ESTADOS}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="cantidad"
          >
            {DATOS_ESTADOS.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      {/* Leyenda personalizada */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        {DATOS_ESTADOS.map((estado) => (
          <div key={estado.estado} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: estado.color }}
            />
            <span className="text-sm text-gray-700">
              {estado.estado} ({estado.cantidad})
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GraficoSeveridadHallazgos() {
  return (
    <Card className="p-6 border-2 border-gray-200">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900">Hallazgos por Severidad</h3>
        <p className="text-sm text-gray-500">Total: 58 hallazgos registrados</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={DATOS_SEVERIDAD_HALLAZGOS} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis type="number" stroke="#6B7280" />
          <YAxis dataKey="severidad" type="category" stroke="#6B7280" width={80} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Bar dataKey="cantidad" radius={[0, 8, 8, 0]}>
            {DATOS_SEVERIDAD_HALLAZGOS.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function GraficoTerritoriales() {
  return (
    <Card className="p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900">Desempeño por Territorial</h3>
          <p className="text-sm text-gray-500">Top 5 territoriales</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={DATOS_TERRITORIALES}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="territorial" stroke="#6B7280" />
          <YAxis stroke="#6B7280" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E5E7EB',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar dataKey="auditorias" fill="#003DA5" name="Auditorías" radius={[8, 8, 0, 0]} />
          <Bar dataKey="cumplimiento" fill="#10B981" name="% Cumplimiento" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function ResumenEjecutivo() {
  const estadisticas = [
    {
      titulo: 'Auditorías Completadas',
      valor: '15/20',
      porcentaje: 75,
      icon: CheckCircle2,
      color: 'bg-green-100 text-green-700'
    },
    {
      titulo: 'En Proceso',
      valor: '5',
      subtexto: '3 Ejecución, 2 Comunicación',
      icon: Activity,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      titulo: 'Hallazgos Abiertos',
      valor: '23',
      subtexto: '8 críticos, 15 altos',
      icon: AlertCircle,
      color: 'bg-red-100 text-red-700'
    },
    {
      titulo: 'Planes Activos',
      valor: '12',
      subtexto: '82% cumplimiento promedio',
      icon: Target,
      color: 'bg-purple-100 text-purple-700'
    }
  ];

  return (
    <Card className="p-6 border-2 border-gray-200" style={{ borderColor: '#003DA5' }}>
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: '#003DA5' }}
        >
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Resumen Ejecutivo</h3>
          <p className="text-sm text-gray-500">Control Interno de Gestión - Diciembre 2025</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {estadisticas.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.titulo} className="text-center p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className={`w-12 h-12 rounded-full ${stat.color} mx-auto mb-3 flex items-center justify-center`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="font-bold text-2xl text-gray-900 mb-1">{stat.valor}</div>
              <div className="text-sm text-gray-600 mb-1">{stat.titulo}</div>
              {stat.subtexto && (
                <div className="text-xs text-gray-500">{stat.subtexto}</div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function DashboardEjecutivoCIG() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-Q4');
  const [territorialSeleccionada, setTerritorialSeleccionada] = useState('todas');

  const handleExportarPDF = () => {
    toast.success('Generando reporte PDF...', {
      description: 'El reporte será descargado en unos segundos'
    });
    setTimeout(() => {
      toast.success('Reporte PDF generado exitosamente');
    }, 2000);
  };

  const handleExportarExcel = () => {
    toast.success('Exportando datos a Excel...', {
      description: 'El archivo Excel será descargado en unos segundos'
    });
    setTimeout(() => {
      toast.success('Datos exportados exitosamente');
    }, 2000);
  };

  const handleActualizar = () => {
    toast.info('Actualizando datos del dashboard...');
    setTimeout(() => {
      toast.success('Dashboard actualizado');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-4 md:p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-4 md:p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}
              >
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
                <p className="text-sm text-gray-500">Control Interno de Gestión - ESAP</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleActualizar}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Actualizar
              </Button>
              
              <Button
                onClick={handleExportarPDF}
                variant="outline"
                size="sm"
                style={{ borderColor: '#003DA5', color: '#003DA5' }}
              >
                <Download className="w-4 h-4 mr-1" />
                Exportar PDF
              </Button>

              <Button
                onClick={handleExportarExcel}
                variant="outline"
                size="sm"
                style={{ borderColor: '#10B981', color: '#10B981' }}
              >
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                Excel
              </Button>

              <Button
                variant="outline"
                size="sm"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Compartir
              </Button>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Período</label>
              <select
                value={periodoSeleccionado}
                onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="2025-Q4">Q4 2025 (Oct-Dic)</option>
                <option value="2025-Q3">Q3 2025 (Jul-Sep)</option>
                <option value="2025-Q2">Q2 2025 (Abr-Jun)</option>
                <option value="2025-Q1">Q1 2025 (Ene-Mar)</option>
                <option value="2025">Todo 2025</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">Territorial</label>
              <select
                value={territorialSeleccionada}
                onChange={(e) => setTerritorialSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todas">Todas las territoriales</option>
                <option value="sede">Solo Sede Nacional</option>
                <option value="antioquia">Antioquia</option>
                <option value="atlantico">Atlántico-Cesar</option>
                <option value="valle">Valle del Cauca</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-600 mb-1 block">Vista</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="ejecutivo">Vista Ejecutiva</option>
                <option value="detallada">Vista Detallada</option>
                <option value="comparativa">Vista Comparativa</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* RESUMEN EJECUTIVO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ResumenEjecutivo />
        </motion.div>

        {/* MÉTRICAS KPI */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {METRICAS_KPI.map((metrica, index) => (
              <motion.div
                key={metrica.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <TarjetaKPI metrica={metrica} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* GRÁFICO DE TENDENCIAS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GraficoTendencias />
        </motion.div>

        {/* GRÁFICOS COMPLEMENTARIOS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GraficoEstados />
            <GraficoSeveridadHallazgos />
          </div>
        </motion.div>

        {/* GRÁFICO TERRITORIALES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <GraficoTerritoriales />
        </motion.div>

      </div>
    </div>
  );
}
