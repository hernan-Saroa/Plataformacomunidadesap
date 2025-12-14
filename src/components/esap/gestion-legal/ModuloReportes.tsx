/**
 * MÓDULO DE REPORTES ESTADÍSTICOS
 * Análisis y visualización de datos del módulo de juzgamiento
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3, Download, Calendar, Filter, TrendingUp, TrendingDown,
  PieChart, FileText, Users, Clock, Scale, AlertTriangle
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

export function ModuloReportes() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes-actual');

  const handleExportar = (formato: 'pdf' | 'excel') => {
    toast.success(`Exportando reporte en ${formato.toUpperCase()}`, {
      description: 'El archivo se descargará en unos segundos',
      duration: 2000
    });
  };

  // Datos mock
  const estadisticas = {
    totalExpedientes: 45,
    porEtapa: {
      'Recibido': 5,
      'Auto Inicial': 3,
      'Traslado Descargos': 8,
      'Descargos Presentados': 4,
      'Práctica Pruebas': 6,
      'Alegatos': 3,
      'Proyecto Fallo': 5,
      'Fallo Notificado': 7,
      'En Apelación': 2,
      'Ejecutoriado': 2
    },
    porAbogado: {
      'Dr. Carlos Mendoza': 12,
      'Dra. María Torres': 15,
      'Dr. Luis Ramírez': 10,
      'Dra. Patricia González': 8
    },
    porSancion: {
      'Amonestación': 8,
      'Multa': 12,
      'Suspensión': 15,
      'Destitución': 7,
      'Inhabilidad': 3
    },
    porFalta: {
      'Leve': 18,
      'Grave': 20,
      'Gravísima': 7
    },
    tendencias: {
      nuevosMes: 12,
      finalizadosMes: 8,
      promedioDias: 145,
      tasaEjecucion: 78
    }
  };

  const getColorEtapa = (etapa: string) => {
    const colores: Record<string, string> = {
      'Recibido': '#17A2B8',
      'Auto Inicial': '#6366F1',
      'Traslado Descargos': '#F59E0B',
      'Descargos Presentados': '#10B981',
      'Práctica Pruebas': '#8B5CF6',
      'Alegatos': '#EC4899',
      'Proyecto Fallo': '#6F42C1',
      'Fallo Notificado': '#20C997',
      'En Apelación': '#FD7E14',
      'Ejecutoriado': '#28A745'
    };
    return colores[etapa] || '#6B7280';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ color: '#6F42C1' }}>
            Reportes Estadísticos
          </h2>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Análisis y métricas del módulo de juzgamiento disciplinario
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleExportar('pdf')}
            className="border-2"
            style={{ borderColor: '#E5E7EB' }}
          >
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportar('excel')}
            className="border-2"
            style={{ borderColor: '#E5E7EB' }}
          >
            <Download className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#6B7280' }} />
            <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
              Período:
            </span>
          </div>
          <select
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="px-3 py-2 border-2 rounded-lg text-sm font-medium"
            style={{ borderColor: '#E5E7EB' }}
          >
            <option value="semana">Última semana</option>
            <option value="mes-actual">Mes actual</option>
            <option value="trimestre">Último trimestre</option>
            <option value="semestre">Último semestre</option>
            <option value="ano">Último año</option>
            <option value="todo">Todo el tiempo</option>
          </select>
          <Button variant="outline" size="sm" className="border-2 ml-auto">
            <Filter className="w-4 h-4 mr-2" />
            Más Filtros
          </Button>
        </div>
      </Card>

      {/* Resumen Ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#F3E8FF' }}>
              <FileText className="w-6 h-6" style={{ color: '#6F42C1' }} />
            </div>
            <Badge style={{ background: '#DBEAFE', color: '#1E40AF' }}>
              <TrendingUp className="w-3 h-3 mr-1" />
              +12
            </Badge>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {estadisticas.totalExpedientes}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Total Expedientes
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
              <TrendingUp className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
            <Badge style={{ background: '#D1FAE5', color: '#065F46' }}>
              {estadisticas.tendencias.tasaEjecucion}%
            </Badge>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {estadisticas.tendencias.finalizadosMes}
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Finalizados este mes
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#E0F2FE' }}>
              <Clock className="w-6 h-6" style={{ color: '#0284C7' }} />
            </div>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            {estadisticas.tendencias.promedioDias}d
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            Promedio de duración
          </p>
        </Card>

        <Card className="p-5 border-2 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
            <Badge style={{ background: '#FEE2E2', color: '#991B1B' }}>
              Crítico
            </Badge>
          </div>
          <p className="text-3xl font-black mb-1" style={{ color: '#1F2937' }}>
            3
          </p>
          <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
            En riesgo prescripción
          </p>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribución por Etapa */}
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Expedientes por Etapa
            </h3>
            <PieChart className="w-5 h-5" style={{ color: '#6F42C1' }} />
          </div>
          <div className="space-y-3">
            {Object.entries(estadisticas.porEtapa).map(([etapa, cantidad]) => {
              const color = getColorEtapa(etapa);
              const porcentaje = (cantidad / estadisticas.totalExpedientes) * 100;

              return (
                <div key={etapa}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                        {etapa}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>
                      {cantidad} ({porcentaje.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${porcentaje}%` }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribución por Abogado */}
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Carga por Abogado
            </h3>
            <Users className="w-5 h-5" style={{ color: '#6F42C1' }} />
          </div>
          <div className="space-y-3">
            {Object.entries(estadisticas.porAbogado).map(([abogado, cantidad]) => {
              const porcentaje = (cantidad / estadisticas.totalExpedientes) * 100;
              const color = cantidad > 12 ? '#DC2626' : cantidad > 8 ? '#F59E0B' : '#10B981';

              return (
                <div key={abogado}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                      {abogado}
                    </span>
                    <span className="text-sm font-bold" style={{ color }}>
                      {cantidad} expedientes
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${porcentaje}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribución por Sanción */}
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Tipos de Sanción
            </h3>
            <Scale className="w-5 h-5" style={{ color: '#6F42C1' }} />
          </div>
          <div className="space-y-3">
            {Object.entries(estadisticas.porSancion).map(([sancion, cantidad]) => {
              const colores: Record<string, string> = {
                'Amonestación': '#FFC107',
                'Multa': '#FD7E14',
                'Suspensión': '#E74C3C',
                'Destitución': '#C0392B',
                'Inhabilidad': '#2C3E50'
              };
              const color = colores[sancion];
              const total = Object.values(estadisticas.porSancion).reduce((a, b) => a + b, 0);
              const porcentaje = (cantidad / total) * 100;

              return (
                <div key={sancion}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-sm font-medium" style={{ color: '#4B5563' }}>
                        {sancion}
                      </span>
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>
                      {cantidad} ({porcentaje.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${porcentaje}%` }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribución por Tipo de Falta */}
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg" style={{ color: '#1F2937' }}>
              Tipo de Falta
            </h3>
            <BarChart3 className="w-5 h-5" style={{ color: '#6F42C1' }} />
          </div>
          <div className="space-y-4">
            {Object.entries(estadisticas.porFalta).map(([falta, cantidad]) => {
              const colores = {
                'Leve': '#DBEAFE',
                'Grave': '#FEF3C7',
                'Gravísima': '#FEE2E2'
              };
              const textColores = {
                'Leve': '#1E40AF',
                'Grave': '#92400E',
                'Gravísima': '#991B1B'
              };
              
              return (
                <div
                  key={falta}
                  className="p-4 rounded-lg"
                  style={{ background: colores[falta as keyof typeof colores] }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold" style={{ color: textColores[falta as keyof typeof textColores] }}>
                      {falta}
                    </span>
                    <span className="text-2xl font-black" style={{ color: textColores[falta as keyof typeof textColores] }}>
                      {cantidad}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: textColores[falta as keyof typeof textColores] }}>
                    {((cantidad / estadisticas.totalExpedientes) * 100).toFixed(0)}% del total
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Info */}
      <Card className="p-4 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg" style={{ background: '#E0F2FE' }}>
            <BarChart3 className="w-5 h-5" style={{ color: '#0284C7' }} />
          </div>
          <div>
            <p className="text-sm font-bold mb-1" style={{ color: '#1F2937' }}>
              📊 Reportes Interactivos
            </p>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              Los reportes se actualizan en tiempo real según los filtros seleccionados. 
              Puedes exportar los datos en formato PDF o Excel para análisis externos.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
