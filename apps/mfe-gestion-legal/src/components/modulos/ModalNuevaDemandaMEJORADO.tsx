/**
 * ModalNuevaDemandaMEJORADO - VERSIÓN CON VALIDACIÓN EN TIEMPO REAL
 * 
 * ✅ Hook useFormValidation para validaciones reactivas
 * ✅ Componente FormField para consistencia visual
 * ✅ Indicadores en tiempo real (bordes rojos/verdes, iconos)
 * ✅ Mensajes inline específicos por campo
 * ✅ Tooltips explicativos
 * ✅ Progreso del formulario visible
 * ✅ Botón deshabilitado si falta información
 * ✅ Banner de prerequisitos
 * ✅ Validaciones cruzadas (fechas, cuantía, etc.)
 * 
 * 🎯 ESTE ES EL MODELO A SEGUIR PARA TODOS LOS MODALES
 */

import { useState, useMemo } from 'react';
import { 
  Scale, User, Calendar, FileText, Building2, AlertCircle, 
  Save, MapPin, DollarSign, Gavel, Plus, X, UserPlus, Users, 
  Clock, Info, CheckCircle, Mail, Phone
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { toast } from 'sonner';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { ModalHeaderClean } from './ModalHeaderClean';

interface ModalNuevaDemandaMejoradoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: any) => void;
}

export function ModalNuevaDemandaMEJORADO({ 
  isOpen, 
  onClose, 
  onSave 
}: ModalNuevaDemandaMejoradoProps) {
  
  // ✅ Obtener configuraciones desde Context API
  const { mediosControlActivos, tiposProcesosActivos } = useConfiguracionModulo('defensa-judicial');
  
  // ========== DATOS INICIALES ==========
  const initialData = {
    numeroRadicado: '',
    medioControl: '',
    tipoProceso: '',
    cuantia: '',
    juzgado: '',
    ciudad: '',
    departamento: '',
    fechaNotificacion: '',
    horaNotificacion: '08:00',
    fechaVencimiento: '',
    horaVencimiento: '17:00',
    abogadoAsignado: '',
    pretensiones: '',
    hechos: '',
    observaciones: '',
    emailContacto: '',
    telefonoContacto: ''
  };

  // ========== REGLAS DE VALIDACIÓN ==========
  const validationRules = {
    numeroRadicado: [
      CommonValidations.required('El número de radicado es obligatorio'),
      CommonValidations.minLength(10, 'Debe tener al menos 10 caracteres'),
      {
        pattern: /^\d{5}-\d{2}-\d{2}-\d{3}-\d{4}-\d{5}-\d{2}$/,
        message: 'Formato inválido. Ejemplo: 25000-23-33-001-2024-00123-00'
      }
    ],
    medioControl: [
      CommonValidations.required('Seleccione el medio de control')
    ],
    juzgado: [
      CommonValidations.required('El juzgado es obligatorio'),
      CommonValidations.minLength(5, 'Ingrese el nombre completo del juzgado')
    ],
    ciudad: [
      CommonValidations.required('La ciudad es obligatoria'),
      CommonValidations.minLength(3, 'Ingrese una ciudad válida')
    ],
    fechaNotificacion: [
      CommonValidations.required('La fecha de notificación es obligatoria'),
      CommonValidations.pastDate('La notificación debe ser de fecha pasada o actual')
    ],
    fechaVencimiento: [
      CommonValidations.required('La fecha de vencimiento es obligatoria'),
      {
        custom: (value, formData) => {
          if (!formData?.fechaNotificacion || !value) return true;
          return new Date(value) > new Date(formData.fechaNotificacion);
        },
        message: '⚠️ Debe ser posterior a la fecha de notificación'
      }
    ],
    abogadoAsignado: [
      CommonValidations.required('Debe asignar un abogado responsable')
    ],
    pretensiones: [
      CommonValidations.required('Las pretensiones son obligatorias'),
      CommonValidations.minLength(20, 'Describa las pretensiones con al menos 20 caracteres')
    ],
    emailContacto: [
      CommonValidations.email('Ingrese un email válido')
    ],
    telefonoContacto: [
      {
        pattern: /^[0-9]{7,10}$/,
        message: 'Teléfono inválido. Debe tener entre 7 y 10 dígitos'
      }
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

  // ========== ESTADO LOCAL ==========
  const [enviando, setEnviando] = useState(false);

  // ========== ABOGADOS DISPONIBLES ==========
  const abogadosDisponibles = [
    { value: 'carlos-mendez', label: 'Dr. Carlos Méndez Ruiz' },
    { value: 'ana-lopez', label: 'Dra. Ana María López' },
    { value: 'roberto-garcia', label: 'Dr. Roberto García Soto' },
    { value: 'patricia-rojas', label: 'Dra. Patricia Rojas Díaz' }
  ];

  // ========== CALCULAR FECHA VENCIMIENTO AUTOMÁTICA ==========
  const calcularFechaVencimientoSugerida = useMemo(() => {
    if (!formData.fechaNotificacion) return null;
    
    const fecha = new Date(formData.fechaNotificacion);
    fecha.setDate(fecha.getDate() + 10); // 10 días hábiles aproximado
    return fecha.toISOString().split('T')[0];
  }, [formData.fechaNotificacion]);

  // ========== HANDLERS ==========
  const handleSubmit = async () => {
    // Validar formulario completo
    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Revise los campos marcados en rojo',
        duration: 4000
      });
      return;
    }

    setEnviando(true);

    try {
      // Simular envío
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onSave(formData);
      
      toast.success('✅ Demanda registrada exitosamente', {
        description: `Radicado: ${formData.numeroRadicado}`,
        duration: 4000
      });
      
      resetForm();
      onClose();
    } catch (error) {
      toast.error('❌ Error al guardar', {
        description: 'Intente nuevamente o contacte soporte'
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

  const handleAutoFillFechaVencimiento = () => {
    if (calcularFechaVencimientoSugerida) {
      updateField('fechaVencimiento', calcularFechaVencimientoSugerida);
      touchField('fechaVencimiento');
      toast.success('📅 Fecha calculada automáticamente');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent 
        hideCloseButton 
        className="w-[95vw] max-w-[900px] h-[90vh] flex flex-col p-0 gap-0"
      >
        <DialogTitle className="sr-only">
          Nueva Demanda Judicial
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar una nueva demanda judicial con validación en tiempo real
        </DialogDescription>

        {/* ==================== HEADER ==================== */}
        <ModalHeaderClean
          icono={Gavel}
          colorIcono="blue"
          titulo="Nueva Demanda Judicial"
          subtitulo="Registro de proceso judicial con validación en tiempo real"
          badgePrincipal="Formulario Mejorado"
          badges={
            <Badge className="bg-green-100 text-green-700 font-semibold">
              ✅ Validación Reactiva
            </Badge>
          }
          onClose={handleCancel}
        />

        {/* ==================== CONTENIDO CON SCROLL ==================== */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">
            
            {/* ✅ PROGRESO DEL FORMULARIO */}
            <FormProgress completed={completedFields} total={totalFields} />

            {/* ✅ BANNER DE PREREQUISITOS */}
            <Card className="p-4 bg-blue-50 border-blue-300">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-bold mb-2">📋 Antes de continuar, asegúrese de tener:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Número de radicado judicial completo (23 dígitos separados por guiones)</li>
                    <li>Fecha y hora exacta de la notificación oficial</li>
                    <li>Nombre completo del juzgado notificador</li>
                    <li>Pretensiones y hechos de la demanda</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* ✅ SECCIÓN 1: INFORMACIÓN DEL PROCESO */}
            <FormSection
              title="Información del Proceso Judicial"
              description="Complete los datos de identificación del proceso"
              icon={<FileText />}
              color="blue"
            >
              <FormField
                name="numeroRadicado"
                label="Número de Radicado Judicial"
                type="text"
                value={formData.numeroRadicado}
                onChange={(val) => updateField('numeroRadicado', val)}
                onBlur={() => touchField('numeroRadicado')}
                required
                error={errors.numeroRadicado}
                state={getFieldState('numeroRadicado')}
                placeholder="25000-23-33-001-2024-00123-00"
                tooltip="Formato completo del radicado tal como aparece en la notificación oficial. Incluye código del despacho, año, consecutivo y dígitos de verificación."
                maxLength={50}
                showCharCount
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="medioControl"
                  label="Medio de Control"
                  type="select"
                  value={formData.medioControl}
                  onChange={(val) => updateField('medioControl', val)}
                  onBlur={() => touchField('medioControl')}
                  required
                  error={errors.medioControl}
                  state={getFieldState('medioControl')}
                  options={mediosControlActivos.map(mc => ({
                    value: mc.id,
                    label: mc.nombre,
                    icon: <Scale className="w-4 h-4" />
                  }))}
                  tooltip="Seleccione el tipo de acción judicial según la clasificación legal colombiana"
                />

                <FormField
                  name="tipoProceso"
                  label="Tipo de Proceso"
                  type="select"
                  value={formData.tipoProceso}
                  onChange={(val) => updateField('tipoProceso', val)}
                  onBlur={() => touchField('tipoProceso')}
                  error={errors.tipoProceso}
                  state={getFieldState('tipoProceso')}
                  options={tiposProcesosActivos.map(tp => ({
                    value: tp.id,
                    label: tp.nombre
                  }))}
                  helpText="Opcional: Clasificación específica del proceso"
                />
              </div>

              <FormField
                name="cuantia"
                label="Cuantía"
                type="text"
                value={formData.cuantia}
                onChange={(val) => updateField('cuantia', val)}
                onBlur={() => touchField('cuantia')}
                error={errors.cuantia}
                state={getFieldState('cuantia')}
                placeholder="Ej: $150.000.000"
                tooltip="Valor total de las pretensiones en pesos colombianos"
                helpText="Opcional: Ingrese el valor económico de la demanda"
              />
            </FormSection>

            {/* ✅ SECCIÓN 2: UBICACIÓN Y JUZGADO */}
            <FormSection
              title="Despacho Judicial y Ubicación"
              description="Información del juzgado notificador"
              icon={<Building2 />}
              color="green"
            >
              <FormField
                name="juzgado"
                label="Juzgado o Tribunal"
                type="text"
                value={formData.juzgado}
                onChange={(val) => updateField('juzgado', val)}
                onBlur={() => touchField('juzgado')}
                required
                error={errors.juzgado}
                state={getFieldState('juzgado')}
                placeholder="Ej: Juzgado 15 Administrativo de Bogotá D.C."
                tooltip="Nombre completo del despacho judicial que notifica"
                maxLength={200}
                showCharCount
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="ciudad"
                  label="Ciudad"
                  type="text"
                  value={formData.ciudad}
                  onChange={(val) => updateField('ciudad', val)}
                  onBlur={() => touchField('ciudad')}
                  required
                  error={errors.ciudad}
                  state={getFieldState('ciudad')}
                  placeholder="Ej: Bogotá D.C."
                  icon={<MapPin className="w-4 h-4" />}
                />

                <FormField
                  name="departamento"
                  label="Departamento"
                  type="text"
                  value={formData.departamento}
                  onChange={(val) => updateField('departamento', val)}
                  onBlur={() => touchField('departamento')}
                  error={errors.departamento}
                  state={getFieldState('departamento')}
                  placeholder="Ej: Cundinamarca"
                  helpText="Opcional: Departamento del despacho judicial"
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 3: FECHAS Y PLAZOS */}
            <FormSection
              title="Fechas y Términos Procesales"
              description="Fechas críticas para el seguimiento del proceso"
              icon={<Calendar />}
              color="orange"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="fechaNotificacion"
                  label="Fecha de Notificación"
                  type="date"
                  value={formData.fechaNotificacion}
                  onChange={(val) => updateField('fechaNotificacion', val)}
                  onBlur={() => touchField('fechaNotificacion')}
                  required
                  error={errors.fechaNotificacion}
                  state={getFieldState('fechaNotificacion')}
                  tooltip="Fecha en que se recibió oficialmente la notificación judicial"
                  icon={<Calendar className="w-4 h-4" />}
                />

                <FormField
                  name="horaNotificacion"
                  label="Hora de Notificación"
                  type="text"
                  value={formData.horaNotificacion}
                  onChange={(val) => updateField('horaNotificacion', val)}
                  onBlur={() => touchField('horaNotificacion')}
                  placeholder="08:00"
                  helpText="Formato 24 horas (HH:MM)"
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <FormField
                    name="fechaVencimiento"
                    label="Fecha de Vencimiento"
                    type="date"
                    value={formData.fechaVencimiento}
                    onChange={(val) => updateField('fechaVencimiento', val)}
                    onBlur={() => touchField('fechaVencimiento')}
                    required
                    error={errors.fechaVencimiento}
                    state={getFieldState('fechaVencimiento')}
                    tooltip="Fecha límite para responder la demanda según términos legales"
                  />
                  {calcularFechaVencimientoSugerida && !formData.fechaVencimiento && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillFechaVencimiento}
                      className="mt-2 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Auto-calcular (10 días hábiles)
                    </Button>
                  )}
                </div>

                <FormField
                  name="horaVencimiento"
                  label="Hora de Vencimiento"
                  type="text"
                  value={formData.horaVencimiento}
                  onChange={(val) => updateField('horaVencimiento', val)}
                  onBlur={() => touchField('horaVencimiento')}
                  placeholder="17:00"
                  helpText="Formato 24 horas (HH:MM)"
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 4: ASIGNACIÓN */}
            <FormSection
              title="Asignación de Responsable"
              description="Abogado encargado del proceso"
              icon={<User />}
              color="purple"
            >
              <FormField
                name="abogadoAsignado"
                label="Abogado Responsable"
                type="select"
                value={formData.abogadoAsignado}
                onChange={(val) => updateField('abogadoAsignado', val)}
                onBlur={() => touchField('abogadoAsignado')}
                required
                error={errors.abogadoAsignado}
                state={getFieldState('abogadoAsignado')}
                options={abogadosDisponibles}
                tooltip="Profesional del derecho que asumirá la representación de ESAP"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="emailContacto"
                  label="Email de Contacto"
                  type="email"
                  value={formData.emailContacto}
                  onChange={(val) => updateField('emailContacto', val)}
                  onBlur={() => touchField('emailContacto')}
                  error={errors.emailContacto}
                  state={getFieldState('emailContacto')}
                  placeholder="abogado@esap.edu.co"
                  helpText="Email profesional del abogado asignado"
                  icon={<Mail className="w-4 h-4" />}
                />

                <FormField
                  name="telefonoContacto"
                  label="Teléfono de Contacto"
                  type="tel"
                  value={formData.telefonoContacto}
                  onChange={(val) => updateField('telefonoContacto', val)}
                  onBlur={() => touchField('telefonoContacto')}
                  error={errors.telefonoContacto}
                  state={getFieldState('telefonoContacto')}
                  placeholder="3001234567"
                  helpText="Celular o teléfono fijo (7-10 dígitos)"
                  icon={<Phone className="w-4 h-4" />}
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 5: CONTENIDO DE LA DEMANDA */}
            <FormSection
              title="Contenido de la Demanda"
              description="Pretensiones, hechos y observaciones"
              icon={<FileText />}
              color="red"
            >
              <FormField
                name="pretensiones"
                label="Pretensiones"
                type="textarea"
                value={formData.pretensiones}
                onChange={(val) => updateField('pretensiones', val)}
                onBlur={() => touchField('pretensiones')}
                required
                error={errors.pretensiones}
                state={getFieldState('pretensiones')}
                placeholder="Describa las pretensiones del demandante..."
                tooltip="Resumen de lo que solicita el demandante en la demanda"
                rows={6}
                maxLength={2000}
                showCharCount
              />

              <FormField
                name="hechos"
                label="Hechos"
                type="textarea"
                value={formData.hechos}
                onChange={(val) => updateField('hechos', val)}
                onBlur={() => touchField('hechos')}
                placeholder="Resuma los hechos narrados en la demanda..."
                helpText="Opcional: Descripción de los hechos alegados"
                rows={6}
                maxLength={2000}
                showCharCount
              />

              <FormField
                name="observaciones"
                label="Observaciones Adicionales"
                type="textarea"
                value={formData.observaciones}
                onChange={(val) => updateField('observaciones', val)}
                onBlur={() => touchField('observaciones')}
                placeholder="Notas internas, comentarios del equipo jurídico..."
                helpText="Opcional: Notas internas visibles solo para el equipo"
                rows={4}
                maxLength={1000}
                showCharCount
              />
            </FormSection>

            {/* ✅ ADVERTENCIA SI FORMULARIO INCOMPLETO */}
            {!isFormValid && completedFields > 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-bold mb-1">⚠️ Faltan campos obligatorios</p>
                    <p>Complete los campos marcados con asterisco (*) y resuelva los errores antes de guardar.</p>
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
                    <p className="font-bold">✅ Formulario completo y válido</p>
                    <p>Puede guardar la demanda judicial ahora.</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* ==================== FOOTER STICKY ==================== */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-600">
            <span className="text-red-500 font-bold">*</span> Campos obligatorios
            <span className="mx-2">•</span>
            <span className={isFormValid ? 'text-green-600 font-bold' : 'text-orange-600'}>
              {completedFields}/{totalFields} campos completados
            </span>
          </div>
          
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={enviando}
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
              className={!isFormValid || enviando ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {enviando ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : !isFormValid ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Complete los campos requeridos
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Registrar Demanda
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
