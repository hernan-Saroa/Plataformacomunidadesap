import React from 'react';
import { Calculator, Users, Shield, ChevronDown, Calendar } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

export function TabGenerales({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const renderDateRow = (key: keyof PTARules, label: string, helper: string) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors shadow-sm group gap-4">
      <div className="flex-1">
        <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">{label}</h4>
        <p className="text-[11px] text-slate-500 leading-tight">{helper}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={draft[key] as string}
          onChange={(e) => handleChange(key, e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
      </div>
    </div>
  );

  const renderInputRow = (key: keyof PTARules, label: string, helper: string, isPct: boolean = false, unit: string = "") => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors shadow-sm group gap-4">
      <div className="flex-1">
        <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">{label}</h4>
        <p className="text-[11px] text-slate-500 leading-tight">{helper}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={draft[key] as number}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-24 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        {(isPct || unit) && (
          <span className="text-xs font-bold text-slate-400 min-w-[24px] text-left">{isPct ? '%' : unit}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* PARTE 1: GENERAL */}
      <section>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" /> 1. Condiciones Generales y Horas Base
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Asignación nominal de horas según tipo de vinculación y topes porcentuales máximos para evitar sobreasignación sobre la bolsa total.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Vinculados */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-emerald-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">A</span>
                Docentes Vinculados (Carrera) - TC y MT
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-emerald-50/10">
              {renderInputRow("horas_base_carrera_009", "Normativa Acuerdo 009 de 2004", "Horas base consolidadas.", false, "h")}
              {renderInputRow("horas_base_carrera_003", "Normativa Acuerdo 003 de 2018", "Horas base consolidadas.", false, "h")}
            </div>
          </details>

          {/* No Vinculados */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-amber-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">B</span>
                No Vinculados (Ocasionales y Visitantes)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-amber-50/10">
              {renderInputRow("horas_semanales_tc", "Dedicación Tiempo Completo", "Por semana de vinculación.", false, "h/sem")}
              {renderInputRow("horas_semanales_mt", "Dedicación Medio Tiempo", "Por semana de vinculación.", false, "h/sem")}
              {renderInputRow("semanas_periodo_academico", "Semanas del Período Académico", "Circular §2: base de proporcionalidad (20 sem × 40h = 800h PTA).", false, "sem")}
            </div>
          </details>

          {/* Topes / SLAs temporales */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">C</span>
                Topes Globales (Módulo Reglas)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col md:grid md:grid-cols-2 lg:grid-cols-2 gap-3 bg-blue-50/10">
              {renderInputRow("dias_cierre_concertacion", "Plazo Concertación", "Días para que docentes sometan su PTA después del inicio de clases.", false, "días")}
              {renderInputRow("dias_verificacion_posterior", "Plazo Jefaturas Regionales", "Días hábiles después de inicio para dar feedback al docente.", false, "días")}
              {renderInputRow("plazo_consolidacion_semanas", "Plazo Consolidación Nacional", "Circular §5: 'dentro de las 4 semanas siguientes al inicio de clases'.", false, "sem")}
            </div>
          </details>



        </div>
      </section>
    </div>
  );
}
