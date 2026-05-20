/**
 * FirmaDigitalPTA — Componente de firma digital para aprobación N3
 *
 * Simula el proceso de firma digital institucional:
 * 1. Verificación de identidad (PIN de 6 dígitos)
 * 2. Generación de hash SHA-256 del documento PTA
 * 3. Sello de tiempo (timestamp certificado)
 * 4. Confirmación visual con certificado de firma
 *
 * Se integra en el modal de aprobación del Backoffice cuando el estado
 * es "Pendiente Gestión Profesoral" (última aprobación antes de APROBADO).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, Key, CheckCircle, Lock, FileSignature,
  Fingerprint, Clock, AlertTriangle, Loader2, X, Award,
} from 'lucide-react';
import { toast } from 'sonner';

interface FirmaDigitalPTAProps {
  ptaId: string;
  docenteNombre: string;
  periodo: string;
  totalHoras: number;
  firmanteNombre: string;
  firmanteCargo: string;
  etapaLabel: string;
  correoDestino?: string;
  onVerifyCodigo?: (codigo: string) => Promise<void>;
  onFirmaCompleta: (firmaData: FirmaData) => void;
  onCancelar: () => void;
}

export interface FirmaData {
  hash: string;
  timestamp: string;
  firmante: string;
  cargo: string;
  pin_verificado: boolean;
  certificado_id: string;
  ptaId: string;
}

type FirmaStep = 'verificacion' | 'generando' | 'confirmacion' | 'completado';

function generateHash(input: string): string {
  // Simulated SHA-256 hash generation
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const ts = Date.now().toString(16);
  return `SHA256:${hex}${ts}${hex.split('').reverse().join('')}`.substring(0, 64);
}

function generateCertificateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ESAP-CERT-';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if ((i + 1) % 4 === 0 && i < 11) result += '-';
  }
  return result;
}

export function FirmaDigitalPTA({
  ptaId, docenteNombre, periodo, totalHoras,
  firmanteNombre, firmanteCargo, etapaLabel, correoDestino,
  onVerifyCodigo,
  onFirmaCompleta, onCancelar,
}: FirmaDigitalPTAProps) {
  const [step, setStep] = useState<FirmaStep>('verificacion');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [firmaData, setFirmaData] = useState<FirmaData | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [timerSecs, setTimerSecs] = useState(5 * 60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const onCancelarRef = useRef(onCancelar);
  useEffect(() => { onCancelarRef.current = onCancelar; }, [onCancelar]);

  // Focus first input on mount
  useEffect(() => {
    if (step === 'verificacion') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // 5-minute session timer — closes modal if PIN not entered in time
  useEffect(() => {
    if (step !== 'verificacion') return;
    setTimerSecs(5 * 60);
    const interval = setInterval(() => {
      setTimerSecs(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onCancelarRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const handlePinChange = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[idx] = value;
    setPin(newPin);
    setPinError('');

    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    // Auto-verify when all digits filled
    if (newPin.join('').length === 6) {
      verificarPin(newPin.join(''));
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const verificarPin = useCallback(async (pinValue: string) => {
    if (pinValue.length !== 6 || !/^\d{6}$/.test(pinValue)) {
      setIntentos(prev => prev + 1);
      setPinError('Código inválido. Ingrese los 6 dígitos.');
      setPin(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }

    setVerifyingPin(true);
    try {
      if (onVerifyCodigo) {
        await onVerifyCodigo(pinValue);
      }
    } catch (error: any) {
      setIntentos(prev => prev + 1);
      setPinError(error?.message || 'Código incorrecto. Verifica e intenta nuevamente.');
      setPin(['', '', '', '', '', '']);
      setVerifyingPin(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }
    setVerifyingPin(false);
    setStep('generando');

    const hashInput = `${ptaId}|${docenteNombre}|${periodo}|${totalHoras}|${firmanteNombre}|${Date.now()}`;
    const hash = generateHash(hashInput);
    const certId = generateCertificateId();
    const timestamp = new Date().toISOString();

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 25 + 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        const firmaPayload: FirmaData = {
          hash,
          timestamp,
          firmante: firmanteNombre,
          cargo: firmanteCargo,
          pin_verificado: true,
          certificado_id: certId,
          ptaId,
        };
        setFirmaData(firmaPayload);
        setStep('confirmacion');
      }
      setGeneratingProgress(Math.min(progress, 100));
    }, 400);
  }, [ptaId, docenteNombre, periodo, totalHoras, firmanteNombre, firmanteCargo, onVerifyCodigo]);

  const confirmarFirma = () => {
    if (firmaData) {
      setStep('completado');
      setTimeout(() => {
        onFirmaCompleta(firmaData);
        toast.success('Firma digital aplicada correctamente');
      }, 1500);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '5vh', padding: '5vh 16px 16px', background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)', padding: '22px 28px', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield style={{ width: 22, height: 22 }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>Firma Digital Institucional</h3>
                <p style={{ fontSize: '0.75rem', opacity: 0.85, margin: '2px 0 0' }}>{etapaLabel} — {firmanteCargo}</p>
              </div>
            </div>
            <button onClick={onCancelar} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          {/* Progress indicator */}
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {['Verificación', 'Generación', 'Confirmación', 'Completado'].map((label, i) => {
              const stepIdx = ['verificacion', 'generando', 'confirmacion', 'completado'].indexOf(step);
              return (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ height: 3, borderRadius: 2, background: i <= stepIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)', transition: 'background 0.3s' }} />
                  <span style={{ fontSize: '0.58rem', opacity: i <= stepIdx ? 1 : 0.5, marginTop: 4, display: 'block' }}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document summary */}
        <div style={{ padding: '14px 28px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <div><span style={{ color: '#6B7280' }}>Docente:</span> <strong style={{ color: '#111827' }}>{docenteNombre}</strong></div>
          <div><span style={{ color: '#6B7280' }}>Periodo:</span> <strong>{periodo}</strong></div>
          <div><span style={{ color: '#6B7280' }}>Horas:</span> <strong>{totalHoras}h</strong></div>
          <div><span style={{ color: '#6B7280' }}>PTA:</span> <strong>{ptaId.substring(0, 10)}...</strong></div>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 28px 24px' }}>
          <AnimatePresence mode="wait">
            {/* Step 1: PIN Verification */}
            {step === 'verificacion' && (
              <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Key style={{ width: 26, height: 26, color: '#003DA5' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Verificación de identidad</h4>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                    Ingrese el código de 6 dígitos enviado a {correoDestino || 'su correo institucional'}
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 18px', borderRadius: 24, background: timerSecs <= 60 ? '#FEF2F2' : '#F3F4F6', border: `2px solid ${timerSecs <= 60 ? '#FECACA' : '#E5E7EB'}`, boxShadow: timerSecs <= 60 ? '0 0 12px rgba(220,38,38,0.15)' : 'none' }}>
                    <Clock style={{ width: 20, height: 20, color: timerSecs <= 60 ? '#DC2626' : '#6B7280' }} />
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: timerSecs <= 60 ? '#DC2626' : '#374151', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
                      {Math.floor(timerSecs / 60)}:{String(timerSecs % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => { inputRefs.current[i] = el; }}
                      type="password"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handlePinChange(i, e.target.value)}
                      onKeyDown={e => handlePinKeyDown(i, e)}
                      disabled={intentos >= 3 || verifyingPin}
                      style={{
                        width: 48, height: 56, borderRadius: 12, border: pinError ? '2px solid #FCA5A5' : '2px solid #D1D5DB',
                        textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, outline: 'none',
                        background: intentos >= 3 || verifyingPin ? '#F3F4F6' : 'white',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#003DA5'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = pinError ? '#FCA5A5' : '#D1D5DB'; }}
                    />
                  ))}
                </div>

                {pinError && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', margin: '8px 0', fontSize: '0.78rem', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <AlertTriangle style={{ width: 14, height: 14 }} /> {pinError}
                  </motion.div>
                )}

                {verifyingPin && (
                  <div style={{ textAlign: 'center', margin: '8px 0', fontSize: '0.78rem', color: '#003DA5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Validando código...
                  </div>
                )}

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                    <Lock style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    El código vence en 5 minutos
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Generating signature */}
            {step === 'generando' && (
              <motion.div key="gen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3E8FF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Fingerprint style={{ width: 26, height: 26, color: '#7C3AED', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Generando firma digital...</h4>

                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden', marginBottom: 12 }}>
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${generatingProgress}%` }}
                      style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #7C3AED, #003DA5)' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', padding: '12px 16px', background: '#F9FAFB', borderRadius: 10 }}>
                    {[
                      { label: 'Verificando credenciales', done: generatingProgress > 20 },
                      { label: 'Generando hash SHA-256', done: generatingProgress > 45 },
                      { label: 'Aplicando sello de tiempo', done: generatingProgress > 70 },
                      { label: 'Vinculando certificado', done: generatingProgress > 90 },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                        {item.done ? (
                          <CheckCircle style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
                        ) : (
                          <Loader2 style={{ width: 14, height: 14, color: '#6B7280', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                        )}
                        <span style={{ color: item.done ? '#059669' : '#6B7280', fontWeight: item.done ? 600 : 400 }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <style>{`
                  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
                  @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirmacion' && firmaData && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <FileSignature style={{ width: 26, height: 26, color: '#059669' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Firma generada exitosamente</h4>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Revise los datos y confirme la firma</p>
                </div>

                {/* Certificado visual */}
                <div style={{ border: '2px solid #003DA5', borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ background: '#003DA5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award style={{ width: 18, height: 18, color: '#FDE68A' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>Certificado de Firma Digital</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>ESAP 2026</span>
                  </div>
                  <div style={{ padding: '14px 16px', background: '#FAFBFF' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.78rem' }}>
                      <div>
                        <div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>CERTIFICADO</div>
                        <div style={{ color: '#111827', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.72rem' }}>{firmaData.certificado_id}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>FIRMANTE</div>
                        <div style={{ color: '#111827', fontWeight: 600 }}>{firmaData.firmante}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>CARGO</div>
                        <div style={{ color: '#111827' }}>{firmaData.cargo}</div>
                      </div>
                      <div>
                        <div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>TIMESTAMP</div>
                        <div style={{ color: '#111827', fontSize: '0.72rem' }}>{new Date(firmaData.timestamp).toLocaleString('es-CO')}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#F3F4F6', borderRadius: 6 }}>
                      <div style={{ color: '#6B7280', fontSize: '0.62rem', fontWeight: 600, marginBottom: 2 }}>HASH SHA-256</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#374151', wordBreak: 'break-all' }}>{firmaData.hash}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={onCancelar} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={confirmarFirma} style={{ flex: 2, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,61,165,0.35)' }}>
                    <FileSignature style={{ width: 16, height: 16 }} /> Confirmar y firmar
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Completed */}
            {step === 'completado' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', border: '3px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}
                  >
                    <CheckCircle style={{ width: 38, height: 38, color: '#059669' }} />
                  </motion.div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065F46', margin: '0 0 6px' }}>PTA Aprobado y Firmado</h4>
                  <p style={{ fontSize: '0.85rem', color: '#059669' }}>La firma digital ha sido aplicada exitosamente</p>
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 8 }}>
                    Certificado: <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: 4, fontSize: '0.68rem' }}>{firmaData?.certificado_id}</code>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
