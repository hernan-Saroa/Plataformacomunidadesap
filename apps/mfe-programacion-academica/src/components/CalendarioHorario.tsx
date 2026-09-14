import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Clock, Loader2, MapPin, Monitor, Trash2, X } from 'lucide-react';

import {
  crearSesion, eliminarSesion, getSesiones, definirPeriodoGrupo,
  type Sesion, type TipoSesion,
} from '../services/api/catalogoApi';

/**
 * EFDS-1371 — Calendario semanal del grupo (lunes a domingo).
 *
 * Rejilla propia en vez de librería de calendario: con el alcance acordado (sin
 * arrastrar ni redimensionar) lo único que hace falta es RENDERIZAR la franja, y
 * las sesiones se posicionan por minutos absolutos. Eso da "sin intervalos fijos"
 * (AC-03) de forma natural y evita meter una dependencia nueva en federación de
 * módulos a dos días de la muestra.
 *
 * Estética ESAP: azul institucional #003DA5.
 */

const DIAS = [
  { valor: 'LUNES', corto: 'Lun' },
  { valor: 'MARTES', corto: 'Mar' },
  { valor: 'MIERCOLES', corto: 'Mié' },
  { valor: 'JUEVES', corto: 'Jue' },
  { valor: 'VIERNES', corto: 'Vie' },
  { valor: 'SABADO', corto: 'Sáb' },
  { valor: 'DOMINGO', corto: 'Dom' },
] as const;

/** Ventana visible del día. Las sesiones se ubican por minutos dentro de ella. */
const HORA_DESDE = 6;
const HORA_HASTA = 22;
const ALTO_HORA = 44; // px

const aMinutos = (hhmm: string) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (v: string) => String(v).slice(0, 5);

const COLOR_TIPO: Record<TipoSesion, { fondo: string; borde: string; texto: string }> = {
  presencial: { fondo: '#EFF6FF', borde: '#003DA5', texto: '#1E3A8A' },
  mediada_tecnologia: { fondo: '#F5F3FF', borde: '#7C3AED', texto: '#5B21B6' },
};

interface Props {
  idGrupo: string;
  numeroGrupo: number;
  nombreAsignatura: string;
}

export function CalendarioHorario({ idGrupo, numeroGrupo, nombreAsignatura }: Props) {
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [avisoPeriodo, setAvisoPeriodo] = useState('');

  // Formulario que se abre al hacer clic en el calendario (sin arrastrar).
  const [nueva, setNueva] = useState<null | {
    diaSemana: string; horaInicio: string; horaFin: string; tipoSesion: TipoSesion; aulaCodigo: string;
  }>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const recargar = () => {
    setCargando(true);
    setError('');
    getSesiones(idGrupo)
      .then(setSesiones)
      .catch((e) => setError(e?.message || 'No se pudieron cargar las sesiones.'))
      .finally(() => setCargando(false));
  };

  useEffect(recargar, [idGrupo]);

  /** Clic en una columna: se propone una franja de una hora desde ese punto. */
  const abrirFormulario = (dia: string, e: React.MouseEvent<HTMLDivElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const minutosDesdeArriba = ((e.clientY - caja.top) / ALTO_HORA) * 60;
    // Se redondea a 15 min para que el clic sea cómodo; el campo admite cualquier
    // hora en múltiplos de 5, que es la granularidad real.
    const total = HORA_DESDE * 60 + Math.max(0, Math.round(minutosDesdeArriba / 15) * 15);
    const fmt = (m: number) =>
      `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    setNueva({
      diaSemana: dia,
      horaInicio: fmt(Math.min(total, HORA_HASTA * 60 - 60)),
      horaFin: fmt(Math.min(total + 60, HORA_HASTA * 60)),
      tipoSesion: 'presencial',
      aulaCodigo: '',
    });
    setError('');
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const guardar = async () => {
    if (!nueva) return;
    setGuardando(true);
    setError('');
    try {
      await crearSesion({
        idGrupo,
        diaSemana: nueva.diaSemana,
        horaInicio: nueva.horaInicio,
        horaFin: nueva.horaFin,
        tipoSesion: nueva.tipoSesion,
        aulaCodigo: nueva.aulaCodigo || null,
      });
      setNueva(null);
      recargar();
    } catch (e: any) {
      // El cruce intra-grupo llega como mensaje del backend: se muestra tal cual
      // para que el programador sepa contra qué sesión choca.
      setError(e?.message || 'No se pudo crear la sesión.');
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (s: Sesion) => {
    setError('');
    try {
      await eliminarSesion(s.idFranja);
      recargar();
    } catch (e: any) {
      setError(e?.message || 'No se pudo eliminar la sesión.');
    }
  };

  const guardarPeriodo = async () => {
    setAvisoPeriodo('');
    try {
      await definirPeriodoGrupo(idGrupo, {
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
      });
      setAvisoPeriodo('Periodo guardado.');
    } catch (e: any) {
      setAvisoPeriodo(e?.message || 'No se pudo guardar el periodo.');
    }
  };

  const porDia = useMemo(() => {
    const mapa: Record<string, Sesion[]> = {};
    DIAS.forEach((d) => { mapa[d.valor] = []; });
    sesiones.forEach((s) => { if (mapa[s.diaSemana]) mapa[s.diaSemana].push(s); });
    return mapa;
  }, [sesiones]);

  const horas = useMemo(
    () => Array.from({ length: HORA_HASTA - HORA_DESDE }, (_, i) => HORA_DESDE + i),
    [],
  );
  const altoTotal = (HORA_HASTA - HORA_DESDE) * ALTO_HORA;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#003DA5]" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Horario del grupo {numeroGrupo}
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">{nombreAsignatura}</p>
        </div>
        <p className="text-xs text-slate-400 font-medium">
          Haga clic en el calendario para agregar una sesión.
        </p>
      </div>

      {/* Periodo del ciclo de clases, propio de este grupo */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inicio del ciclo</span>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fin del ciclo</span>
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
        </label>
        <button onClick={guardarPeriodo}
          className="px-4 py-2 rounded-lg text-white text-xs font-bold active:scale-95 transition-all"
          style={{ background: '#003DA5' }}>
          Guardar periodo
        </button>
        {avisoPeriodo && <span className="text-xs font-medium text-slate-500">{avisoPeriodo}</span>}
      </div>

      {error && (
        <div className="m-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          {error}
        </div>
      )}

      {/* Rejilla L–D. Cada sesión se ubica por minutos: sin bloques predefinidos. */}
      {cargando ? (
        <div className="flex items-center gap-2 p-6 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando horario…
        </div>
      ) : (
        <div className="p-4 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              <div />
              {DIAS.map((d) => (
                <div key={d.valor} className="pb-2 text-center text-xs font-black text-slate-600 uppercase tracking-wider">
                  {d.corto}
                </div>
              ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
              {/* Regla horaria */}
              <div className="relative" style={{ height: altoTotal }}>
                {horas.map((h, i) => (
                  <div key={h} className="absolute right-2 text-[0.62rem] font-bold text-slate-400"
                    style={{ top: i * ALTO_HORA - 6 }}>
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {DIAS.map((d) => (
                <div
                  key={d.valor}
                  onClick={(e) => abrirFormulario(d.valor, e)}
                  className="relative border-l border-slate-100 cursor-pointer hover:bg-blue-50/30 transition-colors"
                  style={{ height: altoTotal }}
                  title={`Agregar sesión el ${d.corto.toLowerCase()}`}
                >
                  {horas.map((h, i) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: i * ALTO_HORA }} />
                  ))}

                  {porDia[d.valor].map((s) => {
                    const ini = aMinutos(s.horaInicio) - HORA_DESDE * 60;
                    const dur = aMinutos(s.horaFin) - aMinutos(s.horaInicio);
                    const c = COLOR_TIPO[s.tipoSesion] || COLOR_TIPO.presencial;
                    return (
                      <div
                        key={s.idFranja}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-1 right-1 rounded-md px-1.5 py-1 overflow-hidden group"
                        style={{
                          top: (ini / 60) * ALTO_HORA,
                          height: Math.max((dur / 60) * ALTO_HORA - 2, 18),
                          background: c.fondo,
                          borderLeft: `3px solid ${c.borde}`,
                        }}
                      >
                        <p className="text-[0.62rem] font-black leading-tight" style={{ color: c.texto }}>
                          {hhmm(s.horaInicio)}–{hhmm(s.horaFin)}
                        </p>
                        <p className="text-[0.58rem] font-medium leading-tight truncate" style={{ color: c.texto }}>
                          {s.tipoSesion === 'presencial' ? 'Presencial' : 'Mediada por tecnología'}
                          {s.aulaCodigo ? ` · ${s.aulaCodigo}` : ''}
                        </p>
                        <button
                          onClick={() => borrar(s)}
                          title="Eliminar sesión"
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 p-0.5 rounded bg-white/80 text-slate-400 hover:text-red-600 transition-opacity"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
            {(['presencial', 'mediada_tecnologia'] as TipoSesion[]).map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[0.68rem] font-medium text-slate-500">
                <span className="w-3 h-3 rounded"
                  style={{ background: COLOR_TIPO[t].fondo, borderLeft: `3px solid ${COLOR_TIPO[t].borde}` }} />
                {t === 'presencial' ? 'Presencial' : 'Mediada por tecnología'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Formulario de sesión: se abre con clic, no arrastrando */}
      {nueva && (
        <div ref={panelRef} className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#003DA5]" /> Nueva sesión
            </h4>
            <button onClick={() => setNueva(null)} className="p-1 rounded text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase">Día</span>
              <select value={nueva.diaSemana} onChange={(e) => setNueva({ ...nueva, diaSemana: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
                {DIAS.map((d) => <option key={d.valor} value={d.valor}>{d.corto}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase">Inicio</span>
              <input type="time" step={300} value={nueva.horaInicio}
                onChange={(e) => setNueva({ ...nueva, horaInicio: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase">Fin</span>
              <input type="time" step={300} value={nueva.horaFin}
                onChange={(e) => setNueva({ ...nueva, horaFin: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase flex items-center gap-1">
                <Monitor className="w-3 h-3" /> Tipo de sesión
              </span>
              <select value={nueva.tipoSesion}
                onChange={(e) => setNueva({ ...nueva, tipoSesion: e.target.value as TipoSesion })}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="presencial">Presencial</option>
                <option value="mediada_tecnologia">Mediada por tecnología</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.62rem] font-bold text-slate-500 uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Aula
              </span>
              <input value={nueva.aulaCodigo} placeholder="Opcional"
                onChange={(e) => setNueva({ ...nueva, aulaCodigo: e.target.value })}
                className="border border-slate-200 rounded-lg px-2 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20" />
            </label>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <button onClick={guardar} disabled={guardando}
              className="px-4 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: guardando ? '#9CA3AF' : '#003DA5' }}>
              {guardando ? 'Guardando…' : 'Agregar sesión'}
            </button>
            <p className="text-[0.68rem] text-slate-400 font-medium">
              La hora es libre, en múltiplos de 5 minutos. El tipo de sesión es independiente
              de la modalidad de la asignatura.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
