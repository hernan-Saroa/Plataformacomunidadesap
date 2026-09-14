import React, { useEffect, useMemo, useState } from 'react';
import {
  X, FileText, Paperclip, Clock, AlertTriangle, Calendar, User,
  Building2, MapPin, Wrench, Download, Image,
  Inbox, Search, FileSearch, ClipboardList, Loader2, Hammer,
  Package, CheckCircle, Archive, Ban, XCircle, ShieldCheck,
  Eye,
} from 'lucide-react';
import {
  SolicitudMantenimiento,
  SolicitudEvidencia,
  CatalogoItem,
  infraestructuraService,
} from '../services/infraestructuraService';

interface DetalleSolicitudModalProps {
  open: boolean;
  idSolicitud: string | null;
  onClose: () => void;
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

export const DetalleSolicitudModal: React.FC<DetalleSolicitudModalProps> = ({
  open,
  idSolicitud,
  onClose,
}) => {
  const [detalle, setDetalle] = useState<SolicitudMantenimiento | null>(null);
  const [evidenciasEndpoint, setEvidenciasEndpoint] = useState<SolicitudEvidencia[]>([]);
  const [cargando, setCargando] = useState(false);
  const [catalogoEstado, setCatalogoEstado] = useState<CatalogoItem[]>([]);
  const [catalogoPrioridad, setCatalogoPrioridad] = useState<CatalogoItem[]>([]);

  useEffect(() => {
    let cancelado = false;
    if (!open || !idSolicitud) {
      setDetalle(null);
      setEvidenciasEndpoint([]);
      setCargando(false);
      return;
    }
    const cargar = async () => {
      setCargando(true);
      setDetalle(null);
      setEvidenciasEndpoint([]);
      try {
        const [d, evs, est, pri] = await Promise.all([
          infraestructuraService.getMantenimientoById(idSolicitud),
          infraestructuraService.getEvidenciasBySolicitud(idSolicitud),
          infraestructuraService.getCatalogo('ESTADO_SOLICITUD'),
          infraestructuraService.getCatalogo('PRIORIDAD'),
        ]);
        if (cancelado) return;
        setDetalle(d);
        setEvidenciasEndpoint(Array.isArray(evs) ? evs : []);
        setCatalogoEstado(est);
        setCatalogoPrioridad(pri);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [open, idSolicitud]);

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

  const evidenciasFinales = useMemo<SolicitudEvidencia[]>(() => {
    return dedupeEvidencias([evidenciasEndpoint, detalle?.evidencias || []]);
  }, [evidenciasEndpoint, detalle]);

  const claseEstado = (estado: string): string => {
    const it = mapEstado.get((estado || '').toUpperCase());
    return it?.metadata?.color || FALLBACK_CLASE_ESTADO;
  };

  const clasePrioridad = (prioridad: string): string => {
    const it = mapPrioridad.get((prioridad || '').toUpperCase());
    return it?.metadata?.color || FALLBACK_CLASE_PRIORIDAD;
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

  const renderEvidencias = () => {
    if (cargando) {
      return (
        <div className="flex items-center justify-center py-10 text-slate-400 text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando evidencias adjuntas...
        </div>
      );
    }
    if (!evidenciasFinales || evidenciasFinales.length === 0) {
      return (
        <div className="text-xs text-slate-500 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          No hay evidencias adjuntas registradas para esta solicitud
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {evidenciasFinales.map((e) => {
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
        })}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de solicitud de mantenimiento"
      >
        <div className="px-6 sm:px-8 py-5 border-b border-slate-200 bg-white flex items-start gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-xs bg-slate-900 text-white px-3 py-1 rounded-lg shadow-sm">
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
                <span className="inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Atención {detalle.tipoAtencion}
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
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
