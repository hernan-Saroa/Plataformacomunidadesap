import React, { useState } from 'react';
import { X, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PasswordStrengthInput, usePasswordStrength, validatePassword } from './PasswordStrengthInput';
import { toast } from 'sonner';

interface ModalCambiarContrasenaProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  mode: 'admin-reset' | 'user-change'; // Admin resetea sin contraseña actual, usuario cambia con contraseña actual
}

export function ModalCambiarContrasena({
  isOpen,
  onClose,
  user,
  mode = 'admin-reset',
}: ModalCambiarContrasenaProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    passwordsMatch,
    isValid,
    strength,
    failedRules,
  } = usePasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (mode === 'user-change' && !currentPassword) {
      toast.error('Error de Validación', {
        description: 'Debe ingresar su contraseña actual',
      });
      return;
    }

    if (!password) {
      toast.error('Error de Validación', {
        description: 'Debe ingresar una nueva contraseña',
      });
      return;
    }

    if (!isValid) {
      toast.error('Contraseña No Válida', {
        description: `La contraseña no cumple los siguientes requisitos:\n${failedRules.join('\n')}`,
      });
      return;
    }

    if (!passwordsMatch) {
      toast.error('Error de Validación', {
        description: 'Las contraseñas no coinciden',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // En producción:
      // await changePassword({ userId: user.id, currentPassword, newPassword: password });

      toast.success('Contraseña Actualizada', {
        description: `La contraseña de ${user.firstName} ${user.lastName} ha sido cambiada exitosamente.`,
      });

      // Resetear formulario y cerrar
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error) {
      toast.error('Error al Cambiar Contraseña', {
        description: 'Ocurrió un error. Por favor intente nuevamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
          >
            {/* Header Limpio ESAP 2025 */}
            <div className="sticky top-0 bg-white border-b-2 border-gray-200 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {mode === 'admin-reset' ? 'Restablecer Contraseña' : 'Cambiar Contraseña'}
                    </h2>
                    <p className="text-xs text-gray-600">
                      {user.firstName} {user.lastName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Info del Usuario */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Política de Seguridad ESAP
                    </p>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1 list-disc list-inside">
                      <li>Vigencia de contraseña: 180 días</li>
                      <li>No reutilizar últimas 5 contraseñas</li>
                      <li>Bloqueo tras 5 intentos fallidos</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Contraseña Actual (solo si es cambio de usuario) */}
              {mode === 'user-change' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Contraseña Actual <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Ingrese su contraseña actual"
                      className="w-full pl-11 pr-4 py-3 border-2 border-gray-300 rounded-lg font-medium text-sm focus:border-[#2962FF] outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Nueva Contraseña con Validación */}
              <PasswordStrengthInput
                value={password}
                onChange={setPassword}
                label="Nueva Contraseña"
                placeholder="Cree una contraseña segura"
                showStrengthMeter={true}
                showRequirements={true}
                required={true}
                autoComplete="new-password"
              />

              {/* Confirmar Contraseña */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Confirmar Nueva Contraseña <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme su nueva contraseña"
                    className={`w-full pl-11 pr-4 py-3 border-2 rounded-lg font-medium text-sm outline-none transition-all ${
                      confirmPassword.length > 0 && !passwordsMatch
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-300 focus:border-[#2962FF]'
                    }`}
                    required
                  />
                </div>
                {confirmPassword.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs font-medium flex items-center gap-1 ${
                      passwordsMatch ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Las contraseñas coinciden
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Las contraseñas no coinciden
                      </>
                    )}
                  </motion.p>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !isValid || !passwordsMatch}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Cambiar Contraseña
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
