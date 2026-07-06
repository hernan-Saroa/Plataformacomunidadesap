import { Shield, Clock, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { PTARules } from '../ConfiguracionReglasPTA';

type AadmActividad = PTARules['aadm_actividades'][number];

// Simple Toggle Component extracted to be used here
const SwitchToggle = ({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) => {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-sm cursor-pointer" onClick={() => onChange(!checked)}>
      <div className="relative inline-flex items-center cursor-pointer mt-1">
        <div
          className={`w-11 h-6 rounded-full transition-colors ${
            checked ? "bg-blue-600" : "bg-slate-200"
          }`}
        >
          <div
            className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
      </div>
      <div>
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <p className="text-[0.65rem] text-slate-500 leading-tight mt-1">{description}</p>
      </div>
    </div>
  );
};

export function TabAADM({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const actividades: AadmActividad[] = draft.aadm_actividades || [];

  const updateAct = (idx: number, field: keyof AadmActividad, val: any) => {
    const next = actividades.map((a, i) => i === idx ? {
      ...a,
      [field]: field === 'nombre' ? val
        : field === 'max_horas' ? (val === '' || val === null ? null : Number(val))
        : field === 'consumeTotalidad' ? Boolean(val)
        : val
    } : a);
    handleChange('aadm_actividades', next);
  };
  const addAct = () => handleChange('aadm_actividades', [
    ...actividades,
    { id: `AA_${Date.now()}`, nombre: '', max_horas: null, consumeTotalidad: false },
  ]);
  const removeAct = (idx: number) => handleChange('aadm_actividades', actividades.filter((_, i) => i !== idx));

  const renderInputRow = (key: keyof PTARules, title: string, hint: string, unit: string = "") => (
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
              <Shield className="w-5 h-5 text-blue-500" /> 7. Actividades Académico - Administrativas
            </h2>
            <p className="text-slate-500 text-sm mt-1 max-w-2xl">
              Reconocimiento de horas (Tabla 15 de la Circular 003) y flujos operativos (SLAs).
            </p>
          </div>
        </div>

        <div className="space-y-4">

          {/* ── Tope Global ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Tope Global de Académica / Docencia
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-blue-50/10">
              {renderInputRow("max_horas_aadm_global", "Tope Global Académica / Docencia (Horas)", "Límite máximo de horas para actividades académico-administrativas. Los topes por actividad se configuran abajo.", "h")}
              {renderInputRow("max_pct_aadm", "Máximo % Académica / Docencia", "Límite porcentual sobre el PTA total.", "%")}
            </div>
          </details>
          
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-blue-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">2</span>
                Actividades Doctorado (Tabla 15)
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-blue-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderInputRow("comp_doc_coord_comision", "Coord. Comisión Doctoral", "Horas asignadas al coordinador.", "h")}
              {renderInputRow("comp_doc_comisionado", "Miembro Comisionado", "Horas por ser miembro delegado.", "h")}
              {renderInputRow("comp_doc_eval_propuesta", "Evaluación Propuestas", "Horas por aspirante evaluado.", "h")}
              {renderInputRow("comp_doc_ajuste_microcv", "Ajuste de Microcurrículo", "Tope para perfil doctoral.", "h")}
              {renderInputRow("comp_doc_gestor_intl", "Gestor Internacionaliz.", "Liderazgo de redes y pasantías.", "h")}
              {renderInputRow("comp_doc_gestor_ext", "Gestor Extensión Doct.", "Educación continua de alto nivel.", "h")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-emerald-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs">3</span>
                Misiones y Acreditación Institucional
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-slate-100 bg-emerald-50/10 flex flex-col md:grid md:grid-cols-2 gap-3">
              {renderInputRow("aadm_acreditacion_max", "Comité Acreditación", "Para Condiciones de Calidad.", "h")}
              {renderInputRow("aadm_misiones_horas", "Misiones Académicas (H)", "Tope de horas de descargo.", "h")}
              {renderInputRow("aadm_misiones_pct", "Misiones Académicas (%)", "Tope porcentual global (%).", "%")}
            </div>
          </details>

          <details className="group border border-slate-200 rounded-2xl bg-sky-50/20 shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-sky-100/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-sky-100 text-sky-700 flex items-center justify-center font-black text-xs"><Clock className="w-3.5 h-3.5" /></span>
                Tiempos Máximos (ANS) y Flujo Normativo
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>
            <div className="p-6 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-sky-50/10">
              
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-4">Reglas de Control</h3>
                <SwitchToggle
                  checked={draft.requiere_aprobacion_inicio}
                  onChange={(v) => handleChange("requiere_aprobacion_inicio", v)}
                  title="Aprobación estricta"
                  description="Bloquea el PTA si no está aprobado al inicio. (Admins/GGP pueden editar excepcionalmente)."
                />
                <SwitchToggle
                  checked={draft.requiere_acreditacion_final}
                  onChange={(v) => handleChange("requiere_acreditacion_final", v)}
                  title="Acreditación final obligatoria"
                  description="Exige soportes documentales para cierre."
                />
                <SwitchToggle
                  checked={draft.ggp_auditoria_activa}
                  onChange={(v) => handleChange("ggp_auditoria_activa", v)}
                  title="Auditoría GGP"
                  description="Gestión Profesoral hace seguimiento y reporta."
                />
              </div>

              <div className="lg:col-span-8">
                <h3 className="text-xs font-bold tracking-widest text-sky-800 uppercase mb-4">SLA: Días Máximos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-sky-100 p-3 shadow-sm relative pt-5">
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-300 rounded-t-xl" />
                    <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider mb-1">Paso 1</p>
                    <p className="font-bold text-slate-800 text-xs leading-tight mb-3">Docente Titular</p>
                    <div className="relative">
                      <input type="number" value={draft.sla_radicacion_pta ?? 5} onChange={(e) => handleChange("sla_radicacion_pta", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold py-1.5 focus:ring-2 focus:ring-sky-500/20" />
                      <span className="absolute right-2 top-2 text-[0.55rem] text-slate-400 font-bold uppercase">Días</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-sky-100 p-3 shadow-sm relative pt-5">
                    <div className="absolute top-0 left-0 w-full h-1 bg-sky-400 rounded-t-xl" />
                    <p className="text-[0.6rem] font-bold text-sky-600 uppercase tracking-wider mb-1">Paso 2</p>
                    <p className="font-bold text-slate-800 text-xs leading-tight mb-3">Decanos / Direc.</p>
                    <div className="relative">
                      <input type="number" value={draft.sla_verificacion_jefaturas ?? 3} onChange={(e) => handleChange("sla_verificacion_jefaturas", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold py-1.5 focus:ring-2 focus:ring-sky-500/20" />
                      <span className="absolute right-2 top-2 text-[0.55rem] text-slate-400 font-bold uppercase">Días</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-sky-100 p-3 shadow-sm relative pt-5">
                    <div className="absolute top-0 left-0 w-full h-1 bg-green-500 rounded-t-xl" />
                    <p className="text-[0.6rem] font-bold text-green-600 uppercase tracking-wider mb-1">Paso 3</p>
                    <p className="font-bold text-slate-800 text-xs leading-tight mb-3">Radicar GGP</p>
                    <div className="relative">
                      <input type="number" value={draft.dias_limite_radicacion_ggp ?? 10} onChange={(e) => handleChange("dias_limite_radicacion_ggp", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded text-center text-sm font-bold py-1.5 focus:ring-2 focus:ring-green-500/20" />
                      <span className="absolute right-2 top-2 text-[0.55rem] text-slate-400 font-bold uppercase">Días</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </details>

          {/* ── Catálogo de Actividades Académico-Administrativas ── */}
          <details className="group border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between p-4 bg-slate-50 group-open:bg-amber-50/50 hover:bg-slate-100 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs">4</span>
                Catálogo de Actividades Académico-Administrativas
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{actividades.length} actividades</span>
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition transform group-open:rotate-180" />
            </summary>

            <div className="p-6 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Define las actividades que el docente puede seleccionar en el módulo Académico-Administrativo. Las marcadas con <strong>100% PTA</strong> bloquean el resto del formulario.
                </p>
                <button onClick={addAct}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors shrink-0 ml-4">
                  <Plus className="w-3 h-3" /> Agregar actividad
                </button>
              </div>

              {actividades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                  <Shield className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">Sin actividades. Agrega la primera.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {actividades.map((act, idx) => (
                    <div key={act.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-xl transition-all shadow-sm group gap-4 ${act.consumeTotalidad ? 'bg-amber-50/60 border-amber-200 hover:border-amber-300' : 'bg-white border-slate-100 hover:border-amber-200'}`}>
                      <input
                        type="text"
                        key={`pos-aadm-${act.id}-${idx}`}
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
                            handleChange('aadm_actividades', acts);
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="w-10 h-10 rounded-xl text-white font-black text-sm shrink-0 shadow-sm border-2 border-white/30 outline-none text-center cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all"
                        style={{ background: '#3B82F6', padding: 0 }}
                      />
                      <div className="w-full sm:w-28 shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID</span>
                        <input type="text" value={act.id}
                          onChange={e => updateAct(idx, 'id', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-500 font-mono text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                      </div>
                      <div className="flex-1 w-full">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre</span>
                        <input type="text" value={act.nombre}
                          onChange={e => updateAct(idx, 'nombre', e.target.value)}
                          placeholder="Nombre de la actividad..."
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all" />
                      </div>
                      <div className="flex items-end gap-3 w-full sm:w-auto">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Límite Hrs</span>
                          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 h-[34px]">
                            <input type="number" value={act.max_horas ?? ''}
                              onChange={e => updateAct(idx, 'max_horas', e.target.value)}
                              placeholder="—"
                              disabled={!!act.consumeTotalidad}
                              className="w-16 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-amber-500/20 outline-none disabled:opacity-40" />
                            <span className="text-xs text-slate-400 font-bold shrink-0 px-1">h</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1" title="Consume 100% PTA">100%</span>
                          <label className="flex items-center justify-center h-[34px] w-[34px] rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                            <input type="checkbox" checked={!!act.consumeTotalidad}
                              onChange={e => updateAct(idx, 'consumeTotalidad', e.target.checked)}
                              className="w-4 h-4 accent-amber-600 cursor-pointer" />
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
