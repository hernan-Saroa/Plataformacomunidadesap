/**
 * Configuración → Procesos
 * Catálogo parametrizado de procesos para Universo de Auditoría.
 * Crear, editar e inactivar procesos (sin eliminar historial).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Plus, Edit2, X, Loader2, Search, CheckCircle2, XCircle,
  RefreshCw, Settings, Tag, Trash2, Save, ChevronDown, ChevronRight,
  Building2, Star, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '../services/api/controlInternoService';
import type { ProcesoAuditable } from '../services/api/controlInternoService';
import { HeaderSeccionConfig } from './HeaderSeccionConfig';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE PROCESO — Todos en localStorage (editables y eliminables)
// ════════════════════════════════════════════════════════════════════════════

type TipoItem = { value: string; label: string; color: string };

const TIPOS_DEFAULT: TipoItem[] = [
  { value: 'estrategico', label: 'Estratégico', color: 'bg-purple-100 text-purple-700' },
  { value: 'misional',    label: 'Misional',    color: 'bg-blue-100 text-blue-700'     },
  { value: 'apoyo',       label: 'Apoyo',       color: 'bg-green-100 text-green-700'   },
  { value: 'transversal', label: 'Transversal', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'evaluacion',  label: 'Evaluación',  color: 'bg-orange-100 text-orange-700' },
  { value: 'territorial', label: 'Territorial', color: 'bg-teal-100 text-teal-700'     },
];

const ALL_COLORS = [
  'bg-purple-100 text-purple-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-indigo-100 text-indigo-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-amber-100 text-amber-700',
  'bg-lime-100 text-lime-700',
];

const TIPOS_STORAGE_KEY = 'esap_tipos_proceso_all';

export function loadTipos(): TipoItem[] {
  try {
    const raw = localStorage.getItem(TIPOS_STORAGE_KEY);
    if (!raw) return TIPOS_DEFAULT;
    const stored: TipoItem[] = JSON.parse(raw);
    // Merge: add any missing default types (e.g. 'apoyo') that weren't in old localStorage
    const existingValues = new Set(stored.map(t => t.value));
    const missing = TIPOS_DEFAULT.filter(d => !existingValues.has(d.value));
    if (missing.length > 0) {
      const merged = [...stored, ...missing];
      localStorage.setItem(TIPOS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return stored;
  } catch { return TIPOS_DEFAULT; }
}

function saveTipos(tipos: TipoItem[]) {
  localStorage.setItem(TIPOS_STORAGE_KEY, JSON.stringify(tipos));
}

// ════════════════════════════════════════════════════════════════════════════
// PROCESOS ESPECIALES (★) — IDs en localStorage
// ════════════════════════════════════════════════════════════════════════════

const ESP_IDS_KEY = 'esap_esp_process_ids';

export function loadEspIds(): Set<string> {
  try {
    const raw = localStorage.getItem(ESP_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveEspIds(ids: Set<string>) {
  localStorage.setItem(ESP_IDS_KEY, JSON.stringify([...ids]));
}

// ════════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL
// ════════════════════════════════════════════════════════════════════════════

const FORM_VACIO = { nombre: '', codigo: '', tipo: 'estrategico', macroproceso: '', dependencia: '', esEspecial: false };
// dependencias: array de strings separados por "; " al guardarse en el campo dependencia

function createClientId(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
  }

  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════════════════

export function ConfiguracionProcesosModule() {
  const [procesos, setProcesos]   = useState<ProcesoAuditable[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando]   = useState<ProcesoAuditable | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm]           = useState(FORM_VACIO);

  // ── Unidades Auditables ──
  const [unidades, setUnidades] = useState<{ id: string; nombre: string; descripcion: string }[]>([]);

  // ── Filas Expandidas ──
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [confirmandoInactivar, setConfirmandoInactivar] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Procesos especiales ★ ──
  const [espIds, setEspIds] = useState<Set<string>>(loadEspIds);

  // ── Dependencias múltiples ──
  const [dependencias, setDependencias] = useState<string[]>([]);
  const [depInput, setDepInput]         = useState('');

  // ── Gestión de tipos ──
  const [tiposList, setTiposList]           = useState<TipoItem[]>(loadTipos);
  const [gestionarTipos, setGestionarTipos] = useState(false);
  const [nuevoTipoLabel, setNuevoTipoLabel] = useState('');
  const [editandoTipo, setEditandoTipo]     = useState<TipoItem | null>(null);
  const [editandoTipoLabel, setEditandoTipoLabel] = useState('');
  
  // Nuevo estado para la estructura intuitiva de unidades
  const [unidadInput, setUnidadInput] = useState('');

  // ── Cargar procesos ──
  const fetchProcesos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await controlInternoService.getProcesosAuditables(false);
      setProcesos(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Error al cargar procesos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProcesos(); }, [fetchProcesos]);

  const procesosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return procesos;
    const q = busqueda.toLowerCase();
    return procesos.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      (p.unidadesAuditables || []).some(u => u.nombre.toLowerCase().includes(q)) ||
      (p.macroproceso || '').toLowerCase().includes(q)
    );
  }, [procesos, busqueda]);

  const setField = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleOpenCreate = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setDependencias([]);
    setDepInput('');
    setUnidades([{ id: createClientId(), nombre: '', descripcion: '' }]);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProcesoAuditable) => {
    setEditando(p);
    const tipoRaw = (p.tipo || '').toLowerCase();
    // Buscar el tipo en la lista; si no existe, usar el valor raw de la DB tal cual
    const tipo = tiposList.find(t =>
      t.value === tipoRaw || t.label.toLowerCase() === tipoRaw
    )?.value || tipoRaw;
    // Dividir dependencias guardadas (separadas por "; ")
    const deps = (p.dependencia || '').split(';').map(d => d.trim()).filter(Boolean);
    setDependencias(deps);
    setDepInput('');
    
    let initialUnidades = p.unidadesAuditables || [];
    if (initialUnidades.length === 0 && p.macroproceso) {
      initialUnidades = [{ id: createClientId(), nombre: p.macroproceso, descripcion: '' }];
    }
    if (initialUnidades.length === 0) {
      initialUnidades = [{ id: createClientId(), nombre: '', descripcion: '' }];
    }
    setUnidades(initialUnidades);

    setForm({
      nombre:       p.nombre,
      codigo:       p.codigo,
      tipo,
      macroproceso: p.macroproceso || '',
      dependencia:  p.dependencia  || '',
      esEspecial:   espIds.has(p.id),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.codigo.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }
    const filteredUnidades = unidades.filter(u => u.nombre.trim());
    if (filteredUnidades.length === 0) {
      toast.error('Agregue al menos una unidad auditable');
      return;
    }
    const allDeps = [...dependencias];
    if (depInput.trim()) allDeps.push(depInput.trim());
    if (allDeps.length === 0) {
      toast.error('Agregue al menos una dependencia responsable');
      return;
    }
    const dependenciaStr = allDeps.join('; ');

    setGuardando(true);
    try {
      const payload: Partial<ProcesoAuditable> = {
        nombre:       form.nombre,
        codigo:       form.codigo,
        tipo:         form.tipo as any,
        macroproceso: filteredUnidades[0].nombre, // Backward compatibility
        unidadesAuditables: filteredUnidades,
        dependencia:  dependenciaStr,
        responsable:  dependenciaStr,
        descripcion:  form.nombre,
      };

      let savedId: string;
      if (editando) {
        await controlInternoService.updateProceso(editando.id, payload);
        savedId = editando.id;
        toast.success('Proceso actualizado');
      } else {
        const created = await controlInternoService.createProceso({
          ...payload,
          evaluacionRiesgo: {
            probabilidad:    1,
            impacto:         1,
            nivelControl:    2,
            riesgoInherente: 1,
            riesgoResidual:  0.5,
            nivelRiesgo:     'bajo' as const,
          },
          frecuenciaAuditoria: 'anual',
        });
        savedId = (created as any)?.id || '';
        toast.success('Proceso creado');
      }

      // Persistir bandera ★ en localStorage
      if (savedId) {
        const nuevosEsp = new Set(espIds);
        if (form.esEspecial) nuevosEsp.add(savedId);
        else nuevosEsp.delete(savedId);
        setEspIds(nuevosEsp);
        saveEspIds(nuevosEsp);
      }

      setModalOpen(false);
      setSuccessMsg(editando ? `"${form.nombre}" actualizado` : `"${form.nombre}" creado`);
      setTimeout(() => setSuccessMsg(null), 1800);
      fetchProcesos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el proceso');
    } finally {
      setGuardando(false);
    }
  };

  const handleInactivar = async (p: ProcesoAuditable) => {
    try {
      await controlInternoService.inactivarProceso(p.id);
      toast.success('Proceso inactivado');
      setConfirmandoInactivar(null);
      fetchProcesos();
    } catch { toast.error('Error al inactivar'); }
  };

  const handleActivar = async (p: ProcesoAuditable) => {
    try {
      await controlInternoService.activarProceso(p.id);
      toast.success('Proceso reactivado');
      fetchProcesos();
    } catch { toast.error('Error al activar'); }
  };

  // ── Gestión de tipos ──
  const handleAgregarTipo = () => {
    const label = nuevoTipoLabel.trim();
    if (!label) return;
    const value = label
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');
    if (tiposList.some(t => t.value === value)) {
      toast.error('Ya existe un tipo con ese nombre');
      return;
    }
    const color = ALL_COLORS[tiposList.length % ALL_COLORS.length];
    const nuevos = [...tiposList, { value, label, color }];
    setTiposList(nuevos);
    saveTipos(nuevos);
    setNuevoTipoLabel('');
    toast.success(`Tipo "${label}" agregado`);
  };

  const handleGuardarEditTipo = () => {
    if (!editandoTipo || !editandoTipoLabel.trim()) return;
    const nuevos = tiposList.map(t =>
      t.value === editandoTipo.value ? { ...t, label: editandoTipoLabel.trim() } : t
    );
    setTiposList(nuevos);
    saveTipos(nuevos);
    setEditandoTipo(null);
    toast.success('Tipo actualizado');
  };

  const handleEliminarTipo = (value: string) => {
    if (!confirm('¿Eliminar este tipo? Los procesos que lo usen no serán afectados.')) return;
    const nuevos = tiposList.filter(t => t.value !== value);
    setTiposList(nuevos);
    saveTipos(nuevos);
  };

  const getTipoInfo = (tipoValue: string): TipoItem =>
    tiposList.find(t =>
      t.value === tipoValue ||
      t.value === (tipoValue || '').toLowerCase() ||
      t.label.toLowerCase() === (tipoValue || '').toLowerCase()
    ) || { value: tipoValue, label: tipoValue, color: 'bg-gray-100 text-gray-600' };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3">

      {/* ─── Cabecera ─── */}
      <HeaderSeccionConfig
        icon={<Layers className="w-full h-full" />}
        titulo="Catálogo de Procesos"
        subtitulo="Procesos parametrizados para Universo de Auditoría"
      >
        <button
          onClick={() => setGestionarTipos(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
            gestionarTipos ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
          }`}
          title="Gestionar tipos de proceso"
        >
          <Settings className="w-3.5 h-3.5" /> Tipos
        </button>
        <button onClick={fetchProcesos} className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-50" title="Actualizar">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Crear proceso
        </button>
      </HeaderSeccionConfig>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o macroproceso..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* ─── Panel Gestionar Tipos ─── */}
      <AnimatePresence>
        {gestionarTipos && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-white rounded-xl border-2 border-blue-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-gray-900">Gestionar Tipos de Proceso</h3>
                </div>
                <button
                  onClick={() => {
                    if (!confirm('¿Restaurar los tipos predeterminados? Se perderán los tipos personalizados.')) return;
                    setTiposList(TIPOS_DEFAULT);
                    saveTipos(TIPOS_DEFAULT);
                    toast.success('Tipos restaurados');
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Restaurar predeterminados
                </button>
              </div>

              {/* Lista de todos los tipos */}
              <div className="space-y-2 mb-4">
                {tiposList.map(t => (
                  <div key={t.value} className="flex items-center gap-2">
                    {editandoTipo?.value === t.value ? (
                      <>
                        <input
                          value={editandoTipoLabel}
                          onChange={e => setEditandoTipoLabel(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleGuardarEditTipo()}
                          className="flex-1 px-3 py-1.5 text-sm border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/10"
                          autoFocus
                        />
                        <button onClick={handleGuardarEditTipo} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-700" title="Guardar">
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditandoTipo(null)} className="p-1.5 border rounded hover:bg-gray-50" title="Cancelar">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={`flex-1 px-3 py-1 rounded-full text-xs font-medium ${t.color}`}>
                          {t.label}
                        </span>
                        <button
                          onClick={() => { setEditandoTipo(t); setEditandoTipoLabel(t.label); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEliminarTipo(t.value)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Agregar tipo nuevo */}
              <div className="flex gap-2">
                <input
                  value={nuevoTipoLabel}
                  onChange={e => setNuevoTipoLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAgregarTipo()}
                  placeholder="Nombre del nuevo tipo..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                />
                <button
                  onClick={handleAgregarTipo}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tabla ─── */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        {procesosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No hay procesos</p>
            <p className="text-sm mt-1">Cree procesos para usarlos en Universo de Auditoría</p>
            <button onClick={handleOpenCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              Crear primer proceso
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="w-10 px-3 py-3"></th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Código</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Proceso</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Tipo</th>
                  <th className="text-center px-3 py-3 font-semibold text-gray-700">Unidades</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Dependencia responsable</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Estado</th>
                  <th className="px-3 py-3 font-semibold text-gray-700 w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {procesosFiltrados.map((p) => {
                  const tipoInfo = getTipoInfo(p.tipo || '');
                  const isExpanded = expandedRows.has(p.id);
                  const units = p.unidadesAuditables || (p.macroproceso ? [{ id: 'old', nombre: p.macroproceso, descripcion: '' }] : []);
                  return (
                    <React.Fragment key={p.id}>
                    <tr onClick={() => toggleRow(p.id)} className={`border-b transition-colors cursor-pointer ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-gray-50/60'}`}>
                      <td className="px-3 py-2.5 text-center text-gray-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4 mx-auto" /> : <ChevronRight className="w-4 h-4 mx-auto" />}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{p.codigo}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        <span className="flex items-center gap-1.5">
                          {p.nombre}
                          {espIds.has(p.id) && (
                            <span className="text-amber-500 text-sm leading-none" title="Proceso especial — se audita todos los años">★</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${tipoInfo.color}`}>
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px]">
                          {units.length}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {p.dependencia
                          ? p.dependencia.split(';').map(d => d.trim()).filter(Boolean).map((d, i) => (
                              <span key={i} className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded mr-1 mb-0.5">{d}</span>
                            ))
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          (p as any).activo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {(p as any).activo !== false
                            ? <><CheckCircle2 className="w-3 h-3" /> Activo</>
                            : <><XCircle className="w-3 h-3" /> Inactivo</>
                          }
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {(p as any).activo !== false ? (
                            confirmandoInactivar === p.id ? (
                              <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
                                <span className="text-[11px] text-red-700 font-semibold whitespace-nowrap">¿Inactivar?</span>
                                <button
                                  onClick={() => handleInactivar(p)}
                                  className="px-2 py-0.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => setConfirmandoInactivar(null)}
                                  className="px-2 py-0.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmandoInactivar(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Inactivar">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )
                          ) : (
                            <button onClick={() => handleActivar(p)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Activar">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/50 border-b border-blue-100">
                        <td colSpan={8} className="p-0">
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 pl-12 overflow-hidden">
                            <div className="bg-white rounded-lg border border-blue-100 shadow-sm p-4 text-sm max-w-3xl">
                              <h4 className="font-semibold text-gray-800 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-600" />
                                Unidades Auditables vinculadas ({units.length})
                              </h4>
                              {units.length > 0 ? (
                                <ul className="space-y-2">
                                  {units.map((u, i) => (
                                    <li key={u.id || i} className="flex items-start gap-2 text-gray-700 bg-gray-50/50 p-2 rounded">
                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                      <div>
                                        <span className="font-medium text-gray-900">{u.nombre}</span>
                                        {u.descripcion && <p className="text-gray-500 text-xs mt-0.5">{u.descripcion}</p>}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500 italic text-xs">No hay unidades auditables registradas.</p>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ─── Modal Crear / Editar ─── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 flex items-center justify-center border border-blue-100 shadow-sm text-blue-600">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-[1.15rem] font-bold text-slate-800 tracking-tight leading-tight">
                      {editando ? 'Edición de proceso' : 'Registro de nuevo proceso'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5 font-medium">
                      Configure la estructura y jerarquía para el Universo Auditaje
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-8 py-6 space-y-8 overflow-y-auto" style={{ backgroundColor: '#FCFDFD' }}>

                {/* Info General */}
                <section>
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                    Información Básica
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Código */}
                    <div className="md:col-span-3">
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Código <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.codigo}
                        onChange={(e) => setField('codigo', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white text-sm border border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-sm font-medium"
                        placeholder="Ej. GCON-01"
                      />
                    </div>

                    {/* Nombre */}
                    <div className="md:col-span-6">
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Proceso <span className="text-red-500">*</span>
                      </label>
                      <input
                        value={form.nombre}
                        onChange={(e) => setField('nombre', e.target.value)}
                        className="w-full px-4 py-2.5 bg-white text-sm border border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-sm font-medium"
                        placeholder="Nombre completo del proceso"
                      />
                    </div>

                    {/* Tipo */}
                    <div className="md:col-span-3">
                      <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                        Tipo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={form.tipo}
                          onChange={(e) => setField('tipo', e.target.value)}
                          className="w-full px-4 py-2.5 bg-white text-sm border border-slate-200 rounded-lg focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all shadow-sm font-medium appearance-none cursor-pointer"
                        >
                          <option value="" disabled hidden>Seleccione...</option>
                          {tiposList.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </section>

                {/* ─── Divider ─── */}
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center px-6">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Configuración Avanzada
                    </span>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  {/* ─── Unidades Auditables ─── */}
                  <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="p-1.5 bg-blue-50 rounded-md">
                        <Layers className="w-5 h-5 text-blue-700" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Unidades Auditables</h4>
                        <p className="text-[11px] text-slate-500">Agregue las sub-unidades adscritas al proceso</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mb-4">
                      <input
                        value={unidadInput}
                        onChange={(e) => setUnidadInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = unidadInput.trim();
                            if (val && !unidades.some(u => u.nombre === val)) {
                              setUnidades(prev => [...prev, { id: createClientId(), nombre: val, descripcion: '' }]);
                              setUnidadInput('');
                            }
                          }
                        }}
                        className="flex-1 min-w-0 text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400"
                        placeholder="Nombre de la unidad auditable..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = unidadInput.trim();
                          if (val && !unidades.some(u => u.nombre === val)) {
                            setUnidades(prev => [...prev, { id: createClientId(), nombre: val, descripcion: '' }]);
                            setUnidadInput('');
                          }
                        }}
                        className="px-3 py-2.5 bg-blue-50 text-blue-700 border border-transparent rounded-lg text-[13px] font-bold hover:bg-blue-100 hover:border-blue-200 transition-colors shrink-0 flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Agregar
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {unidades.filter(u => u.nombre.trim()).length === 0 ? (
                        <p className="text-[12px] text-slate-400 italic">Cero unidades registradas.</p>
                      ) : (
                        unidades.filter(u => u.nombre.trim()).map((u, i) => (
                          <span key={u.id} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[12px] font-medium px-3 py-1 rounded-full shadow-sm hover:border-blue-300 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            {u.nombre}
                            <button
                              type="button"
                              onClick={() => setUnidades(prev => prev.filter((_, idx) => idx !== i))}
                              className="text-slate-400 hover:text-red-500 focus:outline-none ml-0.5 transition-colors"
                              title="Eliminar unidad"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ─── Dependencias & Proceso Especial ─── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Dependencias */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="p-1.5 bg-violet-50 rounded-md">
                          <Building2 className="w-5 h-5 text-violet-700" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Dependencias</h4>
                          <p className="text-[11px] text-slate-500">Áreas responsables</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mb-4">
                        <input
                          value={depInput}
                          onChange={(e) => setDepInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = depInput.trim();
                              if (val && !dependencias.includes(val)) {
                                setDependencias(prev => [...prev, val]);
                                setDepInput('');
                              }
                            }
                          }}
                          className="flex-1 min-w-0 text-[13px] border border-slate-200 bg-slate-50 rounded-lg px-3 py-2.5 focus:bg-white focus:border-violet-600 focus:ring-1 focus:ring-violet-600 outline-none transition-all placeholder:text-slate-400"
                          placeholder="Nombre área involucrada..."
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = depInput.trim();
                            if (val && !dependencias.includes(val)) {
                              setDependencias(prev => [...prev, val]);
                              setDepInput('');
                            }
                          }}
                          className="px-3 py-2.5 bg-violet-50 text-violet-700 border border-transparent rounded-lg text-[13px] font-bold hover:bg-violet-100 hover:border-violet-200 transition-colors shrink-0 flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Añadir
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {dependencias.length === 0 ? (
                          <p className="text-[12px] text-slate-400 italic">Sin dependencias asignadas.</p>
                        ) : (
                          dependencias.map((dep, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-[12px] font-medium px-3 py-1 rounded-full shadow-sm hover:border-violet-300 transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                              {dep}
                              <button
                                type="button"
                                onClick={() => setDependencias(prev => prev.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-red-500 focus:outline-none ml-0.5 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Proceso Especial */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="p-1.5 bg-amber-50 rounded-md">
                            <Star className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">Proceso Especial</h4>
                            <p className="text-[11px] text-slate-500">Prioridad obligatoria anual</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 p-3 mb-4 text-[12px] text-slate-600 leading-relaxed rounded-lg">
                          Al activarlo, el sistema exigirá su auditoría obligatoria cada año, ignorando la matriz normal de ponderación de riesgos.
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="flex items-center justify-center gap-3 cursor-pointer group bg-white p-3 rounded-lg border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/50">
                          <input
                            type="checkbox"
                            checked={form.esEspecial}
                            onChange={(e) => setForm(prev => ({ ...prev, esEspecial: e.target.checked }))}
                            className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-600 focus:ring-2 cursor-pointer transition-colors"
                          />
                          <span className="text-[13px] font-bold text-slate-800 select-none">
                            {form.esEspecial ? 'MARCADO COMO ESPECIAL' : 'Marcar como proceso especial'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-white border-t border-slate-100">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={guardando}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[13px] font-bold disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
                >
                  {guardando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editando ? 'Guardar Cambios' : 'Confirmar Registro'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TOAST PREMIUM — WORLD CLASS                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ x: 80, opacity: 0, scale: 0.95 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border border-white/20"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)' }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.1, type: 'spring', damping: 12 }}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0"
            >
              <CheckCircle className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{successMsg}</p>
              <p className="text-[11px] text-white/70 font-medium">Cambios guardados ✓</p>
            </div>
            <motion.div
              className="absolute bottom-0 left-0 h-[3px] rounded-b-xl bg-white/30"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 1.8, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
