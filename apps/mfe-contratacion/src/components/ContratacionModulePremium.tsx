import React, { useState, useEffect } from 'react';
import { FileText, ShieldCheck, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';
import { contratacionService, HiringStatusResponse } from '../services/contratacionService';

export default function ContratacionModulePremium() {
  const [statusInfo, setStatusInfo] = useState<HiringStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contratacionService.getStatus().then((data) => {
      setStatusInfo(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 text-slate-800 font-sans p-2 md:p-4">
      {/* Header Banner Base */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002868] via-[#003DA5] to-[#00A3E0] p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium mb-3 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Microfrontend Base ESAP
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Módulo de Contratación (mfe-contratacion)</h1>
            <p className="text-sm mt-1 max-w-2xl">
              Estructura base del módulo de contratación conectada al microservicio <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">hiring-service</code> y al esquema <code className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs">hiring</code>.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-xl text-xs border border-white/20">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="font-semibold">Estado: Base Lista</span>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Cards informativo base */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Microservicio Backend</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-[#003DA5]">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">hiring-service</p>
          <span className="text-xs text-slate-500 mt-1 block">Puerto 3012 • NestJS</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Esquema Base PostgreSQL</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">hiring</p>
          <span className="text-xs text-slate-500 mt-1 block">db/migrations/hiring</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Microfrontend Dev Port</span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <p className="text-lg font-bold text-slate-900 mt-2">mfe-contratacion</p>
          <span className="text-xs text-slate-500 mt-1 block">Puerto 3114 • Vite + React</span>
        </div>
      </div>

      {/* Contenido Base */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#003DA5]" />
          Estado de la Conexión Base
        </h2>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-700 space-y-1">
          <p><span className="font-semibold text-slate-900">Respuesta:</span> {loading ? 'Cargando...' : JSON.stringify(statusInfo, null, 2)}</p>
        </div>
      </div>
    </div>
  );
}
