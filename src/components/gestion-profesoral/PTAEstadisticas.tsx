/**
 * ESTADÍSTICAS AVANZADAS DE PTAS
 * 
 * Panel con gráficos y métricas detalladas del sistema PTA
 * Incluye distribución por estados, territoriales, y tendencias
 * 
 * Fecha: 23 de diciembre de 2024
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

interface PTAEstadisticasProps {
  ptas: any[];
}

export function PTAEstadisticas({ ptas }: PTAEstadisticasProps) {
  
  // Calcular estadísticas generales
  const stats = useMemo(() => {
    const total = ptas.length;
    const aprobados = ptas.filter(p => p.estado === 'APROBADO_FINAL').length;
    const enAprobacion = ptas.filter(p => p.estado === 'EN_APROBACION' || p.estado === 'APROBADO_DIRECTOR').length;
    const enConstruccion = ptas.filter(p => p.estado === 'CONSTRUCCION').length;
    const rechazados = ptas.filter(p => p.estado.includes('RECHAZADO')).length;
    
    // Tiempo promedio de aprobación (en días)
    const tiemposAprobacion = ptas
      .filter(p => p.fecha_envio_aprobacion && p.fecha_aprobacion_final)
      .map(p => {
        const envio = new Date(p.fecha_envio_aprobacion).getTime();
        const aprobacion = new Date(p.fecha_aprobacion_final).getTime();
        return (aprobacion - envio) / (1000 * 60 * 60 * 24); // días
      });
    
    const tiempoPromedioAprobacion = tiemposAprobacion.length > 0
      ? (tiemposAprobacion.reduce((a, b) => a + b, 0) / tiemposAprobacion.length).toFixed(1)
      : '0';
    
    // Cumplimiento de horas
    const cumplimiento = ptas
      .filter(p => p.horas_totales && p.horas_programables)
      .map(p => (p.horas_totales / p.horas_programables) * 100);
    
    const cumplimientoPromedio = cumplimiento.length > 0
      ? (cumplimiento.reduce((a, b) => a + b, 0) / cumplimiento.length).toFixed(1)
      : '0';
    
    return {
      total,
      aprobados,
      enAprobacion,
      enConstruccion,
      rechazados,
      tasaAprobacion: total > 0 ? ((aprobados / total) * 100).toFixed(1) : '0',
      tiempoPromedioAprobacion,
      cumplimientoPromedio
    };
  }, [ptas]);
  
  // Datos para gráfico de distribución por estado
  const datosEstados = useMemo(() => [
    { nombre: 'En Construcción', valor: stats.enConstruccion, color: '#6b7280' },
    { nombre: 'En Aprobación', valor: stats.enAprobacion, color: '#3b82f6' },
    { nombre: 'Aprobados', valor: stats.aprobados, color: '#10b981' },
    { nombre: 'Rechazados', valor: stats.rechazados, color: '#ef4444' }
  ].filter(d => d.valor > 0), [stats]);
  
  // Datos para gráfico de distribución por territorial
  const datosTerritorial = useMemo(() => {
    const territoriales = [...new Set(ptas.map(p => p.territorial))];
    return territoriales.map(territorial => ({
      territorial,
      total: ptas.filter(p => p.territorial === territorial).length,
      aprobados: ptas.filter(p => p.territorial === territorial && p.estado === 'APROBADO_FINAL').length,
      pendientes: ptas.filter(p => p.territorial === territorial && p.estado !== 'APROBADO_FINAL').length
    }));
  }, [ptas]);
  
  // Datos para tendencia (últimos 7 días)
  const datosTendencia = useMemo(() => {
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      
      const creados = ptas.filter(p => p.fecha_creacion?.startsWith(fechaStr)).length;
      const aprobados = ptas.filter(p => p.fecha_aprobacion_final?.startsWith(fechaStr)).length;
      
      dias.push({
        fecha: fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
        creados,
        aprobados
      });
    }
    return dias;
  }, [ptas]);
  
  // Tooltip personalizado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            {payload[0].value} PTAs
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total PTAs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">
            En el sistema
          </p>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <Badge className="bg-green-600">{stats.tasaAprobacion}%</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-1">Tasa de Aprobación</p>
          <p className="text-2xl font-bold text-green-600">{stats.aprobados}</p>
          <p className="text-xs text-gray-500 mt-2">
            De {stats.total} PTAs totales
          </p>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">Promedio</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-1">Tiempo de Aprobación</p>
          <p className="text-2xl font-bold text-purple-600">{stats.tiempoPromedioAprobacion} días</p>
          <p className="text-xs text-gray-500 mt-2">
            Desde envío hasta aprobación
          </p>
        </Card>
        
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <Badge variant="outline" className="bg-orange-50 text-orange-700">Meta: 95%</Badge>
          </div>
          <p className="text-sm text-gray-600 mb-1">Cumplimiento de Horas</p>
          <p className="text-2xl font-bold text-orange-600">{stats.cumplimientoPromedio}%</p>
          <p className="text-xs text-gray-500 mt-2">
            Promedio de llenado del PTA
          </p>
        </Card>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Estado */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución por Estado</h3>
          {datosEstados.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datosEstados}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.nombre} (${entry.valor})`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="valor"
                >
                  {datosEstados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <p>No hay datos disponibles</p>
            </div>
          )}
        </Card>
        
        {/* Distribución por Territorial */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">PTAs por Territorial</h3>
          {datosTerritorial.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosTerritorial}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="territorial" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="aprobados" fill="#10b981" name="Aprobados" />
                <Bar dataKey="pendientes" fill="#3b82f6" name="Pendientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <p>No hay datos disponibles</p>
            </div>
          )}
        </Card>
      </div>
      
      {/* Tendencia de Creación y Aprobación */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Tendencia (Últimos 7 días)</h3>
        {datosTendencia.some(d => d.creados > 0 || d.aprobados > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosTendencia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="creados" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="PTAs Creados"
              />
              <Line 
                type="monotone" 
                dataKey="aprobados" 
                stroke="#10b981" 
                strokeWidth={2}
                name="PTAs Aprobados"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            <p>No hay actividad en los últimos 7 días</p>
          </div>
        )}
      </Card>
      
      {/* Resumen por Estado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">En Construcción</p>
            <Badge className="bg-gray-600">{stats.enConstruccion}</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.enConstruccion}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((stats.enConstruccion / stats.total) * 100).toFixed(1)}% del total
          </p>
        </Card>
        
        <Card className="p-4 border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">En Aprobación</p>
            <Badge className="bg-blue-600">{stats.enAprobacion}</Badge>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats.enAprobacion}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((stats.enAprobacion / stats.total) * 100).toFixed(1)}% del total
          </p>
        </Card>
        
        <Card className="p-4 border-l-4 border-green-600">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Aprobados</p>
            <Badge className="bg-green-600">{stats.aprobados}</Badge>
          </div>
          <p className="text-2xl font-bold text-green-600">{stats.aprobados}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.tasaAprobacion}% del total
          </p>
        </Card>
        
        <Card className="p-4 border-l-4 border-red-600">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Rechazados</p>
            <Badge className="bg-red-600">{stats.rechazados}</Badge>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.rechazados}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((stats.rechazados / stats.total) * 100).toFixed(1)}% del total
          </p>
        </Card>
      </div>
    </div>
  );
}
