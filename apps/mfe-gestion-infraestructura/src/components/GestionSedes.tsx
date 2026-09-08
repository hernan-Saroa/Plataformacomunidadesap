import React from 'react';
import { Building, MapPin, Phone, Mail, Plus, ExternalLink } from 'lucide-react';
import { Sede } from '../services/infraestructuraService';

interface GestionSedesProps {
  sedes: Sede[];
}

export const GestionSedes: React.FC<GestionSedesProps> = ({ sedes }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            Sedes Territoriales y Edificios
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Red de sedes centrales, territoriales y CETAP de la ESAP a nivel nacional
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition-all duration-200 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Nueva Sede
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sedes.map((sede) => (
          <div
            key={sede.idSede}
            className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  {sede.tipo}
                </span>
                <span className="text-xs font-mono font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {sede.codigo}
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-800 mb-2 leading-tight">
                {sede.nombre}
              </h4>

              <div className="space-y-2 text-xs text-slate-600 mt-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{sede.direccion}, {sede.municipio}</span>
                </div>
                {sede.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{sede.telefono}</span>
                  </div>
                )}
                {sede.emailContacto && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{sede.emailContacto}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sede Activa
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                Ver Bloques
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
