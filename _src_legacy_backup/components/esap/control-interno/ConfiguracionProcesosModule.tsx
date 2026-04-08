/**
 * Configuración → Procesos
 * Catálogo parametrizado de procesos para Universo de Auditoría.
 * Crear, editar e inactivar procesos (sin eliminar historial).
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Plus, Edit2, X, Loader2, Search, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useUniversoAuditableData } from './hooks/useUniversoAuditableData';
import { controlInternoService } from '@/services/api/controlInternoService';

const TIPOS_PROCESO = [
  { value: 'estrategico', label: 'Estratégico' },
  { value: 'misional', label: 'Misional' },
  { value: 'apoyo', label: 'Apoyo' },
  { value: 'evaluacion', label: 'Evaluación' },
];

export function ConfiguracionProcesosModule() {
  const { procesos, loading, refetch, agregarProceso, editarProceso } = useUniversoAuditableData({
    incluirInactivos: true,
    showToasts: true,
  });

  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<any | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ nombre: '', codigo: '', tipo: 'apoyo', macroproceso: 'General', dependencia: 'Sin asignar' });

  const procesosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return procesos;
    const q = busqueda.toLowerCase();
    return procesos.filter(p =>
      p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    );
  }, [procesos, busqueda]);

  const handleOpenCreate = () => {
    setEditando(null);
    setForm({ nombre: '', codigo: '', tipo: 'apoyo', macroproceso: 'General', dependencia: 'Sin asignar' });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditando(p);
    setForm({
      nombre: p.nombre,
      codigo: p.codigo,
      tipo: p.tipo?.toLowerCase() || 'apoyo',
      macroproceso: p.macroproceso || 'General',
      dependencia: p.dependenciaResponsable || 'Sin asignar',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.codigo.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }
    setGuardando(true);
    try {
      if (editando) {
        await editarProceso(editando.id, {
          ...editando,
          nombre: form.nombre,
          codigo: form.codigo,
          tipo: TIPOS_PROCESO.find(t => t.value === form.tipo)?.label || editando.tipo,
          macroproceso: form.macroproceso,
          dependenciaResponsable: form.dependencia,
        });
      } else {
        await agregarProceso({
          nombre: form.nombre,
          codigo: form.codigo,
          macroproceso: form.macroproceso,
          dependenciaResponsable: form.dependencia,
          tipoProceso: TIPOS_PROCESO.find(t => t.value === form.tipo)?.label || 'Apoyo',
          riesgosExtremos: 0,
          riesgosAltos: 0,
          riesgosModerados: 0,
          riesgosBajos: 0,
          totalRiesgos: 0,
          planRotacion: '1 año',
        });
      }
      setModalOpen(false);
      refetch();
    } catch (e) {
      toast.error('Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const handleInactivar = async (p: any) => {
    if (!confirm(`¿Inactivar el proceso "${p.nombre}"? No se eliminará el historial.`)) return;
    try {
      await controlInternoService.inactivarProceso(p.id);
      toast.success('Proceso inactivado');
      refetch();
    } catch (e) {
      toast.error('Error al inactivar');
    }
  };

  const handleActivar = async (p: any) => {
    try {
      await controlInternoService.activarProceso(p.id);
      toast.success('Proceso reactivado');
      refetch();
    } catch (e) {
      toast.error('Error al activar');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-xl">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Catálogo de Procesos</h2>
              <p className="text-sm text-gray-600">Procesos parametrizados para Universo de Auditoría</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refetch} className="p-2 border rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Crear proceso
            </button>
          </div>
        </div>

        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
        {procesosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No hay procesos</p>
            <p className="text-sm mt-1">Cree procesos para usarlos en Universo de Auditoría</p>
            <button onClick={handleOpenCreate} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
              Crear primer proceso
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Código</th>
                  <th className="text-left p-3 text-sm font-semibold">Nombre</th>
                  <th className="text-left p-3 text-sm font-semibold">Tipo</th>
                  <th className="text-left p-3 text-sm font-semibold">Estado</th>
                  <th className="p-3 text-sm font-semibold w-32">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {procesosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3 text-sm font-mono">{p.codigo}</td>
                    <td className="p-3">{p.nombre}</td>
                    <td className="p-3 text-sm">{p.tipo}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${p.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.activo ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => handleOpenEdit(p)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {p.activo ? (
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            >
              <h3 className="text-lg font-bold mb-4">{editando ? 'Editar proceso' : 'Crear proceso'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Código *</label>
                  <input value={form.codigo} onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="PROC-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" placeholder="Nombre del proceso" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full px-3 py-2 border rounded-lg">
                    {TIPOS_PROCESO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Macroproceso</label>
                  <input value={form.macroproceso} onChange={(e) => setForm(f => ({ ...f, macroproceso: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dependencia</label>
                  <input value={form.dependencia} onChange={(e) => setForm(f => ({ ...f, dependencia: e.target.value }))} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                <button onClick={handleSave} disabled={guardando} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2">
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
