/**
 * ReportePTAInstitucional — Reporte oficial estilo GTH-F081 (modal + impresión).
 *
 * Nota de estilos: el index.css del MFE es un snapshot precompilado de Tailwind,
 * por lo que las clases arbitrarias (bg-[#203764], grid-cols-[...]) no existen.
 * Todo el layout crítico va con estilos inline; la impresión se aísla con un
 * bloque @media print propio (ver <style> al inicio del render).
 */
import React, { useRef, useState } from 'react';
import { Download, Loader2, X, Printer, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend, LabelList,
} from 'recharts';
import { IsotipoESAP } from '../../../../../shell/src/components/assets/ESAPLogoSVG';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import { HierarchySelectionSummary } from '../../pta/shared/HierarchySelectionSummary';
import { formatPtaPensum } from '../../../utils/ptaPensumCompatibility';

interface ReportePTAInstitucionalProps {
  pta: any;
  userPerfil: any;
  onClose: () => void;
  isParcial?: boolean;
  certificadoId?: string;
  signedAt?: string;
  /** Configuración institucional del periodo al que pertenece el PTA. */
  periodoAcademico?: any;
  /** Registros reales de aprobación por componente (getComponentesAprobacion). Opcional. */
  componentesAprobacion?: any[];
}

const NAVY = '#203764';
const BAND = '#5B9BD5';
const HEAD_BG = '#D9E1F2';
const FORM_HEADER_BLUE = '#2E75B5';
const IDENT_LABEL_BG = '#AEABAB';
const IDENT_VALUE_BG = '#E7E6E6';

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

const datoNoVacio = (...values: any[]): any => values.find((value) => (
  value !== null
  && value !== undefined
  && String(value).trim() !== ''
));

const esUuid = (value: any): boolean => (
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(String(value || '').trim())
);

const documentoReal = (...values: any[]): string | null => {
  const value = values.find((candidate) => (
    candidate !== null
    && candidate !== undefined
    && String(candidate).trim() !== ''
    && !esUuid(candidate)
  ));
  return value === undefined ? null : String(value).trim();
};

const fmtDocumento = (value: string | null): string | null => {
  if (!value) return null;
  const compact = value.replace(/\s+/g, '');
  return /^\d+$/.test(compact)
    ? compact.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : value;
};

/**
 * html2canvas 1.x no reconoce funciones de color CSS modernas como oklch().
 * El navegador sí puede pintarlas, así que las convertimos a rgba() dentro del
 * documento clonado que usa la captura, sin modificar la vista real.
 */
const normalizarColoresCaptura = (documentoClonado: Document) => {
  const vista = documentoClonado.defaultView;
  const reporteClonado = documentoClonado.querySelector<HTMLElement>('.reporte-pta-document');
  if (!vista || !reporteClonado) return;

  const patronColorModerno = /(?:oklch|oklab|lab|lch|color)\((?:[^()]|\([^()]*\))*\)/gi;
  const propiedadesColor = [
    'background-color',
    'background-image',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'box-shadow',
    'caret-color',
    'color',
    'fill',
    'outline-color',
    'stroke',
    'text-decoration-color',
    'text-shadow',
    '-webkit-text-stroke-color',
  ];
  const cacheColores = new Map<string, string>();
  const canvasColor = documentoClonado.createElement('canvas');
  canvasColor.width = 1;
  canvasColor.height = 1;
  const contextoColor = canvasColor.getContext('2d', { willReadFrequently: true });

  const convertirColor = (colorCss: string): string => {
    const cacheado = cacheColores.get(colorCss);
    if (cacheado) return cacheado;
    if (!contextoColor) return 'rgba(0, 0, 0, 1)';

    try {
      contextoColor.clearRect(0, 0, 1, 1);
      contextoColor.fillStyle = '#010203';
      contextoColor.fillStyle = colorCss;
      contextoColor.fillRect(0, 0, 1, 1);
      const [r, g, b, alpha] = contextoColor.getImageData(0, 0, 1, 1).data;
      const convertido = `rgba(${r}, ${g}, ${b}, ${(alpha / 255).toFixed(4)})`;
      cacheColores.set(colorCss, convertido);
      return convertido;
    } catch {
      // Solo se alcanza en navegadores que tampoco entienden la función. Un
      // color sRGB válido evita que falle toda la descarga.
      return 'rgba(0, 0, 0, 1)';
    }
  };

  const elementos = [reporteClonado, ...Array.from(reporteClonado.querySelectorAll<HTMLElement>('*'))];
  for (const elemento of elementos) {
    const estiloCalculado = vista.getComputedStyle(elemento);
    for (const propiedad of propiedadesColor) {
      const valor = estiloCalculado.getPropertyValue(propiedad);
      if (!valor || !/(?:oklch|oklab|lab|lch|color)\(/i.test(valor)) continue;
      const valorCompatible = valor.replace(patronColorModerno, convertirColor);
      elemento.style.setProperty(propiedad, valorCompatible, 'important');
    }
  }

  // Evita que reglas globales creen pseudoelementos animados o con colores
  // modernos después de haber normalizado el árbol.
  const estilosCaptura = documentoClonado.createElement('style');
  estilosCaptura.textContent = `
    .reporte-pta-document,
    .reporte-pta-document * {
      animation: none !important;
      transition: none !important;
    }
    .reporte-pta-document *::before,
    .reporte-pta-document *::after {
      box-shadow: none !important;
      text-shadow: none !important;
    }
  `;
  documentoClonado.head.appendChild(estilosCaptura);
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

function fmtFechaOTexto(value?: any): string | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim();
  return fmtFechaReporte(text) || text;
}

/** Celda etiqueta+valor de la sección de identificación. */
function CampoIdent({
  label,
  value,
  gridColumn,
  gridRow,
  valueFontSize = '0.67rem',
  noWrap = false,
}: {
  label: string;
  value: any;
  gridColumn: string;
  gridRow: string;
  valueFontSize?: string;
  noWrap?: boolean;
}) {
  return (
    <div style={{
      gridColumn,
      gridRow,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #111827',
      borderBottom: '1px solid #111827',
      background: IDENT_VALUE_BG,
    }}>
      <div style={{
        minHeight: 31,
        padding: '5px 6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: IDENT_LABEL_BG,
        borderBottom: '1px solid #111827',
        color: '#000',
        fontSize: '0.53rem',
        fontWeight: 800,
        lineHeight: 1.15,
        textAlign: 'center',
      }}>
        {label}
      </div>
      <div style={{
        flex: 1,
        minHeight: 58,
        padding: '7px 7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: IDENT_VALUE_BG,
        color: '#000',
        fontSize: valueFontSize,
        fontWeight: 700,
        lineHeight: 1.25,
        textAlign: 'center',
        whiteSpace: noWrap ? 'nowrap' : 'pre-wrap',
        overflowWrap: 'anywhere',
      }}>
        {value ?? '—'}
      </div>
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
              <Bar
                key={serie.key}
                dataKey={serie.key}
                name={serie.name}
                stackId="docencia"
                fill={serie.color}
                maxBarSize={56}
                isAnimationActive={false}
              >
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
  pta, userPerfil, onClose, isParcial = true, certificadoId, signedAt, periodoAcademico,
  componentesAprobacion = [],
}: ReportePTAInstitucionalProps) {
  const reporteDocumentoRef = useRef<HTMLDivElement | null>(null);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [errorExportacion, setErrorExportacion] = useState<string | null>(null);

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
  const compActsPrimary: any[] = (
    Array.isArray(pta?.complementarias)
      ? pta.complementarias
      : (Array.isArray(compLegacy) ? compLegacy : [])
  ).filter((a: any) => a && (a.nombre || a.actividad_nombre || a.actividad_id || numero(a.horas) > 0));
  const compActsLegacyAadm: any[] = Array.isArray(pta?.academico_admin) ? pta.academico_admin : [];
  const compActs: any[] = [
    ...compActsPrimary.map((activity: any) =>
      activity?.seccion == null && activity?.consumeTotalidad !== undefined
        ? { ...activity, seccion: 'academico_administrativas' }
        : activity),
    ...compActsLegacyAadm
      .filter((legacy: any) => !compActsPrimary.some((current: any) =>
        String(current?.actividad_id ?? current?.id) === String(legacy?.actividad_id ?? legacy?.id)
        && (
          current?.seccion === 'academico_administrativas'
          || (current?.seccion == null && current?.consumeTotalidad !== undefined)
        )))
      .map((activity: any) => ({ ...activity, seccion: 'academico_administrativas' })),
  ].filter((a: any) => a && (a.nombre || a.actividad_nombre || a.actividad_id || numero(a.horas) > 0));

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

  const hayDetalle = asignaturas.length > 0 || proyectosInv.length > 0 || actInv.length > 0 || extActs.length > 0 || compActs.length > 0;

  // ── Encabezado oficial GTH-F081 ─────────────────────────────────────
  // La ficha del Banco de Docentes/RUND es la única fuente de los datos de
  // vinculación. Una territorial, sede o núcleo de una asignatura no se usa
  // para completar la vinculación del docente: si RUND no tiene el dato, se
  // muestra "—". El PTA solo respalda identidad/contacto y datos del plan.
  const periodoCodigo = String(datoNoVacio(
    typeof pta?.periodo === 'string' ? pta.periodo : pta?.periodo?.codigo,
    periodoAcademico?.codigo,
  ) || '').trim();
  const periodoAnio = String(datoNoVacio(
    periodoAcademico?.anio,
    periodoCodigo.match(/^\d{4}/)?.[0],
  ) || '');
  const identificacionDocente = fmtDocumento(documentoReal(
    userPerfil?.documento_identidad,
    userPerfil?.documento,
    userPerfil?.identificacion,
    pta?.docente_documento,
  ));
  const nombreDocente = datoNoVacio(
    userPerfil?.nombre_completo,
    userPerfil?.nombre,
    pta?.docente_nombre,
  );
  const perfilAcademico = datoNoVacio(
    userPerfil?.perfil_academico,
    userPerfil?.perfil_academico_pro,
  );
  const categoriaDocente = datoNoVacio(userPerfil?.categoria);
  const territorialVinculacion = datoNoVacio(userPerfil?.territorial);
  const situacionAdministrativa = datoNoVacio(userPerfil?.situacion_administrativa);
  const ultimaEvaluacion = datoNoVacio(userPerfil?.ultima_evaluacion);
  const correoInstitucional = datoNoVacio(
    userPerfil?.correo_institucional,
    userPerfil?.email,
    pta?.docente_email,
    pta?.correo_institucional,
  );
  const correoPersonal = datoNoVacio(
    userPerfil?.correo_personal,
    userPerfil?.correo_alternativo,
  );
  const telefonoDocente = datoNoVacio(
    userPerfil?.telefono,
    userPerfil?.numero_celular,
    pta?.telefono_docente,
  );
  const tipoVinculacion = datoNoVacio(
    userPerfil?.vinculacion,
    pta?.tipo_vinculacion,
  );
  const tipoDedicacion = datoNoVacio(
    userPerfil?.dedicacion,
    pta?.dedicacion,
  );
  const nucleoVinculacion = datoNoVacio(userPerfil?.nucleo_tematico);
  const actoAdministrativo = datoNoVacio(userPerfil?.acto_administrativo_vinculacion);
  const inicioVinculacion = fmtFechaOTexto(datoNoVacio(
    userPerfil?.inicio_vinculacion,
  ));
  const finVinculacion = fmtFechaOTexto(datoNoVacio(
    userPerfil?.fin_vinculacion,
  ));
  const inicioPeriodoAcademico = fmtFechaOTexto(datoNoVacio(
    periodoAcademico?.fechaInicio,
    periodoAcademico?.fecha_inicio,
    pta?.periodo_fecha_inicio,
  ));
  const finPeriodoAcademico = fmtFechaOTexto(datoNoVacio(
    periodoAcademico?.fechaFin,
    periodoAcademico?.fecha_fin,
    pta?.periodo_fecha_fin,
  ));
  const horasProgramables = [
    userPerfil?.horas_programables,
    pta?.horas_asignables,
    pta?.horas_a_programar,
    horasDisp,
  ].map(numero).find(value => value > 0) || 0;

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

  const handleNativePrint = () => {
    // Permite que el navegador complete el layout del modal antes de activar
    // los estilos y gráficos específicos de impresión.
    window.dispatchEvent(new Event('resize'));
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  const esperarRender = (ms = 0) => new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (ms > 0) window.setTimeout(resolve, ms);
        else resolve();
      });
    });
  });

  /**
   * Genera una página PDF continua a partir del documento visible. Al rasterizar
   * el reporte completo no hay reflujo, saltos automáticos ni diferencias entre
   * el layout de pantalla y el archivo descargado.
   */
  const handleExportPdfFiel = async () => {
    const reporte = reporteDocumentoRef.current;
    if (!reporte || exportandoPdf) return;

    setExportandoPdf(true);
    setErrorExportacion(null);

    const sheet = reporte.closest('.reporte-pta-sheet') as HTMLElement | null;
    const originalSheetWidth = sheet?.style.width || '';
    const originalSheetMaxWidth = sheet?.style.maxWidth || '';
    const originalSheetOverflow = sheet?.style.overflow || '';
    const originalReportWidth = reporte.style.width;
    const originalReportMinWidth = reporte.style.minWidth;

    try {
      // La exportación usa el ancho institucional aun si se inicia desde un
      // teléfono. La vista responsive se restaura al terminar la captura.
      if (reporte.getBoundingClientRect().width < 1160) {
        if (sheet) {
          sheet.style.width = '1200px';
          sheet.style.maxWidth = 'none';
          sheet.style.overflow = 'visible';
        }
        reporte.style.width = '1188px';
        reporte.style.minWidth = '1188px';
        window.dispatchEvent(new Event('resize'));
        await esperarRender(220);
      }
      if (document.fonts?.ready) await document.fonts.ready;
      // Recharts calcula sus dimensiones después del layout y de las fuentes.
      // Esta espera breve garantiza que la captura use el SVG definitivo.
      await esperarRender(180);

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const ancho = Math.ceil(reporte.scrollWidth);
      const alto = Math.ceil(reporte.scrollHeight);
      const maxLadoCanvas = 30_000;
      const maxPixelesCanvas = 70_000_000;
      const escala = Math.max(0.75, Math.min(
        2,
        maxLadoCanvas / Math.max(ancho, alto),
        Math.sqrt(maxPixelesCanvas / Math.max(ancho * alto, 1)),
      ));

      const canvas = await html2canvas(reporte, {
        scale: escala,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
        onclone: normalizarColoresCaptura,
        width: ancho,
        height: alto,
        windowWidth: Math.max(1200, ancho),
        windowHeight: Math.max(window.innerHeight, alto),
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      if (!canvas.width || !canvas.height) {
        throw new Error('La captura del reporte no produjo una imagen válida.');
      }

      const anchoPdfMm = 297;
      const altoPdfMm = (canvas.height * anchoPdfMm) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [anchoPdfMm, altoPdfMm],
        compress: true,
      });

      pdf.setProperties({
        title: `Plan de Trabajo Académico ${periodoCodigo || ''}`.trim(),
        subject: 'Reporte Institucional PTA - Formato GTH-F081',
        author: 'Escuela Superior de Administración Pública - ESAP',
      });
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        anchoPdfMm,
        altoPdfMm,
        undefined,
        'FAST',
      );

      const nombreArchivo = String(nombreDocente || 'Docente')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      pdf.save(`PTA_GTH-F081_${periodoCodigo || 'periodo'}_${nombreArchivo || 'Docente'}.pdf`);
    } catch (error) {
      console.error('[Reporte PTA] No fue posible generar el PDF fiel:', error);
      setErrorExportacion('No fue posible generar el PDF. Puede intentar nuevamente o usar Imprimir.');
    } finally {
      if (sheet) {
        sheet.style.width = originalSheetWidth;
        sheet.style.maxWidth = originalSheetMaxWidth;
        sheet.style.overflow = originalSheetOverflow;
      }
      reporte.style.width = originalReportWidth;
      reporte.style.minWidth = originalReportMinWidth;
      window.dispatchEvent(new Event('resize'));
      await esperarRender();
      setExportandoPdf(false);
    }
  };

  const celdaTh: React.CSSProperties = { padding: '6px 8px', border: `1px solid ${NAVY}`, fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', background: HEAD_BG, color: '#111827', whiteSpace: 'nowrap' };
  const celdaTd: React.CSSProperties = { padding: '6px 8px', border: `1px solid ${NAVY}`, fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', color: '#111827', background: '#fff' };

  return (
    <AnimatePresence>
      {/* Aislamiento de impresión: solo la hoja del reporte es visible al imprimir. */}
      <style key="reporte-pta-estilos">{`
        .reporte-pta-document .recharts-wrapper > .recharts-surface {
          width: 100% !important;
          height: 100% !important;
        }
        .reporte-pta-only-print, .reporte-pta-print-page-break { display: none; }
        @media print {
          @page { size: landscape; margin: 8mm; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          body > *:not(.reporte-pta-overlay) { display: none !important; }
          body *:has(.reporte-pta-overlay) { visibility: visible !important; }
          .reporte-pta-overlay { position: relative !important; inset: auto !important; width: 100% !important; overflow: visible !important; padding: 0 !important; background: #fff !important; display: block !important; }
          .reporte-pta-overlay, .reporte-pta-overlay * { visibility: visible !important; }
          .reporte-pta-sheet { position: relative !important; margin: 0 auto !important; box-shadow: none !important; max-width: 100% !important; border-radius: 0 !important; overflow: visible !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .reporte-pta-document, .reporte-pta-document * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .reporte-pta-document { background: #fff !important; border-color: ${NAVY} !important; }
          .reporte-pta-document table { border-collapse: collapse !important; border-spacing: 0 !important; }
          .reporte-pta-document th, .reporte-pta-document td { border-color: ${NAVY} !important; }
          .reporte-pta-hide-print { display: none !important; }
          .reporte-pta-hide-chart-print { display: none !important; }
          .reporte-pta-only-print { display: block !important; }
          .reporte-pta-ident-scroll { overflow: visible !important; }
          .reporte-pta-ident-grid { min-width: 0 !important; }
          .reporte-pta-print-page-break { display: none !important; }
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
        key="reporte-pta-overlay"
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
              <div style={{ fontSize: '0.68rem', color: '#6B7280' }}>
                Formato GTH-F081 · Periodo {periodoCodigo || '—'}{isParcial ? ' · Informe parcial' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handleExportPdfFiel}
                disabled={exportandoPdf}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#003DA5', color: '#fff', fontSize: '0.76rem', fontWeight: 700, cursor: exportandoPdf ? 'wait' : 'pointer', opacity: exportandoPdf ? 0.75 : 1 }}
              >
                {exportandoPdf
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <Download size={14} />}
                {exportandoPdf ? 'Generando PDF…' : 'Descargar PDF fiel'}
              </button>
              <button
                onClick={handleNativePrint}
                disabled={exportandoPdf}
                title="Abrir la impresión estándar del navegador"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: '0.76rem', fontWeight: 700, cursor: exportandoPdf ? 'not-allowed' : 'pointer', opacity: exportandoPdf ? 0.55 : 1 }}
              >
                <Printer size={14} /> Imprimir
              </button>
              <button
                onClick={onClose}
                aria-label="Cerrar reporte"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <X size={14} /> Cerrar
              </button>
            </div>
            {errorExportacion && (
              <div role="alert" style={{ width: '100%', color: '#B91C1C', fontSize: '0.68rem', fontWeight: 700 }}>
                {errorExportacion}
              </div>
            )}
          </div>

          <div
            ref={reporteDocumentoRef}
            className="reporte-pta-document"
            style={{ border: `8px solid ${NAVY}`, margin: 6 }}
          >
            {/* ── Header oficial ── */}
            <div
              className="reporte-pta-keep-together"
              style={{
                display: 'grid',
                gridTemplateColumns: '112px minmax(0, 1fr) 132px',
                minHeight: 86,
                border: '2px solid #111827',
                background: FORM_HEADER_BLUE,
                position: 'relative',
              }}
            >
              <div style={{
                background: '#fff',
                borderRight: '2px solid #111827',
                padding: '4px 6px 3px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <IsotipoESAP variant="icon-color" width={42} height={48} />
                <div style={{
                  marginTop: -4,
                  color: '#111827',
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: '0.43rem',
                  fontWeight: 700,
                  lineHeight: 1.05,
                  textAlign: 'center',
                }}>
                  Escuela Superior de<br />Administración Pública
                </div>
              </div>
              <div style={{
                minWidth: 0,
                padding: '7px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                textAlign: 'center',
                fontStyle: 'italic',
                fontWeight: 800,
                lineHeight: 1.2,
              }}>
                <div style={{ fontSize: '0.96rem', textTransform: 'uppercase' }}>PLAN DE TRABAJO ACADÉMICO DOCENTE - PTA</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Escuela Superior de Administración Pública - ESAP</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>Grupo de Gestión Profesoral - {periodoAnio || '—'}</div>
              </div>
              <div style={{
                borderLeft: '2px solid #111827',
                padding: '6px 7px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                color: '#FFFFFF',
                fontSize: '0.5rem',
                fontWeight: 700,
                fontStyle: 'italic',
                lineHeight: 1.15,
                textAlign: 'right',
                textShadow: '0 1px 1px rgba(0, 0, 0, 0.35)',
              }}>
                <span>PTA - {periodoAnio || '—'}</span>
                <span>Copyright: Arley Carvajal Villalobos 2020</span>
                <span>Versión 09.2025</span>
                {isParcial && (
                  <span style={{
                    padding: '2px 5px',
                    background: '#FACC15',
                    border: '1px solid #A16207',
                    borderRadius: 2,
                    color: '#111827',
                    fontSize: '0.44rem',
                    fontStyle: 'normal',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    textShadow: 'none',
                  }}>
                    Informe parcial
                  </span>
                )}
              </div>
            </div>

            {/* ── Identificación docente (solo datos reales; '—' si no hay dato) ── */}
            <div className="reporte-pta-keep-together">
              <BandaTitulo>Identificación Docente</BandaTitulo>
              <div className="reporte-pta-ident-scroll" style={{ overflowX: 'auto', borderBottom: `3px solid ${NAVY}` }}>
                <div
                  className="reporte-pta-ident-grid"
                  style={{
                    minWidth: 1080,
                    display: 'grid',
                    gridTemplateColumns: '24.71fr 24.71fr 31.86fr 34.86fr 35.14fr 28.29fr 23.43fr 26fr 47.29fr 25.86fr 30.43fr 30fr 22.29fr',
                    gridTemplateRows: 'minmax(104px, auto) minmax(104px, auto)',
                    borderLeft: '1px solid #111827',
                    borderTop: '1px solid #111827',
                    background: '#fff',
                  }}
                >
                  <CampoIdent label="Número de Cédula" value={identificacionDocente} gridColumn="1 / 2" gridRow="1 / 3" valueFontSize="0.63rem" noWrap />
                  <CampoIdent label="Nombre" value={nombreDocente} gridColumn="2 / 4" gridRow="1 / 2" valueFontSize="0.72rem" />
                  <CampoIdent label="Perfil Académico" value={perfilAcademico} gridColumn="4 / 6" gridRow="1 / 2" valueFontSize="0.62rem" />
                  <CampoIdent label="Categoría" value={categoriaDocente} gridColumn="6 / 7" gridRow="1 / 2" />
                  <CampoIdent label="Sede Territorial de Vinculación" value={territorialVinculacion} gridColumn="7 / 8" gridRow="1 / 2" valueFontSize="0.59rem" />
                  <CampoIdent label="Situación Administrativa" value={situacionAdministrativa} gridColumn="8 / 10" gridRow="1 / 2" valueFontSize="0.61rem" />
                  <CampoIdent label="Última Evaluación Docente" value={ultimaEvaluacion} gridColumn="10 / 11" gridRow="1 / 2" valueFontSize="0.59rem" />
                  <CampoIdent label="Correo Institucional" value={correoInstitucional} gridColumn="11 / 12" gridRow="1 / 2" valueFontSize="0.58rem" />
                  <CampoIdent label="Correo Personal" value={correoPersonal} gridColumn="12 / 13" gridRow="1 / 2" valueFontSize="0.58rem" />
                  <CampoIdent label="Número Celular" value={telefonoDocente} gridColumn="13 / 14" gridRow="1 / 2" valueFontSize="0.61rem" />

                  <CampoIdent label="Tipo de Vinculación" value={tipoVinculacion} gridColumn="2 / 3" gridRow="2 / 3" />
                  <CampoIdent label="Tipo de Dedicación" value={tipoDedicacion} gridColumn="3 / 4" gridRow="2 / 3" />
                  <CampoIdent label="Núcleo Temático de Vinculación" value={nucleoVinculacion} gridColumn="4 / 6" gridRow="2 / 3" valueFontSize="0.61rem" />
                  <CampoIdent label="Acto Administrativo de Vinculación" value={actoAdministrativo} gridColumn="6 / 8" gridRow="2 / 3" valueFontSize="0.58rem" />
                  <CampoIdent label="Fecha Inicio de Vinculación" value={inicioVinculacion} gridColumn="8 / 10" gridRow="2 / 3" />
                  <CampoIdent label="Fecha Fin de Vinculación" value={finVinculacion} gridColumn="10 / 11" gridRow="2 / 3" valueFontSize="0.61rem" />
                  <CampoIdent label={`Inicio Periodo Académico ${periodoCodigo || ''}`} value={inicioPeriodoAcademico} gridColumn="11 / 12" gridRow="2 / 3" valueFontSize="0.61rem" />
                  <CampoIdent label={`Fin Periodo Académico ${periodoCodigo || ''}`} value={finPeriodoAcademico} gridColumn="12 / 13" gridRow="2 / 3" valueFontSize="0.61rem" />
                  <CampoIdent label="Total Horas Programables" value={horasProgramables > 0 ? horasProgramables : null} gridColumn="13 / 14" gridRow="2 / 3" valueFontSize="1rem" />
                </div>
              </div>
            </div>

            {/* ── Título periodo ── */}
            <BandaTitulo>Plan de Trabajo Académico - PTA · Periodo {periodoCodigo || '—'}</BandaTitulo>

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
                            <Bar
                              dataKey="horas"
                              radius={[0, 4, 4, 0]}
                              maxBarSize={22}
                              isAnimationActive={false}
                            >
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
                              isAnimationActive={false}
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
                                  <HierarchySelectionSummary activity={a} accent={PTA_COLORS.DOCENCIA} compact className="mt-1" />
                                </td>
                                <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                  <div>{a.programa_nombre || a.programa || '—'}</div>
                                  <InfoSecundaria>{`Pensum: ${formatPtaPensum(a.pensum)}`}</InfoSecundaria>
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
                                  <HierarchySelectionSummary activity={proyecto} accent={PTA_COLORS.INVESTIGACION} compact className="mt-1" />
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
                                  <HierarchySelectionSummary activity={actividad} accent={PTA_COLORS.INVESTIGACION} compact className="mt-1" />
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
                            {extActs.map((actividad: any, index: number) => (
                                <tr key={actividad.id || actividad.actividad_id || index}>
                                  <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: 800 }}>{actividad.nombre || actividad.nombre_actividad || actividad.actividad_nombre || actividad.actividad_id || 'Actividad de extensión'}</div>
                                    <HierarchySelectionSummary activity={actividad} accent={PTA_COLORS.EXTENSION} compact className="mt-1" />
                                    <InfoSecundaria>{actividad.descripcion || null}</InfoSecundaria>
                                  </td>
                                  <td style={{ ...celdaTd, textAlign: 'left', verticalAlign: 'top' }}>
                                    <div>{textoSeccion(actividad.seccion) || 'Extensión académica'}</div>
                                  </td>
                                  <td style={{ ...celdaTd, verticalAlign: 'top' }}>{rangoFechas(actividad.fecha_inicio, actividad.fecha_fin) || '—'}</td>
                                  <td style={{ ...celdaTd, verticalAlign: 'top', fontWeight: 900, color: PTA_COLORS.EXTENSION }}>{numero(actividad.horas ?? actividad.horas_ejecutadas)}</td>
                                </tr>
                            ))}
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
                                  <HierarchySelectionSummary activity={actividad} accent="#A16207" compact className="mt-1" />
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
                        <strong>Firmante Autenticado:</strong> {nombreDocente || '—'}<br />
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
