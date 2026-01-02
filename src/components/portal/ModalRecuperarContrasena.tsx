import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, CheckCircle, AlertCircle, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

/**
 * ============================================
 * MODAL RECUPERAR CONTRASEÑA - ESAP 2025
 * ============================================
 * 
 * Modal para solicitar recuperación de contraseña
 * con validación de correo institucional y flujo completo
 * 
 * Features:
 * - Validación de correo institucional ESAP
 * - Flujo de 2 pasos (solicitud → confirmación)
 * - Diseño ESAP 2025 limpio y profesional
 * - Validaciones en tiempo real
 * - Animaciones suaves con Motion
 * - 100% TypeScript
 */

interface ModalRecuperarContrasenaProps {
  isOpen: boolean;
  onClose: () => void;
}

type Paso = 'solicitud' | 'confirmacion';

export function ModalRecuperarContrasena({ isOpen, onClose }: ModalRecuperarContrasenaProps) {
  const [paso, setPaso] = useState<Paso>('solicitud');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Lista de correos institucionales válidos
  const correosValidos = [
    // Usuarios externos
    'estudiantes@esap.edu.co',
    'egresados@esap.edu.co',
    'docentes@esap.edu.co',
    'funcionario@esap.edu.co',
    'planta@esap.edu.co',
    // Usuarios internos
    'superuser@esap.edu.co',
    'rector@esap.edu.co',
    'director@esap.edu.co',
    'admin@esap.edu.co',
    'cerlaboral@esap.edu.co',
    'ar.empresarial@esap.edu.co',
    'arqempresarial@esap.edu.co',
    'gestion.legal@esap.edu.co',
    'ocig@esap.edu.co',
    'c.disciplinario@esap.edu.co',
    'registro.academico@esap.edu.co',
    'gestion.profesoral@esap.edu.co',
  ];

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setError('El correo electrónico es requerido');
      return false;
    }

    if (!email.includes('@')) {
      setError('Ingrese un correo válido');
      return false;
    }

    if (!email.endsWith('@esap.edu.co')) {
      setError('Debe usar un correo institucional ESAP (@esap.edu.co)');
      return false;
    }

    if (!correosValidos.includes(email.toLowerCase())) {
      setError('El correo ingresado no está registrado en el sistema');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast.error('Correo inválido', {
        description: error,
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Éxito - mostrar paso de confirmación
      setPaso('confirmacion');
      
      toast.success('¡Solicitud enviada exitosamente!', {
        description: 'Revisa tu correo electrónico',
        duration: 5000,
      });
    } catch (error) {
      toast.error('Error al enviar solicitud', {
        description: 'Por favor intenta nuevamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPaso('solicitud');
    setEmail('');
    setError('');
    setIsLoading(false);
    onClose();
  };

  const handleVolver = () => {
    setPaso('solicitud');
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
          >
            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#003DA5] rounded-xl flex items-center justify-center">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">
                        {paso === 'solicitud' ? 'Recuperar Contraseña' : 'Solicitud Enviada'}
                      </h2>
                      <p className="text-xs text-gray-600">
                        {paso === 'solicitud' ? 'Ingresa tu correo institucional' : 'Revisa tu correo electrónico'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {paso === 'solicitud' ? (
                    <motion.div
                      key="solicitud"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Información */}
                      <div className="mb-6">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-700">
                              Ingresa tu correo institucional ESAP. Te enviaremos un enlace para restablecer tu contraseña.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Form */}
                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Field */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Correo Electrónico Institucional
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => {
                                setEmail(e.target.value.toLowerCase());
                                setError('');
                              }}
                              onBlur={() => email && validateEmail(email)}
                              placeholder="correo@esap.edu.co"
                              className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl transition-all outline-none ${
                                error
                                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                  : 'border-gray-300 focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10'
                              }`}
                              disabled={isLoading}
                              autoFocus
                            />
                          </div>
                          {error && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="flex items-center gap-2 mt-2 text-red-600"
                            >
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <p className="text-sm">{error}</p>
                            </motion.div>
                          )}
                        </div>

                        {/* Requisitos */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-700 mb-2">Requisitos:</p>
                          <ul className="space-y-1.5">
                            <li className="flex items-center gap-2 text-xs text-gray-600">
                              <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${email.includes('@') ? 'text-green-600' : 'text-gray-400'}`} />
                              <span>Formato de correo válido</span>
                            </li>
                            <li className="flex items-center gap-2 text-xs text-gray-600">
                              <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${email.endsWith('@esap.edu.co') ? 'text-green-600' : 'text-gray-400'}`} />
                              <span>Dominio institucional @esap.edu.co</span>
                            </li>
                            <li className="flex items-center gap-2 text-xs text-gray-600">
                              <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${correosValidos.includes(email.toLowerCase()) ? 'text-green-600' : 'text-gray-400'}`} />
                              <span>Cuenta registrada en el sistema</span>
                            </li>
                          </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
                            disabled={isLoading}
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={isLoading || !email || !!error}
                            className="flex-1 px-4 py-3 bg-[#003DA5] text-white rounded-xl hover:bg-[#002870] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Enviando...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Enviar Solicitud</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="confirmacion"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="text-center"
                    >
                      {/* Success Icon */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </motion.div>

                      {/* Message */}
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        ¡Solicitud Enviada!
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Hemos enviado un enlace de recuperación a:
                      </p>

                      {/* Email Display */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-[#003DA5] font-medium">
                          <Mail className="w-5 h-5" />
                          <span>{email}</span>
                        </div>
                      </div>

                      {/* Instructions */}
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Pasos a seguir:</p>
                        <ol className="space-y-2">
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#003DA5] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <span>Revisa tu bandeja de entrada y carpeta de spam</span>
                          </li>
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#003DA5] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                            <span>Haz clic en el enlace de recuperación</span>
                          </li>
                          <li className="flex items-start gap-3 text-sm text-gray-600">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#003DA5] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                            <span>Crea una nueva contraseña segura</span>
                          </li>
                        </ol>
                      </div>

                      {/* Info */}
                      <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl mb-6">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700 text-left">
                          El enlace expirará en <strong>24 horas</strong>. Si no lo recibes, revisa tu carpeta de spam o solicita uno nuevo.
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleClose}
                          className="w-full px-4 py-3 bg-[#003DA5] text-white rounded-xl hover:bg-[#002870] transition-all font-medium shadow-lg"
                        >
                          Entendido
                        </button>
                        <button
                          onClick={handleVolver}
                          className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center justify-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Enviar a otro correo</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
