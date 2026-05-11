import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  GraduationCap,
  Building2,
  FileText,
  Award,
  DollarSign,
  Calendar,
  Users,
  Clock,
  BookOpen,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { programasService, apiClient, type ProgramaAcademicoDTO } from '../../services/api';

type ProgramaAcademico = ProgramaAcademicoDTO;

interface CreateProgramaModalProps {
  onClose: () => void;
  programaToEdit?: ProgramaAcademico | null;
}

export function CreateProgramaModal({ onClose, programaToEdit }: CreateProgramaModalProps) {
  const isEditMode = !!programaToEdit;

  // Estados del formulario
  const [formData, setFormData] = useState({
    codigo: programaToEdit?.codigo || '',
    nombre: programaToEdit?.nombre || '',
    nivelFormacion: programaToEdit?.nivelFormacion || 'Profesional Universitario',
    modalidad: programaToEdit?.modalidad || 'Presencial',
    jornada: programaToEdit?.jornada || 'Diurna',
    duracion: programaToEdit?.duracion || 10,
    creditos: programaToEdit?.creditos || 160,
    sede: programaToEdit?.sede || 'Bogotá',
    facultad: programaToEdit?.facultad || '',
    estado: programaToEdit?.estado || 'ACTIVO',
    registroCalificado: programaToEdit?.registroCalificado || {
      numero_registro_calificado: '',
      fecha_emision: '',
      vigencia: '',
      acreditacion: undefined
    },
    descripcion: programaToEdit?.descripcion || '',
    perfilEgresado: programaToEdit?.perfilEgresado || '',
    requisitosDeIngreso: programaToEdit?.requisitosDeIngreso || '',
    costoMatricula: programaToEdit?.costoMatricula || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleChange = (field: string, value: any) => {
    if (field.startsWith('registroCalificado.')) {
      const parts = field.split('.');
      if (parts.length === 2) {
        // registroCalificado.field
        const [, rcField] = parts;
        setFormData(prev => ({
          ...prev,
          registroCalificado: {
            ...prev.registroCalificado,
            [rcField]: value
          }
        }));
      } else if (parts.length === 3) {
        // registroCalificado.acreditacion.field
        const [, , acreditacionField] = parts;
        setFormData(prev => ({
          ...prev,
          registroCalificado: {
            ...prev.registroCalificado,
            acreditacion: {
              ...prev.registroCalificado?.acreditacion,
              [acreditacionField]: value
            }
          }
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.codigo.trim()) newErrors.codigo = 'El código es requerido';
      if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
      if (!formData.facultad.trim()) newErrors.facultad = 'La facultad es requerida';
    }

    if (step === 2) {
      if (formData.duracion < 1) newErrors.duracion = 'La duración debe ser mayor a 0';
      if (formData.creditos < 1) newErrors.creditos = 'Los créditos deben ser mayores a 0';
      if (formData.costoMatricula < 0) newErrors.costoMatricula = 'El costo no puede ser negativo';
    }

    if (step === 3) {
      if (!formData.registroCalificado?.numero_registro_calificado?.trim()) newErrors.rcNumero = 'El número de registro es requerido';
      if (!formData.registroCalificado?.fecha_emision) newErrors.rcFechaEmision = 'La fecha de emisión es requerida';
      if (!formData.registroCalificado?.vigencia || formData.registroCalificado.vigencia < 1) newErrors.rcVigencia = 'Los años de vigencia son requeridos';
    }

    if (step === 4) {
      if (!formData.descripcion.trim()) newErrors.descripcion = 'La descripción es requerida';
      if (!formData.perfilEgresado.trim()) newErrors.perfilEgresado = 'El perfil del egresado es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      try {
        const programaData = {
          codigo: formData.codigo,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          nivelFormacion: formData.nivelFormacion,
          facultad: formData.facultad,
          modalidad: formData.modalidad,
          duracion: formData.duracion,
          creditos: formData.creditos,
          costoMatricula: formData.costoMatricula,
          requisitosDeIngreso: formData.requisitosDeIngreso,
          jornada: formData.jornada,
          sede: formData.sede,
          registroCalificado: formData.registroCalificado,
          perfilEgresado: formData.perfilEgresado,
          estado: formData.estado,
        };

        if (isEditMode && programaToEdit) {
          await apiClient.put(`/auth/api/v1/programas-academicos/${programaToEdit.id}`, programaData);
        } else {
          await apiClient.post('/auth/api/v1/programas-academicos', programaData);
        }

        const action = isEditMode ? 'actualizado' : 'creado';
        toast.success(`Programa ${action} exitosamente`, {
          description: `${formData.nombre} ha sido ${action} correctamente`
        });
        onClose();
        // Refresh the parent component
        window.location.reload();
      } catch (error) {
        console.error('Error saving programa:', error);
        toast.error('Error al guardar el programa', {
          description: 'Por favor, inténtalo de nuevo'
        });
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[111] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#0052cc] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  {isEditMode ? 'Editar Programa Académico' : 'Crear Programa Académico'}
                </h2>
                <p className="text-sm text-white/80">
                  Paso {currentStep} de {totalSteps}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 h-2">
            <motion.div
              className="bg-[#003DA5] h-full"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              {/* STEP 1: Información Básica */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-[#003DA5]" />
                    <h3 className="font-black text-gray-900">Información Básica</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Código del Programa *
                      </label>
                      <input
                        type="text"
                        value={formData.codigo}
                        onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                        placeholder="Ej: ADM-001"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                          errors.codigo ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.codigo && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.codigo}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Estado *
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => handleChange('estado', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                      >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="En Trámite">En Trámite</option>
                        <option value="Suspendido">Suspendido</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del Programa *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleChange('nombre', e.target.value)}
                      placeholder="Ej: Administración Pública"
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                        errors.nombre ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                      }`}
                    />
                    {errors.nombre && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.nombre}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nivel de Formación *
                      </label>
                      <select
                        value={formData.nivelFormacion}
                        onChange={(e) => handleChange('nivelFormacion', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                      >
                        <option value="Técnico Profesional">Técnico Profesional</option>
                        <option value="Tecnológico">Tecnológico</option>
                        <option value="Profesional Universitario">Profesional Universitario</option>
                        <option value="Especialización">Especialización</option>
                        <option value="Maestría">Maestría</option>
                        <option value="Doctorado">Doctorado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Facultad *
                      </label>
                      <input
                        type="text"
                        value={formData.facultad}
                        onChange={(e) => handleChange('facultad', e.target.value)}
                        placeholder="Ej: Facultad de Pregrado"
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                          errors.facultad ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.facultad && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.facultad}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Modalidad *
                      </label>
                      <select
                        value={formData.modalidad}
                        onChange={(e) => handleChange('modalidad', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Virtual">Virtual</option>
                        <option value="Distancia">Distancia</option>
                        <option value="Dual">Dual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Jornada *
                      </label>
                      <select
                        value={formData.jornada}
                        onChange={(e) => handleChange('jornada', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                      >
                        <option value="Diurna">Diurna</option>
                        <option value="Nocturna">Nocturna</option>
                        <option value="Mixta">Mixta</option>
                        <option value="Flexible">Flexible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sede *
                      </label>
                      <select
                        value={formData.sede}
                        onChange={(e) => handleChange('sede', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                      >
                        <option value="Bogotá">Bogotá</option>
                        <option value="Medellín">Medellín</option>
                        <option value="Cali">Cali</option>
                        <option value="Barranquilla">Barranquilla</option>
                        <option value="Bucaramanga">Bucaramanga</option>
                        <option value="Cartagena">Cartagena</option>
                        <option value="Pasto">Pasto</option>
                        <option value="Manizales">Manizales</option>
                        <option value="Ibagué">Ibagué</option>
                        <option value="Neiva">Neiva</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Detalles Académicos */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-[#003DA5]" />
                    <h3 className="font-black text-gray-900">Detalles Académicos</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Duración (Semestres) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.duracion}
                        onChange={(e) => handleChange('duracion', parseInt(e.target.value) || 0)}
                        className={errors.duracion ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'}
                      />
                      {errors.duracion && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.duracion}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Créditos Académicos *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.creditos}
                        onChange={(e) => handleChange('creditos', parseInt(e.target.value) || 0)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                          errors.creditos ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.creditos && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.creditos}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Costo de Matrícula (COP) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={formData.costoMatricula}
                        onChange={(e) => handleChange('costoMatricula', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className={`w-full pl-11 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                          errors.costoMatricula ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                        }`}
                      />
                    </div>
                    {errors.costoMatricula && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.costoMatricula}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Valor: ${formData.costoMatricula.toLocaleString('es-CO')} COP
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Requisitos de Ingreso
                    </label>
                    <textarea
                      value={formData.requisitosDeIngreso}
                      onChange={(e) => handleChange('requisitosDeIngreso', e.target.value)}
                      placeholder="Un requisito por línea&#10;Ej: Título de bachiller&#10;Pruebas Saber 11&#10;Entrevista"
                      rows={5}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all resize-none"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Escribe un requisito por línea
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Registro y Acreditación */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Award className="w-5 h-5 text-[#003DA5]" />
                    <h3 className="font-black text-gray-900">Registro y Acreditación</h3>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">Registro Calificado</h4>
                    <p className="text-xs text-blue-700">
                      Información obligatoria del registro calificado otorgado por el Ministerio de Educación Nacional
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Número de Registro Calificado *
                    </label>
                    <input
                      type="text"
                      value={formData.registroCalificado?.numero_registro_calificado || ''}
                      onChange={(e) => handleChange('registroCalificado.numero_registro_calificado', e.target.value.toUpperCase())}
                      className={errors.rcNumero ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'}
                    />
                    {errors.rcNumero && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.rcNumero}
                      </p>
                    )}
                  </div>

                  
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fecha de Emisión *
                      </label>
                      <input
                        type="date"
                        value={formData.registroCalificado?.fecha_emision || ''}
                        onChange={(e) => handleChange('registroCalificado.fecha_emision', e.target.value)}
                        className={errors.rcFechaEmision ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'}
                      />
                      {errors.rcFechaEmision && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.rcFechaEmision}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Vigencia del Registro (años) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ej: 5"
                        value={formData.registroCalificado?.vigencia || ''}
                        onChange={(e) => handleChange('registroCalificado.vigencia', parseInt(e.target.value) || '')}
                        className={errors.rcVigencia ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'}
                      />
                      {errors.rcVigencia && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.rcVigencia}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="tieneAcreditacion"
                        checked={!!formData.registroCalificado?.acreditacion}
                        onChange={(e) => handleChange('registroCalificado.acreditacion', e.target.checked ? { tipo_acreditacion: 'Alta Calidad', vigencia: '' } : undefined)}
                        className="w-5 h-5 text-[#003DA5] border-gray-300 rounded focus:ring-[#003DA5]"
                      />
                      <label htmlFor="tieneAcreditacion" className="font-semibold text-gray-900">
                        El programa cuenta con acreditación
                      </label>
                    </div>

                    {formData.registroCalificado?.acreditacion && (
                      <div className="space-y-4 pl-8">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Tipo de Acreditación
                            </label>
                            <select
                              value={formData.registroCalificado?.acreditacion?.tipo_acreditacion || 'Alta Calidad'}
                              onChange={(e) => handleChange('registroCalificado.acreditacion.tipo_acreditacion', e.target.value)}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                            >
                              <option value="Alta Calidad">Alta Calidad</option>
                              <option value="Internacional">Internacional</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Vigencia de Acreditación (años)
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Ej: 5"
                              value={formData.registroCalificado?.acreditacion?.vigencia || ''}
                              onChange={(e) => handleChange('registroCalificado.acreditacion.vigencia', parseInt(e.target.value) || '')}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 4: Descripción y Perfil */}
              {currentStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-[#003DA5]" />
                    <h3 className="font-black text-gray-900">Descripción y Perfil</h3>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Descripción del Programa *
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => handleChange('descripcion', e.target.value)}
                      placeholder="Describe el programa académico, su enfoque y objetivos..."
                      rows={5}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all resize-none ${
                        errors.descripcion ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                      }`}
                    />
                    {errors.descripcion && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.descripcion}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.descripcion.length} caracteres
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Perfil del Egresado *
                    </label>
                    <textarea
                      value={formData.perfilEgresado}
                      onChange={(e) => handleChange('perfilEgresado', e.target.value)}
                      placeholder="Describe las competencias y capacidades del egresado..."
                      rows={5}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all resize-none ${
                        errors.perfilEgresado ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                      }`}
                    />
                    {errors.perfilEgresado && (
                      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.perfilEgresado}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.perfilEgresado.length} caracteres
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900 text-sm mb-1">¡Casi listo!</h4>
                        <p className="text-xs text-green-700">
                          Revisa toda la información antes de guardar el programa académico.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className="px-4 py-2 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>

              <div className="flex gap-1.5">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i + 1 === currentStep
                        ? 'bg-[#003DA5] w-8'
                        : i + 1 < currentStep
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-[#003DA5] text-white rounded-xl font-semibold hover:bg-[#002d7a] transition-colors"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Guardar Cambios' : 'Crear Programa'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}