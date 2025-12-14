import React, { useState } from 'react';
import { X, User, Mail, Phone, Building2, Shield, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GestionAsignacionesSedes } from '../estructura-organizacional/GestionAsignacionesSedes';
import { GestionAsignacionesProgramas } from './GestionAsignacionesProgramas';
import type { CreateAsignacionSedeDTO, CreateAsignacionProgramaDTO } from '../../types';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateUser: (userData: UserData) => void;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  document: string;
  role: string;
  department: string;
  password: string;
  asignacionesSedes: CreateAsignacionSedeDTO[];
  asignacionesProgramas: CreateAsignacionProgramaDTO[];
  sedePrincipalId?: string;
}

const roles = [
  { id: 'super-admin', name: 'Super Administrador' },
  { id: 'director', name: 'Director' },
  { id: 'coordinator', name: 'Coordinador Académico' },
  { id: 'teacher', name: 'Docente' },
  { id: 'assistant', name: 'Auxiliar Administrativo' },
];

const departments = [
  { id: 'admin', name: 'Administración' },
  { id: 'academic', name: 'Académico' },
  { id: 'finance', name: 'Finanzas' },
  { id: 'hr', name: 'Recursos Humanos' },
  { id: 'it', name: 'Tecnología' },
  { id: 'operations', name: 'Operaciones' },
];

export function CreateUserModal({ isOpen, onClose, onCreateUser }: CreateUserModalProps) {
  const [formData, setFormData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    document: '',
    role: 'teacher',
    department: 'academic',
    password: '',
    asignacionesSedes: [],
    asignacionesProgramas: [],
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<UserData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UserData> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.document.trim()) newErrors.document = 'Documento requerido';
    if (!formData.password || formData.password.length < 8) {
      newErrors.password = 'Mínimo 8 caracteres';
    }
    
    // Validar asignaciones de sedes
    if (formData.asignacionesSedes.length === 0) {
      toast.error('Debe asignar al menos una sede al usuario');
      return false;
    }
    
    const tienePrincipal = formData.asignacionesSedes.some(a => a.esPrincipal);
    if (!tienePrincipal) {
      toast.error('Debe marcar una sede como principal');
      return false;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor corrige los errores del formulario');
      return;
    }
    
    onCreateUser(formData);
    
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      document: '',
      role: 'teacher',
      department: 'academic',
      password: '',
      asignacionesSedes: [],
      asignacionesProgramas: [],
    });
    setErrors({});
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-2xl my-8"
              style={{ boxShadow: 'var(--esap-shadow-2xl)' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div 
                className="px-6 py-5 border-b border-[--esap-gray-200]"
                style={{ background: 'linear-gradient(to bottom, #F9FAFB 0%, #FFFFFF 100%)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                        boxShadow: 'var(--esap-shadow-md)'
                      }}
                    >
                      <User className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[--esap-gray-900]">Crear Nuevo Usuario</h2>
                      <p className="text-sm text-[--esap-gray-600]">Complete la información del usuario</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg hover:bg-[--esap-gray-100] flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-[--esap-gray-500]" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Nombre *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.firstName 
                            ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20' 
                            : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                        }`}
                        placeholder="Ej: Juan"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-[--esap-danger]">{errors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Apellido *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.lastName 
                            ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20' 
                            : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                        }`}
                        placeholder="Ej: Pérez"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-[--esap-danger]">{errors.lastName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Correo Electrónico *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.email 
                            ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20' 
                            : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                        }`}
                        placeholder="usuario@esap.edu.co"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-[--esap-danger]">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Teléfono
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-[--esap-gray-300] rounded-xl focus:outline-none focus:ring-2 focus:ring-[--esap-primary]/20 focus:border-[--esap-primary] transition-all"
                        placeholder="300 123 4567"
                      />
                    </div>
                  </div>

                  {/* Document */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Documento *
                    </label>
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) => handleInputChange('document', e.target.value)}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                        errors.document 
                          ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20' 
                          : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                      }`}
                      placeholder="123456789"
                    />
                    {errors.document && (
                      <p className="mt-1 text-xs text-[--esap-danger]">{errors.document}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Contraseña *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          errors.password 
                            ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20' 
                            : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                        }`}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[--esap-gray-400] hover:text-[--esap-gray-600] transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-xs text-[--esap-danger]">{errors.password}</p>
                    )}
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Rol *
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <select
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-[--esap-gray-300] rounded-xl focus:outline-none focus:ring-2 focus:ring-[--esap-primary]/20 focus:border-[--esap-primary] transition-all appearance-none bg-white"
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Department */}
                  <div>
                    <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                      Departamento *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--esap-gray-400]" />
                      <select
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-[--esap-gray-300] rounded-xl focus:outline-none focus:ring-2 focus:ring-[--esap-primary]/20 focus:border-[--esap-primary] transition-all appearance-none bg-white"
                      >
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Asignaciones de Sedes */}
                <div className="mt-6">
                  <GestionAsignacionesSedes
                    asignaciones={formData.asignacionesSedes}
                    onChange={(asignaciones) => 
                      setFormData(prev => ({ ...prev, asignacionesSedes: asignaciones }))
                    }
                    sedePrincipalId={formData.sedePrincipalId}
                    onSedePrincipalChange={(sedePrincipalId) => 
                      setFormData(prev => ({ ...prev, sedePrincipalId }))
                    }
                    required={true}
                  />
                </div>

                {/* Asignaciones de Programas */}
                <div className="mt-6">
                  <GestionAsignacionesProgramas
                    asignaciones={formData.asignacionesProgramas}
                    onChange={(asignaciones) => 
                      setFormData(prev => ({ ...prev, asignacionesProgramas: asignaciones }))
                    }
                    sedesAsignadas={formData.asignacionesSedes.map(a => a.unidadId)}
                    required={true}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t border-[--esap-gray-200]">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-5 py-3 border border-[--esap-gray-300] bg-white text-[--esap-gray-700] rounded-xl font-semibold hover:bg-[--esap-gray-50] hover:border-[--esap-gray-400] transition-all"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    type="submit"
                    className="flex-1 px-5 py-3 text-white rounded-xl font-semibold transition-all"
                    style={{ 
                      background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                      boxShadow: 'var(--esap-shadow-md)' 
                    }}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Crear Usuario
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}