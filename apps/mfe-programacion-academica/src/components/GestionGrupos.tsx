import { useEffect, useState } from 'react';
import { Layers3, Loader2, Plus, Trash2, User, Users } from 'lucide-react';

import { crearGrupos, eliminarGrupo, getGrupos, type Grupo } from '../services/api/catalogoApi';
import { CalendarioHorario } from './CalendarioHorario';

/**
 * EFDS-1370 — Grupos de la asignatura seleccionada.
 *
 * Cada grupo es una instancia INDEPENDIENTE: su docente, horario y fechas son
 * propios (RN-11). La numeración la asigna el backend, no el cliente.
 *
 * Estética ESAP: azul institucional #003DA5, mismas tarjetas y tipografía que el
 * resto del módulo.
 */
interface Props {
  idAsignatura: string;
  nombreAsignatura: string;
  codigoAsignatura: string | null;
}

export function GestionGrupos({ idAsignatura, nombreAsignatura, codigoAsignatura }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  // EFDS-1371: el horario cuelga del GRUPO, asi que se abre desde el grupo elegido.
  const [grupoSel, setGrupoSel] = useState<Grupo | null>(null);

  const recargar = () => {
    setCargando(true);
    setError('');
    getGrupos(idAsignatura)
      .then(setGrupos)
      .catch((e) => setError(e?.message || 'No se pudieron cargar los grupos.'))
      .finally(() => setCargando(false));
  };

  useEffect(recargar, [idAsignatura]);

  const onCrear = async () => {
    setCreando(true);
    setError('');
    try {
      await crearGrupos(idAsignatura, cantidad);
      recargar();
    } catch (e: any) {
      setError(e?.message || 'No se pudieron crear los grupos.');
    } finally {
      setCreando(false);
    }
  };

  const onEliminar = async (g: Grupo) => {
    setError('');
    try {
      await eliminarGrupo(g.idGrupo);
      recargar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo eliminar el grupo.');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <Layers3 className="w-4 h-4 text-[#003DA5]" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
            Grupos de la asignatura
          </h3>
        </div>
        <p className="text-xs text-slate-500 font-medium">
          {nombreAsignatura}
          {codigoAsignatura ? <span className="font-mono"> · {codigoAsignatura}</span> : null}
        </p>
      </div>

      <div className="p-4 flex items-end gap-3 flex-wrap border-b border-slate-100 bg-slate-50/60">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Cantidad a crear
          </span>
          <input
            type="number"
            min={1}
            max={20}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </label>
        <button
          onClick={onCrear}
          disabled={creando}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border-none text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          style={{ background: creando ? '#9CA3AF' : '#003DA5' }}
        >
          {creando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          {creando ? 'Creando…' : 'Crear grupos'}
        </button>
        <p className="text-xs text-slate-400 font-medium ml-auto">
          La numeración es automática y no reutiliza números liberados.
        </p>
      </div>

      {error && (
        <div className="m-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {error}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center gap-2 p-6 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando grupos…
        </div>
      ) : grupos.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">
          La asignatura aún no tiene grupos. Cree el primero para poder asignarle horario.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {grupos.map((g) => (
            <div
              key={g.idGrupo}
              onClick={() => setGrupoSel(grupoSel?.idGrupo === g.idGrupo ? null : g)}
              className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                grupoSel?.idGrupo === g.idGrupo ? "bg-blue-50/70" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 shrink-0 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center text-sm font-black">
                  {String(g.numeroGrupo).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">Grupo {g.numeroGrupo}</p>
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {g.idDocente ? 'Docente asignado' : 'Sin docente'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {g.cupoMaximo} cupos
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[0.62rem] font-bold border border-slate-200 bg-slate-50 text-slate-600">
                  {g.estado}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onEliminar(g); }}
                  title="Eliminar grupo"
                  className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EFDS-1371: el horario cuelga del GRUPO. Se abre al elegir uno. */}
      {grupoSel && (
        <div className="p-4 border-t border-slate-200 bg-slate-50/40">
          <CalendarioHorario
            idGrupo={grupoSel.idGrupo}
            numeroGrupo={grupoSel.numeroGrupo}
            nombreAsignatura={nombreAsignatura}
          />
        </div>
      )}
    </div>
  );
}
