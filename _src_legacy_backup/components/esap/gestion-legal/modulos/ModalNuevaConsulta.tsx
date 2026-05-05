/**
 * ModalNuevaConsulta - VERSIÓN MEJORADA CON VALIDACIÓN EN TIEMPO REAL
 * ✅ Hook useFormValidation para validaciones reactivas
 * ✅ FormField components con indicadores visuales
 * ✅ Progreso del formulario visible
 * ✅ Mensajes inline específicos
 * ✅ Tooltips explicativos
 */

import { useState, useEffect, useCallback } from 'react';
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
import { toast } from 'sonner';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { ModalHeaderClean } from './ModalHeaderClean';
import type { TemaJuridico, PrioridadConsulta, ConsultaJuridica } from '../core/types';
import { legalService } from '../../../../services/api/legal.service';

// ✅ Importar hooks responsive
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';

interface ModalNuevaConsultaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  modoEdicion?: boolean;
  consultaInicial?: ConsultaJuridica;
}

export interface NuevaConsultaData {
  tipoSolicitud: string;
  canalEntrada: string;
  temaJuridico: TemaJuridico;
  solicitante: string;
  funcionarioSolicitante: string;
  cargo: string;
  emailSolicitante: string;
  telefonoSolicitante?: string; // Nuevo campo
  consulta: string;
  antecedentes?: string;
  prioridad: PrioridadConsulta;
  abogadoAsignadoId: string;
  documentoAdjunto?: File;
}

interface Abogado {
  id: string;
  nombreCompleto: string;
  especialidad?: string;
  email?: string;
}

// ✅ Helpers de validación de formato
const onlyLetters = (value: string): string => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
const onlyNumbers = (value: string): string => value.replace(/[^0-9]/g, '');
const onlyLettersAndNumbers = (value: string): string => value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-\.]/g, '');

// ========== REGLAS DE VALIDACIÓN ESTÁTICAS ==========
const validationRules = {
  solicitante: [
    CommonValidations.required('La dependencia solicitante es obligatoria')
  ],
  funcionarioSolicitante: [
    CommonValidations.required('El nombre del funcionario es obligatorio'),
    CommonValidations.minLength(3, 'Ingrese el nombre completo'),
    {
      custom: (value: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value),
      message: 'Solo se permiten letras'
    }
  ],
  cargo: [
    CommonValidations.required('El cargo es obligatorio'),
    {
      custom: (value: string) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(value),
      message: 'Solo se permiten letras'
    }
  ],
  emailSolicitante: [
    CommonValidations.required('El correo electrónico es obligatorio'),
    CommonValidations.email('Ingrese un correo electrónico válido')
  ],
  telefonoSolicitante: [
    CommonValidations.numeric('Solo se permiten números'),
    CommonValidations.minLength(7, 'Mínimo 7 dígitos'),
    CommonValidations.maxLength(10, 'Máximo 10 dígitos')
  ],
  abogadoAsignadoId: [
    CommonValidations.required('Debe asignar un abogado a la consulta')
  ],
  consulta: [
    CommonValidations.required('La consulta jurídica es obligatoria'),
    CommonValidations.minLength(20, 'Describa la consulta con al menos 20 caracteres')
  ]
};

const initialData: NuevaConsultaData = {
  tipoSolicitud: 'Consulta',
  canalEntrada: 'Correo Electrónico',
  temaJuridico: 'Contractual' as TemaJuridico,
  solicitante: '',
  funcionarioSolicitante: '',
  cargo: '',
  emailSolicitante: '',
  telefonoSolicitante: '',
  consulta: '',
  antecedentes: '',
  prioridad: 'MEDIA' as PrioridadConsulta,
  abogadoAsignadoId: ''
};

export function ModalNuevaConsulta({ isOpen, onClose, onSuccess, modoEdicion = false, consultaInicial }: ModalNuevaConsultaProps) {
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loadingAbogados, setLoadingAbogados] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

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

  // Debug local para asegurar que los campos son editables
  const handleUpdate = useCallback((field: keyof NuevaConsultaData, value: any) => {
    updateField(field, value);
  }, [updateField]);

  // Cargar abogados al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadAbogados();
    }
  }, [isOpen]);

  // Pre-llenar formulario en modo edición
  useEffect(() => {
    if (isOpen && modoEdicion && consultaInicial) {
      const c = consultaInicial as any;
      updateField('tipoSolicitud', c.tipoSolicitud || 'Consulta');
      updateField('canalEntrada', c.canalEntrada || 'Correo Electrónico');
      updateField('temaJuridico', c.temaJuridico || c.materiaJuridica || 'Contractual');
      updateField('solicitante', c.dependenciaSolicitante || c.solicitante || '');
      updateField('funcionarioSolicitante', c.funcionarioSolicitante || c.nombreSolicitante || '');
      updateField('cargo', c.cargoSolicitante || c.cargo || '');
      updateField('emailSolicitante', c.emailSolicitante || '');
      updateField('telefonoSolicitante', c.telefonoSolicitante || '');
      updateField('consulta', c.descripcion || c.consulta || '');
      updateField('antecedentes', c.antecedentes || '');
      updateField('prioridad', (c.prioridad || 'MEDIA').toUpperCase());
      updateField('abogadoAsignadoId', c.abogadoAsignadoId || '');
    } else if (isOpen && !modoEdicion) {
      resetForm();
    }
  }, [isOpen, modoEdicion, consultaInicial]);

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

  // Handler para cambios en inputs con filtros de formato
  const handleInputChange = useCallback((field: keyof NuevaConsultaData, value: string) => {
    let filteredValue = value;

    switch (field) {
      case 'funcionarioSolicitante':
      case 'cargo':
        // Solo letras y espacios
        filteredValue = onlyLetters(value);
        break;
      case 'telefonoSolicitante':
        // Solo números
        filteredValue = onlyNumbers(value);
        break;
      case 'emailSolicitante':
        filteredValue = value.toLowerCase().trim();
        break;
      default:
        filteredValue = value;
    }

    updateField(field, filteredValue);
  }, [updateField]);

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
    { value: 'Otros', label: 'Otros', icon: '📂' }
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
      if (modoEdicion && consultaInicial) {
        // MODO EDICIÓN: PATCH con JSON
        const editPayload = {
          tipoSolicitud: formData.tipoSolicitud,
          canalEntrada: formData.canalEntrada,
          materiaJuridica: formData.temaJuridico,
          dependenciaSolicitante: formData.solicitante,
          nombreSolicitante: formData.funcionarioSolicitante,
          cargoSolicitante: formData.cargo,
          emailSolicitante: formData.emailSolicitante,
          telefonoSolicitante: formData.telefonoSolicitante,
          descripcion: formData.consulta,
          antecedentes: formData.antecedentes,
          prioridad: formData.prioridad.toLowerCase(),
          abogadoAsignadoId: formData.abogadoAsignadoId,
        };
        const id = (consultaInicial as any).uuid || consultaInicial.id;
        await legalService.updateConsultaJuridica(id, editPayload);
      } else {
        // MODO CREACIÓN: FormData con posible archivo
        const payload = {
          ...formData,
          dependenciaSolicitante: formData.solicitante,
          nombreSolicitante: formData.funcionarioSolicitante,
          cargoSolicitante: formData.cargo,
          descripcion: formData.consulta,
          materiaJuridica: formData.temaJuridico,
          terminoLegalDias: 30
        };

        const formDataToSend = new FormData();
        Object.keys(payload).forEach(key => {
          const value = (payload as any)[key];
          if (key !== 'documentoAdjunto' && value !== undefined && value !== null) {
            formDataToSend.append(key, value.toString());
          }
        });
        if (formData.documentoAdjunto) {
          formDataToSend.append('file', formData.documentoAdjunto);
        }
        await legalService.createConsultaJuridica(formDataToSend);
      }

      // const consecutivo = `CJ-2025-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

      // toast.success('✅ Consulta Jurídica Registrada', {
      //   description: `${consecutivo} - ${formData.temaJuridico}`,
      //   duration: 4000
      // });

      toast.success(modoEdicion ? '✅ Consulta actualizada' : '✅ Consulta registrada', {
        description: modoEdicion ? 'Los cambios se guardaron correctamente' : 'La consulta jurídica fue registrada exitosamente',
        duration: 4000
      });
      resetForm();
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Error en consulta:', error);
      toast.error(modoEdicion ? '❌ Error al actualizar consulta' : '❌ Error al registrar consulta', {
        description: 'Por favor intente nuevamente'
      });
    } finally {
      setEnviando(false);
    }
  };

  const handleCancel = () => {
    if (completedFields > 0) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    resetForm();
    onClose();
  };

  // ✅ Hooks responsive
  const isMobile = useIsMobile();
  const keyboardVisible = useKeyboardVisible();

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && handleCancel()}>
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
          {modoEdicion ? 'Editar Consulta Jurídica' : 'Nueva Consulta Jurídica - Validación Mejorada'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {modoEdicion ? 'Formulario para editar consulta de asesoría jurídica' : 'Formulario para registrar nueva consulta de asesoría jurídica interna con validación en tiempo real'}
        </DialogDescription>

        {/* ==================== HEADER ==================== */}
        <ModalHeaderClean
          icono={FileQuestion}
          titulo={modoEdicion ? 'Editar Consulta Jurídica' : 'Nueva Consulta Jurídica'}
          subtitulo={modoEdicion ? `Editando: ${consultaInicial?.id || ''}` : 'Registrar solicitud de asesoría jurídica interna con validación en tiempo real'}
          badgePrincipal={modoEdicion ? 'EDICIÓN' : 'NUEVA CONSULTA'}
          badges={
            <Badge className={modoEdicion ? 'bg-orange-100 text-orange-700 font-semibold text-xs' : 'bg-green-100 text-green-700 font-semibold text-xs'}>
              {modoEdicion ? '✏️ Modo Edición' : '✅ Validación Reactiva'}
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
                  <p className="font-bold mb-2">📋 Antes de continuar, considere:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>El término de respuesta por defecto es de <strong>30 días hábiles</strong> (Ley 1755 de 2015).</li>
                    <li>Identificar claramente el tema jurídico de la consulta.</li>
                    <li>Redactar la consulta de forma clara y concreta.</li>
                    <li>Definir la prioridad según la urgencia real del trámite.</li>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <FormField
                  name="tipoSolicitud"
                  label="Tipo de Solicitud"
                  type="select"
                  value={formData.tipoSolicitud}
                  onChange={(val) => handleUpdate('tipoSolicitud', val)}
                  onBlur={() => touchField('tipoSolicitud')}
                  options={[
                    { value: 'Consulta', label: '📄 Consulta' },
                    { value: 'Concepto', label: '💡 Concepto' },
                    { value: 'Revisión', label: '🔍 Revisión' },
                    { value: 'Tutela', label: '⚖️ Tutela' }
                  ]}
                  required
                />
                <FormField
                  name="canalEntrada"
                  label="Canal de Entrada"
                  type="select"
                  value={formData.canalEntrada}
                  onChange={(val) => handleUpdate('canalEntrada', val)}
                  onBlur={() => touchField('canalEntrada')}
                  options={[
                    { value: 'Correo Electrónico', label: '📧 Correo Electrónico' },
                    { value: 'Oficio', label: '📝 Oficio' },
                    { value: 'Verbal', label: '🗣️ Verbal' },
                    { value: 'Sistema', label: '💻 Sistema' }
                  ]}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="temaJuridico"
                  label="Materia Jurídica"
                  type="select"
                  value={formData.temaJuridico}
                  onChange={(val) => handleUpdate('temaJuridico', val)}
                  onBlur={() => touchField('temaJuridico')}
                  options={temasJuridicos.map(tema => ({
                    value: tema.value,
                    label: `${tema.icon} ${tema.label}`
                  }))}
                  helpText="Área del derecho relacionada"
                  icon={<Scale className="w-4 h-4" />}
                />

                <FormField
                  name="abogadoAsignadoId"
                  label="Abogado Asignado"
                  type="select"
                  value={formData.abogadoAsignadoId}
                  onChange={(val) => handleUpdate('abogadoAsignadoId', val)}
                  onBlur={() => touchField('abogadoAsignadoId')}
                  required
                  error={errors.abogadoAsignadoId}
                  state={getFieldState('abogadoAsignadoId')}
                  options={[
                    ...abogados.map(abogado => ({
                      value: abogado.id,
                      label: abogado.nombreCompleto
                    }))
                  ]}
                  disabled={loadingAbogados}
                  icon={<User className="w-4 h-4" />}
                />
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
                        className={`p-3 cursor-pointer transition-all ${isSelected
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
                onChange={(val) => handleUpdate('solicitante', val)}
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
                  onChange={(val) => handleInputChange('funcionarioSolicitante', val)}
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
                  onChange={(val) => handleInputChange('cargo', val)}
                  onBlur={() => touchField('cargo')}
                  required
                  error={errors.cargo}
                  state={getFieldState('cargo')}
                  placeholder="Ej: Director de Talento Humano"
                  tooltip="Cargo del funcionario solicitante"
                />

                <FormField
                  name="emailSolicitante"
                  label="Email"
                  type="text"
                  value={formData.emailSolicitante}
                  onChange={(val) => handleInputChange('emailSolicitante', val)}
                  onBlur={() => touchField('emailSolicitante')}
                  required
                  error={errors.emailSolicitante}
                  state={getFieldState('emailSolicitante')}
                  placeholder="correo@esap.edu.co"
                  tooltip="Correo institucional para notificaciones"
                  icon={<Mail className="w-4 h-4" />}
                />

                <FormField
                  name="telefonoSolicitante"
                  label="Teléfono / Extensión"
                  type="text"
                  value={formData.telefonoSolicitante || ''}
                  onChange={(val) => handleInputChange('telefonoSolicitante', val)}
                  onBlur={() => touchField('telefonoSolicitante')}
                  error={errors.telefonoSolicitante}
                  state={getFieldState('telefonoSolicitante')}
                  placeholder="Ej: 3001234567 o Ext. 1234"
                  tooltip="Número de contacto para seguimiento"
                  icon={<Phone className="w-4 h-4" />}
                  maxLength={10}
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
                onChange={(val) => handleUpdate('consulta', val)}
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

              <div className="mt-4">
                <FormField
                  name="antecedentes"
                  label="Antecedentes (opcional)"
                  type="textarea"
                  value={formData.antecedentes || ''}
                  onChange={(val) => handleUpdate('antecedentes', val)}
                  onBlur={() => touchField('antecedentes')}
                  state={getFieldState('antecedentes')}
                  placeholder="Antecedentes relevantes si los hay..."
                  rows={3}
                />
              </div>

              {/* ✅ ADJUNTAR DOCUMENTO */}
              <div className="mt-4">
                <Label className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  Documento Adjunto (Opcional)
                </Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validar tipo PDF
                      if (file.type !== 'application/pdf') {
                        toast.error('Solo se permiten archivos en formato PDF');
                        e.target.value = '';
                        return;
                      }
                      // Validar tamaño (ej. 10MB)
                      if (file.size > 10 * 1024 * 1024) {
                        toast.error('El archivo excede el tamaño máximo permitido (10MB)');
                        e.target.value = ''; // Reset input
                        return;
                      }
                      updateField('documentoAdjunto', file);
                    } else {
                      updateField('documentoAdjunto', undefined);
                    }
                  }}
                  className="cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos permitidos: PDF únicamente. Máximo 10MB.
                </p>
              </div>
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
                  {modoEdicion ? 'Guardar Cambios' : 'Registrar Consulta'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* ==================== DIALOG DE CONFIRMACIÓN DE CANCELACIÓN ==================== */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent 
          hideCloseButton 
          className="p-0 overflow-hidden border-none shadow-2xl z-[10002] rounded-2xl mx-auto"
          style={{ width: '380px', maxWidth: '380px' }}
        >
          <div className="bg-white overflow-hidden w-full">
            <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-red-600"></div>
            
            <div className="p-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mb-8 shadow-sm border border-red-100">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                ¿Cancelar registro?
              </h3>
              
              <p className="text-base text-gray-500 leading-relaxed mb-10 px-4">
                Se perderán todos los datos ingresados en la consulta.
              </p>

              <div className="flex flex-col w-full gap-4">
                <Button
                  onClick={handleConfirmCancel}
                  className="w-full py-8 !bg-red-600 hover:!bg-red-700 !text-white font-black rounded-2xl shadow-xl shadow-red-100 transition-all active:scale-[0.98] text-lg border-none"
                >
                  Sí, cancelar y salir
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-6 rounded-xl font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  No, continuar editando
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
