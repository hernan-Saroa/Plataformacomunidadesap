import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Search,
  Filter,
  Download,
  TrendingUp,
  Users,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  FileText,
  Eye,
  Edit,
  Calendar
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface EvaluacionListProps {
  className?: string;
}

interface Evaluacion {
  id: string;
  titulo: string;
  periodo: string;
  tipo: 'Estudiantes' | 'Pares' | 'Auto-evaluación' | 'Directiva';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Activa' | 'Finalizada' | 'Pendiente' | 'Borrador';
  docentes_evaluados: number;
  respuestas_recibidas: number;
  respuestas_esperadas: number;
  promedio_general: number;
  created_at: string;
}

export function EvaluacionList({ className = '' }: EvaluacionListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [vistaActual, setVistaActual] = useState<'grid' | 'lista'>('grid');

  // Mock data de evaluaciones
  const evaluaciones: Evaluacion[] = [
    {
      id: '1',
      titulo: 'Evaluación Docente 2025-I',
      periodo: '2025-I',
      tipo: 'Estudiantes',
      fecha_inicio: '2025-06-01',
      fecha_fin: '2025-06-15',
      estado: 'Activa',
      docentes_evaluados: 45,
      respuestas_recibidas: 1250,
      respuestas_esperadas: 1800,
      promedio_general: 4.3,
      created_at: '2025-05-20'
    },
    {
      id: '2',
      titulo: 'Evaluación por Pares - Primer Semestre',
      periodo: '2025-I',
      tipo: 'Pares',
      fecha_inicio: '2025-06-10',
      fecha_fin: '2025-06-20',
      estado: 'Activa',
      docentes_evaluados: 45,
      respuestas_recibidas: 32,
      respuestas_esperadas: 45,
      promedio_general: 4.5,
      created_at: '2025-05-25'
    },
    {
      id: '3',
      titulo: 'Auto-evaluación Docente 2025-I',
      periodo: '2025-I',
      tipo: 'Auto-evaluación',
      fecha_inicio: '2025-06-05',
      fecha_fin: '2025-06-12',
      estado: 'Activa',
      docentes_evaluados: 45,
      respuestas_recibidas: 38,
      respuestas_esperadas: 45,
      promedio_general: 4.2,
      created_at: '2025-05-22'
    },
    {
      id: '4',
      titulo: 'Evaluación Docente 2024-II',
      periodo: '2024-II',
      tipo: 'Estudiantes',
      fecha_inicio: '2024-12-01',
      fecha_fin: '2024-12-15',
      estado: 'Finalizada',
      docentes_evaluados: 42,
      respuestas_recibidas: 1680,
      respuestas_esperadas: 1680,
      promedio_general: 4.1,
      created_at: '2024-11-20'
    },
    {
      id: '5',
      titulo: 'Evaluación Directiva - Fin de Año',
      periodo: '2024-II',
      tipo: 'Directiva',
      fecha_inicio: '2024-12-10',
      fecha_fin: '2024-12-20',
      estado: 'Finalizada',
      docentes_evaluados: 42,
      respuestas_recibidas: 42,
      respuestas_esperadas: 42,
      promedio_general: 4.4,
      created_at: '2024-11-28'
    },
    {
      id: '6',
      titulo: 'Evaluación Docente 2025-II',
      periodo: '2025-II',
      tipo: 'Estudiantes',
      fecha_inicio: '2025-12-01',
      fecha_fin: '2025-12-15',
      estado: 'Pendiente',
      docentes_evaluados: 0,
      respuestas_recibidas: 0,
      respuestas_esperadas: 0,
      promedio_general: 0,
      created_at: '2025-11-15'
    }
  ];

  const getEstadoConfig = (estado: Evaluacion['estado']) => {
    switch (estado) {
      case 'Activa':
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: CheckCircle,
          textColor: 'text-green-700'
        };
      case 'Finalizada':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: CheckCircle,
          textColor: 'text-blue-700'
        };
      case 'Pendiente':
        return {
          color: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: Clock,
          textColor: 'text-amber-700'
        };
      case 'Borrador':
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: FileText,
          textColor: 'text-gray-700'
        };
    }
  };

  const getTipoColor = (tipo: Evaluacion['tipo']) => {
    switch (tipo) {
      case 'Estudiantes':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Pares':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Auto-evaluación':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Directiva':
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  const getPromedioColor = (promedio: number) => {
    if (promedio >= 4.5) return 'text-green-600';
    if (promedio >= 4.0) return 'text-blue-600';
    if (promedio >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calcularProgreso = (recibidas: number, esperadas: number) => {
    if (esperadas === 0) return 0;
    return Math.round((recibidas / esperadas) * 100);
  };

  // Estadísticas
  const stats = {
    total: evaluaciones.length,
    activas: evaluaciones.filter(e => e.estado === 'Activa').length,
    finalizadas: evaluaciones.filter(e => e.estado === 'Finalizada').length,
    promedio_general: (
      evaluaciones
        .filter(e => e.promedio_general > 0)
        .reduce((sum, e) => sum + e.promedio_general, 0) /
      evaluaciones.filter(e => e.promedio_general > 0).length
    ).toFixed(1)
  };

  const evaluacionesFiltradas = evaluaciones.filter(evaluacion => {
    const matchSearch = evaluacion.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       evaluacion.periodo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTipo = filtroTipo === 'todas' || evaluacion.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'todas' || evaluacion.estado === filtroEstado;
    return matchSearch && matchTipo && matchEstado;
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Evaluación Docente
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sistema integral de evaluación y seguimiento docente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Evaluaciones</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.activas}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Finalizadas</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.finalizadas}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Promedio General</p>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-2xl font-bold ${getPromedioColor(parseFloat(stats.promedio_general))}`}>
                  {stats.promedio_general}
                </p>
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar evaluación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todas">Todos los tipos</option>
            <option value="Estudiantes">Estudiantes</option>
            <option value="Pares">Pares</option>
            <option value="Auto-evaluación">Auto-evaluación</option>
            <option value="Directiva">Directiva</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todas">Todos los estados</option>
            <option value="Activa">Activa</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Borrador">Borrador</option>
          </select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActual('grid')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vistaActual === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setVistaActual('lista')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vistaActual === 'lista'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lista
            </button>
          </div>
        </div>
      </Card>

      {/* Vista Grid */}
      {vistaActual === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evaluacionesFiltradas.map((evaluacion, index) => {
            const estadoConfig = getEstadoConfig(evaluacion.estado);
            const IconEstado = estadoConfig.icon;
            const progreso = calcularProgreso(evaluacion.respuestas_recibidas, evaluacion.respuestas_esperadas);

            return (
              <motion.div
                key={evaluacion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                        {evaluacion.titulo}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getTipoColor(evaluacion.tipo)}>
                          {evaluacion.tipo}
                        </Badge>
                        <Badge className={estadoConfig.color}>
                          <IconEstado className="w-3 h-3 mr-1" />
                          {evaluacion.estado}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-3 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Periodo:</span>
                      <span>{evaluacion.periodo}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(evaluacion.fecha_inicio)} - {formatDate(evaluacion.fecha_fin)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span className="font-medium">Docentes:</span>
                      <span>{evaluacion.docentes_evaluados}</span>
                    </div>

                    {evaluacion.promedio_general > 0 && (
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className={`font-bold ${getPromedioColor(evaluacion.promedio_general)}`}>
                          {evaluacion.promedio_general.toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-600">/ 5.0</span>
                      </div>
                    )}
                  </div>

                  {/* Progreso */}
                  {evaluacion.estado === 'Activa' && evaluacion.respuestas_esperadas > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progreso</span>
                        <span className="font-bold text-gray-900">
                          {evaluacion.respuestas_recibidas} / {evaluacion.respuestas_esperadas}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            progreso >= 80 ? 'bg-green-500' : progreso >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progreso}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{progreso}% completado</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                    {evaluacion.estado !== 'Finalizada' && (
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {evaluacion.estado === 'Finalizada' && (
                      <Button variant="outline" size="sm">
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vista Lista */}
      {vistaActual === 'lista' && (
        <div className="space-y-3">
          {evaluacionesFiltradas.map((evaluacion, index) => {
            const estadoConfig = getEstadoConfig(evaluacion.estado);
            const IconEstado = estadoConfig.icon;
            const progreso = calcularProgreso(evaluacion.respuestas_recibidas, evaluacion.respuestas_esperadas);

            return (
              <motion.div
                key={evaluacion.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-6">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 mb-2">{evaluacion.titulo}</h3>
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge className={getTipoColor(evaluacion.tipo)}>
                              {evaluacion.tipo}
                            </Badge>
                            <Badge className={estadoConfig.color}>
                              <IconEstado className="w-3 h-3 mr-1" />
                              {evaluacion.estado}
                            </Badge>
                            <span className="text-sm text-gray-600">Periodo: {evaluacion.periodo}</span>
                          </div>
                        </div>

                        {evaluacion.promedio_general > 0 && (
                          <div className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                            <span className={`text-xl font-bold ${getPromedioColor(evaluacion.promedio_general)}`}>
                              {evaluacion.promedio_general.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(evaluacion.fecha_inicio)} - {formatDate(evaluacion.fecha_fin)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>{evaluacion.docentes_evaluados} docentes</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>
                            {evaluacion.respuestas_recibidas} / {evaluacion.respuestas_esperadas} respuestas
                          </span>
                        </div>
                      </div>

                      {/* Progreso inline */}
                      {evaluacion.estado === 'Activa' && evaluacion.respuestas_esperadas > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-xs">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  progreso >= 80 ? 'bg-green-500' : progreso >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-600">{progreso}%</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalles
                      </Button>
                      {evaluacion.estado === 'Finalizada' && (
                        <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
                          <BarChart3 className="w-4 h-4 mr-1" />
                          Resultados
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {evaluacionesFiltradas.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No se encontraron evaluaciones</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || filtroTipo !== 'todas' || filtroEstado !== 'todas'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Crea tu primera evaluación docente'}
            </p>
            {!searchQuery && filtroTipo === 'todas' && filtroEstado === 'todas' && (
              <Button className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Evaluación
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
