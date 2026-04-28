import { X, User, Building2, GraduationCap, Briefcase, Mail, Phone, Edit2 } from 'lucide-react';

interface Props {
  docente: any;
  onClose: () => void;
  onEdit: (d: any) => void;
}

function Row({ label, value }: { label: string; value?: any }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '0.75rem', color: '#64748b', minWidth: 180, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 500 }}>{String(value)}</span>
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${color}20` }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} color={color} />
        </div>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export function BancoDocenteDetalle({ docente: d, onClose, onEdit }: Props) {
  const nombreCompleto = d.nombre_completo || [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido].filter(Boolean).join(' ');
  const iniciales = (nombreCompleto || 'D').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {iniciales}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{nombreCompleto}</h2>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: 999 }}>CC {d.documento_identidad}</span>
                <span style={{ fontSize: '0.72rem', color: '#1d4ed8', background: '#dbeafe', padding: '2px 8px', borderRadius: 999 }}>{d.territorial}</span>
                <span style={{ fontSize: '0.72rem', color: d.estado === 'ACTIVO' ? '#059669' : '#dc2626', background: d.estado === 'ACTIVO' ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: 999 }}>{d.estado}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(d)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
              <Edit2 size={13} /> Editar
            </button>
            <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} color="#64748b" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          <Section title="Datos de Vinculación" icon={Briefcase} color="#1d4ed8">
            <Row label="Tipo de Vinculación" value={d.vinculacion} />
            <Row label="Dedicación" value={d.dedicacion} />
            <Row label="Horas Asignables" value={d.horas_programables ? `${d.horas_programables}h` : null} />
            <Row label="Categoría / Escalafón" value={d.categoria} />
            <Row label="Origen de Vinculación" value={d.origen_vinculacion} />
            <Row label="Acto Administrativo" value={d.acto_administrativo_vinculacion} />
            <Row label="Puntaje Salarial" value={d.puntaje_salarial} />
            <Row label="Inicio Vinculación" value={d.inicio_vinculacion ? new Date(d.inicio_vinculacion).toLocaleDateString('es-CO') : null} />
            <Row label="Fin Vinculación" value={d.fin_vinculacion ? new Date(d.fin_vinculacion).toLocaleDateString('es-CO') : null} />
            <Row label="Situación Administrativa" value={d.situacion_administrativa} />
            <Row label="Última Evaluación" value={d.ultima_evaluacion} />
          </Section>

          <Section title="Formación Académica" icon={GraduationCap} color="#7c3aed">
            <Row label="Nivel de Formación" value={d.nivel_formacion} />
            <Row label="Perfil Académico PRO" value={d.perfil_academico_pro} />
            <Row label="Perfil Académico" value={d.perfil_academico} />
            <Row label="Núcleo Temático" value={d.nucleo_tematico} />
            <Row label="Pregrado" value={d.pregrado} />
            <Row label="Especialización" value={d.especializacion} />
            <Row label="Maestría" value={d.maestria} />
            <Row label="Doctorado" value={d.doctorado} />
            <Row label="Posdoctorado" value={d.posdoctorado} />
            <Row label="Investigación" value={d.investigacion} />
          </Section>

          <Section title="Datos de Contacto" icon={Mail} color="#059669">
            <Row label="Correo Institucional" value={d.correo_institucional} />
            <Row label="Correo Personal" value={d.correo_personal} />
            <Row label="Teléfono" value={d.telefono} />
          </Section>

          <Section title="Datos Personales" icon={User} color="#d97706">
            <Row label="Género" value={d.genero} />
            <Row label="Fecha de Nacimiento" value={d.nacimiento ? new Date(d.nacimiento).toLocaleDateString('es-CO') : null} />
            <Row label="Edad" value={d.edad ? `${d.edad} años` : null} />
            <Row label="Rango de Edad" value={d.rango_edad} />
          </Section>

        </div>
      </div>
    </div>
  );
}
