/**
 * ModalNuevoProcesoDisciplinario - VERSIÓN MEJORADA CON VALIDACIÓN EN TIEMPO REAL
 * ✅ Hook useFormValidation para validaciones reactivas
 * ✅ FormField components con indicadores visuales
 * ✅ Progreso del formulario visible
 * ✅ Mensajes inline específicos
 * ✅ Tooltips explicativos
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import { toast } from 'sonner';

import { legalService } from '../../../../services/api/legal.service';
import { estructuraService } from '../../../../services/api/estructura.service';
import type { ParteDisciplinaria } from '../core/types';
import {
  Gavel, User, FileText, AlertTriangle, Calendar,
  Save, X, Building, Info, CheckCircle, Scale,
  Plus, Trash2, Users, MapPin, UserPlus
} from 'lucide-react';
import { Input } from '@esap-mfe/shared-ui/input';
import { Label } from '@esap-mfe/shared-ui/label';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { ModalHeaderClean } from './ModalHeaderClean';

// Parte vacía reutilizable para disciplinados / denunciantes
const parteVacia = (rol: string): ParteDisciplinaria => ({
  nombre: '', tipoPersona: 'NATURAL', identificacion: '', rol,
  cargo: '', dependencia: '', email: '', telefono: '', direccion: '', apoderado: ''
});

// ✅ Importar hooks responsive
import { useKeyboardVisible } from '@esap-mfe/shared-hooks/useKeyboardVisible';

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
    apoderado: '',
    tipoFalta: 'LEVE',
    origen: '',
    territorial: '',
    presuntaConducta: '',
    descripcionHechos: '',
    investigador: '',
    abogadoAsignado: '',
    fechaHechos: '',
    observaciones: ''
  };

  // ========== PARTES Y HECHOS MÚLTIPLES (fuera del hook de validación) ==========
  // Disciplinados adicionales (el principal se captura en los campos validados de arriba)
  const [disciplinariosAdicionales, setDisciplinariosAdicionales] = useState<ParteDisciplinaria[]>([]);
  // Denunciantes / víctimas (se diferencian por el campo rol)
  const [denunciantes, setDenunciantes] = useState<ParteDisciplinaria[]>([]);
  // Hechos adicionales (el primero se captura en descripcionHechos)
  const [hechosAdicionales, setHechosAdicionales] = useState<string[]>([]);
  // Territoriales (seccionales) desde estructura organizacional
  const [seccionales, setSeccionales] = useState<{ idSeccional: number; nomSeccional: string }[]>([]);

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
    origen: [
      CommonValidations.required('El origen del proceso es obligatorio')
    ],
    territorial: [
      CommonValidations.required('La territorial es obligatoria')
    ],
    presuntaConducta: [
      CommonValidations.required('La presunta conducta indisciplinaria es obligatoria'),
      CommonValidations.minLength(5, 'Describa la presunta conducta')
    ],
    descripcionHechos: [
      CommonValidations.required('La descripción de hechos es obligatoria'),
      CommonValidations.minLength(50, 'Describa los hechos con al menos 50 caracteres para un contexto completo')
    ],
    investigador: [
      CommonValidations.required('El investigador asignado es obligatorio')
    ],
    fechaHechos: [
      CommonValidations.required('La fecha de los hechos es obligatoria'),
      CommonValidations.pastDate('La fecha de los hechos debe ser pasada o actual')
    ],
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

  // ========== CONFIGURACIÓN DE PRESCRIPCIÓN ==========
  const [prescriptionYears, setPrescriptionYears] = useState<number>(5);

  // ========== LEY APLICABLE DINÁMICA ==========
  /** Fecha límite: igual o posterior → Ley 1952/2019; antes → Ley 734/2002 */
  const LEY_1952_DESDE = new Date('2021-06-30T00:00:00.000Z');
  const leyAplicable = formData.fechaHechos
    ? (new Date(formData.fechaHechos) < LEY_1952_DESDE ? 'Ley 734 de 2002' : 'Ley 1952 de 2019')
    : null;
  const esLey1952 = leyAplicable === 'Ley 1952 de 2019';

  // ========== PROFESIONALES DESDE BACKEND (control-disciplinario-service) ==========
  // ✅ Usa el mismo endpoint que el módulo disciplinario (funciona en QA sin cambios de docker)
  const [profesionales, setProfesionales] = useState<{ id: string; nombreCompleto: string; especialidad: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Cargar abogados con rol RESUELVE_GESTION_LEGAL desde auth-service
      legalService.getAbogados()
        .then((data: any[]) => {
          setProfesionales(
            data.map((p: any) => ({
              id: p.id,
              nombreCompleto: p.nombreCompleto || p.nombre || p.email || 'Sin nombre',
              especialidad: p.email || 'Abogado'
            }))
          );
        })
        .catch((err: any) => {
          console.error('Error cargando profesionales:', err);
          setProfesionales([]);
        });

      // Cargar territoriales (seccionales) desde estructura organizacional
      estructuraService.seccionales.listar()
        .then((res: any) => {
          setSeccionales((res.data || []).map((s: any) => ({
            idSeccional: s.idSeccional,
            nomSeccional: s.nomSeccional,
          })));
        })
        .catch(() => setSeccionales([]));

      // Cargar configuración de prescripción disciplinaria
      legalService.getConfiguration('prescripcion_juzgamiento')
        .then((config: any) => {
          const years = config?.value?.years ?? 5;
          setPrescriptionYears(Number(years));
        })
        .catch(() => {
          setPrescriptionYears(5); // Valor por defecto normativo
        });
    }
  }, [isOpen]);

  // ========== OPCIONES ORIGEN Y ROL ==========
  const origenesProceso = [
    { value: 'QUEJA', label: 'Queja' },
    { value: 'DENUNCIA', label: 'Denuncia' },
    { value: 'DE_OFICIO', label: 'De oficio' },
    { value: 'INFORME_SERVIDOR', label: 'Informe de servidor público' },
    { value: 'ANONIMO', label: 'Anónimo' },
    { value: 'POR_DETERMINAR', label: 'Por determinar' },
  ];

  const territorialesOpciones = seccionales.map(s => ({
    value: s.nomSeccional,
    label: s.nomSeccional,
  }));

  // ========== HANDLERS DE PARTES/HECHOS ==========
  const actualizarParte = (
    lista: ParteDisciplinaria[],
    setLista: React.Dispatch<React.SetStateAction<ParteDisciplinaria[]>>,
    index: number,
    campo: keyof ParteDisciplinaria,
    valor: string
  ) => {
    setLista(lista.map((p, i) => (i === index ? { ...p, [campo]: valor } : p)));
  };

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

      // Hechos múltiples: el primero desde descripcionHechos + los adicionales
      const hechosList = [formData.descripcionHechos, ...hechosAdicionales]
        .map(h => (h || '').trim())
        .filter(Boolean);

      // Partes del proceso (se persisten en la tabla actors del backend)
      const actors: ParteDisciplinaria[] = [];
      // Disciplinado principal (de los campos validados)
      actors.push({
        nombre: formData.investigado,
        tipoPersona: 'NATURAL',
        identificacion: formData.identificacion,
        rol: 'DISCIPLINADO',
        cargo: formData.cargo,
        dependencia: depLabel,
        apoderado: formData.apoderado || undefined,
      });
      // Disciplinados adicionales
      disciplinariosAdicionales
        .filter(d => (d.nombre || '').trim())
        .forEach(d => actors.push({ ...d, rol: 'DISCIPLINADO' }));
      // Denunciantes / víctimas
      denunciantes
        .filter(d => (d.nombre || '').trim())
        .forEach(d => actors.push({ ...d, rol: d.rol || 'DENUNCIANTE' }));

      // El primer denunciante alimenta el campo demandante; si no hay, es de oficio
      const primerDenunciante = denunciantes.find(d => (d.nombre || '').trim());

      // =============================================
      // Crear expediente disciplinario via legal-management-service
      // POST /legal/api/v1/juzgamiento -> JuzgamientoController.create()
      // =============================================
      const expedienteData = {
        demandado: formData.investigado,
        cargoInvestigado: formData.cargo,
        dependenciaInvestigado: depLabel,
        tipoFalta: formData.tipoFalta,
        origen: formData.origen,
        territorial: formData.territorial,
        presuntaConducta: formData.presuntaConducta,
        hechos: hechosList.join('\n\n'),
        hechosList,
        actors,
        abogadoSustanciador: formData.investigador,
        fechaRadicacion: new Date(formData.fechaHechos).toISOString(),
        fechaHechos: new Date(formData.fechaHechos).toISOString(),
        demandante: primerDenunciante?.nombre || 'Oficina de Control Interno',
        numeroIdDemandado: formData.identificacion,
        camposAdicionales: formData.observaciones ? { observaciones: formData.observaciones } : undefined,
        // leyAplicable se calcula en el backend según fechaHechos
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
      setDisciplinariosAdicionales([]);
      setDenunciantes([]);
      setHechosAdicionales([]);
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

  // ✅ Estado para confirmar cancelación sin diálogo nativo (evita mostrar IP del servidor)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = () => {
    if (completedFields > 0) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmarCancelacion = () => {
    setShowCancelConfirm(false);
    resetForm();
    setDisciplinariosAdicionales([]);
    setDenunciantes([]);
    setHechosAdicionales([]);
    onClose();
  };

  // ✅ Hooks responsive
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

        {/* Wrapper relativo para el overlay de cancelación */}
        <div className="relative flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* ✅ OVERLAY DE CONFIRMACIÓN DE CANCELACIÓN */}
        {showCancelConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 rounded-[inherit]">
            <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-2xl p-6 mx-4 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-base text-red-900">¿Desea cancelar?</p>
                  <p className="text-sm text-red-700 mt-1">Se perderán los datos ingresados en el formulario.</p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={confirmarCancelacion}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Sí, cancelar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowCancelConfirm(false)}
                    >
                      Continuar editando
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

            {/* ✅ SECCIÓN 0: CLASIFICACIÓN DEL PROCESO */}
            <FormSection
              title="Clasificación del Proceso"
              description="Origen, territorial y presunta conducta indisciplinaria"
              icon={<MapPin />}
              color="blue"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  name="origen"
                  label="Origen"
                  type="select"
                  value={formData.origen}
                  onChange={(val) => updateField('origen', val)}
                  onBlur={() => touchField('origen')}
                  required
                  error={errors.origen}
                  state={getFieldState('origen')}
                  options={origenesProceso.map(o => ({ value: o.value, label: o.label }))}
                  tooltip="Cómo se origina el proceso: queja, denuncia, de oficio, etc."
                />

                <FormField
                  name="territorial"
                  label="Territorial"
                  type="select"
                  value={formData.territorial}
                  onChange={(val) => updateField('territorial', val)}
                  onBlur={() => touchField('territorial')}
                  required
                  error={errors.territorial}
                  state={getFieldState('territorial')}
                  options={territorialesOpciones}
                  tooltip="Territorial (seccional) a la que corresponde el proceso"
                />
              </div>

              <FormField
                name="presuntaConducta"
                label="Presunta Conducta Indisciplinaria"
                type="textarea"
                value={formData.presuntaConducta}
                onChange={(val) => updateField('presuntaConducta', val)}
                onBlur={() => touchField('presuntaConducta')}
                required
                error={errors.presuntaConducta}
                state={getFieldState('presuntaConducta')}
                placeholder="Describa la presunta conducta indisciplinaria imputada..."
                tooltip="Conducta que presuntamente constituye falta disciplinaria"
                rows={3}
                maxLength={1000}
                showCharCount
              />
            </FormSection>

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

              <FormField
                name="apoderado"
                label="Apoderado del Investigado (Opcional)"
                type="text"
                value={formData.apoderado}
                onChange={(val) => updateField('apoderado', val)}
                placeholder="Nombre del apoderado / defensor de confianza"
                helpText="Abogado que representa al disciplinado, si lo tiene"
                icon={<User className="w-4 h-4" />}
              />

              {/* Disciplinados adicionales (más de uno) */}
              {disciplinariosAdicionales.map((d, i) => (
                <Card key={`disc-${i}`} className="p-3 bg-blue-50/40 border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-blue-800">Disciplinado adicional #{i + 2}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => setDisciplinariosAdicionales(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input placeholder="Nombre completo *" value={d.nombre} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'nombre', e.target.value)} />
                    <Input placeholder="Identificación" value={d.identificacion || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'identificacion', e.target.value)} />
                    <Input placeholder="Cargo" value={d.cargo || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'cargo', e.target.value)} />
                    <Input placeholder="Dependencia" value={d.dependencia || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'dependencia', e.target.value)} />
                    <Input placeholder="Correo" value={d.email || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'email', e.target.value)} />
                    <Input placeholder="Teléfono" value={d.telefono || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'telefono', e.target.value)} />
                    <Input placeholder="Dirección" value={d.direccion || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'direccion', e.target.value)} />
                    <Input placeholder="Apoderado (opcional)" value={d.apoderado || ''} onChange={(e) => actualizarParte(disciplinariosAdicionales, setDisciplinariosAdicionales, i, 'apoderado', e.target.value)} />
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setDisciplinariosAdicionales(prev => [...prev, parteVacia('DISCIPLINADO')])}
              >
                <Plus className="w-4 h-4 mr-1" /> Agregar otro disciplinado
              </Button>
            </FormSection>

            {/* ✅ SECCIÓN DENUNCIANTES / VÍCTIMAS */}
            <FormSection
              title="Denunciantes y Víctimas"
              description="Personas que denuncian o resultan víctimas. Diferencie el rol de cada una."
              icon={<Users />}
              color="orange"
            >
              {denunciantes.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  Sin denunciantes registrados (proceso de oficio). Agregue uno si aplica.
                </p>
              )}

              {denunciantes.map((d, i) => (
                <Card key={`den-${i}`} className="p-3 bg-orange-50/40 border-orange-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-orange-800">Denunciante / Víctima #{i + 1}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => setDenunciantes(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="md:col-span-2">
                      <Label className="text-xs font-semibold text-gray-600">Rol</Label>
                      <select
                        className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
                        value={d.rol}
                        onChange={(e) => actualizarParte(denunciantes, setDenunciantes, i, 'rol', e.target.value)}
                      >
                        <option value="DENUNCIANTE">Denunciante</option>
                        <option value="VICTIMA">Víctima</option>
                      </select>
                    </div>
                    <Input placeholder="Nombre completo *" value={d.nombre} onChange={(e) => actualizarParte(denunciantes, setDenunciantes, i, 'nombre', e.target.value)} />
                    <Input placeholder="Identificación" value={d.identificacion || ''} onChange={(e) => actualizarParte(denunciantes, setDenunciantes, i, 'identificacion', e.target.value)} />
                    <Input placeholder="Correo" value={d.email || ''} onChange={(e) => actualizarParte(denunciantes, setDenunciantes, i, 'email', e.target.value)} />
                    <Input placeholder="Teléfono" value={d.telefono || ''} onChange={(e) => actualizarParte(denunciantes, setDenunciantes, i, 'telefono', e.target.value)} />
                    <Input placeholder="Dirección" value={d.direccion || ''} onChange={(e) => actualizarParte(denunciantes, setDenunciantes, i, 'direccion', e.target.value)} />
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setDenunciantes(prev => [...prev, parteVacia('DENUNCIANTE')])}
              >
                <UserPlus className="w-4 h-4 mr-1" /> Agregar denunciante / víctima
              </Button>
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

              {/* Hechos adicionales (más de uno) */}
              {hechosAdicionales.map((h, i) => (
                <div key={`hecho-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-gray-600">Hecho adicional #{i + 2}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => setHechosAdicionales(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-none"
                    rows={3}
                    maxLength={3000}
                    placeholder="Describa este hecho adicional..."
                    value={h}
                    onChange={(e) => setHechosAdicionales(prev => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => setHechosAdicionales(prev => [...prev, ''])}
              >
                <Plus className="w-4 h-4 mr-1" /> Agregar otro hecho
              </Button>
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
              description="Fechas relevantes para el cómputo de términos y determinación de la ley aplicable"
              icon={<Calendar />}
              color="green"
            >
              <FormField
                name="fechaHechos"
                label="Fecha de los Hechos"
                type="date"
                value={formData.fechaHechos}
                onChange={(val) => updateField('fechaHechos', val)}
                onBlur={() => touchField('fechaHechos')}
                required
                error={errors.fechaHechos}
                state={getFieldState('fechaHechos')}
                tooltip="Fecha en que ocurrieron los hechos disciplinarios. Determina la ley aplicable y el cómputo de prescripción."
                icon={<Calendar className="w-4 h-4" />}
              />

              {/* ✅ RECUADRO DINÁMICO DE LEY APLICABLE */}
              <div className={`flex items-start gap-3 p-4 rounded-lg border ${
                leyAplicable === null
                  ? 'bg-gray-50 border-gray-200'
                  : esLey1952
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-amber-50 border-amber-300'
              }`}>
                <Scale className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  leyAplicable === null ? 'text-gray-400' : esLey1952 ? 'text-blue-600' : 'text-amber-600'
                }`} />
                <div className="text-sm">
                  {leyAplicable === null ? (
                    <p className="text-gray-500 font-medium">Ingrese la fecha de los hechos para determinar la ley aplicable</p>
                  ) : (
                    <>
                      <p className={`font-bold text-base ${esLey1952 ? 'text-blue-900' : 'text-amber-900'}`}>
                        {leyAplicable}
                      </p>
                      <p className={`mt-1 ${esLey1952 ? 'text-blue-700' : 'text-amber-700'}`}>
                        {esLey1952
                          ? 'Código General Disciplinario — vigente desde el 30 de junio de 2021'
                          : 'Código Disciplinario Único — aplicable a hechos anteriores al 30 de junio de 2021'}
                      </p>
                      <p className={`mt-1.5 text-xs ${esLey1952 ? 'text-blue-600' : 'text-amber-600'}`}>
                        Término de prescripción: <strong>{prescriptionYears} {prescriptionYears === 1 ? 'año' : 'años'}</strong> contados desde la fecha del auto de apertura
                      </p>
                    </>
                  )}
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
        </div>{/* end relative wrapper */}
      </DialogContent>
    </Dialog>
  );
}
