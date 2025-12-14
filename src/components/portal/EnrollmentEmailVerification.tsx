/**
 * PANTALLA 4b: VERIFICACIÓN POR EMAIL (OTP)
 * Se muestra cuando el documento es válido y se envió el código
 */

import { motion } from 'motion/react';
import { Mail, ArrowLeft, Clock, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect, useRef } from 'react';

interface EnrollmentEmailVerificationProps {
  email: string; // Email institucional del usuario
  document: string;
  onBack: () => void;
  onVerify: (code: string) => void;
  onResendCode: () => void;
  isVerifying: boolean;
}

export function EnrollmentEmailVerification({ 
  email, 
  document,
  onBack,
  onVerify,
  onResendCode,
  isVerifying 
}: EnrollmentEmailVerificationProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos = 300 segundos
  const [canResend, setCanResend] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Ocultar email parcialmente
  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (name.length <= 3) {
      return `${name[0]}***@${domain}`;
    }
    return `${name.substring(0, 2)}***@${domain}`;
  };

  const handleCodeChange = (index: number, value: string) => {
    // Solo permitir números
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length > 1) return;

    const newCode = [...code];
    newCode[index] = cleaned;
    setCode(newCode);

    // Limpiar error al escribir
    if (error) setError('');

    // Auto-focus siguiente input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit cuando se completa
    if (index === 5 && cleaned) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      
      // Auto-submit
      setTimeout(() => {
        handleVerify(pastedData);
      }, 100);
    }
  };

  const handleVerify = (fullCode: string) => {
    if (fullCode.length !== 6) {
      setError('Por favor ingresa el código completo de 6 dígitos');
      return;
    }
    
    onVerify(fullCode);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    
    setCode(['', '', '', '', '', '']);
    setError('');
    setTimeLeft(300);
    setCanResend(false);
    setResendCooldown(60); // 1 minuto de cooldown
    inputRefs.current[0]?.focus();
    
    onResendCode();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    handleVerify(fullCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
      {/* Header con logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full bg-white shadow-sm py-6"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {/* Botón Atrás */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-[#003DA5] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Atrás</span>
            </button>

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#003DA5] to-[#0052CC] rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">ESAP</span>
              </div>
            </div>

            {/* Espaciador */}
            <div className="w-16" />
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Progress Indicator */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="w-16 h-1 bg-[#003DA5]" />
              <div className="w-8 h-8 bg-[#003DA5] rounded-full flex items-center justify-center text-white text-sm font-bold">
                2
              </div>
              <div className="w-16 h-1 bg-gray-200" />
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-sm font-bold">
                3
              </div>
            </div>
            <p className="text-center text-xs text-gray-500">
              Paso 2 de 3: Verificación de correo
            </p>
          </motion.div>

          {/* Card Principal */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
          >
            {/* Header Card */}
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-8 text-white text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4"
              >
                <Mail className="w-10 h-10" strokeWidth={2.5} />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2">
                Verifica tu Correo
              </h2>
              <p className="text-white/90 text-sm">
                Hemos enviado un código de 6 dígitos a:
              </p>
              <p className="text-white font-bold text-lg mt-2">
                {maskEmail(email)}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              {/* Timer */}
              <div className="mb-6 flex items-center justify-center gap-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                <Clock className={`w-5 h-5 ${timeLeft <= 60 ? 'text-red-600' : 'text-orange-600'}`} />
                <div>
                  <p className="text-xs text-gray-600">El código expira en:</p>
                  <p className={`text-lg font-bold ${timeLeft <= 60 ? 'text-red-600' : 'text-orange-600'}`}>
                    {formatTime(timeLeft)}
                  </p>
                </div>
              </div>

              {/* OTP Inputs */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3 text-center">
                  Código de Verificación
                </label>
                
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isVerifying}
                      className={`w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold border-2 rounded-xl transition-all ${
                        error 
                          ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
                          : digit 
                            ? 'border-[#003DA5] bg-blue-50' 
                            : 'border-gray-200 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-100'
                      } ${isVerifying ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                      style={{ outline: 'none' }}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 text-center"
                  >
                    <p className="text-sm font-medium text-red-600">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isVerifying || code.join('').length !== 6}
                className="w-full h-14 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Verificar Código</span>
                    <svg 
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </Button>

              {/* Resend Code */}
              <div className="mt-6 text-center">
                {resendCooldown > 0 ? (
                  <p className="text-sm text-gray-500">
                    Podrás reenviar el código en{' '}
                    <span className="font-bold text-gray-700">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={!canResend && timeLeft > 0}
                    className={`text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                      canResend || timeLeft <= 0
                        ? 'text-[#003DA5] hover:text-[#002d7a] cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>¿No recibiste el código? Reenviar</span>
                  </button>
                )}
              </div>

              {/* Info Footer */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#003DA5]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#003DA5] mb-1">Revisa tu bandeja</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Si no ves el correo, revisa tu carpeta de spam o correo no deseado. El código es válido por 5 minutos.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Help Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-gray-500">
              ¿Problemas con la verificación?{' '}
              <a href="#" className="text-[#003DA5] font-medium hover:underline">
                Contacta soporte
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
