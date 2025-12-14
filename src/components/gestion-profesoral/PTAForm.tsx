import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  GraduationCap,
  FlaskConical,
  Users,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Plus,
  X,
  Info,
  TrendingUp
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';

interface PTAFormProps {
  className?: string;
  onClose?: () => void;
  onSubmit?: (data: any) => void;
  initialData?: any;
  docenteId?: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export function PTAForm({ className = '', onClose, onSubmit, initialData, docenteId }: PTAFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    // Paso 1: Información General
    periodo: initialData?.periodo || '2025-I',
    docente_id: docenteId || initialData?.docente_id || '',
    territorial: initialData?.territorial || '',
    departamento: initialData?.departamento || '',
    dedicacion_total: initialData?.dedicacion_total || 40,
    
    // Paso 2: Componente Enseñanza (60-70%)
    ensenanza: initialData?.ensenanza || {
      horas: 24,
      porcentaje: 60,
      actividades: []
    },
    
    // Paso 3: Componente Investigación (15-25%)
    investigacion: initialData?.investigacion || {
      horas: 8,
      porcentaje: 20,
      actividades: []
    },
    
    // Paso 4: Componente Extensión (5-10%)
    extension: initialData?.extension || {
      horas: 4,
      porcentaje: 10,
      actividades: []
    },
    
    // Paso 5: Componente Apoyo Institucional (5-10%)
    apoyo_institucional: initialData?.apoyo_institucional || {
      horas: 4,
      porcentaje: 10,
      actividades: []
    },
    
    // Paso 6: Revisión y Envío
    observaciones: initialData?.observaciones || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [horasTotales, setHorasTotales] = useState(0);

  // Calcular horas totales
  useEffect(() => {
    const total = 
      formData.ensenanza.horas +
      formData.investigacion.horas +
      formData.extension.horas +
      formData.apoyo_institucional.horas;
    setHorasTotales(total);
  }, [formData]);

  const steps = [
    { number: 1, title: 'Información General', icon: FileText, description: 'Periodo y datos básicos' },
    { number: 2, title: 'Enseñanza', icon: GraduationCap, description: '60-70% del tiempo' },
    { number: 3, title: 'Investigación', icon: FlaskConical, description: '15-25% del tiempo' },
    { number: 4, title: 'Extensión', icon: Users, description: '5-10% del tiempo' },
    { number: 5, title: 'Apoyo Institucional', icon: Briefcase, description: '5-10% del tiempo' },
    { number: 6, title: 'Revisión', icon: CheckCircle, description: 'Verificar y enviar' }
  ];

  // Validación Circular 003/2025
  const validateDistribution = () => {
    const errors: Record<string, string> = {};
    
    if (horasTotales !== formData.dedicacion_total) {
      errors.distribucion = `Las horas totales (${horasTotales}) deben sumar ${formData.dedicacion_total}h`;
    }
    
    if (formData.ensenanza.porcentaje < 60 || formData.ensenanza.porcentaje > 70) {
      errors.ensenanza = 'Enseñanza debe estar entre 60-70%';
    }
    
    if (formData.investigacion.porcentaje < 15 || formData.investigacion.porcentaje > 25) {
      errors.investigacion = 'Investigación debe estar entre 15-25%';
    }
    
    if (formData.extension.porcentaje < 5 || formData.extension.porcentaje > 10) {
      errors.extension = 'Extensión debe estar entre 5-10%';
    }
    
    if (formData.apoyo_institucional.porcentaje < 5 || formData.apoyo_institucional.porcentaje > 10) {
      errors.apoyo = 'Apoyo debe estar entre 5-10%';
    }

    const porcentajeTotal = 
      formData.ensenanza.porcentaje +
      formData.investigacion.porcentaje +
      formData.extension.porcentaje +
      formData.apoyo_institucional.porcentaje;
    
    if (Math.abs(porcentajeTotal - 100) > 0.1) {
      errors.porcentajes = 'Los porcentajes deben sumar 100%';
    }

    return errors;
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.periodo) newErrors.periodo = 'El periodo es requerido';
      if (!formData.territorial) newErrors.territorial = 'La territorial es requerida';
      if (!formData.departamento) newErrors.departamento = 'El departamento es requerido';
    }

    if (step === 2 && formData.ensenanza.actividades.length === 0) {
      newErrors.ensenanza = 'Debe agregar al menos una actividad de enseñanza';
    }

    if (step === 6) {
      const distErrors = validateDistribution();
      Object.assign(newErrors, distErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep((currentStep + 1) as Step);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleSubmit = () => {
    console.log('PTA enviado:', formData);
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  // Actualizar horas cuando cambia el porcentaje
  const updateComponente = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional', field: string, value: any) => {
    const updated = { ...formData[componente], [field]: value };
    
    if (field === 'porcentaje') {
      updated.horas = Math.round((value / 100) * formData.dedicacion_total);
    }
    
    setFormData({ ...formData, [componente]: updated });
  };

  const addActividad = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional') => {
    const updated = { ...formData[componente] };
    updated.actividades = [
      ...updated.actividades,
      { descripcion: '', horas_semana: 0, semanas: 16 }
    ];
    setFormData({ ...formData, [componente]: updated });
  };

  const removeActividad = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional', index: number) => {
    const updated = { ...formData[componente] };
    updated.actividades = updated.actividades.filter((_, i) => i !== index);
    setFormData({ ...formData, [componente]: updated });
  };

  const updateActividad = (componente: 'ensenanza' | 'investigacion' | 'extension' | 'apoyo_institucional', index: number, field: string, value: any) => {
    const updated = { ...formData[componente] };
    updated.actividades[index] = { ...updated.actividades[index], [field]: value };
    setFormData({ ...formData, [componente]: updated });
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {initialData ? 'Editar PTA' : 'Nuevo Plan de Trabajo Académico'}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Steps Progress */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      currentStep > step.number
                        ? 'bg-white text-purple-600'
                        : currentStep === step.number
                        ? 'bg-white text-purple-600 ring-4 ring-white/30'
                        : 'bg-white/30 text-white'
                    }`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{step.number}</span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-all ${
                      currentStep > step.number ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Distribution Alert */}
          <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span>Horas distribuidas:</span>
              <span className="font-bold">
                {horasTotales} / {formData.dedicacion_total} horas
              </span>
            </div>
            <Progress 
              value={(horasTotales / formData.dedicacion_total) * 100} 
              className="h-2 mt-2 bg-white/20"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step Title */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {steps[currentStep - 1].title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {steps[currentStep - 1].description}
                </p>
              </div>

              {/* Step 1: Información General */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="periodo">Periodo Académico *</Label>
                      <select
                        id="periodo"
                        value={formData.periodo}
                        onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          errors.periodo ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="2025-I">2025-I</option>
                        <option value="2024-II">2024-II</option>
                        <option value="2024-I">2024-I</option>
                      </select>
                      {errors.periodo && (
                        <p className="text-red-500 text-sm mt-1">{errors.periodo}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dedicacion_total">Dedicación Total (horas/semana) *</Label>
                      <Input
                        id="dedicacion_total"
                        type="number"
                        value={formData.dedicacion_total}
                        onChange={(e) => setFormData({ ...formData, dedicacion_total: parseInt(e.target.value) || 0 })}
                        placeholder="40"
                      />
                    </div>

                    <div>
                      <Label htmlFor="territorial">Territorial *</Label>
                      <select
                        id="territorial"
                        value={formData.territorial}
                        onChange={(e) => setFormData({ ...formData, territorial: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          errors.territorial ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Bogotá">Bogotá</option>
                        <option value="Medellín">Antioquia (Medellín)</option>
                        <option value="Cali">Valle del Cauca (Cali)</option>
                        <option value="Barranquilla">Atlántico (Barranquilla)</option>
                      </select>
                      {errors.territorial && (
                        <p className="text-red-500 text-sm mt-1">{errors.territorial}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="departamento">Departamento Académico *</Label>
                      <select
                        id="departamento"
                        value={formData.departamento}
                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          errors.departamento ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Derecho Público">Derecho Público</option>
                        <option value="Administración Pública">Administración Pública</option>
                        <option value="Economía">Economía</option>
                        <option value="Ciencias Políticas">Ciencias Políticas</option>
                      </select>
                      {errors.departamento && (
                        <p className="text-red-500 text-sm mt-1">{errors.departamento}</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Distribución según Circular 003/2025:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Enseñanza: 60-70% del tiempo</li>
                          <li>• Investigación: 15-25% del tiempo</li>
                          <li>• Extensión: 5-10% del tiempo</li>
                          <li>• Apoyo Institucional: 5-10% del tiempo</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Steps 2-5: Componentes (similar structure) */}
              {[
                { step: 2, key: 'ensenanza', title: 'Enseñanza', color: 'blue', icon: GraduationCap },
                { step: 3, key: 'investigacion', title: 'Investigación', color: 'purple', icon: FlaskConical },
                { step: 4, key: 'extension', title: 'Extensión', color: 'green', icon: Users },
                { step: 5, key: 'apoyo_institucional', title: 'Apoyo Institucional', color: 'amber', icon: Briefcase }
              ].map(({ step, key, title, color, icon: Icon }) => 
                currentStep === step && (
                  <div key={key} className="space-y-4">
                    {/* Porcentaje y Horas */}
                    <Card className="p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`${key}_porcentaje`}>Porcentaje (%)</Label>
                          <Input
                            id={`${key}_porcentaje`}
                            type="number"
                            value={formData[key as keyof typeof formData].porcentaje}
                            onChange={(e) => updateComponente(key as any, 'porcentaje', parseFloat(e.target.value) || 0)}
                            placeholder="20"
                            min={0}
                            max={100}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`${key}_horas`}>Horas/Semana</Label>
                          <Input
                            id={`${key}_horas`}
                            type="number"
                            value={formData[key as keyof typeof formData].horas}
                            readOnly
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                    </Card>

                    {/* Actividades */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label>Actividades</Label>
                        <Button
                          onClick={() => addActividad(key as any)}
                          size="sm"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar Actividad
                        </Button>
                      </div>

                      {formData[key as keyof typeof formData].actividades.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <Icon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 mb-4">No hay actividades registradas</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData[key as keyof typeof formData].actividades.map((actividad: any, index: number) => (
                            <Card key={index} className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <Badge className={`bg-${color}-100 text-${color}-700`}>
                                  Actividad {index + 1}
                                </Badge>
                                <button
                                  onClick={() => removeActividad(key as any, index)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-3">
                                <div>
                                  <Label>Descripción</Label>
                                  <Textarea
                                    value={actividad.descripcion}
                                    onChange={(e) => updateActividad(key as any, index, 'descripcion', e.target.value)}
                                    placeholder="Describe la actividad..."
                                    rows={2}
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label>Horas/Semana</Label>
                                    <Input
                                      type="number"
                                      value={actividad.horas_semana}
                                      onChange={(e) => updateActividad(key as any, index, 'horas_semana', parseFloat(e.target.value) || 0)}
                                      placeholder="4"
                                    />
                                  </div>
                                  <div>
                                    <Label>Semanas</Label>
                                    <Input
                                      type="number"
                                      value={actividad.semanas}
                                      onChange={(e) => updateActividad(key as any, index, 'semanas', parseInt(e.target.value) || 0)}
                                      placeholder="16"
                                    />
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>

                    {errors[key] && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{errors[key]}</p>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Step 6: Revisión */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  {/* Resumen de Distribución */}
                  <Card className="p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Resumen de Distribución</h4>
                    <div className="space-y-4">
                      {[
                        { label: 'Enseñanza', data: formData.ensenanza, color: 'bg-blue-500' },
                        { label: 'Investigación', data: formData.investigacion, color: 'bg-purple-500' },
                        { label: 'Extensión', data: formData.extension, color: 'bg-green-500' },
                        { label: 'Apoyo Institucional', data: formData.apoyo_institucional, color: 'bg-amber-500' }
                      ].map(({ label, data, color }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{data.horas}h</span>
                              <span className="text-sm font-bold text-gray-900">{data.porcentaje}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${color} h-2 rounded-full`}
                              style={{ width: `${data.porcentaje}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Errores de Validación */}
                  {Object.keys(errors).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-900 mb-2">Errores de Validación:</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {Object.values(errors).map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <Label htmlFor="observaciones">Observaciones (opcional)</Label>
                    <Textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      placeholder="Agrega observaciones o comentarios adicionales..."
                      rows={4}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBack}
              variant="outline"
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Paso {currentStep} de {steps.length}
              </span>
            </div>

            <Button
              onClick={handleNext}
              className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
            >
              {currentStep === 6 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Enviar PTA
                </>
              ) : (
                <>
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
