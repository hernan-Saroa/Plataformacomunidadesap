/**
 * Dashboard Ejecutivo de Arquitectura Empresarial
 * Vista consolidada con KPIs, gráficos y alertas para dirección
 */

import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Database,
  Server,
  Laptop,
  UserCheck,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Users,
  Building2,
  FileText,
  Calendar,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Download,
  RefreshCw,
  Bell,
  Star,
  Sparkles,
  MessageSquare,
  MapPin,
  Globe,
  ChevronRight,
  Info,
  Flag,
  Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface DashboardEjecutivoAEProps {
  canEdit?: boolean;
}

interface AlertaEjecutiva {
  id: string;
  tipo: 'critico' | 'advertencia' | 'info' | 'exito';
  titulo: string;
  descripcion: string;
  dominio?: string;
  territorial?: string;
  fecha: string;
  accion?: string;
}

interface MetricaEjecutiva {
  label: string;
  valor: string | number;
  sufijo?: string;
  tendencia: 'up' | 'down' | 'stable';
  variacion: string;
  icon: any;
  color: string;
  bgColor: string;
  descripcion: string;
}

const DOMINIOS_MRAE = [
  { id: 'estrategia-ti', nombre: 'Estrategia TI', icon: Target, color: 'from-blue-500 to-blue-600', nivel: 4 },
  { id: 'informacion', nombre: 'Información', icon: Database, color: 'from-purple-500 to-purple-600', nivel: 3 },
  { id: 'sistemas-informacion', nombre: 'Sistemas de Información', icon: Server, color: 'from-green-500 to-green-600', nivel: 4 },
  { id: 'servicios-tecnologicos', nombre: 'Servicios Tecnológicos', icon: Laptop, color: 'from-orange-500 to-orange-600', nivel: 4 },
  { id: 'uso-apropiacion', nombre: 'Uso y Apropiación', icon: UserCheck, color: 'from-pink-500 to-pink-600', nivel: 2 }
];

const TERRITORIALES_TOP = [
  { nombre: 'Bogotá D.C.', nivel: 3.6, cumplimiento: 75, tendencia: 'up', variacion: 0.4, proyectos: 12 },
  { nombre: 'Antioquia', nivel: 3.0, cumplimiento: 62, tendencia: 'up', variacion: 0.3, proyectos: 9 },
  { nombre: 'Valle del Cauca', nivel: 2.6, cumplimiento: 56, tendencia: 'stable', variacion: 0.0, proyectos: 8 },
  { nombre: 'Costa Atlántica', nivel: 2.6, cumplimiento: 51, tendencia: 'up', variacion: 0.2, proyectos: 7 },
  { nombre: 'Santanderes', nivel: 2.0, cumplimiento: 43, tendencia: 'stable', variacion: 0.0, proyectos: 5 }
];

export function DashboardEjecutivoAE({ canEdit = true }: DashboardEjecutivoAEProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2024-Q4');
  const [showAlertas, setShowAlertas] = useState(true);
  const [vistaGrafico, setVistaGrafico] = useState<'dominios' | 'territoriales' | 'tendencias'>('dominios');

  // Métricas principales
  const metricasEjecutivas: MetricaEjecutiva[] = [
    {
      label: 'Nivel de Madurez Institucional',
      valor: 3.4,
      sufijo: '/5.0',
      tendencia: 'up',
      variacion: '+0.6',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      descripcion: 'Promedio ponderado de los 5 dominios MRAE'
    },
    {
      label: 'Cumplimiento MinTIC',
      valor: 70,
      sufijo: '%',
      tendencia: 'up',
      variacion: '+8%',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      descripcion: 'Conformidad con Marco de Referencia'
    },
    {
      label: 'Artefactos Documentados',
      valor: 69,
      sufijo: '/85',
      tendencia: 'up',
      variacion: '+12',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      descripcion: 'Documentación MRAE completada'
    },
    {
      label: 'Proyectos AE Activos',
      valor: 76,
      sufijo: '',
      tendencia: 'up',
      variacion: '+18',
      icon: Rocket,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      descripcion: 'Iniciativas en ejecución (Nacional + Territoriales)'
    },
    {
      label: 'Presupuesto Ejecutado',
      valor: 74,
      sufijo: '%',
      tendencia: 'up',
      variacion: '+12%',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      descripcion: '$3.270M de $4.420M asignado'
    },
    {
      label: 'Cobertura Territorial',
      valor: 100,
      sufijo: '%',
      tendencia: 'stable',
      variacion: '0',
      icon: MapPin,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      descripcion: '5/5 Territoriales + 3 Regionales + 2 Sedes'
    },
    {
      label: 'Personal Capacitado',
      valor: 68,
      sufijo: '%',
      tendencia: 'up',
      variacion: '+15%',
      icon: Users,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      descripcion: '612 de 900 personas capacitadas en AE'
    },
    {
      label: 'Tiempo Promedio Implementación',
      valor: 4.2,
      sufijo: ' meses',
      tendencia: 'down',
      variacion: '-0.8',
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      descripcion: 'Reducción del 16% vs trimestre anterior'
    }
  ];

  // Alertas ejecutivas
  const [alertas, setAlertas] = useState<AlertaEjecutiva[]>([
    {
      id: 'alert-1',
      tipo: 'critico',
      titulo: 'Dominio Uso y Apropiación en Nivel 2',
      descripcion: 'Requiere atención urgente para alcanzar objetivo de Nivel 4 en Q2 2025',
      dominio: 'Uso y Apropiación',
      fecha: '2024-12-04',
      accion: 'Revisar Plan de Acción'
    },
    {
      id: 'alert-2',
      tipo: 'advertencia',
      titulo: 'Territorial Santanderes bajo promedio',
      descripcion: 'Nivel 2.0 requiere acompañamiento para mejorar cumplimiento MRAE',
      territorial: 'Santanderes',
      fecha: '2024-12-03',
      accion: 'Programar Capacitación'
    },
    {
      id: 'alert-3',
      tipo: 'advertencia',
      titulo: '16 artefactos pendientes de documentar',
      descripcion: 'Meta: Completar 85 artefactos antes de fin de año (faltan 27 días)',
      fecha: '2024-12-02',
      accion: 'Asignar Recursos'
    },
    {
      id: 'alert-4',
      tipo: 'exito',
      titulo: 'Territorial Bogotá alcanza Nivel 3.6',
      descripcion: 'Mejor desempeño territorial con 75% de cumplimiento MinTIC',
      territorial: 'Bogotá D.C.',
      fecha: '2024-12-01',
      accion: 'Ver Buenas Prácticas'
    },
    {
      id: 'alert-5',
      tipo: 'info',
      titulo: 'Próxima Auditoría MinTIC programada',
      descripcion: 'Evaluación de cumplimiento MRAE programada para 15 de enero 2025',
      fecha: '2024-11-30',
      accion: 'Preparar Documentación'
    }
  ]);

  // Proyectos destacados
  const proyectosDestacados = [
    {
      codigo: 'AE-001',
      nombre: 'Actualización PETI 2025-2028',
      dominio: 'Estrategia TI',
      estado: 'En desarrollo',
      progreso: 75,
      prioridad: 'Crítica',
      fecha: '2024-08-15',
      responsable: 'Juan Pérez'
    },
    {
      codigo: 'AE-003',
      nombre: 'Implementación Arquitectura Cloud',
      dominio: 'Servicios Tecnológicos',
      estado: 'En revisión',
      progreso: 92,
      prioridad: 'Alta',
      fecha: '2024-09-01',
      responsable: 'Miguel Ruiz'
    },
    {
      codigo: 'AE-004',
      nombre: 'Gobierno de Datos Corporativo',
      dominio: 'Información',
      estado: 'En desarrollo',
      progreso: 65,
      prioridad: 'Crítica',
      fecha: '2024-06-01',
      responsable: 'Laura Sánchez'
    }
  ];

  // Hitos recientes
  const hitosRecientes = [
    { fecha: '2024-12-04', titulo: 'PETI 2025-2028 aprobado por Comité Directivo', tipo: 'milestone' },
    { fecha: '2024-12-01', titulo: 'Completado Catálogo de Servicios TI v3.2', tipo: 'completion' },
    { fecha: '2024-11-28', titulo: 'Certificación MRAE MinTIC renovada', tipo: 'achievement' },
    { fecha: '2024-11-20', titulo: 'Implementación de Matriz de Madurez Territorial', tipo: 'launch' }
  ];

  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === 'up') return ArrowUp;
    if (tendencia === 'down') return ArrowDown;
    return Minus;
  };

  const getTendenciaColor = (tendencia: string) => {
    if (tendencia === 'up') return 'text-green-600 bg-green-100';
    if (tendencia === 'down') return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getAlertaStyles = (tipo: string) => {
    const styles = {
      critico: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: AlertTriangle, iconColor: 'text-red-600' },
      advertencia: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: AlertTriangle, iconColor: 'text-orange-600' },
      info: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: Info, iconColor: 'text-blue-600' },
      exito: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', icon: CheckCircle, iconColor: 'text-green-600' }
    };
    return styles[tipo] || styles.info;
  };

  const handleExportarReporte = () => {
    toast.success('Generando reporte ejecutivo PDF...');
  };

  const handleActualizarDatos = () => {
    toast.success('Datos actualizados correctamente');
  };

  const handleDismissAlerta = (id: string) => {
    setAlertas(alertas.filter(a => a.id !== id));
    toast.info('Alerta descartada');
  };

  return (
    <div className="space-y-6">
      {/* Header con controles */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] rounded-xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black mb-2">Dashboard Ejecutivo de Arquitectura Empresarial</h1>
            <p className="text-blue-100">
              Vista consolidada de avance MRAE MinTIC - ESAP Nacional y Territorial
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={periodoSeleccionado}
              onChange={(e) => setPeriodoSeleccionado(e.target.value)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg border border-white/30 font-semibold backdrop-blur"
            >
              <option value="2024-Q4" className="text-gray-900">Q4 2024</option>
              <option value="2024-Q3" className="text-gray-900">Q3 2024</option>
              <option value="2024-Q2" className="text-gray-900">Q2 2024</option>
              <option value="2024-Q1" className="text-gray-900">Q1 2024</option>
              <option value="2023-Q4" className="text-gray-900">Q4 2023</option>
            </select>
            <button
              onClick={handleActualizarDatos}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold backdrop-blur transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
            <button
              onClick={handleExportarReporte}
              className="px-4 py-2 bg-white text-[#003DA5] rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Reporte
            </button>
          </div>
        </div>

        {/* Fecha y última actualización */}
        <div className="flex items-center gap-4 text-sm text-blue-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Período: {periodoSeleccionado}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Última actualización: 4 de diciembre 2024, 10:30 AM</span>
          </div>
        </div>
      </div>

      {/* Métricas Ejecutivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricasEjecutivas.map((metrica, index) => {
          const Icon = metrica.icon;
          const TendenciaIcon = getTendenciaIcon(metrica.tendencia);

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border-2 border-gray-200 p-5 hover:shadow-xl hover:border-[#003DA5] transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 ${metrica.bgColor} rounded-xl`}>
                  <Icon className={`w-6 h-6 ${metrica.color}`} />
                </div>
                <div className={`px-2 py-1 rounded-lg ${getTendenciaColor(metrica.tendencia)}`}>
                  <div className="flex items-center gap-1">
                    <TendenciaIcon className="w-3 h-3" />
                    <span className="text-xs font-bold">{metrica.variacion}</span>
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <div className="text-3xl font-black text-gray-900 mb-1">
                  {metrica.valor}{metrica.sufijo && <span className="text-lg text-gray-600">{metrica.sufijo}</span>}
                </div>
                <h3 className="text-sm font-bold text-gray-700">{metrica.label}</h3>
              </div>
              <p className="text-xs text-gray-500">{metrica.descripcion}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Alertas Ejecutivas */}
      <AnimatePresence>
        {showAlertas && alertas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-xl border-2 border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Bell className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-black text-gray-900">Alertas Ejecutivas</h2>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">
                  {alertas.filter(a => a.tipo === 'critico' || a.tipo === 'advertencia').length} requieren atención
                </span>
              </div>
              <button
                onClick={() => setShowAlertas(false)}
                className="text-sm text-gray-600 hover:text-gray-900 font-semibold"
              >
                Ocultar
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {alertas.map((alerta, index) => {
                const styles = getAlertaStyles(alerta.tipo);
                const AlertIcon = styles.icon;

                return (
                  <motion.div
                    key={alerta.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${styles.bg} border-2 ${styles.border} rounded-xl p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 bg-white rounded-lg`}>
                        <AlertIcon className={`w-5 h-5 ${styles.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className={`font-black ${styles.text}`}>{alerta.titulo}</h3>
                          <button
                            onClick={() => handleDismissAlerta(alerta.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{alerta.descripcion}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            {alerta.dominio && (
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {alerta.dominio}
                              </span>
                            )}
                            {alerta.territorial && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {alerta.territorial}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(alerta.fecha).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          {alerta.accion && (
                            <button className={`px-3 py-1 ${styles.text} font-bold text-xs rounded-lg hover:bg-white transition-colors`}>
                              {alerta.accion}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gráficos y Análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evaluación por Dominios */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">Evaluación por Dominio MRAE</h2>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Eye className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="space-y-4">
            {DOMINIOS_MRAE.map((dominio, index) => {
              const Icon = dominio.icon;
              const porcentaje = (dominio.nivel / 5) * 100;

              return (
                <motion.div
                  key={dominio.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-gradient-to-br ${dominio.color} rounded-lg`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900">{dominio.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-gray-900">{dominio.nivel}</span>
                      <span className="text-sm text-gray-600">/5.0</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full bg-gradient-to-r ${dominio.color} transition-all duration-500`}
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Ranking Territorial */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">Ranking Territorial</h2>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <MapPin className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <div className="space-y-3">
            {TERRITORIALES_TOP.map((territorial, index) => {
              const TendenciaIcon = getTendenciaIcon(territorial.tendencia);
              const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl w-8 text-center">
                      {medalla || `${index + 1}.`}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{territorial.nombre}</div>
                      <div className="text-sm text-gray-600">
                        {territorial.proyectos} proyectos activos
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-black text-gray-900">{territorial.nivel}</div>
                      <div className="text-xs text-gray-600">{territorial.cumplimiento}%</div>
                    </div>
                    <div className={`px-2 py-1 rounded ${getTendenciaColor(territorial.tendencia)}`}>
                      <TendenciaIcon className="w-4 h-4" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Proyectos Destacados y Hitos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proyectos Destacados */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Rocket className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Proyectos Destacados</h2>
            </div>
            <button className="text-sm text-[#003DA5] font-bold hover:underline flex items-center gap-1">
              Ver todos
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {proyectosDestacados.map((proyecto, index) => (
              <motion.div
                key={proyecto.codigo}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 border border-gray-200 rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-gray-900 text-white rounded text-xs font-bold">
                        {proyecto.codigo}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        proyecto.prioridad === 'Crítica' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {proyecto.prioridad}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{proyecto.nombre}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>{proyecto.dominio}</span>
                      <span>•</span>
                      <span>{proyecto.responsable}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-purple-600">{proyecto.progreso}%</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-500"
                    style={{ width: `${proyecto.progreso}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Hitos Recientes */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Flag className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl font-black text-gray-900">Hitos Recientes</h2>
            </div>
          </div>
          <div className="space-y-4">
            {hitosRecientes.map((hito, index) => {
              const iconos = {
                milestone: Star,
                completion: CheckCircle,
                achievement: Award,
                launch: Sparkles
              };
              const colores = {
                milestone: 'bg-blue-100 text-blue-600',
                completion: 'bg-green-100 text-green-600',
                achievement: 'bg-purple-100 text-purple-600',
                launch: 'bg-orange-100 text-orange-600'
              };
              const HitoIcon = iconos[hito.tipo];

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={`p-2 rounded-lg ${colores[hito.tipo]}`}>
                    <HitoIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(hito.fecha).toLocaleDateString('es-CO', { 
                        day: 'numeric', 
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="font-semibold text-gray-900">{hito.titulo}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl border-2 border-indigo-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900 mb-3">Resumen Ejecutivo - Q4 2024</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">✅ Logros Principales:</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• Nivel de madurez institucional alcanzó 3.4/5.0 (+0.6 vs Q3)</li>
                  <li>• 70% de cumplimiento MRAE MinTIC (+8% trimestral)</li>
                  <li>• PETI 2025-2028 aprobado e iniciando implementación</li>
                  <li>• Territorial Bogotá liderazgo con nivel 3.6/5.0</li>
                  <li>• 68% del personal capacitado en AE (+15%)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">⚠️ Áreas de Atención:</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>• Dominio Uso y Apropiación en nivel 2 (requiere plan de acción)</li>
                  <li>• Territorial Santanderes 43% cumplimiento (necesita soporte)</li>
                  <li>• 16 artefactos MRAE pendientes de completar</li>
                  <li>• Preparación para auditoría MinTIC enero 2025</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
