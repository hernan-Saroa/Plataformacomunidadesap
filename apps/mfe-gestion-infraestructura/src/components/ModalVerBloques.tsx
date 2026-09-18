import React, { useEffect, useMemo, useState } from 'react';
import {
  Building,
  MapPin,
  Phone,
  Mail,
  X,
  Plus,
  Save,
  Pencil,
  Power,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Sede,
  BloqueEdificio,
  infraestructuraService,
} from '../services/infraestructuraService';

interface ModalVerBloquesProps {
  open: boolean;
  onClose: () => void;
  sede: Sede | null;
  onBloqueCreado?: (bloque: BloqueEdificio, sede: Sede) => void;
  onBloqueActualizado?: (bloque: BloqueEdificio, sede: Sede) => void;
  onBloqueEliminado?: (idBloque: string, sede: Sede) => void;
  onError?: (err: Error) => void;
}

type FormMode = 'nuevo' | 'editar' | null;

const ESTILOS = {
  inputBase:
    'w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition disabled:bg-slate-100 disabled:text-slate-500',
  label: 'block text-xs font-semibold text-slate-700 mb-1.5',
  selectBase:
    'w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition',
};

export const ModalVerBloques: React.FC<ModalVerBloquesProps> = ({
  open,
  onClose,
  sede,
  onBloqueCreado,
  onBloqueActualizado,
  onBloqueEliminado,
  onError,
}) => {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mode, setMode] = useState<FormMode>('nuevo');
  const [bloqueAEditar, setBloqueAEditar] = useState<BloqueEdificio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [bloquesLocal, setBloquesLocal] = useState<BloqueEdificio[]>([]);
  const [toast, setToast] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);

  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [pisos, setPisos] = useState<number>(1);
  const [descripcion, setDescripcion] = useState('');
  const [isActivo, setIsActivo] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (open && sede) {
      const base = (sede.bloques ?? []).slice().sort((a, b) => a.codigo.localeCompare(b.codigo));
      setBloquesLocal(base);
      resetFormNuevo();
    }
  }, [open, sede]);

  const sedeInfo = sede ?? null;

  const resetFormNuevo = () => {
    setMode('nuevo');
    setBloqueAEditar(null);
    setCodigo('');
    setNombre('');
    setPisos(1);
    setDescripcion('');
    setIsActivo(true);
    setMostrarForm(false);
  };

  const abrirEditar = (b: BloqueEdificio) => {
    setMode('editar');
    setBloqueAEditar(b);
    setCodigo(b.codigo);
    setNombre(b.nombre);
    setPisos(b.pisos || 1);
    setDescripcion(b.descripcion ?? '');
    setIsActivo(b.isActivo);
    setMostrarForm(true);
  };

  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!sede) {
      e.sede = 'No hay sede seleccionada.';
      return e;
    }
    if (!codigo.trim()) e.codigo = 'Código obligatorio (máx 30).';
    else if (codigo.trim().length > 30) e.codigo = 'Código excede 30 caracteres.';
    else {
      const cod = codigo.trim().toUpperCase();
      const dup = bloquesLocal.find(
        (b) => b.codigo.toUpperCase() === cod && b.idBloque !== bloqueAEditar?.idBloque,
      );
      if (dup) e.codigo = `Código ${cod} ya existe en esta sede.`;
    }
    if (!nombre.trim()) e.nombre = 'Nombre obligatorio.';
    else if (nombre.trim().length > 100) e.nombre = 'Nombre excede 100 caracteres.';
    const p = Number(pisos);
    if (!Number.isFinite(p) || p < 1) e.pisos = 'Pisos debe ser mayor o igual a 1.';
    return e;
  }, [codigo, nombre, pisos, bloquesLocal, bloqueAEditar, sede]);

  const esValido = Object.keys(errores).length === 0 && sede != null;
  const submitDisabled = cargando || !esValido;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sede || submitDisabled) return;
    setCargando(true);
    try {
      const payload = {
        idSede: sede.idSede,
        codigo: codigo.trim().toUpperCase(),
        nombre: nombre.trim(),
        pisos: Math.max(1, Math.floor(Number(pisos) || 1)),
        descripcion: descripcion.trim() ? descripcion.trim() : undefined,
        isActivo,
      };
      if (mode === 'editar' && bloqueAEditar) {
        const actualizado = await infraestructuraService.actualizarBloque(bloqueAEditar.idBloque, payload);
        setBloquesLocal((lista) =>
          lista.map((b) => (b.idBloque === actualizado.idBloque ? actualizado : b))
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo)),
        );
        setToast({ tipo: 'ok', texto: `Bloque ${actualizado.codigo} actualizado correctamente.` });
        onBloqueActualizado?.(actualizado, sede);
        resetFormNuevo();
      } else {
        const creado = await infraestructuraService.crearBloque(payload);
        setBloquesLocal((lista) =>
          [...lista.filter((b) => b.idBloque !== creado.idBloque), creado]
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo)),
        );
        setToast({ tipo: 'ok', texto: `Bloque ${creado.codigo} creado correctamente.` });
        onBloqueCreado?.(creado, sede);
        resetFormNuevo();
      }
    } catch (err: any) {
      const mensaje = err?.message || 'Error guardando el bloque.';
      setToast({ tipo: 'err', texto: mensaje });
      onError?.(err instanceof Error ? err : new Error(mensaje));
    } finally {
      setCargando(false);
    }
  };

  const handleToggleActivo = async (b: BloqueEdificio) => {
    if (!sede) return;
    setCargando(true);
    try {
      const actualizado = await infraestructuraService.toggleBloqueActivo(b.idBloque);
      setBloquesLocal((lista) =>
        lista.map((x) => (x.idBloque === actualizado.idBloque ? actualizado : x)),
      );
      setToast({
        tipo: 'ok',
        texto: `Bloque ${actualizado.codigo} ${actualizado.isActivo ? 'activado' : 'desactivado'}.`,
      });
      onBloqueActualizado?.(actualizado, sede);
    } catch (err: any) {
      const mensaje = err?.message || 'Error al cambiar estado del bloque.';
      setToast({ tipo: 'err', texto: mensaje });
      onError?.(err instanceof Error ? err : new Error(mensaje));
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = async (b: BloqueEdificio) => {
    if (!sede) return;
    const ok = window.confirm(
      `¿Eliminar el bloque ${b.codigo} · ${b.nombre}?\nSolo se permite si NO tiene espacios físicos ligados.`,
    );
    if (!ok) return;
    setCargando(true);
    try {
      await infraestructuraService.eliminarBloque(b.idBloque);
      setBloquesLocal((lista) => lista.filter((x) => x.idBloque !== b.idBloque));
      setToast({ tipo: 'ok', texto: `Bloque ${b.codigo} eliminado.` });
      onBloqueEliminado?.(b.idBloque, sede);
      if (bloqueAEditar?.idBloque === b.idBloque) resetFormNuevo();
    } catch (err: any) {
      const mensaje = err?.message || 'Error eliminando bloque.';
      setToast({ tipo: 'err', texto: mensaje });
      onError?.(err instanceof Error ? err : new Error(mensaje));
    } finally {
      setCargando(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start sm:items-center justify-center p-3 sm:p-6 bg-slate-900/30 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-5xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Gestión de bloques y edificios por sede"
      >
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200/80 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center">
                <Building className="w-5.5 h-5.5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  Bloques y Edificios
                  <span className="text-slate-400">·</span>
                  <span className="truncate text-slate-800">
                    {sedeInfo ? sedeInfo.nombre : '—'}
                  </span>
                  {sedeInfo && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-slate-200 bg-white font-mono text-[11px] font-semibold text-slate-600 tracking-tight">
                      {sedeInfo.codigo}
                    </span>
                  )}
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {bloquesLocal.length} {bloquesLocal.length === 1 ? 'bloque' : 'bloques'}
                  </span>
                </h3>
                {sedeInfo && (
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {sedeInfo.direccion}, {sedeInfo.municipio} · {sedeInfo.departamento}
                      </span>
                    </div>
                    {sedeInfo.telefono && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{sedeInfo.telefono}</span>
                      </div>
                    )}
                    {sedeInfo.emailContacto && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{sedeInfo.emailContacto}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (mode === 'editar') resetFormNuevo();
                else {
                  setMostrarForm((v) => !v);
                  if (!mostrarForm) {
                    setMode('nuevo');
                    setBloqueAEditar(null);
                    setCodigo('');
                    setNombre('');
                    setPisos(1);
                    setDescripcion('');
                    setIsActivo(true);
                  }
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition active:scale-95 disabled:opacity-60"
              disabled={cargando || !sede}
            >
              {mode === 'editar' ? (
                <>
                  <X className="w-4 h-4" />
                  Cancelar edición
                </>
              ) : mostrarForm ? (
                <>
                  <X className="w-4 h-4" />
                  Cerrar formulario
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Nuevo Bloque
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana bloques"
              title="Cerrar ventana de bloques"
              className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 border border-slate-200 bg-white transition active:scale-95"
            >
              <X className="w-5 h-5" strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {toast && (
          <div
            className={`absolute top-20 right-6 z-[95] max-w-sm px-4 py-2.5 rounded-xl text-xs font-black border shadow-lg flex items-start gap-2 animate-in slide-in-from-top fade-in ${
              toast.tipo === 'ok'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-300 text-rose-700'
            }`}
          >
            {toast.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-5">{toast.texto}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Cerrar aviso"
              className="ml-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {mostrarForm && sede && (
            <form
              onSubmit={onSubmit}
              className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50/60 to-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 mb-4">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {mode === 'editar' && bloqueAEditar ? (
                    <>
                      <Pencil className="w-4 h-4 text-indigo-600" />
                      Editar bloque <span className="font-mono text-indigo-700">{bloqueAEditar.codigo}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-blue-600" />
                      Registrar nuevo bloque en <span className="font-mono text-blue-700">{sede.codigo}</span>
                    </>
                  )}
                </h4>
                {(mode === 'editar' || cargando) && (
                  <button
                    type="button"
                    onClick={resetFormNuevo}
                    disabled={cargando}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={ESTILOS.label} htmlFor="blq-codigo">
                    Código <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="blq-codigo"
                    type="text"
                    value={codigo}
                    maxLength={30}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: BLQ-A, BLQ-LAB-2"
                    className={`${ESTILOS.inputBase} font-mono tracking-tight`}
                    autoComplete="off"
                    disabled={cargando}
                  />
                  {errores.codigo && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errores.codigo}
                    </p>
                  )}
                </div>

                <div>
                  <label className={ESTILOS.label} htmlFor="blq-nombre">
                    Nombre bloque <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="blq-nombre"
                    type="text"
                    value={nombre}
                    maxLength={100}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Bloque Académico Principal"
                    className={ESTILOS.inputBase}
                    disabled={cargando}
                  />
                  {errores.nombre && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errores.nombre}
                    </p>
                  )}
                </div>

                <div>
                  <label className={ESTILOS.label} htmlFor="blq-pisos">
                    Número de pisos <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="blq-pisos"
                    type="number"
                    min={1}
                    step={1}
                    value={pisos}
                    onChange={(e) => setPisos(Math.max(1, Number(e.target.value) || 1))}
                    className={ESTILOS.inputBase}
                    disabled={cargando}
                  />
                  {errores.pisos && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {errores.pisos}
                    </p>
                  )}
                </div>

                <div>
                  <div className={ESTILOS.label}>Estado del bloque</div>
                  <label className="inline-flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={isActivo}
                        onChange={(e) => setIsActivo(e.target.checked)}
                        disabled={cargando}
                      />
                      <div
                        className={`h-7 w-12 rounded-full border transition-all duration-200 ${
                          isActivo
                            ? 'bg-emerald-600 border-emerald-700'
                            : 'bg-slate-200 border-slate-300'
                        }`}
                      />
                      <div
                        className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm border border-slate-200 transition-all duration-200 grid place-items-center ${
                          isActivo ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isActivo ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {isActivo ? 'Bloque activo' : 'Bloque inactivo'}
                    </span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className={ESTILOS.label} htmlFor="blq-desc">
                    Descripción (opcional)
                  </label>
                  <textarea
                    id="blq-desc"
                    value={descripcion}
                    maxLength={500}
                    rows={2}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Detalles del edificio o ubicación dentro de la sede (ej: edificio principal, acceso por portería 2)."
                    className={`${ESTILOS.inputBase} resize-y min-h-[72px]`}
                    disabled={cargando}
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {esValido && !cargando && (
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 inline-flex items-center gap-1.5 w-fit">
                    <CheckCircle2 className="w-4 h-4" />
                    Formulario válido. Puedes guardar.
                  </div>
                )}
                <div className="flex items-center gap-2 sm:ml-auto">
                  <button
                    type="button"
                    onClick={resetFormNuevo}
                    disabled={cargando}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    disabled={submitDisabled}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm shadow-blue-500/20 transition active:scale-95 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:scale-100"
                  >
                    <Save className="w-4 h-4" />
                    {cargando
                      ? 'Guardando...'
                      : mode === 'editar'
                      ? 'Guardar cambios'
                      : 'Crear bloque'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr className="text-[11px] font-black tracking-wider uppercase text-slate-500">
                    <th className="px-5 py-3 text-left">Código</th>
                    <th className="px-5 py-3 text-left">Nombre</th>
                    <th className="px-5 py-3 text-right">Pisos</th>
                    <th className="px-5 py-3 text-left max-w-md">Descripción</th>
                    <th className="px-5 py-3 text-center">Estado</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bloquesLocal.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center">
                        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center">
                          <Building className="w-7 h-7" strokeWidth={2} />
                        </div>
                        <div className="text-sm font-semibold text-slate-600">
                          Esta sede aún no tiene bloques registrados.
                        </div>
                        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                          Clic en <span className="font-bold text-blue-700">Nuevo Bloque</span> arriba para
                          empezar a registrar edificios o construcciones de la sede.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    bloquesLocal.map((b) => (
                      <tr
                        key={b.idBloque}
                        className={`${
                          b.isActivo === false
                            ? 'bg-slate-50/60 opacity-70'
                            : 'hover:bg-blue-50/30'
                        } transition`}
                      >
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 tracking-tight">
                              {b.codigo}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 pr-10">
                          <div
                            className={`text-sm font-bold leading-tight ${
                              b.isActivo === false ? 'text-slate-500 line-through' : 'text-slate-800'
                            }`}
                          >
                            {b.nombre}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums font-semibold text-slate-700">
                          {b.pisos ?? 1}
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-xs max-w-md">
                          {b.descripcion ? (
                            <span className="line-clamp-2">{b.descripcion}</span>
                          ) : (
                            <span className="text-slate-300 italic">— sin descripción —</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                              b.isActivo
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-slate-100 border-slate-300 text-slate-500'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                b.isActivo ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            {b.isActivo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => abrirEditar(b)}
                              aria-label={`Editar bloque ${b.codigo}`}
                              title="Editar bloque"
                              disabled={cargando}
                              className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActivo(b)}
                              aria-label={`${b.isActivo ? 'Desactivar' : 'Activar'} bloque ${b.codigo}`}
                              title={b.isActivo ? 'Desactivar bloque' : 'Activar bloque'}
                              disabled={cargando}
                              className={`p-2 rounded-lg transition disabled:opacity-50 ${
                                b.isActivo
                                  ? 'hover:bg-amber-50 text-amber-600 hover:text-amber-800'
                                  : 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-800'
                              }`}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminar(b)}
                              aria-label={`Eliminar bloque ${b.codigo}`}
                              title="Eliminar bloque (solo si no tiene espacios ligados)"
                              disabled={cargando}
                              className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 hover:text-rose-700 disabled:opacity-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-slate-200/80 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-slate-500">
            Tip: mantén <span className="text-slate-700">códigos de bloque únicos por sede</span> para usarlos como
            prefijo en espacios físicos (ej: BLQ-A + AUL-001 → {sede ? `${sede.codigo}-AUL-001` : 'SEDE-XXX-AUL-001'}).
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
