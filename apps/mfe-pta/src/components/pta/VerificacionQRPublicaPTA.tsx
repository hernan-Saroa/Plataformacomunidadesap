/**
 * VerificacionQRPublicaPTA — Verificación pública de firma digital PTA
 *
 * Página pública accesible via QR o URL directa para verificar
 * la autenticidad de un PTA firmado digitalmente.
 *
 * Flujo:
 * 1. El usuario escanea el QR del certificado impreso
 * 2. El sistema busca la firma en Supabase KV
 * 3. Muestra resultado: Verificado / No encontrado / Inválido
 *
 * Se integra como ruta pública en el portal y como componente
 * embebible desde el Backoffice.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield, CheckCircle, XCircle, Search, Clock,
  FileText, Hash, User, Building2, Award, Loader2,
  QrCode, AlertTriangle, Copy, ExternalLink, Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const BASE_URL = `http://localhost:5000/api/pta`;
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}`,
});

interface VerificacionResult {
  verificado: boolean;
  certificado_id: string;
  firmante: string;
  cargo: string;
  timestamp: string;
  hash: string;
  docente_nombre: string;
  periodo: string;
  dedicacion: string;
  total_horas: number;
  estado: string;
  cadena_aprobacion?: { nivel: string; aprobador: string; fecha: string }[];
}

interface VerificacionQRPublicaPTAProps {
  certificadoIdInicial?: string;
  embedded?: boolean;
  onClose?: () => void;
}

export function VerificacionQRPublicaPTA({
  certificadoIdInicial,
  embedded = false,
  onClose,
}: VerificacionQRPublicaPTAProps) {
  const [certificadoId, setCertificadoId] = useState(certificadoIdInicial || '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificacionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const verificar = useCallback(async (id?: string) => {
    const targetId = (id || certificadoId).trim();
    if (!targetId) {
      toast.error('Ingrese un código de certificado');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setSearched(true);

    try {
      const res = await fetch(`${BASE_URL}/verificar/${encodeURIComponent(targetId)}`, {
        headers: getHeaders(),
      });
      const data = await res.json();

      if (data.success && data.data?.verificado) {
        setResult(data.data);
      } else if (data.success && !data.data?.verificado) {
        setError('Certificado no encontrado o inválido');
      } else {
        setError(data.error || 'Error al verificar');
      }
    } catch (err: any) {
      console.error('Error verificando certificado:', err);
      setError('Error de conexión al servidor de verificación');
    }
    setLoading(false);
  }, [certificadoId]);

  useEffect(() => {
    if (certificadoIdInicial) {
      setCertificadoId(certificadoIdInicial);
      verificar(certificadoIdInicial);
    }
  }, [certificadoIdInicial]);

  const copyHash = () => {
    if (result?.hash) {
      navigator.clipboard.writeText(result.hash).then(() => {
        toast.success('Hash copiado al portapapeles');
      });
    }
  };

  const containerStyle: React.CSSProperties = embedded
    ? { padding: 0 }
    : {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F3E8FF 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      };

  return (
    <div style={containerStyle}>
      <div style={{
        width: '100%',
        maxWidth: 560,
        ...(embedded ? {} : { margin: '0 auto' }),
      }}>
        {/* Header */}
        {!embedded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', marginBottom: 28 }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', boxShadow: '0 8px 30px rgba(0,61,165,0.25)',
            }}>
              <Shield style={{ width: 32, height: 32, color: 'white' }} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>
              Verificación de Firma Digital
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#6B7280' }}>
              ESAP — Plan de Trabajo Académico
            </p>
          </motion.div>
        )}

        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            background: 'white', borderRadius: 16, padding: '24px 28px',
            border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            marginBottom: 16,
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 16,
          }}>
            <QrCode style={{ width: 20, height: 20, color: '#003DA5' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Verificar certificado
            </h3>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={certificadoId}
              onChange={e => setCertificadoId(e.target.value.toUpperCase())}
              placeholder="ESAP-CERT-XXXX-XXXX-XXXX"
              onKeyDown={e => e.key === 'Enter' && verificar()}
              style={{
                flex: 1, padding: '11px 16px', borderRadius: 10,
                border: '1.5px solid #D1D5DB', fontSize: '0.92rem',
                fontFamily: 'monospace', fontWeight: 600,
                outline: 'none', transition: 'border 0.15s',
                letterSpacing: '0.02em',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#003DA5'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#D1D5DB'; }}
            />
            <button
              onClick={() => verificar()}
              disabled={loading || !certificadoId.trim()}
              style={{
                padding: '11px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #003DA5 0%, #1E40AF 100%)',
                color: 'white', fontWeight: 700, fontSize: '0.88rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                opacity: loading || !certificadoId.trim() ? 0.6 : 1,
                boxShadow: '0 4px 14px rgba(0,61,165,0.3)',
              }}
            >
              {loading ? (
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Search style={{ width: 16, height: 16 }} />
              )}
              Verificar
            </button>
          </div>

          <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock style={{ width: 10, height: 10 }} />
            Ingrese el código del certificado impreso o escaneado desde el QR
          </p>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '40px 20px' }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '4px solid #E5E7EB', borderTopColor: '#003DA5',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px',
              }} />
              <p style={{ color: '#6B7280', fontSize: '0.88rem', fontWeight: 600 }}>
                Verificando firma digital...
              </p>
              <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginTop: 4 }}>
                Consultando registro institucional
              </p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
          )}

          {!loading && error && searched && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: '#FEF2F2', borderRadius: 16, padding: '28px',
                border: '1px solid #FCA5A5', textAlign: 'center',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#FEE2E2', border: '3px solid #FCA5A5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <XCircle style={{ width: 30, height: 30, color: '#DC2626' }} />
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#991B1B', margin: '0 0 6px' }}>
                Certificado no verificado
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#DC2626' }}>{error}</p>
              <div style={{
                marginTop: 14, padding: '10px 14px', borderRadius: 8,
                background: '#FFF1F2', border: '1px solid #FECDD3',
                fontSize: '0.78rem', color: '#9F1239',
              }}>
                <AlertTriangle style={{ width: 13, height: 13, display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                Si el código es correcto y persiste el error, contacte a la oficina de
                Gestión del Talento Humano de la ESAP.
              </div>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'white', borderRadius: 16,
                border: '2px solid #6EE7B7', overflow: 'hidden',
                boxShadow: '0 4px 24px rgba(5,150,105,0.12)',
              }}
            >
              {/* Verification Header */}
              <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                padding: '20px 28px', color: 'white', textAlign: 'center',
              }}>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  <CheckCircle style={{ width: 30, height: 30 }} />
                </motion.div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 2px' }}>
                  FIRMA DIGITAL VERIFICADA
                </h4>
                <p style={{ fontSize: '0.78rem', opacity: 0.85 }}>
                  Documento auténtico — ESAP {new Date().getFullYear()}
                </p>
              </div>

              {/* Certificate Details */}
              <div style={{ padding: '22px 28px' }}>
                {/* Certificate ID */}
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: '#F0FDF4', border: '1px solid #BBF7D0',
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CERTIFICADO No.
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#065F46', fontFamily: 'monospace' }}>
                    {result.certificado_id}
                  </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 16 }}>
                  <InfoRow icon={User} label="Docente" value={result.docente_nombre} />
                  <InfoRow icon={Building2} label="Periodo" value={result.periodo} />
                  <InfoRow icon={FileText} label="Dedicación" value={result.dedicacion} />
                  <InfoRow icon={Clock} label="Horas" value={`${result.total_horas}h`} />
                  <InfoRow icon={Award} label="Firmante" value={result.firmante} />
                  <InfoRow icon={Building2} label="Cargo" value={result.cargo} />
                </div>

                {/* Timestamp */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 8,
                  background: '#F9FAFB', border: '1px solid #F3F4F6',
                  marginBottom: 14, fontSize: '0.78rem',
                }}>
                  <Clock style={{ width: 14, height: 14, color: '#6B7280' }} />
                  <div>
                    <span style={{ color: '#6B7280' }}>Firmado: </span>
                    <strong style={{ color: '#111827' }}>
                      {new Date(result.timestamp).toLocaleString('es-CO', {
                        day: '2-digit', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </strong>
                  </div>
                </div>

                {/* Hash */}
                <div style={{
                  padding: '10px 14px', borderRadius: 8,
                  background: '#F3F4F6', marginBottom: 14,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 4,
                  }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
                      HASH SHA-256
                    </div>
                    <button
                      onClick={copyHash}
                      style={{
                        padding: '2px 8px', borderRadius: 4, border: '1px solid #E5E7EB',
                        background: 'white', cursor: 'pointer', fontSize: '0.65rem',
                        color: '#6B7280', display: 'flex', alignItems: 'center', gap: 3,
                      }}
                    >
                      <Copy style={{ width: 10, height: 10 }} /> Copiar
                    </button>
                  </div>
                  <div style={{
                    fontFamily: 'monospace', fontSize: '0.7rem', color: '#374151',
                    wordBreak: 'break-all', lineHeight: 1.5,
                  }}>
                    {result.hash}
                  </div>
                </div>

                {/* Approval Chain */}
                {result.cadena_aprobacion && result.cadena_aprobacion.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Shield style={{ width: 13, height: 13, color: '#003DA5' }} />
                      Cadena de aprobación
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {result.cadena_aprobacion.map((a, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '7px 12px', borderRadius: 6,
                          background: '#F9FAFB', border: '1px solid #F3F4F6',
                          fontSize: '0.75rem',
                        }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#003DA5' }}>{a.nivel}</span>
                            <span style={{ color: '#6B7280', marginLeft: 6 }}>{a.aprobador}</span>
                          </div>
                          <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>
                            {new Date(a.fecha).toLocaleDateString('es-CO')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Estado badge */}
                <div style={{
                  marginTop: 16, textAlign: 'center', padding: '8px 14px',
                  borderRadius: 8, background: '#D1FAE5', border: '1px solid #6EE7B7',
                  fontSize: '0.78rem', fontWeight: 700, color: '#065F46',
                }}>
                  Estado actual: {result.estado}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {!embedded && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
              Escuela Superior de Administración Pública — ESAP
            </p>
            <p style={{ fontSize: '0.65rem', color: '#D1D5DB', marginTop: 2 }}>
              Sistema de Verificación de Firma Digital — Plan de Trabajo Académico
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div style={{
        fontSize: '0.6rem', fontWeight: 600, color: '#9CA3AF',
        textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Icon style={{ width: 10, height: 10 }} />
        {label}
      </div>
      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', marginTop: 1 }}>
        {value}
      </div>
    </div>
  );
}
