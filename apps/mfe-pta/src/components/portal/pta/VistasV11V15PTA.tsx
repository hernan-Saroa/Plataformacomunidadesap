/**
 * VistasV11V15PTA — Vistas V11-V15 del Portal Docente PTA
 *
 * V11: Calendario Académico Personal — Visualización tipo calendario de asignaturas y actividades
 * V12: Adjuntos y Documentos — Gestión de documentos asociados al PTA
 * V13: Indicadores Personales — KPIs individuales del docente vs promedios institucionales
 * V14: Certificado Digital — Visualización del certificado de firma para PTAs aprobados
 * V15: Configuración Personal — Preferencias del docente (notificaciones, idioma, tema)
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, FileText, Upload, Download, Trash2,
  BarChart3, TrendingUp, Target, Award, Shield, Settings,
  Bell, Eye, Palette, Globe, ChevronRight, CheckCircle,
  AlertTriangle, Paperclip, FileImage, File, BookOpen,
  Star, Users, Zap, Info, Lock, Check, X, FlaskConical,
  Briefcase, Send, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import {
  registrarEvidenciaPTA, getEvidenciasPTA, eliminarEvidenciaPTA, uploadEvidenciaFile,
} from '../../../services/api/ptaApi';

// ═══ V11: Calendario Académico Personal ══════════════════════════════

interface CalendarioAcademicoProps {
  ptas: any[];
  periodo: string;
}

export function V11CalendarioAcademico({ ptas, periodo }: CalendarioAcademicoProps) {
  const [mesActual, setMesActual] = useState(new Date().getMonth());
  const [anio] = useState(2026);
  const [vistaMode, setVistaMode] = useState<'mes' | 'semana'>('mes');

  const asignaturas = useMemo(() => {
    const items: any[] = [];
    ptas.forEach(pta => {
      (pta.asignaturas || []).forEach((a: any) => {
        items.push({
          ...a,
          ptaId: pta.id,
          ptaPeriodo: pta.periodo,
          ptaEstado: pta.estado,
        });
      });
    });
    return items;
  }, [ptas]);

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Generate calendar days
  const diasDelMes = useMemo(() => {
    const firstDay = new Date(anio, mesActual, 1).getDay();
    const daysInMonth = new Date(anio, mesActual + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [mesActual, anio]);

  // Simulate events on calendar
  const eventosCalendario = useMemo(() => {
    const events: Record<number, { tipo: string; nombre: string; color: string }[]> = {};
    const hoy = new Date().getDate();

    // Clases regulares (lunes a viernes)
    asignaturas.slice(0, 5).forEach((a, i) => {
      const diasClase = [1 + i, 8 + i, 15 + i, 22 + i].filter(d => d <= 28);
      diasClase.forEach(d => {
        if (!events[d]) events[d] = [];
        events[d].push({
          tipo: 'clase',
          nombre: a.asignatura_nombre || a.nombre || `Asignatura ${i + 1}`,
          color: ['#003DA5', '#7C3AED', '#059669', '#D97706', '#DC2626'][i % 5],
        });
      });
    });

    // Deadlines / hitos
    [5, 12, 19, 26].forEach((d, i) => {
      if (!events[d]) events[d] = [];
      events[d].push({
        tipo: 'hito',
        nombre: ['Entrega parcial', 'Evaluación', 'Revisión programa', 'Cierre notas'][i],
        color: '#DC2626',
      });
    });

    return events;
  }, [asignaturas]);

  const totalHorasSemana = asignaturas.reduce((s, a) => s + (a.horas_semanales || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Calendar style={{ width: 20, height: 20, color: '#003DA5' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
          Calendario Académico Personal
        </h3>
      </div>

      {/* Summary strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 8, marginBottom: 16,
      }}>
        {[
          { label: 'Asignaturas', value: asignaturas.length, icon: BookOpen, color: '#003DA5' },
          { label: 'Horas/semana', value: totalHorasSemana, icon: Clock, color: '#7C3AED' },
          { label: 'Periodo', value: periodo, icon: Calendar, color: '#059669' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'white', border: '1px solid #F3F4F6',
          }}>
            <s.icon style={{ width: 14, height: 14, color: s.color, marginBottom: 4 }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Mode toggle + month nav */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMesActual(Math.max(0, mesActual - 1))}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            &lt;
          </button>
          <span style={{ padding: '4px 14px', fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>
            {meses[mesActual]} {anio}
          </span>
          <button
            onClick={() => setMesActual(Math.min(11, mesActual + 1))}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', fontSize: '0.78rem' }}
          >
            &gt;
          </button>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {(['mes', 'semana'] as const).map(m => (
            <button
              key={m}
              onClick={() => setVistaMode(m)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                border: vistaMode === m ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
                background: vistaMode === m ? '#EFF6FF' : 'white',
                color: vistaMode === m ? '#003DA5' : '#6B7280',
                cursor: 'pointer',
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E5E7EB' }}>
          {diasSemana.map(d => (
            <div key={d} style={{
              padding: '8px 4px', textAlign: 'center', fontSize: '0.68rem',
              fontWeight: 700, color: '#6B7280', background: '#F9FAFB',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {diasDelMes.map((dia, i) => {
            const events = dia ? eventosCalendario[dia] || [] : [];
            const isToday = dia === new Date().getDate() && mesActual === new Date().getMonth();
            return (
              <div
                key={i}
                style={{
                  minHeight: 60, padding: 4,
                  borderRight: (i + 1) % 7 !== 0 ? '1px solid #F3F4F6' : undefined,
                  borderBottom: '1px solid #F3F4F6',
                  background: isToday ? '#EFF6FF' : dia ? 'white' : '#FAFAFA',
                }}
              >
                {dia && (
                  <>
                    <div style={{
                      fontSize: '0.7rem', fontWeight: isToday ? 800 : 500,
                      color: isToday ? '#003DA5' : '#374151', marginBottom: 2,
                    }}>
                      {dia}
                    </div>
                    {events.slice(0, 2).map((evt, j) => (
                      <div key={j} style={{
                        padding: '1px 4px', borderRadius: 3, marginBottom: 1,
                        background: `${evt.color}15`, borderLeft: `2px solid ${evt.color}`,
                        fontSize: '0.52rem', color: evt.color, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {evt.nombre}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div style={{ fontSize: '0.5rem', color: '#9CA3AF', fontWeight: 600 }}>
                        +{events.length - 2} más
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Asignaturas list */}
      <div style={{ marginTop: 14 }}>
        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Asignaturas programadas
        </h4>
        {asignaturas.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center', padding: 30 }}>
            Sin asignaturas registradas en este periodo
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {asignaturas.map((a, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8,
                background: 'white', border: '1px solid #F3F4F6',
                fontSize: '0.78rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: ['#003DA5', '#7C3AED', '#059669', '#D97706', '#DC2626'][i % 5],
                  }} />
                  <span style={{ fontWeight: 600, color: '#374151' }}>
                    {a.asignatura_nombre || a.nombre}
                  </span>
                </div>
                <span style={{ color: '#6B7280', fontSize: '0.72rem' }}>
                  {a.horas_semanales || 0}h/sem • {a.creditos || 0}cr • {a.grupos || 1} grupo(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ V12: Adjuntos y Documentos ══════════════════════════════════════

// Componentes del PTA
const COMPONENTES_PTA = [
  { key: 'docencia', label: 'Docencia', color: PTA_COLORS.DOCENCIA, icon: BookOpen },
  { key: 'investigacion', label: 'Investigación', color: PTA_COLORS.INVESTIGACION, icon: FlaskConical },
  { key: 'extension', label: 'Extensión', color: PTA_COLORS.EXTENSION, icon: Globe },
  { key: 'complementarias', label: 'Complementarias', color: PTA_COLORS.COMPLEMENTARIAS, icon: Briefcase },
  { key: 'acad_admin', label: 'Acad. Admin.', color: PTA_COLORS.ACAD_ADMIN, icon: Shield },
] as const;

interface AdjuntosDocumentosProps {
  ptas: any[];
  userName: string;
  // Cuando se usa desde v06_detalle (PTA específico aprobado)
  ptaId?: string;
  ptaData?: any;
}

export function V12AdjuntosDocumentos({ ptas, userName, ptaId: ptaIdProp, ptaData }: AdjuntosDocumentosProps) {
  // Si se pasa ptaIdProp usamos ese PTA, si no, usamos el primero de la lista
  const activePtaId = ptaIdProp || ptas[0]?.id || '';
  const activePta = ptaData || ptas[0];

  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filtroComponente, setFiltroComponente] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state — soporta múltiples archivos (máx 10)
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [formComponente, setFormComponente] = useState('investigacion');
  const [formHoras, setFormHoras] = useState<number>(0);
  const [formDescripcion, setFormDescripcion] = useState('');

  // Calcular horas por componente del PTA
  const horasPorComponente: Record<string, number> = {
    docencia: activePta?.horas_docencia || 0,
    investigacion: activePta?.horas_investigacion || 0,
    extension: activePta?.horas_extension || 0,
    complementarias: activePta?.horas_complementarias || 0,
    acad_admin: activePta?.horas_acad_admin || 0,
  };

  // Horas aprobadas por componente (de evidencias aprobadas)
  const horasAprobadasPorComponente = useMemo(() => {
    const acc: Record<string, number> = { docencia: 0, investigacion: 0, extension: 0, complementarias: 0, acad_admin: 0 };
    evidencias.forEach(e => {
      if (e.estado_revision === 'aprobado' && e.componente_pta && acc[e.componente_pta] !== undefined) {
        acc[e.componente_pta] += Number(e.horas_avance) || 0;
      }
    });
    return acc;
  }, [evidencias]);

  const loadEvidencias = async () => {
    if (!activePtaId) return;
    setLoading(true);
    const res = await getEvidenciasPTA(activePtaId);
    if (res.success) setEvidencias(res.data || []);
    setLoading(false);
  };

  useEffect(() => { loadEvidencias(); }, [activePtaId]);

  const fileIcon = (nombre: string) => {
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return { icon: FileText, color: '#DC2626' };
    if (['xlsx', 'xls'].includes(ext)) return { icon: File, color: '#059669' };
    if (['docx', 'doc'].includes(ext)) return { icon: FileText, color: '#1E40AF' };
    if (['jpg', 'jpeg', 'png'].includes(ext)) return { icon: FileImage, color: '#D97706' };
    return { icon: File, color: '#6B7280' };
  };

  const revisionBadge = (estado_revision?: string) => {
    if (estado_revision === 'aprobado') return { label: 'Aprobado', color: '#065F46', bg: '#D1FAE5', icon: CheckCircle2 };
    if (estado_revision === 'rechazado') return { label: 'Rechazado', color: '#991B1B', bg: '#FEE2E2', icon: XCircle };
    return { label: 'Pendiente revisión', color: '#92400E', bg: '#FEF3C7', icon: Clock };
  };

  const handleFilesSelect = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`"${f.name}" supera los 10 MB`); continue; }
      valid.push(f);
    }
    if (valid.length === 0) return;
    setFormFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > 10) { toast.error('Máximo 10 archivos por carga'); return combined.slice(0, 10); }
      return combined;
    });
    setShowForm(true);
  };

  const removeFormFile = (idx: number) => {
    setFormFiles(prev => { const next = prev.filter((_, i) => i !== idx); if (next.length === 0) { setShowForm(false); } return next; });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (formFiles.length === 0 || !activePtaId) return;
    if (formHoras <= 0) { toast.error('Indica cuántas horas avanza esta carga'); return; }
    const maxHoras = horasPorComponente[formComponente] || 0;
    const yaRegistradas = (evidencias
      .filter(e => e.componente_pta === formComponente && e.estado !== 'eliminado')
      .reduce((s: number, e: any) => s + (Number(e.horas_avance) || 0), 0));
    if (maxHoras > 0 && yaRegistradas + formHoras > maxHoras) {
      toast.error(`Superas las horas del componente (${maxHoras}h). Ya tienes ${yaRegistradas}h registradas.`);
      return;
    }
    setSubmitting(true);
    let ok = 0;
    // Las horas se asignan solo al primer archivo; los demás son soportes adicionales (0h)
    for (let i = 0; i < formFiles.length; i++) {
      const f = formFiles[i];
      const ext = f.name.split('.').pop()?.toLowerCase() || 'bin';
      // Subir archivo real al backend
      const uploadRes = await uploadEvidenciaFile(activePtaId, f);
      const fileUrl = uploadRes.success && uploadRes.data ? uploadRes.data.url : '';
      const storagePath = uploadRes.success && uploadRes.data ? uploadRes.data.url : `pta/${activePtaId}/evidencias/${Date.now()}_${f.name}`;
      const res = await registrarEvidenciaPTA(activePtaId, {
        nombre: f.name,
        tipo_archivo: ext,
        tamanio_bytes: f.size,
        categoria: COMPONENTES_PTA.find(c => c.key === formComponente)?.label || formComponente,
        componente_pta: formComponente,
        horas_avance: i === 0 ? formHoras : 0,
        storage_path: storagePath,
        storage_url: fileUrl,
        subido_por: userName,
        descripcion: i === 0 ? formDescripcion : `Adjunto ${i + 1} de ${formFiles.length}`,
      } as any);
      if (res.success) ok++;
    }
    if (ok > 0) {
      toast.success(`${ok} documento${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''}`);
      setShowForm(false); setFormFiles([]); setFormHoras(0); setFormDescripcion('');
      loadEvidencias();
    } else {
      toast.error('Error al registrar los documentos');
    }
    setSubmitting(false);
  };

  const handleDelete = async (evidenciaId: string) => {
    if (!window.confirm('¿Eliminar este documento?')) return;
    const res = await eliminarEvidenciaPTA(activePtaId, evidenciaId);
    if (res.success) { toast.success('Documento eliminado'); loadEvidencias(); }
    else toast.error('Error al eliminar');
  };

  const filteredEvidencias = filtroComponente
    ? evidencias.filter(e => e.componente_pta === filtroComponente)
    : evidencias;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Paperclip style={{ width: 20, height: 20, color: '#003DA5' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
            Seguimiento — Documentos de soporte
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500 }}>
            ({evidencias.length} archivos)
          </span>
        </div>
        <button
          onClick={() => loadEvidencias()}
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Recargar"
        >
          <RefreshCw style={{ width: 13, height: 13, color: '#6B7280' }} />
        </button>
      </div>

      {/* Progress por componente */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 10 }}>
          Progreso por componente (horas aprobadas)
        </div>
        {COMPONENTES_PTA.map(comp => {
          const total = horasPorComponente[comp.key] || 0;
          const aprobadas = horasAprobadasPorComponente[comp.key] || 0;
          const pct = total > 0 ? Math.min((aprobadas / total) * 100, 100) : 0;
          // Se muestran SIEMPRE los 5 componentes fijos (aunque el PTA tenga 0h en alguno).
          const Ic = comp.icon;
          return (
            <div key={comp.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ic style={{ width: 13, height: 13, color: comp.color, flexShrink: 0 }} />
              <span style={{ width: 110, fontSize: '0.68rem', fontWeight: 600, color: '#374151', flexShrink: 0 }}>{comp.label}</span>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: comp.color, transition: 'width 0.4s' }} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: comp.color, width: 70, textAlign: 'right', flexShrink: 0 }}>
                {aprobadas}h / {total}h
              </span>
            </div>
          );
        })}
      </div>

      {/* Upload form (modal inline) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369A1', marginBottom: 8 }}>
              Registrar {formFiles.length} archivo{formFiles.length > 1 ? 's' : ''}:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {formFiles.map((f, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.68rem', color: '#1E40AF', fontWeight: 600 }}>
                  {f.name.length > 25 ? f.name.substring(0, 22) + '...' : f.name}
                  <button onClick={() => removeFormFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {formFiles.length < 10 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '2px 8px', borderRadius: 6, border: '1px dashed #9CA3AF', background: 'white', fontSize: '0.68rem', color: '#6B7280', cursor: 'pointer' }}
                >+ Agregar más</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Componente del PTA *</label>
                <select
                  value={formComponente}
                  onChange={e => setFormComponente(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', background: 'white' }}
                >
                  {COMPONENTES_PTA.map(c => (
                    <option key={c.key} value={c.key}>{c.label} ({horasPorComponente[c.key] || 0}h)</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Horas que avanza *</label>
                <input
                  type="number" min={1} max={horasPorComponente[formComponente] || 800}
                  value={formHoras || ''}
                  onChange={e => setFormHoras(Number(e.target.value))}
                  placeholder="ej. 40"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Descripción (opcional)</label>
              <input
                value={formDescripcion}
                onChange={e => setFormDescripcion(e.target.value)}
                placeholder="Breve descripción del documento..."
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSubmit} disabled={submitting}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: submitting ? 0.6 : 1 }}
              >
                <Send style={{ width: 14, height: 14 }} />
                {submitting ? 'Enviando...' : 'Registrar documento'}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormFiles([]); }}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: '0.82rem', color: '#6B7280', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      {!showForm && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '22px 20px', borderRadius: 12, textAlign: 'center',
            border: `2px dashed ${dragOver ? '#003DA5' : '#D1D5DB'}`,
            background: dragOver ? '#EFF6FF' : '#FAFAFA',
            marginBottom: 14, transition: 'all 0.2s', cursor: 'pointer',
          }}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files && e.target.files.length > 0) handleFilesSelect(e.target.files); e.target.value = ''; }} />
          <Upload style={{ width: 26, height: 26, color: dragOver ? '#003DA5' : '#9CA3AF', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '0.85rem', color: dragOver ? '#003DA5' : '#6B7280', fontWeight: 600, margin: 0 }}>
            {dragOver ? 'Suelta aquí tu archivo' : 'Arrastra archivos o haz clic para adjuntar'}
          </p>
          <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '4px 0 0' }}>
            PDF, DOCX, XLSX, imágenes — Máx. 10 MB
          </p>
        </div>
      )}

      {/* Filtros por componente */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setFiltroComponente('')} style={{ padding: '3px 9px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, border: !filtroComponente ? '1.5px solid #003DA5' : '1px solid #E5E7EB', background: !filtroComponente ? '#EFF6FF' : 'white', color: !filtroComponente ? '#003DA5' : '#6B7280', cursor: 'pointer' }}>
          Todos
        </button>
        {COMPONENTES_PTA.map(comp => (
          <button key={comp.key} onClick={() => setFiltroComponente(comp.key)} style={{ padding: '3px 9px', borderRadius: 6, fontSize: '0.68rem', fontWeight: 600, border: filtroComponente === comp.key ? `1.5px solid ${comp.color}` : '1px solid #E5E7EB', background: filtroComponente === comp.key ? `${comp.color}15` : 'white', color: filtroComponente === comp.key ? comp.color : '#6B7280', cursor: 'pointer' }}>
            {comp.label}
          </button>
        ))}
      </div>

      {/* Lista evidencias */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: '0.82rem' }}>Cargando documentos...</div>
      ) : filteredEvidencias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', background: '#F9FAFB', borderRadius: 12 }}>
          <Paperclip style={{ width: 32, height: 32, color: '#D1D5DB', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0 }}>Sin documentos registrados{filtroComponente ? ` en ${COMPONENTES_PTA.find(c => c.key === filtroComponente)?.label}` : ''}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredEvidencias.map((ev, i) => {
            const fi = fileIcon(ev.nombre || '');
            const FI = fi.icon;
            const badge = revisionBadge(ev.estado_revision);
            const BadgeIcon = badge.icon;
            const comp = COMPONENTES_PTA.find(c => c.key === ev.componente_pta);
            return (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'white', border: `1px solid ${ev.estado_revision === 'rechazado' ? '#FCA5A5' : ev.estado_revision === 'aprobado' ? '#6EE7B7' : '#E5E7EB'}` }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${fi.color}10`, flexShrink: 0, marginTop: 2 }}>
                  <FI style={{ width: 16, height: 16, color: fi.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.nombre}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    {comp && (
                      <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: `${comp.color}15`, color: comp.color }}>
                        {comp.label}
                      </span>
                    )}
                    {ev.horas_avance > 0 && (
                      <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: '#EFF6FF', color: '#1E40AF' }}>
                        {ev.horas_avance}h
                      </span>
                    )}
                    <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: badge.bg, color: badge.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                      <BadgeIcon style={{ width: 9, height: 9 }} /> {badge.label}
                    </span>
                    {ev.descripcion && (
                      <span style={{ fontSize: '0.62rem', color: '#64748B', fontStyle: 'italic' }} title={ev.descripcion}>📝 {ev.descripcion.substring(0, 40)}{ev.descripcion.length > 40 ? '...' : ''}</span>
                    )}
                  </div>
                  {ev.comentario_revision && (
                    <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6, background: ev.estado_revision === 'rechazado' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${ev.estado_revision === 'rechazado' ? '#FECACA' : '#BBF7D0'}`, fontSize: '0.65rem', color: ev.estado_revision === 'rechazado' ? '#991B1B' : '#166534' }}>
                      <strong>Revisor:</strong> {ev.comentario_revision}
                    </div>
                  )}
                  <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>
                    {new Date(ev.fecha_subida).toLocaleDateString('es-CO')} — {(ev.tamanio_bytes / 1024).toFixed(0)} KB
                  </div>
                </div>
                {ev.estado_revision !== 'aprobado' && (
                  <button onClick={() => handleDelete(ev.id)} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Trash2 style={{ width: 12, height: 12, color: '#DC2626' }} />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ V13: Indicadores Personales ═════════════════════════════════════

interface IndicadoresPersonalesProps {
  ptas: any[];
  userName: string;
}

export function V13IndicadoresPersonales({ ptas, userName }: IndicadoresPersonalesProps) {
  const indicadores = useMemo(() => {
    const total = ptas.length;
    const aprobados = ptas.filter(p => p.estado === 'Aprobado').length;
    const horasTotal = ptas.reduce((s, p) => s + (p.total_horas_programadas || 0), 0);
    const horasDisp = ptas.reduce((s, p) => s + (p.horas_a_programar || 800), 0);
    const asigTotal = ptas.reduce((s, p) => s + (p.asignaturas?.length || p.num_asignaturas || 0), 0);
    const pctCarga = horasDisp > 0 ? Math.round((horasTotal / horasDisp) * 100) : 0;
    const tasaAprobacion = total > 0 ? Math.round((aprobados / total) * 100) : 0;
    const tiempoPromedio = 12; // simulated days
    const promedioInstitucional = 74; // simulated

    return {
      total, aprobados, horasTotal, horasDisp, asigTotal,
      pctCarga, tasaAprobacion, tiempoPromedio, promedioInstitucional,
    };
  }, [ptas]);

  const kpis = [
    {
      label: 'Tasa de Aprobación', value: `${indicadores.tasaAprobacion}%`,
      subtitle: `${indicadores.aprobados}/${indicadores.total} PTAs`,
      icon: CheckCircle, color: '#059669', bg: '#D1FAE5',
      benchmark: 'Prom. institucional: 87%',
    },
    {
      label: 'Carga Horaria', value: `${indicadores.pctCarga}%`,
      subtitle: `${indicadores.horasTotal}/${indicadores.horasDisp}h`,
      icon: Clock, color: '#003DA5', bg: '#EFF6FF',
      benchmark: `Prom. inst: ${indicadores.promedioInstitucional}%`,
    },
    {
      label: 'Asignaturas', value: indicadores.asigTotal,
      subtitle: 'Total programadas',
      icon: BookOpen, color: '#7C3AED', bg: '#F3E8FF',
      benchmark: 'Prom. inst: 6.2',
    },
    {
      label: 'Tiempo Aprobación', value: `${indicadores.tiempoPromedio}d`,
      subtitle: 'Promedio días',
      icon: Zap, color: '#D97706', bg: '#FEF3C7',
      benchmark: 'SLA: 15 días',
    },
  ];

  // Progress bars data
  const barras = [
    { label: 'Docencia', pct: Math.min(indicadores.pctCarga * 0.6, 100), color: PTA_COLORS.DOCENCIA, max: '50%' },
    { label: 'Investigación', pct: Math.min(indicadores.pctCarga * 0.25, 100), color: PTA_COLORS.INVESTIGACION, max: '25%' },
    { label: 'Extensión', pct: Math.min(indicadores.pctCarga * 0.15, 100), color: PTA_COLORS.EXTENSION, max: '25%' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <BarChart3 style={{ width: 20, height: 20, color: '#003DA5' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
          Indicadores Personales
        </h3>
        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
          — {userName}
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
              padding: '16px 18px', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: -8, right: -8, width: 48, height: 48,
              borderRadius: '50%', background: kpi.bg, opacity: 0.5,
            }} />
            <kpi.icon style={{ width: 18, height: 18, color: kpi.color, marginBottom: 8 }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
              {kpi.value}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginTop: 2 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 1 }}>{kpi.subtitle}</div>
            <div style={{
              marginTop: 8, padding: '3px 8px', borderRadius: 4,
              background: '#F9FAFB', fontSize: '0.6rem', color: '#6B7280',
              display: 'inline-block',
            }}>
              {kpi.benchmark}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Distribution bars */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
        padding: '18px 22px', marginBottom: 16,
      }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Target style={{ width: 15, height: 15, color: '#003DA5' }} />
          Distribución de carga por componente
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {barras.map(b => (
            <div key={b.label}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 4,
              }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{b.label}</span>
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                  {Math.round(b.pct)}% / {b.max}
                </span>
              </div>
              <div style={{ width: '100%', height: 8, borderRadius: 4, background: '#F3F4F6' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.pct}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  style={{ height: '100%', borderRadius: 4, background: b.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance summary */}
      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
        padding: '18px 22px',
      }}>
        <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star style={{ width: 15, height: 15, color: '#D97706' }} />
          Resumen de rendimiento
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Cumplimiento SLA', value: indicadores.tiempoPromedio <= 15, text: indicadores.tiempoPromedio <= 15 ? 'Dentro del plazo' : 'Excedido' },
            { label: 'Carga balanceada', value: indicadores.pctCarga >= 60 && indicadores.pctCarga <= 100, text: indicadores.pctCarga >= 60 ? 'Adecuada' : 'Baja utilización' },
            { label: 'PTAs sin devolución', value: !ptas.some(p => p.estado === 'Devuelto'), text: ptas.some(p => p.estado === 'Devuelto') ? 'Tiene devoluciones' : 'Sin devoluciones' },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 8,
              background: item.value ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${item.value ? '#BBF7D0' : '#FECACA'}`,
            }}>
              {item.value ? (
                <CheckCircle style={{ width: 16, height: 16, color: '#059669' }} />
              ) : (
                <AlertTriangle style={{ width: 16, height: 16, color: '#DC2626' }} />
              )}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{item.label}</span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: item.value ? '#059669' : '#DC2626' }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ V14: Certificado Digital (vista docente) ════════════════════════

interface CertificadoDigitalPortalProps {
  ptas: any[];
  userName: string;
  onVerificar?: (certId: string) => void;
}

export function V14CertificadoDigitalPortal({ ptas, userName, onVerificar }: CertificadoDigitalPortalProps) {
  const ptasAprobados = ptas.filter(p => p.estado === 'Aprobado');
  const ptasFirmados = ptasAprobados.filter(p => p.firma_digital?.certificado_id);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Award style={{ width: 20, height: 20, color: '#003DA5' }} />
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
          PTAs Firmados
        </h3>
      </div>

      {ptasAprobados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '50px 20px',
          background: '#F9FAFB', borderRadius: 14, border: '1px solid #E5E7EB',
        }}>
          <Shield style={{ width: 36, height: 36, color: '#D1D5DB', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 600 }}>
            Aún no tienes PTAs firmados
          </p>
          <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>
            Los documentos aparecerán aquí una vez finalice el flujo de firma digital
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ptasAprobados.map((pta, i) => {
            const hasFirma = pta.firma_digital?.certificado_id;
            return (
              <motion.div
                key={pta.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  background: 'white', borderRadius: 14,
                  border: hasFirma ? '2px solid #6EE7B7' : '1px solid #E5E7EB',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div style={{
                  padding: '14px 20px',
                  background: hasFirma ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#F9FAFB',
                  color: hasFirma ? 'white' : '#374151',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {hasFirma ? (
                      <Shield style={{ width: 18, height: 18 }} />
                    ) : (
                      <Lock style={{ width: 18, height: 18, color: '#9CA3AF' }} />
                    )}
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        PTA — Periodo {pta.periodo || '2025-2'}
                      </div>
                      <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                        {hasFirma ? `Cert: ${pta.firma_digital.certificado_id}` : 'Firma digital pendiente'}
                      </div>
                    </div>
                  </div>
                  {hasFirma && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 6,
                      background: 'rgba(255,255,255,0.2)',
                      fontSize: '0.68rem', fontWeight: 700,
                    }}>
                      VERIFICADO
                    </span>
                  )}
                </div>

                {/* Body */}
                <div style={{ padding: '14px 20px' }}>
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px',
                    fontSize: '0.78rem', marginBottom: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Docente</div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{userName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Horas</div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>
                        {pta.total_horas_programadas || 0}/{pta.horas_a_programar || 800}h
                      </div>
                    </div>
                    {hasFirma && (
                      <>
                        <div>
                          <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Firmante</div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{pta.firma_digital.firmante}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Fecha firma</div>
                          <div style={{ fontWeight: 600, color: '#111827' }}>
                            {new Date(pta.firma_digital.timestamp).toLocaleDateString('es-CO')}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {hasFirma && (
                    <div style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: '#F3F4F6', marginBottom: 10,
                    }}>
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>HASH</div>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: '#374151', wordBreak: 'break-all' }}>
                        {pta.firma_digital.hash}
                      </div>
                    </div>
                  )}

                  {hasFirma && onVerificar && (
                    <button
                      onClick={() => onVerificar(pta.firma_digital.certificado_id)}
                      style={{
                        width: '100%', padding: '8px 16px', borderRadius: 8,
                        border: '1px solid #6EE7B7', background: '#F0FDF4',
                        color: '#059669', fontSize: '0.82rem', fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: 6,
                      }}
                    >
                      <Eye style={{ width: 14, height: 14 }} /> Verificar certificado
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}


