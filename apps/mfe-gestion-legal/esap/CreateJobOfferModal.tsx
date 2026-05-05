/**
 * MODAL: CREAR OFERTA LABORAL
 * Alineado con especificaciones PROMPT_FIGMA_COMPLETO_Modulo_Usuarios_ESAP.md
 * Componente Modal según diseño ESAP
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Briefcase, 
  Building2, 
  MapPin, 
  DollarSign, 
  Calendar,
  FileText,
  Mail,
  Clock,
  Tag,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateJobOfferModalProps {
  onClose: () => void;
}

export function CreateJobOfferModal({ onClose }: CreateJobOfferModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    locationType: 'Presencial',
    contractType: 'Tiempo Completo',
    salary: '',
    category: '',
    description: '',
    requirements: '',
    contactEmail: '',
    deadline: '',
    tags: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'El título es obligatorio';
    if (!formData.company.trim()) newErrors.company = 'La empresa es obligatoria';
    if (!formData.location.trim()) newErrors.location = 'La ubicación es obligatoria';
    if (!formData.salary.trim()) newErrors.salary = 'El salario es obligatorio';
    if (!formData.category.trim()) newErrors.category = 'La categoría es obligatoria';
    if (!formData.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'El correo es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Correo electrónico inválido';
    }
    if (!formData.deadline) newErrors.deadline = 'La fecha límite es obligatoria';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Formulario incompleto', { 
        description: 'Por favor completa todos los campos obligatorios' 
      });
      return;
    }

    setIsSubmitting(true);

    // Simular creación
    setTimeout(() => {
      toast.success('Oferta Creada Exitosamente', {
        description: `${formData.title} ha sido publicada`,
      });
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo al escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AnimatePresence>
      {/* Overlay - Especificaciones Figma */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center p-2 sm:p-4"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      >
        {/* Modal Container - Especificaciones Figma */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, type: 'spring', damping: 25 }}
          className="bg-white rounded-xl sm:rounded-2xl w-full overflow-hidden z-[9999]"
          style={{
            maxWidth: '900px',
            maxHeight: '95vh',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Especificaciones Figma */}
          <div 
            className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 border-b"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
              borderColor: '#002D7A'
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  {/* H2: 24px Bold según especificaciones */}
                  <h2 
                    className="font-bold text-white truncate"
                    style={{
                      fontSize: 'clamp(18px, 5vw, 24px)',
                      lineHeight: '32px',
                      letterSpacing: '0px'
                    }}
                  >
                    Crear Nueva Oferta Laboral
                  </h2>
                  {/* Body: 14px Regular */}
                  <p 
                    className="font-normal mt-1"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    Completa la información para publicar una nueva oferta
                  </p>
                </div>
              </div>
              
              {/* Close Button - Especificaciones Figma */}
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <X className="w-6 h-6 text-white" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Body - Scrollable */}
          <form onSubmit={handleSubmit}>
            <div 
              className="px-8 py-6 overflow-y-auto"
              style={{ maxHeight: 'calc(90vh - 220px)' }}
            >
              <div className="space-y-6">
                {/* Información Básica */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <Briefcase className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Información Básica
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Título */}
                    <div className="md:col-span-2">
                      <label 
                        className="block mb-2"
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: '20px',
                          color: '#374151'
                        }}
                      >
                        Título del Puesto <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Ej: Analista de Políticas Públicas"
                        className={`w-full border-2 rounded-lg transition-all ${
                          errors.title ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{
                          padding: '12px 16px',
                          fontSize: '14px',
                          lineHeight: '20px',
                          height: '44px',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          if (!errors.title) {
                            e.target.style.borderColor = '#003DA5';
                            e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                          }
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = errors.title ? '#EF4444' : '#D1D5DB';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      {errors.title && (
                        <p 
                          className="mt-1 flex items-center gap-1"
                          style={{
                            fontSize: '12px',
                            lineHeight: '16px',
                            color: '#EF4444'
                          }}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.title}
                        </p>
                      )}
                    </div>

                    {/* Empresa */}
                    <div>
                      <label 
                        className="block mb-2"
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: '20px',
                          color: '#374151'
                        }}
                      >
                        Empresa u Organización <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="relative">
                        <Building2 
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                          style={{ color: '#9CA3AF' }}
                        />
                        <input
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleChange('company', e.target.value)}
                          placeholder="Nombre de la empresa"
                          className={`w-full border-2 rounded-lg transition-all ${
                            errors.company ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                          }`}
                          style={{
                            paddingLeft: '48px',
                            paddingRight: '16px',
                            paddingTop: '12px',
                            paddingBottom: '12px',
                            fontSize: '14px',
                            lineHeight: '20px',
                            height: '44px',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            if (!errors.company) {
                              e.target.style.borderColor = '#003DA5';
                              e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                            }
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = errors.company ? '#EF4444' : '#D1D5DB';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      {errors.company && (
                        <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.company}
                        </p>
                      )}
                    </div>

                    {/* Categoría */}
                    <div>
                      <label 
                        className="block mb-2"
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: '20px',
                          color: '#374151'
                        }}
                      >
                        Categoría <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="relative">
                        <Tag 
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
                          style={{ color: '#9CA3AF' }}
                        />
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => handleChange('category', e.target.value)}
                          placeholder="Ej: Administración Pública"
                          className={`w-full border-2 rounded-lg transition-all ${
                            errors.category ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                          }`}
                          style={{
                            paddingLeft: '48px',
                            paddingRight: '16px',
                            paddingTop: '12px',
                            paddingBottom: '12px',
                            fontSize: '14px',
                            lineHeight: '20px',
                            height: '44px',
                            outline: 'none'
                          }}
                          onFocus={(e) => {
                            if (!errors.category) {
                              e.target.style.borderColor = '#003DA5';
                              e.target.style.boxShadow = '0 0 0 3px rgba(0, 61, 165, 0.1)';
                            }
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = errors.category ? '#EF4444' : '#D1D5DB';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      {errors.category && (
                        <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.category}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ubicación y Modalidad */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <MapPin className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Ubicación y Modalidad
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Ubicación <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleChange('location', e.target.value)}
                        placeholder="Ciudad"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                          errors.location 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                            : 'border-gray-200 focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.location && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.location}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Tipo de Ubicación <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.locationType}
                        onChange={(e) => handleChange('locationType', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer"
                      >
                        <option value="Presencial">Presencial</option>
                        <option value="Remoto">Remoto</option>
                        <option value="Híbrido">Híbrido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Tipo de Contrato <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.contractType}
                        onChange={(e) => handleChange('contractType', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer"
                      >
                        <option value="Tiempo Completo">Tiempo Completo</option>
                        <option value="Medio Tiempo">Medio Tiempo</option>
                        <option value="Por Proyecto">Por Proyecto</option>
                        <option value="Práctica">Práctica</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Compensación */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <DollarSign className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Compensación
                  </h3>
                  
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Rango Salarial <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.salary}
                      onChange={(e) => handleChange('salary', e.target.value)}
                      placeholder="Ej: $4.500.000 - $6.000.000"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                        errors.salary 
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                          : 'border-gray-200 focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]'
                      }`}
                    />
                    {errors.salary && (
                      <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {errors.salary}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Incluye el rango salarial mensual en pesos colombianos
                    </p>
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Descripción del Puesto
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Descripción <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Describe las responsabilidades y el perfil del puesto..."
                        rows={4}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all resize-vertical ${
                          errors.description 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                            : 'border-gray-200 focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]'
                        }`}
                        style={{
                          minHeight: '120px',
                          lineHeight: '20px'
                        }}
                      />
                      {errors.description && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Requisitos
                      </label>
                      <textarea
                        value={formData.requirements}
                        onChange={(e) => handleChange('requirements', e.target.value)}
                        placeholder="Lista los requisitos del puesto (formación, experiencia, habilidades)..."
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all resize-vertical"
                        style={{
                          minHeight: '100px',
                          lineHeight: '20px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Contacto y Fechas */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <Mail className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Contacto y Fechas
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Correo de Contacto <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.contactEmail}
                        onChange={(e) => handleChange('contactEmail', e.target.value)}
                        placeholder="correo@empresa.com"
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                          errors.contactEmail 
                            ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                            : 'border-gray-200 focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]'
                        }`}
                      />
                      {errors.contactEmail && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.contactEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Fecha Límite <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Calendar 
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                        />
                        <input
                          type="date"
                          value={formData.deadline}
                          onChange={(e) => handleChange('deadline', e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 border-2 rounded-lg focus:outline-none transition-all ${
                            errors.deadline 
                              ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                              : 'border-gray-200 focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5]'
                          }`}
                        />
                      </div>
                      {errors.deadline && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.deadline}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Etiquetas (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="Separadas por comas: Políticas Públicas, Análisis, Gobierno"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Agrega palabras clave separadas por comas para facilitar la búsqueda
                  </p>
                </div>
              </div>
            </div>

            {/* Footer - Botones según especificaciones Figma */}
            <div 
              className="px-8 py-6 border-t flex items-center justify-end gap-3"
              style={{
                background: '#F9FAFB',
                borderColor: '#E5E7EB'
              }}
            >
              {/* Botón Secundario */}
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: 'transparent',
                  color: '#003DA5',
                  border: '1px solid #003DA5',
                  height: '44px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F0F6FF';
                  e.currentTarget.style.borderColor = '#0052CC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#003DA5';
                }}
              >
                Cancelar
              </button>

              {/* Botón Primario */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background: isSubmitting ? '#9CA3AF' : '#003DA5',
                  color: '#FFFFFF',
                  border: 'none',
                  height: '44px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#002D7A';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 61, 165, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#003DA5';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Clock className="w-5 h-5" />
                    </motion.div>
                    <span>Creando...</span>
                  </>
                ) : (
                  <>
                    <Briefcase className="w-5 h-5" />
                    <span>Crear Oferta</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}