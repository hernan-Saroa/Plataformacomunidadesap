/**
 * Modal: Analytics - Gestión Profesoral
 * Dashboard de estadísticas y análisis avanzado
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  PieChart,
  Activity,
  Target,
  Zap,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsModal({ isOpen, onClose }: AnalyticsModalProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-1');
  const [vistaActual, setVistaActual] = useState<'general' | 'docentes' | 'ptas' | 'evaluaciones'>('general');

  // Mock data - Métricas generales
  const metricasGenerales = {
    docentesActivos: 270,
    docentesPlanta: 180,
    docentesCatedra: 90,
    ptasAprobados: 187,
    ptasPendientes: 45,
    evaluacionPromedio: 4.6,
    horasPromedioAsignadas: 1480,
    tasaAprobacionPTAs: 92,
    cambioDocentesMes: 8,
    cambioPTAsMes: 12,
    cambioEvaluacionMes: 0.2,
  };

  // Distribución por facultad
  const distribucionFacultad = [
    { facultad: 'Ciencias Políticas', docentes: 82, ptas: 78, evaluacion: 4.7 },
    { facultad: 'Ciencias Administrativas', docentes: 65, ptas: 62, evaluacion: 4.5 },
    { facultad: 'Ciencias Jurídicas', docentes: 48, ptas: 45, evaluacion: 4.6 },
    { facultad: 'Ciencias Económicas', docentes: 42, ptas: 40, evaluacion: 4.8 },
    { facultad: 'Ciencias Sociales', docentes: 33, ptas: 32, evaluacion: 4.4 },
  ];

  // Distribución de horas PTA
  const distribucionHoras = [
    { categoria: 'Docencia', porcentaje: 42, horas: 620 },
    { categoria: 'Investigación', porcentaje: 28, horas: 410 },
    { categoria: 'Extensión', porcentaje: 18, horas: 265 },
    { categoria: 'Administración', porcentaje: 12, horas: 175 },
  ];

  // Tendencia mensual (últimos 6 meses)
  const tendenciaMensual = [
    { mes: 'Jun', ptas: 172, evaluaciones: 4.5, docentes: 255 },
    { mes: 'Jul', ptas: 178, evaluaciones: 4.6, docentes: 258 },
    { mes: 'Ago', ptas: 181, evaluaciones: 4.5, docentes: 262 },
    { mes: 'Sep', ptas: 183, evaluaciones: 4.6, docentes: 265 },
    { mes: 'Oct', ptas: 185, evaluaciones: 4.7, docentes: 268 },
    { mes: 'Nov', ptas: 187, evaluaciones: 4.6, docentes: 270 },
  ];

  // Top docentes
  const topDocentes = [
    { nombre: 'Dra. María Fernández', evaluacion: 4.9, ptas: 20, facultad: 'Ciencias Económicas' },
    { nombre: 'Dra. Ana Gutiérrez', evaluacion: 4.8, ptas: 15, facultad: 'Ciencias Administrativas' },
    { nombre: 'Dr. Carlos Méndez', evaluacion: 4.7, ptas: 18, facultad: 'Ciencias Políticas' },
    { nombre: 'Dr. Luis Ramírez', evaluacion: 4.6, ptas: 20, facultad: 'Ciencias Sociales' },
    { nombre: 'Mg. Roberto Silva', evaluacion: 4.5, ptas: 8, facultad: 'Ciencias Jurídicas' },
  ];

  const getColorBarra = (index: number) => {
    const colores = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500'];
    return colores[index % colores.length];
  };

  const renderMetricCard = (
    icon: React.ReactNode,
    label: string,
    valor: string | number,
    cambio?: number,
    color: string = 'blue'
  ) => (
    <div className={`bg-${color}-50 border-2 border-${color}-200 rounded-xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg bg-${color}-100`}>
          {icon}
        </div>
        {cambio !== undefined && (
          <Badge className={cambio >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {cambio >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(cambio)}%
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl">{valor}</p>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl mb-1">📈 Analytics - Gestión Profesoral</h2>
                <p className="text-sm text-blue-100">
                  Dashboard de métricas y estadísticas avanzadas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={periodoSeleccionado}
                  onChange={(e) => setPeriodoSeleccionado(e.target.value)}
                  className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none cursor-pointer"
                >
                  <option value="2025-1">Período 2025-1</option>
                  <option value="2024-2">Período 2024-2</option>
                  <option value="2024-1">Período 2024-1</option>
                </select>
                <button
                  onClick={onClose}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { id: 'general', label: 'General', icon: BarChart3 },
                { id: 'docentes', label: 'Docentes', icon: Users },
                { id: 'ptas', label: 'PTAs', icon: FileText },
                { id: 'evaluaciones', label: 'Evaluaciones', icon: Award },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setVistaActual(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      vistaActual === tab.id
                        ? 'bg-white text-[#003DA5]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {vistaActual === 'general' && (
              <div className="space-y-6">
                {/* Métricas Principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {renderMetricCard(
                    <Users className="w-6 h-6 text-blue-600" />,
                    'Docentes Activos',
                    metricasGenerales.docentesActivos,
                    metricasGenerales.cambioDocentesMes,
                    'blue'
                  )}
                  {renderMetricCard(
                    <FileText className="w-6 h-6 text-green-600" />,
                    'PTAs Aprobados',
                    metricasGenerales.ptasAprobados,
                    metricasGenerales.cambioPTAsMes,
                    'green'
                  )}
                  {renderMetricCard(
                    <Award className="w-6 h-6 text-amber-600" />,
                    'Evaluación Promedio',
                    `${metricasGenerales.evaluacionPromedio}/5.0`,
                    4.3,
                    'amber'
                  )}
                  {renderMetricCard(
                    <CheckCircle className="w-6 h-6 text-purple-600" />,
                    'Tasa Aprobación PTAs',
                    `${metricasGenerales.tasaAprobacionPTAs}%`,
                    undefined,
                    'purple'
                  )}
                </div>

                {/* Distribución por Facultad */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-blue-600" />
                    Distribución por Facultad
                  </h3>
                  <div className="space-y-4">
                    {distribucionFacultad.map((item, index) => (
                      <div key={item.facultad}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{item.facultad}</span>
                          <span className="text-gray-600">{item.docentes} docentes</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 relative">
                          <div
                            className={`${getColorBarra(index)} h-3 rounded-full`}
                            style={{
                              width: `${(item.docentes / metricasGenerales.docentesActivos) * 100}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>{item.ptas} PTAs</span>
                          <span>Eval: {item.evaluacion}/5.0</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Distribución de Horas PTA */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Distribución Promedio de Horas PTA
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {distribucionHoras.map((item, index) => (
                        <div key={item.categoria}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium">{item.categoria}</span>
                            <span className="text-gray-600">{item.horas} hrs ({item.porcentaje}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`${getColorBarra(index)} h-3 rounded-full`}
                              style={{ width: `${item.porcentaje}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-48 h-48 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
                          <div className="text-center">
                            <p className="text-5xl mb-2">1,470</p>
                            <p className="text-sm text-gray-600">Horas Promedio</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          Base: 1,600 hrs (92% asignado)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tendencia Mensual */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Tendencia Últimos 6 Meses
                  </h3>
                  <div className="space-y-4">
                    {tendenciaMensual.map((mes, index) => (
                      <div key={mes.mes} className="flex items-center gap-4">
                        <span className="font-medium w-12">{mes.mes}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                            <span>PTAs: {mes.ptas}</span>
                            <span>•</span>
                            <span>Eval: {mes.evaluaciones}</span>
                            <span>•</span>
                            <span>Docentes: {mes.docentes}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                              style={{
                                width: `${(mes.ptas / Math.max(...tendenciaMensual.map(m => m.ptas))) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {vistaActual === 'docentes' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderMetricCard(
                    <Users className="w-6 h-6 text-purple-600" />,
                    'Docentes de Planta',
                    metricasGenerales.docentesPlanta,
                    undefined,
                    'purple'
                  )}
                  {renderMetricCard(
                    <Users className="w-6 h-6 text-blue-600" />,
                    'Docentes de Cátedra',
                    metricasGenerales.docentesCatedra,
                    undefined,
                    'blue'
                  )}
                  {renderMetricCard(
                    <Award className="w-6 h-6 text-amber-600" />,
                    'Evaluación Promedio',
                    `${metricasGenerales.evaluacionPromedio}/5.0`,
                    undefined,
                    'amber'
                  )}
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Top 5 Docentes Mejor Evaluados
                  </h3>
                  <div className="space-y-3">
                    {topDocentes.map((docente, index) => (
                      <div
                        key={docente.nombre}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{docente.nombre}</p>
                          <p className="text-sm text-gray-600">{docente.facultad}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-600" />
                            <span className="text-lg font-bold text-amber-600">
                              {docente.evaluacion}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{docente.ptas} PTAs</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {vistaActual === 'ptas' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderMetricCard(
                    <CheckCircle className="w-6 h-6 text-green-600" />,
                    'PTAs Aprobados',
                    metricasGenerales.ptasAprobados,
                    metricasGenerales.cambioPTAsMes,
                    'green'
                  )}
                  {renderMetricCard(
                    <Clock className="w-6 h-6 text-amber-600" />,
                    'PTAs Pendientes',
                    metricasGenerales.ptasPendientes,
                    undefined,
                    'amber'
                  )}
                  {renderMetricCard(
                    <Zap className="w-6 h-6 text-purple-600" />,
                    'Tasa de Aprobación',
                    `${metricasGenerales.tasaAprobacionPTAs}%`,
                    undefined,
                    'purple'
                  )}
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Estado de PTAs por Facultad</h3>
                  <div className="space-y-4">
                    {distribucionFacultad.map((item) => (
                      <div key={item.facultad}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="font-medium">{item.facultad}</span>
                          <span className="text-gray-600">{item.ptas} PTAs</span>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-green-200 rounded-full h-3 relative overflow-hidden">
                            <div
                              className="bg-green-500 h-3"
                              style={{ width: `${(item.ptas / item.docentes) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-12 text-right">
                            {Math.round((item.ptas / item.docentes) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {vistaActual === 'evaluaciones' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderMetricCard(
                    <Award className="w-6 h-6 text-amber-600" />,
                    'Evaluación Promedio',
                    `${metricasGenerales.evaluacionPromedio}/5.0`,
                    4.3,
                    'amber'
                  )}
                  {renderMetricCard(
                    <TrendingUp className="w-6 h-6 text-green-600" />,
                    'Mejora Respecto Período Anterior',
                    '+0.2',
                    undefined,
                    'green'
                  )}
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h3 className="font-bold text-lg mb-4">Evaluaciones por Dimensión</h3>
                  <div className="space-y-4">
                    {[
                      { dimension: 'Dominio de Contenido', valor: 4.8 },
                      { dimension: 'Metodología', valor: 4.5 },
                      { dimension: 'Comunicación', valor: 4.7 },
                      { dimension: 'Evaluación', valor: 4.4 },
                      { dimension: 'Compromiso', valor: 4.6 },
                    ].map((dim, index) => (
                      <div key={dim.dimension}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{dim.dimension}</span>
                          <span className="text-amber-600 font-bold">{dim.valor}/5.0</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`${getColorBarra(index)} h-3 rounded-full`}
                            style={{ width: `${(dim.valor / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Datos actualizados al {new Date().toLocaleDateString('es-CO')}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
                <Button onClick={() => toast.info('Exportando reporte de analytics...')}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Reporte
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
