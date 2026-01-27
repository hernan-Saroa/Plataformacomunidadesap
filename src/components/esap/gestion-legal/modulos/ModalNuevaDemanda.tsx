/**
 * ModalNuevaDemanda - Formulario para registrar nuevas demandas judiciales
 * ✅ Diseño corporativo ESAP 2025 con ModalHeaderClean
 * ✅ Validación completa y UX mejorada
 * ✅ Botones SIEMPRE visibles en el footer
 * ✅ MÚLTIPLES DEMANDANTES con UI mejorada
 * ✅ MODAL 30% MÁS ANCHO para mejor visualización
 */

import { useState } from 'react';
import { Scale, User, Calendar, FileText, Building2, AlertCircle, Save, MapPin, DollarSign, Gavel, Plus, X, UserPlus, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { ModalHeaderClean } from './ModalHeaderClean';
import { Button } from '../../../ui/button';
import { toast } from 'sonner@2.0.3';

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
  }>;
  demandados: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    cargo?: string;
  }>;
  otrosActores: Array<{
    id: string;
    nombre: string;
    tipoPersona: 'natural' | 'juridica';
    identificacion: string;
    rol: string; // Tercero, Ministerio Público, etc.
  }>;
  cuantia: string;
  juzgado: string;
  ciudad: string;
  departamento: string;
  fechaNotificacion: string;
  fechaVencimiento: string;
  abogadoAsignado: string;
  etapa: 'NOTIFICADA' | 'CONTESTACIÓN' | 'PROBATORIA' | 'ALEGATOS';
  pretensiones: string;
  hechos: string;
  observaciones: string;
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

// Tipos de Procesos Judiciales (configurables desde Configuraciones SIGL)
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

export function ModalNuevaDemanda({ isOpen, onClose, onSave }: ModalNuevaDemandaProps) {
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
    etapa: 'NOTIFICADA',
    pretensiones: '',
    hechos: '',
    observaciones: ''
  });

  // Estado para el demandante temporal que se está agregando
  const [nuevoDemandante, setNuevoDemandante] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: ''
  });

  // Estado para el demandado temporal que se está agregando
  const [nuevoDemandado, setNuevoDemandado] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: '',
    cargo: ''
  });

  // Estado para el otro actor temporal que se está agregando
  const [nuevoOtroActor, setNuevoOtroActor] = useState({
    nombre: '',
    tipoPersona: 'natural' as 'natural' | 'juridica',
    identificacion: '',
    rol: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof NuevaDemandaData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Agregar demandante a la lista
  const handleAgregarDemandante = () => {
    if (!nuevoDemandante.nombre.trim()) {
      toast.error('⚠️ Nombre incompleto', {
        description: 'Ingrese el nombre completo del demandante'
      });
      return;
    }
    if (!nuevoDemandante.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', {
        description: 'Ingrese la identificación del demandante'
      });
      return;
    }

    const demandante = {
      id: `DEM-${Date.now()}`,
      nombre: nuevoDemandante.nombre,
      tipoPersona: nuevoDemandante.tipoPersona,
      identificacion: nuevoDemandante.identificacion
    };

    setFormData(prev => ({
      ...prev,
      demandantes: [...prev.demandantes, demandante]
    }));

    // Limpiar formulario de nuevo demandante
    setNuevoDemandante({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: ''
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
      toast.error('⚠️ Nombre incompleto', {
        description: 'Ingrese el nombre completo del demandado'
      });
      return;
    }
    if (!nuevoDemandado.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', {
        description: 'Ingrese la identificación del demandado'
      });
      return;
    }

    const demandado = {
      id: `DEMAN-${Date.now()}`,
      nombre: nuevoDemandado.nombre,
      tipoPersona: nuevoDemandado.tipoPersona,
      identificacion: nuevoDemandado.identificacion,
      cargo: nuevoDemandado.cargo
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
      cargo: ''
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
      toast.error('⚠️ Nombre incompleto', {
        description: 'Ingrese el nombre completo del otro actor'
      });
      return;
    }
    if (!nuevoOtroActor.identificacion.trim()) {
      toast.error('⚠️ Identificación incompleta', {
        description: 'Ingrese la identificación del otro actor'
      });
      return;
    }

    const otroActor = {
      id: `OTRO-${Date.now()}`,
      nombre: nuevoOtroActor.nombre,
      tipoPersona: nuevoOtroActor.tipoPersona,
      identificacion: nuevoOtroActor.identificacion,
      rol: nuevoOtroActor.rol
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
      rol: ''
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

    if (!formData.numeroRadicado.trim()) {
      newErrors.numeroRadicado = 'El número de radicado es obligatorio';
    }
    if (!formData.medioControl) {
      newErrors.medioControl = 'Seleccione el medio de control';
    }
    if (formData.demandantes.length === 0) {
      newErrors.demandantes = 'Debe agregar al menos un demandante';
    }
    if (!formData.juzgado.trim()) {
      newErrors.juzgado = 'El juzgado es obligatorio';
    }
    if (!formData.ciudad.trim()) {
      newErrors.ciudad = 'La ciudad es obligatoria';
    }
    if (!formData.fechaNotificacion) {
      newErrors.fechaNotificacion = 'La fecha de notificación es obligatoria';
    }
    if (!formData.abogadoAsignado) {
      newErrors.abogadoAsignado = 'Debe asignar un abogado responsable';
    }
    if (!formData.pretensiones.trim()) {
      newErrors.pretensiones = 'Las pretensiones son obligatorias';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('⚠️ Formulario incompleto', {
        description: 'Por favor complete todos los campos obligatorios marcados con *'
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
      identificacion: ''
    });
    setNuevoDemandado({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      cargo: ''
    });
    setNuevoOtroActor({
      nombre: '',
      tipoPersona: 'natural',
      identificacion: '',
      rol: ''
    });
    setErrors({});
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* ✅ ANCHO AUMENTADO EN 30%: de max-w-2xl (672px) a max-w-4xl (896px) = ~33% más ancho */}
      <DialogContent 
        hideCloseButton 
        className="w-[95vw] max-w-[850px] lg:max-w-3xl xl:max-w-4xl h-[90vh] flex flex-col p-0 gap-0"
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
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.numeroRadicado 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Ej: 25000-23-33-001-2024-00001-00"
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
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.medioControl 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Seleccione...</option>
                    {MEDIOS_CONTROL.map(medio => (
                      <option key={medio} value={medio}>{medio}</option>
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione un tipo de proceso...</option>
                    {TIPOS_PROCESOS_JUDICIALES.map(tipo => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                  {formData.tipoProceso && (
                    <p className="text-xs text-gray-600 mt-1.5 italic bg-blue-50 px-2 py-1.5 rounded">
                      ℹ️ {TIPOS_PROCESOS_JUDICIALES.find(t => t.nombre === formData.tipoProceso)?.descripcion}
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
                    onChange={(e) => handleInputChange('etapa', e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NOTIFICADA">Notificada</option>
                    <option value="CONTESTACIÓN">Contestación</option>
                    <option value="PROBATORIA">Probatoria</option>
                    <option value="ALEGATOS">Alegatos</option>
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
                      placeholder="Ej: 50.000.000"
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Identificación */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {nuevoDemandante.tipoPersona === 'natural' ? 'Cédula' : 'NIT'}
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandante.identificacion}
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, identificacion: e.target.value }))}
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
                        onChange={(e) => setNuevoDemandante(prev => ({ ...prev, nombre: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Nombre completo del demandante"
                      />
                    </div>

                    {/* Botón Agregar */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAgregarDemandante}
                        className="w-full text-white text-xs font-bold"
                        style={{ background: '#F57C00' }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
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

            {/* Sección 2.5: Datos de Demandados - ✅ SECCIÓN AGREGADA PARA ESAP */}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Identificación */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {nuevoDemandado.tipoPersona === 'natural' ? 'Cédula' : 'NIT'}
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandado.identificacion}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, identificacion: e.target.value }))}
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
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, nombre: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Nombre completo del demandado"
                      />
                    </div>

                    {/* Cargo (Opcional) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Cargo / Función (Opcional)
                      </label>
                      <input
                        type="text"
                        value={nuevoDemandado.cargo}
                        onChange={(e) => setNuevoDemandado(prev => ({ ...prev, cargo: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Ej: Rector, Director, etc."
                      />
                    </div>

                    {/* Botón Agregar */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAgregarDemandado}
                        className="w-full text-white text-xs font-bold"
                        style={{ background: '#DC2626' }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
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

            {/* Sección 2.6: Datos de Otros Actores - ✅ SECCIÓN AGREGADA PARA ESAP */}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* Identificación */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        {nuevoOtroActor.tipoPersona === 'natural' ? 'Cédula' : 'NIT'}
                      </label>
                      <input
                        type="text"
                        value={nuevoOtroActor.identificacion}
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, identificacion: e.target.value }))}
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
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, nombre: e.target.value }))}
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
                        onChange={(e) => setNuevoOtroActor(prev => ({ ...prev, rol: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                        placeholder="Ej: Tercero, Ministerio Público, etc."
                      />
                    </div>

                    {/* Botón Agregar */}
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={handleAgregarOtroActor}
                        className="w-full text-white text-xs font-bold"
                        style={{ background: '#2962FF' }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
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

            {/* Sección 3: Juzgado y Ubicación */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border-l-4 border-l-purple-600">
              <h3 className="text-sm font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                JUZGADO Y UBICACIÓN
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Juzgado */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Juzgado / Tribunal <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Gavel className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.juzgado}
                      onChange={(e) => handleInputChange('juzgado', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.juzgado 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Ej: Juzgado 10 Administrativo del Circuito de Bogotá"
                    />
                  </div>
                  {errors.juzgado && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
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
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccione...</option>
                    {DEPARTAMENTOS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Ciudad */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Ciudad <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.ciudad}
                      onChange={(e) => handleInputChange('ciudad', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                        errors.ciudad 
                          ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                          : 'border-gray-300 focus:ring-blue-500'
                      }`}
                      placeholder="Ej: Bogotá D.C."
                    />
                  </div>
                  {errors.ciudad && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.ciudad}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección 4: Fechas y Asignación */}
            <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-lg border-l-4 border-l-green-600">
              <h3 className="text-sm font-bold text-green-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" />
                FECHAS Y ASIGNACIÓN
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Fecha Notificación */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Fecha de Notificación <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.fechaNotificacion}
                    onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.fechaNotificacion 
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

                {/* Fecha Vencimiento */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.fechaVencimiento}
                    onChange={(e) => handleInputChange('fechaVencimiento', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Abogado Asignado */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Abogado Responsable <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={formData.abogadoAsignado}
                    onChange={(e) => handleInputChange('abogadoAsignado', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.abogadoAsignado 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Seleccione un abogado...</option>
                    {ABOGADOS_DISPONIBLES.map(abogado => (
                      <option key={abogado} value={abogado}>{abogado}</option>
                    ))}
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

            {/* Sección 5: Detalles del Proceso */}
            <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-lg border-l-4 border-l-gray-600">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                DETALLES DEL PROCESO
              </h3>
              
              <div className="space-y-4">
                {/* Pretensiones */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Pretensiones <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={formData.pretensiones}
                    onChange={(e) => handleInputChange('pretensiones', e.target.value)}
                    rows={3}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.pretensiones 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Describa las pretensiones de la demanda..."
                  />
                  {errors.pretensiones && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.pretensiones}
                    </p>
                  )}
                </div>

                {/* Hechos */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Hechos
                  </label>
                  <textarea
                    value={formData.hechos}
                    onChange={(e) => handleInputChange('hechos', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Resumen de los hechos de la demanda..."
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Observaciones Adicionales
                  </label>
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
              className="text-white"
              style={{ background: '#2962FF' }}
            >
              <Save className="w-4 h-4 mr-2" />
              Registrar Demanda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}