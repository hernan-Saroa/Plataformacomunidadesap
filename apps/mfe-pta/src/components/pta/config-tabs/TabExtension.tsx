import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Users, ChevronDown, Plus, Trash2, Globe, GripVertical, X, Columns3, Tag, Lock } from 'lucide-react';
import { PTARules, ExtItem } from '../ConfiguracionReglasPTA';

type ExtSeccion = PTARules['ext_secciones'][number];
type ExtActividad = PTARules['ext_actividades'][string][number];

export function TabExtension({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const [open1, setOpen1] = useState(true);   // Tope Global accordion
  const [open2, setOpen2] = useState(true);   // Secciones y Actividades accordion
  const [seccionActiva, setSeccionActiva] = useState<string>('capacitacion'); // pestaña activa
  
  // ── Drag & Drop State ──
  const [draggedActIdx, setDraggedActIdx] = useState<number | null>(null);
  const [dragOverActIdx, setDragOverActIdx] = useState<number | null>(null);
  const [draggedSecKey, setDraggedSecKey] = useState<string | null>(null);

  // ── Drag & Drop columnas ──
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);
  const [dragColSecKey, setDragColSecKey] = useState<string | null>(null);

  // ── Drag & Drop ítems ──
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);
  const [dragItemKey, setDragItemKey] = useState<string | null>(null); // "secKey:actIdx"

  // ── Modal \"Agregar columna\" ──
  const [colModal, setColModal] = useState<{ secKey: string; actIdx: number } | null>(null);
  const [colNombre, setColNombre] = useState('Evidencia');
  const colInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (colModal && colInputRef.current) { colInputRef.current.focus(); colInputRef.current.select(); } }, [colModal]);

  const handleDragStart = (e: React.DragEvent, secKey: string, idx: number) => {
    setDraggedSecKey(secKey);
    setDraggedActIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent, secKey: string, idx: number) => {
    e.preventDefault();
    if (draggedSecKey === secKey) setDragOverActIdx(idx);
  };
  
  const handleDragLeave = () => setDragOverActIdx(null);
  
  const handleDrop = (e: React.DragEvent, secKey: string, idx: number) => {
    e.preventDefault();
    if (draggedSecKey === secKey && draggedActIdx !== null && draggedActIdx !== idx) {
      const acts = [...actsDeSeccion(secKey)];
      const [draggedAct] = acts.splice(draggedActIdx, 1);
      acts.splice(idx, 0, draggedAct);
      handleChange('ext_actividades', { ...actividades, [secKey]: acts });
    }
    setDraggedActIdx(null);
    setDragOverActIdx(null);
    setDraggedSecKey(null);
  };

  const handleDragEnd = () => {
    setDraggedActIdx(null);
    setDragOverActIdx(null);
    setDraggedSecKey(null);
  };

  // ── ext_secciones CRUD ──────────────────────────────────────────────
  const secciones: ExtSeccion[] = draft.ext_secciones || [];
  const actividades: Record<string, ExtActividad[]> = draft.ext_actividades || {};

  const updateSeccion = (idx: number, field: keyof ExtSeccion, val: any) => {
    const next = secciones.map((s, i) => i === idx ? { ...s, [field]: field === 'orden' ? Number(val) : val } : s);
    handleChange('ext_secciones', next);
  };
  const addSeccion = () => {
    const key = `seccion_${Date.now()}`;
    handleChange('ext_secciones', [...secciones, { key, label: 'Nueva Sección', color: '#6366f1', orden: secciones.length + 1, multiplicador: 1 }]);
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

  // ── ext_actividades CRUD ──────────────────────────────────────────
  const actsDeSeccion = (key: string): ExtActividad[] => {
    const raw = (actividades as any)[key] || [];
    if (key === 'capacitacion') return raw;
    return raw.map((act: any) => ({
      ...act,
      items: act.items || []
    }));
  };

  const updateAct = (secKey: string, idx: number, field: string, val: any) => {
    const stringFields = ['nombre', 'id', 'linea'];
    const next = actsDeSeccion(secKey).map((a, i) =>
      i === idx ? { ...a, [field]: stringFields.includes(field) ? val : Number(val) } : a
    );
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const addAct = (secKey: string) => {
    const next = [{ id: `ACT_${Date.now()}`, nombre: 'Nueva etapa', items: [] }, ...actsDeSeccion(secKey)];
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const removeAct = (secKey: string, idx: number) => {
    const next = actsDeSeccion(secKey).filter((_, i) => i !== idx);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };

  // ── Ítems dentro de una actividad (etapa) CRUD ────────────────────────
  const addItem = (secKey: string, actIdx: number, insertAt?: number, parentColIdx?: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItem: ExtItem = { nombre: '', tipo: 'fija', horas: 0, parent_col_idx: parentColIdx };
    const items = [...(act.items || [])];
    if (insertAt !== undefined && insertAt >= 0 && insertAt <= items.length) {
      items.splice(insertAt, 0, newItem);
    } else {
      items.push(newItem);
    }
    const updated = { ...act, items };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const updateItem = (secKey: string, actIdx: number, itemIdx: number, field: keyof ExtItem, val: any) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItems = (act.items || []).map((it, ii) =>
      ii === itemIdx
        ? { ...it, [field]: field === 'nombre' || field === 'tipo' || field === 'unidad' ? val : (val === '' ? '' : Number(val)) }
        : it
    );
    const updated = { ...act, items: newItems };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const removeItem = (secKey: string, actIdx: number, itemIdx: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItems = (act.items || []).filter((_, ii) => ii !== itemIdx);
    const updated = { ...act, items: newItems };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  // Reordenar ítems dentro de una actividad
  const reorderItems = (secKey: string, actIdx: number, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    if (!act.items) return;
    const items = [...act.items];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    const updated = { ...act, items };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  // ── Per-item column values (evidencias per activity) ──
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
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
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
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
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
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  // ── Columnas a nivel de sección ────────────────────────────────────────
  const ITEMS_KEY = '_items_'; // sentinel for the Actividad/Ítem block
  const getSeccionColumnas = (secKey: string): string[] => {
    const sec = secciones.find(s => s.key === secKey);
    const raw = sec?.columnas;
    // Ensure cols is always a clean array of strings
    const cols = Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string' && c.length > 0) : [];
    // Auto-include _items_ if not present (migration/first time)
    if (!cols.includes(ITEMS_KEY)) return [ITEMS_KEY, ...cols];
    return cols;
  };
  // Check if a section has configured data (items, column values, meta)
  const seccionTieneDatos = (secKey: string): boolean => {
    const acts = actsDeSeccion(secKey);
    return acts.some(a => {
      const hasItems = (a.items || []).length > 0;
      const hasColVals = Object.values(a.columnas_valores || {}).some((v: any) => Array.isArray(v) && v.length > 0);
      const hasColMeta = Object.values(a.columnas_meta || {}).some((v: any) => Array.isArray(v) && v.length > 0);
      return hasItems || hasColVals || hasColMeta;
    });
  };

  // Reordenar columnas arrastrando
  const reorderColumnas = (secKey: string, fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    // Block reorder if data exists
    if (seccionTieneDatos(secKey)) {
      alert('⚠️ No se puede cambiar el orden de las columnas cuando ya hay actividades, líneas o evidencias configuradas.\n\nPara cambiar el orden, primero elimine todas las actividades y valores de esta sección.');
      return;
    }
    const cols = [...getSeccionColumnas(secKey)];
    const [moved] = cols.splice(fromIdx, 1);
    cols.splice(toIdx, 0, moved);
    const newSecs = secciones.map(s => s.key === secKey ? { ...s, columnas: cols } : s);
    handleChange('ext_secciones', newSecs);
  };

  // Agregar columna a la sección
  const addColumnaSeccion = (secKey: string, nombre: string) => {
    const newSecs = secciones.map(s => {
      if (s.key !== secKey) return s;
      const existing = s.columnas || [];
      // Ensure _items_ is in the list
      const base = existing.includes(ITEMS_KEY) ? existing : [ITEMS_KEY, ...existing];
      return { ...s, columnas: [...base, nombre] };
    });
    handleChange('ext_secciones', newSecs);
  };
  // Eliminar columna de la sección (y limpiar valores de todas las actividades)
  const removeColumnaSeccion = (secKey: string, colName: string) => {
    const newSecs = secciones.map(s =>
      s.key === secKey ? { ...s, columnas: (s.columnas || []).filter(c => c !== colName) } : s
    );
    handleChange('ext_secciones', newSecs);
    // Limpiar valores de esa columna en todas las actividades de la sección
    const acts = actsDeSeccion(secKey);
    const cleaned = acts.map(a => {
      const cv = { ...(a.columnas_valores || {}) };
      delete cv[colName];
      return { ...a, columnas_valores: cv };
    });
    handleChange('ext_actividades', { ...actividades, [secKey]: cleaned });
  };
  // Renombrar columna en la sección
  const renameColumnaSeccion = (secKey: string, oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    const newSecs = secciones.map(s =>
      s.key === secKey ? { ...s, columnas: (s.columnas || []).map(c => c === oldName ? newName : c) } : s
    );
    handleChange('ext_secciones', newSecs);
    // Renombrar key en valores de todas las actividades
    const acts = actsDeSeccion(secKey);
    const updated = acts.map(a => {
      const cv = { ...(a.columnas_valores || {}) };
      if (cv[oldName]) {
        cv[newName] = cv[oldName];
        delete cv[oldName];
      }
      return { ...a, columnas_valores: cv };
    });
    handleChange('ext_actividades', { ...actividades, [secKey]: updated });
  };

  // ── Valores de columna por actividad ──
  const getActColValues = (act: any, colName: string): string[] => {
    // 1. Check new columnas_valores
    if (act.columnas_valores?.[colName]) {
      const v = act.columnas_valores[colName];
      return Array.isArray(v) ? v : [];
    }
    // 2. Migrate legacy per-activity columnas
    if (Array.isArray(act.columnas)) {
      const legacy = act.columnas.find((c: any) => c.nombre === colName);
      if (legacy) return Array.isArray(legacy.valores) ? legacy.valores : [];
    }
    // 3. Migrate legacy evidencias
    if (colName === 'Evidencia' && Array.isArray(act.evidencias) && act.evidencias.length > 0) return act.evidencias;
    // 4. Migrate legacy linea
    if (colName === 'Línea' && act.linea !== undefined) return [act.linea || ''];
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
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const updateValorColumna = (secKey: string, actIdx: number, colName: string, valIdx: number, val: string) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const vals = getActColValues(act, colName).map((v, i) => i === valIdx ? val : v);
    const updated = { ...act, columnas_valores: { ...(act.columnas_valores || {}), [colName]: vals } };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };
  const updateValorColumnaMeta = (secKey: string, actIdx: number, colName: string, valIdx: number, field: 'tipo' | 'horas', val: any) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const meta = [...(act.columnas_meta?.[colName] || [])];
    // Ensure meta array is long enough
    while (meta.length <= valIdx) meta.push({ tipo: 'hasta', horas: 0 });
    meta[valIdx] = { ...meta[valIdx], [field]: field === 'horas' ? Number(val) || 0 : val };
    const updated = { ...act, columnas_meta: { ...(act.columnas_meta || {}), [colName]: meta } };
    const next = acts.map((a, i) => i === actIdx ? updated : a);
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
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
    handleChange('ext_actividades', { ...actividades, [secKey]: next });
  };

  // Modal confirm — now adds column to section, not activity
  const confirmAddColumna = useCallback(() => {
    if (colModal && colNombre.trim()) {
      addColumnaSeccion(colModal.secKey, colNombre.trim());
      setColModal(null);
      setColNombre('Evidencia');
    }
  }, [colModal, colNombre]);

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
          {/* ── Tope Global — accordion React-controlled ── */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm">
            <button type="button" onClick={() => setOpen1(!open1)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl cursor-pointer border-none text-left">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">1</span>
                Tope Global de Extensión
              </span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open1 ? 'rotate-180' : ''}`} />
            </button>
            {open1 && (
              <div className="p-4 border-t border-slate-100 flex flex-col gap-3 bg-blue-50/10">
                {renderInputRow("max_horas_extension_global", "Tope Global Extensión (Horas)", "Límite máximo global de horas de extensión. Este valor gobierna el formulario y la validación backend; el alias anterior se sincroniza automáticamente.", "h")}
                {renderInputRow("max_pct_extension", "Máximo % Extensión", "Límite porcentual sobre el PTA total (Circular §3).", "%")}
              </div>
            )}
          </div>

          {/* ── Secciones y Actividades — accordion React-controlled ── */}
          <div className="border border-slate-200 rounded-2xl bg-white shadow-sm">
            <button type="button" onClick={() => setOpen2(!open2)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-2xl cursor-pointer border-none text-left">
              <span className="font-bold text-slate-800 flex items-center gap-3">
                <span className="w-6 h-6 rounded bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xs">2</span>
                Secciones y Actividades de Extensión
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{secciones.length} secciones</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open2 ? 'rotate-180' : ''}`} />
            </button>

            {open2 && (
              <div className="p-6 border-t border-slate-100 space-y-6">
              <div className="bg-gradient-to-r from-blue-50/80 to-violet-50/50 border border-blue-100 rounded-xl p-4 space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  📋 Define las secciones de extensión que verá el docente en el formulario PTA y las actividades disponibles en cada una. Los cambios se guardan con el botón "Guardar Configuración".
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
                  {/* Metadatos de la sección: Etiqueta, Clave (read-only), Color, [Multiplicador si >1], Eliminar */}
                  <div className="flex flex-row items-end gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    {/* Etiqueta — ocupa el espacio restante */}
                    <div className="flex-1 min-w-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Etiqueta</label>
                      <input type="text" value={sec.label}
                        onChange={e => updateSeccion(idx, 'label', e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                    </div>
                    {/* Clave (key) — ancho fijo, solo lectura */}
                    <div className="w-36 shrink-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Clave (key)</label>
                      <input type="text" value={sec.key} disabled
                        className="w-full bg-slate-100 border border-slate-200 text-slate-500 font-mono text-xs rounded-lg px-3 py-2 cursor-not-allowed" />
                    </div>
                    {/* Color */}
                    <div className="shrink-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={sec.color}
                          onChange={e => updateSeccion(idx, 'color', e.target.value)}
                          className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white" />
                        <span className="text-xs font-mono text-slate-500">{sec.color}</span>
                      </div>
                    </div>
                    {/* Multiplicador — visible solo si > 1 (ej: Capacitación ×2) */}
                    {(sec.multiplicador ?? 1) > 1 && (
                      <div className="shrink-0">
                        <label className="block text-[0.65rem] font-bold text-amber-600 uppercase tracking-wider mb-1"
                          title="Factor de conversión: horas ejecutadas × multiplicador = horas en el PTA">
                          ×Factor
                        </label>
                        <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 h-[34px]">
                          <input type="number" value={sec.multiplicador ?? 1} min={1} max={10} step={1}
                            onChange={e => updateSeccion(idx, 'multiplicador', Number(e.target.value) || 1)}
                            className="w-12 bg-white border border-amber-200 text-amber-700 font-bold text-sm rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-amber-500/20 outline-none" />
                          <span className="text-xs text-amber-600 font-bold">×h</span>
                        </div>
                      </div>
                    )}
                    {/* Eliminar */}
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

                    {/* ── Columnas de la sección (configuración compartida) ── */}
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
                            {/* Help badge: which column controls hours */}
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
                            const isLocked = seccionTieneDatos(sec.key);
                            return (
                            <div key={`col-chip-${ci}`}
                              draggable={!isLocked}
                              onDragStart={e => { if (isLocked) { e.preventDefault(); return; } setDragColIdx(ci); setDragColSecKey(sec.key); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', colName); }}
                              onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragColSecKey === sec.key) setDragOverColIdx(ci); }}
                              onDrop={e => { e.preventDefault(); if (dragColIdx !== null && dragColSecKey === sec.key) { reorderColumnas(sec.key, dragColIdx, ci); } setDragColIdx(null); setDragOverColIdx(null); setDragColSecKey(null); }}
                              onDragEnd={() => { setDragColIdx(null); setDragOverColIdx(null); setDragColSecKey(null); }}
                              className={`flex items-center gap-1 rounded-lg pl-1.5 pr-1 py-1 group ${isLocked ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} select-none transition-all ${
                                dragColIdx === ci && dragColSecKey === sec.key
                                  ? `opacity-40 scale-95 ${isItemsChip ? 'bg-violet-100 border border-violet-300' : 'bg-blue-100 border border-blue-300'}`
                                  : dragOverColIdx === ci && dragColSecKey === sec.key && dragColIdx !== ci
                                    ? `${isItemsChip ? 'bg-violet-100 border-2 border-violet-400' : 'bg-blue-100 border-2 border-blue-400'} shadow-md ring-2 ${isItemsChip ? 'ring-violet-300/50' : 'ring-blue-300/50'}`
                                    : isItemsChip
                                      ? 'bg-violet-50 border border-violet-200 hover:border-violet-300 hover:shadow-sm'
                                      : 'bg-blue-50 border border-blue-200 hover:border-blue-300 hover:shadow-sm'
                              }`}>
                              {isLocked ? (
                                <Lock className={`w-3 h-3 ${isItemsChip ? 'text-violet-300' : 'text-blue-300'} shrink-0`} />
                              ) : (
                                <GripVertical className={`w-3.5 h-3.5 ${isItemsChip ? 'text-violet-300 hover:text-violet-500' : 'text-blue-300 hover:text-blue-500'} shrink-0 cursor-grab transition-colors`} />
                              )}
                              {isItemsChip ? (
                                <>
                                  <Globe className="w-3 h-3 text-violet-400 shrink-0" />
                                  <span className="text-[11px] font-semibold text-violet-700 px-0.5">Actividad / Ítem</span>
                                </>
                              ) : (
                                <>
                                  <Tag className="w-3 h-3 text-blue-400 shrink-0" />
                                  <input
                                    type="text"
                                    draggable={false}
                                    value={colName}
                                    onChange={e => {
                                      const newName = e.target.value;
                                      if (newName.trim()) renameColumnaSeccion(sec.key, colName, newName);
                                    }}
                                    onBlur={e => { if (!e.target.value.trim()) e.target.value = colName; }}
                                    className="bg-transparent text-[11px] font-semibold text-blue-700 outline-none border-none w-auto min-w-[40px] max-w-[120px] cursor-text"
                                    style={{ width: `${Math.max(40, colName.length * 7)}px` }}
                                    onMouseDown={e => e.stopPropagation()}
                                  />
                                  <button onClick={() => removeColumnaSeccion(sec.key, colName)}
                                    className="w-5 h-5 rounded flex items-center justify-center text-blue-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                            );
                          })}
                          <button onClick={() => setColModal({ secKey: sec.key, actIdx: -1 })}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-blue-300 text-blue-500 text-[11px] font-semibold hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors">
                            <Plus className="w-3 h-3" /> Columna
                          </button>
                          </div>
                          {/* Help guide */}
                          {secCols.length > 0 && (
                            <div className="text-[9px] text-slate-400 leading-relaxed pl-1 border-l-2 border-slate-200 ml-1">
                              💡 <b>Orden importa:</b> La primera columna (ej. Línea) define la jerarquía y recibe las horas.
                              {secCols.length > 1 && !firstIsItems && ' Puede elegir si las horas van en la Línea o en cada Actividad.'}
                              {firstIsItems && ' Cada actividad tiene su propio tipo y horas.'}
                              {' '} • <b>Tipos:</b> 🟢 Fija (exacta), 🕒 Hasta (máximo), 📊 Intervalo (min—máx).
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    {actsDeSeccion(sec.key).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Globe className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">Sin actividades. Agrega la primera.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actsDeSeccion(sec.key).map((act, aIdx) => {
                          if (!act) return null;
                          const isEtapa = Array.isArray(act.items);
                          const hasItems = isEtapa && (act.items?.length ?? 0) > 0;
                          return (
                            <div 
                              key={act.id} 
                              draggable
                              onDragStart={(e) => handleDragStart(e, sec.key, aIdx)}
                              onDragOver={(e) => handleDragOver(e, sec.key, aIdx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, sec.key, aIdx)}
                              onDragEnd={handleDragEnd}
                              className={`border rounded-xl overflow-hidden shadow-sm transition-all bg-white
                                ${draggedActIdx === aIdx && draggedSecKey === sec.key ? 'opacity-40 border-dashed border-blue-400' : ''}
                                ${dragOverActIdx === aIdx && draggedSecKey === sec.key ? 'border-blue-500 shadow-blue-500/20 shadow-md scale-[1.01]' : 'border-slate-200'}
                              `}
                            >
                              {/* ── Cabecera de la Etapa ── */}
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
                                      handleChange('ext_actividades', { ...actividades, [sec.key]: acts });
                                    }
                                  }}
                                  onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                  className="w-10 h-10 rounded-xl text-white font-black text-sm shrink-0 shadow-sm border-2 border-white/30 outline-none text-center cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all"
                                  style={{ background: sec.color, padding: 0 }}
                                />
                                {/* ID */}
                                <div className="w-28 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">ID</span>
                                  <input type="text" value={act.id}
                                    onChange={e => updateAct(sec.key, aIdx, 'id', e.target.value)}
                                    className="w-full bg-white border border-slate-200 text-slate-500 font-mono text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                </div>
                                {/* Nombre etapa */}
                                <div className="flex-1 min-w-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                    {isEtapa ? 'Etapa' : 'Nombre'}
                                  </span>
                                  <input type="text" value={act.nombre}
                                    onChange={e => updateAct(sec.key, aIdx, 'nombre', e.target.value)}
                                    placeholder={isEtapa ? 'Nombre de la etapa...' : 'Nombre de la actividad...'}
                                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                </div>
                                {/* Máx total (solo para actividades planas sin items) */}
                                {!isEtapa && (
                                  <div className="shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Máx.</span>
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 h-[34px]">
                                      <input type="number" value={(act as any).max_horas ?? ''}
                                        onChange={e => updateAct(sec.key, aIdx, 'max_horas', e.target.value)}
                                        className="w-20 bg-white border border-slate-200 text-slate-800 font-bold text-[13px] rounded-md px-2 py-1 text-center focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                      <span className="text-xs text-slate-400 font-bold">h</span>
                                    </div>
                                  </div>
                                )}
                                {/* Total Horas (from whichever column is first) */}
                                {(() => {
                                  const secCols = getSeccionColumnas(sec.key) || [];
                                  const fc = secCols.find(c => !!c) || '';
                                  let total = 0;
                                  if (fc === ITEMS_KEY) {
                                    total = (act.items || []).reduce((sum: number, item: any) => sum + (Number(item.horas) || 0), 0);
                                  } else if (fc) {
                                    const metaArr2 = act.columnas_meta?.[fc] || [];
                                    const allItems2 = act.items || [];
                                    metaArr2.forEach((m2: any, vIdx2: number) => {
                                      const horasEn2 = m2?.horas_en || 'linea';
                                      if (horasEn2 === 'linea') {
                                        total += Number(m2?.horas) || 0;
                                      } else {
                                        // Sum horas from items belonging to this first-col value
                                        total += allItems2
                                          .filter((it2: any) => it2.parent_col_idx === vIdx2 || (it2.parent_col_idx === undefined && vIdx2 === 0))
                                          .reduce((s: number, it2: any) => s + (Number(it2.horas) || 0), 0);
                                      }
                                    });
                                  }
                                  return total > 0 || isEtapa ? (
                                    <div className="shrink-0">
                                      <span className="text-[10px] font-bold text-[#003DA5] uppercase block mb-1">Total Horas</span>
                                      <div className="flex items-center justify-center bg-blue-50/50 border border-blue-200 text-[#003DA5] font-extrabold text-[13px] rounded-lg px-3 py-1.5 h-[34px] min-w-[70px]">
                                        {total}h
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                {/* Eliminar etapa */}
                                <button onClick={() => removeAct(sec.key, aIdx)}
                                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm self-end">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>



                              {/* ── Bloques ordenados según columnas de la sección ── */}
                              {(() => {
                                try {
                                const secCols = getSeccionColumnas(sec.key) || [];
                                // The FIRST column in the order gets the "privilege" of horas + tipo
                                const firstColName = secCols.find(c => !!c) || '';
                                const isItemsPrivileged = firstColName === ITEMS_KEY; // items block gets horas when first
                                return secCols.map((colName) => {
                                  if (!colName) return null;
                                  // ─ Bloque Actividad / Ítem ─
                                  if (colName === ITEMS_KEY) {
                                    // When a regular column is first, items render INSIDE each first-col value
                                    if (!isItemsPrivileged && firstColName) return null;
                                    // Determine which columns come AFTER _items_ — those render PER item
                                    const itemsPos = secCols.indexOf(ITEMS_KEY);
                                    const subCols = secCols.slice(itemsPos + 1).filter(c => c && c !== ITEMS_KEY && c !== firstColName);
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
                                              const itemColVals = item.col_valores || {};
                                              return (
                                              <div key={iIdx} className="space-y-1">
                                                {/* ── Item row with tipo ── */}
                                                <div
                                                  draggable
                                                  onDragStart={e => { e.stopPropagation(); setDragItemIdx(iIdx); setDragItemKey(itemDragKey); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', `item-${iIdx}`); }}
                                                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; if (dragItemKey === itemDragKey) setDragOverItemIdx(iIdx); }}
                                                  onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragItemIdx !== null && dragItemKey === itemDragKey) { reorderItems(sec.key, aIdx, dragItemIdx, iIdx); } setDragItemIdx(null); setDragOverItemIdx(null); setDragItemKey(null); }}
                                                  onDragEnd={() => { setDragItemIdx(null); setDragOverItemIdx(null); setDragItemKey(null); }}
                                                  className={`flex flex-row items-center gap-2 p-2 rounded-lg border transition-all select-none ${
                                                    dragItemIdx === iIdx && dragItemKey === itemDragKey
                                                      ? 'opacity-40 scale-[0.98] bg-violet-50 border-violet-200'
                                                      : dragOverItemIdx === iIdx && dragItemKey === itemDragKey && dragItemIdx !== iIdx
                                                        ? 'bg-violet-50 border-2 border-violet-400 shadow-md ring-2 ring-violet-300/40'
                                                        : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                                                  }`}>
                                                  <GripVertical className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500 shrink-0 cursor-grab active:cursor-grabbing transition-colors" />
                                                  <div className="flex-1 min-w-0">
                                                    <input type="text" value={item.nombre} draggable={false}
                                                      onChange={e => updateItem(sec.key, aIdx, iIdx, 'nombre', e.target.value)}
                                                      placeholder="Nombre de la actividad..."
                                                      className="w-full bg-white border border-slate-200 text-slate-700 text-[12px] rounded-md px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none cursor-text" />
                                                  </div>
                                                  {showItemHoras && (
                                                    <div className="w-24 shrink-0">
                                                      <select value={item.tipo}
                                                        onChange={e => updateItem(sec.key, aIdx, iIdx, 'tipo', e.target.value)}
                                                        className="w-full bg-white border border-slate-200 text-slate-700 text-[11px] rounded-md px-1.5 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none">
                                                        <option value="fija">🟢 Fija</option>
                                                        <option value="hasta">🕒 Hasta</option>
                                                        <option value="intervalo">📊 Intervalo</option>
                                                      </select>
                                                    </div>
                                                  )}
                                                  {showItemHoras && (
                                                    item.tipo === 'intervalo' ? (
                                                      <div className="shrink-0 flex items-center gap-1">
                                                        <input type="number" value={(item as any).horas_min ?? 0} min={0} step={1}
                                                          onChange={e => updateItem(sec.key, aIdx, iIdx, 'horas_min', e.target.value)}
                                                          className="w-16 bg-white border border-blue-200 text-blue-700 font-bold text-[11px] rounded-md px-1 py-1.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none"
                                                          title="Mínimo" />
                                                        <span className="text-[9px] text-slate-400 font-bold">—</span>
                                                        <input type="number" value={item.horas ?? ''} min={0} step={1}
                                                          onChange={e => updateItem(sec.key, aIdx, iIdx, 'horas', e.target.value)}
                                                          className="w-16 bg-white border border-amber-200 text-amber-700 font-bold text-[11px] rounded-md px-1 py-1.5 text-center focus:ring-2 focus:ring-amber-500/20 outline-none"
                                                          title="Máximo" />
                                                        <span className="text-[10px] text-amber-500 font-bold">h</span>
                                                      </div>
                                                    ) : (
                                                      <div className="w-20 shrink-0 flex items-center gap-1">
                                                        <input type="number" value={item.horas} min={0} step={1}
                                                          onChange={e => updateItem(sec.key, aIdx, iIdx, 'horas', e.target.value)}
                                                          className="w-16 bg-white border border-amber-200 text-amber-700 font-bold text-[12px] rounded-md px-1.5 py-1.5 text-center focus:ring-2 focus:ring-amber-500/20 outline-none" />
                                                        <span className="text-[10px] text-amber-500 font-bold">h</span>
                                                      </div>
                                                    )
                                                  )}
                                                  <button onClick={() => removeItem(sec.key, aIdx, iIdx)}
                                                    className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                                {/* ── Per-item sub-columns (Evidencia, etc.) ── */}
                                                {subCols.map(sc => {
                                                  const scVals = itemColVals[sc] || [];
                                                  return (
                                                    <div key={`${iIdx}-${sc}`} className="ml-8 mr-2">
                                                      <div className="border border-slate-100 rounded-md overflow-hidden bg-white">
                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50/60 border-b border-slate-100">
                                                          <Tag className="w-2.5 h-2.5 text-slate-300 shrink-0" />
                                                          <span className="flex-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sc}</span>
                                                          <button onClick={() => addItemColVal(sec.key, aIdx, iIdx, sc)}
                                                            className="text-[9px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors">
                                                            <Plus className="w-2.5 h-2.5" /> Agregar
                                                          </button>
                                                        </div>
                                                        {scVals.length > 0 ? (
                                                          <div className="p-1.5 space-y-1">
                                                            {scVals.map((sv: string, svIdx: number) => (
                                                              <div key={svIdx} className="flex items-center gap-1.5">
                                                                <input type="text" value={sv} draggable={false}
                                                                  onChange={e => updateItemColVal(sec.key, aIdx, iIdx, sc, svIdx, e.target.value)}
                                                                  placeholder={`${sc}...`}
                                                                  className="flex-1 bg-white border border-slate-200 text-slate-600 text-[11px] rounded px-2 py-1 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                                <button onClick={() => removeItemColVal(sec.key, aIdx, iIdx, sc, svIdx)}
                                                                  className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors">
                                                                  <X className="w-2.5 h-2.5" />
                                                                </button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        ) : (
                                                          <div className="px-2 py-1 text-[10px] text-slate-300 italic">Sin {sc.toLowerCase()}</div>
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                        <div className="p-3 pt-2 flex flex-row gap-2 border-t border-slate-100">
                                          <button onClick={() => addItem(sec.key, aIdx)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-500 text-[11px] font-semibold hover:border-violet-300 hover:text-violet-600 transition-colors hover:bg-violet-50 bg-slate-50/50">
                                            <Plus className="w-3 h-3" /> Agregar actividad
                                          </button>
                                        </div>
                                      </div>
                                    ) : null;
                                  }
                                  // ─ Skip columns that are rendered as sub-columns inside items ─
                                  const itemsPos2 = secCols.indexOf(ITEMS_KEY);
                                  if (itemsPos2 >= 0 && secCols.indexOf(colName) > itemsPos2 && colName !== firstColName) {
                                    return null; // already rendered inside each item
                                  }
                                  // ─ Bloque columna normal ─
                                  const vals = getActColValues(act, colName) || [];
                                  const isPrivileged = colName === firstColName;
                                  const metaArr = act.columnas_meta?.[colName] || [];
                                  // Determine sub-columns for items (columns after _items_ that aren't the first col)
                                  const itemsPos3 = secCols.indexOf(ITEMS_KEY);
                                  const subCols3 = itemsPos3 >= 0
                                    ? secCols.slice(itemsPos3 + 1).filter(c => c && c !== ITEMS_KEY && c !== firstColName)
                                    : [];
                                  return (
                                    <div key={colName} className="p-3 pt-2 pb-1 bg-white">
                                      <div className="border border-slate-100 rounded-lg overflow-hidden">
                                        <div className="flex flex-row items-center gap-2 px-3 py-1 bg-slate-50/80 border-b border-slate-100">
                                          <Tag className="w-3 h-3 text-blue-400 shrink-0" />
                                          <span className="flex-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{colName}</span>
                                          {isPrivileged && (
                                            <span className="text-[9px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">HORAS</span>
                                          )}
                                          <button onClick={() => addValorColumna(sec.key, aIdx, colName)}
                                            className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 shrink-0 transition-colors">
                                            <Plus className="w-3 h-3" /> Agregar
                                          </button>
                                        </div>
                                        {vals.length > 0 ? (
                                          <div className="p-2 space-y-3">
                                            {isPrivileged ? (
                                              /* ── First col: each value is a CONTAINER with nested items ── */
                                              <>
                                                {vals.map((val, valIdx) => {
                                                  const m = metaArr[valIdx] || { tipo: 'hasta', horas: 0 };
                                                  const horasEn = (m as any).horas_en || 'linea'; // 'linea' | 'actividad'
                                                  // Items belonging to this first-col value
                                                  const allItems = act.items || [];
                                                  const myItems = allItems.filter((it: any) =>
                                                    it.parent_col_idx === valIdx || (it.parent_col_idx === undefined && valIdx === 0)
                                                  );
                                                  const myItemIndices = allItems.reduce((acc: number[], it: any, gIdx: number) => {
                                                    if (it.parent_col_idx === valIdx || (it.parent_col_idx === undefined && valIdx === 0)) {
                                                      acc.push(gIdx);
                                                    }
                                                    return acc;
                                                  }, []);
                                                  return (
                                                    <div key={`${colName}-${valIdx}`} className="border border-blue-100 rounded-lg overflow-hidden bg-blue-50/20">
                                                      {/* ── Value header row ── */}
                                                      <div className="flex flex-row items-center gap-2 px-3 py-2 bg-blue-50/40 border-b border-blue-100">
                                                        <div className="flex-1 min-w-0">
                                                          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Nombre</span>
                                                          <input type="text" value={val}
                                                            onChange={e => updateValorColumna(sec.key, aIdx, colName, valIdx, e.target.value)}
                                                            placeholder={`Valor de ${colName}...`}
                                                            className="w-full bg-white border border-slate-200 text-slate-700 text-[12px] rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                        </div>
                                                        {horasEn === 'linea' && (
                                                          <>
                                                            <div className="w-24 shrink-0">
                                                              <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Tipo</span>
                                                              <select value={m.tipo || 'hasta'}
                                                                onChange={e => updateValorColumnaMeta(sec.key, aIdx, colName, valIdx, 'tipo', e.target.value)}
                                                                className="w-full bg-white border border-slate-200 text-slate-700 text-[11px] rounded-md px-1.5 py-1.5 focus:ring-2 focus:ring-amber-500/20 outline-none">
                                                                <option value="hasta">🕒 Hasta</option>
                                                                <option value="fija">🟢 Fija</option>
                                                                <option value="intervalo">📊 Intervalo</option>
                                                              </select>
                                                            </div>
                                                            {(m.tipo || 'hasta') === 'intervalo' ? (
                                                              <div className="shrink-0">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Horas (min — máx)</span>
                                                                <div className="flex items-center gap-1">
                                                                  <input type="number" value={(m as any).horas_min || 0} min={0} step={1}
                                                                    onChange={e => updateValorColumnaMeta(sec.key, aIdx, colName, valIdx, 'horas_min', e.target.value)}
                                                                    className="w-16 bg-white border border-blue-200 text-blue-700 font-bold text-[12px] rounded-md px-1.5 py-1.5 text-center focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                                  <span className="text-[9px] text-slate-400 font-bold">—</span>
                                                                  <input type="number" value={m.horas ?? ''} min={0} step={1}
                                                                    onChange={e => updateValorColumnaMeta(sec.key, aIdx, colName, valIdx, 'horas', e.target.value)}
                                                                    className="w-16 bg-white border border-amber-200 text-amber-700 font-bold text-[12px] rounded-md px-1.5 py-1.5 text-center focus:ring-2 focus:ring-amber-500/20 outline-none" />
                                                                  <span className="text-[10px] text-amber-500 font-bold">h</span>
                                                                </div>
                                                              </div>
                                                            ) : (
                                                              <div className="w-24 shrink-0">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Horas</span>
                                                                <div className="flex items-center gap-1">
                                                                  <input type="number" value={m.horas ?? ''} min={0} step={1}
                                                                    onChange={e => updateValorColumnaMeta(sec.key, aIdx, colName, valIdx, 'horas', e.target.value)}
                                                                    className="w-16 bg-white border border-amber-200 text-amber-700 font-bold text-[12px] rounded-md px-1.5 py-1.5 text-center focus:ring-2 focus:ring-amber-500/20 outline-none" />
                                                                  <span className="text-[10px] text-amber-500 font-bold">h</span>
                                                                </div>
                                                              </div>
                                                            )}
                                                          </>
                                                        )}
                                                        <button onClick={() => removeValorColumna(sec.key, aIdx, colName, valIdx)}
                                                          className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors self-end">
                                                          <Trash2 className="w-3 h-3" />
                                                        </button>
                                                      </div>
                                                      {/* ── Toggle: horas en línea vs actividad ── */}
                                                      <div className="flex items-center gap-2.5 px-3 py-2 bg-gradient-to-r from-slate-50 to-blue-50/30 border-b border-blue-100">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Horas en:</span>
                                                        <div className="flex rounded-lg overflow-hidden border border-slate-300 shadow-sm">
                                                          <button
                                                            onClick={() => updateValorColumnaMeta(sec.key, aIdx, colName, valIdx, 'horas_en', 'linea')}
                                                            className={`px-3 py-1 text-[10px] font-bold transition-all flex items-center gap-1 ${
                                                              horasEn === 'linea'
                                                                ? 'bg-blue-600 text-white shadow-inner ring-1 ring-blue-700'
                                                                : 'bg-white text-slate-400 hover:bg-blue-50 hover:text-blue-500'
                                                            }`}>
                                                            📋 {colName}
                                                          </button>
                                                          <button
                                                            onClick={() => updateValorColumnaMeta(sec.key, aIdx, colName, valIdx, 'horas_en', 'actividad')}
                                                            className={`px-3 py-1 text-[10px] font-bold transition-all flex items-center gap-1 border-l border-slate-300 ${
                                                              horasEn === 'actividad'
                                                                ? 'bg-violet-600 text-white shadow-inner ring-1 ring-violet-700'
                                                                : 'bg-white text-slate-400 hover:bg-violet-50 hover:text-violet-500'
                                                            }`}>
                                                            ⚡ Actividad
                                                          </button>
                                                        </div>
                                                        <span className="text-[8px] text-slate-400 italic ml-1">
                                                          {horasEn === 'linea' ? `Horas configuradas a nivel de ${colName}` : 'Horas configuradas en cada actividad individual'}
                                                        </span>
                                                      </div>
                                                      {/* ── Nested items (activities) for this value ── */}
                                                      <div className="px-3 py-2">
                                                        <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider">Actividad / Ítem</span>
                                                        {myItems.length > 0 && (
                                                          <div className="mt-1 space-y-1">
                                                            {myItems.map((item: any, localIdx: number) => {
                                                              const globalIdx = myItemIndices[localIdx];
                                                              const itemColVals = item.col_valores || {};
                                                              return (
                                                                <div key={globalIdx} className="space-y-1">
                                                                  <div className="flex items-center gap-2 p-1.5 rounded-md bg-white border border-slate-100 hover:border-slate-200 transition-all">
                                                                    <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab" />
                                                                    <input type="text" value={item.nombre}
                                                                      onChange={e => updateItem(sec.key, aIdx, globalIdx, 'nombre', e.target.value)}
                                                                      placeholder="Nombre de la actividad..."
                                                                      className="flex-1 bg-transparent border-none text-slate-700 text-[11px] px-1 py-0.5 focus:ring-0 outline-none" />
                                                                    {horasEn === 'actividad' && (
                                                                      <>
                                                                        <select value={item.tipo || 'fija'}
                                                                          onChange={e => updateItem(sec.key, aIdx, globalIdx, 'tipo', e.target.value)}
                                                                          className="w-20 shrink-0 bg-white border border-slate-200 text-slate-700 text-[10px] rounded px-1 py-1 focus:ring-1 focus:ring-violet-500/20 outline-none">
                                                                          <option value="fija">🟢 Fija</option>
                                                                          <option value="hasta">🕒 Hasta</option>
                                                                          <option value="intervalo">📊 Intervalo</option>
                                                                        </select>
                                                                        {(item.tipo || 'fija') === 'intervalo' ? (
                                                                          <div className="shrink-0 flex items-center gap-0.5">
                                                                            <input type="number" value={(item as any).horas_min || 0} min={0} step={1}
                                                                              onChange={e => updateItem(sec.key, aIdx, globalIdx, 'horas_min', e.target.value)}
                                                                              className="w-14 bg-white border border-blue-200 text-blue-700 font-bold text-[10px] rounded px-1 py-1 text-center focus:ring-1 focus:ring-blue-500/20 outline-none" />
                                                                            <span className="text-[8px] text-slate-400 font-bold">—</span>
                                                                            <input type="number" value={item.horas ?? ''} min={0} step={1}
                                                                              onChange={e => updateItem(sec.key, aIdx, globalIdx, 'horas', e.target.value)}
                                                                              className="w-14 bg-white border border-amber-200 text-amber-700 font-bold text-[10px] rounded px-1 py-1 text-center focus:ring-1 focus:ring-amber-500/20 outline-none" />
                                                                            <span className="text-[9px] text-amber-500 font-bold">h</span>
                                                                          </div>
                                                                        ) : (
                                                                          <div className="w-16 shrink-0 flex items-center gap-0.5">
                                                                            <input type="number" value={item.horas ?? ''} min={0} step={1}
                                                                              onChange={e => updateItem(sec.key, aIdx, globalIdx, 'horas', e.target.value)}
                                                                              className="w-14 bg-white border border-amber-200 text-amber-700 font-bold text-[11px] rounded px-1 py-1 text-center focus:ring-1 focus:ring-amber-500/20 outline-none" />
                                                                            <span className="text-[9px] text-amber-500 font-bold">h</span>
                                                                          </div>
                                                                        )}
                                                                      </>
                                                                    )}
                                                                    <button onClick={() => removeItem(sec.key, aIdx, globalIdx)}
                                                                      className="w-5 h-5 shrink-0 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors">
                                                                      <Trash2 className="w-2.5 h-2.5" />
                                                                    </button>
                                                                  </div>
                                                                  {/* ── Per-item sub-columns (Evidencia, etc.) ── */}
                                                                  {subCols3.map(sc => {
                                                                    const scVals = itemColVals[sc] || [];
                                                                    return (
                                                                      <div key={`${globalIdx}-${sc}`} className="ml-6 mr-1">
                                                                        <div className="border border-slate-100 rounded-md overflow-hidden bg-white">
                                                                          <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-50/60 border-b border-slate-100">
                                                                            <Tag className="w-2 h-2 text-slate-300 shrink-0" />
                                                                            <span className="flex-1 text-[8px] font-bold text-slate-400 uppercase tracking-wider">{sc}</span>
                                                                            <button onClick={() => addItemColVal(sec.key, aIdx, globalIdx, sc)}
                                                                              className="text-[8px] text-blue-500 hover:text-blue-700 font-semibold flex items-center gap-0.5 transition-colors">
                                                                              <Plus className="w-2 h-2" /> Agregar
                                                                            </button>
                                                                          </div>
                                                                          {scVals.length > 0 ? (
                                                                            <div className="p-1 space-y-0.5">
                                                                              {scVals.map((sv: string, svIdx: number) => (
                                                                                <div key={svIdx} className="flex items-center gap-1">
                                                                                  <input type="text" value={sv}
                                                                                    onChange={e => updateItemColVal(sec.key, aIdx, globalIdx, sc, svIdx, e.target.value)}
                                                                                    placeholder={`${sc}...`}
                                                                                    className="flex-1 bg-white border border-slate-200 text-slate-600 text-[10px] rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500/20 outline-none" />
                                                                                  <button onClick={() => removeItemColVal(sec.key, aIdx, globalIdx, sc, svIdx)}
                                                                                    className="w-4 h-4 shrink-0 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors">
                                                                                    <X className="w-2 h-2" />
                                                                                  </button>
                                                                                </div>
                                                                              ))}
                                                                            </div>
                                                                          ) : (
                                                                            <div className="px-2 py-0.5 text-[9px] text-slate-300 italic">Sin {sc.toLowerCase()}</div>
                                                                          )}
                                                                        </div>
                                                                      </div>
                                                                    );
                                                                  })}
                                                                </div>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                        {myItems.length === 0 && horasEn === 'actividad' && (
                                                          <div className="mt-1.5 p-3 rounded-lg border-2 border-dashed border-violet-200 bg-violet-50/50 text-center">
                                                            <p className="text-[11px] text-violet-600 font-semibold mb-1">⚡ Modo: Horas por Actividad</p>
                                                            <p className="text-[10px] text-violet-400">Agregue actividades para asignar tipo y horas a cada una individualmente.</p>
                                                          </div>
                                                        )}
                                                        <button onClick={() => addItem(sec.key, aIdx, undefined, valIdx)}
                                                          className={`w-full mt-1.5 flex items-center justify-center gap-1 py-1.5 rounded-md border font-semibold transition-colors ${
                                                            horasEn === 'actividad' && myItems.length === 0
                                                              ? 'border-violet-400 text-violet-600 bg-violet-50 text-[11px] hover:bg-violet-100 shadow-sm'
                                                              : 'border-dashed border-violet-200 text-violet-400 text-[10px] hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50'
                                                          }`}>
                                                          <Plus className="w-2.5 h-2.5" /> Agregar actividad
                                                        </button>
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </>
                                            ) : (
                                              /* ── Other cols: simple text values ── */
                                              vals.map((val, valIdx) => (
                                                <div key={`${colName}-${valIdx}`} className="flex flex-row items-center gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <input type="text" value={val}
                                                      onChange={e => updateValorColumna(sec.key, aIdx, colName, valIdx, e.target.value)}
                                                      placeholder={`Valor de ${colName}...`}
                                                      className="w-full bg-white border border-slate-200 text-slate-700 text-[12px] rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                  </div>
                                                  <button onClick={() => removeValorColumna(sec.key, aIdx, colName, valIdx)}
                                                    className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ))
                                            )}
                                          </div>
                                        ) : (
                                          <div className="px-3 py-2 text-[11px] text-slate-300 italic">Sin valores</div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                });
                                } catch (err: any) {
                                  console.error('🔴 TabExtension IIFE error:', err?.message, { secKey: sec.key, act: JSON.parse(JSON.stringify(act)), secColumnas: sec?.columnas });
                                  return null;
                                }
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

      {/* ═══ Modal: Agregar columna ═══ */}
      {colModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={() => { setColModal(null); setColNombre('Evidencia'); }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" style={{ animation: 'fadeIn .2s ease-out' }} />
          {/* Card */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp .25s ease-out' }}>
            {/* Header */}
            <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <Columns3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-[15px] leading-tight">Nueva Columna</h3>
                <p className="text-white/70 text-[11px] mt-0.5">Se aplicará a todas las actividades de la sección</p>
              </div>
              <button onClick={() => { setColModal(null); setColNombre('Evidencia'); }}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Nombre de la columna
              </label>
              <input
                ref={colInputRef}
                type="text"
                value={colNombre}
                onChange={e => setColNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmAddColumna(); if (e.key === 'Escape') { setColModal(null); setColNombre('Evidencia'); } }}
                placeholder="Ej: Evidencia, Línea, Observaciones..."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 text-[14px] font-semibold focus:border-[#003DA5] focus:ring-4 focus:ring-[#003DA5]/10 outline-none transition-all placeholder:text-slate-300 placeholder:font-normal"
              />

              {/* Quick picks */}
              <div className="mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sugerencias rápidas</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['Evidencia', 'Línea', 'Observaciones', 'Requisitos', 'Responsable', 'Producto'].map(name => (
                    <button key={name}
                      onClick={() => setColNombre(name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                        colNombre === name
                          ? 'bg-[#003DA5] text-white border-[#003DA5] shadow-md shadow-blue-500/20'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-[#003DA5]/40 hover:text-[#003DA5] hover:bg-blue-50/50'
                      }`}>
                      <Tag className="w-3 h-3" />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => { setColModal(null); setColNombre('Evidencia'); }}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                Cancelar
              </button>
              <button onClick={confirmAddColumna}
                disabled={!colNombre.trim()}
                className="px-6 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: colNombre.trim() ? 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)' : '#94A3B8' }}>
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar columna
                </span>
              </button>
            </div>
          </div>

          {/* Animations */}
          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
          `}</style>
        </div>
      )}
    </div>
  );
}

