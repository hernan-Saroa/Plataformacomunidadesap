/**
 * ModalNuevaDemanda - Formulario para registrar nuevas demandas judiciales
 * ✅ Diseño corporativo ESAP 2025 premium con ModalSIGLPremium
 * ✅ Validación completa y UX mejorada
 * ✅ Botones SIEMPRE visibles en el footer
 * ✅ MÚLTIPLES DEMANDANTES con UI mejorada
 * ✅ MODAL 30% MÁS ANCHO para mejor visualización
 */

import { useState, useEffect } from 'react';
import { Scale, Users, User, Calendar, FileText, Building2, AlertCircle, Save, Upload, Loader2, MapPin, DollarSign, Gavel, Plus, X, UserPlus, Phone, Mail, Briefcase } from 'lucide-react';
import { Card } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { ModalSIGLPremium } from '../design-system/ModalSIGLPremium';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '../../../ui/button';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { terminosDefensaJudicial } from '../config/terminosLegales';

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
  otrosActores: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    rol: string;
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
  fechaVencimiento: string;
  abogadoAsignado: string;
  etapa: string;
  pretensiones: string;
  hechos: string;
  observaciones: string;
  // Campos para cálculo de términos
  terminoProcesalDias?: number;
  tipoConteoTermino?: 'HABILES' | 'CALENDARIO';
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

// ✅ LISTAS ESTÁTICAS PARA ASEGURAR CARGA INMEDIATA (FALLBACK)
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

const ETAPAS_PROCESO = [
  { id: 'NOTIFICADA', nombre: 'Notificada' },
  { id: 'CONTESTACIÓN', nombre: 'Contestación' },
  { id: 'PROBATORIA', nombre: 'Probatoria' },
  { id: 'ALEGATOS', nombre: 'Alegatos' },
  { id: 'SENTENCIA', nombre: 'Sentencia' },
  { id: 'APELACIÓN', nombre: 'Apelación' }
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
  // ✅ Contexto desactivado temporalmente por error de carga
  // const { estadosActivos, tiposProcesosActivos: tiposProcesosConfiguracion } = useConfiguracionModulo();

  const [formData, setFormData] = useState<NuevaDemandaData>({
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
    fechaVencimiento: '',
    abogadoAsignado: '',
    etapa: ETAPAS_PROCESO[0].id,
    pretensiones: '',
    hechos: '',
    observaciones: ''
  });

  // Estado para tipo de conteo de términos
  const [tipoConteo, setTipoConteo] = useState<'HABILES' | 'CALENDARIO'>('HABILES');
  const [terminoDias, setTerminoDias] = useState<string>('');

  // Función para calcular fecha de vencimiento
  const calculateDeadline = (dias: number, tipo: 'HABILES' | 'CALENDARIO', fechaInicio: Date = new Date()): Date => {
    let fecha = new Date(fechaInicio); // Fecha base (default now)

    // Regla de Negocio: Si es días hábiles y se crea fuera de horario judicial (8am-5pm)
    // se debe mover al siguiente día hábil a las 8:00 AM.
    if (tipo === 'HABILES') {
      const hora = fecha.getHours();
      const diaSemana = fecha.getDay(); // 0=Dom, 6=Sab

      let fueraDeHorario = false;

      // Fin de semana
      if (diaSemana === 0 || diaSemana === 6) {
        fueraDeHorario = true;
      }
      // Entre semana pero fuera de 8am - 5pm
      else if (hora < 8 || hora >= 17) {
        fueraDeHorario = true;
      }

      if (fueraDeHorario) {
        // Mover al siguiente día hábil a las 8:00 AM

        // Si es tarde (>=17) o fin de semana -> avanzar 1 día y chequear
        // Si es temprano (<8) -> mismo día 8am (si es habil)

        if (hora >= 17 || diaSemana === 6 || diaSemana === 0) {
          fecha.setDate(fecha.getDate() + 1);
          fecha.setHours(8, 0, 0, 0);
        } else if (hora < 8 && diaSemana !== 0 && diaSemana !== 6) {
          fecha.setHours(8, 0, 0, 0);
        }

        // Asegurarse que no caiga en finde después de mover
        while (fecha.getDay() === 0 || fecha.getDay() === 6) {
          fecha.setDate(fecha.getDate() + 1);
          fecha.setHours(8, 0, 0, 0);
        }
      }
    }

    // Sumar días
    if (tipo === 'CALENDARIO') {
      // Calendario: suma los días completos después de la fecha de notificación
      // Feb 4 + 2 días = Feb 6 a la misma hora
      fecha.setDate(fecha.getDate() + dias);
    } else {
      // Días hábiles: El día de inicio (ya ajustado a 8am) es Día 1
      // Necesitamos avanzar (dias - 1) días hábiles adicionales
      let diasAgregados = 0;
      while (diasAgregados < (dias - 1)) {
        fecha.setDate(fecha.getDate() + 1);
        // Si no es sábado(6) ni domingo(0), cuenta
        // TODO: Agregar festivos colombianos
        if (fecha.getDay() !== 0 && fecha.getDay() !== 6) {
          diasAgregados++;
        }
      }
      // El vencimiento en días hábiles SIEMPRE es a las 5:00 PM (Cierre Despacho)
      fecha.setHours(17, 0, 0, 0);
    }

    return fecha;
  };

  // Efecto para recalcular vencimiento cuando cambia tipo, dias o fechaNotificacion (si se usa fecha notificacion como base opcional, pero user pidió "desde que se crea")
  // User dijo: "cuando es dias habiles si por ejemplo una demanda se crea... hoy a las 6 pm... el tiempo corre desde que se crea"
  // Pero ojo, "Datos del Proceso Judicial" tiene "Fecha Vencimiento Término". 
  // Usualmente este término corre a partir de la notificación o admisión.
  // EL USER DIJO: "si una solicitud se registra a las 3:00 p. m., el vencimiento deberá generarse a las 3:00 p. m. del día correspondiente"
  // Esto implica que la base es el momento de CREACIÓN para este cálculo automatico.
  useEffect(() => {
    // Si NO hay fecha de notificación, limpiar vencimiento inmediatamente
    if (!formData.fechaNotificacion) {
      if (formData.fechaVencimiento) {
        setFormData(prev => ({ ...prev, fechaVencimiento: '' }));
      }
      return;
    }

    // Si hay fecha y días configurados, calcular
    if (terminoDias && !isNaN(Number(terminoDias))) {
      const dias = parseInt(terminoDias);
      const fechaBase = new Date(formData.fechaNotificacion);

      // Validar fecha base válida
      if (!isNaN(fechaBase.getTime())) {
        const nuevaFecha = calculateDeadline(dias, tipoConteo, fechaBase);
        setFormData(prev => ({
          ...prev,
          fechaVencimiento: nuevaFecha.toISOString()
        }));
      }
    }
  }, [tipoConteo, terminoDias, formData.fechaNotificacion]);

  // Estado para el demandante temporal que se está agregando
  const [nuevoDemandante, setNuevoDemandante] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: '',
    telefono: '',
    email: '',
    direccion: '',
    apoderado: ''
  });

  // Estado para el demandado temporal que se está agregando
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

  // ✅ Obtener tipos de procesos y medios de control desde configuración centralizada
  const { tiposProcesosActivos, mediosControlActivos } = useConfiguracionModulo('defensa-judicial');

  // ✅ Auto-calcular fecha de vencimiento cuando cambia tipoProceso o fechaNotificacion
  // [REEMPLAZADO] Esta lógica se unificó en handleInputChange + useEffect de terminoDias
  /*
  useEffect(() => {
    if (formData.tipoProceso && formData.fechaNotificacion) {
      const tipoSeleccionado = tiposProcesosActivos.find((t: any) => t.nombre === formData.tipoProceso);
      if (tipoSeleccionado && tipoSeleccionado.plazo) {
        ...
      }
    }
  }, [formData.tipoProceso, formData.fechaNotificacion, tiposProcesosActivos]);
  */

  // Cargar abogados desde la API y resetear formulario al abrir
  useEffect(() => {
    if (isOpen) {
      loadAbogados();
      // Resetear el formulario al abrir
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
        fechaVencimiento: '',
        abogadoAsignado: '',
        etapa: 'NOTIFICADA',
        pretensiones: '',
        hechos: '',
        observaciones: ''
      });
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

    // Si cambia el tipo de proceso, buscar configuración de término
    if (field === 'tipoProceso') {
      const upperVal = String(value).toUpperCase();
      let termKey = '';

      // 1. Mapeo inteligente (Case Insensitive)
      if (upperVal.includes('NULIDAD') && upperVal.includes('RESTABLECIMIENTO')) termKey = 'Contestación NRD';
      else if (upperVal.includes('TUTELA')) termKey = 'Contestación de Tutela';
      else if (upperVal.includes('REPARACIÓN DIRECTA') || upperVal.includes('REPARACION DIRECTA')) termKey = 'Contestación Reparación Directa';
      else if (upperVal.includes('CONTROVERSIAS')) termKey = 'Contestación Controversias';
      else if (upperVal.includes('ACCIÓN DE GRUPO') || upperVal.includes('ACCION DE GRUPO')) termKey = 'Contestación Acción de Grupo';
      else if (upperVal.includes('ACCIÓN POPULAR') || upperVal.includes('ACCION POPULAR')) termKey = 'Contestación Acción Popular';
      else if (upperVal.includes('EJECUTIVO')) termKey = 'Contestación Proceso Ejecutivo';

      // 2. Buscar primero en la configuración del módulo (si tiene plazo definido)
      const tipoDelModulo = tiposProcesosActivos.find((t: any) => t.nombre === value);

      if (tipoDelModulo && tipoDelModulo.plazo) {
        setTipoConteo((tipoDelModulo as any).tipoDias || 'HABILES');
        setTerminoDias(tipoDelModulo.plazo.toString());
      }
      // 3. Fallback a terminosLegales.ts
      else {
        const config = terminosDefensaJudicial.find(t => t.tipo.includes(termKey) || (termKey && t.tipo === termKey));
        if (config) {
          setTipoConteo(config.tipoDias);
          setTerminoDias(config.diasPlazo.toString());
        } else {
          // Si no encuentra nada, dejar como estaba o resetear? Mejor resetear para evitar datos basura
          // setTipoConteo('HABILES');
          // setTerminoDias('15'); // Default generico
        }
      }
    }

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

    setFormData(prev => ({
      ...prev,
      demandantes: [...prev.demandantes, demandante]
    }));

    // Limpiar formulario de nuevo demandante
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

  // Eliminar demandante de la lista
  const handleEliminarDemandante = (id: string) => {
    setFormData(prev => ({
      ...prev,
      demandantes: prev.demandantes.filter(d => d.id !== id)
    }));

    toast.info('🗑️ Demandante eliminado', {
      description: 'El demandante ha sido removido de la lista'
    });
  };

  // Agregar demandado a la lista
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

    setFormData(prev => ({
      ...prev,
      demandados: [...prev.demandados, demandado]
    }));

    // Limpiar formulario de nuevo demandado
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

  // Eliminar demandado de la lista
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Por favor complete todos los campos obligatorios marcados con *'
      });
      return;
    }

    // Verificar si ya existe una demanda con este número de radicado
    try {
      setIsSubmitting(true);
      const expedientesExistentes = await legalService.getExpedientes();
      const yaExiste = expedientesExistentes.some(
        (exp: any) => exp.numeroRadicado === formData.numeroRadicado || exp.radicado === formData.numeroRadicado
      );

      if (yaExiste) {
        toast.error('⚠️ Número de radicado duplicado', {
          description: `Ya existe una demanda con el radicado ${formData.numeroRadicado}. Verifique el número e intente nuevamente.`,
          duration: 5000
        });
        setErrors(prev => ({ ...prev, numeroRadicado: 'Este número de radicado ya existe en el sistema' }));
        setIsSubmitting(false);
        return; // NO resetear el formulario, mantener los datos
      }
    } catch (error) {
      console.error('Error verificando radicado:', error);
      // Si falla la verificación, permitir continuar pero con advertencia
      toast.warning('⚠️ No se pudo verificar duplicados', {
        description: 'La demanda se creará, pero no se pudo verificar si el radicado ya existe.'
      });
    }
    // Incluir los datos de términos en el formData antes de guardar
    const formDataConTerminos = {
      ...formData,
      terminoProcesalDias: terminoDias ? parseInt(terminoDias) : undefined,
      tipoConteoTermino: tipoConteo
    };

    onSave(formDataConTerminos);

    toast.success('✅ Demanda registrada exitosamente', {
      description: `Radicado: ${formData.numeroRadicado}`,
      duration: 4000
    });

    // Solo resetear formulario si la creación fue exitosa
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
      fechaVencimiento: '',
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
    setIsSubmitting(false);

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* ✅ ANCHO AUMENTADO EN 30%: de max-w-2xl (672px) a max-w-4xl (896px) = ~33% más ancho */}
      <DialogContent
        hideCloseButton
        className="w-[95vw] max-w-[1000px] lg:max-w-5xl xl:max-w-6xl !max-h-[82vh] flex flex-col p-0 gap-0"
      >
        {/* Títulos ocultos para accesibilidad */}
        <DialogTitle className="sr-only">Nueva Demanda Judicial</DialogTitle>
        <DialogDescription className="sr-only">
          Formulario de registro de nueva demanda judicial contra ESAP
        </DialogDescription>

        {/* Header - flex-shrink-0 (siempre visible) */}
        <ModalHeaderClean
          icono={Scale}
          colorIcono="blue"
          titulo="Nueva Demanda Judicial"
          subtitulo="Registro de demanda contra ESAP"
          badgePrincipal="Formulario de Registro"
          onClose={onClose}
        />

        {/* Contenido - flex-1 overflow-y-auto (solo esto hace scroll) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sección 1: Datos del Proceso */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border-l-4 border-l-blue-600">
              <h3 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                DATOS DEL PROCESO JUDICIAL
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Número de Radicado */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Número de Radicado <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.numeroRadicado}
                    onChange={(e) => handleInputChange('numeroRadicado', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.numeroRadicado
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    placeholder="Ej: 25000233300120240000100"
                  />
                  {errors.numeroRadicado && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.numeroRadicado}
                    </p>
                  )}
                </div>

                {/* Medio de Control */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Medio de Control <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.medioControl}
                    onChange={(e) => handleInputChange('medioControl', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.medioControl
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  >
                    <option value="">Seleccione...</option>
                    {mediosControlActivos.map((medio: any) => (
                      <option key={medio.id} value={medio.nombre}>{medio.nombre}</option>
                    ))}
                  </select>
                  {errors.medioControl && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.medioControl}
                    </p>
                  )}
                </div>

                {/* Tipo de Proceso Judicial */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Tipo de Proceso Judicial
                  </label>
                  <select
                    value={formData.tipoProceso}
                    onChange={(e) => handleInputChange('tipoProceso', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.tipoProceso
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  >
                    <option value="">Seleccione un tipo de proceso...</option>
                    {TIPOS_PROCESOS_JUDICIALES.map((tipo: any) => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                  {errors.tipoProceso && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.tipoProceso}
                    </p>
                  )}
                  {formData.tipoProceso && (
                    <p className="text-xs text-gray-600 mt-1.5 italic bg-blue-50 px-2 py-1.5 rounded">
                      ℹ️ {TIPOS_PROCESOS_JUDICIALES.find((t: any) => t.nombre === formData.tipoProceso)?.descripcion}
                    </p>
                  )}
                </div>

                {/* Etapa */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Etapa Procesal
                  </label>
                  <select
                    value={formData.etapa}
                    onChange={(e) => handleInputChange('etapa', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ETAPAS_PROCESO.map(estado => (
                      <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Cuantía */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cuantía (COP)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.cuantia}
                      onChange={(e) => handleInputChange('cuantia', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 50000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Datos de Demandantes - ✅ NUEVO DISEÑO MEJORADO */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border-l-4 border-l-orange-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-orange-900 flex items-center gap-2">
                  <User className="w-5 h-5 text-orange-600" />
                  DATOS DEL DEMANDANTE(S)
                </h3>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                  {formData.demandantes.length} agregado(s)
                </span>
              </div>
              {/* ✅ FORMULARIO PARA AGREGAR DEMANDANTE */}
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-orange-300 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-orange-600" />
                  <h4 className="text-xs font-bold text-gray-700">Agregar Nuevo Demandante</h4>
                </div>

                <div className="space-y-3">
                  {/* Primera fila: Tipo de Persona */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Persona
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nuevoTipoPersona"
                          value="natural"
                          checked={nuevoDemandante.tipoPersona === 'natural'}
                          onChange={(e) => setNuevoDemandante(prev => ({ ...prev, tipoPersona: 'natural' }))}
                          className="w-3 h-3"
                          style={{ accentColor: '#2962FF' }}
                        />
                        <span className="text-xs text-gray-700">Natural</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nuevoTipoPersona"
                          value="juridica"
                          checked={nuevoDemandante.tipoPersona === 'juridica'}
                          onChange={(e) => setNuevoDemandante(prev => ({ ...prev, tipoPersona: 'juridica' }))}
                          className="w-3 h-3"
                          style={{ accentColor: '#2962FF' }}
                        />
                        <span className="text-xs text-gray-700">Jurídica</span>
                      </label>
                    </div>
                  </div>

                  {/* Segunda fila: Identificación, Nombre y Botón - ALINEADOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Identificación */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {nuevoDemandante.tipoPersona === 'natural' ? 'Cédula' : 'NIT'}
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandante.identificacion}
                        onChange={(e) => {
                          const val = e.target.value;
                          const filtered = nuevoDemandante.tipoPersona === 'natural' ? onlyNumbers(val) : onlyNit(val);
                          setNuevoDemandante(prev => ({ ...prev, identificacion: filtered }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder={nuevoDemandante.tipoPersona === 'natural' ? 'Ej: 1234567890' : 'Ej: 900123456-1'}
                      />
                    </div>

                    {/* Nombre Completo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Nombre Completo / Razón Social
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandante.nombre}
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, nombre: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Nombre completo del demandante"
                      />
                    </div>
                  </div>

                  {/* Fila: Datos de Contacto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Teléfono */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono</label>
                      <input
                        type="text"
                        value={nuevoDemandante.telefono || ''}
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, telefono: phoneFormat(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Ej: 3001234567"
                      />
                    </div>
                    {/* Correo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        value={nuevoDemandante.email || ''}
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    {/* Dirección */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Dirección</label>
                      <input
                        type="text"
                        value={nuevoDemandante.direccion || ''}
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, direccion: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Dirección física"
                      />
                    </div>
                    {/* Apoderado */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Apoderado</label>
                      <input
                        type="text"
                        value={nuevoDemandante.apoderado || ''}
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, apoderado: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Nombre del apoderado"
                      />
                    </div>
                  </div>

                  {/* Botón Agregar */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={handleAgregarDemandante}
                      className="w-full md:w-auto text-white text-xs font-bold px-6"
                      style={{ background: '#F57C00' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Demandante
                    </Button>
                  </div>
                </div>
              </div>

              {/* ✅ LISTA DE DEMANDANTES AGREGADOS */}
              {errors.demandantes && (
                <p className="text-xs text-red-600 mb-2 flex items-center gap-1 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {errors.demandantes}
                </p>
              )}

              {formData.demandantes.length > 0 ? (
                <div className="space-y-2">
                  {formData.demandantes.map((demandante, index) => (
                    <div
                      key={demandante.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-orange-700">#{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{demandante.nombre}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-full uppercase">
                              {demandante.tipoPersona}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {demandante.tipoPersona === 'natural' ? 'CC' : 'NIT'}: {demandante.identificacion}
                          </p>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
                            {demandante.telefono && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-orange-400" /> {demandante.telefono}</p>}
                            {demandante.email && <p className="flex items-center gap-1.5 truncate" title={demandante.email}><Mail className="w-3 h-3 text-orange-400" /> {demandante.email}</p>}
                            {demandante.direccion && <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><MapPin className="w-3 h-3 text-orange-400" /> {demandante.direccion}</p>}
                            {demandante.apoderado && <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><Briefcase className="w-3 h-3 text-orange-400" /> Apoderado: {demandante.apoderado}</p>}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarDemandante(demandante.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">
                    No hay demandantes agregados. Use el formulario arriba para agregar.
                  </p>
                </div>
              )}
            </div>

            {/* Sección 3: Datos de Demandados - ✅ SECCIÓN AGREGADA PARA ESAP */}
            <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-lg border-l-4 border-l-red-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  DATOS DEL DEMANDADO(S)
                </h3>
                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                  {formData.demandados.length} agregado(s)
                </span>
              </div>

              {/* ✅ FORMULARIO PARA AGREGAR DEMANDADO */}
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-red-300 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-red-600" />
                  <h4 className="text-xs font-bold text-gray-700">Agregar Nuevo Demandado</h4>
                </div>

                <div className="space-y-3">
                  {/* Primera fila: Tipo de Persona */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Persona
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nuevoTipoPersonaDemandado"
                          value="natural"
                          checked={nuevoDemandado.tipoPersona === 'natural'}
                          onChange={(e) => setNuevoDemandado(prev => ({ ...prev, tipoPersona: 'natural' }))}
                          className="w-3 h-3"
                          style={{ accentColor: '#DC2626' }}
                        />
                        <span className="text-xs text-gray-700">Natural</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nuevoTipoPersonaDemandado"
                          value="juridica"
                          checked={nuevoDemandado.tipoPersona === 'juridica'}
                          onChange={(e) => setNuevoDemandado(prev => ({ ...prev, tipoPersona: 'juridica' }))}
                          className="w-3 h-3"
                          style={{ accentColor: '#DC2626' }}
                        />
                        <span className="text-xs text-gray-700">Jurídica</span>
                      </label>
                    </div>
                  </div>

                  {/* Segunda fila: Identificación, Nombre, Cargo y Botón */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Identificación */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {nuevoDemandado.tipoPersona === 'natural' ? 'Cédula' : 'NIT'}
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandado.identificacion}
                        onChange={(e) => {
                          const val = e.target.value;
                          const filtered = nuevoDemandado.tipoPersona === 'natural' ? onlyNumbers(val) : onlyNit(val);
                          setNuevoDemandado(prev => ({ ...prev, identificacion: filtered }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder={nuevoDemandado.tipoPersona === 'natural' ? 'Ej: 1234567890' : 'Ej: 900123456-1'}
                      />
                    </div>

                    {/* Nombre Completo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Nombre Completo / Razón Social
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandado.nombre}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, nombre: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Nombre completo del demandado"
                      />
                    </div>

                    {/* Cargo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Cargo / Función (Opcional)
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandado.cargo}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, cargo: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Ej: Rector, Director, etc."
                      />
                    </div>
                  </div>

                  {/* Fila: Datos de Contacto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Teléfono */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono</label>
                      <input
                        type="text"
                        value={nuevoDemandado.telefono || ''}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, telefono: phoneFormat(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Ej: 3001234567"
                      />
                    </div>
                    {/* Correo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        value={nuevoDemandado.email || ''}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    {/* Dirección */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Dirección</label>
                      <input
                        type="text"
                        value={nuevoDemandado.direccion || ''}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, direccion: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Dirección física"
                      />
                    </div>
                    {/* Apoderado */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Apoderado</label>
                      <input
                        type="text"
                        value={nuevoDemandado.apoderado || ''}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, apoderado: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Nombre del apoderado"
                      />
                    </div>
                  </div>

                  {/* Botón Agregar */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={handleAgregarDemandado}
                      className="w-full md:w-auto text-white text-xs font-bold px-6"
                      style={{ background: '#DC2626' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Demandado
                    </Button>
                  </div>
                </div>
              </div>

              {/* ✅ LISTA DE DEMANDADOS AGREGADOS */}
              {formData.demandados.length > 0 ? (
                <div className="space-y-2">
                  {formData.demandados.map((demandado, index) => (
                    <div
                      key={demandado.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-red-700">#{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{demandado.nombre}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-full uppercase">
                              {demandado.tipoPersona}
                            </span>
                            {demandado.cargo && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">
                                {demandado.cargo}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {demandado.tipoPersona === 'natural' ? 'CC' : 'NIT'}: {demandado.identificacion}
                          </p>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
                            {demandado.telefono && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-red-400" /> {demandado.telefono}</p>}
                            {demandado.email && <p className="flex items-center gap-1.5 truncate" title={demandado.email}><Mail className="w-3 h-3 text-red-400" /> {demandado.email}</p>}
                            {demandado.direccion && <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><MapPin className="w-3 h-3 text-red-400" /> {demandado.direccion}</p>}
                            {demandado.apoderado && <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><Briefcase className="w-3 h-3 text-red-400" /> Apoderado: {demandado.apoderado}</p>}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarDemandado(demandado.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">
                    No hay demandados agregados. Use el formulario arriba para agregar.
                  </p>
                </div>
              )}
            </div>

            {/* Sección 4: Datos de Otros Actores - ✅ SECCIÓN AGREGADA PARA ESAP */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border-l-4 border-l-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  DATOS DE OTROS ACTORES
                </h3>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-bold rounded-full">
                  {formData.otrosActores.length} agregado(s)
                </span>
              </div>

              {/* ✅ FORMULARIO PARA AGREGAR OTRO ACTOR */}
              <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-gray-600" />
                  <h4 className="text-xs font-bold text-gray-700">Agregar Nuevo Otro Actor</h4>
                </div>

                <div className="space-y-3">
                  {/* Primera fila: Tipo de Persona */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Persona
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nuevoTipoPersonaOtroActor"
                          value="natural"
                          checked={nuevoOtroActor.tipoPersona === 'natural'}
                          onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, tipoPersona: 'natural' }))}
                          className="w-3 h-3"
                          style={{ accentColor: '#2962FF' }}
                        />
                        <span className="text-xs text-gray-700">Natural</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="nuevoTipoPersonaOtroActor"
                          value="juridica"
                          checked={nuevoOtroActor.tipoPersona === 'juridica'}
                          onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, tipoPersona: 'juridica' }))}
                          className="w-3 h-3"
                          style={{ accentColor: '#2962FF' }}
                        />
                        <span className="text-xs text-gray-700">Jurídica</span>
                      </label>
                    </div>
                  </div>

                  {/* Segunda fila: Identificación, Nombre, Rol y Botón */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Identificación */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {nuevoOtroActor.tipoPersona === 'natural' ? 'Cédula' : 'NIT'}
                      </label>
                      <input
                        type="text"
                        value={nuevoOtroActor.identificacion}
                        onChange={(e) => {
                          const val = e.target.value;
                          const filtered = nuevoOtroActor.tipoPersona === 'natural' ? onlyNumbers(val) : onlyNit(val);
                          setNuevoOtroActor(prev => ({ ...prev, identificacion: filtered }));
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder={nuevoOtroActor.tipoPersona === 'natural' ? 'Ej: 1234567890' : 'Ej: 900123456-1'}
                      />
                    </div>

                    {/* Nombre Completo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Nombre Completo / Razón Social
                      </label>
                      <input
                        type="text"
                        value={nuevoOtroActor.nombre}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, nombre: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Nombre completo del otro actor"
                      />
                    </div>

                    {/* Rol */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Rol
                      </label>
                      <input
                        type="text"
                        value={nuevoOtroActor.rol}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, rol: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Ej: Tercero, Ministerio Público, etc."
                      />
                    </div>
                  </div>

                  {/* Fila: Datos de Contacto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Teléfono */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono</label>
                      <input
                        type="text"
                        value={nuevoOtroActor.telefono || ''}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, telefono: phoneFormat(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Ej: 3001234567"
                      />
                    </div>
                    {/* Correo */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Correo Electrónico</label>
                      <input
                        type="email"
                        value={nuevoOtroActor.email || ''}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    {/* Dirección */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Dirección</label>
                      <input
                        type="text"
                        value={nuevoOtroActor.direccion || ''}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, direccion: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Dirección física"
                      />
                    </div>
                    {/* Apoderado */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Apoderado</label>
                      <input
                        type="text"
                        value={nuevoOtroActor.apoderado || ''}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, apoderado: onlyLetters(e.target.value) }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Nombre del apoderado"
                      />
                    </div>
                  </div>

                  {/* Botón Agregar */}
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={handleAgregarOtroActor}
                      className="w-full md:w-auto text-white text-xs font-bold px-6"
                      style={{ background: '#2962FF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Otro Actor
                    </Button>
                  </div>
                </div>
              </div>

              {/* ✅ LISTA DE OTROS ACTORES AGREGADOS */}
              {formData.otrosActores.length > 0 ? (
                <div className="space-y-2">
                  {formData.otrosActores.map((otroActor, index) => (
                    <div
                      key={otroActor.id}
                      className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700">#{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{otroActor.nombre}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-semibold rounded-full uppercase">
                              {otroActor.tipoPersona}
                            </span>
                            {otroActor.rol && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-full">
                                {otroActor.rol}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {otroActor.tipoPersona === 'natural' ? 'CC' : 'NIT'}: {otroActor.identificacion}
                          </p>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-md border border-gray-100">
                            {otroActor.telefono && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-blue-400" /> {otroActor.telefono}</p>}
                            {otroActor.email && <p className="flex items-center gap-1.5 truncate" title={otroActor.email}><Mail className="w-3 h-3 text-blue-400" /> {otroActor.email}</p>}
                            {otroActor.direccion && <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><MapPin className="w-3 h-3 text-blue-400" /> {otroActor.direccion}</p>}
                            {otroActor.apoderado && <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><Briefcase className="w-3 h-3 text-blue-400" /> Apoderado: {otroActor.apoderado}</p>}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEliminarOtroActor(otroActor.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 font-medium">
                    No hay otros actores agregados. Use el formulario arriba para agregar.
                  </p>
                </div>
              )}
            </div>

            {/* Sección 5: Juzgado y Ubicación */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border-l-4 border-l-purple-600">
              <h3 className="text-sm font-black text-purple-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                JUZGADO Y UBICACIÓN
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Juzgado */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Juzgado / Tribunal <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Gavel className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.juzgado}
                      onChange={(e) => handleInputChange('juzgado', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.juzgado
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="Ej: Juzgado 10 Administrativo del Circuito de Bogotá"
                    />
                  </div>
                  {errors.juzgado && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      {errors.juzgado}
                    </p>
                  )}
                </div>

                {/* Departamento */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Departamento
                  </label>
                  <select
                    value={formData.departamento}
                    onChange={(e) => handleInputChange('departamento', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="">Seleccione...</option>
                    {DEPARTAMENTOS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Ciudad */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Ciudad <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => handleInputChange('ciudad', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.ciudad
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder="Ej: Bogotá D.C."
                    />
                  </div>
                  {errors.ciudad && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      {errors.ciudad}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección 6: Fechas y Asignación */}
            <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border-l-4 border-l-green-600">
              <h3 className="text-sm font-bold text-green-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                FECHAS Y ASIGNACIÓN
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">

                {/* CONFIGURACIÓN DE PLAZOS */}
                <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-blue-800 mb-1">
                      Configuración de Términos
                    </label>
                    <p className="text-xs text-gray-600">
                      Automáticamente calcula el vencimiento según el horario judicial.
                    </p>
                  </div>

                  {/* Tipo de Conteo */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Tipo de Plazo
                    </label>
                    <select
                      value={tipoConteo}
                      onChange={(e) => setTipoConteo(e.target.value as 'HABILES' | 'CALENDARIO')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="HABILES">Días Hábiles</option>
                      <option value="CALENDARIO">Días Calendario</option>
                    </select>
                  </div>

                  {/* Días */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Término (Días)
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={terminoDias}
                      placeholder="Automático..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none bg-gray-100 text-gray-700 font-bold cursor-not-allowed"
                      title="Este valor se define automáticamente según el tipo de proceso seleccionado en la configuración."
                    />
                  </div>
                </div>

                {/* Fecha Notificación */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Fecha de Notificación <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.fechaNotificacion}
                    onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.fechaNotificacion
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  />
                  {errors.fechaNotificacion && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.fechaNotificacion}
                    </p>
                  )}
                </div>

                {/* Fecha Vencimiento (Calculada) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Fecha Vencimiento (Calculada)
                  </label>
                  <input
                    type="datetime-local"
                    readOnly
                    value={formData.fechaVencimiento ? (() => {
                      const date = new Date(formData.fechaVencimiento);
                      const offset = date.getTimezoneOffset();
                      const localDate = new Date(date.getTime() - (offset * 60000));
                      return localDate.toISOString().slice(0, 16);
                    })() : ''}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none bg-gray-100 text-gray-700 font-medium cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    {tipoConteo === 'HABILES' ? 'Considera horario 8am-5pm y excluye fines de semana.' : 'Suma días calendario exactos.'}
                  </p>
                </div>

                {/* Abogado Asignado */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Abogado Responsable <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.abogadoAsignado}
                    onChange={(e) => handleInputChange('abogadoAsignado', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.abogadoAsignado
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                      }`}
                  >
                    <option value="">Seleccione un abogado...</option>
                    {abogados.length > 0 ? (
                      abogados.map(abogado => (
                        <option key={abogado.id} value={abogado.id}>{abogado.nombreCompleto}</option>
                      ))
                    ) : (
                      <option disabled>Cargando abogados...</option>
                    )}
                  </select>
                  {errors.abogadoAsignado && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.abogadoAsignado}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección 7: Detalles del Proceso */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border-l-4 border-l-gray-600">
              <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                DETALLES DEL PROCESO
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Pretensiones <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.pretensiones}
                    onChange={(e) => handleInputChange('pretensiones', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${errors.pretensiones ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'
                      }`}
                    placeholder="Describa las pretensiones de la demanda..."
                  />
                  {errors.pretensiones && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      {errors.pretensiones}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Hechos</label>
                  <textarea
                    value={formData.hechos}
                    onChange={(e) => handleInputChange('hechos', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Resumen de los hechos de la demanda..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Observaciones Adicionales</label>
                  <textarea
                    value={formData.observaciones}
                    onChange={(e) => handleInputChange('observaciones', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Notas u observaciones relevantes..."
                  />
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer - flex-shrink-0 (siempre visible) */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Los campos marcados con <span className="text-red-600 font-bold">*</span> son obligatorios
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-white"
              style={{ background: isSubmitting ? '#9E9E9E' : '#2962FF' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
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