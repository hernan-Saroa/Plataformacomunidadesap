/**
 * ReporteIndividualPTA — R-01: Resumen Individual del PTA
 * 
 * Replica exacta del formato GTH-F081 segun PARTE XXVI, Sec. 26.2.2:
 * 1. Identificacion del Docente
 * 2. Componente Docencia (asignaturas, creditos, horas)
 * 3. Componente Investigacion (proyectos, rol, horas)
 * 4. Componente Extension (actividades por direccion tecnica)
 * 5. Actividades Complementarias
 * 6. Resumen Ejecutivo (tabla consolidada + validacion normativa)
 * 7. Firmas y Aprobaciones (cadena multinivel + firma digital)
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  FileText, Download, ChevronLeft, CheckCircle2, X,
  AlertTriangle, Shield, Clock, User, Building2, BookOpen,
  FlaskConical, Globe, ListChecks, Award, QrCode, Loader2, Briefcase,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { PTA_COLORS } from './shared/ptaColors';
import { HierarchySelectionSummary } from './shared/HierarchySelectionSummary';
import { jsPDF } from 'jspdf';
import { getComponentesAprobacion } from '../../services/api/ptaApi';
import { formatPtaAssignmentName, formatPtaPensum } from '../../utils/ptaPensumCompatibility';

/**
 * html2canvas 1.x no reconoce funciones de color CSS modernas como oklch()
 * (usadas por las clases de Tailwind v4, p. ej. en HierarchySelectionSummary)
 * y lanza una excepción silenciosa al recorrer el árbol clonado. Se convierten
 * a rgba() dentro del clon usado para la captura, sin afectar la vista real.
 */
const normalizarColoresParaCaptura = (documentoClonado: Document, elementoClonado: HTMLElement) => {
  const vista = documentoClonado.defaultView;
  if (!vista) return;

  const patronColorModerno = /(?:oklch|oklab|lab|lch|color)\((?:[^()]|\([^()]*\))*\)/gi;
  const propiedadesColor = [
    'background-color', 'background-image',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'box-shadow', 'caret-color', 'color', 'fill', 'outline-color', 'stroke',
    'text-decoration-color', 'text-shadow', '-webkit-text-stroke-color',
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
      return 'rgba(0, 0, 0, 1)';
    }
  };

  const elementos = [elementoClonado, ...Array.from(elementoClonado.querySelectorAll<HTMLElement>('*'))];
  for (const elemento of elementos) {
    const estiloCalculado = vista.getComputedStyle(elemento);
    for (const propiedad of propiedadesColor) {
      const valor = estiloCalculado.getPropertyValue(propiedad);
      if (!valor || !/(?:oklch|oklab|lab|lch|color)\(/i.test(valor)) continue;
      elemento.style.setProperty(propiedad, valor.replace(patronColorModerno, convertirColor), 'important');
    }
  }
};

// Aprobación del PTA por COMPONENTE (flujo paralelo, no lineal de N1/N2/N3).
// 7 slots: Docencia, Investigación, las 4 secciones de Extensión y Complementarias.
// Las claves coinciden con auth.permission (migración 327) y con el panel de aprobación.
const COMPONENTE_APROBACION_SLOTS: { key: string; label: string }[] = [
  { key: 'academica', label: 'Docencia' },
  { key: 'investigacion', label: 'Investigación' },
  { key: 'ext_capacitacion', label: 'Ext. Capacitación' },
  { key: 'ext_procesos', label: 'Ext. Procesos Selección' },
  { key: 'ext_fortalecimiento', label: 'Ext. Fortalecimiento' },
  { key: 'ext_gobierno', label: 'Ext. Alto Gobierno' },
  { key: 'complementarias', label: 'Complementarias' },
];

interface ReporteIndividualPTAProps {
  pta: any;
  onClose: () => void;
  reporteVersion?: number;
}

const COMPONENTE_COLORS: Record<string, { bg: string; border: string; color: string; label: string }> = {
  docencia: { bg: `${PTA_COLORS.DOCENCIA}10`, border: `${PTA_COLORS.DOCENCIA}40`, color: PTA_COLORS.DOCENCIA, label: 'DOCENCIA' },
  investigacion: { bg: `${PTA_COLORS.INVESTIGACION}10`, border: `${PTA_COLORS.INVESTIGACION}40`, color: PTA_COLORS.INVESTIGACION, label: 'INVESTIGACION' },
  extension: { bg: `${PTA_COLORS.EXTENSION}10`, border: `${PTA_COLORS.EXTENSION}40`, color: PTA_COLORS.EXTENSION, label: 'EXTENSION' },
  complementarias: { bg: `${PTA_COLORS.COMPLEMENTARIAS}10`, border: `${PTA_COLORS.COMPLEMENTARIAS}40`, color: PTA_COLORS.COMPLEMENTARIAS, label: 'COMPLEMENTARIAS' },
  acad_admin: { bg: `${PTA_COLORS.ACAD_ADMIN}10`, border: `${PTA_COLORS.ACAD_ADMIN}40`, color: PTA_COLORS.ACAD_ADMIN, label: 'ACAD. ADMINISTRATIVAS' },
};

function fmtFecha(d?: string): string {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ReporteIndividualPTA({ pta, onClose, reporteVersion }: ReporteIndividualPTAProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const versionLabel = `R-${String(reporteVersion || 1).padStart(2, '0')}`;

  // Close on Escape key
  useEffect(() => {
    if (!pta) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [pta, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Aprobaciones por componente (fuente única: mismo endpoint que el panel de
  // aprobación). Se precargan del propio PTA si vienen embebidas y se refrescan.
  const [componentesAprobacion, setComponentesAprobacion] = useState<any[]>(
    Array.isArray(pta?.componentes_aprobacion) ? pta.componentes_aprobacion : [],
  );
  useEffect(() => {
    if (!pta?.id) return;
    let cancelled = false;
    getComponentesAprobacion(pta.id)
      .then(res => {
        if (!cancelled && res.success && Array.isArray(res.data)) {
          setComponentesAprobacion(res.data);
        }
      })
      .catch(() => { /* si no está disponible, se muestran como pendientes */ });
    return () => { cancelled = true; };
  }, [pta?.id]);

  if (!pta) return null;

  const horasProgramables = pta.horas_asignables ?? pta.horas_a_programar ?? 0;
  const asignaturas = pta.asignaturas || [];
  const investigacion = pta.investigacion_proyecto || pta.investigacion || null;
  const invActividades = pta.investigacion_actividades || [];

  // Extension: normalize flat array (extension_actividades) OR nested object (pta.extension)
  const extActividades: any[] = pta.extension_actividades || [];
  const extension: Record<string, any[]> = extActividades.length > 0
    ? extActividades.reduce((acc: Record<string, any[]>, a: any) => {
        const sec = a.seccion || a.tipo || 'extension';
        if (!acc[sec]) acc[sec] = [];
        acc[sec].push(a);
        return acc;
      }, {})
    : (pta.extension && typeof pta.extension === 'object' ? pta.extension : {});

  // AADM es una sección de Complementarias. Separamos ambas secciones (y fusionamos
  // data legacy) para no doble-contar ni mostrar AADM como componente aparte.
  const _rawComp = Array.isArray(pta.complementarias)
    ? pta.complementarias
    : (pta.complementarias?.actividades || []);
  const _legacyAadm = Array.isArray(pta.academico_admin)
    ? pta.academico_admin
    : (Array.isArray(pta.acad_admin) ? pta.acad_admin
      : (pta.acad_admin?.actividades || pta.academico_administrativo?.actividades || []));
  const _isAadm = (c: any) => c?.seccion === 'academico_administrativas'
    || (c?.seccion == null && c?.consumeTotalidad !== undefined);
  const _compDocencia = _rawComp.filter((c: any) => !_isAadm(c));
  const _compAadm = _rawComp.filter((c: any) => _isAadm(c));
  // Dedup: si complementarias ya trae la sección AADM se usa esa; el array legacy
  // academico_admin solo aplica a PTAs viejos (evita duplicar en el reporte).
  const acadAdminActividades = _compAadm.length > 0 ? _compAadm : _legacyAadm;
  // Todo es "Actividades Complementarias": una sola lista (a la docencia + AADM).
  const complementarias = [..._compDocencia, ...acadAdminActividades];


  // Historial: accept both camelCase (historialEstados) and legacy snake_case
  const historial: any[] = pta.historialEstados || pta.historial || pta.historial_aprobaciones || [];
  const firmaDigital = pta.firma_digital || null;

  // Calculate hours — prefer pre-computed from backend
  const horasDocencia = pta.horas_docencia
    || asignaturas.reduce((s: number, a: any) => s + (a.total_horas || a.total_horas_calculadas || a.horas || 0), 0);
  const horasInvestigacion = pta.horas_investigacion
    || (investigacion?.horas_solicitadas || investigacion?.horas || 0)
    + invActividades.reduce((s: number, a: any) => s + (a.horas_total || a.horas || 0), 0);
  const horasExtension = pta.horas_extension
    || extActividades.reduce((s: number, a: any) => s + (Number(a.horas) || 0), 0)
    || Object.values(extension).reduce((s: number, arr: any) => {
        if (Array.isArray(arr)) return s + arr.reduce((ss: number, a: any) => ss + (a.horas || 0), 0);
        return s;
      }, 0);
  const horasAcadAdmin = acadAdminActividades.reduce((s: number, a: any) => s + (Number(a.horas) || 0), 0);
  const horasComplementariasDocencia = _compDocencia.reduce((s: number, a: any) => s + (Number(a.horas) || 0), 0);
  // Complementarias unificado = sección docencia + sección académico-administrativa.
  const horasComplementarias = pta.horas_complementarias != null
    ? pta.horas_complementarias
    : (horasComplementariasDocencia + horasAcadAdmin);
  const totalProgramado = pta.total_horas_programadas
    || (horasDocencia + horasInvestigacion + horasExtension + horasComplementarias);

  const pctDocencia = ((horasDocencia / horasProgramables) * 100).toFixed(1);
  const pctInvestigacion = ((horasInvestigacion / horasProgramables) * 100).toFixed(1);
  const pctExtension = ((horasExtension / horasProgramables) * 100).toFixed(1);
  const pctComplementarias = ((horasComplementarias / horasProgramables) * 100).toFixed(1);
  const pctAcadAdmin = ((horasAcadAdmin / horasProgramables) * 100).toFixed(1);
  const pctTotal = ((totalProgramado / horasProgramables) * 100).toFixed(1);

  // Validations
  const validaciones = [
    {
      label: `Investigacion: ${pctInvestigacion}% (Maximo 50%)`,
      ok: horasInvestigacion <= horasProgramables * 0.5,
    },
    {
      label: `Extension: ${pctExtension}% (Maximo 25%)`,
      ok: horasExtension <= horasProgramables * 0.25,
    },
    {
      // El tope del 25% aplica a la sección "complementarias a la docencia"; la
      // sección académico-administrativa tiene sus propios topes (incl. 100%).
      label: `Complementarias a la docencia: ${((horasComplementariasDocencia / horasProgramables) * 100).toFixed(1)}% (Maximo 25%)`,
      ok: horasComplementariasDocencia <= horasProgramables * 0.25,
    },
    {
      label: `Total programado: ${pctTotal}% de ${horasProgramables}h`,
      ok: totalProgramado <= horasProgramables,
    },
  ];

  // Approval chain — supports both camelCase (historialEstados) and legacy snake_case
  const getField = (h: any, camel: string, snake: string) => h[camel] ?? h[snake];
  const aprobaciones = historial
    .filter((h: any) => {
      const en = getField(h, 'estadoNuevo', 'estado_nuevo') || '';
      return ['Pendiente Decanatura', 'Pendiente Gestión Profesoral', 'Pendiente Gestion Profesoral', 'Aprobado DEF', 'Aprobado'].includes(en);
    })
    .map((h: any) => {
      const en = getField(h, 'estadoNuevo', 'estado_nuevo') || '';
      const fecha = getField(h, 'createdAt', 'fecha');
      return {
        nivel: en === 'Pendiente Decanatura' ? 'N1 — Jefatura Inmediata'
          : (en === 'Pendiente Gestión Profesoral' || en === 'Pendiente Gestion Profesoral') ? 'N2 — Decanatura'
          : (en === 'Aprobado DEF' || en === 'Aprobado') ? 'N3 — Gestión Profesoral'
          : en,
        aprobador: getField(h, 'actorRol', 'actor_rol') || getField(h, 'actorId', 'actor') || 'N/A',
        fecha: fecha ? new Date(fecha).toLocaleDateString('es-CO') : 'N/A',
        observaciones: getField(h, 'comentarios', 'observaciones') || 'Sin observaciones',
        aprobado: true,
      };
    });

  const handleExportPDF = async () => {
    if (!printRef.current || exportingPdf) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 900,
        onclone: normalizarColoresParaCaptura,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableW = pdfW - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;
      let yOffset = 0;
      let page = 0;
      while (yOffset < imgH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, margin - yOffset, usableW, imgH);
        yOffset += pdfH - margin * 2;
        page++;
      }
      const nombre = pta.docente_nombre || pta.nombre_docente || 'PTA';
      pdf.save(`${versionLabel}_${nombre.replace(/\s+/g, '_')}_${pta.periodo || '2025-2'}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('No fue posible generar el PDF del reporte. Intente nuevamente.');
    } finally {
      setExportingPdf(false);
    }
  };

  const codigoPTA = `ESAP-PTA-${pta.periodo || '2025-2'}-${pta.docente_identificacion || pta.cedula || pta.docente_id?.slice(-8) || '00000000'}-001`;

  return (
    /* ═══ MODAL OVERLAY ═══ */
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(17, 24, 39, 0.25)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start',
        padding: '24px 16px',
        overflowY: 'auto',
      }}
    >
      {/* ═══ MODAL CONTAINER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 920,
          background: 'white', borderRadius: 16,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 61, 165, 0.08)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 48px)',
        }}
      >
        {/* ═══ STICKY HEADER ═══ */}
        <div className="print:hidden" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 20px', borderBottom: '1px solid #E5E7EB',
          background: 'linear-gradient(135deg, #FAFBFF 0%, #EFF6FF 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              borderRadius: 6,
            }}>
              <ChevronLeft style={{ width: 20, height: 20, color: '#6B7280' }} />
            </button>
            <FileText style={{ width: 18, height: 18, color: '#003DA5' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>
              Reporte {versionLabel}: Resumen Individual del PTA
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleExportPDF}
              disabled={exportingPdf}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
                borderRadius: 8, border: 'none', background: exportingPdf ? '#6B7280' : '#003DA5',
                fontSize: '0.82rem', fontWeight: 600, cursor: exportingPdf ? 'wait' : 'pointer', color: 'white',
                opacity: exportingPdf ? 0.7 : 1, transition: 'all 0.15s ease',
              }}
            >
              {exportingPdf ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: 16, height: 16 }} />}
              {exportingPdf ? 'Generando...' : 'Exportar PDF'}
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                background: 'white', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.borderColor = '#FCA5A5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E5E7EB'; }}
              title="Cerrar (Esc)"
            >
              <X style={{ width: 16, height: 16, color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* ═══ SCROLLABLE BODY ═══ */}
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent',
        }}>

      {/* Report Content */}
      <div ref={printRef} style={{
        background: 'white',
        overflow: 'hidden', fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>
        {/* Header / Logo */}
        <div style={{
          padding: '24px 32px', borderBottom: '3px solid #003DA5',
          background: 'linear-gradient(135deg, #FAFBFF 0%, #EFF6FF 100%)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#003DA5', letterSpacing: 1, textTransform: 'uppercase' }}>
                Escuela Superior de Administracion Publica
              </div>
              <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 2 }}>
                Oficina de Tecnologias de la Informacion y las Comunicaciones (OTIC)
              </div>
              <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: '10px 0 4px' }}>
                Plan de Trabajo Academico (PTA)
              </h1>
              <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                Formato GTH-F081 | Codigo: <strong>{codigoPTA}</strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                padding: '6px 14px', borderRadius: 8, background: '#003DA5',
                color: 'white', fontSize: '0.85rem', fontWeight: 700,
              }}>
                Periodo {pta.periodo || '2025-2'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 6 }}>
                Emision: {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Identificacion del Docente */}
        <SectionHeader icon={User} label="1. IDENTIFICACION DEL DOCENTE" />
        <div style={{ padding: '16px 32px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: '0.85rem' }}>
            <Field label="Documento" value={pta.docente_identificacion || pta.cedula || pta.numero_documento || 'N/A'} />
            <Field label="Nombre Completo" value={pta.docente_nombre || pta.nombre_docente || 'N/A'} bold />
            <Field label="Territorial" value={pta.territorial || pta.sede || 'SEDE CENTRAL'} />
            <Field label="Tipo Vinculacion" value={pta.tipo_vinculacion || 'Profesor de Carrera'} />
            <Field label="Dedicacion" value={pta.dedicacion || 'Tiempo Completo'} />
            <Field label="Categoria Escalafon" value={pta.categoria_escalafon || pta.escalafon || 'Asociado'} />
            <Field label="Nucleo Tematico" value={pta.nucleo_tematico || 'Administracion Publica'} />
            <Field label="Horas a Programar" value={`${horasProgramables} horas`} bold />
          </div>
        </div>

        {/* Section 2: Componente Docencia */}
        <SectionHeader icon={BookOpen} label="2. COMPONENTE DOCENCIA" color={PTA_COLORS.DOCENCIA} />
        <div style={{ padding: '16px 32px 20px' }}>
          {asignaturas.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: `${PTA_COLORS.DOCENCIA}10`, borderBottom: `2px solid ${PTA_COLORS.DOCENCIA}40` }}>
                  <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>#</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Asignatura</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Programa</th>
                  <th style={{ padding: '7px 8px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Pensum</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Cred.</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Est.</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Mod.</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Período</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>Horas</th>
                  <th style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>% PTA</th>
                </tr>
              </thead>
              <tbody>
                {asignaturas.map((asig: any, idx: number) => (
                  <>
                    <tr key={idx} style={{ borderBottom: asig.observaciones ? 'none' : '1px solid #E5E7EB' }}>
                      <td style={{ padding: '6px 8px', color: '#9CA3AF' }}>{idx + 1}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600, color: '#111827' }}>
                        {formatPtaAssignmentName(asig) || 'N/A'}
                        <HierarchySelectionSummary activity={asig} accent={PTA_COLORS.DOCENCIA} compact className="mt-1.5" />
                      </td>
                      <td
                        title={asig.programa_nombre_completo || asig.programa_nombre || asig.programa || undefined}
                        style={{
                          padding: '6px 8px', color: '#6B7280', whiteSpace: 'normal',
                          overflowWrap: 'anywhere', lineHeight: 1.25,
                        }}
                      >
                        {asig.programa_nombre_completo || asig.programa_nombre || asig.programa || asig.programa_id || 'N/A'}
                      </td>
                      <td style={{ padding: '6px 8px', color: '#6B7280' }}>
                        {formatPtaPensum(asig.pensum)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{asig.creditos || 3}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {asig.total_estudiantes || asig.estudiantes || asig.cupos || '-'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                          background: asig.modalidad === 'VIRTUAL' ? '#F0FDF4' : asig.modalidad === 'MIXTA' ? '#FEF3C7' : '#EFF6FF',
                          color: asig.modalidad === 'VIRTUAL' ? '#059669' : asig.modalidad === 'MIXTA' ? '#D97706' : '#003DA5',
                        }}>
                          {asig.modalidad || 'PRESENCIAL'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: '0.68rem', color: '#6B7280' }}>
                        {asig.fecha_inicio && asig.fecha_fin
                          ? `${asig.fecha_inicio} – ${asig.fecha_fin}`
                          : '—'}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>
                        {asig.total_horas || asig.total_horas_calculadas || asig.horas || 0}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: '#6B7280' }}>
                        {((asig.total_horas || asig.total_horas_calculadas || asig.horas || 0) / horasProgramables * 100).toFixed(1)}%
                      </td>
                    </tr>
                    {asig.observaciones && (
                      <tr key={`obs-${idx}`} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td />
                        <td colSpan={9} style={{ padding: '2px 8px 6px', fontSize: '0.68rem', color: '#6B7280', fontStyle: 'italic' }}>
                          💬 {asig.observaciones}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: `${PTA_COLORS.DOCENCIA}10`, borderTop: `2px solid ${PTA_COLORS.DOCENCIA}40` }}>
                  <td colSpan={8} style={{ padding: '8px 10px', fontWeight: 800, color: PTA_COLORS.DOCENCIA, textAlign: 'right' }}>
                    TOTAL HORAS DOCENCIA:
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: PTA_COLORS.DOCENCIA, fontSize: '0.95rem' }}>
                    {horasDocencia}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.DOCENCIA }}>
                    {pctDocencia}%
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem', fontStyle: 'italic' }}>
              Sin asignaturas registradas en este PTA
            </div>
          )}
        </div>

        {/* Section 3: Componente Investigacion */}
        <SectionHeader icon={FlaskConical} label="3. COMPONENTE INVESTIGACION" color={PTA_COLORS.INVESTIGACION} />
        <div style={{ padding: '16px 32px 20px' }}>
          {/* Proyecto principal */}
          {investigacion ? (
            <div style={{ padding: 14, borderRadius: 8, background: `${PTA_COLORS.INVESTIGACION}08`, border: `1px solid ${PTA_COLORS.INVESTIGACION}30`, marginBottom: invActividades.length > 0 ? 12 : 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: PTA_COLORS.INVESTIGACION, marginBottom: 4 }}>
                {investigacion.nombre || investigacion.proyecto || 'Proyecto de Investigación'}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: PTA_COLORS.INVESTIGACION, flexWrap: 'wrap' }}>
                <span>Rol: <strong>{investigacion.rol || 'Investigador'}</strong></span>
                <span>Horas: <strong>{investigacion.horas_solicitadas || investigacion.horas || horasInvestigacion}h</strong></span>
                {investigacion.codigo_sni && <span>SNI: <strong>{investigacion.codigo_sni}</strong></span>}
                {investigacion.recibe_estimulo !== undefined && (
                  <span>Estímulo: <strong>{investigacion.recibe_estimulo ? 'Sí' : 'No'}</strong></span>
                )}
              </div>
              {(investigacion.fecha_inicio || investigacion.fecha_fin) && (
                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#6B7280', marginTop: 4 }}>
                  {investigacion.fecha_inicio && <span>Inicio: <strong>{fmtFecha(investigacion.fecha_inicio)}</strong></span>}
                  {investigacion.fecha_fin && <span>Fin: <strong>{fmtFecha(investigacion.fecha_fin)}</strong></span>}
                </div>
              )}
              <HierarchySelectionSummary activity={investigacion} accent={PTA_COLORS.INVESTIGACION} compact className="mt-2" />
            </div>
          ) : (
            <div style={{ padding: 12, color: '#9CA3AF', fontSize: '0.82rem', fontStyle: 'italic' }}>
              Sin proyecto de investigación asignado
            </div>
          )}

          {/* Actividades de investigación */}
          {invActividades.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: `${PTA_COLORS.INVESTIGACION}10`, borderBottom: `2px solid ${PTA_COLORS.INVESTIGACION}40` }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>Actividad</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>Cant.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>H/Unit.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>Total</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>% PTA</th>
                </tr>
              </thead>
              <tbody>
                {invActividades.map((act: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${PTA_COLORS.INVESTIGACION}20` }}>
                    <td style={{ padding: '6px 10px', color: '#9CA3AF' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#111827', fontWeight: 500 }}>
                      {act.nombre || act.actividad || `Actividad ${idx + 1}`}
                      {act.descripcion && (
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2, fontStyle: 'italic' }}>{act.descripcion}</div>
                      )}
                      {(act.fecha_inicio || act.fecha_fin) && (
                        <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>
                          {act.fecha_inicio && <span>Inicio: {fmtFecha(act.fecha_inicio)}</span>}
                          {act.fecha_fin && <span>Fin: {fmtFecha(act.fecha_fin)}</span>}
                        </div>
                      )}
                      <HierarchySelectionSummary activity={act} accent={PTA_COLORS.INVESTIGACION} compact className="mt-1.5" />
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{act.cantidad || 1}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{act.horas_unitarias || '-'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.INVESTIGACION }}>
                      {act.horas_total || act.horas || 0}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280' }}>
                      {((act.horas_total || act.horas || 0) / horasProgramables * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6, background: `${PTA_COLORS.INVESTIGACION}12`,
            fontWeight: 700, fontSize: '0.85rem', color: PTA_COLORS.INVESTIGACION, textAlign: 'right',
          }}>
            TOTAL HORAS INVESTIGACION: {horasInvestigacion} horas ({pctInvestigacion}%)
          </div>
        </div>

        {/* Section 4: Componente Extension */}
        <SectionHeader icon={Globe} label="4. COMPONENTE EXTENSION" color={PTA_COLORS.EXTENSION} />
        <div style={{ padding: '16px 32px 20px' }}>
          {horasExtension > 0 ? (
            <div style={{ fontSize: '0.82rem' }}>
              {Object.entries(extension).map(([seccion, acts]: [string, any]) => {
                if (!Array.isArray(acts) || acts.length === 0) return null;
                return (
                  <div key={seccion} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: PTA_COLORS.EXTENSION, textTransform: 'capitalize', marginBottom: 4 }}>
                      {seccion.replace(/_/g, ' ')}
                    </div>
                    {acts.map((act: any, i: number) => (
                      <div key={i} style={{
                        padding: '5px 8px', borderBottom: `1px solid ${PTA_COLORS.EXTENSION}20`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{act.nombre || act.actividad || `Actividad ${i + 1}`}</span>
                          <span style={{ fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>{act.horas || 0}h</span>
                        </div>
                        <HierarchySelectionSummary activity={act} accent={PTA_COLORS.EXTENSION} compact className="mt-1.5" />
                        {act.descripcion && (
                          <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2, fontStyle: 'italic' }}>{act.descripcion}</div>
                        )}
                        {(act.fecha_inicio || act.fecha_fin) && (
                          <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>
                            {act.fecha_inicio && <span>Inicio: {fmtFecha(act.fecha_inicio)}</span>}
                            {act.fecha_fin && <span>Fin: {fmtFecha(act.fecha_fin)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 12, color: '#9CA3AF', fontSize: '0.82rem', fontStyle: 'italic' }}>
              Sin actividades de extension registradas
            </div>
          )}
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6, background: `${PTA_COLORS.EXTENSION}12`,
            fontWeight: 700, fontSize: '0.85rem', color: PTA_COLORS.EXTENSION, textAlign: 'right',
          }}>
            TOTAL HORAS EXTENSION: {horasExtension} horas ({pctExtension}%)
          </div>
        </div>

        {/* Section 5: Actividades Complementarias */}
        <SectionHeader icon={ListChecks} label="5. ACTIVIDADES COMPLEMENTARIAS" color={PTA_COLORS.COMPLEMENTARIAS} />
        <div style={{ padding: '16px 32px 20px' }}>
          {complementarias.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: `${PTA_COLORS.COMPLEMENTARIAS}15`, borderBottom: `2px solid ${PTA_COLORS.COMPLEMENTARIAS}40` }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.COMPLEMENTARIAS }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: PTA_COLORS.COMPLEMENTARIAS }}>Actividad</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.COMPLEMENTARIAS }}>Horas</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: PTA_COLORS.COMPLEMENTARIAS }}>% PTA</th>
                </tr>
              </thead>
              <tbody>
                {complementarias.map((act: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: `1px solid ${PTA_COLORS.COMPLEMENTARIAS}30` }}>
                    <td style={{ padding: '6px 10px', color: '#9CA3AF', verticalAlign: 'top' }}>{idx + 1}</td>
                    <td style={{ padding: '6px 10px', color: '#111827' }}>
                      <div>{act.nombre || act.actividad || 'Actividad Complementaria'}</div>
                      {act.descripcion && (
                        <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: 2, fontStyle: 'italic' }}>{act.descripcion}</div>
                      )}
                      <HierarchySelectionSummary activity={act} accent="#A16207" compact className="mt-1.5" />
                      {(act.fecha_inicio || act.fecha_fin) && (
                        <div style={{ display: 'flex', gap: 10, fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>
                          {act.fecha_inicio && <span>Inicio: {fmtFecha(act.fecha_inicio)}</span>}
                          {act.fecha_fin && <span>Fin: {fmtFecha(act.fecha_fin)}</span>}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600, verticalAlign: 'top' }}>
                      {act.horas || 0}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', color: '#6B7280', verticalAlign: 'top' }}>
                      {((act.horas || 0) / horasProgramables * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 12, color: '#9CA3AF', fontSize: '0.82rem', fontStyle: 'italic' }}>
              Sin actividades complementarias registradas
            </div>
          )}
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 6, background: `${PTA_COLORS.COMPLEMENTARIAS}15`,
            fontWeight: 700, fontSize: '0.85rem', color: PTA_COLORS.COMPLEMENTARIAS, textAlign: 'right',
          }}>
            TOTAL HORAS COMPLEMENTARIAS: {horasComplementarias} horas ({pctComplementarias}%)
          </div>
        </div>

        {/* Section 6: Resumen Ejecutivo */}
        <SectionHeader icon={Award} label="6. RESUMEN EJECUTIVO" color="#003DA5" />
        <div style={{ padding: '16px 32px 24px' }}>
          {/* Two-column layout: Donut + Table */}
          <div style={{ display: 'flex', gap: 24, alignItems: 'stretch', marginBottom: 16 }}>
            {/* Donut Chart (left) */}
            <div style={{ flexShrink: 0, width: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DonutChart
                segments={[
                  { label: 'Docencia', value: horasDocencia, color: PTA_COLORS.DOCENCIA },
                  { label: 'Investigación', value: horasInvestigacion, color: PTA_COLORS.INVESTIGACION },
                  { label: 'Extensión', value: horasExtension, color: PTA_COLORS.EXTENSION },
                  { label: 'Complementarias', value: horasComplementarias, color: PTA_COLORS.COMPLEMENTARIAS },
                ]}
                total={totalProgramado}
                limit={horasProgramables}
              />
            </div>

            {/* Consolidation table (right) */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '2px solid #003DA5' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 800, color: '#111827' }}>Componente</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#111827' }}>Horas</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#111827' }}>% PTA</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#111827' }}>Barra</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Docencia', horas: horasDocencia, pct: pctDocencia, color: PTA_COLORS.DOCENCIA },
                    { label: 'Investigación', horas: horasInvestigacion, pct: pctInvestigacion, color: PTA_COLORS.INVESTIGACION },
                    { label: 'Extensión', horas: horasExtension, pct: pctExtension, color: PTA_COLORS.EXTENSION },
                    { label: 'Complementarias', horas: horasComplementarias, pct: pctComplementarias, color: PTA_COLORS.COMPLEMENTARIAS },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: row.color }}>
                        {row.label}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700 }}>
                        {row.horas}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontWeight: 700, color: row.color }}>
                        {row.pct}%
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <div style={{ height: 8, borderRadius: 10, background: '#E5E7EB', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(parseFloat(row.pct), 100)}%`,
                            height: '100%', borderRadius: 10, background: row.color,
                          }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#003DA5' }}>
                    <td style={{ padding: '9px 10px', fontWeight: 800, color: 'white' }}>
                      TOTAL PROGRAMADO
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: 'white', fontSize: '1rem' }}>
                      {totalProgramado}
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 800, color: 'white', fontSize: '1rem' }}>
                      {pctTotal}%
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <div style={{ height: 8, borderRadius: 10, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(parseFloat(pctTotal), 100)}%`,
                          height: '100%', borderRadius: 10,
                          background: parseFloat(pctTotal) === 100 ? '#34D399' : '#FBBF24',
                        }} />
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Normative validation */}
          <div style={{
            padding: 14, borderRadius: 10,
            background: validaciones.every(v => v.ok) ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${validaciones.every(v => v.ok) ? '#A7F3D0' : '#FCA5A5'}`,
          }}>
            <div style={{
              fontSize: '0.82rem', fontWeight: 700, marginBottom: 8,
              color: validaciones.every(v => v.ok) ? '#065F46' : '#991B1B',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Shield style={{ width: 16, height: 16 }} />
              Validación Normativa - Circular 003/2025
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {validaciones.map((v, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem',
                  color: v.ok ? '#065F46' : '#991B1B',
                }}>
                  {v.ok ? (
                    <CheckCircle2 style={{ width: 14, height: 14, color: '#059669' }} />
                  ) : (
                    <AlertTriangle style={{ width: 14, height: 14, color: '#DC2626' }} />
                  )}
                  {v.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 7: Firmas y Aprobaciones */}
        <SectionHeader icon={Award} label="7. FIRMAS Y APROBACIONES" color="#003DA5" />
        <div style={{ padding: '16px 32px 28px' }}>
          {/* Firma del docente (concertación): el docente firma al ENVIAR el PTA para
              aprobación; lo que ocurre después (revisión y aprobación) es firma del
              aprobador, no suya. Gatear esto por pta.estado==='Aprobado' hacía que
              Revisor y Aprobador vieran "Pendiente" mientras revisaban un PTA que el
              docente ya había enviado y firmado.
              Fuente de verdad: fecha_envio_revision, que el backend deriva del
              historial (transición hacia un estado "Pendiente ..."; ver
              attachPtaReferenceDates). Si no está —snapshots históricos, PTAs sin
              historial— se cae a la misma regla que usa el backend para saber si un
              PTA ya salió del borrador. */}
          {(() => {
            const fechaFirmaDocente = pta.fecha_envio_revision || null;
            const estadoNorm = String(pta.estado || '').trim().toLowerCase();
            const docenteFirmo = Boolean(fechaFirmaDocente) || (estadoNorm !== '' && estadoNorm !== 'borrador');
            return (
              <div style={{
                padding: 14, borderRadius: 10, border: '1px solid #E5E7EB', textAlign: 'center', marginBottom: 18,
              }}>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 600 }}>DOCENTE</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                  {pta.docente_nombre || 'N/A'}
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 6,
                  background: docenteFirmo ? '#D1FAE5' : '#FEF3C7',
                  color: docenteFirmo ? '#065F46' : '#92400E',
                  fontSize: '0.72rem', fontWeight: 600,
                }}>
                  {docenteFirmo ? (
                    <><CheckCircle2 style={{ width: 12, height: 12 }} /> Firma Digital Verificada</>
                  ) : (
                    <><Clock style={{ width: 12, height: 12 }} /> Pendiente</>
                  )}
                </div>
                {docenteFirmo && fechaFirmaDocente && (
                  <div style={{ fontSize: '0.68rem', color: '#6B7280', marginTop: 5 }}>
                    Enviado y firmado el {fmtFecha(fechaFirmaDocente)}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Aprobación por COMPONENTE — flujo paralelo (no lineal). Un slot por
              componente / sección de extensión (7 en total). Al firmarse aparece
              el nombre del aprobador. */}
          <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>
            Aprobación por Componente
          </h4>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12,
          }}>
            {COMPONENTE_APROBACION_SLOTS.map(slot => {
              const apr = componentesAprobacion.find((c: any) => c.componente === slot.key);
              const estado = apr?.estado || 'pendiente';
              const aprobado = estado === 'aprobado';
              const devuelto = estado === 'devuelto';
              const badgeBg = aprobado ? '#D1FAE5' : devuelto ? '#FEE2E2' : '#F3F4F6';
              const badgeColor = aprobado ? '#065F46' : devuelto ? '#991B1B' : '#9CA3AF';
              const fecha = apr?.fechaAprobacion ? fmtFecha(apr.fechaAprobacion) : '';
              return (
                <div key={slot.key} style={{
                  padding: 12, borderRadius: 10, border: '1px solid #E5E7EB', textAlign: 'center',
                  background: aprobado ? '#F0FDF4' : devuelto ? '#FEF2F2' : '#FFFFFF',
                }}>
                  <div style={{ fontSize: '0.66rem', color: '#9CA3AF', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {slot.label}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: aprobado || devuelto ? '#111827' : '#9CA3AF', marginBottom: 5, minHeight: 18 }}>
                    {aprobado || devuelto ? (apr?.aprobadorNombre || 'Revisor Autorizado') : '—'}
                  </div>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 6,
                    background: badgeBg, color: badgeColor, fontSize: '0.66rem', fontWeight: 600,
                  }}>
                    {aprobado ? (<><CheckCircle2 style={{ width: 11, height: 11 }} /> Aprobado</>)
                      : devuelto ? (<><Clock style={{ width: 11, height: 11 }} /> Devuelto</>)
                        : (<><Clock style={{ width: 11, height: 11 }} /> Pendiente por firmar</>)}
                  </div>
                  {fecha && (
                    <div style={{ fontSize: '0.63rem', color: '#9CA3AF', marginTop: 4 }}>{fecha}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Digital signature */}
          {firmaDigital && (
            <div style={{
              marginTop: 16, padding: 14, borderRadius: 10,
              background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
              border: '1px solid #BFDBFE',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <QrCode style={{ width: 18, height: 18, color: '#003DA5' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#003DA5' }}>
                  Firma Digital Verificada
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.78rem' }}>
                <Field label="Firmante" value={firmaDigital.firmante} />
                <Field label="Cargo" value={firmaDigital.cargo} />
                <Field label="Certificado" value={firmaDigital.certificado_id} />
                <Field label="Fecha" value={firmaDigital.timestamp ? new Date(firmaDigital.timestamp).toLocaleString('es-CO') : 'N/A'} />
                <Field label="Hash" value={firmaDigital.hash?.slice(0, 20) + '...'} />
                <Field label="PIN Verificado" value={firmaDigital.pin_verificado ? 'Si' : 'No'} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 32px', borderTop: '2px solid #003DA5',
          background: '#F9FAFB', display: 'flex', justifyContent: 'space-between',
          fontSize: '0.7rem', color: '#9CA3AF',
        }}>
          <span>ESAP - Sistema de Automatizacion de Programacion Docente</span>
          <span>Codigo PTA: {codigoPTA}</span>
          <span>Generado: {new Date().toISOString()}</span>
        </div>
      </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper components
function SectionHeader({ icon: Icon, label, color = '#003DA5' }: { icon: any; label: string; color?: string }) {
  return (
    <div style={{
      padding: '10px 32px', background: `${color}08`,
      borderTop: `1px solid ${color}20`, borderBottom: `1px solid ${color}20`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Icon style={{ width: 16, height: 16, color }} />
      <span style={{ fontSize: '0.82rem', fontWeight: 800, color, letterSpacing: 0.5 }}>
        {label}
      </span>
    </div>
  );
}

function DonutChart({ segments, total, limit }: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  limit: number;
}) {
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Filter out zero-value segments for rendering
  const activeSegments = segments.filter(s => s.value > 0);
  const safeDivisor = total > 0 ? total : 1;

  // Calculate cumulative offsets for each arc
  let accumulated = 0;
  const arcs = activeSegments.map(seg => {
    const pct = seg.value / safeDivisor;
    const dashLen = circumference * pct;
    const gapLen = circumference - dashLen;
    const offset = circumference * 0.25 - (accumulated * circumference);
    accumulated += pct;
    return { ...seg, dashLen, gapLen, offset };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG Donut */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={center} cy={center} r={radius}
            fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
          />
          {/* Colored arcs */}
          {arcs.map((arc, idx) => (
            <circle
              key={idx}
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dashLen} ${arc.gapLen}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          ))}
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            HORAS
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontWeight: 500 }}>{label}: </span>
      <span style={{ fontWeight: bold ? 700 : 500, color: '#111827' }}>{value}</span>
    </div>
  );
}
