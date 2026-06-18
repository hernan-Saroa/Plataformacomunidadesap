/**
 * DETALLE INLINE COLAPSABLE — Reemplazo world-class del modal de wizard
 *
 * Se renderiza como una fila expandible debajo del docente seleccionado.
 * Usa secciones colapsables (acordeón) en lugar de tabs wizard.
 * Ocupa todo el ancho de la tabla → mejor usabilidad con 2000+ docentes.
 *
 * @version 3.0.0 — Inline expandable design
 */
import { useState, useEffect, useCallback } from 'react';
import {
  User, GraduationCap, Briefcase, FileSpreadsheet, CheckCircle2,
  ChevronDown, ChevronRight, Mail, Phone, Calendar, Building2,
  Clock, Award, Edit2, X, Loader2, Shield, FolderOpen, FileText,
  AlertTriangle, Eye
} from 'lucide-react';
import { getRUNDDocente } from '../../../services/api/ptaApi';
import { RundValidationPanel } from './RundValidationPanel';

interface Props {
  docente: any;
  onClose: () => void;
  onEdit: (d: any) => void;
}

// ── Validation badge ──────────────────────────────────────────────────────────
const getValidationBadge = (campoName: string, checklist: any[], targetId: string) => {
  if (!Array.isArray(checklist) || checklist.length === 0) return null;
  const item = checklist.find((c) => c.campo_rund === campoName);
  if (!item) return null;

  const colors: Record<string, { bg: string; text: string; label: string }> = {
    'Sin cargar': { bg: '#fee2e2', text: '#ef4444', label: 'Sin cargar' },
    'Pendiente': { bg: '#fef3c7', text: '#d97706', label: 'Pendiente' },
    'Aceptado': { bg: '#d1fae5', text: '#059669', label: 'Aceptado' },
    'Rechazado': { bg: '#fecaca', text: '#dc2626', label: 'Rechazado' },
    'No aplica': { bg: '#f3f4f6', text: '#6b7280', label: 'No aplica' }
  };

  const status = item.estado_documento || 'Sin cargar';
  const config = colors[status] || colors['Sin cargar'];

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '1px 6px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
      background: config.bg, color: config.text, marginLeft: 6,
    }}>
      {config.label}
    </span>
  );
};

// ── Field component ───────────────────────────────────────────────────────────
const Field = ({ label, value, badge, color = '#1e293b', campoRund, checklist = [], targetId }: {
  label: string; value: any; badge?: boolean; color?: string;
  campoRund?: string; checklist?: any[]; targetId?: string;
}) => {
  let safeValue = value;
  if (typeof value === 'object' && value !== null) {
    safeValue = value.nombre || value.codigo || value.id || JSON.stringify(value);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
        {campoRund && targetId && getValidationBadge(campoRund, checklist, targetId)}
      </div>
      {badge ? (
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
          borderRadius: 6, fontSize: '0.82rem', fontWeight: 600,
          background: `${color}15`, color, width: 'fit-content'
        }}>
          {safeValue || 'N/A'}
        </span>
      ) : (
        <span style={{ fontSize: '0.85rem', color: safeValue ? '#0f172a' : '#cbd5e1', fontWeight: safeValue ? 500 : 400 }}>
          {safeValue || 'No registrado'}
        </span>
      )}
    </div>
  );
};

// ── Section config ────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'personales', label: 'Datos Personales', icon: User, color: '#3B82F6', bg: '#EFF6FF' },
  { id: 'formacion', label: 'Formación Académica', icon: GraduationCap, color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'vinculacion', label: 'Vinculación', icon: Briefcase, color: '#F59E0B', bg: '#FFFBEB' },
] as const;

// ── Soporte status helpers ──
const SOPORTE_ESTADO_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  'Aprobado': { bg: '#ECFDF5', text: '#059669', label: 'Aprobado' },
  'Pendiente': { bg: '#FEFCE8', text: '#CA8A04', label: 'Pendiente' },
  'En revisión': { bg: '#EFF6FF', text: '#2563EB', label: 'En revisión' },
  'Devuelto': { bg: '#FEF2F2', text: '#DC2626', label: 'Devuelto' },
  'Soporte faltante': { bg: '#FFF7ED', text: '#EA580C', label: 'Sin soporte' },
};

const CAMPO_LABELS: Record<string, string> = {
  NOMBRE_COMPLETO: 'Nombre Completo', DOCUMENTO_IDENTIDAD: 'Documento de Identidad',
  TIPO_DOCUMENTO: 'Tipo de Documento', FECHA_NACIMIENTO: 'Fecha de Nacimiento',
  GENERO: 'Género', NIVEL_FORMACION: 'Nivel de Formación',
  TITULO_PREGRADO: 'Título Pregrado', TITULO_ESPECIALIZACION: 'Título Especialización',
  TITULO_MAESTRIA: 'Título Maestría', TITULO_DOCTORADO: 'Título Doctorado',
  TITULO_POSDOCTORADO: 'Título Posdoctorado', PERFIL_ACADEMICO: 'Perfil Académico',
  TIPO_VINCULACION: 'Tipo de Vinculación', DEDICACION: 'Dedicación',
  CATEGORIA_ESCALAFON: 'Categoría / Escalafón', TERRITORIAL: 'Territorial',
  REGIMEN_NORMATIVO: 'Régimen Normativo', ACTO_ADMINISTRATIVO: 'Acto Administrativo',
  PUNTAJE_SALARIAL: 'Puntaje Salarial', SITUACION_ADMINISTRATIVA: 'Situación Administrativa',
  NUCLEO_TEMATICO: 'Núcleo Temático', CORREO_INSTITUCIONAL: 'Correo Institucional',
  CORREO_ALTERNATIVO: 'Correo Alternativo', TELEFONO: 'Teléfono',
};

const BLOQUE_ICON_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  IDENTIDAD: { label: 'Identidad', color: '#3B82F6', icon: User },
  FORMACION: { label: 'Formación Académica', color: '#8B5CF6', icon: GraduationCap },
  VINCULACION: { label: 'Vinculación', color: '#F59E0B', icon: Briefcase },
  CONTACTO: { label: 'Contacto', color: '#10B981', icon: Mail },
};

// ── Main component ────────────────────────────────────────────────────────────
export function BancoDocenteDetalleInline({ docente, onClose, onEdit }: Props) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personales', 'rund']));
  const [checklist, setChecklist] = useState<any[]>([]);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  useEffect(() => {
    if (docente?.id) {
      setLoadingChecklist(true);
      getRUNDDocente(docente.id)
        .then((res) => {
          if (res.success && res.data) {
            setChecklist(Array.isArray(res.data) ? res.data : []);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingChecklist(false));
    }
  }, [docente]);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  if (!docente) return null;

  const targetId = docente.personaId || docente.id || docente.documento_identidad;
  const formatDate = (ds: string) => {
    if (!ds) return null;
    try { return new Date(ds).toLocaleDateString('es-CO'); } catch { return ds; }
  };

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'personales':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <Field checklist={checklist} targetId={targetId} label="Documento de Identidad" value={docente.documento_identidad} campoRund="DOCUMENTO_IDENTIDAD" />
            <Field checklist={checklist} targetId={targetId} label="Tipo de Documento" value={docente.tipo_documento} badge color="#3b82f6" campoRund="TIPO_DOCUMENTO" />
            <Field checklist={checklist} targetId={targetId} label="Nombre Completo" value={docente.nombre_completo} campoRund="NOMBRE_COMPLETO" />
            <Field checklist={checklist} targetId={targetId} label="Primer Nombre" value={docente.primer_nombre} />
            <Field checklist={checklist} targetId={targetId} label="Segundo Nombre" value={docente.segundo_nombre} />
            <Field checklist={checklist} targetId={targetId} label="Primer Apellido" value={docente.primer_apellido} />
            <Field checklist={checklist} targetId={targetId} label="Segundo Apellido" value={docente.segundo_apellido} />
            <Field checklist={checklist} targetId={targetId} label="Género" value={docente.genero} campoRund="GENERO" />
            <Field checklist={checklist} targetId={targetId} label="Sexo Biológico" value={docente.sexo_biologico} badge color="#059669" />
            <Field checklist={checklist} targetId={targetId} label="Fecha de Nacimiento" value={formatDate(docente.nacimiento)} campoRund="FECHA_NACIMIENTO" />
            <Field checklist={checklist} targetId={targetId} label="Edad" value={docente.edad ? `${docente.edad} años` : null} />
            <Field checklist={checklist} targetId={targetId} label="Rango de Edad" value={docente.rango_edad} />
            <Field checklist={checklist} targetId={targetId} label="Correo Institucional" value={docente.correo_institucional} campoRund="CORREO_INSTITUCIONAL" />
            <Field checklist={checklist} targetId={targetId} label="Correo Personal" value={docente.correo_personal} />
            <Field checklist={checklist} targetId={targetId} label="Teléfono" value={docente.telefono} />
          </div>
        );

      case 'formacion':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Field checklist={checklist} targetId={targetId} label="Nivel de Formación" value={docente.nivel_formacion} badge color="#0ea5e9" campoRund="NIVEL_FORMACION" />
              <Field checklist={checklist} targetId={targetId} label="Título Pregrado" value={docente.pregrado} campoRund="TITULO_PREGRADO" />
              <Field checklist={checklist} targetId={targetId} label="Título Especialización" value={docente.especializacion} campoRund="TITULO_ESPECIALIZACION" />
              <Field checklist={checklist} targetId={targetId} label="Título Maestría" value={docente.maestria} campoRund="TITULO_MAESTRIA" />
              <Field checklist={checklist} targetId={targetId} label="Título Doctorado" value={docente.doctorado} campoRund="TITULO_DOCTORADO" />
              <Field checklist={checklist} targetId={targetId} label="Título Posdoctorado" value={docente.posdoctorado} campoRund="TITULO_POSDOCTORADO" />
            </div>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
              <Field checklist={checklist} targetId={targetId} label="Perfil Académico" value={docente.perfil_academico} campoRund="PERFIL_ACADEMICO" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              <Field checklist={checklist} targetId={targetId} label="Núcleo Temático" value={docente.nucleo_tematico} badge color="#8b5cf6" campoRund="NUCLEO_TEMATICO" />
              <Field checklist={checklist} targetId={targetId} label="Investigación Activa" value={docente.investigacion} badge color={docente.investigacion === 'Sí' ? '#10b981' : '#64748b'} />
            </div>
          </div>
        );

      case 'vinculacion':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            <Field checklist={checklist} targetId={targetId} label="Vinculación" value={docente.vinculacion} badge color="#3b82f6" campoRund="VINCULACION" />
            <Field checklist={checklist} targetId={targetId} label="Código Vinculación" value={docente.vinculacion_codigo} />
            <Field checklist={checklist} targetId={targetId} label="Régimen Normativo" value={docente.regimen_normativo || docente.regimenNormativo || 'Sin régimen'} badge color="#8b5cf6" />
            <Field checklist={checklist} targetId={targetId} label="Dedicación" value={docente.dedicacion} badge color="#d946ef" campoRund="DEDICACION" />
            <Field checklist={checklist} targetId={targetId} label="Código Dedicación" value={docente.dedicacion_codigo} />
            <Field checklist={checklist} targetId={targetId} label="Horas Semanales" value={docente.dedicacion_horas_semana ? `${docente.dedicacion_horas_semana} h/semana` : null} />
            <Field checklist={checklist} targetId={targetId} label="Horas Programables (PTA)" value={docente.horas_programables ? `${docente.horas_programables} h` : null} badge color="#f59e0b" />
            <Field checklist={checklist} targetId={targetId} label="Categoría / Escalafón" value={docente.categoria} campoRund="CATEGORIA_ESCALAFON" />
            <Field checklist={checklist} targetId={targetId} label="Inicio Vinculación" value={formatDate(docente.inicio_vinculacion)} campoRund="INICIO_VINCULACION" />
            <Field checklist={checklist} targetId={targetId} label="Fin Vinculación" value={formatDate(docente.fin_vinculacion) || 'Indefinido'} campoRund="FIN_VINCULACION" />
            <Field checklist={checklist} targetId={targetId} label="Origen Vinculación" value={docente.origen_vinculacion} />
            <Field checklist={checklist} targetId={targetId} label="Acto Administrativo" value={docente.acto_administrativo_vinculacion} campoRund="ACTO_ADMINISTRATIVO" />
            <Field checklist={checklist} targetId={targetId} label="Situación Administrativa" value={docente.situacion_administrativa} campoRund="SITUACION_ADMINISTRATIVA" />
            <Field checklist={checklist} targetId={targetId} label="Categoría Situación" value={docente.situacion_categoria} badge color="#0284c7" />
            <Field checklist={checklist} targetId={targetId} label="Puntaje Salarial" value={docente.puntaje_salarial} campoRund="PUNTAJE_SALARIAL" />
            <Field checklist={checklist} targetId={targetId} label="Última Evaluación" value={docente.ultima_evaluacion} campoRund="ULTIMA_EVALUACION" />
            <Field checklist={checklist} targetId={targetId} label="Territorial" value={docente.territorial} badge color="#059669" campoRund="TERRITORIAL" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <tr>
      <td colSpan={8} style={{ padding: 0, background: '#FAFBFC' }}>
        <div style={{
          borderTop: '2px solid #003DA5',
          animation: 'slideDown 0.2s ease-out',
        }}>
          {/* ── Slim action bar (no name repetition) ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '8px 20px', borderBottom: '1px solid #E5E7EB',
            background: '#F9FAFB',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => onEdit(docente)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 7, border: '1px solid #003DA5',
                  background: '#003DA5', color: 'white',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                <Edit2 size={11} /> Editar
              </button>
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: 7, border: '1px solid #E5E7EB',
                  background: 'white', color: '#6B7280',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                title="Cerrar detalle"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Prominent RUND Validation Panel ── */}
          <div style={{ padding: '20px 20px 0 20px', background: '#FAFBFC' }}>
            <RundValidationPanel 
              docenteId={docente.docente_id || docente.id} 
              cleanPersonaId={docente.personaId || docente.persona_id}
              docente={docente} 
            />
          </div>

          {/* Redundant accordion sections removed to unify with the World-Class Validation Panel */}
        </div>

        {/* Animations */}
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; max-height: 0; }
            to { opacity: 1; max-height: 2000px; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </td>
    </tr>
  );
}
