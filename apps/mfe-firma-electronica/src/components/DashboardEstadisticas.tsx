/**
 * DashboardEstadisticas - Dashboard Analítico con Gráficos
 * Diseño premium con recharts para visualización de datos
 */

import { Card } from '@esap-mfe/shared-ui/card';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import {
  X, TrendingUp, TrendingDown, Download, Calendar,
  FileText, Users, Clock, Award, BarChart3, PieChart
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

interface DashboardEstadisticasProps {
  isOpen: boolean;
  onClose: () => void;
  documentos: any[];
}

export function DashboardEstadisticas({ isOpen, onClose, documentos }: DashboardEstadisticasProps) {
  if (!isOpen) return null;

  // Calcular estadísticas
  const totalDocumentos = documentos.length;
  const documentosFirmados = documentos.filter(d => d.estado === 'firmado').length;
  const documentosEnProceso = documentos.filter(d => d.estado === 'en_proceso').length;
  const documentosPendientes = documentos.filter(d => d.estado === 'pendiente').length;
  
  const tasaCompletitud = totalDocumentos > 0 
    ? ((documentosFirmados / totalDocumentos) * 100).toFixed(1)
    : 0;

  // Datos para gráfico de línea (últimos 6 meses)
  const datosLinea = [
    { mes: 'Jul', firmados: 12, pendientes: 8 },
    { mes: 'Ago', firmados: 19, pendientes: 5 },
    { mes: 'Sep', firmados: 15, pendientes: 10 },
    { mes: 'Oct', firmados: 25, pendientes: 7 },
    { mes: 'Nov', firmados: 22, pendientes: 12 },
    { mes: 'Dic', firmados: documentosFirmados, pendientes: documentosPendientes }
  ];

  // Datos para gráfico de barras (por tipo)
  const tiposDocumentos = Array.from(new Set(documentos.map(d => d.tipo)));
  const datosBarras = tiposDocumentos.map(tipo => ({
    tipo,
    cantidad: documentos.filter(d => d.tipo === tipo).length
  }));

  // Datos para gráfico circular (estados)
  const datosPie = [
    { name: 'Firmados', value: documentosFirmados, color: '#10B981' },
    { name: 'En Proceso', value: documentosEnProceso, color: '#F59E0B' },
    { name: 'Pendientes', value: documentosPendientes, color: '#EF4444' }
  ];

  // Firmantes más activos
  const todosLosFirmantes = documentos.flatMap(d => 
    d.firmantes.filter((f: any) => f.estado === 'firmado').map((f: any) => f.nombre)
  );
  const conteofirmantes: Record<string, number> = {};
  todosLosFirmantes.forEach(nombre => {
    conteofirmantes[nombre] = (conteofirmantes[nombre] || 0) + 1;
  });
  const topFirmantes = Object.entries(conteofirmantes)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Tiempo promedio de firma (simulado)
  const tiempoPromedioHoras = Math.floor(Math.random() * 48) + 12; // 12-60 horas

  const handleDescargarReporte = () => {
    toast.loading('📊 Generando reporte de estadísticas...', {
      id: 'descargar-reporte',
      duration: 2000
    });

    setTimeout(() => {
      toast.success('✅ Reporte descargado', {
        id: 'descargar-reporte',
        description: 'Estadisticas_Firma_Electronica.pdf',
        duration: 3000
      });
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Dashboard de Estadísticas</h2>
              <p className="text-sm text-purple-100">Análisis completo de firma electrónica</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDescargarReporte}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white font-medium"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Descargar Reporte
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* KPIs Principales */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="p-4 border-2 border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-xs text-blue-700 font-semibold mb-1">Total Documentos</p>
              <p className="text-3xl font-black text-blue-900">{totalDocumentos}</p>
            </Card>

            <Card className="p-4 border-2 border-green-200 bg-green-50">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <Badge className="bg-green-600 text-white text-xs font-bold">{tasaCompletitud}%</Badge>
              </div>
              <p className="text-xs text-green-700 font-semibold mb-1">Firmados</p>
              <p className="text-3xl font-black text-green-900">{documentosFirmados}</p>
            </Card>

            <Card className="p-4 border-2 border-orange-200 bg-orange-50">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xs text-orange-700 font-semibold mb-1">En Proceso</p>
              <p className="text-3xl font-black text-orange-900">{documentosEnProceso}</p>
            </Card>

            <Card className="p-4 border-2 border-purple-200 bg-purple-50">
              <div className="flex items-center justify-between mb-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span className="text-xs font-bold text-purple-700">~{tiempoPromedioHoras}h</span>
              </div>
              <p className="text-xs text-purple-700 font-semibold mb-1">Tiempo Promedio</p>
              <p className="text-xl font-black text-purple-900">{tiempoPromedioHoras} horas</p>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Gráfico de Línea - Tendencia */}
            <Card className="p-5 border-2 border-gray-200">
              <div className="mb-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  📈 Tendencia de Firmas
                </h3>
                <p className="text-sm text-gray-600">Últimos 6 meses</p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={datosLinea}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="firmados"
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Firmados"
                    dot={{ fill: '#10B981', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pendientes"
                    stroke="#EF4444"
                    strokeWidth={3}
                    name="Pendientes"
                    dot={{ fill: '#EF4444', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráfico Circular - Estados */}
            <Card className="p-5 border-2 border-gray-200">
              <div className="mb-4">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  🎯 Distribución por Estado
                </h3>
                <p className="text-sm text-gray-600">Estado actual de documentos</p>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={datosPie}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {datosPie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Gráfico de Barras - Tipos de Documento */}
          <Card className="p-5 border-2 border-gray-200 mb-6">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                📊 Documentos por Tipo
              </h3>
              <p className="text-sm text-gray-600">Distribución de tipos de documento</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosBarras}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="tipo" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="cantidad" fill="#003DA5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Top Firmantes */}
          <Card className="p-5 border-2 border-gray-200">
            <div className="mb-4">
              <h3 className="font-bold text-lg text-gray-900 mb-1">
                🏆 Top Firmantes
              </h3>
              <p className="text-sm text-gray-600">Usuarios más activos en firma de documentos</p>
            </div>
            <div className="space-y-3">
              {topFirmantes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay datos de firmantes</p>
              ) : (
                topFirmantes.map(([nombre, cantidad], index) => (
                  <div key={nombre} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-600' :
                          'bg-blue-500'
                        }`}
                      >
                        #{index + 1}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{nombre}</p>
                      <p className="text-sm text-gray-600">{cantidad} documento{cantidad > 1 ? 's' : ''} firmado{cantidad > 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <Badge className="bg-blue-100 text-blue-700 font-bold">
                        {cantidad} firma{cantidad > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Datos actualizados: {new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <Button
            onClick={onClose}
            className="font-medium"
            style={{ background: '#003DA5', color: '#FFFFFF' }}
          >
            Cerrar
          </Button>
        </div>
      </Card>
    </div>
  );
}