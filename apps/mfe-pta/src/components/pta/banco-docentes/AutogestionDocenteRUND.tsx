import { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ChevronRight, CheckCircle, Save, Loader2, User, Briefcase, GraduationCap, FileText, Upload, X, Paperclip } from 'lucide-react';
import { apiClient } from '../../../../../shell/src/services/api';
import { ESAPLogo } from '../../../../../shell/src/components/assets/ESAPLogo';
import { vincularRundSoporte } from '../../../services/api/ptaApi';

// Catálogo de soportes por bloque RUND (alineado con BancoDocentesService.CATALOGO_SOPORTE).
// Se presenta un subconjunto curado con etiquetas amigables para la autogestión del docente.
const SOPORTES_CATALOGO: { bloque: string; label: string; tipos: { key: string; label: string; required?: boolean }[] }[] = [
  {
    bloque: 'IDENTIDAD', label: 'Identidad',
    tipos: [{ key: 'documento_identidad', label: 'Documento de identidad (cédula)', required: true }],
  },
  {
    bloque: 'FORMACION', label: 'Formación Académica',
    tipos: [
      { key: 'diploma_pregrado', label: 'Diploma o acta de grado de pregrado', required: true },
      { key: 'diploma_especializacion', label: 'Diploma de especialización' },
      { key: 'diploma_maestria', label: 'Diploma de maestría' },
      { key: 'diploma_doctorado', label: 'Diploma de doctorado' },
      { key: 'convalidacion_men', label: 'Convalidación MEN (títulos del exterior)' },
    ],
  },
  {
    bloque: 'VINCULACION', label: 'Vinculación',
    tipos: [
      { key: 'acto_administrativo_vinculacion', label: 'Acto administrativo de vinculación' },
      { key: 'contrato', label: 'Contrato' },
    ],
  },
  {
    bloque: 'ACADEMICO', label: 'Académico',
    tipos: [
      { key: 'certificacion_investigacion', label: 'Certificación de investigación' },
      { key: 'acta_evaluacion_desempeno', label: 'Acta de evaluación de desempeño' },
    ],
  },
];

// IMPORTANTE: `Field` e `inputStyle` se definen a nivel de módulo (NO dentro del
// componente). Si se definen dentro, cada `setForm` crea una nueva referencia de
// `Field` y React desmonta/remonta los inputs → se pierde el foco tras cada tecla.
const inputStyle = { padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' as const };

const Field = ({ label, children, required }: any) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
      {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
    </label>
    {children}
  </div>
);

export function AutogestionDocenteRUND() {
  const [token, setToken] = useState<string | null>(null);
  const [step, setStep] = useState<'TOKEN' | 'OTP' | 'FORM' | 'DOCUMENTOS' | 'SUCCESS'>('TOKEN');
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isExistingDocente, setIsExistingDocente] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  // §Paso 2 — Soportes documentales retenidos en el cliente (key: `${bloque}__${tipoSoporte}`)
  const [soporteFiles, setSoporteFiles] = useState<Record<string, File>>({});
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<any>({
    documento_identidad: '', tipo_identificacion: 'CC', 
    nombreCompleto: '', primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    fechaNacimiento: '', genero: '',
    correoInstitucional: '', correoAlternativo: '', telefono: '', 
    nivelFormacion: '', pregrado: '', especializacion: '', maestria: '', doctorado: '', posDoctorado: '',
    nucleoTematico: '', perfilAcademicoPro: '', perfilAcademico: '', investigacion: '',
    tipoVinculacion: '', territorialNombre: '', sedeNombre: '', dedicacion: '', escalafon: '',
    fechaInicioVinculacion: '', fechaFinVinculacion: '', actoAdministrativoVinculacion: '', origenVinculacion: '',
    situacionAdministrativa: '', ultimaEvaluacion: '', puntajeSalarial: '', horasAsignables: '',
    estado: 'ACTIVO', periodoCarga: '', idRund: '', terminosAceptados: false
  });

  useEffect(() => {
    // Prerellenar el correo desde el query param `email` (acceso desde la vista docente).
    try {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) setEmail(emailParam);
      const tokenParam = params.get('token');
      if (tokenParam) setToken(tokenParam);
    } catch { /* noop */ }
  }, []);

  // §5.3.1 — Auto-save every 30 seconds when on FORM step
  useEffect(() => {
    if (step !== 'FORM' || !sessionToken || !autoSaveEnabled) return;
    const interval = setInterval(async () => {
      try {
        await apiClient.put(`/pta/api/v1/banco-docentes/drafts/${sessionToken}`, form);
        setLastSaved(new Date());
      } catch (e) {
        console.warn('Auto-save failed', e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [step, sessionToken, autoSaveEnabled, form]);

  // §5.3.1 — Compute form completion percentage
  const formProgress = (() => {
    const fields = [
      form.documento_identidad, form.tipo_identificacion, form.nombreCompleto,
      form.fechaNacimiento, form.genero, form.correoInstitucional,
      form.nivelFormacion, form.pregrado, form.terminosAceptados,
    ];
    const filled = fields.filter(v => v && String(v).trim() !== '' && v !== false).length;
    return Math.round((filled / fields.length) * 100);
  })();

  const handleRequestOtp = async (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) {
      setError('Por favor ingresa un correo válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.post('/pta/api/v1/banco-docentes/otp/request', { email: emailStr });
      const isSuccess = res.success || res.data?.success;
      const msg = res.message || res.data?.message || 'Error al solicitar el código.';

      if (isSuccess) {
        setStep('OTP');
        
        // --- MODO DEV: Autocompletar / Mostrar en Consola ---
        const devOtp = res.devOtp || res.data?.devOtp;
        if (devOtp) {
          console.warn(`[MODO DEV] Tu código OTP es: ${devOtp}`);
          alert(`[MODO DEV] Tu código OTP es: ${devOtp}`);
          setOtp(devOtp);
        }
      } else {
        setError(msg);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiClient.post('/pta/api/v1/banco-docentes/otp/validate', { email, otp });
      const isSuccess = res.success || res.data?.success;
      const msg = res.message || res.data?.message || 'Código inválido.';
      const sToken = res.sessionToken || res.data?.sessionToken;

      if (isSuccess && sToken) {
        setSessionToken(sToken);
        await loadDraft(sToken);
        // Check if docente already exists in banco
        await checkExistingDocente(sToken);
        setAutoSaveEnabled(true); // §5.3.1 — Enable auto-save
        setStep('FORM');
      } else {
        setError(msg);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error de verificación.');
    } finally {
      setLoading(false);
    }
  };

  const loadDraft = async (sToken: string) => {
    try {
      const res = await apiClient.get(`/pta/api/v1/banco-docentes/drafts/${sToken}`);
      if (res.data?.success && res.data.data?.draft) {
        setForm({ ...form, ...res.data.data.draft });
      }
    } catch (e) {
      console.warn('Error loading draft', e);
    }
  };

  const checkExistingDocente = async (sToken: string) => {
    try {
      // El endpoint me/:token resuelve el correo desde la invitación en el server,
      // así que NO necesitamos un guard de correo aquí (antes retornaba temprano).
      const searchRes: any = await apiClient.get(`/pta/api/v1/banco-docentes/autogestion/me/${sToken}`);
      // El controlador responde { success, data: match } → los campos están en data.data.
      const match = searchRes?.data?.data || null;

      if (!match || Object.keys(match).length === 0) {
        console.warn("No data found for this user in the RUND.");
        setError("No encontramos su información previa en el RUND. Por favor, diligencie sus datos manualmente.");
        return;
      }

      setIsExistingDocente(true);
      // Pre-fill fields from existing record
      setForm((prev: any) => ({
          ...prev,
          documento_identidad: match.documento_identidad || prev.documento_identidad,
          tipo_identificacion: match.tipo_documento || match.tipo_identificacion || prev.tipo_identificacion,
          nombreCompleto: match.nombre_completo || prev.nombreCompleto,
          correoInstitucional: match.correo_institucional || prev.correoInstitucional,
          correoAlternativo: match.correo_personal || match.correo_alternativo || prev.correoAlternativo,
          telefono: match.telefono || prev.telefono,
          nivelFormacion: match.nivel_formacion || prev.nivelFormacion,
          pregrado: match.pregrado || prev.pregrado,
          especializacion: match.especializacion || prev.especializacion,
          maestria: match.maestria || prev.maestria,
          doctorado: match.doctorado || prev.doctorado,
          posDoctorado: match.posdoctorado || match.posDoctorado || prev.posDoctorado,
          nucleoTematico: match.nucleo_tematico || prev.nucleoTematico,
          perfilAcademicoPro: match.perfil_academico_pro || prev.perfilAcademicoPro,
          perfilAcademico: match.perfil_academico || prev.perfilAcademico,
          investigacion: match.investigacion || prev.investigacion,
          tipoVinculacion: match.tipo_vinculacion || prev.tipoVinculacion,
          territorialNombre: match.territorial || match.territorial_nombre || prev.territorialNombre,
          sedeNombre: match.sede_nombre || prev.sedeNombre,
          dedicacion: match.dedicacion || prev.dedicacion,
          escalafon: match.escalafon || prev.escalafon,
          fechaInicioVinculacion: match.inicio_vinculacion || prev.fechaInicioVinculacion,
          fechaFinVinculacion: match.fin_vinculacion || prev.fechaFinVinculacion,
          actoAdministrativoVinculacion: match.acto_administrativo_vinculacion || prev.actoAdministrativoVinculacion,
          origenVinculacion: match.origen_vinculacion || prev.origenVinculacion,
          situacionAdministrativa: match.situacion_administrativa || prev.situacionAdministrativa,
          ultimaEvaluacion: match.ultima_evaluacion || prev.ultimaEvaluacion,
          puntajeSalarial: match.puntaje_salarial || prev.puntajeSalarial,
          horasAsignables: match.horas_programables || prev.horasAsignables,
          estado: match.estado || prev.estado,
          periodoCarga: match.periodo_carga || prev.periodoCarga,
          idRund: match.id_rund || prev.idRund
        }));
    } catch (e: any) {
      console.warn('Error checking existing docente', e);
      setError(e.response?.data?.message || e.message || 'Error al recuperar tus datos.');
    }
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      await apiClient.put(`/pta/api/v1/banco-docentes/drafts/${sessionToken}`, form);
      setDraftSaved(true);
      setLastSaved(new Date());
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (e) {
      setError('Error al guardar borrador');
    } finally {
      setLoading(false);
    }
  };

  // Paso datos → Paso documentos: valida los campos mínimos y avanza al adjunto de soportes.
  const goToDocumentos = () => {
    if (!form.documento_identidad || !form.nombreCompleto || !form.terminosAceptados) {
      setError('Por favor completa todos los campos obligatorios y acepta los términos de Habeas Data.');
      return;
    }
    setError(null);
    setStep('DOCUMENTOS');
  };

  // Manejo de archivos retenidos por bloque/tipo (no se suben hasta el envío final).
  const setSoporteFile = (bloque: string, tipo: string, file: File | null) => {
    const key = `${bloque}__${tipo}`;
    setSoporteFiles(prev => {
      const next = { ...prev };
      if (file) next[key] = file; else delete next[key];
      return next;
    });
  };

  // §Paso 2/3 — Envío final SUBMIT-FIRST:
  //   1) submit/:token crea el docente (persona + usuario + rol, sin duplicar)
  //   2) sube cada soporte retenido al bloque correspondiente usando el docenteId devuelto
  //   3) asegura la Carpeta Digital y muestra el éxito
  const handleFinalSubmit = async () => {
    if (!form.terminosAceptados) {
      setError('Debes aceptar los términos de Habeas Data antes de enviar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...form,
        documentNumber: form.documento_identidad,
        // El correo institucional se valida al pedir el OTP; si el docente no lo
        // re-escribió en el form, usamos el del paso TOKEN como respaldo.
        correoInstitucional: form.correoInstitucional || email,
        tipoVinculacion: form.tipoVinculacion || 'OCASIONAL',
        dedicacion: form.dedicacion || 'TC',
        territorialNombre: form.territorialNombre || 'Sede Central',
        canal_origen: 'AUTOGESTION', // §5.7 — Auditoría del canal
      };
      const res: any = await apiClient.post(`/pta/api/v1/banco-docentes/submit/${sessionToken}`, payload);
      // El endpoint responde { success, data: { docenteId, personaId, ... } }
      const docenteId = res?.data?.data?.docenteId || res?.data?.docenteId || res?.docenteId;
      const personaId = res?.data?.data?.personaId || res?.data?.personaId || res?.personaId;

      // Subir los soportes adjuntos al docente recién creado/actualizado.
      const entries = Object.entries(soporteFiles);
      if (docenteId && entries.length > 0) {
        let done = 0;
        for (const [key, file] of entries) {
          const [bloque, tipoSoporte] = key.split('__');
          setUploadProgress(`Subiendo documentos (${done + 1}/${entries.length})…`);
          const up = await vincularRundSoporte(docenteId, bloque, { tipoSoporte, cargadoPor: form.correoInstitucional || email }, file);
          if (!(up as any)?.success) {
            console.warn('[RUND] Falló la carga de un soporte', key, up);
          }
          done++;
        }
        setUploadProgress(null);
      }

      // §4 — Asegurar la creación de la Carpeta Digital (es lazy; la disparamos explícitamente).
      if (personaId) {
        try { await apiClient.get(`/auth/api/v1/carpeta-digital/persona/${personaId}`); } catch { /* noop */ }
      }

      setStep('SUCCESS');
    } catch (err: any) {
      setUploadProgress(null);
      setError(err.response?.data?.message || 'Error al enviar el formulario.');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string) => (e: any) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  // Step config for stepper
  const STEPS = [
    { key: 'TOKEN', label: 'Verificar Correo', icon: Mail, desc: 'Validar tu invitación' },
    { key: 'OTP', label: 'Código de Seguridad', icon: ShieldCheck, desc: 'Confirmar tu identidad' },
    { key: 'FORM', label: 'Completar Datos', icon: FileText, desc: 'Diligenciar tu información' },
    { key: 'DOCUMENTOS', label: 'Adjuntar Documentos', icon: Upload, desc: 'Cargar tus soportes' },
    { key: 'SUCCESS', label: 'Enviado', icon: CheckCircle, desc: 'Registro completado' },
  ];
  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .rund-layout-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 24px;
          align-items: start;
        }
        .rund-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          padding-left: 42px;
        }
        .rund-form-grid-full {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          padding-left: 42px;
        }
        @media (max-width: 860px) {
          .rund-layout-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .rund-form-grid {
            grid-template-columns: 1fr;
            padding-left: 0;
          }
          .rund-form-grid-full {
            padding-left: 0;
          }
          .stepper-text {
            display: none !important;
          }
        }
      `}</style>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)', padding: '14px 32px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ESAPLogo variant="white" style={{ width: '145px', height: '42px' }} />
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.25)' }} />
          <div>
            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.02em' }}>Registro Único Nacional Docente</p>
            <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.7 }}>Autogestión — Canal 3</p>
          </div>
        </div>
        {step === 'FORM' && lastSaved && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: 20, fontSize: '0.7rem' }}>
            <CheckCircle size={12} /> Guardado: {lastSaved.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {/* ── Stepper Bar ─────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 32px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isDone ? '#22c55e' : isActive ? '#1d4ed8' : '#e2e8f0',
                    color: isDone || isActive ? '#fff' : '#94a3b8',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 0 0 4px rgba(29,78,216,0.2)' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {isDone ? <CheckCircle size={18} /> : <Icon size={18} />}
                  </div>
                  <span className="stepper-text" style={{
                    fontSize: '0.68rem', fontWeight: isActive ? 700 : 500,
                    color: isDone ? '#16a34a' : isActive ? '#1d4ed8' : '#94a3b8',
                    textAlign: 'center', lineHeight: 1.2,
                  }}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: isDone ? '#22c55e' : '#e2e8f0', margin: '0 4px', marginBottom: 20, transition: 'background 0.3s' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 960 }}>

          {/* ═══════════════ STEP 1: TOKEN ═══════════════ */}
          {step === 'TOKEN' && (
            <div className="rund-layout-grid">
              {/* Left: Info Panel */}
              <div style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)', borderRadius: 16, padding: 28, color: '#fff' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <GraduationCap size={24} />
                </div>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: 700 }}>¿Qué es el RUND?</h3>
                <p style={{ margin: '0 0 20px', fontSize: '0.82rem', opacity: 0.9, lineHeight: 1.6 }}>
                  El <strong>Registro Único Nacional Docente</strong> es tu carpeta digital oficial en la ESAP. 
                  Contiene tus datos personales, formación académica y documentos de soporte verificados.
                </p>

                <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, opacity: 0.9 }}>¿Cómo funciona este proceso?</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { num: '1', text: 'Ingresas tu correo institucional', time: '10 seg' },
                    { num: '2', text: 'Confirmas tu identidad con un código OTP enviado a tu correo', time: '30 seg' },
                    { num: '3', text: 'Completas tu información personal y académica', time: '5 min' },
                    { num: '4', text: 'Envías y tu información queda en validación', time: 'Automático' },
                  ].map(s => (
                    <div key={s.num} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{s.num}</div>
                      <div>
                        <span style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>{s.text}</span>
                        <span style={{ display: 'block', fontSize: '0.65rem', opacity: 0.6, marginTop: 2 }}>⏱ {s.time}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 24, padding: '12px 14px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', opacity: 0.85, lineHeight: 1.5 }}>
                    💡 <strong>¿Necesitas ayuda?</strong> Si no recibiste tu enlace de invitación o tienes problemas, contacta a la Oficina de Gestión de Personal (GGP) de tu territorial.
                  </p>
                </div>
              </div>

              {/* Right: Token Form */}
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '32px 36px' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Mail size={28} color="#2563EB" />
                  </div>
                  <h2 style={{ margin: '0 0 8px', color: '#0f172a', textAlign: 'center', fontSize: '1.2rem' }}>Verificar tu Invitación</h2>
                  <p style={{ color: '#64748b', textAlign: 'center', marginBottom: 8, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    Ingresa tu correo institucional registrado. Te enviaremos un código de seguridad para validar tu identidad.
                  </p>
                  <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 24, fontSize: '0.75rem' }}>
                    Debes haber sido invitado previamente por la Oficina de Gestión de Personal.
                  </p>

                  {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 16, fontSize: '0.82rem', border: '1px solid #FECACA' }}>{error}</div>}

                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>Correo electrónico institucional</label>
                  <input
                    type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@esap.edu.co"
                    style={{ ...inputStyle, marginBottom: 20, background: '#f8fafc' }}
                  />
                  <button
                    onClick={() => email && handleRequestOtp(email)}
                    disabled={!email || !email.includes('@') || loading}
                    style={{
                      width: '100%', padding: '14px 24px', background: (!email || !email.includes('@')) ? '#94a3b8' : 'linear-gradient(135deg, #1e40af, #2563eb)',
                      color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: (!email || !email.includes('@')) ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                      boxShadow: (email && email.includes('@')) ? '0 4px 14px rgba(37,99,235,0.3)' : 'none', transition: 'all 0.2s',
                    }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} />}
                    {loading ? 'Enviando...' : 'Enviar Código OTP'}
                  </button>
                </div>

                {/* Trust Badges */}
                <div style={{ padding: '16px 36px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'center', gap: 24 }}>
                  {[
                    { icon: '🔒', text: 'Conexión segura' },
                    { icon: '🛡️', text: 'Datos protegidos' },
                    { icon: '⏱️', text: '~6 min total' },
                  ].map(b => (
                    <div key={b.text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: '#64748b' }}>
                      <span>{b.icon}</span> {b.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 2: OTP ═══════════════ */}
          {step === 'OTP' && (
            <div style={{ maxWidth: 520, margin: '0 auto' }}>
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '36px 40px', textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <ShieldCheck size={32} color="#059669" />
                  </div>
                  <h2 style={{ margin: '0 0 8px', color: '#0f172a', fontSize: '1.2rem' }}>Confirmación de Identidad</h2>
                  <p style={{ color: '#64748b', marginBottom: 6, fontSize: '0.88rem' }}>
                    Te enviamos un <strong>código de 6 dígitos</strong> a tu correo institucional.
                  </p>
                  <p style={{ color: '#94a3b8', marginBottom: 28, fontSize: '0.78rem' }}>
                    Revisa tu bandeja de entrada (y spam). El código expira en 10 minutos.
                  </p>

                  {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', color: '#DC2626', borderRadius: 8, marginBottom: 20, fontSize: '0.82rem', border: '1px solid #FECACA' }}>{error}</div>}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <input
                        key={i}
                        value={otp[i] || ''}
                        maxLength={1}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newOtp = otp.split('');
                          newOtp[i] = val;
                          setOtp(newOtp.join(''));
                          if (val && i < 5) {
                            const next = e.target.nextElementSibling as HTMLInputElement;
                            next?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !otp[i] && i > 0) {
                            const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                            prev?.focus();
                          }
                        }}
                        style={{
                          width: 52, height: 60, textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                          borderRadius: 12, border: otp[i] ? '2px solid #2563EB' : '2px solid #e2e8f0',
                          background: otp[i] ? '#EFF6FF' : '#f8fafc', outline: 'none', color: '#0f172a',
                          transition: 'all 0.2s',
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otp.length !== 6}
                    style={{
                      width: '100%', padding: '14px 24px',
                      background: otp.length !== 6 ? '#94a3b8' : 'linear-gradient(135deg, #059669, #10b981)',
                      color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                      cursor: otp.length !== 6 ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                      boxShadow: otp.length === 6 ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
                    }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    {loading ? 'Validando...' : 'Confirmar Código'}
                  </button>
                </div>

                <div style={{ padding: '14px 40px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    ¿No recibiste el código? Verifica tu bandeja de spam o solicita un nuevo enlace.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 3: FORM ═══════════════ */}
          {step === 'FORM' && (
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Form Header */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Completa tu Información RUND</h2>
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                      Diligencia tus datos personales y académicos. Esta información será verificada por la ESAP.
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                    <span>Progreso del formulario</span>
                    <span style={{ color: formProgress === 100 ? '#059669' : '#ca8a04' }}>{formProgress}%</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${formProgress}%`, height: '100%', background: formProgress === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 99, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {/* Auto-save info */}
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.78rem', color: '#1e40af' }}>
                  <Save size={16} style={{ flexShrink: 0 }} />
                  <span><strong>Tu progreso se guarda automáticamente.</strong> Puedes salir y retomar más tarde con el mismo enlace y un nuevo OTP.</span>
                </div>
              </div>

              {/* Form Body */}
              <div style={{ padding: '24px 32px', maxHeight: '60vh', overflowY: 'auto' }}>
                {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', border: '1px solid #fecaca' }}>{error}</div>}

                {/* Docente existente banner */}
                {isExistingDocente && (
                  <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontSize: '1rem' }}>🔒</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Ya tienes un registro en el Banco de Docentes</div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5 }}>
                        Tus datos de identidad ya están registrados y <strong>no pueden ser modificados</strong>. Puedes actualizar tu información de contacto, formación académica y perfil.
                      </p>
                    </div>
                  </div>
                )}

                {/* Section 1 */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={16} color="#2563EB" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>1. Datos Personales</h3>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Información básica de identificación</p>
                    </div>
                  </div>
                  <div className="rund-form-grid">
                    <Field label="Documento de Identidad" required>
                      <input style={{ ...inputStyle, ...(isExistingDocente ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) }} value={form.documento_identidad} onChange={set('documento_identidad')} readOnly={isExistingDocente} />
                    </Field>
                    <Field label="Tipo Documento">
                      <select style={{ ...inputStyle, ...(isExistingDocente ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', pointerEvents: 'none' as const } : {}) }} value={form.tipo_identificacion} onChange={set('tipo_identificacion')} disabled={isExistingDocente}>
                        <option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option>
                      </select>
                    </Field>
                    <div style={{ gridColumn: '1/-1' }}>
                      <Field label="Nombre Completo" required>
                        <input style={{ ...inputStyle, ...(isExistingDocente ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) }} value={form.nombreCompleto} onChange={set('nombreCompleto')} readOnly={isExistingDocente} />
                      </Field>
                    </div>
                    <Field label="Fecha Nacimiento"><input type="date" style={{ ...inputStyle, ...(isExistingDocente ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) }} value={form.fechaNacimiento} onChange={set('fechaNacimiento')} readOnly={isExistingDocente} /></Field>
                    <Field label="Género"><select style={{ ...inputStyle, ...(isExistingDocente ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', pointerEvents: 'none' as const } : {}) }} value={form.genero} onChange={set('genero')} disabled={isExistingDocente}><option value="">Seleccionar...</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option><option value="No Binario">No Binario</option></select></Field>
                  </div>
                </div>

                {/* Section 2 */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Mail size={16} color="#16a34a" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>2. Datos de Contacto</h3>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Correos electrónicos y teléfono</p>
                    </div>
                  </div>
                  <div className="rund-form-grid">
                    <Field label="Correo Institucional ESAP">
                      <input style={{ ...inputStyle, ...(isExistingDocente ? { background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' } : {}) }} type="email" value={form.correoInstitucional} onChange={set('correoInstitucional')} placeholder="docente@esap.edu.co" readOnly={isExistingDocente} />
                    </Field>
                    <Field label="Correo Alternativo"><input style={inputStyle} type="email" value={form.correoAlternativo} onChange={set('correoAlternativo')} /></Field>
                    <Field label="Teléfono"><input style={inputStyle} value={form.telefono} onChange={set('telefono')} /></Field>
                  </div>
                </div>

                {/* Section 3 */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GraduationCap size={16} color="#d97706" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>3. Formación Académica</h3>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Títulos y nivel de formación</p>
                    </div>
                  </div>
                  <div className="rund-form-grid">
                    <Field label="Nivel Formación"><select style={inputStyle} value={form.nivelFormacion} onChange={set('nivelFormacion')}><option value="">Seleccionar...</option><option value="Pregrado">Pregrado</option><option value="Especialización">Especialización</option><option value="Maestría">Maestría</option><option value="Doctorado">Doctorado</option><option value="Posdoctorado">Posdoctorado</option></select></Field>
                    <Field label="Pregrado"><input style={inputStyle} value={form.pregrado} onChange={set('pregrado')} placeholder="Ej: Administración Pública" /></Field>
                    <Field label="Especialización"><input style={inputStyle} value={form.especializacion} onChange={set('especializacion')} /></Field>
                    <Field label="Maestría"><input style={inputStyle} value={form.maestria} onChange={set('maestria')} /></Field>
                    <Field label="Doctorado"><input style={inputStyle} value={form.doctorado} onChange={set('doctorado')} /></Field>
                    <Field label="Posdoctorado"><input style={inputStyle} value={form.posDoctorado} onChange={set('posDoctorado')} /></Field>
                  </div>
                </div>

                {/* Section 4 */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="#A855F7" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>4. Perfil Académico e Investigación</h3>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Experiencia y áreas de especialidad</p>
                    </div>
                  </div>
                  <div className="rund-form-grid-full">
                    <Field label="Núcleo Temático"><input style={inputStyle} value={form.nucleoTematico} onChange={set('nucleoTematico')} placeholder="Área principal de enseñanza" /></Field>
                    <Field label="Perfil Académico Profesional"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.perfilAcademicoPro} onChange={set('perfilAcademicoPro')} placeholder="Resumen de su perfil profesional" /></Field>
                    <Field label="Perfil Académico"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.perfilAcademico} onChange={set('perfilAcademico')} placeholder="Áreas de docencia" /></Field>
                    <Field label="Investigación"><textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={form.investigacion} onChange={set('investigacion')} placeholder="Líneas y grupos de investigación" /></Field>
                  </div>
                </div>

                {/* Section 5 */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={16} color="#DB2777" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>5. Datos de Vinculación (Solo Lectura)</h3>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>Información gestionada por ESAP</p>
                    </div>
                  </div>
                  <div className="rund-form-grid">
                    <Field label="Tipo Vinculación"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.tipoVinculacion} readOnly /></Field>
                    <Field label="Dedicación"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.dedicacion} readOnly /></Field>
                    <Field label="Territorial"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.territorialNombre} readOnly /></Field>
                    <Field label="Sede"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.sedeNombre} readOnly /></Field>
                    <Field label="Escalafón"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.escalafon} readOnly /></Field>
                    <Field label="Estado"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.estado} readOnly /></Field>
                    <Field label="Fecha Inicio Vinculación"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} type="date" value={form.fechaInicioVinculacion ? form.fechaInicioVinculacion.substring(0,10) : ''} readOnly /></Field>
                    <Field label="Fecha Fin Vinculación"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} type="date" value={form.fechaFinVinculacion ? form.fechaFinVinculacion.substring(0,10) : ''} readOnly /></Field>
                    <Field label="Acto Administrativo"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.actoAdministrativoVinculacion} readOnly /></Field>
                    <Field label="Origen Vinculación"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.origenVinculacion} readOnly /></Field>
                    <Field label="Situación Administrativa"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.situacionAdministrativa} readOnly /></Field>
                    <Field label="Última Evaluación"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.ultimaEvaluacion} readOnly /></Field>
                    <Field label="Puntaje Salarial"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.puntajeSalarial} readOnly /></Field>
                    <Field label="Horas Asignables"><input style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }} value={form.horasAsignables} readOnly /></Field>
                  </div>
                </div>

                {/* Habeas Data */}
                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <input type="checkbox" checked={form.terminosAceptados} onChange={set('terminosAceptados')} style={{ marginTop: 4, width: 18, height: 18, accentColor: '#2563EB' }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong>Aceptación de Habeas Data:</strong> Autorizo de manera voluntaria, previa, explícita e informada a la Escuela Superior de Administración Pública (ESAP) para el tratamiento de mis datos personales de acuerdo con la Ley 1581 de 2012.
                  </p>
                </div>
              </div>

              {/* Form Footer */}
              <div style={{ padding: '16px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={saveDraft}
                  disabled={loading}
                  style={{ padding: '10px 20px', background: 'transparent', color: '#1e40af', border: '1.5px solid #93c5fd', borderRadius: 10, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                  <Save size={16} /> {draftSaved ? '¡Guardado!' : 'Guardar borrador'}
                </button>
                <button
                  onClick={goToDocumentos}
                  disabled={loading || !form.terminosAceptados}
                  style={{
                    padding: '12px 28px',
                    background: form.terminosAceptados ? 'linear-gradient(135deg, #1e40af, #2563eb)' : '#94a3b8',
                    color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                    cursor: form.terminosAceptados ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: form.terminosAceptados ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
                  }}>
                  Continuar a Documentos <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 4: DOCUMENTOS ═══════════════ */}
          {step === 'DOCUMENTOS' && (
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={16} color="#2563EB" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Adjunta tus Documentos de Soporte</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                      Carga los documentos que respaldan tu información. Formatos: PDF, JPG o PNG. Los marcados con <span style={{ color: '#ef4444' }}>*</span> son recomendados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '24px 32px', maxHeight: '60vh', overflowY: 'auto' }}>
                {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', border: '1px solid #fecaca' }}>{error}</div>}

                {SOPORTES_CATALOGO.map(grupo => (
                  <div key={grupo.bloque} style={{ marginBottom: 24 }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>{grupo.label}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {grupo.tipos.map(tipo => {
                        const key = `${grupo.bloque}__${tipo.key}`;
                        const file = soporteFiles[key];
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: file ? '#f0fdf4' : '#f8fafc', border: `1px solid ${file ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <Paperclip size={16} color={file ? '#16a34a' : '#94a3b8'} style={{ flexShrink: 0 }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>
                                  {tipo.label}{tipo.required && <span style={{ color: '#ef4444' }}> *</span>}
                                </div>
                                {file && <div style={{ fontSize: '0.72rem', color: '#16a34a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0 }}>
                              {file ? (
                                <button onClick={() => setSoporteFile(grupo.bloque, tipo.key, null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#fff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                  <X size={14} /> Quitar
                                </button>
                              ) : (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#fff', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                  <Upload size={14} /> Adjuntar
                                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => setSoporteFile(grupo.bloque, tipo.key, e.target.files?.[0] || null)} />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', fontSize: '0.78rem', color: '#1e40af', lineHeight: 1.5 }}>
                  💡 Puedes enviar ahora con los documentos que tengas; los faltantes podrán cargarse luego durante la validación. La ESAP revisará tus soportes.
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => { setError(null); setStep('FORM'); }}
                  disabled={loading}
                  style={{ padding: '10px 20px', background: 'transparent', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                  Volver a Datos
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  style={{
                    padding: '12px 28px',
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                  }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  {loading ? (uploadProgress || 'Enviando…') : 'Enviar mi Información'}
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════ STEP 5: SUCCESS ═══════════════ */}
          {step === 'SUCCESS' && (
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden', textAlign: 'center' }}>
                <div style={{ padding: '48px 40px' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #DCFCE7, #BBF7D0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 0 8px rgba(34,197,94,0.1)' }}>
                    <CheckCircle size={40} color="#16a34a" />
                  </div>
                  <h2 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.4rem', fontWeight: 800 }}>¡Registro Completado!</h2>
                  <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 28px' }}>
                    Tus datos han sido registrados exitosamente en el <strong>Registro Único Nacional Docente (RUND)</strong> de la ESAP.
                  </p>

                  <div style={{ background: '#f8fafc', borderRadius: 12, padding: '20px 24px', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>¿Qué sigue ahora?</h4>
                    {[
                      { icon: '📋', text: 'Tu información pasará a un proceso de validación por parte de la ESAP.' },
                      { icon: '📧', text: 'Recibirás una notificación por correo cuando tus datos sean aprobados.' },
                      { icon: '📁', text: 'Una vez aprobado, tu carpeta digital RUND quedará activa y visible.' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
                        <span style={{ fontSize: '1rem', marginTop: 1 }}>{item.icon}</span>
                        <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '16px 40px', background: '#f0fdf4', borderTop: '1px solid #dcfce7' }}>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>
                    ✅ Ya puedes cerrar esta ventana de forma segura.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div style={{ padding: '12px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center', gap: 20 }}>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>© {new Date().getFullYear()} Escuela Superior de Administración Pública — ESAP</span>
        <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>|</span>
        <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Todos los derechos reservados</span>
      </div>
    </div>
  );
}

