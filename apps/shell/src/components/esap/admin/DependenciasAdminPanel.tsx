import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Layers,
  Trash2,
  X,
} from 'lucide-react';
import dependenciasService, {
  Dependencia,
  DependenciaInput,
} from '../../../services/api/dependencias.service';
import { slugifyDependencia } from '../../../utils/dependencias.utils';

/**
 * Panel administrativo de dependencias ESAP.
 *
 * Catálogo transversal (`auth.dependencias`) consumido por el módulo
 * de viáticos (cupo presupuestal de tiquetes), estructura organizacional
 * y otros microservicios. La parametrización se realiza desde
 * `ParametrizacionManager` → pestaña "Dependencias".
 *
 * Funcionalidades:
 *  - Listar dependencias (activas e inactivas).
 *  - Crear, editar y desactivar dependencias.
 *  - Búsqueda en vivo por código o nombre.
 *
 * Los campos obligatorios son `codDependencia` (único) y
 * `nomDependencia`. El resto son opcionales.
 */
export default function DependenciasAdminPanel() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Dependencia | null>(null);
  const [form, setForm] = useState<{
    codDependencia: string;
    nomDependencia: string;
    descripcion: string;
    dirDependencia: string;
    dirEmail: string;
    urlDependencia: string;
    activo: boolean;
  }>({
    codDependencia: '',
    nomDependencia: '',
    descripcion: '',
    dirDependencia: '',
    dirEmail: '',
    urlDependencia: '',
    activo: true,
  });

  const cargarDependencias = async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await dependenciasService.listar({
        includeInactive: true,
      });
      setDependencias(lista);
    } catch (e) {
      console.error('Error cargando dependencias:', e);
      setError('No se pudieron cargar las dependencias. Verifique la conexión con el auth-service.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarDependencias();
  }, []);

  const abrirNueva = () => {
    setEditando(null);
    setForm({
      codDependencia: '',
      nomDependencia: '',
      descripcion: '',
      dirDependencia: '',
      dirEmail: '',
      urlDependencia: '',
      activo: true,
    });
    setModalAbierto(true);
    setError(null);
    setMensajeExito(null);
  };

  const abrirEditar = (dep: Dependencia) => {
    setEditando(dep);
    setForm({
      codDependencia: dep.codDependencia,
      nomDependencia: dep.nomDependencia,
      descripcion: dep.descripcion ?? '',
      dirDependencia: dep.dirDependencia ?? '',
      dirEmail: dep.dirEmail ?? '',
      urlDependencia: dep.urlDependencia ?? '',
      activo: dep.activo,
    });
    setModalAbierto(true);
    setError(null);
    setMensajeExito(null);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async () => {
    setError(null);
    if (!form.codDependencia.trim() || !form.nomDependencia.trim()) {
      setError('Código y nombre son obligatorios.');
      return;
    }
    setGuardando(true);
    try {
      const payload: DependenciaInput = {
        codDependencia: form.codDependencia.trim().toUpperCase(),
        nomDependencia: form.nomDependencia.trim(),
        descripcion: form.descripcion.trim() || null,
        dirDependencia: form.dirDependencia.trim() || null,
        dirEmail: form.dirEmail.trim() || null,
        urlDependencia: form.urlDependencia.trim() || null,
        activo: form.activo,
      };
      if (editando) {
        await dependenciasService.actualizar(editando.idDependencia, payload);
        setMensajeExito(`Dependencia ${payload.codDependencia} actualizada correctamente.`);
      } else {
        await dependenciasService.crear(payload);
        setMensajeExito(`Dependencia ${payload.codDependencia} creada correctamente.`);
      }
      cerrarModal();
      void cargarDependencias();
    } catch (e: unknown) {
      const mensaje =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo guardar la dependencia. Verifique que el código no esté duplicado.';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (dep: Dependencia) => {
    const ok = window.confirm(
      `¿Desactivar la dependencia "${dep.nomDependencia}" (${dep.codDependencia})? Las solicitudes históricas se conservan.`,
    );
    if (!ok) return;
    setError(null);
    try {
      await dependenciasService.eliminar(dep.idDependencia);
      setMensajeExito(`Dependencia ${dep.codDependencia} desactivada.`);
      void cargarDependencias();
    } catch (e: unknown) {
      const mensaje =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo desactivar la dependencia.';
      setError(mensaje);
    }
  };

  const dependenciasFiltradas = dependencias.filter((d) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toUpperCase();
    return (
      d.codDependencia.toUpperCase().includes(q) ||
      d.nomDependencia.toUpperCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#003DA5]" />
            Dependencias ESAP
          </h3>
          
        </div>
        <button
          type="button"
          onClick={abrirNueva}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#003DA5] text-white hover:bg-[#002B7A] transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva dependencia
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {mensajeExito && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por código o nombre..."
          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {cargando ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando dependencias...
        </div>
      ) : dependenciasFiltradas.length === 0 ? (
        <div className="text-center text-xs text-slate-500 py-8 border border-dashed border-slate-200 rounded-lg">
          No hay dependencias que coincidan con el filtro.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-semibold">Código</th>
                <th className="px-3 py-2 font-semibold">Nombre</th>
                <th className="px-3 py-2 font-semibold">Descripción</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {dependenciasFiltradas.map((d) => (
                <tr key={d.idDependencia} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-2 font-mono font-semibold text-slate-700">{d.codDependencia}</td>
                  <td className="px-3 py-2 text-slate-800">{d.nomDependencia}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{d.descripcion ?? '—'}</td>
                  <td className="px-3 py-2">
                    {d.activo ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-600">
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirEditar(d)}
                        className="p-1.5 rounded-md text-slate-500 hover:text-[#003DA5] hover:bg-blue-50"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {d.activo && (
                        <button
                          type="button"
                          onClick={() => eliminar(d)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Desactivar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-800">
                {editando ? 'Editar dependencia' : 'Nueva dependencia'}
              </h4>
              <button
                type="button"
                onClick={cerrarModal}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nomDependencia}
                  onChange={(e) => {
                    const nuevoNombre = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      nomDependencia: nuevoNombre,
                      codDependencia:
                        !editando && (!prev.codDependencia || prev.codDependencia.startsWith('DEP-'))
                          ? slugifyDependencia(nuevoNombre)
                          : prev.codDependencia,
                    }));
                  }}
                  placeholder="Subdirección de..."
                  autoFocus
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Al escribir el nombre se sugiere automáticamente un código. Puedes ajustarlo.
                </p>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.codDependencia}
                  onChange={(e) =>
                    setForm({ ...form, codDependencia: e.target.value.toUpperCase() })
                  }
                  disabled={!!editando}
                  placeholder="DEP-XXX-NN"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono disabled:bg-slate-100"
                />
                {!editando && (
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        codDependencia: slugifyDependencia(prev.nomDependencia),
                      }))
                    }
                    className="mt-1 text-[10px] font-semibold text-[#003DA5] hover:underline"
                  >
                    Regenerar código desde el nombre
                  </button>
                )}
                {editando && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    El código no se puede modificar para preservar la trazabilidad con saldos históricos.
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Función principal de la dependencia..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dirección física</label>
                  <input
                    type="text"
                    value={form.dirDependencia}
                    onChange={(e) => setForm({ ...form, dirDependencia: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.dirEmail}
                    onChange={(e) => setForm({ ...form, dirEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL / sitio web</label>
                <input
                  type="url"
                  value={form.urlDependencia}
                  onChange={(e) => setForm({ ...form, urlDependencia: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="rounded"
                />
                <span className="text-slate-700">Dependencia activa</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#003DA5] text-white hover:bg-[#002B7A] disabled:opacity-50"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editando ? 'Guardar cambios' : 'Crear dependencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
