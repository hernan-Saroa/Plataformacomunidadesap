/**
 * Configuración → Procesos
 * Catálogo parametrizado de procesos para Universo de Auditoría.
 * Crear, editar e inactivar procesos (sin eliminar historial).
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers, Plus, Edit2, X, Loader2, Search, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { controlInternoService } from '@/services/api/controlInternoService';
import type { ProcesoAuditable } from '@/services/api/controlInternoService';

// ════════════════════════════════════════════════════════════════════════════
// CATÁLOGO ESAP — Macroprocesos y Dependencias por Tipo
// ════════════════════════════════════════════════════════════════════════════

const TIPOS_PROCESO = [
  { value: 'misional',    label: 'Misional'    },
  { value: 'estrategico', label: 'Estratégico' },
  { value: 'apoyo',       label: 'Apoyo'       },
];

const MACROPROCESOS_POR_TIPO: Record<string, string[]> = {
  misional: [
    'Formación para la Vida',
    'Proyección y Extensión',
    'Investigación e Innovación',
    'Bien-Estar',
    'Recursos de Aprendizaje',
    'Relacionamiento con la Ciudadanía',
    'Gestión Global',
    'Territorial',
  ],
  estrategico: [
    'Direccionamiento Estratégico',
    'Efectividad Institucional',
    'Evaluación Control y Mejora',
  ],
  apoyo: [
    'Transformación Digital',
    'Efectividad Institucional',
    'Comunicación y Posicionamiento',
    'Gestión Administrativa',
    'Gestión Financiera',
    'Gestión Legal',
    'Adquisición de Bienes y Servicios',
    'Gestión del Talento Humano',
  ],
};

const DEPENDENCIAS_POR_MACROPROCESO: Record<string, string[]> = {
  'Formación para la Vida':              ['Subdirección Académica Nacional'],
  'Proyección y Extensión':             [
    'Dirección de Capacitación',
    'Dirección de Procesos de Selección',
    'Escuela de Alto Gobierno',
    'Dirección de Fortalecimiento y Apoyo a la Gestión Estatal',
  ],
  'Investigación e Innovación':         ['Subdirección Nacional de Investigaciones'],
  'Bien-Estar':                         ['Dirección de Bienestar Universitario'],
  'Recursos de Aprendizaje':            ['Dirección de Entornos y Servicios Virtuales'],
  'Relacionamiento con la Ciudadanía':  ['Dirección de Atención al Ciudadano'],
  'Gestión Global':                     ['Oficina de Internacionalización'],
  'Territorial':                        [
    'Territorial Antioquia',
    'Territorial Atlántico – Cesar – Magdalena – La Guajira',
    'Territorial Bolívar – Córdoba – Sucre – San Andrés',
    'Territorial Boyacá – Casanare',
    'Territorial Caldas',
    'Territorial Cauca',
    'Territorial Chocó',
    'Territorial Cundinamarca',
    'Territorial Huila – Caquetá – Putumayo',
    'Territorial Meta – Guaviare – Guanía – Vaupés – Vichada – Amazonas',
    'Territorial Nariño – Alto Putumayo',
    'Territorial Norte de Santander – Arauca',
    'Territorial Quindío – Risaralda',
    'Territorial Santander',
    'Territorial Tolima',
    'Territorial Valle',
    'Territorial Vichada',
    'Territorial Archipiélago San Andrés',
    'Territorial Guaviare',
    'Territorial Casanare',
    'Territorial Amazonas',
    'Territorial Putumayo',
  ],
  'Direccionamiento Estratégico':       ['Dirección Nacional'],
  'Efectividad Institucional':          [
    'Oficina de Planeación',
    'Grupo de Administración Documental – GADGI',
  ],
  'Evaluación Control y Mejora':        ['Oficina de Control Interno Disciplinario'],
  'Transformación Digital':             ['OTIC – Oficina de Tecnologías de la Información'],
  'Comunicación y Posicionamiento':     ['Equipo de Comunicaciones'],
  'Gestión Administrativa':             ['Subdirección Nacional de Gestión Corporativa'],
  'Gestión Financiera':                 ['Dirección Financiera'],
  'Gestión Legal':                      ['Oficina Jurídica'],
  'Adquisición de Bienes y Servicios':  ['Dirección de Contratación'],
  'Gestión del Talento Humano':         ['Dirección de Talento Humano'],
};

// ════════════════════════════════════════════════════════════════════════════
// ESTADO INICIAL DEL FORMULARIO
// ════════════════════════════════════════════════════════════════════════════

const FORM_VACIO = { nombre: '', codigo: '', tipo: 'misional', macroproceso: '', dependencia: '' };

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

  // ── Cargar procesos directamente desde el servicio ──
  const fetchProcesos = useCallback(async () => {
    setLoading(true);
    try {
      // soloActivos=false → incluye activos e inactivos
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

  // ── Opciones dinámicas según tipo/macroproceso seleccionado ──
  const macroOpciones = MACROPROCESOS_POR_TIPO[form.tipo] || [];
  const depOpciones   = DEPENDENCIAS_POR_MACROPROCESO[form.macroproceso] || [];

  const setField = (key: string, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'tipo')        { next.macroproceso = ''; next.dependencia = ''; }
      if (key === 'macroproceso') { next.dependencia = ''; }
      return next;
    });
  };

  const handleOpenCreate = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalOpen(true);
  };

  const handleOpenEdit = (p: ProcesoAuditable) => {
    setEditando(p);
    // Detectar tipo en formato interno (lowercase sin tilde)
    const tipoRaw = (p.tipo || '').toLowerCase();
    const tipo = tipoRaw.includes('estrateg') ? 'estrategico'
               : tipoRaw === 'misional'        ? 'misional'
               : 'apoyo';
    setForm({
      nombre:      p.nombre,
      codigo:      p.codigo,
      tipo,
      macroproceso: p.macroproceso || '',
      dependencia:  p.dependencia  || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.codigo.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }
    if (!form.macroproceso) {
      toast.error('Seleccione un macroproceso');
      return;
    }
    if (!form.dependencia) {
      toast.error('Seleccione una dependencia responsable');
      return;
    }

    setGuardando(true);
    try {
      const payload: Partial<ProcesoAuditable> = {
        nombre:      form.nombre,
        codigo:      form.codigo,
        tipo:        form.tipo as any,        // 'misional' | 'estrategico' | 'apoyo'
        macroproceso: form.macroproceso,
        dependencia:  form.dependencia,
        responsable:  form.dependencia,       // responsable = dependencia en ESAP
        descripcion:  form.nombre,
      };

      if (editando) {
        await controlInternoService.updateProceso(editando.id, payload);
        toast.success('Proceso actualizado');
      } else {
        // evaluacionRiesgo es requerido por el DTO del backend
        const payloadCreate = {
          ...payload,
          evaluacionRiesgo: {
            probabilidad:   1,
            impacto:        1,
            nivelControl:   2,
            riesgoInherente: 1,
            riesgoResidual: 0.5,
            nivelRiesgo:    'bajo' as const,
          },
          frecuenciaAuditoria: 'anual',
        };
        await controlInternoService.createProceso(payloadCreate);
        toast.success('Proceso creado');
      }

      setModalOpen(false);
      fetchProcesos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el proceso';
      toast.error(msg);
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
                {procesosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-gray-50/60 transition-colors">
                    <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{p.codigo}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        p.tipo === 'misional'    ? 'bg-blue-100 text-blue-700'    :
                        p.tipo === 'estrategico' ? 'bg-purple-100 text-purple-700':
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {p.tipo === 'misional'    ? 'Misional'    :
                         p.tipo === 'estrategico' ? 'Estratégico' :
                         p.tipo === 'apoyo'        ? 'Apoyo'       : p.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{p.macroproceso || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{p.dependencia || '—'}</td>
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
                ))}
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
              {/* Header modal */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <h3 className="text-base font-bold text-gray-900">
                  {editando ? 'Editar proceso' : 'Crear proceso'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body modal */}
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
                    {TIPOS_PROCESO.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Macroproceso — encadenado al tipo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Macroproceso <span className="text-red-500">*</span></label>
                  <select
                    value={form.macroproceso}
                    onChange={(e) => setField('macroproceso', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="">-- Seleccione --</option>
                    {macroOpciones.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Dependencia responsable — encadenada al macroproceso */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Dependencia responsable <span className="text-red-500">*</span></label>
                  <select
                    value={form.dependencia}
                    onChange={(e) => setField('dependencia', e.target.value)}
                    disabled={!form.macroproceso}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">-- Seleccione macroproceso primero --</option>
                    {depOpciones.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer modal */}
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
