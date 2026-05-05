import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Loader2,
  ClipboardList,
  GraduationCap,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseService } from '../../services/api/supabase.service';
import { OFFICIAL_TERRITORIALES_ESAP } from '../../../shared/territoriales-cetaps-esap';
import {
  cleanBancoDocenteText,
  computeBancoDocenteAge,
  computeBancoDocenteAgeRange,
  formatBancoDocenteInputDate,
  getBancoDocenteDedicacionLabel,
  getBancoDocenteVinculacionLabel,
  normalizeBancoDocenteDedicacionCode,
  normalizeBancoDocenteVinculacionCode,
  resolveBancoDocenteHours,
} from '../../utils/bancoDocentesUi';

interface BancoDocenteEditModalProps {
  isOpen: boolean;
  docente: any | null;
  onClose: () => void;
  onSaved?: () => void;
}

type FormState = {
  documentoIdentidad: string;
  vinculacion: string;
  territorial: string;
  categoria: string;
  dedicacion: string;
  nucleoTematico: string;
  nivelFormacion: string;
  perfilAcademico: string;
  pregrado: string;
  especializacion: string;
  maestria: string;
  doctorado: string;
  posdoctorado: string;
  investigacion: string;
  origenVinculacion: string;
  actoAdministrativoVinculacion: string;
  correoInstitucional: string;
  correoPersonal: string;
  telefono: string;
  ultimaEvaluacion: string;
  situacionAdministrativa: string;
  inicioVinculacion: string;
  finVinculacion: string;
  puntajeSalarial: string;
  genero: string;
  nacimiento: string;
  edad: string;
  rangoEdad: string;
};

const STEPS = [
  {
    key: 'banco',
    title: 'Banco de Docentes',
    subtitle: 'Identificacion y clasificacion',
    description: 'Campos base del banco: documento, vinculacion, territorial, categoria y dedicacion.',
    icon: ClipboardList,
  },
  {
    key: 'perfil',
    title: 'Perfil Academico',
    subtitle: 'Formacion y experticia',
    description: 'Informacion academica visible en la ficha del docente dentro del banco.',
    icon: GraduationCap,
  },
  {
    key: 'contacto',
    title: 'Vinculacion y Contacto',
    subtitle: 'Seguimiento complementario',
    description: 'Datos administrativos, correos, fechas y seguimiento del docente.',
    icon: FileText,
  },
] as const;

const BASE_VINCULACION_OPTIONS = [
  { value: 'CARRERA', label: 'Carrera' },
  { value: 'OCASIONAL', label: 'Ocasional' },
  { value: 'CATEDRA', label: 'Hora Catedra' },
  { value: 'VISITANTE', label: 'Visitante' },
  { value: 'ESPECIAL', label: 'Especial' },
];

const BASE_DEDICACION_OPTIONS = [
  { value: 'TC', label: 'Tiempo Completo' },
  { value: 'MT', label: 'Medio Tiempo' },
];

const GENERO_OPTIONS = ['Masculino', 'Femenino', 'No binario', 'Prefiero no decirlo', 'Otro'];

const inputCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all focus:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15';
const readOnlyCls = `${inputCls} bg-gray-50 text-gray-500`;
const textAreaCls = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all focus:border-[#003DA5] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 resize-y min-h-[92px]';

function buildFullName(docente: any): string {
  const banco = docente?.banco_docente || docente?.docente?.banco_docente || {};
  const parts = [
    cleanBancoDocenteText(docente?.primer_nombre),
    cleanBancoDocenteText(docente?.segundo_nombre),
    cleanBancoDocenteText(docente?.primer_apellido),
    cleanBancoDocenteText(docente?.segundo_apellido),
  ].filter(Boolean);

  return (
    cleanBancoDocenteText(banco?.nombre_completo) ||
    parts.join(' ') ||
    cleanBancoDocenteText(docente?.nombre) ||
    cleanBancoDocenteText(docente?.nombre_completo) ||
    'Docente sin nombre'
  );
}

function buildInitialForm(docente: any): FormState {
  const banco = docente?.banco_docente || docente?.docente?.banco_docente || {};
  const nacimiento = formatBancoDocenteInputDate(banco?.nacimiento || docente?.fecha_nacimiento);
  const edad = computeBancoDocenteAge(nacimiento || banco?.nacimiento || docente?.fecha_nacimiento, banco?.edad);
  const rangoEdad = computeBancoDocenteAgeRange(edad, banco?.rango_edad);

  return {
    documentoIdentidad: cleanBancoDocenteText(banco?.documento_identidad || docente?.identificacion || docente?.documento || docente?.document) || '',
    vinculacion: normalizeBancoDocenteVinculacionCode(banco?.vinculacion || docente?.tipoVinculacion || docente?.tipoVinculacion_label),
    territorial: cleanBancoDocenteText(banco?.territorial || docente?.territorial_nombre || docente?.territorial?.nombre) || '',
    categoria: cleanBancoDocenteText(banco?.categoria || docente?.categoria_escalafon || docente?.escalafon) || '',
    dedicacion: normalizeBancoDocenteDedicacionCode(banco?.dedicacion || docente?.dedicacion_label || docente?.dedicacion),
    nucleoTematico: cleanBancoDocenteText(banco?.nucleo_tematico) || '',
    nivelFormacion: cleanBancoDocenteText(banco?.nivel_formacion) || '',
    perfilAcademico: cleanBancoDocenteText(banco?.perfil_academico) || '',
    pregrado: cleanBancoDocenteText(banco?.pregrado) || '',
    especializacion: cleanBancoDocenteText(banco?.especializacion) || '',
    maestria: cleanBancoDocenteText(banco?.maestria) || '',
    doctorado: cleanBancoDocenteText(banco?.doctorado) || '',
    posdoctorado: cleanBancoDocenteText(banco?.posdoctorado) || '',
    investigacion: cleanBancoDocenteText(banco?.investigacion) || '',
    origenVinculacion: cleanBancoDocenteText(banco?.origen_vinculacion) || '',
    actoAdministrativoVinculacion: cleanBancoDocenteText(banco?.acto_administrativo_vinculacion) || '',
    correoInstitucional: cleanBancoDocenteText(banco?.correo_institucional || docente?.correo_institucional || docente?.email) || '',
    correoPersonal: cleanBancoDocenteText(banco?.correo_personal || docente?.correo_alternativo) || '',
    telefono: cleanBancoDocenteText(banco?.telefono || docente?.telefono || docente?.phone) || '',
    ultimaEvaluacion: cleanBancoDocenteText(banco?.ultima_evaluacion) || '',
    situacionAdministrativa: cleanBancoDocenteText(banco?.situacion_administrativa) || '',
    inicioVinculacion: formatBancoDocenteInputDate(banco?.inicio_vinculacion),
    finVinculacion: formatBancoDocenteInputDate(banco?.fin_vinculacion),
    puntajeSalarial: cleanBancoDocenteText(banco?.puntaje_salarial) || '',
    genero: cleanBancoDocenteText(banco?.genero || docente?.genero) || '',
    nacimiento,
    edad: edad !== null ? String(edad) : '',
    rangoEdad: rangoEdad || '',
  };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function BancoDocenteEditModal({
  isOpen,
  docente,
  onClose,
  onSaved,
}: BancoDocenteEditModalProps) {
  const [form, setForm] = useState<FormState>(() => buildInitialForm(docente));
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialForm(docente));
      setCurrentStep(0);
    }
  }, [docente, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentStep, isOpen]);

  const nombreCompleto = useMemo(() => buildFullName(docente), [docente]);
  const edadCalculada = useMemo(
    () => computeBancoDocenteAge(form.nacimiento, form.edad),
    [form.nacimiento, form.edad],
  );
  const rangoEdadCalculado = useMemo(
    () => computeBancoDocenteAgeRange(edadCalculada, form.rangoEdad),
    [edadCalculada, form.rangoEdad],
  );
  const vinculacionOptions = useMemo(() => {
    const currentValue = normalizeBancoDocenteVinculacionCode(form.vinculacion);
    if (!currentValue || BASE_VINCULACION_OPTIONS.some((option) => option.value === currentValue)) {
      return BASE_VINCULACION_OPTIONS;
    }

    return [
      { value: currentValue, label: currentValue },
      ...BASE_VINCULACION_OPTIONS,
    ];
  }, [form.vinculacion]);
  const dedicacionOptions = useMemo(() => {
    const currentValue = normalizeBancoDocenteDedicacionCode(form.dedicacion);
    if (!currentValue || BASE_DEDICACION_OPTIONS.some((option) => option.value === currentValue)) {
      return BASE_DEDICACION_OPTIONS;
    }

    return [
      { value: currentValue, label: currentValue },
      ...BASE_DEDICACION_OPTIONS,
    ];
  }, [form.dedicacion]);
  const territorialOptions = useMemo(() => {
    const currentValue = form.territorial.trim();
    if (!currentValue || OFFICIAL_TERRITORIALES_ESAP.some((territorial) => territorial.nombre === currentValue)) {
      return OFFICIAL_TERRITORIALES_ESAP.map((territorial) => ({
        value: territorial.nombre,
        label: territorial.nombre,
      }));
    }

    return [
      { value: currentValue, label: currentValue },
      ...OFFICIAL_TERRITORIALES_ESAP.map((territorial) => ({
        value: territorial.nombre,
        label: territorial.nombre,
      })),
    ];
  }, [form.territorial]);
  const generoOptions = useMemo(() => {
    const currentValue = cleanBancoDocenteText(form.genero);
    if (!currentValue || GENERO_OPTIONS.includes(currentValue)) {
      return GENERO_OPTIONS;
    }

    return [currentValue, ...GENERO_OPTIONS];
  }, [form.genero]);
  const currentStepMeta = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  if (!isOpen || !docente || typeof document === 'undefined') return null;

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateBancoStep = () => {
    if (!form.documentoIdentidad.trim()) {
      toast.error('El documento de identidad es obligatorio');
      return false;
    }
    if (!form.vinculacion.trim()) {
      toast.error('La vinculacion es obligatoria');
      return false;
    }
    if (!form.territorial.trim()) {
      toast.error('La territorial es obligatoria');
      return false;
    }
    if (!form.dedicacion.trim()) {
      toast.error('La dedicacion es obligatoria');
      return false;
    }
    return true;
  };

  const validateStep = (stepIndex: number) => {
    if (STEPS[stepIndex]?.key === 'banco') {
      return validateBancoStep();
    }

    return true;
  };

  const handleStepChange = (targetStep: number) => {
    if (targetStep === currentStep) return;
    if (targetStep > currentStep && !validateStep(currentStep)) return;
    setCurrentStep(targetStep);
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  };

  const handlePrevious = () => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateBancoStep()) return;

    setIsSaving(true);
    try {
      const vinculacionCode = normalizeBancoDocenteVinculacionCode(form.vinculacion);
      const dedicacionCode = normalizeBancoDocenteDedicacionCode(form.dedicacion);
      const payload = {
        identificacion: form.documentoIdentidad.trim(),
        documentNumber: form.documentoIdentidad.trim(),
        tipoVinculacion: vinculacionCode,
        vinculacion: getBancoDocenteVinculacionLabel(vinculacionCode),
        dedicacion: dedicacionCode,
        dedicacionLabel: getBancoDocenteDedicacionLabel(dedicacionCode),
        horasAsignables: resolveBancoDocenteHours(dedicacionCode),
        territorial: form.territorial.trim(),
        territorialNombre: form.territorial.trim(),
        escalafon: form.categoria.trim(),
        categoriaEscalafon: form.categoria.trim(),
        nucleoTematico: form.nucleoTematico.trim(),
        nivelFormacion: form.nivelFormacion.trim(),
        perfilAcademico: form.perfilAcademico.trim(),
        pregrado: form.pregrado.trim(),
        especializacion: form.especializacion.trim(),
        maestria: form.maestria.trim(),
        doctorado: form.doctorado.trim(),
        posDoctorado: form.posdoctorado.trim(),
        investigacion: form.investigacion.trim(),
        origenVinculacion: form.origenVinculacion.trim(),
        actoAdministrativoVinculacion: form.actoAdministrativoVinculacion.trim(),
        email: form.correoInstitucional.trim(),
        correo_alternativo: form.correoPersonal.trim(),
        telefono: form.telefono.trim(),
        ultimaEvaluacion: form.ultimaEvaluacion.trim(),
        situacionAdministrativa: form.situacionAdministrativa.trim(),
        fechaInicioVinculacion: form.inicioVinculacion || null,
        fechaFinVinculacion: form.finVinculacion || null,
        puntajeSalarial: form.puntajeSalarial.trim(),
        genero: form.genero.trim(),
        fecha_nacimiento: form.nacimiento || null,
        fechaNacimiento: form.nacimiento || null,
        edad: edadCalculada !== null ? String(edadCalculada) : '',
        rangoEdad: rangoEdadCalculado || '',
      };

      const result = await supabaseService.personas.update(String(docente.id), payload);
      if (result?.success === false) {
        throw new Error(result?.message || result?.error || 'No se pudo actualizar el docente');
      }

      toast.success('Docente actualizado', {
        description: `${nombreCompleto} fue actualizado correctamente en Banco de Docentes.`,
      });

      onSaved?.();
      onClose();
    } catch (error: any) {
      toast.error('Error al actualizar docente', {
        description: error?.message || 'No fue posible guardar los cambios.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderBancoStep = () => (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Documento de identidad">
          <input
            value={form.documentoIdentidad}
            onChange={(event) => handleChange('documentoIdentidad', event.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Vinculacion">
          <select
            value={form.vinculacion}
            onChange={(event) => handleChange('vinculacion', event.target.value)}
            className={inputCls}
          >
            {vinculacionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Territorial">
          <select
            value={form.territorial}
            onChange={(event) => handleChange('territorial', event.target.value)}
            className={inputCls}
          >
            <option value="">Seleccionar territorial</option>
            {territorialOptions.map((territorial) => (
              <option key={territorial.value} value={territorial.value}>
                {territorial.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Categoria">
          <input
            value={form.categoria}
            onChange={(event) => handleChange('categoria', event.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Dedicacion" hint={`Horas derivadas: ${resolveBancoDocenteHours(form.dedicacion)}h`}>
          <select
            value={form.dedicacion}
            onChange={(event) => handleChange('dedicacion', event.target.value)}
            className={inputCls}
          >
            {dedicacionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Nucleo tematico">
            <textarea
              value={form.nucleoTematico}
              onChange={(event) => handleChange('nucleoTematico', event.target.value)}
              className={textAreaCls}
            />
          </Field>
        </div>
      </div>
    </section>
  );

  const renderPerfilStep = () => (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nivel de formacion">
            <input
              value={form.nivelFormacion}
              onChange={(event) => handleChange('nivelFormacion', event.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Perfil academico">
              <textarea
                value={form.perfilAcademico}
                onChange={(event) => handleChange('perfilAcademico', event.target.value)}
                className={textAreaCls}
              />
            </Field>
          </div>
          <Field label="Pregrado">
            <input
              value={form.pregrado}
              onChange={(event) => handleChange('pregrado', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Especializacion">
            <input
              value={form.especializacion}
              onChange={(event) => handleChange('especializacion', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Maestria">
            <input
              value={form.maestria}
              onChange={(event) => handleChange('maestria', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Doctorado">
            <input
              value={form.doctorado}
              onChange={(event) => handleChange('doctorado', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Posdoctorado">
            <input
              value={form.posdoctorado}
              onChange={(event) => handleChange('posdoctorado', event.target.value)}
              className={inputCls}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Investigacion 2025">
              <textarea
                value={form.investigacion}
                onChange={(event) => handleChange('investigacion', event.target.value)}
                className={textAreaCls}
              />
            </Field>
          </div>
        </div>
      </section>
    </div>
  );

  const renderContactoStep = () => (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Field label="Origen de vinculacion">
              <textarea
                value={form.origenVinculacion}
                onChange={(event) => handleChange('origenVinculacion', event.target.value)}
                className={textAreaCls}
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Acto administrativo de vinculacion">
              <textarea
                value={form.actoAdministrativoVinculacion}
                onChange={(event) => handleChange('actoAdministrativoVinculacion', event.target.value)}
                className={textAreaCls}
              />
            </Field>
          </div>

          <Field label="Correo institucional">
            <input
              type="email"
              value={form.correoInstitucional}
              onChange={(event) => handleChange('correoInstitucional', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Correo personal">
            <input
              type="email"
              value={form.correoPersonal}
              onChange={(event) => handleChange('correoPersonal', event.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Telefono">
            <input
              value={form.telefono}
              onChange={(event) => handleChange('telefono', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Ultima evaluacion">
            <input
              value={form.ultimaEvaluacion}
              onChange={(event) => handleChange('ultimaEvaluacion', event.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Situacion administrativa">
            <input
              value={form.situacionAdministrativa}
              onChange={(event) => handleChange('situacionAdministrativa', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Puntaje salarial">
            <input
              value={form.puntajeSalarial}
              onChange={(event) => handleChange('puntajeSalarial', event.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Inicio de vinculacion">
            <input
              type="date"
              value={form.inicioVinculacion}
              onChange={(event) => handleChange('inicioVinculacion', event.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Fin de vinculacion">
            <input
              type="date"
              value={form.finVinculacion}
              onChange={(event) => handleChange('finVinculacion', event.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Genero">
            <select value={form.genero} onChange={(event) => handleChange('genero', event.target.value)} className={inputCls}>
              <option value="">Seleccionar genero</option>
              {generoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nacimiento">
            <input
              type="date"
              value={form.nacimiento}
              onChange={(event) => handleChange('nacimiento', event.target.value)}
              className={inputCls}
            />
          </Field>

          <Field label="Edad" hint="Calculada desde la fecha de nacimiento">
            <input value={edadCalculada !== null ? String(edadCalculada) : ''} readOnly className={readOnlyCls} />
          </Field>
          <Field label="Rango de edad" hint="Calculado dinamicamente">
            <input value={rangoEdadCalculado || ''} readOnly className={readOnlyCls} />
          </Field>
        </div>
      </section>
    </div>
  );

  const renderCurrentStep = () => {
    if (currentStepMeta.key === 'perfil') return renderPerfilStep();
    if (currentStepMeta.key === 'contacto') return renderContactoStep();
    return renderBancoStep();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99998] bg-slate-950/55 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[99999] overflow-y-auto p-3 sm:p-6">
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-white shadow-2xl shadow-slate-900/20 max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-48px)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-[#003DA5] via-[#0A49B7] to-[#0D5BD7] px-5 py-5 text-white">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/15 p-3">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
                        Banco de Docentes ESAP
                      </p>
                      <h2 className="text-lg font-bold">{nombreCompleto}</h2>
                      <p className="text-sm text-white/80">Edicion guiada de la ficha del banco</p>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="rounded-xl bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    title="Cerrar"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="border-b border-slate-100 bg-white px-5 py-4">
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#003DA5] to-[#0D5BD7] transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    {STEPS.map((step, index) => {
                      const StepIcon = step.icon;
                      const isActive = index === currentStep;
                      const isCompleted = index < currentStep;

                      return (
                        <button
                          key={step.key}
                          type="button"
                          onClick={() => handleStepChange(index)}
                          className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                            isActive
                              ? 'border-[#003DA5] bg-[#003DA5]/5 shadow-sm'
                              : isCompleted
                                ? 'border-emerald-200 bg-emerald-50/70'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isActive
                                ? 'bg-[#003DA5] text-white'
                                : isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white text-slate-500'
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Paso {index + 1}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">{step.subtitle}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50/70">
                  <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    <div className="mx-auto max-w-4xl space-y-5">
                      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <span className="rounded-full bg-[#003DA5]/8 px-3 py-1 font-medium text-[#003DA5]">
                            Paso {currentStep + 1} de {STEPS.length}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-slate-500">{currentStepMeta.description}</p>
                      </section>

                      {renderCurrentStep()}
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-white px-5 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Shield className="h-4 w-4 text-slate-400" />
                      Solo se editan los campos propios del Banco de Docentes.
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        onClick={onClose}
                        className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      {currentStep > 0 ? (
                        <button
                          onClick={handlePrevious}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Anterior
                        </button>
                      ) : null}
                      {isLastStep ? (
                        <button
                          onClick={handleSubmit}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002f7d] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Guardar cambios
                        </button>
                      ) : (
                        <button
                          onClick={handleNext}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#002f7d]"
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
