/**
 * Matriz de Madurez MRAE - MinTIC Colombia
 * Sistema interactivo de evaluación de madurez por dominios
 */

import React, { useState } from 'react';
import {
  Target,
  Database,
  Server,
  Laptop,
  UserCheck,
  TrendingUp,
  BarChart3,
  Activity,
  Award,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Users,
  FileText,
  Eye,
  Edit,
  Download,
  Filter,
  Plus,
  Zap,
  Sparkles,
  ChevronRight,
  Info,
  Star,
  Target as TargetIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface CanEdit {
  canEdit: boolean;
}

interface NivelMadurez {
  nivel: number;
  nombre: string;
  descripcion: string;
  caracteristicas: string[];
  color: string;
  bgColor: string;
  borderColor: string;
}

interface EvaluacionDominio {
  dominioId: string;
  nivelActual: number;
  nivelObjetivo: number;
  nivelAnterior: number;
  porcentajeAvance: number;
  fechaEvaluacion: string;
  evaluador: string;
  fortalezas: string[];
  debilidades: string[];
  recomendaciones: string[];
  iniciativasActivas: number;
  artefactosCompletados: number;
  artefactosTotales: number;
}

interface HistorialEvaluacion {
  fecha: string;
  dominioId: string;
  nivel: number;
  evaluador: string;
  observaciones: string;
}

const NIVELES_MADUREZ: NivelMadurez[] = [
  {
    nivel: 1,
    nombre: 'Inicial',
    descripcion: 'Procesos ad-hoc, reactivos y no documentados',
    caracteristicas: [
      'Sin documentación formal',
      'Procesos no estandarizados',
      'Gestión reactiva',
      'Dependencia de personas clave',
      'Sin métricas definidas'
    ],
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300'
  },
  {
    nivel: 2,
    nombre: 'Básico',
    descripcion: 'Procesos documentados pero no estandarizados',
    caracteristicas: [
      'Documentación básica existente',
      'Algunos procesos repetibles',
      'Gestión mayormente reactiva',
      'Métricas básicas definidas',
      'Roles asignados'
    ],
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300'
  },
  {
    nivel: 3,
    nombre: 'Intermedio',
    descripcion: 'Procesos estandarizados y gestionados',
    caracteristicas: [
      'Procesos formalmente documentados',
      'Gobierno establecido',
      'Gestión proactiva',
      'Métricas monitoreadas',
      'Mejora continua iniciada'
    ],
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300'
  },
  {
    nivel: 4,
    nombre: 'Avanzado',
    descripcion: 'Procesos gestionados cuantitativamente',
    caracteristicas: [
      'Procesos optimizados',
      'Métricas y KPIs establecidos',
      'Gestión basada en datos',
      'Integración entre áreas',
      'Innovación incorporada'
    ],
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300'
  },
  {
    nivel: 5,
    nombre: 'Optimizado',
    descripcion: 'Mejora continua y optimización constante',
    caracteristicas: [
      'Mejora continua institucionalizada',
      'Innovación sistemática',
      'Benchmarking activo',
      'Liderazgo en el sector',
      'Cultura de excelencia'
    ],
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300'
  }
];

const DOMINIOS_MRAE = [
  {
    id: 'estrategia-ti',
    nombre: 'Estrategia TI',
    descripcion: 'Alineación estratégica entre TI y negocio',
    icon: Target,
    color: 'from-blue-500 to-blue-600',
    criteriosEvaluacion: [
      'Existencia de PETI actualizado',
      'Alineación con Plan Estratégico Institucional',
      'Gobierno de TI establecido',
      'Gestión de portafolio de proyectos',
      'Evaluación de madurez periódica'
    ]
  },
  {
    id: 'informacion',
    nombre: 'Información',
    descripcion: 'Gobierno y gestión de datos e información',
    icon: Database,
    color: 'from-purple-500 to-purple-600',
    criteriosEvaluacion: [
      'Arquitectura de información definida',
      'Políticas de gobierno de datos',
      'Calidad de datos gestionada',
      'Seguridad y privacidad implementada',
      'Analítica de datos operativa'
    ]
  },
  {
    id: 'sistemas-informacion',
    nombre: 'Sistemas de Información',
    descripcion: 'Gestión de aplicaciones y soluciones',
    icon: Server,
    color: 'from-green-500 to-green-600',
    criteriosEvaluacion: [
      'Catálogo de aplicaciones actualizado',
      'Arquitectura de aplicaciones definida',
      'Interoperabilidad implementada',
      'Gestión del ciclo de vida',
      'Innovación tecnológica'
    ]
  },
  {
    id: 'servicios-tecnologicos',
    nombre: 'Servicios Tecnológicos',
    descripcion: 'Infraestructura y servicios de TI',
    icon: Laptop,
    color: 'from-orange-500 to-orange-600',
    criteriosEvaluacion: [
      'Catálogo de servicios TI publicado',
      'SLAs definidos y monitoreados',
      'Infraestructura estandarizada',
      'Gestión de incidentes y problemas',
      'Continuidad del servicio'
    ]
  },
  {
    id: 'uso-apropiacion',
    nombre: 'Uso y Apropiación',
    descripcion: 'Capacitación y adopción tecnológica',
    icon: UserCheck,
    color: 'from-pink-500 to-pink-600',
    criteriosEvaluacion: [
      'Plan de capacitación definido',
      'Programa de gestión del cambio',
      'Canales de soporte establecidos',
      'Medición de satisfacción',
      'Cultura digital promovida'
    ]
  }
];

export function MatrizMadurezCompleta({ canEdit }: CanEdit) {
  const [vistaActiva, setVistaActiva] = useState<'matriz' | 'radar' | 'historico'>('matriz');
  const [dominioSeleccionado, setDominioSeleccionado] = useState<string | null>(null);
  const [showEvaluacion, setShowEvaluacion] = useState(false);
  const [showDetalleNivel, setShowDetalleNivel] = useState<number | null>(null);
  const [periodoComparacion, setPeriodoComparacion] = useState('2024-Q4');

  // Evaluaciones actuales por dominio
  const [evaluaciones, setEvaluaciones] = useState<EvaluacionDominio[]>([
    {
      dominioId: 'estrategia-ti',
      nivelActual: 4,
      nivelObjetivo: 5,
      nivelAnterior: 3,
      porcentajeAvance: 80,
      fechaEvaluacion: '2024-12-04',
      evaluador: 'Juan Pérez - Arquitecto TI',
      fortalezas: [
        'PETI 2025-2028 aprobado y en ejecución',
        'Gobierno de TI establecido con comités activos',
        'Métricas de seguimiento implementadas',
        'Alineación estratégica con objetivos institucionales'
      ],
      debilidades: [
        'Falta automatización en seguimiento de KPIs',
        'Mejora continua no completamente institucionalizada'
      ],
      recomendaciones: [
        'Implementar dashboard ejecutivo automatizado',
        'Establecer programa formal de mejora continua',
        'Fortalecer cultura de innovación'
      ],
      iniciativasActivas: 8,
      artefactosCompletados: 10,
      artefactosTotales: 12
    },
    {
      dominioId: 'informacion',
      nivelActual: 3,
      nivelObjetivo: 4,
      nivelAnterior: 2,
      porcentajeAvance: 65,
      fechaEvaluacion: '2024-12-03',
      evaluador: 'Laura Sánchez - Arquitecto de Datos',
      fortalezas: [
        'Arquitectura de información definida',
        'Políticas de gobierno de datos aprobadas',
        'Diccionario de datos en desarrollo'
      ],
      debilidades: [
        'Calidad de datos no completamente gestionada',
        'Falta catálogo de datos corporativo',
        'Analítica avanzada pendiente'
      ],
      recomendaciones: [
        'Implementar herramienta de calidad de datos',
        'Desarrollar catálogo de datos centralizado',
        'Iniciar programa de analítica avanzada'
      ],
      iniciativasActivas: 5,
      artefactosCompletados: 8,
      artefactosTotales: 15
    },
    {
      dominioId: 'sistemas-informacion',
      nivelActual: 4,
      nivelObjetivo: 5,
      nivelAnterior: 3,
      porcentajeAvance: 75,
      fechaEvaluacion: '2024-11-30',
      evaluador: 'Roberto Torres - Gerente Aplicaciones',
      fortalezas: [
        'Inventario de aplicaciones completo y actualizado',
        'Arquitectura de aplicaciones documentada',
        'Interoperabilidad mediante APIs',
        'Proceso de gestión del ciclo de vida establecido'
      ],
      debilidades: [
        'Modernización de aplicaciones legacy pendiente',
        'Automatización de pruebas no completa'
      ],
      recomendaciones: [
        'Acelerar plan de modernización tecnológica',
        'Implementar DevOps completo',
        'Fortalecer automatización de pruebas'
      ],
      iniciativasActivas: 12,
      artefactosCompletados: 15,
      artefactosTotales: 18
    },
    {
      dominioId: 'servicios-tecnologicos',
      nivelActual: 4,
      nivelObjetivo: 4,
      nivelAnterior: 3,
      porcentajeAvance: 88,
      fechaEvaluacion: '2024-11-28',
      evaluador: 'Miguel Ángel Ruiz - CTO',
      fortalezas: [
        'Catálogo de servicios TI publicado',
        'SLAs definidos y monitoreados',
        'Infraestructura cloud implementada',
        'Gestión de incidentes automatizada'
      ],
      debilidades: [
        'Continuidad del servicio requiere pruebas periódicas'
      ],
      recomendaciones: [
        'Ejecutar simulacros de continuidad trimestrales',
        'Optimizar costos de infraestructura cloud'
      ],
      iniciativasActivas: 6,
      artefactosCompletados: 12,
      artefactosTotales: 14
    },
    {
      dominioId: 'uso-apropiacion',
      nivelActual: 2,
      nivelObjetivo: 4,
      nivelAnterior: 2,
      porcentajeAvance: 35,
      fechaEvaluacion: '2024-12-01',
      evaluador: 'Claudia Hernández - Coordinadora Capacitación',
      fortalezas: [
        'Plan de capacitación en desarrollo',
        'Canales de soporte establecidos'
      ],
      debilidades: [
        'Programa de gestión del cambio inexistente',
        'Medición de satisfacción no sistemática',
        'Cultura digital incipiente'
      ],
      recomendaciones: [
        'Diseñar e implementar programa de gestión del cambio',
        'Establecer encuestas de satisfacción periódicas',
        'Lanzar campaña de transformación digital'
      ],
      iniciativasActivas: 3,
      artefactosCompletados: 3,
      artefactosTotales: 10
    }
  ]);

  // Cálculo de métricas generales
  const metricsGenerales = {
    nivelPromedioActual: Number((evaluaciones.reduce((acc, e) => acc + e.nivelActual, 0) / evaluaciones.length).toFixed(1)),
    nivelPromedioObjetivo: Number((evaluaciones.reduce((acc, e) => acc + e.nivelObjetivo, 0) / evaluaciones.length).toFixed(1)),
    avancePromedio: Math.round(evaluaciones.reduce((acc, e) => acc + e.porcentajeAvance, 0) / evaluaciones.length),
    dominiosNivel4Plus: evaluaciones.filter(e => e.nivelActual >= 4).length,
    iniciativasTotales: evaluaciones.reduce((acc, e) => acc + e.iniciativasActivas, 0),
    artefactosCompletados: evaluaciones.reduce((acc, e) => acc + e.artefactosCompletados, 0),
    artefactosTotales: evaluaciones.reduce((acc, e) => acc + e.artefactosTotales, 0)
  };

  const getDominioInfo = (dominioId: string) => {
    return DOMINIOS_MRAE.find(d => d.id === dominioId) || DOMINIOS_MRAE[0];
  };

  const getEvaluacion = (dominioId: string) => {
    return evaluaciones.find(e => e.dominioId === dominioId);
  };

  const getTendencia = (evaluacion: EvaluacionDominio) => {
    if (evaluacion.nivelActual > evaluacion.nivelAnterior) return 'up';
    if (evaluacion.nivelActual < evaluacion.nivelAnterior) return 'down';
    return 'stable';
  };

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

  const handleVerDetalleDominio = (dominioId: string) => {
    setDominioSeleccionado(dominioId);
  };

  const handleNuevaEvaluacion = () => {
    if (!canEdit) {
      toast.error('No tienes permisos para realizar evaluaciones');
      return;
    }
    setShowEvaluacion(true);
  };

  const getNivelInfo = (nivel: number) => {
    return NIVELES_MADUREZ.find(n => n.nivel === nivel) || NIVELES_MADUREZ[0];
  };

  return (
    <div className="space-y-6">
      {/* Header con Métricas Generales */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] rounded-xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black mb-2">Matriz de Madurez MRAE</h2>
            <p className="text-blue-100">
              Evaluación de madurez según Marco de Referencia de Arquitectura Empresarial - MinTIC
            </p>
          </div>
          {canEdit && (
            <button
              onClick={handleNuevaEvaluacion}
              className="px-6 py-3 bg-white text-[#003DA5] rounded-lg font-bold hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nueva Evaluación
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{metricsGenerales.nivelPromedioActual}</div>
            <div className="text-sm text-blue-100">Nivel Promedio Actual</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{metricsGenerales.nivelPromedioObjetivo}</div>
            <div className="text-sm text-blue-100">Nivel Objetivo</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{metricsGenerales.avancePromedio}%</div>
            <div className="text-sm text-blue-100">Avance Promedio</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{metricsGenerales.dominiosNivel4Plus}</div>
            <div className="text-sm text-blue-100">Dominios Nivel 4+</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{metricsGenerales.iniciativasTotales}</div>
            <div className="text-sm text-blue-100">Iniciativas Activas</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">
              {metricsGenerales.artefactosCompletados}/{metricsGenerales.artefactosTotales}
            </div>
            <div className="text-sm text-blue-100">Artefactos MRAE</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">
              {Math.round((metricsGenerales.artefactosCompletados / metricsGenerales.artefactosTotales) * 100)}%
            </div>
            <div className="text-sm text-blue-100">Completitud</div>
          </div>
        </div>
      </div>

      {/* Selector de Vista */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setVistaActiva('matriz')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              vistaActiva === 'matriz'
                ? 'bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Vista Matriz
          </button>
          <button
            onClick={() => setVistaActiva('radar')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              vistaActiva === 'radar'
                ? 'bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Activity className="w-5 h-5" />
            Gráfico Radar
          </button>
          <button
            onClick={() => setVistaActiva('historico')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              vistaActiva === 'historico'
                ? 'bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            Histórico
          </button>
        </div>
      </div>

      {/* Vista Matriz */}
      {vistaActiva === 'matriz' && (
        <div className="space-y-5">
          {/* Leyenda de Niveles */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-[#003DA5]" />
              Niveles de Madurez MRAE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {NIVELES_MADUREZ.map(nivel => (
                <div
                  key={nivel.nivel}
                  className={`border-2 ${nivel.borderColor} ${nivel.bgColor} rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all`}
                  onClick={() => setShowDetalleNivel(nivel.nivel)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-2xl font-black ${nivel.color}`}>{nivel.nivel}</span>
                    <Info className={`w-5 h-5 ${nivel.color}`} />
                  </div>
                  <div className={`font-bold ${nivel.color} mb-1`}>{nivel.nombre}</div>
                  <div className="text-xs text-gray-600">{nivel.descripcion}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Evaluación por Dominio */}
          {DOMINIOS_MRAE.map((dominio, index) => {
            const Icon = dominio.icon;
            const evaluacion = getEvaluacion(dominio.id);
            if (!evaluacion) return null;

            const tendencia = getTendencia(evaluacion);
            const TendenciaIcon = getTendenciaIcon(tendencia);
            const nivelInfo = getNivelInfo(evaluacion.nivelActual);

            return (
              <motion.div
                key={dominio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="p-6">
                  {/* Header del Dominio */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 bg-gradient-to-br ${dominio.color} rounded-xl`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-gray-900 mb-1">
                          {dominio.nombre}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">
                          {dominio.descripcion}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(evaluacion.fechaEvaluacion).toLocaleDateString('es-CO')}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>{evaluacion.evaluador}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4" />
                            <span>{evaluacion.iniciativasActivas} iniciativas activas</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nivel Actual Badge */}
                    <div className={`border-2 ${nivelInfo.borderColor} ${nivelInfo.bgColor} rounded-xl p-4 min-w-[140px]`}>
                      <div className="text-center">
                        <div className={`text-4xl font-black ${nivelInfo.color} mb-1`}>
                          {evaluacion.nivelActual}
                        </div>
                        <div className={`text-sm font-bold ${nivelInfo.color} mb-2`}>
                          {nivelInfo.nombre}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getTendenciaColor(tendencia)}`}>
                          <TendenciaIcon className="w-3 h-3" />
                          <span className="text-xs font-semibold">
                            {tendencia === 'up' ? '+' : tendencia === 'down' ? '-' : ''}
                            {Math.abs(evaluacion.nivelActual - evaluacion.nivelAnterior)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progreso hacia Objetivo */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-semibold text-gray-700">
                        Progreso hacia Nivel {evaluacion.nivelObjetivo} ({getNivelInfo(evaluacion.nivelObjetivo).nombre})
                      </span>
                      <span className="font-black text-gray-900">{evaluacion.porcentajeAvance}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-[#003DA5] to-[#0052CC] transition-all duration-500"
                        style={{ width: `${evaluacion.porcentajeAvance}%` }}
                      />
                    </div>
                  </div>

                  {/* Matriz Visual de Niveles */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-gray-700">Matriz de Madurez</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {NIVELES_MADUREZ.map(nivel => {
                        const esActual = nivel.nivel === evaluacion.nivelActual;
                        const esObjetivo = nivel.nivel === evaluacion.nivelObjetivo;
                        const esAlcanzado = nivel.nivel <= evaluacion.nivelActual;

                        return (
                          <div
                            key={nivel.nivel}
                            className={`relative border-2 rounded-lg p-3 transition-all ${
                              esActual
                                ? `${nivel.borderColor} ${nivel.bgColor} shadow-lg`
                                : esAlcanzado
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="text-center">
                              <div className={`text-2xl font-black mb-1 ${
                                esActual ? nivel.color : esAlcanzado ? 'text-green-600' : 'text-gray-400'
                              }`}>
                                {nivel.nivel}
                              </div>
                              <div className={`text-xs font-semibold ${
                                esActual ? nivel.color : esAlcanzado ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {nivel.nombre}
                              </div>
                            </div>
                            {esActual && (
                              <div className="absolute -top-2 -right-2">
                                <div className={`w-6 h-6 bg-gradient-to-br ${dominio.color} rounded-full flex items-center justify-center`}>
                                  <Star className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                            {esObjetivo && !esActual && (
                              <div className="absolute -top-2 -right-2">
                                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                                  <TargetIcon className="w-3 h-3 text-white" />
                                </div>
                              </div>
                            )}
                            {esAlcanzado && (
                              <div className="absolute top-1 right-1">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Artefactos MRAE */}
                  <div className="grid grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-2xl font-black text-gray-900 mb-1">
                        {evaluacion.artefactosCompletados}/{evaluacion.artefactosTotales}
                      </div>
                      <div className="text-xs text-gray-600">Artefactos MRAE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-green-600 mb-1">
                        {evaluacion.fortalezas.length}
                      </div>
                      <div className="text-xs text-gray-600">Fortalezas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black text-orange-600 mb-1">
                        {evaluacion.debilidades.length}
                      </div>
                      <div className="text-xs text-gray-600">Oportunidades</div>
                    </div>
                  </div>

                  {/* Botón Ver Detalle */}
                  <button
                    onClick={() => handleVerDetalleDominio(dominio.id)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-5 h-5" />
                    Ver Análisis Detallado
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vista Radar (Simplificada) */}
      {vistaActiva === 'radar' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 mb-2">Gráfico Radar de Madurez</h3>
            <p className="text-gray-600">Comparación visual de niveles de madurez por dominio</p>
          </div>
          
          {/* Representación Visual Simplificada */}
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-5 gap-4 mb-8">
              {DOMINIOS_MRAE.map(dominio => {
                const Icon = dominio.icon;
                const evaluacion = getEvaluacion(dominio.id);
                if (!evaluacion) return null;

                return (
                  <div key={dominio.id} className="text-center">
                    <div className={`p-3 bg-gradient-to-br ${dominio.color} rounded-xl mb-3 mx-auto w-fit`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-sm font-bold text-gray-900 mb-2">{dominio.nombre}</div>
                    
                    {/* Barra vertical de nivel */}
                    <div className="relative h-40 bg-gray-100 rounded-lg p-2">
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <div
                          className={`bg-gradient-to-t ${dominio.color} rounded transition-all duration-500`}
                          style={{ height: `${(evaluacion.nivelActual / 5) * 100}%` }}
                        >
                          <div className="text-white font-black text-xl pt-2">
                            {evaluacion.nivelActual}
                          </div>
                        </div>
                      </div>
                      {/* Línea objetivo */}
                      <div
                        className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-500"
                        style={{ bottom: `${(evaluacion.nivelObjetivo / 5) * 100}%` }}
                      >
                        <span className="absolute -right-8 -top-3 text-xs font-bold text-yellow-600">
                          Meta
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leyenda */}
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded"></div>
                <span className="text-gray-700">Nivel Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 border-t-2 border-dashed border-yellow-500"></div>
                <span className="text-gray-700">Nivel Objetivo</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vista Histórico */}
      {vistaActiva === 'historico' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900">Evolución Histórica</h3>
            <select
              value={periodoComparacion}
              onChange={(e) => setPeriodoComparacion(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
            >
              <option value="2024-Q4">Q4 2024</option>
              <option value="2024-Q3">Q3 2024</option>
              <option value="2024-Q2">Q2 2024</option>
              <option value="2024-Q1">Q1 2024</option>
            </select>
          </div>

          <div className="space-y-4">
            {DOMINIOS_MRAE.map(dominio => {
              const Icon = dominio.icon;
              const evaluacion = getEvaluacion(dominio.id);
              if (!evaluacion) return null;

              return (
                <div key={dominio.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 bg-gradient-to-br ${dominio.color} rounded-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{dominio.nombre}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Anterior → Actual</div>
                      <div className="text-lg font-black text-gray-900">
                        {evaluacion.nivelAnterior} → {evaluacion.nivelActual}
                      </div>
                    </div>
                  </div>

                  {/* Timeline visual */}
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(nivel => (
                      <div key={nivel} className="flex-1 h-8 relative">
                        <div className={`h-full rounded ${
                          nivel <= evaluacion.nivelAnterior
                            ? 'bg-blue-200'
                            : 'bg-gray-100'
                        }`}>
                          {nivel === evaluacion.nivelActual && (
                            <div className="absolute inset-0 bg-gradient-to-r from-[#003DA5] to-[#0052CC] rounded animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Detalle de Dominio */}
      <AnimatePresence>
        {dominioSeleccionado && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDominioSeleccionado(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const dominio = getDominioInfo(dominioSeleccionado);
                const evaluacion = getEvaluacion(dominioSeleccionado);
                if (!dominio || !evaluacion) return null;

                const Icon = dominio.icon;
                const nivelInfo = getNivelInfo(evaluacion.nivelActual);

                return (
                  <>
                    {/* Header */}
                    <div className={`sticky top-0 bg-gradient-to-r ${dominio.color} text-white p-6 rounded-t-2xl z-10`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-xl">
                            <Icon className="w-8 h-8" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-black mb-2">{dominio.nombre}</h2>
                            <p className="text-white/90">{dominio.descripcion}</p>
                            <div className="mt-3 flex items-center gap-3">
                              <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">
                                Nivel {evaluacion.nivelActual} - {nivelInfo.nombre}
                              </span>
                              <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-bold">
                                Objetivo: Nivel {evaluacion.nivelObjetivo}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setDominioSeleccionado(null)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 space-y-6">
                      {/* Criterios de Evaluación */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          Criterios de Evaluación MRAE
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          {dominio.criteriosEvaluacion.map((criterio, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                              <span className="text-gray-900">{criterio}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Fortalezas */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-green-600" />
                          Fortalezas Identificadas
                        </h3>
                        <div className="space-y-2">
                          {evaluacion.fortalezas.map((fortaleza, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                              <span className="text-gray-900">{fortaleza}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Debilidades */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                          Oportunidades de Mejora
                        </h3>
                        <div className="space-y-2">
                          {evaluacion.debilidades.map((debilidad, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                              <span className="text-gray-900">{debilidad}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recomendaciones */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#003DA5]" />
                          Recomendaciones para Avanzar
                        </h3>
                        <div className="space-y-2">
                          {evaluacion.recomendaciones.map((recomendacion, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <ChevronRight className="w-5 h-5 text-[#003DA5] mt-0.5" />
                              <span className="text-gray-900">{recomendacion}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Detalle de Nivel */}
      <AnimatePresence>
        {showDetalleNivel !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetalleNivel(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
            >
              {(() => {
                const nivel = getNivelInfo(showDetalleNivel);
                return (
                  <>
                    <div className={`${nivel.bgColor} border-b-2 ${nivel.borderColor} p-6 rounded-t-2xl`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`text-5xl font-black ${nivel.color} mb-2`}>
                            Nivel {nivel.nivel}
                          </div>
                          <h3 className={`text-2xl font-black ${nivel.color}`}>{nivel.nombre}</h3>
                        </div>
                        <button
                          onClick={() => setShowDetalleNivel(null)}
                          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        >
                          <X className="w-6 h-6 text-gray-600" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <p className="text-gray-700 mb-6">{nivel.descripcion}</p>
                      <h4 className="font-black text-gray-900 mb-3">Características:</h4>
                      <div className="space-y-2">
                        {nivel.caracteristicas.map((caracteristica, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <CheckCircle className={`w-5 h-5 ${nivel.color} mt-0.5`} />
                            <span className="text-gray-900">{caracteristica}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}