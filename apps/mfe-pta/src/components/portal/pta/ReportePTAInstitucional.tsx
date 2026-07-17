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
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend, LabelList,
} from 'recharts';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import { getExtensionSelectionInfo } from '../../pta/shared/extensionSelection';

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

const SECCION_LABELS: Record<string, string> = {
  capacitacion: 'Dirección de Capacitación',
  seleccion: 'Dirección de Procesos de Selección',
  fortalecimiento: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  alto_gobierno: 'Escuela de Alto Gobierno',
  laboratorio_innovacion: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  investigacion_aplicada: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  complementarias_docencia: 'Complementarias de docencia',
  academico_administrativas: 'Académico-administrativas',
};

const MODALIDAD_LABELS: Record<string, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  MIXTA: 'Mixta',
  DISTANCIA: 'Distancia',
};

const textoSeccion = (value?: string) => value
  ? (SECCION_LABELS[value] || `${value.charAt(0).toUpperCase()}${value.slice(1).replace(/_/g, ' ')}`)
  : null;

const numero = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const listaUnica = (values: any[]): string | null => {
  const uniques = [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
  return uniques.length ? uniques.join(', ') : null;
};

const textoConSeparador = (values: Array<any>): string | null => {
  const valid = values.filter(value => value !== null && value !== undefined && value !== '' && value !== false);
  return valid.length ? valid.join(' · ') : null;
};

const textoUbicacion = (...values: any[]): string | null => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return null;
};

const ESTADO_COMP_CFG: Record<string, { label: string; color: string; bg: string }> = {
  aprobado: { label: 'Aprobado', color: '#047857', bg: '#D1FAE5' },
  devuelto: { label: 'Devuelto', color: '#B91C1C', bg: '#FEE2E2' },
  pendiente: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7' },
  borrador: { label: 'Borrador', color: '#475569', bg: '#E2E8F0' },
};

/** 'YYYY-MM-DD...' → 'DD/MM/YYYY'. Devuelve null si no hay fecha válida. */
function fmtFechaReporte(v?: string): string | null {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('es-CO');
}

function rangoFechas(inicio?: string, fin?: string): string | null {
  const desde = fmtFechaReporte(inicio);
  const hasta = fmtFechaReporte(fin);
  if (desde && hasta) return `${desde} — ${hasta}`;
  return desde || hasta;
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
    <div className="reporte-pta-band-title" style={{ background: BAND, color: '#fff', textAlign: 'center', fontWeight: 800, padding: '5px 8px', borderBottom: `3px solid ${NAVY}`, textTransform: 'uppercase', fontSize: '0.78rem', letterSpacing: '0.03em' }}>
      {children}
    </div>
  );
}

const claseSeccionReporte = (cantidadRegistros: number) => `reporte-pta-section ${cantidadRegistros <= 6 ? 'reporte-pta-keep-together' : 'reporte-pta-section-large'}`;

function EstadoComponente({ estado }: { estado: string }) {
  const cfg = ESTADO_COMP_CFG[estado] || ESTADO_COMP_CFG.pendiente;
  return (
    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.6rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function EncabezadoDetalle({ titulo, subtitulo, horas, color, estado }: { titulo: string; subtitulo: string; horas: number; color: string; estado: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '7px 10px', background: `${color}0D`, borderLeft: `5px solid ${color}`, borderBottom: '1px solid #CBD5E1' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#111827', textTransform: 'uppercase' }}>{titulo}</div>
        <div style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, marginTop: 1 }}>{subtitulo}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <EstadoComponente estado={estado} />
        <span style={{ padding: '3px 9px', borderRadius: 999, background: '#fff', border: `1px solid ${color}55`, color, fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap' }}>{horas} h</span>
      </div>
    </div>
  );
}

function InfoSecundaria({ children }: { children: any }) {
  if (!children) return null;
  return <div style={{ fontSize: '0.59rem', color: '#64748B', lineHeight: 1.45, marginTop: 2, overflowWrap: 'anywhere' }}>{children}</div>;
}

function BarrasHorizontalesImpresion({ data }: { data: Array<{ id: string; nombreCompleto: string; componente: string; horas: number; color: string }> }) {
  const maxHoras = Math.max(...data.map(item => numero(item.horas)), 1);
  return (
    <div className="reporte-pta-only-print" style={{ padding: '12px 10px 8px' }}>
      {data.map(item => (
        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) 48px', alignItems: 'center', gap: 8, marginBottom: 8, breakInside: 'avoid' }}>
          <div style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 700, textAlign: 'right', overflowWrap: 'anywhere' }}>{item.nombreCompleto}</div>
          <div style={{ height: 18, background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${Math.max((item.horas / maxHoras) * 100, 1)}%`, height: '100%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 5, color: item.componente === 'Complementarias' ? '#713F12' : '#fff', fontSize: '0.56rem', fontWeight: 900 }}>
              {item.horas} h
            </div>
          </div>
          <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 700 }}>{item.componente}</div>
        </div>
      ))}
    </div>
  );
}

function DistribucionImpresion({ data, total }: { data: Array<{ name: string; value: number; color: string }>; total: number }) {
  let acumulado = 0;
  const segmentos = data.map(item => {
    const inicio = total > 0 ? (acumulado / total) * 360 : 0;
    acumulado += item.value;
    const fin = total > 0 ? (acumulado / total) * 360 : 0;
    return `${item.color} ${inicio}deg ${fin}deg`;
  });
  return (
    <div className="reporte-pta-only-print" style={{ padding: '16px 10px 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 170, height: 170, borderRadius: '50%', background: `conic-gradient(${segmentos.join(', ')})`, position: 'relative', border: '1px solid #CBD5E1', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 44, borderRadius: '50%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: NAVY }}>{total}</span>
            <span style={{ fontSize: '0.52rem', fontWeight: 700, color: '#64748B' }}>horas</span>
          </div>
        </div>
        <div style={{ minWidth: 180 }}>
          {data.map(item => (
            <div key={item.name} style={{ display: 'grid', gridTemplateColumns: '10px minmax(90px, 1fr) 44px 42px', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: '0.62rem' }}>
              <span style={{ width: 9, height: 9, background: item.color, border: '1px solid rgba(15,23,42,0.15)' }} />
              <span style={{ color: '#334155', fontWeight: 700 }}>{item.name}</span>
              <span style={{ color: '#111827', fontWeight: 900, textAlign: 'right' }}>{item.value} h</span>
              <span style={{ color: '#64748B', fontWeight: 700, textAlign: 'right' }}>{total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DocenciaUbicacionImpresion({ data, series }: {
  data: Array<Record<string, any>>;
  series: Array<{ key: string; name: string; color: string }>;
}) {
  const seriesActivas = series.filter(serie => data.some(item => numero(item[serie.key]) > 0));
  const maxTotal = Math.max(...data.map(item => numero(item.total)), 1);
  return (
    <div className="reporte-pta-only-print" style={{ padding: '12px 10px 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '5px 12px', marginBottom: 12 }}>
        {seriesActivas.map(serie => (
          <span key={serie.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.56rem', color: '#475569', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, background: serie.color, border: '1px solid rgba(15,23,42,0.15)' }} />
            {serie.name}
          </span>
        ))}
      </div>
      {data.map(item => (
        <div key={item.nombreCompleto} style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) 42px', alignItems: 'center', gap: 8, marginBottom: 10, breakInside: 'avoid' }}>
          <div style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 800, textAlign: 'right', overflowWrap: 'anywhere' }}>{item.nombreCompleto}</div>
          <div style={{ width: `${Math.max((item.total / maxTotal) * 100, 1)}%`, minWidth: item.total > 0 ? 24 : 0, height: 24, display: 'flex', overflow: 'hidden', border: '1px solid #94A3B8', borderRadius: 3, background: '#F8FAFC' }}>
            {seriesActivas.map(serie => {
              const horas = numero(item[serie.key]);
              if (horas <= 0) return null;
              return (
                <div key={serie.key} title={`${serie.name}: ${horas} h`} style={{ width: `${(horas / item.total) * 100}%`, background: serie.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.56rem', fontWeight: 900, textShadow: '0 1px 1px rgba(0,0,0,0.45)' }}>
                  {horas}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: '0.62rem', color: NAVY, fontWeight: 900 }}>{item.total} h</div>
        </div>
      ))}
    </div>
  );
}

function GraficoDocenciaUbicacion({ titulo, subtitulo, data, series }: {
  titulo: string;
  subtitulo: string;
  data: Array<Record<string, any>>;
  series: Array<{ key: string; name: string; color: string }>;
}) {
  const seriesActivas = series.filter(serie => data.some(item => numero(item[serie.key]) > 0));
  const rotarEtiquetas = data.length > 4;
  const chartHeight = 312 + Math.max(1, Math.ceil(seriesActivas.length / 3)) * 18;
  return (
    <div className="reporte-pta-chart-card" style={{ flex: '1 1 500px', minWidth: 0, border: '1px solid #D1D5DB', padding: '10px 8px 8px' }}>
      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: '#374151' }}>{titulo}</div>
      <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#64748B', marginTop: 2 }}>{subtitulo}</div>
      <div className="reporte-pta-hide-chart-print" style={{ width: '100%', height: chartHeight, marginTop: 4 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 14, left: 0, bottom: rotarEtiquetas ? 64 : 30 }} barCategoryGap="26%">
            <XAxis
              dataKey="nombre"
              interval={0}
              angle={rotarEtiquetas ? -28 : 0}
              textAnchor={rotarEtiquetas ? 'end' : 'middle'}
              height={rotarEtiquetas ? 72 : 38}
              tick={{ fontSize: 8, fill: '#475569', fontWeight: 600 }}
              axisLine={{ stroke: '#94A3B8' }}
              tickLine={false}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
            <RechartsTooltip
              cursor={{ fill: '#F1F5F9' }}
              labelFormatter={(_label, payload) => payload?.[0]?.payload?.nombreCompleto || _label}
              formatter={(value, _name, props) => {
                const serie = seriesActivas.find(item => item.key === props?.dataKey);
                return [`${value} h`, serie?.name || 'Asignatura'];
              }}
              contentStyle={{ fontSize: '0.68rem', borderRadius: 6, border: '1px solid #CBD5E1' }}
            />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '8px', fontWeight: 600, paddingTop: 4 }} />
            {seriesActivas.map(serie => (
              <Bar key={serie.key} dataKey={serie.key} name={serie.name} stackId="docencia" fill={serie.color} maxBarSize={56}>
                <LabelList
                  dataKey={serie.key}
                  position="center"
                  formatter={(value: any) => numero(value) > 0 ? numero(value) : ''}
                  style={{ fontSize: 8, fontWeight: 900, fill: '#fff', stroke: '#1E3A8A', strokeWidth: 2, paintOrder: 'stroke' }}
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DocenciaUbicacionImpresion data={data} series={seriesActivas} />
      <div className="reporte-pta-hide-chart-print" style={{ textAlign: 'center', fontSize: '0.58rem', color: '#64748B', fontWeight: 700, marginTop: -2 }}>
        {data.length} {data.length === 1 ? 'ubicación con carga docente' : 'ubicaciones con carga docente'}
      </div>
    </div>
  );
}

export function ReportePTAInstitucional({
  pta, userPerfil, onClose, isParcial = true, certificadoId, signedAt, componentesAprobacion = [],
}: ReportePTAInstitucionalProps) {
  // ── Datos que pertenecen al PTA consultado. Los registros vacíos no llegan al reporte. ──
  const asignaturas: any[] = (Array.isArray(pta?.asignaturas) ? pta.asignaturas : [])
    .filter((a: any) => a && (a.nombre || a.asignatura_nombre || a.asignatura_id || numero(a.total_horas ?? a.horas) > 0));
  const proyectoPrincipal = pta?.investigacion_proyecto;
  const proyectosInv: any[] = (proyectoPrincipal && (proyectoPrincipal.nombre || proyectoPrincipal.nombre_proyecto || proyectoPrincipal.rol || proyectoPrincipal.codigo || numero(proyectoPrincipal.horas_solicitadas) > 0))
    ? [proyectoPrincipal]
    : (Array.isArray(pta?.investigacion?.proyectos) ? pta.investigacion.proyectos : [])
      .filter((p: any) => p && (p.nombre || p.nombre_proyecto || p.rol || p.codigo || numero(p.horas_solicitadas) > 0));
  const actInv: any[] = (Array.isArray(pta?.investigacion_actividades)
    ? pta.investigacion_actividades
    : (Array.isArray(pta?.investigacion?.actividades) ? pta.investigacion.actividades : []))
    .filter((a: any) => a && (a.nombre || a.actividad_nombre || a.actividad_id || numero(a.horas_total ?? a.horas) > 0));
  const extLegacy = pta?.extension && typeof pta.extension === 'object'
    ? (Object.values(pta.extension).flat() as any[])
    : [];
  const extActs: any[] = (Array.isArray(pta?.extension_actividades) ? pta.extension_actividades : extLegacy)
    .filter((a: any) => a && typeof a === 'object' && (a.nombre || a.nombre_actividad || a.actividad_nombre || a.actividad_id || numero(a.horas ?? a.horas_ejecutadas) > 0));
  const compLegacy = pta?.complementarias && !Array.isArray(pta.complementarias)
    ? pta.complementarias.actividades
    : [];
  const compActs: any[] = (Array.isArray(pta?.complementarias) ? pta.complementarias : (Array.isArray(compLegacy) ? compLegacy : []))
    .filter((a: any) => a && (a.nombre || a.actividad_nombre || a.actividad_id || numero(a.horas) > 0));

  // Los agregados del backend tienen prioridad porque incluyen las reglas y multiplicadores institucionales.
  const horasDocencia = numero(pta?.horas_docencia ?? asignaturas.reduce((sum: number, a: any) => sum + numero(a.total_horas ?? a.horas), 0));
  const horasInvestigacion = numero(pta?.horas_investigacion ?? (
    proyectosInv.reduce((sum: number, p: any) => sum + numero(p.horas_solicitadas), 0)
    || actInv.reduce((sum: number, a: any) => sum + numero(a.horas_total ?? a.horas), 0)
  ));
  const horasExtension = numero(pta?.horas_extension ?? extActs.reduce((sum: number, a: any) => sum + numero(a.horas ?? a.horas_ejecutadas), 0));
  const horasComplementarias = numero(pta?.horas_complementarias ?? compActs.reduce((sum: number, a: any) => sum + numero(a.horas), 0));
  const sumaComponentes = horasDocencia + horasInvestigacion + horasExtension + horasComplementarias;
  const horasProg = numero(pta?.horas_totales ?? pta?.total_horas_programadas ?? sumaComponentes);
  const horasDisp = numero(pta?.horas_asignables ?? pta?.horas_a_programar ?? 0);

  const getPct = (val: number) => horasProg > 0 ? Math.round((val / horasProg) * 100) : 0;

  // ── Estado real de aprobación por componente (del DTO enriquecido del backend) ──
  const compEstados: any[] = Array.isArray(pta?.componentes_estado) ? pta.componentes_estado : [];
  const estadoDe = (key: string): string => {
    if (!isParcial) return 'aprobado';
    if (['Borrador', 'BORRADOR'].includes(String(pta?.estado))) return 'borrador';
    return compEstados.find((c: any) => c?.key === key)?.estado || 'pendiente';
  };

  const componentes = [
    { key: 'academica', label: 'DOCENCIA', horas: horasDocencia, color: PTA_COLORS.DOCENCIA, tieneDetalle: asignaturas.length > 0 },
    { key: 'investigacion', label: 'INVESTIGACIÓN', horas: horasInvestigacion, color: PTA_COLORS.INVESTIGACION, tieneDetalle: proyectosInv.length > 0 || actInv.length > 0 },
    { key: 'extension', label: 'EXTENSIÓN ACADÉMICA', horas: horasExtension, color: PTA_COLORS.EXTENSION, tieneDetalle: extActs.length > 0 },
    { key: 'complementarias', label: 'ACT. COMPLEMENTARIAS', horas: horasComplementarias, color: PTA_COLORS.COMPLEMENTARIAS, tieneDetalle: compActs.length > 0 },
  ].filter(c => c.horas > 0 || c.tieneDetalle).map(c => {
    const estado = estadoDe(c.key);
    const aprobadas = estado === 'aprobado' ? c.horas : 0;
    return { ...c, estado, aprobadas, pendientes: Math.max(c.horas - aprobadas, 0), pctAprob: c.horas > 0 ? Math.round((aprobadas / c.horas) * 100) : 0 };
  });

  const totalAprobadas = componentes.reduce((s, c) => s + c.aprobadas, 0);
  const pctGlobal = horasProg > 0 ? Math.min(Math.round((totalAprobadas / horasProg) * 100), 100) : 0;

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
    .filter((r: any) => {
      if (!r || !(r.fecha_aprobacion || r.fechaAprobacion) || !(r.aprobador_nombre || r.aprobadorNombre)) return false;
      const key = String(r.componente || r.key || '');
      return componentes.some(c => c.key === key || (c.key === 'extension' && key.startsWith('ext_')));
    })
    .sort((a: any, b: any) => String(b.fecha_aprobacion || b.fechaAprobacion).localeCompare(String(a.fecha_aprobacion || a.fechaAprobacion)));
  const ultimaRevision = revisiones[0] || null;
  const fechaRevision = ultimaRevision ? fmtFechaReporte(String(ultimaRevision.fecha_aprobacion || ultimaRevision.fechaAprobacion)) : null;
  const responsableRevision = ultimaRevision ? (ultimaRevision.aprobador_nombre || ultimaRevision.aprobadorNombre) : null;

  // Datos descriptivos reales de las asignaturas, útiles cuando el PTA abarca varias sedes o programas.
  const nucleos = [...new Set(asignaturas.map((a: any) => a.nucleo_tematico).filter(Boolean))].join(', ');
  const territoriales = listaUnica([pta?.territorial, ...asignaturas.map((a: any) => a.territorial_nombre)]);
  const cetaps = listaUnica([pta?.cetap, ...asignaturas.map((a: any) => a.cetap_nombre)]);
  const programas = listaUnica([pta?.programa, ...asignaturas.map((a: any) => a.programa_nombre || a.programa)]);
  const hayDetalle = asignaturas.length > 0 || proyectosInv.length > 0 || actInv.length > 0 || extActs.length > 0 || compActs.length > 0;

  // ── Gráficos del PTA individual ────────────────────────────────────────────
  // La investigación puede guardar un total en el proyecto y, simultáneamente,
  // actividades que lo desglosan. Se grafica el desglose cuando explica el total;
  // de lo contrario se usa el proyecto para no duplicar horas visualmente.
  const totalActInv = actInv.reduce((sum: number, a: any) => sum + numero(a.horas_total ?? a.horas), 0);
  const investigacionGrafico = totalActInv > 0 && (proyectosInv.length === 0 || Math.abs(totalActInv - horasInvestigacion) < 0.01)
    ? actInv.map((a: any) => ({
        nombre: a.nombre || a.actividad_nombre || a.actividad_id || 'Actividad de investigación',
        horas: numero(a.horas_total ?? a.horas),
      }))
    : proyectosInv.map((p: any) => ({
        nombre: p.nombre || p.nombre_proyecto || 'Proyecto de investigación',
        horas: numero(p.horas_solicitadas),
      }));

  const abreviarEtiqueta = (value: string) => value.length > 30 ? `${value.slice(0, 28)}…` : value;
  const actividadChartData = [
    ...asignaturas.map((a: any) => ({
      nombreCompleto: a.nombre || a.asignatura_nombre || 'Asignatura',
      componente: 'Docencia',
      horas: numero(a.total_horas ?? a.horas),
      color: PTA_COLORS.DOCENCIA,
    })),
    ...investigacionGrafico.map((item: any) => ({
      nombreCompleto: item.nombre,
      componente: 'Investigación',
      horas: item.horas,
      color: PTA_COLORS.INVESTIGACION,
    })),
    ...extActs.map((a: any) => ({
      nombreCompleto: a.nombre || a.nombre_actividad || a.actividad_nombre || a.actividad_id || 'Actividad de extensión',
      componente: 'Extensión',
      horas: numero(a.horas ?? a.horas_ejecutadas),
      color: PTA_COLORS.EXTENSION,
    })),
    ...compActs.map((a: any) => ({
      nombreCompleto: a.nombre || a.actividad_nombre || a.actividad_id || 'Actividad complementaria',
      componente: 'Complementarias',
      horas: numero(a.horas),
      color: PTA_COLORS.COMPLEMENTARIAS,
    })),
  ]
    .filter(item => item.horas > 0)
    .map((item, index) => ({ ...item, id: `${item.componente}-${index}`, nombre: abreviarEtiqueta(item.nombreCompleto) }));

  // Compatibilidad con PTAs antiguos que tienen agregados pero no conservan el
  // detalle: el componente sigue apareciendo sin inventar asignaturas o actividades.
  const nombreComponenteGrafico = (key: string) => key === 'academica'
    ? 'Docencia'
    : key === 'investigacion'
      ? 'Investigación'
      : key === 'extension'
        ? 'Extensión'
        : 'Complementarias';
  for (const componente of componentes) {
    const nombreComponente = nombreComponenteGrafico(componente.key);
    if (componente.horas > 0 && !actividadChartData.some(item => item.componente === nombreComponente)) {
      actividadChartData.push({
        id: `${componente.key}-resumen`,
        nombre: abreviarEtiqueta(componente.label),
        nombreCompleto: componente.label,
        componente: nombreComponente,
        horas: componente.horas,
        color: componente.color,
      });
    }
  }

  const pieData = componentes
    .filter(c => c.horas > 0)
    .map(c => ({
      name: nombreComponenteGrafico(c.key),
      value: c.horas,
      color: c.color,
    }));
  const chartHeight = Math.max(260, actividadChartData.length * 34 + 72);
  const componentesEnGrafico = [...new Map(actividadChartData.map(item => [item.componente, item.color])).entries()];

  // Distribución exclusiva de Docencia. Cada serie es una asignatura y cada
  // categoría corresponde a una ubicación que realmente existe en el PTA.
  const DOCENCIA_SERIES_COLORS = [
    PTA_COLORS.DOCENCIA, '#2F75B5', '#5B9BD5', '#1F4E78',
    '#7EA6D8', '#264478', '#8FAADC', '#17365D',
  ];
  const asignaturasConHoras = asignaturas.filter((a: any) => numero(a.total_horas ?? a.horas) > 0);
  const nombresAsignaturas = [...new Set(asignaturasConHoras.map((a: any) => String(a.nombre || a.asignatura_nombre || 'Asignatura').trim()))];
  const seriesDocencia = nombresAsignaturas.map((name, index) => ({
    key: `asignatura_${index}`,
    name,
    color: DOCENCIA_SERIES_COLORS[index % DOCENCIA_SERIES_COLORS.length],
  }));
  const serieDocenciaPorNombre = new Map(seriesDocencia.map(serie => [serie.name, serie]));

  const agruparDocenciaPorUbicacion = (getUbicacion: (asignatura: any) => string | null) => {
    const grupos = new Map<string, Record<string, any>>();
    for (const asignatura of asignaturasConHoras) {
      const ubicacion = getUbicacion(asignatura);
      if (!ubicacion) continue;
      const nombreAsignatura = String(asignatura.nombre || asignatura.asignatura_nombre || 'Asignatura').trim();
      const serie = serieDocenciaPorNombre.get(nombreAsignatura);
      if (!serie) continue;
      const actual = grupos.get(ubicacion) || { nombreCompleto: ubicacion };
      actual[serie.key] = numero(actual[serie.key]) + numero(asignatura.total_horas ?? asignatura.horas);
      grupos.set(ubicacion, actual);
    }
    return [...grupos.values()]
      .map(item => ({
        ...item,
        nombre: abreviarEtiqueta(String(item.nombreCompleto)),
        total: seriesDocencia.reduce((sum, serie) => sum + numero(item[serie.key]), 0),
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => b.total - a.total);
  };

  const docenciaPorTerritorial = agruparDocenciaPorUbicacion((a: any) => textoUbicacion(
    a.territorial_nombre,
    a.territorial?.nombre,
    typeof a.territorial === 'string' ? a.territorial : null,
    asignaturas.length === 1 ? pta?.territorial : null,
  ));
  const docenciaPorCetap = agruparDocenciaPorUbicacion((a: any) => textoUbicacion(
    a.cetap_nombre,
    a.sede_nombre,
    a.cetap?.nombre,
    a.sede?.nombre,
    typeof a.cetap === 'string' ? a.cetap : null,
    asignaturas.length === 1 ? pta?.cetap : null,
  ));

  const handlePrint = () => {
    // Permite que el navegador complete el layout del modal antes de activar
    // los estilos y gráficos específicos de impresión.
    window.dispatchEvent(new Event('resize'));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  const celdaTh: React.CSSProperties = { padding: '6px 8px', border: `1px solid ${NAVY}`, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', background: HEAD_BG, color: '#111827', whiteSpace: 'nowrap' };
  const celdaTd: React.CSSProperties = { padding: '6px 8px', border: `1px solid ${NAVY}`, fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', color: '#111827', background: '#fff' };

  return (
    <AnimatePresence>
      {/* Aislamiento de impresión: solo la hoja del reporte es visible al imprimir. */}
      <style>{`
        .reporte-pta-only-print, .reporte-pta-print-page-break { display: none; }
        @media print {
          @page { size: landscape; margin: 8mm; }
          body * { visibility: hidden !important; }
          .reporte-pta-overlay { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important; overflow: visible !important; padding: 0 !important; background: #fff !important; display: block !important; }
          .reporte-pta-sheet, .reporte-pta-sheet * { visibility: visible !important; }
          .reporte-pta-sheet { position: relative !important; margin: 0 auto !important; box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; overflow: visible !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .reporte-pta-hide-print { display: none !important; }
          .reporte-pta-hide-chart-print { display: none !important; }
          .reporte-pta-only-print { display: block !important; }
          .reporte-pta-print-page-break { display: block !important; height: 1px !important; margin: 0 !important; padding: 0 !important; break-before: page !important; page-break-before: always !important; }
          .reporte-pta-chart-page { display: block !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          .reporte-pta-chart-section { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)) !important; align-items: start !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          .reporte-pta-chart-card { min-width: 0 !important; break-inside: avoid !important; page-break-inside: avoid !important; overflow: visible !important; }
          .reporte-pta-band-title { break-after: avoid !important; page-break-after: avoid !important; }
          .reporte-pta-keep-together { break-inside: avoid !important; page-break-inside: avoid !important; }
          .reporte-pta-section-large { break-inside: auto !important; page-break-inside: auto !important; }
          .reporte-pta-section > div:first-child { break-after: avoid !important; page-break-after: avoid !important; }
          .reporte-pta-section thead { display: table-header-group; }
          .reporte-pta-section tr { break-inside: avoid; page-break-inside: avoid; }
          .reporte-pta-approval-page {
            break-before: page !important;
            page-break-before: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            overflow: visible !important;
          }
          .reporte-pta-approval-content { display: grid !important; grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr) !important; break-inside: avoid !important; page-break-inside: avoid !important; }
          .reporte-pta-approval-content > div { min-width: 0 !important; overflow: visible !important; }
          .reporte-pta-approval-content table { width: 100% !important; }
          .reporte-pta-review-footer { break-before: avoid !important; page-break-before: avoid !important; break-inside: avoid !important; page-break-inside: avoid !important; }
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
            <div className="reporte-pta-keep-together" style={{ background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', padding: 8, position: 'relative', minHeight: 80 }}>
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
            <div className="reporte-pta-keep-together">
              <BandaTitulo>Identificación Docente</BandaTitulo>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', borderBottom: `3px solid ${NAVY}`, borderLeft: '1px solid #CBD5E1', borderTop: '1px solid #CBD5E1', background: '#fff' }}>
                <CampoIdent label="Identificación (ID)" value={userPerfil?.documento || userPerfil?.identificacion || pta?.docente_documento || pta?.docente_id} />
                <CampoIdent label="Nombre" value={userPerfil?.nombre || pta?.docente_nombre} />
                <CampoIdent label="Correo Institucional" value={userPerfil?.email || pta?.docente_email || pta?.correo_institucional} />
                <CampoIdent label="Sede Territorial" value={territoriales || userPerfil?.territorial} />
                <CampoIdent label="CETAP" value={cetaps} />
                <CampoIdent label="Programa" value={programas} />
                <CampoIdent label="Tipo de Vinculación" value={pta?.tipo_vinculacion} />
                <CampoIdent label="Dedicación" value={pta?.dedicacion} />
                <CampoIdent label="Semanas de Vinculación" value={pta?.semanas_vinculacion} />
                <CampoIdent label="Núcleo(s) Temático(s)" value={nucleos || null} />
                <CampoIdent label="Inicio Periodo" value={inicioPeriodo} />
                <CampoIdent label="Fin Periodo" value={finPeriodo} />
                <CampoIdent label="Horas Disponibles" value={horasDisp > 0 ? `${horasDisp} h` : null} />
                <CampoIdent label="Horas Programadas" value={horasProg > 0 ? `${horasProg} h` : null} />
              </div>
            </div>

            {/* ── Título periodo ── */}
            <BandaTitulo>Plan de Trabajo Académico - PTA · Periodo {pta?.periodo || '—'}</BandaTitulo>

            {componentes.length > 0 && (
              <>
                {/* Solo se muestran los componentes realmente diligenciados en este PTA. */}
                <div className="reporte-pta-keep-together" style={{ background: '#fff', padding: '20px 12px', borderBottom: `6px solid ${NAVY}`, display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                  {componentes.map(btn => (
                    <div key={btn.key} style={{ flex: '1 1 180px', position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: '100%', minHeight: 72, color: btn.key === 'complementarias' ? '#713F12' : '#fff', fontWeight: 700, fontSize: '0.78rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                        padding: '8px 10px', lineHeight: 1.3, border: '1px solid rgba(0,0,0,0.1)',
                        backgroundColor: btn.color,
                        boxShadow: 'inset 4px 4px 8px rgba(255,255,255,0.3), inset -4px -4px 8px rgba(0,0,0,0.2), 6px 6px 0px rgba(0,0,0,0.15)',
                      }}>
                        {btn.label}<br />{btn.horas} h
                      </div>
                    </div>
                  ))}
                </div>

                <BandaTitulo>Resumen Plan de Trabajo</BandaTitulo>
                <div className="reporte-pta-keep-together" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 0, borderBottom: `6px solid ${NAVY}` }}>
                  {componentes.map(c => (
                    <div key={c.key} style={{ border: `1px solid ${NAVY}`, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                      <div style={{ padding: '6px 8px', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', borderBottom: `1px solid ${NAVY}`, borderTop: `4px solid ${c.color}`, color: '#111827' }}>
                        Carga en {c.label}
                      </div>
                      <div style={{ display: 'flex', flex: 1 }}>
                        <div style={{ flex: 1, borderRight: `1px solid ${NAVY}`, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.58rem', fontWeight: 800, textAlign: 'center', padding: '3px 0', background: HEAD_BG, borderBottom: `1px solid ${NAVY}` }}>PORCENTAJE</span>
                          <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, padding: '6px 0', color: c.key === 'complementarias' ? '#A16207' : c.color }}>{getPct(c.horas)}%</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.58rem', fontWeight: 800, textAlign: 'center', padding: '3px 0', background: HEAD_BG, borderBottom: `1px solid ${NAVY}` }}>TOTAL HORAS</span>
                          <span style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, padding: '6px 0' }}>{c.horas}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Gráficos dinámicos del PTA individual ── */}
            {(actividadChartData.length > 0 || pieData.length > 0) && (
              <>
                <div className="reporte-pta-print-page-break" aria-hidden="true" />
                <div className="reporte-pta-chart-page">
                <BandaTitulo>Visualización del Plan de Trabajo</BandaTitulo>
                <div className="reporte-pta-chart-section" style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, borderBottom: `6px solid ${NAVY}`, background: '#fff', padding: 8 }}>
                  {actividadChartData.length > 0 && (
                    <div className="reporte-pta-chart-card" style={{ flex: '3 1 560px', minWidth: 0, border: '1px solid #D1D5DB', padding: '10px 10px 12px' }}>
                      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: '#374151' }}>
                        Horas programadas por asignatura y actividad
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#64748B', marginTop: 2 }}>
                        Registros que conforman este PTA
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '5px 12px', marginTop: 8 }}>
                        {componentesEnGrafico.map(([label, color]) => (
                          <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.58rem', color: '#475569', fontWeight: 700 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, border: '1px solid rgba(15,23,42,0.12)' }} />
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="reporte-pta-hide-chart-print" style={{ width: '100%', height: chartHeight, marginTop: 2 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={actividadChartData}
                            layout="vertical"
                            margin={{ top: 12, right: 48, left: 8, bottom: 8 }}
                            barCategoryGap="24%"
                          >
                            <XAxis type="number" domain={[0, 'dataMax']} allowDecimals={false} tick={{ fontSize: 9, fill: '#64748B' }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                            <YAxis type="category" dataKey="nombre" width={170} interval={0} tick={{ fontSize: 9, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip
                              cursor={{ fill: '#F1F5F9' }}
                              labelFormatter={(_label, payload) => payload?.[0]?.payload?.nombreCompleto || _label}
                              formatter={(value, _name, props) => [`${value} h`, props?.payload?.componente || 'Horas programadas']}
                              contentStyle={{ fontSize: '0.68rem', borderRadius: 6, border: '1px solid #CBD5E1' }}
                            />
                            <Bar dataKey="horas" radius={[0, 4, 4, 0]} maxBarSize={22}>
                              {actividadChartData.map(item => <Cell key={item.id} fill={item.color} />)}
                              <LabelList dataKey="horas" position="right" formatter={(value: any) => `${value} h`} style={{ fontSize: 9, fontWeight: 800, fill: '#334155' }} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <BarrasHorizontalesImpresion data={actividadChartData} />
                    </div>
                  )}

                  {pieData.length > 0 && (
                    <div className="reporte-pta-chart-card" style={{ flex: '2 1 330px', minWidth: 0, border: '1px solid #D1D5DB', padding: '10px 8px 12px' }}>
                      <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', color: '#374151' }}>
                        Distribución del Plan de Trabajo
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '0.58rem', color: '#64748B', marginTop: 2 }}>
                        Por componente · {horasProg} horas programadas
                      </div>
                      <div className="reporte-pta-hide-chart-print" style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="45%"
                              innerRadius={38}
                              outerRadius={82}
                              paddingAngle={2}
                              dataKey="value"
                              startAngle={90}
                              endAngle={-270}
                              label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
                              labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                            >
                              {pieData.map(entry => <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />)}
                            </Pie>
                            <RechartsTooltip formatter={(value) => [`${value} h`, 'Horas programadas']} contentStyle={{ fontSize: '0.68rem', borderRadius: 6, border: '1px solid #CBD5E1' }} />
                            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '9px', fontWeight: 600 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <DistribucionImpresion data={pieData} total={horasProg} />
                      <div className="reporte-pta-hide-chart-print" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginTop: -4 }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: NAVY }}>{horasProg}</span>
                        <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700 }}>horas totales</span>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </>
            )}

            {/* ── Ubicaciones exactas de las asignaturas del componente Docencia ── */}
            {(docenciaPorTerritorial.length > 0 || docenciaPorCetap.length > 0) && (
              <>
                <div className="reporte-pta-print-page-break" aria-hidden="true" />
                <div className="reporte-pta-chart-page">
                <BandaTitulo>Distribución Territorial de la Docencia</BandaTitulo>
                <div className="reporte-pta-chart-section" style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, borderBottom: `6px solid ${NAVY}`, background: '#fff', padding: 8 }}>
                  {docenciaPorTerritorial.length > 0 && (
                    <GraficoDocenciaUbicacion
                      titulo="Carga de Docencia por Sede Territorial"
                      subtitulo="Solo territoriales con asignaturas y horas registradas en este PTA"
                      data={docenciaPorTerritorial}
                      series={seriesDocencia}
                    />
                  )}
                  {docenciaPorCetap.length > 0 && (
                    <GraficoDocenciaUbicacion
                      titulo="Carga de Docencia por CETAP"
                      subtitulo="Solo CETAP con asignaturas y horas registradas en este PTA"
                      data={docenciaPorCetap}
                      series={seriesDocencia}
                    />
                  )}
                </div>
                </div>
              </>
            )}

            {/* ── Detalle real del PTA: solo componentes y registros diligenciados ── */}
            {hayDetalle && (
              <>
                <BandaTitulo>Detalle del Plan de Trabajo</BandaTitulo>
                <div style={{ background: '#fff', borderBottom: `6px solid ${NAVY}` }}>
                  {asignaturas.length > 0 && (
                    <section className={claseSeccionReporte(asignaturas.length)} style={{ borderBottom: `3px solid ${NAVY}` }}>
                      <EncabezadoDetalle titulo="Docencia" subtitulo={`${asignaturas.length} ${asignaturas.length === 1 ? 'asignatura registrada' : 'asignaturas registradas'}`} horas={horasDocencia} color={PTA_COLORS.DOCENCIA} estado={estadoDe('academica')} />
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
                          <thead>
                            <tr>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Asignatura / Núcleo</th>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Programa / Sede</th>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Información Académica</th>
                              <th style={celdaTh}>Periodo</th>
                              <th style={celdaTh}>Horas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {asignaturas.map((a: any, index: number) => (
                              <tr key={a.id || a.asignatura_id || index}>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 800 }}>{a.nombre || a.asignatura_nombre || 'Asignatura'}</div>
                                  <InfoSecundaria>{a.nucleo_tematico || null}</InfoSecundaria>
                                  <InfoSecundaria>{a.observaciones ? `Observaciones: ${a.observaciones}` : null}</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div>{a.programa_nombre || a.programa || programas || '—'}</div>
                                  <InfoSecundaria>{textoConSeparador([
                                    a.cetap_nombre && `CETAP ${a.cetap_nombre}`,
                                    a.territorial_nombre || null,
                                  ])}</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  {textoConSeparador([
                                    MODALIDAD_LABELS[String(a.modalidad || '').toUpperCase()] || a.modalidad || null,
                                    numero(a.creditos) > 0 && `${a.creditos} créditos`,
                                    numero(a.semestre) > 0 && `Semestre ${a.semestre}`,
                                    numero(a.total_estudiantes) > 0 && `${a.total_estudiantes} estudiantes`,
                                  ]) || '—'}
                                  <InfoSecundaria>{textoConSeparador([
                                    numero(a.horas_base) > 0 && `${a.horas_base} h base`,
                                    numero(a.porcentaje_pta) > 0 && `${a.porcentaje_pta}% del PTA`,
                                  ])}</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, verticalAlign: 'top' }}>{rangoFechas(a.fecha_inicio, a.fecha_fin) || '—'}</td>
                                <td style={{ ...celdaTd, verticalAlign: 'top', fontWeight: 900, color: PTA_COLORS.DOCENCIA }}>{numero(a.total_horas ?? a.horas)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {(proyectosInv.length > 0 || actInv.length > 0) && (
                    <section className={claseSeccionReporte(proyectosInv.length + actInv.length)} style={{ borderBottom: `3px solid ${NAVY}` }}>
                      <EncabezadoDetalle titulo="Investigación" subtitulo={textoConSeparador([
                        proyectosInv.length > 0 && `${proyectosInv.length} ${proyectosInv.length === 1 ? 'proyecto' : 'proyectos'}`,
                        actInv.length > 0 && `${actInv.length} ${actInv.length === 1 ? 'actividad' : 'actividades'}`,
                      ]) || 'Información registrada'} horas={horasInvestigacion} color={PTA_COLORS.INVESTIGACION} estado={estadoDe('investigacion')} />
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                          <thead>
                            <tr>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Proyecto / Actividad</th>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Detalle</th>
                              <th style={celdaTh}>Periodo</th>
                              <th style={celdaTh}>Horas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {proyectosInv.map((proyecto: any, index: number) => (
                              <tr key={`proyecto-${proyecto.id || proyecto.codigo || index}`}>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 800 }}>{proyecto.nombre || proyecto.nombre_proyecto || 'Proyecto de investigación'}</div>
                                  <InfoSecundaria>Proyecto de investigación</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  {textoConSeparador([
                                    proyecto.rol && `Rol: ${proyecto.rol}`,
                                    proyecto.codigo && `Código: ${proyecto.codigo}`,
                                    proyecto.grupo && `Grupo: ${proyecto.grupo}`,
                                    proyecto.linea && `Línea: ${proyecto.linea}`,
                                  ]) || '—'}
                                  <InfoSecundaria>{proyecto.resolucion_nombre ? `Resolución: ${proyecto.resolucion_nombre}` : null}</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, verticalAlign: 'top' }}>{rangoFechas(proyecto.fecha_inicio, proyecto.fecha_fin) || '—'}</td>
                                <td style={{ ...celdaTd, verticalAlign: 'top', fontWeight: 900, color: PTA_COLORS.INVESTIGACION }}>{numero(proyecto.horas_solicitadas)}</td>
                              </tr>
                            ))}
                            {actInv.map((actividad: any, index: number) => (
                              <tr key={`actividad-${actividad.id || actividad.actividad_id || index}`}>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 800 }}>{actividad.nombre || actividad.actividad_nombre || actividad.actividad_id || 'Actividad de investigación'}</div>
                                  <InfoSecundaria>{actividad.descripcion || null}</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  {textoConSeparador([
                                    numero(actividad.cantidad) > 0 && `Cantidad: ${actividad.cantidad}`,
                                    numero(actividad.horas_unitarias) > 0 && `${actividad.horas_unitarias} h unitarias`,
                                    actividad.resolucion_nombre && `Resolución: ${actividad.resolucion_nombre}`,
                                  ]) || 'Actividad investigativa'}
                                </td>
                                <td style={{ ...celdaTd, verticalAlign: 'top' }}>{rangoFechas(actividad.fecha_inicio, actividad.fecha_fin) || '—'}</td>
                                <td style={{ ...celdaTd, verticalAlign: 'top', fontWeight: 900, color: PTA_COLORS.INVESTIGACION }}>{numero(actividad.horas_total ?? actividad.horas)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {extActs.length > 0 && (
                    <section className={claseSeccionReporte(extActs.length)} style={{ borderBottom: `3px solid ${NAVY}` }}>
                      <EncabezadoDetalle titulo="Extensión Académica" subtitulo={`${extActs.length} ${extActs.length === 1 ? 'actividad registrada' : 'actividades registradas'}`} horas={horasExtension} color={PTA_COLORS.EXTENSION} estado={estadoDe('extension')} />
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                          <thead>
                            <tr>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Actividad</th>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Sección / Selección</th>
                              <th style={celdaTh}>Periodo</th>
                              <th style={celdaTh}>Horas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {extActs.map((actividad: any, index: number) => {
                              const selection = getExtensionSelectionInfo(actividad);
                              return (
                                <tr key={actividad.id || actividad.actividad_id || index}>
                                  <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 800 }}>{actividad.nombre || actividad.nombre_actividad || actividad.actividad_nombre || actividad.actividad_id || 'Actividad de extensión'}</div>
                                    <InfoSecundaria>{actividad.descripcion || null}</InfoSecundaria>
                                  </td>
                                  <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                    <div>{textoSeccion(actividad.seccion) || 'Extensión académica'}</div>
                                    {selection && (
                                      <InfoSecundaria>
                                        {selection.etiqueta}: {selection.nombre}
                                        {selection.detalles.map((detail: any) => textoConSeparador([
                                          detail.nombre,
                                          ...detail.valores.map((value: any) => value.columna ? `${value.columna}: ${value.valor}` : value.valor),
                                        ])).filter(Boolean).map((detail: string, detailIndex: number) => <React.Fragment key={detailIndex}><br />{detail}</React.Fragment>)}
                                      </InfoSecundaria>
                                    )}
                                  </td>
                                  <td style={{ ...celdaTd, verticalAlign: 'top' }}>{rangoFechas(actividad.fecha_inicio, actividad.fecha_fin) || '—'}</td>
                                  <td style={{ ...celdaTd, verticalAlign: 'top', fontWeight: 900, color: PTA_COLORS.EXTENSION }}>{numero(actividad.horas ?? actividad.horas_ejecutadas)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {compActs.length > 0 && (
                    <section className={claseSeccionReporte(compActs.length)}>
                      <EncabezadoDetalle titulo="Actividades Complementarias" subtitulo={`${compActs.length} ${compActs.length === 1 ? 'actividad registrada' : 'actividades registradas'}`} horas={horasComplementarias} color="#A16207" estado={estadoDe('complementarias')} />
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
                          <thead>
                            <tr>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Actividad</th>
                              <th style={{ ...celdaTh, textAlign: 'left' }}>Sección / Descripción</th>
                              <th style={celdaTh}>Periodo</th>
                              <th style={celdaTh}>Horas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {compActs.map((actividad: any, index: number) => (
                              <tr key={actividad.id || actividad.actividad_id || index}>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div style={{ fontWeight: 800 }}>{actividad.nombre || actividad.actividad_nombre || actividad.actividad_id || 'Actividad complementaria'}</div>
                                </td>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div>{textoSeccion(actividad.seccion) || 'Complementarias de docencia'}</div>
                                  <InfoSecundaria>{actividad.descripcion || null}</InfoSecundaria>
                                </td>
                                <td style={{ ...celdaTd, verticalAlign: 'top' }}>{rangoFechas(actividad.fecha_inicio, actividad.fecha_fin) || '—'}</td>
                                <td style={{ ...celdaTd, verticalAlign: 'top', fontWeight: 900, color: '#A16207' }}>{numero(actividad.horas)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </div>
              </>
            )}

            {/* ── Flujo de aprobación (solo componentes que hacen parte del PTA) ── */}
            {componentes.length > 0 && (
              <div className="reporte-pta-approval-page">
                  <BandaTitulo>Flujo de Aprobación</BandaTitulo>
                  <div className="reporte-pta-approval-content" style={{ display: 'flex', flexWrap: 'wrap', background: '#fff' }}>
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
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{horasProg > 0 ? '100%' : '0%'}</td>
                      <td style={{ ...celdaTd, background: HEAD_BG }} />
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{totalAprobadas}</td>
                      <td style={{ ...celdaTd, fontWeight: 900, background: HEAD_BG }}>{Math.max(horasProg - totalAprobadas, 0)}</td>
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
                        <strong>Firmante Autenticado:</strong> {userPerfil?.nombre || pta?.docente_nombre || '—'}<br />
                        El documento ha surtido efecto y ha sido anclado al expediente.
                      </div>
                    </div>
                  </div>
                )}
              </div>
                  </div>

                  {/* ── Pie: revisión Gestión Profesoral (datos reales o pendiente) ── */}
                  <div className="reporte-pta-review-footer" style={{ display: 'flex', flexWrap: 'wrap', fontSize: '0.68rem', fontWeight: 700, background: '#111827', color: '#fff', padding: '6px 8px', gap: 8, alignItems: 'center' }}>
                    <div>REVISIÓN GRUPO DE GESTIÓN PROFESORAL</div>
                    <div style={{ flex: 1, borderLeft: '1px solid #4B5563', paddingLeft: 12, display: 'flex', flexWrap: 'wrap', gap: 16, minWidth: 200 }}>
                      <div>FECHA REVISIÓN<br /><span style={{ fontWeight: 400, fontSize: '0.62rem', color: '#D1D5DB' }}>{fechaRevision || 'Pendiente'}</span></div>
                      <div>RESPONSABLE REVISIÓN<br /><span style={{ fontWeight: 400, fontSize: '0.62rem', color: '#D1D5DB' }}>{responsableRevision || 'Pendiente de revisión'}</span></div>
                    </div>
                    <div style={{ borderLeft: '1px solid #4B5563', paddingLeft: 12, fontSize: '0.62rem', display: 'flex', alignItems: 'center' }}>
                      {pctGlobal >= 100 ? 'APRUEBA' : ['Borrador', 'BORRADOR'].includes(String(pta?.estado)) ? 'BORRADOR' : 'EN REVISIÓN'}
                    </div>
                  </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
