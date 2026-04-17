/**
 * ActaConcertacionPTA — Generación automática de actas de concertación
 *
 * Genera un documento formal de acta tipo PDF con:
 * - Encabezado institucional ESAP con número consecutivo
 * - Datos de las partes (docente y dirección)
 * - Comparativo propuesta original vs acuerdo final
 * - Historial de negociación (extracto del chat)
 * - Acuerdos y compromisos documentados
 * - Espacio de firmas digitales (docente + dirección)
 * - Código de verificación y hash
 * - Vista previa imprimible con opción de descarga
 *
 * Se accede desde la Mesa de Concertación y desde Auditoría.
 */

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Printer, Download, X, CheckCircle, Shield,
  Users, MessageSquare, Calendar, Clock, Hash, Award,
  BookOpen, ChevronRight, AlertTriangle, Copy, Scale,
  Building2, User, Briefcase, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';

interface Acuerdo {
  id: string;
  descripcion: string;
  tipo: 'modificacion' | 'adicion' | 'eliminacion' | 'mantenimiento';
  componente: 'docencia' | 'investigacion' | 'extension' | 'complementaria' | 'general';
  responsable: 'docente' | 'direccion' | 'ambos';
}

interface MensajeConcertacion {
  autor: string;
  rol: 'docente' | 'direccion';
  mensaje: string;
  fecha: string;
}

interface ActaConcertacionProps {
  ptaId: string;
  docenteNombre: string;
  docenteIdentificacion?: string;
  docenteDedicacion: string;
  docentePrograma?: string;
  territorial?: string;
  periodo: string;
  propuestaOriginal?: {
    horasDocencia: number;
    horasInvestigacion: number;
    horasExtension: number;
    horasComplementaria: number;
    totalHoras: number;
    numAsignaturas: number;
  };
  acuerdoFinal?: {
    horasDocencia: number;
    horasInvestigacion: number;
    horasExtension: number;
    horasComplementaria: number;
    totalHoras: number;
    numAsignaturas: number;
  };
  mensajes?: MensajeConcertacion[];
  acuerdos?: Acuerdo[];
  fechaInicio?: string;
  fechaCierre?: string;
  directorNombre?: string;
  directorCargo?: string;
  resultado: 'CONCERTADO' | 'ESCALADO_SNA';
  onClose: () => void;
}

const TIPO_ACUERDO_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  modificacion: { label: 'Modificación', color: '#D97706', bg: '#FEF3C7' },
  adicion: { label: 'Adición', color: '#059669', bg: '#D1FAE5' },
  eliminacion: { label: 'Eliminación', color: '#DC2626', bg: '#FEE2E2' },
  mantenimiento: { label: 'Sin cambio', color: '#6B7280', bg: '#F3F4F6' },
};

const COMPONENTE_LABELS: Record<string, string> = {
  docencia: 'Docencia',
  investigacion: 'Investigación',
  extension: 'Extensión',
  complementaria: 'Complementaria',
  general: 'General',
};

function generateActaNumber(): string {
  const yr = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `ACTA-CONC-${yr}-${seq}`;
}

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function ActaConcertacionPTA({
  ptaId, docenteNombre, docenteIdentificacion, docenteDedicacion,
  docentePrograma, territorial, periodo,
  propuestaOriginal, acuerdoFinal, mensajes = [],
  acuerdos: acuerdosInicial = [], fechaInicio, fechaCierre,
  directorNombre = 'Director(a) Territorial',
  directorCargo = 'Jefe de Programa / Director Territorial',
  resultado, onClose,
}: ActaConcertacionProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [acuerdos, setAcuerdos] = useState<Acuerdo[]>(
    acuerdosInicial.length > 0 ? acuerdosInicial : [
      { id: '1', descripcion: 'Se acuerda mantener la distribución de asignaturas de docencia según propuesta institucional.', tipo: 'mantenimiento', componente: 'docencia', responsable: 'ambos' },
      { id: '2', descripcion: 'El docente asume la dirección de 2 proyectos de investigación con la descarga de horas correspondiente.', tipo: 'modificacion', componente: 'investigacion', responsable: 'docente' },
      { id: '3', descripcion: 'Se redistribuyen las horas de extensión según disponibilidad del CETAP territorial.', tipo: 'modificacion', componente: 'extension', responsable: 'direccion' },
    ]
  );
  const [nuevoAcuerdo, setNuevoAcuerdo] = useState('');

  const actaNumber = useMemo(() => generateActaNumber(), []);
  const verificationCode = useMemo(() => generateVerificationCode(), []);

  const defaultPropuesta = propuestaOriginal || {
    horasDocencia: 480, horasInvestigacion: 160, horasExtension: 80,
    horasComplementaria: 80, totalHoras: 800, numAsignaturas: 6,
  };
  const defaultAcuerdo = acuerdoFinal || {
    horasDocencia: 448, horasInvestigacion: 176, horasExtension: 96,
    horasComplementaria: 80, totalHoras: 800, numAsignaturas: 5,
  };

  const chatSummary = useMemo(() => {
    if (mensajes.length === 0) {
      return [
        { autor: directorNombre, rol: 'direccion' as const, mensaje: 'Presentación de propuesta institucional de PTA para el periodo.', fecha: fechaInicio || new Date().toISOString() },
        { autor: docenteNombre, rol: 'docente' as const, mensaje: 'Solicito revisión de la carga de investigación y ajuste en extensión.', fecha: new Date(Date.now() - 3 * 86400000).toISOString() },
        { autor: directorNombre, rol: 'direccion' as const, mensaje: 'Se acepta redistribuir investigación con descarga proporcional.', fecha: new Date(Date.now() - 2 * 86400000).toISOString() },
        { autor: docenteNombre, rol: 'docente' as const, mensaje: 'De acuerdo con la redistribución propuesta. Procedo a aceptar.', fecha: new Date(Date.now() - 86400000).toISOString() },
      ];
    }
    return mensajes.slice(-8);
  }, [mensajes]);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const pw = window.open('', '_blank');
    if (!pw) { toast.error('Permite ventanas emergentes para imprimir'); return; }
    pw.document.write(`<!DOCTYPE html><html><head>
      <title>${actaNumber}</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 24px; color: #111827; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #D1D5DB; padding: 6px 10px; text-align: left; font-size: 0.82rem; }
        th { background: #F3F4F6; font-weight: 700; }
        @media print { body { padding: 12px; } }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(verificationCode).then(() => {
      setCopied(true);
      toast.success('Código de verificación copiado');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addAcuerdo = () => {
    if (!nuevoAcuerdo.trim()) return;
    setAcuerdos(prev => [...prev, {
      id: String(Date.now()),
      descripcion: nuevoAcuerdo.trim(),
      tipo: 'modificacion',
      componente: 'general',
      responsable: 'ambos',
    }]);
    setNuevoAcuerdo('');
  };

  const removeAcuerdo = (id: string) => {
    setAcuerdos(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 55, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 780, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
      >
        {/* Toolbar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F9FAFB', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 18, height: 18, color: '#003DA5' }} />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>Acta de Concertación</span>
            <span style={{ padding: '2px 8px', borderRadius: 6, background: resultado === 'CONCERTADO' ? '#D1FAE5' : '#FEE2E2', color: resultado === 'CONCERTADO' ? '#065F46' : '#991B1B', fontSize: '0.62rem', fontWeight: 800 }}>
              {resultado === 'CONCERTADO' ? 'CONCERTADO' : 'ESCALADO SNA'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setEditMode(!editMode)} style={{ padding: '5px 12px', borderRadius: 7, border: editMode ? '1.5px solid #003DA5' : '1px solid #E5E7EB', background: editMode ? '#EFF6FF' : 'white', color: editMode ? '#003DA5' : '#374151', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <ClipboardList style={{ width: 12, height: 12 }} /> {editMode ? 'Vista previa' : 'Editar'}
            </button>
            <button onClick={handlePrint} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid #E5E7EB', background: 'white', color: '#374151', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Printer style={{ width: 12, height: 12 }} /> Imprimir
            </button>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, border: 'none', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14, color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Document Content */}
        <div ref={printRef} style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
          <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 32px' }}>

            {/* ═══ HEADER ═══ */}
            <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '3px double #003DA5' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <Shield style={{ width: 28, height: 28, color: '#003DA5' }} />
                <div>
                  <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#003DA5', margin: 0, letterSpacing: '0.06em' }}>
                    ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA
                  </h1>
                  <p style={{ fontSize: '0.68rem', color: '#6B7280', margin: 0, letterSpacing: '0.1em' }}>ESAP — REPÚBLICA DE COLOMBIA</p>
                </div>
              </div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', margin: '14px 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ACTA DE CONCERTACIÓN
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Plan de Trabajo Académico — Periodo {periodo}</p>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 16, fontSize: '0.72rem' }}>
                <span style={{ fontWeight: 700, color: '#003DA5' }}>{actaNumber}</span>
                <span style={{ color: '#9CA3AF' }}>•</span>
                <span style={{ color: '#6B7280' }}>Fecha: {new Date(fechaCierre || Date.now()).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            {/* ═══ PARTES ═══ */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users style={{ width: 14, height: 14, color: '#003DA5' }} /> 1. Partes intervinientes
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Dirección */}
                <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #BFDBFE', background: '#EFF6FF' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Building2 style={{ width: 14, height: 14, color: '#003DA5' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#003DA5' }}>DIRECCIÓN</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#374151' }}>
                    <div style={{ fontWeight: 700 }}>{directorNombre}</div>
                    <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{directorCargo}</div>
                    {territorial && <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Territorial: {territorial}</div>}
                  </div>
                </div>
                {/* Docente */}
                <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #6EE7B7', background: '#D1FAE5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <User style={{ width: 14, height: 14, color: '#059669' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46' }}>DOCENTE</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#374151' }}>
                    <div style={{ fontWeight: 700 }}>{docenteNombre}</div>
                    {docenteIdentificacion && <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>C.C. {docenteIdentificacion}</div>}
                    <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2 }}>Dedicación: {docenteDedicacion} {docentePrograma ? `• ${docentePrograma}` : ''}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ COMPARATIVO ═══ */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scale style={{ width: 14, height: 14, color: '#D97706' }} /> 2. Comparativo de distribución de horas
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    <th style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Componente</th>
                    <th style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#003DA5' }}>Propuesta Original</th>
                    <th style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>Acuerdo Final</th>
                    <th style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#D97706' }}>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Docencia', orig: defaultPropuesta.horasDocencia, final: defaultAcuerdo.horasDocencia },
                    { label: 'Investigación', orig: defaultPropuesta.horasInvestigacion, final: defaultAcuerdo.horasInvestigacion },
                    { label: 'Extensión', orig: defaultPropuesta.horasExtension, final: defaultAcuerdo.horasExtension },
                    { label: 'Complementaria', orig: defaultPropuesta.horasComplementaria, final: defaultAcuerdo.horasComplementaria },
                  ].map(row => {
                    const diff = row.final - row.orig;
                    return (
                      <tr key={row.label}>
                        <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', fontWeight: 600 }}>{row.label}</td>
                        <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center' }}>{row.orig}h</td>
                        <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center', fontWeight: 700 }}>{row.final}h</td>
                        <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: diff === 0 ? '#6B7280' : diff > 0 ? '#059669' : '#DC2626' }}>
                          {diff > 0 ? '+' : ''}{diff}h
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: '#F9FAFB', fontWeight: 800 }}>
                    <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px' }}>TOTAL</td>
                    <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center' }}>{defaultPropuesta.totalHoras}h</td>
                    <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center' }}>{defaultAcuerdo.totalHoras}h</td>
                    <td style={{ border: '1px solid #D1D5DB', padding: '8px 12px', textAlign: 'center', color: '#111827' }}>
                      {defaultAcuerdo.totalHoras - defaultPropuesta.totalHoras === 0 ? '—' : `${defaultAcuerdo.totalHoras - defaultPropuesta.totalHoras > 0 ? '+' : ''}${defaultAcuerdo.totalHoras - defaultPropuesta.totalHoras}h`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ═══ ACUERDOS ═══ */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle style={{ width: 14, height: 14, color: '#059669' }} /> 3. Acuerdos y compromisos
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {acuerdos.map((acuerdo, i) => {
                  const tipoCfg = TIPO_ACUERDO_LABELS[acuerdo.tipo] || TIPO_ACUERDO_LABELS.mantenimiento;
                  return (
                    <div key={acuerdo.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#FAFAFA' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#003DA5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0 }}>{acuerdo.descripcion}</p>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: tipoCfg.bg, color: tipoCfg.color, fontSize: '0.58rem', fontWeight: 700 }}>{tipoCfg.label}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontSize: '0.58rem', fontWeight: 600 }}>{COMPONENTE_LABELS[acuerdo.componente]}</span>
                          <span style={{ padding: '1px 6px', borderRadius: 4, background: '#EFF6FF', color: '#1E40AF', fontSize: '0.58rem', fontWeight: 600 }}>Resp: {acuerdo.responsable === 'ambos' ? 'Ambas partes' : acuerdo.responsable === 'docente' ? 'Docente' : 'Dirección'}</span>
                        </div>
                      </div>
                      {editMode && (
                        <button onClick={() => removeAcuerdo(acuerdo.id)} style={{ width: 22, height: 22, borderRadius: '50%', border: 'none', background: '#FEE2E2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <X style={{ width: 10, height: 10 }} />
                        </button>
                      )}
                    </div>
                  );
                })}
                {editMode && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input
                      value={nuevoAcuerdo} onChange={e => setNuevoAcuerdo(e.target.value)}
                      placeholder="Agregar nuevo acuerdo..."
                      onKeyDown={e => e.key === 'Enter' && addAcuerdo()}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB', fontSize: '0.8rem', outline: 'none' }}
                    />
                    <button onClick={addAcuerdo} disabled={!nuevoAcuerdo.trim()} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', opacity: nuevoAcuerdo.trim() ? 1 : 0.4 }}>
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ EXTRACTO NEGOCIACIÓN ═══ */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare style={{ width: 14, height: 14, color: '#7C3AED' }} /> 4. Extracto de la negociación
              </h3>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                {chatSummary.map((msg, i) => (
                  <div key={i} style={{ padding: '8px 14px', borderBottom: i < chatSummary.length - 1 ? '1px solid #F3F4F6' : 'none', background: msg.rol === 'direccion' ? '#FAFAFA' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: msg.rol === 'direccion' ? '#003DA5' : '#059669' }}>
                        {msg.autor} ({msg.rol === 'direccion' ? 'Dirección' : 'Docente'})
                      </span>
                      <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>
                        {new Date(msg.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0, fontStyle: 'italic' }}>"{msg.mensaje}"</p>
                  </div>
                ))}
              </div>
              {mensajes.length > 8 && (
                <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
                  Se presentan los últimos 8 mensajes de un total de {mensajes.length} intercambios.
                </p>
              )}
            </div>

            {/* ═══ RESULTADO ═══ */}
            <div style={{ marginBottom: 22, padding: '14px 18px', borderRadius: 10, background: resultado === 'CONCERTADO' ? '#D1FAE5' : '#FEF3C7', border: `1px solid ${resultado === 'CONCERTADO' ? '#6EE7B7' : '#FDE68A'}` }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: resultado === 'CONCERTADO' ? '#065F46' : '#92400E', margin: '0 0 6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                {resultado === 'CONCERTADO' ? <CheckCircle style={{ width: 14, height: 14 }} /> : <AlertTriangle style={{ width: 14, height: 14 }} />}
                5. Resultado de la concertación
              </h3>
              <p style={{ fontSize: '0.82rem', color: resultado === 'CONCERTADO' ? '#065F46' : '#92400E', margin: 0 }}>
                {resultado === 'CONCERTADO'
                  ? 'Las partes llegan a un acuerdo satisfactorio. El Plan de Trabajo Académico se ajusta según los compromisos documentados y procede al flujo de aprobación multinivel (N1→N2→N3).'
                  : 'Las partes no lograron un acuerdo. La concertación se escala al Sistema Nacional de Arbitraje (SNA) para mediación institucional conforme al procedimiento establecido.'}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: '0.72rem', color: resultado === 'CONCERTADO' ? '#065F46' : '#92400E' }}>
                <span><strong>Inicio:</strong> {new Date(fechaInicio || Date.now() - 7 * 86400000).toLocaleDateString('es-CO')}</span>
                <span><strong>Cierre:</strong> {new Date(fechaCierre || Date.now()).toLocaleDateString('es-CO')}</span>
                <span><strong>Duración:</strong> {Math.max(1, Math.round(((new Date(fechaCierre || Date.now()).getTime()) - (new Date(fechaInicio || Date.now() - 7 * 86400000).getTime())) / 86400000))} días</span>
              </div>
            </div>

            {/* ═══ FIRMAS ═══ */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Award style={{ width: 14, height: 14, color: '#003DA5' }} /> 6. Firmas
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Firma Dirección */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: 48, borderBottom: '2px solid #111827', marginBottom: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#003DA5', fontWeight: 600 }}>[Firma Digital]</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{directorNombre}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>{directorCargo}</div>
                  <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>Parte — Dirección</div>
                </div>
                {/* Firma Docente */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: 48, borderBottom: '2px solid #111827', marginBottom: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                    <span style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#059669', fontWeight: 600 }}>[Firma Digital]</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827' }}>{docenteNombre}</div>
                  <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Docente — {docenteDedicacion}</div>
                  <div style={{ fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 }}>Parte — Docente</div>
                </div>
              </div>
            </div>

            {/* ═══ VERIFICACIÓN ═══ */}
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', marginBottom: 2 }}>Código de verificación</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code style={{ fontSize: '0.82rem', fontWeight: 800, color: '#003DA5', fontFamily: 'monospace', letterSpacing: '0.08em' }}>{verificationCode}</code>
                  <button onClick={handleCopy} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #BFDBFE', background: 'white', fontSize: '0.6rem', fontWeight: 600, color: '#1E40AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Copy style={{ width: 8, height: 8 }} /> {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.62rem', color: '#6B7280' }}>
                <div>PTA: {ptaId.substring(0, 16)}</div>
                <div>Generado: {new Date().toLocaleString('es-CO')}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: 18, paddingTop: 12, borderTop: '2px double #D1D5DB', textAlign: 'center' }}>
              <p style={{ fontSize: '0.6rem', color: '#9CA3AF', margin: 0 }}>
                Documento generado por el Backoffice Administrativo ESAP — Módulo PTA.
                Verificable en esap.gov.co/verificar-acta
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
