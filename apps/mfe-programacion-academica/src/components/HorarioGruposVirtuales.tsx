import { useEffect, useState } from 'react';
import { Loader2, Monitor, Plus, Trash2 } from 'lucide-react';

import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import {
  definirFranjaVirtual, getGruposVirtuales, quitarFranjaVirtual, type GrupoVirtualDocente,
} from '../services/api/horarioDocenteApi';

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const NOMBRE_DIA: Record<string, string> = { LUNES: 'Lunes', MARTES: 'Martes', MIERCOLES: 'Miércoles', JUEVES: 'Jueves', VIERNES: 'Viernes', SABADO: 'Sábado', DOMINGO: 'Domingo' };
const cap = (d: string) => NOMBRE_DIA[d] ?? d;
const horas = (h: number | null) => (h == null ? 'sin dato' : `${h} h`);

/**
 * Grupos VIRTUALES asignados al docente (migración 063): el programador los asignó sin
 * horario y el docente lo define aquí. El servidor aplica las mismas reglas que el
 * backoffice —choques con todo lo que ya dicta, horas del grupo frente a las del catálogo
 * (máximo ×1,3) y su tope— y responde con el motivo si algo no cabe.
 */
export function HorarioGruposVirtuales() {
  const revision = useRevisionProgramacion('portal-docente');
  const [grupos, setGrupos] = useState<GrupoVirtualDocente[] | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  useEffect(() => {
    let vigente = true;
    getGruposVirtuales()
      .then((g) => { if (vigente) { setGrupos(g); setErrorCarga(''); } })
      .catch((e) => { if (vigente) setErrorCarga(e?.message || 'No se pudieron consultar tus grupos virtuales.'); });
    return () => { vigente = false; };
  }, [revision]);

  if (errorCarga) return <p role="alert" className="text-sm text-red-700">{errorCarga}</p>;
  if (!grupos?.length) return null;
  return (
    <section aria-label="Horario de mis grupos virtuales" className="bg-white p-4 rounded-xl border border-violet-200 shadow-xs space-y-3">
      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
        <Monitor className="w-4 h-4 text-violet-700" /> Horario de mis grupos virtuales
      </h4>
      <p className="text-xs text-slate-500">
        Estos grupos son mediados por tecnología y se te asignaron sin horario. Defínelo aquí: se valida que no se cruce
        con tus otras clases, que las horas del grupo no pasen del máximo y que no superes tu tope.
      </p>
      {grupos.map((g) => <GrupoVirtual key={g.idGrupo} g={g} />)}
    </section>
  );
}

function GrupoVirtual({ g }: { g: GrupoVirtualDocente }) {
  const [nueva, setNueva] = useState({ diaSemana: 'LUNES', horaInicio: '18:00', horaFin: '20:00' });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const sinCiclo = !g.cicloInicio || !g.cicloFin;

  const agregar = async () => {
    if (ocupado) return;
    setOcupado(true); setError('');
    try { await definirFranjaVirtual(g.idGrupo, nueva); }
    catch (e: any) { setError(e?.message || 'No se pudo agregar la sesión.'); }
    finally { setOcupado(false); }
  };
  const quitar = async (idFranja: string) => {
    if (ocupado) return;
    setOcupado(true); setError('');
    try { await quitarFranjaVirtual(g.idGrupo, idFranja); }
    catch (e: any) { setError(e?.message || 'No se pudo quitar la sesión.'); }
    finally { setOcupado(false); }
  };

  return (
    <article className="rounded-xl border p-3 space-y-2" aria-label={`${g.asignatura} grupo ${g.numeroGrupo}`}>
      <h5 className="font-bold text-sm">
        {g.codigoAsignatura} · {g.asignatura} · Grupo {g.numeroGrupo}
        <span className="ml-2 px-2 py-0.5 rounded-full text-[0.62rem] font-bold bg-violet-50 text-violet-700 border border-violet-200">Virtual</span>
      </h5>
      <p className="text-xs text-slate-600">
        {g.programa} · Periodo {g.periodoCodigo ?? 'sin periodo'} · Ciclo {g.cicloInicio ?? 'sin definir'} — {g.cicloFin ?? 'sin definir'}
      </p>
      <p className="text-xs">
        <strong>{horas(g.horasProgramadas)}</strong> programadas de <strong>{horas(g.horasRequeridas)}</strong> requeridas
        {g.horasMaximas != null && <> · máximo {g.horasMaximas} h</>}
      </p>
      {g.franjas.length === 0
        ? <p className="text-xs text-amber-800">Aún no tiene horario.</p>
        : <ul className="text-sm space-y-1">{g.franjas.map((f) => (
            <li key={f.idFranja} className="flex items-center justify-between gap-2">
              <span>{cap(f.diaSemana)} {f.horaInicio}–{f.horaFin} · Mediada por tecnología · {f.estado}</span>
              {f.definidaPor === 'docente' && g.editable && (
                <button type="button" disabled={ocupado} onClick={() => quitar(f.idFranja)}
                  aria-label={`Quitar la sesión del ${cap(f.diaSemana)} ${f.horaInicio}`}
                  className="p-1.5 rounded-lg border text-slate-500 hover:text-red-600 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </li>
          ))}</ul>}
      {!g.editable && g.motivoNoEditable && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">{g.motivoNoEditable}</p>}
      {g.editable && sinCiclo && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg p-2">El grupo no tiene ciclo de clases: pide al programador que lo defina para poder programar el horario.</p>}
      {g.editable && !sinCiclo && (
        <fieldset disabled={ocupado} className="flex flex-wrap items-end gap-2">
          <legend className="sr-only">Agregar sesión</legend>
          <label className="flex flex-col text-[11px] font-bold text-slate-500 uppercase">Día
            <select value={nueva.diaSemana} onChange={(e) => setNueva({ ...nueva, diaSemana: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm font-normal normal-case text-slate-700">
              {DIAS.map((d) => <option key={d} value={d}>{cap(d)}</option>)}
            </select>
          </label>
          <label className="flex flex-col text-[11px] font-bold text-slate-500 uppercase">Inicio
            <input type="time" step={300} value={nueva.horaInicio} onChange={(e) => setNueva({ ...nueva, horaInicio: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm font-normal text-slate-700" />
          </label>
          <label className="flex flex-col text-[11px] font-bold text-slate-500 uppercase">Fin
            <input type="time" step={300} value={nueva.horaFin} onChange={(e) => setNueva({ ...nueva, horaFin: e.target.value })}
              className="border rounded-lg px-2 py-1.5 text-sm font-normal text-slate-700" />
          </label>
          <button type="button" onClick={agregar}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-700 text-white px-3 py-2 text-xs font-bold disabled:opacity-50">
            {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Agregar sesión
          </button>
        </fieldset>
      )}
      {error && <p role="alert" className="text-xs text-red-700 whitespace-pre-wrap">{error}</p>}
    </article>
  );
}
