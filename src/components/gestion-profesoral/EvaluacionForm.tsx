import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Save,
  X,
  User,
  BookOpen,
  Star,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Award,
  TrendingUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface EvaluacionFormProps {
  docente?: any;
  asignatura?: any;
  onClose?: () => void;
  onSuccess?: (data: any) => void;
  modo?: 'autoevaluacion' | 'estudiante' | 'coordinador';
}

interface Criterio {
  id: string;
  dimension: string;
  nombre: string;
  descripcion: string;
  calificacion: number;
}

const criteriosEvaluacion: Criterio[] = [
  {
    id: 'c1',
    dimension: 'Dominio',
    nombre: 'Conocimiento de la asignatura',
    descripcion: 'Demuestra dominio y actualización de los contenidos',
    calificacion: 0
  },
  {
    id: 'c2',
    dimension: 'Dominio',
    nombre: 'Claridad en las explicaciones',
    descripcion: 'Explica los conceptos de forma clara y comprensible',
    calificacion: 0
  },
  {
    id: 'c3',
    dimension: 'Metodología',
    nombre: 'Uso de recursos didácticos',
    descripcion: 'Utiliza diversos recursos y herramientas para facilitar el aprendizaje',
    calificacion: 0
  },
  {
    id: 'c4',
    dimension: 'Metodología',
    nombre: 'Estrategias de enseñanza',
    descripcion: 'Aplica metodologías apropiadas para el tema y nivel',
    calificacion: 0
  },
  {
    id: 'c5',
    dimension: 'Evaluación',
    nombre: 'Criterios de evaluación claros',
    descripcion: 'Comunica claramente los criterios y métodos de evaluación',
    calificacion: 0
  },
  {
    id: 'c6',
    dimension: 'Evaluación',
    nombre: 'Retroalimentación oportuna',
    descripcion: 'Proporciona retroalimentación constructiva y oportuna',
    calificacion: 0
  },
  {
    id: 'c7',
    dimension: 'Relaciones',
    nombre: 'Respeto y trato',
    descripcion: 'Mantiene un trato respetuoso con todos los estudiantes',
    calificacion: 0
  },
  {
    id: 'c8',
    dimension: 'Relaciones',
    nombre: 'Disponibilidad',
    descripcion: 'Está disponible para atender dudas y consultas',
    calificacion: 0
  },
  {
    id: 'c9',
    dimension: 'Compromiso',
    nombre: 'Puntualidad',
    descripcion: 'Cumple con los horarios establecidos',
    calificacion: 0
  },
  {
    id: 'c10',
    dimension: 'Compromiso',
    nombre: 'Cumplimiento del programa',
    descripcion: 'Desarrolla los contenidos según lo programado',
    calificacion: 0
  }
];

export function EvaluacionForm({
  docente,
  asignatura,
  onClose,
  onSuccess,
  modo = 'estudiante'
}: EvaluacionFormProps) {
  const [criterios, setCriterios] = useState<Criterio[]>(criteriosEvaluacion);
  const [comentarios, setComentarios] = useState('');
  const [fortalezas, setFortalezas] = useState('');
  const [mejoras, setMejoras] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pasoActual, setPasoActual] = useState(1);

  // Calcular progreso
  const criteriosCompletos = criterios.filter(c => c.calificacion > 0).length;
  const progresoTotal = (criteriosCompletos / criterios.length) * 100;

  // Calcular promedio por dimensión
  const calcularPromedioDimension = (dimension: string) => {
    const criteriosDim = criterios.filter(c => c.dimension === dimension);
    const suma = criteriosDim.reduce((acc, c) => acc + c.calificacion, 0);
    const promedio = criteriosDim.length > 0 ? suma / criteriosDim.length : 0;
    return promedio.toFixed(1);
  };

  // Calcular promedio general
  const promedioGeneral = () => {
    const suma = criterios.reduce((acc, c) => acc + c.calificacion, 0);
    return (suma / criterios.length).toFixed(1);
  };

  const handleCalificacionChange = (criterioId: string, valor: number) => {
    setCriterios(prev =>
      prev.map(c => (c.id === criterioId ? { ...c, calificacion: valor } : c))
    );
  };

  const validateForm = (): boolean => {
    // Verificar que todos los criterios estén calificados
    const sinCalificar = criterios.filter(c => c.calificacion === 0);
    if (sinCalificar.length > 0) {
      toast.error(`Faltan ${sinCalificar.length} criterios por calificar`);
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const evaluacionData = {
        id: `eval-${Date.now()}`,
        docente_id: docente?.id || 'doc-001',
        asignatura_id: asignatura?.id || 'asig-001',
        evaluador_tipo: modo,
        criterios: criterios,
        comentarios,
        fortalezas,
        mejoras,
        promedio_general: parseFloat(promedioGeneral()),
        dimensiones: {
          dominio: parseFloat(calcularPromedioDimension('Dominio')),
          metodologia: parseFloat(calcularPromedioDimension('Metodología')),
          evaluacion: parseFloat(calcularPromedioDimension('Evaluación')),
          relaciones: parseFloat(calcularPromedioDimension('Relaciones')),
          compromiso: parseFloat(calcularPromedioDimension('Compromiso'))
        },
        fecha: new Date().toISOString(),
        periodo: '2025-I'
      };

      onSuccess?.(evaluacionData);
      toast.success('¡Evaluación enviada exitosamente!');
      onClose?.();
    } catch (error) {
      toast.error('Hubo un error al enviar la evaluación');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agrupar criterios por dimensión
  const dimensiones = [...new Set(criterios.map(c => c.dimension))];

  const getTituloModo = () => {
    switch (modo) {
      case 'autoevaluacion':
        return 'Autoevaluación Docente';
      case 'coordinador':
        return 'Evaluación del Coordinador';
      default:
        return 'Evaluación del Docente';
    }
  };

  const getEstrellaColor = (calificacion: number) => {
    if (calificacion >= 4.5) return 'text-green-500';
    if (calificacion >= 4.0) return 'text-blue-500';
    if (calificacion >= 3.5) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2">{getTituloModo()}</h1>
              <div className="flex items-center gap-4 text-sm text-blue-100">
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{docente?.nombre || 'María López Gómez'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{asignatura?.nombre || 'Administración Pública I'}</span>
                </div>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Progreso */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progreso de evaluación</span>
              <span className="text-sm">{criteriosCompletos}/{criterios.length} criterios</span>
            </div>
            <Progress value={progresoTotal} className="h-2 bg-white/20" />
          </div>
        </Card>

        {/* Pasos */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[1, 2, 3].map((paso) => (
            <div key={paso} className="flex items-center gap-2">
              <button
                onClick={() => setPasoActual(paso)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                  pasoActual === paso
                    ? 'bg-[#1e5da8] text-white shadow-lg scale-110'
                    : pasoActual > paso
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {pasoActual > paso ? <CheckCircle className="w-5 h-5" /> : paso}
              </button>
              {paso < 3 && (
                <div
                  className={`w-12 h-1 ${
                    pasoActual > paso ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Paso 1: Calificación por Criterios */}
        {pasoActual === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Paso 1: Calificación de Criterios
                </h2>
                <Badge className="bg-blue-100 text-blue-700">
                  {criteriosCompletos}/{criterios.length} completados
                </Badge>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Escala de calificación:</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                      <div>⭐ 1 - Deficiente</div>
                      <div>⭐⭐ 2 - Regular</div>
                      <div>⭐⭐⭐ 3 - Aceptable</div>
                      <div>⭐⭐⭐⭐ 4 - Bueno</div>
                      <div>⭐⭐⭐⭐⭐ 5 - Excelente</div>
                    </div>
                  </div>
                </div>
              </div>

              {dimensiones.map((dimension) => {
                const criteriosDim = criterios.filter(c => c.dimension === dimension);
                const promedioDim = calcularPromedioDimension(dimension);

                return (
                  <div key={dimension} className="mb-8 last:mb-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Award className="w-5 h-5 text-[#1e5da8]" />
                        {dimension}
                      </h3>
                      {parseFloat(promedioDim) > 0 && (
                        <Badge className={`${
                          parseFloat(promedioDim) >= 4.5 ? 'bg-green-100 text-green-700' :
                          parseFloat(promedioDim) >= 4.0 ? 'bg-blue-100 text-blue-700' :
                          parseFloat(promedioDim) >= 3.5 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          Promedio: {promedioDim}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      {criteriosDim.map((criterio) => (
                        <div
                          key={criterio.id}
                          className={`border rounded-lg p-4 transition-all ${
                            criterio.calificacion > 0
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="mb-3">
                            <div className="flex items-start justify-between mb-1">
                              <p className="font-medium text-gray-900">{criterio.nombre}</p>
                              {criterio.calificacion > 0 && (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{criterio.descripcion}</p>
                          </div>

                          {/* Estrellas de calificación */}
                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((valor) => (
                              <button
                                key={valor}
                                onClick={() => handleCalificacionChange(criterio.id, valor)}
                                className="group relative"
                              >
                                <Star
                                  className={`w-8 h-8 transition-all ${
                                    valor <= criterio.calificacion
                                      ? `${getEstrellaColor(valor)} fill-current`
                                      : 'text-gray-300 group-hover:text-amber-400'
                                  }`}
                                />
                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  {valor}
                                </span>
                              </button>
                            ))}
                            {criterio.calificacion > 0 && (
                              <span className="ml-2 font-bold text-gray-900">
                                {criterio.calificacion}/5
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setPasoActual(2)}
                  disabled={criteriosCompletos < criterios.length}
                  className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                >
                  Siguiente Paso
                  <TrendingUp className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Paso 2: Comentarios */}
        {pasoActual === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Paso 2: Comentarios y Retroalimentación
              </h2>

              <div className="space-y-6">
                {/* Fortalezas */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Fortalezas Identificadas
                  </Label>
                  <textarea
                    rows={4}
                    placeholder="Describe las principales fortalezas del docente..."
                    value={fortalezas}
                    onChange={(e) => setFortalezas(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent"
                  />
                </div>

                {/* Áreas de Mejora */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    Áreas de Mejora
                  </Label>
                  <textarea
                    rows={4}
                    placeholder="Describe las áreas en las que el docente podría mejorar..."
                    value={mejoras}
                    onChange={(e) => setMejoras(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent"
                  />
                </div>

                {/* Comentarios Generales */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Comentarios Generales (Opcional)
                  </Label>
                  <textarea
                    rows={4}
                    placeholder="Agrega cualquier comentario adicional que consideres relevante..."
                    value={comentarios}
                    onChange={(e) => setComentarios(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#1e5da8] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPasoActual(1)}
                >
                  Paso Anterior
                </Button>
                <Button
                  onClick={() => setPasoActual(3)}
                  className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                >
                  Siguiente Paso
                  <TrendingUp className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Paso 3: Resumen y Confirmación */}
        {pasoActual === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <Card className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Paso 3: Resumen de la Evaluación
              </h2>

              {/* Promedio General */}
              <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] rounded-xl p-6 mb-6 text-white text-center">
                <p className="text-sm font-medium mb-2">Calificación General</p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-5xl font-bold">{promedioGeneral()}</span>
                  <span className="text-2xl">/5.0</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-6 h-6 ${
                        i < Math.round(parseFloat(promedioGeneral()))
                          ? 'fill-white text-white'
                          : 'text-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Promedios por Dimensión */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Calificación por Dimensión</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dimensiones.map((dimension) => {
                    const promedio = parseFloat(calcularPromedioDimension(dimension));
                    const porcentaje = (promedio / 5) * 100;

                    return (
                      <div key={dimension} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{dimension}</span>
                          <span className={`font-bold ${
                            promedio >= 4.5 ? 'text-green-600' :
                            promedio >= 4.0 ? 'text-blue-600' :
                            promedio >= 3.5 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {promedio.toFixed(1)}
                          </span>
                        </div>
                        <Progress value={porcentaje} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumen de Comentarios */}
              {(fortalezas || mejoras || comentarios) && (
                <div className="mb-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Retroalimentación</h3>
                  
                  {fortalezas && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Fortalezas
                      </p>
                      <p className="text-sm text-gray-700">{fortalezas}</p>
                    </div>
                  )}

                  {mejoras && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Áreas de Mejora
                      </p>
                      <p className="text-sm text-gray-700">{mejoras}</p>
                    </div>
                  )}

                  {comentarios && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Comentarios Generales
                      </p>
                      <p className="text-sm text-gray-700">{comentarios}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Advertencia */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">Importante:</p>
                    <p>Una vez enviada, esta evaluación no podrá ser modificada. Por favor verifica que toda la información sea correcta.</p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setPasoActual(2)}
                  disabled={isSubmitting}
                >
                  Paso Anterior
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enviar Evaluación
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
