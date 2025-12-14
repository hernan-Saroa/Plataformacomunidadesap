import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Save,
  Calendar,
  Users,
  FileText,
  AlertCircle,
  Settings,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner@2.0.3';

interface EvaluacionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
  evaluacion?: any;
  modo?: 'crear' | 'editar';
}

interface Criterio {
  id: string;
  nombre: string;
  descripcion: string;
  peso: number;
}

export function EvaluacionFormModal({
  isOpen,
  onClose,
  onSuccess,
  evaluacion,
  modo = 'crear'
}: EvaluacionFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    titulo: '',
    periodo: '2025-I',
    tipo: 'Estudiantes' as 'Estudiantes' | 'Pares' | 'Auto-evaluación' | 'Directiva',
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: '',
    docentes_evaluados: [] as string[],
    criterios: [] as Criterio[],
    anonima: true,
    obligatoria: false,
    estado: 'Borrador' as 'Activa' | 'Finalizada' | 'Pendiente' | 'Borrador'
  });

  useEffect(() => {
    if (modo === 'editar' && evaluacion) {
      setFormData({
        titulo: evaluacion.titulo || '',
        periodo: evaluacion.periodo || '2025-I',
        tipo: evaluacion.tipo || 'Estudiantes',
        fecha_inicio: evaluacion.fecha_inicio || '',
        fecha_fin: evaluacion.fecha_fin || '',
        descripcion: evaluacion.descripcion || '',
        docentes_evaluados: evaluacion.docentes_evaluados || [],
        criterios: evaluacion.criterios || [],
        anonima: evaluacion.anonima !== undefined ? evaluacion.anonima : true,
        obligatoria: evaluacion.obligatoria || false,
        estado: evaluacion.estado || 'Borrador'
      });
    } else {
      // Criterios por defecto
      const criteriosDefault: Criterio[] = [
        {
          id: '1',
          nombre: 'Dominio de la materia',
          descripcion: 'Conocimiento profundo de los contenidos',
          peso: 25
        },
        {
          id: '2',
          nombre: 'Metodología de enseñanza',
          descripcion: 'Estrategias pedagógicas efectivas',
          peso: 25
        },
        {
          id: '3',
          nombre: 'Comunicación',
          descripcion: 'Claridad en la explicación de conceptos',
          peso: 20
        },
        {
          id: '4',
          nombre: 'Evaluación',
          descripcion: 'Criterios claros y justos de evaluación',
          peso: 15
        },
        {
          id: '5',
          nombre: 'Disponibilidad',
          descripcion: 'Atención y acompañamiento a estudiantes',
          peso: 15
        }
      ];

      setFormData({
        titulo: '',
        periodo: '2025-I',
        tipo: 'Estudiantes',
        fecha_inicio: '',
        fecha_fin: '',
        descripcion: '',
        docentes_evaluados: [],
        criterios: criteriosDefault,
        anonima: true,
        obligatoria: false,
        estado: 'Borrador'
      });
    }
  }, [evaluacion, modo, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCriterioChange = (id: string, field: 'nombre' | 'descripcion' | 'peso', value: any) => {
    setFormData(prev => ({
      ...prev,
      criterios: prev.criterios.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      )
    }));
  };

  const agregarCriterio = () => {
    const nuevoCriterio: Criterio = {
      id: `criterio-${Date.now()}`,
      nombre: '',
      descripcion: '',
      peso: 10
    };
    setFormData(prev => ({
      ...prev,
      criterios: [...prev.criterios, nuevoCriterio]
    }));
  };

  const eliminarCriterio = (id: string) => {
    setFormData(prev => ({
      ...prev,
      criterios: prev.criterios.filter(c => c.id !== id)
    }));
  };

  const validateStep1 = (): boolean => {
    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio');
      return false;
    }

    if (!formData.fecha_inicio || !formData.fecha_fin) {
      toast.error('Las fechas son obligatorias');
      return false;
    }

    const inicio = new Date(formData.fecha_inicio);
    const fin = new Date(formData.fecha_fin);

    if (inicio >= fin) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio');
      return false;
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    if (formData.criterios.length === 0) {
      toast.error('Debe tener al menos un criterio de evaluación');
      return false;
    }

    const pesoTotal = formData.criterios.reduce((sum, c) => sum + c.peso, 0);
    if (pesoTotal !== 100) {
      toast.error(`La suma de los pesos debe ser 100% (actualmente: ${pesoTotal}%)`);
      return false;
    }

    for (const criterio of formData.criterios) {
      if (!criterio.nombre.trim()) {
        toast.error('Todos los criterios deben tener un nombre');
        return false;
      }
      if (criterio.peso <= 0) {
        toast.error('El peso de cada criterio debe ser mayor a 0');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const evaluacionData = {
        ...formData,
        id: evaluacion?.id || `evaluacion-${Date.now()}`,
        respuestas_recibidas: evaluacion?.respuestas_recibidas || 0,
        respuestas_esperadas: evaluacion?.respuestas_esperadas || 0,
        promedio_general: evaluacion?.promedio_general || 0,
        created_at: evaluacion?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      onSuccess(evaluacionData);
      toast.success(
        modo === 'crear'
          ? '¡Evaluación creada exitosamente!'
          : '¡Evaluación actualizada exitosamente!'
      );
      onClose();
    } catch (error) {
      toast.error('Hubo un error al guardar la evaluación');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const pesoTotal = formData.criterios.reduce((sum, c) => sum + c.peso, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {modo === 'crear' ? 'Nueva Evaluación Docente' : 'Editar Evaluación'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Paso {currentStep} de 3
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-all ${
                  step <= currentStep ? 'bg-[#1e5da8]' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
            <span className={currentStep >= 1 ? 'font-medium text-[#1e5da8]' : ''}>
              Información
            </span>
            <span className={currentStep >= 2 ? 'font-medium text-[#1e5da8]' : ''}>
              Criterios
            </span>
            <span className={currentStep >= 3 ? 'font-medium text-[#1e5da8]' : ''}>
              Confirmación
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Información Básica */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div>
                <Label htmlFor="titulo" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  Título de la Evaluación <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="titulo"
                  type="text"
                  placeholder="Ej: Evaluación Docente 2025-I"
                  value={formData.titulo}
                  onChange={(e) => handleInputChange('titulo', e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodo" className="text-sm font-medium text-gray-700 mb-1.5">
                    Periodo Académico
                  </Label>
                  <select
                    id="periodo"
                    value={formData.periodo}
                    onChange={(e) => handleInputChange('periodo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="2025-I">2025-I</option>
                    <option value="2025-II">2025-II</option>
                    <option value="2026-I">2026-I</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="tipo" className="text-sm font-medium text-gray-700 mb-1.5">
                    Tipo de Evaluación <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="Estudiantes">Por Estudiantes</option>
                    <option value="Pares">Por Pares Académicos</option>
                    <option value="Auto-evaluación">Auto-evaluación</option>
                    <option value="Directiva">Por Directiva</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fecha_inicio" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Fecha de Inicio <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="fecha_fin" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Fecha de Fin <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fecha_fin"
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion" className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  Descripción
                </Label>
                <textarea
                  id="descripcion"
                  rows={3}
                  placeholder="Descripción o instrucciones para la evaluación..."
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="anonima"
                    checked={formData.anonima}
                    onChange={(e) => handleInputChange('anonima', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="anonima" className="text-sm text-gray-700 cursor-pointer">
                    Evaluación anónima (recomendado)
                  </Label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="obligatoria"
                    checked={formData.obligatoria}
                    onChange={(e) => handleInputChange('obligatoria', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <Label htmlFor="obligatoria" className="text-sm text-gray-700 cursor-pointer">
                    Evaluación obligatoria
                  </Label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Criterios de Evaluación */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Criterios de Evaluación</h3>
                  <p className="text-sm text-gray-600">
                    Define los aspectos a evaluar (la suma debe ser 100%)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={agregarCriterio}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar
                </Button>
              </div>

              {/* Peso Total */}
              <div className={`p-4 rounded-lg border-2 ${
                pesoTotal === 100
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Peso Total:</span>
                  <span className={`text-xl font-bold ${
                    pesoTotal === 100 ? 'text-green-700' : 'text-amber-700'
                  }`}>
                    {pesoTotal}%
                  </span>
                </div>
              </div>

              {/* Lista de Criterios */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {formData.criterios.map((criterio, index) => (
                  <motion.div
                    key={criterio.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-3">
                        <Input
                          type="text"
                          placeholder="Nombre del criterio"
                          value={criterio.nombre}
                          onChange={(e) => handleCriterioChange(criterio.id, 'nombre', e.target.value)}
                          className="w-full"
                        />
                        <Input
                          type="text"
                          placeholder="Descripción (opcional)"
                          value={criterio.descripcion}
                          onChange={(e) => handleCriterioChange(criterio.id, 'descripcion', e.target.value)}
                          className="w-full text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600 whitespace-nowrap">Peso:</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={criterio.peso}
                            onChange={(e) => handleCriterioChange(criterio.id, 'peso', parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <span className="text-sm text-gray-600">%</span>
                        </div>
                      </div>
                      <button
                        onClick={() => eliminarCriterio(criterio.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {formData.criterios.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-3">No hay criterios definidos</p>
                  <Button variant="outline" onClick={agregarCriterio}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Primer Criterio
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Confirmación */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Revisa la información antes de crear</p>
                    <p className="text-xs">
                      Una vez creada, algunos campos no podrán modificarse
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Información General</h3>
                  <dl className="space-y-2">
                    <div className="flex items-start gap-3">
                      <dt className="text-sm font-medium text-gray-600 w-32">Título:</dt>
                      <dd className="text-sm text-gray-900">{formData.titulo}</dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <dt className="text-sm font-medium text-gray-600 w-32">Tipo:</dt>
                      <dd><Badge>{formData.tipo}</Badge></dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <dt className="text-sm font-medium text-gray-600 w-32">Periodo:</dt>
                      <dd className="text-sm text-gray-900">{formData.periodo}</dd>
                    </div>
                    <div className="flex items-start gap-3">
                      <dt className="text-sm font-medium text-gray-600 w-32">Fechas:</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(formData.fecha_inicio).toLocaleDateString('es-CO')} -{' '}
                        {new Date(formData.fecha_fin).toLocaleDateString('es-CO')}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3">
                    Criterios de Evaluación ({formData.criterios.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.criterios.map((criterio) => (
                      <div
                        key={criterio.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{criterio.nombre}</p>
                          {criterio.descripcion && (
                            <p className="text-xs text-gray-600 mt-0.5">{criterio.descripcion}</p>
                          )}
                        </div>
                        <Badge variant="secondary">{criterio.peso}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-3">Configuración</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {formData.anonima ? (
                        <Badge className="bg-green-100 text-green-700">Anónima</Badge>
                      ) : (
                        <Badge variant="secondary">No anónima</Badge>
                      )}
                      {formData.obligatoria && (
                        <Badge className="bg-amber-100 text-amber-700">Obligatoria</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Atrás
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#1e5da8] hover:bg-[#1a4d8f]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {modo === 'crear' ? 'Crear Evaluación' : 'Guardar Cambios'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
