/**
 * MODAL: CREAR USUARIO MANUAL (1 a 1)
 * Enrolamiento individual administrativo
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  UserPlus, 
  FileText, 
  Mail,
  Phone,
  MapPin,
  Building2,
  Shield,
  AlertCircle,
  Clock,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface CreateUserManualModalProps {
  onClose: () => void;
}

export function CreateUserManualModal({ onClose }: CreateUserManualModalProps) {
  const [formData, setFormData] = useState({
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    secondName: '',
    lastName: '',
    secondLastName: '',
    institutionalEmail: '',
    phone: '',
    personalEmail: '',
    mainRole: '',
    sede: '',
    program: '',
    initialStatus: 'Activo',
    enrollmentMethod: 'CODIGO_CORREO',
    temporalPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roles = [
    'Estudiante Pregrado',
    'Estudiante Posgrado',
    'Docente Tiempo Completo',
    'Docente Cátedra',
    'Personal Administrativo',
    'Graduado'
  ];

  const sedes = [
    'Bogotá (Sede Principal)',
    'Antioquia',
    'Valle del Cauca',
    'Santander',
    'Boyacá',
    'Cundinamarca',
    'Tolima',
    'Huila'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.documentNumber.trim()) newErrors.documentNumber = 'Campo obligatorio';
    if (!formData.firstName.trim()) newErrors.firstName = 'Campo obligatorio';
    if (!formData.lastName.trim()) newErrors.lastName = 'Campo obligatorio';
    if (!formData.secondLastName.trim()) newErrors.secondLastName = 'Campo obligatorio';
    
    if (!formData.institutionalEmail.trim()) {
      newErrors.institutionalEmail = 'Campo obligatorio';
    } else if (!formData.institutionalEmail.endsWith('@esap.edu.co')) {
      newErrors.institutionalEmail = 'Debe ser correo institucional @esap.edu.co';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Campo obligatorio';
    } else if (!/^3[0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = 'Formato inválido (ej: 3001234567)';
    }
    
    if (!formData.mainRole) newErrors.mainRole = 'Campo obligatorio';
    if (!formData.sede) newErrors.sede = 'Campo obligatorio';

    if (formData.enrollmentMethod === 'CONTRASENA_TEMPORAL' && !formData.temporalPassword) {
      newErrors.temporalPassword = 'Debe ingresar contraseña temporal';
    }

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
      const userName = `${formData.firstName} ${formData.lastName}`;
      toast.success('Usuario Creado Exitosamente', {
        description: `${userName} - ${formData.institutionalEmail}`,
      });
      
      // Notificación adicional sobre el código
      if (formData.enrollmentMethod === 'CODIGO_CORREO') {
        setTimeout(() => {
          toast.info('Código Enviado', {
            description: `Se envió código de verificación a ${formData.institutionalEmail}`,
          });
        }, 1000);
      }
      
      setIsSubmitting(false);
      onClose();
    }, 2000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[111] flex items-center justify-center p-4"
        style={{
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, type: 'spring', damping: 25 }}
          className="bg-white rounded-2xl w-full overflow-hidden"
          style={{
            maxWidth: '900px',
            maxHeight: '90vh',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-8 pt-8 pb-6 border-b"
            style={{
              background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
              borderColor: '#002D7A'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <UserPlus className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 
                    className="font-bold text-white"
                    style={{
                      fontSize: '24px',
                      lineHeight: '32px',
                      letterSpacing: '0px'
                    }}
                  >
                    Nuevo Usuario - Enrolamiento Manual
                  </h2>
                  <p 
                    className="font-normal mt-1"
                    style={{
                      fontSize: '14px',
                      lineHeight: '20px',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}
                  >
                    Crea un usuario individual y envía código de verificación
                  </p>
                </div>
              </div>
              
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
                {/* Información Personal */}
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
                    Información Personal
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Tipo de Documento */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Tipo de Documento <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.documentType}
                        onChange={(e) => handleChange('documentType', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-[#D1D5DB] rounded-lg bg-white cursor-pointer"
                        style={{ height: '44px' }}
                      >
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="PA">Pasaporte</option>
                      </select>
                    </div>

                    {/* Número de Documento */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Número de Documento <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.documentNumber}
                        onChange={(e) => handleChange('documentNumber', e.target.value)}
                        placeholder="Ej: 1234567890"
                        className={`w-full px-4 py-3 border-2 rounded-lg ${
                          errors.documentNumber ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{ height: '44px' }}
                      />
                      {errors.documentNumber && (
                        <p className="mt-1 text-xs text-[#EF4444] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors.documentNumber}
                        </p>
                      )}
                    </div>

                    {/* Primer Nombre */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Primer Nombre <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        placeholder="Juan"
                        className={`w-full px-4 py-3 border-2 rounded-lg ${
                          errors.firstName ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{ height: '44px' }}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.firstName}</p>
                      )}
                    </div>

                    {/* Segundo Nombre */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Segundo Nombre
                      </label>
                      <input
                        type="text"
                        value={formData.secondName}
                        onChange={(e) => handleChange('secondName', e.target.value)}
                        placeholder="Carlos (opcional)"
                        className="w-full px-4 py-3 border-2 border-[#D1D5DB] rounded-lg"
                        style={{ height: '44px' }}
                      />
                    </div>

                    {/* Primer Apellido */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Primer Apellido <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        placeholder="García"
                        className={`w-full px-4 py-3 border-2 rounded-lg ${
                          errors.lastName ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{ height: '44px' }}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.lastName}</p>
                      )}
                    </div>

                    {/* Segundo Apellido */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Segundo Apellido <span className="text-[#EF4444]">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.secondLastName}
                        onChange={(e) => handleChange('secondLastName', e.target.value)}
                        placeholder="López"
                        className={`w-full px-4 py-3 border-2 rounded-lg ${
                          errors.secondLastName ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{ height: '44px' }}
                      />
                      {errors.secondLastName && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.secondLastName}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información de Contacto */}
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
                    Información de Contacto
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Correo Institucional */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Correo Institucional ESAP <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.institutionalEmail.replace('@esap.edu.co', '')}
                          onChange={(e) => handleChange('institutionalEmail', e.target.value + '@esap.edu.co')}
                          placeholder="usuario"
                          className={`flex-1 px-4 py-3 border-2 rounded-lg ${
                            errors.institutionalEmail ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                          }`}
                          style={{ height: '44px' }}
                        />
                        <span className="text-sm font-medium" style={{ color: '#6B7280' }}>
                          @esap.edu.co
                        </span>
                      </div>
                      {errors.institutionalEmail && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.institutionalEmail}</p>
                      )}
                    </div>

                    {/* Teléfono */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Teléfono Celular <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => handleChange('phone', e.target.value)}
                          placeholder="3001234567"
                          className={`w-full pl-12 pr-4 py-3 border-2 rounded-lg ${
                            errors.phone ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                          }`}
                          style={{ height: '44px' }}
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.phone}</p>
                      )}
                    </div>

                    {/* Correo Personal */}
                    <div className="md:col-span-2">
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Correo Personal (opcional)
                      </label>
                      <input
                        type="email"
                        value={formData.personalEmail}
                        onChange={(e) => handleChange('personalEmail', e.target.value)}
                        placeholder="usuario@gmail.com"
                        className="w-full px-4 py-3 border-2 border-[#D1D5DB] rounded-lg"
                        style={{ height: '44px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Información Académica/Laboral */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Información Académica/Laboral
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Rol Principal */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Rol Principal <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.mainRole}
                        onChange={(e) => handleChange('mainRole', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg bg-white ${
                          errors.mainRole ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{ height: '44px' }}
                      >
                        <option value="">Seleccionar rol...</option>
                        {roles.map(role => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      {errors.mainRole && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.mainRole}</p>
                      )}
                    </div>

                    {/* Sede */}
                    <div>
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Sede/Territorial <span className="text-[#EF4444]">*</span>
                      </label>
                      <select
                        value={formData.sede}
                        onChange={(e) => handleChange('sede', e.target.value)}
                        className={`w-full px-4 py-3 border-2 rounded-lg bg-white ${
                          errors.sede ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                        }`}
                        style={{ height: '44px' }}
                      >
                        <option value="">Seleccionar sede...</option>
                        {sedes.map(sede => (
                          <option key={sede} value={sede}>{sede}</option>
                        ))}
                      </select>
                      {errors.sede && (
                        <p className="mt-1 text-xs text-[#EF4444]">{errors.sede}</p>
                      )}
                    </div>

                    {/* Programa */}
                    <div className="md:col-span-2">
                      <label className="block mb-2 text-sm font-medium" style={{ color: '#374151' }}>
                        Programa/Dependencia
                      </label>
                      <input
                        type="text"
                        value={formData.program}
                        onChange={(e) => handleChange('program', e.target.value)}
                        placeholder="Ej: Administración Pública"
                        className="w-full px-4 py-3 border-2 border-[#D1D5DB] rounded-lg"
                        style={{ height: '44px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Método de Enrolamiento */}
                <div>
                  <h3 
                    className="font-semibold mb-4 flex items-center gap-2"
                    style={{
                      fontSize: '18px',
                      lineHeight: '24px',
                      color: '#1F2937'
                    }}
                  >
                    <Shield className="w-5 h-5" style={{ color: '#003DA5' }} />
                    Método de Enrolamiento
                  </h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                      style={{ borderColor: formData.enrollmentMethod === 'CODIGO_CORREO' ? '#003DA5' : '#D1D5DB' }}
                    >
                      <input
                        type="radio"
                        name="enrollmentMethod"
                        value="CODIGO_CORREO"
                        checked={formData.enrollmentMethod === 'CODIGO_CORREO'}
                        onChange={(e) => handleChange('enrollmentMethod', e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>
                          Enviar código de verificación por correo (Recomendado)
                        </p>
                        <p className="text-xs" style={{ color: '#6B7280' }}>
                          El usuario completará su enrolamiento ingresando el código de 6 dígitos
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                      style={{ borderColor: formData.enrollmentMethod === 'CONTRASENA_TEMPORAL' ? '#003DA5' : '#D1D5DB' }}
                    >
                      <input
                        type="radio"
                        name="enrollmentMethod"
                        value="CONTRASENA_TEMPORAL"
                        checked={formData.enrollmentMethod === 'CONTRASENA_TEMPORAL'}
                        onChange={(e) => handleChange('enrollmentMethod', e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-sm mb-1" style={{ color: '#1F2937' }}>
                          Crear con contraseña temporal
                        </p>
                        <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
                          Crea una contraseña temporal que el usuario deberá cambiar en el primer ingreso
                        </p>
                        {formData.enrollmentMethod === 'CONTRASENA_TEMPORAL' && (
                          <input
                            type="password"
                            value={formData.temporalPassword}
                            onChange={(e) => handleChange('temporalPassword', e.target.value)}
                            placeholder="Contraseña temporal (mín. 8 caracteres)"
                            className={`w-full px-4 py-2 border-2 rounded-lg text-sm ${
                              errors.temporalPassword ? 'border-[#EF4444]' : 'border-[#D1D5DB]'
                            }`}
                          />
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div 
              className="px-8 py-6 border-t flex items-center justify-end gap-3"
              style={{
                background: '#F9FAFB',
                borderColor: '#E5E7EB'
              }}
            >
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
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Cancelar
              </button>

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
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = '#003DA5';
                    e.currentTarget.style.boxShadow = 'none';
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
                    <CheckCircle className="w-5 h-5" />
                    <span>Crear Usuario</span>
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