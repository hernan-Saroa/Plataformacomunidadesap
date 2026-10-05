import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Briefcase,
  Check,
  CheckCircle2,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import dependenciasService, {
  Cargo,
  CargoInput,
  Dependencia,
  DependenciaInput,
} from '../../../services/api/dependencias.service';
import { slugifyDependencia } from '../../../utils/dependencias.utils';

/**
 * Panel administrativo de dependencias ESAP y asignación de cargos.
 *
 * Catálogo transversal (`auth.dependencias` y `auth.dependencias_cargos`)
 * consumido por el módulo de viáticos (cupos presupuestales), estructura
 * organizacional, control interno, etc.
 *
 * Soporta relación N:M:
 *  - 1 dependencia puede tener múltiples cargos asignados.
 *  - 1 cargo puede pertenecer a múltiples dependencias.
 *  - Creación y asignación de nuevos cargos en caliente.
 */
export default function DependenciasAdminPanel() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargosCatalogo, setCargosCatalogo] = useState<Cargo[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<string>('todos');

  // Modal crear/editar dependencia
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Dependencia | null>(null);
  const [busquedaCargoEnModal, setBusquedaCargoEnModal] = useState('');
  const [form, setForm] = useState<{
    codDependencia: string;
    nomDependencia: string;
    descripcion: string;
    dirDependencia: string;
    dirEmail: string;
    urlDependencia: string;
    activo: boolean;
    cargosIds: number[];
  }>({
    codDependencia: '',
    nomDependencia: '',
    descripcion: '',
    dirDependencia: '',
    dirEmail: '',
    urlDependencia: '',
    activo: true,
    cargosIds: [],
  });

  // Subformulario crear cargo rápido
  const [mostrarCrearCargo, setMostrarCrearCargo] = useState(false);
  const [guardandoCargo, setGuardandoCargo] = useState(false);
  const [nuevoCargoForm, setNuevoCargoForm] = useState<CargoInput>({
    codCargo: '',
    nomCargo: '',
    descripcion: '',
    nivelJerarquico: 'Profesional',
    activo: true,
  });

  // Modal rápido de asignación de cargos por dependencia
  const [depAsignarCargos, setDepAsignarCargos] = useState<Dependencia | null>(null);
  const [cargosRapidosSeleccionados, setCargosRapidosSeleccionados] = useState<number[]>([]);
  const [guardandoAsignacionRapida, setGuardandoAsignacionRapida] = useState(false);
  const [busquedaCargoRapido, setBusquedaCargoRapido] = useState('');

  // Modal general del catálogo de cargos
  const [modalCatalogoCargos, setModalCatalogoCargos] = useState(false);
  const [busquedaCatalogoCargos, setBusquedaCatalogoCargos] = useState('');

  const cargarDependencias = async () => {
    setCargando(true);
    setError(null);
    try {
      const [listaDeps, listaCargos] = await Promise.all([
        dependenciasService.listar({ includeInactive: true }),
        dependenciasService.listarCargos({ includeInactive: false }),
      ]);
      setDependencias(listaDeps);
      setCargosCatalogo(listaCargos);
    } catch (e) {
      console.error('Error cargando dependencias o cargos:', e);
      setError('No se pudieron cargar los datos de dependencias y cargos desde el auth-service.');
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
      cargosIds: [],
    });
    setMostrarCrearCargo(false);
    setBusquedaCargoEnModal('');
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
      cargosIds: (dep.cargos || []).map((c) => Number(c.idCargo)),
    });
    setMostrarCrearCargo(false);
    setBusquedaCargoEnModal('');
    setModalAbierto(true);
    setError(null);
    setMensajeExito(null);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setMostrarCrearCargo(false);
  };

  const abrirAsignacionRapida = (dep: Dependencia) => {
    setDepAsignarCargos(dep);
    setCargosRapidosSeleccionados((dep.cargos || []).map((c) => Number(c.idCargo)));
    setBusquedaCargoRapido('');
    setError(null);
    setMensajeExito(null);
  };

  const cerrarAsignacionRapida = () => {
    setDepAsignarCargos(null);
  };

  const toggleCargoEnForm = (idCargo: number) => {
    setForm((prev) => {
      const existe = prev.cargosIds.includes(idCargo);
      const nuevos = existe
        ? prev.cargosIds.filter((id) => id !== idCargo)
        : [...prev.cargosIds, idCargo];
      return { ...prev, cargosIds: nuevos };
    });
  };

  const toggleCargoRapido = (idCargo: number) => {
    setCargosRapidosSeleccionados((prev) =>
      prev.includes(idCargo) ? prev.filter((id) => id !== idCargo) : [...prev, idCargo],
    );
  };

  const crearCargoNuevo = async () => {
    if (!nuevoCargoForm.codCargo.trim() || !nuevoCargoForm.nomCargo.trim()) {
      alert('Código y nombre del cargo son obligatorios.');
      return;
    }
    setGuardandoCargo(true);
    try {
      const creado = await dependenciasService.crearCargo({
        codCargo: nuevoCargoForm.codCargo.trim().toUpperCase(),
        nomCargo: nuevoCargoForm.nomCargo.trim(),
        descripcion: nuevoCargoForm.descripcion?.trim() || null,
        nivelJerarquico: nuevoCargoForm.nivelJerarquico || 'Profesional',
        activo: true,
      });

      setCargosCatalogo((prev) => [...prev, creado]);

      // Si está en el modal de dependencia, asociarlo de inmediato
      if (modalAbierto) {
        setForm((prev) => ({
          ...prev,
          cargosIds: [...prev.cargosIds, Number(creado.idCargo)],
        }));
      }

      // Si está en el modal de asignación rápida, seleccionarlo
      if (depAsignarCargos) {
        setCargosRapidosSeleccionados((prev) => [...prev, Number(creado.idCargo)]);
      }

      setNuevoCargoForm({
        codCargo: '',
        nomCargo: '',
        descripcion: '',
        nivelJerarquico: 'Profesional',
        activo: true,
      });
      setMostrarCrearCargo(false);
      setMensajeExito(`Cargo "${creado.nomCargo}" creado exitosamente.`);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.message || e?.message || 'Error al crear el cargo.');
    } finally {
      setGuardandoCargo(false);
    }
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
        cargosIds: form.cargosIds,
      };
      if (editando) {
        await dependenciasService.actualizar(editando.idDependencia, payload);
        setMensajeExito(`Dependencia ${payload.codDependencia} actualizada correctamente con sus cargos.`);
      } else {
        await dependenciasService.crear(payload);
        setMensajeExito(`Dependencia ${payload.codDependencia} creada correctamente con sus cargos.`);
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

  const guardarAsignacionRapidaSubmit = async () => {
    if (!depAsignarCargos) return;
    setGuardandoAsignacionRapida(true);
    try {
      await dependenciasService.asignarCargos(
        depAsignarCargos.idDependencia,
        cargosRapidosSeleccionados,
      );
      setMensajeExito(`Cargos actualizados para ${depAsignarCargos.nomDependencia}.`);
      cerrarAsignacionRapida();
      void cargarDependencias();
    } catch (e: any) {
      console.error(e);
      setError('Error al sincronizar los cargos de la dependencia.');
    } finally {
      setGuardandoAsignacionRapida(false);
    }
  };

  const eliminar = async (dep: Dependencia) => {
    const ok = window.confirm(
      `¿Desactivar la dependencia "${dep.nomDependencia}" (${dep.codDependencia})? Las solicitudes históricas y relaciones de cargos se conservan.`,
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
    const q = busqueda.toUpperCase().trim();
    if (!q) return true;
    const matchCod = d.codDependencia.toUpperCase().includes(q);
    const matchNom = d.nomDependencia.toUpperCase().includes(q);
    const matchCargo = (d.cargos || []).some(
      (c) =>
        c.nomCargo.toUpperCase().includes(q) || c.codCargo.toUpperCase().includes(q),
    );
    return matchCod || matchNom || matchCargo;
  });

  const getNivelBadgeClass = (nivel?: string) => {
    switch (nivel) {
      case 'Directivo':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Asesor':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Técnico':
        return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'Asistencial':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-blue-100 text-[#003DA5] border-blue-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header y acciones principales */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#003DA5]" />
            Dependencias y Cargos ESAP
          </h3>
          <p className="text-xs text-slate-500">
            Catálogo organizacional transversal y asignación relacional de cargos por dependencia (N:M).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalCatalogoCargos(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#003DA5]" />
            Catálogo de Cargos ({cargosCatalogo.length})
          </button>
          <button
            type="button"
            onClick={abrirNueva}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-[#003DA5] text-white hover:bg-[#002B7A] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nueva dependencia
          </button>
        </div>
      </div>

      {/* Alertas */}
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

      {/* Filtros de búsqueda */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código, nombre o cargo asignado..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabla de dependencias */}
      {cargando ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-[#003DA5]" /> Cargando dependencias y cargos...
        </div>
      ) : dependenciasFiltradas.length === 0 ? (
        <div className="text-center text-xs text-slate-500 py-8 border border-dashed border-slate-200 rounded-lg">
          No hay dependencias que coincidan con el filtro.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Código</th>
                  <th className="px-3 py-2.5 font-semibold">Nombre de la Dependencia</th>
                  <th className="px-3 py-2.5 font-semibold">Cargos Asociados (N:M)</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dependenciasFiltradas.map((d) => {
                  const cargos = d.cargos || [];
                  return (
                    <tr key={d.idDependencia} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-800 whitespace-nowrap">
                        {d.codDependencia}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-900">{d.nomDependencia}</div>
                        {d.descripcion && (
                          <div className="text-[11px] text-slate-400 truncate max-w-sm">
                            {d.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {cargos.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => abrirAsignacionRapida(d)}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200"
                          >
                            <Plus className="w-3 h-3" /> Asignar cargos
                          </button>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1 max-w-md">
                            {cargos.slice(0, 3).map((c) => (
                              <span
                                key={c.idCargo}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${getNivelBadgeClass(
                                  c.nivelJerarquico,
                                )}`}
                                title={`${c.nomCargo} (${c.nivelJerarquico || 'Profesional'})`}
                              >
                                {c.nomCargo}
                              </span>
                            ))}
                            {cargos.length > 3 && (
                              <button
                                type="button"
                                onClick={() => abrirAsignacionRapida(d)}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
                                title={cargos
                                  .slice(3)
                                  .map((c) => c.nomCargo)
                                  .join(', ')}
                              >
                                +{cargos.length - 3} más
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
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
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => abrirAsignacionRapida(d)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#003DA5] hover:bg-blue-50"
                            title="Gestionar cargos asignados"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEditar(d)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-[#003DA5] hover:bg-blue-50"
                            title="Editar dependencia"
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR / EDITAR DEPENDENCIA (INCLUYE ASIGNACIÓN DE CARGOS Y CREACIÓN) */}
      {/* ========================================================================= */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-20">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#003DA5]" />
                <h4 className="text-sm font-bold text-slate-800">
                  {editando ? 'Editar Dependencia' : 'Nueva Dependencia'}
                </h4>
              </div>
              <button
                type="button"
                onClick={cerrarModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nombre de la Dependencia <span className="text-red-500">*</span>
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
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  placeholder="Misión o función institucional de la dependencia..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* SECCIÓN DE ASIGNACIÓN Y CREACIÓN DE CARGOS */}
              <div className="border border-blue-100 bg-blue-50/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-[#003DA5]" />
                    <span className="font-bold text-slate-800 text-xs">
                      Cargos asignados a esta dependencia ({form.cargosIds.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMostrarCrearCargo(!mostrarCrearCargo)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#003DA5] bg-white border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    {mostrarCrearCargo ? 'Ocultar formulario' : 'Crear nuevo cargo'}
                  </button>
                </div>

                {/* Subformulario inline para crear cargo nuevo */}
                {mostrarCrearCargo && (
                  <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2.5 shadow-sm animate-in fade-in duration-150">
                    <div className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-[#003DA5]" />
                      Crear y asociar nuevo cargo institucional
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Código <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={nuevoCargoForm.codCargo}
                          onChange={(e) =>
                            setNuevoCargoForm({
                              ...nuevoCargoForm,
                              codCargo: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="EJ: PROF-JUR"
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Nombre del Cargo <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={nuevoCargoForm.nomCargo}
                          onChange={(e) =>
                            setNuevoCargoForm({
                              ...nuevoCargoForm,
                              nomCargo: e.target.value,
                            })
                          }
                          placeholder="Profesional Especializado en..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Nivel Jerárquico
                        </label>
                        <select
                          value={nuevoCargoForm.nivelJerarquico}
                          onChange={(e) =>
                            setNuevoCargoForm({
                              ...nuevoCargoForm,
                              nivelJerarquico: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="Directivo">Directivo</option>
                          <option value="Asesor">Asesor</option>
                          <option value="Profesional">Profesional</option>
                          <option value="Técnico">Técnico</option>
                          <option value="Asistencial">Asistencial</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                          Descripción (opcional)
                        </label>
                        <input
                          type="text"
                          value={nuevoCargoForm.descripcion || ''}
                          onChange={(e) =>
                            setNuevoCargoForm({
                              ...nuevoCargoForm,
                              descripcion: e.target.value,
                            })
                          }
                          placeholder="Funciones o ámbito del cargo..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setMostrarCrearCargo(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={crearCargoNuevo}
                        disabled={guardandoCargo}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#003DA5] text-white rounded hover:bg-[#002B7A] disabled:opacity-50"
                      >
                        {guardandoCargo ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        Guardar y Vincular
                      </button>
                    </div>
                  </div>
                )}

                {/* Buscador de cargos para asignación */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={busquedaCargoEnModal}
                    onChange={(e) => setBusquedaCargoEnModal(e.target.value)}
                    placeholder="Filtrar catálogo de cargos para asignar/desasignar..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Lista de cargos disponibles con checkboxes */}
                <div className="max-h-48 overflow-y-auto space-y-1 bg-white border border-slate-200 rounded-lg p-2">
                  {cargosCatalogo
                    .filter((c) => {
                      const q = busquedaCargoEnModal.toUpperCase().trim();
                      if (!q) return true;
                      return (
                        c.nomCargo.toUpperCase().includes(q) ||
                        c.codCargo.toUpperCase().includes(q) ||
                        (c.nivelJerarquico || '').toUpperCase().includes(q)
                      );
                    })
                    .map((cargo) => {
                      const idNum = Number(cargo.idCargo);
                      const checked = form.cargosIds.includes(idNum);
                      return (
                        <label
                          key={cargo.idCargo}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                            checked ? 'bg-blue-50/80 border border-blue-200' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCargoEnForm(idNum)}
                              className="rounded text-[#003DA5] focus:ring-blue-500"
                            />
                            <div>
                              <span className="font-medium text-slate-800">{cargo.nomCargo}</span>
                              <span className="ml-1.5 font-mono text-[10px] text-slate-400">
                                ({cargo.codCargo})
                              </span>
                            </div>
                          </div>
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${getNivelBadgeClass(
                              cargo.nivelJerarquico,
                            )}`}
                          >
                            {cargo.nivelJerarquico || 'Profesional'}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Datos de contacto adicionales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dirección física</label>
                  <input
                    type="text"
                    value={form.dirDependencia}
                    onChange={(e) => setForm({ ...form, dirDependencia: e.target.value })}
                    placeholder="Sede Central - Piso 2"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email institucional</label>
                  <input
                    type="email"
                    value={form.dirEmail}
                    onChange={(e) => setForm({ ...form, dirEmail: e.target.value })}
                    placeholder="dependencia@esap.edu.co"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="rounded text-[#003DA5]"
                />
                <span className="text-slate-700 font-medium">Dependencia activa en la plataforma</span>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
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
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#003DA5] text-white hover:bg-[#002B7A] disabled:opacity-50 shadow-sm"
              >
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editando ? 'Guardar Cambios' : 'Crear Dependencia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASIGNACIÓN RÁPIDA DE CARGOS A UNA DEPENDENCIA */}
      {/* ========================================================================= */}
      {depAsignarCargos && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-20">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[75vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#003DA5]" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Asignar Cargos a {depAsignarCargos.codDependencia}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate max-w-sm">
                    {depAsignarCargos.nomDependencia}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cerrarAsignacionRapida}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto flex-1 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={busquedaCargoRapido}
                  onChange={(e) => setBusquedaCargoRapido(e.target.value)}
                  placeholder="Buscar cargo por nombre o código..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{cargosRapidosSeleccionados.length} cargos seleccionados</span>
                <button
                  type="button"
                  onClick={() => setCargosRapidosSeleccionados(cargosCatalogo.map((c) => Number(c.idCargo)))}
                  className="text-[#003DA5] font-semibold hover:underline"
                >
                  Seleccionar todos
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2 bg-slate-50/30">
                {cargosCatalogo
                  .filter((c) => {
                    const q = busquedaCargoRapido.toUpperCase().trim();
                    if (!q) return true;
                    return (
                      c.nomCargo.toUpperCase().includes(q) ||
                      c.codCargo.toUpperCase().includes(q) ||
                      (c.nivelJerarquico || '').toUpperCase().includes(q)
                    );
                  })
                  .map((cargo) => {
                    const idNum = Number(cargo.idCargo);
                    const selected = cargosRapidosSeleccionados.includes(idNum);
                    return (
                      <div
                        key={cargo.idCargo}
                        onClick={() => toggleCargoRapido(idNum)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          selected
                            ? 'bg-blue-50 border border-blue-200 text-[#003DA5]'
                            : 'bg-white hover:bg-slate-100/80 border border-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selected ? 'bg-[#003DA5] border-[#003DA5] text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {selected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="font-semibold text-xs">{cargo.nomCargo}</div>
                            <div className="font-mono text-[10px] text-slate-400">{cargo.codCargo}</div>
                          </div>
                        </div>
                        <span
                          className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${getNivelBadgeClass(
                            cargo.nivelJerarquico,
                          )}`}
                        >
                          {cargo.nivelJerarquico || 'Profesional'}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={cerrarAsignacionRapida}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarAsignacionRapidaSubmit}
                disabled={guardandoAsignacionRapida}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#003DA5] text-white hover:bg-[#002B7A] disabled:opacity-50 shadow-sm"
              >
                {guardandoAsignacionRapida ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Guardar Asignación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CATÁLOGO COMPLETO DE CARGOS INSTITUCIONALES */}
      {/* ========================================================================= */}
      {modalCatalogoCargos && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-sm p-4 pt-20">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[75vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#003DA5]" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Catálogo Institucional de Cargos</h4>
                  <p className="text-[11px] text-slate-500">
                    Roles transversales parametrizados en auth.cargos para la ESAP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalCatalogoCargos(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={busquedaCatalogoCargos}
                    onChange={(e) => setBusquedaCatalogoCargos(e.target.value)}
                    placeholder="Buscar cargo en el catálogo..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMostrarCrearCargo(!mostrarCrearCargo)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-[#003DA5] text-white hover:bg-[#002B7A] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo Cargo
                </button>
              </div>

              {mostrarCrearCargo && (
                <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#003DA5]" /> Crear nuevo cargo institucional
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Código Único <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nuevoCargoForm.codCargo}
                        onChange={(e) =>
                          setNuevoCargoForm({
                            ...nuevoCargoForm,
                            codCargo: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="EJ: PROF-CONT"
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nombre del Cargo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={nuevoCargoForm.nomCargo}
                        onChange={(e) =>
                          setNuevoCargoForm({
                            ...nuevoCargoForm,
                            nomCargo: e.target.value,
                          })
                        }
                        placeholder="Profesional Especializado..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Nivel Jerárquico
                      </label>
                      <select
                        value={nuevoCargoForm.nivelJerarquico}
                        onChange={(e) =>
                          setNuevoCargoForm({
                            ...nuevoCargoForm,
                            nivelJerarquico: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Directivo">Directivo</option>
                        <option value="Asesor">Asesor</option>
                        <option value="Profesional">Profesional</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Asistencial">Asistencial</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Descripción funcional
                      </label>
                      <input
                        type="text"
                        value={nuevoCargoForm.descripcion || ''}
                        onChange={(e) =>
                          setNuevoCargoForm({
                            ...nuevoCargoForm,
                            descripcion: e.target.value,
                          })
                        }
                        placeholder="Funciones o alcance del rol..."
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setMostrarCrearCargo(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={crearCargoNuevo}
                      disabled={guardandoCargo}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#003DA5] text-white rounded-lg hover:bg-[#002B7A] disabled:opacity-50"
                    >
                      {guardandoCargo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Guardar en Catálogo
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Código</th>
                      <th className="px-3 py-2 font-semibold">Nombre del Cargo</th>
                      <th className="px-3 py-2 font-semibold">Nivel</th>
                      <th className="px-3 py-2 font-semibold">Descripción</th>
                      <th className="px-3 py-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cargosCatalogo
                      .filter((c) => {
                        const q = busquedaCatalogoCargos.toUpperCase().trim();
                        if (!q) return true;
                        return (
                          c.nomCargo.toUpperCase().includes(q) ||
                          c.codCargo.toUpperCase().includes(q) ||
                          (c.nivelJerarquico || '').toUpperCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <tr key={c.idCargo} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                            {c.codCargo}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-900">{c.nomCargo}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${getNivelBadgeClass(
                                c.nivelJerarquico,
                              )}`}
                            >
                              {c.nivelJerarquico || 'Profesional'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-500 max-w-xs truncate">
                            {c.descripcion || '—'}
                          </td>
                          <td className="px-3 py-2">
                            {c.activo ? (
                              <span className="text-green-700 font-semibold text-[10px]">Activo</span>
                            ) : (
                              <span className="text-slate-400 font-semibold text-[10px]">Inactivo</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setModalCatalogoCargos(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
