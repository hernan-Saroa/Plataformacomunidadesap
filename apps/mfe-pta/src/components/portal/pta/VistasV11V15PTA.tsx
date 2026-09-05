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
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, FileText, Upload, Download, Trash2,
  BarChart3, TrendingUp, Target, Award, Shield, Settings,
  Bell, Eye, Palette, Globe, ChevronRight, CheckCircle,
  AlertTriangle, Paperclip, FileImage, File, BookOpen,
  Star, Users, Zap, Info, Lock, Check, X, FlaskConical,
  Briefcase, Send, RefreshCw, CheckCircle2, XCircle,
} from 'lucide-react';
import { docentePtaAlert as toast } from './DocentePtaAlert';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import { getPtaComponentDisplayStatus } from '../../pta/shared/ptaComponentStatus';
import { agruparEvidenciasPorJustificacion, ptaHabilitadoParaSeguimiento } from '../../pta/shared/evidenciasJustificacion';
import { resolvePtaFileUrl } from '../../pta/shared/ptaFiles';
import {
  registrarEvidenciaPTA, getEvidenciasPTA, eliminarEvidenciaPTA, uploadEvidenciaFile,
} from '../../../services/api/ptaApi';
import { formatPtaPercentage, getPtaCompletionPercentage } from '../../../utils/ptaCompletion';
import { cargarPreviewOffice, puedePrevisualizarOffice, ESTILOS_PREVIEW_OFFICE } from '../../../utils/officePreview';

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
  // Complementarias incluye la sub-sección Académico-Administrativa (AADM fusionado).
  { key: 'complementarias', label: 'Complementarias', color: PTA_COLORS.COMPLEMENTARIAS, icon: Briefcase },
] as const;

const CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION = 'Resolución proyecto de investigación';

function esResolucionProyectoInvestigacion(evidencia: any): boolean {
  return normalizeEvidenceStatus(evidencia?.categoria)
    .startsWith(normalizeEvidenceStatus(CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION));
}

function esResolucionAnticipadaEnCreacion(evidencia: any): boolean {
  return esResolucionProyectoInvestigacion(evidencia)
    && normalizeEvidenceStatus(evidencia?.categoria).includes('creacion');
}

// Secciones de extensión (a nivel de permiso de aprobación pta.approve.extension.*).
// Solo aplica cuando el componente de la evidencia es 'extension'. El valor se guarda
// en la evidencia como `seccion_extension` y determina qué aprobador puede revisarla.
const SECCIONES_EXTENSION = [
  { key: 'capacitacion', label: 'Capacitación' },
  { key: 'seleccion', label: 'Procesos de selección' },
  { key: 'fortalecimiento', label: 'Fortalecimiento' },
  { key: 'alto_gobierno', label: 'Alto Gobierno' },
] as const;

// Normaliza la sección de una actividad de extensión del PTA a una de las 4 secciones
// de aprobación. laboratorio_innovacion / investigacion_aplicada se pliegan en
// fortalecimiento (coherente con el backoffice). Cualquier otra queda como null.
function normalizarSeccionExtension(seccion: unknown): string | null {
  const key = String(seccion || '').trim();
  if (key === 'laboratorio_innovacion' || key === 'investigacion_aplicada') return 'fortalecimiento';
  if (['capacitacion', 'seleccion', 'fortalecimiento', 'alto_gobierno'].includes(key)) return key;
  return null;
}

type EstadoRevisionEvidencia = 'pendiente' | 'aprobado' | 'rechazado';

function normalizeEvidenceStatus(value?: string | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function getEvidenceRevisionStatus(evidencia: any): EstadoRevisionEvidencia {
  const estado = normalizeEvidenceStatus(evidencia?.estado_revision ?? evidencia?.estadoRevision ?? evidencia);
  if (estado === 'aprobado' || estado === 'aprobada') return 'aprobado';
  if (estado === 'rechazado' || estado === 'rechazada' || estado === 'denegado' || estado === 'denegada') return 'rechazado';
  return 'pendiente';
}

function isActiveEvidence(evidencia: any) {
  return !['eliminado', 'eliminada', 'deleted'].includes(normalizeEvidenceStatus(evidencia?.estado));
}

function isApprovedEvidence(evidencia: any) {
  return isActiveEvidence(evidencia) && getEvidenceRevisionStatus(evidencia) === 'aprobado';
}

function isReservedEvidence(evidencia: any) {
  return isActiveEvidence(evidencia) && getEvidenceRevisionStatus(evidencia) !== 'rechazado';
}

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
  const tienePtaActivo = Boolean(activePta && activePtaId);
  const estadoPtaNormalizado = normalizeEvidenceStatus(activePta?.estado);
  const esPtaBorrador = estadoPtaNormalizado === 'borrador';

  // El cargue de justificaciones solo se habilita con el PTA totalmente aprobado
  // (todos sus componentes). Mientras tanto la vista se muestra bloqueada.
  const seguimientoBloqueado = !tienePtaActivo || !ptaHabilitadoParaSeguimiento(activePta);

  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filtroComponente, setFiltroComponente] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; nombre: string; tipo: string } | null>(null);
  // HTML del documento de Office convertido en el navegador (null = cargando).
  const [officeHtml, setOfficeHtml] = useState<string | null>(null);
  const [officeError, setOfficeError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convierte el adjunto al abrir la previsualización. El flag `cancelado` evita
  // pintar el resultado de un documento que el usuario ya cerró (o cambió por otro).
  useEffect(() => {
    if (!previewFile || !puedePrevisualizarOffice(previewFile.nombre)) {
      setOfficeHtml(null);
      setOfficeError('');
      return;
    }
    let cancelado = false;
    setOfficeHtml(null);
    setOfficeError('');
    cargarPreviewOffice(previewFile.url, previewFile.nombre)
      .then(res => { if (!cancelado) setOfficeHtml(res.html); })
      .catch(err => {
        if (cancelado) return;
        console.error('[mfe-pta] No se pudo previsualizar el documento:', err);
        setOfficeError(err?.message || 'No se pudo previsualizar este documento.');
      });
    return () => { cancelado = true; };
  }, [previewFile?.url, previewFile?.nombre]);

  // Botones Ver/Descargar por archivo (mismo patrón que el Seguimiento del backoffice).
  const renderBotonesArchivo = (ev: any, compacto = false) => {
    const ext = (ev.tipo_archivo || ev.nombre?.split('.').pop() || '').toLowerCase();
    const hasRealFile = !!(ev.storage_url && String(ev.storage_url).startsWith('/uploads'));
    const canPreview = hasRealFile && ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    const fileUrl = resolvePtaFileUrl(ev.storage_url || ev.storage_path || '');
    if (!hasRealFile && (!fileUrl || fileUrl === '#')) return null;
    const pad = compacto ? '2px 8px' : '3px 10px';
    const fs = compacto ? '0.6rem' : '0.65rem';
    const ic = compacto ? 10 : 11;
    return (
      <>
        {canPreview && (
          <button
            onClick={(e2) => { e2.stopPropagation(); setPreviewFile({ url: fileUrl, nombre: ev.nombre, tipo: ext }); }}
            style={{ padding: pad, borderRadius: 6, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1E40AF', fontSize: fs, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
          >
            <Eye style={{ width: ic, height: ic }} /> Ver
          </button>
        )}
        <a
          href={fileUrl}
          download={ev.nombre}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e2 => e2.stopPropagation()}
          style={{ padding: pad, borderRadius: 6, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: fs, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', flexShrink: 0 }}
        >
          <Download style={{ width: ic, height: ic }} /> Descargar
        </a>
      </>
    );
  };

  // Form state — soporta múltiples archivos (máx 10)
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [formComponente, setFormComponente] = useState('investigacion');
  const [formSeccionExtension, setFormSeccionExtension] = useState('');
  const [formHoras, setFormHoras] = useState<number>(0);
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formOrigen, setFormOrigen] = useState<'general' | 'resolucion_proyecto'>('general');

  const proyectoInvestigacion = activePta?.investigacion_proyecto || null;
  const horasProyectoInvestigacion = Math.max(
    0,
    Number(proyectoInvestigacion?.horas_solicitadas) || 0,
  );
  // La resolución respalda automáticamente la totalidad de las horas aprobadas
  // para el proyecto; no existe una asignación documental independiente.
  const horasResolucionObjetivo = horasProyectoInvestigacion;
  const evidenciasResolucionProyecto = evidencias.filter(esResolucionProyectoInvestigacion);
  const horasResolucionReservadas = evidenciasResolucionProyecto.reduce(
    (total, evidencia) => total + (isReservedEvidence(evidencia)
      ? Number(evidencia?.horas_avance) || 0
      : 0),
    0,
  );
  const horasResolucionAprobadas = evidenciasResolucionProyecto.reduce(
    (total, evidencia) => total + (isApprovedEvidence(evidencia)
      ? Number(evidencia?.horas_avance) || 0
      : 0),
    0,
  );
  const horasResolucionPendientes = Math.max(
    horasResolucionObjetivo - horasResolucionReservadas,
    0,
  );

  // Clave efectiva de cupo de horas: la extensión se separa por sección
  // (extension:capacitacion, extension:seleccion, ...). El resto usa su componente.
  const evidenciaHorasKey = (componente: string, seccion?: string | null): string =>
    componente === 'extension' && seccion ? `extension:${seccion}` : componente;

  // Horas de extensión POR SECCIÓN, tomadas del PTA (extension_actividades).
  // La extensión ya NO es un cupo global: cada sección tiene sus propias horas.
  const horasExtensionPorSeccion = useMemo<Record<string, number>>(() => {
    const acc: Record<string, number> = { capacitacion: 0, seleccion: 0, fortalecimiento: 0, alto_gobierno: 0 };
    const acts = Array.isArray(activePta?.extension_actividades) ? activePta.extension_actividades : [];
    for (const a of acts) {
      const sec = normalizarSeccionExtension(a?.seccion);
      if (sec && acc[sec] !== undefined) acc[sec] += Number(a?.horas ?? a?.horas_ejecutadas ?? 0) || 0;
    }
    return acc;
  }, [activePta]);

  // Calcular horas por componente del PTA (extensión desglosada por sección).
  const horasPorComponente = useMemo<Record<string, number>>(() => ({
    docencia: activePta?.horas_docencia || 0,
    investigacion: activePta?.horas_investigacion || 0,
    extension: activePta?.horas_extension || 0, // total (solo para etiqueta/auto-selección)
    complementarias: activePta?.horas_complementarias || 0,
    acad_admin: activePta?.horas_acad_admin || 0,
    'extension:capacitacion': horasExtensionPorSeccion.capacitacion,
    'extension:seleccion': horasExtensionPorSeccion.seleccion,
    'extension:fortalecimiento': horasExtensionPorSeccion.fortalecimiento,
    'extension:alto_gobierno': horasExtensionPorSeccion.alto_gobierno,
  }), [activePta, horasExtensionPorSeccion]);

  // Horas aprobadas por clave efectiva (de evidencias aprobadas)
  const horasAprobadasPorComponente = useMemo(() => {
    const acc: Record<string, number> = { docencia: 0, investigacion: 0, extension: 0, complementarias: 0, acad_admin: 0, 'extension:capacitacion': 0, 'extension:seleccion': 0, 'extension:fortalecimiento': 0, 'extension:alto_gobierno': 0 };
    evidencias.forEach(e => {
      if (!isApprovedEvidence(e) || !e.componente_pta) return;
      const key = evidenciaHorasKey(e.componente_pta, e.seccion_extension ?? e.seccionExtension);
      if (acc[key] !== undefined) acc[key] += Number(e.horas_avance) || 0;
      if (e.componente_pta === 'extension' && key !== 'extension') acc.extension += Number(e.horas_avance) || 0;
    });
    return acc;
  }, [evidencias]);

  const horasReservadasPorComponente = useMemo(() => {
    const acc: Record<string, number> = { docencia: 0, investigacion: 0, extension: 0, complementarias: 0, acad_admin: 0, 'extension:capacitacion': 0, 'extension:seleccion': 0, 'extension:fortalecimiento': 0, 'extension:alto_gobierno': 0 };
    evidencias.forEach(e => {
      if (!isReservedEvidence(e) || !e.componente_pta) return;
      const key = evidenciaHorasKey(e.componente_pta, e.seccion_extension ?? e.seccionExtension);
      if (acc[key] !== undefined) acc[key] += Number(e.horas_avance) || 0;
      if (e.componente_pta === 'extension' && key !== 'extension') acc.extension += Number(e.horas_avance) || 0;
    });
    return acc;
  }, [evidencias]);

  const horasDisponiblesPorComponente = useMemo(() => {
    const acc: Record<string, number> = {};
    Object.keys(horasPorComponente).forEach(key => {
      acc[key] = Math.max((horasPorComponente[key] || 0) - (horasReservadasPorComponente[key] || 0), 0);
    });
    return acc;
  }, [horasPorComponente, horasReservadasPorComponente]);

  useEffect(() => {
    // Para extensión, el cupo real es por sección: no auto-saltamos de componente ni
    // clampeamos hasta que el docente elija la sección.
    if (formComponente === 'extension' && !formSeccionExtension) return;
    const cupoKey = evidenciaHorasKey(formComponente, formSeccionExtension);
    const disponibles = horasDisponiblesPorComponente[cupoKey] || 0;
    if (disponibles <= 0 && formComponente !== 'extension') {
      const next = COMPONENTES_PTA.find(c => (horasDisponiblesPorComponente[c.key] || 0) > 0)?.key;
      if (next && next !== formComponente) {
        setFormComponente(next);
        return;
      }
    }
    if (formHoras > disponibles) setFormHoras(disponibles);
  }, [horasDisponiblesPorComponente, formComponente, formSeccionExtension, formHoras]);

  const loadEvidencias = async () => {
    if (!activePtaId) {
      setEvidencias([]);
      return;
    }
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
    const estado = getEvidenceRevisionStatus(estado_revision);
    if (estado === 'aprobado') return { label: 'Aprobado', color: '#065F46', bg: '#D1FAE5', icon: CheckCircle2 };
    if (estado === 'rechazado') return { label: 'Rechazado', color: '#991B1B', bg: '#FEE2E2', icon: XCircle };
    return { label: 'Pendiente revisión', color: '#92400E', bg: '#FEF3C7', icon: Clock };
  };

  // Máximo de archivos por justificación (las horas y descripción aplican al grupo completo).
  const MAX_ARCHIVOS_JUSTIFICACION = 3;

  const handleFilesSelect = (files: FileList | File[]) => {
    if (seguimientoBloqueado) {
      toast.info('Podrás cargar documentos cuando todos los componentes de tu PTA estén aprobados.');
      return;
    }
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`"${f.name}" supera los 10 MB`); continue; }
      valid.push(f);
    }
    if (valid.length === 0) return;
    setFormFiles(prev => {
      const combined = [...prev, ...valid];
      if (combined.length > MAX_ARCHIVOS_JUSTIFICACION) {
        toast.info(`Puedes adjuntar máximo ${MAX_ARCHIVOS_JUSTIFICACION} archivos por justificación`);
        return combined.slice(0, MAX_ARCHIVOS_JUSTIFICACION);
      }
      return combined;
    });
    setShowForm(true);
  };

  const removeFormFile = (idx: number) => {
    setFormFiles(prev => { const next = prev.filter((_, i) => i !== idx); if (next.length === 0) { setShowForm(false); } return next; });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      setFormOrigen('general');
      setFormDescripcion('');
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    if (seguimientoBloqueado) {
      toast.info('El seguimiento estará disponible cuando tu PTA haya sido aprobado.');
      return;
    }
    if (formFiles.length === 0 || !activePtaId) return;
    if (formFiles.length > MAX_ARCHIVOS_JUSTIFICACION) {
      toast.error(`Máximo ${MAX_ARCHIVOS_JUSTIFICACION} archivos por justificación`);
      return;
    }
    if (formComponente === 'extension' && !formSeccionExtension) {
      toast.error('Selecciona la sección de extensión de esta evidencia');
      return;
    }
    // Cupo POR SECCIÓN cuando es extensión; por componente en el resto.
    const cupoKey = evidenciaHorasKey(formComponente, formSeccionExtension);
    const maxHoras = horasPorComponente[cupoKey] || 0;
    if (maxHoras <= 0) {
      toast.error('Este componente o sección no aplica: no tiene horas asignadas para justificar.');
      return;
    }
    const yaRegistradas = (evidencias
      .filter(e => evidenciaHorasKey(e.componente_pta, e.seccion_extension ?? e.seccionExtension) === cupoKey && isReservedEvidence(e))
      .reduce((s: number, e: any) => s + (Number(e.horas_avance) || 0), 0));
    const disponibles = Math.max(maxHoras - yaRegistradas, 0);
    if (disponibles <= 0) {
      toast.error('Esta sección/componente ya no tiene horas disponibles para nuevos soportes.');
      return;
    }
    if (formHoras <= 0) { toast.error('Indica cuántas horas avanza esta carga'); return; }
    if (!Number.isFinite(formHoras) || formHoras > disponibles) {
      toast.error(`Superas las horas disponibles (${maxHoras}h). Tienes ${yaRegistradas}h aprobadas o pendientes; disponibles: ${disponibles}h.`);
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
        categoria: formOrigen === 'resolucion_proyecto'
          ? CATEGORIA_RESOLUCION_PROYECTO_INVESTIGACION
          : COMPONENTES_PTA.find(c => c.key === formComponente)?.label || formComponente,
        componente_pta: formComponente,
        seccion_extension: formComponente === 'extension' ? formSeccionExtension : null,
        horas_avance: i === 0 ? formHoras : 0,
        storage_path: storagePath,
        storage_url: fileUrl,
        subido_por: userName,
        descripcion: i === 0
          ? formDescripcion
          : `Adjunto ${i + 1} de ${formFiles.length}`,
      } as any);
      if (res.success) ok++;
    }
    if (ok > 0) {
      toast.success(`${ok} documento${ok > 1 ? 's' : ''} registrado${ok > 1 ? 's' : ''}`);
      setShowForm(false); setFormFiles([]); setFormHoras(0); setFormDescripcion('');
      setFormSeccionExtension(''); setFormOrigen('general');
      loadEvidencias();
    } else {
      toast.error('Error al registrar los documentos');
    }
    setSubmitting(false);
  };

  // Elimina un documento; si es el principal de una justificación, elimina también sus soportes.
  const handleDelete = async (evidenciaId: string, adjuntosIds: string[] = []) => {
    const msg = adjuntosIds.length > 0
      ? `¿Eliminar esta justificación y sus ${adjuntosIds.length} soporte${adjuntosIds.length > 1 ? 's' : ''} adicional${adjuntosIds.length > 1 ? 'es' : ''}?`
      : '¿Eliminar este documento?';
    if (!window.confirm(msg)) return;
    const ids = [evidenciaId, ...adjuntosIds];
    let ok = 0;
    for (const id of ids) {
      const res = await eliminarEvidenciaPTA(activePtaId, id);
      if (res.success) ok++;
    }
    if (ok > 0) {
      toast.success(ids.length > 1 ? 'Justificación eliminada' : 'Documento eliminado');
      loadEvidencias();
    } else toast.error('Error al eliminar');
  };

  const filteredEvidencias = filtroComponente
    ? evidencias.filter(e => e.componente_pta === filtroComponente)
    : evidencias;
  // Clave de cupo activa del formulario (extensión → por sección).
  const formCupoKey = evidenciaHorasKey(formComponente, formSeccionExtension);
  // No ofrecer secciones vacías ni inferir cupos desde el total de Extensión.
  const seccionesExtensionDisponibles = SECCIONES_EXTENSION.filter(s => (horasExtensionPorSeccion[s.key] || 0) > 0);
  // Horas disponibles para la carga actual: si es extensión sin sección elegida aún, 0
  // (el docente debe elegir sección primero, pues cada una tiene su propio cupo).
  const horasDisponiblesForm = (formComponente === 'extension' && !formSeccionExtension)
    ? 0
    : (horasDisponiblesPorComponente[formCupoKey] || 0);
  const sinHorasDisponibles = horasDisponiblesForm <= 0;
  const horasDisponiblesResolucion = Math.min(
    horasResolucionPendientes,
    horasDisponiblesPorComponente.investigacion || 0,
  );

  const iniciarCargaResolucionProyecto = () => {
    if (seguimientoBloqueado) return;
    if (horasDisponiblesResolucion <= 0) {
      toast.info('La resolución no tiene horas pendientes disponibles.');
      return;
    }
    setFormOrigen('resolucion_proyecto');
    setFormComponente('investigacion');
    setFormSeccionExtension('');
    setFormHoras(horasDisponiblesResolucion);
    setFormDescripcion([
      'Resolución del proyecto',
      proyectoInvestigacion?.nombre,
      proyectoInvestigacion?.resolucion_nombre,
    ].filter(Boolean).join(' · '));
    fileInputRef.current?.click();
  };

  const componentesEstadoBloqueo = !tienePtaActivo
    ? []
    : esPtaBorrador
      ? COMPONENTES_PTA.map(componente => ({
          key: componente.key,
          label: componente.label,
          estado: getPtaComponentDisplayStatus(activePta, componente.key === 'docencia' ? 'academica' : componente.key),
        }))
      : (Array.isArray(activePta?.componentes_estado)
          ? [...activePta.componentes_estado]
          : []);
  const componentesAprobadosBloqueo = esPtaBorrador
    ? 0
    : componentesEstadoBloqueo.filter((componente: any) => componente?.estado === 'aprobado').length;
  const bloqueoSinProceso = !tienePtaActivo || esPtaBorrador;
  const bloqueoTitulo = !tienePtaActivo
    ? 'Aún no tienes un PTA para este período'
    : esPtaBorrador
      ? 'El seguimiento comenzará cuando envíes tu PTA'
      : 'Seguimiento disponible tras la aprobación de tu PTA';
  const bloqueoDescripcion = !tienePtaActivo
    ? 'Primero crea tu Plan de Trabajo Académico. Los documentos de soporte se habilitarán cuando el PTA complete su aprobación.'
    : esPtaBorrador
      ? 'Tu PTA todavía está en borrador. Ningún componente está en revisión ni aprobado hasta que lo envíes formalmente.'
      : 'Podrás registrar los documentos que justifican tus horas cuando la totalidad de los componentes de tu Plan de Trabajo Académico hayan sido aprobados.';

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
          disabled={seguimientoBloqueado}
          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: seguimientoBloqueado ? '#F8FAFC' : 'white', cursor: seguimientoBloqueado ? 'not-allowed' : 'pointer', opacity: seguimientoBloqueado ? 0.55 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title={seguimientoBloqueado ? 'Disponible cuando el PTA esté aprobado' : 'Recargar'}
        >
          <RefreshCw style={{ width: 13, height: 13, color: '#6B7280' }} />
        </button>
      </div>

      {/* Aviso de seguimiento bloqueado: el PTA aún no tiene todos sus componentes aprobados */}
      {seguimientoBloqueado && (
        <div style={{ background: bloqueoSinProceso ? '#F8FAFC' : '#FFFBEB', border: `1px solid ${bloqueoSinProceso ? '#CBD5E1' : '#FDE68A'}`, borderRadius: 12, padding: '24px 20px', marginBottom: 16, textAlign: 'center' }}>
          <div style={{ width: 42, height: 42, borderRadius: 999, background: bloqueoSinProceso ? '#E2E8F0' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <Lock style={{ width: 18, height: 18, color: bloqueoSinProceso ? '#64748B' : '#B45309' }} />
          </div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: bloqueoSinProceso ? '#334155' : '#92400E' }}>
            {bloqueoTitulo}
          </div>
          <div style={{ fontSize: '0.74rem', color: bloqueoSinProceso ? '#64748B' : '#A16207', marginTop: 6, maxWidth: 560, margin: '6px auto 0', lineHeight: 1.6 }}>
            {bloqueoDescripcion}
          </div>
          {componentesEstadoBloqueo.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
              {[...componentesEstadoBloqueo].sort((a: any, b: any) => {
                const ORDEN = ['academica', 'investigacion', 'extension', 'complementarias'];
                const normalizeKey = (key: string) => key === 'docencia' ? 'academica' : key;
                const ia = ORDEN.indexOf(normalizeKey(a?.key)); const ib = ORDEN.indexOf(normalizeKey(b?.key));
                return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
              }).map((c: any) => {
                const aprobado = c.estado === 'aprobado';
                const devuelto = c.estado === 'devuelto';
                const noIniciado = c.estado === 'no_iniciado' || c.estado === 'no_aplica';
                const label = c.label === 'Investigacion' ? 'Investigación' : c.label === 'Extension' ? 'Extensión' : c.label;
                const background = aprobado ? '#D1FAE5' : devuelto ? '#FEE2E2' : noIniciado ? '#F1F5F9' : '#FEF3C7';
                const color = aprobado ? '#047857' : devuelto ? '#B91C1C' : noIniciado ? '#475569' : '#92400E';
                const border = aprobado ? '#6EE7B7' : devuelto ? '#FCA5A5' : noIniciado ? '#CBD5E1' : '#FDE68A';
                return (
                  <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 999, background, color, fontSize: '0.64rem', fontWeight: 700, border: `1px solid ${border}` }}>
                    {aprobado ? <CheckCircle2 style={{ width: 10, height: 10 }} /> : devuelto ? <XCircle style={{ width: 10, height: 10 }} /> : <Clock style={{ width: 10, height: 10 }} />}
                    {label}{c.estado === 'no_aplica' ? ' · No aplica' : noIniciado ? ' · No iniciado' : c.estado === 'en_revision' ? ' · En revisión' : ''}
                  </span>
                );
              })}
            </div>
          )}
          {tienePtaActivo && (esPtaBorrador || Number(activePta?.componentes_total) > 0 || componentesEstadoBloqueo.length > 0) && (
            <div style={{ fontSize: '0.68rem', color: bloqueoSinProceso ? '#475569' : '#92400E', fontWeight: 700, marginTop: 10 }}>
              {esPtaBorrador
                ? 'Aprobación de componentes no iniciada'
                : `${componentesAprobadosBloqueo} de ${activePta?.componentes_total ?? componentesEstadoBloqueo.filter((c: any) => c.estado !== 'no_aplica').length} componentes aprobados`}
            </div>
          )}
        </div>
      )}

      {/* Progress por componente */}
      {!seguimientoBloqueado && (
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
                {total > 0 ? `${aprobadas}h / ${total}h` : 'No aplica'}
              </span>
            </div>
          );
        })}
      </div>
      )}

      {/* Upload form (modal inline) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0369A1' }}>
                {formOrigen === 'resolucion_proyecto'
                  ? 'Adjuntar resolución del proyecto'
                  : 'Registrar justificación'} — {formFiles.length} archivo{formFiles.length > 1 ? 's' : ''}
              </div>
              <span style={{ fontSize: '0.64rem', fontWeight: 700, color: formFiles.length >= MAX_ARCHIVOS_JUSTIFICACION ? '#B45309' : '#64748B', background: formFiles.length >= MAX_ARCHIVOS_JUSTIFICACION ? '#FEF3C7' : '#F1F5F9', padding: '2px 8px', borderRadius: 999 }}>
                {formFiles.length}/{MAX_ARCHIVOS_JUSTIFICACION} archivos
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {formFiles.map((f, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.68rem', color: '#1E40AF', fontWeight: 600 }}>
                  {f.name.length > 25 ? f.name.substring(0, 22) + '...' : f.name}
                  <button onClick={() => removeFormFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#DC2626', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {formFiles.length < MAX_ARCHIVOS_JUSTIFICACION ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ padding: '2px 8px', borderRadius: 6, border: '1px dashed #9CA3AF', background: 'white', fontSize: '0.68rem', color: '#6B7280', cursor: 'pointer' }}
                >+ Agregar más ({formFiles.length}/{MAX_ARCHIVOS_JUSTIFICACION})</button>
              ) : (
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.66rem', color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', fontWeight: 600 }}>
                  Alcanzaste el máximo de {MAX_ARCHIVOS_JUSTIFICACION} archivos
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.64rem', color: '#64748B', marginBottom: 10 }}>
              Las horas y la descripción aplican a la justificación completa; los archivos adicionales quedan como soportes de la misma.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Componente del PTA *</label>
                <select
                  value={formComponente}
                  onChange={e => { setFormComponente(e.target.value); if (e.target.value !== 'extension') setFormSeccionExtension(''); }}
                  disabled={formOrigen === 'resolucion_proyecto'}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', background: 'white' }}
                >
                  {COMPONENTES_PTA.map(c => (
                    <option key={c.key} value={c.key} disabled={(horasDisponiblesPorComponente[c.key] || 0) <= 0}>
                      {c.label} — {(horasPorComponente[c.key] || 0) <= 0 ? 'No aplica' : (horasDisponiblesPorComponente[c.key] || 0) <= 0 ? 'Sin horas disponibles' : `${horasDisponiblesPorComponente[c.key]}h disponibles`}
                    </option>
                  ))}
                </select>
              </div>
              {formComponente === 'extension' ? (
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Sección de extensión *</label>
                  <select
                    value={formSeccionExtension}
                    onChange={e => setFormSeccionExtension(e.target.value)}
                    disabled={seccionesExtensionDisponibles.length === 0}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', background: 'white' }}
                  >
                    <option value="">{seccionesExtensionDisponibles.length === 0 ? 'Sin secciones con horas' : 'Selecciona la sección…'}</option>
                    {seccionesExtensionDisponibles.map(s => (
                      <option key={s.key} value={s.key} disabled={(horasDisponiblesPorComponente[`extension:${s.key}`] || 0) <= 0}>{s.label} ({horasDisponiblesPorComponente[`extension:${s.key}`] || 0}h disponibles)</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Horas que avanza *</label>
                  <input
                    type="number" min={1} max={horasDisponiblesForm || 0}
                    value={formHoras || ''}
                    onChange={e => setFormHoras(Number(e.target.value))}
                    placeholder={horasDisponiblesForm > 0 ? `Máx. ${horasDisponiblesForm}` : 'Sin horas disponibles'}
                    disabled={sinHorasDisponibles || formOrigen === 'resolucion_proyecto'}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}
            </div>
            {formComponente === 'extension' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Horas que avanza *</label>
                <input
                  type="number" min={1} max={horasDisponiblesForm || 0}
                  value={formHoras || ''}
                  onChange={e => setFormHoras(Number(e.target.value))}
                  placeholder={!formSeccionExtension ? 'Elige la sección primero' : (horasDisponiblesForm > 0 ? `Máx. ${horasDisponiblesForm}` : 'Sin horas disponibles')}
                  disabled={sinHorasDisponibles}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: '0.68rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Descripción (opcional)</label>
              <input
                value={formDescripcion}
                onChange={e => setFormDescripcion(e.target.value)}
                placeholder="Breve descripción del documento..."
                readOnly={formOrigen === 'resolucion_proyecto'}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid #D1D5DB', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleSubmit} disabled={submitting || sinHorasDisponibles}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 8, border: 'none', background: sinHorasDisponibles ? '#9CA3AF' : '#003DA5', color: 'white', fontSize: '0.82rem', fontWeight: 700, cursor: submitting || sinHorasDisponibles ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: submitting ? 0.6 : 1 }}
              >
                <Send style={{ width: 14, height: 14 }} />
                {submitting ? 'Enviando...' : sinHorasDisponibles ? 'Sin horas disponibles' : 'Registrar documento'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false); setFormFiles([]); setFormHoras(0);
                  setFormDescripcion(''); setFormOrigen('general');
                }}
                style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', fontSize: '0.82rem', color: '#6B7280', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input de archivos SIEMPRE montado: lo usan tanto la drop zone como el
          botón "+ Agregar más" del formulario (antes vivía dentro de la drop
          zone condicional y el botón quedaba sin input al abrir el form). */}
      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { if (e.target.files && e.target.files.length > 0) handleFilesSelect(e.target.files); e.target.value = ''; }} />

      {/* Drop zone */}
      {!seguimientoBloqueado && !showForm && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            setFormOrigen('general');
            setFormDescripcion('');
            setFormHoras(0);
            fileInputRef.current?.click();
          }}
          style={{
            padding: '22px 20px', borderRadius: 12, textAlign: 'center',
            border: `2px dashed ${dragOver ? '#003DA5' : '#D1D5DB'}`,
            background: dragOver ? '#EFF6FF' : '#FAFAFA',
            marginBottom: 14, transition: 'all 0.2s', cursor: 'pointer',
          }}
        >
          <Upload style={{ width: 26, height: 26, color: dragOver ? '#003DA5' : '#9CA3AF', margin: '0 auto 6px' }} />
          <p style={{ fontSize: '0.85rem', color: dragOver ? '#003DA5' : '#6B7280', fontWeight: 600, margin: 0 }}>
            {dragOver ? 'Suelta aquí tus archivos' : 'Arrastra archivos o haz clic para adjuntar'}
          </p>
          <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '4px 0 0' }}>
            PDF, DOCX, XLSX, imágenes — Máx. 10 MB · hasta {MAX_ARCHIVOS_JUSTIFICACION} archivos por justificación
          </p>
        </div>
      )}

      {/* Filtros por componente (ocultos si el seguimiento está bloqueado y no hay documentos) */}
      {(!seguimientoBloqueado || evidencias.length > 0) && (
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
      )}

      {/* Lista evidencias */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: '0.82rem' }}>Cargando documentos...</div>
      ) : filteredEvidencias.length === 0 ? (
        seguimientoBloqueado ? null : (
        <div style={{ textAlign: 'center', padding: '30px 20px', background: '#F9FAFB', borderRadius: 12 }}>
          <Paperclip style={{ width: 32, height: 32, color: '#D1D5DB', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0 }}>{filtroComponente && (horasPorComponente[filtroComponente] || 0) <= 0
            ? `${COMPONENTES_PTA.find(c => c.key === filtroComponente)?.label}: No aplica. No hay horas asignadas para justificar.`
            : `Sin documentos registrados${filtroComponente ? ` en ${COMPONENTES_PTA.find(c => c.key === filtroComponente)?.label}` : ''}`}</p>
        </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {agruparEvidenciasPorJustificacion(filteredEvidencias).map((grupo, i) => {
            const ev = grupo.main;
            const fi = fileIcon(ev.nombre || '');
            const FI = fi.icon;
            const estadoRevision = getEvidenceRevisionStatus(ev);
            const badge = revisionBadge(estadoRevision);
            const BadgeIcon = badge.icon;
            const comp = COMPONENTES_PTA.find(c => c.key === ev.componente_pta);
            return (
              <motion.div key={ev.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                style={{ padding: '12px 14px', borderRadius: 10, background: 'white', border: `1px solid ${estadoRevision === 'rechazado' ? '#FCA5A5' : estadoRevision === 'aprobado' ? '#6EE7B7' : '#E5E7EB'}` }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
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
                    {esResolucionProyectoInvestigacion(ev) && (
                      <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: '#F3E8FF', color: '#7E22CE' }}>
                        Resolución del proyecto
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
                    {grupo.adjuntos.length > 0 && (
                      <span style={{ padding: '1px 7px', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, background: '#F1F5F9', color: '#475569' }}>
                        +{grupo.adjuntos.length} soporte{grupo.adjuntos.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {ev.descripcion && (
                      <span style={{ fontSize: '0.62rem', color: '#64748B', fontStyle: 'italic' }} title={ev.descripcion}>📝 {ev.descripcion.substring(0, 40)}{ev.descripcion.length > 40 ? '...' : ''}</span>
                    )}
                  </div>
                  {ev.comentario_revision && (
                    <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 6, background: estadoRevision === 'rechazado' ? '#FEF2F2' : '#F0FDF4', border: `1px solid ${estadoRevision === 'rechazado' ? '#FECACA' : '#BBF7D0'}`, fontSize: '0.65rem', color: estadoRevision === 'rechazado' ? '#991B1B' : '#166534' }}>
                      <strong>Revisor:</strong> {ev.comentario_revision}
                    </div>
                  )}
                  <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>
                    {new Date(ev.fecha_subida).toLocaleDateString('es-CO')} — {(ev.tamanio_bytes / 1024).toFixed(0)} KB
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {renderBotonesArchivo(ev)}
                  </div>
                </div>
                {estadoRevision !== 'aprobado' && !esResolucionAnticipadaEnCreacion(ev) && (
                  <button
                    onClick={() => handleDelete(ev.id, grupo.adjuntos.map((a: any) => a.id))}
                    title={grupo.adjuntos.length > 0 ? 'Eliminar la justificación y sus soportes' : 'Eliminar documento'}
                    style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  >
                    <Trash2 style={{ width: 12, height: 12, color: '#DC2626' }} />
                  </button>
                )}
                </div>
                {/* Soportes adicionales de la misma justificación */}
                {grupo.adjuntos.length > 0 && (
                  <div style={{ marginTop: 8, marginLeft: 44, borderLeft: '2px solid #E2E8F0', paddingLeft: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Soportes adicionales ({grupo.adjuntos.length})
                    </div>
                    {grupo.adjuntos.map((adj: any) => {
                      const afi = fileIcon(adj.nombre || '');
                      const AFI = afi.icon;
                      return (
                        <div key={adj.id} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                          <AFI style={{ width: 12, height: 12, color: afi.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{adj.nombre}</span>
                          <span style={{ fontSize: '0.6rem', color: '#9CA3AF', flexShrink: 0 }}>{(Number(adj.tamanio_bytes || 0) / 1024).toFixed(0)} KB</span>
                          {renderBotonesArchivo(adj, true)}
                          {getEvidenceRevisionStatus(adj) !== 'aprobado' && (
                            <button
                              onClick={() => handleDelete(adj.id)}
                              title="Eliminar este soporte"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#DC2626', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                            >
                              <Trash2 style={{ width: 10, height: 10 }} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de previsualización de archivo (mismo patrón que el Seguimiento del backoffice) */}
      {previewFile && createPortal(
        <div
          onClick={() => setPreviewFile(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #E5E7EB', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FileText style={{ width: 18, height: 18, color: '#003DA5', flexShrink: 0 }} />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewFile.nombre}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <a href={previewFile.url} download={previewFile.nombre} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #D1D5DB', background: 'white', color: '#374151', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                  <Download style={{ width: 14, height: 14 }} /> Descargar
                </a>
                <button onClick={() => setPreviewFile(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X style={{ width: 16, height: 16, color: '#6B7280' }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              {['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.tipo) ? (
                <img src={previewFile.url} alt={previewFile.nombre} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, objectFit: 'contain' }} />
              ) : previewFile.tipo === 'pdf' ? (
                <iframe src={previewFile.url} title={previewFile.nombre} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} />
              ) : puedePrevisualizarOffice(previewFile.nombre) ? (
                /* Word/Excel: se convierten a HTML en el navegador (ver
                   utils/officePreview). No se usa el visor de Microsoft porque
                   descarga el archivo desde sus servidores y no puede alcanzar
                   un despliegue interno. */
                officeError ? (
                  <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                    <FileText style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#D1D5DB' }} />
                    <p style={{ fontSize: '0.85rem', color: '#B91C1C' }}>{officeError}</p>
                    <a href={previewFile.url} download={previewFile.nombre} target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', fontWeight: 600, fontSize: '0.85rem' }}>Descargar archivo</a>
                  </div>
                ) : officeHtml === null ? (
                  <div style={{ textAlign: 'center', color: '#6B7280', padding: 24 }}>
                    <p style={{ fontSize: '0.85rem' }}>Cargando documento…</p>
                  </div>
                ) : (
                  <div style={{ width: '100%', maxHeight: '70vh', overflow: 'auto', background: 'white', borderRadius: 8, padding: 20, textAlign: 'left' }}>
                    <style>{ESTILOS_PREVIEW_OFFICE}</style>
                    <div className="pta-office-preview" dangerouslySetInnerHTML={{ __html: officeHtml }} />
                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
                  <FileText style={{ width: 48, height: 48, margin: '0 auto 12px', color: '#D1D5DB' }} />
                  <p style={{ fontSize: '0.85rem' }}>Este tipo de archivo no se puede previsualizar</p>
                  <a href={previewFile.url} download={previewFile.nombre} target="_blank" rel="noopener noreferrer" style={{ color: '#003DA5', fontWeight: 600, fontSize: '0.85rem' }}>Descargar archivo</a>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
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
    const horasDisp = ptas.reduce((s, p) => s + (p.horas_asignables ?? p.horas_a_programar ?? 0), 0);
    const asigTotal = ptas.reduce((s, p) => s + (p.asignaturas?.length || p.num_asignaturas || 0), 0);
    const pctCarga = getPtaCompletionPercentage(horasTotal, horasDisp);
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
      label: 'Carga Horaria', value: `${formatPtaPercentage(indicadores.pctCarga)}%`,
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
                        {pta.total_horas_programadas || 0}/{pta.horas_asignables ?? pta.horas_a_programar ?? 0}h
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


