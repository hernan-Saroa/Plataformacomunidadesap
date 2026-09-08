import React from 'react';
import { Wrench, Clock, AlertTriangle, CheckCircle, Plus } from 'lucide-react';
import { SolicitudMantenimiento } from '../services/infraestructuraService';

interface SolicitudesMantenimientoProps {
  mantenimientos: SolicitudMantenimiento[];
}

export const SolicitudesMantenimientoView: React.FC<SolicitudesMantenimientoProps> = ({ mantenimientos }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-600" />
            Solicitudes y Órdenes de Mantenimiento
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Seguimiento de intervenciones preventivas, correctivas y locativas
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-sm transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva Solicitud
        </button>
      </div>

      <div className="p-6 space-y-4">
        {mantenimientos.map((m) => (
          <div
            key={m.idSolicitud}
            className="p-5 rounded-xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-xs bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded">
                  {m.consecutivo}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    m.prioridad === 'ALTA' || m.prioridad === 'URGENTE'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Prioridad {m.prioridad}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {m.tipoMantenimiento}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {m.descripcion}
              </h4>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span>Solicitado por: <strong className="text-slate-700">{m.solicitanteNombre}</strong></span>
                {m.responsableAsignado && (
                  <span>Responsable: <strong className="text-slate-700">{m.responsableAsignado}</strong></span>
                )}
                {m.fechaProgramada && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Clock className="w-3.5 h-3.5" />
                    Prog: {m.fechaProgramada}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end md:self-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  m.estado === 'EN_PROCESO'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : m.estado === 'COMPLETADO'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {m.estado === 'COMPLETADO' ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {m.estado}
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
