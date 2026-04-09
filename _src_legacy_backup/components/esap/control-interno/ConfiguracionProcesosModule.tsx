/**
 * Configuración → Procesos
 * Catálogo parametrizado de procesos para Universo de Auditoría.
 * Crear, editar e inactivar procesos (sin eliminar historial).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Plus, Edit2, X, Loader2, Search, CheckCircle2, XCircle,
  RefreshCw, Settings, Tag, Trash2, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '@/services/api/controlInternoService';
import type { ProcesoAuditable } from '@/services/api/controlInternoService';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS DE PROCESO — Todos en localStorage (editables y eliminables)
// ════════════════════════════════════════════════════════════════════════════

type TipoItem = { value: string; label: string; color: string };

const TIPOS_DEFAULT: TipoItem[] = [
  { value: 'estrategico', label: 'Estratégico', color: 'bg-purple-100 text-purple-700' },
  { value: 'misional',    label: 'Misional',    color: 'bg-blue-100 text-blue-700'     },
  { value: 'transversal', label: 'Transversal', color: 'bg-green-100 text-green-700'   },
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
    return raw ? JSON.parse(raw) : TIPOS_DEFAULT;
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
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProcesoAuditable) => {
    setEditando(p);
    const tipoRaw = (p.tipo || '').toLowerCase();
    const tipo = tiposList.find(t =>
      t.value === tipoRaw || t.label.toLowerCase() === tipoRaw
    )?.value || tipoRaw || 'estrategico';
    // Dividir dependencias guardadas (separadas por "; ")
    const deps = (p.dependencia || '').split(';').map(d => d.trim()).filter(Boolean);
    setDependencias(deps);
    setDepInput('');
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
    if (!form.macroproceso.trim()) {
      toast.error('Ingrese el macroproceso');
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
        macroproceso: form.macroproceso,
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
      fetchProcesos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el proceso');
    } finally {
      setGuardando(false);
    }
  };

  const handleInactivar = async (p: ProcesoAuditable) => {
    if (!confirm(`¿Inactivar "${p.nombre}"? No se eliminará el historial.`)) return;
    try {
      await controlInternoService.inactivarProceso(p.id);
      toast.success('Proceso inactivado');
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">

      {/* ─── Cabecera ─── */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-5 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Catálogo de Procesos</h2>
              <p className="text-sm text-gray-500">Procesos parametrizados para Universo de Auditoría</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setGestionarTipos(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
                gestionarTipos ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'
              }`}
              title="Gestionar tipos de proceso"
            >
              <Settings className="w-4 h-4" /> Tipos
            </button>
            <button onClick={fetchProcesos} className="p-2 border rounded-lg hover:bg-gray-50" title="Actualizar">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Crear proceso
            </button>
          </div>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, código o macroproceso..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
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
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Código</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Nombre</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Tipo</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Macroproceso</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Dependencia responsable</th>
                  <th className="text-left px-3 py-3 font-semibold text-gray-700">Estado</th>
                  <th className="px-3 py-3 font-semibold text-gray-700 w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {procesosFiltrados.map((p) => {
                  const tipoInfo = getTipoInfo(p.tipo || '');
                  return (
                    <tr key={p.id} className="border-b hover:bg-gray-50/60 transition-colors">
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
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{p.macroproceso || '—'}</td>
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
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {(p as any).activo !== false ? (
                            <button onClick={() => handleInactivar(p)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Inactivar">
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleActivar(p)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Activar">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-base font-bold text-gray-900">
                  {editando ? 'Editar proceso' : 'Crear proceso'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4">

                {/* Código */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Código <span className="text-red-500">*</span></label>
                  <input
                    value={form.codigo}
                    onChange={(e) => setField('codigo', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                    placeholder="PROC-001"
                  />
                </div>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input
                    value={form.nombre}
                    onChange={(e) => setField('nombre', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                    placeholder="Nombre del proceso"
                  />
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setField('tipo', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none bg-white"
                  >
                    {tiposList.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Macroproceso — entrada manual */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Macroproceso <span className="text-red-500">*</span></label>
                  <input
                    value={form.macroproceso}
                    onChange={(e) => setField('macroproceso', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                    placeholder="Ej: Gestión Financiera"
                  />
                </div>

                {/* Dependencia responsable — multi-chip */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Dependencia responsable <span className="text-red-500">*</span>
                  </label>

                  {/* Chips de dependencias ya agregadas */}
                  {dependencias.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {dependencias.map((dep, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {dep}
                          <button
                            type="button"
                            onClick={() => setDependencias(prev => prev.filter((_, idx) => idx !== i))}
                            className="hover:text-red-600 transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Input + botón agregar */}
                  <div className="flex gap-2">
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
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                      placeholder="Ej: Dirección Financiera"
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
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-sm"
                      title="Agregar dependencia"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Presione Enter o el botón + para agregar cada dependencia</p>
                </div>

                {/* Proceso especial ★ */}
                <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                  form.esEspecial ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={form.esEspecial}
                    onChange={(e) => setForm(prev => ({ ...prev, esEspecial: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      Proceso especial <span className="text-amber-500">★</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Se audita todos los años del cuatrienio independientemente de la ponderación DAFP
                    </div>
                  </div>
                </label>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 py-4 border-t">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={guardando}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
