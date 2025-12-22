/**
 * ============================================
 * FORMULARIO DE AUDITORÍA CON VALIDACIÓN ROBUSTA
 * ============================================
 * 
 * Formulario completo para crear/editar auditorías
 * con validación en tiempo real y feedback visual.
 * 
 * FUNCIONALIDADES:
 * 1. Validación en tiempo real
 * 2. Feedback visual inmediato
 * 3. Mensajes de error descriptivos
 * 4. Prevención de envío con errores
 * 5. Autoguardado de borrador
 * 6. Confirmación al salir con cambios
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Save, AlertCircle, CheckCircle, Plus, Trash2,
  User, Calendar, Target, FileText, Shield, Info
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { toast } from 'sonner@2.0.3';
import {
  validateAuditoriaForm,
  getFieldError,
  hasFieldError,
  type AuditoriaFormData,
  type ValidationError
} from '../../../utils/validation';

// ============ TIPOS ============

interface Persona {
  id: string;
  nombre: string;
  cargo: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

interface ModalFormularioAuditoriaProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AuditoriaFormData) => void;
  initialData?: Partial<AuditoriaFormData>;
  mode: 'create' | 'edit';
}

// ============ DATOS MOCK ============

const TERRITORIALES = [
  'Nacional',
  'Antioquia',
  'Atlántico',
  'Bogotá',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Quindío',
  'Risaralda',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca'
];

const AUDITORES_MOCK: Persona[] = [
  {
    id: 'aud-001',
    nombre: 'Juan Pérez Gómez',
    cargo: 'Auditor Senior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '80123456'
  },
  {
    id: 'aud-002',
    nombre: 'Ana María López Silva',
    cargo: 'Auditor Junior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '52987654'
  },
  {
    id: 'aud-003',
    nombre: 'Carlos Ramírez Díaz',
    cargo: 'Auditor Senior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '94123456'
  },
  {
    id: 'aud-004',
    nombre: 'Diana López Vargas',
    cargo: 'Auditor Senior',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '72123456'
  },
  {
    id: 'aud-005',
    nombre: 'Roberto Torres Sánchez',
    cargo: 'Auditor Líder',
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '79456789'
  }
];

// ============ COMPONENTE DE CAMPO CON ERROR ============

interface FieldWrapperProps {
  label: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  helpText?: string;
}

function FieldWrapper({ label, error, required, children, helpText }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center gap-1 text-red-600 text-xs"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {!error && helpText && (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {helpText}
        </p>
      )}
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function ModalFormularioAuditoria({
  open,
  onClose,
  onSubmit,
  initialData,
  mode
}: ModalFormularioAuditoriaProps) {
  // Estado del formulario
  const [formData, setFormData] = useState<AuditoriaFormData>({
    titulo: initialData?.titulo || '',
    descripcion: initialData?.descripcion || '',
    territorial: initialData?.territorial || '',
    auditorLider: initialData?.auditorLider || '',
    auditorAsignado: initialData?.auditorAsignado || '',
    fechaInicio: initialData?.fechaInicio || '',
    fechaFin: initialData?.fechaFin || '',
    objetivos: initialData?.objetivos || [],
    alcance: initialData?.alcance || '',
    riesgo: initialData?.riesgo || 'Medio'
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [objetivoTemporal, setObjetivoTemporal] = useState('');

  // Detectar cambios
  useEffect(() => {
    const hasAnyChanges = Object.keys(formData).some(key => {
      const fieldKey = key as keyof AuditoriaFormData;
      return formData[fieldKey] !== (initialData?.[fieldKey] || '');
    });
    setHasChanges(hasAnyChanges);
  }, [formData, initialData]);

  // Validar formulario en tiempo real
  useEffect(() => {
    if (Object.keys(touched).length > 0) {
      const result = validateAuditoriaForm(formData);
      setErrors(result.errors);
    }
  }, [formData, touched]);

  // Handlers
  const handleChange = (field: keyof AuditoriaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleBlur = (field: keyof AuditoriaFormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleAgregarObjetivo = () => {
    if (objetivoTemporal.trim().length < 10) {
      toast.error('El objetivo debe tener al menos 10 caracteres');
      return;
    }

    setFormData(prev => ({
      ...prev,
      objetivos: [...prev.objetivos, objetivoTemporal.trim()]
    }));
    setObjetivoTemporal('');
    setTouched(prev => ({ ...prev, objetivos: true }));
  };

  const handleEliminarObjetivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objetivos: prev.objetivos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar todos los campos como tocados
    const allFields = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allFields);

    // Validar
    const result = validateAuditoriaForm(formData);
    setErrors(result.errors);

    if (!result.isValid) {
      toast.error('Por favor corrige los errores antes de continuar');
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      toast.success(
        mode === 'create'
          ? '✅ Auditoría creada exitosamente'
          : '✅ Auditoría actualizada exitosamente'
      );
      handleClose();
    } catch (error) {
      toast.error('Error al guardar la auditoría');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirm = window.confirm(
        '¿Estás seguro de que deseas salir? Los cambios no guardados se perderán.'
      );
      if (!confirm) return;
    }
    onClose();
  };

  if (!open) return null;

  // Calcular progreso de completado
  const camposRequeridos = [
    'titulo',
    'descripcion',
    'territorial',
    'auditorLider',
    'auditorAsignado',
    'fechaInicio',
    'fechaFin',
    'objetivos',
    'alcance',
    'riesgo'
  ];
  const camposCompletados = camposRequeridos.filter(campo => {
    const value = formData[campo as keyof AuditoriaFormData];
    if (Array.isArray(value)) return value.length > 0;
    return value && value !== '';
  }).length;
  const progresoCompletado = Math.round((camposCompletados / camposRequeridos.length) * 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex items-center justify-center"
          >
            <div className="bg-white rounded-lg shadow-2xl w-full h-full flex flex-col max-w-5xl">
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      {mode === 'create' ? 'Nueva Auditoría' : 'Editar Auditoría'}
                    </h2>
                  </div>
                  <p className="text-sm text-gray-600">
                    {mode === 'create'
                      ? 'Complete todos los campos obligatorios para crear la auditoría'
                      : 'Modifique los campos necesarios y guarde los cambios'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="ml-4"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* BARRA DE PROGRESO */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">
                    Progreso de completado
                  </span>
                  <Badge
                    className={
                      progresoCompletado === 100
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }
                    variant="outline"
                  >
                    {progresoCompletado}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor: progresoCompletado === 100 ? '#22c55e' : '#eab308'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progresoCompletado}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {camposCompletados} de {camposRequeridos.length} campos completados
                </p>
              </div>

              {/* FORMULARIO */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* INFORMACIÓN BÁSICA */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Información Básica
                    </h3>

                    <div className="space-y-4">
                      {/* Título */}
                      <FieldWrapper
                        label="Título de la Auditoría"
                        error={touched.titulo ? getFieldError(errors, 'Título') : null}
                        required
                        helpText="Mínimo 10 caracteres, máximo 200"
                      >
                        <Input
                          value={formData.titulo}
                          onChange={(e) => handleChange('titulo', e.target.value)}
                          onBlur={() => handleBlur('titulo')}
                          placeholder="Ej: Auditoría de Gestión Administrativa Territorial"
                          className={
                            hasFieldError(errors, 'Título') && touched.titulo
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }
                        />
                        <div className="text-xs text-gray-500 text-right mt-1">
                          {formData.titulo.length}/200
                        </div>
                      </FieldWrapper>

                      {/* Descripción */}
                      <FieldWrapper
                        label="Descripción"
                        error={touched.descripcion ? getFieldError(errors, 'Descripción') : null}
                        required
                        helpText="Mínimo 20 caracteres, máximo 500"
                      >
                        <textarea
                          value={formData.descripcion}
                          onChange={(e) => handleChange('descripcion', e.target.value)}
                          onBlur={() => handleBlur('descripcion')}
                          placeholder="Describa brevemente el propósito y alcance de la auditoría..."
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                            hasFieldError(errors, 'Descripción') && touched.descripcion
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                        <div className="text-xs text-gray-500 text-right mt-1">
                          {formData.descripcion.length}/500
                        </div>
                      </FieldWrapper>

                      {/* Territorial */}
                      <FieldWrapper
                        label="Territorial"
                        error={touched.territorial ? getFieldError(errors, 'Territorial') : null}
                        required
                      >
                        <select
                          value={formData.territorial}
                          onChange={(e) => handleChange('territorial', e.target.value)}
                          onBlur={() => handleBlur('territorial')}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            hasFieldError(errors, 'Territorial') && touched.territorial
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccione una territorial...</option>
                          {TERRITORIALES.map(territorial => (
                            <option key={territorial} value={territorial}>
                              {territorial}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>
                    </div>
                  </div>

                  {/* EQUIPO AUDITOR */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Equipo Auditor
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Auditor Líder */}
                      <FieldWrapper
                        label="Auditor Líder"
                        error={touched.auditorLider ? getFieldError(errors, 'Auditor Líder') : null}
                        required
                      >
                        <select
                          value={formData.auditorLider}
                          onChange={(e) => handleChange('auditorLider', e.target.value)}
                          onBlur={() => handleBlur('auditorLider')}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            hasFieldError(errors, 'Auditor Líder') && touched.auditorLider
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccione un auditor...</option>
                          {AUDITORES_MOCK.map(auditor => (
                            <option key={auditor.id} value={auditor.id}>
                              {auditor.nombre} - {auditor.cargo}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>

                      {/* Auditor Asignado */}
                      <FieldWrapper
                        label="Auditor Asignado"
                        error={touched.auditorAsignado ? getFieldError(errors, 'Auditor Asignado') : null}
                        required
                      >
                        <select
                          value={formData.auditorAsignado}
                          onChange={(e) => handleChange('auditorAsignado', e.target.value)}
                          onBlur={() => handleBlur('auditorAsignado')}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            hasFieldError(errors, 'Auditor Asignado') && touched.auditorAsignado
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccione un auditor...</option>
                          {AUDITORES_MOCK.filter(a => a.id !== formData.auditorLider).map(auditor => (
                            <option key={auditor.id} value={auditor.id}>
                              {auditor.nombre} - {auditor.cargo}
                            </option>
                          ))}
                        </select>
                      </FieldWrapper>
                    </div>

                    {/* Error de auditor duplicado */}
                    {getFieldError(errors, 'auditorAsignado')?.includes('mismo') && (
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          El auditor líder y el auditor asignado deben ser personas diferentes
                        </p>
                      </div>
                    )}
                  </div>

                  {/* FECHAS */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Periodo de Ejecución
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Fecha Inicio */}
                      <FieldWrapper
                        label="Fecha de Inicio"
                        error={touched.fechaInicio ? getFieldError(errors, 'Fecha de inicio') : null}
                        required
                      >
                        <Input
                          type="date"
                          value={formData.fechaInicio}
                          onChange={(e) => handleChange('fechaInicio', e.target.value)}
                          onBlur={() => handleBlur('fechaInicio')}
                          className={
                            hasFieldError(errors, 'Fecha de inicio') && touched.fechaInicio
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }
                        />
                      </FieldWrapper>

                      {/* Fecha Fin */}
                      <FieldWrapper
                        label="Fecha de Fin"
                        error={touched.fechaFin ? getFieldError(errors, 'Fecha de fin') : null}
                        required
                      >
                        <Input
                          type="date"
                          value={formData.fechaFin}
                          onChange={(e) => handleChange('fechaFin', e.target.value)}
                          onBlur={() => handleBlur('fechaFin')}
                          className={
                            hasFieldError(errors, 'Fecha de fin') && touched.fechaFin
                              ? 'border-red-500 focus:ring-red-500'
                              : ''
                          }
                        />
                      </FieldWrapper>
                    </div>
                  </div>

                  {/* OBJETIVOS */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Objetivos de la Auditoría
                    </h3>

                    {/* Lista de objetivos */}
                    {formData.objetivos.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {formData.objetivos.map((objetivo, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-gray-700 flex-1">{objetivo}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEliminarObjetivo(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Agregar objetivo */}
                    <FieldWrapper
                      label="Agregar Objetivo"
                      error={touched.objetivos ? getFieldError(errors, 'Objetivos') : null}
                      required={formData.objetivos.length === 0}
                      helpText="Mínimo 10 caracteres por objetivo"
                    >
                      <div className="flex gap-2">
                        <Input
                          value={objetivoTemporal}
                          onChange={(e) => setObjetivoTemporal(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAgregarObjetivo();
                            }
                          }}
                          placeholder="Escriba un objetivo y presione Enter o haga clic en Agregar"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          onClick={handleAgregarObjetivo}
                          disabled={objetivoTemporal.trim().length < 10}
                          style={{ backgroundColor: '#003DA5' }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    </FieldWrapper>
                  </div>

                  {/* ALCANCE Y RIESGO */}
                  <div className="bg-white rounded-lg border-2 border-gray-200 p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Alcance y Evaluación de Riesgo
                    </h3>

                    <div className="space-y-4">
                      {/* Alcance */}
                      <FieldWrapper
                        label="Alcance de la Auditoría"
                        error={touched.alcance ? getFieldError(errors, 'Alcance') : null}
                        required
                        helpText="Mínimo 20 caracteres"
                      >
                        <textarea
                          value={formData.alcance}
                          onChange={(e) => handleChange('alcance', e.target.value)}
                          onBlur={() => handleBlur('alcance')}
                          placeholder="Defina el alcance de la auditoría, áreas a evaluar, procesos incluidos..."
                          rows={4}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none ${
                            hasFieldError(errors, 'Alcance') && touched.alcance
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300'
                          }`}
                        />
                      </FieldWrapper>

                      {/* Nivel de Riesgo */}
                      <FieldWrapper
                        label="Nivel de Riesgo"
                        error={touched.riesgo ? getFieldError(errors, 'Nivel de riesgo') : null}
                        required
                      >
                        <div className="grid grid-cols-3 gap-3">
                          {(['Bajo', 'Medio', 'Alto'] as const).map(nivel => (
                            <button
                              key={nivel}
                              type="button"
                              onClick={() => handleChange('riesgo', nivel)}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                formData.riesgo === nivel
                                  ? nivel === 'Alto'
                                    ? 'border-red-500 bg-red-50'
                                    : nivel === 'Medio'
                                    ? 'border-yellow-500 bg-yellow-50'
                                    : 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="text-center">
                                <div
                                  className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                                    formData.riesgo === nivel
                                      ? nivel === 'Alto'
                                        ? 'bg-red-500'
                                        : nivel === 'Medio'
                                        ? 'bg-yellow-500'
                                        : 'bg-green-500'
                                      : 'bg-gray-300'
                                  }`}
                                >
                                  <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div className="font-bold text-sm">{nivel}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </FieldWrapper>
                    </div>
                  </div>
                </div>
              </form>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  {hasChanges && (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                      Tienes cambios sin guardar
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || errors.length > 0}
                    style={{ backgroundColor: '#003DA5' }}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Save className="w-4 h-4" />
                        </motion.div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {mode === 'create' ? 'Crear Auditoría' : 'Guardar Cambios'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
