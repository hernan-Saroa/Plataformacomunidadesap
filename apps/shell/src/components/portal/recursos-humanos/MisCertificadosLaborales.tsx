/**
 * Mis Certificados Laborales - Portal Transaccional (Legacy PTA)
 *
 * Nota: La capa `portalApi` hace fallback cuando no encuentra backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  Search,
  Sparkles,
  Plus,
  RefreshCw,
  Shield,
  QrCode,
} from 'lucide-react';
import { colors } from '../../esap/shared/designTokens';
import { getCertificadosLaboralesPortal, solicitarCertificadoLaboral } from '../portalApi';
import { toast } from 'sonner';

interface MisCertificadosLaboralesProps {
  personaId: string;
  userName?: string;
  onBack: () => void;
}

interface CertificadoBackoffice {
  id: string;
  consecutivo: string;
  certificateHash: string;
  qrCode: string;
  empleado: {
    nombre: string;
    documento: string;
    cargo: string;
    dependencia: string;
    tipoVinculacion: string;
    fechaVinculacion: string;
    grado: string;
    salario: number;
    email: string;
  };
  estado: string;
  fechaSolicitud: string;
  fechaGeneracion: string;
  cantidadEscaneos: number;
  configuracion: {
    incluyeSalario: boolean;
    incluyeHistorial: boolean;
    tipoDocumento: string;
    destinatario?: string | null;
    observaciones?: string | null;
  };
  generadoPor: string;
  origenSolicitud?: string;
  createdAt: string;
}

export function MisCertificadosLaborales({ personaId, userName, onBack }: MisCertificadosLaboralesProps) {
  const [certificados, setCertificados] = useState<CertificadoBackoffice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'revocado' | 'vencido'>('todos');
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [formSalario, setFormSalario] = useState(true);
  const [formDestinatario, setFormDestinatario] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCertificadosLaboralesPortal(personaId);
      if (res?.success) {
        setCertificados(Array.isArray(res.data) ? res.data : []);
      } else {
        setCertificados([]);
      }
    } catch (err) {
      console.error('[CertLaboral] Error cargando certificados:', err);
      toast.error('Error al cargar certificados');
      setCertificados([]);
    } finally {
      setLoading(false);
    }
  }, [personaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    setSending(true);
    try {
      const res: any = await solicitarCertificadoLaboral({
        personaId,
        tipoCertificado: 'Certificado Laboral Estándar',
        incluyeSalario: formSalario,
        destinatario: formDestinatario || undefined,
        observaciones: formObservaciones || undefined,
      });
      if (res?.success) {
        toast.success('Certificado generado y firmado exitosamente', {
          description: `${res.data?.consecutivo || ''} - Listo para descargar`,
        });
        if (res?.data) setCertificados((prev) => [res.data, ...prev]);
        setShowForm(false);
        resetForm();
      } else {
        toast.error('No fue posible generar el certificado');
      }
    } catch (err: any) {
      console.error('[CertLaboral] Error solicitando certificado:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setFormSalario(true);
    setFormDestinatario('');
    setFormObservaciones('');
  };

  const filtrados = certificados.filter((c) => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (c.consecutivo || '').toLowerCase().includes(s) ||
        (c.configuracion?.tipoDocumento || '').toLowerCase().includes(s) ||
        (c.empleado?.cargo || '').toLowerCase().includes(s) ||
        (c.configuracion?.destinatario || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = colors.brand;
            e.currentTarget.style.background = '#EFF6FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E5E7EB';
            e.currentTarget.style.background = 'white';
          }}
        >
          <ArrowLeft style={{ width: 16, height: 16, color: '#6B7280' }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1F2937', letterSpacing: '-0.02em' }}>
            Certificados Laborales
          </div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield style={{ width: 13, height: 13 }} />
            Firma automática (portal)
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 10,
            border: 'none',
            background: colors.brand,
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,61,165,0.2)',
          }}
        >
          <Plus style={{ width: 16, height: 16 }} />
          Solicitar Certificado
        </button>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            height: 36,
            borderRadius: 10,
            border: searchFocused ? '1px solid #003DA5' : '1px solid #D1D5DB',
            background: '#F9FAFB',
            paddingLeft: 12,
            boxShadow: searchFocused ? '0 0 0 3px rgba(0,61,165,0.08)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        >
          <Search style={{ width: 15, height: 15, color: '#9CA3AF', flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por consecutivo, tipo o destinatario..."
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 13,
              color: '#1F2937',
              flex: 1,
              height: '100%',
              padding: '0 10px',
            }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['todos', 'activo', 'revocado'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltroEstado(f)}
              style={{
                height: 34,
                padding: '0 14px',
                borderRadius: 20,
                border: filtroEstado === f ? 'none' : '1px solid #E5E7EB',
                background: filtroEstado === f ? colors.brand : 'white',
                color: filtroEstado === f ? 'white' : '#6B7280',
                fontSize: 12,
                fontWeight: filtroEstado === f ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Firmados' : 'Anulados'}
            </button>
          ))}
        </div>
        <button
          onClick={loadData}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #E5E7EB',
            background: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw style={{ width: 14, height: 14, color: '#6B7280' }} />
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Loader2 style={{ width: 28, height: 28, color: colors.brand, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: 14, color: '#6B7280' }}>Cargando certificados...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText style={{ width: 24, height: 24, color: '#9CA3AF' }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Sin certificados</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Solicita tu primer certificado laboral</div>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtrados.map((c) => (
                <CertRow key={c.id} cert={c} />
              ))}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              style={{
                width: '100%',
                maxWidth: 520,
                background: 'white',
                borderRadius: 16,
                padding: 18,
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Solicitar Certificado</div>

              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Incluye salario</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setFormSalario(true)}
                    style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: formSalario ? 'none' : '1px solid #E5E7EB',
                      background: formSalario ? colors.brand : 'white',
                      color: formSalario ? 'white' : '#6B7280',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    Sí
                  </button>
                  <button
                    onClick={() => setFormSalario(false)}
                    style={{
                      height: 36,
                      padding: '0 12px',
                      borderRadius: 10,
                      border: !formSalario ? 'none' : '1px solid #E5E7EB',
                      background: !formSalario ? colors.brand : 'white',
                      color: !formSalario ? 'white' : '#6B7280',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    No
                  </button>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Destinatario (opcional)</label>
                <input
                  value={formDestinatario}
                  onChange={(e) => setFormDestinatario(e.target.value)}
                  placeholder="Ej: Banco, Universidad..."
                  style={{
                    height: 40,
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    padding: '0 12px',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />

                <label style={{ fontSize: 12, fontWeight: 700, color: '#6B7280' }}>Observaciones (opcional)</label>
                <textarea
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Notas adicionales..."
                  style={{
                    minHeight: 90,
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    padding: 12,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    borderRadius: 10,
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#6B7280',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  disabled={sending}
                  onClick={handleSubmit}
                  style={{
                    height: 40,
                    padding: '0 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: colors.brand,
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: sending ? 'not-allowed' : 'pointer',
                    opacity: sending ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Generar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CertRow({ cert }: { cert: CertificadoBackoffice }) {
  const [hovered, setHovered] = useState(false);
  const isActivo = cert.estado === 'activo' || cert.estado === 'FIRMADO';
  return (
    <motion.div
      whileHover={{ y: -2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: 14,
        borderRadius: 14,
        border: '1px solid #F3F4F6',
        background: 'white',
        boxShadow: hovered ? '0 10px 30px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FileText style={{ width: 18, height: 18, color: colors.brand }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{cert.consecutivo || 'Certificado'}</div>
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
            {cert.configuracion?.tipoDocumento || 'Certificado Laboral'}
          </div>
          {cert.qrCode && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: '#9CA3AF' }}>
              <QrCode style={{ width: 12, height: 12 }} /> {cert.qrCode}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            background: 'white',
            color: '#6B7280',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: hovered ? 1 : 0.6,
            transition: 'opacity 0.2s',
          }}
          onClick={() => {
            navigator.clipboard.writeText(cert.qrCode || cert.consecutivo);
            toast.success(`Código QR copiado: ${cert.qrCode}`);
          }}
        >
          <QrCode style={{ width: 13, height: 13 }} /> QR
        </button>
        <button
          disabled={!isActivo}
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 8,
            border: 'none',
            background: isActivo ? colors.brand : '#D1D5DB',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: isActivo ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: isActivo && hovered ? 1 : 0.8,
            transition: 'opacity 0.2s',
          }}
          onClick={() => isActivo && toast.success(`Descargando ${cert.consecutivo}...`)}
        >
          <Download style={{ width: 13, height: 13 }} /> Descargar
        </button>
      </div>
    </motion.div>
  );
}

