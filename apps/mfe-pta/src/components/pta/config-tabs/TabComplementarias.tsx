import React, { useState, useCallback } from 'react';
import { Calculator, ChevronDown, Plus, Trash2, Globe, GripVertical, X, Tag, Lock, Info } from 'lucide-react';
import { PTARules, ExtItem } from '../ConfiguracionReglasPTA';
import { BuilderSurfaceStyles } from './BuilderSurfaceStyles';
import { DetailColumnChain } from './DetailColumnChain';
import { DetailColumnModal } from './DetailColumnModal';
import { HourLimitControl } from './HourLimitControl';
import { toast } from 'sonner';
import { createSectionActivityId } from './activityId';

type CompSeccion = PTARules['comp_secciones'][number];
type CompActividad = PTARules['comp_actividades_v2'][string][number];

export function TabComplementarias({ draft, handleChange }: { draft: PTARules; handleChange: (k: keyof PTARules, v: any) => void }) {
  const [open1, setOpen1] = useState(true);   // Tope Global accordion
  const [open2, setOpen2] = useState(true);   // Secciones y Actividades accordion
  const secciones: CompSeccion[] = draft.comp_secciones || [];
  const [seccionActiva, setSeccionActiva] = useState<string>(() => secciones[0]?.key || '');
  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});

  // ── Drag & Drop State ──
  const [draggedActIdx, setDraggedActIdx] = useState<number | null>(null);
  const [dragOverActIdx, setDragOverActIdx] = useState<number | null>(null);
  const [draggedSecKey, setDraggedSecKey] = useState<string | null>(null);
  // Drag & Drop ítems
  const [dragItemIdx, setDragItemIdx] = useState<number | null>(null);
  const [dragOverItemIdx, setDragOverItemIdx] = useState<number | null>(null);
  const [dragItemKey, setDragItemKey] = useState<string | null>(null);

  // ── Modal "Agregar columna" ──
  const [colModal, setColModal] = useState<{ secKey: string; actIdx: number } | null>(null);
  const [colNombre, setColNombre] = useState('Evidencia');

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
  // Despliegue independiente: abrir un bloque no cierra los demás.
  const setBlockExpanded = (targetKey: string, expanded: boolean) => {
    setExpandedBlocks(prev => ({ ...prev, [targetKey]: expanded }));
  };
  const updateAct = (secKey: string, idx: number, field: string, val: any) => {
    const stringFields = ['nombre', 'id', 'linea', 'nivel_programa', 'tipo_aprobacion'];
    const currentActs = actsDeSeccion(secKey);
    if (field === 'id') {
      const oldKey = `${secKey}:${currentActs[idx]?.id}`;
      const newKey = `${secKey}:${val}`;
      setExpandedBlocks(prev => {
        if (!(oldKey in prev) || oldKey === newKey) return prev;
        const nextState = { ...prev, [newKey]: prev[oldKey] };
        delete nextState[oldKey];
        return nextState;
      });
    }
    const optionalNumberFields = ['max_horas', 'min_horas', 'porcentaje_pta'];
    const next = currentActs.map((a, i) =>
      i === idx
        ? {
            ...a,
            [field]: stringFields.includes(field)
              ? val
              : optionalNumberFields.includes(field) && val === ''
                ? undefined
                : Number(val),
          }
        : a
    );
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  // Tipo de horas del bloque (estructura de solo columna raíz): normaliza
  // min/máx igual que los ítems al cambiar entre fija/hasta/intervalo.
  const updateActTipo = (secKey: string, idx: number, tipo: string) => {
    const currentActs = actsDeSeccion(secKey);
    const act: any = currentActs[idx];
    let patch: any;
    if (tipo === 'sin_horas') {
      patch = { tipo };
    } else if (tipo === 'intervalo') {
      const currentMin = Number(act?.min_horas);
      const nextMin = Number.isFinite(currentMin) && currentMin > 0 ? currentMin : 1;
      const currentMax = Number(act?.max_horas);
      const nextMax = Number.isFinite(currentMax) && currentMax > nextMin ? currentMax : Math.max(2, nextMin + 1);
      patch = { tipo, min_horas: nextMin, max_horas: nextMax };
    } else if (tipo === 'porcentaje') {
      const currentPercentage = Number(act?.porcentaje_pta);
      patch = {
        tipo,
        porcentaje_pta: Number.isFinite(currentPercentage)
          ? Math.min(100, Math.max(1, currentPercentage))
          : 1,
      };
    } else {
      const currentMax = Number(act?.max_horas);
      patch = { tipo, max_horas: Number.isFinite(currentMax) && currentMax > 0 ? currentMax : 1 };
    }
    const next = currentActs.map((a, i) => i === idx ? { ...a, ...patch } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };
  const addAct = (secKey: string) => {
    const section = secciones.find(item => item.key === secKey);
    const existingIds = Object.values(actividades)
      .flatMap(sectionActivities => Array.isArray(sectionActivities) ? sectionActivities : [])
      .map(activity => String(activity?.id || ''));
    const generated = createSectionActivityId({
      sectionKey: secKey,
      sectionLabel: section?.label,
      existingIds,
      sectionItemCount: actsDeSeccion(secKey).length,
    });
    const newId = generated.id;
    // Los bloques nuevos nacen informativos; el administrador activa horas si aplican.
    const rootOnlyDefaults = getSeccionColumnas(secKey).length === 0 ? { tipo: 'sin_horas' } : {};
    // El bloque nuevo se agrega al final, debajo de los ya configurados.
    const next = [...actsDeSeccion(secKey), { id: newId, nombre: 'Nueva actividad', items: [], ...rootOnlyDefaults }];
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
    setBlockExpanded(`${secKey}:${newId}`, true);
  };
  const removeAct = (secKey: string, idx: number) => {
    const next = actsDeSeccion(secKey).filter((_, i) => i !== idx);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };

  // ── Ítems CRUD ──
  const addItem = (secKey: string, actIdx: number, insertAt?: number, parentColIdx?: number) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const newItem: ExtItem = { nombre: '', tipo: 'sin_horas', horas: 0, parent_col_idx: parentColIdx };
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
    const newItems = (act.items || []).map((it, ii) => {
      if (ii !== itemIdx) return it;
      if (field === 'tipo') {
        const nextType = val as ExtItem['tipo'];
        if (nextType === 'sin_horas') return { ...it, tipo: nextType };
        if (nextType === 'intervalo') {
          const currentMin = Number(it.horas_min);
          const nextMin = Number.isFinite(currentMin) && currentMin > 0 ? currentMin : 1;
          const currentMax = Number(it.horas);
          const nextMax = Number.isFinite(currentMax) && currentMax > nextMin ? currentMax : Math.max(2, nextMin + 1);
          return { ...it, tipo: nextType, horas_min: nextMin, horas: nextMax };
        }
        if (nextType === 'porcentaje') {
          const currentPercentage = Number(it.porcentaje_pta);
          return {
            ...it,
            tipo: nextType,
            porcentaje_pta: Number.isFinite(currentPercentage)
              ? Math.min(100, Math.max(1, currentPercentage))
              : 1,
          };
        }
        const currentHours = Number(it.horas);
        return { ...it, tipo: nextType, horas: Number.isFinite(currentHours) && currentHours > 0 ? currentHours : 1 };
      }
      return {
        ...it,
        [field]: field === 'nombre' || field === 'unidad' ? val : (val === '' ? '' : Number(val)),
      };
    });
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

  // ── Reemplazo puntual de un ítem (usado por las columnas de detalle en escalera) ──
  const replaceItem = (secKey: string, actIdx: number, itemIdx: number, nextItem: ExtItem) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const items = [...(act.items || [])];
    items[itemIdx] = nextItem;
    const next = acts.map((a, i) => i === actIdx ? { ...a, items } : a);
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: next });
  };

  // ── Columnas a nivel de sección ──
  const ITEMS_KEY = '_items_';
  // Máximo de columnas creadas con "Agregar columna". La columna raíz y el
  // nivel de actividades no cuentan (con ellas el total llega a 7).
  const MAX_CUSTOM_COLUMNS = 5;
  const getStructureLabels = (secKey: string) => {
    const section = secciones.find(s => s.key === secKey);
    return {
      root: section?.columna_raiz_nombre || 'Componente',
      rootEnabled: section?.columna_raiz_habilitada !== false,
      items: section?.columna_items_nombre || 'Actividad / Ítem',
    };
  };
  const updateStructureLabel = (secKey: string, field: 'columna_raiz_nombre' | 'columna_items_nombre', value: string) => {
    if (!value.trim()) return;
    handleChange('comp_secciones', secciones.map(section =>
      section.key === secKey ? { ...section, [field]: value } : section,
    ));
  };
  const getSeccionColumnas = (secKey: string): string[] => {
    const sec = secciones.find(s => s.key === secKey);
    const raw = sec?.columnas;
    const cols = Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string' && c.length > 0) : [];
    if (!Array.isArray(raw)) return [ITEMS_KEY];
    return cols;
  };
  const addColumnaSeccion = (secKey: string, nombre: string) => {
    const labels = getStructureLabels(secKey);
    const columns = getSeccionColumnas(secKey);
    if (columns.filter(column => column !== ITEMS_KEY).length >= MAX_CUSTOM_COLUMNS) {
      toast.error(`Se admiten máximo ${MAX_CUSTOM_COLUMNS} columnas adicionales`, {
        description: 'La columna raíz y el nivel de actividades no cuentan dentro de este límite.',
      });
      return false;
    }
    if ([labels.root, labels.items, ...columns.filter(column => column !== ITEMS_KEY)]
      .some(column => column.trim().toLocaleLowerCase() === nombre.trim().toLocaleLowerCase())) {
      toast.error('Ya existe una columna con ese nombre');
      return false;
    }
    const newSecs = secciones.map(s => {
      if (s.key !== secKey) return s;
      const base = Array.isArray(s.columnas) ? s.columnas : [ITEMS_KEY];
      return { ...s, columnas: [...base, nombre] };
    });
    handleChange('comp_secciones', newSecs);
    return true;
  };
  const removeColumnaSeccion = (secKey: string, colName: string) => {
    const isUsed = actsDeSeccion(secKey).some(activity =>
      (activity.columnas_valores?.[colName] || []).some(value => String(value || '').trim())
      || (activity.columnas_meta?.[colName] || []).length > 0
      || (activity.items || []).some(item =>
        (item.col_valores?.[colName] || []).some(value => String(value || '').trim())
        || (item.col_meta?.[colName] || []).length > 0),
    );
    if (isUsed) {
      toast.error(`La columna “${colName}” está siendo utilizada`, {
        description: 'Elimina sus valores de todos los bloques antes de quitarla de la estructura.',
      });
      return;
    }
    const newSecs = secciones.map(s =>
      s.key === secKey ? { ...s, columnas: (s.columnas || []).filter(c => c !== colName) } : s
    );
    handleChange('comp_secciones', newSecs);
    // La columna de detalle siguiente en la cadena apuntaba sus padres a la
    // columna eliminada: se limpian para volver al emparejamiento por orden.
    const oldCols = getSeccionColumnas(secKey);
    const itemsPosition = oldCols.indexOf(ITEMS_KEY);
    const chainCols = itemsPosition >= 0 ? oldCols.slice(itemsPosition + 1) : [];
    const chainPosition = chainCols.indexOf(colName);
    const nextChainCol = chainPosition >= 0 && chainPosition + 1 < chainCols.length ? chainCols[chainPosition + 1] : null;
    const acts = actsDeSeccion(secKey);
    const cleaned = acts.map(a => {
      const cv = { ...(a.columnas_valores || {}) };
      const cm = { ...(a.columnas_meta || {}) };
      delete cv[colName];
      delete cm[colName];
      const items = (a.items || []).map(item => {
        const itemValues = { ...(item.col_valores || {}) };
        delete itemValues[colName];
        const itemParents = { ...(item.col_parents || {}) };
        delete itemParents[colName];
        if (nextChainCol) delete itemParents[nextChainCol];
        const itemMeta = { ...(item.col_meta || {}) };
        delete itemMeta[colName];
        return { ...item, col_valores: itemValues, col_parents: itemParents, col_meta: itemMeta };
      });
      return { ...a, columnas_valores: cv, columnas_meta: cm, items };
    });
    handleChange('comp_actividades_v2', { ...actividades, [secKey]: cleaned });
  };
  const removeItemsColumn = (secKey: string) => {
    const hasItems = actsDeSeccion(secKey).some(activity => (activity.items || []).length > 0);
    if (hasItems) {
      toast.error(`La columna “${getStructureLabels(secKey).items}” está siendo utilizada`, {
        description: 'Elimina primero todas las actividades de los bloques; después podrás quitar este nivel.',
      });
      return;
    }
    handleChange('comp_secciones', secciones.map(section =>
      section.key === secKey
        ? { ...section, columnas: getSeccionColumnas(secKey).filter(column => column !== ITEMS_KEY) }
        : section,
    ));
  };
  const restoreItemsColumn = (secKey: string) => {
    const detailColumns = getSeccionColumnas(secKey).filter(column => column !== ITEMS_KEY);
    handleChange('comp_secciones', secciones.map(section =>
      section.key === secKey ? { ...section, columnas: [ITEMS_KEY, ...detailColumns] } : section,
    ));
  };
  const removeRootColumn = (secKey: string) => {
    if (actsDeSeccion(secKey).length > 0) {
      toast.error(`La columna “${getStructureLabels(secKey).root}” está siendo utilizada`, {
        description: 'Elimina primero todos los bloques principales de esta sección.',
      });
      return;
    }
    handleChange('comp_secciones', secciones.map(section =>
      section.key === secKey ? { ...section, columna_raiz_habilitada: false } : section,
    ));
  };
  const restoreRootColumn = (secKey: string) => {
    handleChange('comp_secciones', secciones.map(section =>
      section.key === secKey ? { ...section, columna_raiz_habilitada: true } : section,
    ));
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
      const cm = { ...(a.columnas_meta || {}) };
      if (Object.prototype.hasOwnProperty.call(cv, oldName)) {
        cv[newName] = cv[oldName];
        delete cv[oldName];
      }
      if (Object.prototype.hasOwnProperty.call(cm, oldName)) {
        cm[newName] = cm[oldName];
        delete cm[oldName];
      }
      const items = (a.items || []).map(item => {
        const itemValues = { ...(item.col_valores || {}) };
        if (Object.prototype.hasOwnProperty.call(itemValues, oldName)) {
          itemValues[newName] = itemValues[oldName];
          delete itemValues[oldName];
        }
        const itemParents = { ...(item.col_parents || {}) };
        if (Object.prototype.hasOwnProperty.call(itemParents, oldName)) {
          itemParents[newName] = itemParents[oldName];
          delete itemParents[oldName];
        }
        const itemMeta = { ...(item.col_meta || {}) };
        if (Object.prototype.hasOwnProperty.call(itemMeta, oldName)) {
          itemMeta[newName] = itemMeta[oldName];
          delete itemMeta[oldName];
        }
        return { ...item, col_valores: itemValues, col_parents: itemParents, col_meta: itemMeta };
      });
      return { ...a, columnas_valores: cv, columnas_meta: cm, items };
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
      columnas_meta: { ...(act.columnas_meta || {}), [colName]: [...meta, { tipo: 'sin_horas' }] },
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
  const updateValorColumnaMeta = (secKey: string, actIdx: number, colName: string, valIdx: number, field: 'tipo' | 'horas' | 'horas_min' | 'horas_en' | 'porcentaje_pta', val: any) => {
    const acts = actsDeSeccion(secKey);
    const act = acts[actIdx];
    const meta = [...(act.columnas_meta?.[colName] || [])];
    while (meta.length <= valIdx) meta.push({ tipo: 'sin_horas' });
    const isNumeric = field === 'horas' || field === 'horas_min' || field === 'porcentaje_pta';
    const currentMeta = meta[valIdx] || { tipo: 'sin_horas' };
    if (field === 'tipo' && val === 'sin_horas') {
      meta[valIdx] = { ...currentMeta, tipo: 'sin_horas' };
    } else if (field === 'tipo' && val === 'intervalo') {
      const currentMin = Number((currentMeta as any).horas_min);
      const nextMin = Number.isFinite(currentMin) && currentMin > 0 ? currentMin : 1;
      const currentMax = Number(currentMeta.horas);
      const nextMax = Number.isFinite(currentMax) && currentMax > nextMin ? currentMax : Math.max(2, nextMin + 1);
      meta[valIdx] = { ...currentMeta, tipo: 'intervalo', horas_min: nextMin, horas: nextMax };
    } else if (field === 'tipo' && val === 'porcentaje') {
      const currentPercentage = Number((currentMeta as any).porcentaje_pta);
      meta[valIdx] = {
        ...currentMeta,
        tipo: 'porcentaje',
        porcentaje_pta: Number.isFinite(currentPercentage)
          ? Math.min(100, Math.max(1, currentPercentage))
          : 1,
      };
    } else if (field === 'tipo') {
      const currentHours = Number(currentMeta.horas);
      meta[valIdx] = {
        ...currentMeta,
        tipo: val,
        horas: Number.isFinite(currentHours) && currentHours > 0 ? currentHours : 1,
      };
    } else {
      const numericValue = val === '' ? '' : Number(val) || 0;
      meta[valIdx] = {
        ...currentMeta,
        [field]: field === 'porcentaje_pta' && numericValue !== ''
          ? Math.min(100, Math.max(1, numericValue))
          : isNumeric ? numericValue : val,
      };
    }
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
    if (addColumnaSeccion(colModal.secKey, colNombre.trim())) {
      setColModal(null);
      setColNombre('Evidencia');
    }
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
    <div className="pta-config-builder space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <BuilderSurfaceStyles />
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
                  📋 Las secciones de este submódulo son fijas según el Anexo 1. Configura aquí las actividades disponibles dentro de cada bloque.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-slate-500">
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold mt-0.5">⚡</span>
                    <span><b className="text-slate-600">Orden de columnas:</b> Se conserva el orden de creación para proteger la jerarquía. Cada columna nueva se agrega al final como detalle y no puede reordenarse.</span>
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
              </div>

              {/* ── Editor de sección activa ── */}
              {secciones.map((sec, idx) => sec.key !== seccionActiva ? null : (
                <div key={sec.key} className="space-y-4">
                  {/* Metadatos de la sección */}
                  <div className="flex flex-row items-end gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-[0.65rem] font-bold text-slate-500 uppercase tracking-wider mb-1">Etiqueta</label>
                      <input type="text" value={sec.label}
                        disabled
                        className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-semibold text-sm rounded-lg px-3 py-1.5 cursor-not-allowed" />
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
                      <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs font-semibold">
                        <Lock className="w-3 h-3" /> Sección fija
                      </div>
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
                      <button onClick={() => {
                        if (!getStructureLabels(sec.key).rootEnabled) {
                          toast.error('Agrega primero una columna raíz para crear bloques principales');
                          return;
                        }
                        addAct(sec.key);
                      }}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border-none text-white text-xs font-bold shadow-sm"
                        style={{ background: sec.color }}>
                        <Plus className="w-3.5 h-3.5" /> Agregar bloque principal
                      </button>
                    </div>

                    {/* ── Columnas de la sección ── */}
                    {(() => {
                      const secCols = getSeccionColumnas(sec.key);
                      const firstCol = secCols.find(c => !!c) || '';
                      const firstIsItems = firstCol === ITEMS_KEY;
                      const structureLabels = getStructureLabels(sec.key);
                      const reachedColumnLimit = secCols.filter(column => column !== ITEMS_KEY).length >= MAX_CUSTOM_COLUMNS;
                      return (
                        <>
                        <div className="mb-3 px-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {secCols.length > 0 && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Estructura de orden fijo:</span>
                            )}
                            {secCols.length > 1 && (
                              <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                                ⚡ Todos los niveles admiten configuración de horas; el primero ({firstIsItems ? structureLabels.items : firstCol}) organiza la jerarquía
                              </span>
                            )}
                            {secCols.length > 0 && (
                              <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                <Lock className="h-2.5 w-2.5" /> Orden protegido · columnas no reordenables
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                          {structureLabels.rootEnabled && <div
                            className="flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 py-1 pl-1.5 pr-2 shadow-sm"
                            title="Columna raíz: corresponde al nombre de cada bloque principal"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-black text-indigo-700">1</span>
                            <Lock className="h-3 w-3 shrink-0 text-indigo-400" />
                            <Globe className="h-3 w-3 shrink-0 text-indigo-500" />
                            <input
                              type="text"
                              value={structureLabels.root}
                              onChange={event => updateStructureLabel(sec.key, 'columna_raiz_nombre', event.target.value)}
                              className="min-w-[72px] max-w-[130px] border-none bg-transparent text-[11px] font-bold text-indigo-800 outline-none"
                              style={{ width: `${Math.max(72, structureLabels.root.length * 7)}px` }}
                              aria-label="Nombre de la columna raíz"
                            />
                            <span className="rounded bg-indigo-100 px-1 text-[8px] font-bold uppercase text-indigo-600">Raíz</span>
                            <button
                              type="button"
                              onClick={() => removeRootColumn(sec.key)}
                              className="config-column-delete"
                              title={`Eliminar columna ${structureLabels.root}`}
                              aria-label={`Eliminar columna ${structureLabels.root}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>}
                          {secCols.map((colName, ci) => {
                            const isItemsChip = colName === ITEMS_KEY;
                            const itemsPosition = secCols.indexOf(ITEMS_KEY);
                            const columnRole = itemsPosition < 0 || ci < itemsPosition ? 'Agrupa' : 'Detalle';
                            return (
                            <div key={`col-chip-${ci}`}
                              title={`Posición fija ${ci + (structureLabels.rootEnabled ? 2 : 1)} de la jerarquía`}
                              className={`flex cursor-default select-none items-center gap-1 rounded-lg border py-1 pl-1.5 pr-1 transition-colors ${isItemsChip
                                ? 'border-violet-200 bg-violet-50'
                                : 'border-blue-200 bg-blue-50'
                              }`}>
                              <span className={`flex w-4 h-4 items-center justify-center rounded-full bg-white/80 text-[9px] font-black ${isItemsChip ? 'text-violet-600' : 'text-blue-600'}`}>{ci + (structureLabels.rootEnabled ? 2 : 1)}</span>
                              <Lock className={`h-3 w-3 shrink-0 ${isItemsChip ? 'text-violet-300' : 'text-blue-300'}`} aria-hidden="true" />
                              {isItemsChip ? (
                                <>
                                  <Globe className="w-3 h-3 text-violet-400 shrink-0" />
                                  <input
                                    type="text"
                                    draggable={false}
                                    value={structureLabels.items}
                                    onChange={event => updateStructureLabel(sec.key, 'columna_items_nombre', event.target.value)}
                                    className="min-w-[80px] max-w-[130px] border-none bg-transparent px-0.5 text-[11px] font-semibold text-violet-700 outline-none"
                                    style={{ width: `${Math.max(80, structureLabels.items.length * 7)}px` }}
                                    onMouseDown={event => event.stopPropagation()}
                                    aria-label="Nombre de la columna de actividades"
                                  />
                                  <span className="rounded bg-violet-100 px-1 text-[8px] font-bold uppercase text-violet-600">Filas</span>
                                  <button
                                    type="button"
                                    onClick={event => { event.stopPropagation(); removeItemsColumn(sec.key); }}
                                    className="config-column-delete"
                                    title={`Eliminar nivel ${structureLabels.items}`}
                                    aria-label={`Eliminar nivel ${structureLabels.items}`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
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
                                  <span className="rounded bg-blue-100 px-1 text-[8px] font-bold uppercase text-blue-600">{columnRole}</span>
                                  <button onClick={() => removeColumnaSeccion(sec.key, colName)}
                                    className="config-column-delete"
                                    title={`Eliminar columna ${colName}`}
                                    aria-label={`Eliminar columna ${colName}`}>
                                    <X className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                            );
                          })}
                          {!structureLabels.rootEnabled && (
                            <button
                              type="button"
                              onClick={() => restoreRootColumn(sec.key)}
                              className="flex items-center gap-1 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100"
                            >
                              <Plus className="h-3 w-3" /> Agregar columna raíz
                            </button>
                          )}
                          {!secCols.includes(ITEMS_KEY) && (
                            <button
                              type="button"
                              onClick={() => restoreItemsColumn(sec.key)}
                              className="flex items-center gap-1 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 hover:border-violet-400 hover:bg-violet-100"
                            >
                              <Plus className="h-3 w-3" /> Agregar nivel de actividades
                            </button>
                          )}
                          <button onClick={() => {
                            if (reachedColumnLimit) {
                              toast.error(`Se admiten máximo ${MAX_CUSTOM_COLUMNS} columnas adicionales`);
                              return;
                            }
                            setColModal({ secKey: sec.key, actIdx: 0 });
                            setColNombre('Evidencia');
                          }}
                            disabled={reachedColumnLimit}
                            title={reachedColumnLimit ? `Máximo ${MAX_CUSTOM_COLUMNS} columnas adicionales alcanzado` : 'Agregar otro nivel o detalle a la jerarquía'}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 text-slate-400 text-[11px] font-semibold hover:border-blue-400 hover:text-blue-600 transition-colors bg-white">
                            <Plus className="w-3 h-3" /> Agregar columna
                          </button>
                          </div>
                          {secCols.length > 0 && (
                            <div className="text-[9px] text-slate-400 leading-tight pl-1 mt-1">
                              <b>Jerarquía:</b> {[...(structureLabels.rootEnabled ? [structureLabels.root] : []), ...secCols.map(column => column === ITEMS_KEY ? structureLabels.items : column)].join(' → ')}.
                              {' '}Las columnas posteriores a {structureLabels.items} se anidan en cascada dentro de cada actividad: cada columna vive dentro de los valores de la anterior.
                              {firstIsItems && ' Cada actividad tiene su propio tipo y horas.'}
                              {' '} • <b>Tipos:</b> Sin horas, 🟢 Fija, 🕒 Hasta, 📊 Intervalo y % del PTA.
                            </div>
                          )}
                        </div>
                        </>
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
                          const blockKey = `${sec.key}:${act.id}`;
                          // Estructura de solo columna raíz: el bloque es la actividad
                          // misma y sus horas se configuran directamente en la fila.
                          const isRootOnly = getSeccionColumnas(sec.key).length === 0;
                          const blockExpanded = !isRootOnly && (expandedBlocks[blockKey] ?? aIdx === 0);
                          return (
                            <div key={act.id} draggable
                              onDragStart={(e) => handleDragStart(e, sec.key, aIdx)}
                              onDragOver={(e) => handleDragOver(e, sec.key, aIdx)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, sec.key, aIdx)}
                              onDragEnd={handleDragEnd}
                              className={`config-block-card border-2 rounded-2xl overflow-hidden transition-all bg-white
                                ${draggedActIdx === aIdx && draggedSecKey === sec.key ? 'opacity-40 border-dashed border-blue-400' : ''}
                                ${dragOverActIdx === aIdx && draggedSecKey === sec.key ? 'border-blue-500 shadow-blue-500/20 shadow-lg scale-[1.01]' : blockExpanded ? 'border-violet-300 shadow-lg shadow-violet-900/5' : 'border-slate-200 shadow-sm hover:border-violet-200 hover:shadow-md'}
                              `}>
                              {/* ── Cabecera de Actividad ── */}
                              <div className={`flex flex-row items-center gap-3 p-3 transition-colors ${blockExpanded ? 'bg-gradient-to-r from-violet-50 via-white to-blue-50 border-b border-violet-100' : 'bg-slate-50'}`}>
                                <div className="flex h-10 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg border border-violet-200 bg-white text-violet-400 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-600 active:cursor-grabbing" title="Arrastra para cambiar el orden del bloque">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                                <input
                                  type="text"
                                  key={`pos-${act.id}-${aIdx}`}
                                  defaultValue={aIdx + 1}
                                  title={`Orden ${aIdx + 1}: escribe otra posición o arrastra el control lateral`}
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
                                    {getStructureLabels(sec.key).root}
                                  </span>
                                  <input type="text" value={act.nombre}
                                    onChange={e => updateAct(sec.key, aIdx, 'nombre', e.target.value)}
                                    placeholder={`Valor de ${getStructureLabels(sec.key).root.toLocaleLowerCase()}...`}
                                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold text-[13px] rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none" />
                                </div>
                                <div className="w-32 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Programa</span>
                                  <select
                                    value={(act as any).nivel_programa || ''}
                                    onChange={e => updateAct(sec.key, aIdx, 'nivel_programa', e.target.value)}
                                    disabled={((act as any).tipo_aprobacion || 'gestion_profesoral') === 'decanatura'}
                                    title={((act as any).tipo_aprobacion || 'gestion_profesoral') === 'decanatura'
                                      ? 'No aplica: al ser Decanatura (Territorial), la aprobación se abre por cada territorial del PTA, no por nivel de programa.'
                                      : 'Enruta la aprobación/revisión de esta actividad al Revisor/Aprobador de Complementarias Pregrado o Posgrado. Sin selección (Ninguno): la revisa/aprueba Complementarias.'}
                                    className="w-full bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                  >
                                    <option value="">Ninguno</option>
                                    <option value="pregrado">Pregrado</option>
                                    <option value="posgrado">Posgrado</option>
                                  </select>
                                </div>
                                {/* EFDS-1353: ámbito de aprobación. Decanatura abre una
                                    aprobación por cada territorial presente en el PTA
                                    (unanimidad); Gestión Profesoral mantiene el flujo único. */}
                                <div className="w-40 shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Aprueba</span>
                                  <select
                                    value={(act as any).tipo_aprobacion || 'gestion_profesoral'}
                                    onChange={e => updateAct(sec.key, aIdx, 'tipo_aprobacion', e.target.value)}
                                    title="Gestión Profesoral: flujo de aprobación único. Decanatura (Territorial): se abre una aprobación por cada territorial incluida en la complementaria, y el componente queda aprobado solo cuando todas aprueban."
                                    className="w-full bg-white border border-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-violet-500/20 outline-none"
                                  >
                                    <option value="gestion_profesoral">Gestión Profesoral</option>
                                    <option value="decanatura">Decanatura (Territorial)</option>
                                  </select>
                                </div>
                                {!isRootOnly && (
                                <div className="shrink-0">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filas</span>
                                  <div className="flex h-[34px] min-w-[58px] items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-extrabold text-slate-700">
                                    {(act.items || []).length}
                                  </div>
                                </div>
                                )}
                                {/* Horas directas del bloque cuando la estructura es solo columna raíz */}
                                {isRootOnly ? (
                                  <div className="shrink-0">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Horas</span>
                                    <HourLimitControl
                                      type={(act as any).tipo || 'hasta'}
                                      hours={(act as any).tipo === 'porcentaje' ? ((act as any).porcentaje_pta ?? 1) : ((act as any).max_horas ?? 1)}
                                      minHours={(act as any).min_horas ?? 1}
                                      onTypeChange={value => updateActTipo(sec.key, aIdx, value)}
                                      onHoursChange={value => (act as any).tipo === 'porcentaje'
                                        ? updateAct(sec.key, aIdx, 'porcentaje_pta', Math.min(100, Math.max(1, Number(value) || 1)))
                                        : updateAct(sec.key, aIdx, 'max_horas', value === '' ? 1 : Math.max(1, Number(value) || 1))}
                                      onMinHoursChange={value => updateAct(sec.key, aIdx, 'min_horas', value === '' ? 1 : Math.max(1, Number(value) || 1))}
                                      compact
                                    />
                                  </div>
                                ) : (() => {
                                  const secCols = getSeccionColumnas(sec.key) || [];
                                  const firstColumn = secCols.find(Boolean) || '';
                                  const itemsPosition = secCols.indexOf(ITEMS_KEY);
                                  let total = 0;
                                  let totalPercentage = 0;
                                  const addRecognition = (source: any) => {
                                    if (!source || source.tipo === 'sin_horas') return;
                                    if (source.tipo === 'porcentaje') {
                                      totalPercentage += Math.min(100, Math.max(1, Number(source.porcentaje_pta) || 1));
                                    } else {
                                      total += Number(source.horas ?? source.max_horas) || 0;
                                    }
                                  };
                                  if (firstColumn === ITEMS_KEY) {
                                    (act.items || []).forEach(addRecognition);
                                  } else if (firstColumn) {
                                    (act.columnas_meta?.[firstColumn] || []).forEach((meta: any, valueIndex: number) => {
                                      if ((meta?.horas_en || 'linea') === 'linea') addRecognition(meta);
                                      else (act.items || [])
                                        .filter((item: any) => item.parent_col_idx === valueIndex || (item.parent_col_idx === undefined && valueIndex === 0))
                                        .forEach(addRecognition);
                                    });
                                  }
                                  secCols.filter(col => col !== ITEMS_KEY && col !== firstColumn).forEach(col => {
                                    if (itemsPosition >= 0 && secCols.indexOf(col) > itemsPosition) {
                                      (act.items || []).forEach((item: any) =>
                                        (item.col_meta?.[col] || []).forEach(addRecognition));
                                    } else {
                                      (act.columnas_meta?.[col] || []).forEach(addRecognition);
                                    }
                                  });
                                  return total > 0 || totalPercentage > 0 || isEtapa ? (
                                    <div className="shrink-0">
                                      <span className="text-[10px] font-bold text-[#003DA5] uppercase block mb-1">Total Horas</span>
                                      <div className="flex items-center justify-center bg-blue-50/50 border border-blue-200 text-[#003DA5] font-extrabold text-[13px] rounded-lg px-3 py-1.5 h-[34px] min-w-[70px]">
                                        {totalPercentage > 0 ? `${totalPercentage}% PTA${total > 0 ? ` + ${total}h` : ''}` : `${total}h`}
                                      </div>
                                    </div>
                                  ) : null;
                                })()}
                                {!isRootOnly && (
                                <button
                                  type="button"
                                  onClick={() => setBlockExpanded(blockKey, !blockExpanded)}
                                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 text-[11px] font-bold text-violet-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50"
                                  title={blockExpanded ? 'Cerrar bloque' : 'Editar este bloque'}
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${blockExpanded ? 'rotate-180' : ''}`} />
                                  {blockExpanded ? 'Cerrar' : 'Editar'}
                                </button>
                                )}
                                <button onClick={() => removeAct(sec.key, aIdx)}
                                  className="config-block-delete self-end"
                                  title={`Eliminar bloque ${act.nombre}`}
                                  aria-label={`Eliminar bloque ${act.nombre}`}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {blockExpanded && (
                              <div className="config-block-body bg-slate-100/70 p-3">
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
                                              <span className="flex-1 text-[10px] font-bold text-slate-500 uppercase">{getStructureLabels(sec.key).items}</span>
                                              {showItemHoras && <span className="w-24 shrink-0 text-[10px] font-bold text-slate-400 uppercase">Tipo</span>}
                                              {showItemHoras && <span className="w-20 shrink-0 text-[10px] font-bold text-slate-400 uppercase">Horas</span>}
                                              <span className="w-7 shrink-0" />
                                            </div>
                                            {(act.items || []).map((item, iIdx) => {
                                              const itemDragKey = `${sec.key}:${aIdx}`;
                                              return (
                                              <div key={iIdx} className="config-activity-entry space-y-2">
                                                <div draggable
                                                  onDragStart={e => { e.stopPropagation(); setDragItemIdx(iIdx); setDragItemKey(itemDragKey); e.dataTransfer.effectAllowed = 'move'; }}
                                                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); if (dragItemKey === itemDragKey) setDragOverItemIdx(iIdx); }}
                                                  onDrop={e => { e.preventDefault(); e.stopPropagation(); if (dragItemIdx !== null && dragItemKey === itemDragKey) { reorderItems(sec.key, aIdx, dragItemIdx, iIdx); } setDragItemIdx(null); setDragOverItemIdx(null); setDragItemKey(null); }}
                                                  onDragEnd={() => { setDragItemIdx(null); setDragOverItemIdx(null); setDragItemKey(null); }}
                                                  className={`config-activity-main-row flex flex-wrap items-center gap-2 p-2 rounded-lg border transition-all select-none ${
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
                                                    <HourLimitControl
                                                      type={item.tipo}
                                                      hours={item.tipo === 'porcentaje' ? (item.porcentaje_pta ?? 1) : item.horas}
                                                      minHours={(item as any).horas_min}
                                                      onTypeChange={value => updateItem(sec.key, aIdx, iIdx, 'tipo', value)}
                                                      onHoursChange={value => item.tipo === 'porcentaje'
                                                        ? updateItem(sec.key, aIdx, iIdx, 'porcentaje_pta', Math.min(100, Math.max(1, Number(value) || 1)))
                                                        : updateItem(sec.key, aIdx, iIdx, 'horas', value)}
                                                      onMinHoursChange={value => updateItem(sec.key, aIdx, iIdx, 'horas_min', value)}
                                                      compact
                                                    />
                                                  )}
                                                  <button onClick={() => removeItem(sec.key, aIdx, iIdx)}
                                                    className="config-inline-delete"
                                                    title="Eliminar actividad"
                                                    aria-label="Eliminar actividad">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>

                                                {/* ── Columnas de detalle anidadas en escalera ── */}
                                                {(() => {
                                                  const itemsPos = secCols.indexOf(ITEMS_KEY);
                                                  const subCols = itemsPos >= 0 ? secCols.slice(itemsPos + 1).filter(c => c && c !== ITEMS_KEY) : [];
                                                  return subCols.length > 0 ? (
                                                    <div className="ml-8 mr-2">
                                                      <DetailColumnChain
                                                        item={item}
                                                        chain={subCols}
                                                        onItemChange={next => replaceItem(sec.key, aIdx, iIdx, next)}
                                                      />
                                                    </div>
                                                  ) : null;
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

                                  // ─ Skip: las columnas posteriores a _items_ se renderizan
                                  // anidadas en escalera dentro de cada ítem ─
                                  const itemsPos2 = secCols.indexOf(ITEMS_KEY);
                                  if (isEtapa && itemsPos2 >= 0 && secCols.indexOf(colName) > itemsPos2 && colName !== firstColName) {
                                    return null;
                                  }
                                  // ─ Bloque columna regular (Línea, Evidencia, etc.) ─
                                  const colVals = getActColValues(act, colName);
                                  const isFirst = colName === firstColName;
                                  const colMeta = act.columnas_meta?.[colName] || [];
                                  const subColsB = itemsPos2 >= 0
                                    ? secCols.slice(itemsPos2 + 1).filter(c => c && c !== ITEMS_KEY && c !== firstColName)
                                    : [];
                                  return (
                                    <div key={colName} className="bg-white border-t border-slate-100">
                                      <div className="p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1.5">
                                            <Tag className="w-3 h-3" /> {colName}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[8px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5 font-medium">Horas</span>
                                            <button onClick={() => addValorColumna(sec.key, aIdx, colName)}
                                              className="text-[10px] text-blue-500 font-semibold flex items-center gap-0.5 hover:text-blue-700">
                                              + Agregar
                                            </button>
                                          </div>
                                        </div>
                                        {colVals.map((val, vIdx) => {
                                          const meta = colMeta[vIdx] || (isFirst
                                            ? { tipo: 'hasta', horas: 1 }
                                            : { tipo: 'sin_horas' });
                                          const horasEn = (meta as any).horas_en || 'linea';
                                          // Items belonging to this first-col value
                                          const childItems = isFirst ? (act.items || []).filter((it: any, itIdx: number) => it.parent_col_idx === vIdx || (it.parent_col_idx === undefined && vIdx === 0)) : [];
                                          return (
                                            <div key={vIdx} className="space-y-1.5">
                                              <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                <input type="text" value={val}
                                                  onChange={e => updateValorColumna(sec.key, aIdx, colName, vIdx, e.target.value)}
                                                  placeholder={`${colName}...`}
                                                  className="flex-1 bg-white border border-slate-200 text-slate-700 text-[12px] rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                                                <HourLimitControl
                                                    type={(meta as any).tipo || (isFirst ? 'hasta' : 'sin_horas')}
                                                    hours={(meta as any).tipo === 'porcentaje' ? ((meta as any).porcentaje_pta ?? 1) : (meta as any).horas}
                                                    minHours={(meta as any).horas_min}
                                                    onTypeChange={value => updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'tipo', value)}
                                                    onHoursChange={value => (meta as any).tipo === 'porcentaje'
                                                      ? updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'porcentaje_pta', value)
                                                      : updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'horas', value)}
                                                    onMinHoursChange={value => updateValorColumnaMeta(sec.key, aIdx, colName, vIdx, 'horas_min', value)}
                                                    compact
                                                  />
                                                <button onClick={() => removeValorColumna(sec.key, aIdx, colName, vIdx)}
                                                  className="config-inline-delete"
                                                  title={`Eliminar valor de ${colName}`}
                                                  aria-label={`Eliminar valor de ${colName}`}>
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
                                                      <span className="text-[9px] font-bold text-violet-500 uppercase">{getStructureLabels(sec.key).items}</span>
                                                      {childItems.map((cItem: any, ciIdx: number) => {
                                                        const realIdx = (act.items || []).indexOf(cItem);
                                                        return (
                                                          <div key={ciIdx} className="config-activity-entry space-y-1.5">
                                                            <div className="config-activity-main-row flex flex-wrap items-center gap-2 p-1.5 rounded-lg border">
                                                              <input type="text" value={cItem.nombre}
                                                                onChange={e => updateItem(sec.key, aIdx, realIdx, 'nombre', e.target.value)}
                                                                placeholder="Nombre..."
                                                                className="flex-1 bg-white border border-slate-200 text-slate-700 text-[11px] rounded-md px-2 py-1 outline-none" />
                                                              <HourLimitControl
                                                                type={cItem.tipo}
                                                                hours={cItem.tipo === 'porcentaje' ? (cItem.porcentaje_pta ?? 1) : cItem.horas}
                                                                minHours={(cItem as any).horas_min}
                                                                onTypeChange={value => updateItem(sec.key, aIdx, realIdx, 'tipo', value)}
                                                                onHoursChange={value => cItem.tipo === 'porcentaje'
                                                                  ? updateItem(sec.key, aIdx, realIdx, 'porcentaje_pta', Math.min(100, Math.max(1, Number(value) || 1)))
                                                                  : updateItem(sec.key, aIdx, realIdx, 'horas', value)}
                                                                onMinHoursChange={value => updateItem(sec.key, aIdx, realIdx, 'horas_min', value)}
                                                                compact
                                                              />
                                                              <button onClick={() => removeItem(sec.key, aIdx, realIdx)}
                                                                className="config-inline-delete"
                                                                title="Eliminar actividad"
                                                                aria-label="Eliminar actividad">
                                                                <X className="w-3 h-3" />
                                                              </button>
                                                            </div>
                                                            {/* ── Columnas de detalle anidadas en escalera ── */}
                                                            {subColsB.length > 0 && (
                                                              <div className="ml-6 mr-1">
                                                                <DetailColumnChain
                                                                  item={cItem}
                                                                  chain={subColsB}
                                                                  onItemChange={next => replaceItem(sec.key, aIdx, realIdx, next)}
                                                                />
                                                              </div>
                                                            )}
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
                              )}
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

      <DetailColumnModal
        open={!!colModal}
        value={colNombre}
        existingColumns={colModal ? [
          getStructureLabels(colModal.secKey).root,
          getStructureLabels(colModal.secKey).items,
          ...getSeccionColumnas(colModal.secKey).filter(column => column !== ITEMS_KEY),
        ] : []}
        onChange={setColNombre}
        onClose={() => { setColModal(null); setColNombre('Evidencia'); }}
        onConfirm={confirmAddColumna}
      />
    </div>
  );
}
