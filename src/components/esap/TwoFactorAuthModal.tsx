import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Mail, Clock, RefreshCw, Check, X, Key, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { twoFactorAuthService } from '../../services/api/twoFactorAuthService';

interface TwoFactorAuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerify: (success: boolean) => void;
  roleName?: string;
}

export function TwoFactorAuthModal({
  open,
  onOpenChange,
  email,
  onVerify,
  roleName
}: TwoFactorAuthModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutos
  const [error, setError] = useState('');
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Auto-focus first input on open
  useEffect(() => {
    if (open && inputsRef.current[0]) {
      setTimeout(() => inputsRef.current[0]?.focus(), 100);
    }
  }, [open]);

  // Handle digit input
  const handleDigitChange = (index: number, value: string) => {
    // Solo permitir números
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-verify cuando se completen los 6 dígitos
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  // Handle backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      setError('');
      
      // Auto-verify
      handleVerify(pastedData);
    }
  };

  // Verify code
  const handleVerify = async (codeToVerify?: string) => {
    const verificationCode = codeToVerify || code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Por favor ingresa los 6 dígitos');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await twoFactorAuthService.verifyCode(email, verificationCode);

      if (response.success) {
        toast.success('Verificación Exitosa', {
          description: 'Código correcto. Accediendo al sistema...'
        });
        
        // Pequeño delay para mostrar el mensaje
        setTimeout(() => {
          onVerify(true);
          onOpenChange(false);
        }, 800);
      } else {
        setError(response.message);
        setCode(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
        
        toast.error('Código Incorrecto', {
          description: response.message
        });
      }
    } catch (error) {
      setError('Error al verificar el código');
      toast.error('Error de Verificación', {
        description: 'Ocurrió un error al verificar el código'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend code
  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setCode(['', '', '', '', '', '']);

    try {
      const response = await twoFactorAuthService.resendCode(email);
      
      if (response.success) {
        setTimeRemaining(response.expiresIn);
        toast.success('Código Reenviado', {
          description: 'Se ha enviado un nuevo código a tu correo'
        });
        inputsRef.current[0]?.focus();
      } else {
        toast.error('Error al Reenviar', {
          description: response.message
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: 'No se pudo reenviar el código'
      });
    } finally {
      setIsResending(false);
    }
  };

  // Format time remaining
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px]"
        onPointerDownOutside={(e) => e.preventDefault()} // Prevenir cierre accidental
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1e5da8] to-blue-600 flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <DialogTitle className="text-2xl font-extrabold text-center text-[--esap-gray-900]">
            Verificación en Dos Pasos
          </DialogTitle>
          <DialogDescription className="text-center text-base font-medium">
            {roleName && (
              <span className="block mb-2">
                El rol <span className="font-bold text-[#1e5da8]">{roleName}</span> requiere autenticación adicional
              </span>
            )}
            Ingresa el código de 6 dígitos enviado a{' '}
            <span className="font-bold text-[--esap-gray-900]">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Code Inputs */}
          <div>
            <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Input
                    ref={(el) => (inputsRef.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-extrabold border-2 transition-all ${
                      error
                        ? 'border-red-500 bg-red-50'
                        : digit
                        ? 'border-[#1e5da8] bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isVerifying}
                  />
                </motion.div>
              ))}
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-red-600 text-sm font-medium justify-center"
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-600 uppercase">Tiempo Restante</span>
              </div>
              <p className={`text-2xl font-extrabold ${
                timeRemaining < 60 ? 'text-red-600' : 'text-blue-900'
              }`}>
                {formatTime(timeRemaining)}
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-purple-600 uppercase">Código Enviado</span>
              </div>
              <p className="text-2xl font-extrabold text-purple-900">
                <Check className="w-6 h-6" />
              </p>
            </div>
          </div>

          {/* Helper Text */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border-2 border-amber-200">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 mb-1">
                  ¿No recibiste el código?
                </p>
                <ul className="text-xs font-medium text-amber-700 space-y-1">
                  <li>• Revisa tu carpeta de spam o correo no deseado</li>
                  <li>• Verifica que el correo sea correcto</li>
                  <li>• Espera unos segundos, puede tardar en llegar</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleVerify()}
              disabled={code.join('').length !== 6 || isVerifying}
              className="w-full bg-gradient-to-r from-[#1e5da8] to-blue-600 hover:from-[#1a4d8a] hover:to-blue-700 text-white font-bold h-12 shadow-lg disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                  </motion.div>
                  Verificando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Verificar Código
                </>
              )}
            </Button>

            <Button
              onClick={handleResend}
              disabled={isResending || timeRemaining > 240} // Solo permitir reenvío después de 1 minuto
              variant="outline"
              className="w-full font-bold border-2 h-12"
            >
              {isResending ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                  </motion.div>
                  Reenviando...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Reenviar Código
                  {timeRemaining > 240 && (
                    <span className="ml-2 text-xs text-gray-500">
                      (disponible en {formatTime(timeRemaining - 240)})
                    </span>
                  )}
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                onVerify(false);
                onOpenChange(false);
              }}
              variant="ghost"
              className="w-full font-bold text-gray-600 hover:text-gray-900"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar Inicio de Sesión
            </Button>
          </div>
        </div>

        {/* Demo Info */}
        <div className="bg-gray-100 rounded-lg p-3 border border-gray-300">
          <p className="text-xs font-medium text-gray-600 text-center">
            <span className="font-bold">🔍 MODO DEMOSTRACIÓN:</span> Revisa la consola del navegador para ver el código generado
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
