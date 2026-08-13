import { useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X, Send, FileText, MapPin, RotateCcw, HelpCircle,
  Upload, Trash2, AlertTriangle, Loader2, CheckCircle2,
  Edit3, BookOpen, FlaskConical, Globe, Briefcase,
} from 'lucide-react';
import { docentePtaAlert as toast } from './DocentePtaAlert';
import { crearSolicitudPTA, uploadSolicitudFiles } from '../../../services/api/ptaApi';

interface SolicitudPTAModalProps {
  docenteId: string;
  docenteNombre: string;
  docenteEmail?: string;
  ptas?: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const CASOS = [
  { key: 'edicion_pta', label: 'Editar componentes de un PTA existente', desc: 'Habilita uno o varios componentes sin crear un nuevo PTA.', icon: Edit3, color: '#003DA5' },
  { key: 'caso_1', label: 'Necesito crear un PTA en otra territorial/CETAP', desc: 'Tengo asignación en una segunda territorial y necesito un PTA separado.', icon: MapPin, color: '#003DA5' },
  { key: 'caso_2', label: 'Necesito rehacer mi PTA actual', desc: 'Mi PTA actual tiene errores graves y necesito empezar de cero.', icon: RotateCcw, color: '#D97706' },
  { key: 'caso_3', label: 'Otro caso', desc: 'Tengo un motivo diferente que requiere aprobación del administrador.', icon: HelpCircle, color: '#6B21A8' },
] as const;

const COMPONENTES_EDICION = [
  { key: 'docencia', label: 'Docencia', icon: BookOpen, color: '#003DA5' },
  { key: 'investigacion', label: 'Investigación', icon: FlaskConical, color: '#7C3AED' },
  { key: 'extension', label: 'Extensión', icon: Globe, color: '#059669' },
  { key: 'complementarias', label: 'Complementarias', icon: Briefcase, color: '#D97706' },
] as const;

const MAX_ARCHIVOS_SOLICITUD = 5;
const MAX_PESO_ARCHIVO = 10 * 1024 * 1024;
const MAX_CARACTERES_DESCRIPCION = 3000;

function normalizeEstado(value: unknown) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
}

// EFDS-1408: espejo de ESTADOS_PTA_RESTAURABLES_EDICION (pta.service.ts) — la
// solicitud de edición reabre componentes YA aprobados, así que solo aplica
// una vez el PTA completó su aprobación. Mientras está en creación (Borrador)
// o en medio del proceso de aprobación, se corrige directamente vía
// devolución de componente, no con esta solicitud.
const ESTADOS_PTA_APROBADO_TOTAL = new Set([
  'APROBADO',
  'APROBADO_DEF',
  'EN_FIRME',
  'RADICADO',
  'EN_EJECUCION',
  'FINALIZADO',
  'TERMINADO',
]);

function admiteSolicitudEdicion(pta: any) {
  const estado = normalizeEstado(pta?.estado);
  return Boolean(pta?.id) && ESTADOS_PTA_APROBADO_TOTAL.has(estado);
}

export function SolicitudPTAModal({ docenteId, docenteNombre, docenteEmail, ptas = [], onClose, onSuccess }: SolicitudPTAModalProps) {
  const ptasEditables = useMemo(
    () => ptas
      .filter(admiteSolicitudEdicion)
      .sort((a, b) => new Date(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0).getTime()
        - new Date(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0).getTime()),
    [ptas],
  );
  // El portal ya entrega únicamente los PTA del periodo activo. Mientras la
  // experiencia sea de un solo plan vigente, se selecciona internamente el más
  // reciente y se mantiene el identificador explícito en la petición al backend.
  const ptaId = String(ptasEditables[0]?.id || '');
  const [caso, setCaso] = useState('');
  const [casoLibre, setCasoLibre] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [componentes, setComponentes] = useState<string[]>([]);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = justificacion.trim().split(/\s+/).filter(Boolean).length;
  const caracteresRestantes = MAX_CARACTERES_DESCRIPCION - justificacion.length;
  const casoInfo = CASOS.find(c => c.key === caso);
  const esEdicion = caso === 'edicion_pta';
  const descripcionValida = justificacion.length <= MAX_CARACTERES_DESCRIPCION
    && (esEdicion ? justificacion.trim().length > 0 : wordCount >= 50);
  const formularioValido = Boolean(
    caso
    && descripcionValida
    && (caso !== 'caso_3' || casoLibre.trim())
    && (!esEdicion || (ptaId && componentes.length > 0)),
  );

  const handleAddFiles = (files: FileList) => {
    const seleccionados = Array.from(files);
    const cuposDisponibles = Math.max(0, MAX_ARCHIVOS_SOLICITUD - archivos.length);

    if (seleccionados.length > cuposDisponibles) {
      toast.error(
        cuposDisponibles === 0
          ? 'Solo puedes adjuntar un máximo de 5 archivos PDF.'
          : `Solo puedes agregar ${cuposDisponibles} archivo${cuposDisponibles === 1 ? '' : 's'} más (máximo 5).`,
      );
    }

    const archivosValidos = seleccionados.filter(f => {
      if (f.size > MAX_PESO_ARCHIVO) {
        toast.error(`"${f.name}" supera el máximo permitido de 10 MB.`);
        return false;
      }
      const mimeValido = !f.type || ['application/pdf', 'application/x-pdf'].includes(f.type.toLowerCase());
      if (!f.name.toLowerCase().endsWith('.pdf') || !mimeValido) {
        toast.error(`"${f.name}" no es un documento PDF válido.`);
        return false;
      }
      return true;
    });

    if (cuposDisponibles > 0 && archivosValidos.length > 0) {
      setArchivos(prev => [...prev, ...archivosValidos.slice(0, cuposDisponibles)]);
    }
  };

  const handleSubmit = async () => {
    if (!caso) { toast.error('Selecciona el tipo de solicitud'); return; }
    if (caso === 'caso_3' && !casoLibre.trim()) { toast.error('Describe tu caso'); return; }
    if (esEdicion) {
      if (!ptaId) { toast.error('No hay un PTA enviado disponible para editar'); return; }
      if (componentes.length === 0) { toast.error('Selecciona al menos un componente'); return; }
      if (!justificacion.trim()) { toast.error('Describe los cambios que necesitas realizar'); return; }
    } else if (wordCount < 50) {
      toast.error(`La justificación debe tener al menos 50 palabras (${wordCount}/50)`);
      return;
    }

    setSubmitting(true);
    let archivosData: any[] = [];
    if (archivos.length > 0) {
      const uploadRes = await uploadSolicitudFiles(archivos);
      if (!uploadRes.success) {
        setSubmitting(false);
        toast.error('No fue posible cargar los documentos de soporte');
        return;
      }
      if (uploadRes.data) archivosData = uploadRes.data;
    }

    const res = await crearSolicitudPTA({
      docenteId,
      docenteNombre,
      docenteEmail,
      tipoSolicitud: esEdicion ? 'edicion_componentes' : 'creacion',
      caso,
      razon: casoInfo?.label || caso,
      justificacion,
      casoLibre: caso === 'caso_3' ? casoLibre : undefined,
      ptaId: esEdicion ? ptaId : undefined,
      componentes: esEdicion ? componentes : undefined,
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
      style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(17,24,39,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="solicitudes-pta-title"
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 620, maxHeight: 'calc(100dvh - 20px)', overflow: 'auto', overscrollBehavior: 'contain', boxShadow: '0 25px 80px rgba(0,0,0,0.25)' }}
      >
        {/* Header */}
        <div style={{ padding: 'clamp(16px, 4vw, 20px) clamp(14px, 5vw, 24px)', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h3 id="solicitudes-pta-title" style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>Solicitudes PTA</h3>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '4px 0 0' }}>Solicita la edición de un PTA ya enviado o la creación de otro plan</p>
          </div>
          <button type="button" aria-label="Cerrar solicitudes PTA" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <X style={{ width: 16, height: 16, color: '#6B7280' }} />
          </button>
        </div>

        {submitted ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <CheckCircle2 style={{ width: 56, height: 56, color: '#059669', margin: '0 auto 16px' }} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Solicitud enviada</h4>
            <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Recibirás una notificación cuando sea resuelta</p>
          </div>
        ) : (
          <div style={{ padding: 'clamp(16px, 4vw, 20px) clamp(14px, 5vw, 24px)' }}>
            {/* Paso 1: Seleccionar caso */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>Motivo de la solicitud *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CASOS.map(c => {
                  const Icon = c.icon;
                  const selected = caso === c.key;
                  const disabled = c.key === 'edicion_pta' && ptasEditables.length === 0;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setCaso(c.key);
                        if (c.key !== 'edicion_pta') setComponentes([]);
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px',
                        borderRadius: 12, border: `2px solid ${selected ? c.color : '#E5E7EB'}`,
                        background: selected ? `${c.color}08` : 'white', cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                        transition: 'all 0.15s', opacity: disabled ? 0.55 : 1,
                      }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${c.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon style={{ width: 18, height: 18, color: c.color }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{c.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>
                          {disabled
                            ? 'Disponible solo cuando tu PTA esté aprobado en su totalidad. Mientras esté en creación o en proceso de aprobación, corrige directamente en el formulario.'
                            : c.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Componentes que se habilitarán para edición en el PTA vigente */}
            {esEdicion && (
              <div style={{ marginBottom: 18, padding: '13px 14px', borderRadius: 12, background: '#FAFCFF', border: '1px solid #DDE7F3' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 750, color: '#334155', display: 'block', marginBottom: 8 }}>
                  Componentes a editar *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(205px, 100%), 1fr))', gap: 8 }}>
                  {COMPONENTES_EDICION.map(componente => {
                    const Icon = componente.icon;
                    const selected = componentes.includes(componente.key);
                    return (
                      <button
                        key={componente.key}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${selected ? 'Quitar' : 'Agregar'} componente ${componente.label}`}
                        onClick={() => setComponentes(prev => (
                          prev.includes(componente.key)
                            ? prev.filter(item => item !== componente.key)
                            : [...prev, componente.key]
                        ))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 9, minHeight: 44, padding: '9px 10px',
                          borderRadius: 10, border: `1px solid ${selected ? `${componente.color}8C` : '#D8E0EA'}`,
                          background: selected ? `${componente.color}09` : 'white', cursor: 'pointer',
                          color: selected ? componente.color : '#334155', fontSize: '0.74rem', fontWeight: 700,
                          boxShadow: selected ? `0 0 0 1px ${componente.color}12` : '0 1px 2px rgba(15, 23, 42, 0.02)',
                          transition: 'border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                        }}
                      >
                        <span style={{ width: 26, height: 26, borderRadius: 7, background: selected ? `${componente.color}14` : '#F1F5F9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon style={{ width: 14, height: 14 }} />
                        </span>
                        {componente.label}
                        <span style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: 5, border: `1px solid ${selected ? componente.color : '#C7D2E0'}`, background: selected ? componente.color : 'white', color: 'white', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: '0.68rem', lineHeight: 1.45, color: '#64748B', margin: '10px 1px 0' }}>
                  Solo se habilitarán los componentes seleccionados; los demás conservarán su estado actual.
                </p>
              </div>
            )}

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
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '3px 10px', marginBottom: 5 }}>
                <span>{esEdicion ? 'Descripción de los cambios solicitados *' : 'Justificación detallada *'}</span>
                <span
                  aria-live="polite"
                  style={{ color: caracteresRestantes === 0 ? '#D97706' : '#64748B', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                >
                  {caracteresRestantes.toLocaleString('es-CO')} caracteres restantes
                </span>
              </label>
              <textarea
                value={justificacion}
                onChange={e => setJustificacion(e.target.value.slice(0, MAX_CARACTERES_DESCRIPCION))}
                maxLength={MAX_CARACTERES_DESCRIPCION}
                rows={5}
                placeholder={esEdicion
                  ? 'Explica qué necesitas modificar en los componentes seleccionados y el motivo del cambio...'
                  : 'Explique detalladamente por qué necesita crear un nuevo PTA. Incluya contexto, razones académicas y cualquier información relevante para el administrador (mínimo 50 palabras)...'}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${descripcionValida ? '#6EE7B7' : '#D1D5DB'}`, fontSize: '0.82rem', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
              />
              {!esEdicion && (
                <p style={{ margin: '5px 1px 0', color: wordCount >= 50 ? '#059669' : '#64748B', fontSize: '0.68rem', fontWeight: 600 }}>
                  {wordCount}/50 palabras mínimas
                </p>
              )}
            </div>

            {/* Archivos */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                Documentos de soporte opcionales (máximo 5 PDF · 10 MB cada uno)
              </label>
              {archivos.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                  {archivos.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <FileText style={{ width: 14, height: 14, color: '#DC2626', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '0.75rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{(f.size / 1024).toFixed(0)}KB</span>
                      <button type="button" aria-label={`Quitar archivo ${f.name}`} onClick={() => setArchivos(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                        <Trash2 style={{ width: 12, height: 12, color: '#DC2626' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {archivos.length < MAX_ARCHIVOS_SOLICITUD && (
                <button
                  type="button"
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
                {esEdicion
                  ? 'La aprobación habilitará únicamente los componentes seleccionados en el mismo PTA. Cada cambio y su nueva aprobación quedarán registrados en la trazabilidad.'
                  : 'Esta solicitud será enviada al administrador del sistema. Recibirás una notificación con la decisión en la sección "Mis PTAs".'}
              </p>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !formularioValido}
              style={{
                width: '100%', padding: '12px 18px', borderRadius: 12, border: 'none',
                background: !formularioValido ? '#D1D5DB' : '#003DA5',
                color: 'white', fontSize: '0.88rem', fontWeight: 700, cursor: !formularioValido ? 'not-allowed' : 'pointer',
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
