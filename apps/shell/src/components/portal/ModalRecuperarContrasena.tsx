import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Mail, CheckCircle, AlertCircle, ArrowLeft,
  Send, Loader2, KeyRound, ShieldCheck, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import authService from '../../services/api/authService';

/**
 * ============================================
 * MODAL RECUPERAR CONTRASEÑA CON OTP - ESAP 2025
 * ============================================
 *
 * Flujo de 3 pasos:
 *   1. Solicitar OTP → se envía al correo registrado
 *   2. Verificar OTP → 6 dígitos con auto-advance
 *   3. Nueva contraseña → con confirmación y validaciones
 *
 * Funciona como respaldo cuando el SSO (Microsoft) está caído.
 */

interface ModalRecuperarContrasenaProps {
  isOpen: boolean;
  onClose: () => void;
}

type Paso = 'solicitud' | 'otp' | 'nueva-contrasena' | 'exito';

/* ─── Reglas de contraseña ────────────────────────────────────────────── */
const PASSWORD_RULES = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { id: 'digit', label: 'Un número', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Un carácter especial (!@#$%...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function ModalRecuperarContrasena({ isOpen, onClose }: ModalRecuperarContrasenaProps) {
  const [paso, setPaso] = useState<Paso>('solicitud');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expiresIn, setExpiresIn] = useState(600); // 10 min default
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Countdown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (paso !== 'otp' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [paso, countdown]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ─── Reset state ──────────────────────────────────────────────────
  const handleClose = () => {
    setPaso('solicitud');
    setEmail('');
    setOtpDigits(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    setError('');
    setIsLoading(false);
    setCountdown(0);
    setCanResend(false);
    onClose();
  };

  // ─── Paso 1: Solicitar OTP ────────────────────────────────────────
  const handleSolicitarOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Ingresa un correo electrónico válido');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await authService.forgotPassword(trimmedEmail);
      const ttl = result?.expiresInSeconds || 600;
      setExpiresIn(ttl);
      setCountdown(ttl);
      setCanResend(false);
      setPaso('otp');
      toast.success('Código enviado', {
        description: `Revisa tu correo ${trimmedEmail}`,
        duration: 4000,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message
        || err?.data?.message
        || err?.message
        || 'No se pudo enviar el código. Verifica tu correo.';
      setError(msg);
      toast.error('Error', { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Reenviar OTP ──────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');
    setOtpDigits(['', '', '', '', '', '']);

    try {
      const result = await authService.forgotPassword(email.trim().toLowerCase());
      const ttl = result?.expiresInSeconds || 600;
      setCountdown(ttl);
      setCanResend(false);
      toast.success('Nuevo código enviado', { description: `Revisa tu correo ${email}` });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Error al reenviar';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP input handlers ───────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);
    setError('');

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  // ─── Paso 2: Verificar OTP ────────────────────────────────────────
  const otpCode = otpDigits.join('');
  const isOtpComplete = otpCode.length === 6;

  const handleVerifyOtp = useCallback(async () => {
    if (!isOtpComplete || isLoading) return;
    setIsLoading(true);
    setError('');

    try {
      await authService.verifyResetCode(email.trim().toLowerCase(), otpCode);
      setPaso('nueva-contrasena');
      toast.success('Código verificado', { description: 'Ahora crea tu nueva contraseña' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'Código inválido';
      setError(msg);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [isOtpComplete, isLoading, email, otpCode]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (isOtpComplete && paso === 'otp') {
      handleVerifyOtp();
    }
  }, [isOtpComplete, paso, handleVerifyOtp]);

  // ─── Paso 3: Nueva contraseña ─────────────────────────────────────
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const allRulesPass = PASSWORD_RULES.every((r) => r.test(newPassword));
  const canSubmitPassword = passwordsMatch && allRulesPass && !isLoading;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitPassword) return;

    setIsLoading(true);
    setError('');

    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        code: otpCode,
        newPassword,
      });
      setPaso('exito');
      toast.success('¡Contraseña actualizada!', {
        description: 'Ya puedes iniciar sesión con tu nueva contraseña',
        duration: 5000,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.data?.message || err?.message || 'No se pudo actualizar la contraseña';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Títulos dinámicos ────────────────────────────────────────────
  const headers: Record<Paso, { title: string; subtitle: string }> = {
    solicitud: { title: 'Recuperar Contraseña', subtitle: 'Ingresa tu correo registrado' },
    otp: { title: 'Verificar Código', subtitle: 'Ingresa el código enviado a tu correo' },
    'nueva-contrasena': { title: 'Nueva Contraseña', subtitle: 'Crea una contraseña segura' },
    exito: { title: '¡Listo!', subtitle: 'Tu contraseña fue actualizada' },
  };

  const icons: Record<Paso, React.ReactNode> = {
    solicitud: <Mail className="w-5 h-5 text-white" />,
    otp: <KeyRound className="w-5 h-5 text-white" />,
    'nueva-contrasena': <ShieldCheck className="w-5 h-5 text-white" />,
    exito: <CheckCircle className="w-5 h-5 text-white" />,
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
            {/* Modal */}
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
                      {icons[paso]}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">{headers[paso].title}</h2>
                      <p className="text-xs text-gray-600">{headers[paso].subtitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Step indicator */}
                {paso !== 'exito' && (
                  <div className="flex gap-2 mt-3">
                    {['solicitud', 'otp', 'nueva-contrasena'].map((s, i) => (
                      <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= ['solicitud', 'otp', 'nueva-contrasena'].indexOf(paso)
                            ? 'bg-[#003DA5]'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">

                  {/* ───────── PASO 1: EMAIL ───────── */}
                  {paso === 'solicitud' && (
                    <motion.div
                      key="solicitud"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="mb-5">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            Ingresa tu correo institucional. Te enviaremos un <strong>código de 6 dígitos</strong> para verificar tu identidad y cambiar la contraseña.
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSolicitarOtp} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Correo Electrónico
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              id="recovery-email"
                              type="email"
                              value={email}
                              onChange={(e) => { setEmail(e.target.value); setError(''); }}
                              placeholder="tu.correo@esap.edu.co"
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
                            disabled={isLoading || !email.trim()}
                            className="flex-1 px-4 py-3 bg-[#003DA5] text-white rounded-xl hover:bg-[#002870] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /><span>Enviando...</span></>
                            ) : (
                              <><Send className="w-4 h-4" /><span>Enviar Código</span></>
                            )}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* ───────── PASO 2: OTP ───────── */}
                  {paso === 'otp' && (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="mb-5">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-gray-700">
                            <p>Enviamos un código de verificación a:</p>
                            <p className="font-semibold text-[#003DA5] mt-1">{email}</p>
                          </div>
                        </div>
                      </div>

                      {/* OTP Input */}
                      <div className="flex justify-center gap-3 mb-5" onPaste={handleOtpPaste}>
                        {otpDigits.map((digit, i) => (
                          <input
                            key={i}
                            id={`otp-${i}`}
                            ref={(el) => { otpRefs.current[i] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(i, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                            className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl outline-none transition-all ${
                              digit
                                ? 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
                                : error
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-gray-300 focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10'
                            }`}
                            disabled={isLoading}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>

                      {/* Countdown / Resend */}
                      <div className="text-center mb-4">
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2 text-[#003DA5]">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Verificando...</span>
                          </div>
                        ) : countdown > 0 ? (
                          <p className="text-sm text-gray-500">
                            El código vence en <span className="font-semibold text-[#003DA5]">{formatTime(countdown)}</span>
                          </p>
                        ) : (
                          <p className="text-sm text-orange-600 font-medium">El código ha expirado</p>
                        )}
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600"
                        >
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <p className="text-sm">{error}</p>
                        </motion.div>
                      )}

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleResendOtp}
                          disabled={!canResend && countdown > 0}
                          className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          <span>{canResend || countdown <= 0 ? 'Reenviar Código' : 'Reenviar código disponible pronto'}</span>
                        </button>
                        <button
                          onClick={() => { setPaso('solicitud'); setError(''); setOtpDigits(['', '', '', '', '', '']); }}
                          className="w-full px-4 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Cambiar correo
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ───────── PASO 3: NUEVA CONTRASEÑA ───────── */}
                  {paso === 'nueva-contrasena' && (
                    <motion.div
                      key="nueva-contrasena"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <form onSubmit={handleResetPassword} className="space-y-4">
                        {/* New password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Nueva Contraseña
                          </label>
                          <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              id="new-password"
                              type={showPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                              placeholder="Mínimo 8 caracteres"
                              className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10 outline-none transition-all"
                              disabled={isLoading}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        {/* Confirm password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Confirmar Contraseña
                          </label>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                              id="confirm-password"
                              type={showConfirm ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                              placeholder="Repite la contraseña"
                              className={`w-full pl-12 pr-12 py-3 border-2 rounded-xl outline-none transition-all ${
                                confirmPassword && !passwordsMatch
                                  ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                  : confirmPassword && passwordsMatch
                                    ? 'border-green-300 bg-green-50 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                    : 'border-gray-300 focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10'
                              }`}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {confirmPassword && !passwordsMatch && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-sm text-red-600 mt-1.5 flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5" /> Las contraseñas no coinciden
                            </motion.p>
                          )}
                        </div>

                        {/* Password rules */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-700 mb-2.5">Requisitos de seguridad:</p>
                          <ul className="space-y-1.5">
                            {PASSWORD_RULES.map((rule) => {
                              const pass = rule.test(newPassword);
                              return (
                                <li key={rule.id} className="flex items-center gap-2 text-xs">
                                  <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${
                                    pass ? 'text-green-600' : 'text-gray-300'
                                  }`} />
                                  <span className={pass ? 'text-green-700 font-medium' : 'text-gray-500'}>{rule.label}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>

                        {error && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600"
                          >
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p className="text-sm">{error}</p>
                          </motion.div>
                        )}

                        <div className="flex gap-3 pt-1">
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
                            disabled={!canSubmitPassword}
                            className="flex-1 px-4 py-3 bg-[#003DA5] text-white rounded-xl hover:bg-[#002870] transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /><span>Guardando...</span></>
                            ) : (
                              <><ShieldCheck className="w-4 h-4" /><span>Cambiar Contraseña</span></>
                            )}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}

                  {/* ───────── ÉXITO ───────── */}
                  {paso === 'exito' && (
                    <motion.div
                      key="exito"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                      className="text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                      >
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </motion.div>

                      <h3 className="text-xl font-bold text-gray-900 mb-3">¡Contraseña Actualizada!</h3>
                      <p className="text-gray-600 mb-6">
                        Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                      </p>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-2 text-[#003DA5] font-medium">
                          <Mail className="w-5 h-5" />
                          <span>{email}</span>
                        </div>
                      </div>

                      <button
                        onClick={handleClose}
                        className="w-full px-4 py-3 bg-[#003DA5] text-white rounded-xl hover:bg-[#002870] transition-all font-medium shadow-lg"
                      >
                        Ir a Iniciar Sesión
                      </button>
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
