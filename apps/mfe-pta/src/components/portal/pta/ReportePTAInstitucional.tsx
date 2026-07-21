/**
 * ReportePTAInstitucional — Reporte oficial estilo GTH-F081 (modal + impresión).
 *
 * Nota de estilos: el index.css del MFE es un snapshot precompilado de Tailwind,
 * por lo que las clases arbitrarias (bg-[#203764], grid-cols-[...]) no existen.
 * Todo el layout crítico va con estilos inline; la impresión se aísla con un
 * bloque @media print propio (ver <style> al inicio del render).
 */
import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend } from 'recharts';
import { PTA_COLORS } from '../../pta/shared/ptaColors';

interface ReportePTAInstitucionalProps {
  pta: any;
  userPerfil: any;
  onClose: () => void;
  isParcial?: boolean;
  certificadoId?: string;
  signedAt?: string;
  /** Registros reales de aprobación por componente (getComponentesAprobacion). Opcional. */
  componentesAprobacion?: any[];
}

const NAVY = '#203764';
const BAND = '#5B9BD5';
const HEAD_BG = '#D9E1F2';

const ESTADO_COMP_CFG: Record<string, { label: string; color: string; bg: string }> = {
  aprobado: { label: 'Aprobado', color: '#047857', bg: '#D1FAE5' },
  devuelto: { label: 'Devuelto', color: '#B91C1C', bg: '#FEE2E2' },
  pendiente: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7' },
};

/** 'YYYY-MM-DD...' → 'DD/MM/YYYY'. Devuelve null si no hay fecha válida. */
function fmtFechaReporte(v?: string): string | null {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-CO');
}

/** Celda etiqueta+valor de la sección de identificación. */
function CampoIdent({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ padding: '6px 10px', borderRight: '1px solid #CBD5E1', borderBottom: '1px solid #CBD5E1', minWidth: 0 }}>
      <div style={{ fontSize: '0.56rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827', marginTop: 2, overflowWrap: 'anywhere' }}>{value ?? '—'}</div>
    </div>
  );
}

/** Franja de título azul del formato oficial. */
function BandaTitulo({ children }: { children: any }) {
  return (
    <div style={{ background: BAND, color: '#fff', textAlign: 'center', fontWeight: 800, padding: '5px 8px', borderBottom: `3px solid ${NAVY}`, textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.03em' }}>
      {children}
    </div>
  );
}

export function ReportePTAInstitucional({
  pta, userPerfil, onClose, isParcial = true, certificadoId, signedAt, componentesAprobacion = [],
}: ReportePTAInstitucionalProps) {
  // ── Cálculos de horas (priorizan agregados del backend: incluyen multiplicadores) ──
  const horasDisp = pta.horas_asignables || pta.horas_a_programar || 800;

  const asignaturas = pta.asignaturas || [];
  const proyectosInv = (pta?.investigacion_proyecto?.nombre || pta?.investigacion_proyecto?.rol)
    ? [pta.investigacion_proyecto]
    : (pta?.investigacion?.proyectos || []);
  const actInv = pta?.investigacion_actividades || pta?.investigacion?.actividades || [];
  const extActs = Array.isArray(pta?.extension_actividades)
    ? pta.extension_actividades
    : (pta?.extension ? (Object.values(pta.extension).flat() as any[]) : []);
  const compActs = Array.isArray(pta?.complementarias)
    ? pta.complementarias
    : (pta?.complementarias?.actividades || []);

  const horasDocencia = pta.horas_docencia ?? asignaturas.reduce((sum: number, a: any) => sum + (a.total_horas || a.horas || 0), 0);
  const horasInvestigacion = pta.horas_investigacion ?? (proyectosInv.reduce((s: number, p: any) => s + (p.horas_solicitadas || 0), 0) || actInv.reduce((s: number, a: any) => s + (a.horas_total || a.horas || 0), 0));
  const horasExtension = pta.horas_extension ?? extActs.reduce((s: number, a: any) => s + (a.horas || 0), 0);
  const horasComplementarias = pta.horas_complementarias ?? compActs.reduce((s: number, a: any) => s + (a.horas || 0), 0);
  const horasProg = pta.horas_totales ?? pta.total_horas_programadas ?? (horasDocencia + horasInvestigacion + horasExtension + horasComplementarias);

  const getPct = (val: number) => horasProg > 0 ? Math.round((val / horasProg) * 100) : 0;

  // ── Estado real de aprobación por componente (del DTO enriquecido del backend) ──
  const compEstados: any[] = Array.isArray(pta?.componentes_estado) ? pta.componentes_estado : [];
  const estadoDe = (key: string): string => {
    if (!isParcial) return 'aprobado';
    return compEstados.find((c: any) => c?.key === key)?.estado || 'pendiente';
  };

  const componentes = [
    { key: 'academica', label: 'DOCENCIA', horas: horasDocencia, color: PTA_COLORS.DOCENCIA },
    { key: 'investigacion', label: 'INVESTIGACIÓN', horas: horasInvestigacion, color: PTA_COLORS.INVESTIGACION },
    { key: 'extension', label: 'EXTENSIÓN ACADÉMICA', horas: horasExtension, color: PTA_COLORS.EXTENSION },
    { key: 'complementarias', label: 'ACT. COMPLEMENTARIAS', horas: horasComplementarias, color: PTA_COLORS.COMPLEMENTARIAS },
  ].map(c => {
    const estado = c.horas > 0 ? estadoDe(c.key) : 'aprobado';
    const aprobadas = estado === 'aprobado' ? c.horas : 0;
    return { ...c, estado, aprobadas, pendientes: c.horas - aprobadas, pctAprob: c.horas > 0 ? Math.round((aprobadas / c.horas) * 100) : 100 };
  });

  const totalAprobadas = componentes.reduce((s, c) => s + c.aprobadas, 0);
  const pctGlobal = horasProg > 0 ? Math.round((totalAprobadas / horasProg) * 100) : 0;

  // ── Fechas del periodo (mín/máx reales de las actividades del PTA) ──
  const todasFechas: string[] = [
    ...asignaturas.map((a: any) => a.fecha_inicio), ...asignaturas.map((a: any) => a.fecha_fin),
    ...extActs.map((a: any) => a.fecha_inicio), ...extActs.map((a: any) => a.fecha_fin),
    ...compActs.map((a: any) => a.fecha_inicio), ...compActs.map((a: any) => a.fecha_fin),
    ...actInv.map((a: any) => a.fecha_inicio), ...actInv.map((a: any) => a.fecha_fin),
    ...proyectosInv.map((p: any) => p.fecha_inicio), ...proyectosInv.map((p: any) => p.fecha_fin),
  ].filter((f: any) => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}/.test(f));
  const inicioPeriodo = todasFechas.length ? fmtFechaReporte(todasFechas.reduce((a, b) => (a < b ? a : b))) : null;
  const finPeriodo = todasFechas.length ? fmtFechaReporte(todasFechas.reduce((a, b) => (a > b ? a : b))) : null;

  // ── Última revisión real (registros de aprobación por componente) ──
  const revisiones = (componentesAprobacion || [])
    .filter((r: any) => r && (r.fecha_aprobacion || r.fechaAprobacion) && (r.aprobador_nombre || r.aprobadorNombre))
    .sort((a: any, b: any) => String(b.fecha_aprobacion || b.fechaAprobacion).localeCompare(String(a.fecha_aprobacion || a.fechaAprobacion)));
  const ultimaRevision = revisiones[0] || null;
  const fechaRevision = ultimaRevision ? fmtFechaReporte(String(ultimaRevision.fecha_aprobacion || ultimaRevision.fechaAprobacion)) : null;
  const responsableRevision = ultimaRevision ? (ultimaRevision.aprobador_nombre || ultimaRevision.aprobadorNombre) : null;

  // Núcleos temáticos reales de las asignaturas.
  const nucleos = [...new Set(asignaturas.map((a: any) => a.nucleo_tematico).filter(Boolean))].join(', ');

  const chartData = [
    { name: pta.territorial || 'Sede/Territorial', Docencia: horasDocencia, 'Investigación': horasInvestigacion, 'Extensión': horasExtension, Complementarias: horasComplementarias },
  ];
  const pieData = [
    { name: 'Docencia', value: horasDocencia, color: PTA_COLORS.DOCENCIA },
    { name: 'Investigación', value: horasInvestigacion, color: PTA_COLORS.INVESTIGACION },
    { name: 'Extensión', value: horasExtension, color: PTA_COLORS.EXTENSION },
    { name: 'Complementarias', value: horasComplementarias, color: PTA_COLORS.COMPLEMENTARIAS },
  ].filter(d => d.value > 0);

  const handlePrint = () => window.print();

  const celdaTh: React.CSSProperties = { padding: '6px 8px', border: `1px solid ${NAVY}`, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', background: HEAD_BG, color: '#111827', whiteSpace: 'nowrap' };
  const celdaTd: React.CSSProperties = { padding: '6px 8px', border: `1px solid ${NAVY}`, fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', color: '#111827', background: '#fff' };

  return (
    <AnimatePresence>
      {/* Aislamiento de impresión: solo la hoja del reporte es visible al imprimir. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .reporte-pta-overlay { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important; overflow: visible !important; padding: 0 !important; background: #fff !important; display: block !important; }
          .reporte-pta-sheet, .reporte-pta-sheet * { visibility: visible !important; }
          .reporte-pta-sheet { position: relative !important; margin: 0 auto !important; box-shadow: none !important; max-width: 100% !important; }
          .reporte-pta-hide-print { display: none !important; }
        }
      `}</style>
      <div
        className="reporte-pta-overlay"
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 8px 80px', background: 'rgba(17,24,39,0.8)', overflowY: 'auto' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="reporte-pta-sheet"
          style={{ background: '#fff', width: '100%', maxWidth: 1200, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden' }}
        >
          {/* ── Barra de controles (sticky, no imprime) ── */}
          <div
            className="reporte-pta-hide-print"
            style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 14px', background: '#fff', borderBottom: '1px solid #E5E7EB' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>Reporte Institucional PTA</div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>Formato GTH-F081 · Periodo {pta?.periodo || '—'}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#003DA5', color: '#fff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={14} /> Exportar / Imprimir
              </button>
              <button
                onClick={onClose}
                aria-label="Cerrar reporte"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <X size={14} /> Cerrar
              </button>
            </div>
          </div>

          <div style={{ border: `8px solid ${NAVY}`, margin: 6 }}>
            {/* ── Header oficial ── */}
            <div style={{ background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', padding: 8, position: 'relative', minHeight: 80 }}>
              <div style={{ width: 64, height: 64, background: '#fff', marginRight: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, padding: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                  {Array(10).fill(0).map((_, i) => <div key={i} style={{ width: 8, height: 8, background: '#003DA5', borderRadius: '50%' }} />)}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, minWidth: 0 }}>
                <div style={{ fontSize: '1.05rem', letterSpacing: '0.03em', textTransform: 'uppercase' }}>PLAN DE TRABAJO ACADÉMICO DOCENTE - PTA</div>
                <div style={{ fontSize: '0.78rem' }}>Escuela Superior de Administración Pública - ESAP</div>
                <div style={{ fontSize: '0.78rem' }}>Grupo de Gestión Profesoral - {pta?.periodo?.split('-')[0] || ''}</div>
              </div>
              <div style={{ position: 'absolute', right: 8, bottom: 4, fontSize: '0.58rem', color: '#CBD5E1' }}>Versión 08.2025</div>
              {isParcial && (
                <div style={{ position: 'absolute', right: 8, top: 8, padding: '2px 8px', background: '#EAB308', color: '#111827', fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', borderRadius: 4, border: '1px solid #A16207' }}>
                  Informe Parcial
                </div>
              )}
            </div>

            {/* ── Identificación docente (solo datos reales; '—' si no hay dato) ── */}
            <BandaTitulo>Identificación Docente</BandaTitulo>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', borderBottom: `3px solid ${NAVY}`, borderLeft: '1px solid #CBD5E1', borderTop: '1px solid #CBD5E1', background: '#fff' }}>
              <CampoIdent label="Identificación (ID)" value={userPerfil?.documento || userPerfil?.identificacion} />
              <CampoIdent label="Nombre" value={userPerfil?.nombre} />
              <CampoIdent label="Correo Institucional" value={userPerfil?.email} />
              <CampoIdent label="Sede Territorial" value={pta?.territorial || userPerfil?.territorial} />
              <CampoIdent label="CETAP" value={pta?.cetap} />
              <CampoIdent label="Programa" value={pta?.programa} />
              <CampoIdent label="Tipo de Vinculación" value={pta?.tipo_vinculacion} />
              <CampoIdent label="Dedicación" value={pta?.dedicacion} />
              <CampoIdent label="Semanas de Vinculación" value={pta?.semanas_vinculacion} />
              <CampoIdent label="Núcleo(s) Temático(s)" value={nucleos || null} />
              <CampoIdent label="Inicio Periodo" value={inicioPeriodo} />
              <CampoIdent label="Fin Periodo" value={finPeriodo} />
              <CampoIdent label="Horas Disponibles" value={`${horasDisp} h`} />
              <CampoIdent label="Horas Programadas" value={`${horasProg} h`} />
            </div>

            {/* ── Título periodo ── */}
            <BandaTitulo>Plan de Trabajo Académico - PTA · Periodo {pta?.periodo || '—'}</BandaTitulo>

            {/* ── Botones 3D de componentes (estética del formato oficial) ── */}
            <div style={{ background: '#fff', padding: '20px 12px', borderBottom: `6px solid ${NAVY}`, display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              {componentes.map((btn, i) => (
                <div key={i} style={{ flex: '1 1 180px', position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: '100%', minHeight: 84, color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    padding: '8px 10px', lineHeight: 1.3, border: '1px solid rgba(0,0,0,0.1)',
                    backgroundColor: btn.color,
                    boxShadow: 'inset 4px 4px 8px rgba(255,255,255,0.3), inset -4px -4px 8px rgba(0,0,0,0.2), 6px 6px 0px rgba(0,0,0,0.15)',
                  }}>
                    {btn.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Resumen de carga por componente ── */}
            <BandaTitulo>Resumen Plan de Trabajo</BandaTitulo>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 0, borderBottom: `6px solid ${NAVY}` }}>
              {componentes.map((c, i) => (
                <div key={i} style={{ border: `1px solid ${NAVY}`, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                  <div style={{ padding: '6px 8px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', borderBottom: `1px solid ${NAVY}`, borderTop: `4px solid ${c.color}`, color: '#111827' }}>
                    Carga en {c.label}
                  </div>
                  <div style={{ display: 'flex', flex: 1 }}>
                    <div style={{ flex: 1, borderRight: `1px solid ${NAVY}`, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, textAlign: 'center', padding: '3px 0', background: HEAD_BG, borderBottom: `1px solid ${NAVY}` }}>PORCENTAJE</span>
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, padding: '6px 0', color: c.color }}>{getPct(c.horas)}%</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, textAlign: 'center', padding: '3px 0', background: HEAD_BG, borderBottom: `1px solid ${NAVY}` }}>TOTAL HORAS</span>
                      <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, padding: '6px 0' }}>{c.horas}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Gráficos ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderBottom: `6px solid ${NAVY}`, background: '#fff', padding: 8 }}>
              <div style={{ flex: '3 1 380px', minWidth: 0, border: '1px solid #D1D5DB', display: 'flex', flexDirection: 'column', padding: '8px 8px 16px', height: 280 }}>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: 8 }}>Total Plan de Trabajo Académico por Sede Territorial y Actividad</div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: '10px', marginTop: '-10px' }} />
                      <Bar dataKey="Docencia" stackId="a" fill={PTA_COLORS.DOCENCIA} />
                      <Bar dataKey="Investigación" stackId="a" fill={PTA_COLORS.INVESTIGACION} />
                      <Bar dataKey="Extensión" stackId="a" fill={PTA_COLORS.EXTENSION} />
                      <Bar dataKey="Complementarias" stackId="a" fill={PTA_COLORS.COMPLEMENTARIAS} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ flex: '2 1 260px', minWidth: 0, border: '1px solid #D1D5DB', display: 'flex', flexDirection: 'column', padding: 8, height: 280 }}>
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', color: '#4B5563' }}>
                  Distribución Plan de Trabajo<br /><span style={{ fontSize: '0.6rem' }}>por tipo de carga</span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData} cx="50%" cy="50%" innerRadius={0} outerRadius={80}
                          paddingAngle={1} dataKey="value" startAngle={90} endAngle={-270}
                          label={({ percent }) => `${(percent * 100).toFixed(1)}%`} labelLine={false}
                        >
                          {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' }}>Sin datos</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Flujo de aprobación (datos reales por componente) ── */}
            <BandaTitulo>Flujo de Aprobación</BandaTitulo>
            <div style={{ display: 'flex', flexWrap: 'wrap', background: '#fff' }}>
              <div style={{ flex: '2 1 460px', minWidth: 0, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th style={{ ...celdaTh, textAlign: 'left' }}>Componente</th>
                      <th style={celdaTh}>Horas Programadas</th>
                      <th style={celdaTh}>% Carga</th>
                      <th style={celdaTh}>Estado Revisión</th>
                      <th style={celdaTh}>Horas Aprobadas</th>
                      <th style={celdaTh}>Horas Pendientes</th>
                      <th style={celdaTh}>% Aprobación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {componentes.map((c, i) => {
                      const cfg = ESTADO_COMP_CFG[c.estado] || ESTADO_COMP_CFG.pendiente;
                      return (
                        <tr key={i}>
                          <td style={{ ...celdaTd, textAlign: 'left', fontWeight: 700, borderLeft: `4px solid ${c.color}`, whiteSpace: 'nowrap' }}>{c.label}</td>
                          <td style={celdaTd}>{c.horas}</td>
                          <td style={celdaTd}>{getPct(c.horas)}%</td>
                          <td style={celdaTd}>
                            {c.horas > 0 ? (
                              <span style={{ padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.62rem', fontWeight: 800, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                            ) : (
                              <span style={{ color: '#9CA3AF', fontSize: '0.62rem' }}>Sin horas</span>
                            )}
                          </td>
                          <td style={{ ...celdaTd, background: '#F0FDF4' }}>{c.aprobadas}</td>
                          <td style={{ ...celdaTd, background: '#FEF9C3' }}>{c.pendientes}</td>
                          <td style={celdaTd}>{c.pctAprob}%</td>
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{ ...celdaTd, fontWeight: 900, textAlign: 'left', background: HEAD_BG }}>TOTAL</td>
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{horasProg}</td>
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>100%</td>
                      <td style={{ ...celdaTd, background: HEAD_BG }} />
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{totalAprobadas}</td>
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{horasProg - totalAprobadas}</td>
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{pctGlobal}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Panel lateral de aprobación / firma */}
              <div style={{ flex: '1 1 280px', minWidth: 0, borderLeft: `6px solid ${NAVY}`, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
                <div style={{ alignSelf: 'stretch', fontSize: '0.66rem', fontWeight: 800, color: '#4B5563', textTransform: 'uppercase', borderBottom: '1px solid #D1D5DB', paddingBottom: 4, marginBottom: 12 }}>
                  Porcentaje de Aprobación del PTA
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: pctGlobal >= 100 ? '#047857' : '#B45309', lineHeight: 1 }}>{pctGlobal}%</div>
                <div style={{ fontSize: '0.64rem', color: '#6B7280', fontWeight: 600, marginTop: 4 }}>{totalAprobadas} de {horasProg} horas aprobadas</div>
                {isParcial ? (
                  <div style={{ textAlign: 'center', opacity: 0.45, marginTop: 18 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase' }}>¡Informe Parcial!</div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: 4 }}>El documento queda en firme cuando todos los componentes estén aprobados y firmados.</div>
                  </div>
                ) : (
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
                    <ShieldCheck size={44} color="#059669" />
                    <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#047857', textTransform: 'uppercase', marginTop: 4 }}>Documento Firmado</div>
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', padding: 12, borderRadius: 6, fontSize: '0.66rem', textAlign: 'left', width: '100%', marginTop: 10 }}>
                      <div style={{ fontWeight: 800, color: '#1F2937', marginBottom: 4 }}>CERTIFICADO DIGITAL DE APROBACIÓN</div>
                      <div style={{ fontFamily: 'monospace', background: '#E5E7EB', padding: 4, marginBottom: 8, overflowWrap: 'anywhere' }}>{certificadoId || 'CERT-N/A'}</div>
                      <div style={{ color: '#6B7280', lineHeight: 1.6 }}>
                        <strong>Fecha de Firma:</strong> {signedAt ? new Date(signedAt).toLocaleString('es-CO') : '—'}<br />
                        <strong>Firmante Autenticado:</strong> {userPerfil?.nombre || '—'}<br />
                        El documento ha surtido efecto y ha sido anclado al expediente.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Pie: revisión Gestión Profesoral (datos reales o pendiente) ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: '0.68rem', fontWeight: 700, background: '#111827', color: '#fff', padding: '6px 8px', gap: 8, alignItems: 'center' }}>
              <div>REVISIÓN GRUPO DE GESTIÓN PROFESORAL</div>
              <div style={{ flex: 1, borderLeft: '1px solid #4B5563', paddingLeft: 12, display: 'flex', flexWrap: 'wrap', gap: 16, minWidth: 200 }}>
                <div>FECHA REVISIÓN<br /><span style={{ fontWeight: 400, fontSize: '0.62rem', color: '#D1D5DB' }}>{fechaRevision || 'Pendiente'}</span></div>
                <div>RESPONSABLE REVISIÓN<br /><span style={{ fontWeight: 400, fontSize: '0.62rem', color: '#D1D5DB' }}>{responsableRevision || 'Pendiente de revisión'}</span></div>
              </div>
              <div style={{ borderLeft: '1px solid #4B5563', paddingLeft: 12, fontSize: '0.62rem', display: 'flex', alignItems: 'center' }}>
                {pctGlobal >= 100 ? 'APRUEBA' : 'EN REVISIÓN'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
