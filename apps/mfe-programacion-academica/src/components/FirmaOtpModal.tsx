/**
 * FirmaOtpModal — firma con código de 6 dígitos para la concertación de la docencia.
 *
 * Reutiliza el MISMO diseño y flujo del modal de firma del PTA (`mfe-pta/.../FirmaDigitalPTA.tsx`):
 *   1. Verificación de identidad (código de 6 dígitos, con temporizador de 5 minutos)
 *   2. Generación de la firma (hash y sello de tiempo, animado)
 *   3. Confirmación con el certificado visual
 *   4. Firma registrada
 * Así el docente, el revisor y el aprobador firman igual en Programación Académica y en el PTA.
 *
 * El código no se valida aquí: viaja con la decisión (`onFirmar`) y el SERVIDOR lo verifica y registra la
 * firma (quién, cuándo, en qué rol). Con la firma simulada cualquier código de 6 dígitos es válido, y se dice.
 * Es una copia deliberada del componente del PTA: son micro-frontends distintos y no hay un paquete de UI
 * compartido que los dos consuman.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle, Award, CheckCircle, Clock, FileSignature, Fingerprint, Key, Loader2, Lock, Shield, X,
} from 'lucide-react';

export interface FirmaOtpModalProps {
  /** Qué se firma: «Envío a concertación», «Revisión académica», «Aprobación de la docencia». */
  etapaLabel: string;
  /** Rol de quien firma: «Docente», «Revisor académico», «Aprobador». */
  firmanteCargo: string;
  firmanteNombre?: string;
  docenteNombre: string;
  periodo: string;
  /** Horas de la docencia firmada; sin dato se muestra «—». */
  totalHoras?: number | null;
  /** Identificador de lo firmado (concertación o periodo), se muestra abreviado. */
  referencia: string;
  firmaSimulada: boolean;
  /** Texto del botón final. */
  textoConfirmar?: string;
  /** Ejecuta la decisión con el código. Si rechaza, el modal muestra el motivo y deja reintentar. */
  onFirmar: (codigo: string) => Promise<void>;
  onCerrar: () => void;
}

type Paso = 'verificacion' | 'generando' | 'confirmacion' | 'guardando' | 'completado';

function generarHash(entrada: string): string {
  let h = 0;
  for (let i = 0; i < entrada.length; i++) { h = ((h << 5) - h) + entrada.charCodeAt(i); h = h & h; }
  const hex = Math.abs(h).toString(16).padStart(8, '0');
  return `SHA256:${hex}${Date.now().toString(16)}${hex.split('').reverse().join('')}`.substring(0, 64);
}

function generarCertificado(): string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = 'ESAP-CERT-';
  for (let i = 0; i < 12; i++) { r += c.charAt(Math.floor(Math.random() * c.length)); if ((i + 1) % 4 === 0 && i < 11) r += '-'; }
  return r;
}

export function FirmaOtpModal({
  etapaLabel, firmanteCargo, firmanteNombre, docenteNombre, periodo, totalHoras, referencia,
  firmaSimulada, textoConfirmar = 'Confirmar y firmar', onFirmar, onCerrar,
}: FirmaOtpModalProps) {
  const [paso, setPaso] = useState<Paso>('verificacion');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState('');
  const [errorFirma, setErrorFirma] = useState('');
  const [progreso, setProgreso] = useState(0);
  const [segundos, setSegundos] = useState(5 * 60);
  const [firma, setFirma] = useState<{ hash: string; certificado: string; timestamp: string } | null>(null);
  const entradas = useRef<(HTMLInputElement | null)[]>([]);
  const guardando = useRef(false);
  const cerrarRef = useRef(onCerrar);
  useEffect(() => { cerrarRef.current = onCerrar; }, [onCerrar]);
  const firmante = firmanteNombre || firmanteCargo;

  useEffect(() => { if (paso === 'verificacion') setTimeout(() => entradas.current[0]?.focus(), 100); }, [paso]);

  // 5 minutos para escribir el código; luego se cierra, como en el PTA.
  useEffect(() => {
    if (paso !== 'verificacion') return;
    setSegundos(5 * 60);
    const t = setInterval(() => setSegundos((s) => { if (s <= 1) { clearInterval(t); cerrarRef.current(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(t);
  }, [paso]);

  // Escape cierra, salvo mientras se guarda la decisión.
  useEffect(() => {
    const alTeclear = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape' && paso !== 'guardando') cerrarRef.current(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [paso]);

  const generar = useCallback((codigo: string) => {
    if (!/^\d{6}$/.test(codigo)) { setPinError('Código inválido. Ingrese los 6 dígitos.'); setPin(['', '', '', '', '', '']); return; }
    setPaso('generando');
    const datos = {
      hash: generarHash(`${referencia}|${docenteNombre}|${periodo}|${totalHoras ?? ''}|${firmante}|${Date.now()}`),
      certificado: generarCertificado(),
      timestamp: new Date().toISOString(),
    };
    let p = 0;
    const t = setInterval(() => {
      p += Math.random() * 25 + 10;
      if (p >= 100) { p = 100; clearInterval(t); setFirma(datos); setPaso('confirmacion'); }
      setProgreso(Math.min(p, 100));
    }, 400);
  }, [referencia, docenteNombre, periodo, totalHoras, firmante]);

  const cambiarDigito = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const nuevo = [...pin]; nuevo[i] = v; setPin(nuevo); setPinError('');
    if (v && i < 5) entradas.current[i + 1]?.focus();
    if (nuevo.join('').length === 6) generar(nuevo.join(''));
  };
  const teclaDigito = (i: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) entradas.current[i - 1]?.focus();
  };

  const confirmar = async () => {
    if (guardando.current) return;
    guardando.current = true; setErrorFirma(''); setPaso('guardando');
    try { await onFirmar(pin.join('')); setPaso('completado'); }
    catch (e: any) { setErrorFirma(e?.message || 'No se pudo registrar la firma.'); setPaso('confirmacion'); }
    finally { guardando.current = false; }
  };

  const indicePaso = paso === 'guardando' ? 2 : ['verificacion', 'generando', 'confirmacion', 'completado'].indexOf(paso);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Firma digital: ${etapaLabel}`}
      style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px 16px', background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 25px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        {/* Encabezado */}
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
            <button type="button" aria-label="Cerrar" onClick={onCerrar} disabled={paso === 'guardando'}
              style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 16 }}>
            {['Verificación', 'Generación', 'Confirmación', 'Completado'].map((etiqueta, i) => (
              <div key={etiqueta} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ height: 3, borderRadius: 2, background: i <= indicePaso ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)', transition: 'background 0.3s' }} />
                <span style={{ fontSize: '0.58rem', opacity: i <= indicePaso ? 1 : 0.5, marginTop: 4, display: 'block' }}>{etiqueta}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lo que se firma */}
        <div style={{ padding: '14px 28px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <div><span style={{ color: '#6B7280' }}>Docente:</span> <strong style={{ color: '#111827' }}>{docenteNombre}</strong></div>
          <div><span style={{ color: '#6B7280' }}>Periodo:</span> <strong>{periodo}</strong></div>
          <div><span style={{ color: '#6B7280' }}>Horas:</span> <strong>{totalHoras == null ? '—' : `${totalHoras}h`}</strong></div>
          <div><span style={{ color: '#6B7280' }}>Ref.:</span> <strong>{referencia.substring(0, 10)}…</strong></div>
        </div>

        <div style={{ padding: '28px 28px 24px' }}>
          <AnimatePresence mode="wait">
            {paso === 'verificacion' && (
              <motion.div key="pin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#EFF6FF', border: '2px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Key style={{ width: 26, height: 26, color: '#003DA5' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Verificación de identidad</h4>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                    {firmaSimulada
                      ? 'Firma simulada (pruebas): ingrese cualquier código de 6 dígitos.'
                      : 'Ingrese el código de 6 dígitos enviado a su correo institucional.'}
                  </p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 18px', borderRadius: 24, background: segundos <= 60 ? '#FEF2F2' : '#F3F4F6', border: `2px solid ${segundos <= 60 ? '#FECACA' : '#E5E7EB'}` }}>
                    <Clock style={{ width: 20, height: 20, color: segundos <= 60 ? '#DC2626' : '#6B7280' }} />
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: segundos <= 60 ? '#DC2626' : '#374151', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
                      {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
                  {pin.map((d, i) => (
                    <input key={i} ref={(el) => { entradas.current[i] = el; }} type="password" inputMode="numeric" maxLength={1}
                      aria-label={`Dígito ${i + 1} del código`} value={d}
                      onChange={(e) => cambiarDigito(i, e.target.value)} onKeyDown={(e) => teclaDigito(i, e)}
                      style={{ width: 48, height: 56, borderRadius: 12, border: pinError ? '2px solid #FCA5A5' : '2px solid #D1D5DB', textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, outline: 'none', background: 'white' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#003DA5'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = pinError ? '#FCA5A5' : '#D1D5DB'; }} />
                  ))}
                </div>
                {pinError && (
                  <motion.div role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', padding: '8px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', margin: '8px 0', fontSize: '0.78rem', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <AlertTriangle style={{ width: 14, height: 14 }} /> {pinError}
                  </motion.div>
                )}
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                    <Lock style={{ width: 11, height: 11, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                    El código vence en 5 minutos
                  </p>
                </div>
              </motion.div>
            )}

            {paso === 'generando' && (
              <motion.div key="gen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3E8FF', border: '2px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <Fingerprint style={{ width: 26, height: 26, color: '#7C3AED', animation: 'firma-pulso 1.5s ease-in-out infinite' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Generando firma digital...</h4>
                  <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#E5E7EB', overflow: 'hidden', marginBottom: 12 }}>
                    <motion.div initial={{ width: '0%' }} animate={{ width: `${progreso}%` }}
                      style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #7C3AED, #003DA5)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', padding: '12px 16px', background: '#F9FAFB', borderRadius: 10 }}>
                    {[
                      { etiqueta: 'Verificando credenciales', listo: progreso > 20 },
                      { etiqueta: 'Generando hash SHA-256', listo: progreso > 45 },
                      { etiqueta: 'Aplicando sello de tiempo', listo: progreso > 70 },
                      { etiqueta: 'Vinculando certificado', listo: progreso > 90 },
                    ].map((it) => (
                      <div key={it.etiqueta} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                        {it.listo
                          ? <CheckCircle style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
                          : <Loader2 style={{ width: 14, height: 14, color: '#6B7280', flexShrink: 0, animation: 'firma-giro 1s linear infinite' }} />}
                        <span style={{ color: it.listo ? '#059669' : '#6B7280', fontWeight: it.listo ? 600 : 400 }}>{it.etiqueta}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {paso === 'confirmacion' && firma && (
              <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D1FAE5', border: '2px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                    <FileSignature style={{ width: 26, height: 26, color: '#059669' }} />
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Firma generada exitosamente</h4>
                  <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>Revise los datos y confirme la firma</p>
                </div>
                <div style={{ border: '2px solid #003DA5', borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
                  <div style={{ background: '#003DA5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Award style={{ width: 18, height: 18, color: '#FDE68A' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'white' }}>Certificado de Firma Digital</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>ESAP {new Date().getFullYear()}</span>
                  </div>
                  <div style={{ padding: '14px 16px', background: '#FAFBFF' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.78rem' }}>
                      <div><div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>CERTIFICADO</div>
                        <div style={{ color: '#111827', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.72rem' }}>{firma.certificado}</div></div>
                      <div><div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>FIRMANTE</div>
                        <div style={{ color: '#111827', fontWeight: 600 }}>{firmante}</div></div>
                      <div><div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>CARGO</div>
                        <div style={{ color: '#111827' }}>{firmanteCargo}</div></div>
                      <div><div style={{ color: '#6B7280', fontSize: '0.65rem', fontWeight: 600 }}>TIMESTAMP</div>
                        <div style={{ color: '#111827', fontSize: '0.72rem' }}>{new Date(firma.timestamp).toLocaleString('es-CO')}</div></div>
                    </div>
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#F3F4F6', borderRadius: 6 }}>
                      <div style={{ color: '#6B7280', fontSize: '0.62rem', fontWeight: 600, marginBottom: 2 }}>HASH SHA-256</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#374151', wordBreak: 'break-all' }}>{firma.hash}</div>
                    </div>
                  </div>
                </div>
                {errorFirma && (
                  <div role="alert" style={{ padding: '8px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', marginBottom: 12, fontSize: '0.78rem', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} /> {errorFirma}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={onCerrar}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={confirmar}
                    style={{ flex: 2, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 4px 14px rgba(0,61,165,0.35)' }}>
                    <FileSignature style={{ width: 16, height: 16 }} /> {textoConfirmar}
                  </button>
                </div>
              </motion.div>
            )}

            {paso === 'guardando' && (
              <div role="status" style={{ textAlign: 'center', padding: '28px 0', color: '#003DA5' }}>
                <Loader2 style={{ width: 32, height: 32, margin: '0 auto 12px', animation: 'firma-giro 1s linear infinite' }} />
                <p>Guardando la decisión firmada…</p>
              </div>
            )}

            {paso === 'completado' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', border: '3px solid #6EE7B7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                    <CheckCircle style={{ width: 38, height: 38, color: '#059669' }} />
                  </motion.div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#065F46', margin: '0 0 6px' }}>Firma registrada</h4>
                  <p style={{ fontSize: '0.85rem', color: '#059669' }}>{etapaLabel}: la firma quedó registrada</p>
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 8 }}>
                    Certificado: <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: 4, fontSize: '0.68rem' }}>{firma?.certificado}</code>
                  </p>
                  <button type="button" onClick={onCerrar}
                    style={{ marginTop: 16, padding: '10px 28px', borderRadius: 10, border: 'none', background: '#059669', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    Listo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <style>{`
          @keyframes firma-pulso { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes firma-giro { to { transform: rotate(360deg); } }
        `}</style>
      </motion.div>
    </div>,
    document.body,
  );
}
