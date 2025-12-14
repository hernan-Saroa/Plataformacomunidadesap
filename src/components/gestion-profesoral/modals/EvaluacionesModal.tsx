/**
 * Modal: Evaluaciones - Gestión Profesoral
 * Gestiona evaluaciones docentes y resultados
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Star,
  TrendingUp,
  TrendingDown,
  Award,
  User,
  Calendar,
  BarChart3,
  FileText,
  Eye,
  Download,
  Filter,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  Target,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface Evaluacion {
  id: string;
  docente: {
    nombre: string;
    cedula: string;
    tipoVinculacion: 'Planta' | 'Cátedra';
    email: string;
  };
  periodo: string;
  tipo: 'Estudiantes' | 'Pares' | 'Autoevaluación' | 'Directiva';
  estado: 'Completada' | 'En Proceso' | 'Pendiente' | 'Revisión';
  fechaInicio: string;
  fechaFin: string;
  calificacionGeneral: number;
  respuestas: number;
  totalParticipantes: number;
  dimensiones: {
    dominio: number;
    metodologia: number;
    comunicacion: number;
    evaluacion: number;
    compromiso: number;
  };
  fortalezas: string[];
  oportunidades: string[];
}

interface EvaluacionesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEvaluacionViewed?: (evaluacionId: string) => void;
}

export function EvaluacionesModal({
  isOpen,
  onClose,
  onEvaluacionViewed,
}: EvaluacionesModalProps) {
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<Evaluacion | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Mock data - 10 evaluaciones
  const evaluaciones: Evaluacion[] = [
    {
      id: 'eval_001',
      docente: {
        nombre: 'Dr. Carlos Méndez Rivera',
        cedula: '1234567890',
        tipoVinculacion: 'Planta',
        email: 'carlos.mendez@esap.edu.co',
      },
      periodo: '2024-2',
      tipo: 'Estudiantes',
      estado: 'Completada',
      fechaInicio: '2024-11-01',
      fechaFin: '2024-11-15',
      calificacionGeneral: 4.7,
      respuestas: 142,
      totalParticipantes: 150,
      dimensiones: {
        dominio: 4.8,
        metodologia: 4.6,
        comunicacion: 4.9,
        evaluacion: 4.5,
        compromiso: 4.7,
      },
      fortalezas: [
        'Excelente manejo de contenidos',
        'Comunicación clara y efectiva',
        'Compromiso con el aprendizaje',
      ],
      oportunidades: [
        'Mejorar diversidad de recursos didácticos',
        'Implementar más actividades prácticas',
      ],
    },
    {
      id: 'eval_002',
      docente: {
        nombre: 'Dra. Ana Gutiérrez López',
        cedula: '0987654321',
        tipoVinculacion: 'Planta',
        email: 'ana.gutierrez@esap.edu.co',
      },
      periodo: '2024-2',
      tipo: 'Pares',
      estado: 'En Proceso',
      fechaInicio: '2024-11-10',
      fechaFin: '2024-11-24',
      calificacionGeneral: 4.5,
      respuestas: 3,
      totalParticipantes: 5,
      dimensiones: {
        dominio: 4.7,
        metodologia: 4.4,
        comunicacion: 4.6,
        evaluacion: 4.3,
        compromiso: 4.5,
      },
      fortalezas: [
        'Innovación metodológica',
        'Trabajo colaborativo',
      ],
      oportunidades: [
        'Mayor integración interdisciplinar',
      ],
    },
    {
      id: 'eval_003',
      docente: {
        nombre: 'Mg. Roberto Silva Castro',
        cedula: '1122334455',
        tipoVinculacion: 'Cátedra',
        email: 'roberto.silva@esap.edu.co',
      },
      periodo: '2024-2',
      tipo: 'Estudiantes',
      estado: 'Completada',
      fechaInicio: '2024-11-01',
      fechaFin: '2024-11-15',
      calificacionGeneral: 4.2,
      respuestas: 68,
      totalParticipantes: 75,
      dimensiones: {
        dominio: 4.5,
        metodologia: 4.0,
        comunicacion: 4.3,
        evaluacion: 4.1,
        compromiso: 4.2,
      },
      fortalezas: [
        'Sólido conocimiento de la materia',
        'Puntualidad y responsabilidad',
      ],
      oportunidades: [
        'Mejorar retroalimentación',
        'Diversificar estrategias evaluativas',
      ],
    },
    {
      id: 'eval_004',
      docente: {
        nombre: 'Dra. María Fernández Ruiz',
        cedula: '5566778899',
        tipoVinculacion: 'Planta',
        email: 'maria.fernandez@esap.edu.co',
      },
      periodo: '2024-2',
      tipo: 'Autoevaluación',
      estado: 'Revisión',
      fechaInicio: '2024-11-15',
      fechaFin: '2024-11-20',
      calificacionGeneral: 4.3,
      respuestas: 1,
      totalParticipantes: 1,
      dimensiones: {
        dominio: 4.5,
        metodologia: 4.2,
        comunicacion: 4.4,
        evaluacion: 4.1,
        compromiso: 4.3,
      },
      fortalezas: [
        'Actualización constante',
        'Reflexión sobre la práctica',
      ],
      oportunidades: [
        'Mayor uso de TICs',
        'Implementar aprendizaje activo',
      ],
    },
    {
      id: 'eval_005',
      docente: {
        nombre: 'Dr. Luis Ramírez González',
        cedula: '2233445566',
        tipoVinculacion: 'Planta',
        email: 'luis.ramirez@esap.edu.co',
      },
      periodo: '2024-2',
      tipo: 'Directiva',
      estado: 'Pendiente',
      fechaInicio: '2024-11-20',
      fechaFin: '2024-11-30',
      calificacionGeneral: 0,
      respuestas: 0,
      totalParticipantes: 3,
      dimensiones: {
        dominio: 0,
        metodologia: 0,
        comunicacion: 0,
        evaluacion: 0,
        compromiso: 0,
      },
      fortalezas: [],
      oportunidades: [],
    },
  ];

  const evaluacionesFiltradas = evaluaciones.filter((evaluacion) => {
    const matchBusqueda =
      busqueda === '' ||
      evaluacion.docente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      evaluacion.docente.cedula.includes(busqueda);

    const matchTipo = filtroTipo === 'todos' || evaluacion.tipo === filtroTipo;
    const matchEstado = filtroEstado === 'todos' || evaluacion.estado === filtroEstado;

    return matchBusqueda && matchTipo && matchEstado;
  });

  const getEstadoBadge = (estado: Evaluacion['estado']) => {
    const estilos = {
      Completada: 'bg-green-100 text-green-800 border-green-300',
      'En Proceso': 'bg-blue-100 text-blue-800 border-blue-300',
      Pendiente: 'bg-gray-100 text-gray-800 border-gray-300',
      Revisión: 'bg-amber-100 text-amber-800 border-amber-300',
    };
    return estilos[estado];
  };

  const getTipoBadge = (tipo: Evaluacion['tipo']) => {
    const estilos = {
      Estudiantes: 'bg-purple-100 text-purple-800 border-purple-300',
      Pares: 'bg-blue-100 text-blue-800 border-blue-300',
      Autoevaluación: 'bg-green-100 text-green-800 border-green-300',
      Directiva: 'bg-amber-100 text-amber-800 border-amber-300',
    };
    return estilos[tipo];
  };

  const getCalificacionColor = (calificacion: number) => {
    if (calificacion >= 4.5) return 'text-green-600';
    if (calificacion >= 4.0) return 'text-blue-600';
    if (calificacion >= 3.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const renderEstrellas = (calificacion: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= Math.round(calificacion)
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const calcularProgreso = (respuestas: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((respuestas / total) * 100);
  };

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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl mb-1">📊 Evaluaciones Docentes</h2>
                <p className="text-sm text-blue-100">
                  {evaluacionesFiltradas.length} evaluaciones registradas
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filtros */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                <input
                  type="text"
                  placeholder="Buscar por docente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:bg-white/20 focus:border-white/40"
                />
              </div>

              {/* Filtro Tipo */}
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:bg-white/20 cursor-pointer"
              >
                <option value="todos">Todos los tipos</option>
                <option value="Estudiantes">Estudiantes</option>
                <option value="Pares">Pares</option>
                <option value="Autoevaluación">Autoevaluación</option>
                <option value="Directiva">Directiva</option>
              </select>

              {/* Filtro Estado */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:bg-white/20 cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                <option value="Completada">Completada</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Revisión">Revisión</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedEvaluacion ? (
              /* Vista Detalle */
              <div className="space-y-6">
                {/* Header Evaluación */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl">{selectedEvaluacion.docente.nombre}</h3>
                      <Badge className={getEstadoBadge(selectedEvaluacion.estado)}>
                        {selectedEvaluacion.estado}
                      </Badge>
                      <Badge className={getTipoBadge(selectedEvaluacion.tipo)}>
                        {selectedEvaluacion.tipo}
                      </Badge>
                    </div>
                    <p className="text-gray-600">Período {selectedEvaluacion.periodo}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedEvaluacion(null)}>
                    ← Volver a la lista
                  </Button>
                </div>

                {/* Calificación General */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                  <h4 className="text-lg mb-2">Calificación General</h4>
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <span className={`text-6xl ${getCalificacionColor(selectedEvaluacion.calificacionGeneral)}`}>
                      {selectedEvaluacion.calificacionGeneral.toFixed(1)}
                    </span>
                    <span className="text-3xl text-gray-400">/</span>
                    <span className="text-3xl text-gray-600">5.0</span>
                  </div>
                  {renderEstrellas(selectedEvaluacion.calificacionGeneral)}
                  <p className="text-sm text-gray-600 mt-3">
                    {selectedEvaluacion.respuestas} de {selectedEvaluacion.totalParticipantes}{' '}
                    respuestas ({calcularProgreso(selectedEvaluacion.respuestas, selectedEvaluacion.totalParticipantes)}%)
                  </p>
                </div>

                {/* Dimensiones Evaluadas */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Dimensiones Evaluadas
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Dominio de Contenido', valor: selectedEvaluacion.dimensiones.dominio },
                      { label: 'Metodología', valor: selectedEvaluacion.dimensiones.metodologia },
                      { label: 'Comunicación', valor: selectedEvaluacion.dimensiones.comunicacion },
                      { label: 'Evaluación', valor: selectedEvaluacion.dimensiones.evaluacion },
                      { label: 'Compromiso', valor: selectedEvaluacion.dimensiones.compromiso },
                    ].map((dimension) => (
                      <div key={dimension.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{dimension.label}</span>
                          <span className={getCalificacionColor(dimension.valor)}>
                            {dimension.valor.toFixed(1)} / 5.0
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${
                              dimension.valor >= 4.5
                                ? 'bg-green-500'
                                : dimension.valor >= 4.0
                                ? 'bg-blue-500'
                                : dimension.valor >= 3.5
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(dimension.valor / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fortalezas y Oportunidades */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fortalezas */}
                  <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Fortalezas
                    </h4>
                    {selectedEvaluacion.fortalezas.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedEvaluacion.fortalezas.map((fortaleza, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <span>{fortaleza}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600 italic">No hay fortalezas registradas</p>
                    )}
                  </div>

                  {/* Oportunidades de Mejora */}
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
                    <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-amber-600" />
                      Oportunidades de Mejora
                    </h4>
                    {selectedEvaluacion.oportunidades.length > 0 ? (
                      <ul className="space-y-2">
                        {selectedEvaluacion.oportunidades.map((oportunidad, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-amber-600 mt-0.5">→</span>
                            <span>{oportunidad}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-600 italic">
                        No hay oportunidades registradas
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-3">
                  <Button onClick={() => toast.info('Descargando reporte completo...')}>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar Reporte
                  </Button>
                  <Button variant="outline" onClick={() => toast.info('Abriendo comentarios...')}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Ver Comentarios
                  </Button>
                </div>
              </div>
            ) : (
              /* Vista Lista */
              <div className="space-y-3">
                {evaluacionesFiltradas.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No se encontraron evaluaciones con los filtros aplicados
                    </p>
                  </div>
                ) : (
                  evaluacionesFiltradas.map((evaluacion) => (
                    <motion.div
                      key={evaluacion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setSelectedEvaluacion(evaluacion)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl flex-shrink-0">
                          {evaluacion.docente.nombre.charAt(0)}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-bold text-lg mb-1">{evaluacion.docente.nombre}</h4>
                              <div className="flex items-center gap-2">
                                <Badge className={getTipoBadge(evaluacion.tipo)}>
                                  {evaluacion.tipo}
                                </Badge>
                                <Badge className={getEstadoBadge(evaluacion.estado)}>
                                  {evaluacion.estado}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  Período {evaluacion.periodo}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            {/* Calificación */}
                            <div>
                              <p className="text-gray-600 mb-1">Calificación:</p>
                              <div className="flex items-center gap-2">
                                <span className={`text-2xl ${getCalificacionColor(evaluacion.calificacionGeneral)}`}>
                                  {evaluacion.calificacionGeneral > 0 ? evaluacion.calificacionGeneral.toFixed(1) : 'N/A'}
                                </span>
                                {evaluacion.calificacionGeneral > 0 && (
                                  <>
                                    <span className="text-gray-400">/</span>
                                    <span className="text-xl text-gray-600">5.0</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Progreso */}
                            <div>
                              <p className="text-gray-600 mb-1">Participación:</p>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {evaluacion.respuestas} / {evaluacion.totalParticipantes}
                                </span>
                                <div className="flex-1 max-w-[100px]">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-500 h-2 rounded-full"
                                      style={{
                                        width: `${calcularProgreso(
                                          evaluacion.respuestas,
                                          evaluacion.totalParticipantes
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Fechas */}
                            <div>
                              <p className="text-gray-600 mb-1">Período:</p>
                              <div className="flex items-center gap-1.5 text-xs">
                                <Calendar className="w-4 h-4 text-blue-600" />
                                <span>
                                  {new Date(evaluacion.fechaInicio).toLocaleDateString('es-CO', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                  {' - '}
                                  {new Date(evaluacion.fechaFin).toLocaleDateString('es-CO', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botón Ver */}
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalle
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!selectedEvaluacion && (
            <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {evaluacionesFiltradas.length} de {evaluaciones.length} evaluaciones
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                  <Button onClick={() => toast.info('Exportando evaluaciones...')}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
