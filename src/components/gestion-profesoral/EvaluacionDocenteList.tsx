import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ResultadosEvaluacionPanel } from './ResultadosEvaluacionPanel';
import { EvaluacionDocenteFormModal } from './EvaluacionDocenteFormModal';
import { toast } from 'sonner@2.0.3';

interface EvaluacionDocenteListProps {
  className?: string;
}

interface Evaluacion {
  id: string;
  docente_id: string;
  docente_nombre: string;
  docente_foto?: string;
  periodo: string;
  tipo: 'Estudiantes' | 'Pares' | 'Auto-evaluación' | 'Administrativa';
  estado: 'Pendiente' | 'En Proceso' | 'Finalizada' | 'Cancelada';
  fecha_inicio: string;
  fecha_fin: string;
  participantes_esperados: number;
  participantes_completados: number;
  puntaje_promedio?: number;
  aspectos_evaluados: number;
  created_at: string;
}

export function EvaluacionDocenteList({ className = '' }: EvaluacionDocenteListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [vistaActual, setVistaActual] = useState<'lista' | 'resultados'>('lista');
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEvaluacion, setEditingEvaluacion] = useState<Evaluacion | null>(null);

  // Mock data de evaluaciones
  const evaluaciones: Evaluacion[] = [
    {
      id: '1',
      docente_id: '1',
      docente_nombre: 'María López Gómez',
      periodo: '2025-I',
      tipo: 'Estudiantes',
      estado: 'En Proceso',
      fecha_inicio: '2025-04-01',
      fecha_fin: '2025-04-15',
      participantes_esperados: 78,
      participantes_completados: 52,
      puntaje_promedio: 4.3,
      aspectos_evaluados: 8,
      created_at: '2025-03-25T10:00:00Z'
    },
    {
      id: '2',
      docente_id: '1',
      docente_nombre: 'María López Gómez',
      periodo: '2024-II',
      tipo: 'Estudiantes',
      estado: 'Finalizada',
      fecha_inicio: '2024-11-01',
      fecha_fin: '2024-11-15',
      participantes_esperados: 70,
      participantes_completados: 68,
      puntaje_promedio: 4.5,
      aspectos_evaluados: 8,
      created_at: '2024-10-25T10:00:00Z'
    },
    {
      id: '3',
      docente_id: '2',
      docente_nombre: 'Carlos Ruiz Pérez',
      periodo: '2025-I',
      tipo: 'Pares',
      estado: 'Finalizada',
      fecha_inicio: '2025-03-10',
      fecha_fin: '2025-03-20',
      participantes_esperados: 5,
      participantes_completados: 5,
      puntaje_promedio: 4.7,
      aspectos_evaluados: 10,
      created_at: '2025-03-01T10:00:00Z'
    },
    {
      id: '4',
      docente_id: '3',
      docente_nombre: 'Ana Martínez Silva',
      periodo: '2025-I',
      tipo: 'Estudiantes',
      estado: 'Pendiente',
      fecha_inicio: '2025-06-01',
      fecha_fin: '2025-06-15',
      participantes_esperados: 95,
      participantes_completados: 0,
      aspectos_evaluados: 8,
      created_at: '2025-05-20T10:00:00Z'
    },
    {
      id: '5',
      docente_id: '2',
      docente_nombre: 'Carlos Ruiz Pérez',
      periodo: '2025-I',
      tipo: 'Auto-evaluación',
      estado: 'Finalizada',
      fecha_inicio: '2025-03-15',
      fecha_fin: '2025-03-22',
      participantes_esperados: 1,
      participantes_completados: 1,
      puntaje_promedio: 4.2,
      aspectos_evaluados: 12,
      created_at: '2025-03-10T10:00:00Z'
    },
    {
      id: '6',
      docente_id: '4',
      docente_nombre: 'Juan Torres Ramírez',
      periodo: '2025-I',
      tipo: 'Administrativa',
      estado: 'En Proceso',
      fecha_inicio: '2025-04-05',
      fecha_fin: '2025-04-12',
      participantes_esperados: 3,
      participantes_completados: 2,
      puntaje_promedio: 4.4,
      aspectos_evaluados: 15,
      created_at: '2025-03-30T10:00:00Z'
    }
  ];

  const getEstadoConfig = (estado: Evaluacion['estado']) => {
    switch (estado) {
      case 'Pendiente':
        return {
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: Clock
        };
      case 'En Proceso':
        return {
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: AlertCircle
        };
      case 'Finalizada':
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: CheckCircle
        };
      case 'Cancelada':
        return {
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: AlertCircle
        };
    }
  };

  const getTipoColor = (tipo: Evaluacion['tipo']) => {
    switch (tipo) {
      case 'Estudiantes':
        return 'bg-purple-500';
      case 'Pares':
        return 'bg-blue-500';
      case 'Auto-evaluación':
        return 'bg-green-500';
      case 'Administrativa':
        return 'bg-amber-500';
    }
  };

  const getTipoIcon = (tipo: Evaluacion['tipo']) => {
    switch (tipo) {
      case 'Estudiantes':
        return Users;
      case 'Pares':
        return Users;
      case 'Auto-evaluación':
        return FileText;
      case 'Administrativa':
        return BarChart3;
    }
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return parts.length >= 2
      ? `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
      : nombre.slice(0, 2).toUpperCase();
  };

  const calcularProgreso = (completados: number, esperados: number): number => {
    return esperados > 0 ? Math.round((completados / esperados) * 100) : 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (fechaFin: string): number => {
    const today = new Date();
    const end = new Date(fechaFin);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filtrar evaluaciones
  const evaluacionesFiltradas = evaluaciones.filter((evaluacion) => {
    const matchSearch =
      evaluacion.docente_nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evaluacion.periodo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || evaluacion.estado === filtroEstado;
    const matchTipo = filtroTipo === 'todos' || evaluacion.tipo === filtroTipo;

    return matchSearch && matchEstado && matchTipo;
  });

  // Estadísticas
  const stats = {
    total: evaluaciones.length,
    pendientes: evaluaciones.filter((e) => e.estado === 'Pendiente').length,
    en_proceso: evaluaciones.filter((e) => e.estado === 'En Proceso').length,
    finalizadas: evaluaciones.filter((e) => e.estado === 'Finalizada').length,
    promedio_general:
      evaluaciones
        .filter((e) => e.puntaje_promedio)
        .reduce((acc, e) => acc + (e.puntaje_promedio || 0), 0) /
        evaluaciones.filter((e) => e.puntaje_promedio).length || 0
  };

  const handleEditEvaluacion = (evaluacion: Evaluacion) => {
    setEditingEvaluacion(evaluacion);
    setShowFormModal(true);
  };

  const handleDeleteEvaluacion = (id: string) => {
    toast.success('Evaluación eliminada exitosamente');
  };

  const handleViewResultados = (id: string) => {
    setSelectedEvaluacion(id);
    setVistaActual('resultados');
  };

  const handleFormSuccess = (data: any) => {
    console.log('Evaluación guardada:', data);
    setShowFormModal(false);
    setEditingEvaluacion(null);
  };

  if (vistaActual === 'resultados' && selectedEvaluacion) {
    const evaluacion = evaluaciones.find((e) => e.id === selectedEvaluacion);
    return (
      <ResultadosEvaluacionPanel
        evaluacion={evaluacion!}
        onBack={() => setVistaActual('lista')}
        className={className}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Evaluación Docente
          </h1>
          <p className="text-gray-600 mt-1">
            Sistema de evaluación integral del desempeño docente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            size="sm"
            className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
            onClick={() => {
              setEditingEvaluacion(null);
              setShowFormModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.pendientes}</p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.en_proceso}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Finalizadas</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.finalizadas}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Promedio</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {stats.promedio_general.toFixed(1)}
              </p>
            </div>
            <Star className="w-8 h-8 text-amber-400" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por docente o periodo..."
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
            <option value="todos">Todos los tipos</option>
            <option value="Estudiantes">Estudiantes</option>
            <option value="Pares">Pares</option>
            <option value="Auto-evaluación">Auto-evaluación</option>
            <option value="Administrativa">Administrativa</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Finalizada">Finalizada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </Card>

      {/* Lista de Evaluaciones */}
      <div className="space-y-3">
        {evaluacionesFiltradas.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No hay evaluaciones
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || filtroEstado !== 'todos' || filtroTipo !== 'todos'
                  ? 'No se encontraron evaluaciones con los filtros aplicados'
                  : 'Crea la primera evaluación para comenzar'}
              </p>
              <Button
                size="sm"
                className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                onClick={() => {
                  setEditingEvaluacion(null);
                  setShowFormModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Evaluación
              </Button>
            </div>
          </Card>
        ) : (
          evaluacionesFiltradas.map((evaluacion, index) => {
            const estadoConfig = getEstadoConfig(evaluacion.estado);
            const IconEstado = estadoConfig.icon;
            const TipoIcon = getTipoIcon(evaluacion.tipo);
            const progreso = calcularProgreso(
              evaluacion.participantes_completados,
              evaluacion.participantes_esperados
            );
            const daysRemaining = getDaysRemaining(evaluacion.fecha_fin);

            return (
              <motion.div
                key={evaluacion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    {/* Avatar y tipo */}
                    <div className="relative">
                      <Avatar className="w-14 h-14">
                        <AvatarImage src={evaluacion.docente_foto} />
                        <AvatarFallback className="bg-[#1e5da8] text-white">
                          {getInitials(evaluacion.docente_nombre)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${getTipoColor(
                          evaluacion.tipo
                        )} flex items-center justify-center shadow-md`}
                      >
                        <TipoIcon className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">
                            {evaluacion.docente_nombre}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{evaluacion.periodo}</Badge>
                            <Badge className={estadoConfig.color}>
                              <IconEstado className="w-3 h-3 mr-1" />
                              {evaluacion.estado}
                            </Badge>
                            <Badge className={`${getTipoColor(evaluacion.tipo)} text-white`}>
                              {evaluacion.tipo}
                            </Badge>
                          </div>
                        </div>

                        {/* Puntaje */}
                        {evaluacion.puntaje_promedio && (
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                              <span className="text-2xl font-bold text-gray-900">
                                {evaluacion.puntaje_promedio.toFixed(1)}
                              </span>
                              <span className="text-gray-600">/5.0</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info adicional */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {formatDate(evaluacion.fecha_inicio)} - {formatDate(evaluacion.fecha_fin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4" />
                          <span>
                            {evaluacion.participantes_completados}/{evaluacion.participantes_esperados}{' '}
                            participantes
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <FileText className="w-4 h-4" />
                          <span>{evaluacion.aspectos_evaluados} aspectos evaluados</span>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      {evaluacion.estado === 'En Proceso' && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-600">Progreso</span>
                            <span className="text-sm font-medium text-gray-900">{progreso}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-500 transition-all"
                              style={{ width: `${progreso}%` }}
                            />
                          </div>
                          {daysRemaining > 0 && daysRemaining <= 7 && (
                            <p className="text-xs text-amber-600 mt-1">
                              ⏱️ Quedan {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewResultados(evaluacion.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver Resultados
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditEvaluacion(evaluacion)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteEvaluacion(evaluacion.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal de Formulario */}
      {showFormModal && (
        <EvaluacionDocenteFormModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setEditingEvaluacion(null);
          }}
          onSuccess={handleFormSuccess}
          evaluacion={editingEvaluacion}
          modo={editingEvaluacion ? 'editar' : 'crear'}
        />
      )}
    </div>
  );
}
