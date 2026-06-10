import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, ShieldX, FileCheck, FilePlus, Clock, Eye,
  CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight,
  Send, MessageSquare, Loader2, RefreshCw, Sparkles, FileText, Lock,
  Upload, User, GraduationCap, Briefcase, Phone, File, ExternalLink,
  BookOpen, Shield
} from 'lucide-react';
import {
  getRundBloques, aprobarRundBloque, devolverRundBloque,
  vincularRundSoporte
} from '../../../services/api/ptaApi';

// ─── Types ──────────────────────────────────────────────────────────
interface BloqueData {
  id: string;
  bloque: string;
  estado: string;
  cargadoPor: string | null;
  revisadoPor: string | null;
  observacion: string | null;
  version: number;
  canalOrigen: string | null;
  soporteIds: string[];
  fechaRevision: string | null;
  soportes: any[];
  tiposSoporteRequeridos: string[];
}

interface Props {
  docenteId: string;
  docenteNombre: string;
  currentUserId?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CATÁLOGO BR-039: Dato RUND ↔ Documento Soporte (completo)
// ═══════════════════════════════════════════════════════════════════════
interface CampoDoc {
  campo: string;
  documento: string;
  tipoSoporte: string;
  obligatorio: 'Sí' | 'Si aplica' | 'Derivado' | 'No';
  validacion?: string;
}

const CATALOGO_BR039: Record<string, {
  label: string;
  letra: string;
  subtitle: string;
  icon: any;
  color: string;
  bg: string;
  campos: CampoDoc[];
}> = {
  IDENTIDAD: {
    label: 'Identidad',
    letra: 'A',
    subtitle: 'Documentos que acreditan la identidad del docente',
    icon: User,
    color: '#3b82f6',
    bg: '#EFF6FF',
    campos: [
      { campo: 'Tipo y número de documento', documento: 'Documento de identidad (CC/CE/PA/PEP)', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'BR-054: Coherencia tipo↔formato' },
      { campo: 'Nombre completo', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'BR-040: Debe coincidir con el soporte' },
      { campo: 'Género', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí' },
      { campo: 'Fecha de nacimiento', documento: 'Documento de identidad', tipoSoporte: 'documento_identidad', obligatorio: 'Sí', validacion: 'Debe ser < hoy' },
      { campo: 'Edad / Rango de edad', documento: '— (Calculado)', tipoSoporte: '', obligatorio: 'Derivado', validacion: 'Calculado desde fecha de nacimiento' },
    ],
  },
  CONTACTO: {
    label: 'Contacto',
    letra: 'B',
    subtitle: 'Datos de contacto — no requiere documentos soporte',
    icon: Phone,
    color: '#10b981',
    bg: '#ECFDF5',
    campos: [
      { campo: 'Correo institucional', documento: '— (Asignación institucional)', tipoSoporte: '', obligatorio: 'No', validacion: 'Dominio @esap.edu.co' },
      { campo: 'Correo personal', documento: '— (Autodeclarado)', tipoSoporte: '', obligatorio: 'No', validacion: 'Formato email' },
      { campo: 'Teléfono', documento: '— (Autodeclarado)', tipoSoporte: '', obligatorio: 'No', validacion: 'Formato teléfono' },
    ],
  },
  FORMACION: {
    label: 'Formación Académica',
    letra: 'C',
    subtitle: 'Títulos académicos y soportes de formación',
    icon: GraduationCap,
    color: '#8b5cf6',
    bg: '#F5F3FF',
    campos: [
      { campo: 'Pregrado', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_pregrado', obligatorio: 'Sí', validacion: 'Base mínima requerida' },
      { campo: 'Especialización', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_especializacion', obligatorio: 'Si aplica' },
      { campo: 'Maestría', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_maestria', obligatorio: 'Si aplica' },
      { campo: 'Doctorado', documento: 'Diploma + Acta de grado', tipoSoporte: 'diploma_doctorado', obligatorio: 'Si aplica' },
      { campo: 'Posdoctorado', documento: 'Certificado de estancia posdoctoral', tipoSoporte: 'certificado_posdoctoral', obligatorio: 'Si aplica' },
      { campo: 'Título del exterior', documento: 'Resolución de convalidación MEN', tipoSoporte: 'convalidacion_men', obligatorio: 'Si aplica', validacion: 'BR-051' },
      { campo: 'Nivel de formación', documento: '— (Derivado)', tipoSoporte: '', obligatorio: 'Derivado', validacion: 'BR-050: Título máximo aprobado' },
      { campo: 'Perfil académico / PRO', documento: 'Hoja de vida soportada por títulos', tipoSoporte: 'hoja_vida_pro', obligatorio: 'Sí', validacion: 'Coherente con bloque C' },
    ],
  },
  VINCULACION: {
    label: 'Vinculación',
    letra: 'D',
    subtitle: 'Documentos administrativos de la vinculación docente',
    icon: Briefcase,
    color: '#f59e0b',
    bg: '#FFFBEB',
    campos: [
      { campo: 'Vinculación (tipo)', documento: 'Acto administrativo de vinculación', tipoSoporte: 'acto_administrativo_vinculacion', obligatorio: 'Sí' },
      { campo: 'Régimen normativo', documento: '— (Derivado)', tipoSoporte: '', obligatorio: 'Derivado', validacion: 'BR-049: Coherencia régimen↔vinculación' },
      { campo: 'Origen de vinculación', documento: 'Acto administrativo / Resolución de convocatoria', tipoSoporte: 'resolucion_convocatoria', obligatorio: 'Sí' },
      { campo: 'Acto administrativo', documento: 'Resolución o contrato (el documento mismo)', tipoSoporte: 'contrato', obligatorio: 'Sí', validacion: 'BR-040: Fecha = inicio vinculación' },
      { campo: 'Inicio / Fin de vinculación', documento: 'Acto administrativo / contrato', tipoSoporte: 'contrato', obligatorio: 'Sí', validacion: 'Inicio ≤ Fin' },
      { campo: 'Dedicación (TC/MT/HC)', documento: 'Acto administrativo', tipoSoporte: 'acto_administrativo_dedicacion', obligatorio: 'Sí' },
      { campo: 'Situación administrativa', documento: 'Acto administrativo (encargo, comisión, licencia)', tipoSoporte: 'acto_administrativo_situacion', obligatorio: 'Sí' },
      { campo: 'Territorial / Sede', documento: 'Acto administrativo de adscripción', tipoSoporte: 'acto_adscripcion_territorial', obligatorio: 'Sí', validacion: 'CETAP no va aquí' },
      { campo: 'Categoría (escalafón)', documento: 'Resolución de escalafón / ubicación en categoría', tipoSoporte: 'resolucion_escalafon', obligatorio: 'Sí', validacion: 'BR-048: Coherencia categoría↔formación' },
      { campo: 'Puntaje salarial', documento: 'Resolución de ubicación salarial', tipoSoporte: 'resolucion_puntaje_salarial', obligatorio: 'Sí', validacion: 'Rango por categoría' },
    ],
  },
  ACADEMICO: {
    label: 'Académico',
    letra: 'E',
    subtitle: 'Asignaciones académicas, investigación y evaluación',
    icon: BookOpen,
    color: '#06b6d4',
    bg: '#ECFEFF',
    campos: [
      { campo: 'Núcleo temático', documento: 'Acto de asignación / definición institucional GGP', tipoSoporte: 'acto_asignacion_nucleo', obligatorio: 'Sí', validacion: 'Lista controlada' },
      { campo: 'Investigación 2025', documento: 'Acto de convocatoria / certificación de producto', tipoSoporte: 'certificacion_investigacion', obligatorio: 'Si aplica', validacion: 'Coherente con dedicación' },
      { campo: 'Última evaluación', documento: 'Acta o certificado de evaluación de desempeño (SEDP)', tipoSoporte: 'acta_evaluacion_desempeno', obligatorio: 'Sí', validacion: 'BR-055: Vigencia / caducidad' },
    ],
  },
  TRANSVERSAL: {
    label: 'Transversal',
    letra: 'F',
    subtitle: 'Documentos obligatorios para activar el registro',
    icon: Shield,
    color: '#e11d48',
    bg: '#FFF1F2',
    campos: [
      { campo: 'Autorización de tratamiento de datos', documento: 'Formato Habeas Data firmado', tipoSoporte: 'autorizacion_habeas_data', obligatorio: 'Sí', validacion: 'BR-057: Bloquea activación si falta' },
    ],
  },
};

// Badge colors for obligatoriedad
const OBLIG_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  'Sí':        { bg: '#FEF3C7', text: '#92400E', label: 'Obligatorio' },
  'Si aplica': { bg: '#EDE9FE', text: '#5B21B6', label: 'Si aplica' },
  'Derivado':  { bg: '#F1F5F9', text: '#64748B', label: 'Derivado' },
  'No':        { bg: '#F1F5F9', text: '#94A3B8', label: 'No requiere' },
};

const ESTADO_BADGE: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
  'Aprobado':        { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: CheckCircle2, label: 'Aprobado' },
  'Pendiente':       { bg: '#FEFCE8', text: '#CA8A04', border: '#FDE68A', icon: Clock,        label: 'Pendiente' },
  'En revisión':     { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: Eye,          label: 'En revisión' },
  'Devuelto':        { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: XCircle,      label: 'Devuelto' },
  'Soporte faltante': { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA', icon: AlertTriangle, label: 'Falta soporte' },
};

// ─── Component ──────────────────────────────────────────────────────
export function BancoDocenteAprobacion({ docenteId, docenteNombre, currentUserId }: Props) {
  const [bloques, setBloques] = useState<BloqueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedBloque, setExpandedBloque] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [devolverBloque, setDevolverBloque] = useState<string | null>(null);
  const [devolverObs, setDevolverObs] = useState('');
  const [previewUrl, setPreviewUrl] = useState<{ url: string, name: string } | null>(null);

  const fetchBloques = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRundBloques(docenteId);
      if (res.success) {
        setBloques(Array.isArray(res.data) ? res.data : []);
      } else {
        setError('No se pudieron cargar los bloques de validación.');
      }
    } catch {
      setError('Error de conexión al cargar bloques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBloques(); }, [docenteId]);

  const [retried, setRetried] = useState(false);
  useEffect(() => {
    if (!loading && bloques.length === 0 && !error && !retried) {
      setRetried(true);
      const timer = setTimeout(fetchBloques, 1500);
      return () => clearTimeout(timer);
    }
  }, [loading, bloques.length, error, retried]);

  // ─── Metrics ──────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = bloques.length || 6;
    const aprobados = bloques.filter(b => b.estado === 'Aprobado').length;
    const pct = Math.round((aprobados / total) * 100);
    return { total, aprobados, pct };
  }, [bloques]);

  // ─── Handlers ─────────────────────────────────────────────────
  const handleAprobar = async (bloque: string) => {
    if (!currentUserId) { setError('No se pudo identificar al usuario validador.'); return; }
    setActionLoading(bloque);
    try {
      const res = await aprobarRundBloque(docenteId, bloque, currentUserId);
      if (res.success) { setSuccess(`Bloque aprobado.`); setTimeout(() => setSuccess(null), 3000); await fetchBloques(); }
      else setError(res.message || 'No se pudo aprobar.');
    } catch { setError('Error al aprobar.'); }
    finally { setActionLoading(null); }
  };

  const handleDevolver = async () => {
    if (!devolverBloque || !devolverObs.trim() || !currentUserId) return;
    setActionLoading(devolverBloque);
    try {
      const res = await devolverRundBloque(docenteId, devolverBloque, currentUserId, devolverObs);
      if (res.success) { setSuccess('Devuelto con observación.'); setTimeout(() => setSuccess(null), 3000); setDevolverBloque(null); setDevolverObs(''); await fetchBloques(); }
      else setError(res.message || 'Error.');
    } catch { setError('Error al devolver.'); }
    finally { setActionLoading(null); }
  };

  const [uploadingDoc, setUploadingDoc] = useState<{ bloque: string, tipo: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleVincularClick = (bloque: string, tipo: string) => {
    setUploadingDoc({ bloque, tipo });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingDoc) return;
    if (!currentUserId) { setError('No se pudo identificar al usuario.'); return; }
    
    const { bloque, tipo } = uploadingDoc;
    setActionLoading(bloque);
    try {
      const res = await vincularRundSoporte(docenteId, bloque, {
        tipoSoporte: tipo,
        nombreArchivo: file.name,
        cargadoPor: currentUserId
      }, file);
      
      if (res.success) { 
        setSuccess(`Documento "${file.name}" cargado exitosamente.`); 
        setTimeout(() => setSuccess(null), 4000); 
        await fetchBloques(); 
      }
      else setError(res.message || 'Error al cargar el documento.');
    } catch { setError('Error de conexión al cargar el documento.'); }
    finally { setActionLoading(null); setUploadingDoc(null); }
  };

  const findSoporte = (soportes: any[], tipo: string) =>
    soportes?.find((s: any) => s.tipo_soporte === tipo || s.tipo === tipo);

  // ─── Render ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 }}>
        <Loader2 size={24} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Cargando validación RUND...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (bloques.length === 0 && !error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px', gap: 12, background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
        <Loader2 size={22} color="#3B82F6" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1F2937' }}>Inicializando bloques de validación...</span>
        <button onClick={fetchBloques} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: '#fff' }}>
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ═══ Header ═══ */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: metrics.pct === 100 ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {metrics.pct === 100 ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>Validación Carpeta RUND</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Cada dato del docente debe tener su documento soporte verificado (BR-038)</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: metrics.pct === 100 ? '#059669' : '#3b82f6' }}>{metrics.pct}%</span>
            <button onClick={fetchBloques} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.68rem', color: '#64748b' }}>
              <RefreshCw size={10} />
            </button>
          </div>
        </div>
        {/* Progress */}
        <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${metrics.pct}%`, height: '100%', background: metrics.pct === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 99, transition: 'width 0.5s' }} />
        </div>
        {/* Quick chips */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {bloques.map(b => {
            const cfg = CATALOGO_BR039[b.bloque];
            const est = ESTADO_BADGE[b.estado] || ESTADO_BADGE['Pendiente'];
            const EstIcon = est.icon;
            return (
              <div key={b.bloque} onClick={() => setExpandedBloque(expandedBloque === b.bloque ? null : b.bloque)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, background: est.bg, border: `1px solid ${est.border}`, fontSize: '0.7rem', fontWeight: 600, color: est.text, cursor: 'pointer' }}>
                <EstIcon size={11} />
                <span>{cfg?.letra || '?'}</span>
                <span style={{ color: est.text + 'CC' }}>{cfg?.label || b.bloque}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Alerts ═══ */}
      {error && (
        <div style={{ padding: '8px 14px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <XCircle size={13} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ padding: '8px 14px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0', color: '#059669', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={13} /> {success}
        </div>
      )}

      {/* ═══ Bloques como tabla dato↔documento ═══ */}
      {bloques.map(b => {
        const cfg = CATALOGO_BR039[b.bloque];
        if (!cfg) return null;
        const BIcon = cfg.icon;
        const est = ESTADO_BADGE[b.estado] || ESTADO_BADGE['Pendiente'];
        const EstIcon = est.icon;
        const isOpen = expandedBloque === b.bloque;
        const isLoading = actionLoading === b.bloque;
        const isDevolverOpen = devolverBloque === b.bloque;
        const canApprove = b.estado !== 'Aprobado';

        return (
          <div key={b.bloque} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${isOpen ? cfg.color + '50' : '#e2e8f0'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            {/* Header */}
            <div onClick={() => setExpandedBloque(isOpen ? null : b.bloque)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer', background: isOpen ? cfg.bg : 'transparent', transition: 'background 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}DD)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 800 }}>
                  {cfg.letra}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{cfg.label}</div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{cfg.subtitle}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: est.bg, color: est.text, border: `1px solid ${est.border}` }}>
                  <EstIcon size={11} /> {est.label}
                </span>
                {isOpen ? <ChevronDown size={15} color="#94a3b8" /> : <ChevronRight size={15} color="#94a3b8" />}
              </div>
            </div>

            {/* Table */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #f1f5f9' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange} 
                />
                
                {/* Observación */}
                {b.observacion && (
                  <div style={{ margin: '10px 14px', padding: '8px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', fontSize: '0.75rem', color: '#991b1b' }}>
                    <strong>📝 Observación:</strong> {b.observacion}
                  </div>
                )}

                {/* Table container for responsiveness */}
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <div style={{ minWidth: 650 }}>
                    {/* Table header */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(200px, 2fr) 90px 80px', padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', gap: 8 }}>
                      <span>Campo RUND</span>
                      <span>Documento soporte</span>
                      <span style={{ textAlign: 'center' }}>Obligatorio</span>
                      <span style={{ textAlign: 'center' }}>Estado</span>
                    </div>

                    {/* Table rows */}
                {cfg.campos.map((c, idx) => {
                  const soporte = c.tipoSoporte ? findSoporte(b.soportes || [], c.tipoSoporte) : null;
                  const hasDoc = !!soporte;
                  const isDerived = c.obligatorio === 'Derivado';
                  const obBadge = OBLIG_BADGE[c.obligatorio] || OBLIG_BADGE['No'];

                  return (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: 'minmax(180px, 2fr) minmax(200px, 2fr) 90px 80px', padding: '10px 16px',
                      borderBottom: idx < cfg.campos.length - 1 ? '1px solid #f1f5f9' : 'none',
                      background: isDerived ? '#FAFAFA' : hasDoc ? '#FAFFF8' : 'transparent',
                      alignItems: 'center', gap: 8, fontSize: '0.78rem', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isDerived) (e.currentTarget as any).style.background = cfg.bg; }}
                    onMouseLeave={e => { (e.currentTarget as any).style.background = isDerived ? '#FAFAFA' : hasDoc ? '#FAFFF8' : 'transparent'; }}
                    >
                      {/* Campo */}
                      <div>
                        <div style={{ fontWeight: 600, color: isDerived ? '#94a3b8' : '#1e293b' }}>{c.campo}</div>
                        {c.validacion && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 1 }}>{c.validacion}</div>}
                      </div>

                      {/* Documento */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isDerived ? (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>{c.documento}</span>
                        ) : hasDoc ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <CheckCircle2 size={13} color="#22c55e" /> {c.documento}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button 
                                title="Ver documento"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: '#3b82f6' }}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  // La URL de w3.org bloquea iframes por CSP (frame-ancestors).
                                  let dbUrl = soporte?.url;
                                  let url = ''; 
                                  
                                  if (dbUrl && !dbUrl.includes('w3.org')) {
                                    if (dbUrl.startsWith('/api/academic-work-plan-service/')) {
                                      dbUrl = dbUrl.replace('/api/academic-work-plan-service/', '/pta/api/v1/');
                                    }
                                    if (dbUrl.startsWith('http')) {
                                      url = dbUrl;
                                    } else if (dbUrl.startsWith('/')) {
                                      url = dbUrl; // Usar ruta relativa directamente
                                    }
                                  } else {
                                    // Fallback visual si es el dummy URL
                                    url = 'data:text/html;charset=utf-8,' + encodeURIComponent(`
                                      <div style="font-family:sans-serif; text-align:center; padding: 40px; color:#64748b;">
                                        <h3>Documento de prueba antiguo</h3>
                                        <p>Este registro tiene una URL de prueba antigua que no permite previsualización.</p>
                                        <p>Por favor, usa el botón <strong>Reemplazar documento (🔄)</strong> para subir el archivo de nuevo.</p>
                                      </div>
                                    `);
                                  }
                                  setPreviewUrl({ url, name: soporte?.nombre || c.documento });
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              
                              <button 
                                title="Reemplazar documento"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', color: '#64748b' }}
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleVincularClick(b.bloque, c.tipoSoporte);
                                }}
                              >
                                <RefreshCw size={13} />
                              </button>
                            </div>
                          </div>
                        ) : c.tipoSoporte ? (
                          <button onClick={() => handleVincularClick(b.bloque, c.tipoSoporte)}
                            disabled={isLoading}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                              borderRadius: 6, border: 'none', fontSize: '0.72rem', fontWeight: 600,
                              background: c.obligatorio === 'Sí' ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}DD)` : '#e2e8f0',
                              color: c.obligatorio === 'Sí' ? '#fff' : '#475569',
                              cursor: isLoading ? 'wait' : 'pointer',
                              boxShadow: c.obligatorio === 'Sí' ? `0 2px 6px ${cfg.color}40` : 'none',
                            }}>
                            {isLoading && uploadingDoc?.bloque === b.bloque && uploadingDoc?.tipo === c.tipoSoporte ? 
                              <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : 
                              <Upload size={11} />}
                            {c.documento.substring(0, 30)}{c.documento.length > 30 ? '…' : ''}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.75rem' }}>{c.documento}</span>
                        )}
                      </div>

                      {/* Obligatorio badge */}
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: obBadge.bg, color: obBadge.text }}>
                          {obBadge.label}
                        </span>
                      </div>

                      {/* Estado */}
                      <div style={{ textAlign: 'center' }}>
                        {isDerived ? (
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Auto</span>
                        ) : hasDoc ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: '#ECFDF5', color: '#059669' }}>
                            <CheckCircle2 size={10} /> OK
                          </span>
                        ) : c.tipoSoporte ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: c.obligatorio === 'Sí' ? '#FFF7ED' : '#F1F5F9', color: c.obligatorio === 'Sí' ? '#EA580C' : '#94A3B8' }}>
                            {c.obligatorio === 'Sí' ? <AlertTriangle size={10} /> : <Clock size={10} />}
                            {c.obligatorio === 'Sí' ? 'Falta' : '—'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                  </div>
                </div>

                {/* Actions Bar for the Block */}
                {isDevolverOpen && (
                  <div style={{ margin: '10px 14px', padding: '12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>Devolver bloque "{cfg.label}" — Observación obligatoria (BR-045)</div>
                    <textarea value={devolverObs} onChange={e => setDevolverObs(e.target.value)} placeholder="Motivo de la devolución..." rows={2}
                      style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1.5px solid #fecaca', fontSize: '0.78rem', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button onClick={handleDevolver} disabled={!devolverObs.trim()} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: devolverObs.trim() ? '#dc2626' : '#e2e8f0', color: devolverObs.trim() ? '#fff' : '#94a3b8', fontSize: '0.75rem', fontWeight: 600, cursor: devolverObs.trim() ? 'pointer' : 'not-allowed' }}>
                        <Send size={11} /> Confirmar
                      </button>
                      <button onClick={() => { setDevolverBloque(null); setDevolverObs(''); }} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: '0.75rem', cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Action bar */}
                {!isDevolverOpen && (
                  <div style={{ padding: '8px 16px 12px', display: 'flex', gap: 6, alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                    {canApprove && (
                      <>
                        <button onClick={() => handleAprobar(b.bloque)} disabled={isLoading || b.estado === 'Soporte faltante'}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: 'none', background: b.estado === 'Soporte faltante' ? '#e2e8f0' : 'linear-gradient(135deg, #22c55e, #16a34a)', color: b.estado === 'Soporte faltante' ? '#94a3b8' : '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: b.estado === 'Soporte faltante' ? 'not-allowed' : 'pointer', boxShadow: b.estado !== 'Soporte faltante' ? '0 2px 6px rgba(34,197,94,0.25)' : 'none' }}>
                          {isLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />}
                          {b.estado === 'Soporte faltante' ? 'Cargue soportes primero' : 'Aprobar bloque'}
                        </button>
                        <button onClick={() => setDevolverBloque(b.bloque)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                          <ShieldAlert size={12} /> Devolver
                        </button>
                      </>
                    )}
                    {b.estado === 'Aprobado' && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, background: '#ECFDF5', color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>
                        <Lock size={12} /> Bloque aprobado y verificado
                      </span>
                    )}
                    <div style={{ marginLeft: 'auto', fontSize: '0.65rem', color: '#94a3b8', display: 'flex', gap: 10 }}>
                      {b.cargadoPor && <span>📤 {b.cargadoPor}</span>}
                      {b.revisadoPor && <span>✅ {b.revisadoPor}</span>}
                      <span>v{b.version}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 🔹 Leyenda 🔹 */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.65rem', color: '#64748b' }}>
        <span style={{ fontWeight: 700 }}>Convenciones:</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#FEF3C7', marginRight: 3, verticalAlign: 'middle' }} />Obligatorio = exige soporte para aprobarse</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#EDE9FE', marginRight: 3, verticalAlign: 'middle' }} />Si aplica = solo si el docente declara ese nivel/ítem</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#F1F5F9', marginRight: 3, verticalAlign: 'middle' }} />Derivado = el sistema lo calcula, sin soporte propio</span>
      </div>

      {/* 🔹 Visor de Documentos (Modal) 🔹 */}
      {previewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            {/* Header del modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: '#e0f2fe', color: '#0ea5e9', padding: 8, borderRadius: 8 }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 600 }}>Previsualización de Documento</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{previewUrl.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setPreviewUrl(null)}
                style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', color: '#64748b', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
              >
                <XCircle size={20} color="#64748b" />
              </button>
            </div>

            {/* Contenedor del documento */}
            <div style={{ flex: 1, background: '#e2e8f0', padding: '16px' }}>
              <iframe 
                src={previewUrl.url} 
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }} 
                title="Visor de documento RUND"
              />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
