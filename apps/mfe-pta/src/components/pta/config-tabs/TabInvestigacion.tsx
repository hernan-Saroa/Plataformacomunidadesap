import React from 'react';
import { Search, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

type Rol = PTARules['inv_roles'][number];
type Actividad = PTARules['inv_actividades'][number];

export function TabInvestigacion({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
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
          className="w-24 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-purple-500/20 outline-none"
        />
        {(isPct || unit) && (
          <span className="text-xs font-bold text-slate-400 min-w-[24px] text-left">{isPct ? '%' : unit}</span>
        )}
      </div>
    </div>
  );

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const roles: Rol[] = draft.inv_roles || [];
  const actividades: Actividad[] = draft.inv_actividades || [];

  const updateRol = (idx: number, field: keyof Rol, val: any) => {
    const next = roles.map((r, i) => i === idx ? { ...r, [field]: field === 'nombre' ? val : Number(val) } : r);
    handleChange('inv_roles', next);
  };
  const addRol = () => handleChange('inv_roles', [...roles, { id: `ROL_${Date.now()}`, nombre: '', horas_max: 0, pct_max: 0 }]);
  const removeRol = (idx: number) => handleChange('inv_roles', roles.filter((_, i) => i !== idx));

  const updateAct = (idx: number, field: keyof Actividad, val: any) => {
    const next = actividades.map((a, i) => i === idx ? { ...a, [field]: field === 'nombre' ? val : Number(val) } : a);
    handleChange('inv_actividades', next);
  };
  const addAct = () => handleChange('inv_actividades', [...actividades, { id: `INV_${Date.now()}`, nombre: '', horas_max: 0 }]);
  const removeAct = (idx: number) => handleChange('inv_actividades', actividades.filter((_, i) => i !== idx));

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" /> 4. Gestión de Investigación
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Roles y actividades de investigación configurables — avalados por la SNI. Los cambios se reflejan en el formulario PTA del docente.
          </p>
        </div>

        <div className="space-y-4">

          {/* ── SECCIÓN 1: Roles de Investigación (CRUD) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Roles en Proyectos de Investigación
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">{roles.length} ROLES</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-blue-50/10">
              {roles.map((rol, idx) => (
                <div key={rol.id} className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-colors shadow-sm group gap-4">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={rol.nombre}
                      onChange={e => updateRol(idx, 'nombre', e.target.value)}
                      placeholder="Nombre del rol..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-2 flex-grow focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full xl:w-auto xl:justify-end">
                    <div className="flex items-center gap-2 bg-slate-50 px-2 flex-shrink-0 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Horas:</span>
                      <input
                        type="number"
                        value={rol.horas_max}
                        onChange={e => updateRol(idx, 'horas_max', e.target.value)}
                        className="w-16 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold pr-1 border-r border-slate-200 mr-1">h</span>
                      
                      <span className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tope:</span>
                      <input
                        type="number"
                        value={rol.pct_max}
                        onChange={e => updateRol(idx, 'pct_max', e.target.value)}
                        className="w-16 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">%</span>
                    </div>
                    <button onClick={() => removeRol(idx)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 flex shrink-0 items-center justify-center transition-all shadow-sm">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={addRol}
                className="flex items-center justify-center gap-2 px-4 py-3 mt-1 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600 font-bold text-[13px] hover:bg-blue-50 hover:border-blue-300 transition-colors w-full">
                <Plus className="w-4 h-4" /> AGREGAR ROL
              </button>
            </div>
          </details>

          {/* ── SECCIÓN 2: Actividades de Investigación (CRUD) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-amber-50/40 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">2</span>
                Actividades del Grupo de Investigación
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">{actividades.length} ACTIVIDADES</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-amber-50/10">
              {actividades.map((act, idx) => (
                <div key={act.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-amber-200 transition-colors shadow-sm group gap-4">
                  <div className="flex-1 w-full">
                    <input
                      type="text"
                      value={act.nombre}
                      onChange={e => updateAct(idx, 'nombre', e.target.value)}
                      placeholder="Nombre de la actividad..."
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Horas Máx:</span>
                      <input
                        type="number"
                        value={act.horas_max}
                        onChange={e => updateAct(idx, 'horas_max', e.target.value)}
                        className="w-16 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                      <span className="text-xs text-slate-400 font-bold">h</span>
                    </div>
                    <button onClick={() => removeAct(idx)}
                      className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button onClick={addAct}
                className="flex items-center justify-center gap-2 px-4 py-3 mt-1 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 text-amber-600 font-bold text-[13px] hover:bg-amber-50 hover:border-amber-300 transition-colors w-full">
                <Plus className="w-4 h-4" /> AGREGAR ACTIVIDAD
              </button>
            </div>
          </details>

          {/* ── SECCIÓN 3: Parámetros numéricos de fomento (existentes) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-purple-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">3</span>
                Parámetros Numéricos Globales (Tablas 3-4)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            
            <div className="p-4 border-t border-slate-100 flex flex-col md:grid md:grid-cols-2 gap-3 bg-purple-50/10">
              {renderInputRow("max_horas_inv_lider", "Líder — Horas Máximas", "Límite absoluto Inv. Líder.", false, "h")}
              {renderInputRow("max_pct_inv_lider", "Líder — Tope %", "Tope porcentual Inv. Líder.", true)}
              {renderInputRow("max_horas_inv_coinvestigador", "Coinvestigador — Horas", "Límite absoluto Coinvestigador.", false, "h")}
              {renderInputRow("max_pct_inv_coinvestigador", "Coinvestigador — Tope %", "Tope porcentual.", true)}
              {renderInputRow("max_horas_inv_asistente", "Asistente — Horas Máximas", "Límite absoluto Asistente Niv. II.", false, "h")}
              {renderInputRow("max_pct_inv_asistente", "Asistente — Tope %", "Tope porcentual.", true)}
              {renderInputRow("max_horas_inv_fomento", "Fomento SNI — Horas Máximas", "Sin proyectos explícitos.", false, "h")}
              {renderInputRow("max_pct_inv_fomento", "Fomento SNI — Tope %", "Tope porcentual.", true)}
              {renderInputRow("inv_lider_semillero_max", "Líder Semillero", "Horas max líderes avalados.", false, "h")}
              {renderInputRow("inv_enlace_territorial_horas", "Enlace Terr. H", "Horas máx. Enlace Territorial.", false, "h")}
              {renderInputRow("inv_enlace_territorial_pct", "Enlace Terr. %", "Porcentaje máx. Enlace Terr.", true)}
              {renderInputRow("inv_director_grupo_horas", "Dir. Grupo H", "Horas máx. Director de Grupo SNI.", false, "h")}
              {renderInputRow("inv_director_grupo_pct", "Dir. Grupo %", "Porcentaje máx.", true)}
              {renderInputRow("inv_par_propuestas", "Par Eval. Propuestas", "Horas por propuesta.", false, "h")}
              {renderInputRow("inv_par_resultados", "Par Eval. Resultados", "Horas por resultado.", false, "h")}
              {renderInputRow("inv_diseno_cursos", "Diseño Cursos", "Horas por curso diseñado.", false, "h")}
              {renderInputRow("inv_capacitador_cursos", "Capacitador Cursos", "Horas por curso dictado.", false, "h")}
              {renderInputRow("inv_produccion_articulos", "Prod. Artículos", "Producción científica.", false, "h")}
              {renderInputRow("inv_produccion_libro", "Prod. Libros", "Construcción de libros.", false, "h")}
            </div>
          </details>

        </div>
      </section>
    </div>
  );
}
