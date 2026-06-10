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
  Upload, Type
} from 'lucide-react';
import { toast } from 'sonner';

interface FirmaDigitalActuacionProps {
  expedienteId: string;
  radicado: string;
  actuacionDescripcion: string;
  firmanteNombre: string;
  firmanteCargo: string;
  etapaLabel: string;
  correoDestino?: string;
  onVerifyCodigo?: (codigo: string) => Promise<void>;
  onFirmaCompleta: (firmaData: FirmaData) => void;
  onCancelar: () => void;
  onStartPlacement?: (drawnImage: string) => void;
  coords?: { x: number; y: number };
  placed?: boolean;
  isMinimized?: boolean;
}

export interface FirmaData {
  hash: string;
  timestamp: string;
  firmante: string;
  cargo: string;
  pin_verificado: boolean;
  certificado_id: string;
  expedienteId: string;
  coords?: { x: number; y: number };
  firmaImg?: string;
  scale?: number;
}

type FirmaStep = 'verificacion' | 'trazado' | 'generando' | 'confirmacion' | 'completado';

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

export function FirmaDigitalActuacion({
  expedienteId, radicado, actuacionDescripcion,
  firmanteNombre, firmanteCargo, etapaLabel, correoDestino,
  onVerifyCodigo,
  onFirmaCompleta, onCancelar,
  onStartPlacement, coords, placed, isMinimized = false
}: FirmaDigitalActuacionProps) {
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

  // Canvas drawing states & refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnImage, setDrawnImage] = useState<string>('');

  // Cursive fonts, text signature, and file upload states
  const [firmaMode, setFirmaMode] = useState<'dibujar' | 'escribir' | 'cargar'>('dibujar');
  const [textoFirma, setTextoFirma] = useState('');
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState('Dancing Script');
  const [uploadedImage, setUploadedImage] = useState<string>('');

  const signatureFonts = [
    { name: 'Dancing Script', label: 'Elegante y Fluida' },
    { name: 'Great Vibes', label: 'Clásica Caligráfica' },
    { name: 'Caveat', label: 'Moderna y Casual' },
    { name: 'Alex Brush', label: 'Pincel y Cursiva' },
    { name: 'Sacramento', label: 'Fina y Delicada' },
    { name: 'Pacifico', label: 'Llamativa y Gruesa' },
    { name: 'Pinyon Script', label: 'Sofisticada y Formal' },
    { name: 'Monsieur La Doulaise', label: 'Florituras Clásicas' },
    { name: 'Allura', label: 'Suave y Legible' },
    { name: 'Parisienne', label: 'Vintage y Chic' },
    { name: 'Italianno', label: 'Inclinada y Tradicional' },
  ];

  // Dynamic Google Fonts loader
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Italianno&family=Monsieur+La+Doulaise&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Sacramento&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const generateTypedSignatureBase64 = (text: string, fontName: string): string => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 800;
    tempCanvas.height = 300;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return '';
    
    ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Medir el texto para evitar que se corte si es muy largo
    const baseFontSize = 110;
    ctx.font = `italic ${baseFontSize}px "${fontName}", cursive`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    
    // Si el texto es más ancho que el canvas (con un margen de 40px), reducimos el tamaño de fuente
    let finalFontSize = baseFontSize;
    const maxWidth = tempCanvas.width - 40;
    if (textWidth > maxWidth) {
      finalFontSize = Math.floor(baseFontSize * (maxWidth / textWidth));
    }
    
    ctx.font = `italic ${finalFontSize}px "${fontName}", cursive`;
    ctx.fillStyle = '#003DA5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);
    
    return tempCanvas.toDataURL();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor seleccione un archivo de imagen (PNG, JPG, etc.)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadedImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;
    if ('touches' in e) {
      if (e.touches.length === 0) return;
      e.preventDefault(); // Stop mobile scroll
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Configure Canvas Context when entering 'trazado' step
  useEffect(() => {
    if (step === 'trazado') {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.strokeStyle = '#003DA5';
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
        }
      }, 100);
    }
  }, [step]);

  const handleStartPlacement = () => {
    let base64 = '';
    if (firmaMode === 'dibujar') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      base64 = canvas.toDataURL();
    } else if (firmaMode === 'escribir') {
      if (!textoFirma.trim()) {
        toast.warning('Por favor escriba su nombre para generar la firma');
        return;
      }
      base64 = generateTypedSignatureBase64(textoFirma, fuenteSeleccionada);
    } else if (firmaMode === 'cargar') {
      if (!uploadedImage) {
        toast.warning('Por favor cargue un archivo de imagen');
        return;
      }
      base64 = uploadedImage;
    }

    setDrawnImage(base64);
    if (onStartPlacement) {
      onStartPlacement(base64);
    }
  };

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

  const iniciarGeneracion = useCallback((drawnImg?: string) => {
    setStep('generando');

    const hashInput = `${expedienteId}|${radicado}|${actuacionDescripcion}|${firmanteNombre}|${Date.now()}`;
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
          expedienteId,
          coords,
          firmaImg: drawnImg,
        };
        setFirmaData(firmaPayload);
        setStep('confirmacion');
      }
      setGeneratingProgress(Math.min(progress, 100));
    }, 400);
  }, [expedienteId, radicado, actuacionDescripcion, firmanteNombre, firmanteCargo, coords]);

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
    
    if (onStartPlacement) {
      setStep('trazado');
    } else {
      iniciarGeneracion();
    }
  }, [onVerifyCodigo, onStartPlacement, iniciarGeneracion]);

  // React to placement coordinates being set by parent
  useEffect(() => {
    if (step === 'trazado' && placed && coords) {
      iniciarGeneracion(drawnImage);
    }
  }, [step, placed, coords, drawnImage, iniciarGeneracion]);

  const confirmarFirma = () => {
    if (firmaData) {
      setStep('completado');
      setTimeout(() => {
        onFirmaCompleta(firmaData);
        toast.success('Firma digital aplicada correctamente');
      }, 1500);
    }
  };

  if (isMinimized) {
    return null;
  }

  return (
    <div 
      style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(6px)', overflowY: 'auto' }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden', marginBottom: '40px' }}
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
            {(onStartPlacement 
              ? ['Verificación', 'Trazado', 'Generación', 'Confirmación', 'Completado']
              : ['Verificación', 'Generación', 'Confirmación', 'Completado']
            ).map((label, i) => {
              const stepsArray = onStartPlacement 
                ? ['verificacion', 'trazado', 'generando', 'confirmacion', 'completado']
                : ['verificacion', 'generando', 'confirmacion', 'completado'];
              const stepIdx = stepsArray.indexOf(step);
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
          <div><span style={{ color: '#6B7280' }}>Radicado:</span> <strong style={{ color: '#111827' }}>{radicado}</strong></div>
          <div style={{ flex: 1 }}><span style={{ color: '#6B7280' }}>Actuación:</span> <strong>{actuacionDescripcion}</strong></div>
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

            {/* Step 1.5: Trazado (Canvas Signature Drawing, Writing with custom fonts, or Uploading Image) */}
            {step === 'trazado' && (
              <motion.div key="trazado" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <FileSignature style={{ width: 26, height: 26, color: '#003DA5' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>Crear Firma Digitalizada</h4>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Seleccione el método preferido para estampar su firma</p>
                </div>

                {/* Cursives, Uploads, Drawing tab selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#F3F4F6', padding: 4, borderRadius: 10 }}>
                  {[
                    { id: 'dibujar', label: 'Dibujar' },
                    { id: 'escribir', label: 'Escribir Texto' },
                    { id: 'cargar', label: 'Subir Imagen' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFirmaMode(tab.id as any)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 8,
                        border: 'none',
                        background: firmaMode === tab.id ? 'white' : 'transparent',
                        color: firmaMode === tab.id ? '#003DA5' : '#4B5563',
                        boxShadow: firmaMode === tab.id ? '0 2px 4px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TABS CONTENT */}
                
                {/* 1. DRAWING CANVAS */}
                {firmaMode === 'dibujar' && (
                  <div style={{ border: '2px dashed #003DA5', borderRadius: 12, overflow: 'hidden', background: '#F9FAFB', position: 'relative', marginBottom: 16 }}>
                    <canvas
                      ref={canvasRef}
                      width={464}
                      height={200}
                      style={{ display: 'block', cursor: 'crosshair', width: '100%', height: 200 }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    <div style={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. TYPED TEXT WITH FONTS */}
                {firmaMode === 'escribir' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                        Escriba su Nombre completo:
                      </label>
                      <input
                        type="text"
                        value={textoFirma}
                        onChange={e => setTextoFirma(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '2px solid #D1D5DB',
                          fontSize: '0.9rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                          Seleccione el estilo de letra cursiva:
                        </label>
                        <select
                          value={fuenteSeleccionada}
                          onChange={(e) => setFuenteSeleccionada(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: 8,
                            border: '2px solid #D1D5DB',
                            fontSize: '0.85rem',
                            outline: 'none',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer',
                            boxSizing: 'border-box'
                          }}
                        >
                          {signatureFonts.map((font) => (
                            <option key={font.name} value={font.name}>
                              {font.name} — {font.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Premium Signature Preview Box */}
                      <div style={{ 
                        border: '1px dashed #BFDBFE', 
                        borderRadius: 12, 
                        background: '#F0F7FF', 
                        padding: '20px 12px', 
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 88,
                        boxShadow: 'inset 0 2px 4px rgba(0, 61, 165, 0.02)',
                        position: 'relative'
                      }}>
                        <span style={{ fontSize: '0.65rem', color: '#3B82F6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                          Vista previa de su firma
                        </span>
                        <div style={{ 
                          fontFamily: `"${fuenteSeleccionada}", cursive`, 
                          fontSize: '1.95rem', 
                          color: '#003DA5',
                          wordBreak: 'break-all',
                          lineHeight: 1.2
                        }}>
                          {textoFirma || 'Su Firma'}
                        </div>
                        {textoFirma && (
                          <button
                            type="button"
                            onClick={() => setTextoFirma('')}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              padding: '4px 8px',
                              fontSize: '0.7rem',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontWeight: 700
                            }}
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. UPLOAD LOCAL FILE */}
                {firmaMode === 'cargar' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <div 
                      style={{ 
                        border: '2px dashed #D1D5DB', 
                        borderRadius: 12, 
                        padding: uploadedImage ? '12px' : '24px 16px', 
                        textAlign: 'center', 
                        background: '#F9FAFB',
                        cursor: uploadedImage ? 'default' : 'pointer',
                        position: 'relative',
                        minHeight: 150,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={!uploadedImage ? () => document.getElementById('signature-file-upload')?.click() : undefined}
                    >
                      <input
                        id="signature-file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      
                      {uploadedImage ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={uploadedImage} alt="Firma cargada" style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain' }} />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedImage('');
                            }}
                            style={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              padding: '4px 8px',
                              fontSize: '0.75rem',
                              background: '#EF4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontWeight: 700,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            Limpiar
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload style={{ width: 32, height: 32, color: '#9CA3AF', margin: '0 auto 8px' }} />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block' }}>
                            Haga clic para seleccionar imagen de su firma
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 4, display: 'block' }}>
                            Formatos admitidos: PNG, JPG, JPEG (transparente preferido)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={onCancelar} style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                       if (firmaMode === 'dibujar') clearCanvas();
                       else if (firmaMode === 'escribir') setTextoFirma('');
                       else if (firmaMode === 'cargar') setUploadedImage('');
                    }} 
                    style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={handleStartPlacement}
                    style={{ flex: 2, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,61,165,0.35)' }}
                  >
                    <FileSignature style={{ width: 16, height: 16 }} /> Ubicar Firma en Documento
                  </button>
                </div>
              </motion.div>
            )}

            {/* Dummy check so that the next block doesn't render verification again */}
            {false && (
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
                    {firmaData.firmaImg && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: 'white', borderRadius: 8, border: '1px dashed #BFDBFE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#6B7280', fontSize: '0.62rem', fontWeight: 600, marginBottom: 4 }}>FIRMA DIGITALIZADA</span>
                        <img src={firmaData.firmaImg} alt="Rúbrica" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
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
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065F46', margin: '0 0 6px' }}>Actuación Autorizada y Firmada</h4>
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
    </div>
  );
}
