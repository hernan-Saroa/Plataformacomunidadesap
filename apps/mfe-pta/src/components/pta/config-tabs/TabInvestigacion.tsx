import React from 'react';
import { Search, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

type Rol = PTARules['inv_roles'][number];
type Actividad = PTARules['inv_actividades'][number];

export function TabInvestigacion({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const renderInputRow = (key: keyof PTARules, label: string, helper: string, unit: string = "") => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors shadow-sm group gap-4">
      <div className="flex-1">
        <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">{label}</h4>
        <p className="text-[11px] text-slate-500 leading-tight">{helper}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={(draft[key] as number) ?? ''}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-24 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-purple-500/20 outline-none"
        />
        {unit && (
          <span className="text-xs font-bold text-slate-400 min-w-[24px] text-left">{unit}</span>
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
            Roles y actividades de investigación configurables — avalados por la SNI. Todos los valores son topes «hasta» y se reflejan dinámicamente en el formulario PTA del docente.
          </p>
        </div>

        <div className="space-y-4">

          {/* ── Tope Global ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Tope Global de Investigación
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-blue-50/10">
              {renderInputRow("max_horas_investigacion_global", "Hasta Global de Investigación (Horas de referencia)", "Referencia normativa sobre una bolsa de 800h. En cada PTA se escala a la bolsa RUND real; por ejemplo, 400h/50% se convierten en hasta 360h para una bolsa de 720h.", "h")}
              {renderInputRow("max_pct_investigacion", "Hasta % de Investigación", "Porcentaje máximo sobre la bolsa RUND real del docente (Circular §2).", "%")}
            </div>
          </details>

          {/* ── SECCIÓN 2: Roles de Investigación (CRUD) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">2</span>
                Roles en Proyectos de Investigación
                <span className="text-[10px] font-bold text-blue-600 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">{roles.length} ROLES</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-blue-50/10">
              {roles.map((rol, idx) => (
                <div key={rol.id} className="flex items-center gap-2 p-2.5 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-colors shadow-sm group">
                  <input
                    type="text"
                    key={`pos-rol-${rol.id}-${idx}`}
                    defaultValue={idx + 1}
                    title={`Posición ${idx + 1}`}
                    onFocus={e => e.target.select()}
                    onBlur={e => {
                      const val = parseInt(e.target.value, 10);
                      const max = roles.length;
                      const newPos = isNaN(val) ? idx + 1 : Math.max(1, Math.min(max, val));
                      e.target.value = String(idx + 1);
                      if (newPos !== idx + 1) {
                        const arr = [...roles];
                        const [moved] = arr.splice(idx, 1);
                        arr.splice(newPos - 1, 0, moved);
                        handleChange('inv_roles', arr);
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-8 h-8 rounded-lg text-white font-black text-xs shrink-0 shadow-sm border-2 border-white/30 outline-none text-center cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all"
                    style={{ background: '#6366F1', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={rol.nombre}
                    onChange={e => updateRol(idx, 'nombre', e.target.value)}
                    placeholder="Nombre del rol..."
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Hasta:</span>
                  <input type="number" value={rol.horas_max} onChange={e => updateRol(idx, 'horas_max', e.target.value)}
                    className="w-[70px] bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none shrink-0" />
                  <span className="text-xs text-slate-400 font-bold shrink-0">h</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Sin exceder:</span>
                  <input type="number" value={rol.pct_max} onChange={e => updateRol(idx, 'pct_max', e.target.value)}
                    className="w-[70px] bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none shrink-0" />
                  <span className="text-xs text-slate-400 font-bold shrink-0">%</span>
                  <button onClick={() => removeRol(idx)}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 flex shrink-0 items-center justify-center transition-all shadow-sm">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button onClick={addRol}
                className="flex items-center justify-center gap-2 px-4 py-3 mt-1 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600 font-bold text-[13px] hover:bg-blue-50 hover:border-blue-300 transition-colors w-full">
                <Plus className="w-4 h-4" /> AGREGAR ROL
              </button>
            </div>
          </details>

          {/* ── SECCIÓN 3: Actividades de Investigación (CRUD) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-amber-50/40 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">3</span>
                Actividades del Grupo de Investigación
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">{actividades.length} ACTIVIDADES</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-amber-50/10">
              {actividades.map((act, idx) => (
                <div key={act.id} className="flex items-center gap-2 p-2.5 bg-white border border-slate-100 rounded-xl hover:border-amber-200 transition-colors shadow-sm group">
                  <input
                    type="text"
                    key={`pos-inv-${act.id}-${idx}`}
                    defaultValue={idx + 1}
                    title={`Posición ${idx + 1}`}
                    onFocus={e => e.target.select()}
                    onBlur={e => {
                      const val = parseInt(e.target.value, 10);
                      const max = actividades.length;
                      const newPos = isNaN(val) ? idx + 1 : Math.max(1, Math.min(max, val));
                      e.target.value = String(idx + 1);
                      if (newPos !== idx + 1) {
                        const acts = [...actividades];
                        const [moved] = acts.splice(idx, 1);
                        acts.splice(newPos - 1, 0, moved);
                        handleChange('inv_actividades', acts);
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="w-8 h-8 rounded-lg text-white font-black text-xs shrink-0 shadow-sm border-2 border-white/30 outline-none text-center cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-amber-400 focus:ring-2 focus:ring-offset-1 focus:ring-amber-500 transition-all"
                    style={{ background: '#F59E0B', padding: 0 }}
                  />
                  <input
                    type="text"
                    value={act.nombre}
                    onChange={e => updateAct(idx, 'nombre', e.target.value)}
                    placeholder="Nombre de la actividad..."
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Hasta:</span>
                  <input type="number" value={act.horas_max} onChange={e => updateAct(idx, 'horas_max', e.target.value)}
                    className="w-[70px] bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-amber-500/20 outline-none shrink-0" />
                  <span className="text-xs text-slate-400 font-bold shrink-0">h</span>
                  <button onClick={() => removeAct(idx)}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}


              <button onClick={addAct}
                className="flex items-center justify-center gap-2 px-4 py-3 mt-1 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 text-amber-600 font-bold text-[13px] hover:bg-amber-50 hover:border-amber-300 transition-colors w-full">
                <Plus className="w-4 h-4" /> AGREGAR ACTIVIDAD
              </button>
            </div>
          </details>


          {/* ── SECCIÓN 4: Modalidad de registro ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-purple-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-purple-100 text-purple-700 flex items-center justify-center font-black text-xs">4</span>
                Modalidad de Registro de Investigación
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-4 border-t border-slate-100 bg-purple-50/10">
              <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-purple-200 transition-colors shadow-sm">
                <div className="flex-1 pr-4">
                  <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">
                    Permitir proyecto y actividades simultáneamente
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Al activarlo, el docente puede registrar un Proyecto de Investigación y Actividades de Investigación en el mismo PTA. Las horas de ambos se suman y respetan el tope global del componente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange(
                    'inv_permitir_proyecto_actividades_simultaneos',
                    !draft.inv_permitir_proyecto_actividades_simultaneos,
                  )}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/30 ${
                    draft.inv_permitir_proyecto_actividades_simultaneos
                      ? 'bg-purple-600 border-purple-600'
                      : 'bg-slate-200 border-slate-200'
                  }`}
                  role="switch"
                  aria-label="Permitir proyecto y actividades de investigación simultáneamente"
                  aria-checked={draft.inv_permitir_proyecto_actividades_simultaneos}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    draft.inv_permitir_proyecto_actividades_simultaneos ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className={`ml-3 text-xs font-bold min-w-[70px] text-right ${draft.inv_permitir_proyecto_actividades_simultaneos ? 'text-purple-700' : 'text-slate-400'}`}>
                  {draft.inv_permitir_proyecto_actividades_simultaneos ? 'Permitido' : 'Excluyente'}
                </span>
              </div>
            </div>
          </details>


          {/* ── SECCIÓN 5: Resolución de Investigación ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-emerald-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">5</span>
                Resolución de Investigación — Documentación Soporte
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-emerald-50/10">
              <p className="text-xs text-slate-500 mb-1">
                Define si las actividades de investigación requieren resolución y/o archivo adjunto en el PTA del docente.
              </p>

              {/* Toggle: Resolución obligatoria */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-colors shadow-sm">
                <div className="flex-1 pr-4">
                  <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">N° / Nombre de la Resolución</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Si está activo, el docente debe ingresar el número o nombre de la resolución que respalda el proyecto de investigación.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('inv_resolucion_obligatoria', !draft.inv_resolucion_obligatoria)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                    draft.inv_resolucion_obligatoria
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-slate-200 border-slate-200'
                  }`}
                  role="switch"
                  aria-checked={draft.inv_resolucion_obligatoria}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    draft.inv_resolucion_obligatoria ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className={`ml-3 text-xs font-bold min-w-[70px] text-right ${draft.inv_resolucion_obligatoria ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {draft.inv_resolucion_obligatoria ? 'Obligatorio' : 'Opcional'}
                </span>
              </div>

              {/* Toggle: Adjunto obligatorio */}
              <div className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-colors shadow-sm">
                <div className="flex-1 pr-4">
                  <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">Archivo Adjunto (Resolución PDF)</h4>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Si está activo, el docente debe cargar un archivo de soporte (PDF, DOC) junto con la resolución del proyecto.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleChange('inv_adjunto_obligatorio', !draft.inv_adjunto_obligatorio)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                    draft.inv_adjunto_obligatorio
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'bg-slate-200 border-slate-200'
                  }`}
                  role="switch"
                  aria-checked={draft.inv_adjunto_obligatorio}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    draft.inv_adjunto_obligatorio ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
                <span className={`ml-3 text-xs font-bold min-w-[70px] text-right ${draft.inv_adjunto_obligatorio ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {draft.inv_adjunto_obligatorio ? 'Obligatorio' : 'Opcional'}
                </span>
              </div>
            </div>
          </details>

        </div>
      </section>
    </div>
  );
}
