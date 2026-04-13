import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Globe,
  Smartphone
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@esap-mfe/shared-ui/select';

export function AnalyticsDashboard() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data para gráficas
  const validacionesPorDia = [
    { fecha: 'Lun', validos: 45, invalidos: 5, vencidos: 3, anulados: 2 },
    { fecha: 'Mar', validos: 52, invalidos: 8, vencidos: 4, anulados: 1 },
    { fecha: 'Mié', validos: 48, invalidos: 6, vencidos: 2, anulados: 3 },
    { fecha: 'Jue', validos: 61, invalidos: 4, vencidos: 5, anulados: 2 },
    { fecha: 'Vie', validos: 58, invalidos: 7, vencidos: 3, anulados: 1 },
    { fecha: 'Sáb', validos: 35, invalidos: 3, vencidos: 2, anulados: 0 },
    { fecha: 'Dom', validos: 28, invalidos: 2, vencidos: 1, anulados: 1 }
  ];

  const validacionesPorHora = [
    { hora: '00:00', cantidad: 5 },
    { hora: '02:00', cantidad: 3 },
    { hora: '04:00', cantidad: 2 },
    { hora: '06:00', cantidad: 8 },
    { hora: '08:00', cantidad: 25 },
    { hora: '10:00', cantidad: 42 },
    { hora: '12:00', cantidad: 38 },
    { hora: '14:00', cantidad: 45 },
    { hora: '16:00', cantidad: 35 },
    { hora: '18:00', cantidad: 18 },
    { hora: '20:00', cantidad: 12 },
    { hora: '22:00', cantidad: 8 }
  ];

  const distribucionPorEstado = [
    { name: 'Válidos', value: 327, color: '#10B981' },
    { name: 'Inválidos', value: 35, color: '#EF4444' },
    { name: 'Vencidos', value: 20, color: '#F59E0B' },
    { name: 'Anulados', value: 10, color: '#6B7280' }
  ];

  const distribucionPorMetodo = [
    { name: 'Web', value: 245, color: '#3B82F6' },
    { name: 'API', value: 89, color: '#8B5CF6' },
    { name: 'Mobile', value: 42, color: '#10B981' },
    { name: 'QR Scanner', value: 16, color: '#F59E0B' }
  ];

  const tiempoRespuesta = [
    { metodo: 'Web', promedio: 245, min: 180, max: 320 },
    { metodo: 'API', promedio: 198, min: 150, max: 280 },
    { metodo: 'Mobile', promedio: 312, min: 220, max: 450 },
    { metodo: 'Scanner', promedio: 278, min: 200, max: 380 }
  ];

  const topUbicaciones = [
    { ciudad: 'Bogotá', validaciones: 145, porcentaje: 37 },
    { ciudad: 'Medellín', validaciones: 78, porcentaje: 20 },
    { ciudad: 'Cali', validaciones: 62, porcentaje: 16 },
    { ciudad: 'Barranquilla', validaciones: 45, porcentaje: 11 },
    { ciudad: 'Cartagena', validaciones: 32, porcentaje: 8 },
    { ciudad: 'Otras', validaciones: 30, porcentaje: 8 }
  ];

  const metricsComparativas = {
    totalValidaciones: {
      actual: 392,
      anterior: 348,
      cambio: 12.6,
      tendencia: 'up' as const
    },
    validacionesExitosas: {
      actual: 327,
      anterior: 289,
      cambio: 13.1,
      tendencia: 'up' as const
    },
    tiempoPromedio: {
      actual: 258,
      anterior: 312,
      cambio: -17.3,
      tendencia: 'up' as const // mejora (menor tiempo)
    },
    intentosFreude: {
      actual: 35,
      anterior: 42,
      cambio: -16.7,
      tendencia: 'up' as const // mejora (menos intentos)
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simular carga de datos
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  const handleExportData = () => {
    console.log('Exportar datos analíticos...');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-[1600px] mx-auto">
        {/* Header - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-8"
        >
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            {/* Title Section */}
            <div className="flex items-start gap-3 sm:gap-4">
              <div 
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                  boxShadow: '0 4px 12px rgba(0, 61, 165, 0.2)'
                }}
              >
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-white" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 
                  className="font-bold text-xl sm:text-2xl lg:text-3xl"
                  style={{
                    lineHeight: '1.2',
                    color: '#1F2937'
                  }}
                >
                  Analíticas de Validación
                </h1>
                <p 
                  className="text-gray-600 text-sm sm:text-base mt-1"
                  style={{
                    lineHeight: '1.5'
                  }}
                >
                  Dashboard completo de métricas y tendencias
                </p>
              </div>
            </div>

            {/* Controls - Stack on mobile */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                <SelectTrigger className="w-full sm:w-[180px] min-h-[48px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24 horas</SelectItem>
                  <SelectItem value="7d">Últimos 7 días</SelectItem>
                  <SelectItem value="30d">Últimos 30 días</SelectItem>
                  <SelectItem value="90d">Últimos 90 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>

              <Button
                className="bg-[#003DA5] hover:bg-[#002873]"
                onClick={handleExportData}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPIs Principales */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Total Validaciones */}
          <Card className="p-6 border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              {metricsComparativas.totalValidaciones.tendencia === 'up' ? (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{metricsComparativas.totalValidaciones.cambio}%
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 border-red-300">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  {metricsComparativas.totalValidaciones.cambio}%
                </Badge>
              )}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {metricsComparativas.totalValidaciones.actual.toLocaleString()}
            </h3>
            <p className="text-sm text-gray-600">Total de Validaciones</p>
            <p className="text-xs text-gray-500 mt-2">
              vs {metricsComparativas.totalValidaciones.anterior} período anterior
            </p>
          </Card>

          {/* Validaciones Exitosas */}
          <Card className="p-6 border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-green-100 p-3 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{metricsComparativas.validacionesExitosas.cambio}%
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {metricsComparativas.validacionesExitosas.actual.toLocaleString()}
            </h3>
            <p className="text-sm text-gray-600">Exitosas</p>
            <p className="text-xs text-gray-500 mt-2">
              Tasa de éxito: {((metricsComparativas.validacionesExitosas.actual / metricsComparativas.totalValidaciones.actual) * 100).toFixed(1)}%
            </p>
          </Card>

          {/* Tiempo Promedio */}
          <Card className="p-6 border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-purple-100 p-3 rounded-xl">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                {Math.abs(metricsComparativas.tiempoPromedio.cambio)}% más rápido
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {metricsComparativas.tiempoPromedio.actual}ms
            </h3>
            <p className="text-sm text-gray-600">Tiempo Promedio</p>
            <p className="text-xs text-gray-500 mt-2">
              Antes: {metricsComparativas.tiempoPromedio.anterior}ms
            </p>
          </Card>

          {/* Intentos Fraudulentos */}
          <Card className="p-6 border-2 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <TrendingUp className="w-3 h-3 mr-1" />
                {Math.abs(metricsComparativas.intentosFreude.cambio)}% menos
              </Badge>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {metricsComparativas.intentosFreude.actual}
            </h3>
            <p className="text-sm text-gray-600">Intentos Inválidos</p>
            <p className="text-xs text-gray-500 mt-2">
              {((metricsComparativas.intentosFreude.actual / metricsComparativas.totalValidaciones.actual) * 100).toFixed(1)}% del total
            </p>
          </Card>
        </motion.div>

        {/* Gráficas Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Validaciones por Día */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card className="p-6 border-2">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Tendencia de Validaciones
                </h3>
                <p className="text-sm text-gray-600">
                  Desglose por resultado durante los últimos 7 días
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={validacionesPorDia}>
                  <defs>
                    <linearGradient id="colorValidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInvalidos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="fecha" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="validos" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#colorValidos)" 
                    name="Válidos"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="invalidos" 
                    stroke="#EF4444" 
                    fillOpacity={1} 
                    fill="url(#colorInvalidos)" 
                    name="Inválidos"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="vencidos" 
                    stroke="#F59E0B" 
                    fill="#F59E0B" 
                    fillOpacity={0.3}
                    name="Vencidos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Distribución por Estado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 border-2">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Distribución por Estado
                </h3>
                <p className="text-sm text-gray-600">
                  Resultados totales
                </p>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribucionPorEstado}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribucionPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Gráficas Secundarias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Validaciones por Hora */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="p-6 border-2">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Actividad por Hora
                </h3>
                <p className="text-sm text-gray-600">
                  Promedio de validaciones según hora del día
                </p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={validacionesPorHora}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="hora" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="cantidad" 
                    stroke="#003DA5" 
                    strokeWidth={3}
                    dot={{ fill: '#003DA5', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Validaciones"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>

          {/* Tiempo de Respuesta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="p-6 border-2">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  Tiempo de Respuesta por Método
                </h3>
                <p className="text-sm text-gray-600">
                  Comparativa de rendimiento (ms)
                </p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tiempoRespuesta}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="metodo" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="promedio" fill="#003DA5" name="Promedio" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="min" fill="#10B981" name="Mínimo" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="max" fill="#EF4444" name="Máximo" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>

        {/* Tablas de Datos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Ubicaciones */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className="p-6 border-2">
              <div className="flex items-center gap-3 mb-6">
                <Globe className="w-5 h-5 text-[#003DA5]" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Top Ubicaciones
                  </h3>
                  <p className="text-sm text-gray-600">
                    Ciudades con más validaciones
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {topUbicaciones.map((ubicacion, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="font-semibold text-gray-900 w-8">
                        #{index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{ubicacion.ciudad}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-[#003DA5] h-2 rounded-full transition-all"
                            style={{ width: `${ubicacion.porcentaje}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-gray-900">{ubicacion.validaciones}</p>
                      <p className="text-xs text-gray-500">{ubicacion.porcentaje}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Métodos de Validación */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Card className="p-6 border-2">
              <div className="flex items-center gap-3 mb-6">
                <Smartphone className="w-5 h-5 text-[#003DA5]" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Métodos de Validación
                  </h3>
                  <p className="text-sm text-gray-600">
                    Uso por canal
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={distribucionPorMetodo} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" stroke="#6B7280" />
                  <YAxis dataKey="name" type="category" stroke="#6B7280" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {distribucionPorMetodo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}