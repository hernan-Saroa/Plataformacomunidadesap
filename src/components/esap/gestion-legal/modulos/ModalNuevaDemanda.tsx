/**
 * ModalNuevaDemanda - Formulario para registrar nuevas demandas judiciales
 * Diseño corporativo ESAP con validación completa
 */

import { useState } from 'react';
import { X, Scale, User, Calendar, FileText, Building2, AlertCircle, Save, Upload } from 'lucide-react';
import { Card } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { toast } from 'sonner@2.0.3';

interface ModalNuevaDemandaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (demanda: NuevaDemandaData) => void;
}

export interface NuevaDemandaData {
  numeroRadicado: string;
  medioControl: string;
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
      toast.error('Formulario incompleto', {
        description: 'Por favor complete todos los campos obligatorios'
      });
      return;
    }

    onSave(formData);
    
    toast.success('Demanda registrada exitosamente', {
      description: `Radicado: ${formData.numeroRadicado}`
    });
    
    // Resetear formulario
    setFormData({
      numeroRadicado: '',
      medioControl: '',
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
    
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl bg-white my-8">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 md:p-6 border-b"
          style={{ borderBottomColor: '#003DA5', borderBottomWidth: '3px' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ background: '#003DA5' }}
            >
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">
                Nueva Demanda Judicial
              </h2>
              <p className="text-sm text-gray-600">
                Registro de demanda contra ESAP
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          
          {/* Sección 1: Datos del Proceso */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              Datos del Proceso Judicial
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Número de Radicado */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Número de Radicado <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.numeroRadicado}
                  onChange={(e) => handleInputChange('numeroRadicado', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.numeroRadicado 
                      ? 'border-red-500 focus:ring-red-500' 
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Medio de Control <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.medioControl}
                  onChange={(e) => handleInputChange('medioControl', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.medioControl 
                      ? 'border-red-500 focus:ring-red-500' 
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

              {/* Etapa */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Etapa Procesal
                </label>
                <select
                  value={formData.etapa}
                  onChange={(e) => handleInputChange('etapa', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="NOTIFICADA">Notificada</option>
                  <option value="CONTESTACIÓN">Contestación</option>
                  <option value="PROBATORIA">Probatoria</option>
                  <option value="ALEGATOS">Alegatos</option>
                </select>
              </div>

              {/* Cuantía */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cuantía (COP)
                </label>
                <input
                  type="text"
                  value={formData.cuantia}
                  onChange={(e) => handleInputChange('cuantia', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 50.000.000"
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Datos del Demandante */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: '#003DA5' }} />
              Datos del Demandante
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Persona */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo de Persona
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipoPersona"
                      value="natural"
                      checked={formData.tipoPersona === 'natural'}
                      onChange={(e) => handleInputChange('tipoPersona', e.target.value)}
                      className="w-4 h-4"
                      style={{ accentColor: '#003DA5' }}
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
                      style={{ accentColor: '#003DA5' }}
                    />
                    <span className="text-sm text-gray-700">Jurídica</span>
                  </label>
                </div>
              </div>

              {/* Identificación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {formData.tipoPersona === 'natural' ? 'Cédula' : 'NIT'} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.identificacionDemandante}
                  onChange={(e) => handleInputChange('identificacionDemandante', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.identificacionDemandante 
                      ? 'border-red-500 focus:ring-red-500' 
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
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre Completo / Razón Social <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.demandante}
                  onChange={(e) => handleInputChange('demandante', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.demandante 
                      ? 'border-red-500 focus:ring-red-500' 
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
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5" style={{ color: '#003DA5' }} />
              Juzgado y Ubicación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Juzgado */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Juzgado / Tribunal <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.juzgado}
                  onChange={(e) => handleInputChange('juzgado', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.juzgado 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ej: Juzgado 10 Administrativo del Circuito de Bogotá"
                />
                {errors.juzgado && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.juzgado}
                  </p>
                )}
              </div>

              {/* Departamento */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={formData.departamento}
                  onChange={(e) => handleInputChange('departamento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione...</option>
                  {DEPARTAMENTOS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Ciudad <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.ciudad}
                  onChange={(e) => handleInputChange('ciudad', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.ciudad 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Ej: Bogotá D.C."
                />
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
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
              Fechas y Asignación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha Notificación */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de Notificación <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaNotificacion}
                  onChange={(e) => handleInputChange('fechaNotificacion', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.fechaNotificacion 
                      ? 'border-red-500 focus:ring-red-500' 
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={formData.fechaVencimiento}
                  onChange={(e) => handleInputChange('fechaVencimiento', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Abogado Asignado */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Abogado Responsable <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.abogadoAsignado}
                  onChange={(e) => handleInputChange('abogadoAsignado', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.abogadoAsignado 
                      ? 'border-red-500 focus:ring-red-500' 
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
          <div>
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
              Detalles del Proceso
            </h3>
            
            <div className="space-y-4">
              {/* Pretensiones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Pretensiones <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={formData.pretensiones}
                  onChange={(e) => handleInputChange('pretensiones', e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.pretensiones 
                      ? 'border-red-500 focus:ring-red-500' 
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Hechos
                </label>
                <textarea
                  value={formData.hechos}
                  onChange={(e) => handleInputChange('hechos', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Resumen de los hechos de la demanda..."
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Observaciones Adicionales
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Notas u observaciones relevantes..."
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 sm:flex-none sm:px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 sm:flex-none sm:px-6 text-white font-bold"
              style={{ background: '#003DA5' }}
            >
              <Save className="w-4 h-4 mr-2" />
              Registrar Demanda
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
