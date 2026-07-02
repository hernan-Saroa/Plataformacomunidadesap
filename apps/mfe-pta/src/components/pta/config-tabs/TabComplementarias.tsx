import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calculator, ChevronDown, Plus, Trash2, Globe, GripVertical, X, Columns3, Tag, Lock, Info } from 'lucide-react';
import { PTARules, ExtItem } from '../ConfiguracionReglasPTA';

type CompSeccion = PTARules['comp_secciones'][number];
type CompActividad = PTARules['comp_actividades_v2'][string][number];

export function TabComplementarias({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const [open1, setOpen1] = useState(true);   // Tope Global accordion
  const [open2, setOpen2] = useState(true);   // Secciones y Actividades accordion
  const secciones: CompSeccion[] = draft.comp_secciones || [];
  const [seccionActiva, setSeccionActiva] = useState<string>(() => secciones[0]?.key || '');

  // ── Drag & Drop State ──
  const [draggedActIdx, setDraggedActIdx] = useState<number | null>(null);
  const [dragOverActIdx, setDragOverActIdx] = useState<number | null>(null);
  const [draggedSecKey, setDraggedSecKey] = useState<string | null>(null);
  // Drag & Drop columnas
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const [dragColSecKey, setDragColSecKey] = useState<string | null>(null);
  // Drag & Drop ítems
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);
  const [dragItemKey, setDragItemKey] = useState<string | null>(null);

  // ── Modal "Agregar columna" ──
  const [colModal, setColModal] = useState<{ secKey: string; actIdx: number } | null>(null);
  const [colNombre, setColNombre] = useState('Evidencia');
  const colInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (colModal && colInputRef.current) { colInputRef.current.focus(); colInputRef.current.select(); } }, [colModal]);

  // ── Activity Drag Handlers ──
  const handleDragStart = (e: React.DragEvent, secKey: string, idx: number) => {
    setDraggedSecKey(secKey); setDraggedActIdx(idx); e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, secKey: string, idx: number) => {
    e.preventDefault(); if (draggedSecKey === secKey) setDragOverActIdx(idx);
  };
  const handleDragLeave = () => setDragOverActIdx(null);
  const handleDrop = (e: React.DragEvent, secKey: string, idx: number) => {
    e.preventDefault();
    if (draggedSecKey === secKey && draggedActIdx !== null && draggedActIdx !== idx) {
      const acts = [...actsDeSeccion(secKey)];
      const [draggedAct] = acts.splice(draggedActIdx, 1);
      acts.splice(idx, 0, draggedAct);
      handleChange('comp_actividades_v2', { ...actividades, [secKey]: acts });
    }
    setDraggedActIdx(null); setDragOverActIdx(null); setDraggedSecKey(null);
  };
  const handleDragEnd = () => { setDraggedActIdx(null); setDragOverActIdx(null); setDraggedSecKey(null); };

  // ── comp_secciones CRUD ──
  const actividades: Record<string, CompActividad[]> = draft.comp_actividades_v2 || {};

  const updateSeccion = (idx: number, field: keyof CompSeccion, val: any) => {
    const next = secciones.map((s, i) => i === idx ? { ...s, [field]: field === 'orden' ? Number(val) : val } : s);
    handleChange('comp_secciones', next);
  };
  const addSeccion = () => {
    const key = `comp_sec_${Date.now()}`;
    handleChange('comp_secciones', [...secciones, { key, label: 'Nueva Sección', color: '#6366f1', orden: secciones.length + 1, multiplicador: 1 }]);
    handleChange('comp_actividades_v2', { ...actividades, [key]: [] });
    setSeccionActiva(key);
  };
  const removeSeccion = (idx: number) => {
    const sec = secciones[idx];
    const next = secciones.filter((_, i) => i !== idx);
    handleChange('comp_secciones', next);
    const nextActs = { ...actividades };
    delete nextActs[sec.key];
    handleChange('comp_actividades_v2', nextActs);
    if (seccionActiva === sec.key) setSeccionActiva(next[0]?.key || '');
  };

  // ── comp_actividades_v2 CRUD ──
  const actsDeSeccion = (key: string): CompActividad[] => {
    const raw = (actividades as any)[key] || [];
    return raw.map((act: any) => ({ ...act, items: act.items || [] }));
  };
  const updateAct = (secKey: string, idx: number, field: string, val: any) => {
    const stringFields = ['nombre', 'id', 'linea'];
    const next = actsDeSeccion(secKey).map((a, i) =>
      i === idx ? { ...a, [field]: stringFields.includes(field) ? val : Number(val) } : a
    );
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const addAct = (secKey: string) => {
    const next = [{ id: `COMP_${Date.now()}`, nombre: 'Nueva actividad', items: [] }, ...actsDeSeccion(secKey)];
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const removeAct = (secKey: string, idx: number) => {
    const next = actsDeSeccion(secKey).filter((_, i) => i !== idx);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };

  // ── Ítems CRUD ──
  const addItem = (secKey: string, actIdx: number, insertAt?: number, parentColIdx?: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItem: ExtItem = { nombre: '', tipo: 'hasta', horas: 0, parent_col_idx: parentColIdx };
    const items = [...(act.items || [])];
    if (insertAt !== undefined && insertAt >= 0 && insertAt <= items.length) {
      items.splice(insertAt, 0, newItem);
    } else {
      items.push(newItem);
    }
    const updated = { ...act, items };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const updateItem = (secKey: string, actIdx: number, itemIdx: number, field: keyof ExtItem, val: any) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItems = (act.items || []).map((it, ii) =>
      ii === itemIdx ? { ...it, [field]: field === 'nombre' || field === 'tipo' || field === 'unidad' ? val : (val === '' ? '' : Number(val)) } : it
    );
    const next = acts.map((a, i) => i === actIdx ? { ...a, items: newItems } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const removeItem = (secKey: string, actIdx: number, itemIdx: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItems = (act.items || []).filter((_, ii) => ii !== itemIdx);
    const next = acts.map((a, i) => i === actIdx ? { ...a, items: newItems } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const reorderItems = (secKey: string, actIdx: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    if (!act.items) return;
    const items = [...act.items];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const next = acts.map((a, i) => i === actIdx ? { ...a, items } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };

  // ── Per-item column values ──
  const addItemColVal = (secKey: string, actIdx: number, itemIdx: number, colName: string) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const items = [...(act.items || [])];
    const item = { ...items[itemIdx] };
    const cv = { ...(item.col_valores || {}) };
    cv[colName] = [...(cv[colName] || []), ''];
    item.col_valores = cv;
    items[itemIdx] = item;
    const next = acts.map((a, i) => i === actIdx ? { ...a, items } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const updateItemColVal = (secKey: string, actIdx: number, itemIdx: number, colName: string, valIdx: number, val: string) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const items = [...(act.items || [])];
    const item = { ...items[itemIdx] };
    const cv = { ...(item.col_valores || {}) };
    cv[colName] = (cv[colName] || []).map((v: string, i: number) => i === valIdx ? val : v);
    item.col_valores = cv;
    items[itemIdx] = item;
    const next = acts.map((a, i) => i === actIdx ? { ...a, items } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const removeItemColVal = (secKey: string, actIdx: number, itemIdx: number, colName: string, valIdx: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const items = [...(act.items || [])];
    const item = { ...items[itemIdx] };
    const cv = { ...(item.col_valores || {}) };
    cv[colName] = (cv[colName] || []).filter((_: string, i: number) => i !== valIdx);
    item.col_valores = cv;
    items[itemIdx] = item;
    const next = acts.map((a, i) => i === actIdx ? { ...a, items } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };

  // ── Columnas a nivel de sección ──
  const ITEMS_KEY = '_items_';
  const getSeccionColumnas = (secKey: string): string[] => {
    const sec = secciones.find(s => s.key === secKey);
    const raw = sec?.columnas;
    const cols = Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string' && c.length > 0) : [];
    if (!cols.includes(ITEMS_KEY)) return [ITEMS_KEY, ...cols];
    return cols;
  };
  const seccionTieneDatos = (secKey: string): boolean => {
    const acts = actsDeSeccion(secKey);
    return acts.some(a => {
      const hasItems = (a.items || []).length > 0;
      const hasColVals = Object.values(a.columnas_valores || {}).some((v: any) => Array.isArray(v) && v.length > 0);
      const hasColMeta = Object.values(a.columnas_meta || {}).some((v: any) => Array.isArray(v) && v.length > 0);
      return hasItems || hasColVals || hasColMeta;
    });
  };
  const reorderColumnas = (secKey: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (seccionTieneDatos(secKey)) {
      alert('⚠️ No se puede cambiar el orden de las columnas cuando ya hay actividades configuradas.\n\nPara cambiar el orden, primero elimine todas las actividades y valores de esta sección.');
      return;
    }
    const cols = [...getSeccionColumnas(secKey)];
    const [moved] = cols.splice(fromIdx, 1);
    cols.splice(toIdx, 0, moved);
    const newSecs = secciones.map(s => s.key === secKey ? { ...s, columnas: cols } : s);
    handleChange('comp_secciones', newSecs);
  };
  const addColumnaSeccion = (secKey: string, nombre: string) => {
    const newSecs = secciones.map(s => {
      if (s.key !== secKey) return s;
      const existing = s.columnas || [];
      const base = existing.includes(ITEMS_KEY) ? existing : [ITEMS_KEY, ...existing];
      return { ...s, columnas: [...base, nombre] };
    });
    handleChange('comp_secciones', newSecs);
  };
  const removeColumnaSeccion = (secKey: string, colName: string) => {
    const newSecs = secciones.map(s =>
      s.key === secKey ? { ...s, columnas: (s.columnas || []).filter(c => c !== colName) } : s
    );
    handleChange('comp_secciones', newSecs);
    const acts = actsDeSeccion(secKey);
    const cleaned = acts.map(a => {
      const cv = { ...(a.columnas_valores || {}) };
      delete cv[colName];
      return { ...a, columnas_valores: cv };
    });
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: cleaned });
  };
  const renameColumnaSeccion = (secKey: string, oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const newSecs = secciones.map(s =>
      s.key === secKey ? { ...s, columnas: (s.columnas || []).map(c => c === oldName ? newName : c) } : s
    );
    handleChange('comp_secciones', newSecs);
    const acts = actsDeSeccion(secKey);
    const updated = acts.map(a => {
      const cv = { ...(a.columnas_valores || {}) };
      if (cv[oldName]) { cv[newName] = cv[oldName]; delete cv[oldName]; }
      return { ...a, columnas_valores: cv };
    });
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: updated });
  };

  // ── Column values per activity ──
  const getActColValues = (act: any, colName: string): string[] => {
    if (act.columnas_valores?.[colName]) {
      const v = act.columnas_valores[colName];
      return Array.isArray(v) ? v : [];
    }
    return [];
  };
  const addValorColumna = (secKey: string, actIdx: number, colName: string) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const vals = getActColValues(act, colName);
    const meta = act.columnas_meta?.[colName] || [];
    const updated = {
      ...act,
      columnas_valores: { ...(act.columnas_valores || {}), [colName]: [...vals, ''] },
      columnas_meta: { ...(act.columnas_meta || {}), [colName]: [...meta, { tipo: 'hasta', horas: 0 }] },
    };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const updateValorColumna = (secKey: string, actIdx: number, colName: string, valIdx: number, val: string) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const vals = getActColValues(act, colName).map((v, i) => i === valIdx ? val : v);
    const updated = { ...act, columnas_valores: { ...(act.columnas_valores || {}), [colName]: vals } };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const updateValorColumnaMeta = (secKey: string, actIdx: number, colName: string, valIdx: number, field: 'tipo' | 'horas' | 'horas_en', val: any) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const meta = [...(act.columnas_meta?.[colName] || [])];
    while (meta.length <= valIdx) meta.push({ tipo: 'hasta', horas: 0 });
    meta[valIdx] = { ...meta[valIdx], [field]: field === 'horas' ? (val === '' ? '' : Number(val)) : val };
    const updated = { ...act, columnas_meta: { ...(act.columnas_meta || {}), [colName]: meta } };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const removeValorColumna = (secKey: string, actIdx: number, colName: string, valIdx: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const vals = getActColValues(act, colName).filter((_, i) => i !== valIdx);
    const meta = (act.columnas_meta?.[colName] || []).filter((_: any, i: number) => i !== valIdx);
    const updated = {
      ...act,
      columnas_valores: { ...(act.columnas_valores || {}), [colName]: vals },
      columnas_meta: { ...(act.columnas_meta || {}), [colName]: meta },
    };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };

  // Modal confirm
  const confirmAddColumna = useCallback(() => {
    if (!colModal || !colNombre.trim()) return;
    addColumnaSeccion(colModal.secKey, colNombre.trim());
    setColModal(null);
    setColNombre('Evidencia');
  }, [colModal, colNombre, secciones]);

  // ── Render input row helper ──
  const renderInputRow = (key: string, label: string, hint: string, unit?: string) => (
    <div key={key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-300 transition-colors gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="text-[13px] font-bold text-slate-800 leading-tight">{label}</h4>
        <p className="text-[11px] text-slate-500 leading-tight">{hint}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input type="number" value={(draft[key as keyof PTARules] as number) ?? ''}
          onChange={e => handleChange(key as keyof PTARules, e.target.value)}
          className="w-20 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-lg px-3 py-2 text-center focus:ring-2 focus:ring-violet-500/20 outline-none" />
        {unit && <span className="text-xs font-bold text-slate-400 min-w-[24px] text-left">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" /> 5. Actividades Complementarias
          </h2>
          <p className="text-slate-500 text-sm mt-1 max-w-2xl">
            Catálogo de reconocimiento de horas por Actividades Complementarias a la Docencia (Tabla 14 y Anexo 1).
            <em> Tope General: 200h o 25% del PTA.</em>
          </p>
        </div>

        <div className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center gap-4 ${
          draft.comp_anexo1_validado
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3 flex-1">
            <Info className={`w-5 h-5 mt-0.5 ${draft.comp_anexo1_validado ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div>
              <h3 className={`text-sm font-black ${draft.comp_anexo1_validado ? 'text-emerald-900' : 'text-amber-900'}`}>
                Validacion contra Anexo 1
              </h3>
              <p className={`text-xs leading-relaxed ${draft.comp_anexo1_validado ? 'text-emerald-800' : 'text-amber-800'}`}>
                La Circular referencia el Anexo 1 para confirmar el detalle de horas de Complementarias. El sistema conserva los valores actuales, pero este marcador deja trazabilidad de si ya fueron cotejados contra ese anexo.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0 cursor-pointer">
            <input
              type="checkbox"
              checked={!!draft.comp_anexo1_validado}
              onChange={e => handleChange('comp_anexo1_validado', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            Catalogo cotejado
          </label>
          <input
            type="text"
            value={draft.comp_anexo1_fuente || ''}
            onChange={e => handleChange('comp_anexo1_fuente', e.target.value)}
            placeholder="Fuente/version del Anexo 1"
            className="w-full lg:w-72 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 focus:ring-2 focus:ring-violet-500/20 outline-none"
          />
        </div>

        <div className="space-y-4">
          {/* ── Tope Global — accordion React-controlled ── */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm">
            <button type="button" onClick={() => setOpen1(!open1)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl cursor-pointer border-none text-left">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Tope Global de Actividades Complementarias
              </span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open1 ? 'rotate-180' : ''}`} />
            </button>
            {open1 && (
              <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-blue-50/10">
                {renderInputRow("max_horas_complementarias_global", "Tope Global Complementarias (Horas)", "Límite máximo de horas para actividades complementarias a la docencia. Los topes por actividad se configuran abajo en cada sección.", "h")}
                {renderInputRow("max_pct_complementarias", "Máximo % Complementarias", "Tasa máxima porcentual permitida para actividades complementarias.", "%")}
              </div>
            )}
          </div>

          {/* ── Secciones y Actividades ── */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm">
            <button type="button" onClick={() => setOpen2(!open2)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl cursor-pointer border-none text-left">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs">2</span>
                Secciones y Actividades Complementarias
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{secciones.length} secciones</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open2 ? 'rotate-180' : ''}`} />
            </button>

            {open2 && (
              <div className="p-6 border-t border-slate-100 space-y-6">
              {/* ── Guía contextual ── */}
              <div className="bg-gradient-to-r from-blue-50/80 to-violet-50/50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  📋 Define las secciones de actividades complementarias y las actividades disponibles en cada una. Los cambios se guardan con el botón "Guardar Configuración".
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold mt-0.5">⚡</span>
                    <span><b className="text-slate-600">Orden de columnas:</b> La primera columna define la jerarquía y controla la asignación de horas. Arrastre para reordenar.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold mt-0.5">📋</span>
                    <span><b className="text-slate-600">Si Actividad/Ítem va primero:</b> cada actividad recibe su tipo y horas directamente.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-violet-500 font-bold mt-0.5">🔀</span>
                    <span><b className="text-slate-600">Si otra columna va primero</b> (ej. Línea): puede elegir si las horas van en la Línea o en cada Actividad dentro.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-400 font-bold mt-0.5">🔒</span>
                    <span><b className="text-slate-600">Reordenar bloqueado:</b> Si ya hay datos configurados, debe limpiar la jerarquía antes de cambiar el orden.</span>
                  </div>
                </div>
              </div>

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
                  <div className="flex flex-row items-end gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Etiqueta</label>
                      <input type="text" value={sec.label}
                        onChange={e => updateSeccion(idx, 'label', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                    </div>
                    <div className="w-36 shrink-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Clave (key)</label>
                      <input type="text" value={sec.key} disabled
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 font-mono text-xs rounded-lg px-3 py-2 cursor-not-allowed" />
                    </div>
                    <div className="shrink-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={sec.color}
                          onChange={e => updateSeccion(idx, 'color', e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white" />
                        <span className="text-xs font-mono text-slate-500">{sec.color}</span>
                      </div>
                    </div>
                    {(sec.multiplicador ?? 1) > 1 && (
                      <div className="shrink-0">
                        <label className="block text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-1" title="Factor de conversión">×Factor</label>
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 h-[34px]">
                          <input type="number" value={sec.multiplicador ?? 1} min={1} max={10} step={1}
                            onChange={e => updateSeccion(idx, 'multiplicador', Number(e.target.value) || 1)}
                            className="w-12 bg-white border border-amber-200 text-amber-700 font-bold text-sm rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-amber-500/20 outline-none" />
                          <span className="text-xs text-amber-600 font-bold">×h</span>
                        </div>
                      </div>
                    )}
                    <div className="shrink-0">
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

                    {/* ── Columnas de la sección ── */}
                    {(() => {
                      const secCols = getSeccionColumnas(sec.key);
                      const isLocked = seccionTieneDatos(sec.key);
                      const firstCol = secCols.find(c => !!c) || '';
                      const firstIsItems = firstCol === ITEMS_KEY;
                      return (
                        <div className="mb-3 px-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {secCols.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Columnas:</span>
                            )}
                            {secCols.length > 1 && (
                              <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                                ⚡ La 1ª columna ({firstIsItems ? 'Actividad/Ítem' : firstCol}) controla las horas
                              </span>
                            )}
                            {isLocked && (
                              <span className="text-[9px] bg-red-50 text-red-500 border border-red-200 rounded-full px-2 py-0.5 font-medium flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Orden bloqueado (hay datos configurados)
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                          {secCols.map((colName, ci) => {
                            const isItemsChip = colName === ITEMS_KEY;
                            return (
                            <div key={`col-chip-${ci}`}
                              draggable={!isLocked}
                              onDragStart={e => { if (isLocked) { e.preventDefault(); return; } setDragColIdx(ci); setDragColSecKey(sec.key); e.dataTransfer.effectAllowed = 'move'; }}
                              onDragOver={e => { e.preventDefault(); if (dragColSecKey === sec.key) setDragOverColIdx(ci); }}
                              onDrop={e => { e.preventDefault(); if (dragColIdx !== null && dragColSecKey === sec.key) { reorderColumnas(sec.key, dragColIdx, ci); } setDragColIdx(null); setDragOverColIdx(null); setDragColSecKey(null); }}
                              onDragEnd={() => { setDragColIdx(null); setDragOverColIdx(null); setDragColSecKey(null); }}
                              className={`flex items-center gap-1 rounded-lg pl-1.5 pr-1 py-1 group ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} select-none transition-all ${
                                dragColIdx === ci && dragColSecKey === sec.key
                                  ? `opacity-40 scale-95 ${isItemsChip ? 'bg-violet-100 border border-violet-300' : 'bg-blue-100 border border-blue-300'}`
                                  : dragOverColIdx === ci && dragColSecKey === sec.key && dragColIdx !== ci
                                    ? `${isItemsChip ? 'bg-violet-100 border-2 border-violet-400' : 'bg-blue-100 border-2 border-blue-400'} shadow-md`
                                    : isItemsChip
                                      ? 'bg-violet-50 border border-violet-200 hover:border-violet-300'
                                      : 'bg-blue-50 border border-blue-200 hover:border-blue-300'
                              }`}>
                              {isLocked ? (
                                <Lock className={`w-3 h-3 ${isItemsChip ? 'text-violet-300' : 'text-blue-300'} shrink-0`} />
                              ) : (
                                <GripVertical className={`w-3.5 h-3.5 ${isItemsChip ? 'text-violet-300' : 'text-blue-300'} shrink-0 cursor-grab`} />
                              )}
                              {isItemsChip ? (
                                <>
                                  <Globe className="w-3 h-3 text-violet-400 shrink-0" />
                                  <span className="text-[11px] font-semibold text-violet-700 px-0.5">Actividad / Ítem</span>
                                </>
                              ) : (
                                <>
                                  <Tag className="w-3 h-3 text-blue-400 shrink-0" />
                                  <input type="text" draggable={false} value={colName}
                                    onChange={e => { if (e.target.value.trim()) renameColumnaSeccion(sec.key, colName, e.target.value); }}
                                    onBlur={e => { if (!e.target.value.trim()) e.target.value = colName; }}
                                    className="bg-transparent text-[11px] font-semibold text-blue-700 outline-none border-none w-auto min-w-[40px] max-w-[120px]"
                                    style={{ width: `${Math.max(40, colName.length * 7)}px` }}
                                    onMouseDown={e => e.stopPropagation()} />
                                  <button onClick={() => removeColumnaSeccion(sec.key, colName)}
                                    className="w-4 h-4 rounded flex items-center justify-center text-blue-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                            );
                          })}
                          <button onClick={() => { setColModal({ secKey: sec.key, actIdx: 0 }); setColNombre('Evidencia'); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[11px] font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors bg-white">
                            <Plus className="w-3 h-3" /> Columna
                          </button>
                          </div>
                          {secCols.length > 0 && (
                            <div className="text-[9px] text-slate-400 leading-tight pl-1 mt-1">
                              💡 <b>Orden importante:</b> La primera columna define la jerarquía y recibe las horas.
                              {firstIsItems && ' Cada actividad tiene su propio tipo y horas.'}
                              {' '} • <b>Tipos:</b> 🟢 Fija (exacta), 🕒 Hasta (máximo), 📊 Intervalo (min—máx).
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Activity cards ── */}
                    {actsDeSeccion(sec.key).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Calculator className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Sin actividades. Agrega la primera.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actsDeSeccion(sec.key).map((act, aIdx) => {
                          if (!act) return null;
                          const isEtapa = Array.isArray(act.items);
                          const hasItems = isEtapa && (act.items?.length ?? 0) > 0;
                          return (
                            <div key={act.id} draggable
                              onDragStart={(e) => handleDragStart(e, sec.key, aIdx)}
                              onDragOver={(e) => handleDragOver(e, sec.key, aIdx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, sec.key, aIdx)}
                              onDragEnd={handleDragEnd}
                              className={`border rounded-xl overflow-hidden shadow-sm transition-all bg-white
                                ${draggedActIdx === aIdx && draggedSecKey === sec.key ? 'opacity-40 border-dashed border-blue-400' : ''}
                                ${dragOverActIdx === aIdx && draggedSecKey === sec.key ? 'border-blue-500 shadow-blue-500/20 shadow-md scale-[1.01]' : 'border-slate-200'}
                              `}>
                              {/* ── Cabecera de Actividad ── */}
                              <div className="flex flex-row items-center gap-3 p-3 bg-slate-50 border-b border-slate-100">
                                <input
                                  type="text"
                                  key={`pos-${act.id}-${aIdx}`}
                                  defaultValue={aIdx + 1}
                                  title={`Posición ${aIdx + 1}`}
                                  onFocus={e => e.target.select()}
                                  onBlur={e => {
                                    const val = parseInt(e.target.value, 10);
                                    const max = actsDeSeccion(sec.key).length;
                                    const newPos = isNaN(val) ? aIdx + 1 : Math.max(1, Math.min(max, val));
                                    e.target.value = String(aIdx + 1);
                                    if (newPos !== aIdx + 1) {
                                      const acts = [...actsDeSeccion(sec.key)];
                                      const [moved] = acts.splice(aIdx, 1);
                                      acts.splice(newPos - 1, 0, moved);
                                      handleChange('comp_actividades_v2', { ...actividades, [sec.key]: acts });
                                    }
                                  }}
                                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                  className="w-10 h-10 rounded-xl text-white font-black text-sm shrink-0 shadow-sm border-2 border-white/30 outline-none text-center cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all"
                                  style={{ background: sec.color, padding: 0 }}
                                />
                                <div className="w-28 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID</span>
                                  <input type="text" value={act.id}
                                    onChange={e => updateAct(sec.key, aIdx, 'id', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-500 font-mono text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                    {isEtapa ? 'Etapa' : 'Nombre'}
                                  </span>
                                  <input type="text" value={act.nombre}
                                    onChange={e => updateAct(sec.key, aIdx, 'nombre', e.target.value)}
                                    placeholder="Nombre de la actividad..."
                                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                </div>
                                {/* Total Horas */}
                                {(() => {
                                  const total = (act.items || []).reduce((sum: number, item: any) => sum + (Number(item.horas) || 0), 0);
                                  return total > 0 || isEtapa ? (
                                    <div className="shrink-0">
                                      <span className="text-[10px] font-bold text-[#003DA5] uppercase block mb-1">Total Horas</span>
                                      <div className="flex items-center justify-center bg-blue-50/50 border border-blue-200 text-[#003DA5] font-extrabold text-[13px] rounded-lg px-3 py-1.5 h-[34px] min-w-[70px]">
                                        {total}h
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                <button onClick={() => removeAct(sec.key, aIdx)}
                                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm self-end">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {/* ── Columnas content ── */}
                              {(() => {
                                try {
                                const secCols = getSeccionColumnas(sec.key) || [];
                                const firstColName = secCols.find(c => !!c) || '';
                                const isItemsPrivileged = firstColName === ITEMS_KEY;
                                return secCols.map((colName) => {
                                  if (!colName) return null;

                                  // ─ Bloque Actividad / Ítem ─
                                  if (colName === ITEMS_KEY) {
                                    if (!isItemsPrivileged && firstColName) return null;
                                    const showItemHoras = isItemsPrivileged;
                                    return isEtapa ? (
                                      <div key="__items__" className="bg-white">
                                        {hasItems && (
                                          <div className="p-3 pt-2 space-y-1">
                                            <div className="flex flex-row gap-2 px-1 mb-1">
                                              <span className="w-3.5 shrink-0" />
                                              <span className="flex-1 text-[10px] font-bold text-slate-400 uppercase">Actividad / Ítem</span>
                                              {showItemHoras && <span className="w-24 shrink-0 text-[10px] font-bold text-slate-400 uppercase">Tipo</span>}
                                              {showItemHoras && <span className="w-20 shrink-0 text-[10px] font-bold text-slate-400 uppercase">Horas</span>}
                                              <span className="w-7 shrink-0" />
                                            </div>
                                            {(act.items || []).map((item, iIdx) => {
                                              const itemDragKey = `${sec.key}:${aIdx}`;
                                              return (
                                              <div key={iIdx} className="space-y-1">
                                                <div draggable
                                                  onDragStart={e => { e.stopPropagation(); setDragItemIdx(iIdx); setDragItemKey(itemDragKey); e.dataTransfer.effectAllowed = 'move'; }}
                                                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (dragItemKey === itemDragKey) setDragOverItemIdx(iIdx); }}
                                                  onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragItemIdx !== null && dragItemKey === itemDragKey) { reorderItems(sec.key, aIdx, dragItemIdx, iIdx); } setDragItemIdx(null); setDragOverItemIdx(null); setDragItemKey(null); }}
                                                  onDragEnd={() => { setDragItemIdx(null); setDragOverItemIdx(null); setDragItemKey(null); }}
                                                  className={`flex flex-row items-center gap-2 p-2 rounded-lg border transition-all select-none ${
                                                    dragItemIdx === iIdx && dragItemKey === itemDragKey
                                                      ? 'opacity-40 scale-[0.98] bg-violet-50 border-violet-200'
                                                      : dragOverItemIdx === iIdx && dragItemKey === itemDragKey && dragItemIdx !== iIdx
                                                        ? 'bg-violet-50 border-2 border-violet-400 shadow-md'
                                                        : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                                  }`}>
                                                  <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0 cursor-grab" />
                                                  <div className="flex-1 min-w-0">
                                                    <input type="text" value={item.nombre} draggable={false}
                                                      onChange={e => updateItem(sec.key, aIdx, iIdx, 'nombre', e.target.value)}
                                                      placeholder="Nombre de la actividad..."
                                                      className="w-full bg-white border border-slate-200 text-slate-700 text-[12px] rounded-md px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                                  </div>
                                                  {showItemHoras && (
                                                    <div className="w-24 shrink-0">
                                                      <select value={item.tipo}
                                                        onChange={e => updateItem(sec.key, aIdx, iIdx, 'tipo', e.target.value)}
                                                        className="w-full bg-white border border-slate-200 text-slate-700 text-[11px] rounded-md px-1.5 py-1.5 outline-none">
                                                        <option value="fija">🟢 Fija</option>
                                                        <option value="hasta">🕒 Hasta</option>
                                                        <option value="intervalo">📊 Intervalo</option>
                                                      </select>
                                                    </div>
                                                  )}
                                                  {showItemHoras && (
                                                    item.tipo === 'intervalo' ? (
                                                      <div className="shrink-0 flex items-center gap-1">
                                                        <input type="number" value={(item as any).horas_min ?? ''} min={0}
                                                          onChange={e => updateItem(sec.key, aIdx, iIdx, 'horas_min', e.target.value)}
                                                          className="w-14 bg-white border border-blue-200 text-blue-700 font-bold text-[11px] rounded-md px-1 py-1.5 text-center outline-none" title="Mínimo" />
                                                        <span className="text-[9px] text-slate-400 font-bold">—</span>
                                                        <input type="number" value={item.horas ?? ''} min={0}
                                                          onChange={e => updateItem(sec.key, aIdx, iIdx, 'horas', e.target.value)}
                                                          className="w-14 bg-white border border-amber-200 text-amber-700 font-bold text-[11px] rounded-md px-1 py-1.5 text-center outline-none" title="Máximo" />
                                                        <span className="text-[9px] text-amber-500 font-bold">h</span>
                                                      </div>
                                                    ) : (
                                                      <div className="shrink-0 flex items-center gap-1">
                                                        <input type="number" value={item.horas ?? ''} min={0}
                                                          onChange={e => updateItem(sec.key, aIdx, iIdx, 'horas', e.target.value)}
                                                          className="w-16 bg-white border border-slate-200 text-slate-700 font-bold text-[12px] rounded-md px-2 py-1.5 text-center outline-none" />
                                                        <span className="text-[9px] text-amber-500 font-bold">h</span>
                                                      </div>
                                                    )
                                                  )}
                                                  <button onClick={() => removeItem(sec.key, aIdx, iIdx)}
                                                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>

                                                {/* Per-item column values (evidencias etc) */}
                                                {(() => {
                                                  const itemsPos = secCols.indexOf(ITEMS_KEY);
                                                  const subCols = secCols.slice(itemsPos + 1).filter(c => c && c !== ITEMS_KEY);
                                                  return subCols.map(subCol => {
                                                    const itemColVals = item.col_valores || {};
                                                    const vals = itemColVals[subCol] || [];
                                                    return (
                                                      <div key={subCol} className="ml-8 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                          <span className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1">
                                                            <Tag className="w-2.5 h-2.5" /> {subCol}
                                                          </span>
                                                          <button onClick={() => addItemColVal(sec.key, aIdx, iIdx, subCol)}
                                                            className="text-[10px] text-blue-500 font-semibold flex items-center gap-0.5 hover:text-blue-700">
                                                            + Agregar
                                                          </button>
                                                        </div>
                                                        {vals.map((v: string, vi: number) => (
                                                          <div key={vi} className="flex items-center gap-1.5">
                                                            <input type="text" value={v}
                                                              onChange={e => updateItemColVal(sec.key, aIdx, iIdx, subCol, vi, e.target.value)}
                                                              placeholder={`${subCol}...`}
                                                              className="flex-1 bg-white border border-blue-100 text-slate-600 text-[11px] rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                            <button onClick={() => removeItemColVal(sec.key, aIdx, iIdx, subCol, vi)}
                                                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                                                              <X className="w-3 h-3" />
                                                            </button>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    );
                                                  });
                                                })()}
                                              </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        {/* Add item button */}
                                        <div className="p-2 border-t border-slate-100">
                                          <button onClick={() => addItem(sec.key, aIdx)}
                                            className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-slate-200 text-[11px] text-slate-400 font-semibold hover:border-violet-400 hover:text-violet-600 transition-colors">
                                            <Plus className="w-3 h-3" /> Agregar ítem
                                          </button>
                                        </div>
                                      </div>
                                    ) : null;
                                  }

                                  // ─ Bloque columna regular (Línea, Evidencia, etc.) ─
                                  const colVals = getActColValues(act, colName);
                                  const isFirst = colName === firstColName;
                                  const colMeta = act.columnas_meta?.[colName] || [];
                                  return (
                                    <div key={colName} className="bg-white border-t border-slate-100">
                                      <div className="p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1.5">
                                            <Tag className="w-3 h-3" /> {colName}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            {isFirst && <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5 font-medium">Horas ⚡</span>}
                                            <button onClick={() => addValorColumna(sec.key, aIdx, colName)}
                                              className="text-[10px] text-blue-500 font-semibold flex items-center gap-0.5 hover:text-blue-700">
                                              + Agregar
                                            </button>
                                          </div>
                                        </div>
                                        {colVals.map((val, vIdx) => {
                                          const meta = colMeta[vIdx] || {};
                                          const horasEn = (meta as any).horas_en || 'linea';
                                          // Items belonging to this first-col value
                                          const childItems = isFirst ? (act.items || []).filter((it: any, itIdx: number) => it.parent_col_idx === vIdx || (it.parent_col_idx === undefined && vIdx === 0)) : [];
                                          return (
                                            <div key={vIdx} className="space-y-1.5">
                                              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <input type="text" value={val}
                                                  onChange={e => updateValorColumna(sec.key, aIdx, colName, vIdx, e.target.value)}
                                                  placeholder={`${colName}...`}
                                                  className="flex-1 bg-white border border-slate-200 text-slate-700 text-[12px] rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                {isFirst && (
                                                  <>
                                                    <select value={(meta as any).tipo || 'hasta'}
                                                      onChange={e => updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'tipo', e.target.value)}
                                                      className="bg-white border border-slate-200 text-[11px] rounded-md px-1 py-1.5 outline-none">
                                                      <option value="fija">🟢 Fija</option>
                                                      <option value="hasta">🕒 Hasta</option>
                                                      <option value="intervalo">📊 Intervalo</option>
                                                    </select>
                                                    <input type="number" value={(meta as any).horas ?? ''} min={0}
                                                      onChange={e => updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'horas', e.target.value)}
                                                      className="w-16 bg-white border border-amber-200 text-amber-700 font-bold text-[12px] rounded-md px-2 py-1.5 text-center outline-none" />
                                                    <span className="text-[10px] text-amber-500 font-bold">h</span>
                                                  </>
                                                )}
                                                <button onClick={() => removeValorColumna(sec.key, aIdx, colName, vIdx)}
                                                  className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </div>
                                              {/* Horas En toggle + nested items */}
                                              {isFirst && (
                                                <div className="ml-4 space-y-1">
                                                  <div className="flex items-center gap-2 text-[9px]">
                                                    <span className="text-slate-400 font-bold">Horas en:</span>
                                                    <button onClick={() => updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'horas_en', 'linea')}
                                                      className={`px-2 py-0.5 rounded-full font-bold transition-colors ${horasEn === 'linea' ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                      🔵 {colName}
                                                    </button>
                                                    <button onClick={() => updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'horas_en', 'actividad')}
                                                      className={`px-2 py-0.5 rounded-full font-bold transition-colors ${horasEn === 'actividad' ? 'bg-violet-100 text-violet-700 border border-violet-300' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                                      ⚡ Actividad
                                                    </button>
                                                    <span className="text-slate-400 italic">
                                                      {horasEn === 'linea' ? `Horas configuradas a nivel de ${colName}` : 'Horas distribuidas en actividades'}
                                                    </span>
                                                  </div>
                                                  {/* Nested items when horas_en === 'actividad' */}
                                                  {horasEn === 'actividad' && (
                                                    <div className="space-y-1 pl-2 border-l-2 border-violet-100">
                                                      <span className="text-[9px] font-bold text-violet-500 uppercase">Actividad / Ítem</span>
                                                      {childItems.map((cItem: any, ciIdx: number) => {
                                                        const realIdx = (act.items || []).indexOf(cItem);
                                                        return (
                                                          <div key={ciIdx} className="flex items-center gap-2 p-1.5 rounded-lg bg-violet-50/30 border border-violet-100">
                                                            <input type="text" value={cItem.nombre}
                                                              onChange={e => updateItem(sec.key, aIdx, realIdx, 'nombre', e.target.value)}
                                                              placeholder="Nombre..."
                                                              className="flex-1 bg-white border border-slate-200 text-slate-700 text-[11px] rounded-md px-2 py-1 outline-none" />
                                                            <select value={cItem.tipo}
                                                              onChange={e => updateItem(sec.key, aIdx, realIdx, 'tipo', e.target.value)}
                                                              className="bg-white border border-slate-200 text-[10px] rounded-md px-1 py-1 outline-none">
                                                              <option value="fija">🟢 Fija</option>
                                                              <option value="hasta">🕒 Hasta</option>
                                                              <option value="intervalo">📊 Intervalo</option>
                                                            </select>
                                                            <input type="number" value={cItem.horas ?? ''} min={0}
                                                              onChange={e => updateItem(sec.key, aIdx, realIdx, 'horas', e.target.value)}
                                                              className="w-14 bg-white border border-amber-200 text-amber-700 font-bold text-[11px] rounded-md px-1 py-1 text-center outline-none" />
                                                            <span className="text-[9px] text-amber-500 font-bold">h</span>
                                                            <button onClick={() => removeItem(sec.key, aIdx, realIdx)}
                                                              className="w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500">
                                                              <X className="w-3 h-3" />
                                                            </button>
                                                          </div>
                                                        );
                                                      })}
                                                      <button onClick={() => addItem(sec.key, aIdx, undefined, vIdx)}
                                                        className="w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed border-violet-200 text-[10px] text-violet-400 font-semibold hover:border-violet-400 hover:text-violet-600 transition-colors">
                                                        <Plus className="w-2.5 h-2.5" /> Agregar actividad
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                });
                                } catch { return null; }
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Modal: Agregar Columna ── */}
      {colModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-sm space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Columns3 className="w-4 h-4 text-blue-500" /> Agregar Columna
            </h3>
            <p className="text-[11px] text-slate-500">
              Escribe el nombre de la columna (ej: Evidencia, Línea, Componente).
            </p>
            <input ref={colInputRef} type="text" value={colNombre}
              onChange={e => setColNombre(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmAddColumna(); if (e.key === 'Escape') setColModal(null); }}
              placeholder="Nombre de la columna..."
              className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 outline-none" />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setColModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmAddColumna}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm">
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
