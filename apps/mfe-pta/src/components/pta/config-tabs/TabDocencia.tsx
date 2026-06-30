import React from 'react';
import { BookOpen, Calculator, ChevronDown } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

export function TabDocencia({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  
  const mult = draft.criterio_multiplicador_docencia || 0;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" /> 2. Académica / Docencia
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Configuración de asignación obligatoria de carga académica (Circular 003). Modulación de horas base y multiplicadores.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          
          {/* Restricciones Formales Universales */}
          <details className="group border border-white/80 rounded-3xl bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 bg-slate-50/50 group-open:bg-blue-50/30 hover:bg-white transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">A</span>
                Restricciones Formales Universales
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            
            <div className="p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative group bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <label className="block text-[11px] font-black text-slate-700 tracking-wider mb-2 uppercase">
                  1. Mínimo Créditos Asignar
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative w-full">
                    <input
                      type="number"
                      value={draft.min_creditos_docencia as number}
                      onChange={(e) => handleChange("min_creditos_docencia", parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-bold rounded-lg px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                    />
                    <div className="absolute right-3 top-3 text-slate-400 font-bold text-sm">Cr.</div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Docentes TC/MT deben orientar al menos una asignatura de este peso.
                  </p>
                </div>
              </div>

              <div className="relative group bg-blue-50/50 border border-blue-100 p-4 rounded-2xl shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]">
                <label className="block text-[11px] font-black text-blue-800 tracking-wider mb-2 uppercase flex items-center gap-1">
                  <Calculator className="w-3 h-3" /> 2. Criterio Multiplicador
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative w-full">
                    <input
                      type="number"
                      step="0.1"
                      value={draft.criterio_multiplicador_docencia as number}
                      onChange={(e) => handleChange("criterio_multiplicador_docencia", parseFloat(e.target.value))}
                      className="w-full bg-white border border-blue-200 text-blue-900 font-black rounded-lg px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm"
                    />
                    <div className="absolute right-3 top-3 text-blue-400 font-bold text-sm">x</div>
                  </div>
                  <p className="text-[10px] text-blue-600/80 leading-tight">
                    Multiplica cada hora base para reconocer preparación de clases y apoyo.
                  </p>
                </div>
              </div>

              <div className="relative group bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <label className="block text-[11px] font-black text-slate-700 tracking-wider mb-2 uppercase">
                  3. Mín. Docencia No Vinculados
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative w-full">
                    <input
                      type="number"
                      value={draft.min_pct_docencia_no_vinculados as number}
                      onChange={(e) => handleChange("min_pct_docencia_no_vinculados", parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-200 text-slate-800 font-bold rounded-lg px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                    />
                    <div className="absolute right-3 top-3 text-slate-400 font-bold text-sm">%</div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Porcentaje de obligatoriedad (Ocasionales/Especiales).
                  </p>
                </div>
              </div>
            </div>
          </details>


          {/* Horas Base por Categoría — Tabla 1 Circular 003/2025 */}
          <details className="group border border-white/80 rounded-3xl bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 bg-slate-50/50 group-open:bg-blue-50/30 hover:bg-white transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">B</span>
                Horas Base por Categoría de Programa (Tabla 1)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-6 border-t border-slate-100 bg-slate-50/30">
              <p className="text-[11px] text-slate-500 leading-tight mb-5 max-w-3xl">
                Horas base definidas en la Tabla 1 de la Circular 003/2025 para cada categoría de programa.
                Los <b>bloques fijos</b> (Seminario, Pregrado SC) se asignan completos independiente del N° de créditos.
                Las <b>bases por crédito</b> (APT, Especialización, Maestría) se multiplican por los créditos de la asignatura × multiplicador.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {([
                  ['docencia_base_seminario_sc', 'Seminario de Énfasis (Sede Central)', 'Bloque fijo', 'h'],
                  ['docencia_base_pregrado_sc', 'Pregrado Sede Central (AP/EP)', 'Bloque fijo', 'h'],
                  ['docencia_base_maestria', 'Maestría', 'Base por crédito', 'h/Cr'],
                  ['docencia_base_especializacion', 'Especialización', 'Base por crédito', 'h/Cr'],
                  ['docencia_base_apt', 'APT / Territorial / Otros', 'Base por crédito', 'h/Cr'],
                ] as [keyof PTARules, string, string, string][]).map(([key, label, tipo, unidad]) => (
                  <div key={key as string} className="relative group bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                    <label className="block text-[11px] font-black text-slate-700 tracking-wider mb-1 uppercase leading-tight">
                      {label}
                    </label>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-blue-600">{tipo}</span>
                    <div className="relative w-full mt-2">
                      <input
                        type="number"
                        min="0"
                        value={draft[key] as number}
                        onChange={(e) => handleChange(key, parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-4 py-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                      />
                      <div className="absolute right-3 top-3 text-slate-400 font-bold text-xs">{unidad}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

        </div>
      </section>
    </div>
  );
}
