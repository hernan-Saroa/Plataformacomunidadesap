/**
 * PTAResumenPrint — Vista previa e impresión del Resumen Individual del PTA.
 *
 * Documento oficial por docente: toda la información sale del DTO del PTA
 * seleccionado (asignaturas, investigación, extensión, complementarias,
 * estados de aprobación por componente). Sin datos fijos.
 *
 * Nota de estilos: el index.css del MFE es un snapshot precompilado de
 * Tailwind (las clases arbitrarias y variantes print: no existen), por eso
 * el layout crítico va con estilos inline y la impresión se aísla con el
 * bloque @media print del render.
 */
import React from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PTA_COLORS } from '../../pta/shared/ptaColors';
import { HierarchySelectionSummary } from '../../pta/shared/HierarchySelectionSummary';
import { getPtaStatusVisual } from '../../pta/shared/ptaStatusVisuals';
import { formatPtaCompletionPercentage } from '../../../utils/ptaCompletion';
import { formatPtaPensum } from '../../../utils/ptaPensumCompatibility';

interface PTAResumenPrintProps {
  pta: any;
  onClose: () => void;
  userPersonId: string;
  userName?: string;
}

// ── Etiquetas y helpers ─────────────────────────────────────────────────

const ESTADO_PRINT: Record<string, { label: string; color: string; bg: string }> = {
  'Borrador': { label: 'Borrador', color: '#4B5563', bg: '#F3F4F6' },
  'Pendiente Jefatura': { label: 'Pendiente de Aprobación', color: '#92400E', bg: '#FEF3C7' },
  'Pendiente Decanatura': { label: 'Pendiente de Aprobación', color: '#92400E', bg: '#FEF3C7' },
  'Pendiente Gestión Profesoral': { label: 'Pendiente de Aprobación', color: '#92400E', bg: '#FEF3C7' },
  'PENDIENTE_APROBACION': { label: 'Pendiente de Aprobación', color: '#92400E', bg: '#FEF3C7' },
  'Aprobado': { label: 'Aprobado', color: '#047857', bg: '#D1FAE5' },
  'En Firme': { label: 'En Firme — Firmado y Radicado', color: '#065F46', bg: '#D1FAE5' },
  'Finalizado': { label: 'Finalizado', color: '#5B21B6', bg: '#EDE9FE' },
  'Terminado': { label: 'Terminado', color: '#374151', bg: '#E5E7EB' },
  'Rechazado': { label: 'Rechazado', color: '#991B1B', bg: '#FEE2E2' },
  'Devuelto': { label: 'Devuelto — Corrección requerida', color: '#9A3412', bg: '#FFF7ED' },
};
const estadoDocCfg = (e?: string) => {
  const visual = getPtaStatusVisual(e);
  return { ...visual, label: ESTADO_PRINT[e || '']?.label || visual.label };
};

const SECCION_PRINT_LABELS: Record<string, string> = {
  capacitacion: 'Dirección de Capacitación',
  seleccion: 'Dirección de Procesos de Selección',
  fortalecimiento: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  alto_gobierno: 'Escuela de Alto Gobierno',
  laboratorio_innovacion: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  investigacion_aplicada: 'Fortalecimiento y Apoyo a la Gestión Estatal',
  complementarias_docencia: 'Complementaria de docencia',
  academico_administrativas: 'Académico-administrativa',
};
const seccionPrintLabel = (s?: string) =>
  s ? (SECCION_PRINT_LABELS[s] || s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')) : '';

/** 'YYYY-MM-DD...' → 'DD/MM/YYYY'. */
function fmtF(v?: string): string | null {
  if (!v || typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
}
const rangoF = (i?: string, f?: string) => {
  const a = fmtF(i); const b = fmtF(f);
  return a && b ? `${a} — ${b}` : (a || b || '—');
};

/** Estado real de aprobación por componente (componentes_estado del DTO). */
function estadoComp(pta: any, key: string): string | null {
  if (['Aprobado', 'En Firme', 'Finalizado'].includes(pta?.estado)) return 'aprobado';
  if (pta?.estado === 'Borrador') return null;
  const arr = Array.isArray(pta?.componentes_estado) ? pta.componentes_estado : [];
  return arr.find((c: any) => c?.key === key)?.estado || null;
}

const ESTADO_COMP_CFG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  aprobado: { label: 'Aprobado', color: '#047857', bg: '#D1FAE5', icon: CheckCircle2 },
  devuelto: { label: 'Devuelto', color: '#B91C1C', bg: '#FEE2E2', icon: RotateCcw },
  pendiente: { label: 'Pendiente', color: '#92400E', bg: '#FEF3C7', icon: Clock },
};

function ChipEstadoComp({ estado }: { estado?: string | null }) {
  if (!estado) return <span style={{ color: '#9CA3AF', fontSize: '0.66rem' }}>—</span>;
  const cfg = ESTADO_COMP_CFG[estado] || ESTADO_COMP_CFG.pendiente;
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 999, background: cfg.bg, color: cfg.color, fontSize: '0.64rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
      <Icon size={10} /> {cfg.label}
    </span>
  );
}

/** Celda etiqueta+valor de la ficha del docente. */
function Dato({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#111827', marginTop: 2, overflowWrap: 'anywhere' }}>{value ?? '—'}</div>
    </div>
  );
}

/** Encabezado de sección numerado con el color del componente. */
function TituloSeccion({ num, titulo, color, totalHoras, estado }: { num: number; titulo: string; color: string; totalHoras?: number; estado?: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: '#F3F4F6', borderLeft: `4px solid ${color}`, padding: '7px 12px', marginBottom: 12 }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{num}. {titulo}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {estado !== undefined && <ChipEstadoComp estado={estado} />}
        {Number(totalHoras) > 0 && (
          <span style={{ padding: '2px 10px', borderRadius: 999, background: `${color}14`, color, border: `1px solid ${color}33`, fontSize: '0.7rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {totalHoras}h
          </span>
        )}
      </div>
    </div>
  );
}

const TH: React.CSSProperties = { padding: '6px 8px', border: '1px solid #E5E7EB', background: '#F9FAFB', fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: '#4B5563', textAlign: 'left', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '6px 8px', border: '1px solid #E5E7EB', fontSize: '0.74rem', color: '#1F2937', verticalAlign: 'top' };
const TDC: React.CSSProperties = { ...TD, textAlign: 'center', whiteSpace: 'nowrap' };
const SUB: React.CSSProperties = { fontSize: '0.62rem', color: '#9CA3AF', marginTop: 2 };
const zebra = (i: number): React.CSSProperties => ({ background: i % 2 === 1 ? '#FAFAFA' : '#fff' });

export function PTAResumenPrint({ pta, onClose, userPersonId, userName }: PTAResumenPrintProps) {
  const handlePrint = () => window.print();

  const today = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  // ── Normalización de datos (DTO plano del portal o forma agrupada del backoffice) ──
  const asigs: any[] = Array.isArray(pta?.asignaturas) ? pta.asignaturas : [];
  const proy = (pta?.investigacion_proyecto?.nombre || pta?.investigacion_proyecto?.rol) ? pta.investigacion_proyecto : null;
  const proyectos: any[] = proy ? [proy] : (pta?.investigacion?.proyectos || []);
  const actInv: any[] = pta?.investigacion_actividades || pta?.investigacion?.actividades || [];
  const extActs: any[] = Array.isArray(pta?.extension_actividades)
    ? pta.extension_actividades
    : (pta?.extension ? (Object.values(pta.extension).flat() as any[]) : []);
  const compActsPrimary: any[] = Array.isArray(pta?.complementarias)
    ? pta.complementarias
    : (pta?.complementarias?.actividades || []);
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
  ];

  // ── Horas (priorizan agregados del backend: incluyen multiplicadores de sección) ──
  const horasDoc = pta?.horas_docencia ?? asigs.reduce((s, a) => s + Number(a.total_horas || a.horas || 0), 0);
  const horasInv = pta?.horas_investigacion ?? (proyectos.reduce((s, p) => s + Number(p.horas_solicitadas || 0), 0) || actInv.reduce((s, a) => s + Number(a.horas_total || a.horas || 0), 0));
  const horasExt = pta?.horas_extension ?? extActs.reduce((s, a) => s + Number(a.horas || 0), 0);
  const horasComp = pta?.horas_complementarias ?? compActs.reduce((s, a) => s + Number(a.horas || 0), 0);
  const horasProg = pta?.horas_totales ?? pta?.total_horas_programadas ?? (horasDoc + horasInv + horasExt + horasComp);
  const horasDisp = pta?.horas_asignables ?? pta?.horas_a_programar ?? 0;
  const semanas = Number(pta?.semanas_vinculacion) || 16;
  const pctDe = (h: number) => (horasProg > 0 ? Math.round((h / horasProg) * 100) : 0);

  const hayInv = proyectos.length > 0 || actInv.length > 0;
  const estadoCfg = estadoDocCfg(pta?.estado);

  // Numeración dinámica de secciones (solo las que existen en este PTA).
  const secciones: string[] = ['info', 'docencia', ...(hayInv ? ['investigacion'] : []), ...(extActs.length ? ['extension'] : []), ...(compActs.length ? ['complementarias'] : []), 'resumen'];
  const numDe = (k: string) => secciones.indexOf(k) + 1;

  const resumenComponentes = [
    { key: 'academica', label: 'Docencia Directa', horas: horasDoc, color: PTA_COLORS.DOCENCIA },
    { key: 'investigacion', label: 'Investigación', horas: horasInv, color: PTA_COLORS.INVESTIGACION },
    { key: 'extension', label: 'Extensión Académica', horas: horasExt, color: PTA_COLORS.EXTENSION },
    { key: 'complementarias', label: 'Actividades Complementarias', horas: horasComp, color: '#A16207' },
  ];

  return (
    <AnimatePresence>
      {/* Aislamiento de impresión: solo la hoja del resumen es visible al imprimir. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .resumen-pta-overlay { position: absolute !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: auto !important; overflow: visible !important; padding: 0 !important; background: #fff !important; display: block !important; }
          .resumen-pta-sheet, .resumen-pta-sheet * { visibility: visible !important; }
          .resumen-pta-sheet { position: relative !important; margin: 0 auto !important; box-shadow: none !important; max-width: 100% !important; max-height: none !important; overflow: visible !important; border-radius: 0 !important; }
          .resumen-pta-body { overflow: visible !important; }
          .resumen-pta-hide-print { display: none !important; }
        }
      `}</style>
      <div
        className="resumen-pta-overlay"
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 8px 60px', background: 'rgba(17,24,39,0.7)', overflowY: 'auto' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="resumen-pta-sheet"
          style={{ background: '#fff', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', width: '100%', maxWidth: 900, overflow: 'hidden' }}
        >
          {/* ── Barra de controles (sticky, no imprime) ── */}
          <div
            className="resumen-pta-hide-print"
            style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', padding: '10px 16px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>Vista Previa — Resumen Individual PTA</div>
              <div style={{ fontSize: '0.7rem', color: '#6B7280' }}>Documento oficial generado por el sistema.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#003DA5', color: '#fff', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <Printer size={14} /> Imprimir / PDF
              </button>
              <button
                onClick={onClose}
                aria-label="Cerrar vista previa"
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer' }}
              >
                <X size={14} /> Cerrar
              </button>
            </div>
          </div>

          {/* ── Contenido imprimible ── */}
          <div className="resumen-pta-body" style={{ padding: '28px 32px', background: '#fff', color: '#111827' }}>
            {/* Membrete */}
            <div style={{ borderBottom: '3px solid #003DA5', paddingBottom: 14, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#003DA5', lineHeight: 1.2 }}>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
                <h2 style={{ margin: '4px 0 0', fontSize: '0.95rem', fontWeight: 700 }}>PLAN DE TRABAJO ACADÉMICO (PTA) — RESUMEN INDIVIDUAL</h2>
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', color: '#6B7280' }}>Documento generado: {today}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.76rem', fontWeight: 800, color: '#1E40AF' }}>
                  Periodo {pta?.periodo || '—'}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: estadoCfg.bg, color: estadoCfg.color, fontSize: '0.66rem', fontWeight: 800 }}>
                    {estadoCfg.label}
                  </span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.62rem', color: '#9CA3AF' }}>ID Sistema: {pta?.id?.substring(0, 8) || '—'}</p>
              </div>
            </div>

            {/* 1. Información del Docente */}
            <div style={{ marginBottom: 24 }}>
              <TituloSeccion num={numDe('info')} titulo="Información del Docente" color="#003DA5" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px 16px', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 16px' }}>
                <Dato label="Nombre" value={userName || pta?.docente_nombre} />
                <Dato label="Identificación (ID)" value={userPersonId} />
                <Dato label="Dedicación" value={pta?.dedicacion} />
                <Dato label="Tipo de Vinculación" value={pta?.tipo_vinculacion} />
                <Dato label="Sede Territorial" value={pta?.territorial} />
                <Dato label="CETAP" value={pta?.cetap} />
                <Dato label="Programa Académico" value={pta?.programa} />
                <Dato label="Semanas de Vinculación" value={pta?.semanas_vinculacion} />
                <Dato label="Horas Programadas" value={`${horasProg} de ${horasDisp} h disponibles`} />
                <Dato label="% de Carga" value={`${formatPtaCompletionPercentage(horasProg, horasDisp)}%`} />
              </div>
            </div>

            {/* 2. Docencia Directa */}
            <div style={{ marginBottom: 24 }}>
              <TituloSeccion num={numDe('docencia')} titulo="Docencia Directa" color={PTA_COLORS.DOCENCIA} totalHoras={horasDoc} estado={estadoComp(pta, 'academica')} />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
                  <thead>
                    <tr>
                      <th style={TH}>Asignatura</th>
                      <th style={TH}>Programa / CETAP</th>
                      <th style={TH}>Pensum</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Créd.</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Est.</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Hrs/Sem</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Periodo</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Total Hrs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asigs.length > 0 ? asigs.map((a: any, i: number) => {
                      const totalHoras = a.total_horas !== undefined ? Number(a.total_horas) : Number(a.horas || 0);
                      return (
                        <tr key={i} style={zebra(i)}>
                          <td style={TD}>
                            <div style={{ fontWeight: 700 }}>{a.nombre || a.asignatura_nombre || 'Asignatura'}</div>
                            {a.nucleo_tematico && <div style={SUB}>{a.nucleo_tematico}{a.semestre ? ` · ${a.semestre}` : ''}{a.modalidad ? ` · ${String(a.modalidad).charAt(0) + String(a.modalidad).slice(1).toLowerCase()}` : ''}</div>}
                            <HierarchySelectionSummary activity={a} accent={PTA_COLORS.DOCENCIA} compact className="mt-1" />
                          </td>
                          <td style={TD}>
                            {a.programa_nombre_completo || a.programa_nombre || a.programa || '—'}
                            {a.cetap_nombre && <div style={SUB}>CETAP {a.cetap_nombre}{a.territorial_nombre ? ` · ${a.territorial_nombre}` : ''}</div>}
                          </td>
                          <td style={TD}>{formatPtaPensum(a.pensum)}</td>
                          <td style={TDC}>{a.creditos || '-'}</td>
                          <td style={TDC}>{a.total_estudiantes || '-'}</td>
                          <td style={TDC}>{(totalHoras / semanas).toFixed(1)}</td>
                          <td style={TDC}>{rangoF(a.fecha_inicio, a.fecha_fin)}</td>
                          <td style={{ ...TDC, fontWeight: 800, color: PTA_COLORS.DOCENCIA }}>{totalHoras}</td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={8} style={{ ...TDC, color: '#9CA3AF', padding: 16 }}>No se registraron asignaturas en este componente.</td></tr>
                    )}
                    {asigs.length > 0 && (
                      <tr>
                        <td colSpan={7} style={{ ...TD, fontWeight: 800, textAlign: 'right', background: '#F9FAFB' }}>TOTAL DOCENCIA</td>
                        <td style={{ ...TDC, fontWeight: 900, background: '#F9FAFB', color: PTA_COLORS.DOCENCIA }}>{horasDoc}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Investigación */}
            {hayInv && (
              <div style={{ marginBottom: 24 }}>
                <TituloSeccion num={numDe('investigacion')} titulo="Investigación" color={PTA_COLORS.INVESTIGACION} totalHoras={horasInv} estado={estadoComp(pta, 'investigacion')} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Proyecto / Actividad</th>
                        <th style={TH}>Rol / Tipo</th>
                        <th style={{ ...TH, textAlign: 'center' }}>Periodo</th>
                        <th style={{ ...TH, textAlign: 'center' }}>Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectos.map((p: any, i: number) => (
                        <tr key={`p-${i}`} style={zebra(i)}>
                          <td style={TD}>
                            <div style={{ fontWeight: 700 }}>{p.nombre_proyecto || p.nombre || 'Proyecto de investigación'}</div>
                            <div style={SUB}>
                              {[p.codigo && `Código ${p.codigo}`, p.grupo && `Grupo ${p.grupo}`, p.linea && `Línea ${p.linea}`, p.resolucion_nombre && `Resolución: ${p.resolucion_nombre}`].filter(Boolean).join(' · ') || 'Proyecto registrado en el PTA'}
                            </div>
                            <HierarchySelectionSummary activity={p} accent={PTA_COLORS.INVESTIGACION} compact className="mt-1" />
                          </td>
                          <td style={TD}>{p.rol || 'Investigador'}</td>
                          <td style={TDC}>{rangoF(p.fecha_inicio, p.fecha_fin)}</td>
                          <td style={{ ...TDC, fontWeight: 800, color: PTA_COLORS.INVESTIGACION }}>{Number(p.horas_solicitadas || 0)}</td>
                        </tr>
                      ))}
                      {actInv.map((a: any, i: number) => (
                        <tr key={`a-${i}`} style={zebra(proyectos.length + i)}>
                          <td style={TD}>
                            <div style={{ fontWeight: 700 }}>{a.nombre || a.actividad_nombre || a.actividad || 'Actividad'}</div>
                            {(a.descripcion || Number(a.cantidad) > 0) && (
                              <div style={SUB}>
                                {[a.descripcion, Number(a.cantidad) > 0 && `Cantidad: ${a.cantidad}${Number(a.horas_unitarias) > 0 ? ` × ${a.horas_unitarias}h` : ''}`].filter(Boolean).join(' · ')}
                              </div>
                            )}
                            <HierarchySelectionSummary activity={a} accent={PTA_COLORS.INVESTIGACION} compact className="mt-1" />
                          </td>
                          <td style={TD}>{a.tipo || 'Actividad investigativa'}</td>
                          <td style={TDC}>{rangoF(a.fecha_inicio, a.fecha_fin)}</td>
                          <td style={{ ...TDC, fontWeight: 800, color: PTA_COLORS.INVESTIGACION }}>{Number(a.horas_total ?? a.horas ?? 0)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{ ...TD, fontWeight: 800, textAlign: 'right', background: '#F9FAFB' }}>TOTAL INVESTIGACIÓN</td>
                        <td style={{ ...TDC, fontWeight: 900, background: '#F9FAFB', color: PTA_COLORS.INVESTIGACION }}>{horasInv}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Extensión Académica */}
            {extActs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <TituloSeccion num={numDe('extension')} titulo="Extensión Académica" color={PTA_COLORS.EXTENSION} totalHoras={horasExt} estado={estadoComp(pta, 'extension')} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Actividad</th>
                        <th style={TH}>Sección</th>
                        <th style={{ ...TH, textAlign: 'center' }}>Periodo</th>
                        <th style={{ ...TH, textAlign: 'center' }}>Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extActs.map((a: any, i: number) => (
                        <tr key={i} style={zebra(i)}>
                          <td style={TD}>
                            <div style={{ fontWeight: 700 }}>{a.nombre_actividad || a.actividad_nombre || a.actividad || a.nombre || 'Actividad'}</div>
                            <HierarchySelectionSummary activity={a} accent={PTA_COLORS.EXTENSION} compact className="mt-1" />
                            {a.descripcion && <div style={SUB}>{a.descripcion}</div>}
                          </td>
                          <td style={TD}>{seccionPrintLabel(a.seccion) || 'Extensión'}</td>
                          <td style={TDC}>{rangoF(a.fecha_inicio, a.fecha_fin)}</td>
                          <td style={{ ...TDC, fontWeight: 800, color: PTA_COLORS.EXTENSION }}>{Number(a.horas || 0)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{ ...TD, fontWeight: 800, textAlign: 'right', background: '#F9FAFB' }}>TOTAL EXTENSIÓN</td>
                        <td style={{ ...TDC, fontWeight: 900, background: '#F9FAFB', color: PTA_COLORS.EXTENSION }}>{horasExt}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Actividades Complementarias */}
            {compActs.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <TituloSeccion num={numDe('complementarias')} titulo="Actividades Complementarias" color="#A16207" totalHoras={horasComp} estado={estadoComp(pta, 'complementarias')} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                    <thead>
                      <tr>
                        <th style={TH}>Actividad</th>
                        <th style={TH}>Sección</th>
                        <th style={{ ...TH, textAlign: 'center' }}>Periodo</th>
                        <th style={{ ...TH, textAlign: 'center' }}>Total Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compActs.map((a: any, i: number) => (
                        <tr key={i} style={zebra(i)}>
                          <td style={TD}>
                            <div style={{ fontWeight: 700 }}>{a.nombre || a.actividad || 'Actividad'}</div>
                            <HierarchySelectionSummary activity={a} accent="#A16207" compact className="mt-1" />
                            {a.descripcion && <div style={SUB}>{a.descripcion}</div>}
                          </td>
                          <td style={TD}>{seccionPrintLabel(a.seccion) || a.categoria || a.tipo || 'Complementaria'}</td>
                          <td style={TDC}>{rangoF(a.fecha_inicio, a.fecha_fin)}</td>
                          <td style={{ ...TDC, fontWeight: 800, color: '#A16207' }}>{Number(a.horas || 0)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} style={{ ...TD, fontWeight: 800, textAlign: 'right', background: '#F9FAFB' }}>TOTAL COMPLEMENTARIAS</td>
                        <td style={{ ...TDC, fontWeight: 900, background: '#F9FAFB', color: '#A16207' }}>{horasComp}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. Resumen de Horas y Aprobación */}
            <div style={{ marginBottom: 24 }}>
              <TituloSeccion num={numDe('resumen')} titulo="Resumen de Horas y Aprobación" color="#111827" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={TH}>Componente</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Estado de Aprobación</th>
                      <th style={{ ...TH, textAlign: 'center' }}>Horas</th>
                      <th style={{ ...TH, textAlign: 'center' }}>% del PTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenComponentes.map((c, i) => (
                      <tr key={c.key} style={zebra(i)}>
                        <td style={{ ...TD, fontWeight: 700, borderLeft: `4px solid ${c.color}` }}>{c.label}</td>
                        <td style={TDC}>{c.horas > 0 ? <ChipEstadoComp estado={estadoComp(pta, c.key)} /> : <span style={{ color: '#9CA3AF', fontSize: '0.66rem' }}>Sin horas</span>}</td>
                        <td style={{ ...TDC, fontWeight: 800 }}>{c.horas}</td>
                        <td style={TDC}>{pctDe(c.horas)}%</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...TD, fontWeight: 900, background: '#F3F4F6' }}>TOTAL PROGRAMADO</td>
                      <td style={{ ...TDC, background: '#F3F4F6', fontSize: '0.66rem', color: '#6B7280', fontWeight: 700 }}>{horasDisp} h disponibles</td>
                      <td style={{ ...TDC, fontWeight: 900, background: '#F3F4F6' }}>{horasProg}</td>
                      <td style={{ ...TDC, fontWeight: 900, background: '#F3F4F6' }}>{formatPtaCompletionPercentage(horasProg, horasDisp)}% de carga</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Firmas */}
            <div style={{ marginTop: 36, paddingTop: 24, borderTop: '1px solid #E5E7EB' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #9CA3AF', width: 200, margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem' }}>Firma del Docente</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.64rem', color: '#6B7280' }}>{userName || ''} · ID: {userPersonId?.substring(0, 12)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {['Aprobado', 'En Firme', 'Finalizado'].includes(pta?.estado) ? (
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#047857', marginBottom: 4 }}>
                        <ShieldCheck size={18} />
                        <span style={{ fontWeight: 800, fontSize: '0.78rem' }}>Aprobado Electrónicamente</span>
                      </div>
                      <div style={{ borderBottom: '1px solid #059669', width: 200, margin: '0 auto 8px', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem' }}>{pta?.aprobador_nombre || 'Grupo de Gestión Profesoral'}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.64rem', color: '#6B7280' }}>Aprobador Oficial ESAP</p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ borderBottom: '1px solid #9CA3AF', width: 200, margin: '0 auto 8px' }} />
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem' }}>Firma Aprobador</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.64rem', color: '#6B7280' }}>{estadoCfg.label}</p>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.62rem', color: '#9CA3AF' }}>
                <p style={{ margin: 0 }}>Este documento es generado automáticamente por el Sistema Integrado ESAP.</p>
                <p style={{ margin: '2px 0 0' }}>Cualquier alteración invalida su contenido.</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
