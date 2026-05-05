import { useState, useEffect } from 'react';
import { X, Save, User, Briefcase, GraduationCap, Mail } from 'lucide-react';
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

type Tab = 'vinculacion' | 'formacion' | 'contacto' | 'personal';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'vinculacion', label: 'Vinculación', icon: Briefcase },
  { key: 'formacion', label: 'Formación', icon: GraduationCap },
  { key: 'contacto', label: 'Contacto', icon: Mail },
  { key: 'personal', label: 'Personal', icon: User },
];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.73rem', fontWeight: 600, color: '#475569' }}>
        {label}{required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 7,
  border: '1px solid #e2e8f0',
  fontSize: '0.82rem',
  color: '#0f172a',
  outline: 'none',
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle };

export function BancoDocenteEditModal({ docente, onClose, onSaved }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('vinculacion');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombreCompleto: '',
    documento_identidad: '',
    tipo_identificacion: 'CC',
    territorialNombre: '',
    tipoVinculacion: 'OCASIONAL',
    dedicacion: 'TC',
    escalafon: '',
    origenVinculacion: '',
    actoAdministrativoVinculacion: '',
    puntajeSalarial: '',
    situacionAdministrativa: '',
    ultimaEvaluacion: '',
    fechaInicioVinculacion: '',
    fechaFinVinculacion: '',
    nivelFormacion: '',
    perfilAcademicoPro: '',
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
    fechaNacimiento: '',
  });

  useEffect(() => {
    if (docente) {
      setForm({
        nombreCompleto: docente.nombre_completo || '',
        documento_identidad: docente.documento_identidad || '',
        tipo_identificacion: docente.tipo_documento || 'CC',
        territorialNombre: docente.territorial || '',
        tipoVinculacion: docente.vinculacion_codigo || 'OCASIONAL',
        dedicacion: docente.dedicacion_codigo || 'TC',
        escalafon: docente.categoria || '',
        origenVinculacion: docente.origen_vinculacion || '',
        actoAdministrativoVinculacion: docente.acto_administrativo_vinculacion || '',
        puntajeSalarial: docente.puntaje_salarial?.toString() || '',
        situacionAdministrativa: docente.situacion_administrativa || '',
        ultimaEvaluacion: docente.ultima_evaluacion || '',
        fechaInicioVinculacion: docente.inicio_vinculacion ? docente.inicio_vinculacion.split('T')[0] : '',
        fechaFinVinculacion: docente.fin_vinculacion ? docente.fin_vinculacion.split('T')[0] : '',
        nivelFormacion: docente.nivel_formacion || '',
        perfilAcademicoPro: docente.perfil_academico_pro || '',
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
        genero: docente.genero || '',
        fechaNacimiento: docente.nacimiento ? docente.nacimiento.split('T')[0] : '',
      });
    }
  }, [docente]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    setError(null);
    if (!form.documento_identidad) { setError('El número de documento es obligatorio'); return; }
    if (!form.nombreCompleto) { setError('El nombre completo es obligatorio'); return; }
    if (!form.territorialNombre) { setError('La territorial es obligatoria'); return; }

    setSaving(true);
    const payload = {
      documentNumber: form.documento_identidad,
      nombreCompleto: form.nombreCompleto,
      tipo_identificacion: form.tipo_identificacion,
      territorialNombre: form.territorialNombre,
      tipoVinculacion: form.tipoVinculacion,
      dedicacion: form.dedicacion,
      escalafon: form.escalafon || null,
      origenVinculacion: form.origenVinculacion || null,
      actoAdministrativoVinculacion: form.actoAdministrativoVinculacion || null,
      puntajeSalarial: form.puntajeSalarial ? parseFloat(form.puntajeSalarial) : null,
      situacionAdministrativa: form.situacionAdministrativa || null,
      ultimaEvaluacion: form.ultimaEvaluacion || null,
      fechaInicioVinculacion: form.fechaInicioVinculacion || null,
      fechaFinVinculacion: form.fechaFinVinculacion || null,
      nivelFormacion: form.nivelFormacion || null,
      perfilAcademicoPro: form.perfilAcademicoPro || null,
      perfilAcademico: form.perfilAcademico || null,
      nucleoTematico: form.nucleoTematico || null,
      pregrado: form.pregrado || null,
      especializacion: form.especializacion || null,
      maestria: form.maestria || null,
      doctorado: form.doctorado || null,
      posDoctorado: form.posDoctorado || null,
      investigacion: form.investigacion || null,
      correoInstitucional: form.correoInstitucional || null,
      correoAlternativo: form.correoAlternativo || null,
      telefono: form.telefono || null,
      genero: form.genero || null,
      fechaNacimiento: form.fechaNacimiento || null,
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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{docente?.id ? 'Editar Docente' : 'Nuevo Docente'}</h2>
            {docente?.id && <p style={{ margin: '2px 0 0', fontSize: '0.73rem', color: '#64748b' }}>{docente.nombre_completo}</p>}
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="#64748b" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: 0, background: '#f8fafc' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 14px', border: 'none', borderBottom: activeTab === key ? '2px solid #1d4ed8' : '2px solid transparent', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: activeTab === key ? 700 : 500, color: activeTab === key ? '#1d4ed8' : '#64748b', marginBottom: -1, transition: 'all 0.15s' }}>
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fca5a5', fontSize: '0.8rem', color: '#dc2626' }}>
              {error}
            </div>
          )}

          {activeTab === 'vinculacion' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Documento de Identidad" required>
                <input style={inputStyle} value={form.documento_identidad} onChange={set('documento_identidad')} placeholder="Ej: 12345678" disabled={!!docente?.id} />
              </Field>
              <Field label="Tipo de Documento">
                <select style={selectStyle} value={form.tipo_identificacion} onChange={set('tipo_identificacion')}>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PA">Pasaporte</option>
                  <option value="NIT">NIT</option>
                </select>
              </Field>
              <Field label="Nombre Completo" required>
                <input style={{ ...inputStyle, gridColumn: '1/-1' }} value={form.nombreCompleto} onChange={set('nombreCompleto')} placeholder="Ej: María Fernanda López García" />
              </Field>
              <Field label="Territorial" required>
                <select style={selectStyle} value={form.territorialNombre} onChange={set('territorialNombre')}>
                  <option value="">Seleccionar...</option>
                  {TERRITORIALES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Tipo de Vinculación" required>
                <select style={selectStyle} value={form.tipoVinculacion} onChange={set('tipoVinculacion')}>
                  <option value="OCASIONAL">Ocasional</option>
                  <option value="CARRERA">Carrera</option>
                  <option value="CATEDRA">Hora Cátedra</option>
                  <option value="VISITANTE">Visitante</option>
                  <option value="ESPECIAL">Especial</option>
                </select>
              </Field>
              <Field label="Dedicación" required>
                <select style={selectStyle} value={form.dedicacion} onChange={set('dedicacion')}>
                  <option value="TC">Tiempo Completo (800h)</option>
                  <option value="MT">Medio Tiempo (400h)</option>
                  <option value="HC">Hora Cátedra (0h)</option>
                </select>
              </Field>
              <Field label="Categoría / Escalafón">
                <input style={inputStyle} value={form.escalafon} onChange={set('escalafon')} placeholder="Ej: Profesional Especializado" />
              </Field>
              <Field label="Puntaje Salarial">
                <input style={inputStyle} type="number" value={form.puntajeSalarial} onChange={set('puntajeSalarial')} placeholder="Ej: 145.5" />
              </Field>
              <Field label="Origen de Vinculación">
                <input style={inputStyle} value={form.origenVinculacion} onChange={set('origenVinculacion')} />
              </Field>
              <Field label="Acto Administrativo">
                <input style={inputStyle} value={form.actoAdministrativoVinculacion} onChange={set('actoAdministrativoVinculacion')} />
              </Field>
              <Field label="Inicio Vinculación">
                <input style={inputStyle} type="date" value={form.fechaInicioVinculacion} onChange={set('fechaInicioVinculacion')} />
              </Field>
              <Field label="Fin Vinculación">
                <input style={inputStyle} type="date" value={form.fechaFinVinculacion} onChange={set('fechaFinVinculacion')} />
              </Field>
              <Field label="Situación Administrativa">
                <input style={inputStyle} value={form.situacionAdministrativa} onChange={set('situacionAdministrativa')} />
              </Field>
              <Field label="Última Evaluación">
                <input style={inputStyle} value={form.ultimaEvaluacion} onChange={set('ultimaEvaluacion')} placeholder="Ej: 2024-1" />
              </Field>
            </div>
          )}

          {activeTab === 'formacion' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Nivel de Formación">
                <select style={selectStyle} value={form.nivelFormacion} onChange={set('nivelFormacion')}>
                  <option value="">Seleccionar...</option>
                  <option value="Pregrado">Pregrado</option>
                  <option value="Especialización">Especialización</option>
                  <option value="Maestría">Maestría</option>
                  <option value="Doctorado">Doctorado</option>
                  <option value="Posdoctorado">Posdoctorado</option>
                </select>
              </Field>
              <Field label="Núcleo Temático">
                <input style={inputStyle} value={form.nucleoTematico} onChange={set('nucleoTematico')} />
              </Field>
              <Field label="Perfil Académico PRO">
                <input style={{ ...inputStyle }} value={form.perfilAcademicoPro} onChange={set('perfilAcademicoPro')} />
              </Field>
              <Field label="Perfil Académico">
                <input style={inputStyle} value={form.perfilAcademico} onChange={set('perfilAcademico')} />
              </Field>
              <Field label="Pregrado">
                <input style={inputStyle} value={form.pregrado} onChange={set('pregrado')} />
              </Field>
              <Field label="Especialización">
                <input style={inputStyle} value={form.especializacion} onChange={set('especializacion')} />
              </Field>
              <Field label="Maestría">
                <input style={inputStyle} value={form.maestria} onChange={set('maestria')} />
              </Field>
              <Field label="Doctorado">
                <input style={inputStyle} value={form.doctorado} onChange={set('doctorado')} />
              </Field>
              <Field label="Posdoctorado">
                <input style={inputStyle} value={form.posDoctorado} onChange={set('posDoctorado')} />
              </Field>
              <Field label="Investigación">
                <input style={inputStyle} value={form.investigacion} onChange={set('investigacion')} />
              </Field>
            </div>
          )}

          {activeTab === 'contacto' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Correo Institucional">
                <input style={inputStyle} type="email" value={form.correoInstitucional} onChange={set('correoInstitucional')} placeholder="docente@esap.edu.co" />
              </Field>
              <Field label="Correo Personal">
                <input style={inputStyle} type="email" value={form.correoAlternativo} onChange={set('correoAlternativo')} />
              </Field>
              <Field label="Teléfono">
                <input style={inputStyle} value={form.telefono} onChange={set('telefono')} placeholder="Ej: 3001234567" />
              </Field>
            </div>
          )}

          {activeTab === 'personal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Género">
                <select style={selectStyle} value={form.genero} onChange={set('genero')}>
                  <option value="">Seleccionar...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="No Binario">No Binario</option>
                  <option value="Prefiero no indicar">Prefiero no indicar</option>
                </select>
              </Field>
              <Field label="Fecha de Nacimiento">
                <input style={inputStyle} type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', color: '#475569' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', background: saving ? '#94a3b8' : '#1d4ed8', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Docente'}
          </button>
        </div>
      </div>
    </div>
  );
}
