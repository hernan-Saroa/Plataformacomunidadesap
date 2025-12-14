import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Star,
  Award,
  Users,
  Target
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface ResultadosEvaluacionProps {
  className?: string;
}

interface DimensionResultado {
  nombre: string;
  promedio: number;
  items: ItemResultado[];
}

interface ItemResultado {
  pregunta: string;
  promedio: number;
  respuestas: number;
}

interface DocenteResultado {
  id: string;
  nombre: string;
  asignatura: string;
  promedio_general: number;
  total_evaluaciones: number;
  tendencia: 'up' | 'down' | 'stable';
}

export function ResultadosEvaluacion({ className = '' }: ResultadosEvaluacionProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-I');
  const [filtroPrograma, setFiltroPrograma] = useState('todos');

  // Mock data - Resultados globales
  const estadisticas = {
    promedio_institucional: 4.3,
    total_evaluaciones: 1248,
    docentes_evaluados: 45,
    participacion: 78
  };

  // Mock data - Dimensiones
  const dimensiones: DimensionResultado[] = [
    {
      nombre: 'Dominio del Contenido',
      promedio: 4.5,
      items: [
        { pregunta: 'Dominio de la asignatura', promedio: 4.6, respuestas: 1248 },
        { pregunta: 'Claridad explicaciones', promedio: 4.4, respuestas: 1248 },
        { pregunta: 'Relación con práctica', promedio: 4.5, respuestas: 1248 },
        { pregunta: 'Ejemplos relevantes', promedio: 4.5, respuestas: 1248 }
      ]
    },
    {
      nombre: 'Metodología de Enseñanza',
      promedio: 4.2,
      items: [
        { pregunta: 'Aprendizaje activo', promedio: 4.3, respuestas: 1248 },
        { pregunta: 'Materiales recursos', promedio: 4.1, respuestas: 1248 },
        { pregunta: 'Diversidad estrategias', promedio: 4.2, respuestas: 1248 },
        { pregunta: 'Ritmo adecuado', promedio: 4.2, respuestas: 1248 }
      ]
    },
    {
      nombre: 'Evaluación del Aprendizaje',
      promedio: 4.3,
      items: [
        { pregunta: 'Criterios claros', promedio: 4.4, respuestas: 1248 },
        { pregunta: 'Coherencia evaluaciones', promedio: 4.3, respuestas: 1248 },
        { pregunta: 'Retroalimentación oportuna', promedio: 4.2, respuestas: 1248 },
        { pregunta: 'Calificaciones justas', promedio: 4.3, respuestas: 1248 }
      ]
    },
    {
      nombre: 'Relaciones Interpersonales',
      promedio: 4.6,
      items: [
        { pregunta: 'Ambiente respeto', promedio: 4.7, respuestas: 1248 },
        { pregunta: 'Escucha inquietudes', promedio: 4.6, respuestas: 1248 },
        { pregunta: 'Disponibilidad consultas', promedio: 4.5, respuestas: 1248 },
        { pregunta: 'Promueve participación', promedio: 4.6, respuestas: 1248 }
      ]
    },
    {
      nombre: 'Compromiso Institucional',
      promedio: 4.4,
      items: [
        { pregunta: 'Cumple horario', promedio: 4.5, respuestas: 1248 },
        { pregunta: 'Cumple programa', promedio: 4.4, respuestas: 1248 },
        { pregunta: 'Compromiso formación', promedio: 4.3, respuestas: 1248 }
      ]
    }
  ];

  // Mock data - Top/Bottom docentes
  const topDocentes: DocenteResultado[] = [
    {
      id: '1',
      nombre: 'María López Gómez',
      asignatura: 'Derecho Administrativo I',
      promedio_general: 4.7,
      total_evaluaciones: 38,
      tendencia: 'up'
    },
    {
      id: '2',
      nombre: 'Carlos Ruiz Pérez',
      asignatura: 'Gestión Pública',
      promedio_general: 4.6,
      total_evaluaciones: 45,
      tendencia: 'stable'
    },
    {
      id: '3',
      nombre: 'Ana Martínez Silva',
      asignatura: 'Economía Colombiana',
      promedio_general: 4.5,
      total_evaluaciones: 48,
      tendencia: 'up'
    }
  ];

  const docentesAtencion: DocenteResultado[] = [
    {
      id: '4',
      nombre: 'Juan Torres Ramírez',
      asignatura: 'Teoría Política',
      promedio_general: 3.2,
      total_evaluaciones: 30,
      tendencia: 'down'
    }
  ];

  const getPromedioColor = (promedio: number) => {
    if (promedio >= 4.5) return 'text-green-600';
    if (promedio >= 4.0) return 'text-blue-600';
    if (promedio >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPromedioBarColor = (promedio: number) => {
    if (promedio >= 4.5) return 'bg-green-500';
    if (promedio >= 4.0) return 'bg-blue-500';
    if (promedio >= 3.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Resultados de Evaluación Docente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Análisis consolidado de evaluaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filtroPrograma}
            onChange={(e) => setFiltroPrograma(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todos los programas</option>
            <option value="derecho">Derecho Público</option>
            <option value="admin">Administración Pública</option>
          </select>
          <select
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="2025-I">2025-I</option>
            <option value="2024-II">2024-II</option>
            <option value="2024-I">2024-I</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 text-amber-500" />
            <span className={`text-3xl font-bold ${getPromedioColor(estadisticas.promedio_institucional)}`}>
              {estadisticas.promedio_institucional}
            </span>
          </div>
          <p className="text-sm text-gray-600">Promedio Institucional</p>
          <p className="text-xs text-gray-500 mt-1">de 5.0</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-blue-500" />
            <span className="text-3xl font-bold text-gray-900">
              {estadisticas.total_evaluaciones}
            </span>
          </div>
          <p className="text-sm text-gray-600">Evaluaciones Recibidas</p>
          <p className="text-xs text-gray-500 mt-1">{estadisticas.participacion}% participación</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-purple-500" />
            <span className="text-3xl font-bold text-gray-900">
              {estadisticas.docentes_evaluados}
            </span>
          </div>
          <p className="text-sm text-gray-600">Docentes Evaluados</p>
          <p className="text-xs text-gray-500 mt-1">Periodo {periodoSeleccionado}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-green-500" />
            <span className="text-3xl font-bold text-gray-900">
              {topDocentes.length}
            </span>
          </div>
          <p className="text-sm text-gray-600">Desempeño Destacado</p>
          <p className="text-xs text-gray-500 mt-1">≥ 4.5 promedio</p>
        </Card>
      </div>

      {/* Resultados por Dimensión */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-900 mb-4">Resultados por Dimensión</h3>
        <div className="space-y-6">
          {dimensiones.map((dimension, index) => (
            <motion.div
              key={dimension.nombre}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="space-y-3">
                {/* Header de Dimensión */}
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{dimension.nombre}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getPromedioColor(dimension.promedio)}`}>
                      {dimension.promedio.toFixed(1)}
                    </span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            dimension.promedio >= star
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Items de la Dimensión */}
                <div className="space-y-2 pl-4">
                  {dimension.items.map((item) => (
                    <div key={item.pregunta} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{item.pregunta}</span>
                        <span className={`font-bold ${getPromedioColor(item.promedio)}`}>
                          {item.promedio.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getPromedioBarColor(item.promedio)}`}
                          style={{ width: `${(item.promedio / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Top Docentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-gray-900">Desempeño Destacado</h3>
          </div>
          <div className="space-y-3">
            {topDocentes.map((docente, index) => (
              <motion.div
                key={docente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-green-50 border border-green-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">
                      #{index + 1}
                    </Badge>
                    <div>
                      <p className="font-medium text-gray-900">{docente.nombre}</p>
                      <p className="text-sm text-gray-600">{docente.asignatura}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {docente.tendencia === 'up' && (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    )}
                    {docente.tendencia === 'down' && (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {docente.total_evaluaciones} evaluaciones
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {docente.promedio_general.toFixed(1)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Docentes que Requieren Atención */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900">Requieren Atención</h3>
          </div>
          <div className="space-y-3">
            {docentesAtencion.map((docente, index) => (
              <motion.div
                key={docente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-amber-50 border border-amber-200 rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{docente.nombre}</p>
                    <p className="text-sm text-gray-600">{docente.asignatura}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {docente.tendencia === 'down' && (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    {docente.total_evaluaciones} evaluaciones
                  </span>
                  <span className="text-2xl font-bold text-amber-600">
                    {docente.promedio_general.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    Plan de Mejoramiento
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Gráfico de Tendencias */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Tendencia Histórica</h3>
          <Badge variant="secondary">Últimos 3 periodos</Badge>
        </div>
        
        <div className="space-y-4">
          {['2025-I', '2024-II', '2024-I'].map((periodo, index) => {
            const promedios = [4.3, 4.2, 4.1];
            const promedio = promedios[index];
            
            return (
              <div key={periodo} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900">{periodo}</span>
                  <span className={`font-bold ${getPromedioColor(promedio)}`}>
                    {promedio.toFixed(1)}
                  </span>
                </div>
                <Progress 
                  value={(promedio / 5) * 100} 
                  className={`h-3 ${getPromedioBarColor(promedio)}`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700">
              <strong>Tendencia positiva:</strong> El promedio institucional ha mejorado 0.2 puntos en el último año
            </p>
          </div>
        </div>
      </Card>

      {/* Acciones */}
      <Card className="p-6 bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">Acciones Disponibles</h4>
            <p className="text-sm text-gray-600">
              Gestiona los resultados de evaluación
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Gráficos Detallados
            </Button>
            <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
              <Download className="w-4 h-4 mr-2" />
              Generar Informe Completo
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
