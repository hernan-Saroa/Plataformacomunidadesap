/**
 * ModalNuevoProcesoDisciplinario - VERSIÓN MEJORADA CON VALIDACIÓN EN TIEMPO REAL
 * ✅ Hook useFormValidation para validaciones reactivas
 * ✅ FormField components con indicadores visuales
 * ✅ Progreso del formulario visible
 * ✅ Mensajes inline específicos
 * ✅ Tooltips explicativos
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { toast } from 'sonner';

import { legalService } from '../../../../services/api/legal.service';
import {
  Gavel, User, FileText, AlertTriangle, Calendar,
  Save, X, Building, Info, CheckCircle
} from 'lucide-react';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { ModalHeaderClean } from './ModalHeaderClean';

// ✅ Importar hooks responsive
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';

interface ModalNuevoProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (proceso: any) => void;
}

export function ModalNuevoProcesoDisciplinario({
  isOpen,
  onClose,
  onSubmit
}: ModalNuevoProcesoDisciplinarioProps) {

  // ========== DATOS INICIALES ==========
  const initialData = {
    investigado: '',
    identificacion: '',
    cargo: '',
    dependencia: '',
    tipoFalta: 'LEVE',
    descripcionHechos: '',
    investigador: '',
    abogadoAsignado: '',
    fechaApertura: '',
    observaciones: ''
  };

  // ========== REGLAS DE VALIDACIÓN ==========
  const validationRules = {
    investigado: [
      CommonValidations.required('El nombre del investigado es obligatorio'),
      CommonValidations.minLength(3, 'Ingrese el nombre completo')
    ],
    identificacion: [
      CommonValidations.required('La identificación es obligatoria'),
      {
        pattern: /^[0-9]{5,10}$/,
        message: 'Identificación inválida (5-10 dígitos)'
      }
    ],
    cargo: [
      CommonValidations.required('El cargo es obligatorio'),
      CommonValidations.minLength(3, 'Ingrese el cargo completo')
    ],
    dependencia: [
      CommonValidations.required('La dependencia es obligatoria')
    ],
    descripcionHechos: [
      CommonValidations.required('La descripción de hechos es obligatoria'),
      CommonValidations.minLength(50, 'Describa los hechos con al menos 50 caracteres para un contexto completo')
    ],
    investigador: [
      CommonValidations.required('El investigador asignado es obligatorio')
    ],
    fechaApertura: [
      CommonValidations.required('La fecha de apertura es obligatoria'),
      CommonValidations.pastDate('La fecha debe ser pasada o actual')
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

  const [guardando, setGuardando] = useState(false);

  // ========== ABOGADOS DESDE BACKEND (legal-management-service) ==========
  const [profesionales, setProfesionales] = useState<{ id: string; nombreCompleto: string; especialidad: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      legalService.getAbogados()
        .then((data: any[]) => {
          setProfesionales(data.filter((p: any) => p.estado === 'ACTIVO'));
        })
        .catch((err: any) => {
          console.error('Error cargando abogados:', err);
          setProfesionales([]);
        });
    }
  }, [isOpen]);

  // ========== OPCIONES DE SELECTS ==========
  const tiposFalta = [
    { value: 'LEVE', label: '🟢 Leve - Sanción amonestación' },
    { value: 'GRAVE', label: '🟡 Grave - Suspensión hasta 30 días' },
    { value: 'GRAVISIMA', label: '🔴 Gravísima - Destitución' }
  ];

  const dependenciasESAP = [
    { value: 'DIRECCION_GENERAL', label: 'Dirección General' },
    { value: 'SECRETARIA_GENERAL', label: 'Secretaría General' },
    { value: 'DIR_ADMINISTRATIVA', label: 'Dirección Administrativa y Financiera' },
    { value: 'DIR_DOCENCIA', label: 'Dirección de Docencia' },
    { value: 'DIR_INVESTIGACION', label: 'Dirección de Investigación' },
    { value: 'OFICINA_JURIDICA', label: 'Oficina Jurídica' },
    { value: 'CONTROL_INTERNO', label: 'Control Interno' },
    { value: 'TALENTO_HUMANO', label: 'Talento Humano' },
    { value: 'OTRA', label: 'Otra Dependencia' }
  ];

  // ✅ Investigadores y Abogados desde backend (legal-management-service)
  const investigadoresDisponibles = profesionales.map(p => ({
    value: p.id,
    label: `${p.nombreCompleto} (${p.especialidad || 'General'})`
  }));

  const abogadosDisponibles = profesionales.map(p => ({
    value: p.id,
    label: `${p.nombreCompleto} (${p.especialidad || 'General'})`
  }));

  // ========== HANDLERS ==========
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Revise los campos marcados en rojo',
        duration: 4000
      });
      return;
    }

    setGuardando(true);

    try {
      // Obtener nombre del investigador seleccionado
      const investigadorSeleccionado = profesionales.find(p => p.id === formData.investigador);
      const investigadorNombre = investigadorSeleccionado?.nombreCompleto || 'Profesional Asignado';

      // Obtener label legible de la dependencia
      const depLabel = dependenciasESAP.find(d => d.value === formData.dependencia)?.label || formData.dependencia;

      // =============================================
      // Crear expediente disciplinario via legal-management-service
      // POST /legal/api/v1/juzgamiento -> JuzgamientoController.create()
      // =============================================
      const expedienteData = {
        demandado: formData.investigado,           // Nombre del investigado
        cargoInvestigado: formData.cargo,           // Cargo del investigado
        dependenciaInvestigado: depLabel,           // Dependencia
        tipoFalta: formData.tipoFalta,             // LEVE, GRAVE, GRAVISIMA
        hechos: formData.descripcionHechos + (formData.observaciones ? `\n\nObservaciones: ${formData.observaciones}` : ''),
        abogadoSustanciador: investigadorNombre,   // Investigador asignado
        fechaRadicacion: new Date(formData.fechaApertura).toISOString(),
        demandante: 'Oficina de Control Interno',  // Quien inicia
        numeroIdDemandado: formData.identificacion, // CC del investigado
      };

      console.log('⚖️ Creando proceso disciplinario...', expedienteData);
      const proceso = await legalService.createJuzgamientoProceso(expedienteData);
      console.log('✅ Proceso creado:', proceso.id, proceso.radicado);

      // Notificar al padre y cerrar
      if (onSubmit) {
        onSubmit(proceso);
      }

      toast.success('✅ Proceso disciplinario creado', {
        description: `Radicado: ${proceso.radicado || proceso.id}`,
        duration: 4000
      });

      resetForm();
      onClose();
    } catch (error: any) {
      console.error('❌ Error creando proceso disciplinario:', error);
      const message = error?.response?.data?.message || error?.message || 'Intente nuevamente';
      toast.error('❌ Error al crear proceso', {
        description: message,
        duration: 5000
      });
    } finally {
      setGuardando(false);
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
          w-[100vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:max-w-[900px]
          ${keyboardVisible ? 'h-[60vh]' : 'h-auto max-h-[95vh] sm:max-h-[90vh]'}
          flex flex-col p-0 gap-0
          transition-all duration-200
        `}
      >
        <DialogTitle className="sr-only">
          Nuevo Proceso Disciplinario - Validación Mejorada
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulario para registrar un nuevo proceso disciplinario con validación en tiempo real
        </DialogDescription>

        {/* ==================== HEADER ==================== */}
        <ModalHeaderClean
          icono={Gavel}
          colorIcono="red"
          titulo="Nuevo Proceso Disciplinario"
          subtitulo="Registro de investigación disciplinaria con validación en tiempo real"
          badgePrincipal="AVOCAMIENTO"
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
                  <p className="font-bold mb-2">📋 Antes de continuar, asegúrese de tener:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Datos completos del funcionario investigado (nombre, cargo, dependencia)</li>
                    <li>Descripción detallada de los hechos que motivan la investigación</li>
                    <li>Investigador asignado conforme al Decreto 648/2017</li>
                    <li>Fecha del auto de apertura</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* ✅ SECCIÓN 1: DATOS DEL INVESTIGADO */}
            <FormSection
              title="Datos del Funcionario Investigado"
              description="Información del servidor público sujeto a investigación"
              icon={<User />}
              color="blue"
            >
              <FormField
                name="investigado"
                label="Nombre Completo del Investigado"
                type="text"
                value={formData.investigado}
                onChange={(val) => updateField('investigado', val)}
                onBlur={() => touchField('investigado')}
                required
                error={errors.investigado}
                state={getFieldState('investigado')}
                placeholder="Ej: Juan Carlos Pérez Rodríguez"
                tooltip="Nombres y apellidos completos del funcionario investigado"
                icon={<User className="w-4 h-4" />}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="identificacion"
                  label="Cédula de Ciudadanía"
                  type="text"
                  value={formData.identificacion}
                  onChange={(val) => updateField('identificacion', val)}
                  onBlur={() => touchField('identificacion')}
                  required
                  error={errors.identificacion}
                  state={getFieldState('identificacion')}
                  placeholder="Ej: 1234567890"
                  tooltip="Número de cédula sin puntos ni espacios"
                  maxLength={10}
                  showCharCount
                />

                <FormField
                  name="cargo"
                  label="Cargo del Investigado"
                  type="text"
                  value={formData.cargo}
                  onChange={(val) => updateField('cargo', val)}
                  onBlur={() => touchField('cargo')}
                  required
                  error={errors.cargo}
                  state={getFieldState('cargo')}
                  placeholder="Ej: Director Administrativo"
                  tooltip="Cargo que desempeña o desempeñaba al momento de los hechos"
                />
              </div>

              <FormField
                name="dependencia"
                label="Dependencia"
                type="select"
                value={formData.dependencia}
                onChange={(val) => updateField('dependencia', val)}
                onBlur={() => touchField('dependencia')}
                required
                error={errors.dependencia}
                state={getFieldState('dependencia')}
                options={dependenciasESAP.map(dep => ({
                  value: dep.value,
                  label: dep.label,
                  icon: <Building className="w-4 h-4" />
                }))}
                tooltip="Dependencia a la que pertenece el funcionario"
              />
            </FormSection>

            {/* ✅ SECCIÓN 2: TIPO DE FALTA Y HECHOS */}
            <FormSection
              title="Tipo de Falta y Descripción de Hechos"
              description="Clasificación de la conducta y narración de los hechos investigados"
              icon={<FileText />}
              color="orange"
            >
              <FormField
                name="tipoFalta"
                label="Tipo de Falta (Preliminar)"
                type="select"
                value={formData.tipoFalta}
                onChange={(val) => updateField('tipoFalta', val)}
                onBlur={() => touchField('tipoFalta')}
                options={tiposFalta.map(tf => ({
                  value: tf.value,
                  label: tf.label
                }))}
                helpText="Clasificación preliminar según Ley 734/2002. Puede modificarse durante la investigación"
                icon={<AlertTriangle className="w-4 h-4" />}
              />

              <FormField
                name="descripcionHechos"
                label="Descripción de los Hechos"
                type="textarea"
                value={formData.descripcionHechos}
                onChange={(val) => updateField('descripcionHechos', val)}
                onBlur={() => touchField('descripcionHechos')}
                required
                error={errors.descripcionHechos}
                state={getFieldState('descripcionHechos')}
                placeholder="Describa de manera clara y detallada los hechos que motivan la apertura de la investigación disciplinaria, incluyendo fechas, lugares y circunstancias..."
                tooltip="Narración completa de los hechos presuntamente constitutivos de falta disciplinaria"
                rows={8}
                maxLength={3000}
                showCharCount
              />
            </FormSection>

            {/* ✅ SECCIÓN 3: ASIGNACIÓN DE INVESTIGADOR */}
            <FormSection
              title="Asignación de Investigador y Abogado"
              description="Funcionarios responsables de la investigación disciplinaria"
              icon={<Gavel />}
              color="purple"
            >
              <FormField
                name="investigador"
                label="Investigador Asignado"
                type="select"
                value={formData.investigador}
                onChange={(val) => updateField('investigador', val)}
                onBlur={() => touchField('investigador')}
                required
                error={errors.investigador}
                state={getFieldState('investigador')}
                options={investigadoresDisponibles.map(inv => ({
                  value: inv.value,
                  label: inv.label
                }))}
                tooltip="Funcionario designado para adelantar la investigación según Decreto 648/2017"
              />

              <FormField
                name="abogadoAsignado"
                label="Abogado de Apoyo (Opcional)"
                type="select"
                value={formData.abogadoAsignado}
                onChange={(val) => updateField('abogadoAsignado', val)}
                options={abogadosDisponibles.map(abg => ({
                  value: abg.value,
                  label: abg.label
                }))}
                helpText="Abogado que brindará apoyo jurídico durante el proceso"
              />
            </FormSection>

            {/* ✅ SECCIÓN 4: FECHAS */}
            <FormSection
              title="Fechas del Proceso"
              description="Fechas relevantes para el cómputo de términos"
              icon={<Calendar />}
              color="green"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="fechaApertura"
                  label="Fecha de Auto de Apertura"
                  type="date"
                  value={formData.fechaApertura}
                  onChange={(val) => updateField('fechaApertura', val)}
                  onBlur={() => touchField('fechaApertura')}
                  required
                  error={errors.fechaApertura}
                  state={getFieldState('fechaApertura')}
                  tooltip="Fecha de expedición del auto que ordena la apertura de la investigación"
                  icon={<Calendar className="w-4 h-4" />}
                />

                <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                  <div className="text-xs text-blue-900">
                    <p className="font-bold">Término inicial: 90 días</p>
                    <p>Según Ley 734/2002 para etapa de indagación</p>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 5: OBSERVACIONES */}
            <FormSection
              title="Observaciones Adicionales"
              description="Notas internas sobre el proceso disciplinario"
              icon={<FileText />}
              color="blue"
            >
              <FormField
                name="observaciones"
                label="Observaciones"
                type="textarea"
                value={formData.observaciones}
                onChange={(val) => updateField('observaciones', val)}
                placeholder="Notas internas, antecedentes disciplinarios, recomendaciones del equipo..."
                helpText="Opcional: Información complementaria visible solo para el equipo de Control Interno"
                rows={5}
                maxLength={1500}
                showCharCount
              />
            </FormSection>

            {/* ✅ ADVERTENCIA SI FORMULARIO INCOMPLETO */}
            {!isFormValid && completedFields > 0 && (
              <Card className="p-4 bg-yellow-50 border-yellow-300">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
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
                    <p>Puede crear el proceso disciplinario ahora.</p>
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
              disabled={guardando}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || guardando}
              style={isFormValid && !guardando ? {
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
              } : {}}
              className={`w-full sm:w-auto ${!isFormValid || guardando ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {guardando ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </>
              ) : !isFormValid ? (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Complete los campos requeridos
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Crear Proceso Disciplinario
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
