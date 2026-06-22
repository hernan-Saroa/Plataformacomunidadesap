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
  onSuccess?: () => void;
}

export function CreateProgramaModal({ onClose, programaToEdit, onSuccess }: CreateProgramaModalProps) {
  const isEditMode = !!programaToEdit;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState({
    codigo: programaToEdit?.codigo || '',
    nombre: programaToEdit?.nombre || '',
    nivelFormacion: programaToEdit?.nivelFormacion || 'Profesional Universitario',
    modalidad: programaToEdit?.modalidad || 'Presencial',
    facultad: programaToEdit?.facultad || '',
    estado: programaToEdit?.estado || 'ACTIVO',
    horasBasePorCredito: programaToEdit?.horasBasePorCredito || 16,
    horasPregradoCentral: programaToEdit?.horasPregradoCentral || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
      if (formData.horasBasePorCredito < 1) newErrors.horasBasePorCredito = 'Las horas base deben ser mayores a 0';
      if (formData.horasPregradoCentral < 0) newErrors.horasPregradoCentral = 'Las horas no pueden ser negativas';
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
          nivelFormacion: formData.nivelFormacion,
          facultad: formData.facultad,
          modalidad: formData.modalidad,
          horasBasePorCredito: formData.horasBasePorCredito,
          horasPregradoCentral: formData.horasPregradoCentral,
          estado: formData.estado,
        };

        setIsSubmitting(true);
        if (isEditMode && programaToEdit) {
          await apiClient.put(`/auth/api/v1/programas-academicos/${programaToEdit.id}`, programaData, { retries: 0 });
        } else {
          await apiClient.post('/auth/api/v1/programas-academicos', programaData, { retries: 0 });
        }

        const action = isEditMode ? 'actualizado' : 'creado';
        toast.success(`Programa ${action} exitosamente`, {
          description: `${formData.nombre} ha sido ${action} correctamente`
        });
        onClose();
        // Refresh the parent component
        onSuccess?.();
      } catch (error) {
        console.error('Error saving programa:', error);
        toast.error('Error al guardar el programa', {
          description: error instanceof Error ? error.message : 'Por favor, inténtalo de nuevo'
        });
      } finally {
        setIsSubmitting(false);
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
                        <option value="ACTIVO">Activo</option>
                        <option value="INACTIVO">Inactivo</option>
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

                  <div className="grid md:grid-cols-1 gap-4">
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
                        <option value="Distancia">Distancia</option>
                        <option value="Mixto">Mixto</option>
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
                    <h3 className="font-black text-gray-900">Configuración de Horas</h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Horas Base por Crédito *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.horasBasePorCredito}
                        onChange={(e) => handleChange('horasBasePorCredito', parseInt(e.target.value) || 0)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                          errors.horasBasePorCredito ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.horasBasePorCredito && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.horasBasePorCredito}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Horas Pregrado Central
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.horasPregradoCentral}
                        onChange={(e) => handleChange('horasPregradoCentral', parseInt(e.target.value) || 0)}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 transition-all ${
                          errors.horasPregradoCentral ? 'border-red-500' : 'border-gray-200 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.horasPregradoCentral && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.horasPregradoCentral}
                        </p>
                      )}
                    </div>
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
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Crear Programa'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
