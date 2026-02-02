/**
 * ============================================
 * FORMULARIO AUDITORÍA - WORLD CLASS
 * ============================================
 * 
 * Formulario completo para crear/editar auditorías
 * Usa ModalWorldClass como base + ModalConfirmacionAccion
 * 
 * FUNCIONALIDADES:
 * - Validación en tiempo real
 * - Confirmación al cerrar con cambios
 * - Indicador de progreso
 * - Diseño corporativo ESAP
 * 
 * ÚLTIMA ACTUALIZACIÓN: 22 Enero 2025
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Save, AlertCircle, CheckCircle, Plus, Trash2,
  User, Calendar, Target, FileText, Shield, Info, Sparkles,
  ChevronUp, ChevronDown, GripVertical
} from 'lucide-react';
import { ModalWorldClass } from './ModalWorldClass';
import { ModalConfirmacionAccionWorldClass } from './ModalConfirmacionAccionWorldClass';
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
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-900 flex items-center gap-1">
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

export function ModalFormularioAuditoriaWorldClass({
  open,
  onClose,
  onSubmit,
  initialData,
  mode
}: ModalFormularioAuditoriaProps) {
  // Estado del formulario
  const [formData, setFormData] = useState<AuditoriaFormData>({
    tipoAuditoria: initialData?.tipoAuditoria || 'regular',
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
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Actualizar formulario cuando cambian los datos iniciales
  useEffect(() => {
    if (open && initialData) {
      const normalizedObjetivos = initialData.objetivos
        ? initialData.objetivos.map((obj: any) => 
            typeof obj === 'string' ? obj : obj.descripcion || ''
          )
        : [];
      
      setFormData({
        codigo: initialData.codigo || '',
        tipoAuditoria: initialData.tipoAuditoria || 'regular',
        titulo: initialData.titulo || '',
        descripcion: initialData.descripcion || '',
        territorial: initialData.territorial || '',
        auditorLider: initialData.auditorLider || '',
        auditorAsignado: initialData.auditorAsignado || '',
        fechaInicio: initialData.fechaInicio || '',
        fechaFin: initialData.fechaFin || '',
        objetivos: normalizedObjetivos,
        alcance: initialData.alcance || '',
        riesgo: initialData.riesgo || 'Medio'
      });
      setTouched({});
      setErrors([]);
      setHasChanges(false);
    }
  }, [open, initialData]);

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
    if (objetivoTemporal.trim()) {
      handleChange('objetivos', [...formData.objetivos, objetivoTemporal.trim()]);
      setObjetivoTemporal('');
    }
  };

  const handleEliminarObjetivo = (index: number) => {
    handleChange(
      'objetivos',
      formData.objetivos.filter((_, i) => i !== index)
    );
  };

  const handleMoverObjetivo = (index: number, direccion: 'arriba' | 'abajo') => {
    const nuevosObjetivos = [...formData.objetivos];
    const nuevaPosicion = direccion === 'arriba' ? index - 1 : index + 1;
    
    // Intercambiar posiciones
    [nuevosObjetivos[index], nuevosObjetivos[nuevaPosicion]] = 
      [nuevosObjetivos[nuevaPosicion], nuevosObjetivos[index]];
    
    handleChange('objetivos', nuevosObjetivos);
  };

  const handleSubmit = async () => {
    // Marcar todos como touched
    const allFields = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setTouched(allFields);

    // Validar
    const result = validateAuditoriaForm(formData);
    
    if (!result.isValid) {
      setErrors(result.errors);
      toast.error('Por favor corrija los errores en el formulario');
      return;
    }

    setIsSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSubmit(formData);
      toast.success(
        mode === 'create' ? 'Auditoría creada exitosamente' : 'Auditoría actualizada exitosamente'
      );
      onClose();
    } catch (error) {
      toast.error('Error al guardar la auditoría');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAttempt = () => {
    if (hasChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  // Calcular progreso
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

  // Badges dinámicos
  const getBadges = () => {
    const badges: any[] = [
      { label: `${progresoCompletado}% completado`, variant: 'info' as const }
    ];

    if (progresoCompletado === 100) {
      badges.push({
        label: 'Listo para guardar',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        variant: 'success' as const
      });
    }

    if (hasChanges) {
      badges.push({
        label: 'Cambios sin guardar',
        variant: 'warning' as const
      });
    }

    return badges;
  };

  return (
    <>
      <ModalWorldClass
        isOpen={open}
        onClose={handleCloseAttempt}
        titulo={mode === 'create' ? 'Nueva Auditoría' : 'Editar Auditoría'}
        codigo={mode === 'edit' && formData.codigo ? formData.codigo : undefined}
        icono={<FileText className="w-6 h-6" />}
        badges={getBadges()}
        size="xl"
        closeOnOverlay={false}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {camposCompletados} de {camposRequeridos.length} campos completados
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseAttempt}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || errors.length > 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear Auditoría' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Barra de progreso visual */}
          <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progresoCompletado}%` }}
              className={`h-full rounded-full transition-colors ${
                progresoCompletado === 100 ? 'bg-green-600' : 'bg-blue-600'
              }`}
            />
          </div>

          {/* INFORMACIÓN BÁSICA */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Información Básica
            </h3>

            <div className="space-y-4">
              {/* Tipo de Auditoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Tipo de Auditoría *</label>
                <div className="flex gap-3">
                  {[
                    { value: 'regular', label: 'Regular' },
                    { value: 'territorial', label: 'Territorial' },
                    { value: 'especial', label: 'Especial' }
                  ].map(tipo => (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => handleChange('tipoAuditoria', tipo.value)}
                      className={`
                        flex-1 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                        ${formData.tipoAuditoria === tipo.value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }
                      `}
                    >
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <FieldWrapper
                label="Título de la Auditoría"
                error={touched.titulo ? getFieldError(errors, 'Título') : null}
                required
              >
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => handleChange('titulo', e.target.value)}
                  onBlur={() => handleBlur('titulo')}
                  placeholder="Ej: Auditoría de Gestión Administrativa"
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Título') && touched.titulo
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                />
              </FieldWrapper>

              {/* Descripción */}
              <FieldWrapper
                label="Descripción"
                error={touched.descripcion ? getFieldError(errors, 'Descripción') : null}
                required
              >
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleChange('descripcion', e.target.value)}
                  onBlur={() => handleBlur('descripcion')}
                  rows={3}
                  placeholder="Describa el propósito y alcance de la auditoría"
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Descripción') && touched.descripcion
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                />
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
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Territorial') && touched.territorial
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                >
                  <option value="">Seleccione territorial</option>
                  {TERRITORIALES.map(terr => (
                    <option key={terr} value={terr}>{terr}</option>
                  ))}
                </select>
              </FieldWrapper>
            </div>
          </div>

          {/* EQUIPO AUDITOR */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600" />
              Equipo Auditor
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Auditor Líder */}
              <FieldWrapper
                label="Auditor Líder"
                error={touched.auditorLider ? getFieldError(errors, 'Auditor líder') : null}
                required
              >
                <select
                  value={formData.auditorLider}
                  onChange={(e) => handleChange('auditorLider', e.target.value)}
                  onBlur={() => handleBlur('auditorLider')}
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Auditor líder') && touched.auditorLider
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                >
                  <option value="">Seleccione auditor líder</option>
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
                error={touched.auditorAsignado ? getFieldError(errors, 'Auditor asignado') : null}
                required
              >
                <select
                  value={formData.auditorAsignado}
                  onChange={(e) => handleChange('auditorAsignado', e.target.value)}
                  onBlur={() => handleBlur('auditorAsignado')}
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Auditor asignado') && touched.auditorAsignado
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                >
                  <option value="">Seleccione auditor asignado</option>
                  {AUDITORES_MOCK.map(auditor => (
                    <option key={auditor.id} value={auditor.id}>
                      {auditor.nombre} - {auditor.cargo}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
            </div>
          </div>

          {/* FECHAS */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Fechas
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Fecha Inicio */}
              <FieldWrapper
                label="Fecha de Inicio"
                error={touched.fechaInicio ? getFieldError(errors, 'Fecha de inicio') : null}
                required
              >
                <input
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => handleChange('fechaInicio', e.target.value)}
                  onBlur={() => handleBlur('fechaInicio')}
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Fecha de inicio') && touched.fechaInicio
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                />
              </FieldWrapper>

              {/* Fecha Fin */}
              <FieldWrapper
                label="Fecha de Fin"
                error={touched.fechaFin ? getFieldError(errors, 'Fecha de fin') : null}
                required
              >
                <input
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => handleChange('fechaFin', e.target.value)}
                  onBlur={() => handleBlur('fechaFin')}
                  className={`
                    w-full px-3 py-2 border rounded-lg text-sm
                    ${hasFieldError(errors, 'Fecha de fin') && touched.fechaFin
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }
                    focus:outline-none focus:ring-2
                  `}
                />
              </FieldWrapper>
            </div>
          </div>

          {/* OBJETIVOS */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              Objetivos de la Auditoría
            </h3>

            {/* Lista de objetivos */}
            {formData.objetivos.length > 0 ? (
              <div className="space-y-2 mb-4">
                {formData.objetivos.map((objetivo, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-white rounded-lg border border-orange-200 group hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-center gap-1 mt-0.5">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 flex-1">{objetivo}</p>
                    
                    {/* Botones de reordenamiento */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleMoverObjetivo(index, 'arriba')}
                        disabled={index === 0}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Mover arriba"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoverObjetivo(index, 'abajo')}
                        disabled={index === formData.objetivos.length - 1}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Mover abajo"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Botón de eliminar */}
                    <button
                      type="button"
                      onClick={() => handleEliminarObjetivo(index)}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Eliminar objetivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4 p-4 bg-white rounded-lg border border-orange-200 border-dashed">
                <div className="flex items-center gap-2 text-orange-600">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <p className="text-sm">No hay objetivos definidos. Agregue al menos un objetivo para la auditoría.</p>
                </div>
              </div>
            )}

            {/* Input nuevo objetivo */}
            <div className="flex gap-2">
              <input
                type="text"
                value={objetivoTemporal}
                onChange={(e) => setObjetivoTemporal(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && objetivoTemporal.trim() && handleAgregarObjetivo()}
                placeholder="Escriba un objetivo y presione Enter o haga clic en Agregar"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={handleAgregarObjetivo}
                disabled={!objetivoTemporal.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>
          </div>

          {/* ALCANCE Y RIESGO */}
          <div className="grid grid-cols-2 gap-4">
            {/* Alcance */}
            <FieldWrapper
              label="Alcance"
              error={touched.alcance ? getFieldError(errors, 'Alcance') : null}
              required
            >
              <textarea
                value={formData.alcance}
                onChange={(e) => handleChange('alcance', e.target.value)}
                onBlur={() => handleBlur('alcance')}
                rows={3}
                placeholder="Defina el alcance de la auditoría"
                className={`
                  w-full px-3 py-2 border rounded-lg text-sm
                  ${hasFieldError(errors, 'Alcance') && touched.alcance
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                  }
                  focus:outline-none focus:ring-2
                `}
              />
            </FieldWrapper>

            {/* Nivel de Riesgo */}
            <FieldWrapper
              label="Nivel de Riesgo"
              error={touched.riesgo ? getFieldError(errors, 'Riesgo') : null}
              required
            >
              <div className="space-y-2">
                {[
                  { value: 'Alto', color: 'red', label: 'Alto' },
                  { value: 'Medio', color: 'yellow', label: 'Medio' },
                  { value: 'Bajo', color: 'green', label: 'Bajo' }
                ].map(nivel => (
                  <button
                    key={nivel.value}
                    type="button"
                    onClick={() => handleChange('riesgo', nivel.value)}
                    className={`
                      w-full px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                      ${formData.riesgo === nivel.value
                        ? `border-${nivel.color}-600 bg-${nivel.color}-50 text-${nivel.color}-700`
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }
                    `}
                  >
                    {nivel.label}
                  </button>
                ))}
              </div>
            </FieldWrapper>
          </div>
        </div>
      </ModalWorldClass>

      {/* Modal de confirmación de cierre */}
      <ModalConfirmacionAccionWorldClass
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        onConfirmar={handleConfirmClose}
        titulo="Confirmar Cierre"
        mensaje="¿Está seguro de que desea cerrar el formulario?"
        descripcion="Hay cambios sin guardar que se perderán si continúa."
        tipo="custom"
        textoConfirmar="Cerrar sin guardar"
        textoCancelar="Continuar editando"
      />
    </>
  );
}