import React from 'react';
import { Calculator, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

type CompActividad = PTARules['comp_actividades'][number];

export function TabComplementarias({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const actividades: CompActividad[] = draft.comp_actividades || [];

  const updateAct = (idx: number, field: keyof CompActividad, val: any) => {
    const next = actividades.map((a, i) => i === idx ? {
      ...a,
      [field]: field === 'nombre' ? val
        : field === 'max_horas' ? (val === '' || val === null ? null : Number(val))
        : field === 'consumeTotalidad' ? Boolean(val)
        : val
    } : a);
    handleChange('comp_actividades', next);
  };
  const addAct = () => handleChange('comp_actividades', [
    ...actividades,
    { id: `COMP_${Date.now()}`, nombre: '', max_horas: 0, consumeTotalidad: false },
  ]);
  const removeAct = (idx: number) => handleChange('comp_actividades', actividades.filter((_, i) => i !== idx));
  const renderInputRow = (key: keyof PTARules, title: string, hint: string) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors shadow-sm group gap-4">
      <div className="flex-1">
        <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">{title}</h4>
        <p className="text-[11px] text-slate-500 leading-tight">{hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={draft[key] as number}
          onChange={(e) => handleChange(key, e.target.value)}
          className="w-24 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        <span className="text-xs font-bold text-slate-400 min-w-[24px] text-left">h</span>
      </div>
    </div>
  );

  const renderRangeRow = (keyMin: keyof PTARules, keyMax: keyof PTARules, title: string, hint: string) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-colors shadow-sm group col-span-1 md:col-span-2 gap-4">
      <div className="flex-1">
        <h4 className="text-[13px] font-bold text-slate-800 leading-tight mb-1">{title}</h4>
        <p className="text-[11px] text-slate-500 leading-tight">{hint}</p>
      </div>
      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 shrink-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase">Min:</span>
        <input
          type="number"
          value={draft[keyMin] as number}
          onChange={(e) => handleChange(keyMin, e.target.value)}
          className="w-16 bg-white border border-slate-200 text-slate-800 font-bold rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        <span className="text-slate-400 font-bold text-xs px-1">-</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase">Max:</span>
        <input
          type="number"
          value={draft[keyMax] as number}
          onChange={(e) => handleChange(keyMax, e.target.value)}
          className="w-16 bg-white border border-slate-200 text-slate-800 font-bold rounded-lg px-2 py-1.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
        />
        <span className="text-xs font-bold text-slate-400 pl-2">h</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" /> 6. Actividades Complementarias
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Catálogo de reconocimiento de horas por Actividades Complementarias a la Docencia (Tabla 14 y Anexo 1). 
              <em> Tope General: 200h o 25% del PTA.</em>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Acompañamiento Pregrado y Posgrado
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-blue-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderInputRow("comp_acomp_pregrado_ap", "Acomp. Monografías (AP)", "Horas por estudiante/grupo, Pregrado AP.")}
              {renderInputRow("comp_acomp_pregrado_apt_9", "Acomp. APT (9° semest.)", "Horas por estudiante/grupo.")}
              {renderInputRow("comp_acomp_pregrado_apt_10", "Acomp. APT (10° semest.)", "Horas por estudiante/grupo.")}
              {renderInputRow("comp_acomp_pregrado_prac_ap", "Prácticas (AP)", "Práctica admin, proyecto aplicado AP.")}
              {renderInputRow("comp_acomp_pregrado_prac_apt", "Prácticas (APT)", "Práctica admin, proyecto aplicado APT.")}
              {renderInputRow("comp_acomp_seminario_maestria", "Seminario (Maestrías)", "Trabajos grado III y IV.")}
              {renderInputRow("comp_dir_trabajos_maestria", "Dir. Trabajo (Maestrías)", "Hasta 30h por est./grupo.")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-emerald-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">2</span>
                Diseño y Desarrollo Curricular
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-emerald-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderRangeRow("comp_act_unidades_min", "comp_act_unidades_max", "Unidades Didácticas", "Creación: Rango hrs/unidad.")}
              {renderInputRow("comp_elab_micro_curriculos", "Micro Currículos", "Hasta 10 horas.")}
              {renderInputRow("comp_elab_rea", "Elaboración de REA", "Recursos Educativos Abiertos PREAAP.")}
              {renderInputRow("comp_elab_preg_ecaes", "Const. Preguntas ECAES", "Revisión/generación (por pregunta).")}
              {renderInputRow("comp_cursos_repeticion", "Cursos Nivelación", "Espec. y maestrías por curso.")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-amber-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">3</span>
                Coordinación y Eventos Académicos
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-amber-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderRangeRow("comp_coord_escuela_doc_min", "comp_coord_escuela_doc_max", "Coord. Escuela Doctoral", "Rango de horas asignado.")}
              {renderInputRow("comp_lider_campo_con", "Líder Acad. Campo", "Líder de campo conocimiento programa.")}
              {renderRangeRow("comp_lider_posgrado_min", "comp_lider_posgrado_max", "Líder Acad. Posgrados", "En programa de posgrados.")}
              {renderInputRow("comp_expo_eventos", "Expositores Eventos", "Aprobados por decanaturas (ponencia).")}
              {renderInputRow("comp_rep_cuerpos_col", "Cuerpos Colegiados", "Representación docente.")}
              {renderInputRow("comp_rep_escenarios_acad", "Representación ESAP", "Escenarios por Territorial (evento).")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-rose-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">4</span>
                Evaluaciones y Jurados
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-rose-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderInputRow("comp_exam_hab_grupo", "Examen Habil. (Grupo)", "Hasta 10 horas.")}
              {renderInputRow("comp_exam_hab_individual", "Examen Habil. (Indiv)", "Hasta 3 horas.")}
              {renderInputRow("comp_exam_homolog", "Exámen Homologación", "Por estudiante o grupo.")}
              {renderInputRow("comp_jurado_concurso_no_vinc", "Jurado Conc. (No Vinc)", "Aspirantes ocasionales/especiales.")}
              {renderInputRow("comp_jurado_concurso_vinc", "Jurado Conc. (Vinc)", "Aspirantes carrera profesoral.")}
              {renderInputRow("comp_jurado_trabajo_maestria", "Jurado Trabajo Maestría", "Sustentación/evaluación.")}
              {renderInputRow("comp_jurado_productos", "Jurado Prods Acad.", "Por evaluación producto externo/int.")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-sky-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xs">5</span>
                Sindicatos y Formación Docente
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-sky-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderInputRow("comp_sindicato_titular", "Sindicato Titular", "Hasta 320h (40% de PTA 800h).")}
              {renderInputRow("comp_sindicato_suplente", "Sindicato Suplente", "Hasta 160h (20% de PTA 800h).")}
              {renderInputRow("comp_formacion_competencias", "Formación Docente", "Plan Anual Des. Profesoral.")}
              {renderInputRow("comp_prod_academica", "Prod. Académica Indep.", "Paper, ensayos innovación ped.")}
            </div>
          </details>

          {/* ── SECCIÓN 6: Catálogo de Actividades (Configurable) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-violet-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs">6</span>
                Catálogo de Actividades Complementarias
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{actividades.length} actividades</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">Define las actividades que el docente puede seleccionar. Los cambios se guardan con "Guardar Configuración".</p>
                <button onClick={addAct}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors shrink-0 ml-4">
                  <Plus className="w-3 h-3" /> Agregar actividad
                </button>
              </div>

              {actividades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <Calculator className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Sin actividades. Agrega la primera.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actividades.map((act, idx) => (
                    <div key={act.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-violet-200 transition-all shadow-sm group gap-4">
                      <div className="w-full sm:w-28 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID</span>
                        <input type="text" value={act.id}
                          onChange={e => updateAct(idx, 'id', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-500 font-mono text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" />
                      </div>
                      <div className="flex-1 w-full">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre</span>
                        <input type="text" value={act.nombre}
                          onChange={e => updateAct(idx, 'nombre', e.target.value)}
                          placeholder="Nombre de la actividad..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" />
                      </div>
                      <div className="flex items-end gap-3 w-full sm:w-auto">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Límite Hrs</span>
                          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 h-[34px]">
                            <input type="number" value={act.max_horas ?? ''}
                              onChange={e => updateAct(idx, 'max_horas', e.target.value)}
                              placeholder="—"
                              disabled={!!act.consumeTotalidad}
                              className="w-16 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-violet-500/20 outline-none disabled:opacity-40" />
                            <span className="text-xs text-slate-400 font-bold shrink-0 px-1">h</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1" title="Consume 100% PTA">100%</span>
                          <label className="flex items-center justify-center h-[34px] w-[34px] rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" checked={!!act.consumeTotalidad}
                              onChange={e => updateAct(idx, 'consumeTotalidad', e.target.checked)}
                              className="w-4 h-4 accent-violet-600 cursor-pointer" />
                          </label>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-white uppercase block mb-1">.</span>
                          <button onClick={() => removeAct(idx)}
                            className="w-[34px] h-[34px] flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

        </div>
      </section>
    </div>
  );
}

