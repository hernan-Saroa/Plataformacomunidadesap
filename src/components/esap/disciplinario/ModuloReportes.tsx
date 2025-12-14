/**
 * MÓDULO DE REPORTES - Control Disciplinario
 * Estadísticas avanzadas y exportación de datos
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Download, FileText, Calendar, Filter, TrendingUp, TrendingDown,
  BarChart3, PieChart, Clock, AlertTriangle, CheckCircle, Users,
  FolderOpen, Target, Award, Zap
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { toast } from 'sonner@2.0.3';

export function ModuloReportes() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('mes-actual');
  const [tipoReporte, setTipoReporte] = useState('general');

  // Mock data de estadísticas
  const estadisticas = {
    totalProcesos: 142,
    cambioMes: 12,
    procesosActivos: 45,
    procesosFinalizados: 97,
    promedioResolucion: 85, // días
    tasaEfectividad: 94.2,
    procesosVencidos: 8,
    procesosEnRiesgo: 12
  };

  const distribucionEtapas = [
    { etapa: 'Recepción', cantidad: 5, porcentaje: 11 },
    { etapa: 'Valoración', cantidad: 8, porcentaje: 18 },
    { etapa: 'Indagación', cantidad: 12, porcentaje: 27 },
    { etapa: 'Investigación', cantidad: 10, porcentaje: 22 },
    { etapa: 'Juzgamiento', cantidad: 7, porcentaje: 16 },
    { etapa: 'Fallo', cantidad: 3, porcentaje: 6 }
  ];

  const rendimientoProfesionales = [
    { nombre: 'Juan Pérez', procesos: 8, efectividad: 95.5, promedioDias: 75 },
    { nombre: 'María Torres', procesos: 6, efectividad: 98.2, promedioDias: 68 },
    { nombre: 'Carlos Mendoza', procesos: 11, efectividad: 87.3, promedioDias: 92 },
    { nombre: 'Ana González', procesos: 5, efectividad: 100, promedioDias: 62 }
  ];

  const tiempoPromedioEtapas = [
    { etapa: 'Recepción', dias: 5, optimo: 3 },
    { etapa: 'Valoración', dias: 12, optimo: 10 },
    { etapa: 'Indagación', dias: 45, optimo: 40 },
    { etapa: 'Investigación', dias: 90, optimo: 80 },
    { etapa: 'Juzgamiento', dias: 60, optimo: 50 },
    { etapa: 'Fallo', dias: 15, optimo: 10 }
  ];

  const reportesDisponibles = [
    {
      id: 'general',
      titulo: 'Reporte General',
      descripcion: 'Vista completa de todos los procesos y métricas',
      icono: BarChart3,
      color: '#003DA5'
    },
    {
      id: 'profesionales',
      titulo: 'Rendimiento de Profesionales',
      descripcion: 'Desempeño individual del equipo',
      icono: Users,
      color: '#10B981'
    },
    {
      id: 'tiempos',
      titulo: 'Análisis de Tiempos',
      descripcion: 'Duración promedio por etapa',
      icono: Clock,
      color: '#F59E0B'
    },
    {
      id: 'vencimientos',
      titulo: 'Control de Vencimientos',
      descripcion: 'Procesos vencidos y en riesgo',
      icono: AlertTriangle,
      color: '#DC2626'
    }
  ];

  const handleExportar = (formato: 'excel' | 'pdf') => {
    toast.success(`Exportando reporte a ${formato.toUpperCase()}...`, {
      description: 'La descarga comenzará en unos segundos'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: '#003DA5' }}>
            Reportes y Estadísticas
          </h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Análisis avanzado del sistema disciplinario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportar('excel')}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
            style={{ background: '#10B981', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExportar('pdf')}
            className="px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:opacity-90"
            style={{ background: '#DC2626', color: '#FFFFFF' }}
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5" style={{ color: '#6B7280' }} />
            <span className="text-sm font-semibold" style={{ color: '#4B5563' }}>
              Período:
            </span>
          </div>
          <select
            className="px-4 py-2.5 rounded-xl border-2 focus:outline-none font-semibold"
            style={{ borderColor: '#E5E7EB', color: '#4B5563' }}
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
          >
            <option value="hoy">Hoy</option>
            <option value="semana-actual">Esta semana</option>
            <option value="mes-actual">Este mes</option>
            <option value="trimestre">Último trimestre</option>
            <option value="semestre">Último semestre</option>
            <option value="ano">Este año</option>
            <option value="personalizado">Personalizado</option>
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-5 h-5" style={{ color: '#6B7280' }} />
            <span className="text-sm font-semibold" style={{ color: '#4B5563' }}>
              Tipo:
            </span>
          </div>
          <select
            className="px-4 py-2.5 rounded-xl border-2 focus:outline-none font-semibold"
            style={{ borderColor: '#E5E7EB', color: '#4B5563' }}
            value={tipoReporte}
            onChange={(e) => setTipoReporte(e.target.value)}
          >
            <option value="general">General</option>
            <option value="profesionales">Por Profesional</option>
            <option value="etapas">Por Etapa</option>
            <option value="territoriales">Por Territorial</option>
          </select>
        </div>
      </Card>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
                <FolderOpen className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" style={{ color: '#10B981' }} />
                <span className="text-xs font-bold" style={{ color: '#10B981' }}>
                  +{estadisticas.cambioMes}%
                </span>
              </div>
            </div>
            <h3 className="text-3xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
              {estadisticas.totalProcesos}
            </h3>
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Total de Procesos
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#D1FAE5' }}>
                <CheckCircle className="w-6 h-6" style={{ color: '#10B981' }} />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold mb-1" style={{ color: '#10B981' }}>
              {estadisticas.procesosActivos}
            </h3>
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Procesos Activos
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold mb-1" style={{ color: '#F59E0B' }}>
              {estadisticas.promedioResolucion}
            </h3>
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Días Promedio
            </p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 border-2 hover:shadow-lg transition-all" style={{ borderColor: '#E5E7EB' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl" style={{ background: '#E0EDFF' }}>
                <Target className="w-6 h-6" style={{ color: '#003DA5' }} />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold mb-1" style={{ color: '#003DA5' }}>
              {estadisticas.tasaEfectividad}%
            </h3>
            <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>
              Tasa de Efectividad
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Tipos de Reportes */}
      <div>
        <h2 className="text-xl font-extrabold mb-4" style={{ color: '#1F2937' }}>
          Reportes Disponibles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reportesDisponibles.map((reporte) => {
            const Icon = reporte.icono;
            return (
              <motion.div
                key={reporte.id}
                whileHover={{ scale: 1.03, y: -4 }}
                className="cursor-pointer"
              >
                <Card className="p-6 border-2 hover:shadow-xl transition-all" style={{ borderColor: '#E5E7EB' }}>
                  <div className="p-3 rounded-xl mb-4" style={{ background: `${reporte.color}15` }}>
                    <Icon className="w-8 h-8" style={{ color: reporte.color }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2" style={{ color: '#1F2937' }}>
                    {reporte.titulo}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                    {reporte.descripcion}
                  </p>
                  <button
                    onClick={() => toast.info(`Generando ${reporte.titulo}...`)}
                    className="w-full px-4 py-2 rounded-lg font-semibold text-sm"
                    style={{ background: reporte.color, color: '#FFFFFF' }}
                  >
                    Generar
                  </button>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Distribución por Etapas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
            Distribución por Etapas
          </h3>
          <div className="space-y-4">
            {distribucionEtapas.map((item) => (
              <div key={item.etapa}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: '#4B5563' }}>
                    {item.etapa}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: '#003DA5' }}>
                      {item.cantidad}
                    </span>
                    <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
                      ({item.porcentaje}%)
                    </span>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.porcentaje}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: '#003DA5' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Rendimiento de Profesionales */}
        <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
            Rendimiento de Profesionales
          </h3>
          <div className="space-y-4">
            {rendimientoProfesionales.map((prof, index) => (
              <div 
                key={prof.nombre} 
                className="p-4 rounded-xl hover:shadow-md transition-all"
                style={{ background: '#F9FAFB' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: '#003DA5', color: '#FFFFFF' }}
                    >
                      {index + 1}
                    </div>
                    <span className="font-bold text-sm" style={{ color: '#1F2937' }}>
                      {prof.nombre}
                    </span>
                  </div>
                  <Badge 
                    className="text-xs"
                    style={{ 
                      background: prof.efectividad >= 95 ? '#D1FAE5' : '#FEF3C7',
                      color: prof.efectividad >= 95 ? '#059669' : '#D97706'
                    }}
                  >
                    {prof.efectividad}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                      PROCESOS
                    </p>
                    <p className="font-bold" style={{ color: '#003DA5' }}>
                      {prof.procesos}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1" style={{ color: '#9CA3AF' }}>
                      PROMEDIO DÍAS
                    </p>
                    <p className="font-bold" style={{ color: '#003DA5' }}>
                      {prof.promedioDias}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tiempo Promedio por Etapa */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
          Tiempo Promedio por Etapa
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiempoPromedioEtapas.map((item) => {
            const estaEnTiempo = item.dias <= item.optimo;
            return (
              <div 
                key={item.etapa}
                className="p-5 rounded-xl border-2"
                style={{ 
                  borderColor: estaEnTiempo ? '#D1FAE5' : '#FEE2E2',
                  background: estaEnTiempo ? '#F0FDF4' : '#FEF2F2'
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-bold text-sm" style={{ color: '#1F2937' }}>
                    {item.etapa}
                  </h4>
                  {estaEnTiempo ? (
                    <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                  ) : (
                    <AlertTriangle className="w-5 h-5" style={{ color: '#DC2626' }} />
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <p 
                    className="text-3xl font-extrabold"
                    style={{ color: estaEnTiempo ? '#10B981' : '#DC2626' }}
                  >
                    {item.dias}
                  </p>
                  <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                    días
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Target className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                  <span style={{ color: '#9CA3AF' }}>
                    Óptimo: {item.optimo} días
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Alertas y Recomendaciones */}
      <Card className="p-6 border-2" style={{ borderColor: '#E5E7EB' }}>
        <h3 className="text-lg font-extrabold mb-4" style={{ color: '#1F2937' }}>
          Alertas y Recomendaciones
        </h3>
        <div className="space-y-3">
          <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#FEF2F2' }}>
            <div className="p-2 rounded-lg flex-shrink-0" style={{ background: '#FEE2E2' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#DC2626' }} />
            </div>
            <div>
              <p className="font-bold text-sm mb-1" style={{ color: '#DC2626' }}>
                {estadisticas.procesosVencidos} procesos vencidos
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Requieren atención inmediata para evitar sanciones
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#FFFBEB' }}>
            <div className="p-2 rounded-lg flex-shrink-0" style={{ background: '#FEF3C7' }}>
              <Clock className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <p className="font-bold text-sm mb-1" style={{ color: '#F59E0B' }}>
                {estadisticas.procesosEnRiesgo} procesos en riesgo
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Vencen en menos de 7 días, revisar prioridad
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#F0FDF4' }}>
            <div className="p-2 rounded-lg flex-shrink-0" style={{ background: '#D1FAE5' }}>
              <Zap className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <div>
              <p className="font-bold text-sm mb-1" style={{ color: '#10B981' }}>
                Tasa de efectividad del {estadisticas.tasaEfectividad}%
              </p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                Excelente desempeño del equipo disciplinario
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
