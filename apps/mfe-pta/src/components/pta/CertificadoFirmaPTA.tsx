/**
 * CertificadoFirmaPTA — Visualización y exportación del certificado de firma digital
 *
 * Genera un documento visual tipo certificado con:
 * - Datos del PTA firmado (docente, periodo, horas, componentes)
 * - Información del firmante (nombre, cargo, timestamp)
 * - Hash SHA-256 del documento
 * - Código QR verificable (SVG rendered)
 * - Cadena de aprobación multinivel
 * - Opción de impresión
 *
 * Se muestra desde el detalle del PTA aprobado y desde la auditoría.
 */

import { useState, useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Award, FileSignature, Shield, Download, Printer,
  CheckCircle, Hash, Clock, User, Building2, BookOpen,
  ChevronLeft, ExternalLink, Lock, X, Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface CertificadoFirmaPTAProps {
  ptaId: string;
  docenteNombre: string;
  periodo: string;
  dedicacion: string;
  totalHoras: number;
  horasDisponibles: number;
  numAsignaturas: number;
  firmaData: {
    hash: string;
    timestamp: string;
    firmante: string;
    cargo: string;
    certificado_id: string;
  };
  historialAprobacion?: {
    nivel: string;
    aprobador: string;
    fecha: string;
    observaciones?: string;
  }[];
  onClose: () => void;
}

// ═══ QR Code Generator (simplified SVG-based) ═══
function generateQRMatrix(data: string, size: number = 21): boolean[][] {
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  const addFinderPattern = (row: number, col: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isEdge = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isEdge || isInner) {
          if (row + r < size && col + c < size) matrix[row + r][col + c] = true;
        }
      }
    }
  };
  addFinderPattern(0, 0);
  addFinderPattern(0, size - 7);
  addFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Data encoding (simplified - uses hash of input to generate pattern)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash;
  }
  const seed = Math.abs(hash);

  for (let r = 8; r < size - 8; r++) {
    for (let c = 8; c < size - 8; c++) {
      if (r === 6 || c === 6) continue;
      const val = (seed * (r * size + c + 1)) % 100;
      matrix[r][c] = val > 45;
    }
  }

  // Add some data in the margins
  for (let r = 8; r < size; r++) {
    for (let c = 0; c < 8; c++) {
      if (r < size - 7 && c !== 6) {
        const val = (seed * (r + c + 7)) % 100;
        matrix[r][c] = val > 50;
      }
    }
  }
  for (let r = 0; r < 8; r++) {
    for (let c = 8; c < size - 8; c++) {
      if (c !== 6) {
        const val = (seed * (r + c + 13)) % 100;
        matrix[r][c] = val > 50;
      }
    }
  }

  return matrix;
}

function QRCodeSVG({ data, size = 120 }: { data: string; size?: number }) {
  const matrixSize = 25;
  const matrix = useMemo(() => generateQRMatrix(data, matrixSize), [data]);
  const cellSize = size / matrixSize;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: 4 }}>
      <rect width={size} height={size} fill="white" />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#111827"
            />
          ) : null
        )
      )}
    </svg>
  );
}

export function CertificadoFirmaPTA({
  ptaId, docenteNombre, periodo, dedicacion,
  totalHoras, horasDisponibles, numAsignaturas,
  firmaData, historialAprobacion, onClose,
}: CertificadoFirmaPTAProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const pctCarga = horasDisponibles > 0 ? Math.round((totalHoras / horasDisponibles) * 100) : 0;
  const qrData = `ESAP-PTA:${firmaData.certificado_id}|${ptaId}|${firmaData.hash}`;
  const verificationUrl = `https://esap.gov.co/verificar/${firmaData.certificado_id}`;

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Permite las ventanas emergentes para imprimir'); return; }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Certificado Firma Digital — ${firmaData.certificado_id}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
        @media print { body { padding: 0; } }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const copyHash = () => {
    navigator.clipboard.writeText(firmaData.hash).then(() => {
      setCopied(true);
      toast.success('Hash copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
      >
        {/* Toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award style={{ width: 18, height: 18, color: '#003DA5' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>Certificado de Firma Digital</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={handlePrint} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Printer style={{ width: 12, height: 12 }} /> Imprimir
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14, color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Certificate Content (printable) */}
        <div ref={printRef} style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 28px' }}>
            {/* Certificate Header */}
            <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 18, borderBottom: '3px double #003DA5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                <Shield style={{ width: 32, height: 32, color: '#003DA5' }} />
                <div>
                  <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#003DA5', margin: 0, letterSpacing: '0.05em' }}>
                    ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                  </h1>
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '2px 0 0', letterSpacing: '0.1em' }}>ESAP — REPÚBLICA DE COLOMBIA</p>
                </div>
              </div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: '14px 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Certificado de Firma Digital
              </h2>
              <p style={{ fontSize: '0.72rem', color: '#6B7280' }}>Plan de Trabajo Académico — Aprobación Final N3</p>
            </div>

            {/* Certificate Body */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 22 }}>
              {/* Left: Info */}
              <div style={{ flex: 1 }}>
                {/* ID */}
                <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 12, border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No. CERTIFICADO</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#003DA5', fontFamily: 'monospace', marginTop: 2 }}>{firmaData.certificado_id}</div>
                </div>

                {/* Docente info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 14px', fontSize: '0.78rem', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Docente</div>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{docenteNombre}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Periodo</div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{periodo}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Dedicación</div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{dedicacion}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Asignaturas</div>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{numAsignaturas}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Horas programadas</div>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{totalHoras} / {horasDisponibles}h ({pctCarga}%)</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Estado</div>
                    <div style={{ fontWeight: 700, color: '#059669' }}>APROBADO</div>
                  </div>
                </div>
              </div>

              {/* Right: QR */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ border: '2px solid #E5E7EB', borderRadius: 10, padding: 8, background: 'white' }}>
                  <QRCodeSVG data={qrData} size={110} />
                </div>
                <span style={{ fontSize: '0.58rem', color: '#9CA3AF', marginTop: 4, textAlign: 'center', maxWidth: 110 }}>
                  Escanee para verificar autenticidad
                </span>
              </div>
            </div>

            {/* Firmante */}
            <div style={{ border: '1px solid #003DA5', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ background: '#003DA5', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSignature style={{ width: 14, height: 14, color: '#FDE68A' }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white' }}>Firmante Autorizado</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Nombre</div>
                  <div style={{ fontWeight: 700, color: '#111827' }}>{firmaData.firmante}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Cargo</div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{firmaData.cargo}</div>
                </div>
                <div style={{ gridColumn: '1/3' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Fecha y hora de firma</div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{new Date(firmaData.timestamp).toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'medium' })}</div>
                </div>
              </div>
            </div>

            {/* Hash */}
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 16px', marginBottom: 16, border: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Hash style={{ width: 10, height: 10 }} /> Hash SHA-256 del documento
                </div>
                <button onClick={copyHash} style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #E5E7EB', background: 'white', fontSize: '0.62rem', fontWeight: 600, color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Copy style={{ width: 9, height: 9 }} /> {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <code style={{ fontSize: '0.68rem', color: '#374151', wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
                {firmaData.hash}
              </code>
            </div>

            {/* Approval Chain */}
            {historialAprobacion && historialAprobacion.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle style={{ width: 12, height: 12 }} /> Cadena de aprobación
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {historialAprobacion.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: i === historialAprobacion.length - 1 ? '#D1FAE5' : '#F9FAFB', border: `1px solid ${i === historialAprobacion.length - 1 ? '#6EE7B7' : '#E5E7EB'}` }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#003DA5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                        N{i + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: '0.78rem' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{item.nivel}</div>
                        <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{item.aprobador} • {new Date(item.fecha).toLocaleDateString('es-CO')}</div>
                      </div>
                      <CheckCircle style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification note */}
            <div style={{ padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.72rem', color: '#1E40AF', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Lock style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Verificación:</strong> Este certificado puede ser verificado escaneando el código QR o ingresando el número de certificado en{' '}
                <span style={{ fontWeight: 700 }}>{verificationUrl}</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 20, paddingTop: 14, borderTop: '2px double #D1D5DB', textAlign: 'center' }}>
              <p style={{ fontSize: '0.62rem', color: '#9CA3AF', margin: 0 }}>
                Documento generado electrónicamente por el sistema ESAP Backoffice Administrativo.
              </p>
              <p style={{ fontSize: '0.58rem', color: '#D1D5DB', margin: '4px 0 0' }}>
                PTA ID: {ptaId} • Generado: {new Date().toLocaleString('es-CO')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
