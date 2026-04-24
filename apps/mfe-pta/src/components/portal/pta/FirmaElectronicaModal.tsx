import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { X, Mail, ShieldCheck, QrCode, ArrowRight, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FirmaElectronicaModalProps {
  ptaId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (certificado: string) => void;
  nuevoEstado: string;
  correoDestino?: string;
}

export function FirmaElectronicaModal({
  ptaId,
  isOpen,
  onClose,
  onSuccess,
  nuevoEstado,
  correoDestino = 'tu correo institucional',
}: FirmaElectronicaModalProps) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const [step, setStep] = useState<'init' | 'otp' | 'success' | 'error'>('init');
  const [retryStep, setRetryStep] = useState<'init' | 'otp'>('init');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [certId, setCertId] = useState('');
  const [segsRestantes, setSegsRestantes] = useState(0);
  const expiresAtRef = useRef<Date | null>(null);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const generateOtpAndSend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pta/${ptaId}/generate-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('Error generando OTP');
      if (data.expiresAt) {
        expiresAtRef.current = new Date(data.expiresAt);
        setSegsRestantes(300);
      }
      setStep('otp');
    } catch (e: any) {
      setRetryStep('init');
      setErrorMsg(e.message || 'No se pudo generar el código. Intenta de nuevo.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpAndSign = async () => {
    const finalOtp = otp.join('');
    if (finalOtp.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pta/${ptaId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: finalOtp, nuevoEstado }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Error validando la firma.');
      setCertId(data.data?.certificado || '');
      setStep('success');
    } catch (e: any) {
      setRetryStep('otp');
      setErrorMsg(e.message || 'Código incorrecto. Verifica e intenta de nuevo.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Countdown de expiración
  useEffect(() => {
    if (step !== 'otp') return;
    const interval = setInterval(() => {
      if (!expiresAtRef.current) return;
      const secs = Math.max(0, Math.floor((expiresAtRef.current.getTime() - Date.now()) / 1000));
      setSegsRestantes(secs);
      if (secs === 0) {
        clearInterval(interval);
        onClose(); // cierra el modal y deja al usuario donde estaba
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (isOpen) {
      setStep('init');
      setRetryStep('init');
      setOtp(['', '', '', '', '', '']);
      setErrorMsg('');
      setCertId('');
      setSegsRestantes(0);
      expiresAtRef.current = null;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          {step !== 'success' && (
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="p-6 md:p-8">
            {step === 'init' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-[#EFF6FF] text-[#003DA5] rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Firma Electrónica Requerida</h3>
                <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                  Para proceder con el cambio de estado a <strong className="text-gray-700">{nuevoEstado}</strong>,
                  necesitamos verificar tu identidad mediante un código único de 6 dígitos que enviaremos a {correoDestino}.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={generateOtpAndSend}
                    disabled={loading}
                    className="w-full bg-[#003DA5] text-white py-3 px-4 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-800 transition-colors flex justify-center items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Mail className="w-4 h-4" /> Enviar Código al Correo</>}
                  </button>
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="w-full bg-white text-gray-600 py-3 px-4 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {step === 'otp' && (
              <div className="text-center">
                <div className="w-12 h-12 bg-[#EFF6FF] text-[#003DA5] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Ingresa el Código</h3>
                <p className="text-sm text-gray-500 mb-1">Enviado a {correoDestino}</p>
                {segsRestantes > 0 && (
                  <div className={`flex items-center justify-center gap-1 text-xs font-semibold mb-5 ${segsRestantes <= 60 ? 'text-red-500' : 'text-gray-400'}`}>
                    <Clock className="w-3 h-3" />
                    Expira en {Math.floor(segsRestantes / 60)}:{String(segsRestantes % 60).padStart(2, '0')}
                  </div>
                )}

                <div className="flex justify-center gap-2 mb-6">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      maxLength={1}
                      className="w-12 h-14 text-center text-xl font-bold text-[#003DA5] border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    />
                  ))}
                </div>

                <button
                  onClick={verifyOtpAndSign}
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full bg-[#059669] text-white py-3 px-4 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ShieldCheck className="w-4 h-4" /> Firmar Documento</>}
                </button>
              </div>
            )}

            {step === 'error' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-[#FEE2E2] text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Error de Verificación</h3>
                <p className="text-sm text-gray-500 mb-8">{errorMsg}</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setErrorMsg('');
                      setStep(retryStep);
                    }}
                    className="w-full bg-[#003DA5] text-white py-3 px-4 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-800 transition-colors"
                  >
                    Volver a intentar
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full bg-white text-gray-600 py-3 px-4 rounded-xl font-semibold text-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="text-center">
                <div className="relative">
                  <div className="w-20 h-20 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-emerald-100 rounded-full z-0"
                  />
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Firma Exitosa!</h3>
                <p className="text-sm text-gray-500 mb-6">
                  El documento ha sido firmado electrónicamente. Has generado un certificado válido.
                </p>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-xl mb-6 flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center border border-gray-100 shrink-0">
                    <QrCode className="w-8 h-8 text-[#003DA5]" />
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-wider font-bold text-gray-400 mb-0.5">Certificado N°</p>
                    <p className="text-sm font-mono font-bold text-gray-800 break-all leading-tight">{certId}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onSuccess(certId);
                  }}
                  className="w-full bg-[#003DA5] text-white py-3.5 px-4 rounded-xl font-bold text-sm hover:bg-blue-800 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Continuar al Reporte <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
