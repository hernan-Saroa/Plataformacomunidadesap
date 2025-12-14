import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  FileText,
  Users,
  GraduationCap,
  MoreVertical
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { toast } from 'sonner@2.0.3';

// Importar modales
import { PeriodoFormModal } from './PeriodoFormModal';
import { EventoFormModal } from './EventoFormModal';

interface CalendarioAcademicoProps {
  className?: string;
}

interface Periodo {
  id: string;
  nombre: string;
  tipo: 'Académico' | 'Vacaciones' | 'Intersemestral';
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'Planificado' | 'Activo' | 'Finalizado';
  eventos: Evento[];
}

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  tipo: 'Inscripciones' | 'Clases' | 'Evaluaciones' | 'PTAs' | 'Convocatorias' | 'Otro';
  prioridad: 'alta' | 'media' | 'baja';
}

export function CalendarioAcademico({ className = '' }: CalendarioAcademicoProps) {
  const [vistaActual, setVistaActual] = useState<'timeline' | 'grid'>('timeline');
  const [mesActual, setMesActual] = useState(new Date());
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string | null>(null);

  // Mock data de periodos
  const periodos: Periodo[] = [
    {
      id: '1',
      nombre: '2025-I',
      tipo: 'Académico',
      fecha_inicio: '2025-02-03',
      fecha_fin: '2025-06-30',
      estado: 'Planificado',
      eventos: [
        {
          id: 'e1',
          titulo: 'Inicio Inscripciones',
          descripcion: 'Apertura proceso de inscripciones',
          fecha: '2025-01-15',
          tipo: 'Inscripciones',
          prioridad: 'alta'
        },
        {
          id: 'e2',
          titulo: 'Inicio Clases',
          descripcion: 'Primera semana de clases',
          fecha: '2025-02-03',
          tipo: 'Clases',
          prioridad: 'alta'
        },
        {
          id: 'e3',
          titulo: 'Entrega PTAs',
          descripcion: 'Fecha límite entrega PTAs',
          fecha: '2025-02-10',
          tipo: 'PTAs',
          prioridad: 'alta'
        },
        {
          id: 'e4',
          titulo: 'Evaluación Parcial',
          descripcion: 'Semana de evaluaciones parciales',
          fecha: '2025-04-07',
          tipo: 'Evaluaciones',
          prioridad: 'media'
        },
        {
          id: 'e5',
          titulo: 'Evaluación Final',
          descripcion: 'Semana de evaluaciones finales',
          fecha: '2025-06-16',
          tipo: 'Evaluaciones',
          prioridad: 'alta'
        }
      ]
    },
    {
      id: '2',
      nombre: 'Vacaciones Mitad de Año',
      tipo: 'Vacaciones',
      fecha_inicio: '2025-07-01',
      fecha_fin: '2025-07-31',
      estado: 'Planificado',
      eventos: []
    },
    {
      id: '3',
      nombre: '2025-II',
      tipo: 'Académico',
      fecha_inicio: '2025-08-04',
      fecha_fin: '2025-12-15',
      estado: 'Planificado',
      eventos: [
        {
          id: 'e6',
          titulo: 'Convocatoria Docentes',
          descripcion: 'Apertura convocatoria docentes cátedra',
          fecha: '2025-07-01',
          tipo: 'Convocatorias',
          prioridad: 'alta'
        },
        {
          id: 'e7',
          titulo: 'Inicio Clases',
          descripcion: 'Primera semana segundo semestre',
          fecha: '2025-08-04',
          tipo: 'Clases',
          prioridad: 'alta'
        }
      ]
    }
  ];

  const getTipoColor = (tipo: Periodo['tipo']) => {
    switch (tipo) {
      case 'Académico':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Vacaciones':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Intersemestral':
        return 'bg-purple-100 text-purple-700 border-purple-200';
    }
  };

  const getEstadoConfig = (estado: Periodo['estado']) => {
    switch (estado) {
      case 'Planificado':
        return { color: 'bg-gray-100 text-gray-700', icon: Clock };
      case 'Activo':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'Finalizado':
        return { color: 'bg-blue-100 text-blue-700', icon: CheckCircle };
    }
  };

  const getEventoColor = (tipo: Evento['tipo']) => {
    switch (tipo) {
      case 'Inscripciones':
        return 'bg-purple-500';
      case 'Clases':
        return 'bg-blue-500';
      case 'Evaluaciones':
        return 'bg-red-500';
      case 'PTAs':
        return 'bg-amber-500';
      case 'Convocatorias':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPrioridadIcon = (prioridad: Evento['prioridad']) => {
    if (prioridad === 'alta') return '🔴';
    if (prioridad === 'media') return '🟡';
    return '🟢';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const target = new Date(dateString);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calcular duración del periodo en días
  const getPeriodoDuration = (inicio: string, fin: string) => {
    const start = new Date(inicio);
    const end = new Date(fin);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Calendario Académico
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestión de periodos y eventos académicos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setVistaActual('timeline')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                vistaActual === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
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
          </div>
          <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Periodo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Periodos Activos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">1</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eventos Próximos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">8</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">PTAs Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">15</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Convocatorias</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Vista Timeline */}
      {vistaActual === 'timeline' && (
        <div className="space-y-6">
          {periodos.map((periodo, index) => {
            const estadoConfig = getEstadoConfig(periodo.estado);
            const IconEstado = estadoConfig.icon;
            const duracionDias = getPeriodoDuration(periodo.fecha_inicio, periodo.fecha_fin);

            return (
              <motion.div
                key={periodo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  {/* Header del Periodo */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{periodo.nombre}</h3>
                        <Badge className={getTipoColor(periodo.tipo)}>{periodo.tipo}</Badge>
                        <Badge className={estadoConfig.color}>
                          <IconEstado className="w-3 h-3 mr-1" />
                          {periodo.estado}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{duracionDias} días</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Periodo
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Evento
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Timeline de Eventos */}
                  {periodo.eventos.length > 0 ? (
                    <div className="relative">
                      {/* Línea vertical */}
                      <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />

                      <div className="space-y-4">
                        {periodo.eventos.map((evento, idx) => {
                          const daysUntil = getDaysUntil(evento.fecha);
                          const isPast = daysUntil < 0;
                          const isToday = daysUntil === 0;

                          return (
                            <motion.div
                              key={evento.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + idx * 0.05 }}
                              className="relative pl-8"
                            >
                              {/* Punto en la línea */}
                              <div
                                className={`absolute left-0 w-5 h-5 rounded-full border-4 border-white ${getEventoColor(
                                  evento.tipo
                                )} ${isPast ? 'opacity-50' : ''}`}
                              />

                              <div
                                className={`p-4 rounded-lg border-2 ${
                                  isPast
                                    ? 'bg-gray-50 border-gray-200'
                                    : isToday
                                    ? 'bg-blue-50 border-blue-300 shadow-md'
                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                } transition-all`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span>{getPrioridadIcon(evento.prioridad)}</span>
                                      <h4 className="font-bold text-gray-900">{evento.titulo}</h4>
                                      <Badge variant="secondary" className="text-xs">
                                        {evento.tipo}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-gray-600">{evento.descripcion}</p>
                                  </div>
                                  <button className="p-1 hover:bg-gray-100 rounded">
                                    <Edit className="w-4 h-4 text-gray-600" />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="w-4 h-4" />
                                    <span>{formatDate(evento.fecha)}</span>
                                  </div>
                                  {!isPast && (
                                    <Badge
                                      className={
                                        isToday
                                          ? 'bg-blue-100 text-blue-700'
                                          : daysUntil <= 7
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-gray-100 text-gray-700'
                                      }
                                    >
                                      {isToday
                                        ? 'Hoy'
                                        : daysUntil === 1
                                        ? 'Mañana'
                                        : `En ${daysUntil} días`}
                                    </Badge>
                                  )}
                                  {isPast && (
                                    <Badge className="bg-gray-100 text-gray-600">Finalizado</Badge>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-3">No hay eventos registrados</p>
                      <Button variant="outline" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Evento
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Vista Grid */}
      {vistaActual === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodos.map((periodo, index) => {
            const estadoConfig = getEstadoConfig(periodo.estado);
            const IconEstado = estadoConfig.icon;
            const duracionDias = getPeriodoDuration(periodo.fecha_inicio, periodo.fecha_fin);

            return (
              <motion.div
                key={periodo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">{periodo.nombre}</h3>
                      <div className="flex items-center gap-2">
                        <Badge className={getTipoColor(periodo.tipo)}>{periodo.tipo}</Badge>
                        <Badge className={estadoConfig.color}>
                          <IconEstado className="w-3 h-3 mr-1" />
                          {periodo.estado}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(periodo.fecha_inicio)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(periodo.fecha_fin)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{duracionDias} días</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-2">
                      {periodo.eventos.length} evento{periodo.eventos.length !== 1 ? 's' : ''}
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Detalles
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Próximos Eventos (Sidebar) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Próximos Eventos Importantes</h3>
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="space-y-3">
          {periodos
            .flatMap(p => p.eventos)
            .filter(e => getDaysUntil(e.fecha) >= 0)
            .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
            .slice(0, 5)
            .map((evento, index) => {
              const daysUntil = getDaysUntil(evento.fecha);
              const isUrgent = daysUntil <= 7;

              return (
                <motion.div
                  key={evento.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${
                    isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getEventoColor(evento.tipo)}`} />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{evento.titulo}</p>
                      <p className="text-xs text-gray-600 mt-1">{formatDate(evento.fecha)}</p>
                    </div>
                    <Badge className={isUrgent ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}>
                      {daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}