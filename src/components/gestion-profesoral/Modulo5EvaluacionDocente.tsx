import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Star,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  Calendar,
  Award,
  Target,
  ClipboardCheck
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner@2.0.3';

interface Modulo5EvaluacionDocenteProps {
  className?: string;
}

// Mock data
interface EvaluacionDocente {
  id: string;
  docente: string;
  tipoDocente: 'PTA' | 'Hora Cátedra';
  territorial: string;
  programa: string;
  periodo: string;
  puntajeEstudiantes: number;
  puntajeAutoevaluacion: number;
  puntajeDirectivo: number;
  puntajeFinal: number;
  estado: 'Completada' | 'En Proceso' | 'Pendiente';
  cumplimientoPTA?: number; // Solo para docentes PTA
}

const evaluacionesMock: EvaluacionDocente[] = [
  {
    id: 'eval-001',
    docente: 'Juan Carlos Pérez',
    tipoDocente: 'PTA',
    territorial: 'Bogotá',
    programa: 'Administración Pública',
    periodo: '2024-2',
    puntajeEstudiantes: 4.5,
    puntajeAutoevaluacion: 4.3,
    puntajeDirectivo: 4.6,
    puntajeFinal: 4.5,
    estado: 'Completada',
    cumplimientoPTA: 95
  },
  {
    id: 'eval-002',
    docente: 'María López Gómez',
    tipoDocente: 'PTA',
    territorial: 'Medellín',
    programa: 'Derecho Público',
    periodo: '2024-2',
    puntajeEstudiantes: 4.8,
    puntajeAutoevaluacion: 4.5,
    puntajeDirectivo: 4.7,
    puntajeFinal: 4.7,
    estado: 'Completada',
    cumplimientoPTA: 100
  },
  {
    id: 'eval-003',
    docente: 'Carlos Andrés Martínez',
    tipoDocente: 'Hora Cátedra',
    territorial: 'Bogotá',
    programa: 'Economía Pública',
    periodo: '2024-2',
    puntajeEstudiantes: 4.2,
    puntajeAutoevaluacion: 4.0,
    puntajeDirectivo: 4.3,
    puntajeFinal: 4.2,
    estado: 'En Proceso',
    cumplimientoPTA: undefined
  }
];

export function Modulo5EvaluacionDocente({ className = '' }: Modulo5EvaluacionDocenteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<string>('evaluaciones');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('2024-2');

  // Stats
  const stats = [
    {
      label: 'Total Docentes',
      value: '1,470',
      subtext: 'PTA + Hora Cátedra',
      icon: Users,
      color: 'bg-blue-500',
      trend: null
    },
    {
      label: 'Evaluaciones Completadas',
      value: '1,234',
      subtext: '84% del total',
      icon: CheckCircle,
      color: 'bg-green-500',
      trend: '+156'
    },
    {
      label: 'Promedio General',
      value: '4.3',
      subtext: 'De 5.0',
      icon: Star,
      color: 'bg-amber-500',
      trend: '+0.2'
    },
    {
      label: 'En Mejoramiento',
      value: '45',
      subtext: 'Planes activos',
      icon: TrendingUp,
      color: 'bg-purple-500',
      trend: '-8'
    }
  ];

  const filteredEvaluaciones = evaluacionesMock.filter(evaluacion => {
    const matchesSearch = evaluacion.docente.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         evaluacion.programa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPeriodo = selectedPeriodo === 'todos' || evaluacion.periodo === selectedPeriodo;
    return matchesSearch && matchesPeriodo;
  });

  const getEstadoBadge = (estado: EvaluacionDocente['estado']) => {
    const variants = {
      'Completada': 'bg-green-100 text-green-700 border-green-200',
      'En Proceso': 'bg-amber-100 text-amber-700 border-amber-200',
      'Pendiente': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return variants[estado];
  };

  const getPuntajeColor = (puntaje: number) => {
    if (puntaje >= 4.5) return 'text-green-600';
    if (puntaje >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const renderStars = (puntaje: number) => {
    const stars = [];
    const fullStars = Math.floor(puntaje);
    const hasHalfStar = puntaje % 1 >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} className="w-4 h-4 fill-amber-200 text-amber-400" />
        );
      } else {
        stars.push(
          <Star key={i} className="w-4 h-4 text-gray-300" />
        );
      }
    }
    return stars;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8" />
            <div>
              <h1 className="text-3xl font-bold">Evaluación Docente</h1>
              <p className="text-sm opacity-90 mt-1">
                Evaluación de desempeño de TODOS los docentes de la institución (~1,470 docentes)
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-white text-amber-600 hover:bg-gray-100"
            onClick={() => toast.success('Abriendo configuración de periodo de evaluación...')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Periodo
          </Button>
        </div>

        {/* Info panel */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h4 className="font-semibold text-sm mb-3">Tipos de Evaluación:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-medium mb-1">📘 Docentes PTA (~270):</p>
              <p className="opacity-95">Evaluación basada en cumplimiento del PTA concertado</p>
            </div>
            <div>
              <p className="font-medium mb-1">⏰ Docentes Hora Cátedra (~1,200):</p>
              <p className="opacity-95">Evaluación basada en resolución de vinculación</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="font-medium mb-1">Fuentes de evaluación:</p>
            <p className="opacity-95">Encuestas estudiantiles • Autoevaluación • Evaluación directivo</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      {stat.trend && (
                        <span className={`text-xs font-medium ${
                          stat.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stat.trend}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                  </div>
                  <div className={`p-2 ${stat.color} rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sub-tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="evaluaciones" className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Evaluaciones</span>
          </TabsTrigger>
          <TabsTrigger value="encuestas" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Encuestas</span>
          </TabsTrigger>
          <TabsTrigger value="resultados" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Resultados</span>
          </TabsTrigger>
          <TabsTrigger value="mejoramiento" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Mejoramiento</span>
            <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700">
              45
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evaluaciones" className="mt-6">
          <Card className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar docentes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <select
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="todos">Todos los periodos</option>
                <option value="2024-2">2024-2</option>
                <option value="2024-1">2024-1</option>
                <option value="2023-2">2023-2</option>
              </select>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>

            {/* Evaluaciones List */}
            <div className="space-y-4">
              {filteredEvaluaciones.map((evaluacion) => (
                <motion.div
                  key={evaluacion.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{evaluacion.docente}</h3>
                        <Badge className={getEstadoBadge(evaluacion.estado)}>
                          {evaluacion.estado}
                        </Badge>
                        <Badge variant="outline" className={
                          evaluacion.tipoDocente === 'PTA' 
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-green-200 bg-green-50 text-green-700'
                        }>
                          {evaluacion.tipoDocente}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                        <span>{evaluacion.territorial}</span>
                        <span>•</span>
                        <span>{evaluacion.programa}</span>
                        <span>•</span>
                        <span>Periodo {evaluacion.periodo}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Puntajes */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <p className="text-xs text-gray-600 mb-1">Estudiantes</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getPuntajeColor(evaluacion.puntajeEstudiantes)}`}>
                          {evaluacion.puntajeEstudiantes.toFixed(1)}
                        </span>
                        <div className="flex gap-0.5">
                          {renderStars(evaluacion.puntajeEstudiantes)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <p className="text-xs text-gray-600 mb-1">Autoevaluación</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getPuntajeColor(evaluacion.puntajeAutoevaluacion)}`}>
                          {evaluacion.puntajeAutoevaluacion.toFixed(1)}
                        </span>
                        <div className="flex gap-0.5">
                          {renderStars(evaluacion.puntajeAutoevaluacion)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <p className="text-xs text-gray-600 mb-1">Directivo</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getPuntajeColor(evaluacion.puntajeDirectivo)}`}>
                          {evaluacion.puntajeDirectivo.toFixed(1)}
                        </span>
                        <div className="flex gap-0.5">
                          {renderStars(evaluacion.puntajeDirectivo)}
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <p className="text-xs text-gray-600 mb-1 font-semibold">Puntaje Final</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-bold ${getPuntajeColor(evaluacion.puntajeFinal)}`}>
                          {evaluacion.puntajeFinal.toFixed(1)}
                        </span>
                        <div className="flex gap-0.5">
                          {renderStars(evaluacion.puntajeFinal)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cumplimiento PTA (solo para docentes PTA) */}
                  {evaluacion.tipoDocente === 'PTA' && evaluacion.cumplimientoPTA !== undefined && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Cumplimiento PTA
                        </span>
                        <span className={`text-sm font-bold ${
                          evaluacion.cumplimientoPTA >= 90 ? 'text-green-600' :
                          evaluacion.cumplimientoPTA >= 70 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {evaluacion.cumplimientoPTA}%
                        </span>
                      </div>
                      <div className="w-full bg-blue-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            evaluacion.cumplimientoPTA >= 90 ? 'bg-green-500' :
                            evaluacion.cumplimientoPTA >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${evaluacion.cumplimientoPTA}%` }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {filteredEvaluaciones.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No se encontraron evaluaciones</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="encuestas" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Encuestas Estudiantiles
              </h3>
              <p className="text-gray-600 mb-4">
                Gestiona las encuestas de evaluación docente por estudiantes
              </p>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Crear Nueva Encuesta
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="resultados" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Análisis de Resultados
              </h3>
              <p className="text-gray-600 mb-4">
                Visualiza estadísticas y tendencias de evaluación docente
              </p>
              <Button className="bg-green-600 hover:bg-green-700">
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Dashboard
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="mejoramiento" className="mt-6">
          <Card className="p-6">
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Planes de Mejoramiento
              </h3>
              <p className="text-gray-600 mb-4">
                45 planes de mejoramiento activos para docentes con evaluación por debajo de 3.5
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Target className="w-4 h-4 mr-2" />
                Ver Planes
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
