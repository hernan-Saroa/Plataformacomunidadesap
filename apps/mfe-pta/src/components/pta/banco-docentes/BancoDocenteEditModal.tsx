import { useState, useEffect, useCallback } from 'react';
import { X, Save, User, Briefcase, GraduationCap, Mail, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { createBancoDocente, updateBancoDocente } from '../../../services/api/ptaApi';

interface Props {
  docente: any | null;
  onClose: () => void;
  onSaved: () => void;
}

const TERRITORIALES = [
  'Sede Central', 'Antioquia', 'Atlántico', 'Bogotá D.C.', 'Bolívar-Córdoba-Sucre',
  'Boyacá-Casanare', 'Cauca-Nariño', 'Cesar-La Guajira', 'Chocó',
  'Cundinamarca-Meta', 'Huila-Caquetá', 'Magdalena', 'Norte de Santander',
  'Quindío-Risaralda-Caldas', 'Santander', 'Tolima', 'Valle del Cauca-Cauca',
];

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

function FloatingField({ label, children, required, hint, fullWidth }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string; fullWidth?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: 4 }}>
        {label}
        {required && <span style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 700 }}>●</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: -2 }}>{hint}</span>}
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

export function BancoDocenteEditModal({ docente, onClose, onSaved }: Props) {
  const [activeStep, setActiveStep] = useState<Step>(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedSteps, setTouchedSteps] = useState<Set<number>>(new Set([0]));

  const [form, setForm] = useState({
    nombreCompleto: '',
    documento_identidad: '',
    tipo_identificacion: 'CC',
    territorialNombre: '',
    cetapNombre: '',
    tipoVinculacion: 'OCASIONAL',
    dedicacion: 'TC',
    escalafon: '',
    origenVinculacion: '',
    actoAdministrativoVinculacion: '',
    decretoVinculacion: '',
    puntajeSalarial: '',
    situacionAdministrativa: '',
    ultimaEvaluacion: '',
    fechaInicioVinculacion: '',
    fechaFinVinculacion: '',
    observaciones: '',
    nivelFormacion: '',
    perfilAcademicoPro: '',
    perfilAcademico: '',
    nucleoTematico: '',
    programaPrincipal: '',
    pregrado: '',
    especializacion: '',
    maestria: '',
    doctorado: '',
    posDoctorado: '',
    investigacion: '',
    clasificacionColciencias: '',
    correoInstitucional: '',
    correoAlternativo: '',
    telefono: '',
    genero: '',
    fechaNacimiento: '',
  });

  useEffect(() => {
    if (docente) {
      setForm({
        nombreCompleto: docente.nombre_completo || '',
        documento_identidad: docente.documento_identidad || '',
        tipo_identificacion: docente.tipo_documento || 'CC',
        territorialNombre: docente.territorial || '',
        cetapNombre: docente.cetapNombre || docente.cetap_nombre || '',
        tipoVinculacion: docente.vinculacion_codigo || 'OCASIONAL',
        dedicacion: docente.dedicacion_codigo || 'TC',
        escalafon: docente.categoria || '',
        origenVinculacion: docente.origen_vinculacion || '',
        actoAdministrativoVinculacion: docente.acto_administrativo_vinculacion || '',
        decretoVinculacion: docente.decreto_vinculacion || '',
        puntajeSalarial: docente.puntaje_salarial?.toString() || '',
        situacionAdministrativa: docente.situacion_administrativa || '',
        ultimaEvaluacion: docente.ultima_evaluacion || '',
        fechaInicioVinculacion: docente.inicio_vinculacion ? docente.inicio_vinculacion.split('T')[0] : '',
        fechaFinVinculacion: docente.fin_vinculacion ? docente.fin_vinculacion.split('T')[0] : '',
        observaciones: docente.observaciones || '',
        nivelFormacion: docente.nivel_formacion || '',
        perfilAcademicoPro: docente.perfil_academico_pro || '',
        perfilAcademico: docente.perfil_academico || '',
        nucleoTematico: docente.nucleo_tematico || '',
        programaPrincipal: docente.programa_principal || '',
        pregrado: docente.pregrado || '',
        especializacion: docente.especializacion || '',
        maestria: docente.maestria || '',
        doctorado: docente.doctorado || '',
        posDoctorado: docente.posdoctorado || '',
        investigacion: docente.investigacion || '',
        clasificacionColciencias: docente.clasificacion_colciencias || '',
        correoInstitucional: docente.correo_institucional || '',
        correoAlternativo: docente.correo_personal || '',
        telefono: docente.telefono || '',
        genero: docente.genero || '',
        fechaNacimiento: docente.nacimiento ? docente.nacimiento.split('T')[0] : '',
      });
    }
  }, [docente]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Step progress calculation
  const getStepProgress = useCallback((step: number): number => {
    const fieldsByStep: Record<number, string[]> = {
      0: ['documento_identidad', 'nombreCompleto', 'territorialNombre', 'tipoVinculacion', 'dedicacion'],
      1: ['nivelFormacion', 'pregrado'],
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

  const handleSave = async () => {
    setError(null);
    if (!form.documento_identidad) { setError('El número de documento es obligatorio'); goToStep(0); return; }
    if (!form.nombreCompleto) { setError('El nombre completo es obligatorio'); goToStep(0); return; }
    if (!form.territorialNombre) { setError('La territorial es obligatoria'); goToStep(0); return; }

    if (form.correoInstitucional && !form.correoInstitucional.toLowerCase().endsWith('@esap.edu.co')) {
      setError('El correo institucional debe terminar en @esap.edu.co');
      goToStep(2);
      return;
    }
    const esVinculacionVisitante = form.tipoVinculacion === 'VISITANTE';
    const esCategoriaVisitante = form.escalafon?.toLowerCase().trim() === 'visitante';
    if (esVinculacionVisitante !== esCategoriaVisitante) {
      setError('Si la vinculación es Visitante, la categoría/escalafón debe ser Visitante (y viceversa).');
      goToStep(0);
      return;
    }

    setSaving(true);
    const payload = {
      documentNumber: form.documento_identidad,
      nombreCompleto: form.nombreCompleto,
      tipo_identificacion: form.tipo_identificacion,
      territorialNombre: form.territorialNombre,
      cetapNombre: form.cetapNombre || null,
      tipoVinculacion: form.tipoVinculacion,
      dedicacion: form.dedicacion,
      escalafon: form.escalafon || null,
      origenVinculacion: form.origenVinculacion || null,
      actoAdministrativoVinculacion: form.actoAdministrativoVinculacion || null,
      decretoVinculacion: form.decretoVinculacion || null,
      puntajeSalarial: form.puntajeSalarial ? parseFloat(form.puntajeSalarial) : null,
      situacionAdministrativa: form.situacionAdministrativa || null,
      ultimaEvaluacion: form.ultimaEvaluacion || null,
      fechaInicioVinculacion: form.fechaInicioVinculacion || null,
      fechaFinVinculacion: form.fechaFinVinculacion || null,
      observaciones: form.observaciones || null,
      nivelFormacion: form.nivelFormacion || null,
      perfilAcademicoPro: form.perfilAcademicoPro || null,
      perfilAcademico: form.perfilAcademico || null,
      nucleoTematico: form.nucleoTematico || null,
      programaPrincipal: form.programaPrincipal || null,
      pregrado: form.pregrado || null,
      especializacion: form.especializacion || null,
      maestria: form.maestria || null,
      doctorado: form.doctorado || null,
      posDoctorado: form.posDoctorado || null,
      investigacion: form.investigacion || null,
      clasificacionColciencias: form.clasificacionColciencias || null,
      correoInstitucional: form.correoInstitucional || null,
      correoAlternativo: form.correoAlternativo || null,
      telefono: form.telefono || null,
      genero: form.genero || null,
      fechaNacimiento: form.fechaNacimiento || null,
      canal_origen: 'MODAL', // §4 / §6 — Auditoría del canal de alta
    };

    const res = docente?.id
      ? await updateBancoDocente(docente.id, payload)
      : await createBancoDocente(payload);

    setSaving(false);
    if (res.success) {
      onSaved();
    } else {
      setError((res as any).message || 'Error al guardar el docente');
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
                  onClick={() => goToStep(i as Step)}
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
                      <FloatingField label="Documento de Identidad" required>
                        <input className="wizard-field" style={fieldStyle} value={form.documento_identidad} onChange={set('documento_identidad')} placeholder="Ej: 12345678" disabled={!!docente?.id} />
                      </FloatingField>
                      <FloatingField label="Tipo de Documento">
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.tipo_identificacion} onChange={set('tipo_identificacion')}>
                          <option value="CC">Cédula de Ciudadanía</option>
                          <option value="CE">Cédula de Extranjería</option>
                          <option value="PA">Pasaporte</option>
                          <option value="NIT">NIT</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Nombre Completo" required fullWidth>
                        <input className="wizard-field" style={fieldStyle} value={form.nombreCompleto} onChange={set('nombreCompleto')} placeholder="Ej: María Fernanda López García" />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Contract group */}
                  <div>
                    <SectionHeader title="Contrato y Adscripción" description="Tipo de vinculación, dedicación y territorial" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Territorial" required>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.territorialNombre} onChange={set('territorialNombre')}>
                          <option value="">Seleccionar...</option>
                          {TERRITORIALES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </FloatingField>
                      <FloatingField label="Tipo de Vinculación" required>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.tipoVinculacion} onChange={set('tipoVinculacion')}>
                          <option value="OCASIONAL">Ocasional</option>
                          <option value="CARRERA">Carrera</option>
                          <option value="CATEDRA">Hora Cátedra</option>
                          <option value="VISITANTE">Visitante</option>
                          <option value="ESPECIAL">Especial</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Dedicación" required>
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.dedicacion} onChange={set('dedicacion')}>
                          <option value="TC">Tiempo Completo (800h)</option>
                          <option value="MT">Medio Tiempo (400h)</option>
                          <option value="HC">Hora Cátedra (0h)</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Decreto / Acuerdo" hint="Ej: 2400/1968, 1279/2002, 003/2018">
                        <input className="wizard-field" style={fieldStyle} value={form.decretoVinculacion} onChange={set('decretoVinculacion')} placeholder="Decreto o acuerdo normativo" />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Classification */}
                  <div>
                    <SectionHeader title="Clasificación y Remuneración" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Categoría / Escalafón">
                        <input className="wizard-field" style={fieldStyle} value={form.escalafon} onChange={set('escalafon')} placeholder="Ej: Asociado, Titular..." />
                      </FloatingField>
                      <FloatingField label="Puntaje Salarial">
                        <input className="wizard-field" style={fieldStyle} type="number" value={form.puntajeSalarial} onChange={set('puntajeSalarial')} placeholder="Ej: 145.5" />
                      </FloatingField>
                      <FloatingField label="Origen de Vinculación">
                        <input className="wizard-field" style={fieldStyle} value={form.origenVinculacion} onChange={set('origenVinculacion')} placeholder="Fuente de vinculación" />
                      </FloatingField>
                      <FloatingField label="Acto Administrativo">
                        <input className="wizard-field" style={fieldStyle} value={form.actoAdministrativoVinculacion} onChange={set('actoAdministrativoVinculacion')} placeholder="Resolución o acto" />
                      </FloatingField>
                    </div>
                  </div>

                  {/* Dates & Status */}
                  <div>
                    <SectionHeader title="Fechas y Situación" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Inicio Vinculación">
                        <input className="wizard-field" style={fieldStyle} type="date" value={form.fechaInicioVinculacion} onChange={set('fechaInicioVinculacion')} />
                      </FloatingField>
                      <FloatingField label="Fin Vinculación">
                        <input className="wizard-field" style={fieldStyle} type="date" value={form.fechaFinVinculacion} onChange={set('fechaFinVinculacion')} />
                      </FloatingField>
                      <FloatingField label="Situación Administrativa">
                        <input className="wizard-field" style={fieldStyle} value={form.situacionAdministrativa} onChange={set('situacionAdministrativa')} placeholder="Ej: Activo, Comisión, Licencia..." />
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
                      <FloatingField label="Nivel de Formación">
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.nivelFormacion} onChange={set('nivelFormacion')}>
                          <option value="">Seleccionar...</option>
                          <option value="Pregrado">Pregrado</option>
                          <option value="Especialización">Especialización</option>
                          <option value="Maestría">Maestría</option>
                          <option value="Doctorado">Doctorado</option>
                          <option value="Posdoctorado">Posdoctorado</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Programa Principal" hint="Programa al que está adscrito">
                        <input className="wizard-field" style={fieldStyle} value={form.programaPrincipal} onChange={set('programaPrincipal')} placeholder="Ej: Administración Pública" />
                      </FloatingField>
                      <FloatingField label="Núcleo Temático">
                        <input className="wizard-field" style={fieldStyle} value={form.nucleoTematico} onChange={set('nucleoTematico')} placeholder="Área temática principal" />
                      </FloatingField>
                      <FloatingField label="Perfil Académico PRO">
                        <input className="wizard-field" style={fieldStyle} value={form.perfilAcademicoPro} onChange={set('perfilAcademicoPro')} placeholder="Perfil profesional" />
                      </FloatingField>
                      <FloatingField label="Perfil Académico" fullWidth>
                        <input className="wizard-field" style={fieldStyle} value={form.perfilAcademico} onChange={set('perfilAcademico')} placeholder="Descripción del perfil académico" />
                      </FloatingField>
                    </div>
                  </div>

                  <div>
                    <SectionHeader title="Títulos Obtenidos" description="Detalle de formación por nivel" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Pregrado">
                        <input className="wizard-field" style={fieldStyle} value={form.pregrado} onChange={set('pregrado')} placeholder="Título de pregrado" />
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
                    <SectionHeader title="Investigación" description="Actividad investigativa y clasificación" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Grupo / Actividad de Investigación">
                        <input className="wizard-field" style={fieldStyle} value={form.investigacion} onChange={set('investigacion')} placeholder="Nombre del grupo de investigación" />
                      </FloatingField>
                      <FloatingField label="Clasificación Colciencias">
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.clasificacionColciencias} onChange={set('clasificacionColciencias')}>
                          <option value="">Sin clasificación</option>
                          <option value="A1">A1 — Excelencia</option>
                          <option value="A">A — Alto nivel</option>
                          <option value="B">B — Consolidado</option>
                          <option value="C">C — En formación</option>
                          <option value="Reconocido">Reconocido</option>
                        </select>
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
                      <FloatingField label="Correo Institucional" required hint="Debe ser @esap.edu.co">
                        <input className="wizard-field" style={fieldStyle} type="email" value={form.correoInstitucional} onChange={set('correoInstitucional')} placeholder="nombre@esap.edu.co" />
                      </FloatingField>
                      <FloatingField label="Correo Personal" hint="Correo alternativo (opcional)">
                        <input className="wizard-field" style={fieldStyle} type="email" value={form.correoAlternativo} onChange={set('correoAlternativo')} placeholder="correo@personal.com" />
                      </FloatingField>
                    </div>
                  </div>

                  <div>
                    <SectionHeader title="Teléfono" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <FloatingField label="Teléfono / Celular" hint="Número de contacto principal">
                        <input className="wizard-field" style={fieldStyle} value={form.telefono} onChange={set('telefono')} placeholder="Ej: 3001234567" />
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
                      <FloatingField label="Género">
                        <select className="wizard-field wizard-select" style={fieldStyle} value={form.genero} onChange={set('genero')}>
                          <option value="">Seleccionar...</option>
                          <option value="Masculino">Masculino</option>
                          <option value="Femenino">Femenino</option>
                          <option value="No Binario">No Binario</option>
                          <option value="Prefiero no indicar">Prefiero no indicar</option>
                        </select>
                      </FloatingField>
                      <FloatingField label="Fecha de Nacimiento">
                        <input className="wizard-field" style={fieldStyle} type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} />
                      </FloatingField>
                    </div>
                  </div>

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
                  onClick={() => goToStep((activeStep + 1) as Step)}
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
