/**
 * ModalNuevaDemanda - VERSIÓN MEJORADA CON VALIDACIÓN EN TIEMPO REAL
 * ✅ Sistema useFormValidation para validaciones reactivas
 * ✅ FormField components con indicadores visuales
 * ✅ Progreso del formulario visible
 * ✅ Botón inteligente que se deshabilita
 * ✅ Banner de prerequisitos
 * ✅ Mensajes inline específicos por campo
 * ✅ Tooltips explicativos
 * ✅ Mantiene funcionalidad de múltiples demandantes/demandados
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Scale, User, Calendar, FileText, Building2, AlertCircle, 
  Save, MapPin, DollarSign, Gavel, Plus, X, UserPlus, Users, 
  Clock, Info, CheckCircle, Trash2, Upload, Loader2, Phone, Mail, Briefcase
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';

// ✅ Importar sistema de validación
import { useFormValidation, CommonValidations } from '../hooks/useFormValidation';
import { FormField, FormSection, FormProgress } from '../design-system/FormField';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { ModalHeaderClean } from './ModalHeaderClean';
import { legalService } from '../../../../services/api/legal.service';

// ✅ Importar hooks responsive
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useKeyboardVisible } from '../../../../hooks/useKeyboardVisible';

interface ModalNuevaDemandaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: NuevaDemandaData) => void;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
  tipoProceso: string;

  demandantes: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    apoderado?: string;
  }>;
  demandados: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    cargo?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    apoderado?: string;
  }>;
  cuantia: string;
  juzgado: string;
  ciudad: string;
  departamento: string;
  fechaNotificacion: string;
  horaNotificacion: string;
  fechaVencimiento: string;
  horaVencimiento: string;
  tipoDias: 'habiles' | 'calendario';
  abogadoAsignado: string;
  etapa: string;
  pretensiones: string;
  hechos: string;
  observaciones: string;
}

interface Abogado {
  id: string;
  nombreCompleto: string;
}

const ABOGADOS_DISPONIBLES = [
  'Dr. Juan Pérez López',
  'Dra. María González',
  'Dr. Carlos Ramírez',
  'Dra. Ana López García',
  'Dr. Pedro Martínez',
  'Dra. Laura Fernández'
];

const MEDIOS_CONTROL = [
  'REPARACIÓN DIRECTA',
  'NULIDAD Y RESTABLECIMIENTO',
  'ACCIÓN DE GRUPO',
  'ACCIÓN POPULAR',
  'CONTROVERSIAS CONTRACTUALES',
  'TUTELA',
  'OTRO'
];

// Tipos de Procesos Judiciales ahora vienen de ConfiguracionesSIGLContext
// Tipos de Procesos Judiciales y Medios de Control configurables desde Configuraciones SIGL
const TIPOS_PROCESOS_JUDICIALES = [
  { id: 'reparacion-directa', nombre: 'Reparación Directa', descripcion: 'Acción para obtener indemnización de perjuicios' },
  { id: 'nulidad-restablecimiento', nombre: 'Nulidad y Restablecimiento del Derecho', descripcion: 'Acción para declarar la nulidad de un acto administrativo' },
  { id: 'accion-grupo', nombre: 'Acción de Grupo', descripcion: 'Acción interpuesta por un grupo de personas' },
  { id: 'accion-popular', nombre: 'Acción Popular', descripcion: 'Acción para la protección de derechos colectivos' },
  { id: 'controversias-contractuales', nombre: 'Controversias Contractuales', descripcion: 'Acción para resolver controversias de contratos estatales' },
  { id: 'tutela', nombre: 'Tutela', descripcion: 'Acción para protección inmediata de derechos fundamentales' },
  { id: 'proceso-ejecutivo', nombre: 'Proceso Ejecutivo', descripcion: 'Proceso para cobro de obligaciones' },
  { id: 'otro', nombre: 'Otro', descripcion: 'Otros tipos de procesos judiciales' },
];

const DEPARTAMENTOS = [
  'Cundinamarca',
  'Antioquia',
  'Valle del Cauca',
  'Atlántico',
  'Santander',
  'Bolívar',
  'Tolima',
  'Boyacá',
  'Otro'
];
// Listado de abogados
const abogadosDisponibles = [
  { value: 'DR. CARLOS MENDEZ RUIZ', label: 'Dr. Carlos Méndez Ruiz' },
  { value: 'DRA. ANA MARIA LOPEZ', label: 'Dra. Ana María López Sánchez' },
  { value: 'DR. ROBERTO GARCIA SOTO', label: 'Dr. Roberto García Soto' },
  { value: 'DRA. PATRICIA ROJAS DIAZ', label: 'Dra. Patricia Rojas Díaz' },
  { value: 'DR. LUIS GOMEZ TORRES', label: 'Dr. Luis Gómez Torres' }
];

// const INITIAL_FORM_DATA: NuevaDemandaData = {
//   numeroRadicado: '',
//   medioControl: '',
//   demandante: '',
//   tipoProceso: '',
//   tipoPersona: 'natural',
//   identificacionDemandante: '',
//   // Campos de contacto del demandante
//   demandanteDireccion: '',
//   demandanteTelefono: '',
//   demandanteEmail: '',
//   demandanteApoderado: '',
//   // Datos del demandado (ESAP por defecto)
//   demandado: 'ESAP - Escuela Superior de Administración Pública',
//   tipoIdDemandado: 'NIT',
//   numeroIdDemandado: '899.999.061-4',
//   demandadoDireccion: 'Calle 44 #53-37, Bogotá D.C.',
//   demandadoTelefono: '+57 601 220 2790',
//   demandadoEmail: 'juridica@esap.edu.co',
//   cuantia: '',
//   juzgado: '',
//   ciudad: '',
//   departamento: '',
//   fechaNotificacion: '',
//   fechaVencimiento: '',
//   abogadoAsignado: '',
//   etapa: 'NOTIFICADA',
//   pretensiones: '',
//   hechos: '',
//   observaciones: ''
// };

export function ModalNuevaDemanda({ isOpen, onClose, onSave }: ModalNuevaDemandaProps) {
  
  // ✅ Obtener configuraciones desde Context API
  const { mediosControlActivos, tiposProcesosActivos } = useConfiguracionModulo('defensa-judicial');
  
  // ========== DATOS INICIALES ==========
  const initialData = {
    numeroRadicado: '',
    medioControl: '',
    tipoProceso: '',
    demandantes: [] as any[],
    demandados: [] as any[],
    cuantia: '',
    juzgado: '',
    ciudad: '',
    departamento: '',
    fechaNotificacion: '',
    horaNotificacion: '08:00',
    fechaVencimiento: '',
    horaVencimiento: '17:00',
    tipoDias: 'habiles' as 'habiles' | 'calendario',
    abogadoAsignado: '',
    etapa: 'NOTIFICADA',
    pretensiones: '',
    hechos: '',
    observaciones: ''
  };

  // ========== REGLAS DE VALIDACIÓN ==========
  const validationRules = {
    numeroRadicado: [
      CommonValidations.required('El número de radicado es obligatorio'),
      CommonValidations.minLength(10, 'Debe tener al menos 10 caracteres')
    ],
    medioControl: [
      CommonValidations.required('Seleccione el medio de control')
    ],
    demandantes: [
      CommonValidations.arrayMinLength(1, 'Debe agregar al menos un demandante')
    ],
    juzgado: [
      CommonValidations.required('El juzgado es obligatorio'),
      CommonValidations.minLength(5, 'Ingrese el nombre completo del juzgado')
    ],
    ciudad: [
      CommonValidations.required('La ciudad es obligatoria')
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
    ]
  };

  // ========== HOOK DE VALIDACIÓN ==========
  const {
    formData,
    // errors,
    updateField,
    touchField,
    // validateForm,
    isFormValid,
    getFieldState,
    completedFields,
    totalFields,
    resetForm
  } = useFormValidation(initialData, validationRules);

  // ========== ESTADO LOCAL PARA AGREGAR DEMANDANTES/DEMANDADOS ==========
  const [enviando, setEnviando] = useState(false);
  
  const [nuevoDemandante, setNuevoDemandante] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: '',
    telefono: '',
    email: '',
    direccion: '',
    apoderado: ''
  });

  const [nuevoDemandado, setNuevoDemandado] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: '',
    cargo: '',
    telefono: '',
    email: '',
    direccion: '',
    apoderado: ''
  });

  // Estado para el otro actor temporal que se está agregando
  const [nuevoOtroActor, setNuevoOtroActor] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: '',
    rol: '',
    telefono: '',
    email: '',
    direccion: '',
    apoderado: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loadingAbogados, setLoadingAbogados] = useState(false);

  // ✅ Auto-calcular fecha de vencimiento cuando cambia tipoProceso o fechaNotificacion
  useEffect(() => {
    if (formData.tipoProceso && formData.fechaNotificacion) {
      const tipoSeleccionado = tiposProcesosActivos.find((t: any) => t.nombre === formData.tipoProceso);
      if (tipoSeleccionado && tipoSeleccionado.plazo) {
        const fechaNotif = new Date(formData.fechaNotificacion);
        // Valid date check
        if (!isNaN(fechaNotif.getTime())) {
          const fechaVenc = new Date(fechaNotif);
          fechaVenc.setDate(fechaVenc.getDate() + tipoSeleccionado.plazo);
          const fechaVencStr = fechaVenc.toISOString().split('T')[0];

          if (formData.fechaVencimiento !== fechaVencStr) {
            setFormData(prev => ({ ...prev, fechaVencimiento: fechaVencStr }));
          }
        }
      }
    }
  }, [formData.tipoProceso, formData.fechaNotificacion, tiposProcesosActivos]);

  // Cargar abogados desde la API y resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      loadAbogados();
      // setFormData(INITIAL_FORM_DATA);
      setErrors({});
    }
  }, [isOpen]);

  const loadAbogados = async () => {
    try {
      setLoadingAbogados(true);
      const data = await legalService.getAbogadosDashboard();
      setAbogados(data.map((a: any) => ({
        id: a.id,
        nombreCompleto: a.nombreCompleto || `${a.nombre || ''} ${a.apellido || ''}`.trim() || 'Abogado'
      })));
    } catch (error) {
      console.error('Error cargando abogados:', error);
      // Fallback a lista vacía
      setAbogados([]);
    } finally {
      setLoadingAbogados(false);
    }
  };

  // ✅ Helpers de validación de formato
  const onlyNumbers = (value: string): string => value.replace(/[^0-9]/g, '');
  const onlyLetters = (value: string): string => value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
  const onlyNit = (value: string): string => value.replace(/[^0-9.\-]/g, '');
  const phoneFormat = (value: string): string => value.replace(/[^0-9+\s-]/g, '');
  const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleInputChange = (field: keyof NuevaDemandaData, value: any) => {
    let finalValue = value;

    if (field === 'numeroRadicado') {
      // Allow only numbers, max 23 chars
      finalValue = onlyNumbers(value).slice(0, 23);
    }

    if (field === 'cuantia') {
      // Max 12 digits, handle '0' logic
      let val = onlyNumbers(value);
      if (val.length > 1 && val.startsWith('0')) {
        // If starts with 0 and has more digits, strip leading 0 unless it's just '0' which is fine but logic usually implies '05' -> '5'
        val = parseInt(val, 10).toString();
      }
      if (val.length > 12) val = val.slice(0, 12);
      finalValue = val;
    }

    setFormData(prev => ({ ...prev, [field]: finalValue }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Agregar demandante a la lista
  // ========== CALCULAR FECHA VENCIMIENTO AUTOMÁTICA ==========
  const calcularFechaVencimientoSugerida = useMemo(() => {
    if (!formData.fechaNotificacion) return null;
    
    const fecha = new Date(formData.fechaNotificacion);
    // Calcular 10 días hábiles aproximados (14 días calendario)
    fecha.setDate(fecha.getDate() + 14);
    return fecha.toISOString().split('T')[0];
  }, [formData.fechaNotificacion]);

  // ========== HANDLERS DEMANDANTES ==========
  const handleAgregarDemandante = () => {
    if (!nuevoDemandante.nombre.trim()) {
      toast.error('⚠️ Nombre incompleto', { description: 'Ingrese el nombre completo del demandante' });
      return;
    }
    // Validate Name (Letters only)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nuevoDemandante.nombre)) {
      toast.error('⚠️ Formato inválido', { description: 'El nombre solo debe contener letras.' });
      return;
    }

    if (!nuevoDemandante.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', { description: 'Ingrese la identificación del demandante' });
      return;
    }
    // Validate ID (Natural: Numbers only)
    if (nuevoDemandante.tipoPersona === 'natural' && !/^\d+$/.test(nuevoDemandante.identificacion)) {
      toast.error('⚠️ Formato inválido', { description: 'La cédula debe contener solo números.' });
      return;
    }

    const demandante = {
      id: `DEM-${Date.now()}`,
      nombre: nuevoDemandante.nombre,
      tipoPersona: nuevoDemandante.tipoPersona,
      identificacion: nuevoDemandante.identificacion,
      telefono: nuevoDemandante.telefono,
      email: nuevoDemandante.email,
      direccion: nuevoDemandante.direccion,
      apoderado: nuevoDemandante.apoderado
    };

    updateField('demandantes', [...formData.demandantes, demandante]);
    touchField('demandantes');

    setNuevoDemandante({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      telefono: '',
      email: '',
      direccion: '',
      apoderado: ''
    });

    toast.success('✅ Demandante agregado', {
      description: `${demandante.nombre} agregado a la lista`
    });
  };

  const handleEliminarDemandante = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.filter(d => d.id !== id)
    }));

    toast.info('🗑️ Demandante eliminado', {
      description: 'El demandante ha sido removido de la lista'
    });
  };

  // ========== HANDLERS DEMANDADOS ==========
  const handleAgregarDemandado = () => {
    if (!nuevoDemandado.nombre.trim()) {
      toast.error('⚠️ Nombre incompleto', { description: 'Ingrese el nombre completo del demandado' });
      return;
    }
    // Validate Name (Letters only)
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nuevoDemandado.nombre)) {
      toast.error('⚠️ Formato inválido', { description: 'El nombre solo debe contener letras.' });
      return;
    }

    if (!nuevoDemandado.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', { description: 'Ingrese la identificación del demandado' });
      return;
    }
    // Validate ID
    if (nuevoDemandado.tipoPersona === 'natural' && !/^\d+$/.test(nuevoDemandado.identificacion)) {
      toast.error('⚠️ Formato inválido', { description: 'La cédula debe contener solo números.' });
      return;
    }
    // Juridica can have dots/dashes, already implicitly allowed by input but good to check if needed.

    const demandado = {
      id: `DEMAN-${Date.now()}`,
      nombre: nuevoDemandado.nombre,
      tipoPersona: nuevoDemandado.tipoPersona,
      identificacion: nuevoDemandado.identificacion,
      cargo: nuevoDemandado.cargo,
      telefono: nuevoDemandado.telefono,
      email: nuevoDemandado.email,
      direccion: nuevoDemandado.direccion,
      apoderado: nuevoDemandado.apoderado
    };

    updateField('demandados', [...formData.demandados, demandado]);

    setNuevoDemandado({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      cargo: '',
      telefono: '',
      email: '',
      direccion: '',
      apoderado: ''
    });

    toast.success('✅ Demandado agregado', {
      description: `${demandado.nombre} agregado a la lista`
    });
  };

  const handleEliminarDemandado = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandados: prev.demandados.filter(d => d.id !== id)
    }));

    toast.info('🗑️ Demandado eliminado', {
      description: 'El demandado ha sido removido de la lista'
    });
  };

  // Agregar otro actor a la lista
  const handleAgregarOtroActor = () => {
    if (!nuevoOtroActor.nombre.trim()) {
      toast.error('⚠️ Nombre incompleto', { description: 'Ingrese el nombre completo del otro actor' });
      return;
    }
    // Validate Name
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nuevoOtroActor.nombre)) {
      toast.error('⚠️ Formato inválido', { description: 'El nombre solo debe contener letras.' });
      return;
    }

    if (!nuevoOtroActor.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', { description: 'Ingrese la identificación del otro actor' });
      return;
    }
    // Validate ID
    if (nuevoOtroActor.tipoPersona === 'natural' && !/^\d+$/.test(nuevoOtroActor.identificacion)) {
      toast.error('⚠️ Formato inválido', { description: 'La cédula debe contener solo números.' });
      return;
    }

    if (!nuevoOtroActor.rol.trim()) {
      toast.error('⚠️ Rol incompleto', { description: 'Ingrese el rol del otro actor (ej: Tercero, Ministerio Público)' });
      return;
    }

    const otroActor = {
      id: `OTRO-${Date.now()}`,
      nombre: nuevoOtroActor.nombre,
      tipoPersona: nuevoOtroActor.tipoPersona,
      identificacion: nuevoOtroActor.identificacion,
      rol: nuevoOtroActor.rol,
      telefono: nuevoOtroActor.telefono,
      email: nuevoOtroActor.email,
      direccion: nuevoOtroActor.direccion,
      apoderado: nuevoOtroActor.apoderado
    };

    setFormData(prev => ({
      ...prev,
      otrosActores: [...prev.otrosActores, otroActor]
    }));

    // Limpiar formulario de nuevo otro actor
    setNuevoOtroActor({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      rol: '',
      telefono: '',
      email: '',
      direccion: '',
      apoderado: ''
    });

    toast.success('✅ Otro actor agregado', {
      description: `${otroActor.nombre} agregado a la lista`
    });
  };

  // Eliminar otro actor de la lista
  const handleEliminarOtroActor = (id: string) => {
    setFormData(prev => ({
      ...prev,
      otrosActores: prev.otrosActores.filter(d => d.id !== id)
    }));

    toast.info('🗑️ Otro actor eliminado', {
      description: 'El otro actor ha sido removido de la lista'
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Radicado: 23 dígitos exactos y numérico
    if (!formData.numeroRadicado.trim()) {
      newErrors.numeroRadicado = 'El número de radicado es obligatorio';
    } else if (formData.numeroRadicado.length !== 23) {
      newErrors.numeroRadicado = `El radicado debe tener 23 dígitos (actual: ${formData.numeroRadicado.length})`;
    }

    // 2. Campos obligatorios principales
    if (!formData.medioControl) newErrors.medioControl = 'Seleccione el medio de control';
    if (!formData.tipoProceso) newErrors.tipoProceso = 'Seleccione el tipo de proceso';

    // 3. Actores Obligatorios
    if (formData.demandantes.length === 0) newErrors.demandantes = 'Debe agregar al menos un demandante';
    if (formData.demandados.length === 0) newErrors.demandados = 'Debe agregar al menos un demandado (ej. ESAP)';

    // 4. Otros campos obligatorios (Todos excepto observaciones)
    if (!formData.juzgado.trim()) newErrors.juzgado = 'El juzgado es obligatorio';
    if (!formData.ciudad.trim()) newErrors.ciudad = 'La ciudad es obligatoria';
    if (!formData.departamento.trim()) newErrors.departamento = 'El departamento es obligatorio';
    if (!formData.fechaNotificacion) newErrors.fechaNotificacion = 'La fecha de notificación es obligatoria';
    if (!formData.abogadoAsignado) newErrors.abogadoAsignado = 'Debe asignar un abogado responsable';
    if (!formData.etapa) newErrors.etapa = 'La etapa es obligatoria';
    if (!formData.pretensiones.trim()) newErrors.pretensiones = 'Las pretensiones son obligatorias';
    if (!formData.hechos.trim()) newErrors.hechos = 'Los hechos son obligatorios';
    if (!formData.cuantia.trim()) newErrors.cuantia = 'La cuantía es obligatoria';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Revise los campos marcados en rojo',
        duration: 4000
      });
      return;
    }

    onSave(formData);

    toast.success('✅ Demanda registrada exitosamente', {
      description: `Radicado: ${formData.numeroRadicado}`,
      duration: 4000
    });

    // Resetear formulario
    setFormData({
      numeroRadicado: '',
      medioControl: '',
      tipoProceso: '',
      demandantes: [],
      demandados: [],
      otrosActores: [],
      cuantia: '',
      juzgado: '',
      ciudad: '',
      departamento: '',
      fechaNotificacion: '',
      horaNotificacion: '08:00',
      fechaVencimiento: '',
      horaVencimiento: '17:00',
      tipoDias: 'habiles',
      abogadoAsignado: '',
      etapa: 'NOTIFICADA',
      pretensiones: '',
      hechos: '',
      observaciones: ''
    });
    setNuevoDemandante({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      telefono: '',
      email: '',
      direccion: '',
      apoderado: ''
    });
    setNuevoDemandado({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      cargo: '',
      telefono: '',
      email: '',
      direccion: '',
      apoderado: ''
    });
    setNuevoOtroActor({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      rol: '',
      telefono: '',
      email: '',
      direccion: '',
      apoderado: ''
    });
    setErrors({});

    onClose();
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
      toast.success('📅 Fecha calculada: 10 días hábiles');
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
          w-[100vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:max-w-[1000px]
          ${keyboardVisible ? 'h-[60vh]' : 'h-auto max-h-[95vh] sm:max-h-[90vh]'}
          flex flex-col p-0 gap-0
          transition-all duration-200
        `}
      >
        <DialogTitle className="sr-only">
          Nueva Demanda Judicial - Validación Mejorada
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
          badgePrincipal="NOTIFICADA"
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
                    <li>Número de radicado judicial completo</li>
                    <li>Fecha y hora exacta de la notificación oficial</li>
                    <li>Nombre completo del juzgado notificador</li>
                    <li>Datos del(los) demandante(s) (nombre e identificación)</li>
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
                tooltip="Formato completo del radicado tal como aparece en la notificación oficial"
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
                  tooltip="Tipo de acción judicial según clasificación legal colombiana"
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
                placeholder="Ej: $150.000.000"
                tooltip="Valor total de las pretensiones en pesos colombianos"
                helpText="Opcional: Valor económico de la demanda"
                icon={<DollarSign className="w-4 h-4" />}
              />
            </FormSection>

            {/* ✅ SECCIÓN 2: DEMANDANTES */}
            <FormSection
              title="Parte Demandante (Actor)"
              description="Agregue los demandantes del proceso judicial"
              icon={<UserPlus />}
              color="green"
            >
              {/* Validación de demandantes */}
              {errors.demandantes && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-semibold">{errors.demandantes}</p>
                </div>
              )}

              {/* Lista de demandantes agregados */}
              {formData.demandantes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">
                    Demandantes agregados ({formData.demandantes.length})
                  </Label>
                  {formData.demandantes.map((dem: any) => (
                    <Card key={dem.id} className="p-3 bg-white border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-bold text-sm text-gray-900">{dem.nombre}</p>
                            <p className="text-xs text-gray-600">
                              {dem.tipoPersona === 'natural' ? 'Persona Natural' : 'Persona Jurídica'} 
                              {' • '}{dem.identificacion}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarDemandante(dem.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Formulario para agregar nuevo demandante */}
              <Card className="p-4 bg-green-50 border-green-200">
                <Label className="text-sm font-bold text-gray-900 mb-3 block">
                  Agregar nuevo demandante
                </Label>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Tipo de Persona
                    </Label>
                    <Select
                      value={nuevoDemandante.tipoPersona}
                      onValueChange={(val: 'natural' | 'juridica') => 
                        setNuevoDemandante({ ...nuevoDemandante, tipoPersona: val })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">👤 Persona Natural</SelectItem>
                        <SelectItem value="juridica">🏢 Persona Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Nombre completo *
                    </Label>
                    <Input
                      value={nuevoDemandante.nombre}
                      onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, nombre: e.target.value })}
                      placeholder="Ej: María Rodríguez Pérez"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Identificación (CC/NIT) *
                    </Label>
                    <Input
                      value={nuevoDemandante.identificacion}
                      onChange={(e) => setNuevoDemandante({ ...nuevoDemandante, identificacion: e.target.value })}
                      placeholder="Ej: 1234567890"
                      className="text-sm"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAgregarDemandante}
                    className="w-full"
                    style={{ background: '#10B981' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Demandante
                  </Button>
                </div>
              </Card>
            </FormSection>

            {/* ✅ SECCIÓN 3: DEMANDADOS (Opcional) */}
            <FormSection
              title="Parte Demandada"
              description="Agregue los demandados (opcional si ESAP es demandado)"
              icon={<Users />}
              color="orange"
            >
              {formData.demandados.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-gray-700">
                    Demandados agregados ({formData.demandados.length})
                  </Label>
                  {formData.demandados.map((dem: any) => (
                    <Card key={dem.id} className="p-3 bg-white border-orange-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-orange-600" />
                          <div>
                            <p className="font-bold text-sm text-gray-900">{dem.nombre}</p>
                            <p className="text-xs text-gray-600">
                              {dem.tipoPersona === 'natural' ? 'Persona Natural' : 'Persona Jurídica'}
                              {' • '}{dem.identificacion}
                              {dem.cargo && ` • ${dem.cargo}`}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarDemandado(dem.id)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="p-4 bg-orange-50 border-orange-200">
                <Label className="text-sm font-bold text-gray-900 mb-3 block">
                  Agregar nuevo demandado (opcional)
                </Label>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Tipo de Persona
                    </Label>
                    <Select
                      value={nuevoDemandado.tipoPersona}
                      onValueChange={(val: 'natural' | 'juridica') => 
                        setNuevoDemandado({ ...nuevoDemandado, tipoPersona: val })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="natural">👤 Persona Natural</SelectItem>
                        <SelectItem value="juridica">🏢 Persona Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                        Nombre completo
                      </Label>
                      <Input
                        value={nuevoDemandado.nombre}
                        onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, nombre: e.target.value })}
                        placeholder="Ej: Ministerio de Educación"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                        Identificación (CC/NIT)
                      </Label>
                      <Input
                        value={nuevoDemandado.identificacion}
                        onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, identificacion: e.target.value })}
                        placeholder="Ej: 8999999990"
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Cargo (opcional)
                    </Label>
                    <Input
                      value={nuevoDemandado.cargo}
                      onChange={(e) => setNuevoDemandado({ ...nuevoDemandado, cargo: e.target.value })}
                      placeholder="Ej: Ministro de Educación"
                      className="text-sm"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleAgregarDemandado}
                    variant="outline"
                    className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Demandado
                  </Button>
                </div>
              </Card>
            </FormSection>

            {/* ✅ SECCIÓN 4: UBICACIÓN Y JUZGADO */}
            <FormSection
              title="Despacho Judicial y Ubicación"
              description="Información del juzgado notificador"
              icon={<Building2 />}
              color="purple"
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
                  placeholder="Ej: Cundinamarca"
                  helpText="Opcional"
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 5: FECHAS Y PLAZOS */}
            <FormSection
              title="Fechas y Términos Procesales"
              description="Fechas críticas para el seguimiento del proceso"
              icon={<Calendar />}
              color="red"
            >
              {/* ✅ SELECTOR DE TIPO DE DÍAS - NUEVO */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-sm font-bold text-gray-900 mb-2 block">
                        Tipo de cómputo de días *
                      </Label>
                      <Select
                        value={formData.tipoDias}
                        onValueChange={(val: 'habiles' | 'calendario') => {
                          updateField('tipoDias', val);
                          toast.success(
                            val === 'habiles' 
                              ? '📅 Días hábiles seleccionados (predeterminado)' 
                              : '📆 Días calendario seleccionados',
                            {
                              description: val === 'habiles'
                                ? 'Lunes a viernes, excluye fines de semana y festivos'
                                : 'Todos los días del año, incluye fines de semana'
                            }
                          );
                        }}
                      >
                        <SelectTrigger className="text-sm bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="habiles">
                            📅 Días Hábiles (predeterminado)
                          </SelectItem>
                          <SelectItem value="calendario">
                            📆 Días Calendario
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className={`p-3 rounded-lg border-2 ${
                      formData.tipoDias === 'habiles' 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'bg-green-100 border-green-300'
                    }`}>
                      {formData.tipoDias === 'habiles' ? (
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-900">
                            <p className="font-bold mb-1">⚖️ Días Hábiles (seleccionado)</p>
                            <p>Se contarán únicamente los días de lunes a viernes, excluyendo fines de semana y días festivos según el calendario judicial colombiano. Este es el estándar según la normativa procesal.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-green-700 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-green-900">
                            <p className="font-bold mb-1">📆 Días Calendario (seleccionado)</p>
                            <p>Se contarán todos los días del año de manera continua, incluyendo sábados, domingos y días festivos. Los plazos corren sin interrupción.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

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
                  placeholder="08:00"
                  helpText="Formato 24 horas (HH:MM)"
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FormField
                    name="fechaVencimiento"
                    label="Fecha de Vencimiento"
                    type="date"
                    readOnly
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
                      className="text-xs w-full"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Auto-calcular (10 días {formData.tipoDias === 'habiles' ? 'hábiles' : 'calendario'})
                    </Button>
                  )}
                </div>

                <FormField
                  name="horaVencimiento"
                  label="Hora de Vencimiento"
                  type="text"
                  value={formData.horaVencimiento}
                  onChange={(val) => updateField('horaVencimiento', val)}
                  placeholder="17:00"
                  helpText="Formato 24 horas (HH:MM)"
                  icon={<Clock className="w-4 h-4" />}
                />
              </div>
            </FormSection>

            {/* ✅ SECCIÓN 6: ASIGNACIÓN */}
            <FormSection
              title="Asignación de Responsable"
              description="Abogado encargado del proceso"
              icon={<User />}
              color="blue"
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
                tooltip="Profesional que asumirá la representación de ESAP"
              />
            </FormSection>

            {/* ✅ SECCIÓN 7: CONTENIDO DE LA DEMANDA */}
            <FormSection
              title="Contenido de la Demanda"
              description="Pretensiones, hechos y observaciones"
              icon={<FileText />}
              color="green"
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
