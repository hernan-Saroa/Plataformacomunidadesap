import { useState, useEffect, useCallback } from 'react';
import { X, Save, User, Briefcase, GraduationCap, Mail, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Sparkles, Upload } from 'lucide-react';
import { createBancoDocente, updateBancoDocente, vincularRundSoporte } from '../../../services/api/ptaApi';
import { useAuth } from '../../../contexts/AuthContext';
import { OFFICIAL_TERRITORIALES_ESAP } from '../../../../shared/territoriales-cetaps-esap';
import {
  MANUAL_DEDICACIONES,
  MANUAL_DOCUMENT_TYPES,
  MANUAL_VINCULACIONES,
  computeManualAge,
  computeManualAgeRange,
  getManualDefaultPtaHours,
  getManualErrorStep,
  getManualRegimen,
  getManualWeeklyHours,
  normalizeManualGender,
  sanitizeManualDecimal,
  sanitizeManualDocument,
  sanitizeManualInteger,
  sanitizeManualPhone,
  validateManualBancoDocenteForm,
  validateManualBancoDocenteStep,
  type ManualDocenteErrors,
} from '../../../utils/bancoDocenteManual';

interface Props {
  docente: any | null;
  periodoSeleccionado?: string;
  onClose: () => void;
  onSaved: () => void;
}

const TERRITORIALES = OFFICIAL_TERRITORIALES_ESAP.map((territorial) => territorial.nombre);

type Step = 0 | 1 | 2 | 3;

interface StepConfig {
  key: string;
  label: string;
  subtitle: string;
  icon: any;
  color: string;
  gradient: string;
}

const STEPS: StepConfig[] = [
  { key: 'vinculacion', label: 'Vinculación', subtitle: 'Datos contractuales', icon: Briefcase, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  { key: 'formacion', label: 'Formación', subtitle: 'Perfil académico', icon: GraduationCap, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
  { key: 'contacto', label: 'Contacto', subtitle: 'Información de contacto', icon: Mail, color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { key: 'personal', label: 'Personal', subtitle: 'Datos personales', icon: User, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
];

/* ═══════════════════════════════════════════════════════════════════
   Subcomponents
   ═══════════════════════════════════════════════════════════════════ */

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
      <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.01em' }}>{title}</h4>
      {description && <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 400 }}>{description}</p>}
    </div>
  );
}

function FloatingField({ label, children, required, hint, error, fullWidth }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string; error?: string; fullWidth?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 700 }}>●</span>}
      </label>
      {children}
      {error
        ? <span role="alert" style={{ fontSize: '0.67rem', color: '#dc2626', marginTop: -2 }}>{error}</span>
        : hint && <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: -2 }}>{hint}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════ */

const fieldStyle: React.CSSProperties = {
  padding: '10px 13px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  fontSize: '0.82rem',
  color: '#0f172a',
  outline: 'none',
  background: '#f8fafc',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  fontFamily: 'inherit',
};

const fieldFocusStyle = `
  .wizard-field:focus {
    border-color: #3b82f6 !important;
    background: #fff !important;
    box-shadow: 0 0 0 3px rgba(59,130,246,0.1), 0 1px 3px rgba(0,0,0,0.05) !important;
  }
  .wizard-field:hover:not(:focus) {
    border-color: #cbd5e1 !important;
    background: #fff !important;
  }
  .wizard-field::placeholder {
    color: #94a3b8 !important;
    font-style: italic;
  }
  .wizard-field[aria-invalid="true"] {
    border-color: #ef4444 !important;
    background: #fff7f7 !important;
    box-shadow: 0 0 0 3px rgba(239,68,68,0.08) !important;
  }
  .wizard-select {
    cursor: pointer;
  }
  .wizard-textarea {
    resize: vertical;
    min-height: 64px;
    font-family: inherit;
  }

  @keyframes wizardSlideIn {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes wizardSlideOut {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes wizardFadeIn {
    from { opacity: 0; transform: scale(0.97); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes wizardOverlayIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); }
    50% { box-shadow: 0 0 0 6px rgba(59,130,246,0); }
  }
  .step-active {
    animation: pulseGlow 2s ease-in-out infinite;
  }
  .wizard-step-content {
    animation: wizardSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .wizard-step-content-back {
    animation: wizardSlideOut 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .wizard-modal {
    animation: wizardFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .wizard-overlay {
    animation: wizardOverlayIn 0.25s ease;
  }

  .wizard-nav-btn {
    transition: all 0.2s ease !important;
  }
  .wizard-nav-btn:hover:not(:disabled) {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  }
  .wizard-nav-btn:active:not(:disabled) {
    transform: translateY(0) !important;
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */

export function BancoDocenteEditModal({ docente, periodoSeleccionado, onClose, onSaved }: Props) {
  const [activeStep, setActiveStep] = useState<Step>(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ManualDocenteErrors>({});
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set([0]));
  const auth = useAuth();
  const sensitiveDataRestricted = Boolean(docente?.proteccion_datos?.acceso_completo === false);

  const [form, setForm] = useState({
    nombreCompleto: '',
    documento_identidad: '',
    tipo_identificacion: 'CC',
    periodoCarga: periodoSeleccionado || '',
    territorialNombre: '',
    tipoVinculacion: 'OCASIONAL',
    dedicacion: 'TC',
    horasPta: '800',
    dedicacionHorasSemana: '40',
    regimenNormativo: getManualRegimen('OCASIONAL'),
    escalafon: '',
    origenVinculacion: '',
    actoAdministrativoVinculacion: '',
    puntajeSalarial: '',
    situacionAdministrativa: '',
    situacionCategoria: '',
    estado: 'ACTIVO',
    ultimaEvaluacion: '',
    fechaInicioVinculacion: '',
    fechaFinVinculacion: '',
    observaciones: '',
    nivelFormacion: '',
    perfilAcademico: '',
    nucleoTematico: '',
    pregrado: '',
    especializacion: '',
    maestria: '',
    doctorado: '',
    posDoctorado: '',
    investigacion: '',
    correoInstitucional: '',
    correoAlternativo: '',
    telefono: '',
    genero: '',
    sexoBiologico: '',
    fechaNacimiento: '',
    idRund: '',
    justificacionEdicion: '',
  });

  useEffect(() => {
    if (docente) {
      setForm({
        nombreCompleto: docente.nombre_completo || '',
        documento_identidad: docente.documento_identidad || '',
        tipo_identificacion: docente.tipo_documento || 'CC',
        periodoCarga: docente.periodoCarga || docente.periodo_carga || periodoSeleccionado || '',
        territorialNombre: docente.territorial || '',
        tipoVinculacion: docente.vinculacion_codigo === 'CARRERA' ? 'CARRERA2' : (docente.vinculacion_codigo || 'OCASIONAL'),
        dedicacion: docente.dedicacion_codigo || 'TC',
        horasPta: String(docente.horas_programables ?? docente.horasAsignables ?? ''),
        dedicacionHorasSemana: String(docente.dedicacion_horas_semana ?? getManualWeeklyHours(docente.dedicacion_codigo || 'TC')),
        regimenNormativo: docente.regimen_normativo || docente.regimenNormativo || getManualRegimen(docente.vinculacion_codigo || 'OCASIONAL'),
        escalafon: docente.categoria || '',
        origenVinculacion: docente.origen_vinculacion || '',
        actoAdministrativoVinculacion: docente.acto_administrativo_vinculacion || '',
        puntajeSalarial: docente.puntaje_salarial?.toString() || '',
        situacionAdministrativa: docente.situacion_administrativa || '',
        situacionCategoria: docente.situacion_categoria || '',
        estado: String(docente.estado || 'ACTIVO').toUpperCase(),
        ultimaEvaluacion: docente.ultima_evaluacion || '',
        fechaInicioVinculacion: docente.inicio_vinculacion ? docente.inicio_vinculacion.split('T')[0] : '',
        fechaFinVinculacion: docente.fin_vinculacion ? docente.fin_vinculacion.split('T')[0] : '',
        observaciones: docente.observaciones || '',
        nivelFormacion: docente.nivel_formacion || '',
        perfilAcademico: docente.perfil_academico || '',
        nucleoTematico: docente.nucleo_tematico || '',
        pregrado: docente.pregrado || '',
        especializacion: docente.especializacion || '',
        maestria: docente.maestria || '',
        doctorado: docente.doctorado || '',
        posDoctorado: docente.posdoctorado || '',
        investigacion: docente.investigacion || '',
        correoInstitucional: docente.correo_institucional || '',
        correoAlternativo: docente.correo_personal || '',
        telefono: docente.telefono || '',
        genero: normalizeManualGender(docente.genero),
        sexoBiologico: docente.sexo_biologico || '',
        fechaNacimiento: docente.nacimiento ? docente.nacimiento.split('T')[0] : '',
        idRund: docente.id_rund || docente.idRund || '',
        justificacionEdicion: '',
      });
    } else {
      setForm((current) => ({ ...current, periodoCarga: periodoSeleccionado || current.periodoCarga }));
    }
    setFieldErrors({});
    setSupportFile(null);
  }, [docente, periodoSeleccionado]);

  const setValue = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setValue(key, e.target.value);

  const handleDocumentType = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const documentType = e.target.value;
    setForm((prev) => ({
      ...prev,
      tipo_identificacion: documentType,
      documento_identidad: sanitizeManualDocument(prev.documento_identidad, documentType),
    }));
    setFieldErrors((current) => ({ ...current, documento_identidad: '', tipo_identificacion: '' }));
  };

  const handleVinculacion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tipoVinculacion = e.target.value;
    setForm((prev) => ({
      ...prev,
      tipoVinculacion,
      regimenNormativo: getManualRegimen(tipoVinculacion),
      horasPta: getManualDefaultPtaHours(tipoVinculacion, prev.dedicacion),
    }));
    setFieldErrors((current) => ({ ...current, tipoVinculacion: '' }));
  };

  const handleDedicacion = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dedicacion = e.target.value;
    setForm((prev) => ({
      ...prev,
      dedicacion,
      dedicacionHorasSemana: getManualWeeklyHours(dedicacion),
      horasPta: getManualDefaultPtaHours(prev.tipoVinculacion, dedicacion),
    }));
    setFieldErrors((current) => ({ ...current, dedicacion: '' }));
  };

  // Step progress calculation
  const getStepProgress = useCallback((step: number): number => {
    const fieldsByStep: Record<number, string[]> = {
      0: ['documento_identidad', 'tipo_identificacion', 'nombreCompleto', 'periodoCarga', 'territorialNombre', 'tipoVinculacion', 'dedicacion', 'horasPta', 'escalafon', 'fechaInicioVinculacion', 'actoAdministrativoVinculacion'],
      1: ['nivelFormacion', 'pregrado', 'nucleoTematico', 'perfilAcademico'],
      2: ['correoInstitucional'],
      3: ['genero', 'fechaNacimiento'],
    };
    const fields = fieldsByStep[step] || [];
    if (fields.length === 0) return 0;
    const filled = fields.filter((f) => (form as any)[f]?.toString().trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  const totalProgress = Math.round(STEPS.reduce((acc, _, i) => acc + getStepProgress(i), 0) / STEPS.length);

  const goToStep = (step: Step) => {
    setDirection(step > activeStep ? 'forward' : 'back');
    setActiveStep(step);
    setTouchedSteps((prev) => new Set([...prev, step]));
    setError(null);
  };

  const isEditing = Boolean(docente?.docente_id || docente?.id);

  const validateStep = (step: Step): boolean => {
    const errors = validateManualBancoDocenteStep(form, step, { isEditing, supportFile, sensitiveDataRestricted });
    setFieldErrors((current) => ({ ...current, ...errors }));
    if (Object.keys(errors).length > 0) {
      setError('Revise los campos marcados antes de continuar.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    goToStep((activeStep + 1) as Step);
  };

  const handleSupportFile = (file: File | null) => {
    if (!file) {
      setSupportFile(null);
      return;
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
      setSupportFile(null);
      setFieldErrors((current) => ({
        ...current,
        soporteEdicion: 'Use un archivo PDF, JPG o PNG de máximo 10 MB.',
      }));
      return;
    }
    setSupportFile(file);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.soporteEdicion;
      return next;
    });
  };

  const handleSave = async () => {
    setError(null);
    const validationErrors = validateManualBancoDocenteForm(form, { isEditing, supportFile, sensitiveDataRestricted });
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      goToStep(getManualErrorStep(validationErrors) as Step);
      setError('No se puede guardar: revise los campos marcados en el formulario.');
      return;
    }

    setSaving(true);
    try {
      let soporteEdicionId: string | null = null;
      const docenteId = docente?.docente_id || docente?.id;
      if (isEditing && supportFile && docenteId) {
        const uploadResult = await vincularRundSoporte(
          docenteId,
          'TRANSVERSAL',
          {
            tipoSoporte: 'soporte_edicion_perfil',
            nombreArchivo: supportFile.name,
            cargadoPor: auth.userPersonId || auth.userEmail || 'SISTEMA',
          },
          supportFile,
        );
        soporteEdicionId = (uploadResult.data as any)?.id || null;
        if (!uploadResult.success || !soporteEdicionId) {
          setError((uploadResult as any).message || (uploadResult.data as any)?.error || 'No fue posible cargar el soporte documental de la edición.');
          return;
        }
      }

      const age = computeManualAge(form.fechaNacimiento);
      const payload: any = {
        documentNumber: form.documento_identidad.trim(),
        documentType: form.tipo_identificacion,
        nombreCompleto: form.nombreCompleto.trim(),
        territorialNombre: form.territorialNombre,
        tipoVinculacion: form.tipoVinculacion,
        dedicacion: form.dedicacion,
        dedicacionLabel: MANUAL_DEDICACIONES.find((item) => item.value === form.dedicacion)?.label || form.dedicacion,
        dedicacionHorasSemana: Number(form.dedicacionHorasSemana),
        regimenNormativo: form.regimenNormativo,
        horasPta: Number(form.horasPta),
        horasAsignables: Number(form.horasPta),
        escalafon: form.escalafon.trim(),
        origenVinculacion: form.origenVinculacion || null,
        actoAdministrativoVinculacion: form.actoAdministrativoVinculacion.trim(),
        puntajeSalarial: form.puntajeSalarial ? parseFloat(form.puntajeSalarial) : null,
        situacionAdministrativa: form.situacionAdministrativa || null,
        situacionCategoria: form.situacionCategoria || null,
        estado: form.estado,
        ultimaEvaluacion: form.ultimaEvaluacion || null,
        fechaInicioVinculacion: form.fechaInicioVinculacion,
        fechaFinVinculacion: form.fechaFinVinculacion || null,
        observaciones: form.observaciones || null,
        nivelFormacion: form.nivelFormacion,
        perfilAcademico: form.perfilAcademico.trim(),
        nucleoTematico: form.nucleoTematico.trim(),
        pregrado: form.pregrado.trim(),
        especializacion: form.especializacion || null,
        maestria: form.maestria || null,
        doctorado: form.doctorado || null,
        posDoctorado: form.posDoctorado || null,
        investigacion: form.investigacion || null,
        correoInstitucional: form.correoInstitucional.trim().toLowerCase(),
        correoAlternativo: form.correoAlternativo || null,
        telefono: form.telefono || null,
        genero: form.genero,
        sexoBiologico: form.sexoBiologico || null,
        fechaNacimiento: form.fechaNacimiento,
        edadReferencia: age,
        rangoEdad: computeManualAgeRange(age),
        periodoCarga: form.periodoCarga,
        idRund: form.idRund || null,
        actorId: auth.userPersonId || auth.userEmail || 'SISTEMA',
        soporteEdicionId,
        justificacionEdicion: isEditing ? form.justificacionEdicion.trim() : null,
      };
      if (isEditing && sensitiveDataRestricted) {
        delete payload.documentNumber;
        delete payload.puntajeSalarial;
      }

      const res = isEditing
        ? await updateBancoDocente(docenteId, payload)
        : await createBancoDocente(payload);

      if (res.success) {
        onSaved();
      } else {
        setError((res as any).message || (res as any).error || 'Error al guardar el docente');
      }
    } finally {
      setSaving(false);
    }
  };

  const currentStep = STEPS[activeStep];
  const StepIcon = currentStep.icon;
  const isLastStep = activeStep === 3;

  return (
    <>
      <style>{fieldFocusStyle}</style>
      <div className="wizard-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="wizard-modal" style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 950, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 80px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)' }}>

          {/* ─── Header ──────────────────────────────────────────── */}
          <div style={{ background: currentStep.gradient, padding: '22px 28px 18px', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative circles */}
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <StepIcon size={22} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                    {docente?.id ? 'Editar Docente' : 'Nuevo Docente'}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.76rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                    {currentStep.subtitle} — Paso {activeStep + 1} de {STEPS.length}
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}>
                <X size={16} color="#fff" />
              </button>
            </div>

            {/* ─── Progress bar ─── */}
            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
              <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalProgress}%`, background: '#fff', borderRadius: 10, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 0 8px rgba(255,255,255,0.4)' }} />
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', minWidth: 36, textAlign: 'right' }}>{totalProgress}%</span>
            </div>
          </div>

          {/* ─── Step Navigation ─────────────────────────────────── */}
          <div style={{ display: 'flex', padding: '0 28px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            {STEPS.map((step, i) => {
              const isActive = activeStep === i;
              const isCompleted = touchedSteps.has(i) && getStepProgress(i) >= 80;
              const Icon = step.icon;
              return (
                <button
                  key={step.key}
                  onClick={() => {
                    if (i <= activeStep || validateStep(activeStep)) goToStep(i as Step);
                  }}
                  className={isActive ? 'step-active' : ''}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '12px 8px',
                    border: 'none',
                    borderBottom: isActive ? `3px solid ${step.color}` : '3px solid transparent',
                    background: isActive ? `${step.color}08` : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? step.color : '#94a3b8',
                    marginBottom: -1,
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '8px 8px 0 0',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#64748b'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#94a3b8'; }}
                >
                  {isCompleted && !isActive ? (
                    <CheckCircle2 size={14} color="#22c55e" />
                  ) : (
                    <Icon size={14} />
                  )}
                  <span style={{ display: 'inline-block' }}>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─── Body ────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 20px' }}>

            {error && (
              <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #fef2f2, #fff1f2)', border: '1px solid #fecaca', fontSize: '0.8rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(220,38,38,0.08)' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div key={activeStep} className={direction === 'forward' ? 'wizard-step-content' : 'wizard-step-content-back'}>

              {/* ═══ STEP 0: Vinculación ═══ */}
              {activeStep === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  {/* Identification group */}
                  <div>
                    <SectionHeader title="Identificación" description="Datos de identidad del docente" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Documento de Identidad" required error={fieldErrors.documento_identidad} hint={sensitiveDataRestricted ? 'Dato enmascarado por la política RBAC; no se enviará en esta edición.' : (isEditing ? 'Llave única RUND: no se puede modificar.' : 'Solo números; el pasaporte admite letras y números.')}>
                        <input className="wizard-field" style={fieldStyle} value={form.documento_identidad} onChange={(e) => setValue('documento_identidad', sanitizeManualDocument(e.target.value, form.tipo_identificacion))} placeholder="Ej: 12345678" inputMode={form.tipo_identificacion === 'PA' ? 'text' : 'numeric'} maxLength={20} disabled={isEditing} aria-invalid={Boolean(fieldErrors.documento_identidad)} />
                      </FloatingField>
                      <FloatingField label="Tipo de Documento" required error={fieldErrors.tipo_identificacion}>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.tipo_identificacion} onChange={handleDocumentType} aria-invalid={Boolean(fieldErrors.tipo_identificacion)}>
                          {MANUAL_DOCUMENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </FloatingField>
                      <FloatingField label="Nombre Completo" required fullWidth error={fieldErrors.nombreCompleto} hint="Solo letras; no se admiten números en nombres o apellidos.">
                        <input className="wizard-field" style={fieldStyle} value={form.nombreCompleto} onChange={set('nombreCompleto')} placeholder="Ej: María Fernanda López García" maxLength={150} aria-invalid={Boolean(fieldErrors.nombreCompleto)} />
                      </FloatingField>
                      <FloatingField label="Período Académico" required fullWidth error={fieldErrors.periodoCarga} hint={isEditing ? 'Se conserva para no romper la vinculación del docente con sus PTA.' : 'Formato AAAA-1 o AAAA-2. Este período conserva la relación usada por PTA.'}>
                        <input className="wizard-field" style={fieldStyle} value={form.periodoCarga} onChange={set('periodoCarga')} placeholder="Ej: 2026-2" maxLength={6} disabled={isEditing} aria-invalid={Boolean(fieldErrors.periodoCarga)} />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Contract group */}
                  <div>
                    <SectionHeader title="Contrato y Adscripción" description="Tipo de vinculación, dedicación y territorial" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Territorial" required error={fieldErrors.territorialNombre}>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.territorialNombre} onChange={set('territorialNombre')} aria-invalid={Boolean(fieldErrors.territorialNombre)}>
                          <option value="">Seleccionar...</option>
                          {TERRITORIALES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </FloatingField>
                      <FloatingField label="Tipo de Vinculación" required error={fieldErrors.tipoVinculacion}>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.tipoVinculacion} onChange={handleVinculacion} aria-invalid={Boolean(fieldErrors.tipoVinculacion)}>
                          {MANUAL_VINCULACIONES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </FloatingField>
                      <FloatingField label="Dedicación" required error={fieldErrors.dedicacion}>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.dedicacion} onChange={handleDedicacion} aria-invalid={Boolean(fieldErrors.dedicacion)}>
                          {MANUAL_DEDICACIONES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </FloatingField>
                      <FloatingField label="Horas programables PTA" required error={fieldErrors.horasPta} hint="Bolsa autoritativa usada por creación, concertación y reportes PTA.">
                        <input className="wizard-field" style={fieldStyle} value={form.horasPta} onChange={(e) => setValue('horasPta', sanitizeManualInteger(e.target.value))} inputMode="numeric" placeholder="Ej: 720, 800, 900" maxLength={4} aria-invalid={Boolean(fieldErrors.horasPta)} />
                      </FloatingField>
                      <FloatingField label="Régimen Normativo" hint="Derivado del tipo de vinculación, igual que en la carga masiva.">
                        <input className="wizard-field" style={{ ...fieldStyle, background: '#f1f5f9', color: '#475569' }} value={form.regimenNormativo} readOnly />
                      </FloatingField>
                      <FloatingField label="Horas de Dedicación Semanal" error={fieldErrors.dedicacionHorasSemana} hint="Valor derivado de la dedicación; puede ajustarse si el acto administrativo lo indica.">
                        <input className="wizard-field" style={fieldStyle} value={form.dedicacionHorasSemana} onChange={(e) => setValue('dedicacionHorasSemana', sanitizeManualInteger(e.target.value, 3))} inputMode="numeric" maxLength={3} aria-invalid={Boolean(fieldErrors.dedicacionHorasSemana)} />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Classification */}
                  <div>
                    <SectionHeader title="Clasificación y Remuneración" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Categoría / Escalafón" required error={fieldErrors.escalafon}>
                        <input className="wizard-field" style={fieldStyle} value={form.escalafon} onChange={set('escalafon')} placeholder="Ej: Asociado, Titular" maxLength={100} aria-invalid={Boolean(fieldErrors.escalafon)} />
                      </FloatingField>
                      <FloatingField label="Puntaje Salarial" error={fieldErrors.puntajeSalarial} hint={sensitiveDataRestricted ? 'Información restringida para su rol.' : 'Solo números; use punto o coma para decimales.'}>
                        <input className="wizard-field" style={fieldStyle} value={form.puntajeSalarial} onChange={(e) => setValue('puntajeSalarial', sanitizeManualDecimal(e.target.value))} inputMode="decimal" placeholder={sensitiveDataRestricted ? 'Información restringida' : 'Ej: 145.5'} disabled={sensitiveDataRestricted} aria-invalid={Boolean(fieldErrors.puntajeSalarial)} />
                      </FloatingField>
                      <FloatingField label="Origen de Vinculación">
                        <input className="wizard-field" style={fieldStyle} value={form.origenVinculacion} onChange={set('origenVinculacion')} placeholder="Fuente de vinculación" />
                      </FloatingField>
                      <FloatingField label="Acto Administrativo" required error={fieldErrors.actoAdministrativoVinculacion} hint="Referencia del soporte de vinculación del docente.">
                        <input className="wizard-field" style={fieldStyle} value={form.actoAdministrativoVinculacion} onChange={set('actoAdministrativoVinculacion')} placeholder="Resolución o acto" maxLength={200} aria-invalid={Boolean(fieldErrors.actoAdministrativoVinculacion)} />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Dates & Status */}
                  <div>
                    <SectionHeader title="Fechas y Situación" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Inicio Vinculación" required error={fieldErrors.fechaInicioVinculacion}>
                        <input className="wizard-field" style={fieldStyle} type="date" value={form.fechaInicioVinculacion} onChange={set('fechaInicioVinculacion')} aria-invalid={Boolean(fieldErrors.fechaInicioVinculacion)} />
                      </FloatingField>
                      <FloatingField label="Fin Vinculación" error={fieldErrors.fechaFinVinculacion} hint="Déjelo vacío si la vinculación es indefinida.">
                        <input className="wizard-field" style={fieldStyle} type="date" value={form.fechaFinVinculacion} onChange={set('fechaFinVinculacion')} min={form.fechaInicioVinculacion || undefined} aria-invalid={Boolean(fieldErrors.fechaFinVinculacion)} />
                      </FloatingField>
                      <FloatingField label="Situación Administrativa">
                        <input className="wizard-field" style={fieldStyle} value={form.situacionAdministrativa} onChange={set('situacionAdministrativa')} placeholder="Ej: Activo, Comisión, Licencia..." />
                      </FloatingField>
                      <FloatingField label="Situación / Categoría">
                        <input className="wizard-field" style={fieldStyle} value={form.situacionCategoria} onChange={set('situacionCategoria')} placeholder="Ej: Servicio Activo" maxLength={100} />
                      </FloatingField>
                      <FloatingField
                        label="Estado del Perfil"
                        required
                        hint={isEditing ? 'Para cambiarlo use la acción Activar/Inactivar, que exige un soporte específico.' : 'Estado inicial del perfil para este período.'}
                      >
                        <select
                          className="wizard-field wizard-select"
                          style={isEditing ? { ...fieldStyle, background: '#f1f5f9', color: '#475569', cursor: 'not-allowed' } : fieldStyle}
                          value={form.estado}
                          onChange={set('estado')}
                          disabled={isEditing}
                        >
                          <option value="ACTIVO">Activo</option>
                          <option value="INACTIVO">Inactivo</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Última Evaluación">
                        <input className="wizard-field" style={fieldStyle} value={form.ultimaEvaluacion} onChange={set('ultimaEvaluacion')} placeholder="Ej: 2024-1" />
                      </FloatingField>
                      <FloatingField label="Observaciones" fullWidth>
                        <textarea className="wizard-field wizard-textarea" style={{ ...fieldStyle, minHeight: 60 }} value={form.observaciones} onChange={set('observaciones')} placeholder="Notas adicionales sobre la vinculación..." />
                      </FloatingField>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 1: Formación ═══ */}
              {activeStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <SectionHeader title="Nivel y Perfil Académico" description="Máximo nivel de formación y área de conocimiento" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Nivel de Formación" required error={fieldErrors.nivelFormacion}>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.nivelFormacion} onChange={set('nivelFormacion')} aria-invalid={Boolean(fieldErrors.nivelFormacion)}>
                          <option value="">Seleccionar...</option>
                          <option value="Pregrado">Pregrado</option>
                          <option value="Especialización">Especialización</option>
                          <option value="Maestría">Maestría</option>
                          <option value="Doctorado">Doctorado</option>
                          <option value="Posdoctorado">Posdoctorado</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Núcleo Temático" required error={fieldErrors.nucleoTematico} hint="Área temática principal usada por el perfil RUND.">
                        <input className="wizard-field" style={fieldStyle} value={form.nucleoTematico} onChange={set('nucleoTematico')} placeholder="Ej: Administración Pública" maxLength={300} aria-invalid={Boolean(fieldErrors.nucleoTematico)} />
                      </FloatingField>
                      <FloatingField label="Perfil Académico" required fullWidth error={fieldErrors.perfilAcademico}>
                        <textarea className="wizard-field wizard-textarea" style={fieldStyle} value={form.perfilAcademico} onChange={set('perfilAcademico')} placeholder="Descripción del perfil académico" maxLength={1000} aria-invalid={Boolean(fieldErrors.perfilAcademico)} />
                      </FloatingField>
                    </div>
                  </div>

                  <div>
                    <SectionHeader title="Títulos Obtenidos" description="Detalle de formación por nivel" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Pregrado" required error={fieldErrors.pregrado}>
                        <input className="wizard-field" style={fieldStyle} value={form.pregrado} onChange={set('pregrado')} placeholder="Título de pregrado" maxLength={300} aria-invalid={Boolean(fieldErrors.pregrado)} />
                      </FloatingField>
                      <FloatingField label="Especialización">
                        <input className="wizard-field" style={fieldStyle} value={form.especializacion} onChange={set('especializacion')} placeholder="Título de especialización" />
                      </FloatingField>
                      <FloatingField label="Maestría">
                        <input className="wizard-field" style={fieldStyle} value={form.maestria} onChange={set('maestria')} placeholder="Título de maestría" />
                      </FloatingField>
                      <FloatingField label="Doctorado">
                        <input className="wizard-field" style={fieldStyle} value={form.doctorado} onChange={set('doctorado')} placeholder="Título de doctorado" />
                      </FloatingField>
                      <FloatingField label="Posdoctorado">
                        <input className="wizard-field" style={fieldStyle} value={form.posDoctorado} onChange={set('posDoctorado')} placeholder="Estancia posdoctoral" />
                      </FloatingField>
                    </div>
                  </div>

                  <div>
                    <SectionHeader title="Investigación" description="Campo INVESTIGACION_ACTIVA de la plantilla masiva" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                      <FloatingField label="Grupo / Actividad de Investigación">
                        <textarea className="wizard-field wizard-textarea" style={fieldStyle} value={form.investigacion} onChange={set('investigacion')} placeholder="Nombre del grupo o actividad de investigación" maxLength={1000} />
                      </FloatingField>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 2: Contacto ═══ */}
              {activeStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <SectionHeader title="Correo Electrónico" description="El correo institucional es obligatorio para notificaciones del sistema" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Correo Institucional" required error={fieldErrors.correoInstitucional} hint="Debe ser único y terminar en @esap.edu.co.">
                        <input className="wizard-field" style={fieldStyle} type="email" value={form.correoInstitucional} onChange={set('correoInstitucional')} placeholder="nombre@esap.edu.co" maxLength={150} autoComplete="email" aria-invalid={Boolean(fieldErrors.correoInstitucional)} />
                      </FloatingField>
                      <FloatingField label="Correo Personal" error={fieldErrors.correoAlternativo} hint="Opcional y diferente del correo institucional.">
                        <input className="wizard-field" style={fieldStyle} type="email" value={form.correoAlternativo} onChange={set('correoAlternativo')} placeholder="correo@personal.com" maxLength={150} aria-invalid={Boolean(fieldErrors.correoAlternativo)} />
                      </FloatingField>
                    </div>
                  </div>

                  <div>
                    <SectionHeader title="Teléfono" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Teléfono / Celular" error={fieldErrors.telefono} hint="Entre 7 y 15 dígitos; no admite letras ni símbolos.">
                        <input className="wizard-field" style={fieldStyle} value={form.telefono} onChange={(e) => setValue('telefono', sanitizeManualPhone(e.target.value))} placeholder="Ej: 3001234567" inputMode="numeric" maxLength={15} aria-invalid={Boolean(fieldErrors.telefono)} />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Visual tip */}
                  <div style={{ padding: '14px 18px', borderRadius: 12, background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Sparkles size={18} color="#0284c7" style={{ marginTop: 1, flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 600, color: '#0369a1' }}>Consejo</p>
                      <p style={{ margin: '3px 0 0', fontSize: '0.73rem', color: '#0c4a6e', lineHeight: 1.5 }}>
                        El correo institucional (@esap.edu.co) se usa para las notificaciones del sistema, invitaciones OTP y la gestión de autoservicio del docente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ STEP 3: Personal ═══ */}
              {activeStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <SectionHeader title="Datos Personales" description="Información demográfica del docente" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Género" required error={fieldErrors.genero}>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.genero} onChange={set('genero')} aria-invalid={Boolean(fieldErrors.genero)}>
                          <option value="">Seleccionar...</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                          <option value="No Binario">No Binario</option>
                          <option value="Prefiero no indicar">Prefiero no indicar</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Sexo Biológico">
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.sexoBiologico} onChange={set('sexoBiologico')}>
                          <option value="">Seleccionar...</option>
                          <option value="Hombre">Hombre</option>
                          <option value="Mujer">Mujer</option>
                          <option value="Intersexual">Intersexual</option>
                          <option value="Otro">Otro</option>
                          <option value="Prefiero no indicar">Prefiero no indicar</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Fecha de Nacimiento" required error={fieldErrors.fechaNacimiento}>
                        <input className="wizard-field" style={fieldStyle} type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} max={new Date().toISOString().slice(0, 10)} aria-invalid={Boolean(fieldErrors.fechaNacimiento)} />
                      </FloatingField>
                      <FloatingField label="Edad" hint="Calculada automáticamente desde la fecha de nacimiento.">
                        <input className="wizard-field" style={{ ...fieldStyle, background: '#f1f5f9', color: '#475569' }} value={computeManualAge(form.fechaNacimiento) ?? ''} readOnly />
                      </FloatingField>
                      <FloatingField label="Rango de Edad" hint="Calculado automáticamente para mantener consistencia.">
                        <input className="wizard-field" style={{ ...fieldStyle, background: '#f1f5f9', color: '#475569' }} value={computeManualAgeRange(computeManualAge(form.fechaNacimiento))} readOnly />
                      </FloatingField>
                      <FloatingField label="ID RUND" hint={isEditing ? 'Identificador interno generado por el sistema.' : 'Se generará automáticamente al guardar.'}>
                        <input className="wizard-field" style={{ ...fieldStyle, background: '#f1f5f9', color: '#475569' }} value={form.idRund || 'Pendiente de generación'} readOnly />
                      </FloatingField>
                    </div>
                  </div>

                  {isEditing && (
                    <div>
                      <SectionHeader title="Soporte de la Edición" description="Obligatorio para garantizar soporte y trazabilidad del cambio" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <FloatingField label="Soporte Documental" required error={fieldErrors.soporteEdicion} hint="PDF, JPG o PNG; máximo 10 MB.">
                          <label style={{ ...fieldStyle, minHeight: 42, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', borderColor: fieldErrors.soporteEdicion ? '#ef4444' : '#e2e8f0' }}>
                            <Upload size={15} color="#64748b" />
                            <span style={{ color: supportFile ? '#0f172a' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {supportFile?.name || 'Seleccionar archivo de soporte'}
                            </span>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleSupportFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                          </label>
                        </FloatingField>
                        <FloatingField label="Justificación de la Edición" required error={fieldErrors.justificacionEdicion}>
                          <textarea className="wizard-field wizard-textarea" style={fieldStyle} value={form.justificacionEdicion} onChange={set('justificacionEdicion')} placeholder="Indique por qué se modifica el perfil" maxLength={500} aria-invalid={Boolean(fieldErrors.justificacionEdicion)} />
                        </FloatingField>
                      </div>
                    </div>
                  )}

                  {/* Summary card */}
                  <div style={{ padding: '18px 20px', borderRadius: 14, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <CheckCircle2 size={18} color="#16a34a" />
                      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#15803d' }}>Resumen del registro</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { l: 'Nombre', v: form.nombreCompleto },
                        { l: 'Documento', v: `${form.tipo_identificacion} ${form.documento_identidad}` },
                        { l: 'Territorial', v: form.territorialNombre },
                        { l: 'Vinculación', v: form.tipoVinculacion },
                        { l: 'Dedicación', v: form.dedicacion },
                        { l: 'Correo', v: form.correoInstitucional },
                      ].map((item) => (
                        <div key={item.l} style={{ fontSize: '0.73rem' }}>
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>{item.l}: </span>
                          <span style={{ color: '#166534' }}>{item.v || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ─── Footer ──────────────────────────────────────────── */}
          <div style={{ padding: '14px 28px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafbfc' }}>
            <div>
              {activeStep > 0 && (
                <button
                  className="wizard-nav-btn"
                  onClick={() => goToStep((activeStep - 1) as Step)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#475569', fontWeight: 600, transition: 'all 0.2s' }}
                >
                  <ChevronLeft size={15} />
                  Anterior
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={onClose}
                className="wizard-nav-btn"
                style={{ padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}
              >
                Cancelar
              </button>

              {isLastStep ? (
                <button
                  className="wizard-nav-btn"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none',
                    background: saving ? '#94a3b8' : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 700,
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(22,163,74,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  <Save size={15} />
                  {saving ? 'Guardando...' : 'Guardar Docente'}
                </button>
              ) : (
                <button
                  className="wizard-nav-btn"
                  onClick={handleNext}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 10, border: 'none',
                    background: currentStep.gradient,
                    color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                    boxShadow: `0 4px 14px ${currentStep.color}40`,
                    transition: 'all 0.2s',
                  }}
                >
                  Siguiente
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
