/**
 * GestionConflictosPTA — Panel de gestión de conflictos docente-dirección
 *
 * Funcionalidades:
 * - Registro de conflictos con clasificación por tipo y gravedad
 * - Workflow de mediación en 5 etapas: Registrado → Asignado → En Mediación → Acuerdo → Cerrado
 * - Asignación de mediador por territorial
 * - Timeline de intervenciones con adjuntos
 * - Dashboard de estadísticas de conflictos
 * - Filtros por territorial, tipo, gravedad, estado
 * - Detalle expandido con historial completo
 * - Indicadores de tiempo de resolución y tasa de éxito
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import {
  Shield, AlertTriangle, Users, MessageSquare, Clock,
  CheckCircle, XCircle, ArrowRight, Eye, X, Filter,
  Search, ChevronDown, Scale, Gavel, FileText,
  UserCheck, Timer, Target, TrendingUp, Award,
  Plus, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

type EstadoConflicto = 'registrado' | 'asignado' | 'en_mediacion' | 'acuerdo' | 'cerrado' | 'escalado_sna';
type TipoConflicto = 'carga_horaria' | 'asignatura' | 'horario' | 'dedicacion' | 'investigacion' | 'extension' | 'otro';
type Gravedad = 'baja' | 'media' | 'alta' | 'critica';

interface Conflicto {
  id: string;
  titulo: string;
  tipo: TipoConflicto;
  gravedad: Gravedad;
  estado: EstadoConflicto;
  docenteNombre: string;
  directorNombre: string;
  programa: string;
  territorial: string;
  periodo: string;
  fechaRegistro: string;
  fechaUltimaActualizacion: string;
  mediador?: string;
  diasAbierto: number;
  descripcion: string;
  intervenciones: Intervencion[];
  ptaId: string;
}

interface Intervencion {
  fecha: string;
  actor: string;
  tipo: 'registro' | 'asignacion' | 'nota' | 'reunion' | 'propuesta' | 'acuerdo' | 'escalamiento';
  descripcion: string;
}

const TIPOS_CONFLICTO: Record<TipoConflicto, { label: string; color: string }> = {
  carga_horaria: { label: 'Carga horaria', color: '#D97706' },
  asignatura: { label: 'Asignatura', color: '#003DA5' },
  horario: { label: 'Horario', color: '#0891B2' },
  dedicacion: { label: 'Dedicación', color: '#7C3AED' },
  investigacion: { label: 'Investigación', color: '#059669' },
  extension: { label: 'Extensión', color: '#DC2626' },
  otro: { label: 'Otro', color: '#6B7280' },
};

const GRAVEDAD_CONFIG: Record<Gravedad, { label: string; color: string; bg: string }> = {
  baja: { label: 'Baja', color: '#059669', bg: '#D1FAE5' },
  media: { label: 'Media', color: '#D97706', bg: '#FEF3C7' },
  alta: { label: 'Alta', color: '#DC2626', bg: '#FEE2E2' },
  critica: { label: 'Crítica', color: '#991B1B', bg: '#FEF2F2' },
};

const ESTADO_CONFLICTO: Record<EstadoConflicto, { label: string; color: string; bg: string; step: number }> = {
  registrado: { label: 'Registrado', color: '#6B7280', bg: '#F3F4F6', step: 1 },
  asignado: { label: 'Asignado', color: '#D97706', bg: '#FEF3C7', step: 2 },
  en_mediacion: { label: 'En Mediación', color: '#7C3AED', bg: '#F3E8FF', step: 3 },
  acuerdo: { label: 'Acuerdo', color: '#059669', bg: '#D1FAE5', step: 4 },
  cerrado: { label: 'Cerrado', color: '#111827', bg: '#F9FAFB', step: 5 },
  escalado_sna: { label: 'Escalado SNA', color: '#991B1B', bg: '#FEF2F2', step: 0 },
};

const MEDIADORES = [
  'Dr. Ricardo Vargas M.', 'Dra. Claudia Suárez R.', 'Dr. Fernando Castillo B.',
  'Dra. Ana María López T.', 'Dr. Jorge Pardo L.',
];

function generateDemoConflictos(): Conflicto[] {
  const data: Array<Omit<Conflicto, 'intervenciones'> & { intervenciones: Intervencion[] }> = [
    {
      id: 'conf-1', titulo: 'Exceso de carga horaria docencia vs. investigación',
      tipo: 'carga_horaria', gravedad: 'alta', estado: 'en_mediacion',
      docenteNombre: 'Carlos A. Martínez', directorNombre: 'Dra. María E. Gómez',
      programa: 'Adm. Pública', territorial: 'CUNDINAMARCA', periodo: '2026-1',
      fechaRegistro: '2026-02-10', fechaUltimaActualizacion: '2026-03-08',
      mediador: 'Dr. Ricardo Vargas M.', diasAbierto: 30, ptaId: 'pta-1',
      descripcion: 'El docente objeta que la distribución 80% docencia / 20% investigación no corresponde con su perfil investigativo ni con los compromisos adquiridos en su plan de trabajo anterior.',
      intervenciones: [
        { fecha: '2026-02-10', actor: 'Sistema', tipo: 'registro', descripcion: 'Conflicto registrado tras objeción del docente al PTA propuesto.' },
        { fecha: '2026-02-14', actor: 'Coordinador Territorial', tipo: 'asignacion', descripcion: 'Asignado al mediador Dr. Ricardo Vargas M.' },
        { fecha: '2026-02-20', actor: 'Dr. Ricardo Vargas M.', tipo: 'reunion', descripcion: 'Primera reunión de mediación. Se escucharon posiciones de ambas partes. El docente presenta evidencia de publicaciones y proyectos activos.' },
        { fecha: '2026-03-01', actor: 'Dr. Ricardo Vargas M.', tipo: 'propuesta', descripcion: 'Propuesta de distribución: 60% docencia, 30% investigación, 10% extensión. Pendiente aceptación de las partes.' },
        { fecha: '2026-03-08', actor: 'Dra. María E. Gómez', tipo: 'nota', descripcion: 'La dirección acepta el 70/20/10 como máximo. Se agenda nueva reunión.' },
      ],
    },
    {
      id: 'conf-2', titulo: 'Desacuerdo en asignatura asignada — Derecho Administrativo',
      tipo: 'asignatura', gravedad: 'media', estado: 'acuerdo',
      docenteNombre: 'Juan D. López', directorNombre: 'Dra. María E. Gómez',
      programa: 'C. Políticas', territorial: 'ANTIOQUIA', periodo: '2026-1',
      fechaRegistro: '2026-01-28', fechaUltimaActualizacion: '2026-03-05',
      mediador: 'Dra. Claudia Suárez R.', diasAbierto: 36, ptaId: 'pta-3',
      descripcion: 'El docente solicita cambio de asignatura Derecho Administrativo por Políticas Públicas Comparadas, argumentando mayor afinidad con su área de especialización.',
      intervenciones: [
        { fecha: '2026-01-28', actor: 'Sistema', tipo: 'registro', descripcion: 'Conflicto registrado por solicitud de cambio de asignatura.' },
        { fecha: '2026-02-01', actor: 'Coordinador', tipo: 'asignacion', descripcion: 'Asignado a la mediadora Dra. Claudia Suárez R.' },
        { fecha: '2026-02-15', actor: 'Dra. Claudia Suárez R.', tipo: 'reunion', descripcion: 'Reunión con ambas partes. Se revisaron perfiles y necesidades del programa.' },
        { fecha: '2026-03-01', actor: 'Dra. Claudia Suárez R.', tipo: 'propuesta', descripcion: 'Propuesta: el docente dicta Políticas Públicas Comparadas en jornada diurna y un grupo de Derecho Administrativo en nocturna.' },
        { fecha: '2026-03-05', actor: 'Ambas partes', tipo: 'acuerdo', descripcion: 'Acuerdo alcanzado. El docente acepta dictar ambas asignaturas con ajuste de horas.' },
      ],
    },
    {
      id: 'conf-3', titulo: 'Conflicto de horarios entre sedes',
      tipo: 'horario', gravedad: 'baja', estado: 'cerrado',
      docenteNombre: 'Ana L. Rodríguez', directorNombre: 'Dr. Pedro J. Hernández',
      programa: 'Economía Pública', territorial: 'VALLE DEL CAUCA', periodo: '2026-1',
      fechaRegistro: '2026-01-15', fechaUltimaActualizacion: '2026-02-10',
      mediador: 'Dr. Fernando Castillo B.', diasAbierto: 26, ptaId: 'pta-4',
      descripcion: 'Cruce de horarios entre clases presenciales en sede Cali y sesiones virtuales para la territorial Nariño.',
      intervenciones: [
        { fecha: '2026-01-15', actor: 'Sistema', tipo: 'registro', descripcion: 'Conflicto registrado por cruce de horarios.' },
        { fecha: '2026-01-18', actor: 'Coordinador', tipo: 'asignacion', descripcion: 'Asignado al mediador Dr. Fernando Castillo B.' },
        { fecha: '2026-01-25', actor: 'Dr. Fernando Castillo B.', tipo: 'propuesta', descripcion: 'Reorganización de horarios: presenciales L-M, virtuales J-V.' },
        { fecha: '2026-02-10', actor: 'Ambas partes', tipo: 'acuerdo', descripcion: 'Caso cerrado. Horarios reorganizados satisfactoriamente.' },
      ],
    },
    {
      id: 'conf-4', titulo: 'Reclasificación de dedicación HC a MT',
      tipo: 'dedicacion', gravedad: 'critica', estado: 'escalado_sna',
      docenteNombre: 'Roberto A. Díaz', directorNombre: 'Dra. Luz M. Castillo',
      programa: 'Gestión Pública', territorial: 'ATLÁNTICO', periodo: '2026-1',
      fechaRegistro: '2026-02-01', fechaUltimaActualizacion: '2026-03-10',
      diasAbierto: 39, ptaId: 'pta-7',
      descripcion: 'El docente solicita reclasificación de Hora Cátedra a Medio Tiempo, argumentando que las horas reales exceden las contractuales. La dirección no tiene presupuesto disponible.',
      intervenciones: [
        { fecha: '2026-02-01', actor: 'Sistema', tipo: 'registro', descripcion: 'Conflicto registrado por solicitud de reclasificación de dedicación.' },
        { fecha: '2026-02-05', actor: 'Coordinador', tipo: 'asignacion', descripcion: 'Asignado al equipo de mediación territorial.' },
        { fecha: '2026-02-20', actor: 'Mediador', tipo: 'reunion', descripcion: 'No se logró acuerdo. La dirección mantiene que no hay viabilidad presupuestal.' },
        { fecha: '2026-03-10', actor: 'Sistema', tipo: 'escalamiento', descripcion: 'Caso escalado al Sistema Nacional de Arbitraje por falta de acuerdo en mediación.' },
      ],
    },
    {
      id: 'conf-5', titulo: 'Horas de extensión no reconocidas en PTA',
      tipo: 'extension', gravedad: 'media', estado: 'registrado',
      docenteNombre: 'Fernando A. García', directorNombre: 'Dra. María E. Gómez',
      programa: 'Adm. Pública', territorial: 'SANTANDER', periodo: '2026-1',
      fechaRegistro: '2026-03-08', fechaUltimaActualizacion: '2026-03-08',
      diasAbierto: 4, ptaId: 'pta-9',
      descripcion: 'El docente solicita que 80 horas de proyectos de extensión con comunidades locales sean reconocidas dentro del PTA.',
      intervenciones: [
        { fecha: '2026-03-08', actor: 'Sistema', tipo: 'registro', descripcion: 'Conflicto registrado por no reconocimiento de horas de extensión.' },
      ],
    },
    {
      id: 'conf-6', titulo: 'Reducción unilateral de horas de investigación',
      tipo: 'investigacion', gravedad: 'alta', estado: 'asignado',
      docenteNombre: 'Mónica Suárez', directorNombre: 'Dr. Pedro J. Hernández',
      programa: 'C. Políticas', territorial: 'BOLÍVAR', periodo: '2026-1',
      fechaRegistro: '2026-03-01', fechaUltimaActualizacion: '2026-03-06',
      mediador: 'Dra. Ana María López T.', diasAbierto: 11, ptaId: 'pta-10',
      descripcion: 'La dirección redujo las horas de investigación de 160 a 80 sin consulta previa, afectando un proyecto activo financiado por Minciencias.',
      intervenciones: [
        { fecha: '2026-03-01', actor: 'Sistema', tipo: 'registro', descripcion: 'Conflicto registrado por reducción de horas de investigación.' },
        { fecha: '2026-03-06', actor: 'Coordinador', tipo: 'asignacion', descripcion: 'Asignada la mediadora Dra. Ana María López T. Se agenda reunión para el 15 de marzo.' },
      ],
    },
  ];
  return data;
}

const PIE_COLORS = ['#059669', '#D97706', '#DC2626', '#991B1B'];

export function GestionConflictosPTA() {
  const [conflictos, setConflictos] = useState<Conflicto[]>(generateDemoConflictos);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista' | 'detalle'>('dashboard');
  const [selectedConflicto, setSelectedConflicto] = useState<Conflicto | null>(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroGravedad, setFiltroGravedad] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNuevoConflicto, setShowNuevoConflicto] = useState(false);

  const filtered = useMemo(() => {
    let result = conflictos;
    if (filtroEstado) result = result.filter(c => c.estado === filtroEstado);
    if (filtroTipo) result = result.filter(c => c.tipo === filtroTipo);
    if (filtroGravedad) result = result.filter(c => c.gravedad === filtroGravedad);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.docenteNombre.toLowerCase().includes(q) || c.titulo.toLowerCase().includes(q));
    }
    return result;
  }, [conflictos, filtroEstado, filtroTipo, filtroGravedad, searchQuery]);

  const stats = useMemo(() => {
    const total = conflictos.length;
    const abiertos = conflictos.filter(c => !['cerrado', 'escalado_sna'].includes(c.estado)).length;
    const resueltos = conflictos.filter(c => c.estado === 'cerrado').length;
    const escalados = conflictos.filter(c => c.estado === 'escalado_sna').length;
    const diasPromedio = conflictos.length > 0
      ? Math.round(conflictos.reduce((s, c) => s + c.diasAbierto, 0) / conflictos.length)
      : 0;
    const tasaExito = total > 0 ? Math.round(((resueltos) / total) * 100) : 0;
    return { total, abiertos, resueltos, escalados, diasPromedio, tasaExito };
  }, [conflictos]);

  const porTipo = useMemo(() =>
    Object.entries(TIPOS_CONFLICTO).map(([k, v]) => ({
      tipo: v.label,
      cantidad: conflictos.filter(c => c.tipo === k).length,
      color: v.color,
    })).filter(d => d.cantidad > 0),
    [conflictos]
  );

  const porGravedad = useMemo(() =>
    Object.entries(GRAVEDAD_CONFIG).map(([k, v]) => ({
      name: v.label,
      value: conflictos.filter(c => c.gravedad === k).length,
    })).filter(d => d.value > 0),
    [conflictos]
  );

  const avanzarEstado = (confId: string) => {
    setConflictos(prev => prev.map(c => {
      if (c.id !== confId) return c;
      const flow: Record<string, EstadoConflicto> = {
        registrado: 'asignado',
        asignado: 'en_mediacion',
        en_mediacion: 'acuerdo',
        acuerdo: 'cerrado',
      };
      const next = flow[c.estado];
      if (!next) return c;
      const intervencion: Intervencion = {
        fecha: new Date().toISOString().split('T')[0],
        actor: 'Sistema',
        tipo: next === 'asignado' ? 'asignacion' : next === 'acuerdo' ? 'acuerdo' : 'nota',
        descripcion: `Estado avanzado a: ${ESTADO_CONFLICTO[next].label}`,
      };
      return { ...c, estado: next, fechaUltimaActualizacion: new Date().toISOString().split('T')[0], intervenciones: [...c.intervenciones, intervencion] };
    }));
    toast.success('Estado del conflicto actualizado');
  };

  const escalarSNA = (confId: string) => {
    setConflictos(prev => prev.map(c => {
      if (c.id !== confId) return c;
      const intervencion: Intervencion = {
        fecha: new Date().toISOString().split('T')[0],
        actor: 'Sistema',
        tipo: 'escalamiento',
        descripcion: 'Conflicto escalado al Sistema Nacional de Arbitraje (SNA)',
      };
      return { ...c, estado: 'escalado_sna' as EstadoConflicto, fechaUltimaActualizacion: new Date().toISOString().split('T')[0], intervenciones: [...c.intervenciones, intervencion] };
    }));
    toast.success('Conflicto escalado al SNA');
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield style={{ width: 24, height: 24, color: '#003DA5' }} />
            Gestión de Conflictos Docente–Dirección
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '4px 0 0' }}>
            Workflow de mediación en 5 etapas • {conflictos.length} conflictos registrados
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Total', value: stats.total, color: '#111827', bg: '#F9FAFB', icon: FileText },
          { label: 'Abiertos', value: stats.abiertos, color: '#D97706', bg: '#FEF3C7', icon: Clock },
          { label: 'Resueltos', value: stats.resueltos, color: '#059669', bg: '#D1FAE5', icon: CheckCircle },
          { label: 'Escalados SNA', value: stats.escalados, color: '#991B1B', bg: '#FEF2F2', icon: Scale },
          { label: 'Días promedio', value: `${stats.diasPromedio}d`, color: '#003DA5', bg: '#EFF6FF', icon: Timer },
          { label: 'Tasa éxito', value: `${stats.tasaExito}%`, color: stats.tasaExito >= 50 ? '#059669' : '#DC2626', bg: stats.tasaExito >= 50 ? '#D1FAE5' : '#FEE2E2', icon: Target },
        ].map(s => (
          <div key={s.label} style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '10px 14px' }}>
            <s.icon style={{ width: 14, height: 14, color: s.color, marginBottom: 4 }} />
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 500, color: '#6B7280' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {[
          { key: 'dashboard' as const, label: 'Dashboard', icon: TrendingUp },
          { key: 'lista' as const, label: 'Conflictos', icon: FileText },
          { key: 'detalle' as const, label: 'Detalle', icon: Eye, disabled: !selectedConflicto },
        ].map(tab => (
          <button key={tab.key} onClick={() => !tab.disabled && setActiveTab(tab.key)} disabled={tab.disabled} style={{
            padding: '7px 14px', borderRadius: 8,
            border: activeTab === tab.key ? '1.5px solid #003DA5' : '1px solid #E5E7EB',
            background: activeTab === tab.key ? '#EFF6FF' : 'white',
            color: tab.disabled ? '#D1D5DB' : activeTab === tab.key ? '#003DA5' : '#6B7280',
            fontSize: '0.78rem', fontWeight: 600, cursor: tab.disabled ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <tab.icon style={{ width: 13, height: 13 }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>Conflictos por tipo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={porTipo} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="tipo" tick={{ fontSize: 9, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
                <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} name="Conflictos">
                  {porTipo.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px', minWidth: 0, overflow: 'hidden' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>Distribución por gravedad</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porGravedad} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: '#9CA3AF' }}>
                  {porGravedad.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline visualization */}
          <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', padding: '16px 20px' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 14 }}>Pipeline de mediación</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['registrado', 'asignado', 'en_mediacion', 'acuerdo', 'cerrado'] as EstadoConflicto[]).map((estado, i) => {
                const cfg = ESTADO_CONFLICTO[estado];
                const count = conflictos.filter(c => c.estado === estado).length;
                return (
                  <div key={estado} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {i > 0 && <div style={{ position: 'absolute', left: -16, top: 20, width: 24, height: 2, background: '#E5E7EB' }} />}
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.88rem', color: cfg.color, marginBottom: 6 }}>
                      {count}
                    </div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 600, color: cfg.color, textAlign: 'center' }}>{cfg.label}</div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingLeft: 8, borderLeft: '2px dashed #FCA5A5' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FEF2F2', border: '2px solid #991B1B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.88rem', color: '#991B1B', marginBottom: 6 }}>
                  {conflictos.filter(c => c.estado === 'escalado_sna').length}
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#991B1B', textAlign: 'center' }}>SNA</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LISTA TAB ═══ */}
      {activeTab === 'lista' && (
        <div>
          {/* Filters */}
          <div style={{ background: 'white', borderRadius: 10, border: '1px solid #E5E7EB', padding: '8px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Filter style={{ width: 13, height: 13, color: '#9CA3AF' }} />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white' }}>
              <option value="">Todos estados</option>
              {Object.entries(ESTADO_CONFLICTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white' }}>
              <option value="">Todos tipos</option>
              {Object.entries(TIPOS_CONFLICTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filtroGravedad} onChange={e => setFiltroGravedad(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', background: 'white' }}>
              <option value="">Todas gravedades</option>
              {Object.entries(GRAVEDAD_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <div style={{ flex: 1, minWidth: 130, position: 'relative' }}>
              <Search style={{ width: 12, height: 12, color: '#9CA3AF', position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." style={{ width: '100%', padding: '4px 8px 4px 22px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: '0.78rem', outline: 'none' }} />
            </div>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(conf => {
              const tipoCfg = TIPOS_CONFLICTO[conf.tipo];
              const gravCfg = GRAVEDAD_CONFIG[conf.gravedad];
              const estadoCfg = ESTADO_CONFLICTO[conf.estado];
              return (
                <motion.div key={conf.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => { setSelectedConflicto(conf); setActiveTab('detalle'); }}
                  style={{
                    background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: '14px 18px', cursor: 'pointer',
                    borderLeft: `4px solid ${gravCfg.color}`, transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 250 }}>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#111827', fontSize: '0.88rem' }}>{conf.titulo}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ padding: '1px 6px', borderRadius: 4, background: estadoCfg.bg, color: estadoCfg.color, fontSize: '0.58rem', fontWeight: 700 }}>{estadoCfg.label}</span>
                        <span style={{ padding: '1px 6px', borderRadius: 4, background: gravCfg.bg, color: gravCfg.color, fontSize: '0.58rem', fontWeight: 700 }}>{gravCfg.label}</span>
                        <span style={{ padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: tipoCfg.color, fontSize: '0.58rem', fontWeight: 600 }}>{tipoCfg.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, fontSize: '0.72rem', color: '#6B7280', flexWrap: 'wrap' }}>
                        <span><strong>{conf.docenteNombre}</strong> vs <strong>{conf.directorNombre}</strong></span>
                        <span>• {conf.territorial}</span>
                        <span>• {conf.diasAbierto}d abierto</span>
                        {conf.mediador && <span>• Mediador: {conf.mediador}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!['cerrado', 'escalado_sna'].includes(conf.estado) && (
                        <button onClick={e => { e.stopPropagation(); avanzarEstado(conf.id); }}
                          style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <ArrowRight style={{ width: 10, height: 10 }} /> Avanzar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ DETALLE TAB ═══ */}
      {activeTab === 'detalle' && selectedConflicto && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
          {/* Main detail */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>{selectedConflicto.titulo}</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {!['cerrado', 'escalado_sna'].includes(selectedConflicto.estado) && (
                  <>
                    <button onClick={() => avanzarEstado(selectedConflicto.id)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#003DA5', color: 'white', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <ArrowRight style={{ width: 10, height: 10 }} /> Avanzar
                    </button>
                    <button onClick={() => escalarSNA(selectedConflicto.id)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#991B1B', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Scale style={{ width: 10, height: 10 }} /> Escalar SNA
                    </button>
                  </>
                )}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {/* Description */}
              <div style={{ padding: '12px 16px', borderRadius: 8, background: '#F9FAFB', border: '1px solid #F3F4F6', marginBottom: 18, fontSize: '0.82rem', color: '#374151', lineHeight: 1.6 }}>
                {selectedConflicto.descripcion}
              </div>

              {/* Stepper */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
                {(['registrado', 'asignado', 'en_mediacion', 'acuerdo', 'cerrado'] as EstadoConflicto[]).map((est, i) => {
                  const cfg = ESTADO_CONFLICTO[est];
                  const current = ESTADO_CONFLICTO[selectedConflicto.estado];
                  const isActive = cfg.step <= current.step && selectedConflicto.estado !== 'escalado_sna';
                  const isCurrent = est === selectedConflicto.estado;
                  return (
                    <div key={est} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                      {i > 0 && <div style={{ position: 'absolute', left: 0, top: 10, width: '50%', height: 3, background: isActive ? cfg.color : '#E5E7EB' }} />}
                      {i < 4 && <div style={{ position: 'absolute', right: 0, top: 10, width: '50%', height: 3, background: (cfg.step < current.step && selectedConflicto.estado !== 'escalado_sna') ? ESTADO_CONFLICTO[(['registrado', 'asignado', 'en_mediacion', 'acuerdo', 'cerrado'] as EstadoConflicto[])[i + 1]].color : '#E5E7EB' }} />}
                      <div style={{
                        width: isCurrent ? 24 : 20, height: isCurrent ? 24 : 20, borderRadius: '50%', zIndex: 1,
                        background: isActive ? cfg.color : '#E5E7EB',
                        border: isCurrent ? '3px solid white' : 'none',
                        boxShadow: isCurrent ? `0 0 0 2px ${cfg.color}` : 'none',
                      }} />
                      <div style={{ fontSize: '0.52rem', fontWeight: 600, color: isActive ? cfg.color : '#9CA3AF', marginTop: 4, textAlign: 'center' }}>{cfg.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Timeline */}
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#111827', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock style={{ width: 14, height: 14, color: '#003DA5' }} /> Historial de intervenciones ({selectedConflicto.intervenciones.length})
              </h4>
              <div style={{ paddingLeft: 10 }}>
                {selectedConflicto.intervenciones.map((int, i) => {
                  const typeColor: Record<string, string> = { registro: '#6B7280', asignacion: '#D97706', nota: '#003DA5', reunion: '#7C3AED', propuesta: '#0891B2', acuerdo: '#059669', escalamiento: '#DC2626' };
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10, position: 'relative', marginBottom: 10 }}>
                      {i < selectedConflicto.intervenciones.length - 1 && (
                        <div style={{ position: 'absolute', left: 5, top: 14, bottom: -10, width: 2, background: '#E5E7EB' }} />
                      )}
                      <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 3, background: typeColor[int.tipo] || '#6B7280' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827' }}>{int.actor}</span>
                          <span style={{ padding: '0 4px', borderRadius: 3, fontSize: '0.52rem', fontWeight: 700, background: '#F3F4F6', color: typeColor[int.tipo] || '#6B7280', textTransform: 'uppercase' }}>{int.tipo}</span>
                          <span style={{ fontSize: '0.62rem', color: '#9CA3AF' }}>{new Date(int.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#374151', marginTop: 2, lineHeight: 1.4 }}>{int.descripcion}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 16 }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', marginBottom: 10 }}>Información del conflicto</h4>
              {[
                { label: 'Estado', value: ESTADO_CONFLICTO[selectedConflicto.estado].label, color: ESTADO_CONFLICTO[selectedConflicto.estado].color },
                { label: 'Gravedad', value: GRAVEDAD_CONFIG[selectedConflicto.gravedad].label, color: GRAVEDAD_CONFIG[selectedConflicto.gravedad].color },
                { label: 'Tipo', value: TIPOS_CONFLICTO[selectedConflicto.tipo].label },
                { label: 'Territorial', value: selectedConflicto.territorial },
                { label: 'Programa', value: selectedConflicto.programa },
                { label: 'Periodo', value: selectedConflicto.periodo },
                { label: 'Días abierto', value: `${selectedConflicto.diasAbierto} días` },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.72rem' }}>
                  <span style={{ color: '#6B7280', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: item.color || '#111827' }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', padding: 16 }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', marginBottom: 10 }}>Partes involucradas</h4>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: '#F9FAFB', marginBottom: 6 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Docente</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{selectedConflicto.docenteNombre}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: '#F9FAFB', marginBottom: 6 }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>Director(a)</div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{selectedConflicto.directorNombre}</div>
              </div>
              {selectedConflicto.mediador && (
                <div style={{ padding: '8px 10px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#003DA5', textTransform: 'uppercase' }}>Mediador</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{selectedConflicto.mediador}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
