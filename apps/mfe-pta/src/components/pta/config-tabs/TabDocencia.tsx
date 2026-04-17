import React, { useState } from 'react';
import { BookOpen, AlertCircle, Library, Calculator, Settings2, ChevronDown } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

export function TabDocencia({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  
  const mult = draft.criterio_multiplicador_docencia || 0;

  // Local state for interactive simulators
  const [simCrAPT, setSimCrAPT] = useState<number>(3);
  const [simCrEsp, setSimCrEsp] = useState<number>(2);
  const [simCrMst, setSimCrMst] = useState<number>(4);

  const renderSimulador = (
    titulo: string,
    desc: string,
    esVariable: boolean,
    valorBase: number,
    cambioBase: (v: number) => void,
    valorCreditos?: number,
    cambioCreditos?: (v: number) => void
  ) => {
    const total = esVariable ? (valorCreditos! * valorBase * mult) : (valorBase * mult);
    return (
      <details className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors shadow-sm [&::-webkit-details-marker]:hidden" open={!esVariable}>
        <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 group-open:bg-blue-50/20">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-bold text-slate-800 leading-tight">{titulo}</h4>
              {esVariable && <span className="text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">Variable por Crédito</span>}
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">{desc}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg shadow-sm">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Resultado:</span>
              <span className="text-sm font-black text-blue-600">{total}h</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm group-hover:bg-slate-50 transition-colors">
              <ChevronDown className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" />
            </div>
          </div>
        </summary>
        
        <div className="p-5 border-t border-slate-100 bg-white">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            {esVariable && (
              <>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Settings2 className="w-3 h-3"/> Simulador Cr.</span>
                  <input type="number" min="0" value={valorCreditos} onChange={(e) => cambioCreditos!(parseInt(e.target.value) || 0)} className="w-24 bg-white border border-slate-300 text-slate-800 font-bold rounded-lg px-3 py-2.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm transition-all" />
                </div>
                <div className="text-slate-300 font-black text-lg">×</div>
              </>
            )}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-2">{esVariable ? 'Base h/Cr.' : 'Base (Bloque)'}</span>
              <input type="number" min="0" value={valorBase || 0} onChange={(e) => cambioBase(parseInt(e.target.value) || 0)} className="w-24 bg-white border border-slate-300 text-slate-800 font-bold rounded-lg px-3 py-2.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none shadow-sm transition-all" />
            </div>
            <div className="text-slate-300 font-black text-lg">×</div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1"><Calculator className="w-3 h-3"/> Multiplicador</span>
              <div className="w-24 bg-slate-100 border border-slate-200 text-slate-500 font-bold rounded-lg px-3 py-2.5 text-center shadow-inner cursor-not-allowed">
                {mult}
              </div>
            </div>
            <div className="text-slate-300 font-black text-lg">=</div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-blue-600 uppercase mb-2">Total Asignar</span>
              <div className="w-28 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 text-white font-black rounded-lg px-3 py-2.5 text-center shadow-lg shadow-blue-500/25">
                {total}h
              </div>
            </div>
          </div>
        </div>
      </details>
    );
  };

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

          {/* Matriz Paramétrica por Programa */}
          <details className="group border border-white/80 rounded-3xl bg-white/80 backdrop-blur-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-5 bg-slate-50/50 group-open:bg-blue-50/30 hover:bg-white transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">B</span>
                Matriz Paramétrica por Programa (Tablas 1 y 2)
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] hidden sm:flex items-center gap-1.5 font-bold text-blue-700 bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg shadow-sm">
                  <Settings2 className="w-3.5 h-3.5" /> Simulador Multiplicador Activo
                </span>
                <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
              </div>
            </summary>
            
            <div className="p-6 border-t border-slate-100 flex flex-col gap-4 bg-slate-50/30">
              {renderSimulador(
                "Pregrados Sede Central (AP / EP)", 
                "Asignación referencial sin escalamiento predefinido por el sistema, base plana.", 
                false, 
                draft.docencia_base_pregrado_sc || 0,
                (v) => handleChange("docencia_base_pregrado_sc", v)
              )}
              {renderSimulador(
                "Seminario Sede Central", 
                "Asignación referencial sin escalamiento predefinido por el sistema, base plana.", 
                false, 
                draft.docencia_base_seminario_sc || 0,
                (v) => handleChange("docencia_base_seminario_sc", v)
              )}
              {renderSimulador(
                "Pregrado Territorial (APT Nacional)", 
                "Fórmula escalada por cada crédito otorgado en la malla curricular institucional.", 
                true, 
                draft.docencia_base_apt || 0,
                (v) => handleChange("docencia_base_apt", v),
                simCrAPT,
                setSimCrAPT
              )}
              {renderSimulador(
                "Posgrados: Especializaciones", 
                "Fórmula escalada por cada crédito otorgado en la malla curricular institucional.", 
                true, 
                draft.docencia_base_especializacion || 0,
                (v) => handleChange("docencia_base_especializacion", v),
                simCrEsp,
                setSimCrEsp
              )}
              {renderSimulador(
                "Posgrados: Maestrías", 
                "Fórmula escalada por cada crédito otorgado en la malla curricular institucional.", 
                true, 
                draft.docencia_base_maestria || 0,
                (v) => handleChange("docencia_base_maestria", v),
                simCrMst,
                setSimCrMst
              )}
            </div>
          </details>

        </div>
      </section>
    </div>
  );
}
