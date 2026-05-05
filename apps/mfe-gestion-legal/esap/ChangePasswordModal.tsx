import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Lock, Key, ArrowRight, ArrowLeft, CheckCircle2, 
  Shield, Eye, EyeOff, Loader2, AlertCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string; // Si está autenticado, ya tenemos el email
  mode: 'authenticated' | 'forgot-password'; // authenticated = desde perfil, forgot = desde login
}

type Step = 'request' | 'verify' | 'change' | 'success';

export function ChangePasswordModal({ 
  isOpen, 
  onClose, 
  userEmail,
  mode 
}: ChangePasswordModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('request');
  const [email, setEmail] = useState(userEmail || '');
  const [token, setToken] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Reset al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(mode === 'authenticated' ? 'verify' : 'request');
      setEmail(userEmail || '');
      setToken(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setCountdown(0);
      setCanResend(false);
    }
  }, [isOpen, userEmail, mode]);

  // Countdown para reenvío
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && currentStep === 'verify') {
      setCanResend(true);
    }
  }, [countdown, currentStep]);

  // Auto-focus en siguiente input del token
  const handleTokenChange = (index: number, value: string) => {
    if (value.length > 1) return; // Solo 1 dígito
    if (!/^\d*$/.test(value)) return; // Solo números

    const newToken = [...token];
    newToken[index] = value;
    setToken(newToken);

    // Auto-focus siguiente input
    if (value && index < 5) {
      const nextInput = document.getElementById(`token-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Backspace en input vacío va al anterior
  const handleTokenKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !token[index] && index > 0) {
      const prevInput = document.getElementById(`token-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Paso 1: Solicitar token
  const handleRequestToken = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Por favor ingresa un correo válido');
      return;
    }

    setIsLoading(true);
    try {
      // En producción: enviar email con código
      // await api.sendPasswordResetCode(email);
      
      toast.success('Código enviado a tu correo', {
        description: `Revisa tu bandeja de entrada en ${email}`,
        duration: 5000,
      });
      
      setCurrentStep('verify');
      setCountdown(60); // 60 segundos para reenviar
    } catch (error) {
      toast.error('Error al enviar el código', {
        description: 'Por favor intenta nuevamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 2: Verificar token
  const handleVerifyToken = async () => {
    const tokenValue = token.join('');
    if (tokenValue.length !== 6) {
      toast.error('Ingresa el código completo de 6 dígitos');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔑 Token verificado:', tokenValue);
      toast.success('Código verificado correctamente');
      
      setCurrentStep('change');
    } catch (error) {
      toast.error('Código incorrecto o expirado', {
        description: 'Verifica el código o solicita uno nuevo',
      });
      setToken(['', '', '', '', '', '']);
      document.getElementById('token-0')?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Paso 3: Cambiar contraseña
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('🔒 Contraseña cambiada para:', email);
      toast.success('Contraseña actualizada exitosamente');
      
      setCurrentStep('success');
      
      // Auto-cerrar después de 3 segundos
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      toast.error('Error al cambiar la contraseña', {
        description: 'Por favor intenta nuevamente',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reenviar código
  const handleResendToken = async () => {
    setCanResend(false);
    setCountdown(60);
    setToken(['', '', '', '', '', '']);
    
    try {
      // TODO: API call - Reenviar token
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Nuevo código enviado');
      document.getElementById('token-0')?.focus();
    } catch (error) {
      toast.error('Error al reenviar el código');
    }
  };

  // Validación de fortaleza de contraseña
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#22c55e'];
  const strengthLabels = ['Muy débil', 'Débil', 'Media', 'Fuerte', 'Muy fuerte'];

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con Gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1e5da8] via-[#2563eb] to-[#3b82f6]">
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{
                    background: [
                      'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                      'radial-gradient(circle at 80% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)',
                    ]
                  }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>

              <div className="relative p-6">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all border border-white/20 group"
                >
                  <X className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                </button>

                <div className="flex items-center gap-3 text-white">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                    {currentStep === 'success' ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Lock className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black">
                      {currentStep === 'request' && 'Recuperar Contraseña'}
                      {currentStep === 'verify' && 'Verificar Código'}
                      {currentStep === 'change' && 'Nueva Contraseña'}
                      {currentStep === 'success' && '¡Listo!'}
                    </h2>
                    <p className="text-sm text-white/80">
                      {currentStep === 'request' && 'Te enviaremos un código de verificación'}
                      {currentStep === 'verify' && 'Revisa tu correo electrónico'}
                      {currentStep === 'change' && 'Crea una contraseña segura'}
                      {currentStep === 'success' && 'Contraseña actualizada'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {['request', 'verify', 'change'].map((step, index) => {
                  const stepIndex = ['request', 'verify', 'change', 'success'].indexOf(currentStep);
                  const isActive = index <= stepIndex;
                  const isCurrent = currentStep === step;

                  return (
                    <div key={step} className="flex items-center flex-1">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-all ${
                        isActive 
                          ? 'bg-[#1e5da8] text-white shadow-md' 
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                        {index + 1}
                      </div>
                      {index < 2 && (
                        <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                          isActive ? 'bg-[#1e5da8]' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Request Token */}
                {currentStep === 'request' && (
                  <motion.div
                    key="request"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[#1e5da8] flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900 mb-1">
                          Te enviaremos un código de 6 dígitos
                        </p>
                        <p className="text-gray-600">
                          Revisa tu correo institucional (incluyendo spam)
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="correo@esap.edu.co"
                          className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e5da8] outline-none transition-all"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleRequestToken}
                      disabled={isLoading || !email}
                      className="w-full py-3 bg-gradient-to-r from-[#1e5da8] to-[#2563eb] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Enviando código...
                        </>
                      ) : (
                        <>
                          Enviar Código
                          <ArrowRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Step 2: Verify Token */}
                {currentStep === 'verify' && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                      <Key className="w-8 h-8 text-[#1e5da8] mx-auto mb-2" />
                      <p className="font-semibold text-gray-900 mb-1">
                        Código enviado a
                      </p>
                      <p className="text-sm text-gray-600">{email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 text-center">
                        Ingresa el código de 6 dígitos
                      </label>
                      <div className="flex gap-2 justify-center">
                        {token.map((digit, index) => (
                          <input
                            key={index}
                            id={`token-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleTokenChange(index, e.target.value)}
                            onKeyDown={(e) => handleTokenKeyDown(index, e)}
                            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#1e5da8] outline-none transition-all"
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Countdown / Resend */}
                    <div className="text-center">
                      {countdown > 0 ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          Reenviar código en {countdown}s
                        </div>
                      ) : (
                        <button
                          onClick={handleResendToken}
                          disabled={!canResend}
                          className="text-sm text-[#1e5da8] hover:text-[#174a8a] font-semibold disabled:opacity-50"
                        >
                          ¿No recibiste el código? Reenviar
                        </button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCurrentStep('request')}
                        disabled={isLoading}
                        className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <ArrowLeft className="w-5 h-5" />
                        Atrás
                      </button>
                      <button
                        onClick={handleVerifyToken}
                        disabled={isLoading || token.join('').length !== 6}
                        className="flex-1 py-3 bg-gradient-to-r from-[#1e5da8] to-[#2563eb] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          <>
                            Verificar
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Change Password */}
                {currentStep === 'change' && (
                  <motion.div
                    key="change"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        Código verificado. Ahora crea tu nueva contraseña
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Nueva Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e5da8] outline-none transition-all"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Password Strength */}
                      {newPassword && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-all"
                                style={{
                                  backgroundColor: i < passwordStrength ? strengthColors[passwordStrength - 1] : '#e5e7eb'
                                }}
                              />
                            ))}
                          </div>
                          <p className="text-xs font-semibold" style={{ color: strengthColors[passwordStrength - 1] || '#6b7280' }}>
                            {strengthLabels[passwordStrength - 1] || 'Muy débil'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repite tu contraseña"
                          className="w-full pl-11 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#1e5da8] outline-none transition-all"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>

                      {/* Match Indicator */}
                      {confirmPassword && (
                        <div className="mt-2 flex items-center gap-2">
                          {newPassword === confirmPassword ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <p className="text-xs text-green-600 font-semibold">Las contraseñas coinciden</p>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <p className="text-xs text-red-600 font-semibold">Las contraseñas no coinciden</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      className="w-full py-3 bg-gradient-to-r from-[#1e5da8] to-[#2563eb] text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Cambiar Contraseña
                        </>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Step 4: Success */}
                {currentStep === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-8"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                      className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
                    >
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </motion.div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">
                      ¡Contraseña Actualizada!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Tu contraseña ha sido cambiada exitosamente
                    </p>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-gradient-to-r from-[#1e5da8] to-[#2563eb] text-white font-bold rounded-xl hover:shadow-lg transition-all"
                    >
                      Entendido
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}