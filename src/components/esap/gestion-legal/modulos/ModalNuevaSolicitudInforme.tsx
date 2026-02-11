/**
 * ModalNuevaSolicitudInforme - VERSIÓN MEJORADA CON VALIDACIÓN EN TIEMPO REAL
 * ✅ Hook useFormValidation para validaciones reactivas
 * ✅ FormField components con indicadores visuales
 * ✅ Progreso del formulario visible
 * ✅ Mensajes inline específicos
 * ✅ Tooltips explicativos
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import {
  FileText, Calendar, User, Building, Clock, X, AlertCircle,
  CheckCircle, Target, Info, TrendingUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';

// ✅ Importar hooks responsive
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';

interface ModalNuevaSolicitudInformeProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NuevaSolicitudData) => void;
}

export interface NuevaSolicitudData {
  solicitante: string;
  areaSolicitante: string;
  asunto: string;
  descripcion: string;
  fechaLimite: string;
  tipoPrioridad: 'NORMAL' | 'URGENTE' | 'CRÍTICA';
  entregable: string;
}

export function ModalNuevaSolicitudInforme({
  isOpen,
  onClose,
  onSubmit
}: ModalNuevaSolicitudInformeProps) {
  
  // ========== DATOS INICIALES ==========
  const initialData = {
    solicitante: '',
    areaSolicitante: '',
    asunto: '',
    descripcion: '',
    fechaLimite: '',
    tipoPrioridad: 'NORMAL' as 'NORMAL' | 'URGENTE' | 'CRÍTICA',
    entregable: ''
  };

  // ========== REGLAS DE VALIDACIÓN ==========
  const validationRules = {
    solicitante: [
      CommonValidations.required('El nombre del solicitante es obligatorio'),
      CommonValidations.minLength(3, 'Ingrese el nombre completo')
    ],
    areaSolicitante: [
      CommonValidations.required('El área solicitante es obligatoria')
    ],
    asunto: [
      CommonValidations.required('El asunto es obligatorio'),
      CommonValidations.minLength(5, 'El asunto debe ser más descriptivo (mínimo 5 caracteres)')
    ],
    descripcion: [
      CommonValidations.required('La descripción es obligatoria'),
      CommonValidations.minLength(20, 'Describa la solicitud con al menos 20 caracteres')
    ],
    fechaLimite: [
      CommonValidations.required('La fecha límite es obligatoria'),
      CommonValidations.futureDate('La fecha límite debe ser futura')
    ],
    entregable: [
      CommonValidations.required('El tipo de entregable es obligatorio')
    ]
  };

  // ========== HOOK DE VALIDACIÓN ==========
  const {
    formData,
    errors,
    updateField,
    touchField,
    validateForm,
    isFormValid,
    getFieldState,
    completedFields,
    totalFields,
    resetForm
  } = useFormValidation(initialData, validationRules);

  const [enviando, setEnviando] = useState(false);

  // ========== OPCIONES ==========
  const tiposEntregable = [
    { value: 'Informe ejecutivo PDF', label: '📄 Informe PDF' },
    { value: 'Informe detallado Word', label: '📝 Informe Word' },
    { value: 'Base de datos Excel', label: '📊 Excel' },
    { value: 'Presentación PowerPoint', label: '🎨 PowerPoint' },
    { value: 'Dashboard en línea', label: '📈 Dashboard' },
    { value: 'Concepto jurídico', label: '⚖️ Concepto jurídico' },
    { value: 'Otro', label: '📦 Otro' }
  ];

  const areasESAP = [
    { value: 'Rectoría Nacional', label: 'Rectoría Nacional' },
    { value: 'Secretaría General', label: 'Secretaría General' },
    { value: 'Dirección Administrativa', label: 'Dirección Administrativa y Financiera' },
    { value: 'Dirección de Docencia', label: 'Dirección de Docencia' },
    { value: 'Dirección de Investigación', label: 'Dirección de Investigación' },
    { value: 'Oficina Jurídica', label: 'Oficina Jurídica' },
    { value: 'Control Interno', label: 'Control Interno' },
    { value: 'Planeación', label: 'Oficina de Planeación' },
    { value: 'Otra', label: 'Otra Dependencia' }
  ];

  // ========== HANDLERS ==========
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Revise los campos marcados en rojo',
        duration: 4000
      });
      return;
    }

    setEnviando(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      onSubmit(formData as NuevaSolicitudData);

      toast.success('✅ Solicitud registrada exitosamente', {
        description: `Asunto: ${formData.asunto}`,
        duration: 4000
      });

      resetForm();
      onClose();
    } catch (error) {
      toast.error('❌ Error al registrar', {
        description: 'Intente nuevamente'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleCancel = () => {
    if (completedFields > 0) {
      if (confirm('¿Desea cancelar? Se perderán los datos ingresados.')) {
        resetForm();
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Calcular días hasta fecha límite
  const diasHastaLimite = formData.fechaLimite 
    ? Math.ceil((new Date(formData.fechaLimite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // ✅ Hooks responsive
  const isMobile = useIsMobile();
  const keyboardVisible = useKeyboardVisible();

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent 
        hideCloseButton 
        className={`
          w-[100vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:max-w-[800px]
          ${keyboardVisible ? 'h-[60vh]' : 'h-auto max-h-[95vh] sm:max-h-[90vh]'}
          flex flex-col p-0 gap-0
          transition-all duration-200
        `}
      >
        <DialogTitle className="sr-only">
          Nueva Solicitud de Informe - Validación Mejorada
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar nueva solicitud de informe con validación en tiempo real
        </DialogDescription>

        {/* ==================== HEADER ==================== */}
        <ModalHeaderClean
          titulo="Nueva Solicitud de Informe"
          subtitulo="Registro de solicitud con validación en tiempo real"
          icono={FileText}
          colorIcono="blue"
          badgePrincipal="NUEVA SOLICITUD"
          badges={
            <Badge className="bg-green-100 text-green-700 font-semibold text-xs">
              ✅ Validación Reactiva
            </Badge>
          }
          onClose={handleCancel}
        />

        {/* ==================== CONTENIDO CON SCROLL ==================== */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50">
          <div className="space-y-4 sm:space-y-6">
            
            {/* ✅ PROGRESO DEL FORMULARIO */}
            <FormProgress completed={completedFields} total={totalFields} />

            {/* ✅ BANNER DE PREREQUISITOS */}
            <Card className="p-4 bg-blue-50 border-blue-300">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-bold mb-2">📋 Antes de continuar, asegúrese de:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Definir claramente el asunto y descripción de la solicitud</li>
                    <li>Especificar el tipo de entregable esperado</li>
                    <li>Establecer una fecha límite realista para la entrega</li>
                    <li>Verificar que la solicitud sea pertinente al área jurídica</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* ✅ SECCIÓN 1: DATOS DEL SOLICITANTE */}
            <FormSection
              title="Datos del Solicitante"
              description="Información de quien solicita el informe"
              icon={<User />}
              color="blue"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="solicitante"
                  label="Nombre del Solicitante"
                  type="text"
                  value={formData.solicitante}
                  onChange={(val) => updateField('solicitante', val)}
                  onBlur={() => touchField('solicitante')}
                  required
                  error={errors.solicitante}
                  state={getFieldState('solicitante')}
                  placeholder="Ej: María Rodríguez Pérez"
                  tooltip="Nombre completo del funcionario que solicita el informe"
                  icon={<User className="w-4 h-4" />}
                />

                <FormField
                  name="areaSolicitante"
                  label="Área / Dependencia"
                  type="select"
                  value={formData.areaSolicitante}
                  onChange={(val) => updateField('areaSolicitante', val)}
                  onBlur={() => touchField('areaSolicitante')}
                  required
                  error={errors.areaSolicitante}
                  state={getFieldState('areaSolicitante')}
                  options={areasESAP.map(area => ({
                    value: area.value,
                    label: area.label,
                    icon: <Building className="w-4 h-4" />
                  }))}
                  tooltip="Dependencia de ESAP desde donde se solicita el informe"
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 2: DETALLE DE LA SOLICITUD */}
            <FormSection
              title="Detalle de la Solicitud"
              description="Asunto y descripción del informe solicitado"
              icon={<FileText />}
              color="green"
            >
              <FormField
                name="asunto"
                label="Asunto"
                type="text"
                value={formData.asunto}
                onChange={(val) => updateField('asunto', val)}
                onBlur={() => touchField('asunto')}
                required
                error={errors.asunto}
                state={getFieldState('asunto')}
                placeholder="Ej: Informe sobre cumplimiento normativo 2025"
                tooltip="Título breve pero descriptivo de la solicitud"
                maxLength={150}
                showCharCount
                icon={<Target className="w-4 h-4" />}
              />

              <FormField
                name="descripcion"
                label="Descripción Detallada"
                type="textarea"
                value={formData.descripcion}
                onChange={(val) => updateField('descripcion', val)}
                onBlur={() => touchField('descripcion')}
                required
                error={errors.descripcion}
                state={getFieldState('descripcion')}
                placeholder="Describa en detalle qué información requiere, el propósito del informe, y cualquier especificación relevante..."
                tooltip="Explicación completa de lo que se necesita en el informe"
                rows={6}
                maxLength={1000}
                showCharCount
              />
            </FormSection>

            {/* ✅ SECCIÓN 3: CARACTERÍSTICAS DEL ENTREGABLE */}
            <FormSection
              title="Características del Entregable"
              description="Formato, prioridad y fecha límite"
              icon={<Calendar />}
              color="orange"
            >
              <FormField
                name="entregable"
                label="Tipo de Entregable"
                type="select"
                value={formData.entregable}
                onChange={(val) => updateField('entregable', val)}
                onBlur={() => touchField('entregable')}
                required
                error={errors.entregable}
                state={getFieldState('entregable')}
                options={tiposEntregable}
                tooltip="Formato en el que se espera recibir el informe"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="fechaLimite"
                  label="Fecha Límite de Entrega"
                  type="date"
                  value={formData.fechaLimite}
                  onChange={(val) => updateField('fechaLimite', val)}
                  onBlur={() => touchField('fechaLimite')}
                  required
                  error={errors.fechaLimite}
                  state={getFieldState('fechaLimite')}
                  tooltip="Fecha máxima para entregar el informe"
                  icon={<Calendar className="w-4 h-4" />}
                />

                {diasHastaLimite !== null && diasHastaLimite > 0 && (
                  <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="text-xs text-blue-900">
                      <p className="font-bold">Plazo: {diasHastaLimite} día{diasHastaLimite !== 1 ? 's' : ''}</p>
                      <p>Tiempo disponible para el informe</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">
                  Prioridad <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['NORMAL', 'URGENTE', 'CRÍTICA'] as const).map((prioridad) => {
                    const isSelected = formData.tipoPrioridad === prioridad;
                    const config = {
                      NORMAL: { bg: 'bg-green-500', label: '🟢 Normal', desc: 'Plazo estándar' },
                      URGENTE: { bg: 'bg-orange-500', label: '🟡 Urgente', desc: 'Prioridad alta' },
                      CRÍTICA: { bg: 'bg-red-500', label: '🔴 Crítica', desc: 'Máxima prioridad' }
                    }[prioridad];

                    return (
                      <Card
                        key={prioridad}
                        className={`p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? `${config.bg} text-white border-2 border-gray-900` 
                            : 'bg-white hover:bg-gray-50 border-2 border-transparent'
                        }`}
                        onClick={() => {
                          updateField('tipoPrioridad', prioridad);
                          touchField('tipoPrioridad');
                        }}
                      >
                        <div className="text-center">
                          <p className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {config.label}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                            {config.desc}
                          </p>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 mx-auto mt-2" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </FormSection>

            {/* ✅ RECOMENDACIONES */}
            <Card className="p-4 bg-purple-50 border-purple-300">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-bold mb-2">💡 Recomendaciones para una solicitud efectiva:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Sea específico en el asunto y la descripción</li>
                    <li>Defina claramente el formato del entregable esperado</li>
                    <li>Establezca plazos realistas considerando la complejidad</li>
                    <li>Incluya toda la información necesaria desde el inicio</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* ✅ ADVERTENCIA SI FORMULARIO INCOMPLETO */}
            {!isFormValid && completedFields > 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-bold mb-1">⚠️ Faltan campos obligatorios</p>
                    <p>Complete los campos marcados con asterisco (*) y resuelva los errores antes de registrar.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* ✅ CONFIRMACIÓN SI FORMULARIO VÁLIDO */}
            {isFormValid && (
              <Card className="p-4 bg-green-50 border-green-300">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-bold">✅ Solicitud completa y válida</p>
                    <p>Puede registrar la solicitud de informe ahora.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ==================== FOOTER STICKY ==================== */}
        <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-gray-600 text-center sm:text-left">
            <span className="text-red-500 font-bold">*</span> Campos obligatorios
            <span className="mx-2">•</span>
            <span className={isFormValid ? 'text-green-600 font-bold' : 'text-orange-600'}>
              {completedFields}/{totalFields} completados
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={enviando}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || enviando}
              style={isFormValid && !enviando ? { 
                background: 'linear-gradient(135deg, #2962FF 0%, #003DA5 100%)' 
              } : {}}
              className={`w-full sm:w-auto ${!isFormValid || enviando ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando...
                </>
              ) : !isFormValid ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Complete los campos requeridos
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Registrar Solicitud
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}