/**
 * FORMULARIO DE EXPEDIENTE - Creación y Edición
 * Formulario completo con wizard multi-paso y validación
 * Oficina Asesora Jurídica - ESAP
 */

import { useState } from 'react';
import { Check, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

// ⭐ IMPORTAR COMPONENTES DEL DESIGN SYSTEM SIGL
import {
  ButtonSIGL,
  InputSIGL,
  SelectSIGL,
  BadgeSIGL,
  useToast,
} from './design-system';

interface ExpedienteFormData {
  // Paso 1: Información Básica
  numero?: string;
  demandante: string;
  demandado: string;
  juzgado: string;
  cuantia: string;
  pretensiones: string;
  
  // Paso 2: Fechas y Plazos
  fechaNotificacion: string;
  fechaVencimiento: string;
  diasPlazo: string;
  
  // Paso 3: Asignación
  abogadoResponsable: string;
  prioridad: 'alta' | 'media' | 'baja';
  categoria: string;
  
  // Paso 4: Observaciones
  observaciones: string;
  documentosAdjuntos?: File[];
}

interface Props {
  mode: 'create' | 'edit';
  initialData?: Partial<ExpedienteFormData>;
  onSubmit: (data: ExpedienteFormData) => void;
  onCancel: () => void;
}

export function FormularioExpediente({ mode, initialData, onSubmit, onCancel }: Props) {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<ExpedienteFormData>>(initialData || {
    demandante: '',
    demandado: '',
    juzgado: '',
    cuantia: '',
    pretensiones: '',
    fechaNotificacion: '',
    fechaVencimiento: '',
    diasPlazo: '30',
    abogadoResponsable: '',
    prioridad: 'media',
    categoria: '',
    observaciones: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 4;

  // Validación por paso
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!formData.demandante?.trim()) newErrors.demandante = 'Campo requerido';
        if (!formData.demandado?.trim()) newErrors.demandado = 'Campo requerido';
        if (!formData.juzgado?.trim()) newErrors.juzgado = 'Campo requerido';
        break;
      case 2:
        if (!formData.fechaNotificacion) newErrors.fechaNotificacion = 'Campo requerido';
        if (!formData.fechaVencimiento) newErrors.fechaVencimiento = 'Campo requerido';
        if (!formData.diasPlazo) newErrors.diasPlazo = 'Campo requerido';
        break;
      case 3:
        if (!formData.abogadoResponsable) newErrors.abogadoResponsable = 'Campo requerido';
        if (!formData.categoria) newErrors.categoria = 'Campo requerido';
        break;
      case 4:
        // Observaciones son opcionales
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      showToast({
        variant: 'warning',
        title: 'Campos Requeridos',
        message: 'Por favor complete todos los campos obligatorios',
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (validateStep(currentStep)) {
      onSubmit(formData as ExpedienteFormData);
    }
  };

  const handleInputChange = (field: keyof ExpedienteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Calcular fecha de vencimiento automáticamente
  const calcularFechaVencimiento = (fechaNotif: string, dias: string) => {
    if (fechaNotif && dias) {
      const fecha = new Date(fechaNotif);
      fecha.setDate(fecha.getDate() + parseInt(dias));
      return fecha.toISOString().split('T')[0];
    }
    return '';
  };

  // Auto-calcular vencimiento cuando cambian notificación o días
  const handleFechaNotificacionChange = (value: string) => {
    handleInputChange('fechaNotificacion', value);
    if (formData.diasPlazo) {
      const vencimiento = calcularFechaVencimiento(value, formData.diasPlazo);
      handleInputChange('fechaVencimiento', vencimiento);
    }
  };

  const handleDiasPlazoChange = (value: string) => {
    handleInputChange('diasPlazo', value);
    if (formData.fechaNotificacion) {
      const vencimiento = calcularFechaVencimiento(formData.fechaNotificacion, value);
      handleInputChange('fechaVencimiento', vencimiento);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stepper Header */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: currentStep >= step ? '#1F4788' : '#E5E7EB',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  transition: 'all 0.3s',
                }}
              >
                {currentStep > step ? <Check size={20} /> : step}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  marginTop: '8px',
                  color: currentStep >= step ? '#1F4788' : '#9CA3AF',
                  fontWeight: currentStep === step ? 600 : 400,
                }}
              >
                {step === 1 && 'Información Básica'}
                {step === 2 && 'Fechas y Plazos'}
                {step === 3 && 'Asignación'}
                {step === 4 && 'Observaciones'}
              </span>
            </div>
            {step < 4 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: currentStep > step ? '#1F4788' : '#E5E7EB',
                  margin: '0 8px',
                  marginBottom: '28px',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Contenido del Paso */}
      <div className="min-h-[400px]">
        {/* Paso 1: Información Básica */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">Información Básica del Expediente</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Ingrese los datos principales de la demanda o proceso disciplinario
                  </p>
                </div>
              </div>
            </div>

            {mode === 'edit' && formData.numero && (
              <InputSIGL
                label="Número de Expediente"
                value={formData.numero}
                disabled
                helperText="El número no puede modificarse"
              />
            )}

            <InputSIGL
              label="Demandante / Investigado"
              placeholder="Nombre completo de la persona"
              value={formData.demandante}
              onChange={(e) => handleInputChange('demandante', e.target.value)}
              required
              error={errors.demandante}
            />

            <InputSIGL
              label="Demandado"
              placeholder="ESAP o dependencia específica"
              value={formData.demandado}
              onChange={(e) => handleInputChange('demandado', e.target.value)}
              required
              error={errors.demandado}
            />

            <InputSIGL
              label="Juzgado / Entidad Competente"
              placeholder="Juzgado 5 Administrativo de Bogotá"
              value={formData.juzgado}
              onChange={(e) => handleInputChange('juzgado', e.target.value)}
              required
              error={errors.juzgado}
            />

            <InputSIGL
              label="Cuantía"
              placeholder="$0.00 o No determinada"
              value={formData.cuantia}
              onChange={(e) => handleInputChange('cuantia', e.target.value)}
              helperText="Si aplica, ingrese el valor de la cuantía"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pretensiones <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Describa brevemente las pretensiones de la demanda..."
                value={formData.pretensiones}
                onChange={(e) => handleInputChange('pretensiones', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Paso 2: Fechas y Plazos */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900">Gestión de Fechas y Plazos</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Configure las fechas importantes del expediente. El sistema calculará automáticamente el vencimiento.
                  </p>
                </div>
              </div>
            </div>

            <InputSIGL
              label="Fecha de Notificación"
              type="date"
              value={formData.fechaNotificacion}
              onChange={(e) => handleFechaNotificacionChange(e.target.value)}
              required
              error={errors.fechaNotificacion}
              helperText="Fecha en que se recibió la notificación oficial"
            />

            <InputSIGL
              label="Días de Plazo para Responder"
              type="number"
              placeholder="30"
              value={formData.diasPlazo}
              onChange={(e) => handleDiasPlazoChange(e.target.value)}
              required
              error={errors.diasPlazo}
              helperText="Días hábiles otorgados por el juzgado"
            />

            <InputSIGL
              label="Fecha de Vencimiento"
              type="date"
              value={formData.fechaVencimiento}
              onChange={(e) => handleInputChange('fechaVencimiento', e.target.value)}
              required
              error={errors.fechaVencimiento}
              helperText="Calculada automáticamente (puede ajustarse manualmente)"
            />

            {/* Preview de plazos */}
            {formData.fechaNotificacion && formData.fechaVencimiento && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2">Vista Previa de Plazos</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-green-700">Notificación:</span>
                    <span className="font-semibold text-green-900 ml-2">
                      {new Date(formData.fechaNotificacion).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                  <div>
                    <span className="text-green-700">Vencimiento:</span>
                    <span className="font-semibold text-green-900 ml-2">
                      {new Date(formData.fechaVencimiento).toLocaleDateString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Asignación */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900">Asignación y Categorización</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Asigne el expediente a un abogado y clasifíquelo adecuadamente
                  </p>
                </div>
              </div>
            </div>

            <SelectSIGL
              label="Abogado Responsable"
              placeholder="Seleccione abogado sustanciador"
              options={[
                { value: 'mendoza', label: 'Dr. Carlos Mendoza' },
                { value: 'torres', label: 'Dra. María Torres' },
                { value: 'ramirez', label: 'Dr. Luis Ramírez' },
                { value: 'gonzalez', label: 'Dra. Patricia González' },
                { value: 'castillo', label: 'Dr. Andrés Castillo' },
              ]}
              value={formData.abogadoResponsable}
              onChange={(value) => handleInputChange('abogadoResponsable', value)}
              required
              error={errors.abogadoResponsable}
            />

            <SelectSIGL
              label="Categoría del Expediente"
              placeholder="Seleccione categoría"
              options={[
                { value: 'laboral', label: 'Laboral' },
                { value: 'administrativo', label: 'Contencioso Administrativo' },
                { value: 'disciplinario', label: 'Disciplinario' },
                { value: 'contractual', label: 'Contractual' },
                { value: 'civil', label: 'Civil' },
                { value: 'otro', label: 'Otro' },
              ]}
              value={formData.categoria}
              onChange={(value) => handleInputChange('categoria', value)}
              required
              error={errors.categoria}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Prioridad <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                {[
                  { value: 'alta', label: 'Alta', color: '#DC3545' },
                  { value: 'media', label: 'Media', color: '#FD7E14' },
                  { value: 'baja', label: 'Baja', color: '#28A745' },
                ].map((prioridad) => (
                  <button
                    key={prioridad.value}
                    type="button"
                    onClick={() => handleInputChange('prioridad', prioridad.value)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: `2px solid ${formData.prioridad === prioridad.value ? prioridad.color : '#E5E7EB'}`,
                      backgroundColor: formData.prioridad === prioridad.value ? `${prioridad.color}15` : 'white',
                      color: formData.prioridad === prioridad.value ? prioridad.color : '#6B7280',
                      fontWeight: formData.prioridad === prioridad.value ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {prioridad.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview de asignación */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Resumen de Asignación</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <BadgeSIGL variant="recibida">
                    {formData.abogadoResponsable ? 
                      ['Dr. Carlos Mendoza', 'Dra. María Torres', 'Dr. Luis Ramírez', 'Dra. Patricia González', 'Dr. Andrés Castillo'][
                        ['mendoza', 'torres', 'ramirez', 'gonzalez', 'castillo'].indexOf(formData.abogadoResponsable)
                      ] : 
                      'Sin asignar'}
                  </BadgeSIGL>
                  <span className="text-gray-600">-</span>
                  <BadgeSIGL variant={formData.prioridad === 'alta' ? 'danger' : formData.prioridad === 'media' ? 'warning' : 'success'}>
                    Prioridad {formData.prioridad?.toUpperCase()}
                  </BadgeSIGL>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Paso 4: Observaciones */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900">Observaciones Finales</h4>
                  <p className="text-sm text-gray-700 mt-1">
                    Agregue cualquier información adicional relevante para el expediente
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={6}
                placeholder="Información adicional, antecedentes, notas especiales..."
                value={formData.observaciones}
                onChange={(e) => handleInputChange('observaciones', e.target.value)}
              />
            </div>

            {/* Resumen Final */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
              <h4 className="font-bold text-gray-900 mb-4 text-lg">📋 Resumen del Expediente</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Demandante:</span>
                  <p className="font-semibold text-gray-900">{formData.demandante || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Demandado:</span>
                  <p className="font-semibold text-gray-900">{formData.demandado || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Juzgado:</span>
                  <p className="font-semibold text-gray-900">{formData.juzgado || '-'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Categoría:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.categoria ? 
                      ['Laboral', 'Contencioso Administrativo', 'Disciplinario', 'Contractual', 'Civil', 'Otro'][
                        ['laboral', 'administrativo', 'disciplinario', 'contractual', 'civil', 'otro'].indexOf(formData.categoria)
                      ] : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Fecha Notificación:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.fechaNotificacion ? new Date(formData.fechaNotificacion).toLocaleDateString('es-CO') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Fecha Vencimiento:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.fechaVencimiento ? new Date(formData.fechaVencimiento).toLocaleDateString('es-CO') : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Abogado:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.abogadoResponsable ? 
                      ['Dr. Carlos Mendoza', 'Dra. María Torres', 'Dr. Luis Ramírez', 'Dra. Patricia González', 'Dr. Andrés Castillo'][
                        ['mendoza', 'torres', 'ramirez', 'gonzalez', 'castillo'].indexOf(formData.abogadoResponsable)
                      ] : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Prioridad:</span>
                  <p className="font-semibold text-gray-900">
                    {formData.prioridad?.toUpperCase() || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Botones de Navegación */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div>
          {currentStep > 1 && (
            <ButtonSIGL
              variant="secondary"
              icon={<ChevronLeft size={16} />}
              onClick={handleBack}
            >
              Anterior
            </ButtonSIGL>
          )}
        </div>

        <div className="flex gap-3">
          <ButtonSIGL variant="secondary" onClick={onCancel}>
            Cancelar
          </ButtonSIGL>
          
          {currentStep < totalSteps ? (
            <ButtonSIGL
              variant="primary"
              icon={<ChevronRight size={16} />}
              iconPosition="right"
              onClick={handleNext}
            >
              Siguiente
            </ButtonSIGL>
          ) : (
            <ButtonSIGL
              variant="success"
              icon={<Check size={16} />}
              onClick={handleSubmit}
            >
              {mode === 'create' ? 'Crear Expediente' : 'Guardar Cambios'}
            </ButtonSIGL>
          )}
        </div>
      </div>
    </div>
  );
}
