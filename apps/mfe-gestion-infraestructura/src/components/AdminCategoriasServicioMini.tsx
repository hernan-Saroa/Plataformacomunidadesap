import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  Save,
  FolderKanban,
  AlertCircle,
  AlertTriangle,
  Layers,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import {
  infraestructuraService,
  CatalogoItem,
  CategoriaServicioPayload,
} from '../services/infraestructuraService';

type ModalModo = 'crear' | 'editar' | null;

interface FormValues {
  codigo: string;
  nombre: string;
  descripcion: string;
  orden: string;
  isActivo: boolean;
  color: string;
  tipoJerarquia: 'PRINCIPAL' | 'SUBCATEGORIA';
  parentCodigo: string;
}

const CODIGOS_OFICIALES = new Set([
  'CS_001',
  'CS_002',
  'CS_003',
  'CS_004',
  'CS_005',
  'CS_006',
  'CS_007',
  'CS_008',
]);

const esCategoriaOficial = (it: CatalogoItem): boolean => {
  return (
    CODIGOS_OFICIALES.has(it.codigo) ||
    it.metadata?.esOficial === true ||
    it.metadata?.lineaBase745 === true
  );
};

const VALORES_VACIOS: FormValues = {
  codigo: '',
  nombre: '',
  descripcion: '',
  orden: '',
  isActivo: true,
  color: 'bg-slate-100 text-slate-800 border border-slate-200',
  tipoJerarquia: 'SUBCATEGORIA',
  parentCodigo: 'CS_001',
};

const OPCIONES_COLORES: Array<{ label: string; css: string }> = [
  { label: 'Predeterminado', css: 'bg-slate-100 text-slate-800 border border-slate-200' },
  { label: 'Azul', css: 'bg-blue-100 text-blue-800 border border-blue-200' },
  { label: 'Verde', css: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  { label: 'Ámbar', css: 'bg-amber-100 text-amber-800 border border-amber-200' },
  { label: 'Rojo', css: 'bg-pink-100 text-pink-700 border border-pink-300' },
  { label: 'Índigo', css: 'bg-indigo-100 text-indigo-800 border border-indigo-200' },
];

const colorCss = (it: CatalogoItem): string => {
  const c = it.metadata?.color;
  if (typeof c === 'string' && c.includes(' ')) return c;
  return 'bg-slate-100 text-slate-800 border border-slate-200';
};

export const AdminCategoriasServicioMini: React.FC<{ readOnly?: boolean }> = ({
  readOnly = false,
}) => {
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const [modo, setModo] = useState<ModalModo>(null);
  const [idEditando, setIdEditando] = useState<number | null>(null);
  const [form, setForm] = useState<FormValues>(VALORES_VACIOS);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<CatalogoItem | null>(null);
  const [eliminando, setEliminando] = useState<boolean>(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const rows = await infraestructuraService.getCategoriasServicio({ soloActivos: false });
      setItems(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      setToast({ tipo: 'err', texto: 'No se pudo cargar el catálogo.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Lista de categorías principales disponibles como padre
  const categoriasPrincipales = useMemo(() => {
    return items.filter(
      (it) =>
        it.metadata?.tipo === 'CATEGORIA_PRINCIPAL' ||
        (!it.metadata?.parentCodigo && it.metadata?.tipo !== 'SUBCATEGORIA'),
    );
  }, [items]);

  // Ordenar para mostrar subcategorías agrupadas bajo su categoría principal
  const itemsOrdenados = useMemo(() => {
    const padres = items.filter(
      (it) =>
        it.metadata?.tipo !== 'SUBCATEGORIA' &&
        !it.metadata?.parentCodigo,
    );
    padres.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    const subs = items.filter(
      (it) =>
        it.metadata?.tipo === 'SUBCATEGORIA' ||
        !!it.metadata?.parentCodigo,
    );
    subs.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    const resultado: CatalogoItem[] = [];
    for (const p of padres) {
      resultado.push(p);
      const hijas = subs.filter(
        (s) =>
          s.metadata?.parentCodigo === p.codigo ||
          s.metadata?.parentId === p.idCatalogo,
      );
      resultado.push(...hijas);
    }
    const huerfanas = subs.filter(
      (s) =>
        !padres.some(
          (p) =>
            p.codigo === s.metadata?.parentCodigo ||
            p.idCatalogo === s.metadata?.parentId,
        ),
    );
    resultado.push(...huerfanas);
    return resultado;
  }, [items]);

  const ToastGlobal = toast ? (
    <div
      className={`fixed top-4 right-4 z-[90] max-w-sm px-4 py-2.5 rounded-xl text-sm font-black border shadow-lg animate-in slide-in-from-top fade-in ${
        toast.tipo === 'ok'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-pink-50 border-pink-300 text-pink-700'
      }`}
    >
      {toast.texto}
    </div>
  ) : null;

  const alCambiarPadre = (nuevoPadre: string) => {
    const subsExistentes = items.filter((s) => s.metadata?.parentCodigo === nuevoPadre);
    const sugeridoCodigo = nuevoPadre
      ? `${nuevoPadre}_S${String(subsExistentes.length + 1).padStart(2, '0')}`
      : '';
    setForm((prev) => ({
      ...prev,
      parentCodigo: nuevoPadre,
      codigo: sugeridoCodigo || prev.codigo,
    }));
  };

  const abrirCrear = () => {
    if (readOnly) return;
    setModo('crear');
    setIdEditando(null);
    const primerPadre = categoriasPrincipales[0]?.codigo || 'CS_001';
    const subsExistentes = items.filter((s) => s.metadata?.parentCodigo === primerPadre);
    const sugeridoCodigo = `${primerPadre}_S${String(subsExistentes.length + 1).padStart(2, '0')}`;
    setForm({
      ...VALORES_VACIOS,
      tipoJerarquia: 'SUBCATEGORIA',
      parentCodigo: primerPadre,
      codigo: sugeridoCodigo,
      orden: String((items.at(-1)?.orden || 0) + 1),
    });
    setErrores({});
    setErrorForm(null);
  };

  const abrirEditar = (it: CatalogoItem) => {
    if (readOnly) return;
    setModo('editar');
    setIdEditando(it.idCatalogo);
    const esSub = it.metadata?.tipo === 'SUBCATEGORIA' || !!it.metadata?.parentCodigo;
    setForm({
      codigo: it.codigo,
      nombre: it.nombre,
      descripcion: it.descripcion || '',
      orden: String(it.orden ?? ''),
      isActivo: !!it.isActivo,
      color: colorCss(it),
      tipoJerarquia: esSub ? 'SUBCATEGORIA' : 'PRINCIPAL',
      parentCodigo: it.metadata?.parentCodigo || '',
    });
    setErrores({});
    setErrorForm(null);
  };

  const cerrarModal = () => {
    setModo(null);
    setIdEditando(null);
    setForm(VALORES_VACIOS);
    setErrores({});
    setErrorForm(null);
  };

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (form.tipoJerarquia === 'SUBCATEGORIA' && !form.parentCodigo) {
      e.parentCodigo = 'Debe seleccionar la categoría padre.';
    }
    if (!form.codigo.trim()) e.codigo = 'Código requerido.';
    else if (form.codigo.trim().length < 2) e.codigo = 'Mínimo 2 caracteres.';
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido.';
    else if (form.nombre.trim().length < 3) e.nombre = 'Mínimo 3 caracteres.';
    if (form.orden !== '' && !Number.isInteger(+form.orden)) e.orden = 'Número entero.';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const payloadFromForm = (): CategoriaServicioPayload => ({
    codigo: form.codigo.trim(),
    nombre: form.nombre.trim(),
    descripcion: form.descripcion.trim() ? form.descripcion.trim() : undefined,
    orden: form.orden !== '' && Number.isInteger(+form.orden) ? Number(form.orden) : undefined,
    isActivo: form.isActivo,
    color: form.color,
    parentCodigo: form.tipoJerarquia === 'SUBCATEGORIA' && form.parentCodigo ? form.parentCodigo : null,
  });

  const guardar = async () => {
    if (readOnly) return;
    if (!validar()) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      if (modo === 'crear') {
        await infraestructuraService.crearCategoriaServicio(payloadFromForm());
        setToast({
          tipo: 'ok',
          texto:
            form.tipoJerarquia === 'SUBCATEGORIA'
              ? 'Subcategoría agregada correctamente.'
              : 'Categoría creada correctamente.',
        });
      } else if (modo === 'editar' && idEditando != null) {
        await infraestructuraService.actualizarCategoriaServicio(idEditando, payloadFromForm());
        setToast({ tipo: 'ok', texto: 'Categoría actualizada correctamente.' });
      }
      await cargar();
      cerrarModal();
    } catch (err: any) {
      const m = err?.message || 'Error guardando.';
      setToast({ tipo: 'err', texto: m });
      setErrorForm(m);
    } finally {
      setGuardando(false);
    }
  };

  const toggle = async (it: CatalogoItem) => {
    if (readOnly) return;
    try {
      await infraestructuraService.toggleCategoriaServicio(it.idCatalogo);
      setToast({ tipo: 'ok', texto: it.isActivo ? 'Categoría desactivada.' : 'Categoría activada.' });
      await cargar();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error toggle.' });
    }
  };

  const pedirConfirmarEliminar = (it: CatalogoItem) => {
    if (readOnly) return;
    if (esCategoriaOficial(it)) {
      setToast({
        tipo: 'err',
        texto: `La categoría ${it.codigo} es oficial y está protegida contra eliminación.`,
      });
      return;
    }
    setConfirmEliminar(it);
  };

  const cancelarEliminar = () => {
    if (eliminando) return;
    setConfirmEliminar(null);
  };

  const confirmarEliminar = async () => {
    if (!confirmEliminar || eliminando) return;
    setEliminando(true);
    try {
      await infraestructuraService.eliminarCategoriaServicio(confirmEliminar.idCatalogo);
      setToast({ tipo: 'ok', texto: 'Categoría eliminada correctamente.' });
      setConfirmEliminar(null);
      await cargar();
    } catch (err: any) {
      setToast({ tipo: 'err', texto: err?.message || 'Error eliminando.' });
    } finally {
      setEliminando(false);
    }
  };

  const inputBase =
    'w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ';

  const itemEditandoObj = idEditando != null ? items.find((x) => x.idCatalogo === idEditando) : null;
  const esItemEditandoOficial = itemEditandoObj ? esCategoriaOficial(itemEditandoObj) : false;

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-5 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-600 text-white flex items-center justify-center shadow-md ring-2 ring-blue-100">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Administrar Categorías de Servicio
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Listado de las 8 categorías oficiales precargadas y subcategorías vinculadas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cargar}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={abrirCrear}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md ring-1 ring-blue-500 transition-all"
            >
              <Plus className="w-4 h-4" />
              Nueva subcategoría / categoría
            </button>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Modo consulta. Este perfil puede revisar categorías para aprobación funcional, pero no editar ni eliminar.
          </span>
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-slate-300">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold w-16">#</th>
              <th className="px-4 py-3 text-left font-semibold w-32">Código</th>
              <th className="px-4 py-3 text-left font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold w-40">Jerarquía</th>
              <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Descripción</th>
              <th className="px-4 py-3 text-left font-semibold w-24">Color</th>
              <th className="px-4 py-3 text-left font-semibold w-24">Activa</th>
              <th className="px-4 py-3 text-right font-semibold w-32">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y bg-white">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                  Cargando categorías…
                </td>
              </tr>
            )}
            {!loading && itemsOrdenados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-xs">
                  No hay categorías registradas.
                </td>
              </tr>
            )}
            {!loading &&
              itemsOrdenados.map((it) => {
                const oficial = esCategoriaOficial(it);
                const esSub = it.metadata?.tipo === 'SUBCATEGORIA' || !!it.metadata?.parentCodigo;
                return (
                  <tr
                    key={it.idCatalogo}
                    className={`hover:bg-slate-50 transition-colors ${
                      esSub ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{it.orden}</td>
                    <td className="px-4 py-3 font-mono text-slate-900 font-semibold">{it.codigo}</td>
                    <td className="px-4 py-3 text-slate-900 font-semibold">
                      {esSub ? (
                        <div className="flex items-center gap-1.5 pl-2">
                          <span className="text-slate-400 font-mono text-xs">↳</span>
                          <span>{it.nombre}</span>
                        </div>
                      ) : (
                        <span>{it.nombre}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {esSub ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Layers className="w-3 h-3 text-slate-500" />
                          <span>Sub de {it.metadata?.parentCodigo || 'Padre'}</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            oficial
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {oficial ? (
                            <ShieldCheck className="w-3 h-3 text-blue-600" />
                          ) : (
                            <FolderKanban className="w-3 h-3 text-indigo-600" />
                          )}
                          <span>{oficial ? 'Oficial UMI' : 'Principal'}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">
                      {it.descripcion ? (
                        <span className="line-clamp-2">{it.descripcion}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${colorCss(it)}`}>
                        {it.codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg ${
                            it.isActivo
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {it.isActivo ? (
                            <>
                              <ToggleRight className="w-4 h-4" /> Si
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" /> No
                            </>
                          )}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggle(it)}
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
                            it.isActivo
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          aria-label="toggle activo"
                        >
                          {it.isActivo ? (
                            <>
                              <ToggleRight className="w-4 h-4" /> Si
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4" /> No
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span className="text-xs font-semibold text-slate-400">Solo lectura</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEditar(it)}
                            className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-700 transition-colors"
                            aria-label="editar"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {oficial ? (
                            <span
                              className="p-2 rounded-lg text-slate-400 bg-slate-100 cursor-not-allowed inline-flex items-center"
                              title="Categoría oficial del sistema (Protegida contra eliminación)"
                            >
                              <Lock className="w-4 h-4 text-slate-400" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => pedirConfirmarEliminar(it)}
                              className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                              aria-label="eliminar"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modo && (
        <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-black text-slate-900 text-lg">
                {modo === 'crear'
                  ? form.tipoJerarquia === 'SUBCATEGORIA'
                    ? 'Nueva Subcategoría de Servicio'
                    : 'Nueva Categoría Principal'
                  : esItemEditandoOficial
                  ? `Editar Categoría Oficial (${form.codigo})`
                  : 'Editar Categoría / Subcategoría'}
              </h3>
              <button
                type="button"
                onClick={cerrarModal}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                aria-label="cerrar"
                disabled={guardando}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {errorForm && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-pink-50 border border-pink-300 text-pink-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorForm}</span>
                </div>
              )}

              {/* Selector de Nivel Jerárquico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nivel de Catálogo <span className="text-red-600">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        tipoJerarquia: 'SUBCATEGORIA',
                        parentCodigo: prev.parentCodigo || categoriasPrincipales[0]?.codigo || 'CS_001',
                      }));
                      alCambiarPadre(form.parentCodigo || categoriasPrincipales[0]?.codigo || 'CS_001');
                    }}
                    disabled={modo === 'editar' && esItemEditandoOficial}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                      form.tipoJerarquia === 'SUBCATEGORIA'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${modo === 'editar' && esItemEditandoOficial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div>Subcategoría</div>
                      <div className="text-[10px] font-normal text-slate-500">Bajo una de las 8 oficiales</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        tipoJerarquia: 'PRINCIPAL',
                        parentCodigo: '',
                      }));
                    }}
                    disabled={modo === 'editar' && esItemEditandoOficial}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 ${
                      form.tipoJerarquia === 'PRINCIPAL'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${modo === 'editar' && esItemEditandoOficial ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <FolderKanban className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <div>Categoría Principal</div>
                      <div className="text-[10px] font-normal text-slate-500">Grupo de 1er nivel</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Si es Subcategoría: Selección de Categoría Padre obligatoria */}
              {form.tipoJerarquia === 'SUBCATEGORIA' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Categoría Padre (8 oficiales UMI) <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={form.parentCodigo}
                    onChange={(e) => alCambiarPadre(e.target.value)}
                    disabled={modo === 'editar' && esItemEditandoOficial}
                    className={inputBase + (errores.parentCodigo ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                  >
                    <option value="">-- Seleccione la categoría oficial padre --</option>
                    {categoriasPrincipales.map((cat) => (
                      <option key={cat.idCatalogo} value={cat.codigo}>
                        {cat.codigo} - {cat.nombre}
                      </option>
                    ))}
                  </select>
                  {errores.parentCodigo && (
                    <p className="mt-1 text-[11px] text-red-600 font-semibold">{errores.parentCodigo}</p>
                  )}
                </div>
              )}

              {/* Si es Principal y no es oficial: Alerta informativa */}
              {form.tipoJerarquia === 'PRINCIPAL' && !esItemEditandoOficial && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Aviso sobre agrupación de 8 categorías:</span>
                  </div>
                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                    La plataforma institucional opera con una línea base de 8 categorías oficiales (CS_001 a CS_008). Para no alterar esta agrupación en reportes e indicadores, se recomienda crear <strong>Subcategorías</strong>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Código <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                    placeholder={form.tipoJerarquia === 'SUBCATEGORIA' ? 'Ej: CS_001_S01' : 'Ej: CS_009'}
                    disabled={modo === 'editar' && esItemEditandoOficial}
                    className={inputBase + (errores.codigo ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                  />
                  {errores.codigo && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errores.codigo}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Orden
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.orden}
                    onChange={(e) => setForm({ ...form, orden: e.target.value })}
                    placeholder="Entero"
                    className={inputBase + (errores.orden ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                  />
                  {errores.orden && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errores.orden}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder={
                    form.tipoJerarquia === 'SUBCATEGORIA'
                      ? 'Ej: Reparación de cerraduras y candados'
                      : 'Ej: Servicios especiales UPS / CCTV'
                  }
                  className={inputBase + (errores.nombre ? 'border-red-200 bg-red-50' : 'border-slate-200')}
                />
                {errores.nombre && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errores.nombre}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Opcional. Explica brevemente qué cubre esta categoría o subcategoría."
                  className={inputBase + 'border-slate-200 resize-none'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Color badge
                  </label>
                  <select
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className={inputBase + 'border-slate-200'}
                  >
                    {OPCIONES_COLORES.map((c) => (
                      <option key={c.css} value={c.css}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.isActivo}
                    onChange={(e) => setForm({ ...form, isActivo: e.target.checked })}
                    className="w-4 h-4 peer rounded-md"
                  />
                  <span className="text-sm font-semibold text-slate-700">Activa</span>
                </label>
              </div>

              <div className="pt-1">
                <p className="text-[11px] text-slate-500 font-semibold mb-1.5">Preview:</p>
                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${form.color}`}>
                  {form.codigo || 'CS_XXX'} — {form.nombre || 'Nombre de ejemplo'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-100 border-t">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {guardando
                  ? 'Guardando…'
                  : modo === 'crear'
                  ? form.tipoJerarquia === 'SUBCATEGORIA'
                    ? 'Crear subcategoría'
                    : 'Crear categoría'
                  : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación ELIMINAR categoría / subcategoría */}
      {confirmEliminar && (
        <div className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-pink-100 text-pink-700 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-base tracking-tight">
                    Eliminar{' '}
                    {confirmEliminar.metadata?.tipo === 'SUBCATEGORIA' || confirmEliminar.metadata?.parentCodigo
                      ? 'subcategoría'
                      : 'categoría'}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                    ¿Estás seguro que deseas eliminar{' '}
                    <span className="font-bold text-slate-900">
                      &ldquo;{confirmEliminar.nombre}&rdquo;
                    </span>{' '}
                    <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px] align-baseline">
                      ({confirmEliminar.codigo})
                    </span>
                    ?
                  </p>
                  <p className="mt-2 text-[12px] font-bold text-pink-700 bg-pink-50 border border-pink-300 rounded-lg px-2.5 py-1.5 shadow-sm">
                    Esta acción no se puede deshacer. Si existen solicitudes asociadas, la base de datos impedirá la eliminación.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-slate-100 border-t">
              <button
                type="button"
                onClick={cancelarEliminar}
                disabled={eliminando}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={eliminando}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-red-600 bg-red-600 text-white text-sm font-bold shadow-md"
                style={{ opacity: eliminando ? 0.7 : 1 }}
              >
                <Trash2 className="w-4 h-4" />
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ToastGlobal}
    </div>
  );
};
