import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  FileSpreadsheet,
  Mail,
  Phone,
  Calendar,
  Building2,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { getRUNDDocente } from '../../../services/api/ptaApi';
import { BancoDocenteAprobacion } from './BancoDocenteAprobacion';

interface Props {
  docente: any;
  onClose: () => void;
  onEdit: (d: any) => void;
}

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
    <span
      title={item.observacion ? `Observación: ${item.observacion}` : 'Haga clic para ver en Carpeta Digital'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.72rem',
        fontWeight: 700,
        background: config.bg,
        color: config.text,
        marginLeft: 8,
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'all 0.2s'
      }}
      onClick={(e) => {
        e.stopPropagation();
        window.location.hash = `#/carpeta-digital?personaId=${targetId}`;
      }}
    >
      {config.label}
    </span>
  );
};

const Field = ({ 
  label, 
  value, 
  badge = false, 
  color = '#1e293b', 
  campoRund,
  checklist = [],
  targetId
}: { 
  label: string; 
  value: any; 
  badge?: boolean; 
  color?: string; 
  campoRund?: string;
  checklist?: any[];
  targetId?: string;
}) => {
  let safeValue = value;
  if (typeof value === 'object' && value !== null) {
    if (value.nombre || value.codigo || value.id) {
      safeValue = value.nombre || value.codigo || value.id;
    } else {
      try {
        safeValue = JSON.stringify(value);
      } catch {
        safeValue = '[Objeto complejo]';
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        {campoRund && targetId && getValidationBadge(campoRund, checklist, targetId)}
      </div>
      {badge ? (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: '0.85rem',
          fontWeight: 600,
          background: `${color}15`,
          color: color,
          width: 'fit-content'
        }}>
          {safeValue || 'N/A'}
        </span>
      ) : (
        <span style={{ fontSize: '0.95rem', color: safeValue ? '#0f172a' : '#94a3b8', fontWeight: safeValue ? 500 : 400 }}>
          {safeValue || 'No registrado'}
        </span>
      )}
    </div>
  );
};

export function BancoDocenteDetalle({ docente, onClose, onEdit }: Props) {
  const [activeTab, setActiveTab] = useState<'personales' | 'formacion' | 'vinculacion' | 'rund' | 'validacion'>('personales');
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
        .catch((err) => console.error('Error loading RUND checklist:', err))
        .finally(() => setLoadingChecklist(false));
    }
  }, [docente]);

  if (!docente) return null;

  const targetId = docente.personaId || docente.id || docente.documento_identidad;

  const tabs = [
    { id: 'personales', label: 'Datos Personales', icon: User },
    { id: 'formacion', label: 'Formación', icon: GraduationCap },
    { id: 'vinculacion', label: 'Vinculación', icon: Briefcase },
    { id: 'rund', label: 'Carga Masiva (RUND)', icon: FileSpreadsheet },
    { id: 'validacion', label: 'Validación RUND', icon: CheckCircle2 },
  ] as const;

  const formatDate = (dateString: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('es-CO');
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 800,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700 }}>
              {docente.nombre_completo?.charAt(0) || 'D'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>{docente.nombre_completo}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, fontSize: '0.85rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={14} /> CC: {docente.documento_identidad}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={14} /> {docente.correo_institucional || 'Sin correo ESAP'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(docente)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              <Edit2 size={13} /> Editar
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#64748b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid #e2e8f0', gap: 32 }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  background: 'none', border: 'none', padding: '16px 0', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem', fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1d4ed8' : '#64748b',
                  borderBottom: isActive ? '2px solid #1d4ed8' : '2px solid transparent',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1, background: '#fff' }}>
          {activeTab === 'personales' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
          )}

          {activeTab === 'formacion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <Field checklist={checklist} targetId={targetId} label="Nivel de Formación" value={docente.nivel_formacion} badge color="#0ea5e9" campoRund="NIVEL_FORMACION" />
                <Field checklist={checklist} targetId={targetId} label="Título Pregrado" value={docente.pregrado} campoRund="TITULO_PREGRADO" />
                <Field checklist={checklist} targetId={targetId} label="Título Especialización" value={docente.especializacion} campoRund="TITULO_ESPECIALIZACION" />
                <Field checklist={checklist} targetId={targetId} label="Título Maestría" value={docente.maestria} campoRund="TITULO_MAESTRIA" />
                <Field checklist={checklist} targetId={targetId} label="Título Doctorado" value={docente.doctorado} campoRund="TITULO_DOCTORADO" />
                <Field checklist={checklist} targetId={targetId} label="Título Posdoctorado" value={docente.posdoctorado} campoRund="TITULO_POSDOCTORADO" />
              </div>
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <Field checklist={checklist} targetId={targetId} label="Perfil Académico" value={docente.perfil_academico} campoRund="PERFIL_ACADEMICO" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <Field checklist={checklist} targetId={targetId} label="Núcleo Temático" value={docente.nucleo_tematico} badge color="#8b5cf6" campoRund="NUCLEO_TEMATICO" />
                <Field checklist={checklist} targetId={targetId} label="Investigación Activa" value={docente.investigacion} badge color={docente.investigacion === 'Sí' ? '#10b981' : '#64748b'} />
              </div>
            </div>
          )}

          {activeTab === 'vinculacion' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <Field checklist={checklist} targetId={targetId} label="Vinculación" value={docente.vinculacion} badge color="#3b82f6" campoRund="VINCULACION" />
              <Field checklist={checklist} targetId={targetId} label="Código Vinculación" value={docente.vinculacion_codigo} />
              <Field checklist={checklist} targetId={targetId} label="Régimen Normativo" value={docente.regimen_normativo || docente.regimenNormativo || "Sin régimen"} badge color="#8b5cf6" />
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
              <Field checklist={checklist} targetId={targetId} label="Puntaje Salarial" value={docente.proteccion_datos?.acceso_completo === false ? 'Información restringida' : docente.puntaje_salarial} campoRund="PUNTAJE_SALARIAL" />
              <Field checklist={checklist} targetId={targetId} label="Última Evaluación" value={docente.ultima_evaluacion} campoRund="ULTIMA_EVALUACION" />
              <Field checklist={checklist} targetId={targetId} label="Estructura Organizacional (Territorial)" value={docente.territorial} badge color="#059669" campoRund="TERRITORIAL" />
              <Field checklist={checklist} targetId={targetId} label="Ubicación CETAP" value="CETAP no es del docente (Se asigna por asignatura - BR-026)" />
            </div>
          )}

          {activeTab === 'rund' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px', background: '#eff6ff', borderRadius: 12, border: '1px solid #bfdbfe' }}>
                <AlertCircle color="#2563eb" size={24} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e3a8a' }}>Información de Carga Masiva</h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#1e40af' }}>Estos datos son extraídos directamente del archivo de carga masiva.</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <Field label="ID RUND" value={docente.id_rund || docente.idRund} badge color="#6366f1" />
                <Field label="Periodo de Carga" value={docente.periodo_carga || docente.periodoCarga} badge color="#ec4899" />
              </div>
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <Field label="Observaciones del Operador" value={docente.observaciones} />
              </div>
            </div>
          )}

          {activeTab === 'validacion' && (
            <BancoDocenteAprobacion
              docenteId={docente.id || docente.docente_id}
              docenteNombre={docente.nombre_completo || 'Docente'}
              currentUserId={docente.usuario_id || undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
