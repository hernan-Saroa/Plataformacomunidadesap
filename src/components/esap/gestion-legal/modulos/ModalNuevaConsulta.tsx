/**
 * ModalNuevaConsulta - VERSIÓN MEJORADA CON VALIDACIÓN EN TIEMPO REAL
 * ✅ Hook useFormValidation para validaciones reactivas
 * ✅ FormField components con indicadores visuales
 * ✅ Progreso del formulario visible
 * ✅ Mensajes inline específicos
 * ✅ Tooltips explicativos
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Textarea } from '../../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { 
  FileQuestion, Scale, User, MessageSquare, Clock, Plus, FileText, Mail, Phone,
  X, CheckCircle, AlertCircle, Info, Send, Building2, Calendar, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { ModalHeaderClean } from './ModalHeaderClean';
import type { TemaJuridico, PrioridadConsulta } from '../core/types';
import { legalService } from '../../../../services/api/legal.service';

// ✅ Importar hooks responsive
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';

interface ModalNuevaConsultaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface NuevaConsultaData {
  temaJuridico: TemaJuridico;
  solicitante: string;
  funcionarioSolicitante: string;
  cargo: string;
  consulta: string;
  prioridad: PrioridadConsulta;
  documentosAdjuntos?: File[];
}

interface Abogado {
  id: string;
  nombreCompleto: string;
  especialidad?: string;
  email?: string;
}

export function ModalNuevaConsulta({ isOpen, onClose, onSuccess }: ModalNuevaConsultaProps) {
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loadingAbogados, setLoadingAbogados] = useState(false);
  // ========== DATOS INICIALES ==========
  const initialData = {
    temaJuridico: 'Contractual' as TemaJuridico,
    solicitante: '',
    funcionarioSolicitante: '',
    cargo: '',
    consulta: '',
    prioridad: 'MEDIA' as PrioridadConsulta
  };

  // ========== REGLAS DE VALIDACIÓN ==========
  const validationRules = {
    solicitante: [
      CommonValidations.required('La dependencia solicitante es obligatoria'),
      CommonValidations.minLength(3, 'Ingrese el nombre completo de la dependencia')
    ],
    funcionarioSolicitante: [
      CommonValidations.required('El nombre del funcionario es obligatorio'),
      CommonValidations.minLength(3, 'Ingrese el nombre completo')
    ],
    cargo: [
      CommonValidations.required('El cargo es obligatorio')
    ],
    consulta: [
      CommonValidations.required('La consulta jurídica es obligatoria'),
      CommonValidations.minLength(30, 'Describa la consulta con al menos 30 caracteres para un mejor análisis')
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
  // const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar abogados al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadAbogados();
    }
  }, [isOpen]);

  const loadAbogados = async () => {
    setLoadingAbogados(true);
    try {
      const data = await legalService.getAbogados();
      setAbogados(data || []);
    } catch (error) {
      console.error('Error cargando abogados:', error);
      // Usar lista por defecto si falla
      setAbogados([
        { id: '1', nombreCompleto: 'Dr. Juan Pérez López', especialidad: 'Administrativo' },
        { id: '2', nombreCompleto: 'Dra. María García Ruiz', especialidad: 'Laboral' },
        { id: '3', nombreCompleto: 'Dr. Carlos Ramírez Soto', especialidad: 'Contractual' }
      ]);
    } finally {
      setLoadingAbogados(false);
    }
  };

  // ✅ Helpers de validación de formato
  const onlyLetters = (value: string): string => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
  const onlyLettersAndNumbers = (value: string): string => value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-\.]/g, '');
  const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Handler para cambios en inputs con filtros de formato
  const handleInputChange = (field: string, value: string) => {
    let filteredValue = value;

    switch (field) {
      case 'nombreSolicitante':
      case 'cargoSolicitante':
        // Solo letras y espacios para nombres y cargos
        filteredValue = onlyLetters(value);
        break;
      case 'dependenciaSolicitante':
        // Letras, números y algunos caracteres especiales para dependencias
        filteredValue = onlyLettersAndNumbers(value);
        break;
      case 'emailSolicitante':
        // Validar email en tiempo real (mostrar error si es inválido)
        if (value && !isValidEmail(value)) {
          setErrors(prev => ({ ...prev, emailSolicitante: 'Formato inválido (ej: usuario@dominio.com)' }));
        } else {
          setErrors(prev => ({ ...prev, emailSolicitante: '' }));
        }
        filteredValue = value.toLowerCase().trim();
        break;
      default:
        filteredValue = value;
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));

    if (field !== 'emailSolicitante' && errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // ========== OPCIONES ==========
  const temasJuridicos: Array<{ value: TemaJuridico; label: string; icon: string }> = [
    { value: 'Contractual', label: 'Contractual', icon: '📋' },
    { value: 'Laboral', label: 'Laboral', icon: '👥' },
    { value: 'Administrativo', label: 'Administrativo', icon: '🏛️' },
    { value: 'Disciplinario', label: 'Disciplinario', icon: '⚖️' },
    { value: 'Constitucional', label: 'Constitucional', icon: '📜' },
    { value: 'Penal', label: 'Penal', icon: '🔒' },
    { value: 'Civil', label: 'Civil', icon: '👨‍⚖️' },
    { value: 'Propiedad Intelectual', label: 'Propiedad Intelectual', icon: '💡' },
    { value: 'Ambiental', label: 'Ambiental', icon: '🌿' },
    { value: 'Otro', label: 'Otro', icon: '📂' }
  ];

  const prioridades: Array<{ value: PrioridadConsulta; label: string; color: string; desc: string }> = [
    { value: 'URGENTE', label: '🔴 Urgente', color: 'bg-red-500', desc: 'Respuesta inmediata' },
    { value: 'ALTA', label: '🟠 Alta', color: 'bg-orange-500', desc: '2-3 días hábiles' },
    { value: 'MEDIA', label: '🟡 Media', color: 'bg-green-500', desc: '5-7 días hábiles' },
    { value: 'BAJA', label: '⚪ Baja', color: 'bg-gray-500', desc: 'Sin urgencia' }
  ];

  const dependenciasESAP = [
    { value: 'Rectoría Nacional', label: 'Rectoría Nacional' },
    { value: 'Secretaría General', label: 'Secretaría General' },
    { value: 'Dirección Administrativa y Financiera', label: 'Dirección Administrativa y Financiera' },
    { value: 'Dirección de Docencia', label: 'Dirección de Docencia' },
    { value: 'Dirección de Investigación', label: 'Dirección de Investigación' },
    { value: 'Control Interno', label: 'Control Interno' },
    { value: 'Planeación', label: 'Oficina de Planeación' },
    { value: 'Talento Humano', label: 'Talento Humano' },
    { value: 'Comunicaciones', label: 'Comunicaciones' },
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
      // await new Promise(resolve => setTimeout(resolve, 1500));

      const nuevaConsulta: NuevaConsultaData = {
        ...formData
      } as NuevaConsultaData;

      await legalService.createConsultaJuridica(nuevaConsulta);

      // const consecutivo = `CJ-2025-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

      // toast.success('✅ Consulta Jurídica Registrada', {
      //   description: `${consecutivo} - ${formData.temaJuridico}`,
      //   duration: 4000
      // });

      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error creando consulta:', error);
      toast.error('❌ Error al registrar consulta', {
        description: 'Por favor intente nuevamente'
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
          Nueva Consulta Jurídica - Validación Mejorada
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar nueva consulta de asesoría jurídica interna con validación en tiempo real
        </DialogDescription>

        {/* ==================== HEADER ==================== */}
        <ModalHeaderClean
          icono={FileQuestion}
          titulo="Nueva Consulta Jurídica"
          subtitulo="Registrar solicitud de asesoría jurídica interna con validación en tiempo real"
          badgePrincipal="NUEVA CONSULTA"
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
                    <li>Identificar claramente el tema jurídico de la consulta</li>
                    <li>Redactar la consulta de forma clara y concreta</li>
                    <li>Incluir toda la información relevante para el análisis</li>
                    <li>Definir la prioridad según la urgencia real</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* ✅ SECCIÓN 1: CLASIFICACIÓN DE LA CONSULTA */}
            <FormSection
              title="Clasificación de la Consulta"
              description="Seleccione el tema jurídico y la prioridad"
              icon={<Scale />}
              color="blue"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="temaJuridico"
                  label="Tema Jurídico"
                  type="select"
                  value={formData.temaJuridico}
                  onChange={(val) => updateField('temaJuridico', val)}
                  onBlur={() => touchField('temaJuridico')}
                  options={temasJuridicos.map(tema => ({
                    value: tema.value,
                    label: `${tema.icon} ${tema.label}`
                  }))}
                  helpText="Área del derecho relacionada con la consulta"
                  icon={<Scale className="w-4 h-4" />}
                />

                <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                    <p className="font-bold">Tiempo de respuesta</p>
                    <p>Según prioridad seleccionada</p>
                  </div>
                </div>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 block">
                  Prioridad <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {prioridades.map((prioridad) => {
                    const isSelected = formData.prioridad === prioridad.value;

                    return (
                      <Card
                        key={prioridad.value}
                        className={`p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? `${prioridad.color} text-white border-2 border-gray-900` 
                            : 'bg-white hover:bg-gray-50 border-2 border-transparent'
                        }`}
                        onClick={() => {
                          updateField('prioridad', prioridad.value);
                          touchField('prioridad');
                        }}
                      >
                        <div className="text-center">
                          <p className={`text-sm font-bold mb-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {prioridad.label}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                            {prioridad.desc}
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

            {/* ✅ SECCIÓN 2: DATOS DEL SOLICITANTE */}
            <FormSection
              title="Datos del Solicitante"
              description="Información del funcionario que solicita la asesoría"
              icon={<User />}
              color="green"
            >
              <FormField
                name="solicitante"
                label="Dependencia Solicitante"
                type="select"
                value={formData.solicitante}
                onChange={(val) => updateField('solicitante', val)}
                onBlur={() => touchField('solicitante')}
                required
                error={errors.solicitante}
                state={getFieldState('solicitante')}
                options={dependenciasESAP.map(dep => ({
                  value: dep.value,
                  label: dep.label
                }))}
                tooltip="Área de ESAP desde donde se solicita la asesoría"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="funcionarioSolicitante"
                  label="Nombre del Funcionario"
                  type="text"
                  value={formData.funcionarioSolicitante}
                  onChange={(val) => updateField('funcionarioSolicitante', val)}
                  onBlur={() => touchField('funcionarioSolicitante')}
                  required
                  error={errors.funcionarioSolicitante}
                  state={getFieldState('funcionarioSolicitante')}
                  placeholder="Ej: María Rodríguez Pérez"
                  tooltip="Nombre completo del funcionario que solicita la asesoría"
                  icon={<User className="w-4 h-4" />}
                />

                <FormField
                  name="cargo"
                  label="Cargo"
                  type="text"
                  value={formData.cargo}
                  onChange={(val) => updateField('cargo', val)}
                  onBlur={() => touchField('cargo')}
                  required
                  error={errors.cargo}
                  state={getFieldState('cargo')}
                  placeholder="Ej: Director de Talento Humano"
                  tooltip="Cargo del funcionario solicitante"
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 3: CONSULTA JURÍDICA */}
            <FormSection
              title="Consulta Jurídica"
              description="Detalle de la pregunta o situación a analizar"
              icon={<MessageSquare />}
              color="orange"
            >
              <FormField
                name="consulta"
                label="Descripción de la Consulta"
                type="textarea"
                value={formData.consulta}
                onChange={(val) => updateField('consulta', val)}
                onBlur={() => touchField('consulta')}
                required
                error={errors.consulta}
                state={getFieldState('consulta')}
                placeholder="Describa claramente la situación, pregunta jurídica o tema sobre el cual requiere asesoría. Incluya contexto relevante, fechas, normativa aplicable si la conoce, y cualquier información que facilite el análisis..."
                tooltip="Redacte la consulta de forma clara y completa para obtener una respuesta precisa"
                rows={8}
                maxLength={2000}
                showCharCount
              />
            </FormSection>

            {/* ✅ RECOMENDACIONES */}
            <Card className="p-4 bg-purple-50 border-purple-300">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-bold mb-2">💡 Para obtener una mejor asesoría:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Sea específico sobre la situación que requiere análisis jurídico</li>
                    <li>Incluya fechas, contratos, actos administrativos o documentos relevantes</li>
                    <li>Mencione si ya consultó alguna normativa o jurisprudencia</li>
                    <li>Indique si requiere concepto formal o asesoría informal</li>
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
                    <p className="font-bold">✅ Consulta completa y válida</p>
                    <p>Puede registrar la consulta jurídica ahora.</p>
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
                  <Send className="w-4 h-4 mr-2" />
                  Registrar Consulta
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
