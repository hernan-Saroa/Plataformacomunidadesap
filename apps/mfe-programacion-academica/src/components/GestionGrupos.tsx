import { useEffect, useState } from 'react';
import { Layers3, Loader2, Plus, Trash2, User, Users } from 'lucide-react';

import {
  actualizarOfertaCetapGrupo, crearGrupos, eliminarGrupo, getGrupos, getOfertasCetapGrupo,
  type Grupo, type OfertaCetapGrupo,
} from '../services/api/catalogoApi';
import { CalendarioHorario } from './CalendarioHorario';

function nombreOferta(oferta: OfertaCetapGrupo): string {
  const territorial = oferta.territorial.nombre || oferta.territorial.codigo || 'Territorial sin identificar';
  return `${territorial} · ${oferta.cetap.nombre} (${oferta.cetap.codigo})`;
}

function SelectorOfertaCetap({ id, label, ofertas, valor, onChange, disabled }: {
  id: string;
  label: string;
  ofertas: OfertaCetapGrupo[];
  valor: string;
  onChange: (idOferta: string) => void;
  disabled?: boolean;
}) {
  const [busqueda, setBusqueda] = useState('');
  const filtro = busqueda.trim().toLocaleLowerCase('es');
  const visibles = ofertas.filter((oferta) =>
    !filtro || nombreOferta(oferta).toLocaleLowerCase('es').includes(filtro),
  );
  const seleccionada = ofertas.find((oferta) => oferta.idOfertaCetap === valor);
  if (seleccionada && !visibles.some((oferta) => oferta.idOfertaCetap === valor)) visibles.unshift(seleccionada);

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label htmlFor={`${id}-buscar`} className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscar {label.toLocaleLowerCase('es')}</label>
      <input
        id={`${id}-buscar`}
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        disabled={disabled || ofertas.length === 0}
        placeholder="Buscar territorial o CETAP"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
      />
      <select
        aria-label={label}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || (ofertas.length === 0 && !valor)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
      >
        <option value="">Sin oferta CETAP</option>
        {valor && !seleccionada && <option value={valor}>Oferta {valor} (ya no disponible en este periodo)</option>}
        {visibles.map((oferta) => (
          <option key={oferta.idOfertaCetap} value={oferta.idOfertaCetap}>
            {nombreOferta(oferta)}{oferta.territorial.idSeccional ? '' : ' · Sin territorial vinculada'}
          </option>
        ))}
      </select>
      {filtro && <span className="text-xs text-slate-500">{visibles.length} de {ofertas.length} ofertas coinciden.</span>}
      {seleccionada && !seleccionada.territorial.idSeccional && (
        <span className="text-xs text-amber-700">Este CETAP no tiene territorial vinculada; el grupo no podrá concertarse.</span>
      )}
      {valor && !seleccionada && (
        <span className="text-xs text-amber-700">La oferta actual ya no está activa o no corresponde a este periodo. Elige otra o quítala.</span>
      )}
    </div>
  );
}

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
  /** Periodo activo: los grupos se listan y se crean dentro de él (§1.0). */
  idPeriodo: string;
  irACarga?: () => void;
}

export function GestionGrupos({ idAsignatura, nombreAsignatura, codigoAsignatura, idPeriodo, irACarga }: Props) {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [ofertas, setOfertas] = useState<OfertaCetapGrupo[]>([]);
  const [cargandoOfertas, setCargandoOfertas] = useState(true);
  const [errorOfertas, setErrorOfertas] = useState('');
  const [ofertaNueva, setOfertaNueva] = useState('');
  const [ofertaEditada, setOfertaEditada] = useState<Record<string, string>>({});
  const [guardandoOferta, setGuardandoOferta] = useState<string | null>(null);
  // EFDS-1371: el horario cuelga del GRUPO, asi que se abre desde el grupo elegido.
  const [grupoSel, setGrupoSel] = useState<Grupo | null>(null);

  const recargar = () => {
    setCargando(true);
    setError('');
    getGrupos(idAsignatura, idPeriodo)
      .then(setGrupos)
      .catch((e) => setError(e?.message || 'No se pudieron cargar los grupos.'))
      .finally(() => setCargando(false));
  };

  useEffect(recargar, [idAsignatura, idPeriodo]);

  useEffect(() => {
    let vigente = true;
    setCargandoOfertas(true);
    setErrorOfertas('');
    setOfertas([]);
    setOfertaNueva('');
    setOfertaEditada({});
    getOfertasCetapGrupo(idAsignatura, idPeriodo)
      .then((data) => { if (vigente) setOfertas(data); })
      .catch((e) => { if (vigente) setErrorOfertas(e?.message || 'No se pudieron cargar las ofertas CETAP.'); })
      .finally(() => { if (vigente) setCargandoOfertas(false); });
    return () => { vigente = false; };
  }, [idAsignatura, idPeriodo]);

  const onCrear = async () => {
    setCreando(true);
    setError('');
    try {
      await crearGrupos(idAsignatura, cantidad, idPeriodo, cargandoOfertas || errorOfertas ? null : ofertaNueva || null);
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

  const onGuardarOferta = async (g: Grupo) => {
    const idOfertaCetap = ofertaEditada[g.idGrupo] ?? g.idOfertaCetap ?? '';
    setGuardandoOferta(g.idGrupo);
    setError('');
    try {
      const actualizado = await actualizarOfertaCetapGrupo(g.idGrupo, idOfertaCetap || null);
      setGrupos((actuales) => actuales.map((grupo) => grupo.idGrupo === g.idGrupo ? actualizado : grupo));
      if (grupoSel?.idGrupo === g.idGrupo) setGrupoSel(actualizado);
      setOfertaEditada((actual) => { const siguiente = { ...actual }; delete siguiente[g.idGrupo]; return siguiente; });
      recargar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la oferta CETAP del grupo.');
      setOfertaEditada((actual) => { const siguiente = { ...actual }; delete siguiente[g.idGrupo]; return siguiente; });
    } finally {
      setGuardandoOferta(null);
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
        <div className="w-full sm:w-80">
          <SelectorOfertaCetap
            id="oferta-grupo-nuevo" label="Oferta CETAP para grupos nuevos"
            ofertas={ofertas} valor={ofertaNueva} onChange={setOfertaNueva}
            disabled={cargandoOfertas || !!errorOfertas}
          />
        </div>
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

      {cargandoOfertas && <p className="px-4 py-2 text-xs text-slate-500">Consultando ofertas CETAP…</p>}
      {errorOfertas && <p role="alert" className="px-4 py-2 text-xs text-amber-800">No se pudieron cargar las ofertas CETAP. Puedes crear grupos sin oferta y asignarla después. {errorOfertas}</p>}
      {!cargandoOfertas && !errorOfertas && ofertas.length === 0 && (
        <div className="px-4 py-3 text-xs text-slate-600">
          <p>No hay ofertas CETAP activas para esta asignatura y periodo. La oferta se crea al cargar el Excel del periodo; sin ella, los grupos pueden crearse, pero no concertarse.</p>
          {irACarga && <button type="button" onClick={irACarga} className="mt-2 font-bold text-[#003DA5] underline">Ir a cargar Excel del periodo</button>}
        </div>
      )}

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
              className={`p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors ${
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
              <div className="w-full pl-0 sm:pl-[3.25rem]" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-full sm:w-96">
                    <SelectorOfertaCetap
                      id={`oferta-${g.idGrupo}`} label={`Oferta CETAP del grupo ${g.numeroGrupo}`}
                      ofertas={ofertas} valor={ofertaEditada[g.idGrupo] ?? g.idOfertaCetap ?? ''}
                      onChange={(id) => setOfertaEditada((actual) => ({ ...actual, [g.idGrupo]: id }))}
                      disabled={cargandoOfertas || !!errorOfertas || guardandoOferta === g.idGrupo}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onGuardarOferta(g)}
                    disabled={cargandoOfertas || !!errorOfertas || !!guardandoOferta || (ofertaEditada[g.idGrupo] ?? g.idOfertaCetap ?? '') === (g.idOfertaCetap ?? '')}
                    className="flex items-center gap-1 rounded-lg bg-[#003DA5] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {guardandoOferta === g.idGrupo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Guardar ubicación
                  </button>
                </div>
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
            fechaInicioGrupo={grupoSel.fechaInicio}
            fechaFinGrupo={grupoSel.fechaFin}
          />
        </div>
      )}
    </div>
  );
}
