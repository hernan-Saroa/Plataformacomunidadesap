import { useEffect, useState, type FormEvent } from 'react';
import { Building, Loader2, Lock, Pencil, Trash2, Check, X } from 'lucide-react';

import {
  getAulas, getDisponibilidadAula, crearAula, actualizarAula, eliminarAula,
  TIPOS_AULA, type Aula, type FranjaOcupadaAula,
} from '../services/api/catalogoApi';

/**
 * EFDS-1374 — Disponibilidad de aulas · EFDS-1942 — CRUD y capacidad.
 *
 * ⚠️ RN-07: la ocupación muestra solo día y hora, nunca qué grupo ni qué
 * asignatura la ocupa. Eso NO lo garantiza esta pantalla, sino el backend, que
 * no envía esos campos: aquí simplemente no hay nada más que pintar.
 *
 * La gestión (crear, editar capacidad, eliminar) es administración del dato
 * maestro: exige el permiso de administración. Sin él, el backend responde 403 y
 * el mensaje se muestra tal cual. Un aula creada a mano deja de ser provisional
 * (C-4): la registra el administrador como infraestructura real.
 *
 * Estética ESAP: azul institucional #003DA5.
 */
const ETIQUETA_TIPO: Record<string, string> = { aula: 'Aula', auditorio: 'Auditorio' };
const FORM_VACIO = { codigo: '', nombre: '', tipo: 'aula', capacidad: '', sedeCodigo: '', piso: '' };

export function DisponibilidadAulas() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [sel, setSel] = useState<string>('');
  const [ocupada, setOcupada] = useState<FranjaOcupadaAula[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // NUEVA — gestión (EFDS-1942). El aviso del backend se muestra verbatim.
  const [nuevo, setNuevo] = useState({ ...FORM_VACIO });
  const [guardando, setGuardando] = useState(false);
  const [avisoAdmin, setAvisoAdmin] = useState('');
  const [editCodigo, setEditCodigo] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ nombre: string; capacidad: string }>({ nombre: '', capacidad: '' });

  const recargar = () => getAulas().then(setAulas).catch(() => {});

  useEffect(() => {
    getAulas()
      .then((a) => { setAulas(a); if (a[0]) setSel(a[0].codigo); })
      .catch((e) => setError(e?.message || 'No se pudieron cargar las aulas.'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    if (!sel) return;
    getDisponibilidadAula(sel).then((r) => setOcupada(r.ocupada)).catch(() => setOcupada([]));
  }, [sel]);

  const aula = aulas.find((a) => a.codigo === sel);

  // La capacidad viaja como número o null: cadena vacía = "sin dato", no cero.
  const capNum = (s: string): number | null => (s.trim() === '' ? null : Number(s));

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setAvisoAdmin('');
    try {
      await crearAula({
        codigo: nuevo.codigo.trim(),
        nombre: nuevo.nombre.trim(),
        tipo: (nuevo.tipo || null) as any,
        capacidad: capNum(nuevo.capacidad),
        sedeCodigo: nuevo.sedeCodigo.trim() || null,
        piso: nuevo.piso.trim() === '' ? null : Number(nuevo.piso),
      });
      setNuevo({ ...FORM_VACIO });
      await recargar();
    } catch (err: any) {
      setAvisoAdmin(err?.message || 'No se pudo crear el aula.');
    } finally {
      setGuardando(false);
    }
  };

  const abrirEdicion = (a: Aula) => {
    setEditCodigo(a.codigo);
    setDraft({ nombre: a.nombre, capacidad: a.capacidad == null ? '' : String(a.capacidad) });
    setAvisoAdmin('');
  };

  const guardarEdicion = async (codigo: string) => {
    setAvisoAdmin('');
    try {
      // Solo nombre y capacidad se editan en línea; el resto se omite y el
      // backend no lo toca (actualización parcial).
      await actualizarAula(codigo, {
        nombre: draft.nombre.trim(),
        capacidad: capNum(draft.capacidad),
      });
      setEditCodigo(null);
      await recargar();
    } catch (err: any) {
      setAvisoAdmin(err?.message || 'No se pudo actualizar el aula.');
    }
  };

  const borrar = async (codigo: string) => {
    setAvisoAdmin('');
    try {
      await eliminarAula(codigo);
      if (sel === codigo) setSel('');
      await recargar();
    } catch (err: any) {
      setAvisoAdmin(err?.message || 'No se pudo eliminar el aula.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm mb-1 flex items-center gap-2">
          <Building className="w-4 h-4 text-[#003DA5]" /> Disponibilidad de Aulas
        </h3>
        <p className="text-xs text-slate-500">
          Ocupación por espacio físico. Se muestra el día y la hora de lo ocupado; no qué grupo lo ocupa.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {cargando ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 p-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando aulas…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Lista de aulas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Aulas
            </div>
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {aulas.map((a) => (
                <button
                  key={a.codigo}
                  onClick={() => setSel(a.codigo)}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${sel === a.codigo ? 'bg-blue-50 text-[#003DA5] font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{a.nombre}</span>
                    {a.provisional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">PROV.</span>}
                  </div>
                  {a.capacidad != null && <span className="text-[11px] text-slate-400">Capacidad: {a.capacidad}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Ocupación del aula seleccionada */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">{aula?.nombre || 'Aula'}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <Lock className="w-3 h-3" /> Solo día y hora (RN-07)
              </span>
            </div>
            {ocupada.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Sin franjas ocupadas registradas para esta aula.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <tr><th className="px-4 py-3">Día</th><th className="px-4 py-3">Desde</th><th className="px-4 py-3">Hasta</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ocupada.map((f, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-700 capitalize">{f.diaSemana.toLowerCase()}</td>
                      <td className="px-4 py-3 text-[#003DA5] font-semibold">{f.horaInicio}</td>
                      <td className="px-4 py-3 text-[#003DA5] font-semibold">{f.horaFin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* EFDS-1942 — Gestión del catálogo de aulas y su capacidad */}
      {!cargando && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h4 className="font-bold text-slate-800 text-sm">Gestión de aulas y capacidad</h4>
            <p className="text-xs text-slate-500">
              Alta, edición de capacidad y baja del catálogo. Un aula creada aquí deja de ser provisional.
            </p>
          </div>

          {/* Alta */}
          <form onSubmit={crear} className="p-4 border-b border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <label className="flex flex-col gap-1 lg:col-span-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Código</span>
                <input required value={nuevo.codigo} placeholder="204B" maxLength={40}
                  onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <label className="flex flex-col gap-1 lg:col-span-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Nombre</span>
                <input required value={nuevo.nombre} placeholder="Aula 204 · Bloque B"
                  onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Tipo</span>
                <select value={nuevo.tipo}
                  onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                  {TIPOS_AULA.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO[t]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Capacidad</span>
                <input type="number" min={0} value={nuevo.capacidad} placeholder="40"
                  onChange={(e) => setNuevo({ ...nuevo, capacidad: e.target.value })}
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Sede / Piso</span>
                <div className="flex gap-1">
                  <input value={nuevo.sedeCodigo} placeholder="Sede"
                    onChange={(e) => setNuevo({ ...nuevo, sedeCodigo: e.target.value })}
                    className="w-1/2 border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                  <input type="number" value={nuevo.piso} placeholder="Piso"
                    onChange={(e) => setNuevo({ ...nuevo, piso: e.target.value })}
                    className="w-1/2 border border-slate-200 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </label>
            </div>
            {avisoAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">{avisoAdmin}</div>
            )}
            <button type="submit" disabled={guardando}
              className="px-4 py-2 rounded-lg bg-[#003DA5] text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all">
              {guardando ? 'Creando…' : 'Crear aula'}
            </button>
          </form>

          {/* Tabla editable */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Capacidad</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {aulas.map((a) => {
                  const editando = editCodigo === a.codigo;
                  return (
                    <tr key={a.codigo} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2 font-mono text-[12px] text-slate-600">{a.codigo}</td>
                      <td className="px-4 py-2">
                        {editando ? (
                          <input value={draft.nombre}
                            onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                        ) : (
                          <span className="text-slate-700">{a.nombre}
                            {a.provisional && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">PROV.</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {editando ? (
                          <input type="number" min={0} value={draft.capacidad}
                            onChange={(e) => setDraft({ ...draft, capacidad: e.target.value })}
                            className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                        ) : (
                          <span className="text-slate-700">{a.capacidad ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {editando ? (
                            <>
                              <button type="button" title="Guardar" onClick={() => guardarEdicion(a.codigo)}
                                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50"><Check className="w-4 h-4" /></button>
                              <button type="button" title="Cancelar" onClick={() => setEditCodigo(null)}
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <button type="button" title="Editar" onClick={() => abrirEdicion(a)}
                                className="p-1.5 rounded-lg text-[#003DA5] hover:bg-blue-50"><Pencil className="w-4 h-4" /></button>
                              <button type="button" title="Eliminar" onClick={() => borrar(a.codigo)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                            </>
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
    </div>
  );
}
