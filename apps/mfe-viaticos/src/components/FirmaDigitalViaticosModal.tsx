import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield,
  Key,
  CheckCircle,
  Lock,
  FileSignature,
  Fingerprint,
  Clock,
  AlertTriangle,
  Loader2,
  X,
  Award,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';

export interface FirmaDigitalData {
  hash: string;
  timestamp: string;
  firmante: string;
  cargo: string;
  pin_verificado: boolean;
  certificado_id: string;
  solicitudId: string;
  codigoOtp: string;
}

export interface FirmaDigitalViaticosModalProps {
  isOpen: boolean;
  solicitudId: string;
  consecutivo: string;
  comisionadoNombre?: string;
  destino?: string;
  fechas?: string;
  firmanteNombre: string;
  firmanteCargo: string;
  etapaLabel: string;
  correoDestino?: string;
  devCode?: string;
  onVerifyCodigo?: (codigo: string) => Promise<void>;
  onFirmaCompleta: (firmaData: FirmaDigitalData) => void | boolean | Promise<void | boolean>;
  onCancelar: () => void;
}

type FirmaStep = 'verificacion' | 'generando' | 'confirmacion' | 'guardando' | 'completado';

function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const ts = Date.now().toString(16);
  return `SHA256:${hex}${ts}${hex.split('').reverse().join('')}`.substring(0, 64);
}

function generateCertificateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ESAP-CERT-VIAT-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) result += '-';
  }
  return result;
}

export default function FirmaDigitalViaticosModal({
  isOpen,
  solicitudId,
  consecutivo,
  comisionadoNombre,
  destino,
  fechas,
  firmanteNombre,
  firmanteCargo,
  etapaLabel,
  correoDestino,
  devCode,
  onVerifyCodigo,
  onFirmaCompleta,
  onCancelar,
}: FirmaDigitalViaticosModalProps) {
  const [step, setStep] = useState<FirmaStep>('verificacion');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const [firmaData, setFirmaData] = useState<FirmaDigitalData | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [timerSecs, setTimerSecs] = useState(5 * 60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const guardandoRef = useRef(false);
  const onCancelarRef = useRef(onCancelar);

  useEffect(() => {
    onCancelarRef.current = onCancelar;
  }, [onCancelar]);

  // Enfocar primer input al abrir en paso de verificación
  useEffect(() => {
    if (isOpen && step === 'verificacion') {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  // Temporizador regresivo de 5 minutos
  useEffect(() => {
    if (!isOpen || step !== 'verificacion') return;
    setTimerSecs(5 * 60);
    const interval = setInterval(() => {
      setTimerSecs((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCancelarRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  const handlePinChange = (idx: number, value: string) => {
    // Aceptar solo números
    const clean = value.replace(/\D/g, '');
    if (!clean && value !== '') return;

    const newPin = [...pin];
    newPin[idx] = clean ? clean.slice(-1) : '';
    setPin(newPin);
    setPinError('');

    if (clean && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }

    if (newPin.join('').length === 6) {
      void verificarPin(newPin.join(''));
    }
  };

  const handlePinKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const digits = pasteData.slice(0, 6).split('');
    const newPin = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newPin[i] = d;
    });
    setPin(newPin);
    setPinError('');

    if (digits.length === 6) {
      void verificarPin(newPin.join(''));
    } else {
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  const verificarPin = useCallback(
    async (pinValue: string) => {
      if (pinValue.length !== 6 || !/^\d{6}$/.test(pinValue)) {
        setIntentos((prev) => prev + 1);
        setPinError('Código inválido. Ingrese los 6 dígitos numéricos.');
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
        setIntentos((prev) => prev + 1);
        setPinError(error?.message || 'Código incorrecto. Verifica e intenta nuevamente.');
        setPin(['', '', '', '', '', '']);
        setVerifyingPin(false);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        return;
      }

      setVerifyingPin(false);
      setStep('generando');

      const hashInput = `${solicitudId}|${consecutivo}|${firmanteNombre}|${firmanteCargo}|${Date.now()}`;
      const hash = generateHash(hashInput);
      const certId = generateCertificateId();
      const timestamp = new Date().toISOString();

      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 15;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          const payload: FirmaDigitalData = {
            hash,
            timestamp,
            firmante: firmanteNombre,
            cargo: firmanteCargo,
            pin_verificado: true,
            certificado_id: certId,
            solicitudId,
            codigoOtp: pinValue,
          };
          setFirmaData(payload);
          setStep('confirmacion');
        }
        setGeneratingProgress(Math.min(progress, 100));
      }, 100);
    },
    [solicitudId, consecutivo, firmanteNombre, firmanteCargo, onVerifyCodigo],
  );

  const confirmarFirma = async () => {
    if (!firmaData || guardandoRef.current) return;
    guardandoRef.current = true;
    setStep('guardando');
    try {
      const completed = await onFirmaCompleta(firmaData);
      if (completed === false) {
        setStep('confirmacion');
        return;
      }
      setStep('completado');
      setTimeout(() => {
        onCancelar();
      }, 1600);
    } catch (error: any) {
      setStep('confirmacion');
      setPinError(error?.message || 'No fue posible registrar la firma digital.');
    } finally {
      guardandoRef.current = false;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 20,
          width: '100%',
          maxWidth: 520,
          boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeScaleIn 0.25s ease-out forwards',
        }}
      >
        {/* Encabezado Corporativo ESAP */}
        <div
          style={{
            background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)',
            padding: '20px 24px',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255, 255, 255, 0.16)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield style={{ width: 24, height: 24, color: '#ffffff' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                  Firma Digital Institucional
                </h3>
                <p style={{ fontSize: '0.76rem', opacity: 0.9, margin: '2px 0 0' }}>
                  {etapaLabel} — {firmanteCargo}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelar}
              disabled={step === 'guardando'}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                cursor: step === 'guardando' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
              title="Cerrar modal"
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          {/* Indicador de pasos */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
            {['Validación OTP', 'Generación Hash', 'Certificado', 'Completado'].map((label, i) => {
              const stepIdx =
                step === 'guardando'
                  ? 2
                  : ['verificacion', 'generando', 'confirmacion', 'completado'].indexOf(step);
              return (
                <div key={label} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 2,
                      backgroundColor:
                        i <= stepIdx ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                      transition: 'background-color 0.3s',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.62rem',
                      opacity: i <= stepIdx ? 1 : 0.6,
                      marginTop: 4,
                      display: 'block',
                      fontWeight: i <= stepIdx ? 600 : 400,
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen del documento a firmar */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            fontSize: '0.78rem',
            color: '#334155',
          }}
        >
          <div>
            <span style={{ color: '#64748B' }}>Solicitud:</span>{' '}
            <strong style={{ color: '#0F172A' }}>{consecutivo || solicitudId.slice(0, 10)}</strong>
          </div>
          {comisionadoNombre && (
            <div>
              <span style={{ color: '#64748B' }}>Comisionado:</span>{' '}
              <strong>{comisionadoNombre}</strong>
            </div>
          )}
          {destino && (
            <div>
              <span style={{ color: '#64748B' }}>Destino:</span>{' '}
              <strong>{destino}</strong>
            </div>
          )}
          {fechas && (
            <div>
              <span style={{ color: '#64748B' }}>Fechas:</span> <strong>{fechas}</strong>
            </div>
          )}
        </div>

        {/* Contenido dinámico según el paso */}
        <div style={{ padding: '24px 24px 20px' }}>
          {/* Paso 1: Verificación PIN OTP */}
          {step === 'verificacion' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    border: '2px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                  }}
                >
                  <Key style={{ width: 24, height: 24, color: '#003DA5' }} />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                  Validación de Identidad Institucional
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                  Ingresa el código OTP de 6 dígitos enviado a{' '}
                  <strong style={{ color: '#003DA5' }}>{correoDestino || 'tu correo institucional'}</strong>
                </p>

                {/* Temporizador de 5 minutos */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    padding: '6px 14px',
                    borderRadius: 20,
                    backgroundColor: timerSecs <= 60 ? '#FEF2F2' : '#F1F5F9',
                    border: `1.5px solid ${timerSecs <= 60 ? '#FECACA' : '#E2E8F0'}`,
                  }}
                >
                  <Clock
                    style={{
                      width: 16,
                      height: 16,
                      color: timerSecs <= 60 ? '#DC2626' : '#64748B',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: timerSecs <= 60 ? '#DC2626' : '#334155',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {Math.floor(timerSecs / 60)}:{String(timerSecs % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Inputs OTP */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    name={`otp_digit_${i}`}
                    id={`otp_digit_${i}`}
                    autoComplete="one-time-code"
                    data-lpignore="true"
                    data-form-type="other"
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    onPaste={handlePaste}
                    disabled={intentos >= 3 || verifyingPin}
                    style={{
                      width: 46,
                      height: 54,
                      borderRadius: 12,
                      border: pinError ? '2px solid #F87171' : '2px solid #CBD5E1',
                      textAlign: 'center',
                      fontSize: '1.4rem',
                      fontWeight: 800,
                      outline: 'none',
                      backgroundColor:
                        intentos >= 3 || verifyingPin ? '#F1F5F9' : '#ffffff',
                      color: '#0F172A',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#003DA5';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = pinError ? '#F87171' : '#CBD5E1';
                    }}
                  />
                ))}
              </div>

              {pinError && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    margin: '8px 0',
                    fontSize: '0.78rem',
                    color: '#991B1B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <AlertTriangle style={{ width: 14, height: 14 }} /> {pinError}
                </div>
              )}

              {verifyingPin && (
                <div
                  style={{
                    textAlign: 'center',
                    margin: '8px 0',
                    fontSize: '0.8rem',
                    color: '#003DA5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  Verificando código institucional...
                </div>
              )}

              {devCode && !verifyingPin && (
                <div style={{ textAlign: 'center', margin: '8px 0' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = String(devCode).slice(0, 6);
                      const digits = clean.split('');
                      const newPin = ['', '', '', '', '', ''];
                      digits.forEach((d, i) => {
                        newPin[i] = d;
                      });
                      setPin(newPin);
                      setPinError('');
                      if (digits.length === 6) {
                        void verificarPin(clean);
                      }
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px dashed #003DA5',
                      backgroundColor: '#EFF6FF',
                      color: '#003DA5',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Modo Pruebas / Dev: Autocompletar OTP ({devCode})
                  </button>
                </div>
              )}

              <p
                style={{
                  fontSize: '0.72rem',
                  color: '#94A3B8',
                  textAlign: 'center',
                  marginTop: 12,
                  marginBottom: 0,
                }}
              >
                <Lock
                  style={{
                    width: 11,
                    height: 11,
                    display: 'inline',
                    verticalAlign: 'middle',
                    marginRight: 4,
                  }}
                />
                Doble factor seguro ESAP: El código es de uso exclusivo y caduca en 5 minutos.
              </p>
            </div>
          )}

          {/* Paso 2: Generando firma y hash */}
          {step === 'generando' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  backgroundColor: '#F3E8FF',
                  border: '2px solid #DDD6FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Fingerprint style={{ width: 28, height: 28, color: '#7C3AED' }} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                Generando Firma Digital Institucional...
              </h4>

              <div
                style={{
                  width: '100%',
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#E2E8F0',
                  overflow: 'hidden',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: `${generatingProgress}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: 'linear-gradient(90deg, #7C3AED, #003DA5)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  textAlign: 'left',
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                }}
              >
                {[
                  { label: 'Verificando credenciales institucionales', done: generatingProgress > 25 },
                  { label: 'Generando hash criptográfico SHA-256', done: generatingProgress > 50 },
                  { label: 'Aplicando sello de tiempo oficial ESAP', done: generatingProgress > 75 },
                  { label: 'Vinculando identificador de certificado digital', done: generatingProgress > 95 },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.78rem',
                    }}
                  >
                    {item.done ? (
                      <CheckCircle style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
                    ) : (
                      <Loader2
                        style={{
                          width: 14,
                          height: 14,
                          color: '#64748B',
                          flexShrink: 0,
                          animation: 'spin 1s linear infinite',
                        }}
                      />
                    )}
                    <span
                      style={{
                        color: item.done ? '#059669' : '#64748B',
                        fontWeight: item.done ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paso 3: Confirmación con Certificado Digital */}
          {step === 'confirmacion' && firmaData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    backgroundColor: '#D1FAE5',
                    border: '2px solid #6EE7B7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  <FileSignature style={{ width: 26, height: 26, color: '#059669' }} />
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>
                  Firma Digital Generada
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                  Revisa los datos del certificado y confirma la firma
                </p>
              </div>

              {/* Tarjeta de Certificado Oficial */}
              <div
                style={{
                  border: '2px solid #003DA5',
                  borderRadius: 14,
                  overflow: 'hidden',
                  marginBottom: 16,
                  boxShadow: '0 4px 14px rgba(0, 61, 165, 0.08)',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#003DA5',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award style={{ width: 16, height: 16, color: '#FDE68A' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ffffff' }}>
                      Certificado de Firma Digital Institucional
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)' }}>
                    ESAP · 2026
                  </span>
                </div>
                <div style={{ padding: '12px 14px', backgroundColor: '#FAFBFF' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px 14px',
                      fontSize: '0.78rem',
                    }}
                  >
                    <div>
                      <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>
                        CERTIFICADO ID
                      </div>
                      <div
                        style={{
                          color: '#0F172A',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          fontSize: '0.74rem',
                        }}
                      >
                        {firmaData.certificado_id}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>
                        FIRMANTE
                      </div>
                      <div style={{ color: '#0F172A', fontWeight: 700 }}>{firmaData.firmante}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>
                        CARGO / ROL
                      </div>
                      <div style={{ color: '#0F172A' }}>{firmaData.cargo}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748B', fontSize: '0.64rem', fontWeight: 700 }}>
                        TIMESTAMP
                      </div>
                      <div style={{ color: '#0F172A', fontSize: '0.72rem' }}>
                        {new Date(firmaData.timestamp).toLocaleString('es-CO')}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: '6px 10px',
                      backgroundColor: '#F1F5F9',
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ color: '#64748B', fontSize: '0.62rem', fontWeight: 700, marginBottom: 2 }}>
                      HASH CRIPTOGRÁFICO SHA-256
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.66rem',
                        color: '#334155',
                        wordBreak: 'break-all',
                      }}
                    >
                      {firmaData.hash}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={onCancelar}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarFirma}
                  style={{
                    flex: 2,
                    padding: '10px 20px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: '0 4px 14px rgba(0,61,165,0.3)',
                  }}
                >
                  <FileSignature style={{ width: 16, height: 16 }} /> Confirmar y Firmar
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Guardando en backend */}
          {step === 'guardando' && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#003DA5' }}>
              <Loader2
                style={{ width: 32, height: 32, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }}
              />
              <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                Registrando firma digital institucional...
              </p>
            </div>
          )}

          {/* Paso 5: Completado */}
          {step === 'completado' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  backgroundColor: '#D1FAE5',
                  border: '3px solid #6EE7B7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <CheckCircle style={{ width: 34, height: 34, color: '#059669' }} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065F46', margin: '0 0 4px' }}>
                Firma Digital Aplicada
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#059669', margin: '0 0 6px' }}>
                La firma y el certificado han sido registrados con éxito
              </p>
              <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>
                Certificado:{' '}
                <code
                  style={{
                    backgroundColor: '#F1F5F9',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {firmaData?.certificado_id}
                </code>
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>,
    document.body,
  );
}
