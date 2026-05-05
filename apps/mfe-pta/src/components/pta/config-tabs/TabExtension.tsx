import React, { useState } from 'react';
import { Users, ChevronDown, Plus, Trash2, Globe } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

type ExtSeccion = PTARules['ext_secciones'][number];
type ExtActividad = { id: string; nombre: string; max_horas: number };

export function TabExtension({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const [seccionActiva, setSeccionActiva] = useState<string>('capacitacion');

  // ── ext_secciones CRUD ──────────────────────────────────────────────
  const secciones: ExtSeccion[] = draft.ext_secciones || [];
  const actividades: Record<string, ExtActividad[]> = draft.ext_actividades || {};

  const updateSeccion = (idx: number, field: keyof ExtSeccion, val: any) => {
    const next = secciones.map((s, i) => i === idx ? { ...s, [field]: field === 'orden' ? Number(val) : val } : s);
    handleChange('ext_secciones', next);
  };
  const addSeccion = () => {
    const key = `seccion_${Date.now()}`;
    handleChange('ext_secciones', [...secciones, { key, label: 'Nueva Sección', color: '#6366f1', orden: secciones.length + 1 }]);
    handleChange('ext_actividades', { ...actividades, [key]: [] });
    setSeccionActiva(key);
  };
  const removeSeccion = (idx: number) => {
    const sec = secciones[idx];
    const next = secciones.filter((_, i) => i !== idx);
    handleChange('ext_secciones', next);
    const nextActs = { ...actividades };
    delete nextActs[sec.key];
    handleChange('ext_actividades', nextActs);
    if (seccionActiva === sec.key) setSeccionActiva(next[0]?.key || '');
  };

  // ── ext_actividades CRUD ────────────────────────────────────────────
  const actsDeSeccion = (key: string): ExtActividad[] => actividades[key] || [];

  const updateAct = (secKey: string, idx: number, field: keyof ExtActividad, val: any) => {
    const next = actsDeSeccion(secKey).map((a, i) =>
      i === idx ? { ...a, [field]: field === 'nombre' ? val : Number(val) } : a
    );
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const addAct = (secKey: string) => {
    const next = [...actsDeSeccion(secKey), { id: `ACT_${Date.now()}`, nombre: '', max_horas: 0 }];
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const removeAct = (secKey: string, idx: number) => {
    const next = actsDeSeccion(secKey).filter((_, i) => i !== idx);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };

  const renderInputRow = (key: keyof PTARules, label: string, helper: string, unit: string = "") => (
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
        {unit && (
          <span className="text-xs font-bold text-slate-400 min-w-[24px] text-left">{unit}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section>
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" /> 5. Gestión de Extensión Académica
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Configuración de topes y horas de la Subdirección Nacional de Proyección Institucional.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Dirección de Capacitación (Tabla 5)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col md:grid md:grid-cols-2 gap-3 bg-blue-50/10">
              {renderInputRow("ext_max_horas_enlace", "Tope Global Extensión (Horas)", "Límite en horas para toda la extensión.", "h")}
              {renderInputRow("ext_max_pct_enlace", "Tope Global Extensión (%)", "% respecto al total del PTA.", "%")}
              {renderInputRow("ext_talleres_ejec_base", "Orientación Talleres", "Base horaria.", "h")}
              {renderInputRow("ext_seminarios_ejec_base", "Orientación Seminarios", "Base horaria", "h")}
              {renderInputRow("ext_cursos_ejec_max", "Cursos Ejec. Máxima", "Hasta 64h totales (ver ref).", "h")}
              {renderInputRow("ext_diplomados_ejec_max", "Diplomados Ejec. Máx", "Hasta 80h de ejecución.", "h")}
              
              {/* Construction Component - Placeholder disabled */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-sm gap-4 opacity-50 cursor-not-allowed">
                <div className="flex-1">
                  <h4 className="text-[13px] font-bold text-slate-600 leading-tight mb-1">Construcción Contenidos</h4>
                  <p className="text-[11px] text-red-500 font-bold leading-tight">Pendiente de actualización normativa</p>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" value={0} disabled className="w-24 bg-slate-100 border border-slate-200 text-slate-500 font-bold rounded-lg px-3 py-2 text-center" />
                </div>
              </div>
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-amber-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">2</span>
                Dirección de Procesos de Selección (Tablas 6, 7, 8)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col md:grid md:grid-cols-2 gap-3 bg-amber-50/10">
              {renderInputRow("ext_sel_revision_prueba", "Revisión Estruct. Prueba", "Hora por capacitación/sesión.", "h")}
              {renderInputRow("ext_sel_validacion_prueba", "Validación Sesión", "Horas por sesión val.", "h")}
              {renderInputRow("ext_sel_construccion_casos", "Construcción Casos", "4 horas por caso.", "h")}
              {renderInputRow("ext_sel_revision_casos", "Revisión Casos", "3 horas por caso.", "h")}
              {renderInputRow("ext_sel_item_validacion", "Validación Ítems", "1 hora por revisión de ítem.", "h")}
              {renderInputRow("ext_sel_analisis_evidencias", "Análisis Evidencias", "Hora y media semanal.", "h")}
              {renderInputRow("ext_sel_jurado_con_cal", "Jurado de Prueba", "Calificar documento (3h).", "h")}
              {renderInputRow("ext_sel_jurado_apt_vir", "Aptitud Oral / Visual", "Sustentación (2h).", "h")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-emerald-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">3</span>
                Dirección Fortalecimiento Gestión Estatal (Tablas 9-12)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col md:grid md:grid-cols-2 gap-3 bg-emerald-50/10">
              {/* Asistencia Tecnica */}
              {renderInputRow("ext_fag_asistencia_tecnica", "Retroalim. Asistencia Téc", "PDET y 5/6a categoría (80h).", "h")}
              {renderInputRow("ext_fag_bateria_indicadores", "Batería Indicadores", "Medición de resultados (80h).", "h")}
              
              {/* Rediseño inst */}
              {renderInputRow("ext_fag_red_plan_1", "Rediseño (Plan Inv 1)", "Asesoría técnica prep info (40h).", "h")}
              {renderInputRow("ext_fag_red_analisis_1", "Rediseño (Análisis Est)", "Análisis interno/externo (80h).", "h")}
              {renderInputRow("ext_fag_red_arq_1", "Rediseño (Arquit Inst)", "Arquitectura, procesos (100h).", "h")}

              {/* Laboratorios FIJO / VAR */}
              {renderInputRow("ext_lab_fijo_participacion", "Laboratorio (Particip. Fija)", "Representación, Foros (100h).", "h")}
              {renderInputRow("ext_lab_fijo_administrativo", "Laboratorio (Coord. Fija)", "Gestión administrativa (120h).", "h")}
              {renderInputRow("ext_lab_var_planear", "Laboratorio (Planeación)", "Elaboración de docs técnicos (80h).", "h")}
              
              {/* Investigacion Aplicada T12 */}
              {renderInputRow("ext_inv_doc_tec_max", "Inv. Aplicada (Docs Téc)", "Máximo doc. técnico (60h).", "h")}
              {renderInputRow("ext_inv_prod_nuevo_con_max", "Inv. Apli (Nuevo Conoc.)", "Categoría MInciencias (60h).", "h")}
              {renderInputRow("ext_inv_prod_apropiacion_max", "Inv. Apli (Apropiación Soc.)", "Divulgación de la ciencia (60h).", "h")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-rose-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs">4</span>
                Escuela de Alto Gobierno (Tabla 13)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col md:grid md:grid-cols-2 gap-3 bg-rose-50/10">
              {renderInputRow("ext_eag_coaching_min", "Coaching Directivo Min", "Desde 80h.", "h")}
              {renderInputRow("ext_eag_coaching_max", "Coaching Directivo Max", "Hasta 200h.", "h")}
              {renderInputRow("ext_eag_formacion_min", "Formación Estratégica Min", "Desde 80h.", "h")}
              {renderInputRow("ext_eag_formacion_max", "Formación Estratégica Max", "Hasta 200h.", "h")}
              {renderInputRow("ext_eag_gestion_con_min", "Gestión del Conocimiento Min", "Desde 80h.", "h")}
              {renderInputRow("ext_eag_gestion_con_max", "Gestión del Conocimiento Max", "Hasta 200h.", "h")}
              {renderInputRow("ext_eag_desarrollo_con_min", "Desarrollo de Contenidos Min", "Desde 40h.", "h")}
              {renderInputRow("ext_eag_desarrollo_con_max", "Desarrollo de Contenidos Max", "Hasta 120h.", "h")}
            </div>
          </details>

          {/* ── SECCIÓN 5: Secciones y Actividades de Extensión (Configurables) ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-violet-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs">5</span>
                Secciones y Actividades de Extensión
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{secciones.length} secciones</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-6 border-t border-slate-100 space-y-6">
              <p className="text-xs text-slate-500">
                Define las secciones de extensión que verá el docente en el formulario PTA y las actividades disponibles en cada una. Los cambios se guardan con el botón "Guardar Configuración".
              </p>

              {/* ── Pestañas de secciones ── */}
              <div className="flex flex-wrap gap-2 items-center">
                {secciones.map(s => (
                  <button key={s.key} onClick={() => setSeccionActiva(s.key)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${seccionActiva === s.key ? 'text-white border-transparent' : 'text-slate-600 border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                    style={{ background: seccionActiva === s.key ? s.color : undefined }}>
                    {s.label} ({actsDeSeccion(s.key).length})
                  </button>
                ))}
                <button onClick={addSeccion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-500 text-xs font-semibold hover:border-violet-400 hover:text-violet-600 transition-colors bg-white">
                  <Plus className="w-3 h-3" /> Nueva sección
                </button>
              </div>

              {/* ── Editor de sección activa ── */}
              {secciones.map((sec, idx) => sec.key !== seccionActiva ? null : (
                <div key={sec.key} className="space-y-4">
                  {/* Metadatos de la sección */}
                  <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex-1">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Etiqueta</label>
                      <input type="text" value={sec.label}
                        onChange={e => updateSeccion(idx, 'label', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                    </div>
                    <div className="w-32">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Clave (key)</label>
                      <input type="text" value={sec.key} disabled
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 font-mono text-xs rounded-lg px-3 py-2 cursor-not-allowed" />
                    </div>
                    <div className="w-28">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={sec.color}
                          onChange={e => updateSeccion(idx, 'color', e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white" />
                        <span className="text-xs font-mono text-slate-500">{sec.color}</span>
                      </div>
                    </div>
                    <div className="w-20">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Orden</label>
                      <input type="number" value={sec.orden}
                        onChange={e => updateSeccion(idx, 'orden', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 font-bold text-sm rounded-lg px-3 py-1.5 text-center focus:ring-2 focus:ring-violet-500/20 outline-none" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => removeSeccion(idx)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors">
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>

                  {/* Actividades de esta sección */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" style={{ color: sec.color }} />
                        <span className="text-sm font-bold text-slate-700">Actividades de {sec.label}</span>
                        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{actsDeSeccion(sec.key).length} actividades</span>
                      </div>
                      <button onClick={() => addAct(sec.key)}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border-none text-white text-xs font-bold shadow-sm"
                        style={{ background: sec.color }}>
                        <Plus className="w-3.5 h-3.5" /> Agregar actividad
                      </button>
                    </div>

                    {actsDeSeccion(sec.key).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Globe className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Sin actividades. Agrega la primera.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {actsDeSeccion(sec.key).map((act, aIdx) => (
                          <div key={act.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-violet-200 transition-all shadow-sm group gap-4">
                            <div className="w-full sm:w-28 shrink-0">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID</span>
                              <input type="text" value={act.id}
                                onChange={e => updateAct(sec.key, aIdx, 'id', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-500 font-mono text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" />
                            </div>
                            <div className="flex-1 w-full">
                              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre</span>
                              <input type="text" value={act.nombre}
                                onChange={e => updateAct(sec.key, aIdx, 'nombre', e.target.value)}
                                placeholder="Nombre de la actividad..."
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all" />
                            </div>
                            <div className="flex items-end gap-3 w-full sm:w-auto">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Máximo</span>
                                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 h-[34px]">
                                  <input type="number" value={act.max_horas}
                                    onChange={e => updateAct(sec.key, aIdx, 'max_horas', e.target.value)}
                                    className="w-16 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                  <span className="text-xs text-slate-400 font-bold shrink-0 px-1">h</span>
                                </div>
                              </div>
                              <button onClick={() => removeAct(sec.key, aIdx)}
                                className="w-[34px] h-[34px] flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

