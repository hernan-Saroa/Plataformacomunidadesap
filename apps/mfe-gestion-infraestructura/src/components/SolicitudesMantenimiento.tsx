import React, { useEffect, useMemo, useState } from 'react';
import {
  Wrench, Clock, AlertTriangle, Plus, ListTodo, FolderKanban,
  Inbox, Search, FileSearch, ClipboardList, Loader2, Hammer,
  Package, CheckCircle, Archive, Ban, XCircle, ChevronDown,
  ChevronUp, Paperclip, FileText, Image, Download,
  ShieldCheck, Home, Siren, MapPin, Monitor, GitBranch,
} from 'lucide-react';
import {
  SolicitudMantenimiento,
  SolicitudEvidencia,
  CatalogoItem,
  infraestructuraService,
} from '../services/infraestructuraService';

interface SolicitudesMantenimientoProps {
  mantenimientos: SolicitudMantenimiento[];
  misSolicitudes: SolicitudMantenimiento[];
  vista: 'todas' | 'mias';
  onChangeVista: (vista: 'todas' | 'mias') => void;
  onNuevaSolicitud: () => void;
  onGestionar?: (idSolicitud: string) => void;
  loading?: boolean;
  onRefresh?: () => void;
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
  'home': Home,
  'siren': Siren,
  'map-pin': MapPin,
  'monitor': Monitor,
  'git-branch': GitBranch,
  'clock': Clock,
  'alert-triangle': AlertTriangle,
};

const formatearTamano = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const FALLBACK_CLASE_ESTADO = 'bg-slate-100 text-slate-800 border border-slate-200';
const FALLBACK_CLASE_PRIORIDAD = 'bg-slate-100 text-slate-700 border border-slate-200';

export const SolicitudesMantenimientoView: React.FC<SolicitudesMantenimientoProps> = ({
  mantenimientos,
  misSolicitudes,
  vista,
  onChangeVista,
  onNuevaSolicitud,
  onGestionar,
  loading,
  onRefresh,
}) => {
  const lista = vista === 'todas' ? mantenimientos : misSolicitudes;
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [catalogoEstado, setCatalogoEstado] = useState<CatalogoItem[]>([]);
  const [catalogoPrioridad, setCatalogoPrioridad] = useState<CatalogoItem[]>([]);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      const [estados, prioridades] = await Promise.all([
        infraestructuraService.getCatalogo('ESTADO_SOLICITUD'),
        infraestructuraService.getCatalogo('PRIORIDAD'),
      ]);
      if (cancelado) return;
      setCatalogoEstado(estados);
      setCatalogoPrioridad(prioridades);
    };
    cargar();
    return () => { cancelado = true; };
  }, []);

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

  const claseEstado = (estado: string): string => {
    const it = mapEstado.get((estado || '').toUpperCase());
    return it?.metadata?.color || FALLBACK_CLASE_ESTADO;
  };

  const clasePrioridad = (prioridad: string): string => {
    const it = mapPrioridad.get((prioridad || '').toUpperCase());
    return it?.metadata?.color || FALLBACK_CLASE_PRIORIDAD;
  };

  const renderIcono = (iconName?: string, size: number = 14, fallbackKey?: string) => {
    const key = (iconName || fallbackKey || 'clock').toLowerCase();
    const Comp = LUCIDE_ICON_MAP[key] || Clock;
    return <Comp style={{ width: size, height: size }} />;
  };

  const iconoEstado = (estado: string, size: number = 14) => {
    const it = mapEstado.get((estado || '').toUpperCase());
    return renderIcono(it?.metadata?.icon, size, 'clock');
  };

  const toggleExpandir = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderEvidencias = (evidencias: SolicitudEvidencia[] | undefined) => {
    if (!evidencias || evidencias.length === 0) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
        {evidencias.map((e) => {
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
                className="group relative block rounded-lg overflow-hidden border border-slate-200 bg-slate-50 aspect-square hover:ring-2 hover:ring-amber-400/60 transition-all"
                title={e.nombreOriginal}
              >
                <img
                  src={url}
                  alt={e.nombreOriginal}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-semibold truncate">
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
              className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-amber-300 transition-all text-center"
              title={e.nombreOriginal}
            >
              <IconComp className={`w-8 h-8 ${esPdf ? 'text-rose-500' : 'text-slate-500'}`} />
              <div className="text-[10px] font-semibold text-slate-700 line-clamp-2 leading-tight w-full break-words">
                {e.nombreOriginal}
              </div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <Download className="w-2.5 h-2.5" />
                {formatearTamano(e.tamanoBytes)}
              </div>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" />
              Solicitudes y Órdenes de Mantenimiento
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Seguimiento de intervenciones preventivas, correctivas y locativas — Unidad de Mantenimiento e Infraestructura
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
              >
                <Loader2 className="w-3.5 h-3.5" />
                Actualizar
              </button>
            )}
            <button
              type="button"
              onClick={onNuevaSolicitud}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm shadow-amber-500/15 transition-all duration-200 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-100 pb-px">
          <button
            type="button"
            onClick={() => onChangeVista('todas')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
              vista === 'todas'
                ? 'border-amber-600 text-amber-700 bg-amber-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            Bandeja UMI
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {mantenimientos.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onChangeVista('mias')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 ${
              vista === 'mias'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Mis Solicitudes
            <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700">
              {misSolicitudes.length}
            </span>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {loading && lista.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">Cargando solicitudes...</div>
        )}
        {!loading && lista.length === 0 && (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center text-slate-400">
              <ListTodo className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {vista === 'mias'
                  ? 'Aún no has radicado solicitudes de mantenimiento'
                  : 'No hay solicitudes de mantenimiento registradas'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {vista === 'mias'
                  ? 'Radique una nueva solicitud para dar seguimiento a novedades de infraestructura'
                  : 'Puede que la bandeja general esté vacía o no cuente con permiso para ver todas'}
              </p>
            </div>
            {vista === 'mias' && (
              <button
                type="button"
                onClick={onNuevaSolicitud}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-95 mt-2"
              >
                <Plus className="w-4 h-4" />
                Radicar primera solicitud
              </button>
            )}
          </div>
        )}

        {lista.map((m) => {
          const numEvidencias = (m.evidencias && m.evidencias.length) || 0;
          const expandido = !!expandidos[m.idSolicitud];
          return (
            <div
              key={m.idSolicitud}
              className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col gap-4"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
                <div className="space-y-1.5 flex-1 w-full">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono font-bold text-xs bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded">
                      {m.consecutivo}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${clasePrioridad(m.prioridad || 'MEDIA')}`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Prioridad {m.prioridad || 'MEDIA'}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {m.tipoMantenimiento}
                    </span>
                    {m.tipoAtencion && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                        Atención {m.tipoAtencion}
                      </span>
                    )}
                    {numEvidencias > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleExpandir(m.idSolicitud)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all ${
                          expandido
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200'
                        }`}
                      >
                        <Paperclip className="w-3 h-3" />
                        {numEvidencias} adjunto{numEvidencias === 1 ? '' : 's'}
                        {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {m.descripcion}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1">
                      <strong className="text-slate-700">{m.solicitanteNombre}</strong>
                    </span>
                    {m.nombreAreaSolicitante && (
                      <span>Área: <strong className="text-slate-700">{m.nombreAreaSolicitante}</strong></span>
                    )}
                    {m.sede?.nombre && (
                      <span>Sede: <strong className="text-slate-700">{m.sede.nombre}</strong></span>
                    )}
                    {(m.piso || m.salon) && (
                      <span>
                        Ubicación:{' '}
                        <strong className="text-slate-700">
                          {[m.piso && `Piso ${m.piso}`, m.salon].filter(Boolean).join(', ')}
                        </strong>
                      </span>
                    )}
                    {m.responsableAsignado && (
                      <span>Responsable: <strong className="text-slate-700">{m.responsableAsignado}</strong></span>
                    )}
                    {(m.fechaProgramada || m.fechaRadicacion) && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5" />
                        {m.fechaProgramada
                          ? `Prog: ${m.fechaProgramada}`
                          : `Rad: ${new Date(m.fechaRadicacion || m.createdAt).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto justify-end">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${claseEstado(m.estado)}`}
                  >
                    {iconoEstado(m.estado, 14)}
                    {m.estado || 'RECIBIDA'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onGestionar?.(m.idSolicitud)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 ${
                      onGestionar
                        ? 'border-slate-200 hover:bg-slate-100 hover:border-amber-300 hover:text-amber-800 text-slate-700'
                        : 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                    }`}
                    disabled={!onGestionar}
                  >
                    Gestionar
                  </button>
                </div>
              </div>
              {expandido && numEvidencias > 0 && (
                <div className="border-t border-slate-200/60 pt-3 mt-0">
                  {renderEvidencias(m.evidencias)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
