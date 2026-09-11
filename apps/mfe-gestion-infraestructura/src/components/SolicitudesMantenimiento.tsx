import React from 'react';
import { Wrench, Clock, AlertTriangle, CheckCircle, Plus, ListTodo, FolderKanban } from 'lucide-react';
import { SolicitudMantenimiento } from '../services/infraestructuraService';

interface SolicitudesMantenimientoProps {
  mantenimientos: SolicitudMantenimiento[];
  misSolicitudes: SolicitudMantenimiento[];
  vista: 'todas' | 'mias';
  onChangeVista: (vista: 'todas' | 'mias') => void;
  onNuevaSolicitud: () => void;
  loading?: boolean;
}

const claseEstado = (estado: string): string => {
  const s = (estado || '').toUpperCase();
  if (s === 'RECIBIDA') return 'bg-sky-100 text-sky-800 border border-sky-200';
  if (s === 'EN_PROCESO' || s === 'EN_ANALISIS' || s === 'EN_VALORACION' || s === 'EN_EJECUCION') {
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  }
  if (s === 'COMPLETADO' || s.startsWith('CERRADA')) return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  if (s === 'RECHAZADA') return 'bg-rose-100 text-rose-800 border border-rose-200';
  if (s.startsWith('PENDIENTE')) return 'bg-violet-100 text-violet-800 border border-violet-200';
  return 'bg-slate-100 text-slate-800 border border-slate-200';
};

const iconoEstado = (estado: string, size: number = 3.5 * 4) => {
  const s = (estado || '').toUpperCase();
  if (s === 'COMPLETADO' || s.startsWith('CERRADA')) return <CheckCircle style={{ width: size, height: size }} />;
  return <Clock style={{ width: size, height: size }} />;
};

export const SolicitudesMantenimientoView: React.FC<SolicitudesMantenimientoProps> = ({
  mantenimientos,
  misSolicitudes,
  vista,
  onChangeVista,
  onNuevaSolicitud,
  loading,
}) => {
  const lista = vista === 'todas' ? mantenimientos : misSolicitudes;

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
          <button
            type="button"
            onClick={onNuevaSolicitud}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm shadow-amber-500/15 transition-all duration-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </button>
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

        {lista.map((m) => (
          <div
            key={m.idSolicitud}
            className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1 w-full">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-bold text-xs bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded">
                  {m.consecutivo}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    m.prioridad === 'ALTA' || m.prioridad === 'URGENTE'
                      ? 'bg-rose-100 text-rose-700'
                      : m.prioridad === 'MEDIA'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Prioridad {m.prioridad || 'MEDIA'}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {m.tipoMantenimiento}
                </span>
                {m.tipoAtencion && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Atención {m.tipoAtencion}
                  </span>
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
                    {m.fechaProgramada ? `Prog: ${m.fechaProgramada}` : `Rad: ${new Date(m.fechaRadicacion || m.createdAt).toLocaleDateString()}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto justify-end">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${claseEstado(m.estado)}`}
              >
                {iconoEstado(m.estado, 14)}
                {m.estado || 'RECIBIDA'}
              </span>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                Gestionar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
