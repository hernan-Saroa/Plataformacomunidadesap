/**
 * MODAL - EDITAR USUARIO CON GESTIÓN DE SEDES
 * Permite editar información básica y asignaciones de sedes múltiples
 */

import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Shield, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { GestionAsignacionesSedes } from '../estructura-organizacional/GestionAsignacionesSedes';
import type { CreateAsignacionSedeDTO } from '../../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserDataEdit) => void;
  user: UserToEdit;
}

interface UserToEdit {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  document: string;
  roles: Array<{ name: string; color: string }>;
  status: string;
  asignacionesSedes?: any[];
  sedePrincipalId?: string;
}

interface UserDataEdit {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  asignacionesSedes: CreateAsignacionSedeDTO[];
  sedePrincipalId?: string;
}

const roles = [
  { id: 'super-admin', name: 'Super Administrador' },
  { id: 'director', name: 'Director' },
  { id: 'coordinator', name: 'Coordinador Académico' },
  { id: 'teacher', name: 'Docente' },
  { id: 'assistant', name: 'Auxiliar Administrativo' },
  { id: 'student', name: 'Estudiante' },
  { id: 'graduate', name: 'Graduado' },
];

export function EditUserModal({ isOpen, onClose, onSave, user }: EditUserModalProps) {
  const [formData, setFormData] = useState<UserDataEdit>({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    status: user.status,
    asignacionesSedes: user.asignacionesSedes || [],
    sedePrincipalId: user.sedePrincipalId,
  });

  const [errors, setErrors] = useState<Partial<UserDataEdit>>({});

  // Actualizar form data cuando cambia el usuario
  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        status: user.status,
        asignacionesSedes: user.asignacionesSedes || [],
        sedePrincipalId: user.sedePrincipalId,
      });
    }
  }, [user]);

  const validateForm = (): boolean => {
    const newErrors: Partial<UserDataEdit> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
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

    onSave(formData);
    toast.success('Usuario actualizado exitosamente');
    onClose();
  };

  const handleInputChange = (field: keyof UserDataEdit, value: any) => {
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
            className="fixed inset-0 backdrop-blur-sm z-[200]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-3xl my-8"
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
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        boxShadow: 'var(--esap-shadow-md)'
                      }}
                    >
                      <User className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[--esap-gray-900]">Editar Usuario</h2>
                      <p className="text-sm text-[--esap-gray-600]">
                        {user.firstName} {user.lastName}
                      </p>
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
                {/* Información Básica */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Información Básica
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                      <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.firstName
                          ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20'
                          : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                          }`}
                        placeholder="Ej: Juan"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-[--esap-danger]">{errors.firstName}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                        Apellido *
                      </label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.lastName
                          ? 'border-[--esap-danger] focus:ring-[--esap-danger]/20'
                          : 'border-[--esap-gray-300] focus:ring-[--esap-primary]/20 focus:border-[--esap-primary]'
                          }`}
                        placeholder="Ej: Pérez"
                      />
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
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all ${errors.email
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

                    {/* Estado */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-[--esap-gray-700] mb-2">
                        Estado
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="w-full px-4 py-2.5 border border-[--esap-gray-300] rounded-xl focus:outline-none focus:ring-2 focus:ring-[--esap-primary]/20 focus:border-[--esap-primary] transition-all appearance-none bg-white"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="blocked">Bloqueado</option>
                        <option value="pending">Pendiente</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Asignaciones de Sedes */}
                <div className="border-t border-gray-200 pt-6">
                  <GestionAsignacionesSedes
                    asignaciones={formData.asignacionesSedes}
                    onChange={(asignaciones) =>
                      handleInputChange('asignacionesSedes', asignaciones)
                    }
                    sedePrincipalId={formData.sedePrincipalId}
                    onSedePrincipalChange={(sedePrincipalId) =>
                      handleInputChange('sedePrincipalId', sedePrincipalId)
                    }
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
                    className="flex-1 px-5 py-3 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      boxShadow: 'var(--esap-shadow-md)'
                    }}
                    whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Save className="w-4 h-4" />
                    Guardar Cambios
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