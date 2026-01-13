/**
 * ModalNuevaDemanda - Formulario para registrar nuevas demandas judiciales
 * ✅ Diseño corporativo ESAP 2025 con ModalHeaderClean
 * ✅ Validación completa y UX mejorada
 * ✅ Botones SIEMPRE visibles en el footer
 */

import { useState } from 'react';
import { Scale, User, Calendar, FileText, Building2, AlertCircle, Save, MapPin, DollarSign, Gavel } from 'lucide-react';
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
  demandante: string;
  tipoPersona: 'natural' | 'juridica';
  identificacionDemandante: string;
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
    demandante: '',
    tipoPersona: 'natural',
    identificacionDemandante: '',
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof NuevaDemandaData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.numeroRadicado.trim()) {
      newErrors.numeroRadicado = 'El número de radicado es obligatorio';
    }
    if (!formData.medioControl) {
      newErrors.medioControl = 'Seleccione el medio de control';
    }
    if (!formData.demandante.trim()) {
      newErrors.demandante = 'El nombre del demandante es obligatorio';
    }
    if (!formData.identificacionDemandante.trim()) {
      newErrors.identificacionDemandante = 'La identificación es obligatoria';
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
      demandante: '',
      tipoPersona: 'natural',
      identificacionDemandante: '',
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
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Número de Radicado */}
                <div>
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
                <div className="md:col-span-2">
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
                <div>
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

            {/* Sección 2: Datos del Demandante */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border-l-4 border-l-orange-500">
              <h3 className="text-sm font-bold text-orange-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-600" />
                DATOS DEL DEMANDANTE
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Persona */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-2">
                    Tipo de Persona
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoPersona"
                        value="natural"
                        checked={formData.tipoPersona === 'natural'}
                        onChange={(e) => handleInputChange('tipoPersona', e.target.value)}
                        className="w-4 h-4"
                        style={{ accentColor: '#2962FF' }}
                      />
                      <span className="text-sm text-gray-700">Natural</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipoPersona"
                        value="juridica"
                        checked={formData.tipoPersona === 'juridica'}
                        onChange={(e) => handleInputChange('tipoPersona', e.target.value)}
                        className="w-4 h-4"
                        style={{ accentColor: '#2962FF' }}
                      />
                      <span className="text-sm text-gray-700">Jurídica</span>
                    </label>
                  </div>
                </div>

                {/* Identificación */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {formData.tipoPersona === 'natural' ? 'Cédula' : 'NIT'} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.identificacionDemandante}
                    onChange={(e) => handleInputChange('identificacionDemandante', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.identificacionDemandante 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder={formData.tipoPersona === 'natural' ? 'Ej: 1234567890' : 'Ej: 900123456-1'}
                  />
                  {errors.identificacionDemandante && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.identificacionDemandante}
                    </p>
                  )}
                </div>

                {/* Nombre Completo */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Nombre Completo / Razón Social <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.demandante}
                    onChange={(e) => handleInputChange('demandante', e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.demandante 
                        ? 'border-red-500 focus:ring-red-500 bg-red-50' 
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                    placeholder="Nombre completo del demandante"
                  />
                  {errors.demandante && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.demandante}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Sección 3: Juzgado y Ubicación */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border-l-4 border-l-purple-600">
              <h3 className="text-sm font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600" />
                JUZGADO Y UBICACIÓN
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="md:col-span-2">
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