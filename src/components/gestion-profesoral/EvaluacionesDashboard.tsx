import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Award,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Download,
  Filter,
  Target,
  Star,
  FileText
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

interface EvaluacionesDashboardProps {
  className?: string;
}

export function EvaluacionesDashboard({ className = '' }: EvaluacionesDashboardProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-I');

  // Mock data - En producción vendría de Supabase
  const stats = {
    evaluaciones_completadas: 598,
    evaluaciones_pendientes: 154,
    promedio_general: 84.2,
    cambio_periodo_anterior: 2.3,
    tasa_respuesta: 79.4,
    planes_mejoramiento: 12
  };

  // Datos para el radar chart (Dimensiones de evaluación)
  const radarData = [
    { dimension: 'Dominio', promedio: 87, meta: 85, fullMark: 100 },
    { dimension: 'Metodología', promedio: 82, meta: 85, fullMark: 100 },
    { dimension: 'Evaluación', promedio: 85, meta: 85, fullMark: 100 },
    { dimension: 'Relaciones', promedio: 89, meta: 85, fullMark: 100 },
    { dimension: 'Compromiso', promedio: 86, meta: 85, fullMark: 100 }
  ];

  // Distribución de calificaciones
  const distribucionData = [
    { rango: 'Excelente\n(90-100)', cantidad: 245, porcentaje: 41 },
    { rango: 'Satisfactorio\n(80-89)', cantidad: 289, porcentaje: 48 },
    { rango: 'Aceptable\n(70-79)', cantidad: 52, porcentaje: 9 },
    { rango: 'Insatisfactorio\n(<70)', cantidad: 12, porcentaje: 2 }
  ];

  // Top docentes
  const topDocentes = [
    { nombre: 'María López Gómez', promedio: 94.5, territorial: 'Bogotá', evaluaciones: 45 },
    { nombre: 'Carlos Ruiz Pérez', promedio: 92.8, territorial: 'Medellín', evaluaciones: 38 },
    { nombre: 'Ana Martínez Silva', promedio: 91.3, territorial: 'Cali', evaluaciones: 42 },
    { nombre: 'Juan Torres Ramírez', promedio: 90.1, territorial: 'Barranquilla', evaluaciones: 35 },
    { nombre: 'Laura García Castro', promedio: 89.7, territorial: 'Bogotá', evaluaciones: 40 }
  ];

  // Docentes que requieren atención
  const atencionRequerida = [
    { nombre: 'Pedro Sánchez M.', promedio: 68.3, territorial: 'Bucaramanga', tiene_plan: true },
    { nombre: 'Sofía Díaz R.', promedio: 71.2, territorial: 'Medellín', tiene_plan: true },
    { nombre: 'Diego Vargas L.', promedio: 74.5, territorial: 'Cali', tiene_plan: false }
  ];

  const getBarColor = (porcentaje: number) => {
    if (porcentaje >= 40) return '#10B981'; // verde
    if (porcentaje >= 30) return '#3B82F6'; // azul
    if (porcentaje >= 10) return '#F59E0B'; // amarillo
    return '#EF4444'; // rojo
  };

  const getCalificacionColor = (promedio: number) => {
    if (promedio >= 90) return 'text-green-600';
    if (promedio >= 80) return 'text-blue-600';
    if (promedio >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Evaluación Docente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Dashboard de resultados y análisis de desempeño
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
          >
            <option value="2025-I">2025-I</option>
            <option value="2024-II">2024-II</option>
            <option value="2024-I">2024-I</option>
          </select>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Promedio General */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Promedio General</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.promedio_general}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-[#1e5da8]" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              {stats.cambio_periodo_anterior > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">+{stats.cambio_periodo_anterior}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">{stats.cambio_periodo_anterior}%</span>
                </>
              )}
              <span className="text-xs text-gray-500 ml-1">vs periodo anterior</span>
            </div>
          </Card>
        </motion.div>

        {/* Evaluaciones Completadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.evaluaciones_completadas}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Pendientes: {stats.evaluaciones_pendientes}</span>
              <span className="font-medium text-gray-900">{stats.tasa_respuesta}%</span>
            </div>
          </Card>
        </motion.div>

        {/* Tasa de Respuesta */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Tasa de Respuesta</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.tasa_respuesta}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <Progress value={stats.tasa_respuesta} className="h-2" />
          </Card>
        </motion.div>

        {/* Planes de Mejoramiento */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Planes Mejoramiento</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.planes_mejoramiento}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="text-xs text-gray-600">
              Docentes con calificación {'<'}75
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart - Dimensiones de Evaluación */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Dimensiones de Evaluación</h3>
            <Badge variant="secondary">Promedio Institucional</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]}
                tick={{ fill: '#6b7280', fontSize: 10 }}
              />
              <Radar
                name="Promedio"
                dataKey="promedio"
                stroke="#1e5da8"
                fill="#1e5da8"
                fillOpacity={0.5}
              />
              <Radar
                name="Meta"
                dataKey="meta"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.2}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-5 gap-2 mt-4">
            {radarData.map((item) => (
              <div key={item.dimension} className="text-center">
                <p className="text-xs text-gray-600 mb-1">{item.dimension}</p>
                <p className={`text-sm font-bold ${getCalificacionColor(item.promedio)}`}>
                  {item.promedio}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Bar Chart - Distribución de Calificaciones */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Distribución de Calificaciones</h3>
            <Badge variant="secondary">{stats.evaluaciones_completadas} evaluaciones</Badge>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribucionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="rango" 
                tick={{ fill: '#6b7280', fontSize: 11 }}
                interval={0}
              />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="cantidad" radius={[8, 8, 0, 0]}>
                {distribucionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.porcentaje)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {distribucionData.map((item) => (
              <div key={item.rango} className="text-center">
                <p className="text-xs text-gray-600 mb-1">{item.cantidad} docentes</p>
                <p className="text-sm font-bold text-gray-900">{item.porcentaje}%</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Two Columns: Top Docentes y Atención Requerida */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Docentes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Top 5 Docentes</h3>
            <Star className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {topDocentes.map((docente, index) => (
              <motion.div
                key={docente.nombre}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{docente.nombre}</p>
                  <p className="text-xs text-gray-600">{docente.territorial} • {docente.evaluaciones} evaluaciones</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${getCalificacionColor(docente.promedio)}`}>
                    {docente.promedio}
                  </p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(docente.promedio / 20)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Ver Ranking Completo
          </Button>
        </Card>

        {/* Atención Requerida */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900">Requieren Atención</h3>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-3">
            {atencionRequerida.map((docente, index) => (
              <motion.div
                key={docente.nombre}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 border border-amber-200 bg-amber-50 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{docente.nombre}</p>
                    <p className="text-xs text-gray-600 mt-1">{docente.territorial}</p>
                  </div>
                  <p className={`text-xl font-bold ${getCalificacionColor(docente.promedio)}`}>
                    {docente.promedio}
                  </p>
                </div>
                {docente.tiene_plan ? (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Plan en Ejecución
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    <Clock className="w-3 h-3 mr-1" />
                    Requiere Plan
                  </Badge>
                )}
              </motion.div>
            ))}
          </div>
          <Button className="w-full mt-4 bg-[#1e5da8] hover:bg-[#1a4d8f]">
            <FileText className="w-4 h-4 mr-2" />
            Gestionar Planes
          </Button>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-[#1e5da8] to-[#2a6dbd] text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <BarChart3 className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Ver Reportes</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <Users className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Por Departamento</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <Target className="w-6 h-6 mb-2" />
          <span className="text-sm font-medium">Planes Mejoramiento</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="p-4 bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        >
          <Download className="w-4 h-4 mb-2" />
          <span className="text-sm font-medium">Exportar Datos</span>
        </motion.button>
      </div>
    </div>
  );
}
