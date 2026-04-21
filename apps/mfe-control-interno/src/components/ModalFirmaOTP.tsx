import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Shield, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';

export interface FirmaElectronicaMetadata {
  otp: string;
  fechaFirma: string;
  metodo: 'OTP_EMAIL';
}

interface ModalFirmaOTPProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (metadata: FirmaElectronicaMetadata) => void;
  userEmail: string;
  userName: string;
  accionDetalle?: string;
}

export function ModalFirmaOTP({ isOpen, onClose, onSuccess, userEmail, userName, accionDetalle = 'Aprobación de Documento' }: ModalFirmaOTPProps) {
  const [paso, setPaso] = useState<'generando' | 'ingresando' | 'verificando'>('generando');
  const [otpGenerado, setOtpGenerado] = useState('');
  const [otpIngresado, setOtpIngresado] = useState(['', '', '', '', '', '']);
  const [errorOTP, setErrorOTP] = useState(false);
  const [tiempoRestante, setTiempoRestante] = useState(300); // 5 minutos
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer para OTP
  useEffect(() => {
    if (isOpen && paso === 'ingresando' && tiempoRestante > 0) {
      const interval = setInterval(() => {
        setTiempoRestante(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (isOpen && paso === 'generando') {
      enviarOTP();
    }
  }, [isOpen, paso, tiempoRestante]);

  // Generar y "enviar" OTP
  const enviarOTP = () => {
    setPaso('generando');
    setOtpIngresado(['', '', '', '', '', '']);
    setErrorOTP(false);
    
    // Generación de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setOtpGenerado(code);
    
    setTimeout(() => {
      setTiempoRestante(300);
      setPaso('ingresando');
      toast.success('Código de seguridad enviado', {
        description: `Se ha enviado un correo a ${userEmail}`,
      });
      // Sólo en dev/simulación: Mostramos el código por consola o toast
      console.log('OTP CODE:', code);
      toast.info(`🔐 MODO PRUEBA ALERTA CORREO - Tu código es: ${code}`, { duration: 10000 });
      
      // Auto-focus en el primer input después de un ciclo de renderizado
      setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
    }, 1500);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOTP = [...otpIngresado];
    newOTP[index] = value.slice(-1);
    setOtpIngresado(newOTP);
    setErrorOTP(false);

    // Auto-focus siguiente
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    } else if (value && index === 5) {
      // Validar si están todos llenos
      const completo = [...newOTP].join('');
      if (completo.length === 6) {
        // Puede disparar verificación automática si lo desea, 
        // pero preferible que den clic al botón.
      }
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpIngresado[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOTP = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
    setOtpIngresado(newOTP);
    const lastIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  const handleVerificar = () => {
    const codeIngresado = otpIngresado.join('');
    if (codeIngresado.length !== 6) return;

    setPaso('verificando');

    setTimeout(() => {
      if (codeIngresado === otpGenerado) {
        toast.success('Firma Digital Aprobada', {
          description: 'Identidad validada exitosamente.',
        });
        const metadata: FirmaElectronicaMetadata = {
          otp: codeIngresado,
          fechaFirma: new Date().toISOString(),
          metodo: 'OTP_EMAIL'
        };
        onSuccess(metadata);
        handleCierre();
      } else {
        setErrorOTP(true);
        setPaso('ingresando');
        setOtpIngresado(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
        toast.error('Código incorrecto', {
          description: 'El código proporcionado no coincide.',
        });
      }
    }, 1500);
  };

  const formatearTiempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const handleCierre = () => {
    setPaso('generando');
    setOtpGenerado('');
    setOtpIngresado(['', '', '', '', '', '']);
    setErrorOTP(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-lg border overflow-hidden"
        >
          {paso === 'generando' && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
               <Loader2 className="w-12 h-12 text-[#1e5da8] animate-spin mb-4" />
               <h3 className="text-xl font-bold text-gray-900">Generando Firma Digital...</h3>
               <p className="text-sm text-gray-500 mt-2">Estamos creando tu token de alta seguridad hacia el correo.</p>
            </div>
          )}

          {(paso === 'ingresando' || paso === 'verificando') && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-900 to-[#1e5da8] text-white p-6 relative">
                 <button onClick={handleCierre} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-inner shrink-0">
                     <Shield className="w-6 h-6 text-white"/>
                   </div>
                   <div>
                     <h2 className="text-xl font-bold">Firma Electrónica</h2>
                     <p className="text-blue-100 text-sm font-medium mt-1">Token de Seguridad OTP</p>
                   </div>
                 </div>
              </div>

              {/* Body */}
              <div className="p-8">
                 <div className="text-center mb-6">
                   <h3 className="text-lg font-bold text-gray-900">{accionDetalle}</h3>
                   <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mx-auto w-full inline-block mt-3 text-sm text-gray-700 font-medium">
                     Validando identidad de <span className="font-bold text-[#1e5da8]">{userName}</span><br/>
                     <span className="text-gray-500 text-xs">{userEmail}</span>
                   </div>
                 </div>

                 <p className="text-center text-sm text-gray-600 mb-4">Ingresa el código de 6 dígitos que fue enviado temporalmente a tu correo electrónico para sellar este flujo.</p>

                 <div className="flex justify-center gap-2 mb-6" onPaste={handleOTPPaste}>
                    {otpIngresado.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        disabled={paso === 'verificando'}
                        className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg transition-colors ${
                          errorOTP 
                            ? 'border-red-500 bg-red-50 text-red-700' 
                            : digit 
                            ? 'border-[#1e5da8] bg-blue-50 text-[#1e5da8]' 
                            : 'border-gray-200 bg-gray-50 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'
                        } outline-none focus:outline-none`}
                      />
                    ))}
                 </div>

                 {errorOTP && (
                    <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4 bg-red-50 py-2 rounded-lg font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>El código ingresado es incorrecto.</span>
                    </div>
                 )}

                 <div className="flex justify-between items-center text-sm font-semibold p-4 bg-gray-50 rounded-xl mb-6">
                   <span className="text-gray-500 flex items-center gap-1.5"><Key className="w-4 h-4"/> Expiración:</span>
                   <span className={`${tiempoRestante < 60 ? 'text-red-600 animate-pulse' : 'text-[#1e5da8]'} font-mono text-base`}>{formatearTiempo(tiempoRestante)}</span>
                 </div>

                 <div className="flex gap-3">
                    <button 
                      onClick={enviarOTP}
                      disabled={paso === 'verificando' || tiempoRestante > 240}
                      className="px-4 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors shrink-0 disabled:opacity-50"
                    >
                      Reenviar OTP
                    </button>
                    <button 
                      onClick={handleVerificar}
                      disabled={paso === 'verificando' || otpIngresado.join('').length !== 6}
                      className="flex-1 bg-[#1e5da8] hover:bg-[#154682] text-white font-bold rounded-xl transition-all shadow-[0_rgba(30,93,168,0.3)_0px_8px_16px] disabled:opacity-50 disabled:shadow-none py-3 flex items-center justify-center gap-2"
                    >
                      {paso === 'verificando' ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                      ) : (
                        <><CheckCircle2 className="w-5 h-5" /> Firmar Aprobación</>
                      )}
                    </button>
                 </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
