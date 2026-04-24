import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X, Send, FileText, MapPin, RotateCcw, HelpCircle,
  Upload, Trash2, AlertTriangle, Loader2, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { crearSolicitudPTA, uploadSolicitudFiles } from '../../../services/api/ptaApi';

interface SolicitudPTAModalProps {
  docenteId: string;
  docenteNombre: string;
  docenteEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CASOS = [
  { key: 'caso_1', label: 'Necesito crear un PTA en otra territorial/CETAP', desc: 'Tengo asignación en una segunda territorial y necesito un PTA separado.', icon: MapPin, color: '#003DA5' },
  { key: 'caso_2', label: 'Necesito rehacer mi PTA actual', desc: 'Mi PTA actual tiene errores graves y necesito empezar de cero.', icon: RotateCcw, color: '#D97706' },
  { key: 'caso_3', label: 'Otro caso', desc: 'Tengo un motivo diferente que requiere aprobación del administrador.', icon: HelpCircle, color: '#6B21A8' },
] as const;

export function SolicitudPTAModal({ docenteId, docenteNombre, docenteEmail, onClose, onSuccess }: SolicitudPTAModalProps) {
  const [caso, setCaso] = useState('');
  const [casoLibre, setCasoLibre] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = justificacion.trim().split(/\s+/).filter(Boolean).length;
  const casoInfo = CASOS.find(c => c.key === caso);

  const handleAddFiles = (files: FileList) => {
    const newFiles = Array.from(files).filter(f => {
      if (f.size > 10 * 1024 * 1024) { toast.error(`"${f.name}" supera 10MB`); return false; }
      if (!f.name.toLowerCase().endsWith('.pdf')) { toast.error(`Solo se aceptan archivos PDF`); return false; }
      return true;
    });
    setArchivos(prev => [...prev, ...newFiles].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!caso) { toast.error('Selecciona un caso'); return; }
    if (caso === 'caso_3' && !casoLibre.trim()) { toast.error('Describe tu caso'); return; }
    if (wordCount < 50) { toast.error(`La justificacion debe tener al menos 50 palabras (${wordCount}/50)`); return; }

    setSubmitting(true);
    let archivosData: any[] = [];
    if (archivos.length > 0) {
      const uploadRes = await uploadSolicitudFiles(archivos);
      if (uploadRes.success && uploadRes.data) archivosData = uploadRes.data;
    }

    const res = await crearSolicitudPTA({
      docenteId,
      docenteNombre,
      docenteEmail,
      caso,
      razon: casoInfo?.label || caso,
      justificacion,
      casoLibre: caso === 'caso_3' ? casoLibre : undefined,
      archivos: archivosData,
    });

    setSubmitting(false);
    if (res.success) {
      setSubmitted(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2000);
    } else {
      toast.error(res.message || 'Error al enviar solicitud');
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(17,24,39,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>Solicitar creacion de nuevo PTA</h3>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '4px 0 0' }}>Esta solicitud sera revisada por el administrador del sistema</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <CheckCircle2 style={{ width: 56, height: 56, color: '#059669', margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Solicitud enviada</h4>
            <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Recibiras una notificacion cuando sea resuelta</p>
          </div>
        ) : (
          <div style={{ padding: '20px 24px' }}>
            {/* Paso 1: Seleccionar caso */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Motivo de la solicitud *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CASOS.map(c => {
                  const Icon = c.icon;
                  const selected = caso === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCaso(c.key)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                        borderRadius: 12, border: `2px solid ${selected ? c.color : '#E5E7EB'}`,
                        background: selected ? `${c.color}08` : 'white', cursor: 'pointer', textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: 18, height: 18, color: c.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{c.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>{c.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caso libre */}
            {caso === 'caso_3' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Describe tu caso *</label>
                <input
                  value={casoLibre}
                  onChange={e => setCasoLibre(e.target.value)}
                  placeholder="Ej: Necesito un PTA temporal para un programa especial..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Justificacion */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span>Justificacion detallada *</span>
                <span style={{ color: wordCount >= 50 ? '#059669' : '#DC2626', fontWeight: 700 }}>{wordCount}/50 palabras</span>
              </label>
              <textarea
                value={justificacion}
                onChange={e => setJustificacion(e.target.value)}
                rows={5}
                placeholder="Explique detalladamente por que necesita crear un nuevo PTA. Incluya contexto, razones academicas y cualquier informacion relevante para el administrador (minimo 50 palabras)..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${wordCount >= 50 ? '#6EE7B7' : '#D1D5DB'}`, fontSize: '0.82rem', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
              />
            </div>

            {/* Archivos */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Documentos de soporte (maximo 5 PDFs)
              </label>
              {archivos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {archivos.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <FileText style={{ width: 14, height: 14, color: '#DC2626', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.75rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{(f.size / 1024).toFixed(0)}KB</span>
                      <button onClick={() => setArchivos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <Trash2 style={{ width: 12, height: 12, color: '#DC2626' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {archivos.length < 5 && (
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px dashed #D1D5DB', background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280', fontWeight: 600 }}
                >
                  <Upload style={{ width: 14, height: 14 }} /> Adjuntar PDF
                </button>
              )}
              <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) handleAddFiles(e.target.files); e.target.value = ''; }} />
            </div>

            {/* Warning */}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', gap: 8, marginBottom: 20, alignItems: 'flex-start' }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: '0.72rem', color: '#92400E', margin: 0, lineHeight: 1.4 }}>
                Esta solicitud sera enviada al administrador del sistema (superusuario). Recibira una notificacion con la resolucion en la seccion "Mis PTAs".
              </p>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !caso || wordCount < 50}
              style={{
                width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none',
                background: !caso || wordCount < 50 ? '#D1D5DB' : '#003DA5',
                color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: !caso || wordCount < 50 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Send style={{ width: 16, height: 16 }} />}
              {submitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
