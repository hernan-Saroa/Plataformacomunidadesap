import React, { useEffect, useMemo, useState } from 'react';
import {
  X, FileText, Paperclip, Clock, AlertTriangle, Calendar, User,
  Building2, MapPin, Wrench, Download, Image,
  Inbox, Search, FileSearch, ClipboardList, Loader2, Hammer,
  Package, CheckCircle, Archive, Ban, XCircle, ShieldCheck,
  Eye, Monitor, GitBranch, Send, AlertCircle, Wand2, Users,
  ChevronDown, Zap, ChevronUp, ThumbsUp, Ban as IconRechazar,
  Repeat as RedistribuirIcon, CheckCircle2, ThumbsDown, RotateCcw,
  BadgeCheck, Gauge, Wrench as Wrench2, Handshake, Coins, FileBadge,
  ScrollText
} from 'lucide-react';
import {
  SolicitudMantenimiento,
  SolicitudEvidencia,
  CatalogoItem,
  infraestructuraService,
  clasificarSLA,
  SolicitudValoracion,
} from '../services/infraestructuraService';
import { DetalleValoracionForm } from './DetalleValoracionForm';
import { DetalleCierreEjecucionForm } from './DetalleCierreEjecucionForm';
import { Play as PlayIcon, ClipboardCheck as ClipboarCheckIcon, PackageX, Truck } from 'lucide-react';

interface DetalleSolicitudModalProps {
  open: boolean;
  idSolicitud: string | null;
  onClose: () => void;
  catalogoCS?: CatalogoItem[];
  onCambioExitoso?: () => void | Promise<void>;
}

const LUCIDE_ICON_MAP: Record<string, React.ComponentType<any>> = {
  'inbox': Inbox,
  'search': Search,
  'file-search': FileSearch,
  'check-circle-2': CheckCircle,
  'clipboard-list': ClipboardList,
  'loader-2': Loader2,
  'hammer': Hammer,
  'package': Package,
  'check-circle': CheckCircle,
  'archive': Archive,
  'ban': Ban,
  'x-circle': XCircle,
  'shield-check': ShieldCheck,
  'wrench': Wrench,
  'clock': Clock,
  'alert-triangle': AlertTriangle,
  'eye': Eye,
};

const FALLBACK_CLASE_ESTADO = 'bg-slate-100 text-slate-800 border border-slate-200';
const FALLBACK_CLASE_PRIORIDAD = 'bg-slate-100 text-slate-700 border border-slate-200';

const formatearTamano = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const formatearFecha = (valor?: string | Date): string => {
  if (!valor) return '—';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return String(valor);
  return d.toLocaleDateString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const formatearDinero = (valor: number | string | null | undefined): string => {
  if (valor == null || valor === '') return '—';
  const num = Number(valor);
  if (isNaN(num)) return String(valor);
  return `$${num.toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP`;
};

const dedupeEvidencias = (listas: SolicitudEvidencia[][]): SolicitudEvidencia[] => {
  const porId = new Map<string, SolicitudEvidencia>();
  for (const lista of listas) {
    if (!Array.isArray(lista)) continue;
    for (const e of lista) {
      if (!e || !e.idEvidencia) continue;
      if (!porId.has(e.idEvidencia)) {
        porId.set(e.idEvidencia, e);
      } else {
        const anterior = porId.get(e.idEvidencia)!;
        const nuevoTienePresigned = !!e.urlPresigned && !!e.vencimientoPresigned;
        const anteriorTienePresigned = !!anterior.urlPresigned && !!anterior.vencimientoPresigned;
        if (nuevoTienePresigned && !anteriorTienePresigned) {
          porId.set(e.idEvidencia, e);
        } else if (nuevoTienePresigned && anteriorTienePresigned) {
          const nuevoVen = new Date(e.vencimientoPresigned as any).getTime();
          const anteriorVen = new Date(anterior.vencimientoPresigned as any).getTime();
          if (isFinite(nuevoVen) && (!isFinite(anteriorVen) || nuevoVen > anteriorVen)) {
            porId.set(e.idEvidencia, e);
          }
        }
      }
    }
  }
  return Array.from(porId.values()).sort((a, b) => (a.orden || 0) - (b.orden || 0));
};

const parseJsonSeguro = (valor: string | null | undefined): Record<string, any> | null => {
  if (!valor) return null;
  const s = String(valor).trim();
  if (!s.startsWith('{') && !s.startsWith('[')) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const resumirExtensionSLA = (obj: Record<string, any>): string | null => {
  const dias = Number(obj.diasAdicionales || obj.dias || 0);
  const fechaOrig = obj.fechaOriginal;
  const fechaNueva = obj.fechaNueva;
  if (!dias && !fechaOrig) return null;
  const parts: string[] = [];
  if (dias) parts.push(`+${dias} día(s) adicionales`);
  if (fechaOrig) parts.push(`tope original: ${new Date(fechaOrig).toLocaleDateString('es-CO', { day:'numeric', month:'short' })}`);
  if (fechaNueva) parts.push(`nuevo tope: ${new Date(fechaNueva).toLocaleDateString('es-CO', { day:'numeric', month:'short' })}`);
  return parts.join(' · ');
};

const HISTORICO_ACCION_STYLE: Record<string, { badge: string; dot: string; icon: React.ComponentType<any> }> = {
  APROBADA_Y_ASIGNADA:     { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',     dot: 'bg-emerald-500', icon: BadgeCheck },
  RECHAZADA:                { badge: 'bg-rose-100 text-rose-800 border-rose-200',              dot: 'bg-rose-500',    icon: XCircle },
  REDISTRIBUIDA:            { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',          dot: 'bg-indigo-500',  icon: Users },
  INICIO_VALORACION:        { badge: 'bg-sky-100 text-sky-800 border-sky-200',                   dot: 'bg-sky-500',     icon: ClipboardList },
  FINALIZA_VALORACION_CON_DISPONIBLES: { badge: 'bg-teal-100 text-teal-800 border-teal-200',     dot: 'bg-teal-600',    icon: CheckCircle2 },
  FINALIZA_VALORACION_EN_ESPERA:       { badge: 'bg-amber-100 text-amber-800 border-amber-200',   dot: 'bg-amber-500',   icon: PackageX },
  EXTENSION_SLA_POR_INSUMOS:{ badge: 'bg-orange-100 text-orange-800 border-orange-200',          dot: 'bg-orange-500',  icon: Clock },
  RECEPCION_MATERIALES_Y_PASO_A_EJECUCION: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600', icon: Truck },
  EDICION_VALORACION_POR_ENCARGADO:    { badge: 'bg-slate-100 text-slate-800 border-slate-200',  dot: 'bg-slate-500',   icon: FileBadge },
  INICIO_EJECUCION_DIRECTA: { badge: 'bg-green-100 text-green-800 border-green-200',             dot: 'bg-green-500',   icon: PlayIcon },
  CIERRE_TECNICO:           { badge: 'bg-emerald-200 text-emerald-900 border-emerald-300',       dot: 'bg-emerald-700',  icon: ClipboarCheckIcon },
  REMITIDA_TI:              { badge: 'bg-sky-100 text-sky-800 border-sky-200',                   dot: 'bg-sky-600',     icon: Monitor },
  RECHAZO_REMISION_TI:      { badge: 'bg-rose-100 text-rose-800 border-rose-200',                dot: 'bg-rose-600',    icon: Ban },
  APROBADA_REMISION_TI:     { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',       dot: 'bg-emerald-500',  icon: ThumbsUp },
};

export const DetalleSolicitudModal: React.FC<DetalleSolicitudModalProps> = ({
  open,
  idSolicitud,
  onClose,
  catalogoCS = [],
  onCambioExitoso,
}) => {
  const [detalle, setDetalle] = useState<SolicitudMantenimiento | null>(null);
  const [evidenciasEndpoint, setEvidenciasEndpoint] = useState<SolicitudEvidencia[]>([]);
  const [remisiones, setRemisiones] = useState<Array<Record<string, any>>>([]);
  const [cargando, setCargando] = useState(false);
  const [catalogoEstado, setCatalogoEstado] = useState<CatalogoItem[]>([]);
  const [catalogoPrioridad, setCatalogoPrioridad] = useState<CatalogoItem[]>([]);
  const [catalogoCSLocal, setCatalogoCSLocal] = useState<CatalogoItem[]>([]);

  const [mostrarRemitir, setMostrarRemitir] = useState<boolean>(false);
  const [remitirMotivo, setRemitirMotivo] = useState<string>('');
  const [remitirConsecutivo, setRemitirConsecutivo] = useState<string>('');
  const [remitirEnviando, setRemitirEnviando] = useState<boolean>(false);
  const [remitirError, setRemitirError] = useState<string>('');

  const [sugerencia, setSugerencia] = useState<any | null>(null);
  const [cargandoSugerir, setCargandoSugerir] = useState<boolean>(false);
  const [errorSugerir, setErrorSugerir] = useState<string>('');
  const [tecnicosCatalogo, setTecnicosCatalogo] = useState<any[]>([]);
  const [cargandoTecnicos, setCargandoTecnicos] = useState<boolean>(false);
  const [tecnicoManualSeleccionado, setTecnicoManualSeleccionado] = useState<string>('');

  // EFDS-1734 · Acciones aprobación/rechazo/redistribución
  const [mostrarModalRechazar, setMostrarModalRechazar] = useState<boolean>(false);
  const [rechazoMotivo, setRechazoMotivo] = useState<string>('');
  const [rechazoObservaciones, setRechazoObservaciones] = useState<string>('');
  const [ejecutandoRechazo, setEjecutandoRechazo] = useState<boolean>(false);
  const [errorRechazo, setErrorRechazo] = useState<string>('');

  const [mostrarModalRedistribuir, setMostrarModalRedistribuir] = useState<boolean>(false);
  const [redistTecnicoCodigo, setRedistTecnicoCodigo] = useState<string>('');
  const [redistMotivo, setRedistMotivo] = useState<string>('');
  const [redistObservaciones, setRedistObservaciones] = useState<string>('');
  const [ejecutandoRedist, setEjecutandoRedist] = useState<boolean>(false);
  const [errorRedist, setErrorRedist] = useState<string>('');

  const [ejecutandoAprobar, setEjecutandoAprobar] = useState<boolean>(false);
  const [aprobacionObservaciones, setAprobacionObservaciones] = useState<string>('');
  const [historicoAbierto, setHistoricoAbierto] = useState<boolean>(true);
  const [toastModal, setToastModal] = useState<{ tipo: 'ok' | 'warn' | 'err'; texto: string } | null>(null);

  // ---------------------------------------------------------------------------
  // EFDS-1735 RF-INF-006: Valoración en campo + insumos
  // ---------------------------------------------------------------------------
  const [valoraciones, setValoraciones] = useState<SolicitudValoracion[]>([]);
  const [valoracionesCargando, setValoracionesCargando] = useState<boolean>(false);
  const [mostrarDetalleValoracion, setMostrarDetalleValoracion] = useState<boolean>(false);
  const [idValoracionAbierta, setIdValoracionAbierta] = useState<string | null>(null);

  const [ejecutandoInicioDirecto, setEjecutandoInicioDirecto] = useState<boolean>(false);
  const [ejecutandoInicioValoracion, setEjecutandoInicioValoracion] = useState<boolean>(false);

  const [mostrarModalConfirmarRecepcion, setMostrarModalConfirmarRecepcion] = useState<boolean>(false);
  const [recepcionObservaciones, setRecepcionObservaciones] = useState<string>('');
  const [ejecutandoRecepcion, setEjecutandoRecepcion] = useState<boolean>(false);
  const [errorRecepcion, setErrorRecepcion] = useState<string>('');

  const [valoracionesAbierto, setValoracionesAbierto] = useState<boolean>(true);

  // ---------------------------------------------------------------------------
  // EFDS-1736 RF-INF-007: Cierre técnico ejecución + evidencia
  // ---------------------------------------------------------------------------
  const [openCierre, setOpenCierre] = useState<boolean>(false);

  const handleCierreSaved = async (resp: any) => {
    if (resp && typeof resp === 'object' && (resp.idSolicitud || resp.estado)) {
      setDetalle(resp);
    }
    await recargarDetalle();
    await onCambioExitoso?.();
  };

  useEffect(() => {
    let cancelado = false;
    if (!open || !idSolicitud) {
      setDetalle(null);
      setEvidenciasEndpoint([]);
      setCargando(false);
      setSugerencia(null);
      setErrorSugerir('');
      setTecnicoManualSeleccionado('');
      setAprobacionObservaciones('');
      setValoraciones([]);
      setIdValoracionAbierta(null);
      setMostrarDetalleValoracion(false);
      setMostrarModalConfirmarRecepcion(false);
      return;
    }
    const cargar = async () => {
      setCargando(true);
      setDetalle(null);
      setEvidenciasEndpoint([]);
      setRemisiones([]);
      setSugerencia(null);
      setErrorSugerir('');
      setTecnicoManualSeleccionado('');
      setAprobacionObservaciones('');
      setValoracionesCargando(true);
      try {
        const tareas: Promise<any>[] = [
          infraestructuraService.getMantenimientoById(idSolicitud),
          infraestructuraService.getEvidenciasBySolicitud(idSolicitud),
          infraestructuraService.getCatalogo('ESTADO_SOLICITUD'),
          infraestructuraService.getCatalogo('PRIORIDAD'),
          infraestructuraService.getRemisiones(idSolicitud || ''),
          infraestructuraService.listarValoracionesPorSolicitud(idSolicitud),
        ];
        if (!catalogoCS || catalogoCS.length === 0) {
          tareas.push(infraestructuraService.getCatalogo('CATEGORIA_SERVICIO'));
        }
        if (tecnicosCatalogo.length === 0) {
          setCargandoTecnicos(true);
          tareas.push(infraestructuraService.getTecnicosConCargaVigente());
        }
        const results = await Promise.all(tareas);
        if (cancelado) return;
        let csFallback: any = undefined;
        let tecnicosResult: any[] | undefined;
        let idx = 0;
        const d = results[idx++];
        const evs = results[idx++];
        const est = results[idx++];
        const pri = results[idx++];
        const rems = results[idx++];
        const vals = results[idx++];
        if (!catalogoCS || catalogoCS.length === 0) {
          csFallback = results[idx++];
        }
        if (tecnicosCatalogo.length === 0) {
          tecnicosResult = results[idx++];
        }
        setDetalle(d);
        setEvidenciasEndpoint(Array.isArray(evs) ? evs : []);
        setRemisiones(Array.isArray(rems) ? rems : []);
        setValoraciones(Array.isArray(vals) ? vals : []);
        const valoracionAbierta = (vals || []).find((v: SolicitudValoracion) => !v.estadoAlFinalizar);
        if (valoracionAbierta) setIdValoracionAbierta(valoracionAbierta.idValoracion);
        setCatalogoEstado(est);
        setCatalogoPrioridad(pri);
        if (csFallback && Array.isArray(csFallback)) setCatalogoCSLocal(csFallback);
        if (tecnicosResult) {
          setTecnicosCatalogo(Array.isArray(tecnicosResult) ? tecnicosResult : []);
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
          setCargandoTecnicos(false);
          setValoracionesCargando(false);
        }
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [open, idSolicitud, catalogoCS]);

  const mapEstado = useMemo(() => {
    const m = new Map<string, CatalogoItem>();
    for (const it of catalogoEstado) m.set((it.codigo || '').toUpperCase(), it);
    return m;
  }, [catalogoEstado]);

  const mapPrioridad = useMemo(() => {
    const m = new Map<string, CatalogoItem>();
    for (const it of catalogoPrioridad) m.set((it.codigo || '').toUpperCase(), it);
    return m;
  }, [catalogoPrioridad]);

  const csEffective = useMemo<CatalogoItem[]>(() => {
    return (catalogoCS && catalogoCS.length > 0) ? catalogoCS : catalogoCSLocal;
  }, [catalogoCS, catalogoCSLocal]);

  const mapIdCategoria = useMemo(() => {
    const m = new Map<number, CatalogoItem>();
    for (const it of csEffective) {
      if (Number.isInteger(it.idCatalogo)) m.set(it.idCatalogo as number, it);
    }
    return m;
  }, [csEffective]);

  const evidenciasFinales = useMemo<SolicitudEvidencia[]>(() => {
    return dedupeEvidencias([evidenciasEndpoint, detalle?.evidencias || []]);
  }, [evidenciasEndpoint, detalle]);

  type GrupoEvidencias = {
    key: 'radicacion' | 'valoracion' | 'cierre' | 'otras';
    label: string;
    icon: React.ComponentType<any>;
    claseBadge: string;
    items: SolicitudEvidencia[];
  };

  const evidenciasAgrupadas = useMemo<GrupoEvidencias[]>(() => {
    const idsValoracion = new Set<string>();
    (detalle?.valoraciones || []).forEach((v) => {
      (v.evidencias || []).forEach((e) => e?.idEvidencia && idsValoracion.add(e.idEvidencia));
    });
    const idsCierre = new Set<string>();
    const arrCierre = (detalle?.evidenciasCierre || []);
    for (const it of arrCierre) {
      if (it?.idEvidencia) idsCierre.add(String(it.idEvidencia));
      if (it?.key) idsCierre.add(String(it.key));
      if (it?.rutaObjeto) idsCierre.add(String(it.rutaObjeto));
    }
    const evRadArr: SolicitudEvidencia[] = [];
    const evValArr: SolicitudEvidencia[] = [];
    const evCieArr: SolicitudEvidencia[] = [];
    const evOtrArr: SolicitudEvidencia[] = [];

    for (const e of evidenciasFinales) {
      const idMatch = e.idEvidencia;
      const ruta = (e.rutaObjeto || '').toLowerCase();
      if (idsCierre.has(idMatch) || ruta.includes('/cierre-tecnico') || ruta.includes('cierre_tecnico')) {
        evCieArr.push(e);
      } else if (idsValoracion.has(idMatch) || ruta.includes('/valoracion') || ruta.includes('valoracion_') || (e.notas || '').toLowerCase().includes('valor')) {
        evValArr.push(e);
      } else if (evRadArr.length === 0 && (
        (e.orden === 1) ||
        (detalle?.evidenciaInicialUrl && (e.urlPublica === detalle.evidenciaInicialUrl || e.urlPresigned?.startsWith(detalle.evidenciaInicialUrl.split('?')[0]))) ||
        ruta.includes('/mantenimiento/2026') || ruta.endsWith(`/${e.nombreAlmacenado}`)
      )) {
        evRadArr.push(e);
      } else {
        evOtrArr.push(e);
      }
    }
    const grupos: GrupoEvidencias[] = [
      { key: 'radicacion', label: 'Radicación inicial', icon: FileText,     claseBadge: 'bg-slate-100 text-slate-700 border border-slate-200',           items: evRadArr },
      { key: 'valoracion', label: 'Valoración en campo', icon: ClipboardList, claseBadge: 'bg-sky-100 text-sky-800 border border-sky-200',              items: evValArr },
      { key: 'cierre',     label: 'Cierre técnico',       icon: ClipboarCheckIcon, claseBadge: 'bg-emerald-100 text-emerald-800 border border-emerald-200', items: evCieArr },
      { key: 'otras',      label: 'Otras evidencias',     icon: Paperclip,   claseBadge: 'bg-indigo-100 text-indigo-800 border border-indigo-200',        items: evOtrArr },
    ];
    return grupos;
  }, [evidenciasFinales, detalle]);

  const [evAbierto, setEvAbierto] = useState<Record<string, boolean>>({
    radicacion: true, valoracion: true, cierre: true, otras: false,
  });

  const claseEstado = (estado: string): string => {
    const it = mapEstado.get((estado || '').toUpperCase());
    return it?.metadata?.color || FALLBACK_CLASE_ESTADO;
  };

  const clasePrioridad = (prioridad: string): string => {
    const it = mapPrioridad.get((prioridad || '').toUpperCase());
    return it?.metadata?.color || FALLBACK_CLASE_PRIORIDAD;
  };

  const badgeAreaResp = (area?: string): { label: string; clase: string } => {
    const a = (area || '').toUpperCase();
    if (a === 'TI') return { label: 'Resp: Oficina TI', clase: 'bg-sky-100 text-sky-800 border border-sky-200' };
    if (a === 'PENDIENTE_CLASIFICACION') return { label: 'Pendiente Clasif.', clase: 'bg-amber-100 text-amber-800 border border-amber-200' };
    return { label: 'Resp: Unidad UMI', clase: 'bg-amber-100 text-amber-800 border border-amber-200' };
  };

  const abrirRemitir = () => {
    setRemitirMotivo('');
    setRemitirConsecutivo(detalle?.consecutivo ? detalle.consecutivo + ' / ' : '');
    setRemitirError('');
    setMostrarRemitir(true);
  };

  const confirmarRemitir = async () => {
    const motivo = remitirMotivo.trim();
    if (motivo.length < 10) {
      setRemitirError('El motivo debe tener al menos 10 caracteres');
      return;
    }
    setRemitirError('');
    setRemitirEnviando(true);
    try {
      const actualizada = await infraestructuraService.remitirATI(idSolicitud || '', {
        motivo,
        consecutivoCruzadoTi: remitirConsecutivo.trim() || undefined,
        canalRemision: 'MANUAL',
      });
      setDetalle(actualizada);
      const nuevas = await infraestructuraService.getRemisiones(idSolicitud || '');
      setRemisiones(Array.isArray(nuevas) ? nuevas : []);
      setMostrarRemitir(false);
    } catch (err: any) {
      setRemitirError(err?.message || 'No se pudo remitir la solicitud. Intente nuevamente.');
    } finally {
      setRemitirEnviando(false);
    }
  };

  const sugerirAsignacionHandler = async () => {
    if (!idSolicitud) return;
    setCargandoSugerir(true);
    setErrorSugerir('');
    setSugerencia(null);
    try {
      const res = await infraestructuraService.sugerirAsignacion(idSolicitud);
      setSugerencia(res);
      if (res?.sugerido?.codigo && !tecnicoManualSeleccionado) {
        setTecnicoManualSeleccionado(res.sugerido.codigo);
      }
    } catch (err: any) {
      setErrorSugerir(err?.message || 'No se pudo calcular la sugerencia de asignación.');
    } finally {
      setCargandoSugerir(false);
    }
  };

  useEffect(() => {
    if (!toastModal) return;
    const t = setTimeout(() => setToastModal(null), 4500);
    return () => clearTimeout(t);
  }, [toastModal]);

  const recargarDetalle = async () => {
    if (!idSolicitud) return;
    try {
      const d = await infraestructuraService.getMantenimientoById(idSolicitud);
      setDetalle(d);
    } catch {
      // ignore; keep stale
    }
  };

  const aprobarYAsignarHandler = async () => {
    if (!idSolicitud || !detalle) return;
    const areaTI = (detalle.areaResponsableActual || '').toUpperCase() === 'TI';
    const codTec = tecnicoManualSeleccionado || sugerencia?.sugerido?.codigo || '';
    if (!areaTI && !codTec) {
      setToastModal({ tipo: 'err', texto: 'Debes seleccionar un técnico para aprobar y asignar. Usa "Sugerir técnico" o elige uno manualmente.' });
      return;
    }
    setEjecutandoAprobar(true);
    try {
      const payload: any = {
        tecnicoCodigo: areaTI ? undefined : codTec,
        observaciones: aprobacionObservaciones.trim() || undefined,
      };
      const res: any = await infraestructuraService.aprobarYAsignar(idSolicitud, payload);
      if (res && typeof res === 'object' && (res.idSolicitud || res.estado)) setDetalle(res);
      if (res?.__meta?.warning) {
        setToastModal({ tipo: 'warn', texto: res.__meta.warning });
      } else {
        if (areaTI) {
          setToastModal({ tipo: 'ok', texto: 'Solicitud TECNOLÓGICA APROBADA. Confirmación de recepción enviada a Oficina TI.' });
        } else {
          const nombre = res?.responsableAsignado || codTec;
          setToastModal({ tipo: 'ok', texto: `Solicitud APROBADA y ASIGNADA a ${nombre}. Estado actualizado.` });
        }
      }
      setTecnicoManualSeleccionado('');
      setSugerencia(null);
      setAprobacionObservaciones('');
      await recargarDetalle();
      await onCambioExitoso?.();
    } catch (err: any) {
      setToastModal({ tipo: 'err', texto: err?.message || 'No se pudo aprobar la solicitud. Verifica permisos.' });
    } finally {
      setEjecutandoAprobar(false);
    }
  };

  const abrirModalRechazo = () => {
    setRechazoMotivo('');
    setRechazoObservaciones('');
    setErrorRechazo('');
    setMostrarModalRechazar(true);
  };

  const confirmarRechazoHandler = async () => {
    const motivo = rechazoMotivo.trim();
    if (motivo.length < 10) {
      setErrorRechazo('El motivo de rechazo debe tener al menos 10 caracteres.');
      return;
    }
    if (!idSolicitud) return;
    setEjecutandoRechazo(true);
    setErrorRechazo('');
    try {
      await infraestructuraService.rechazarSolicitud(idSolicitud, {
        motivo,
        observaciones: rechazoObservaciones.trim() || undefined,
      });
      const areaTI = (detalle?.areaResponsableActual || '').toUpperCase() === 'TI';
      if (areaTI) {
        setToastModal({ tipo: 'ok', texto: 'Remisión TI RECHAZADA. La solicitud retorna a la bandeja UMI para correcciones. El motivo queda registrado.' });
      } else {
        setToastModal({ tipo: 'ok', texto: 'Solicitud RECHAZADA. El motivo es visible para el solicitante.' });
      }
      setMostrarModalRechazar(false);
      await recargarDetalle();
      await onCambioExitoso?.();
    } catch (err: any) {
      setErrorRechazo(err?.message || 'No se pudo rechazar la solicitud. Intenta nuevamente.');
    } finally {
      setEjecutandoRechazo(false);
    }
  };

  const abrirModalRedistribucion = () => {
    const cod = tecnicoManualSeleccionado || sugerencia?.sugerido?.codigo || '';
    setRedistTecnicoCodigo(cod);
    setRedistMotivo('');
    setRedistObservaciones('');
    setErrorRedist('');
    setMostrarModalRedistribuir(true);
  };

  const confirmarRedistribucionHandler = async () => {
    if (!idSolicitud) return;
    const cod = redistTecnicoCodigo.trim();
    if (!cod) {
      setErrorRedist('Debes seleccionar un técnico de destino para la redistribución.');
      return;
    }
    setEjecutandoRedist(true);
    setErrorRedist('');
    try {
      const res: any = await infraestructuraService.redistribuirAsignacion(idSolicitud, {
        tecnicoCodigo: cod,
        motivoRedistribucion: redistMotivo.trim() || undefined,
        observaciones: redistObservaciones.trim() || undefined,
      });
      if (res && typeof res === 'object' && (res.idSolicitud || res.estado)) setDetalle(res);
      if (res?.__meta?.warning) {
        setToastModal({ tipo: 'warn', texto: res.__meta.warning });
      } else {
        const nombre = res?.responsableAsignado || cod;
        setToastModal({ tipo: 'ok', texto: `Solicitud REDISTRIBUIDA a ${nombre}.` });
      }
      setMostrarModalRedistribuir(false);
      setTecnicoManualSeleccionado('');
      setSugerencia(null);
      await recargarDetalle();
      await onCambioExitoso?.();
    } catch (err: any) {
      setErrorRedist(err?.message || 'No se pudo redistribuir la solicitud. Intenta nuevamente.');
    } finally {
      setEjecutandoRedist(false);
    }
  };

  const renderIcono = (iconName?: string, size: number = 16, fallbackKey?: string) => {
    const key = (iconName || fallbackKey || 'clock').toLowerCase();
    const Comp = LUCIDE_ICON_MAP[key] || Clock;
    return <Comp style={{ width: size, height: size }} />;
  };

  const iconoEstado = (estado: string, size: number = 16) => {
    const it = mapEstado.get((estado || '').toUpperCase());
    return renderIcono(it?.metadata?.icon, size, 'clock');
  };

  const renderThumbnailEvidencia = (e: SolicitudEvidencia) => {
    const esImagen = !!e.mimeType && e.mimeType.startsWith('image/');
    const esPdf = !!e.mimeType && e.mimeType === 'application/pdf';
    const url = e.urlPresigned || e.urlPublica || '#';
    if (esImagen) {
      return (
        <a
          key={e.idEvidencia}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-square hover:ring-2 hover:ring-amber-400/60 transition-all shadow-sm hover:shadow-md"
          title={e.nombreOriginal}
        >
          <img
            src={url}
            alt={e.nombreOriginal}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(ev) => {
              const img = ev.currentTarget;
              if (e.urlPublica && img.src !== e.urlPublica && e.urlPresigned !== e.urlPublica) {
                img.src = e.urlPublica;
                return;
              }
              const container = img.parentElement;
              if (!container) return;
              const fallback = document.createElement('div');
              fallback.className = 'absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-500 gap-1.5';
              fallback.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-9 h-9 text-slate-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                <div class="text-[10px] font-bold px-2 text-center truncate w-full">${(e.nombreOriginal || 'imagen').replace(/[\"'<>]/g, ' ').slice(0, 22)}</div>
              `;
              img.replaceWith(fallback);
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/75 to-transparent text-white text-[10px] font-semibold truncate">
            {e.nombreOriginal}
          </div>
        </a>
      );
    }
    const IconComp = esPdf ? FileText : Image;
    return (
      <a
        key={e.idEvidencia}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-amber-300 hover:shadow-sm transition-all text-center"
        title={e.nombreOriginal}
      >
        <IconComp className={`w-10 h-10 ${esPdf ? 'text-rose-500' : 'text-slate-500'}`} />
        <div className="text-[11px] font-semibold text-slate-700 line-clamp-2 leading-tight w-full break-words">
          {e.nombreOriginal}
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
          <Download className="w-3 h-3" />
          {formatearTamano(e.tamanoBytes)}
        </div>
      </a>
    );
  };

  const renderEvidencias = () => {
    if (cargando) {
      return (
        <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando evidencias adjuntas...
        </div>
      );
    }
    const total = evidenciasFinales?.length || 0;
    if (total === 0) {
      return (
        <div className="text-xs text-slate-500 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          No hay evidencias adjuntas registradas para esta solicitud
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {evidenciasAgrupadas.map((grupo) => {
          if (!grupo.items || grupo.items.length === 0) return null;
          const Icono = grupo.icon;
          const abierto = !!evAbierto[grupo.key];
          return (
            <div key={grupo.key} className="rounded-2xl border border-slate-200 bg-slate-50/40 overflow-hidden">
              <button
                type="button"
                onClick={() => setEvAbierto((prev) => ({ ...prev, [grupo.key]: !prev[grupo.key] }))}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${grupo.claseBadge}`}>
                    <Icono className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                    {grupo.label}
                  </span>
                  <span className={`text-[10px] font-black rounded-full px-2.5 py-0.5 border ${grupo.claseBadge}`}>
                    {grupo.items.length}
                  </span>
                </div>
                {abierto ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>
              {abierto && (
                <div className="px-4 pb-4 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {grupo.items.map((e) => renderThumbnailEvidencia(e))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // EFDS-1735 RF-INF-006: Handlers valoración e insumos
  // ---------------------------------------------------------------------------
  const handleIniciarEjecucionDirecta = async () => {
    if (!detalle || !idSolicitud) return;
    setEjecutandoInicioDirecto(true);
    setToastModal(null);
    try {
      const actualizado = await infraestructuraService.iniciarEjecucionDirecta(idSolicitud);
      setDetalle(actualizado);
      setToastModal({ tipo: 'ok', texto: 'Solicitud pasó a En ejecución (sin valoración previa).' });
    } catch (err: any) {
      setToastModal({ tipo: 'err', texto: err?.message || 'Error al iniciar ejecución directa.' });
    } finally {
      setEjecutandoInicioDirecto(false);
    }
  };

  const handleIniciarValoracion = async () => {
    if (!detalle || !idSolicitud) return;
    setEjecutandoInicioValoracion(true);
    setToastModal(null);
    try {
      const r = await infraestructuraService.iniciarValoracion(idSolicitud, {});
      setDetalle(r.solicitud);
      const lista = await infraestructuraService.listarValoracionesPorSolicitud(idSolicitud);
      setValoraciones(lista);
      setIdValoracionAbierta(r.valoracion.idValoracion);
      setMostrarDetalleValoracion(true);
      setToastModal({ tipo: 'ok', texto: 'Valoración previa iniciada. Complete el formulario y guarde.' });
    } catch (err: any) {
      setToastModal({ tipo: 'err', texto: err?.message || 'Error al iniciar la valoración.' });
    } finally {
      setEjecutandoInicioValoracion(false);
    }
  };

  const handleAbrirValoracionExistente = (v: SolicitudValoracion) => {
    setIdValoracionAbierta(v.idValoracion);
    setMostrarDetalleValoracion(true);
  };

  const handleValoracionSaved = async (r: { solicitud: SolicitudMantenimiento; valoracion: SolicitudValoracion }) => {
    setDetalle(r.solicitud);
    if (idSolicitud) {
      const lista = await infraestructuraService.listarValoracionesPorSolicitud(idSolicitud);
      setValoraciones(lista);
    }
    setIdValoracionAbierta(null);
  };

  const abrirConfirmarRecepcion = () => {
    setRecepcionObservaciones('');
    setErrorRecepcion('');
    setMostrarModalConfirmarRecepcion(true);
  };

  const handleConfirmarRecepcion = async () => {
    if (!idSolicitud) return;
    setErrorRecepcion('');
    setEjecutandoRecepcion(true);
    try {
      const actualizado = await infraestructuraService.confirmarRecepcionInsumos(idSolicitud, {
        observaciones: recepcionObservaciones.trim() || undefined,
      });
      setDetalle(actualizado);
      setMostrarModalConfirmarRecepcion(false);
      setToastModal({ tipo: 'ok', texto: 'Recepción de materiales confirmada. Solicitud pasó a En ejecución.' });
    } catch (err: any) {
      setErrorRecepcion(err?.message || 'Error al confirmar recepción.');
    } finally {
      setEjecutandoRecepcion(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers permisos EFDS-1735: decidir qué botones renderizar según estado
  // ---------------------------------------------------------------------------
  const estadoActual = (detalle?.estado || '').toUpperCase();
  // EFDS-1730 / EFDS-1734: estados pre-aprobación donde sí tiene sentido Aprobar o Rechazar la primera vez.
  const ESTADOS_PRE_APROBACION_UMI: string[] = [
    'RECIBIDA',
    'EN_ANALISIS',
    'PENDIENTE_CLASIFICACION',
    'PENDIENTE_APROBACION',
  ];
  const ESTADOS_PRE_APROBACION_TI: string[] = [
    'REMITIDA_TI',
    'PENDIENTE_APROBACION',
  ];
  const ESTADOS_FINALES_O_BLOQUEADOS: string[] = [
    'COMPLETADA',
    'CERRADA',
    'CERRADA_SIN_ATENCION',
    'RECHAZADA',
  ];
  const puedeAprobarAsignarUMI =
    detalle &&
    detalle.areaResponsableActual?.toUpperCase() !== 'TI' &&
    ESTADOS_PRE_APROBACION_UMI.includes(estadoActual);
  const puedeAprobarRemisionTI =
    detalle &&
    detalle.areaResponsableActual?.toUpperCase() === 'TI' &&
    ESTADOS_PRE_APROBACION_TI.includes(estadoActual);
  const puedeRechazarUMI = puedeAprobarAsignarUMI;
  const puedeRechazarRemisionTI = puedeAprobarRemisionTI;
  const puedeRedistribuir =
    detalle &&
    detalle.areaResponsableActual?.toUpperCase() !== 'TI' &&
    estadoActual === 'ASIGNADA';

  // Visibilidad caja Motor sugerencia + reasignación manual (EFDS-1734 / 1735 / 1736):
  // Sólo tiene sentido durante aprobación inicial o reasignación en ASIGNADA; nunca en ejecución / finales.
  const puedeVerMotorAsignacion = !!(puedeAprobarAsignarUMI || estadoActual === 'ASIGNADA');

  const puedeIniciarEjecOValoracion =
    detalle &&
    detalle.areaResponsableActual?.toUpperCase() !== 'TI' &&
    (estadoActual === 'ASIGNADA');
  const puedeConfirmarRecepcionMateriales =
    detalle && estadoActual === 'EN_ESPERA_DE_INSUMOS';
  const esCategoriaElectricas48 = Number(detalle?.idCategoria) === 48;

  // EFDS-1736 helpers footer
  const yaCerradoTecnicamente = !!(detalle?.fechaCierreTecnico || estadoActual === 'COMPLETADA' || estadoActual === 'CERRADA' || estadoActual === 'CERRADA_SIN_ATENCION');
  const puedeCerrarTecnicamente =
    detalle &&
    detalle.areaResponsableActual?.toUpperCase() !== 'TI' &&
    estadoActual === 'EN_PROGRESO' &&
    !yaCerradoTecnicamente;
  const puedeVerCierreTecnico =
    detalle &&
    detalle.areaResponsableActual?.toUpperCase() !== 'TI' &&
    yaCerradoTecnicamente;

  if (!open) return null;
  const bloqueado =
    ejecutandoAprobar ||
    ejecutandoRechazo ||
    ejecutandoRedist ||
    remitirEnviando ||
    ejecutandoInicioDirecto ||
    ejecutandoInicioValoracion ||
    ejecutandoRecepcion;

  return (
    <>
      {detalle && idSolicitud && (
        <DetalleCierreEjecucionForm
          open={openCierre}
          onClose={() => setOpenCierre(false)}
          idSolicitud={idSolicitud}
          solicitud={detalle}
          onSaved={handleCierreSaved}
        />
      )}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget && !bloqueado) onClose(); }}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de solicitud de mantenimiento ${detalle?.consecutivo || ''}`}
      >
      <div
        style={{
          position: 'fixed',
          top: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '95vw',
          maxWidth: 960,
          height: 'calc(100vh - 152px)',
          overflow: 'hidden',
        }}
      >
        <div className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 h-full">

        <div
          className="px-6 sm:px-8 py-5 border-b border-slate-200 bg-white flex items-start gap-4"
        >
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-xs bg-slate-900 text-gray-200 px-3 py-1 rounded-lg shadow-sm">
                {detalle?.consecutivo || cargando ? (detalle?.consecutivo || 'Cargando...') : 'Sin consecutivo'}
              </span>
              {detalle && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border shadow-sm ${claseEstado(detalle.estado)}`}
                >
                  {iconoEstado(detalle.estado, 13)}
                  {detalle.estado || 'RECIBIDA'}
                </span>
              )}
              {detalle && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm ${clasePrioridad(detalle.prioridad || 'MEDIA')}`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  {detalle.prioridad || 'MEDIA'}
                </span>
              )}
              {detalle?.tipoMantenimiento && (
                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {detalle.tipoMantenimiento}
                </span>
              )}
              {detalle?.tipoAtencion && (
                <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                  detalle.tipoAtencion === 'TECNOLOGICA'
                    ? 'bg-sky-100 text-sky-800 border-sky-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  Atención {detalle.tipoAtencion}
                </span>
              )}
              {detalle?.areaResponsableActual && (
                (() => {
                  const b = badgeAreaResp(detalle.areaResponsableActual);
                  return (
                    <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${b.clase}`}>
                      {b.label}
                    </span>
                  );
                })()
              )}
              {Number.isInteger(detalle?.idCategoria) && (() => {
                const cat = mapIdCategoria.get(detalle!.idCategoria as number);
                if (!cat) return null;
                const colorClase = cat?.metadata?.color || 'bg-indigo-100 text-indigo-800 border border-indigo-200';
                return (
                  <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${colorClase}`} title={cat.codigo || ''}>
                    {cat.nombre}
                  </span>
                );
              })()}
              {Number.isInteger(detalle?.idSubcategoria) && (() => {
                const sub = mapIdCategoria.get(detalle!.idSubcategoria as number);
                if (!sub) return null;
                return (
                  <span className="inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200" title={sub.codigo || ''}>
                    Sub: {sub.nombre}
                  </span>
                );
              })()}
              {detalle && Number(detalle.diasExtendidosPorInsumos || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shadow-sm text-[11px] font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  SLA extendida · +{detalle.diasExtendidosPorInsumos} d por materiales
                </span>
              )}
              {detalle && detalle.esperaInsumosFlag && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-300 shadow-sm text-[11px] font-bold">
                  <PackageX className="w-3 h-3" />
                  En espera de insumos
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              {cargando ? (
                <span className="inline-flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando detalle...
                </span>
              ) : detalle?.descripcion ? detalle.descripcion : 'No se pudo cargar la información de esta solicitud'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-7 bg-white">
          {cargando && !detalle && (
            <div className="py-16 text-center text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              Consultando el detalle de la solicitud...
            </div>
          )}

          {!cargando && !detalle && (
            <div className="py-16 text-center space-y-3 bg-rose-50/50 border border-rose-100 rounded-2xl">
              <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="font-bold text-rose-900">No se pudo cargar la solicitud</p>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                Puede que la solicitud haya sido eliminada o no cuentes con permisos para verla. Cierra esta ventana y actualiza el listado.
              </p>
            </div>
          )}

          {detalle && (
            <>
              {toastModal && (
                <div className={`rounded-xl p-3 border shadow-sm text-xs font-bold flex items-start gap-2 animate-in slide-in-from-top fade-in ${
                  toastModal.tipo === 'ok'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : toastModal.tipo === 'warn'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-5">{toastModal.texto}</span>
                </div>
              )}

              {String((detalle.estado || '')).toUpperCase() === 'RECHAZADA' && detalle.motivoRechazo && (
                <div className="rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-rose-50/60 to-white p-4 space-y-2 shadow-sm animate-in fade-in zoom-in-95">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md ring-2 ring-rose-100">
                      <ThumbsDown className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-rose-900 tracking-tight">
                          Solicitud RECHAZADA · Motivo visible para el solicitante
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-black uppercase tracking-wider border border-rose-300">
                          RF-INF-005 AC-02
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-rose-800 font-semibold whitespace-pre-wrap leading-relaxed bg-white/80 border border-rose-200 rounded-xl px-3.5 py-3">
                        {detalle.motivoRechazo}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-14 gap-y-6 px-1 py-0">
                <div className="space-y-2.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 inline-flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Solicitante
                  </div>
                  <div className="font-semibold text-slate-800 text-base leading-6">
                    {detalle.solicitanteNombre || '—'}
                  </div>
                  {detalle.solicitanteEmail && (
                    <div className="text-xs text-slate-500 leading-5">{detalle.solicitanteEmail}</div>
                  )}
                  {detalle.nombreAreaSolicitante && (
                    <div className="text-xs text-slate-500 leading-5">
                      Área: <strong className="text-slate-700">{detalle.nombreAreaSolicitante}</strong>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Ubicación
                  </div>
                  <div className="font-semibold text-slate-800 text-base leading-6">
                    {detalle.sede?.nombre || detalle.idSede || '—'}
                  </div>
                  {(detalle.piso || detalle.salon || detalle.ubicacionDetalle) && (
                    <div className="text-xs text-slate-500 inline-flex items-start gap-1.5 leading-5">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                      {[detalle.piso && `Piso ${detalle.piso}`, detalle.salon, detalle.ubicacionDetalle].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Fechas
                  </div>
                  <ul className="text-xs text-slate-600 space-y-1 leading-5">
                    <li>
                      <span className="text-slate-400">Radicación:</span>{' '}
                      <strong className="text-slate-700">
                        {formatearFecha(detalle.fechaRadicacion || detalle.createdAt)}
                      </strong>
                    </li>
                    {detalle.fechaProgramada && (
                      <li>
                        <span className="text-slate-400">Programada:</span>{' '}
                        <strong className="text-slate-700">{formatearFecha(detalle.fechaProgramada)}</strong>
                      </li>
                    )}
                    {detalle.fechaEjecucion && (
                      <li>
                        <span className="text-slate-400">Ejecución:</span>{' '}
                        <strong className="text-slate-700">{formatearFecha(detalle.fechaEjecucion)}</strong>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Resumen económico
                  </div>
                  <div className="font-semibold text-slate-800 text-base">
                    {formatearDinero(detalle.costoEstimado)}
                  </div>
                  {detalle.responsableAsignado && (
                    <div className="flex items-start gap-1.5 mt-2">
                      <ShieldCheck className="w-3 h-3 mt-0.5 flex-shrink-0 text-slate-400" />
                      <div className="text-xs text-slate-500">
                        Responsable: <strong className="text-slate-700">{detalle.responsableAsignado}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Wand2 className="w-3.5 h-3.5" />
                  Asignación y SLA (EFDS-1733)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Tiempo de respuesta (SLA)
                    </div>
                    {(() => {
                      const sla = clasificarSLA(detalle.fechaLimiteAtencion);
                      const colores: Record<string, string> = {
                        vencido: 'bg-rose-100 text-rose-800 border-rose-200',
                        alerta: 'bg-amber-100 text-amber-800 border-amber-200',
                        ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                        sin: 'bg-slate-100 text-slate-600 border-slate-200',
                      };
                      const color = colores[sla.clase] || colores.sin;
                      return (
                        <div className="space-y-2">
                          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-sm ${color}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {sla.texto}
                          </span>
                          <div className="text-xs text-slate-500 leading-5">
                            <div>
                              <span className="text-slate-400">Fecha límite:</span>{' '}
                              <strong className="text-slate-700">{formatearFecha(detalle.fechaLimiteAtencion)}</strong>
                            </div>
                            {sla.horasRestantes !== null && (
                              <div>
                                <span className="text-slate-400">Horas restantes:</span>{' '}
                                <strong className={sla.clase === 'vencido' ? 'text-rose-700' : sla.clase === 'alerta' ? 'text-amber-700' : 'text-emerald-700'}>
                                  {sla.horasRestantes.toFixed(1)} h
                                </strong>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  {(() => {
                    const areaTI = (detalle?.areaResponsableActual || '').toUpperCase() === 'TI';
                    if (areaTI) {
                      return (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4 space-y-2.5">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                              <Monitor className="w-5 h-5" strokeWidth={2} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-100 border border-sky-200 text-[11px] font-black uppercase tracking-wider text-sky-800">
                                  Atención Oficina TI · TECNOLÓGICA
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-600">
                                  EFDS-1733 · Reglas UMI NO aplican
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                                Las solicitudes clasificadas como <strong className="text-sky-800">TECNOLÓGICA</strong> o con área responsable <strong>Oficina TI</strong> NO siguen el motor de asignación de técnico UMI ni las reglas EFDS-1733. La atención se gestiona directamente por el equipo de Tecnologías con su propio flujo interno; la trazabilidad de la remisión se registra en la sección superior <strong>Trazabilidad de Remisiones</strong>.
                              </p>
                              <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                                Como gestor UMI puedes <strong>aprobar la confirmación de recepción</strong> de la remisión enviada a TI o <strong>rechazar la remisión</strong> (con motivo) si la solicitud debe volver a la unidad UMI para correcciones.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    if (!puedeVerMotorAsignacion) {
                      return null;
                    }
                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Motor de sugerencia
                          </div>
                          <button
                            type="button"
                            onClick={sugerirAsignacionHandler}
                            disabled={cargandoSugerir}
                            title="Calcular sugerencia de asignación por reglas UMI (especialidad + equidad menor carga vigente)"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-[11px] font-bold shadow-sm shadow-blue-500/15 transition-all active:scale-[0.98]"
                          >
                            {cargandoSugerir ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Calculando…
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-3.5 h-3.5" />
                                Sugerir técnico
                              </>
                            )}
                          </button>
                        </div>
                        {errorSugerir && (
                          <div className="flex items-start gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-800">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="text-[11px] font-medium leading-5">{errorSugerir}</div>
                          </div>
                        )}
                        {sugerencia?.advertencia && !errorSugerir && (
                          <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div className="text-[11px] font-medium leading-5">{sugerencia.advertencia}</div>
                          </div>
                        )}
                        {sugerencia && (
                          <div className="space-y-2.5">
                            {sugerencia.obligatorio && sugerencia.regla === 'ESPECIALIZACION' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-800 border border-violet-200">
                                <Zap className="w-2.5 h-2.5" />
                                OBLIGATORIO · Especialista ({sugerencia.nombreCategoria || 'Eléctricas'})
                              </span>
                            ) : sugerencia.regla === 'EQUIDAD' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                                <Users className="w-2.5 h-2.5" />
                                Sugerencia · Equidad menor carga vigente
                              </span>
                            ) : null}
                            {sugerencia.sugerido && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                                    <User className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-black text-slate-800 truncate">
                                      {sugerencia.sugerido.nombreDisplay || sugerencia.sugerido.nombre}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {sugerencia.sugerido.codigo}
                                      {sugerencia.sugerido.cargaVigente !== undefined && ` · Carga: ${sugerencia.sugerido.cargaVigente}`}
                                    </div>
                                  </div>
                                </div>
                                {Array.isArray(sugerencia.sugerido.especialidades) && sugerencia.sugerido.especialidades.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {sugerencia.sugerido.especialidades.slice(0, 4).map((esp: string, i: number) => (
                                      <span key={i} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                        {esp}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="pt-1.5 space-y-1.5">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Reasignación manual (opcional)
                              </label>
                              <div className="relative">
                                <select
                                  value={tecnicoManualSeleccionado}
                                  onChange={(e) => setTecnicoManualSeleccionado(e.target.value)}
                                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-xs font-semibold text-slate-700 shadow-sm outline-none transition-all focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
                                  disabled={cargandoTecnicos}
                                >
                                  <option value="">— Seleccione técnico (sobrescribe sugerencia) —</option>
                                  {tecnicosCatalogo.map((t) => (
                                    <option key={t.codigo} value={t.codigo}>
                                      [{t.codigo}] {t.nombreDisplay || t.nombre} · Carga {t.cargaVigente ?? 0}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              </div>
                              {tecnicoManualSeleccionado && (() => {
                                const sel = tecnicosCatalogo.find((t) => t.codigo === tecnicoManualSeleccionado);
                                if (!sel) return null;
                                return (
                                  <div className="text-[10px] text-slate-500 leading-5 pt-0.5">
                                    <span className="text-slate-400">Correo:</span> <strong className="text-slate-700">{sel.email || sel.metadata?.email || '—'}</strong>
                                    {(sel.telefono || sel.metadata?.telefono) && <> · <span className="text-slate-400">Tel:</span> <strong className="text-slate-700">{sel.telefono || sel.metadata?.telefono}</strong></>}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Descripción de la novedad
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {detalle.descripcion || 'Sin descripción registrada'}
                  </p>
                </div>
              </div>

              {(detalle.evidenciaInicialUrl || detalle.observaciones) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detalle.evidenciaInicialUrl && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 sm:p-5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
                        Evidencia inicial (enlace legacy)
                      </div>
                      <a
                        href={detalle.evidenciaInicialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-amber-800 underline underline-offset-2 break-all inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3" />
                        {detalle.evidenciaInicialUrl}
                      </a>
                    </div>
                  )}
                  {detalle.observaciones && (
                    <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 sm:p-5">
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">
                        Observaciones de gestión
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {detalle.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Paperclip className="w-3.5 h-3.5" />
                  Evidencias adjuntas
                  <span className="ml-1 px-2.5 py-0.5 text-[10px] font-black rounded-full bg-slate-100 text-slate-600 border border-slate-200 tracking-normal">
                    {evidenciasFinales.length}
                  </span>
                </div>
                {renderEvidencias()}
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <GitBranch className="w-3.5 h-3.5" />
                  Trazabilidad de remisiones
                  <span className="ml-1 px-2.5 py-0.5 text-[10px] font-black rounded-full bg-slate-100 text-slate-600 border border-slate-200 tracking-normal">
                    {remisiones.length}
                  </span>
                </div>
                {remisiones.length === 0 ? (
                  <div className="text-xs text-slate-500 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    Esta solicitud no tiene remisiones registradas a la Oficina de Tecnologías.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Fecha / Hora</th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Origen → Destino</th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Usuario</th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Motivo</th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Consec. TI</th>
                          <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {remisiones.map((r, idx) => (
                          <tr key={r.idRemision || idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                              {r.fechaRemision ? formatearFecha(r.fechaRemision) : '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wide">
                                  {r.origenArea || 'UMI'}
                                </span>
                                <span className="text-slate-400">→</span>
                                <span className="inline-block px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-[10px] font-bold uppercase tracking-wide">
                                  {r.destinoArea || 'TI'}
                                </span>
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">
                              <div className="font-semibold">{r.usuarioEmail || r.usuarioQueRemiteEmail || 'Sistema'}</div>
                              {r.usuarioId && <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{r.usuarioId}</div>}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 max-w-[260px]">
                              <div className="leading-snug line-clamp-2">{r.motivo || '—'}</div>
                              {r.canalRemision && (
                                <div className="text-[10px] text-slate-400 mt-1">Canal: {r.canalRemision}</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                              {r.consecutivoCruzadoTi || '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${
                                (r.estadoRemision || '').toUpperCase().includes('PENDIENTE')
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}>
                                {r.estadoRemision || 'PENDIENTE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ------------------------------------------------------------------- */}
              {/* EFDS-1735 RF-INF-006: Acordeón Valoraciones e insumos             */}
              {/* ------------------------------------------------------------------- */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setValoracionesAbierto(!valoracionesAbierto)}
                  className="w-full text-left flex items-center justify-between gap-3 border-b border-slate-100 pb-2 hover:bg-slate-50/40 -mx-1 px-1 rounded-lg transition-colors"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
                    <ClipboarCheckIcon className="w-3.5 h-3.5" />
                    Valoraciones e insumos
                    <span className="ml-1 px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-normal">
                      {valoraciones.length}
                    </span>
                    {idValoracionAbierta && (
                      <span className="ml-1 px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300 tracking-normal">
                        1 abierta
                      </span>
                    )}
                  </div>
                  {valoracionesAbierto ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {valoracionesAbierto && (
                  <div className="space-y-2">
                    {valoracionesCargando && valoraciones.length === 0 && (
                      <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs text-slate-500 bg-slate-50 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Cargando valoraciones...
                      </div>
                    )}
                    {!valoracionesCargando && valoraciones.length === 0 && (
                      <div className="rounded-lg border border-slate-200 px-3 py-4 text-xs text-slate-500 bg-slate-50 text-center">
                        <ClipboarCheckIcon className="w-4.5 h-4.5 mx-auto mb-1.5 text-slate-400" />
                        No hay valoraciones. Si la solicitud está <strong>ASIGNADA</strong>, el técnico puede Iniciar Ejecución Directa o Registrar una Valoración Previa desde los botones del pie de página.
                      </div>
                    )}
                    {valoraciones.map((v) => {
                      const totalInsumos = (v.insumos || []).reduce(
                        (acc, i) => acc + ((Number(i.cantidad || 0) * Number(i.costoUnitarioCop || 0)) || 0),
                        0,
                      );
                      const abierta = !v.estadoAlFinalizar;
                      return (
                        <div
                          key={v.idValoracion}
                          className={[
                            'rounded-lg border p-3 space-y-2 transition',
                            abierta
                              ? 'bg-indigo-50/50 border-indigo-200'
                              : 'bg-white border-slate-200',
                          ].join(' ')}
                        >
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={[
                                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                  abierta
                                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                    : v.estadoAlFinalizar === 'EN_ESPERA_DE_INSUMOS'
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-100 text-emerald-800 border-emerald-300',
                                ].join(' ')}>
                                  {abierta ? 'Borrador' : v.estadoAlFinalizar}
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {formatearFecha(v.createdAt)}
                                </span>
                                {v.esVersionCorregidaPorEncargado && (
                                  <span className="text-[10px] font-bold text-indigo-700 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded-full">
                                    Corregida por Encargado
                                  </span>
                                )}
                                {esCategoriaElectricas48 && (
                                  <span className={[
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                    v.requiereApagadoElectrico
                                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-slate-100 text-slate-700 border-slate-200',
                                  ].join(' ')}>
                                    <Zap className="w-2.5 h-2.5" />
                                    {v.requiereApagadoElectrico ? 'Requiere apagado' : 'Sin apagado'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">{v.tecnicoNombreValorador || v.tecnicoCodigoValorador || 'Valorador'}</span>
                                {' · '}Riesgo {v.nivelRiesgo || '—'} · Tiempo {v.tiempoEstimadoHoras || 0} h
                                {totalInsumos > 0 && <> · Insumos estimados <span className="font-semibold text-slate-700">${totalInsumos.toLocaleString('es-CO')} COP</span></>}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAbrirValoracionExistente(v)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-bold transition"
                              >
                                <Eye className="w-3 h-3" />
                                {abierta ? 'Continuar edición' : 'Ver detalle'}
                              </button>
                              {idValoracionAbierta === v.idValoracion && (
                                <span className="text-[10px] font-bold text-indigo-600 px-1">Abierta</span>
                              )}
                            </div>
                          </div>
                          {(v.diagnostico || v.alcanceIdentificado) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                              <div className="rounded bg-white/80 border border-slate-100 px-2.5 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Diagnóstico</p>
                                <p className="text-slate-700 leading-5">{v.diagnostico || '—'}</p>
                              </div>
                              <div className="rounded bg-white/80 border border-slate-100 px-2.5 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Alcance</p>
                                <p className="text-slate-700 leading-5">{v.alcanceIdentificado || '—'}</p>
                              </div>
                            </div>
                          )}
                          {Array.isArray(v.insumos) && v.insumos.length > 0 && (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                              <table className="min-w-full text-[11px]">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left font-bold w-8">#</th>
                                    <th className="px-2 py-1.5 text-left font-bold min-w-[160px]">Insumo</th>
                                    <th className="px-2 py-1.5 text-right font-bold w-16">Cant</th>
                                    <th className="px-2 py-1.5 text-left font-bold w-16">Unidad</th>
                                    <th className="px-2 py-1.5 text-right font-bold w-24">$ Unit</th>
                                    <th className="px-2 py-1.5 text-right font-bold w-24">Subtotal</th>
                                    <th className="px-2 py-1.5 text-left font-bold w-44">Disponibilidad</th>
                                    <th className="px-2 py-1.5 text-right font-bold w-14">Días</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.insumos!.map((i, idx) => {
                                    const sub = (Number(i.cantidad || 0) * Number(i.costoUnitarioCop || 0)) || 0;
                                    return (
                                      <tr key={i.idInsumo || (v.idValoracion + idx)} className="border-b border-slate-100 last:border-b-0">
                                        <td className="px-2 py-1.5 text-slate-500 font-semibold">{idx + 1}</td>
                                        <td className="px-2 py-1.5 font-semibold text-slate-800">{i.nombre}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{i.cantidad}</td>
                                        <td className="px-2 py-1.5 text-slate-600">{i.unidadMedida}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">${(Number(i.costoUnitarioCop || 0)).toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-slate-800">${sub.toLocaleString('es-CO')}</td>
                                        <td className="px-2 py-1.5">
                                          <span className={[
                                            'inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                            i.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR'
                                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                                              : 'bg-emerald-100 text-emerald-800 border-emerald-200',
                                          ].join(' ')}>
                                            {i.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR' ? 'Solicitar' : 'En bodega'}
                                          </span>
                                        </td>
                                        <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">
                                          {i.disponibilidad === 'NO_DISPONIBLE_A_SOLICITAR' ? (i.tiempoAdquisicionDias ?? '-') : '—'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                  <tr>
                                    <td className="px-2 py-1.5" colSpan={5}></td>
                                    <td className="px-2 py-1.5 text-right tabular-nums text-xs font-black text-slate-900">
                                      ${totalInsumos.toLocaleString('es-CO')}
                                    </td>
                                    <td className="px-2 py-1.5" colSpan={2}></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                          {v.observaciones && (
                            <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                              <span className="font-bold text-slate-500">Notas:</span> {v.observaciones}
                            </div>
                          )}
                          {Array.isArray(v.evidencias) && v.evidencias.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {v.evidencias.map((e, i) => (
                                <a
                                  key={e.idEvidencia || ('evv-' + v.idValoracion + '-' + i)}
                                  href={e.urlPresigned || e.urlPublica || '#'}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold hover:bg-slate-200 transition"
                                >
                                  <Paperclip className="w-2.5 h-2.5" />
                                  {(e.nombreOriginal || 'evidencia').slice(0, 28)}
                                  {(e.nombreOriginal || '').length > 28 ? '…' : ''}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setHistoricoAbierto(!historicoAbierto)}
                  className="w-full text-left flex items-center justify-between gap-3 border-b border-slate-100 pb-2 hover:bg-slate-50/40 -mx-1 px-1 rounded-lg transition-colors"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
                    <ScrollText className="w-3.5 h-3.5" />
                    Histórico Asignaciones
                    <span className="ml-1 px-2.5 py-0.5 text-[10px] font-black rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-normal">
                      {Array.isArray((detalle as any)?.asignaciones) ? (detalle as any).asignaciones.length : 0}
                    </span>
                    <span className="font-black text-slate-400 tracking-normal normal-case text-[11px]"></span>
                  </div>
                  {historicoAbierto ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {historicoAbierto && (() => {
                  const arr: any[] = Array.isArray((detalle as any)?.asignaciones) ? (detalle as any).asignaciones : [];
                  if (arr.length === 0) {
                    return (
                      <div className="text-xs text-slate-500 py-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        No hay historial de asignaciones. Ejecuta Aprobar, Rechazar o Redistribuir para registrar la primera entrada con trazabilidad completa.
                      </div>
                    );
                  }
                  return (
                    <ol className="relative border-l border-slate-200 ml-3.5 space-y-5 py-1.5">
                      {arr.slice()
                        .sort((a, b) => {
                          const da = new Date(a.fecha || 0).getTime();
                          const db = new Date(b.fecha || 0).getTime();
                          return isFinite(db) && isFinite(da) ? db - da : String(b.fecha || '').localeCompare(String(a.fecha || ''));
                        })
                        .map((entry, i) => {
                          const acc = String(entry.accion || 'DESCONOCIDA');
                          const style = HISTORICO_ACCION_STYLE[acc] || {
                            badge: 'bg-slate-100 text-slate-700 border-slate-200',
                            dot: 'bg-slate-500',
                            icon: ClipboardList,
                          };
                          const IconoAccion = style.icon;
                          const obsJson = parseJsonSeguro(entry.observaciones);
                          const resumenSLA = (acc === 'EXTENSION_SLA_POR_INSUMOS' && obsJson) ? resumirExtensionSLA(obsJson) : null;
                          return (
                            <li key={entry.id || `hist-${i}`} className="ml-6 relative">
                              <span
                                className={`absolute -left-[17px] -top-0.5 flex items-center justify-center w-7 h-7 rounded-full border-[3px] border-white shadow-md ring-1 ring-slate-200 ${style.dot}`}
                                title={acc}
                              >
                                <IconoAccion className="w-3.5 h-3.5 text-white" />
                              </span>
                              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.08em] border shadow-[0_1px_0_rgba(0,0,0,0.04)] ${style.badge}`}>
                                      <IconoAccion className="w-3 h-3" />
                                      {acc.replace(/_/g, ' · ')}
                                    </span>
                                    {entry.tecnico_codigo && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-50 text-slate-700 border border-slate-200">
                                        <User className="w-3 h-3 text-slate-500" />
                                        <span className="font-mono text-slate-700">{entry.tecnico_codigo}</span>
                                        {entry.tecnico_nombre_display && (
                                          <span className="text-slate-600">· {String(entry.tecnico_nombre_display).split(' · ').pop() || entry.tecnico_nombre_display}</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl whitespace-nowrap">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {formatearFecha(entry.fecha)}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {entry.motivo && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mt-1 px-1.5 py-0.5 rounded-md bg-slate-100">
                                        Motivo
                                      </span>
                                      <span className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium bg-slate-50/70 px-3 py-2 rounded-xl border border-slate-200 flex-1 text-[12px]">
                                        {String(entry.motivo)}
                                      </span>
                                    </div>
                                  )}

                                  {(resumenSLA || (!obsJson && entry.observaciones)) && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0 mt-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-100">
                                        {resumenSLA ? 'Ajuste SLA' : 'Observaciones'}
                                      </span>
                                      <span className="text-slate-600 leading-relaxed whitespace-pre-wrap flex-1 text-[12px]">
                                        {resumenSLA || String(entry.observaciones)}
                                      </span>
                                    </div>
                                  )}

                                  {obsJson && (acc === 'EXTENSION_SLA_POR_INSUMOS') && (
                                    <div className="grid grid-cols-3 gap-2 text-[11px] ml-10 border-l-2 border-orange-200 pl-3">
                                      {obsJson.diasAdicionales != null && (
                                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-2 text-center">
                                          <div className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Días extra</div>
                                          <div className="text-orange-800 font-black text-base leading-none mt-1">+{Number(obsJson.diasAdicionales)}</div>
                                        </div>
                                      )}
                                      {obsJson.fechaOriginal && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center">
                                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tope original</div>
                                          <div className="text-slate-800 font-bold text-[11px] leading-snug mt-1">
                                            {new Date(obsJson.fechaOriginal).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}
                                          </div>
                                        </div>
                                      )}
                                      {obsJson.fechaNueva && (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2 text-center">
                                          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Nuevo tope</div>
                                          <div className="text-emerald-900 font-bold text-[11px] leading-snug mt-1">
                                            {new Date(obsJson.fechaNueva).toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 mt-2 border-t border-dashed border-slate-200">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px]">
                                      <User className="w-3 h-3 text-slate-400" />
                                      <span className="font-bold text-slate-500 shrink-0">Usuario:</span>
                                      <span className="font-semibold text-slate-700">
                                        {entry.usuario_email || 'Sistema'}
                                      </span>
                                      {entry.usuario_id && (
                                        <span className="text-slate-400 font-mono text-[10px]" title={String(entry.usuario_id)}>
                                          id·{String(entry.usuario_id).slice(0, 8)}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  {entry.usuario_roles && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[10px] font-bold text-slate-500">Rol activo:</span>
                                      {(String(entry.usuario_roles).split(',').filter(Boolean) || []).map((rol, j) => {
                                        const rolClean = rol.trim();
                                        const rolColor =
                                          rolClean === 'SUPER_ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                          rolClean === 'USER'        ? 'bg-slate-50 text-slate-700 border-slate-200' :
                                          rolClean === 'ADMIN'       ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                          'bg-slate-50 text-slate-700 border-slate-200';
                                        return (
                                          <span key={j} className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${rolColor}`}>
                                            {rolClean}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                    </ol>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {detalle && ((detalle.areaResponsableActual || '').toUpperCase() === 'TI') && (
          <div className="px-5 pb-4 -mt-3 bg-white">
            <label className="block text-xs font-bold text-slate-700 tracking-tight mb-1.5">
              Observaciones de confirmación de recepción (opcional)
            </label>
            <textarea
              value={aprobacionObservaciones}
              onChange={(e) => setAprobacionObservaciones(e.target.value)}
              rows={2}
              placeholder="Ej: Recepción confirmada. Derivado a mesa de servicios TIC, ticket consecutivo TIC-2026-..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none placeholder:text-slate-400"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-t border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3">
            {detalle && (() => {
              const areaTI = (detalle.areaResponsableActual || '').toUpperCase() === 'TI';
              if (areaTI) {
                return (
                  <>
                    {puedeAprobarRemisionTI && (
                      <button
                        type="button"
                        onClick={aprobarYAsignarHandler}
                        disabled={ejecutandoAprobar}
                        title="Aprobar la remisión a Oficina TI (confirmar recepción formal). No requiere asignación de técnico UMI."
                        className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-[0.98] whitespace-nowrap"
                      >
                        {ejecutandoAprobar ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando…</>
                        ) : (
                          <><ShieldCheck className="w-3.5 h-3.5" /> Aprobar remisión a TI</>
                        )}
                      </button>
                    )}
                    {puedeRechazarRemisionTI && (
                      <button
                        type="button"
                        onClick={abrirModalRechazo}
                        disabled={ejecutandoRechazo}
                        title="Rechazar la remisión a TI con motivo (solicitud retorna a unidad UMI para correcciones)"
                        className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 text-rose-800 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Rechazar remisión
                      </button>
                    )}
                  </>
                );
              }
              return (
                <>
                  {puedeAprobarAsignarUMI && (
                    <button
                      type="button"
                      onClick={aprobarYAsignarHandler}
                      disabled={ejecutandoAprobar}
                      title="Aprobar solicitud y asignar técnico seleccionado (sugerido o manual)"
                      className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all active:scale-[0.98] whitespace-nowrap"
                    >
                      {ejecutandoAprobar ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando…</>
                      ) : (
                        <><ThumbsUp className="w-3.5 h-3.5" /> Aprobar y Asignar</>
                      )}
                    </button>
                  )}
                  {puedeRechazarUMI && (
                    <button
                      type="button"
                      onClick={abrirModalRechazo}
                      disabled={ejecutandoRechazo}
                      title="Rechazar solicitud con motivo obligatorio. El motivo es visible para el solicitante."
                      className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 text-rose-800 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Rechazar
                    </button>
                  )}
                  {puedeRedistribuir && (
                    <button
                      type="button"
                      onClick={abrirModalRedistribucion}
                      disabled={ejecutandoRedist}
                      title="Redistribuir / reasignar técnico responsable (cambia responsable manteniendo o pasando a ASIGNADA)"
                      className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap"
                    >
                      <RedistribuirIcon className="w-3.5 h-3.5" />
                      Redistribuir
                    </button>
                  )}
                </>
              );
            })()}

            {/* EFDS-1735 RF-INF-006: Botones flujo ejecución / valoración  */}
            {puedeConfirmarRecepcionMateriales && (
              <button
                type="button"
                onClick={abrirConfirmarRecepcion}
                disabled={bloqueado}
                title="Encargado UMI: confirma recepción física de materiales comprados/solicitados. Estado pasa a En ejecución."
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed border border-amber-700 text-white text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap shadow-sm"
              >
                <Truck className="w-3.5 h-3.5" />
                Confirmar recepción materiales
              </button>
            )}
            {puedeIniciarEjecOValoracion && (
              <>
                <button
                  type="button"
                  onClick={handleIniciarEjecucionDirecta}
                  disabled={bloqueado || !!idValoracionAbierta}
                  title="El alcance es evidente y no requiere inspección previa. Pasa ASIGNADA → EN_PROGRESO inmediatamente."
                  className={[
                    'inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap shadow-sm border',
                    idValoracionAbierta
                      ? 'bg-slate-400 border-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed border-emerald-700',
                  ].join(' ')}
                >
                  {ejecutandoInicioDirecto ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="w-3.5 h-3.5" />
                      Iniciar Ejecución Directa
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (idValoracionAbierta) {
                      setMostrarDetalleValoracion(true);
                    } else {
                      handleIniciarValoracion();
                    }
                  }}
                  disabled={bloqueado}
                  title="Registro de valoración previa en campo: diagnóstico, alcance, tiempos, materiales y evidencia. Si insumos no disponibles → EN_ESPERA_DE_INSUMOS."
                  className={[
                    'inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-white text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap shadow-sm border',
                    idValoracionAbierta
                      ? 'bg-indigo-700 hover:bg-indigo-800 disabled:bg-indigo-400 disabled:cursor-not-allowed border-indigo-800'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed border-blue-700',
                  ].join(' ')}
                >
                  {ejecutandoInicioValoracion ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Iniciando valoración...
                    </>
                  ) : (
                    <>
                      <ClipboarCheckIcon className="w-3.5 h-3.5" />
                      {idValoracionAbierta ? 'Continuar Valoración' : 'Registrar Valoración Previa'}
                    </>
                  )}
                </button>
                {esCategoriaElectricas48 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-bold whitespace-nowrap">
                    <Zap className="w-3.5 h-3.5" />
                    CS_002 Eléctricas · sólo Técnico Especializado
                  </span>
                )}
              </>
            )}
            {puedeCerrarTecnicamente && (
              <button
                type="button"
                onClick={() => setOpenCierre(true)}
                disabled={bloqueado}
                title="Cerrar técnicamente la ejecución: registrar trabajo realizado, costo final y evidencias fotográficas mínimas (1). Estado pasa a COMPLETADA."
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed border border-emerald-700 text-white text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cierre Técnico
              </button>
            )}
            {puedeVerCierreTecnico && (
              <button
                type="button"
                onClick={() => setOpenCierre(true)}
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap"
                title="Ver el resumen de cierre técnico ya ejecutado (modo lectura)."
              >
                <Eye className="w-3.5 h-3.5" />
                Ver cierre técnico
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {detalle && ((detalle.areaResponsableActual || '').toUpperCase() !== 'TI') && !ESTADOS_FINALES_O_BLOQUEADOS.includes(estadoActual) && (
              <button
                type="button"
                onClick={abrirRemitir}
                title="Remitir formalmente la solicitud a la Oficina de Tecnologías (nueva remisión con trazabilidad)"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-blue-50 border border-blue-300 text-blue-800 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                Reenviar a TI
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold transition-all active:scale-[0.98] whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Cerrar detalle
            </button>
          </div>
        </div>

        {mostrarRemitir && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 bg-sky-50/60 rounded-t-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Remitir solicitud a Oficina TI
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md leading-relaxed">
                      Esta acción genera una nueva remisión formal con trazabilidad de Gestión de Calidad, cambia el área responsable actual a Oficina de Tecnologías y marca el tipo de atención como TECNOLÓGICA si no lo estaba.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMostrarRemitir(false); setRemitirError(''); }}
                  disabled={remitirEnviando}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors disabled:opacity-50"
                  aria-label="Cerrar remisión"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {remitirError && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="text-xs font-medium">{remitirError}</div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Motivo de la remisión <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={remitirMotivo}
                    onChange={(e) => setRemitirMotivo(e.target.value)}
                    rows={4}
                    placeholder="Explique por qué se remite esta solicitud a la Oficina de Tecnologías de la Información. Mínimo 10 caracteres."
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-sky-200 focus:border-sky-500 border-slate-200 resize-none"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Mínimo 10 caracteres</span>
                    <span className={remitirMotivo.trim().length >= 10 ? 'text-emerald-600 font-semibold' : ''}>{remitirMotivo.trim().length} caracteres</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Consecutivo cruzado TI
                    <span className="font-normal text-slate-400 normal-case">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={remitirConsecutivo}
                    onChange={(e) => setRemitirConsecutivo(e.target.value)}
                    placeholder="Ej: INC-2024-9821 o número de ticket mesa de ayuda SI"
                    maxLength={100}
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-sky-200 focus:border-sky-500 border-slate-200"
                  />
                  <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                    Número de ticket, incidente o solicitud asignado por la Oficina de TI para dar continuidad cruzada entre sistemas.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => { setMostrarRemitir(false); setRemitirError(''); }}
                  disabled={remitirEnviando}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarRemitir}
                  disabled={remitirEnviando}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-sm shadow-sky-500/20 transition-all disabled:opacity-60 active:scale-[0.98]"
                >
                  {remitirEnviando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Remitiendo...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Confirmar remisión
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarModalRechazar && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border-2 border-rose-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-white rounded-t-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-rose-100">
                    <IconRechazar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Rechazar solicitud de mantenimiento
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md leading-relaxed">
                      <span className="font-bold text-rose-700">RF-INF-005 AC-02:</span> El motivo es <span className="font-black underline">OBLIGATORIO</span> (mínimo 10 caracteres) y será <span className="font-black">VISIBLE para el solicitante</span> en el detalle de la solicitud.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMostrarModalRechazar(false); setErrorRechazo(''); }}
                  disabled={ejecutandoRechazo}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors disabled:opacity-50"
                  aria-label="Cerrar rechazo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {errorRechazo && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="text-xs font-medium leading-5">{errorRechazo}</div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Motivo de rechazo <span className="text-rose-600">*</span>
                    <span className="font-normal text-slate-400 normal-case">(mínimo 10 caracteres)</span>
                  </label>
                  <textarea
                    value={rechazoMotivo}
                    onChange={(e) => setRechazoMotivo(e.target.value)}
                    rows={5}
                    placeholder="Explique detalladamente por qué se rechaza esta solicitud (ej: falta de información, novedad no corresponde al alcance UMI, solicitud duplicada, etc.). Este texto se mostrará al ciudadano/solicitante."
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-rose-200 focus:border-rose-500 border-rose-200 resize-none"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-semibold">Mínimo 10 caracteres · máximo 500</span>
                    <span className={`font-bold ${
                      rechazoMotivo.trim().length === 0
                        ? 'text-slate-400'
                        : rechazoMotivo.trim().length < 10
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}>
                      {rechazoMotivo.trim().length} caracteres
                      {rechazoMotivo.trim().length < 10 ? ` · faltan ${10 - rechazoMotivo.trim().length}` : ' · OK'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Observaciones internas
                    <span className="font-normal text-slate-400 normal-case">(opcional, NO visible solicitante)</span>
                  </label>
                  <textarea
                    value={rechazoObservaciones}
                    onChange={(e) => setRechazoObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Notas internas de gestión para trazabilidad UMI (no se mostrarán al solicitante)."
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-slate-200 focus:border-slate-500 border-slate-200 resize-none"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-5 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Al confirmar: el estado pasará a <strong>RECHAZADA</strong>, se limpiará el responsable asignado y se creará una entrada en <strong>Histórico Asignaciones</strong> con trazabilidad completa de usuario, fecha y roles. Esta acción se puede revertir usando Redistribuir (que vuelve a ASIGNADA).
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => { setMostrarModalRechazar(false); setErrorRechazo(''); }}
                  disabled={ejecutandoRechazo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarRechazoHandler}
                  disabled={ejecutandoRechazo || rechazoMotivo.trim().length < 10}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm shadow-rose-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {ejecutandoRechazo ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
                  ) : (
                    <><ThumbsDown className="w-4 h-4" /> Confirmar rechazo</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarModalRedistribuir && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border-2 border-indigo-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white rounded-t-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-indigo-100">
                    <RedistribuirIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Redistribuir / Reasignar técnico
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md leading-relaxed">
                      <span className="font-bold text-indigo-700">RF-INF-005 AC-01 / D10:</span> Cambia el técnico asignado. Si el estado actual es RECIBIDA o RECHAZADA → automáticamente pasa a <strong>ASIGNADA</strong>. Si ya está ASIGNADA, EN_ANÁLISIS o EN_PROGRESO → mantiene el estado y solo cambia el responsable.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMostrarModalRedistribuir(false); setErrorRedist(''); }}
                  disabled={ejecutandoRedist}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors disabled:opacity-50"
                  aria-label="Cerrar redistribución"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {errorRedist && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="text-xs font-medium leading-5">{errorRedist}</div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Técnico de destino <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={redistTecnicoCodigo}
                      onChange={(e) => setRedistTecnicoCodigo(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-all focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                      disabled={cargandoTecnicos}
                    >
                      <option value="">— Seleccione el técnico a asignar —</option>
                      {(tecnicosCatalogo.length > 0 ? tecnicosCatalogo : []).map((t, i) => (
                        <option key={`${t.codigo || i}`} value={t.codigo}>
                          [{t.codigo}] {t.nombreDisplay || t.nombre} · Carga vigente {t.cargaVigente ?? 0}
                          {Array.isArray(t.metadata?.especialidades) && t.metadata.especialidades.length > 0
                            ? ` (${(t.metadata.especialidades as string[]).join('/')})`
                            : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  {cargandoTecnicos && (
                    <div className="mt-1.5 text-[11px] text-indigo-600 font-semibold flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Cargando catálogo de técnicos…
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Motivo de la redistribución
                    <span className="font-normal text-slate-400 normal-case">(opcional)</span>
                  </label>
                  <textarea
                    value={redistMotivo}
                    onChange={(e) => setRedistMotivo(e.target.value)}
                    rows={3}
                    placeholder="Explique por qué se reasigna (ej: disponibilidad, cambio de turno, capacidad del técnico, especialidad más adecuada, corrección de asignación inicial, etc.)."
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 border-slate-200 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Observaciones internas
                    <span className="font-normal text-slate-400 normal-case">(opcional)</span>
                  </label>
                  <textarea
                    value={redistObservaciones}
                    onChange={(e) => setRedistObservaciones(e.target.value)}
                    rows={2}
                    placeholder="Notas internas para auditoría / trazabilidad."
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-slate-200 focus:border-slate-500 border-slate-200 resize-none"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-indigo-900 text-[11px] leading-5 font-semibold">
                  <RotateCcw className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Se crea una nueva entrada en el Histórico Asignaciones con el cambio de responsable y trazabilidad completa. Si el estado era RECHAZADA → se limpia el motivoRechazo y pasa a ASIGNADA.
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => { setMostrarModalRedistribuir(false); setErrorRedist(''); }}
                  disabled={ejecutandoRedist}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarRedistribucionHandler}
                  disabled={ejecutandoRedist || !redistTecnicoCodigo.trim() || cargandoTecnicos}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm shadow-indigo-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {ejecutandoRedist ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
                  ) : (
                    <><RedistribuirIcon className="w-4 h-4" /> Confirmar redistribución</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* EFDS-1735 RF-INF-006: Modal confirmación recepción materiales       */}
        {/* ------------------------------------------------------------------- */}
        {mostrarModalConfirmarRecepcion && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col">
              <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-100 bg-amber-50/60 rounded-t-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      Confirmar recepción de materiales
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 max-w-md leading-relaxed">
                      <strong>Encargado UMI</strong> confirma la recepción física de todos los materiales y repuestos solicitados en la valoración. El estado pasará automáticamente a <strong>EN_PROGRESO</strong> y el técnico asignado podrá iniciar la ejecución.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setMostrarModalConfirmarRecepcion(false); setErrorRecepcion(''); }}
                  disabled={ejecutandoRecepcion}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 transition-colors disabled:opacity-50"
                  aria-label="Cerrar confirmación recepción"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                {errorRecepcion && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div className="text-xs font-medium">{errorRecepcion}</div>
                  </div>
                )}
                <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 text-indigo-900 text-[11px] leading-5 font-semibold">
                  <RotateCcw className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Se creará una nueva entrada en el Histórico Asignaciones con la acción <strong>RECEPCION_MATERIALES_Y_PASO_A_EJECUCION</strong> para trazabilidad de Gestión de Calidad.
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 tracking-wide inline-flex items-center gap-1.5">
                    Observaciones de recepción
                    <span className="font-normal text-slate-400 normal-case">(opcional)</span>
                  </label>
                  <textarea
                    value={recepcionObservaciones}
                    onChange={(e) => setRecepcionObservaciones(e.target.value)}
                    rows={3}
                    placeholder="Entrega de materiales 4 tubos PVC 1/2, 1 rollo teflón, 1 tubo silicona neutra 280ml. Proveedor Ferretería La 38, remisión #F-02045."
                    className="w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:ring-2 focus:ring-amber-200 focus:border-amber-500 border-slate-200 resize-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => { setMostrarModalConfirmarRecepcion(false); setErrorRecepcion(''); }}
                  disabled={ejecutandoRecepcion}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRecepcion}
                  disabled={ejecutandoRecepcion}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold shadow-sm shadow-amber-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {ejecutandoRecepcion ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</>
                  ) : (
                    <><Truck className="w-4 h-4" /> Confirmar recepción</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        </div>

      </div>

    </div>

      {mostrarDetalleValoracion && detalle && (
        <DetalleValoracionForm
          open={mostrarDetalleValoracion}
          onClose={() => setMostrarDetalleValoracion(false)}
          idSolicitud={idSolicitud || ''}
          idValoracion={idValoracionAbierta || undefined}
          idCategoria={Number.isInteger(detalle.idCategoria) ? (detalle.idCategoria as number) : null}
          onSaved={handleValoracionSaved}
        />
      )}
    </>
  );
};
