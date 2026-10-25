import { useEffect, useMemo, useState } from 'react';
import { CalendarioHorario } from './CalendarioHorario';
import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import { BookOpen, Check, Clock, Loader2, MapPin, Undo2 } from 'lucide-react';

import { getMiCalendario, type CalendarioDocente, type FranjaCalendario } from '../services/api/vistaApi';
import { getMiConcertacion, type ConcertacionDocente } from '../services/api/concertacionApi';

/**
 * EFDS-2348 — Grupos que la decanatura le asignó al docente en un periodo.
 *
 * Con el flujo nuevo el docente no toma franjas: aquí ve lo asignado, agrupado por
 * grupo, con su horario, aula, ciclo y horas (cálculo único del servidor). No hay
 * acciones: aceptar o devolver la docencia es la concertación.
 */
const DIA_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const DIA = (d: string) => ({ MIERCOLES: 'Miércoles', SABADO: 'Sábado' } as Record<string, string>)[d]
  ?? (d ? d.charAt(0) + d.slice(1).toLowerCase() : d);
const fecha = (iso: string | null) => (iso ? iso.split('-').reverse().join('/') : '—');

const ESTADO: Record<string, { texto: string; clase: string; icono?: React.ReactNode }> = {
  TOMADA: { texto: 'Pendiente de concertación', clase: 'bg-blue-50 text-[#003DA5] border-blue-200', icono: <Clock className="w-3 h-3" /> },
  APROBADA: { texto: 'Aprobada', clase: 'bg-emerald-50 text-emerald-700 border-emerald-200', icono: <Check className="w-3 h-3" /> },
  DEVUELTA: { texto: 'Devuelta', clase: 'bg-amber-50 text-amber-800 border-amber-200', icono: <Undo2 className="w-3 h-3" /> },
};

interface GrupoVista {
  idGrupo: string;
  asignatura: string;
  codigo: string | null;
  programa: string | null;
  numeroGrupo: number | null;
  cicloInicio: string | null;
  cicloFin: string | null;
  estados: Set<string>;
  franjas: FranjaCalendario[];
}

/** Sin `idPeriodo`, el periodo en curso. */
export function GruposAsignados({ idPeriodo, codigoPeriodo, concertacionHabilitada = false }: { idPeriodo?: string; codigoPeriodo?: string | null; concertacionHabilitada?: boolean }) {
  const revision = useRevisionProgramacion('programacion', 'portal-docente');
  const [cal, setCal] = useState<CalendarioDocente | null>(null);
  const [error, setError] = useState('');
  const [concertaciones, setConcertaciones] = useState<ConcertacionDocente[] | null>(null);
  const [errorEstado, setErrorEstado] = useState(false);

  useEffect(() => {
    let vivo = true;
    getMiCalendario(idPeriodo)
      .then((c) => { if (vivo) setCal(c); })
      .catch((e) => { if (vivo) setError(e?.message || 'No se pudo cargar tu programación.'); });
    return () => { vivo = false; };
  }, [idPeriodo, revision]);
  const periodo = idPeriodo ?? cal?.periodo.id;
  useEffect(() => {
    let vigente = true;
    setConcertaciones(null); setErrorEstado(false);
    if (concertacionHabilitada && periodo) getMiConcertacion(periodo)
      .then(c => { if (vigente) setConcertaciones(c); })
      .catch(() => { if (vigente) setErrorEstado(true); });
    return () => { vigente = false; };
  }, [periodo, concertacionHabilitada, revision]);

  const grupos = useMemo<GrupoVista[]>(() => {
    const porId = new Map<string, GrupoVista>();
    for (const f of cal?.franjas ?? []) {
      if (!f.idGrupo) continue;
      let g = porId.get(f.idGrupo);
      if (!g) {
        g = {
          idGrupo: f.idGrupo, asignatura: f.asignatura || 'Asignatura', codigo: f.codigoAsignatura,
          programa: f.programa, numeroGrupo: f.numeroGrupo, cicloInicio: f.cicloInicio, cicloFin: f.cicloFin,
          estados: new Set(), franjas: [],
        };
        porId.set(f.idGrupo, g);
      }
      if (f.estado) g.estados.add(f.estado);
      g.franjas.push(f);
    }
    for (const g of porId.values()) {
      g.franjas.sort((a, b) => DIA_ORDEN.indexOf(a.diaSemana) - DIA_ORDEN.indexOf(b.diaSemana) || a.horaInicio.localeCompare(b.horaInicio));
    }
    return [...porId.values()].sort((a, b) => a.asignatura.localeCompare(b.asignatura, 'es'));
  }, [cal]);

  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{error}</div>;
  if (!cal) {
    return <div className="flex items-center gap-2 text-xs text-slate-500 p-3"><Loader2 className="w-4 h-4 animate-spin" /> Cargando tus grupos…</div>;
  }

  return (
    <section className="space-y-2" aria-label={`Grupos asignados ${codigoPeriodo ?? ''}`}>
      <CalendarioHorario soloLectura calendario={cal} />
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 text-sm">
          Mis grupos asignados · {codigoPeriodo ?? cal.periodo.codigo} ({grupos.length})
        </h4>
        {cal.horas.total != null && (
          <span className="text-xs text-slate-600"><strong className="text-slate-800">{cal.horas.total} h</strong> en el periodo</span>
        )}
      </div>
      {grupos.length === 0 ? (
        <p className="text-xs text-slate-400 p-3">Aún no tienes grupos asignados en este periodo.</p>
      ) : grupos.map((g) => {
        const estado = g.estados.has('DEVUELTA') ? 'DEVUELTA' : g.estados.has('TOMADA') ? 'TOMADA' : g.estados.has('APROBADA') ? 'APROBADA' : '';
        const e = ESTADO[estado];
        const pendientes = g.franjas.filter(f => f.estado === 'TOMADA');
        const estadoPorFranja = (id: string) => concertaciones?.find(c => c.franjas?.some(f => f.idFranja === id))?.estado;
        const todasPorAceptar = pendientes.length > 0 && pendientes.every(f => estadoPorFranja(f.idFranja) === 'POR_ACEPTAR');
        const algunaPorAceptar = pendientes.some(f => estadoPorFranja(f.idFranja) === 'POR_ACEPTAR');
        const etiqueta = estado === 'TOMADA' && concertacionHabilitada
          ? errorEstado ? 'Estado de concertación no disponible'
            : concertaciones === null ? 'Consultando estado…'
              : todasPorAceptar ? 'Por aceptar' : algunaPorAceptar ? 'Parte por aceptar' : e?.texto
          : e?.texto;
        const horas = cal.horasPorGrupo?.[g.idGrupo];
        return (
          <article key={g.idGrupo} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#003DA5] shrink-0" />
                  <span className="truncate">{g.asignatura}</span>
                  {g.codigo && <span className="text-[10px] font-mono text-slate-400">{g.codigo}</span>}
                </p>
                <p className="text-[11px] text-slate-500">
                  {g.programa || 'Programa'}{g.numeroGrupo != null ? ` · Grupo ${g.numeroGrupo}` : ''}
                  {' · '}Clases del {fecha(g.cicloInicio)} al {fecha(g.cicloFin)}
                </p>
              </div>
              <div className="shrink-0 text-right space-y-1">
                {e && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${e.clase}`}>
                    {e.icono}{etiqueta}
                  </span>
                )}
                <p className="text-xs text-slate-700">{horas != null ? <><strong>{horas} h</strong> de docencia</> : 'Horas por calcular'}</p>
              </div>
            </div>
            <ul className="grid gap-1 sm:grid-cols-2">
              {g.franjas.map((f) => (
                <li key={f.idFranja} className="text-[11px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="font-semibold">{DIA(f.diaSemana)}</span> {f.horaInicio}–{f.horaFin}
                  <MapPin className="w-3 h-3 text-slate-400 ml-1" />
                  {f.tipoSesion === 'mediada_tecnologia' ? 'Virtual' : `Aula ${f.aulaCodigo || 'por asignar'}`}
                </li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
