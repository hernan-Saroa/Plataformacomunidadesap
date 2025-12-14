import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  FileText,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  Plus,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface DocenteFormProps {
  className?: string;
  onClose?: () => void;
  onSubmit?: (data: any) => void;
  initialData?: any;
}

type Step = 1 | 2 | 3 | 4 | 5;

export function DocenteForm({ className = '', onClose, onSubmit, initialData }: DocenteFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    // Paso 1: Datos Personales
    nombres: initialData?.nombres || '',
    apellidos: initialData?.apellidos || '',
    documento: initialData?.documento || '',
    email: initialData?.email || '',
    telefono: initialData?.telefono || '',
    fecha_nacimiento: initialData?.fecha_nacimiento || '',
    genero: initialData?.genero || '',
    
    // Paso 2: Formación Académica
    formacion_academica: initialData?.formacion_academica || [],
    
    // Paso 3: Escalafón y Vinculación
    categoria_escalafon: initialData?.categoria_escalafon || '',
    puntos_escalafon: initialData?.puntos_escalafon || 0,
    fecha_categorizacion: initialData?.fecha_categorizacion || '',
    tipo_vinculacion: initialData?.tipo_vinculacion || '',
    dedicacion_horas: initialData?.dedicacion_horas || 40,
    modalidad_contrato: initialData?.modalidad_contrato || '',
    fecha_vinculacion: initialData?.fecha_vinculacion || '',
    territorial: initialData?.territorial || '',
    departamento_academico: initialData?.departamento_academico || '',
    
    // Paso 4: Experiencia
    experiencia_docente_anos: initialData?.experiencia_docente_anos || 0,
    areas_conocimiento: initialData?.areas_conocimiento || [],
    
    // Paso 5: Documentos
    documentos: initialData?.documentos || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = [
    { number: 1, title: 'Datos Personales', icon: User, description: 'Información básica' },
    { number: 2, title: 'Formación Académica', icon: GraduationCap, description: 'Títulos y certificaciones' },
    { number: 3, title: 'Escalafón y Vinculación', icon: Briefcase, description: 'Categoría y contrato' },
    { number: 4, title: 'Experiencia', icon: FileText, description: 'Trayectoria académica' },
    { number: 5, title: 'Documentos', icon: Upload, description: 'Adjuntar archivos' }
  ];

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.nombres) newErrors.nombres = 'El nombre es requerido';
      if (!formData.apellidos) newErrors.apellidos = 'Los apellidos son requeridos';
      if (!formData.documento) newErrors.documento = 'El documento es requerido';
      if (!formData.email) newErrors.email = 'El email es requerido';
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
      if (!formData.telefono) newErrors.telefono = 'El teléfono es requerido';
    }

    if (step === 3) {
      if (!formData.categoria_escalafon) newErrors.categoria_escalafon = 'La categoría es requerida';
      if (!formData.tipo_vinculacion) newErrors.tipo_vinculacion = 'El tipo de vinculación es requerido';
      if (!formData.territorial) newErrors.territorial = 'La territorial es requerida';
      if (!formData.departamento_academico) newErrors.departamento_academico = 'El departamento es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
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
    console.log('Formulario enviado:', formData);
    if (onSubmit) {
      onSubmit(formData);
    }
  };

  const addFormacion = () => {
    setFormData({
      ...formData,
      formacion_academica: [
        ...formData.formacion_academica,
        { nivel: '', titulo: '', institucion: '', pais: '', fecha_grado: '' }
      ]
    });
  };

  const removeFormacion = (index: number) => {
    setFormData({
      ...formData,
      formacion_academica: formData.formacion_academica.filter((_, i) => i !== index)
    });
  };

  const updateFormacion = (index: number, field: string, value: string) => {
    const updated = [...formData.formacion_academica];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, formacion_academica: updated });
  };

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {initialData ? 'Editar Docente' : 'Nuevo Docente'}
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
                        ? 'bg-white text-[#1e5da8]'
                        : currentStep === step.number
                        ? 'bg-white text-[#1e5da8] ring-4 ring-white/30'
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

              {/* Step 1: Datos Personales */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nombres">Nombres *</Label>
                      <Input
                        id="nombres"
                        value={formData.nombres}
                        onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                        placeholder="Juan Carlos"
                        className={errors.nombres ? 'border-red-500' : ''}
                      />
                      {errors.nombres && (
                        <p className="text-red-500 text-sm mt-1">{errors.nombres}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="apellidos">Apellidos *</Label>
                      <Input
                        id="apellidos"
                        value={formData.apellidos}
                        onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                        placeholder="Pérez Gómez"
                        className={errors.apellidos ? 'border-red-500' : ''}
                      />
                      {errors.apellidos && (
                        <p className="text-red-500 text-sm mt-1">{errors.apellidos}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="documento">Documento de Identidad *</Label>
                      <Input
                        id="documento"
                        value={formData.documento}
                        onChange={(e) => setFormData({ ...formData, documento: e.target.value })}
                        placeholder="1234567890"
                        className={errors.documento ? 'border-red-500' : ''}
                      />
                      {errors.documento && (
                        <p className="text-red-500 text-sm mt-1">{errors.documento}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                      <Input
                        id="fecha_nacimiento"
                        type="date"
                        value={formData.fecha_nacimiento}
                        onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Institucional *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="docente@esap.edu.co"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="telefono">Teléfono *</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="3001234567"
                        className={errors.telefono ? 'border-red-500' : ''}
                      />
                      {errors.telefono && (
                        <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="genero">Género</Label>
                      <select
                        id="genero"
                        value={formData.genero}
                        onChange={(e) => setFormData({ ...formData, genero: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                        <option value="Prefiero no decir">Prefiero no decir</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Formación Académica */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  {formData.formacion_academica.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-4">No hay formación académica registrada</p>
                      <Button onClick={addFormacion} className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Formación
                      </Button>
                    </div>
                  ) : (
                    <>
                      {formData.formacion_academica.map((formacion, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-4">
                            <Badge className="bg-[#1e5da8]">Formación {index + 1}</Badge>
                            <button
                              onClick={() => removeFormacion(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Nivel *</Label>
                              <select
                                value={formacion.nivel}
                                onChange={(e) => updateFormacion(index, 'nivel', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">Seleccionar...</option>
                                <option value="Pregrado">Pregrado</option>
                                <option value="Especialización">Especialización</option>
                                <option value="Maestría">Maestría</option>
                                <option value="Doctorado">Doctorado</option>
                                <option value="Posdoctorado">Posdoctorado</option>
                              </select>
                            </div>

                            <div>
                              <Label>Título *</Label>
                              <Input
                                value={formacion.titulo}
                                onChange={(e) => updateFormacion(index, 'titulo', e.target.value)}
                                placeholder="Ej: Abogado, Magíster en..."
                              />
                            </div>

                            <div>
                              <Label>Institución *</Label>
                              <Input
                                value={formacion.institucion}
                                onChange={(e) => updateFormacion(index, 'institucion', e.target.value)}
                                placeholder="Universidad..."
                              />
                            </div>

                            <div>
                              <Label>País *</Label>
                              <Input
                                value={formacion.pais}
                                onChange={(e) => updateFormacion(index, 'pais', e.target.value)}
                                placeholder="Colombia"
                              />
                            </div>

                            <div>
                              <Label>Fecha de Grado</Label>
                              <Input
                                type="date"
                                value={formacion.fecha_grado}
                                onChange={(e) => updateFormacion(index, 'fecha_grado', e.target.value)}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}

                      <Button
                        onClick={addFormacion}
                        variant="outline"
                        className="w-full border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Otra Formación
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Step 3: Escalafón y Vinculación */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="categoria_escalafon">Categoría Escalafón *</Label>
                      <select
                        id="categoria_escalafon"
                        value={formData.categoria_escalafon}
                        onChange={(e) => setFormData({ ...formData, categoria_escalafon: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          errors.categoria_escalafon ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Titular">Titular</option>
                        <option value="Asociado">Asociado</option>
                        <option value="Asistente">Asistente</option>
                        <option value="Auxiliar">Auxiliar</option>
                      </select>
                      {errors.categoria_escalafon && (
                        <p className="text-red-500 text-sm mt-1">{errors.categoria_escalafon}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="puntos_escalafon">Puntos Escalafón</Label>
                      <Input
                        id="puntos_escalafon"
                        type="number"
                        value={formData.puntos_escalafon}
                        onChange={(e) => setFormData({ ...formData, puntos_escalafon: parseInt(e.target.value) || 0 })}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tipo_vinculacion">Tipo de Vinculación *</Label>
                      <select
                        id="tipo_vinculacion"
                        value={formData.tipo_vinculacion}
                        onChange={(e) => setFormData({ ...formData, tipo_vinculacion: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          errors.tipo_vinculacion ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Tiempo Completo">Tiempo Completo</option>
                        <option value="Medio Tiempo">Medio Tiempo</option>
                        <option value="Cátedra">Cátedra</option>
                        <option value="Hora Cátedra">Hora Cátedra</option>
                      </select>
                      {errors.tipo_vinculacion && (
                        <p className="text-red-500 text-sm mt-1">{errors.tipo_vinculacion}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dedicacion_horas">Dedicación (horas/semana)</Label>
                      <Input
                        id="dedicacion_horas"
                        type="number"
                        value={formData.dedicacion_horas}
                        onChange={(e) => setFormData({ ...formData, dedicacion_horas: parseInt(e.target.value) || 0 })}
                        placeholder="40"
                      />
                    </div>

                    <div>
                      <Label htmlFor="modalidad_contrato">Modalidad de Contrato</Label>
                      <select
                        id="modalidad_contrato"
                        value={formData.modalidad_contrato}
                        onChange={(e) => setFormData({ ...formData, modalidad_contrato: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Planta">Planta</option>
                        <option value="OPS">OPS</option>
                        <option value="Temporal">Temporal</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="fecha_vinculacion">Fecha de Vinculación</Label>
                      <Input
                        id="fecha_vinculacion"
                        type="date"
                        value={formData.fecha_vinculacion}
                        onChange={(e) => setFormData({ ...formData, fecha_vinculacion: e.target.value })}
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
                        <option value="Bucaramanga">Santander (Bucaramanga)</option>
                      </select>
                      {errors.territorial && (
                        <p className="text-red-500 text-sm mt-1">{errors.territorial}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="departamento_academico">Departamento Académico *</Label>
                      <select
                        id="departamento_academico"
                        value={formData.departamento_academico}
                        onChange={(e) => setFormData({ ...formData, departamento_academico: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          errors.departamento_academico ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="Derecho Público">Derecho Público</option>
                        <option value="Administración Pública">Administración Pública</option>
                        <option value="Economía">Economía</option>
                        <option value="Ciencias Políticas">Ciencias Políticas</option>
                        <option value="Desarrollo Social">Desarrollo Social</option>
                      </select>
                      {errors.departamento_academico && (
                        <p className="text-red-500 text-sm mt-1">{errors.departamento_academico}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Experiencia */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="experiencia_docente_anos">Años de Experiencia Docente</Label>
                    <Input
                      id="experiencia_docente_anos"
                      type="number"
                      value={formData.experiencia_docente_anos}
                      onChange={(e) => setFormData({ ...formData, experiencia_docente_anos: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="areas_conocimiento">Áreas de Conocimiento</Label>
                    <Textarea
                      id="areas_conocimiento"
                      value={formData.areas_conocimiento.join(', ')}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        areas_conocimiento: e.target.value.split(',').map(a => a.trim()) 
                      })}
                      placeholder="Derecho Administrativo, Gestión Pública, etc. (separadas por comas)"
                      rows={3}
                    />
                    <p className="text-sm text-gray-500 mt-1">Separa las áreas con comas</p>
                  </div>
                </div>
              )}

              {/* Step 5: Documentos */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-2">Arrastra archivos aquí o haz clic para seleccionar</p>
                    <p className="text-sm text-gray-500">PDF, DOCX, JPG, PNG (Max. 10MB)</p>
                    <Button className="mt-4 bg-[#1e5da8] hover:bg-[#1a4d8f]">
                      Seleccionar Archivos
                    </Button>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Documentos requeridos:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          <li>• Hoja de vida actualizada</li>
                          <li>• Fotocopia del documento de identidad</li>
                          <li>• Certificados de formación académica</li>
                          <li>• Certificado de escalafón docente (si aplica)</li>
                          <li>• Resolución de vinculación</li>
                        </ul>
                      </div>
                    </div>
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
              className="bg-[#1e5da8] hover:bg-[#1a4d8f] flex items-center gap-2"
            >
              {currentStep === 5 ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Guardar Docente
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
